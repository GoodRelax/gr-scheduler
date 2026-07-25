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
| `Stop` / `Resume` | **Own（確定）** | 中断バー（単一区間）。多重 split の厳密形（`TimephasedData` ゼロ区間）は Carry（grs-data-model §7.2） |

（`ConstraintType` / `ConstraintDate` は **Carry 確定**。GRS は明示日付で位置決めし制約はソルバ用ヒント＝非使用。下記 Carry 群「制約」に記載。）

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

- 制約: `ConstraintType`, `ConstraintDate`（GRS 非使用・§7.2 で Carry 確定）
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
| `WorkingTime`(FromTime/ToTime) | **Carry（確定）** | 勤務時刻。日粒度描画で不使用だが **Drop=0 のため passthrough 温存**（破棄しない） |
| `WorkWeek` 系, `Exception` 繰り返し詳細(`Type`/`Period`/`DaysOfWeek`/`MonthItem`/…) | Carry | 温存 |

**確定（grs-data-model §7.5）: Calendar は GRS ネイティブ軽量**（稼働日粒度の描画・期間換算に必須）。`Calendar`/`WeekDay`/`Exception` の稼働日・祝日は Own、勤務時刻・繰返し詳細・`WorkWeek` は Carry。`Task.CalendarUID`/`Project.CalendarUID` は **Consume**（ネイティブ暦参照）。

---

## 5. Resource（XSD L2492-2491…3190・全 66 スカラー＋子要素）

**確定（grs-data-model §7.5）: 資源管理は非対象 → Resource 全体を Carry**（`UID` のみ Own、`ID` は Reconstruct）。以下 XSD 実名で全列を分類（Drop=0）。

| 分類 | 列 |
|---|---|
| **Own** | `UID`（→resource.id・往復識別・不変） |
| **Reconstruct** | `ID`（順序） |
| **Carry（passthrough）** | 上記以外の**全 64 スカラー**＋全子要素。系統別: 識別/属性(`Name`,`Type`,`IsNull`,`Initials`,`Phonetics`,`NTAccount`,`MaterialLabel`,`Code`,`Group`,`WorkGroup`,`EmailAddress`,`Hyperlink`,`HyperlinkAddress`,`HyperlinkSubAddress`) / 稼働(`MaxUnits`,`PeakUnits`,`OverAllocated`,`AvailableFrom`,`AvailableTo`,`Start`,`Finish`,`CanLevel`,`AccrueAt`) / 工数(`Work`,`RegularWork`,`OvertimeWork`,`ActualWork`,`RemainingWork`,`ActualOvertimeWork`,`RemainingOvertimeWork`,`PercentWorkComplete`) / コスト・レート(`StandardRate`,`StandardRateFormat`,`Cost`,`OvertimeRate`,`OvertimeRateFormat`,`OvertimeCost`,`CostPerUse`,`ActualCost`,`ActualOvertimeCost`,`RemainingCost`,`RemainingOvertimeCost`) / EVM・差異(`WorkVariance`,`CostVariance`,`SV`,`CV`,`ACWP`,`BCWS`,`BCWP`) / 暦・メモ(`CalendarUID`,`Notes`) / enterprise・管理(`IsGeneric`,`IsInactive`,`IsEnterprise`,`BookingType`,`ActualWorkProtected`,`ActualOvertimeWorkProtected`,`ActiveDirectoryGUID`,`CreationDate`,`IsCostResource`,`AssnOwner`,`AssnOwnerGuid`,`IsBudget`) / 子要素(`ExtendedAttribute`,`Baseline`,`OutlineCode`,`AvailabilityPeriod`,`Rate`,`TimephasedData`) |
| **Drop** | なし |

- 任意: `Name`/`Initials`/`Group` を**読取専用の担当ラベル**として表示に流用可（真実は Carry 側・編集しない）。

---

## 6. Assignment（XSD L3191-3690・全 63 スカラー＋201 予約枠＋子要素）

**確定（grs-data-model §7.5）: 割当も非対象 → Assignment 全体を Carry**（`UID` のみ Own）。以下 XSD 実名で全列を分類（Drop=0）。

