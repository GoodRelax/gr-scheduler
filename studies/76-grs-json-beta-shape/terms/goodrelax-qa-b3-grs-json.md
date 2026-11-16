BGQA3
# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

残 3（❓ で検索）

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

2026-11-15 の 2 回目: 1 回目のあなたの答えで 4 問が決まりました（`JDG-3569`・`JDG-3602`〜`JDG-3604`）。説明と例を求めた問いは、JSON の例をコードブロックに入れて書き直しました。新しく、パレットの paper と ink（問 6-6-4-12）、タイムゾーンの置き場（問 6-8-19）、キーの付け方の決まり（問 6-8-6）、画面の欄の名（問 6-13-2）、MSPDI の名と違う語（問 6-9-5・6-7-7）を足しました。

2026-11-15 の 3 回目: あなたの求めに合わせ、GRS JSON の構造図と分け方の考え（問 6-13-3）を、問いの先頭に置きました。ほかの問いは 2 回目のままです。

2026-11-15 の 4 回目: 問 6-13-3 に、15 か所の GRS だけの値を 1 つずつ照らした根拠の表を足し、問 6-8-19 をそこへまとめました。ほかの問いは 2 回目のままです。

2026-11-15 の 5 回目: 問 6-13-3 が決まり（`JDG-3605`）、プロパティの名を併記した構造図に描き直しました。新しく、Project から移す 7 つの値の入れ物の名（問 6-13-4）を問います。

2026-11-15 の 6 回目: あなたの指示「影響が大きいものだけ最初に問え」に従い、ほかの名や形に広く効く 6 問だけを、影響の大きい順に出します: 持ち越しの形（問 6-7-8）、`ordinal` の 4 つの役目（問 6-7-6）、キーに持ち主の名を繰り返さない決まり（問 6-8-6）、色の形の 3 問（問 6-6-4-10・6-6-4-11・6-6-4-8）。1 つの名だけに効く 7 問は、出す前の置き場へ戻しました。

2026-11-17 の 7 回目: 3 問が決まりました（`JDG-3606`〜`JDG-3608`）。続きを求めた 3 問に答えました: `ordinal` は JSON から無くせること（問 6-7-6）、命名の決まりと例外（問 6-8-6）、`allOf` の意味と JSON のデータ（問 6-6-4-11。推奨を b に改めた）。構造図は、残りの 3 問が決まった後に、まとめて描き直します。

2026-11-17 の 8 回目: 3 問の方向が決まりました（`JDG-3609`〜`JDG-3611`）。あなたの求めに合わせて、続きの 3 問を出します: 持ち越した一覧の要素の置き場（問 6-7-9）、MSPDI の `Type` を写す 3 つの名（問 6-8-7。前回の E-6 の一覧の誤りも直した）、コメントボックスの文字の見た目の名（問 6-6-4-13）。

2026-11-17 の 9 回目: 文字の見た目が決まりました（`JDG-3612`）。問 6-7-9 は他の AI への質問状の答えを待ちます。MSPDI の `Type` を写す 3 つは、MSPDI の名を最大限に尊重する案を足して問い直します（問 6-8-8）。

2026-11-17 の 9 回目（追記）: 問 6-7-9 に、他の AI 3 つの答えと、それを受けた私の案を足しました。あなたの確認（違う種類の実体を指さないか、OKPN）を受けて、一覧ごとに配列とキーを分ける形を推奨にしました。

🔄 *2026-11-17 の 10 回目: 問 6-7-9 が決まりました（`JDG-3613`）。構造図の ★ を直し、決まったことを当てて描き直しました（問 6-13-5。直した行は説明の末尾に 🔄）。問 6-8-8 は、その構造図を見て決めてください。*

***

## 決定事項

### [proj] プロジェクト

| 何 | 決め | 裁定 |
|:---|:---|:---|
| プロジェクトの 23 語（問 6-8-5） | 表のとおり確定（8-6 `uid`・8-8 `name`・8-9 `title`・8-10〜8-18・8-20〜8-25・8-31〜8-35）。8-19 `scheduleDataTimeZone` は名だけ確定し、置き場を問 6-8-19 で問う | `JDG-3569` |
| GRS JSON の命名の決まり（問 6-8-6） | 決まり N-1〜N-12 と例外の決まり X-1〜X-4 を採る。例外 E-1・E-2・E-4・E-5 を採る。E-3・E-6 は問 6-8-7 | `JDG-3609` |

### [root] スケジュールデータと文書の根

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 似た字と根の並び（問 6-13-1） | `note` → `remarks`、`levelZeroTreeState` → `rootTreeState`（階層は「深さ」で数える）。根の並びは `$schema`・`schemaVersion`・`buildVersion`・`documentSettings`・`scheduleData`・`documentStamp`・`changeLogEntries` | `JDG-3602` |
| 根の 3 つの部分の呼び名（問 6-11-1） | 「文書刻印」「文書設定」「変更履歴」 | `JDG-3603` |
| GRS JSON の構造と分け方（問 6-13-3） | 1 文書 1 JSON。根を形の版・見せ方・中身・帳簿に分け、中身を MSPDI と往復する群と GRS だけの群に分ける。往復する群の実体に置くのは、その実体のことを言い、かつ MSPDI と往復する値だけ。Project の GRS だけの値 7 つを GRS の群の 1 つの物へ移す（名は問 6-13-4） | `JDG-3605` |

### [key] 共通のキー

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 持ち越しの形（問 6-7-8） | 各実体の `passthrough` 1 つに、MSPDI の構造と要素の名のまま持つ。繰り返せる要素はいつも配列。`ordinal` は持たず、書き出しは XSD の順と配列の順 | `JDG-3606` |
| `ordinal`（問 6-7-6） | JSON から `ordinal` を無くす方向。順は配列で持ち、例外の行の鍵は GRS の中だけで持つ。持ち越した一覧の要素の位置のキーは問 6-7-9 | `JDG-3611` |
| 🔄 *持ち越した一覧の要素（問 6-7-9）* | 🔄 *一覧ごとの配列 `passthroughTasks[] { precedingTaskUid, mspdiElement }` など 4 つ。位置は前にある、GRS が持つ実体のうち、いちばん近いものの uid。動かしても付いて行き、消すとさらに前へ書き換える* | 🔄 *`JDG-3613`* |

### [color] 色

| 何 | 決め | 裁定 |
|:---|:---|:---|
| 線と塗りの形（問 6-6-4-10） | 塗りは `fill`（`Paint { color, opacityPercent }`）、線は `stroke`（`Stroke { color, opacityPercent, widthPx }`）。線を描かないときは太さも書かない | `JDG-3607` |
| テーマの色の役割（問 6-6-4-8） | 置き場が役割を決め、値には `{"type": "theme"}` だけを書く | `JDG-3608` |
| 見た目の型（問 6-6-4-11） | `ShapeStyle { fill, stroke }` を 3 つの見た目で共にし、型ごとの足しを `allOf` で書く。文字の見た目は `style` の中の 1 つの物にまとめる（名は問 6-6-4-13） | `JDG-3610` |
| 文字の見た目（問 6-6-4-13） | コメントボックスの文字の見た目は `style.font { color, sizePx }`。書体が要るときは `family` を足す | `JDG-3612` |

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

### [root] 🔄 *スケジュールデータと文書の根（❓ 1）*

#### 🔄 *❓ 問 6-13-5. 構造図（2026-11-17 版） —— このとおりでよいか*

🔄 *場面: あなたは「途中まで見た。 直せ。 そのあとまたツリーを見る。 ツリーで直したところは説明のところに更新マークをつけろ。 そうしないとツリーが壊れる」と書きました。構造図の ★ を直し、その後に決まったこと（`JDG-3606`・`JDG-3607`・`JDG-3610`〜`JDG-3613`）と問 6-8-8 の a（仮）を当てて描き直しました。直した行は、説明の欄の末尾に 🔄 があります。*

🔄 ***あなたの ★ と直し:***

| 🔄 *#* | 🔄 *あなたの ★* | 🔄 *直し* |
|:---|:---|:---|
| 🔄 *1* | 🔄 *`scrollPosition.type` の `placed`「なぜplaced?、decidedじゃないの？」* | 🔄 *`notDecided`・`decided` にした。対になる 2 つの語で「場所が決まっているか」を言う* |
| 🔄 *2* | 🔄 *`leftEdgeDayFraction`「これなん？」* | 🔄 *開いたとき、左の端がその日のどこにあるか（日の始まりから何 %）。`JDG-3529` の決まりで `…Percent` にし、`leftEdgeDayOffsetPercent` とした* |
| 🔄 *3* | 🔄 *`topEdgeTaskGroupFraction`「これなん？」* | 🔄 *開いたとき、上の端がその帯のどこにあるか（帯の上から何 %）。`topEdgeTaskGroupOffsetPercent` とした（`laneTopOffsetPercent` と同じ考え）* |
| 🔄 *4・5* | 🔄 *`offset`「NEIM違反では？ 最低単位必須」* | 🔄 *`utcOffsetMinutes`（UTC との差を分で。例 540）とした。N-10（量は単位で終える）に合う。`scheduleDataTimeZone`（名は `JDG-3569` で確定）の値の形も分の数にそろえるかは、下の案で問う* |
| 🔄 *6* | 🔄 *`season`「 isSummerTime とかは？」* | 🔄 *値が標準時と夏時間の 2 つだけなので、真偽の値にした。名は `isDaylightSavingTime`（夏時間の国際的な呼び名。N-9）* |
| 🔄 *7* | 🔄 *`stackDirection`「taskStackDirectionか？」* | 🔄 *`taskStackDirection` とした。帯の中でタスクを積む向き（up・down）を言う* |
| 🔄 *8* | 🔄 *`taskGroupPanelWidthPx`「Hightか？」* | 🔄 *横幅のまま。左にある帯の名の欄の横幅で、境目を左右にドラッグして変える* |
| 🔄 *9* | 🔄 *`pinnedTaskGroupIds`「配列か？ isTaskGroupPinnedか？」* | 🔄 *配列のまま。ピン止めは見せ方なので、タスクグループ（中身）でなく文書設定に置く（`S-126`）。ピン止めした帯の並びも配列の順で持てる* |
| 🔄 *10* | 🔄 *`isScheduleFilterApplied`「isTaskFilterApoliedか？」* | 🔄 *`isTaskFilterApplied` とした。表でチェックしたタスクだけを描くか、を言う。画面の語「スケジュールフィルター」も合わせて直すかは、画面の名の問い（後の巡）で問う* |
| 🔄 *11* | 🔄 *`sort`「NEIM違反。」* | 🔄 *`columnSort` とした。型 `ColumnSort`（並べ替えの列と向き）と同じ名* |

🔄 *構造図（β の形。プロパティの名を併記）:*

🔄 *印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値。GRS だけの群と根の部分のキーは印を持たない。`[]` は配列、`→` は下の共通の型を指す。行の末尾の 🔄 は、前の図から変わった所。*

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
🔄 │   │   ├─ type                                     notDecided・decided 🔄
🔄 │   │   ├─ leftEdgeDay                              左の端の日
🔄 │   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か 🔄
🔄 │   │   ├─ topEdgeTaskGroupId                       上の端の帯
🔄 │   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か 🔄
🔄 │   ├─ fitSpan                                      全体表示の期間
🔄 │   │   ├─ firstDay                                 最初の日
🔄 │   │   ├─ lastDay                                  最後の日
🔄 │   │   └─ isFixed                                  期間を固定するか
🔄 │   ├─ viewTimeZone                                 見せるタイムゾーン
🔄 │   │   ├─ type                                     sameAsScheduleData・fixed
🔄 │   │   └─ utcOffsetMinutes                         UTC との差（分） 🔄
🔄 │   ├─ displayTimeZones[]                           追加の時計（4 つまで）
🔄 │   │   ├─ utcOffsetMinutes                         UTC との差（分） 🔄
🔄 │   │   └─ isDaylightSavingTime                     夏時間のゾーンか 🔄
🔄 │   ├─ is…Visible ×12                               見せるかの切り替え 12 個
🔄 │   ├─ taskStackDirection                           帯の中でタスクを積む向き（up・down） 🔄
🔄 │   ├─ isThemeMonochrome                            モノクロか
🔄 │   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅（高さではない） 🔄
🔄 │   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
🔄 │   ├─ rootTreeState                                木の根の状態
🔄 │   ├─ pinnedTaskGroupIds                           ピン止めした帯の id の配列（見せ方なので文書設定に置く） 🔄
🔄 │   └─ tableWindows                                 3 つの表の見せ方
🔄 │       ├─ searchWindow                             検索ウィンドウ
🔄 │       ├─ delayDiagnosticsReportWindow             遅延診断レポート
🔄 │       ├─ resourceListWindow                       担当リスト
🔄 │       └─ （3 つの表は、どれも次の欄を持つ）
🔄 │           ├─ isTaskFilterApplied                  表でチェックしたタスクだけを描くか 🔄
🔄 │           ├─ shownTaskUids                        チェックしたタスク
🔄 │           ├─ shownResourceUids                    チェックした担当（担当リスト）
🔄 │           ├─ isUnassignedShown                    （担当なし）の行（担当リスト）
🔄 │           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
🔄 │           └─ columnSort                           並べ替えの列と向き → ColumnSort 🔄
🔄 ├─ scheduleData                                     スケジュールデータ
🔄 │   ├─ ［MSPDI と往復する群］
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
🔄 │   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
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
🔄 │   │   │   │   ├─ predecessorLinkType [M] (Type)   依存の種類（FF・FS・SF・SS）（仮） 🔄
🔄 │   │   │   │   ├─ linkLag [M]                      ラグ
🔄 │   │   │   │   ├─ lagFormat [M]                    ラグの単位
🔄 │   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   ├─ calendars[] [M]                          暦
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             暦の名
🔄 │   │   │   ├─ isBaseCalendar [M]                   基本の暦か
🔄 │   │   │   ├─ baseCalendarUid [M]                  受け継ぐ元の暦
🔄 │   │   │   ├─ weekDays[] [M]                       曜日ごとの稼働
🔄 │   │   │   │   ├─ dayType [M]                      曜日（1 が日曜）
🔄 │   │   │   │   ├─ dayWorking [M]                   稼働日か
🔄 │   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯
🔄 │   │   │   │   │   ├─ fromTime [M]                 始まりの時刻
🔄 │   │   │   │   │   └─ toTime [M]                   終わりの時刻 🔄
🔄 │   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   │   ├─ exceptions[] [M]                     例外の日
🔄 │   │   │   │   ├─ name [M]                         例外の名
🔄 │   │   │   │   ├─ fromDate [M] (TimePeriod/FromDate)  最初の日
🔄 │   │   │   │   ├─ toDate [M] (TimePeriod/ToDate)   最後の日
🔄 │   │   │   │   ├─ dayWorking [M]                   稼働日か
🔄 │   │   │   │   ├─ exceptionType [M] (Type)         例外の繰り返し方（仮） 🔄
🔄 │   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
🔄 │   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯（形は上と同じ）
🔄 │   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   ├─ resources[] [M]                          担当
🔄 │   │   │   ├─ uid [M]                              一意な番号
🔄 │   │   │   ├─ name [M]                             担当の名
🔄 │   │   │   ├─ resourceType [M] (Type)              資材か作業か（仮） 🔄
🔄 │   │   │   ├─ isCostResource [M]                   コストの担当か
🔄 │   │   │   ├─ calendarUid [M]                      担当の暦
🔄 │   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   │   └─ assignments[] [M]                        割当
🔄 │   │       ├─ uid [M]                              一意な番号
🔄 │   │       ├─ taskUid [M]                          就くタスク
🔄 │   │       ├─ resourceUid [M]                      就く担当
🔄 │   │       └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
🔄 │   └─ ［GRS だけが持つ群］
🔄 │       ├─ （名は次の問いで決める）                 文書全体の GRS の値（名は後の問い 6-13-4） 🔄
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
🔄 │       │   ├─ style                                見た目 🔄
🔄 │       │   │   └─ color                            帯の色 → LaneColor 🔄
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
🔄 │       │   └─ style                                見た目 🔄
🔄 │       │       ├─ taskShape                        バーの形
🔄 │       │       ├─ milestoneShape                   マイルストーンの形
🔄 │       │       ├─ fill                             塗り → Paint 🔄
🔄 │       │       └─ stroke                           縁 → Stroke 🔄
🔄 │       ├─ commentBoxes[]                           コメントボックス
🔄 │       │   ├─ id                                   一意な UUID
🔄 │       │   ├─ text                                 文
🔄 │       │   ├─ style                                見た目 🔄
🔄 │       │   │   ├─ fill                             箱の塗り → Paint 🔄
🔄 │       │   │   ├─ stroke                           枠と引出し線 → Stroke 🔄
🔄 │       │   │   └─ font                             文字の見た目 🔄
🔄 │       │   │       ├─ color                        文字の色 → Color 🔄
🔄 │       │   │       └─ sizePx                       文字の大きさ 🔄
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
🔄 │       │   ├─ style                                見た目 🔄
🔄 │       │   │   ├─ cornerRadiusPx                   角の丸みの半径
🔄 │       │   │   ├─ fill                             塗り → Paint 🔄
🔄 │       │   │   └─ stroke                           枠 → Stroke 🔄
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
🔄 │       ├─ taskOrigins[]                            取り込み元の控え 🔄
🔄 │       │   ├─ taskUid                              タスク 🔄
🔄 │       │   ├─ sourceProjectId                      元のファイルの UID 🔄
🔄 │       │   ├─ sourceUid                            元のタスクの UID 🔄
🔄 │       │   ├─ importSessionId                      取り込みの id 🔄
🔄 │       │   └─ lastSeenMspdiImportNumber            最後に見た取り込み 🔄
🔄 │       ├─ passthroughTasks[]                       GRS がタスクにしない MSPDI の要素 🔄
🔄 │       │   ├─ precedingTaskUid                     前にある、いちばん近いタスクの uid 🔄
🔄 │       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
🔄 │       ├─ passthroughResources[]                   GRS が担当にしない MSPDI の要素 🔄
🔄 │       │   ├─ precedingResourceUid                 前にある、いちばん近い担当の uid 🔄
🔄 │       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
🔄 │       ├─ passthroughAssignments[]                 GRS が割当にしない MSPDI の要素 🔄
🔄 │       │   ├─ precedingAssignmentUid               前にある、いちばん近い割当の uid 🔄
🔄 │       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
🔄 │       └─ passthroughCalendars[]                   GRS が暦にしない MSPDI の要素 🔄
🔄 │           ├─ precedingCalendarUid                 前にある、いちばん近い暦の uid 🔄
🔄 │           └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
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
🔄 ├─ Paint                                            塗り 🔄
🔄 │   ├─ color                                        色 → Color 🔄
🔄 │   └─ opacityPercent                               不透明度（%） 🔄
🔄 ├─ Stroke                                           線 🔄
🔄 │   ├─ color                                        色 → Color 🔄
🔄 │   ├─ opacityPercent                               不透明度（%） 🔄
🔄 │   └─ widthPx                                      太さ 🔄
🔄 └─ ShapeStyle                                       形の見た目（タスク・コメントボックス・ハイライトボックスで共にする） 🔄
🔄     ├─ fill                                         塗り → Paint 🔄
🔄     └─ stroke                                       線 → Stroke 🔄
```

🔄 *消した行:*

- 🔄 *project の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *tasks[].predecessorLinks[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *tasks[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *calendars[] の `◆ordinal`*
- 🔄 *calendars[].weekDays[] の `◆ordinal`*
- 🔄 *calendars[].weekDays[].workingTimes[] の `◆ordinal`*
- 🔄 *calendars[].weekDays[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *calendars[].exceptions[] の `◆ordinal`*
- 🔄 *calendars[].exceptions[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *calendars[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *resources[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *assignments[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）*
- 🔄 *taskStyles[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）*
- 🔄 *commentBoxes[].style の `opacityPercent`（`fill`・`stroke` の `opacityPercent` へ）*
- 🔄 *commentBoxes[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）*
- 🔄 *commentBoxes[].style の `textColor`（`font` の `color` へ）*
- 🔄 *commentBoxes[].style の `fontSizePx`（`font` の `sizePx` へ）*
- 🔄 *highlightBoxes[].style の `opacityPercent`（`fill`・`stroke` の `opacityPercent` へ）*
- 🔄 *highlightBoxes[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）*
- 🔄 *共通の型の `PassthroughElement` と、その子 `ordinal`・`name`・`fields`・`children[]`（5 行）*

🔄 *注:*

- 🔄 *`taskOrigins[]` の 6 行と `workingTimes[].toTime` の 1 行は、木の線（`└─` と `├─`）だけが変わった。中身は変わっていない。*
- 🔄 *`Color` は、ほかに変わる所がないので、「（問 6-6-4-7）」を外した。*
- 🔄 *3 つの `style` は、`ShapeStyle` を開いた形で描いた。`taskStyles[].style` は形のキーを足し、`commentBoxes[].style` は `font` を足し、`highlightBoxes[].style` は `cornerRadiusPx` を足す。*
- 🔄 *`Paint`・`Stroke`・`ShapeStyle` は、共通の型の末尾に置いた。*
- 🔄 *`passthroughResources[]`・`passthroughAssignments[]`・`passthroughCalendars[]` の説明は、`passthroughTasks[]` に倣って席が書いた。*

| 🔄 *案* | 🔄 *中身* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *この構造図のとおりにする。`scheduleDataTimeZone` の値も、分の数（例 540）にそろえる（`utcOffsetMinutes` と同じ形。名は `JDG-3569` のまま）* |
| 🔄 *b* | 🔄 *この構造図のとおりにする。`scheduleDataTimeZone` の値は今の文字の形（`"+09:00"`）のまま* |
| 🔄 *c* | 🔄 *直す行に ★ を書く* |

回答:

#### 🔄 *✅ 問 6-13-3. GRS JSON の構造と、データの分け方 —— この考えでよいか*

🔄 *決まりました（`JDG-3605`）。構造図の今の版は、問 6-13-5 にあります。*


#### 🔄 *✅ 問 6-13-1. 似た字の 2 組と根の並び —— 名を分けるか、並びを確かめるか*

🔄 *決まりました（`JDG-3602`）。答えは決定事項にあります。*

#### 🔄 *✅ 問 6-11-1. 根の 3 つの部分の呼び名 —— 「刻印」「設定」「変更ログ」の字をどうそろえるか*

🔄 *決まりました（`JDG-3603`）。答えは決定事項にあります。*

### [key] 🔄 *共通のキー ✅*

#### ✅ 問 6-7-8. 持ち越しの形 —— MSPDI の構造とキーのまま持つか

決まりました（`JDG-3606`）。答えは決定事項にあります。

#### ✅ 問 6-7-6. `ordinal` —— JSON から無くしてよいか

決まりました（`JDG-3611`）。JSON から `ordinal` を無くす方向が決まりました。位置を言うキーの名と、指す先が消えたときの決まりは、すぐ下の問 6-7-9 で問います。

#### 🔄 *✅ 問 6-7-9. 持ち越した一覧の要素の置き場 —— 位置のキーの名と意味、消えたときと動かしたときの決まり*

🔄 *決まりました（`JDG-3613`）。答えは決定事項にあります。*

### [proj] プロジェクト（❓ 1）

#### ✅ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

決まりました（`JDG-3569`）。答えは決定事項にあります。

#### ✅ 問 6-8-19. スケジュールデータのタイムゾーンの置き場 —— MSPDI に無い値を、MSPDI の実体の中に置くか、GRS の群へ移すか

問 6-13-3 にまとめました（15 か所の根拠の表と、移す範囲の案 a〜c）。

#### ✅ 問 6-8-6. GRS JSON の命名の決まり —— この決まりと例外でよいか

決まりました（`JDG-3609`）。決まり N-1〜N-12 と例外の決まり X-1〜X-4 を採りました。E-3 と E-6 は、すぐ下の問 6-8-7 で問い直します。

#### ✅ 問 6-8-7. MSPDI と名が違う、MSPDI 由来のキー —— 1 つずつ比べて選ぶ

あなたの問い「MSPDIの名称を最大限に尊重したらどうなる？」に、すぐ下の問 6-8-8 で答えます。

#### ❓ 問 6-8-8. MSPDI の `Type` を写す 3 つ —— MSPDI の名を最大限に尊重したらどうなるか

場面: 前回、あなたは「全体構造がわからんが、 xxx.exception.type やxxx.exceptionType のようにMSPDIの名称を最大限に尊重したらどうなる？ linkType より PredecessorLink Type の方が分かりやすいぞ。」と書きました。

**3 つのキーの居場所**（GRS JSON と MSPDI を並べた構造図。`→` の右が MSPDI の元の場所）:

```text
scheduleData
├─ tasks[]                    Task                  → Project/Tasks/Task
│   └─ predecessorLinks[]     PredecessorLink       → Task/PredecessorLink
│       ├─ predecessorUid                           → PredecessorLink/PredecessorUID
│       ├─ ？Type                依存の種類（FF・FS・SF・SS） → PredecessorLink/Type
│       ├─ linkLag                                  → PredecessorLink/LinkLag
│       └─ lagFormat                                → PredecessorLink/LagFormat
├─ calendars[]                Calendar              → Project/Calendars/Calendar
│   ├─ weekDays[]             WeekDay               → Calendar/WeekDays/WeekDay
│   │   └─ dayType                                  → WeekDay/DayType（MSPDI と同じ名）
│   └─ exceptions[]           Exception             → Calendar/Exceptions/Exception
│       └─ ？Type                繰り返し方（毎日・毎週など） → Exception/Type
└─ resources[]                Resource              → Project/Resources/Resource
    └─ ？Type                    資材か作業か            → Resource/Type
