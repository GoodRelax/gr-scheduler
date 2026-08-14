# E01 — Task (plan side)

`Task` の**予定側**の全数調査。実績側（`actualStart` / `actualDuration` / `actualFinish` / `percentComplete` / `resume` / `resumeValid` / `stop`）は **E02 が担当**する。本書はそれらの列を書かない（末尾に名前だけ掲げる）。

## 読んだ原典

| 略号 | ファイル | 行数 | 読んだ範囲 |
| --- | --- | ---: | --- |
| `erd` | `previous-project-result/02-data-model/grs-native-erd-ja.md` | 1827 | 全文 |
| `ledger` | `previous-project-result/02-data-model/grs-mspdi-field-ledger-ja.md` | 677 | 全文 |
| `mapping` | `previous-project-result/02-data-model/property-mspdi-mapping-ja.md` | 520 | 全文 |
| `plan-actual` | `previous-project-result/07-plan-actual/plan-actual-decisions-ja.md` | 1348 | 全文（予実領域の正） |
| `glossary` | `docs/spec/_assets/tbl-glossary.md` | 259 | 全文（名前の正・突き合わせ用） |
| `xsd` | `docs/reference/mspdi/mspdi_pj12.xsd` | 3906 | `Task` 要素（1604-2496）／`ExtendedAttributes`（986-1160）／`Project` の換算スカラー（429-443）を実測 |
| `tbl-settings` | `docs/spec/_assets/tbl-settings.md` | — | `importMaxDepth` / `importMaxItems` / `maxGroupDepth` の 3 行のみ参照 |

- 出典欄は `ファイル名:行番号`。ファイル名は上表の略号ではなくベース名で書く。
- **MSPDI の要素**欄は `mspdi_pj12.xsd` で実在・型・`minOccurs` を確認したものだけを断定した。確認していないものは「未検証」と書く。
- `Task` に**担当者の列は無い**（担当は `Assignment` → `Resource.name` から導出する。`grs-native-erd-ja.md:541`）。テキスト列は **`name` と `notes` の 2 つだけ**で、略称 `abbrev` は廃止済み（`property-mspdi-mapping-ja.md:41`）。

