# E06 — Resource + Assignment

`Resource` と `Assignment`（軽量ネイティブ化されている 2 エンティティ）の全数調査である。
**推測は書かない。** 原典で確かめられないことは「**未検証**」と明記した。
**数は自分で数えた**（数え方は §1 と §10 / §11 の冒頭に書いた）。

## 0. 読んだ原典

| 原典 | 行数 | 読んだ範囲 |
| --- | --: | --- |
| `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.5 / §5.5a / §5.5a-2 / §7.5 を含む） |
| `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文** |
| `docs/reference/mspdi/mspdi_pj12.xsd`（MSPDI の正） | 3906 | `Resources`/`Resource`（2486-3184）・`Assignments`/`Assignment`（3185-3906）・`TimephasedDataType/UID`（187）・`*UID` 要素の全数抽出 |
| `docs/spec/_assets/tbl-glossary.md`（仕様書の用語の正） | 259 | **全文**（名前の突合） |
| `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md`（予実の正） | 1348 | **抜粋**（505-535 / 1275-1310 と `Resource`/`Assignment`/担当の全出現箇所。全文は読んでいない） |
| `previous-project-result/OPEN-ITEMS-ja.md` | 126 | 項 4（88-105） |
| `previous-project-result/02-data-model/grs-document-settings-ja.md` | 631 | `assigneeVisible` の 2 箇所（242 / 280） |

> **出典の書き方**: `ファイル名:行番号`。ファイル名は上表の basename を使う。複数行は ` / ` で並べる。
> **`docs/spec/output/` と `docs/spec/__pycache__/` は読んでいない。破棄された設計を git 履歴から掘り起こしてもいない。**

## 1. 決定 — 軽量ネイティブ化して列を 8 つに絞った

**目的は 1 つだけである: 担当者名をバーに表示し、割当を編集して MSPDI へ書き戻すこと。**
資源管理（工数・コスト・割当率・平準化）は引き続き非対象で、**残りは全て Carry で温存する**
（`grs-native-erd-ja.md:516` / `:518` / `grs-mspdi-field-ledger-ja.md:61` / `:563` / `:586`）。

当初案は「`Resource` / `Assignment` を丸ごと Carry」であり、**担当者名の表示要求で軽量ネイティブ 8 列へ変えた**
（`grs-native-erd-ja.md:1811`）。副産物として MSPDI の UID 参照 7 つが全て `Consume` になった（§5）。

**数え直し（自分で数えた）**

| 数えたもの | 数 | 内訳 | 出典 |
| --- | --: | --- | --- |
| 理解する列（8 列の正体） | **8** | `Resource` 5（`uid` / `name` / `type` / `is_cost_resource` / `calendar_id`）＋ `Assignment` 3（`uid` / `task_uid` / `resource_uid`） | `grs-native-erd-ja.md:518` / `:520`-`:525` / `:1595` / `:1599`-`:1606` |
| うち `Own` | **5** | `Resource` 4（`uid` / `name` / `type` / `is_cost_resource`）＋ `Assignment` 1（`uid`） | `grs-native-erd-ja.md:522` / `:524` / `grs-mspdi-field-ledger-ja.md:640` / `:641` |
| うち `Consume` | **3** | `Resource` 1（`calendar_id`）＋ `Assignment` 2（`task_uid` / `resource_uid`） | `grs-native-erd-ja.md:523` / `:525` |
| `Resource` の XSD 直下子要素 | **71** | スカラー 65 ＋ 子要素 6（`ExtendedAttribute` / `Baseline` / `OutlineCode` / `AvailabilityPeriods` / `Rates` / `TimephasedData`） | `mspdi_pj12.xsd:2497`-`:3184`（機械計数） |
| `Assignment` の XSD 直下子要素 | **265** | スカラー 61 ＋ enterprise 予約枠 201（`f404000`〜`f4040c8`）＋ 子要素 3 | `mspdi_pj12.xsd:3196`-`:3906`（機械計数） |
| XSD で必須な直下子要素 | **各 1** | `Resource` / `Assignment` とも `UID` だけ（`minOccurs` 属性が無い要素は 1 個ずつ） | `mspdi_pj12.xsd:2498` / `:3197` |
| 台帳の列挙と XSD の突合 | **差分 0** | 台帳 §7.5 の 65 名・§7.6 の 61 名は XSD と完全一致（欠落 0・余剰 0） | `grs-mspdi-field-ledger-ja.md:566`-`:582` / `:588`-`:597`（自分で集合比較） |

> **`Resource` の Own は 4 列である。** 原典 `grs-native-erd-ja.md:569` は「Resource の Own は 4 列 → 5 列」と書くが、
> 5 列目の `calendar_id` は `Consume` である（同 `:523` / `:1603` / `grs-mspdi-field-ledger-ja.md:572`）。→ §未解決

