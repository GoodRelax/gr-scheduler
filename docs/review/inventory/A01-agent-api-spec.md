# A01 — `Agent API` 仕様（`agent-interface-spec-ja.md`）

**担当範囲**: `Agent API` の設計そのもの。文書のルート直下の構造・`revisionStamp` / `changeLog`・関数の全数・書き込みの契約・監視の契約・単一 `.html` への埋め込み・信頼境界。

---

## 0. 読んだ文書と行数

| # | 別名 | ファイル | 行数 | 読んだ範囲 |
|:--:|:--:|---|--:|---|
| 1 | `SPEC` | `previous-project-result/10-agent-interface/agent-interface-spec-ja.md` | **691** | **全文**（1–200 / 200–400 / 400–579 / 579–691 の 4 回に分けて読了） |
| 2 | `DOC` | `previous-project-result/10-agent-interface/samples/grs-document-with-revision-stamp.json` | **96** | **全文**（`json.load` で全鍵を機械走査もした） |

**行数は自分で数えた**（`wc -l` = 691 / 96）。以下 `SPEC:nnn` / `DOC:nnn` は上記 2 ファイルの行番号である。

> ⚠️ **読んでいない文書**（本書の主張はこれらに**基づかない**）:
> `agent-interface-open-items-ja.md`（決定-1〜6・決着-1〜8 の**正**。`SPEC` が 40 回以上名指しする）／
> `agent-interface-requirements-ja.md`（`A-1`〜`A-18` の正。A02 が全文既読）／
> `ai-cowork-trial-findings-ja.md`／`02-data-model/grs-native-erd-ja.md`／`02-data-model/grs-document-settings-ja.md`／
> `DISCARDED-ja.md`。
> **`SPEC` が「決定-n にそう書いてある」と述べている箇所は、本書では転記であって検証ではない**（そう明記する）。

**`SPEC` の見出しの全数（自分で数えた）**: `##` / `###` 合わせて **26 個**（`SPEC:19,46,103,158,179,210,232,266,287,340,396,412,414,447,480,482,514,533,550,562,599,633,648,660,675`＝25 個 ＋ `# Agent Interface 仕様`＝`SPEC:9`）。

> ⚠️ **節の並びが崩れている。** `### 5-4.`（`SPEC:562`）が `### 5-3.`（`SPEC:599`）**より前**に置かれている。
> 内容の欠落ではなく並び順の事故だが、**「§5-3 を読め」という他文書の参照が節番号順の探索で外れる**。

---

## 1. 文書のルート直下の構造 —— 全数 **16 鍵**

**自分で数えた**: `json.load` で `DOC` のルートを全走査し、鍵は **16 個**。うち `_changeLogComment` は**サンプル専用の注釈**なので、**実際の入れ物は 15 個**である。

| # | 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|:--:|---|---|:--:|---|---|---|---|---|---|---|
| 1 | `schemaVersion` | string | 不可（**未検証**） | — | — | GRS | （対応なし） | 記載なし（実例 `"grs-1"`） | **根の直下**。`documentSettings` の中ではない。`revisionStamp.revision`（更新回数）とは**別物** | `DOC:2`／`SPEC:187` |
| 2 | `revisionStamp` | object（3 鍵） | 不可（**未検証**） | — | — | GRS | （対応なし） | **記載なし（初期値は未決）** | **保存する**（決定-3）。**あらゆる確定で更新**。`documentSettings` に入れてはならない。**MSPDI へ書き出さない**（往復の対象外） | `DOC:4`–`8`／`SPEC:189`–`193`, `SPEC:210`–`230` |
| 3 | `_changeLogComment` | string | — | — | — | **サンプル専用** | — | — | ⚠️ **スキーマの一部ではない。** `SPEC:185`–`207` の jsonc にこの鍵は無い。**次期の実装が書いてはならない** | `DOC:10` |
| 4 | `changeLog` | array&lt;object（4 鍵）&gt; | 空配列可（**未検証**） | — | 項目の `revision` が `revisionStamp.revision` と**同じ体系** | GRS | **記述が無い（未検証）** | 記載なし（実例は 1 件） | **変更 1 回につき 1 件**なので変更回数で自然に有界。**疎**（人間の UI 操作には通常付かない）。**消さない**（`undo` でも 1 件足す） | `DOC:11`–`18`／`SPEC:195`–`202`, `SPEC:232`–`264`, `SPEC:324` |
| 5 | `project` | object（9 鍵） | 不可 | — | — | 混在 | `Project` | — | 文書に 1 個。実例の鍵は `id` / `name` / `startDate` / `statusDate` / `minutesPerDay` / `weekStartDay` / `calendarId` / `uidHighWaterMark` / `carry`。⚠️ **`schemaVersion` はこの中に無い** | `DOC:20`–`30` |
| 6 | `documentSettings` | object | 不可 | — | — | GRS | 非 export | **全項目を常に書く** | サンプルでは中身を省略。**省略は「実物は全鍵を書く」と注記した上でのサンプルの都合**である | `DOC:32`–`34` |
| 7 | `tasks` | array&lt;object（**19 鍵**）&gt; | — | 各行 PK = `uid` | — | 混在 | `Task` | — | 実例 3 行がすべて 19 鍵。鍵は `uid` / `wbsParentUid` / `wbsOrder` / `name` / `start` / `finish` / `milestone` / `actualStart` / `actualDuration` / `actualFinish` / `percentComplete` / `deadline` / `resume` / `resumeValid` / `notes` / `fadeInDays` / `fadeOutDays` / `calendarId` / `carry` | `DOC:36`–`75` |
| 8 | `dependencies` | array&lt;object（5 鍵）&gt; | — | 複合 | `Task.uid` × 2 | Own | `PredecessorLink` | — | 鍵は `successorUid` / `predecessorUid` / `linkType` / `lag` / `lagFormat` | `DOC:77`–`79` |
| 9 | `taskGroups` | array&lt;object（8 鍵）&gt; | — | 各行 PK = `id` | `TaskGroup.id`（自己参照） | GRS | **非 export** | — | 鍵は `id` / `parentId` / `label` / `derivedFromTaskUid` / `order` / `collapsed` / `color` / `height` | `DOC:81`–`84` |
| 10 | `taskGroupMembers` | array&lt;object（3 鍵）&gt; | — | **宣言なし** | `TaskGroup.id` ＋ `Task.uid` | GRS | **非 export** | — | 鍵は `groupId` / `taskUid` / `stackOrder`。**結合表として実在する**（→ 末節 X-3） | `DOC:85`–`88` |
| 11 | `taskVisuals` | array（実例は空） | — | 各行 PK = `taskUid` | `Task.uid` | GRS | **非 export** | `[]` | 実例が空なので**列は本サンプルから読み取れない** | `DOC:90` |
| 12 | `taskOrigins` | array（実例は空） | — | 各行 PK = `taskUid` | `Task.uid` | GRS | **非 export** | `[]` | 同上 | `DOC:91` |
| 13 | `calendars` | array（実例は空） | — | 各行 PK = `id` | — | Own | `Calendars/Calendar` | `[]` | 同上。⚠️ `project.calendarId` = `1` が**存在しない暦を指している**（→ 末節 Y-2） | `DOC:92` |
| 14 | `resources` | array（実例は空） | — | 各行 PK = `uid` | — | Own | `Resources/Resource` | `[]` | 同上 | `DOC:93` |
| 15 | `assignments` | array（実例は空） | — | 各行 PK = `uid` | `Task.uid` / `Resource.uid` | Own | `Assignments/Assignment` | `[]` | 同上 | `DOC:94` |
| 16 | `carryElements` | array（実例は空） | — | — | — | **Carry** | 原要素そのまま | `[]` | 同上 | `DOC:95` |

**ルートに無い鍵で、設計上の意味があるもの**:

| 鍵 | どこに書かれているか | 実物にあるか | 判定 |
|---|---|:--:|---|
| **`documentId`** | `SPEC:187` の jsonc が**根の直下に書いている**（`"documentId": "0f2c9a1e-…"`）／`SPEC:266`–`284` が 1 節を割く | **無い** | ⚠️ **同じ担当の 2 文書が食い違う**（→ 末節 Y-1）。`SPEC:279` 自身が「**提案の域を出ない**」と書き、正への追加を `NEXT-STEPS-ja.md` **4-2** に立てている |
| **`comments` / `highlightBoxes`** | `SPEC` は 1 度も触れない | **無い** | `E08-comment-highlight.md:213`（C-2）が「JSON のコレクション名は**どこにも無い**」とする件。**本サンプルでも 0 件**で、C-2 は**依然として未決**（→ §11 O-9） |
| `documentSettings` の中身 | `DOC:33` が「実物は全鍵を書く」と注記して省略 | **省略** | サンプルからは 81 鍵を検証できない。**`E09` の担当** |

---

## 2. `revisionStamp` と `changeLog` の列

### 2-1. `revisionStamp`（3 列。**保存する**）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|---|---|---|---|---|---|---|
| `revision` | integer | 不可 | — | — | GRS | （対応なし） | **記載なし（初期値未決）** | **あらゆる確定で 1 増える。減らない。飛ばさない。** `undo` / `redo` でも**前へ進む** | `SPEC:214`, `SPEC:316`／`DOC:5` |
| `lastEditedBy` | `"human"` \| `"agent"` | 不可 | — | — | GRS | （対応なし） | 記載なし | **最後に確定させたのは誰か。** 監視の起床判定に使う（`A-11`） | `SPEC:215`／`DOC:6` |
| `updatedAt` | ISO 8601（**`Z` 付き UTC**） | 不可 | — | — | GRS | （対応なし） | 記載なし | 最後の確定時刻 | `SPEC:216`／`DOC:7` |

**`revisionStamp` について確定していること**:

| # | 決定 | 理由 | 出典 |
|:--:|---|---|---|
| RS-1 | **保存する**（決定-3 の転記） | `file://` ではファイルが往復の運び手なので、**版が乗っていないと「自分が書いたままか、人が直した後か」を中身の全比較でしか判定できない** | `SPEC:218`–`219` |
| RS-2 | **`agentApiVersion` を入れない** | 書いた側の都合であって日程表の情報ではない。**入れると版が上がるたびに全ファイルの diff が出る** | `SPEC:221`–`222` |
| RS-3 | **`documentSettings` に入れてはならない** | `documentSettings` は「同じ JSON から同じ絵を得るためのもの」であり、**`revisionStamp` は絵に影響しない**。混ぜると「全項目を常に書き出す」規約の対象が濁る | `SPEC:224`–`227` |
| RS-4 | **MSPDI へ書き出さない**（Carry にも載せない・**往復の対象外**） | MSPDI 側に対応する概念が無い | `SPEC:229`–`230` |
| RS-5 | **`documentId` を入れない** | 識別子は「版」ではないので名前と中身がずれる。**決定-3 は 3 キーで確定している** | `SPEC:282`–`283` |

### 2-2. `changeLog[]`（4 列。**保存する**）

| 列名 | 型 | null 可 | 鍵 | FK の相手 | 由来 | MSPDI の要素 | 既定値 | 制約・規則 | 出典 |
|---|---|:--:|---|---|---|---|---|---|---|
| `revision` | integer | 不可 | — | `revisionStamp.revision` と**同じ体系**（FK の宣言は無い） | GRS | （対応なし） | — | **実際に文書が変わった `revision` にしか付かない** | `SPEC:243`／`DOC:13` |
| `editedBy` | `"human"` \| `"agent"` | 不可 | — | — | GRS | （対応なし） | — | 誰の変更か。⚠️ **`SPEC:244` の表の行は区切り記号のエスケープ漏れで壊れている**（→ §11 O-11） | `SPEC:244`／`DOC:14` |
| `explanation` | string | — | — | — | GRS | （対応なし） | — | **何を・なぜ変えたか。** 表示は必ずテキストとして行う（`innerHTML` 直挿し禁止＝`user-order.md` 62）。**`note` / `notes` という語を使わない**（`Task.notes` と語彙が重なる） | `SPEC:245`, `SPEC:252`–`253`／`DOC:15` |
| `changedAt` | ISO 8601（**`Z` 付き UTC**） | — | — | — | GRS | （対応なし） | — | 変更時刻 | `SPEC:246`／`DOC:16` |

**`changeLog` について確定していること**:

| # | 決定 | 出典 |
|:--:|---|---|
| CL-1 | **チャット欄は保存しない**（実行時のみ）。**保存するのは「変更の理由」だけ** | `SPEC:236`–`239` |
| CL-2 | **変更を伴わない発言は残らない。** 意図して受け入れた代償である | `SPEC:250`, `SPEC:264` |
| CL-3 | **変更 1 回につき 1 件**なので変更回数で自然に有界 —— **上限の設計が要らない** | `SPEC:260` |
| CL-4 | **`undo` でも項目を消さない。取り消した事実を 1 件足す。履歴は減らない** | `SPEC:324` |
| CL-5 | 書き手は `changeExplanation`（要求）→ `explanation`（保存）という**名前の乗り換えが仕様として定義されている**（→ 末節 X-1） | `SPEC:297`, `SPEC:403` |

---

## 3. どこまで保存され、どこからが実行時だけか

| 対象 | 保存 | 置き場所 | 出典 |
|---|:--:|---|---|
| `revisionStamp`（3 列） | **する** | 文書 JSON の根 | `SPEC:218` |
| `changeLog[]`（4 列） | **する** | 文書 JSON の根 | `SPEC:239` |
| `documentSettings`（`ViewState` の中身を含む） | **する** | 文書 JSON の根 | `SPEC:151`, `DOC:32` |
| `TaskGroup` / `TaskGroupMember` / `TaskVisual` / `TaskOrigin` | **する**（ただし**非 export**） | 文書 JSON の根 | `DOC:81`–`91` |
| **チャット欄の会話** | **しない** | 実行時のみ | `SPEC:238` |
| **`agentApiVersion` / `schemaVersion`（API のプロパティ側）** | **しない** | 実行時のみ（読み出し専用の値） | `SPEC:109`–`111`, `SPEC:221` |
| **選択中のタスク**（`readSelectedTaskUids`） | **記述が無い（未検証）** | `SPEC` は保存の可否を書かない。`documentSettings` にあるかは `E09` の担当 | `SPEC:116` |
| **`shouldExposeGrSchedulerAgentApi`（有効化フラグ）** | **しない**（**ファイルで運ばない**） | **起動側**が `globalThis` に置く。**ディスク上のファイルは 1 バイトも変わらない** | `SPEC:498`, `SPEC:520` |
| **「AI と一緒に編集する」の状態** | **する**（**文書ごとに記憶する**） | ⚠️ 置き場所を `SPEC` は書かない（**未検証**）。`E09-settings-blob.md:318` が「文書の識別子と対にして環境側へ置く」とする | `SPEC:641` |
| **ファイルハンドル** | **する**（環境側） | IndexedDB。**リロードをまたいで残る**（実測） | `SPEC:583`, `SPEC:593` |
| **自動保存** | **する**（環境側） | `localStorage` の鍵 **`grsched.autosave.<documentId>`** | `SPEC:621` |
| **Undo / Redo の履歴** | **記述が無い（未検証）** | `SPEC` は保存の可否を書かない | `SPEC:401` |
| **`revisionStamp` の MSPDI 往復** | **しない**（往復の対象外） | — | `SPEC:229` |
| **`changeLog` の MSPDI 往復** | **記述が無い（未検証）** | `SPEC:229` は §2-1（`revisionStamp`）の下にあり、`changeLog` には同じ記述が無い | `SPEC:229`（不在の指摘） |

---

## 4. `Agent API` の関数 —— 全数 **メンバ 17（うち関数 15・読み出し専用プロパティ 2）**

**自分で数えた**（`SPEC:107`–`143` の `interface GrSchedulerAgentApi` を 1 行ずつ）:
読む 4 ＋ 書く 2 ＋ 履歴 2 ＋ 出す 4 ＋ 見せる 2 ＋ 待つ 1 = **関数 15**。プロパティ 2。**合計 17**。

| # | 群 | メンバ | 引数 | 戻り値 | `@purity` | 品詞 | 出典 |
|:--:|---|---|---|---|---|---|---|
| 1 | — | `agentApiVersion` | — | `readonly string`（semver） | `semi-pure-a` | 名詞 | `SPEC:109`, `SPEC:165` |
| 2 | — | `schemaVersion` | — | `readonly string`（**既存の `schemaVersion` と同じ値**） | `semi-pure-a` | 名詞 | `SPEC:111`, `SPEC:165` |
| 3 | 読む | `readDocument` | なし | `GrSchedulerDocument`（**不変コピー**） | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:114`, `SPEC:166` |
| 4 | 読む | `readRevision` | なし | `number` | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:115`, `SPEC:166` |
| 5 | 読む | `readSelectedTaskUids` | なし | `number[]` | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:116`, `SPEC:166` |
| 6 | 読む | `readViewState` | なし | `ViewState`（**本書に定義なし**） | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:117`, `SPEC:145` |
| 7 | 書く | `applyCommands` | `request: ApplyRequest` | `ApplyOutcome` | **`non-pure`** | 動詞＋目的語 | `SPEC:120`, `SPEC:168` |
| 8 | 書く | `loadDocument` | `request: LoadRequest`（**本書に定義なし**） | `ApplyOutcome` | **`non-pure`** | 動詞＋目的語 | `SPEC:121`, `SPEC:145` |
| 9 | 履歴 | `undo` | `steps?: number`（省略＝**1 段**） | `ApplyOutcome` | **`non-pure`** | 動詞（目的語なし） | `SPEC:125`, `SPEC:322` |
| 10 | 履歴 | `redo` | `steps?: number` | `ApplyOutcome` | **`non-pure`** | 動詞（目的語なし） | `SPEC:126`, `SPEC:322` |
| 11 | 出す | `exportJson` | なし | `string` | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:129`, `SPEC:167` |
| 12 | 出す | `exportMspdi` | なし | `string` | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:130`, `SPEC:167` |
| 13 | 出す | `exportSvg` | なし | `string` | **`semi-pure-b`** | 動詞＋目的語 | `SPEC:131`, `SPEC:167` |
| 14 | 出す | `exportPng` | なし | **`Promise<Blob>`**（**失敗の返し方が無い**） | **`semi-pure-b`**（ラスタ化は Adapter 側） | 動詞＋目的語 | `SPEC:132`, `SPEC:167` |
| 15 | 見せる | `setViewState` | `request: ViewStateRequest`（**本書に定義なし**。`ViewState` の**部分更新**・範囲外はクランプ） | `ApplyOutcome` | **`non-pure`** | 動詞＋目的語 | `SPEC:135`, `SPEC:152` |
| 16 | 見せる | `focusTask` | `taskUid: number` | `ApplyOutcome` | **`non-pure`** | 動詞＋目的語 | `SPEC:136`, `SPEC:168` |
| 17 | 待つ | `watchChanges` | `request: WatchRequest` | **`StopWatching` = `() => void`** | **`non-pure`** | 動詞＋目的語 | `SPEC:139`, `SPEC:142` |

**関数まわりの規約**:

| # | 規約 | 出典 |
|:--:|---|---|
| FN-1 | **命名の品詞は純粋性で決まる。** 関数は動詞＋目的語（レビュー観点規約 **R2.1**・MUST）。**`readDocument()` を `document()` に改めてはならない** | `SPEC:160`, `SPEC:172` |
| FN-2 | **実装では各関数に `@purity` タグを付す**（**R7.6**・MUST・**付与率 100%**） | `SPEC:161` |
| FN-3 | **副作用が無いことと、呼んで安価であることは別。** `read*` を名詞にすると**遅さと失敗しうることが名前から消える** | `SPEC:166`, `SPEC:170` |
| FN-4 | **`undo` / `redo` はコマンドにしない。** 履歴操作をコマンドに混ぜると、**原子的な一括適用（`A-5`）の巻き戻し対象に履歴操作が入る** | `SPEC:173`–`175` |
| FN-5 | 読みを **2 つに分ける**（`readDocument` / `readRevision`）。**版だけ欲しい場合が多い**ため | `SPEC:114`–`115` |
| FN-6 | **`ViewState` を新しく設計してはならない。** 設定値の正は `grs-document-settings-ja.md` §4-2 の 1 か所であり、別の形を作ると**二重管理になる** | `SPEC:155`–`156` |

**本書に定義が無い型**:

| 型 | `SPEC` の自己申告 | 実際 | 中身の所在 |
|---|---|---|---|
| `ViewState` | **「定義が無い」と明記**（`SPEC:145`） | 定義なし | `grs-document-settings-ja.md` §4-2 が**全項目と既定値と範囲を持つ**（`SPEC:151`） |
| `ViewStateRequest` | 同上 | 定義なし | 同上（`ViewState` の部分更新・クランプ）（`SPEC:152`） |
| `LoadRequest` | 同上 | 定義なし | `grs-native-erd-ja.md` §5.4（文書 ＋ **取込マージの 3 択**）（`SPEC:153`） |
| `GrSchedulerDocument` | **申告に含まれていない** | **定義なし**（`SPEC:114`, `SPEC:310`, `SPEC:455` が使う） | `grs-native-erd-ja.md`（`SPEC:181`「既存の構造は変えない」） |
| `GrSchedulerCommand` | **申告に含まれていない** | **TS の定義なし**（`SPEC:296` が使う。実体は §3-1 の jsonc 12 例だけ） | `SPEC:344`–`370` |

> ⚠️ **`SPEC:145` は「定義が無いのは 3 型」と書くが、自分で数えると 5 型**である。
> 残る 2 つは**所在が明らか**（`GrSchedulerDocument` はデータ構造の正、`GrSchedulerCommand` は §3-1）なので
> 「行き場が無い 3 型」という主張自体は成立するが、**実装前に埋める型は 5 つ**として数えること。

---

## 5. 書き込みの契約（§3）

### 5-1. `ApplyRequest` / `ApplyOutcome`

| 型 | 鍵 | 型 | 必須 | 意味 | 出典 |
|---|---|---|:--:|---|---|
| `ApplyRequest` | `baseRevision` | `number` | 任意 | **呼ぶ側が読んだ版。食い違えば拒否される。** 人間の UI 操作では省略してよい | `SPEC:292` |
| `ApplyRequest` | `editedBy` | `'human' \| 'agent'` | 任意 | 誰の変更か。**既定は `'agent'`** | `SPEC:294` |
| `ApplyRequest` | `commands` | `GrSchedulerCommand[]` | **必須** | **原子的に適用する。1 つでも拒否されたら全部戻す** | `SPEC:296` |
| `ApplyRequest` | `changeExplanation` | `string` | 任意 | 同じ往復で「なぜ変えたか」も残す。**`changeLog` へ 1 件積まれる** | `SPEC:297` |
| `ApplyOutcome` | `accepted` | `boolean` | **必須** | 受理したか | `SPEC:302` |
| `ApplyOutcome` | `revision` | `number` | **必須** | **適用後（拒否時は現在）の版。呼ぶ側はこれを次の `sinceRevision` に使う** | `SPEC:303`–`304` |
| `ApplyOutcome` | `rejectionReason` | `RejectionReason` | 任意 | `accepted === true` のときは無い | `SPEC:305`–`306` |
| `ApplyOutcome` | `expectedRevision` | `number` | 任意 | **`stale-base-revision` のときだけ**、GRS が期待した版 | `SPEC:307`–`308` |
| `ApplyOutcome` | `document` | `GrSchedulerDocument` | **必須** | **常に現在の文書（不変コピー）。拒否時も返す** —— 読み直しの往復を省くため | `SPEC:309`–`310` |

> **拒否のときも文書を返すのが要点である。** トライアルでは**拒否 6 回のすべてで、返ってきた文書をそのまま使って再送できた**（`SPEC:337`–`338`）。

### 5-2. 拒否理由 —— 全数 **7**

**自分で数えた**（`SPEC:327`–`334` のユニオン）。

| # | 値 | いつ | 出典 |
|:--:|---|---|---|
| 1 | `stale-base-revision` | `baseRevision` が現在と違う | `SPEC:328` |
| 2 | `unknown-command` | 知らない `commandName` | `SPEC:329` |
| 3 | `invalid-argument` | 引数の型・値域。**`null` 不可の列へ `null` を送った場合もここ** | `SPEC:330`, `SPEC:384` |
| 4 | `validation-rejected` | 取込検証で弾いた（`user-order.md` 62） | `SPEC:331` |
| 5 | `document-locked` | 読取専用／権限（`user-order.md` 65-2） | `SPEC:332` |
| 6 | `gesture-in-progress` | **人間がドラッグ中** | `SPEC:333` |
| 7 | `nothing-to-undo` | `undo` / `redo` で動かせる段が無い | `SPEC:334` |

> **`SPEC:385` が「新しい拒否理由は足さない」と明記している。** 部分更新の `null` 違反も既存の `invalid-argument` に載せる。

### 5-3. コマンド —— 全数 **12**

**自分で数えた**（`grep -c '"commandName"'` = 12。`SPEC:345,348,351,353,354,356,358,359,361,363,365,368`）。

| # | `commandName` | 触るもの | サンプルに現れた引数 | 出典 |
|:--:|---|---|---|---|
| 1 | `create-task` | `Task` | `wbsParentUid` / `wbsOrder` / `name` / `start` / `finish` / `milestone` | `SPEC:345`–`346` |
| 2 | `update-task` | `Task` | `taskUid` / `start` / `finish` | `SPEC:348`–`349` |
| 3 | `delete-task` | `Task` | `taskUid` | `SPEC:351` |
| 4 | `assign-task-to-group` | `TaskGroupMember` | `taskUid` / `groupId` / **`stackOrder`** | `SPEC:353` |
| 5 | `remove-task-from-group` | `TaskGroupMember` | `taskUid` / `groupId` | `SPEC:354` |
| 6 | `create-task-group` | `TaskGroup` | `groupId` / `parentId` / `derivedFromTaskUid` / `order` | `SPEC:356`–`357` |
| 7 | `update-task-group` | `TaskGroup` | `groupId` / `label` / `collapsed` | `SPEC:358` |
| 8 | `delete-task-group` | `TaskGroup` | `groupId` | `SPEC:359` |
| 9 | `create-dependency` | `Dependency` | `predecessorUid` / `successorUid` / `linkType` / `lag` / `lagFormat` | `SPEC:361`–`362` |
| 10 | `delete-dependency` | `Dependency` | `predecessorUid` / `successorUid` | `SPEC:363` |
| 11 | `update-task-visual` | `TaskVisual` | `taskUid` / `shapeKind` / `fillColor` | `SPEC:365`–`366` |
| 12 | `update-document-settings` | `documentSettings` | **`changedSettings`**（オブジェクト） | `SPEC:368`–`369` |

**コマンドの規約**:

| # | 規約 | 出典 |
|:--:|---|---|
| CM-1 | 判別は **`commandName`**（`type` のような無意味な語を使わない）。値は **kebab-case の文字列判別値** | `SPEC:342`, `SPEC:374` |
| CM-2 | **引数のプロパティ名は `grs-native-erd-ja.md` の属性名と語幹を一致させる。新語を作らない** | `SPEC:375` |
| CM-3 | **`update-*` は部分更新である（確定 2026-08-06）**: **キーが無い → その列を触らない／キーがあり `null` → その列に `null` を代入（＝既定へ戻す）／キーがあり値 → その値を代入** | `SPEC:376`–`382` |
| CM-4 | **`null` を受け付けない列に `null` を送ったら `invalid-argument` で拒否**。要求 `A-9`（例外を投げず値で返す）の範囲内 | `SPEC:384`–`385` |
| CM-5 | **専用の `clear-*` コマンドや `reset: [...]` 配列は作らない** —— 同じことを表す道が 2 つになり（`user-order.md` 66「1 概念 1 語」）、列が増えるたびに増殖する | `SPEC:389`–`390` |
| CM-6 | JSON Merge Patch の既知の落とし穴（`null` を入れる／キーを消す が区別できない）は、**GRS のコマンドにキー削除という操作が無い**ので起きない | `SPEC:391`–`392` |
| CM-7 | ⚠️ **一覧はこれで確定ではない。** 実開発で UI の操作割当（`ui-detail-spec-ja.md` §5）と **1 対 1** に整える | `SPEC:393`–`394` |

> **CM-3 の規則は既に実例が使っている**（`SPEC:386`–`387`）——
> `update-task` は `start` / `finish` だけを送り（＝書かなかった列は触らない）、
> `assign-task-to-group` は `"stackOrder": null` を明示的に送っている（＝`null` は値である）。**名前が無かっただけである。**

### 5-4. 適用の順序 —— **7 段**（自分で数えた。`SPEC:398`–`404`）

| 段 | 何をするか | 出典 |
|:--:|---|---|
| 1 | `baseRevision` を照合。違えば **`stale-base-revision`** で**全部**拒否 | `SPEC:398` |
| 2 | 現在の文書のスナップショットを取る | `SPEC:399` |
| 3 | コマンドを順に検証・適用。**1 つでも失敗したらスナップショットへ戻して拒否** | `SPEC:400` |
| 4 | 全部通ったら Undo 履歴へ **1 段**として積む | `SPEC:401` |
| 5 | **`revision` を 1 増やし、`lastEditedBy` と `updatedAt` を書く** | `SPEC:402` |
| 6 | `changeExplanation` があれば `changeLog` へ 1 件足す（**同じ `revision` に紐づけて**） | `SPEC:403` |
| 7 | 監視中の購読者へ通知する | `SPEC:404` |