| 分類 | 列 |
|---|---|
| **Own** | `UID`（往復識別・不変） |
| **Carry（passthrough）** | **関係キー** `TaskUID` / `ResourceUID`（UID 不変につき参照は有効なまま温存。GRS で Task 削除時は孤立割当を export で落とす＝実装注記） ＋ **他全スカラー**: `PercentWorkComplete`,`ActualCost`,`ActualFinish`,`ActualOvertimeCost`,`ActualOvertimeWork`,`ActualStart`,`ActualWork`,`ACWP`,`Confirmed`,`Cost`,`CostRateTable`,`CostVariance`,`CV`,`Delay`,`Finish`,`FinishVariance`,`Hyperlink`,`HyperlinkAddress`,`HyperlinkSubAddress`,`WorkVariance`,`HasFixedRateUnits`,`FixedMaterial`,`LevelingDelay`,`LevelingDelayFormat`,`LinkedFields`,`Milestone`,`Notes`,`Overallocated`,`OvertimeCost`,`OvertimeWork`,`PeakUnits`,`RegularWork`,`RemainingCost`,`RemainingOvertimeCost`,`RemainingOvertimeWork`,`RemainingWork`,`ResponsePending`,`Start`,`Stop`,`Resume`,`StartVariance`,`Summary`,`SV`,`Units`,`UpdateNeeded`,`VAC`,`Work`,`WorkContour`,`BCWS`,`BCWP`,`BookingType`,`ActualWorkProtected`,`ActualOvertimeWorkProtected`,`CreationDate`,`AssnOwner`,`AssnOwnerGuid`,`BudgetCost`,`BudgetWork` ＋ **`f404000`〜`f4040c8`（201 enterprise 予約枠・空）** ＋ 子要素(`ExtendedAttribute`,`Baseline`,`TimephasedData`) |
| **Drop** | なし |

---

## 確定サマリと Drop=0 検証

**確定（grs-data-model §7）**:
- 粒度: **Calendar = ネイティブ軽量 / Resource・Assignment = 丸ごと Carry**（§7.5）。
- **split `Stop`/`Resume` = Own**（単一区間）、多重 split の厳密形（`TimephasedData`）= Carry（§7.2）。
- **制約 `ConstraintType`/`ConstraintDate` = Carry**（§7.2）。

**Drop=0 検証（XSD 実名突合・8 テーブル全項目）**:

| テーブル | Own | Consume | Reconstruct | Carry | **Drop** |
|---|---|---|---|---|:--:|
| Task | Name/Start/Finish/Milestone/Actual*/progressRatio/Deadline/Notes/UID/Stop/Resume | OutlineLevel/PredecessorLink/CalendarUID | ID/OutlineNumber/Summary/Duration/ActualDuration/RemainingDuration/PercentComplete | 制約・工数書式・コスト・EVM・CPM派生・平準化・サブPJ・enterprise・補助・子要素 | **0** |
| PredecessorLink | — | PredecessorUID/Type/LinkLag/LagFormat | — | CrossProject/CrossProjectName | **0** |
| Project | 識別/文書/期間/換算メタ | CalendarUID | FinishDate | 通貨/既定/計算/Move/EV/サーバ管理 | **0** |
| Calendar/WeekDay/Exception | UID/Name/IsBaseCalendar/DayType/DayWorking/例外日 | BaseCalendarUID/(Task・Project).CalendarUID | — | WorkingTime/WorkWeek/繰返し詳細 | **0** |
| Resource | UID | — | ID | 他全 64 スカラー＋子要素 | **0** |
| Assignment | UID | — | — | TaskUID/ResourceUID＋他全スカラー＋201枠＋子要素 | **0** |

→ **全 8 テーブルで Drop=0**（未分類ゼロ）。損失は「Carry を実装しない」場合のみ発生するため、**Carry passthrough（案b）の実装が Drop=0 の前提**。

## 残アクション

- **Carry passthrough の実装**（案b）と **round-trip 同一性テスト**を CI に（未編集 import→export の差分ゼロを機械検証）。
- 敵対的レビュー（本台帳 × XSD）で分類漏れ・命名ズレの最終確認。

## 参照

- 分類定義・往復規約: `grs-data-model-ja.md` §5/§6
- MSPDI 事実（責務・全要素・ERD）: `../vendor/mspdi-declutter-erd-ja.md`, `../vendor/mspdi-core-tree.md`
- 正本: `../vendor/mspdi/mspdi_pj12.xsd`
