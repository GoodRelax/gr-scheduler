---
type: Reference
title: MSPDI enum 全数リファレンス（XSD 実測）
description: XSD を機械パースして抽出した enum の全数。
resource: mspdi/mspdi_pj12.xsd
tags: [mspdi]
phase: survey
status: stable
---
# MSPDI enum 全数リファレンス（XSD 実測）

- 日付: 2026-07-26
- 正: **公式 XSD** <https://schemas.microsoft.com/project/2007/mspdi_pj12.xsd>
  （ローカル複製は `mspdi/mspdi_pj12.xsd`。**同梱していない** — 取得は `mspdi/README.md`）。
  本書は **XSD を機械パースして全 `xsd:enumeration` を抽出**したもの。
- 規模: **enum を持つ要素 53 個 / enumeration 値 535 個**。
- **enum は必ず整数コードで入る**（`<Type>1</Type>`。文字列ではない）。値の意味は XSD の documentation に記載されている。
- 関連: `mspdi-pitfalls-ja.md`（実装の落とし穴）/ `mspdi-core-tree.md`（構造）

> ⚠️ **要約からの推測で実装しないこと**。同名の enum でも**出現場所によって値集合が違う**ものがある（下記 `LagFormat` / `StandardRateFormat` の例）。

---

## 1. 依存・階層・暦（GRS が Consume する中核）

### `PredecessorLink/Type`（4）

The link type. Values are 0=FF, 1=FS, 2=SF and 3=SS.

| 値 | 意味 |
|---|---|
| 0 | FF（完了→完了） |
| 1 | **FS（完了→開始・最頻）** |
| 2 | SF（開始→完了） |
| 3 | SS（開始→開始） |

### `WeekDay/DayType`（8）

The type of day. Values are: 0=Exception, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday.

| 値 | 意味 |
|---|---|
| 0 | **Exception（例外日）** |
| 1〜7 | 日 / 月 / 火 / 水 / 木 / 金 / 土 |

> `WorkWeek/WeekDay/DayType` も**同じ 8 値**。

### `Exception/Type`（9）— **読まないと祝日が数年の休みに化ける**

The exception type. Values are: 1=Daily, 2=Yearly by day of the month, 3=Yearly by position, 4=Monthly by day of the month, 5=Monthly by position, 6=Weekly, 7=By day count, 8=By weekday count, 9=No exception type.

| 値 | 意味 |
|---|---|
| 1 | Daily（毎日） |
| 2 | Yearly by day of the month（毎年・日付指定） |
| 3 | Yearly by position（毎年・位置指定） |
| 4 | Monthly by day of the month（毎月・日付指定） |
| 5 | Monthly by position（毎月・位置指定） |
| 6 | Weekly（毎週） |
| 7 | By day count（日数） |
| 8 | By weekday count（曜日数） |
| **9** | **No exception type（繰返しなし）** |

> **`Type` が欠落 or `9` のときだけ `TimePeriod` が実日付**。1〜8 は繰返しの適用範囲を表す（→ `mspdi-pitfalls-ja.md` C-1）。

### `Exception/MonthItem`（10）/ `MonthPosition`（5）/ `Month`（12）

- `MonthItem`: The month item for which an exception recurrence is scheduled. Values are: 0=Day, 1=Weekday, 2=WeekendDay, 3=Sunday, 4=Monday, 5=Tuesday, 6=Wednesday, 7=Thursday, 8=Friday, 9=Saturday.
- `MonthPosition`: The position of a month item within a month. Values are: 0=First position, 1=Second position, 2=Third position, 3=Fourth position, 4=Last position.
- `Month`: The month for which an exception recurrence is scheduled. Values are: 0=January, 1=February, 2=March, 3=April, 4=May, 5=June, 6=July, 7=August, 8=September, 9=October, 10=November, 11=December.

> `DaysOfWeek` は enum ではなく**ビットフラグ**（1=日, 2=月, 4=火, 8=水, 16=木, 32=金, 64=土）。

---

## 2. 期間・ラグの書式 — **`DurationFormat` と `LagFormat` は値集合が違う**

### `DurationFormat`（26）

The format for expressing the Duration of the Task. Values are: 3=m, 4=em, 5=h, 6=eh, 7=d, 8=ed, 9=w, 10=ew, 11=mo, 12=emo, 19=%, 20=e%, 21=null, 35=m?, 36=em?, 37=h?, 38=eh?, 39=d?, 40=ed?, 41=w?, 42=ew?, 43=mo?, 44=emo?, 51=%?, 52=e%? and 53=null.

