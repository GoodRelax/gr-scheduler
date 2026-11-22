# 送る人へ（AI には送らない）

- 1 段目（`grs-json-final-review-ai-stage1.md`）の答えが `R406` まで揃ってから、同じ会話に「ここから下を AI へ送る」より下を貼ってください。途中で切れたら「続けて」と送ってください。
- 答えは、1 段目の答えと同じファイル（持ち主の手元のフォルダーの `final-review-answer-<ai>.md`）の後ろに足してください。
- 2 段目は意図を明かし、観点 V-4〜V-9（`JDG-3718`）で審査させ、最後に改善点を聞きます。

---- ここから下を AI へ送る（2 段目） ----

# 質問状（2 段目）: 意図を明かします。名を審査し、改善する点を挙げてください

**答え方: 日本語で（名そのものと説明の文の案は英語で）、1 つのコードブロック（```markdown で始めて ``` で閉じる）の中に、8 節の答えの型で書いてください。コードブロックの外には何も書かないでください。**

## 1. この段ですること

1 段目の答えは、そのまま残してください（直さない）。ここで私たちの意図を明かします。あなたの 1 段目の読みと意図のずれから名を自己診断し、名と構造を審査し、最後に改善する点を挙げてください。

基準は 1 つです: **この JSON を初めて開く世界中の開発者と AI が、名だけで、一発で、誤解なく意味を読めるか。** 褒め言葉と遠慮は要りません。

## 2. アプリと JSON の考え

- GoodRelax Scheduler（GRS）は、ブラウザだけで動く日程表のアプリです。日程を 1 つの JSON ファイル（GRS JSON）に保存します。MSPDI とも、情報を失わずに読み書きします。外の道具や AI のエージェントも、この JSON を読み書きします。
- 公開した後は名を変えられません。今が名を直す最後の機会です。公開前なので、今の形との互換は気にしません。
- 根は 4 つの役に分かれます: 形の版（`$schema`・`schemaVersionUtc`・`buildVersionUtc`）／ 帳簿（`documentStamp`・`changeLogEntries`）／ 見せ方（`documentSettings`。変えても中身は変わらない）／ 中身（`scheduleData`）。
- `scheduleData` は、MSPDI と往復する群（`project`・`calendars`・`tasks`・`resources`・`assignments`）と、GRS だけが持つ群に分かれます。
- MSPDI と往復する物の直下には、MSPDI の名のキーだけを置きます。GRS がその物に付ける値は、物の中の `grs` にまとめます。GRS が意味を読まない MSPDI の値は、物の中の `passthrough` に、MSPDI の構造と要素の名のまま預かります。例外は、タスクの `parentTaskUid`（WBS の親）と `siblingOrder`（兄弟の中の順）です。どちらも MSPDI の WBS の木そのものを言う値なので、タスクの直下に置きます。
- 木は 2 つあり、どちらも意図した物です: WBS の木（`tasks[].parentTaskUid`。MSPDI と往復する親子）と、画面に積む帯の木（`taskGroups[].parentTaskGroupId`）。タスクは帯に `grs.taskGroupId` で載ります。帯は、WBS のどのタスクがその帯を代表するかを `representativeTaskUid` で持ちます。
- 前回予定 `baselineTasks[]` は前の予定の写しなので、今のタスクの中に入れず、別の配列に置きます。その `uid` は今のタスクの `uid` を指します。
- GRS がタスクにしない MSPDI の一覧の要素（UID 0 の要約タスクなど）は `passthroughTasks[]` などに預け、`preceding…Uid` で一覧の中の位置を覚えます。

## 3. 名の決まり（上の決まりが下の決まりに勝つ）

| 優先 | 番号 | 決まり |
|:---|:---|:---|
| 1 | — | 外の決まりが決める名はそのまま（`$schema`） |
| 2 | — | `passthrough` と `mspdiElement` の中のキーは、MSPDI の要素の名そのまま（PascalCase） |
| 3 | N-3 | MSPDI から来た値は、MSPDI の名を camelCase にして使う（`StartDate` → `startDate`）。MSPDI の `Type` は `type`（判別子ではない）。MSPDI の数の符号は数のまま |
| 4 | — | リンクの欄は、タスク・タスクグループ・コメントボックスとも MSPDI の名 `hyperlinkAddress`（URL）・`hyperlink`（題） |
| 5 | — | 版を言うキーは `…VersionUtc` で終え、値は UTC の秒までの時刻 |
| 6 | N-1 | キーは camelCase、型の名は PascalCase |
| 7 | N-6 | 識別子は 2 つだけ: MSPDI から来た物は `uid`（整数。Project だけ MSPDI のとおり文字列。同じ配列の中で一意）、GRS 固有の物は `id`（ランダムな UUID 版 4、小文字。文書全体で一意） |
| 8 | N-5 | 別の物を指す参照は「相手の名 ＋ `Uid` か `Id`」（`parentTaskGroupId`・`representativeTaskUid`） |
| 9 | N-2 | 名は、指す物を言う。略は `uid`・`id`・`Px`・`Utc`・`dx`・`dy`・`min`・`max`・`hex` だけ。形式の名 MSPDI は固有の名で、略に数えない |
| 10 | N-4 | キーに持ち主の名を繰り返さない（`project.title`。`projectTitle` にしない） |
| 11 | N-7 | 自分の欄の組を選ぶ判別子は `type`。`xxxType` は、名が `type` になりそうな分類だけに使う。状態・向き・段などの列挙は、それが何かを言う名にする（`selfShowMode`・`taskStackDirection`・`fontSizePreset`）。`kind` は使わない |
| 12 | N-8 | 配列は複数形 |
| 13 | N-9 | 真偽の値は `is…` で始める |
| 14 | N-16 | 割合は `…Percent`（0〜100）、倍率は `…Ratio`（1 が既定） |
| 15 | N-10 | 量は単位で終える（`…Px`・`…Percent`・`…WorkingDays` など）。同じ単位の量だけを持つ物は、物の名に単位を付け、中のキーには付けない（`bodyOffsetPx { dx, dy }`） |
| 16 | N-13 | GRS が名を付ける日時のキーは値の型で終える: 日だけ `…Day`（`2026-12-01`）、時刻だけ `…Time`、日と時刻 `…DateTime`（時差を書かない。データの時差は `scheduleDataTimeZone` が言う）、UTC の瞬間 `…At`（秒まで） |
| 17 | N-14 | 列挙の値は camelCase の英語の語。MSPDI の数の符号は数のまま |
| 18 | N-17 | 判別子 `type` を持つ物は、その値が持つ欄だけを書く |
| 19 | N-12 | 「無い」は、キーを書かないこと 1 つで言う。`null` は使わない |
| 20 | N-15 | 空の配列も、中身が全部無い物も、キーを書かないことで言う |

## 4. 書く順の決まり

読む側はキーの並びに頼りません。GRS は書くときに毎回同じ順で書き、先に読む所ほど全体をつかむ値が来るようにします。

- 根: `$schema` → `schemaVersionUtc` → `buildVersionUtc` → `documentStamp` → `documentSettings` → `scheduleData` → `changeLogEntries`（小さい頭を先、大きい本体と伸び続ける履歴を後）。
- `scheduleData`: MSPDI の群を MSPDI の順で先に、次に GRS だけの群を「指される物を先に」の順、持ち越し（`passthrough…`）は最後。
- 1 つの物の中: 判別子 `type` → 自分の `uid`・`id` → 名 → MSPDI を写す値（MSPDI の順）→ GRS の値 → 子の配列 → `passthrough`。
- `documentSettings` の中: 効く範囲の広い順（画面全体 → 時間の軸 → 帯の軸 → 開いたときの位置 → 描く物 → 道具）。
- 配列の要素: `tasks[]` と `taskGroups[]` は木を深さ優先でたどった順。そのほかは `uid`・`id` の小さい順。

## 5. 意図の木（1 段目の木に、私たちの意図を足した物）

行の番号は 1 段目と同じです。右の日本語が意図です。括弧の中の値の名（例「（fixed）」）は、その欄が判別子 `type` のどの値のときだけあるかを言います。

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

### 文書設定

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

### スケジュールデータ（MSPDI と往復する群）

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

### スケジュールデータ（GRS だけが持つ群）

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

### 共通の型（-> で指す物）

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


## 6. 変えない物

- **MSPDI から来た名（`[M]`）は変えません。** MSPDI と照らし合わせるためです。名で伝わらない意味（数の符号の意味、`hyperlink` が URL でなく題を持つことなど）は、JSON Schema の各キーの説明（`description`）で補います。`[M]` の名で迷ったら、改名ではなく、説明の文の案を英語で書いてください。
- この木の名は、これまでの審査で一度ずつ決めた物です。決まった名を変える案には、名だけでは誤解が残るという、新しく強い理由を添えてください。

## 7. 問い

**問 1. 自己診断.** 1 段目の読みが意図と **ずれた行と逆だった行だけ** を挙げてください。1 段目の読み、ずれの大きさ（ずれた・逆）、ずれの元（名のどの部分か。名の罪か、木と実例の見せ方の罪か）。

**問 2. 観点ごとの審査.** 次の観点で、問題のある行を挙げてください（観点ごとに重い順、合わせて最大 20）。
- V-2 親と合わせて読める: 親のキーと続けて読んで意味が通るか。子が親の名を繰り返していないか。
- V-3 列挙の値: 値の名だけで意味が分かるか。値の組の品詞・粒度・対がそろうか。
- V-4 1 つの語に 1 つの意味: 同じ語が木のどこでも同じ意味か。同じ物を別の語で言っていないか。
- V-5 決まりに合う: 3 節の決まりに外れる名。
- V-6 置き場と形: 値の置き場が意味に合うか。似た物が同じ形か。
- V-7 並び: 4 節の順で、読み手が先に全体をつかめるか。
- V-8 英語として自然: 英語を母語とする読み手が、語の選び方と語順を自然と読むか。
- V-9 長く持つ: 機能が増えたときに、名が嘘にならないか。

**問 3. 説明の文.** 名だけでは誤解が残る行（`[M]` の名を含む）に、JSON Schema の `description` に書く英語の文の案を 1〜2 文で（重い順に最大 15）。

**問 4. 改善する点.** 最後に、この JSON の名と構造で改善する点を、重い順に最大 10 挙げてください。何をどう変えるか（名を変える・形を変える・説明を足す）、その理由、変えないと起きる誤解の場面。

**問 5. 総合.** 全体の点数（1〜10。「一発で誤解なく読める」の点）、一番先に直す 1 点、この名と構造のまま公開したときの最大の危険（起きる場面と防ぎ方）。

## 8. 答えの型（この型のまま、1 つのコードブロックに書く）

- 挙げる物が無い所には「なし」と書いてください。同じ指摘を 2 か所に書かないでください。
- 答えが途中で切れたら、こちらが「続けて」と送ります。切れた所の次から、同じ型で続けてください。

```markdown
## 問 1. 自己診断（ずれた行と逆だった行だけ）
| 行 | 1 段目の読み | ずれた・逆 | ずれの元（名のどこ・誰の罪か） |
## 問 2. 観点ごとの審査（合わせて最大 20）
| # | 観点 | 行 | 問題 | 直し方（名を変える・形を変える・説明を足す） | 案 |
## 問 3. 説明の文（最大 15）
| # | 行 | 誤解が残る訳 | description の案（英語、1〜2 文） |
## 問 4. 改善する点（重い順に最大 10）
| # | 行 | 何をどう変えるか | 理由 | 変えないと起きる誤解の場面 |
## 問 5. 総合
- 点数（1〜10）:
- 一番先に直す 1 点:
- 最大の危険（場面と防ぎ方）:
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。コードブロックの外には何も書かないでください。**
