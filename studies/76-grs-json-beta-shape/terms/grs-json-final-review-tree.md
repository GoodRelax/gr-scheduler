# GRS JSON β の最終レビューのツリー（列挙の値まで）

持ち主の裁定 `JDG-3717` の 2.「GRS JSON のツリー（列挙型の場合は各パラメータ名も）を作成」の成果。土台は `grs-json-beta-tree.md`（`JDG-3713` で持ち主が ok、`JDG-3714`・`JDG-3715` で並べ替え）に、未決を決めた `JDG-3720`〜`JDG-3726`（GRS のスカラーを `scheduleData` の先頭へ、描く物を `scheduleCanvasElements` に束ねる、表の列の名）と、最終レビューの裁定（`JDG-3727` から）を当てた物。列挙のキーの下に、各値を 1 行ずつ置いた。

- 印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`[G]` は、MSPDI と往復する実体の中にある GRS 特有の値。`[]` は配列、`->` は「共通の型」を指す。
- 値: `"…"` は文字列の値、数だけの行は MSPDI の数の符号（数のまま書く）。
- 判別子: 「判別子」と書いた `type` は、その値が持つ欄の組を選ぶ。判別子の値の行の右の括弧（例「（fixed）」）は、その欄がどの値のときだけあるかを言う。
- 数: キー 287、値 150（`python grs-json-final-review-tree.py count` で数えた。部分の頭の `documentSettings`・`scheduleData` の再掲を含む）。
- 行番号: 各行の頭の `R001`〜`R437` は、持ち主の GQA と外の AI の質問状で同じ行を指す番号。
- 正: このツリーは `grs-json-final-review-tree.src.txt` から `grs-json-final-review-tree.py ja-num` で作る。直すときは src を直して作り直す。

### 根と帳簿

```text
R001  ScheduleDocument             GRS JSON の 1 ファイル
R002  +- $schema                   スキーマの所（URL）
R003  +- schemaVersionUtc          スキーマの版（形が最後に変わった UTC の時刻）
R004  +- buildVersionUtc           書いた GRS のビルドの版（UTC の時刻）
R005  +- documentStamp             文書刻印
R006  |  +- scheduleDataUpdatedAt  データが変わった時（UTC）
R007  |  +- documentUpdatedAt      文書が変わった時（UTC）
R008  |  +- fileSavedAt            保存した時（UTC。初めて保存するまでは無い）
R009  |  +- lastEditedBy           最後に編集した者（型 Editor）
R010  |     +- type                判別子
R011  |     |  +- "user"           人が画面で編集した
R012  |     |  +- "template"       まだ誰も編集していない（ひな形のまま）
R013  |     |  +- "agent"          AI が Agent API で編集した
R014  |     +- name                編集した者の名（agent は AI が名乗った名、user は GRS が知るときだけ）
R015  +- documentSettings          文書設定（下の「文書設定」）
R016  +- scheduleData              スケジュールデータ（下の 2 つの群）
R017  +- changeLogEntries[]        変更履歴
R018     +- changedAt              変更の時（UTC）
R019     +- changedBy              変更した者
R020     |  +- editorType          書き手の種類（GRS が自動で書く。判別子ではない）
R021     |  |  +- "user"           人が画面で書いた行
R022     |  |  +- "agent"          AI が Agent API で書いた行
R023     |  +- name                人が打った名か、AI が名乗った名
R024     +- affectedArea           及んだ部分
R025     +- changeDescription      何が変わったか
R026     +- reason                 理由
R027     +- remarks                そのほか
```

### 文書設定

```text
R028  documentSettings                              文書設定（効く範囲の広い順）
R029  +- displayScaleRatio                          表示の倍率（1 が等倍）
R030  +- fontSizePreset                             文字の大きさの段
R031  |  +- "small"                                 小
R032  |  +- "medium"                                中
R033  |  +- "large"                                 大
R034  +- isThemeMonochrome                          モノクロか
R035  +- themeHue                                   テーマの色相の名
R036  |  +- "blue"                                  青
R037  |  +- "blueGreen"                             青緑
R038  |  +- "green"                                 緑
R039  |  +- "yellowGreen"                           黄緑
R040  |  +- "yellow"                                黄
R041  |  +- "orange"                                橙
R042  |  +- "red"                                   赤
R043  |  +- "redPurple"                             赤紫
R044  |  +- "purple"                                紫
R045  |  +- "indigo"                                藍
R046  +- viewTimeZone                               表示の基準タイムゾーン
R047  |  +- type                                    判別子
R048  |  |  +- "sameAsScheduleData"                 データの時差と同じ
R049  |  |  +- "fixed"                              決まった差を使う
R050  |  +- utcOffset                               UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
R051  +- additionalTimeZones[]                      追加の時計（4 つまで）
R052  |  +- utcOffset                               UTC との差（"+09:00" の形）
R053  |  +- zoneNameType                            出すゾーンの名の種類（差 utcOffset はもう夏時間の分を含む）
R054  |     +- "standard"                           標準時の名
R055  |     +- "daylight"                           夏時間の名
R056  +- isTimeOfDayVisible                         時刻を見せるか（文書の全体の時刻の見せ方）
R057  +- dayWidthPx                                 暦日 1 日の幅
R058  +- fitDayRange                                全体表示期間
R059  |  +- type                                    判別子
R060  |  |  +- "fixed"                              決まった期間
R061  |  |  +- "automatic"                          描ける物すべての範囲（期間を持たない）
R062  |  +- firstDay                                最初の日（fixed）
R063  |  +- lastDay                                 最後の日（fixed）
R064  +- verticalZoom                               縦のズーム
R065  |  +- ratio                                   縦の倍率（1 が既定）
R066  |  +- automaticallyShownDepth                 automatic の帯を、この深さまで出す（1〜maxGroupDepth）
R067  +- taskGroupPanelWidthPx                      タスクグループパネルの幅（倍率 1 のときの CSS ピクセル）
R068  +- isTaskGroupPanelWidthFixed                 幅を固定するか
R069  +- pinnedTaskGroupIds[]                       ピン止めしたタスクグループの id
R070  +- taskPlacementDirection                     帯の中で、重なるタスクを日付の早い順に置く向き
R071  |  +- "bottomToTop"                           下から上へ
R072  |  +- "topToBottom"                           上から下へ
R073  +- scrollPosition                             開いたときの位置
R074  |  +- type                                    判別子
R075  |  |  +- "automatic"                          位置を決めていない（GRS が決める）
R076  |  |  +- "fixed"                              下の 4 つの値で決める
R077  |  +- leftEdgeDay                             左の端の日（fixed）
R078  |  +- leftEdgeDayOffsetPercent                左の端が、その日の始まりから何 % の所か（fixed）
R079  |  +- topEdgeTaskGroupId                      上の端の帯（fixed）
R080  |  +- topEdgeTaskGroupOffsetPercent           上の端が、その帯の上から何 % の所か（fixed）
R081  +- scheduleCanvasElements                     Schedule Canvas に描く物
R082  |  +- isPlanBarVisible                        予定バーを見せるか
R083  |  +- isActualBarVisible                      実績バーを見せるか
R084  |  +- isBaselineOutlineVisible                前回予定を重ねるか（前回予定輪郭）
R085  |  +- isAssigneeLabelVisible                  担当のラベルを見せるか
R086  |  +- isPercentCompleteLabelVisible           完了率のラベルを見せるか
R087  |  +- isProgressStatusMarkVisible             進捗ステータスマークと再開マークを見せるか
R088  |  +- isPlanDatesVisible                      予定の日付を見せるか
R089  |  +- isDependencyLineVisible                 依存線を見せるか
R090  |  +- isProgressLineVisible                   イナズマ線を見せるか
R091  |  +- isDateGridLinesVisible                  日の罫線を見せるか
R092  |  +- isTaskGroupGridLinesVisible             タスクグループ罫線（タスクグループの境の横線）を見せるか
R093  +- delayDiagnosisSettings                     遅延診断の設定
R094  |  +- parentTaskProgressToleranceWorkingDays  遅延診断が親タスクの進み具合に許す幅（稼働日）
R095  +- tableWindows                               3 つの表の見せ方
R096     +- searchWindow                            検索ウィンドウ -> TaskTableWindow
R097     +- delayDiagnosisReportWindow              遅延診断レポート -> TaskTableWindow
R098     +- resourceListWindow                      担当リスト -> ResourceTableWindow
```

### スケジュールデータ（頭の値と、MSPDI と往復する群）

```text
R099  scheduleData                                    スケジュールデータ（頭の値と、MSPDI と往復する群）
R100  +- scheduleDataTimeZone                         データの日時の時差
R101  |  +- utcOffset                                 UTC との差（"+09:00" の形。標準時の行だけ）
R102  +- sourceFormat                                 元の形式
R103  |  +- "grs"                                     GRS JSON
R104  |  +- "mspdi12"                                 MSPDI（Project の版 12 の形）
R105  |  +- "mspdi15"                                 MSPDI（Project の版 15 の形）
R106  +- importedTopTaskOutlineLevel                  取り込んだファイルの、最上位のタスクの OutlineLevel
R107  +- mspdiImportCount                             MSPDI を取り込んだ回数
R108  +- highestIssuedUid                             uid の数え手（GRS が出した最も大きい uid）
R109  +- project [M]                                  プロジェクト（1 件）
R110  |  +- uid [M]                                   一意な識別子（文字列）
R111  |  +- name [M]                                  プロジェクト名
R112  |  +- title [M]                                 タイトル
R113  |  +- subject [M]                               件名
R114  |  +- category [M]                              分類
R115  |  +- company [M]                               会社
R116  |  +- manager [M]                               管理者
R117  |  +- author [M]                                作成者
R118  |  +- creationDate [M]                          作った日時
R119  |  +- revision [M]                              保存した回数
R120  |  +- startDate [M]                             開始の日時
R121  |  +- calendarUid [M]                           稼働日を数える暦
R122  |  +- defaultStartTime [M]                      既定の開始時刻
R123  |  +- defaultFinishTime [M]                     既定の終了時刻
R124  |  +- minutesPerDay [M]                         1 日の稼働の分
R125  |  +- minutesPerWeek [M]                        1 週の稼働の分
R126  |  +- daysPerMonth [M]                          1 か月の稼働日
R127  |  +- weekStartDay [M]                          週の始まりの曜日
R128  |  |  +- 0                                      日曜
R129  |  |  +- 1                                      月曜
R130  |  |  +- 2                                      火曜
R131  |  |  +- 3                                      水曜
R132  |  |  +- 4                                      木曜
R133  |  |  +- 5                                      金曜
R134  |  |  +- 6                                      土曜
R135  |  +- statusDate [M]                            基準日
R136  |  +- grs [G]                                   GRS の値
R137  |     +- passthrough                            持ち越した MSPDI の値（MSPDI の構造と名のまま）
R138  +- calendars[] [M]                              暦
R139  |  +- uid [M]                                   一意な識別子
R140  |  +- name [M]                                  暦の名
R141  |  +- isBaseCalendar [M]                        基本の暦か
R142  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
R143  |  +- grs [G]                                   GRS の値
R144  |  |  +- passthrough                            持ち越した MSPDI の値
R145  |  +- weekDays[] [M]                            曜日ごとの稼働
R146  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
R147  |  |  |  +- 1                                   日曜
R148  |  |  |  +- 2                                   月曜
R149  |  |  |  +- 3                                   火曜
R150  |  |  |  +- 4                                   水曜
R151  |  |  |  +- 5                                   木曜
R152  |  |  |  +- 6                                   金曜
R153  |  |  |  +- 7                                   土曜
R154  |  |  +- dayWorking [M]                         稼働日か
R155  |  |  +- grs [G]                                GRS の値
R156  |  |  |  +- passthrough                         持ち越した MSPDI の値
R157  |  |  +- workingTimes[] [M]                     稼働の時間帯
R158  |  |     +- fromTime [M]                        始まりの時刻
R159  |  |     +- toTime [M]                          終わりの時刻
R160  |  +- exceptions[] [M]                          例外の日
R161  |     +- name [M]                               例外の名
R162  |     +- fromDate [M] (TimePeriod/FromDate)     最初の日
R163  |     +- toDate [M] (TimePeriod/ToDate)         最後の日
R164  |     +- dayWorking [M]                         稼働日か
R165  |     +- type [M]                               例外の繰り返し方（判別子ではない）
R166  |     |  +- 1                                   毎日
R167  |     |  +- 2                                   毎年、月の何日
R168  |     |  +- 3                                   毎年、月の第何何曜日
R169  |     |  +- 4                                   毎月、何日
R170  |     |  +- 5                                   毎月、第何何曜日
R171  |     |  +- 6                                   毎週
R172  |     |  +- 7                                   何日ごと
R173  |     |  +- 8                                   何稼働日ごと
R174  |     |  +- 9                                   繰り返さない
R175  |     +- period [M]                             繰り返しの間隔
R176  |     +- grs [G]                                GRS の値
R177  |     |  +- passthrough                         持ち越した MSPDI の値
R178  |     +- workingTimes[] [M]                     稼働の時間帯
R179  |        +- fromTime [M]                        始まりの時刻
R180  |        +- toTime [M]                          終わりの時刻
R181  +- passthroughCalendars[]                       GRS が暦にしない MSPDI の要素
R182  |  +- precedingCalendarUid                      前にある、いちばん近い暦の uid（先頭では書かない）
R183  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R184  +- tasks[] [M]                                  タスク
R185  |  +- uid [M]                                   一意な識別子
R186  |  +- name [M]                                  タスク名
R187  |  +- start [M]                                 予定の開始
R188  |  +- finish [M]                                予定の終了
R189  |  +- stop [M]                                  作業が止まった時
R190  |  +- resume [M]                                再開の予定
R191  |  +- resumeValid [M]                           再開日が有効か
R192  |  +- milestone [M]                             マイルストーンか
R193  |  +- percentComplete [M]                       完了率
R194  |  +- actualStart [M]                           実績の開始
R195  |  +- actualFinish [M]                          実績の終了
R196  |  +- calendarUid [M]                           タスクの暦
R197  |  +- deadline [M]                              期限
R198  |  +- hyperlink [M]                             リンクのタイトル
R199  |  +- hyperlinkAddress [M]                      リンク先の URL
R200  |  +- notes [M]                                 メモ
R201  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
R202  |  +- siblingOrder [G]                          兄弟の中の順
R203  |  +- grs [G]                                   タスクに付く GRS の値
R204  |  |  +- startSlopeCalendarDays                 開始の傾き（開始の端を斜めに落とす暦日。確定していない日付）
R205  |  |  +- finishSlopeCalendarDays                終了の傾き（終了の端を斜めに落とす暦日。確定していない日付）
R206  |  |  +- style                                  見た目（型 TaskStyle）
R207  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
R208  |  |  |  |  +- "rectangle"                      矩形
R209  |  |  |  |  +- "chevron"                        矢羽根
R210  |  |  |  |  +- "arrow"                          矢印
R211  |  |  |  |  +- "dumbbell"                       ダンベル（両端に点のある細い線）
R212  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
R213  |  |  |  |  +- "circle"                         円
R214  |  |  |  |  +- "hexagon"                        六角形
R215  |  |  |  |  +- "pentagon"                       五角形
R216  |  |  |  |  +- "diamond"                        ひし形
R217  |  |  |  |  +- "square"                         正方形
R218  |  |  |  |  +- "star"                           星
R219  |  |  |  |  +- "triangleUp"                     上向きの三角
R220  |  |  |  |  +- "triangleDown"                   下向きの三角
R221  |  |  |  |  +- "file"                           書類
R222  |  |  |  |  +- "box"                            箱
R223  |  |  |  |  +- "floppyDisk"                     フロッピーディスク
R224  |  |  |  |  +- "cylinder"                       円柱
R225  |  |  |  |  +- "meetingPeople"                  会議の人々
R226  |  |  |  |  +- "smilingFace"                    笑顔
R227  |  |  |  |  +- "beerMug"                        ビールジョッキ
R228  |  |  |  +- fill                                塗り -> Paint
R229  |  |  |  +- stroke                              縁 -> Stroke
R230  |  |  +- taskGroupId                            載せるタスクグループ
R231  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
R232  |  |  |  +- sourceProjectUid                    元のファイルの Project の UID
R233  |  |  |  +- sourceTaskUid                       元のファイルでの、このタスクの UID
R234  |  |  |  +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
R235  |  |  |  +- mspdiImportCountWhenLastIncluded    このタスクを最後に含んでいた取り込みが何回目か
R236  |  |  +- passthrough                            持ち越した MSPDI の値
R237  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
R238  |     +- predecessorUid [M]                     先行タスク
R239  |     +- type [M]                               依存の種類（判別子ではない）
R240  |     |  +- 0                                   FF 終了から終了
R241  |     |  +- 1                                   FS 終了から開始
R242  |     |  +- 2                                   SF 開始から終了
R243  |     |  +- 3                                   SS 開始から開始
R244  |     +- linkLag [M]                            ラグ（0.1 分単位）
R245  |     +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
R246  |     |  +- 3                                   m 分
R247  |     |  +- 4                                   em
R248  |     |  +- 5                                   h 時間
R249  |     |  +- 6                                   eh
R250  |     |  +- 7                                   d 日
R251  |     |  +- 8                                   ed
R252  |     |  +- 9                                   w 週
R253  |     |  +- 10                                  ew
R254  |     |  +- 11                                  mo 月
R255  |     |  +- 12                                  emo
R256  |     |  +- 19                                  % 割合
R257  |     |  +- 20                                  e%
R258  |     |  +- 35..44                              m? .. emo?（見積り）
R259  |     |  +- 51                                  %?
R260  |     |  +- 52                                  e%?
R261  |     +- grs [G]                                GRS の値
R262  |        +- passthrough                         持ち越した MSPDI の値
R263  +- passthroughTasks[]                           GRS がタスクにしない MSPDI の要素
R264  |  +- precedingTaskUid                          前にある、いちばん近いタスクの uid（先頭では書かない）
R265  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R266  +- resources[] [M]                              担当
R267  |  +- uid [M]                                   一意な識別子
R268  |  +- name [M]                                  担当の名
R269  |  +- type [M]                                  資材か作業か（判別子ではない）
R270  |  |  +- 0                                      資材
R271  |  |  +- 1                                      作業
R272  |  +- isCostResource [M]                        コストの担当か
R273  |  +- calendarUid [M]                           担当の暦
R274  |  +- grs [G]                                   GRS の値
R275  |     +- passthrough                            持ち越した MSPDI の値
R276  +- passthroughResources[]                       GRS が担当にしない MSPDI の要素
R277  |  +- precedingResourceUid                      前にある、いちばん近い担当の uid（先頭では書かない）
R278  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R279  +- assignments[] [M]                            割当
R280  |  +- uid [M]                                   一意な識別子
R281  |  +- taskUid [M]                               就くタスク
R282  |  +- resourceUid [M]                           就く担当
R283  |  +- grs [G]                                   GRS の値
R284  |     +- passthrough                            持ち越した MSPDI の値
R285  +- passthroughAssignments[]                     GRS が割当にしない MSPDI の要素
R286     +- precedingAssignmentUid                    前にある、いちばん近い割当の uid（先頭では書かない）
R287     +- mspdiElement                              MSPDI の要素（構造と名のまま）
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R288  scheduleData                        スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R289  +- taskGroups[]                     タスクグループ
R290  |  +- id                            一意な UUID
R291  |  +- name                          タスクグループ名
R292  |  +- parentTaskGroupId             親のタスクグループ（最上位では書かない）
R293  |  +- siblingOrder                  兄弟の中の順
R294  |  +- style                         見た目（型 TaskGroupStyle）
R295  |  |  +- color                      帯の色 -> TaskGroupColor
R296  |  +- minHeightPx                   帯の最も低い高さ
R297  |  +- representativeTaskUid         この帯を代表する WBS のタスク
R298  |  +- hyperlinkAddress              リンク先の URL
R299  |  +- hyperlink                     リンクのタイトル
R300  |  +- showMode                      この帯を出すかの意図（書かなければ automatic。hidden と hiddenUntilZoomIn は配下も隠す）
R301  |  |  +- "shown"                    出す（人が出すと選んだ。深さに依らず描く。祖先が隠していれば隠れる）
R302  |  |  +- "hidden"                   しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R303  |  |  +- "automatic"                規則に任せる（深さ・ピン・出ている配下への道で決まる）
R304  |  |  +- "hiddenUntilZoomIn"        拡大まで隠す（配下も隠れる。次の縦のズームインで automatic に変わる）
R305  |  +- allowedEditorGroupName        編集してよい組の名
R306  +- baselineTasks[]                  前回予定
R307  |  +- uid                           今のタスクの uid
R308  |  +- name                          タスク名
R309  |  +- start                         前回予定の開始
R310  |  +- finish                        前回予定の終了
R311  |  +- milestone                     マイルストーンか
R312  +- highlightBoxes[]                 ハイライトボックス
R313  |  +- id                            一意な UUID
R314  |  +- style                         見た目（型 HighlightBoxStyle）
R315  |  |  +- cornerRadiusPx             角の丸みの半径
R316  |  |  +- fill                       塗り -> Paint
R317  |  |  +- stroke                     枠 -> Stroke
R318  |  +- firstDay                      最初の日
R319  |  +- lastDay                       最後の日
R320  |  +- firstTaskGroupId              覆う最初の帯（両端を含む）
R321  |  +- lastTaskGroupId               覆う最後の帯（両端を含む）
R322  +- commentBoxes[]                   コメントボックス
R323     +- id                            一意な UUID
R324     +- text                          文
R325     +- style                         見た目（型 CommentBoxStyle）
R326     |  +- fill                       箱の塗り -> Paint
R327     |  +- stroke                     枠と引出し線 -> Stroke
R328     |  +- font                       文字の見た目
R329     |     +- color                   文字の色 -> Color
R330     |     +- sizePx                  文字の大きさ
R331     +- leaderTarget                  引出し線の先
R332     |  +- type                       判別子
R333     |  |  +- "freePoint"             何にも付かない点
R334     |  |  +- "task"                  タスクの図形
R335     |  |  +- "highlightBox"          ハイライトボックス
R336     |  +- dateTime                   時点（freePoint）
R337     |  +- taskGroupId                帯（freePoint）
R338     |  +- taskGroupTopOffsetPercent  帯の中の高さ（上の縁から %）（freePoint）
R339     |  +- taskUid                    タスク（task）
R340     |  +- snapPart                   吸着する図形の部分（task）
R341     |  |  +- "planBar"               予定バー
R342     |  |  +- "actualBar"             実績バー
R343     |  |  +- "milestoneMark"         マイルストーンマーク
R344     |  +- highlightBoxId             箱（highlightBox）
R345     |  +- snapPoint                  吸着する 8 点の 1 つ（task・highlightBox）
R346     |     +- "topLeftCorner"         左上の角
R347     |     +- "topMiddle"             上の辺の中点
R348     |     +- "topRightCorner"        右上の角
R349     |     +- "rightMiddle"           右の辺の中点
R350     |     +- "bottomRightCorner"     右下の角
R351     |     +- "bottomMiddle"          下の辺の中点
R352     |     +- "bottomLeftCorner"      左下の角
R353     |     +- "leftMiddle"            左の辺の中点
R354     +- bodyOffsetPx                  線先から箱へのずれ
R355     |  +- dx                         横のずれ
R356     |  +- dy                         縦のずれ
R357     +- hyperlinkAddress              リンク先の URL
R358     +- hyperlink                     リンクのタイトル
```

### 共通の型（-> で指す物）

```text
R359  Color                                      色
R360  +- type                                    判別子
R361  |  +- "theme"                              テーマの色に従う
R362  |  +- "palette"                            パレットの 10 色の 1 つ
R363  |  +- "custom"                             人が選んだ色
R364  +- name                                    パレットの色の名（palette。明るいテーマでの見え方の名）
R365  |  +- "white"                              白
R366  |  +- "black"                              黒
R367  |  +- "dimGray"                            濃い灰色
R368  |  +- "lightGray"                          薄い灰色
R369  |  +- "red"                                赤
R370  |  +- "blue"                               青
R371  |  +- "yellow"                             黄
R372  |  +- "green"                              緑
R373  |  +- "orange"                             橙
R374  |  +- "purple"                             紫
R375  +- light                                   明るいテーマの側（custom）
R376  |  +- hexColor                             色の値（#rrggbb）
R377  |  +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
R378  +- dark                                    暗いテーマの側（custom）
R379     +- hexColor                             色の値（#rrggbb）
R380     +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
R381  TaskGroupColor                             帯の色（Color と同じ形。palette の black を除く）
R382  Paint                                      塗り
R383  +- color                                   色 -> Color
R384  +- opacityPercent                          不透明度（%）
R385  Stroke                                     線（描かないときは書かない）
R386  +- color                                   色 -> Color
R387  +- opacityPercent                          不透明度（%）
R388  +- widthPx                                 太さ
R389  ShapeStyle                                 形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R390  +- fill                                    塗り -> Paint
R391  +- stroke                                  線 -> Stroke
R392  ColumnFilter                               列のフィルタ
R393  +- type                                    判別子
R394  |  +- "values"                             値で絞る
R395  |  +- "dateRange"                          日の範囲で絞る
R396  +- column                                  列（列が見せる値の名）
R397  |  +- "progressStatus"                     検索・タスク: ステータス（進捗ステータス）
R398  |  +- "percentComplete"                    検索・タスク、遅延診断: 進捗
R399  |  +- "taskType"                           検索・タスク、遅延診断: タスク種別（タスクかマイルストーンか）
R400  |  +- "taskName"                           検索・タスク、遅延診断: タスク（マイルストーン）
R401  |  +- "resourceNames"                      検索・タスク、遅延診断: 担当名（そのタスクのすべての担当）
R402  |  +- "start"                              検索・タスク: 予定開始
R403  |  +- "finish"                             検索・タスク: 予定終了
R404  |  +- "actualStart"                        検索・タスク: 実績開始
R405  |  +- "actualFinish"                       検索・タスク: 実績終了
R406  |  +- "taskGroupPath"                      検索・タスク: 最上位までの階層
R407  |  +- "text"                               検索・コメントボックス: 本文
R408  |  +- "taskGroupName"                      検索・コメントボックス: 線先が立つタスクグループの名
R409  |  +- "leaderTargetDay"                    検索・コメントボックス: 線先が立つ日
R410  |  +- "diagnosisStatus"                    遅延診断: ステータス（診断の結果）
R411  |  +- "planDates"                          遅延診断: 予定日（開始〜終了）
R412  |  +- "actualDates"                        遅延診断: 実績日（開始〜終了）
R413  |  +- "diagnosisReason"                    遅延診断: 理由
R414  |  +- "resourceSelectionStatus"            担当リスト: 選択（その担当を選んでいるか）
R415  |  +- "resourceName"                       担当リスト: 担当名
R416  |  +- "assignedTaskCount"                  担当リスト: 担当タスク数
R417  |  +- "assignedTaskNames"                  担当リスト: 担当タスク
R418  +- hiddenValues[]                          隠す値（values）。状態の列は用語集の英語の名（例 finished・delay・task・selected、JDG-3735）、ほかの列はセルの値
R419  +- isBlankHidden                           空の行を隠すか（values）
R420  +- firstDay                                最初の日（dateRange）
R421  +- lastDay                                 最後の日（dateRange）
R422  ColumnSort                                 並べ替え
R423  +- column                                  列（ColumnFilter.column と同じ値）
R424  +- direction                               向き
R425     +- "ascending"                          小さい順
R426     +- "descending"                         大きい順
R427  TaskTableWindow                            タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R428  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックしたタスクだけを描く）
R429  +- checkedTaskUids[]                       チェックしたタスク
R430  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R431  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
R432  ResourceTableWindow                        担当の表の見せ方（担当リスト）
R433  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックした担当のタスクだけを描く）
R434  +- isUnassignedChecked                     （担当なし）の行をチェックしたか
R435  +- checkedResourceUids[]                   チェックした担当
R436  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R437  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
```

