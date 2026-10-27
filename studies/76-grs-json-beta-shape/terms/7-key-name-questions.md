# GRS JSON のキー名 —— 全部のキーの木

> **/grsmd-qa の使い方**
> - 「回答:」の後ろに、選択肢の文字（a, b …）か自由な文を書き、保存してから、チャットで「更新した」と伝えてください。
> - 🔄 と*斜体*は、前回から変わった所です（`f` で 🔄 を検索すると順に飛べます）。初版には付きません。
> - 強調したい所には ★ を付けてかまいません。

2026-10-27 に作り、2026-10-28 に作り直した（日本語の名を足し、問は 9 番の紙へ移した）。β の GRS JSON の形（`CR-851` を当てた後）の 302 個のキーを全部並べた。`MSPDI` の印は MSPDI と同じ名と意味のキーで、MSPDI に合わせるので、ふつうは変えない。

---

## 決まったこと

| 問 | 決め | 裁定 |
|---|---|---|

---

## 全体の木

🔄 *左から、キー名・日本語の名・備考。日本語の名は席の案で、直したい所は ★ を付けて直に書き換えてよい。備考の `← 古い名` は今のスキーマから名が変わるもの、`JDG-338x` はキー名の裁定（`9-grs-only-key-questions.md`）で決めた名。`(kind x)` は `kind` の値で形が分かれるときの、その形の中のキー。*

**文書の木**（スキーマのいちばん上から）

```text
🔄 $schema                             スキーマアドレス
🔄 schemaVersion                       スキーマ版
🔄 buildVersion                        ビルド版
🔄 scheduleData                        スケジュールデータ          ← schedule  JDG-3380
🔄 +- project                          プロジェクト                MSPDI
🔄 +- calendars                        カレンダー                  MSPDI
🔄 +- tasks                            タスク                      MSPDI
🔄 +- resources                        担当                        MSPDI
🔄 +- assignments                      割当                        MSPDI
🔄 +- taskGroups                       タスクグループ
🔄 +- taskGroupMembers                 タスクグループ所属
🔄 +- taskGraphicStyles                タスク図形設定              ← taskVisuals  JDG-3384
🔄 +- taskOrigins                      タスク取込元
🔄 +- baselineTasks                    変更前予定タスク
🔄 +- commentBoxes                     コメントボックス
🔄 +- highlightBoxes                   ハイライトボックス
🔄 documentSettings                    文書設定
🔄 +- displayScalePercent              表示倍率                    ← displayScale
🔄 +- fontSizeStep                     文字サイズ段階
🔄 +- dayWidthPx                       1日幅                       ← zoomX
🔄 +- verticalZoomRatio                縦拡大率                    ← zoomY
🔄 +- taskGroupAutoExpandDepth         自動展開深さ
🔄 +- scrollPosition                   スクロール位置
🔄 |  +- (every kind)                  （どの種類でも）
🔄 |  |  +- kind                       種類
🔄 |  +- (kind placed)                 （種類が placed のとき）
🔄 |     +- leftEdgeDay                左端日                      ← scrollDate
🔄 |     +- leftEdgeDayFraction        左端日端数                  ← scrollDateFraction
🔄 |     +- topEdgeTaskGroupId         上端タスクグループID        ← scrollTaskGroupId
🔄 |     +- topEdgeTaskGroupFraction   上端タスクグループ端数      ← scrollTaskGroupFraction
🔄 +- fitSpan                          全体表示期間
🔄 |  +- firstDay                      初日                        ← fitSpanStart
🔄 |  +- lastDay                       末日                        ← fitSpanFinish
🔄 |  +- isFixed                       固定                        ← isFitSpanFixed
🔄 +- viewTimeZone                     表示タイムゾーン
🔄 |  +- (every kind)                  （どの種類でも）
🔄 |  |  +- kind                       種類
🔄 |  +- (kind fixed)                  （種類が fixed のとき）
🔄 |     +- offset                     UTCオフセット
🔄 +- displayTimeZones                 追加タイムゾーン
🔄 |  +- offset                        UTCオフセット
🔄 |  +- season                        標準夏時間区分
🔄 +- isTimeOfDayVisible               時刻表示
🔄 +- isPlanBarVisible                 予定バー表示                ← isPlanVisible  JDG-3382
🔄 +- isPlanDatesVisible               予定日付表示
🔄 +- isActualBarVisible               実績バー表示                ← isActualVisible  JDG-3382
🔄 +- isPercentCompleteLabelVisible    完了率ラベル表示            ← isPercentCompleteVisible  JDG-3382
🔄 +- isBaselineOutlineVisible         変更前予定輪郭表示          ← isBaselineVisible  JDG-3382
🔄 +- isProgressLineVisible            イナズマ線表示
🔄 +- isProgressMarkVisible            進捗マーク表示              ← isProgressMarkerVisible  JDG-3382
🔄 +- isDependencyLineVisible          依存線表示                  ← isDependencyVisible  JDG-3382
🔄 +- isAssigneeLabelVisible           担当ラベル表示              ← isAssigneeVisible  JDG-3382
🔄 +- isDateGridLinesVisible           日付罫線表示
🔄 +- isGroupGridLinesVisible          グループ罫線表示
🔄 +- stackDirection                   積み方向
🔄 +- isThemeMonochrome                モノクロテーマ
🔄 +- taskGroupPanelWidthPx            タスクグループパネル幅
🔄 +- isTaskGroupPanelWidthFixed       タスクグループパネル幅固定
🔄 +- levelZeroTreeState               レベル0木状態
🔄 +- pinnedTaskGroupIds               ピン止めタスクグループID
🔄 +- tableViews                       表表示設定
🔄    +- searchWindow                  検索ウィンドウ              ← searchPanel  JDG-3383
🔄    |  +- isScheduleFilterApplied    スケジュールフィルター適用
🔄    |  +- shownTaskUids              表示タスクID
🔄    |  +- columnFilters              列フィルター
🔄    |  +- sort                       並べ替え
🔄    +- delayDiagnosticsReportWindow  遅延診断レポートウィンドウ  ← delayDiagnosticsReport  JDG-3383
🔄    |  +- isScheduleFilterApplied    スケジュールフィルター適用
🔄    |  +- shownTaskUids              表示タスクID
🔄    |  +- columnFilters              列フィルター
🔄    |  +- sort                       並べ替え
🔄    +- resourceListWindow            担当リストウィンドウ        ← resourceList  JDG-3383
🔄       +- isScheduleFilterApplied    スケジュールフィルター適用
🔄       +- shownResourceUids          表示担当ID
🔄       +- isUnassignedShown          担当なし行表示
🔄       +- columnFilters              列フィルター
🔄       +- sort                       並べ替え
🔄 documentStamp                       文書スタンプ
🔄 changeLogEntries                    変更記録                    ← changeLog
```

**型の木**（`$defs`）

```text
   Project                                    プロジェクト                    MSPDI
   +- id                                      プロジェクトID                  MSPDI
   +- calendarUid                             カレンダーID                    MSPDI
   +- name                                    プロジェクト名                  MSPDI
   +- title                                   プロジェクトタイトル            MSPDI
   +- subject                                 件名                            MSPDI
   +- category                                分類                            MSPDI
   +- company                                 会社名                          MSPDI
   +- manager                                 管理者名                        MSPDI
   +- author                                  作成者                          MSPDI
   +- revision                                改訂番号                        MSPDI
   +- creationDate                            作成日時                        MSPDI
   +- startDate                               開始日                          MSPDI
   +- statusDate                              基準日                          MSPDI
   +- scheduleDataTimeZone                    スケジュールデータタイムゾーン
   +- minutesPerDay                           1日あたり分数                   MSPDI
   +- minutesPerWeek                          1週間あたり分数                 MSPDI
   +- daysPerMonth                            1か月あたり日数                 MSPDI
   +- weekStartDay                            週開始曜日                      MSPDI
   +- defaultStartTime                        既定開始時刻                    MSPDI
   +- defaultFinishTime                       既定終了時刻                    MSPDI
   +- themeHueDegrees                         テーマ色相                      ← themeHue
   +- parentTaskProgressToleranceWorkingDays  親タスク進捗許容日数            ← parentTaskProgressToleranceDays
   +- highestIssuedUid                        発番済み最大ID                  ← uidHighWaterMark
   +- lastImportNumber                        最終取込番号                    ← importSequence
   +- firstOutlineLevel                       開始アウトラインレベル          ← outlineBase
   +- sourceFormat                            元形式
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   Calendar                                   カレンダー                      MSPDI
   +- uid                                     カレンダーID                    MSPDI
   +- baseCalendarUid                         継承元カレンダーID              MSPDI
   +- ordinal                                 出現順
   +- name                                    カレンダー名                    MSPDI
   +- isBaseCalendar                          基準カレンダー                  MSPDI
   +- weekDays                                曜日別稼働                      MSPDI
   +- exceptions                              例外日                          MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   WeekDay                                    曜日別稼働                      MSPDI
   +- ordinal                                 出現順
   +- dayType                                 曜日                            MSPDI
   +- dayWorking                              稼働日                          MSPDI
   +- workingTimes                            稼働時間帯                      MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   Exception                                  例外日                          MSPDI
   +- ordinal                                 出現順
   +- name                                    例外名                          MSPDI
   +- fromDate                                開始日                          MSPDI
   +- toDate                                  終了日                          MSPDI
   +- dayWorking                              稼働日                          MSPDI
   +- recurrenceKind                          繰り返し種類                    MSPDI
   +- recurrencePeriod                        繰り返し間隔                    MSPDI
   +- workingTimes                            稼働時間帯                      MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   WorkingTime                                稼働時間帯                      MSPDI
   +- ordinal                                 出現順
   +- fromTime                                開始時刻                        MSPDI
   +- toTime                                  終了時刻                        MSPDI
   Task                                       タスク                          MSPDI
   +- uid                                     タスクID                        MSPDI
   +- parentTaskUid                           親タスクID
   +- calendarUid                             タスクカレンダーID              MSPDI
   +- siblingOrder                            兄弟順                          ← wbsOrder
   +- name                                    タスク名                        MSPDI
   +- notes                                   備考                            MSPDI
   +- start                                   予定開始                        MSPDI
   +- finish                                  予定終了                        MSPDI
   +- milestone                               マイルストーン                  MSPDI
   +- deadline                                期限                            MSPDI
   +- actualStart                             実績開始                        MSPDI
   +- stop                                    実績停止                        MSPDI
   +- actualFinish                            実績終了                        MSPDI
   +- resume                                  再開日                          MSPDI
   +- resumeValid                             再開日確定                      MSPDI
   +- percentComplete                         完了率                          MSPDI
   +- fadeInCalendarDays                      開始側フェード日数              ← fadeInDays
   +- fadeOutCalendarDays                     終了側フェード日数              ← fadeOutDays
   +- hyperlinkAddress                        ハイパーリンクアドレス          MSPDI
   +- hyperlink                               ハイパーリンク名                MSPDI
   +- dependencies                            依存関係                        MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   Dependency                                 依存関係                        MSPDI
   +- predecessorUid                          先行タスクID                    MSPDI
   +- linkType                                依存種類                        MSPDI
   +- linkLag                                 ラグ                            MSPDI
   +- lagFormat                               ラグ単位                        MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   Resource                                   担当                            MSPDI
   +- uid                                     担当ID                          MSPDI
   +- calendarUid                             担当カレンダーID                MSPDI
   +- name                                    担当名                          MSPDI
   +- resourceKind                            担当種類                        MSPDI
   +- isCostResource                          費用担当                        MSPDI
   +- passthroughValues                       持ち越し値                      ← carry
   +- passthroughElements                     持ち越し要素                    ← carryElements
   Assignment                                 割当                            MSPDI
   +- uid                                     割当ID                          MSPDI
   +- taskUid                                 タスクID                        MSPDI
   +- resourceUid                             担当ID                          MSPDI
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
🔄 TaskGraphicStyle                           タスク図形設定                  ← TaskVisual  JDG-3384
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
🔄 +- leaderAnchor                            線先                            ← anchor  JDG-3381
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
🔄 LeaderAnchor                               線先                            ← CommentBoxAnchor  JDG-3381
   +- (every kind)                            （どの種類でも）
   |  +- kind                                 種類
   +- (kind freePoint)                        （種類が freePoint のとき）
   |  +- dateTime                             日時                            ← anchorDate
   |  +- taskGroupId                          タスクグループID                ← anchorTaskGroupId
🔄 |  +- laneFraction                         レーン内高さ                    ← anchorBandFraction  JDG-3381
   +- (kind task)                             （種類が task のとき）
   |  +- taskUid                              タスクID                        ← anchorTaskUid
🔄 |  +- graphicPart                          吸着先図形                      ← anchorTaskFigure  JDG-3381
   |  +- point                                吸着点                          ← anchorSnapPoint
   |  +- fallback                             代替位置
   +- (kind highlightBox)                     （種類が highlightBox のとき）
      +- point                                吸着点                          ← anchorSnapPoint
      +- highlightBoxId                       ハイライトボックスID            ← anchorHighlightBoxId
      +- fallback                             代替位置
🔄 LeaderAnchorFallback                       線先代替位置                    ← AnchorFallback  JDG-3381
   +- taskGroupId                             タスクグループID                ← anchorTaskGroupId
🔄 +- laneFraction                            レーン内高さ                    ← anchorBandFraction  JDG-3381
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
🔄 +- scheduleDataUpdatedAt                   スケジュールデータ更新時刻      ← scheduleUpdatedAt  JDG-3380
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
🔄 LaneColor                                  レーン色                        ← BandColor  JDG-3381
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

## 自由欄

用語とぶつかるキーの問は `9-grs-only-key-questions.md` にあります。この木を見て、ほかに直したい名や問いたいことがあれば、ここに書いてください。

回答:
