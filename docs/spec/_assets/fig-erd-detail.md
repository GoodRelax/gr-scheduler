# データモデル — 詳細（列と関係）

**UID**: DOC-FIG-ERD-DETAIL
**Version**: 0.1

> ⛔ **本書は生成物である。手で直さない —— 直しても次の `npm run gen` で消える。**
> **唯一の正は `_source/erd.json` であり、本書はそれを `_source/erd_json_to_md.py` が書き出したものである。**
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`（検査 16 が呼ぶ）。説明の散文は `05-07-design.md` が持つ。

## 1. 詳細 ERD

**Type**: SECTION

**図 F-011 — データモデルの詳細**

```mermaid
---
config:
  er:
    entityPadding: 6
---
erDiagram
    Project {
        文字列 id "Own・16 字以下"
        文字列 name "Own"
        文字列 title "Own"
        文字列 subject "Own"
        文字列 category "Own"
        文字列 company "Own"
        文字列 manager "Own"
        文字列 author "Own"
        日時 created "Own"
        整数 revision "Own"
        日時 lastSaved "Own"
        日付 startDate "Own"
        日付 statusDate "Own"
        整数 minutesPerDay "Own"
        整数 minutesPerWeek "Own"
        整数 daysPerMonth "Own"
        整数 weekStartDay "Own・0〜6"
        整数 **calendarUid** FK "Consume"
        整数 themeHue "GRS・0〜359"
        整数 uidHighWaterMark "GRS"
        整数 importSeq "GRS"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    Task {
        整数 **uid** PK "Own"
        整数 **wbsParentUid** FK "Consume"
        整数 wbsOrder "Consume"
        文字列 name "Own"
        日時 start "Own"
        日時 finish "Own"
        真偽 milestone "Own"
        日時 deadline "Own"
        文字列 notes "Own"
        整数 **calendarUid** FK "Consume"
        日時 actualStart "Own"
        整数 actualDuration "Consume・稼働日"
        日時 actualFinish "Own"
        日時 resume "Own"
        真偽 resumeValid "Own"
        整数 percentComplete "Own・0 以上"
        整数 fadeInDays "Consume・日数"
        整数 fadeOutDays "Consume・日数"
        Dependency[] dependencies "Consume"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    Dependency {
        整数 **predecessorUid** FK "Consume"
        整数 linkType "Consume・0〜3"
        整数 lag "Consume"
        整数 lagFormat "Consume"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    TaskGroup {
        文字列 **id** PK "GRS・UUID"
        文字列 **parentId** FK "GRS・UUID"
        文字列 label "GRS"
        整数 **derivedFromTaskUid** FK "GRS"
        整数 order "GRS"
        真偽 isCollapsed "GRS"
        真偽 isHidden "GRS"
        文字列 color "GRS"
        整数 height "GRS"
    }
    TaskGroupMember {
        整数 **taskUid** PK,FK "GRS"
        文字列 **groupId** FK "GRS・UUID"
        整数 stackOrder "GRS"
    }
    Calendar {
        整数 **uid** PK "Own"
        文字列 name "Own"
        真偽 isBaseCalendar "Own"
        整数 **baseCalendarUid** FK "Consume"
        整数 ordinal "GRS"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
        WeekDay[] weekDays "Consume"
        Exception[] exceptions "Consume"
    }
    WeekDay {
        整数 **ordinal** PK "GRS"
        整数 dayType "Own・1〜7"
        真偽 dayWorking "Own"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    Exception {
        整数 **ordinal** PK "GRS"
        文字列 name "Own"
        日時 fromDate "Own"
        日時 toDate "Own"
        真偽 dayWorking "Own"
        整数 recurrenceKind "Consume・1〜9"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    Resource {
        整数 **uid** PK "Own"
        文字列 name "Own"
        整数 resourceKind "Own"
        真偽 isCostResource "Own"
        整数 **calendarUid** FK "Consume"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    Assignment {
        整数 **uid** PK "Own"
        整数 **taskUid** FK "Consume"
        整数 **resourceUid** FK "Consume"
        連想 carry "Carry・文字列→文字列"
        CarryElement[] carryElements "Carry"
    }
    TaskVisual {
        整数 **taskUid** PK,FK "GRS"
        整数 nameAnchor "GRS・0〜8"
        列挙 nameAlign "GRS・3 値"
        列挙 shapeKind "GRS・5 値"
        列挙 milestoneGlyph "GRS・8 値"
        文字列 fillColor "GRS"
        文字列 strokeColor "GRS"
        列挙 lineWeight "GRS・3 値"
    }
    TaskOrigin {
        整数 **taskUid** PK,FK "GRS"
        文字列 sourceProjectUid "GRS"
        整数 sourceUid "GRS"
        整数 lastSeenImportSeq "GRS"
        文字列 importSessionId "GRS"
    }
    CommentBox {
        文字列 **id** PK "GRS・UUID"
        列挙 leaderShapeKind "GRS・2 値"
        文字列 text "GRS"
        日時 anchorDate "GRS"
        文字列 **anchorGroupId** FK "GRS・UUID"
        オブジェクト bodyOffsetPx "GRS・{ dx, dy }"
    }
    HighlightBox {
        文字列 **id** PK "GRS・UUID"
        日時 startDate "GRS"
        日時 endDate "GRS"
        文字列 **topGroupId** FK "GRS・UUID"
        文字列 **bottomGroupId** FK "GRS・UUID"
        文字列 strokeColor "GRS"
        数値 cornerRadiusPx "GRS"
    }
    CarryElement {
        整数 **ordinal** PK "GRS"
        文字列 name "Carry"
        連想 fields "Carry・文字列→文字列"
        CarryElement[] children "Carry"
    }
    revisionStamp {
        整数 revision "GRS"
        文字列 lastEditedBy "GRS"
        文字列 updatedAt "GRS・ISO 8601・UTC・秒"
    }
    changeLog {
        整数 **revision** PK "GRS"
        文字列 editedBy "GRS"
        文字列 explanation "GRS"
        文字列 changedAt "GRS・ISO 8601・UTC・秒"
    }
    BaselineTask {
        整数 **uid** PK "GRS"
        文字列 name "GRS"
        日時 start "GRS"
        日時 finish "GRS"
        真偽 milestone "GRS"
    }
    Task }o--o| Task : "WBS の親子（wbsParentUid）。輪を禁じる規則は 表 T-015a の HM-4 と FR-023 が持つ"
    Task ||--o{ Dependency : "この依存の後続（入れ子の位置が表す）"
    Dependency }o--|| Task : "この依存の先行（predecessorUid）"
    TaskGroup }o--o| TaskGroup : "行の親子（parentId）。深さの上限は FR-004"
    TaskGroupMember }o--|| TaskGroup : "どの行に載るか（groupId）"
    TaskGroupMember ||--|| Task : "どのタスクが載るか（taskUid）"
    TaskGroup }o--o| Task : "行の名前の導出元（derivedFromTaskUid）"
    Project ||--o| Calendar : "文書の既定の暦（calendarUid）"
    Task }o--o| Calendar : "交換相手のタスクごとの暦（calendarUid）"
    Resource }o--o| Calendar : "交換相手の担当者ごとの暦（calendarUid）"
    Calendar }o--o| Calendar : "継承元の暦（baseCalendarUid）"
    Calendar ||--o{ WeekDay : "曜日ごとの稼働（弱エンティティ）"
    Calendar ||--o{ Exception : "例外日（弱エンティティ）"
    Assignment }o--o| Task : "就くタスク（taskUid）"
    Assignment }o--o| Resource : "就く担当者（resourceUid）"
    TaskVisual |o--|| Task : "そのタスクの見せ方（taskUid）"
    TaskOrigin |o--|| Task : "そのタスクの取り込み元（taskUid）"
    CommentBox }o--o| TaskGroup : "留める行（anchorGroupId）"
    HighlightBox }o--o| TaskGroup : "囲む範囲の上端の行（topGroupId）"
    HighlightBox }o--o| TaskGroup : "囲む範囲の下端の行（bottomGroupId）"
    CarryElement ||--o{ CarryElement : "入れ子の子（children）"
    Task |o--o| BaselineTask : "変更前の予定との対応（uid の一致。参照ではない）。対応が無いものは描かない（FR-015）"
    Project ||--o{ CarryElement : "carryElements の中身"
    Task ||--o{ CarryElement : "carryElements の中身"
    Dependency ||--o{ CarryElement : "carryElements の中身"
    Calendar ||--o{ CarryElement : "carryElements の中身"
    WeekDay ||--o{ CarryElement : "carryElements の中身"
    Exception ||--o{ CarryElement : "carryElements の中身"
    Resource ||--o{ CarryElement : "carryElements の中身"
    Assignment ||--o{ CarryElement : "carryElements の中身"
```

## 2. エンティティ

**Type**: SECTION

**表 T-056 — エンティティ**

| 行 ID | 名前 | 何を表すか | 鍵 | `MSPDI` へ書き出すか | `carry` の器 |
| --- | --- | --- | --- | --- | --- |
| ET-1 | `Project` | プロジェクトの基本情報と、文書ぜんたいに掛かる暦の既定 | — （文書に 1 つしか無い。`id` は主キーにしない） | 書き出す | あり |
| ET-2 | `Task` | タスク 1 つ。予定と実績を同じ行が持つ | `uid` | 書き出す | あり |
| ET-3 | `Dependency` | 依存 1 本。**後続タスクの下に入れ子で持つ** | — （後続タスクの下での位置が表す） | 書き出す | あり |
| ET-4 | `TaskGroup` | 行の器。縦積みの軸を作る（`FR-004`） | `id` | **書き出さない** | — |
| ET-5 | `TaskGroupMember` | どのタスクがどの行の何段目に載るか | `taskUid`（一意） | **書き出さない** | — |
| ET-6 | `Calendar` | 暦 1 つ。稼働日と非稼働日を決める | `uid` | 書き出す | あり |
| ET-7 | `WeekDay` | 曜日ごとの稼働の定め（弱エンティティ） | 親の暦 ＋ `ordinal` | 書き出す | あり |
| ET-8 | `Exception` | 暦の例外日（弱エンティティ） | 親の暦 ＋ `ordinal` | 書き出す | あり |
| ET-9 | `Resource` | 担当者 1 人（または 1 つの資源） | `uid` | 書き出す | あり |
| ET-10 | `Assignment` | どの担当者がどのタスクに就くか | `uid` | 書き出す | あり |
| ET-11 | `TaskVisual` | タスクの見せ方。形・色・名前の置き方 | `taskUid` | **書き出さない** | — |
| ET-12 | `TaskOrigin` | 取り込み元の記録。合流の照合に使う | `taskUid` | **書き出さない** | — |
| ET-13 | `CommentBox` | コメントボックス 1 つ。日付と行に留める | `id` | **書き出さない** | — |
| ET-14 | `HighlightBox` | ハイライトボックス 1 つ。日付と行の範囲を囲む | `id` | **書き出さない** | — |
| ET-15 | `CarryElement` | 解釈しない要素 1 つを、原形のまま抱える器（自己参照） | 所有者 ＋ `ordinal` | 書き出す | — |
| ET-16 | `revisionStamp` | 版数と、最後に書いた者と時刻 | — （文書に 1 つしか無い） | **書き出さない** | — |
| ET-17 | `changeLog` | 変更の理由。**会話そのものは保存しない**（`FR-066`） | `revision` | **書き出さない** | — |
| ET-18 | `BaselineTask` | 変更前の予定のタスク 1 つ。輪郭を重ねて描くためだけに持つ | `uid` | **書き出さない** | — |

## 3. 関係

**Type**: SECTION

**表 T-057 — エンティティのあいだの関係**

| 行 ID | 親 | 子 | 多重度 | 何を表すか |
| --- | --- | --- | --- | --- |
| RL-1 | `Task` | `Task` | 0..n ─ 0..1 | WBS の親子（`wbsParentUid`）。輪を禁じる規則は 表 T-015a の `HM-4` と `FR-023` が持つ |
| RL-2 | `Task` | `Dependency` | 1 ─ 0..n | この依存の後続（入れ子の位置が表す） |
| RL-3 | `Dependency` | `Task` | 0..n ─ 1 | この依存の先行（`predecessorUid`） |
| RL-4 | `TaskGroup` | `TaskGroup` | 0..n ─ 0..1 | 行の親子（`parentId`）。深さの上限は `FR-004` |
| RL-5 | `TaskGroupMember` | `TaskGroup` | 0..n ─ 1 | どの行に載るか（`groupId`） |
| RL-6 | `TaskGroupMember` | `Task` | 1 ─ 1 | どのタスクが載るか（`taskUid`） |
| RL-7 | `TaskGroup` | `Task` | 0..n ─ 0..1 | 行の名前の導出元（`derivedFromTaskUid`） |
| RL-8 | `Project` | `Calendar` | 1 ─ 0..1 | 文書の既定の暦（`calendarUid`） |
| RL-9 | `Task` | `Calendar` | 0..n ─ 0..1 | 交換相手のタスクごとの暦（`calendarUid`） |
| RL-10 | `Resource` | `Calendar` | 0..n ─ 0..1 | 交換相手の担当者ごとの暦（`calendarUid`） |
| RL-11 | `Calendar` | `Calendar` | 0..n ─ 0..1 | 継承元の暦（`baseCalendarUid`） |
| RL-12 | `Calendar` | `WeekDay` | 1 ─ 0..n | 曜日ごとの稼働（弱エンティティ） |
| RL-13 | `Calendar` | `Exception` | 1 ─ 0..n | 例外日（弱エンティティ） |
| RL-14 | `Assignment` | `Task` | 0..n ─ 0..1 | 就くタスク（`taskUid`） |
| RL-15 | `Assignment` | `Resource` | 0..n ─ 0..1 | 就く担当者（`resourceUid`） |
| RL-16 | `TaskVisual` | `Task` | 0..1 ─ 1 | そのタスクの見せ方（`taskUid`） |
| RL-17 | `TaskOrigin` | `Task` | 0..1 ─ 1 | そのタスクの取り込み元（`taskUid`） |
| RL-18 | `CommentBox` | `TaskGroup` | 0..n ─ 0..1 | 留める行（`anchorGroupId`） |
| RL-19 | `HighlightBox` | `TaskGroup` | 0..n ─ 0..1 | 囲む範囲の上端の行（`topGroupId`） |
| RL-20 | `HighlightBox` | `TaskGroup` | 0..n ─ 0..1 | 囲む範囲の下端の行（`bottomGroupId`） |
| RL-21 | `CarryElement` | `CarryElement` | 1 ─ 0..n | 入れ子の子（`children`） |
| RL-22 | `Task` | `BaselineTask` | 0..1 ─ 0..1 | 変更前の予定との対応（`uid` の一致。参照ではない）。対応が無いものは描かない（`FR-015`） |
| RL-23 | `Project` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-24 | `Task` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-25 | `Dependency` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-26 | `Calendar` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-27 | `WeekDay` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-28 | `Exception` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-29 | `Resource` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |
| RL-30 | `Assignment` | `CarryElement` | 1 ─ 0..n | 解釈しない要素の退避先（`carryElements`） |

## 4. 列

**Type**: SECTION

**表 T-058 — 列**

| 行 ID | エンティティ | 列 | 型 | `null` | 鍵 | 出自 | 交換相手の要素 | 意味 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AT-1 | `Project` | `id` | 文字列（16 字以下） | 可 | — | Own | `Project/UID` | ⚠️ **主キーにしない**（理由は Chapter 5.4）。省略されたときは `TaskOrigin.importSessionId` が代わりを務める |
| AT-2 | `Project` | `name` | 文字列 | 可 | — | Own | `Project/Name` | プロジェクト名 |
| AT-3 | `Project` | `title` | 文字列 | 可 | — | Own | `Project/Title` | 文書名（`U-27`） |
| AT-4 | `Project` | `subject` | 文字列 | 可 | — | Own | `Project/Subject` | 件名 |
| AT-5 | `Project` | `category` | 文字列 | 可 | — | Own | `Project/Category` | 分類 |
| AT-6 | `Project` | `company` | 文字列 | 可 | — | Own | `Project/Company` | 会社名 |
| AT-7 | `Project` | `manager` | 文字列 | 可 | — | Own | `Project/Manager` | 管理者名 |
| AT-8 | `Project` | `author` | 文字列 | 可 | — | Own | `Project/Author` | **作成者。最後に書いた者ではない** |
| AT-9 | `Project` | `created` | 日時 | 可 | — | Own | `Project/CreationDate` | 作成日時 |
| AT-10 | `Project` | `revision` | 整数 | 可 | — | Own | `Project/Revision` | ⚠️ **交換相手の保存回数。`revisionStamp.revision` とは別物** |
| AT-11 | `Project` | `lastSaved` | 日時 | 可 | — | Own | `Project/LastSaved` | 最後に保存した日時 |
| AT-12 | `Project` | `startDate` | 日付 | 可 | — | Own | `Project/StartDate` | プロジェクトの開始日 |
| AT-13 | `Project` | `statusDate` | 日付 | 可 | — | Own | `Project/StatusDate` | 基準日線が立つ日 |
| AT-14 | `Project` | `minutesPerDay` | 整数 | 可 | — | Own | `Project/MinutesPerDay` | 1 日あたりの分数。期間の換算に使う。空のときの既定は 表 T-209 の `S-128` |
| AT-15 | `Project` | `minutesPerWeek` | 整数 | 可 | — | Own | `Project/MinutesPerWeek` | 1 週あたりの分数 |
| AT-16 | `Project` | `daysPerMonth` | 整数 | 可 | — | Own | `Project/DaysPerMonth` | 1 か月あたりの日数 |
| AT-17 | `Project` | `weekStartDay` | 整数（0〜6） | 可 | — | Own | `Project/WeekStartDay` | 週の始まりの曜日。暦ではなくここが置き場である（`FR-088`）。**`0` が日曜で、土曜の `6` まで 1 ずつ増える**（正は Chapter 6.2 が指す公式 XSD）。⛔ **`WeekDay.dayType` とは番号が 1 ずれる** —— 同じ曜日が別の数で書かれる。 |
| AT-18 | `Project` | `calendarUid` | 整数 | 可 | FK | Consume | `Project/CalendarUID` | 既定の暦。文書の暦を指す（`FR-054`） |
| AT-19 | `Project` | `themeHue` | 整数（0〜359） | 否 | — | GRS | — | テーマの色相。置き場は表 T-052 の `DR-5`、値は `tbl-settings.md` の `S-73` |
| AT-20 | `Project` | `uidHighWaterMark` | 整数 | 否 | — | GRS | — | 発番済みの `uid` の最大値。**複製（`FR-033`）の採番はここに従う** |
| AT-21 | `Project` | `importSeq` | 整数 | 否 | — | GRS | — | 取込ごとの通し番号。値は `tbl-settings.md` の `S-71`、進め方と照合は表 T-032 の `MG-13` |
| AT-22 | `Project` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しない `Project` 直下のスカラー |
| AT-23 | `Project` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | 行にならなかった子要素（表 T-053 の `DF-3`） |
| AT-24 | `Task` | `uid` | 整数 | 否 | PK | Own | `Task/UID` | 文書内で一意・不変。**値から意味を読まない** |
| AT-25 | `Task` | `wbsParentUid` | 整数 | 可（`null` = 根） | FK | Consume | — | WBS の親。交換相手には対応要素が無く、深さと出現順から起こす |
| AT-26 | `Task` | `wbsOrder` | 整数 | 可 | — | Consume | — | 同じ親の下での並び |
| AT-27 | `Task` | `name` | 文字列 | 可 | — | Own | `Task/Name` | タスク名 |
| AT-28 | `Task` | `start` | 日時 | 可 | — | Own | `Task/Start` | 予定の開始 |
| AT-29 | `Task` | `finish` | 日時 | 可 | — | Own | `Task/Finish` | 予定の終了 |
| AT-30 | `Task` | `milestone` | 真偽 | 可 | — | Own | `Task/Milestone` | **マイルストーンかどうかの正。** 描画の形（`TaskVisual.shapeKind`）とは別（表 T-016 の `PR-18`） |
| AT-31 | `Task` | `deadline` | 日時 | 可 | — | Own | `Task/Deadline` | 期限 |
| AT-32 | `Task` | `notes` | 文字列 | 可 | — | Own | `Task/Notes` | 備考 |
| AT-33 | `Task` | `calendarUid` | 整数 | 可 | FK | Consume | `Task/CalendarUID` | 交換相手のタスクごとの暦。稼働日の数え上げには使わない（`FR-054`） |
| AT-34 | `Task` | `actualStart` | 日時 | 可 | — | Own | `Task/ActualStart` | 実績の開始。空 = 未着手 |
| AT-35 | `Task` | `actualDuration` | 整数（稼働日） | 可 | — | Consume | `Task/ActualDuration` | 実績バーの長さ。**交換相手は時間の量なので、取り込むときに稼働日へ解釈し、書き出すときに `Project.minutesPerDay`（空のときは 表 T-209 の `S-128`）で作り直す**（`FR-054`） |
| AT-36 | `Task` | `actualFinish` | 日時 | 可 | — | Own | `Task/ActualFinish` | **完了したときだけ入る** |
| AT-37 | `Task` | `resume` | 日時 | 可 | — | Own | `Task/Resume` | 中断中に、残りが始まる予定の日 |
| AT-38 | `Task` | `resumeValid` | 真偽 | 可 | — | Own | `Task/ResumeValid` | 偽 = 再開日が未定の中断 |
| AT-39 | `Task` | `percentComplete` | 整数（0 以上） | 可 | — | Own | `Task/PercentComplete` | 完了率。**上限を型に持たせない**（`FR-012`） |
| AT-40 | `Task` | `fadeInDays` | 整数（日数） | 可 | — | Consume | `Task/ExtendedAttribute` | 左のぼかしの日数。`null` と `0` を区別する |
| AT-41 | `Task` | `fadeOutDays` | 整数（日数） | 可 | — | Consume | `Task/ExtendedAttribute` | 右のぼかしの日数。同上 |
| AT-42 | `Task` | `dependencies` | `Dependency[]` | 否（空可） | — | Consume | `Task/PredecessorLink` | **このタスクを後続とする依存**（表 T-053 の `DF-4`） |
| AT-43 | `Task` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しない `Task` 直下のスカラー |
| AT-44 | `Task` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | 行にならなかった子要素 |
| AT-45 | `Dependency` | `predecessorUid` | 整数 | 否 | FK | Consume | `PredecessorLink/PredecessorUID` | 先行タスク。**後続は入れ子の位置が表す** |
| AT-46 | `Dependency` | `linkType` | 整数（0〜3） | 否 | — | Consume | `PredecessorLink/Type` | 依存の種別。`0` = FF / `1` = FS / `2` = SF / `3` = SS |
| AT-47 | `Dependency` | `lag` | 整数 | 可 | — | Consume | `PredecessorLink/LinkLag` | ラグ。単位は `lagFormat` |
| AT-48 | `Dependency` | `lagFormat` | 整数 | 可 | — | Consume | `PredecessorLink/LagFormat` | ラグの単位 |
| AT-49 | `Dependency` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | `CrossProject` ほか、解釈しないスカラー |
| AT-50 | `Dependency` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | 行にならなかった子要素 |
| AT-51 | `TaskGroup` | `id` | 文字列（UUID） | 否 | PK | GRS | — | 行の識別子 |
| AT-52 | `TaskGroup` | `parentId` | 文字列（UUID） | 可（`null` = 根） | FK | GRS | — | 親の行。深さの上限は `FR-004` |
| AT-53 | `TaskGroup` | `label` | 文字列 | 可（`null` = 導出） | — | GRS | — | 行の名前 |
| AT-54 | `TaskGroup` | `derivedFromTaskUid` | 整数 | 可 | FK | GRS | — | 名前の導出元。`label` と同時に `null` にできない |
| AT-55 | `TaskGroup` | `order` | 整数 | 否 | — | GRS | — | 同じ親の下での並び |
| AT-56 | `TaskGroup` | `isCollapsed` | 真偽 | 可 | — | GRS | — | 畳んでいるか |
| AT-57 | `TaskGroup` | `isHidden` | 真偽 | 可 | — | GRS | — | 隠しているか。戻す入口は 表 T-015 の `HR-6` が持つ |
| AT-58 | `TaskGroup` | `color` | 文字列 | 可（`null` = テーマから解く） | — | GRS | — | 行の帯の色 |
| AT-59 | `TaskGroup` | `height` | 整数 | 可（`null` = 自動） | — | GRS | — | 倍率 1 のときの論理の高さ |
| AT-60 | `TaskGroupMember` | `taskUid` | 整数 | 否 | PK/FK | GRS | — | 載るタスク。**1 つのタスクは 1 行にしか載らない**ので、これだけで一意である |
| AT-61 | `TaskGroupMember` | `groupId` | 文字列（UUID） | 否 | FK | GRS | — | 載せる行 |
| AT-62 | `TaskGroupMember` | `stackOrder` | 整数 | 可（`null` = 自動） | — | GRS | — | 段。人が指定できるかは表 T-014 の `ST-6` |
| AT-63 | `Calendar` | `uid` | 整数 | 否 | PK | Own | `Calendars/Calendar/UID` | 暦の識別子 |
| AT-64 | `Calendar` | `name` | 文字列 | 可 | — | Own | `Calendars/Calendar/Name` | 暦の名前 |
| AT-65 | `Calendar` | `isBaseCalendar` | 真偽 | 可 | — | Own | `Calendars/Calendar/IsBaseCalendar` | 基準の暦か |
| AT-66 | `Calendar` | `baseCalendarUid` | 整数 | 可 | FK | Consume | `Calendars/Calendar/BaseCalendarUID` | 継承元の暦 |
| AT-67 | `Calendar` | `ordinal` | 整数 | 否 | — | GRS | — | 出現順。書き出しで元の並びに戻す |
| AT-68 | `Calendar` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しないスカラー |
| AT-69 | `Calendar` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | `WorkWeeks` ほか、行にならなかった子要素 |
| AT-70 | `Calendar` | `weekDays` | `WeekDay[]` | 否（空可） | — | Consume | `Calendars/Calendar/WeekDays/WeekDay` | **曜日ごとの稼働**（表 T-053 の `DF-1`） |
| AT-71 | `Calendar` | `exceptions` | `Exception[]` | 否（空可） | — | Consume | `Calendars/Calendar/Exceptions/Exception` | **例外日**（表 T-053 の `DF-1`） |
| AT-72 | `WeekDay` | `ordinal` | 整数 | 否 | PK | GRS | — | 親の中での出現順 |
| AT-73 | `WeekDay` | `dayType` | 整数（1〜7） | 可 | — | Own | `Calendars/Calendar/WeekDays/WeekDay/DayType` | 曜日。**`1` が日曜で、土曜の `7` まで 1 ずつ増える**（正は Chapter 6.2 が指す公式 XSD）。⚠️ **`0` は例外日を表すので本列は採らない** —— 例外日は `Exception` が持つ。⛔ **`Project.weekStartDay` とは番号が 1 ずれる** —— 交換相手が列ごとに別の体系を使っている。 |
| AT-74 | `WeekDay` | `dayWorking` | 真偽 | 可 | — | Own | `Calendars/Calendar/WeekDays/WeekDay/DayWorking` | 稼働日か |
| AT-75 | `WeekDay` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しないスカラー |
| AT-76 | `WeekDay` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | `WorkingTimes` ほか |
| AT-77 | `Exception` | `ordinal` | 整数 | 否 | PK | GRS | — | 親の中での出現順 |
| AT-78 | `Exception` | `name` | 文字列 | 可 | — | Own | `Calendars/Calendar/Exceptions/Exception/Name` | 例外の名前 |
| AT-79 | `Exception` | `fromDate` | 日時 | 可 | — | Own | `…/Exception/TimePeriod/FromDate` | ⚠️ **繰り返しの起点であって実日付の範囲ではない** |
| AT-80 | `Exception` | `toDate` | 日時 | 可 | — | Own | `…/Exception/TimePeriod/ToDate` | 同上 |
| AT-81 | `Exception` | `dayWorking` | 真偽 | 可 | — | Own | `…/Exception/DayWorking` | 稼働日か |
| AT-82 | `Exception` | `recurrenceKind` | 整数（1〜9） | 可 | — | Consume | `…/Exception/Type` | **繰り返しの種別。これを読まないと毎年 1 日の祝日が何年ぶんも非稼働になる** |
| AT-83 | `Exception` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しないスカラー |
| AT-84 | `Exception` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | `WorkingTimes` ほか |
| AT-85 | `Resource` | `uid` | 整数 | 否 | PK | Own | `Resource/UID` | 担当者の識別子 |
| AT-86 | `Resource` | `name` | 文字列 | 可 | — | Own | `Resource/Name` | 担当者名 |
| AT-87 | `Resource` | `resourceKind` | 整数 | 可 | — | Own | `Resource/Type` | `0` = 材料 / `1` = 作業 / `2` = 費用 |
| AT-88 | `Resource` | `isCostResource` | 真偽 | 可 | — | Own | `Resource/IsCostResource` | 費用資源か |
| AT-89 | `Resource` | `calendarUid` | 整数 | 可 | FK | Consume | `Resource/CalendarUID` | 交換相手の担当者ごとの暦。稼働日の数え上げには使わない（`FR-054`） |
| AT-90 | `Resource` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しないスカラー 59 |
| AT-91 | `Resource` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | 行にならなかった子要素 6 |
| AT-92 | `Assignment` | `uid` | 整数 | 否 | PK | Own | `Assignment/UID` | 割当の識別子 |
| AT-93 | `Assignment` | `taskUid` | 整数 | 可 | FK | Consume | `Assignment/TaskUID` | 就くタスク |
| AT-94 | `Assignment` | `resourceUid` | 整数 | 可 | FK | Consume | `Assignment/ResourceUID` | 就く担当者 |
| AT-95 | `Assignment` | `carry` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | 解釈しないスカラー 58 |
| AT-96 | `Assignment` | `carryElements` | `CarryElement[]` | 否（空可） | — | Carry | — | 行にならなかった子要素 3 |
| AT-97 | `TaskVisual` | `taskUid` | 整数 | 否 | PK/FK | GRS | — | 対象のタスク |
| AT-98 | `TaskVisual` | `nameAnchor` | 整数（0〜8） | 可 | — | GRS | — | 名前を置く位置（表 T-013） |
| AT-99 | `TaskVisual` | `nameAlign` | 列挙（3 値） | 可 | — | GRS | — | 名前の揃え |
| AT-100 | `TaskVisual` | `shapeKind` | 列挙（5 値） | 可（`null` = `Task.milestone` から解く） | — | GRS | — | **描画の形だけを決める。`Task.milestone` を変えない**（表 T-012） |
| AT-101 | `TaskVisual` | `milestoneGlyph` | 列挙（8 値） | 可 | — | GRS | — | `shapeKind` が `'milestone'` のときだけ見る。**既定は `'diamond'`** |
| AT-102 | `TaskVisual` | `fillColor` | 文字列 | 可（`null` = テーマから解く） | — | GRS | — | 塗り。**輪郭と同時に透明にできない**（`FR-030`） |
| AT-103 | `TaskVisual` | `strokeColor` | 文字列 | 可（同上） | — | GRS | — | 輪郭。同上 |
| AT-104 | `TaskVisual` | `lineWeight` | 列挙（3 値） | 可 | — | GRS | — | 輪郭の太さ |
| AT-105 | `TaskOrigin` | `taskUid` | 整数 | 否 | PK/FK | GRS | — | 対象のタスク。**行が無い = 本ソフトウェア生まれ** |
| AT-106 | `TaskOrigin` | `sourceProjectUid` | 文字列 | 可 | — | GRS | — | 取り込み元のプロジェクト |
| AT-107 | `TaskOrigin` | `sourceUid` | 整数 | 否 | — | GRS | — | 取り込み元でのタスクの識別子 |
| AT-108 | `TaskOrigin` | `lastSeenImportSeq` | 整数 | 否 | — | GRS | — | 最後に見た取り込みの通し番号（`MG-13`） |
| AT-109 | `TaskOrigin` | `importSessionId` | 文字列 | 可 | — | GRS | — | 取り込み 1 回の識別子 |
| AT-110 | `CommentBox` | `id` | 文字列（UUID） | 否 | PK | GRS | — | 注記の識別子 |
| AT-111 | `CommentBox` | `leaderShapeKind` | 列挙（2 値） | 可 | — | GRS | — | 引き出し線の形 |
| AT-112 | `CommentBox` | `text` | 文字列 | 可 | — | GRS | — | **本文。「コメント」と略さない**（`U-14`） |
| AT-113 | `CommentBox` | `anchorDate` | 日時 | 可 | — | GRS | — | 留める日 |
| AT-114 | `CommentBox` | `anchorGroupId` | 文字列（UUID） | 可 | FK | GRS | — | 留める行 |
| AT-115 | `CommentBox` | `bodyOffsetPx` | `{ dx, dy }` | 可 | — | GRS | — | 留めた点から本文までのずれ |
| AT-116 | `HighlightBox` | `id` | 文字列（UUID） | 否 | PK | GRS | — | 注記の識別子 |
| AT-117 | `HighlightBox` | `startDate` | 日時 | 可 | — | GRS | — | 囲む範囲の左端 |
| AT-118 | `HighlightBox` | `endDate` | 日時 | 可 | — | GRS | — | 囲む範囲の右端 |
| AT-119 | `HighlightBox` | `topGroupId` | 文字列（UUID） | 可 | FK | GRS | — | 囲む範囲の上端の行 |
| AT-120 | `HighlightBox` | `bottomGroupId` | 文字列（UUID） | 可 | FK | GRS | — | 囲む範囲の下端の行 |
| AT-121 | `HighlightBox` | `strokeColor` | 文字列 | 可 | — | GRS | — | 枠の色 |
| AT-122 | `HighlightBox` | `cornerRadiusPx` | 数値 | 可 | — | GRS | — | 角の丸み |
| AT-123 | `CarryElement` | `ordinal` | 整数 | 否 | PK | GRS | — | 所有者の中での出現順。**所有者とこれで一意になる。これで元の位置に戻す** |
| AT-124 | `CarryElement` | `name` | 文字列 | 否 | — | Carry | — | 交換相手での要素名。**綴りを変えない**（`W-9`） |
| AT-125 | `CarryElement` | `fields` | 連想（文字列→文字列） | 否（空可） | — | Carry | — | その要素が持つ葉 |
| AT-126 | `CarryElement` | `children` | `CarryElement[]` | 否（空可） | — | Carry | — | 入れ子の子。**深さの上限は定めない** |
| AT-127 | `revisionStamp` | `revision` | 整数 | 否 | — | GRS | — | 1 ずつ増える。上げる条件は `FR-063` |
| AT-128 | `revisionStamp` | `lastEditedBy` | 文字列 | 否 | — | GRS | — | 最後に書いた者。人か、AI か |
| AT-129 | `revisionStamp` | `updatedAt` | 文字列（`ISO 8601`・UTC・秒） | 否 | — | GRS | — | 最後に書いた時刻。**秒までとする**（透かしと精度を揃える） |
| AT-130 | `changeLog` | `revision` | 整数 | 否 | PK | GRS | — | どの版に対する理由か |
| AT-131 | `changeLog` | `editedBy` | 文字列 | 否 | — | GRS | — | その版を書いた者 |
| AT-132 | `changeLog` | `explanation` | 文字列 | 否 | — | GRS | — | なぜそう変えたか（`UC-013`） |
| AT-133 | `changeLog` | `changedAt` | 文字列（`ISO 8601`・UTC・秒） | 否 | — | GRS | — | その版の時刻 |
| AT-134 | `BaselineTask` | `uid` | 整数 | 否 | PK | GRS | — | 重ねる相手での識別子。**現在の文書のタスクとはこの一致で対応づける**（`FR-015`） |
| AT-135 | `BaselineTask` | `name` | 文字列 | 可 | — | GRS | — | タスク名 |
| AT-136 | `BaselineTask` | `start` | 日時 | 可 | — | GRS | — | 変更前の予定の開始 |
| AT-137 | `BaselineTask` | `finish` | 日時 | 可 | — | GRS | — | 変更前の予定の終了 |
| AT-138 | `BaselineTask` | `milestone` | 真偽 | 可 | — | GRS | — | マイルストーンとして描くか |

## 5. 列にせず、書き出すときに作るもの

**Type**: SECTION

**表 T-059 — 書き出すときに作る値**

| 行 ID | エンティティ | 交換相手での名前 | 交換相手の要素 | 何から作るか |
| --- | --- | --- | --- | --- |
| DV-1 | `Project` | `finishDate` | `Project/FinishDate` | 最も遅い `Task.finish` |
| DV-2 | `Project` | `saveVersion` | `Project/SaveVersion` | 書き出す本ソフトウェアの版 |
| DV-3 | `Project` | `currencyCode` | `Project/CurrencyCode` | `carry` に控えた原値 |
| DV-4 | `Task` | `id` | `Task/ID` | 書き出す順に振り直す。**`uid` とは別物で、可変である** |
| DV-5 | `Task` | `outlineLevel` | `Task/OutlineLevel` | `wbsParentUid` の木の深さ。**浅く丸めない**（`FR-004`） |
| DV-6 | `Task` | `outlineNumber` | `Task/OutlineNumber` | 木の道すじ。**照合の鍵にしない** |
| DV-7 | `Task` | `summary` | `Task/Summary` | 子を持つかどうか |
| DV-8 | `Task` | `duration` | `Task/Duration` | `finish` − `start` と暦。**人が編集していないタスクは受け取った値をそのまま返す** |
| DV-9 | `Task` | `stop` | `Task/Stop` | `actualStart` ＋ `actualDuration`。**中断のときだけ書く** |
| DV-10 | `Resource` | `id` | `Resource/ID` | 書き出す順に振り直す。**`uid` とは別物** |
