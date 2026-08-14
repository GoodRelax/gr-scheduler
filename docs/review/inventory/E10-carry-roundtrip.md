# E10 — Carry containers + roundtrip

## 0. 読んだ原典

| 原典 | 行数（自分で数えた） | 読んだ範囲 |
| --- | --- | --- |
| `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 行（`wc -l`。末尾行を 1 行と数える道具では 1828） | **全文**（§5.5d は逐語・§5.5f・§8D・§3 の除外欄・§7・§8A/§8B/§8F/§8I を含む） |
| `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 行（`wc -l`） | **全文** |
| `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 行 | MSPDI の事実の検証用（該当ブロックを実測。§10 に検証結果） |
| `docs/spec/_assets/tbl-glossary.md` | 259 行 | 命名の突き合わせ用（全文） |

**出典の表記**: `ファイル名:行番号`。ファイル名は上表の basename を使う。

**この文書の守備範囲**: **解釈しないが往復のために保持するもの（`Carry`）の器**と、**往復ゼロ差分の仕掛け**だけを持つ。
ネイティブ列そのもの（`Task` / `Project` / `Calendar` / `Resource` / `Assignment` の Own・Consume 列）は E10 の担当ではない。

---

## 1. `Carry` は 2 種類ある（§5.5d-1）

**規則表 R-1**（フィールドの表ではない）

| 種類 | 対象 | 器 | 例 | 出典 |
| --- | --- | --- | --- | --- |
| **フィールド単位** | **ネイティブ行が存在する**要素。その一部の列だけ解釈した残り | 所有エンティティの `carry: { フィールド名: 文字列値 }` | `Task` のコスト / EVM / 平準化列 | grs-native-erd-ja.md:699 |
| **要素まるごと** | **ネイティブ行を作らない**要素 | 親の `carry_elements: [ { name, ordinal, fields, children } ]` | `IsNull=1` の `Task`/`Resource`（欠番行）／`DayType=0` の `WeekDay`／重複した依存リンク／`CrossProject` リンク／`TaskUID` 欠落 `Assignment`／断捨離した 21 テーブル | grs-native-erd-ja.md:700 |

- **XML 文字列としては保存しない**。要素を **JSON の再帰構造**で表現する（読める・差分が取れる。解釈しないだけ）。出典 grs-native-erd-ja.md:702, :682
- 採用案は **D＝「エンティティ別 carry バッグ ＋ 入口/出口の検査」**。A（影文書＝原 XML 丸ごと）は**マージで破綻**し JSON が不透明になるため却下、B（バッグのみ）は**入れ忘れで漏れる**（実際 `WeekDay.TimePeriod` で発生）、C（グローバルなパス→値表）は B の欠点だけ継ぐ。出典 grs-native-erd-ja.md:688-693, :1820
- 断捨離（29→8 テーブル）と分類は別概念。**構造化しない要素も Carry で温存するので捨てていない**。出典 grs-mspdi-field-ledger-ja.md:96
- **21 テーブル**＝ MSPDI 全 29 テーブル − ネイティブ採用 8（`Project`/`Task`/`PredecessorLink`/`Calendar`/`WeekDay`/`Exception`/`Resource`/`Assignment`）。自分で数えた（grs-mspdi-field-ledger-ja.md:314 の 29 と :388 の 8 から 29−8=21）。

---

## 2. 器そのもののフィールド

**表 E10-1 — Carry の器（6 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `carry` | `map<string, string>`（キー＝MSPDI 要素名 / 値＝原テキスト） | **未検証**（空のとき `{}` か `null` か原典に無い） | — | — | `GRS`（器。中身は `Carry`） | —（器に当たる要素は無い。キーが要素名を写す） | **未検証**（「新規作成した行は Carry を持たない」とだけある） | ネイティブ行が在る要素の**解釈しなかったスカラー**を入れる。XML 文字列では持たない。export でそのまま書き戻す。⚠️ **Carry は「書き戻すだけ」であって「読まない」ではない** — `Task/DurationFormat` は export で `xsd:duration` を整形するときだけ読む | grs-native-erd-ja.md:699, :702, :626, :1535 |
| `carry_elements` **要改名 → `carryElements`** | `array<CarryElement>` | **未検証** | — | — | `GRS`（器） | —（配列の各要素が MSPDI 要素 1 個を写す） | **未検証** | ネイティブ行を作らない要素を**親に**付ける。入口の検査に落ちた要素の退避先でもある。**snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけなので本名は規約違反** | grs-native-erd-ja.md:700, :747 |
| `carryElements[].name` | `string` | 不可（**導出**。原典に明記なし） | — | — | `Carry` | 当該要素の **XSD 実名** | — | 葉要素名は親を跨いで重複するので、**親のパスと組でしか意味が決まらない**。表示別名（`Calendar_WeekDay` 等）を書かない | grs-native-erd-ja.md:700 / grs-mspdi-field-ledger-ja.md:605-630 |
| `carryElements[].ordinal` | `int` | 可（新規追加行は `null`） | **複合キーの一部**（親＋出現序数） | 親のキー（`Project`/`Task`/`Calendar`/`Resource`/`Assignment` は UID、弱エンティティは親＋`ordinal`） | `GRS` | —（MSPDI に序数の要素は無い。順序は**文書順**が持つ） | `0` 起点（import 時にコレクション内の出現順で採番） | **ネイティブ行と同じ番号空間**で振る。export は `ordinal` 順に出力して原順序を復元する | grs-native-erd-ja.md:709, :711, :715-716 |
| `carryElements[].fields` **要改名（要判断）** | `map<string, string>` | **未検証** | — | — | `Carry` | その要素の葉要素（名 → テキスト） | **未検証** | 解釈しない。⚠️ `fields` は `data`/`info` に近い汎用語である。`leafValues` などへの改名を次期で判断すること | grs-native-erd-ja.md:700 |
| `carryElements[].children` | `array<CarryElement>` | **未検証** | — | — | `Carry` | 入れ子の子要素（例 `WorkingTimes/WorkingTime`） | **未検証** | 再帰構造。**入れ子の深さの上限は原典に無い（未検証）** | grs-native-erd-ja.md:700 |

> `carry` のキーに `Type` や `Value` が現れるのは MSPDI の**要素名（データ）**であって GRS の識別子ではない。汎用語の禁止（`type`/`data`/`info`/`value`）は**識別子**に掛かる規約なので、ここを改名してはならない。改名すると往復が壊れる。出典 grs-native-erd-ja.md:771

---

## 3. 器をどのエンティティに置くか

**表 E10-2 — 器の設置（MSPDI 由来 8 エンティティ × 2 種＝16 行）**

⚠️ **`Dependency` / `WeekDay` / `Exception` には器が無い。新設が要る。** ERD §5.2（grs-native-erd-ja.md:273-309）の 3 エンティティに `carry` / `carry_elements` の列が無く、`Carry` は ERD から意図的に除外されている（同 :20, :117）。器の必要は §5.5d と ledger §7 の除外欄から導かれる。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Project.carry` | `map<string,string>` | 未検証 | — | — | `GRS`（器） | `Project` 直下スカラー **42**（通貨3 / 既定タスク・レート・書式9 / 計算オプション10 / Move4 / EV2 / 会計3 / 既定時刻・新規開始3 / MS 内部2 / `ScheduleFromStart` / `CurrentDate` / サーバ管理4） | 未検証 | 直下スカラーは **63**（自分で数えた: XSD の `Project` 直下 70 子要素 − コレクション 7）。内訳は Own 17 / Consume 1 / Reconstruct 3 / **Carry 42**（17+1+3+42=63・自分で検算） | grs-mspdi-field-ledger-ja.md:512, :527-528 / mspdi_pj12.xsd:225-3905 |
| `Project.carry_elements` | `array<CarryElement>` | 未検証 | — | — | `GRS`（器） | `OutlineCodes` / `WBSMasks` / `ExtendedAttributes`（**GRS 枠以外**の定義） | 未検証 | ⚠️ **`IsNull=1` の `Task`/`Resource` の落とし先は「親」だが、親はコレクション（`Tasks`/`Resources`）で `Project` 直下である → `Project.carry_elements` に付く（本表の導出。原典に明記なし）** | grs-mspdi-field-ledger-ja.md:396-397, :411, :574 / grs-native-erd-ja.md:700 |
| `Task.carry` | `map<string,string>` | 未検証 | — | — | `GRS`（器） | `Task` 91 スカラーのうち **72**（自分で数えた: 91 − Own 14 − Consume 2 − Reconstruct 3）。`Duration`（未編集）/ `RemainingDuration` / `DurationFormat` / `Estimated` / 制約 / 工数 / コスト / EVM / CPM 派生 / 平準化 / サブ PJ / enterprise / 補助 | 未検証 | XSD 実測: `Task` 直下 96 子要素 − 子要素 5（`PredecessorLink`/`ExtendedAttribute`/`Baseline`/`OutlineCode`/`TimephasedData`）＝ 91 スカラー。⚠️ `RemainingDuration` は **完了時だけ GRS が `0` を書く**（唯一の Carry 例外）。⚠️ `Duration` は**未編集＝Carry / 編集済＝Reconstruct** | grs-mspdi-field-ledger-ja.md:431, :457, :636 / grs-native-erd-ja.md:96 / mspdi_pj12.xsd:1604 |
| `Task.carry_elements` | `array<CarryElement>` | 未検証 | — | — | `GRS`（器） | `ExtendedAttribute`（GRS 枠以外）/ `Baseline`(0..10) / `OutlineCode` / `TimephasedData` / **2 本目以降の `PredecessorLink`** / `PredecessorUID` 欠落・`CrossProject=1` の `PredecessorLink` | 未検証 | 依存の異常系はすべてここへ退避する（複合 PK を保ったまま損失ゼロにする） | grs-mspdi-field-ledger-ja.md:490-494 / grs-native-erd-ja.md:1554-1559 |
| `Dependency.carry` **新設が要る** | `map<string,string>` | 未検証 | — | — | `GRS`（器） | `CrossProject` / `CrossProjectName`、および **`Type` が欠落だった事実の原形**（FS=1 へ正規化する前） | 未検証 | ⚠️ **原典に器が無い**（ERD §5.2 の `Dependency` に列が無い）。`Type` 欠落の原形保持は grs-native-erd-ja.md:1557 が要求しているので、置き場が要る | grs-mspdi-field-ledger-ja.md:506 / grs-native-erd-ja.md:1557, :276-279 |
| `Dependency.carry_elements` | — | — | — | — | — | — | — | **不要**。`PredecessorLink` の子は XSD 実測 6 つで**全て葉**（`PredecessorUID`/`Type`/`CrossProject`/`CrossProjectName`/`LinkLag`/`LagFormat`）。入れ子が無い | mspdi_pj12.xsd:2162-2230 / grs-native-erd-ja.md:358 |
| `Calendar.carry` | `map<string,string>` | 未検証 | — | — | `GRS`（器） | **今日は空**（XSD 実測: `Calendar` 直下スカラーは `UID`/`Name`/`IsBaseCalendar`/`BaseCalendarUID` の 4 つで全てネイティブ） | 未検証 | 未知要素・将来の MS 拡張の受け皿として要る（**導出**。器が無いと未知スカラー 1 個で `Calendar` 行まるごと退避になる） | mspdi_pj12.xsd:1204-1210 / grs-mspdi-field-ledger-ja.md:547-550 |
| `Calendar.carry_elements` | `array<CarryElement>` | 未検証 | — | — | `GRS`（器） | `WorkWeeks/WorkWeek` 一式 / **`DayType=0` の `WeekDay`**（Project 2003 形式）/ **`Type` 1〜8（繰返し）の `Exception`** | 未検証 | 繰返し祝日は MVP 非対応で、要素まるごと Carry ＋警告を出す | grs-native-erd-ja.md:643, :663, :1587 / grs-mspdi-field-ledger-ja.md:553, :559 |
| `WeekDay.carry` **新設が要る** | `map<string,string>` | 未検証 | 親（`Calendar.id`）＋ `ordinal` に従属 | `Calendar.id` | `GRS`（器） | `TimePeriod`(`FromDate`/`ToDate`) | 未検証 | ⚠️ **原典に器が無い**。`DayType` 1〜7 のネイティブ行にも `TimePeriod` は付きうる（XSD 実測 `minOccurs=0`）ので、フィールド単位の器が要る | mspdi_pj12.xsd:1241-1330 / grs-mspdi-field-ledger-ja.md:553 |
| `WeekDay.carry_elements` **新設が要る** | `array<CarryElement>` | 未検証 | 同上 | `Calendar.id` | `GRS`（器） | `WorkingTimes/WorkingTime`（XSD 実測 **0..5**） | 未検証 | ⚠️ **原典に器が無い**。勤務時刻は日粒度で不使用のため Carry | mspdi_pj12.xsd:1295 / grs-mspdi-field-ledger-ja.md:557 |
| `Exception.carry` **新設が要る** | `map<string,string>` | 未検証 | 親（`Calendar.id`）＋ `ordinal` に従属 | `Calendar.id` | `GRS`（器） | 繰返し詳細 **8**（`EnteredByOccurrences` / `Occurrences` / `Period` / `DaysOfWeek` / `MonthItem` / `MonthPosition` / `Month` / `MonthDay`） | 未検証 | ⚠️ **原典に器が無い**。⚠️ **`Exception.Type` の置き場が無い** — Consume に格上げされたのにネイティブ列が無く Reconstruct の一覧にも無い（→ 未解決 U-3） | mspdi_pj12.xsd:1331-1470 / grs-mspdi-field-ledger-ja.md:558-559 / grs-native-erd-ja.md:303-309 |
| `Exception.carry_elements` **新設が要る** | `array<CarryElement>` | 未検証 | 同上 | `Calendar.id` | `GRS`（器） | `WorkingTimes/WorkingTime`（XSD 実測 0..5） | 未検証 | ⚠️ **原典に器が無い** | mspdi_pj12.xsd:1475 / grs-mspdi-field-ledger-ja.md:557 |
| `Resource.carry` | `map<string,string>` | 未検証 | — | — | `GRS`（器） | 残り **59** スカラー（自分で数えた: XSD 71 子要素 − 子要素 6 ＝ 65 スカラー、− ネイティブ 5 − Reconstruct `ID` 1）。識別/属性・稼働・工数・コスト・EVM・メモ・enterprise | 未検証 | `IsNull=1` は**要素まるごと**の引き金なのでここには入らない | mspdi_pj12.xsd:2492-2498 / grs-mspdi-field-ledger-ja.md:566-582 |
| `Resource.carry_elements` | `array<CarryElement>` | 未検証 | — | — | `GRS`（器） | `ExtendedAttribute` / `Baseline` / `OutlineCode` / `AvailabilityPeriods` / `Rates` / `TimephasedData`（XSD 実測 子要素 **6**） | 未検証 | `Rate` は最大 25、`AvailabilityPeriod` は無制限 | mspdi_pj12.xsd:2492-3190 / grs-mspdi-field-ledger-ja.md:582 |
| `Assignment.carry` | `map<string,string>` | 未検証 | — | — | `GRS`（器） | **259**（自分で数えた: 61 スカラー − ネイティブ 3 ＝ 58、＋ **予約枠 201**）。`Units` / 工数 / コスト / EVM / 日程 / フラグ | 未検証 | ⚠️ **予約枠 `f404000`〜`f4040c8`（201 個）は XSD で型が無い＝`xsd:anyType`** なので、**子要素を持ちうる**。「全て空」は XSD からは言えない（未検証）→ 文字列 1 個の器では表せない場合がある（→ 未解決 U-6） | mspdi_pj12.xsd:3191, :3691 / grs-mspdi-field-ledger-ja.md:593-596 |
| `Assignment.carry_elements` | `array<CarryElement>` | 未検証 | — | — | `GRS`（器） | `ExtendedAttribute` / `Baseline` / `TimephasedData`（XSD 実測 子要素 **3**） | 未検証 | `TaskUID` 欠落の `Assignment` は**要素まるごと**なので親（`Project`）側へ | mspdi_pj12.xsd:3191-3905 / grs-mspdi-field-ledger-ja.md:591, :597 |

