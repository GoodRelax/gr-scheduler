# 送る人へ（AI には送らない）

- 1 段目（`grs-json-final-review-ai-stage1.md`）の答えが `R428` まで揃ってから、同じ会話に「ここから下を AI へ送る」より下を貼ってください。途中で切れたら「続けて」と送ってください。
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
- `scheduleData` は、GRS の頭の値 5 つ（`scheduleDataTimeZone` など）、MSPDI と往復する群（`project`・`calendars`・`tasks`・`resources`・`assignments`）、GRS だけが持つ配列に分かれます。
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
- `scheduleData`: 先頭に GRS の値 5 つ（効く範囲の広い順: 時差 → 元の形式 → 取り込んだ最上位の OutlineLevel → 取り込んだ回数 → uid の数え手）。次に MSPDI の群を MSPDI の順で、次に GRS だけの配列を「指される物を先に」の順、持ち越し（`passthrough…`）は最後。
- 1 つの物の中: 判別子 `type` → 自分の `uid`・`id` → 名 → MSPDI を写す値（MSPDI の順）→ GRS の値 → 子の配列 → `passthrough`。
- `documentSettings` の中: 効く範囲の広い順（画面全体 → 時間の軸 → 帯の軸 → 開いたときの位置 → 描く物 `scheduleCanvasElements` → 道具）。`scheduleCanvasElements` の中も効く範囲の広い順で、タスクごとの物は物ごと（予定 → 実績 → 前回予定 → 担当）。
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
R056  +- isTimeOfDayVisible                時刻を見せるか（文書の全体の時刻の見せ方）
R057  +- dayWidthPx                        暦日 1 日の幅
R058  +- fitDayRange                       全体表示期間
R059  |  +- type                           判別子
R060  |  |  +- "fixed"                     決まった期間
R061  |  |  +- "automatic"                 描ける物すべての範囲（期間を持たない）
R062  |  +- firstDay                       最初の日（fixed）
R063  |  +- lastDay                        最後の日（fixed）
R064  +- verticalZoom                      縦のズーム
R065  |  +- ratio                          縦の倍率（1 が既定）
R066  |  +- automaticallyShownDepth        automatic の帯を、この深さまで出す（1〜maxGroupDepth）
R067  +- taskGroupPanelWidthPx             タスクグループパネルの幅（倍率 1 のときの CSS ピクセル）
R068  +- isTaskGroupPanelWidthFixed        幅を固定するか
R069  +- pinnedTaskGroupIds[]              ピン止めしたタスクグループの id
R070  +- taskStackDirection                帯の中でタスクを積む向き
R071  |  +- "bottomToTop"                  下から上へ
R072  |  +- "topToBottom"                  上から下へ
R073  +- scrollPosition                    開いたときの位置
R074  |  +- type                           判別子
R075  |  |  +- "automatic"                 位置を決めていない（GRS が決める）
R076  |  |  +- "fixed"                     下の 4 つの値で決める
R077  |  +- leftEdgeDay                    左の端の日（fixed）
R078  |  +- leftEdgeDayOffsetPercent       左の端が、その日の始まりから何 % の所か（fixed）
R079  |  +- topEdgeTaskGroupId             上の端の帯（fixed）
R080  |  +- topEdgeTaskGroupOffsetPercent  上の端が、その帯の上から何 % の所か（fixed）
R081  +- scheduleCanvasElements            Schedule Canvas に描く物
R082  |  +- isDateGridLinesVisible         日の罫線を見せるか
R083  |  +- isGroupGridLinesVisible        グループ罫線（タスクグループの境の横線）を見せるか
R084  |  +- isProgressLineVisible          進捗線を見せるか
R085  |  +- isDependencyLineVisible        依存線を見せるか
R086  |  +- isPlanBarVisible               予定バーを見せるか
R087  |  +- isPlanDatesVisible             予定の日付を見せるか
R088  |  +- isActualBarVisible             実績バーを見せるか
R089  |  +- isPercentCompleteLabelVisible  完了率のラベルを見せるか
R090  |  +- isProgressMarkVisible          進捗マークを見せるか
R091  |  +- isBaselineOutlineVisible       前回予定を重ねるか（前回予定輪郭）
R092  |  +- isAssigneeLabelVisible         担当のラベルを見せるか
R093  +- delayDiagnosisSettings            遅延診断の設定
R094  |  +- toleranceWorkingDays           遅延診断が親タスクの進み具合に許す幅（稼働日）
R095  +- tableWindows                      3 つの表の見せ方
R096     +- searchWindow                   検索ウィンドウ -> TaskTableWindow
R097     +- delayDiagnosisReportWindow     遅延診断レポート -> TaskTableWindow
R098     +- resourceListWindow             担当リスト -> ResourceTableWindow
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
R197  |  |  +- fadeInCalendarDays                     始まりのフェード暦日
R198  |  |  +- fadeOutCalendarDays                    終わりのフェード暦日
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
R228  |  |     +- lastSeenMspdiImportCount            このタスクを最後に含んでいた取り込みが何回目か
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

### スケジュールデータ（GRS だけが持つ配列）

```text
R269  scheduleData                     スケジュールデータ（GRS だけが持つ配列。MSPDI の群の後に続く）
R270  +- taskGroups[]                  タスクグループ
R271  |  +- id                         一意な UUID
R272  |  +- name                       タスクグループ名
R273  |  +- parentTaskGroupId          親のタスクグループ（最上位では書かない）
R274  |  +- siblingOrder               兄弟の中の順
R275  |  +- style                      見た目（型 TaskGroupStyle）
R276  |  |  +- color                   帯の色 -> LaneColor
R277  |  +- minHeightPx                帯の最も低い高さ
R278  |  +- representativeTaskUid      この帯を代表する WBS のタスク
R279  |  +- hyperlinkAddress           リンク先の URL
R280  |  +- hyperlink                  リンクのタイトル
R281  |  +- selfShowMode               帯自身の表示の意図（書かなければ automatic）
R282  |  |  +- "shown"                 出す（人が出すと選んだ。深さに依らず描く）
R283  |  |  +- "hidden"                しまう（人がしまうと選んだ。配下も隠れ、ズームでも全体表示でも隠れたまま）
R284  |  |  +- "automatic"             規則に任せる（深さ・ピン・出ている配下への道で決まる）
R285  |  |  +- "hiddenUntilZoomIn"     拡大まで隠す（次の縦のズームインで automatic に変わる）
R286  |  +- editableByGroupName        編集してよい組の名
R287  +- baselineTasks[]               前回予定
R288  |  +- uid                        今のタスクの uid
R289  |  +- name                       タスク名
R290  |  +- start                      前回予定の開始
R291  |  +- finish                     前回予定の終了
R292  |  +- milestone                  マイルストーンか
R293  +- highlightBoxes[]              ハイライトボックス
R294  |  +- id                         一意な UUID
R295  |  +- style                      見た目（型 HighlightBoxStyle）
R296  |  |  +- cornerRadiusPx          角の丸みの半径
R297  |  |  +- fill                    塗り -> Paint
R298  |  |  +- stroke                  枠 -> Stroke
R299  |  +- firstDay                   最初の日
R300  |  +- lastDay                    最後の日
R301  |  +- firstTaskGroupId           覆う最初の帯（両端を含む）
R302  |  +- lastTaskGroupId            覆う最後の帯（両端を含む）
R303  +- commentBoxes[]                コメントボックス
R304  |  +- id                         一意な UUID
R305  |  +- text                       文
R306  |  +- style                      見た目（型 CommentBoxStyle）
R307  |  |  +- fill                    箱の塗り -> Paint
R308  |  |  +- stroke                  枠と引出し線 -> Stroke
R309  |  |  +- font                    文字の見た目
R310  |  |     +- color                文字の色 -> Color
R311  |  |     +- sizePx               文字の大きさ
R312  |  +- leaderTarget               引出し線の先
R313  |  |  +- type                    判別子
R314  |  |  |  +- "freePoint"          何にも付かない点
R315  |  |  |  +- "task"               タスクの図形
R316  |  |  |  +- "highlightBox"       ハイライトボックス
R317  |  |  +- dateTime                時点（freePoint）
R318  |  |  +- taskGroupId             帯（freePoint）
R319  |  |  +- laneTopOffsetPercent    帯の中の高さ（上の縁から %）（freePoint）
R320  |  |  +- taskUid                 タスク（task）
R321  |  |  +- snapPart                吸着する図形の部分（task）
R322  |  |  |  +- "planBar"            予定バー
R323  |  |  |  +- "actualBar"          実績バー
R324  |  |  |  +- "milestoneMark"      マイルストーンマーク
R325  |  |  +- highlightBoxId          箱（highlightBox）
R326  |  |  +- snapPoint               吸着する 8 点の 1 つ（task・highlightBox）
R327  |  |     +- "topLeftCorner"      左上の角
R328  |  |     +- "topMiddle"          上の辺の中点
R329  |  |     +- "topRightCorner"     右上の角
R330  |  |     +- "rightMiddle"        右の辺の中点
R331  |  |     +- "bottomRightCorner"  右下の角
R332  |  |     +- "bottomMiddle"       下の辺の中点
R333  |  |     +- "bottomLeftCorner"   左下の角
R334  |  |     +- "leftMiddle"         左の辺の中点
R335  |  +- bodyOffsetPx               線先から箱へのずれ
R336  |  |  +- dx                      横のずれ
R337  |  |  +- dy                      縦のずれ
R338  |  +- hyperlinkAddress           リンク先の URL
R339  |  +- hyperlink                  リンクのタイトル
R340  +- passthroughTasks[]            GRS がタスクにしない MSPDI の要素
R341  |  +- precedingTaskUid           前にある、いちばん近いタスクの uid（先頭では書かない）
R342  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R343  +- passthroughResources[]        GRS が担当にしない MSPDI の要素
R344  |  +- precedingResourceUid       前にある、いちばん近い担当の uid（先頭では書かない）
R345  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R346  +- passthroughAssignments[]      GRS が割当にしない MSPDI の要素
R347  |  +- precedingAssignmentUid     前にある、いちばん近い割当の uid（先頭では書かない）
R348  |  +- mspdiElement               MSPDI の要素（構造と名のまま）
R349  +- passthroughCalendars[]        GRS が暦にしない MSPDI の要素
R350     +- precedingCalendarUid       前にある、いちばん近い暦の uid（先頭では書かない）
R351     +- mspdiElement               MSPDI の要素（構造と名のまま）
```

### 共通の型（-> で指す物）

```text
R352  Color                                色
R353  +- type                              判別子
R354  |  +- "theme"                        テーマの色に従う
R355  |  +- "palette"                      パレットの 10 色の 1 つ
R356  |  +- "custom"                       人が選んだ色
R357  +- name                              パレットの色の名（palette。明るいテーマでの見え方の名）
R358  |  +- "white"                        白
R359  |  +- "black"                        黒
R360  |  +- "dimGray"                      濃い灰色
R361  |  +- "lightGray"                    薄い灰色
R362  |  +- "red"                          赤
R363  |  +- "blue"                         青
R364  |  +- "yellow"                       黄
R365  |  +- "green"                        緑
R366  |  +- "orange"                       橙
R367  |  +- "purple"                       紫
R368  +- light                             明るいテーマの側（custom）
R369  |  +- hexColor                       色の値（#rrggbb）
R370  |  +- isCalculatedFromOppositeColor  GRS が反対の側の色から計算した側だけ true
R371  +- dark                              暗いテーマの側（custom。形は light）
R372  LaneColor                            帯の色（Color から black を除く）
R373  TaskTableWindow                      タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
R374  +- isScheduleFilterApplied           表でチェックしたタスクだけを描くか
R375  +- checkedTaskUids[]                 チェックしたタスク
R376  +- columnFilters[]                   列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R377  +- columnSort                        表の並べ方（列と向き）-> ColumnSort
R378  ResourceTableWindow                  担当の表の見せ方（担当リスト）
R379  +- isScheduleFilterApplied           表のチェックでチャートを絞るか
R380  +- checkedResourceUids[]             チェックした担当
R381  +- isUnassignedChecked               （担当なし）の行をチェックしたか
R382  +- columnFilters[]                   列のフィルタ（掛けた列ごとに 1 つ）-> ColumnFilter
R383  +- columnSort                        表の並べ方（列と向き）-> ColumnSort
R384  ColumnFilter                         列のフィルタ
R385  +- type                              判別子
R386  |  +- "values"                       値で絞る
R387  |  +- "dateRange"                    日の範囲で絞る
R388  +- column                            列（列が見せる値の名）
R389  |  +- "progressStatus"               検索・タスク: ステータス（進捗マーカーの値）
R390  |  +- "percentComplete"              検索・タスク、遅延診断: 進捗
R391  |  +- "taskType"                     検索・タスク、遅延診断: タスク種別（タスクかマイルストーンか）
R392  |  +- "taskName"                     検索・タスク、遅延診断: タスク（マイルストーン）
R393  |  +- "resourceNames"                検索・タスク、遅延診断: 担当名（そのタスクのすべての担当）
R394  |  +- "start"                        検索・タスク: 予定開始
R395  |  +- "finish"                       検索・タスク: 予定終了
R396  |  +- "actualStart"                  検索・タスク: 実績開始
R397  |  +- "actualFinish"                 検索・タスク: 実績終了
R398  |  +- "taskGroupPath"                検索・タスク: 最上位までの階層
R399  |  +- "text"                         検索・コメントボックス: 本文
R400  |  +- "taskGroupName"                検索・コメントボックス: 線先が立つタスクグループの名
R401  |  +- "leaderTargetDay"              検索・コメントボックス: 線先が立つ日
R402  |  +- "diagnosisStatus"              遅延診断: ステータス（診断の結果）
R403  |  +- "planDates"                    遅延診断: 予定日（開始〜終了）
R404  |  +- "actualDates"                  遅延診断: 実績日（開始〜終了）
R405  |  +- "diagnosisReason"              遅延診断: 理由
R406  |  +- "resourceName"                 担当リスト: 担当名
R407  |  +- "isSelected"                   担当リスト: 選択（その担当を選んでいるか）
R408  |  +- "assignedTaskCount"            担当リスト: 担当タスク数
R409  |  +- "assignedTaskNames"            担当リスト: 担当タスク
R410  +- hiddenValues[]                    隠す値（values）
R411  +- isBlankHidden                     空の行を隠すか（values）
R412  +- firstDay                          最初の日（dateRange）
R413  +- lastDay                           最後の日（dateRange）
R414  ColumnSort                           並べ替え
R415  +- column                            列（ColumnFilter.column と同じ値）
R416  +- direction                         向き
R417     +- "ascending"                    小さい順
R418     +- "descending"                   大きい順
R419  Paint                                塗り
R420  +- color                             色 -> Color
R421  +- opacityPercent                    不透明度（%）
R422  Stroke                               線（描かないときは書かない）
R423  +- color                             色 -> Color
R424  +- opacityPercent                    不透明度（%）
R425  +- widthPx                           太さ
R426  ShapeStyle                           形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
R427  +- fill                              塗り -> Paint
R428  +- stroke                            線 -> Stroke
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
