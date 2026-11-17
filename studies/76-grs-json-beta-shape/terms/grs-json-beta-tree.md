印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値（`passthrough`・`parentTaskUid`・`siblingOrder` と、`grs` の物の全体）。`[]` は配列、`→` は下の共通の型を指す。（仮）は仮に採った名か置き場、（問 x-x）はまだ開いた問い。

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