## 2. `Resource` — GRS が持つ列

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | :--: | --- | --- | --- | --- |
| `uid` | `int` | ✗ | `PK` | — | `Own` | `Resource/UID` | 新規作成は `uid_high_water_mark + 1` | 文書内一意。代理キーを持たない。**XSD は `minOccurs` 指定が無く必須**（自分で確認）。`null` でも export では必ず書く（必須要素は既定値を焼く）。取込で衝突したら**必ず再採番**（`Task` 以外の全 UID）。Carry の付着キーでもある | `grs-native-erd-ja.md:287` / `:356` / `:500` / `:522` / `:708` / `:1599` / `mspdi_pj12.xsd:2498` / `grs-mspdi-field-ledger-ja.md:568` |
| `name` | `string` | ○ | — | — | `Own` | `Resource/Name` | 取込時は原値（無ければ `null`）／新規作成は入力文字列 | **担当ラベルの表示元**。非空でなければ表示対象から外す。同名判定（自動統合・新規作成の再利用）は **NFKC 正規化 ＋ trim 後の完全一致**で、**判定を 2 つ持たない**。改名すると使用中の全タスクの表示が変わるので件数を人に知らせる。XSD: `xsd:string`・maxLength 512（自分で確認） | `grs-native-erd-ja.md:288` / `:498` / `:550` / `:576` / `:595` / `:598` / `:1600` / `mspdi_pj12.xsd:2508` / `grs-mspdi-field-ledger-ja.md:569` |
| `type` **要改名** → `resourceKind` | `int`（`0` = 材料 / `1` = 作業） | ○ | — | — | `Own` | `Resource/Type` | **保存は `null` のまま**（元ファイルに無ければ `null`）。**表示の判定でだけ `1` とみなす**。GRS が新規に作る資源は `1` を明示して書く | 担当者として表示するのは `1`（作業）のみ。材料は除外。**人と設備は区別しない**（MSPDI に「人だ」というフラグが無い）。**編集しない**（取り込んだ値を保つ）。XSD の列挙は `{0,1}` の 2 値だけ・`minOccurs=0`（自分で確認）。⚠️ **`type` は汎用語禁止（`type`/`data`/`info`/`value`）に触れる** | `grs-native-erd-ja.md:289` / `:547` / `:558` / `:564` / `:567` / `:575` / `:607` / `:616` / `:1601` / `mspdi_pj12.xsd:2518` / `grs-mspdi-field-ledger-ja.md:570` / `:661` |
| `is_cost_resource` **要改名** → `isCostResource` | `bool` | ○ | — | — | `Own` | `Resource/IsCostResource` | `null`（新規作成では書かない） | `1` の資源は担当者として表示しない（旅費・予備費などの費用項目を除外）。**`Type` は 2 値しかなく費用を判別できないため必要**。**編集しない**。XSD: `xsd:boolean`・`minOccurs=0`（自分で確認） | `grs-native-erd-ja.md:290` / `:548` / `:565` / `:569` / `:593` / `:616` / `:1602` / `mspdi_pj12.xsd:3030` / `grs-mspdi-field-ledger-ja.md:571` |
| `calendar_id` **要改名** → `calendarId` | `int` | ○ | `FK` | `Calendar.id` | `Consume` | `Resource/CalendarUID` | `null` | 個人暦の参照。**GRS は既定暦で描画し個別暦は現状未使用**だが、**Carry に UID 参照を残さない**不変条件（§5）のため構造化して保持する。**編集しない**。XSD: `xsd:integer`・`minOccurs=0`（自分で確認） | `grs-native-erd-ja.md:222` / `:291` / `:523` / `:534` / `:616` / `:1019` / `:1603` / `mspdi_pj12.xsd:2841` / `grs-mspdi-field-ledger-ja.md:572` |
| `ID`（**保存しない**） | `int` | — | — | — | `Reconstruct` | `Resource/ID` | — | 正規 JSON に持たず export で作り直す。原典は「resources 配列の **0 起点**連番」と書く。⚠️ **0 起点か 1 起点かは XSD からは決まらない（未検証）** — XSD の説明は "The position identifier of the resource within the list of resources." だけである（自分で確認） | `grs-native-erd-ja.md:1635` / `mspdi_pj12.xsd:2503` / `grs-mspdi-field-ledger-ja.md:573` |
| `carry` | `object<string, string>`（フィールド名 → 原文字列） | ○（新規行は空） | — | — | `Carry` | `Resource` の解釈しないスカラー **59**（全数は §10） | 新規作成した資源は `{}` | GRS は意味を使わない。**XML 文字列としてではなく JSON の構造で持つ**（読める・差分が取れる）。import の自己検証で「ネイティブ列（`null` は出力しない）＋ `carry` ＋ `carry_elements`」の再合成が原要素と一致しなければ、**要素まるごと Carry へ退避**する。マージの自動統合では**取込側の `carry` が失われる**（明示許容の唯一の Drop） | `grs-native-erd-ja.md:699` / `:702` / `:745` / `:510` / `:626` / `:1703` / `grs-mspdi-field-ledger-ja.md:640` |
| `carry_elements` **要改名** → `carryElements` | `array<{ name, ordinal, fields, children }>` | ○（新規行は空） | — | — | `Carry` | `Resource` の子要素 **6**（全数は §10） | 新規作成した資源は `[]` | ネイティブ行を作らない要素を原形のまま保持する。コレクション内の**全要素に同一の番号空間で `ordinal`** を振り、export は `ordinal` 順に出す（原順序の復元）。⚠️ **`Resource` 行そのものの `ordinal` 列は原典に無い** → §未解決 | `grs-native-erd-ja.md:700` / `:709` / `:715` / `:716` / `grs-mspdi-field-ledger-ja.md:640` |

## 3. `Assignment` — GRS が持つ列

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | :--: | --- | --- | --- | --- |
| `uid` | `int` | ✗ | `PK` | — | `Own` | `Assignment/UID` | 新規作成は `uid_high_water_mark + 1` | 文書内一意。代理キーを持たない。**XSD は `minOccurs` 指定が無く必須**（自分で確認）。**MSPDI は 1 から採番するのが普通なので 2 ファイル目で必ず衝突する** → 衝突したら**必ず再採番**する（規則が無いと PK 重複が起き、代理キー廃止の前提が崩れる） | `grs-native-erd-ja.md:294` / `:357` / `:499` / `:500` / `:502` / `:524` / `:1604` / `mspdi_pj12.xsd:3197` / `grs-mspdi-field-ledger-ja.md:590` |
| `task_uid` **要改名** → `taskUid` | `int` | ○ | `FK` | `Task.uid` | `Consume` | `Assignment/TaskUID` | 新規作成時に埋める | 担当者表示の経路の 1 本目（`Task` →（`task_uid`）→ `Assignment`）。XSD 上 **`minOccurs=0`＝省略可**で（自分で確認）、**欠落した `Assignment` はネイティブ行を作らず要素まるごと Carry** へ退避する。自然キー (`task_uid`, `resource_uid`) が一致すれば取込時に統合。`Task` 削除で**連鎖削除**する | `grs-native-erd-ja.md:220` / `:295` / `:499` / `:525` / `:534` / `:673` / `:700` / `:1605` / `mspdi_pj12.xsd:3202` / `grs-mspdi-field-ledger-ja.md:591` |
| `resource_uid` **要改名** → `resourceUid` | `int` | ○ | `FK` | `Resource.uid` | `Consume` | `Assignment/ResourceUID` | 新規作成時に埋める | 担当者表示の経路の 2 本目（`Assignment` →（`resource_uid`）→ `Resource.name`）。**未割当は `null` に正規化**する（MS Project 慣行の `-1` は Adapter 境界に閉じ込める。**`-1` は XSD 非規定** — 型は `xsd:integer` で列挙も既定値も無い＝自分で確認）。表示では文書内で解決できないものを除外。`Resource` 削除で**連鎖削除**する | `grs-native-erd-ja.md:221` / `:296` / `:525` / `:546` / `:577` / `:675` / `:1606` / `mspdi_pj12.xsd:3207` / `grs-mspdi-field-ledger-ja.md:592` |
| `carry` | `object<string, string>`（フィールド名 → 原文字列） | ○（新規行は空） | — | — | `Carry` | `Assignment` の解釈しないスカラー **58** ＋ enterprise 予約枠 **201**（全数は §11） | 新規作成した割当は `{}` | GRS は意味を使わない。**割当率 `Units` はここに入り、表示も編集もしない**。`Assignment` を連鎖削除すると `carry`（`Units`・工数・コスト・201 枠）も消えるので、**消えたことを通知する** | `grs-native-erd-ja.md:616` / `:677` / `:699` / `:1608` / `:1703` / `grs-mspdi-field-ledger-ja.md:641` |
| `carry_elements` **要改名** → `carryElements` | `array<{ name, ordinal, fields, children }>` | ○（新規行は空） | — | — | `Carry` | `Assignment` の子要素 **3**（全数は §11） | 新規作成した割当は `[]` | ネイティブ行を作らない要素を原形のまま保持し、`ordinal` 順で書き戻す。⚠️ **`Assignment` 行そのものの `ordinal` 列は原典に無い** → §未解決 | `grs-native-erd-ja.md:700` / `:709` / `:716` / `grs-mspdi-field-ledger-ja.md:641` |

