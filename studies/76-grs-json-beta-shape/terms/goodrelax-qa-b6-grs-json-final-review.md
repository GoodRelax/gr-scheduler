BGQA6

# GRS JSON の最終レビュー —— 持ち主の目視

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA6 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

作った日: 2026-11-22（GRS JSON の最終レビューの席）

残 6（❓ で検索）

見る点（`JDG-3718`）: いちばん大事なのは「名を見て、一発で、誤解なく意味が分かるか」。親の名と続けて読めるか、列挙の値が値だけで読めるか、同じ語が同じ意味かも見てください。右の日本語は席が書いた意図です。名と意図が食い違う所も書いてください。

答え方: 引っかかった名だけを、`行番号 名: どう迷ったか`（例 `R337 highestIssuedUid: …`）の形で 1 行ずつ書いてください。無ければ「なし」と書いてください。

***

## 決定事項

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| レビューの観点 | V-1〜V-9（`grs-json-final-review-viewpoints.md`） | `JDG-3718` |
| 持ち主の目視の形 | この GQA で、ツリーを 5 つの部分に分けて見る。外の AI のレビューと並べて進める | `JDG-3719` |

***

## QA

#### ❓ 問 1. 根と帳簿

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
R014  |     +- name                AI が名乗った名（agent のときだけ）
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

回答:

#### ❓ 問 2. 文書設定

```text
R028  documentSettings                     文書設定（効く範囲の広い順）
R029  +- displayScaleRatio                 表示の倍率（1 が等倍）
R030  +- fontSizePreset                    文字の大きさの段
R031  |  +- "small"                        小
R032  |  +- "medium"                       中
R033  |  +- "large"                        大
R034  +- isThemeMonochrome                 モノクロか
R035  +- themeHue                          テーマの色相の名
R036  |  +- "blue"                         青
R037  |  +- "blueGreen"                    青緑
R038  |  +- "green"                        緑
R039  |  +- "yellowGreen"                  黄緑
R040  |  +- "yellow"                       黄
R041  |  +- "orange"                       橙
R042  |  +- "red"                          赤
R043  |  +- "redPurple"                    赤紫
R044  |  +- "purple"                       紫
R045  |  +- "indigo"                       藍
R046  +- viewTimeZone                      表示の基準タイムゾーン
R047  |  +- type                           判別子
R048  |  |  +- "sameAsScheduleData"        データの時差と同じ
R049  |  |  +- "fixed"                     決まった差を使う
R050  |  +- utcOffset                      UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
R051  +- displayTimeZones[]                追加の時計（4 つまで）
R052  |  +- utcOffset                      UTC との差（"+09:00" の形）
R053  |  +- zoneNameType                   出すゾーンの名の種類（差 utcOffset はもう夏時間の分を含む）
R054  |     +- "standard"                  標準時の名
R055  |     +- "daylight"                  夏時間の名
R056  +- dayWidthPx                        暦日 1 日の幅
R057  +- fitDayRange                       全体表示期間
R058  |  +- type                           判別子
R059  |  |  +- "fixed"                     決まった期間
R060  |  |  +- "automatic"                 描ける物すべての範囲（期間を持たない）
R061  |  +- firstDay                       最初の日（fixed）
R062  |  +- lastDay                        最後の日（fixed）
R063  +- verticalZoom                      縦のズーム
R064  |  +- ratio                          縦の倍率（1 が既定）
R065  |  +- automaticallyShownDepth        automatic の帯を、この深さまで出す（1〜maxGroupDepth）
R066  +- taskGroupPanelWidthPx             タスクグループパネルの幅（倍率 1 のときの CSS ピクセル）
R067  +- isTaskGroupPanelWidthFixed        幅を固定するか
R068  +- pinnedTaskGroupIds[]              ピン止めしたタスクグループの id
R069  +- taskStackDirection                帯の中でタスクを積む向き
R070  |  +- "bottomToTop"                  下から上へ
R071  |  +- "topToBottom"                  上から下へ
R072  +- scrollPosition                    開いたときの位置
R073  |  +- type                           判別子
R074  |  |  +- "automatic"                 位置を決めていない（GRS が決める）
R075  |  |  +- "fixed"                     下の 4 つの値で決める
R076  |  +- leftEdgeDay                    左の端の日（fixed）
R077  |  +- leftEdgeDayOffsetPercent       左の端が、その日の始まりから何 % の所か（fixed）
R078  |  +- topEdgeTaskGroupId             上の端の帯（fixed）
R079  |  +- topEdgeTaskGroupOffsetPercent  上の端が、その帯の上から何 % の所か（fixed）
R080  +- isTimeOfDayVisible                時刻を見せるか
R081  +- isPlanBarVisible                  予定バーを見せるか
R082  +- isPlanDatesVisible                予定の日付を見せるか
R083  +- isActualBarVisible                実績バーを見せるか
R084  +- isPercentCompleteLabelVisible     完了率のラベルを見せるか
R085  +- isBaselineOutlineVisible          前回予定を重ねるか（前回予定輪郭）
R086  +- isProgressLineVisible             進捗線を見せるか
R087  +- isProgressMarkVisible             進捗マークを見せるか
R088  +- isDependencyLineVisible           依存線を見せるか
R089  +- isAssigneeLabelVisible            担当のラベルを見せるか
R090  +- isDateGridLinesVisible            日の罫線を見せるか
R091  +- isGroupGridLinesVisible           グループ罫線（タスクグループの境の横線）を見せるか
R092  +- delayDiagnosisSettings            遅延診断の設定
R093  |  +- toleranceWorkingDays           遅延診断が親タスクの進み具合に許す幅（稼働日）
R094  +- tableWindows                      3 つの表の見せ方
R095     +- searchWindow                   検索ウィンドウ -> TaskTableWindow
R096     +- delayDiagnosisReportWindow     遅延診断レポート -> TaskTableWindow
R097     +- resourceListWindow             担当リスト -> ResourceTableWindow
```

回答:

#### ❓ 問 3. スケジュールデータ（MSPDI と往復する群）

`[M]` の名は MSPDI の要素の名なので、改名しません（範囲の外）。迷う名は、迷い方を書いてください。席がスキーマの説明の文で補います。

```text
R098  scheduleData                                    スケジュールデータ（MSPDI と往復する群）
R099  +- project [M]                                  プロジェクト（1 件）
R100  |  +- uid [M]                                   一意な識別子（文字列）
R101  |  +- name [M]                                  プロジェクト名
R102  |  +- title [M]                                 タイトル
R103  |  +- subject [M]                               件名
R104  |  +- category [M]                              分類
R105  |  +- company [M]                               会社
R106  |  +- manager [M]                               管理者
R107  |  +- author [M]                                作成者
R108  |  +- revision [M]                              保存した回数
R109  |  +- creationDate [M]                          作った日時
R110  |  +- startDate [M]                             開始の日時
R111  |  +- statusDate [M]                            基準日
R112  |  +- minutesPerDay [M]                         1 日の稼働の分
R113  |  +- minutesPerWeek [M]                        1 週の稼働の分
R114  |  +- daysPerMonth [M]                          1 か月の稼働日
R115  |  +- weekStartDay [M]                          週の始まりの曜日
R116  |  |  +- 0                                      日曜
R117  |  |  +- 1                                      月曜
R118  |  |  +- 2                                      火曜
R119  |  |  +- 3                                      水曜
R120  |  |  +- 4                                      木曜
R121  |  |  +- 5                                      金曜
R122  |  |  +- 6                                      土曜
R123  |  +- defaultStartTime [M]                      既定の開始時刻
R124  |  +- defaultFinishTime [M]                     既定の終了時刻
R125  |  +- calendarUid [M]                           稼働日を数える暦
R126  |  +- passthrough [G]                           持ち越した MSPDI の値（MSPDI の構造と名のまま）
R127  +- calendars[] [M]                              暦
R128  |  +- uid [M]                                   一意な識別子
R129  |  +- name [M]                                  暦の名
R130  |  +- isBaseCalendar [M]                        基本の暦か
R131  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
R132  |  +- weekDays[] [M]                            曜日ごとの稼働
R133  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
R134  |  |  |  +- 1                                   日曜
R135  |  |  |  +- 2                                   月曜
R136  |  |  |  +- 3                                   火曜
R137  |  |  |  +- 4                                   水曜
R138  |  |  |  +- 5                                   木曜
R139  |  |  |  +- 6                                   金曜
R140  |  |  |  +- 7                                   土曜
R141  |  |  +- dayWorking [M]                         稼働日か
R142  |  |  +- workingTimes[] [M]                     稼働の時間帯
R143  |  |  |  +- fromTime [M]                        始まりの時刻
R144  |  |  |  +- toTime [M]                          終わりの時刻
R145  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R146  |  +- exceptions[] [M]                          例外の日
R147  |  |  +- name [M]                               例外の名
R148  |  |  +- fromDate [M] (TimePeriod/FromDate)     最初の日
R149  |  |  +- toDate [M] (TimePeriod/ToDate)         最後の日
R150  |  |  +- dayWorking [M]                         稼働日か
R151  |  |  +- type [M]                               例外の繰り返し方（判別子ではない）
R152  |  |  |  +- 1                                   毎日
R153  |  |  |  +- 2                                   毎年、月の何日
R154  |  |  |  +- 3                                   毎年、月の第何何曜日
R155  |  |  |  +- 4                                   毎月、何日
R156  |  |  |  +- 5                                   毎月、第何何曜日
R157  |  |  |  +- 6                                   毎週
R158  |  |  |  +- 7                                   何日ごと
R159  |  |  |  +- 8                                   何稼働日ごと
R160  |  |  |  +- 9                                   繰り返さない
R161  |  |  +- period [M]                             繰り返しの間隔
R162  |  |  +- workingTimes[] [M]                     稼働の時間帯
R163  |  |  |  +- fromTime [M]                        始まりの時刻
R164  |  |  |  +- toTime [M]                          終わりの時刻
R165  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R166  |  +- passthrough [G]                           持ち越した MSPDI の値
R167  +- tasks[] [M]                                  タスク
R168  |  +- uid [M]                                   一意な識別子
R169  |  +- name [M]                                  タスク名
R170  |  +- notes [M]                                 メモ
R171  |  +- start [M]                                 予定の開始
R172  |  +- finish [M]                                予定の終了
R173  |  +- milestone [M]                             マイルストーンか
R174  |  +- deadline [M]                              期限
R175  |  +- actualStart [M]                           実績の開始
R176  |  +- stop [M]                                  作業が止まった時
R177  |  +- actualFinish [M]                          実績の終了
R178  |  +- resume [M]                                再開の予定
R179  |  +- resumeValid [M]                           再開日が有効か
R180  |  +- percentComplete [M]                       完了率
R181  |  +- calendarUid [M]                           タスクの暦
R182  |  +- hyperlinkAddress [M]                      リンク先の URL
R183  |  +- hyperlink [M]                             リンクのタイトル
R184  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
R185  |  +- siblingOrder [G]                          兄弟の中の順
R186  |  +- grs [G]                                   タスクに付く GRS の値
R187  |  |  +- fadeInCalendarDays                     始まりのフェード暦日
R188  |  |  +- fadeOutCalendarDays                    終わりのフェード暦日
R189  |  |  +- style                                  見た目（型 TaskStyle）
R190  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
R191  |  |  |  |  +- "rectangle"                      矩形
R192  |  |  |  |  +- "chevron"                        矢羽根
R193  |  |  |  |  +- "arrow"                          矢印
R194  |  |  |  |  +- "dumbbell"                       ダンベル（両端に点のある細い線）
R195  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
R196  |  |  |  |  +- "circle"                         円
R197  |  |  |  |  +- "hexagon"                        六角形
R198  |  |  |  |  +- "pentagon"                       五角形
R199  |  |  |  |  +- "diamond"                        ひし形
R200  |  |  |  |  +- "square"                         正方形
R201  |  |  |  |  +- "star"                           星
R202  |  |  |  |  +- "triangleUp"                     上向きの三角
R203  |  |  |  |  +- "triangleDown"                   下向きの三角
R204  |  |  |  |  +- "file"                           書類
R205  |  |  |  |  +- "box"                            箱
R206  |  |  |  |  +- "floppyDisk"                     フロッピーディスク
R207  |  |  |  |  +- "cylinder"                       円柱
R208  |  |  |  |  +- "meetingPeople"                  会議の人々
R209  |  |  |  |  +- "smilingFace"                    笑顔
R210  |  |  |  |  +- "beerMug"                        ビールジョッキ
R211  |  |  |  +- fill                                塗り -> Paint
R212  |  |  |  +- stroke                              縁 -> Stroke
R213  |  |  +- taskGroupId                            載せるタスクグループ
R214  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
R215  |  |     +- sourceProjectUid                    元のファイルの Project の UID
R216  |  |     +- sourceTaskUid                       元のファイルでの、このタスクの UID
R217  |  |     +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
R218  |  |     +- lastSeenMspdiImportCount            このタスクを最後に含んでいた取り込みが何回目か
R219  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
R220  |  |  +- predecessorUid [M]                     先行タスク
R221  |  |  +- type [M]                               依存の種類（判別子ではない）
R222  |  |  |  +- 0                                   FF 終了から終了
R223  |  |  |  +- 1                                   FS 終了から開始
R224  |  |  |  +- 2                                   SF 開始から終了
R225  |  |  |  +- 3                                   SS 開始から開始
R226  |  |  +- linkLag [M]                            ラグ（0.1 分単位）
R227  |  |  +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
R228  |  |  |  +- 3                                   m 分
R229  |  |  |  +- 4                                   em
R230  |  |  |  +- 5                                   h 時間
R231  |  |  |  +- 6                                   eh
R232  |  |  |  +- 7                                   d 日
R233  |  |  |  +- 8                                   ed
R234  |  |  |  +- 9                                   w 週
R235  |  |  |  +- 10                                  ew
R236  |  |  |  +- 11                                  mo 月
R237  |  |  |  +- 12                                  emo
R238  |  |  |  +- 19                                  % 割合
R239  |  |  |  +- 20                                  e%
R240  |  |  |  +- 35..44                              m? .. emo?（見積り）
R241  |  |  |  +- 51                                  %?
R242  |  |  |  +- 52                                  e%?
R243  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R244  |  +- passthrough [G]                           持ち越した MSPDI の値
R245  +- resources[] [M]                              担当
R246  |  +- uid [M]                                   一意な識別子
R247  |  +- name [M]                                  担当の名
R248  |  +- type [M]                                  資材か作業か（判別子ではない）
R249  |  |  +- 0                                      資材
R250  |  |  +- 1                                      作業
R251  |  +- isCostResource [M]                        コストの担当か
R252  |  +- calendarUid [M]                           担当の暦
R253  |  +- passthrough [G]                           持ち越した MSPDI の値
R254  +- assignments[] [M]                            割当
R255     +- uid [M]                                   一意な識別子
R256     +- taskUid [M]                               就くタスク
R257     +- resourceUid [M]                           就く担当
R258     +- passthrough [G]                           持ち越した MSPDI の値
```

回答:

#### ❓ 問 4. スケジュールデータ（GRS だけが持つ群）

```text
R259  scheduleData                     スケジュールデータ（GRS だけが持つ群。MSPDI の群の後に続く）
R260  +- taskGroups[]                  タスクグループ
R261  |  +- id                         一意な UUID
R262  |  +- name                       タスクグループ名
R263  |  +- parentTaskGroupId          親のタスクグループ（最上位では書かない）
R264  |  +- siblingOrder               兄弟の中の順
R265  |  +- style                      見た目（型 TaskGroupStyle）
R266  |  |  +- color                   帯の色 -> LaneColor
R267  |  +- minHeightPx                帯の最も低い高さ
R268  |  +- representativeTaskUid      この帯を代表する WBS のタスク
R269  |  +- hyperlinkAddress           リンク先の URL
R270  |  +- hyperlink                  リンクのタイトル
R271  |  +- selfShowMode               帯自身の表示の意図（書かなければ automatic）
R272  |  |  +- "shown"                 出す（人が出すと選んだ。深さに依らず描く）
R273  |  |  +- "hidden"                しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R274  |  |  +- "automatic"             規則に任せる（深さ・ピン・出ている配下への道で決まる）
R275  |  |  +- "hiddenUntilZoomIn"     拡大まで隠す（次の縦のズームインで automatic に変わる）
R276  |  +- editableByGroupName        編集してよい組の名
R277  +- baselineTasks[]               前回予定
R278  |  +- uid                        今のタスクの uid
R279  |  +- name                       タスク名
R280  |  +- start                      前回予定の開始
R281  |  +- finish                     前回予定の終了
R282  |  +- milestone                  マイルストーンか
R283  +- highlightBoxes[]              ハイライトボックス
R284  |  +- id                         一意な UUID
R285  |  +- style                      見た目（型 HighlightBoxStyle）
R286  |  |  +- cornerRadiusPx          角の丸みの半径
R287  |  |  +- fill                    塗り -> Paint
R288  |  |  +- stroke                  枠 -> Stroke
R289  |  +- firstDay                   最初の日
R290  |  +- lastDay                    最後の日
R291  |  +- firstTaskGroupId           覆う最初の帯（両端を含む）
R292  |  +- lastTaskGroupId            覆う最後の帯（両端を含む）
R293  +- commentBoxes[]                コメントボックス
R294  |  +- id                         一意な UUID
R295  |  +- text                       文
R296  |  +- style                      見た目（型 CommentBoxStyle）
R297  |  |  +- fill                    箱の塗り -> Paint
R298  |  |  +- stroke                  枠と引出し線 -> Stroke
R299  |  |  +- font                    文字の見た目
R300  |  |     +- color                文字の色 -> Color
R301  |  |     +- sizePx               文字の大きさ
R302  |  +- leaderTarget               引出し線の先
R303  |  |  +- type                    判別子
R304  |  |  |  +- "freePoint"          何にも付かない点
R305  |  |  |  +- "task"               タスクの図形
R306  |  |  |  +- "highlightBox"       ハイライトボックス
R307  |  |  +- dateTime                時点（freePoint）
R308  |  |  +- taskGroupId             帯（freePoint）
R309  |  |  +- laneTopOffsetPercent    帯の中の高さ（上の縁から %）（freePoint）
R310  |  |  +- taskUid                 タスク（task）
R311  |  |  +- snapPart                吸着する図形の部分（task）
R312  |  |  |  +- "planBar"            予定バー
R313  |  |  |  +- "actualBar"          実績バー
R314  |  |  |  +- "milestoneMark"      マイルストーンマーク
R315  |  |  +- highlightBoxId          箱（highlightBox）
R316  |  |  +- snapPoint               吸着する 8 点の 1 つ（task・highlightBox）
R317  |  |     +- "topLeftCorner"      左上の角
R318  |  |     +- "topMiddle"          上の辺の中点
R319  |  |     +- "topRightCorner"     右上の角
R320  |  |     +- "rightMiddle"        右の辺の中点
R321  |  |     +- "bottomRightCorner"  右下の角
R322  |  |     +- "bottomMiddle"       下の辺の中点
R323  |  |     +- "bottomLeftCorner"   左下の角
R324  |  |     +- "leftMiddle"         左の辺の中点
R325  |  +- bodyOffsetPx               線先から箱へのずれ
R326  |  |  +- dx                      横のずれ
R327  |  |  +- dy                      縦のずれ
R328  |  +- hyperlinkAddress           リンク先の URL
R329  |  +- hyperlink                  リンクのタイトル
R330  +- scheduleDataTimeZone          データの日時の時差
R331  |  +- utcOffset                  UTC との差（"+09:00" の形。標準時の行だけ）
R332  +- sourceFormat                  元の形式
R333  |  +- "grs"                      GRS JSON
R334  |  +- "mspdi12"                  MSPDI（Project の版 12 の形）
R335  |  +- "mspdi15"                  MSPDI（Project の版 15 の形）
R336  +- importedTopTaskOutlineLevel   取り込んだファイルの、最上位のタスクの OutlineLevel
R337  +- highestIssuedUid              uid の数え手（GRS が出した最も大きい uid）
R338  +- mspdiImportCount              MSPDI を取り込んだ回数
R339  +- passthroughTasks[]            GRS がタスクにしない MSPDI の要素
R340  |  +- precedingTaskUid           前にある、いちばん近いタスクの uid（先頭では書かない）
R341  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R342  +- passthroughResources[]        GRS が担当にしない MSPDI の要素
R343  |  +- precedingResourceUid       前にある、いちばん近い担当の uid（先頭では書かない）
R344  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R345  +- passthroughAssignments[]      GRS が割当にしない MSPDI の要素
R346  |  +- precedingAssignmentUid     前にある、いちばん近い割当の uid（先頭では書かない）
R347  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R348  +- passthroughCalendars[]        GRS が暦にしない MSPDI の要素
R349     +- precedingCalendarUid       前にある、いちばん近い暦の uid（先頭では書かない）
R350     +- mspdiElement               MSPDI の要素（構造と名のまま）
```

回答:

#### ❓ 問 5. 共通の型（-> で指す物）

```text
R351  Color                                色
R352  +- type                              判別子
R353  |  +- "theme"                        テーマの色に従う
R354  |  +- "palette"                      パレットの 10 色の 1 つ
R355  |  +- "custom"                       人が選んだ色
R356  +- name                              パレットの色の名（palette。明るいテーマでの見え方の名）
R357  |  +- "white"                        白
R358  |  +- "black"                        黒
R359  |  +- "dimGray"                      濃い灰色
R360  |  +- "lightGray"                    薄い灰色
R361  |  +- "red"                          赤
R362  |  +- "blue"                         青
R363  |  +- "yellow"                       黄
R364  |  +- "green"                        緑
R365  |  +- "orange"                       橙
R366  |  +- "purple"                       紫
R367  +- light                             明るいテーマの側（custom）
R368  |  +- hexColor                       色の値（#rrggbb）
R369  |  +- isCalculatedFromOppositeColor  GRS が反対の側の色から計算した側だけ true
R370  +- dark                              暗いテーマの側（custom。形は light）
R371  LaneColor                            帯の色（Color から black を除く）
R372  TaskTableWindow                      タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R373  +- isScheduleFilterApplied           表でチェックしたタスクだけを描くか
R374  +- checkedTaskUids[]                 チェックしたタスク
R375  +- columnFilters[]                   列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R376  +- columnSort                        表の並べ方（列と向き）-> ColumnSort
R377  ResourceTableWindow                  担当の表の見せ方（担当リスト）
R378  +- isScheduleFilterApplied           表のチェックでチャートを絞るか
R379  +- checkedResourceUids[]             チェックした担当
R380  +- isUnassignedChecked               （担当なし）の行をチェックしたか
R381  +- columnFilters[]                   列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R382  +- columnSort                        表の並べ方（列と向き）-> ColumnSort
R383  ColumnFilter                         列のフィルタ
R384  +- type                              判別子
R385  |  +- "values"                       値で絞る
R386  |  +- "dateRange"                    日の範囲で絞る
R387  +- column                            列（列の英語の名。値の一覧は未決）
R388  +- hiddenValues[]                    隠す値（values）
R389  +- isBlankHidden                     空の行を隠すか（values）
R390  +- firstDay                          最初の日（dateRange）
R391  +- lastDay                           最後の日（dateRange）
R392  ColumnSort                           並べ替え
R393  +- column                            列（ColumnFilter.column と同じ値）
R394  +- direction                         向き
R395     +- "ascending"                    小さい順
R396     +- "descending"                   大きい順
R397  Paint                                塗り
R398  +- color                             色 -> Color
R399  +- opacityPercent                    不透明度（%）
R400  Stroke                               線（描かないときは書かない）
R401  +- color                             色 -> Color
R402  +- opacityPercent                    不透明度（%）
R403  +- widthPx                           太さ
R404  ShapeStyle                           形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R405  +- fill                              塗り -> Paint
R406  +- stroke                            線 -> Stroke
```

回答:

***

## ❓ 自由

ツリーの全体について、気づいた事があれば書いてください（構造・並び・足りない物など）。

回答:
