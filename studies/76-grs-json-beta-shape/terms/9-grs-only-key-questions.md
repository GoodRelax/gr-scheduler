# GRS JSON の GRS 独自のキー名 —— 1 枚目（用語とぶつかるキー）

> **/grsmd-qa の使い方**
> - 「回答:」の後ろに、選択肢の文字（a, b …）か自由な文を書き、保存してから、チャットで「更新した」と伝えてください。
> - 🔄 と*斜体*は、前回から変わった所です（`f` で 🔄 を検索すると順に飛べます）。初版には付きません。
> - 強調したい所には ★ を付けてかまいません。

2026-10-28 に作った。β の GRS JSON の形（`CR-851` を当てた後）の GRS 独自のキー 222 個（全部で 302 個）のうち、用語の裁定（`terms/3-sheet1-questions.md`、`JDG-3351`〜`JDG-3379`）とぶつかるキーを問う。木は `8-grs-only-key-tree.md` と同じもの。

---

## 決まったこと

| 問 | 決め | 裁定 |
|---|---|---|

---

## 全体の木

左から、キー名・日本語の名・備考。日本語の名は席の案で、直したい所は ★ を付けて直に書き換えてよい。備考の `← 古い名` は今のスキーマから名が変わるもの、`問 N` は `9-grs-only-key-questions.md` の問。`(kind x)` は `kind` の値で形が分かれるときの、その形の中のキー。

**文書の木**（スキーマのいちばん上から）

```text
$schema                            スキーマアドレス
schemaVersion                      スキーマ版
buildVersion                       ビルド版
schedule                           スケジュールデータ          問 1
+- taskGroups                      タスクグループ
+- taskGroupMembers                タスクグループ所属
+- taskVisuals                     タスク図形設定              問 5
+- taskOrigins                     タスク取込元
+- baselineTasks                   変更前予定タスク
+- commentBoxes                    コメントボックス
+- highlightBoxes                  ハイライトボックス
documentSettings                   文書設定
+- displayScalePercent             表示倍率                    ← displayScale
+- fontSizeStep                    文字サイズ段階
+- dayWidthPx                      1日幅                       ← zoomX
+- verticalZoomRatio               縦拡大率                    ← zoomY
+- taskGroupAutoExpandDepth        自動展開深さ
+- scrollPosition                  スクロール位置
|  +- (every kind)                 （どの種類でも）
|  |  +- kind                      種類
|  +- (kind placed)                （種類が placed のとき）
|     +- leftEdgeDay               左端日                      ← scrollDate
|     +- leftEdgeDayFraction       左端日端数                  ← scrollDateFraction
|     +- topEdgeTaskGroupId        上端タスクグループID        ← scrollTaskGroupId
|     +- topEdgeTaskGroupFraction  上端タスクグループ端数      ← scrollTaskGroupFraction
+- fitSpan                         全体表示期間
|  +- firstDay                     初日                        ← fitSpanStart
|  +- lastDay                      末日                        ← fitSpanFinish
|  +- isFixed                      固定                        ← isFitSpanFixed
+- viewTimeZone                    表示タイムゾーン
|  +- (every kind)                 （どの種類でも）
|  |  +- kind                      種類
|  +- (kind fixed)                 （種類が fixed のとき）
|     +- offset                    UTCオフセット
+- displayTimeZones                追加タイムゾーン
|  +- offset                       UTCオフセット
|  +- season                       標準夏時間区分
+- isTimeOfDayVisible              時刻表示
+- isPlanVisible                   予定バー表示                問 3
+- isPlanDatesVisible              予定日付表示
+- isActualVisible                 実績バー表示                問 3
+- isPercentCompleteVisible        完了率ラベル表示            問 3
+- isBaselineVisible               変更前予定輪郭表示          問 3
+- isProgressLineVisible           イナズマ線表示
+- isProgressMarkerVisible         進捗マーク表示              問 3
+- isDependencyVisible             依存線表示                  問 3
+- isAssigneeVisible               担当ラベル表示              問 3
+- isDateGridLinesVisible          日付罫線表示
+- isGroupGridLinesVisible         グループ罫線表示
+- stackDirection                  積み方向
+- isThemeMonochrome               モノクロテーマ
+- taskGroupPanelWidthPx           タスクグループパネル幅
+- isTaskGroupPanelWidthFixed      タスクグループパネル幅固定
+- levelZeroTreeState              レベル0木状態
+- pinnedTaskGroupIds              ピン止めタスクグループID
+- tableViews                      表表示設定
   +- searchPanel                  検索ウィンドウ              問 4
   |  +- isScheduleFilterApplied   スケジュールフィルター適用
   |  +- shownTaskUids             表示タスクID
   |  +- columnFilters             列フィルター
   |  +- sort                      並べ替え
   +- delayDiagnosticsReport       遅延診断レポートウィンドウ  問 4
   |  +- isScheduleFilterApplied   スケジュールフィルター適用
   |  +- shownTaskUids             表示タスクID
   |  +- columnFilters             列フィルター
   |  +- sort                      並べ替え
   +- resourceList                 担当リストウィンドウ        問 4
      +- isScheduleFilterApplied   スケジュールフィルター適用
      +- shownResourceUids         表示担当ID
      +- isUnassignedShown         担当なし行表示
      +- columnFilters             列フィルター
      +- sort                      並べ替え
documentStamp                      文書スタンプ
changeLogEntries                   変更記録                    ← changeLog
```