## 1. `Task` ネイティブ列（予定側・GRS が構造として持つ）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `uid` | 整数 | ✗ | PK | — | Own | `Task/UID`（`xsd:integer`・`minOccurs` 既定 1 ＝必須） | 新規作成は `Project.uid_high_water_mark + 1` | 文書内一意・不変の往復キー。代理キーを持たない。**値から意味を読まない**（予約帯を作らない・ランダム値でも成立）。衝突は取込時の 3 択で解消。`TaskOrigin` 行が無い＝GRS 生まれで、照合対象にしない | `grs-native-erd-ja.md:1506`／`grs-native-erd-ja.md:364`／`grs-native-erd-ja.md:372`／`mspdi_pj12.xsd:1610` |
| `wbs_parent_uid` | 整数 | ○（`null` = ルート） | FK | `Task.uid` | Consume（`OutlineLevel` ＋文書順） | `Task/OutlineLevel`（`xsd:integer`・`minOccurs=0`・値域ファセット無し）。**親ポインタ要素は MSPDI に無い** | `null` | **階層の唯一の真実**。深さの数値は持たず、export で親を辿って数える。**深さの上限なし・クランプしない**。import 正規化は 1 式 `lv = max(1, min(raw, prev_lv + 1))`（欠落／飛び／先頭≠1／0 以下を同時に解決）。ダミータスクを作らない。循環は編集時バリデーションで禁止。LOD の判定でだけ `min(深さ, 5)` | `grs-native-erd-ja.md:255`／`grs-native-erd-ja.md:1507`／`grs-native-erd-ja.md:794`／`grs-native-erd-ja.md:811`／`grs-native-erd-ja.md:861`／`plan-actual-decisions-ja.md:840`／`mspdi_pj12.xsd:1682` |
| `wbs_order` | 整数 | 未検証（原典に記載なし） | — | — | **Consume**（本文 3 か所が明記。図は由来注記を欠く） | 単一の対応要素は無い（**文書順**。`Task/OutlineNumber` の順序成分。`Task/ID` は表示行番号で別物） | 未定義（原典に記載なし） | 兄弟内の並び順。ユーザーの意思なので算出不能＝保持する。export のタスク出力順は **WBS 木の深さ優先**。**要改名**（snake_case の許容 3 語に含まれない → `wbsOrder`） | `grs-native-erd-ja.md:112`／`grs-native-erd-ja.md:1508`／`grs-native-erd-ja.md:1656`／`grs-native-erd-ja.md:1029`／図は `grs-native-erd-ja.md:164`・`grs-native-erd-ja.md:256` |
| `name` | 文字列 | ○ | — | — | Own | `Task/Name`（`xsd:string`・`minOccurs=0`・`maxLength=512`） | `null` | バーに描くラベルそのもの（略称を廃止したので `name` が直接描かれる）。**表示だけ打ち切り、データは切らない**（往復無損失） | `grs-native-erd-ja.md:1509`／`property-mspdi-mapping-ja.md:39`／`property-mspdi-mapping-ja.md:513`／`mspdi_pj12.xsd:1620` |
| `start` | 日時（⚠️ 原典が `date` と `date-time` で割れる） | ○（`null` = 元ファイルに要素が無かった） | — | — | Own | `Task/Start`（`xsd:dateTime`・`minOccurs=0`） | `null` | 予定バーの左端。「編集済タスク」判定の入力の 1 つ（変わったら派生量を再計算し、未編集なら受け取った値をそのまま返す） | `grs-native-erd-ja.md:258`／`grs-native-erd-ja.md:1510`／`property-mspdi-mapping-ja.md:61`／`plan-actual-decisions-ja.md:1233`／`mspdi_pj12.xsd:1692` |
| `finish` | 日時（同上） | ○ | — | — | Own | `Task/Finish`（`xsd:dateTime`・`minOccurs=0`） | `null` | 予定バーの右端。`percentComplete` の**分母 `finish − start`**。GRS はスケジューラを持たないので**自動で動かさない**＝実績が予定終了日を越える状態が普通に起きる（設計として正しい） | `grs-native-erd-ja.md:259`／`grs-native-erd-ja.md:1510`／`plan-actual-decisions-ja.md:128`／`plan-actual-decisions-ja.md:188`／`mspdi_pj12.xsd:1697` |
| `milestone` | 真偽 | ○ | — | — | Own | `Task/Milestone`（`xsd:boolean`・`minOccurs=0`・"Whether the task is a milestone."） | `null` | 不変条件 `TaskVisual.shapeKind = 'milestone'` ⇔ `Task.milestone = true`。**権威は `Task.milestone`**（export される側だから）。`Task/Type`（0/1/2）で判定してはならない（同名 `Type` が 3 つある）。⚠️ **用語辞書は「真偽値の `milestone` 列は持たない」と明記＝正面衝突**（未解決 1） | `grs-native-erd-ja.md:260`／`grs-native-erd-ja.md:1511`／`plan-actual-decisions-ja.md:356`／`plan-actual-decisions-ja.md:371`／`tbl-glossary.md:25`／`mspdi_pj12.xsd:1782` |
| `deadline` | 日時 | ○ | — | — | Own | `Task/Deadline`（`xsd:dateTime`・`minOccurs=0`） | `null` | 期限マーカー。**`finish` とは別の独立した値**（終了日ではない） | `grs-native-erd-ja.md:265`／`grs-native-erd-ja.md:1516`／`property-mspdi-mapping-ja.md:68`／`mspdi_pj12.xsd:2021` |
| `notes` | 文字列 | ○ | — | — | Own | `Task/Notes`（`xsd:string`・`minOccurs=0`・長さ制限なし） | `null` | 説明・備考をここへ統合する（テキスト列を 5 つ持って溢れた前々例の反省）。JSON を埋め込む用途に使わない（人が編集して壊れる） | `grs-native-erd-ja.md:268`／`grs-native-erd-ja.md:1519`／`property-mspdi-mapping-ja.md:40`／`property-mspdi-mapping-ja.md:347`／`mspdi_pj12.xsd:2121` |
| `calendar_id` | 整数 | ○ | FK | `Calendar.id` | Consume | `Task/CalendarUID`（`xsd:integer`・`minOccurs=0`） | `null`（`null` の意味は**未検証** — 「既定暦にフォールバックする」と書いた記述は原典に無い） | 個別暦は現状の描画で未使用だが、**Carry に UID 参照を 1 つも残さない**不変条件のため Consume で保持する。**要改名** → `calendarId` | `grs-native-erd-ja.md:271`／`grs-native-erd-ja.md:1019`／`grs-native-erd-ja.md:1520`／`mspdi_pj12.xsd:2011` |
| `fadeInDays` | 整数（日数） | ○（`null` = 元ファイルに無い。**`0` と区別する**） | — | — | Consume（MSPDI 拡張領域） | 値側 `Task/ExtendedAttribute`（`FieldID` ＋ `Value`・`maxOccurs=unbounded`）／定義側 `Project/ExtendedAttributes/ExtendedAttribute`（`CFType=5`(Number)・`ElemType=20`(Task)・`UserDef`・`Alias`。いずれも `minOccurs=0`） | `null` | GRS 予約枠 **`Number1`**（枠は**先頭から**取る。上限本数を知らないので大きい番号から取れない）。`null` なら要素を書かない。定義と値の**両方**を書かないと成立しない。import は定義側・値側の**両方**を見て使用中か判定し、衝突したら空き枠へ退避＋警告、全枠満杯なら JSON のみ＋通知。`FieldName` が `GRS:` 接頭辞なら自分が前回書いた枠＝再利用する。⚠️ **`Estimated` へマッピングしてはならない**（両端の区別と日数が失われる） | `grs-native-erd-ja.md:269`／`grs-native-erd-ja.md:865`／`grs-native-erd-ja.md:880`／`grs-native-erd-ja.md:907`／`property-mspdi-mapping-ja.md:400`／`property-mspdi-mapping-ja.md:456`／`plan-actual-decisions-ja.md:1195`／`mspdi_pj12.xsd:2248`／`mspdi_pj12.xsd:1003`／`mspdi_pj12.xsd:1025` |
| `fadeOutDays` | 整数（日数） | ○（同上） | — | — | Consume（MSPDI 拡張領域） | 同上 | `null` | GRS 予約枠 **`Number2`**。他は `fadeInDays` と同じ。**拡張領域を使うのはこの 2 つだけ**（旧 6 枠 → 2 枠） | `grs-native-erd-ja.md:270`／`grs-native-erd-ja.md:37`／`property-mspdi-mapping-ja.md:401`／`plan-actual-decisions-ja.md:1196` |
| `carry` | 文字列辞書 `{ 要素名: 文字列値 }` | —（新規行は空。`null` ではなく「持たない」） | — | — | Carry の器（フィールド単位） | 解釈しない `Task` 直下スカラー全て（表 3） | 空 | **XML 文字列としてではなく JSON の構造**で持つ（読める・差分が取れる。解釈しないだけ）。import 入口で「ネイティブ列（`null` は出力しない）＋ `carry` ＋ `carry_elements`」の再合成が元要素と一致するか検査し、不一致なら要素まるごと退避。⚠️ **Carry は「書き戻すだけ」であって「読まない」ではない** — `DurationFormat` は export の整形で読む | `grs-native-erd-ja.md:699`／`grs-native-erd-ja.md:702`／`grs-native-erd-ja.md:744`／`grs-native-erd-ja.md:771`／`grs-native-erd-ja.md:1535` |
| `carry_elements` | 配列 `[{ name, ordinal, fields, children }]` | —（同上） | — | — | Carry の器（要素まるごと） | ネイティブ行を作らない子要素（`Baseline` / `OutlineCode` / `TimephasedData` / GRS 枠以外の `ExtendedAttribute` / 重複した `PredecessorLink` ほか・表 4） | 空 | 各コレクション内で**ネイティブ行と同一の番号空間**の `ordinal` を持ち、export は `ordinal` 順に出す。**要改名**（snake_case → `carryElements`）。子キー `fields` は汎用語に近く要検討 | `grs-native-erd-ja.md:700`／`grs-native-erd-ja.md:709`／`grs-native-erd-ja.md:715`／`grs-native-erd-ja.md:772` |

