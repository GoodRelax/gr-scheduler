# GRS JSON の最終レビュー —— 指摘の整理（AI-A、2026-11-22）

`JDG-3717` の 4.「各 AI のレビュー結果、俺のレビュー結果を確認して反映」の下ごしらえ。答えの写しは `ai-answers/grs-json-final-review-answers.md`。AI-B は質問状が大きすぎて答えなかったので、持ち主が外した。持ち主の目視（GQA BGQA6）の答えは、届いたらこの表に足す。

## 1. 数

- 1 段目（名だけを見て書いた説明）: 428 行のうち確信 5 が 384 行、4 が 25 行、3 が 12 行、2 が 5 行、1 が 2 行（答えの写しの 1 段目の表の確信の欄を、行ごとに数えた）。
- 1 段目の読みが意図とずれた行（2 段目の自己診断）: 19 件（2 段目の問 1 の表の行を数えた。範囲で書いた行を 1 件と数える）。
- 総合の点: 8 / 10。部分ごとの一目: 5 つのうち 4 つが ○、「頭の値と MSPDI と往復する群」だけが △。

## 2. 名の指摘（持ち主に 1 つずつ問う）

並びは重い順（1 段目の確信の低さと、2 段目の自己診断の重さ）。「経緯」は、その名を決めた裁定。

| # | 行 | 名 | 1 段目の確信と読み | AI-A の案 | 経緯 |
|:---|:---|:---|:---|:---|:---|
| F-1 | R374・R379 | `isScheduleFilterApplied` | 2。適用の向きが逆（チャートの絞り込みが表に掛かる）と読んだ | `isCanvasFilteredByCheckedRows` | `JDG-3630`（画面の名「スケジュールフィルタ」に合わせた） |
| F-2 | R370 | `isCalculatedFromOppositeColor` | 2。opposite color を色相環の補色と読みかけた | `isDerivedFromOppositeTheme` | `JDG-3636`（持ち主の案。席の `isCalculatedFromOppositeSide` は採らなかった） |
| F-3 | R286 | `editableByGroupName` | 2。「グループ名を変えてよいか」の真偽に読んだ | `authorizedEditorGroupName` | `JDG-3623`（`editorGroupName` から改めた） |
| F-4 | R070〜R072 | `taskStackDirection` | 2〜3。縦の並び順か、重なりの前後（Z 軸）か迷った | `inGroupTaskStackDirection` | `JDG-3632`（値だけ改め、キーは今のまま） |
| F-5 | R197・R198 | `fadeInCalendarDays`・`fadeOutCalendarDays` | 1（全体で最も低い）。描く上のぼかしか、作業の助走期間か迷った | 説明を足す | 前の審査で「今のまま、スキーマの説明で補う」 |
| F-6 | R372・R319 | `LaneColor`・`laneTopOffsetPercent` | 4・5。2 段目で「帯を taskGroup と呼ぶのに、ここだけ lane」と指摘（1 つの物に 2 つの名） | `TaskGroupColor`・`taskGroupTopOffsetPercent` | `JDG-3514` ほか |
| F-7 | R389・R090 | 列 `progressStatus` と `isProgressMarkVisible` | 5・3。同じ進捗マーカーを 2 つの語で呼ぶ | 列を `progressMark` に | `JDG-3726`（列）・`JDG-3372`（マーク） |
| F-8 | R281・R285 | `selfShowMode`、値 `hiddenUntilZoomIn` | 3・5。self が帯か代表タスクか迷った。値の品詞がそろわない | `groupVisibilityMode`・`hiddenUntilZoomedIn` | 帯の表示の裁定（`JDG-3662` ほか） |
| F-9 | R228 | `lastSeenMspdiImportCount` | 3。世代の番号か、累計の回数か迷った | `lastSeenImportNumber` | `JDG-3715` の頃の名の辞書 |
| F-10 | R094 | `delayDiagnosisSettings.toleranceWorkingDays` | 5 だが、期限に対する許容と読んだ（意図は親タスクの進み具合） | `parentProgressToleranceWorkingDays` | `JDG-3698`（`delayDiagnosisSettings` の下へ移した） |
| F-11 | R066 | `verticalZoom.automaticallyShownDepth` | 3。ズームの倍率に連動する深さか迷った | 説明を足す | `JDG-3697` |

