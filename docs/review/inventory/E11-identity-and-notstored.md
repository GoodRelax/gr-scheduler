# E11 — identity + not-stored

## 0. 読んだ原典

| 略号 | ファイル | 行数 | 読んだ範囲 | 本ファイルでの位置づけ |
| --- | --- | ---: | --- | --- |
| `erd` | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文（1–1827）** | 識別・マージ・非保存の主原典 |
| `ledger` | `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文（1–677）** | Own/Consume/Reconstruct/Carry/Drop の仕分けの原典 |
| `pa` | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | 全文（1–1348） | **予実領域はこちらが正**。`erd` の該当箇所は旧版 |
| `glossary` | `docs/spec/_assets/tbl-glossary.md` | 259 | 全文（1–259） | 仕様書の用語の正。名前の突合先 |
| `xsd` | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | 識別・必須・多重度に関わる箇所を機械検査（下表） | MSPDI の事実の正 |

`出典` 列の `erd:254` は「`grs-native-erd-ja.md` の 254 行目」を指す。以下同様。

**自分で数えた数**（本ファイルの主張の根拠）

| 数えたもの | 値 | 数え方 |
| --- | ---: | --- |
| エンティティ | **14** | `erd:126` の宣言を、§5.1（4）・§5.2（12）・§5.8（2）の実体で照合して列挙（本書 §2） |
| §6 責務表の行 | 12 | `erd:1480`–`erd:1491`。`Comment` / `HighlightBox` が無い |
| §5.0 層の表の行 | 12 | `erd:134`–`erd:141`。同上 |
| §5.3 PK 表の行 | 9 行 / 10 エンティティ | `erd:352`–`erd:360`（`WeekDay` / `Exception` が 1 行に同居）。`TaskGroupMember` / `TaskVisual` / `Comment` / `HighlightBox` が無い |
| §8A Reconstruct の行 | **9** | `erd:1629`–`erd:1637` |
| §5.6 監査表の行 | 16（うち「無駄」判定 **5**） | `erd:1014`–`erd:1030` |
| MSPDI の UID 相互参照要素 | **7** | `xsd` を機械列挙: `BaseCalendarUID`×1 / `CalendarUID`×3 / `PredecessorUID`×1 / `TaskUID`×1 / `ResourceUID`×1 |
| MSPDI の自己識別 `UID` 要素 | **6** | `TimephasedData`(xsd:187) / `Project`(238) / `Calendar`(1210) / `Task`(1610) / `Resource`(2498) / `Assignment`(3197) |
| `xsd:unique` / `xsd:key` / `xsd:keyref` | **0** | XSD 全文で 0 件（＝スキーマは一意性を強制しない） |
| 明示 `minOccurs="1"` | **3 箇所** | `Calendars/Calendar`(xsd:1204) / `WeekDay/DayType`(1247) / `WorkWeek/WeekDay/DayType`(1559) |
| 本ファイルのエンティティ表の行 | **38** | §3 の 14 表の合計 |

**本ファイルの担当範囲**: 識別（PK / FK / 一意制約 / マージの同一性）と「保存しないもの」。
§3 の各表は**識別に関わる列だけ**を載せる（非識別列は E11 の担当外であり、載せていないことは「無い」の意味ではない）。

---

## 1. 識別の方針 — 代理キーを持たない

**原則**: MSPDI の `UID` をそのまま GRS の PK に使い、GRS 独自の代理キー（UUID 等）を追加しない（`erd:348`）。

| 主張 | 内容 | 出典 |
| --- | --- | --- |
| 適用範囲 | **MSPDI 由来テーブルに GRS 代理キーを足さない**。GRS 新設テーブルは独自 ID が要る | `erd:110`, `erd:360`, `erd:1494` |
| なぜ代理キーが不要か | マージ時の UID 衝突は取込時の 3 択で解消されるので、文書内で UID は常に一意。複合キー（`source_id`+`uid`）も UUID も要らない | `erd:362` |
| UID の扱い | **文書内で一意な不透明な整数**。値の範囲・大小・連続性に意味を持たせない | `erd:366` |
| 番号空間の予約帯 | **不採用**。同じ規則を使う別 GRS 文書とは結局ぶつかり、値に意味を持たせるぶん脆い | `erd:368`, `erd:1691`, `erd:1819` |
| 「GRS 生まれか」の判定 | **`TaskOrigin` の行の有無**で判定する（UID の値では判定しない） | `erd:369`, `erd:380` |
| 新規 UID | 未使用値なら何でもよい。実装は `uid_high_water_mark + 1` を推奨 | `erd:372` |
| 高水位の位置づけ | 正しさの前提**ではない**（無駄な再採番を減らすだけ）。Undo でも巻き戻さない | `erd:374`, `erd:506` |
| 責任範囲 | GRS が保証するのは**受け取った文書の中**の一意性だけ。文書外との衝突は範囲外 | `erd:413`–`erd:416` |
| 出自 | `Task` に置かず **`TaskOrigin` に分離**（`Task` = MSPDI Own のみ、という不変条件を保つ） | `erd:376`–`erd:378` |

**`Project.UID` は PK に採れない（原典と XSD が食い違う）**

| 事実 | 出典 |
| --- | --- |
| `erd` は `Project` の PK を `id`（= `Project.UID`）と書く | `erd:354`, `erd:240` |
| 同じ文書が「`Project/UID` は **GUID ではない**・`xsd:string` maxLength=**16**・`minOccurs=0`＝**省略可**」「省略時は取込セッション ID を発番して出自に充てる」「外部 UID ではないので **export しない**」と書く | `erd:1567` |
| XSD 実測: `Project/UID` は `minOccurs="0"`、`xsd:string` に `maxLength value="16"` の制限。**値が無い MSPDI が妥当** | `xsd:238`–`xsd:247` |
| 出自が不明（`Project.UID` 省略）のとき `TaskOrigin.source_project_uid` は `null` になり、`import_session_id` で代替する | `erd:380` |

→ **null を取りうる値は PK にできない。** かつ `Project` は文書に 1 行しか無い（`erd:137`「1 個の器」）ので識別子そのものが要らない。
本ファイルは §3-1 で `Project.id` を **「PK（要再定義）」** として載せる。決着は §未解決 U-1。

---

## 2. 全 14 エンティティ — 概要 ERD の骨格

**補助表**（列は §3 の 10 列規約の対象外。E11 の指示「PK と外部キーの向き・多重度を表にする」に応じるもの）。

| # | エンティティ | 層 | PK | 識別上の弱さ | 存在上の従属（連鎖削除） | export | 出典 |
| --- | --- | --- | --- | --- | --- | :--: | --- |
| 1 | `Project` | ルートメタ | `id`（要再定義・§1） | 独立（文書に 1 行） | — | する | `erd:137`, `erd:354`, `erd:240` |
| 2 | `Task` | **コア** | `uid`（int・= MSPDI `Task.UID`） | 独立 | — | する | `erd:352`, `erd:254` |
| 3 | `TaskGroup` ‼️ | **コア** | `id`（UUID・GRS 新設） | 独立 | — | **しない** | `erd:360`, `erd:311` |
| 4 | `TaskGroupMember` ‼️ | **コア** | **宣言が無い**（`task_uid` UNIQUE のみ） | 親 `Task` / `TaskGroup` 依存 | `Task` 削除・`TaskGroup` 削除 | **しない** | `erd:321`–`erd:323`, `erd:673`–`erd:674`（PK の記載は原典に無い） |
| 5 | `Dependency` | **コア** | **複合**（`successor_uid`, `predecessor_uid`, `link_type`） | 両端の `Task` に依存 | 端点 `Task` の削除 | する | `erd:358`, `erd:274`–`erd:276`, `erd:673` |
| 6 | `Calendar` | 暦 | `id`（int・= `Calendar.UID`） | 独立 | 規定が無い（§未解決 U-9） | する | `erd:355`, `erd:281` |
| 7 | `WeekDay` | 暦 | **親 `Calendar` ＋ `ordinal`** | 弱エンティティ | 親 `Calendar` | する | `erd:359`, `erd:299`, `erd:709` |
| 8 | `Exception` | 暦 | **親 `Calendar` ＋ `ordinal`** | 弱エンティティ | 親 `Calendar` | する | `erd:359`, `erd:304`, `erd:709` |
| 9 | `Resource` | 資源（軽量） | `uid`（int・= `Resource.UID`） | 独立 | — | する | `erd:356`, `erd:287` |
| 10 | `Assignment` | 資源（軽量） | `uid`（int・= `Assignment.UID`） | 独立（自前 UID） | `Task` 削除・`Resource` 削除 | する | `erd:357`, `erd:294`, `erd:673`, `erd:675` |
| 11 | `TaskVisual` ‼️ | 視覚 | `task_uid`（→ `Task.uid`） | 親 `Task` に完全従属（0..1） | `Task` 削除 | **しない** | `erd:333`, `erd:228`, `erd:673` |
| 12 | `TaskOrigin` ‼️ | 出自 | `task_uid`（→ `Task.uid`） | 親 `Task` に完全従属（0..1） | `Task` 削除（明記は無い・§未解決 U-10） | **しない** | `erd:353`, `erd:326`, `erd:229` |
| 13 | `Comment` ‼️ | 注記 | `id`（UUID） | 独立 | 指す `TaskGroup` / `Task` の削除 | **しない** | `erd:1415`, `erd:1472`, `erd:1469` |
| 14 | `HighlightBox` ‼️ | 注記 | `id`（UUID） | 独立 | 指す `TaskGroup` の削除 | **しない** | `erd:1425`, `erd:1472`, `erd:1469` |

- **‼️ = MSPDI に対応が無い GRS 新設**（6 テーブル: `TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` / `Comment` / `HighlightBox`）。`erd:209` は「‼️ テーブル（4）」と書くが、これは §5.2 の図に出る 4 つを数えたもので、§5.8 の 2 つを含まない。
- **エンティティではないもの**: `documentSettings`（文書に 1 個のオブジェクト。`import_seq` / `stack_direction` / ズーム等を持つ。`erd:344`, `erd:1130`）、`baseline`（別ファイル・読取専用・一級エンティティにしない。`erd:1719`）、Carry ストア（所有エンティティの下にぶら下げる。グローバル索引を持たない。`erd:1705`）。
- **コアは 4 つ**（`Task` / `TaskGroup` / `TaskGroupMember` / `Dependency`）。残り 8（＋注記 2）は外してもモデルは壊れない（`erd:143`）。

---

## 3. エンティティ別・識別列の台帳（10 列固定）

### 3-1. `Project`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `id` | string（≤16） | **可** | PK（要再定義） | — | Own | `Project/UID` | 記載なし | 文書に 1 行。XSD は `xsd:string` maxLength=16・`minOccurs=0`＝省略可・GUID ではない。省略時は取込セッション ID を発番して**出自にのみ**充て、**export しない**。null を取りうるので PK として成立しない（§未解決 U-1） | `erd:240`, `erd:354`, `erd:1567`, `xsd:238`–`247` |
| `calendar_id` | int | 可 | FK | `Calendar.id` | Consume | `Project/CalendarUID` | 記載なし | 既定暦。多重度 0..1（`Project }o--o| Calendar`）。Carry に UID 参照を残さない不変条件のため Consume | `erd:250`, `erd:218`, `erd:533`, `xsd:414` |
| `uid_high_water_mark` | int | 記載なし | — | — | GRS | （無し） | 記載なし（未検証） | **削除済みを含む最大 UID**。採番は常に `+1`。ロード時に `max(HWM, 実在 UID の最大)` へ引き上げる。**Undo で巻き戻さない**（巻き戻すと Undo 後に作った Task の UID が Redo と衝突する）。`max(uid)+1` は UID 再利用が起きるので使わない | `erd:242`, `erd:1574`, `erd:372`, `erd:506`, `erd:1506` |
| `schema_version` | string | 記載なし | — | — | GRS | （無し） | 記載なし（未検証） | GRS スキーマの版。新旧 JSON の判別と移行に必須（無いと localStorage の既存データを読めない） | `erd:241`, `erd:1573` |

### 3-2. `Task`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `uid` | int | 不可 | **PK** | — | Own | `Task/UID` | 新規作成時 `uid_high_water_mark + 1`（推奨） | 文書内一意・不変（往復キー）。XSD は `xsd:integer` で `minOccurs` 既定＝**必須**。**値から意味を読み取らない**（予約帯なし）。衝突は取込時の 3 択で解消（§6） | `erd:254`, `erd:352`, `erd:366`, `erd:1506`, `xsd:1610` |
| `wbs_parent_uid` | int | **可**（`null`=root） | FK | `Task.uid` | Consume | `Task/OutlineLevel` ＋ 文書順 | `null`（root） | 自己参照。**深さの上限なし・クランプしない**。深さは保存せず export で親を辿って算出。循環（親を自分の子孫にする）は WBS 編集時のバリデーションで禁止。多重度 1—0..* | `erd:255`, `erd:224`, `erd:811`, `erd:861`, `erd:1507` |
| `wbs_order` | int | 記載なし | — | — | Consume | （`OutlineNumber` の順序成分） | 記載なし | 兄弟内の順序。**ユーザーの意思なので算出不能＝保持**。export のタスク出力順は木の深さ優先 | `erd:256`, `erd:1029`, `erd:1508`, `erd:849` |
| `calendar_id` | int | 可 | FK | `Calendar.id` | Consume | `Task/CalendarUID` | 記載なし | 多重度 0..1。**GRS は既定暦で描画し個別暦は現状未使用**だが、Carry に UID 参照を残さない不変条件のため Consume で保持 | `erd:271`, `erd:225`, `erd:1019`, `xsd:2011` |

### 3-3. `Dependency`（← `PredecessorLink`）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `successor_uid` | int | 不可 | **PK**・FK | `Task.uid` | Consume | 親 `Task`（MSPDI では後続 Task が Link を内包） | — | 複合 PK の 1/3。**文書内の `Task.uid` で必ず解決できること**（import バリデータで強制） | `erd:274`, `erd:358`, `erd:1546`, `erd:1561` |
| `predecessor_uid` | int | 不可 | **PK**・FK | `Task.uid` | Consume | `PredecessorLink/PredecessorUID` | — | 複合 PK の 2/3。XSD は `minOccurs="0"`＝欠落可で、欠落時は `Dependency` 化せず**要素まるごと Carry**。`CrossProject=1` / 文書内に無い UID も Carry（ネイティブに入れると再採番で無関係な Task へ張り替わる） | `erd:275`, `erd:1558`, `erd:1559`, `xsd:2168` |
| `link_type` | int | 不可 | **PK** | — | Consume | `PredecessorLink/Type` | 欠落は **FS(=1) に正規化**（「欠落だった事実」は Carry に原形保持） | 複合 PK の 3/3。0=FF / 1=FS / 2=SF / 3=SS。**同一ペアに種別違いを 2 本張れる**ので PK に含む。同一ペア・同一種別の重複は 1 本目だけネイティブ化し 2 本目以降を要素まるごと Carry（XSD は `maxOccurs="unbounded"`・一意制約 **0 件**なので重複が妥当） | `erd:276`, `erd:1548`, `erd:1556`, `erd:1807`, `xsd:2162`, `xsd:2173` |

> **MSPDI は依存線に ID を振らない**（`PredecessorLink` の子は `PredecessorUID` / `Type` / `CrossProject` / `CrossProjectName` / `LinkLag` / `LagFormat` の 6 つだけ）ので自然キーになる。XSD 実測で確認（`xsd:2168`–`xsd:2204`）。序数は不採用（同一ペア・同一種別の重複は意味を持たないため）。（`erd:358`, `erd:1548`）
> 非識別列（`lag` / `lag_format`）は E11 の担当外。

### 3-4. `Calendar`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `id` | int | 不可 | **PK** | — | Own | `Calendar/UID` | — | XSD は `xsd:integer`・必須。`Calendars/Calendar` は**明示 `minOccurs="1"`**（＝暦が 1 つも無い MSPDI は非妥当） | `erd:281`, `erd:355`, `xsd:1204`, `xsd:1210` |
| `base_calendar_id` | int | 可 | FK | `Calendar.id` | Consume | `Calendar/BaseCalendarUID` | 記載なし | 自己参照（派生元）。多重度 0..1 | `erd:284`, `erd:235`, `erd:1586`, `xsd:1230` |

### 3-5. `WeekDay`（弱エンティティ）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `ordinal` | int | 不可 | **PK の一部**（親 `Calendar.id` ＋ `ordinal`） | 親 = `Calendar.id` | GRS | （無し・Carry の付着キー） | import 時に **0 起点**で採番 | 親コレクション内の出現序数。**ネイティブ行と「要素まるごと Carry」に同一の番号空間**で振り、export は `ordinal` 順に出して原順序を復元する。新規行は `ordinal=null` で末尾 | `erd:299`, `erd:359`, `erd:709`–`erd:719` |

> `WeekDay/DayType` は XSD で**明示 `minOccurs="1"`**（`xsd:1247`）。`null` でも既定値を焼いて必ず書く（省略すると XSD 非妥当）。（`erd:726`, `erd:758`）
> `DayType=0`（2003 形式の例外日）はネイティブ行を作らず要素まるごと Carry（`erd:643`, `erd:1587`）。

### 3-6. `Exception`（弱エンティティ）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `ordinal` | int | 不可 | **PK の一部**（親 `Calendar.id` ＋ `ordinal`） | 親 = `Calendar.id` | GRS | （無し・Carry の付着キー） | import 時に 0 起点 | `WeekDay` と同じ規則。`Exception/Type` が 1–8（繰返しあり）の要素は**ネイティブ行を作らず要素まるごと Carry** ＋ 警告。欠落 / 9 のときだけ行を作る＝**`Type` は読むが列にしない**（§7-3） | `erd:304`, `erd:359`, `erd:660`–`erd:665`, `ledger:558` |

### 3-7. `Resource`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `uid` | int | 不可 | **PK** | — | Own | `Resource/UID` | 新規作成時 `uid_high_water_mark + 1` | XSD は `xsd:integer`・必須（`Resource` の必須は `UID` だけ）。`IsNull=1`（欠番行）はネイティブ行を作らず要素まるごと Carry | `erd:287`, `erd:356`, `erd:605`, `ledger:574`, `xsd:2498` |
| `calendar_id` | int | 可 | FK | `Calendar.id` | Consume | `Resource/CalendarUID` | 記載なし | 多重度 0..1。個人暦は描画に未使用だが、**Carry に UID 参照を残さない**ため Consume に格上げした | `erd:291`, `erd:222`, `erd:534`, `erd:1603`, `xsd:2841` |

### 3-8. `Assignment`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `uid` | int | 不可 | **PK** | — | Own | `Assignment/UID` | 新規作成時 `uid_high_water_mark + 1` | XSD の必須は `UID` だけ（`TaskUID` / `ResourceUID` すら `minOccurs="0"`）。**2 ファイル目で必ず衝突する**（MSPDI は 1 から採番するのが普通）ので、衝突は自動再採番 | `erd:294`, `erd:357`, `erd:609`, `erd:502`, `xsd:3197` |
| `task_uid` | int | 可 | FK | `Task.uid` | Consume | `Assignment/TaskUID` | 記載なし | 多重度 0..1（`Assignment }o--o| Task`）。**欠落した Assignment は要素まるごと Carry**。担当者表示の経路 `Task → Assignment → Resource.name` の 1 段目 | `erd:295`, `erd:220`, `ledger:591`, `xsd:3202` |
| `resource_uid` | int | 可 | FK | `Resource.uid` | Consume | `Assignment/ResourceUID` | 記載なし | **未割当は `null` に正規化**（MS Project 慣行の `-1` は XSD 非規定なので Adapter 境界に閉じ込める）。自然キー `(task_uid, resource_uid)` が一致すればマージで同一とみなし統合 | `erd:296`, `erd:1606`, `erd:499`, `xsd:3207` |

### 3-9. `TaskGroup` ‼️（GRS 新設）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `id` | string（UUID） | 不可 | **PK** | — | GRS | （無し） | 生成した UUID | **GRS 新設テーブルのため独自 ID が必要**（代理キー禁止は MSPDI 由来テーブルへの規則）。`task_uid` にしない — 1:1 対応は初期姿だけで、器は独立した実体。UID 再採番の影響を受けない | `erd:311`, `erd:360`, `erd:972`, `erd:1471` |
| `parent_id` | string（UUID） | **可**（`null`=root） | FK | `TaskGroup.id` | GRS | （無し） | `null` | 自己参照。**入れ子は ≤Lv5**（人がインデントで作れる上限。import と export には上限が無い）。WBS の階層移動には**追随して `parent_id` だけ**を更新し、`id` / `label` / `color` / `height` / `collapsed` と member の `stack_order` は保つ | `erd:312`, `erd:232`, `erd:988`, `erd:1003` |
| `derived_from_task_uid` | int | **可** | 参照（ERD に線が無い・§未解決 U-3） | `Task.uid` | GRS | （無し） | `null` | `label=null` のとき表示名の導出元。**`label` と両方 `null` は禁止**（名前が決まらない）。`null` の器＝人が手で作った器で、WBS に追随しない | `erd:314`, `erd:969`–`erd:970`, `erd:991` |
| `order` | int | 記載なし | — | — | GRS | （無し） | 記載なし | 兄弟内の並び順。ユーザーの意思なので算出不能＝保持 | `erd:315`, `erd:1029` |

### 3-10. `TaskGroupMember` ‼️（GRS 新設）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `group_id` | string（UUID） | 不可 | FK（PK 宣言は原典に無い） | `TaskGroup.id` | GRS | （無し） | — | どの行に載るか。`TaskGroup` 削除で連鎖削除される（Task 自体は消えず器から出るだけ） | `erd:321`, `erd:233`, `erd:674` |
| `task_uid` | int | 不可 | **UNIQUE**（PK 宣言は原典に無い） | `Task.uid` | GRS | （無し） | — | **1 タスクは高々 1 行**（`Task ||--o| TaskGroupMember`）。`Task` 削除で連鎖削除。マージの「上書き」では**保持する**（配置が毎回リセットされるのは致命的） | `erd:322`, `erd:230`, `erd:1482`, `erd:673`, `erd:447` |

> **PK が原典のどこにも宣言されていない**（§5.3 の PK 表に行が無い）。`task_uid` UNIQUE から候補キーは導けるが、決めるのは次期（§未解決 U-2）。

### 3-11. `TaskVisual` ‼️（GRS 新設）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `task_uid` | int | 不可 | **PK**・FK | `Task.uid` | GRS | （無し） | — | `Task` に 0..1 でぶら下がる。**Task 無汚染**のために分離（`Task` = MSPDI Own のみ ⇒ export は「Task の全列をそのまま書く」で済み、除外漏れバグが構造的に起きない）。`Task` 削除で連鎖削除。マージの「上書き」では**保持する**（置換すると再取込のたびに見た目が壊れる） | `erd:333`, `erd:228`, `erd:378`, `erd:673`, `erd:446` |

### 3-12. `TaskOrigin` ‼️（GRS 新設・マージの出自メモ）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `task_uid` | int | 不可 | **PK**・FK | `Task.uid` | GRS | （無し） | — | `Task` に 0..1。**代理キーではなく出自メモ**（`Task` の PK は `uid` のまま）。**行が無い＝GRS 生まれ＝マージの照合対象外** | `erd:326`, `erd:353`, `erd:229`, `erd:384`, `erd:403` |
| `source_project_uid` | string（≤16） | **可** | — | （取込元の `Project.UID`・GRS 文書内には対応行が無い） | GRS | （取込元の `Project/UID` の写し） | `null` | 3 状態のうち①マスタ由来＝値あり ③出自不明（MSPDI が `Project.UID` を省略）＝`null`。③は既定を「別 UID」（安全側）にフォールバック | `erd:327`, `erd:380`, `xsd:238` |
| `source_uid` | int | 記載なし | 照合キーの一部 | （取込元での `Task.UID`） | GRS | （取込元の `Task/UID` の写し） | 記載なし | **再取込の突合専用**。`(source_project_uid, source_uid)` で照合する。**export で元 UID を復元するものではない**（別 UID で振り直したタスクは元ソースへの往復を諦める＝C-3） | `erd:329`, `erd:382`, `erd:404`, `erd:429` |
| `last_seen_import_seq` | int | 記載なし | — | （`documentSettings.import_seq` の値） | GRS | （無し） | 記載なし | そのタスクが最後に届いた取込の番号。**フラグを立てない**（立て消しが無いので消し忘れバグが構造的に起きない）。「消えた候補」は導出（§7-3） | `erd:329`, `erd:448`, `erd:476`–`erd:485` |
| `import_session_id` | string | **可** | — | — | GRS | （無し） | 記載なし | `Project.UID` 省略時の代替出自。外部 UID ではないので **export しない** | `erd:330`, `erd:380`, `erd:1567` |

### 3-13. `Comment` ‼️（注記・GRS 新設）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `id` | string（UUID） | 不可 | **PK** | — | GRS | （無し・MSPDI に対応概念が無い） | 生成した UUID | UUID なので**UID 再採番の影響を受けず衝突しない**。`TaskGroup.id` と揃える | `erd:1415`, `erd:1471` |
| `anchorGroupId` | string（UUID） | 記載なし | FK | `TaskGroup.id` | GRS | （無し） | — | 指す位置の行。**行のインデックス（順番）で持たない** — 並べ替え・畳み・非表示で別の行を指してしまうため。参照先が消えたら連鎖削除 | `erd:1419`, `erd:1434`–`erd:1440`, `erd:1472` |
| `anchorTaskUid` | int | **可**（任意） | FK | `Task.uid` | GRS | （無し） | `null` | 指定時は 9 点アンカーから引き出す。参照先が消えたら連鎖削除 | `erd:1420`, `erd:1472` |

### 3-14. `HighlightBox` ‼️（注記・GRS 新設）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `id` | string（UUID） | 不可 | **PK** | — | GRS | （無し） | 生成した UUID | 同上（衝突しない） | `erd:1425`, `erd:1471` |
| `topGroupId` | string（UUID） | 記載なし | FK | `TaskGroup.id` | GRS | （無し） | — | 範囲の上端。行のインデックスで持たない。非表示のときは表示中の最も外側の行に寄せる | `erd:1427`, `erd:1434`, `erd:1461` |
| `bottomGroupId` | string（UUID） | 記載なし | FK | `TaskGroup.id` | GRS | （無し） | — | 範囲の下端。同上 | `erd:1428`, `erd:1461` |

**§3 の行数合計 = 38**（4+4+3+2+1+1+2+3+4+2+1+5+3+3）。

---

## 4. リレーションの全数（誰が誰を指すか・多重度）

**補助表**。`erd:213`–`erd:237` の Mermaid と §5.8 の散文から全数を起こした。**自分で数えた本数 = 26**（Mermaid の線 **21** ＋ §5.8 の注記の参照 **4** ＋ 図に線が無い参照 **1**）。

| # | 親（1 側） | 子（多側） | 参照列（子が親を指す） | 多重度 | 由来 | 出典 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `Project` | `Task` | （所有・コレクション） | 1 — 0..* | 構造 | `erd:213` |
| 2 | `Project` | `Calendar` | （所有） | 1 — 0..*（XSD は `Calendars/Calendar` が `minOccurs=1`） | 構造 | `erd:214`, `xsd:1204` |
| 3 | `Project` | `Resource` | （所有） | 1 — 0..* | 構造 | `erd:215` |
| 4 | `Project` | `Assignment` | （所有） | 1 — 0..* | 構造 | `erd:216` |
| 5 | `Project` | `TaskGroup` ‼️ | （所有） | 1 — 0..* | GRS | `erd:217` |
| 6 | `Calendar` | `Project` | `Project.calendar_id` | 0..1 — 0..* | Consume | `erd:218`, `erd:250` |
| 7 | `Task` | `Assignment` | `Assignment.task_uid` | 0..1 — 0..* | Consume | `erd:220`, `erd:295` |
| 8 | `Resource` | `Assignment` | `Assignment.resource_uid` | 0..1 — 0..* | Consume | `erd:221`, `erd:296` |
| 9 | `Calendar` | `Resource` | `Resource.calendar_id` | 0..1 — 0..* | Consume | `erd:222`, `erd:291` |
| 10 | `Task` | `Task` | `Task.wbs_parent_uid` | 1 — 0..*（自己・**深さ上限なし**） | Consume | `erd:224`, `erd:255` |
| 11 | `Calendar` | `Task` | `Task.calendar_id` | 0..1 — 0..* | Consume | `erd:225`, `erd:271` |
| 12 | `Task` | `Dependency` | `Dependency.successor_uid` | 1 — 0..* | Consume | `erd:226`, `erd:274` |
| 13 | `Task` | `Dependency` | `Dependency.predecessor_uid` | 1 — 0..* | Consume | `erd:227`, `erd:275` |
| 14 | `Task` | `TaskVisual` ‼️ | `TaskVisual.task_uid` | 1 — 0..1 | GRS | `erd:228`, `erd:333` |
| 15 | `Task` | `TaskOrigin` ‼️ | `TaskOrigin.task_uid` | 1 — 0..1 | GRS | `erd:229`, `erd:326` |
| 16 | `Task` | `TaskGroupMember` ‼️ | `TaskGroupMember.task_uid`（UNIQUE） | 1 — 0..1 | GRS | `erd:230`, `erd:322` |
| 17 | `TaskGroup` ‼️ | `TaskGroup` ‼️ | `TaskGroup.parent_id` | 1 — 0..*（自己・**≤Lv5**） | GRS | `erd:232`, `erd:312` |
| 18 | `TaskGroup` ‼️ | `TaskGroupMember` ‼️ | `TaskGroupMember.group_id` | 1 — 0..* | GRS | `erd:233`, `erd:321` |
| 19 | `Calendar` | `Calendar` | `Calendar.base_calendar_id` | 0..1 — 0..*（自己） | Consume | `erd:235`, `erd:284` |
| 20 | `Calendar` | `WeekDay` | （所有・弱） | 1 — 0..* | Own | `erd:236`, `xsd:1241` |
| 21 | `Calendar` | `Exception` | （所有・弱） | 1 — 0..* | Own | `erd:237`, `xsd:1331` |
| 22 | `TaskGroup` ‼️ | `Comment` ‼️ | `Comment.anchorGroupId` | 1 — 0..* | GRS | `erd:1419` |
| 23 | `Task` | `Comment` ‼️ | `Comment.anchorTaskUid`（任意） | 0..1 — 0..* | GRS | `erd:1420` |
| 24 | `TaskGroup` ‼️ | `HighlightBox` ‼️ | `HighlightBox.topGroupId` | 1 — 0..* | GRS | `erd:1427` |
| 25 | `TaskGroup` ‼️ | `HighlightBox` ‼️ | `HighlightBox.bottomGroupId` | 1 — 0..* | GRS | `erd:1428` |
| 26 | `Task` | `TaskGroup` ‼️ | `TaskGroup.derived_from_task_uid`（**ERD に線が無い**） | 0..1 — 0..* | GRS | `erd:314`（§未解決 U-3） |

**26 本**（自分で数えた。うち MSPDI 由来 **15**（#1–4, 6–13, 19–21）・GRS 新設 **11**（#5, 14–18, 22–26））。

**依存の向きの規則**: GRS 追加（`TaskGroup` / `TaskVisual` / `TaskOrigin`）→ `Task`。**逆流させない**（Task 無汚染）。`Task` から GRS 側を指す列は 1 つも無い（`erd:118`, `erd:378`）。

**Carry の中に UID 参照は 1 つも残らない**（限定版の不変条件）:

| 主張 | 検証 | 出典 |
| --- | --- | --- |
| MSPDI の UID 相互参照は全 7 つで、その全部が Consume（GRS の列になる） | XSD を機械列挙して **7 つ**（`BaseCalendarUID` / `CalendarUID`×3 / `PredecessorUID` / `TaskUID` / `ResourceUID`）＝一致 | `erd:529`–`erd:536`, `xsd:1230,414,2011,2841,2168,3202,3207` |
| ゆえに UID を振り直しても全参照が構造的に追従し、**UID 再マップ表は不要** | — | `erd:512`, `erd:537`, `erd:1693`–`erd:1699` |
| ただし**一般化してはならない** — `TimephasedData/UID`（自己識別）・`ExtendedAttribute.FieldID` / `OutlineCode.ValueID` / `ValueGUID` / `Ltuid` 等の**定義への参照**は Carry 内に残る | XSD 実在を確認: `FieldID`(749,992,2254,2419,2918,3011,3587) / `ValueID`(781,2424,3016) / `ParentValueID`(809) / `Ltuid`(1075) / `ValueGUID`×5 | `erd:1705` |
| Carry ストアは**所有エンティティの下にぶら下げる**（グローバル索引を持たない）。2 文書の Carry を併合すると番号が衝突しうるため | — | `erd:1705` |

---

## 5. 弱エンティティと連鎖削除

| 対象 | 識別上の弱さ（PK が親を含む） | 連鎖して消えるもの | 通知 | 出典 |
| --- | --- | --- | --- | --- |
| `WeekDay` / `Exception` | **あり**（親 `Calendar` ＋ `ordinal`） | 親 `Calendar` と運命を共にする | 記載なし | `erd:359`, `erd:709` |
| `TaskVisual` | **あり**（`task_uid` が PK） | `Task` 削除で消える | 削除件数をトーストで通知 | `erd:333`, `erd:673` |
| `TaskOrigin` | **あり**（`task_uid` が PK） | `Task` 削除で消える（**§5.5c の一覧に無い**・§未解決 U-10） | — | `erd:326`, `erd:673` |
| `TaskGroupMember` | **あり**（親 2 つを参照・PK 未宣言） | `Task` 削除／`TaskGroup` 削除（後者は Task を消さず器から出すだけ） | 同上 | `erd:673`–`erd:674` |
| `Dependency` | **あり**（両端の `Task.uid` が PK の一部） | 当該 Task を端点とする行 | 同上 | `erd:673` |
| `Assignment` | **なし**（自前 `uid`） | `Task` 削除／`Resource` 削除 | 同上。**Carry（`Units`・工数・コスト・201 予約枠）も一緒に消える**ので通知する | `erd:673`, `erd:675`, `erd:677` |
| `Comment` / `HighlightBox` | **なし**（UUID） | 指していた `TaskGroup` / `Task` が消えたら連鎖削除 | 記載なし | `erd:1472` |
| `Resource` | — | **どの `Assignment` からも参照されなくなっても自動削除しない**（削除は人が明示的に行う） | — | `erd:619` |
| `Calendar` | — | **規定が無い**（§未解決 U-9） | — | — |

---

## 6. マージの同一性（複数 MSPDI の取込・§5.4 / §8C）

### 6-1. 何と何を「同じタスク」とみなすか

| 段 | 規則 | 出典 |
| --- | --- | --- |
| 候補の集め方 | **UID の一致**で衝突候補を集める（本ファイルの読み。原典は「UID が一致しても…」「たまたま番号が同じ別タスク」という書き方で、**集め方を明示した行は無い**＝§未解決 U-6） | `erd:392`–`erd:396`, `erd:403` |
| 既定の分岐（C-1） | 取込側 `Project.UID` と**既存の出自**を比較。**一致＝同一マスタ → 既定「上書き」** / **不一致＝別マスタ → 既定「別 UID」**。別マスタ×上書きは警告 | `erd:390`–`erd:397` |
| 照合の可否 | **GRS 生まれ（`TaskOrigin` 行が無い）は照合対象にしない**（UID が一致しても常に衝突として扱う） | `erd:403` |
| マスタ由来の照合キー | **`(source_project_uid, source_uid)`**。一致すれば同一タスク（別 UID で振り直した後も突合でき、再取込の複製を防ぐ） | `erd:404`, `erd:1688` |
| どちらの UID を動かすか | **外部識別を持たない側**。既存が GRS 生まれ → 既存側を再採番。双方マスタ由来で `source` が違う → 取込側を再採番 | `erd:406`–`erd:411` |
| 粒度（C-2） | **取込 1 回につき 1 度だけ問い、衝突全件へ一括適用** | `erd:418` |
| 往復（C-3） | 「別 UID」で振り直したタスクは**元ソースへの往復を諦める** | `erd:425`, `erd:428` |

### 6-2. ダイアログは 2 つだけ・他は自動

| 対象 | 選択肢 / 規則 | 出典 |
| --- | --- | --- |
| `Task` 衝突 | 1. 上書き（既存 UID 維持・往復○） / 2. 別 UID（`uid_high_water_mark + 1`・往復✗） / 3. キャンセル | `erd:422`–`erd:426` |
| `Project` メタ衝突 | 1. 上書き / 2. 既存を保持 / 3. キャンセル | `erd:433`–`erd:437` |
| `Calendar` | **内容一致（名前＋稼働曜日＋祝日）なら自動統合**。不一致で UID 衝突なら再採番＋名前に接尾辞 | `erd:497` |
| `Resource` | **`Name` が非空かつ NFKC 正規化＋trim 後に完全一致なら自動統合**。名前なし・不一致なら再採番 | `erd:498` |
| `Assignment` | 自然キー `(task_uid, resource_uid)` 一致なら統合。UID 衝突は再採番 | `erd:499` |
| `Task` 以外の全 UID | **衝突したら必ず再採番**（無規則の衝突を残さない＝代理キー廃止の前提を守る） | `erd:500`, `erd:502` |

### 6-3. 「上書き」で何が置き換わるか（層で分ける）

| 層 | 上書き時 | 出典 |
| --- | --- | --- |
| `Task` の Own / Consume 列・`carry`・`Dependency` | **置換** | `erd:445` |
| `TaskVisual` | **保持**（置換すると再取込のたびに見た目が壊れる） | `erd:446` |
| `TaskGroupMember` | **保持**（マルチバー配置が毎回リセットされるのは致命的） | `erd:447` |
| `TaskOrigin` | 更新（`source_uid` は維持し `last_seen_import_seq` を今回値に） | `erd:448` |
| 取込側にあって既存に無い Task | **追加する** | `erd:452` |
| 既存にあって取込側に無い Task | **削除しない。印も立てない。最終目撃記録から導出して通知**（§7-3） | `erd:458`–`erd:487` |

### 6-4. 取込のアトミック性

**取込は全か無かのトランザクション**。衝突検出・自動統合の判定は**全てドライラン**で行い、決定後に一括適用する。Undo の 1 単位も取込全体。`uid_high_water_mark` は Undo でも巻き戻さない。localStorage 自動保存は取込トランザクション完了後にのみ発火（`erd:504`–`erd:506`）。

**明示的に許容する Drop は 1 件だけ**: マージ時の取込側 Carry の欠落（Project メタ「既存を保持」や Calendar / Resource の自動統合で発生）。Drop=0 は**単一 MSPDI の未編集往復**に限る（`erd:508`–`erd:510`, `erd:1711`, `ledger:646`）。

---

## 7. 保存しないものの全体像（§5.6 原則）

**原則**: エンジンが毎回決められるもの（自動配線の経路・派生値）は**データとして持たない**。保存すると「保存値 vs 再計算結果」のドリフトが生まれる（`erd:1007`, `erd:119`, `erd:115`）。
**対になる原則**: 見た目に影響するものは全て保存・共有する（`erd:120`, `erd:1223`）。**この 2 つの境界が §7-2 の監査表**である。

### 7-1. Reconstruct — 正規 JSON に持たず export で焼き込む（**全 9 件**）

| # | MSPDI 出力 | 算出元 | タイミング | 出典 |
| --- | --- | --- | --- | --- |
| 1 | `Task/ID` | `wbs_order` ＋深さ優先順 | export | `erd:1629` |
| 2 | `Task/OutlineLevel` | `wbs_parent_uid` の木の深さ | export | `erd:1630` |
| 3 | `Task/OutlineNumber` | `wbs_parent_uid` の木のパス | export | `erd:1631` |
| 4 | `Task/Summary` | 子の有無 | export | `erd:1632` |
| 5 | `Task/Duration` | **編集済のみ** `finish − start` ＋暦。**未編集は Carry を優先**（＝純 Reconstruct ではない） | export | `erd:1633`, `erd:1642`, `ledger:431` |
| 6 | `Project/FinishDate` | 全 Task 最遅のロールアップ | export | `erd:1634`, `erd:1576` |
| 7 | `Resource/ID` | resources 配列の 0 起点連番 | export | `erd:1635` |
| 8 | `Project/SaveVersion` | **固定値 12**（XSD 必須）。Carry があれば優先 | export | `erd:1636`, `xsd:232` |
| 9 | `Project/CurrencyCode` | **既定 `"JPY"`**（XSD 必須）。Carry があれば優先 | export | `erd:1637`, `xsd:390` |

**Reconstruct にしないと決めたもの（＝保存する側へ回った 3 件）**

| 要素 | 判断 | 理由 | 出典 |
| --- | --- | --- | --- |
| `Task/PercentComplete` | **Own（保存する）** | 読まないと外部マスタの進捗を消す。当初 Reconstruct としたのは**逆だった** | `erd:1640`, `ledger:455`, `erd:1815` |
| `Task/ActualDuration` | **Own（保存する）** | 実績バーの長さそのもの。Carry にすると右端の出所が 2 つになる | `erd:1644`, `pa:55` |
| `Task/RemainingDuration` | **Carry**（完了時だけ GRS が `0` を書く＝Carry の唯一の例外） | 進行中は `ActualFinish` が空で単純再計算が破綻 | `erd:1641`, `ledger:457`, `pa:1136` |

### 7-2. §5.6 の監査で「無駄」と判定して落としたもの（**5 判定 / 2 テーブル ＋ 6 列**）

| # | 対象 | 措置 | 理由 | 出典 |
| --- | --- | --- | --- | --- |
| 1 | `DependencyRoute` **テーブル全体** | **削除** | 依存線は全自動配線で人が触らないので毎回算出すれば足りる。保存すると再計算結果との二重管理＝ドリフト | `erd:1015`, `erd:1009`, `erd:1809` |
| 2 | `GroupViewState` **テーブル全体** | **削除**（書式 3 列を `TaskGroup` へ畳み込み） | `TaskGroup` は元から GRS 独自で、「MSPDI 核を汚さないための分離」が不要 | `erd:1030`, `erd:1264`–`erd:1266`, `erd:1808` |
| 3 | `Project.ScheduleFromStart` | Own → **Carry** | GRS はスケジューラを持たず前方/後方計算をしない＝意味を使わない | `erd:1016`, `ledger:520` |
| 4 | `Project.CurrentDate` | Own → **Carry** | 「今日線」は実行時のシステム日付で描く。保存すると保存時点で凍結する | `erd:1017`, `ledger:521` |
| 5 | サーバ管理 4 列（`MicrosoftProjectServerURL` / `ProjectExternallyEdited` / `ActualsInSync` / `AdminProject`） | Own(暫定) → **Carry** | MVP にサーバ連携が無く GRS は解釈しない | `erd:1018`, `ledger:523` |

> **Carry は「捨てた」ではない。** passthrough ストアに温存して export で書き戻す。ただし**本 ERD には構造として出さない**（`erd:20`, `erd:117`, `erd:1703`）。

### 7-3. 列にせず毎回導出するもの（**14 件**・詳細 ERD に載せない）

| # | 導出するもの | 算出元 | 出典 |
| --- | --- | --- | --- |
| 1 | 実績バーの**右端** | `actualStart + actualDuration`（稼働日で加算） | `pa:64`–`pa:68`, `erd:28` |
| 2 | `Task/Stop`（中断日） | `actualStart + actualDuration`。**中断のときだけ** export に書く（中断していないタスクに書くと相手が「分割されている」と誤解する） | `erd:1518`, `erd:32`, `pa:70`, `pa:1128`, `pa:1141`–`pa:1148` |
| 3 | WBS の**深さ** / `OutlineLevel` | `wbs_parent_uid` を根まで辿って数える。**GRS は深さの数値を持たない** | `erd:811`–`erd:817`, `pa:836`–`pa:843` |
| 4 | 依存線の**経路** | エンジンが毎回算出（人は一切触らない）。規則の正は `ui-detail-spec-ja.md` §4-9 | `erd:1009`, `erd:1124` |
| 5 | 「マスタから消えた候補」 | `TaskOrigin.last_seen_import_seq < max(last_seen_import_seq WHERE source_project_uid = X)`。**フラグを立てない** | `erd:476`–`erd:485` |
| 6 | テーマから解いた**色** | `TaskVisual.fillColor` / `strokeColor` / `TaskGroup.color` が `null` のとき `themeHue` / `themePreference` から contrast 規則で解く。**解いた結果はどこにも保存しない** | `erd:1037`–`erd:1043`, `erd:1100` |
| 7 | 注記用の固定色 | `HighlightBox.strokeColor` が `null` のときの解決先（テーマから独立）。**値は未定** | `erd:1093`, `erd:1106` |
| 8 | 担当者の**表示文字列** | `Task → Assignment → Resource.name`。`Assignment.uid` 昇順で先頭 1 名 ＋「他 m 名」。`Task` に担当者の列は持たない | `erd:543`–`erd:554`, `erd:541` |
| 9 | 自動の**積み順** | `stack_order` が `null` の member を `start` 昇順 → `finish` 降順 → `uid` 昇順で割り当てる（決定的） | `erd:1151`–`erd:1156`, `erd:1203` |
| 10 | LOD の見え方 | タスク LOD は WBS の深さ（`min(深さ, 5)`）、グループ LOD は `TaskGroup` の深さを 1 つずつ下げて試す | `erd:833`–`erd:837`, `pa:842`, `pa:860`–`pa:869` |
| 11 | ラベルの占有幅 | 概算式（実測しない・**キャッシュも持たない**） | `pa:903`–`pa:909` |
| 12 | 遅れ `(!)` の判定 | 基準日と `finish` / `start` / `resume` の比較（3 条件） | `pa:411`–`pa:415`, `pa:1096` |
| 13 | イナズマ線の頂点 | 状態ごとに `resume` / `start` / 実績バー右端 / 打たない | `pa:720`–`pa:728` |
| 14 | `actualPlacement`（`'inside'` / `'below'` / `'atActualDate'`） | `shapeKind` から導出。**`previous-project-result` の 2 原典に無い語**（§未解決 U-7） | `glossary:55` |

**この原則の明示的な例外（導出できるのに保存するもの）**

| 例外 | なぜ保存するか | 出典 |
| --- | --- | --- |
| `Task.percentComplete` | 日付から算出できるが**格納する**（`round(actualDuration ÷ (finish − start) × 100)`）。未編集タスクは受け取った値をそのまま返す（丸め誤差で往復がずれないように） | `pa:128`–`pa:131`, `pa:1231`–`pa:1233`, `erd:264` |
| `TaskOrigin.last_seen_import_seq` / `documentSettings.import_seq` | **保存するのは観測記録だけ、判定は導出**（フラグを持たない） | `erd:485`, `erd:1130` |
| `Project.uid_high_water_mark` | **削除済みを含む**最大値なので現存行から導出できない | `erd:1574` |
| 疎な上書き列（`stack_order` / `height` / `nameAnchor` / `nameAlign` / `fillColor` / `strokeColor` / `TaskGroup.color` / `HighlightBox.strokeColor`） | 既定は毎回算出。**人が触った時だけ値を持つ**（`null`=自動 / 値=人の上書き）。人の意図は自動規則では復元できない | `erd:1032`, `erd:1021`–`erd:1024`, `erd:1206`–`erd:1217` |
| `TaskGroup.collapsed` / `order` / `Task.wbs_order` | ユーザー操作の意思。**見た目の一部なので保存し共有で再現する** | `erd:1027`, `erd:1029` |

### 7-4. 文書に保存しないもの（一時状態・環境）

| 対象 | 置き場所 | 理由 | 出典 |
| --- | --- | --- | --- |
| 選択 / ホバー / Undo・Redo 履歴（**3 種**） | メモリのみ | 見た目を構成しない操作中の状態 | `erd:1254`, `erd:1260` |
| Undo 履歴 | **localStorage に入れない** | 保存するのは現在の文書だけ。クラッシュ復旧で履歴が失われるのは許容 | `pa:1018` |
| `language`（`ja` / `en`） | localStorage | 読む人の言語 | `erd:1303`, `glossary:237` |
| `watermark`（有効 / ユーザー名 / 日時） | どこにも保存しない | **開いた人の名前と日時で描く**のが証跡として正しい | `erd:1304`, `erd:1333`–`erd:1343` |
| 画面にも出力にも出ない **9 項目**（掴み代 4 / Undo 2 / ズームの刻みと範囲 3） | 製品の定数 | — | `erd:1305` |

> ⚠️ **2026-07-31 に「保存しない」の範囲を狭めた**: テーマ / ペイン幅 / ズーム / スクロールは `documentSettings` へ移した（文書が「人に見せたい場所」を持てないと WYSIWYG が成立しない）。スクロールは px で持たず `scrollDate` / `scrollGroupId` で持つ（`erd:1237`–`erd:1240`, `erd:1329`）。

### 7-5. 廃止・却下されて列にならないもの

**(a) 予実の上書きで廃止（`pa` が正・`erd` の記述は旧版）— 5 件**

| 廃止した語 | 置き換え | 出典 |
| --- | --- | --- |
| `progressRatio`（0..1） | **`percentComplete`**（整数・0 以上・頭打ちにしない） | `erd:27`, `pa:1083`, `pa:149`–`pa:157` |
| `importance` | **廃止**。LOD は WBS の階層の深さで判定 | `erd:33`, `pa:825`, `pa:1088` |
| `progressStatus`（自由文字列） | **廃止**。状態が `actualFinish` / `resume` / `resumeValid` で構造化された | `erd:34`, `pa:1087`, `pa:1091`–`pa:1100` |
| `iconShapeKind` | **`shapeKind`** へ改名 | `erd:35`, `pa:1044`, `pa:1082` |
| 保存する `stop` | **保存しない**（export で算出・§7-3 #2） | `erd:32`, `pa:70` |

**(b) 設計の途中で却下・廃止して列/テーブルにならなかったもの — 14 件**（自分で数えた）

| # | 却下・廃止したもの | 理由 | 出典 |
| --- | --- | --- | --- |
| 1 | `Task.id`(UUID) ＋ `mspdi_uid` の 2 本立て | MSPDI の UID で足り、二重識別は不要 | `erd:1806` |
| 2 | `Dependency.id`（代理キー） | MSPDI は依存線に ID を振らないので自然キーが素直 | `erd:1807` |
| 3 | UID 再マップ表 | UID 参照 7 つが全て Consume になり、参照が構造的に追従するようになった | `erd:512`, `erd:1812` |
| 4 | 番号空間の分割（予約帯） | 値に意味を持たせるぶん脆く、同じ規則の別 GRS 文書とは結局ぶつかる | `erd:368`, `erd:1691` |
| 5 | `ImportLog{seq, 日時, ファイル名}` 表 | 連番だけで機能は成立する（出力を絞る方針） | `erd:491` |
| 6 | `Task` の担当者の自由文字列列 | 情報源は `Assignment` → `Resource.name` だけ（Task 無汚染） | `erd:541` |
| 7 | `fillTransparent`（真偽の列） | 色を決める場所が 2 つになり、矛盾状態を表現できてしまう | `erd:1082` |
| 8 | `planActualStyle`（`'overlap'` / `'separate'`） | 上下分離表示そのものを廃止（高さの差で幾何的に解く） | `erd:1401`, `pa:384` |
| 9 | `todayLineVisible` | 本日線の位置は実行時のシステム日付。保存すると「同じ JSON → 同じ表示」が明日には破れる | `erd:1295` |
| 10 | `progressLineColor` | 文書に保存すると `themeHue` を変えたときこの線だけ取り残される | `erd:1047`, `pa:572`–`pa:573` |
| 11 | `labelOffset`（px） | px 保存は縦横独立ズームで崩れる | `erd:1231`, `erd:1219` |
| 12 | `sections[]` / `classificationNodeStates[]` | 前者は `TaskGroup` の階層が兼ねる。後者は `TaskGroup.collapsed` に吸収 | `erd:1233`–`erd:1234` |
| 13 | 行を**インデックス**で指す参照（`anchorRowIndex` / `topRowIndex` / `bottomRowIndex`） | 並べ替え・畳み・非表示で別の行を指す。`TaskGroup.id` 参照にした | `erd:1434`–`erd:1440` |
| 14 | ダミータスク（レベル飛びの中間に親を捏造する） | MSPDI に存在しないタスクを生み、往復で増殖する | `erd:807` |

**(c) 分割区間のリスト**: MSPDI が `Stop` / `Resume` / `ResumeValid` を **Min 0 / Max 1** でしか持たない（中断の履歴が無い）ため、**GRS も分割区間のリストを持たない**。持てば往復で必ず落ちる（`pa:90`–`pa:100`。XSD で `Task/Stop`(1747) / `Resume`(1752) / `ResumeValid`(1757) が `minOccurs="0"` かつ `maxOccurs` 既定=1 であることを確認）。

### 7-6. 保存はするが ERD に出さないもの（区別すること）

| 区分 | 扱い | 出典 |
| --- | --- | --- |
| **Carry**（フィールド単位） | 所有エンティティの `carry: { フィールド名: 文字列値 }` に温存。export で書き戻す | `erd:699` |
| **Carry**（要素まるごと） | 親の `carry_elements: [{ name, ordinal, fields, children }]`。ネイティブ行を作らない要素（`IsNull=1` の Task/Resource、`DayType=0` の WeekDay、重複依存リンク、`CrossProject` リンク、`TaskUID` 欠落 Assignment、断捨離した 21 テーブル） | `erd:700` |
| `null` の意味 | **`null` ＝元ファイルにその要素が無かった**（`0` や `false` とは違う）。**GRS の JSON は Own/Consume 列を常に出力し、キーを省略しない**。MSPDI へ書くときだけ省略する | `erd:722`–`erd:729` |
| 例外 | XSD の必須要素は `null` でも必ず書く（`WeekDay/DayType`・各 `UID`・`SaveVersion`・`CurrencyCode`） | `erd:726`, `xsd:1204,1247,1559,232,390` |

---

## 8. 予実領域の上書き差分（`erd` 旧版 → `pa` が正）

**`erd` 冒頭の上書き表は 9 行**（`erd:27`–`erd:35`）、**`ledger` 冒頭の上書き表は 6 行**（`ledger:24`–`ledger:29`）。両方を突き合わせて重複を除くと **11 件**（自分で数えた）。

| # | `erd` / `ledger` の旧記述 | **確定（`pa` が正）** | 出典 |
| --- | --- | --- | --- |
| 1 | `progressRatio`（0..1） | **`percentComplete`**（整数・0 以上・頭打ちにしない）。`actualDuration` から算出して**格納**する | `erd:27`, `pa:59`, `pa:149` |
| 2 | `actualFinish` を実績バーの右端とする | **右端は `actualStart + actualDuration`**。`actualFinish` は**完了時だけ**入る | `erd:28`, `pa:64`–`pa:68` |
| 3 | （無し） | **`actualDuration` を追加**（稼働日数・実績バーの長さそのもの） | `erd:29`, `pa:55` |
| 4 | （無し） | **`resumeValid` を追加**（`false` = 再開日未定の中断＝中止） | `erd:30`, `pa:58` |
| 5 | `Stop` / `Resume` は拡張領域 | **`Stop` / `Resume` / `ResumeValid` は Own（MSPDI ネイティブ）**。§3-4 #8 の判断を撤回 | `erd:31`, `pa:1157`, `pa:1173`–`pa:1178` |
| 6 | `stop` を保存する | **保存しない**（中断時の右端と同じ値なので export で算出） | `erd:32`, `pa:70` |
| 7 | `importance`（LOD の選別） | **廃止**。LOD は WBS の階層の深さ（`wbs_parent_uid` から導出） | `erd:33`, `pa:825` |
| 8 | `progressStatus`（自由文字列） | **廃止**（状態が構造化された） | `erd:34`, `pa:1091` |
| 9 | `iconShapeKind` | **`shapeKind`** へ改名 | `erd:35`, `pa:1044` |
| 10 | `ActualDuration` = Carry / `ResumeValid` = Carry（`ledger`） | **どちらも Own** | `ledger:24`, `ledger:26`, `pa:55` |
| 11 | `OutlineLevel` は 6 段以上を 5 段へクランプし Drop（`ledger`） | **クランプしない**。階層は `wbs_parent_uid` が持ち export で深さから算出。**LOD の判定でだけ 5 で頭打ち** | `ledger:28`, `pa:834`–`pa:856`, `erd:839` |

**拡張領域の消費は 6 枠 → 2 枠**（`fadeInDays` / `fadeOutDays` のみ）（`erd:37`, `pa:1182`–`pa:1198`）。

**識別・非保存に効く帰結**:
- `Task` の実績列は `actualStart` / `actualDuration` / `actualFinish` / `percentComplete` / `resume` / `resumeValid` の **6 列**（`stop` は列にしない）。
- LOD が `importance` を必要としなくなったので、**`Task` に人が付ける属性が 1 つも増えない**（`pa:1345`）。
- 中断の履歴を持たないので、**分割区間の子テーブルが要らない**（`pa:100`）。

---

## 9. 用語辞書（`glossary`）との突合 — 要改名

命名の規約: 識別子は英語・lowerCamelCase 既定。**snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけ**。`type` `data` `info` `value` のような汎用語は使わない。

| 対象（原典の名） | 判定 | 突合先 / 直し方 | 出典 |
| --- | --- | --- | --- |
| `wbs_parent_uid` | **合致**（許可された 3 語の 1 つ） | `glossary:60`（P-22） | `erd:255` |
| `link_type` | **合致**（許可された 3 語の 1 つ） | — | `erd:276` |
| `Project.status_date` | **合致**（許可された 3 語の 1 つ） | `glossary:244`, `glossary:80`（U-11 `Status Line`） | `erd:247` |
| `stack_order` | **要改名** → **`stackOrder`** | `glossary:28`（N-4） | `erd:323` |
| `stack_direction` | **要改名** → **`stackDirection`** | `glossary:205`（K-73） | `erd:1131` |
| `import_seq` | **要改名** → **`importSeq`** | `glossary:218`（K-86） | `erd:1130` |
| `wbs_order` / `calendar_id` / `base_calendar_id` / `is_base` / `is_cost_resource` / `day_type` / `day_working` / `from_date` / `to_date` / `task_uid` / `resource_uid` / `group_id` / `parent_id` / `derived_from_task_uid` / `source_project_uid` / `source_uid` / `last_seen_import_seq` / `import_session_id` / `schema_version` / `uid_high_water_mark` / `start_date` / `minutes_per_day` / `minutes_per_week` / `days_per_month` / `week_start_day` | **要改名**（**25 語**・自分で数えた） | すべて lowerCamelCase へ（`wbsOrder` / `calendarId` / `baseCalendarId` / `isBase` / `isCostResource` / `dayKind`※ / `dayWorking` / `fromDate` / `toDate` / `taskUid` / `resourceUid` / `groupId` / `parentId` / `derivedFromTaskUid` / `sourceProjectUid` / `sourceUid` / `lastSeenImportSeq` / `importSessionId` / `schemaVersion` / `uidHighWaterMark` / `startDate` / `minutesPerDay` / `minutesPerWeek` / `daysPerMonth` / `weekStartDay`）。用語辞書に対応する行は無い | `erd:239`–`erd:340` |
| `Resource.type` | **要改名**（禁止された汎用語 `type`） | 例: `resourceKind`。MSPDI 側は `Resource/Type`（0=材料 / 1=作業）のまま | `erd:289`, `ledger:570` |
| `WeekDay.day_type` | **要改名**（snake_case ＋ `type`） | 例: `dayKind`（※ `link_type` は許可語なので据え置き） | `erd:300` |
| `meta_own`（`erd:251`） | **列ではない**（Mermaid の省略記法。9 つの Own メタの束）＋汎用語 | 詳細 ERD にこの名の列を作らない。実体は `Subject` / `Category` / `Company` / `Manager` / `Author` / `CreationDate` / `LastSaved` / `MinutesPerWeek` / `DaysPerMonth` | `erd:251`, `erd:1568`–`erd:1571` |
| PK 名の不揃い（`Task.uid` / `Resource.uid` / `Assignment.uid` に対し `Project.id` / `Calendar.id`） | **要統一** | 同じ MSPDI `UID` 由来なのに名が 2 通り。用語辞書に規定なし | `erd:352`–`erd:357` |
| `Comment`（エンティティ名） | **要改名の検討** → `CommentBox` | `glossary:83`（U-14 `Comment Boxes`。⚠「コメント」と略さない） | `erd:1414` |
| `HighlightBox` | **合致** | `glossary:84`（U-15 `Highlight Boxes`） | `erd:1424` |
| `TaskGroup` / `TaskGroupMember` | **合致** | `glossary:26`–`glossary:27`（N-2 / N-3） | `erd:311`, `erd:321` |
| `TaskGroup.order` | **要改名の検討** | `Task.wbs_order` と語が揃っていない。用語辞書に行が無い | `erd:315` |
| `Task.milestone` | **食い違い**（§未解決 U-5） | `glossary:25`（N-1）は「真偽値の `milestone` という列は持たない」と書く | `erd:260`, `pa:356` |
| `TaskVisual` / `TaskOrigin` / `Dependency` | 用語辞書に**行が無い**（未検証：仕様書側でこの名を採るのかが分からない） | — | `glossary:23`–`glossary:29` |

---

## 未解決

| # | 論点 | 原典どうしの状態 | 決めるべきこと |
| --- | --- | --- | --- |
| **U-1** | **`Project` の PK** | `erd:354` / `erd:240` は PK = `id`（= `Project.UID`）と書くが、同書 `erd:1567` と XSD（`xsd:238`–`247`）は `minOccurs="0"` の `xsd:string`(maxLength 16)＝**省略可**だと書く。省略時は取込セッション ID で代替し **export しない**（`erd:380`, `erd:1567`）。**null を取りうる値は PK にできない** | 「`Project` は PK を持たない（文書に 1 行）／`Project.UID` は Own の値かつマージの出自ラベル」と書き直すか、退化キーとして明示するか |
| **U-2** | **`TaskGroupMember` の PK が宣言されていない** | `erd:350`–`erd:360` の PK 表に行が無い。宣言されているのは `task_uid` **UNIQUE** だけ（`erd:322`） | 複合 PK `(group_id, task_uid)` か `task_uid` 単独か。1 タスク 1 行の制約からは `task_uid` 単独で足りる |
| **U-3** | `TaskGroup.derived_from_task_uid` が **ERD の線として描かれていない** | 列は `Task.uid` を指す（`erd:314`, `erd:969`）が、§5.2 の Mermaid にも §5.3 の PK 表にも出ない。さらに §5.5c の連鎖（`erd:671`–`erd:675`）に「導出元 Task を削除したとき」の規定が無い | FK として描くか。`label=null` かつ導出元が消えると **`erd:970` の「両方 `null` は禁止」に反する状態**が作れるので、連鎖規則が要る |
| **U-4** | GRS 新設テーブルの UUID は「代理キーを持たない」に反しないか | `erd:348` は全体規則のように書き出すが、`erd:110` / `erd:360` / `erd:1494` は **MSPDI 由来テーブルに限る**と書く。実際 UUID PK は `TaskGroup` / `Comment` / `HighlightBox` の **3 つ**ある | 次期の文章で「代理キー禁止は MSPDI 由来テーブルの規則」と最初に書く |
| **U-5** | **`Task.milestone` 列の有無が食い違う** | `erd:260` / `erd:1511` は `Task.milestone`（Own ← `Task/Milestone`）を持つ。`pa:356`–`pa:361` は「**権威は `Task.milestone`**、`shapeKind` は従属」と書く。一方 `glossary:25`（T-101 N-1）は「⚠️ **真偽値の `milestone` という列は持たない**」と書く。XSD には `Task/Milestone`（`xsd:boolean`・`xsd:1782`）が実在する | 仕様書側が正なら `shapeKind` が権威になり、MSPDI `Task/Milestone` の往復先と `pa` の不変条件が壊れる。**どちらが正かをユーザーに決めてもらう必要がある** |
| **U-6** | マージの**候補の集め方**が明文化されていない | `erd:392`–`erd:404` は「UID が一致しても…」「たまたま番号が同じ別タスク」と書くが、**衝突候補を UID 一致で集める**とはどこにも書いていない。`(source_project_uid, source_uid)` 照合との適用順序も未記載 | 「① UID 一致で候補を集める → ② 出自で解釈を変える」と明文化する。現状は**未検証**の読み |
| **U-7** | `actualPlacement`（`glossary:55` P-17） | `previous-project-result` の 2 原典に**この語が無い**。`erd` / `pa` は「`shapeKind` ごとの実績の置き方」を規則として書くだけで、名前を与えていない（`pa:220`–`pa:236`） | 導出値なので保存しない列のはずだが、**原典で確かめられない＝未検証**。次期が扱いを決める |
| **U-8** | `Exception.Type` は Consume なのに**列が無い** | `ledger:558` は `Exception.Type` を Consume（必須）とし、`erd:660`–`erd:665` は 1–8 なら要素まるごと Carry・欠落/9 ならネイティブ行、と書く。しかし §5.2 の `Exception` に `type` 相当の列が無い（`erd:303`–`erd:309`） | ネイティブ行の存在自体が「繰返しなし」を意味する設計と読めるが、**export で `Type` に何を書くか（省略か 9 か）が原典に無い** |
| **U-9** | **`Calendar` を削除したときの連鎖が定義されていない** | `erd:671`–`erd:675` の cascade 表は `Task` / `TaskGroup` / `Resource` の 3 行だけ。`Task.calendar_id` / `Resource.calendar_id` / `Project.calendar_id` / `Calendar.base_calendar_id` が dangling になりうる | 削除を禁じるか、参照を `null` に落とすか、既定暦へ寄せるか |
| **U-10** | `TaskOrigin` の連鎖削除が cascade 表に無い | `erd:673` は `Task` 削除で `TaskVisual` / `TaskGroupMember` / `Dependency` / `Assignment` を消すと書くが **`TaskOrigin` を挙げていない**。`TaskOrigin.task_uid` は PK なので当然消えるはずだが**明記が無い** | cascade 表に 1 行足す |
| **U-11** | 弱エンティティの `ordinal` が**列の一覧 2 か所で食い違う** | §5.2 の ERD は `WeekDay.ordinal` / `Exception.ordinal` を持つ（`erd:299`, `erd:304`）が、§7.4 の列詳細表（`erd:1581`–`erd:1591`）には `ordinal` が無い | どちらかに揃える。`ordinal` は Carry の付着キーなので必須（`erd:709`–`erd:711`） |
| **U-12** | ネイティブ `Dependency` に `ordinal` が無い | `erd:709` は `PredecessorLink` を「(親のキー, `ordinal`)」で識別すると書き、`erd:715` は「ネイティブ行も要素まるごと Carry も**同一の番号空間**で `ordinal` を振る」と書く。しかし `Dependency` に `ordinal` 列が無い（`erd:274`–`erd:278`） | 重複リンクを Carry へ退避したとき、export で原順序に戻せるかが未定 |
| **U-13** | `Project.uid_high_water_mark` / `schema_version` の**既定値と型**が原典に無い | `erd:241`–`erd:242`, `erd:1573`–`erd:1574` は責務だけを書く | 初期値（`0` か）と型（`schema_version` は文字列か整数か）を決める |
| **U-14** | `Task.ID` の Reconstruct の起点 | `erd:1629` は「出力順に振り直す」とだけ書く。`Resource.ID` は「0 起点連番」と明記（`erd:1635`）。弱エンティティの `ordinal` も 0 起点（`erd:711`） | `Task.ID` の起点（0 か 1 か）は**未検証** |
| **U-15** | Project メタ「既存を保持」を選んだときの `Project.id` | `erd:433`–`erd:437` は Project メタの置換 / 保持しか書かない。取込側の `Project.UID` をどう扱うかの明文が無い | 出自は `TaskOrigin.source_project_uid` に残るので実害は小さいが、明文化が要る |
| **U-16** | エンティティ総数 14 の根拠が 1 行しかない | `erd:126` が「全 14 エンティティ」と書くが、§5.0 の層の表も §6 の責務表も **12 行**で `Comment` / `HighlightBox` を含まない | 次期の ERD は 14 で描き、責務表にも 2 行足す |
| **U-17** | 命名（§9） | snake_case が許可 3 語以外に **25 語＋3 語（`stack_order` / `stack_direction` / `import_seq`）**、禁止された汎用語 `type` が 2 か所（`Resource.type` / `WeekDay.day_type`）、`meta_own` は列ですらない | 一括改名。用語辞書に行がある 3 語（`stackOrder` / `stackDirection` / `importSeq`）は辞書に合わせる |
| **U-18** | Drop=0 の適用範囲 | `erd:1710` / `ledger:646` は**単一 MSPDI の未編集往復**に限ると書き、マージ時の取込側 Carry 欠落を**唯一の明示的 Drop**として許容する | 次期も同じ限定を明記すること（「Drop=0」を無条件の主張として引き継がない） |
