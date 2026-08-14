# MSPDI の実際の構造と、前プロジェクトが想定した GRS ERD の比較

**本書は版管理下に置く。** 仕様書（`CR-110` ほか）が §2 の「構造を変えた 7 件」を理由として引くので、
**クローンした者が出典を解決できなければならない。** 本書は自作の日本語の分析であり、
**交換相手のスキーマの英文をそのまま引いた箇所は 1 つも無い**ので、表 T-003 の `CN-7` に触れない。

⚠️ **同じ調査から生まれた完全 ERD（`docs/reference/mspdi/mspdi-erd-ja.md`）は版管理下に置かない。**
交換相手のスキーマの英文の説明文を 430 行そのまま持っており、`CN-7` に触れるためである。
本書が「新 ERD」として名指しするのはその文書であり、入手手順は `docs/reference/README.md` が持つ。

- 作成日: 2026-08-14
- 判定基準: **XSD が正**（`docs/reference/mspdi/mspdi_pj12.xsd`、全 3,906 行）。この文書内で「MSPDI 側」と言うときは、そこから機械的に起こした `docs/reference/mspdi/mspdi-erd-ja.md`（以下「新 ERD」）を指す。
- 読んだもの（すべて全文）:
  1. `docs/reference/mspdi/mspdi-erd-ja.md`（1,272 行、以下「新 ERD」） — 正
  2. `previous-project-result/02-data-model/grs-native-erd-ja.md`（1,827 行、以下「GRS ERD」）
  3. `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md`（678 行、以下「仕分け台帳」）
  4. `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json`（96 行、以下「JSON 実例」）
- **良い点は書かない。対応と差分だけを書く。**
- **「GRS が構造を変えた」ことは誤りではない（設計の選択）。誤りかどうかではなく「変えた／変えていない」と「理由が書かれている／いない」を分けて書く。**

---

## 1. 対応表 — MSPDI エンティティ（全 33）× GRS の扱い

新 ERD §4 が数えた **33 エンティティ**を全数並べる。GRS 側の扱いは 4 区分:

- **同じ形で持つ**: エンティティが 1:1 で存続し、列を Own/Consume で残す（Carry 列も同じ行に同居）
- **形を変えて持つ**: エンティティの位置・形状そのものを変えた（§2 で詳述）
- **持たない（Carry）**: GRS 独自の構造は持たず、エンティティごと不透明な `carry`/`carry_elements` バッグへ退避（往復のためだけに温存。解釈しない）
- **持たない（Drop）**: 該当なし（GRS ERD は Drop=0 を主張。§8D 該当箇所は後述 §5 参照）

| # | MSPDI エンティティ（新 ERD 表記・XSD 行） | GRS の扱い | GRS 側の名称/列 | 典拠 |
|---|---|---|---|---|
| 1 | `PROJECT`（行225） | **同じ形で持つ** | `Project`（Own17+Consume1+Reconstruct3、残り42はCarry） | 仕分け台帳 §7.3, Appendix B（行638） |
| 2 | `OUTLINE_CODE_DEF`（`OutlineCode`定義層・行736） | **持たない（Carry）** | — | 仕分け台帳 §7.0（行396） |
| 3 | `OUTLINE_CODE_VALUE`（`Values/Value`・行775） | **持たない（Carry）** | — | 同上 |
| 4 | `OUTLINE_CODE_MASK`（`Masks/Mask`・行866） | **持たない（Carry）** | — | 同上 |
| 5 | `WBS_MASK`（`WBSMasks`/`WBSMask`・行913/939） | **持たない（Carry）** | — | 同上 |
| 6 | `EXTENDED_ATTRIBUTE_DEF`（定義層・行986） | **持たない（Carry）**※注1 | — | 仕分け台帳 §7.0（行397）／§5.5f |
| 7 | `EXTENDED_ATTRIBUTE_VALUELIST_VALUE`（`ValueList/Value`・行1157） | **持たない（Carry）** | — | 仕分け台帳 §7.0 |
| 8 | `TASK`（行1604） | **同じ形で持つ** | `Task`（Own多数+Consume4+Reconstruct4、残りCarry） | GRS ERD §7.1（行1502-1520） |
| 9 | `PREDECESSOR_LINK`（`Task/PredecessorLink`・行2162） | **形を変えて持つ** ⚠️ | `Dependency`（§2-A） | GRS ERD §7.2（行1542-1550） |
| 10 | `TASK_EXTENDED_ATTRIBUTE`（値層・行2248） | **持たない（Carry）**※GRS枠2列のみ形を変えて持つ | `Task.fadeInDays`/`fadeOutDays`（§2-C） | 仕分け台帳 §7.1（行491）／GRS ERD §5.5f（行863-931） |
| 11 | `TASK_BASELINE`（`Task/Baseline`・行2307） | **持たない（Carry）** | — | 仕分け台帳 §7.0（行395） |
| 12 | `TASK_OUTLINE_CODE`（値層・行2413） | **持たない（Carry）** | — | 仕分け台帳 §7.0 |
| 13 | `TIMEPHASED_DATA`（`TimephasedDataType`・行27、5箇所から参照） | **持たない（Carry）** | — | 仕分け台帳 §7.0（行394） |
| 14 | `RESOURCE`（行2492） | **形を変えて持つ**（軽量化） | `Resource`（71列中5列のみOwn/Consume、残り66列はCarry） | GRS ERD §5.5（行514-537） |
| 15 | `RESOURCE_EXTENDED_ATTRIBUTE`（行2912） | **持たない（Carry）** | — | 仕分け台帳 §7.5（行582） |
| 16 | `RESOURCE_BASELINE`（行2971） | **持たない（Carry）** | — | 同上 |
| 17 | `RESOURCE_OUTLINE_CODE`（行3005） | **持たない（Carry）** | — | 同上 |
| 18 | `AVAILABILITY_PERIOD`（行3057） | **持たない（Carry）** | — | 同上 |
| 19 | `RATE`（行3090） | **持たない（Carry）** | — | 同上 |
| 20 | `ASSIGNMENT`（行3191） | **形を変えて持つ**（軽量化） | `Assignment`（265列中3列のみOwn/Consume、残り262列はCarry） | GRS ERD §5.5（行514-537） |
| 21 | `ASSIGNMENT_EXTENDED_ATTRIBUTE`（行3581） | **持たない（Carry）** | — | 仕分け台帳 §7.6（行597） |
| 22 | `ASSIGNMENT_BASELINE`（行3640） | **持たない（Carry）** | — | 同上 |
| 23 | `ASSIGNMENT_RESERVED_FIELD`（`f404000`〜`f4040c8`・201個・行3691-3891） | **持たない（Carry）** | — | 同上 |
| 24 | `CALENDAR`（行1204） | **同じ形で持つ** | `Calendar`（Own3+Consume1） | GRS ERD §7.4（行1583-1586） |
| 25 | `WEEKDAY`（`Calendar/WeekDays/WeekDay`・行1241） | **同じ形で持つ**（一部Carry混在） | `WeekDay`（Own2、`DayType=0`はCarryへ退避） | GRS ERD §7.4（行1587-1588） |
| 26 | `WEEKDAY_TIME_PERIOD`（`WeekDay/TimePeriod`旧形式・行1269） | **持たない（Carry）** | — | 仕分け台帳 §7.4（行553） |
| 27 | `WORKING_TIME`（`WeekDay/WorkingTimes/WorkingTime`・行1295） | **持たない（Carry）** | — | 仕分け台帳 §7.4（行557） |
| 28 | `EXCEPTION`（`Calendar/Exceptions/Exception`・行1331） | **同じ形で持つ**（一部Carry混在） | `Exception`（Own3+Consume1、繰返し詳細8項目はCarry） | GRS ERD §5.5b（行636-665） |
| 29 | `EXCEPTION_TIME_PERIOD`（`Exception/TimePeriod`・行1342） | **特殊: エンティティは消え、列として`Exception`へ吸収（Own）** | `Exception.from_date`/`to_date` | GRS ERD §7.4（行1590） |
| 30 | `EXCEPTION_WORKING_TIME`（`Exception/WorkingTimes/WorkingTime`・行1475） | **持たない（Carry）** | — | 仕分け台帳 §7.4（行557,559） |
| 31 | `WORK_WEEK`（`Calendar/WorkWeeks/WorkWeek`・行1514） | **持たない（Carry）** | — | 仕分け台帳 §7.4（行559） |
| 32 | `WORK_WEEK_TIME_PERIOD`（`WorkWeek/TimePeriod`・行1520） | **持たない（Carry）** | — | 同上 |
| 33 | `WORK_WEEK_WEEKDAY`（`WorkWeek/WeekDay`・行1553） | **持たない（Carry）** | — | 同上 |

※注1: `EXTENDED_ATTRIBUTE_DEF`（定義層）は GRS 独自の定義行を複製せず、export 時に GRS の予約枠（`CFType=5`/`ElemType=20`/`UserDef=true`/`Alias="GRS Fade In Days"`等）を焼き込む形で**書き込み先としてのみ**使う（GRS ERD 行873-885, 917）。ネイティブに読み込んで保持するわけではないため「持たない（Carry）」に分類したが、完全な Carry（無視）とも言い切れない特殊ケースである。

**内訳（33 エンティティ）**: 同じ形で持つ=5（Project/Task/Calendar/WeekDay/Exception）、形を変えて持つ=3（PredecessorLink→Dependency、Resource軽量化、Assignment軽量化）、列へ吸収されエンティティが消える=1（ExceptionTimePeriod）、持たない（Carry）=24。5+3+1+24=33。

---

## 2. ⚠️ GRS が構造を変えた箇所の全数（7 件）

### A. `PredecessorLink` → `Dependency`（必須の取り上げ）

- **MSPDI での位置**: `Tasks/Task/PredecessorLink`（新 ERD §5.9、XSD 行2162）。**後続タスクの子要素**として存在する。先行側への参照は `PredecessorUID` の 1 列のみで、**後続を指す要素は存在しない**（新 ERD 行586「⚠️ `PredecessorLink` に「後続（successor）」を指す要素は存在しない」）。
- **GRS での位置**: `Task` から独立したフラットテーブル `Dependency`（GRS ERD 行186-191, 273-279）。複合 PK は (`successor_uid`, `predecessor_uid`, `link_type`)。
- **増えた列**: **`successor_uid`**。MSPDI にはこの列が存在しない。GRS ERD 自身が出所を明記している: 「`int successor_uid PK` `← 親Task（複合PK・後続）`」（GRS ERD 行187, 274, 1546）。すなわち MSPDI の XML では「`PredecessorLink` の親要素が誰か（＝どの `Task` の子か）」という**暗黙の木構造上の位置**が後続タスクを表しており、GRS はこれを明示列へ昇格させた。
- **減った列**: なし。`PredecessorUID`→`predecessor_uid`、`Type`→`link_type`、`LinkLag`→`lag`、`LagFormat`→`lag_format` は保持。`CrossProject`/`CrossProjectName` の 2 列のみ Carry へ落とした（GRS ERD 行1550付近、仕分け台帳 §7.2 行506）。
- **変えた理由が原典に書かれているか**: **部分的に書かれている**。「なぜ独立エンティティにしたか」自体を一文で述べた箇所は無いが、次の記述から再構成できる: GRS ERD §5.0（行136）「`Dependency`＝依存線＝コアドメイン（自動配線）。Task 間の関係で、WBS とも `TaskGroup` とも独立」、および §8I #4（行1807）「MSPDI は依存線に ID を振らない（`PredecessorLink` に識別子なし）ので自然キーが素直」。**ただし「なぜ Task の子要素からフラットな独立テーブルへ変えたか」を明示的に述べた一文は見当たらない**（依存線を自動配線エンジンの入力として扱うための設計判断と推測できるが、原典に明記なし）。

### B. `Task.OutlineLevel`（＋文書順） → `Task.wbs_parent_uid` / `Task.wbs_order`

- **MSPDI での位置**: `Task` の兄弟スカラー要素 `OutlineLevel`（xsd:integer、`minOccurs=0`）。親へのポインタ要素は XSD に存在せず、階層は「深さの数値」＋「文書順」で暗黙に表現される（仕分け台帳 行70「親ポインタは無い」）。
- **GRS での位置**: `Task.wbs_parent_uid`（自己参照 FK）＋ `Task.wbs_order`（GRS ERD 行254-256）。
- **増えた列**: `wbs_parent_uid`（親タスクへの直接ポインタ。MSPDI に対応列なし）。
- **減った列**: `OutlineLevel` 自体はネイティブ JSON に保存しない（Reconstruct、export 時に `wbs_parent_uid` の木の深さから算出）。`OutlineNumber` も同様に保存しない（GRS ERD 行1629-1631, 仕分け台帳 行420-421）。
- **理由の記述**: **あり**。GRS ERD §5.5e（行788, 856）「MSPDI の階層は `OutlineLevel`＋文書順の暗黙表現で、XSD 上の制約が何も無い」ため、欠落・レベル飛び・先頭≠1 等の異常を正規化する必要があり、直接の親ポインタへ変換することで「深さをクランプせず保持し、export のたびに木から算出する」設計を可能にした、と明記されている。

### C. `Task/ExtendedAttribute`（値層コレクション） → `Task.fadeInDays` / `Task.fadeOutDays`（固定2列、GRS 予約枠のみ）

- **MSPDI での位置**: `Tasks/Task/ExtendedAttribute`（新 ERD §5.10、XSD 行2248）。`FieldID`/`Value`/`ValueGUID`/`DurationFormat` の4列を持つ**繰り返し可能な値層コレクション**（`maxOccurs=unbounded`）。対応する定義は `Project/ExtendedAttributes/ExtendedAttribute`（定義層、新 ERD §5.4）にある。
- **GRS での位置**: `Task` の固定2列 `fadeInDays` / `fadeOutDays`（GRS ERD 行269-270）。
- **増えた列**: なし（`Task` に新設される2列自体は GRS 追加だが、MSPDI 側の `ExtendedAttribute` 要素の**構造**としては列が増えたわけではない）。
- **減った列**: `FieldID`/`ValueGUID`/`DurationFormat` という値層の参照的な列は、GRS が予約した枠に該当する分だけ `Task` の直接列へ吸収されて消える（**GRS が使う `FieldID` だけ Consume。他ツール由来の `FieldID` は従来どおり Carry** — GRS ERD 行901）。
- **理由の記述**: **あり（詳細に記述されている）**。GRS ERD §5.5f（行863-931）に、①なぜ `TaskVisual` でなく `Task` に置くか（拡張領域は MSPDI の一部なので「Task は MSPDI 由来の列のみ」の原則に反しない、行867）、②`FieldID` 固定枠＋衝突検出の規約（行889-899）、③値が無いときは要素を書かない（行905-907）まで明記されている。

### D. `Calendar` 配下の非稼働日 2 系統 → `Exception`（新形式）への一本化

- **MSPDI での位置**: MSPDI は非稼働日を **2 系統**で表現できる。①`WeekDay.DayType=0`（例外日）＋`WeekDay/TimePeriod`（旧 Project 2003 形式、新 ERD §5.26）、②`Calendar/Exceptions/Exception`（`Name`/`TimePeriod`/`DayWorking`、新 ERD §5.28-5.30、2007 形式）。
- **GRS での位置**: `Exception` のみ採用。`WeekDay.DayType` は 1-7（日〜土）の曜日繰返しのみを Own とし、`DayType=0`＋`TimePeriod` の組は**不採用**として要素まるごと Carry へ退避する（GRS ERD 行1587, §5.5b 行636-665）。
- **増えた列**: なし。
- **減った列**: `WeekDay.TimePeriod`（旧形式の `FromDate`/`ToDate`）はネイティブ列として持たない（Carry）。
- **理由の記述**: **あり**。GRS ERD §5.5b（行642-644）が表で「新形式（2007）に一本化」と明記し、`Exception.Type`（1-9）を読まないと「元日を Type=2, Occurrences=11 と書いたファイルを『2020〜2030 の 11 年間が非稼働』と誤解釈する」具体例まで示している（行650-658）。

### E. `Exception/TimePeriod`（値オブジェクト） → `Exception.from_date`/`to_date`（列へ吸収、エンティティ消滅）

- **MSPDI での位置**: `Calendar/Exceptions/Exception/TimePeriod`（新 ERD §5.29、XSD 行1342）。`Exception` の子として 0..1 で現れる別要素。
- **GRS での位置**: 独立の行を持たず `Exception.from_date` / `Exception.to_date` という `Exception` 自身の列に畳み込まれる（GRS ERD 行306-307, §7.4 行1590）。
- **増えた列/減った列**: 列としては実質同じ（`FromDate`→`from_date`、`ToDate`→`to_date`）。**変わったのはエンティティの有無**（MSPDI 側は独立要素、GRS 側は親の列）。
- **理由の記述**: GRS ERD 自体には「なぜ畳み込んだか」の明示的な一文は無いが、仕分け台帳 §6.2(c)（行375-376）に「`TimePeriod` は親に 0..1 なので value-object として親フィールドに畳込」という一般原則が示されている。

### F. `Resource`（71列） → 軽量ネイティブ（5列）＋残り66列 Carry

- **MSPDI での位置**: `Resources/Resource`（新 ERD §5.14、直下の子71個）。
- **GRS での位置**: `Resource` エンティティは残るが、Own/Consume として理解する列は `uid`/`name`/`type`/`is_cost_resource`/`calendar_id` の**5列だけ**（GRS ERD §5.5 行520-524）。
- **増えた列**: なし。
- **減った列**: 残り66列（工数・コスト・EVM・enterprise・子要素すべて）はネイティブ構造を持たず Carry。
- **理由の記述**: **あり**。「担当者名をバーに表示する」という要求のため（GRS ERD 行516, 527）、`IsCostResource` を Own に追加した理由も明記（行569「`Type` だけでは判別できないため」）。

### G. `Assignment`（265列） → 軽量ネイティブ（3列）＋残り262列 Carry

- **MSPDI での位置**: `Assignments/Assignment`（新 ERD §5.20、直下の子265個）。
- **GRS での位置**: Own/Consume として理解する列は `uid`/`task_uid`/`resource_uid` の**3列だけ**（GRS ERD §5.5 行524-525）。
- **増えた列**: なし。
- **減った列**: 残り262列（`Units`・工数・コスト・EVM・201予約枠・子要素すべて）は Carry。
- **理由の記述**: **あり**。同上「担当者表示」の要求（GRS ERD 行527「MVP で割当の追加・編集・解除を行い、MSPDI へ書き戻す」）。副産物として「MSPDI の UID 参照7つが全て Consume になった」という設計上の波及効果も明記されている（GRS ERD §8I #8-#9、行1811-1812）。

---

## 3. MSPDI にあって GRS に無いエンティティ（全 24、行き先はすべて Carry）

新 ERD の33エンティティから、§1 で「同じ形で持つ／形を変えて持つ／列へ吸収」に分類した9エンティティ（Project, Task, Calendar, WeekDay, Exception, PredecessorLink, Resource, Assignment, ExceptionTimePeriod）を除いた**残り24エンティティ**。すべて **Carry**（GRS はネイティブ構造を持たず、エンティティ別バッグへ不透明に温存。GRS ERD §5.5d）。**行き先が無い＝Drop になっているものは無い**（GRS ERD §8D「Drop: なし（Drop=0）」、行1715。ただし §5 で述べる Drop=0 の限定的な例外を参照）。

| # | MSPDI エンティティ（XSD 行） | Carry の種別 |
|---|---|---|
| 1 | `OutlineCode`（定義層・行736） | 要素まるごと |
| 2 | `OutlineCode/Values/Value`（行775） | 同上 |
| 3 | `OutlineCode/Masks/Mask`（行866） | 同上 |
| 4 | `WBSMasks`/`WBSMask`（行913/939） | 同上 |
| 5 | `ExtendedAttribute`（定義層・行986） | 要素まるごと（GRS 予約枠を除く） |
| 6 | `ExtendedAttribute/ValueList/Value`（行1157） | 要素まるごと |
| 7 | `Task/ExtendedAttribute`（値層・行2248） | 要素まるごと（GRS 枠2件は §2-C で例外） |
| 8 | `Task/Baseline`（行2307） | 要素まるごと |
| 9 | `Task/OutlineCode`（値層・行2413） | 要素まるごと |
| 10 | `TimephasedData`（行27、5参照経路） | 要素まるごと |
| 11 | `Resource/ExtendedAttribute`（行2912） | 要素まるごと |
| 12 | `Resource/Baseline`（行2971） | 要素まるごと |
| 13 | `Resource/OutlineCode`（行3005） | 要素まるごと |
| 14 | `AvailabilityPeriod`（行3057） | 要素まるごと |
| 15 | `Rate`（行3090） | 要素まるごと |
| 16 | `Assignment/ExtendedAttribute`（行3581） | 要素まるごと |
| 17 | `Assignment/Baseline`（行3640） | 要素まるごと |
| 18 | `f404000`〜`f4040c8`（201予約枠・行3691-3891） | 要素まるごと（1項目に折畳んで記録） |
| 19 | `WeekDay/TimePeriod`（旧2003形式・行1269） | 要素まるごと |
| 20 | `WeekDay/WorkingTimes/WorkingTime`（行1295） | 要素まるごと |
| 21 | `Exception/WorkingTimes/WorkingTime`（行1475） | 要素まるごと |
| 22 | `WorkWeek`（行1514） | 要素まるごと |
| 23 | `WorkWeek/TimePeriod`（行1520） | 要素まるごと |
| 24 | `WorkWeek/WeekDay`（行1553） | 要素まるごと |

さらに `Task`/`Resource`/`Assignment`/`Project`/`Calendar`/`WeekDay`/`Exception` の**列レベル**でも大量の Carry がある（Task の制約/工数/コスト/EVM/CPM派生/平準化/サブPJ/enterprise/補助列、Project の42列、Resource の66列、Assignment の262列等）。これらは「エンティティが無い」のではなく「エンティティは残るが列を持たない」であり、本節の対象外（§1 の表を参照）。

---

## 4. GRS にあって MSPDI に無いエンティティ（全 6）

GRS ERD §6（行1476-1494）の凡例「‼️（4テーブル）= MSPDI に対応が無い GRS 新設」に、§5.8（行1405-1432）の `Comment`/`HighlightBox` を加えた計6エンティティ。**すべて非 export**（MSPDI へは書き出さない）。

| # | GRS エンティティ | 層 | 典拠 |
|---|---|---|---|
| 1 | `TaskGroup` | コア（マルチバー行の器） | GRS ERD 行1481 |
| 2 | `TaskGroupMember` | コア（Task↔行の所属） | GRS ERD 行1482 |
| 3 | `TaskVisual` | 視覚 | GRS ERD 行1490 |
| 4 | `TaskOrigin` | 出自（マージ判定用） | GRS ERD 行1491 |
| 5 | `Comment` | 注記 | GRS ERD §5.8 行1414-1422 |
| 6 | `HighlightBox` | 注記 | GRS ERD §5.8 行1424-1431 |

**注**: `Dependency` は MSPDI 対応が無い新設エンティティ**ではない**（`PredecessorLink` からの Consume・§2-A）。誤って GRS 新設に数えないよう注意。また `documentSettings`（GRS ERD §5.7-1）は単一オブジェクト（多重度を持たない文書設定の集合）であり、多重度のある「エンティティ」としては数えていない（GRS ERD 行344「文書全体の設定... 本 ERD では省略」）。同様に `carryElements`（JSON 実例）や `revisionStamp`/`changeLog`（同）も、GRS ERD の33エンティティ一覧には存在しない構造である（§6 参照）。

---

## 5. 前プロジェクトの ERD の誤り（全 3 件）

### 誤り1: 仕分け台帳の内部矛盾（表 vs 検算文の内訳不一致）