## 3. 席が説明の文で補う物（名は変えない。持ち主には問わない）

1 段目の確信が 4 以上で、2 段目でも説明で足りるとされた物。スキーマの席へ渡す。

| 行 | 名 | 補う事（AI-A の説明の文の案は答えの写しの問 3） |
|:---|:---|:---|
| R003・R004 | `schemaVersionUtc`・`buildVersionUtc` | 値は版を識別する UTC の時刻（秒まで） |
| R012 | `lastEditedBy.type` の `"template"` | 同梱のテンプレートのまま。人も AI もまだ編集していない。`lastEditedBy` は必ず書く（`JDG-3740`） |
| R014 | `lastEditedBy.name` | `type` が `agent` のときだけ書く |
| R051・R053 | `additionalTimeZones[]`（`JDG-3741` で `displayTimeZones[]` から改めた）・`zoneNameType` | 基準（`viewTimeZone`）に足して見せる時計。`utcOffset` は夏時間の分を含み、`zoneNameType` は名の種類だけを選ぶ |
| R075 | `scrollPosition.type` の `"automatic"` | 位置を決めていない（GRS が決める）。今日や基準日へ合わせる意味ではない |
| R066 | `verticalZoom.automaticallyShownDepth` | `showMode` が `automatic` の帯を出す深さ（1〜`maxGroupDepth`）。縦のズームの 1 刻みは、まずこの深さを変え、最も深いところに着いた後は `ratio` を変える。倍率から計算する値ではない（`JDG-3739`） |
| R106 | `importedTopTaskOutlineLevel` | 取り込んだ元のファイルの最上位のタスクの OutlineLevel の記録 |
| R388 | `ColumnFilter.column` | 値ごとに、どの表の列か（スキーマでは表ごとに値を絞る） |
| `[M]` の名 | `linkLag`・`lagFormat`・`hyperlink`・`dayType`・`weekStartDay`・3 つの `type`・`revision`・`stop`・`resume` | MSPDI の数の符号の意味、単位、0 始まりと 1 始まりの違い（`grs-json-review-request-4.md` の 8 節の案と、AI-A の問 3） |

## 4. 決まったこと（2 節の指摘への持ち主の裁定）

| # | 決まったこと | 裁定 |
|:---|:---|:---|
| F-1 | 画面の名を「チェックで日程表を絞る / Filter Schedule by Checks」に改め、キーを `isScheduleFilteredByChecks` にした | `JDG-3727`・`JDG-3728` |
| F-2 | `isCalculatedFromOppositeColorScheme` | `JDG-3729` |
| F-3 | `allowedEditorGroupName` | `JDG-3730` |
| F-4 | `taskPlacementDirection`（画面の英語 Placement Direction、日本語は「積む向き」のまま） | `JDG-3731` |
| F-5 | `startSlopeCalendarDays`・`finishSlopeCalendarDays`（画面 開始の傾き・終了の傾き） | `JDG-3732` |
| F-6 | JSON から Lane を無くし、`TaskGroupColor`・`taskGroupTopOffsetPercent` にした | `JDG-3733` |
| F-7 | 列を `progressMarkStatus` にした（その後 `JDG-3742` で `progressStatus` に改めた）。状態の列の隠す値は用語集の英語の名で書く | `JDG-3734`・`JDG-3735`・`JDG-3742` |
| F-8 | `selfShowMode` を `showMode` にした。値は今のまま | `JDG-3736` |
| F-9 | タスクの `lastSeenMspdiImportCount` を `mspdiImportCountWhenLastIncluded` にした。値は番号のまま | `JDG-3737` |
| F-10 | `delayDiagnosisSettings.toleranceWorkingDays` を `parentTaskProgressToleranceWorkingDays` にした | `JDG-3738` |
| F-11 | `verticalZoom.automaticallyShownDepth` は名を変えず、スキーマの説明で補う（3 節の R066） | `JDG-3739` |

## 5. スキーマの席への宿題（裁定ではない）

| 出どころ | 宿題 |
|:---|:---|
| `JDG-3737` の持ち主の問い「日時とか、バージョンとか、ファイル名とか、そういう方が重要では？」 | 人に見せる取り込みの記録（いつ、どのファイルから取り込んだか）を、GRS JSON が持つかを決める。席の例: 文書の側に `lastMspdiImport: { importedAtUtc, fileName }` を 1 つ置く（タスクごとには持たない）。ファイル名はフォルダーを除いた名だけを書く（個人の道筋を JSON に残さない） |

## 6. 2 回目の答え（AI-A の 2 回目、2026-11-23）

1 通だけの質問状 `grs-json-final-review-ai-round2.md`（木は英語の名だけ、名は F-11 まで当てた後の版）への答え。写しは `ai-answers/grs-json-final-review-answers-round2.md`。答えたのは AI-A と同じ会社の AI（前の質問状を見ていない新しい会話）なので、別の読み手としての重みは 1 回目より軽い。

### 6.1 数

- 問 1 の指定の 20 行（この席までの裁定で変えた名と、比べるための前からの名を混ぜた）: 確信 5 が 7 行、4 が 9 行、3 が 4 行（表の確信の欄を行ごとに数えた）。
- 新しい名のうち、読みが意図とずれた行: 0 行。`R228 mspdiImportCountWhenLastIncluded` は確信 4 で意図のとおりに読めた（1 回目の旧名は確信 3）。`R197 startSlopeCalendarDays` は確信 3（1 回目の旧名 `fadeInCalendarDays` は確信 1）。
- 問 2 の確信 3 以下の行: 23 行（表の行を数えた）。そのうち MSPDI の名（`[M]`）が 6 行で、3 節の `[M]` の行が既に扱う。
- 問 3 の誤読の罠: 5 行。

### 6.2 名の指摘（持ち主に 1 つずつ問う）

| # | 行 | 名 | AI-A（2 回目）の読みと罠 | AI-A（2 回目）の案 | 経緯 |
|:---|:---|:---|:---|:---|:---|
| G-1 | R012 | `lastEditedBy.type` の値 `"template"` | 罠の 1 位。「template という名のシステムの利用者か自動の処理が最後に編集した」と読まれる | キーを `lastUpdatedSource`、値を `"createdFromTemplate"` | 1 回目は 3 節（説明で補う）に入れた |
| G-2 | R051 | `displayTimeZones[]` | 罠の 2 位。「画面で選べる時差の候補の一覧」と読まれる（意図は、追加の時計 4 つまで） | `secondaryTimeZones[]` か `headerTimeZones[]` | 1 回目は 3 節（説明で補う）に入れた |

### 6.3 席が説明の文で補う物（名は変えない。持ち主には問わない）

読みは意図に近く、迷いは振る舞いか範囲の話なので、3 節と同じくスキーマの席へ渡す。

| 行 | 名 | 補う事 |
|:---|:---|:---|
| R024 | `affectedArea` | 何の部分か（文書のどの群に変更が及んだか） |
| R048 | `"sameAsScheduleData"` | データの時差が変わると、表示の時差も追って変わる（写した値ではない） |
| R058 | `fitDayRange` | 全体表示の期間。画面の全体表示が使う（書き出しの期間ではない） |
| R069 | `pinnedTaskGroupIds[]` | 上の端に留める帯。`automatic` の帯は、留めている間は深さに関わらず出る（`hidden` には勝たない） |
| R070 | `taskPlacementDirection` | 1 つの帯の中で、重なるタスクを置く向き（帯どうしの並びではない） |
| R080 | `topEdgeTaskGroupOffsetPercent` | 上の端が、その帯の上の縁から何 % の所か（画面の上からの距離ではない）。`leftEdgeDayOffsetPercent` と同じ形 |
| R090 | `isProgressMarkVisible` | 進捗マーク（タスクの進み・遅れの印）。イナズマ線の折れ点ではない |
| R094 | `parentTaskProgressToleranceWorkingDays` | 親タスクの進捗の点が、子孫の点の範囲からはみ出してよい稼働日の数（期限の遅れの許し幅ではない） |
| R095 | `tableWindows` | 3 つの表の窓の見せ方 |
| R197・R198 | `startSlopeCalendarDays`・`finishSlopeCalendarDays` | タスクの棒の端を斜めに描く幅（暦日）。日程の緩衝の日数ではない |
| R370 | `isCalculatedFromOppositeColorScheme` | GRS が反対の側から計算して作った側だけ `true`（人に選ばせる旗ではなく、出どころの記録） |
| R371・R372 | `Color.dark`・`TaskGroupColor` | 英語だけの木では子が見えなかった。`dark` は `light` と同じ形、`TaskGroupColor` は `Color` から `black` を除いた物と書く |

### 6.4 決まったこと

| # | 決まったこと | 裁定 |
|:---|:---|:---|
| G-1 | `"template"` は今のまま。`lastEditedBy` は必ず書き、まだ誰も編集していない文書でも削らない（3 節の R012） | `JDG-3740` |
| G-2 | `displayTimeZones[]` を `additionalTimeZones[]` にし、画面の名を「Additional Time Zones / 追加のタイムゾーン」にそろえた | `JDG-3741` |

## 7. 3 回目の答え（AI-A の 3 回目、2026-11-23）

別の会社の AI に出すつもりだった 3 回目も、持ち主が使える別の会社の AI が無く、AI-A と同じ会社の AI が新しい会話で答えた。問 1 に `R051` が無いので、貼られたのは 2 回目の質問状と見られる（`additionalTimeZones[]` は前知識なしに試せていない）。写しは `ai-answers/grs-json-final-review-answers-round3.md`。

### 7.1 数

- 問 1 の指定の 20 行: 確信 5 が 6 行、4 が 10 行、3 が 2 行、2 が 2 行（表の確信の欄を行ごとに数えた）。読みが意図とずれた新しい名は 0 行。確信 2 の `R197 startSlopeCalendarDays` は、迷った 2 つの読み（斜めに描く幅／確定していない日付の幅）がどちらも意図に当たる。
- 問 2 の確信 3 以下の行: 17 行（表の行を数えた）。そのうち MSPDI の名（`[M]`）が 7 行。
- 問 3 の誤読の罠: 5 行。`milestone`・`dayWorking`・`stop` は MSPDI の名（`[M]`）を写す決まりなので変えない。`taskGroups[]` → `swimlanes[]` は、2 軸のモデルで決めた中心の語なので採らない。`firstDay` → `firstCalendarDate` は、日付の型 `Day` を用語集が定義済みなので採らない。

### 7.2 名の指摘

| # | 行 | 名 | 外の AI の読み | 決まったこと | 裁定 |
|:---|:---|:---|:---|:---|:---|
| G-3 | R090・R389 | `isProgressMarkVisible`・列 `"progressMarkStatus"` | 2 回目・3 回目とも確信 3 以下。すぐ上の `isProgressLineVisible`（イナズマ線）の折れ点の印かと迷った | 進捗ステータスマークと呼ぶ。`isProgressStatusMarkVisible`、列 `"progressStatus"`、画面「Progress Status Mark / 進捗ステータスマーク」 | `JDG-3742` |

### 7.3 席が説明の文で補う物（名は変えない。持ち主には問わない）

| 行 | 名 | 補う事 |
|:---|:---|:---|
| R090 | `isProgressStatusMarkVisible` | 実績バーの端の外に出す印。形で進捗ステータスを示す。イナズマ線の点ではない。再開マークの表示も、この値が決める |
| R136 | `passthrough` | 1 つの物が持つ、GRS が読まない MSPDI の要素の控え（形は物）。配列 `passthroughTasks[]` は、タスクごと控えた物の並び |
| R183・R160・R186 | `milestone`・`dayWorking`・`stop` | MSPDI の名を写したキー。真偽値・中断の日時であることを説明に書く |
| R270 | `taskGroups[]` | 帯（行の群）。タスクの親子（WBS）とは別の軸 |
| R341 | `precedingTaskUid` | MSPDI の中の並びで、すぐ前にあるタスク（依存の先行ではない） |
| R062・R063 | `firstDay`・`lastDay` | 時刻を持たない日付（`Day`、`YYYY-MM-DD`）。範囲は両端を含む |
