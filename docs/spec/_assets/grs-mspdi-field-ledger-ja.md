# GRS × MSPDI フィールド仕分け台帳

- 日付: 2026-07-25
- 目的: MSPDI の全フィールドを、GRS がどう扱うか（**Own / Consume / Reconstruct / Carry / Drop**）で仕分けし、双方向往復の欠落を最小化する。
- 分類の定義: `grs-data-model-ja.md` §5、往復規約: 同 §6。

> ⚠️ **正本は `../vendor/mspdi/mspdi_pj12.xsd`**。本台帳は XSD から作成し、**要素名・型・カードは必ず XSD で検証**すること。`../vendor/mspdi-core-tree.md` / `mspdi-declutter-erd-ja.md` 等の要約は**参考であって正ではない**（過去に命名ズレが発生）。この原則を守らないとミスが起こる。

## 分類の早見

| 種別 | import | 保持 | export | 例 |
|---|:--:|:--:|---|---|
| **Own** | 読む | ○ 同形 | 保存値を書く | Start, Finish, Milestone, Notes |
| **Consume** | 読む(必須) | ○ 別形(構造) | 構造から再生成 | OutlineLevel, PredecessorLink |
| **Reconstruct** | 読まない | ✗ | 他 Own から算出 | OutlineNumber, Duration, ID |
| **Carry** | 読む | ○ 不透明 | そのまま書き戻す | Cost, Work, EVM, enterprise |
| **Drop** | — | ✗ | 書かない | 原則ゼロ |

損失は Drop でのみ発生 → **Drop は原則ゼロ**（GRS が使わない値は Carry=passthrough で温存）。

---

## 1. Task（XSD L1604-2485）

### Own（保持・編集）

| MSPDI | 分類 | GRS の対応 |
|---|---|---|
| `UID` | Own | `mspdi_uid`（往復識別・不変） |
| `Name` | Own | task.name |
| `Start` | Own | task.start（予定開始） |
| `Finish` | Own | task.finish（予定完了） |
| `Milestone` | Own | task.milestone |
| `ActualStart` | Own | task.actualStart |
| `ActualFinish` | Own | task.actualFinish |
| `Deadline` | Own | task.deadline（目標マーカー） |
| `Notes` | Own | task.notes |
| `Stop` / `Resume` | Own?（split 採用時） | 中断バー。未採用なら Carry |
| `ConstraintType` / `ConstraintDate` | Own?（制約を扱う時） | 制約。MVP 非対象なら Carry |

### Consume（読んで構造化）

| MSPDI | 分類 | GRS の対応 |
|---|---|---|
| `OutlineLevel`（＋document order） | Consume | WBS ツリー。**明示編集のみ伝播**（§6） |
| `PredecessorLink`（`PredecessorUID`/`Type`/`LinkLag`/`LagFormat`） | Consume | 依存エッジ（下記 §2） |
| `CalendarUID` | Consume?（暦をネイティブ化する時） | タスク暦参照。しなければ Carry |

### Reconstruct（読まず export で算出）

| MSPDI | 分類 | 算出元 |
|---|---|---|
| `ID` | Reconstruct | 並び順(order) |
| `OutlineNumber` | Reconstruct | OutlineLevel＋順序 |
| `Summary` | Reconstruct | 子の有無 |
| `Duration` | Reconstruct | Finish − Start（＋暦） |
| `ActualDuration` | Reconstruct | ActualFinish − ActualStart |
| `RemainingDuration` | Reconstruct | Duration − 進捗 |
| `PercentComplete` | Reconstruct | progressRatio × 100 |

### Carry（passthrough・GRS 非解釈で温存）

GRS が日程表用途で使わない列。**すべて温存し export で書き戻す**（未編集往復は無損失）。系統でまとめる:

- 期間/工数書式: `Type`, `DurationFormat`, `Work`, `RegularWork`, `OvertimeWork`, `PercentWorkComplete`, `EffortDriven`, `Estimated`, `Recurring`
- コスト: `Cost`, `FixedCost`, `FixedCostAccrual`, `OvertimeCost`, `ActualCost`, `ActualOvertimeCost`, `RemainingCost`, `RemainingOvertimeCost`
- 実績工数: `ActualWork`, `ActualOvertimeWork`, `RemainingWork`, `RemainingOvertimeWork`, `ActualWorkProtected`, `ActualOvertimeWorkProtected`
- EVM: `BCWS`, `BCWP`, `ACWP`, `CV`, `PhysicalPercentComplete`, `EarnedValueMethod`
- CPM 派生: `EarlyStart`, `EarlyFinish`, `LateStart`, `LateFinish`, `FreeSlack`, `TotalSlack`, `StartVariance`, `FinishVariance`, `WorkVariance`, `Critical`
- 平準化: `LevelAssignments`, `LevelingCanSplit`, `LevelingDelay`, `LevelingDelayFormat`, `PreLeveledStart`, `PreLeveledFinish`, `IgnoreResourceCalendar`
- サブプロジェクト: `IsSubproject`, `IsSubprojectReadOnly`, `SubprojectName`, `ExternalTask`, `ExternalTaskProject`
- enterprise/管理: `IsPublished`, `StatusManager`, `CommitmentStart`, `CommitmentFinish`, `CommitmentType`
- 補助: `IsNull`, `CreateDate`, `Contact`, `WBS`, `WBSLevel`, `Priority`, `ResumeValid`, `OverAllocated`, `Hyperlink`, `HyperlinkAddress`, `HyperlinkSubAddress`, `HideBar`, `Rollup`
- 子要素: `ExtendedAttribute`, `Baseline`, `OutlineCode`, `TimephasedData`（いずれも passthrough）

### Drop

- なし（全項目を Own/Consume/Reconstruct/Carry で受ける）。

---

## 2. PredecessorLink（Task 下・XSD L2162）

Consume（→ 依存エッジ）。個別列:

| MSPDI | 分類 | GRS の対応 |
|---|---|---|
| `PredecessorUID` | Consume | 依存の先行端点（UID→GRS id 解決） |
| `Type` | Consume | linkType（0=FF/1=FS/2=SF/3=SS） |
| `LinkLag` | Consume | lag（1/10分） |
| `LagFormat` | Consume | lag の表示単位 |
| `CrossProject` / `CrossProjectName` | Carry | 別PJ依存（MVP 非対象・温存） |

---

## 3. Project（ルート・XSD L225-728）

63 スカラー。往復のため**使わない値も Carry で温存**（Drop ゼロ）。

- **Own（文書メタ・期間・換算）**: `SaveVersion`, `UID`, `Name`, `Title`, `Subject`, `Category`, `Company`, `Manager`, `Author`, `CreationDate`, `Revision`, `LastSaved`, `StartDate`, `StatusDate`, `ScheduleFromStart`, `MinutesPerDay`, `MinutesPerWeek`, `DaysPerMonth`, `WeekStartDay`
- **Consume**: `CalendarUID`（既定カレンダー参照。暦をネイティブ化する時。しなければ Carry）
- **Reconstruct**: `FinishDate`（全 Task 最遅からのロールアップ）
- **Carry（passthrough）**: `CurrentDate`, 通貨系(`CurrencyDigits`/`CurrencySymbol`/`CurrencyCode`/`CurrencySymbolPosition`), 既定タスク/レート/書式(`DefaultTaskType`/`DefaultFixedCostAccrual`/`DefaultStandardRate`/`DefaultOvertimeRate`/`NewTasksEffortDriven`/`NewTasksEstimated`/`DefaultTaskEVMethod`/`DurationFormat`/`WorkFormat`), 計算オプション(`EditableActualCosts`/`HonorConstraints`/`InsertedProjectsLikeSummary`/`MultipleCriticalPaths`/`SplitsInProgressTasks`/`SpreadActualCost`/`SpreadPercentComplete`/`TaskUpdatesResource`/`Autolink`/`AutoAddNewResourcesAndTasks`), Move系(`MoveCompletedEndsBack`/`MoveRemainingStartsBack`/`MoveRemainingStartsForward`/`MoveCompletedEndsForward`), EV(`EarnedValueMethod`/`BaselineForEarnedValue`), 会計/CPM(`FYStartDate`/`FiscalYearStart`/`CriticalSlackLimit`), 時刻(`DefaultStartTime`/`DefaultFinishTime`/`NewTaskStartDate`), サーバ/管理(`MicrosoftProjectServerURL`〔boolean〕/`ProjectExternallyEdited`/`ActualsInSync`/`AdminProject`), その他(`ExtendedCreationDate`/`RemoveFileProperties`)

---

## 4. Calendar クラスタ（XSD L1204-）

| MSPDI | 分類 | GRS の対応 |
|---|---|---|
| `Calendar.UID` | Own | calendar.id（往復識別） |
| `Calendar.Name` | Own | calendar.name |
| `Calendar.IsBaseCalendar` | Own | 基準暦か |
| `Calendar.BaseCalendarUID` | Consume | 派生元参照（自己） |
| `WeekDay.DayType` | Own | 曜日種別(0-7) |
| `WeekDay.DayWorking` | Own | 稼働日か |
| `Exception.Name` | Own | 祝日名 |
| `Exception.TimePeriod`(FromDate/ToDate) | Own | 例外日（親に畳込） |
| `Exception.DayWorking` | Own | 稼働か |
| `WorkingTime`(FromTime/ToTime) | Carry/Drop | 勤務時刻（日粒度で不要・温存 or 破棄） |
| `WorkWeek` 系, `Exception` 繰り返し詳細(`Type`/`Period`/`DaysOfWeek`/`MonthItem`/…) | Carry | 温存 |

（Calendar/Resource/Assignment を GRS ネイティブで持つかは `grs-data-model` §7 未確定。持たない場合はクラスタごと Carry。）

---

## 5. Resource（XSD L2492-）※暫定

GRS が資源を一級で持つか未確定（§7）。**持たなければ Resource 全体を Carry**（passthrough）。持つ場合の暫定:

- Own: `UID`(→id), `Name`, `Type`, `Initials`, `Group`
- Reconstruct: `ID`（順序）
- Carry: 上記以外（コスト/レート/EVM/工数/enterprise/AD 等ほぼ全て）

---

## 6. Assignment（XSD L3191-）※暫定

割当を一級で持つか未確定（§7）。**持たなければ Assignment 全体を Carry**。持つ場合の暫定:

- Own: `UID`, `Units`
- Consume: `TaskUID`, `ResourceUID`（Task×Resource 関係）
- Carry: 上記以外（コスト/EVM/工数/`WorkContour`/`f404xxx`〔201予約枠〕/子 ExtAttr・Baseline・TimephasedData）

---

## 未確定・次アクション

- **中核以外の粒度確定**: Resource/Assignment/Calendar をネイティブ化するか（`grs-data-model` §7）で Consume/Carry が変わる。
- **split(Stop/Resume)・制約(ConstraintType/Date)** の Own/Carry を確定。
- **Carry の passthrough 実装**（案b）と **round-trip 同一性テスト**を CI に。
- 全項目を XSD と突き合わせ、**Drop=0 を検証**（未分類ゼロ）。

## 参照

- 分類定義・往復規約: `grs-data-model-ja.md` §5/§6
- MSPDI 事実（責務・全要素・ERD）: `../vendor/mspdi-declutter-erd-ja.md`, `../vendor/mspdi-core-tree.md`
- 正本: `../vendor/mspdi/mspdi_pj12.xsd`
