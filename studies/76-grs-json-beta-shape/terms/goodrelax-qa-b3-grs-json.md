BGQA3
# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

残 13（❓ で検索）

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

2026-11-15 の 2 回目: 1 回目のあなたの答えで 4 問が決まりました（`JDG-3569`・`JDG-3602`〜`JDG-3604`）。説明と例を求めた問いは、JSON の例をコードブロックに入れて書き直しました。新しく、パレットの paper と ink（問 6-6-4-12）、タイムゾーンの置き場（問 6-8-19）、キーの付け方の決まり（問 6-8-6）、画面の欄の名（問 6-13-2）、MSPDI の名と違う語（問 6-9-5・6-7-7）を足しました。

2026-11-15 の 3 回目: あなたの求めに合わせ、GRS JSON の構造図と分け方の考え（問 6-13-3）を、問いの先頭に置きました。ほかの問いは 2 回目のままです。

2026-11-15 の 4 回目: 問 6-13-3 に、15 か所の GRS だけの値を 1 つずつ照らした根拠の表を足し、問 6-8-19 をそこへまとめました。ほかの問いは 2 回目のままです。

🔄 *2026-11-15 の 5 回目: 問 6-13-3 が決まり（`JDG-3605`）、プロパティの名を併記した構造図に描き直しました。新しく、Project から移す 7 つの値の入れ物の名（問 6-13-4）を問います。*

***

## 決定事項

### [proj] プロジェクト

| 何 | 決め | 裁定 |
|:---|:---|:---|
| プロジェクトの 23 語（問 6-8-5） | 表のとおり確定（8-6 `uid`・8-8 `name`・8-9 `title`・8-10〜8-18・8-20〜8-25・8-31〜8-35）。8-19 `scheduleDataTimeZone` は名だけ確定し、置き場を問 6-8-19 で問う | `JDG-3569` |

### [root] スケジュールデータと文書の根

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 似た字と根の並び（問 6-13-1） | `note` → `remarks`、`levelZeroTreeState` → `rootTreeState`（階層は「深さ」で数える）。根の並びは `$schema`・`schemaVersion`・`buildVersion`・`documentSettings`・`scheduleData`・`documentStamp`・`changeLogEntries` | `JDG-3602` |
| 根の 3 つの部分の呼び名（問 6-11-1） | 「文書刻印」「文書設定」「変更履歴」 | `JDG-3603` |
| 🔄 *GRS JSON の構造と分け方（問 6-13-3）* | 🔄 *1 文書 1 JSON。根を形の版・見せ方・中身・帳簿に分け、中身を MSPDI と往復する群と GRS だけの群に分ける。往復する群の実体に置くのは、その実体のことを言い、かつ MSPDI と往復する値だけ。Project の GRS だけの値 7 つを GRS の群の 1 つの物へ移す（名は問 6-13-4）* | 🔄 *`JDG-3605`* |

### [key] 共通のキー

この分野で決まった語は、答えの後でここに書きます。

### [color] 色

この分野で決まった語は、答えの後でここに書きます。

### [task] タスクと依存

| 何 | 決め | 裁定 |
|:---|:---|:---|
| `dependencies`（問 6-9-8） | `predecessorLinks`、型は `PredecessorLink`。日程の考えの語「依存」は今のまま | `JDG-3604` |

### [tg] タスクグループ

この分野で決まった語は、答えの後でここに書きます。

***

## QA

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [root] スケジュールデータと文書の根（❓ 2）

#### 🔄 *✅ 問 6-13-3. GRS JSON の構造と、データの分け方 —— この考えでよいか*

🔄 *決まりました（`JDG-3605`）。あなたの答え「aで構造ツリーを更新しろ 各プロパティにはGRSのプロパティ名を併記しろ。」に従い、構造図を描き直しました。*

🔄 *構造図（β の形。プロパティの名を併記）:*

🔄 *印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値。GRS だけの群と根の部分のキーは印を持たない。`[]` は配列、`→` は下の共通の型を指す。*

```text
🔄 ScheduleDocument                                    GRS JSON の 1 ファイル
🔄 ├─ $schema                                          スキーマの所
🔄 ├─ schemaVersion                                    スキーマの版
🔄 ├─ buildVersion                                     書いたビルドの版
🔄 ├─ documentSettings                                 文書設定
🔄 │   ├─ displayScalePercent                          表示の倍率（%）
🔄 │   ├─ fontSizeStep                                 文字の大きさの段
🔄 │   ├─ dayWidthPx                                   1 日の幅
🔄 │   ├─ verticalZoomRatio                            縦の大きさの比
🔄 │   ├─ taskGroupAutoExpandDepth                     自動で開く深さ
🔄 │   ├─ scrollPosition                               開いたときの位置
🔄 │   │   ├─ type                                     notDecided・placed
🔄 │   │   ├─ leftEdgeDay                              左の端の日
🔄 │   │   ├─ leftEdgeDayFraction （名は未定）         日の中の位置
🔄 │   │   ├─ topEdgeTaskGroupId                       上の端の帯
🔄 │   │   └─ topEdgeTaskGroupFraction （名は未定）    帯の中の位置
🔄 │   ├─ fitSpan                                      全体表示の期間
🔄 │   │   ├─ firstDay                                 最初の日
🔄 │   │   ├─ lastDay                                  最後の日
🔄 │   │   └─ isFixed                                  期間を固定するか
🔄 │   ├─ viewTimeZone                                 見せるタイムゾーン
🔄 │   │   ├─ type                                     sameAsScheduleData・fixed
🔄 │   │   └─ offset                                   UTC オフセット
🔄 │   ├─ displayTimeZones[]                           追加の時計（4 つまで）
🔄 │   │   ├─ offset                                   UTC オフセット
🔄 │   │   └─ season                                   標準時か夏時間か
🔄 │   ├─ is…Visible ×12                               見せるかの切り替え 12 個
🔄 │   ├─ stackDirection                               積む向き
🔄 │   ├─ isThemeMonochrome                            モノクロか
🔄 │   ├─ taskGroupPanelWidthPx                        パネルの幅
🔄 │   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
🔄 │   ├─ rootTreeState                                木の根の状態
🔄 │   ├─ pinnedTaskGroupIds                           ピン止めした帯
🔄 │   └─ tableWindows                                 3 つの表の見せ方
🔄 │       ├─ searchWindow                             検索ウィンドウ
🔄 │       ├─ delayDiagnosticsReportWindow             遅延診断レポート
🔄 │       ├─ resourceListWindow                       担当リスト
🔄 │       └─ （3 つの表は、どれも次の欄を持つ）
🔄 │           ├─ isScheduleFilterApplied              フィルターを掛けるか
🔄 │           ├─ shownTaskUids                        チェックしたタスク
🔄 │           ├─ shownResourceUids                    チェックした担当（担当リスト）
🔄 │           ├─ isUnassignedShown                    （担当なし）の行（担当リスト）
🔄 │           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
🔄 │           └─ sort                                 並べ替え → ColumnSort
🔄 ├─ scheduleData                                     スケジュールデータ
   │   ├─ ［MSPDI と往復する群］
🔄 │   │   ├─ project [M]                              プロジェクト（1 件）
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             プロジェクト名
🔄 │   │   │   ├─ title [M]                            タイトル
🔄 │   │   │   ├─ subject [M]                          件名
🔄 │   │   │   ├─ category [M]                         分類
🔄 │   │   │   ├─ company [M]                          会社
🔄 │   │   │   ├─ manager [M]                          管理者
🔄 │   │   │   ├─ author [M]                           作成者
🔄 │   │   │   ├─ revision [M]                         保存した回数
🔄 │   │   │   ├─ creationDate [M]                     作った日時
🔄 │   │   │   ├─ startDate [M]                        開始の日時
🔄 │   │   │   ├─ statusDate [M]                       基準日
🔄 │   │   │   ├─ minutesPerDay [M]                    1 日の稼働の分
🔄 │   │   │   ├─ minutesPerWeek [M]                   1 週の稼働の分
🔄 │   │   │   ├─ daysPerMonth [M]                     1 か月の稼働日
🔄 │   │   │   ├─ weekStartDay [M]                     週の始まりの曜日
🔄 │   │   │   ├─ defaultStartTime [M]                 既定の開始時刻
🔄 │   │   │   ├─ defaultFinishTime [M]                既定の終了時刻
🔄 │   │   │   ├─ calendarUid [M]                      稼働日を数える暦
🔄 │   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
🔄 │   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
🔄 │   │   ├─ tasks[] [M]                              タスク
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             タスク名
🔄 │   │   │   ├─ notes [M]                            メモ
🔄 │   │   │   ├─ start [M]                            予定の開始
🔄 │   │   │   ├─ finish [M]                           予定の終了
🔄 │   │   │   ├─ milestone [M]                        マイルストーンか
🔄 │   │   │   ├─ deadline [M]                         期限
🔄 │   │   │   ├─ actualStart [M]                      実績の開始
🔄 │   │   │   ├─ stop [M]                             作業が止まった時
🔄 │   │   │   ├─ actualFinish [M]                     実績の終了
🔄 │   │   │   ├─ resume [M]                           再開の予定
🔄 │   │   │   ├─ resumeValid [M]                      再開日が有効か
🔄 │   │   │   ├─ percentComplete [M]                  完了率
🔄 │   │   │   ├─ ◆fadeInCalendarDays                  始まりのフェード暦日
🔄 │   │   │   ├─ ◆fadeOutCalendarDays                 終わりのフェード暦日
🔄 │   │   │   ├─ ◆parentTaskUid                       WBS の親タスク
🔄 │   │   │   ├─ ◆siblingOrder                        兄弟の中の順
🔄 │   │   │   ├─ calendarUid [M]                      タスクの暦
🔄 │   │   │   ├─ hyperlinkAddress [M]                 リンク先の URL
🔄 │   │   │   ├─ hyperlink [M]                        リンクのタイトル
🔄 │   │   │   ├─ predecessorLinks[] [M] (PredecessorLink)  先行への結び付き
🔄 │   │   │   │   ├─ predecessorUid [M]               先行タスク
🔄 │   │   │   │   ├─ linkType [M] (Type)              結び付きの型
🔄 │   │   │   │   ├─ linkLag [M]                      ラグ
🔄 │   │   │   │   ├─ lagFormat [M]                    ラグの単位
🔄 │   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
🔄 │   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
🔄 │   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
🔄 │   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
🔄 │   │   ├─ calendars[] [M]                          暦
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             暦の名
🔄 │   │   │   ├─ isBaseCalendar [M]                   基本の暦か
🔄 │   │   │   ├─ baseCalendarUid [M]                  受け継ぐ元の暦
🔄 │   │   │   ├─ ◆ordinal （問 6-7-6）                ファイルでの順
🔄 │   │   │   ├─ weekDays[] [M]                       曜日ごとの稼働
🔄 │   │   │   │   ├─ dayType [M]                      曜日（1 が日曜）
🔄 │   │   │   │   ├─ dayWorking [M]                   稼働日か
🔄 │   │   │   │   ├─ ◆ordinal （問 6-7-6）            ファイルでの順
🔄 │   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
🔄 │   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
🔄 │   │   │   │   │   ├─ toTime [M]                   終わりの時刻
🔄 │   │   │   │   │   └─ ◆ordinal （問 6-7-6）        ファイルでの順
🔄 │   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
🔄 │   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
🔄 │   │   │   ├─ exceptions[] [M]                     例外の日
🔄 │   │   │   │   ├─ name [M]                         例外の名
🔄 │   │   │   │   ├─ fromDate [M] (TimePeriod/FromDate)  最初の日
🔄 │   │   │   │   ├─ toDate [M] (TimePeriod/ToDate)   最後の日
🔄 │   │   │   │   ├─ dayWorking [M]                   稼働日か
🔄 │   │   │   │   ├─ recurrenceType [M] (Type)        繰り返しの型
🔄 │   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
🔄 │   │   │   │   ├─ ◆ordinal （問 6-7-6）            ファイルでの順
🔄 │   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯（形は上と同じ）
🔄 │   │   │   │   ├─ ◆passthroughValues               持ち越した MSPDI の値
🔄 │   │   │   │   └─ ◆passthroughElements             持ち越した MSPDI の要素
🔄 │   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
🔄 │   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
🔄 │   │   ├─ resources[] [M]                          担当
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             担当の名
🔄 │   │   │   ├─ resourceType [M] (Type)              担当の型
🔄 │   │   │   ├─ isCostResource [M]                   コストの担当か
🔄 │   │   │   ├─ calendarUid [M]                      担当の暦
🔄 │   │   │   ├─ ◆passthroughValues                   持ち越した MSPDI の値
🔄 │   │   │   └─ ◆passthroughElements                 持ち越した MSPDI の要素
🔄 │   │   └─ assignments[] [M]                        割当
🔄 │   │       ├─ uid [M]                              一意な番号
🔄 │   │       ├─ taskUid [M]                          就くタスク
🔄 │   │       ├─ resourceUid [M]                      就く担当
🔄 │   │       ├─ ◆passthroughValues                   持ち越した MSPDI の値
🔄 │   │       └─ ◆passthroughElements                 持ち越した MSPDI の要素
   │   └─ ［GRS だけが持つ群］
🔄 │       ├─ （名は次の問いで決める）                 文書全体の GRS の値
🔄 │       │   ├─ scheduleDataTimeZone                 データの日時の時差
🔄 │       │   ├─ sourceFormat                         元の形式
🔄 │       │   ├─ firstOutlineLevel                    最初の OutlineLevel
🔄 │       │   ├─ themeHueDegrees                      テーマの色相（度）
🔄 │       │   ├─ parentTaskProgressToleranceWorkingDays  遅延診断の許し幅
🔄 │       │   ├─ highestIssuedUid                     uid の数え手
🔄 │       │   └─ lastMspdiImportNumber                MSPDI の取り込み回数
🔄 │       ├─ taskGroups[]                             タスクグループ
🔄 │       │   ├─ id                                   一意な UUID
🔄 │       │   ├─ name                                 タスクグループ名
🔄 │       │   ├─ style （問 6-6-4-11）                見た目
🔄 │       │   │   └─ color （問 6-6-4-11）            帯の色 → LaneColor
🔄 │       │   ├─ minHeightPx                          帯の最も低い高さ
🔄 │       │   ├─ parentId                             親のタスクグループ
🔄 │       │   ├─ siblingOrder                         兄弟の中の順
🔄 │       │   ├─ derivedFromTaskUid （問 6-9-2）      表す WBS のタスク
🔄 │       │   ├─ hyperlinkAddress                     リンク先の URL
🔄 │       │   ├─ hyperlink                            リンクのタイトル
🔄 │       │   ├─ treeState                            開閉の状態
🔄 │       │   └─ editGroup                            編集してよい組
🔄 │       ├─ taskGroupMembers[]                       どの帯に載るか
🔄 │       │   ├─ taskUid                              タスク
🔄 │       │   └─ taskGroupId                          載せるタスクグループ
🔄 │       ├─ taskStyles[]                             タスクの見た目
🔄 │       │   ├─ taskUid                              タスク
🔄 │       │   └─ style （問 6-6-4-11）                見た目
🔄 │       │       ├─ taskShape                        バーの形
🔄 │       │       ├─ milestoneShape                   マイルストーンの形
🔄 │       │       ├─ fillColor （問 6-6-4-11）        塗りの色 → Color
🔄 │       │       ├─ strokeColor （問 6-6-4-11）      縁の色 → Color
🔄 │       │       └─ strokeWidthPx （問 6-6-4-10）    縁の太さ
🔄 │       ├─ commentBoxes[]                           コメントボックス
🔄 │       │   ├─ id                                   一意な UUID
🔄 │       │   ├─ text                                 文
🔄 │       │   ├─ style （問 6-6-4-11）                見た目
🔄 │       │   │   ├─ fillColor （問 6-6-4-11）        箱の塗りの色 → Color
🔄 │       │   │   ├─ opacityPercent                   不透明度（%）
🔄 │       │   │   ├─ strokeColor （問 6-6-4-11）      枠と線の色 → Color
🔄 │       │   │   ├─ strokeWidthPx （問 6-6-4-10）    枠と線の太さ
🔄 │       │   │   ├─ textColor                        文字の色 → Color
🔄 │       │   │   └─ fontSizePx                       文字の大きさ
🔄 │       │   ├─ leaderTarget                         引出し線の先
🔄 │       │   │   ├─ type                             freePoint・task・highlightBox
🔄 │       │   │   ├─ dateTime                         時点（freePoint）
🔄 │       │   │   ├─ taskGroupId                      帯（freePoint）
🔄 │       │   │   ├─ laneTopOffsetPercent             帯の中の高さ（freePoint）
🔄 │       │   │   ├─ taskUid                          タスク（task）
🔄 │       │   │   ├─ graphicPart                      図形の部分（task）
🔄 │       │   │   ├─ highlightBoxId                   箱（highlightBox）
🔄 │       │   │   └─ point                            吸着する 8 点の 1 つ
🔄 │       │   ├─ bodyOffsetPx                         線先から箱へのずれ
🔄 │       │   │   ├─ dx                               横のずれ
🔄 │       │   │   └─ dy                               縦のずれ
🔄 │       │   ├─ hyperlinkAddress                     リンク先の URL
🔄 │       │   └─ hyperlink                            リンクのタイトル
🔄 │       ├─ highlightBoxes[]                         ハイライトボックス
🔄 │       │   ├─ id                                   一意な UUID
🔄 │       │   ├─ style （問 6-6-4-11）                見た目
🔄 │       │   │   ├─ cornerRadiusPx                   角の丸みの半径
🔄 │       │   │   ├─ fillColor （問 6-6-4-11）        塗りの色 → Color
🔄 │       │   │   ├─ opacityPercent                   不透明度（%）
🔄 │       │   │   ├─ strokeColor （問 6-6-4-11）      枠の色 → Color
🔄 │       │   │   └─ strokeWidthPx （問 6-6-4-10）    枠の太さ
🔄 │       │   ├─ firstDay                             最初の日
🔄 │       │   ├─ lastDay                              最後の日
🔄 │       │   ├─ topTaskGroupId                       上の縁の帯
🔄 │       │   └─ bottomTaskGroupId                    下の縁の帯
🔄 │       ├─ baselineTasks[]                          前回予定
🔄 │       │   ├─ uid                                  今のタスクの uid
🔄 │       │   ├─ name                                 タスク名
🔄 │       │   ├─ start                                前の予定の開始
🔄 │       │   ├─ finish                               前の予定の終了
🔄 │       │   └─ milestone                            マイルストーンか
🔄 │       └─ taskOrigins[]                            取り込み元の控え
🔄 │           ├─ taskUid                              タスク
🔄 │           ├─ sourceProjectId                      元のファイルの UID
🔄 │           ├─ sourceUid                            元のタスクの UID
🔄 │           ├─ importSessionId                      取り込みの id
🔄 │           └─ lastSeenMspdiImportNumber            最後に見た取り込み
🔄 ├─ documentStamp                                    文書刻印
🔄 │   ├─ scheduleDataUpdatedAt                        データが変わった時
🔄 │   ├─ documentUpdatedAt                            文書が変わった時
🔄 │   ├─ fileSavedAt                                  保存した時
🔄 │   └─ lastEditedBy                                 最後に書いた者
🔄 │       ├─ type                                     user・template・agent
🔄 │       └─ name                                     AI が付けた名
🔄 └─ changeLogEntries[]                               変更履歴
🔄     ├─ changedAt                                    変更の時
🔄     ├─ changedBy                                    変更した者
🔄     ├─ affectedArea                                 及んだ部分
🔄     ├─ changeDescription                            何が変わったか
🔄     ├─ reason                                       理由
🔄     └─ remarks                                      そのほか

🔄 共通の型（→ で指す物）
🔄 ├─ Color （問 6-6-4-7）                             色
🔄 │   ├─ type                                         theme・palette・custom
🔄 │   ├─ name                                         パレットの色の名
🔄 │   ├─ light                                        明るいテーマの側
🔄 │   │   ├─ hexColor                                 色の値（#rrggbb）
🔄 │   │   └─ derivedFrom                              GRS が作った元の側
🔄 │   └─ dark                                         暗いテーマの側（形は light）
🔄 ├─ LaneColor                                        Color から ink を除く
🔄 ├─ ColumnFilter                                     列のフィルタ
🔄 │   ├─ type                                         values・dateRange
🔄 │   ├─ column                                       列
🔄 │   ├─ hiddenValues                                 隠す値
🔄 │   ├─ isBlankHidden                                空の行を隠すか
🔄 │   ├─ firstDay                                     最初の日
🔄 │   └─ lastDay                                      最後の日
🔄 ├─ ColumnSort                                       並べ替え
🔄 │   ├─ column                                       列
🔄 │   └─ direction                                    向き
🔄 └─ PassthroughElement                               持ち越した要素 1 つ
🔄     ├─ ordinal （問 6-7-6）                         ファイルでの順
🔄     ├─ name                                         MSPDI の要素の名
🔄     ├─ fields                                       文字だけの子の値
🔄     └─ children[]                                   入れ子の子要素
```

- 🔄 *新しい物（名は次の問いで決める）を、席は GRS だけの群の先頭に置いた。`JDG-3545` の並びはこの物を持たない。中の 7 つは、席が `JDG-3540` の順（中身 → 見た目 → 設定 → 帳簿）で並べた。*
- 🔄 *色は、今の平らな名（`fillColor`・`strokeColor`・`strokeWidthPx`）で描いた。問 6-6-4-10・11 の推奨を採ると、`fill { color, opacityPercent }`・`stroke { color, opacityPercent, widthPx }` に変わる。今のタスクの `style` は `opacityPercent` を持たない。*
- 🔄 *`JDG-3556` は「見た目」の範囲を決めていない。席は `fontSizePx`・`cornerRadiusPx` を `style` に入れ、`minHeightPx` を外に置いた。*
- 🔄 *席は `JDG-3540` を当て、`calendarUid`・`parentTaskUid`・`siblingOrder` などの参照を「置き場」として中身の後へ移した。`property-order.md` は、まだ `JDG-3322` の順を持つ。*
- 🔄 *`[M]` は、大文字と小文字だけの違い（`uid` と UID）を同じと見た。fade は MSPDI の ExtendedAttribute に書くが、GRS 特有の値なので、席は `◆` を付けた。*

#### 🔄 *❓ 問 6-13-4. Project から移す 7 つの値の入れ物 —— 名を何にするか*

🔄 *場面: 問 6-13-3 で、あなたは a を選びました（`JDG-3605`）。Project の中の GRS だけの値 7 つを、スケジュールデータの GRS だけの群の 1 つの物へ移します。その物の名を決めます。*

| 🔄 *#* | 🔄 *移す値* | 🔄 *何を言うか* |
|:---|:---|:---|
| 🔄 *1* | 🔄 *`scheduleDataTimeZone`* | 🔄 *スケジュールデータの日時の読み方* |
| 🔄 *2* | 🔄 *`themeHueDegrees`* | 🔄 *テーマの色相* |
| 🔄 *3* | 🔄 *`parentTaskProgressToleranceWorkingDays`* | 🔄 *遅延診断の許し幅* |
| 🔄 *4* | 🔄 *`highestIssuedUid`* | 🔄 *uid の数え手* |
| 🔄 *5* | 🔄 *`lastMspdiImportNumber`* | 🔄 *MSPDI を取り込んだ回数* |
| 🔄 *6* | 🔄 *`sourceFormat`* | 🔄 *文書の元の形式* |
| 🔄 *7* | 🔄 *`firstOutlineLevel`* | 🔄 *取り込んだファイルのタスクが始まる OutlineLevel* |

🔄 *7 つに共通するのは「この日程について、GRS だけが持つ、文書に 1 つの値」です。決まり（設定）と帳簿（数え手・回数・元の形式）が混ざります。*

🔄 *下のコードブロックの 1・2・3・4・5・6・7・8・9・10・11・12・13 行目が変わった。*
```json
"scheduleData": {
  "project": { "uid": "1", "name": "新製品の開発", "startDate": "2026-12-01" },
  "tasks": [],
  "grsProject": {
    "scheduleDataTimeZone": "+09:00",
    "themeHueDegrees": 214,
    "parentTaskProgressToleranceWorkingDays": 1,
    "highestIssuedUid": 42,
    "lastMspdiImportNumber": 0,
    "sourceFormat": "grs",
    "firstOutlineLevel": 1
  }
}
```

🔄 *（上の例は案 a の名で書きました。）*

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 🔄 *`grsProject`（GRS の側のプロジェクトの値）。MSPDI の `project` と対になり、名が「GRS だけが持つ、プロジェクト 1 つ分の値」を言う。あなたの求め「MSPDI 由来ならその旨が分かるようにしろ」の裏返しで、GRS 由来が名で分かる* |
| b | 🔄 *`scheduleSettings`（日程の設定）。決まりの 3 つ（1〜3）には合うが、帳簿の 4 つ（4〜7）は設定でない（`OMPV`）* |
| c | 🔄 *2 つに分ける: `scheduleRules`（1〜3）と `scheduleLedger`（4〜7）。中身の種類ごとに名が合う。物が 1 つ増える* |
| d | 🔄 *直す名を書く* |

🔄 *前回の答えの最後の文「MSPDIの領域にGRS特有のパラメータを入れる場合はその」は、途中で切れていました。私は「その旨を書け（印を付けろ）」と読み、構造図で ◆ の印を付けました。違えば ★ で書いてください。*

回答:

#### ✅ 問 6-13-1. 似た字の 2 組と根の並び —— 名を分けるか、並びを確かめるか

決まりました（`JDG-3602`）。答えは決定事項にあります。

#### ✅ 問 6-11-1. 根の 3 つの部分の呼び名 —— 「刻印」「設定」「変更ログ」の字をどうそろえるか

決まりました（`JDG-3603`）。答えは決定事項にあります。

#### ❓ 問 6-13-2. 画面の欄の名「段 0 の木の状態」 —— 「根」の語にそろえるか

場面: 問 6-13-1 の a で、`levelZeroTreeState` を `rootTreeState` に改め、タスクグループの階層を「深さ」で数えると決めました（`JDG-3602`）。辞書の日本語の名は、設定の欄の名（画面の語）を写します（`JDG-3518`）。画面の欄の名は、今も「段 0 の木の状態」（英語 Top-Level Tree State）です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 「木の根の状態」（英語 Root Tree State）にする。キー `rootTreeState` と同じ語になる。深さ 0 が木の根で、最上位のタスクグループの上にある |
| b | 「最上位の木の状態」（英語 Top-Level Tree State のまま）にする。「段 0」だけを外す |
| c | 今のまま |

回答:

### [proj] プロジェクト（❓ 1）

#### ✅ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

決まりました（`JDG-3569`）。答えは決定事項にあります。

#### ✅ 問 6-8-19. スケジュールデータのタイムゾーンの置き場 —— MSPDI に無い値を、MSPDI の実体の中に置くか、GRS の群へ移すか

問 6-13-3 にまとめました（15 か所の根拠の表と、移す範囲の案 a〜c）。

#### ❓ 問 6-8-6. キーに持ち主の名を繰り返さない決まり —— すべての物に当てるか

場面: 問 6-8-5 で、あなたは b を選び、8-19 だけに ★ を書きました。表の 23 語は確定しました（`JDG-3569`）。前回の案 a に入れた決まり「キーに持ち主の名を繰り返さない」は、まだ決まっていません。前々回、あなたは「Project.titleって形になるのか？ 他も同様。projectTitleにする必要はないよね？」と書きました。

```json
{ "project": { "title": "新製品の開発" } }
{ "project": { "projectTitle": "新製品の開発" } }
```

- 上が決まりに従う形、下が持ち主の名を繰り返す形です。
- 参照のキーは、指す相手の名を持ちます（`taskUid`・`resourceUid`）。
- 今の GRS JSON で決まりから外れて見えるのは `resourceType` だけです。`xxxType` の前の語は「何を分ける型か」を言い（`JDG-3564`）、担当の所でだけ持ち主の名と重なります。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | すべての物に当てる。キーは持ち主の名を繰り返さず、参照のキーだけが相手の名を持つ。`xxxType` の前の語は「何を分けるか」を言うので、`resourceType` はこの決まりの外とする |
| b | 当てない。物ごとに決める |

回答:

### [key] 共通のキー（❓ 2）

#### ❓ 問 6-7-6. `ordinal` —— 番号の役目を確かめ、配列の順と別に番号を持つか

あなたの問い: 「いまいちよくわからん。 codeブロックで解説してくれ。 それとordinalを使った理由は？ 順序が飛ぶケースや逆転するケースは？ 例: 1, 2, 4, 5 / 6, 8, 9, 7」

場面: `ordinal` は、MSPDI のファイルの中の位置を番号で持ちます。Calendar・WeekDay・Exception・WorkingTime・PassthroughElement の 5 つが持ちます。仕様（`erd.json`・表 T-033）と実装（`mspdi-codec.ts`・`edit-calendar.ts`）で、GRS が番号をどう使うかを確かめました。

**1. 番号の付け方**: GRS は MSPDI を開くとき、親の要素の中の位置を 0 から数えて入れます。

```xml
<Calendar>
  <UID>1</UID>
  <Name>標準</Name>
  <WeekDays>
    <WeekDay>
      <DayType>1</DayType>
      <DayWorking>0</DayWorking>
    </WeekDay>
    <WeekDay>
      <DayType>2</DayType>
      <DayWorking>1</DayWorking>
      <WorkingTimes>
        <WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime>
        <WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime>
      </WorkingTimes>
    </WeekDay>
  </WeekDays>
  <Exceptions>
    <Exception>
      <TimePeriod><FromDate>2026-12-29T00:00:00</FromDate><ToDate>2027-01-03T23:59:00</ToDate></TimePeriod>
      <Name>年末年始</Name>
      <Type>1</Type>
      <DayWorking>0</DayWorking>
    </Exception>
  </Exceptions>
</Calendar>
```

GRS はこれを次の GRS JSON にします。

```json
{
  "uid": 1,
  "ordinal": 0,
  "name": "標準",
  "weekDays": [
    { "ordinal": 0, "dayType": 1, "dayWorking": false },
    { "ordinal": 1, "dayType": 2, "dayWorking": true,
      "workingTimes": [
        { "ordinal": 0, "fromTime": "08:00:00", "toTime": "12:00:00" },
        { "ordinal": 1, "fromTime": "13:00:00", "toTime": "17:00:00" }
      ] }
  ],
  "exceptions": [
    { "ordinal": 0, "name": "年末年始", "fromDate": "2026-12-29T00:00:00", "toDate": "2027-01-03T23:59:00", "dayWorking": false, "recurrenceType": 1 }
  ]
}
```

ファイルから読んだ直後は、番号と配列の順がそろいます。今の形は、1 つの順を番号と配列の 2 か所に書きます。

**2. `ordinal` を使った理由**: 仕様のデータモデル（ERD）が、行の鍵として番号を足しました。MSPDI は WeekDay・Exception・WorkingTime に UID を与えません。そこで ERD は「親 ＋ `ordinal`」をこれらの鍵にしました（表 T-056 の `ET-7`・`ET-8`・`ET-19`）。今、番号は 5 つの役目を持ちます。

| 役目 | 持ち主 | 仕様の所 |
|:---|:---|:---|
| 書き出しで元の並びに戻す | Calendar・WeekDay・Exception・WorkingTime | `AT-67`・`AT-72`・`AT-77`・`AT-160` |
| 持ち越した要素を、ほかの兄弟とのあいだの元の位置へ戻す | PassthroughElement | `AT-123` |
| 例外日の編集の前と後の行を突き合わせる。日が同じ列は元の字を保つ。元に無い番号の行を、足した行と見なす | Exception | `CM-39`（`setCalendar`）・`WT-10` |
| `project.calendarUid` がどの暦も指さないとき、基準暦のうち番号が最小の暦を使う | Calendar | `FR-054` の段 |
| 行を足すとき、同じ親の中の最大の次の番号を付ける | 5 つすべて | `AT-67`・`AT-72` |

**3. 番号が飛ぶ所**: ファイルから読むと、番号は自然に飛びます。GRS は番号を、解釈しない兄弟も含めて数えるからです。例えば、UID の無い Calendar を、GRS は暦にせず PassthroughElement として持ちます。

```xml
<Calendars>
  <Calendar><UID>1</UID><Name>標準</Name></Calendar>
  <Calendar><UID>2</UID><Name>夜間</Name></Calendar>
  <Calendar><Name>古い暦</Name></Calendar>
  <Calendar><UID>3</UID><Name>24時間</Name></Calendar>
</Calendars>
```

```json
"project": {
  "passthroughElements": [
    { "ordinal": 2, "name": "Calendar", "fields": { "Name": "古い暦" }, "children": [] }
  ]
},
"calendars": [
  { "uid": 1, "ordinal": 0, "name": "標準" },
  { "uid": 2, "ordinal": 1, "name": "夜間" },
  { "uid": 3, "ordinal": 3, "name": "24時間" }
]
```

書き出すとき、GRS は暦を配列の順に並べ、持ち越した Calendar を位置 2 へ差し込みます。こうして元の 4 つの並びが戻ります。番号 2 の空きは、別の配列にいる兄弟の位置を示します。この差し込みに使う番号は PassthroughElement の番号だけで、暦の番号は使いません。

**4. あなたの例 1, 2, 4, 5（人や AI が書いた GRS JSON）**:

```json
"exceptions": [
  { "ordinal": 1, "name": "元日" },
  { "ordinal": 2, "name": "成人の日" },
  { "ordinal": 4, "name": "建国記念の日" },
  { "ordinal": 5, "name": "天皇誕生日" }
]
```

- GRS はこの文書を開きます。スキーマは番号に整数だけを求め、空きを調べません。
- GRS は MSPDI へ 4 つの Exception を配列の順に書きます。MSPDI は番号を持たないので、番号は書き出しで消えます。
- 人が画面で例外日を足すと、GRS は新しい行に 6 を付けます。
- 空きは何も起こしません。