## 4. ネイティブ行を作らない場合（要素まるごと Carry）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | :--: | --- | --- | --- | --- |
| `carry_elements[]`（`IsNull=1` の資源） | 要素 | ○ | — | — | `Carry` | `Resource`（`IsNull=1` の行まるごと） | — | 欠番行は「行」ではあっても資源ではないので**ネイティブ行を作らない**。原位置・原形のまま往復する。併せて「**Carry 内の UID も使用済みとして扱う**」規約がある（再採番で衝突させないため） | `grs-native-erd-ja.md:700` / `:1731` / `grs-mspdi-field-ledger-ja.md:574` |
| `carry_elements[]`（`TaskUID` 欠落の割当） | 要素 | ○ | — | — | `Carry` | `Assignment`（`TaskUID` 欠落の行まるごと） | — | どのタスクにも付かない割当はネイティブ化しない。XSD 上 `TaskUID` は `minOccurs=0`（自分で確認） | `grs-native-erd-ja.md:700` / `mspdi_pj12.xsd:3202` / `grs-mspdi-field-ledger-ja.md:591` |
| `carry_elements[]`（入口の自己検証に失敗した要素） | 要素 | ○ | — | — | `Carry` | `Resource` / `Assignment` のうち再合成 ≠ 原要素だったもの | — | import 時に「ネイティブ列 ＋ `carry` ＋ `carry_elements`」を再合成して原要素と比較し、**一致しなければネイティブ化を諦めて要素まるごと退避**（警告を記録）。**漏れがあっても失われない**。未知要素（将来の拡張・スキーマ外）もここで捕まる | `grs-native-erd-ja.md:745` / `:747` / `:750` |
| `carry_elements[]`（参照が解決できない割当） | 要素 | ○ | — | — | `Carry` | `Assignment`（UID が文書内で解決できないもの） | — | export の出口検査「参照の解決」で、ネイティブ `Assignment` の UID が文書内で解決できなければ Carry へ退避する。⚠️ **未割当（`resource_uid = null`）とこの「解決できない」の切り分けは原典に明文が無い** → §未解決 | `grs-native-erd-ja.md:759` |

## 5. 不変条件 — **Carry に `UID` の参照が残らない**

**MSPDI の整数 UID 参照は全 7 つで、`Resource` / `Assignment` の格上げにより全部が `Consume` になった。**
自分で数えた: XSD の `*UID` 要素から自己識別（`Project`/`Task`/`Calendar`/`Resource`/`Assignment`/`TimephasedData` の各 `UID`）を除くと、
残る他者参照は次の 7 つだけである（`mspdi_pj12.xsd` の該当行を機械抽出）。

| UID 参照 | 分類 | 出典 |
| --- | :--: | --- |
| `Project/CalendarUID` | `Consume` | `mspdi_pj12.xsd:414` / `grs-native-erd-ja.md:533` |
| `Calendar/BaseCalendarUID` | `Consume` | `mspdi_pj12.xsd:1230` / `grs-native-erd-ja.md:533` |
| `Task/CalendarUID` | `Consume` | `mspdi_pj12.xsd:2011` / `grs-native-erd-ja.md:533` |
| `Task/PredecessorLink/PredecessorUID` | `Consume` | `mspdi_pj12.xsd:2168` / `grs-native-erd-ja.md:533` |
| **`Resource/CalendarUID`** | `Consume`（本領域で格上げ） | `mspdi_pj12.xsd:2841` / `grs-native-erd-ja.md:534` |
| **`Assignment/TaskUID`** | `Consume`（本領域で格上げ） | `mspdi_pj12.xsd:3202` / `grs-native-erd-ja.md:534` |
| **`Assignment/ResourceUID`** | `Consume`（本領域で格上げ） | `mspdi_pj12.xsd:3207` / `grs-native-erd-ja.md:534` |

**なぜこの不変条件が要るか**

| 理由 | 内容 | 出典 |
| --- | --- | --- |
| UID の振り直しに構造的に追従するため | Carry は**解釈しない不透明な値の塊**なので、その中に UID 参照が残っていると、マージで UID を再採番したときに**参照が壊れる**（あるいは無関係な行を指す） | `grs-native-erd-ja.md:536` / `:537` |
| 「UID 再マップ表」という機構を丸ごと消すため | 当初は「旧 UID → 新 UID の再マップ表で Carry 内を書き換える」案だった。7 参照が全て `Consume` になったので**再マップ表は不要**になった（テーブルは 2 つ増えるが機構は 1 つ減る） | `grs-native-erd-ja.md:512` / `:1674` / `:1695`-`:1699` / `:1812` |
| passthrough の実装を単純にするため | Carry ストアは**所有エンティティの下にぶら下げ**、グローバル索引を持たない | `grs-native-erd-ja.md:537` / `:1705` |

> ⚠️ **一般化してはならない。** 「Carry に参照が一切無い」とは言えない。**8 ネイティブテーブルの整数 UID 空間
> （`Task`/`Resource`/`Calendar`/`Assignment`）を指す参照が Carry に含まれない**、という限定された主張である。
> `TimephasedData/UID`（Carry 内・必須）や `ExtendedAttribute/FieldID`・`OutlineCode/ValueID` などの**定義への参照**は Carry 内に残る。
> `TimephasedData/UID` は XSD の説明が "The unique identifier of the timephased data record" ＝**自己識別**であり
> 親 UID の写しではない（`mspdi_pj12.xsd:187`-`:190` で自分で確認）。したがって UID 振り直しで壊れない。
> ただし **2 文書の Carry を併合すると番号が衝突しうる**。
> 出典: `grs-native-erd-ja.md:1704` / `:1705` / `:1812`

## 6. どの資源を担当者とみなすか（§5.5a）

**情報源は `Assignment` → `Resource.name` だけである。`Task` に自由文字列の担当者プロパティは持たない**
（原則「Task 無汚染」。**列は増えない**）。`grs-native-erd-ja.md:541`

**MS Project の資源は概念的に 3 種類だが、MSPDI の `Type` は 2 値しかなく、費用は `IsCostResource`（bool）という別フィールドである**
（`grs-native-erd-ja.md:558` / `mspdi_pj12.xsd:2518` で自分で確認 — 列挙は `0` と `1` の 2 個だけ）。

