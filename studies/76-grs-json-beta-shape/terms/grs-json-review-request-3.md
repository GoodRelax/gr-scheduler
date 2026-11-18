# 依頼（3 回目）: GRS JSON を見て、こちらの意図が一発で迷いなく伝わるか、確かめてください

**答え方: 答えはすべて日本語で、1 つのコードブロック（```text で始めて ``` で閉じる）の中に、10 節の型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと（一言で）

下の 8 節の JSON の木と 9 節の実例を、**この形式を初めて見る外の開発者や AI になったつもりで**読み、**こちらの意図が一発で、迷いなく伝わるか**を厳しく確かめてください。

- 知りたいのは、名が正しいかよりも、**読んだ人がどこで迷うか、どこで読み違えるか**です。迷った所は、その場所と、最初にどう読んだかを添えて挙げてください。
- **MSPDI から来た名（8 節の印 `[M]`）は変えられません。** MSPDI の要素の名を camelCase にした名で、MSPDI と照らし合わせるために変えません。そこで迷うなら、改名ではなく、**JSON Schema の説明（`description`）に何を書けば迷わないか**を、英語の文で示してください。
- GRS が自分で付けた名（`[M]` の無い名）は、まだ直せます。迷うなら、直す名を示してください。

褒め言葉は要りません。直すべき所を、根拠と直し方つきで挙げてください。

## 2. GRS とは

GoodRelax Scheduler（GRS）は、ブラウザだけで動く日程表のアプリです。日程を 1 つの JSON ファイル（GRS JSON）に保存します。Microsoft Project の XML 形式（MSPDI）とも、情報を失わずに読み書きします。外の道具や AI のエージェントも、この JSON とその命令を読み書きします。

## 3. 設計の目標

1. **外との約束として、長く変えずに使える名にする。** 公開した後は名を変えられないので、今が最後の機会です。
2. **MSPDI と、情報を失わずに往復する。** GRS が意味を読まない MSPDI の値も、捨てずに預かって書き戻す。
3. **人も AI も、JSON を見ただけで、こちらの意図が一発で分かる。** 名で言い切れない所（MSPDI の名と、その数の符号）は、JSON Schema の `description` で補う。
4. **MSPDI から来た名は、MSPDI の要素の名を camelCase にしたもので、変えない。**
5. 公開前なので、今の形との互換は気にしません。

## 4. データの分け方の考え

1. 1 つの文書を、1 つの JSON で表す。
2. 根を、何を表すかで 4 つに分ける: 形の版（`$schema`・`schemaVersionUtc`・`buildVersionUtc`）・見せ方（`documentSettings`）・中身（`scheduleData`）・帳簿（`documentStamp`・`changeLogEntries`）。見せ方を変えても、中身は変わらない。
3. 中身は、MSPDI と往復する物（`project`・`tasks`・`calendars`・`resources`・`assignments`）と、GRS だけの物に分かれる。GRS だけの物は、5 つの値（`scheduleDataTimeZone`・`sourceFormat`・`topTaskOutlineLevel`・`highestIssuedUid`・`mspdiImportCount`）と、配列（`taskGroups`・`commentBoxes`・`highlightBoxes`・`baselineTasks`・`passthrough…` の 4 つ）。5 つの値は袋に入れず、`scheduleData` の直下に置く。
4. MSPDI と往復する実体の直下には、MSPDI の名のキーだけを置く。GRS がその実体に付ける値は、実体の中の `grs` にまとめる（例: タスクの帯 `grs.taskGroupId`、見た目 `grs.style`、取り込み元 `grs.origin`）。GRS が意味を読まない MSPDI の値は、実体の中の `passthrough` に、MSPDI の構造と要素の名のまま預かる。
   **例外が 1 つある:** タスクの `parentTaskUid`（WBS の親）と `siblingOrder`（兄弟の中の順）は、`grs` に入れず、タスクの直下に置く。名は MSPDI の要素の名ではないが、どちらも MSPDI の WBS の木そのもの（親子と兄弟の順）を言う値で、GRS だけの値ではないから。木の印 `◆` は、この 2 つと `grs`・`passthrough` が MSPDI の要素の名でないことを示す。
5. **2 つの木は意図したもの:** WBS の木（`tasks[].parentTaskUid`。MSPDI と往復する親子）と、画面に積む帯の木（`taskGroups[].parentTaskGroupId`）は、別の目的を持つ 2 つの軸です。タスクは帯に `grs.taskGroupId` で入ります。帯は、WBS のどのタスクを表すかを `representedTaskUid` で持ちます。
6. 前回予定 `baselineTasks[]` は、前の予定の写しなので、今のタスクの中に入れず、別の配列に置く。`uid` は、今のタスクの `uid` を指す。

## 5. 命名の決まり

| # | 決まり |
|:---|:---|
| N-1 | キーは camelCase、型の名は PascalCase |
| N-2 | 名は、指すものを言う。略さない |
| N-3 | MSPDI から来た値は、MSPDI の名を camelCase にして使う（`StartDate` → `startDate`） |
| N-4 | キーに持ち主の名を繰り返さない（`project.title`。`projectTitle` にしない） |
| N-5 | 別の実体を指す参照は「相手の名 ＋ `Uid` か `Id`」（`parentTaskGroupId`・`representedTaskUid`） |
| N-6 | 識別子は 2 つだけ: MSPDI から来た実体は `uid`（整数。Project だけ MSPDI のとおり文字列）、GRS 固有の実体は `id`（ランダムな UUID 版 4）。`uid` は同じ配列の中で一意（MSPDI のとおり）、`id` は文書全体で一意。UUID は小文字で書く |
| N-7 | 自分の欄の組を選ぶ判別子は `type`。形を変えない分類や、別の物の型は `xxxType`。`kind` は使わない |
| N-8 | 配列は複数形 |
| N-9 | 真偽の値は `is…` で始める |
| N-10 | 量は単位で終える（`…Px`・`…Percent`・`…Minutes`・`…WorkingDays` など） |
| N-11 | （欠番。N-13 に 1 つにした） |
| N-12 | 「無い」は、キーを書かないこと 1 つで言う。`null` は使わない |
| N-13 | GRS が名を付ける日時のキーは値の型で終える。値の形も決める: 日だけ `…Day`（`2026-12-01`）、時刻だけ `…Time`（`08:00:00`）、日と時刻 `…DateTime`（`2026-12-01T08:00:00`。時差を書かない。データの日時の時差は `scheduleDataTimeZone` が言う）、UTC の瞬間 `…At`（`2026-12-01T08:00:00Z`。秒まで） |
| N-14 | 列挙の値は camelCase の英語の語。MSPDI の数の符号は数のまま |
| N-15 | 空の配列も、中身が全部無い物も、キーを書かないことで言う |
| N-16 | 割合は `…Percent`（0〜100）、倍率は `…Ratio`（1 が既定） |
| N-17 | 判別子 `type` を持つ物は、その値が持つ欄だけを書く |

例外の決まり:

- **MSPDI の名を写すキー（`[M]`）は、N-4・N-7・N-9・N-10・N-13 より強い。** だから `predecessorUid`（N-4）、3 つの `type`（N-7）、`milestone`・`resumeValid`・`dayWorking`（N-9）、`linkLag`（N-10）、`startDate`・`start`・`stop`・`resume`（N-13）は MSPDI の名のまま。
- **MSPDI の `Type` を写す 3 つのキー**（`tasks[].predecessorLinks[].type`・`calendars[].exceptions[].type`・`resources[].type`）は、MSPDI の名のとおり `type`。値は MSPDI の数のまま。**この `type` は判別子ではない**（欄の組を変えない）。値の意味と、判別子でないことは、スキーマの説明に書く。
- **版を言うキーは `…VersionUtc` で終え、値は UTC の秒までの時刻**（`schemaVersionUtc`・`buildVersionUtc`）。
- 外の決まりが決める名（`$schema`）はそのまま。
- `passthrough` と `mspdiElement` の中のキーは、MSPDI の要素の名そのまま（PascalCase）。
- タスクグループとコメントボックスのリンクも、タスクとそろえて MSPDI の名 `hyperlinkAddress`（URL）・`hyperlink`（題）にする。

**はっきり言います: MSPDI から来た名は変えません。** 名で伝わらない意味（数の符号の意味、`hyperlink` が URL でなく題を持つこと など）は、JSON Schema の各キーの `description` で説明します。だから `[M]` のキーには、改名ではなく、`description` に書く文を求めます。

## 6. 順と往復の決まり

- **XML の子の順:** MSPDI の XSD は子の順を決めています。GRS は書き出しで、XSD の順に並べ直します。だから JSON に `ordinal`（順番の数）は持ちません。繰り返す要素は配列の順で戻します。
- **兄弟の中の順 `siblingOrder`（タスクとタスクグループ）:** GRS は兄弟の中で 1 から飛ばさずに振って書きます。読むときは小さい順に並べ、同じ値どうしは配列の順です。
- **GRS が行にしない MSPDI の一覧の要素**（UID 0 の要約タスク、空のタスクなど）は、一覧ごとの `passthroughTasks[]` などに預かります。`precedingTaskUid` は「同じ一覧で前にある、GRS が `tasks[]` に持つタスクのうち、いちばん近いものの uid」です。キーが無ければ一覧の先頭。同じ先を指す要素どうしは配列の順。指す先を GRS で動かすと付いて行き、消すとさらに前のタスクへ書き換えます。UID 0 の要約タスクはいつも先頭です。
- **指す先が無いとき:** 開いたファイルで `preceding…Uid` の指す先が無いとき（外の道具がファイルを書き換えた時など）は、その要素を一覧の末尾に置き、そのことを人に知らせます。
- **書き手の種類:** `changeLogEntries[].changedBy.type` は GRS が自動で書きます（画面で書いた行は `user`、Agent API で書いた行は `agent`）。`name` は、人なら手で打った名、AI なら名乗った名です。
- **見せ方の状態も保存する:** 帯の開閉（`treeState`）なども文書に保存し、取り消しで戻せる、と決めています。

## 7. 2 回目のレビューの指摘と、直した所

2 回目のレビューでは、2 つの AI が答えました（点数は 8.5 と 7.5）。

| 2 回目の指摘 | した事 |
|:---|:---|
| `scheduleData.metadata` が、何でも入る袋に見える | 袋をやめた。5 つの値を `scheduleData` の直下に名のまま置く |
| `schemaVersion`・`buildVersion` の名が、値（UTC の時刻）と合わない | `schemaVersionUtc`・`buildVersionUtc`。「版を言うキーは `…VersionUtc`」を例外の決まりに足した |
| `derivedFromTaskUid` が、何から何が生まれたのか分からない | `representedTaskUid`（この帯が表す WBS のタスク） |
| `editorGroupName` が、編集した組に読める | `editableByGroupName`（編集してよい組の名） |
| `fontSize` が数に見える | `fontSizePreset`（small・medium・large） |
| `displayScalePercent` が N-16（倍率は `…Ratio`）に外れる | `displayScaleRatio`（1 が等倍） |
| タイムゾーンが、文字列（`UTC+09:00`）と分の数で混ざる | 3 か所とも `utcOffsetMinutes`。`scheduleDataTimeZone` は `{ utcOffsetMinutes }` |
| 3 つの表の見せ方で、木（3 つが同じ欄）と実例（欄が違う）が食い違う | 型を 2 つに分けた: `TaskTableWindow`（検索ウィンドウ・遅延診断レポート）と `ResourceTableWindow`（担当リスト） |
| `changedBy` が文字列、`lastEditedBy` が物で、形が違う | 両方 `{ type, name }`。`changedBy.type` は `user`・`agent` で、GRS が自動で書く |
| 決まりの穴: N-11 と N-13 の重なり、N-4 との優先、中身の無い物、日時の値の形、`parentId` と `parentTaskUid` の不揃い、`siblingOrder` の始まり、`uid` の一意の範囲 | N-11 を N-13 に 1 つにした。MSPDI の名は N-4 にも勝つ。中身が全部無い物もキーを書かない。値の形を N-13 に書いた。`parentId` → `parentTaskGroupId`。`siblingOrder` は 1 から飛ばさない。`uid` は配列の中、`id` は文書の中で一意（5 節・6 節） |
| MSPDI の `Type` を写す値が数の符号で、意味が分からない | 名を MSPDI のとおり `type` にした（MSPDI の名は N-7 にも勝つ）。値は MSPDI の数のまま。値の意味と、この `type` が判別子でないことは、スキーマの説明に書く |
| `hyperlink` が URL でなく題を持つのは紛らわしい | 変えない。MSPDI の名で、タスク・タスクグループ・コメントボックスの 3 つで同じ名にそろえる。意味はスキーマの説明に書く |
| `snapPoint` の値が書いていない | 8 つの値を木に書いた |
| 実例の完了率と作業の量が合わない | 子のタスクの完了率を 50、親を 0、割当の作業を 24 時間にした |
| `parentTaskUid`・`siblingOrder` が `grs` の外にある | 変えない。MSPDI の木を言う値だから直下に置く。4 節に書いた（2 回目の質問状に書き漏らした） |
| 外の道具が書いたファイルで、`preceding…Uid` の指す先が無いとき | 決まりはあった。6 節に書いた（2 回目の質問状に書き漏らした） |
| `baselineTasks[]` を別の配列にせず、タスクの中に置くべき | 変えない。前の予定の写しなので、別の配列に置く（4 節） |
| `sourceFormat`・`lastSeenMspdiImportNumber`・`scrollPosition` の名 | 3 つとも名は変えない。`scrollPosition.type` の値は `decided`・`notDecided` → `fixed`・`automatic`。取り込みの数え手のほうは `lastMspdiImportNumber` → `mspdiImportCount`（取り込んだ回数）。タスクの `lastSeenMspdiImportNumber` は「このタスクを最後に含んでいた取り込みが何回目か」 |

## 8. JSON の木（今の最善の案）

印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値（`passthrough`・`parentTaskUid`・`siblingOrder` と、`grs` の物の全体）。`[]` は配列、`→` は下の共通の型を指す。（仮）は仮に採った名か置き場、（問 x-x）はまだ開いた問い。

```text
ScheduleDocument                                    GRS JSON の 1 ファイル
├─ $schema                                          スキーマの所（URL）
├─ schemaVersionUtc                                 スキーマの版（形が最後に変わった UTC の時刻）
├─ buildVersionUtc                                  書いた GRS のビルドの版（UTC の時刻）
├─ documentSettings                                 文書設定
│   ├─ displayScaleRatio                            表示の倍率（1 が等倍）
│   ├─ fontSizePreset                               文字の大きさの段（small・medium・large）
│   ├─ dayWidthPx                                   暦日 1 日の幅
│   ├─ verticalZoomRatio                            縦の大きさの比（1 が既定）
│   ├─ taskGroupAutoExpandDepth                     自動で開く深さ
│   ├─ scrollPosition                               開いたときの位置
│   │   ├─ type                                     automatic・fixed
│   │   ├─ leftEdgeDay                              左の端の日（fixed）
│   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か（fixed）
│   │   ├─ topEdgeTaskGroupId                       上の端の帯（fixed）
│   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か（fixed）
│   ├─ fitDayRange                                  全体表示の期間
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
│   ├─ themeHue （仮）                              テーマの色相の名（blue・blueGreen・green・yellowGreen・yellow・orange・red・redPurple・purple・indigo）（Project から移す。置き場は問 6-13-4）
│   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ rootTreeState                                木の根の状態（auto・collapsed）
│   ├─ pinnedTaskGroupIds[]                         ピン止めした帯の id
│   ├─ parentTaskProgressToleranceWorkingDays （仮）  遅延診断の許し幅（稼働日）（Project から移す。問 6-13-4）
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ → TaskTableWindow
│       ├─ delayDiagnosticsReportWindow             遅延診断レポート → TaskTableWindow
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
│   │   │   │       └─ lastSeenMspdiImportNumber    このタスクを最後に含んでいた取り込みが何回目か
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
│       │   └─ utcOffsetMinutes                     UTC との差（分）
│       ├─ sourceFormat                             元の形式（grs・pj12・pj15）
│       ├─ topTaskOutlineLevel                      取り込んだファイルの、最上位のタスクの OutlineLevel
│       ├─ highestIssuedUid                         uid の数え手
│       ├─ mspdiImportCount                         MSPDI を取り込んだ回数
│       ├─ taskGroups[]                             タスクグループ
│       │   ├─ id                                   一意な UUID
│       │   ├─ name                                 タスクグループ名
│       │   ├─ style                                見た目
│       │   │   └─ color                            帯の色 → LaneColor
│       │   ├─ minHeightPx                          帯の最も低い高さ
│       │   ├─ parentTaskGroupId                    親のタスクグループ（最上位では書かない）
│       │   ├─ siblingOrder                         兄弟の中の順
│       │   ├─ representedTaskUid                   この帯が表す WBS のタスク
│       │   ├─ hyperlinkAddress                     リンク先の URL
│       │   ├─ hyperlink                            リンクのタイトル
│       │   ├─ treeState                            開閉の状態（auto・collapsed・expanded・temporarilyExpanded・hidden）
│       │   └─ editableByGroupName                  編集してよい組の名
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
│       │   │   ├─ snapPart                         吸着する図形の部分（plannedBar・actualBar・milestone）（task）
│       │   │   ├─ highlightBoxId                   箱（highlightBox）
│       │   │   └─ snapPoint                        吸着する 8 点の 1 つ（topLeftCorner・topMiddle・topRightCorner・rightMiddle・bottomRightCorner・bottomMiddle・bottomLeftCorner・leftMiddle）（task・highlightBox）
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
    │   ├─ type                                     user・agent（GRS が自動で書く）
    │   └─ name                                     人が打った名か、AI が名乗った名
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
├─ TaskTableWindow                                  タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
│   ├─ isTaskFilterApplied                          表でチェックしたタスクだけを描くか
│   ├─ checkedTaskUids[] （仮）                     チェックしたタスク
│   ├─ columnFilters[]                              列のフィルタ → ColumnFilter
│   └─ columnSort                                   並べ替えの列と向き → ColumnSort
├─ ResourceTableWindow                              担当の表の見せ方（担当リスト）
│   ├─ isTaskFilterApplied                          表のチェックでチャートを絞るか
│   ├─ checkedResourceUids[] （仮）                 チェックした担当
│   ├─ isUnassignedChecked （仮）                   （担当なし）の行をチェックしたか
│   ├─ columnFilters[]                              列のフィルタ → ColumnFilter
│   └─ columnSort                                   並べ替えの列と向き → ColumnSort
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
  "schemaVersionUtc": "2026-11-17T00:00:00Z",
  "buildVersionUtc": "2026-11-17T03:00:00Z",
  "documentSettings": {
    "displayScaleRatio": 1,
    "fontSizePreset": "medium",
    "dayWidthPx": 24,
    "verticalZoomRatio": 1,
    "taskGroupAutoExpandDepth": 2,
    "scrollPosition": {
      "type": "fixed",
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
    "themeHue": "blue",
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
        "percentComplete": 0,
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
        "percentComplete": 50,
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
            "type": 1,
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
            "type": 1,
            "period": 1,
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
        "type": 1,
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
          "Work": "PT24H0M0S"
        }
      }
    ],
    "scheduleDataTimeZone": {
      "utcOffsetMinutes": 540
    },
    "sourceFormat": "pj15",
    "topTaskOutlineLevel": 1,
    "highestIssuedUid": 4,
    "mspdiImportCount": 1,
    "taskGroups": [
      {
        "id": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "name": "Work package A",
        "style": {
          "color": { "type": "theme" }
        },
        "minHeightPx": 40,
        "siblingOrder": 1,
        "representedTaskUid": 1,
        "hyperlinkAddress": "https://example.com/lanes/work-package-a",
        "hyperlink": "Lane notes",
        "treeState": "expanded",
        "editableByGroupName": "Team A"
      },
      {
        "id": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "name": "Steps",
        "style": {
          "color": { "type": "palette", "name": "lightGray" }
        },
        "parentTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
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
      "changedBy": { "type": "user", "name": "Manager A" },
      "affectedArea": "tasks",
      "changeDescription": "Imported the plan from the MSPDI file.",
      "reason": "Start tracking the work package.",
      "remarks": "First import."
    },
    {
      "changedAt": "2026-12-03T05:10:00Z",
      "changedBy": { "type": "agent", "name": "planning-assistant" },
      "affectedArea": "Prepare draft",
      "changeDescription": "Recorded a stop on Dec 2 and a resume on Dec 3.",
      "reason": "Work paused for half a day."
    }
  ]
}
```

