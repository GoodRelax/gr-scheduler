---
type: Reference
title: MSPDI 実装の落とし穴（XSD 実測ベース）
description: MSPDI を読み書きするときに素直に実装すると必ず踏む罠の一覧。製品に依存しない。
resource: mspdi/mspdi_pj12.xsd
tags: [mspdi]
phase: survey
status: stable
---
# MSPDI 実装の落とし穴（XSD 実測ベース）

- 日付: 2026-07-26
- 正本: `mspdi/mspdi_pj12.xsd`（Microsoft Office Project 2007 XML Data Interchange Schema・全 3906 行）
- **位置づけ**: MSPDI を読み書きするツールを作るとき、**素直に実装すると必ず踏む罠**の一覧。本書の記述はすべて **XSD の機械パースと敵対的レビュー 2 巡で検証済みの事実**であり、要約からの推測を含まない。
- **なぜ独立文書か**: これらは **どんなツールを作るかに依存しない知識**である。特定製品の設計判断（何を採用し何を捨てるか）と混ぜると、方針を変えた時に一緒に捨てられてしまう。再取得コストが高い（XSD 全走査＋実装を想定した反証が必要）ため、単独で残す。
- 関連: `mspdi-core-tree.md`（構造の概観）/ `mspdi-tables.md`（全 29 テーブルの責務）/ `../_assets/grs-mspdi-field-ledger-ja.md`（ある製品での取捨選択の実例）

---

## 0. 最初に知るべき数値（XSD 機械実測）

| 項目 | 実測値 |
|---|---|
| 総行数 / ユニーク要素名 | 3906 行 / **499** |
| named complexType | **`TimephasedDataType` の 1 つだけ**（他は全て inline 定義） |
| **`xsd:unique` / `xsd:key` / `xsd:keyref`** | **0 件**（後述の罠 A-1 の原因） |
| Project 直下スカラー | **63**（うち必須は 2 つだけ・罠 B-2） |
| Task | 91 スカラー ＋ 子要素 5 |
| Resource | 65 スカラー ＋ 子要素 6 |
| Assignment | 61 スカラー ＋ **201 の空予約枠** ＋ 子要素 3 |
| エンティティ（テーブル）総数 | 29（中核 6 ＋ 衛星 23） |

---

## A. 識別子の罠

### A-1. スキーマに一意性制約が 1 つも無い ⇒ 「自然キーで一意」は成り立たない

**事実**: XSD 全体に `xsd:unique` / `xsd:key` / `xsd:keyref` は **0 件**。

**何が起きるか**: 「同じ意味の行は 1 つしか無いはず」という前提の設計が壊れる。典型例が依存関係:

```xml
<!-- 完全にスキーマ妥当。読み手が (後続,先行) を一意キーにすると 2 本目が消える -->
<Task><UID>7</UID>
  <PredecessorLink><PredecessorUID>3</PredecessorUID><Type>1</Type><LinkLag>0</LinkLag></PredecessorLink>
  <PredecessorLink><PredecessorUID>3</PredecessorUID><Type>1</Type><LinkLag>144000</LinkLag></PredecessorLink>
</Task>
```

`PredecessorLink` は `maxOccurs="unbounded"`。**同一ペア・同一 Type の重複すら妥当**である。

**対処**: 主要な入力元は第三者が生成した MSPDI である。「意味的に無意味だから来ない」という推測に頼らず、**重複を検出したら捨てずに退避する**（原形保持して書き戻す）設計にする。

### A-2. `Project.UID` は GUID ではない。しかも省略可

**事実**（XSD 238-246 行）:

```xml
<xsd:element name="UID" minOccurs="0">
  <xsd:simpleType><xsd:restriction base="xsd:string">
    <xsd:maxLength value="16" />
  </xsd:restriction></xsd:simpleType>
</xsd:element>
```

**何が起きるか**: `maxLength=16` は GUID（36 文字、ハイフン無しでも 32 文字）を**格納できない**。さらに `minOccurs=0` なので**存在しないファイルがある**。「プロジェクトの同一性を `Project.UID` で判定する」設計は、**判定不能なケースを常に持つ**。

**対処**: 同一性判定を `Project.UID` だけに依存させない。省略時のフォールバック（読み手側で取込セッション ID を発番する等）と、「同一性不明」という**第 3 の状態**を用意する。

### A-3. `ID` と `UID` は別物

**事実**: `ID` は「タスク一覧内の位置識別子」（表示行番号・**並べ替えで変わる**）、`UID` は不変の参照キー。参照（`PredecessorUID` / `TaskUID` / `ResourceUID` / `CalendarUID`）は**すべて UID を指す**。

**対処**: `ID` を保存・参照に使わない。export では順序から再生成する。

### A-4. `TimephasedData.UID` は自己識別であって親の UID ではない