> **段 6 が同じ `revision` に入るのは意図である**（`SPEC:406`）。
> トライアルでは会話を別の書き込みにしていたため **`revision` 104 のうち 42 が会話**だった。**GRS では 1 変更 1 版になる**（`SPEC:407`–`408`）。

### 5-5. `undo` / `redo` は `revision` を巻き戻さない（**確定 2026-08-04**）

| # | 規則 | 理由 | 出典 |
|:--:|---|---|---|
| U-1 | **`revision` は単調増加する。`undo` も `redo` も新しい版を 1 つ進める**（戻した結果もまた 1 つの版である） | 監視の条件は `revision > sinceRevision` なので、**巻き戻せる設計にすると `undo` の後に相手の監視が二度と起きない**。**取り消したことは相手に伝わらなければならない** | `SPEC:316`–`320` |
| U-2 | `steps` を省略したら **1 段** | — | `SPEC:322` |
| U-3 | **履歴の端を越える指定は端で止め、進んだぶんだけ適用する**（エラーにしない） | — | `SPEC:322` |
| U-4 | **戻す段が 1 つも無いときは `accepted: false` ＋ `nothing-to-undo`。`revision` は動かさない** | — | `SPEC:323` |
| U-5 | `changeLog` には**取り消した事実を 1 件足す（消さない）。履歴は減らない** | — | `SPEC:324` |

### 5-6. **版数を上げるのは何か**

| 出来事 | `revision` | 出典 |
|---|:--:|---|
| `applyCommands` が受理された | **+1** | `SPEC:402` |
| `applyCommands` が拒否された | 動かない（`ApplyOutcome.revision` は**現在の版**） | `SPEC:303`–`304` |
| `undo` / `redo` が成功した | **+1**（**前へ進む**） | `SPEC:316` |
| `undo` / `redo` で動かせる段が無い | 動かない | `SPEC:323` |
| **人間がチャット欄に書いた** | **動かない**（会話は保存しないため。**`watchChanges` も起きない**） | `SPEC:469`–`470` |
| `setViewState` / `focusTask` / `loadDocument` | ⚠️ **記述が無い（未検証）** —— 3 つとも `ApplyOutcome` を返すが、§3-2 の 7 段は `applyCommands` の説明であり、これらを含むと書いていない | `SPEC:135`–`136`, `SPEC:121`, `SPEC:396`（不在の指摘） |

> ⚠️ **`SPEC:214` は「あらゆる確定で 1 増える」と書く。** 素直に読めば `setViewState` も版を上げるが、
> **`setViewState` は `documentSettings`（保存される値）を変えるので Undo 1 段も積むはずである**——
> **そう書いた記述は本書に無い（未検証）。** → §11 O-3。

---

## 6. 監視の契約（§4）

### 6-1. `WatchRequest` と 1 往復

| 鍵 | 型 | 必須 | 意味 | 出典 |
|---|---|:--:|---|---|
| `sinceRevision` | `number` | **必須** | **これ以下の版では絶対に呼ばない** | `SPEC:452` |
| `self` | `'human' \| 'agent'` | 任意 | **自分の変更で起きないようにする。既定は `'agent'`** | `SPEC:454` |
| `onChange` | `(outcome: { revision: number; document: GrSchedulerDocument }) => void` | **必須** | 起床時に呼ばれる | `SPEC:455` |
| （戻り値） | **`StopWatching` = `() => void`** | — | **監視を止める手段**。`SPEC:139`, `SPEC:142` | `SPEC:139`, `SPEC:142` |

**起こす条件**（`A-10` / `A-11`）: **`revision > sinceRevision` かつ `lastEditedBy !== self`**（`SPEC:462`）。

**1 往復の全体像**（`SPEC:416`–`438` の sequence 図が言っていることは 3 つ・`SPEC:440`）:

| # | 言っていること | 出典 |
|:--:|---|---|
| W-1 | **AI を動かすのは push ではなく「止まって待つ呼び出し」**である（`A-10`）。**状態を繰り返し見に行かない** | `SPEC:423`, `SPEC:442` |
| W-2 | **版ずれの分岐は珍しくない。** トライアルでは 1 セッションで **6 回**通った（`A-3`） | `SPEC:443` |
| W-3 | **呼び出しは 3 回で 1 往復**（起床 → 読む → 書く＋喋る）。`applyCommands` が新しい `revision` を返すので、**待機を張り直すために読み直さない**（`A-18`） | `SPEC:444`–`445` |
| W-4 | 版ずれで拒否されたら、**返ってきた文書で判断からやり直す。同じコマンドを機械的に再送しない** | `SPEC:436` |

**監視の禁止事項**:

| # | 禁止 | 理由 | 出典 |
|:--:|---|---|---|
| W-5 | **`sinceRevision` を省略可能にしてはならない** | 省略できると**処理済みの状態で即座に起きて、監視を張り直すたびに空振りする**。**トライアルで実際にビジーループを踏み、必須化して直した** | `SPEC:465`–`467` |
| W-6 | **チャット欄は監視の対象ではない** | 保存しないので `revision` が進まない。**この監視が受け持つのは「相手が文書を変えた」だけ**。人間の言葉は同じページの中で AI へ直接届く | `SPEC:469`–`473` |
| W-7 | **プロセス外（将来の CLI／サーバ）でも意味は同じ** | 「`sinceRevision` より後に、自分以外が確定するまで返らない」呼び出しを 1 つ用意する | `SPEC:475`–`476` |

---

## 7. 起動時の投入（§5）

### 7-1. 単一 `.html` への埋め込み —— 規約 **7 件**（自分で数えた。`SPEC:494`–`500`）

**ビルド成果物の `.html` は、空の入れ口を最初から持つ**（`SPEC:487`）:
`<script type="application/json" id="embedded-document">null</script>`

| # | 規約 | 理由 | 出典 |
|:--:|---|---|---|
| 1 | 入れ口は**ちょうど 1 つ**。複数あれば**起動を中止して通知する** | 曖昧さを残さない | `SPEC:494` |
| 2 | **文字列中の `<` を JSON の Unicode エスケープ（バックスラッシュ ＋ `u003c`）へ置き換える** | **対照実験で確認済み。** 省くと `</script>` がタグを早期に閉じ、**JSON は解析不能になり、残りが HTML として本文に出る** | `SPEC:495` |
| 3 | 解析に失敗したら**無視して空で起動し、通知する**（黙って捨てない） | `security-design.md` §5 と同じ姿勢 | `SPEC:496` |
| 4 | 埋め込まれた文書も**信頼できない入力として検証する** | **埋め込み経路は検証の抜け道にしない** | `SPEC:497` |
| 5 | **入れ口が運ぶのは文書だけ。API の有効化を入れ口にも文書にも書かない** | **権限をファイルで運ばない。** 転送された先では非公開のまま開く | `SPEC:498` |
| 6 | **原本（ビルド成果物）は読み取り専用として扱う。** 出力先が原本と同じパスになりうる規則を作らない | **原本が壊れるとツールそのものが失われる。** 複製は何度でも作り直せるが原本は 1 つ | `SPEC:499` |
| 7 | **入れ口の既定値は `null`。初期テンプレートを入れ口に入れない** | **入れ口が空かどうかが「誰かが意図して文書を入れた」の唯一の判定材料**であり、起動順序の 4 分岐がこれに乗っている | `SPEC:500` |

> ⚠️ **規約 7 を「似たものが 2 つあるから」と統合してはならない**（`SPEC:502`–`506`）。
> 初期テンプレートを入れ口に常駐させると、**普通に開くたびに「埋込文書あり」の状態**になる。
> 表示されるのは別の `documentId` のサンプルなので、**利用者の自動保存が「別の文書のもの」と判定されて確認が出ず、未保存の作業がサンプルに追い越される ＝ クラッシュ復旧が壊れる。**
> **初期テンプレートはアプリのコード側に持つ**（`NEXT-STEPS-ja.md` 2-6 の管轄）。

> ⚠️ **規約 2 はセキュリティ対策である**（`SPEC:509`–`512`）。**埋め込みは実質 HTML のテンプレート処理なので、エスケープを怠れば注入が成立する。**
> **タスク名に markup を仕込んだ文書を渡されると、生成した `.html` に混入する。**「壊れるから」ではなく「**注入されるから**」エスケープする。

### 7-2. 有効化（§5-1-1）—— **経路 2・規約 5**

| 誰が起動したか | 有効化のしかた | 出典 |
|---|---|---|
| **エージェント**（`OpenSchedulerWithEmbeddedDocument`） | ブラウザを動かしている側が、**ページの起動前に** `globalThis.shouldExposeGrSchedulerAgentApi = true` を置く。**ディスク上のファイルは 1 バイトも変わらない** | `SPEC:520` |
| **人間**（`InviteAgentToPage`） | 画面で「AI と一緒に編集する」を有効にする | `SPEC:521` |

| # | 規約 | 理由 | 出典 |
|:--:|---|---|---|
| 1 | **公開点は起動の最後に一度だけ置き、以後差し替えない** | 待ち受ける側は「名前が現れるまで待つ」だけでよい | `SPEC:527` |
| 2 | **準備完了のイベントを別に設けない** | **真実が 2 つになる。** 名前の有無が唯一の信号である | `SPEC:528` |
| 3 | 有効でないときは**到達できる場所のどこにも置かない**（モジュール内に留める） | 外から名前で辿れないことを確認済み | `SPEC:529` |
| 4 | **無効化は「以後、名前で探す者」だけを止める。渡し済みの参照は取り戻せない** | **取り消せることを安全性の根拠にしない。UI の文言でもそう伝える** | `SPEC:530` |
| 5 | **URL のクエリを既定の有効化手段にしない** | `file://` でも届くことは確認したが、**ダブルクリックで開く経路では付けられない** | `SPEC:531` |

### 7-3. 埋込文書つき GRS のファイル名（§5-1-2）—— 規則 **4**

| # | 規則 | 理由 | 出典 |
|:--:|---|---|---|
| 1 | **ファイル名は ASCII のみ**（`a-z` `0-9` `-`）。他の文字は `-` に置換し、連続する `-` を 1 つに畳み、前後の `-` を落とす | **非 ASCII のファイル名はバグの元**（ユーザー判断）。`A-17` の危険も**構造的に消える** | `SPEC:540` |
| 2 | **`<文書名の ASCII 部分>-<documentId 先頭 8 文字>.html`**。ASCII 部分が残らなければ `schedule-<8 文字>.html` | 人が Explorer で分かることと、機械が決定的に特定できることの両立 | `SPEC:541` |
| 3 | **同じ文書を作り直せば同じ名前 → 上書き。別の文書は必ず別名** | **中を開いて判定する必要が無い。** 連番は使わない | `SPEC:542` |
| 4 | slug 部分は **40 文字**で切る | Windows のパス長 | `SPEC:543` |

> **`name` などの文書の中身は多言語のまま。ASCII 制限はファイル名だけに掛かる**（`SPEC:545`）。
> **埋込文書つき GRS は運び手であって保存先ではない。** 保存先は文書ファイルである（`SPEC:547`）。

### 7-4. URL パラメータ（§5-2）—— `http(s)` のときだけ・規約 **3**

| # | 規約 | 出典 |
|:--:|---|---|
| 1 | **`file://` では機能しない（実測）。** パラメータは読めるが**取得が拒否される**（`fetch` は `TypeError: Failed to fetch`、`XMLHttpRequest` は network error）。**UI で理由を通知する** | `SPEC:558` |
| 2 | **同一オリジンの相対パスのみ**。スキーム付き・`//` 始まり・上位ディレクトリへの脱出は拒否 | `SPEC:559` |
| 3 | 取得したものは §5-1 の規約 4 と**同じ検証**を通す | `SPEC:560` |

### 7-5. 保存の往復（§5-4）—— **`file://` でも成立する（Edge 151 で実測）**

| 挙動 | 実測 | 出典 |
|---|---|---|
| ハンドルを取り、書き込む | **成功** | `SPEC:581` |
| **同じハンドルへの 2 回目以降の書き込み** | **成功。ダイアログは出ない** | `SPEC:582` |
| ハンドルをリロードまたぎで保持（IndexedDB） | **残る** | `SPEC:583` |
| リロード直後の権限 | **`prompt` に戻る。1 クリックで `granted`** | `SPEC:584` |
| 開いた既存ファイルへの書き戻し | **成功** | `SPEC:585` |
| ディスク上の結果 | **同じパスに上書き。` (1)` は作られない** | `SPEC:586` |

| # | 規約 | 出典 |
|:--:|---|---|
| 1 | 開いたときのハンドルを保持し、保存は**同じハンドルへ上書き**する | `SPEC:592` |
| 2 | ハンドルを保持し、**リロードをまたいで復帰させる** | `SPEC:593` |
| 3 | 起動時に**「編集中のファイルへのアクセスを復帰しますか」を出す**（**1 クリックは省けない**） | `SPEC:594` |
| 4 | ハンドルが無い場合の書き出しは**決定的なファイル名**にする（例: 文書 id ＋ `revision`） | `SPEC:595` |
| 5 | **保存先ディレクトリを指定しようとしない**（制御できない） | `SPEC:596` |
| 6 | **「編集中のファイル」をダウンロードで実現しない**（` (1)` ` (2)` と増える。**同じ「書き出す」でも経路で挙動が正反対**） | `SPEC:597` |

### 7-6. 起動時の投入の優先順位（§5-3）

**表示する文書を選ぶ順序**（`SPEC:604`）:

```
埋込文書 → URL パラメータ → localStorage の自動保存 → 初期テンプレート
```

> **最後の段（初期テンプレート）は、入れ口とは別の出所である。** アプリのコード側が持つ。
> **エージェントが書き込むのは空の入れ口であって、初期テンプレートの場所ではない**（`SPEC:607`–`609`）。

**「負けた自動保存」の 4 分岐**（`SPEC:614`–`619`）:

| 自動保存 と これから表示する文書 | 挙動 | 根拠 | 出典 |
|---|---|---|---|
| **同じ文書・自動保存のほうが新しい** | **確認を出す** —— これが本当のクラッシュ復旧である | `user-order.md` 60 | `SPEC:616` |
| **同じ文書・自動保存が古いか同じ** | **黙って捨てる** —— 既に含まれており失うものが無い | `security-design.md` §5 の禁止は**破損**の規定であって**追い越された**場合の規定ではない | `SPEC:617` |
| **別の文書の自動保存** | **確認を出さない。消しもしない** | 保管庫が全ローカルファイルで共有されるため | `SPEC:618` |
| **壊れている** | **必ず通知し、退避して残す** | `security-design.md` §5 | `SPEC:619` |

**自動保存のキー**: **`grsched.autosave.<documentId>`**（`SPEC:621`）。判定には **決定-3 の `revision` / `updatedAt`** を使う（`SPEC:612`）。

> ⚠️ **`file://` では、すべてのローカルファイルが 1 つの保管庫を共有する**（localStorage も IndexedDB も、別フォルダから読めた）。
> **素の GRS・埋込文書つき GRS・古い複製が同じ鍵を奪い合う。2 窓同時は現実に起きる構成である。**
> **保持すると決めたファイルハンドルも同じく共有される** —— 別の複製を開いたときに**無関係な文書のハンドルを「編集中のファイル」として復帰させない**こと（`SPEC:623`–`627`）。

**起動時に人間へ出す面は 1 枚にまとめる**（`SPEC:635`–`641`。用件 3 件）:

| 用件 | いつ出るか | 出典 |
|---|---|---|
| **編集中のファイルへのアクセスを復帰** | ハンドルが残っているとき。**1 クリックは省けない** | `SPEC:639` |
| **クラッシュ復旧の確認** | 上の 4 分岐で「確認を出す」に該当したとき | `SPEC:640` |
| **AI と一緒に編集する** | **文書ごとに記憶する。** 有効な間は**画面に常時表示**を出す（「断りなく開けない」を表示で満たす） | `SPEC:641` |

> **ブラウザの権限ダイアログはこの 1 枚に統合できない。** クリックを起点にしてしか出せないため、**「復帰」を押した後に**ブラウザのダイアログが出る順になる（`SPEC:643`–`644`）。

---

## 8. 防御と信頼境界（§6）

**API は UI の防御を迂回しない。実装時に次を通ることを確認する**（`SPEC:650`）。**表は 5 行**（自分で数えた。`SPEC:653`–`658`）。

| # | 防御 | 迂回されると何が起きるか | 既存の正 | 出典 |
|:--:|---|---|---|---|
| 1 | 取込データの厳格な検証 | 埋め込み・URL・`loadDocument` が**検証の抜け道**になる | `user-order.md` 62 / `security-design.md` §3 | `SPEC:654` |
| 2 | `innerHTML` 直挿しの禁止 | **`changeLog` の `explanation` と `Task.notes` が注入点になる** | 同 | `SPEC:655` |
| 3 | XXE の無効化 | MSPDI 取込が外部実体を読む | 同 | `SPEC:656` |
| 4 | 透かしのパスワード照合 | 透かしを API で外せる。**生パスワードを保存しない**規約も併せて守る | `user-order.md` 62 | `SPEC:657` |
| 5 | 編集権限（将来） | 参照専用の `TaskGroup` を API で書き換えられる | `user-order.md` 65-2 | `SPEC:658` |

### 8-1. **`Agent API` は信頼境界ではない**（§6-1・`security-design.md` §2 へ 2026-08-04 に追記済み。正はあちら）

| # | 主張 | 出典 |
|:--:|---|---|
| T-1 | **ページ内でスクリプトを実行できる主体は、API の有無に関わらず内部状態へ到達できる。したがって API は攻撃面を増やさない** | `SPEC:665`–`666` |
| T-2 | **それでも API は既定で公開せず、利用者が有効にしたときだけ公開する** —— **断りなく口を開けないため** | `SPEC:667`–`668` |
| T-3 | **防御は入力検証（§3）と CSP（§4）に置く** | `SPEC:668` |
| T-4 | **無効化は以後の名前解決を止めるだけで、渡し済みの参照は取り消せない（実測）** | `SPEC:669` |
| T-5 | **同一ページに第三者のコードが載る配信形態（埋め込み・プラグイン・サーバ配信）を採る場合は本項を再評価する** | `SPEC:670`–`671` |

---

## 9. アーキテクチャに効く決定

| # | 決定 | 理由 | 出典 |
|:--:|---|---|---|
| R-1 | **契約は `GrSchedulerAgentApi`、置き場所は `globalThis.grSchedulerAgentApi`。置き場所を契約の名前にしない** | 同じ契約はライブラリ・CLI・将来のサーバからも呼ばれる。**置き場所を名前に埋め込むと、置き場所が増えた瞬間に名前が嘘になる** | `SPEC:23`, `SPEC:31`–`41` |
| R-2 | **`window` ではなく `globalThis`** | `window` はブラウザのページにしか存在せず、**決定-1（描画は DOM 非依存の純粋関数）と向きが合わない**。`globalThis` はどの実行環境でも同じ 1 名で通る | `SPEC:37`–`39` |
| R-3 | **名前空間（`grScheduler.*`）にしない** | 内部が後から生えて、**公開面が意図せず増える** | `SPEC:42` |
| R-4 | **公開点は既定では存在しない。** 有効化のフラグ名は **`shouldExposeGrSchedulerAgentApi`** | `should` で始めるのは命名規約（`is` / `has` / `can` / `should`） | `SPEC:27`–`28` |
| R-5 | **`agentApiVersion` は semver。呼ぶ側は最初にこれを読み、major が違えば呼ばない** | — | `SPEC:108`–`109` |
| R-6 | **PNG のラスタ化は Adapter 側に置く**（純粋な描画層に入れない） | `export*` を `semi-pure-b` に保つ | `SPEC:167` |
| R-7 | **ユースケースは 1 つ、経路が 3 つ**: `InviteAgentToPage`（主）／`OpenSchedulerWithEmbeddedDocument`（代替 1）／`ExchangeDocumentFile`（代替 2） | — | `SPEC:53`–`56` |
| R-8 | **将来のサーバの窓口は §1 の関数と 1 対 1 にし、名前を変えない**（対応表 **5 行**: `readDocument`/`readRevision` → 文書の取得、`applyCommands` → 変更の適用、`loadDocument` → 文書の差し替え、`watchChanges` → 変更の待受、`export*` → 各形式の書き出し） | **変えた瞬間、対応表を維持する仕事が発生し、やがてずれる** | `SPEC:677`–`687` |
| R-9 | **多人数編集は `A-3` の基準版の照合と `A-10` の revision スコープ監視がそのまま土台になる。2 者で成立した規約を人数だけ増やす形** | — | `SPEC:689`–`690` |
| R-10 | **API は信頼境界ではない**（→ §8-1） | — | `SPEC:665` |
| R-11 | **入れ口が運ぶのは文書だけ。権限をファイルで運ばない** | 転送された先では非公開のまま開く | `SPEC:498` |
| R-12 | **原本（ビルド成果物）は読み取り専用**。**埋込文書つき GRS は運び手であって保存先ではない** | 原本が壊れるとツールそのものが失われる | `SPEC:499`, `SPEC:547` |
| R-13 | **同時更新の語彙を確定**: `ConcurrentUpdate`（同時更新）／**`BaseRevisionCheck`（基準版の照合。現行の方針）**／`AutomaticReconciliation`（自動調停。**延期中**）／`ImportMerge`（取込マージ。**取込専用**） | 既存の識別子と語幹が一致する（`baseRevision` / `stale-base-revision` / `expectedRevision`） | `SPEC:81`–`89` |

---

## 10. 廃棄・撤回された決定（**生きている決定と混ぜないこと**）

| # | 廃棄されたもの | 置き換え | 出典 |
|:--:|---|---|---|
| K-1 | **公開点 `window.grScheduler`** —— 初稿の記述。**「これは誤りだった」と明記** | `globalThis.grSchedulerAgentApi` | `SPEC:32` |
| K-2 | 名前空間 `grScheduler.*` | 単一の公開点 | `SPEC:42` |
| K-3 | 機構の名前としての**「注入」** | **「埋め込み」**（`security-design.md` A03 と同語になり、**守る対象と自分の機能が同じ名前になる**ため） | `SPEC:68`–`70` |
| K-4 | **「共同編集」**（`user-order.md` 65-1 の多人数編集＝サーバ前提の語として空ける）／**「往復」**（`user-order.md` 56 の MSPDI 往復無損失に取られている） | 別語を使う | `SPEC:74`–`75` |
| K-5 | **`Conflict` / `Collision` / `Resolution` / 裸の `Merge` / 裸の `Lock`**（**5 語**・自分で数えた） | `ConcurrentUpdate` / `BaseRevisionCheck` ほか | `SPEC:92`–`93` |
| K-6 | **「楽観ロック（optimistic locking）」の名** | `BaseRevisionCheck`。①**何もロックしていない** ②「楽観」は稀という見込みを指すが**実測では 1 セッションに 6 回発火した** | `SPEC:86`–`89` |
| K-7 | **`undo` / `redo` をコマンドにする案** | 別の関数。**原子的な一括適用の巻き戻し対象に履歴操作が入る**ため | `SPEC:173`–`175` |
| K-8 | **`revision` を巻き戻す設計**（確定 2026-08-04 で却下） | **単調増加**。巻き戻すと**`undo` の後に相手の監視が二度と起きない** | `SPEC:314`–`320` |
| K-9 | **専用の `clear-*` コマンド／`reset: [...]` 配列** | `update-*` の部分更新（キーがあり `null`＝既定へ戻す） | `SPEC:389`–`390` |
| K-10 | **初期テンプレートを入れ口に常駐させる案** | アプリのコード側に持つ。入れ口の既定は `null`。**統合するとクラッシュ復旧が壊れる** | `SPEC:500`–`507` |
| K-11 | **準備完了のイベントを別に設ける案** | 名前の有無が唯一の信号。**真実が 2 つになる** | `SPEC:528` |
| K-12 | **URL のクエリを既定の有効化手段にする案** | 起動側のフラグ／画面での有効化。**ダブルクリックで開く経路ではクエリを付けられない** | `SPEC:531` |
| K-13 | **連番（` (1)` ` (2)`）のファイル名** | **決定的な名前で上書き**。連番は「最新がどれか分からなくなる」ことを実測 | `SPEC:542` |
| K-14 | **「編集中のファイル」をダウンロードで実現する案** | File System Access API のハンドル保持 | `SPEC:597` |
| K-15 | **保存先ディレクトリを指定する案** | 指定しない（制御できない） | `SPEC:596` |
| K-16 | **`agentApiVersion` を保存 JSON に入れる案** | 入れない。**入れると版が上がるたびに全ファイルの diff が出る** | `SPEC:221`–`222` |
| K-17 | **会話を丸ごと保存する案** | `changeLog`（理由だけ）。**価値の薄いものが日程表に同梱され、プライバシーの懸念だけが残る**ため | `SPEC:255`–`258` |

> ⚠️ **`AutomaticReconciliation`（自動調停）は廃棄ではなく「延期中」である**（`SPEC:83`）。生きている選択肢として §11 O-6 に置く。

---

## 11. 未決のまま残っている件

| # | 未決の内容 | 出典 |
|:--:|---|---|
| O-1 | **型の定義が無い。** `SPEC:145` は 3 型（`ViewState` / `ViewStateRequest` / `LoadRequest`）と申告するが、**自分で数えると 5 型**（＋ `GrSchedulerDocument` / `GrSchedulerCommand`）。**次期は実装前に埋めること**と明記されている | `SPEC:145`–`156`, `SPEC:114`, `SPEC:296` |
| O-2 | **`exportPng()` の失敗の返し方が無い。** 戻り値は `Promise<Blob>` のみ。仕様書 `AG-8` は「失敗を値で受け取れること」を要求する | `SPEC:132`（記述の不在） |
| O-3 | **`setViewState` / `focusTask` / `loadDocument` が `revision` を上げるか・Undo 1 段を積むかが書かれていない。** 3 つとも `ApplyOutcome` を返すのに、§3-2 の 7 段は `applyCommands` の説明である | `SPEC:121`, `SPEC:135`–`136`, `SPEC:396`（記述の不在） |
| O-4 | **拒否の値に「どの命令が落ちたか」を示す鍵が無い。** `ApplyOutcome` は `rejectionReason` / `expectedRevision` までで、配列の添字も `commandName` も返さない（仕様書 `AG-9a` は「拒否された対象」を MUST とする） | `SPEC:301`–`311`（記述の不在） |
| O-5 | **コマンドの一覧は確定ではない。** 実開発で UI の操作割当（`ui-detail-spec-ja.md` §5）と **1 対 1** に整える作業が残る | `SPEC:393`–`394` |
| O-6 | **同時更新の方針が未決**（基準版の照合のみ／`AutomaticReconciliation`）。**語彙だけが決定-6 で確定**している | `SPEC:83`, `SPEC:691` |
| O-7 | **`documentId` の型・生成規則・MSPDI での扱いが未決。** `SPEC` 自身が「**提案の域を出ない**」「**この文書の側から正へ書き足さない**」と書き、`NEXT-STEPS-ja.md` 4-2 と change-manager に送っている | `SPEC:279`–`284`, `SPEC:629`–`631` |
| O-8 | **`revisionStamp` の初期値が無い**（新規文書の `revision` は `0` か `1` か、`lastEditedBy` / `updatedAt` は何か）。`SPEC` に記述が無い | `SPEC:210`–`230`（記述の不在） |
| O-9 | **注記（`Comment` / `HighlightBox`）のルート鍵名が無い。** `SPEC` は 1 度も触れず、実物 `DOC` のルート 16 鍵にも**無い**。`E08-comment-highlight.md:213`（C-2）と同じ穴が残っている | `DOC:1`–`96`／`SPEC:179`–`284`（いずれも不在） |
| O-10 | **`changeLog` を MSPDI へ書き出すかが未規定。** `SPEC:229` の「書き出さない」は §2-1（`revisionStamp`）の下にあり、§2-2 に同じ規定が無い | `SPEC:229`, `SPEC:232`–`264`（記述の不在） |
| O-11 | ⚠️ **`SPEC:244` の表の行が壊れている。** `changeLog` の `editedBy` の値域を書く行が、区切り記号をエスケープせずに `"human"` と `"agent"` を並べているため、**4 列の表に 5 セルが入る**。`SPEC:215`（`revisionStamp.lastEditedBy`）は同じ値域をエスケープして正しく書いている。**機械で読むと `editedBy` の型が壊れる** | `SPEC:244` ↔ `SPEC:215` |
| O-12 | **`changeLog` の 1 件あたりの長さ・保持期間・UI での表示場所が未規定。** 件数が有界であることだけが書かれている | `SPEC:260`（範囲外） |
| O-13 | **`lag` の単位が決着していない。** `SPEC:362` は `"lag": 0` のみで、`E03-dependency-taskgroup.md:147` の C-1（1/10 分 ↔ 稼働日）の**どちらの側でも `0`** になる | `SPEC:362`／`DOC:78` ↔ `E03-dependency-taskgroup.md:147` |
| O-14 | **「AI と一緒に編集する」を文書ごとに記憶する、その置き場所が本書に無い。** `E09-settings-blob.md:318` は「文書の識別子と対にして環境側へ置く」とするが、その識別子（`documentId`）が未着地（→ O-7） | `SPEC:641`（記述の不在） |
| O-15 | **`readSelectedTaskUids` が返す選択が保存されるかが本書に無い** | `SPEC:116`（記述の不在） |
| O-16 | ⚠️ **節の並びが崩れている**（`### 5-4.` が `### 5-3.` より前）。**内容ではなく文書の欠陥**だが、節番号で参照する他文書の指示が外れる | `SPEC:562` ↔ `SPEC:599` |

