# E05 — Calendar + WeekDay + Exception

暦クラスタ（`Calendar` / `WeekDay` / `Exception`）のデータモデル全数調査。
**原典の図は不完全である。** 図に無いが原典の散文が要求している列、および原典のどこにも器が無い列を、
本書では別表（表 4）に分けて記録した。

## 読んだ原典（全文）

| 原典 | 行数 | 読んだ範囲 |
|---|--:|---|
| `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.5b を含む） |
| `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文** |
| `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | 暦クラスタ全域 1198–1596（要素宣言 46 個・自分で数えた）＋ `CalendarUID` の 3 箇所（414 / 2011 / 2841）＋ 全体の `minOccurs` 統計 |
| `docs/spec/_assets/tbl-glossary.md` | 259 | **全文**（命名の突き合わせ用） |
| `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1300+ | 暦に触れる箇所のみ（55 / 67 / 128 / 678 / 1118 / 1249 行）。予実の正だが暦の記述は上記 6 行だけで、暦クラスタを上書きする記述は無い |

**出典の書き方**: `ファイル名:行番号`。ファイル名は上表の basename を使う。

**XSD で自分が数えた事実**

| 事実 | 実測値 | 出典 |
|---|--:|---|
| 暦クラスタ（`Calendars` 開始〜終了）の `xsd:element` 宣言 | **46** | `mspdi_pj12.xsd:1198`–`1596` |
| XSD 全体の明示 `minOccurs="1"` | **3**。うち **3 つとも暦クラスタ**（`Calendar` / `WeekDay/DayType` / `WorkWeek/WeekDay/DayType`） | `mspdi_pj12.xsd:1204` / `:1247` / `:1559` |
| XSD 全体の `minOccurs` 属性なし（＝暗黙必須） | **22**。うち暦クラスタは `Calendar/UID` の 1 つ | `mspdi_pj12.xsd:1210` ほか |
| XSD 全体の `xsd:unique` / `xsd:key` / `xsd:keyref` | **0** | `mspdi_pj12.xsd`（全文 grep・0 件） |
| `Exception` の子要素 | **13**（下記の内訳で 1+1+1+1+1+8 に一致） | `mspdi_pj12.xsd:1337`–`1497` |
| `Exception` の繰返し詳細（`Type` を除く） | **8** | `mspdi_pj12.xsd:1337`,`1361`,`1394`,`1399`,`1404`,`1423`,`1437`,`1458` |

---

## 1. GRS が稼働判定に実際に使う列と、往復のためだけに持つ列

**⚠️ この節が本エンティティの要である。** 暦クラスタは「稼働日を灰色に塗る」ためだけに存在し
（`grs-native-erd-ja.md:138` / `:1485`–`1487`）、MSPDI の暦の大部分は解釈されない。

| 用途 | 列 | 出典 |
|---|---|---|
| **稼働曜日の判定に使う** | `WeekDay.dayType`（1–7）／ `WeekDay.dayWorking` | `grs-native-erd-ja.md:642` / `:1587`–`1588` |
| **例外日（祝日）の判定に使う** | `Exception.fromDate` / `toDate` / `dayWorking`、**＋ ゲートとして `Exception` の繰返し種別**（下記 §3） | `grs-native-erd-ja.md:644`–`:645` / `:660`–`:663` |
| 表示に使う（描画位置は原典に無い・**未検証**） | `Calendar.name`（「暦名・表示」）／ `Exception.name`（「祝日名・祝日ラベル」） | `grs-native-erd-ja.md:1584`,`:1589` / `grs-mspdi-field-ledger-ja.md:548`,`:554` |
| **参照の解決にだけ使う**（描画には使わない） | `Calendar.baseCalendarUid`。**個別暦（`Task.calendar_id` / `Resource.calendar_id`）は現状未使用で、描画は既定暦で行う** | `grs-native-erd-ja.md:1019` |
| **用途が原典に無い（未検証）** | `Calendar.isBaseCalendar`。「基準暦か」「基準/派生の区別」としか書かれておらず、**これを読む処理が原典のどこにも無い** | `grs-native-erd-ja.md:1585` / `grs-mspdi-field-ledger-ja.md:549` |
| **解釈せず往復のためだけに持つ** | `WeekDay/TimePeriod`（2003 形式）／ `WorkingTime`（両親とも）／ `WorkWeek` 系一式／ `Exception` の繰返し詳細 8 個／ `DayType=0` の `WeekDay` 要素まるごと／ 繰返し種別 1–8 の `Exception` 要素まるごと | `grs-native-erd-ja.md:643`,`:646`,`:663` / `grs-mspdi-field-ledger-ja.md:553`,`:557`,`:559` |

> **「使う列」は 6 個、「往復のためだけの列」は 22 行分ある**（表 5 で全数）。
> 暦の情報量のほとんどは Carry である。

---