| 種類 | 例 | 扱い | 判定 | 出典 |
| --- | --- | :--: | --- | --- |
| Work: 人 | 個人名 | **表示する** | `Type = 1` | `grs-native-erd-ja.md:562` |
| Work: 設備 | 設備・会議室 | **表示する** | 同上（**人と設備を区別しない** — MSPDI に「人だ」というフラグが存在せず、`EmailAddress` / `Phonetics` / `NTAccount` からの推測はいずれも省略可で確実でない） | `grs-native-erd-ja.md:563` / `:567` |
| Material | 資材 | 表示しない | `Type = 0` | `grs-native-erd-ja.md:564` |
| Cost | 旅費・予備費 | 表示しない | `IsCostResource = 1` | `grs-native-erd-ja.md:565` / `:569` |

**表示文字列の決め方**（`grs-native-erd-ja.md:543`-`:554`）

```
対象 = その Task の Assignment のうち
         ・resource_uid が文書内で解決できる（未割当は除外）
         ・Resource.Type = 1（Work）        ← 欠落時は 1 とみなす
         ・Resource.IsCostResource != 1     ← 費用項目を除外
         ・Resource.IsNull != 1             ← 欠番行を除外
         ・Resource.Name が非空
並び = Assignment.uid 昇順
文字列 = 先頭 1 名の Name ＋（残り m >= 1 なら「 他m名」）
対象 0 名 → 何も表示しない
```

| 付随する規則 | 内容 | 出典 |
| --- | --- | --- |
| 表示位置 | アイテムの左に右詰め。依存線の入口矢印（左辺入線）の水平部分と重ならないように置く | `grs-native-erd-ja.md:582` |
| 既定は隠す | 担当ラベルの表示切替 `assigneeVisible` の**既定は `false`**（低ズームで段数を膨らませる主因が担当ラベル＋完了率ラベルだと PoC で判明したため） | `grs-document-settings-ja.md:242` / `:280` / `plan-actual-decisions-ja.md:519`-`:525` |
| 仕様書側の名前 | UI パーツ名は `Assignee Label`（担当ラベル）、設定値キーは `assigneeVisible` | `tbl-glossary.md:77` / `:207` |

## 7. 欠落値の扱い（XSD 上いずれも `minOccurs=0`）

**XSD で確認した**（自分で確認）: `Resource/Type`（2518）・`Resource/Name`（2508）・`Assignment/ResourceUID`（3207）は
いずれも `minOccurs="0"` である。`Resource` / `Assignment` の直下で `minOccurs` の指定が無い（＝必須の）要素は `UID` だけである。

| 欠落 | 素直に実装すると起きること | 規約 | 出典 |
| --- | --- | --- | --- |
| `Resource.Type` | 「`Type != 1` だから除外」→ **人なのに担当者が出ない** | **`1`（Work）とみなす**（資源の大半は人・設備）。ただし**保存値は `null` のまま**で、export で勝手に `1` を書かない | `grs-native-erd-ja.md:575` / `:723`-`:729` / `mspdi_pj12.xsd:2518` |
| `Resource.Name` | 空文字を表示 → 区切り記号だけ残る | その資源を**表示対象から外す** | `grs-native-erd-ja.md:576` / `mspdi_pj12.xsd:2508` |
| `Assignment.ResourceUID` | 存在しない資源を引く → **クラッシュ or 誤表示** | **未割当として除外**（値は `null` に正規化） | `grs-native-erd-ja.md:577` / `:1606` / `mspdi_pj12.xsd:3207` |
| 対象が 0 名 | 「担当者なし」等を表示 | **何も表示しない** | `grs-native-erd-ja.md:578` |
| `Assignment.TaskUID` | 木にも行にも置けない割当がネイティブに紛れ込む | **ネイティブ行を作らず要素まるごと Carry** | `grs-mspdi-field-ledger-ja.md:591` / `grs-native-erd-ja.md:700` |
| 一般規則（`null` と既定値の区別） | `0` と「無い」を潰すと**往復の差分ゼロが原理的に不可能**になる | **`null` ＝ 元ファイルにその要素が無かった**。GRS の JSON は全 Own/Consume 列を常に出力し `null` を明示する（**キーを省略しない**）。**MSPDI へ書き出すときだけ省略**する。例外として **XSD 必須要素（各 `UID` を含む）は `null` でも必ず書く** | `grs-native-erd-ja.md:723`-`:729` / `:739` |

## 8. 担当者の編集と MSPDI への書き戻し（§5.5a-2・確定 2026-08-05）

**編集の単位は割当（`Assignment`）である。`Task` に担当者の列は足さない。** `grs-native-erd-ja.md:588`

| 操作 | 何が起きるか | 出典 |
| --- | --- | --- |
| 選ぶ | 文書内の `Resource` のうち **`type = 1` かつ `is_cost_resource != 1`** のものから選び、`Assignment` を作る | `grs-native-erd-ja.md:593` |
| 新しい名前を入れる | 同名の `Resource` があればそれを使い、無ければ `Resource` を作ってから `Assignment` を作る | `grs-native-erd-ja.md:594` |
| 名前を変える | `Resource.name` を書き換える。**その資源を使う全タスクの表示が変わる**ので、対象の件数を人に知らせる | `grs-native-erd-ja.md:595` |
| 解除する | その `Assignment` の行を削除する。**`Resource` は残す**（他のタスクが使っていることがある） | `grs-native-erd-ja.md:596` |

> **同名の判定は取込の自動統合と同じ**（`Name` が非空かつ NFKC 正規化 ＋ trim 後に完全一致）。**判定を 2 つ持たない。**
> `grs-native-erd-ja.md:598` / `:599`

**新規に作る行の中身**（`grs-native-erd-ja.md:604`-`:612`）

| 行 | 列 | 値 | 出典 |
| --- | --- | --- | --- |
| `Resource` | `uid` | `uid_high_water_mark + 1` | `grs-native-erd-ja.md:605` |
| `Resource` | `name` | 入力された文字列 | `grs-native-erd-ja.md:606` |
| `Resource` | `type` | **`1`**（担当者として表示されるために要る） | `grs-native-erd-ja.md:607` |
| `Resource` | 他は全列 | **`null`** | `grs-native-erd-ja.md:608` |
| `Assignment` | `uid` | `uid_high_water_mark + 1` | `grs-native-erd-ja.md:609` |
| `Assignment` | `task_uid` / `resource_uid` | 埋める | `grs-native-erd-ja.md:610` |
| `Assignment` | 他は全列 | **`null`** | `grs-native-erd-ja.md:611` |

**編集しないもの**

| 対象 | 扱い | 理由 | 出典 |
| --- | --- | --- | --- |
| `type` / `is_cost_resource` / `calendar_id` | **編集しない**（取り込んだ値をそのまま保つ） | 資源管理（工数・割当率・稼働率・コスト）は引き続き対象外 | `grs-native-erd-ja.md:616` / `:617` |
| 割当率 `Units` | **編集しない**（Carry のまま。表示もしない） | 同上 | `grs-native-erd-ja.md:616` / `:1608` |
| 参照されなくなった `Resource` | **自動削除しない**（削除は人が明示的に行う） | 「勝手に消さない」 | `grs-native-erd-ja.md:619` / `:620` |