**型の木**（`$defs`）

```text
Project                                    プロジェクト                    MSPDI の型（中の GRS 独自のキーだけを載せる）
+- scheduleDataTimeZone                    スケジュールデータタイムゾーン
+- themeHueDegrees                         テーマ色相                      ← themeHue
+- parentTaskProgressToleranceWorkingDays  親タスク進捗許容日数            ← parentTaskProgressToleranceDays
+- highestIssuedUid                        発番済み最大ID                  ← uidHighWaterMark
+- lastImportNumber                        最終取込番号                    ← importSequence
+- firstOutlineLevel                       開始アウトラインレベル          ← outlineBase
+- sourceFormat                            元形式
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
Calendar                                   カレンダー                      MSPDI の型（中の GRS 独自のキーだけを載せる）
+- ordinal                                 出現順
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
WeekDay                                    曜日別稼働                      MSPDI の型（中の GRS 独自のキーだけを載せる）
+- ordinal                                 出現順
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
Exception                                  例外日                          MSPDI の型（中の GRS 独自のキーだけを載せる）
+- ordinal                                 出現順
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
WorkingTime                                稼働時間帯                      MSPDI の型（中の GRS 独自のキーだけを載せる）
+- ordinal                                 出現順
Task                                       タスク                          MSPDI の型（中の GRS 独自のキーだけを載せる）
+- parentTaskUid                           親タスクID
+- siblingOrder                            兄弟順                          ← wbsOrder
+- fadeInCalendarDays                      開始側フェード日数              ← fadeInDays
+- fadeOutCalendarDays                     終了側フェード日数              ← fadeOutDays
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
Dependency                                 依存関係                        MSPDI の型（中の GRS 独自のキーだけを載せる）
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
Resource                                   担当                            MSPDI の型（中の GRS 独自のキーだけを載せる）
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
Assignment                                 割当                            MSPDI の型（中の GRS 独自のキーだけを載せる）
+- passthroughValues                       持ち越し値                      ← carry
+- passthroughElements                     持ち越し要素                    ← carryElements
TaskGroup                                  タスクグループ
+- id                                      タスクグループID
+- parentId                                親タスクグループID
+- representedTaskUid                      代表タスクID                    ← derivedFromTaskUid
+- siblingOrder                            兄弟順                          ← order
+- name                                    タスクグループ名
+- treeState                               木状態
+- editGroup                               編集グループ                    ← editPermission
+- color                                   レーン色
+- minHeightPx                             最小高さ
+- hyperlinkAddress                        ハイパーリンクアドレス
+- hyperlink                               ハイパーリンク名
TaskGroupMember                            タスクグループ所属
+- taskUid                                 タスクID
+- taskGroupId                             タスクグループID
TaskVisual                                 タスク図形設定                  問 5
+- taskUid                                 タスクID
+- taskShape                               タスク形状                      ← shapeKind
+- milestoneShape                          マイルストーン形状              ← milestoneGlyph
+- fillColor                               塗り色
+- strokeColor                             輪郭色
+- strokeWidthPx                           輪郭太さ
TaskOrigin                                 タスク取込元
+- taskUid                                 タスクID
+- sourceProjectId                         取込元プロジェクトID
+- sourceUid                               取込元タスクID
+- importSessionId                         取込回ID
+- lastSeenImportNumber                    最終確認取込番号                ← lastSeenImportSequence
BaselineTask                               変更前予定タスク
+- uid                                     タスクID
+- name                                    タスク名
+- start                                   変更前予定開始
+- finish                                  変更前予定終了
+- milestone                               マイルストーン
CommentBox                                 コメントボックス
+- id                                      コメントボックスID
+- anchor                                  線先                            問 2
+- bodyOffsetPx                            本文オフセット
|  +- dx                                   横ずれ
|  +- dy                                   縦ずれ
+- text                                    本文
+- fillColor                               塗り色
+- fillTransparencyPercent                 塗り透過率
+- strokeColor                             枠色
+- strokeWidthPx                           枠太さ
+- textColor                               文字色
+- fontSizePx                              文字サイズ
+- hyperlinkAddress                        ハイパーリンクアドレス
+- hyperlink                               ハイパーリンク名
CommentBoxAnchor                           線先                            問 2
+- (every kind)                            （どの種類でも）
|  +- kind                                 種類
+- (kind freePoint)                        （種類が freePoint のとき）
|  +- dateTime                             日時                            ← anchorDate
|  +- taskGroupId                          タスクグループID                ← anchorTaskGroupId
|  +- bandFraction                         レーン内高さ                    ← anchorBandFraction  問 2
+- (kind task)                             （種類が task のとき）
|  +- taskUid                              タスクID                        ← anchorTaskUid
|  +- figure                               吸着先図形                      ← anchorTaskFigure  問 2
|  +- point                                吸着点                          ← anchorSnapPoint
|  +- fallback                             代替位置
+- (kind highlightBox)                     （種類が highlightBox のとき）
   +- point                                吸着点                          ← anchorSnapPoint
   +- highlightBoxId                       ハイライトボックスID            ← anchorHighlightBoxId
   +- fallback                             代替位置
AnchorFallback                             線先代替位置                    問 2
+- taskGroupId                             タスクグループID                ← anchorTaskGroupId
+- bandFraction                            レーン内高さ                    ← anchorBandFraction  問 2
HighlightBox                               ハイライトボックス
+- id                                      ハイライトボックスID
+- topTaskGroupId                          上端タスクグループID
+- bottomTaskGroupId                       下端タスクグループID
+- firstDay                                初日                            ← start
+- lastDay                                 末日                            ← finish
+- cornerRadiusPx                          角丸半径
+- fillColor                               塗り色
+- fillTransparencyPercent                 塗り透過率
+- strokeColor                             枠色
+- strokeWidthPx                           枠太さ
DocumentStamp                              文書スタンプ                    ← documentStamp
+- scheduleUpdatedAt                       スケジュールデータ更新時刻      問 1
+- documentUpdatedAt                       文書更新時刻                    ← settingsUpdatedAt
+- fileSavedAt                             ファイル保存時刻
+- lastEditedBy                            最終編集者
Writer                                     編集者
+- (every kind)                            （どの種類でも）
|  +- kind                                 種類
+- (kind agent)                            （種類が agent のとき）
   +- name                                 編集者名
ChangeLogEntry                             変更記録項目                    ← changeLog
+- changedAt                               変更時刻
+- changedBy                               変更者                          ← editedBy
+- affectedArea                            影響範囲
+- changeDescription                       変更内容                        ← explanation
+- reason                                  理由
+- note                                    備考
PassthroughValues                          持ち越し値                      ← Carry
PassthroughElement                         持ち越し要素                    ← CarryElement
+- ordinal                                 出現順
+- name                                    要素名
+- fields                                  子値
+- children                                子要素
Day                                        日付
DateTime                                   日時
Time                                       時刻
UtcInstant                                 UTC時刻
UtcOffset                                  UTCオフセット
Color                                      色
+- (every kind)                            （どの種類でも）
|  +- kind                                 種類
+- (kind palette)                          （種類が palette のとき）
|  +- name                                 パレット色名
+- (kind custom)                           （種類が custom のとき）
   +- light                                ライトテーマ色
   +- dark                                 ダークテーマ色
ColorSide                                  テーマ別色
+- value                                   色値
+- source                                  由来
BandColor                                  レーン色                        問 2
ColumnFilter                               列フィルター
+- (every kind)                            （どの種類でも）
|  +- kind                                 種類
|  +- column                               列名
+- (kind values)                           （種類が values のとき）
|  +- hiddenValues                         非表示値
|  +- isBlankHidden                        空欄非表示
+- (kind dateRange)                        （種類が dateRange のとき）
   +- firstDay                             初日                            ← fromDate
   +- lastDay                              末日                            ← toDate
ColumnSort                                 列並べ替え
+- column                                  列名
+- direction                               方向
ColumnKey                                  列名
```

---

## 問 1. `schedule` —— スケジュールデータの入れ物の名

**場面**: GRS JSON のいちばん上には `schedule` というキーがあり、その中に MSPDI part（`project`・`tasks` ほか）と GRS part（`taskGroups` ほか）が入っています。`documentStamp` の `scheduleUpdatedAt` は、その中身が最後に変わった時刻です。

用語の裁定で、単独の「schedule」は書かないと決めました（`JDG-3358`）。中身の名は `Schedule Data`（`JDG-3353`）です。今のキーのうち、`scheduleDataTimeZone` はもう Data を含んでいます。

| 案 | 中身 |
|---|---|
| **a（推奨）** | `schedule` → `scheduleData`、`scheduleUpdatedAt` → `scheduleDataUpdatedAt` |
| b | キーは今のまま（JSON のキーは用語の決まりの外とする） |

**推奨の理由**: キーは外の人や AI が最初に読む名で、説明文はもう Schedule Data と呼んでいます。キーだけ違うと、同じ物に 2 つの名ができます。β の前なので、今なら変換器（`CR-851`）が 1 回で直せます。

回答:

---

## 問 2. コメントボックスの線先のキー —— `anchor`・`band`・`figure`

**場面**: コメントボックスは引出し線（Leader Line）で何かを指します。その先が線先（Leader Anchor）で、タスク・ハイライトボックス・何も無い所のどれかに付きます。

