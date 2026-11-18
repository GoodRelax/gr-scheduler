# 依頼（4 回目）: GRS JSON を見て、こちらの意図が一発で迷いなく伝わるか、確かめてください

**答え方: 答えはすべて日本語で、1 つのコードブロック（```text で始めて ``` で閉じる）の中に、11 節の型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと（一言で）

下の 9 節の JSON の木と 10 節の実例を、**この形式を初めて見る外の開発者や AI になったつもりで**読み、**こちらの意図が一発で、迷いなく伝わるか**を厳しく確かめてください。

- 知りたいのは、名が正しいかよりも、**読んだ人がどこで迷うか、どこで読み違えるか**です。迷った所は、その場所と、最初にどう読んだかを添えて挙げてください。
- **MSPDI から来た名（9 節の印 `[M]`）は変えられません。** MSPDI の要素の名を camelCase にした名で、MSPDI と照らし合わせるために変えません。そこで迷うなら、改名ではなく、**JSON Schema の説明（`description`）に何を書けば迷わないか**を、英語の文で示してください。今回は、書くつもりの説明の案を 8 節に載せました。その案で迷いが消えるかも確かめてください。
- GRS が自分で付けた名（`[M]` の無い名）は、まだ直せます。迷うなら、直す名を示してください。

**指摘は、次の 3 つに分けてください。** 混ぜないでください。

| 区分 | 中身 | 書く所 |
|:---|:---|:---|
| (a) 名か形を変える | GRS が付けた名を変えないと読み違える所、JSON の形（入れ子・置き場・型）を変えないと読み違える所 | 11 節の [2] |
| (b) 説明の文で足りる | 名や形はそのままで、スキーマの `description` に文を足せば迷わない所（MSPDI の名は、いつもこちら） | 11 節の [3] |
| (c) 実例の誤り | 10 節の実例の値が、木・決まり・ほかの値と合わない所 | 11 節の [4] |

GRS が付けた名でも、説明の文を足せば迷わないなら (b) にしてください。(a) は、説明を読んでも読み違える、または説明が無いと誤って使う所だけにしてください。

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
4. MSPDI と往復する実体の直下には、MSPDI の名のキーだけを置く。GRS がその実体に付ける値は、実体の中の `grs` にまとめる（例: タスクの帯 `grs.taskGroupId`、見た目 `grs.style`、取り込み元の控え `grs.importOrigin`）。GRS が意味を読まない MSPDI の値は、実体の中の `passthrough` に、MSPDI の構造と要素の名のまま預かる。
   **例外が 1 つある:** タスクの `parentTaskUid`（WBS の親）と `siblingOrder`（兄弟の中の順）は、`grs` に入れず、タスクの直下に置く。名は MSPDI の要素の名ではないが、どちらも MSPDI の WBS の木そのもの（親子と兄弟の順）を言う値で、GRS だけの値ではないから。木の印 `◆` は、この 2 つと `grs`・`passthrough` が MSPDI の要素の名でないことを示す。
5. **2 つの木は意図したもの:** WBS の木（`tasks[].parentTaskUid`。MSPDI と往復する親子）と、画面に積む帯の木（`taskGroups[].parentTaskGroupId`）は、別の目的を持つ 2 つの軸です。タスクは帯に `grs.taskGroupId` で入ります。帯は、WBS のどのタスクがその帯を代表するかを `representativeTaskUid` で持ちます。
6. 前回予定 `baselineTasks[]` は、前の予定の写しなので、今のタスクの中に入れず、別の配列に置く。`uid` は、今のタスクの `uid` を指す。

## 5. 命名の決まり

決まりは、ぶつかったときに勝つ順に並べました。**上の決まりが下の決まりに勝ちます。** 番号 N-1〜N-17 は前の質問状と同じ番号のままで、順は「優先」の列で言います。番号の無い行（優先 1・2・4・5・21）は、前の質問状で「例外の決まり」や「順と往復」に書いていた物です。

| 優先 | 番号 | 決まり | 勝つ相手と、その例 |
|:---|:---|:---|:---|
| 1 | — | 外の決まりが決める名はそのまま（`$schema`） | N-1 |
| 2 | — | `passthrough` と `mspdiElement` の中のキーは、MSPDI の要素の名そのまま（PascalCase） | N-1・N-3 |
| 3 | N-3 | MSPDI から来た値は、MSPDI の名を camelCase にして使う（`StartDate` → `startDate`）。MSPDI の `Type` は `type`（判別子ではない）。MSPDI の数の符号は数のまま | N-2・N-4（`predecessorUid`）・N-7（3 つの `type`）・N-9（`milestone`・`resumeValid`・`dayWorking`）・N-10（`linkLag`）・N-13（`startDate`・`start`・`stop`・`resume`）・N-14 |
| 4 | — | リンクの欄は、タスク・タスクグループ・コメントボックスとも MSPDI の名 `hyperlinkAddress`（URL）・`hyperlink`（題） | N-2（`hyperlink` が題を持つ） |
| 5 | — | 版を言うキーは `…VersionUtc` で終え、値は UTC の秒までの時刻（`schemaVersionUtc`・`buildVersionUtc`） | N-13（`…At`） |
| 6 | N-1 | キーは camelCase、型の名は PascalCase | — |
| 7 | N-6 | 識別子は 2 つだけ: MSPDI から来た実体は `uid`（整数。Project だけ MSPDI のとおり文字列）、GRS 固有の実体は `id`（ランダムな UUID 版 4）。`uid` は同じ配列の中で一意（MSPDI のとおり）、`id` は文書全体で一意。UUID は小文字で書く | N-2（略の `uid`・`id`） |
| 8 | N-5 | 別の実体を指す参照は「相手の名 ＋ `Uid` か `Id`」（`parentTaskGroupId`・`representativeTaskUid`） | N-4（`parentTaskUid`・`parentTaskGroupId`） |
| 9 | N-2 | 名は、指すものを言う。略は `uid`・`id`・`Px`・`Utc` と、Web の決まりが使う語 `dx`・`dy`・`min`・`max`・`hex` だけ。形式の名 MSPDI は固有の名で、略に数えない | N-4（`scheduleDataTimeZone`: 読み違えないよう持ち主の名を残す） |
| 10 | N-4 | キーに持ち主の名を繰り返さない（`project.title`。`projectTitle` にしない） | — |
| 11 | N-7 | 自分の欄の組を選ぶ判別子は `type`。`xxxType` は、名が `type` になりそうな分類だけに使う。状態・向き・段などの列挙は、それが何かを言う名にする（`treeState`・`taskStackDirection`・`fontSizePreset`）。`kind` は使わない | — |
| 12 | N-8 | 配列は複数形 | — |
| 13 | N-9 | 真偽の値は `is…` で始める | — |
| 14 | N-16 | 割合は `…Percent`（0〜100）、倍率は `…Ratio`（1 が既定） | N-10 の「単位」を、割合と倍率で決める |
| 15 | N-10 | 量は単位で終える（`…Px`・`…Percent`・`…Minutes`・`…WorkingDays` など）。同じ単位の量だけを持つ物は、物の名に単位を付け、中のキーには付けない（`bodyOffsetPx { dx, dy }`） | — |
| 16 | N-13 | GRS が名を付ける日時のキーは値の型で終える。値の形も決める: 日だけ `…Day`（`2026-12-01`）、時刻だけ `…Time`（`08:00:00`）、日と時刻 `…DateTime`（`2026-12-01T08:00:00`。時差を書かない。データの日時の時差は `scheduleDataTimeZone` が言う）、UTC の瞬間 `…At`（`2026-12-01T08:00:00Z`。秒まで） | — |
| 17 | N-14 | 列挙の値は camelCase の英語の語。MSPDI の数の符号は数のまま | — |
| 18 | N-17 | 判別子 `type` を持つ物は、その値が持つ欄だけを書く | — |
| 19 | N-12 | 「無い」は、キーを書かないこと 1 つで言う。`null` は使わない | — |
| 20 | N-15 | 空の配列も、中身が全部無い物も、キーを書かないことで言う | — |
| 21 | — | スキーマの必須（`required`）は、それが無いと文書が読めない物だけ | — |

N-11 は欠番です（N-13 に 1 つにした）。

**MSPDI の `Type` を写す 3 つのキー**（`tasks[].predecessorLinks[].type`・`calendars[].exceptions[].type`・`resources[].type`）は、優先 3 により MSPDI の名のとおり `type` で、値は MSPDI の数のままです。**この `type` は判別子ではありません**（欄の組を変えない）。値の意味と、判別子でないことは、スキーマの説明に書きます（8 節）。

**はっきり言います: MSPDI から来た名は変えません。** 名で伝わらない意味（数の符号の意味、`hyperlink` が URL でなく題を持つこと など）は、JSON Schema の各キーの `description` で説明します。だから `[M]` のキーには、改名ではなく、`description` に書く文を求めます。

## 6. 順と往復の決まり

- **XML の子の順:** MSPDI の XSD は子の順を決めています。GRS は書き出しで、XSD の順に並べ直します。だから JSON に `ordinal`（順番の数）は持ちません。繰り返す要素は配列の順で戻します。
- **`tasks[]` の配列の順:** 意味を持ちません。タスクの順は WBS の木（`parentTaskUid` と `siblingOrder`）が言います。MSPDI へ書くときは、WBS の木を深さ優先でたどった順に書きます（親の次にその子を `siblingOrder` の順に書き、子孫を書き終えてから次の兄弟へ進む）。
- **兄弟の中の順 `siblingOrder`（タスクとタスクグループ）:** GRS は兄弟の中で 1 から飛ばさずに振って書きます。読むときは小さい順に並べ、同じ値どうしは配列の順です。
- **GRS が行にしない MSPDI の一覧の要素**（UID 0 の要約タスク、空のタスクなど）は、一覧ごとの `passthroughTasks[]` などに預かります。`precedingTaskUid` は「同じ一覧で前にある、GRS が `tasks[]` に持つタスクのうち、いちばん近いものの uid」です。キーが無ければ一覧の先頭。同じ先を指す要素どうしは配列の順。指す先を GRS で動かすと付いて行き、消すとさらに前のタスクへ書き換えます。**前にもう GRS のタスクが無くなったら、キーを消します**（その要素は一覧の先頭になる）。UID 0 の要約タスクはいつも先頭です。担当・割当・暦の `preceding…Uid` も同じです。
- **指す先が無いとき:** 開いたファイルで `preceding…Uid` の指す先が無いとき（外の道具がファイルを書き換えた時など）は、その要素を一覧の末尾に置き、そのことを人に知らせます。
- **書き手の種類:** `changeLogEntries[].changedBy.writerType` は GRS が自動で書きます（欄の組を選ばないので、判別子の `type` でなく `writerType`）（画面で書いた行は `user`、Agent API で書いた行は `agent`）。`name` は、人なら手で打った名、AI なら名乗った名です。`documentStamp.lastEditedBy.name` は、`type` が `agent` のときだけ書きます（こちらの `type` は判別子）。
- **タイムゾーン:** 差は ISO 8601 の時差の文字列 `utcOffset`（`"+09:00"` の形。UTC は `"+00:00"`）。GRS は夏時間を季節で切り替えず、決まった差だけを使います。データの時差（`scheduleDataTimeZone`）と見せる基準（`viewTimeZone`）は標準時のゾーンだけから選び、夏時間で読みたい人は追加の時計（`displayTimeZones[]`）で夏時間のゾーンを選びます（`zoneNameType: "daylight"`）。だから夏に保存した文書を冬に開いても、日時の数字は同じ瞬間を指します。
- **見せ方の状態も保存する:** 帯の開閉（`treeState`）なども文書に保存し、取り消しで戻せる、と決めています。

## 7. 3 回目のレビューの指摘と、直した所

3 回目のレビューでは、2 つの AI が答えました（点数は 8.0 と 8.8）。

| 3 回目の指摘 | した事 |
|:---|:---|
| 担当リストの表の見せ方に `isTaskFilterApplied` があり、担当の表なのに「タスク」のフィルタに読める（1 つの AI が一番先に直す 1 点に挙げた） | 2 つの表の型とも `isScheduleFilterApplied`。画面の名「スケジュールフィルタ」に合わせた |
| `displayTimeZones[].isDaylightSavingTime` が「差に 60 分を足す」と読める | `zoneNameType`（値 `standard`・`daylight`）。その時計に出すゾーンの名の種類だけを選ぶ値で、差 `utcOffset` はもう夏時間の分を含む |
| `taskStackDirection` の値 `up`・`down` が、どちらへ積むのか分からない | 値を `bottomToTop`・`topToBottom` にした（キーは今のまま） |
| `sourceFormat` の値 `pj12`・`pj15` が分からない | 値を `mspdi12`・`mspdi15` にした（`grs` は今のまま） |
| 色の側の `derivedFrom` が「写した」と読める | `isCalculatedFromOppositeColor`（真偽。GRS が反対の側の色から計算して作った側だけ `true`。人が選んだ側は書かない） |
| 帯の `representedTaskUid` の向きが分からない（もう 1 つの AI が一番先に直す 1 点に挙げた） | `representativeTaskUid`（この帯を代表する WBS のタスク） |
| `parentTaskProgressToleranceWorkingDays` が読み違えられる | `delayDiagnosticsToleranceWorkingDays`（遅延診断が親タスクの進み具合に許す幅） |
| `rootTreeState` が、どの木の根か分からない | `taskGroupRootTreeState` |
| タスクの `grs.origin` が、何の元か広すぎる | `grs.importOrigin`（MSPDI から取り込んだタスクだけが持つ控え） |
| `highestIssuedUid`・`fadeInCalendarDays`・`fadeOutCalendarDays`・`leaderTarget`・`precedingTaskUid`・`topTaskOutlineLevel` の名 | 名は変えない。スキーマの説明で補う（8 節に案）。`precedingTaskUid` に代わる案 `afterTaskUid` は、前に、何の後かが分かりにくいとして採らなかった |
| 決まりの穴: N-4 と N-5 のどちらが勝つか、N-7 の `xxxType` の範囲、N-10 で物の中に量を並べるとき、スキーマの必須の範囲、MSPDI へ書くタスクの順、`preceding…Uid` の指す先が一覧の先頭まで消えたとき | 決まりを足した（5 節の優先 8・11・15・21、6 節）。決まりを全部、勝つ順に並べた（5 節）。並べると N-2 の「略さない」が `uid`・`id`・`Px`・`Utc` とぶつかったので、N-2 を「略はこの 4 つだけ」と書き直した |
| MSPDI の名（`hyperlink`・`hyperlinkAddress`・`linkLag`・`lagFormat`・3 つの `type`・`resumeValid`・`dayType`・`weekStartDay`・`stop`・`resume`・`milestone`）で迷う | 名は変えない。スキーマの説明の案を書いた（8 節） |
| 実例の誤り: 基準日より後に、完了したマイルストーンがある。割当の作業の量が、途中の休みと合わない。取り込みの控えが 1 つのタスクにしか無い。`lastEditedBy.name` を、どの書き手で書くのか分からない | 直した。基準日を 2026-12-04 17:00 にした。割当の作業を 20 時間にして、休みに合わせた。取り込んだ 3 つのタスク全部に控えを付けた。`lastEditedBy.name` は `agent` のときだけ書く |

## 8. スキーマに書く説明の案（`description`）

前の回で読む人がつまずいた名に、JSON Schema の `description` として書くつもりの文です。MSPDI から来た名の文は、MSPDI の XSD の説明（`xsd:documentation`）に照らして書きました。XSD が言っていない事は書いていません。

**MSPDI から来た名（変えない名）:**

| キー（場所） | つまずいた所 | description の案 |
|:---|:---|:---|
| `tasks[].hyperlink`（`taskGroups[]`・`commentBoxes[]` も同じ） | URL に読める | The title (display text) of the hyperlink, not its address. The address is in hyperlinkAddress. |
| `tasks[].hyperlinkAddress`（`taskGroups[]`・`commentBoxes[]` も同じ） | `hyperlink` との違い | The address (URL) of the hyperlink. Its title is in hyperlink; task groups and comment boxes use the same two MSPDI names as tasks. |
| `tasks[].predecessorLinks[].linkLag` | 単位 | The amount of lag in tenths of a minute (4800 = 480 minutes). Its unit does not depend on lagFormat. |
| `tasks[].predecessorLinks[].lagFormat` | `linkLag` の単位に読める | MSPDI code for the format in which the lag is expressed: 3=m, 4=em, 5=h, 6=eh, 7=d, 8=ed, 9=w, 10=ew, 11=mo, 12=emo, 19=%, 20=e%, 35=m?, 36=em?, 37=h?, 38=eh?, 39=d?, 40=ed?, 41=w?, 42=ew?, 43=mo?, 44=emo?, 51=%?, 52=e%?. It does not change the value of linkLag. |
| `tasks[].predecessorLinks[].type` | 判別子に読める。数の意味 | MSPDI link type code: 0=FF, 1=FS, 2=SF, 3=SS. It is an MSPDI code, not a discriminator: the object has the same fields whatever the value. |
| `calendars[].exceptions[].type` | 判別子に読める。数の意味 | MSPDI exception type code: 1=Daily, 2=Yearly by day of the month, 3=Yearly by position, 4=Monthly by day of the month, 5=Monthly by position, 6=Weekly, 7=By day count, 8=By weekday count, 9=No exception type. It is an MSPDI code, not a discriminator. |
| `resources[].type` | 判別子に読める。数の意味 | MSPDI resource type code: 0=Material, 1=Work. It is an MSPDI code, not a discriminator. |
| `tasks[].stop` | 何が止まった時か | The last date of actual progress while the task is in progress or paused (MSPDI Stop). Empty once the task is finished; actualFinish then holds the last date. |
| `tasks[].resume` | 予定か実績か | While the task is paused, the date when the remaining work is planned to start (MSPDI Resume). |
| `tasks[].resumeValid` | `is…` で始まらない真偽。何が有効か | false means the task is paused and its resume date is not decided yet (MSPDI ResumeValid). The MSPDI name is kept, so it does not start with "is". |
| `calendars[].weekDays[].dayType` | 曜日の数の始まり | MSPDI day type code: 0=Exception, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday. Sunday is 1 here but 0 in project.weekStartDay. |
| `project.weekStartDay` | 曜日の数の始まり | Start day of the week, as an MSPDI code: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Sunday is 0 here but 1 in calendars[].weekDays[].dayType. |
| `tasks[].milestone`（`baselineTasks[]` も同じ） | `is…` で始まらない真偽 | Whether the task is a milestone (MSPDI Milestone). The MSPDI name is kept, so it does not start with "is". |
| `tasks[].percentComplete` | 手で打つ値か、計算した値か | The percentage of the task duration completed, 0 to 100 (MSPDI PercentComplete). GRS derives it from dates: round(actual duration / planned duration * 100), both counted in working minutes. |

**GRS が付けた名（名は変えず、説明で補う名）:**

| キー（場所） | つまずいた所 | description の案 |
|:---|:---|:---|
| `tasks[].grs.fadeInCalendarDays`・`fadeOutCalendarDays` | 日程が動くと読める | Number of calendar days at the start (fadeIn) or the end (fadeOut) of the task bar that are drawn as a fade, to show that the date is not firm. Drawing only: start, finish and the schedule do not change. |
| `scheduleData.highestIssuedUid` | 何の数か | The highest uid issued so far, one counter shared by tasks, resources, assignments and calendars. The next new uid is this value + 1. |
| `commentBoxes[].leaderTarget` | 何を指すか | Where the comment box's leader line ends: a free point on the chart (freePoint), a point on a task (task) or a point on a highlight box (highlightBox). type selects which of the fields are present. |
| `taskGroups[].representativeTaskUid` | どちらがどちらを表すか | The uid of the WBS task that this task group stands for. When the task group has no name of its own, it shows that task's name. |

## 9. JSON の木（今の最善の案）

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
│   │   └─ utcOffset                                UTC との差（"+09:00" の形。標準時の行だけ）（fixed）
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ utcOffset                                UTC との差（"+09:00" の形）
│   │   └─ zoneNameType                             出すゾーンの名の種類（standard・daylight）。差 utcOffset はもう夏時間の分を含む
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
│   ├─ taskStackDirection                           帯の中でタスクを積む向き（bottomToTop・topToBottom）
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ themeHue （仮）                              テーマの色相の名（blue・blueGreen・green・yellowGreen・yellow・orange・red・redPurple・purple・indigo）（Project から移す。置き場は問 6-13-4）
│   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ taskGroupRootTreeState                       タスクグループの木の根の状態（auto・collapsed）
│   ├─ pinnedTaskGroupIds[]                         ピン止めした帯の id
│   ├─ delayDiagnosticsToleranceWorkingDays （仮）  遅延診断が親タスクの進み具合に許す幅（稼働日）（Project から移す。置き場は問 6-13-4）
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
│   │   │   │   └─ importOrigin                     取り込み元の控え（取り込んだタスクだけ）
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
│       │   └─ utcOffset                            UTC との差（"+09:00" の形。標準時の行だけ）
│       ├─ sourceFormat                             元の形式（grs・mspdi12・mspdi15）
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
│       │   ├─ representativeTaskUid                この帯を代表する WBS のタスク
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
│       └─ name                                     AI が名乗った名（agent のときだけ。user・template では書かない）
└─ changeLogEntries[]                               変更履歴
    ├─ changedAt                                    変更の時（UTC）
    ├─ changedBy                                    変更した者
    │   ├─ writerType                               user・agent（GRS が自動で書く。判別子ではない）
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
│   │   └─ isCalculatedFromOppositeColor            GRS が反対の側の色から計算して作った側だけ true（人が選んだ側は書かない）
│   └─ dark                                         暗いテーマの側（custom。形は light）
├─ LaneColor                                        Color から ink を除く
├─ TaskTableWindow                                  タスクの表の見せ方（検索ウィンドウ・遅延診断レポート）
│   ├─ isScheduleFilterApplied                      表でチェックしたタスクだけを描くか
│   ├─ checkedTaskUids[] （仮）                     チェックしたタスク
│   ├─ columnFilters[]                              列のフィルタ → ColumnFilter
│   └─ columnSort                                   並べ替えの列と向き → ColumnSort
├─ ResourceTableWindow                              担当の表の見せ方（担当リスト）
│   ├─ isScheduleFilterApplied                      表のチェックでチャートを絞るか
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

## 10. 実例（全部の部分を 1 度ずつ使った小さな文書）

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
      "utcOffset": "+09:00"
    },
    "displayTimeZones": [
      {
        "utcOffset": "+00:00",
        "zoneNameType": "standard"
      },
      {
        "utcOffset": "-04:00",
        "zoneNameType": "daylight"
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
    "taskStackDirection": "bottomToTop",
    "isThemeMonochrome": false,
    "themeHue": "blue",
    "taskGroupPanelWidthPx": 160,
    "isTaskGroupPanelWidthFixed": false,
    "taskGroupRootTreeState": "auto",
    "pinnedTaskGroupIds": [
      "db19099a-0302-418d-82e1-e95c7a6a093c"
    ],
    "delayDiagnosticsToleranceWorkingDays": 1,
    "tableWindows": {
      "searchWindow": {
        "isScheduleFilterApplied": true,
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
        "isScheduleFilterApplied": false,
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
        "isScheduleFilterApplied": false,
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
      "statusDate": "2026-12-04T17:00:00",
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
          "taskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceUid": 11,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportNumber": 1
          }
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
          "importOrigin": {
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
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceUid": 13,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportNumber": 1
          }
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
          "Work": "PT20H0M0S"
        }
      }
    ],
    "scheduleDataTimeZone": {
      "utcOffset": "+09:00"
    },
    "sourceFormat": "mspdi15",
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
        "representativeTaskUid": 1,
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
              "dark": { "hexColor": "#e6edf3", "isCalculatedFromOppositeColor": true }
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
      "changedBy": { "writerType": "user", "name": "Manager A" },
      "affectedArea": "tasks",
      "changeDescription": "Imported the plan from the MSPDI file.",
      "reason": "Start tracking the work package.",
      "remarks": "First import."
    },
    {
      "changedAt": "2026-12-03T05:10:00Z",
      "changedBy": { "writerType": "agent", "name": "planning-assistant" },
      "affectedArea": "Prepare draft",
      "changeDescription": "Recorded a stop on Dec 2 and a resume on Dec 3.",
      "reason": "Work paused for half a day."
    }
  ]
}
```

## 11. 答えの型（この型のまま、1 つのコードブロックに書く）

書き方の決まり:

- 答えは日本語で書く。ただし `description` の案は英語で書く（JSON Schema にそのまま載せる文として）。
- 答えの全部を、1 つのコードブロック（```text で始めて ``` で閉じる）の中に書く。コードブロックの外には何も書かない。ブロックの中で、もう 1 つコードブロックを開かない。
- 見出し（[1]〜[7]）は、この型のまま使う。表はブロックの中に、この型の列のまま書く。
- 挙げる物が無い部分には「なし」と書く。
- 指摘は 1 節の 3 つの区分に分ける: 名か形を変える物は [2]、説明の文で足りる物は [3]、実例の誤りは [4]。同じ指摘を 2 か所に書かない。
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

[2] (a) 名か形を変えないと読み違える所（[M] でない名だけ。重い順、最大 10。説明の文で足りる物は [3] へ）
| # | キー（場所） | 区分（名を変える・形を変える） | 最初の読み | こちらの意図と思うもの | 直す名か形 |

[3] (b) 説明の文で足りる所
[3-1] 8 節の説明の案で、迷いが消えるか
| キー | 消えるか（○・△・×） | 残る迷い | 直した案（英語、1〜2 文。○なら空） |
| hyperlink | | | |
| hyperlinkAddress | | | |
| linkLag | | | |
| lagFormat | | | |
| predecessorLinks[].type | | | |
| exceptions[].type | | | |
| resources[].type | | | |
| stop | | | |
| resume | | | |
| resumeValid | | | |
| dayType | | | |
| weekStartDay | | | |
| milestone | | | |
| percentComplete | | | |
| fadeInCalendarDays・fadeOutCalendarDays | | | |
| highestIssuedUid | | | |
| leaderTarget | | | |
| representativeTaskUid | | | |
[3-2] 8 節に無いが、説明が要るキー（[M] の名も GRS の名も。重い順、最大 10）
| # | キー（場所） | 読む人がつまずく訳 | description の案（英語、1〜2 文） |

[4] (c) 木（9 節）と実例（10 節）の食い違い、実例の誤り
- （箇条書き）

[5] 決まり（5 節・6 節）の分かりにくい所・ぶつかる所・足りない所・優先の順が違う所
- （箇条書き）

[6] 3 回目の指摘（7 節）は本当に直ったか
| 指摘 | 直ったか（○・△・×） | 残る問題 |

[7] 「一目で意図が伝わるか」の点数（10 点満点）と、一番先に直すべき 1 点
- 点数:
- 一番先に直すべき 1 点:
- その区分（名を変える・形を変える・説明を足す・実例を直す）:
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。コードブロックの外には何も書かないでください。**
