BGQA6

# GRS JSON の最終レビュー —— 持ち主の目視

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA6 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

作った日: 2026-11-22（GRS JSON の最終レビューの席）

残 6（❓ で検索）

見る点（`JDG-3718`）: いちばん大事なのは「名を見て、一発で、誤解なく意味が分かるか」。親の名と続けて読めるか、列挙の値が値だけで読めるか、同じ語が同じ意味かも見てください。右の日本語は席が書いた意図です。名と意図が食い違う所も書いてください。

答え方: 引っかかった名だけを、`行番号 名: どう迷ったか`（例 `R108 highestIssuedUid: …`）の形で 1 行ずつ書いてください。無ければ「なし」と書いてください。

***

## 決定事項

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| レビューの観点 | V-1〜V-9（`grs-json-final-review-viewpoints.md`） | `JDG-3718` |
| 持ち主の目視の形 | この GQA で、ツリーを 5 つの部分に分けて見る。外の AI のレビューと並べて進める | `JDG-3719` |
| GRS のスカラー 5 つの置き場と順 | `scheduleData` の先頭に、効く範囲の広い順（時差 → 元の形式 → 取り込んだ最上位の OutlineLevel → 取り込んだ回数 → uid の数え手） | `JDG-3720`・`JDG-3721` |
| 描く物の旗 | 11 個を `documentSettings.scheduleCanvasElements` に束ね、効く範囲の広い順・物ごとに並べる。`isTimeOfDayVisible` は時間の軸の群へ | `JDG-3722`〜`JDG-3724` |
| 表の列の名 | 列が見せる値で名付ける。25 列の名は `ColumnFilter.column` の値のとおり | `JDG-3725`・`JDG-3726` |

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
R082  |  +- isDateGridLinesVisible                  日の罫線を見せるか
R083  |  +- isGroupGridLinesVisible                 グループ罫線（タスクグループの境の横線）を見せるか
R084  |  +- isProgressLineVisible                   イナズマ線を見せるか
R085  |  +- isDependencyLineVisible                 依存線を見せるか
R086  |  +- isPlanBarVisible                        予定バーを見せるか
R087  |  +- isPlanDatesVisible                      予定の日付を見せるか
R088  |  +- isActualBarVisible                      実績バーを見せるか
R089  |  +- isPercentCompleteLabelVisible           完了率のラベルを見せるか
R090  |  +- isProgressStatusMarkVisible             進捗ステータスマークと再開マークを見せるか
R091  |  +- isBaselineOutlineVisible                前回予定を重ねるか（前回予定輪郭）
R092  |  +- isAssigneeLabelVisible                  担当のラベルを見せるか
R093  +- delayDiagnosisSettings                     遅延診断の設定
R094  |  +- parentTaskProgressToleranceWorkingDays  遅延診断が親タスクの進み具合に許す幅（稼働日）
R095  +- tableWindows                               3 つの表の見せ方
R096     +- searchWindow                            検索ウィンドウ -> TaskTableWindow
R097     +- delayDiagnosisReportWindow              遅延診断レポート -> TaskTableWindow
R098     +- resourceListWindow                      担当リスト -> ResourceTableWindow
```

回答:

#### ❓ 問 3. スケジュールデータ（頭の値と、MSPDI と往復する群）

`[M]` の名は MSPDI の要素の名なので、改名しません（範囲の外）。迷う名は、迷い方を書いてください。席がスキーマの説明の文で補います。

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
R118  |  +- revision [M]                              保存した回数
R119  |  +- creationDate [M]                          作った日時
R120  |  +- startDate [M]                             開始の日時
R121  |  +- statusDate [M]                            基準日
R122  |  +- minutesPerDay [M]                         1 日の稼働の分
R123  |  +- minutesPerWeek [M]                        1 週の稼働の分
R124  |  +- daysPerMonth [M]                          1 か月の稼働日
R125  |  +- weekStartDay [M]                          週の始まりの曜日
R126  |  |  +- 0                                      日曜
R127  |  |  +- 1                                      月曜
R128  |  |  +- 2                                      火曜
R129  |  |  +- 3                                      水曜
R130  |  |  +- 4                                      木曜
R131  |  |  +- 5                                      金曜
R132  |  |  +- 6                                      土曜
R133  |  +- defaultStartTime [M]                      既定の開始時刻
R134  |  +- defaultFinishTime [M]                     既定の終了時刻
R135  |  +- calendarUid [M]                           稼働日を数える暦
R136  |  +- passthrough [G]                           持ち越した MSPDI の値（MSPDI の構造と名のまま）
R137  +- calendars[] [M]                              暦
R138  |  +- uid [M]                                   一意な識別子
R139  |  +- name [M]                                  暦の名
R140  |  +- isBaseCalendar [M]                        基本の暦か
R141  |  +- baseCalendarUid [M]                       受け継ぐ元の暦
R142  |  +- weekDays[] [M]                            曜日ごとの稼働
R143  |  |  +- dayType [M]                            曜日（MSPDI の 0 例外は GRS では使わない）
R144  |  |  |  +- 1                                   日曜
R145  |  |  |  +- 2                                   月曜
R146  |  |  |  +- 3                                   火曜
R147  |  |  |  +- 4                                   水曜
R148  |  |  |  +- 5                                   木曜
R149  |  |  |  +- 6                                   金曜
R150  |  |  |  +- 7                                   土曜
R151  |  |  +- dayWorking [M]                         稼働日か
R152  |  |  +- workingTimes[] [M]                     稼働の時間帯
R153  |  |  |  +- fromTime [M]                        始まりの時刻
R154  |  |  |  +- toTime [M]                          終わりの時刻
R155  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R156  |  +- exceptions[] [M]                          例外の日
R157  |  |  +- name [M]                               例外の名
R158  |  |  +- fromDate [M] (TimePeriod/FromDate)     最初の日
R159  |  |  +- toDate [M] (TimePeriod/ToDate)         最後の日
R160  |  |  +- dayWorking [M]                         稼働日か
R161  |  |  +- type [M]                               例外の繰り返し方（判別子ではない）
R162  |  |  |  +- 1                                   毎日
R163  |  |  |  +- 2                                   毎年、月の何日
R164  |  |  |  +- 3                                   毎年、月の第何何曜日
R165  |  |  |  +- 4                                   毎月、何日
R166  |  |  |  +- 5                                   毎月、第何何曜日
R167  |  |  |  +- 6                                   毎週
R168  |  |  |  +- 7                                   何日ごと
R169  |  |  |  +- 8                                   何稼働日ごと
R170  |  |  |  +- 9                                   繰り返さない
R171  |  |  +- period [M]                             繰り返しの間隔
R172  |  |  +- workingTimes[] [M]                     稼働の時間帯
R173  |  |  |  +- fromTime [M]                        始まりの時刻
R174  |  |  |  +- toTime [M]                          終わりの時刻
R175  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R176  |  +- passthrough [G]                           持ち越した MSPDI の値
R177  +- tasks[] [M]                                  タスク
R178  |  +- uid [M]                                   一意な識別子
R179  |  +- name [M]                                  タスク名
R180  |  +- notes [M]                                 メモ
R181  |  +- start [M]                                 予定の開始
R182  |  +- finish [M]                                予定の終了
R183  |  +- milestone [M]                             マイルストーンか
R184  |  +- deadline [M]                              期限
R185  |  +- actualStart [M]                           実績の開始
R186  |  +- stop [M]                                  作業が止まった時
R187  |  +- actualFinish [M]                          実績の終了
R188  |  +- resume [M]                                再開の予定
R189  |  +- resumeValid [M]                           再開日が有効か
R190  |  +- percentComplete [M]                       完了率
R191  |  +- calendarUid [M]                           タスクの暦
R192  |  +- hyperlinkAddress [M]                      リンク先の URL
R193  |  +- hyperlink [M]                             リンクのタイトル
R194  |  +- parentTaskUid [G]                         WBS の親タスク（最上位では書かない）
R195  |  +- siblingOrder [G]                          兄弟の中の順
R196  |  +- grs [G]                                   タスクに付く GRS の値
R197  |  |  +- startSlopeCalendarDays                 開始の傾き（開始の端を斜めに落とす暦日。確定していない日付）
R198  |  |  +- finishSlopeCalendarDays                終了の傾き（終了の端を斜めに落とす暦日。確定していない日付）
R199  |  |  +- style                                  見た目（型 TaskStyle）
R200  |  |  |  +- taskShape                           バーの形（マイルストーンでないときだけ）
R201  |  |  |  |  +- "rectangle"                      矩形
R202  |  |  |  |  +- "chevron"                        矢羽根
R203  |  |  |  |  +- "arrow"                          矢印
R204  |  |  |  |  +- "dumbbell"                       ダンベル（両端に点のある細い線）
R205  |  |  |  +- milestoneShape                      マイルストーンマークの形（マイルストーンのときだけ）
R206  |  |  |  |  +- "circle"                         円
R207  |  |  |  |  +- "hexagon"                        六角形
R208  |  |  |  |  +- "pentagon"                       五角形
R209  |  |  |  |  +- "diamond"                        ひし形
R210  |  |  |  |  +- "square"                         正方形
R211  |  |  |  |  +- "star"                           星
R212  |  |  |  |  +- "triangleUp"                     上向きの三角
R213  |  |  |  |  +- "triangleDown"                   下向きの三角
R214  |  |  |  |  +- "file"                           書類
R215  |  |  |  |  +- "box"                            箱
R216  |  |  |  |  +- "floppyDisk"                     フロッピーディスク
R217  |  |  |  |  +- "cylinder"                       円柱
R218  |  |  |  |  +- "meetingPeople"                  会議の人々
R219  |  |  |  |  +- "smilingFace"                    笑顔
R220  |  |  |  |  +- "beerMug"                        ビールジョッキ
R221  |  |  |  +- fill                                塗り -> Paint
R222  |  |  |  +- stroke                              縁 -> Stroke
R223  |  |  +- taskGroupId                            載せるタスクグループ
R224  |  |  +- importOrigin                           取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
R225  |  |     +- sourceProjectUid                    元のファイルの Project の UID
R226  |  |     +- sourceTaskUid                       元のファイルでの、このタスクの UID
R227  |  |     +- importSessionId                     取り込みの id（取り込みのたびに GRS が作る）
R228  |  |     +- mspdiImportCountWhenLastIncluded    このタスクを最後に含んでいた取り込みが何回目か
R229  |  +- predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
R230  |  |  +- predecessorUid [M]                     先行タスク
R231  |  |  +- type [M]                               依存の種類（判別子ではない）
R232  |  |  |  +- 0                                   FF 終了から終了
R233  |  |  |  +- 1                                   FS 終了から開始
R234  |  |  |  +- 2                                   SF 開始から終了
R235  |  |  |  +- 3                                   SS 開始から開始
R236  |  |  +- linkLag [M]                            ラグ（0.1 分単位）
R237  |  |  +- lagFormat [M]                          ラグを見せる単位（e は経過時間、? は見積り）
R238  |  |  |  +- 3                                   m 分
R239  |  |  |  +- 4                                   em
R240  |  |  |  +- 5                                   h 時間
R241  |  |  |  +- 6                                   eh
R242  |  |  |  +- 7                                   d 日
R243  |  |  |  +- 8                                   ed
R244  |  |  |  +- 9                                   w 週
R245  |  |  |  +- 10                                  ew
R246  |  |  |  +- 11                                  mo 月
R247  |  |  |  +- 12                                  emo
R248  |  |  |  +- 19                                  % 割合
R249  |  |  |  +- 20                                  e%
R250  |  |  |  +- 35..44                              m? .. emo?（見積り）
R251  |  |  |  +- 51                                  %?
R252  |  |  |  +- 52                                  e%?
R253  |  |  +- passthrough [G]                        持ち越した MSPDI の値
R254  |  +- passthrough [G]                           持ち越した MSPDI の値
R255  +- resources[] [M]                              担当
R256  |  +- uid [M]                                   一意な識別子
R257  |  +- name [M]                                  担当の名
R258  |  +- type [M]                                  資材か作業か（判別子ではない）
R259  |  |  +- 0                                      資材
R260  |  |  +- 1                                      作業
R261  |  +- isCostResource [M]                        コストの担当か
R262  |  +- calendarUid [M]                           担当の暦
R263  |  +- passthrough [G]                           持ち越した MSPDI の値
R264  +- assignments[] [M]                            割当
R265     +- uid [M]                                   一意な識別子
R266     +- taskUid [M]                               就くタスク
R267     +- resourceUid [M]                           就く担当
R268     +- passthrough [G]                           持ち越した MSPDI の値
```

回答:

#### ❓ 問 4. スケジュールデータ（GRS だけが持つ配列）

```text
R269  scheduleData                        スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R270  +- taskGroups[]                     タスクグループ
R271  |  +- id                            一意な UUID
R272  |  +- name                          タスクグループ名
R273  |  +- parentTaskGroupId             親のタスクグループ（最上位では書かない）
R274  |  +- siblingOrder                  兄弟の中の順
R275  |  +- style                         見た目（型 TaskGroupStyle）
R276  |  |  +- color                      帯の色 -> TaskGroupColor
R277  |  +- minHeightPx                   帯の最も低い高さ
R278  |  +- representativeTaskUid         この帯を代表する WBS のタスク
R279  |  +- hyperlinkAddress              リンク先の URL
R280  |  +- hyperlink                     リンクのタイトル
R281  |  +- showMode                      この帯を出すかの意図（書かなければ automatic。hidden と hiddenUntilZoomIn は配下も隠す）
R282  |  |  +- "shown"                    出す（人が出すと選んだ。深さに依らず描く。祖先が隠していれば隠れる）
R283  |  |  +- "hidden"                   しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R284  |  |  +- "automatic"                規則に任せる（深さ・ピン・出ている配下への道で決まる）
R285  |  |  +- "hiddenUntilZoomIn"        拡大まで隠す（配下も隠れる。次の縦のズームインで automatic に変わる）
R286  |  +- allowedEditorGroupName        編集してよい組の名
R287  +- baselineTasks[]                  前回予定
R288  |  +- uid                           今のタスクの uid
R289  |  +- name                          タスク名
R290  |  +- start                         前回予定の開始
R291  |  +- finish                        前回予定の終了
R292  |  +- milestone                     マイルストーンか
R293  +- highlightBoxes[]                 ハイライトボックス
R294  |  +- id                            一意な UUID
R295  |  +- style                         見た目（型 HighlightBoxStyle）
R296  |  |  +- cornerRadiusPx             角の丸みの半径
R297  |  |  +- fill                       塗り -> Paint
R298  |  |  +- stroke                     枠 -> Stroke
R299  |  +- firstDay                      最初の日
R300  |  +- lastDay                       最後の日
R301  |  +- firstTaskGroupId              覆う最初の帯（両端を含む）
R302  |  +- lastTaskGroupId               覆う最後の帯（両端を含む）
R303  +- commentBoxes[]                   コメントボックス
R304  |  +- id                            一意な UUID
R305  |  +- text                          文
R306  |  +- style                         見た目（型 CommentBoxStyle）
R307  |  |  +- fill                       箱の塗り -> Paint
R308  |  |  +- stroke                     枠と引出し線 -> Stroke
R309  |  |  +- font                       文字の見た目
R310  |  |     +- color                   文字の色 -> Color
R311  |  |     +- sizePx                  文字の大きさ
R312  |  +- leaderTarget                  引出し線の先
R313  |  |  +- type                       判別子
R314  |  |  |  +- "freePoint"             何にも付かない点
R315  |  |  |  +- "task"                  タスクの図形
R316  |  |  |  +- "highlightBox"          ハイライトボックス
R317  |  |  +- dateTime                   時点（freePoint）
R318  |  |  +- taskGroupId                帯（freePoint）
R319  |  |  +- taskGroupTopOffsetPercent  帯の中の高さ（上の縁から %）（freePoint）
R320  |  |  +- taskUid                    タスク（task）
R321  |  |  +- snapPart                   吸着する図形の部分（task）
R322  |  |  |  +- "planBar"               予定バー
R323  |  |  |  +- "actualBar"             実績バー
R324  |  |  |  +- "milestoneMark"         マイルストーンマーク
R325  |  |  +- highlightBoxId             箱（highlightBox）
R326  |  |  +- snapPoint                  吸着する 8 点の 1 つ（task・highlightBox）
R327  |  |     +- "topLeftCorner"         左上の角
R328  |  |     +- "topMiddle"             上の辺の中点
R329  |  |     +- "topRightCorner"        右上の角
R330  |  |     +- "rightMiddle"           右の辺の中点
R331  |  |     +- "bottomRightCorner"     右下の角
R332  |  |     +- "bottomMiddle"          下の辺の中点
R333  |  |     +- "bottomLeftCorner"      左下の角
R334  |  |     +- "leftMiddle"            左の辺の中点
R335  |  +- bodyOffsetPx                  線先から箱へのずれ
R336  |  |  +- dx                         横のずれ
R337  |  |  +- dy                         縦のずれ
R338  |  +- hyperlinkAddress              リンク先の URL
R339  |  +- hyperlink                     リンクのタイトル
R340  +- passthroughTasks[]               GRS がタスクにしない MSPDI の要素
R341  |  +- precedingTaskUid              前にある、いちばん近いタスクの uid（先頭では書かない）
R342  |  +- mspdiElement                  MSPDI の要素（構造と名のまま）
R343  +- passthroughResources[]           GRS が担当にしない MSPDI の要素
R344  |  +- precedingResourceUid          前にある、いちばん近い担当の uid（先頭では書かない）
R345  |  +- mspdiElement                  MSPDI の要素（構造と名のまま）
R346  +- passthroughAssignments[]         GRS が割当にしない MSPDI の要素
R347  |  +- precedingAssignmentUid        前にある、いちばん近い割当の uid（先頭では書かない）
R348  |  +- mspdiElement                  MSPDI の要素（構造と名のまま）
R349  +- passthroughCalendars[]           GRS が暦にしない MSPDI の要素
R350     +- precedingCalendarUid          前にある、いちばん近い暦の uid（先頭では書かない）
R351     +- mspdiElement                  MSPDI の要素（構造と名のまま）
```