```

**あなたの案を広げた決まり:** 「MSPDI の `Type` を写すキーは、MSPDI の親要素の名 ＋ `Type` とする」。MSPDI の XSD の説明も、それぞれを "The exception type"・"The link type"・"The type of resource" と、親の名で呼びます。

| 案 | 3 つの名 | 中身 |
|:---|:---|:---|
| **a（推奨）** | `exceptionType`・`predecessorLinkType`・`resourceType` | 親要素の名 ＋ `Type`。MSPDI を知る人は、名から `Exception/Type` などの元の場所がすぐ分かる。3 つが 1 つの決まりで名付けられ、`resourceType` だけの例外（E-3）が消える。素の `type` は判別子だけに残る（N-7）。代わりに、キーが持ち主の名を繰り返す（N-4）。これを例外の決まり X-5「MSPDI の `Type` を写すキーは、親要素の名 ＋ `Type`（N-4 より強い）」として書く |
| b | 3 つとも `type`（`exception.type` のように、置き場で読む） | MSPDI の名そのもの。ただし `Color.type`（どの形かを選ぶ判別子）と `Exception.type`（繰り返し方）が、同じ名で別の役目を持つ（`OKPN`・`OMPV`）。判別子の決まり N-7 を崩す |
| c | `recurrenceType`・`linkType`・`resourceType`（今のまま） | 何を分けるかを言う名。MSPDI の名からは離れ、`resourceType` だけが例外になる |

🔄 *前回の答え「a (仮)  JSONツリーを見て最終決定する」に合わせ、問 6-13-5 の構造図に a の名を（仮）として描きました。*

回答:

### [color] 色 ✅

#### ✅ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

決まりました（`JDG-3607`）。答えは決定事項にあります。

#### ✅ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか —— `allOf` の意味と、JSON のデータ

決まりました（`JDG-3610`）。`ShapeStyle { fill, stroke }` を 3 つの見た目で共にします。文字の見た目の名は、すぐ下の問 6-6-4-13 で問います。

#### ✅ 問 6-6-4-13. コメントボックスの文字の見た目 —— `style` の中の 1 つの物の名

決まりました（`JDG-3612`）。答えは決定事項にあります。

#### ✅ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

決まりました（`JDG-3608`）。答えは決定事項にあります。

### [task] タスクと依存 ✅

#### ✅ 問 6-9-8. `dependencies` —— MSPDI の名 PredecessorLink と違う名を保つか

決まりました（`JDG-3604`）。答えは決定事項にあります。

### [tg] タスクグループ ✅

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
