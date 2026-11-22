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
| R012 | `lastEditedBy.type` の `"template"` | まだ誰も編集していないひな形のまま |
| R014 | `lastEditedBy.name` | `type` が `agent` のときだけ書く |
| R051・R053 | `displayTimeZones[]`・`zoneNameType` | 追加の時計。`utcOffset` は夏時間の分を含み、`zoneNameType` は名の種類だけを選ぶ |
| R075 | `scrollPosition.type` の `"automatic"` | 位置を決めていない（GRS が決める）。今日や基準日へ合わせる意味ではない |
| R106 | `importedTopTaskOutlineLevel` | 取り込んだ元のファイルの最上位のタスクの OutlineLevel の記録 |
| R388 | `ColumnFilter.column` | 値ごとに、どの表の列か（スキーマでは表ごとに値を絞る） |
| `[M]` の名 | `linkLag`・`lagFormat`・`hyperlink`・`dayType`・`weekStartDay`・3 つの `type`・`revision`・`stop`・`resume` | MSPDI の数の符号の意味、単位、0 始まりと 1 始まりの違い（`grs-json-review-request-4.md` の 8 節の案と、AI-A の問 3） |