回答:

#### ❓ 問 5. 共通の型（-> で指す物）

```text
R352  Color                                      色
R353  +- type                                    判別子
R354  |  +- "theme"                              テーマの色に従う
R355  |  +- "palette"                            パレットの 10 色の 1 つ
R356  |  +- "custom"                             人が選んだ色
R357  +- name                                    パレットの色の名（palette。明るいテーマでの見え方の名）
R358  |  +- "white"                              白
R359  |  +- "black"                              黒
R360  |  +- "dimGray"                            濃い灰色
R361  |  +- "lightGray"                          薄い灰色
R362  |  +- "red"                                赤
R363  |  +- "blue"                               青
R364  |  +- "yellow"                             黄
R365  |  +- "green"                              緑
R366  |  +- "orange"                             橙
R367  |  +- "purple"                             紫
R368  +- light                                   明るいテーマの側（custom）
R369  |  +- hexColor                             色の値（#rrggbb）
R370  |  +- isCalculatedFromOppositeColorScheme  GRS が反対の側の色から計算した側だけ true
R371  +- dark                                    暗いテーマの側（custom。形は light）
R372  TaskGroupColor                             帯の色（Color から black を除く）
R373  TaskTableWindow                            タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R374  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックしたタスクだけを描く）
R375  +- checkedTaskUids[]                       チェックしたタスク
R376  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R377  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
R378  ResourceTableWindow                        担当の表の見せ方（担当リスト）
R379  +- isScheduleFilteredByChecks              チェックで日程表を絞るか（チェックした担当のタスクだけを描く）
R380  +- checkedResourceUids[]                   チェックした担当
R381  +- isUnassignedChecked                     （担当なし）の行をチェックしたか
R382  +- columnFilters[]                         列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R383  +- columnSort                              表の並べ方（列と向き）-> ColumnSort
R384  ColumnFilter                               列のフィルタ
R385  +- type                                    判別子
R386  |  +- "values"                             値で絞る
R387  |  +- "dateRange"                          日の範囲で絞る
R388  +- column                                  列（列が見せる値の名）
R389  |  +- "progressStatus"                     検索・タスク: ステータス（進捗ステータス）
R390  |  +- "percentComplete"                    検索・タスク、遅延診断: 進捗
R391  |  +- "taskType"                           検索・タスク、遅延診断: タスク種別（タスクかマイルストーンか）
R392  |  +- "taskName"                           検索・タスク、遅延診断: タスク（マイルストーン）
R393  |  +- "resourceNames"                      検索・タスク、遅延診断: 担当名（そのタスクのすべての担当）
R394  |  +- "start"                              検索・タスク: 予定開始
R395  |  +- "finish"                             検索・タスク: 予定終了
R396  |  +- "actualStart"                        検索・タスク: 実績開始
R397  |  +- "actualFinish"                       検索・タスク: 実績終了
R398  |  +- "taskGroupPath"                      検索・タスク: 最上位までの階層
R399  |  +- "text"                               検索・コメントボックス: 本文
R400  |  +- "taskGroupName"                      検索・コメントボックス: 線先が立つタスクグループの名
R401  |  +- "leaderTargetDay"                    検索・コメントボックス: 線先が立つ日
R402  |  +- "diagnosisStatus"                    遅延診断: ステータス（診断の結果）
R403  |  +- "planDates"                          遅延診断: 予定日（開始〜終了）
R404  |  +- "actualDates"                        遅延診断: 実績日（開始〜終了）
R405  |  +- "diagnosisReason"                    遅延診断: 理由
R406  |  +- "resourceName"                       担当リスト: 担当名
R407  |  +- "isSelected"                         担当リスト: 選択（その担当を選んでいるか）
R408  |  +- "assignedTaskCount"                  担当リスト: 担当タスク数
R409  |  +- "assignedTaskNames"                  担当リスト: 担当タスク
R410  +- hiddenValues[]                          隠す値（values）。状態の列は用語集の英語の名（例 finished・delay・task・selected、JDG-3735）、ほかの列はセルの値
R411  +- isBlankHidden                           空の行を隠すか（values）
R412  +- firstDay                                最初の日（dateRange）
R413  +- lastDay                                 最後の日（dateRange）
R414  ColumnSort                                 並べ替え
R415  +- column                                  列（ColumnFilter.column と同じ値）
R416  +- direction                               向き
R417     +- "ascending"                          小さい順
R418     +- "descending"                         大きい順
R419  Paint                                      塗り
R420  +- color                                   色 -> Color
R421  +- opacityPercent                          不透明度（%）
R422  Stroke                                     線（描かないときは書かない）
R423  +- color                                   色 -> Color
R424  +- opacityPercent                          不透明度（%）
R425  +- widthPx                                 太さ
R426  ShapeStyle                                 形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R427  +- fill                                    塗り -> Paint
R428  +- stroke                                  線 -> Stroke
```

回答:

***

## ❓ 自由

ツリーの全体について、気づいた事があれば書いてください（構造・並び・足りない物など）。

回答:
