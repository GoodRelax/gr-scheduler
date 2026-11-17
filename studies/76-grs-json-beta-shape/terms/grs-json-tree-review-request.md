# 依頼: GRS JSON の構造と名を、初めて読む人の目でレビューしてください

**答え方: 答えはすべて、1 つのコードブロック（```text で始めて ``` で閉じる）の中に、9 節の型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと（一言で）

下の 7 節の JSON の木を、**この形式を初めて読む外の開発者や AI になったつもりで**読み、次の 2 つを厳しく評価してください。

- **名が、中身を一発で言い当てているか**（読んだだけで意味が分かるか、紛らわしくないか）。
- **データの分け方が自然か**（どこに何があるかを、迷わず当てられるか）。

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
3. 中身を、MSPDI と往復するかで 2 つの群に分ける。往復する群（`project`・`tasks` など）は MSPDI の形と名を持つ。GRS だけの群（帯・見た目・注記・前回予定など）は GRS の物を持つ。
4. 往復する群の実体に置くのは、その実体のことを言い、かつ MSPDI と往復する値だけ。GRS が意味を読まない MSPDI の値は、各実体の `passthrough` に、MSPDI の構造と要素の名のまま預かる。

## 5. 命名の決まり（要約）

| # | 決まり |
|:---|:---|
| N-1 | キーは camelCase、型の名は PascalCase |
| N-2 | 名は、指すものを言う。略さない |
| N-3 | MSPDI から来た値は、MSPDI の名を camelCase にして使う（`StartDate` → `startDate`） |
| N-4 | キーに持ち主の名を繰り返さない（`project.title`。`projectTitle` にしない） |
| N-5 | 別の実体を指す参照は「相手の名 ＋ `Uid` か `Id`」（`taskUid`・`taskGroupId`） |
| N-6 | 識別子は 2 つだけ: MSPDI から来た実体は `uid`（整数）、GRS 固有の実体は `id`（ランダムな UUID 版 4） |
| N-7 | 自分の欄の組を選ぶ判別子は `type`。形を変えない分類や、別の物の型は `xxxType`。`kind` は使わない |
| N-8 | 配列は複数形 |
| N-9 | 真偽の値は `is…` で始める |
| N-10 | 量は単位で終える（`…Px`・`…Percent`・`…Minutes`・`…WorkingDays` など） |
| N-11 | GRS が決める時刻は `…At` で終える |
| N-12 | 「無い」は、キーを書かないこと 1 つで言う。`null` は使わない |

例外: `passthrough` の中のキーは MSPDI の要素の名そのまま（PascalCase）。MSPDI の `Type` を写すキーは「MSPDI の親要素の名 ＋ `Type`」（`exceptionType` など。案の段階）。

## 6. 木の読み方

- 左の列がキー、右の列が短い意味です。`[]` は配列、`→` は木の下の「共通の型」を指します。
- `[M]` は MSPDI の要素を写すキーです。括弧の中は、MSPDI の名が違うときの MSPDI の名です。
- `◆` は、MSPDI と往復する実体の中にある、GRS だけの値です。
- 「（仮）」「（名は後の問い …）」は、まだ名を決めていない所です。

## 7. JSON の木（今の最善の案）

```text
ScheduleDocument                                    GRS JSON の 1 ファイル
├─ $schema                                          スキーマの所
├─ schemaVersion                                    スキーマの版
├─ buildVersion                                     書いたビルドの版
├─ documentSettings                                 文書設定
│   ├─ displayScalePercent                          表示の倍率（%）
│   ├─ fontSizeStep                                 文字の大きさの段
│   ├─ dayWidthPx                                   1 日の幅
│   ├─ verticalZoomRatio                            縦の大きさの比
│   ├─ taskGroupAutoExpandDepth                     自動で開く深さ
│   ├─ scrollPosition                               開いたときの位置
│   │   ├─ type                                     notDecided・decided
│   │   ├─ leftEdgeDay                              左の端の日
│   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か
│   │   ├─ topEdgeTaskGroupId                       上の端の帯
│   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か
│   ├─ fitSpan                                      全体表示の期間
│   │   ├─ firstDay                                 最初の日
│   │   ├─ lastDay                                  最後の日
│   │   └─ isFixed                                  期間を固定するか
│   ├─ viewTimeZone                                 見せるタイムゾーン
│   │   ├─ type                                     sameAsScheduleData・fixed
│   │   └─ utcOffsetMinutes                         UTC との差（分）
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ utcOffsetMinutes                         UTC との差（分）
│   │   └─ isDaylightSavingTime                     夏時間のゾーンか
│   ├─ is…Visible ×12                               見せるかの切り替え 12 個
│   ├─ taskStackDirection                           帯の中でタスクを積む向き（up・down）
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅（高さではない）
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ rootTreeState                                木の根の状態
│   ├─ pinnedTaskGroupIds                           ピン止めした帯の id の配列（見せ方なので文書設定に置く）
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ
│       ├─ delayDiagnosticsReportWindow             遅延診断レポート
│       ├─ resourceListWindow                       担当リスト
│       └─ （3 つの表は、どれも次の欄を持つ）
│           ├─ isTaskFilterApplied                  表でチェックしたタスクだけを描くか
│           ├─ shownTaskUids                        チェックしたタスク
│           ├─ shownResourceUids                    チェックした担当（担当リスト）
│           ├─ isUnassignedShown                    （担当なし）の行（担当リスト）
│           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
│           └─ columnSort                           並べ替えの列と向き → ColumnSort
├─ scheduleData                                     スケジュールデータ
│   ├─ ［MSPDI と往復する群］
│   │   ├─ project [M]                              プロジェクト（1 件）
│   │   │   ├─ uid [M]                              一意な番号
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
│   │   │   ├─ weekStartDay [M]                     週の始まりの曜日
│   │   │   ├─ defaultStartTime [M]                 既定の開始時刻
│   │   │   ├─ defaultFinishTime [M]                既定の終了時刻
│   │   │   ├─ calendarUid [M]                      稼働日を数える暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ tasks[] [M]                              タスク
│   │   │   ├─ uid [M]                              一意な番号
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
│   │   │   ├─ ◆fadeInCalendarDays                  始まりのフェード暦日
│   │   │   ├─ ◆fadeOutCalendarDays                 終わりのフェード暦日
│   │   │   ├─ ◆parentTaskUid                       WBS の親タスク
│   │   │   ├─ ◆siblingOrder                        兄弟の中の順
│   │   │   ├─ calendarUid [M]                      タスクの暦
│   │   │   ├─ hyperlinkAddress [M]                 リンク先の URL
│   │   │   ├─ hyperlink [M]                        リンクのタイトル
│   │   │   ├─ predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
│   │   │   │   ├─ predecessorUid [M]               先行タスク
│   │   │   │   ├─ predecessorLinkType [M] (Type)   依存の種類（FF・FS・SF・SS）（仮）
│   │   │   │   ├─ linkLag [M]                      ラグ
│   │   │   │   ├─ lagFormat [M]                    ラグの単位
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ calendars[] [M]                          暦
│   │   │   ├─ uid [M]                              一意な番号
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
│   │   │   │   ├─ exceptionType [M] (Type)         例外の繰り返し方（仮）
│   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯（形は上と同じ）
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   ├─ resources[] [M]                          担当
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             担当の名
│   │   │   ├─ resourceType [M] (Type)              資材か作業か（仮）
│   │   │   ├─ isCostResource [M]                   コストの担当か
│   │   │   ├─ calendarUid [M]                      担当の暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   │   └─ assignments[] [M]                        割当
│   │       ├─ uid [M]                              一意な番号
│   │       ├─ taskUid [M]                          就くタスク
│   │       ├─ resourceUid [M]                      就く担当
│   │       └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま）
│   └─ ［GRS だけが持つ群］
│       ├─ （名は次の問いで決める）                 文書全体の GRS の値（名は後の問い 6-13-4）
│       │   ├─ scheduleDataTimeZone                 データの日時の時差
│       │   ├─ sourceFormat                         元の形式
│       │   ├─ firstOutlineLevel                    最初の OutlineLevel
│       │   ├─ themeHueDegrees                      テーマの色相（度）
│       │   ├─ parentTaskProgressToleranceWorkingDays  遅延診断の許し幅
│       │   ├─ highestIssuedUid                     uid の数え手
│       │   └─ lastMspdiImportNumber                MSPDI の取り込み回数
│       ├─ taskGroups[]                             タスクグループ
│       │   ├─ id                                   一意な UUID
│       │   ├─ name                                 タスクグループ名
│       │   ├─ style                                見た目
│       │   │   └─ color                            帯の色 → LaneColor
│       │   ├─ minHeightPx                          帯の最も低い高さ
│       │   ├─ parentId                             親のタスクグループ
│       │   ├─ siblingOrder                         兄弟の中の順
│       │   ├─ derivedFromTaskUid （問 6-9-2）      表す WBS のタスク
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   ├─ hyperlink                            リンクのタイトル
│       │   ├─ treeState                            開閉の状態
│       │   └─ editGroup                            編集してよい組
│       ├─ taskGroupMembers[]                       どの帯に載るか
│       │   ├─ taskUid                              タスク
│       │   └─ taskGroupId                          載せるタスクグループ
│       ├─ taskStyles[]                             タスクの見た目
│       │   ├─ taskUid                              タスク
│       │   └─ style                                見た目
│       │       ├─ taskShape                        バーの形
│       │       ├─ milestoneShape                   マイルストーンの形
│       │       ├─ fill                             塗り → Paint
│       │       └─ stroke                           縁 → Stroke
│       ├─ commentBoxes[]                           コメントボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ text                                 文
│       │   ├─ style                                見た目
│       │   │   ├─ fill                             箱の塗り → Paint
│       │   │   ├─ stroke                           枠と引出し線 → Stroke
│       │   │   └─ font                             文字の見た目
│       │   │       ├─ color                        文字の色 → Color
│       │   │       └─ sizePx                       文字の大きさ
│       │   ├─ leaderTarget                         引出し線の先
│       │   │   ├─ type                             freePoint・task・highlightBox
│       │   │   ├─ dateTime                         時点（freePoint）
│       │   │   ├─ taskGroupId                      帯（freePoint）
│       │   │   ├─ laneTopOffsetPercent             帯の中の高さ（freePoint）
│       │   │   ├─ taskUid                          タスク（task）
│       │   │   ├─ graphicPart                      図形の部分（task）
│       │   │   ├─ highlightBoxId                   箱（highlightBox）
│       │   │   └─ point                            吸着する 8 点の 1 つ
│       │   ├─ bodyOffsetPx                         線先から箱へのずれ
│       │   │   ├─ dx                               横のずれ
│       │   │   └─ dy                               縦のずれ
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   └─ hyperlink                            リンクのタイトル
│       ├─ highlightBoxes[]                         ハイライトボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ style                                見た目
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
│       ├─ taskOrigins[]                            取り込み元の控え
│       │   ├─ taskUid                              タスク
│       │   ├─ sourceProjectId                      元のファイルの UID
│       │   ├─ sourceUid                            元のタスクの UID
│       │   ├─ importSessionId                      取り込みの id
│       │   └─ lastSeenMspdiImportNumber            最後に見た取り込み
│       ├─ passthroughTasks[]                       GRS がタスクにしない MSPDI の要素
│       │   ├─ precedingTaskUid                     前にある、いちばん近いタスクの uid
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       ├─ passthroughResources[]                   GRS が担当にしない MSPDI の要素
│       │   ├─ precedingResourceUid                 前にある、いちばん近い担当の uid
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       ├─ passthroughAssignments[]                 GRS が割当にしない MSPDI の要素
│       │   ├─ precedingAssignmentUid               前にある、いちばん近い割当の uid
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま）
│       └─ passthroughCalendars[]                   GRS が暦にしない MSPDI の要素
│           ├─ precedingCalendarUid                 前にある、いちばん近い暦の uid
│           └─ mspdiElement                         MSPDI の要素（構造と名のまま）
├─ documentStamp                                    文書刻印
│   ├─ scheduleDataUpdatedAt                        データが変わった時
│   ├─ documentUpdatedAt                            文書が変わった時
│   ├─ fileSavedAt                                  保存した時
│   └─ lastEditedBy                                 最後に書いた者
│       ├─ type                                     user・template・agent
│       └─ name                                     AI が付けた名
└─ changeLogEntries[]                               変更履歴
    ├─ changedAt                                    変更の時
    ├─ changedBy                                    変更した者
    ├─ affectedArea                                 及んだ部分
    ├─ changeDescription                            何が変わったか
    ├─ reason                                       理由
    └─ remarks                                      そのほか

共通の型（→ で指す物）
├─ Color （問 6-6-4-7）                             色
│   ├─ type                                         theme・palette・custom
│   ├─ name                                         パレットの色の名
│   ├─ light                                        明るいテーマの側
│   │   ├─ hexColor                                 色の値（#rrggbb）
│   │   └─ derivedFrom                              GRS が作った元の側
│   └─ dark                                         暗いテーマの側（形は light）
├─ LaneColor                                        Color から ink を除く
├─ ColumnFilter                                     列のフィルタ
│   ├─ type                                         values・dateRange
│   ├─ column                                       列
│   ├─ hiddenValues                                 隠す値
│   ├─ isBlankHidden                                空の行を隠すか
│   ├─ firstDay                                     最初の日
│   └─ lastDay                                      最後の日
├─ ColumnSort                                       並べ替え
│   ├─ column                                       列
│   └─ direction                                    向き
├─ Paint                                            塗り
│   ├─ color                                        色 → Color
│   └─ opacityPercent                               不透明度（%）
├─ Stroke                                           線
│   ├─ color                                        色 → Color
│   ├─ opacityPercent                               不透明度（%）
│   └─ widthPx                                      太さ
└─ ShapeStyle                                       形の見た目（タスク・コメントボックス・ハイライトボックスで共にする）
    ├─ fill                                         塗り → Paint
    └─ stroke                                       線 → Stroke
```

## 8. 聞きたいこと

1. **分け方:** 4 節の分け方（根の 4 つ、中身の 2 つの群、往復する実体に置く値の決まり）に、違和感や、もっと自然な分け方はありますか。
2. **名の問題の上位 10:** 意味が伝わらない、紛らわしい、決まりに外れる、と思うキーを、重い順に最大 10 個挙げ、直す名と理由を書いてください。
3. **決まりの穴:** 5 節の決まりそのものに、抜けや矛盾、足すべき決まりはありますか。
4. **MSPDI との往復:** 情報を失いそうな所や、往復で形が変わりそうな所はありますか。
5. **AI と外の道具:** AI のエージェントや外の道具がこの JSON を読み書きするとき、つまずきそうな所はどこですか。
6. **特に意見が欲しい 3 点:**
   - (a) MSPDI の `Type` を写す 3 つの名 `exceptionType`・`predecessorLinkType`・`resourceType`（キーが持ち主の名を繰り返すが、MSPDI の `Exception/Type` などとすぐ対応する）。
   - (b) 持ち越しの形: 各実体の `passthrough`（MSPDI の構造と名のまま）と、一覧ごとの `passthroughTasks[]` など（`precedingTaskUid` は、前にある、GRS が持つタスクのうち、いちばん近いものの uid）。
   - (c) Project から移した 7 つの GRS だけの値の入れ物の名（今は名が無い。候補: `grsProject`・`scheduleSettings`、または 2 つに分ける）。

## 9. 答えの型（この型のまま、1 つのコードブロックに書く）

```text
[1] 分け方
- 評価: （一言）
- 直す所: （箇条書き。無ければ「無し」）

[2] 名の問題（重い順）
| # | 今のキー（場所） | 問題 | 直す名 | 理由 |

[3] 決まりの穴
- （箇条書き）

[4] MSPDI との往復
- （箇条書き）

[5] AI と外の道具
- （箇条書き）

[6] 特に意見が欲しい 3 点
- (a) 推奨: … 理由: …
- (b) 推奨: … 理由: …
- (c) 推奨: … 理由: …

[7] 全体の点数（10 点満点）と、一番直すべき 1 点
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。**