| 今のキー | 何か | ぶつかる裁定 |
|---|---|---|
| `CommentBox.anchor` と型 `CommentBoxAnchor` | 線先 | `JDG-3348`: Leader Anchor は必ず 2 語で使う |
| 型 `AnchorFallback` | 先が消えたときの線先の置き場 | 同上 |
| `bandFraction` | 線先の高さ（タスクグループレーンの上端 0・下端 1） | `JDG-3361`・`JDG-3374`: タスクグループの帯は Task Group Lane |
| 型 `BandColor` | タスクグループレーンの色 | 同上 |
| `figure` | 線先が付くタスク図形の部分（予定バー・実績バー・マイルストーンマーク） | `JDG-3348`: 描いた物は Graphic |

| 案 | 中身 |
|---|---|
| **a（推奨）** | `anchor` → `leaderAnchor`、`CommentBoxAnchor` → `LeaderAnchor`、`AnchorFallback` → `LeaderAnchorFallback`、`bandFraction` → `laneFraction`、`BandColor` → `LaneColor`、`figure` → `graphicPart` |
| b | 用語とぶつかる `band` と `figure` だけ直し、`anchor` は今のまま（コメントボックスの中なので取り違えない） |
| c | 全部今のまま |

**推奨の理由**: 説明文はもう Leader Anchor・Task Group Lane・Task Graphic と書いています。キーが別の語だと、AI が説明とキーを結び付けられません。