## 10. 答えの型（この型のまま、1 つのコードブロックに書く）

書き方の決まり:

- 答えは日本語で書く。ただし `description` の案は英語で書く（JSON Schema にそのまま載せる文として）。
- 答えの全部を、1 つのコードブロック（```text で始めて ``` で閉じる）の中に書く。コードブロックの外には何も書かない。ブロックの中で、もう 1 つコードブロックを開かない。
- 見出し（[1]〜[7]）は、この型のまま使う。表はブロックの中に、この型の列のまま書く。
- 挙げる物が無い部分には「なし」と書く。
- `[M]` のキーの改名は求めない。`[M]` のキーで迷った所は、[3] に `description` の案として書く。

```text
[1] 部分ごとに、何のための物か一目で分かるか
| 部分 | 一目で分かるか（○・△・×） | 迷った所（キーと、最初の読み） |
| 根（$schema・schemaVersionUtc・buildVersionUtc） | | |
| documentSettings | | |
| scheduleData の MSPDI と往復する群 | | |
| scheduleData の GRS だけの群 | | |
| documentStamp | | |
| changeLogEntries | | |
| 共通の型 | | |

[2] 意味を推し量った GRS の名（[M] でない名だけ。重い順、最大 10）
| # | キー（場所） | 最初の読み | こちらの意図と思うもの | 直す名 |

[3] description が一番要る MSPDI の名（[M] の名。重い順、最大 10）
| # | キー（場所） | 読む人がつまずく訳 | description の案（英語、1〜2 文） |

[4] 木（8 節）と実例（9 節）の食い違い、実例の誤り
- （箇条書き）

[5] 決まり（5 節・6 節）の分かりにくい所・ぶつかる所・足りない所
- （箇条書き）

[6] 2 回目の指摘（7 節）は本当に直ったか
| 指摘 | 直ったか（○・△・×） | 残る問題 |

[7] 「一目で意図が伝わるか」の点数（10 点満点）と、一番先に直すべき 1 点
- 点数:
- 一番先に直すべき 1 点:
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。コードブロックの外には何も書かないでください。**
