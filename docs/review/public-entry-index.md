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
| `actualEndOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualEndOf` | PI-1 | 実績の終わりの日時。 |
| `actualInstantsOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualInstantsOf` | PI-1 | 実績の始まりと終わりの瞬間の対。 |
| `actualLastDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualLastDay` | PI-1 | 実績の最後の日。 |
| `actualLengthOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualLengthOf` | PI-1 | 実績の長さ。 |
| `actualMinutesOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#actualMinutesOf` | PI-1 | 実績の長さ（分）。 |
| `Assignment` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Assignment` | -- | interface Assignment |
| `BaselineTask` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#BaselineTask` | -- | interface BaselineTask |
| `blankTaskVisual` | entry | function | `src/entity/document-model/schedule/schedule.ts#blankTaskVisual` | PI-1 | `taskUid` のほかがすべて `null` の `TaskVisual`（表 T-220 の `IV-23`） |
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
| `CommentBoxSearchRow` | entry | type | `src/entity/document-model/schedule/schedule-search.ts#CommentBoxSearchRow` | PI-1 | 型。 |
| `commentBoxShownDateOf` | entry | function | `src/entity/document-model/schedule/schedule-search.ts#commentBoxShownDateOf` | PI-1 | コメントボックスの線先が今立つ所の日時（吸着していれば吸着先のその点、していなければ自由点の `anchorDate`、`FR-019`）。 |
| `compareDays` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#compareDays` | PI-1 | 2 つの日の前後 |
| `compareDelayFixRows` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#compareDelayFixRows` | PI-1 | 修正案の行の既定の並びの比べ方（表 T-374） |
| `CustomColor` | entry | interface | `src/entity/document-model/schedule/stored-color.ts#CustomColor` | -- | interface CustomColor |
| `customColorChosen` | entry | function | `src/entity/document-model/schedule/stored-color.ts#customColorChosen` | PI-1 | カスタムカラーを選んだときの新しい綴り。 |
| `customColorOf` | entry | function | `src/entity/document-model/schedule/stored-color.ts#customColorOf` | PI-1 | カスタムカラーを明暗の 2 つの側に分ける。 |
| `customSideOf` | entry | function | `src/entity/document-model/schedule/stored-color.ts#customSideOf` | PI-1 | 未定義の側を他方で埋めて、描く側の値を返す。 |
| `DAILY_RECURRENCE_KIND` | entry | const | `src/entity/document-model/schedule/working-calendar.ts#DAILY_RECURRENCE_KIND` | PI-1 | 日次の繰り返しの種別 `1`（`AT-82`）。 |
| `dataWallOfViewWall` | entry | function | `src/entity/document-model/schedule/time-zone.ts#dataWallOfViewWall` | PI-1 | 見せる基準の壁時計の分を、日程データの壁時計の分へ |
| `DATE_COLUMNS` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#DATE_COLUMNS` | PI-1 | 表 T-058 の型の欄が日付とする列の全数。 |
| `dateFromWorkingDays` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#dateFromWorkingDays` | PI-1 | 起点の日付に稼働日を加えた日 |
| `DateTimeSide` | entry | type | `src/entity/document-model/schedule/working-calendar.ts#DateTimeSide` | PI-1 | 型。 |
| `DAY_END_TIME` | entry | const | `src/entity/document-model/schedule/calendar-day.ts#DAY_END_TIME` | PI-1 | 丸 1 日の範囲の終わりの時刻（表 T-350 の `WT-7`） |
| `DAY_START_TIME` | entry | const | `src/entity/document-model/schedule/calendar-day.ts#DAY_START_TIME` | PI-1 | 丸 1 日の範囲の始まりの時刻（表 T-350 の `WT-6`） |
| `dayFromSerial` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#dayFromSerial` | PI-1 | 通し番号から日付へ —— `serial` の逆。 |
| `dayOf` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#dayOf` | PI-1 | 日付の字面を日にする。 |
| `dayOfInstant` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#dayOfInstant` | PI-1 | 瞬間が落ちる日（開始の側の読み）。 |
| `DaySpanTooWide` | entry | class | `src/entity/document-model/schedule/working-calendar.ts#DaySpanTooWide` | PI-1 | 例外の型 —— 数える 2 つの日が、受け入れる範囲（表 T-214）より離れている |
| `DEFAULT_CALENDAR_VALUES` | entry | const | `src/entity/document-model/schedule/schedule-entities.ts#DEFAULT_CALENDAR_VALUES` | -- | const DEFAULT_CALENDAR_VALUES: |
| `defaultFinishTimeOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#defaultFinishTimeOf` | PI-1 | 文書の既定の終了時刻。 |
| `defaultStartTimeOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#defaultStartTimeOf` | PI-1 | 文書の既定の開始時刻。 |
| `DELAY_FIX_KINDS` | entry | const | `src/entity/document-model/schedule/delay-fixes.ts#DELAY_FIX_KINDS` | PI-1 | 表 T-373 の修正のしかたを、表 T-374 の既定の並びの順に並べたもの |
| `DELAY_REPORT_STATUSES` | entry | const | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DELAY_REPORT_STATUSES` | PI-1 | 表 T-347 の `DT-1` のステータスを、表の順に並べたもの。 |
| `DelayDiagnosticsReport` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#DelayDiagnosticsReport` | PI-1 | 型。 |
| `delayDiagnosticsReportMarkdown` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayDiagnosticsReportMarkdown` | PI-1 | 遅延診断レポートを Markdown の文字列 1 つにする（表 T-346 の `RW-6`）。 |
| `delayDiagnosticsReportRows` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayDiagnosticsReportRows` | PI-1 | 遅延診断レポートの表（表 T-347）の行を、`AM-19` と同じレポートから、`DT-1` の順・`Task.start`・`Task.uid` の既定の並びで作る（`FR-134`）。 |
| `DelayFixCheck` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixCheck` | PI-1 | 型。 |
| `DelayFixChoice` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixChoice` | PI-1 | 型。 |
| `DelayFixChoiceWord` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixChoiceWord` | -- | type DelayFixChoiceWord = \| 'deleteLinkBetween' \| 'deleteLink' \| 'keepThisLink' \| 'setPlannedDate' \| 'clearPauseValues' \| 'markAsStarted' \| 'clearParentActua... |
| `delayFixColumnsOf` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixColumnsOf` | PI-1 | 修正案の表と修正の記録の表それぞれの欄（表 T-374 の行 ID）を、左からの順で返す |
| `DelayFixCommand` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixCommand` | PI-1 | 型。 |
| `delayFixCommands` | entry | function | `src/entity/document-model/schedule/delay-fixes.ts#delayFixCommands` | PI-1 | チェックの入った修正案の行から、1 つの束として発行する命令の列を作る（`FR-155`、表 T-027 の `UN-21`） |
| `DelayFixKind` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixKind` | PI-1 | 型。 |
| `DelayFixLink` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixLink` | -- | interface DelayFixLink |
| `delayFixLogCells` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixLogCells` | PI-1 | 修正の記録の 1 行を、表 T-374 の書き方の文字列の列にする |
| `DelayFixLogRow` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixLogRow` | PI-1 | 型。 |
| `delayFixLogRowsInOrder` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixLogRowsInOrder` | PI-1 | 修正の記録の行を 表 T-374 の既定の並び（直した日時の新しい順 → 束の中の順）にする |
| `delayFixLogRowsOf` | entry | function | `src/entity/document-model/schedule/delay-fixes.ts#delayFixLogRowsOf` | PI-1 | 発行した束の行から、修正の記録の行（表 T-317 の `DX-12`）を作る |
| `DelayFixMarkdown` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayFixMarkdown` | PI-1 | 型。 |
| `DelayFixMarkdownSection` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayFixMarkdownSection` | PI-1 | 型。 |
| `DelayFixOpenField` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixOpenField` | -- | interface DelayFixOpenField |
| `DelayFixPlacement` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixPlacement` | -- | type DelayFixPlacement = \| { readonly state: 'notStarted' } \| ({ readonly state: 'inProgress' \| 'suspendedWithoutResumeDate'; readonly stop: string } & Start... |
| `delayFixProposalCells` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixProposalCells` | PI-1 | 修正案の 1 行を、表 T-374 の書き方の文字列の列にする（表 T-346 の `RW-6` の Markdown にも使う） |
| `delayFixProposalRows` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixProposalRows` | PI-1 | 修正案の行を 表 T-374 の既定の並びにし、連鎖の行を元の行のすぐ下に置く |
| `DelayFixRefusal` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixRefusal` | -- | type DelayFixRefusal = 'readOnly' |
| `DelayFixRow` | entry | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixRow` | PI-1 | 型。 |
| `delayFixRowsInOrder` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixRowsInOrder` | PI-1 | 修正案の行を渡された比べ方で並べ、連鎖の行を元の行から離さない（表 T-374） |
| `DelayFixValue` | entry | type | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixValue` | PI-1 | 型。 |
| `delayFixValueText` | entry | function | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#delayFixValueText` | PI-1 | 表 T-374 の `FM-7` の書き方で値を文字列にする |
| `DelayFixWords` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayFixWords` | PI-1 | 型。 |
| `DelayReportDates` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportDates` | -- | interface DelayReportDates |
| `DelayReportFilter` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportFilter` | -- | interface DelayReportFilter |
| `DelayReportReason` | entry | type | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportReason` | PI-1 | 表 T-347 の `DT-7`（理由）に入れる値の型 |
| `DelayReportRow` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportRow` | PI-1 | 表 T-347 の行ごとの値の型 |
| `DelayReportStatus` | entry | type | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportStatus` | PI-1 | 表 T-347 の `DT-1` のステータスの型 —— 表 T-315 の `DG-1` 〜 `DG-4`、指摘、確定 |
| `DelayReportTextRow` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportTextRow` | -- | interface DelayReportTextRow |
| `DelayReportWords` | entry | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportWords` | PI-1 | `delayDiagnosticsReportMarkdown` に渡す語の型（表 T-346 の `RW-6`） |
| `delayStart` | entry | function | `src/entity/document-model/schedule/task-delay.ts#delayStart` | -- | function delayStart(task: Task): { readonly row: string; readonly from: string \| null } \| null |
| `delayWorkingDays` | entry | function | `src/entity/document-model/schedule/task-delay.ts#delayWorkingDays` | PI-1 | 表 T-021b の起点と終点 |
| `Dependency` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Dependency` | -- | interface Dependency |
| `diagnoseDelay` | entry | function | `src/entity/document-model/schedule/delay-diagnostics.ts#diagnoseDelay` | PI-1 | 遅延診断のレポート（表 T-317）を作る。 |
| `earliestPlanStartDayOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#earliestPlanStartDayOf` | PI-1 | 全体日程シフトの最初のタスクの開始日（表 T-379 の `WH-1`）—— `Task` の予定の開始を開始の側で読んだ、いちばん早い日。 |
| `EntityRows` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#EntityRows` | -- | interface EntityRows |
| `Exception` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Exception` | -- | interface Exception |
| `finishSideDayFrom` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#finishSideDayFrom` | PI-1 | `finishSideDayOf` と同じ日を、読み手が既に読んだその字の日（`dayOf` の答え）から数える。 |
| `finishSideDayOf` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#finishSideDayOf` | PI-1 | 終了の側の日時が落ちる日。 |
| `ForeignKeyColumn` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#ForeignKeyColumn` | -- | interface ForeignKeyColumn |
| `HighlightBox` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#HighlightBox` | -- | interface HighlightBox |
| `instantAfterWorkingMinutes` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#instantAfterWorkingMinutes` | PI-1 | 瞬間から稼働時間を分だけ進めた（負なら戻した）瞬間。 |
| `instantOf` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#instantOf` | PI-1 | 日時の字面を瞬間（分）にする。 |
| `InstantOnSide` | entry | type | `src/entity/document-model/schedule/working-calendar.ts#InstantOnSide` | PI-1 | 型。 |
| `instantOnSide` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#instantOnSide` | PI-1 | 日時の字を、開始の側か終了の側として瞬間（分）にする。 |
| `instantOnSideReader` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#instantOnSideReader` | PI-1 | `instantOnSide` を 1 回の読みの間くり返す読み手（暦の索引は時刻を書いていない日付の字に初めて会ったときに 1 度だけ作る）。 |
| `InvariantKind` | entry | type | `src/entity/document-model/schedule/schedule-invariants.ts#InvariantKind` | -- | type InvariantKind = \| 'unique' \| 'reference' \| 'structure' \| 'combination' \| 'range' export interface ScheduleViolation |
| `isDelayed` | entry | function | `src/entity/document-model/schedule/task-delay.ts#isDelayed` | PI-1 | 表 T-021b の 3 条件 |
| `isNonRecurringException` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isNonRecurringException` | PI-1 | 例外日が繰り返しの無いものか。 |
| `isPlanReversed` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isPlanReversed` | PI-1 | 予定の `finish` が `start` より前の瞬間か。 |
| `isSameDay` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#isSameDay` | PI-1 | 2 つの日時の字が同じ日か。 |
| `isSameWorkingTimeSet` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isSameWorkingTimeSet` | PI-1 | 2 つの時間帯の組が同じか。 |
| `isSearchWordFound` | entry | function | `src/entity/document-model/schedule/schedule-search.ts#isSearchWordFound` | PI-1 | 名や本文が語に当たるか（表 T-330 の `SV-4` の比べ方） |
| `isStandardTimeZoneKey` | entry | function | `src/entity/document-model/schedule/time-zone.ts#isStandardTimeZoneKey` | PI-1 | 値が 表 T-376 の種が標準時の行の鍵か（`FR-156`、`AT-157`・`S-574`） |
| `isStoredColor` | entry | function | `src/entity/document-model/schedule/stored-color.ts#isStoredColor` | PI-1 | 色の列が取る綴りか。 |
| `isTimeZoneKey` | entry | function | `src/entity/document-model/schedule/time-zone.ts#isTimeZoneKey` | PI-1 | 値が 表 T-376 の鍵か（標準時と夏時間のどちらの行でもよい、`FR-156`・`S-575`） |
| `isWorkingDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isWorkingDay` | PI-1 | その日が文書の暦の稼働日か（`FR-054`） |
| `isWorkingDayUnlikeMinutesPerDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isWorkingDayUnlikeMinutesPerDay` | PI-1 | 時間帯の合計が `Project.minutesPerDay` と違う稼働日を文書が持つか。 |
| `isWorkingTimeSetUnlikeDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#isWorkingTimeSetUnlikeDay` | PI-1 | 当てる時間帯の 1 組の合計が `Project.minutesPerDay` と違うか。 |
| `lagOfWorkingDays` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#lagOfWorkingDays` | PI-1 | 稼働日のラグを、保存する 0.1 分にする（`FR-009`・`AT-47`） |
| `lagWorkingDaysOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#lagWorkingDaysOf` | PI-1 | ラグを稼働日で読む。 |
| `lastDayForLength` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#lastDayForLength` | PI-1 | `actualStart` と長さから実績の最後の日を置く。 |
| `MINUTES_PER_CALENDAR_DAY` | entry | const | `src/entity/document-model/schedule/calendar-day.ts#MINUTES_PER_CALENDAR_DAY` | PI-1 | 暦の 1 日の分の数。 |
| `minutesPerWorkingDayOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#minutesPerWorkingDayOf` | PI-1 | 1 稼働日の分数。 |
| `MovedDay` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#MovedDay` | -- | interface MovedDay |
| `NestedRows` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#NestedRows` | -- | interface NestedRows |
| `nextWorkingDay` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#nextWorkingDay` | PI-1 | 起点の**翌稼働日**。 |
| `NoWorkingDayReached` | entry | class | `src/entity/document-model/schedule/working-calendar.ts#NoWorkingDayReached` | PI-1 | 例外の型 —— 稼働日を数える歩みが、受け入れる範囲（表 T-214）の中で稼働日に着かなかった |
| `parentCandidatesOf` | entry | function | `src/entity/document-model/schedule/delay-diagnostics.ts#parentCandidatesOf` | PI-1 | 親の決まらない子の候補の並び（表 T-318 の `IP-4`、`FR-135` の番号の枠） |
| `ParentTaskResolution` | entry | type | `src/entity/document-model/schedule/delay-diagnostics.ts#ParentTaskResolution` | PI-1 | 型。 |
| `parentTaskResolutionsOf` | entry | function | `src/entity/document-model/schedule/delay-diagnostics.ts#parentTaskResolutionsOf` | PI-1 | どの `Task` の親タスクも、明記・導いた親タスク（表 T-318 の `IP-2`）・決まらない（`VO-4`、候補は `IP-4` の並び）・根（`IP-5`）のどれかで答える。 |
| `PlanActualState` | entry | type | `src/entity/document-model/schedule/plan-actual-state.ts#PlanActualState` | -- | type PlanActualState = \| 'notStarted' \| 'finished' \| 'suspendedResumeUnknown' \| 'suspendedResumePlanned' \| 'inProgress' // see T-019a /** @purity pure */ exp... |
| `planActualState` | entry | function | `src/entity/document-model/schedule/plan-actual-state.ts#planActualState` | PI-1 | 表 T-019a の判別 |
| `plannedDurationMinutesOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#plannedDurationMinutesOf` | PI-1 | 予定の長さの分数。 |
| `plannedInstantsOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#plannedInstantsOf` | PI-1 | 予定の始まりと終わりの瞬間の対。 |
| `plannedLengthMinutesOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#plannedLengthMinutesOf` | PI-1 | 予定の期間（分）。 |
| `PRINTED_TIME_ZONE` | entry | const | `src/entity/document-model/schedule/time-zone.ts#PRINTED_TIME_ZONE` | PI-1 | 刷った空の文書が持つ日程データのタイムゾーン（表 T-342 の `BK-4`、表 T-376 の `ZN-47`） |
| `ProgressMarker` | entry | type | `src/entity/document-model/schedule/task-delay.ts#ProgressMarker` | -- | type ProgressMarker = 'PM-1a' \| 'PM-1' \| 'PM-2' \| 'PM-3' \| 'PM-4' \| 'DG-1' \| 'DG-2' \| 'DG-3' |
| `progressMarkerOf` | entry | function | `src/entity/document-model/schedule/task-delay.ts#progressMarkerOf` | PI-1 | 進捗マーカーの値を 1 つ求める（`FR-013` の 表 T-021、遅延診断の行を受ければ `FR-133` の 表 T-315 の優先順）。 |
| `progressPointDayOf` | entry | function | `src/entity/document-model/schedule/plan-actual-state.ts#progressPointDayOf` | PI-1 | 表 T-022 の頂点を打つ日。 |
| `Project` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Project` | -- | interface Project |
| `proposeDelayFixes` | entry | function | `src/entity/document-model/schedule/delay-fixes.ts#proposeDelayFixes` | PI-1 | 遅延診断の指摘（表 T-317 の `DX-3`）ごとに、表 T-373 の修正のしかたで修正案の行を作る（`FR-155`）。 |
| `Resource` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Resource` | -- | interface Resource |
| `reversedActualMinutesOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#reversedActualMinutesOf` | PI-1 | 終わりが始まりより前の実績の長さ（分、`FR-011` の数え方）。 |
| `Schedule` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Schedule` | PI-1 | 型。 |
| `ScheduleViolation` | entry | interface | `src/entity/document-model/schedule/schedule-invariants.ts#ScheduleViolation` | -- | interface ScheduleViolation |
| `scheduleViolations` | entry | function | `src/entity/document-model/schedule/schedule-invariants.ts#scheduleViolations` | PI-1 | 不変条件に反する箇所 |
| `SearchRows` | entry | type | `src/entity/document-model/schedule/schedule-search.ts#SearchRows` | PI-1 | 型。 |
| `searchRowsOf` | entry | function | `src/entity/document-model/schedule/schedule-search.ts#searchRowsOf` | PI-1 | 語に当たるタスクとコメントボックスの行（`FR-151` の 表 T-330 の `SV-4`、表 T-331）。 |
| `serial` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#serial` | PI-1 | 日付の通し番号（暦日）。 |
| `shownInstantReader` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#shownInstantReader` | PI-1 | 画面が見せる日時の読み手 —— 字を側で読み（`FR-054`）、見せる基準の時計で見せる（`FR-156`）。 |
| `sideOfTaskColumn` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#sideOfTaskColumn` | PI-1 | `Task` の日時の列を読む側。 |
| `StandardTimeZoneKey` | entry | type | `src/entity/document-model/schedule/time-zone.ts#StandardTimeZoneKey` | PI-1 | 型。 |
| `standardTimeZoneKeyForSystem` | entry | function | `src/entity/document-model/schedule/time-zone.ts#standardTimeZoneKeyForSystem` | PI-1 | この PC の標準時（1 月 1 日と 7 月 1 日の UTC の差の小さいほう）を、表 T-376 の標準時の行の鍵へ寄せる（`FR-156`） |
| `startSideOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#startSideOf` | PI-1 | `Task` の開始の側の列をどちらの側で読むか。 |
| `SystemTimeZone` | entry | interface | `src/entity/document-model/schedule/time-zone.ts#SystemTimeZone` | PI-1 | 型。 |
| `Task` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#Task` | -- | interface Task |
| `taskByUid` | entry | function | `src/entity/document-model/schedule/schedule.ts#taskByUid` | PI-1 | `uid` で引く。 |
| `TaskGroup` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskGroup` | -- | interface TaskGroup |
| `TaskGroupMember` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskGroupMember` | -- | interface TaskGroupMember |
| `taskGroupNameOf` | entry | function | `src/entity/document-model/schedule/task-group-names.ts#taskGroupNameOf` | PI-1 | タスクグループ名を `AT-53` と `AT-54` から導く。 |
| `TaskOrigin` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskOrigin` | -- | interface TaskOrigin |
| `TaskSearchRow` | entry | type | `src/entity/document-model/schedule/schedule-search.ts#TaskSearchRow` | PI-1 | 型。 |
| `TaskVisual` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#TaskVisual` | -- | interface TaskVisual |
| `TENTHS_OF_A_MINUTE` | entry | const | `src/entity/document-model/schedule/working-calendar.ts#TENTHS_OF_A_MINUTE` | PI-1 | `linkLag` の 1 分あたりの数（`AT-47`） |
| `textOfDay` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#textOfDay` | PI-1 | 日を日付の字面に戻す。 |
| `textOfDayEnd` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#textOfDayEnd` | PI-1 | 丸 1 日の範囲の終わりの字（表 T-350 の `WT-7`） |
| `textOfDayStart` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#textOfDayStart` | PI-1 | 丸 1 日の範囲の始まりと 1 つの日の字（表 T-350 の `WT-6`・`WT-8`） |
| `textOfFinishSide` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#textOfFinishSide` | PI-1 | 終了の側の列へ書く日時の字（表 T-350 の `WT-2`・`WT-4`） |
| `textOfInstant` | entry | function | `src/entity/document-model/schedule/calendar-day.ts#textOfInstant` | PI-1 | 瞬間を日時の字にする。 |
| `textOfStartSide` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#textOfStartSide` | PI-1 | 開始の側の列へ書く日時の字。 |
| `TIME_ZONE_ROWS` | entry | const | `src/entity/document-model/schedule/time-zone.ts#TIME_ZONE_ROWS` | PI-1 | 表 T-376 のタイムゾーンの行（鍵・UTC の差・夏時間の行か・略称）を表の順に。 |
| `TimeZoneRow` | entry | interface | `src/entity/document-model/schedule/time-zone.ts#TimeZoneRow` | -- | interface TimeZoneRow |
| `timeZoneRowOf` | entry | function | `src/entity/document-model/schedule/time-zone.ts#timeZoneRowOf` | PI-1 | 鍵の 表 T-376 の行。 |
| `TRANSPARENT` | entry | const | `src/entity/document-model/schedule/stored-color.ts#TRANSPARENT` | PI-1 | 透明の色の綴り（`_assets/tbl-settings.md` の `S-324`）。 |
| `viewRegionOf` | entry | function | `src/entity/document-model/schedule/time-zone.ts#viewRegionOf` | PI-1 | 見せる基準の鍵（`S-574`、空か標準時の行の鍵でなければ日程データのタイムゾーン `AT-157`） |
| `viewWallOfDataWall` | entry | function | `src/entity/document-model/schedule/time-zone.ts#viewWallOfDataWall` | PI-1 | 日程データの壁時計の分を、見せる基準の壁時計の分へ（同じ鍵なら換算しない） |
| `viewWallReader` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#viewWallReader` | PI-1 | 日程データの壁時計の分を、見せる基準（`S-574`）の壁時計の分へ換える読み手。 |
| `WeekDay` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#WeekDay` | -- | interface WeekDay |
| `weekDayOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#weekDayOf` | PI-1 | 時間帯も持ち回りも持たない曜日の行。 |
| `withoutDependencyAt` | entry | function | `src/entity/document-model/schedule/schedule.ts#withoutDependencyAt` | PI-1 | `Task` の依存の並びから、1 つの先行から来る線のうち順で名指した 1 本を除く（表 T-108 の `CM-93`）。 |
| `WORKING_DAY_LAG_FORMAT` | entry | const | `src/entity/document-model/schedule/working-calendar.ts#WORKING_DAY_LAG_FORMAT` | PI-1 | `GRS` が解するラグの形式 `7`（`FR-009`・`AT-48`） |
| `WorkingCalendar` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#WorkingCalendar` | -- | interface WorkingCalendar |
| `workingCalendarOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingCalendarOf` | PI-1 | 文書の暦を解く。 |
| `workingDaysBetween` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingDaysBetween` | PI-1 | 2 つの日付のあいだの稼働日数。 |
| `WorkingDayShift` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#WorkingDayShift` | PI-1 | 型 —— `workingDayShiftOf` の答え |
| `workingDayShiftOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingDayShiftOf` | PI-1 | 全体日程シフトの写像（`FR-159` の 表 T-379 の `WH-2`〜`WH-5`）。 |
| `workingMinutesBetween` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingMinutesBetween` | PI-1 | 2 つの瞬間の間の稼働時間（分）。 |
| `workingSpansReader` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingSpansReader` | PI-1 | 日ごとの稼働時間の区間を返す読み手（索引は 1 度だけ作る）。 |
| `WorkingTime` | entry | interface | `src/entity/document-model/schedule/schedule-entities.ts#WorkingTime` | PI-1 | 型。 |
| `WorkingTimeCounter` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#WorkingTimeCounter` | PI-1 | 型。 |
| `workingTimeCounterOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingTimeCounterOf` | PI-1 | 予定の期間と実績の長さ（分）を、1 回の数え直しの間くり返して数える数え手（暦の索引は初めて要るときに 1 度だけ作る）。 |
| `workingTimesBreach` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingTimesBreach` | PI-1 | 時間帯の組が `05-07-design.md` の 表 T-220 の `IV-24` に反する理由。 |
| `WorkingTimeSet` | entry | interface | `src/entity/document-model/schedule/working-calendar.ts#WorkingTimeSet` | -- | interface WorkingTimeSet |
| `workingTimeSetOf` | entry | function | `src/entity/document-model/schedule/working-calendar.ts#workingTimeSetOf` | PI-1 | 文書の稼働日の時間帯の 1 組と、違う組を持つ曜日。 |
| `ZoneClock` | entry | interface | `src/entity/document-model/schedule/time-zone.ts#ZoneClock` | -- | interface ZoneClock |
| `zoneClockOf` | entry | function | `src/entity/document-model/schedule/time-zone.ts#zoneClockOf` | PI-1 | 表 T-376 の行の固定の UTC の差で読む時計（壁時計の分と UTC の分の換算）。 |
| `isDateWithoutTime` | file only | function | `src/entity/document-model/schedule/calendar-day.ts#isDateWithoutTime` | -- | function isDateWithoutTime(text: string): boolean |
| `textOfDayAt` | file only | function | `src/entity/document-model/schedule/calendar-day.ts#textOfDayAt` | -- | function textOfDayAt(day: CalendarDay, time: string): string |
| `DelayReportWall` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts#DelayReportWall` | -- | interface DelayReportWall |
| `AnalysisWall` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#AnalysisWall` | -- | interface AnalysisWall |
| `Bottleneck` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#Bottleneck` | -- | interface Bottleneck extends DelayQuantities |
| `DelayFinding` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#DelayFinding` | -- | interface DelayFinding |
| `DelayMarkerRow` | file only | type | `src/entity/document-model/schedule/delay-diagnostics.ts#DelayMarkerRow` | -- | type DelayMarkerRow = 'DG-1' \| 'DG-2' \| 'DG-3' \| 'DG-4' |
| `DelayMarkerState` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#DelayMarkerState` | -- | interface DelayMarkerState |
| `DelayQuantities` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#DelayQuantities` | -- | interface DelayQuantities |
| `DerivedParentTask` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#DerivedParentTask` | -- | interface DerivedParentTask |
| `extremeText` | file only | function | `src/entity/document-model/schedule/delay-diagnostics.ts#extremeText` | -- | function extremeText(texts: readonly (string \| null)[], latest: boolean): string \| null |
| `FindingKind` | file only | type | `src/entity/document-model/schedule/delay-diagnostics.ts#FindingKind` | -- | type FindingKind = 'contradiction' \| 'suspicion' \| 'omission' |
| `FindingValue` | file only | type | `src/entity/document-model/schedule/delay-diagnostics.ts#FindingValue` | -- | type FindingValue = string \| number \| boolean \| null \| readonly number[] |
| `laggedInstant` | file only | function | `src/entity/document-model/schedule/delay-diagnostics.ts#laggedInstant` | -- | function laggedInstant(walk: WorkingTimeWalk, at: number, lagMinutes: number): number |
| `lagMinutesOf` | file only | function | `src/entity/document-model/schedule/delay-diagnostics.ts#lagMinutesOf` | -- | function lagMinutesOf(dependency: Dependency): number \| null |
| `LateDays` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#LateDays` | -- | interface LateDays |
| `TerminalPushOut` | file only | interface | `src/entity/document-model/schedule/delay-diagnostics.ts#TerminalPushOut` | -- | interface TerminalPushOut |
| `WorkingTimeWalk` | file only | type | `src/entity/document-model/schedule/delay-diagnostics.ts#WorkingTimeWalk` | -- | type WorkingTimeWalk = (from: number, minutes: number) => number |
| `workingTimeWalkOf` | file only | function | `src/entity/document-model/schedule/delay-diagnostics.ts#workingTimeWalkOf` | -- | function workingTimeWalkOf(calendar: WorkingCalendar): WorkingTimeWalk |
| `DelayFixSubject` | file only | interface | `src/entity/document-model/schedule/delay-fixes.ts#DelayFixSubject` | -- | interface DelayFixSubject |
| `ENTITY_ROWS` | file only | const | `src/entity/document-model/schedule/schedule-entities.ts#ENTITY_ROWS` | -- | const ENTITY_ROWS: readonly EntityRows[] = [ |
| `taskGroupRankById` | file only | function | `src/entity/document-model/schedule/schedule-invariants.ts#taskGroupRankById` | -- | function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> |
| `assigneeNamesByTaskUid` | file only | function | `src/entity/document-model/schedule/schedule-search.ts#assigneeNamesByTaskUid` | -- | function assigneeNamesByTaskUid(schedule: Schedule): ReadonlyMap<number, readonly string[]> |
| `compareDates` | file only | function | `src/entity/document-model/schedule/schedule-search.ts#compareDates` | -- | function compareDates(left: string \| null, right: string \| null): number |
| `compareInstants` | file only | function | `src/entity/document-model/schedule/schedule-search.ts#compareInstants` | -- | function compareInstants(a: number \| null, b: number \| null): number |
| `plannedFinishOf` | file only | function | `src/entity/document-model/schedule/schedule-search.ts#plannedFinishOf` | -- | function plannedFinishOf(task: Task): string \| null |
| `plannedStartInstantsOf` | file only | function | `src/entity/document-model/schedule/schedule-search.ts#plannedStartInstantsOf` | -- | function plannedStartInstantsOf(schedule: Schedule): ReadonlyMap<number, number \| null> |
| `taskGroupPathOf` | file only | function | `src/entity/document-model/schedule/task-group-names.ts#taskGroupPathOf` | -- | function taskGroupPathOf(schedule: Schedule, taskGroupId: string): readonly string[] |
| `MinuteSpan` | file only | interface | `src/entity/document-model/schedule/working-calendar.ts#MinuteSpan` | -- | interface MinuteSpan |
| `previousWorkingDay` | file only | function | `src/entity/document-model/schedule/working-calendar.ts#previousWorkingDay` | -- | function previousWorkingDay(within: WorkingCalendar, from: CalendarDay): CalendarDay |

## DocumentSettings (PI-2, `src/entity/document-model/document-settings/document-settings.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `clampedSettings` | entry | function | `src/entity/document-model/document-settings/document-settings.ts#clampedSettings` | PI-2 | 下限・上限に収める |
| `ClampedValue` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ClampedValue` | -- | interface ClampedValue |
| `ClampResult` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ClampResult` | -- | interface ClampResult |
| `ColumnFilter` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ColumnFilter` | -- | interface ColumnFilter |
| `ColumnSort` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#ColumnSort` | -- | interface ColumnSort |
| `DISPLAY_SCALE_STEPS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#DISPLAY_SCALE_STEPS` | PI-2 | 表示の倍率の段の並び。 |
| `DocumentSettings` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#DocumentSettings` | PI-2 | 型。 |
| `DrawnSettings` | entry | type | `src/entity/document-model/document-settings/document-settings.ts#DrawnSettings` | PI-2 | 型。 |
| `SETTINGS_BOUNDS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_BOUNDS` | -- | const SETTINGS_BOUNDS: Readonly<Record<string, SettingsBound>> = |
| `SETTINGS_CONSTANTS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_CONSTANTS` | PI-2 | 成果物に埋め込む定数。 |
| `SETTINGS_DEFAULTS` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_DEFAULTS` | -- | const SETTINGS_DEFAULTS: Readonly<Record<string, unknown>> = |
| `SETTINGS_DERIVED` | entry | const | `src/entity/document-model/document-settings/document-settings.ts#SETTINGS_DERIVED` | -- | const SETTINGS_DERIVED = |
| `SettingsBound` | entry | interface | `src/entity/document-model/document-settings/document-settings.ts#SettingsBound` | -- | interface SettingsBound |
| `SettingsBoundToken` | entry | type | `src/entity/document-model/document-settings/document-settings.ts#SettingsBoundToken` | -- | type SettingsBoundToken = \| { readonly key: string } \| { readonly num: number } \| { readonly op: '+' \| '-' \| '*' \| '/' } export interface SettingsBound |
| `TableViews` | entry | type | `src/entity/document-model/document-settings/document-settings.ts#TableViews` | PI-2 | 型。 |

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
| `nextStep` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#nextStep` | PI-4 | function nextStep<TStep>( history: EditHistory<TStep>, leftBehind: (step: TStep) => TStep, ): HistoryMove<TStep> |
| `NOT_STORED_LIMITS` | entry | const | `src/entity/document-model/edit-history/edit-history.ts#NOT_STORED_LIMITS` | -- | const NOT_STORED_LIMITS: |
| `previousStep` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#previousStep` | PI-4 | function previousStep<TStep>( history: EditHistory<TStep>, leftBehind: (step: TStep) => TStep, ): HistoryMove<TStep> |
| `stepCount` | entry | function | `src/entity/document-model/edit-history/edit-history.ts#stepCount` | -- | function stepCount<TStep>(history: EditHistory<TStep>): number |

## ScheduleLayout (PI-5, `src/entity/layout-engine/schedule-layout/schedule-layout.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `assigneeAnchorOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#assigneeAnchorOf` | PI-5 | 担当と進捗の札の右端を合わせる位置。 |
| `clockTextOf` | entry | function | `src/entity/layout-engine/schedule-layout/name-label.ts#clockTextOf` | PI-5 | 瞬間の時刻を 24 時間制、時を 0 で埋めず分を 2 桁で書く（`FR-158` の 表 T-375） |
| `cursorInstantAtX` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#cursorInstantAtX` | PI-5 | `Dual Cursor` の線が立つ瞬間 —— `FR-103` の 表 T-378 の単位で寄せる。 |
| `dateAtX` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#dateAtX` | PI-5 | 時間軸の対応。 |
| `DayReader` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#DayReader` | -- | interface DayReader |
| `deadlineHeadHalfWidthOf` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#deadlineHeadHalfWidthOf` | PI-5 | 期限の印の矢じりの半幅（表 T-206 の `S-365` に進捗マーカーの径を掛けた幅の半分）。 |
| `dummyBandOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#dummyBandOf` | PI-5 | ダミーを描く帯。 |
| `dummyInkWidthOf` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#dummyInkWidthOf` | -- | function dummyInkWidthOf( markerDiameter: number, axis: { readonly pxPerDay: number; readonly isTimeOfDayVisible: boolean }, ): number |
| `FitToScreen` | entry | interface | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#FitToScreen` | -- | interface FitToScreen |
| `fitZoom` | entry | function | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#fitZoom` | PI-5 | `FR-055` |
| `fixedFitSpanOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#fixedFitSpanOf` | PI-5 | 文書が全体表示時の期間を固定しているときだけ、その 2 つの日と暦日の数を返す。 |
| `groupDepthLimit` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#groupDepthLimit` | PI-5 | いまの詳しさの段が描く最も深い段。 |
| `groupDepthThresholdOf` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#groupDepthThresholdOf` | PI-5 | その段を描くのに要る倍率。 |
| `hasRoomBelowPinsIn` | entry | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#hasRoomBelowPinsIn` | PI-5 | タスクグループの領域の中で、固定したタスクグループの帯の下に、そのタスクグループを描く余地が残るか。 |
| `hasUndecidedResume` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#hasUndecidedResume` | -- | function hasUndecidedResume(task: Task, shapeKind: ShapeKind): boolean |
| `inTreeOrder` | entry | function | `src/entity/layout-engine/schedule-layout/drawn-task-groups.ts#inTreeOrder` | PI-5 | タスクグループを木の順（`05-07-design.md` の 表 T-068 の `LC-9`）に並べる。 |
| `isDroppedByTreeState` | entry | function | `src/entity/layout-engine/schedule-layout/drawn-task-groups.ts#isDroppedByTreeState` | PI-5 | そのタスクグループが、人が折りたたんだタスクグループか隠したタスクグループのために描かれないか —— タスクグループそのものが隠されている、祖先が折りたたまれているか隠されている、段 0 が折りたたまれている（`FR-018` の 表 T-329 の `TD-1` ／ `TD-2` ／ `TD-3`）。 |
| `isPlanSpanningYears` | entry | function | `src/entity/layout-engine/schedule-layout/name-label.ts#isPlanSpanningYears` | PI-5 | 文書のすべてのタスクとマイルストーンの予定の日が 2 つ以上の暦年にまたがるか。 |
| `keptInViewByTreeState` | entry | function | `src/entity/layout-engine/schedule-layout/group-level-of-detail.ts#keptInViewByTreeState` | PI-5 | `expanded` と `temporarilyExpanded` が倍率によらず描かせるタスクグループ。 |
| `labeledAssigneeUidOf` | entry | function | `src/entity/layout-engine/schedule-layout/assignee-label.ts#labeledAssigneeUidOf` | PI-5 | 担当ラベルが名を出す担当、すなわち `FR-059` の絞りで残る担当のうち、割当の並びで先頭の 1 名（主担当、`FR-008` の 表 T-225 の `AS-13`）の資源の `uid`。 |
| `LabelLayout` | entry | interface | `src/entity/layout-engine/schedule-layout/label-placement.ts#LabelLayout` | PI-5 | 型。 |
| `labelLayoutOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#labelLayoutOf` | PI-5 | その配置を求める |
| `LabelPlacement` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#LabelPlacement` | -- | type LabelPlacement = 'inside' \| 'right' |
| `LabelReference` | entry | interface | `src/entity/layout-engine/schedule-layout/label-placement.ts#LabelReference` | PI-5 | 型。 |
| `labelReferenceOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#labelReferenceOf` | PI-5 | その基準を求める |
| `labelUnits` | entry | function | `src/entity/layout-engine/schedule-layout/label-width.ts#labelUnits` | PI-5 | `FR-093` の「全角 2・半角 1 で数えた単位数」。 |
| `labelWidth` | entry | function | `src/entity/layout-engine/schedule-layout/label-width.ts#labelWidth` | PI-5 | `FR-093` の概算の幅（単位数 × 字の大きさ × `S-30`）。 |
| `landedShapeBoxOf` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#landedShapeBoxOf` | PI-5 | 飛ぶ先の予定の形の外接矩形 —— タスクは配置の予定の図形（実績を含めない）、コメントボックスは箱（表 T-332 の `SJ-5` ・ `SJ-6` ・ `SJ-10`）。 |
| `LandedTarget` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#LandedTarget` | PI-5 | 型。 |
| `layoutFromSchedule` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#layoutFromSchedule` | PI-5 | function layoutFromSchedule( schedule: Schedule, storedSettings: DocumentSettings, regions: ScreenRegions, groupDepthCap?: number, taskGroupControlsHeightPx?... |
| `lengthTextOf` | entry | function | `src/entity/layout-engine/schedule-layout/name-label.ts#lengthTextOf` | PI-5 | 長さ（分）を `1d 2h`・`2h 30m`・`30m` の形で書く（`FR-158` の 表 T-375 の `TX-10`）。 |
| `markerDiameterOf` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#markerDiameterOf` | PI-5 | 進捗マーカーの径。 |
| `MilestoneGlyph` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#MilestoneGlyph` | -- | type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']> |
| `MORE_ASSIGNEES_MARK` | entry | const | `src/entity/layout-engine/schedule-layout/assignee-label.ts#MORE_ASSIGNEES_MARK` | PI-5 | 担当ラベルが、主担当のほかにも出す担当がいるときに名の後に続ける印「, …」（`FR-059`）。 |
| `NOT_STORED_LABEL_SIZES` | entry | const | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#NOT_STORED_LABEL_SIZES` | PI-5 | 表 T-206 の `S-196` と `S-233` を刷った定数。 |
| `NOT_STORED_SIZES` | entry | const | `src/entity/layout-engine/schedule-layout/label-placement.ts#NOT_STORED_SIZES` | -- | const NOT_STORED_SIZES: |
| `NotStoredZoom` | entry | interface | `src/entity/layout-engine/schedule-layout/fit-zoom.ts#NotStoredZoom` | -- | interface NotStoredZoom |
| `outwardStartOf` | entry | function | `src/entity/layout-engine/schedule-layout/label-placement.ts#outwardStartOf` | PI-5 | 基準の外へ札を並べ始める位置。 |
| `planDateText` | entry | function | `src/entity/layout-engine/schedule-layout/name-label.ts#planDateText` | PI-5 | 予定の 1 つの日を `ND-4`・`ND-5` の形で書く |
| `RulerTier` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#RulerTier` | -- | type RulerTier = 'year' \| 'yearMonth' \| 'yearMonthWeek' \| 'yearMonthDayWeekday' \| 'dayHour' |
| `rulerTierOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#rulerTierOf` | PI-5 | 目盛の段階（`FR-017` の 表 T-238 の段）を、1 日あたりの表示幅と設定から求める。 |
| `ScheduleLayout` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#ScheduleLayout` | PI-5 | 型 |
| `ShapeKind` | entry | type | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#ShapeKind` | -- | type ShapeKind = NonNullable<TaskVisual['shapeKind']> |
| `shownSpanOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#shownSpanOf` | PI-5 | `Task Group Area` の左端の位置と、右端の 1 px 手前の位置が指す 2 つの日を求める。 |
| `snapMinutesOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#snapMinutesOf` | PI-5 | 寄せの単位（分） —— `FR-103` の 表 T-378 の `SG-1`〜`SG-4` |
| `snappedInstantAtX` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#snappedInstantAtX` | PI-5 | 横の位置を、寄せの単位で寄せた瞬間（分）として読む（`FR-103`） |
| `StackSafetyCapStop` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#StackSafetyCapStop` | -- | interface StackSafetyCapStop |
| `taskGroupAnchorIn` | entry | function | `src/entity/layout-engine/schedule-layout/task-group-scroll.ts#taskGroupAnchorIn` | PI-5 | 表示の上端の y を、`S-78` と `S-176` の組に直す —— 本コンポーネントの縦のスクロールの読み方の逆である。 |
| `taskGroupIndexAtTopEdge` | entry | function | `src/entity/layout-engine/schedule-layout/task-group-scroll.ts#taskGroupIndexAtTopEdge` | PI-5 | 表示の上端の y が、スクロールするタスクグループのどれの区画に入るか（表 T-203 の `S-78` ・ `S-176`）。 |
| `TaskGroupPlacement` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#TaskGroupPlacement` | -- | interface TaskGroupPlacement |
| `taskGroupPlacesAtZoomY` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#taskGroupPlacesAtZoomY` | PI-5 | その倍率でのタスクグループの位置。 |
| `TaskPlacement` | entry | interface | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#TaskPlacement` | -- | interface TaskPlacement |
| `taskPlacement` | entry | function | `src/entity/layout-engine/schedule-layout/schedule-layout.ts#taskPlacement` | PI-5 | どこに載るか |
| `thinEndHalfHeightOf` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#thinEndHalfHeightOf` | PI-5 | 線だけの形（`--->` と端点スパン `SH-4`）の端の印の縦幅の半分 —— 矢じりの縦幅、端点スパンでは両端の点の径（`S-307`）。 |
| `thresholdPxPerDayOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#thresholdPxPerDayOf` | PI-5 | 1 日の幅を 表 T-205 のしきい値と比べる値へ直す（`FR-017` の式 —— 実効の文字の大きさ ÷ `S-8`） |
| `tickStrideOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#tickStrideOf` | PI-5 | 目盛の間引き。 |
| `TimeAxis` | entry | type | `src/entity/layout-engine/schedule-layout/time-axis.ts#TimeAxis` | -- | type TimeAxis = Pick<ScheduleLayout, 'pxPerDay' \| 'originDay' \| 'originX'> |
| `timeAxisOf` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#timeAxisOf` | PI-5 | タスクグループを割り付けずに、時間軸の対応だけを求める。 |
| `xFromDay` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#xFromDay` | PI-5 | その逆向き。 |
| `xOfInstant` | entry | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#xOfInstant` | PI-5 | 瞬間（分）を横の位置へ置く（`05-07-design.md` の 表 T-069 の `RV-1`・`RV-6`、時刻を表示するとき） |
| `zoomYAtRectangleLabelFont` | entry | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#zoomYAtRectangleLabelFont` | PI-5 | 与えた字の大きさに、矩形（表 T-201 の `S-13`）の名称ラベルの字が等しくなる `zoomY`。 |
| `assigneeLabelsOf` | file only | function | `src/entity/layout-engine/schedule-layout/assignee-label.ts#assigneeLabelsOf` | -- | function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> |
| `drawnGroups` | file only | function | `src/entity/layout-engine/schedule-layout/drawn-task-groups.ts#drawnGroups` | -- | function drawnGroups( schedule: Schedule, settings: DocumentSettings, shownTaskUids: ReadonlySet<number> \| null = null, |
| `nameLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/name-label.ts#nameLabelOf` | -- | function nameLabelOf(task: Task, reader: DayReader, datesWithYear: boolean \| null, settings: DrawnSettings): NameLabel |
| `nameLabelWidthOf` | file only | function | `src/entity/layout-engine/schedule-layout/name-label.ts#nameLabelWidthOf` | -- | function nameLabelWidthOf(named: NameLabel, fontSize: number, settings: DrawnSettings): number |
| `outsideLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/percent-label.ts#outsideLabelOf` | -- | function outsideLabelOf(assignee: string, percent: string): string |
| `percentLabelOf` | file only | function | `src/entity/layout-engine/schedule-layout/percent-label.ts#percentLabelOf` | -- | function percentLabelOf(task: Task): string |
| `liftedTaskGroups` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#liftedTaskGroups` | -- | function liftedTaskGroups( taskGroupPlacements: readonly TaskGroupPlacement[], band: |
| `pinnedBandOf` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#pinnedBandOf` | -- | function pinnedBandOf( taskGroupPlacements: readonly TaskGroupPlacement[], settings: DrawnSettings, regions: ScreenRegions, ): |
| `shiftedPlacements` | file only | function | `src/entity/layout-engine/schedule-layout/pinned-band.ts#shiftedPlacements` | -- | function shiftedPlacements( placements: readonly TaskPlacement[], shiftByTaskGroupId: ReadonlyMap<string, number>, droppedPinnedIds: ReadonlySet<string>, ): ... |
| `actualPlacementOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#actualPlacementOf` | -- | function actualPlacementOf(shapeKind: ShapeKind): 'inside' \| 'below' \| 'sideways' |
| `actualReachOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#actualReachOf` | -- | function actualReachOf( shapeKind: ShapeKind, actual: { readonly x: number; readonly width: number }, settings: DrawnSettings, ): number |
| `drawnEdgeOverhangOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#drawnEdgeOverhangOf` | -- | function drawnEdgeOverhangOf(shapeKind: ShapeKind, outlineWidth: number): number |
| `drawnExtentOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#drawnExtentOf` | -- | function drawnExtentOf( shapeKind: ShapeKind, settings: DrawnSettings, outlineWidth: number = settings.planStroke, |
| `isLaidBelow` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#isLaidBelow` | -- | function isLaidBelow(shapeKind: ShapeKind): boolean |
| `labelFontSize` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#labelFontSize` | -- | function labelFontSize(shapeKind: ShapeKind, settings: DrawnSettings): number |
| `labelLiftOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#labelLiftOf` | -- | function labelLiftOf(shapeKind: ShapeKind, settings: DrawnSettings): number |
| `outlineWidthOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#outlineWidthOf` | -- | function outlineWidthOf(strokeWidthPx: number \| null \| undefined, settings: DrawnSettings): number |
| `planHeightOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#planHeightOf` | -- | function planHeightOf(shapeKind: ShapeKind, settings: DrawnSettings): number |
| `shapeHeightOf` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#shapeHeightOf` | -- | function shapeHeightOf(shapeKind: ShapeKind, settings: DrawnSettings): number |
| `zoomYAtPlanHeightFloor` | file only | function | `src/entity/layout-engine/schedule-layout/shape-cross-sections.ts#zoomYAtPlanHeightFloor` | -- | function zoomYAtPlanHeightFloor(settings: DrawnSettings): number |
| `scrolledPlacements` | file only | function | `src/entity/layout-engine/schedule-layout/task-group-scroll.ts#scrolledPlacements` | -- | function scrolledPlacements( placements: readonly TaskPlacement[], offsetY: number, pinnedIdsPlaced: ReadonlySet<string>, ): readonly TaskPlacement[] |
| `scrolledTaskGroups` | file only | function | `src/entity/layout-engine/schedule-layout/task-group-scroll.ts#scrolledTaskGroups` | -- | function scrolledTaskGroups(taskGroups: readonly TaskGroupPlacement[], offsetY: number): readonly TaskGroupPlacement[] |
| `scrollOffsetOf` | file only | function | `src/entity/layout-engine/schedule-layout/task-group-scroll.ts#scrollOffsetOf` | -- | function scrollOffsetOf( taskGroups: readonly TaskGroupPlacement[], settings: DocumentSettings, taskGroupAreaY: number, ): number |
| `serialOf` | file only | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#serialOf` | -- | function serialOf(day: CalendarDay): number |
| `xOnTimeAxis` | file only | function | `src/entity/layout-engine/schedule-layout/time-axis.ts#xOnTimeAxis` | -- | function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number, day: CalendarDay): number |

## ScheduleGeometry (PI-6, `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AnchorSnap` | entry | interface | `src/entity/layout-engine/schedule-geometry/comment-box.ts#AnchorSnap` | PI-6 | 型。 |
| `AnchorSnapPoint` | entry | type | `src/entity/layout-engine/schedule-geometry/comment-box.ts#AnchorSnapPoint` | -- | type AnchorSnapPoint = NonNullable<CommentBox['anchorSnapPoint']> |
| `anchorSnapsOf` | entry | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#anchorSnapsOf` | PI-6 | 描いたタスクの図形とハイライトボックスの、線先が吸着できる 8 点の並び（`LF-15`）。 |
| `AnchorTarget` | entry | type | `src/entity/layout-engine/schedule-geometry/comment-box.ts#AnchorTarget` | -- | type AnchorTarget = \| |
| `AnchorTaskFigure` | entry | type | `src/entity/layout-engine/schedule-geometry/comment-box.ts#AnchorTaskFigure` | -- | type AnchorTaskFigure = NonNullable<CommentBox['anchorTaskFigure']> |
| `arrowHeadOf` | entry | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#arrowHeadOf` | PI-6 | 描いた依存線の矢じりの 3 点 —— 先端と、底辺の両端（高さは 表 T-201 の `S-19`、底辺は `S-300`）。 |
| `BarGeometry` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#BarGeometry` | -- | type BarGeometry = \| |
| `commentAnchorPointOf` | entry | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#commentAnchorPointOf` | PI-6 | コメントボックスの線先を描く点 —— `LF-15`（自由点か、吸着した対象の 8 点の 1 つ）。 |
| `CommentGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#CommentGeometry` | PI-6 | 型。 |
| `ContinuationGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ContinuationGeometry` | -- | interface ContinuationGeometry |
| `DeadlineGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DeadlineGeometry` | -- | interface DeadlineGeometry |
| `DependencyGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DependencyGeometry` | PI-6 | 型。 |
| `DualCursorGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DualCursorGeometry` | -- | interface DualCursorGeometry |
| `DummyGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#DummyGeometry` | -- | interface DummyGeometry |
| `Elision` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#Elision` | -- | type Elision = 'EL-3' \| 'EL-4' \| 'EL-5' \| 'EL-6' |
| `FarEndGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#FarEndGeometry` | -- | interface FarEndGeometry |
| `freeAnchorPointOf` | entry | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#freeAnchorPointOf` | PI-6 | 自由点の線先を描く点 —— `LF-15` の自由点の段（日時の横、帯の中の高さの縦）。 |
| `geometryFromLayout` | entry | function | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#geometryFromLayout` | PI-6 | function geometryFromLayout( schedule: Schedule, storedSettings: DocumentSettings, layout: ScheduleLayout, regions: ScreenRegions, selection: Selection, dual... |
| `GeometryInputs` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#GeometryInputs` | -- | interface GeometryInputs |
| `HighlightGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#HighlightGeometry` | PI-6 | 型。 |
| `isLinkInBand` | entry | function | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#isLinkInBand` | PI-6 | 依存線を、ピン止めの帯（`01-04-requirements.md` の `FR-098`）の中に描くかを答える —— 帯に留めた `Task` の集合と、線の省き方（同書の 表 T-303 の `EL-4` ／ `EL-5`）から決める。 |
| `leaderOf` | entry | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#leaderOf` | PI-6 | そのコメントボックスの引出し線。 |
| `MarkerGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#MarkerGeometry` | -- | interface MarkerGeometry |
| `MilestoneLayer` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#MilestoneLayer` | -- | interface MilestoneLayer |
| `MilestoneLayerRole` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#MilestoneLayerRole` | -- | type MilestoneLayerRole = 'body' \| 'inner' \| 'dot' \| 'shade' |
| `NOT_STORED_DUMMY_SIZES` | entry | const | `src/entity/layout-engine/schedule-geometry/task-figures.ts#NOT_STORED_DUMMY_SIZES` | -- | const NOT_STORED_DUMMY_SIZES: |
| `ParentTaskFamilies` | entry | interface | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#ParentTaskFamilies` | PI-6 | 型。 |
| `Path` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#Path` | -- | type Path = readonly Point[] |
| `PathSegment` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#PathSegment` | -- | type PathSegment = \| { readonly command: 'M' \| 'L'; readonly to: Point } \| { readonly command: 'Q'; readonly control: Point; readonly to: Point } \| |
| `Point` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#Point` | -- | interface Point |
| `point` | entry | function | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#point` | -- | function point(x: number, y: number): Point |
| `ProgressSymbol` | entry | type | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ProgressSymbol` | -- | type ProgressSymbol = ReturnType<typeof progressMarkerOf> |
| `ResumeGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ResumeGeometry` | -- | interface ResumeGeometry |
| `ScheduleGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#ScheduleGeometry` | PI-6 | 型 |
| `selectedLinksOf` | entry | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#selectedLinksOf` | PI-6 | 選んでいる依存線（表 T-023c の `SL-8`）を、先行と後続の `UID` の対の鍵の集合で答える。 |
| `SpanDot` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#SpanDot` | -- | interface SpanDot |
| `TaskGeometry` | entry | interface | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts#TaskGeometry` | -- | interface TaskGeometry |
| `AnchorSurroundings` | file only | interface | `src/entity/layout-engine/schedule-geometry/comment-box.ts#AnchorSurroundings` | -- | interface AnchorSurroundings |
| `commentGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/comment-box.ts#commentGeometry` | -- | function commentGeometry( schedule: Schedule, settings: DrawnSettings, layout: ScheduleLayout, snaps: readonly AnchorSnap[], ): readonly CommentGeometry[] |
| `hasPlanDates` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#hasPlanDates` | -- | function hasPlanDates(task: Task): boolean |
| `isAtLeastDrawnPx` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#isAtLeastDrawnPx` | -- | function isAtLeastDrawnPx(value: number, bound: number): boolean |
| `laneSpansOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#laneSpansOf` | -- | function laneSpansOf(layout: ScheduleLayout, settings: DrawnSettings): readonly LaneSpan[] |
| `LinkEnd` | file only | interface | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#LinkEnd` | -- | interface LinkEnd |
| `placedEndOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#placedEndOf` | -- | function placedEndOf(placed: TaskPlacement, settings: DrawnSettings): LinkEnd |
| `plannedPlacementsOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#plannedPlacementsOf` | -- | function plannedPlacementsOf(inputs: GeometryInputs): readonly TaskPlacement[] |
| `routedDependency` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#routedDependency` | -- | function routedDependency(inputs: GeometryInputs, predecessor: SightedEnd, successor: SightedEnd, linkType: number, elision: Elision, lanes: readonly LaneSpa... |
| `SightedEnd` | file only | interface | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#SightedEnd` | -- | interface SightedEnd |
| `standingEndOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#standingEndOf` | -- | function standingEndOf(taskUid: number, x: number, width: number, y: number): LinkEnd |
| `unseenEndStubOf` | file only | function | `src/entity/layout-engine/schedule-geometry/dependency-route.ts#unseenEndStubOf` | -- | function unseenEndStubOf(from: Point, toward: number, settings: DrawnSettings): |
| `DualCursorDates` | file only | interface | `src/entity/layout-engine/schedule-geometry/dual-cursor.ts#DualCursorDates` | -- | interface DualCursorDates |
| `dualCursorGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/dual-cursor.ts#dualCursorGeometry` | -- | function dualCursorGeometry( placed: DualCursorDates \| null, layout: ScheduleLayout, regions: ScreenRegions, ): DualCursorGeometry \| null |
| `drawnAnnotationNumber` | file only | function | `src/entity/layout-engine/schedule-geometry/highlight-box.ts#drawnAnnotationNumber` | -- | function drawnAnnotationNumber(held: number \| null, row: AnnotationNumberRow): number |
| `drawnCommentTextSizePx` | file only | function | `src/entity/layout-engine/schedule-geometry/highlight-box.ts#drawnCommentTextSizePx` | -- | function drawnCommentTextSizePx(held: number \| null, stepSizePx: number): number |
| `highlightGeometry` | file only | function | `src/entity/layout-engine/schedule-geometry/highlight-box.ts#highlightGeometry` | -- | function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] |
| `ParentTaskArrowGeometry` | file only | interface | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#ParentTaskArrowGeometry` | -- | interface ParentTaskArrowGeometry |
| `ParentTaskCandidateGeometry` | file only | interface | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#ParentTaskCandidateGeometry` | -- | interface ParentTaskCandidateGeometry |
| `ParentTaskGeometry` | file only | interface | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#ParentTaskGeometry` | -- | interface ParentTaskGeometry |
| `parentTaskGeometryOf` | file only | function | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#parentTaskGeometryOf` | -- | function parentTaskGeometryOf(inputs: GeometryInputs, families: ParentTaskFamilies \| null): ParentTaskGeometry |
| `ParentTaskQueryGeometry` | file only | interface | `src/entity/layout-engine/schedule-geometry/parent-task-arrows.ts#ParentTaskQueryGeometry` | -- | interface ParentTaskQueryGeometry |
| `guidesOf` | file only | function | `src/entity/layout-engine/schedule-geometry/plan-actual-guides.ts#guidesOf` | -- | function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement, actualHeight: number): readonly Path[] |
| `progressLineOf` | file only | function | `src/entity/layout-engine/schedule-geometry/progress-line.ts#progressLineOf` | -- | function progressLineOf(inputs: GeometryInputs): Path |
| `isThinShape` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#isThinShape` | -- | function isThinShape(shapeKind: ShapeKind): boolean |
| `taskGeometryOf` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#taskGeometryOf` | -- | function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry |
| `thinTierMiddle` | file only | function | `src/entity/layout-engine/schedule-geometry/task-figures.ts#thinTierMiddle` | -- | function thinTierMiddle(placed: TaskPlacement, settings: DrawnSettings, isActual: boolean): number |

## ItemHitArea (PI-7, `src/entity/layout-engine/item-hit-area/item-hit-area.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `anchorSnapAt` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#anchorSnapAt` | PI-7 | 離した点（押した点）が吸着するコメントボックスの線先の点 —— 縦と横へそれぞれ `S-292` の正方形の中で、いちばん近い点。 |
| `answersAtPointer` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#answersAtPointer` | PI-7 | `PointerWalk` と点から、押したときの当たりと、説明の持ち主（表 T-040 の `EZ-6`）を 1 度の歩きで答える。 |
| `BandCut` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#BandCut` | -- | type BandCut = NonNullable<ScheduleGeometry['pinnedBand']> \| null |
| `bottomOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#bottomOf` | -- | function bottomOf(box: ScreenRect): number |
| `boxOfPath` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#boxOfPath` | -- | function boxOfPath(points: Path): ScreenRect \| null |
| `BoxPart` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#BoxPart` | -- | type BoxPart = \| { readonly kind: 'body' } \| { readonly kind: 'anchor' } \| { readonly kind: 'leader' } \| |
| `cutRect` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#cutRect` | -- | function cutRect(box: ScreenRect \| null, cut: BandCut, isCut: boolean): ScreenRect \| null |
| `DependencyEnd` | entry | interface | `src/entity/layout-engine/item-hit-area/dependency-end.ts#DependencyEnd` | -- | interface DependencyEnd |
| `dependencyEndAtPointer` | entry | function | `src/entity/layout-engine/item-hit-area/dependency-end.ts#dependencyEndAtPointer` | PI-7 | `FR-009` の「左半分 / 右半分」を答える。 |
| `dependencyItemOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#dependencyItemOf` | -- | function dependencyItemOf(line: DependencyGeometry): Item |
| `dependencyStartOfHit` | entry | function | `src/entity/layout-engine/item-hit-area/dependency-end.ts#dependencyStartOfHit` | PI-7 | 押したときの当たり（`itemAtPointer` の答え）から、引き出す依存線の起点を答える。 |
| `GrabArea` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#GrabArea` | PI-7 | 掴んだ所の型 —— `FR-104` の 表 T-266 と 表 T-023d の行 ID の集合。 |
| `GrabSizes` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#GrabSizes` | -- | type GrabSizes = typeof NOT_STORED_SIZES |
| `grabSizesOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#grabSizesOf` | PI-7 | `itemAtPointer` に渡す掴み代の大きさを、`_assets/tbl-settings.md` の 表 T-206 の掴み代の行（`01-04-requirements.md` の `FR-104` の 表 T-266 が読む `S-250` 〜 `S-290` と、`S-137` / `S-230`... |
| `grown` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#grown` | -- | function grown(box: ScreenRect, across: number, down: number): ScreenRect |
| `HintHolder` | entry | interface | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#HintHolder` | -- | interface HintHolder |
| `Hit` | entry | interface | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#Hit` | -- | interface Hit |
| `isCutAway` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isCutAway` | -- | function isCutAway(cut: BandCut, isCut: boolean, y: number): boolean |
| `isInsideRect` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isInsideRect` | PI-7 | 点が矩形の中（縁を含む）にあるかを答える。 |
| `isLineScrolling` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isLineScrolling` | -- | function isLineScrolling(cut: BandCut, line: DependencyGeometry, isWholeRoute: boolean): boolean |
| `isOnTheDrawnShape` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isOnTheDrawnShape` | -- | function isOnTheDrawnShape(shape: TaskShape, x: number, y: number): boolean |
| `isScrolling` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#isScrolling` | -- | function isScrolling(cut: BandCut, taskUid: number): boolean |
| `isTaskDrawn` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#isTaskDrawn` | PI-7 | 1 つのタスクの幾何が、表 T-023c の結びの「描かれている」に当たるかを答える —— 予定・実績・実績のダミー（表 T-240）のどれかが在れば真とする。 |
| `Item` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#Item` | -- | type Item = \| { readonly kind: 'task'; readonly taskUid: number } \| { readonly kind: 'dependency'; readonly predecessorUid: number; readonly successorUid: nu... |
| `itemAtPointer` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#itemAtPointer` | PI-7 | 対象は 表 T-023c の `SL-1`。 |
| `itemsInMarquee` | entry | function | `src/entity/layout-engine/item-hit-area/marquee.ts#itemsInMarquee` | PI-7 | `SL-3`。 |
| `merged` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#merged` | -- | function merged(a: ScreenRect \| null, b: ScreenRect \| null): ScreenRect \| null |
| `PointerAnswers` | entry | interface | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#PointerAnswers` | PI-7 | 型。 |
| `PointerResolution` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#PointerResolution` | -- | type PointerResolution = 'press' \| 'doubleClick' \| 'hint' |
| `PointerWalk` | entry | interface | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#PointerWalk` | PI-7 | 型。 |
| `pointerWalkOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#pointerWalkOf` | PI-7 | 描いた幾何と掴み代の大きさ（`grabSizesOf` の答え）から、点に依らない当たりの領域 —— タスクの形・掴みの領域・依存線の領域・期限の箱 —— を 1 度に組んで答える。 |
| `rightOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#rightOf` | -- | function rightOf(box: ScreenRect): number |
| `selectionWithinDrawn` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#selectionWithinDrawn` | PI-7 | 選択から、幾何に描かれていないタスクを外した選択を答える。 |
| `selectionWithinDrawnTaskGroups` | entry | function | `src/entity/layout-engine/item-hit-area/drawn-selection.ts#selectionWithinDrawnTaskGroups` | PI-7 | `selectionWithinDrawn` の答えに、表 T-023c が名指さないタスクグループ —— ピン止めの帯に入りきらないタスクグループ（`FR-098`）と、段数の安全弁（表 T-014 の `ST-7`）が置かなかったタスクグループ —— のタスクを戻した選択を答える。 |
| `shapeOf` | entry | function | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#shapeOf` | -- | function shapeOf(task: TaskGeometry): TaskShape |
| `TaskShape` | entry | type | `src/entity/layout-engine/item-hit-area/item-hit-area.ts#TaskShape` | -- | type TaskShape = |

## ApplyDocumentChange (PI-8, `src/use-case/apply-document-change/apply-document-change.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `applyDocumentChange` | entry | function | `src/use-case/apply-document-change/apply-document-change.ts#applyDocumentChange` | PI-8 | `non-pure`。 |
| `ApplyOutcome` | entry | type | `src/use-case/apply-document-change/apply-document-change.ts#ApplyOutcome` | -- | type ApplyOutcome = \| { readonly ok: false; readonly refusal: PlanRefusal } \| |
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
| `ReplacementCall` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementCall` | -- | type ReplacementCall = \| { readonly row: 'RD-1'; readonly writer?: string } \| { readonly row: 'RD-2'; readonly writer?: string } \| |
| `ReplacementInput` | entry | interface | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementInput` | -- | interface ReplacementInput |
| `ReplacementRefusal` | entry | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementRefusal` | -- | type ReplacementRefusal = \| StampRefusal \| MomentRefusal \| StepOwnerRefusal \| |
| `ReplaceOutcome` | entry | type | `src/use-case/apply-document-change/apply-document-change.ts#ReplaceOutcome` | PI-8 | まるごと差し替えた結果（`05-07-design.md` の 表 T-230）。 |
| `SettingsLimits` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#SettingsLimits` | -- | interface SettingsLimits |
| `WriteMoment` | entry | interface | `src/use-case/apply-document-change/document-change-plan.ts#WriteMoment` | -- | interface WriteMoment |
| `ChangePlan` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#ChangePlan` | -- | type ChangePlan = \| { readonly ok: false; readonly refusal: PlanRefusal } \| |
| `MomentRefusal` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#MomentRefusal` | -- | type MomentRefusal = |
| `planDocumentChange` | file only | function | `src/use-case/apply-document-change/document-change-plan.ts#planDocumentChange` | -- | function planDocumentChange(input: PlanInput): ChangePlan |
| `planDocumentReplacement` | file only | function | `src/use-case/apply-document-change/document-change-plan.ts#planDocumentReplacement` | -- | function planDocumentReplacement(input: ReplacementInput): ReplacementPlan |
| `ReplacementPlan` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#ReplacementPlan` | -- | type ReplacementPlan = \| { readonly ok: false; readonly refusal: ReplacementRefusal } \| |
| `StampRefusal` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#StampRefusal` | -- | type StampRefusal = { readonly step: 'WS-1'; readonly reason: 'staleStamp' } |
| `StepOwnerRefusal` | file only | type | `src/use-case/apply-document-change/document-change-plan.ts#StepOwnerRefusal` | -- | type StepOwnerRefusal = { readonly step: 'WS-3'; readonly reason: 'noStepToMove' \| 'notOwnStep' } |

## EditDocument (PI-9, `src/use-case/edit-document/edit-document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `acceptedEdit` | entry | function | `src/use-case/edit-document/edit-document.ts#acceptedEdit` | -- | function acceptedEdit(document: Document, report: EditReport = NOTHING_TO_TELL): EditResult |
| `ActualGrabHold` | entry | type | `src/use-case/edit-document/edit-task.ts#ActualGrabHold` | -- | type ActualGrabHold = Extract<TaskCommand, { readonly kind: 'beginTaskActual' }>['grabbed'] |
| `AnnotationAnchor` | entry | interface | `src/use-case/edit-document/edit-annotation.ts#AnnotationAnchor` | PI-9 | 型。 |
| `AnnotationCommand` | entry | type | `src/use-case/edit-document/edit-annotation.ts#AnnotationCommand` | -- | type AnnotationCommand = \| |
| `baseChangeCommandOf` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#baseChangeCommandOf` | PI-9 | 選んだタイムゾーンと答え（換算して適用する ／ 換算しない）で基準を変える命令（表 T-108 の `CM-95`、または `CM-94` と `CM-95` の 2 つを 1 回の書き込みで） —— 当てても何も変わらないときは無い（`FR-156`、表 T-369 の `FO-14` の答え） |
| `BaseChangeWay` | entry | type | `src/use-case/edit-document/edit-document-settings.ts#BaseChangeWay` | -- | type BaseChangeWay = 'keepGlobalTime' \| 'keepLocalTime' |
| `BaseTimeZones` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#BaseTimeZones` | -- | interface BaseTimeZones |
| `baseTimeZonesAfterChange` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#baseTimeZonesAfterChange` | -- | function baseTimeZonesAfterChange(held: BaseTimeZones, chosenRegion: string, chosenWay: BaseChangeWay): BaseTimeZones |
| `CalendarCommand` | entry | type | `src/use-case/edit-document/edit-calendar.ts#CalendarCommand` | -- | type CalendarCommand = \| |
| `CommandRefusal` | entry | interface | `src/use-case/edit-document/edit-document.ts#CommandRefusal` | -- | interface CommandRefusal |
| `confirmationOwedBy` | entry | function | `src/use-case/edit-document/deletion-confirmations.ts#confirmationOwedBy` | PI-9 | 削除の書き込みの束が 表 T-234 の問い（`QN-1`・`QN-2`・`QN-10`）を負うかを決め、負うなら消える `Task` の名を挙げた問いを返す —— 連鎖は 表 T-050 の `CD-1`・`CD-2`・`CD-6` |
| `confirmationOwedByResourceDeletion` | entry | function | `src/use-case/edit-document/deletion-confirmations.ts#confirmationOwedByResourceDeletion` | PI-9 | 担当の削除が解く割当があるときの `QN-3` の問い —— `CD-5` |
| `CycledPlanActual` | entry | interface | `src/use-case/edit-document/task-plan-actual.ts#CycledPlanActual` | -- | interface CycledPlanActual |
| `CycleSurroundings` | entry | interface | `src/use-case/edit-document/task-plan-actual.ts#CycleSurroundings` | -- | interface CycleSurroundings |
| `cycleTaskPlanActualState` | entry | function | `src/use-case/edit-document/task-plan-actual.ts#cycleTaskPlanActualState` | PI-9 | 表 T-108 の `CM-15` の効果を求める。 |
| `DeletionQuestion` | entry | interface | `src/use-case/edit-document/deletion-confirmations.ts#DeletionQuestion` | PI-9 | 型。 |
| `DependencyCommand` | entry | type | `src/use-case/edit-document/edit-dependency.ts#DependencyCommand` | -- | type DependencyCommand = \| |
| `DependencyEdge` | entry | type | `src/use-case/edit-document/edit-dependency.ts#DependencyEdge` | -- | type DependencyEdge = 'start' \| 'finish' |
| `DocumentCommand` | entry | type | `src/use-case/edit-document/edit-document.ts#DocumentCommand` | -- | type DocumentCommand = \| TaskCommand \| TaskGroupCommand \| DependencyCommand \| AnnotationCommand \| ResourceCommand \| CalendarCommand \| ProjectCommand \| WholeS... |
| `DocumentSettingsCommand` | entry | type | `src/use-case/edit-document/edit-document-settings.ts#DocumentSettingsCommand` | -- | type DocumentSettingsCommand = \| { readonly kind: 'setStackDirection'; readonly stackDirection: DocumentSettings['stackDirection'] } \| |
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
| `editTask` | entry | function | `src/use-case/edit-document/edit-task.ts#editTask` | -- | function editTask(document: Document, command: TaskCommand, defaultTaskGroupName: string): EditResult |
| `editTaskGroup` | entry | function | `src/use-case/edit-document/edit-task-group.ts#editTaskGroup` | -- | function editTaskGroup( document: Document, command: TaskGroupCommand, defaultTaskGroupName: string, ): EditResult |
| `HighlightRange` | entry | interface | `src/use-case/edit-document/edit-annotation.ts#HighlightRange` | -- | interface HighlightRange |
| `InvariantRefusal` | entry | interface | `src/use-case/edit-document/edit-document.ts#InvariantRefusal` | PI-9 | 型。 |
| `InvariantRow` | entry | type | `src/use-case/edit-document/edit-document.ts#InvariantRow` | PI-9 | 型。 |
| `levelZeroWritesFor` | entry | function | `src/use-case/edit-document/task-group-folding.ts#levelZeroWritesFor` | PI-9 | 同じ出来事が書き換える段 0 の値 `levelZeroTreeState` を求める |
| `NOT_STORED_ZOOM_BOUNDS` | entry | const | `src/use-case/edit-document/edit-document.ts#NOT_STORED_ZOOM_BOUNDS` | -- | const NOT_STORED_ZOOM_BOUNDS: |
| `pastedUidsOf` | entry | function | `src/use-case/edit-document/task-paste.ts#pastedUidsOf` | PI-9 | コピー元の `UID` から、`CM-8` がそのコピーに払い出す `UID` への対応 —— `FR-033`。 |
| `PlanActualPlacement` | entry | type | `src/use-case/edit-document/edit-task.ts#PlanActualPlacement` | -- | type PlanActualPlacement = \| { readonly state: 'notStarted' } \| |
| `ProjectCommand` | entry | type | `src/use-case/edit-document/edit-project.ts#ProjectCommand` | -- | type ProjectCommand = \| { readonly kind: 'setProjectTitle'; readonly title: Project['title'] } \| { readonly kind: 'setProjectProfile'; readonly fields: Proje... |
| `ProjectProfileFields` | entry | interface | `src/use-case/edit-document/edit-project.ts#ProjectProfileFields` | -- | interface ProjectProfileFields |
| `recountedPercentComplete` | entry | function | `src/use-case/edit-document/percent-complete.ts#recountedPercentComplete` | PI-9 | 文書の全 `Task` の完了率を日付から数え直し、値が変わった `Task` の uid を答える（`FR-012`）。 |
| `Refusal` | entry | type | `src/use-case/edit-document/edit-document.ts#Refusal` | PI-9 | 型。 |
| `refused` | entry | function | `src/use-case/edit-document/edit-document.ts#refusedEdit` | -- | function refusedEdit(refusals: readonly Refusal[]): EditResult |
| `refusedEdit` | entry | function | `src/use-case/edit-document/edit-document.ts#refusedEdit` | -- | function refusedEdit(refusals: readonly Refusal[]): EditResult |
| `reject` | entry | function | `src/use-case/edit-document/edit-document.ts#reject` | -- | function reject( command: string, rule: string, what: string, reasonCategory?: Refusal['reasonCategory'], ): Refusal |
| `ResourceCommand` | entry | type | `src/use-case/edit-document/edit-resource.ts#ResourceCommand` | -- | type ResourceCommand = \| { readonly kind: 'createResource'; readonly name: Resource['name'] } \| |
| `searchJumpCommands` | entry | function | `src/use-case/edit-document/search-jump.ts#searchJumpCommands` | PI-9 | 飛ぶ書き込み（`searchJumpWrites` の答え）を、1 つの変更として当てる命令の並びにする。 |
| `SearchJumpPlan` | entry | type | `src/use-case/edit-document/search-jump.ts#SearchJumpPlan` | PI-9 | 型。 |
| `searchJumpReachOf` | entry | function | `src/use-case/edit-document/search-jump.ts#searchJumpReachOf` | PI-9 | 飛ぶ先の形が描かれた絵から、表 T-332 の `SJ-5`・`SJ-6` が置き場所を決めるのに読む値を読む —— 形の外接矩形と日付の位置、`Task Group Area` の幅、ピン止めの帯の下に残る高さ、占有（表 T-038）が日付より左へ出ている幅、1 日の幅。 |
| `SearchJumpTarget` | entry | type | `src/use-case/edit-document/search-jump.ts#SearchJumpTarget` | PI-9 | 型。 |
| `searchJumpWrites` | entry | function | `src/use-case/edit-document/search-jump.ts#searchJumpWrites` | PI-9 | 検索の表の行を押して飛ぶときの書き込み —— タスクグループと祖先を展開し、表示を寄せる（`FR-151` の 表 T-332）。 |
| `SettingsLimits` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#SettingsLimits` | PI-9 | 型。 |
| `shownTasksRevealWrites` | entry | function | `src/use-case/edit-document/search-jump.ts#shownTasksRevealWrites` | PI-9 | スケジュールフィルタを掛けているあいだに表示の列で「表示」にしたタスクのタスクグループと祖先を展開する書き込み（`FR-151` の 表 T-353 の `TV-6`、表 T-332 の `SJ-2`）。 |
| `TableView` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#TableView` | PI-9 | 型。 |
| `tableViewOf` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#tableViewOf` | PI-9 | 文書の設定から 1 つの表の見え方を読む（`FR-151`）。 |
| `tableViewsKeptIn` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#tableViewsKeptIn` | PI-9 | 表の見え方から、日程に無い `Task.uid`・`Resource.uid` を外す（表 T-024a の `OP-18`、表 T-050 の `CD-1`・`CD-2`・`CD-5`）。 |
| `TaskCommand` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskCommand` | -- | type TaskCommand = \| |
| `TaskGroupCommand` | entry | type | `src/use-case/edit-document/edit-task-group.ts#TaskGroupCommand` | -- | type TaskGroupCommand = \| |
| `TaskMilestoneGlyph` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskMilestoneGlyph` | -- | type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']> |
| `TaskShapeKind` | entry | type | `src/use-case/edit-document/edit-task.ts#TaskShapeKind` | -- | type TaskShapeKind = NonNullable<TaskVisual['shapeKind']> |
| `timeShiftPreviewOf` | entry | function | `src/use-case/edit-document/edit-project.ts#timeShiftPreviewOf` | PI-9 | タイムシフトの確認（`QN-14`）に出すもの（表 T-377 の `BS-3`）を、書き込む前に数える |
| `TreeStateEvent` | entry | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateEvent` | PI-9 | 型。 |
| `treeStateWritesFor` | entry | function | `src/use-case/edit-document/task-group-folding.ts#treeStateWritesFor` | PI-9 | 表 T-328 の出来事 1 つが書き換えるタスクグループの `treeState` を求める。 |
| `UnimplementedDocumentCommand` | entry | type | `src/use-case/edit-document/edit-document.ts#UnimplementedDocumentCommand` | -- | type UnimplementedDocumentCommand = \| |
| `VisibleElement` | entry | type | `src/use-case/edit-document/edit-document-settings.ts#VisibleElement` | -- | type VisibleElement = \| 'isBaselineVisible' \| 'isPlanVisible' \| 'isActualVisible' \| 'isProgressLineVisible' \| 'isProgressMarkerVisible' \| 'isDateGridLinesVis... |
| `wbsSubtreesOf` | entry | function | `src/use-case/edit-document/edit-task-group.ts#wbsSubtreesOf` | PI-9 | `Task` の集合に、`WBS` の子孫をすべて足した集合 —— `CD-1`。 |
| `WholeScheduleShiftCommand` | entry | type | `src/use-case/edit-document/whole-schedule-shift.ts#WholeScheduleShiftCommand` | -- | type WholeScheduleShiftCommand = \| { readonly kind: 'shiftScheduleToStartDate'; readonly newStartDate: string } // </generated> const COMMAND_ROW = 'CM-99' |
| `wholeScheduleShiftPreviewOf` | entry | function | `src/use-case/edit-document/whole-schedule-shift.ts#wholeScheduleShiftPreviewOf` | PI-9 | 全体日程シフトの確認（`QN-15`）に出すもの（表 T-379 の `WH-11`）を、書き込む前に数える。 |
| `anchorColumnsOf` | file only | function | `src/use-case/edit-document/edit-annotation.ts#anchorColumnsOf` | -- | function anchorColumnsOf(anchor: AnnotationAnchor) |
| `CommentAnchorColumns` | file only | type | `src/use-case/edit-document/edit-annotation.ts#CommentAnchorColumns` | -- | type CommentAnchorColumns = ReturnType<typeof anchorColumnsOf> |
| `commentBoxesReleasedFrom` | file only | function | `src/use-case/edit-document/edit-annotation.ts#commentBoxesReleasedFrom` | -- | function commentBoxesReleasedFrom(schedule: Schedule, gone: ReleasedTargets): readonly CommentBox[] |
| `CommentBoxLeaderShapeKind` | file only | type | `src/use-case/edit-document/edit-annotation.ts#CommentBoxLeaderShapeKind` | -- | type CommentBoxLeaderShapeKind = NonNullable<CommentBox['leaderShapeKind']> |
| `ReleasedTargets` | file only | interface | `src/use-case/edit-document/edit-annotation.ts#ReleasedTargets` | -- | interface ReleasedTargets |
| `TypedLag` | file only | interface | `src/use-case/edit-document/edit-dependency.ts#TypedLag` | -- | interface TypedLag |
| `TypedLagUnit` | file only | type | `src/use-case/edit-document/edit-dependency.ts#TypedLagUnit` | -- | type TypedLagUnit = TypedLag['lagUnit'] |
| `WorkingDayLag` | file only | interface | `src/use-case/edit-document/edit-dependency.ts#WorkingDayLag` | -- | interface WorkingDayLag |
| `documentWithTableViewsKept` | file only | function | `src/use-case/edit-document/edit-document-settings.ts#documentWithTableViewsKept` | -- | function documentWithTableViewsKept(document: Document): Document |
| `isAcceptedDay` | file only | function | `src/use-case/edit-document/edit-project.ts#isAcceptedDay` | -- | function isAcceptedDay(day: CalendarDay): boolean |
| `isInsideWorkingTime` | file only | function | `src/use-case/edit-document/edit-project.ts#isInsideWorkingTime` | -- | function isInsideWorkingTime(spansOf: SpansOfSerial, instant: number, side: 'start' \| 'finish'): boolean |
| `depthOf` | file only | function | `src/use-case/edit-document/edit-task-group.ts#depthOf` | -- | function depthOf(byId: ReadonlyMap<string, TaskGroup>, taskGroup: TaskGroup): number |
| `settledTaskGroup` | file only | function | `src/use-case/edit-document/edit-task-group.ts#settledTaskGroup` | -- | function settledTaskGroup(schedule: Schedule, taskGroup: TaskGroup, defaultTaskGroupName: string): TaskGroup |
| `Subtree` | file only | interface | `src/use-case/edit-document/edit-task-group.ts#Subtree` | -- | interface Subtree |
| `subtreeOf` | file only | function | `src/use-case/edit-document/edit-task-group.ts#subtreeOf` | -- | function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree \| null |
| `TaskGroupCommandOf` | file only | type | `src/use-case/edit-document/edit-task-group.ts#TaskGroupCommandOf` | -- | type TaskGroupCommandOf<K extends TaskGroupCommand['kind']> = Extract< |
| `tasksRankedByTheTaskGroupTree` | file only | function | `src/use-case/edit-document/task-group-order.ts#tasksRankedByTheTaskGroupTree` | -- | function tasksRankedByTheTaskGroupTree(schedule: Schedule): readonly Task[] |
| `withScheduleParts` | file only | function | `src/use-case/edit-document/edit-task-group.ts#withScheduleParts` | -- | function withScheduleParts(document: Document, part: Partial<Schedule>): Document |
| `withTaskGroup` | file only | function | `src/use-case/edit-document/edit-task-group.ts#withTaskGroup` | -- | function withTaskGroup(document: Document, taskGroup: TaskGroup): Document |
| `checkDay` | file only | function | `src/use-case/edit-document/edit-task.ts#checkDay` | -- | function checkDay(text: string): DayCheck |
| `isMilestone` | file only | function | `src/use-case/edit-document/edit-task.ts#isMilestone` | -- | function isMilestone(task: Task): boolean |
| `isSameRecord` | file only | function | `src/use-case/edit-document/edit-task.ts#isSameRecord` | -- | function isSameRecord<T extends object>(a: T, b: T): boolean |
| `PasteLanding` | file only | interface | `src/use-case/edit-document/edit-task.ts#PasteLanding` | -- | interface PasteLanding |
| `repriced` | file only | function | `src/use-case/edit-document/percent-complete.ts#repriced` | -- | function repriced(within: WorkingCalendar, task: Task): Task |
| `visualOf` | file only | function | `src/use-case/edit-document/edit-task.ts#visualOf` | -- | function visualOf(schedule: Schedule, taskUid: number): TaskVisual |
| `withSchedule` | file only | function | `src/use-case/edit-document/edit-task.ts#withSchedule` | -- | function withSchedule(document: Document, schedule: Schedule): Document |
| `withTask` | file only | function | `src/use-case/edit-document/edit-task.ts#withTask` | -- | function withTask(document: Document, next: Task): Document |
| `PercentCompleteRecount` | file only | interface | `src/use-case/edit-document/percent-complete.ts#PercentCompleteRecount` | -- | interface PercentCompleteRecount |
| `SearchJumpLanding` | file only | interface | `src/use-case/edit-document/search-jump.ts#SearchJumpLanding` | -- | interface SearchJumpLanding |
| `SearchJumpReach` | file only | interface | `src/use-case/edit-document/search-jump.ts#SearchJumpReach` | -- | interface SearchJumpReach |
| `resetTaskVisualColors` | file only | function | `src/use-case/edit-document/task-appearance.ts#resetTaskVisualColors` | -- | function resetTaskVisualColors( document: Document, command: Extract<TaskCommand, { readonly kind: 'resetTaskVisualColors' }>, ): EditResult |
| `setTaskFadeDays` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskFadeDays` | -- | function setTaskFadeDays( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskFadeInDays' \| 'setTaskFadeOutDays' }>, task: Task, ): Ed... |
| `setTaskVisualColors` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualColors` | -- | function setTaskVisualColors( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualColors' }>, ): EditResult |
| `setTaskVisualMilestoneGlyph` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualMilestoneGlyph` | -- | function setTaskVisualMilestoneGlyph( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualMilestoneGlyph' }>, ): EditResult |
| `setTaskVisualShapeKind` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualShapeKind` | -- | function setTaskVisualShapeKind( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualShapeKind' }>, task: Task, ): EditResult |
| `setTaskVisualStrokeWidthPx` | file only | function | `src/use-case/edit-document/task-appearance.ts#setTaskVisualStrokeWidthPx` | -- | function setTaskVisualStrokeWidthPx( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskVisualStrokeWidthPx' }>, ): EditResult |
| `createTask` | file only | function | `src/use-case/edit-document/task-create.ts#createTask` | -- | function createTask( document: Document, command: Extract<TaskCommand, { readonly kind: 'createTask' }>, within: WorkingCalendar, ): EditResult |
| `resetTaskGroupTreeStates` | file only | function | `src/use-case/edit-document/task-group-folding.ts#resetTaskGroupTreeStates` | -- | function resetTaskGroupTreeStates(document: Document): EditResult |
| `setTaskGroupTreeState` | file only | function | `src/use-case/edit-document/task-group-folding.ts#setTaskGroupTreeState` | -- | function setTaskGroupTreeState( document: Document, command: TaskGroupCommandOf<'setTaskGroupTreeState'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `TreeStateEffectName` | file only | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateEffectName` | -- | type TreeStateEffectName = \| 'writeLevelZeroCollapsed' \| 'writeLevelZeroAuto' export interface TreeStateTransition |
| `TreeStateEventCarried` | file only | interface | `src/use-case/edit-document/task-group-folding.ts#TreeStateEventCarried` | -- | interface TreeStateEventCarried |
| `TreeStateKey` | file only | type | `src/use-case/edit-document/task-group-folding.ts#TreeStateKey` | -- | type TreeStateKey = \| 'taskGroupTree' \| 'treeStateMachine.auto' \| 'treeStateMachine.collapsed' \| 'treeStateMachine.expanded' \| 'treeStateMachine.temporarilyE... |
| `TreeStateTransition` | file only | interface | `src/use-case/edit-document/task-group-folding.ts#TreeStateTransition` | -- | interface TreeStateTransition |
| `resetTaskGroupColor` | file only | function | `src/use-case/edit-document/task-group-look.ts#resetTaskGroupColor` | -- | function resetTaskGroupColor( document: Document, command: TaskGroupCommandOf<'resetTaskGroupColor'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupColor` | file only | function | `src/use-case/edit-document/task-group-look.ts#setTaskGroupColor` | -- | function setTaskGroupColor( document: Document, command: TaskGroupCommandOf<'setTaskGroupColor'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupMinHeightPx` | file only | function | `src/use-case/edit-document/task-group-look.ts#setTaskGroupMinHeightPx` | -- | function setTaskGroupMinHeightPx( document: Document, command: TaskGroupCommandOf<'setTaskGroupMinHeightPx'>, byId: ReadonlyMap<string, TaskGroup>, ): EditRe... |
| `createTaskGroup` | file only | function | `src/use-case/edit-document/task-group-naming.ts#createTaskGroup` | -- | function createTaskGroup( document: Document, command: TaskGroupCommandOf<'createTaskGroup'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `setTaskGroupName` | file only | function | `src/use-case/edit-document/task-group-naming.ts#setTaskGroupName` | -- | function setTaskGroupName( document: Document, command: TaskGroupCommandOf<'setTaskGroupName'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `moveTaskGroup` | file only | function | `src/use-case/edit-document/task-group-order.ts#moveTaskGroup` | -- | function moveTaskGroup( document: Document, command: TaskGroupCommandOf<'moveTaskGroup'>, byId: ReadonlyMap<string, TaskGroup>, ): EditResult |
| `nearestDerivedTaskUid` | file only | function | `src/use-case/edit-document/task-group-order.ts#nearestDerivedTaskUid` | -- | function nearestDerivedTaskUid( schedule: Schedule, byId: ReadonlyMap<string, TaskGroup>, landing: TaskGroup \| null, passes: (uid: number) => boolean = () =>... |
| `reorderTaskGroupSiblings` | file only | function | `src/use-case/edit-document/task-group-order.ts#reorderTaskGroupSiblings` | -- | function reorderTaskGroupSiblings( document: Document, command: TaskGroupCommandOf<'reorderTaskGroupSiblings'>, byId: ReadonlyMap<string, TaskGroup>, ): Edit... |
| `copiedTask` | file only | function | `src/use-case/edit-document/task-paste.ts#copiedTask` | -- | function copiedTask(one: Task, chosen: ReadonlySet<number>, remap: ReadonlyMap<number, number>): Task |
| `pasteTasks` | file only | function | `src/use-case/edit-document/task-paste.ts#pasteTasks` | -- | function pasteTasks( document: Document, command: Extract<TaskCommand, { readonly kind: 'pasteTasks' }>, within: WorkingCalendar, ): EditResult |
| `withInferredCopyParents` | file only | function | `src/use-case/edit-document/task-paste.ts#withInferredCopyParents` | -- | function withInferredCopyParents( after: Schedule, sources: readonly Task[], copies: readonly Task[], remap: ReadonlyMap<number, number>, ): Task[] |
| `beginTaskActual` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#beginTaskActual` | -- | function beginTaskActual( document: Document, command: Extract<TaskCommand, { readonly kind: 'beginTaskActual' }>, task: Task, within: WorkingCalendar, ): Ed... |
| `cycleTaskPlanActualStateInDocument` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#cycleTaskPlanActualStateInDocument` | -- | function cycleTaskPlanActualStateInDocument( document: Document, command: Extract<TaskCommand, { readonly kind: 'cycleTaskPlanActualState' }>, task: Task, wi... |
| `pastedCopyOf` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#pastedCopyOf` | -- | function pastedCopyOf(task: Task, schedule: Schedule, within: WorkingCalendar): Task |
| `planDatesEdited` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#planDatesEdited` | -- | function planDatesEdited(task: Task, schedule: Schedule, within: WorkingCalendar): Task |
| `setTaskPlanActualState` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#setTaskPlanActualState` | -- | function setTaskPlanActualState( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskPlanActualState' }>, task: Task, within: WorkingC... |
| `setTaskPlanDates` | file only | function | `src/use-case/edit-document/task-plan-actual.ts#setTaskPlanDates` | -- | function setTaskPlanDates( document: Document, command: Extract<TaskCommand, { readonly kind: 'setTaskPlanDates' }>, task: Task, within: WorkingCalendar, ): ... |
| `wholeScheduleShifted` | file only | function | `src/use-case/edit-document/whole-schedule-shift.ts#wholeScheduleShifted` | -- | function wholeScheduleShifted(document: Document, command: WholeScheduleShiftCommand): EditResult |

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
| `SourceJudgment` | entry | type | `src/use-case/import-document/import-document.ts#SourceJudgment` | -- | type SourceJudgment = 'sameMaster' \| 'differentMaster' \| 'undecidable' \| 'notJudged' |
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
| `ImportCandidate` | entry | interface | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportCandidate` | -- | interface ImportCandidate |
| `ImportVerdict` | entry | type | `src/use-case/validate-imported-document/validate-imported-document.ts#ImportVerdict` | -- | type ImportVerdict = \| { readonly ok: true } \| { readonly ok: false; readonly refusals: readonly ValidationRefusal[] } const BYTES_PER_MEGABYTE = 1024 * 1024 |
| `validateImportedDocument` | entry | function | `src/use-case/validate-imported-document/validate-imported-document.ts#validateImportedDocument` | PI-13 | `FR-023` / `NFR-009` |
| `ValidationRefusal` | entry | interface | `src/use-case/validate-imported-document/validate-imported-document.ts#ValidationRefusal` | -- | interface ValidationRefusal |

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

## AgentApiEndpoint (PI-17, `src/adapter/agent-api-endpoint/agent-api-endpoint.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AgentApi` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentApi` | -- | interface AgentApi |
| `AgentApiWiring` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentApiWiring` | -- | interface AgentApiWiring |
| `AgentChangeReceiver` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentChangeReceiver` | -- | type AgentChangeReceiver = (notice: ChangeNotice) => void |
| `AgentExport` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentExport` | -- | type AgentExport<TValue> = \| { readonly ok: true; readonly value: TValue } \| { readonly ok: false; readonly refusal: AgentRefusal } // see AV-6 export type A... |
| `AgentFocusOutcome` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentFocusOutcome` | -- | type AgentFocusOutcome = \| |
| `AgentImportSource` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentImportSource` | -- | type AgentImportSource = \| Document \| { readonly document: Document } \| { readonly text: string } // see AV-8 export interface AgentShownTasks |
| `AgentRefusal` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentRefusal` | -- | interface AgentRefusal |
| `AgentRefusalReason` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentRefusalReason` | -- | type AgentRefusalReason = \| 'staleStamp' \| 'notOwnStep' \| 'gestureInFlight' \| 'editingInPlace' \| 'questionAsked' \| 'deliveringNotices' \| 'commandRefused' \| '... |
| `AgentShownTasks` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentShownTasks` | -- | interface AgentShownTasks |
| `AgentSnapshot` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#AgentSnapshot` | -- | interface AgentSnapshot |
| `AgentWatch` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWatch` | -- | interface AgentWatch |
| `AgentWriteOutcome` | entry | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWriteOutcome` | -- | type AgentWriteOutcome = \| { readonly ok: true; readonly stamp: DocumentStamp; readonly hasUpdatedSchedule: boolean } \| { readonly ok: false; readonly refusa... |
| `AgentWriteRequest` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentWriteRequest` | -- | interface AgentWriteRequest |
| `answerRelayedCall` | entry | function | `src/adapter/agent-api-endpoint/relayed-call.ts#answerRelayedCall` | PI-17 | `non-pure`。 |
| `FrameSnapshot` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#FrameSnapshot` | -- | interface FrameSnapshot |
| `installAgentApi` | entry | function | `src/adapter/agent-api-endpoint/agent-api-endpoint.ts#installAgentApi` | PI-17 | `non-pure`。 |
| `RelayedAnswer` | entry | type | `src/adapter/agent-api-endpoint/relayed-call.ts#RelayedAnswer` | -- | type RelayedAnswer = \| { readonly result: unknown } \| { readonly error: { readonly code: number; readonly message: string } } type ParameterizedMember = |
| `RelayedCall` | entry | type | `src/adapter/agent-api-endpoint/relayed-call.ts#RelayedCall` | -- | type RelayedCall = |
| `RelayedParams` | entry | interface | `src/adapter/agent-api-endpoint/relayed-call.ts#RelayedParams` | -- | interface RelayedParams |
| `ShownTasksHolder` | entry | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#ShownTasksHolder` | -- | interface ShownTasksHolder |
| `SnapshotSource` | entry | interface | `src/adapter/agent-api-endpoint/snapshot-source.ts#SnapshotSource` | PI-17 | 表 T-065 |
| `agentApiMembers` | file only | function | `src/adapter/agent-api-endpoint/agent-api-members.ts#agentApiMembers` | -- | function agentApiMembers(wiring: AgentApiWiring): AgentApi |
| `AgentDelayDiagnostics` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentDelayDiagnostics` | -- | interface AgentDelayDiagnostics extends DelayDiagnosticsReport |
| `AgentImportOutcome` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentImportOutcome` | -- | type AgentImportOutcome = \| { readonly ok: true; readonly stamp: DocumentStamp; readonly hasUpdatedSchedule: boolean } \| { readonly ok: true; readonly asked:... |
| `AgentSavedFile` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentSavedFile` | -- | interface AgentSavedFile |
| `AgentSearchPage` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentSearchPage` | -- | interface AgentSearchPage |
| `AgentTableCell` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentTableCell` | -- | interface AgentTableCell |
| `AgentTableColumn` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentTableColumn` | -- | interface AgentTableColumn |
| `AgentTableRow` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentTableRow` | -- | interface AgentTableRow |
| `AgentTableRows` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AgentTableRows` | -- | type AgentTableRows = \| |
| `AskedSurface` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#AskedSurface` | -- | type AskedSurface = 'U-61' |
| `DelayFixLogSource` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#DelayFixLogSource` | -- | interface DelayFixLogSource |
| `HistoryStepper` | file only | interface | `src/adapter/agent-api-endpoint/agent-api-members.ts#HistoryStepper` | -- | interface HistoryStepper |
| `ImportLanding` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#ImportLanding` | -- | type ImportLanding = \| boolean \| { readonly landed: false; readonly refusals: readonly InvariantRefusal[] } // <generated -- do not edit by hand> // From doc... |
| `messageOf` | file only | function | `src/adapter/agent-api-endpoint/agent-api-members.ts#messageOf` | -- | function messageOf(thrown: unknown): string |
| `VisibilityTable` | file only | type | `src/adapter/agent-api-endpoint/agent-api-members.ts#VisibilityTable` | -- | type VisibilityTable = keyof Document['documentSettings']['tableViews'] |

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
| `commentAnchorAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#commentAnchorAt` | -- | function commentAnchorAt( layout: ScheduleLayout, snapsFrom: Pick<ScheduleGeometry, 'tasks' \| 'highlightBoxes'>, x: number, y: number, ): PlacedCommentAnchor... |
| `compareDay` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#compareDay` | -- | function compareDay(a: CalendarDay, b: CalendarDay): number |
| `CONSUMED_ELSEWHERE` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#CONSUMED_ELSEWHERE` | -- | const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true } |
| `CreatedSubject` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#CreatedSubject` | -- | type CreatedSubject = \| { readonly kind: 'task'; readonly uid: number } \| { readonly kind: 'taskGroup'; readonly taskGroupId: string } \| { readonly kind: 'co... |
| `dayAnchorAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayAnchorAt` | -- | function dayAnchorAt( context: InputContext, x: number, ): Pick<ScrollAnchor, 'scrollDate' \| 'scrollDateFraction'> |
| `dayAtX` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayAtX` | -- | function dayAtX(layout: ScheduleLayout, x: number): CalendarDay \| null |
| `dayFromSerial` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayFromSerial` | -- | function dayFromSerial(serial: number): CalendarDay |
| `dayShift` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayShift` | -- | function dayShift(context: InputContext, fromX: number, toX: number): number |
| `dayShifted` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#dayShifted` | -- | function dayShifted(day: CalendarDay, days: number): CalendarDay |
| `diagnosisRowAskedOf` | entry | function | `src/adapter/input-command-translator/screen-state-input.ts#diagnosisRowAskedOf` | PI-18 | 遅延診断レポートの窓が開いているあいだ（最小化を含む）、`DG-1` 〜 `DG-3` で描いた進捗マーカー（表 T-266 の `GA-18`）を押して離した入力で、そのタスクの行にいまの行の印が付いていなければ、その `Task` の `uid` を答える（`FR-134` の 表 T-346 の `RW-1...` |
| `drawnTaskGroupsCrossed` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#drawnTaskGroupsCrossed` | -- | function drawnTaskGroupsCrossed(taskGroups: readonly TaskGroupPlacement[], fromY: number, toY: number): number |
| `drawnTaskGroupsOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#drawnTaskGroupsOf` | -- | function drawnTaskGroupsOf(layout: ScheduleLayout): readonly TaskGroupPlacement[] |
| `ENTRY` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#ENTRY` | -- | const ENTRY = |
| `escapeContextOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#escapeContextOf` | PI-18 | 入力の文脈から `EscapeContext` を詰める（表 T-028 の `IN-4`、表 T-283）。 |
| `foldsOrNothing` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#foldsOrNothing` | -- | function foldsOrNothing( commands: readonly DocumentCommand[], situation: SpentEntranceSituation \| null, ): TranslatedInput |
| `followingTravel` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#followingTravel` | -- | function followingTravel( at: PointerInput, press: PointerPress, ): { readonly dx: number; readonly dy: number } |
| `GrabTaskGroup` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#GrabTaskGroup` | -- | type GrabTaskGroup = GrabArea |
| `grabTaskGroupOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#grabTaskGroupOf` | -- | function grabTaskGroupOf(hit: Hit): GrabTaskGroup |
| `guideCursorModeOfEntry` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#guideCursorModeOfEntry` | -- | function guideCursorModeOfEntry(entry: string): PressedGuideCursor \| null |
| `hasDraggedPastThreshold` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#hasDraggedPastThreshold` | -- | function hasDraggedPastThreshold(press: PointerPress, at: { readonly x: number; readonly y: number }): boolean |
| `HumanInput` | entry | type | `src/adapter/input-command-translator/input-source.ts#HumanInput` | -- | type HumanInput = PointerInput \| WheelInput \| KeyInput |
| `InPlaceTarget` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#InPlaceTarget` | -- | type InPlaceTarget = \| { readonly kind: 'documentTitle' } \| { readonly kind: 'taskName'; readonly uid: number } \| { readonly kind: 'assignee'; readonly uid: ... |
| `InputAction` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#InputAction` | -- | type InputAction = \| |
| `InputContext` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#InputContext` | -- | interface InputContext |
| `InputModifiers` | entry | interface | `src/adapter/input-command-translator/input-source.ts#InputModifiers` | -- | interface InputModifiers |
| `InputSource` | entry | interface | `src/adapter/input-command-translator/input-source.ts#InputSource` | PI-18 | 表 T-065 |
| `InputWatcher` | entry | type | `src/adapter/input-command-translator/input-source.ts#InputWatcher` | -- | type InputWatcher = (input: HumanInput) => void |
| `isCombo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isCombo` | PI-18 | 修飾キーの組が求める組と一致するかを答える。 |
| `isDateKeepingDrag` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isDateKeepingDrag` | -- | function isDateKeepingDrag(press: Pick<PointerPress, 'at'>): boolean |
| `isLandingMarkKeptBy` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isLandingMarkKeptBy` | PI-18 | 着地の印が出ているとき、その入力が印を残すものか（表 T-303 の `EL-17` ・ `EL-18`）。 |
| `isOnTaskGroupArea` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isOnTaskGroupArea` | -- | function isOnTaskGroupArea(context: InputContext, x: number, y: number): boolean |
| `isParentPickingCtrlClick` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isParentPickingCtrlClick` | -- | function isParentPickingCtrlClick( press: PointerPress, release: { readonly x: number; readonly y: number }, context: Pick<InputContext, 'screen'>, ): boolean |
| `isScrollPositionInForce` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isScrollPositionInForce` | -- | function isScrollPositionInForce( context: InputContext, to: Extract<DocumentCommand, { kind: 'setScrollPosition' }>, ): boolean |
| `isSingleCharacterKey` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isSingleCharacterKey` | -- | function isSingleCharacterKey(key: string): boolean |
| `isSwallowedSecondPress` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isSwallowedSecondPress` | -- | function isSwallowedSecondPress(press: PointerPress, context: InputContext): boolean |
| `isTypedIntoSearchWord` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#isTypedIntoSearchWord` | PI-18 | 焦点が `Search Panel` の入力欄にあるとき、そのキーが欄への打鍵としてブラウザへ渡るものか（`IN-5a`、`FR-151` の 表 T-330 の `SV-5` の `Enter`）。 |
| `KEY` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#KEY` | -- | const KEY = |
| `KeyInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#KeyInput` | -- | interface KeyInput |
| `markerOperatedTaskUidOf` | entry | function | `src/adapter/input-command-translator/screen-state-input.ts#markerOperatedTaskUidOf` | PI-18 | 進捗マーカー（表 T-266 の `GA-18`）を押して離した入力が状態を巡らせたか、引いて実績の終了を動かした入力なら、その `Task` の `uid` を答える（`FR-130`、表 T-270 の `PE-8`・`PE-10`）。 |
| `milestoneGlyphOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#milestoneGlyphOf` | -- | function milestoneGlyphOf(name: string): TaskMilestoneGlyph \| null |
| `nextIssuedUid` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#nextIssuedUid` | -- | function nextIssuedUid(schedule: Schedule): number |
| `NOT_STORED_HOUR_WIDTH_CEILING` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_HOUR_WIDTH_CEILING` | -- | const NOT_STORED_HOUR_WIDTH_CEILING: |
| `NOT_STORED_PROPERTIES_PANEL_FLOOR` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_PROPERTIES_PANEL_FLOOR` | -- | const NOT_STORED_PROPERTIES_PANEL_FLOOR: |
| `NOT_STORED_ROW_BAND_CEILING_SEARCH` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_ROW_BAND_CEILING_SEARCH` | -- | const NOT_STORED_ROW_BAND_CEILING_SEARCH: |
| `NOT_STORED_TASK_GROUP_GRAB_SIZES` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_TASK_GROUP_GRAB_SIZES` | -- | const NOT_STORED_TASK_GROUP_GRAB_SIZES: |
| `NOT_STORED_VISIBLE_DAY_FLOOR` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_VISIBLE_DAY_FLOOR` | -- | const NOT_STORED_VISIBLE_DAY_FLOOR: |
| `NOT_STORED_ZOOM_STEP` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#NOT_STORED_ZOOM_STEP` | -- | const NOT_STORED_ZOOM_STEP: |
| `nothingToDo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#nothingToDo` | -- | function nothingToDo(situation: SpentEntranceSituation \| null): TranslatedInput |
| `panTo` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#panTo` | -- | function panTo(context: InputContext, dx: number, dy: number): TranslatedInput |
| `PlacedCommentAnchor` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#PlacedCommentAnchor` | -- | interface PlacedCommentAnchor |
| `PlacedPlanActual` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#PlacedPlanActual` | -- | type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place'] |
| `placementAt` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#placementAt` | -- | function placementAt(task: Task): PlacedPlanActual \| null |
| `PointerButton` | entry | type | `src/adapter/input-command-translator/input-source.ts#PointerButton` | -- | type PointerButton = 'left' \| 'middle' \| 'right' |
| `pointerDaySerial` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#pointerDaySerial` | -- | function pointerDaySerial(layout: ScheduleLayout, x: number): number \| null |
| `PointerInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#PointerInput` | -- | interface PointerInput |
| `PointerPhase` | entry | type | `src/adapter/input-command-translator/input-source.ts#PointerPhase` | -- | type PointerPhase = 'down' \| 'move' \| 'up' \| 'lost' |
| `PointerPress` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#PointerPress` | -- | interface PointerPress |
| `pressedRowOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#pressedRowOf` | PI-18 | 押下がどの行で始まったかを答える。 |
| `PressRow` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#PressRow` | PI-18 | 型。 |
| `releasedSnapOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#releasedSnapOf` | -- | function releasedSnapOf(context: InputContext, release: PointerInput): number |
| `rememberedActualIn` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#rememberedActualIn` | -- | function rememberedActualIn(context: InputContext, taskUid: number): RememberedActual \| null |
| `screenEventFromFieldCommit` | entry | function | `src/adapter/input-command-translator/screen-state-input.ts#screenEventFromFieldCommit` | PI-18 | 確定した欄のうち、画面の値の下書き（表 T-280 の `baseTimeZoneDraftStateMachine`・`timeShiftDraftStateMachine`・`calendarDraftStateMachine`）へ行くものの出来事 —— `FO-14`・`FO-16`・表 T-344 の `...` |
| `screenEventFromInput` | entry | function | `src/adapter/input-command-translator/screen-state-input.ts#screenEventFromInput` | PI-18 | 入力から画面の値の出来事を 1 つ作る。 |
| `ScrollAnchor` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#ScrollAnchor` | -- | interface ScrollAnchor |
| `scrollAreaTopOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrollAreaTopOf` | -- | function scrollAreaTopOf(context: InputContext): number |
| `ScrollbarAxis` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#ScrollbarAxis` | -- | type ScrollbarAxis = NonNullable<ScreenPart['scrollbarAxis']> |
| `scrolledAnchor` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrolledAnchor` | -- | function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor |
| `scrollingTaskGroupsOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#scrollingTaskGroupsOf` | -- | function scrollingTaskGroupsOf(layout: ScheduleLayout): readonly TaskGroupPlacement[] |
| `selectionFromInput` | entry | function | `src/adapter/input-command-translator/selection-input.ts#selectionFromInput` | PI-18 | 規則は 表 T-023c。 |
| `serialOfDay` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#serialOfDay` | -- | function serialOfDay(day: CalendarDay): number |
| `SpentEntranceSituation` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#SpentEntranceSituation` | PI-18 | 型。 |
| `taskGroupAtY` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupAtY` | -- | function taskGroupAtY(layout: ScheduleLayout, y: number): TaskGroupPlacement \| null |
| `taskGroupBandCeilingOf` | entry | function | `src/adapter/input-command-translator/zoom-and-fit.ts#taskGroupBandCeilingOf` | PI-18 | `FR-016` の縦軸の上限のうち、いちばん高いタスクグループの帯の高さが初めて `Task Group Area` の高さ以上になった倍率を、表 T-253 の手順で探した答え。 |
| `taskGroupDepthOfGroup` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupDepthOfGroup` | -- | function taskGroupDepthOfGroup(context: InputContext, taskGroupId: string): number |
| `taskGroupGrabDepthOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupGrabDepthOf` | -- | function taskGroupGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, taskGroup: TaskGroup): number |
| `TaskGroupGrabLanding` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#TaskGroupGrabLanding` | -- | interface TaskGroupGrabLanding |
| `TaskGroupGrabScroll` | entry | type | `src/adapter/input-command-translator/input-command-translator.ts#TaskGroupGrabScroll` | -- | type TaskGroupGrabScroll = Pick<ScrollAnchor, 'scrollTaskGroupId' \| 'scrollTaskGroupFraction'> |
| `taskGroupRankById` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupRankById` | -- | function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> |
| `taskGroupsAtZoomY` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskGroupsAtZoomY` | -- | function taskGroupsAtZoomY( context: InputContext, measuredWith: DocumentSettings, zoomY: number, ): readonly TaskGroupPlacement[] |
| `taskShapeKindOf` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#taskShapeKindOf` | -- | function taskShapeKindOf(name: string): TaskShapeKind \| null |
| `TranslatedInput` | entry | interface | `src/adapter/input-command-translator/input-command-translator.ts#TranslatedInput` | -- | interface TranslatedInput |
| `UNASSIGNED` | entry | const | `src/adapter/input-command-translator/input-command-translator.ts#UNASSIGNED` | -- | const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false } |
| `WheelInput` | entry | interface | `src/adapter/input-command-translator/input-source.ts#WheelInput` | -- | interface WheelInput |
| `zoomEntranceEndsOf` | entry | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomEntranceEndsOf` | PI-18 | 倍率の 4 つの入口（`IC-12`〜`IC-15`）のそれぞれについて、いま押しても倍率が 1 段も動かない端に在るかを答える（時間の軸は `_assets/tbl-settings.md` の `S-75` の範囲と `S-229`、縦軸は 表 T-262 の `ZE-1`・`ZE-3`）。 |
| `zoomYCeiling` | entry | function | `src/adapter/input-command-translator/input-command-translator.ts#zoomYCeiling` | -- | function zoomYCeiling(context: InputContext): number \| null |
| `commandFromArmed` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromArmed` | -- | function commandFromArmed( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromArmingEntry` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromArmingEntry` | -- | function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput |
| `commandFromDependencyDrag` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromDependencyDrag` | -- | function commandFromDependencyDrag( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromParentTaskDrag` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromParentTaskDrag` | -- | function commandFromParentTaskDrag( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `commandFromParentTaskLinkRelease` | file only | function | `src/adapter/input-command-translator/armed-placement.ts#commandFromParentTaskLinkRelease` | -- | function commandFromParentTaskLinkRelease(release: PointerInput, press: PointerPress): TranslatedInput |
| `displayScaleStep` | file only | function | `src/adapter/input-command-translator/display-scale-steps.ts#displayScaleStep` | -- | function displayScaleStep(context: InputContext, towards: 1 \| -1): TranslatedInput |
| `screenEventFromDualCursorEntry` | file only | function | `src/adapter/input-command-translator/dual-cursor-input.ts#screenEventFromDualCursorEntry` | -- | function screenEventFromDualCursorEntry(context: InputContext): ScreenValuesEvent |
| `screenEventFromDualCursorPress` | file only | function | `src/adapter/input-command-translator/dual-cursor-input.ts#screenEventFromDualCursorPress` | -- | function screenEventFromDualCursorPress( press: PointerPress, context: InputContext, ): ScreenValuesEvent \| null |
| `commandFromPanelDivider` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#commandFromPanelDivider` | -- | function commandFromPanelDivider( panel: NonNullable<ScreenPart['dividerPanel']>, release: PointerInput, press: PointerPress, context: InputContext, ): Trans... |
| `commandFromScrollbar` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#commandFromScrollbar` | -- | function commandFromScrollbar( axis: ScrollbarAxis, release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `paletteFollow` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#paletteFollow` | -- | function paletteFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `screenEventFromPanelDivider` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#screenEventFromPanelDivider` | -- | function screenEventFromPanelDivider( release: PointerInput, press: PointerPress, context: InputContext, ): ScreenValuesEvent \| null |
| `scrollbarFollow` | file only | function | `src/adapter/input-command-translator/frame-drags.ts#scrollbarFollow` | -- | function scrollbarFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `commandFromGrab` | file only | function | `src/adapter/input-command-translator/item-grab.ts#commandFromGrab` | -- | function commandFromGrab( release: PointerInput, press: PointerPress, context: InputContext, ): TranslatedInput |
| `copyDragWrite` | file only | function | `src/adapter/input-command-translator/item-grab.ts#copyDragWrite` | -- | function copyDragWrite(context: InputContext, press: PointerPress, release: PointerInput): TranslatedInput |
| `isContinuationMarkClick` | file only | function | `src/adapter/input-command-translator/item-grab.ts#isContinuationMarkClick` | -- | function isContinuationMarkClick(press: PointerPress, release: PointerInput): boolean |
| `commandFromKey` | file only | function | `src/adapter/input-command-translator/shortcut-keys.ts#commandFromKey` | -- | function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput |
| `isViewScaleKey` | file only | function | `src/adapter/input-command-translator/shortcut-keys.ts#isViewScaleKey` | -- | function isViewScaleKey(input: KeyInput): boolean |
| `commandFromRowGrab` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#commandFromRowGrab` | -- | function commandFromRowGrab( release: PointerInput, press: PointerPress, context: InputContext, heldTaskGroupId: string, ): TranslatedInput |
| `grabbedTaskGroupId` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#grabbedTaskGroupId` | -- | function grabbedTaskGroupId(press: PointerPress): string \| null |
| `taskGroupGrabFollow` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#taskGroupGrabFollow` | -- | function taskGroupGrabFollow(input: PointerInput, context: InputContext): TranslatedInput |
| `taskGroupGrabLandingAt` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#taskGroupGrabLandingAt` | -- | function taskGroupGrabLandingAt( context: InputContext, heldGroupId: string, at: { readonly x: number; readonly y: number }, press: PointerPress, ): TaskGrou... |
| `taskGroupGrabScrollSpeedAt` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#taskGroupGrabScrollSpeedAt` | -- | function taskGroupGrabScrollSpeedAt(pointerY: number, panelTop: number, panelBottom: number): number |
| `taskGroupGrabWheel` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#taskGroupGrabWheel` | -- | function taskGroupGrabWheel(input: WheelInput, context: InputContext): TranslatedInput \| null |
| `taskGroupLiftMovesAfter` | file only | function | `src/adapter/input-command-translator/task-group-grab.ts#taskGroupLiftMovesAfter` | -- | function taskGroupLiftMovesAfter( taskGroups: readonly TaskGroup[], heldGroupId: string, landing: Pick<TaskGroupGrabLanding, 'parentId' \| 'order' \| 'depth'>,... |
| `commandFromRowEntry` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#commandFromRowEntry` | -- | function commandFromRowEntry( entry: string, taskGroupId: string \| null, context: InputContext, ): TranslatedInput |
| `commandFromRowExpanderCloseAll` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#commandFromRowExpanderCloseAll` | -- | function commandFromRowExpanderCloseAll(context: InputContext): TranslatedInput |
| `commandFromRowExpanderOpenAll` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#commandFromRowExpanderOpenAll` | -- | function commandFromRowExpanderOpenAll(context: InputContext): TranslatedInput |
| `commandFromRowExpanderOpenLevelZero` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#commandFromRowExpanderOpenLevelZero` | -- | function commandFromRowExpanderOpenLevelZero(context: InputContext): TranslatedInput |
| `everyTaskGroupDeleted` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#everyTaskGroupDeleted` | -- | function everyTaskGroupDeleted(context: InputContext): TranslatedInput |
| `taskGroupStoodUp` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#taskGroupStoodUp` | -- | function taskGroupStoodUp(context: InputContext, parentTaskGroupId: string \| null): TranslatedInput |
| `treeWritesOf` | file only | function | `src/adapter/input-command-translator/task-group-tree-entrances.ts#treeWritesOf` | -- | function treeWritesOf(context: InputContext, event: TreeStateEvent): readonly DocumentCommand[] |
| `commandFromWheel` | file only | function | `src/adapter/input-command-translator/wheel-input.ts#commandFromWheel` | -- | function commandFromWheel( input: WheelInput, context: InputContext, searchPanelBox: ScreenRect \| null = null, |
| `taskGroupTurnedTo` | file only | function | `src/adapter/input-command-translator/wheel-input.ts#taskGroupTurnedTo` | -- | function taskGroupTurnedTo(context: InputContext, dy: number): TaskGroupAnchor |
| `fitWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#fitWrites` | -- | function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] |
| `isPlaceNamed` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#isPlaceNamed` | -- | function isPlaceNamed( schedule: Schedule, scrollDate: string \| null, scrollTaskGroupId: string \| null, ): boolean |
| `isPlaceSeatedIn` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#isPlaceSeatedIn` | -- | function isPlaceSeatedIn(context: InputContext): boolean |
| `keyZoomFactor` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#keyZoomFactor` | -- | function keyZoomFactor(context: InputContext, isIn: boolean): number |
| `statusLineCentered` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#statusLineCentered` | -- | function statusLineCentered(context: InputContext, date: string): readonly DocumentCommand[] |
| `statusLineWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#statusLineWrites` | -- | function statusLineWrites(context: InputContext): readonly DocumentCommand[] |
| `taskGroupPointIn` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#taskGroupPointIn` | -- | function taskGroupPointIn( taskGroups: readonly TaskGroupPlacement[], anchor: Pick<ScrollAnchor, 'scrollTaskGroupId' \| 'scrollTaskGroupFraction'>, ): number ... |
| `topEdgeIn` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#topEdgeIn` | -- | function topEdgeIn( taskGroups: readonly TaskGroupPlacement[], anchor: Pick<ScrollAnchor, 'scrollTaskGroupId' \| 'scrollTaskGroupFraction'>, ): number \| null |
| `unstoredZoomWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#unstoredZoomWrites` | -- | function unstoredZoomWrites(context: InputContext): readonly DocumentCommand[] |
| `verticalZoomAnswer` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#verticalZoomAnswer` | -- | function verticalZoomAnswer( context: InputContext, factor: number, pointerX: number \| null, pointerY: number \| null, ): TranslatedInput |
| `ZoomEntranceEnds` | file only | interface | `src/adapter/input-command-translator/zoom-and-fit.ts#ZoomEntranceEnds` | -- | interface ZoomEntranceEnds |
| `zoomOnScreen` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomOnScreen` | -- | function zoomOnScreen(context: InputContext): { readonly x: number; readonly y: number } |
| `zoomStepAnswer` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomStepAnswer` | -- | function zoomStepAnswer( context: InputContext, factor: number, zoom: readonly DocumentCommand[], ): TranslatedInput |
| `zoomTimes` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomTimes` | -- | function zoomTimes(context: InputContext, factor: number, axis: 'x' \| 'y'): number |
| `zoomWrites` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomWrites` | -- | function zoomWrites( context: InputContext, zoomX: number \| null, zoomY: number \| null, pointerX: number \| null, pointerY: number \| null, ): readonly Documen... |
| `zoomXCeiling` | file only | function | `src/adapter/input-command-translator/zoom-and-fit.ts#zoomXCeiling` | -- | function zoomXCeiling(context: InputContext, isTimeOfDayVisible: boolean): number \| null |

## SvgRenderer (PI-19, `src/adapter/svg-renderer/svg-renderer.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `achromatic` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#achromatic` | PI-19 | 色を、明度を保ったまま無彩色にした色。 |
| `actualOfCustom` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#actualOfCustom` | -- | function actualOfCustom(hex: string, dark: boolean, monochrome: boolean): string |
| `bandBaselineYOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#bandBaselineYOf` | PI-19 | 帯の箱と字の大きさから、字のベースラインの縦の位置を返す —— 帯の縦の中点から、字の大きさに 表 T-201 の `S-33` を掛けた長さだけ下である。 |
| `BeneathPointerReading` | entry | interface | `src/adapter/svg-renderer/svg-renderer.ts#BeneathPointerReading` | PI-19 | 型。 |
| `beneathPointerReadingOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#beneathPointerReadingOf` | PI-19 | 下の絵（表 T-065 の `IF-1`）が指から読むもの —— ガイドカーソルを描く点・指が中にある実績のダミーのタスク・指が掴み代に載った進捗マーカーのタスクを返す。 |
| `boxOfPoints` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#boxOfPoints` | -- | function boxOfPoints(path: Path): ScreenRect \| null |
| `ChosenColor` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#ChosenColor` | -- | type ChosenColor = (stored: string \| null, form: ColorForm) => string \| null |
| `ColorForm` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#ColorForm` | -- | type ColorForm = keyof PaletteForms |
| `colorOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#colorOf` | PI-19 | 表 T-236 の行 ID と、いまの色の好みから 1 色を返す。 |
| `DualCursorFollow` | entry | interface | `src/adapter/svg-renderer/svg-renderer.ts#DualCursorFollow` | -- | interface DualCursorFollow |
| `emphasizedWidthOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#emphasizedWidthOf` | -- | function emphasizedWidthOf(own: number): number |
| `escaped` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#escaped` | -- | function escaped(text: string): string |
| `figureKey` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#figureKey` | -- | function figureKey(key: string): string |
| `GROUP_GRID_LINE_WIDTH_PX` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#GROUP_GRID_LINE_WIDTH_PX` | PI-19 | `Group Grid Lines` の罫の太さ。 |
| `inkOn` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#inkOn` | PI-19 | 色の上に置く字の色（白か黒）を、その色の明度から返す。 |
| `isScheduleColorRow` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#isScheduleColorRow` | PI-19 | 表 T-236 の行 ID が、`colorOf` の答えられる行（日程の図も塗る行）かを返す。 |
| `jumpLandingRingOf` | entry | function | `src/adapter/svg-renderer/schedule-overlays.ts#jumpLandingRingOf` | PI-19 | 飛んだ先の印の囲みの箱と線の太さと角の丸み（表 T-332 の `SJ-10`、`S-555` ・ `S-556` ・ `S-588`）。 |
| `markerGlyphSvg` | entry | function | `src/adapter/svg-renderer/schedule-task-figures.ts#markerGlyphSvg` | PI-19 | 進捗マーカーの図形を、字 1 つぶんの正方形の SVG にして返す（`FR-133`、表 T-021・表 T-315）。 |
| `marqueeOverlaySvg` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#marqueeOverlaySvg` | PI-19 | 重ねの絵 —— 範囲選択の矩形（表 T-020 の `ZO-6`）だけを持つ SVG を返し、握っていなければ空の文字列を返す。 |
| `NOT_STORED_DELAY_MARK_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DELAY_MARK_SIZES` | -- | const NOT_STORED_DELAY_MARK_SIZES: |
| `NOT_STORED_DEPENDENCY_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DEPENDENCY_SIZES` | -- | const NOT_STORED_DEPENDENCY_SIZES: |
| `NOT_STORED_DUAL_CURSOR_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_DUAL_CURSOR_SIZES` | -- | const NOT_STORED_DUAL_CURSOR_SIZES: |
| `NOT_STORED_JUMP_LANDING_RING_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_JUMP_LANDING_RING_SIZES` | -- | const NOT_STORED_JUMP_LANDING_RING_SIZES: |
| `NOT_STORED_NAME_LABEL_WEIGHT` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_NAME_LABEL_WEIGHT` | -- | const NOT_STORED_NAME_LABEL_WEIGHT: |
| `NOT_STORED_RULER_WEEKDAY_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_RULER_WEEKDAY_SIZES` | -- | const NOT_STORED_RULER_WEEKDAY_SIZES: |
| `NOT_STORED_SELECTION_SIZES` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#NOT_STORED_SELECTION_SIZES` | -- | const NOT_STORED_SELECTION_SIZES: |
| `pointsOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#pointsOf` | -- | function pointsOf(path: Path): string |
| `rounded` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#rounded` | -- | function rounded(value: number): string |
| `RulerClockRow` | entry | interface | `src/adapter/svg-renderer/schedule-grid.ts#RulerClockRow` | PI-19 | 型。 |
| `rulerClockRowsOf` | entry | function | `src/adapter/svg-renderer/schedule-grid.ts#rulerClockRowsOf` | PI-19 | 目盛の時計の段（見せる基準の時の段は `TM-5` のときだけ、表示するタイムゾーンの段は時刻を表示しているあいだ）と、各段のタイムゾーンの鍵・上端・高さ・ラベルの基線（`FR-017`、`FR-156`）。 |
| `SchedulePicture` | entry | type | `src/adapter/svg-renderer/svg-renderer.ts#SchedulePicture` | -- | type SchedulePicture = 'screen' \| 'export' |
| `selectedLineWidth` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#selectedLineWidth` | -- | function selectedLineWidth(own: number, selected: boolean): number |
| `selectionFrameSvg` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#selectionFrameSvg` | -- | function selectionFrameSvg(box: ScreenRect, color: string, key: string): string |
| `svgFromSchedule` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#svgFromSchedule` | PI-19 | `FR-080` |
| `SvgSurface` | entry | interface | `src/adapter/svg-renderer/svg-surface.ts#SvgSurface` | PI-19 | 表 T-065 |
| `swatchOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#swatchOf` | PI-19 | 色の欄の見本の色。 |
| `typefaceAttribute` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#typefaceAttribute` | -- | function typefaceAttribute(): string |
| `ViewerValues` | entry | interface | `src/adapter/svg-renderer/schedule-overlays.ts#ViewerValues` | PI-19 | CR-572 |
| `Watermark` | entry | interface | `src/adapter/svg-renderer/svg-renderer.ts#Watermark` | -- | interface Watermark |
| `WATERMARK_MARKS` | entry | const | `src/adapter/svg-renderer/svg-renderer.ts#WATERMARK_MARKS` | -- | const WATERMARK_MARKS: |
| `bandWidthOf` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#bandWidthOf` | -- | function bandWidthOf(input: Pick<GridInput, 'area' \| 'settings'>): number |
| `GridInput` | file only | interface | `src/adapter/svg-renderer/schedule-grid.ts#GridInput` | -- | interface GridInput |
| `GridParts` | file only | interface | `src/adapter/svg-renderer/schedule-grid.ts#GridParts` | -- | interface GridParts |
| `gridParts` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#gridParts` | -- | function gridParts(input: GridInput): GridParts |
| `rulerSvg` | file only | function | `src/adapter/svg-renderer/schedule-grid.ts#rulerSvg` | -- | function rulerSvg( layout: ScheduleLayout, settings: DrawnSettings, band: ScreenRect, weekStart: number, ground: string, ink: string, rule: string, weekdayWo... |
| `guideCursorPointOf` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#guideCursorPointOf` | -- | function guideCursorPointOf( regions: ScreenRegions, guideCursorMode: ViewerValues['guideCursorMode'], pointer: Point \| null, ): Point \| null |
| `JumpLandingRing` | file only | interface | `src/adapter/svg-renderer/schedule-overlays.ts#JumpLandingRing` | -- | interface JumpLandingRing |
| `jumpLandingRingParts` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#jumpLandingRingParts` | -- | function jumpLandingRingParts( viewer: ViewerValues, input: RingInput & Pick<OverlaysInput, 'drawsOperationState'>, ): { readonly pinned: readonly string[]; ... |
| `OverlayParts` | file only | interface | `src/adapter/svg-renderer/schedule-overlays.ts#OverlayParts` | -- | interface OverlayParts |
| `overlayParts` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#overlayParts` | -- | function overlayParts(input: OverlaysInput): OverlayParts |
| `OverlaysInput` | file only | interface | `src/adapter/svg-renderer/schedule-overlays.ts#OverlaysInput` | -- | interface OverlaysInput |
| `parentTaskParts` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#parentTaskParts` | -- | function parentTaskParts( geometry: ScheduleGeometry, settings: DrawnSettings, themed: (rowId: string) => string, drawsOperationState: boolean, ): readonly s... |
| `watermarkSvg` | file only | function | `src/adapter/svg-renderer/schedule-overlays.ts#watermarkSvg` | -- | function watermarkSvg( area: ScreenRect, pictureWidth: number, mark: Watermark, ink: string, clipId: string, ): string |
| `BaselineOutlineParts` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#BaselineOutlineParts` | -- | interface BaselineOutlineParts |
| `baselineOutlineParts` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#baselineOutlineParts` | -- | function baselineOutlineParts(input: TaskFiguresInput, dash: readonly [number, number]): BaselineOutlineParts |
| `dependencyArrowSvg` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#dependencyArrowSvg` | -- | function dependencyArrowSvg( id: string, settings: Pick<DrawnSettings, 'dependencyArrowLength' \| 'dependencyArrowWidth'>, color: string, ): string |
| `DependencyLinkParts` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#DependencyLinkParts` | -- | interface DependencyLinkParts |
| `dependencyLinkParts` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#dependencyLinkParts` | -- | function dependencyLinkParts(input: DependencyLinksInput): DependencyLinkParts |
| `DependencyLinksInput` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#DependencyLinksInput` | -- | interface DependencyLinksInput |
| `HaloCut` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#HaloCut` | -- | interface HaloCut |
| `landingLinkOf` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#landingLinkOf` | -- | function landingLinkOf(viewer: ViewerValues): string \| null |
| `linkKeyOf` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#linkKeyOf` | -- | function linkKeyOf(link: { readonly predecessorUid: number; readonly successorUid: number }): string |
| `pointerInsideDummyTaskUidsOf` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#pointerInsideDummyTaskUidsOf` | -- | function pointerInsideDummyTaskUidsOf(geometry: ScheduleGeometry, pointer: Point \| null): readonly number[] |
| `pointerOnMarkerTaskUidOf` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#pointerOnMarkerTaskUidOf` | -- | function pointerOnMarkerTaskUidOf(hovered: Hit \| null): number \| null |
| `TaskFigureParts` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#TaskFigureParts` | -- | interface TaskFigureParts |
| `taskFigureParts` | file only | function | `src/adapter/svg-renderer/schedule-task-figures.ts#taskFigureParts` | -- | function taskFigureParts(input: TaskFiguresInput): TaskFigureParts |
| `TaskFiguresInput` | file only | interface | `src/adapter/svg-renderer/schedule-task-figures.ts#TaskFiguresInput` | -- | interface TaskFiguresInput |

## DocumentCodec (PI-20, `src/adapter/document-codec/document-codec.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `AppShell` | entry | interface | `src/adapter/document-codec/app-shell-source.ts#AppShell` | -- | interface AppShell |
| `AppShellReading` | entry | type | `src/adapter/document-codec/app-shell-source.ts#AppShellReading` | -- | type AppShellReading = \| { readonly ok: true; readonly appShell: AppShell } \| { readonly ok: false; readonly what: string } export interface AppShellSource |
| `AppShellSource` | entry | interface | `src/adapter/document-codec/app-shell-source.ts#AppShellSource` | PI-20 | 表 T-065 |
| `commandShapeFaults` | entry | function | `src/adapter/document-codec/grs-json-schema.ts#commandShapeFaults` | PI-20 | `pure`。 |
| `documentFromEmbeddedHtml` | entry | function | `src/adapter/document-codec/embedded-html-codec.ts#documentFromEmbeddedHtml` | PI-20 | `pure`。 |
| `documentFromJson` | entry | function | `src/adapter/document-codec/json-codec.ts#documentFromJson` | PI-20 | function documentFromJson( text: string, greatestKnownSchemaVersion?: string, ): JsonDecoding |
| `documentFromMspdi` | entry | function | `src/adapter/document-codec/mspdi-codec.ts#documentFromMspdi` | PI-20 | function documentFromMspdi(text: string, current: Document): MspdiDecoding |
| `EmbeddedHtmlExport` | entry | type | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlExport` | -- | type EmbeddedHtmlExport = \| { readonly ok: true; readonly html: string } \| { readonly ok: false; readonly fault: EmbeddedHtmlFault } export type EmbeddedHtml... |
| `EmbeddedHtmlFault` | entry | interface | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlFault` | -- | interface EmbeddedHtmlFault |
| `EmbeddedHtmlFaultReason` | entry | type | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlFaultReason` | -- | type EmbeddedHtmlFaultReason = \| 'appShellUnavailable' \| 'unusableElementId' \| 'moreThanOneEntry' export interface EmbeddedHtmlFault |
| `EmbeddedHtmlReading` | entry | type | `src/adapter/document-codec/embedded-html-codec.ts#EmbeddedHtmlReading` | -- | type EmbeddedHtmlReading = \| JsonDecoding \| { readonly ok: false; readonly reason: 'entryCountNotOne'; readonly entryCount: number } const CONTAINER_TYPE = '... |
| `ExchangeFormat` | entry | type | `src/adapter/document-codec/document-codec.ts#ExchangeFormat` | -- | type ExchangeFormat = 'grsJson' \| 'mspdi' \| 'singleHtml' |
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
| `mspdiFromDocument` | entry | function | `src/adapter/document-codec/mspdi-codec.ts#mspdiFromDocument` | PI-20 | function mspdiFromDocument(document: Document, lastSaved: string): MspdiEncoding |
| `MspdiNotice` | entry | interface | `src/adapter/document-codec/mspdi-codec.ts#MspdiNotice` | -- | interface MspdiNotice |
| `collectionNamesOfEntity` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#collectionNamesOfEntity` | -- | function collectionNamesOfEntity(entity: string): readonly string[] |
| `collectSchemaFaults` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#collectSchemaFaults` | -- | function collectSchemaFaults(value: unknown, out: JsonFault[]): void |
| `isMissingKeyFault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#isMissingKeyFault` | -- | function isMissingKeyFault(one: JsonFault): boolean |
| `isTimeText` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#isTimeText` | -- | function isTimeText(text: string): boolean |
| `isUnknownKeyFault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#isUnknownKeyFault` | -- | function isUnknownKeyFault(one: JsonFault): boolean |
| `jsonFault` | file only | function | `src/adapter/document-codec/grs-json-schema.ts#jsonFault` | -- | function jsonFault(at: string, what: string): JsonFault |
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
| `WrittenFadeValues` | file only | interface | `src/adapter/document-codec/mspdi-fade-frames.ts#WrittenFadeValues` | -- | interface WrittenFadeValues |
| `writtenFadeValues` | file only | function | `src/adapter/document-codec/mspdi-fade-frames.ts#writtenFadeValues` | -- | function writtenFadeValues(task: Task, frames: readonly ClaimedFrame[]): WrittenFadeValues |
| `taskGroupsFromTasks` | file only | function | `src/adapter/document-codec/mspdi-imported-task-groups.ts#taskGroupsFromTasks` | -- | function taskGroupsFromTasks(tasks: readonly Task[], maxGroupDepth: number): ImportedTaskGroups |
| `mspdiFault` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#mspdiFault` | -- | function mspdiFault(at: string, what: string): MspdiFault |
| `readXml` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#readXml` | -- | function readXml(text: string): XmlReading |
| `writtenXml` | file only | function | `src/adapter/document-codec/mspdi-xml.ts#writtenXml` | -- | function writtenXml(root: XmlElement, namespace: string): string |
| `XmlElement` | file only | interface | `src/adapter/document-codec/mspdi-xml.ts#XmlElement` | -- | interface XmlElement |

## ImageExporter (PI-21, `src/adapter/image-exporter/image-exporter.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `exportPng` | entry | function | `src/adapter/image-exporter/image-exporter.ts#exportPng` | PI-21 | `semi-pure-b`。 |
| `ExportScene` | entry | interface | `src/adapter/image-exporter/image-exporter.ts#ExportScene` | -- | interface ExportScene |
| `exportSvg` | entry | function | `src/adapter/image-exporter/image-exporter.ts#exportSvg` | PI-21 | 表 T-076 が「描く」とした UI パーツを組み立てて返す。 |
| `ImageExport` | entry | type | `src/adapter/image-exporter/image-exporter.ts#ImageExport` | -- | type ImageExport = \| ({ readonly ok: true } & SvgPicture & { readonly png: Rastering }) \| { readonly ok: false; readonly fault: ImageExportFault } /** @purit... |
| `ImageExportFault` | entry | interface | `src/adapter/image-exporter/image-exporter.ts#ImageExportFault` | -- | interface ImageExportFault |
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
| `DocumentFileSaving` | entry | type | `src/adapter/file-gateway/file-gateway.ts#DocumentFileSaving` | -- | type DocumentFileSaving = \| { readonly ok: true; readonly openedFile: OpenedFileState } \| { readonly ok: false; readonly fault: DocumentFileFault } // see SX... |
| `DocumentIdentity` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#DocumentIdentity` | -- | interface DocumentIdentity extends ProjectIdentity |
| `FileReading` | entry | type | `src/adapter/file-gateway/file-store.ts#FileReading` | -- | type FileReading = \| |
| `FileStore` | entry | interface | `src/adapter/file-gateway/file-store.ts#FileStore` | PI-22 | 表 T-065 |
| `FileStoreFault` | entry | interface | `src/adapter/file-gateway/file-store.ts#FileStoreFault` | -- | interface FileStoreFault |
| `FileStoreFaultReason` | entry | type | `src/adapter/file-gateway/file-store.ts#FileStoreFaultReason` | -- | type FileStoreFaultReason = \| 'canceled' \| 'permissionLost' \| 'noOpenedFile' \| 'unavailable' export interface FileStoreFault |
| `FileWriting` | entry | type | `src/adapter/file-gateway/file-store.ts#FileWriting` | -- | type FileWriting = \| { readonly ok: true; readonly openedFile: OpenedFileState } \| { readonly ok: false; readonly fault: FileStoreFault } export type ChosenW... |
| `openDocumentFile` | entry | function | `src/adapter/file-gateway/file-gateway.ts#openDocumentFile` | PI-22 | `semi-pure-b` |
| `OpenedDocumentFile` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#OpenedDocumentFile` | -- | interface OpenedDocumentFile |
| `OpenedFileContent` | entry | interface | `src/adapter/file-gateway/file-store.ts#OpenedFileContent` | -- | interface OpenedFileContent |
| `OpenedFileState` | entry | type | `src/adapter/file-gateway/file-store.ts#OpenedFileState` | -- | type OpenedFileState = \| { readonly kind: 'none' } \| { readonly kind: 'writable'; readonly fileName: string } \| { readonly kind: 'permissionLost'; readonly f... |
| `OpenRoute` | entry | type | `src/adapter/file-gateway/file-store.ts#OpenRoute` | -- | type OpenRoute = 'chooser' \| 'drop' \| 'reopen' \| 'baseline' |
| `ProjectIdentity` | entry | interface | `src/adapter/file-gateway/file-gateway.ts#ProjectIdentity` | -- | interface ProjectIdentity |
| `saveDocumentFile` | entry | function | `src/adapter/file-gateway/file-gateway.ts#saveDocumentFile` | PI-22 | `non-pure` |
| `SaveFileContent` | entry | type | `src/adapter/file-gateway/file-gateway.ts#SaveFileContent` | -- | type SaveFileContent = \| { readonly text: string } \| { readonly bytes: Uint8Array } export interface ProjectIdentity |
| `SaveFileForm` | entry | type | `src/adapter/file-gateway/file-gateway.ts#SaveFileForm` | -- | type SaveFileForm = 'IO-2' \| 'IO-1' \| 'IO-7' \| 'IO-3' \| 'IO-4' |

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
| `AgentApiRelayLink` | file only | interface | `src/framework/single-html-shell/agent-api-relay-link.ts#AgentApiRelayLink` | -- | interface AgentApiRelayLink |
| `openAgentApiRelayLink` | file only | function | `src/framework/single-html-shell/agent-api-relay-link.ts#openAgentApiRelayLink` | -- | function openAgentApiRelayLink( api: AgentApi, place: RelayPlace, openSocket: (address: string) => WebSocket, onLost: () => void = () => undefined, |
| `RelayPlace` | file only | type | `src/framework/single-html-shell/agent-api-relay-link.ts#RelayPlace` | -- | type RelayPlace = Pick<Location, 'hash' \| 'host'> |
| `beneathPictureHoldOf` | file only | function | `src/framework/single-html-shell/beneath-picture-hold.ts#beneathPictureHoldOf` | -- | function beneathPictureHoldOf(): (...inputs: BeneathPictureInputs) => string |
| `clearBrowserStoredForReset` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#clearBrowserStoredForReset` | -- | function clearBrowserStoredForReset(): void |
| `isStartupAgentApiEnabled` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#isStartupAgentApiEnabled` | -- | function isStartupAgentApiEnabled(): boolean |
| `readBrowserStored` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#readBrowserStored` | -- | function readBrowserStored(row: BrowserStoredRow): string \| null |
| `startupDisplayLanguage` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#startupDisplayLanguage` | -- | function startupDisplayLanguage(): DisplayLanguage |
| `startupThemePreference` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#startupThemePreference` | -- | function startupThemePreference(): 'light' \| 'dark' |
| `writeBrowserStored` | file only | function | `src/framework/single-html-shell/browser-stored-values.ts#writeBrowserStored` | -- | function writeBrowserStored(row: BrowserStoredRow, value: string): void |
| `copiedForPasteOf` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#copiedForPasteOf` | -- | function copiedForPasteOf(chosenTaskGroups: readonly string[], selected: Selection): SelectionCopied \| null |
| `CopyAndPasteHands` | file only | type | `src/framework/single-html-shell/copy-and-paste.ts#CopyAndPasteHands` | -- | type CopyAndPasteHands = Pick< |
| `copyForPaste` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#copyForPaste` | -- | function copyForPaste(hands: CopyAndPasteHands): void |
| `isPasteRefusedFor` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#isPasteRefusedFor` | -- | function isPasteRefusedFor(chosenTaskGroups: readonly string[]): boolean |
| `landCopyDrag` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#landCopyDrag` | -- | function landCopyDrag( hands: CopyAndPasteHands, bundle: readonly DocumentCommand[], picked: Selection, frame: FrameValues, ): void |
| `pasteWhatWasCopied` | file only | function | `src/framework/single-html-shell/copy-and-paste.ts#pasteWhatWasCopied` | -- | function pasteWhatWasCopied(hands: CopyAndPasteHands, frame: FrameValues): void |
| `answerDelayDiagnosticsReportEntry` | file only | function | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#answerDelayDiagnosticsReportEntry` | -- | function answerDelayDiagnosticsReportEntry( entry: IconId, filterColumn: string \| null, held: ReportHeld \| null, outlets: ReportOutlets, listed?: readonly st... |
| `DELAY_DIAGNOSTICS_REPORT_SURFACE` | file only | const | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#DELAY_DIAGNOSTICS_REPORT_SURFACE` | -- | const DELAY_DIAGNOSTICS_REPORT_SURFACE = 'Delay Diagnostics Report' |
| `DelayFixTables` | file only | type | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#DelayFixTables` | -- | type DelayFixTables = NonNullable<Parameters<typeof delayDiagnosticsReportAfterEntry>[4]['fixTables']> |
| `delayFixTablesKeeper` | file only | function | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#delayFixTablesKeeper` | -- | function delayFixTablesKeeper() |
| `DelayFixTelling` | file only | type | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#DelayFixTelling` | -- | type DelayFixTelling = NonNullable<DelayFixTables['telling']> |
| `jumpLandingOf` | file only | function | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#jumpLandingOf` | -- | function jumpLandingOf(cell: NonNullable<ScreenPart['searchJumpTarget']>) |
| `ReportHeld` | file only | interface | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#ReportHeld` | -- | interface ReportHeld |
| `ReportOutlets` | file only | interface | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#ReportOutlets` | -- | interface ReportOutlets |
| `withoutDelayFixes` | file only | function | `src/framework/single-html-shell/delay-diagnostics-report-window.ts#withoutDelayFixes` | -- | function withoutDelayFixes(window: DelayDiagnosticsReportWindow): DelayDiagnosticsReportWindow |
| `answerOpenChoice` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#answerOpenChoice` | -- | function answerOpenChoice(hands: DocumentFileFlowHands, openChoice: OpenChoice, frame: FrameValues \| null): void |
| `answerSettledFormat` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#answerSettledFormat` | -- | function answerSettledFormat(hands: DocumentFileFlowHands, format: ExportFormatId): boolean |
| `askToOpenDroppedFile` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#askToOpenDroppedFile` | -- | function askToOpenDroppedFile(hands: DocumentFileFlowHands): void |
| `CarriedFixBundle` | file only | type | `src/framework/single-html-shell/document-file-flow.ts#CarriedFixBundle` | -- | type CarriedFixBundle = Extract<SessionEffect, { readonly type: 'issueDelayFixBundle' }>['fixBundle'] |
| `documentAsOpened` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#documentAsOpened` | -- | function documentAsOpened(document: Document): Document |
| `DocumentFileFlow` | file only | type | `src/framework/single-html-shell/document-file-flow.ts#DocumentFileFlow` | -- | type DocumentFileFlow = ReturnType<typeof documentFileFlowOf> |
| `DocumentFileFlowHands` | file only | type | `src/framework/single-html-shell/document-file-flow.ts#DocumentFileFlowHands` | -- | type DocumentFileFlowHands = Pick< |
| `documentFileFlowOf` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#documentFileFlowOf` | -- | function documentFileFlowOf( hands: DocumentFileFlowHands, viewPlace: Pick<HeldViewPlace, 'documentToWrite'>, ) |
| `documentStampedAt` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#documentStampedAt` | -- | function documentStampedAt(document: Document, savedAt: string \| null): Document |
| `EMBEDDED_DOCUMENT_ELEMENT_ID` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#EMBEDDED_DOCUMENT_ELEMENT_ID` | -- | const EMBEDDED_DOCUMENT_ELEMENT_ID = 'embedded-document' |
| `FileSavedReading` | file only | interface | `src/framework/single-html-shell/document-file-flow.ts#FileSavedReading` | -- | interface FileSavedReading |
| `NO_FILE_SAVED` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#NO_FILE_SAVED` | -- | const NO_FILE_SAVED: FileSavedReading = { fileSavedAt: null, fileSavedByteLength: null } |
| `OPEN_ROUTE_FROM_CHOOSER` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_FROM_CHOOSER` | -- | const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser' |
| `OPEN_ROUTE_FROM_DROP` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_FROM_DROP` | -- | const OPEN_ROUTE_FROM_DROP: OpenRoute = 'drop' |
| `OPEN_ROUTE_REOPEN` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#OPEN_ROUTE_REOPEN` | -- | const OPEN_ROUTE_REOPEN: OpenRoute = 'reopen' |
| `openDocumentIntoHold` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#openDocumentIntoHold` | -- | async function openDocumentIntoHold( outer: DocumentFileFlowHands, flow: OpeningFlow, store: FileStore \| null, route: OpenRoute, handed: HandedImport \| null ... |
| `STARTUP_TEMPLATE_ELEMENT_ID` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#STARTUP_TEMPLATE_ELEMENT_ID` | -- | const STARTUP_TEMPLATE_ELEMENT_ID: string = startupTemplateManifest.containerElementId |
| `takeInHandedDocument` | file only | function | `src/framework/single-html-shell/document-file-flow.ts#takeInHandedDocument` | -- | async function takeInHandedDocument( hands: DocumentFileFlowHands, flow: OpeningFlow, incoming: Document, firstReading?: HandedFirstReading, onAsked: (asked:... |
| `WORKING_TIMES_UNLIKE_DAY_REASON` | file only | const | `src/framework/single-html-shell/document-file-flow.ts#WORKING_TIMES_UNLIKE_DAY_REASON` | -- | const WORKING_TIMES_UNLIKE_DAY_REASON: NoticeReason = 'RS-89' |
| `askTimeShift` | file only | function | `src/framework/single-html-shell/field-entry.ts#askTimeShift` | -- | function askTimeShift(hands: Pick<FieldEntryHands, 'readHeld' \| 'readSession' \| 'sendToSession'>, frame: FrameValues, minutes: number): void |
| `askWholeScheduleShift` | file only | function | `src/framework/single-html-shell/field-entry.ts#askWholeScheduleShift` | -- | function askWholeScheduleShift( hands: Pick<FieldEntryHands, 'readHeld' \| 'readSession' \| 'sendToSession'>, frame: FrameValues, newStartDate: string, ): void |
| `baseChangeCommandsOf` | file only | function | `src/framework/single-html-shell/field-entry.ts#baseChangeCommandsOf` | -- | function baseChangeCommandsOf( draft: { readonly chosenRegion: string; readonly chosenWay: Parameters<typeof baseChangeCommandOf>[2] }, document: Document, )... |
| `drainFieldEditNotices` | file only | function | `src/framework/single-html-shell/field-entry.ts#drainFieldEditNotices` | -- | function drainFieldEditNotices(hands: FieldEntryHands, frame: FrameValues \| null): void |
| `FIELD_ROW_OF_IN_PLACE_TARGET` | file only | const | `src/framework/single-html-shell/field-entry.ts#FIELD_ROW_OF_IN_PLACE_TARGET` | -- | const FIELD_ROW_OF_IN_PLACE_TARGET: Readonly<Record<InPlaceKind, string>> = |
| `FieldEntryHands` | file only | type | `src/framework/single-html-shell/field-entry.ts#FieldEntryHands` | -- | type FieldEntryHands = Pick< |
| `FieldFocusRetries` | file only | type | `src/framework/single-html-shell/field-entry.ts#FieldFocusRetries` | -- | type FieldFocusRetries = ReturnType<typeof fieldFocusRetriesOf> |
| `fieldFocusRetriesOf` | file only | function | `src/framework/single-html-shell/field-entry.ts#fieldFocusRetriesOf` | -- | function fieldFocusRetriesOf(hands: FieldEntryHands) |
| `isCreatedNameEnded` | file only | function | `src/framework/single-html-shell/field-entry.ts#isCreatedNameEnded` | -- | function isCreatedNameEnded(hands: FieldEntryHands): boolean |
| `isEditingField` | file only | function | `src/framework/single-html-shell/field-entry.ts#isEditingField` | -- | function isEditingField(hands: FieldEntryHands): boolean |
| `isFieldFocusWanted` | file only | function | `src/framework/single-html-shell/field-entry.ts#isFieldFocusWanted` | -- | function isFieldFocusWanted(hands: FieldEntryHands): boolean |
| `issueCalendarCommand` | file only | function | `src/framework/single-html-shell/field-entry.ts#issueCalendarCommand` | -- | function issueCalendarCommand(hands: CalendarCommandHands, command: CalendarCommand, frame: FrameValues): void |
| `isTimeShiftWrite` | file only | function | `src/framework/single-html-shell/field-entry.ts#isTimeShiftWrite` | -- | function isTimeShiftWrite(writes: readonly (readonly DocumentCommand[])[]): boolean |
| `isWholeScheduleShiftWrite` | file only | function | `src/framework/single-html-shell/field-entry.ts#isWholeScheduleShiftWrite` | -- | function isWholeScheduleShiftWrite(writes: readonly (readonly DocumentCommand[])[]): boolean |
| `noteChoiceMoved` | file only | function | `src/framework/single-html-shell/field-entry.ts#noteChoiceMoved` | -- | function noteChoiceMoved(hands: FieldEntryHands, frame: FrameValues \| null): void |
| `spendFieldCommit` | file only | function | `src/framework/single-html-shell/field-entry.ts#spendFieldCommit` | -- | function spendFieldCommit(hands: FieldEntryHands, frame: FrameValues): boolean |
| `tryWantedFieldBeforeInput` | file only | function | `src/framework/single-html-shell/field-entry.ts#tryWantedFieldBeforeInput` | -- | function tryWantedFieldBeforeInput( hands: FieldEntryHands, fieldFocusRetries: Pick<FieldFocusRetries, 'focusWantedField'>, input: HumanInput, ): void |
| `FrameClockWakes` | file only | type | `src/framework/single-html-shell/frame-clock-wakes.ts#FrameClockWakes` | -- | type FrameClockWakes = ReturnType<typeof frameClockWakesOf> |
| `FrameClockWakesHands` | file only | type | `src/framework/single-html-shell/frame-clock-wakes.ts#FrameClockWakesHands` | -- | type FrameClockWakesHands = Pick< |
| `frameClockWakesOf` | file only | function | `src/framework/single-html-shell/frame-clock-wakes.ts#frameClockWakesOf` | -- | function frameClockWakesOf(hands: FrameClockWakesHands) |
| `noticeTimersOf` | file only | function | `src/framework/single-html-shell/frame-clock-wakes.ts#noticeTimersOf` | -- | function noticeTimersOf(hands: Pick<FrameLoopHands, 'readEnvironment' \| 'sendToSession' \| 'ask'>) |
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
| `EXPORT_CHOOSER_ROW` | file only | const | `src/framework/single-html-shell/frame-loop.ts#EXPORT_CHOOSER_ROW` | -- | const EXPORT_CHOOSER_ROW = 'U-54' |
| `FIELD_FOCUS_WITHDRAWING_KEYS` | file only | const | `src/framework/single-html-shell/frame-loop.ts#FIELD_FOCUS_WITHDRAWING_KEYS` | -- | const FIELD_FOCUS_WITHDRAWING_KEYS: ReadonlySet<string> = new Set([ESCAPE_KEY, 'Tab']) |
| `FIELD_FOCUS_WITHDRAWN` | file only | const | `src/framework/single-html-shell/frame-loop.ts#FIELD_FOCUS_WITHDRAWN` | -- | const FIELD_FOCUS_WITHDRAWN: SessionEvent = { type: 'fieldFocusWithdrawn' } |
| `FOCUS_ON_DOCUMENT_BODY` | file only | const | `src/framework/single-html-shell/interaction-record.ts#FOCUS_ON_DOCUMENT_BODY` | -- | const FOCUS_ON_DOCUMENT_BODY = 'body' |
| `FrameEnvironment` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameEnvironment` | -- | interface FrameEnvironment |
| `FrameLoop` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameLoop` | -- | interface FrameLoop |
| `frameLoop` | file only | function | `src/framework/single-html-shell/frame-loop.ts#frameLoop` | -- | function frameLoop( surface: SvgSurface, first: Document, env: FrameEnvironment, screen?: ScreenWiring, files?: FileStore, showPointerShape?: ShowPointerShap... |
| `FrameLoopHands` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameLoopHands` | -- | interface FrameLoopHands |
| `FrameValues` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FrameValues` | -- | interface FrameValues |
| `FullScreenHost` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#FullScreenHost` | -- | interface FullScreenHost |
| `GREATEST_KNOWN_SCHEMA_VERSION` | file only | const | `src/framework/single-html-shell/frame-loop.ts#GREATEST_KNOWN_SCHEMA_VERSION` | -- | const GREATEST_KNOWN_SCHEMA_VERSION: string = startupTemplateManifest.schemaVersion |
| `HandedImport` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#HandedImport` | -- | interface HandedImport |
| `HEIGHT_CEILING_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#HEIGHT_CEILING_REASON` | -- | const HEIGHT_CEILING_REASON: NoticeReason = 'RS-43' |
| `HeldDocumentCall` | file only | type | `src/framework/single-html-shell/frame-loop.ts#HeldDocumentCall` | -- | type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-6' }> |
| `HISTORY_LIMITS` | file only | const | `src/framework/single-html-shell/frame-loop.ts#HISTORY_LIMITS` | -- | const HISTORY_LIMITS: HistoryLimits = |
| `isQuestionAskedIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isQuestionAskedIn` | -- | function isQuestionAskedIn(session: ScreenSession): boolean |
| `isSameEnvironment` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSameEnvironment` | -- | function isSameEnvironment(one: FrameEnvironment, other: FrameEnvironment): boolean |
| `isSameRecord` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSameRecord` | -- | function isSameRecord( a: object, b: object, isSame: (x: unknown, y: unknown, key: string) => boolean = Object.is, |
| `isSameScreenRegions` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSameScreenRegions` | -- | function isSameScreenRegions(a: ScreenRegions, b: ScreenRegions): boolean |
| `isSizeSettled` | file only | function | `src/framework/single-html-shell/frame-loop.ts#isSizeSettled` | -- | function isSizeSettled(env: FrameEnvironment): boolean |
| `MergeCandidateLine` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeCandidateLine` | -- | type MergeCandidateLine = NonNullable<ScreenViewReadings['mergeCandidates']>[number] |
| `MergeChoices` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeChoices` | -- | type MergeChoices = NonNullable<Parameters<typeof importDocument>[0]['merge']> |
| `MergeMapping` | file only | type | `src/framework/single-html-shell/frame-loop.ts#MergeMapping` | -- | type MergeMapping = NonNullable<MergeChoices['mapping']> |
| `NOT_STORED_SCROLLBAR_SIZES` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOT_STORED_SCROLLBAR_SIZES` | -- | const NOT_STORED_SCROLLBAR_SIZES: |
| `NOTHING_TO_DO_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOTHING_TO_DO_REASON` | -- | const NOTHING_TO_DO_REASON: NoticeReason = 'RS-27' |
| `NOTICE_REASON_OF_RASTER_FAULT` | file only | const | `src/framework/single-html-shell/frame-loop.ts#NOTICE_REASON_OF_RASTER_FAULT` | -- | const NOTICE_REASON_OF_RASTER_FAULT: Readonly<Record<RasterFaultReason, NoticeReason>> = |
| `noticeReasonOfRefusals` | file only | function | `src/framework/single-html-shell/frame-loop.ts#noticeReasonOfRefusals` | -- | function noticeReasonOfRefusals(refusals: readonly Refusal[]): NoticeReason |
| `noWorkingWeekdayReason` | file only | function | `src/framework/single-html-shell/frame-loop.ts#noWorkingWeekdayReason` | -- | function noWorkingWeekdayReason(document: Document): StartupNoticeReason \| null |
| `OPEN_CHOOSER_ROW` | file only | const | `src/framework/single-html-shell/frame-loop.ts#OPEN_CHOOSER_ROW` | -- | const OPEN_CHOOSER_ROW: FileFlowSurfaceName = 'U-56' |
| `openSurfaceNameIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#openSurfaceNameIn` | -- | function openSurfaceNameIn(session: ScreenSession): string \| null |
| `paletteCornerInWindow` | file only | function | `src/framework/single-html-shell/frame-loop.ts#paletteCornerInWindow` | -- | function paletteCornerInWindow( corner: { readonly x: number; readonly y: number }, bandSize: { readonly width: number; readonly height: number }, windowSize... |
| `panelShowingIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#panelShowingIn` | -- | function panelShowingIn(session: ScreenSession): PanelShowing |
| `PointerFacing` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerFacing` | -- | type PointerFacing = 'start' \| 'end' |
| `pointerImageOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pointerImageOf` | -- | function pointerImageOf( row: PointerRow, facing: PointerFacing = 'start', |
| `PointerRow` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerRow` | -- | type PointerRow = \| 'PK-1' \| 'PK-3' \| 'PK-4' \| 'PK-5' \| 'PK-7' \| 'PK-8' \| 'PK-9' \| 'PK-10' \| 'PK-11' \| 'PK-12' \| 'PK-13' |
| `pointerRowOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pointerRowOf` | -- | function pointerRowOf(hit: Grabbed \| null, armed: boolean): PointerRow \| null |
| `PointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerShape` | -- | type PointerShape = \| 'default' \| 'copy' \| 'grabbing' \| 'grab' \| 'pointer' \| 'col-resize' \| 'move' \| 'ew-resize' \| 'ns-resize' \| 'nwse-resize' \| 'nesw-resize' |
| `readInstantOfWrite` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readInstantOfWrite` | -- | function readInstantOfWrite(): string |
| `readLocalMoment` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readLocalMoment` | -- | function readLocalMoment(): string |
| `readMonotonicMs` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readMonotonicMs` | -- | function readMonotonicMs(): number |
| `readSystemStandardTimeZone` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readSystemStandardTimeZone` | -- | function readSystemStandardTimeZone(): StandardTimeZoneKey |
| `readToday` | file only | function | `src/framework/single-html-shell/frame-loop.ts#readToday` | -- | function readToday(): string |
| `ScreenWiring` | file only | interface | `src/framework/single-html-shell/frame-loop.ts#ScreenWiring` | -- | interface ScreenWiring |
| `SEAM_ABSENT_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#SEAM_ABSENT_REASON` | -- | const SEAM_ABSENT_REASON: NoticeReason = 'RS-3' |
| `selectedObjectsIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#selectedObjectsIn` | -- | function selectedObjectsIn(session: ScreenSession): Selection |
| `ShowPointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#ShowPointerShape` | -- | type ShowPointerShape = (shape: PointerShape \| null) => void |
| `STACK_SAFETY_CAP_REASON` | file only | const | `src/framework/single-html-shell/frame-loop.ts#STACK_SAFETY_CAP_REASON` | -- | const STACK_SAFETY_CAP_REASON: NoticeReason = 'RS-24' |
| `standingNoticesIn` | file only | function | `src/framework/single-html-shell/frame-loop.ts#standingNoticesIn` | -- | function standingNoticesIn(session: ScreenSession): readonly StandingNotice[] |
| `startedDocumentOf` | file only | function | `src/framework/single-html-shell/frame-loop.ts#startedDocumentOf` | -- | function startedDocumentOf(emptyDocument: Document, created: string, scheduleDataTimeZone: string): Document |
| `StartupNoticeReason` | file only | type | `src/framework/single-html-shell/frame-loop.ts#StartupNoticeReason` | -- | type StartupNoticeReason = Extract< |
| `WATERMARK_UNLOCK_DIGEST` | file only | const | `src/framework/single-html-shell/watermark-unlock.ts#WATERMARK_UNLOCK_DIGEST` | -- | const WATERMARK_UNLOCK_DIGEST: |
| `WATERMARK_UNLOCK_ROW` | file only | const | `src/framework/single-html-shell/frame-loop.ts#WATERMARK_UNLOCK_ROW` | -- | const WATERMARK_UNLOCK_ROW = 'U-60' |
| `HeldPressPreviewHands` | file only | type | `src/framework/single-html-shell/held-press-preview.ts#HeldPressPreviewHands` | -- | type HeldPressPreviewHands = Pick<FrameLoopHands, 'readSession' \| 'readHeld' \| 'readValues' \| 'settingsLimitsOf'> |
| `heldPropertyPanelWidthOf` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#heldPropertyPanelWidthOf` | -- | function heldPropertyPanelWidthOf( press: PointerPress \| null, at: Point \| null, context: InputContext, ): number \| null |
| `isLeavingTaskGroupArea` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#isLeavingTaskGroupArea` | -- | function isLeavingTaskGroupArea(propertyPanelWidth: number, regions: ScreenRegions): boolean |
| `marqueeRect` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#marqueeRect` | -- | function marqueeRect( press: PointerPress \| null, at: Point \| null, ): ScreenRect \| null |
| `previewOfHeldPress` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#previewOfHeldPress` | -- | function previewOfHeldPress( hands: HeldPressPreviewHands, press: PointerPress \| null, at: Point \| null, context: InputContext, frame: FrameValues, ): Docume... |
| `tentativeDependencyOf` | file only | function | `src/framework/single-html-shell/held-press-preview.ts#tentativeDependencyOf` | -- | function tentativeDependencyOf( hands: HeldPressPreviewHands, press: PointerPress \| null, at: Point \| null, document: Document, settings: DocumentSettings, l... |
| `InteractionRecorder` | file only | interface | `src/framework/single-html-shell/interaction-record.ts#InteractionRecorder` | -- | interface InteractionRecorder |
| `interactionRecorderOf` | file only | function | `src/framework/single-html-shell/interaction-record.ts#interactionRecorderOf` | -- | function interactionRecorderOf(hands: InteractionRecordHands): InteractionRecorder |
| `InteractionRecordHands` | file only | type | `src/framework/single-html-shell/interaction-record.ts#InteractionRecordHands` | -- | type InteractionRecordHands = Pick<FrameLoopHands, 'readSession' \| 'readEnvironment' \| 'screen' \| 'clipboard'> |
| `isRecordingInteractionsIn` | file only | function | `src/framework/single-html-shell/interaction-record.ts#isRecordingInteractionsIn` | -- | function isRecordingInteractionsIn(session: ScreenSession): boolean |
| `recordFrame` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordFrame` | -- | function recordFrame( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine'>, svg: string, drawnLayout: ScheduleLayout, ): ... |
| `recordHappening` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordHappening` | -- | function recordHappening( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine'>, input: HumanInput, ): void |
| `recordLine` | file only | function | `src/framework/single-html-shell/interaction-record.ts#recordLine` | -- | function recordLine( hands: InteractionRecordHands, recorder: Pick<InteractionRecorder, 'appendRecordedLine'>, what: string, detail: string, ): void |
| `choiceStepOf` | file only | function | `src/framework/single-html-shell/parent-task-hold.ts#choiceStepOf` | -- | function choiceStepOf(mixed: Selection, input: HumanInput, answer: string \| null): ParentTaskChoiceStep \| null |
| `isMixedParentPick` | file only | function | `src/framework/single-html-shell/parent-task-hold.ts#isMixedParentPick` | -- | function isMixedParentPick(picked: Selection): boolean |
| `ParentTaskChoiceStep` | file only | type | `src/framework/single-html-shell/parent-task-hold.ts#ParentTaskChoiceStep` | -- | type ParentTaskChoiceStep = \| { readonly kind: 'kept' } \| { readonly kind: 'closed' } \| { readonly kind: 'picked'; readonly picked: Selection } export type P... |
| `parentTaskFamiliesOf` | file only | function | `src/framework/single-html-shell/parent-task-hold.ts#parentTaskFamiliesOf` | -- | function parentTaskFamiliesOf( resolutions: ReadonlyMap<number, ParentTaskResolution>, selection: Selection, pointedUid: number \| null, held: ParentTaskFamil... |
| `parentTaskHoldOf` | file only | function | `src/framework/single-html-shell/parent-task-hold.ts#parentTaskHoldOf` | -- | function parentTaskHoldOf() |
| `ParentTaskReadings` | file only | type | `src/framework/single-html-shell/parent-task-hold.ts#ParentTaskReadings` | -- | type ParentTaskReadings = Pick<ScreenViewReadings, 'isDelayDiagnosticsShown' \| 'isParentTaskLinksShown'> & |
| `selectionOfParentChoice` | file only | function | `src/framework/single-html-shell/parent-task-hold.ts#selectionOfParentChoice` | -- | function selectionOfParentChoice(mixed: Selection, answer: string): Selection |
| `Grabbed` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#Grabbed` | -- | type Grabbed = NonNullable<ReturnType<typeof itemAtPointer>> |
| `GrabbedArea` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#GrabbedArea` | -- | type GrabbedArea = Grabbed['grab'] |
| `PointerShapeHands` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PointerShapeHands` | -- | type PointerShapeHands = Pick<FrameLoopHands, 'readPressed' \| 'readSession'> |
| `PressedPointerShape` | file only | type | `src/framework/single-html-shell/pointer-shape.ts#PressedPointerShape` | -- | type PressedPointerShape = ReturnType<typeof pressedPointerShapeOf> |
| `pressedPointerShapeOf` | file only | function | `src/framework/single-html-shell/pointer-shape.ts#pressedPointerShapeOf` | -- | function pressedPointerShapeOf(hands: PointerShapeHands) |
| `answerTableWindowEntry` | file only | function | `src/framework/single-html-shell/resource-list-window.ts#answerTableWindowEntry` | -- | function answerTableWindowEntry( pressed: TableWindowEntryPressed, windows: HeldResourceList, shownTasks: Pick<ShownTasksHold, 'turnOffEveryFilter' \| 'views'... |
| `RESOURCE_LIST_SURFACE` | file only | const | `src/framework/single-html-shell/resource-list-window.ts#RESOURCE_LIST_SURFACE` | -- | const RESOURCE_LIST_SURFACE = 'Resource List' |
| `ResourceListWindow` | file only | type | `src/framework/single-html-shell/resource-list-window.ts#ResourceListWindow` | -- | type ResourceListWindow = TableWindowState |
| `scheduleFilterLetGoOf` | file only | function | `src/framework/single-html-shell/resource-list-window.ts#scheduleFilterLetGoOf` | -- | function scheduleFilterLetGoOf(table: VisibilityTable, view: TableView): Extract<DocumentCommand, { readonly kind: 'setTableView' }> \| null |
| `tableWindowReopened` | file only | function | `src/framework/single-html-shell/resource-list-window.ts#tableWindowReopened` | -- | function tableWindowReopened<W extends TableWindowState>(held: W \| null, closed: W \| null, opened: W): W |
| `EffectRunner` | file only | type | `src/framework/single-html-shell/session-effects.ts#EffectRunner` | -- | type EffectRunner<E> = (effect: E, frame: FrameValues \| null) => void |
| `EffectRunners` | file only | type | `src/framework/single-html-shell/session-effects.ts#EffectRunners` | -- | type EffectRunners<E extends { readonly type: string }> = |
| `runSessionEffects` | file only | function | `src/framework/single-html-shell/session-effects.ts#runSessionEffects` | -- | function runSessionEffects( effects: readonly SessionEffect[], runners: EffectRunners<SessionEffect>, frame: FrameValues \| null, ): void |
| `unwiredEffect` | file only | function | `src/framework/single-html-shell/session-effects.ts#unwiredEffect` | -- | function unwiredEffect(effect: { readonly type: string }): never |
| `drawnTaskUidsOf` | file only | function | `src/framework/single-html-shell/shown-tasks-hold.ts#drawnTaskUidsOf` | -- | function drawnTaskUidsOf( schedule: Schedule, search: TableVisibility, report: TableVisibility, reportTaskUids: ReadonlySet<number> \| null, resourceList: Tab... |
| `HeldTableWindows` | file only | interface | `src/framework/single-html-shell/shown-tasks-hold.ts#HeldTableWindows` | -- | interface HeldTableWindows |
| `ShownTasksHold` | file only | type | `src/framework/single-html-shell/shown-tasks-hold.ts#ShownTasksHold` | -- | type ShownTasksHold = ReturnType<typeof shownTasksHoldOf> |
| `shownTasksHoldOf` | file only | function | `src/framework/single-html-shell/shown-tasks-hold.ts#shownTasksHoldOf` | -- | function shownTasksHoldOf(hands: FrameLoopHands, windows: HeldTableWindows, diagnosis: Diagnosis) |
| `TableViewChanges` | file only | type | `src/framework/single-html-shell/shown-tasks-hold.ts#TableViewChanges` | -- | type TableViewChanges = { readonly [T in VisibilityTable]?: TableView } |
| `TableViewsHeld` | file only | type | `src/framework/single-html-shell/shown-tasks-hold.ts#TableViewsHeld` | -- | type TableViewsHeld = { readonly [T in VisibilityTable]: TableView } |
| `TaskGroupBandCeilingCache` | file only | type | `src/framework/single-html-shell/task-group-band-ceiling-cache.ts#TaskGroupBandCeilingCache` | -- | type TaskGroupBandCeilingCache = ReturnType<typeof taskGroupBandCeilingCacheOf> |
| `taskGroupBandCeilingCacheOf` | file only | function | `src/framework/single-html-shell/task-group-band-ceiling-cache.ts#taskGroupBandCeilingCacheOf` | -- | function taskGroupBandCeilingCacheOf() |
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
| `EscapeKeyLock` | entry | interface | `src/framework/dom-input-source/dom-input-source.ts#EscapeKeyLock` | PI-27 | `escapeKeyLockOf` が返す 2 つの手（`lock` ／ `unlock`） |
| `escapeKeyLockOf` | entry | function | `src/framework/dom-input-source/dom-input-source.ts#escapeKeyLockOf` | PI-27 | 閲覧環境の `navigator.keyboard` を受け、`Escape` の鍵をかける手と放す手を返す（`FR-071`）。 |
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
| `OpenFilePicker` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#OpenFilePicker` | -- | type OpenFilePicker = (options: ChooserPlace & |
| `ReadableFile` | entry | interface | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#ReadableFile` | -- | interface ReadableFile |
| `SaveFilePicker` | entry | type | `src/framework/file-system-access-file-store/file-system-access-file-store.ts#SaveFilePicker` | -- | type SaveFilePicker = (options: ChooserPlace & |
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
| `SelectableKind` | entry | type | `src/entity/document-model/selection/selection.ts#SelectableKind` | -- | type SelectableKind = \| 'task' \| 'dependency' \| 'highlightBox' \| 'commentBox' \| 'statusLine' \| 'parentTaskLink' export type ItemRef = \| { readonly kind: 'tas... |
| `Selection` | entry | interface | `src/entity/document-model/selection/selection.ts#Selection` | PI-32 | 型。 |
| `selectionOfAll` | entry | function | `src/entity/document-model/selection/selection.ts#selectionOfAll` | -- | function selectionOfAll(items: readonly ItemRef[]): Selection |
| `selectionWith` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWith` | PI-32 | function selectionWith(selection: Selection, item: ItemRef): Selection |
| `selectionWithinSchedule` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWithinSchedule` | PI-32 | 文書に無くなった対象を外した選択を答える —— `FR-081` の結びの「文書に実在する対象だけを指すこと」。 |
| `selectionWithout` | entry | function | `src/entity/document-model/selection/selection.ts#selectionWithout` | PI-32 | function selectionWithout(selection: Selection, item: ItemRef): Selection |
| `taskUidsIn` | entry | function | `src/entity/document-model/selection/selection.ts#taskUidsIn` | PI-32 | 選択に含まれる `Task` の `uid` を、選んだ順に答える（`SL-1`、`SL-7b`）。 |

## Document (PI-34, `src/entity/document-model/document/document.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `Document` | entry | interface | `src/entity/document-model/document/document.ts#Document` | PI-34 | 型。 |
| `DocumentViolation` | entry | interface | `src/entity/document-model/document/document.ts#DocumentViolation` | -- | interface DocumentViolation |
| `documentViolations` | entry | function | `src/entity/document-model/document/document.ts#documentViolations` | PI-34 | `DR-1` に反する箇所 |

## ScreenRegions (PI-35, `src/entity/layout-engine/screen-regions/screen-regions.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `displayRatioOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#displayRatioOf` | PI-35 | 表示の倍率から描く比を出す。 |
| `displayScaleFractionOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#displayScaleFractionOf` | PI-35 | 表示の倍率だけの比（`S-234` を 100 で割った値）であり、`S-236` を掛けない。 |
| `drawnSettingsOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#drawnSettingsOf` | PI-35 | 保存値と `SETTINGS_CONSTANTS` を合わせた 1 つの見方（`PI-2` の `DrawnSettings`）を作り、描く比を 1 度だけ掛けて返す。 |
| `regionAtPointer` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionAtPointer` | PI-35 | ポインタがどの領域にあるか |
| `RegionName` | entry | type | `src/entity/layout-engine/screen-regions/screen-regions.ts#RegionName` | -- | type RegionName = keyof ScreenRegions \| null |
| `regionsAtDisplayScale` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionsAtDisplayScale` | PI-35 | 与えた表示の倍率で描いたときの各部の矩形。 |
| `regionsFromScreen` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#regionsFromScreen` | PI-35 | 画面の寸法と `DocumentSettings` から各部の矩形を出す |
| `rulerBandHeightOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#rulerBandHeightOf` | -- | function rulerBandHeightOf(drawn: DrawnSettings): number |
| `rulerZoneRowHeightOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#rulerZoneRowHeightOf` | PI-35 | タイムゾーンの段 1 つの高さ（3 段の帯の 1 段ぶん） |
| `rulerZoneRowsOf` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#rulerZoneRowsOf` | PI-35 | 目盛の帯の下に段を足す表示するタイムゾーン（時刻を表示しているあいだだけ、`FR-017`・`FR-156`） |
| `ScreenEnvironment` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenEnvironment` | -- | interface ScreenEnvironment |
| `ScreenRect` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenRect` | PI-35 | 型。 |
| `ScreenRegions` | entry | interface | `src/entity/layout-engine/screen-regions/screen-regions.ts#ScreenRegions` | PI-35 | 型。 |
| `taskGroupControlLatticeHeightPx` | entry | function | `src/entity/layout-engine/screen-regions/screen-regions.ts#taskGroupControlLatticeHeightPx` | PI-35 | タスクグループの操作子の格子（表 T-051 の `HF-1`）を描いたときに縦に取る高さ。 |

## ScreenState (PI-36, `src/entity/document-model/screen-state/screen-state.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `DualCursorSide` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#DualCursorSide` | PI-36 | 型。 |
| `EscapeContext` | entry | interface | `src/entity/document-model/screen-state/screen-state.ts#EscapeContext` | PI-36 | 型。 |
| `EscapeTarget` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#EscapeTarget` | PI-36 | 型。 |
| `escapeTarget` | entry | function | `src/entity/document-model/screen-state/screen-state.ts#escapeTarget` | PI-36 | `EscapeContext` だけから、`Esc` が次に消費する段を答える。 |
| `NOT_STORED_SEARCH_PANEL_FONT_SIZES` | entry | const | `src/entity/document-model/screen-state/screen-state.ts#NOT_STORED_SEARCH_PANEL_FONT_SIZES` | PI-36 | `Search Panel` の字の大きさの段（`_assets/tbl-settings.md` の 表 T-333）を行 ID ごとに持つ。 |
| `RememberedActual` | entry | interface | `src/entity/document-model/screen-state/screen-state.ts#RememberedActual` | PI-36 | 型。 |
| `windowClosedByEscape` | entry | function | `src/entity/document-model/screen-state/screen-state.ts#windowClosedByEscape` | -- | function windowClosedByEscape(standing: WindowStanding): WindowName \| null |
| `WindowName` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#WindowName` | PI-36 | 型。 |
| `WindowStanding` | entry | interface | `src/entity/document-model/screen-state/screen-state.ts#WindowStanding` | -- | interface WindowStanding |

## ScreenRenderer (PI-37, `src/adapter/screen-renderer/screen-renderer.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `achromatic` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#achromatic` | PI-37 | `SvgRenderer` の `achromatic` を、`DomScreenSurface` へ渡すためにコピーせずに公開し直したもの。 |
| `AppHeaderItems` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#AppHeaderItems` | -- | interface AppHeaderItems |
| `ASSIGNEE_LIST_SEPARATOR` | entry | const | `src/adapter/screen-renderer/screen-renderer.ts#ASSIGNEE_LIST_SEPARATOR` | PI-37 | 担当の欄の一覧の `IC-125`・`IC-126`（表 T-225 の `AS-5`）が 1 回で書く担当の `uid` を並べる区切り。 |
| `AssigneeCandidate` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#AssigneeCandidate` | -- | interface AssigneeCandidate |
| `AssigneeCombo` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#AssigneeCombo` | -- | interface AssigneeCombo |
| `ColorEntrance` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColorEntrance` | -- | interface ColorEntrance |
| `ColorField` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColorField` | -- | interface ColorField |
| `ColorName` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ColorName` | -- | interface ColorName |
| `colorOf` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#colorOf` | PI-37 | `SvgRenderer` の `colorOf` を、`DomScreenSurface` へ渡すためにコピーせずに公開し直したもの。 |
| `CommandItem` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#CommandItem` | -- | interface CommandItem |
| `CommandPalette` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#CommandPalette` | -- | interface CommandPalette |
| `Confirmation` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Confirmation` | -- | interface Confirmation extends RaisedConfirmation |
| `ConfirmationAnswer` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ConfirmationAnswer` | -- | interface ConfirmationAnswer |
| `ConfirmationItem` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ConfirmationItem` | -- | interface ConfirmationItem |
| `dateEntryWidthOf` | entry | function | `src/adapter/screen-renderer/properties-panel.ts#dateEntryWidthOf` | PI-37 | 日付の欄（引数が偽）と、日付と時刻の欄（真）が要る幅を、字の大きさに対する倍率で答える（`FR-006`、`_assets/tbl-settings.md` の 表 T-206 の `S-589`・`S-590`）。 |
| `DEFAULT_TASK_GROUP_NAME` | entry | const | `src/adapter/screen-renderer/screen-renderer.ts#DEFAULT_TASK_GROUP_NAME` | PI-37 | タスクグループを既定の名前で立てるときの語。 |
| `DEFAULT_WINDOW_PLACE` | entry | const | `src/adapter/screen-renderer/window-box.ts#DEFAULT_WINDOW_PLACE` | PI-37 | 覚えた位置も大きさも無いウィンドウの値 —— 既定の箱で描く（表 T-335 の `WB-1`・`WB-6`）。 |
| `DELAY_DIAGNOSTICS_REPORT_EXTENSION` | entry | const | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DELAY_DIAGNOSTICS_REPORT_EXTENSION` | PI-37 | 書き出すファイルの拡張子（表 T-024 の `IO-8`、表 T-346 の `RW-7`）。 |
| `delayDiagnosticsReportAfterEntry` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportAfterEntry` | PI-37 | 遅延診断レポートの窓の入口（表 T-346 の `RW-2`・表 T-330 の `SV-7`・`SV-8`、表 T-335 の `WB-2`・`WB-3`）を押した後の窓の値を答える。 |
| `delayDiagnosticsReportAfterFilterChange` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportAfterFilterChange` | PI-37 | 列のフィルタの変化（表 T-330 の `SV-7`）を遅延診断レポートの窓の値へ当てる。 |
| `delayDiagnosticsReportFileNameOf` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportFileNameOf` | PI-37 | 書き出すファイルの提案の名を作る（表 T-346 の `RW-7`）。 |
| `delayDiagnosticsReportMarkdownOf` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportMarkdownOf` | PI-37 | 窓のいまの並べ替えとフィルタで、コピーと書き出しの Markdown の文字列を作る（表 T-346 の `RW-6`）。 |
| `delayDiagnosticsReportShowingRow` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportShowingRow` | PI-37 | 診断結果の表を出し、押したマーカーの `Task` の行を隠している語と列のフィルタの条件だけを外し、その行にいまの行の印を付けた窓の値と見え方を答える（表 T-346 の `RW-19`）。 |
| `DelayDiagnosticsReportView` | entry | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayDiagnosticsReportView` | -- | interface DelayDiagnosticsReportView extends Omit<SearchPanelView, 'table' \| 'rows'>, Partial<DelayFixView> |
| `DelayDiagnosticsReportWindow` | entry | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayDiagnosticsReportWindow` | PI-37 | 遅延診断レポートの窓の値の型 —— 表示の状態・語・フィルタ・並べ替え・位置・大きさ・列の幅・前後（`RW-5`） —— 保存しない（`FR-134`） |
| `delayDiagnosticsReportWithColumnWidth` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportWithColumnWidth` | PI-37 | 列の境目（表 T-023d の `GR-28`）を引いた後の列の幅を、窓の値へ当てる（表 T-346 の `RW-9`）。 |
| `delayDiagnosticsReportWithFilterClosed` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportWithFilterClosed` | PI-37 | 開いている列のフィルタを閉じた窓の値を答える（表 T-330 の `SV-14`）。 |
| `delayDiagnosticsReportWithInput` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportWithInput` | PI-37 | 窓の入力欄の語・出している表の列のフィルタの変化・修正案のチェックと択と日付（表 T-346 の `RW-3`・`RW-11`・`RW-16`）を、窓の値と診断結果の表の見え方へ当てる。 |
| `delayFixBackupFileNameOf` | entry | function | `src/adapter/screen-renderer/open-modals.ts#delayFixBackupFileNameOf` | PI-37 | 直す前のバックアップの提案の名を作る（表 T-346 の `RW-15`）。 |
| `DelayFixTelling` | entry | type | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixTelling` | PI-37 | 型。 |
| `delayReportColumnHeadings` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayReportColumnHeadings` | PI-37 | 遅延診断レポートの表（表 T-347）の列の一覧（列の行 ID・画面の名・値の種類）。 |
| `delayReportTableRows` | entry | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayReportTableRows` | PI-37 | 遅延診断レポートの表に語と列のフィルタと並べ替えを当てた行を、画面に出す文字で答える。 |
| `dismissKeyOf` | entry | function | `src/adapter/screen-renderer/notices.ts#dismissKeyOf` | PI-37 | 表 T-037 の `NT-8` で人が消した告げを名指す鍵 |
| `DISPLAY_TIME_ZONE_SLOT_SEPARATOR` | entry | const | `src/adapter/screen-renderer/screen-renderer.ts#DISPLAY_TIME_ZONE_SLOT_SEPARATOR` | PI-37 | 表示するタイムゾーンの 4 つの選ぶ欄（表 T-369 の `FO-15`）の値が、どの欄かを運ぶ区切り |
| `DisplayLanguage` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#DisplayLanguage` | -- | type DisplayLanguage = 'ja' \| 'en' |
| `displayLanguageOf` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#displayLanguageOf` | -- | function displayLanguageOf(session: ScreenSession): DisplayLanguage |
| `drawnTaskGroupBoxesOf` | entry | function | `src/adapter/screen-renderer/task-group-panel.ts#drawnTaskGroupBoxesOf` | PI-37 | 描いたタスクグループごとの `Task Group Panel` のタスクグループ見出しの矩形を、配置と各部の矩形から測る（`SC-1`・`FR-098`）。 |
| `DropCue` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#DropCue` | -- | interface DropCue |
| `DualCursorReadout` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#DualCursorReadout` | -- | interface DualCursorReadout |
| `ExportChooser` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ExportChooser` | -- | interface ExportChooser extends OpenSurface |
| `exportFileNameOf` | entry | function | `src/adapter/screen-renderer/open-modals.ts#exportFileNameOf` | PI-37 | 文書名を 表 T-352 で整え、拡張子を付けた提案の名を作る（`FR-096`）。 |
| `ExportFormatChoice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ExportFormatChoice` | -- | interface ExportFormatChoice |
| `ExportFormatId` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#ExportFormatId` | -- | type ExportFormatId = string |
| `FieldCommit` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#FieldCommit` | -- | interface FieldCommit |
| `FieldEditNotice` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#FieldEditNotice` | PI-37 | 型。 |
| `filteredSearchRows` | entry | function | `src/adapter/screen-renderer/search-table-filters.ts#filteredSearchRows` | PI-37 | 検索パネルのタスクの表に列のフィルタと並べ替えを当てた行。 |
| `FIT_SPAN_COPY_TEXT` | entry | const | `src/adapter/screen-renderer/screen-renderer.ts#FIT_SPAN_COPY_TEXT` | PI-37 | 文書の設定の面の、現在表示中の期間をコピーする入口が確定する語。 |
| `GuideCursorLabel` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#GuideCursorLabel` | -- | interface GuideCursorLabel |
| `HelpEntry` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpEntry` | -- | interface HelpEntry |
| `HelpLink` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpLink` | -- | interface HelpLink |
| `HelpModal` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpModal` | PI-37 | 型。 |
| `HelpWindowArea` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#HelpWindowArea` | -- | interface HelpWindowArea |
| `HolidayExceptionLine` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidayExceptionLine` | PI-37 | 型。 |
| `HolidaySettings` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidaySettings` | PI-37 | 型。 |
| `HolidaySettingsBody` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidaySettingsBody` | PI-37 | 型。 |
| `HolidaySettingsCell` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidaySettingsCell` | PI-37 | 型。 |
| `HolidaySettingsEntry` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidaySettingsEntry` | PI-37 | 型。 |
| `HolidaySettingsFieldColumn` | entry | type | `src/adapter/screen-renderer/holiday-settings.ts#HolidaySettingsFieldColumn` | -- | type HolidaySettingsFieldColumn = 'weekStartDay' \| 'fromTime' \| 'toTime' \| 'name' \| 'fromDate' \| 'toDate' |
| `HolidayWorkingTimeLine` | entry | interface | `src/adapter/screen-renderer/holiday-settings.ts#HolidayWorkingTimeLine` | -- | interface HolidayWorkingTimeLine |
| `HorizontalWhole` | entry | interface | `src/adapter/screen-renderer/screen-frame.ts#HorizontalWhole` | PI-37 | interface HorizontalWhole |
| `horizontalWholeOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#horizontalWholeOf` | PI-37 | function horizontalWholeOf(layout: ScheduleLayout, regions: ScreenRegions): HorizontalWhole |
| `IconId` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#IconId` | -- | type IconId = string |
| `imageToJsonPromptText` | entry | function | `src/adapter/screen-renderer/app-header-items.ts#imageToJsonPromptText` | PI-37 | `IC-115` がコピーする、画像から `GRS JSON` を作るプロンプトの全文を、画面の言語と版で組む。 |
| `ImportReportLine` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ImportReportLine` | -- | interface ImportReportLine |
| `isFilterValueListed` | entry | function | `src/adapter/screen-renderer/table-window.ts#isFilterValueListed` | PI-37 | 列のフィルタの中の検索欄の語が、その項目の語に当たるか（`FR-151` の 表 T-330 の `SV-7`、比べ方は `SV-4`）。 |
| `isScheduleColorRow` | entry | function | `src/adapter/svg-renderer/svg-renderer.ts#isScheduleColorRow` | PI-37 | `SvgRenderer` の `isScheduleColorRow` を、`DomScreenSurface` へ渡すためにコピーせずに公開し直したもの。 |
| `JumpRipple` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#JumpRipple` | -- | interface JumpRipple |
| `LinkedWords` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#LinkedWords` | -- | interface LinkedWords |
| `MARK_COLOR_ROWS` | entry | const | `src/adapter/screen-renderer/table-window.ts#MARK_COLOR_ROWS` | PI-37 | `statusGlyphSvg` の絵が塗る 表 T-236 の行の並び。 |
| `markColorVariableOf` | entry | function | `src/adapter/screen-renderer/table-window.ts#markColorVariableOf` | PI-37 | 表 T-236 の行 ID から、その色を持つ CSS の変数の名を返す。 |
| `MarkGlyph` | entry | type | `src/adapter/screen-renderer/table-window.ts#MarkGlyph` | -- | type MarkGlyph = Parameters<typeof markerGlyphSvg>[0] |
| `MergeCandidateLine` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#MergeCandidateLine` | -- | interface MergeCandidateLine |
| `nextSearchPanelTextSizeStep` | entry | function | `src/adapter/screen-renderer/search-panel.ts#nextSearchPanelTextSizeStep` | PI-37 | `IC-127` の押下で、字の大きさの段を表 T-333 の並びの次へ進める（末尾の次は先頭 —— `FR-151` の 表 T-330 の `SV-16`） |
| `Notice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Notice` | -- | interface Notice |
| `OpenChoiceLine` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#OpenChoiceLine` | -- | interface OpenChoiceLine |
| `OpenChooser` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#OpenChooser` | -- | interface OpenChooser extends OpenSurface |
| `OPENED_DELAY_DIAGNOSTICS_REPORT` | entry | const | `src/adapter/screen-renderer/delay-diagnostics-report.ts#OPENED_DELAY_DIAGNOSTICS_REPORT` | PI-37 | 開いたばかりの遅延診断レポートの窓の値（表 T-346 の `RW-1`、`S-451`）。 |
| `OPENED_RESOURCE_LIST` | entry | const | `src/adapter/screen-renderer/resource-list.ts#OPENED_RESOURCE_LIST` | PI-37 | 開いたばかりの担当リストのウィンドウの値（表 T-370 の `RO-1`、`S-545`）。 |
| `OpenModal` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#OpenModal` | -- | type OpenModal = \| HelpModal \| ExportChooser \| OpenChooser \| HolidaySettings \| (OpenSurface & |
| `PaletteGroup` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PaletteGroup` | -- | interface PaletteGroup |
| `PanelDivider` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PanelDivider` | -- | interface PanelDivider |
| `PanelFace` | entry | type | `src/adapter/screen-renderer/properties-panel.ts#PanelFace` | PI-37 | `panelFacesOf` が答える中身の種の型 |
| `panelFacesOf` | entry | function | `src/adapter/screen-renderer/properties-panel.ts#panelFacesOf` | PI-37 | プロパティパネルがいま出している中身の種を、表 T-016 の `適用先` の順に 1 つずつ答える（文書の設定の面は `documentSettings`、出していないときは空）。 |
| `ParentTaskChoice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ParentTaskChoice` | -- | interface ParentTaskChoice |
| `PropertiesPanel` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertiesPanel` | -- | interface PropertiesPanel |
| `PropertyBadge` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyBadge` | -- | interface PropertyBadge |
| `PropertyControl` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyControl` | -- | interface PropertyControl |
| `PropertyControlKind` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#PropertyControlKind` | -- | type PropertyControlKind = \| 'text' \| 'multiline' \| 'date' \| 'number' \| 'boolean' \| 'choice' \| 'color' \| 'taskReference' // see CV-9 // WHY: swatches run bes... |
| `PropertyField` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyField` | -- | interface PropertyField |
| `PropertyFieldGroup` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyFieldGroup` | -- | interface PropertyFieldGroup |
| `PropertyFieldKey` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#PropertyFieldKey` | -- | type PropertyFieldKey = \| |
| `PropertyLink` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#PropertyLink` | -- | interface PropertyLink |
| `RaisedConfirmation` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RaisedConfirmation` | -- | interface RaisedConfirmation |
| `RaisedNotice` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RaisedNotice` | -- | interface RaisedNotice |
| `resourceListAfterEntry` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListAfterEntry` | PI-37 | 担当リストのウィンドウの入口（表 T-370 の `RO-1`・`RO-2`・表 T-330 の `SV-7`・`SV-8`、表 T-335 の `WB-2`・`WB-3`）を押した後のウィンドウの値を答える。 |
| `resourceListAfterFilterChange` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListAfterFilterChange` | PI-37 | 列のフィルタの変化と表示の列の印の変化を、担当リストのウィンドウの値へ当てる（表 T-330 の `SV-7`、表 T-353 の `TV-2`）。 |
| `resourceListColumnHeadings` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListColumnHeadings` | PI-37 | 担当リストの表（表 T-371）の列の一覧（列の行 ID・画面の名・値の種類）。 |
| `resourceListFromWindow` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListFromWindow` | PI-37 | 担当リストのウィンドウの中身 —— タイトルバー・タイトルバーの下の 1 行・表 T-371 の表 —— を作る（`FR-099` の 表 T-370） |
| `resourceListListedUidsOf` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListListedUidsOf` | PI-37 | 担当リストの表がいま並べている担当の `uid` —— 語と列のフィルタの後 —— を答える（表 T-370 の `RO-3`）。 |
| `ResourceListRowView` | entry | interface | `src/adapter/screen-renderer/resource-list.ts#ResourceListRowView` | PI-37 | 型。 |
| `resourceListTableRows` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListTableRows` | PI-37 | 担当リストの表に語と列のフィルタと並べ替えを当てた行を、画面に出す文字で答える。 |
| `ResourceListView` | entry | interface | `src/adapter/screen-renderer/resource-list.ts#ResourceListView` | PI-37 | 型。 |
| `resourceListWithColumnWidth` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListWithColumnWidth` | PI-37 | 列の境目（表 T-023d の `GR-28`）を引いた後の列の幅を、ウィンドウの値へ当てる（表 T-370 の `RO-9`）。 |
| `resourceListWithFilterClosed` | entry | function | `src/adapter/screen-renderer/resource-list.ts#resourceListWithFilterClosed` | PI-37 | 開いている列のフィルタを閉じたウィンドウの値を答える（表 T-330 の `SV-14`）。 |
| `RulerAbbreviation` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#RulerAbbreviation` | PI-37 | 型。 |
| `rulerWeekdayWords` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#rulerWeekdayWords` | PI-37 | 目盛の第 4 段が刷る曜日 7 語。 |
| `scheduleFilterBarOf` | entry | function | `src/adapter/screen-renderer/table-window.ts#scheduleFilterBarOf` | PI-37 | スケジュールフィルタの帯（`U-67`）の語を、掛けている表の名・文書のタスクの数・描いているタスクの数から作る（表 T-353 の `TV-11`）。 |
| `ScheduleFilterBarView` | entry | interface | `src/adapter/screen-renderer/table-window.ts#ScheduleFilterBarView` | PI-37 | 型。 |
| `ScreenFrame` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenFrame` | -- | interface ScreenFrame |
| `ScreenPart` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#ScreenPart` | -- | interface ScreenPart |
| `ScreenSurface` | entry | interface | `src/adapter/screen-renderer/screen-surface.ts#ScreenSurface` | PI-37 | 表 T-065 |
| `ScreenView` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenView` | PI-37 | 型。 |
| `screenViewFromRegions` | entry | function | `src/adapter/screen-renderer/screen-renderer.ts#screenViewFromRegions` | PI-37 | 根の状態（`PI-39` の `ScreenSession`）と `ScreenViewReadings` から `ScreenView` を作る。 |
| `ScreenViewReadings` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScreenViewReadings` | PI-37 | 型。 |
| `Scrollbar` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Scrollbar` | -- | interface Scrollbar |
| `ScrollExtent` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#ScrollExtent` | -- | interface ScrollExtent |
| `scrollExtentOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#scrollExtentOf` | PI-37 | 配置と各部の矩形と全体から `ScreenViewReadings` のスクロールの範囲を答える。 |
| `SearchColumnHeading` | entry | interface | `src/adapter/screen-renderer/search-table-filters.ts#SearchColumnHeading` | -- | interface SearchColumnHeading |
| `SearchFilterChange` | entry | type | `src/adapter/screen-renderer/table-window.ts#SearchFilterChange` | PI-37 | 型。 |
| `searchPanelAfterFilterChange` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelAfterFilterChange` | PI-37 | 開いているフィルタの値ごとの印の入れ外しと、日付の「いつから」「いつまで」の選びを、検索パネルの覚えているフィルタへ当てる（`FR-151` の 表 T-330 の `SV-7`）。 |
| `searchPanelAfterFilterEntry` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelAfterFilterEntry` | PI-37 | 開いている列のフィルタの入口（`IC-123` 〜 `IC-126`）の押下を、検索パネルの覚えているフィルタと並べ替えへ当てる（`FR-151` の 表 T-330 の `SV-7`・`SV-8`）。 |
| `searchPanelFromSession` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelFromSession` | -- | function searchPanelFromSession( session: ScreenSession, panel: SearchPanelSession, view: TableView, schedule: Schedule, canvas: ScreenRect, diagnosed?: Read... |
| `SearchPanelShown` | entry | type | `src/adapter/screen-renderer/search-panel.ts#SearchPanelShown` | -- | type SearchPanelShown = WindowShown |
| `SearchPanelView` | entry | interface | `src/adapter/screen-renderer/search-panel.ts#SearchPanelView` | PI-37 | 型。 |
| `searchPanelWithColumnWidth` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelWithColumnWidth` | PI-37 | 列の境目（表 T-023d の `GR-28`）を引いた後の列の幅を、検索パネルの覚えている列の幅へ当てる（`FR-151` の 表 T-330 の `SV-18`）。 |
| `searchPanelWithFilterClosed` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelWithFilterClosed` | PI-37 | 開いている列のフィルタを閉じた検索パネルの値を答える。 |
| `searchPanelWithFilterOpened` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelWithFilterOpened` | PI-37 | 列の見出しの `IC-122` の押下を、その列のフィルタを開いた検索パネルの値へ当てる（`FR-151` の 表 T-330 の `SV-7`）。 |
| `searchPanelWithTableViewsCleared` | entry | function | `src/adapter/screen-renderer/search-panel.ts#searchPanelWithTableViewsCleared` | PI-37 | `IC-153` の押下で、タスクの表とコメントボックスの表の列のフィルタと並べ替えを戻し、開いているフィルタを閉じた検索パネルの値を答える（`FR-151` の 表 T-330 の `SV-1`）。 |
| `shiftAmountText` | entry | function | `src/adapter/screen-renderer/notices.ts#shiftAmountText` | -- | function shiftAmountText(minutes: number): string |
| `statusGlyphSvg` | entry | function | `src/adapter/screen-renderer/table-window.ts#statusGlyphSvg` | PI-37 | 表のステータスの値の頭に描く絵（`SQ-5`・`DT-1`・`RW-4`）。 |
| `tableAfterVisibilityChange` | entry | function | `src/adapter/screen-renderer/table-window.ts#tableAfterVisibilityChange` | PI-37 | 表示の列の印の入れ外しを、表の値の「表示」の行へ当てる（`FR-151` の 表 T-353 の `TV-2`）。 |
| `TableRowCells` | entry | interface | `src/adapter/screen-renderer/search-table-filters.ts#TableRowCells` | -- | interface TableRowCells |
| `tableViewsOnTheirColumns` | entry | function | `src/adapter/screen-renderer/table-window.ts#tableViewsOnTheirColumns` | PI-37 | 表の見え方から、その表に無い列の行 ID（表 T-372 の `column`）を持つ列のフィルタと並べ替えを外す（表 T-024a の `OP-18`）。 |
| `TableWindowState` | entry | interface | `src/adapter/screen-renderer/table-window.ts#TableWindowState` | PI-37 | 型。 |
| `tableWithScheduleFilterOff` | entry | function | `src/adapter/screen-renderer/table-window.ts#tableWithScheduleFilterOff` | -- | function tableWithScheduleFilterOff(view: TableView): TableView |
| `tableWithScheduleFilterToggled` | entry | function | `src/adapter/screen-renderer/table-window.ts#tableWithScheduleFilterToggled` | PI-37 | 表のスケジュールフィルタの入切を返す（表 T-353 の `TV-5`・`TV-8`）。 |
| `TaskGroupDropCue` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#TaskGroupDropCue` | -- | interface TaskGroupDropCue |
| `TaskGroupExpander` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#TaskGroupExpander` | -- | interface TaskGroupExpander |
| `TaskGroupGrabCopy` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#TaskGroupGrabCopy` | -- | interface TaskGroupGrabCopy |
| `TaskGroupPanel` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#TaskGroupPanel` | -- | interface TaskGroupPanel |
| `TaskGroupTitle` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#TaskGroupTitle` | -- | interface TaskGroupTitle |
| `taskGroupTitleFontPxOf` | entry | function | `src/adapter/screen-renderer/task-group-panel.ts#taskGroupTitleFontPxOf` | PI-37 | タスクグループ名の字の大きさ。 |
| `taskSearchColumnHeadings` | entry | function | `src/adapter/screen-renderer/search-table-filters.ts#taskSearchColumnHeadings` | PI-37 | 検索パネルのタスクの表の列の一覧（列の行 ID・画面の名・値の種類）。 |
| `TimeShiftPreview` | entry | interface | `src/adapter/screen-renderer/notices.ts#TimeShiftPreview` | -- | interface TimeShiftPreview |
| `timeShiftQuestionItems` | entry | function | `src/adapter/screen-renderer/notices.ts#timeShiftQuestionItems` | PI-37 | タイムシフトの確認（`QN-14`）の文の下に並べる行（表 T-377 の `BS-3`） |
| `Tooltip` | entry | interface | `src/adapter/screen-renderer/screen-renderer.ts#Tooltip` | -- | interface Tooltip |
| `TooltipAnchor` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#TooltipAnchor` | -- | type TooltipAnchor = \| { readonly kind: 'icon'; readonly icon: IconId; readonly surface?: string; readonly taskGroupId?: string } \| { readonly kind: 'task'; ... |
| `TooltipRow` | entry | type | `src/adapter/screen-renderer/screen-renderer.ts#TooltipRow` | -- | type TooltipRow = \| { readonly kind: 'whole'; readonly text: string } \| { readonly kind: 'labeled'; readonly label: string; readonly value: string; readonly ... |
| `UNASSIGNED_ROW_KEY` | entry | const | `src/adapter/screen-renderer/table-window.ts#UNASSIGNED_ROW_KEY` | PI-37 | 担当リストの表の（担当なし）の行の鍵（表 T-370 の `RO-5`）。 |
| `UNTITLED_DOCUMENT_TITLE` | entry | const | `src/adapter/screen-renderer/open-modals.ts#UNTITLED_DOCUMENT_TITLE` | PI-37 | `AT-3` の文書名が `null` のときに見出しへ出す語 `Untitled`。 |
| `VerticalWhole` | entry | interface | `src/adapter/screen-renderer/screen-frame.ts#VerticalWhole` | PI-37 | 型。 |
| `verticalWholeOf` | entry | function | `src/adapter/screen-renderer/screen-frame.ts#verticalWholeOf` | PI-37 | つまみが表す全体を配置と各部の矩形から測る —— `GR-21` の「内容の範囲といま見えている範囲の和」。 |
| `VisibilityKey` | entry | type | `src/adapter/screen-renderer/table-window.ts#VisibilityKey` | PI-37 | 型。 |
| `WholeScheduleShiftPreview` | entry | interface | `src/adapter/screen-renderer/notices.ts#WholeScheduleShiftPreview` | -- | interface WholeScheduleShiftPreview |
| `wholeScheduleShiftQuestionItems` | entry | function | `src/adapter/screen-renderer/notices.ts#wholeScheduleShiftQuestionItems` | PI-37 | 全体日程シフトの確認（`QN-15`）の文の下に並べる行（表 T-379 の `WH-11`） |
| `windowBoxAfterGrab` | entry | function | `src/adapter/screen-renderer/window-box.ts#windowBoxAfterGrab` | PI-37 | ウィンドウ（`FR-036` の 表 T-335）のタイトルバーの帯（表 T-023d の `GR-24`）か縁（`GR-25`）を掴んで引いた後の箱を、範囲の中と下限（`S-423`・`S-424`）の上に収めて答える（`WB-8`・`WB-9`）。 |
| `windowBoxOf` | entry | function | `src/adapter/screen-renderer/window-box.ts#windowBoxOf` | PI-37 | ウィンドウを描く箱を、表示の状態（通常・最小化・最大化）から答える（表 T-335 の `WB-1` 〜 `WB-3`）。 |
| `windowEdgeAt` | entry | function | `src/adapter/screen-renderer/window-box.ts#windowEdgeAt` | PI-37 | 点が、箱の縁の内と外の掴み代（表 T-023d の `GR-25`、幅は `S-426`）のどの辺か角の上かを答える。 |
| `WindowName` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#WindowName` | PI-37 | 型。 |
| `windowNormalBoxOf` | entry | function | `src/adapter/screen-renderer/window-box.ts#windowNormalBoxOf` | PI-37 | ウィンドウの `WB-1` の箱を、覚えた位置と大きさ（無ければ既定の箱）から、範囲に収めて答える（表 T-335 の `WB-1`・`WB-6`）。 |
| `WindowPlace` | entry | type | `src/adapter/screen-renderer/window-box.ts#WindowPlace` | PI-37 | 型。 |
| `windowPlaceOf` | entry | function | `src/adapter/screen-renderer/window-box.ts#windowPlaceOf` | PI-37 | 掴みを離した箱を、覚える位置と大きさにする（表 T-335 の `WB-8`・`WB-9`）。 |
| `WindowShown` | entry | type | `src/adapter/screen-renderer/window-box.ts#WindowShown` | PI-37 | 型。 |
| `WindowStep` | entry | interface | `src/adapter/screen-renderer/table-window.ts#WindowStep` | -- | interface WindowStep |
| `appHeaderItemsFromDocument` | file only | function | `src/adapter/screen-renderer/app-header-items.ts#appHeaderItemsFromDocument` | -- | function appHeaderItemsFromDocument( schedule: Schedule, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): AppHeaderItems |
| `BrandingPlace` | file only | interface | `src/adapter/screen-renderer/app-header-items.ts#BrandingPlace` | -- | interface BrandingPlace |
| `brandingPlaceOf` | file only | function | `src/adapter/screen-renderer/app-header-items.ts#brandingPlaceOf` | -- | function brandingPlaceOf(): BrandingPlace |
| `displayScaleMessageText` | file only | function | `src/adapter/screen-renderer/app-header-items.ts#displayScaleMessageText` | -- | function displayScaleMessageText( displayScale: number, end: 'max' \| 'min' \| null, language: DisplayLanguage, ): string |
| `commandPaletteFromSession` | file only | function | `src/adapter/screen-renderer/command-palette.ts#commandPaletteFromSession` | -- | function commandPaletteFromSession( session: ScreenSession, settings: DocumentSettings, selection: Selection, readings: ScreenViewReadings, schedule?: Schedu... |
| `DELAY_REPORT_COLUMNS` | file only | const | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DELAY_REPORT_COLUMNS` | -- | const DELAY_REPORT_COLUMNS: readonly string[] = displayWords.delayReportColumns.map((entry) => entry.rowId) |
| `delayDiagnosticsReportFromWindow` | file only | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportFromWindow` | -- | function delayDiagnosticsReportFromWindow( session: ScreenSession, window: DelayDiagnosticsReportWindow \| null, view: TableView, report: DelayDiagnosticsRepo... |
| `delayDiagnosticsReportWithAdoptAll` | file only | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportWithAdoptAll` | -- | function delayDiagnosticsReportWithAdoptAll(window: DelayDiagnosticsReportWindow, tables: DelayFixTables): DelayDiagnosticsReportWindow |
| `delayDiagnosticsReportWithPick` | file only | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayDiagnosticsReportWithPick` | -- | function delayDiagnosticsReportWithPick(window: DelayDiagnosticsReportWindow, change: DelayFixPickChange): DelayDiagnosticsReportWindow |
| `delayFixBundleOf` | file only | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayFixBundleOf` | -- | function delayFixBundleOf(rows: readonly DelayFixRow[]): readonly DelayFixRow[] |
| `DelayFixCellView` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixCellView` | -- | interface DelayFixCellView |
| `DelayFixFooterView` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixFooterView` | -- | interface DelayFixFooterView |
| `DelayFixPickChange` | file only | type | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixPickChange` | -- | type DelayFixPickChange = Extract<SearchFilterChange, { readonly kind: 'fixPick' }> |
| `DelayFixRowView` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixRowView` | -- | interface DelayFixRowView extends SearchRowView |
| `DelayFixTables` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixTables` | -- | interface DelayFixTables |
| `delayFixValuesOf` | file only | function | `src/adapter/screen-renderer/delay-diagnostics-report.ts#delayFixValuesOf` | -- | function delayFixValuesOf(window: DelayDiagnosticsReportWindow): DelayFixWindowValues |
| `DelayFixView` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixView` | -- | interface DelayFixView |
| `DelayFixWindowValues` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixWindowValues` | -- | interface DelayFixWindowValues |
| `DelayFixWriteForm` | file only | type | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayFixWriteForm` | -- | type DelayFixWriteForm = 'beforeFixOverwrite' \| 'beforeFixBackup' |
| `DelayReportAsk` | file only | type | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayReportAsk` | -- | type DelayReportAsk = \| { readonly kind: 'fixWrite'; readonly writeForm: DelayFixWriteForm; readonly fixBundle: readonly DelayFixRow[] } \| { readonly kind: '... |
| `DelayReportLine` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayReportLine` | -- | interface DelayReportLine |
| `DelayReportRowView` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayReportRowView` | -- | interface DelayReportRowView extends SearchRowView |
| `DelayReportStep` | file only | interface | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayReportStep` | -- | interface DelayReportStep extends WindowStep |
| `DelayReportTable` | file only | type | `src/adapter/screen-renderer/delay-diagnostics-report.ts#DelayReportTable` | -- | type DelayReportTable = 'diagnosis' \| 'proposals' \| 'log' |
| `NO_DELAY_FIX_TABLES` | file only | const | `src/adapter/screen-renderer/delay-diagnostics-report.ts#NO_DELAY_FIX_TABLES` | -- | const NO_DELAY_FIX_TABLES: DelayFixTables = { proposals: [], log: [] } |
| `NO_DELAY_FIX_VALUES` | file only | const | `src/adapter/screen-renderer/delay-diagnostics-report.ts#NO_DELAY_FIX_VALUES` | -- | const NO_DELAY_FIX_VALUES: DelayFixWindowValues = |
| `HOLIDAY_SETTINGS_SURFACE` | file only | const | `src/adapter/screen-renderer/holiday-settings.ts#HOLIDAY_SETTINGS_SURFACE` | -- | const HOLIDAY_SETTINGS_SURFACE = 'Holiday Settings' |
| `holidaySettingsOf` | file only | function | `src/adapter/screen-renderer/holiday-settings.ts#holidaySettingsOf` | -- | function holidaySettingsOf( session: ScreenSession, schedule: Schedule, heading: string, commands: readonly CommandItem[], language: DisplayLanguage, ): Holi... |
| `confirmationAnswers` | file only | function | `src/adapter/screen-renderer/notices.ts#confirmationAnswers` | -- | function confirmationAnswers(language: DisplayLanguage): readonly ConfirmationAnswer[] |
| `confirmationFromSession` | file only | function | `src/adapter/screen-renderer/notices.ts#confirmationFromSession` | -- | function confirmationFromSession( session: ScreenSession, readings: ScreenViewReadings, ): Confirmation \| null |
| `downloadPageAddress` | file only | function | `src/adapter/screen-renderer/notices.ts#downloadPageAddress` | -- | function downloadPageAddress(): string |
| `linkedWordsOf` | file only | function | `src/adapter/screen-renderer/notices.ts#linkedWordsOf` | -- | function linkedWordsOf(word: string): LinkedWords \| null |
| `noticesFromSession` | file only | function | `src/adapter/screen-renderer/notices.ts#noticesFromSession` | -- | function noticesFromSession(session: ScreenSession, readings: ScreenViewReadings): readonly Notice[] |
| `reasonNextStepLink` | file only | function | `src/adapter/screen-renderer/notices.ts#reasonNextStepLink` | -- | function reasonNextStepLink(reason: string, language: DisplayLanguage): LinkedWords \| null |
| `reasonSurfaceWords` | file only | function | `src/adapter/screen-renderer/notices.ts#reasonSurfaceWords` | -- | function reasonSurfaceWords( reason: string, language: DisplayLanguage, ): { readonly text: string; readonly nextStep: string; readonly dismissText: string } |
| `shownDateTimeOf` | file only | function | `src/adapter/screen-renderer/notices.ts#shownDateTimeOf` | -- | function shownDateTimeOf(stored: string): string |
| `timeZoneAbbreviationOf` | file only | function | `src/adapter/screen-renderer/notices.ts#timeZoneAbbreviationOf` | -- | function timeZoneAbbreviationOf(key: string, language: DisplayLanguage): string |
| `timeZoneFieldWord` | file only | function | `src/adapter/screen-renderer/notices.ts#timeZoneFieldWord` | -- | function timeZoneFieldWord(part: string, language: DisplayLanguage): string |
| `timeZoneLinesOf` | file only | function | `src/adapter/screen-renderer/notices.ts#timeZoneLinesOf` | -- | function timeZoneLinesOf(key: string, language: DisplayLanguage): readonly [string, string] |
| `wholeScheduleShiftFieldWord` | file only | function | `src/adapter/screen-renderer/notices.ts#wholeScheduleShiftFieldWord` | -- | function wholeScheduleShiftFieldWord(part: string, language: DisplayLanguage): string |
| `zoneOffsetTextOf` | file only | function | `src/adapter/screen-renderer/notices.ts#zoneOffsetTextOf` | -- | function zoneOffsetTextOf(offsetMinutes: number): string |
| `exportNameBodyOf` | file only | function | `src/adapter/screen-renderer/open-modals.ts#exportNameBodyOf` | -- | function exportNameBodyOf(documentName: string): string |
| `helpModalFromSession` | file only | function | `src/adapter/screen-renderer/open-modals.ts#helpModalFromSession` | -- | function helpModalFromSession(session: ScreenSession, area: HelpWindowArea): HelpModal \| null |
| `openModalFromSession` | file only | function | `src/adapter/screen-renderer/open-modals.ts#openModalFromSession` | -- | function openModalFromSession( session: ScreenSession, schedule: Schedule, readings: ScreenViewReadings, settings: DocumentSettings, ): OpenModal \| null |
| `assigneeCandidatesOf` | file only | function | `src/adapter/screen-renderer/properties-panel.ts#assigneeCandidatesOf` | -- | function assigneeCandidatesOf( combo: Pick<AssigneeCombo, 'people' \| 'addWord'>, typed: string, isDescending: boolean, ): readonly AssigneeCandidate[] |
| `propertiesPanelFromSelection` | file only | function | `src/adapter/screen-renderer/properties-panel.ts#propertiesPanelFromSelection` | -- | function propertiesPanelFromSelection( schedule: Schedule, settings: DocumentSettings, selection: Selection, session: ScreenSession, readings: ScreenViewRead... |
| `widthOf` | file only | function | `src/adapter/screen-renderer/properties-panel.ts#widthOf` | -- | function widthOf(text: string, choices: readonly string[] \| null, labelCoef: number): number |
| `RESOURCE_LIST_COLUMNS` | file only | const | `src/adapter/screen-renderer/resource-list.ts#RESOURCE_LIST_COLUMNS` | -- | const RESOURCE_LIST_COLUMNS: readonly string[] = displayWords.resourceListColumns.map((entry) => entry.rowId) |
| `screenFrameFromRegions` | file only | function | `src/adapter/screen-renderer/screen-frame.ts#screenFrameFromRegions` | -- | function screenFrameFromRegions( regions: ScreenRegions, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, ): ScreenFrame |
| `GrabbedWindowName` | file only | type | `src/adapter/screen-renderer/screen-surface.ts#GrabbedWindowName` | -- | type GrabbedWindowName = WindowName \| 'closeOnlyTitledSurface' |
| `WindowGrab` | file only | type | `src/adapter/screen-renderer/screen-surface.ts#WindowGrab` | -- | type WindowGrab = \| |
| `EntryRefusal` | file only | interface | `src/adapter/screen-renderer/table-window.ts#EntryRefusal` | -- | interface EntryRefusal |
| `SearchColumnView` | file only | interface | `src/adapter/screen-renderer/table-window.ts#SearchColumnView` | -- | interface SearchColumnView |
| `SearchFilterMenuView` | file only | type | `src/adapter/screen-renderer/table-window.ts#SearchFilterMenuView` | -- | type SearchFilterMenuView = \| |
| `SearchFilterValueView` | file only | interface | `src/adapter/screen-renderer/table-window.ts#SearchFilterValueView` | -- | interface SearchFilterValueView |
| `SearchRowView` | file only | interface | `src/adapter/screen-renderer/search-panel.ts#SearchRowView` | -- | interface SearchRowView |
| `taskStateWordOf` | file only | function | `src/adapter/screen-renderer/search-panel.ts#taskStateWordOf` | -- | function taskStateWordOf( task: Task, statusDate: CalendarDay \| null, diagnosed: 'DG-1' \| 'DG-2' \| 'DG-3' \| undefined, language: DisplayLanguage, ): string |
| `taskTypeWordOf` | file only | function | `src/adapter/screen-renderer/search-panel.ts#taskTypeWordOf` | -- | function taskTypeWordOf(taskType: string, language: DisplayLanguage): string |
| `taskTypeWordsIn` | file only | function | `src/adapter/screen-renderer/search-panel.ts#taskTypeWordsIn` | -- | function taskTypeWordsIn(language: DisplayLanguage): readonly string[] |
| `windowTitleEntriesOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#windowTitleEntriesOf` | -- | function windowTitleEntriesOf(shown: WindowShown, language: DisplayLanguage): readonly CommandItem[] |
| `ASSIGNEE_SEPARATOR` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#ASSIGNEE_SEPARATOR` | -- | const ASSIGNEE_SEPARATOR = ', ' |
| `BLANK_SEARCH_VALUE` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#BLANK_SEARCH_VALUE` | -- | const BLANK_SEARCH_VALUE = '' |
| `ColumnFilter` | file only | type | `src/adapter/screen-renderer/search-table-filters.ts#ColumnFilter` | -- | type ColumnFilter = TableView['columnFilters'][number] |
| `columnHeadingsOf` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#columnHeadingsOf` | -- | function columnHeadingsOf( columns: readonly SearchColumn[], words: ReadonlyMap<string, { readonly ja: string; readonly en: string }>, isDate: (column: Searc... |
| `ColumnSort` | file only | type | `src/adapter/screen-renderer/search-table-filters.ts#ColumnSort` | -- | type ColumnSort = NonNullable<TableView['sort']> |
| `columnValuesOf` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#columnValuesOf` | -- | function columnValuesOf( rows: SearchRows, column: SearchColumn, sort: ColumnSort \| null = null, |
| `COMMENT_BOX_SEARCH_COLUMNS` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#COMMENT_BOX_SEARCH_COLUMNS` | -- | const COMMENT_BOX_SEARCH_COLUMNS: readonly SearchColumn[] = ['SQ-7', 'SQ-8', 'SQ-9'] |
| `comparePercentTexts` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#comparePercentTexts` | -- | function comparePercentTexts(a: string, b: string): number |
| `compareTaskTypes` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#compareTaskTypes` | -- | function compareTaskTypes(a: string, b: string): number |
| `filteredTableRows` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#filteredTableRows` | -- | function filteredTableRows<Row>( rows: readonly Row[], table: TableColumns<Row>, columnFilters: readonly ColumnFilter[], sort: ColumnSort \| null, ): readonly... |
| `HIDE_VALUE` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#HIDE_VALUE` | -- | const HIDE_VALUE = 'hide' |
| `isDateSearchColumn` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#isDateSearchColumn` | -- | function isDateSearchColumn(column: SearchColumn): boolean |
| `percentText` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#percentText` | -- | function percentText(percent: number \| null): string |
| `searchBodyTextOf` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#searchBodyTextOf` | -- | function searchBodyTextOf(text: string): string |
| `SearchColumn` | file only | type | `src/adapter/screen-renderer/search-table-filters.ts#SearchColumn` | -- | type SearchColumn = ColumnFilter['column'] |
| `SearchTaskState` | file only | type | `src/adapter/screen-renderer/search-table-filters.ts#SearchTaskState` | -- | type SearchTaskState = TaskSearchRow['planActualState'] \| 'DG-1' \| 'DG-2' \| 'DG-3' \| 'PM-4' |
| `searchTaskStateOf` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#searchTaskStateOf` | -- | function searchTaskStateOf(row: Pick<TaskSearchRow, 'progressMarker' \| 'planActualState'>): SearchTaskState |
| `SHOW_VALUE` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#SHOW_VALUE` | -- | const SHOW_VALUE = 'show' |
| `TableColumns` | file only | interface | `src/adapter/screen-renderer/search-table-filters.ts#TableColumns` | -- | interface TableColumns<Row> |
| `tableColumnValues` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#tableColumnValues` | -- | function tableColumnValues<Row>( rows: readonly Row[], table: TableColumns<Row>, column: SearchColumn, sort: ColumnSort \| null = null, |
| `TASK_GROUP_PATH_SEPARATOR` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#TASK_GROUP_PATH_SEPARATOR` | -- | const TASK_GROUP_PATH_SEPARATOR = ' \u2192 ' |
| `TASK_SEARCH_COLUMNS` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#TASK_SEARCH_COLUMNS` | -- | const TASK_SEARCH_COLUMNS: readonly SearchColumn[] = displayWords.searchColumns |
| `TASK_TYPES_ASCENDING` | file only | const | `src/adapter/screen-renderer/search-table-filters.ts#TASK_TYPES_ASCENDING` | -- | const TASK_TYPES_ASCENDING: readonly TaskType[] = ['task', 'milestone'] |
| `TaskType` | file only | type | `src/adapter/screen-renderer/search-table-filters.ts#TaskType` | -- | type TaskType = 'task' \| 'milestone' |
| `taskTypeOf` | file only | function | `src/adapter/screen-renderer/search-table-filters.ts#taskTypeOf` | -- | function taskTypeOf(isMilestone: boolean): TaskType |
| `clearEntryOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#clearEntryOf` | -- | function clearEntryOf(view: TableView, language: DisplayLanguage): CommandItem |
| `DATES_ONLY` | file only | const | `src/adapter/screen-renderer/table-window.ts#DATES_ONLY` | -- | const DATES_ONLY: ShownDateTimes = { isTimeOfDayVisible: false, instantOf: () => null, startSideOf: () => 'start' } |
| `dateText` | file only | function | `src/adapter/screen-renderer/table-window.ts#dateText` | -- | function dateText(stored: string \| null): string |
| `dateTimeText` | file only | function | `src/adapter/screen-renderer/table-window.ts#dateTimeText` | -- | function dateTimeText(stored: string \| null, times: ShownDateTimes, side: DateTimeSide): string |
| `entryOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#entryOf` | -- | function entryOf(icon: IconId, language: DisplayLanguage, isChosen = false, label?: string): CommandItem |
| `isClearEntry` | file only | function | `src/adapter/screen-renderer/table-window.ts#isClearEntry` | -- | function isClearEntry(entry: IconId): boolean |
| `isRowShown` | file only | function | `src/adapter/screen-renderer/table-window.ts#isRowShown` | -- | function isRowShown(table: VisibilityTable, visibility: TableVisibility, key: VisibilityKey): boolean |
| `isScheduleFilterAppliedIn` | file only | function | `src/adapter/screen-renderer/table-window.ts#isScheduleFilterAppliedIn` | -- | function isScheduleFilterAppliedIn(settings: DocumentSettings, table: VisibilityTable): boolean |
| `isWorkingFilter` | file only | function | `src/adapter/screen-renderer/table-window.ts#isWorkingFilter` | -- | function isWorkingFilter(filter: ColumnFilter): boolean |
| `openFilterIn` | file only | function | `src/adapter/screen-renderer/table-window.ts#openFilterIn` | -- | function openFilterIn(panel: TableWindowSession, shown: WindowShown \| null, table: WindowTable): SearchColumn \| null |
| `panelWithFilterShut` | file only | function | `src/adapter/screen-renderer/table-window.ts#panelWithFilterShut` | -- | function panelWithFilterShut<P extends TableWindowSession>(panel: P): P |
| `scheduleFilterEntryOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#scheduleFilterEntryOf` | -- | function scheduleFilterEntryOf(visibility: TableVisibility, readiness: ScheduleFilterReadiness, language: DisplayLanguage): CommandItem |
| `ScheduleFilterReadiness` | file only | type | `src/adapter/screen-renderer/table-window.ts#ScheduleFilterReadiness` | -- | type ScheduleFilterReadiness = 'ready' \| 'nothingChecked' |
| `scheduleFilterReadinessOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#scheduleFilterReadinessOf` | -- | function scheduleFilterReadinessOf( table: VisibilityTable, visibility: TableVisibility, rowKeysOf: () => ReadonlySet<number>, ): ScheduleFilterReadiness |
| `scheduleFilterRefusalsOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#scheduleFilterRefusalsOf` | -- | function scheduleFilterRefusalsOf(entry: CommandItem, readiness: ScheduleFilterReadiness, language: DisplayLanguage): readonly EntryRefusal[] |
| `ShownDateTimes` | file only | interface | `src/adapter/screen-renderer/table-window.ts#ShownDateTimes` | -- | interface ShownDateTimes |
| `shownDateTimesOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#shownDateTimesOf` | -- | function shownDateTimesOf(schedule: Schedule, settings: Pick<DocumentSettings, 'isTimeOfDayVisible' \| 'viewTimeZone'>): ShownDateTimes |
| `tableAfterFilterChange` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableAfterFilterChange` | -- | function tableAfterFilterChange( panel: TableWindowSession, view: TableView, shown: WindowShown \| null, change: SearchFilterChange, table: WindowTable, ): Ta... |
| `tableAfterFilterEntry` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableAfterFilterEntry` | -- | function tableAfterFilterEntry( panel: TableWindowSession, view: TableView, shown: WindowShown \| null, entry: IconId, table: WindowTable, listed?: readonly s... |
| `tableAfterShownChange` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableAfterShownChange` | -- | function tableAfterShownChange(table: VisibilityTable, view: TableView, change: Extract<SearchFilterChange, { readonly kind: 'shown' }>): TableView |
| `tableColumnsOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableColumnsOf` | -- | function tableColumnsOf( panel: TableWindowSession, view: TableView, table: WindowTable, language: DisplayLanguage, ): readonly SearchColumnView[] |
| `tableFilterMenuOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableFilterMenuOf` | -- | function tableFilterMenuOf( view: TableView, column: SearchColumn, table: WindowTable, language: DisplayLanguage, ): SearchFilterMenuView |
| `TableLook` | file only | interface | `src/adapter/screen-renderer/table-window.ts#TableLook` | -- | interface TableLook |
| `TableWindowSession` | file only | type | `src/adapter/screen-renderer/table-window.ts#TableWindowSession` | -- | type TableWindowSession = Omit<SearchPanelSession, 'table' \| 'textSizeStep'> |
| `tableWithColumnWidth` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableWithColumnWidth` | -- | function tableWithColumnWidth<P extends TableWindowSession>(panel: P, column: SearchColumn, width: number): P |
| `tableWithFilterClosed` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableWithFilterClosed` | -- | function tableWithFilterClosed<P extends TableWindowSession>(panel: P, shown: WindowShown \| null, table: WindowTable): P \| null |
| `tableWithFilterOpened` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableWithFilterOpened` | -- | function tableWithFilterOpened<P extends TableWindowSession>( panel: P, shown: WindowShown \| null, column: SearchColumn, table: WindowTable, ): P \| null |
| `tableWithScheduleFilterPressed` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableWithScheduleFilterPressed` | -- | function tableWithScheduleFilterPressed(view: TableView, entry: IconId, readiness: () => ScheduleFilterReadiness): TableView \| null |
| `tableWithViewsCleared` | file only | function | `src/adapter/screen-renderer/table-window.ts#tableWithViewsCleared` | -- | function tableWithViewsCleared(view: TableView): TableView |
| `visibilityHeadingOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#visibilityHeadingOf` | -- | function visibilityHeadingOf(readiness: ScheduleFilterReadiness): 'checked' \| 'empty' |
| `visibilityLabelOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#visibilityLabelOf` | -- | function visibilityLabelOf(value: string, language: DisplayLanguage): string \| null |
| `windowAfterEntry` | file only | function | `src/adapter/screen-renderer/table-window.ts#windowAfterEntry` | -- | function windowAfterEntry( window: TableWindowState, view: TableView, entry: IconId, filterColumn: string \| null, answers: { readonly readiness: () => Schedu... |
| `windowColumnsViewOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#windowColumnsViewOf` | -- | function windowColumnsViewOf( window: TableWindowState, view: TableView, table: WindowTable, language: DisplayLanguage, ): { readonly columns: readonly Searc... |
| `windowShownAfterEntry` | file only | function | `src/adapter/screen-renderer/table-window.ts#windowShownAfterEntry` | -- | function windowShownAfterEntry(shown: WindowShown, entry: IconId): WindowShown \| null \| undefined |
| `WindowTable` | file only | interface | `src/adapter/screen-renderer/table-window.ts#WindowTable` | -- | interface WindowTable |
| `windowWithColumnWidth` | file only | function | `src/adapter/screen-renderer/table-window.ts#windowWithColumnWidth` | -- | function windowWithColumnWidth(window: TableWindowState, column: SearchColumn, width: number): TableWindowState |
| `wordOf` | file only | function | `src/adapter/screen-renderer/table-window.ts#wordOf` | -- | function wordOf(held: { readonly [L in DisplayLanguage]: string } \| undefined, language: DisplayLanguage): string |
| `rulerAbbreviationsOf` | file only | function | `src/adapter/screen-renderer/task-group-panel.ts#rulerAbbreviationsOf` | -- | function rulerAbbreviationsOf( regions: ScreenRegions, schedule: Schedule, storedSettings: DocumentSettings, language: DisplayLanguage, ): readonly RulerAbbr... |
| `taskGroupPanelFromSchedule` | file only | function | `src/adapter/screen-renderer/task-group-panel.ts#taskGroupPanelFromSchedule` | -- | function taskGroupPanelFromSchedule( schedule: Schedule, storedSettings: DocumentSettings, _selection: Selection, _session: ScreenSession, readings: ScreenVi... |
| `assignmentWords` | file only | function | `src/adapter/screen-renderer/tooltips.ts#assignmentWords` | -- | function assignmentWords(keys: string \| null, press: string \| null, language: DisplayLanguage): string \| null |
| `baselineHint` | file only | function | `src/adapter/screen-renderer/tooltips.ts#baselineHint` | -- | function baselineHint(baseline: BaselineTask, schedule: Schedule \| null, language: DisplayLanguage, times = NO_HINT_TIMES): string |
| `cursorDateText` | file only | function | `src/adapter/screen-renderer/tooltips.ts#cursorDateText` | -- | function cursorDateText(day: CalendarDay, language: DisplayLanguage): string |
| `deadlineHint` | file only | function | `src/adapter/screen-renderer/tooltips.ts#deadlineHint` | -- | function deadlineHint(task: Task, schedule: Schedule \| null, language: DisplayLanguage, times = NO_HINT_TIMES): string \| null |
| `dualCursorReadoutOf` | file only | function | `src/adapter/screen-renderer/tooltips.ts#dualCursorReadoutOf` | -- | function dualCursorReadoutOf( regions: ScreenRegions, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, dataRegion?: string, ... |
| `guideCursorLabelOf` | file only | function | `src/adapter/screen-renderer/tooltips.ts#guideCursorLabelOf` | -- | function guideCursorLabelOf( regions: ScreenRegions, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, tooltips: readonly Too... |
| `iconHint` | file only | function | `src/adapter/screen-renderer/tooltips.ts#iconHint` | -- | function iconHint(icon: IconId, language: DisplayLanguage): string |
| `iconLabel` | file only | function | `src/adapter/screen-renderer/tooltips.ts#iconLabel` | -- | function iconLabel(icon: IconId, language: DisplayLanguage): string |
| `keysWords` | file only | function | `src/adapter/screen-renderer/tooltips.ts#keysWords` | -- | function keysWords(keys: readonly (readonly string[])[] \| null, language: DisplayLanguage): string \| null |
| `tooltipsFromScreenView` | file only | function | `src/adapter/screen-renderer/tooltips.ts#tooltipsFromScreenView` | -- | function tooltipsFromScreenView( shown: Omit<ScreenView, 'tooltips'>, settings: DocumentSettings, session: ScreenSession, readings: ScreenViewReadings, sched... |
| `WindowEdge` | file only | type | `src/adapter/screen-renderer/window-box.ts#WindowEdge` | -- | type WindowEdge = 'top' \| 'bottom' \| 'left' \| 'right' \| 'topLeft' \| 'topRight' \| 'bottomLeft' \| 'bottomRight' |
| `WindowFloor` | file only | interface | `src/adapter/screen-renderer/window-box.ts#WindowFloor` | -- | interface WindowFloor |
| `WindowGrabRegion` | file only | type | `src/adapter/screen-renderer/window-box.ts#WindowGrabRegion` | -- | type WindowGrabRegion = 'titleBand' \| WindowEdge |
| `windowPlaceInRange` | file only | function | `src/adapter/screen-renderer/window-box.ts#windowPlaceInRange` | -- | function windowPlaceInRange(place: WindowPlace, range: ScreenRect): WindowPlace |

## DomScreenSurface (PI-38, `src/framework/dom-screen-surface/dom-screen-surface.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `anchoredEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#anchoredEntry` | -- | function anchoredEntry( host: Document, item: CommandItem, anchors: Map<string, HTMLElement>, surface?: string, ): HTMLElement |
| `anchorKey` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#anchorKey` | -- | function anchorKey(anchor: TooltipAnchor): string |
| `appendAssignment` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#appendAssignment` | -- | function appendAssignment( host: Document, target: HTMLElement, written: string, wrapsWords: boolean, ): void |
| `boxStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#boxStyle` | -- | function boxStyle(box: ScreenRect): string |
| `chromeScaledPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#chromeScaledPx` | -- | function chromeScaledPx(px: number): number |
| `commandEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#commandEntry` | -- | function commandEntry(host: Document, item: CommandItem): HTMLElement |
| `CONFIRMATION_ANSWER_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#CONFIRMATION_ANSWER_ATTRIBUTE` | -- | const CONFIRMATION_ANSWER_ATTRIBUTE = 'data-confirmation-answer' |
| `domScreenSurface` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#domScreenSurface` | -- | function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface |
| `entranceBorderPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceBorderPx` | -- | function entranceBorderPx(): number |
| `entranceGapPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceGapPx` | -- | function entranceGapPx(gapTaskGroup: EntranceGapTaskGroup = 'S-141'): number |
| `entranceOuterHeightPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceOuterHeightPx` | -- | function entranceOuterHeightPx(gapTaskGroup: EntranceGapTaskGroup = 'S-141'): number |
| `entranceOuterWidthPx` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceOuterWidthPx` | -- | function entranceOuterWidthPx(gapTaskGroup: EntranceGapTaskGroup = 'S-141'): number |
| `entranceStateFill` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entranceStateFill` | -- | function entranceStateFill(standing: readonly EntranceStateRow[]): string |
| `entryFaintStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entryFaintStyle` | -- | function entryFaintStyle(gapTaskGroup: EntranceGapTaskGroup = 'S-141'): string |
| `entryStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#entryStyle` | -- | function entryStyle(gapTaskGroup: EntranceGapTaskGroup = 'S-141'): string |
| `fillEntry` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#fillEntry` | -- | function fillEntry( host: Document, entry: HTMLElement, icon: string, aroundTheShape = '', |
| `HOST_ENTER` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#HOST_ENTER` | -- | const HOST_ENTER = 'Enter' |
| `IMPORT_REPORT_DISMISS_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#IMPORT_REPORT_DISMISS_ATTRIBUTE` | -- | const IMPORT_REPORT_DISMISS_ATTRIBUTE = 'data-import-report-dismiss' |
| `made` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#made` | -- | function made(host: Document, tag: string, style: string): HTMLElement |
| `NOT_STORED_ARMED_LABEL_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ARMED_LABEL_SIZES` | -- | const NOT_STORED_ARMED_LABEL_SIZES: |
| `NOT_STORED_CONFIRMATION_RULE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_CONFIRMATION_RULE_SIZES` | -- | const NOT_STORED_CONFIRMATION_RULE_SIZES: |
| `NOT_STORED_DOCUMENT_TITLE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_DOCUMENT_TITLE_SIZES` | -- | const NOT_STORED_DOCUMENT_TITLE_SIZES: |
| `NOT_STORED_EXPORT_CHOOSER_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_EXPORT_CHOOSER_SIZES` | -- | const NOT_STORED_EXPORT_CHOOSER_SIZES: |
| `NOT_STORED_HELP_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_HELP_SIZES` | -- | const NOT_STORED_HELP_SIZES: |
| `NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES` | -- | const NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES: |
| `NOT_STORED_ICON_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_ICON_SIZES` | -- | const NOT_STORED_ICON_SIZES: |
| `NOT_STORED_PALETTE_GROUP_RULE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_PALETTE_GROUP_RULE_SIZES` | -- | const NOT_STORED_PALETTE_GROUP_RULE_SIZES: |
| `NOT_STORED_PALETTE_ROW_CAP` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_PALETTE_ROW_CAP` | -- | const NOT_STORED_PALETTE_ROW_CAP: |
| `NOT_STORED_PROPERTY_FIELD_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_PROPERTY_FIELD_SIZES` | -- | const NOT_STORED_PROPERTY_FIELD_SIZES: |
| `NOT_STORED_RE_DIAGNOSE_WEIGHT` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_RE_DIAGNOSE_WEIGHT` | -- | const NOT_STORED_RE_DIAGNOSE_WEIGHT: |
| `NOT_STORED_SEARCH_PANEL_FONT_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_SEARCH_PANEL_FONT_SIZES` | -- | const NOT_STORED_SEARCH_PANEL_FONT_SIZES: |
| `NOT_STORED_SEARCH_PANEL_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_SEARCH_PANEL_SIZES` | -- | const NOT_STORED_SEARCH_PANEL_SIZES: |
| `NOT_STORED_TASK_GROUP_BAND_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_TASK_GROUP_BAND_SIZES` | -- | const NOT_STORED_TASK_GROUP_BAND_SIZES: |
| `NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES` | -- | const NOT_STORED_TASK_GROUP_CONTROL_EDGE_SIZES: |
| `NOT_STORED_TASK_GROUP_DROP_RING_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_TASK_GROUP_DROP_RING_SIZES` | -- | const NOT_STORED_TASK_GROUP_DROP_RING_SIZES: |
| `NOT_STORED_TASK_GROUP_GRAB_COPY_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_TASK_GROUP_GRAB_COPY_SIZES` | -- | const NOT_STORED_TASK_GROUP_GRAB_COPY_SIZES: |
| `NOT_STORED_TASK_GROUP_GRAB_STRIP_SIZES` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_TASK_GROUP_GRAB_STRIP_SIZES` | -- | const NOT_STORED_TASK_GROUP_GRAB_STRIP_SIZES: |
| `NOT_STORED_WHEEL_UNITS` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOT_STORED_WHEEL_UNITS` | -- | const NOT_STORED_WHEEL_UNITS: |
| `NOTICE_BOX_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOTICE_BOX_ATTRIBUTE` | -- | const NOTICE_BOX_ATTRIBUTE = 'data-notice-box' |
| `NOTICE_BOX_REASON_SEPARATOR` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOTICE_BOX_REASON_SEPARATOR` | -- | const NOTICE_BOX_REASON_SEPARATOR = ' ' |
| `NOTICE_DISMISS_KEY_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#NOTICE_DISMISS_KEY_ATTRIBUTE` | -- | const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice' |
| `pageGroundStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#pageGroundStyle` | PI-38 | 地の色の宣言 |
| `PAINT` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#PAINT` | -- | const PAINT = |
| `part` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#part` | -- | function part(host: Document, tag: string, role: string, style: string): HTMLElement |
| `REPORT_REASON_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#REPORT_REASON_ATTRIBUTE` | -- | const REPORT_REASON_ATTRIBUTE = 'data-report-reason' |
| `ROLE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#ROLE` | -- | const ROLE = |
| `SCHEDULE_FILTER_BAR_ROLE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCHEDULE_FILTER_BAR_ROLE` | -- | const SCHEDULE_FILTER_BAR_ROLE = 'Schedule Filter Bar' |
| `SCREEN_COLORS` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCREEN_COLORS` | -- | const SCREEN_COLORS: |
| `SCREEN_Z_ORDER` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCREEN_Z_ORDER` | -- | const SCREEN_Z_ORDER: readonly string[] = [ |
| `SCREEN_Z_ORDER_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCREEN_Z_ORDER_ATTRIBUTE` | -- | const SCREEN_Z_ORDER_ATTRIBUTE = 'data-uz' |
| `ScreenSurfaceWiring` | entry | interface | `src/framework/dom-screen-surface/dom-screen-surface.ts#ScreenSurfaceWiring` | -- | interface ScreenSurfaceWiring |
| `ScreenTheme` | entry | interface | `src/framework/dom-screen-surface/dom-screen-surface.ts#ScreenTheme` | PI-38 | 型 |
| `SCROLLBAR_AXIS_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SCROLLBAR_AXIS_ATTRIBUTE` | -- | const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis' |
| `SEARCH_COLUMN_WIDTH_ROWS` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SEARCH_COLUMN_WIDTH_ROWS` | -- | const SEARCH_COLUMN_WIDTH_ROWS: |
| `SEPARATE_NOTE_ATTRIBUTE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#SEPARATE_NOTE_ATTRIBUTE` | -- | const SEPARATE_NOTE_ATTRIBUTE = 'data-separate-note' |
| `showPointerShapeOver` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#showPointerShapeOver` | PI-38 | UI パーツの根にポインタの形を書き、形があるあいだは中の要素にその形を継がせる。 |
| `stateGround` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#stateGround` | -- | function stateGround(paint: string, depthTaskGroup: 'S-214' \| 'S-215'): string |
| `STYLE` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#STYLE` | -- | const STYLE = |
| `TASK_GROUP_CARRIED_MARK` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#TASK_GROUP_CARRIED_MARK` | -- | const TASK_GROUP_CARRIED_MARK = 'data-task-group-carried' |
| `TASK_GROUP_GRAB_STRIP_MARK` | entry | const | `src/framework/dom-screen-surface/dom-screen-surface.ts#TASK_GROUP_GRAB_STRIP_MARK` | -- | const TASK_GROUP_GRAB_STRIP_MARK = 'data-task-group-grab' |
| `themeStyle` | entry | function | `src/framework/dom-screen-surface/dom-screen-surface.ts#themeStyle` | -- | function themeStyle(theme: ScreenTheme): string |
| `WindowReaders` | entry | interface | `src/framework/dom-screen-surface/dom-screen-surface.ts#WindowReaders` | -- | interface WindowReaders |
| `appHeaderStyle` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#appHeaderStyle` | -- | function appHeaderStyle(): string |
| `drawLanguageReading` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#drawLanguageReading` | -- | function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void |
| `fillAppHeader` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#fillAppHeader` | -- | function fillAppHeader( host: Document, header: HTMLElement, items: AppHeaderItems, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `spelledFileSize` | file only | function | `src/framework/dom-screen-surface/app-header-drawing.ts#spelledFileSize` | -- | function spelledFileSize(byteLength: number): string |
| `armedLabelStyle` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#armedLabelStyle` | -- | function armedLabelStyle(): string |
| `PALETTE_GRAB_BAND_ENTRY` | file only | const | `src/framework/dom-screen-surface/command-palette-drawing.ts#PALETTE_GRAB_BAND_ENTRY` | -- | const PALETTE_GRAB_BAND_ENTRY = 'IC-53' |
| `paletteColumnsOf` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteColumnsOf` | -- | function paletteColumnsOf(entranceCount: number, perRowCap: number): number |
| `paletteColumnsStyle` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteColumnsStyle` | -- | function paletteColumnsStyle(entranceCount: number): string |
| `paletteElement` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteElement` | -- | function paletteElement( host: Document, palette: CommandPalette, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `paletteGroupRuleStyle` | file only | function | `src/framework/dom-screen-surface/command-palette-drawing.ts#paletteGroupRuleStyle` | -- | function paletteGroupRuleStyle(): string |
| `CONTROL_KEYS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#CONTROL_KEYS` | -- | const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>() |
| `CONTROL_PICKS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#CONTROL_PICKS` | -- | const CONTROL_PICKS = new WeakMap<Element, NonNullable<FieldCommit['pick']>>() |
| `fieldEditingOf` | file only | function | `src/framework/dom-screen-surface/field-editing.ts#fieldEditingOf` | -- | function fieldEditingOf(host: Document, propertiesPanel: HTMLElement) |
| `SETTLED_AS_ONE_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#SETTLED_AS_ONE_ATTRIBUTE` | -- | const SETTLED_AS_ONE_ATTRIBUTE = 'data-settled-as-one' |
| `TextEntryControl` | file only | interface | `src/framework/dom-screen-surface/field-editing.ts#TextEntryControl` | -- | interface TextEntryControl |
| `TYPED_CONTROLS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#TYPED_CONTROLS` | -- | const TYPED_CONTROLS = new WeakSet<object>() |
| `TYPED_ROWS` | file only | const | `src/framework/dom-screen-surface/field-editing.ts#TYPED_ROWS` | -- | const TYPED_ROWS = new WeakMap<object, string>() |
| `HOLIDAY_SETTINGS_TARGET_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#HOLIDAY_SETTINGS_TARGET_ATTRIBUTE` | -- | const HOLIDAY_SETTINGS_TARGET_ATTRIBUTE = 'data-holiday-target' |
| `holidaySettingsBodyElements` | file only | function | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#holidaySettingsBodyElements` | -- | function holidaySettingsBodyElements( host: Document, modal: HolidaySettingsModal, anchors: Map<string, HTMLElement>, ): readonly HTMLElement[] |
| `holidaySettingsFrameStyle` | file only | function | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#holidaySettingsFrameStyle` | -- | function holidaySettingsFrameStyle(): string |
| `HolidaySettingsModal` | file only | type | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#HolidaySettingsModal` | -- | type HolidaySettingsModal = HolidaySettings |
| `isHolidaySettingsModal` | file only | function | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#isHolidaySettingsModal` | -- | function isHolidaySettingsModal(modal: OpenModal): modal is HolidaySettingsModal |
| `replaceKeepingListScroll` | file only | function | `src/framework/dom-screen-surface/holiday-settings-drawing.ts#replaceKeepingListScroll` | -- | function replaceKeepingListScroll(layer: Element, drawn: readonly HTMLElement[]): void |
| `confirmationAnswerElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#confirmationAnswerElement` | -- | function confirmationAnswerElement( host: Document, answer: Confirmation['answers'][number], ): HTMLElement |
| `confirmationElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#confirmationElement` | -- | function confirmationElement(host: Document, confirmation: Confirmation): HTMLElement |
| `LINK_RELATION` | file only | const | `src/framework/dom-screen-surface/notices-drawing.ts#LINK_RELATION` | -- | const LINK_RELATION = 'noopener noreferrer' |
| `LINK_TARGET` | file only | const | `src/framework/dom-screen-surface/notices-drawing.ts#LINK_TARGET` | -- | const LINK_TARGET = '_blank' |
| `linkElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#linkElement` | -- | function linkElement( host: Document, address: string, words: string = address, |
| `nextStepElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#nextStepElement` | -- | function nextStepElement(host: Document, text: string, link?: LinkedWords \| null): HTMLElement |
| `noticeElement` | file only | function | `src/framework/dom-screen-surface/notices-drawing.ts#noticeElement` | -- | function noticeElement(host: Document, notice: Notice): HTMLElement |
| `helpWindowPainter` | file only | function | `src/framework/dom-screen-surface/open-modals-drawing.ts#helpWindowPainter` | -- | function helpWindowPainter(host: Document, helpLayer: HTMLElement) |
| `modalElement` | file only | function | `src/framework/dom-screen-surface/open-modals-drawing.ts#modalElement` | -- | function modalElement( host: Document, modal: OpenModal, anchors: Map<string, HTMLElement>, ): DrawnModal |
| `fieldElement` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#fieldElement` | -- | function fieldElement( host: Document, field: PropertyField, typedByRow: Map<string, TextEntryControl> \| null, ): HTMLElement |
| `fillPropertiesPanel` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#fillPropertiesPanel` | -- | function fillPropertiesPanel( host: Document, panel: HTMLElement, description: PropertiesPanel, anchors: Map<string, HTMLElement>, typedByRow: Map<string, Te... |
| `fitPanelFields` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#fitPanelFields` | -- | function fitPanelFields(panel: HTMLElement): void |
| `markPropertiesPanel` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#markPropertiesPanel` | -- | function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void |
| `propertiesPanelKeyOf` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#propertiesPanelKeyOf` | -- | function propertiesPanelKeyOf(description: PropertiesPanel \| null): string |
| `propertiesPanelStyle` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#propertiesPanelStyle` | -- | function propertiesPanelStyle(): string |
| `rewritePanelReadouts` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#rewritePanelReadouts` | -- | function rewritePanelReadouts(panel: HTMLElement, description: PropertiesPanel): void |
| `surfaceFieldElement` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#surfaceFieldElement` | -- | function surfaceFieldElement(host: Document, row: string, control: PropertyControl): HTMLElement |
| `withPropertyLinkJump` | file only | function | `src/framework/dom-screen-surface/properties-panel-drawing.ts#withPropertyLinkJump` | -- | function withPropertyLinkJump(answer: ScreenPart \| null, first: Element \| null): ScreenPart \| null |
| `fillScreenFrame` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#fillScreenFrame` | -- | function fillScreenFrame( host: Document, layer: HTMLElement, bandLayer: HTMLElement, frame: ScreenFrame, anchors: Map<string, HTMLElement>, ): void |
| `horizontalScrollbar` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#horizontalScrollbar` | -- | function horizontalScrollbar(frame: ScreenFrame): ScreenFrame['scrollbars'][number] \| undefined |
| `panelEdge` | file only | function | `src/framework/dom-screen-surface/screen-frame-drawing.ts#panelEdge` | -- | function panelEdge( frame: ScreenFrame, panel: 'taskGroupPanel' \| 'propertiesPanel', ): ScreenRect \| null |
| `ColumnSizing` | file only | interface | `src/framework/dom-screen-surface/search-panel-drawing.ts#ColumnSizing` | -- | interface ColumnSizing |
| `columnWidthPx` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#columnWidthPx` | -- | function columnWidthPx(column: SearchColumnView, sizing: ColumnSizing): number |
| `DrawnRow` | file only | interface | `src/framework/dom-screen-surface/search-panel-drawing.ts#DrawnRow` | -- | interface DrawnRow |
| `DrawnTable` | file only | type | `src/framework/dom-screen-surface/search-panel-drawing.ts#DrawnTable` | -- | type DrawnTable = Pick<TableWindowView, 'columns' \| 'rows' \| 'jumpAt' \| 'glyphAt' \| 'showAt' \| 'showHeading' \| 'chosenAt' \| 'fixTable'> |
| `filterChangeWatch` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#filterChangeWatch` | -- | function filterChangeWatch(layer: HTMLElement, onChanged: () => void, visibilityColumn: string): { readonly read: () => readonly SearchFilterChange[] } |
| `focusSearchWordIn` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#focusSearchWordIn` | -- | function focusSearchWordIn(panel: HTMLElement): boolean |
| `measuredWidthFloor` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#measuredWidthFloor` | -- | function measuredWidthFloor(fontPx: number): number |
| `pinFixedColumns` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#pinFixedColumns` | -- | function pinFixedColumns(tableBox: Element): void |
| `SEARCH_FILTER_BOUND_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_FILTER_BOUND_ATTRIBUTE` | -- | const SEARCH_FILTER_BOUND_ATTRIBUTE = 'data-search-filter-bound' |
| `SEARCH_FILTER_COLUMN_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_FILTER_COLUMN_ATTRIBUTE` | -- | const SEARCH_FILTER_COLUMN_ATTRIBUTE = 'data-search-filter-column' |
| `SEARCH_FILTER_ROW` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_FILTER_ROW` | -- | const SEARCH_FILTER_ROW = 'SV-7' |
| `SEARCH_FILTER_SEARCH_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_FILTER_SEARCH_ATTRIBUTE` | -- | const SEARCH_FILTER_SEARCH_ATTRIBUTE = 'data-search-filter-search' |
| `SEARCH_FILTER_VALUE_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_FILTER_VALUE_ATTRIBUTE` | -- | const SEARCH_FILTER_VALUE_ATTRIBUTE = 'data-search-filter-value' |
| `SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE` | -- | const SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE = 'data-search-comment-box' |
| `SEARCH_JUMP_TASK_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_JUMP_TASK_ATTRIBUTE` | -- | const SEARCH_JUMP_TASK_ATTRIBUTE = 'data-search-task' |
| `SEARCH_WORD_FIELD_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_WORD_FIELD_ATTRIBUTE` | -- | const SEARCH_WORD_FIELD_ATTRIBUTE = 'data-search-word' |
| `SEARCH_WORD_ROW` | file only | const | `src/framework/dom-screen-surface/search-panel-drawing.ts#SEARCH_WORD_ROW` | -- | const SEARCH_WORD_ROW = 'SV-2' |
| `searchFilterMenuElement` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchFilterMenuElement` | -- | function searchFilterMenuElement( host: Document, menu: SearchFilterMenuView, fontPx: number, anchors: Map<string, HTMLElement>, ): HTMLElement |
| `searchPanelBoxOf` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchPanelBoxOf` | -- | function searchPanelBoxOf(view: TableWindowView, defaultRatio: SizeRatio): ScreenRect |
| `searchPanelElement` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchPanelElement` | -- | function searchPanelElement( host: Document, view: TableWindowView, placed: { readonly box: ScreenRect; readonly fontPx: number; readonly sizing?: ColumnSizi... |
| `searchPanelFontPxOf` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchPanelFontPxOf` | -- | function searchPanelFontPxOf(textSizeStep: number, sizes: { readonly [row: string]: number }): number |
| `searchPanelPainter` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchPanelPainter` | -- | function searchPanelPainter(host: Document, layer: HTMLElement, onWordTyped: () => void, identity = SEARCH_PANEL_IDENTITY) |
| `searchTableElement` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#searchTableElement` | -- | function searchTableElement(host: Document, view: DrawnTable, fontPx: number, sizing: ColumnSizing = unmeasuredSizing(fontPx)): HTMLElement |
| `tableKeyOf` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#tableKeyOf` | -- | function tableKeyOf(table: DrawnTable, fontPx: number, filterMenu: unknown): string |
| `TableWindowIdentity` | file only | interface | `src/framework/dom-screen-surface/search-panel-drawing.ts#TableWindowIdentity` | -- | interface TableWindowIdentity |
| `TableWindowView` | file only | type | `src/framework/dom-screen-surface/search-panel-drawing.ts#TableWindowView` | -- | type TableWindowView = Omit<SearchPanelView, 'table' \| 'rows'> & |
| `typedWordWatch` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#typedWordWatch` | -- | function typedWordWatch(layer: HTMLElement, onWordTyped: () => void): { readonly read: () => string \| null } |
| `unmeasuredSizing` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#unmeasuredSizing` | -- | function unmeasuredSizing(fontPx: number): ColumnSizing |
| `windowStyle` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#windowStyle` | -- | function windowStyle(): string |
| `wordFieldElement` | file only | function | `src/framework/dom-screen-surface/search-panel-drawing.ts#wordFieldElement` | -- | function wordFieldElement(host: Document, word: string, fontPx: number): HTMLElement |
| `ADD_CHILD_ROW_ENTRY` | file only | const | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#ADD_CHILD_ROW_ENTRY` | -- | const ADD_CHILD_ROW_ENTRY = 'IC-91' |
| `DELETE_ROW_ENTRY` | file only | const | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#DELETE_ROW_ENTRY` | -- | const DELETE_ROW_ENTRY = 'IC-82' |
| `fillTaskGroupGrabCues` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#fillTaskGroupGrabCues` | -- | function fillTaskGroupGrabCues(host: Document, layer: HTMLElement, tree: HTMLElement, panel: TaskGroupPanel): void |
| `fillTaskGroupTitleTree` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#fillTaskGroupTitleTree` | -- | function fillTaskGroupTitleTree( host: Document, tree: HTMLElement, panel: TaskGroupPanel, anchors: Map<string, HTMLElement>, ): void |
| `foldedTaskGroupCountElement` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#foldedTaskGroupCountElement` | -- | function foldedTaskGroupCountElement(host: Document, count: number, rightPx: string): HTMLElement |
| `HeadEntries` | file only | interface | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#HeadEntries` | -- | interface HeadEntries |
| `headEntryElements` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#headEntryElements` | -- | function headEntryElements(host: Document): HeadEntries |
| `headFoldedTaskGroupCountRight` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#headFoldedTaskGroupCountRight` | -- | function headFoldedTaskGroupCountRight(): string |
| `markFoldedTaskGroupCount` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#markFoldedTaskGroupCount` | -- | function markFoldedTaskGroupCount(mark: HTMLElement, count: number, rightPx: string): void |
| `markHeadEntries` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#markHeadEntries` | -- | function markHeadEntries(entries: HeadEntries, panel: TaskGroupPanel): void |
| `TASK_GROUP_CONTROL_GROUND_MARK` | file only | const | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#TASK_GROUP_CONTROL_GROUND_MARK` | -- | const TASK_GROUP_CONTROL_GROUND_MARK = 'data-task-group-control-ground' |
| `taskGroupControlsHeightReporter` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#taskGroupControlsHeightReporter` | -- | function taskGroupControlsHeightReporter( taskGroupTitleTree: HTMLElement, readClockMs: () => number, wiring: Pick<ScreenSurfaceWiring, 'onTaskGroupControlsH... |
| `taskGroupControlsMeasureKey` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#taskGroupControlsMeasureKey` | -- | function taskGroupControlsMeasureKey( view: ScreenView, theme: ScreenTheme, headerHeightPx: number, ): string |
| `TaskGroupGrabCues` | file only | interface | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#TaskGroupGrabCues` | -- | interface TaskGroupGrabCues |
| `taskGroupGrabCuesOf` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#taskGroupGrabCuesOf` | -- | function taskGroupGrabCuesOf(panel: TaskGroupPanel): TaskGroupGrabCues |
| `taskGroupRowsOf` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#taskGroupRowsOf` | -- | function taskGroupRowsOf(panel: TaskGroupPanel): TaskGroupPanel |
| `taskGroupsTopPx` | file only | function | `src/framework/dom-screen-surface/task-group-panel-drawing.ts#taskGroupsTopPx` | -- | function taskGroupsTopPx(panel: TaskGroupPanel): number \| null |
| `keepTooltipsInside` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#keepTooltipsInside` | -- | function keepTooltipsInside(layer: HTMLElement): void |
| `pointTipPlace` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#pointTipPlace` | -- | function pointTipPlace(point: Point, size: Size, room: Size): { readonly left: number; readonly top: number } |
| `showPointTip` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#showPointTip` | -- | function showPointTip( host: Document, layer: HTMLElement, tip: { readonly lines: readonly string[]; readonly at: Point } \| undefined, ): void |
| `tooltipAnchorTable` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#tooltipAnchorTable` | -- | function tooltipAnchorTable(root: HTMLElement) |
| `tooltipElement` | file only | function | `src/framework/dom-screen-surface/tooltips-drawing.ts#tooltipElement` | -- | function tooltipElement( host: Document, tip: Tooltip, anchorFor: (key: string, anchor: TooltipAnchor) => HTMLElement \| undefined, ): HTMLElement |
| `PlacedWindow` | file only | interface | `src/framework/dom-screen-surface/window-frame-drawing.ts#PlacedWindow` | -- | interface PlacedWindow |
| `PointAsked` | file only | interface | `src/framework/dom-screen-surface/window-frame-drawing.ts#PointAsked` | -- | interface PointAsked |
| `WINDOW_GRAB_ATTRIBUTE` | file only | const | `src/framework/dom-screen-surface/window-frame-drawing.ts#WINDOW_GRAB_ATTRIBUTE` | -- | const WINDOW_GRAB_ATTRIBUTE = 'data-window-grab' |
| `windowPartAt` | file only | function | `src/framework/dom-screen-surface/window-frame-drawing.ts#windowPartAt` | -- | function windowPartAt( window: Element \| null, placed: PlacedWindow \| null, asked: PointAsked, partOfWindow: ScreenPart, ): ScreenPart \| null |
| `windowPartOf` | file only | function | `src/framework/dom-screen-surface/window-frame-drawing.ts#windowPartOf` | -- | function windowPartOf(part: string): ScreenPart |
| `windowTitleRowElement` | file only | function | `src/framework/dom-screen-surface/window-frame-drawing.ts#windowTitleRowElement` | -- | function windowTitleRowElement( host: Document, heading: string, entries: { readonly before: readonly CommandItem[]; readonly titled: readonly CommandItem[] ... |

## AdvanceScreenSession (PI-39, `src/use-case/advance-screen-session/advance-screen-session.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `advanceScreenSession` | entry | function | `src/use-case/advance-screen-session/advance-screen-session.ts#advanceScreenSession` | PI-39 | 1 段進める。 |
| `ArmKind` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#ArmKind` | PI-39 | 型。 |
| `BaseChangeWay` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#BaseChangeWay` | -- | type BaseChangeWay = 'keepGlobalTime' \| 'keepLocalTime' |
| `calendarCommandOf` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#calendarCommandOf` | PI-39 | 下書きから 表 T-108 の `CM-39` を組む —— 文書と同じ部分は入れず、文書と同じ下書きは何も書かない（`WC-7`） |
| `CalendarDraft` | entry | interface | `src/use-case/advance-screen-session/calendar-draft.ts#CalendarDraft` | PI-39 | 型。 |
| `calendarDraftOf` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#calendarDraftOf` | PI-39 | 文書の暦から下書きを組む —— 面が示す 1 組（`FR-088`）と 表 T-344 の `WC-2`・`WC-3`・`WC-4`・`WC-8` |
| `CalendarDraftRange` | entry | interface | `src/use-case/advance-screen-session/calendar-draft.ts#CalendarDraftRange` | -- | interface CalendarDraftRange |
| `CalendarDraftRangeSide` | entry | type | `src/use-case/advance-screen-session/calendar-draft.ts#CalendarDraftRangeSide` | -- | type CalendarDraftRangeSide = 'start' \| 'end' |
| `CalendarDraftRefusal` | entry | type | `src/use-case/advance-screen-session/calendar-draft.ts#CalendarDraftRefusal` | PI-39 | 型。 |
| `calendarDraftRefusalsOf` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#calendarDraftRefusalsOf` | PI-39 | 下書きの断りの全部 —— 表 T-344 の `WC-10`。 |
| `canAddRange` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#canAddRange` | PI-39 | 時間帯の行を足せるか —— `IC-163`、`WC-8` |
| `canDeleteRange` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#canDeleteRange` | PI-39 | 時間帯の行を消せるか —— `IC-164`、`WC-8` |
| `draftClockMinuteOf` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#draftClockMinuteOf` | -- | function draftClockMinuteOf(text: string, side: CalendarDraftRangeSide): number \| null |
| `emptyScreenSession` | entry | const | `src/use-case/advance-screen-session/advance-screen-session.ts#emptyScreenSession` | PI-39 | 初期の状態。 |
| `emptySearchPanelSession` | entry | const | `src/use-case/advance-screen-session/screen-values.ts#emptySearchPanelSession` | PI-39 | `SearchPanelSession` の初期の値 —— `_assets/tbl-settings.md` の 表 T-206 の `S-419` ・ `S-420` ・ `S-429` の既定 |
| `exceptionsInStartOrder` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#exceptionsInStartOrder` | PI-39 | 例外日の行を始まりの日の順に並べたもの —— `WC-4` |
| `FileFlowImportAnswer` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowImportAnswer` | PI-39 | 型。 |
| `FileFlowOpenRoute` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOpenRoute` | PI-39 | 型。 |
| `FileFlowOwedAction` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOwedAction` | PI-39 | 型。 |
| `FileFlowQuestion` | entry | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowQuestion` | PI-39 | 型。 |
| `FileFlowSurfaceName` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowSurfaceName` | PI-39 | 型。 |
| `FileFlowWriteForm` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowWriteForm` | PI-39 | 型。 |
| `FileOperationState` | entry | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileOperationState` | PI-39 | 型。 |
| `hasCalendarDraftRefusal` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#hasCalendarDraftRefusal` | -- | function hasCalendarDraftRefusal(draft: CalendarDraft): boolean |
| `isHelpStandingIn` | entry | function | `src/use-case/advance-screen-session/screen-values.ts#isHelpStandingIn` | PI-39 | ヘルプが立っているか（`helpDisplayStateMachine` が `shown.normal` か `shown.maximized`）。 |
| `isWindowStandingIn` | entry | function | `src/use-case/advance-screen-session/screen-values.ts#isWindowStandingIn` | PI-39 | ウィンドウ（`FR-036` の 表 T-335）が立っているか —— 表示の状態機械が `shown.normal` か `shown.maximized`。 |
| `NO_ROW_CHECKED` | entry | const | `src/use-case/advance-screen-session/screen-values.ts#NO_ROW_CHECKED` | PI-39 | `TableVisibility` の初めの値 —— どの行もチェックが外れ（「非表示」）、スケジュールフィルタを掛けていない（表 T-353 の `TV-2`） |
| `NOTICE_DISPLAY_OF_REASON` | entry | const | `src/use-case/advance-screen-session/notice-values.ts#NOTICE_DISPLAY_OF_REASON` | PI-39 | 理由ごとの表示の仕方 —— 表 T-233 の表示の仕方の欄（`show` ・ `autoDismiss` ・ `hide` ・ `report`）と、取り込みの拒否が運ぶ 表 T-220 の行の家族の値（`_source/notice-reasons.json` から生成）。 |
| `NOTICE_MANNER_OF_REASON` | entry | const | `src/use-case/advance-screen-session/notice-values.ts#NOTICE_MANNER_OF_REASON` | PI-39 | 理由ごとの作法 —— 表 T-233 の作法の欄（表 T-037 の行）。 |
| `NOTICE_WORDS_ROW_OF_REASON` | entry | const | `src/use-case/advance-screen-session/notice-values.ts#NOTICE_WORDS_ROW_OF_REASON` | PI-39 | 理由ごとに語を刷る行 —— 表 T-233 のまとめ方の欄（相乗りしない行は自身、`_source/notice-reasons.json` から生成）。 |
| `NoticeReason` | entry | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeReason` | PI-39 | 型。 |
| `otherHoursDayTypesOf` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#otherHoursDayTypesOf` | PI-39 | 別の時間帯を持つ稼働する曜日 —— 表 T-344 の `WC-9` |
| `PressedOn` | entry | type | `src/use-case/advance-screen-session/gesture-values.ts#PressedOn` | PI-39 | 型。 |
| `PropertiesSubject` | entry | interface | `src/use-case/advance-screen-session/screen-values.ts#PropertiesSubject` | PI-39 | 型。 |
| `ScreenSession` | entry | interface | `src/use-case/advance-screen-session/advance-screen-session.ts#ScreenSession` | PI-39 | 型。 |
| `ScreenValues` | entry | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValues` | PI-39 | 型。 |
| `ScreenValuesEvent` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEvent` | PI-39 | 型。 |
| `SEARCH_PANEL_TEXT_SIZE_ROWS` | entry | const | `src/use-case/advance-screen-session/screen-values.ts#SEARCH_PANEL_TEXT_SIZE_ROWS` | PI-39 | 表 T-333 の行 ID を表の上からの順に並べたもの。 |
| `SearchColumn` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#SearchColumn` | -- | type SearchColumn = string |
| `SearchPanelSession` | entry | interface | `src/use-case/advance-screen-session/screen-values.ts#SearchPanelSession` | PI-39 | 型。 |
| `SearchPanelTextSizeRow` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#SearchPanelTextSizeRow` | -- | type SearchPanelTextSizeRow = keyof typeof NOT_STORED_SEARCH_PANEL_FONT_SIZES |
| `SearchTable` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#SearchTable` | -- | type SearchTable = 'tasks' \| 'commentBoxes' |
| `SessionEffect` | entry | type | `src/use-case/advance-screen-session/advance-screen-session.ts#SessionEffect` | PI-39 | 型。 |
| `SessionEvent` | entry | type | `src/use-case/advance-screen-session/advance-screen-session.ts#SessionEvent` | PI-39 | 型。 |
| `shownCalendarDraft` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#shownCalendarDraft` | PI-39 | 面が見せる下書き —— `drafted` ならその下書き、`untouched` なら文書の暦から組んだもの（表 T-280） |
| `StandingNotice` | entry | interface | `src/use-case/advance-screen-session/notice-values.ts#StandingNotice` | PI-39 | 型。 |
| `TableView` | entry | interface | `src/use-case/edit-document/edit-document-settings.ts#TableView` | PI-39 | 型。 |
| `tableViewOf` | entry | function | `src/use-case/edit-document/edit-document-settings.ts#tableViewOf` | PI-39 | `PI-9` の `tableViewOf` を、同じ理由で公開する —— 読み手は 1 本である |
| `TableVisibility` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#TableVisibility` | PI-39 | 型。 |
| `VISIBILITY_TABLES` | entry | const | `src/use-case/advance-screen-session/screen-values.ts#VISIBILITY_TABLES` | PI-39 | `VisibilityTable` の 3 つの名を、表 T-109 が `IC-143` の面を並べる順（検索・遅延診断レポート・担当リスト）に並べたもの —— スケジュールフィルタの帯が表の名を並べる順（表 T-353 の `TV-11`）。 |
| `VisibilityTable` | entry | type | `src/use-case/advance-screen-session/screen-values.ts#VisibilityTable` | PI-39 | 型。 |
| `WindowName` | entry | type | `src/entity/document-model/screen-state/screen-state.ts#WindowName` | PI-39 | 型。 |
| `withExceptionAdded` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withExceptionAdded` | PI-39 | 例外日の行を 1 つ足した後の下書き —— `IC-135`、`WC-6` |
| `withExceptionDayTyped` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withExceptionDayTyped` | PI-39 | 例外日の始まりか終わりの日の欄を確定した後の下書き —— `WC-4` |
| `withExceptionDeleted` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withExceptionDeleted` | PI-39 | 例外日の行を 1 つ消した後の下書き —— `IC-136`、`WC-4` |
| `withExceptionKindToggled` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withExceptionKindToggled` | PI-39 | 例外日の休みと稼働を入れ替えた後の下書き —— `IC-137`、`WC-4` |
| `withExceptionNameTyped` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withExceptionNameTyped` | PI-39 | 例外日の名前の欄を確定した後の下書き —— `WC-4` |
| `withRangeAdded` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withRangeAdded` | PI-39 | 時間帯の行を 1 つ足した後の下書き —— `IC-163`、`WC-8` |
| `withRangeDeleted` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withRangeDeleted` | PI-39 | 時間帯の行を 1 つ消した後の下書き —— `IC-164`、`WC-8` |
| `withRangeTimeTyped` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withRangeTimeTyped` | PI-39 | 時刻の欄を確定した後の下書き —— `IC-165`、`WC-8`、`WC-10` |
| `withWeekdayToggled` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withWeekdayToggled` | PI-39 | 曜日を 1 つ押した後の下書き —— 表 T-109 の `IC-133`、表 T-344 の `WC-2` |
| `withWeekStart` | entry | function | `src/use-case/advance-screen-session/calendar-draft.ts#withWeekStart` | PI-39 | 週の始まりを選んだ後の下書き —— `IC-134`、`WC-3` |
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
| `FieldEntryValuesEffectName` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEffectName` | -- | type FieldEntryValuesEffectName = \| 'bringCreatedTaskGroupIntoSight' const FIELD_ENTRY_VALUES_INITIAL_AXES: FieldEntryValuesAxes = |
| `FieldEntryValuesEvent` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEvent` | -- | type FieldEntryValuesEvent = \| { readonly type: 'fieldFocusAsked'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] } \| { readonly type: 'creation... |
| `FieldEntryValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesEventCarried` | -- | interface FieldEntryValuesEventCarried |
| `FieldEntryValuesKey` | file only | type | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesKey` | -- | type FieldEntryValuesKey = \| 'fieldEntry' \| 'createdTaskNamingStateMachine.idle' \| 'createdTaskNamingStateMachine.namingCreatedTask' \| 'createdTaskNamingStat... |
| `FieldEntryValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/field-entry-values.ts#FieldEntryValuesStateCarried` | -- | interface FieldEntryValuesStateCarried |
| `stepFieldEntryValues` | file only | function | `src/use-case/advance-screen-session/field-entry-values.ts#stepFieldEntryValues` | -- | function stepFieldEntryValues(values: FieldEntryValues, event: FieldEntryValuesEvent): FieldEntryStep |
| `ConfirmationState` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#ConfirmationState` | -- | type ConfirmationState = \| { readonly kind: 'notAsked' } \| { readonly kind: 'questionAsked'; readonly question: FileFlowValuesStateCarried['question']; reado... |
| `emptyFileFlowValues` | file only | const | `src/use-case/advance-screen-session/file-flow-values.ts#emptyFileFlowValues` | -- | const emptyFileFlowValues: FileFlowValues = |
| `FileFlowCreatedSubject` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowCreatedSubject` | -- | type FileFlowCreatedSubject = \| { readonly kind: 'task'; readonly uid: number } \| { readonly kind: 'taskGroup'; readonly taskGroupId: string } \| { readonly k... |
| `FileFlowFixBundle` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowFixBundle` | -- | type FileFlowFixBundle = readonly { readonly fixRow: string }[] |
| `FileFlowIncomingFile` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowIncomingFile` | -- | interface FileFlowIncomingFile |
| `FileFlowMergeCandidate` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowMergeCandidate` | -- | interface FileFlowMergeCandidate |
| `FileFlowMergeMapping` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowMergeMapping` | -- | type FileFlowMergeMapping = \| { readonly kind: 'allSame' } \| { readonly kind: 'allDifferent' } \| |
| `FileFlowOpenChoice` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowOpenChoice` | -- | type FileFlowOpenChoice = 'replace' \| 'merge' \| 'baseline' |
| `FileFlowValues` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValues` | -- | interface FileFlowValues |
| `FileFlowValuesAxes` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesAxes` | -- | type FileFlowValuesAxes = Omit<FileFlowValues, 'openedFileName' \| 'droppedTaskNames' \| 'missingTaskNames' \| 'reportedCounts'> |
| `FileFlowValuesEffect` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEffect` | -- | type FileFlowValuesEffect = |
| `FileFlowValuesEffectName` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEffectName` | -- | type FileFlowValuesEffectName = \| 'raiseFlowSurface' \| 'readDocumentFile' \| 'raiseNotice' \| 'writeDocumentFile' \| 'importIncomingDocument' \| 'discardIncoming... |
| `FileFlowValuesEvent` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEvent` | -- | type FileFlowValuesEvent = \| { readonly type: 'documentOpenAsked'; readonly openRoute: FileFlowValuesEventCarried['openRoute'] } \| { readonly type: 'agentDoc... |
| `FileFlowValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesEventCarried` | -- | interface FileFlowValuesEventCarried |
| `FileFlowValuesKey` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesKey` | -- | type FileFlowValuesKey = \| 'fileFlow' \| 'fileOperationStateMachine.idle' \| 'fileOperationStateMachine.readingDocumentFile' \| 'fileOperationStateMachine.await... |
| `FileFlowValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/file-flow-values.ts#FileFlowValuesStateCarried` | -- | interface FileFlowValuesStateCarried |
| `stepFileFlowValues` | file only | function | `src/use-case/advance-screen-session/file-flow-values.ts#stepFileFlowValues` | -- | function stepFileFlowValues(values: FileFlowValues, event: FileFlowValuesEvent): FileFlowStep |
| `UnsavedEditsState` | file only | type | `src/use-case/advance-screen-session/file-flow-values.ts#UnsavedEditsState` | -- | type UnsavedEditsState = \| { readonly kind: 'nothingUnsaved' } \| { readonly kind: 'editsUnsaved' } export interface FileFlowValues |
| `emptyGestureValues` | file only | const | `src/use-case/advance-screen-session/gesture-values.ts#emptyGestureValues` | -- | const emptyGestureValues: GestureValues = { ...GESTURE_VALUES_INITIAL_AXES } |
| `GesturePressRow` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GesturePressRow` | -- | type GesturePressRow = 'PTD-7' \| 'PTD-1' \| 'PTD-2' \| 'PTD-3' \| 'PTD-4' \| 'PTD-4a' \| 'PTD-5' |
| `GestureValues` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValues` | -- | interface GestureValues |
| `GestureValuesAxes` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesAxes` | -- | type GestureValuesAxes = Omit<GestureValues, never> |
| `GestureValuesEffect` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEffect` | -- | type GestureValuesEffect = { readonly type: GestureValuesEffectName } |
| `GestureValuesEffectName` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEffectName` | -- | type GestureValuesEffectName = \| 'startEntryRepeat' \| 'restorePaletteCorner' \| 'repeatHeldEntry' const GESTURE_VALUES_INITIAL_AXES: GestureValuesAxes = |
| `GestureValuesEvent` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEvent` | -- | type GestureValuesEvent = \| { readonly type: 'pointerPressed'; readonly pressRow: GestureValuesEventCarried['pressRow']; readonly pressedOn: GestureValuesEve... |
| `GestureValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesEventCarried` | -- | interface GestureValuesEventCarried |
| `GestureValuesKey` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesKey` | -- | type GestureValuesKey = \| 'gesture' \| 'pointerPressStateMachine.notPressed' \| 'pointerPressStateMachine.changingDocument' \| 'pointerPressStateMachine.viewing... |
| `GestureValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/gesture-values.ts#GestureValuesStateCarried` | -- | interface GestureValuesStateCarried |
| `PointerPressState` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#PointerPressState` | -- | type PointerPressState = \| { readonly kind: 'notPressed' } \| { readonly kind: 'changingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; r... |
| `stepGestureValues` | file only | function | `src/use-case/advance-screen-session/gesture-values.ts#stepGestureValues` | -- | function stepGestureValues(values: GestureValues, event: GestureValuesEvent): GestureStep |
| `TaskGroupGrabState` | file only | type | `src/use-case/advance-screen-session/gesture-values.ts#TaskGroupGrabState` | -- | type TaskGroupGrabState = \| { readonly kind: 'notGrabbed' } \| { readonly kind: 'grabPressed' } \| { readonly kind: 'carrying' } export interface GestureValues |
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
| `InvariantRow` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#InvariantRow` | -- | type InvariantRow = \| 'IV-1' \| 'IV-2' \| 'IV-3' \| 'IV-4' \| 'IV-5' \| 'IV-6' \| 'IV-23' \| 'IV-7' \| 'IV-17' \| 'IV-8' \| 'IV-9' |
| `NoticeDisplayState` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeDisplayState` | -- | type NoticeDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly standing: NoticeValuesStateCarried['standing'] } export type Cha... |
| `NoticeManner` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeManner` | -- | type NoticeManner = \| 'NT-1' \| 'NT-3' \| 'NT-3a' \| 'NT-4' \| 'NT-5' \| 'NT-6' // see T-233, T-037 export const NOTICE_MANNER_OF_REASON: Readonly<Record<NoticeRe... |
| `NoticeValues` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValues` | -- | interface NoticeValues |
| `NoticeValuesAxes` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesAxes` | -- | type NoticeValuesAxes = Omit<NoticeValues, never> |
| `NoticeValuesEffect` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEffect` | -- | type NoticeValuesEffect = |
| `NoticeValuesEffectName` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEffectName` | -- | type NoticeValuesEffectName = \| 'raiseNotice' const NOTICE_VALUES_INITIAL_AXES: NoticeValuesAxes = |
| `NoticeValuesEvent` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEvent` | -- | type NoticeValuesEvent = \| { readonly type: 'noticeRaised'; readonly reason: NoticeValuesEventCarried['reason']; readonly affectedCount: NoticeValuesEventCar... |
| `NoticeValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesEventCarried` | -- | interface NoticeValuesEventCarried |
| `NoticeValuesKey` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesKey` | -- | type NoticeValuesKey = \| 'notices' \| 'noticeDisplayStateMachine.hidden' \| 'noticeDisplayStateMachine.shown' \| 'changeDeliveryStateMachine.idle' \| 'changeDeli... |
| `NoticeValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/notice-values.ts#NoticeValuesStateCarried` | -- | interface NoticeValuesStateCarried |
| `QUESTION_DISPLAY_OF_ROW` | file only | const | `src/use-case/advance-screen-session/notice-values.ts#QUESTION_DISPLAY_OF_ROW` | -- | const QUESTION_DISPLAY_OF_ROW: Readonly<Record<QuestionRow, 'ask' \| 'askOnlyWithUnsavedEdits'>> = |
| `QuestionRow` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#QuestionRow` | -- | type QuestionRow = \| 'QN-1' \| 'QN-2' \| 'QN-3' \| 'QN-4' \| 'QN-5' \| 'QN-9' \| 'QN-10' \| 'QN-11' \| 'QN-12' \| 'QN-14' \| 'QN-15' |
| `ReasonRow` | file only | type | `src/use-case/advance-screen-session/notice-values.ts#ReasonRow` | -- | type ReasonRow = \| 'RS-1' \| 'RS-2' \| 'RS-3' \| 'RS-4' \| 'RS-5' \| 'RS-6' \| 'RS-7' \| 'RS-8' \| 'RS-9' \| 'RS-10' \| 'RS-11' |
| `stepNoticeValues` | file only | function | `src/use-case/advance-screen-session/notice-values.ts#stepNoticeValues` | -- | function stepNoticeValues(values: NoticeValues, event: NoticeValuesEvent): NoticeStep |
| `ArmModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ArmModeState` | -- | type ArmModeState = \| { readonly kind: 'notArmed' } \| { readonly kind: 'taskShapeArmed'; readonly shapeKind: ScreenValuesStateCarried['shapeKind'] } \| { read... |
| `BaseTimeZoneDraftState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#BaseTimeZoneDraftState` | -- | type BaseTimeZoneDraftState = \| { readonly kind: 'untouched' } \| { readonly kind: 'drafted'; readonly chosenRegion: ScreenValuesStateCarried['chosenRegion'] ... |
| `CalendarDraftState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#CalendarDraftState` | -- | type CalendarDraftState = \| { readonly kind: 'untouched' } \| { readonly kind: 'drafted'; readonly calendarDraft: ScreenValuesStateCarried['calendarDraft'] } ... |
| `DropCueDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DropCueDisplayState` | -- | type DropCueDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown' } export type BaseTimeZoneDraftState = \| { readonly kind: 'untouched' } \|... |
| `DualCursorModeOnState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DualCursorModeOnState` | -- | type DualCursorModeOnState = \| { readonly kind: 'placingCursorA' } \| { readonly kind: 'placingCursorB' } export type SearchPanelDisplayShownState = \| { reado... |
| `DualCursorModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#DualCursorModeState` | -- | type DualCursorModeState = \| { readonly kind: 'off' } \| { readonly kind: 'on'; readonly child: DualCursorModeOnState } export type ScaleMessageDisplayState =... |
| `emptyScreenValues` | file only | const | `src/use-case/advance-screen-session/screen-values.ts#emptyScreenValues` | -- | const emptyScreenValues: ScreenValues = |
| `FullScreenModeState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#FullScreenModeState` | -- | type FullScreenModeState = \| { readonly kind: 'normal' } \| { readonly kind: 'full' } export type OpenSurfaceState = \| { readonly kind: 'closed' } \| { readonl... |
| `HelpDisplayShownState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#HelpDisplayShownState` | -- | type HelpDisplayShownState = \| { readonly kind: 'normal' } \| { readonly kind: 'minimized' } \| { readonly kind: 'maximized' } export type ArmModeState = \| { r... |
| `HelpDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#HelpDisplayState` | -- | type HelpDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly child: HelpDisplayShownState } export type LandingMarkDisplayState... |
| `LandingMarkDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#LandingMarkDisplayState` | -- | type LandingMarkDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly landedBy: ScreenValuesStateCarried['landedBy']; readonly la... |
| `MilestoneListDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#MilestoneListDisplayState` | -- | type MilestoneListDisplayState = \| { readonly kind: 'closed' } \| { readonly kind: 'open' } export type FullScreenModeState = \| { readonly kind: 'normal' } \| ... |
| `OpenSurfaceState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#OpenSurfaceState` | -- | type OpenSurfaceState = \| { readonly kind: 'closed' } \| { readonly kind: 'open'; readonly surfaceName: ScreenValuesStateCarried['surfaceName'] } export type ... |
| `PaletteDisplayShownState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PaletteDisplayShownState` | -- | type PaletteDisplayShownState = \| { readonly kind: 'expanded' } \| { readonly kind: 'minimized' } export type DualCursorModeOnState = \| { readonly kind: 'plac... |
| `PaletteDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PaletteDisplayState` | -- | type PaletteDisplayState = \| { readonly kind: 'shown'; readonly child: PaletteDisplayShownState } \| { readonly kind: 'hidden' } export type MilestoneListDisp... |
| `PropertiesPanelContentState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#PropertiesPanelContentState` | -- | type PropertiesPanelContentState = \| { readonly kind: 'hidden' } \| { readonly kind: 'selectionDisplayed'; readonly subject: ScreenValuesStateCarried['subject... |
| `ScaleMessageDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScaleMessageDisplayState` | -- | type ScaleMessageDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly percent: ScreenValuesStateCarried['percent']; readonly end... |
| `ScreenValuesAxes` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesAxes` | -- | type ScreenValuesAxes = Omit<ScreenValues, 'screenLanguage' \| 'helpLanguage' \| 'rememberedActuals' \| 'themePreference' \| 'guideCursorMode' \| 'dualCursor' \| '... |
| `ScreenValuesEffect` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEffect` | -- | type ScreenValuesEffect = |
| `ScreenValuesEffectName` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEffectName` | -- | type ScreenValuesEffectName = \| 'storeScreenLanguage' \| 'writeHelpLanguage' \| 'writeProgressStep' \| 'storeThemePreference' \| 'storeGuideCursorMode' \| 'storeP... |
| `ScreenValuesEventCarried` | file only | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesEventCarried` | -- | interface ScreenValuesEventCarried |
| `ScreenValuesKey` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesKey` | -- | type ScreenValuesKey = \| 'screen' \| 'armModeStateMachine.notArmed' \| 'armModeStateMachine.taskShapeArmed' \| 'armModeStateMachine.milestoneShapeArmed' \| 'armM... |
| `ScreenValuesStateCarried` | file only | interface | `src/use-case/advance-screen-session/screen-values.ts#ScreenValuesStateCarried` | -- | interface ScreenValuesStateCarried |
| `SearchFilters` | file only | interface | `src/use-case/advance-screen-session/screen-values.ts#SearchFilters` | -- | interface SearchFilters |
| `SearchPanelDisplayShownState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#SearchPanelDisplayShownState` | -- | type SearchPanelDisplayShownState = \| { readonly kind: 'normal' } \| { readonly kind: 'minimized' } \| { readonly kind: 'maximized' } export type HelpDisplaySh... |
| `SearchPanelDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#SearchPanelDisplayState` | -- | type SearchPanelDisplayState = \| { readonly kind: 'hidden' } \| { readonly kind: 'shown'; readonly child: SearchPanelDisplayShownState } export type HelpDispl... |
| `stepScreenValues` | file only | function | `src/use-case/advance-screen-session/screen-values.ts#stepScreenValues` | -- | function stepScreenValues(values: ScreenValues, event: ScreenValuesEvent): ScreenStep |
| `TimeShiftDraftState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#TimeShiftDraftState` | -- | type TimeShiftDraftState = \| { readonly kind: 'empty' } \| { readonly kind: 'amountHeld'; readonly shiftMinutes: ScreenValuesStateCarried['shiftMinutes'] } ex... |
| `ToggleableWindowKey` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#ToggleableWindowKey` | -- | type ToggleableWindowKey = 'searchPanelDisplayState' \| 'helpDisplayState' |
| `TooltipDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#TooltipDisplayState` | -- | type TooltipDisplayState = \| { readonly kind: 'allowed' } \| { readonly kind: 'dismissed' } export type SearchPanelDisplayState = \| { readonly kind: 'hidden' ... |
| `WatermarkDisplayState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#WatermarkDisplayState` | -- | type WatermarkDisplayState = \| { readonly kind: 'shown' } \| { readonly kind: 'hidden' } export type PropertiesPanelContentState = \| { readonly kind: 'hidden'... |
| `WholeScheduleShiftDraftState` | file only | type | `src/use-case/advance-screen-session/screen-values.ts#WholeScheduleShiftDraftState` | -- | type WholeScheduleShiftDraftState = \| { readonly kind: 'empty' } \| { readonly kind: 'dateHeld'; readonly newStartDate: ScreenValuesStateCarried['newStartDate... |
| `emptySelectionValues` | file only | const | `src/use-case/advance-screen-session/selection-values.ts#emptySelectionValues` | -- | const emptySelectionValues: SelectionValues = |
| `SelectionCopied` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopied` | -- | type SelectionCopied = SelectionCopiedTask \| SelectionCopiedTaskGroup |
| `SelectionCopiedTask` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopiedTask` | -- | interface SelectionCopiedTask |
| `SelectionCopiedTaskGroup` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionCopiedTaskGroup` | -- | interface SelectionCopiedTaskGroup |
| `SelectionState` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionState` | -- | type SelectionState = \| { readonly kind: 'nothingSelected' } \| { readonly kind: 'objectsSelected'; readonly selectedObjects: SelectionValuesStateCarried['sel... |
| `SelectionValues` | file only | interface | `src/use-case/advance-screen-session/selection-values.ts#SelectionValues` | -- | interface SelectionValues |
| `SelectionValuesAxes` | file only | type | `src/use-case/advance-screen-session/selection-values.ts#SelectionValuesAxes` | -- | type SelectionValuesAxes = Omit<SelectionValues, 'chosenTaskGroups' \| 'chosenResources' \| 'copiedForPaste'> |
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

## McpToolTranslator (PI-40, `src/adapter/mcp-tool-translator/mcp-tool-translator.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `mcpInstructions` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#mcpInstructions` | PI-40 | MCP の初期化の答えに載せる案内（表 T-035 の `AG-12` の ⑧）。 |
| `McpTool` | entry | interface | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#McpTool` | -- | interface McpTool |
| `mcpToolList` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#mcpToolList` | PI-40 | MCP の道具の一覧。 |
| `McpToolResult` | entry | interface | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#McpToolResult` | -- | interface McpToolResult |
| `mcpToolResultOf` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#mcpToolResultOf` | PI-40 | ページの答えを MCP の道具の答えに写す。 |
| `pageNotConnectedResult` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#pageNotConnectedResult` | PI-40 | ページが繋がっていないときの答え。 |
| `relayedCallOf` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#relayedCallOf` | PI-40 | MCP の道具の呼び出しを、ページへ運ぶ呼び出しに写す |
| `relayRefusalResult` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#relayRefusalResult` | PI-40 | 取次が自ら返す拒否の値（刻印を持たない）。 |
| `relayTimedOutResult` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#relayTimedOutResult` | PI-40 | 取次の締め切りを過ぎた呼び出しの答え。 |
| `schemaNotes` | entry | function | `src/adapter/mcp-tool-translator/mcp-tool-translator.ts#schemaNotes` | PI-40 | `readSchema` が `notes` で返す、書く前に読む短い注意（CR-802）。 |

## McpRelayServer (PI-41, `src/framework/mcp-relay-server/mcp-relay-server.ts`)

| name | reach | kind | declared in | T-064 | what it is for / its declaration |
| --- | --- | --- | --- | --- | --- |
| `McpRelay` | entry | interface | `src/framework/mcp-relay-server/mcp-relay-server.ts#McpRelay` | -- | interface McpRelay |
| `McpRelayOptions` | entry | interface | `src/framework/mcp-relay-server/mcp-relay-server.ts#McpRelayOptions` | -- | interface McpRelayOptions |
| `startMcpRelay` | entry | function | `src/framework/mcp-relay-server/mcp-relay-server.ts#startMcpRelay` | PI-41 | `non-pure`。 |

Totals: 1063 name(s) leave through a public entry (519 of them published by table T-064), 831 more are exported by a file and not by its entry.