**なぜ列が増えないか**（`grs-native-erd-ja.md:622`-`:634`）

| 主張 | 根拠 | 確認 |
| --- | --- | --- |
| 軽量ネイティブの 8 列で足りる | 編集に要る列（`name` / `type` / `task_uid` / `resource_uid` / 各 `uid`）は**全て既に Own / Consume** である | `grs-native-erd-ja.md:624` |
| 新規行は `null` でない列だけが書き出される | 新規行は Carry を持たないため | `grs-native-erd-ja.md:626` / `:737` |
| それでも XSD 妥当な XML になる | **`Resource`（子要素 71）も `Assignment`（子要素 265）も必須は `UID` だけ**。`Assignment` は `TaskUID` / `ResourceUID` すら `minOccurs="0"` である | **自分で数えて確認**（`mspdi_pj12.xsd:2497`-`:3184` = 71 / `:3196`-`:3906` = 265・必須は各 `UID` 1 個）。原典は `grs-native-erd-ja.md:627`-`:629` |
| **MS Project 側の挙動は未検証である** | 上は「妥当な XML になる」ことまでしか言っていない。**`Units` / `Work` を勝手に埋めるかは XSD からは分からない。** 埋めるなら `Task` の Carry（工数・コスト）と食い違い、**往復無損失が壊れる** | **未検証**。実機確認は `OPEN-ITEMS-ja.md:90`-`:105`（項 4・優先度 中）。原典は `grs-native-erd-ja.md:631`-`:634` |

## 9. マージ・削除の連鎖（本領域に効く規則）

| 事象 | 規則 | 出典 |
| --- | --- | --- |
| `Resource` の重複（取込） | **`Name` が非空かつ完全一致（NFKC 正規化 ＋ trim 後）なら自動統合**。名前なし・不一致で UID 衝突なら**再採番** | `grs-native-erd-ja.md:498` |
| `Assignment` の重複（取込） | 自然キー (`task_uid`, `resource_uid`) が一致すれば同一とみなし統合。UID 衝突は**再採番** | `grs-native-erd-ja.md:499` |
| `Task` 以外の全 UID | **衝突したら必ず再採番**（`uid_high_water_mark` 方式で単調増加）。無規則の衝突を残さない | `grs-native-erd-ja.md:500` |
| なぜ規則が要るか | ダイアログは `Task` と `Project` メタしか扱わない。`Assignment` の UID は MSPDI が 1 から採番するのが普通なので**2 ファイル目で必ず衝突**する。`Resource` も「同名でない」ケースは統合ルールに該当せず未定義だった。規則が無いと **PK 重複**が起き、代理キー廃止の前提が崩れる | `grs-native-erd-ja.md:502` |
| 自動統合の代償 | Calendar / Resource の自動統合や Project メタ「既存を保持」を選ぶと、**取込側の Carry（単価表・勤務時刻など）は破棄される**。**Drop=0 は単一 MSPDI の未編集往復に限る** | `grs-native-erd-ja.md:508`-`:510` |
| 取込のアトミック性 | 衝突検出・自動統合の判定は**全てドライラン**で行い、決定後に一括適用する（さもないと「キャンセル＝何も変更しない」が嘘になる） | `grs-native-erd-ja.md:504` / `:506` |
| `Task` 削除 | `task_uid` が一致する `Assignment` を**連鎖削除**。削除件数をトーストで通知 | `grs-native-erd-ja.md:673` |
| `Resource` 削除 | `resource_uid` が一致する `Assignment` を**連鎖削除**。同上 | `grs-native-erd-ja.md:675` |
| 連鎖削除と Carry | `Assignment` を連鎖削除すると、その Carry（`Units`・工数・コスト・201 予約枠）も消える。ユーザー操作の結果なので「未編集往復は無損失」の前提は破らないが、**消えたことを通知する** | `grs-native-erd-ja.md:677` |
| 上書き取込の層 | `Task` の Own / Consume 列・`carry`・`Dependency` は置換。`TaskVisual` / `TaskGroupMember` は保持。**`Resource` / `Assignment` は上表の自動処理**（3 択ダイアログを増やさない） | `grs-native-erd-ja.md:445`-`:448` / `:493` |

## 10. `Resource` の Carry 内訳（**全数 65 行** = スカラー 59 ＋ 子要素 6）