**規則表 R-2 — 器を持たないエンティティ（GRS 新設・MSPDI に対応が無い）**

| エンティティ | 器 | 理由 | 出典 |
| --- | --- | --- | --- |
| `TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` | **持たない** | MSPDI に対応が無い GRS 新設で**非 export**。往復する原要素が存在しない | grs-native-erd-ja.md:1494 |
| `Comment` / `HighlightBox` | **持たない** | MSPDI へ書かない（対応概念が無い） | grs-native-erd-ja.md:1407, :1469 |
| `documentSettings` | **持たない** | GRS の JSON だけで持ち MSPDI へ渡さない | grs-native-erd-ja.md:1369-1371 |

---

## 4. キー ——「親＋出現序数」（弱エンティティ）

**規則表 R-3**

| 対象 | キー | 出典 |
| --- | --- | --- |
| UID を持つ中核（`Project` / `Task` / `Calendar` / `Resource` / `Assignment`） | **UID** | grs-native-erd-ja.md:708 |
| **識別子を持たない要素**（`WeekDay` / `Exception` / `WorkingTime` / `PredecessorLink` / `Baseline` / `Rate` / `AvailabilityPeriod` / `TimephasedData` / 各種 `Value`） | **(親のキー, `ordinal`)** | grs-native-erd-ja.md:709 |

- **`ordinal` 列を弱エンティティのネイティブ行にも持たせる**。import 時に、そのコレクション内の出現順で **0 起点**採番する。出典 grs-native-erd-ja.md:711
- MSPDI の XSD には **`xsd:unique` / `key` / `keyref` が 1 件も無い**（自分で数えた: 0 件）。したがって重複要素は妥当であり、序数以外に同定手段が無い。出典 mspdi_pj12.xsd（機械カウント）/ grs-native-erd-ja.md:1556

**表 E10-3 — `ordinal`（弱エンティティの付着キー・3 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WeekDay.ordinal` | `int` | 可（GRS が新規に作った行は `null`） | **PK の一部**（`Calendar.id` ＋ `ordinal`） | `Calendar.id` | `GRS` | —（MSPDI は文書順で表す） | `0` 起点 | Carry の付着キー。`Calendar/WeekDays` 内の**全要素**（ネイティブ行も要素まるごと Carry も）に同一番号空間で振る | grs-native-erd-ja.md:299, :359, :709, :715 |
| `Exception.ordinal` | `int` | 可 | **PK の一部**（`Calendar.id` ＋ `ordinal`） | `Calendar.id` | `GRS` | — | `0` 起点 | 同上（`Calendar/Exceptions` の番号空間） | grs-native-erd-ja.md:304, :359, :709 |
| `Dependency.ordinal` **要新設・原典は矛盾** | `int` | 可 | （PK には入れない） | `Task.uid`（後続側＝`PredecessorLink` の親） | `GRS` | — | `0` 起点 | ⚠️ **§5.5d-2 は `PredecessorLink` を「(親, `ordinal`)」で識別するのに、§7.2 と §8I #4 は「序数は不採用」と書く。** 重複リンクの 2 本目以降を `Task.carry_elements` に `ordinal` 付きで退避する以上、**ネイティブ `Dependency` 側に `ordinal` が無いと原順序を復元できない**（→ 未解決 U-2） | grs-native-erd-ja.md:709 vs :1548, :1807 |

---

## 5. 順序 —— 同じ番号空間の `ordinal` で原順序を復元（§5.5d-3）

**規則表 R-4**

| # | 規則 | 出典 |
| --- | --- | --- |
| 1 | 各コレクション内の**全要素**（ネイティブ行も要素まるごと Carry も）に**同一の番号空間**で `ordinal` を振る | grs-native-erd-ja.md:715 |
| 2 | export は **`ordinal` 順**に出力する → **原順序が復元される** | grs-native-erd-ja.md:716 |
| 3 | 新規追加した行（`ordinal` が `null`）のうち **`Task` は WBS 木の深さ優先順が支配する**（`ordinal` より優先。MSPDI の階層は文書順に依存するため） | grs-native-erd-ja.md:717-718 |
| 4 | それ以外は「**既存は `ordinal` 順、新規は末尾**」 | grs-native-erd-ja.md:719 |
| 5 | `Resource.ID` は export で resources 配列の 0 起点連番として焼く（`ordinal` とは別物） | grs-native-erd-ja.md:1635 |

⚠️ **`Assignment` の出力順は原典に無い（未検証）。** 上の規則 4 が掛かると読めるが明記が無い。

---

## 6. `null` と既定値の区別（§5.5d-4）

**規則表 R-5**

| # | 規則 | 出典 |
| --- | --- | --- |
| 1 | **`null` ＝ 元ファイルにその要素が無かった**（`0` や `false` とは異なる） | grs-native-erd-ja.md:723 |
| 2 | **GRS の JSON は全 Own/Consume 列を常に出力し、値が無ければ `null` と明示する（キーを省略しない）** | grs-native-erd-ja.md:724 |
| 3 | **MSPDI へ書き出すときだけ省略**する（`null` なら要素を書かない）＝ **境界で変換する** | grs-native-erd-ja.md:725 |
| 4 | ⚠️ **例外: XSD の必須要素は `null` でも必ず書く**（既定値を焼く）。該当は `WeekDay/DayType`・各 `UID`・`SaveVersion`・`CurrencyCode` | grs-native-erd-ja.md:726-727 |
| 5 | **Reconstruct 列は常に書く**（MSPDI は自己完結スナップショットの思想） | grs-native-erd-ja.md:736 |
| 6 | GRS で新規作成した行は**全列 `null` 始まり** → ユーザーが値を入れた列だけ書かれる | grs-native-erd-ja.md:737 |
| 7 | なぜ JSON でキーを省略しないか: 「**定義していない**」と「**`null` と定義した**」は意味が違う。キーが無いと**書き忘れ（バグ）か、値が無いという意図かを区別できない** | grs-native-erd-ja.md:729 |
| 8 | ⚠️ **これが無いと往復の差分ゼロは原理的に不可能**（MSPDI はほぼ全フィールドが `minOccurs=0`。`0` と「無い」を潰すと必ず差分が出る） | grs-native-erd-ja.md:739, :1709 |
| 9 | 色の列（`TaskVisual.fillColor` 等）も同じ理由で `null` を明示する。`null`＝選んでいない、`'transparent'`＝人が透明を選んだ | grs-native-erd-ja.md:1049-1050, :1059-1064 |

**必須要素の XSD 実測（自分で数えた）**

| 事実 | 実測 | 出典 |
| --- | --- | --- |
| 明示 `minOccurs="1"` | **3 箇所**（`Calendars/Calendar`、`Calendar/WeekDays/WeekDay/DayType`、`WorkWeek/WeekDay/DayType`） | mspdi_pj12.xsd:1204, :1247, :1559 |
| `minOccurs` 属性を書かない（＝暗黙で必須） | **22 箇所**。うち 1 つはルート要素宣言 `<xsd:element name="Project">` そのもの | mspdi_pj12.xsd:187, 225, 232, 390, 743, 775, 787, 792, 945, 950, 963, 968, 1157, 1163, 1210, 1610, 2498, 2977, 3096, 3101, 3197, 3651 |
| `Project` 直下の必須は `SaveVersion` と `CurrencyCode` の **2 つだけ** | 一致（mspdi_pj12.xsd:232, :390） | grs-native-erd-ja.md:757 |
| 各 UID の必須 | `Calendar/UID`:1210・`Task/UID`:1610・`Resource/UID`:2498・`Assignment/UID`:3197。**`Project/UID` は `minOccurs="0"`（省略可・`xsd:string` maxLength=16）** | mspdi_pj12.xsd:238-247 |
| `Resource` / `Assignment` の必須は `UID` だけ | 一致（自分で数えた: `Resource` 直下 71 子要素・`Assignment` 直下 265 子要素で、`minOccurs="0"` が無いのは `UID` のみ）。`Task` も同じ（直下 96 子要素） | grs-native-erd-ja.md:627-629 / mspdi_pj12.xsd:1604, 2492, 3191 |

### 6-1. JSON 表現の例（§5.5d-7 を写す）

```json
{
  "uid": 7,
  "name": "詳細設計",
  "start": "2026-07-01T09:00:00",
  "finish": null,
  "carry": { "Cost": "0", "FixedCost": "0", "Type": "0", "DurationFormat": "7" },
  "carry_elements": [
    { "name": "ExtendedAttribute", "ordinal": 0,
      "fields": { "FieldID": "188743731", "Value": "A" } }
  ]
}
```

`finish: null` は「元ファイルに `<Finish>` が無かった」を意味し、export では出力しない。（出典 grs-native-erd-ja.md:765-779）

**この例から読み取れること（写しの解釈。原典に明記が無いものは印を付けた）**

| 観察 | 内容 | 出典 |
| --- | --- | --- |
| 器は行と同じ階層に並ぶ | `carry` / `carry_elements` は `Task` の JSON オブジェクトの**兄弟キー**である（別テーブルではない） | grs-native-erd-ja.md:765-777 |
| 値は文字列 | 数値も `"0"` と文字列で持つ（型変換しない＝解釈しない） | 同上 |
| `carry_elements` の要素は `children` を持たなくてよい | 例の 1 件は `name`/`ordinal`/`fields` のみ。**`children` は任意（省略可）と読めるが明記は無い（未検証）** | 同上 |
| ⚠️ 例と本文の食い違い | 本文（:724）は「**キーを省略しない**」と言うが、例では `carry_elements[0]` に `children` が無く、`Task` の Own 列（`milestone` `deadline` `notes` 等）も省かれている。**例は抜粋であって完全形ではない**（→ 未解決 U-5） | grs-native-erd-ja.md:724 vs :765-777 |
| 前の例（:732-735） | `元 MSPDI <Task><UID>7</UID><Start>7/1</Start></Task>` → `GRS JSON { "uid":7, "start":"7/1", "finish":null, … }` → `export MSPDI` で再び省略（原形に戻る） | grs-native-erd-ja.md:732-735 |

---

## 7. 入口の検査（import 時の自己検証・§5.5d-5）

```
各要素について:
    再合成 = ネイティブ列(null は出力しない) + carry.フィールド + carry_elements
    if 再合成 ≠ 元要素:
        → その要素を「要素まるごと Carry」へ退避し、ネイティブ化を諦める（警告を記録）
```
（出典 grs-native-erd-ja.md:743-748）

**規則表 R-6**

| # | 内容 | 出典 |
| --- | --- | --- |
| 1 | **漏れがあっても失われない**。ネイティブ化を諦めるだけで情報は必ず残る | grs-native-erd-ja.md:750 |
| 2 | **未知要素（将来の MS 拡張・スキーマ外）も自動的にここで捕まる** | grs-native-erd-ja.md:750 |
| 3 | この自己検証が、案 B（バッグのみ）の唯一の弱点「入れ忘れ」を潰す。入れ忘れは**実際に `WeekDay.TimePeriod` で発生した** | grs-native-erd-ja.md:689, :691, :1820 |
| 4 | 併せて **「Carry 内の UID も使用済みとする」** 規約が要る（`IsNull=1` の `Task` などが Carry の中で UID を占有するため） | grs-native-erd-ja.md:1731 |
| 5 | ⚠️ **「再合成」の定義が原典に無い**（Reconstruct 列・Consume 列を含めるか、比較は文字列一致か正規化後か、空白・属性順・名前空間をどう扱うか）（→ 未解決 U-4） | grs-native-erd-ja.md:743-748 |

---

## 8. 出口の検査（export 時の検証・§5.5d-6）

**規則表 R-7**

| 検査 | 内容 | 失敗時 | 出典 |
| --- | --- | --- | --- |
| **往復同一性** | **未編集**で import→export したとき、原 XML と**差分ゼロ**か | CI で失敗させる（回帰検出） | grs-native-erd-ja.md:756 |
| **必須要素** | `SaveVersion` / `CurrencyCode` が出力されているか（**`Project` 直下**の必須はこの 2 つだけ） | 既定値を焼き込む（`SaveVersion`=12 / `CurrencyCode`=`"JPY"`。Carry があれば優先） | grs-native-erd-ja.md:757, :1636-1637 |
| **必須要素（下位）** | `Calendars/Calendar`・`WeekDay/DayType`・各 `UID`（`Task`/`Calendar`/`Resource`/`Assignment`）が出力されているか | 既定値を焼き込む | grs-native-erd-ja.md:758 |
| **参照の解決** | ネイティブ `Dependency` / `Assignment` の UID が**文書内で解決できる**か | 該当要素を Carry へ退避 | grs-native-erd-ja.md:759, :1561 |
| **階層の妥当性** | `OutlineLevel` が「先頭=1・増分 ≤ +1」を満たすか | 木から全体を再生成する（export は常に `wbs_parent_uid` の木から算出するので、落ちるのは実装の誤り） | grs-native-erd-ja.md:760 |
| **XSD 妥当性** | 出力が XSD に対して valid か | 出力を中止して報告 | grs-native-erd-ja.md:761 |
| **期間の文字列一致**（追加要求） | `xsd:duration` の往復。GRS は稼働日数の `int`、MSPDI は `xsd:duration`（例 `PT40H0M0S`）なので**境界で必ず変換**する。**端数は丸めず `carry` に原文字列を保持**し、未編集なら原値を書き戻す | 明記なし（**未検証**） | grs-native-erd-ja.md:1524-1540 |
| **進行中タスクのケース**（必須追加） | 完了タスクだけの検証では欠落を見逃す（`ActualDuration`/`RemainingDuration` の H-2） | 明記なし | grs-mspdi-field-ledger-ja.md:648-649 |

⚠️ **「差分ゼロ」の定義が原典に無い**（バイト一致か、正規化 XML の一致か、要素順・空白・改行・エンコーディングをどう扱うか）（→ 未解決 U-4）。

---

## 9.「Drop=0 が証明可能になる」という主張の中身

**規則表 R-8 —— 主張の構造**

| 段 | 主張 | 出典 |
| --- | --- | --- |
| 1 | **未分類ゼロは達成済み**（8 ネイティブテーブルの全スカラー名を XSD 突合） | grs-mspdi-field-ledger-ja.md:645 / grs-native-erd-ja.md:1706 |
| 2 | **入口**: 「ネイティブ列 ＋ carry」の再合成が元要素と一致するか検証する。不一致なら**要素まるごと Carry へ退避**するので、**漏れても失われない** | grs-native-erd-ja.md:1707, :747-750 |
| 3 | **出口**: 未編集の往復で**原 XML と差分ゼロ**を CI で検証する（＋必須要素・参照解決・階層妥当性・XSD 妥当性） | grs-native-erd-ja.md:1708 |
| 4 | **前提**: Own/Consume 列が **nullable**（`null`＝元ファイルに要素なし）であること。**これが無いと差分ゼロは原理的に不可能** | grs-native-erd-ja.md:1709 |
| 5 | したがって「全要素が入口の検査を通り、出口の往復同一性テストが差分ゼロなら、**定義上、失った情報は無い**」＝ Drop=0 は**主張ではなく機械検証の結果**になる | grs-native-erd-ja.md:783-784 |
| 6 | **残り 21 テーブルの Drop=0 は「丸ごと Carry」に依拠**する（フィールド単位ではなく opaque passthrough で温存） | grs-mspdi-field-ledger-ja.md:647 |
| 7 | **損失は「Carry を実装しない」場合のみ発生** → **Carry passthrough の実装が Drop=0 の前提**。CI への実装は**残アクション（未実施）** | grs-mspdi-field-ledger-ja.md:647, :668 |

**規則表 R-9 —— Drop=0 の適用範囲と、明示的に許容する 1 件**

| 項目 | 内容 | 出典 |
| --- | --- | --- |
| 適用範囲 | **単一 MSPDI の未編集往復**に限る。**WBS の深さに条件は無い**（クランプしないため） | grs-native-erd-ja.md:1710, :839 |
| 明示的に許容する Drop（**1 件のみ**） | **マージ時の取込側 Carry の欠落**。Project メタ「既存を保持」や `Calendar`/`Resource` の自動統合で発生する（通貨・計算オプション・単価表・勤務時刻など） | grs-native-erd-ja.md:508-510, :1711-1712 |
| それ以外 | Drop は無い（入口の自己検証と出口の往復同一性で機械検証） | grs-native-erd-ja.md:1713-1715 |
| ユーザー操作による欠落は Drop に数えない | `Task` を削除すると連鎖で `Assignment` が消え、その Carry（`Units`・工数・コスト・201 予約枠）も消える。**ユーザーがタスクを削除した結果**なので前提は破らないが**通知する** | grs-native-erd-ja.md:673, :677 |

**規則表 R-10 —— Carry の中に残る参照（「Carry に参照が一切無い」は誤り）**

| 主張 | 範囲 | 出典 |
| --- | --- | --- |
| 正しい主張 | **8 ネイティブテーブルの整数 UID 空間（`Task`/`Resource`/`Calendar`/`Assignment`）を指す参照は Carry に含まれない**（MSPDI の UID 参照 7 つは全て Consume）。よって UID 振り直し時も Carry を書き換えなくてよい | grs-native-erd-ja.md:1704, :529-537 |
| 一般化してはならない | **定義への参照は Carry の中に残る** | grs-native-erd-ja.md:1705 |
| 実装上の帰結 | **Carry ストアは所有エンティティの下にぶら下げて保持する（グローバル索引を持たない）**。2 文書の Carry を併合すると番号が衝突しうるため | grs-native-erd-ja.md:1705 |

**表 E10-4 — Carry の中に残る参照（5 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `carry` 内の `TimephasedData/UID` | `int` | **不可**（XSD 実測: `minOccurs` 属性なし＝必須） | — | **自己識別**（親 UID の写しではない） | `Carry` | `TimephasedData/UID` | — | XSD documentation は "The unique identifier of the timephased data record"。**UID 振り直しで壊れない**。Carry 内に **5 経路**（自分で数えた: `Task/Baseline`・`Task`・`Resource`・`Assignment/Baseline`・`Assignment`） | mspdi_pj12.xsd:187-191, 2313, 2473, 3173, 3646, 3893 / grs-native-erd-ja.md:1705 |
| `carry` 内の `ExtendedAttribute/FieldID`（値層） | `string` | 可（`minOccurs="0"`） | — | 定義層 `ExtendedAttribute/FieldID` | `Carry`（GRS 枠だけ `Consume`） | `*/ExtendedAttribute/FieldID` | — | **参照元・参照先とも Carry** なので一緒に運ばれる限り整合する。**マージで片側だけ破棄すると dangling** になる | mspdi_pj12.xsd:2254, 992 / grs-native-erd-ja.md:1705 |
| `carry` 内の `OutlineCode/ValueID` | `int` | 可 | — | `Project/OutlineCodes/OutlineCode/Values/Value/ValueID` | `Carry` | `Task/OutlineCode/ValueID`・`Resource/OutlineCode/ValueID` | — | 同上（定義ごと Carry） | mspdi_pj12.xsd:2424, 3016, 781 |
| `carry` 内の `ExtendedAttribute/ValueGUID` | `int`（**XSD 実測は `xsd:integer`。名前は GUID だが型は整数**） | 可 | — | 定義層のルックアップ表 | `Carry` | `Task`/`Resource`/`Assignment` の `ExtendedAttribute/ValueGUID` | — | 同上 | mspdi_pj12.xsd:2264, 2928, 3597 |
| `carry` 内の `Ltuid` | `string` | 可 | — | ルックアップ表の GUID | `Carry` | `Project/ExtendedAttributes/ExtendedAttribute/Ltuid` | — | 同上 | mspdi_pj12.xsd:1075 |

---

## 10. MSPDI 拡張領域（`ExtendedAttribute`）の使い方（§5.5f）

**GRS 固有だが往復させたい値は MSPDI の拡張領域に載せる。第 1 号が `fadeInDays` / `fadeOutDays`**（バー端のテーパ＝日付の曖昧さ）。出典 grs-native-erd-ja.md:865

- **なぜ `Task` に置くか**: 拡張領域は **MSPDI の一部**なので、そこで往復する値は「MSPDI に存在するデータ」である。したがって「`Task` は MSPDI 由来の列のみ」という原則に反しない。**`TaskVisual` に置くべきは「MSPDI に写す先が無いもの」**（色・形状・名称ラベル位置）。出典 grs-native-erd-ja.md:867
- **拡張領域を使うのは 2 つだけ**（旧 6 枠 → 2 枠）。出典 grs-native-erd-ja.md:37 / grs-mspdi-field-ledger-ja.md:29

### 10-1. 定義と値の 2 層

| 層 | 場所（XSD 実名） | 子要素の数（自分で数えた） | 出典 |
| --- | --- | --- | --- |
| **定義** | `Project/ExtendedAttributes/ExtendedAttribute` | **21**（全て `minOccurs="0"`） | mspdi_pj12.xsd:986-1192 |
| **値** | `Task/ExtendedAttribute`（`Resource`/`Assignment` にも同型がある） | **4**（全て `minOccurs="0"`） | mspdi_pj12.xsd:2248-2305 |

**両方書かないと成立しない**（値だけ書いても定義が無ければ意味不明な数値になる）。出典 grs-native-erd-ja.md:876

**表 E10-5 — 定義層 `Project/ExtendedAttributes/ExtendedAttribute`（XSD 実測 21 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FieldID` | `xsd:string` | 可（`minOccurs="0"`） | 値層からの参照先（XSD に `key` 宣言は無い） | — | `Carry`（他ツール枠）/ **`Reconstruct`**（GRS 枠・export で焼く） | `FieldID` | GRS 枠は**固定枠を決め打つ**が、**具体の整数値は原典に無い**（`Number1`/`Number2` としか書かれない・**未検証**） | XSD documentation は "This corresponds to the PID of the custom field."。**枠と PID 整数の対応は XSD に無い** | mspdi_pj12.xsd:992 / grs-native-erd-ja.md:891 / grs-mspdi-field-ledger-ja.md:29 |
| `FieldName` | `xsd:string` | 可 | — | — | `Carry` | `FieldName` | — | **GRS が書くかどうか原典に記述なし（未検証）**。§5.5f の型表は `CFType`/`ElemType`/`UserDef`/`Alias` の 4 つしか挙げていない | mspdi_pj12.xsd:997 / grs-native-erd-ja.md:880-885 |
| `CFType` | `int`（enum 0..7） | 可 | — | — | `Carry` / **`Reconstruct`**（GRS 枠） | `CFType` | GRS 枠は **`5`（Number）** | XSD 実測の値集合: 0=Cost, 1=Date, 2=Duration, 3=Finish, 4=Flag, **5=Number**, 6=Start, 7=Text。日数＝整数なので 5 | mspdi_pj12.xsd:1003-1019 / grs-native-erd-ja.md:882 |
| `Guid` | `xsd:string` | 可 | — | — | `Carry` | `Guid` | — | カスタムフィールドの GUID。GRS は書かない（原典に記述なし・**未検証**） | mspdi_pj12.xsd:1020 |
| `ElemType` | `int`（enum） | 可 | — | — | `Carry` / **`Reconstruct`**（GRS 枠） | `ElemType` | GRS 枠は **`20`（Task）** | XSD 実測の値集合: **20=Task**, 21=Resource, **22=Calendar**, 23=Assignment。⚠️ 22 は Calendar であって Assignment ではない | mspdi_pj12.xsd:1025-1037 / grs-native-erd-ja.md:883 |
| `MaxMultiValues` | `xsd:integer` | 可 | — | — | `Carry` | `MaxMultiValues` | — | ピックリストの最大値数 | mspdi_pj12.xsd:1038 |
| `UserDef` | `xsd:boolean` | 可 | — | — | `Carry` / **`Reconstruct`**（GRS 枠） | `UserDef` | GRS 枠は **`true`** | ユーザー定義か | mspdi_pj12.xsd:1043 / grs-native-erd-ja.md:884 |
| `Alias` | `xsd:string`（maxLength **50**） | 可 | — | — | `Carry` / **`Reconstruct`**（GRS 枠） | `Alias` | GRS 枠は **`GRS Fade In Days`** / **`GRS Fade Out Days`** | 他ツールで開いても意味が分かる名前にする。XSD 実測 maxLength=50 に収まる（16 / 17 文字・自分で数えた） | mspdi_pj12.xsd:1049-1058 / grs-native-erd-ja.md:885 |
| `SecondaryPID` | `xsd:string` | 可 | — | — | `Carry` | `SecondaryPID` | — | 副 PID | mspdi_pj12.xsd:1060 |
| `AutoRollDown` | `xsd:boolean` | 可 | — | — | `Carry` | `AutoRollDown` | — | 割当への自動ロールダウン | mspdi_pj12.xsd:1065 |
| `DefaultGuid` | `xsd:string` | 可 | — | — | `Carry` | `DefaultGuid` | — | 既定ルックアップ項目の GUID | mspdi_pj12.xsd:1070 |
| `Ltuid` | `xsd:string` | 可 | — | ルックアップ表 | `Carry` | `Ltuid` | — | **Carry 内に残る参照**（表 E10-4） | mspdi_pj12.xsd:1075 |
| `PhoneticAlias` | `xsd:string`（maxLength 50） | 可 | — | — | `Carry` | `PhoneticAlias` | — | 別名のふりがな | mspdi_pj12.xsd:1081 |
| `RollupType` | `int`（enum 0..7） | 可 | — | — | `Carry` | `RollupType` | — | ロールアップの計算方法 | mspdi_pj12.xsd:1091 |
| `CalculationType` | `int`（enum 0..2） | 可 | — | — | `Carry` | `CalculationType` | — | 0=None, 1=Rollup, 2=Calculation | mspdi_pj12.xsd:1108 |
| `Formula` | `xsd:string` | 可 | — | — | `Carry` | `Formula` | — | 数式 | mspdi_pj12.xsd:1120 |
| `RestrictValues` | `xsd:boolean` | 可 | — | — | `Carry` | `RestrictValues` | — | 一覧の値だけ許すか | mspdi_pj12.xsd:1125 |
| `ValuelistSortOrder` | `int`（enum 0/1） | 可 | — | — | `Carry` | `ValuelistSortOrder` | — | 0=降順, 1=昇順 | mspdi_pj12.xsd:1130 |
| `AppendNewValues` | `xsd:boolean` | 可 | — | — | `Carry` | `AppendNewValues` | — | 新しい値を自動追加するか | mspdi_pj12.xsd:1141 |
| `Default` | `xsd:string` | 可 | — | — | `Carry` | `Default` | — | 既定値（未設定なら要素ごと無い） | mspdi_pj12.xsd:1146 |
| `ValueList` | 子要素（`Value` の配列） | 可 | — | — | `Carry` | `ValueList/Value` | — | `Value` は `maxOccurs="unbounded"` かつ **`minOccurs` 省略＝必須**、その子 `ID` も必須 → `carryElements[].children` で持つ | mspdi_pj12.xsd:1151-1170 |

