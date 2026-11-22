# CR-851 —— GRS JSON を β の前に 1 回だけ組み替え、α の文書は変換の HTML で β にする

> 起草の状態: **起草した。当てていない**（2026-10-25、枝 `claude/cr851-json-reshape-8cc2ca`、`develop` の `80927c91d` を取り込んだ上）。⛔ 利用者の指示 `JDG-3274` により、仕様・スキーマ・`src` へは、利用者が本書の変わる行を全部見て良しとした後に当てる。行は `studies/76-grs-json-beta-shape/` の 3 つの表（文書の要素・命令と拒否の理由・仕様の文）にある。
> ID の帯: 調整役から `CR-851`（と同じ形に乗る `CR-848`・`CR-849`）、台帳 `DFC-3579`〜`DFC-3588`、裁定 `JDG-3259`〜`JDG-3268`・`JDG-3274`〜`JDG-3289`・`JDG-3300`〜`JDG-3319`、保留 `PND-956`〜`PND-965`、性能の測り待ち `273`、見本 `76` を受けた。前の席 `answers-ahead` が `JDG-3206`〜`JDG-3209` を使った。拡大縮小の名は拡大縮小の席（`CR-853`）の `JDG-3290`〜`JDG-3297` を当てる。
> 当てるもの: `JDG-3206`〜`JDG-3208`（形を β の前に直す・網羅的に見直す）、`JDG-3226`・`JDG-3227`（検査 90 を 0 にする・5.4 に OKPN/OMPV）、本席の `JDG-3259`〜`JDG-3315`、行のレビューで決めた `JDG-3321`（外とつながる英語は易しい英語だけ）・`JDG-3322`（プロパティの順、`DR-6` と `studies/76-grs-json-beta-shape/property-order.md`）・`JDG-3412`・`JDG-3423`（順の正は SSOT。生成器は並べ替えず、書き出しはスキーマの順に並べ直し、順を検査する —— `JDG-3322` を広げる）、`JDG-3323`・`JDG-3324`（`schemaVersion`・`buildVersion` の説明）、`JDG-3325`・`JDG-3326`（行のレビューのページの段の線・分類の絞り込み・目次）、`JDG-3327`（すべてのプロパティに易しい英語の説明）、`JDG-3328`（外へ出す英語を Haiku・Sonnet・席・利用者の 4 段で確かめる）、`JDG-3329`（MSPDI 由来の説明は「Same as MSPDI X」、ルートに語の定め）、`JDG-3330`（語の定めは利用者の文）、`JDG-3331`（冒頭は短く、決まりは型の説明へ）、`JDG-3332`（変更の記録の 6 つのプロパティ。画面と命令は別の CR）、`JDG-3333`（冒頭は語の定めと文書の形の木。木は生成）、外へ出す英語の文体 `JDG-3346`（it・its を使わない、受け身を避ける、用語集の名だけ）、GRS JSON と Agent API に出る用語 `JDG-3348`・`JDG-3351`〜`JDG-3379`（`studies/76-grs-json-beta-shape/terms/`）、キー名 `JDG-3380`〜`JDG-3384` と Agent API の名 `JDG-3410`、拡大縮小の名 `JDG-3290`〜`JDG-3297`（`JDG-3292` の `dayWidthPx`・`displayScalePercent`、`JDG-3293`・`JDG-3296` の `verticalZoomRatio` と `taskGroupAutoExpandDepth`、`JDG-3294` の目盛の 2 つ（`rulerFontSizePx`・`rulerHeightPx`）を文書から外すこと、`JDG-3295` の `fontSizeStep` の語の値を含む）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`80927c91d`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| GRS JSON の違反は検査 90 の 195 | 検査 90 は `$ref` 越しの `null` を数えていない —— 日時・時刻の型（23）と `ColumnSort`（3）を足すと、`null` を取る文書の要素は 109 | 型そのものも直す（文書の表の `DateTime`・`Time`・`ColumnSort` の行） |
| 日時は「分まで、差は書かない」 | スキーマの `pattern` は帯・小数秒・符号つきの年を通す（文書 1 か所、命令 33 節）。説明と形が食い違う | `JDG-3261`: `YYYY-MM-DDTHH:MM:SS` だけを通す |
| Px は画面の px | 日程の寸法の `…Px` は描くときに `S-236`（0.625）を掛ける。`rulerFontSizePx` の既定 21 は画面で約 13 px。0.625 は `JDG-123`・`JDG-152`・`JDG-169`（`CR-395`・`CR-409`・`CR-417`）が積もった数 | `JDG-3277`: 値に畳み、`S-236` を消す |
| 命令の形が変われば版が上がる | 命令のスキーマに版が無く、`agentApiVersion` の指紋は `agent-api-members.json` だけを見る | `JDG-3301`: 命令も `agentApiVersion` に入れる |
| 外へ出す値に仕様の行 ID は無い | 保存する表の列（`SQ-*`・`DT-*`・`RQ-*`）、状態のフィルタの値（`DG-1` ほか）、拒否の理由（`RS-*`・`IV-*`）、命令ごとの拒否の `rule`（行 ID 66 種）、`command`（`CM-n`）、`target`（`AM-n`） | `JDG-3285`: 変わらない英語の名にする |
| タスクグループ名はタスク名について行く | `task-group-names.ts` が表示のたびに今のタスク名を引く | `JDG-3303`・`JDG-3315`: 名は強いず、ついて行かない |
| MSPDI のタスク名は必須 | `mspdi_pj15.xsd` の Task の `Name` は `minOccurs="0"`、512 字 | 名の無いタスクを許す（`JDG-3315`） |

### 0.2 裁定の鎖（`rulings.md` を「GRS JSON」「null」「台帳」「schemaVersion」「MSPDI の名」「色」「タスクグループ名」で引いた）

- 形を β の前に直すこと・網羅的に見直すことは `JDG-3206`〜`JDG-3208`。範囲は `JDG-3259`（直せる 39 件すべて）。
- `JDG-3207` の「開けない古い文書は利用者の AI に変換させる」は `JDG-3279`・`JDG-3306` が覆した（変換の HTML、`JDG-3307`）。`ORDER_TO_AI.md` の綴りの裁定 `JDG-3264`・`JDG-3266` も同じく覆された。
- `JDG-1677`（台帳は公式運用の宣言から）は `JDG-3262` が覆した（一部）。版の付け方 `JDG-1677`・`JDG-2446`・規則 10 は `JDG-3263` で保つ。
- `JDG-2685`（MSPDI の名を守る鉄則）と `JDG-1193` は `JDG-3280` で保つ。
- 値が無いときの書き方は `JDG-3286`（案 Y）を `JDG-3309`（書かない = 無い、MSPDI と同じ思想）が覆した。状態の語は `JDG-3302` のうち `notDecided`・`theme`・`sameAsScheduleData` が残る。色の `none` は `JDG-3310` が覆した。
- タスクグループ名は `JDG-3303`（ついて行かない）→ `JDG-3313`（名が無い間だけ写す）→ `JDG-3315`（強いない、写すのは MSPDI の取り込みだけ）。
- 任意色のもう一方は `JDG-3075`〜`JDG-3077`・`JDG-3183`（`CR-848` が当てる）。片側だけの入力は `JDG-3077` が読み込むときに導くと決め、`JDG-3309` の下でもそのまま成り立つ。
- 拡大縮小の名は `JDG-3282` で別の席へ出し、調整役の 2026-10-25 の指示で、その席の名（`JDG-3290`〜`JDG-3297`）を本書の行に載せる。振る舞いの行は `CR-853` が持つ。
- 名の辞書のレビュー（`studies/76-grs-json-beta-shape/terms/goodrelax-qa-b2-glossary.md`。2026-11-01 までの名は `13-glossary-gqa.md`）で決まり、本書が当てる名と文: 遅延診断の Agent API の名（`JDG-3473`・`JDG-3476` —— `terminalPushOuts` → `endTaskDelays`、`terminalDelayMinutes` → `endTaskDelayMinutes`、`terminalsReached` → `endTasksReached`、`pushOutMinutes` → `delayContributionMinutes`、`settledPushOuts` → `finishedDelayContributions`、`walls` → `diagnosisBlockers`、`inheritedDelayMinutes` → `dependencyDelayMinutes`、`selfDelayMinutes` → `internalDelayMinutes`）、遅延診断の答えに足す終了見込み `estimatedFinish`（`JDG-3477`。レポートの表の欄は `CR-856`）、スキーマの Concepts に置く遅延診断の EARS の 3 文と、結果を保存しない理由（`JDG-3478`・`JDG-3480`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1`（構造化した日程データを出す）・`GL-004` —— 出す GRS JSON を、初見の AI がその文書とスキーマだけを見て迷わない形にする（`JDG-3279`・`JDG-3280`）。1 億人・何十のツールがつながった後には直せない傷を、β の前に 1 回でまとめて直す（`JDG-3274`）。
- `CH-5`（単一の `.html` で完結）—— 変換も 1 つの HTML で、インストールも通信も要らない（`JDG-3307`）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`OKPN`（One Kind Per Name、07 の R2 の「OKPN/OMPV」。`JDG-3226`・`JDG-3227`）** —— 色の 8 欄が明暗の 2 値を 1 つの字列に詰め、パレットの名と同じ欄に混ぜていた（`"#c0504d/#b2423f"`）。`kind` で種類を言う入れ物に分けた（`JDG-3260`）。タイムゾーンの `" DST"`・表示の倍率とズーム・`zoomY` の 1 未満の働き・書き手の語なども 1 つの名に 2 種の値を持っていた —— 文書の表の `F13`・`F49`・`JDG-3293` の行。
- **`OMPV`（One Meaning Per Value、同。`JDG-3226`・`JDG-3227`）** —— `null` に「テーマに従う」「根」「誰でも」「導く」など欄ごとの意味を持たせていた。値が無いことはプロパティを書かないこと 1 つで言い（`JDG-3309`）、「別の何かに従う」は `kind` の値で言う（`theme`・`sameAsScheduleData`・`notDecided`）。名の値の一致で振る舞いを決める案（同じ名ならタスクグループ名も変える）は OMPV に反するので採らなかった（`JDG-3303`）。
- **Null Trap（07 の R3）** —— 文書とコマンドのスキーマの `null` を 0 にする（検査 90 の基準線 195 と、`$ref` 越しの 26）。
- 07 の R2 の Naming（名は指すものを言う）—— `settingsUpdatedAt` → `documentUpdatedAt`、`derivedFromTaskUid` → `representedTaskUid`、`editPermission` → `editGroup` ほか（文書の表）。
- 07 の R1 の「仕様の重複・競合の排除」と R2 の DRY（同じことを 2 か所で言わない）—— `TaskVisual.shapeKind` の `milestone` は `Task.milestone` と同じ事実を 2 か所に持っていた。`taskShape`・`milestoneShape` に分け、`IV-22` を消す（`JDG-3311`）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 取次（GRS Relay）が自分で断るときも `AV-3` の拒否の形（理由と `message`、`pageUrl` などは名のついた欄）にする | 調整役 2026-10-25「relay refusals take the AV-3 shape」。拒否の形を 1 つにする | 取次の `what` を `message` へ改める |
| X-b | `json-codec.ts` の古い版の読み替え（`withStopInPlaceOfActualDuration`・`withTaskGroupColumnsOfAnOlderVersion`・`withAnnotationLookColumns`・`withSourceFormatOfAnOlderDocument`・`withoutRetiredColumns`）と表 T-297 の 2 行を消す | `JDG-601`・`JDG-1691`（宣言の前の読み替えは残さない）、`JDG-3306`（α は変換の HTML が β にする） | α 以前の形の文書は GRS が読み替えず、断って変換の HTML を案内する |
| X-c | 読み込むときに任意色の欠けた側を導いても、文書を「未保存の編集あり」にしない | `JDG-3077` の問い（推奨は未保存にしない）への答えは導いた値と印を保存することで、編集かどうかは言っていない。開いただけで編集ありにすると、保存の確かめが毎回出る | 導いた側は保存するまでファイルに無い |
| X-d | 文書の表・命令の表を作るときに選んだ名と形（`changeLog` → `changeLogEntries`、`carry` → `passthroughValues`、命令の名 `placeTaskPlanActual`・`changeDependencyLag`・`replaceCalendarRules`、`setTaskParentTask` と `fitScheduleToScreen` を編集の命令へ畳む、ほか） | 本席の名付けの決まり（`JDG-3281`）と各表の理由の欄 | 一覧は `studies/76-grs-json-beta-shape/doc-shape-choices.md` の §3 と `commands-choices.md` の F。行のレビューで覆せる |
| X-e | 変換の HTML の置き場と名を `docs/download/grs-json-alpha-to-beta-converter.html` とする | `JDG-3307`（ダウンロードページに置く）。ダウンロードページは `docs/download/index.html` | — |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 値が無いこと | `null`。意味は欄ごと | プロパティを書かない（文書のどこでも 1 つの意味）。いつも値を持つ欄は必須（`JDG-3309`） |
| 別の何かに従う状態 | `null` | `{"kind":"theme"}`・`{"kind":"sameAsScheduleData"}`・`{"kind":"notDecided"}`（`JDG-3302`） |
| 色の 8 欄 | `"red"`・`"#c0504d/#b2423f"`・`"transparent"`・`null` | `{"kind":"palette","name":"red"}`・`{"kind":"custom","light":{"value","source"},"dark":{…}}`・`{"kind":"theme"}`。書かない = 描かない（箱の塗りはいつも色を持ち、見えなさは透過率 100）（`JDG-3260`・`JDG-3276`・`JDG-3310`） |
| 日時・時刻 | 帯・小数秒を通す | `YYYY-MM-DDTHH:MM:SS`・`HH:MM:SS` だけ（`JDG-3261`） |
| 日付だけの値・丸 1 日の範囲 | 日時の形、`…T23:59:00` | `YYYY-MM-DD`、範囲は `firstDay`/`lastDay`（両端を含む）（`JDG-3275`・所見 09・12・52〜54） |
| `uid` | 整数（範囲なし） | 0〜2147483647（`JDG-3284`） |
| 自由な文字列 | 長さの上限なし | MSPDI の上限（タスク名 512・プロジェクト名 255）、GRS の短い名 512、長い文 65535、Unicode の文字の数（`JDG-3287`） |
| GRS 独自の名 | 歴史の名・略語・行 ID の値 | 名付けの決まり（`JDG-3281`）。MSPDI 由来の欄は MSPDI の名と符号のまま（`JDG-3280`） |
| 大きさの名 | `displayScale`・`zoomX`・`zoomY`・`rulerFontSizePx`・`rulerHeightPx`、`S-236` の隠れた 0.625 | `displayScalePercent`・`dayWidthPx`・`verticalZoomRatio`・`taskGroupAutoExpandDepth`、目盛の 2 つは道具が導く。`…Px` は表示の倍率 100 のときの CSS px（`JDG-3277`・`JDG-3290`〜`JDG-3297`） |
| タスクの形 | `shapeKind` の 5 値（`milestone` を含む） | `taskShape`（マイルストーンでないタスク）・`milestoneShape`（マイルストーン）（`JDG-3311`） |
| タスク名・タスクグループ名 | グループ名は必須、タスク名について行く | どちらも強いない。グループ名に写すのは MSPDI の取り込みだけ。全消しの後の最初のグループは `Untitled`（`JDG-3303`・`JDG-3315`） |
| 命令 | 93 の命令、`null` で空に戻す、版なし | 43（名つき 34 ＋ 実体ごとの `edit…` 9）。`set` と `clear`（プロパティを消す）。`agentApiVersion` に入る（`JDG-3267`・`JDG-3268`・`JDG-3301`） |
| 外へ出す値 | 仕様の行 ID が混ざる | 変わらない英語の名（`JDG-3285`）。人向けの `fix-log.tsv`・レポートの `.md` は画面の言語のまま、外の契約に数えない（`JDG-3288`） |
| 造りの版 | どこにも載らない | GRS JSON・単一 `.html`・PNG・SVG・Agent API の刻印に載せる（`JDG-3300`） |
| 変更の台帳 | 公式運用の前は空 | `CR-851` から行を書く。GRS は公式運用の前は読まない（`JDG-3262`） |
| α の文書 | 形が合わなければ断る | 断るお知らせが変換の HTML のダウンロードの所を案内する（`JDG-3306`・`JDG-3307`） |
| MSPDI の集合の外の値 | 決まっていない | 日程に効く値は取り込みを拒み、ほかは素通し（`JDG-3289`） |
| 箱の塗りの既定 | ハイライトボックスは `transparent`、色を選ぶと透過率 50（`S-370`・`S-371`）、コメントボックスは透過率 0 | ハイライトボックスはテーマの色で透過率 100、コメントボックスはテーマの色で透過率 0。透過率 100 の箱で色を選ぶと 50（`JDG-3304`） |
| タスクの輪郭の太さの既定 | 1 × 0.625（画面で 0.625 px） | 1（表示の倍率 100 で 1 px）（`JDG-3308`） |
| フェードの MSPDI の列の見出し | `fadeInDays`・`fadeOutDays` | `fadeInCalendarDays`・`fadeOutCalendarDays`（`EX-6` のまま、`JDG-3312`） |
| 書くファイルの BOM | `CN-5` はすべて BOM なし、`fix-log.tsv` は BOM 付き（食い違い） | `CN-5` に `fix-log.tsv` を名指しの例外として書く（`JDG-3305`） |

---

## 2. 新しい識別子

- 仕様の行 ID: 行のレビューの後に配る（`studies/76-grs-json-beta-shape/` の表の行は、今の行 ID を名指し、新しい行は「足す」と書く）。
- 拒否の理由の名 66（`studies/76-grs-json-beta-shape/refusal-reasons-map.tsv`）。
- 台帳の行 `DFC-3579`（本書）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

文書の要素で消すもの: `CommentBox.leaderShapeKind`、`documentSettings.rulerFontSizePx`・`rulerHeightPx`（道具が導く）。設定の行で消すもの: 表 T-206 の `S-236`。命令で退くもの: 72 の名（`commands-map.md` の 4 節。代わりの名つき）。仕様の行で消すもの: `IV-22`・`IV-8`（タスクグループ名の必須）・表 T-297 の 2 行（X-b）。行の全数は 3 つの表にある。

---

## 4. 書き直す所 —— 行のレビューの表

| 表 | 何を並べるか | 行 |
|---|---|---|
| `studies/76-grs-json-beta-shape/doc-shape-map.md`（正は `.tsv`） | GRS JSON の文書の要素ごとに、今 ／ 新 ／ 例 ／ 変わり方 ／ 理由 ／ 画面の変化 | 300 |
| `studies/76-grs-json-beta-shape/commands-map.md`（正は 2 つの `.tsv`） | 命令ごとの新しい形と `set`/`clear` の欄、退く名、拒否の理由の名、拒否の形 | 命令 112・理由 94 |
| `studies/76-grs-json-beta-shape/spec-rows-map.md`（正は `.tsv`） | 仕様の文（要求・不変条件・設定の行・原稿の説明）の今 ／ 新 ／ 理由 | （起草中） |

⭐ 利用者は行ごとに OK とコメントを付けられるレビューのページで全行を見る（`JDG-3318`）。席はコメントを 1 つずつ下書きへ当て、変えた行を出し直し、すべての行が OK になってから当てる。

⭐ 利用者が 3 つの表を良しとした後に、原稿（`erd.json`・`erd.schema.json`・`settings.json`・`document-commands.json`・`agent-api-members.json`・`notice-reasons.json`・`grs-json-changes.json`）と要求の文へ当て、`npm run gen` で生成物を書き、`src` を当てる。

### 4.1 変換の HTML（`JDG-3306`・`JDG-3307`）

- 置き場: `docs/download/grs-json-alpha-to-beta-converter.html`（1 つの HTML で完結。ダブルクリックで開き、α の `.json` を落とすと β の `.json` を保存する。通信しない）。ダウンロードページ `docs/download/index.html` に入口を足す。
- 写し替えの規則は 3 つの表の「今 → 新」の列そのものと、拡大縮小の席の写し（`dayWidthPx = 3.75 × zoomX` ほか）。片側だけの任意色は決めた側だけを `"source":"chosen"` で書く（`JDG-3265`）。タスクの輪郭の太さは 0.625 倍して丸める（最小 1、`JDG-3278`）。
- 断るお知らせ（`FR-073`）は、α の文書（形式の版が β より古く、形が合わない）を断るときにこの HTML の所を案内する。

---

## 5. 継ぎ目（コード）と試験

- 継ぎ目は 3 つ: 文書の読み書き（`json-codec.ts`・生成する検証 `grs-json-schema.ts`・型 `generate_entity_types.py`）、命令（`edit-document/` と翻訳 `input-command-translator`・`field-commit.ts`・`mcp-tool-translator`）、MSPDI の写し（`mspdi-codec.ts`）。
- 新しい試験は、仕様だけを読む別のサブエージェントが書く。前提が崩れる既存の試験（`null` を書く文書・旧い命令の名・旧いプロパティ）は、別のサブエージェントが前提だけを直す。
- 毎フレームの経路（色の解き方・大きさの畳み）に触れるので `perf-pending` の `273`。

---

## 6. グラフ（`impact.py`）

行のレビューの後に測る（当てる行が決まってから）。

---

## 7. 数（予測 → 実測）

- 文書の要素: 今 260 → 新 297（足す 40、消す 3）。`null` を取る要素 109 → 0（検査 90 の基準線 195 → 0 と、`$ref` 越しの 26）。
- 命令: 93 → 43。拒否の理由に使う行 ID → 0。
- 測り方: `python -I studies/76-grs-json-beta-shape/check_tables.py`（表が今の要素と命令をちょうど 1 度ずつ覆う）、`python .claude/skills/spec-graph-check/check-data-element-kinds.py`。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-3259`〜`JDG-3268`・`JDG-3274`〜`JDG-3289`・`JDG-3300`〜`JDG-3315` を足し、`JDG-1677`・`JDG-3207`・`JDG-3260`・`JDG-3278`・`JDG-3286`・`JDG-3302`・`JDG-3303`・`JDG-3313` を「覆された」へ |
| `rulings.md`（名の辞書の席、2026-11-05） | `JDG-3527`・`JDG-3528`・`JDG-3529`・`JDG-3540`・`JDG-3541`・`JDG-3542`・`JDG-3543`・`JDG-3544`・`JDG-3545`・`JDG-3546` を足した（GRS JSON の名と順。本書の行のレビューの前に当てる）。`JDG-3260`・`JDG-3322` を「覆された（一部）」へ |
| `rulings.md`（名の辞書の席、2026-11-08） | `JDG-3547`（線の先は `fallback` を持たない。`DFC-3620` もこの決まりで直る）・`JDG-3548`・`JDG-3550`〜`JDG-3554`（GRS JSON の名）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-11） | `JDG-3556`（ボードの提案 A〜E を採る。タスクの見た目は `taskStyles[]`）・`JDG-3557`（MSPDI から来た実体は `uid`、GRS だけの実体は `id`。Project も `uid`）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-11〜17） | `JDG-3563`・`JDG-3564`（判別子は `type`、`kind` は使わない。`uid` は 1〜2^31−1）・`JDG-3565`（GRS 固有の実体は `id` のまま、ランダムな UUID 版 4）・`JDG-3569`（プロジェクトの 23 語）・`JDG-3602`（根の並び、`remarks`・`rootTreeState`）・`JDG-3604`（`predecessorLinks`・`PredecessorLink`）・`JDG-3605`（MSPDI の群の実体には往復する値だけ。Project の GRS だけの値 7 つを移す）・`JDG-3606`（`passthrough` 1 つに MSPDI の構造のまま、`ordinal` を持たない）・`JDG-3607`（`fill`・`stroke` の型）・`JDG-3608`（テーマの色の役割は置き場が決める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-17 の 2） | `JDG-3609`（GRS JSON の命名の決まり N-1〜N-12 と例外の決まり）・`JDG-3610`（`ShapeStyle` を 3 つの見た目で共にする）・`JDG-3611`（JSON から `ordinal` を無くす方向）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-17 の 3） | `JDG-3612`（コメントボックスの文字の見た目は `style.font { color, sizePx }`）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-17 の 4） | `JDG-3613`（持ち越した一覧の要素は一覧ごとの配列 `passthroughTasks` など、位置は `precedingTaskUid` など）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-17 の 5） | `JDG-3614`（タスクに付く GRS の値はタスクの中の `grs`）・`JDG-3615`（`task.grs.taskGroupId`）・`JDG-3616`（命名の決まり N-13〜N-17 と X-2 の明記）・`JDG-3617`（個々の名 10 個を仮に採る）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-18 の 1） | `JDG-3618`（5 つの値を `scheduleData` の直下に置く）・`JDG-3619`（タイムゾーンは 3 か所とも `utcOffsetMinutes`）・`JDG-3620`（表の見せ方の型を 2 つに）・`JDG-3621`（`displayScaleRatio`）・`JDG-3622`（命名と順の決まりの足し 7 つ）・`JDG-3623`（仮の名を確定、`scrollPosition.type` は `fixed`・`automatic`）・`JDG-3624`（`representedTaskUid`）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-18 の 2） | `JDG-3625`（`schemaVersionUtc`・`buildVersionUtc`）・`JDG-3626`（`changedBy` は `{ type, name }`）・`JDG-3627`（`mspdiImportCount`）・`JDG-3628`（MSPDI の `Type` を写す 3 つは `type`）・`JDG-3629`（リンクの欄は 3 つとも MSPDI の名）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-19 の 1） | `JDG-3630`（`isScheduleFilterApplied`）・`JDG-3631`（`zoneNameType`）・`JDG-3632`（積む向きの値 `bottomToTop`・`topToBottom`）・`JDG-3633`（`sourceFormat` の値 `mspdi12`・`mspdi15`）・`JDG-3634`（決まりの足し 6 つ）・`JDG-3635`（`delayDiagnosticsToleranceWorkingDays`・`taskGroupRootTreeState`）・`JDG-3636`（`isCalculatedFromOppositeColor`）・`JDG-3637`（外の AI のレビューをやめる線）・`JDG-3638`（命名の決まりの優先の順と N-2 の書き直し）・`JDG-3639`（`representativeTaskUid`）・`JDG-3640`（`highestIssuedUid` のまま）・`JDG-3641`（`importOrigin`）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-19 の 2） | `JDG-3642`（`changedBy.writerType`）・`JDG-3643`（許す略に `dx`・`dy`・`min`・`max`・`hex`）・`JDG-3644`（タイムゾーンの差は ISO 8601 の `utcOffset`）・`JDG-3645`（`zoneNameType` は追加の時計だけ、読むときの形の検査）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-20 の 1） | `JDG-3646`（`delayDiagnosticsSettings.toleranceWorkingDays`）・`JDG-3647`（`snapPart` の値 `planBar`・`actualBar`・`milestoneMark`）・`JDG-3648`（`importedTopTaskOutlineLevel`）・`JDG-3649`（`lastSeenMspdiImportCount`）・`JDG-3650`（決まりの足し 4 つ）・`JDG-3651`（帯の木の見え方を 1 つの物に）・`JDG-3652`（決まりは仕様書の JSON だけ、値の書き方はスキーマの各プロパティだけ）・`JDG-3653`（`expandedUntilZoomOut`）・`JDG-3654`（`automaticallyExpandedWithinDepth`）・`JDG-3655`（`isCollapsedIntoParent`）・`JDG-3656`（`childrenExpansionState`。BGQA3 の問 6-12-12〜6-12-14 で形と名を問い直し中）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-20 の 2） | `JDG-3657`（帯の表示状態 `visible`・`invisible` は導く結果で、GRS JSON に保存しない。GRS JSON は帯自身の意図 3 つ（画面に出せ・画面から消せ・自動で決めろ）を持つ。キーと値の名は BGQA3T の問 6-12-28〜6-12-30 で問い中。`JDG-3653`・`JDG-3654`・`JDG-3656` は後で取り下げる見込み）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-20 の 3） | `JDG-3658`（帯のボタン ∧（`IC-59`）の名: 英語の札 Retract、日本語の札「親へしまう」、出来事 `retractPressed`（今の `hidePressed`）。∨・∨∨・∧∧ の名と説明の文は BGQA3T の 6 回目で問い中）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 1） | `JDG-3659`（帯の 4 つのボタンの英語の札: ∨ Expand One Level・∨∨ Expand Below・∧∧ Collapse Below・∧ Retract Into Parent。`JDG-3658` の ∧ の英語の札 Retract を Retract Into Parent に改める。日本語の札「親へしまう」と出来事 `retractPressed` は変わらない。頭のボタンの札、∨・∨∨・∧∧ の日本語の札・説明の文・出来事の名は未決）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 2） | `JDG-3660`（タスクグループの木の用語: 根 ＝ 深さ 0（タスクグループではなく、行として描かず、値・Retract・ピンを持たない。根を最上位・top level と呼ばない）・深さ（根が 0、根の直下が 1）・最上位 ＝ 深さ 1（根を指さない）・最上位のタスクグループ・親・子・配下（帯自身を含まない）・祖先（根を含む）。MSPDI では根 ＝ 要約タスクの位置（OutlineLevel 0）、深さ N ＝ OutlineLevel N。使わない: 段・level・Lv0・Lv1・深さの意味の WBS。「最上位」だけで書いてよい。名の辞書の下書き `glossary.json` の `scheduleConcepts` に 8 語を足した）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 3） | `JDG-3661`（∧ ボタン（英語の札 Retract Into Parent）の出来事の名は `retractIntoParentPressed`（今のコードの名は `hidePressed`）。`JDG-3658` の出来事の名 `retractPressed` を改める。理由: 出来事の名は「英語の札を camelCase にして Pressed を付ける」規則に従う。同じ規則で他の 3 つは `expandOneLevelPressed`・`expandBelowPressed`・`collapseBelowPressed` になる（規則に従うもので、個別には裁定していない））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 4） | `JDG-3662`（タスクグループの表示の意図の鍵は `selfShowMode`、値は `shown` / `hidden` / `automatic`。`shown` ＝ 人が出すと選んだ、`hidden` ＝ 人が出さないと選んだ（配下も隠れる）、`automatic` ＝ 規則に任せる。`taskGroupTreeView.automaticDepth`（整数、縦のズームで変わる、範囲と既定値は未決）。導かれる結果（GRS JSON に持たない）は `taskGroupVisibility`（`visible` / `invisible`）。却下: collapsed/expanded（習わしは子の状態の語、α の `treeState` と逆の意味になる）・revealed/retracted・always/never・show/hide・dependsOnZoom・鍵の名 displaySetting / disclosureState / presentingState / visibility\*。`JDG-3653`・`JDG-3654`・`JDG-3656` の値と BGQA3T の 6-12-30 の推奨を改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 5） | `JDG-3663`（`selfShowMode` に 4 つ目の値 `hiddenUntilZoomIn` を足す。今は隠れ、次の縦のズームインで `automatic` に溶け、ズームアウトでは隠れたまま。`JDG-3662` の 3 つの値を 4 つに改める。書く側: ∧∧ Collapse Below は配下に `hiddenUntilZoomIn`、∧ Retract Into Parent は帯自身と配下に `hidden`、∨・∨∨ は `shown`。∧∧ はすでに `hidden` の帯に触れない。`hidden` はズームでは出ず、親の ∨・祖先の ∨∨・ジャンプで再び見える。今なにが隠れているかの今の仕組みで足り、新しい目印は足さない。出ている側の一時的な値（`temporarilyExpanded`、`JDG-3653` の `expandedUntilZoomOut`）は持たず、∨∨ は `shown` を書き、のぞき見は ∧∧ で終える。`JDG-3653`、`JDG-590` の ∨∨ のズームアウトで閉じる部分、`JDG-967` の新しい帯が一時的に開く部分を改める（正式な取り下げは後で）。未決: 縦のズームインの出来事の定義と名・全体表示・帯に入る動作・頭のボタンの名・根・ピン）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 6） | `JDG-3664`（根は常に表示され、表示の値を持たない。`levelZeroTreeState`（S-418）・`setLevelZeroTreeState`（CM-86）・表 T-328 の根のセルを適用のときに除く。`JDG-3651` と `JDG-969` の根の部分を改める。頭のボタンは根に押した帯のボタンで、根が子に書くときだけ成り立つ。[+]（HF-14、根では HF-17）は根でも帯でも同じ: 新しい組は `shown`、兄弟には触れない、位置は末子。HF-17 と HF-14 が兄弟を出す部分は改まり、根の ∧∧ のあとの [+] は新しい組だけを描き、残りは今の隠れている数の目印が示す）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 7） | `JDG-3665`（`JDG-3662` の深さの鍵を `automaticDepth` から `automaticallyShownDepth` に改める（`taskGroupTreeView` の中）。`selfShowMode` が `automatic` の帯をこの深さまで含めて出す閉じた範囲 [1, N]、判定は 深さ <= `automaticallyShownDepth`（±1 なし）。理由: `automaticDepth` は NEIM でなく、NDD のレビュー基準（境界とインデックス）は半開が既定・閉じた範囲は名で示す・±1 を持たない、を求め、「Shown」が閉じた境を示す。数は人が見る段の数で MSPDI の OutlineLevel（`JDG-3660`）と合う。却下: `automaticallyHiddenDepth`（hidden は否定型に近く認知が難しい、2 を設定すると 1 段しか見えない）、今の `CR-853` の「N まで開き N+1 を出す」読み（+1 のずれ）。BGQA3T と下書きの問い Q2 を決める（答え a）。範囲と既定値は未決。`JDG-3662` の鍵の名だけを改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 8） | `JDG-3666`（`taskGroupTreeView.automaticallyShownDepth`（`JDG-3665`）の範囲は 1 から `maxGroupDepth`（S-125、今は 5）まで両端を含む。下の境 1: 引きいっぱいでも自動の最上位のタスクグループは出る。自動の帯がズームだけで全部消えることはなく、空にするのは人が押す ∧∧ / ∧ に任せる。理由: 意図せず消えるのはペライチ（持ち主の言葉）に反する。下の境 1 が「自動の最上位は常に描く」を直接言い表す（今の FR-055 の下の境）ので最上位の別の規則は要らない（Q5 の向きを決める）。縦のズームは帯の値を書かない（`JDG-3663`）。上の境は、それより深い帯がないので `maxGroupDepth` に結ぶ。却下: 0..5（引きだけで一覧が空になる）。適用のとき `CR-853` の範囲 0..4 は 1..5 になり、深さの状態機械の最も浅い = 1、最も深い = 上の境。既定値は未決（Q4））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 9） | `JDG-3667`（Q4 の答え。固定の既定値 5 は却下。MSPDI のデータ（`automaticallyShownDepth` を保存していないファイル）を開くと Fit を行い、`automaticallyShownDepth` と縦の倍率を Fit が選ぶとおりに決める（一枚で見渡せる = ペライチ）。開くことは編集ではなく、未保存にせず取り消しの 1 手も足さない。α（今の）GRS JSON は β で開かず、β は断って α→β 変換ツールの案内を出す（本書の題と同じ向き）ので、α のための既定値を β の読み手は持たない。固定の既定値が要るのは新しい文書（深さ 1 の帯が 1 本）だけで、未決（提案: これも Fit）。`OP-10` を確認: 表示位置が `null` の文書は `FR-055` の全体表示に落ちる（`BT-4` の見本だけ除く）と既に言うので、MSPDI を開いて Fit は `OP-10` を覆さず範囲内。`HF-8` を起動のとき働かせない = 折りたたみを捨てない、は変わらない。新しい点は Fit が選ぶものに `automaticallyShownDepth` が加わること。鍵があるときは保存された深さを読み、`CR-853` の既定 3 は元のまま）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 10） | `JDG-3668`（Q4 を閉じる。新しい文書を作るときの `automaticallyShownDepth`（と縦の倍率）も、Fit（`FR-055`）と同じ決め方で決める（MSPDI を開くとき（`JDG-3667`）と同じ）。よって固定の既定値はどこにも要らない: β の GRS JSON は保存された値を持ち、MSPDI と新しい文書は Fit の選ぶ値になり、α の GRS JSON は断って変換ツールの案内を出す（`JDG-3667`）。新しい文書を作ることは編集ではなく、未保存にせず取り消しの 1 手も足さない。適用のとき `CR-853` の固定の既定値（3）は本規則に置き換わる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 11） | `JDG-3669`（`automaticallyShownDepth` に固定の既定値はない。β の GRS JSON は保存のとき必ずこの鍵を書く（値は 1 から `maxGroupDepth` まで）。β のファイルを鍵なしで読むとき（AI が書いたファイルや手で直したファイルなど）は、深さ（と縦の倍率）を Fit と同じ決め方で決める（MSPDI と新しい文書と同じ。`JDG-3667`、`JDG-3668`）。ファイルは断らない。理由: 固定の既定値を持たないことと揃う。深さは見るための設定にすぎないので、鍵が無くてもデータは何も失われず、断る理由にならない。却下: ファイルを断る（鍵が 1 つ無いだけで開けなくなる）、固定の 1 または 5（固定の既定値を持ち込み直す。`JDG-3668` に反する））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 12） | `JDG-3670`（元に戻す（Ctrl+Z、`UN-14`）は記録した直前の値をそのまま戻す。∧ Retract Into Parent が `hidden` にした帯も戻る。例: 帯 A に間違えて ∧ を押しても、Ctrl+Z で A とその子孫が再び見える。`JDG-3663` の閉じた一覧は「帯を新しく見せる画面の操作の一覧」と読む。元に戻すは復元であって見せる操作ではないので、一覧の外にある（適用のとき注を足す）。持ち主の原則（以後の決定の物差し）: 優しくあれ。ミスをした人は、どんなミスをしたのかも、どう直せばよいのかも知らない、と仮定する）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 13） | `JDG-3671`（Agent API のコマンド `setTaskGroupSelfShowMode`（`CM-85` の後継）は、`hidden` の帯にどの値でも置いてよい。`JDG-3663` の閉じた一覧は画面の操作の一覧で、値を直接置くコマンドは別の層なので一覧の外にある（適用のとき注を足す）。一般原則: 人が GRS でできることは、原則として AI（Agent API 経由）にもできるようにする。例外（人だけの操作）は JSON で管理する。既存の例外の一覧は無く、置き場（既存 JSON に印を持たせるか、新しい JSON か）は未決）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 14） | `JDG-3672`（帯の表示・非表示の Agent API のコマンド: `setTaskGroupSelfShowMode` は 1 つのタスクグループだけに値を置く。帯のボタンと同じ働きの 4 つ `retractIntoParent`・`expandOneLevel`・`expandBelow`・`collapseBelow`（名はイベント名から `Pressed` を除いたもの）。押した対象は `pressedTarget`、判別子 `type`: `{ "type": "root" }` / `{ "type": "taskGroup", "taskGroupId": "A" }`。命令は `type` の中で平らな名（`kind` は使わない、`JDG-3564`）。後日 Agent API 全体を見直すとき、すべての命令がこの方針で統一できるかを確かめる（未決の確認項目））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 15） | `JDG-3673`（`shown` の帯が `hidden` / `hiddenUntilZoomIn` の祖先の下にある文書: 読むときにも命令の後にも直さず、拒みもしない。描くときは祖先が勝ち、祖先に `hidden` か `hiddenUntilZoomIn` があれば帯は描かない（`taskGroupVisibility` は invisible）。保存値は書かれたままで、祖先がまた見えれば子孫は前と同じに現れる。読むことは文書を変えない。この場合のための新しい `IV-*` の読み込み検査は足さない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-21 の 16） | `JDG-3674`（縦のズームの命令とイベントの名: 命令 `verticalZoomIn`・`verticalZoomOut`。指示イベント `verticalZoomInRequested`・`verticalZoomOutRequested`（拡大系の入力すべてを抽象化。過去形、NDD R4。端でも発火。今の `verticalZoomShrinkPressed` は `verticalZoomOutRequested` に改名）。変化イベント `verticallyZoomedIn`・`verticallyZoomedOut`（実際に変わったときだけ。端では `verticalZoomEndReached`）。`hiddenUntilZoomIn` は `verticalZoomInRequested` で `automatic` に変わり、最大のときにも溶ける（帯の値を先に変換し、そのあと深さ・比率。問い Q14 で確かめる）。命令 = イベント名から接尾辞（`Pressed` / `Requested`）を除いたもの。後に回す（未決）: Agent API の名の見直し全体、命令の引数（比率かパーセントか）、深さと比率の値の置き場）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 1） | `JDG-3675`（AI（`Agent API`）は `automaticallyShownDepth` を直接置かない。深さは縦のズームの 1 刻みと全体表示の結果としてだけ変わる。`setZoom`（`CM-65`）から縦の値を外し、横だけを残す。命令 `verticalZoomIn` / `verticalZoomOut` は任意の引数で縦の倍率を直接受け、結果は人が 1 刻みを繰り返してその倍率に着いたときと同じ（拡大は深さが先、一番深い効く深さの後に比。縮小は比だけ）。1 回の命令で指示と結果の出来事は 1 回ずつ。向きに逆らう数は断り、今と同じ数は指示を起こす。持ち主の条件: ホイールの 1 回転分と縦の (+)/(-) の 1 押し分の刻みを別々に設定できる（今は `zoomStep` `S-53` を共有）。指示は人の入力と命令だけが起こす（一方通行））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 2） | `JDG-3676`（縦のズームインの指示で `hiddenUntilZoomIn` が `automatic` に変わったとき、その変化は元に戻すの 1 手。深さと比は対象外のまま（`UN-8`）。`hiddenUntilZoomIn` の帯が無いズームインは 1 手を積まない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 3） | `JDG-3677`（全体表示は `shown` と `hiddenUntilZoomIn` を `automatic` へ戻し、`hidden` は残す。値が変われば元に戻すの 1 手。持ち主の指示: ∧ Retract Into Parent（`IC-59`）のツールチップに、`hidden` の帯を再び表示する方法を書く）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 4） | `JDG-3678`（∧ のツールチップは短く、戻す手を ∨ の 1 つだけ書く。英語の 2 文目は「… Press [∨] to show the task group again.」。祖先の ∨∨ も戻す手の 1 つ（`JDG-3663`）だが、ツールチップには書かない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 5） | `JDG-3679`（飛ぶとき、飛ぶ先の道（祖先）の `hidden` を `automatic` に戻し、1 回で着く。`JDG-3663` の閉じた一覧に「配下へのジャンプ」を足す。ガード `hasHiddenAncestorOnPath` と入口の知らせは要らない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 6） | `JDG-3680`（飛ぶとき、飛ぶ先の帯は `shown`。道の `hidden` と `hiddenUntilZoomIn` は `automatic` に戻し、`automatic` と `shown` と兄弟には触れない。今の `SJ-2`（祖先のすべてを `expanded`）を改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 7） | `JDG-3681`（人の押しによらずに立つ既定の帯（0 になった後の 1 つ、新しい文書の 1 つ）は `automatic`）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 8） | `JDG-3682`（別の親へ落とした帯は `shown`。畳んだ親へ落としても同じで、兄弟には触れない。配下は値のまま動く。今の `HF-15` の「畳んだまま保つ」を改め、ガード `dropsIntoFoldedTaskGroup` は要らない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 9） | `JDG-3683`（画面で部分木を貼ると、写しの根は `shown`、写しの配下は元の値のまま。兄弟には触れない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 10） | `JDG-3684`（`createTaskGroup`・`pasteTaskGroupSubtree`・`moveTaskGroup` は任意の引数 `selfShowMode` を持つ。省けば、作る帯と写しの根は `automatic`、動かす帯は値を保つ。画面と同じ結果は引数 `"shown"` で作る）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 11） | `JDG-3685`（β の GRS JSON の帯の鍵 `selfShowMode` は任意で、無ければ `automatic` と読む。文書は断らない）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 12） | `JDG-3686`（用語集の席は用語集にかかわる問い（名・札・説明の文・値の名と意味）だけを持ち主に問い、振る舞いの細部は方針で決める。問い Q24〜Q27 は問わず、適用する席が方針から決める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 13） | `JDG-3687`（帯のボタンの日本語の札: ∨ 1 階層展開する（`IC-90`）、∨∨ 配下を展開する（`IC-58`）、∧∧ 配下を折りたたむ（`IC-77`）。∧ は「親へしまう」のまま）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 14） | `JDG-3688`（頭の ∨・∨∨・∧∧ は帯のボタンを根で押したもので、札と出来事は帯と同じ。根だけの札は付けない。説明の文は頭で起きることを書く: ∨「最上位のタスクグループを展開する。」、∨∨「すべてのタスクグループを展開する。」、∧∧「すべてのタスクグループを折りたたむ。縦にズームインすると戻る。」。今の `IC-92`・`IC-74`・`IC-78` の札を帯と同じに改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 15） | `JDG-3689`（状態機械の定義の名は camelCase（`selfShowModeStateMachine`・`automaticallyShownDepthStateMachine`）、状態の型は PascalCase（`SelfShowModeState`）、今の状態の変数は camelCase（`currentSelfShowModeState`）。NDD の例との違いを BOSS 経由で gr-sw-maker へ報告する）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 16） | `JDG-3690`（今の `CM-72` `resetTaskGroupTreeStates`（`shown` と `hiddenUntilZoomIn` を `automatic` にし、`hidden` を残す）の名を `setTaskGroupSelfShowModesToAutomaticExceptHidden` に改める。`reset` は「すべてを初期の値に戻す」と読め、`hidden` を残す働きと食い違う（NEIM でない））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 17） | `JDG-3691`（AI の全体表示 `fitScheduleToScreenOnPage`（`CM-102`）は、人の「全体を収める」と同じく倍率と表示位置を置き、帯の値も戻す。`setTaskGroupSelfShowModesToAutomaticExceptHidden` は全体表示の部品とし、AI に単独では見せない。「AI に見せない命令」の印の置き場は未決（`JDG-3671` の例外の JSON と同じ））を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 18） | `JDG-3692`（帯の目印を 2 つに分ける: `▾` と数（`HF-18`・`HF-12`）は配下の `invisible` の帯をすべて数える（深さで見えない帯も）。左の注意の色の帯は、人が隠した帯（`hidden`・`hiddenUntilZoomIn`）を抱える帯にだけ引く。今の `HF-18` の「人が折りたたんだ分だけ」「表示量が落とした帯を数えない」を改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 19） | `JDG-3693`（用語集の席の今の最優先は GRS JSON の語（BGQA3 の残り）。BGQA4・BGQA5 の名を今は持ち主に問わない。のちに `JDG-3695` が「1 つずつは問わず、見直しの中で方針から決める」と読み替えた）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 20） | `JDG-3694`（タスクの WBS の親を指すキーは `parentTaskUid` のまま。問 6-9-5 の 3 語はこれで閉じる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 21） | `JDG-3695`（外に出る名（GRS JSON・Agent API・文書の命令）を決めることが、ほかの仕事より先。GRS JSON の語が終わったら、すぐ Agent API の名の見直しに入る。用語集の席が先に方針の案を 1 枚で出し、持ち主が方針を決めてから名をまとめてそろえる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 22） | `JDG-3696`（タスクの形の値 `endpointSpan` を `dumbbell` に改める。外の AI への質問状 `task-shape-naming-request-1.md` の答えを読んだ持ち主の決め。日本語の名は問 6-9-0 で問う）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 23） | `JDG-3697`（縦の倍率と自動で出す深さを `documentSettings.verticalZoom { ratio, automaticallyShownDepth }` に置く。入れ物 `taskGroupTreeView` は除く）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 24） | `JDG-3698`（遅延診断のキーを `delayDiagnosisSettings`・`delayDiagnosisReportWindow` にする。`JDG-3512` の綴りにそろえる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 25） | `JDG-3699`（4 つの `style` の型を `TaskStyle`・`CommentBoxStyle`・`HighlightBoxStyle`・`TaskGroupStyle` にする。`TaskGraphicStyle` を改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 26） | `JDG-3700`（文書の刻印のキーは `lastEditedBy` のまま。値の型の名を `Writer` から `Editor` に改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 27） | `JDG-3701`（`grs.importOrigin` の 2 つの番号のキーを `sourceProjectUid`・`sourceTaskUid` にする。`sourceUid` を改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 28） | `JDG-3702`（パレットの白と黒の名を `paper`・`ink` から `white`・`black` に戻す。10 の名はすべて明るいテーマでの見え方を言う。灰色は 2 つなので `dimGray`・`lightGray` のまま）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 29） | `JDG-3703`（マイルストーンの形の値 `person` → `meetingPeople`、`smile` → `smilingFace`。日本語の名の記号を言葉にする）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 30） | `JDG-3704`（濃い灰色は `dimGray` のまま。CSS の `darkgray` は `gray` より明るく、`darkGray` と呼ぶと逆の明るさに読まれる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 31） | `JDG-3705`（`scrollPosition` の 2 つの割合のキーを `leftEdgeDayOffsetPercent`・`topEdgeTaskGroupOffsetPercent` にする）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 32） | `JDG-3706`（`baseline` の日本語を残る所すべてで「前回予定」にそろえ、「変更前予定輪郭」を「前回予定輪郭」に改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 33） | `JDG-3707`（設定の欄の札 9 つを後の裁定に合わせて直す）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 34） | `JDG-3708`（文書の設定の 4 語を表のとおりに採り、`fitDayRange.isFixed` を判別子 `type`（`fixed`・`automatic`）に替える。名は親を含めて問う）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 35） | `JDG-3709`（コメントボックスの 4 行を表のとおりに採る）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 36） | `JDG-3710`（取り込み元の型 `ImportOrigin` と `importSessionId` を表のとおりに採る）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 37） | `JDG-3711`（タスクの形の語を表のとおりに採り、`dumbbell` の日本語の名を「ダンベル」とする）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 38） | `JDG-3712`（文書の刻印と変更ログの語を表のとおりに採り、`changedBy.writerType` を `editorType` に改める）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 39） | `JDG-3713`（構造の木 `grs-json-beta-tree.md` をこのとおりと確かめ、仮の 4 つ（`documentSettings.themeHue` の置き場、`checkedTaskUids[]`・`checkedResourceUids[]`・`isUnassignedChecked`）を確定する。GRS JSON の語の問いはこれで閉じる）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 40） | `JDG-3714`（GRS が GRS JSON を書くときの並び: 毎回スキーマの順・根は小さい頭を先・`scheduleData` は MSPDI の群を MSPDI の順で先、GRS の群は指される物を先・物の中は `type` → `uid`/`id` → 名 → MSPDI の値 → GRS の値 → 子の配列 → `passthrough`・配列の要素は木の深さ優先か `uid`/`id` の順）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 41） | `JDG-3715`（`documentSettings` の中は効く範囲の広い順: 画面全体 → 時間の軸 → 帯の軸 → 開いたときの位置 → 描く物 → 道具）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 42） | `JDG-3716`（文書の命令と Agent API の名の方針のうち P-1〜P-6・P-9 を推しのとおり採り、P-12 は方針として採って結果をレビューする。P-7・P-8・P-10・P-11 は説明と比較を求められ未決）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（名の辞書の席、2026-11-22 の 43） | `JDG-3717`（GRS JSON の最終レビューの専用の SUB を立て、終わるまで Agent API を止める。Agent API は別の席。レビューの後に GRS JSON のスキーマを作る席を起こし、Agent API と並行してよい）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（GRS JSON の最終レビューの席、2026-11-22 の 1） | `JDG-3718`（GRS JSON の最終レビューの観点を V-1〜V-9 に決め、MSPDI の名の改名・振る舞い・Agent API・既決の名の蒸し返しを範囲の外に置く。外の AI への質問状は 2 段）を足した。本書の行のレビューの前に当てる |
| `rulings.md`（GRS JSON の最終レビューの席、2026-11-22 の 2） | `JDG-3719`（持ち主の目視のレビューは GQA BGQA6 で、ツリーを 5 つの部分に分けて見る。写しを持ち主の手元にも置く）を足した。本書の行のレビューの前に当てる |
| `defects.md` | `DFC-3579`（本書）—— 行のレビューの後に起こす |
| `changelog.md` | 当てるときに 1 行 |

---

## 9. 測り方の再現

```
python -I studies/76-grs-json-beta-shape/check_tables.py
python .claude/skills/spec-graph-check/check-data-element-kinds.py
git grep -n "null" -- docs/spec/_source/grs-document.schema.json docs/spec/_source/grs-commands.schema.json
```

---

## 10. 実物の確かめの手順（調整役が 1 枚にまとめる）

当てた後に書く。
