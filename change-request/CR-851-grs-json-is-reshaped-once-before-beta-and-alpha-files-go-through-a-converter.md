# CR-851 —— GRS JSON を β の前に 1 回だけ組み替え、α の文書は変換の HTML で β にする

> 起草の状態: **起草した。当てていない**（2026-10-25、枝 `claude/cr851-json-reshape-8cc2ca`、`develop` の `80927c91d` を取り込んだ上）。⛔ 利用者の指示 `JDG-3274` により、仕様・スキーマ・`src` へは、利用者が本書の変わる行を全部見て良しとした後に当てる。行は `studies/76-grs-json-beta-shape/` の 3 つの表（文書の要素・命令と拒否の理由・仕様の文）にある。
> ID の帯: 調整役から `CR-851`（と同じ形に乗る `CR-848`・`CR-849`）、台帳 `DFC-3579`〜`DFC-3588`、裁定 `JDG-3259`〜`JDG-3268`・`JDG-3274`〜`JDG-3289`・`JDG-3300`〜`JDG-3319`、保留 `PND-956`〜`PND-965`、性能の測り待ち `273`、見本 `76` を受けた。前の席 `answers-ahead` が `JDG-3206`〜`JDG-3209` を使った。拡大縮小の名は拡大縮小の席（`CR-853`）の `JDG-3290`〜`JDG-3297` を当てる。
> 当てるもの: `JDG-3206`〜`JDG-3208`（形を β の前に直す・網羅的に見直す）、`JDG-3226`・`JDG-3227`（検査 90 を 0 にする・5.4 に OKPN/OMPV）、本席の `JDG-3259`〜`JDG-3315`、行のレビューで決めた `JDG-3321`（外とつながる英語は易しい英語だけ）・`JDG-3322`（プロパティの順、`DR-6` と `studies/76-grs-json-beta-shape/property-order.md`）・`JDG-3412`・`JDG-3423`（順の正は SSOT。生成器は並べ替えず、書き出しはスキーマの順に並べ直し、順を検査する —— `JDG-3322` を広げる）、`JDG-3323`・`JDG-3324`（`schemaVersion`・`buildVersion` の説明）、`JDG-3325`・`JDG-3326`（行のレビューのページの段の線・分類の絞り込み・目次）、`JDG-3327`（すべてのプロパティに易しい英語の説明）、`JDG-3328`（外へ出す英語を Haiku・Sonnet・席・利用者の 4 段で確かめる）、`JDG-3329`（MSPDI 由来の説明は「Same as MSPDI X」、ルートに語の定め）、`JDG-3330`（語の定めは利用者の文）、`JDG-3331`（冒頭は短く、決まりは型の説明へ）、`JDG-3332`（変更の記録の 6 つのプロパティ。画面と命令は別の CR）、`JDG-3333`（冒頭は語の定めと文書の形の木。木は生成）、外へ出す英語の文体 `JDG-3346`（it・its を使わない、受け身を避ける、用語集の名だけ）、GRS JSON と Agent API に出る用語 `JDG-3348`・`JDG-3351`〜`JDG-3379`（`studies/76-grs-json-beta-shape/terms/`）、キー名 `JDG-3380`〜`JDG-3384` と Agent API の名 `JDG-3410`（`studies/76-grs-json-beta-shape/terms/9-grs-only-key-questions.md`）、拡大縮小の名 `JDG-3290`〜`JDG-3297`（`JDG-3292` の `dayWidthPx`・`displayScalePercent`、`JDG-3293`・`JDG-3296` の `verticalZoomRatio` と `taskGroupAutoExpandDepth`、`JDG-3294` の目盛の 2 つ（`rulerFontSizePx`・`rulerHeightPx`）を文書から外すこと、`JDG-3295` の `fontSizeStep` の語の値を含む）。

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
- 名の辞書のレビュー（`studies/76-grs-json-beta-shape/terms/13-glossary.md`）で決まり、本書が当てる名と文: 遅延診断の Agent API の名（`JDG-3473`・`JDG-3476` —— `terminalPushOuts` → `endTaskDelays`、`terminalDelayMinutes` → `endTaskDelayMinutes`、`terminalsReached` → `endTasksReached`、`pushOutMinutes` → `delayContributionMinutes`、`settledPushOuts` → `finishedDelayContributions`、`walls` → `diagnosisBlockers`、`inheritedDelayMinutes` → `dependencyDelayMinutes`、`selfDelayMinutes` → `internalDelayMinutes`）、遅延診断の答えに足す終了見込み `estimatedFinish`（`JDG-3477`。レポートの表の欄は `CR-856`）、スキーマの Concepts に置く遅延診断の EARS の 3 文と、結果を保存しない理由（`JDG-3478`・`JDG-3480`）。

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
