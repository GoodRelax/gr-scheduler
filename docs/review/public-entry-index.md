# Public entry index

> GENERATED -- do not edit by hand. Sources: `src/` (what is exported) and
> `docs/spec/_source/published-entries.json` (table T-064: what is published and why).
> Rebuild: `npm run gen` / detect drift: `npm run gen:check`
> (`python tools/generate_public_entry_index.py`).

Search this file for the words and the types of the job BEFORE writing a helper (CR-581).

- **entry** -- the component's public entry exports it. Another component may import it
  if table T-061 and the component figure allow the edge. `T-064` names its row when
  table T-064 publishes it; `--` means the entry exports it but table T-064 does not.
- **file only** -- a file of the folder exports it and the entry does not. To use it
  from another component, re-export it from the entry and add it as a member of its
  row in `docs/spec/_source/published-entries.json`, then `npm run gen`.
- A private function is not listed. Publish it the same way instead of copying it.

## Schedule (PI-1, `src/entity/document-model/schedule/schedule.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `actualLastDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualLastDay` | PI-1 | 実績の最後の日。 |
| `actualLengthOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualLengthOf` | PI-1 | 実績の長さ。 |
| `Assignment` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Assignment` | -- | interface Assignment |
| `BaselineTask` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#BaselineTask` | -- | interface BaselineTask |
| `Calendar` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Calendar` | -- | interface Calendar |
| `CalendarDay` | entry | interface | `src/entity/document-model/schedule/calendar-day.ts#CalendarDay` | -- | interface CalendarDay |
| `calendarDaysBetween` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#calendarDaysBetween` | PI-1 | 2 つの日付のあいだの**暦日**数。 |
| `CalendarSpan` | entry | interface | `src/entity/document-model/schedule/calendar-day.ts#CalendarSpan` | -- | interface CalendarSpan |
| `calendarSpanOf` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#calendarSpanOf` | PI-1 | 2 つの日のあいだの年・月・日と暦日数。 |
| `CarryElement` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#CarryElement` | -- | interface CarryElement |
| `COLUMN_DEFAULTS` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#COLUMN_DEFAULTS` | -- | const COLUMN_DEFAULTS: |
| `COLUMN_SHAPES` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#COLUMN_SHAPES` | -- | const COLUMN_SHAPES: |
| `ColumnShape` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#ColumnShape` | -- | interface ColumnShape |
| `CommentBox` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#CommentBox` | -- | interface CommentBox |
| `compareDays` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#compareDays` | PI-1 | 2 つの日の前後 |
| `CustomColour` | entry | interface | `src/entity/document-model/schedule/stored-colour.ts#CustomColour` | -- | interface CustomColour |
| `customColourChosen` | entry | function | `src/entity/document-model/schedule/stored-colour.ts#customColourChosen` | PI-1 | カスタムカラーを選んだときの新しい綴り。 |
| `customColourOf` | entry | function | `src/entity/document-model/schedule/stored-colour.ts#customColourOf` | PI-1 | カスタムカラーを明暗の 2 つの側に分ける。 |
| `customSideOf` | entry | function | `src/entity/document-model/schedule/stored-colour.ts#customSideOf` | PI-1 | 未定義の側を他方で埋めて、描く側の値を返す。 |
| `DATE_COLUMNS` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#DATE_COLUMNS` | PI-1 | 表 T-058 の型の欄が日付とする列の全数。 |
| `dateFromWorkingDays` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#dateFromWorkingDays` | PI-1 | 起点の日付に稼働日を加えた日 |
| `dayOf` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#dayOf` | PI-1 | 日付の字面を日にする。 |
| `DaySpanTooWide` | entry | class | `src/entity/document-model/schedule/working-calendar.ts#DaySpanTooWide` | -- | class DaySpanTooWide extends Error |
| `DEFAULT_CALENDAR_VALUES` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#DEFAULT_CALENDAR_VALUES` | -- | const DEFAULT_CALENDAR_VALUES: |
| `delayStart` | entry | function | `src/entity/document-model/schedule/task-delay.ts#delayStart` | -- | function delayStart(task: Task): { readonly row: string; readonly from: string \| null } \| null |
| `delayWorkingDays` | entry | function | `src/entity/document-model/schedule/task-delay.ts#delayWorkingDays` | PI-1 | 表 T-021b の起点と終点 |
| `Dependency` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Dependency` | -- | interface Dependency |
| `EntityRows` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#EntityRows` | -- | interface EntityRows |
| `Exception` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Exception` | -- | interface Exception |
| `ForeignKeyColumn` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#ForeignKeyColumn` | -- | interface ForeignKeyColumn |
| `HighlightBox` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#HighlightBox` | -- | interface HighlightBox |
| `InvariantKind` | entry | type | `src/entity/document-model/schedule/schedule-invariants.ts#InvariantKind` | -- | type InvariantKind = \| 'unique' \| 'reference' \| 'structure' \| 'combination' \| 'range' export interface ScheduleViolation |
| `isDelayed` | entry | function | `src/entity/document-model/schedule/task-delay.ts#isDelayed` | PI-1 | 表 T-021b の 3 条件 |
| `isStoredColour` | entry | function | `src/entity/document-model/schedule/stored-colour.ts#isStoredColour` | PI-1 | 色の列が取る綴りか。 |
| `isWorkingDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isWorkingDay` | -- | function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean |
| `lastDayForLength` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#lastDayForLength` | PI-1 | `actualStart` と長さから実績の最後の日を置く。 |
| `NestedRows` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#NestedRows` | -- | interface NestedRows |
| `nextWorkingDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#nextWorkingDay` | PI-1 | 起点の**翌稼働日**。 |
| `NoWorkingDayReached` | entry | class | `src/entity/document-model/schedule/working-calendar.ts#NoWorkingDayReached` | -- | class NoWorkingDayReached extends Error |
| `PlanActualState` | entry | type | `src/entity/document-model/schedule/plan-actual-state.ts#PlanActualState` | -- | type PlanActualState = \| 'notStarted' \| 'finished' \| 'suspendedResumeUnknown' \| 'suspendedResumePlanned' \| 'inProgress' // see T-019a /** @purity pure */ exp... |
| `planActualState` | entry | function | `src/entity/document-model/schedule/plan-actual-state.ts#planActualState` | PI-1 | 表 T-019a の判別 |
| `Project` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Project` | -- | interface Project |
| `Resource` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Resource` | -- | interface Resource |
| `Schedule` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Schedule` | PI-1 | 型。 |
| `ScheduleViolation` | entry | interface | `src/entity/document-model/schedule/schedule-invariants.ts#ScheduleViolation` | -- | interface ScheduleViolation |
| `scheduleViolations` | entry | function | `src/entity/document-model/schedule/schedule-invariants.ts#scheduleViolations` | PI-1 | 不変条件に反する箇所 |
| `Task` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Task` | -- | interface Task |
| `taskByUid` | entry | function | `src/entity/document-model/schedule/schedule.ts#taskByUid` | PI-1 | `uid` で引く。 |
| `TaskGroup` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskGroup` | -- | interface TaskGroup |
| `TaskGroupMember` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskGroupMember` | -- | interface TaskGroupMember |
| `TaskOrigin` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskOrigin` | -- | interface TaskOrigin |
| `TaskVisual` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskVisual` | -- | interface TaskVisual |
| `textOfDay` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#textOfDay` | PI-1 | 日を日付の字面に戻す |
| `WeekDay` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#WeekDay` | -- | interface WeekDay |
| `WorkingCalendar` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#WorkingCalendar` | -- | interface WorkingCalendar |
| `workingCalendarOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingCalendarOf` | PI-1 | 文書の暦を解く。 |
| `workingDaysBetween` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingDaysBetween` | PI-1 | 2 つの日付のあいだの稼働日数。 |
| `dayFromSerial` | file only | function | `src/entity/document-model/schedule/calendar-day.ts#dayFromSerial` | -- | function dayFromSerial(value: number): CalendarDay |
| `serial` | file only | function | `src/entity/document-model/schedule/calendar-day.ts#serial` | -- | function serial(day: CalendarDay): number |
| `ENTITY_ROWS` | file only | const | `src/entity/document-model/schedule/schedule-entities.ts#ENTITY_ROWS` | -- | const ENTITY_ROWS: readonly EntityRows[] = [ |
| `TRANSPARENT` | file only | const | `src/entity/document-model/schedule/stored-colour.ts#TRANSPARENT` | -- | const TRANSPARENT = 'transparent' |

## DocumentSettings (PI-2, `src/entity/document-model/document-settings/document-settings.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `clampedSettings` | entry | function | `src/entity/document-model/document-settings/document-settings.ts#clampedSettings` | PI-2 | 下限・上限に収める |
| `ClampedValue` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ClampedValue` | -- | interface ClampedValue |
| `ClampResult` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ClampResult` | -- | interface ClampResult |
| `DISPLAY_SCALE_STEPS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#DISPLAY_SCALE_STEPS` | PI-2 | 表示の倍率の段の並び。 |
| `DocumentSettings` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#DocumentSettings` | PI-2 | 型。 |
| `SETTINGS_BOUNDS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_BOUNDS` | -- | const SETTINGS_BOUNDS: Readonly<Record<string, SettingsBound>> = |
| `SETTINGS_DEFAULTS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_DEFAULTS` | -- | const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = |
| `SETTINGS_DERIVED` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_DERIVED` | -- | const SETTINGS_DERIVED = |
| `SettingsBound` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#SettingsBound` | -- | interface SettingsBound |
| `SettingsBoundToken` | entry | type | `src/entity/document-model/document-settings/document-settings.ts#SettingsBoundToken` | -- | type SettingsBoundToken = \| { readonly key: string } \| { readonly num: number } \| { readonly op: '+' \| '-' \| '*' \| '/' } export interface SettingsBound |

## DocumentStamp (PI-3, `src/entity/document-model/document-stamp/document-stamp.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `advancedStamp` | entry | function | `src/entity/document-model/document-stamp/document-stamp.ts#advancedStamp` | PI-3 | 版を進める |
| `ChangeLogEntry` | entry | interface | `src/entity/document-model/document-stamp/document-stamp.ts#ChangeLogEntry` | -- | interface ChangeLogEntry |
| `DocumentStamp` | entry | interface | `src/entity/document-model/document-stamp/document-stamp.ts#DocumentStamp` | PI-3 | 型。 |
| `isStampMatched` | entry | function | `src/entity/document-model/document-stamp/document-stamp.ts#isStampMatched` | PI-3 | 照合。 |

## EditHistory (PI-4, `src/entity/document-model/edit-history/edit-history.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `EditHistory` | entry | interface | `src/entity/document-model/edit-history/edit-history.ts#EditHistory` | PI-4 | 型 |
| `emptyHistory` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#emptyHistory` | -- | function emptyHistory<TStep>(): EditHistory<TStep> |
| `HistoryLimits` | entry | interface | `src/entity/document-model/edit-history/edit-history.ts#HistoryLimits` | -- | interface HistoryLimits |
| `HistoryMove` | entry | interface | `src/entity/document-model/edit-history/edit-history.ts#HistoryMove` | -- | interface HistoryMove<TStep> |
| `historyWithStep` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#historyWithStep` | PI-4 | 1 段積む |
| `nextStep` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#nextStep` | PI-4 | function nextStep<TStep>(history: EditHistory<TStep>): HistoryMove<TStep> |
| `NOT_STORED_LIMITS` | entry | const | `src/entity/document-model/edit-history/edit-history.ts#NOT_STORED_LIMITS` | -- | const NOT_STORED_LIMITS: |
| `previousStep` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#previousStep` | PI-4 | function previousStep<TStep>(history: EditHistory<TStep>): HistoryMove<TStep> |
| `stepCount` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#stepCount` | -- | function stepCount<TStep>(history: EditHistory<TStep>): number |

## ScheduleLayout (PI-5, `src/entity/layout-engine/schedule-layout/schedule-layout.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `assigneeAnchorOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#assigneeAnchorOf` | PI-5 | 担当と進捗の札の右端を合わせる位置。 |
| `dateAtX` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#dateAtX` | PI-5 | 時間軸の対応。 |
| `DayReader` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#DayReader` | -- | interface DayReader |
| `dummyBandOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#dummyBandOf` | PI-5 | ダミーを描く帯。 |
| `dummyInkWidthOf` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#dummyInkWidthOf` | -- | function dummyInkWidthOf(markerDiameter: number): number |
| `FitToScreen` | entry | interface | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#FitToScreen` | -- | interface FitToScreen |
| `fitZoom` | entry | function | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#fitZoom` | PI-5 | `FR-055` |
| `groupDepthLimit` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#groupDepthLimit` | PI-5 | いまの詳しさの段が描く最も深い段。 |
| `groupDepthThresholdOf` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#groupDepthThresholdOf` | PI-5 | （その段を描くのに要る倍率。 |
| `keptInViewByTreeState` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#keptInViewByTreeState` | PI-5 | `expanded` と `temporarilyExpanded` が倍率によらず描かせる行。 |
| `LabelLayout` | entry | interface | `src/entity/layout-engine/schedule-layout/label-placement.ts#LabelLayout` | PI-5 | 型。 |
| `labelLayoutOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#labelLayoutOf` | PI-5 | その配置を求める |
| `labelledAssigneeUidOf` | entry | function | `src/entity/layout-engine/schedule-layout/assignee-label.ts#labelledAssigneeUidOf` | PI-5 | 担当ラベルが名を出す担当者、すなわち `FR-059` の絞りと並びで先頭に来る 1 名の資源の `uid`。 |
| `LabelPlacement` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#LabelPlacement` | -- | type LabelPlacement = 'inside' \| 'right' |
| `LabelReference` | entry | interface | `src/entity/layout-engine/schedule-layout/label-placement.ts#LabelReference` | PI-5 | 型。 |
| `labelReferenceOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#labelReferenceOf` | PI-5 | その基準を求める |
| `labelUnits` | entry | function | `src/entity/layout-engine/schedule-layout/label-width.ts#labelUnits` | PI-5 | `FR-093` の「全角 2・半角 1 で数えた単位数」。 |
| `layoutFromSchedule` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#layoutFromSchedule` | PI-5 | function layoutFromSchedule( schedule: Schedule, storedSettings: DocumentSettings, regions: ScreenRegions, groupDepthCap?: number, rowControlsHeightPx?: numb... |
| `markerDiameterOf` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#markerDiameterOf` | PI-5 | 進捗マーカーの径。 |
| `MilestoneGlyph` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#MilestoneGlyph` | -- | type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']> |
| `NOT_STORED_DUMMY_SIZES` | entry | const | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#NOT_STORED_DUMMY_SIZES` | -- | const NOT_STORED_DUMMY_SIZES: |
| `NOT_STORED_LABEL_SIZES` | entry | const | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#NOT_STORED_LABEL_SIZES` | PI-5 | 表 T-206 の `S-196` と `S-233` を刷った定数。 |
| `NOT_STORED_SIZES` | entry | const | `src/entity/layout-engine/schedule-layout/label-placement.ts#NOT_STORED_SIZES` | -- | const NOT_STORED_SIZES: |
| `NotStoredZoom` | entry | interface | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#NotStoredZoom` | -- | interface NotStoredZoom |
| `outwardStartOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#outwardStartOf` | PI-5 | 基準の外へ札を並べ始める位置。 |
| `RowPlacement` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#RowPlacement` | -- | interface RowPlacement |
| `rowPlacesAtZoomY` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#rowPlacesAtZoomY` | PI-5 | （その倍率での行の位置。 |
| `RulerTier` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#RulerTier` | -- | type RulerTier = 'year' \| 'yearMonth' \| 'yearMonthWeek' \| 'yearMonthDayWeekday' |
| `rulerTierOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#rulerTierOf` | -- | function rulerTierOf(pxPerDay: number, storedSettings: DocumentSettings): RulerTier |
| `ScheduleLayout` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#ScheduleLayout` | PI-5 | 型 |
| `ShapeKind` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#ShapeKind` | -- | type ShapeKind = 'rectangle' \| 'chevron' \| 'arrow' \| 'endpointSpan' \| 'milestone' |
| `StackSafetyCapStop` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#StackSafetyCapStop` | -- | interface StackSafetyCapStop |
| `standsUndecidedResume` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#standsUndecidedResume` | -- | function standsUndecidedResume(task: Task, shapeKind: ShapeKind): boolean |
| `TaskPlacement` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#TaskPlacement` | -- | interface TaskPlacement |
| `taskPlacement` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#taskPlacement` | PI-5 | どこに載るか |
| `thinEndHalfHeightOf` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#thinEndHalfHeightOf` | -- | function thinEndHalfHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `tickStrideOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#tickStrideOf` | PI-5 | 目盛の間引き。 |
| `TimeAxis` | entry | type | `src/entity/layout-engine/schedule-layout/time-axis.ts#TimeAxis` | -- | type TimeAxis = Pick<ScheduleLayout, 'pxPerDay' \| 'originDay' \| 'originX'> |
| `timeAxisOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#timeAxisOf` | PI-5 | 行を割り付けずに、時間軸の対応だけを求める。 |
| `xFromDay` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#xFromDay` | PI-5 | その逆向き。 |
| `zoomYAtRectangleLabelFont` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#zoomYAtRectangleLabelFont` | PI-5 | 与えた字の大きさに、矩形（表 T-201 の `S-13`）の名称ラベルの字が等しくなる `zoomY`。 |
| `assigneeLabelsOf` | file only | function | `src/entity/layout-engine/schedule-layout/assignee-label.ts#assigneeLabelsOf` | -- | function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> |
| `drawnGroups` | file only | function | `src/entity/layout-engine/schedule-layout/drawn-rows.ts#drawnGroups` | -- | function drawnGroups( schedule: Schedule, settings: DocumentSettings, ): readonly (TaskGroup & { depth: number })[] |
| `labelWidth` | file only | function | `src/entity/layout-engine/schedule-layout/label-width.ts#labelWidth` | -- | function labelWidth(text: string, fontSize: number, settings: DocumentSettings): number |
| `nameLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/name-label.ts#nameLabelOf` | -- | function nameLabelOf(task: Task, reader: DayReader, datesWithYear: boolean \| null, settings: DocumentSettings): NameLabel |
| `nameLabelWidthOf` | file only | function | `src/entity/layout-engine/schedule-layout/name-label.ts#nameLabelWidthOf` | -- | function nameLabelWidthOf(named: NameLabel, fontSize: number, settings: DocumentSettings): number |
| `planDatesSpanYears` | file only | function | `src/entity/layout-engine/schedule-layout/name-label.ts#planDatesSpanYears` | -- | function planDatesSpanYears(schedule: Schedule, reader: DayReader): boolean |
| `outsideLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/percent-label.ts#outsideLabelOf` | -- | function outsideLabelOf(assignee: string, percent: string): string |
| `percentLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/percent-label.ts#percentLabelOf` | -- | function percentLabelOf(task: Task): string |
| `liftedRows` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#liftedRows` | -- | function liftedRows( rowPlacements: readonly RowPlacement[], band: |
| `pinnedBandOf` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#pinnedBandOf` | -- | function pinnedBandOf( rowPlacements: readonly RowPlacement[], settings: DocumentSettings, regions: ScreenRegions, ): |
| `shiftedPlacements` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#shiftedPlacements` | -- | function shiftedPlacements( placements: readonly TaskPlacement[], shiftByGroupId: ReadonlyMap<string, number>, droppedPinnedIds: ReadonlySet<string>, ): read... |
| `scrolledPlacements` | file only | function | `src/entity/layout-engine/schedule-layout/row-scroll.ts#scrolledPlacements` | -- | function scrolledPlacements( placements: readonly TaskPlacement[], offsetY: number, pinnedIdsPlaced: ReadonlySet<string>, ): readonly TaskPlacement[] |
| `scrolledRows` | file only | function | `src/entity/layout-engine/schedule-layout/row-scroll.ts#scrolledRows` | -- | function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] |
| `scrollOffsetOf` | file only | function | `src/entity/layout-engine/schedule-layout/row-scroll.ts#scrollOffsetOf` | -- | function scrollOffsetOf( rows: readonly RowPlacement[], settings: DocumentSettings, rowAreaY: number, ): number |
| `actualPlacementOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#actualPlacementOf` | -- | function actualPlacementOf(shapeKind: ShapeKind): 'inside' \| 'below' \| 'sideways' |
| `actualReachOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#actualReachOf` | -- | function actualReachOf( shapeKind: ShapeKind, actual: { readonly x: number; readonly width: number }, settings: DocumentSettings, ): number |
| `drawnEdgeOverhangOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#drawnEdgeOverhangOf` | -- | function drawnEdgeOverhangOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `drawnExtentOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#drawnExtentOf` | -- | function drawnExtentOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `labelFontSize` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#labelFontSize` | -- | function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `labelLiftOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#labelLiftOf` | -- | function labelLiftOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `laidBelow` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#laidBelow` | -- | function laidBelow(shapeKind: ShapeKind): boolean |
| `planHeightOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#planHeightOf` | -- | function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `shapeHeightOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#shapeHeightOf` | -- | function shapeHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number |
| `zoomYAtPlanHeightFloor` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#zoomYAtPlanHeightFloor` | -- | function zoomYAtPlanHeightFloor(settings: DocumentSettings): number |
| `serialOf` | file only | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#serialOf` | -- | function serialOf(day: CalendarDay): number |
| `xOnTimeAxis` | file only | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#xOnTimeAxis` | -- | function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number, day: CalendarDay): number |

## ScheduleGeometry (PI-6, `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `BarGeometry` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#BarGeometry` | -- | type BarGeometry = \| |
| `CommentGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#CommentGeometry` | PI-6 | 型。 |
| `DependencyGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DependencyGeometry` | PI-6 | 型。 |
| `DualCursorGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DualCursorGeometry` | -- | interface DualCursorGeometry |
| `DummyGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DummyGeometry` | -- | interface DummyGeometry |
| `geometryFromLayout` | entry | function | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#geometryFromLayout` | PI-6 | function geometryFromLayout( schedule: Schedule, storedSettings: DocumentSettings, layout: ScheduleLayout, regions: ScreenRegions, selection: Selection, ): S... |
| `GeometryInputs` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#GeometryInputs` | -- | interface GeometryInputs |
| `HighlightGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#HighlightGeometry` | PI-6 | 型。 |
| `leaderOf` | entry | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#leaderOf` | PI-6 | そのコメントボックスの引出し線。 |
| `MarkerGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#MarkerGeometry` | -- | interface MarkerGeometry |
| `NOT_STORED_DUMMY_SIZES` | entry | const | `src/entity/layout-engine/schedule-geometry/task-figures.ts#NOT_STORED_DUMMY_SIZES` | -- | const NOT_STORED_DUMMY_SIZES: |
| `Path` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#Path` | -- | type Path = readonly Point[] |
| `Point` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#Point` | -- | interface Point |
| `point` | entry | function | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#point` | -- | function point(x: number, y: number): Point |
| `ProgressSymbol` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ProgressSymbol` | -- | type ProgressSymbol = 'PM-1' \| 'PM-1a' \| 'PM-2' \| 'PM-3' \| 'PM-4' |
| `ResumeGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ResumeGeometry` | -- | interface ResumeGeometry |
| `ScheduleGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ScheduleGeometry` | PI-6 | 型 |
| `SpanDot` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#SpanDot` | -- | interface SpanDot |
| `TaskGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#TaskGeometry` | -- | interface TaskGeometry |
| `commentGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#commentGeometry` | -- | function commentGeometry( schedule: Schedule, settings: DocumentSettings, layout: ScheduleLayout, ): readonly CommentGeometry[] |
| `hasPlanDates` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#hasPlanDates` | -- | function hasPlanDates(task: Task): boolean |
| `plannedPlacementsOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#plannedPlacementsOf` | -- | function plannedPlacementsOf(inputs: GeometryInputs): readonly TaskPlacement[] |
| `routedDependency` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#routedDependency` | -- | function routedDependency(inputs: GeometryInputs, from: TaskPlacement, to: TaskPlacement, linkType: number): DependencyGeometry |
| `selectedLinksOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#selectedLinksOf` | -- | function selectedLinksOf(schedule: Schedule, selection: Selection): ReadonlySet<string> |
| `dualCursorGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/dual-cursor.ts#dualCursorGeometry` | -- | function dualCursorGeometry( settings: DocumentSettings, layout: ScheduleLayout, regions: ScreenRegions, ): DualCursorGeometry \| null |
| `highlightGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/highlight-box.ts#highlightGeometry` | -- | function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] |
| `guidesOf` | file only | function | `src/entity/layout-engine/schedule-geometry/plan-actual-guides.ts#guidesOf` | -- | function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement, actualHeight: number): readonly Path[] |
| `progressLineOf` | file only | function | `src/entity/layout-engine/schedule-geometry/progress-line.ts#progressLineOf` | -- | function progressLineOf(inputs: GeometryInputs): Path |
| `isThinShape` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#isThinShape` | -- | function isThinShape(shapeKind: ShapeKind): boolean |
| `taskGeometryOf` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#taskGeometryOf` | -- | function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry |
| `thinTierMiddle` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#thinTierMiddle` | -- | function thinTierMiddle(placed: TaskPlacement, settings: DocumentSettings, isActual: boolean): number |

## ItemHitArea (PI-7, `src/entity/layout-engine/item-hit-area/item-hit-area.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `bottomOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#bottomOf` | -- | function bottomOf(box: ScreenRect): number |
| `boxOfPath` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#boxOfPath` | -- | function boxOfPath(points: Path): ScreenRect \| null |
| `BoxPart` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#BoxPart` | -- | type BoxPart = \| { readonly kind: 'body' } \| { readonly kind: 'anchor' } \| { readonly kind: 'leader' } \| |
| `ChosenItem` | entry | interface | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#ChosenItem` | -- | interface ChosenItem |
| `DependencyEnd` | entry | interface | `src/entity/layout-engine/item-hit-area/dependency-end.ts#DependencyEnd` | -- | interface DependencyEnd |
| `dependencyEndAtPointer` | entry | function | `src/entity/layout-engine/item-hit-area/dependency-end.ts#dependencyEndAtPointer` | PI-7 | `FR-009` の「左半分 / 右半分」を答える。 |
| `dependencyStartOfHit` | entry | function | `src/entity/layout-engine/item-hit-area/dependency-end.ts#dependencyStartOfHit` | PI-7 | 押したときの当たり（`itemAtPointer` の答え）から、引き出す依存線の起点を答える。 |
| `DrawnChoice` | entry | interface | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#DrawnChoice` | -- | interface DrawnChoice<T extends ChosenItem> |
| `GrabArea` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#GrabArea` | PI-7 | 掴んだ所の型 —— `FR-104` の 表 T-266 と 表 T-023d の行 ID の集合。 |
| `GrabSizes` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#GrabSizes` | -- | type GrabSizes = typeof NOT_STORED_SIZES |
| `grabSizesOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#grabSizesOf` | PI-7 | `itemAtPointer` に渡す掴み代の大きさを、`_assets/tbl-settings.md` の 表 T-206 の掴み代の行（`01-04-requirements.md` の `FR-104` の 表 T-266 が読む `S-250` 〜 `S-290` と、`S-137` / `S-230`... |
| `Hit` | entry | interface | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#Hit` | -- | interface Hit |
| `isInsideRect` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isInsideRect` | -- | function isInsideRect(x: number, y: number, box: ScreenRect): boolean |
| `isOnTheDrawnShape` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isOnTheDrawnShape` | -- | function isOnTheDrawnShape(shape: TaskShape, x: number, y: number): boolean |
| `isTaskDrawn` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#isTaskDrawn` | PI-7 | 1 つのタスクの幾何が、表 T-023c の結びの「描かれている」に当たるかを答える —— 予定・実績・実績のダミー（表 T-240）のどれかが在れば真とする。 |
| `Item` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#Item` | -- | type Item = \| { readonly kind: 'task'; readonly taskUid: number } \| { readonly kind: 'dependency'; readonly predecessorUid: number; readonly successorUid: nu... |
| `itemAtPointer` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#itemAtPointer` | PI-7 | 対象は 表 T-023c の `SL-1`。 |
| `itemsInMarquee` | entry | function | `src/entity/layout-engine/item-hit-area/marquee.ts#itemsInMarquee` | PI-7 | `SL-3`。 |
| `merged` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#merged` | -- | function merged(a: ScreenRect \| null, b: ScreenRect \| null): ScreenRect \| null |
| `NOT_STORED_SIZES` | entry | const | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#NOT_STORED_SIZES` | -- | const NOT_STORED_SIZES: |
| `PointerResolution` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#PointerResolution` | -- | type PointerResolution = 'press' \| 'doubleClick' |
| `rightOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#rightOf` | -- | function rightOf(box: ScreenRect): number |
| `selectionWithinDrawn` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#selectionWithinDrawn` | PI-7 | 選択から、幾何に描かれていないタスクを外した選択を答える。 |
| `selectionWithinDrawnRows` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#selectionWithinDrawnRows` | PI-7 | `selectionWithinDrawn` の答えに、表 T-023c が名指さない行 —— ピン止めの帯に入りきらない行（`FR-098`）と、段数の安全弁（表 T-014 の `ST-7`）が置かなかった行 —— のタスクを戻した選択を答える。 |
| `shapeOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#shapeOf` | -- | function shapeOf(task: TaskGeometry): TaskShape |
| `TaskShape` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#TaskShape` | -- | type TaskShape = |

## ApplyDocumentChange (PI-8, `src/use-case/apply-document-change/apply-document-change.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `applyDocumentChange` | entry | function | `src/use-case/apply-document-change/apply-document-change.ts#applyDocumentChange` | PI-8 | `non-pure`。 |
| `ApplyOutcome` | entry | type | `src/use-case/apply-document-change/apply-document-change.ts#ApplyOutcome` | -- | type ApplyOutcome = \| { readonly accepted: false; readonly refusal: PlanRefusal } \| |
| `ChangeAudience` | entry | interface | `src/use-case/apply-document-change/apply-document-change.ts#ChangeAudience` | -- | interface ChangeAudience |
| `ChangeStep` | entry | interface | `src/use-case/undo-edit/undo-edit.ts#ChangeStep` | -- | interface ChangeStep |
| `DocumentCommand` | entry | type | `src/use-case/edit-document/edit-document.ts#DocumentCommand` | PI-8 | 型。 |
| `DocumentHolder` | entry | interface | `src/use-case/apply-document-change/apply-document-change.ts#DocumentHolder` | -- | interface DocumentHolder |
| `EditReport` | entry | interface | `src/use-case/edit-document/edit-document.ts#EditReport` | -- | interface EditReport |
| `HeldDocument` | entry | interface | `src/use-case/undo-edit/undo-edit.ts#HeldDocument` | -- | interface HeldDocument |
| `ImportCall` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#ImportCall` | -- | type ImportCall<TChoice extends ImportRequest['choice']> = Omit< |
| `PlanInput` | entry | interface | `src/use-case/apply-document-change/document-change-plan.ts#PlanInput` | -- | interface PlanInput |
| `PlanRefusal` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#PlanRefusal` | -- | type PlanRefusal = \| StampRefusal \| MomentRefusal \| { readonly step: 'WS-3'; readonly reason: 'refused'; readonly refusals: readonly Refusal[] } export type ... |
| `Refusal` | entry | type | `src/use-case/edit-document/edit-document.ts#Refusal` | -- | type Refusal = CommandRefusal \| InvariantRefusal |
| `replaceDocument` | entry | function | `src/use-case/apply-document-change/apply-document-change.ts#replaceDocument` | PI-8 | `non-pure`。 |
| `ReplacementCall` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementCall` | -- | type ReplacementCall = \| { readonly row: 'RD-1' } \| { readonly row: 'RD-2' } \| |
| `ReplacementInput` | entry | interface | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementInput` | -- | interface ReplacementInput |
| `ReplacementRefusal` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementRefusal` | -- | type ReplacementRefusal = \| StampRefusal \| MomentRefusal \| |
| `ReplaceOutcome` | entry | type | `src/use-case/apply-document-change/apply-document-change.ts#ReplaceOutcome` | -- | type ReplaceOutcome = \| { readonly accepted: false; readonly refusal: ReplacementRefusal } \| |
| `SettingsLimits` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#SettingsLimits` | -- | interface SettingsLimits |
| `WriteMoment` | entry | interface | `src/use-case/apply-document-change/document-change-plan.ts#WriteMoment` | -- | interface WriteMoment |
| `ChangePlan` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#ChangePlan` | -- | type ChangePlan = \| { readonly ok: false; readonly refusal: PlanRefusal } \| |
| `MomentRefusal` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#MomentRefusal` | -- | type MomentRefusal = |
| `planDocumentChange` | file only | function | `src/use-case/apply-document-change/document-change-plan.ts#planDocumentChange` | -- | function planDocumentChange(input: PlanInput): ChangePlan |
| `planDocumentReplacement` | file only | function | `src/use-case/apply-document-change/document-change-plan.ts#planDocumentReplacement` | -- | function planDocumentReplacement(input: ReplacementInput): ReplacementPlan |
| `ReplacementPlan` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementPlan` | -- | type ReplacementPlan = \| { readonly ok: false; readonly refusal: ReplacementRefusal } \| |
| `StampRefusal` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#StampRefusal` | -- | type StampRefusal = { readonly step: 'WS-1'; readonly reason: 'staleStamp' } |

## EditDocument (PI-9, `src/use-case/edit-document/edit-document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `acceptedEdit` | entry | function | `src/use-case/edit-document/edit-document.ts#acceptedEdit` | -- | function acceptedEdit(document: Document, report: EditReport = NOTHING_TO_TELL): EditResult |
| `ActualGrabHold` | entry | type | `src/use-case/edit-document/edit-task.ts#ActualGrabHold` | -- | type ActualGrabHold = 'GA-5' \| 'GA-6' \| 'GA-17' \| 'GA-21' \| 'GA-22' |
| `AnnotationAnchor` | entry | interface | `src/use-case/edit-document/edit-annotation.ts#AnnotationAnchor` | -- | interface AnnotationAnchor |
| `AnnotationCommand` | entry | type | `src/use-case/edit-document/edit-annotation.ts#AnnotationCommand` | -- | type AnnotationCommand = \| { readonly kind: 'createCommentBox'; readonly id: string; readonly anchor: AnnotationAnchor } \| { readonly kind: 'deleteCommentBox... |
| `CalendarCommand` | entry | type | `src/use-case/edit-document/edit-calendar.ts#CalendarCommand` | -- | type CalendarCommand = \| |
| `CommandRefusal` | entry | interface | `src/use-case/edit-document/edit-document.ts#CommandRefusal` | -- | interface CommandRefusal |
| `confirmationOwedBy` | entry | function | `src/use-case/edit-document/deletion-confirmations.ts#confirmationOwedBy` | PI-9 | 削除の書き込みの束が 表 T-234 の問い（`QN-1`・`QN-2`・`QN-10`）を負うかを決め、負うなら消える `Task` の名を挙げた問いを返す —— 連鎖は 表 T-050 の `CD-1`・`CD-2`・`CD-6` |
| `confirmationOwedByResourceDeletion` | entry | function | `src/use-case/edit-document/deletion-confirmations.ts#confirmationOwedByResourceDeletion` | PI-9 | 担当者の削除が解く割当があるときの `QN-3` の問い —— `CD-5` |
| `CycledPlanActual` | entry | interface | `src/use-case/edit-document/task-plan-actual.ts#CycledPlanActual` | -- | interface CycledPlanActual |
| `CycleSurroundings` | entry | interface | `src/use-case/edit-document/task-plan-actual.ts#CycleSurroundings` | -- | interface CycleSurroundings |
| `cycleTaskPlanActualState` | entry | function | `src/use-case/edit-document/task-plan-actual.ts#cycleTaskPlanActualState` | PI-9 | 表 T-108 の `CM-15` の効果を求める。 |
| `DeletionQuestion` | entry | interface | `src/use-case/edit-document/deletion-confirmations.ts#DeletionQuestion` | PI-9 | 型。 |
| `DependencyCommand` | entry | type | `src/use-case/edit-document/edit-dependency.ts#DependencyCommand` | -- | type DependencyCommand = \| |
| `DependencyEdge` | entry | type | `src/use-case/edit-document/edit-dependency.ts#DependencyEdge` | -- | type DependencyEdge = 'start' \| 'finish' |
| `DocumentCommand` | entry | type | `src/use-case/edit-document/edit-document.ts#DocumentCommand` | -- | type DocumentCommand = \| TaskCommand \| TaskGroupCommand \| DependencyCommand \| AnnotationCommand \| ResourceCommand \| CalendarCommand \| ProjectCommand \| Docume... |
| `DocumentSettingsCommand` | entry | type | `src/use-case/edit-document/edit-document-settings.ts#DocumentSettingsCommand` | -- | type DocumentSettingsCommand = \| { readonly kind: 'setStackDirection'; readonly direction: 'up' \| 'down' } \| { readonly kind: 'setElementVisible'; readonly e... |
| `editAnnotation` | entry | function | `src/use-case/edit-document/edit-annotation.ts#editAnnotation` | -- | function editAnnotation(document: Document, command: AnnotationCommand): EditResult |
| `editCalendar` | entry | function | `src/use-case/edit-document/edit-calendar.ts#editCalendar` | -- | function editCalendar(document: Document, command: CalendarCommand): EditResult |
| `editDependency` | entry | function | `src/use-case/edit-document/edit-dependency.ts#editDependency` | -- | function editDependency(document: Document, command: DependencyCommand): EditResult |
| `editDocument` | entry | function | `src/use-case/edit-document/edit-document.ts#editDocument` | PI-9 | 表 T-108 の命令を集約へ振り分ける。 |
| `editDocumentSettings` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#editDocumentSettings` | -- | function editDocumentSettings( document: Document, command: DocumentSettingsCommand, limits: SettingsLimits, ): EditResult |
| `edited` | entry | function | `src/use-case/edit-document/edit-document.ts#acceptedEdit` | -- | function acceptedEdit(document: Document, report: EditReport = NOTHING_TO_TELL): EditResult |
| `editProject` | entry | function | `src/use-case/edit-document/edit-project.ts#editProject` | -- | function editProject(document: Document, command: ProjectCommand): EditResult |
| `EditReport` | entry | interface | `src/use-case/edit-document/edit-document.ts#EditReport` | PI-9 | 型。 |
| `editResource` | entry | function | `src/use-case/edit-document/edit-resource.ts#editResource` | -- | function editResource(document: Document, command: ResourceCommand): EditResult |
| `EditResult` | entry | type | `src/use-case/edit-document/edit-document.ts#EditResult` | -- | type EditResult = \| { readonly ok: true; readonly document: Document; readonly report: EditReport } \| { readonly ok: false; readonly refusals: readonly Refus... |
| `editTask` | entry | function | `src/use-case/edit-document/edit-task.ts#editTask` | -- | function editTask(document: Document, command: TaskCommand, defaultRowName: string): EditResult |
| `editTaskGroup` | entry | function | `src/use-case/edit-document/edit-task-group.ts#editTaskGroup` | -- | function editTaskGroup( document: Document, command: TaskGroupCommand, defaultRowName: string, ): EditResult |
| `HighlightRange` | entry | interface | `src/use-case/edit-document/edit-annotation.ts#HighlightRange` | -- | interface HighlightRange |
| `InvariantRefusal` | entry | interface | `src/use-case/edit-document/edit-document.ts#InvariantRefusal` | PI-9 | 型。 |
| `InvariantRow` | entry | type | `src/use-case/edit-document/edit-document.ts#InvariantRow` | PI-9 | 型。 |
| `levelZeroWritesFor` | entry | function | `src/use-case/edit-document/task-group-folding.ts#levelZeroWritesFor` | PI-9 | 同じ出来事が書き換える段 0 の値 `levelZeroTreeState` を求める |
| `NOT_STORED_ZOOM_BOUNDS` | entry | const | `src/use-case/edit-document/edit-document.ts#NOT_STORED_ZOOM_BOUNDS` | -- | const NOT_STORED_ZOOM_BOUNDS: |
| `PlanActualPlacement` | entry | type | `src/use-case/edit-document/edit-task.ts#PlanActualPlacement` | -- | type PlanActualPlacement = \| { readonly row: 'PA-1' } \| { readonly row: 'PA-2'; readonly actualStart: string; readonly stop: string } \| |
| `ProjectCommand` | entry | type | `src/use-case/edit-document/edit-project.ts#ProjectCommand` | -- | type ProjectCommand = \| { readonly kind: 'setProjectTitle'; readonly title: string \| null } \| { readonly kind: 'setProjectProfile'; readonly fields: ProjectP... |
| `ProjectProfileFields` | entry | interface | `src/use-case/edit-document/edit-project.ts#ProjectProfileFields` | -- | interface ProjectProfileFields |
| `Refusal` | entry | type | `src/use-case/edit-document/edit-document.ts#Refusal` | PI-9 | 型。 |
| `refused` | entry | function | `src/use-case/edit-document/edit-document.ts#refusedEdit` | -- | function refusedEdit(refusals: readonly Refusal[]): EditResult |
| `refusedEdit` | entry | function | `src/use-case/edit-document/edit-document.ts#refusedEdit` | -- | function refusedEdit(refusals: readonly Refusal[]): EditResult |
| `reject` | entry | function | `src/use-case/edit-document/edit-document.ts#reject` | -- | function reject( command: string, rule: string, what: string, reasonCategory?: Refusal['reasonCategory'], ): Refusal |
| `ResourceCommand` | entry | type | `src/use-case/edit-document/edit-resource.ts#ResourceCommand` | -- | type ResourceCommand = \| { readonly kind: 'createResource'; readonly name: string \| null } \| { readonly kind: 'setResourceName'; readonly uid: number; readon... |
| `SettingsLimits` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#SettingsLimits` | PI-9 | 型。 |
| `TaskCommand` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskCommand` | -- | type TaskCommand = \| |
| `TaskGroupCommand` | entry | type | `src/use-case/edit-document/edit-task-group.ts#TaskGroupCommand` | -- | type TaskGroupCommand = \| |
| `TaskMilestoneGlyph` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskMilestoneGlyph` | -- | type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']> |
| `TaskShapeKind` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskShapeKind` | -- | type TaskShapeKind = NonNullable<TaskVisual['shapeKind']> |
| `TreeStateEvent` | entry | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateEvent` | PI-9 | 型。 |
| `treeStateWritesFor` | entry | function | `src/use-case/edit-document/task-group-folding.ts#treeStateWritesFor` | PI-9 | 表 T-328 の出来事 1 つが書き換える行の `treeState` を求める。 |
| `VisibleElement` | entry | type | `src/use-case/edit-document/edit-document-settings.ts#VisibleElement` | -- | type VisibleElement = \| 'planVisible' \| 'actualVisible' \| 'assigneeVisible' \| 'percentCompleteVisible' \| 'dependencyVisible' \| 'progressMarkerVisible' \| 'pro... |
| `wbsSubtreesOf` | entry | function | `src/use-case/edit-document/edit-task-group.ts#wbsSubtreesOf` | PI-9 | `Task` の集合に、`WBS` の子孫をすべて足した集合 —— `CD-1`。 |
| `CommentBoxLeaderShapeKind` | file only | type | `src/use-case/edit-document/edit-annotation.ts#CommentBoxLeaderShapeKind` | -- | type CommentBoxLeaderShapeKind = NonNullable<CommentBox['leaderShapeKind']> |
| `depthOf` | file only | function | `src/use-case/edit-document/edit-task-group.ts#depthOf` | -- | function depthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number |
| `Subtree` | file only | interface | `src/use-case/edit-document/edit-task-group.ts#Subtree` | -- | interface Subtree |
| `subtreeOf` | file only | function | `src/use-case/edit-document/edit-task-group.ts#subtreeOf` | -- | function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree \| null |
| `TaskGroupCommandOf` | file only | type | `src/use-case/edit-document/edit-task-group.ts#TaskGroupCommandOf` | -- | type TaskGroupCommandOf<K extends TaskGroupCommand['kind']> = Extract< |
| `tasksRankedByTheRowTree` | file only | function | `src/use-case/edit-document/task-group-order.ts#tasksRankedByTheRowTree` | -- | function tasksRankedByTheRowTree(schedule: Schedule): readonly Task[] |
| `withRow` | file only | function | `src/use-case/edit-document/edit-task-group.ts#withRow` | -- | function withRow(document: Document, row: TaskGroup): Document |
| `withSchedule` | file only | function | `src/use-case/edit-document/edit-task-group.ts#withSchedule` | -- | function withSchedule(document: Document, part: Partial<Schedule>): Document |
| `blankVisual` | file only | function | `src/use-case/edit-document/edit-task.ts#blankVisual` | -- | function blankVisual(taskUid: number): TaskVisual |
| `checkDay` | file only | function | `src/use-case/edit-document/edit-task.ts#checkDay` | -- | function checkDay(settings: DocumentSettings, text: string): DayCheck |
| `isMilestone` | file only | function | `src/use-case/edit-document/edit-task.ts#isMilestone` | -- | function isMilestone(task: Task, visual: TaskVisual): boolean |
| `repriced` | file only | function | `src/use-case/edit-document/percent-complete.ts#repriced` | -- | function repriced(within: WorkingCalendar, task: Task): Task |
| `sameRow` | file only | function | `src/use-case/edit-document/edit-task.ts#sameRow` | -- | function sameRow<T extends object>(a: T, b: T): boolean |
| `TaskLineWeight` | file only | type | `src/use-case/edit-document/edit-task.ts#TaskLineWeight` | -- | type TaskLineWeight = NonNullable<TaskVisual['lineWeight']> |
| `visualOf` | file only | function | `src/use-case/edit-document/edit-task.ts#visualOf` | -- | function visualOf(schedule: Schedule, taskUid: number): TaskVisual |
| `wbsSubtreeOf` | file only | function | `src/use-case/edit-document/edit-task.ts#wbsSubtreeOf` | -- | function wbsSubtreeOf(schedule: Schedule, root: number): ReadonlySet<number> |
| `withSchedule` | file only | function | `src/use-case/edit-document/edit-task.ts#withSchedule` | -- | function withSchedule(document: Document, schedule: Schedule): Document |
| `withTask` | file only | function | `src/use-case/edit-document/edit-task.ts#withTask` | -- | function withTask(document: Document, next: Task): Document |
| `resetTaskVisualColors` | file only | function | `src/use-case/edit-document/task-appearance.ts#resetTaskVisualColors` | -- | function resetTaskVisualColors( document: Document, command: Extract<TaskCommand, { readonly kind: 'resetTaskVisualColors' }>, ): EditResult |
| `setTaskFadeDays` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskFadeDays` | -- | function setTaskFadeDays( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskFadeInDays' \| 'setTaskFadeOutDays' }>, task: Task, ): Ed... |
| `setTaskVisualColors` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualColors` | -- | function setTaskVisualColors( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualColors' }>, ): EditResult |
| `setTaskVisualLineWeight` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualLineWeight` | -- | function setTaskVisualLineWeight( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualLineWeight' }>, ): EditResult |
| `setTaskVisualMilestoneGlyph` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualMilestoneGlyph` | -- | function setTaskVisualMilestoneGlyph( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualMilestoneGlyph' }>, ): EditResult |
| `setTaskVisualShapeKind` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualShapeKind` | -- | function setTaskVisualShapeKind( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualShapeKind' }>, task: Task, ): EditResult |
| `createTask` | file only | function | `src/use-case/edit-document/task-create.ts#createTask` | -- | function createTask( document: Document, command: Extract<TaskCommand, { readonly kind: 'createTask' }>, within: WorkingCalendar, ): EditResult |
| `resetTaskGroupTreeStates` | file only | function | `src/use-case/edit-document/task-group-folding.ts#resetTaskGroupTreeStates` | -- | function resetTaskGroupTreeStates(document: Document): EditResult |
| `setTaskGroupTreeState` | file only | function | `src/use-case/edit-document/task-group-folding.ts#setTaskGroupTreeState` | -- | function setTaskGroupTreeState( document: Document, command: TaskGroupCommandOf<'setTaskGroupTreeState'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `TREE_STATE_TRANSITIONS` | file only | const | `src/use-case/edit-document/task-group-folding.ts#TREE_STATE_TRANSITIONS` | -- | const TREE_STATE_TRANSITIONS: readonly TreeStateTransition[] = [ |
| `TreeStateEffectName` | file only | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateEffectName` | -- | type TreeStateEffectName = \| 'writeLevelZeroCollapsed' \| 'writeLevelZeroAuto' export interface TreeStateTransition |
| `TreeStateEventCarried` | file only | interface | `src/use-case/edit-document/task-group-folding.ts#TreeStateEventCarried` | -- | interface TreeStateEventCarried |
| `TreeStateKey` | file only | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateKey` | -- | type TreeStateKey = \| 'rowTree' \| 'treeStateMachine.auto' \| 'treeStateMachine.collapsed' \| 'treeStateMachine.expanded' \| 'treeStateMachine.temporarilyExpande... |
| `TreeStateTransition` | file only | interface | `src/use-case/edit-document/task-group-folding.ts#TreeStateTransition` | -- | interface TreeStateTransition |
| `resetTaskGroupColor` | file only | function | `src/use-case/edit-document/task-group-look.ts#resetTaskGroupColor` | -- | function resetTaskGroupColor( document: Document, command: TaskGroupCommandOf<'resetTaskGroupColor'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupColor` | file only | function | `src/use-case/edit-document/task-group-look.ts#setTaskGroupColor` | -- | function setTaskGroupColor( document: Document, command: TaskGroupCommandOf<'setTaskGroupColor'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupHeight` | file only | function | `src/use-case/edit-document/task-group-look.ts#setTaskGroupHeight` | -- | function setTaskGroupHeight( document: Document, command: TaskGroupCommandOf<'setTaskGroupHeight'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `createTaskGroup` | file only | function | `src/use-case/edit-document/task-group-naming.ts#createTaskGroup` | -- | function createTaskGroup( document: Document, command: TaskGroupCommandOf<'createTaskGroup'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupLabel` | file only | function | `src/use-case/edit-document/task-group-naming.ts#setTaskGroupLabel` | -- | function setTaskGroupLabel( document: Document, command: TaskGroupCommandOf<'setTaskGroupLabel'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `moveTaskGroup` | file only | function | `src/use-case/edit-document/task-group-order.ts#moveTaskGroup` | -- | function moveTaskGroup( document: Document, command: TaskGroupCommandOf<'moveTaskGroup'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `reorderTaskGroupSiblings` | file only | function | `src/use-case/edit-document/task-group-order.ts#reorderTaskGroupSiblings` | -- | function reorderTaskGroupSiblings( document: Document, command: TaskGroupCommandOf<'reorderTaskGroupSiblings'>, byId: ReadonlyMap<string, TaskGroup>, ): Edit... |
| `pasteTaskSubtree` | file only | function | `src/use-case/edit-document/task-paste.ts#pasteTaskSubtree` | -- | function pasteTaskSubtree( document: Document, command: Extract<TaskCommand, { readonly kind: 'pasteTaskSubtree' }>, within: WorkingCalendar, ): EditResult |
| `beginTaskActual` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#beginTaskActual` | -- | function beginTaskActual( document: Document, command: Extract<TaskCommand, { readonly kind: 'beginTaskActual' }>, task: Task, within: WorkingCalendar, ): Ed... |
| `cycleTaskPlanActualStateInDocument` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#cycleTaskPlanActualStateInDocument` | -- | function cycleTaskPlanActualStateInDocument( document: Document, command: Extract<TaskCommand, { readonly kind: 'cycleTaskPlanActualState' }>, task: Task, wi... |
| `planDatesEdited` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#planDatesEdited` | -- | function planDatesEdited(task: Task, schedule: Schedule, within: WorkingCalendar): Task |
| `setTaskPlanActualState` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#setTaskPlanActualState` | -- | function setTaskPlanActualState( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskPlanActualState' }>, task: Task, within: WorkingC... |
| `setTaskPlanDates` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#setTaskPlanDates` | -- | function setTaskPlanDates( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskPlanDates' }>, task: Task, within: WorkingCalendar, ): ... |

## ImportDocument (PI-10, `src/use-case/import-document/import-document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AddedAsDifferent` | entry | interface | `src/use-case/import-document/import-document.ts#AddedAsDifferent` | -- | interface AddedAsDifferent |
| `ConflictChoice` | entry | type | `src/use-case/import-document/import-document.ts#ConflictChoice` | -- | type ConflictChoice = 'overwrite' \| 'keepExisting' \| 'cancelImport' |
| `DroppedReference` | entry | interface | `src/use-case/import-document/import-document.ts#DroppedReference` | -- | interface DroppedReference |
| `importDocument` | entry | function | `src/use-case/import-document/import-document.ts#importDocument` | PI-10 | 合流の選択肢は 表 T-032a |
| `ImportFormat` | entry | type | `src/use-case/import-document/import-document.ts#ImportFormat` | -- | type ImportFormat = 'grsJson' \| 'mspdi' |
| `ImportOutcome` | entry | type | `src/use-case/import-document/import-document.ts#ImportOutcome` | -- | type ImportOutcome = \| { readonly ok: false; readonly refusal: ImportRefusal } \| { readonly ok: true; readonly document: Document; readonly report: ImportRep... |
| `ImportRefusal` | entry | type | `src/use-case/import-document/import-document.ts#ImportRefusal` | -- | type ImportRefusal = \| { readonly reason: 'openInProgress'; readonly rule: 'OP-8'; readonly what: string } \| { readonly reason: 'notValidated'; readonly rule... |
| `ImportReport` | entry | interface | `src/use-case/import-document/import-document.ts#ImportReport` | -- | interface ImportReport |
| `ImportRequest` | entry | interface | `src/use-case/import-document/import-document.ts#ImportRequest` | -- | interface ImportRequest |
| `MergeCandidate` | entry | interface | `src/use-case/import-document/import-document.ts#MergeCandidate` | -- | interface MergeCandidate |
| `MergeChoices` | entry | interface | `src/use-case/import-document/import-document.ts#MergeChoices` | -- | interface MergeChoices |
| `MergeMapping` | entry | type | `src/use-case/import-document/import-document.ts#MergeMapping` | -- | type MergeMapping = \| { readonly kind: 'allSame' } \| { readonly kind: 'allDifferent' } \| |
| `OpenChoice` | entry | type | `src/use-case/import-document/import-document.ts#OpenChoice` | -- | type OpenChoice = 'replace' \| 'merge' \| 'baseline' |
| `SourceJudgement` | entry | type | `src/use-case/import-document/import-document.ts#SourceJudgement` | -- | type SourceJudgement = 'sameMaster' \| 'differentMaster' \| 'undecidable' \| 'notJudged' |
| `TaskMapping` | entry | type | `src/use-case/import-document/import-document.ts#TaskMapping` | -- | type TaskMapping = 'same' \| 'different' |
| `TaskMappingDecision` | entry | interface | `src/use-case/import-document/import-document.ts#TaskMappingDecision` | -- | interface TaskMappingDecision |
| `UndoDisposition` | entry | type | `src/use-case/import-document/import-document.ts#UndoDisposition` | -- | type UndoDisposition = 'oneStep' \| 'notUndoable' |

## UndoEdit (PI-11, `src/use-case/undo-edit/undo-edit.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `ChangeStep` | entry | interface | `src/use-case/undo-edit/undo-edit.ts#ChangeStep` | -- | interface ChangeStep |
| `HeldDocument` | entry | interface | `src/use-case/undo-edit/undo-edit.ts#HeldDocument` | -- | interface HeldDocument |
| `undoEdit` | entry | function | `src/use-case/undo-edit/undo-edit.ts#undoEdit` | PI-11 | function undoEdit(held: HeldDocument): UndoOutcome |
| `UndoOutcome` | entry | type | `src/use-case/undo-edit/undo-edit.ts#UndoOutcome` | -- | type UndoOutcome = \| |

## RedoEdit (PI-12, `src/use-case/redo-edit/redo-edit.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `redoEdit` | entry | function | `src/use-case/redo-edit/redo-edit.ts#redoEdit` | PI-12 | function redoEdit(held: HeldDocument): RedoOutcome |
| `RedoOutcome` | entry | type | `src/use-case/redo-edit/redo-edit.ts#RedoOutcome` | -- | type RedoOutcome = \| |

## ValidateImportedDocument (PI-13, `src/use-case/validate-imported-document/validate-imported-document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `ImportBounds` | entry | type | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportBounds` | -- | type ImportBounds = Pick< |
| `ImportCandidate` | entry | interface | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportCandidate` | -- | interface ImportCandidate |
| `ImportRefusal` | entry | interface | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportRefusal` | -- | interface ImportRefusal |
| `ImportVerdict` | entry | type | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportVerdict` | -- | type ImportVerdict = \| { readonly ok: true } \| { readonly ok: false; readonly refusals: readonly ImportRefusal[] } const BYTES_PER_MEGABYTE = 1024 * 1024 |
| `validateImportedDocument` | entry | function | `src/use-case/validate-imported-document/validate-imported-document.ts#validateImportedDocument` | PI-13 | `FR-023` / `NFR-009` |

## ChooseStartupDocument (PI-14, `src/use-case/choose-startup-document/choose-startup-document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `chooseStartupDocument` | entry | function | `src/use-case/choose-startup-document/choose-startup-document.ts#chooseStartupDocument` | PI-14 | 順は 表 T-034 |
| `EmbeddedCandidate` | entry | type | `src/use-case/choose-startup-document/choose-startup-document.ts#EmbeddedCandidate` | -- | type EmbeddedCandidate = \| { readonly kind: 'none' } \| { readonly kind: 'read'; readonly document: Document } \| { readonly kind: 'unreadable' } \| { readonly ... |
| `HandedCandidate` | entry | type | `src/use-case/choose-startup-document/choose-startup-document.ts#HandedCandidate` | -- | type HandedCandidate = \| { readonly kind: 'none' } \| { readonly kind: 'read'; readonly document: Document } \| { readonly kind: 'unreadable' } export interfac... |
| `StartupCandidates` | entry | interface | `src/use-case/choose-startup-document/choose-startup-document.ts#StartupCandidates` | -- | interface StartupCandidates |
| `StartupChoice` | entry | interface | `src/use-case/choose-startup-document/choose-startup-document.ts#StartupChoice` | -- | interface StartupChoice |
| `StartupNotice` | entry | interface | `src/use-case/choose-startup-document/choose-startup-document.ts#StartupNotice` | -- | interface StartupNotice |
| `StartupNoticeCode` | entry | type | `src/use-case/choose-startup-document/choose-startup-document.ts#StartupNoticeCode` | -- | type StartupNoticeCode = \| 'embeddedUnreadable' \| 'embeddedEntryCountNotOne' \| 'handedUnreadable' export interface StartupNotice |
| `StartupRow` | entry | type | `src/use-case/choose-startup-document/choose-startup-document.ts#StartupRow` | -- | type StartupRow = 'BT-1' \| 'BT-2' \| 'BT-4' |

## NotifyChangeWatchers (PI-15, `src/use-case/notify-change-watchers/notify-change-watchers.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `ChangeNotice` | entry | interface | `src/use-case/notify-change-watchers/change-notice.ts#ChangeNotice` | -- | interface ChangeNotice |
| `ChangeWatcher` | entry | interface | `src/use-case/notify-change-watchers/notify-change-watchers.ts#ChangeWatcher` | -- | interface ChangeWatcher |
| `ChangeWatchers` | entry | interface | `src/use-case/notify-change-watchers/notify-change-watchers.ts#ChangeWatchers` | -- | interface ChangeWatchers |
| `ConfirmedChange` | entry | interface | `src/use-case/notify-change-watchers/change-notice.ts#ConfirmedChange` | -- | interface ConfirmedChange |
| `DeliveryFailure` | entry | interface | `src/use-case/notify-change-watchers/notify-change-watchers.ts#DeliveryFailure` | -- | interface DeliveryFailure |
| `emptyChangeWatchers` | entry | function | `src/use-case/notify-change-watchers/notify-change-watchers.ts#emptyChangeWatchers` | PI-15 | 空の監視の登録。 |
| `isDeliveringNotices` | entry | function | `src/use-case/notify-change-watchers/notify-change-watchers.ts#isDeliveringNotices` | -- | function isDeliveringNotices(watchers: ChangeWatchers): boolean |
| `notifyChangeWatchers` | entry | function | `src/use-case/notify-change-watchers/notify-change-watchers.ts#notifyChangeWatchers` | PI-15 | `non-pure` |
| `NotifyOutcome` | entry | interface | `src/use-case/notify-change-watchers/notify-change-watchers.ts#NotifyOutcome` | -- | interface NotifyOutcome |
| `unwatchChanges` | entry | function | `src/use-case/notify-change-watchers/notify-change-watchers.ts#unwatchChanges` | PI-15 | `non-pure` |
| `watchChanges` | entry | function | `src/use-case/notify-change-watchers/notify-change-watchers.ts#watchChanges` | PI-15 | `non-pure` |
| `WatcherMark` | entry | interface | `src/use-case/notify-change-watchers/change-notice.ts#WatcherMark` | -- | interface WatcherMark |
| `changeNoticeFor` | file only | function | `src/use-case/notify-change-watchers/change-notice.ts#changeNoticeFor` | -- | function changeNoticeFor( watcher: string, seen: WatcherMark, confirmed: ConfirmedChange, ): ChangeNotice \| null |

## PostDialogueMessage (PI-16, `src/use-case/post-dialogue-message/post-dialogue-message.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `DialogueAudience` | entry | interface | `src/use-case/post-dialogue-message/post-dialogue-message.ts#DialogueAudience` | -- | interface DialogueAudience |
| `DialogueLogHolder` | entry | interface | `src/use-case/post-dialogue-message/post-dialogue-message.ts#DialogueLogHolder` | -- | interface DialogueLogHolder |
| `postDialogueMessage` | entry | function | `src/use-case/post-dialogue-message/post-dialogue-message.ts#postDialogueMessage` | PI-16 | `non-pure` |
| `SettledUtterance` | entry | type | `src/use-case/post-dialogue-message/post-dialogue-message.ts#SettledUtterance` | -- | type SettledUtterance = Omit<DialogueMessage, 'sequence'> |

## AgentApiEndpoint (PI-17, `src/adapter/agent-api-endpoint/agent-api-endpoint.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AgentApi` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentApi` | -- | interface AgentApi |
| `AgentApiWiring` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentApiWiring` | -- | interface AgentApiWiring |
| `AgentChangeReceiver` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentChangeReceiver` | -- | type AgentChangeReceiver = (notice: NotifyChangeWatchers.ChangeNotice) => void |
| `AgentExport` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentExport` | -- | type AgentExport<TValue> = \| { readonly ok: true; readonly value: TValue } \| { readonly ok: false; readonly refusal: AgentRefusal } // see AM-18, AG-11, AG-9... |
| `AgentImportSource` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentImportSource` | -- | type AgentImportSource = Document \| { readonly document: Document } \| { readonly text: string } |
| `AgentRefusal` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentRefusal` | -- | interface AgentRefusal |
| `AgentRefusalReason` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentRefusalReason` | -- | type AgentRefusalReason = \| 'staleStamp' \| 'gestureInFlight' \| 'editingInPlace' \| 'deliveringNotices' \| 'commandRefused' \| 'unknownTask' \| 'notDrawnYet' \| 't... |
| `AgentSnapshot` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#AgentSnapshot` | -- | interface AgentSnapshot |
| `AgentUtteranceOutcome` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentUtteranceOutcome` | -- | type AgentUtteranceOutcome = \| { readonly accepted: true; readonly message: DialogueMessage } \| { readonly accepted: false; readonly refusal: AgentRefusal } ... |
| `AgentWatch` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWatch` | -- | interface AgentWatch |
| `AgentWriteOutcome` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWriteOutcome` | -- | type AgentWriteOutcome = \| |
| `AgentWriteRequest` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWriteRequest` | -- | interface AgentWriteRequest |
| `FrameSnapshot` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#FrameSnapshot` | -- | interface FrameSnapshot |
| `installAgentApi` | entry | function | `src/adapter/agent-api-endpoint/agent-api-endpoint.ts#installAgentApi` | PI-17 | `non-pure`。 |
| `SnapshotSource` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#SnapshotSource` | PI-17 | 表 T-065）。 |
| `agentApiMembers` | file only | function | `src/adapter/agent-api-endpoint/agent-api-members.ts#agentApiMembers` | -- | function agentApiMembers(wiring: AgentApiWiring): AgentApi |
| `ImportLanding` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#ImportLanding` | -- | type ImportLanding = \| boolean \| { readonly landed: false; readonly refusals: readonly InvariantRefusal[] } export type AgentChangeReceiver = (notice: Notify... |

## InputCommandTranslator (PI-18, `src/adapter/input-command-translator/input-command-translator.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `acted` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#acted` | -- | function acted(action: InputAction): TranslatedInput |
| `ActualEndHold` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#ActualEndHold` | -- | type ActualEndHold = 'GA-3' \| 'GA-4' \| 'GA-12' \| 'GA-13' \| 'GA-16' |
| `Armed` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#Armed` | -- | type Armed = Exclude<ScreenValues['armModeState'], { readonly kind: 'notArmed' }> |
| `armedByEntry` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#armedByEntry` | -- | function armedByEntry(entry: string): Armed \| null |
| `boxById` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#boxById` | -- | function boxById<Box extends { readonly id: string }>(boxes: readonly Box[], id: string): Box \| undefined |
| `changed` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#changed` | -- | function changed(commands: readonly DocumentCommand[]): TranslatedInput |
| `changedAndCreated` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#changedAndCreated` | -- | function changedAndCreated( writes: readonly (readonly DocumentCommand[])[], created: CreatedSubject, ): TranslatedInput |
| `changedInOrder` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#changedInOrder` | -- | function changedInOrder(writes: readonly (readonly DocumentCommand[])[]): TranslatedInput |
| `commandFromFieldCommit` | entry | function | `src/adapter/input-command-translator/field-commit.ts#commandFromFieldCommit` | PI-18 | プロパティパネルで確定した値を 表 T-108 の命令にする。 |
| `commandFromInput` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#commandFromInput` | PI-18 | 割当は 表 T-023 と 表 T-036 |
| `commentAnchorAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#commentAnchorAt` | -- | function commentAnchorAt( layout: ScheduleLayout, x: number, y: number, ): { readonly date: string; readonly groupId: string } \| TranslatedInput |
| `compareDay` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#compareDay` | -- | function compareDay(a: CalendarDay, b: CalendarDay): number |
| `CONSUMED_ELSEWHERE` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#CONSUMED_ELSEWHERE` | -- | const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true } |
| `CreatedSubject` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#CreatedSubject` | -- | type CreatedSubject = \| { readonly kind: 'task'; readonly uid: number } \| { readonly kind: 'row'; readonly groupId: string } export type InputAction = \| |
| `dayAnchorAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayAnchorAt` | -- | function dayAnchorAt( context: InputContext, x: number, ): Pick<ScrollAnchor, 'scrollDate' \| 'scrollDayOffset'> |
| `dayAtX` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayAtX` | -- | function dayAtX(layout: ScheduleLayout, x: number): CalendarDay \| null |
| `dayFromSerial` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayFromSerial` | -- | function dayFromSerial(serial: number): CalendarDay |
| `dayShift` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayShift` | -- | function dayShift(context: InputContext, fromX: number, toX: number): number |
| `dayShifted` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayShifted` | -- | function dayShifted(day: CalendarDay, days: number): CalendarDay |
| `drawnRowsCrossed` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#drawnRowsCrossed` | -- | function drawnRowsCrossed(rows: readonly RowPlacement[], fromY: number, toY: number): number |
| `drawnRowsOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#drawnRowsOf` | -- | function drawnRowsOf(layout: ScheduleLayout): readonly RowPlacement[] |
| `ENTRY` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#ENTRY` | -- | const ENTRY = |
| `escapeContextOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#escapeContextOf` | -- | function escapeContextOf(context: InputContext): EscapeContext |
| `foldsOrNothing` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#foldsOrNothing` | -- | function foldsOrNothing( commands: readonly DocumentCommand[], situation: SpentEntranceSituation \| null, ): TranslatedInput |
| `followingTravel` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#followingTravel` | -- | function followingTravel( at: PointerInput, press: PointerPress, ): { readonly dx: number; readonly dy: number } |
| `GrabRow` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#GrabRow` | -- | type GrabRow = GrabArea |
| `grabRowOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#grabRowOf` | -- | function grabRowOf(hit: Hit): GrabRow |
| `hasDraggedPastThreshold` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#hasDraggedPastThreshold` | -- | function hasDraggedPastThreshold(press: PointerPress, at: { readonly x: number; readonly y: number }): boolean |
| `HumanInput` | entry | type | `src/adapter/input-command-translator/input-source.ts#HumanInput` | -- | type HumanInput = PointerInput \| WheelInput \| KeyInput |
| `InPlaceTarget` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#InPlaceTarget` | -- | type InPlaceTarget = \| { readonly kind: 'documentTitle' } \| { readonly kind: 'taskName'; readonly uid: number } \| { readonly kind: 'assignee'; readonly uid: ... |
| `InputAction` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#InputAction` | -- | type InputAction = \| |
| `InputContext` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#InputContext` | -- | interface InputContext |
| `InputModifiers` | entry | interface | `src/adapter/input-command-translator/input-source.ts#InputModifiers` | -- | interface InputModifiers |
| `InputSource` | entry | interface | `src/adapter/input-command-translator/input-source.ts#InputSource` | PI-18 | 表 T-065 |
| `InputWatcher` | entry | type | `src/adapter/input-command-translator/input-source.ts#InputWatcher` | -- | type InputWatcher = (input: HumanInput) => void |
| `isCombo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isCombo` | PI-18 | 修飾キーの組が求める組と一致するかを答える。 |
| `isOnRowArea` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isOnRowArea` | -- | function isOnRowArea(context: InputContext, x: number, y: number): boolean |
| `isScrollPositionInForce` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isScrollPositionInForce` | -- | function isScrollPositionInForce( context: InputContext, to: Extract<DocumentCommand, { kind: 'setScrollPosition' }>, ): boolean |
| `isSingleCharacterKey` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isSingleCharacterKey` | -- | function isSingleCharacterKey(key: string): boolean |
| `KEY` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#KEY` | -- | const KEY = |
| `KeyInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#KeyInput` | -- | interface KeyInput |
| `milestoneGlyphOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#milestoneGlyphOf` | -- | function milestoneGlyphOf(name: string): TaskMilestoneGlyph \| null |
| `nextIssuedUid` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#nextIssuedUid` | -- | function nextIssuedUid(schedule: Schedule): number |
| `NOT_STORED_PROPERTIES_PANEL_FLOOR` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_PROPERTIES_PANEL_FLOOR` | -- | const NOT_STORED_PROPERTIES_PANEL_FLOOR: |
| `NOT_STORED_ROW_BAND_CEILING_SEARCH` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_ROW_BAND_CEILING_SEARCH` | -- | const NOT_STORED_ROW_BAND_CEILING_SEARCH: |
| `NOT_STORED_ROW_GRAB_SIZES` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_ROW_GRAB_SIZES` | -- | const NOT_STORED_ROW_GRAB_SIZES: |
| `NOT_STORED_VISIBLE_DAY_FLOOR` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_VISIBLE_DAY_FLOOR` | -- | const NOT_STORED_VISIBLE_DAY_FLOOR: |
| `NOT_STORED_ZOOM_STEP` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_ZOOM_STEP` | -- | const NOT_STORED_ZOOM_STEP: |
| `nothingToDo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#nothingToDo` | -- | function nothingToDo(situation: SpentEntranceSituation \| null): TranslatedInput |
| `panTo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#panTo` | -- | function panTo(context: InputContext, dx: number, dy: number): TranslatedInput |
| `PlacedPlanActual` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#PlacedPlanActual` | -- | type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place'] |
| `placementAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#placementAt` | -- | function placementAt(task: Task): PlacedPlanActual \| null |
| `PointerButton` | entry | type | `src/adapter/input-command-translator/input-source.ts#PointerButton` | -- | type PointerButton = 'left' \| 'middle' \| 'right' |
| `pointerDaySerial` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#pointerDaySerial` | -- | function pointerDaySerial(layout: ScheduleLayout, x: number): number \| null |
| `PointerInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#PointerInput` | -- | interface PointerInput |
| `PointerPhase` | entry | type | `src/adapter/input-command-translator/input-source.ts#PointerPhase` | -- | type PointerPhase = 'down' \| 'move' \| 'up' \| 'lost' |
| `PointerPress` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#PointerPress` | -- | interface PointerPress |
| `PressRow` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#PressRow` | PI-18 | 型。 |
| `pressRowOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#pressRowOf` | PI-18 | 押下がどの行で始まったかを答える。 |
| `rememberedActualIn` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rememberedActualIn` | -- | function rememberedActualIn(context: InputContext, taskUid: number): RememberedActual \| null |
| `rowAnchorIn` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowAnchorIn` | -- | function rowAnchorIn( rows: readonly RowPlacement[], y: number, held: Pick<ScrollAnchor, 'scrollGroupId' \| 'scrollGroupOffset'>, ): Pick<ScrollAnchor, 'scrol... |
| `rowAtY` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowAtY` | -- | function rowAtY(layout: ScheduleLayout, y: number): RowPlacement \| null |
| `rowBandCeilingOf` | entry | function | `src/adapter/input-command-translator/zoom-and-fit.ts#rowBandCeilingOf` | PI-18 | `FR-016` の行の軸の上限のうち、いちばん高い行の帯の高さが初めて `Row Area` の高さ以上になった倍率を、表 T-253 の手順で探した答え。 |
| `rowDepthOfGroup` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowDepthOfGroup` | -- | function rowDepthOfGroup(context: InputContext, groupId: string): number |
| `RowGrabAxis` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#RowGrabAxis` | -- | type RowGrabAxis = 'position' \| 'depth' |
| `rowGrabDepthOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowGrabDepthOf` | -- | function rowGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number |
| `rowIndexAtTopEdge` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowIndexAtTopEdge` | -- | function rowIndexAtTopEdge(rows: readonly RowPlacement[], y: number): number \| null |
| `rowsAtZoomY` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rowsAtZoomY` | -- | function rowsAtZoomY( context: InputContext, measuredWith: DocumentSettings, zoomY: number, ): readonly RowPlacement[] |
| `screenEventFromInput` | entry | function | `src/adapter/input-command-translator/screen-state-input.ts#screenEventFromInput` | PI-18 | 入力から画面の値の出来事を 1 つ作る。 |
| `ScrollAnchor` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#ScrollAnchor` | -- | interface ScrollAnchor |
| `scrollAreaTopOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrollAreaTopOf` | -- | function scrollAreaTopOf(context: InputContext): number |
| `ScrollbarAxis` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#ScrollbarAxis` | -- | type ScrollbarAxis = NonNullable<ScreenPart['scrollbarAxis']> |
| `scrolledAnchor` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrolledAnchor` | -- | function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor |
| `scrollingRowsOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrollingRowsOf` | -- | function scrollingRowsOf(layout: ScheduleLayout): readonly RowPlacement[] |
| `selectionFromInput` | entry | function | `src/adapter/input-command-translator/selection-input.ts#selectionFromInput` | PI-18 | 規則は 表 T-023c。 |
| `serialOfDay` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#serialOfDay` | -- | function serialOfDay(day: CalendarDay): number |
| `SetDualCursor` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#SetDualCursor` | -- | type SetDualCursor = Extract<DocumentCommand, { readonly kind: 'setDualCursor' }> |
| `SpentEntranceSituation` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#SpentEntranceSituation` | PI-18 | 型。 |
| `taskGroupRankById` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupRankById` | -- | function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> |
| `taskShapeKindOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskShapeKindOf` | -- | function taskShapeKindOf(name: string): TaskShapeKind \| null |
| `TranslatedInput` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#TranslatedInput` | -- | interface TranslatedInput |
| `UNASSIGNED` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#UNASSIGNED` | -- | const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false } |
| `WheelInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#WheelInput` | -- | interface WheelInput |
| `zoomYCeiling` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#zoomYCeiling` | -- | function zoomYCeiling(context: InputContext): number \| null |
| `commandFromArmed` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromArmed` | -- | function commandFromArmed( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromArmingEntry` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromArmingEntry` | -- | function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput |
| `commandFromDependencyDrag` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromDependencyDrag` | -- | function commandFromDependencyDrag( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `displayScaleStep` | file only | function | `src/adapter/input-command-translator/display-scale-steps.ts#displayScaleStep` | -- | function displayScaleStep(context: InputContext, towards: 1 \| -1): TranslatedInput |
| `commandFromDualCursorEntry` | file only | function | `src/adapter/input-command-translator/dual-cursor-input.ts#commandFromDualCursorEntry` | -- | function commandFromDualCursorEntry( press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromDualCursorPress` | file only | function | `src/adapter/input-command-translator/dual-cursor-input.ts#commandFromDualCursorPress` | -- | function commandFromDualCursorPress( press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromPanelDivider` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#commandFromPanelDivider` | -- | function commandFromPanelDivider( panel: NonNullable<ScreenPart['dividerPanel']>, release: PointerInput, press: PointerPress, context: InputContext, ): Trans... |
| `commandFromScrollbar` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#commandFromScrollbar` | -- | function commandFromScrollbar( axis: ScrollbarAxis, release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `paletteFollow` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#paletteFollow` | -- | function paletteFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `scrollbarFollow` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#scrollbarFollow` | -- | function scrollbarFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `commandFromGrab` | file only | function | `src/adapter/input-command-translator/item-grab.ts#commandFromGrab` | -- | function commandFromGrab( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromRowGrab` | file only | function | `src/adapter/input-command-translator/row-grab.ts#commandFromRowGrab` | -- | function commandFromRowGrab( release: PointerInput, press: PointerPress, context: InputContext, heldGroupId: string, ): TranslatedInput |
| `grabbedRowGroupId` | file only | function | `src/adapter/input-command-translator/row-grab.ts#grabbedRowGroupId` | -- | function grabbedRowGroupId(press: PointerPress): string \| null |
| `rowGrabFollow` | file only | function | `src/adapter/input-command-translator/row-grab.ts#rowGrabFollow` | -- | function rowGrabFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `commandFromRowEntry` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#commandFromRowEntry` | -- | function commandFromRowEntry( entry: string, rowGroupId: string \| null, context: InputContext, ): TranslatedInput |
| `commandFromRowExpanderCloseAll` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#commandFromRowExpanderCloseAll` | -- | function commandFromRowExpanderCloseAll(context: InputContext): TranslatedInput |
| `commandFromRowExpanderOpenAll` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#commandFromRowExpanderOpenAll` | -- | function commandFromRowExpanderOpenAll(context: InputContext): TranslatedInput |
| `commandFromRowExpanderOpenLevelZero` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#commandFromRowExpanderOpenLevelZero` | -- | function commandFromRowExpanderOpenLevelZero(context: InputContext): TranslatedInput |
| `everyRowDeleted` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#everyRowDeleted` | -- | function everyRowDeleted(context: InputContext): TranslatedInput |
| `rowStoodUp` | file only | function | `src/adapter/input-command-translator/row-tree-entrances.ts#rowStoodUp` | -- | function rowStoodUp( context: InputContext, parentGroupId: string \| null, depth: number, ): TranslatedInput |
| `commandFromKey` | file only | function | `src/adapter/input-command-translator/shortcut-keys.ts#commandFromKey` | -- | function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput |
| `commandFromWheel` | file only | function | `src/adapter/input-command-translator/wheel-input.ts#commandFromWheel` | -- | function commandFromWheel(input: WheelInput, context: InputContext): TranslatedInput |
| `fitWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#fitWrites` | -- | function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] |
| `keyZoomFactor` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#keyZoomFactor` | -- | function keyZoomFactor(context: InputContext, isIn: boolean): number |
| `rowPointIn` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#rowPointIn` | -- | function rowPointIn( rows: readonly RowPlacement[], anchor: Pick<ScrollAnchor, 'scrollGroupId' \| 'scrollGroupOffset'>, ): number \| null |
| `rowZoomAnswer` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#rowZoomAnswer` | -- | function rowZoomAnswer( context: InputContext, factor: number, pointerX: number \| null, pointerY: number \| null, ): TranslatedInput |
| `statusLineWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#statusLineWrites` | -- | function statusLineWrites(context: InputContext): readonly DocumentCommand[] |
| `topEdgeIn` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#topEdgeIn` | -- | function topEdgeIn( rows: readonly RowPlacement[], anchor: Pick<ScrollAnchor, 'scrollGroupId' \| 'scrollGroupOffset'>, ): number \| null |
| `zoomOnScreen` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomOnScreen` | -- | function zoomOnScreen(context: InputContext): { readonly x: number; readonly y: number } |
| `zoomStepAnswer` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomStepAnswer` | -- | function zoomStepAnswer( context: InputContext, factor: number, zoom: readonly DocumentCommand[], ): TranslatedInput |
| `zoomTimes` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomTimes` | -- | function zoomTimes(context: InputContext, factor: number, axis: 'x' \| 'y'): number |
| `zoomWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomWrites` | -- | function zoomWrites( context: InputContext, zoomX: number \| null, zoomY: number \| null, pointerX: number \| null, pointerY: number \| null, ): readonly Documen... |

## SvgRenderer (PI-19, `src/adapter/svg-renderer/svg-renderer.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `achromatic` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#achromatic` | -- | function achromatic(colour: string): string |
| `actualOfCustom` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#actualOfCustom` | -- | function actualOfCustom(hex: string, dark: boolean, monochrome: boolean): string |
| `boxOfPoints` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#boxOfPoints` | -- | function boxOfPoints(path: Path): ScreenRect \| null |
| `ChosenColour` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#ChosenColour` | -- | type ChosenColour = (stored: string \| null, form: ColourForm) => string \| null |
| `ColourForm` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#ColourForm` | -- | type ColourForm = 'fill' \| 'outline' \| 'actual' \| 'band' |
| `colourOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#colourOf` | PI-19 | 表 T-236 の行 ID と、いまの色の好みから 1 色を返す。 |
| `DualCursorFollow` | entry | interface | `src/adapter/svg-renderer/svg-renderer.ts#DualCursorFollow` | -- | interface DualCursorFollow |
| `escaped` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#escaped` | -- | function escaped(text: string): string |
| `figureKey` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#figureKey` | -- | function figureKey(key: string): string |
| `GROUP_GRID_LINE_WIDTH_PX` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#GROUP_GRID_LINE_WIDTH_PX` | PI-19 | `Group Grid Lines` の罫の太さ。 |
| `NOT_STORED_DELAY_MARK_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DELAY_MARK_SIZES` | -- | const NOT_STORED_DELAY_MARK_SIZES: |
| `NOT_STORED_DEPENDENCY_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DEPENDENCY_SIZES` | -- | const NOT_STORED_DEPENDENCY_SIZES: |
| `NOT_STORED_DUAL_CURSOR_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DUAL_CURSOR_SIZES` | -- | const NOT_STORED_DUAL_CURSOR_SIZES: |
| `NOT_STORED_DUMMY_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DUMMY_SIZES` | -- | const NOT_STORED_DUMMY_SIZES: |
| `NOT_STORED_NAME_LABEL_WEIGHT` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_NAME_LABEL_WEIGHT` | -- | const NOT_STORED_NAME_LABEL_WEIGHT: |
| `NOT_STORED_RULER_WEEKDAY_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_RULER_WEEKDAY_SIZES` | -- | const NOT_STORED_RULER_WEEKDAY_SIZES: |
| `NOT_STORED_SELECTION_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_SELECTION_SIZES` | -- | const NOT_STORED_SELECTION_SIZES: |
| `pointsOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#pointsOf` | -- | function pointsOf(path: Path): string |
| `rounded` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#rounded` | -- | function rounded(value: number): string |
| `SchedulePicture` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#SchedulePicture` | -- | type SchedulePicture = 'screen' \| 'export' |
| `selectedLineWidth` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#selectedLineWidth` | -- | function selectedLineWidth(own: number, selected: boolean): number |
| `selectionFrameSvg` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#selectionFrameSvg` | -- | function selectionFrameSvg(box: ScreenRect, colour: string, key: string): string |
| `svgFromSchedule` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#svgFromSchedule` | PI-19 | `FR-080` |
| `SvgSurface` | entry | interface | `src/adapter/svg-renderer/svg-surface.ts#SvgSurface` | PI-19 | 表 T-065 |
| `swatchOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#swatchOf` | PI-19 | 色の欄の見本の色。 |
| `typefaceAttribute` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#typefaceAttribute` | -- | function typefaceAttribute(): string |
| `Watermark` | entry | interface | `src/adapter/svg-renderer/svg-renderer.ts#Watermark` | -- | interface Watermark |
| `WATERMARK_MARKS` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#WATERMARK_MARKS` | -- | const WATERMARK_MARKS: |
| `bandWidthOf` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#bandWidthOf` | -- | function bandWidthOf(input: GridInput): number |
| `GridInput` | file only | interface | `src/adapter/svg-renderer/schedule-grid.ts#GridInput` | -- | interface GridInput |
| `GridParts` | file only | interface | `src/adapter/svg-renderer/schedule-grid.ts#GridParts` | -- | interface GridParts |
| `gridParts` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#gridParts` | -- | function gridParts(input: GridInput): GridParts |
| `rulerSvg` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#rulerSvg` | -- | function rulerSvg( layout: ScheduleLayout, settings: DocumentSettings, band: ScreenRect, weekStart: number, ground: string, ink: string, rule: string, weekda... |
| `OverlayParts` | file only | interface | `src/adapter/svg-renderer/schedule-overlays.ts#OverlayParts` | -- | interface OverlayParts |
| `overlayParts` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#overlayParts` | -- | function overlayParts(input: OverlaysInput): OverlayParts |
| `OverlaysInput` | file only | interface | `src/adapter/svg-renderer/schedule-overlays.ts#OverlaysInput` | -- | interface OverlaysInput |
| `watermarkSvg` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#watermarkSvg` | -- | function watermarkSvg( area: ScreenRect, pictureWidth: number, mark: Watermark, ink: string, clipId: string, ): string |
| `dependencyArrowSvg` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#dependencyArrowSvg` | -- | function dependencyArrowSvg(id: string, length: number, colour: string): string |
| `DependencyLinkParts` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#DependencyLinkParts` | -- | interface DependencyLinkParts |
| `dependencyLinkParts` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#dependencyLinkParts` | -- | function dependencyLinkParts(input: DependencyLinksInput): DependencyLinkParts |
| `DependencyLinksInput` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#DependencyLinksInput` | -- | interface DependencyLinksInput |
| `TaskFigureParts` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#TaskFigureParts` | -- | interface TaskFigureParts |
| `taskFigureParts` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#taskFigureParts` | -- | function taskFigureParts(input: TaskFiguresInput): TaskFigureParts |
| `TaskFiguresInput` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#TaskFiguresInput` | -- | interface TaskFiguresInput |

## DocumentCodec (PI-20, `src/adapter/document-codec/document-codec.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AppShell` | entry | interface | `src/adapter/document-codec/app-shell-source.ts#AppShell` | -- | interface AppShell |
| `AppShellReading` | entry | type | `src/adapter/document-codec/app-shell-source.ts#AppShellReading` | -- | type AppShellReading = \| { readonly ok: true; readonly appShell: AppShell } \| { readonly ok: false; readonly what: string } export interface AppShellSource |
| `AppShellSource` | entry | interface | `src/adapter/document-codec/app-shell-source.ts#AppShellSource` | PI-20 | 表 T-065 |
| `documentFromJson` | entry | function | `src/adapter/document-codec/json-codec.ts#documentFromJson` | PI-20 | function documentFromJson( text: string, greatestKnownSchemaVersion?: string, ): JsonDecoding |
| `documentFromMspdi` | entry | function | `src/adapter/document-codec/mspdi-codec.ts#documentFromMspdi` | PI-20 | function documentFromMspdi(text: string, current: Document): MspdiDecoding |
| `EmbeddedHtmlExport` | entry | type | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlExport` | -- | type EmbeddedHtmlExport = \| { readonly ok: true; readonly html: string } \| { readonly ok: false; readonly fault: EmbeddedHtmlFault } const CONTAINER_TYPE = '... |
| `EmbeddedHtmlFault` | entry | interface | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlFault` | -- | interface EmbeddedHtmlFault |
| `EmbeddedHtmlFaultReason` | entry | type | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlFaultReason` | -- | type EmbeddedHtmlFaultReason = \| 'appShellUnavailable' \| 'unusableElementId' \| 'moreThanOneEntry' export interface EmbeddedHtmlFault |
| `ExchangeFormat` | entry | type | `src/adapter/document-codec/document-codec.ts#ExchangeFormat` | -- | type ExchangeFormat = 'grsJson' \| 'mspdi' |
| `exportEmbeddedHtml` | entry | function | `src/adapter/document-codec/embedded-html-codec.ts#exportEmbeddedHtml` | PI-20 | `semi-pure-b`。 |
| `extensionOfFormat` | entry | function | `src/adapter/document-codec/document-codec.ts#extensionOfFormat` | PI-20 | 表 T-024 の行 ID から、その形式の拡張子を答える。 |
| `formatFromFile` | entry | function | `src/adapter/document-codec/document-codec.ts#formatFromFile` | PI-20 | どちらの形式として読むかを答える。 |
| `FormatMismatch` | entry | type | `src/adapter/document-codec/document-codec.ts#FormatMismatch` | -- | type FormatMismatch = 'extension' \| 'firstCharacter' \| 'both' |
| `FormatReading` | entry | type | `src/adapter/document-codec/document-codec.ts#FormatReading` | -- | type FormatReading = \| { readonly ok: true; readonly format: ExchangeFormat } \| |
| `FormatVersionReading` | entry | type | `src/adapter/document-codec/json-codec.ts#FormatVersionReading` | -- | type FormatVersionReading = 'notCompared' \| 'known' \| 'newerThanKnown' |
| `JsonDecoding` | entry | type | `src/adapter/document-codec/json-codec.ts#JsonDecoding` | -- | type JsonDecoding = \| |
| `JsonFault` | entry | interface | `src/adapter/document-codec/grs-json-schema.ts#JsonFault` | -- | interface JsonFault |
| `jsonFromDocument` | entry | function | `src/adapter/document-codec/json-codec.ts#jsonFromDocument` | PI-20 | function jsonFromDocument(document: Document): string |
| `MspdiDecoding` | entry | type | `src/adapter/document-codec/mspdi-codec.ts#MspdiDecoding` | -- | type MspdiDecoding = \| |
| `MspdiEncoding` | entry | interface | `src/adapter/document-codec/mspdi-codec.ts#MspdiEncoding` | -- | interface MspdiEncoding |
| `MspdiFault` | entry | interface | `src/adapter/document-codec/mspdi-xml.ts#MspdiFault` | -- | interface MspdiFault |
| `mspdiFromDocument` | entry | function | `src/adapter/document-codec/mspdi-codec.ts#mspdiFromDocument` | PI-20 | function mspdiFromDocument(document: Document): MspdiEncoding |
| `MspdiNotice` | entry | interface | `src/adapter/document-codec/mspdi-codec.ts#MspdiNotice` | -- | interface MspdiNotice |
| `collectionNamesOfEntity` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#collectionNamesOfEntity` | -- | function collectionNamesOfEntity(entity: string): readonly string[] |
| `collectSchemaFaults` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#collectSchemaFaults` | -- | function collectSchemaFaults(value: unknown, out: JsonFault[]): void |
| `fault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#fault` | -- | function fault(at: string, what: string): JsonFault |
| `isMissingKeyFault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#isMissingKeyFault` | -- | function isMissingKeyFault(one: JsonFault): boolean |
| `isUnknownKeyFault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#isUnknownKeyFault` | -- | function isUnknownKeyFault(one: JsonFault): boolean |
| `JsonRefusalReason` | file only | type | `src/adapter/document-codec/json-codec.ts#JsonRefusalReason` | -- | type JsonRefusalReason = 'RS-25' \| 'RS-64' |
| `PARENT_ORDERS` | file only | const | `src/adapter/document-codec/mspdi-child-placement.ts#PARENT_ORDERS` | -- | const PARENT_ORDERS: ReadonlyMap<string, ParentOrder> = new Map( |
| `ParentPath` | file only | type | `src/adapter/document-codec/mspdi-child-placement.ts#ParentPath` | -- | type ParentPath = keyof typeof childOrder.parents |
| `PlacedChild` | file only | interface | `src/adapter/document-codec/mspdi-child-placement.ts#PlacedChild` | -- | interface PlacedChild |
| `writtenCarriedElement` | file only | function | `src/adapter/document-codec/mspdi-child-placement.ts#writtenCarriedElement` | -- | function writtenCarriedElement(carried: CarryElement, path: string): XmlElement |
| `writtenChildren` | file only | function | `src/adapter/document-codec/mspdi-child-placement.ts#writtenChildren` | -- | function writtenChildren( path: string, named: readonly PlacedChild[], carry: Readonly<Record<string, string>>, carried: readonly CarryElement[], ): readonly... |
| `BYTE_ORDER_MARK` | file only | const | `src/adapter/document-codec/mspdi-codec.ts#BYTE_ORDER_MARK` | -- | const BYTE_ORDER_MARK = '\uFEFF' |
| `childOf` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#childOf` | -- | function childOf(element: XmlElement, name: string): XmlElement \| null |
| `ExportRun` | file only | interface | `src/adapter/document-codec/mspdi-codec.ts#ExportRun` | -- | interface ExportRun |
| `integerColumn` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#integerColumn` | -- | function integerColumn(element: XmlElement, name: string): number \| null |
| `isObject` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#isObject` | -- | function isObject(value: unknown): value is Record<string, unknown> |
| `leaf` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#leaf` | -- | function leaf(name: string, text: string): PlacedChild |
| `MSPDI_NAMESPACE` | file only | const | `src/adapter/document-codec/mspdi-codec.ts#MSPDI_NAMESPACE` | -- | const MSPDI_NAMESPACE = 'http://schemas.microsoft.com/project/2007' |
| `mspdiVersionOfCarried` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#mspdiVersionOfCarried` | -- | function mspdiVersionOfCarried(schedule: unknown): MspdiVersion |
| `notice` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#notice` | -- | function notice(at: string, what: string): MspdiNotice |
| `PATHS` | file only | const | `src/adapter/document-codec/mspdi-codec.ts#PATHS` | -- | const PATHS = |
| `textColumn` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#textColumn` | -- | function textColumn(element: XmlElement, name: string): string \| null |
| `wholeNumberOf` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#wholeNumberOf` | -- | function wholeNumberOf(raw: string \| null \| undefined): number \| null |
| `withoutLeadingByteOrderMark` | file only | function | `src/adapter/document-codec/mspdi-codec.ts#withoutLeadingByteOrderMark` | -- | function withoutLeadingByteOrderMark(text: string): string |
| `ClaimedFrame` | file only | interface | `src/adapter/document-codec/mspdi-fade-frames.ts#ClaimedFrame` | -- | interface ClaimedFrame |
| `claimedFrames` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#claimedFrames` | -- | function claimedFrames(schedule: Schedule, run: ExportRun): readonly ClaimedFrame[] |
| `FadeColumn` | file only | type | `src/adapter/document-codec/mspdi-fade-frames.ts#FadeColumn` | -- | type FadeColumn = 'fadeInDays' \| 'fadeOutDays' |
| `fadeColumnsByFieldId` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#fadeColumnsByFieldId` | -- | function fadeColumnsByFieldId(root: XmlElement): ReadonlyMap<number, FadeColumn> |
| `fadeOfCarried` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#fadeOfCarried` | -- | function fadeOfCarried( carried: readonly CarryElement[], fadeColumns: ReadonlyMap<number, FadeColumn>, ): FadeReading |
| `writtenFadeDefinitions` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#writtenFadeDefinitions` | -- | function writtenFadeDefinitions( frames: readonly ClaimedFrame[], carried: readonly CarryElement[], carry: Readonly<Record<string, string>>, ): FadeDefinitions |
| `writtenFadeValues` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#writtenFadeValues` | -- | function writtenFadeValues(task: Task, frames: readonly ClaimedFrame[]): PlacedChild[] |
| `rowsFromTasks` | file only | function | `src/adapter/document-codec/mspdi-imported-rows.ts#rowsFromTasks` | -- | function rowsFromTasks(tasks: readonly Task[], maxGroupDepth: number): ImportedRows |
| `fault` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#fault` | -- | function fault(at: string, what: string): MspdiFault |
| `readXml` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#readXml` | -- | function readXml(text: string): XmlReading |
| `writtenXml` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#writtenXml` | -- | function writtenXml(root: XmlElement, namespace: string): string |
| `XmlElement` | file only | interface | `src/adapter/document-codec/mspdi-xml.ts#XmlElement` | -- | interface XmlElement |

## ImageExporter (PI-21, `src/adapter/image-exporter/image-exporter.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `exportPng` | entry | function | `src/adapter/image-exporter/image-exporter.ts#exportPng` | PI-21 | `semi-pure-b`。 |
| `ExportScene` | entry | interface | `src/adapter/image-exporter/image-exporter.ts#ExportScene` | -- | interface ExportScene |
| `exportSvg` | entry | function | `src/adapter/image-exporter/image-exporter.ts#exportSvg` | PI-21 | 表 T-076 が「描く」とした UI パーツを組み立てて返す。 |
| `ImageExport` | entry | type | `src/adapter/image-exporter/image-exporter.ts#ImageExport` | -- | type ImageExport = \| ({ readonly ok: true } & SvgPicture & { readonly png: Rastering }) \| { readonly ok: false; readonly fault: ImageExportFault } // see EP-... |
| `ImageExportFault` | entry | interface | `src/adapter/image-exporter/image-exporter.ts#ImageExportFault` | -- | interface ImageExportFault |
| `NOT_STORED_DOCUMENT_TITLE_SIZES` | entry | const | `src/adapter/image-exporter/image-exporter.ts#NOT_STORED_DOCUMENT_TITLE_SIZES` | -- | const NOT_STORED_DOCUMENT_TITLE_SIZES: |
| `RasterFault` | entry | interface | `src/adapter/image-exporter/rasterizer.ts#RasterFault` | -- | interface RasterFault |
| `RasterFaultReason` | entry | type | `src/adapter/image-exporter/rasterizer.ts#RasterFaultReason` | -- | type RasterFaultReason = \| 'unsupported' \| 'tooLarge' \| 'rasterFailed' export interface RasterFault |
| `Rastering` | entry | type | `src/adapter/image-exporter/rasterizer.ts#Rastering` | -- | type Rastering = \| { readonly ok: true; readonly pngBytes: Uint8Array } \| { readonly ok: false; readonly fault: RasterFault } export interface Rasterizer |
| `Rasterizer` | entry | interface | `src/adapter/image-exporter/rasterizer.ts#Rasterizer` | PI-21 | 表 T-065 |
| `RasterSizePx` | entry | interface | `src/adapter/image-exporter/rasterizer.ts#RasterSizePx` | -- | interface RasterSizePx |
| `SvgExport` | entry | type | `src/adapter/image-exporter/image-exporter.ts#SvgExport` | -- | type SvgExport = \| ({ readonly ok: true } & SvgPicture) \| { readonly ok: false; readonly fault: ImageExportFault } export type ImageExport = \| ({ readonly ok... |

## FileGateway (PI-22, `src/adapter/file-gateway/file-gateway.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `ChosenFileSaveRequest` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#ChosenFileSaveRequest` | -- | interface ChosenFileSaveRequest |
| `ChosenFileWrite` | entry | interface | `src/adapter/file-gateway/file-store.ts#ChosenFileWrite` | -- | interface ChosenFileWrite |
| `ChosenWriteDestination` | entry | type | `src/adapter/file-gateway/file-store.ts#ChosenWriteDestination` | -- | type ChosenWriteDestination = \| { readonly kind: 'empty' } \| |
| `DocumentFileFault` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#DocumentFileFault` | -- | interface DocumentFileFault |
| `DocumentFileFaultReason` | entry | type | `src/adapter/file-gateway/file-gateway.ts#DocumentFileFaultReason` | -- | type DocumentFileFaultReason = \| FileStoreFaultReason \| 'notUtf8' \| 'notAnOverwriteTarget' export interface DocumentFileFault |
| `DocumentFileOpening` | entry | type | `src/adapter/file-gateway/file-gateway.ts#DocumentFileOpening` | -- | type DocumentFileOpening = \| |
| `DocumentFileSaveRequest` | entry | type | `src/adapter/file-gateway/file-gateway.ts#DocumentFileSaveRequest` | -- | type DocumentFileSaveRequest = \| |
| `DocumentFileSaving` | entry | type | `src/adapter/file-gateway/file-gateway.ts#DocumentFileSaving` | -- | type DocumentFileSaving = \| { readonly ok: true; readonly openedFile: OpenedFileState } \| { readonly ok: false; readonly fault: DocumentFileFault } const ROU... |
| `DocumentIdentity` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#DocumentIdentity` | -- | interface DocumentIdentity extends ProjectIdentity |
| `FileReading` | entry | type | `src/adapter/file-gateway/file-store.ts#FileReading` | -- | type FileReading = \| |
| `FileStore` | entry | interface | `src/adapter/file-gateway/file-store.ts#FileStore` | PI-22 | 表 T-065 |
| `FileStoreFault` | entry | interface | `src/adapter/file-gateway/file-store.ts#FileStoreFault` | -- | interface FileStoreFault |
| `FileStoreFaultReason` | entry | type | `src/adapter/file-gateway/file-store.ts#FileStoreFaultReason` | -- | type FileStoreFaultReason = \| 'cancelled' \| 'permissionLost' \| 'noOpenedFile' \| 'unavailable' export interface FileStoreFault |
| `FileWriting` | entry | type | `src/adapter/file-gateway/file-store.ts#FileWriting` | -- | type FileWriting = \| { readonly ok: true; readonly openedFile: OpenedFileState } \| { readonly ok: false; readonly fault: FileStoreFault } export type ChosenW... |
| `openDocumentFile` | entry | function | `src/adapter/file-gateway/file-gateway.ts#openDocumentFile` | PI-22 | `semi-pure-b` |
| `OpenedDocumentFile` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#OpenedDocumentFile` | -- | interface OpenedDocumentFile |
| `OpenedFileContent` | entry | interface | `src/adapter/file-gateway/file-store.ts#OpenedFileContent` | -- | interface OpenedFileContent |
| `OpenedFileState` | entry | type | `src/adapter/file-gateway/file-store.ts#OpenedFileState` | -- | type OpenedFileState = \| { readonly kind: 'none' } \| { readonly kind: 'writable'; readonly fileName: string } \| { readonly kind: 'permissionLost'; readonly f... |
| `OpenRoute` | entry | type | `src/adapter/file-gateway/file-store.ts#OpenRoute` | -- | type OpenRoute = 'chooser' \| 'drop' \| 'reopen' |
| `ProjectIdentity` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#ProjectIdentity` | -- | interface ProjectIdentity |
| `saveDocumentFile` | entry | function | `src/adapter/file-gateway/file-gateway.ts#saveDocumentFile` | PI-22 | `non-pure` |
| `SaveFileContent` | entry | type | `src/adapter/file-gateway/file-gateway.ts#SaveFileContent` | -- | type SaveFileContent = \| { readonly text: string } \| { readonly bytes: Uint8Array } export interface ProjectIdentity |
| `SaveFileForm` | entry | type | `src/adapter/file-gateway/file-gateway.ts#SaveFileForm` | -- | type SaveFileForm = 'grsJson' \| 'mspdi' \| 'svg' \| 'png' \| 'singleHtml' |

## ClipboardGateway (PI-24, `src/adapter/clipboard-gateway/clipboard-gateway.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `Clipboard` | entry | interface | `src/adapter/clipboard-gateway/clipboard.ts#Clipboard` | PI-24 | 表 T-065 |
| `ClipboardContent` | entry | type | `src/adapter/clipboard-gateway/clipboard.ts#ClipboardContent` | -- | type ClipboardContent = \| |
| `ClipboardFault` | entry | type | `src/adapter/clipboard-gateway/clipboard.ts#ClipboardFault` | -- | type ClipboardFault = \| 'notPermitted' \| 'unsupported' \| 'writeFailed' export type ClipboardWriting = \| { readonly ok: true } \| { readonly ok: false; readonl... |
| `ClipboardWriting` | entry | type | `src/adapter/clipboard-gateway/clipboard.ts#ClipboardWriting` | -- | type ClipboardWriting = \| { readonly ok: true } \| { readonly ok: false; readonly fault: ClipboardFault } export interface Clipboard |
| `writeClipboard` | entry | function | `src/adapter/clipboard-gateway/clipboard-gateway.ts#writeClipboard` | PI-24 | `non-pure`。 |

## SingleHtmlShell (PI-25, `src/framework/single-html-shell/single-html-shell.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `readBrowserStored` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#readBrowserStored` | -- | function readBrowserStored(row: BrowserStoredRow): string \| null |
| `startupAgentApiEnabled` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#startupAgentApiEnabled` | -- | function startupAgentApiEnabled(): boolean |
| `startupDisplayLanguage` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#startupDisplayLanguage` | -- | function startupDisplayLanguage(): DisplayLanguage |
| `writeBrowserStored` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#writeBrowserStored` | -- | function writeBrowserStored(row: BrowserStoredRow, value: string): void |
| `copiedForPasteOf` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#copiedForPasteOf` | -- | function copiedForPasteOf(chosenRows: readonly string[], selected: Selection): SelectionCopied \| null |
| `CopyAndPasteHands` | file only | type | `src/framework/single-html-shell/copy-and-paste.ts#CopyAndPasteHands` | -- | type CopyAndPasteHands = Pick< |
| `copyForPaste` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#copyForPaste` | -- | function copyForPaste(hands: CopyAndPasteHands): void |
| `pasteRefusedFor` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#pasteRefusedFor` | -- | function pasteRefusedFor(chosenRows: readonly string[]): boolean |
| `pasteWhatWasCopied` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#pasteWhatWasCopied` | -- | function pasteWhatWasCopied(hands: CopyAndPasteHands, frame: FrameValues): void |
| `answerOpenChoice` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#answerOpenChoice` | -- | function answerOpenChoice(hands: DocumentFileFlowHands, openChoice: OpenChoice, frame: FrameValues \| null): void |
| `answerSettledFormat` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#answerSettledFormat` | -- | function answerSettledFormat(hands: DocumentFileFlowHands, format: ExportFormatId): boolean |
| `askToOpenDroppedFile` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#askToOpenDroppedFile` | -- | function askToOpenDroppedFile(hands: DocumentFileFlowHands): void |
| `DocumentFileFlow` | file only | type | `src/framework/single-html-shell/document-file-flow.ts#DocumentFileFlow` | -- | type DocumentFileFlow = ReturnType<typeof documentFileFlowOf> |
| `DocumentFileFlowHands` | file only | type | `src/framework/single-html-shell/document-file-flow.ts#DocumentFileFlowHands` | -- | type DocumentFileFlowHands = Pick< |
| `documentFileFlowOf` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#documentFileFlowOf` | -- | function documentFileFlowOf(hands: DocumentFileFlowHands) |
| `OPEN_ROUTE_FROM_CHOOSER` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_FROM_CHOOSER` | -- | const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser' |
| `OPEN_ROUTE_FROM_DROP` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_FROM_DROP` | -- | const OPEN_ROUTE_FROM_DROP: OpenRoute = 'drop' |
| `OPEN_ROUTE_REOPEN` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_REOPEN` | -- | const OPEN_ROUTE_REOPEN: OpenRoute = 'reopen' |
| `openDocumentIntoHold` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#openDocumentIntoHold` | -- | async function openDocumentIntoHold( hands: DocumentFileFlowHands, flow: Pick<DocumentFileFlow, 'askHowToOpen' \| 'askWhichFileToTakeFrom'>, store: FileStore ... |
| `takeInHandedDocument` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#takeInHandedDocument` | -- | async function takeInHandedDocument( hands: DocumentFileFlowHands, flow: Pick<DocumentFileFlow, 'askHowToOpen' \| 'askWhichFileToTakeFrom'>, incoming: Documen... |
| `drainFieldEditNotices` | file only | function | `src/framework/single-html-shell/field-entry.ts#drainFieldEditNotices` | -- | function drainFieldEditNotices(hands: FieldEntryHands, frame: FrameValues \| null): void |
| `FIELD_ROW_OF_IN_PLACE_TARGET` | file only | const | `src/framework/single-html-shell/field-entry.ts#FIELD_ROW_OF_IN_PLACE_TARGET` | -- | const FIELD_ROW_OF_IN_PLACE_TARGET: Readonly<Record<InPlaceKind, string>> = |
| `FieldEntryHands` | file only | type | `src/framework/single-html-shell/field-entry.ts#FieldEntryHands` | -- | type FieldEntryHands = Pick< |
| `FieldFocusRetries` | file only | type | `src/framework/single-html-shell/field-entry.ts#FieldFocusRetries` | -- | type FieldFocusRetries = ReturnType<typeof fieldFocusRetriesOf> |
| `fieldFocusRetriesOf` | file only | function | `src/framework/single-html-shell/field-entry.ts#fieldFocusRetriesOf` | -- | function fieldFocusRetriesOf(hands: FieldEntryHands) |
| `isEditingField` | file only | function | `src/framework/single-html-shell/field-entry.ts#isEditingField` | -- | function isEditingField(hands: FieldEntryHands): boolean |
| `isFieldFocusWanted` | file only | function | `src/framework/single-html-shell/field-entry.ts#isFieldFocusWanted` | -- | function isFieldFocusWanted(hands: FieldEntryHands): boolean |
| `isNamingCreatedTaskIn` | file only | function | `src/framework/single-html-shell/field-entry.ts#isNamingCreatedTaskIn` | -- | function isNamingCreatedTaskIn(session: ScreenSession): boolean |
| `noteChoiceMoved` | file only | function | `src/framework/single-html-shell/field-entry.ts#noteChoiceMoved` | -- | function noteChoiceMoved(hands: FieldEntryHands, frame: FrameValues \| null): void |
| `spendFieldCommit` | file only | function | `src/framework/single-html-shell/field-entry.ts#spendFieldCommit` | -- | function spendFieldCommit(hands: FieldEntryHands, frame: FrameValues): boolean |
| `tryWantedFieldBeforeInput` | file only | function | `src/framework/single-html-shell/field-entry.ts#tryWantedFieldBeforeInput` | -- | function tryWantedFieldBeforeInput( hands: FieldEntryHands, fieldFocusRetries: Pick<FieldFocusRetries, 'focusWantedField'>, input: HumanInput, ): void |
| `FrameClockWakes` | file only | type | `src/framework/single-html-shell/frame-clock-wakes.ts#FrameClockWakes` | -- | type FrameClockWakes = ReturnType<typeof frameClockWakesOf> |
| `FrameClockWakesHands` | file only | type | `src/framework/single-html-shell/frame-clock-wakes.ts#FrameClockWakesHands` | -- | type FrameClockWakesHands = Pick< |
| `frameClockWakesOf` | file only | function | `src/framework/single-html-shell/frame-clock-wakes.ts#frameClockWakesOf` | -- | function frameClockWakesOf(hands: FrameClockWakesHands) |
| `repeatTimesOfHeldEntry` | file only | function | `src/framework/single-html-shell/frame-clock-wakes.ts#repeatTimesOfHeldEntry` | -- | function repeatTimesOfHeldEntry(): RepeatTimes |
| `AGENT_DOCUMENT_HANDED` | file only | const | `src/framework/single-html-shell/frame-loop.ts#AGENT_DOCUMENT_HANDED` | -- | const AGENT_DOCUMENT_HANDED: SessionEvent = { type: 'agentDocumentHanded' } |
| `AgentApiSeams` | file only | type | `src/framework/single-html-shell/frame-loop.ts#AgentApiSeams` | -- | type AgentApiSeams = Omit<AgentApiWiring, 'writerName' \| 'schemaVersion'> |
| `CHOICE_MOVED` | file only | const | `src/framework/single-html-shell/frame-loop.ts#CHOICE_MOVED` | -- | const CHOICE_MOVED: SessionEvent = { type: 'choiceMoved' } |
| `CONFIRMATION_MANNER` | file only | const | `src/framework/single-html-shell/frame-loop.ts#CONFIRMATION_MANNER` | -- | const CONFIRMATION_MANNER = 'NT-7' |
| `ConfirmationQuestion` | file only | type | `src/framework/single-html-shell/frame-loop.ts#ConfirmationQuestion` | -- | type ConfirmationQuestion = FileFlowQuestion['question'] |
| `discardQuestionOf` | file only | function | `src/framework/single-html-shell/frame-loop.ts#discardQuestionOf` | -- | function discardQuestionOf(discarded: Document): FileFlowQuestion |
| `DOCUMENT_FILE_WRITE_ENDED` | file only | const | `src/framework/single-html-shell/frame-loop.ts#DOCUMENT_FILE_WRITE_ENDED` | -- | const DOCUMENT_FILE_WRITE_ENDED: SessionEvent = { type: 'documentFileWriteEnded' } |
| `DOCUMENT_OPEN_FAILED` | file only | const | `src/framework/single-html-shell/frame-loop.ts#DOCUMENT_OPEN_FAILED` | -- | const DOCUMENT_OPEN_FAILED: SessionEvent = { type: 'documentOpenFailed' } |
| `dualCursorFollowingIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#dualCursorFollowingIn` | -- | function dualCursorFollowingIn(session: ScreenSession): DualCursorSide \| null |
| `EDITED_BY_SCREEN` | file only | const | `src/framework/single-html-shell/frame-loop.ts#EDITED_BY_SCREEN` | -- | const EDITED_BY_SCREEN = 'user' |
| `ENTRY_REPEAT_TIME_ELAPSED` | file only | const | `src/framework/single-html-shell/frame-loop.ts#ENTRY_REPEAT_TIME_ELAPSED` | -- | const ENTRY_REPEAT_TIME_ELAPSED: SessionEvent = { type: 'entryRepeatTimeElapsed' } |
| `EXPORT_CHOOSER_SURFACE` | file only | const | `src/framework/single-html-shell/frame-loop.ts#EXPORT_CHOOSER_SURFACE` | -- | const EXPORT_CHOOSER_SURFACE = 'Export Chooser' |
| `FIELD_FOCUS_WITHDRAWING_KEYS` | file only | const | `src/framework/single-html-shell/frame-loop.ts#FIELD_FOCUS_WITHDRAWING_KEYS` | -- | const FIELD_FOCUS_WITHDRAWING_KEYS: ReadonlySet<string> = new Set([ESCAPE_KEY, 'Tab']) |
| `FIELD_FOCUS_WITHDRAWN` | file only | const | `src/framework/single-html-shell/frame-loop.ts#FIELD_FOCUS_WITHDRAWN` | -- | const FIELD_FOCUS_WITHDRAWN: SessionEvent = { type: 'fieldFocusWithdrawn' } |
| `FOCUS_ON_DOCUMENT_BODY` | file only | const | `src/framework/single-html-shell/interaction-record.ts#FOCUS_ON_DOCUMENT_BODY` | -- | const FOCUS_ON_DOCUMENT_BODY = 'body' |
| `FrameEnvironment` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameEnvironment` | -- | interface FrameEnvironment |
| `FrameLoop` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameLoop` | -- | interface FrameLoop |
| `frameLoop` | file only | function | `src/framework/single-html-shell/frame-loop.ts#frameLoop` | -- | function frameLoop( surface: SvgSurface, first: Document, env: FrameEnvironment, screen?: ScreenWiring, files?: FileStore, showPointerShape?: ShowPointerShap... |
| `FrameLoopHands` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameLoopHands` | -- | interface FrameLoopHands |
| `FrameValues` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameValues` | -- | interface FrameValues |
| `FullScreenHost` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FullScreenHost` | -- | interface FullScreenHost |
| `GREATEST_KNOWN_SCHEMA_VERSION` | file only | const | `src/framework/single-html-shell/frame-loop.ts#GREATEST_KNOWN_SCHEMA_VERSION` | -- | const GREATEST_KNOWN_SCHEMA_VERSION: string = startupTemplate.schemaVersion |
| `HandedImport` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#HandedImport` | -- | interface HandedImport |
| `HEIGHT_CEILING_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#HEIGHT_CEILING_REASON` | -- | const HEIGHT_CEILING_REASON: NoticeReason = 'RS-43' |
| `HeldDocumentCall` | file only | type | `src/framework/single-html-shell/frame-loop.ts#HeldDocumentCall` | -- | type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-6' }> |
| `HISTORY_LIMITS` | file only | const | `src/framework/single-html-shell/frame-loop.ts#HISTORY_LIMITS` | -- | const HISTORY_LIMITS: HistoryLimits = |
| `isQuestionAskedIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isQuestionAskedIn` | -- | function isQuestionAskedIn(session: ScreenSession): boolean |
| `isSameEnvironment` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSameEnvironment` | -- | function isSameEnvironment(one: FrameEnvironment, other: FrameEnvironment): boolean |
| `isSizeSettled` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSizeSettled` | -- | function isSizeSettled(env: FrameEnvironment): boolean |
| `MergeCandidateLine` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeCandidateLine` | -- | type MergeCandidateLine = NonNullable<ScreenViewReadings['mergeCandidates']>[number] |
| `MergeChoices` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeChoices` | -- | type MergeChoices = NonNullable<Parameters<typeof importDocument>[0]['merge']> |
| `MergeMapping` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeMapping` | -- | type MergeMapping = NonNullable<MergeChoices['mapping']> |
| `NOT_STORED_PROPERTIES_PANEL_SIZES` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOT_STORED_PROPERTIES_PANEL_SIZES` | -- | const NOT_STORED_PROPERTIES_PANEL_SIZES: |
| `NOT_STORED_SCROLLBAR_SIZES` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOT_STORED_SCROLLBAR_SIZES` | -- | const NOT_STORED_SCROLLBAR_SIZES: |
| `NOTHING_TO_DO_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOTHING_TO_DO_REASON` | -- | const NOTHING_TO_DO_REASON: NoticeReason = 'RS-27' |
| `NOTICE_REASON_OF_RASTER_FAULT` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOTICE_REASON_OF_RASTER_FAULT` | -- | const NOTICE_REASON_OF_RASTER_FAULT: Readonly<Record<RasterFaultReason, NoticeReason>> = |
| `NoticeReason` | file only | type | `src/framework/single-html-shell/frame-loop.ts#NoticeReason` | -- | type NoticeReason = \| 'RS-1' \| 'RS-2' \| 'RS-3' \| 'RS-4' \| 'RS-5' \| 'RS-6' \| 'RS-7' \| 'RS-8' \| 'RS-9' \| 'RS-10' \| 'RS-11' |
| `noWorkingWeekdayReason` | file only | function | `src/framework/single-html-shell/frame-loop.ts#noWorkingWeekdayReason` | -- | function noWorkingWeekdayReason(document: Document): StartupNoticeReason \| null |
| `OPEN_CHOOSER_SURFACE` | file only | const | `src/framework/single-html-shell/frame-loop.ts#OPEN_CHOOSER_SURFACE` | -- | const OPEN_CHOOSER_SURFACE = 'Open Chooser' |
| `openSurfaceNameIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#openSurfaceNameIn` | -- | function openSurfaceNameIn(session: ScreenSession): string \| null |
| `panelShowingIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#panelShowingIn` | -- | function panelShowingIn(session: ScreenSession): PanelShowing |
| `PointerFacing` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerFacing` | -- | type PointerFacing = 'start' \| 'end' |
| `pointerImageOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pointerImageOf` | -- | function pointerImageOf( row: PointerRow, facing: PointerFacing = 'start', |
| `PointerRow` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerRow` | -- | type PointerRow = \| 'PK-1' \| 'PK-3' \| 'PK-4' \| 'PK-5' \| 'PK-7' \| 'PK-8' \| 'PK-9' \| 'PK-10' // see T-266, T-269 export type PointerFacing = 'start' \| 'end' |
| `pointerRowOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pointerRowOf` | -- | function pointerRowOf(hit: Grabbed \| null, armed: boolean): PointerRow \| null |
| `PointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerShape` | -- | type PointerShape = \| 'default' \| 'copy' \| 'grabbing' \| 'grab' \| 'pointer' \| 'col-resize' \| DrawnPointer export type ShowPointerShape = (shape: PointerShape ... |
| `readInstantOfWrite` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readInstantOfWrite` | -- | function readInstantOfWrite(): string |
| `readMonotonicMs` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readMonotonicMs` | -- | function readMonotonicMs(): number |
| `readToday` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readToday` | -- | function readToday(): string |
| `ScreenWiring` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#ScreenWiring` | -- | interface ScreenWiring |
| `SEAM_ABSENT_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#SEAM_ABSENT_REASON` | -- | const SEAM_ABSENT_REASON: NoticeReason = 'RS-3' |
| `selectedObjectsIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#selectedObjectsIn` | -- | function selectedObjectsIn(session: ScreenSession): Selection |
| `ShowPointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#ShowPointerShape` | -- | type ShowPointerShape = (shape: PointerShape \| null) => void |
| `STACK_SAFETY_CAP_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#STACK_SAFETY_CAP_REASON` | -- | const STACK_SAFETY_CAP_REASON: NoticeReason = 'RS-24' |
| `standingNoticesIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#standingNoticesIn` | -- | function standingNoticesIn(session: ScreenSession): readonly StandingNotice[] |
| `StartupNoticeReason` | file only | type | `src/framework/single-html-shell/frame-loop.ts#StartupNoticeReason` | -- | type StartupNoticeReason = Extract< |
| `WATERMARK_UNLOCK_DIGEST` | file only | const | `src/framework/single-html-shell/watermark-unlock.ts#WATERMARK_UNLOCK_DIGEST` | -- | const WATERMARK_UNLOCK_DIGEST: |
| `WATERMARK_UNLOCK_ROW` | file only | const | `src/framework/single-html-shell/frame-loop.ts#WATERMARK_UNLOCK_ROW` | -- | const WATERMARK_UNLOCK_ROW = 'U-60' |
| `HeldPressPreviewHands` | file only | type | `src/framework/single-html-shell/held-press-preview.ts#HeldPressPreviewHands` | -- | type HeldPressPreviewHands = Pick<FrameLoopHands, 'readSession' \| 'readHeld' \| 'readValues' \| 'settingsLimitsOf'> |
| `marqueeRect` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#marqueeRect` | -- | function marqueeRect( press: PointerPress \| null, at: Point \| null, ): ScreenRect \| null |
| `previewOfHeldPress` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#previewOfHeldPress` | -- | function previewOfHeldPress( hands: HeldPressPreviewHands, press: PointerPress \| null, at: Point \| null, context: InputContext, frame: FrameValues, ): Docume... |
| `tentativeDependencyOf` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#tentativeDependencyOf` | -- | function tentativeDependencyOf( hands: HeldPressPreviewHands, press: PointerPress \| null, at: Point \| null, document: Document, settings: DocumentSettings, l... |
| `InteractionRecorder` | file only | interface | `src/framework/single-html-shell/interaction-record.ts#InteractionRecorder` | -- | interface InteractionRecorder |
| `interactionRecorderOf` | file only | function | `src/framework/single-html-shell/interaction-record.ts#interactionRecorderOf` | -- | function interactionRecorderOf(hands: InteractionRecordHands): InteractionRecorder |
| `InteractionRecordHands` | file only | type | `src/framework/single-html-shell/interaction-record.ts#InteractionRecordHands` | -- | type InteractionRecordHands = Pick<FrameLoopHands, 'readSession' \| 'readEnvironment' \| 'screen' \| 'clipboard'> |
| `isRecordingInteractionsIn` | file only | function | `src/framework/single-html-shell/interaction-record.ts#isRecordingInteractionsIn` | -- | function isRecordingInteractionsIn(session: ScreenSession): boolean |
| `recordFrame` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordFrame` | -- | function recordFrame( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine' \| 'isPaletteMinimisedWhileHidden'>, svg: string... |
| `recordHappening` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordHappening` | -- | function recordHappening( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine'>, input: HumanInput, ): void |
| `recordLine` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordLine` | -- | function recordLine( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine'>, what: string, detail: string, ): void |
| `Grabbed` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#Grabbed` | -- | type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>> |
| `GrabbedArea` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#GrabbedArea` | -- | type GrabbedArea = Grabbed['grab'] |
| `PointerShapeHands` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerShapeHands` | -- | type PointerShapeHands = Pick<FrameLoopHands, 'readPressed' \| 'readSession'> |
| `PressedPointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PressedPointerShape` | -- | type PressedPointerShape = ReturnType<typeof pressedPointerShapeOf> |
| `pressedPointerShapeOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pressedPointerShapeOf` | -- | function pressedPointerShapeOf(hands: PointerShapeHands) |
| `RowBandCeilingCache` | file only | type | `src/framework/single-html-shell/row-band-ceiling-cache.ts#RowBandCeilingCache` | -- | type RowBandCeilingCache = ReturnType<typeof rowBandCeilingCacheOf> |
| `rowBandCeilingCacheOf` | file only | function | `src/framework/single-html-shell/row-band-ceiling-cache.ts#rowBandCeilingCacheOf` | -- | function rowBandCeilingCacheOf() |
| `EffectRunner` | file only | type | `src/framework/single-html-shell/session-effects.ts#EffectRunner` | -- | type EffectRunner<E> = (effect: E, frame: FrameValues \| null) => void |
| `EffectRunners` | file only | type | `src/framework/single-html-shell/session-effects.ts#EffectRunners` | -- | type EffectRunners<E extends { readonly type: string }> = |
| `runSessionEffects` | file only | function | `src/framework/single-html-shell/session-effects.ts#runSessionEffects` | -- | function runSessionEffects( effects: readonly SessionEffect[], runners: EffectRunners<SessionEffect>, frame: FrameValues \| null, ): void |
| `unwiredEffect` | file only | function | `src/framework/single-html-shell/session-effects.ts#unwiredEffect` | -- | function unwiredEffect(effect: { readonly type: string }): never |
| `HeldViewPlace` | file only | type | `src/framework/single-html-shell/view-place.ts#HeldViewPlace` | -- | type HeldViewPlace = ReturnType<typeof heldViewPlaceOf> |
| `heldViewPlaceOf` | file only | function | `src/framework/single-html-shell/view-place.ts#heldViewPlaceOf` | -- | function heldViewPlaceOf( hands: ViewPlaceHands, startedFromTemplate: boolean \| undefined, ) |
| `ViewPlaceHands` | file only | type | `src/framework/single-html-shell/view-place.ts#ViewPlaceHands` | -- | type ViewPlaceHands = Pick<FrameLoopHands, 'readEnvironment'> |
| `answerWatermarkUnlock` | file only | function | `src/framework/single-html-shell/watermark-unlock.ts#answerWatermarkUnlock` | -- | function answerWatermarkUnlock(hands: WatermarkUnlockHands, isProceeding: boolean): boolean |
| `matchWatermarkUnlock` | file only | function | `src/framework/single-html-shell/watermark-unlock.ts#matchWatermarkUnlock` | -- | async function matchWatermarkUnlock(hands: WatermarkUnlockHands, answer: string): Promise<void> |
| `WatermarkUnlockHands` | file only | type | `src/framework/single-html-shell/watermark-unlock.ts#WatermarkUnlockHands` | -- | type WatermarkUnlockHands = Pick<FrameLoopHands, 'readSession' \| 'readValues' \| 'sendToSession' \| 'ask'> |

## DomSvgSurface (PI-26, `src/framework/dom-svg-surface/dom-svg-surface.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `domSvgSurface` | entry | function | `src/framework/dom-svg-surface/dom-svg-surface.ts#domSvgSurface` | PI-26 | `SvgSurface` の実装 1 つを返す |

## DomInputSource (PI-27, `src/framework/dom-input-source/dom-input-source.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `domInputSource` | entry | function | `src/framework/dom-input-source/dom-input-source.ts#domInputSource` | PI-27 | `InputSource` の実装 1 つを返す |
| `InputHost` | entry | interface | `src/framework/dom-input-source/dom-input-source.ts#InputHost` | -- | interface InputHost |
| `PointerCaptureTarget` | entry | interface | `src/framework/dom-input-source/dom-input-source.ts#PointerCaptureTarget` | -- | interface PointerCaptureTarget |

## FileSystemAccessFileStore (PI-28, `src/framework/file-system-access-file-store/file-system-access-file-store.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `DropData` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DropData` | -- | interface DropData |
| `DropEvent` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DropEvent` | -- | interface DropEvent |
| `DroppedHandle` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DroppedHandle` | -- | type DroppedHandle = FileHandle \| { readonly kind: 'directory' } |
| `DroppedItem` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DroppedItem` | -- | interface DroppedItem |
| `DroppedItems` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DroppedItems` | -- | interface DroppedItems |
| `DropSurface` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#DropSurface` | -- | interface DropSurface |
| `FileHandle` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#FileHandle` | -- | interface FileHandle |
| `FilePermissionState` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#FilePermissionState` | -- | type FilePermissionState = 'granted' \| 'denied' \| 'prompt' |
| `FileSystemAccessEnvironment` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#FileSystemAccessEnvironment` | -- | interface FileSystemAccessEnvironment |
| `fileSystemAccessFileStore` | entry | function | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#fileSystemAccessFileStore` | PI-28 | `FileStore` の実装 1 つを返す |
| `OpenFilePicker` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#OpenFilePicker` | -- | type OpenFilePicker = (options: |
| `ReadableFile` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#ReadableFile` | -- | interface ReadableFile |
| `SaveFilePicker` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#SaveFilePicker` | -- | type SaveFilePicker = (options: |
| `SaveFileType` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#SaveFileType` | -- | interface SaveFileType |
| `WritableFileStream` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#WritableFileStream` | -- | interface WritableFileStream |

## BrowserClipboard (PI-30, `src/framework/browser-clipboard/browser-clipboard.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `browserClipboard` | entry | function | `src/framework/browser-clipboard/browser-clipboard.ts#browserClipboard` | PI-30 | `Clipboard` の実装 1 つを返す |

## CanvasRasterizer (PI-31, `src/framework/canvas-rasterizer/canvas-rasterizer.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `canvasRasterizer` | entry | function | `src/framework/canvas-rasterizer/canvas-rasterizer.ts#canvasRasterizer` | PI-31 | `Rasterizer` の実装 1 つを返す |

## Selection (PI-32, `src/entity/document-model/selection/selection.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `emptySelection` | entry | function | `src/entity/document-model/selection/selection.ts#emptySelection` | PI-32 | function emptySelection(): Selection |
| `isSameItem` | entry | function | `src/entity/document-model/selection/selection.ts#isSameItem` | -- | function isSameItem(a: ItemRef, b: ItemRef): boolean |
| `isSelected` | entry | function | `src/entity/document-model/selection/selection.ts#isSelected` | PI-32 | function isSelected(selection: Selection, item: ItemRef): boolean |
| `ItemRef` | entry | type | `src/entity/document-model/selection/selection.ts#ItemRef` | -- | type ItemRef = \| { readonly kind: 'task'; readonly uid: number } \| { readonly kind: 'dependency'; readonly successorUid: number; readonly ordinal: number } \|... |
| `lastPicked` | entry | function | `src/entity/document-model/selection/selection.ts#lastPicked` | -- | function lastPicked(selection: Selection): ItemRef \| null |
| `SelectableKind` | entry | type | `src/entity/document-model/selection/selection.ts#SelectableKind` | -- | type SelectableKind = \| 'task' \| 'dependency' \| 'highlightBox' \| 'commentBox' \| 'statusLine' export type ItemRef = \| { readonly kind: 'task'; readonly uid: n... |
| `Selection` | entry | interface | `src/entity/document-model/selection/selection.ts#Selection` | PI-32 | 型。 |
| `selectionOfAll` | entry | function | `src/entity/document-model/selection/selection.ts#selectionOfAll` | -- | function selectionOfAll(items: readonly ItemRef[]): Selection |
| `selectionWith` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWith` | PI-32 | function selectionWith(selection: Selection, item: ItemRef): Selection |
| `selectionWithinSchedule` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWithinSchedule` | PI-32 | 文書に無くなった対象を外した選択を答える —— `FR-081` の結びの「文書に実在する対象だけを指すこと」。 |
| `selectionWithout` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWithout` | PI-32 | function selectionWithout(selection: Selection, item: ItemRef): Selection |

## DialogueLog (PI-33, `src/entity/document-model/dialogue-log/dialogue-log.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `DialogueLog` | entry | interface | `src/entity/document-model/dialogue-log/dialogue-log.ts#DialogueLog` | PI-33 | 型。 |
| `DialogueMessage` | entry | interface | `src/entity/document-model/dialogue-log/dialogue-log.ts#DialogueMessage` | -- | interface DialogueMessage |
| `emptyDialogueLog` | entry | function | `src/entity/document-model/dialogue-log/dialogue-log.ts#emptyDialogueLog` | -- | function emptyDialogueLog(): DialogueLog |
| `latestSequence` | entry | function | `src/entity/document-model/dialogue-log/dialogue-log.ts#latestSequence` | -- | function latestSequence(log: DialogueLog): number |
| `logWithMessage` | entry | function | `src/entity/document-model/dialogue-log/dialogue-log.ts#logWithMessage` | PI-33 | 1 件積む |
| `messagesSince` | entry | function | `src/entity/document-model/dialogue-log/dialogue-log.ts#messagesSince` | PI-33 | `AG-6` の選び方 |

## Document (PI-34, `src/entity/document-model/document/document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `Document` | entry | interface | `src/entity/document-model/document/document.ts#Document` | PI-34 | 型。 |
| `DocumentViolation` | entry | interface | `src/entity/document-model/document/document.ts#DocumentViolation` | -- | interface DocumentViolation |
| `documentViolations` | entry | function | `src/entity/document-model/document/document.ts#documentViolations` | PI-34 | `DR-1` に反する箇所 |
| `ROOT_KEYS` | entry | const | `src/entity/document-model/document/document.ts#ROOT_KEYS` | -- | const ROOT_KEYS = [ |

## ScreenRegions (PI-35, `src/entity/layout-engine/screen-regions/screen-regions.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `displayRatioOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#displayRatioOf` | PI-35 | 表示の倍率から描く比を出す。 |
| `drawnSettingsOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#drawnSettingsOf` | PI-35 | 保存値に描く比を 1 度だけ掛けた設定値を返す。 |
| `regionAtPointer` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionAtPointer` | PI-35 | ポインタがどの領域にあるか |
| `RegionName` | entry | type | `src/entity/layout-engine/screen-regions/screen-regions.ts#RegionName` | -- | type RegionName = keyof ScreenRegions \| null |
| `regionsAtDisplayScale` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionsAtDisplayScale` | PI-35 | 与えた表示の倍率で描いたときの各部の矩形。 |
| `regionsFromScreen` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionsFromScreen` | PI-35 | 画面の寸法と `DocumentSettings` から各部の矩形を出す |
| `rowControlLatticeHeightPx` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#rowControlLatticeHeightPx` | PI-35 | 行の操作子の格子（表 T-051 の `HF-1`）を描いたときに縦に取る高さ。 |
| `ScreenEnvironment` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenEnvironment` | -- | interface ScreenEnvironment |
| `ScreenRect` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenRect` | PI-35 | 型。 |
| `ScreenRegions` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenRegions` | PI-35 | 型。 |

## ScreenState (PI-36, `src/entity/document-model/screen-state/screen-state.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `DualCursorSide` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#DualCursorSide` | PI-36 | 型。 |
| `EscapeContext` | entry | interface | `src/entity/document-model/screen-state/screen-state.ts#EscapeContext` | PI-36 | 型。 |
| `EscapeTarget` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#EscapeTarget` | PI-36 | 型。 |
| `escapeTarget` | entry | function | `src/entity/document-model/screen-state/screen-state.ts#escapeTarget` | PI-36 | `EscapeContext` だけから、`Esc` が次に消費する段を答える。 |
| `RememberedActual` | entry | interface | `src/entity/document-model/screen-state/screen-state.ts#RememberedActual` | PI-36 | 型。 |

## ScreenRenderer (PI-37, `src/adapter/screen-renderer/screen-renderer.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AiExportModal` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#AiExportModal` | -- | interface AiExportModal extends OpenSurface |
| `AppHeaderItems` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#AppHeaderItems` | -- | interface AppHeaderItems |
| `ColourField` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColourField` | -- | interface ColourField |
| `ColourName` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColourName` | -- | interface ColourName |
| `ColourSide` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColourSide` | -- | interface ColourSide |
| `ColourThemeEntry` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColourThemeEntry` | -- | interface ColourThemeEntry |
| `CommandItem` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#CommandItem` | -- | interface CommandItem |
| `CommandPalette` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#CommandPalette` | -- | interface CommandPalette |
| `Confirmation` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Confirmation` | -- | interface Confirmation extends RaisedConfirmation |
| `ConfirmationAnswer` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ConfirmationAnswer` | -- | interface ConfirmationAnswer |
| `ConfirmationItem` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ConfirmationItem` | -- | interface ConfirmationItem |
| `DEFAULT_ROW_NAME` | entry | const | `src/adapter/screen-renderer/screen-renderer.ts#DEFAULT_ROW_NAME` | PI-37 | 行を既定の名前で立てるときの語。 |
| `DialogueField` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#DialogueField` | -- | interface DialogueField |
| `DialogueInput` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#DialogueInput` | -- | interface DialogueInput |
| `dialogueMessageFromInput` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#dialogueMessageFromInput` | PI-37 | 対話欄で確定した発話。 |
| `dismissKeyOf` | entry | function | `src/adapter/screen-renderer/notices.ts#dismissKeyOf` | PI-37 | 表 T-037 の `NT-8` で人が消した告げを名指す鍵 |
| `DisplayLanguage` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#DisplayLanguage` | -- | type DisplayLanguage = 'ja' \| 'en' |
| `displayLanguageOf` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#displayLanguageOf` | -- | function displayLanguageOf(session: ScreenSession): DisplayLanguage |
| `DualCursorReadout` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#DualCursorReadout` | -- | interface DualCursorReadout |
| `ExportChooser` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ExportChooser` | -- | interface ExportChooser extends OpenSurface |
| `ExportFormatChoice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ExportFormatChoice` | -- | interface ExportFormatChoice |
| `ExportFormatId` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#ExportFormatId` | -- | type ExportFormatId = string |
| `FieldCommit` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#FieldCommit` | -- | interface FieldCommit |
| `FieldEditNotice` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#FieldEditNotice` | PI-37 | 型。 |
| `HelpEntry` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpEntry` | -- | interface HelpEntry |
| `HelpModal` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpModal` | -- | interface HelpModal extends OpenSurface |
| `HorizontalWhole` | entry | interface | `src/adapter/screen-renderer/screen-frame.ts#HorizontalWhole` | PI-37 | interface HorizontalWhole |
| `horizontalWholeOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#horizontalWholeOf` | PI-37 | function horizontalWholeOf(layout: ScheduleLayout, regions: ScreenRegions): HorizontalWhole |
| `IconId` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#IconId` | -- | type IconId = string |
| `LinkedWords` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#LinkedWords` | -- | interface LinkedWords |
| `MergeCandidateLine` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#MergeCandidateLine` | -- | interface MergeCandidateLine |
| `Notice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Notice` | -- | interface Notice |
| `OpenModal` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#OpenModal` | -- | type OpenModal = \| HelpModal \| AiExportModal \| ResourceRoster \| ExportChooser \| (OpenSurface & |
| `PaletteGroup` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PaletteGroup` | -- | interface PaletteGroup |
| `PanelDivider` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PanelDivider` | -- | interface PanelDivider |
| `PropertiesPanel` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertiesPanel` | -- | interface PropertiesPanel |
| `PropertyControl` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyControl` | -- | interface PropertyControl |
| `PropertyControlKind` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#PropertyControlKind` | -- | type PropertyControlKind = \| 'text' \| 'multiline' \| 'date' \| 'number' \| 'boolean' \| 'choice' \| 'color' // see CV-9, CV-7 export interface ColourSide |
| `PropertyField` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyField` | -- | interface PropertyField |
| `PropertyFieldKey` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#PropertyFieldKey` | -- | type PropertyFieldKey = \| |
| `RaisedConfirmation` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RaisedConfirmation` | -- | interface RaisedConfirmation |
| `RaisedNotice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RaisedNotice` | -- | interface RaisedNotice |
| `ResourceRoster` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ResourceRoster` | -- | interface ResourceRoster extends OpenSurface |
| `RosterResource` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RosterResource` | -- | interface RosterResource |
| `RowExpander` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RowExpander` | -- | interface RowExpander |
| `RowTitle` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RowTitle` | -- | interface RowTitle |
| `rowTitleFontPxOf` | entry | function | `src/adapter/screen-renderer/row-title-panel.ts#rowTitleFontPxOf` | PI-37 | 行の名前の字の大きさ。 |
| `RowTitlePanel` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RowTitlePanel` | -- | interface RowTitlePanel |
| `rulerWeekdayWords` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#rulerWeekdayWords` | PI-37 | 目盛の第 4 段が刷る曜日 7 語。 |
| `ScreenFrame` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenFrame` | -- | interface ScreenFrame |
| `ScreenPart` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#ScreenPart` | -- | interface ScreenPart |
| `ScreenSurface` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#ScreenSurface` | PI-37 | 表 T-065 |
| `ScreenView` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenView` | PI-37 | 型。 |
| `screenViewFromRegions` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#screenViewFromRegions` | PI-37 | 根の状態（`PI-39` の `ScreenSession`）と `ScreenViewReadings` から `ScreenView` を作る。 |
| `ScreenViewReadings` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenViewReadings` | PI-37 | 型。 |
| `Scrollbar` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Scrollbar` | -- | interface Scrollbar |
| `ScrollExtent` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScrollExtent` | -- | interface ScrollExtent |
| `scrollExtentOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#scrollExtentOf` | PI-37 | 配置と各部の矩形と全体から `ScreenViewReadings` のスクロールの範囲を答える。 |
| `Tooltip` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Tooltip` | -- | interface Tooltip |
| `TooltipAnchor` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#TooltipAnchor` | -- | type TooltipAnchor = \| { readonly kind: 'icon'; readonly icon: IconId } \| { readonly kind: 'task'; readonly taskUid: number } \| { readonly kind: 'rowTitle'; ... |
| `VerticalWhole` | entry | interface | `src/adapter/screen-renderer/screen-frame.ts#VerticalWhole` | PI-37 | 型。 |
| `verticalWholeOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#verticalWholeOf` | PI-37 | つまみが表す全体を配置と各部の矩形から測る —— `GR-21` の「内容の範囲といま見えている範囲の和」。 |
| `appHeaderItemsFromDocument` | file only | function | `src/adapter/screen-renderer/app-header-items.ts#appHeaderItemsFromDocument` | -- | function appHeaderItemsFromDocument( schedule: Schedule, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): AppHeaderItems |
| `displayScaleMessageText` | file only | function | `src/adapter/screen-renderer/app-header-items.ts#displayScaleMessageText` | -- | function displayScaleMessageText( displayScale: number, end: 'max' \| 'min' \| null, language: DisplayLanguage, ): string |
| `commandPaletteFromSession` | file only | function | `src/adapter/screen-renderer/command-palette.ts#commandPaletteFromSession` | -- | function commandPaletteFromSession( session: ScreenSession, settings: DocumentSettings, selection: Selection, readings: ScreenViewReadings, schedule?: Schedu... |
| `NOT_STORED_COMMAND_PALETTE_SIZES` | file only | const | `src/adapter/screen-renderer/command-palette.ts#NOT_STORED_COMMAND_PALETTE_SIZES` | -- | const NOT_STORED_COMMAND_PALETTE_SIZES: |
| `dialogueFieldFromLog` | file only | function | `src/adapter/screen-renderer/dialogue-field.ts#dialogueFieldFromLog` | -- | function dialogueFieldFromLog( log: DialogueLog, session: ScreenSession, readings: ScreenViewReadings, ): DialogueField \| null |
| `confirmationAnswers` | file only | function | `src/adapter/screen-renderer/notices.ts#confirmationAnswers` | -- | function confirmationAnswers(language: DisplayLanguage): readonly ConfirmationAnswer[] |
| `confirmationFromSession` | file only | function | `src/adapter/screen-renderer/notices.ts#confirmationFromSession` | -- | function confirmationFromSession( session: ScreenSession, readings: ScreenViewReadings, ): Confirmation \| null |
| `noticesFromSession` | file only | function | `src/adapter/screen-renderer/notices.ts#noticesFromSession` | -- | function noticesFromSession( session: ScreenSession, readings: ScreenViewReadings, ): readonly Notice[] |
| `reasonNextStepLink` | file only | function | `src/adapter/screen-renderer/notices.ts#reasonNextStepLink` | -- | function reasonNextStepLink(reason: string, language: DisplayLanguage): LinkedWords \| null |
| `reasonSurfaceWords` | file only | function | `src/adapter/screen-renderer/notices.ts#reasonSurfaceWords` | -- | function reasonSurfaceWords( reason: string, language: DisplayLanguage, ): { readonly text: string; readonly nextStep: string; readonly dismissText: string } |
| `openModalFromSession` | file only | function | `src/adapter/screen-renderer/open-modals.ts#openModalFromSession` | -- | function openModalFromSession( session: ScreenSession, schedule: Schedule, readings: ScreenViewReadings, ): OpenModal \| null |
| `NOT_STORED_PROPERTY_CONTROL_SIZES` | file only | const | `src/adapter/screen-renderer/properties-panel.ts#NOT_STORED_PROPERTY_CONTROL_SIZES` | -- | const NOT_STORED_PROPERTY_CONTROL_SIZES: |
| `propertiesPanelFromSelection` | file only | function | `src/adapter/screen-renderer/properties-panel.ts#propertiesPanelFromSelection` | -- | function propertiesPanelFromSelection( schedule: Schedule, settings: DocumentSettings, selection: Selection, session: ScreenSession, readings: ScreenViewRead... |
| `NOT_STORED_ROW_CONTROL_SIZES` | file only | const | `src/adapter/screen-renderer/row-title-panel.ts#NOT_STORED_ROW_CONTROL_SIZES` | -- | const NOT_STORED_ROW_CONTROL_SIZES: |
| `rowTitlePanelFromSchedule` | file only | function | `src/adapter/screen-renderer/row-title-panel.ts#rowTitlePanelFromSchedule` | -- | function rowTitlePanelFromSchedule( schedule: Schedule, storedSettings: DocumentSettings, _selection: Selection, _session: ScreenSession, readings: ScreenVie... |
| `NOT_STORED_PANEL_DIVIDER_SIZES` | file only | const | `src/adapter/screen-renderer/screen-frame.ts#NOT_STORED_PANEL_DIVIDER_SIZES` | -- | const NOT_STORED_PANEL_DIVIDER_SIZES: |
| `screenFrameFromRegions` | file only | function | `src/adapter/screen-renderer/screen-frame.ts#screenFrameFromRegions` | -- | function screenFrameFromRegions( regions: ScreenRegions, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): ScreenFrame |
| `dualCursorReadoutOf` | file only | function | `src/adapter/screen-renderer/tooltips.ts#dualCursorReadoutOf` | -- | function dualCursorReadoutOf( regions: ScreenRegions, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): DualCursorReadout ... |
| `tooltipsFromScreenView` | file only | function | `src/adapter/screen-renderer/tooltips.ts#tooltipsFromScreenView` | -- | function tooltipsFromScreenView( shown: Omit<ScreenView, 'tooltips'>, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): re... |

## DomScreenSurface (PI-38, `src/framework/dom-screen-surface/dom-screen-surface.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `anchoredEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#anchoredEntry` | -- | function anchoredEntry( host: Document, item: CommandItem, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `anchorKey` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#anchorKey` | -- | function anchorKey(anchor: TooltipAnchor): string |
| `appendAssignment` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#appendAssignment` | -- | function appendAssignment( host: Document, target: HTMLElement, written: string, wrapsWords: boolean, ): void |
| `boxStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#boxStyle` | -- | function boxStyle(box: ScreenRect): string |
| `chromeScaledPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#chromeScaledPx` | -- | function chromeScaledPx(px: number): number |
| `commandEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#commandEntry` | -- | function commandEntry(host: Document, item: CommandItem): HTMLElement |
| `CONFIRMATION_ANSWER_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#CONFIRMATION_ANSWER_ATTRIBUTE` | -- | const CONFIRMATION_ANSWER_ATTRIBUTE = 'data-confirmation-answer' |
| `domScreenSurface` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#domScreenSurface` | -- | function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface |
| `entranceBorderPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceBorderPx` | -- | function entranceBorderPx(): number |
| `entranceGapPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceGapPx` | -- | function entranceGapPx(gapRow: EntranceGapRow = 'S-141'): number |
| `entranceOuterHeightPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceOuterHeightPx` | -- | function entranceOuterHeightPx(gapRow: EntranceGapRow = 'S-141'): number |
| `entranceOuterWidthPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceOuterWidthPx` | -- | function entranceOuterWidthPx(gapRow: EntranceGapRow = 'S-141'): number |
| `entranceStateFill` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceStateFill` | -- | function entranceStateFill(standing: readonly EntranceStateRow[]): string |
| `entryFaintStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entryFaintStyle` | -- | function entryFaintStyle(gapRow: EntranceGapRow = 'S-141'): string |
| `entryStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entryStyle` | -- | function entryStyle(gapRow: EntranceGapRow = 'S-141'): string |
| `fillEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#fillEntry` | -- | function fillEntry( host: Document, entry: HTMLElement, icon: string, aroundTheShape = '', |
| `HOST_ENTER` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#HOST_ENTER` | -- | const HOST_ENTER = 'Enter' |
| `IMPORT_REPORT_DISMISS_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#IMPORT_REPORT_DISMISS_ATTRIBUTE` | -- | const IMPORT_REPORT_DISMISS_ATTRIBUTE = 'data-import-report-dismiss' |
| `made` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#made` | -- | function made(host: Document, tag: string, style: string): HTMLElement |
| `NOT_STORED_CONFIRMATION_RULE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_CONFIRMATION_RULE_SIZES` | -- | const NOT_STORED_CONFIRMATION_RULE_SIZES: |
| `NOT_STORED_DOCUMENT_TITLE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_DOCUMENT_TITLE_SIZES` | -- | const NOT_STORED_DOCUMENT_TITLE_SIZES: |
| `NOT_STORED_HELP_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_HELP_SIZES` | -- | const NOT_STORED_HELP_SIZES: |
| `NOT_STORED_ICON_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ICON_SIZES` | -- | const NOT_STORED_ICON_SIZES: |
| `NOT_STORED_PALETTE_GROUP_RULE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_PALETTE_GROUP_RULE_SIZES` | -- | const NOT_STORED_PALETTE_GROUP_RULE_SIZES: |
| `NOT_STORED_PROPERTY_FIELD_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_PROPERTY_FIELD_SIZES` | -- | const NOT_STORED_PROPERTY_FIELD_SIZES: |
| `NOT_STORED_RESOURCE_ROSTER_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_RESOURCE_ROSTER_SIZES` | -- | const NOT_STORED_RESOURCE_ROSTER_SIZES: |
| `NOT_STORED_ROW_BAND_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ROW_BAND_SIZES` | -- | const NOT_STORED_ROW_BAND_SIZES: |
| `NOT_STORED_ROW_CONTROL_EDGE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ROW_CONTROL_EDGE_SIZES` | -- | const NOT_STORED_ROW_CONTROL_EDGE_SIZES: |
| `NOT_STORED_ROW_GRAB_STRIP_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ROW_GRAB_STRIP_SIZES` | -- | const NOT_STORED_ROW_GRAB_STRIP_SIZES: |
| `NOTICE_DISMISS_KEY_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOTICE_DISMISS_KEY_ATTRIBUTE` | -- | const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice' |
| `pageGroundStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#pageGroundStyle` | PI-38 | 地の色の宣言 |
| `PAINT` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#PAINT` | -- | const PAINT = |
| `part` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#part` | -- | function part(host: Document, tag: string, role: string, style: string): HTMLElement |
| `ROLE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#ROLE` | -- | const ROLE = |
| `ROW_GRAB_STRIP_MARK` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#ROW_GRAB_STRIP_MARK` | -- | const ROW_GRAB_STRIP_MARK = 'data-row-grab' |
| `SCREEN_COLOURS` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCREEN_COLOURS` | -- | const SCREEN_COLOURS: |
| `ScreenSurfaceWiring` | entry | interface | `src/framework/dom-screen-surface/dom-screen-surface.ts#ScreenSurfaceWiring` | -- | interface ScreenSurfaceWiring |
| `ScreenTheme` | entry | interface | `src/framework/dom-screen-surface/dom-screen-surface.ts#ScreenTheme` | PI-38 | （型） —— ⭐ **地を塗るのはシェルである** —— 本コンポーネントの根は日程の上に重なって敷かれており、そこに地を塗ると日程が隠れる。 |
| `SCROLLBAR_AXIS_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCROLLBAR_AXIS_ATTRIBUTE` | -- | const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis' |
| `stateGround` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#stateGround` | -- | function stateGround(paint: string, depthRow: 'S-214' \| 'S-215'): string |
| `STYLE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#STYLE` | -- | const STYLE = |
| `themeStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#themeStyle` | -- | function themeStyle(theme: ScreenTheme): string |
| `appHeaderStyle` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#appHeaderStyle` | -- | function appHeaderStyle(): string |
| `fillAppHeader` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#fillAppHeader` | -- | function fillAppHeader( host: Document, header: HTMLElement, items: AppHeaderItems, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `paletteElement` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteElement` | -- | function paletteElement( host: Document, palette: CommandPalette, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `paletteGroupRuleStyle` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteGroupRuleStyle` | -- | function paletteGroupRuleStyle(): string |
| `dialogueSettlement` | file only | function | `src/framework/dom-screen-surface/dialogue-field-drawing.ts#dialogueSettlement` | -- | function dialogueSettlement( dialogueEntry: HTMLInputElement, readAuthor: () => string, readClockMs: () => number, ) |
| `fillDialogueMessages` | file only | function | `src/framework/dom-screen-surface/dialogue-field-drawing.ts#fillDialogueMessages` | -- | function fillDialogueMessages(host: Document, box: HTMLElement, field: DialogueField): void |
| `placeDialogueField` | file only | function | `src/framework/dom-screen-surface/dialogue-field-drawing.ts#placeDialogueField` | -- | function placeDialogueField(dialogueField: HTMLElement, view: ScreenView): void |
| `CONTROL_KEYS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#CONTROL_KEYS` | -- | const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>() |
| `fieldEditingOf` | file only | function | `src/framework/dom-screen-surface/field-editing.ts#fieldEditingOf` | -- | function fieldEditingOf(host: Document, propertiesPanel: HTMLElement) |
| `TextEntryControl` | file only | interface | `src/framework/dom-screen-surface/field-editing.ts#TextEntryControl` | -- | interface TextEntryControl |
| `TYPED_CONTROLS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#TYPED_CONTROLS` | -- | const TYPED_CONTROLS = new WeakSet<object>() |
| `confirmationAnswerElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#confirmationAnswerElement` | -- | function confirmationAnswerElement( host: Document, answer: Confirmation['answers'][number], ): HTMLElement |
| `confirmationElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#confirmationElement` | -- | function confirmationElement(host: Document, confirmation: Confirmation): HTMLElement |
| `nextStepElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#nextStepElement` | -- | function nextStepElement(host: Document, text: string, link?: LinkedWords \| null): HTMLElement |
| `noticeElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#noticeElement` | -- | function noticeElement(host: Document, notice: Notice): HTMLElement |
| `keepRosterScroll` | file only | function | `src/framework/dom-screen-surface/open-modals-drawing.ts#keepRosterScroll` | -- | function keepRosterScroll(before: Element \| null, after: Element \| null): void |
| `modalElement` | file only | function | `src/framework/dom-screen-surface/open-modals-drawing.ts#modalElement` | -- | function modalElement( host: Document, modal: OpenModal, anchors: Map<string, HTMLElement>, ): DrawnModal |
| `ROSTER_SCROLLER` | file only | const | `src/framework/dom-screen-surface/open-modals-drawing.ts#ROSTER_SCROLLER` | -- | const ROSTER_SCROLLER = '[data-roster-scroller]' |
| `fieldElement` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#fieldElement` | -- | function fieldElement( host: Document, field: PropertyField, typedByRow: Map<string, TextEntryControl> \| null, ): HTMLElement |
| `fillPropertiesPanel` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#fillPropertiesPanel` | -- | function fillPropertiesPanel( host: Document, panel: HTMLElement, description: PropertiesPanel, anchors: Map<string, HTMLElement>, typedByRow: Map<string, Te... |
| `growWrappingFields` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#growWrappingFields` | -- | function growWrappingFields(panel: HTMLElement): void |
| `markPropertiesPanel` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#markPropertiesPanel` | -- | function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void |
| `propertiesPanelStyle` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#propertiesPanelStyle` | -- | function propertiesPanelStyle(): string |
| `ADD_CHILD_ROW_ENTRY` | file only | const | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#ADD_CHILD_ROW_ENTRY` | -- | const ADD_CHILD_ROW_ENTRY = 'IC-91' |
| `DELETE_ROW_ENTRY` | file only | const | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#DELETE_ROW_ENTRY` | -- | const DELETE_ROW_ENTRY = 'IC-82' |
| `fillRowTitleTree` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#fillRowTitleTree` | -- | function fillRowTitleTree( host: Document, tree: HTMLElement, panel: RowTitlePanel, anchors: Map<string, HTMLElement>, ): void |
| `foldedRowCountElement` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#foldedRowCountElement` | -- | function foldedRowCountElement(host: Document, count: number, rightPx: string): HTMLElement |
| `headEntryElements` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#headEntryElements` | -- | function headEntryElements(host: Document) |
| `headFoldedRowCountRight` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#headFoldedRowCountRight` | -- | function headFoldedRowCountRight(): string |
| `markFoldedRowCount` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#markFoldedRowCount` | -- | function markFoldedRowCount(mark: HTMLElement, count: number, rightPx: string): void |
| `markHeadPair` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#markHeadPair` | -- | function markHeadPair(addTopRow: HTMLElement, deleteEveryRow: HTMLElement): void |
| `markPanelCornerEntry` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#markPanelCornerEntry` | -- | function markPanelCornerEntry( entry: HTMLElement, stepsFromEdge: number, canAct: boolean \| undefined, rank = 0, |
| `ROW_CONTROL_GROUND_MARK` | file only | const | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#ROW_CONTROL_GROUND_MARK` | -- | const ROW_CONTROL_GROUND_MARK = 'data-row-control-ground' |
| `rowControlsHeightReporter` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#rowControlsHeightReporter` | -- | function rowControlsHeightReporter( rowTitleTree: HTMLElement, readClockMs: () => number, wiring: Pick<ScreenSurfaceWiring, 'onRowControlsHeightPx'>, ): (mea... |
| `rowControlsMeasureKey` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#rowControlsMeasureKey` | -- | function rowControlsMeasureKey( view: ScreenView, theme: ScreenTheme, headerHeightPx: number, ): string |
| `rowsTopPx` | file only | function | `src/framework/dom-screen-surface/row-title-panel-drawing.ts#rowsTopPx` | -- | function rowsTopPx(panel: RowTitlePanel): number \| null |
| `fillScreenFrame` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#fillScreenFrame` | -- | function fillScreenFrame( host: Document, layer: HTMLElement, bandLayer: HTMLElement, frame: ScreenFrame, anchors: Map<string, HTMLElement>, ): void |
| `horizontalScrollbar` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#horizontalScrollbar` | -- | function horizontalScrollbar(frame: ScreenFrame): ScreenFrame['scrollbars'][number] \| undefined |
| `panelEdge` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#panelEdge` | -- | function panelEdge( frame: ScreenFrame, panel: 'rowTitlePanel' \| 'propertiesPanel', ): ScreenRect \| null |
| `keepTooltipsInside` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#keepTooltipsInside` | -- | function keepTooltipsInside(layer: HTMLElement): void |
| `showDualCursorReadout` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#showDualCursorReadout` | -- | function showDualCursorReadout( host: Document, layer: HTMLElement, readout: ScreenView['dualCursorReadout'], ): void |
| `tooltipAnchorTable` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#tooltipAnchorTable` | -- | function tooltipAnchorTable(root: HTMLElement) |
| `tooltipElement` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#tooltipElement` | -- | function tooltipElement( host: Document, tip: Tooltip, anchorFor: (key: string, anchor: TooltipAnchor) => HTMLElement \| undefined, ): HTMLElement |

## AdvanceScreenSession (PI-39, `src/use-case/advance-screen-session/advance-screen-session.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `advanceScreenSession` | entry | function | `src/use-case/advance-screen-session/advance-screen-session.ts#advanceScreenSession` | PI-39 | 1 段進める。 |
| `ArmKind` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#ArmKind` | PI-39 | 型。 |
| `emptyScreenSession` | entry | const | `src/use-case/advance-screen-session/advance-screen-session.ts#emptyScreenSession` | PI-39 | 初期の状態。 |
| `FileFlowImportAnswer` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowImportAnswer` | PI-39 | 型。 |
| `FileFlowOpenRoute` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOpenRoute` | PI-39 | 型。 |
| `FileFlowOwedAction` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOwedAction` | PI-39 | 型。 |
| `FileFlowQuestion` | entry | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowQuestion` | PI-39 | 型。 |
| `FileFlowSurfaceName` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowSurfaceName` | PI-39 | 型。 |
| `FileFlowWriteForm` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowWriteForm` | PI-39 | 型。 |
| `FileOperationState` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileOperationState` | PI-39 | 型。 |
| `GrabbedRowAxis` | entry | type | `src/use-case/advance-screen-session/gesture-values.ts#GrabbedRowAxis` | PI-39 | 型。 |
| `PressedOn` | entry | type | `src/use-case/advance-screen-session/gesture-values.ts#PressedOn` | PI-39 | 型。 |
| `PropertiesSubject` | entry | interface | `src/use-case/advance-screen-session/screen-values.ts#PropertiesSubject` | PI-39 | 型。 |
| `ScreenSession` | entry | interface | `src/use-case/advance-screen-session/advance-screen-session.ts#ScreenSession` | PI-39 | 型。 |
| `ScreenValues` | entry | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValues` | PI-39 | 型。 |
| `ScreenValuesEvent` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEvent` | PI-39 | 型。 |
| `SessionEffect` | entry | type | `src/use-case/advance-screen-session/advance-screen-session.ts#SessionEffect` | PI-39 | 型。 |
| `SessionEvent` | entry | type | `src/use-case/advance-screen-session/advance-screen-session.ts#SessionEvent` | PI-39 | 型。 |
| `StandingNotice` | entry | interface | `src/use-case/advance-screen-session/notice-values.ts#StandingNotice` | PI-39 | 型。 |
| `AgentApiEnablingState` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiEnablingState` | -- | type AgentApiEnablingState = \| { readonly kind: 'disabled' } \| { readonly kind: 'enabled' } export interface AgentApiValues |
| `AgentApiValues` | file only | interface | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValues` | -- | interface AgentApiValues |
| `AgentApiValuesAxes` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesAxes` | -- | type AgentApiValuesAxes = Omit<AgentApiValues, never> |
| `AgentApiValuesEffect` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesEffect` | -- | type AgentApiValuesEffect = \| { readonly type: Exclude<AgentApiValuesEffectName, 'raiseNotice'> } \| { readonly type: 'raiseNotice'; readonly reason: 'RS-20' ... |
| `AgentApiValuesEffectName` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesEffectName` | -- | type AgentApiValuesEffectName = \| 'storeAgentApiEnabling' \| 'raiseNotice' const AGENT_API_VALUES_INITIAL_AXES: AgentApiValuesAxes = |
| `AgentApiValuesEvent` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesEvent` | -- | type AgentApiValuesEvent = \| { readonly type: 'agentApiEntryPressed' } \| { readonly type: 'rememberedEnablingLoaded'; readonly isRememberedEnabled: AgentApiV... |
| `AgentApiValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesEventCarried` | -- | interface AgentApiValuesEventCarried |
| `AgentApiValuesKey` | file only | type | `src/use-case/advance-screen-session/agent-api-values.ts#AgentApiValuesKey` | -- | type AgentApiValuesKey = \| 'agentApi' \| 'agentApiEnablingStateMachine.disabled' \| 'agentApiEnablingStateMachine.enabled' export type AgentApiEnablingState = ... |
| `emptyAgentApiValues` | file only | const | `src/use-case/advance-screen-session/agent-api-values.ts#emptyAgentApiValues` | -- | const emptyAgentApiValues: AgentApiValues = { ...AGENT_API_VALUES_INITIAL_AXES } |
| `stepAgentApiValues` | file only | function | `src/use-case/advance-screen-session/agent-api-values.ts#stepAgentApiValues` | -- | function stepAgentApiValues(values: AgentApiValues, event: AgentApiValuesEvent): AgentApiStep |
| `CreatedTaskNamingState` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#CreatedTaskNamingState` | -- | type CreatedTaskNamingState = \| { readonly kind: 'idle' } \| { readonly kind: 'namingCreatedTask'; readonly createdTaskUid: FieldEntryValuesStateCarried['crea... |
| `emptyFieldEntryValues` | file only | const | `src/use-case/advance-screen-session/field-entry-values.ts#emptyFieldEntryValues` | -- | const emptyFieldEntryValues: FieldEntryValues = { ...FIELD_ENTRY_VALUES_INITIAL_AXES } |
| `FieldEditState` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEditState` | -- | type FieldEditState = \| { readonly kind: 'idle' } \| { readonly kind: 'fieldFocusWanted'; readonly fieldRow: FieldEntryValuesStateCarried['fieldRow'] } \| { re... |
| `FieldEntryCreated` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryCreated` | -- | type FieldEntryCreated = FieldEntryCreatedTask \| FieldEntryCreatedRow |
| `FieldEntryCreatedRow` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryCreatedRow` | -- | interface FieldEntryCreatedRow |
| `FieldEntryCreatedTask` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryCreatedTask` | -- | interface FieldEntryCreatedTask |
| `FieldEntryFieldRow` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryFieldRow` | -- | type FieldEntryFieldRow = 'PR-1' \| 'AT-53' \| 'PR-16' \| 'PR-21' \| 'PR-22' \| 'U-27' |
| `FieldEntryValues` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValues` | -- | interface FieldEntryValues |
| `FieldEntryValuesAxes` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesAxes` | -- | type FieldEntryValuesAxes = Omit<FieldEntryValues, never> |
| `FieldEntryValuesEffect` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEffect` | -- | type FieldEntryValuesEffect = |
| `FieldEntryValuesEffectName` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEffectName` | -- | type FieldEntryValuesEffectName = \| 'bringCreatedRowIntoSight' const FIELD_ENTRY_VALUES_INITIAL_AXES: FieldEntryValuesAxes = |
| `FieldEntryValuesEvent` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEvent` | -- | type FieldEntryValuesEvent = \| { readonly type: 'fieldFocusAsked'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] } \| { readonly type: 'creation... |
| `FieldEntryValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEventCarried` | -- | interface FieldEntryValuesEventCarried |
| `FieldEntryValuesKey` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesKey` | -- | type FieldEntryValuesKey = \| 'fieldEntry' \| 'createdTaskNamingStateMachine.idle' \| 'createdTaskNamingStateMachine.namingCreatedTask' \| 'fieldEditStateMachine... |
| `FieldEntryValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesStateCarried` | -- | interface FieldEntryValuesStateCarried |
| `stepFieldEntryValues` | file only | function | `src/use-case/advance-screen-session/field-entry-values.ts#stepFieldEntryValues` | -- | function stepFieldEntryValues(values: FieldEntryValues, event: FieldEntryValuesEvent): FieldEntryStep |
| `ConfirmationState` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#ConfirmationState` | -- | type ConfirmationState = \| { readonly kind: 'notAsked' } \| { readonly kind: 'questionAsked'; readonly question: FileFlowValuesStateCarried['question']; reado... |
| `emptyFileFlowValues` | file only | const | `src/use-case/advance-screen-session/file-flow-values.ts#emptyFileFlowValues` | -- | const emptyFileFlowValues: FileFlowValues = |
| `FileFlowCreatedSubject` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowCreatedSubject` | -- | type FileFlowCreatedSubject = \| { readonly kind: 'task'; readonly uid: number } \| { readonly kind: 'row'; readonly groupId: string } export type FileFlowOwed... |
| `FileFlowMergeCandidate` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowMergeCandidate` | -- | interface FileFlowMergeCandidate |
| `FileFlowMergeMapping` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowMergeMapping` | -- | type FileFlowMergeMapping = \| { readonly kind: 'allSame' } \| { readonly kind: 'allDifferent' } \| |
| `FileFlowOpenChoice` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOpenChoice` | -- | type FileFlowOpenChoice = 'replace' \| 'merge' \| 'baseline' |
| `FileFlowValues` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValues` | -- | interface FileFlowValues |
| `FileFlowValuesAxes` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesAxes` | -- | type FileFlowValuesAxes = Omit<FileFlowValues, 'openedFileName' \| 'droppedTaskNames'> |
| `FileFlowValuesEffect` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEffect` | -- | type FileFlowValuesEffect = |
| `FileFlowValuesEffectName` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEffectName` | -- | type FileFlowValuesEffectName = \| 'raiseFlowSurface' \| 'readDocumentFile' \| 'raiseNotice' \| 'writeDocumentFile' \| 'importIncomingDocument' \| 'discardIncoming... |
| `FileFlowValuesEvent` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEvent` | -- | type FileFlowValuesEvent = \| { readonly type: 'documentOpenAsked'; readonly openRoute: FileFlowValuesEventCarried['openRoute'] } \| { readonly type: 'agentDoc... |
| `FileFlowValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEventCarried` | -- | interface FileFlowValuesEventCarried |
| `FileFlowValuesKey` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesKey` | -- | type FileFlowValuesKey = \| 'fileFlow' \| 'fileOperationStateMachine.idle' \| 'fileOperationStateMachine.readingDocumentFile' \| 'fileOperationStateMachine.await... |
| `FileFlowValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesStateCarried` | -- | interface FileFlowValuesStateCarried |
| `stepFileFlowValues` | file only | function | `src/use-case/advance-screen-session/file-flow-values.ts#stepFileFlowValues` | -- | function stepFileFlowValues(values: FileFlowValues, event: FileFlowValuesEvent): FileFlowStep |
| `UnsavedEditsState` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#UnsavedEditsState` | -- | type UnsavedEditsState = \| { readonly kind: 'nothingUnsaved' } \| { readonly kind: 'editsUnsaved' } export interface FileFlowValues |
| `emptyGestureValues` | file only | const | `src/use-case/advance-screen-session/gesture-values.ts#emptyGestureValues` | -- | const emptyGestureValues: GestureValues = { ...GESTURE_VALUES_INITIAL_AXES } |
| `GesturePressRow` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GesturePressRow` | -- | type GesturePressRow = 'PTD-1' \| 'PTD-2' \| 'PTD-3' \| 'PTD-4' \| 'PTD-4a' \| 'PTD-5' |
| `GestureValues` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValues` | -- | interface GestureValues |
| `GestureValuesAxes` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesAxes` | -- | type GestureValuesAxes = Omit<GestureValues, never> |
| `GestureValuesEffect` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEffect` | -- | type GestureValuesEffect = { readonly type: GestureValuesEffectName } |
| `GestureValuesEffectName` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEffectName` | -- | type GestureValuesEffectName = \| 'startEntryRepeat' \| 'restorePaletteCorner' \| 'repeatHeldEntry' const GESTURE_VALUES_INITIAL_AXES: GestureValuesAxes = |
| `GestureValuesEvent` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEvent` | -- | type GestureValuesEvent = \| { readonly type: 'pointerPressed'; readonly pressRow: GestureValuesEventCarried['pressRow']; readonly pressedOn: GestureValuesEve... |
| `GestureValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEventCarried` | -- | interface GestureValuesEventCarried |
| `GestureValuesKey` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesKey` | -- | type GestureValuesKey = \| 'gesture' \| 'pointerPressStateMachine.notPressed' \| 'pointerPressStateMachine.changingDocument' \| 'pointerPressStateMachine.viewing... |
| `GestureValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesStateCarried` | -- | interface GestureValuesStateCarried |
| `PointerPressState` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#PointerPressState` | -- | type PointerPressState = \| { readonly kind: 'notPressed' } \| { readonly kind: 'changingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; r... |
| `RowGrabState` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#RowGrabState` | -- | type RowGrabState = \| { readonly kind: 'notGrabbed' } \| { readonly kind: 'axisUndecided' } \| { readonly kind: 'changingPosition' } \| { readonly kind: 'changi... |
| `stepGestureValues` | file only | function | `src/use-case/advance-screen-session/gesture-values.ts#stepGestureValues` | -- | function stepGestureValues(values: GestureValues, event: GestureValuesEvent): GestureStep |
| `emptyInteractionRecordValues` | file only | const | `src/use-case/advance-screen-session/interaction-record-values.ts#emptyInteractionRecordValues` | -- | const emptyInteractionRecordValues: InteractionRecordValues = { ...INTERACTION_RECORD_VALUES_INITIAL_AXES } |
| `InteractionRecordingState` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordingState` | -- | type InteractionRecordingState = \| { readonly kind: 'notRecording' } \| { readonly kind: 'recordingInteractions' } export interface InteractionRecordValues |
| `InteractionRecordValues` | file only | interface | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValues` | -- | interface InteractionRecordValues |
| `InteractionRecordValuesAxes` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValuesAxes` | -- | type InteractionRecordValuesAxes = Omit<InteractionRecordValues, never> |
| `InteractionRecordValuesEffect` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValuesEffect` | -- | type InteractionRecordValuesEffect = { readonly type: InteractionRecordValuesEffectName } |
| `InteractionRecordValuesEffectName` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValuesEffectName` | -- | type InteractionRecordValuesEffectName = \| 'beginInteractionRecord' \| 'handInteractionRecordToClipboard' const INTERACTION_RECORD_VALUES_INITIAL_AXES: Intera... |
| `InteractionRecordValuesEvent` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValuesEvent` | -- | type InteractionRecordValuesEvent = \| { readonly type: 'interactionRecordToggled' } export type InteractionRecordValuesEffectName = \| 'beginInteractionRecord... |
| `InteractionRecordValuesKey` | file only | type | `src/use-case/advance-screen-session/interaction-record-values.ts#InteractionRecordValuesKey` | -- | type InteractionRecordValuesKey = \| 'interactionRecord' \| 'interactionRecordingStateMachine.notRecording' \| 'interactionRecordingStateMachine.recordingIntera... |
| `stepInteractionRecordValues` | file only | function | `src/use-case/advance-screen-session/interaction-record-values.ts#stepInteractionRecordValues` | -- | function stepInteractionRecordValues( values: InteractionRecordValues, event: InteractionRecordValuesEvent, ): InteractionRecordStep |
| `ChangeDeliveryState` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#ChangeDeliveryState` | -- | type ChangeDeliveryState = \| { readonly kind: 'idle' } \| { readonly kind: 'delivering' } export interface NoticeValues |
| `emptyNoticeValues` | file only | const | `src/use-case/advance-screen-session/notice-values.ts#emptyNoticeValues` | -- | const emptyNoticeValues: NoticeValues = { ...NOTICE_VALUES_INITIAL_AXES } |
| `NoticeDisplayState` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeDisplayState` | -- | type NoticeDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly standing: NoticeValuesStateCarried['standing'] } export type Cha... |
| `NoticeValues` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValues` | -- | interface NoticeValues |
| `NoticeValuesAxes` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesAxes` | -- | type NoticeValuesAxes = Omit<NoticeValues, never> |
| `NoticeValuesEffect` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEffect` | -- | type NoticeValuesEffect = |
| `NoticeValuesEffectName` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEffectName` | -- | type NoticeValuesEffectName = \| 'raiseNotice' const NOTICE_VALUES_INITIAL_AXES: NoticeValuesAxes = |
| `NoticeValuesEvent` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEvent` | -- | type NoticeValuesEvent = \| { readonly type: 'noticeRaised'; readonly reason: NoticeValuesEventCarried['reason']; readonly affectedCount: NoticeValuesEventCar... |
| `NoticeValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEventCarried` | -- | interface NoticeValuesEventCarried |
| `NoticeValuesKey` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesKey` | -- | type NoticeValuesKey = \| 'notices' \| 'noticeDisplayStateMachine.hidden' \| 'noticeDisplayStateMachine.shown' \| 'changeDeliveryStateMachine.idle' \| 'changeDeli... |
| `NoticeValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesStateCarried` | -- | interface NoticeValuesStateCarried |
| `stepNoticeValues` | file only | function | `src/use-case/advance-screen-session/notice-values.ts#stepNoticeValues` | -- | function stepNoticeValues(values: NoticeValues, event: NoticeValuesEvent): NoticeStep |
| `ArmModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ArmModeState` | -- | type ArmModeState = \| { readonly kind: 'notArmed' } \| { readonly kind: 'taskShapeArmed'; readonly shapeKind: ScreenValuesStateCarried['shapeKind'] } \| { read... |
| `DialogueFieldDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DialogueFieldDisplayState` | -- | type DialogueFieldDisplayState = \| { readonly kind: 'shown' } \| { readonly kind: 'hidden' } export type DualCursorModeState = \| { readonly kind: 'off' } \| { ... |
| `DualCursorModeOnState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DualCursorModeOnState` | -- | type DualCursorModeOnState = \| { readonly kind: 'placingDate1' } \| { readonly kind: 'placingDate2' } export type ArmModeState = \| { readonly kind: 'notArmed'... |
| `DualCursorModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DualCursorModeState` | -- | type DualCursorModeState = \| { readonly kind: 'off' } \| { readonly kind: 'on'; readonly child: DualCursorModeOnState } export type ScaleMessageDisplayState =... |
| `emptyScreenValues` | file only | const | `src/use-case/advance-screen-session/screen-values.ts#emptyScreenValues` | -- | const emptyScreenValues: ScreenValues = |
| `FullScreenModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#FullScreenModeState` | -- | type FullScreenModeState = \| { readonly kind: 'normal' } \| { readonly kind: 'full' } export type OpenSurfaceState = \| { readonly kind: 'closed' } \| { readonl... |
| `MilestoneListDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#MilestoneListDisplayState` | -- | type MilestoneListDisplayState = \| { readonly kind: 'closed' } \| { readonly kind: 'open' } export type FullScreenModeState = \| { readonly kind: 'normal' } \| ... |
| `OpenSurfaceState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#OpenSurfaceState` | -- | type OpenSurfaceState = \| { readonly kind: 'closed' } \| { readonly kind: 'open'; readonly surfaceName: ScreenValuesStateCarried['surfaceName'] } export type ... |
| `PaletteDisplayShownState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PaletteDisplayShownState` | -- | type PaletteDisplayShownState = \| { readonly kind: 'expanded' } \| { readonly kind: 'minimised' } export type DualCursorModeOnState = \| { readonly kind: 'plac... |
| `PaletteDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PaletteDisplayState` | -- | type PaletteDisplayState = \| { readonly kind: 'shown'; readonly child: PaletteDisplayShownState } \| { readonly kind: 'hidden' } export type MilestoneListDisp... |
| `PropertiesPanelContentState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PropertiesPanelContentState` | -- | type PropertiesPanelContentState = \| { readonly kind: 'hidden' } \| { readonly kind: 'selectionDisplayed'; readonly subject: ScreenValuesStateCarried['subject... |
| `ScaleMessageDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScaleMessageDisplayState` | -- | type ScaleMessageDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly percent: ScreenValuesStateCarried['percent']; readonly end... |
| `ScreenValuesAxes` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesAxes` | -- | type ScreenValuesAxes = Omit<ScreenValues, 'language' \| 'rememberedActuals'> |
| `ScreenValuesEffect` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEffect` | -- | type ScreenValuesEffect = |
| `ScreenValuesEffectName` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEffectName` | -- | type ScreenValuesEffectName = \| 'storeLanguage' \| 'writeProgressStep' \| 'askBrowserForFullScreen' \| 'tellFlowSurfaceClosed' \| 'matchWatermarkUnlock' \| 'raise... |
| `ScreenValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEventCarried` | -- | interface ScreenValuesEventCarried |
| `ScreenValuesKey` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesKey` | -- | type ScreenValuesKey = \| 'screen' \| 'armModeStateMachine.notArmed' \| 'armModeStateMachine.taskShapeArmed' \| 'armModeStateMachine.milestoneShapeArmed' \| 'armM... |
| `ScreenValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesStateCarried` | -- | interface ScreenValuesStateCarried |
| `stepScreenValues` | file only | function | `src/use-case/advance-screen-session/screen-values.ts#stepScreenValues` | -- | function stepScreenValues(values: ScreenValues, event: ScreenValuesEvent): ScreenStep |
| `TooltipDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#TooltipDisplayState` | -- | type TooltipDisplayState = \| { readonly kind: 'allowed' } \| { readonly kind: 'dismissed' } export interface ScreenValues |
| `WatermarkDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#WatermarkDisplayState` | -- | type WatermarkDisplayState = \| { readonly kind: 'shown' } \| { readonly kind: 'hidden' } export type PropertiesPanelContentState = \| { readonly kind: 'hidden'... |
| `emptySelectionValues` | file only | const | `src/use-case/advance-screen-session/selection-values.ts#emptySelectionValues` | -- | const emptySelectionValues: SelectionValues = |
| `SelectionCopied` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopied` | -- | type SelectionCopied = SelectionCopiedTask \| SelectionCopiedRow |
| `SelectionCopiedRow` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopiedRow` | -- | interface SelectionCopiedRow |
| `SelectionCopiedTask` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopiedTask` | -- | interface SelectionCopiedTask |
| `SelectionState` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionState` | -- | type SelectionState = \| { readonly kind: 'nothingSelected' } \| { readonly kind: 'objectsSelected'; readonly selectedObjects: SelectionValuesStateCarried['sel... |
| `SelectionValues` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionValues` | -- | interface SelectionValues |
| `SelectionValuesAxes` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesAxes` | -- | type SelectionValuesAxes = Omit<SelectionValues, 'chosenRows' \| 'chosenResources' \| 'copiedForPaste'> |
| `SelectionValuesEffect` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesEffect` | -- | type SelectionValuesEffect = never |
| `SelectionValuesEffectName` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesEffectName` | -- | type SelectionValuesEffectName = never |
| `SelectionValuesEvent` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesEvent` | -- | type SelectionValuesEvent = \| { readonly type: 'objectsPicked'; readonly pickedObjects: SelectionValuesEventCarried['pickedObjects'] } \| { readonly type: 'em... |
| `SelectionValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesEventCarried` | -- | interface SelectionValuesEventCarried |
| `SelectionValuesKey` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesKey` | -- | type SelectionValuesKey = \| 'selection' \| 'selectionStateMachine.nothingSelected' \| 'selectionStateMachine.objectsSelected' export type SelectionState = \| { ... |
| `SelectionValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesStateCarried` | -- | interface SelectionValuesStateCarried |
| `stepSelectionValues` | file only | function | `src/use-case/advance-screen-session/selection-values.ts#stepSelectionValues` | -- | function stepSelectionValues(values: SelectionValues, event: SelectionValuesEvent): SelectionStep |
| `assertNever` | file only | function | `src/use-case/advance-screen-session/session-step.ts#assertNever` | -- | function assertNever(x: never): never |
| `NO_EFFECTS` | file only | const | `src/use-case/advance-screen-session/session-step.ts#NO_EFFECTS` | -- | const NO_EFFECTS: readonly never[] = Object.freeze([]) |
| `Step` | file only | type | `src/use-case/advance-screen-session/session-step.ts#Step` | -- | type Step<S, E> = { readonly state: S; readonly effects: readonly E[] } |
| `unchanged` | file only | function | `src/use-case/advance-screen-session/session-step.ts#unchanged` | -- | function unchanged<S, E>(state: S): Step<S, E> |

Totals: 657 name(s) leave through a public entry (197 of them published by table T-064), 478 more are exported by a file and not by its entry.