## 2. 表 1 — `Calendar`

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `id` **要改名 →** `uid` | 整数 | 不可 | PK | — | Own | `Calendars/Calendar/UID`（`xsd:integer`・`minOccurs` 属性なし＝**暗黙必須**） | — | 代理キーを持たない（MSPDI UID をそのまま PK にする）。`null` でも export では必ず書く（XSD 必須要素の焼き込み対象）。文書内一意。取込で衝突したら**内容一致なら自動統合／不一致なら再採番＋名前に接尾辞**。**要改名の理由**: 他の MSPDI 由来エンティティは `Task.uid` / `Resource.uid` / `Assignment.uid` と `uid` なのに暦だけ `id` で、GRS 新設の `TaskGroup.id`（UUID）と紛らわしい | `grs-native-erd-ja.md:281`,`:355`,`:497`,`:726`,`:1583` / `grs-mspdi-field-ledger-ja.md:547` / `mspdi_pj12.xsd:1210` |
| `name` | 文字列（≤512） | 可 | — | — | Own | `Calendars/Calendar/Name`（`xsd:string` `maxLength=512`・`minOccurs=0`） | — | `null` = 元ファイルに要素が無かった。JSON では `null` を明示し、MSPDI へ書くときだけ省略する。**取込時の内容一致判定（自動統合）の入力の 1 つ**（名前＋稼働曜日＋祝日） | `grs-native-erd-ja.md:282`,`:497`,`:721`–`:729`,`:1584` / `grs-mspdi-field-ledger-ja.md:548` / `mspdi_pj12.xsd:1215` |
| `is_base` **要改名 →** `isBaseCalendar` | 真偽 | 可 | — | — | Own | `Calendars/Calendar/IsBaseCalendar`（`xsd:boolean`・`minOccurs=0`） | — | `null` / `false` / 未指定を潰さない。**この列を読む処理は原典に無い（未検証）**。**要改名の理由**: snake_case は許可 3 語（`wbs_parent_uid` / `link_type` / `Project.status_date`）に含まれない。`isBase` では何の base か読めないので MSPDI 名に寄せる | `grs-native-erd-ja.md:283`,`:1585` / `grs-mspdi-field-ledger-ja.md:549` / `mspdi_pj12.xsd:1225` |
| `base_calendar_id` **要改名 →** `baseCalendarUid` | 整数 | 可 | FK | `Calendar.uid`（自己参照） | Consume | `Calendars/Calendar/BaseCalendarUID`（`xsd:integer`・`minOccurs=0`） | — | XSD 注記「基準暦でない場合にのみ適用」。**Carry に UID 参照を残さない不変条件**のため Consume（UID 再採番に構造的に追従させる）。**派生暦の継承をどう解決するか（`WeekDay` が無い派生暦の稼働判定）は原典に無い＝未検証**。**要改名の理由**: snake_case 禁止。参照先は UID なので `Id` ではなく `Uid` | `grs-native-erd-ja.md:284`,`:533`,`:1586` / `grs-mspdi-field-ledger-ja.md:550` / `mspdi_pj12.xsd:1230` |

**`Calendar` に関する構造の事実**

- `Calendars` は `minOccurs=0`。ただし**存在する場合は `Calendar` が 1 個以上必要**（`minOccurs="1" maxOccurs="unbounded"`）。
  XSD の散文は "Projects must have one base calendar." と言うが、**スキーマとして強制していない**
  （`mspdi_pj12.xsd:1198`,`:1204`,`:1206`）。
  → **`grs-native-erd-ja.md:758` の出口検査「`Calendars/Calendar` が出力されているか」は条件付きである**（`Calendars` 自体は省略可）。
- `Calendar` の子は 7 つ: `UID` / `Name` / `IsBaseCalendar` / `BaseCalendarUID` / `WeekDays` / `Exceptions` / `WorkWeeks`（`mspdi_pj12.xsd:1210`–`1508`）。
  うち後ろ 3 つはコンテナ（wrapper）で、JSON では配列に吸収する（`grs-mspdi-field-ledger-ja.md:372`–`373`）。

---

## 3. 表 2 — `WeekDay`（`Calendars/Calendar/WeekDays/WeekDay`）

**弱エンティティ**。PK は「親＋位置」（`grs-native-erd-ja.md:359` / `:709`）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `ordinal` | 整数 | 可 | PK（親＋位置の位置側） | — | GRS | （対応なし） | import 時に **0 起点**で採番 | Carry の付着キー兼、原順序の復元キー。**同一コレクション内の全要素（ネイティブ行も要素まるごと Carry も）に同じ番号空間で振る**。export は `ordinal` 順に出す。`null` = GRS で新規追加した行 → 既存の後ろ（末尾）へ | `grs-native-erd-ja.md:299`,`:709`–`:719` |
| `day_type` **要改名 →** `dayType` | 整数（列挙 1–7） | 可（ただし export では必ず書く） | PK（親＋位置の親側ではない・値） | — | Own | `Calendars/Calendar/WeekDays/WeekDay/DayType`（**明示 `minOccurs="1"`**・列挙 0–7） | **原典に無い＝未解決**（下記） | XSD の列挙は **0=Exception, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday**。**GRS のネイティブ行に入るのは 1–7 だけ**。`0`（2003 形式の例外日）はネイティブ化せず**要素まるごと Carry** へ退避する。XSD 必須なので `null` でも export で既定値を焼くと決めているが、**焼く値が原典に書かれていない**。**要改名の理由**: snake_case 禁止 | `grs-native-erd-ja.md:300`,`:643`,`:726`,`:758`,`:1587` / `grs-mspdi-field-ledger-ja.md:551`,`:658` / `mspdi_pj12.xsd:1247`–`1263` |
| `day_working` **要改名 →** `dayWorking` | 真偽 | 可 | — | — | Own | `Calendars/Calendar/WeekDays/WeekDay/DayWorking`（`xsd:boolean`・`minOccurs=0`） | — | **その曜日が稼働かどうか＝週末グレー表示の唯一の入力**。`null`（要素なし）と `false` を潰さない。**取込時の内容一致判定（自動統合）の入力の 1 つ**。**要改名の理由**: snake_case 禁止 | `grs-native-erd-ja.md:301`,`:497`,`:1588` / `grs-mspdi-field-ledger-ja.md:552` / `mspdi_pj12.xsd:1264` |

---

## 4. 表 3 — `Exception`（`Calendars/Calendar/Exceptions/Exception`）

**弱エンティティ**。PK は「親＋位置」（`grs-native-erd-ja.md:359`）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `ordinal` | 整数 | 可 | PK（位置側） | — | GRS | （対応なし） | import 時に **0 起点**で採番 | 表 2 の `ordinal` と同じ規則。番号空間は `Exceptions` コレクション単位 | `grs-native-erd-ja.md:304`,`:709`–`:719` |
| `name` | 文字列（≤512） | 可 | — | — | Own | `Calendars/Calendar/Exceptions/Exception/Name`（`xsd:string` `maxLength=512`・`minOccurs=0`） | — | 祝日名。**MSPDI に祝日マスタは無く、祝日は `Calendar` ごとに `Exception` を並べて表す**（「元日」「成人の日」…が 1 件ずつ）。**画面のどこに出すかは原典に無い＝未検証** | `grs-native-erd-ja.md:305`,`:648`,`:1589` / `grs-mspdi-field-ledger-ja.md:554` / `mspdi_pj12.xsd:1366` |
| `from_date` **要改名 →** `fromDate` | 日付（ERD 表記）／ MSPDI は `xsd:dateTime` | 可 | — | — | Own | `…/Exception/TimePeriod/FromDate`（`xsd:dateTime`・`minOccurs=0`。`TimePeriod` 自体も `minOccurs=0`） | — | **`TimePeriod` は親に 0..1 なので value-object として親フィールドへ畳み込む**。**⚠️ 実日付のレンジとして採用してよいのは、繰返し種別が欠落または `9` のときだけ**（§4-1）。**型の食い違い**: 原典 ERD は `date`、XSD は `dateTime`。時刻成分をどう往復させるかの規則が原典に無い＝**未検証**。**要改名の理由**: snake_case 禁止 | `grs-native-erd-ja.md:306`,`:662`,`:1590` / `grs-mspdi-field-ledger-ja.md:555`,`:375`–`376` / `mspdi_pj12.xsd:1342`,`:1348` |
| `to_date` **要改名 →** `toDate` | 日付（ERD 表記）／ MSPDI は `xsd:dateTime` | 可 | — | — | Own | `…/Exception/TimePeriod/ToDate`（`xsd:dateTime`・`minOccurs=0`） | — | 同上。XSD の `TimePeriod` の説明は "Defines a contiguous set of exception days"＝**連続した例外日の集合**であり、単一日ではない | `grs-native-erd-ja.md:307`,`:653`,`:1590` / `mspdi_pj12.xsd:1344`,`:1353` |
| `day_working` **要改名 →** `dayWorking` | 真偽 | 可 | — | — | Own | `…/Exception/DayWorking`（`xsd:boolean`・`minOccurs=0`） | — | 例外日が稼働かどうか（祝日グレー表示の入力）。`false` と `null` を潰さない | `grs-native-erd-ja.md:308`,`:1591` / `grs-mspdi-field-ledger-ja.md:556` / `mspdi_pj12.xsd:1463` |
| **（原典に列名が無い）新設 →** `recurrenceKind` | 整数（列挙 1–9） | 可 | — | — | Consume（原典の分類。§7 で疑義） | `…/Exception/Type`（`minOccurs=0`・列挙 1–9） | 欠落は判定上 `9` と同値（**ただし値としては欠落と `9` を区別して往復する**） | **⚠️ ERD の図（`:303`–`:309`）にも §7.4 の表（`:1589`–`:1591`）にも存在しない。§5.5b だけが「Consume（必須）」と定めている。**判定は §4-1。**新設名の理由**: 原典は MSPDI の `Type` としか書いていないが、GRS の命名規約は `type` のような汎用語を識別子に使うことを禁じている。`shapeKind` / `link_type` と同じ「種別」の付け方に合わせて `recurrenceKind` を提案する | `grs-native-erd-ja.md:645`,`:650`–`:665`,`:1814` / `grs-mspdi-field-ledger-ja.md:558`,`:639`,`:659` / `mspdi_pj12.xsd:1376`–`1393` |

### 4-1. 繰返し種別（`Exception/Type`）の列挙値 — **XSD で確かめた**

XSD の documentation（`mspdi_pj12.xsd:1378`）を原文どおり写し、GRS の扱いを併記する。

| 値 | XSD の定義（原文） | 訳 | GRS の扱い |
|:--:|---|---|---|
| （欠落） | — | 要素が無い | **`TimePeriod` を実日付の非稼働レンジとして採用（Own）** |
| 1 | Daily | 毎日 | 繰返しあり → **要素まるごと Carry ＋「繰返し祝日は未対応」の警告** |
| 2 | Yearly by day of the month | 毎年（日付指定） | 同上 |
| 3 | Yearly by position | 毎年（位置指定） | 同上 |
| 4 | Monthly by day of the month | 毎月（日付指定） | 同上 |
| 5 | Monthly by position | 毎月（位置指定） | 同上 |
| 6 | Weekly | 毎週 | 同上 |
| 7 | By day count | 日数指定 | 同上 |
| 8 | By weekday count | 曜日数指定 | 同上 |
| 9 | No exception type | 繰返しなし | **`TimePeriod` を実日付の非稼働レンジとして採用（Own）** |

- **`grs-mspdi-field-ledger-ja.md:659` の和訳（1=毎日 / 2=毎年(日付) / 3=毎年(位置) / 4=毎月(日付) / 5=毎月(位置) / 6=毎週 / 7=日数 / 8=曜日数 / 9=なし）は XSD と一致する**（突き合わせ済み・誤りなし）。
- **⚠️ これを落とすと何が起きるか**（原典が明示している事故）:
  `Type=2`（毎年・日付指定）, `From=2020-01-01`, `To=2030-12-31`, `Occurrences=11` と書かれた「元日」を、
  `Type` を読まずに `TimePeriod` だけ見ると **2020〜2030 の 11 年間まるごとが非稼働**になる
  （`grs-native-erd-ja.md:650`–`:658`）。
  XSD の `Occurrences` の説明も "The number of occurrences for which the calendar exception is valid" であって
  日数ではない（`mspdi_pj12.xsd:1363`）。
- **既知の割り切り**: 繰返し祝日（1–8）は MVP でグレー表示されない。展開器（`2`/`4`/`6` の 3 種）の実装は次期で再評価
  （`grs-native-erd-ja.md:665`）。
- **ネイティブ `Exception` 行が生まれるのは、種別が欠落または `9` のときだけである。**
  1–8 のときは行を作らず、要素まるごと Carry へ入る（`grs-native-erd-ja.md:663`）。

---

## 5. 表 4 — 原典に器が無く、新設が要る列

**⚠️ ここが原典の最大の穴である。** `grs-native-erd-ja.md:20` が「Carry / Drop は本 ERD に出さない」と決めたため、
Carry の器（`carry` / `carry_elements`）が **ERD のどのエンティティにも描かれていない**。
ところが `grs-native-erd-ja.md:697`–`:702` は「フィールド単位 Carry は**所有エンティティ**の `carry` に、
要素まるごと Carry は**親**の `carry_elements` に入れる」と定めている。
**`WeekDay` と `Exception` は両方の受け皿を要求されるのに、器が 1 つも無い。**
特に `WorkingTime`（0..5・両親に付く）は丸ごと Carry なのに、**親に入れる場所が無い**。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `Calendar.ordinal` | 整数 | 可 | — | — | GRS | （対応なし） | import 時 0 起点 | **新設が要る**。`grs-native-erd-ja.md:715` は「各コレクション内の**全要素**に同一番号空間で `ordinal` を振り、export は `ordinal` 順に出す」と定めるが、**`Calendar` の ERD には `ordinal` 列が無い**。無いと `Calendars` の原順序が復元できない（`Resource` / `Assignment` も同様の欠落だが本書の担当外） | `grs-native-erd-ja.md:280`–`:285`,`:713`–`:719` |
| `Calendar.carry` | 連想（文字列→文字列） | 可 | — | — | GRS（Carry の器） | （`Calendar` 直下に未解釈スカラーは無い） | `{}` | **新設が要る（空でも器は要る）**。`Calendar` の 4 スカラーは全て解釈済みなので現時点で中身は空だが、入口検査（再合成 ≠ 元要素なら退避）を通すには器が必要。未知要素（将来の MS 拡張）もここで捕まる | `grs-native-erd-ja.md:697`–`:702`,`:741`–`:750` |
| `Calendar.carryElements` | 配列 `[{ name, ordinal, fields, children }]` | 可 | — | — | GRS（Carry の器） | `WorkWeeks/WorkWeek` 一式／`DayType=0` の `WeekDay`／繰返し種別 1–8 の `Exception` | `[]` | **新設が要る**。ネイティブ行を作らない要素の退避先。**XML 文字列では持たず JSON の再帰構造で持つ**。`ordinal` の番号空間はコレクション単位なので、`name` と併せて初めて一意になる | `grs-native-erd-ja.md:700`–`:702`,`:713`–`:715`,`:643`,`:663` |
| `WeekDay.calendarUid`（親参照） | 整数 | 不可 | FK | `Calendar.uid` | GRS | （対応なし＝XML では入れ子で表す） | — | **原典に列が無い**。`grs-native-erd-ja.md:709` は「(親のキー, `ordinal`)」で識別するとだけ書き、親を指す列を定義していない。JSON を入れ子で持つなら不要だが、**関係モデルとして正規化するなら明示が要る**。次期が決める | `grs-native-erd-ja.md:298`–`:302`,`:359`,`:709` |
| `WeekDay.carry` | 連想（文字列→文字列） | 可 | — | — | GRS（Carry の器） | `WeekDay/TimePeriod/FromDate` / `ToDate` | `{}` | **新設が要る**。`DayType` が 1–7 の行でも `TimePeriod` は XSD 上つけられる（`minOccurs=0`・禁止されていない）ので、**ネイティブ行の側にフィールド単位 Carry が発生する**。原典は「入れ忘れで漏れた実例」として **`WeekDay.TimePeriod` そのもの**を挙げている | `grs-native-erd-ja.md:689`,`:697`–`:699`,`:1820` / `mspdi_pj12.xsd:1269` |
| `WeekDay.carryElements` | 配列 `[{ name, ordinal, fields, children }]` | 可 | — | — | GRS（Carry の器） | `WeekDay/WorkingTimes/WorkingTime`（0..5） | `[]` | **新設が要る**。`WorkingTime` は丸ごと Carry なのに**親に入れる場所が無い**。`ordinal` は `WorkingTimes` コレクション内で 0 起点 | `grs-native-erd-ja.md:700`–`:711` / `grs-mspdi-field-ledger-ja.md:557` / `mspdi_pj12.xsd:1288`–`1317` |
| `Exception.calendarUid`（親参照） | 整数 | 不可 | FK | `Calendar.uid` | GRS | （対応なし＝XML では入れ子で表す） | — | `WeekDay.calendarUid` と同じ。原典に列が無い | `grs-native-erd-ja.md:303`–`:309`,`:359`,`:709` |
| `Exception.carry` | 連想（文字列→文字列） | 可 | — | — | GRS（Carry の器） | `EnteredByOccurrences` / `Occurrences` / `Period` / `DaysOfWeek` / `MonthItem` / `MonthPosition` / `Month` / `MonthDay`（**8 個**） | `{}` | **新設が要る**。**種別が欠落／`9` でネイティブ行になった `Exception` にも、これら 8 個が付いていることがありうる**（XSD は全て `minOccurs=0` で、種別との整合を強制しない）。器が無いと**その 8 個が黙って消える** | `grs-native-erd-ja.md:646`,`:697`–`:699` / `grs-mspdi-field-ledger-ja.md:559` / `mspdi_pj12.xsd:1337`,`:1361`,`:1394`,`:1399`,`:1404`,`:1423`,`:1437`,`:1458` |
| `Exception.carryElements` | 配列 `[{ name, ordinal, fields, children }]` | 可 | — | — | GRS（Carry の器） | `Exception/WorkingTimes/WorkingTime`（0..5） | `[]` | **新設が要る**。`WeekDay.carryElements` と同じ理由 | `grs-native-erd-ja.md:700`–`:711` / `grs-mspdi-field-ledger-ja.md:557` / `mspdi_pj12.xsd:1468`–`1497` |

---

## 6. 表 5 — Carry で温存する MSPDI 要素（ネイティブ列にしない）

`列名` は**格納先の器のパス**で書く（表 4 で新設した器を前提とする）。
コンテナ（`WeekDays` / `Exceptions` / `WorkWeeks` / `WorkingTimes`）は wrapper なので配列に吸収し、行にしない
（`grs-mspdi-field-ledger-ja.md:372`–`373`）。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `WeekDay.carry.TimePeriod.FromDate` | 文字列（原文のまま） | 可 | — | — | Carry | `WeekDays/WeekDay/TimePeriod/FromDate`（`xsd:dateTime`・`minOccurs=0`） | — | 2003 形式の例外日レンジ。**解釈しない**。原形のまま書き戻す | `grs-native-erd-ja.md:643` / `grs-mspdi-field-ledger-ja.md:553` / `mspdi_pj12.xsd:1275` |
| `WeekDay.carry.TimePeriod.ToDate` | 文字列（原文のまま） | 可 | — | — | Carry | `WeekDays/WeekDay/TimePeriod/ToDate` | — | 同上 | `grs-native-erd-ja.md:643` / `mspdi_pj12.xsd:1280` |
| `WeekDay.carryElements[].fields.FromTime` | 文字列（原文のまま） | 可 | — | — | Carry | `WeekDays/WeekDay/WorkingTimes/WorkingTime/FromTime`（`xsd:time`・`minOccurs=0`） | — | 勤務時刻。**GRS は日粒度なので使わない**。`WorkingTime` は 0..5 の繰返しなのでフィールドではなく**要素**として持つ | `grs-mspdi-field-ledger-ja.md:557`,`:376` / `mspdi_pj12.xsd:1301` |
| `WeekDay.carryElements[].fields.ToTime` | 文字列（原文のまま） | 可 | — | — | Carry | `…/WorkingTime/ToTime` | — | 同上。XSD の散文は "One of these must be present" と言うが、**宣言は `minOccurs="0"` で強制していない** | `mspdi_pj12.xsd:1290`,`:1306` |
| `Calendar.carryElements[]`（`name="WeekDay"`） | 要素まるごと | — | — | — | Carry | `WeekDays/WeekDay` のうち `DayType=0` の行 | — | **`DayType=0`（2003 形式の例外日）はネイティブ化しない**。例外日は `Exception` 形式に一本化する。原順序のため `ordinal` を `WeekDays` の番号空間で保つ | `grs-native-erd-ja.md:99`,`:643`,`:1587` / `grs-mspdi-field-ledger-ja.md:639` |
| `Exception.carry.EnteredByOccurrences` | 真偽（原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/EnteredByOccurrences`（`xsd:boolean`・`minOccurs=0`） | — | 繰返し範囲を回数で入れたか（false=終了日で入れた）。繰返し詳細 8 個の 1 | `grs-mspdi-field-ledger-ja.md:559` / `mspdi_pj12.xsd:1337` |
| `Exception.carry.Occurrences` | 整数（原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/Occurrences`（`xsd:integer`・`minOccurs=0`） | — | XSD: "The number of occurrences for which the calendar exception is valid"。**日数ではない**（誤読すると年単位の非稼働になる） | `grs-native-erd-ja.md:654` / `mspdi_pj12.xsd:1361`,`:1363` |
| `Exception.carry.Period` | 整数（原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/Period` | — | 繰返しの周期 | `grs-mspdi-field-ledger-ja.md:559` / `mspdi_pj12.xsd:1394` |
| `Exception.carry.DaysOfWeek` | 整数（ビット和・原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/DaysOfWeek`（`xsd:integer`・`minOccurs=0` `maxOccurs=1`） | — | XSD: 1=Sunday, 2=Monday, 4=Tuesday, 8=Wednesday, 16=Thursday, 32=Friday, 64=Saturday。**2 の冪＝ビットマスクだが、XSD に列挙制約は無い**（組合せ値が入る）。`WeekDay.DayType` の 1–7 とは**別の番号体系**なので流用してはならない | `grs-mspdi-field-ledger-ja.md:559`,`:664` / `mspdi_pj12.xsd:1399`–`1403` |
| `Exception.carry.MonthItem` | 整数（列挙 0–9・原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/MonthItem` | — | XSD: 0=Day, 1=Weekday, 2=WeekendDay, 3=Sunday, 4=Monday, 5=Tuesday, 6=Wednesday, 7=Thursday, 8=Friday, 9=Saturday | `mspdi_pj12.xsd:1404`–`1422` |
| `Exception.carry.MonthPosition` | 整数（列挙 0–4・原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/MonthPosition` | — | XSD: 0=First, 1=Second, 2=Third, 3=Fourth, 4=Last | `mspdi_pj12.xsd:1423`–`1436` |
| `Exception.carry.Month` | 整数（列挙 0–11・原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/Month` | — | XSD: **0=January … 11=December**（1 起点ではない） | `mspdi_pj12.xsd:1437`–`1457` |
| `Exception.carry.MonthDay` | 整数（原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/MonthDay`（`xsd:integer`・制約ファセットなし） | — | 繰返しが当たる月内日 | `mspdi_pj12.xsd:1458` |
| `Exception.carryElements[].fields.FromTime` | 文字列（原文のまま） | 可 | — | — | Carry | `Exceptions/Exception/WorkingTimes/WorkingTime/FromTime` | — | 勤務時刻。0..5 の繰返しなので要素として持つ | `grs-mspdi-field-ledger-ja.md:557` / `mspdi_pj12.xsd:1481` |
| `Exception.carryElements[].fields.ToTime` | 文字列（原文のまま） | 可 | — | — | Carry | `…/WorkingTime/ToTime` | — | 同上 | `mspdi_pj12.xsd:1486` |
| `Calendar.carryElements[]`（`name="Exception"`） | 要素まるごと | — | — | — | Carry | 繰返し種別 1–8 の `Exceptions/Exception` | — | **繰返しがある例外日はネイティブ化せず丸ごと退避し、「繰返し祝日は未対応」の警告を出す** | `grs-native-erd-ja.md:663`,`:665` |
| `Calendar.carryElements[]`（`name="WorkWeek"`）`.fields.TimePeriod.FromDate` | 文字列（原文のまま） | 可 | — | — | Carry | `WorkWeeks/WorkWeek/TimePeriod/FromDate` | — | 期間限定の週稼働パターン。**GRS は解釈しない** | `grs-mspdi-field-ledger-ja.md:559`,`:394` / `mspdi_pj12.xsd:1526` |
| 同上 `.fields.TimePeriod.ToDate` | 文字列（原文のまま） | 可 | — | — | Carry | `WorkWeeks/WorkWeek/TimePeriod/ToDate` | — | 同上 | `mspdi_pj12.xsd:1531` |
| 同上 `.fields.Name` | 文字列（≤512・原文のまま） | 可 | — | — | Carry | `WorkWeeks/WorkWeek/Name` | — | 週パターン名 | `mspdi_pj12.xsd:1539` |
| 同上 `.children[].fields.DayType` | 整数（列挙 0–7・原文のまま） | 不可 | — | — | Carry | `WorkWeeks/WorkWeek/WeekDay/DayType`（**明示 `minOccurs="1"`**） | — | `Calendar/WeekDays/WeekDay/DayType` と**同名だが別要素**（親パスが違う）。表示別名 `WorkWeek_WeekDay` | `grs-mspdi-field-ledger-ja.md:616` / `mspdi_pj12.xsd:1559` |
| 同上 `.children[].fields.DayWorking` | 真偽（原文のまま） | 可 | — | — | Carry | `WorkWeeks/WorkWeek/WeekDay/DayWorking` | — | 同上 | `mspdi_pj12.xsd:1576` |
| `Calendar.carryElements[]`（`name="WorkWeek"`）本体 | 要素まるごと | — | — | — | Carry | `WorkWeeks/WorkWeek`（0..*） | — | `WorkWeeks` コンテナごと解釈しない。**XSD 自身が「`WorkWeeks` は正しく保存されない。妥当な XML にするには空タグ集合を `<WorkWeeks>` に置換せよ」と注記している**（MS の既知不具合）。往復実装で踏む | `grs-mspdi-field-ledger-ja.md:394` / `mspdi_pj12.xsd:1504`–`1507`,`:1549`–`1551` |

---

## 7. 命名の突き合わせ（`docs/spec/_assets/tbl-glossary.md`）

**用語辞書に暦の語は 1 つも載っていない。** 表 T-101（データの語）は `Task` / `TaskGroup` / `TaskGroupMember` /
`stackOrder` / `Item` の 5 語のみ（`tbl-glossary.md:25`–`29`）、表 T-102（プロパティ）は 22 行あるが
暦に関する語は 0 行である（`tbl-glossary.md:39`–`60`。自分で数えた）。

| 原典の名前 | 規約違反 | 提案する確定名 | 用語辞書 | 出典 |
|---|---|---|---|---|
| `Calendar.id` | — （ただし他エンティティは `uid`） | `Calendar.uid` | **未登載** | `grs-native-erd-ja.md:281`,`:355` |
| `Calendar.is_base` | **snake_case**（許可 3 語に含まれない） | `Calendar.isBaseCalendar` | **未登載** | `grs-native-erd-ja.md:283` |
| `Calendar.base_calendar_id` | **snake_case** | `Calendar.baseCalendarUid` | **未登載** | `grs-native-erd-ja.md:284` |
| `WeekDay.day_type` | **snake_case** | `WeekDay.dayType` | **未登載** | `grs-native-erd-ja.md:300` |
| `WeekDay.day_working` | **snake_case** | `WeekDay.dayWorking` | **未登載** | `grs-native-erd-ja.md:301` |
| `Exception.from_date` / `to_date` | **snake_case** | `Exception.fromDate` / `toDate` | **未登載** | `grs-native-erd-ja.md:306`–`307` |
| `Exception.day_working` | **snake_case** | `Exception.dayWorking` | **未登載** | `grs-native-erd-ja.md:308` |
| （繰返し種別・原典に GRS 名が無い） | MSPDI 名 `Type` をそのまま使うと**汎用語禁止に触れる** | `Exception.recurrenceKind` | **未登載** | `grs-native-erd-ja.md:645` |
| エンティティ名 `Exception` | 規約違反ではない。ただし**多くの言語で例外機構の語と衝突**し、コード上 `catch (Exception)` と読み違えられる | `CalendarException` を検討（判断は次期） | **未登載** | `grs-native-erd-ja.md:303`,`:1487` |
| `ordinal`（`WeekDay` / `Exception`） | 違反なし（lowerCamelCase・1 語） | そのまま | **未登載** | `grs-native-erd-ja.md:299`,`:304` |
| `Calendar.name` / `Exception.name` | 違反なし | そのまま。用語辞書 `P-1 name = 名称` と整合 | `P-1`（`Task` の文脈だが同名） | `tbl-glossary.md:39` |

> **食い違いの記録**: 用語辞書は「本書が用語の正である。本書と食い違う名前を他所で見たら、本書が勝つ」と宣言している
> （`tbl-glossary.md:6`）。**暦クラスタの語が 1 つも載っていない以上、上の提案名は用語辞書に追記されるまで確定ではない。**

---

## 未解決

原典どうしが矛盾している点・原典だけでは決められない点・要改名を全数で挙げる。

### A. 原典の図が落としている（＝この調査で掘り出した）

| # | 何が問題か | 出典 | 影響 |
|---|---|---|---|
| A-1 | **繰返し種別（`Exception/Type`）が ERD の図（`:303`–`:309`）にも §7.4 の表（`:1589`–`:1591`）にも無い。** §5.5b（`:645`）と台帳（`:558`,`:639`）だけが「Consume・必須」と定めている | `grs-native-erd-ja.md:303`–`309`,`:645`,`:1589`–`1591` / `grs-mspdi-field-ledger-ja.md:558` | **落とすと毎年 1 日の祝日が何年ぶんも非稼働に化ける。** ERD の図だけを見て実装すると必ず踏む |
| A-2 | **`WeekDay` / `Exception` に `carry` / `carryElements` の器が無い。** `WorkingTime`（0..5）が丸ごと Carry なのに親に入れる場所が無く、`Exception` の繰返し詳細 8 個にもフィールド単位 Carry の器が無い | `grs-native-erd-ja.md:20`,`:697`–`:702` | **`WorkingTime` と繰返し詳細 8 個が黙って消える。** 原典自身が「バッグ案は入れ忘れで漏れる（実際 `WeekDay.TimePeriod` で発生）」と認めている（`:689`,`:1820`） |
| A-3 | **`Calendar` に `ordinal` が無い。** §5.5d-3 は「各コレクション内の全要素に同一番号空間で `ordinal` を振り、export は `ordinal` 順」と定めるのに、`Calendar` の列に無い | `grs-native-erd-ja.md:280`–`285`,`:713`–`:719` | `Calendars` の原順序が復元できず、未編集往復の差分ゼロが崩れる |
| A-4 | **弱エンティティの親を指す列が定義されていない。** 「(親のキー, `ordinal`)」で識別するとしか書かれていない | `grs-native-erd-ja.md:359`,`:709` | JSON を入れ子で持つなら不要。関係モデルなら必要。**次期が形を決めるまで実装できない** |

### B. 原典どうしの矛盾・分類の疑義

| # | 矛盾 | 出典 | どちらが正か |
|---|---|---|---|
| B-1 | **繰返し種別の分類が `Consume` になっているが、§4 の Consume の定義（「GRS では別構造で持ち、export では構造から再生成する」）に当てはまらない。** 値はそのまま保持してそのまま書き戻すので、形は `Own` に近い | `grs-mspdi-field-ledger-ja.md:89`,`:558` / `grs-native-erd-ja.md:645` | **決められない。** ゲートとして読む（＝理解する）が別構造にはしない。分類語の定義を次期が精緻化するか、`Own` へ移すか |
| B-2 | **出口検査の「`Calendars/Calendar` が出力されているか」は条件付きである。** `Calendars` 自体は `minOccurs=0` なので、暦が 1 つも無い文書も XSD 妥当 | `grs-native-erd-ja.md:758` / `mspdi_pj12.xsd:1198`,`:1204` | **XSD が正。** 検査は「`Calendars` を出すなら `Calendar` を 1 個以上」に直すべき |
| B-3 | **`WeekDay.dayType` が `null` のとき export で焼く既定値が決まっていない。** §5.5d-4 は「XSD 必須要素は `null` でも必ず書く（既定値を焼く）」と言い `WeekDay/DayType` を名指ししているのに、`SaveVersion=12` / `CurrencyCode="JPY"` のような具体値が無い | `grs-native-erd-ja.md:726`,`:758`,`:1636`–`1637` | **未定。** 次期が決める。**推測で 1（日曜）などを書いてはならない** |
| B-4 | **`Exception.fromDate` / `toDate` の型が食い違う。** ERD は `date`、XSD は `xsd:dateTime`。`Task.start` には JSON 例（`"2026-07-01T09:00:00"`）があるが、暦の日付には変換規則が無い | `grs-native-erd-ja.md:306`–`307`,`:733` / `mspdi_pj12.xsd:1348`,`:1353` | **未検証。** 時刻成分を切り捨てると往復差分が出る。`§7.1a` が期間について定めた「境界で変換し、端数は原文字列を carry」と同型の規則が要る |
| B-5 | **`WorkingTimes` の XSD 散文と宣言が食い違う。** 散文は "One of these must be present, and there can be no more than five" だが、宣言は `WorkingTime minOccurs="0" maxOccurs="5"`（`xsd:choice` の中） | `mspdi_pj12.xsd:1290`,`:1295`,`:1470`,`:1475` | **宣言が正**（スキーマとして空を許す）。散文を根拠に「必ず 1 個ある」と実装してはならない |
| B-6 | **XSD 自身が `WorkWeeks` / `WorkWeek/WeekDay` の出力不具合を注記している**（空タグ集合を置換せよ／閉じタグを手で入れよ） | `mspdi_pj12.xsd:1504`–`1507`,`:1549`–`1551` | **XSD の注記が事実。** Carry で原形を書き戻すとき、壊れた入力をそのまま返すのか正した形で返すのかが未定 |

### C. 原典に書かれていない（＝設計で決めるしかない）

| # | 決められないこと | 出典 | 補足 |
|---|---|---|---|
| C-1 | **派生暦の継承の解決規則。** `baseCalendarUid` で親を指すが、「`WeekDays` を持たない派生暦の稼働曜日をどう決めるか」が原典のどこにも無い | `grs-native-erd-ja.md:284`,`:1586` / `mspdi_pj12.xsd:1232` | **未検証。** MS Project の実挙動は XSD からは分からない |
| C-2 | **どの暦で稼働日を数えるか。** 予実の正は `actualDuration` を「稼働日数」と定め、`実績バーの右端 = actualStart + actualDuration`（稼働日で加算）と書くが、**どの `Calendar` を使うかを書いていない**。ERD は「既定暦で描画し個別暦は現状未使用」と言う | `plan-actual-decisions-ja.md:55`,`:67`,`:128` / `grs-native-erd-ja.md:1019` | **既定暦（`Project.calendar_id`）と読むのが自然だが、原典は明言していない＝未検証。** `Task.calendar_id` を持ちながら使わない状態が残る |
| C-3 | **`Calendar` を削除したときの連鎖が定義されていない。** §5.5c の cascade 表は `Task` / `TaskGroup` / `Resource` の 3 行だけで、`Calendar` の行が無い | `grs-native-erd-ja.md:671`–`675` | 暦を消すと `Project.calendar_id` / `Task.calendar_id` / `Resource.calendar_id` / `Calendar.baseCalendarUid` が宙に浮く。**「ネイティブの参照は文書内で解決できること」という不変条件（`:1561` は `Dependency`/`Assignment` にしか掛かっていない）を暦にも広げるか、次期が決める** |
| C-4 | **`Calendar` の内容一致判定（自動統合）の厳密な定義が無い。** 「名前＋稼働曜日＋祝日が同じなら自動統合」としか書かれておらず、**`ordinal` の違い・`carry` の違い・繰返し例外の違いを一致とみなすか**が未定 | `grs-native-erd-ja.md:497` | 一致とみなすと取込側の Carry が落ちる（`:508`–`:510` の明示許容 Drop に該当）。**判定が緩いと Drop が増える** |
| C-5 | **`Exception.name` / `Calendar.name` をどこに表示するか。** 責務欄は「祝日ラベル」「表示」としか書かれていない | `grs-native-erd-ja.md:1584`,`:1589` / `grs-mspdi-field-ledger-ja.md:548`,`:554` | **未検証。** 描画仕様は本書の担当外の文書にある可能性がある |
| C-6 | **`Calendar.isBaseCalendar` を読む処理が原典に 1 つも無い。** 「基準暦か」の記述だけがある | `grs-native-erd-ja.md:1585` / `grs-mspdi-field-ledger-ja.md:549` | 往復のためだけに持つ列（実質 Carry 相当）か、継承解決（C-1）で使う列か、**次期が決める** |
| C-7 | **繰返し祝日（種別 1–8）の警告の文面・出し方が未定。** 「未対応の警告を出す」とだけある | `grs-native-erd-ja.md:663`,`:665` | 展開器（種別 `2`/`4`/`6` の 3 種）の実装は次期で再評価 |

### D. 要改名（全数）

`is_base` / `base_calendar_id` / `day_type`（`WeekDay`）/ `day_working`（`WeekDay` と `Exception` の 2 箇所）/
`from_date` / `to_date` の **7 列が snake_case で規約違反**である（許可されるのは
`wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけ）。
加えて `Calendar.id` は他エンティティの `uid` と不揃い、繰返し種別は MSPDI 名 `Type` をそのまま使うと汎用語禁止に触れる。
**提案名は §7 の表にある。用語辞書（`tbl-glossary.md`）には暦の語が 1 つも無いので、追記されるまで確定ではない。**