**`null` の規約（全 Own/Consume 列に効く）**: `null` ＝「元ファイルにその要素が無かった」であり `0` / `false` とは異なる。**GRS の JSON は全 Own/Consume 列を常に出力し、値が無ければ `null` と明示する（キーを省略しない）**。MSPDI へ書き出すときだけ省略する。これが無いと往復の差分ゼロは**原理的に不可能**（MSPDI はほぼ全フィールドが `minOccurs=0`）。例外は XSD 必須要素で、`Task` では **`UID` のみ**（`null` でも必ず書く）。出典 `grs-native-erd-ja.md:721`／`grs-native-erd-ja.md:726`／`grs-native-erd-ja.md:739`／`grs-native-erd-ja.md:1709`／`mspdi_pj12.xsd:1610`。

## 2. 保存しない列（Reconstruct・export で作り直す）

正規 JSON に持たない（ドリフト防止）。export のときだけ他の Own / 木構造から焼き込む。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| （非保存）`ID` | 整数 | —（保存しない） | — | — | Reconstruct | `Task/ID`（`xsd:integer`・`minOccurs=0`・"The position identifier of the task within the list of tasks."） | export で採番 | 出力順に振り直す。`uid` とは別物で、`ID` は可変 | `grs-native-erd-ja.md:1629`／`grs-mspdi-field-ledger-ja.md:409`／`mspdi_pj12.xsd:1615` |
| （非保存）`OutlineLevel` | 整数 | —（保存しない） | — | — | **import は Consume・export は木から再生成**（分類語としては Consume。Own にすると `wbs_parent_uid` と二重管理になる） | `Task/OutlineLevel`（`xsd:integer`・`minOccurs=0`） | export で算出 | `wbs_parent_uid` の木の深さ。「先頭=1・増分 ≤ +1」を出口で検査する（落ちるのは実装の誤り）。**クランプしない**（6 段で来たものは 6 段で返す） | `grs-native-erd-ja.md:1630`／`grs-native-erd-ja.md:760`／`grs-native-erd-ja.md:839`／`plan-actual-decisions-ja.md:1161`／`mspdi_pj12.xsd:1682` |
| （非保存）`OutlineNumber` | 文字列 | —（保存しない） | — | — | Reconstruct | `Task/OutlineNumber`（`xsd:string`・`minOccurs=0`・`maxLength=512`） | export で算出 | 木のパスから振り直す。**突合キーにしない**（突合は `UID`）。外部マスタ側が構造から再計算すべき派生コード | `grs-native-erd-ja.md:1631`／`grs-native-erd-ja.md:1760`／`mspdi_pj12.xsd:1672` |
| （非保存）`Summary` | 真偽 | —（保存しない） | — | — | Reconstruct | `Task/Summary`（`xsd:boolean`・`minOccurs=0`） | export で算出 | 子を持つなら `1`、持たないなら `0` | `grs-native-erd-ja.md:1632`／`grs-native-erd-ja.md:846`／`mspdi_pj12.xsd:1787` |
| （非保存）`Duration` | `xsd:duration` | —（保存しない。原値は `carry`） | — | — | **Carry（未編集）/ Reconstruct（編集済）** | `Task/Duration`（`xsd:duration`・`minOccurs=0`） | 未編集は受け取った値 | **未編集タスクは受け取った値をそのまま返す**（暦の解釈差で往復差分が出るのを防ぐ）。**編集済タスクだけ** `finish − start` ＋暦で算出。端数を丸めず、割り切れない値は原文字列を `carry` に保持 | `grs-native-erd-ja.md:1633`／`grs-native-erd-ja.md:1642`／`grs-native-erd-ja.md:1537`／`grs-mspdi-field-ledger-ja.md:431`／`mspdi_pj12.xsd:1702` |

**期間の型変換（`Duration` 系すべてに効く）**: MSPDI は `xsd:duration`（例 `PT40H0M0S`）＝実体は「時間」、GRS は稼働日数の整数。**境界で必ず変換する**。⚠️ 換算式が原典で割れている（未解決 3）。出典 `grs-native-erd-ja.md:1524`／`property-mspdi-mapping-ja.md:135`。

## 3. `Task` 予定側の Carry（`carry` に入る・ネイティブ列にしない）

「採否＝削」だが Drop ではない。**解釈せず温存し export で書き戻す**。実績・工数・コスト側は E02 と対象外領域に属するため、ここでは予定側に効くものを個別に挙げ、残りは群でまとめる。

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| `carry.Duration` | 文字列 | ○ | — | — | Carry（未編集時） | `Task/Duration`（`xsd:duration`） | 原値 | 表 2 の `Duration` と対。未編集なら原文字列をそのまま書き戻す | `grs-mspdi-field-ledger-ja.md:431`／`mspdi_pj12.xsd:1702` |
| `carry.DurationFormat` | 文字列 | ○ | — | — | Carry | `Task/DurationFormat`（enum 26 値・`7=d` 稼働日／`8=ed` 経過日を含む） | 原値 | **export で `xsd:duration` を整形するときだけ読む**（Carry だが読む例外）。稼働日と暦日の区別はここにある | `grs-mspdi-field-ledger-ja.md:432`／`grs-native-erd-ja.md:1535`／`plan-actual-decisions-ja.md:1249`／`mspdi_pj12.xsd:1707` |
| `carry.ConstraintType` | 文字列 | ○ | — | — | Carry | `Task/ConstraintType`（enum 0-7・`minOccurs=0`） | 原値 | GRS は**明示日付で位置を決める**のでスケジューリングのヒントを使わない。解釈せず温存 | `grs-mspdi-field-ledger-ja.md:437`／`mspdi_pj12.xsd:1994` |
| `carry.ConstraintDate` | 文字列 | ○ | — | — | Carry | `Task/ConstraintDate`（`xsd:dateTime`・`minOccurs=0`） | 原値 | 同上（`ConstraintType` の日付引数） | `grs-mspdi-field-ledger-ja.md:437`／`mspdi_pj12.xsd:2016` |
| `carry.Estimated` | 文字列 | ○ | — | — | Carry | `Task/Estimated`（`xsd:boolean`・`minOccurs=0`） | 原値 | ⚠️ **fade と対応しない**。MSPDI の曖昧さはタスク全体で 1 つの 2 値、GRS の fade は**両端独立・日数つき**。`fadeInDays` を `Estimated` に写すと両端の区別と日数が失われる | `grs-mspdi-field-ledger-ja.md:481`／`grs-native-erd-ja.md:922`／`mspdi_pj12.xsd:1777` |
| `carry.WBS` | 文字列 | ○ | — | — | Carry | `Task/WBS`（`xsd:string`・`minOccurs=0`） | 原値 | 独自採番のコード。GRS は使わない（階層は `wbs_parent_uid`） | `grs-mspdi-field-ledger-ja.md:422`／`mspdi_pj12.xsd:1662` |
| `carry.WBSLevel` | 文字列 | ○ | — | — | Carry | `Task/WBSLevel`（`xsd:string`・`minOccurs=0`） | 原値 | 同上 | `grs-mspdi-field-ledger-ja.md:422`／`mspdi_pj12.xsd:1667` |
| `carry.Priority` | 文字列 | ○ | — | — | Carry | `Task/Priority`（`xsd:integer`・0-1000） | 原値 | 平準化用。GRS は平準化エンジンを持たない | `grs-mspdi-field-ledger-ja.md:423`／`mspdi_pj12.xsd:1687` |
| `carry.Type` | 文字列 | ○ | — | — | Carry | `Task/Type`（enum 0=Fixed Units / 1=Fixed Duration / 2=Fixed Work） | 原値 | ソルバ挙動。**マイルストーン判定に使ってはならない**（判定は `Milestone`） | `grs-mspdi-field-ledger-ja.md:434`／`plan-actual-decisions-ja.md:371`／`mspdi_pj12.xsd:1630` |
| `carry.Work` | 文字列 | ○ | — | — | Carry | `Task/Work`（`xsd:duration`・`minOccurs=0`） | 原値 | 工数管理は非対象。**再計算も削除もせず温存して通知する**（`Work = Duration × Units` を当てると Fixed Work タスクで誤値になる） | `grs-mspdi-field-ledger-ja.md:433`／`property-mspdi-mapping-ja.md:294`／`mspdi_pj12.xsd:1742` |
| `carry.Critical` | 文字列 | ○ | — | — | Carry | `Task/Critical`（`xsd:boolean`・`minOccurs=0`） | 原値 | CPM 算出値。永続不要だが往復のため温存 | `grs-mspdi-field-ledger-ja.md:436`／`mspdi_pj12.xsd:1792` |
| `carry.CreateDate` | 文字列 | ○ | — | — | Carry | `Task/CreateDate`（`xsd:dateTime`・`minOccurs=0`） | 原値 | 来歴・GRS 非使用 | `grs-mspdi-field-ledger-ja.md:412`／`mspdi_pj12.xsd:1647` |
| `carry.Contact` | 文字列 | ○ | — | — | Carry | `Task/Contact`（`xsd:string`・`maxLength=512`） | 原値 | 資源管理非対象。**担当者名の情報源にしない**（情報源は `Assignment` → `Resource.name` だけ） | `grs-mspdi-field-ledger-ja.md:413`／`grs-native-erd-ja.md:541`／`mspdi_pj12.xsd:1652` |
| `carry.HideBar` | 文字列 | ○ | — | — | Carry | `Task/HideBar`（`xsd:boolean`・`minOccurs=0`） | 原値 | MS Project のビュー書式。GRS は自前描画 | `grs-mspdi-field-ledger-ja.md:483`／`mspdi_pj12.xsd:2126` |
| `carry.Rollup` | 文字列 | ○ | — | — | Carry | `Task/Rollup`（`xsd:boolean`・`minOccurs=0`） | 原値 | 同上 | `grs-mspdi-field-ledger-ja.md:483`／`mspdi_pj12.xsd:2131` |
| `carry.EffortDriven` | 文字列 | ○ | — | — | Carry | `Task/EffortDriven`（`xsd:boolean`・`minOccurs=0`） | 原値 | ソルバ挙動。GRS 非使用 | `grs-mspdi-field-ledger-ja.md:481`／`mspdi_pj12.xsd:1762` |
| `carry.Recurring` | 文字列 | ○ | — | — | Carry | `Task/Recurring`（`xsd:boolean`・`minOccurs=0`） | 原値 | 同上 | `grs-mspdi-field-ledger-ja.md:481`／`mspdi_pj12.xsd:1767` |
| `carry.OverAllocated` | 文字列 | ○ | — | — | Carry | `Task/OverAllocated`（`xsd:boolean`・"informational only"） | 原値 | 同上 | `grs-mspdi-field-ledger-ja.md:481`／`mspdi_pj12.xsd:1772` |
| `carry.IgnoreResourceCalendar` | 文字列 | ○ | — | — | Carry | `Task/IgnoreResourceCalendar`（`xsd:boolean`・`minOccurs=0`） | 原値 | 平準化群として削。暦の解釈は GRS の既定暦で行う | `grs-mspdi-field-ledger-ja.md:473`／`mspdi_pj12.xsd:2116` |
| `carry.Hyperlink` 群（3） | 文字列 | ○ | — | — | Carry | `Task/Hyperlink` / `HyperlinkAddress` / `HyperlinkSubAddress`（いずれも `minOccurs=0`） | 原値 | GRS 非使用 | `grs-mspdi-field-ledger-ja.md:482`／`mspdi_pj12.xsd:2086`／`mspdi_pj12.xsd:2096`／`mspdi_pj12.xsd:2106` |
| `carry` CPM 派生群（9） | 文字列 | ○ | — | — | Carry | `EarlyStart` / `EarlyFinish` / `LateStart` / `LateFinish` / `StartVariance` / `FinishVariance` / `WorkVariance` / `FreeSlack` / `TotalSlack` | 原値 | スケジューラ派生。実行時計算で足りるが往復のため温存 | `grs-mspdi-field-ledger-ja.md:472`／`mspdi_pj12.xsd:1832`／`mspdi_pj12.xsd:1872` |
| `carry` 平準化群（6） | 文字列 | ○ | — | — | Carry | `LevelAssignments` / `LevelingCanSplit` / `LevelingDelay` / `LevelingDelayFormat` / `PreLeveledStart` / `PreLeveledFinish` | 原値 | 平準化エンジン非搭載 | `grs-mspdi-field-ledger-ja.md:473`／`mspdi_pj12.xsd:2026`／`mspdi_pj12.xsd:2081` |
| `carry` サブ PJ・外部群（5） | 文字列 | ○ | — | — | Carry | `IsSubproject` / `IsSubprojectReadOnly` / `SubprojectName` / `ExternalTask` / `ExternalTaskProject` | 原値 | 単一 PJ 前提 | `grs-mspdi-field-ledger-ja.md:479`／`mspdi_pj12.xsd:1797`／`mspdi_pj12.xsd:1822` |
| `carry` 発行・コミット群（5） | 文字列 | ○ | — | — | Carry | `IsPublished` / `StatusManager` / `CommitmentStart` / `CommitmentFinish` / `CommitmentType` | 原値 | サーバ連携非対象 | `grs-mspdi-field-ledger-ja.md:480`／`mspdi_pj12.xsd:2438`／`mspdi_pj12.xsd:2458` |
| `carry_elements`（`IsNull=1` の Task） | 要素まるごと | — | — | — | Carry（要素まるごと） | `Task/IsNull`（`xsd:boolean`・`minOccurs=0`・"Whether the task is null."） | — | **ネイティブ行を作らない**。空行は「行」ではあっても「タスク」ではなく、日付も階層も持たないため WBS 木に入れると木の意味が壊れる。原位置・原形のまま往復する。**中止の表現に流用してはならない** | `grs-mspdi-field-ledger-ja.md:411`／`grs-native-erd-ja.md:700`／`plan-actual-decisions-ja.md:1243`／`mspdi_pj12.xsd:1642` |

> 上表に無い `Task` 直下スカラー（実績・工数・コスト・EVM）は **E02 と対象外領域**に属する。全数の仕分けは `grs-mspdi-field-ledger-ja.md:400`〜`grs-mspdi-field-ledger-ja.md:494` が持つ。

## 4. `Task` の子要素の扱い

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
| --- | --- | :--: | :--: | --- | --- | --- | --- | --- | --- |
| （子要素）`PredecessorLink` | 要素の並び | — | — | `Dependency`（別エンティティ） | Consume | `Task/PredecessorLink`（`minOccurs=0`・`maxOccurs=unbounded`） | — | `Dependency`（複合 PK: `successor_uid` / `predecessor_uid` / `link_type`）へ構造化する。**`Task` の列にはならない**（E03 相当の担当）。XSD 全体に `unique` / `key` / `keyref` は **0 件**（本作業で実測）なので重複リンクが妥当＝2 本目以降は要素まるごと Carry | `grs-mspdi-field-ledger-ja.md:490`／`grs-native-erd-ja.md:1556`／`mspdi_pj12.xsd:2162` |
| （子要素）`ExtendedAttribute` | 要素の並び | — | — | — | **Consume（GRS 枠のみ）/ Carry（他）** | `Task/ExtendedAttribute`（`FieldID` / `Value` / `ValueGUID` / `DurationFormat`） | — | GRS が予約した `FieldID` だけ `fadeInDays` / `fadeOutDays` へ Consume。**他ツール由来の枠は Carry** で原順序のまま書き戻す。往復同一性検査は「原順序まで一致」を必須にする | `grs-mspdi-field-ledger-ja.md:491`／`grs-native-erd-ja.md:903`／`property-mspdi-mapping-ja.md:489`／`mspdi_pj12.xsd:2248` |
| （子要素）`Baseline` | 要素の並び | — | — | — | Carry | `Task/Baseline`（`minOccurs=0`・`maxOccurs=unbounded`・0〜10） | — | 変更前予定は**別ファイルの baseline** で代替する（本 ERD の一級エンティティにしない） | `grs-mspdi-field-ledger-ja.md:492`／`grs-native-erd-ja.md:1719`／`mspdi_pj12.xsd:2307` |
| （子要素）`OutlineCode` | 要素の並び | — | — | — | Carry | `Task/OutlineCode`（分類コード割当値） | — | 独自コード体系は非対象 | `grs-mspdi-field-ledger-ja.md:493` |
| （子要素）`TimephasedData` | 要素の並び | — | — | — | Carry | `Task/TimephasedData` | — | 工数・原価・完了率の時間配分であって**バーの分割区間ではない**。GRS は分割区間のリストを持たない（持てば往復で必ず落ちる） | `grs-mspdi-field-ledger-ja.md:494`／`plan-actual-decisions-ja.md:97`／`plan-actual-decisions-ja.md:1250` |