**5. あなたの例 6, 8, 9, 7（番号と配列の順が食い違う）**:

```json
"workingTimes": [
  { "ordinal": 6, "fromTime": "08:00:00", "toTime": "10:00:00" },
  { "ordinal": 8, "fromTime": "13:00:00", "toTime": "15:00:00" },
  { "ordinal": 9, "fromTime": "15:00:00", "toTime": "17:00:00" },
  { "ordinal": 7, "fromTime": "10:00:00", "toTime": "12:00:00" }
]
```

- WorkingTime: GRS は番号の順に並べ直して書きます。MSPDI には 08-10・10-12・13-15・15-17 の順で出ます。
- 同じ番号を Exception・WeekDay・Calendar に書くと、GRS は配列の順（6・8・9・7）のまま書きます。
- 1 つの形を、GRS は持ち主ごとに 2 通りに読みます。順を 2 か所に書くと、こうした食い違いが生まれます（`SSOT`）。
- 実装は Calendar も配列の順に書き、`AT-67` の文「書き出しで元の並びに戻す」とずれます。

**6. 案を見直した点**: 前の案 a は、4 つから番号を外し、PassthroughElement だけに残しました。けれども、Exception の番号は `setCalendar` の突き合わせの鍵も兼ねます。配列の位置で突き合わせると、途中の行を消したとき後ろの行の位置がずれます。すると GRS は別の元の行と比べ、足した行も見分けられません。そこで推奨を改めました。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 順は配列だけが言う（`SSOT`）。Calendar・WeekDay・WorkingTime から `ordinal` を外す。番号は、配列にできない役目を持つ 2 つだけに残す: Exception（UID の無い MSPDI の行を見分け、`setCalendar` が編集の前と後の行を突き合わせる鍵）と PassthroughElement（別の配列にいる兄弟とのあいだの、書き戻す位置）。2 つの意味の文は「順」をやめ、「行を見分ける番号」「書き戻す位置」と書く。既定の暦は配列の先頭の基準暦にし、WorkingTime は配列の順に書く（GRS が書く時間帯は始まりの順に並べる） |
| b | 前の案 a。4 つから外し、PassthroughElement だけに残す。Exception の突き合わせは配列の位置で行う。途中の行を消すと、GRS は別の元の行と比べ、足した行を見分けられない |
| c | 5 つとも `ordinal` を持つ（今のまま）。番号と配列が食い違えば、GRS は持ち主ごとに違う順で書く |
| d | 5 つとも持ち、名を `mspdiOrder` に改める（`NEIM`）。食い違いは c と同じ |

回答:

#### ❓ 問 6-7-7. `recurrencePeriod` —— MSPDI の名 Period と違う名を保つか

場面: このキーは、MSPDI の Exception/Period（例外の繰り返しの間隔）を写します。MSPDI の名は Period です。同じ Exception の Type は、`JDG-3548` で `recurrenceType` に決まりました。あなたは問 6-9-5 で、MSPDI の名と違う語を裁定に回すよう指示しました。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 7-39 | `recurrencePeriod` |  | MSPDI の Exception/Period と同じ。 | Period |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `recurrencePeriod` を保つ。名は「例外の繰り返しの間隔」を言い、兄弟の `recurrenceType`（`JDG-3548`）と頭がそろう。意味の欄に、MSPDI の名と違う理由を 1 文で書く（`JDG-3548` と同じ書き方） |
| b | `period` にする。MSPDI の名を写す決まり（`JDG-3563`）にそのまま合う。兄弟の `recurrenceType` とは頭がそろわない |

回答:

### [color] 色（❓ 5）

#### ❓ 問 6-6-4-7. 色の要素の一覧 —— 抜けと誤りは無いか

`JDG-3563`・`JDG-3564` で、判別子のキーは `type` に決まりました。下の表と形と例は `type` で書きます。`JDG-3556` の A で、見た目はどの物でも入れ子の `style` に入ります。タスクの見た目は `scheduleData.taskStyles[]` の `{ taskUid, style }` に入ります。不透明度 `opacityPercent` は色の値の外に置きます（`JDG-3526`・`JDG-3556` の E）。カスタムの色の片側は、GRS が作った側だけが `derivedFrom` を持ちます（`JDG-3527`）。

GRS の色の要素を、仕様書と β の形から 12 に数えました（数え方: `doc-shape-map.tsv` で `Color`・`LaneColor` を取るプロパティと、テーマ・色相・モノクロのプロパティ。仕様書の表 T-017b の `CV-1`〜`CV-10`、表 T-294、`FR-039`、`FR-007`。文書の外の色は `_assets/tbl-settings.md` の `S-` の行のうち、`#rrggbb` か `rgba(` の値を持つ行）。

| #   | 要素           | 中身                                                                                                                              | 文書に保存するか                                 | 決めた所                               |
| :-- | :----------- | :------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------- | :--------------------------------- |
| 1   | 明暗（表示のテーマ）   | light と dark。GRS は、起動したときにブラウザーが伝える明暗で描き、読めないときは light で描く。画面の切り替えは、そのページを閉じるまで効く                                               | しない（読む人ごとに違う）                            | `FR-039`                           |
| 2   | モノクロ         | 決まった色を無彩色にして描く                                                                                                                  | する（`documentSettings.isThemeMonochrome`） | `CV-7`                             |
| 3   | テーマの色相       | テーマの色を、この色相で描く。新しい文書は 214                                                                                                       | する（`project.themeHueDegrees`）            | `doc-shape-map.tsv`（問 6-8-1 で名を問う） |
| 4 | 色の 3 つの源 | theme（テーマが、その置き場に決める色）・palette（名の付いた 10 色）・custom（人が決めた色） | する（`Color.type`） | `JDG-3260`・`JDG-3310`・`JDG-3563` |
| 5 | パレットの 10 色 | paper・ink・dimGray・lightGray・red・blue・yellow・green・orange・purple（paper と ink の名は問 6-6-4-12 で問う）。1 つの名が、明暗ごとに 4 つの値を持つ: 塗り・縁・実績の塗り・タスクグループの帯（10 × 4 × 2 = 80 の値） | 名だけ保存する。値はアプリが持つ（表 T-294） | `CV-1`・`CV-6` |
| 6 | カスタムの色 | 明るい側と暗い側。各側は `hexColor` を持ち、GRS が作った側だけが `derivedFrom`（light・dark）を持つ。片側を省くと、GRS は文書を開くときに、もう一方の側から作る（色相を保って明度を反転する） | する | `CV-2`〜`CV-4`・`JDG-3523`・`JDG-3527` |
| 7   | 置き場ごとに導く値    | 1 つの色から、置き場に応じて描く値を導く。予定バーの塗りは塗りの値、実績バーの塗りは実績の塗りの値（カスタムの色は、選んだ値から HSL で導く）、縁は縁の値                                                | しない（描くときに導く）                             | `CV-6`・`CV-10`                     |
| 8 | 色を塗る 8 つの置き場 | タスクグループの帯（`LaneColor`。ink を取らない）・タスクの塗りと縁・コメントボックスの塗りと枠（引出し線を含む）と文字・ハイライトボックスの塗りと枠 | する（各物の `style` の中） | `doc-shape-map.tsv`・`JDG-3556` |
| 9 | 透明 | 塗りと線の不透明度（`opacityPercent`。100 が透けない。0 なら描かない）と、色を省く道（タスクの塗りと縁、ハイライトボックスの枠） | する | `JDG-3310`・`JDG-3526` |
| 10 | 透明の制約 | 1 つのタスクの描き方と 1 つのハイライトボックスで、塗りと線の両方を透明にはできない（画面の通知「塗りと線の両方を透明にはできません」） | しない（GRS が入力を断る） | `FR-007`・`FR-019`・`IV-9` |
| 11  | コントラストの条件    | パレットの値は、白を除き、地に対して決まったコントラスト比を満たす                                                                                               | しない（アプリの値の条件）                            | `CV-8`                             |
| 12  | 文書の外の色       | 非稼働日の塗り・基準日線・マーカーなど、アプリが決める描画と画面の色。色の値を持つ設定の行が 42 行                                                                             | しない                                      | `_assets/tbl-settings.md`          |

要素 10 の ★「念確。 予定も実績も非表示にしてタスク名と進捗マークだけの表示もあるよね？ それと透明は無関係だろ？」に答えます。はい、その表示はあります。そして 2 つは別の決まりです。

- 表示の切り替え: 文書の設定 `isPlanBarVisible`・`isActualBarVisible`（仕様書の `S-227`・`S-228`）が、すべてのタスクの予定バーと実績バーをまとめて隠します。`FR-049` は 2 つを独立の真偽とし、両方を隠す形も認めます。タスク名のラベルと進捗マーク（`isProgressMarkVisible`、`S-63`）は残ります。隠したバーは場所を保ち、当たり判定から外れます。ボタンを押せば、バーは戻ります。
- 透明の制約: `FR-007` は、1 つのタスクで塗りと縁を同時に透明にする入力を断ります。`FR-019` は、ハイライトボックスの塗りと枠に同じ制約を掛けます。仕様書の理由は `FR-019` の 1 文「箱が見えなくなる」です。`FR-007` の RATIONALE は、色弱と線の太さの理由だけを述べます。
- 違い: 表示の切り替えは文書全体の見せ方で、いつでも戻せます。透明は 1 つの物の色で、`style` に残ります。`FR-049` は、隠したバーの見た目を「透明に描いたときと同じ」と書きます。けれども、両方を透明にしたタスクは、どの表示の切り替えでも見えません。だから GRS は、透明の側だけを断ります。

形の ★「paper, inkは色名じゃないよね？ OKPN違反だろ？ 何したいの？」に答えます。paper と ink は、仕様書の白（`white`、`S-314`）と黒（`black`、`S-315`）です。`JDG-3275`（所見 F05）が名を改めました。暗いテーマで、GRS は白を地と同じ暗い色（`#14161a`）で、黒を白（`#ffffff`）で描きます（`CV-6`）。所見は、名 `white` が暗いテーマで見え方と食い違う、と見ました。そこで所見は、明暗によらない役の名を選びました: paper は地の色、ink はラベルの字の色（`S-168`）です。1 つの列に色の名と役の名が並ぶので、あなたの指摘は当たります。直し方は、次の問 6-6-4-12 で問います。

別の AI の案と、上の一覧を比べました。

| 別の AI の案 | GRS の今の形と決まり | 07 の観点 |
|:---|:---|:---|
| テーマの色の役割（task・milestone・criticalTask・summaryTask・comment・highlight）を、値に書く | 置き場が役割を決める。値には `{"type": "theme"}` だけを書く | `OMPV`: 値に書いた役割と置き場が食い違える。criticalTask は GRS の範囲の外（`JDG-3510`）→ 問 6-6-4-8 |
| カスタムの色は、1 つの #hex | 明るい側と暗い側の 2 つ（要素 6） | 暗いテーマでも同じ値で描き、コントラストの条件（要素 11）を割りうる |
| パレットが無い | 名の付いた 10 色（要素 5） | 名でテーマに追う道が消える |
| `opacityPercent`（100 が不透明。既定 100） | 前は `fillTransparencyPercent`（0 が不透明） | `JDG-3526` で `opacityPercent` に決まった（W3C と同じ向き） |
| `Stroke { paint, widthPx }` | `strokeColor` と `strokeWidthPx` を平らに持つ | → 問 6-6-4-10 |
| `ShapeStyle` を 3 つの型で共にする | 型ごとに、必ず持つ欄が違う（コメントボックスは塗り・枠・文字を必ず持つ。タスクは塗りも縁も省ける） | → 問 6-6-4-11 |
| テーマの色の値（#3B82F6 など）を文書に書く | テーマとパレットの値は、アプリの設定だけが持つ。文書は名だけを持つ | `SSOT`: 文書がアプリの値を写すと、2 か所が食い違う |
| 書いていない要素 | モノクロ・色相・タスクグループの帯・文字の色・実績の塗りの導き方・明暗の片側の導き方・透明の制約（要素 2・3・6〜8・10） | 網羅の抜け |

問 6-6-4-8・6-6-4-10・6-6-4-11 の推奨と `JDG-3526`・`JDG-3527`・`JDG-3556` をすべて採ると、色の形は次のとおりです（β の案）。型の名 `TaskStyle` などは仮の名です。

```json
{
  "$defs": {
    "Color": {
      "oneOf": [
        { "properties": { "type": { "const": "theme" } } },
        { "properties": {
            "type": { "const": "palette" },
            "name": { "enum": ["paper", "ink", "dimGray", "lightGray", "red", "blue", "yellow", "green", "orange", "purple"] } } },
        { "properties": {
            "type":  { "const": "custom" },
            "light": { "$ref": "#/$defs/ColorSide" },
            "dark":  { "$ref": "#/$defs/ColorSide" } } }
      ]
    },
    "ColorSide": {
      "required": ["hexColor"],
      "properties": {
        "hexColor":    { "type": "string", "pattern": "^#[0-9a-f]{6}$" },
        "derivedFrom": { "enum": ["light", "dark"] }
      }
    },
    "LaneColor": { "description": "The same as Color, except that LaneColor offers no palette color ink." },
    "Paint": {
      "required": ["color"],
      "properties": {
        "color": { "$ref": "#/$defs/Color" },
        "opacityPercent": { "type": "integer", "minimum": 0, "maximum": 100, "default": 100 }
      }
    },
    "Stroke": {
      "required": ["color", "widthPx"],
      "properties": {
        "color": { "$ref": "#/$defs/Color" },
        "opacityPercent": { "type": "integer", "minimum": 0, "maximum": 100, "default": 100 },
        "widthPx": { "type": "integer", "minimum": 1, "maximum": 10 }
      }
    },
    "TaskStyleEntry": {
      "required": ["taskUid", "style"],
      "properties": { "taskUid": { "type": "integer" }, "style": { "$ref": "#/$defs/TaskStyle" } }
    },
    "TaskStyle": {
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } }
    },
    "CommentBoxStyle": {
      "required": ["fill", "stroke", "textColor"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" }, "textColor": { "$ref": "#/$defs/Color" } }
    },
    "HighlightBoxStyle": {
      "required": ["fill"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } }
    },
    "TaskGroupStyle": { "properties": { "color": { "$ref": "#/$defs/LaneColor" } } }
  }
}
```

置き場: `scheduleData.taskStyles[]` の各 `style` が `TaskStyle` を、`CommentBox.style` が `CommentBoxStyle` を、`HighlightBox.style` が `HighlightBoxStyle` を、`TaskGroup.style` が `TaskGroupStyle` を取ります。`TaskStyle` は形のキー（`taskShape`・`milestoneShape`）も持ちます。上の形では、色に関わるキーだけを書きました。

実例（同じ形で書いた 3 つ）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } }
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill": {
        "color": { "type": "custom",
                   "light": { "hexColor": "#c0504d" },
                   "dark":  { "hexColor": "#b2423f", "derivedFrom": "light" } },
        "opacityPercent": 50 },
      "stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
    } }
],
"commentBoxes": [
  { "id": "3f2b8c1e-7a4d-4e9b-9c61-2d5a8e0f4b17",
    "text": "Confirm the date",
    "style": {
      "fill":   { "color": { "type": "theme" }, "opacityPercent": 0 },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 },
      "textColor": { "type": "palette", "name": "ink" }
    } }
]
```

- 上から、タスク 7 のバー（赤で塗り、縁を描かない）・タスク 8 のバー（自前の赤を不透明度 50% で塗り、紫の縁を不透明度 70% で描く。暗い側は GRS が明るい側から作った）・コメントボックス（塗りを見せず、テーマの色の枠と、ink の文字）です。
- 文書の外のもの（要素 1・7・11・12）と、透明の制約（要素 10）は、スキーマに書きません。GRS が描くときと入力を受けるときに守ります。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

回答:

#### ❓ 問 6-6-4-12. パレットの paper と ink —— 白と黒を、見え方の名で呼ぶか、役の名で呼ぶか

場面: パレットの 10 の名のうち、paper と ink の 2 つは役の名です。`JDG-3275`（所見 F05）が、仕様書の `white`・`black` をこの名に改めました。理由は「暗いテーマで、名 `white` が見え方と食い違う」でした。画面の語は今も「白」「黒」です。

表 T-294 の塗りの値を、明暗で並べました。

| 名 | 画面の語 | 明るいテーマの塗り | 暗いテーマの塗り |
|:---|:---|:---|:---|
| `paper` | 白 | `#ffffff` | `#14161a`（地と同じ） |
| `ink` | 黒 | `#000000` | `#ffffff` |
| `dimGray` | 濃い灰色 | `#575757` | `#a3a3a3` |
| `lightGray` | 薄い灰色 | `#cccccc` | `#424242` |
| `red` | 赤 | `#e3b9b5` | `#58312d` |

暗いテーマで、GRS はどの名も、色相を保って明度を反転します（`CV-6`）。カスタムの色の片側も、同じ決まりで作ります（`JDG-3523`）。だから、暗いテーマで名と見え方が食い違う形は、灰色の 2 つにも起きます。暗いテーマでは、濃い灰色が薄い灰色より明るくなります。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `white`・`black` に戻す。10 の名はすべて「明るいテーマでの見え方」を言う、と決め、`name` の意味にそう書く。暗いテーマでは GRS がどの名も明度を反転して描く（`CV-6`）。1 つの欄の名が 1 つの物差しを持つ（`OKPN`・`OMPV`）。画面の語「白」「黒」とも合う（`NEIM`）。`LaneColor` は black を取らない、と書く。`JDG-3275` の F05 を一部覆す |
| b | `paper`・`ink` を保ち、意味に「地の色」「ラベルの字の色」と書く。暗いテーマでも、名と役が合う。1 つの列に、見え方の名 8 つと役の名 2 つが並ぶ。灰色 2 つの食い違いは残る |
| c | 役の名を、たとえの語から部品の語に改める（`background`・`text`）。名が役を直に言う。b と同じく、1 つの列に 2 種の名が並ぶ |

回答:

#### ❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

場面: `{"type": "theme"}` の色は、テーマが置き場ごとに決める色です（要素 4）。例えば、テーマはタスクの塗りに予定バーの塗りの色（`S-155`）を、ハイライトボックスの枠に注記の色（`S-312`、橙）を決めます。別の AI の案は、どの役の色かを値に書きます。問いは、この「役」を GRS が置き場から読むか、ファイルの値に書くかです。

前回、あなたは「質問の意味がわからない。 具体例を求む。」と答えました。下の例は、どれもタスク 7 のバーとハイライトボックス 1 つを、テーマの色で描きます。

案 a（置き場が役を決める）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "theme" } },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": {
      "fill":   { "color": { "type": "theme" }, "opacityPercent": 30 },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 }
    } }
]
```

GRS は置き場を見ます。タスクの塗りは予定バーの塗りの色で、ハイライトボックスの枠は注記の色で描きます。ファイルは同じ `{"type": "theme"}` を書きます。

案 b（値に役を書く）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "theme", "role": "planBar" } },
      "stroke": { "color": { "type": "theme", "role": "annotation" }, "widthPx": 1 }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": {
      "fill":   { "color": { "type": "theme", "role": "planBar" }, "opacityPercent": 30 },
      "stroke": { "color": { "type": "theme", "role": "annotation" }, "widthPx": 1 }
    } }
]
```

GRS は値の `role` を見ます。この例では、タスク 7 の縁を注記の橙で描きます。b は、置き場と別の役の色を選ぶ道を開きます。役の名 `planBar`・`annotation` は仮の名です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 置き場が役を決める（今の形）。値には `{"type": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。ファイルは、置き場と役の食い違いを書けない |
| b | 値に役を書く（`{"type": "theme", "role": "annotation"}`）。どの置き場でも、ほかの役のテーマの色を使える。役の名の一覧を、外との約束として持つ |

回答:

#### ❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ち、太さを必ず書きます。線を描かないタスクにも、太さが残ります。問いは、太さを線の型の中に入れるかです。

前回、あなたは「jsonの具体例をコードブロックに出せ。」と答えました。下の例は、どれも 2 本のバーを描きます: タスク 7（赤で塗り、縁を描かない）と、タスク 8（赤で塗り、紫の縁を太さ 2 と不透明度 70% で描く）。

案 a（線の型が色・不透明度・太さを持つ）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } }
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
    } }
]
```

案 b（塗りも線も同じ型を取り、太さを外に置く）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } },
      "strokeWidthPx": 1
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70 },
      "strokeWidthPx": 2
    } }
]
```

案 c（線の中に塗りの型を入れ子にする）:

```json
"taskStyles": [
  { "taskUid": 7,
    "style": {
      "taskShape": "rectangle",
      "fill": { "color": { "type": "palette", "name": "red" } }
    } },
  { "taskUid": 8,
    "style": {
      "taskShape": "rectangle",
      "fill":   { "color": { "type": "palette", "name": "red" } },
      "stroke": { "paint": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70 }, "widthPx": 2 }
    } }
]
```

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 線の型 `Stroke { color, opacityPercent, widthPx }` を作る（2 段）。線を描かないタスクは `stroke` ごと省き、太さも書かずに済む（`NullTrap`・`OMPV`: 描かない線の太さという、意味を持たない値が消える）。塗りは `Paint { color, opacityPercent }`。W3C のデザイントークンの border 型も、色と太さを 1 つの型に入れる（`{ color, width, style }`） |
| b | 塗りも線も `Paint` を取り、太さは外の `strokeWidthPx` に置く（今の置き方。SVG の `stroke-width` と同じ）。線を描かないタスク 7 も、太さ 1 を書く |
| c | `Stroke { paint, widthPx }`。色は `stroke.paint.color` と 3 段になる |

回答:

#### ❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか

場面: タスク・コメントボックス・ハイライトボックスの `style` が、塗りと線を持ちます。必ず持つ欄は物ごとに違います: コメントボックスは塗り・枠・文字を必ず持ち、ハイライトボックスは塗りを必ず持ち、タスクは塗りも縁も省けます。案 a と案 b で、ファイルの中身は同じです。違いは、スキーマ（形の決まり）の書き方だけです。

前回、あなたは「jsonの具体例をコードブロックに出せ」と答えました。まず、どちらの案でも同じファイルの中身です（ほかのキーは省きました）。

```json
"taskStyles": [
  { "taskUid": 7,
    "style": { "taskShape": "rectangle", "fill": { "color": { "type": "theme" } } } }
],
"commentBoxes": [
  { "id": "3f2b8c1e-7a4d-4e9b-9c61-2d5a8e0f4b17",
    "text": "Confirm the date",
    "style": {
      "fill":   { "color": { "type": "palette", "name": "yellow" } },
      "stroke": { "color": { "type": "theme" }, "widthPx": 1 },
      "textColor": { "type": "palette", "name": "dimGray" }
    } }
],
"highlightBoxes": [
  { "id": "b81d0e52-6c3a-4f17-a2e9-5c04d7f13a68",
    "style": { "fill": { "color": { "type": "palette", "name": "yellow" }, "opacityPercent": 30 } } }
]
```

案 a のスキーマ（`Paint`・`Stroke` だけを共にし、3 つの型が自分の欄を全部書く）:

```json
"$defs": {
  "TaskStyle": {
    "properties": {
      "taskShape": { "enum": ["rectangle", "chevron", "arrow", "endpointSpan"] },
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } },
  "CommentBoxStyle": {
    "required": ["fill", "stroke", "textColor"],
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" },
      "textColor": { "$ref": "#/$defs/Color" } } },
  "HighlightBoxStyle": {
    "required": ["fill"],
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } }
}
```

案 b のスキーマ（`ShapeStyle` を 3 つの型で共にし、違いを各型に足す）:

```json
"$defs": {
  "ShapeStyle": {
    "properties": {
      "fill":   { "$ref": "#/$defs/Paint" },
      "stroke": { "$ref": "#/$defs/Stroke" } } },
  "TaskStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "properties": { "taskShape": { "enum": ["rectangle", "chevron", "arrow", "endpointSpan"] } },
    "unevaluatedProperties": false },
  "CommentBoxStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "required": ["fill", "stroke", "textColor"],
    "properties": { "textColor": { "$ref": "#/$defs/Color" } },
    "unevaluatedProperties": false },
  "HighlightBoxStyle": {
    "allOf": [ { "$ref": "#/$defs/ShapeStyle" } ],
    "required": ["fill"],
    "unevaluatedProperties": false }
}
```

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ）。1 つの型を読めば、その物の欄が全部わかる |
| b | `ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは各型の足しの決まり（`allOf`）で書く（`DRY`）。型を読む人は `ShapeStyle` も読む。余分なキーを断るには `unevaluatedProperties` が要る |

回答:

### [task] タスクと依存（❓ 1）

#### ✅ 問 6-9-8. `dependencies` —— MSPDI の名 PredecessorLink と違う名を保つか

決まりました（`JDG-3604`）。答えは決定事項にあります。

#### ❓ 問 6-9-5. タスクと依存の、MSPDI の名と違う 3 語

あなたの答え「MSPDI同じならOK。 違うならそこだけ抽出して、裁定に回せ。」に従い、MSPDI の名と同じ 17 語を確定しました（`JDG-3553`）。キーが MSPDI の名と違う 3 語を、ここに残しました。案は GRWB の議論の後でこの問いに書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-1 | `parentTaskUid` |  | WBS での親タスク。この値を省くと最上位のタスク。 | 無し |
| 9-10 | <span style="color: #0550AE">`fadeInCalendarDays`</span> |  | 開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |
| 9-11 | <span style="color: #0550AE">`fadeOutCalendarDays`</span> |  | fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |

回答:

### [tg] タスクグループ（❓ 1）

#### ❓ 問 6-9-2. タスクグループが表すタスク —— MSPDI の木の語との関係を確かめ、`derivedFromTaskUid` の新しい名を決める

あなたの問い: 「MSPDIの各語とこの関係は？ そこを整理の上、JSONの実例を見たい。」

場面: MSPDI はタスクの木を、Task の並びと OutlineLevel などの語で書きます。GRS JSON はタスクの木（WBS）を Task の中に持ち、別に、描く行の木（タスクグループ）を GRS の群に持ちます。このキーが 2 つの木を結びます。XSD（pj15）と仕様（`DV-4`〜`DV-7`・`MR-4`・`FR-058`・`HM-9`・`HM-12`）と実装で確かめました。

**1. MSPDI の語と GRS JSON の置き場**:

| MSPDI の語 | 意味 | GRS JSON の置き場 |
|:---|:---|:---|
| Tasks の中の Task の並び | 木を上からたどる順 | 開くとき、GRS は並びと OutlineLevel から `Task.parentTaskUid` と `Task.siblingOrder` を作る。書くとき、GRS は木を上からたどって Task を並べる |
| UID | タスクの一意な番号 | `Task.uid` |
| ID | 並びの中の位置の番号（XSD: position identifier） | GRS は持たず、書き出すたびに並びから作る（`DV-4`） |
| OutlineLevel | 木の深さ。最上位が 1 | GRS は持たず、`parentTaskUid` の深さから作る（`DV-5`）。数え始めは `project.firstOutlineLevel` |
| OutlineNumber | 木の道すじ（1・1.1・1.2） | GRS は持たず、木から作る（`DV-6`） |
| Summary | 子を持つか（要約タスク） | GRS は持たず、子の有無から作る（`DV-7`） |
| WBS | タスクの WBS コード（XSD の説明） | `Task.passthroughValues` の `WBS`。GRS は読まず、字のまま書き戻す |
| WBSLevel | WBS コードの右端の段 | `Task.passthroughValues` の `WBSLevel`。同上 |
| DisplayAsSummary | 要約タスクとして見せるか | `Task.passthroughValues`。同上 |
| UID 0・OutlineLevel 0 の Task | プロジェクトの要約タスク（`MR-4`） | GRS はタスクにせず、`project.passthroughElements` に持ち、元の位置へ書き戻す（`EX-5`） |
| Project/WBSMasks | WBS コードの書き方 | `project.passthroughElements` |
| Project/OutlineCodes | アウトラインコードの定義。木とは別の、人が付ける分類 | `project.passthroughElements` |
| 無し | タスクグループの木（描く行の木） | `taskGroups`（`id`・`parentId`・`siblingOrder`）と `taskGroupMembers`（`taskUid` → `taskGroupId`） |
| 無し | タスクグループが表す WBS のタスク | `TaskGroup` のこのキー（今の名 `derivedFromTaskUid`） |

**2. GRS がタスクグループを作る決まり（`FR-058`）**: GRS は MSPDI を開くとき、子を持つタスクごとに 1 つ、親を持たないタスクごとに 1 つ（子が無くても）、タスクグループを作ります。GRS はそのタスクの uid をこのキーに書き、タスクの名前を `name` へ写します（`JDG-3315`）。子を持たないタスクは、親のタスクグループに載ります。

**3. 実例**: 要約タスク 1 つと子 2 つの MSPDI です。

```xml
<Tasks>
  <Task>
    <UID>1</UID><ID>1</ID><Name>設計</Name>
    <WBS>1</WBS><OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel>
    <Start>2026-12-01T08:00:00</Start><Finish>2026-12-10T17:00:00</Finish>
    <Summary>1</Summary>
  </Task>
  <Task>
    <UID>2</UID><ID>2</ID><Name>基本設計</Name>
    <WBS>1.1</WBS><OutlineNumber>1.1</OutlineNumber><OutlineLevel>2</OutlineLevel>
    <Start>2026-12-01T08:00:00</Start><Finish>2026-12-04T17:00:00</Finish>
    <Summary>0</Summary>
  </Task>
  <Task>
    <UID>3</UID><ID>3</ID><Name>詳細設計</Name>
    <WBS>1.2</WBS><OutlineNumber>1.2</OutlineNumber><OutlineLevel>2</OutlineLevel>
    <Start>2026-12-07T08:00:00</Start><Finish>2026-12-10T17:00:00</Finish>
    <Summary>0</Summary>
  </Task>
</Tasks>
```

GRS はこれを次の GRS JSON にします（キーは案 a の名で書き、ほかのキーを省きます）。

```json
"scheduleData": {
  "project": { "uid": "1", "firstOutlineLevel": 1 },
  "tasks": [
    { "uid": 1, "siblingOrder": 0, "name": "設計",
      "start": "2026-12-01T08:00:00", "finish": "2026-12-10T17:00:00",
      "passthroughValues": { "WBS": "1" } },
    { "uid": 2, "parentTaskUid": 1, "siblingOrder": 0, "name": "基本設計",
      "start": "2026-12-01T08:00:00", "finish": "2026-12-04T17:00:00",
      "passthroughValues": { "WBS": "1.1" } },
    { "uid": 3, "parentTaskUid": 1, "siblingOrder": 1, "name": "詳細設計",
      "start": "2026-12-07T08:00:00", "finish": "2026-12-10T17:00:00",
      "passthroughValues": { "WBS": "1.2" } }
  ],
  "taskGroups": [
    { "id": "b7e3c2a0-5d41-4c8e-9f6a-1d2e3f4a5b6c", "siblingOrder": 0, "name": "設計",
      "wbsTaskUid": 1, "treeState": "auto" }
  ],
  "taskGroupMembers": [
    { "taskUid": 1, "taskGroupId": "b7e3c2a0-5d41-4c8e-9f6a-1d2e3f4a5b6c" },
    { "taskUid": 2, "taskGroupId": "b7e3c2a0-5d41-4c8e-9f6a-1d2e3f4a5b6c" },
    { "taskUid": 3, "taskGroupId": "b7e3c2a0-5d41-4c8e-9f6a-1d2e3f4a5b6c" }
  ]
}
```

- `parentTaskUid` と `siblingOrder` が WBS を持ちます。ID・OutlineLevel・OutlineNumber・Summary は JSON に入らず、GRS は書き出すたびに木から作ります。
- タスクグループ「設計」は 1 つで、`wbsTaskUid` がタスク 1 を指します。3 つのタスクはこのグループに載り、GRS は 3 つを段に積みます。
- このキーは 2 つの木を結びます。人がタスクグループを並べ替えると、GRS は WBS の兄弟の順も変えます（`HM-9`）。人がキーを持つタスクグループを別の親の下へ移すと、GRS は木を根の側へたどり、最初に出会うキーを持つタスクグループのタスクを、新しい親タスクにします（`HM-12`）。人が手で作ったキーの無いタスクグループを移しても、WBS は変わりません（`HM-7`）。
- WBS コードは `passthroughValues` に入ります。人がタスクを別の親の下へ移しても、GRS は WBS の字を直さず、取り込んだ字を書き戻します。

**4. 案を見直した点**: `FR-058` は、親を持たないタスクに、子が無くてもタスクグループを作ります。このときキーは Summary が 0 のタスクを指します。案 b の弱みは、子を消した後だけでなく、取り込んだ直後にも現れます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `wbsTaskUid`（このタスクグループが表す、WBS の中のタスク）。辞書の語 `wbs` は「親タスクと子タスクの木」（`JDG-3431`）で、MSPDI が OutlineLevel と Task の並びで書く木と同じ物を指す。末尾の `Uid` は、指す先が MSPDI 由来の実体であることを言う（`JDG-3557`）。名が「MSPDI の木のタスクを指す」ことを言い、`HM-9`・`HM-12` が WBS を動かす関係とも合う |
| b | `summaryTaskUid`（WBS の要約タスク）。MSPDI の語 Summary に合う。けれども、親を持たないタスクのタスクグループは、取り込んだ直後から Summary が 0 のタスクを指す（`FR-058`）。子を消した後も同じく、名と中身が食い違う |
| c | `outlineTaskUid`。MSPDI の語 OutlineLevel・OutlineNumber に合う。けれども、GRS は Outline の値を持たず、書き出しで作るだけである。MSPDI の OutlineCodes は木と別の分類なので、名がそれと紛れる |
| d | `representedTaskUid`（前の案。辞書の下書きの今の名）。「表す」関係を言うが、どの木のタスクかを言わない |

回答:

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
