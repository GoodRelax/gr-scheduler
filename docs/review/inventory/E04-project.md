# E04 — Project (root meta)

担当エンティティ: **`Project`**（文書に 1 個だけ存在する根のメタ情報の器）。

## 読んだ原典

| # | ファイル | 行数 | 読んだ範囲 |
|---|---|--:|---|
| 1 | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | **全文**（§5.2 ERD・§5.3 識別・§5.4C 消えた候補・§5.6 監査・§7.3 Project・§8A/§8B/§8D を精読） |
| 2 | `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | **全文**（§6.2(a) 63 スカラー・§7.3 Project・§8B Drop=0 検証を精読） |
| 3 | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | `Project` 直下スカラー宣言 **全 63 個を逐一（1〜780 行）**。加えて全 3906 行に対し「最後に書いた者」候補要素の機械検索を実施（下記 §3） |
| 4 | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | 予実領域の正。§1〜§2-6・§4（イナズマ線）・§9〜§14 を精読。**§11 の差分表に `Project` の行は 1 つも無い** |
| 5 | `docs/spec/_assets/tbl-glossary.md` | 259 | **全文**（名前の正との突合） |
| 6 | `docs/spec/01-04-requirements.md` | 3500+ | `FR-046` / `FR-063` / `FR-028` / `FR-064`(T-035) / `FR-024` / `FR-073` / `FR-074` / `FR-035` / `FR-056`(T-032) / T-029 `CU-1` を参照読み |
| 7 | `docs/spec/_assets/tbl-settings.md` | 332 | `S-52` / `S-71` / `S-99d` と表 T-202/T-203/T-206 を参照読み |
| 8 | `previous-project-result/02-data-model/data-model-entry-ja.md` | — | JSON 実例の `project` オブジェクト（100〜111 行）のみ |
| 9 | `previous-project-result/02-data-model/grs-document-settings-ja.md` | — | `importSeq` の行（253 / 268 行）のみ |

**数え直した結果（自分で数えた）**: `Project` 直下スカラーは XSD 実測で **63 個**（`SaveVersion`(232 行) 〜 `AdminProject`(724 行)、次は容器要素 `OutlineCodes`(730 行)）。**うち `minOccurs` 属性を持たない＝必須は 2 個だけ**（`SaveVersion` 232 行 / `CurrencyCode` 390 行）。仕分けは **Own 17 / Consume 1 / Reconstruct 3 / Carry 42 = 63**（内訳を自分で列挙して検算した。⚠️ 台帳 §8B の検算行はこれと食い違う → §5「未解決」U-1）。

---

## 1. `Project` の全列

⚠️ **`null` の意味**: MSPDI 由来の列は全て nullable で、**`null` ＝ 元ファイルにその要素が無かった**（`0` や `false` とは異なる）。GRS の JSON は **キーを省略せず `null` を明示**し、MSPDI へ書き出すときだけ要素を省く（ERD:721-739）。したがって既定値欄の `null` は「値が無いという意図が保存されている」状態を指す。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|:--:|---|---|---|---|---|---|
| `id` | 文字列（≤16） | 可 | — ⚠️ | — | Own | `Project/UID` | `null` | **主キーにしてはならない。** XSD 実測で `xsd:string` `maxLength=16` `minOccurs="0"`＝**省略可**で、GUID でもない。省略された文書が現実にあるので識別子として成立しない。⚠️ ERD §5.3 の表は `PK` と書いており矛盾（→ U-2）。省略時は GRS が取込セッション ID を発番して出自に充てる（**外部 UID ではないので export しない**）。**要改名**: 他エンティティは `uid`、ここだけ `id`。整数でもないので `uid` への統一も適切でない | ERD:240,354,1567 / XSD:238,243-246 / LEDGER:516 |
| `name` | 文字列（≤255） | 可 | — | — | Own | `Project/Name` | `null` | ヘッダ表示・透かしに使う文書メタ。`Title` とは別の要素である | ERD:243,1568 / XSD:248,254 / LEDGER:516 |
| `title` | 文字列（≤512） | 可 | — | — | Own | `Project/Title` | `null` | **文書名。** 用語の正は `Schedule Title`（`U-27`）で「**MSPDI の `Project/Title` に対応する**」と明記。⚠️ **「表題」「題名」と呼んではならない（MUST NOT）。** 編集の入口は `FR-035` 1 つに限る（`FR-074` は文書名を対象に含めてはならない） | ERD:244,1568 / XSD:258,264 / GLOSS:97 / REQ:1633,3001 |
| `subject` | 文字列（≤512） | 可 | — | — | Own | `Project/Subject` | `null` | 文書メタ。ERD §5.2 では `meta_own` に畳まれているが §7.3 で個別に Own と確定 | ERD:251,1568 / XSD:268 / LEDGER:516 |
| `category` | 文字列（≤512） | 可 | — | — | Own | `Project/Category` | `null` | 同上 | ERD:251,1568 / XSD:278 / LEDGER:516 |
| `company` | 文字列（≤512） | 可 | — | — | Own | `Project/Company` | `null` | 同上。`FR-074` が画面で確認・編集させる項目に「会社」を挙げている | ERD:251,1568 / XSD:288 / REQ:3001 |
| `manager` | 文字列（≤512） | 可 | — | — | Own | `Project/Manager` | `null` | 同上 | ERD:251,1568 / XSD:298 / LEDGER:516 |
| `author` | 文字列（≤512） | 可 | — | — | Own | `Project/Author` | `null` | **作成者であって「最後に書いた者」ではない。** XSD の定義文は "The author of the project."。`FR-074` の「作成者」はこの列を指す。⚠️ **`FR-063` の受け皿として使ってはならない**（→ §3） | ERD:251,1568 / XSD:308,310 / REQ:3001,3111 |
| `created` | 日時 | 可 | — | — | Own | `Project/CreationDate` | `null` | 来歴。**要改名の検討**: GRS 名 `created` と MSPDI 名 `CreationDate` がずれている。ERD §5.2 は `CreationDate` と書き §7.3 は `created` と書いており、原典内で不一致（→ U-3） | ERD:251,1569 / XSD:318 |
| `revision` | 整数 | 可 | — | — | Own | `Project/Revision` | `null` | **版数。** XSD の定義文は "**The number of times a project has been saved**"（保存回数）。⚠️ `FR-063` が要求する版数は「**文書に保存される値を変える更新すべて**で 1 増える整数」であり、**意味が同じではない**（→ §3・U-4）。`FR-074` は「改訂番号」として画面編集の対象に挙げる | ERD:245,1569 / XSD:323,325 / REQ:3001,3111 |
| `last_saved` | 日時 | 可 | — | — | Own | `Project/LastSaved` | `null` | 来歴。XSD 定義文 "The date that the project was last saved."。**`FR-063` の「時刻」に流用できる可能性はあるが、原典に「流用する」という決定は無い（未検証）**。**要改名**（snake_case は許される 3 語に含まれない）→ `lastSaved` | ERD:251,1569 / XSD:328,330 |
| `start_date` | 日付 | 可 | — | — | Own | `Project/StartDate` | `null` | 全体開始。XSD 定義文は "Required if ScheduleFromStart is true." だが **XSD 上は `minOccurs="0"`**（文言上の必須であって機械的必須ではない）。`FR-074` の「全体の開始日」。**要改名** → `startDate` | ERD:246,1570 / XSD:338,340 / REQ:3001 |
| `status_date` | 日付 | **可** | — | — | Own | `Project/StatusDate` | `null` | **基準日。`Status Line`（基準日線）はこの位置に 1 本引き、`null` なら描かない。** 表示状態を別に持ってはならない（MUST NOT）。出す操作＝その時点の本日を書く／消す操作＝`null` にする／ドラッグ＝追随。**設定値ではなく文書のデータである。** 遅れ判定（`(!)`）とイナズマ線の頂点計算の基準もこれ。**snake_case が許される 3 語の 1 つ。改名不要** | ERD:247,1570 / XSD:662,664 / REQ:1945,2468 / GLOSS:80,244 / PA:412-414,720-728 |
| `minutes_per_day` | 整数 | 可 | — | — | Own | `Project/MinutesPerDay` | `null` | **期間の型変換に必須。** MSPDI の `ActualDuration` 等は `xsd:duration`（時間）なので、`時間 ÷ minutes_per_day = 稼働日数` で GRS の整数へ、逆向きも同じ値で戻す。**既定を仮定してはならない**（取込元の値をそのまま使う）。この変換を省くと `Drop=0` が静かに壊れる。**要改名** → `minutesPerDay` | ERD:248,1571,1529-1533 / XSD:429 |
| `minutes_per_week` | 整数 | 可 | — | — | Own | `Project/MinutesPerWeek` | `null` | 期間換算。ERD §5.2 では `meta_own` に畳込。**要改名** → `minutesPerWeek` | ERD:251,1571 / XSD:434 / LEDGER:522 |
| `days_per_month` | 整数 | 可 | — | — | Own | `Project/DaysPerMonth` | `null` | 期間換算。同上。**要改名** → `daysPerMonth` | ERD:251,1571 / XSD:439 / LEDGER:522 |
| `week_start_day` | 整数（0〜6） | 可 | — | — | Own | `Project/WeekStartDay` | `null` | 週開始曜日。XSD は列挙 `0=Sunday`〜`6=Saturday`。**要改名** → `weekStartDay` | ERD:249,1571 / XSD:593,595 |
| `calendar_id` | 整数 | 可 | FK | `Calendar.id`（= `Calendar/UID`） | **Consume** | `Project/CalendarUID` | `null` | 既定カレンダー参照。**Carry に UID 参照を 1 つも残さない**という不変条件のため構造化する（MSPDI の UID 参照 7 つのうちの 1 つ）。**要改名** → `calendarId` | ERD:250,1572,529-537 / XSD:414,416 / LEDGER:524 |
| `schema_version` | 文字列 | 否（未検証） | — | — | **GRS** | （対応なし） | **未検証**（原典に既定値の記載が無い。JSON 実例の値は `"grs-1"`） | GRS スキーマの版。**新旧 JSON の判別と移行に必須**（無いと localStorage の既存データを読めない）。`FR-024`（JSON に文書の形式の版を載せること・MUST）／`FR-073`（読み込み時に判別すること）の受け皿。⚠️ **`FR-063` の版数（更新回数）とは別物である**と `FR-024` が明記。⚠️ **置き場所が原典間で食い違う**（ERD＝`Project` の列／JSON 実例＝**JSON の最上位**）→ U-5。**要改名** → `schemaVersion` | ERD:241,1573 / ENTRY:100 / REQ:2795,2984 |
| `uid_high_water_mark` | 整数 | 否（未検証） | — | — | **GRS** | （対応なし） | **未検証**（JSON 実例は `4`。新規文書の初期値の記載が原典に無い） | **削除済みを含む最大 UID。** 新規タスクの採番は常に `+1`（`max(uid)+1` は UID 再利用を起こすので使わない）。ロード時に `max(HWM, 実在 UID の最大)` へ引き上げる。**Undo で巻き戻さない**（巻き戻すと Undo 後に作った Task の UID が Redo で戻る UID と衝突する）。⚠️ **正しさの前提ではなく実装上の配慮**である。UID 再利用は §5.4 の照合規則（GRS 生まれは照合対象にしない）が本質的に防ぐ。**要改名** → `uidHighWaterMark` | ERD:242,1574,372-374,506 / ENTRY:109 |
| `carry` | オブジェクト `{ 要素名: 文字列 }` | 否（空可） | — | — | **Carry** | `Project` 直下の **Carry 42 要素**（通貨3 / 既定タスク・レート・書式9 / 計算オプション10 / Move系4 / EV2 / 会計3 / 既定時刻3 / MS 内部2 ＋ `ScheduleFromStart` / `CurrentDate` ＋ サーバ管理4） | `{}`（未検証） | GRS が意味を使わない要素を**解釈せず JSON の構造として保持**し、export で原順序どおり書き戻す。**XML 文字列としては保存しない。** 入口（import）で「ネイティブ列＋carry の再合成 ＝ 元要素」を検査し、不一致なら要素まるごと退避する。JSON 実例では `carry: { "CurrencyCode": "JPY", "SaveVersion": "12" }` | ERD:679-784,1703 / LEDGER:527-539 / ENTRY:110 |
| `carry_elements` | 配列 `[{ name, ordinal, fields, children }]` | 否（空可） | — | — | **Carry** | ネイティブ行を作らない子要素（`OutlineCodes` / `WBSMasks` / `ExtendedAttributes`(GRS 枠以外) ほか） | `[]`（未検証） | 「要素まるごと Carry」の置き場。所有エンティティの下にぶら下げて保持し、**グローバル索引を持たない**（2 文書の Carry を併合したとき番号が衝突するため）。**要改名** → `carryElements` | ERD:695-720,1705 |
| `finish_date` | 日付 | — | — | — | **Reconstruct** | `Project/FinishDate` | — （保存しない） | **保存しない。** export 時に**全 Task 最遅のロールアップ**で算出して焼き込む。正規 JSON に持たない（ドリフト防止）。**要改名** → `finishDate` | ERD:1576,1634 / XSD:343 / LEDGER:525 |
| （`SaveVersion`） | 整数 | — | — | — | **Reconstruct** | `Project/SaveVersion` | **固定値 `12`**（Carry があれば優先） | **保存しない。** XSD で **`minOccurs` 属性を持たない＝必須**。MSPDI import を経ていない GRS 生まれの文書は Carry を持たないので、焼き込まないと **XSD 非妥当な XML** を出力する。出口の検査項目 | ERD:1636,1639,757 / XSD:232,234 / LEDGER:517 |
| （`CurrencyCode`） | 文字列（≤3） | — | — | — | **Reconstruct** | `Project/CurrencyCode` | **`"JPY"`**（Carry があれば優先） | **保存しない。** XSD で必須（`minOccurs` 属性なし）。⚠️ **XSD の documentation は "Valid values are: USD." と書いているが型制約は `maxLength=3` の文字列だけ**で、`JPY` を禁じるファセットは無い。台帳は 2026-08-04 に本要素を Carry から残側へ移した（出さないと非妥当なため） | ERD:1637,1639 / XSD:390,392,396 / LEDGER:518,528 |

### 1-1. `Project` の列ではないが、隣接して誤解されやすいもの

| 名前 | どこにあるか | 由来 | 出典 | note |
|---|---|---|---|---|
| `importSeq`（ERD の表記は `import_seq`） | **`documentSettings`（文書設定）側。`Project` の列ではない** | GRS | ERD:1130,476-481 / DOCSET:253,268 / SET:134 / GLOSS:218 / REQ:2674 | 取込のたびに +1 する文書内連番。**非 export。** 既定 `0`（＝取込を 1 度もしていない）。用途は `TaskOrigin.last_seen_import_seq` と突き合わせて「そのマスタの最新取込番号 ＝ `max(last_seen_import_seq WHERE source_project_uid = X)`」を求め、**「消えた候補」＝ `last_seen_import_seq < 最新取込番号`** を**導出**すること（フラグを立てないので消し忘れバグが構造的に起きない）。⚠️ **表記が原典間で割れている** → U-6 |
| `documentSettings` | JSON の最上位（`project` の兄弟） | GRS | ERD:344,1126-1133 / ENTRY:113 | 文書全体の設定（`stackDirection` / `zoomX` / `zoomY` ほか）。ERD は「単一オブジェクトなので ERD では省略」と明記。**`Project` に畳み込まれていない** |
| `ScheduleFromStart` | `Project.carry` の中 | **Carry**（Own から降格） | ERD:1016,1577 / XSD:333 / LEDGER:520 | **GRS はスケジューラを持たず前方/後方計算をしない＝意味を使わない。** §5.6 の無駄監査で Own → Carry へ降格 |
| `CurrentDate` | `Project.carry` の中 | **Carry**（Own から降格） | ERD:1017,1577 / XSD:667,669 / LEDGER:521 / REQ:1951 | XSD 定義文は "The system date that the XML was generated."。**保存すると保存時点で凍結する**ので降格した。仕様側も「**MSPDI も `Project/StatusDate` だけを持ち、`Project/CurrentDate` は使わない**」と明記 |
| サーバ管理 4（`MicrosoftProjectServerURL` / `ProjectExternallyEdited` / `ActualsInSync` / `AdminProject`） | `Project.carry` の中 | **Carry**（Own(暫定) から降格） | ERD:1018,1577 / XSD:672,704,714,724 / LEDGER:523 | MVP にサーバ連携が無く GRS は解釈しない。将来必要になった時に格上げ。⚠️ **XSD 実測**: `MicrosoftProjectServerURL` は名前に反して **`type="xsd:boolean"`**（"Whether the project was created by a Project Server user as opposed to an NT user."）。URL 文字列ではない |

---

## 2. `Project.UID` を主キーにしてはならない（識別の決定・ERD §5.3）

原典から写した理由は次の 3 点である。

| # | 理由 | 出典 |
|---|---|---|
| 1 | **XSD 上 `minOccurs="0"`＝省略可**である。`Project/UID` を書かない MSPDI が現実に来る。ERD はこれを「③ **出自不明**」という第 3 の状態として明示的に扱い、その場合 `TaskOrigin.source_project_uid` を `null` にして `import_session_id`（GRS が発番する取込セッション ID）を代替に立て、**既定を「別 UID」（安全側）にフォールバック**する | XSD:238 / ERD:380 |
| 2 | **`xsd:string` `maxLength=16` であって GUID ではない。** 値の一意性を保証する仕組みが MSPDI 側に無い | XSD:243-246 / ERD:1567 |
| 3 | GRS の大原則「**UID の値から意味を読み取らない**（文書内で一意な不透明な整数として扱う）」は **`Task` / `Calendar` / `Resource` / `Assignment` の整数 UID 空間**についての規則である。`Project.UID` はそもそも整数ではなく、この空間に属さない | ERD:364-372,1704 |

**帰結**: `Project` は文書に 1 個しか無い器なので、そもそも行を識別する鍵を要しない。`Project.UID` が担うのは**識別ではなくマージの出自判定**（`FR-056` 表 T-032 の `MG-1`「同じ外部 WBS マスタの再取込か、別のマスタかを判別する」）だけである。`Project.UID` が一致＝同一マスタの再取込→既定「上書き」、不一致＝別マスタ→既定「別 UID」。別マスタ×上書きは警告を出す。判別できないときは人に問い、既定の選択肢は安全側（別のものとして取り込む）に合わせる。

⚠️ **ERD §5.3 の表そのものは `Project` の PK を `id`（= `Project.UID`）と書いており、上の決定と矛盾している**（ERD:354）。→ §5「未解決」U-2。

**基本情報の衝突時の選択肢**（タスクとは別に問う・3 択）: 1. 上書き（取込側の Project メタで置換）／ 2. 既存を保持（既存メタを維持し、タスクのみ取込）／ 3. キャンセル（読込を中止）。⚠️ **「既存を保持」を選ぶと取込側の Carry（通貨・計算オプション・単価表・勤務時刻等）は破棄される** — これが **明示的に許容される唯一の Drop** である（ERD:431-437,508-510,1711-1713 / REQ:2664）。

---

## 3. ⚠️ `FR-063`「最後に書いた者と時刻」に受け皿が無い（XSD を実際に検索して確認した）

**要求の原文**（REQ:3111）— 「文書が更新されたとき、システムは、**1 ずつ増える整数**と、**最後に書いた者と時刻**を文書に持たせ、書き出す JSON にも載せること。」

### 3-1. XSD の検索結果（推測ではない）

全 3906 行に対して次の 2 系統の機械検索を行った。

```
検索1  LastAuthor|LastModified|ModifiedBy|SavedBy|LastPrinted|LastSaved|Editor|LastUpdate|UpdatedBy|Author
       → ヒットは 3 行のみ： 308（Author 要素）/ 310（その documentation）/ 328（LastSaved 要素）

検索2  xsd:element name="...(User|Owner|Account|Creator|Login)..."
       → 1043 UserDef（ExtendedAttribute 定義）/ 2554 NTAccount（Resource 下）
         3035・3560 AssnOwner / 3040・3565 AssnOwnerGuid（Resource 下・Assignment 下）
       → Project 直下は 0 件
```

### 3-2. 判定

| `FR-063` が要る値 | MSPDI に対応要素があるか | 判定 |
|---|---|---|
| 1 ずつ増える整数（版数） | `Project/Revision`（XSD:323）が**近いが意味が違う** — 定義文は "The number of times a project has been **saved**"。`FR-063` は「**文書に保存される値を変える更新すべて**」で +1 と定める | **意味が一致しない**（→ U-4） |
| **最後に書いた者** | **存在しない。** `Project/Author`(308) は "The author of the project."＝**作成者**であって最後に書いた者ではない。`Manager`(298) は管理者、`Company`(288) は所有会社。`NTAccount` / `AssnOwner` は `Resource` / `Assignment` 下であり文書のメタではない | **受け皿なし（確認済み）** |
| 時刻 | `Project/LastSaved`(328) "The date that the project was last saved." が**形としては合う**が、**「これを `FR-063` の時刻に充てる」という決定は原典のどこにも無い** | **未検証** |

### 3-3. GRS 側にも受け皿が無い

- ERD §7.3 の `Project` 列一覧（ERD:1565-1577）に、最後に書いた者を保持する列は**無い**。
- `docs/spec/_assets/tbl-glossary.md`（名前の正・全 259 行）に、それらしい確定名は**1 語も無い**。
- `docs/spec/_assets/tbl-settings.md`（値の正）にも行が**無い**。`FR-063` 自身が「保存される値の全数は `tbl-settings.md` の各表のうち ⛔ と 🅿 が付いていない行である」と定めているのに、**版数・最後に書いた者・時刻はその表のどこにも無い**。

→ **`FR-063` は現状どこにも着地していない。** 新設が要る（→ U-4・U-7）。

### 3-4. 版数（`revision`）を持つべきか — 3 つの「版」を混同しないこと

原典を読むと **別物の「版」が 3 つ**あり、`FR-024` と `FR-073` が明示的に「混同してはならない」と警告している。

| # | 何の版か | 要求 | 値の性質 | どこに置くか（原典の記述） |
|---|---|---|---|---|
| A | **文書の更新回数** | `FR-063` | 1 ずつ増える整数。**文書に保存される値を変える更新すべて**で上がる（ズーム・スクロール・パン・パネル幅・表 T-202 の表示切り替えも含む。上がらないのは選択・構えの変更・フォーカス移動と表 T-206 の値だけ） | **未定**。`Project.revision` が MSPDI 由来で存在するが意味がずれる |
| B | **文書の形式の版** | `FR-024` / `FR-073` | 読めるかどうかの判定に使う | ERD は `Project.schema_version`、JSON 実例は**最上位の `schemaVersion`**（→ U-5） |
| C | **`Agent API` の版** | `FR-028` / T-035 `AG-1` | **非互換な変更で上げる**。呼び出す側は最初にこれを読む | 文書ではなく API 側。`Project` の列ではない |

**`Agent API` が上げるのは A ではなく C である。** `FR-028` の RATIONALE と `AG-1` は「版数を持ち、**非互換な変更で上げること**」と書いており、これは API 契約の版である。一方 `AG-2`（書き込む側がどの版を読んで書いているか申告し、食い違えば拒否）と `AG-11`（確定した発話は版数を上げる。`FR-063` を名指し）と `AG-9a`（拒否の値に現在の版数を含める）が使うのは **A の文書版数**である。

**結論（判断材料の提示。決定は次段の設計）**: **A の受け皿は必要**である（`AG-2` の楽観的排他制御が成立しないため）。ただし **`Project.revision` に相乗りさせてはならない可能性が高い** — `Revision` は Own（＝取り込んだ値をそのまま書き戻す列）であり、GRS が編集のたびに加算すると MSPDI の "number of times saved" とは違う数を相手ツールへ返すことになる。⚠️ **どちらにするかを決めた記述は原典に無い（未検証）。**

---

## 4. 予実領域の上書き（`plan-actual-decisions-ja.md` との差分）

**`Project` に関する限り、plan-actual が ERD の記述を打ち消した列は 1 つも無い。** 同書 §11「既存文書との差分（反映先）」の表（PA:1256-1283）は `grs-native-erd-ja.md` について「**`Task` の属性**（実績まわり）」しか挙げておらず、`Project` の行を持たない。

関係する点は次の 2 つで、いずれも `Project.status_date` の**役割**についてであり、列の増減ではない。

| # | 内容 | ERD の記述 | plan-actual / 仕様の確定 | 差分の性質 |
|---|---|---|---|---|
| 1 | 基準日の役割 | `status_date` は「イナズマ線」の基準（ERD:247） | イナズマ線の頂点は**段ごと**に打ち、頂点の無い段は**基準日の位置を通す**（途切れさせない）。遅れ `(!)` の 3 条件も全て「〜 < 基準日」（PA:412-414,720-728,765-772） | **上書きではなく詳細化**。`Project` の列は変わらない |
| 2 | 本日線 | 「今日線は**実行時のシステム日付**で描く」ので `CurrentDate` を Carry へ降格（ERD:1017） | 仕様が**本日線と基準日線を 1 本に統合**し、本日線そのものを廃止（`S-99d` 廃止・2026-08-13）。位置も描画有無も `Project.status_date` が決める | **後段の仕様が ERD より先へ進んでいる。** ただし `CurrentDate` を使わない点は両者一致 |

⚠️ **`progressRatio` / `importance` / `progressStatus` / `iconShapeKind` / 保存する `stop` の廃止は、いずれも `Task` / `TaskVisual` の列であって `Project` には無い。** 本エンティティに廃止済み列は存在しない。

---

## 5. 未解決

### 5-1. 原典どうしが矛盾している点

| # | 何が食い違うか | 出典（両側） | どちらが正か／どう扱うか |
|---|---|---|---|
| U-1 | **Project 直下スカラーの仕分け件数**。台帳 §7.3 は「残 21（Own 17 / Consume 1 / Reconstruct 3）／削 42」と書くのに、同書 §8B の検算行は「**Own 18 ＋ Consume 1 ＋ Reconstruct 1 ＋ Carry 43 = 63**」と書く | LEDGER:510,512,527-528（17/1/3/42）↔ LEDGER:643（18/1/1/43） | **自分で列挙して数え直した結果は 17/1/3/42 = 63。** §8B の検算行は 2026-08-04 に `CurrencyCode` を残側へ移した変更（LEDGER:528 に記録あり）が反映されていない**古い数字**である。⚠️ 両方とも合計 63 になるので機械検査を素通りする |
| U-2 | **`Project` の主キー**。ERD §5.3 の表は `Project` の PK を `id`（= `Project.UID`）と書く。一方 §7.3 は同じ `id` を「`minOccurs=0`＝**省略可**」と書き、確定済みの識別方針は「`Project.UID` は PK ではない」 | ERD:354（PK と明記）↔ ERD:1567,380（省略可・出自不明状態あり） | **「PK ではない」が正。** 省略可の値を主キーにはできない。文書に 1 個しか無い器なので鍵自体が不要である。**ERD §5.3 の表は誤り** |
| U-3 | **作成日時の GRS 名**。ERD §5.2 は `meta_own` の中身を `CreationDate` と MSPDI 名で列挙し、§7.3 は `created` と書く | ERD:251 ↔ ERD:1569 | 未決。`creationDate` に寄せるのが MSPDI 名との対応を保つ（`created` は動詞の過去分詞で、他の列が名詞であることと不揃い） |
| U-4 | **版数の意味**。`Project.revision`（Own）＝ MSPDI "number of times a project has been **saved**" ↔ `FR-063` の版数 ＝「文書に保存される値を変える更新すべて」で +1 | XSD:323,325 ↔ REQ:3111 | **同じ列に相乗りさせられるかが未決。** Own 列に GRS が独自の意味で加算すると、往復で相手ツールへ別の意味の数を返す |
| U-5 | **`schema_version` の置き場所**。ERD は `Project` の列、JSON 実例は **JSON 最上位**の `schemaVersion` | ERD:241,1573 ↔ ENTRY:100 | 未決。⚠️ 最上位に置くほうが「文書を読む前に版を判別する」（`FR-073`）という順序に合うが、原典に判断の記録が無い |
| U-6 | **取込連番の表記**。ERD は `import_seq` / `documentSettings.import_seq`、前プロジェクトの設定台帳・仕様の用語辞書・設定値表はいずれも **`importSeq`** | ERD:476-481,1130 ↔ DOCSET:253 / GLOSS:218 / SET:134 | **`importSeq` が正**（用語辞書が名前の正であり、`import_seq` は許される snake_case 3 語に入らない）。ERD 側が**要改名** |
| U-7 | **JSON の `project` オブジェクトの表記が全面的に食い違う**。ERD/§7.3 は snake_case（`start_date` / `status_date` / `minutes_per_day` / `week_start_day` / `calendar_id` / `uid_high_water_mark`）、JSON 実例は lowerCamelCase（`startDate` / `statusDate` / `minutesPerDay` / `weekStartDay` / `calendarId` / `uidHighWaterMark`） | ERD:246-250,1570-1574 ↔ ENTRY:101-111 | **lowerCamelCase が正**（命名規約）。**ただし `status_date` だけは例外として snake_case が正**であり、用語辞書が `Project.status_date` と明記している。つまり **JSON 実例の `statusDate` は誤り**、他の列は **ERD 側が誤り**という**入り組んだ食い違い**である |
| U-8 | `Project` の列名が**用語辞書に 1 つも載っていない**（載るのは `Project.status_date` の 1 語のみ、しかも表ではなく表 T-104 の注記として） | GLOSS:244（注記のみ）／GLOSS 表 T-101・T-102 に `Project` の行なし | 未決。用語辞書は「本書が用語の正である」と宣言しているのに `Project` のプロパティ群が欠けている |

### 5-2. 決められない点（原典で確かめられないもの＝未検証）

| # | 何が決まっていないか | 出典 |
|---|---|---|
| V-1 | **`FR-063` の「最後に書いた者」の受け皿**。MSPDI に対応要素が無いことは XSD 検索で確認済み。GRS 側にも列・確定名・設定値行が無い。**新設が要るが、名前も置き場所も決まっていない** | REQ:3111 / XSD 全文検索（§3-1）/ ERD:1565-1577 / GLOSS 全文 |
| V-2 | **`FR-063` の「時刻」を `Project.last_saved` に充てるかどうか。** 形は合うが決定の記録が無い | REQ:3111 / XSD:328 |
| V-3 | **`schema_version` の値の形式と既定値。** JSON 実例に `"grs-1"` とあるだけで、採番規則も互換判定規則も原典に無い | ENTRY:100 / ERD:1573 |
| V-4 | **`uid_high_water_mark` の新規文書での初期値。** 「常に `+1`」「ロード時に `max(HWM, 実在 UID の最大)` へ引き上げる」という規則はあるが、初期値の記載が無い（JSON 実例の `4` は 4 件取り込んだ後の値） | ERD:1574 / ENTRY:109 |
| V-5 | **`carry` / `carry_elements` の空の表現**（`{}`／`[]`／`null` のどれか）。§5.5d-4 は Own/Consume 列について `null` を明示せよと定めるが、Carry の入れ物自体の空表現は定めていない | ERD:721-739 |
| V-6 | **`CurrencyCode` の既定 `"JPY"` が相手ツールで通るか。** XSD の documentation は "Valid values are: **USD**." と書きながら型制約は `maxLength=3` の文字列のみ。**XSD 上は妥当だが、MS Project の挙動は未検証** | XSD:390,392,396 / ERD:1637 |
| V-7 | **`FR-074`（文書の基本情報を見て直す）が画面に出す項目の全数。** 要求文は「作成者・会社・改訂番号・全体の開始日**など**」と例示にとどまり、「どの項目を出すかは Chapter 5 で絞る」と先送りされている。⚠️ **文書名だけは対象に含めてはならない（MUST NOT）** | REQ:3001,3005 |

### 5-3. 要改名（命名規約に反するもの）

⚠️ **snake_case が許されるのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけ**であり、増やしてはならない。`Project` の列は**`status_date` を除く全ての snake_case が違反**である。

| 現行名（ERD の表記） | 違反の内容 | 改名案 | 出典 |
|---|---|---|---|
| `start_date` | snake_case（許可 3 語外） | `startDate` | ERD:246,1570 |
| `minutes_per_day` | 同上 | `minutesPerDay` | ERD:248,1571 |
| `minutes_per_week` | 同上 | `minutesPerWeek` | ERD:251,1571 |
| `days_per_month` | 同上 | `daysPerMonth` | ERD:251,1571 |
| `week_start_day` | 同上 | `weekStartDay` | ERD:249,1571 |
| `calendar_id` | 同上 | `calendarId` | ERD:250,1572 |
| `last_saved` | 同上 | `lastSaved` | ERD:251,1569 |
| `finish_date` | 同上 | `finishDate` | ERD:1576 |
| `schema_version` | 同上 | `schemaVersion`（JSON 実例が既にこの綴り） | ERD:241,1573 / ENTRY:100 |
| `uid_high_water_mark` | 同上 | `uidHighWaterMark`（JSON 実例が既にこの綴り） | ERD:242,1574 / ENTRY:109 |
| `carry_elements` | 同上 | `carryElements` | ERD:700 |
| `import_seq`（ERD 側の表記） | 同上。しかも他の 3 原典は `importSeq` と綴っている | `importSeq` | ERD:1130 ↔ GLOSS:218 |
| **`meta_own`** | snake_case、かつ **`meta` は「無意味な汎用語」に当たる**、かつ **そもそも列ではない**（ERD §5.2 の Mermaid が 9 つの Own 列を 1 行に畳むための表示上の便法。実体は §7.3 の個別列） | **列として持たない。** §7.3 の 9 列（`subject` / `category` / `company` / `manager` / `author` / `created` / `lastSaved` / `minutesPerWeek` / `daysPerMonth`）を素直に並べる | ERD:251,1568-1571 |
| `created` | 規約違反ではないが、MSPDI 名 `CreationDate` および ERD §5.2 の表記と不一致（U-3） | `creationDate` | ERD:251 ↔ ERD:1569 |
| `id` | 規約違反ではないが、他エンティティが `uid` を使う中でここだけ `id`。かつ**主キーではない**ものを `id` と呼ぶのは誤読を招く（U-2） | 未決。**主キーでないことが名前から読める語**にすべき | ERD:240,354,1567 |

**規約に照らして問題が無いことを確認した名前**: `status_date`（許可 3 語）／ `name` `title` `subject` `category` `company` `manager` `author` `revision` `carry`（lowerCamelCase 単語）。**`type` / `data` / `info` / `value` は `Project` に 1 つも使われていない。****大文字の略語を連ねた識別子も無い。**