## 5. 予実領域の上書き（`plan-actual` が正）— 予定側に効く差分

`02-data-model` の 3 文書と `07-plan-actual` が食い違う箇所のうち、**予定側に効くもの**を全数記録する（実績側の差分は E02 が持つ）。

| # | 何が | 旧（`02-data-model` の記述） | 確定（`plan-actual` が正） | 出典 |
| --- | --- | --- | --- | --- |
| D-1 | LOD の判定属性 | `importance`（重要度）を持ち LOD の選別に使う | **`importance` 廃止**。LOD は **WBS の階層の深さ**（`wbs_parent_uid` から導出）で判定し、判定でだけ `min(深さ, 5)` | `grs-native-erd-ja.md:33`／`plan-actual-decisions-ja.md:825`／`plan-actual-decisions-ja.md:847` |
| D-2 | `OutlineLevel` の仕分け | 「GRS が値を決めて書き出す要素」の並びに入り Own と読めた | **Consume のまま**（`wbs_parent_uid` から再生成するので Own にすると二重管理になる） | `plan-actual-decisions-ja.md:1161`／`grs-mspdi-field-ledger-ja.md:419` |
| D-3 | WBS の深さ | 6 段以上は 5 段へクランプして Drop | **クランプしない**（取り込んだ深さのまま保持し、そのまま書き戻す）。Drop はむしろ減る | `grs-mspdi-field-ledger-ja.md:28`／`grs-native-erd-ja.md:839`／`plan-actual-decisions-ja.md:851` |
| D-4 | 拡張領域の消費 | 6 属性・6 枠（`importance` / `progressStatus` / `stop` / `resume` ほか） | **2 枠だけ**（`fadeInDays` = `Number1` / `fadeOutDays` = `Number2`） | `property-mspdi-mapping-ja.md:28`／`plan-actual-decisions-ja.md:1189` |
| D-5 | 拡張領域の枠の向き | 大きい番号から取る（衝突確率が低い） | **反転。先頭から取る**（上限本数を知らないと大きい番号から取れない） | `property-mspdi-mapping-ja.md:414`／`plan-actual-decisions-ja.md:1200` |
| D-6 | タスク形状の語 | `iconShapeKind` | **`shapeKind`**（`TaskVisual` 側の列。`Task.milestone` が権威） | `grs-native-erd-ja.md:35`／`plan-actual-decisions-ja.md:1044`／`plan-actual-decisions-ja.md:356` |
| D-7 | 状態の自由文字列 | `progressStatus`（自由文字列） | **廃止**（状態が `actualFinish` / `resume` / `resumeValid` で構造化された）。自由文は `notes` に書く＝**テキスト列は増えない** | `grs-native-erd-ja.md:34`／`plan-actual-decisions-ja.md:1091` |

## 6. 範囲外（E02 が担当する `Task` の列・名前のみ）

`actualStart` / `actualDuration` / `actualFinish` / `percentComplete` / `resume` / `resumeValid`、および**保存しない** `stop`（中断のときだけ export で算出して書く）。出典 `plan-actual-decisions-ja.md:51`／`plan-actual-decisions-ja.md:70`／`plan-actual-decisions-ja.md:1117`。

## 未解決

1. **`Task.milestone` という列があるのか無いのか（正面衝突）。** `grs-native-erd-ja.md:260`・`grs-native-erd-ja.md:1511`・`plan-actual-decisions-ja.md:356` は `Task.milestone` を Own（← `Task/Milestone`）とし「**権威は `Task.milestone`**（export される側だから）」と明記する。一方 `tbl-glossary.md:25` は「⚠️ **真偽値の `milestone` という列は持たない**」と明記し、`shapeKind` が `'milestone'` かどうかで表示を決めるとする。`Task/Milestone` は XSD に実在する（`mspdi_pj12.xsd:1782`）ので、**列を持たない設計を採るなら export 時に `TaskVisual.shapeKind` から `Milestone` を復元する規則が要る**が、その規則はどの原典にも無い。加えて `TaskVisual` は非 export の視覚層なので、権威を非 export 側に置くと往復の権威が視覚層に移る。**要判断（次期の確定事項）。**
2. **`wbs_order` の由来が図と本文で食い違う。** 本文は 3 か所とも Consume と読める（`grs-native-erd-ja.md:112`「`OutlineLevel` ＋順序 → `wbs_parent_uid` / `wbs_order`」／`grs-native-erd-ja.md:1508`「Consume」／`grs-native-erd-ja.md:1656`「Consume（WBS）」）。しかし ERD 図（`grs-native-erd-ja.md:164`・`grs-native-erd-ja.md:256`）の `wbs_order` には **`←` も ‼️ も付いていない**ため、図だけを読むと由来が決まらない（凡例は `←`＝MSPDI 由来／‼️＝GRS 新設の 2 分類しか用意していない）。**図が誤り。本文を採る。**
3. **期間の換算式が 2 原典で食い違う。** `grs-native-erd-ja.md:1529` は「**時間 ÷ `Project.minutes_per_day` = 稼働日数**」、`property-mspdi-mapping-ja.md:135` は「**日数 = 時間 ÷ (`MinutesPerDay` ÷ 60)**」。XSD は `MinutesPerDay` を "The number of minutes per day"（`xsd:integer`・`mspdi_pj12.xsd:429`）と定義するので、次元が合うのは後者（＝分 ÷ `minutes_per_day`）であり、**前者は 60 倍ずれる**。`property-mspdi-mapping-ja.md` を採る。`grs-native-erd-ja.md` §7.1a は要訂正。
4. **命名規約違反（要改名）。** snake_case を許すのは `wbs_parent_uid` / `link_type` / `Project.status_date` の 3 語だけなので、`wbs_order` → `wbsOrder`、`calendar_id` → `calendarId`、`carry_elements` → `carryElements`。用語辞書に載っているのは `wbs_parent_uid`（`tbl-glossary.md:60`）だけで、**`uid` / `wbs_order` / `calendar_id` / `milestone` / `carry` / `carry_elements` はいずれも用語辞書に無い**（`name` `notes` `start` `finish` `deadline` `fadeInDays` `fadeOutDays` は `tbl-glossary.md:39`〜`tbl-glossary.md:59` にある）。**次期は用語辞書へ追記するか、列名を確定名へ合わせるかを決める必要がある。**
5. **`Task` に `ordinal` があるのか無いのか。** `grs-native-erd-ja.md:715` は「各コレクション内の**全要素**（ネイティブ行も要素まるごと Carry も）に同一の番号空間で `ordinal` を振り、export は `ordinal` 順に出力する」と定めるが、`grs-native-erd-ja.md:253`〜`grs-native-erd-ja.md:272` の `Task` に `ordinal` 列は無く、`grs-native-erd-ja.md:718` と `grs-native-erd-ja.md:849` はタスクの出力順を「**WBS 木の深さ優先**」と定める。**`IsNull=1` の欠番行（要素まるごと Carry）を原位置へ戻す方法が決まらない**（深さ優先順と `ordinal` 順のどちらに従うのか）。
6. **`Task.calendar_id = null` の意味が未定義。** 「`null` なら `Project.calendar_id`（既定暦）を使う」と書いた記述は原典に無い。`grs-native-erd-ja.md:1019` は「個別暦は現状未使用」とだけ言う。**未検証。**
7. **`start` / `finish` の粒度（日か日時か）が原典で割れる。** ERD 図は `date`（`grs-native-erd-ja.md:258`）、対応表は `date-time`（`property-mspdi-mapping-ja.md:61`）、MSPDI は `xsd:dateTime`（`mspdi_pj12.xsd:1692`）。**時刻成分を捨てる実装にすると未編集往復で差分が出る**（`DefaultStartTime` / `DefaultFinishTime` は Carry なので補完できない）。次期が確定させること。
8. **拡張領域の枠の実値が未検証。** `Number1` / `Number2` に対応する `FieldID` の実際の PID 整数は XSD に無い（XSD は `FieldID` を「custom field の PID」とだけ定義・`mspdi_pj12.xsd:992`）。枠の本数の上限も無く、XSD の注記は「Project が理解するのは Flag1-Flag10 等に限る」とだけ言う（`mspdi_pj12.xsd:988`）。実機確認が残件（`plan-actual-decisions-ja.md:1291`）。
9. **`FieldName` の命名規則は「推奨」止まりで未確定。** `property-mspdi-mapping-ja.md:444` は `GRS:fadeInDays` を推奨とするが、同書 `property-mspdi-mapping-ja.md:382` が「**推奨は根拠つきの提案であって、確定ではない**」と明記している。一方 `grs-native-erd-ja.md:885` は `Alias` を `GRS Fade In Days` と書いており、`FieldName` と `Alias` で表記が揃っていない。
10. **WBS の深さの上限が新旧で扱いが違う。** 前プロジェクトは「上限なし・クランプしない」（`grs-native-erd-ja.md:839`）。現行仕様は設定値 `importMaxDepth`（既定 `64`）を持ち「WBS はクランプしない」と断ったうえで**取り込みの上限**を課す（`tbl-settings.md:268`）。**上限を超えたファイルを拒否するのか警告するのかは、本作業で読んだ原典に無い。**
11. **分類語「Carry」の定義と実運用が食い違う。** `grs-mspdi-field-ledger-ja.md:91` は Carry を「理解 ✗（意味を使わない）」と定義するが、`grs-native-erd-ja.md:1535` は「**Carry は『書き戻すだけ』であって『読まない』ではない**」として `DurationFormat` を export の整形で読む。分類語の定義側に例外を書き足す必要がある。
12. **`carry_elements` の子キー `fields` が汎用語に近い。** 構造は `{ name, ordinal, fields, children }`（`grs-native-erd-ja.md:700`）。`type` / `data` / `info` / `value` は禁止語に挙がっているが `fields` は挙がっていない。ただし「何の集まりか」を言っていないので、要改名候補として記録する（例: `scalars`）。