**数え方**: XSD の `Resource` 直下子要素 71（自分で計数）から、ネイティブ 5 列（`UID`/`Name`/`Type`/`IsCostResource`/`CalendarUID`）と
`Reconstruct` の `ID` を除いた **65**。うち子要素が 6、残り 59 がスカラーである。
**台帳 §7.5 の列挙（`grs-mspdi-field-ledger-ja.md:566`-`:582`）と XSD の集合比較で差分 0** を自分で確認した。
`null 可` は XSD の `minOccurs="0"`（全件）を意味する。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | :--: | --- | --- | --- | --- |
| `carry.IsNull` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/IsNull` | — | 欠番行。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2529` / `grs-mspdi-field-ledger-ja.md:574` |
| `carry.Initials` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/Initials` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2534` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.Phonetics` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/Phonetics` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2544` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.NTAccount` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/NTAccount` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2554` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.MaterialLabel` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/MaterialLabel` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2564` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.Code` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/Code` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2574` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.Group` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/Group` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2584` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.WorkGroup` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/WorkGroup` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 0,1,2,3 | `mspdi_pj12.xsd:2594` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.EmailAddress` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/EmailAddress` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2607` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.Hyperlink` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/Hyperlink` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2617` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.HyperlinkAddress` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/HyperlinkAddress` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2627` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.HyperlinkSubAddress` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Resource/HyperlinkSubAddress` | — | 識別 / 属性。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2637` / `grs-mspdi-field-ledger-ja.md:575` |
| `carry.MaxUnits` | `xsd:float` | ○ | — | — | `Carry` | `Resource/MaxUnits` | `1.0`（XSD default） | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2647` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.PeakUnits` | `xsd:float` | ○ | — | — | `Carry` | `Resource/PeakUnits` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2652` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.OverAllocated` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/OverAllocated` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2657` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.AvailableFrom` | `xsd:dateTime` | ○ | — | — | `Carry` | `Resource/AvailableFrom` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2662` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.AvailableTo` | `xsd:dateTime` | ○ | — | — | `Carry` | `Resource/AvailableTo` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2667` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.Start` | `xsd:dateTime` | ○ | — | — | `Carry` | `Resource/Start` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2672` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.Finish` | `xsd:dateTime` | ○ | — | — | `Carry` | `Resource/Finish` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2677` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.CanLevel` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/CanLevel` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2682` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.AccrueAt` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/AccrueAt` | — | 稼働。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 1,2,3,4 | `mspdi_pj12.xsd:2687` / `grs-mspdi-field-ledger-ja.md:576` |
| `carry.Work` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/Work` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2700` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.RegularWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/RegularWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2705` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.OvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/OvertimeWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2710` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.ActualWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/ActualWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2715` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.RemainingWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/RemainingWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2720` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.ActualOvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/ActualOvertimeWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2725` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.RemainingOvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/RemainingOvertimeWork` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2730` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.PercentWorkComplete` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/PercentWorkComplete` | — | 工数。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2735` / `grs-mspdi-field-ledger-ja.md:577` |
| `carry.StandardRate` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/StandardRate` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2740` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.StandardRateFormat` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/StandardRateFormat` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 1,2,3,4,5,7,8 | `mspdi_pj12.xsd:2745` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.Cost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/Cost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2761` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.OvertimeRate` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/OvertimeRate` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2766` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.OvertimeRateFormat` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/OvertimeRateFormat` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 1,2,3,4,5,7 | `mspdi_pj12.xsd:2771` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.OvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/OvertimeCost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2786` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.CostPerUse` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/CostPerUse` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2791` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.ActualCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/ActualCost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2796` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.ActualOvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/ActualOvertimeCost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2801` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.RemainingCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/RemainingCost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2806` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.RemainingOvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Resource/RemainingOvertimeCost` | — | コスト / レート。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2811` / `grs-mspdi-field-ledger-ja.md:578` |
| `carry.WorkVariance` | `xsd:float` | ○ | — | — | `Carry` | `Resource/WorkVariance` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2816` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.CostVariance` | `xsd:float` | ○ | — | — | `Carry` | `Resource/CostVariance` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2821` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.SV` | `xsd:float` | ○ | — | — | `Carry` | `Resource/SV` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2826` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.CV` | `xsd:float` | ○ | — | — | `Carry` | `Resource/CV` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2831` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.ACWP` | `xsd:float` | ○ | — | — | `Carry` | `Resource/ACWP` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2836` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.Notes` | `xsd:string` | ○ | — | — | `Carry` | `Resource/Notes` | — | メモ。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2846` / `grs-mspdi-field-ledger-ja.md:580` |
| `carry.BCWS` | `xsd:float` | ○ | — | — | `Carry` | `Resource/BCWS` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2851` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.BCWP` | `xsd:float` | ○ | — | — | `Carry` | `Resource/BCWP` | — | EVM / 差異。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2856` / `grs-mspdi-field-ledger-ja.md:579` |
| `carry.IsGeneric` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/IsGeneric` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2861` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.IsInactive` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/IsInactive` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2866` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.IsEnterprise` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/IsEnterprise` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2871` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.BookingType` | `xsd:integer` | ○ | — | — | `Carry` | `Resource/BookingType` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 0,1 | `mspdi_pj12.xsd:2876` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.ActualWorkProtected` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/ActualWorkProtected` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2887` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.ActualOvertimeWorkProtected` | `xsd:duration` | ○ | — | — | `Carry` | `Resource/ActualOvertimeWorkProtected` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2892` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.ActiveDirectoryGUID` | `xsd:string (maxLength 16)` | ○ | — | — | `Carry` | `Resource/ActiveDirectoryGUID` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2897` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.CreationDate` | `xsd:dateTime` | ○ | — | — | `Carry` | `Resource/CreationDate` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:2907` / `grs-mspdi-field-ledger-ja.md:581` |
| `carryElements[].ExtendedAttribute` | 要素（0..*） | ○ | — | — | `Carry` | `Resource/ExtendedAttribute` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:2912` / `grs-mspdi-field-ledger-ja.md:582` |
| `carryElements[].Baseline` | 要素（0..*） | ○ | — | — | `Carry` | `Resource/Baseline` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:2971` / `grs-mspdi-field-ledger-ja.md:582` |
| `carryElements[].OutlineCode` | 要素（0..*） | ○ | — | — | `Carry` | `Resource/OutlineCode` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3005` / `grs-mspdi-field-ledger-ja.md:582` |
| `carry.AssnOwner` | `xsd:string` | ○ | — | — | `Carry` | `Resource/AssnOwner` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3035` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.AssnOwnerGuid` | `xsd:string` | ○ | — | — | `Carry` | `Resource/AssnOwnerGuid` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3040` / `grs-mspdi-field-ledger-ja.md:581` |
| `carry.IsBudget` | `xsd:boolean` | ○ | — | — | `Carry` | `Resource/IsBudget` | — | enterprise / 管理。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3045` / `grs-mspdi-field-ledger-ja.md:581` |
| `carryElements[].AvailabilityPeriods` | コンテナ要素（0..1） | ○ | — | — | `Carry` | `Resource/AvailabilityPeriods` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3051` / `grs-mspdi-field-ledger-ja.md:582` |
| `carryElements[].Rates` | コンテナ要素（0..1） | ○ | — | — | `Carry` | `Resource/Rates` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3084` / `grs-mspdi-field-ledger-ja.md:582` |
| `carryElements[].TimephasedData` | 要素（0..*） | ○ | — | — | `Carry` | `Resource/TimephasedData` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3173` / `grs-mspdi-field-ledger-ja.md:582` |

## 11. `Assignment` の Carry 内訳（**全数 62 行** = スカラー 58 ＋ 予約枠 201〔1 行に集約〕＋ 子要素 3）

**数え方**: XSD の `Assignment` 直下子要素 265（自分で計数）から、ネイティブ 3 列（`UID`/`TaskUID`/`ResourceUID`）を除いた **262**。
うち予約枠 `f404000`〜`f4040c8` が 201（連番なので 1 行に集約した）、子要素が 3、残り 58 がスカラーである。
**台帳 §7.6 の列挙（`grs-mspdi-field-ledger-ja.md:588`-`:597`）と XSD の集合比較で差分 0** を自分で確認した。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | :--: | --- | --- | --- | --- |
| `carry.PercentWorkComplete` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/PercentWorkComplete` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3212` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ActualCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/ActualCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3217` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.ActualFinish` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/ActualFinish` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3222` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ActualOvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/ActualOvertimeCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3227` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.ActualOvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/ActualOvertimeWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3232` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ActualStart` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/ActualStart` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3237` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ActualWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/ActualWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3242` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ACWP` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/ACWP` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3247` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Confirmed` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/Confirmed` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3252` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.Cost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/Cost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3257` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.CostRateTable` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/CostRateTable` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 0,1,2,3,4 | `mspdi_pj12.xsd:3262` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.CostVariance` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/CostVariance` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3276` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.CV` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/CV` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3281` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Delay` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/Delay` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3286` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.Finish` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/Finish` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3291` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.FinishVariance` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/FinishVariance` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3296` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Hyperlink` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Assignment/Hyperlink` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3301` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.HyperlinkAddress` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Assignment/HyperlinkAddress` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3311` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.HyperlinkSubAddress` | `xsd:string (maxLength 512)` | ○ | — | — | `Carry` | `Assignment/HyperlinkSubAddress` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3321` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.WorkVariance` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/WorkVariance` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3331` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.HasFixedRateUnits` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/HasFixedRateUnits` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3336` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.FixedMaterial` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/FixedMaterial` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3341` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.LevelingDelay` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/LevelingDelay` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3346` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.LevelingDelayFormat` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/LevelingDelayFormat` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 3,4,5,6,7,8,9,10,11,12,19,20,…（全 26 値） | `mspdi_pj12.xsd:3351` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.LinkedFields` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/LinkedFields` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3386` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.Milestone` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/Milestone` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3391` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.Notes` | `xsd:string` | ○ | — | — | `Carry` | `Assignment/Notes` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3396` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.Overallocated` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/Overallocated` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3401` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.OvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/OvertimeCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3406` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.OvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/OvertimeWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3411` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.PeakUnits` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/PeakUnits` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3417` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.RegularWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/RegularWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3423` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.RemainingCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/RemainingCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3428` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.RemainingOvertimeCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/RemainingOvertimeCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3433` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.RemainingOvertimeWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/RemainingOvertimeWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3438` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.RemainingWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/RemainingWork` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3443` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.ResponsePending` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/ResponsePending` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3448` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.Start` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/Start` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3453` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.Stop` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/Stop` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3458` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.Resume` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/Resume` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3463` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.StartVariance` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/StartVariance` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3468` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Summary` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/Summary` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3474` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.SV` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/SV` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3479` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Units` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/Units` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3485` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.UpdateNeeded` | `xsd:boolean` | ○ | — | — | `Carry` | `Assignment/UpdateNeeded` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3490` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.VAC` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/VAC` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3495` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.Work` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/Work` | — | 工数 / 日程。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3500` / `grs-mspdi-field-ledger-ja.md:593` |
| `carry.WorkContour` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/WorkContour` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 0,1,2,3,4,5,6,7,8 | `mspdi_pj12.xsd:3505` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.BCWS` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/BCWS` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3523` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.BCWP` | `xsd:float` | ○ | — | — | `Carry` | `Assignment/BCWP` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3528` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.BookingType` | `xsd:integer` | ○ | — | — | `Carry` | `Assignment/BookingType` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す。XSD enum: 0,1 | `mspdi_pj12.xsd:3533` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.ActualWorkProtected` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/ActualWorkProtected` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3544` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.ActualOvertimeWorkProtected` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/ActualOvertimeWorkProtected` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3549` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.CreationDate` | `xsd:dateTime` | ○ | — | — | `Carry` | `Assignment/CreationDate` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3554` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.AssnOwner` | `xsd:string` | ○ | — | — | `Carry` | `Assignment/AssnOwner` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3560` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.AssnOwnerGuid` | `xsd:string` | ○ | — | — | `Carry` | `Assignment/AssnOwnerGuid` | — | フラグ / 補助。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3565` / `grs-mspdi-field-ledger-ja.md:595` |
| `carry.BudgetCost` | `xsd:decimal` | ○ | — | — | `Carry` | `Assignment/BudgetCost` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3570` / `grs-mspdi-field-ledger-ja.md:594` |
| `carry.BudgetWork` | `xsd:duration` | ○ | — | — | `Carry` | `Assignment/BudgetWork` | — | コスト / EVM。GRS は意味を使わない。`carry` に原文字列で保持し、export で原位置へ書き戻す | `mspdi_pj12.xsd:3575` / `grs-mspdi-field-ledger-ja.md:594` |
| `carryElements[].ExtendedAttribute` | 要素（0..*） | ○ | — | — | `Carry` | `Assignment/ExtendedAttribute` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3581` / `grs-mspdi-field-ledger-ja.md:597` |
| `carryElements[].Baseline` | 要素（0..*） | ○ | — | — | `Carry` | `Assignment/Baseline` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3640` / `grs-mspdi-field-ledger-ja.md:597` |
| `carryElements[].TimephasedData` | 要素（0..*） | ○ | — | — | `Carry` | `Assignment/TimephasedData` | — | 子要素。**ネイティブ行を作らない**。原典名 `carry_elements`（**要改名** → `carryElements`）へ要素まるごと退避し、`ordinal` 順で書き戻す（子孫の enum は本表に写さない） | `mspdi_pj12.xsd:3893` / `grs-mspdi-field-ledger-ja.md:597` |
| `carry.f404000` 〜 `carry.f4040c8`（**201 枠**） | 空要素（`type` 指定なし） | ○ | — | — | `Carry` | `Assignment/f404000` 〜 `Assignment/f4040c8` | — | enterprise カスタムフィールドの予約プレースホルダ。**全て空で個別の意味は無い**。**201 枠あることは自分で数えた**（先頭 `f404000`・末尾 `f4040c8`）。本表は 1 行にまとめて示すが、往復では 1 枠ずつ原形のまま書き戻す | `mspdi_pj12.xsd:3691` / `:3891`（自分で計数） / `grs-mspdi-field-ledger-ja.md:596` |

## 12. 予実の正（`plan-actual-decisions-ja.md`）との差分

**本領域は予実の上書きを受けていない。** 両方の上書き表を読み、行を数えて確認した。

| 上書き表 | 行数（自分で数えた） | 対象 | `Resource` / `Assignment` の行 | 出典 |
| --- | --: | --- | :--: | --- |
| ERD 冒頭の上書き表 | **9** | `progressRatio` / `actualFinish` / `actualDuration` / `resumeValid` / `stop`・`resume` / `stop` の保存 / `importance` / `progressStatus` / `iconShapeKind` | **無し** | `grs-native-erd-ja.md:26`-`:36` |
| 台帳冒頭の上書き表 | **6** | `ActualDuration` / `Stop`・`Resume` / `ResumeValid` / `PercentComplete` / `OutlineLevel` / 拡張領域 | **無し** | `grs-mspdi-field-ledger-ja.md:22`-`:29` |

**予実の正が本領域に触れている箇所は 2 つだけである。**

| 触れ方 | 内容 | 本領域への効き方 | 出典 |
| --- | --- | --- | --- |
| 実機確認の切り分け | 「4 件目（**GRS が新規に書き出した `Resource` / `Assignment` を MS Project がどう扱うか**）は担当者の編集で 2026-08-05 に足したもので、**予実には効かない**」と明記している | 本領域の実機未検証項目は予実側ではなく `OPEN-ITEMS-ja.md` 項 4 が持つ | `plan-actual-decisions-ja.md:1298` / `:1299` / `OPEN-ITEMS-ja.md:90`-`:105` |
| PoC の実測 | 低ズームで段数が膨らむ主因は**担当ラベル ＋ 完了率ラベル**であり、マーカーの寄与はほぼ 0 だった（zoomX 0.25 で担当・完了率を隠すと段数 96 → 72）。手当ては**担当・完了率の既定を隠す**こと | `Resource.name` の表示は既定 `false` になる（列の定義は変わらない） | `plan-actual-decisions-ja.md:519`-`:525` / `grs-document-settings-ja.md:242` / `:280` |

## 未解決

| # | 何が | 原典どうしの食い違い / 未検証 | どう扱うか（本書の判断） |
| --- | --- | --- | --- |
| 1 | **由来ラベルの粗さ** | §6 の責務表は `Resource` を「MSPDI-Own（5列のみ）」（`grs-native-erd-ja.md:1488`）、`Assignment` を「MSPDI-Consume（3列のみ）」（同 `:1489`）と書く。しかし `calendar_id` は `Consume`、`Assignment.uid` は `Own` である（同 `:522`-`:525` / `:1599`-`:1606` / `grs-mspdi-field-ledger-ja.md:640` / `:641`） | **細粒度側（§5.5 / §7.5 / 台帳 §8B）を採る。** 本書の §2 / §3 はそちらに従った。責務表の表記は次期で直す |
| 2 | **「Own は 4 列 → 5 列」の数え方** | `grs-native-erd-ja.md:569` は `IsCostResource` の追加を「Resource の Own は 4 列 → 5 列」と書くが、5 列目の `calendar_id` は `Consume` である | **「理解する列が 4 → 5」と読む。** Own は 4、Consume は 1 |
| 3 | **`Resource` / `Assignment` 行の `ordinal` が無い** | `grs-native-erd-ja.md:715` は「各コレクション内の**全要素**に同一の番号空間で `ordinal` を振る」と言うが、同 `:709` は `ordinal` を「識別子を持たない要素」に限り、ERD 本体（同 `:286`-`:297`）と §7.5（同 `:1599`-`:1606`）に `ordinal` 列は無い。8 列固定の主張（同 `:518` / `:624`）とも噛み合わない | **未決。** `Resources` / `Assignments` コレクションの**原順序をどう復元するかが定義されていない**。列を 1 本足すのか、UID 順で妥協するのかを次期が決める |
| 4 | **表示規則が `Resource.IsNull` を見ている** | `grs-native-erd-ja.md:549` は表示条件に `Resource.IsNull != 1` を挙げるが、`IsNull=1` の資源は**ネイティブ行を作らない**（同 `:700` / `grs-mspdi-field-ledger-ja.md:574`）。ネイティブ `Resource` に `isNull` 列は無いので、この条件は評価する対象が無い | **未決（無害だが冗長）。** 表示規則から落とすか、`carry.IsNull` を読むのかを次期が決める |
| 5 | **未割当と「解決できない参照」の区別** | `grs-native-erd-ja.md:1606` は未割当を `null` へ正規化、同 `:577` は未割当を表示から除外、同 `:759` は「UID が文書内で解決できない `Assignment` は Carry へ退避」と言う。**import 時に「存在しない資源を指す `resource_uid`」をどちらへ倒すかの明文が無い** | **未決。** `null`（未割当・ネイティブ行を残す）と「解決不能な値」（要素まるごと Carry）の境目を次期が決める |
| 6 | **`resource_uid = null` の割当が複数あるときの統合** | 取込の自動統合は自然キー (`task_uid`, `resource_uid`) の一致で行う（`grs-native-erd-ja.md:499`）。未割当が複数あると自然キーが (`task_uid`, `null`) で衝突するが、その扱いは**原典のどこにも書かれていない**（§5.4 の表・§7.5 とも記述なし。自分で確認） | **未決。** 統合するのか別行として残すのかを次期が決める |
| 7 | **`Resource.ID` の 0 起点** | `grs-native-erd-ja.md:1635` は「resources 配列の **0 起点**連番」と書くが、XSD の説明は "The position identifier of the resource within the list of resources." だけで**起点が決まらない**（`mspdi_pj12.xsd:2503`-`:2505`・自分で確認） | **未検証。** 実機（MS Project の出力）で確かめてから決める。推測で書かない |
| 8 | **MS Project 側の挙動** | 「`UID`/`Name`/`Type` だけの `Resource`」「`UID`/`TaskUID`/`ResourceUID` だけの `Assignment`」は **XSD 妥当**（自分で確認: 必須は各 `UID` のみ）。だが**① 担当者として表示されるか ② `Units`/`Work` を勝手に埋めるか ③ 埋めた場合 `Task` の `Duration`/`Work` が変わるか**は分からない | **未検証（優先度 中）。** `OPEN-ITEMS-ja.md:90`-`:105`。③ が起きると `Task` の Carry（工数・コスト）と食い違い**往復無損失が壊れる**。埋めると分かったら §5.5a-2 に「export 時に `Units` を明示して書く」を足す（`grs-native-erd-ja.md:631`-`:634`） |
| 9 | **要改名（命名規約違反）** | snake_case が許されるのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけである。本領域は `is_cost_resource` / `calendar_id` / `task_uid` / `resource_uid` / `carry_elements` が違反。さらに **`type` は汎用語禁止（`type`/`data`/`info`/`value`）に触れる** | **改名する。** `isCostResource` / `calendarId` / `taskUid` / `resourceUid` / `carryElements`、`type` → **`resourceKind`**（`shapeKind` と同じ作り方。`tbl-glossary.md:48`）。原典の名は `grs-native-erd-ja.md:286`-`:297` / `:699` / `:700` |
| 10 | **用語の正に `Resource` / `Assignment` が無い** | `tbl-glossary.md` の表 T-101「データの語」は `Task` / `TaskGroup` / `TaskGroupMember` / `stackOrder` / `Item` の **5 語だけ**である（`:25`-`:29`・自分で数えた）。担当まわりで載っているのは UI パーツ `Assignee Label`（`:77`）と設定値キー `assigneeVisible`（`:207`）だけで、**エンティティ名も列名も無い** | **未決。** 本領域の名前（`Resource` / `Assignment` と 8 列）を用語辞書へ足す必要がある。足すときは #9 の改名後の名前で足す |
| 11 | **担当者表示の除外条件の網羅性** | 表示から外すのは `Type != 1` / `IsCostResource = 1` / `IsNull = 1` / `Name` 空 の 4 つ（`grs-native-erd-ja.md:546`-`:550`）。XSD には `IsInactive`（`mspdi_pj12.xsd:2866`）・`IsGeneric`（`:2861`）・`IsBudget`（`:3045`）もあるが、**これらを見るかどうかは原典に記述が無い** | **未検証（記述なし）。** 「見ない」と決めたのか、検討されなかったのかが読み取れない。次期が明示的に決める |
| 12 | **`Task` 側の `milestone` 列との整合（参考・本領域外）** | `tbl-glossary.md:25` は「⚠️ **真偽値の `milestone` という列は持たない**」と言うが、`grs-native-erd-ja.md:260` の `Task` は `milestone` を持つ。本領域の FK 先である `Task.uid` には影響しない | **本書では扱わない**（`Task` 担当の領域）。突合の記録としてのみ残す |
