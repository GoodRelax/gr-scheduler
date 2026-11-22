印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値（`passthrough`・`parentTaskUid`・`siblingOrder` と、`grs` の物の全体）。`[]` は配列、`→` は下の共通の型を指す。「型 X」は、その値のスキーマの型の名。（仮）は仮に採った名か置き場、（問 x-x）はまだ開いた問い。

```text
ScheduleDocument                                    GRS JSON の 1 ファイル
├─ $schema                                          スキーマの所（URL）
├─ schemaVersionUtc                                 スキーマの版（形が最後に変わった UTC の時刻）
├─ buildVersionUtc                                  書いた GRS のビルドの版（UTC の時刻）
├─ documentSettings                                 文書設定
│   ├─ displayScaleRatio                            表示の倍率（1 が等倍）
│   ├─ fontSizePreset                               文字の大きさの段（small・medium・large）
│   ├─ dayWidthPx                                   暦日 1 日の幅
│   ├─ verticalZoom                                 縦のズーム（縦の 1 刻みと全体表示が、2 つを一緒に書く）
│   │   ├─ ratio                                    縦の倍率（1 が既定）
│   │   └─ automaticallyShownDepth                  automatic の帯を、この深さまで出す（1〜maxGroupDepth、両端を含む。固定の既定値は無い）
│   ├─ scrollPosition                               開いたときの位置
│   │   ├─ type                                     automatic・fixed
│   │   ├─ leftEdgeDay                              左の端の日（fixed）
│   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か（fixed）
│   │   ├─ topEdgeTaskGroupId                       上の端の帯（fixed）
│   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か（fixed）
│   ├─ fitDayRange                                  全体表示期間
│   │   ├─ type                                     fixed・automatic（automatic は描ける物すべての範囲で、期間を持たない）
│   │   ├─ firstDay                                 最初の日（fixed）
│   │   └─ lastDay                                  最後の日（fixed）
│   ├─ viewTimeZone                                 表示の基準タイムゾーン
│   │   ├─ type                                     sameAsScheduleData・fixed
│   │   └─ utcOffset                                UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ utcOffset                                UTC との差（"+09:00" の形）
│   │   └─ zoneNameType                             出すゾーンの名の種類（standard・daylight）。差 utcOffset はもう夏時間の分を含む
│   ├─ isTimeOfDayVisible                           時刻を見せるか
│   ├─ isPlanBarVisible                             予定バーを見せるか
│   ├─ isPlanDatesVisible                           予定の日付を見せるか
│   ├─ isActualBarVisible                           実績バーを見せるか
│   ├─ isPercentCompleteLabelVisible                完了率のラベルを見せるか
│   ├─ isBaselineOutlineVisible                     前回予定を重ねるか（前回予定輪郭）
│   ├─ isProgressLineVisible                        進捗線を見せるか
│   ├─ isProgressMarkVisible                        進捗マークを見せるか
│   ├─ isDependencyLineVisible                      依存線を見せるか
│   ├─ isAssigneeLabelVisible                       担当のラベルを見せるか
│   ├─ isDateGridLinesVisible                       日の罫線を見せるか
│   ├─ isGroupGridLinesVisible                      グループ罫線（タスクグループの境の横線）を見せるか
│   ├─ taskStackDirection                           帯の中でタスクを積む向き（bottomToTop・topToBottom）
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ themeHue                                     テーマの色相の名（blue・blueGreen・green・yellowGreen・yellow・orange・red・redPurple・purple・indigo）（Project から移した。JDG-3713）
│   ├─ taskGroupPanelWidthPx                        タスクグループパネルの幅（表示の倍率 1 のときの CSS ピクセル）
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ pinnedTaskGroupIds[]                         ピン止めしたタスクグループの id
│   ├─ delayDiagnosisSettings                       遅延診断の設定
│   │   └─ toleranceWorkingDays                     遅延診断が親タスクの進み具合に許す幅（稼働日）
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ → TaskTableWindow
│       ├─ delayDiagnosisReportWindow               遅延診断レポート → TaskTableWindow
│       └─ resourceListWindow                       担当リスト → ResourceTableWindow
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
│   │   │   │   ├─ style                            見た目（型 TaskStyle。ShapeStyle に形のキーを足す）
│   │   │   │   │   ├─ taskShape                    バーの形（マイルストーンでないときだけ）。rectangle 矩形・chevron 矢羽根・arrow 矢印・dumbbell ダンベル
│   │   │   │   │   ├─ milestoneShape               マイルストーンマークの形（マイルストーンのときだけ）。circle・hexagon・pentagon・diamond・square・star・triangleUp・triangleDown・file・box・floppyDisk・cylinder・meetingPeople・smilingFace・beerMug
│   │   │   │   │   ├─ fill                         塗り → Paint
│   │   │   │   │   └─ stroke                       縁 → Stroke
│   │   │   │   ├─ taskGroupId                      載せるタスクグループ
│   │   │   │   └─ importOrigin                     取り込み元の控え（型 ImportOrigin。取り込んだタスクだけ）
│   │   │   │       ├─ sourceProjectUid             元のファイルの Project の UID
│   │   │   │       ├─ sourceTaskUid                元のファイルでの、このタスクの UID
│   │   │   │       ├─ importSessionId              取り込みの id（取り込みのたびに GRS が作る。元に Project の UID が無いときの代わり）
│   │   │   │       └─ lastSeenMspdiImportCount     このタスクを最後に含んでいた取り込みが何回目か
│   │   │   ├─ predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
│   │   │   │   ├─ predecessorUid [M]               先行タスク
│   │   │   │   ├─ type [M] (Type)                  依存の種類（0 FF・1 FS・2 SF・3 SS）。判別子ではない
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
│   │   │   │   ├─ type [M] (Type)                  例外の繰り返し方（1 毎日〜9 繰り返さない）。判別子ではない
│   │   │   │   ├─ period [M]                       繰り返しの間隔（N-3 により MSPDI の名 Period のまま）
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
│   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
│   │   │   │   │   └─ toTime [M]                   終わりの時刻
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ resources[] [M]                          担当
│   │   │   ├─ uid [M]                              一意な識別子
│   │   │   ├─ name [M]                             担当の名
│   │   │   ├─ type [M] (Type)                      資材か作業か（0 資材・1 作業）。判別子ではない
│   │   │   ├─ isCostResource [M]                   コストの担当か
│   │   │   ├─ calendarUid [M]                      担当の暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   └─ assignments[] [M]                        割当
│   │       ├─ uid [M]                              一意な識別子
│   │       ├─ taskUid [M]                          就くタスク
│   │       ├─ resourceUid [M]                      就く担当
│   │       └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   └─ ［GRS だけが持つ群］
│       ├─ scheduleDataTimeZone                     データの日時の時差
│       │   └─ utcOffset                            UTC との差（"+09:00" の形。標準時の行だけ）
│       ├─ sourceFormat                             元の形式（grs・mspdi12・mspdi15）
│       ├─ importedTopTaskOutlineLevel              取り込んだファイルの、最上位のタスクの OutlineLevel
│       ├─ highestIssuedUid                         uid の数え手
│       ├─ mspdiImportCount                         MSPDI を取り込んだ回数
│       ├─ taskGroups[]                             タスクグループ
│       │   ├─ id                                   一意な UUID
│       │   ├─ name                                 タスクグループ名
│       │   ├─ style                                見た目（型 TaskGroupStyle）
│       │   │   └─ color                            帯の色 → LaneColor
│       │   ├─ minHeightPx                          帯の最も低い高さ
│       │   ├─ parentTaskGroupId                    親のタスクグループ（最上位では書かない）
│       │   ├─ siblingOrder                         兄弟の中の順
│       │   ├─ representativeTaskUid                この帯を代表する WBS のタスク
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   ├─ hyperlink                            リンクのタイトル
│       │   ├─ selfShowMode                         帯自身の表示の意図（shown・hidden・automatic・hiddenUntilZoomIn）。書かなければ automatic
│       │   └─ editableByGroupName                  編集してよい組の名
│       ├─ commentBoxes[]                           コメントボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ text                                 文
│       │   ├─ style                                見た目（型 CommentBoxStyle。ShapeStyle に font を足す）
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
│       │   │   ├─ snapPart                         吸着する図形の部分（planBar・actualBar・milestoneMark）（task）
│       │   │   ├─ highlightBoxId                   箱（highlightBox）
│       │   │   └─ snapPoint                        吸着する 8 点の 1 つ（topLeftCorner・topMiddle・topRightCorner・rightMiddle・bottomRightCorner・bottomMiddle・bottomLeftCorner・leftMiddle）（task・highlightBox）
│       │   ├─ bodyOffsetPx                         線先から箱へのずれ
│       │   │   ├─ dx                               横のずれ
│       │   │   └─ dy                               縦のずれ
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   └─ hyperlink                            リンクのタイトル
│       ├─ highlightBoxes[]                         ハイライトボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ style                                見た目（型 HighlightBoxStyle。ShapeStyle に cornerRadiusPx を足す）
│       │   │   ├─ cornerRadiusPx                   角の丸みの半径
│       │   │   ├─ fill                             塗り → Paint
│       │   │   └─ stroke                           枠 → Stroke
│       │   ├─ firstDay                             最初の日
│       │   ├─ lastDay                              最後の日
│       │   ├─ firstTaskGroupId                     覆う最初の帯（両端を含む）
│       │   └─ lastTaskGroupId                      覆う最後の帯（両端を含む）
│       ├─ baselineTasks[]                          前回予定
│       │   ├─ uid                                  今のタスクの uid
│       │   ├─ name                                 タスク名
│       │   ├─ start                                前回予定の開始
│       │   ├─ finish                               前回予定の終了
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
│   ├─ fileSavedAt                                  保存した時（UTC。初めて保存するまでは無い）
│   └─ lastEditedBy                                 最後に編集した者（型 Editor）
│       ├─ type                                     user・template・agent（template は、まだ誰も編集していない）
│       └─ name                                     AI が名乗った名（agent のときだけ。user・template では書かない）
└─ changeLogEntries[]                               変更履歴
    ├─ changedAt                                    変更の時（UTC）
    ├─ changedBy                                    変更した者
    │   ├─ editorType                               user・agent（GRS が自動で書く。判別子ではない）
    │   └─ name                                     人が打った名か、AI が名乗った名
    ├─ affectedArea                                 及んだ部分
    ├─ changeDescription                            何が変わったか
    ├─ reason                                       理由
    └─ remarks                                      そのほか

共通の型（→ で指す物）
├─ Color                                            色
│   ├─ type                                         theme・palette・custom
│   ├─ name                                         パレットの色の名（palette）。white・black・dimGray・lightGray・red・blue・yellow・green・orange・purple（どれも明るいテーマでの見え方の名）
│   ├─ light                                        明るいテーマの側（custom）
│   │   ├─ hexColor                                 色の値（#rrggbb）
│   │   └─ isCalculatedFromOppositeColor            GRS が反対の側の色から計算して作った側だけ true（人が選んだ側は書かない）
│   └─ dark                                         暗いテーマの側（custom。形は light）
├─ LaneColor                                        Color から black を除く
├─ TaskTableWindow                                  タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
│   ├─ isScheduleFilterApplied                      表でチェックしたタスクだけを描くか
│   ├─ checkedTaskUids[]                            チェックしたタスク
│   ├─ columnFilters[]                              列のフィルタ（掛けた列ごとに 1 つ）→ ColumnFilter
│   └─ columnSort                                   表の並べ方（列と向き）→ ColumnSort
├─ ResourceTableWindow                              担当の表の見せ方（担当リスト）
│   ├─ isScheduleFilterApplied                      表のチェックでチャートを絞るか
│   ├─ checkedResourceUids[]                        チェックした担当
│   ├─ isUnassignedChecked                          （担当なし）の行をチェックしたか
│   ├─ columnFilters[]                              列のフィルタ（掛けた列ごとに 1 つ）→ ColumnFilter
│   └─ columnSort                                   表の並べ方（列と向き）→ ColumnSort
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
└─ ShapeStyle                                       形の見た目（TaskStyle・CommentBoxStyle・HighlightBoxStyle が共にする）
    ├─ fill                                         塗り → Paint
    └─ stroke                                       線 → Stroke
```