| 値 | 単位 | 値 | 単位（推定つき `?`） |
|---|---|---|---|
| 3 | m（分） | 35 | m? |
| 4 | em（実働分） | 36 | em? |
| 5 | h（時） | 37 | h? |
| 6 | eh | 38 | eh? |
| 7 | **d（日）** | 39 | d? |
| 8 | ed | 40 | ed? |
| 9 | w（週） | 41 | w? |
| 10 | ew | 42 | ew? |
| 11 | mo（月） | 43 | mo? |
| 12 | emo | 44 | emo? |
| 19 | %（％） | 51 | %? |
| 20 | e% | 52 | e%? |
| **21** | **null** | 53 | null |

**同じ 26 値を使う要素**: `Project/DurationFormat`、`Task/DurationFormat`、`Task/LevelingDelayFormat`、`Task/ExtendedAttribute/DurationFormat`、`Task/Baseline/DurationFormat`、`Resource/ExtendedAttribute/DurationFormat`、`Assignment/LevelingDelayFormat`、`Assignment/ExtendedAttribute/DurationFormat`

### `PredecessorLink/LagFormat`（**25** — `21`(null) が無い）

**`DurationFormat` から `21=null` だけを除いた 25 値**。

> ⚠️ **これが「同名 enum でも場所で値集合が違う」実例**。`DurationFormat` の定義を `LagFormat` に流用すると、`21` を受け付ける実装になり検証が甘くなる。

### `WorkFormat`（5）

The default work unit format. Values are: 1=m, 2=h, 3=d, 4=w, 5=mo.

---

## 3. タスク

### `Task/Type`（3）

The type of task. Values are: 0=Fixed Units, 1=Fixed Duration, 2=Fixed Work. — `Project/DefaultTaskType` も同じ 3 値。

### `Task/ConstraintType`（8）

The constraint on the start or finish date of the task. Values are: 0=As Soon As Possible, 1=As Late As Possible, 2=Must Start On, 3=Must Finish On, 4=Start No Earlier Than, 5=Start No Later Than, 6=Finish No Earlier Than and 7=Finish No Later Than.

| 値 | 意味 |
|---|---|
| 0 | As Soon As Possible（できるだけ早く） |
| 1 | As Late As Possible（できるだけ遅く） |
| 2 | Must Start On（この日に開始） |
| 3 | Must Finish On（この日に完了） |
| 4 | Start No Earlier Than |
| 5 | Start No Later Than |
| 6 | Finish No Earlier Than |
| 7 | Finish No Later Than |

### `Task/FixedCostAccrual`（3）/ `EarnedValueMethod`（2）/ `CommitmentType`（3）

- `FixedCostAccrual`: How the fixed cost is accrued against the task. Values are: 1=Start, 2=Prorated and 3=End.
- `EarnedValueMethod`: The method for calculating earned value. Values are: 0=Percent Complete, 1=Physical Percent Complete.
- `CommitmentType`: Whether the task has an associated deliverable or a dependency on an associated deliverable. Values are: 0=The task has no deliverable or dependency on a deliverable, 1=The task has an associated deliverable, 2=The task has a dependency on an associated deliverable.

---

## 4. 資源・割当

### `Resource/Type`（2）

The type of resource. Values are: 0=Material, 1=Work.

> ⚠️ **コスト資源はこの enum に無い**。`IsCostResource`(bool) という別フィールドで表現される（→ `mspdi-pitfalls-ja.md` C-6）。

### `Resource/AccrueAt`（4）

How cost is accrued against the resource. Values are: 1=Start, 2=End, 3=Prorated, $New4=Invalid.

> ⚠️ documentation の **`$New4=Invalid`** は XSD 生成時の残骸と思われる表記。値 `4` は「Invalid」。

### `Resource/WorkGroup`（4）/ `BookingType`（2）

- `WorkGroup`: The type of workgroup to which the resource belongs. Values are: 0=Default, 1=None, 2=Email, 3=Web.
- `BookingType`: The booking type of the resource. 1=Commited, 2=Proposed. — `Assignment/BookingType` も同じ。

### レート書式 — **4 か所にあり、値集合は 2 種類**

| 要素 | 値数 | 内容 |
|---|:--:|---|
| `Resource/StandardRateFormat` | **7** | 1=m, 2=h, 3=d, 4=w, 5=mo, 7=y, **8=material rate** |
| `Resource/OvertimeRateFormat` | **6** | 1=m, 2=h, 3=d, 4=w, 5=mo, 7=y |
| `Rate/StandardRateFormat` | **6** | 同上（**`8` を持たない**） |
| `Rate/OvertimeRateFormat` | 6 | 同上 |

> ⚠️ `Resource/StandardRateFormat` だけが `8=material rate` を持つ。**同じ名前でも親が違えば値集合が違う**。

### `Rate/RateTable`（5）/ `Assignment/CostRateTable`（5）

- `Rate/RateTable`: The unique identifier of the rate table for the resource. Values are: 0=A, 1=B, 2=C, 3=D, 4=E.
- `Assignment/CostRateTable`: The cost rate table used for the assignment.

> ⚠️ `CostRateTable` は **documentation に値の意味が書かれていない**。値は 0〜4 で、`Rate/RateTable` と同じ **A〜E** と解釈するのが妥当。

### `Assignment/WorkContour`（9）

The work contour of the assignment. Values are: 0=Flat, 1=Back Loaded, 2=Front Loaded, 3=Double Peak, 4=Early Peak, 5=Late Peak, 6=Bell, 7=Turtle, 8=Contoured.

---

## 5. プロジェクト設定

| 要素 | 数 | 意味 |
|---|:--:|---|
| `FYStartDate` | 12 | 1=January 〜 12=December |
| `WeekStartDay` | 7 | 0=Sunday 〜 6=Saturday |
| `CurrencySymbolPosition` | 4 | 0=Before, 1=After, 2=Before With Space, 3=After with space |
| `DefaultFixedCostAccrual` | 3 | 1=Start, 2=Prorated, 3=End |
| `EarnedValueMethod` / `DefaultTaskEVMethod` | 2 | 0=Percent Complete, 1=Physical Percent Complete |
| `NewTaskStartDate` | 2 | 0=Project Start Date, 1=Current Date |
| `BaselineForEarnedValue` | 11 | 0=Baseline, 1〜10=Baseline 1〜10 |

---

## 6. 分類コード・カスタムフィールド

| 要素 | 数 | 意味 |
|---|:--:|---|
| `OutlineCode/Values/Value/Type` | 7 | 4=Date, 6=Duration, 9=Cost, 15=Number, 17=Flag, 21=Text, 27=Finish date |
| `OutlineCode/Masks/Mask/Type` | 4 | 0=Numbers, 1=Upper Case Letters, 2=Lower Case Letters, 3=Characters |
| `WBSMask/Type` | 4 | 同上 |
| `ExtendedAttribute/CFType` | 8 | 0=Cost, 1=Date, 2=Duration, 3=Finish, 4=Flag, 5=Number, 6=Start, 7=Text |
| `ExtendedAttribute/ElemType` | 4 | 20=Task, 21=Resource, **22=Calendar, 23=Assignment** |
| `ExtendedAttribute/RollupType` | 8 | 0=Maximum(OR), 1=Minimum(AND), 2=Count all, 3=Sum, 4=Average, 5=Average First Sublevel, 6=Count First Sublevel, 7=Count Nonsummaries |
| `ExtendedAttribute/CalculationType` | 3 | 0=None, 1=Rollup, 2=Calculation |
| `ExtendedAttribute/ValuelistSortOrder` | 2 | 0=Descending, 1=Ascending |

> ⚠️ **値が飛んでいる**ものがある（`Value/Type` は 4,6,9,15,17,21,27）。**連番を前提にしないこと**。

---

## 7. `TimephasedData`（共有子）

### `Unit`（6）

The time unit of the timephased data period. Values are: 0=m, 1=h, 2=d, 3=w, 5=mo, 8=y.

> ⚠️ **連番ではない**。0=m, 1=h, 2=d, 3=w, **5=mo**, **8=y** で、`4`・`6`・`7` は欠番。

### `Type`（72）— 12〜15 が欠番

有効なコードは **1〜11 と 16〜76 の計 72 個**。**16〜75 は 6 個周期**で `[Assignment Work, Assignment Cost, Task Work, Task Cost, Resource Work, Resource Cost]` が Baseline 1〜10 ぶん繰り返す。

| 値 | 意味（原文） | 対象 | 指標 | 基準 | 和訳 |
|---:|---|---|---|:--:|---|
| 1 | Assignment Remaining Work | 割当 | 残作業 | — | 割当: 残作業 |
| 2 | Assignment Actual Work | 割当 | 実績作業 | — | 割当: 実績作業 |
| 3 | Assignment Actual Overtime Work | 割当 | 実績残業 | — | 割当: 実績残業作業 |
| 4 | Assignment Baseline Work | 割当 | 作業 | 0 | 割当: ベースライン作業 |
| 5 | Assignment Baseline Cost | 割当 | コスト | 0 | 割当: ベースラインコスト |
| 6 | Assignment Actual Cost | 割当 | 実績コスト | — | 割当: 実績コスト |
| 7 | Resource Baseline Work | リソース | 作業 | 0 | リソース: ベースライン作業 |
| 8 | Resource Baseline Cost | リソース | コスト | 0 | リソース: ベースラインコスト |
| 9 | Task Baseline Work | タスク | 作業 | 0 | タスク: ベースライン作業 |
| 10 | Task Baseline Cost | タスク | コスト | 0 | タスク: ベースラインコスト |
| 11 | Task Percent Complete | タスク | 進捗率 | — | タスク: 進捗率(%) |
| 16 | Assignment Baseline 1 Work | 割当 | 作業 | 1 | 割当: ベースライン1 作業 |
| 17 | Assignment Baseline 1 Cost | 割当 | コスト | 1 | 割当: ベースライン1 コスト |
| 18 | Task Baseline 1 Work | タスク | 作業 | 1 | タスク: ベースライン1 作業 |
| 19 | Task Baseline 1 Cost | タスク | コスト | 1 | タスク: ベースライン1 コスト |
| 20 | Resource Baseline 1 Work | リソース | 作業 | 1 | リソース: ベースライン1 作業 |
| 21 | Resource Baseline 1 Cost | リソース | コスト | 1 | リソース: ベースライン1 コスト |
| 22 | Assignment Baseline 2 Work | 割当 | 作業 | 2 | 割当: ベースライン2 作業 |
| 23 | Assignment Baseline 2 Cost | 割当 | コスト | 2 | 割当: ベースライン2 コスト |
| 24 | Task Baseline 2 Work | タスク | 作業 | 2 | タスク: ベースライン2 作業 |
| 25 | Task Baseline 2 Cost | タスク | コスト | 2 | タスク: ベースライン2 コスト |
| 26 | Resource Baseline 2 Work | リソース | 作業 | 2 | リソース: ベースライン2 作業 |
| 27 | Resource Baseline 2 Cost | リソース | コスト | 2 | リソース: ベースライン2 コスト |
| 28 | Assignment Baseline 3 Work | 割当 | 作業 | 3 | 割当: ベースライン3 作業 |
| 29 | Assignment Baseline 3 Cost | 割当 | コスト | 3 | 割当: ベースライン3 コスト |
| 30 | Task Baseline 3 Work | タスク | 作業 | 3 | タスク: ベースライン3 作業 |
| 31 | Task Baseline 3 Cost | タスク | コスト | 3 | タスク: ベースライン3 コスト |
| 32 | Resource Baseline 3 Work | リソース | 作業 | 3 | リソース: ベースライン3 作業 |
| 33 | Resource Baseline 3 Cost | リソース | コスト | 3 | リソース: ベースライン3 コスト |
| 34 | Assignment Baseline 4 Work | 割当 | 作業 | 4 | 割当: ベースライン4 作業 |
| 35 | Assignment Baseline 4 Cost | 割当 | コスト | 4 | 割当: ベースライン4 コスト |
| 36 | Task Baseline 4 Work | タスク | 作業 | 4 | タスク: ベースライン4 作業 |
| 37 | Task Baseline 4 Cost | タスク | コスト | 4 | タスク: ベースライン4 コスト |
| 38 | Resource Baseline 4 Work | リソース | 作業 | 4 | リソース: ベースライン4 作業 |
| 39 | Resource Baseline 4 Cost | リソース | コスト | 4 | リソース: ベースライン4 コスト |
| 40 | Assignment Baseline 5 Work | 割当 | 作業 | 5 | 割当: ベースライン5 作業 |
| 41 | Assignment Baseline 5 Cost | 割当 | コスト | 5 | 割当: ベースライン5 コスト |
| 42 | Task Baseline 5 Work | タスク | 作業 | 5 | タスク: ベースライン5 作業 |
| 43 | Task Baseline 5 Cost | タスク | コスト | 5 | タスク: ベースライン5 コスト |
| 44 | Resource Baseline 5 Work | リソース | 作業 | 5 | リソース: ベースライン5 作業 |
| 45 | Resource Baseline 5 Cost | リソース | コスト | 5 | リソース: ベースライン5 コスト |
| 46 | Assignment Baseline 6 Work | 割当 | 作業 | 6 | 割当: ベースライン6 作業 |
| 47 | Assignment Baseline 6 Cost | 割当 | コスト | 6 | 割当: ベースライン6 コスト |
| 48 | Task Baseline 6 Work | タスク | 作業 | 6 | タスク: ベースライン6 作業 |
| 49 | Task Baseline 6 Cost | タスク | コスト | 6 | タスク: ベースライン6 コスト |
| 50 | Resource Baseline 6 Work | リソース | 作業 | 6 | リソース: ベースライン6 作業 |
| 51 | Resource Baseline 6 Cost | リソース | コスト | 6 | リソース: ベースライン6 コスト |
| 52 | Assignment Baseline 7 Work | 割当 | 作業 | 7 | 割当: ベースライン7 作業 |
| 53 | Assignment Baseline 7 Cost | 割当 | コスト | 7 | 割当: ベースライン7 コスト |
| 54 | Task Baseline 7 Work | タスク | 作業 | 7 | タスク: ベースライン7 作業 |
| 55 | Task Baseline 7 Cost | タスク | コスト | 7 | タスク: ベースライン7 コスト |
| 56 | Resource Baseline 7 Work | リソース | 作業 | 7 | リソース: ベースライン7 作業 |
| 57 | Resource Baseline 7 Cost | リソース | コスト | 7 | リソース: ベースライン7 コスト |
| 58 | Assignment Baseline 8 Work | 割当 | 作業 | 8 | 割当: ベースライン8 作業 |
| 59 | Assignment Baseline 8 Cost | 割当 | コスト | 8 | 割当: ベースライン8 コスト |
| 60 | Task Baseline 8 Work | タスク | 作業 | 8 | タスク: ベースライン8 作業 |
| 61 | Task Baseline 8 Cost | タスク | コスト | 8 | タスク: ベースライン8 コスト |
| 62 | Resource Baseline 8 Work | リソース | 作業 | 8 | リソース: ベースライン8 作業 |
| 63 | Resource Baseline 8 Cost | リソース | コスト | 8 | リソース: ベースライン8 コスト |
| 64 | Assignment Baseline 9 Work | 割当 | 作業 | 9 | 割当: ベースライン9 作業 |
| 65 | Assignment Baseline 9 Cost | 割当 | コスト | 9 | 割当: ベースライン9 コスト |
| 66 | Task Baseline 9 Work | タスク | 作業 | 9 | タスク: ベースライン9 作業 |
| 67 | Task Baseline 9 Cost | タスク | コスト | 9 | タスク: ベースライン9 コスト |
| 68 | Resource Baseline 9 Work | リソース | 作業 | 9 | リソース: ベースライン9 作業 |
| 69 | Resource Baseline 9 Cost | リソース | コスト | 9 | リソース: ベースライン9 コスト |
| 70 | Assignment Baseline 10 Work | 割当 | 作業 | 10 | 割当: ベースライン10 作業 |
| 71 | Assignment Baseline 10 Cost | 割当 | コスト | 10 | 割当: ベースライン10 コスト |
| 72 | Task Baseline 10 Work | タスク | 作業 | 10 | タスク: ベースライン10 作業 |
| 73 | Task Baseline 10 Cost | タスク | コスト | 10 | タスク: ベースライン10 コスト |
| 74 | Resource Baseline 10 Work | リソース | 作業 | 10 | リソース: ベースライン10 作業 |
| 75 | Resource Baseline 10 Cost | リソース | コスト | 10 | リソース: ベースライン10 コスト |
| 76 | Physical Percent Complete | タスク | 物理進捗率 | — | タスク: 物理進捗率(%) |

---

## 抽出方法（再現手順）

XSD を XML としてパースし、各 `xsd:element` の**直下の** `xsd:simpleType` 内にある `xsd:enumeration` を集める。
**直下に限る**のが要点で、子孫まで拾うと親要素が子の enum を持っているように見えてしまう。

```python
import xml.etree.ElementTree as ET
XS = '{http://www.w3.org/2001/XMLSchema}'
root = ET.parse('mspdi_pj12.xsd').getroot()
def walk(el, path):
    for ch in el:
        if ch.tag == XS + 'element':
            nm = ch.get('name'); p = path + '/' + nm if nm else path
            st = ch.find(XS + 'simpleType')          # 直下のみ
            if st is not None:
                v = [e.get('value') for e in st.iter(XS + 'enumeration')]
                if v: print(p, len(v), v)
            walk(ch, p)
        else:
            walk(ch, path)
walk(root, '')
```

*出典: `mspdi/mspdi_pj12.xsd`（Microsoft Office Project 2007 XML Data Interchange Schema, © 2007 Microsoft Corp.）の機械抽出。*