- **ファイル**: `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md`
- **食い違う箇所**: 行638（Appendix B の表）と行643（同じ Appendix B の「検算」文）
- **内容**: 行638の表は `Project` 行を「Own **17**／Consume 1／Reconstruct **3**／Carry **42**」（合計63）と示す。この内訳は §7.3（行512-525）の詳細な列挙（識別/文書11列＋StartDate/StatusDate2列＋MinutesPerDay等4列＝Own17、CalendarUID＝Consume1、SaveVersion/CurrencyCode/FinishDate＝Reconstruct3）と一致する。ところが直後の行643「検算: Own **18** ＋ Consume 1 ＋ Reconstruct **1** ＋ Carry **43** = 63」は、**同じ63という合計に対して異なる内訳**を主張しており、表とも §7.3 の詳細列挙とも矛盾する。
- **判定**: XSD 側の事実（Project 直下スカラー63個）自体は正しい。誤っているのは Own/Consume/Reconstruct の**内訳の記述**（表と検算文のどちらか、あるいは両方が古い版の残骸である可能性が高いが、原典からは断定できない＝**未検証**）。

### 誤り2: GRS ERD の `WorkingTime` が「共有される単一エンティティ」として描かれている（XSD と食い違う）

- **ファイル**: `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` 行126-127（ERD 図）、および行334（entity一覧表 #9 `WorkingTime`）
- **XSD 側**: `docs/reference/mspdi/mspdi-erd-ja.md` §5.13（行637）「（`TimephasedDataType`）… **このXSD全体で唯一の名前付き（グローバル）complexType** である」（`grep -n '<xsd:complexType name='` で確認、新 ERD §8.1 行1198 でも「1（`TimephasedDataType`、27行）」と再確認済み）
- **食い違いの内容**: 仕分け台帳の ERD は
  ```
  Calendar_WeekDay ||--o{ WorkingTime : "WorkingTimes(≤5)"
  Calendar_Exception ||--o{ WorkingTime : "WorkingTimes(≤5)"
  ```
  と、**単一の `WorkingTime` エンティティ**を `Calendar_WeekDay` と `Calendar_Exception` の双方から参照される共有テーブルとして描いている。しかし正本 XSD では、名前付き（＝複数箇所から共有できる）complexType は `TimephasedDataType` の1つだけであり、`WeekDay/WorkingTimes/WorkingTime`（新 ERD §5.27、行1295）と `Exception/WorkingTimes/WorkingTime`（新 ERD §5.30、行1475）は**それぞれ独立した匿名 complexType**である（構造は `FromTime`/`ToTime` で同一だが、XSD 上は別々に定義された別の型）。
- **判定**: 表現の単純化としては理解できるが、「共有エンティティ」という ER 図の意味論（1つの実体を複数の親が参照する）は XSD の実際の型定義とは異なる。**XSD と食い違う**。

### 誤り3: GRS ERD の `‼️` マーカーの適用が不徹底（凡例と本文の食い違い）

- **ファイル**: `previous-project-result/02-data-model/grs-native-erd-ja.md`
- **食い違う箇所**: §6 の凡例（行1494「**‼️**（4テーブル）= MSPDI に対応が無い GRS 新設」）と §5.8（行1405-1432、`Comment`/`HighlightBox` のフィールド定義）
- **内容**: §5.1 冒頭の凡例（行149）は「**‼️ = MSPDI に対応が無い GRS 新設**（テーブル/カラム）」と定め、`TaskGroup`/`TaskVisual` 等のフィールド一覧では実際に全カラムへ `‼️` を付している（例: 行175「`string id PK "‼️ 行の器（非export・UUID）"`」）。ところが同じく MSPDI に対応の無い GRS 新設エンティティである `Comment`/`HighlightBox`（§5.8、行1414-1431）のフィールド一覧には `‼️` が一切付いていない。
- **判定**: 内容（MSPDI に対応が無い）自体に誤りは無いが、**自ら定めた表記規約（凡例）を本文の一部で適用していない**という文書内の不徹底。

---

## 6. JSON 実例との食い違い（全 3 件）

対象: `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json`

### (1) `schemaVersion` の置き場所

- **GRS ERD の記述**: `Project` エンティティの列として定義（GRS ERD 行241「`string schema_version` `‼️ GRS スキーマ版（移行判別）`」）。
- **JSON 実例**: `schemaVersion`（JSON 行2）は **文書のトップレベルキー**であり、`project` オブジェクト（JSON 行20-30）の**外側**にある。ERD が「`Project` の列」と定義する項目が、実例では `Project` に属さない位置に置かれている。

### (2) `carryElements` の置き場所（アーキテクチャ上の食い違い）

- **GRS ERD の設計**: §5.5d（行679-750）は Carry の格納方式を「B: エンティティ別 carry バッグ」として確定し、明示的に「C: グローバルなパス→値表」案を却下している（行690「✗ B の欠点を持ち B の利点を失う」）。要素まるごと Carry は「**親の** `carry_elements: [ { name, ordinal, fields, children } ]`」（行700）として**各エンティティの行に埋め込む**設計であり、§5.5d の JSON 例（行765-777）でも `carry_elements` は `Task` オブジェクトの**内側**のキーとして示されている。
- **JSON 実例**: `"carryElements": []`（JSON 行95）は `tasks`/`taskGroups`/`resources` 等と並ぶ**文書のトップレベルキー**であり、個々の `Task` オブジェクト（JSON 行37-48等）の内側には `carryElements` に相当するキーが無い。
- **判定**: 実例の構造は、GRS ERD が明示的に却下した「グローバルなパス→値表」案に近い形をしており、ERD 本文が確定させた「エンティティ別バッグ」設計と一致しない。

### (3) `revision` の二重存在（命名の衝突・要確認）

- **GRS ERD の記述**: `Project.revision`（GRS ERD 行245「`int revision` `← Revision(Own)`」）。
- **JSON 実例**: `project` オブジェクト（JSON 行20-30）には `revision` キーが**存在しない**。代わりに文書トップレベルの `revisionStamp.revision`（JSON 行4-8）という**別の値**（agent 向けインタフェースの改訂番号）がある。
- **判定**: **未検証**。このサンプルが `agent-interface-spec-ja.md` の `revisionStamp`/`changeLog` の説明に特化しており `project` オブジェクトの全列を意図的に省略しているだけなのか、`Project.revision`（Own 列）自体が実装から漏れているのかは、読んだ4資料だけからは判断できない。ただし同名 `revision` が異なる意味で2箇所に存在しうる構造は、実装時の混同リスクとして記録に値する。

---

## 7. 数

- **MSPDI エンティティ総数（新 ERD §4 が数えた値）**: **33**
- **§1 対応表の内訳**: 同じ形で持つ=5／形を変えて持つ=3／列へ吸収されエンティティ消滅=1／持たない(Carry)=24（5+3+1+24=33）
- **GRS が構造を変えた箇所（§2）**: **7 件**（A. PredecessorLink→Dependency／B. OutlineLevel→wbs_parent_uid・wbs_order／C. Task/ExtendedAttribute→fadeInDays・fadeOutDays／D. 非稼働日2系統→Exception一本化／E. Exception/TimePeriod→列へ吸収／F. Resource軽量化／G. Assignment軽量化）
  - うち「変えた理由が原典に書かれている」: 6件（B, C, D, F, G は明記あり／A は部分的〈「独立させた理由」自体は明記なし、「複合PKにした理由」は明記あり〉／E は仕分け台帳に一般原則の言及のみ）
  - **⚠️ 必須指定の `PredecessorLink`→`Dependency`（A）は、新たに `successor_uid` 列を追加している。この列は MSPDI の「`PredecessorLink` の親要素＝後続タスク」という暗黙の木構造上の位置から来ている**（GRS ERD 行187, 274, 1546 に明記）。
- **MSPDI にあって GRS に無いエンティティ（§3）**: **24**（すべて Carry。Drop になっているものは無い）
- **GRS にあって MSPDI に無いエンティティ（§4）**: **6**（`TaskGroup`／`TaskGroupMember`／`TaskVisual`／`TaskOrigin`／`Comment`／`HighlightBox`。すべて非 export）
- **前プロジェクトの ERD の誤り（§5）**: **3 件**（仕分け台帳の内部矛盾1件、仕分け台帳のXSDとの食い違い1件、GRS ERDの表記不徹底1件）
- **JSON 実例との食い違い（§6）**: **3 件**（`schemaVersion` の置き場所、`carryElements` の置き場所、`revision` の二重存在〈1件は未検証と明記〉）
- **典拠として引用した行番号の総数**: 本書全体で XSD 側・前プロジェクト側あわせて 100 箇所以上を `ファイル名:行番号` で明示した（各節参照）。