回答:

---

## 問 3. 見せる・隠すのキー —— 描く物の名に合わせるか

**場面**: `documentSettings` の `is...Visible` は、描く物ごとに見せるか隠すかを持ちます。今のキーは、用語で決めた描く物の名と合っていないものがあります。

| 今のキー | 何を見せるか | 案の名 |
|---|---|---|
| `isProgressMarkerVisible` | 進捗マークと再開マーク | `isProgressMarkVisible`（`JDG-3372` で Marker をやめた。直す必要がある） |
| `isDependencyVisible` | 依存線 | `isDependencyLineVisible` |
| `isAssigneeVisible` | 担当ラベル | `isAssigneeLabelVisible` |
| `isPercentCompleteVisible` | 完了率ラベル | `isPercentCompleteLabelVisible` |
| `isBaselineVisible` | 変更前予定輪郭 | `isBaselineOutlineVisible` |
| `isPlanVisible` | 予定バー | `isPlanBarVisible` |
| `isActualVisible` | 実績バー | `isActualBarVisible` |

| 案 | 中身 |
|---|---|
| **a（推奨）** | 7 つとも右の欄の名にする |
| b | 退いた語（Marker）を含む `isProgressMarkerVisible` だけ直す |

**推奨の理由**: キーが描く物の名と同じなら、画面のどれを隠すキーかが名だけで読めます。`isDateGridLinesVisible`・`isGroupGridLinesVisible`・`isProgressLineVisible` はもう描く物の名です。

回答:

---

## 問 4. 表の見せ方のキー —— 窓の名

**場面**: `documentSettings.tableViews` は、3 つの表の窓ごとに、絞り込みや並べ方を持ちます。キーの名は、窓の古い名のままです。

| 今のキー | 窓の名（`JDG-3356`） | 案の名 |
|---|---|---|
| `searchPanel` | Search Window | `searchWindow` |
| `resourceList` | Resource List Window | `resourceListWindow` |
| `delayDiagnosticsReport` | Delay Diagnostics Report Window | `delayDiagnosticsReportWindow` |

| 案 | 中身 |
|---|---|
| **a（推奨）** | 3 つとも右の欄の名にする |
| b | `searchPanel` だけ `searchWindow` にする（Panel は Task Group Panel・Properties Panel のための語なので） |
| c | 今のまま |

**推奨の理由**: 3 つとも窓の名に合わせると、同じ規則で読めます。`Panel` は 1 枚目の木で 2 つのパネルにだけ使うと決めました。

回答:

---

## 問 5. `taskVisuals` —— タスクの描き方の入れ物

**場面**: `taskVisuals`（型 `TaskVisual`）は、タスクごとに、形（`taskShape`・`milestoneShape`）・色・枠の太さを持ちます。用語では、描いた物を `Task Graphic`（タスク図形）、選ぶ形の種類を Shape と決めました（`JDG-3348`）。Visual は用語集にありません。

| 案 | 中身 |
|---|---|
| **a（推奨）** | `taskVisuals` → `taskGraphicStyles`、`TaskVisual` → `TaskGraphicStyle` —— タスク図形の描き方（スタイル）であって、描いた物そのものではない |
| b | `taskGraphics` / `TaskGraphic` —— 用語の名をそのまま使う |
| c | 今のまま |

**推奨の理由**: 中身は描き方の設定で、描いた物ではありません。Style を付けると、`Task Graphic` と取り違えません。B は「描いた物を保存している」と読まれるおそれがあります。

回答:

---

---

## 自由欄

木を見て、ほかに直したい名や問いたいことがあれば、ここに書いてください。

回答:
