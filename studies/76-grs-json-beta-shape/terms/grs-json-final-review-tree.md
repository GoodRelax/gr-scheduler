# GRS JSON β の最終レビューのツリー（列挙の値まで）

持ち主の裁定 `JDG-3717` の 2.「GRS JSON のツリー（列挙型の場合は各パラメータ名も）を作成」の成果。土台は `grs-json-beta-tree.md`（`JDG-3713` で持ち主が ok、`JDG-3714`・`JDG-3715` で並べ替え）に、未決を決めた `JDG-3720`〜`JDG-3726`（GRS のスカラーを `scheduleData` の先頭へ、描く物を `scheduleCanvasElements` に束ねる、表の列の名）と、最終レビューの裁定（`JDG-3727` から）を当てた物。列挙のキーの下に、各値を 1 行ずつ置いた。

- 印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`[G]` は、MSPDI と往復する実体の中にある GRS 特有の値。`[]` は配列、`->` は「共通の型」を指す。
- 値: `"…"` は文字列の値、数だけの行は MSPDI の数の符号（数のまま書く）。
- 判別子: 「判別子」と書いた `type` は、その値が持つ欄の組を選ぶ。判別子の値の行の右の括弧（例「（fixed）」）は、その欄がどの値のときだけあるかを言う。
- 数: キー 290、値 150（`python schema_to_review_tree.py count` で数えた。部分の頭の `documentSettings`・`scheduleData` の再掲を含む）。
- 行番号: 各行の頭の `R001`〜`R440` は、持ち主の GQA と外の AI の質問状で同じ行を指す番号。2026-11-23 に `JDG-3758` で `lastMspdiImport` の 3 行（R108〜R110）を足したので、R111 から後ろは 3 つずれた。BGQA6 と外の AI の質問状の R 番号は、コミット b1a515deb の版を指す。
- 正: このツリーは生成物である（`JDG-3756`）。キー・順・列挙の値は β のスキーマ `grs-json-beta.schema.json` から、日本語の欄は `grs-json-beta-tree-labels-ja.tsv` から、`python schema_to_review_tree.py write` で作る。直すときはスキーマか TSV を直して作り直し、`python schema_to_review_tree.py check` で差を見る。2026-11-23 までの正だった `grs-json-final-review-tree.src.txt` と `grs-json-final-review-tree.py` は退けた（コミット b1a515deb までの履歴にある）。

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
R108  +- lastMspdiImport                              最後の MSPDI の取り込み（取り込むたびに上書き。一度も取り込んでいなければ無い）
R109  |  +- importedAt                                取り込んだ時（UTC）
R110  |  +- fileName                                  取り込んだファイルの名（フォルダーを除く）
R111  +- highestIssuedUid                             uid の数え手（GRS が出した最も大きい uid）
R112  +- project [M]                                  プロジェクト（1 件）
R113  |  +- uid [M]                                   一意な識別子（文字列）
R114  |  +- name [M]                                  プロジェクト名
R115  |  +- title [M]                                 タイトル
R116  |  +- subject [M]                               件名
R117  |  +- category [M]                              分類
R118  |  +- company [M]                               会社
R119  |  +- manager [M]                               管理者
R120  |  +- author [M]                                作成者
R121  |  +- creationDate [M]                          作った日時
R122  |  +- revision [M]                              保存した回数
R123  |  +- startDate [M]                             開始の日時
R124  |  +- calendarUid [M]                           稼働日を数える暦
R125  |  +- defaultStartTime [M]                      既定の開始時刻
R126  |  +- defaultFinishTime [M]                     既定の終了時刻
R127  |  +- minutesPerDay [M]                         1 日の稼働の分
R128  |  +- minutesPerWeek [M]                        1 週の稼働の分
R129  |  +- daysPerMonth [M]                          1 か月の稼働日
R130  |  +- weekStartDay [M]                          週の始まりの曜日
R131  |  |  +- 0                                      日曜
R132  |  |  +- 1                                      月曜
R133  |  |  +- 2                                      火曜
R134  |  |  +- 3                                      水曜
R135  |  |  +- 4                                      木曜
R136  |  |  +- 5                                      金曜
R137  |  |  +- 6                                      土曜
R138  |  +- statusDate [M]                            基準日
R139  |  +- grs [G]                                   GRS の値
R140  |     +- passthrough                            持ち越した MSPDI の値（MSPDI の構造と名のまま）
R141  +- calendars[] [M]                              暦
R142  |  +- uid [M]                                   一意な識別子
R143  |  +- name [M]                                  暦の名
R144  |  +- isBaseCalendar [M]                        基本の暦か
R145  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
R146  |  +- grs [G]                                   GRS の値
R147  |  |  +- passthrough                            持ち越した MSPDI の値
R148  |  +- weekDays[] [M]                            曜日ごとの稼働
R149  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
R150  |  |  |  +- 1                                   日曜
R151  |  |  |  +- 2                                   月曜
R152  |  |  |  +- 3                                   火曜
R153  |  |  |  +- 4                                   水曜
R154  |  |  |  +- 5                                   木曜
R155  |  |  |  +- 6                                   金曜
R156  |  |  |  +- 7                                   土曜
R157  |  |  +- dayWorking [M]                         稼働日か
R158  |  |  +- grs [G]                                GRS の値
R159  |  |  |  +- passthrough                         持ち越した MSPDI の値
R160  |  |  +- workingTimes[] [M]                     稼働の時間帯
R161  |  |     +- fromTime [M]                        始まりの時刻
R162  |  |     +- toTime [M]                          終わりの時刻
R163  |  +- exceptions[] [M]                          例外の日
R164  |     +- name [M]                               例外の名
R165  |     +- fromDate [M] (TimePeriod/FromDate)     最初の日
R166  |     +- toDate [M] (TimePeriod/ToDate)         最後の日
R167  |     +- dayWorking [M]                         稼働日か
R168  |     +- type [M]                               例外の繰り返し方（判別子ではない）
R169  |     |  +- 1                                   毎日
R170  |     |  +- 2                                   毎年、月の何日
R171  |     |  +- 3                                   毎年、月の第何何曜日
R172  |     |  +- 4                                   毎月、何日
R173  |     |  +- 5                                   毎月、第何何曜日
R174  |     |  +- 6                                   毎週
R175  |     |  +- 7                                   何日ごと
R176  |     |  +- 8                                   何稼働日ごと
R177  |     |  +- 9                                   繰り返さない
R178  |     +- period [M]                             繰り返しの間隔
R179  |     +- grs [G]                                GRS の値
R180  |     |  +- passthrough                         持ち越した MSPDI の値
R181  |     +- workingTimes[] [M]                     稼働の時間帯
R182  |        +- fromTime [M]                        始まりの時刻
R183  |        +- toTime [M]                          終わりの時刻
R184  +- passthroughCalendars[]                       GRS が暦にしない MSPDI の要素
R185  |  +- precedingCalendarUid                      前にある、いちばん近い暦の uid（先頭では書かない）
R186  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R187  +- tasks[] [M]                                  タスク
R188  |  +- uid [M]                                   一意な識別子
R189  |  +- name [M]                                  タスク名
R190  |  +- start [M]                                 予定の開始
R191  |  +- finish [M]                                予定の終了
R192  |  +- stop [M]                                  作業が止まった時
R193  |  +- resume [M]                                再開の予定
R194  |  +- resumeValid [M]                           再開日が有効か
R195  |  +- milestone [M]                             マイルストーンか
R196  |  +- percentComplete [M]                       完了率
R197  |  +- actualStart [M]                           実績の開始
R198  |  +- actualFinish [M]                          実績の終了
R199  |  +- calendarUid [M]                           タスクの暦
R200  |  +- deadline [M]                              期限
R201  |  +- hyperlink [M]                             リンクのタイトル
R202  |  +- hyperlinkAddress [M]                      リンク先の URL
R203  |  +- notes [M]                                 メモ
R204  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
R205  |  +- siblingIndex [G]                          兄弟の中で何番目か（0 から）
R206  |  +- grs [G]                                   タスクに付く GRS の値
R207  |  |  +- startSlopeCalendarDays                 開始の傾き（開始の端を斜めに落とす暦日。確定していない日付）
R208  |  |  +- finishSlopeCalendarDays                終了の傾き（終了の端を斜めに落とす暦日。確定していない日付）
R209  |  |  +- style                                  見た目（型 TaskStyle）
R210  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
R211  |  |  |  |  +- "rectangle"                      矩形
R212  |  |  |  |  +- "chevron"                        矢羽根
R213  |  |  |  |  +- "arrow"                          矢印
R214  |  |  |  |  +- "dumbbell"                       ダンベル（両端に点のある細い線）
R215  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
R216  |  |  |  |  +- "circle"                         円
R217  |  |  |  |  +- "hexagon"                        六角形
R218  |  |  |  |  +- "pentagon"                       五角形
R219  |  |  |  |  +- "diamond"                        ひし形
R220  |  |  |  |  +- "square"                         正方形
R221  |  |  |  |  +- "star"                           星
R222  |  |  |  |  +- "triangleUp"                     上向きの三角
R223  |  |  |  |  +- "triangleDown"                   下向きの三角
R224  |  |  |  |  +- "file"                           書類
R225  |  |  |  |  +- "box"                            箱
R226  |  |  |  |  +- "floppyDisk"                     フロッピーディスク
R227  |  |  |  |  +- "cylinder"                       円柱
R228  |  |  |  |  +- "meetingPeople"                  会議の人々
R229  |  |  |  |  +- "smilingFace"                    笑顔
R230  |  |  |  |  +- "beerMug"                        ビールジョッキ
R231  |  |  |  +- fill                                塗り -> Paint
R232  |  |  |  +- stroke                              縁 -> Stroke
R233  |  |  +- taskGroupId                            載せるタスクグループ
R234  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
R235  |  |  |  +- sourceProjectUid                    元のファイルの Project の UID
R236  |  |  |  +- sourceTaskUid                       元のファイルでの、このタスクの UID
R237  |  |  |  +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
R238  |  |  |  +- mspdiImportCountWhenLastIncluded    このタスクを最後に含んでいた取り込みが何回目か
R239  |  |  +- passthrough                            持ち越した MSPDI の値
R240  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
R241  |     +- predecessorUid [M]                     先行タスク
R242  |     +- type [M]                               依存の種類（判別子ではない）
R243  |     |  +- 0                                   FF 終了から終了
R244  |     |  +- 1                                   FS 終了から開始
R245  |     |  +- 2                                   SF 開始から終了
R246  |     |  +- 3                                   SS 開始から開始
R247  |     +- linkLag [M]                            ラグ（0.1 分単位）
R248  |     +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
R249  |     |  +- 3                                   m 分
R250  |     |  +- 4                                   em
R251  |     |  +- 5                                   h 時間
R252  |     |  +- 6                                   eh
R253  |     |  +- 7                                   d 日
R254  |     |  +- 8                                   ed
R255  |     |  +- 9                                   w 週
R256  |     |  +- 10                                  ew
R257  |     |  +- 11                                  mo 月
R258  |     |  +- 12                                  emo
R259  |     |  +- 19                                  % 割合
R260  |     |  +- 20                                  e%
R261  |     |  +- 35..44                              m? .. emo?（見積り）
R262  |     |  +- 51                                  %?
R263  |     |  +- 52                                  e%?
R264  |     +- grs [G]                                GRS の値
R265  |        +- passthrough                         持ち越した MSPDI の値
R266  +- passthroughTasks[]                           GRS がタスクにしない MSPDI の要素
R267  |  +- precedingTaskUid                          前にある、いちばん近いタスクの uid（先頭では書かない）
R268  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R269  +- resources[] [M]                              担当
R270  |  +- uid [M]                                   一意な識別子
R271  |  +- name [M]                                  担当の名
R272  |  +- type [M]                                  資材か作業か（判別子ではない）
R273  |  |  +- 0                                      資材
R274  |  |  +- 1                                      作業
R275  |  +- isCostResource [M]                        コストの担当か
R276  |  +- calendarUid [M]                           担当の暦
R277  |  +- grs [G]                                   GRS の値
R278  |     +- passthrough                            持ち越した MSPDI の値
R279  +- passthroughResources[]                       GRS が担当にしない MSPDI の要素
R280  |  +- precedingResourceUid                      前にある、いちばん近い担当の uid（先頭では書かない）
R281  |  +- mspdiElement                              MSPDI の要素（構造と名のまま）
R282  +- assignments[] [M]                            割当
R283  |  +- uid [M]                                   一意な識別子
R284  |  +- taskUid [M]                               就くタスク
R285  |  +- resourceUid [M]                           就く担当
R286  |  +- grs [G]                                   GRS の値
R287  |     +- passthrough                            持ち越した MSPDI の値
R288  +- passthroughAssignments[]                     GRS が割当にしない MSPDI の要素
R289     +- precedingAssignmentUid                    前にある、いちばん近い割当の uid（先頭では書かない）
R290     +- mspdiElement                              MSPDI の要素（構造と名のまま）
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R291  scheduleData                        スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R292  +- taskGroups[]                     タスクグループ
R293  |  +- id                            一意な UUID
R294  |  +- name                          タスクグループ名
R295  |  +- parentTaskGroupId             親のタスクグループ（最上位では書かない）
R296  |  +- siblingIndex                  兄弟の中で何番目か（0 から）
R297  |  +- style                         見た目（型 TaskGroupStyle）
R298  |  |  +- color                      帯の色 -> TaskGroupColor
R299  |  +- minHeightPx                   帯の最も低い高さ
R300  |  +- representativeTaskUid         この帯を代表する WBS のタスク
R301  |  +- hyperlinkAddress              リンク先の URL
R302  |  +- hyperlink                     リンクのタイトル
R303  |  +- showMode                      この帯を出すかの意図（書かなければ automatic。hidden と hiddenUntilZoomIn は配下も隠す）
R304  |  |  +- "shown"                    出す（人が出すと選んだ。深さに依らず描く。祖先が隠していれば隠れる）
R305  |  |  +- "hidden"                   しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R306  |  |  +- "automatic"                規則に任せる（深さ・ピン・出ている配下への道で決まる）
R307  |  |  +- "hiddenUntilZoomIn"        拡大まで隠す（配下も隠れる。次の縦のズームインで automatic に変わる）
R308  |  +- allowedEditorGroupName        編集してよい組の名
R309  +- baselineTasks[]                  前回予定
R310  |  +- uid                           今のタスクの uid
R311  |  +- name                          タスク名
R312  |  +- start                         前回予定の開始
R313  |  +- finish                        前回予定の終了
R314  |  +- milestone                     マイルストーンか
R315  +- highlightBoxes[]                 ハイライトボックス
R316  |  +- id                            一意な UUID
R317  |  +- style                         見た目（型 HighlightBoxStyle）
R318  |  |  +- cornerRadiusPx             角の丸みの半径
R319  |  |  +- fill                       塗り -> Paint
R320  |  |  +- stroke                     枠 -> Stroke
R321  |  +- firstDay                      最初の日
R322  |  +- lastDay                       最後の日
R323  |  +- firstTaskGroupId              覆う最初の帯（両端を含む）
R324  |  +- lastTaskGroupId               覆う最後の帯（両端を含む）
R325  +- commentBoxes[]                   コメントボックス
R326     +- id                            一意な UUID
R327     +- text                          文
R328     +- style                         見た目（型 CommentBoxStyle）
R329     |  +- fill                       箱の塗り -> Paint
R330     |  +- stroke                     枠と引出し線 -> Stroke
R331     |  +- font                       文字の見た目
R332     |     +- color                   文字の色 -> Color
R333     |     +- sizePx                  文字の大きさ
R334     +- leaderTarget                  引出し線の先
R335     |  +- type                       判別子
R336     |  |  +- "freePoint"             何にも付かない点
R337     |  |  +- "task"                  タスクの図形
R338     |  |  +- "highlightBox"          ハイライトボックス
R339     |  +- dateTime                   時点（freePoint）
R340     |  +- taskGroupId                帯（freePoint）
R341     |  +- taskGroupTopOffsetPercent  帯の中の高さ（上の縁から %）（freePoint）
R342     |  +- taskUid                    タスク（task）
R343     |  +- snapPart                   吸着する図形の部分（task）
R344     |  |  +- "planBar"               予定バー
R345     |  |  +- "actualBar"             実績バー
R346     |  |  +- "milestoneMark"         マイルストーンマーク
R347     |  +- highlightBoxId             箱（highlightBox）
R348     |  +- snapPoint                  吸着する 8 点の 1 つ（task・highlightBox）
R349     |     +- "topLeftCorner"         左上の角
R350     |     +- "topMiddle"             上の辺の中点
R351     |     +- "topRightCorner"        右上の角
R352     |     +- "rightMiddle"           右の辺の中点
R353     |     +- "bottomRightCorner"     右下の角
R354     |     +- "bottomMiddle"          下の辺の中点
R355     |     +- "bottomLeftCorner"      左下の角
R356     |     +- "leftMiddle"            左の辺の中点
R357     +- bodyOffsetPx                  線先から箱へのずれ
R358     |  +- dx                         横のずれ
R359     |  +- dy                         縦のずれ
R360     +- hyperlinkAddress              リンク先の URL
R361     +- hyperlink                     リンクのタイトル
```

### 共通の型（-> で指す物）

```text
R362  Color                                      色
R363  +- type                                    判別子
R364  |  +- "theme"                              テーマの色に従う
R365  |  +- "palette"                            パレットの 10 色の 1 つ
R366  |  +- "custom"                             人が選んだ色
R367  +- name                                    パレットの色の名（palette。明るいテーマでの見え方の名）
R368  |  +- "white"                              白
R369  |  +- "black"                              黒
R370  |  +- "dimGray"                            濃い灰色
R371  |  +- "lightGray"                          薄い灰色
R372  |  +- "red"                                赤
R373  |  +- "blue"                               青
R374  |  +- "yellow"                             黄
R375  |  +- "green"                              緑
R376  |  +- "orange"                             橙
R377  |  +- "purple"                             紫
R378  +- light                                   明るいテーマの側（custom）
R379  |  +- hexColor                             色の値（#rrggbb）
R380  |  +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
R381  +- dark                                    暗いテーマの側（custom）
R382     +- hexColor                             色の値（#rrggbb）
R383     +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
R384  TaskGroupColor                             帯の色（Color と同じ形。palette の black を除く）
R385  Paint                                      塗り
R386  +- color                                   色 -> Color
R387  +- opacityPercent                          不透明度（%）
R388  Stroke                                     線（描かないときは書かない）
R389  +- color                                   色 -> Color
R390  +- opacityPercent                          不透明度（%）
R391  +- widthPx                                 太さ
R392  ShapeStyle                                 形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R393  +- fill                                    塗り -> Paint
R394  +- stroke                                  線 -> Stroke
R395  ColumnFilter                               列のフィルタ
R396  +- type                                    判別子
R397  |  +- "values"                             値で絞る
R398  |  +- "dateRange"                          日の範囲で絞る
R399  +- column                                  列（列が見せる値の名）
R400  |  +- "progressStatus"                     検索・タスク: ステータス（進捗ステータス）
R401  |  +- "percentComplete"                    検索・タスク、遅延診断: 進捗
R402  |  +- "taskType"                           検索・タスク、遅延診断: タスク種別（タスクかマイルストーンか）
R403  |  +- "taskName"                           検索・タスク、遅延診断: タスク（マイルストーン）
R404  |  +- "resourceNames"                      検索・タスク、遅延診断: 担当名（そのタスクのすべての担当）
R405  |  +- "start"                              検索・タスク: 予定開始
R406  |  +- "finish"                             検索・タスク: 予定終了
R407  |  +- "actualStart"                        検索・タスク: 実績開始
R408  |  +- "actualFinish"                       検索・タスク: 実績終了
R409  |  +- "taskGroupPath"                      検索・タスク: 最上位までの階層
R410  |  +- "text"                               検索・コメントボックス: 本文
R411  |  +- "taskGroupName"                      検索・コメントボックス: 線先が立つタスクグループの名
R412  |  +- "leaderTargetDay"                    検索・コメントボックス: 線先が立つ日
R413  |  +- "diagnosisStatus"                    遅延診断: ステータス（診断の結果）
R414  |  +- "planDates"                          遅延診断: 予定日（開始〜終了）
R415  |  +- "actualDates"                        遅延診断: 実績日（開始〜終了）
R416  |  +- "diagnosisReason"                    遅延診断: 理由
R417  |  +- "resourceSelectionStatus"            担当リスト: 選択（その担当を選んでいるか）
R418  |  +- "resourceName"                       担当リスト: 担当名
R419  |  +- "assignedTaskCount"                  担当リスト: 担当タスク数
R420  |  +- "assignedTaskNames"                  担当リスト: 担当タスク
R421  +- hiddenValues[]                          隠す値（values）。状態の列は用語集の英語の名（例 finished・delay・task・selected、JDG-3735）、ほかの列はセルの値
R422  +- isBlankHidden                           空の行を隠すか（values）
R423  +- firstDay                                最初の日（dateRange）
R424  +- lastDay                                 最後の日（dateRange）
R425  ColumnSort                                 並べ替え
R426  +- column                                  列（ColumnFilter.column と同じ値）
R427  +- direction                               向き
R428     +- "ascending"                          小さい順
R429     +- "descending"                         大きい順
R430  TaskTableWindow                            タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R431  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックしたタスクだけを描く）
R432  +- checkedTaskUids[]                       チェックしたタスク
R433  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R434  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
R435  ResourceTableWindow                        担当の表の見せ方（担当リスト）
R436  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックした担当のタスクだけを描く）
R437  +- isUnassignedChecked                     （担当なし）の行をチェックしたか
R438  +- checkedResourceUids[]                   チェックした担当
R439  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R440  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
```

