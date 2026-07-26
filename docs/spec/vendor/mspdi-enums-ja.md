# MSPDI enum 全数リファレンス（XSD 実測）

- 日付: 2026-07-26
- 正本: `mspdi/mspdi_pj12.xsd`。本書は **XSD を機械パースして全 `xsd:enumeration` を抽出**したもの。
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

### レート書式 — **同名で 3 通りある**

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
| `ExtendedAttribute/ElemType` | 4 | 20=Task, 21=Resource, 22=Assignment ほか |
| `ExtendedAttribute/RollupType` | 8 | 0=Maximum(OR), 1=Minimum(AND), 2=Count ほか |
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

| 値 | 意味 |
|---|---|
| 1 | Assignment Remaining Work |
| 2 | Assignment Actual Work |
| 3 | Assignment Actual Overtime Work |
| 4 | Assignment Baseline Work |
| 5 | Assignment Baseline Cost |
| 6 | Assignment Actual Cost |
| 7 | Resource Baseline Work |
| 8 | Resource Baseline Cost |
| 9 | Task Baseline Work |
| 10 | Task Baseline Cost |
| 11 | Task Percent Complete |
| 16 | Assignment Baseline 1 Work |
| 17 | Assignment Baseline 1 Cost |
| 18 | Task Baseline 1 Work |
| 19 | Task Baseline 1 Cost |
| 20 | Resource Baseline 1 Work |
| 21 | Resource Baseline 1 Cost |
| 22 | Assignment Baseline 2 Work |
| 23 | Assignment Baseline 2 Cost |
| 24 | Task Baseline 2 Work |
| 25 | Task Baseline 2 Cost |
| 26 | Resource Baseline 2 Work |
| 27 | Resource Baseline 2 Cost |
| 28 | Assignment Baseline 3 Work |
| 29 | Assignment Baseline 3 Cost |
| 30 | Task Baseline 3 Work |
| 31 | Task Baseline 3 Cost |
| 32 | Resource Baseline 3 Work |
| 33 | Resource Baseline 3 Cost |
| 34 | Assignment Baseline 4 Work |
| 35 | Assignment Baseline 4 Cost |
| 36 | Task Baseline 4 Work |
| 37 | Task Baseline 4 Cost |
| 38 | Resource Baseline 4 Work |
| 39 | Resource Baseline 4 Cost |
| 40 | Assignment Baseline 5 Work |
| 41 | Assignment Baseline 5 Cost |
| 42 | Task Baseline 5 Work |
| 43 | Task Baseline 5 Cost |
| 44 | Resource Baseline 5 Work |
| 45 | Resource Baseline 5 Cost |
| 46 | Assignment Baseline 6 Work |
| 47 | Assignment Baseline 6 Cost |
| 48 | Task Baseline 6 Work |
| 49 | Task Baseline 6 Cost |
| 50 | Resource Baseline 6 Work |
| 51 | Resource Baseline 6 Cost |
| 52 | Assignment Baseline 7 Work |
| 53 | Assignment Baseline 7 Cost |
| 54 | Task Baseline 7 Work |
| 55 | Task Baseline 7 Cost |
| 56 | Resource Baseline 7 Work |
| 57 | Resource Baseline 7 Cost |
| 58 | Assignment Baseline 8 Work |
| 59 | Assignment Baseline 8 Cost |
| 60 | Task Baseline 8 Work |
| 61 | Task Baseline 8 Cost |
| 62 | Resource Baseline 8 Work |
| 63 | Resource Baseline 8 Cost |
| 64 | Assignment Baseline 9 Work |
| 65 | Assignment Baseline 9 Cost |
| 66 | Task Baseline 9 Work |
| 67 | Task Baseline 9 Cost |
| 68 | Resource Baseline 9 Work |
| 69 | Resource Baseline 9 Cost |
| 70 | Assignment Baseline 10 Work |
| 71 | Assignment Baseline 10 Cost |
| 72 | Task Baseline 10 Work |
| 73 | Task Baseline 10 Cost |
| 74 | Resource Baseline 10 Work |
| 75 | Resource Baseline 10 Cost |
| 76 | Physical Percent Complete |

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