**表 E10-6 — 値層 `Task/ExtendedAttribute`（XSD 実測 4 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FieldID` | `xsd:string` | 可（`minOccurs="0"`） | 定義層への参照 | 定義層 `ExtendedAttribute/FieldID` | **`Consume`（GRS 枠）/ `Carry`（他ツール枠）** | `Task/ExtendedAttribute/FieldID` | — | GRS が予約した枠だけ Consume し、`Task.fadeInDays`/`fadeOutDays` に写す | mspdi_pj12.xsd:2254 / grs-native-erd-ja.md:901-903 |
| `Value` | `xsd:string` | 可 | — | — | 同上 | `Task/ExtendedAttribute/Value` | — | 実際の値。GRS 枠では日数の整数を文字列で書く | mspdi_pj12.xsd:2259 / grs-native-erd-ja.md:912-918 |
| `ValueGUID` | `xsd:integer` | 可 | — | ルックアップ表 | `Carry` | `Task/ExtendedAttribute/ValueGUID` | — | 名前は GUID だが **XSD 実測の型は `xsd:integer`** | mspdi_pj12.xsd:2264 |
| `DurationFormat` | `int`（enum 26 値） | 可 | — | — | `Carry` | `Task/ExtendedAttribute/DurationFormat` | — | 値集合は 3,4,5,6,7,8,9,10,11,12,19,20,21,35,36,37,38,39,40,41,42,43,44,51,52,53（自分で数えた: **26 値**） | mspdi_pj12.xsd:2269-2304 |

**表 E10-7 — GRS が拡張領域で往復させる列（2 行）**

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Task.fadeInDays` | `int`（日数） | **可**（`null` = 元ファイルに無い） | — | — | `Consume`（拡張領域） | `Task/ExtendedAttribute`（GRS 予約 `FieldID` ＋ `Value`）＋ `Project/ExtendedAttributes/ExtendedAttribute`（定義） | `null` | **値が `null` なら `ExtendedAttribute` を出力しない**。`0`（明示的にゼロ）とは区別する | grs-native-erd-ja.md:269, :905-907 |
| `Task.fadeOutDays` | `int`（日数） | **可** | — | — | `Consume`（拡張領域） | 同上 | `null` | 同上。**両端で独立**に持つ（`Estimated` に写すと両端の区別と日数が失われる） | grs-native-erd-ja.md:270, :926-931 |

### 10-2. 規約 3 点（確定）

| # | 規約 | 内容 | 出典 |
| --- | --- | --- | --- |
| **(1)** | **`FieldID` は固定枠 ＋ 衝突検出** | `FieldID` は「custom field の PID」で、MS Project では `Number1`〜`Number20` 等の枠に固定の整数コードが対応する。**GRS が使う枠を決め打つ**が、**import 時にその `FieldID` が取込側にも定義されていたら空き枠へ退避し、警告を出す**（他ツールのデータを静かに上書きしない）。主要な入力元は第三者生成 MSPDI なので、固定枠のみだと**他ツールのデータを黙って壊す** | grs-native-erd-ja.md:889-899 |
| **(2)** | **GRS が使う `FieldID` だけ Consume。他は従来どおり Carry** | `ExtendedAttribute` は全体としては Carry のままとし、GRS が (1) で決めた枠だけ Consume する。**export では両方を書き出す**（Carry 分は原順序で復元） | grs-native-erd-ja.md:901-903 |
| **(3)** | **値が無いときは要素を書かない** | `fadeInDays` が `null` なら `ExtendedAttribute` を出力しない。`0`（明示的にゼロ）とは区別する | grs-native-erd-ja.md:905-907 |

### 10-3. 往復の姿（§5.5f を写す）

```
import  <ExtendedAttribute><FieldID>（GRS の枠）</FieldID><Value>3</Value></ExtendedAttribute>
          → Task.fadeInDays = 3          （GRS の枠だけ Consume）
          → 他の FieldID は Carry へ退避

export  Task.fadeInDays = 3
          → Project 側に定義を出力（CFType=5, ElemType=20, UserDef=true, Alias="GRS Fade In Days"）
          → Task 側に値を出力（FieldID ＋ Value=3）
          → Carry の ExtendedAttribute も原順序で書き戻す
```
（出典 grs-native-erd-ja.md:911-920）

### 10-4. `Estimated` との違い

| | MSPDI | GRS fade | 出典 |
| --- | --- | --- | --- |
| 粒度 | タスク全体で 1 つ（`Estimated` bool、`DurationFormat` の `?` 付き値） | **両端で独立** | grs-native-erd-ja.md:926-928 |
| 量 | **無い**（曖昧か否かの 2 値） | **日数で指定** | 同上 |

⚠️ **`fadeInDays` を `Estimated` にマッピングしないこと。** 両端の区別と日数が失われる。`Estimated` と `DurationFormat` は引き続き **Carry**（GRS は解釈しない）。出典 grs-native-erd-ja.md:931
XSD 実測: `Task/Estimated` は `xsd:boolean`・`minOccurs="0"`（mspdi_pj12.xsd:1777）。`DurationFormat` の `?` 付き値（35〜53）は XSD の enum documentation で確認できる（mspdi_pj12.xsd:2269-2304）。

---

## 11. Carry を読む/失う例外（往復の穴になりうる場所）

**規則表 R-11**

| 場面 | 何が起きるか | 出典 |
| --- | --- | --- |
| **export で Carry を読む** | `Task/DurationFormat`（Carry）は `xsd:duration` を整形するときだけ読む。⚠️ **Carry は「書き戻すだけ」であって「読まない」ではない** | grs-native-erd-ja.md:1534-1535 |
| **完了時の `RemainingDuration`** | Carry なのに **完了時だけ GRS が `0` を書く**（唯一の Carry 例外） | grs-native-erd-ja.md:96 / grs-mspdi-field-ledger-ja.md:457 |
| **未編集 `Duration`** | Carry の原値を優先して書き戻す（暦の解釈差で往復差分が出るのを防ぐ）。編集済のみ `finish − start` で算出 | grs-native-erd-ja.md:1633, :1642 |
| **期間の端数** | 丸めない。`carry` に**原文字列**を保持し、未編集なら原値を書き戻す。⚠️ **この変換を省くと Drop=0 が静かに壊れる**（数値が近いのでテストが通ってしまう） | grs-native-erd-ja.md:1536-1540 |
| **マージ**（Project メタ「既存を保持」/ `Calendar`・`Resource` の自動統合） | **取込側の Carry が破棄される**（明示的に許容する唯一の Drop） | grs-native-erd-ja.md:508-510 |
| **「上書き」時の置換範囲** | `Task` の Own/Consume 列・**`carry`**・`Dependency` は**置換**、`TaskVisual` / `TaskGroupMember` は**保持** | grs-native-erd-ja.md:444-448 |
| **cascade 削除** | `Task` 削除 → `Assignment` も消え、その Carry（`Units`・工数・コスト・201 予約枠）も消える。**通知する** | grs-native-erd-ja.md:673, :677 |
| **GRS が新規に作る行** | Carry を持たないので **`null` でない列だけが書き出される**。XSD 必須は `UID` だけなので妥当な XML になる。⚠️ **MS Project が `Units`/`Work` を勝手に埋めるかは未検証**（埋めるなら `Task` の Carry と食い違い往復無損失が壊れる） | grs-native-erd-ja.md:604-611, :626-634 |
| **Carry 内の UID** | **使用済みとして扱う**（`IsNull=1` の Task などが Carry の中で UID を占有する） | grs-native-erd-ja.md:1731 |

---

## 未解決

### A. 原典どうしが矛盾している点

| # | 何が矛盾するか | 両側 | どちらを採るべきか |
| --- | --- | --- | --- |
| **U-1** | **`Project` の分類の内訳が 2 通りある。** §7.3 は「Own 17 / Consume 1 / Reconstruct 3 / Carry 42」、§8B の検算行は「Own 18 ＋ Consume 1 ＋ Reconstruct 1 ＋ Carry 43 = 63」 | grs-mspdi-field-ledger-ja.md:512, :527-528 vs :643 | **§7.3 が正**（自分で数えた: 17+1+3+42=63。XSD の `Project` 直下 70 子要素 − コレクション 7 = 63 スカラーと一致）。§8B の検算行は `SaveVersion`/`CurrencyCode` を Reconstruct へ移す前の**古い数**である |
| **U-2** | **`PredecessorLink` に `ordinal` が要るのか要らないのか。** §5.5d-2 は「識別子を持たない要素（…`PredecessorLink`…）は (親のキー, `ordinal`)」、§7.2 と §8I #4 は「同一ペア・同一種別の重複は意味を持たないので**序数は不要 / 不採用**」 | grs-native-erd-ja.md:709 vs :1548, :1807 | **順序復元のために `Dependency.ordinal` が要る**（重複リンクの 2 本目以降は `ordinal` 付きで Carry に退避するので、ネイティブ側に番号が無いと同じ番号空間が成り立たない）。ただし **PK には入れない**（§7.2 の複合 PK は維持）。次期の判断が要る |
| **U-3** | **`Exception.Type` の置き場が無い。** ledger §7.4 は `Type` を **Consume**（必須で読む）とし、ERD §5.5b も Consume とするが、ERD §5.2 の `Exception` に列が無く、§8A（Reconstruct）にも無い | grs-mspdi-field-ledger-ja.md:558 / grs-native-erd-ja.md:645 vs :303-309, :1623-1637 | 明示 `<Type>9</Type>` を書いたファイルは**入口の検査で再合成が一致せず、`Exception` 行がまるごと Carry へ落ちる**（＝ネイティブな祝日が 1 つも作られない可能性がある）。`Exception.carry` に原形を残すか、`type` 相当の列（汎用語禁止のため `recurrenceKind` 等）を新設するかを次期が決めること |
| **U-4** | **`Task.stop` を保存しないと、入口の検査を通らない。** §7.1 は「`stop` は保存しない・export で算出」、§8B / §3 は `Stop` を **Own** に数える | grs-native-erd-ja.md:1518 vs :96 / grs-mspdi-field-ledger-ja.md:636 | 元ファイルの `<Stop>` が `actualStart + actualDuration` と一致しない中断タスクは、再合成が一致せず**まるごと Carry へ落ちる**（本表の**導出**）。`Stop` を carry に落とすか、Reconstruct と明記するかを決めること |
| **U-5** | **`WeekDay`/`Exception` の弱エンティティに Carry の器が無い。** キーは「親＋`ordinal`」と決まっている（§5.5d-2）のに、ERD §5.2 の両エンティティに `carry`/`carry_elements` の列が無い | grs-native-erd-ja.md:709 vs :298-309 | ERD は Carry を意図的に載せていない（:20）ので「矛盾」ではないが、**器の新設が要る**ことは原典のどこにも書かれていない。`Dependency` も同じ |

### B. 原典で決められない点（未検証・記述が無い）

| # | 決まっていないこと | 出典 |
| --- | --- | --- |
| **U-6** | **「再合成」の定義**（入口の検査）。ネイティブ列に Consume 由来（`OutlineLevel` 等）や Reconstruct 列を含めるのか、比較は文字列一致か正規化後か、空白・属性順・名前空間・エンコーディングをどう扱うか | grs-native-erd-ja.md:743-748 |
| **U-7** | **「差分ゼロ」の定義**（出口の往復同一性）。バイト一致か、正規化 XML の一致か。§7.1a は「**期間の文字列一致を含めること**」とだけ足している | grs-native-erd-ja.md:756, :1540 |
| **U-8** | **`Assignment` の 201 予約枠（`f404000`〜`f4040c8`）の中身。** ledger は「全て空・個別意味なし」と書くが、**XSD 実測ではこの 201 個は型宣言が無く `xsd:anyType`＝任意の子要素を持ちうる**。文字列 1 個のフィールド単位 Carry では表せない場合がある | grs-mspdi-field-ledger-ja.md:378, :596 / mspdi_pj12.xsd:3691-3891 |
| **U-9** | **GRS が予約する `FieldID` の具体値。** 原典は「`Number1`/`Number2`」としか書かず、PID 整数は書いていない。**XSD にも枠と PID の対応は無い**（`FieldID` は `xsd:string`「corresponds to the PID」とあるだけ）。JSON 例の `"188743731"` は他ツール由来の例示であって GRS の枠ではない | grs-mspdi-field-ledger-ja.md:29 / grs-native-erd-ja.md:891, :774 / mspdi_pj12.xsd:992 |
| **U-10** | **器の空値表現**（`carry` が空のとき `{}` か `null` か、`carry_elements` が空のとき `[]` か `null` か、キーを省略してよいか）。§5.5d-4 は「Own/Consume 列はキーを省略しない」と言うが、**器についての規定が無い** | grs-native-erd-ja.md:723-737 |
| **U-11** | **`carryElements[].children` の省略可否と入れ子の深さ上限。** JSON 例では `children` が無い | grs-native-erd-ja.md:765-777 |
| **U-12** | **`Assignment` の出力順**（`ordinal` 順か、`uid` 順か） | grs-native-erd-ja.md:715-719 |
| **U-13** | **Carry passthrough は未実装で、round-trip 同一性テストも CI に無い。** ledger の「残アクション」に残ったまま。**Drop=0 の前提が未達である** | grs-mspdi-field-ledger-ja.md:668 |
| **U-14** | **MS Project が新規行に `Units`/`Work` を勝手に埋めるかは未検証。** 埋めるなら `Task` の Carry（工数・コスト）と食い違い、往復無損失が壊れる | grs-native-erd-ja.md:631-634 |
| **U-15** | **Carry を JSON でどこに置くか**（所有エンティティの兄弟キーとしては §5.5d-7 の例で分かるが、`Project` 直下の 21 テーブル分の Carry をどの配列に積むかは記述が無い） | grs-native-erd-ja.md:765-777, :1705 |

### C. 要改名（命名の規約に反するもの）

| # | 原典の名前 | 規約違反 | 提案 | 出典 |
| --- | --- | --- | --- | --- |
| **N-1** | `carry_elements` | snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけ | **`carryElements`** | grs-native-erd-ja.md:700 |
| **N-2** | `carryElements[].fields` | `data` / `info` に近い汎用語 | `leafValues` など（**要判断**。`fields` は「葉要素の集まり」を指しており完全に無意味ではない） | grs-native-erd-ja.md:700 |
| **N-3** | `documentSettings.import_seq` / `TaskOrigin.last_seen_import_seq` | snake_case。しかも**用語辞書は `importSeq`（K-86）を確定名としている** | **`importSeq`** / **`lastSeenImportSeq`** | grs-native-erd-ja.md:474-475, :1130 vs tbl-glossary.md:218 |
| **N-4** | `WeekDay.day_type` / `day_working` / `Exception.from_date` / `to_date` / `Calendar.is_base` / `base_calendar_id` / `calendar_id` / `task_uid` / `resource_uid` / `group_id` / `stack_order` / `parent_id` / `derived_from_task_uid` / `source_project_uid` / `source_uid` / `import_session_id` / `uid_high_water_mark` / `schema_version` / `is_cost_resource` / `wbs_order` / `stack_direction` | すべて snake_case（許されるのは 3 語だけ） | lowerCamelCase へ。**`stack_direction` は用語辞書の `stackDirection`（K-73）が正** | grs-native-erd-ja.md:239-341 vs tbl-glossary.md:205 |
| **N-5** | （E10 の対象外だが記録）`Task.milestone` | **用語辞書 T-101 N-1 は「真偽値の `milestone` という列は持たない」と明記**するのに、ERD §5.2 は `Task.milestone`（Own ← `Milestone`）を持ち、§7.6 は「`shapeKind='milestone'` ⇔ `Task.milestone=true`（権威は `Task.milestone`）」と書く | **往復に直結する**（`Task/Milestone` は MSPDI の Own 要素）。列を落とすなら `Milestone` の書き戻し元を決め直す必要がある | tbl-glossary.md:25 vs grs-native-erd-ja.md:257, :1615 |

### D. 用語辞書との突き合わせ

| 語 | 用語辞書 | 本 E10 の原典 | 判定 |
| --- | --- | --- | --- |
| `carry` / `carry_elements` / `ordinal` | **載っていない**（辞書は「確定名の全数」と自称する） | ERD §5.5d が使う | **辞書に追記が要る**。器は仕様書に出る語である |
| `fadeInDays` / `fadeOutDays` | P-21 にある（フェードイン日数 / フェードアウト日数） | ERD §5.2, §5.5f | 一致 |
| `wbs_parent_uid` | P-22 にある | ERD §5.2 | 一致（snake_case を許す 3 語の 1 つ） |
| `importSeq` | K-86 | ERD は `import_seq` | **食い違い**（要改名表 N-3） |
| `stackDirection` | K-73 | ERD は `stack_direction` | **食い違い**（要改名表 N-4） |
| `Project.status_date` | 辞書 244 行目が名前を確定 | ERD §5.2 `status_date` | 一致 |
| `milestone`（真偽値の列） | **持たないと明記**（辞書 T-101 の行 ID `N-1`） | ERD は持つ | **食い違い**（要改名表 N-5） |
