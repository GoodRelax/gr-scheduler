# 依頼（2 回目）: GRS JSON の構造と名を、初めて読む人の目でレビューしてください

**答え方: 答えはすべて、1 つのコードブロック（```text で始めて ``` で閉じる）の中に、10 節の型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと（一言で）

下の 8 節の JSON の木と 9 節の実例を、**この形式を初めて読む外の開発者や AI になったつもりで**読み、次の 3 つを厳しく評価してください。

- **名が、中身を一発で言い当てているか**（読んだだけで意味が分かるか、紛らわしくないか）。
- **データの分け方が自然か**（どこに何があるかを、迷わず当てられるか）。
- **1 回目のレビューの指摘が、正しく直ったか**（7 節）。

褒め言葉は要りません。直すべき所を、根拠と直し方つきで挙げてください。

## 2. GRS とは

GoodRelax Scheduler（GRS）は、ブラウザだけで動く日程表のアプリです。日程を 1 つの JSON ファイル（GRS JSON）に保存します。Microsoft Project の XML 形式（MSPDI）とも、情報を失わずに読み書きします。外の道具や AI のエージェントも、この JSON とその命令を読み書きします。

## 3. 設計の目標

1. **外との約束として、長く変えずに使える名にする。** 公開した後は名を変えられないので、今が最後の機会です。
2. **MSPDI と、情報を失わずに往復する。** GRS が意味を読まない MSPDI の値も、捨てずに預かって書き戻す。
3. **人も AI も、スキーマを読まずに名だけで意味が分かる。**
4. 公開前なので、今の形との互換は気にしません。

## 4. データの分け方の考え

1. 1 つの文書を、1 つの JSON で表す。
2. 根を、何を表すかで 4 つに分ける: 形の版（`$schema` など）・見せ方（`documentSettings`）・中身（`scheduleData`）・帳簿（`documentStamp`・`changeLogEntries`）。見せ方を変えても、中身は変わらない。
3. 中身の配列は、MSPDI と往復する物（`project`・`tasks`・`calendars`・`resources`・`assignments`）と、GRS だけの物（`taskGroups`・`commentBoxes`・`highlightBoxes`・`baselineTasks` など）に分かれる。
4. MSPDI と往復する実体の直下には、MSPDI の名のキーだけを置く。GRS がその実体に付ける値は、実体の中の `grs` にまとめる（例: タスクの帯 `grs.taskGroupId`、見た目 `grs.style`、取り込み元 `grs.origin`）。GRS が意味を読まない MSPDI の値は、実体の中の `passthrough` に、MSPDI の構造と要素の名のまま預かる。
5. **2 つの木は意図したもの:** WBS の木（`tasks[].parentTaskUid`。MSPDI と往復する親子）と、画面に積む帯の木（`taskGroups[].parentId`）は、別の目的を持つ 2 つの軸です。タスクは帯に `grs.taskGroupId` で入ります。帯は、WBS のどのタスクを表すかを `derivedFromTaskUid` で持ちます（名は検討中）。

## 5. 命名の決まり

| # | 決まり |
|:---|:---|
| N-1 | キーは camelCase、型の名は PascalCase |
| N-2 | 名は、指すものを言う。略さない |
| N-3 | MSPDI から来た値は、MSPDI の名を camelCase にして使う（`StartDate` → `startDate`） |
| N-4 | キーに持ち主の名を繰り返さない（`project.title`。`projectTitle` にしない） |
| N-5 | 別の実体を指す参照は「相手の名 ＋ `Uid` か `Id`」 |
| N-6 | 識別子は 2 つだけ: MSPDI から来た実体は `uid`（整数。Project だけ MSPDI のとおり文字列）、GRS 固有の実体は `id`（ランダムな UUID 版 4） |
| N-7 | 自分の欄の組を選ぶ判別子は `type`。形を変えない分類や、別の物の型は `xxxType`。`kind` は使わない |
| N-8 | 配列は複数形 |
| N-9 | 真偽の値は `is…` で始める |
| N-10 | 量は単位で終える（`…Px`・`…Percent`・`…Minutes`・`…WorkingDays` など） |
| N-11 | GRS が決める時刻は `…At` で終える |
| N-12 | 「無い」は、キーを書かないこと 1 つで言う。`null` は使わない |
| N-13 | GRS が名を付ける日時のキーは値の型で終える: 日だけ `…Day`、時刻だけ `…Time`、日と時刻 `…DateTime`、UTC の瞬間 `…At` |
| N-14 | 列挙の値は camelCase の英語の語。MSPDI の数の符号は数のまま |
| N-15 | 空の配列も、キーを書かないことで言う |
| N-16 | 割合は `…Percent`（0〜100）、倍率は `…Ratio`（1 が既定） |
| N-17 | 判別子 `type` を持つ物は、その値が持つ欄だけを書く |

例外の決まり: **MSPDI の名を写すキーは、N-9・N-10・N-11・N-13 より強い**（だから `milestone`・`startDate`・`stop`・`resume`・`hyperlink` は MSPDI の名のまま）。`passthrough` の中のキーは MSPDI の要素の名そのまま。外の決まりが決める名（`$schema`）はそのまま。MSPDI の `Type` を写すキーは「MSPDI の親要素の名 ＋ `Type`」（`exceptionType`・`predecessorLinkType`・`resourceType`。仮）。

## 6. 順と往復の決まり（1 回目のレビューで誤解が出た所）

- **XML の子の順:** MSPDI の XSD は子の順を決めています。GRS は書き出しで、XSD の順に並べ直します。だから JSON に `ordinal`（順番の数）は持ちません。繰り返す要素は配列の順で戻します。
- **GRS が行にしない MSPDI の一覧の要素**（UID 0 の要約タスク、空のタスクなど）は、一覧ごとの `passthroughTasks[]` などに預かります。`precedingTaskUid` は「同じ一覧で前にある、GRS が `tasks[]` に持つタスクのうち、いちばん近いものの uid」です。キーが無ければ一覧の先頭。同じ先を指す要素どうしは配列の順。指す先を動かすと付いて行き、消すとさらに前のタスクへ書き換えます。UID 0 の要約タスクはいつも先頭です。
- **見せ方の状態も保存する:** 帯の開閉（`treeState`）なども文書に保存し、取り消しで戻せる、と決めています。

## 7. 1 回目のレビューの指摘と、直した所

| 1 回目の指摘 | 直した所 |
|:---|:---|
| タスクに付く GRS の値が、別々の配列（`taskGroupMembers`・`taskStyles`・`taskOrigins`）に散らばる | タスクの中の `grs` にまとめた。3 つの配列は無くした |
| Project から移した 7 つの値は性質がばらばら | 色相と遅延診断の許し幅は `documentSettings` へ。残る 5 つは `scheduleData.metadata`（仮） |
| 日時の名・列挙の値・空の配列・割合と倍率・判別子の欄の決まりが無い | N-13〜N-17 を足した |
| N-3 と N-9 などの優先が無い | MSPDI の名が勝つ、と明記した（5 節） |
| `shownTaskUids` などが描いた結果に読める | `checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`（仮） |
| `point`・`graphicPart` が座標に読める | `snapPoint`・`snapPart`（仮） |
| `sourceProjectId` が N-5・N-6 に外れる | `sourceProjectUid` |
| `editGroup`・`firstOutlineLevel`・`fontSizeStep`・`fitSpan` が何か分からない | `editorGroupName`・`topTaskOutlineLevel`・`fontSize`・`fitDayRange`（仮） |
| 持ち越した一覧の要素の位置を、先頭や続く要素で戻せない | 6 節の決まりで戻せる（1 回目の質問状に書き漏らした） |

## 8. JSON の木（今の最善の案）

印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値（`passthrough`・`parentTaskUid`・`siblingOrder` と、`grs` の物の全体）。`[]` は配列、`→` は下の共通の型を指す。（仮）は仮に採った名か置き場、（問 x-x）はまだ開いた問い。
「（仮）」は仮に採った名、「（問 …）」はまだ決めていない名です。

```text
ScheduleDocument                                    GRS JSON の 1 ファイル
├─ $schema                                          スキーマの所（URL）
├─ schemaVersion                                    スキーマの形が最後に変わった時（UTC）
├─ buildVersion                                     書いた GRS のビルドの時（UTC）
├─ documentSettings                                 文書設定
│   ├─ displayScalePercent                          表示の倍率（%）
│   ├─ fontSize （仮）                              文字の大きさ（small・medium・large）
│   ├─ dayWidthPx                                   暦日 1 日の幅
│   ├─ verticalZoomRatio                            縦の大きさの比（1 が既定）
│   ├─ taskGroupAutoExpandDepth                     自動で開く深さ
│   ├─ scrollPosition                               開いたときの位置
│   │   ├─ type                                     notDecided・decided
│   │   ├─ leftEdgeDay                              左の端の日（decided）
│   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か（decided）
│   │   ├─ topEdgeTaskGroupId                       上の端の帯（decided）
│   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か（decided）
│   ├─ fitDayRange （仮）                           全体表示の期間
│   │   ├─ firstDay                                 最初の日
│   │   ├─ lastDay                                  最後の日
│   │   └─ isFixed                                  期間を固定するか
│   ├─ viewTimeZone                                 見せるタイムゾーン
│   │   ├─ type                                     sameAsScheduleData・fixed
│   │   └─ utcOffsetMinutes                         UTC との差（分）（fixed）
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ utcOffsetMinutes                         UTC との差（分）
│   │   └─ isDaylightSavingTime                     夏時間のゾーンか
│   ├─ isTimeOfDayVisible                           時刻を見せるか
│   ├─ isPlanBarVisible                             予定バーを見せるか
│   ├─ isPlanDatesVisible                           予定の日付を見せるか
│   ├─ isActualBarVisible                           実績バーを見せるか
│   ├─ isPercentCompleteLabelVisible                完了率のラベルを見せるか
│   ├─ isBaselineOutlineVisible                     前回予定の輪郭を見せるか
│   ├─ isProgressLineVisible                        進捗線を見せるか
│   ├─ isProgressMarkVisible                        進捗点を見せるか
│   ├─ isDependencyLineVisible                      依存線を見せるか
│   ├─ isAssigneeLabelVisible                       担当のラベルを見せるか
│   ├─ isDateGridLinesVisible                       日の罫線を見せるか
│   ├─ isGroupGridLinesVisible                      帯の罫線を見せるか
│   ├─ taskStackDirection                           帯の中でタスクを積む向き（up・down）
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ themeHueDegrees （仮）                       テーマの色相（度）（Project から移す。問 6-13-4）
│   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ rootTreeState                                木の根の状態（auto・collapsed）
│   ├─ pinnedTaskGroupIds[]                         ピン止めした帯の id
│   ├─ parentTaskProgressToleranceWorkingDays （仮）  遅延診断の許し幅（稼働日）（Project から移す。問 6-13-4）
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ
│       ├─ delayDiagnosticsReportWindow             遅延診断レポート
│       ├─ resourceListWindow                       担当リスト
│       └─ （3 つの表は、どれも次の欄を持つ）
│           ├─ isTaskFilterApplied                  表でチェックしたタスクだけを描くか
│           ├─ checkedTaskUids[] （仮）             チェックしたタスク（検索・遅延診断）
│           ├─ checkedResourceUids[] （仮）         チェックした担当（担当リスト）
│           ├─ isUnassignedChecked （仮）           （担当なし）の行をチェックしたか（担当リスト）
│           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
│           └─ columnSort                           並べ替えの列と向き → ColumnSort
├─ scheduleData                                     スケジュールデータ
│   ├─ ［MSPDI と往復する群］
│   │   ├─ project [M]                              プロジェクト（1 件）
│   │   │   ├─ uid [M]                              一意な識別子（文字列）
│   │   │   ├─ name [M]                             プロジェクト名
│   │   │   ├─ title [M]                            タイトル
│   │   │   ├─ subject [M]                          件名
│   │   │   ├─ category [M]                         分類
│   │   │   ├─ company [M]                          会社
│   │   │   ├─ manager [M]                          管理者
│   │   │   ├─ author [M]                           作成者
│   │   │   ├─ revision [M]                         保存した回数
│   │   │   ├─ creationDate [M]                     作った日時
│   │   │   ├─ startDate [M]                        開始の日時
│   │   │   ├─ statusDate [M]                       基準日
│   │   │   ├─ minutesPerDay [M]                    1 日の稼働の分
│   │   │   ├─ minutesPerWeek [M]                   1 週の稼働の分
│   │   │   ├─ daysPerMonth [M]                     1 か月の稼働日
│   │   │   ├─ weekStartDay [M]                     週の始まりの曜日（0 が日曜）
│   │   │   ├─ defaultStartTime [M]                 既定の開始時刻
│   │   │   ├─ defaultFinishTime [M]                既定の終了時刻
│   │   │   ├─ calendarUid [M]                      稼働日を数える暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ tasks[] [M]                              タスク
│   │   │   ├─ uid [M]                              一意な識別子
│   │   │   ├─ name [M]                             タスク名
│   │   │   ├─ notes [M]                            メモ
│   │   │   ├─ start [M]                            予定の開始
│   │   │   ├─ finish [M]                           予定の終了
│   │   │   ├─ milestone [M]                        マイルストーンか
│   │   │   ├─ deadline [M]                         期限
│   │   │   ├─ actualStart [M]                      実績の開始
│   │   │   ├─ stop [M]                             作業が止まった時
│   │   │   ├─ actualFinish [M]                     実績の終了
│   │   │   ├─ resume [M]                           再開の予定
│   │   │   ├─ resumeValid [M]                      再開日が有効か
│   │   │   ├─ percentComplete [M]                  完了率
│   │   │   ├─ ◆parentTaskUid                       WBS の親タスク（最上位では書かない）
│   │   │   ├─ ◆siblingOrder                        兄弟の中の順
│   │   │   ├─ calendarUid [M]                      タスクの暦
│   │   │   ├─ hyperlinkAddress [M]                 リンク先の URL
│   │   │   ├─ hyperlink [M]                        リンクのタイトル
│   │   │   ├─ ◆grs                                 タスクに付く GRS の値
│   │   │   │   ├─ fadeInCalendarDays               始まりのフェード暦日
│   │   │   │   ├─ fadeOutCalendarDays              終わりのフェード暦日
│   │   │   │   ├─ style                            見た目（ShapeStyle に形のキーを足す）
│   │   │   │   │   ├─ taskShape                    バーの形（マイルストーンでないとき）
│   │   │   │   │   ├─ milestoneShape               マイルストーンの形（マイルストーンのとき）
│   │   │   │   │   ├─ fill                         塗り → Paint
│   │   │   │   │   └─ stroke                       縁 → Stroke
│   │   │   │   ├─ taskGroupId                      載せるタスクグループ
│   │   │   │   └─ origin                           取り込み元の控え（取り込んだタスクだけ）
│   │   │   │       ├─ sourceProjectUid （仮）      元のファイルの Project の UID
│   │   │   │       ├─ sourceUid                    元のタスクの UID
│   │   │   │       ├─ importSessionId              取り込みの id
│   │   │   │       └─ lastSeenMspdiImportNumber    最後に見た取り込み
│   │   │   ├─ predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
│   │   │   │   ├─ predecessorUid [M]               先行タスク
│   │   │   │   ├─ predecessorLinkType [M] (Type) （仮）  依存の種類（0 FF・1 FS・2 SF・3 SS）
│   │   │   │   ├─ linkLag [M]                      ラグ（0.1 分単位）
│   │   │   │   ├─ lagFormat [M]                    ラグの単位
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ calendars[] [M]                          暦
│   │   │   ├─ uid [M]                              一意な識別子
│   │   │   ├─ name [M]                             暦の名
│   │   │   ├─ isBaseCalendar [M]                   基本の暦か
│   │   │   ├─ baseCalendarUid [M]                  受け継ぐ元の暦
│   │   │   ├─ weekDays[] [M]                       曜日ごとの稼働
│   │   │   │   ├─ dayType [M]                      曜日（1 が日曜）
│   │   │   │   ├─ dayWorking [M]                   稼働日か
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
│   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
│   │   │   │   │   └─ toTime [M]                   終わりの時刻
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   ├─ exceptions[] [M]                     例外の日
│   │   │   │   ├─ name [M]                         例外の名
│   │   │   │   ├─ fromDate [M] (TimePeriod/FromDate)  最初の日
│   │   │   │   ├─ toDate [M] (TimePeriod/ToDate)   最後の日
│   │   │   │   ├─ dayWorking [M]                   稼働日か
│   │   │   │   ├─ exceptionType [M] (Type) （仮）  例外の繰り返し方
│   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
│   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
│   │   │   │   │   └─ toTime [M]                   終わりの時刻
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ resources[] [M]                          担当
│   │   │   ├─ uid [M]                              一意な識別子
│   │   │   ├─ name [M]                             担当の名
│   │   │   ├─ resourceType [M] (Type) （仮）       資材か作業か
│   │   │   ├─ isCostResource [M]                   コストの担当か
│   │   │   ├─ calendarUid [M]                      担当の暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   └─ assignments[] [M]                        割当
│   │       ├─ uid [M]                              一意な識別子
│   │       ├─ taskUid [M]                          就くタスク
│   │       ├─ resourceUid [M]                      就く担当
│   │       └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   └─ ［GRS だけが持つ群］
│       ├─ metadata （仮）                          スケジュールデータの GRS の値（Project から移す。問 6-13-4・6-13-8）
│       │   ├─ scheduleDataTimeZone                 データの日時の時差（UTC+09:00 の形）
│       │   ├─ sourceFormat                         元の形式（grs・pj12・pj15）
│       │   ├─ topTaskOutlineLevel （仮）           最上位のタスクの OutlineLevel
│       │   ├─ highestIssuedUid                     uid の数え手
│       │   └─ lastMspdiImportNumber                MSPDI の取り込み回数
│       ├─ taskGroups[]                             タスクグループ
│       │   ├─ id                                   一意な UUID
│       │   ├─ name                                 タスクグループ名
│       │   ├─ style                                見た目
│       │   │   └─ color                            帯の色 → LaneColor
│       │   ├─ minHeightPx                          帯の最も低い高さ
│       │   ├─ parentId                             親のタスクグループ（最上位では書かない）
│       │   ├─ siblingOrder                         兄弟の中の順
│       │   ├─ derivedFromTaskUid （問 6-9-2）      表す WBS のタスク
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   ├─ hyperlink                            リンクのタイトル
│       │   ├─ treeState                            開閉の状態（auto・collapsed・expanded・temporarilyExpanded・hidden）
│       │   └─ editorGroupName （仮）               編集してよい組の名
│       ├─ commentBoxes[]                           コメントボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ text                                 文
│       │   ├─ style                                見た目（ShapeStyle に font を足す）
│       │   │   ├─ fill                             箱の塗り → Paint
│       │   │   ├─ stroke                           枠と引出し線 → Stroke
│       │   │   └─ font                             文字の見た目
│       │   │       ├─ color                        文字の色 → Color
│       │   │       └─ sizePx                       文字の大きさ
│       │   ├─ leaderTarget                         引出し線の先
│       │   │   ├─ type                             freePoint・task・highlightBox
│       │   │   ├─ dateTime                         時点（freePoint）
│       │   │   ├─ taskGroupId                      帯（freePoint）
│       │   │   ├─ laneTopOffsetPercent             帯の中の高さ（上の縁から %）（freePoint）
│       │   │   ├─ taskUid                          タスク（task）
│       │   │   ├─ snapPart （仮）                  吸着する図形の部分（plannedBar・actualBar・milestone）（task）
│       │   │   ├─ highlightBoxId                   箱（highlightBox）
│       │   │   └─ snapPoint （仮）                 吸着する 8 点の 1 つ（task・highlightBox）
│       │   ├─ bodyOffsetPx                         線先から箱へのずれ
│       │   │   ├─ dx                               横のずれ
│       │   │   └─ dy                               縦のずれ
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   └─ hyperlink                            リンクのタイトル
│       ├─ highlightBoxes[]                         ハイライトボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ style                                見た目（ShapeStyle に cornerRadiusPx を足す）
│       │   │   ├─ cornerRadiusPx                   角の丸みの半径
│       │   │   ├─ fill                             塗り → Paint
│       │   │   └─ stroke                           枠 → Stroke
│       │   ├─ firstDay                             最初の日
│       │   ├─ lastDay                              最後の日
│       │   ├─ topTaskGroupId                       上の縁の帯
│       │   └─ bottomTaskGroupId                    下の縁の帯
│       ├─ baselineTasks[]                          前回予定
│       │   ├─ uid                                  今のタスクの uid
│       │   ├─ name                                 タスク名
│       │   ├─ start                                前の予定の開始
│       │   ├─ finish                               前の予定の終了
│       │   └─ milestone                            マイルストーンか
│       ├─ passthroughTasks[]                       GRS がタスクにしない MSPDI の要素
│       │   ├─ precedingTaskUid                     前にある、いちばん近いタスクの uid（先頭では書かない）
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       ├─ passthroughResources[]                   GRS が担当にしない MSPDI の要素
│       │   ├─ precedingResourceUid                 前にある、いちばん近い担当の uid（先頭では書かない）
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       ├─ passthroughAssignments[]                 GRS が割当にしない MSPDI の要素
│       │   ├─ precedingAssignmentUid               前にある、いちばん近い割当の uid（先頭では書かない）
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       └─ passthroughCalendars[]                   GRS が暦にしない MSPDI の要素
│           ├─ precedingCalendarUid                 前にある、いちばん近い暦の uid（先頭では書かない）
│           └─ mspdiElement                         MSPDI の要素（構造と名のまま）
├─ documentStamp                                    文書刻印
│   ├─ scheduleDataUpdatedAt                        データが変わった時（UTC）
│   ├─ documentUpdatedAt                            文書が変わった時（UTC）
│   ├─ fileSavedAt                                  保存した時（UTC）
│   └─ lastEditedBy                                 最後に書いた者
│       ├─ type                                     user・template・agent
│       └─ name                                     AI が自分に付けた名（agent）
└─ changeLogEntries[]                               変更履歴
    ├─ changedAt                                    変更の時（UTC）
    ├─ changedBy                                    変更した者
    ├─ affectedArea                                 及んだ部分
    ├─ changeDescription                            何が変わったか
    ├─ reason                                       理由
    └─ remarks                                      そのほか

共通の型（→ で指す物）
├─ Color                                            色
│   ├─ type                                         theme・palette・custom
│   ├─ name                                         パレットの色の名（palette）。paper・ink・dimGray・lightGray・red・blue・yellow・green・orange・purple（paper・ink の名は 問 6-6-4-12）
│   ├─ light                                        明るいテーマの側（custom）
│   │   ├─ hexColor                                 色の値（#rrggbb）
│   │   └─ derivedFrom                              GRS が作った元の側（人が選んだ値なら書かない）
│   └─ dark                                         暗いテーマの側（custom。形は light）
├─ LaneColor                                        Color から ink を除く
├─ ColumnFilter                                     列のフィルタ
│   ├─ type                                         values・dateRange
│   ├─ column                                       列（列の変わらない英語の名）
│   ├─ hiddenValues[]                               隠す値（values）
│   ├─ isBlankHidden                                空の行を隠すか（values）
│   ├─ firstDay                                     最初の日（dateRange）
│   └─ lastDay                                      最後の日（dateRange）
├─ ColumnSort                                       並べ替え
│   ├─ column                                       列
│   └─ direction                                    向き（ascending・descending）
├─ Paint                                            塗り
│   ├─ color                                        色 → Color
│   └─ opacityPercent                               不透明度（%）
├─ Stroke                                           線（描かないときは書かない）
│   ├─ color                                        色 → Color
│   ├─ opacityPercent                               不透明度（%）
│   └─ widthPx                                      太さ
└─ ShapeStyle                                       形の見た目（タスク・コメントボックス・ハイライトボックスで共にする）
    ├─ fill                                         塗り → Paint
    └─ stroke                                       線 → Stroke
```

## 9. 実例（全部の部分を 1 度ずつ使った小さな文書）

表の列の名（`taskName` など）は、まだ決めていない仮の名です。

```json
{
  "$schema": "https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json",
  "schemaVersion": "2026-11-17T00:00:00Z",
  "buildVersion": "2026-11-17T03:00:00Z",
  "documentSettings": {
    "displayScalePercent": 100,
    "fontSize": "medium",
    "dayWidthPx": 24,
    "verticalZoomRatio": 1,
    "taskGroupAutoExpandDepth": 2,
    "scrollPosition": {
      "type": "decided",
      "leftEdgeDay": "2026-11-30",
      "leftEdgeDayOffsetPercent": 0,
      "topEdgeTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
      "topEdgeTaskGroupOffsetPercent": 0
    },
    "fitDayRange": {
      "firstDay": "2026-11-30",
      "lastDay": "2026-12-11",
      "isFixed": false
    },
    "viewTimeZone": {
      "type": "fixed",
      "utcOffsetMinutes": 540
    },
    "displayTimeZones": [
      {
        "utcOffsetMinutes": 0,
        "isDaylightSavingTime": false
      },
      {
        "utcOffsetMinutes": -240,
        "isDaylightSavingTime": true
      }
    ],
    "isTimeOfDayVisible": false,
    "isPlanBarVisible": true,
    "isPlanDatesVisible": true,
    "isActualBarVisible": true,
    "isPercentCompleteLabelVisible": true,
    "isBaselineOutlineVisible": true,
    "isProgressLineVisible": true,
    "isProgressMarkVisible": true,
    "isDependencyLineVisible": true,
    "isAssigneeLabelVisible": true,
    "isDateGridLinesVisible": true,
    "isGroupGridLinesVisible": false,
    "taskStackDirection": "up",
    "isThemeMonochrome": false,
    "themeHueDegrees": 214,
    "taskGroupPanelWidthPx": 160,
    "isTaskGroupPanelWidthFixed": false,
    "rootTreeState": "auto",
    "pinnedTaskGroupIds": [
      "db19099a-0302-418d-82e1-e95c7a6a093c"
    ],
    "parentTaskProgressToleranceWorkingDays": 1,
    "tableWindows": {
      "searchWindow": {
        "isTaskFilterApplied": true,
        "checkedTaskUids": [2, 3],
        "columnFilters": [
          {
            "type": "values",
            "column": "taskName",
            "hiddenValues": ["Work package A"],
            "isBlankHidden": true
          }
        ],
        "columnSort": {
          "column": "start",
          "direction": "ascending"
        }
      },
      "delayDiagnosticsReportWindow": {
        "isTaskFilterApplied": false,
        "checkedTaskUids": [2],
        "columnFilters": [
          {
            "type": "dateRange",
            "column": "finish",
            "firstDay": "2026-12-01",
            "lastDay": "2026-12-31"
          }
        ],
        "columnSort": {
          "column": "finish",
          "direction": "descending"
        }
      },
      "resourceListWindow": {
        "isTaskFilterApplied": false,
        "checkedResourceUids": [1],
        "isUnassignedChecked": true,
        "columnSort": {
          "column": "resourceName",
          "direction": "ascending"
        }
      }
    }
  },
  "scheduleData": {
    "project": {
      "uid": "c335b2c9-5721-419b-8203-6ea85ce2dc98",
      "name": "Sample Schedule",
      "title": "Sample Schedule",
      "subject": "A two-level WBS example",
      "category": "Example",
      "company": "Example Org",
      "manager": "Manager A",
      "author": "Author A",
      "revision": 3,
      "creationDate": "2026-11-20T09:00:00",
      "startDate": "2026-12-01T08:00:00",
      "statusDate": "2026-12-03T17:00:00",
      "minutesPerDay": 480,
      "minutesPerWeek": 2400,
      "daysPerMonth": 20,
      "weekStartDay": 1,
      "defaultStartTime": "08:00:00",
      "defaultFinishTime": "17:00:00",
      "calendarUid": 1,
      "passthrough": {
        "ScheduleFromStart": 1,
        "CurrencyCode": "USD"
      }
    },
    "tasks": [
      {
        "uid": 1,
        "name": "Work package A",
        "notes": "Parent of the two steps below.",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": false,
        "percentComplete": 50,
        "siblingOrder": 1,
        "calendarUid": 1,
        "hyperlinkAddress": "https://example.com/work-package-a",
        "hyperlink": "Work package A page",
        "grs": {
          "style": {
            "taskShape": "rectangle",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c"
        }
      },
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-03T17:00:00",
        "milestone": false,
        "deadline": "2026-12-03T17:00:00",
        "actualStart": "2026-12-01T08:00:00",
        "stop": "2026-12-02T12:00:00",
        "resume": "2026-12-03T08:00:00",
        "resumeValid": true,
        "percentComplete": 40,
        "parentTaskUid": 1,
        "siblingOrder": 1,
        "calendarUid": 1,
        "grs": {
          "fadeInCalendarDays": 2,
          "fadeOutCalendarDays": 1,
          "style": {
            "taskShape": "chevron",
            "fill": {
              "color": { "type": "palette", "name": "blue" },
              "opacityPercent": 80
            },
            "stroke": {
              "color": { "type": "palette", "name": "ink" },
              "opacityPercent": 100,
              "widthPx": 1
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "origin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceUid": 12,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportNumber": 1
          }
        },
        "passthrough": {
          "Priority": 500,
          "ExtendedAttribute": [
            { "FieldID": "188743731", "Value": "Alpha" },
            { "FieldID": "188743734", "Value": "Beta" }
          ]
        }
      },
      {
        "uid": 3,
        "name": "Draft approved",
        "start": "2026-12-04T17:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": true,
        "deadline": "2026-12-04T17:00:00",
        "actualStart": "2026-12-04T17:00:00",
        "actualFinish": "2026-12-04T17:00:00",
        "percentComplete": 100,
        "parentTaskUid": 1,
        "siblingOrder": 2,
        "grs": {
          "style": {
            "milestoneShape": "diamond",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5"
        },
        "predecessorLinks": [
          {
            "predecessorUid": 2,
            "predecessorLinkType": 1,
            "linkLag": 4800,
            "lagFormat": 7,
            "passthrough": {
              "CrossProject": 0
            }
          }
        ]
      }
    ],
    "calendars": [
      {
        "uid": 1,
        "name": "Standard",
        "isBaseCalendar": true,
        "weekDays": [
          {
            "dayType": 1,
            "dayWorking": false,
            "passthrough": {
              "TimePeriod": {
                "FromDate": "2026-01-01T00:00:00",
                "ToDate": "2026-12-31T23:59:00"
              }
            }
          },
          {
            "dayType": 2,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 3,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 4,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 5,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 6,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 7,
            "dayWorking": false
          }
        ],
        "exceptions": [
          {
            "name": "Make-up working day",
            "fromDate": "2026-12-05T00:00:00",
            "toDate": "2026-12-05T23:59:00",
            "dayWorking": true,
            "exceptionType": 1,
            "recurrencePeriod": 1,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" }
            ],
            "passthrough": {
              "EnteredByOccurrences": 1,
              "Occurrences": 1
            }
          }
        ],
        "passthrough": {
          "GUID": "8677e724-9b8c-4b5e-aa02-c53710734eb3",
          "IsBaselineCalendar": 0
        }
      },
      {
        "uid": 2,
        "name": "Worker A",
        "isBaseCalendar": false,
        "baseCalendarUid": 1
      }
    ],
    "resources": [
      {
        "uid": 1,
        "name": "Worker A",
        "resourceType": 1,
        "isCostResource": false,
        "calendarUid": 2,
        "passthrough": {
          "Initials": "WA",
          "MaxUnits": 1
        }
      }
    ],
    "assignments": [
      {
        "uid": 1,
        "taskUid": 2,
        "resourceUid": 1,
        "passthrough": {
          "Units": 1,
          "Work": "PT16H0M0S"
        }
      }
    ],
    "metadata": {
      "scheduleDataTimeZone": "UTC+09:00",
      "sourceFormat": "pj15",
      "topTaskOutlineLevel": 1,
      "highestIssuedUid": 4,
      "lastMspdiImportNumber": 1
    },
    "taskGroups": [
      {
        "id": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "name": "Work package A",
        "style": {
          "color": { "type": "theme" }
        },
        "minHeightPx": 40,
        "siblingOrder": 1,
        "derivedFromTaskUid": 1,
        "hyperlinkAddress": "https://example.com/lanes/work-package-a",
        "hyperlink": "Lane notes",
        "treeState": "expanded",
        "editorGroupName": "Team A"
      },
      {
        "id": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "name": "Steps",
        "style": {
          "color": { "type": "palette", "name": "lightGray" }
        },
        "parentId": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "siblingOrder": 1,
        "treeState": "auto"
      }
    ],
    "commentBoxes": [
      {
        "id": "23739f92-76e5-494f-aec7-3eab514f8f6e",
        "text": "Paused for half a day; resumes on Dec 3.",
        "style": {
          "fill": {
            "color": { "type": "palette", "name": "paper" },
            "opacityPercent": 90
          },
          "stroke": {
            "color": { "type": "palette", "name": "orange" },
            "opacityPercent": 100,
            "widthPx": 1
          },
          "font": {
            "color": {
              "type": "custom",
              "light": { "hexColor": "#1f2328" },
              "dark": { "hexColor": "#e6edf3", "derivedFrom": "light" }
            },
            "sizePx": 12
          }
        },
        "leaderTarget": {
          "type": "task",
          "taskUid": 2,
          "snapPart": "plannedBar",
          "snapPoint": "topRightCorner"
        },
        "bodyOffsetPx": {
          "dx": 40,
          "dy": -30
        },
        "hyperlinkAddress": "https://example.com/notes/prepare-draft",
        "hyperlink": "Draft notes"
      }
    ],
    "highlightBoxes": [
      {
        "id": "8bc08829-d2ac-4cc5-87f8-c2fd9591a23a",
        "style": {
          "cornerRadiusPx": 4,
          "fill": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 30
          },
          "stroke": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 100,
            "widthPx": 2
          }
        },
        "firstDay": "2026-12-03",
        "lastDay": "2026-12-04",
        "topTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "bottomTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5"
      }
    ],
    "baselineTasks": [
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-02T17:00:00",
        "milestone": false
      }
    ],
    "passthroughTasks": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Name": "Sample Schedule",
          "Type": 1,
          "IsNull": 0,
          "OutlineNumber": "0",
          "OutlineLevel": 0,
          "Summary": 1
        }
      },
      {
        "precedingTaskUid": 2,
        "mspdiElement": {
          "UID": 4,
          "ID": 3,
          "IsNull": 1
        }
      }
    ],
    "passthroughResources": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Type": 1,
          "IsNull": 0
        }
      },
      {
        "precedingResourceUid": 1,
        "mspdiElement": {
          "UID": 2,
          "ID": 2,
          "IsNull": 1
        }
      }
    ],
    "passthroughAssignments": [
      {
        "precedingAssignmentUid": 1,
        "mspdiElement": {
          "UID": 2,
          "TaskUID": 3,
          "ResourceUID": -65535,
          "Units": 1
        }
      }
    ],
    "passthroughCalendars": [
      {
        "precedingCalendarUid": 2,
        "mspdiElement": {
          "UID": 3,
          "Name": "Baseline calendar",
          "IsBaseCalendar": 1,
          "IsBaselineCalendar": 1,
          "BaseCalendarUID": -1
        }
      }
    ]
  },
  "documentStamp": {
    "scheduleDataUpdatedAt": "2026-12-03T05:10:00Z",
    "documentUpdatedAt": "2026-12-03T05:12:00Z",
    "fileSavedAt": "2026-12-03T05:15:00Z",
    "lastEditedBy": {
      "type": "agent",
      "name": "planning-assistant"
    }
  },
  "changeLogEntries": [
    {
      "changedAt": "2026-12-02T03:00:00Z",
      "changedBy": "Manager A",
      "affectedArea": "tasks",
      "changeDescription": "Imported the plan from the MSPDI file.",
      "reason": "Start tracking the work package.",
      "remarks": "First import."
    },
    {
      "changedAt": "2026-12-03T05:10:00Z",
      "changedBy": "planning-assistant",
      "affectedArea": "Prepare draft",
      "changeDescription": "Recorded a stop on Dec 2 and a resume on Dec 3.",
      "reason": "Work paused for half a day."
    }
  ]
}
```

## 10. 答えの型（この型のまま、1 つのコードブロックに書く）

```text
[1] 1 回目の指摘は直ったか
| 指摘 | 直ったか（○・△・×） | 残る問題 |

[2] 分け方
- 評価: （一言）
- 直す所: （箇条書き。無ければ「無し」）

[3] 名の問題（重い順、最大 10）
| # | 今のキー（場所） | 問題 | 直す名 | 理由 |

[4] 決まりの穴（5 節・6 節）
- （箇条書き）

[5] 実例（9 節）の誤りや、木（8 節）との食い違い
- （箇条書き）

[6] AI と外の道具がつまずく所
- （箇条書き）

[7] 特に意見が欲しい 3 点
- (a) `scheduleData.metadata`（中に置く）と、根に `scheduleMetadata` を並べて置くのと、どちらが良いか: 推奨 … 理由 …
- (b) タスクの中の `grs`（MSPDI の名のキーと GRS の値を名前空間で分ける）は良い形か: 推奨 … 理由 …
- (c) MSPDI の `Type` を写す名 `exceptionType`・`predecessorLinkType`・`resourceType`: 推奨 … 理由 …

[8] 全体の点数（10 点満点）と、一番直すべき 1 点
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。**