**事実**: `TimephasedDataType` 内の `UID` は `type="xsd:integer"` で **必須**（`minOccurs` 指定なし）。documentation は "The unique identifier of the timephased data **record**"。

**何が起きるか**: 「Carry（不透明保持）の中に UID があるから、UID を振り直したら壊れる」と誤解しやすい。実際は自己識別なので**振り直しの影響を受けない**。ただし **2 つの文書のデータを併合すると番号が衝突**する。

**対処**: 時系列データを不透明保持する場合、**所有エンティティの下にぶら下げて保持**する（グローバルな索引を作らない）。

### A-5. `PredecessorLink` には ID が無い（弱エンティティ）

**事実**: 子要素は `PredecessorUID` / `Type` / `CrossProject` / `CrossProjectName` / `LinkLag` / `LagFormat` の **6 つのみ**。リンク自身の識別子は存在しない。

**対処**: 依存を独立エンティティとして扱うなら、**読み手側で識別子を決める**必要がある（親 Task ＋ 出現順、または (後続, 先行, 種別) の組）。A-1 により後者だけでは重複を排除できない点に注意。

### A-6. `Ltuid` — 大文字 `UID` だけを grep すると取りこぼす

**事実**: `ExtendedAttribute` の子に **`Ltuid`**（lookup table の GUID・XSD 1075 行）がある。他にも `AssnOwnerGuid` / `ActiveDirectoryGUID` / `FieldGUID` / `ValueGUID` / `SecondaryPID` / `DefaultGuid` / `ParentValueID` など、**他要素を指す参照は `UID` という名前とは限らない**。

**対処**: 参照フィールドの棚卸しは `UID` だけでなく `uid|guid|id|owner|pid` を**大文字小文字を無視して**走査する。

---

## B. カード（省略可能性）の罠

### B-1. ほぼ全てのフィールドが `minOccurs="0"`

**事実**: 8 つの主要テーブルで必須なのは `Task/UID` `Calendar/UID` `Resource/UID` `Assignment/UID` `WeekDay/DayType`、および Project の 2 つ（B-2）だけ。**残りは全て省略可**。

**何が起きるか（重要）**: 「値が無い」と「既定値」を区別できない実装は、**往復で差分が出る**。

```
元ファイルに <PercentComplete> が無い
  → 0 として読む → export で <PercentComplete>0</PercentComplete> を出力
  → 原ファイルに無い要素が増える（差分ゼロにならない）

逆に「0 なら書かない」とすると
  → 明示的に 0 が書かれていたファイルで要素が消える
```

**対処**: 各フィールドを **nullable** にし、`null` = 「元ファイルに要素が無かった」を保持する。export は `null` なら要素を書かない。**往復同一性テストを書くなら、この設計が前提条件**になる。

### B-2. Project 直下の必須要素は `SaveVersion` と `CurrencyCode` の 2 つだけ

**事実**: Project 直下 63 スカラーのうち `minOccurs` 指定が無い（＝必須）のはこの 2 つ。

**何が起きるか**: MSPDI を読み込まずに**ゼロから作った文書**を export すると、この 2 つの供給源が無く、**XSD 非妥当な XML** を出力する。コスト管理をしないツールは `CurrencyCode` を捨てがちなので特に踏みやすい。

**対処**: 両者に既定値（`SaveVersion=12` 等）を用意し、export 時に必ず焼き込む。

### B-3. `Assignment.TaskUID` / `ResourceUID` は省略可。`-1`=未割当 は XSD に無い

**事実**: 両者とも `xsd:integer minOccurs="0"`。documentation は "The unique identifier of the task/resource" のみで、**`-1` の特別扱いはスキーマのどこにも書かれていない**（MS Project の慣行）。

**何が起きるか**: 割当を「タスク×資源の交差表」として必須参照でモデル化すると、**参照が欠けた行で破綻**する。

**対処**: 参照を任意（nullable）として扱い、欠落行は構造化せず原形保持する。`-1` は境界（パーサ/シリアライザ）で `null` に正規化し、内部にマジックナンバーを持ち込まない。

### B-4. `PredecessorUID` と `Type` も省略可

**事実**: 依存リンクの中核 2 フィールドすら `minOccurs="0"`。

**何が起きるか**: (後続, 先行, 種別) を主キーにすると、**キー成分に null が入る**。

**対処**: `Type` 欠落は FS(=1) に正規化しつつ「欠落だった事実」を別に保持する。`PredecessorUID` 欠落リンクは構造化せず原形保持する。

---

## C. 意味解釈の罠

### C-1. `Exception.TimePeriod` は `Type` と組で読む — 単独で読むと祝日 1 日が数年間の休みになる

**事実**:
- `TimePeriod` の documentation: "Defines a **contiguous set of exception days**"
- `Occurrences`: "The number of occurrences for which the calendar exception is **valid**"
- `Type`: 1=Daily, 2=Yearly by day of the month, 3=Yearly by position, 4=Monthly by day, 5=Monthly by position, 6=Weekly, 7=By day count, 8=By weekday count, **9=No exception type**

**何が起きるか（実害が大きい）**: 繰り返しがある場合、`TimePeriod` は「その 1 回」ではなく**繰り返しの適用範囲**を表す。

```
元日を Type=2（毎年・日付指定）, From=2020-01-01, To=2030-12-31, Occurrences=11 と書いたファイル

  Type を読まずに TimePeriod をそのまま非稼働レンジとして扱うと
  → 「2020〜2030 の 11 年間が非稼働」と解釈される → 全期間が休日になる
```

**対処**: `Type` を**必ず読む**。欠落または `9`（No exception type）のときだけ `TimePeriod` を実日付として扱い、`1`〜`8` は繰り返し展開器を通すか、対応しないなら**その例外を描画に使わない**（原形は保持）。

### C-2. カレンダーの例外日には 2 系統ある

**事実**:

| 系統 | 表現 | 世代 |
|---|---|---|
| ① | `WeekDays/WeekDay` の **`DayType=0`（Exception）＋ `TimePeriod`** | Project 2003 系 |
| ② | `Exceptions/Exception`（`Name` / `TimePeriod` / `DayWorking` ＋ 繰返しルール） | Project 2007 系 |

`WeekDay/TimePeriod` の documentation も "Defines a contiguous set of exception days" であり、①は正真正銘の例外日表現である。

**何が起きるか**: ②だけを実装すると、①で書かれたファイルの**祝日が丸ごと落ちる**。`DayType` の enum を「0=例外」込みで読みながら `TimePeriod` を読み飛ばすと、「例外日であることは分かるが、いつなのか分からない」という状態になる。

**対処**: 両系統を読んで「非稼働日の集合」に正規化する。片方しか実装しないなら、もう一方は**原形保持**して書き戻す。

### C-3. 階層に親ポインタが無い（`OutlineLevel` ＋ 文書順の暗黙表現）

**事実**: Task に親を指すフィールドは無い。階層は `OutlineLevel`（深さ）と**要素の出現順**から復元する。`Summary` は「子を持つ」印。

**何が起きるか**: 出力順を変えると、`OutlineLevel` が同じでも**親が変わる**。「レベルだけ復元して順序を変える」実装は静かに構造を壊す。

**対処**: 階層を親ポインタに変換して保持し、export では木を深さ優先で辿って `OutlineLevel` と順序を**同時に**再生成する。異常系（先頭が 1 でない・前行 +2 以上の飛び・`OutlineLevel` 欠落）の復元規則も決めておく。

### C-4. マイルストーンに専用要素は無い

**事実**: `Milestone`（bool）フラグのみ。慣習として `Duration=0` だが、`Duration>0` でも `Milestone=1` にできる（**フラグが優先**）。

### C-5. `Stop` / `Resume` は「開始/終了」ではなく「中断/再開」

**事実**: `Start`（タスクの開始）と `Stop`（進行中タスクが止まった日時）は**別物**。しかもこの 1 組は**中断 1 回分**しか表せない。連続した複数中断の正確な形は `TimephasedData`（作業量ゼロの区間）が持つ。

### C-6. `Resource.Type` だけでは資源の種別が分からない

**事実**: `Type` は enum{0=Material, 1=Work} の 2 値のみ。**コスト資源は `IsCostResource`（bool）という別フィールド**で表現される。

**何が起きるか**: 「`Type=1` なら人」という判定は、コスト資源を人として扱ってしまう。

---

## D. 命名・型の罠

### D-1. 葉要素名が親を跨いで重複する

**事実**: `WeekDay` / `Exception` / `Value` / `Mask` / `Baseline` / `OutlineCode` / `ExtendedAttribute` / `TimePeriod` は、**複数の親の下に別の意味で出現**する。

| 要素名 | 出現場所（XSD 行） |
|---|---|
| `WeekDay` | Calendar/WeekDays 配下（1241）、WorkWeek 配下（1553・**子の構成が違う**） |
| `Exception` | Calendar/Exceptions 配下（1331） |
| `Value` | OutlineCode/Values（775）、ExtendedAttribute/ValueList（1157） |
| `Baseline` | Task 下（2307）、Resource 下（2971）、Assignment 下（3640）— **型が違う（D-2）** |
| `OutlineCode` | Project 下の定義（736）、Task 下の値（2413）、Resource 下の値（3005） |
| `ExtendedAttribute` | Project 下の定義（986）、Task/Resource/Assignment 下の値（2248/2912/3581） |

**対処**: 要素は必ず**親パスで識別**する。名前だけの表・マップを作らない。図に描くときは親付きの別名を使い、実名との対応表を必ず添える。

### D-2. 同名要素で型が違う — `Baseline/Number`

**事実**:

```
Task/Baseline/Number        xsd:integer  minOccurs=0
Resource/Baseline/Number    xsd:integer  minOccurs=1
Assignment/Baseline/Number  xsd:string   minOccurs=1   ← 型も必須性も違う
```

**対処**: 型付き言語で共通の Baseline 型を作ると Assignment で必ず壊れる。3 つは別物として扱う。

### D-3. `ValueGUID` は名前に反して整数

**事実**: `ExtendedAttribute/ValueGUID` は `type="xsd:integer"`（XSD 2264 / 2928 / 3597）。一方 `OutlineCode/Values/Value/FieldGUID` は `xsd:string`。documentation は「ValueGUID matches the FieldGUID」と書いているが、**型が一致しない**。

### D-4. `WorkingTimes` は 2 箇所にしか無い

**事実**: `WorkingTimes` の出現は **`WeekDay`（1288）と `Exception`（1468）の 2 箇所のみ**。`WorkWeek` 配下の `WeekDay` の子は **`DayType` と `DayWorking` の 2 つだけ**で、勤務時刻を持たない。

**対処**: 「WeekDay なら WorkingTimes を持つ」と一般化しない。

### D-5. enum は整数コード。`DurationFormat` は約 30 種

**事実**: 依存種別は `<Type>1</Type>`（FS）のように**数値**で入る。`DurationFormat` / `LagFormat` は約 20〜30 の値を持ち、末尾に「推定」を示す変種がある。

**対処**: enum を実装する前に XSD の `xsd:enumeration` を全数列挙する。要約文書の抜粋を信用しない。

### D-6. `Assignment` に 201 個の空予約枠

**事実**: `f404000` 〜 `f4040c8` の **201 要素**（XSD 3691-3891）。すべて空・`minOccurs=0`・個別の意味は無い（enterprise カスタムフィールドの予約）。

**対処**: フィールド数を数えるときに紛れ込むので、集計時は明示的に分離する。

---

## E. 実装方針への含意

### E-1. 「読まない」と「捨てる」は別

使わないフィールドでも、**原形を保持して書き戻せば往復で失われない**。逆に「保持する」と宣言しても、**格納先（キー・粒度・順序）を設計しなければ実質的に捨てている**のと同じ。弱エンティティ（`WeekDay` / `Exception` / `WorkingTime` / `PredecessorLink`）は識別子を持たないため、保持するには「**親 ＋ 出現順**」を自前で付ける必要がある。

### E-2. 往復の同一性を主張するなら、先に決めるべき 4 点

1. **キー**: 中核は UID、弱エンティティは (親UID, 出現序数)
2. **粒度**: フィールド単位か、要素まるごとか（構造化しない要素は後者）
3. **順序**: 再生成した分と保持した分をどう混ぜるか
4. **`null` と既定値の区別**（B-1）— これが無いと差分ゼロは原理的に達成できない

### E-3. MSPDI に無いもの

- **描画情報**（バーの色・形・行の高さ・折り畳み・ズーム）。Bar Styles はビュー定義でファイル外。
- **1 行に複数の独立タスクを横並べする概念**。1 タスク = 1 行 = 1 主バーが大原則。
- **依存線の幾何**（どこから出てどこで曲がるか）。あるのは「後続 → 先行の参照」だけ。

これらを扱うツールは、**その情報を自前で定義して自分の形式で持つ**しかない（MSPDI に書いても復元されない）。

---

## 検証方法（再現手順）

本書の主張はすべて次の方法で確認できる。要約文書ではなく **XSD を直接引く**こと。

```bash
# 要素名と型
grep -oE '<xsd:element name="[A-Za-z0-9_]+"( type="[^"]+")?' mspdi_pj12.xsd

# 一意性制約の不在
grep -cE '<xsd:(unique|key|keyref)' mspdi_pj12.xsd     # → 0

# 必須要素（minOccurs 指定が無いもの）
grep -E '<xsd:element name="[A-Za-z]+"( type="[^"]*")?>$' mspdi_pj12.xsd

# 参照フィールドの棚卸し（大文字小文字を無視）
grep -inE 'name="[A-Za-z0-9_]*(uid|guid|id|owner|pid)"' mspdi_pj12.xsd

# 特定要素の定義とドキュメント
awk 'NR>=1331 && NR<=1420' mspdi_pj12.xsd | grep -E 'name=|documentation'
```

---

*出典: `mspdi/mspdi_pj12.xsd`（Microsoft Office Project 2007 XML Data Interchange Schema, © 2007 Microsoft Corp.）の機械パースと実装観点の検証による。スキーマの正本は原 `.xsd`。*