---

## 在庫表との食い違い

### A. 在庫表 17 枚と食い違う／裏を取ったもの

| # | 何が食い違うか | 出典の側（file:line ＋ 引用） | 在庫表の側（file:line ＋ 引用） | どちらが正か |
|:--:|---|---|---|---|
| **X-1** | **`changeExplanation`（要求側）と `explanation`（保存側）の対応づけ** | `agent-interface-spec-ja.md:297`「同じ往復で『なぜ変えたか』も残す（A-18 粒度）。**changeLog へ 1 件積まれる**」／同 `:403`「`changeExplanation` があれば `changeLog` へ 1 件足す（**同じ `revision` に紐づけて**）」 | `A02-agent-api-requirements.md:242`（O-6）「**`changeExplanation`（要求側）と `explanation`（`changeLog` 側）で名前が違う。対応づけを書いた記述が無い**」 | **出典の側が正。A02 の O-6 は解消する。** 対応づけは §3 と §3-2 段 6 に明記されている。A02 は `agent-interface-spec-ja.md` を未読と宣言しており（`A02-agent-api-requirements.md:18`）、その宣言どおりの穴である |
| **X-2** | **`watchChanges` の引数・戻り値・解除の手段** | `agent-interface-spec-ja.md:139` `watchChanges(request: WatchRequest): StopWatching;`／`:142` `type StopWatching = () => void;`／`:450`–`456` が `WatchRequest`（`sinceRevision` 必須 / `self?` / `onChange`）を定義 | `A02-agent-api-requirements.md:240`（O-4）「**`watchChanges` の引数・返り値・解除の手段が未規定。監視を止める方法が 3 文書に無い**」／同 `:32`（F-4）「返す形＝**未規定**」 | **出典の側が正。A02 の O-4 は解消する。** 解除は戻り値の `StopWatching` である |
| **X-3** | **命令（`commandName`）の全数** | `agent-interface-spec-ja.md:344`–`370` に **12 種**（自分で数えた） | `A02-agent-api-requirements.md:47`「**3 文書に現れる `commandName` は 2 種だけである**」／同 `:243`（O-7）「命令の全一覧が本担当の 3 文書に無い」 | **出典の側が正（12 種）。A02 の O-7 は解消する。** ただし `agent-interface-spec-ja.md:393` が「**一覧はこれで確定ではない**」と留保しており、UI の操作割当と 1 対 1 に整える作業が残る（→ §11 O-5） |
| **X-4** | **`taskGroupMembers` が結合表として実在するか・綴り** | `grs-document-with-revision-stamp.json:85`–`88` `"taskGroupMembers": [ { "groupId": "grp-a", "taskUid": 3, "stackOrder": null }, … ]`（**3 列・lowerCamelCase**） | `E03-dependency-taskgroup.md:94`–`96` が **`group_id` / `task_uid` / `stack_order`** の 3 列を載せ、3 列とも「⚠️ **要改名** `groupId` / `taskUid` / `stackOrder`」と判定する／`E11-identity-and-notstored.md:75` は PK を「**宣言が無い**（`task_uid` UNIQUE のみ）」とする | **食い違いではなく裏付け。** 在庫が「要改名」と判定した綴りを**実物が既に使っている**。改名先が 2 系統から独立に出ている点で強い。**PK が宣言されていない点は依然として未決**（実物の 2 行は `groupId` が同じで `taskUid` が異なるだけなので、`task_uid` UNIQUE と矛盾しない） |
| **X-5** | ⚠️ **サマリタスク自身を器の member に入れるか** | `grs-document-with-revision-stamp.json:82` の器は `derivedFromTaskUid: 1`（＝子を持つタスク 1 から生成）／`:85`–`88` の member は **`taskUid` = 3 と 4 だけで、`taskUid` = 1 が無い** | `E03-dependency-taskgroup.md:80`（G-1）「**器の生成規則**: ①子を持つタスク S → 器を作り S 直下の葉を member に入れる（**S 自身も member**）」（`grs-native-erd-ja.md:942-950`） | **在庫表（＝データ構造の正）が正**と考えられる。**サンプルは G-1 を満たしていない。** `agent-interface-spec-ja.md:181` は「既存の構造は変えない」と宣言しているので、意図的な変更ではなく**手書きサンプルの取りこぼし**と読むのが自然である。⚠️ **ただしそう書いた記述はどちらにも無い（未検証）。** 次期はサンプルを写経する前に G-1 で検算すること |
| **X-6** | **`schemaVersion` の置き場所** | `grs-document-with-revision-stamp.json:2` が**根の直下**に `"schemaVersion": "grs-1"`。`project` オブジェクト（`:20`–`30`・9 鍵）に `schemaVersion` は**無い**／`agent-interface-spec-ja.md:187` の jsonc も根の直下 | `E11-identity-and-notstored.md:102` は **`Project` の列**として `schema_version` を載せる／`E04-project.md:47` も `Project` の列として載せ、同 `:160`（U-5）で「**ERD は `Project` の列、JSON 実例は JSON 最上位** … **未決**」とする／`E09-settings-blob.md:40` は**根の直下**とする | **根の直下が正**（実物 2 件 ＋ `E09` ＋ `E04-project.md:160` 自身の「最上位に置くほうが『文書を読む前に版を判別する』（`FR-073`）という順序に合う」）。**`E11-identity-and-notstored.md:102` と `E04-project.md:47` の `Project.schema_version` 行は、置き場所を根へ移す修正が要る。** U-5 は本サンプルで決着してよい |
| **X-7** | **`Project.statusDate` の綴り** | `grs-document-with-revision-stamp.json:24` `"statusDate": "2026-07-26T00:00:00"` | `E04-project.md:162`（U-7）「**`status_date` だけは例外として snake_case が正**であり、用語辞書が `Project.status_date` と明記している。つまり **JSON 実例の `statusDate` は誤り**」 | **在庫表が正**（用語辞書に裏付けがある）。ただし本サンプルは `E04` が見た JSON 実例（`data-model-entry-ja.md`）とは**別の 2 件目の実例**であり、**実装側の実例が 2 件とも `statusDate`** である事実は決着時に効く。⚠️ **どちらへ倒すかを決めた記述は無い（未検証）** |
| **X-8** | **`linkType` / `link_type`** | `grs-document-with-revision-stamp.json:78` `"linkType": 1`／`agent-interface-spec-ja.md:362` の `create-dependency` も **`linkType`** | `A02-agent-api-requirements.md:265`（X-4）「**在庫の側（`link_type`）が正**（仕様書 1.9 `W-8` と表 T-018 に裏付け）」／`E03-dependency-taskgroup.md:132`「**仕様書 1.9 の `W-8` が snake_case を許す 3 語の 1 つとして明示**」 | **A02 の判定（`link_type` が正）を覆さない。** ただし本担当で**入口が揃って camelCase** であることが確定した（文書の列 `:78`／命令の引数 `agent-interface-spec-ja.md:362`）。`agent-interface-spec-ja.md:375` は「**引数のプロパティ名は ERD の属性名と語幹を一致させる**」と定めているので、**`link_type` を採るなら命令の引数も `link_type` にしないと入口ごとに綴りが変わる** |
| **X-9** | ⚠️ **段（`stackOrder`）を人が指定できるか** | `agent-interface-spec-ja.md:353` `{ "commandName": "assign-task-to-group", "taskUid": 3, "groupId": "grp-a", "stackOrder": null }` ——**`stackOrder` が命令の引数として存在する**。しかも同 `:387` は「`assign-task-to-group` は `"stackOrder": null` を**明示的に**送っている（＝`null` は値である）」と述べ、**値を送る道があることを規約として確認している** | `E03-dependency-taskgroup.md:96`（C-7）「⚠️ **仕様書 `ST-6` が『積み順は自動割当のみとし、人が段を手で指定する手段を設けない（MUST NOT）』と定めたため、列そのものの要否が原典と食い違う**」／`A05-user-order.md:362`（S-1）が同じ衝突を挙げる／`A08-poc-results.md:456`（C-6）も段の持ち主を論じる | **仕様書（`ST-6`）が現行の正**。したがって **`Agent API` の側にも段を手で指定する口が空いている**ことになり、**`ST-6` と両立しない**。決着は 2 択 —— ① `assign-task-to-group` から `stackOrder` を落とす（列は残し自動割当専用にする）② 列そのものを落とす。⚠️ **どちらを採るかを決めた記述はどこにも無い（未検証）** |
| **X-10** | **`FR-063`（版数・最後に書いた者・時刻）の受け皿** | `agent-interface-spec-ja.md:210`–`230` が **3 列の表 ＋ 保存の可否 ＋ `documentSettings` 禁止 ＋ MSPDI 非出力**まで書く／実物 `grs-document-with-revision-stamp.json:4`–`8` | `E04-project.md:117`「→ **`FR-063` は現状どこにも着地していない。** 新設が要る（→ U-4・U-7）」／同 `:125`「どこに置くか（原典の記述）… **未定**」／同 `:169`（V-1）「**新設が要るが、名前も置き場所も決まっていない**」 | **出典の側が正**（`A02-agent-api-requirements.md:262` の X-1 と同じ結論に、本担当が独立に到達した）。**`E04-project.md:117` / `:125` / `:169` は撤回が要る。** 原因は `E04` の「読んだ原典」表に `10-agent-interface/` のファイルが 1 つも無いことである |
| **X-11** | ⚠️ **`setViewState` が版数を上げるか（`FR-063` の適用範囲）** | `agent-interface-spec-ja.md:135` `setViewState(request: ViewStateRequest): ApplyOutcome;`／`:151` が `ViewState` を「**ズーム 2 つ・スクロール位置・テーマ・パネル幅・表示トグル**」と定義。**版数を上げるかは書かれていない**（§3-2 の 7 段は `applyCommands` の説明である） | `E04-project.md:125`「**文書に保存される値を変える更新すべて**で上がる（**ズーム・スクロール・パン・パネル幅・表 T-202 の表示切り替えも含む**。上がらないのは**選択・構えの変更・フォーカス移動**と表 T-206 の値だけ）」（`FR-063`） | **在庫表の側が正であり、出典の側の沈黙を埋める。** `ViewState` の項目は `FR-063` が「上げる」と名指しした項目とほぼ一致するので、**`setViewState` は `revision` を +1 し、Undo 1 段も積むはずである**。逆に **`focusTask`（フォーカス移動）は上げない**。⚠️ **導出であって、そう書いた記述はどちらにも無い（未検証）** |
| **X-12** | ⚠️ **導出される帰結: 人間がスクロールしただけでエージェントが起きる** | `agent-interface-spec-ja.md:462` 起床条件「`revision > sinceRevision` かつ `lastEditedBy !== self`」 | `E04-project.md:125`（`FR-063`）が**ズーム・スクロール・パンで版数が上がる**と定める | **2 つの規則を並べると、人間が画面をスクロールするたびに `watchChanges` が起きる**。`agent-interface-spec-ja.md:472` は「**この監視が受け持つのは『相手が文書を変えた』だけ**」と述べており、**意図と帰結がずれる**。⚠️ **これは 2 文書からの導出であり、どちらもこの帰結を論じていない（未検証）。設計で決着が要る** —— 起床条件に「何が変わったか」の区分を足すか、`FR-063` の適用範囲を狭めるか |
| **X-13** | **防御の件数（4 か 5 か）** | `agent-interface-spec-ja.md:653`–`658` は **5 行**（取込データの厳格な検証／`innerHTML` 直挿しの禁止／XXE の無効化／透かしのパスワード照合／編集権限（将来）） | `A02-agent-api-requirements.md:198`（R-4）「迂回してはならないものは **4 件**（自分で数えた）」——`innerHTML` と XXE を 1 件にまとめている | **食い違いではなく数え方の差。** 中身は同一である。**次期は 5 行の表（`agent-interface-spec-ja.md:652`–`658`）を使うこと**（防御ごとに 1 行のほうが実装時のチェックリストになる） |
| **X-14** | **`Task` の 19 列が 1 つの行に同居する** | `grs-document-with-revision-stamp.json:36`–`75` の `tasks[]` は 3 行とも **19 鍵**で、予定（`E01`）・実績（`E02`）・fade（`E07`）が**同じ行**に載る | `E01-task-plan.md:35`–`36` が `fadeInDays` / `fadeOutDays` を `Task` の列とする／`E07-visual-origin.md:107`「フェードは `TaskVisual` に**無い**」／`E02-task-actual.md:34`「拡張領域を使うのは fade の 2 枠だけで、**これは実績側ではない**」 | **食い違いではなく裏付け。** 在庫が 3 枚に分けて記述した列が、実物では 1 つの `tasks[]` 行に同居することが確認できた。**次期は `E01` ＋ `E02` ＋ fade 2 列の和が `tasks[]` の列であると読むこと** |
| **X-15** | **`documentId` の受け皿** | `agent-interface-spec-ja.md:266`–`284` が 1 節を割き、`:621` が `grsched.autosave.<documentId>` を確定させる。**ただし `:279` 自身が「これは提案の域を出ない」「この文書の側から正へ書き足さない」と書く** | `A07-security-a11y.md:39`（D-4）「⚠️ **`documentId` の受け皿はデータモデルに無い**（在庫 11 枚を機械検索して 0 件）」／同 `:187`（O-18）「**2 つの機能が同じ識別子を要求している**のに、在庫表 11 枚に相当する列は **0 件**」 | **食い違いではない。両側とも「まだ無い」で一致する。** `A07` の O-18 は生きている。**実物のルート 16 鍵にも `documentId` は無い**（→ 末節 Y-1）。着地先は `NEXT-STEPS-ja.md` 4-2 |
| **X-16** | **注記（`Comment` / `HighlightBox`）のルート鍵名** | `agent-interface-spec-ja.md` は注記に **1 度も触れない**／実物のルート 16 鍵にも `comments` / `highlightBoxes` は**無い** | `E08-comment-highlight.md:213`（C-2）「JSON のコレクション名（`comments` / `highlightBoxes` 等）も**どこにも無い**」／`E11-identity-and-notstored.md:84`–`85` はエンティティ **13 / 14** として `Comment` / `HighlightBox` を載せる | **食い違いではない。C-2 は依然として未決である。** ただし**本サンプルが 3 件目の「無い」証拠**になった。⚠️ **注記は保存されるのにルートの入れ物が無いのは穴である**（非 export なので MSPDI 側にも逃げ場が無い）。→ §11 O-9 |

### B. 在庫表の外で見つかった食い違い（担当 2 文書の内部）

| # | 何が食い違うか | 片側 | もう片側 | どちらが正か |
|:--:|---|---|---|---|
| **Y-1** | ⚠️ **`documentId` がルートにあるか** | `agent-interface-spec-ja.md:187` の jsonc がルート直下に `"documentId": "0f2c9a1e-6b74-4f0d-9a2b-1c8f5e37d410"` を書く | `grs-document-with-revision-stamp.json` のルート **16 鍵に `documentId` は無い**（`json.load` で全走査した） | **サンプルが正。** `agent-interface-spec-ja.md:279`–`282` が自ら「**これは提案の域を出ない**」「**この文書の側から正へ書き足さない**」と書いており、**§2 の jsonc だけが先走っている**。次期がこの jsonc をスキーマとして写すと、**まだ決まっていない列が黙って入る** |
| **Y-2** | **サンプルの参照整合性が取れていない** | `grs-document-with-revision-stamp.json:27` `"calendarId": 1`（`project`）／同 `:46` `"calendarId": 1`（`tasks[0]`） | 同 `:92` `"calendars": []`（**空**） | **サンプルの都合**（空配列で省略した）であって設計の主張ではない。⚠️ **ただしこのサンプルを検証データに使うと FK 検査で落ちる。** 空配列は **6 本**（`taskVisuals` / `taskOrigins` / `calendars` / `resources` / `assignments` / `carryElements`。自分で数えた）ので、**それらの列の形は本サンプルからは読み取れない** |
| **Y-3** | **`_changeLogComment` はスキーマの一部ではない** | `grs-document-with-revision-stamp.json:10` にルート鍵 `_changeLogComment` がある | `agent-interface-spec-ja.md:185`–`207` の jsonc に**この鍵は無い** | **jsonc が正。** `_` 始まりの鍵は**サンプルの注釈**である（`agent-apply-request-and-outcomes.json` の `_comment` / `_what` / `_retry` と同じ流儀）。**次期の実装が書き出してはならない** |
| **Y-4** | **`tasks[]` の鍵の並びが 3 行で揃っていない** | `grs-document-with-revision-stamp.json:43` と `:69` は `actualStart` → `actualDuration` → `actualFinish` | 同 `:55`–`56` は `actualStart` → `actualFinish` → `actualDuration` | **JSON なので意味は無い**が、**「実物を写経する」ときに列順の正が無い**ことは分かる。列順を決めるなら `E01` / `E02` の並びに寄せること |
| **Y-5** | **節の並びが崩れている** | `agent-interface-spec-ja.md:562` に `### 5-4. 保存の往復` | 同 `:599` に `### 5-3. 起動順序` | **並び順の事故。** 内容は欠けていない。⚠️ `agent-interface-spec-ja.md:276` は「自動保存のキー（§5-3）」と節番号で参照しており、**節番号順に読む探索が外れる** |
| **Y-6** | **表の行が壊れている** | `agent-interface-spec-ja.md:244`（`changeLog.editedBy`）は値域の区切りをエスケープせずに書いており、**4 列の表に 5 セルが入る** | 同 `:215`（`revisionStamp.lastEditedBy`）は**同じ値域をエスケープして正しく書いている** | **`:215` の書き方が正。** 機械で表を読むと `editedBy` の型が壊れる。**内容の誤りではなく記法の誤り** |

---

**本書の主張のうち、`agent-interface-spec-ja.md` が「決定-n / 決着-n にそう書いてある」と述べているだけのもの**
（`agent-interface-open-items-ja.md`（572 行）は本担当では未読＝**未検証**）:
決定-1（描画は DOM 非依存の純粋関数）／決定-2（会話と `changeLog` を分ける）／決定-3（`revisionStamp` を保存する・3 キー）／
決定-4（既定で非公開・信頼境界ではない）／決定-5（起動順序）／決定-6（同時更新の語彙）／
決着-1（File System Access API の実測）／決着-2（`file://` の `fetch` 拒否）／決着-3（ダウンロードの連番）／決着-4〜8。
**実測値（拒否 6 回・`revision` 104 のうち 42 が会話・自己訂正 7 回）も同様に転記であって、本担当が確かめたものではない。**
