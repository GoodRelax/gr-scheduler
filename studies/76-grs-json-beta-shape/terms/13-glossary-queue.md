# 名の辞書 —— 出す前の問い（2026-11-15 から）

BGQA2 を約束の面ごとに分けたとき（`JDG-3568`）、まだ出していない問いをここに置いた。利用者はこのファイルを直接は読まない。席は、出す冊（BGQA3〜5）へ 10 問前後ずつ移し、移した問いをここから消す。
2026-10-31 版の古い下書き（Part 7〜13）は、2026-11-13 の巡で作り直して BGQA2 に載せ、その後ここへ移したので、もう残っていない。

## BGQA3 GRS JSON（3 回目以降）（19 問）

### [task] タスクと依存


### [tg] タスクグループ

#### ❓ 問 6-9-7. `hidden` とピン止め

ほかの 11 語は、あなたの答えで確定しました（`JDG-3554`）。表のあなたの問い（★）に答えます: ピン止めは `treeState` と別の値で、文書の設定がピン止めしたタスクグループの id の並びとして持ちます（仕様書の設定の表の `S-126`）。タスクグループを消すと、GRS はそのピン止めも消します（`CD-2`）。`hidden` とピン止めを両方持つタスクグループをどう見せるかは、GRWB の議論の後でこの問いに案を書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
| :-------- | :-------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- |
| 9-26 | &emsp;+- `hidden`（持ち主 `treeState`） |  | GRS はこのタスクグループをタスクグループパネルから隠す。 ★ピン止めはどう管理するの？ | 無し |

回答:

### [key] 共通のキー


#### ❓ 問 6-7-0. 共通のキーの 10 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 7-5 | <span style="color: #0550AE">`PassthroughValues`</span> |  | 持ち越した MSPDI の値。MSPDI の名前を鍵にして持つ。（`JDG-3343`） | 無し |
| 7-10 | <span style="color: #0550AE">`PassthroughElement`</span> |  | 持ち越した 1 つの MSPDI の要素。GRS はまるごと持ち、同じ所へ書き戻す。（`JDG-3343`） | 無し |
| 7-7 | `name`（持ち主 `PassthroughElement`） |  | MSPDI のファイルのとおりに綴った要素の名前。 | 無し |
| 7-8 | `fields` |  | この要素の子のうち、文字だけを持つ子要素の値を、要素の名前ごとに持つ。ほかの要素を含む子要素は children に入る。 | 無し |
| 7-9 | `children` |  | この要素の中に入れ子になった子要素。 | 無し |
| 7-11 | <span style="color: #0550AE">`passthroughValues`</span> |  | この要素の、持ち越した MSPDI の値。MSPDI の名前のまま持つ。（`JDG-3343`） | 無し |
| 7-12 | <span style="color: #0550AE">`passthroughElements`</span> |  | この要素の下にある、持ち越した MSPDI の要素。GRS はそれぞれを同じ所へ書き戻す。（`JDG-3343`） | 無し |
| 7-15 | `name` |  | この実体の名前。MSPDI に Name があるものは、それと同じ。（`JDG-3561`） | Name（MSPDI に名のある実体だけ） |
| 7-18 | `taskUid` |  | この実体が扱うタスクの uid。`taskStyles` の 1 つ・TaskGroupMember・線先がこのキーを持つ。（`JDG-3556`・`JDG-3561`） | TaskUID（割当だけ） |
| 7-19 | `taskGroupId` |  | この実体が扱うタスクグループの id。（`JDG-3561`） | 無し |

回答:

### [shape] タスクの形

#### ❓ 問 6-9-1. 両端に点のある細い線の名 —— `endpointSpan` を形の名にするか

場面: マイルストーンでないタスクは、4 つの形（`taskShape` の値）から 1 つを選びます。兄弟の 3 つ（`rectangle`・`chevron`・`arrow`）は形の名で、`endpointSpan` だけが形の説明です。画面の絵は `*----*` です。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-36 | &emsp;+- `endpointSpan`（持ち主 `taskShape`） |  | 端点スパン: 両端に点のある細い線。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `dumbbell`（ダンベル）。2 つの点を線で結ぶ形の名で、データの図の世界は同じ形の図を dumbbell chart と呼ぶ。兄弟と同じく形の名になる |
| b | `endpointSpan`（端点スパン）のまま。端の点と幅という中身を、名が直に言う |
| c | `dotLine`（点付き線）。字のとおりの短い形の説明 |

回答:

#### ❓ 問 6-10-2. マイルストーンの 15 の形の名 —— 値・アイコン・日本語の名を 1 つにそろえるか

場面: マイルストーンは 15 の形（`milestoneShape` の値）から 1 つを選びます。1 つの形が 3 つの名を持ちます: GRS JSON の値、パレットのアイコンの名、仕様書の日本語の名。2 つの値（`person`・`smile`）は、アイコンの名と違う物を言います。6 つの日本語の名は記号（〇・◇ など）です。

| # | 値（GRS JSON） | アイコンの名 | 今の日本語の名 | 席の案（値 / 日本語） |
|:---|:---|:---|:---|:---|
| 10-2 | `circle` | `milestoneCircleIcon` | 〇 | `circle` / 円 |
| 10-3 | `hexagon` | `milestoneHexagonIcon` | 六角形 | `hexagon` / 六角形 |
| 10-4 | `pentagon` | `milestonePentagonIcon` | 五角形 | `pentagon` / 五角形 |
| 10-5 | `diamond` | `milestoneDiamondIcon` | ◇ | `diamond` / ひし形 |
| 10-6 | `square` | `milestoneSquareIcon` | □ | `square` / 正方形 |
| 10-7 | `star` | `milestoneStarIcon` | ☆ | `star` / 星 |
| 10-8 | `triangleUp` | `milestoneTriangleUpIcon` | △ | `triangleUp` / 上向き三角 |
| 10-9 | `triangleDown` | `milestoneTriangleDownIcon` | ▽ | `triangleDown` / 下向き三角 |
| 10-10 | `file` | `milestoneFileIcon` | ファイル | `file` / ファイル |
| 10-11 | `box` | `milestoneBoxIcon` | ボックス | `box` / 箱 |
| 10-12 | `floppyDisk` | `milestoneFloppyDiskIcon` | フロッピー | `floppyDisk` / フロッピーディスク |
| 10-13 | `cylinder` | `milestoneCylinderIcon` | 円筒 | `cylinder` / 円筒 |
| 10-14 | `person` | `milestoneMeetingPeopleIcon` | 会議の人 | `meetingPeople` / 会議の人 |
| 10-15 | `smile` | `milestoneSmilingFaceIcon` | 嬉しい顔 | `smilingFace` / 笑顔 |
| 10-16 | `beerMug` | `milestoneBeerMugIcon` | ビールジョッキ | `beerMug` / ビールジョッキ |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 席の案にそろえる。1 つの形に、描く物の名詞を 1 つ当てる（`OKPN`）。値 `person` は `meetingPeople`、`smile` は `smilingFace` に改め、アイコンの名と同じ物を言う。日本語の名は記号を言葉にする |
| b | 値は席の案にし、日本語の名は今のまま（記号を残す）。記号は画面のアイコンの形そのもので、人がすぐ照らせる |
| c | 今のまま |

回答:

#### ❓ 問 6-9-0. タスクの形の 5 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-32 | <span style="color: #0550AE">`taskShape`</span> |  | マイルストーンでないタスクのタスク図形の形。Task.milestone が真でないときだけあり、マイルストーンは代わりに milestoneShape を持つ。taskStyles の style が持つ。（`JDG-3311`・`JDG-3556`） | 無し |
| 9-33 | &emsp;+- `rectangle`（持ち主 `taskShape`） |  | 矩形: ふつうのバー。 | 無し |
| 9-34 | &emsp;+- `chevron`（持ち主 `taskShape`） |  | <span style="color: #0550AE">矢羽根</span>: 始まりに切り欠きがあり、終わりが尖ったバー。（`JDG-3494`） | 無し |
| 9-35 | &emsp;+- `arrow`（持ち主 `taskShape`） |  | 矢印: 終わりに矢じりのある細い線。 | 無し |
| 10-1 | <span style="color: #0550AE">`milestoneShape`</span> |  | マイルストーンマークの形。Task.milestone が真のときだけある。taskStyles の style が持つ。（`JDG-3311`・`JDG-3556`） | 無し |

回答:

### [style] タスクの描き方

#### ❓ 問 6-10-5. タスクの見た目の型の名 —— 配列の 1 つと `style` の型を何と呼ぶか

場面: `JDG-3556` は、タスクの見た目を `scheduleData.taskStyles[]`（`{ taskUid, style }`）に置くと決めました。配列の名 `taskStyles` は決まりました。配列の 1 つ（1 つのタスクとその見た目の組）の型の名と、`style` の値の型の名が残ります。辞書は前の形の 2 語を持ちます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-17 | <span style="color: #0550AE">`TaskGraphicStyle`</span> |  | GRS がタスクのタスク図形をどう描くか。形、色、バーの輪郭の太さ。どのタスクもちょうど 1 つの TaskGraphicStyle を持つ。（`JDG-3384`） | 無し |
| 13-28 | <span style="color: #0550AE">`taskStyles`</span>（前の名 `taskGraphicStyles`） |  | 各タスクの見た目。タスクごとにちょうど 1 つ、taskUid と style の組を持つ。Task は日程のデータを持ち、見た目はここが持つ。（`JDG-3556`） | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 配列の 1 つを `TaskStyle`（1 つのタスクとその見た目の組）、`style` の型を `TaskGraphicStyle`（タスク図形の描き方: 形・塗り・線。`JDG-3384` の意味のまま）と呼ぶ。配列 `taskStyles` と 1 つの名 `TaskStyle` がそろう。コメントボックスとハイライトボックスの `style` の型の名は、色の問い 6-6-4-11 の答えに従う |
| b | 配列の 1 つを `TaskStyleEntry`、`style` の型を `TaskStyle` と呼ぶ。Entry は入れ物の役目だけを言う。`TaskGraphicStyle` の名は消える |
| c | 配列の 1 つを `TaskGraphicStyle`（今の名）と呼び、`style` の型をどの物にも共通の `Style` にする。色の問い 6-6-4-11 の案 b（形を共にする）を前に置く |

回答:

### [origin] 取り込み元

#### ❓ 問 6-10-6. 取り込み元の 2 つの番号 —— 何の uid かを名に書くか

場面: TaskOrigin は、取り込んだタスクの出どころを持ちます。`sourceProjectId` は元の MSPDI のファイルの Project/UID を持ちます。`JDG-3557` は Project の `id` を `uid` に改めました。`sourceUid` は元のファイルでのタスクの UID を持ちますが、名は何の uid かを言いません（`JDG-820`: 名は指す先を言う）。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-18 | <span style="color: #0550AE">`sourceProjectId`</span> |  | GRS がこのタスクを取り込んだ元の MSPDI のファイルの Project/UID。そのファイルが持っていなければ無い。（`JDG-2683`） | 無し |
| 10-19 | `sourceUid` |  | GRS がタスクを取り込んだ元の MSPDI のファイルでの、そのタスクの UID。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `sourceProjectUid`（元のファイルの Project の uid）と `sourceTaskUid`（元のファイルでのタスクの uid）にする。`uid` と `id` の使い分け（`JDG-3557`）に合い、2 つの名が指す先を言う。`importSessionId` の意味の文の `sourceProjectId` も直す |
| b | `sourceProjectUid` だけに改め、`sourceUid` は今のまま。持ち主 TaskOrigin が 1 つのタスクの記録なので、タスクの uid と読める |
| c | 2 つとも今のまま |

回答:

#### ❓ 問 6-10-0. 取り込み元の 4 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-22 | `TaskOrigin` |  | 取り込んだタスクがどこから来たか。同じ MSPDI のファイルを再び取り込んだとき、写しを足さずにそのタスクを更新するために持つ。 | 無し |
| 10-20 | `importSessionId` |  | タスクを持ち込んだ取り込みの id。取り込みのたびに新しく作る。MSPDI のファイルに Project/UID が無いときは、この id が sourceProjectId の代わりになる（字は問 6-10-6 に従う）。 | 無し |
| 10-21 | <span style="color: #0550AE">`lastSeenMspdiImportNumber`</span>（前の名 `lastSeenImportNumber`） |  | 取り込んだ MSPDI のファイルの中にこのタスクを見つけた、最後の取り込みの project.lastMspdiImportNumber。（`JDG-3556`） | 無し |
| 13-29 | `taskOrigins` |  | 取り込んだ MSPDI のファイルから来たタスクごとの 1 つの記録。どの MSPDI のファイルの、そのファイルのどのタスクか。後で同じ MSPDI のファイルを取り込んだとき、写しを足さずにそのタスクを更新するために持つ。GRS で作ったタスクは記録を持たない。 | 無し |

回答:

### [base] 前回予定

#### ❓ 問 6-10-3. 前回予定の 4 語 —— 「前の予定」「変更前予定輪郭」を「前回予定」にそろえるか

場面: `JDG-3434` は `baseline` を「前回予定」と呼ぶと決めました。この 4 語の意味と日本語の名は、まだ「前の予定」「変更前予定輪郭」「変更前の予定」と書きます。「変更前予定輪郭」は画面の語 `baselineOutline` の名です（`JDG-3373`。`JDG-3434` より前の裁定）。輪郭は、前回予定の位置を予定バーに重ねて示す線です。

| # | キー | 日本語の名 | 直した意味の案 | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-23 | `uid`（持ち主 `BaselineTask`） |  | 前回予定でのタスクの uid。GRS は同じ uid を持つ今のタスクと突き合わせる。 | 無し |
| 10-24 | `BaselineTask` |  | 前回予定の 1 つのタスク。GRS は uid で今のタスクと突き合わせ、今のタスクの上に前回予定輪郭としてだけ描く。 | 無し |
| 13-30 | `baselineTasks` |  | 前回予定。前回予定のタスクの日時を保存した写し。GRS は uid で写しを今のタスクと突き合わせ、比べるために今のタスクの上に前回予定輪郭として描く。 | 無し |
| 12-33 | <span style="color: #0550AE">`isBaselineOutlineVisible`</span> | 前回予定を重ねるか | GRS が前回予定（baselineTasks）を今のタスクに重ねて描くかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`・`JDG-3434`） | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 意味を「前回予定」「前回予定輪郭」にそろえ、設定の欄の名を「前回予定を重ねるか」にする。画面の語 `baselineOutline` の名も、画面の語のパートで「前回予定輪郭」にする案を出す |
| b | 「前回予定」だけを直す。「変更前予定輪郭」は画面の語のパートで問う |
| c | 今のまま |

回答:

### [note] 注記

#### ❓ 問 6-10-1. 線先が吸着する部分の値 —— 画面の名にそろえるか

場面: コメントボックスの線先をタスクに吸着させたとき、`graphicPart` がタスク図形のどの部分かを言います。画面の語は Plan Bar・Actual Bar・Milestone Mark（`JDG-3348`・`JDG-3372`）で、表示のキーも `isPlanBarVisible` です（`JDG-3382`）。値 `plannedBar` だけが planned と綴ります。値 `milestone` は、タスクの真偽のキー `milestone`（7-22）と同じ綴りで別の物を指します（`OMPV`）。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-28 | <span style="color: #0550AE">`graphicPart`</span> |  | 線先が吸着するタスク図形の部分。予定バー、実績バー、マイルストーンマークのどれか。（`JDG-3381`） | 無し |
| 10-29 | &emsp;+- `plannedBar`（持ち主 `graphicPart`） |  | タスクの予定バー。 | 無し |
| 10-30 | &emsp;+- `actualBar`（持ち主 `graphicPart`） |  | タスクの実績バー。 | 無し |
| 10-31 | &emsp;+- `milestone`（持ち主 `graphicPart`） |  | タスクのマイルストーンマーク。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 値を `planBar`・`actualBar`・`milestoneMark` にする。画面の語のキーと同じ名で、1 つの物を 1 つの名で呼ぶ（`OKPN`）。Agent API の命令の引数の値も同じ名にそろう（`JDG-3410`） |
| b | 今のまま |

回答:

#### ❓ 問 6-10-4. 線先の時点と点の名 —— `dateTime` と `point`

場面: 自由な点の線先は、時点 `dateTime` に立ちます。吸着した線先は、対象の 8 つの点のどれか `point` に付きます。`dateTime` は型 `DateTime` と同じ綴りです。`point` だけでは、何の点かを名が言いません。2 つとも前の席が付けた名で、裁定の行は 0 です。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-27 | `dateTime` |  | 時間軸の上で線先が立つ時点。 | 無し |
| 10-32 | `point` |  | 線先が吸着する、対象の 8 つの点のどれか。4 つの角と、4 つの辺の中点。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `dateTime` を保ち、`point` を `snapPoint`（線先が吸着する点）にする。名が「吸着の点」を言う（`NEIM`）。8 つの値の持ち主も `snapPoint` になる |
| b | `point` を `targetPoint`（線先の対象の上の点）にする。`leaderTarget`（`JDG-3556`）と語がそろう |
| c | 2 つとも今のまま |

回答:

#### ❓ 問 6-11-0. 注記の 29 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。`fallback` と `LeaderAnchorFallback` は、`JDG-3547` で消えるので表に載せません。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-11 | <span style="color: #0550AE">`leaderTarget`</span>（前の名 `leaderAnchor`） |  | コメントボックスの引出し線が指す所。タスクグループレーンの中の自由な点か、引出し線が吸着したタスクやハイライトボックスの点。吸着した対象を消す命令の中で、GRS は線先を自由な点に書き換える。（`JDG-3547`・`JDG-3556`） | 無し |
| 11-7 | `LeaderTarget`（前の名 `LeaderAnchor`） |  | コメントボックスの引出し線が指す所の型。type で、自由な点・タスク・ハイライトボックスのどれかを選ぶ。名はキー leaderTarget にそろえる（`JDG-3556`）。 | 無し |
| 11-3 | <span style="color: #0550AE">`type`</span>（持ち主 `LeaderTarget`） |  | freePoint・task・highlightBox のどれか。値で、線先が持つ欄の組が変わる。（`JDG-3563`） | 無し |
| 11-4 | &emsp;+- `freePoint`（持ち主 `LeaderTarget`） |  | タスクグループレーンの中の、何にも吸着しない点。時点・タスクグループ・レーンの中の高さで場所を決める。 | 無し |
| 11-5 | &emsp;+- `task`（持ち主 `LeaderTarget`） |  | タスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか。 | 無し |
| 11-6 | &emsp;+- `highlightBox`（持ち主 `LeaderTarget`） |  | ハイライトボックスの 8 つの点のどれか。 | 無し |
| 10-25 | <span style="color: #0550AE">`laneTopOffsetPercent`</span>（前の名 `laneFraction`） |  | 自由な点の線先が、そのタスクグループレーンの上の縁からどれだけ下にあるか。レーンの高さに対するパーセントで、0 は上の縁、100 は下の縁（CSS の top と同じ向き）。（`JDG-3529`・`JDG-3556`） | 無し |
| 11-2 | <span style="color: #0550AE">`highlightBoxId`</span> |  | 線先が吸着するハイライトボックスの id。（`JDG-2685`） | 無し |
| 10-33 | &emsp;+- `topLeftCorner`（持ち主 `point`。字は問 6-10-4 に従う） |  | 左上の角。 | 無し |
| 10-34 | &emsp;+- `topMiddle`（持ち主 `point`） |  | 上の辺の中点。 | 無し |
| 10-35 | &emsp;+- `topRightCorner`（持ち主 `point`） |  | 右上の角。 | 無し |
| 10-36 | &emsp;+- `rightMiddle`（持ち主 `point`） |  | 右の辺の中点。 | 無し |
| 10-37 | &emsp;+- `bottomRightCorner`（持ち主 `point`） |  | 右下の角。 | 無し |
| 10-38 | &emsp;+- `bottomMiddle`（持ち主 `point`） |  | 下の辺の中点。 | 無し |
| 10-39 | &emsp;+- `bottomLeftCorner`（持ち主 `point`） |  | 左下の角。 | 無し |
| 10-40 | &emsp;+- `leftMiddle`（持ち主 `point`） |  | 左の辺の中点。 | 無し |
| 11-15 | <span style="color: #0550AE">`CommentBox`</span> |  | 1 つのコメントボックス。線先は、自由な点（時点・タスクグループ・そのタスクグループレーンの中の高さ）か、吸着したタスクやハイライトボックスの 8 つの点のどれかに立つ。（`JDG-3371`） | 無し |
| 11-12 | `text`（持ち主 `CommentBox`） |  | コメントボックスの文。無ければ本文は空。 | 無し |
| 11-13 | `textColor` |  | コメントボックスの文字の色。style の中に置く。（`JDG-3556`） | 無し |
| 11-14 | `fontSizePx` |  | コメントボックスの文字の大きさ。displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent で拡大縮小し、ズームでは変わらない。箱を置くときは 10 を書く。style の中に置く。（`JDG-3556`） | 無し |
| 11-10 | `bodyOffsetPx` |  | 線先から、コメントボックスの本文の箱の左下の角までのずれ。displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent で拡大縮小し、ズームでは変わらない。 | 無し |
| 11-8 | `dx` |  | bodyOffsetPx の横の成分。正の値は箱を右へ動かす。 | 無し |
| 11-9 | `dy` |  | bodyOffsetPx の縦の成分。画面と同じく、正の値は箱を下へ動かす。 | 無し |
| 13-31 | `commentBoxes` |  | タスクグループレーンの中のコメントボックス。各コメントボックスは、タスク・ハイライトボックス・自由な点のどれかを指す。 | 無し |
| 11-19 | `HighlightBox` |  | 1 つのハイライトボックス。日付の範囲とタスクグループの範囲を囲む。 | 無し |
| 11-16 | <span style="color: #0550AE">`firstTaskGroupId`</span>（前の名 `topTaskGroupId`） |  | 箱が覆うタスクグループの範囲の最初のタスクグループ（含む）。順は、タスクグループの木の中の順位で決める。（`JDG-3528`） | 無し |
| 11-17 | <span style="color: #0550AE">`lastTaskGroupId`</span>（前の名 `bottomTaskGroupId`） |  | 箱が覆うタスクグループの範囲の最後のタスクグループ（含む）。（`JDG-3528`） | 無し |
| 11-18 | `cornerRadiusPx` |  | ハイライトボックスの角の丸みの半径。displayScalePercent が 100 のときの CSS ピクセルで表し、0 は四角い角。displayScalePercent で拡大縮小し、ズームでは変わらない。箱を置くときは 4 を書く。style の中に置く。（`JDG-3556`） | 無し |
| 13-32 | `highlightBoxes` |  | ハイライトボックス。タスクグループレーンの中で、日の範囲とタスクグループの範囲を示す矩形。GRS は各ハイライトボックスを枠か塗りか両方で描く。 | 無し |

回答:

### [stamp] 文書の刻印と変更ログ

#### ❓ 問 6-11-5. 最後に書いた者 —— `lastEditedBy` と型 `Writer` の動詞をそろえるか

場面: 文書の刻印は、スケジュール文書を最後に書いた者を `lastEditedBy` に持ちます。その値の型は `Writer` で、GRS の画面で操作する人・同梱の起動時のテンプレート・Agent API の呼び手のどれかです。キーは「編集した」と言い、型は「書いた」と言います。テンプレートは文書を編集せず、文書の中身を初めに書きます。辞書の意味の文は「最後に書いた者」と言います。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-28 | `Writer` |  | 書いた者。GRS の画面で操作する人、同梱の起動時のテンプレート、Agent API の呼び手のどれか。 | 無し |
| 11-29 | `lastEditedBy` |  | スケジュール文書を最後に書いた者。GRS の画面で操作する人は {"type":"user"}、同梱の起動時のテンプレートは {"type":"template"}、Agent API の呼び手は {"type":"agent","name":...}。（`JDG-3563`） | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `lastWrittenBy`（スケジュール文書を最後に書いた者）と型 `Writer` で、動詞を「書く」にそろえる。3 つの書き手のどれにも当たる。Agent API の刻印と変更の通知の同じ欄も同じ名にする（`JDG-3410`） |
| b | `lastEditedBy` と型 `Editor`（最後に編集した者）にする。「最後に編集した者」は広く使う言い方で、テンプレートも編集者の 1 つと読む |
| c | 今のまま（`lastEditedBy` と `Writer`） |

回答:

#### ❓ 問 6-11-4. 文書の刻印と変更ログの 15 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。「刻印」「変更ログ」の字は、問 6-11-1 の答えに従って直します。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-30 | `DocumentStamp` |  | スケジュール文書が最後に変わった時、GRS が最後に保存した時、最後に書いた者。Agent API の書き込みで照らす刻印と同じ物。（`JDG-3333`） | 無し |
| 11-20 | <span style="color: #0550AE">`scheduleDataUpdatedAt`</span> |  | スケジュールデータが最後に変わった時。watchChanges はこの時刻だけを見る。（`JDG-3380`） | 無し |
| 11-21 | `documentUpdatedAt` |  | スケジュール文書が、スケジュールデータか documentSettings で最後に変わった時。 | 無し |
| 11-22 | `fileSavedAt` |  | GRS がスケジュール文書を最後に保存した時（UTC）。初めて保存するまでは無い。 | 無し |
| 11-23 | <span style="color: #0550AE">`type`</span>（持ち主 `Writer`） |  | user・template・agent のどれか。値で Writer の欄の組が変わり、agent だけが name を持つ。（`JDG-3563`） | 無し |
| 11-24 | &emsp;+- <span style="color: #0550AE">`user`</span>（持ち主 `Writer`） |  | GRS の画面で操作する人。（`JDG-3275`） | 無し |
| 11-25 | &emsp;+- `template`（持ち主 `Writer`） |  | 同梱の起動時のテンプレート。 | 無し |
| 11-26 | &emsp;+- `agent`（持ち主 `Writer`） |  | Agent API の呼び手。 | 無し |
| 11-27 | `name`（持ち主 `Writer`） |  | Agent API の呼び手が自分に付けた名前。 | 無し |
| 11-37 | `ChangeLogEntry` |  | スケジュール文書への 1 つの変更についての記録。いつ、誰が、どの部分を、何を、なぜ、そのほか。 | 無し |
| 11-31 | <span style="color: #0550AE">`changedAt`</span> |  | 変更が起きた時（UTC）。GRS は記録を足した時刻を入れ、人はその時刻を変えてよい。（`JDG-3332`） | 無し |
| 11-32 | <span style="color: #0550AE">`changedBy`</span> |  | 変更をした者。人が打った名前か、AI が自分に付けた名前。（`JDG-3332`） | 無し |
| 11-33 | <span style="color: #0550AE">`affectedArea`</span> |  | 変更がスケジュール文書のどの部分に及んだか。（`JDG-3332`） | 無し |
| 11-34 | <span style="color: #0550AE">`changeDescription`</span> |  | 何が変わったか。（`JDG-3332`） | 無し |
| 11-35 | <span style="color: #0550AE">`reason`</span>（持ち主 `ChangeLogEntry`） |  | 変更の理由。（`JDG-3332`） | 無し |

回答:

### [set] 文書の設定

#### ❓ 問 6-12-1. 設定の欄の名が、後の裁定に追いついていない 9 語 —— 案の名に直すか

場面: 辞書の日本語の名は、設定の欄の名（画面の語）を写します（`JDG-3518`）。下の 9 つの名は、その後の裁定と食い違います。

| # | キー | 今の名（日本語 / 英語） | 案 | 根拠 |
|:---|:---|:---|:---|:---|
| 12-35 | <span style="color: #0550AE">`isProgressMarkVisible`</span> | 進捗マーカー / Progress Marker | 進捗マーク / Progress Mark | `JDG-3372`（「マーカー」と書かない） |
| 12-17 | <span style="color: #0550AE">`fitSpan`</span> | 全体表示時の期間 / Fit Span | 全体表示期間 / Fit Span | `JDG-3376` |
| 12-16 | `isFixed`（持ち主 `fitSpan`） | 全体表示時の期間を固定する / Fix the fit span | 全体表示期間を固定する / Fix the fit span | `JDG-3376` |
| 12-29 | <span style="color: #0550AE">`isPlanBarVisible`</span> | 予定の表示 / Plan | 予定バー / Plan Bar | キーは Plan Bar（`JDG-3382`）。ほかの欄（依存線・担当ラベル）も描く物の名 |
| 12-31 | <span style="color: #0550AE">`isActualBarVisible`</span> | 実績の表示 / Actual | 実績バー / Actual Bar | 同じ |
| 12-5 | <span style="color: #0550AE">`dayWidthPx`</span> | 横のズーム倍率 / Horizontal Zoom | 1 日の幅 / Day Width | 値は倍率でなく、1 日の幅の px（`JDG-3292`） |
| 12-39 | `isGroupGridLinesVisible` | グループ罫線（TaskGroup 境界の横線） | グループ罫線（タスクグループ境界の横線） | 日本語の名が英語の型の名を含む |
| 13-10 | `pinnedTaskGroupIds` | ピン止めの対象 / Pinned Task Groups | ピン止めしたタスクグループ / Pinned Task Groups | 画面の語 `pinnedTaskGroup`（`U-46`）と同じ名 |
| 12-22 | <span style="color: #0550AE">`viewTimeZone`</span> | 本プロジェクトの基準タイムゾーン / Project Base Time Zone | 表示の基準タイムゾーン / Display Base Time Zone | キーは見せる時計。スケジュールデータの時計は `scheduleDataTimeZone` で、別の物 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の案で直し、`display-words.json` の名と辞書の名を同じ字にそろえる（`CR-857`）。9 つのキーの意味の文は今のまま |
| b | 行ごとに直す所を書く |
| c | 今のまま（画面の語のパートで問い直す） |

回答:

#### ❓ 問 6-12-2. 開いた時の位置の 5 語 —— `…Fraction` の 2 つを何という `…Percent` にするか

場面: `scrollPosition` は、スケジュール文書を開いたときにビューがどこから始まるかを持ちます。`JDG-3529` は、割合の値を `…Percent`（0〜100）で書くと決め、ここの 2 つの `…Fraction` も直すと決めました。新しい名は未定です。`JDG-3556` は、レーンの中の位置を `laneTopOffsetPercent`（上の縁からの距離を % で）と呼びました。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 12-15 | `scrollPosition` |  | スケジュール文書を開いたときにビューがどこから始まるか。notDecided は GRS に選ばせ、placed は左の端の日と上の端のタスクグループを与える。 | 無し |
| 12-11 | `leftEdgeDay` | 表示の左端が指す日付 | ビューの左の端にある日。 | 無し |
| 12-12 | `leftEdgeDayFraction` | 表示の左端が指す日のどこにあるか | 左の端が leftEdgeDay の中のどこにあるか。その日の割合で表し、0 は日の始まり。 | 無し |
| 12-13 | `topEdgeTaskGroupId` | 表示の上端が指すタスクグループ | ビューの上の端にあるタスクグループ。そのタスクグループがもう無ければ、scrollPosition は notDecided になる。 | 無し |
| 12-14 | `topEdgeTaskGroupFraction` | 表示の上端が指すタスクグループのどこにあるか | 上の端がそのタスクグループの中のどこにあるか。タスクグループの 1 段分（タスクグループレーンの高さと下の隙間）の割合で表し、0 はタスクグループレーンの上の端。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `leftEdgeDayOffsetPercent`（左の端が、その日の始まりからどれだけ右にあるか。1 日に対する %）と `topEdgeTaskGroupOffsetPercent`（上の端が、そのタスクグループの上の端からどれだけ下にあるか。1 段分に対する %）にする。`laneTopOffsetPercent` と同じ「…OffsetPercent」の形になる。ほかの 3 つは今のまま |
| b | a の 2 つに加え、`scrollPosition` を `openingViewPosition`（開いたときのビューの位置）にする。中身はスクロールの量でなく、開いたときの位置を言う |
| c | `leftEdgeDayPercent`・`topEdgeTaskGroupPercent`（`Fraction` を `Percent` に替えるだけ） |

回答:

#### ❓ 問 6-12-0. 文書の設定の 42 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。日本語の名は設定の欄の名から、折り返しの縦線を除いて写しました（`JDG-3518`・`JDG-3519`）。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-38 | <span style="color: #0550AE">`displayScalePercent`</span> | 表示の倍率 | スケジュールキャンバスの描画の表示の倍率（パーセント）。100 では、名前が Px で終わるプロパティの値をすべてその数の CSS ピクセルで描き、50 では半分の大きさで描く。形と文字を一緒に拡大縮小し、アプリヘッダー・コマンドパレット・ブラウザーのズームは変えない。（`JDG-3292`） | 無し |
| 12-1 | <span style="color: #0550AE">`fontSizeStep`</span> | 文字サイズ | スケジュールキャンバスの文字の大きさの段。small・medium・large で、displayScalePercent が 100 のとき 7.5・8.75・10 CSS ピクセル。スケジュール文書はこの段で開き、段を変えた読み手はスケジュール文書を編集したことになる。（`JDG-2682`・`JDG-3295`） | 無し |
| 12-2 | &emsp;+- <span style="color: #0550AE">`small`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 7.5 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 12-3 | &emsp;+- <span style="color: #0550AE">`medium`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 8.75 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 12-4 | &emsp;+- <span style="color: #0550AE">`large`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 10 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 12-6 | <span style="color: #0550AE">`verticalZoomRatio`</span> | 縦のズーム倍率 | タスク図形の縦の大きさの、既定の大きさに対する比。1 が既定の大きさで、2 では予定バー・実績バー・名称ラベルを 2 倍の高さで描く。（`JDG-3296`） | 無し |
| 12-8 | <span style="color: #0550AE">`type`</span>（持ち主 `scrollPosition`） |  | notDecided: まだ誰も場所を選んでおらず、GRS がスケジュール文書を開くときに選ぶ。placed: ほかのキーが場所を与える。（`JDG-3563`） | 無し |
| 12-9 | &emsp;+- <span style="color: #0550AE">`notDecided`</span>（持ち主 `scrollPosition`） |  | まだ誰も場所を選んでおらず、GRS がスケジュール文書を開くときに選ぶ。（`JDG-3302`・`JDG-3309`） | 無し |
| 12-10 | &emsp;+- `placed`（持ち主 `scrollPosition`） |  | ほかのキーが場所を与える。 | 無し |
| 12-18 | <span style="color: #0550AE">`type`</span>（持ち主 `viewTimeZone`） |  | sameAsScheduleData: スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。fixed: ここで与えたオフセットを出す。（`JDG-3563`） | 無し |
| 12-19 | &emsp;+- <span style="color: #0550AE">`sameAsScheduleData`</span>（持ち主 `viewTimeZone`） |  | スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。（`JDG-3302`） | 無し |
| 12-20 | &emsp;+- `fixed`（持ち主 `viewTimeZone`） |  | ここで与えたオフセットを出す。 | 無し |
| 12-21 | `offset`（持ち主 `viewTimeZone`） |  | GRS がスケジュールキャンバスを出す UTC オフセット。 | 無し |
| 12-27 | <span style="color: #0550AE">`displayTimeZones`</span> | 表示するタイムゾーン | 最大 4 つの追加の時計。GRS が時刻を出しているあいだ、追加の時計をそれぞれタイムルーラーの下の 1 行として出す。（`JDG-2691`） | 無し |
| 12-23 | `offset`（持ち主 `displayTimeZones`） |  | この追加の時計の UTC オフセット。 | 無し |
| 12-25 | &emsp;+- `standard`（持ち主 `season`。字は問 6-12-3 に従う） |  | そのオフセットの標準時のゾーン。 | 無し |
| 12-26 | &emsp;+- `daylight`（持ち主 `season`） |  | そのオフセットの夏時間のゾーン。 | 無し |
| 12-28 | `isTimeOfDayVisible` | 時刻を表示する | GRS がスケジュールキャンバスに時刻を出すかどうか。保存した日時はどちらでも時刻を持ち続ける。新しいスケジュール文書は偽で始まる。 | 無し |
| 12-30 | `isPlanDatesVisible` | 名称ラベルに添える予定日 | GRS が各名称ラベルの右に予定の日付を出すかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 12-32 | <span style="color: #0550AE">`isPercentCompleteLabelVisible`</span> | 完了率ラベル | GRS が各タスクの完了率ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`） | 無し |
| 12-34 | `isProgressLineVisible` | イナズマ線 | GRS がイナズマ線を描くかどうか。イナズマ線は、基準日から各タスクのタスク進捗点を通る線。新しいスケジュール文書は偽で始まる。 | 無し |
| 12-36 | <span style="color: #0550AE">`isDependencyLineVisible`</span> | 依存線 | GRS が依存線を描くかどうか。新しいスケジュール文書は真で始まる。（`JDG-3382`） | 無し |
| 12-37 | <span style="color: #0550AE">`isAssigneeLabelVisible`</span> | 担当ラベル | GRS が各タスクの担当ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`） | 無し |
| 12-38 | `isDateGridLinesVisible` | 日付罫線（日付ごとの縦線） | GRS が縦の日付罫線を描くかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 13-1 | `stackDirection` | 積む向き | up は、タスクが右上のゴールへ登るようにタスクグループのタスクを積む。down は、右下のゴールへ下るように積む。新しいスケジュール文書は up で始まる。 | 無し |
| 13-2 | &emsp;+- `up`（持ち主 `stackDirection`） |  | タスクが右上のゴールへ登るように積む。 | 無し |
| 13-3 | &emsp;+- `down`（持ち主 `stackDirection`） |  | タスクが右下のゴールへ下るように積む。 | 無し |
| 13-4 | `isThemeMonochrome` | モノクロにするか | テーマがモノクロかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 13-5 | `taskGroupPanelWidthPx` | タスクグループパネルの幅 | タスクグループパネルの幅。displayScalePercent が 100 のときの CSS ピクセルで表す。 | 無し |
| 13-6 | `isTaskGroupPanelWidthFixed` | タスクグループパネルの幅を固定する | パネル境界のドラッグではなく、taskGroupPanelWidthPx の数がタスクグループパネルの幅を決めるかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 13-8 | &emsp;+- `auto`（持ち主 `levelZeroTreeState`。字は問 6-13-1 に従う） |  | 最上位のタスクグループを描く。 | 無し |
| 13-9 | &emsp;+- `collapsed`（持ち主 `levelZeroTreeState`） |  | タスクグループを 1 つも描かない。 | 無し |
| 13-20 | <span style="color: #0550AE">`tableWindows`</span>（前の名 `tableViews`） |  | GRS が 3 つの窓の表をどう出すか。検索ウィンドウ、遅延診断レポートウィンドウ、担当リストウィンドウ。（`JDG-3544`） | 無し |
| 13-17 | <span style="color: #0550AE">`searchWindow`</span>（持ち主 `tableWindows`） |  | 検索ウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`） | 無し |
| 13-18 | <span style="color: #0550AE">`delayDiagnosisReportWindow`</span>（持ち主 `tableWindows`。前の名 `delayDiagnosticsReportWindow`） |  | 遅延診断レポートウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。名は機能の名 delayDiagnosis の派生の名にそろえる（`JDG-3512`）。`JDG-3544` の「中の名は今のまま」は、`tableWindows` の改名だけを言うと私は読んだ。（`JDG-3383`・`JDG-3512`） | 無し |
| 13-19 | <span style="color: #0550AE">`resourceListWindow`</span>（持ち主 `tableWindows`） |  | 担当リストウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`） | 無し |
| 13-11 | `isScheduleFilterApplied` |  | この表のスケジュールフィルターが掛かっているかどうか。掛かっているあいだ、GRS はこの表のチェックの入った行が選ぶタスクだけを描く。新しいスケジュール文書は偽で始まる。 | 無し |
| 13-12 | `shownTaskUids` |  | この表の表示の列にチェックが入った行のタスク。無ければどの行にもチェックは無い。 | 無し |
| 13-15 | `shownResourceUids` |  | この表の表示の列にチェックが入った行の担当。無ければどの行にもチェックは無い。 | 無し |
| 13-16 | `isUnassignedShown` |  | 担当リストウィンドウの（担当なし）の行にチェックが入っているかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 13-13 | `columnFilters` |  | この表の列のフィルタ。フィルタを掛けた列ごとに 1 つ、この表の列の名前で持つ。無ければどの列にもフィルタは無い。 | 無し |
| 13-14 | `sort` |  | GRS がこの表をどう並べるか。無ければ既定の並び。 | 無し |

回答:

### [root] スケジュールデータと文書の根

#### ❓ 問 6-13-0. スケジュールデータと文書の根の 7 語 —— 推奨の表のとおりでよいか

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 13-39 | `ScheduleDocument` | <span style="color: #0550AE">スケジュール文書</span> | スケジュール文書: 1 つの GRS JSON のファイル。根に、スキーマの所、スキーマの版、ビルドの版、文書の設定、スケジュールデータ、文書の刻印、変更ログをこの順に持つ（字は問 6-11-1 に従う）。（`JDG-3353`・`JDG-3556`） | 無し |
| 13-35 | `schemaVersion`（持ち主 `ScheduleDocument`） |  | この GRS JSON スキーマの形が最後に変わった UTC の時刻（YYYY-MM-DDTHH:MM:SSZ）。 | 無し |
| 13-36 | <span style="color: #0550AE">`buildVersion`</span> |  | この GRS JSON のファイルを書いた GRS のビルドの時刻（UTC、YYYY-MM-DDTHH:MM:SSZ）。この値は不具合を調べるためだけのもので、GRS JSON のファイルが読めるかを確かめるには schemaVersion を使う。（`JDG-3324`・`JDG-3335`） | 無し |
| 13-34 | <span style="color: #0550AE">`scheduleData`</span> | <span style="color: #0550AE">スケジュールデータ</span> | スケジュールデータ。MSPDI と往復する群（project・tasks・calendars・resources・assignments）と、GRS だけが持つ群（taskGroups・taskGroupMembers・taskStyles・commentBoxes・highlightBoxes・baselineTasks・taskOrigins）をこの順に持つ。（`JDG-3353`・`JDG-3380`・`JDG-3545`） | 無し |
| 13-23 | `tasks` |  | MSPDI の Tasks と同じ。ただし Task.parentTaskUid と Task.siblingOrder が WBS の木を与える。GRS は MSPDI を書くたびに、その木から ID・OutlineLevel・OutlineNumber・Summary を作る。 | Tasks |
| 13-26 | `taskGroups` |  | タスクグループ。GRS はそれぞれをタスクグループパネルの 1 行と 1 つのタスクグループレーンとして出す。どのタスクグループがどのタスクを持つかは taskGroupMembers が言う。MSPDI のファイルを読むとき、GRS は WBS からタスクグループを作る。 | 無し |
| 13-27 | `taskGroupMembers` |  | 各タスクがどのタスクグループに入るか。タスクごとに 1 つ、taskUid から taskGroupId への対応。 | 無し |

回答:

## BGQA4 文書の命令（15 問）

### [cmd] 文書の命令

#### ❓ 問 35-1. 日程をずらす 2 つの命令 —— 名の対と、`Date` と `Day`

場面: 2 つの命令が日程全体を動かします。`shiftScheduleTimes` は量（分）でずらし、`shiftScheduleToStartDate` は日（YYYY-MM-DD）へ動かします。後者の名は `Date` と言い、引数は `newStartDay` と言います。GRS JSON は日付だけの値を `…Day`（`firstDay`・`lastDay`）と呼びます。前者の `Times` は「時刻たち」とも「倍」とも読めます。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 35-6 | `shiftScheduleTimes` | 日程のすべての日時を minutes だけずらす。正は後へ、負は前へ。 | `shiftScheduleByMinutes` |
| 35-7 | &emsp;+- `minutes`（持ち主 `shiftScheduleTimes`） | 日程の日時をずらす量（分）。 | `minutes` |
| 35-8 | `shiftScheduleToStartDate` | 日程全体を、いちばん早いタスクの開始が newStartDay に来るように動かす。 | `shiftScheduleToStartDay` |
| 35-9 | &emsp;+- `newStartDay` | いちばん早いタスクの開始を置く日（YYYY-MM-DD）。 | `newStartDay` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 「量だけずらす」と「日へ動かす」の対にする（表の「案 a の名」の列）。引数 `minutes`・`newStartDay` は今のまま |
| b | `shiftScheduleToStartDate` だけを `shiftScheduleToStartDay` にする |
| c | 今のまま |

回答:

#### ❓ 問 35-2. 命令の形・プロジェクト・カレンダーの 7 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-1 | <span style="color: #0550AE">`type`</span>（持ち主 `DocumentCommand`） | 命令の種類 | 命令の名前。どの命令かを言う。（`JDG-3563`） | 無し |
| 35-2 | <span style="color: #0550AE">`set`</span> | 書く値 | 編集の命令が書くプロパティと、その新しい値。（`JDG-3268`） | 無し |
| 35-3 | <span style="color: #0550AE">`clear`</span> | 消す欄 | 編集の命令が取り除く、省けるプロパティ。set と clear の両方にあるプロパティは断られる。（`JDG-3268`） | 無し |
| 35-4 | `DocumentCommand` | <span style="color: #0550AE">文書の命令</span> | 値として書いた 1 つの文書の命令。種類と欄を持つ。束にして applyCommands でまとめて書く。（`JDG-3426`） | 無し |
| 35-5 | `editProject` | プロジェクトを編集する | プロジェクトを編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。statusDate が無ければ基準日線は描かない。scheduleDataTimeZone を設定しても保存した時刻は換算しない。変わるのは時刻を読むタイムゾーンだけである。 | 形は `edit<実体>`（`JDG-3268`） |
| 35-10 | `replaceCalendarRules` | カレンダーの決まりを置き換える | 暦を編集する。稼働する曜日（workingDayTypes。1 が日曜日で、並べない曜日は休み）、週の始まりの曜日（weekStartDay）、例外日（exceptions。編集の後の全部の並び）、稼働日の 1 組の時間帯（workingTimes）。省いた部分はそのまま残る。workingTimes は 1 から 5 つの時間帯を持ち、空の並びは断る。既定の時間帯に戻すには、08:00:00-12:00:00 と 13:00:00-17:00:00 の 2 つを渡す。 | 無し |
| 35-11 | &emsp;+- `workingDayTypes` | 稼働する曜日 | 稼働する曜日を dayType の数で並べたもの（1 が日曜日）。並べない曜日は休み。 | MSPDI の WeekDay/DayType の数（GRS JSON の `dayType`） |

回答:

**タスク**

#### ❓ 問 35-3. 進捗ステータスの命令 —— `PlanActual` を `progressStatus` の語にするか

場面: `JDG-3461` は、タスクの予実の状態の名を `progressStatus`（進捗ステータス）とし、「予実の状態」と `planActualState` を使わないと決めました。2 つの命令は、今も `PlanActual` の語を使います。`JDG-2684`（2026-10-17）は命令の名を今のままにし、その後の `JDG-3461`（2026-10-29）が語を決めました。引数 `place` は「場所」とも読め、中身（進捗ステータスと、それが要る実績の日時）を言いません。`remembered`（覚えた）は過去分詞で、何を覚えたかを言いません。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 35-20 | `placeTaskPlanActual` | タスク taskUid を 1 つの進捗ステータスに置く。 | `changeTaskProgressStatus` |
| 35-21 | &emsp;+- `place` | タスクを置く進捗ステータスと、その状態が要る実績の日付。 | `progressStatus` |
| 35-32 | `cycleTaskPlanActualState` | タスク taskUid の進捗ステータスを、未着手・進行中・完了・中断の輪に沿って 1 つ進める。 | `cycleTaskProgressStatus` |
| 35-33 | &emsp;+- `remembered` | 前の段が取り除いた実績。タスクが未着手を出るときに戻すために渡す。 | `removedActual` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の「案 a の名」の列にする。`place` の中の `state` は `JDG-2684` のまま。`beginTaskActual`（実績を始める）は今のまま |
| b | 命令の名だけを改める: `placeTaskInProgressStatus`・`cycleTaskProgressStatus`。`place`・`remembered` は今のまま |
| c | 今のまま |

回答:

#### ❓ 問 35-4. 写しと並べ替えの値 —— 指す物の名を書くか

場面: `JDG-2685` は、命令が運ぶ値に指す物の名を付けると決めました（`taskUid`・`commentBoxId` など）。写しと並べ替えの 5 つの値は、まだ指す物の名を欠きます。`sourceUids`・`orderedIds` は、何の uid・id かを言いません。`newTaskGroupIds`・`taskGroupIdOf` は対応表（元の uid か id から値へ）ですが、名は並びにも読めます。`landing`（着地）は比喩で、写しの置き方を言いません。タスクとタスクグループの命令にまたがるので、ここでまとめて問います。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 35-15 | &emsp;+- `sourceUids`（持ち主 `pasteTasks`） | 写すタスクの uid（1 つ以上）。 | `sourceTaskUids` |
| 35-16 | &emsp;+- `landing`（持ち主 `pasteTasks`） | 写しの置き方。Ctrl を押したドラッグのコピーだけが送る。 | `placement` |
| 35-18 | &emsp;&emsp;+- `taskGroupIdOf`（持ち主 `landing`） | 写す元のタスクの uid ごとに、写しを載せるタスクグループの id。 | `taskGroupIdBySourceTaskUid` |
| 36-24 | &emsp;+- `newTaskGroupIds`（持ち主 `pasteTaskGroupSubtree`） | 元のタスクグループの id ごとに、写しの id。 | `newTaskGroupIdBySourceId` |
| 36-26 | &emsp;+- `orderedIds`（持ち主 `reorderTaskGroupSiblings`） | 兄弟のタスクグループの id を新しい順に並べたもの。 | `orderedTaskGroupIds` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の「案 a の名」の列にする。対応表は「値 + `By` + 鍵」の形で、何から何への対応かを言う。`shiftMinutes`・`sourceTaskGroupId` は今のまま |
| b | 指す物の名だけを足す（`sourceTaskUids`・`orderedTaskGroupIds`）。対応表と `landing` は今のまま |
| c | 今のまま |

回答:

#### ❓ 問 35-5. タスクの 16 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。実績ダミーの部分の名（`barDummyStart` など）は、あなたの語「実績ダミー」を写します。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-12 | `createTask` | タスクを作る | 名前の無いタスクを、与えた start と finish で、タスクグループ taskGroupId の上に作る。taskShape（rectangle・chevron・arrow・endpointSpan）と milestoneShape（15 の印のどれか）のちょうど 1 つを与え、milestoneShape はタスクをマイルストーンにする。新しいタスクの uid は project.highestIssuedUid に 1 を足した数で、highestIssuedUid もそこへ進むので、同じ束の後の命令がそのタスクを名指せる（例えば highestIssuedUid が 41 なら、taskUid 42 の editTask）。どのタスクグループも指さない taskGroupId は、その id の最上位のタスクグループを新しく作る。 | 無し |
| 35-13 | `editTask` | タスクを編集する | タスク taskUid を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。規則は編集した後のタスクで調べるので、start と finish の片方だけを送ってよい。どちらかが動けば、GRS は percentComplete を計算し直す。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。 | 形は `edit<実体>`（`JDG-3268`） |
| 35-14 | <span style="color: #0550AE">`pasteTasks`</span> | タスクを貼り付ける | sourceUids に並べたタスクを複製する。並べていない子タスクは写さず、写しは未着手で始まる。landing は写しの置き場所を言い、Ctrl を押したドラッグのコピーだけが送る。（`JDG-1727`） | 無し |
| 35-17 | &emsp;&emsp;+- `shiftMinutes` | ずらす量 | 写しをずらす量（分、符号付き）。ドラッグと同じ刻み。 | 無し |
| 35-19 | `moveTaskToTaskGroup` | タスクを別のタスクグループへ動かす | タスク taskUid を、別のタスクグループ taskGroupId へ動かす。 | 無し |
| 35-22 | &emsp;&emsp;+- <span style="color: #0550AE">`state`</span>（持ち主 `place`） | どの進捗ステータスか | どの進捗ステータスか。notStarted・inProgress・suspendedWithResumeDate・suspendedWithoutResumeDate・finished のどれか。（`JDG-2684`） | 無し |
| 35-23 | `beginTaskActual` | 実績を始める | 人がタスク taskUid の実績ダミー（まだ始まっていない実績の代わりの印）をドラッグした後に、その実績を始める。grabbed はドラッグした印を、released は離した所を、snapMinutes は実績の長さを決める刻み（分）を言う。 | 画面の実績ダミーのドラッグ |
| 35-24 | &emsp;+- `grabbed` | つかんだ所 | 実績ダミーのどの部分をドラッグしたか。 | 無し |
| 35-25 | &emsp;&emsp;+- `barDummyStart`（持ち主 `grabbed`） | バーのダミーの開始の端 | バーのダミーの開始の端。 | 画面の実績ダミー |
| 35-26 | &emsp;&emsp;+- `barDummyFinish`（持ち主 `grabbed`） | バーのダミーの終了の端 | バーのダミーの終了の端。 | 画面の実績ダミー |
| 35-27 | &emsp;&emsp;+- `milestoneDummy`（持ち主 `grabbed`） | マイルストーンのダミー | マイルストーンのダミー。 | 画面の実績ダミー |
| 35-28 | &emsp;&emsp;+- `arrowDummyStart`（持ち主 `grabbed`） | 矢印のダミーの開始の端 | 矢印のダミーの開始の端。 | 画面の実績ダミー |
| 35-29 | &emsp;&emsp;+- `arrowDummyFinish`（持ち主 `grabbed`） | 矢印のダミーの終了の端 | 矢印のダミーの終了の端。 | 画面の実績ダミー |
| 35-30 | &emsp;+- `released` | 離した所 | ダミーを離した所。開始の側と終了の側で読んだ日時。 | 無し |
| 35-31 | &emsp;+- `snapMinutes` | 刻み | 刻み（分）。実績の長さを決める。省けば日の刻み。 | 無し |
| 35-34 | `deleteTask` | タスクを削除する | タスク taskUid を削除する。 | 無し |

回答:

**依存**

#### ❓ 問 35-6. 依存の端 —— `predecessorEdge`・`successorEdge` の `Edge` を改めるか

場面: `createDependency` の 2 つの引数は、依存線がタスクのどちらの端（`start` か `finish`）から出て、どちらに入るかを言います。グラフの語で `edge`（辺）は、依存線そのものを指します。そのため `predecessorEdge` は「先行の依存線」とも読めます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 35-37 | &emsp;+- `predecessorEdge` | 線が出る、先行の端。start か finish。 |
| 35-38 | &emsp;+- `successorEdge` | 線が入る、後続の端。start か finish。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `predecessorSide`・`successorSide`（バーの開始の側か終了の側か） |
| b | `predecessorEnd`・`successorEnd`（2 つの端の 1 つ。`end` は「終了」とも読める） |
| c | 今のまま |

回答:

#### ❓ 問 36-1. ラグの形の値 —— `typed` を中身の名にするか

場面: `changeDependencyLag` の `lag` は 2 つの形を持ち、`type` が形を選びます（`JDG-3563`）。値 `workingDays` は「稼働日の数で与える」を言います。値 `typed` は「分と見せる単位で与える」を言いますが、英語の `typed` は「型を持つ」か「打ち込んだ」と読めます。MSPDI は長さを Duration の形で書き、ラグの見せる単位を LagFormat で持ちます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 36-4 | &emsp;&emsp;+- `typed`（持ち主 `lag`） | 分と、見せる単位で与えるラグ。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `duration`（長さを分で与え、見せる単位を添える） |
| b | `minutesWithUnit` |
| c | 今のまま |

回答:

#### ❓ 問 36-2. 同じ向きの線の 1 本 —— 引数 `order` を `index` にするか

場面: `deleteDependencyAt` は、同じ 2 つのタスクの間の同じ向きの線のうち 1 本を、並びの中の位置で名指します。引数 `order`（0 から）が位置を持ちます。断りの `commandIndex` は、同じ「0 から数える位置」を `Index` と呼びます。GRS JSON の `siblingOrder` は、兄弟の中の並び順を言います。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 36-11 | `deleteDependencyAt` | 同じ向きの線のうちの 1 本を削除する。successorUid、predecessorUid と、後続の依存の並びの中の位置 order（0 が最初）で名指す。 |
| 36-12 | &emsp;+- `order` | 後続の依存の並びの中での、同じ向きの線の位置。0 が最初。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 引数を `index`（0 から数える位置）にする。命令の名 `deleteDependencyAt`（その位置の依存を消す）は今のまま |
| b | 命令の名も `deleteDependencyAtIndex` にする |
| c | 今のまま |

回答:

#### ❓ 問 36-3. 依存の 11 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-35 | `createDependency` | 依存を作る | タスク predecessorUid からタスク successorUid へ依存線を引く。predecessorEdge と successorEdge は端（start か finish）を名指し、端の組が結び方の種類（例えば終了-開始）を決める。どちらかのタスクがマイルストーンなら、端が何と言っても線はいつも終了-開始である。 | 無し |
| 35-36 | &emsp;+- `successorUid` | 後続のタスク | 後続のタスク（依存を持つタスク）の uid。 | MSPDI では後続のタスクが PredecessorLink を持つ（GRS JSON に同じキーは無し） |
| 36-1 | `changeDependencyLag` | 依存のラグを変える | predecessorUid から successorUid への依存のラグを変える。その向きのすべての線が新しいラグになる。lag は稼働日の数か、分の長さとラグを見せる単位（day・hour・minute）の組のどちらか。 | 無し |
| 36-2 | &emsp;+- <span style="color: #0550AE">`type`</span>（持ち主 `lag`） | ラグの形 | ラグの形。workingDays か typed。（`JDG-3563`） | 無し |
| 36-3 | &emsp;&emsp;+- `workingDays`（持ち主 `lag`） | 稼働日のラグ | 稼働日の数で与えるラグ。 | 無し |
| 36-5 | &emsp;+- `minutes`（持ち主 `lag`） | ラグの長さ | ラグの長さ（分）。 | MSPDI の LinkLag（単位は違う） |
| 36-6 | &emsp;+- `unit` | ラグの単位 | ラグを見せ、打ち込む単位。day・hour・minute のどれか。 | GRS JSON の `lagFormat`（7・5・3）に当たる |
| 36-7 | &emsp;&emsp;+- `day`（持ち主 `unit`） | 日 | 日。 | 無し |
| 36-8 | &emsp;&emsp;+- `hour`（持ち主 `unit`） | 時間 | 時間。 | 無し |
| 36-9 | &emsp;&emsp;+- `minute`（持ち主 `unit`） | 分 | 分。 | 無し |
| 36-10 | `deleteDependency` | 依存を削除する | predecessorUid から successorUid への依存線を削除する。その向きの線はすべて消える。1 本だけ消すには deleteDependencyAt を使う。 | 無し |

回答:

**担当と割当**

#### ❓ 問 36-4. 担当と割当の 7 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-13 | `editResource` | 担当を編集する | 担当 resourceUid を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。プロパティは name だけで、set.name は担当の名前を変え、name を clear すると名前の無い担当になる。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-14 | `createResource` | 担当を作る | 名前 name の担当を足す。 | 無し |
| 36-15 | <span style="color: #0550AE">`deleteResources`</span> | 担当を削除する | resourceUids に並べた担当を削除する。（`JDG-2690`） | 無し |
| 36-16 | &emsp;+- <span style="color: #0550AE">`resourceUids`</span> | 削除する担当 | 削除する担当の uid。（`JDG-2685`） | 無し |
| 36-17 | `deleteUnreferencedResources` | 使われていない担当を削除する | どの割当からも指されていない担当をすべて削除する。 | 無し |
| 36-18 | `createAssignment` | 割当を作る | 担当 resourceUid をタスク taskUid に就ける。 | 無し |
| 36-19 | `deleteAssignment` | 割当を外す | 担当 resourceUid の割当をタスク taskUid から外す。 | 無し |

回答:

**タスクグループ**

#### ❓ 問 36-5. タスクグループの 10 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。写しと並べ替えの値は問 35-4 で問います。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-20 | `editTaskGroup` | タスクグループを編集する | タスクグループ taskGroupId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。color が無ければ帯の色は塗らず、name はそのグループが表すタスクの名前に従わない。editGroup はまだ作っていないので、設定も clear も断る（notImplemented）。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-21 | `createTaskGroup` | タスクグループを作る | 与えた id と siblingOrder で、与えれば parentId（無ければ最上位）、name（無ければ名前なし）、representedTaskUid も付けて、タスクグループを作る。（`representedTaskUid` の名は BGQA2 の問 6-9-2 で決める） | 無し |
| 36-22 | `pasteTaskGroupSubtree` | タスクグループの部分木を貼り付ける | sourceTaskGroupId を根とするタスクグループの部分木を複製し、根の写しを parentId（無ければ最上位）の下に置く。newTaskGroupIds は、元の id それぞれから写しの id への対応である。 | 無し |
| 36-23 | &emsp;+- `sourceTaskGroupId` | 写す元の根 | 写す部分木の根のタスクグループの id。 | 無し |
| 36-25 | `reorderTaskGroupSiblings` | 兄弟を並べ直す | parentId（無ければ最上位）の下の兄弟のタスクグループを、orderedIds の順に並べ直す。その順が siblingOrder になる。 | 無し |
| 36-27 | `moveTaskGroup` | タスクグループを動かす | タスクグループ taskGroupId の親と兄弟の中の位置を、parentId（無ければ最上位）と siblingOrder に変える。 | 無し |
| 36-28 | `resetTaskGroupTreeStates` | 木の状態を戻す | 隠れているタスクグループを除き、すべてのタスクグループの木の状態を auto に戻す。 | GRS JSON の `treeState` |
| 36-29 | `deleteTaskGroup` | タスクグループを削除する | タスクグループ taskGroupId を削除する。最後のタスクグループを削除するときは、名前が Untitled の最上位のタスクグループを新しく作る。文書はいつも少なくとも 1 つのタスクグループを持つからである。 | 無し |
| 37-1 | `pinTaskGroup` | ピン止めする | タスクグループ taskGroupId をピン止めしたタスクグループに足して、ピン止めする。 | GRS JSON の `pinnedTaskGroupIds` を書く |
| 37-2 | `unpinTaskGroup` | ピン止めを外す | タスクグループ taskGroupId をピン止めしたタスクグループから外す。最後の 1 つを外すと pinnedTaskGroupIds のプロパティも取り除き、[] は書かない。 | GRS JSON の `pinnedTaskGroupIds` を書く |

回答:

**描き方・注記・文書の設定と表**

#### ❓ 問 36-6. タスクの見た目の命令 —— `editTaskVisual` を `taskStyles` にそろえるか

場面: `JDG-3556` は、タスクの見た目を `scheduleData.taskStyles[]`（`{ taskUid, style }`）に置くと決めました。その前の名は `taskGraphicStyles`（`JDG-3384`）、さらに前は `taskVisuals` です。命令の名は、まだいちばん古い語 `Visual` を使います。ほかの編集の命令は `edit<実体>` の形で、実体の名をそのまま使います（`JDG-3268`）。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 36-30 | `editTaskVisual` | タスク taskUid の描き方を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `editTaskStyle`（`taskStyles` の 1 つの実体を編集する）。断りの `taskVisualCountNotOne` は問 32-9 の `taskStyleCountNotOne` にする |
| b | 今のまま |

回答:

#### ❓ 問 37-1. 表の窓の見え方の命令 —— `editTableView` を `tableWindows` にそろえるか

場面: `JDG-3544` は、GRS JSON の `documentSettings.tableViews` を `tableWindows` に改めました。命令 `editTableView` は前の語 `View` を使い、引数 `table` は窓の名（`searchWindow`・`delayDiagnosisReportWindow`・`resourceListWindow`。`JDG-3410`・`JDG-3512`）を持ちます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 37-4 | `editTableView` | 1 つの表の見え方を編集する。table が表を名指す。名指した表が持つプロパティだけを受け付ける。 |
| 37-5 | &emsp;+- `table`（持ち主 `editTableView`） | 編集する表の見え方。searchWindow・delayDiagnosticsReportWindow・resourceListWindow のどれか。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `editTableWindow`、引数を `tableWindow` にする（GRS JSON の `tableWindows` の 1 つを編集する） |
| b | `editTableWindow` にし、引数 `table` は今のまま |
| c | 今のまま |

回答:

#### ❓ 問 37-2. 全体表示の命令 —— `fitScheduleToScreenOnPage` の `OnPage` を外すか

場面: 前は 2 つの命令がありました。`fitScheduleToScreen` は、呼ぶ側が数えた倍率と位置を運び、`JDG-3267` で `editDocumentSettings` に畳まれました。`fitScheduleToScreenOnPage` は、ページが自分で倍率と位置を決めます。`OnPage` は 2 つを分けるための語で、今は 1 つだけが残ります。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 37-3 | `fitScheduleToScreenOnPage` | 全体表示のボタンと同じく、日程全体をページの画面に収める。ズームとスクロールの位置はページが自分で決める。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `fitScheduleToScreen`（全体表示のボタンと同じことをする）。前の同じ名は α の名で、「意味を変えない」決まりは β から効く。α の形で送った呼び手は、形の誤り（`malformedRequest`）を受け取る |
| b | 今のまま |

回答:

#### ❓ 問 36-7. 描き方・注記・文書の設定の 10 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。色と線の欄の形は、BGQA2 の色の問い（6-6-4-7〜11）で決めます。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-31 | `createCommentBox` | コメントボックスを置く | id が commentBoxId のコメントボックスを、leaderAnchor が言うとおりに付けて置く。leaderAnchor は何にも結び付かない点、タスク、ハイライトボックスのどれかで、選んだ種類のプロパティはすべて要る。ほかのプロパティは既定の値になり、新しい箱は文を持たない。（`leaderAnchor` は `JDG-3556` の `leaderTarget` に直す） | 無し |
| 36-32 | &emsp;+- <span style="color: #0550AE">`commentBoxId`</span> | 扱うコメントボックス | 命令が扱うコメントボックスの id。（`JDG-2685`） | GRS JSON の `CommentBox.id` を指す |
| 36-33 | `editCommentBox` | コメントボックスを編集する | コメントボックス commentBoxId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。枠・文字・塗りはいつも色を持つので、clear では取り除けない。塗りを隠すには fillTransparencyPercent を 100 にする。leaderAnchor は createCommentBox と同じ形である。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。（`leaderAnchor` は `JDG-3556` の `leaderTarget` に直す） | 形は `edit<実体>`（`JDG-3268`） |
| 36-34 | `bringCommentBoxToFront` | コメントボックスをいちばん前へ | コメントボックス commentBoxId を、コメントボックスの並びの末尾、つまりいちばん前へ動かす。 | 無し |
| 36-35 | `deleteCommentBox` | コメントボックスを削除する | コメントボックス commentBoxId を削除する。 | 無し |
| 36-36 | `createHighlightBox` | ハイライトボックスを置く | 与えた highlightBoxId で、firstDay から lastDay までの日（両端を含む）と、topTaskGroupId から bottomTaskGroupId までのタスクグループを囲むハイライトボックスを置く。 | 無し |
| 36-37 | `editHighlightBox` | ハイライトボックスを編集する | ハイライトボックス highlightBoxId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。strokeColor が無ければ枠の線は描かない。最後の日が最初の日より前の箱、下のタスクグループが上のタスクグループより前の箱は断る（highlightBoxInverted）。strokeColor が無く fillTransparencyPercent が 100 の箱も断る（fillAndStrokeBothInvisible）。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-38 | `bringHighlightBoxToFront` | ハイライトボックスをいちばん前へ | ハイライトボックス highlightBoxId を、ハイライトボックスの並びの末尾、つまりいちばん前へ動かす。 | 無し |
| 36-39 | `deleteHighlightBox` | ハイライトボックスを削除する | ハイライトボックス highlightBoxId を削除する。 | 無し |
| 36-40 | `editDocumentSettings` | 文書の設定を編集する | 日程の見せ方を言う文書の設定を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。ピン止めと表の見え方には自分の命令がある（pinTaskGroup・unpinTaskGroup・editTableView）。fitSpan は firstDay・lastDay・isFixed と一緒にまるごと書き、clear すると isFixed も消える。viewTimeZone を設定しても換算するのは見せる時刻だけで、保存した値は変わらない。 | GRS JSON の `documentSettings` |

回答:

## BGQA5 Agent API（23 問）

### [api] Agent API

#### ❓ 問 34-1. 修正案を当てる道具 —— `issueDelayFixes` の一族を、決まった語 `fixProposal`・`fixLog` にそろえるか

場面: 修正案（`fixProposal`、`JDG-2141`）と修正の記録（`fixLog`、`JDG-3466`）の名は決まっています。道具と型は、別の語 `issue`・`DelayFix` を使います。`issue` は「出す・発行する」を言い、文書に修正案を当てることを言いません。同じ Agent API の中で、遅延診断の答えは欄 `fixProposals`・`fixLog` を持ち、`readTableRows` は同じ表を `delayFixProposals`・`delayFixLog` と呼びます。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 34-14 | `issueDelayFixes` | 遅延診断の修正案を、画面の修正と同じく 1 つの束として当てる。 | `applyFixProposals` |
| 34-15 | &emsp;+- `fixKeys` | 当てる修正案の行のキー。空の並びは推奨の行を当てる。 | `fixProposalKeys` |
| 30-5 | `DelayFixRow` | 遅延診断の修正案の 1 行。 | `FixProposalRow` |
| 30-6 | `DelayFixLogRow` | 遅延診断の修正の記録の 1 行。 | `FixLogRow` |
| 32-17 | &emsp;+- `nothingToIssue`（持ち主 `reason`） | issueDelayFixes を呼んだが、当てる修正案が無い。 | `noFixProposalToApply` |
| （値） | `readTableRows` の `table` の値 `delayFixProposals`・`delayFixLog` | 修正案の表と修正の記録の表。 | `fixProposals`・`fixLog` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 動詞を `apply`（当てる。`applyCommands` と同じ動詞）にし、名詞を決まった語にそろえる（表の「案 a の名」の列）。`exportFixLogTsv` は今のまま（もう `fixLog` の語を使う） |
| b | 動詞を `accept`（受け入れる。画面の「推奨案をすべて採用する」の「採用」）にする: `acceptFixProposals`・`noFixProposalToAccept`。ほかは a と同じ |
| c | 今のまま |

回答:

#### ❓ 問 33-1. 持ち越しの欄を含める引数 —— `includeCarry` を `passthrough` の語にそろえるか

場面: `readDocument` の引数 `includeCarry` は、MSPDI の持ち越しの欄を答えに含めるかを決めます。GRS JSON はこの欄を `passthroughValues`・`passthroughElements` と呼び、引数は `carry` と呼びます。1 つの物が 2 つの名を持ちます（「顔をまたいでも 1 つの意味」の決まり）。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 33-33 | &emsp;+- `includeCarry`（持ち主 `readDocument`） | MSPDI の持ち越しの欄 passthroughValues と passthroughElements を含めるか。省けば偽。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `includePassthrough`。GRS JSON の欄と同じ語で、含める物を言う |
| b | `includeMspdiPassthrough`。MSPDI から来た欄であることも名に書く |
| c | 今のまま |

回答:

#### ❓ 問 33-2. 引数 `which` と道具 `closeWindow` —— 代名詞のキーを、指す物の名にするか

場面: 2 つの道具が引数 `which`（どれ）を持ちます。`which` は、何を選ぶかを言いません。`readSchema` の `which` は、文書のスキーマ・命令のスキーマ・書く前の注意から 1 つを選びます。`closeWindow` の `which` は、遅延診断レポートウィンドウとプロパティパネルから 1 つを選びます。プロパティパネルはパネルで、ウィンドウとは別の種類です（`JDG-3356`）。道具の名 `closeWindow` も、閉じる物の片方だけを言います。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 33-29 | &emsp;+- `which`（持ち主 `readSchema`） | 読むもの。document は GRS JSON の文書の JSON Schema、commands は applyCommands が受け取る命令のスキーマ、notes は書く前に読む短い注意。 |
| 34-29 | `closeWindow` | 遅延診断レポートのウィンドウかプロパティパネルを、その閉じるボタンと同じく閉じる。文書は変えない。 |
| 34-30 | &emsp;+- `which`（持ち主 `closeWindow`） | 閉じるもの。遅延診断レポートのウィンドウか、プロパティパネル。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `readSchema` の `which` を `part`（スキーマのどの部分を読むか。`readDocument` の `parts` と同じ語）にする。`closeWindow` は窓だけを閉じ、引数を `window`（値 `delayDiagnosisReportWindow`）にする。プロパティパネルは新しい道具 `closePropertiesPanel` で閉じる。どの名も、閉じる物をそのまま言う |
| b | `which` を `part` にする。`closeWindow` は 1 つのまま、引数を `target`（値 `delayDiagnosisReportWindow`・`propertiesPanel`）にする |
| c | 今のまま |

回答:

#### ❓ 問 34-2. 道具（メンバ）の 41 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。読む道具は `read…`、画面と同じことをする道具は画面の動詞、書き出す道具は `export…` で始まります。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 30-1 | `agentApi` | Agent API | Agent API: AI エージェントが、人と同じやり方と同じ検査で、開いている文書を読み書きするための接点。AI を提供する API ではなく、呼ぶ側がエージェントである。名前は訳さない。 | 画面の Agent API のボタンと同じ名 |
| 30-2 | &emsp;+- `grSchedulerAgentApi` | Agent API の識別子 | ページが Agent API をスクリプトに出すときの識別子。ほかの道具の同じような API とぶつからないよう、製品の接頭辞を残す。 | 無し |
| 33-26 | `agentApiVersion` | Agent API の版 | Agent API の版。YYYY-MM-DDTHH:MM:SSZ の形の UTC の日時の文字列。最初に読む。 | 無し |
| 33-27 | `schemaVersion`（持ち主 `AgentApi`） | スキーマの版 | この GRS が読み書きする GRS JSON の形式の版。開いている文書は自分の値を持ち、それは readDocument が返す。 | GRS JSON の `schemaVersion` と同じ名 |
| 33-28 | `readSchema` | スキーマを読む | 取次が持つ JSON Schema を部分ごとに返す。defs も full も無ければ目次を返す。目次は、いちばん上のキーと、すべての定義の名前とその 1 行の説明、文書のスキーマの版（schemaVersion）。defs を渡せばその定義だけを、それが指すほかの定義の名前と一緒に返す。full が真なら本文の全部を返し、資源 grs-document.schema.json か grs-commands.schema.json と同じになる。which が notes なら、書く前に読む短い注意を返す。ページがつながる前でも動き、スキーマは取次が配るページのものである。 | 無し |
| 33-30 | &emsp;+- `defs` | 定義の名 | 返す定義の名前。スキーマの $defs の名前で書く（例えば Task、Dependency）。それらだけを返す。 | JSON Schema の `$defs` の名 |
| 33-31 | &emsp;+- `full` | 全部 | 真ならスキーマの本文の全部を返し、資源と同じになる。defs より勝つ。 | 無し |
| 33-32 | `readDocument` | 文書を読む | 文書の凍結した写しで、根の 3 つの群を持つ。既定では MSPDI の持ち越しの欄（passthroughValues、passthroughElements）を除き、includeCarry に真を渡せば含める。空でない taskUids は、タスクに属する 6 つの群（tasks、assignments、taskGraphicStyles、taskGroupMembers、taskOrigins、baselineTasks）にそのタスクだけを残す。タスクグループの一覧（id、名前、親、順番）だけが欲しければ parts に ['taskGroups'] を渡す。そのときタスク・暦・担当は付いてこない。（`taskGraphicStyles` は `JDG-3556` の `taskStyles` に直す） | 無し |
| 33-34 | &emsp;+- `taskUids`（持ち主 `readDocument`） | 読むタスク | 読むタスクの uid。空か省けば、すべてのタスクを読む。 | 無し |
| 33-35 | &emsp;+- `parts`（持ち主 `readDocument`） | 残す部分 | 残す部分の名前。scheduleData のキー（tasks、calendars、resources、assignments、taskGroups、taskGroupMembers、taskGraphicStyles など）と documentSettings、changeLogEntries。空ならすべて残す。project と documentStamp はいつも残し、外した部分は答えに無い。 | GRS JSON の `scheduleData` のキーの名 |
| 33-36 | `readStamp` | 刻印を読む | 楽観ロックのための文書の刻印。書くときに expectedStamp として返す。 | GRS JSON の `documentStamp` |
| 33-37 | `readSelection` | 選んだものを読む | 人がいま選んでいるもの。選んだ順に並ぶ。 | 無し |
| 34-1 | `readSearchRows` | 検索の行を読む | 語を 1 つ受け取り、検索ウィンドウの行を返す。タスクの表を 1 ページずつと、コメントボックスの表。ウィンドウ自身の入力欄は読みも変えもしない。空の語は何も絞らないので、タスクの行は全体の目次になる。filters が 'asShown'（既定）なら、人がタスクの表に掛けた列のフィルタと並べ替えを当てるので、画面と同じ行が同じ順に返る。人と同じようにそれを変えるには、applyCommands で editTableView を送る。人の表も変わる。offset から limit 個まで（多くても 100）のタスクの行を返す。答えは、タスクの表の列（id、画面の名前、値の種類）、タスクの行の総数（taskTotal）、次の offset を並べる。taskTotal は、語とフィルタが残すタスクの行をすべて数え、マイルストーンと親タスクも含める。マイルストーンの行は milestone が真。予定と実績: タスクの行で、plannedStart と plannedFinish は予定（列の予定開始と予定終了。マイルストーンの plannedFinish はその開始）、percentComplete、actualStart、actualFinish は実績（列の進捗、実績開始、実績終了）。状態の列は日付を基準日と比べるだけである。正確な遅れの解析には readDelayDiagnostics を呼ぶ。 | 画面の検索ウィンドウ |
| 34-2 | &emsp;+- `word` | 探す語 | 探す語。タスクの行はタスク名か担当の名前がこの語を含めば、コメントボックスの行は本文が含めば残す。大文字と小文字、全角と半角は区別しない。空の語は何も絞らないので、答えは全体の目次になる。 | 検索ウィンドウの入力欄の語 |
| 34-3 | &emsp;+- `filters` | フィルタの当て方 | 'asShown'（既定）は、人が検索ウィンドウのタスクの表に掛けている列のフィルタと並べ替えを当てる。'none' はどちらも当てない。 | 無し |
| 34-4 | &emsp;+- `limit` | 行の数の上限 | 返す行の数。省けば 100、多くても 100。 | 無し |
| 34-5 | `readTableRows` | 表の行を読む | 遅延診断レポートの表か担当リストの表の行を、1 ページずつ、人が見るとおりのセルで返す。filters が 'asShown'（既定）なら、人がその表に掛けた列のフィルタと並べ替えを当てるので、画面と同じ行が同じ順に返る。表自身の入力欄は読みも変えもしない。遅延診断レポートの表は、readDelayDiagnostics と同じく新しい診断から作り、画面も文書も変えない。offset から limit 個まで（多くても 100）の行を返し、答えは列、行の総数、次の offset を並べる。人と同じように表の列のフィルタや並べ替えを変えるには、applyCommands で editTableView を送る。検索ウィンドウは readSearchRows で読む。修正案の表と修正の記録の表は、readDelayDiagnostics が fixProposals と fixLog で返すのと同じ行を、レポートのウィンドウが見せるとおりに 1 ページずつ並べる。 | 画面の遅延診断レポートウィンドウ・担当リスト |
| 34-6 | `readShownTasks` | 描いているタスクを読む | 日程表がいま描いているタスクの uid（どの表も日程表を絞っていなければ null）と、絞っている表の名前。読むだけで、画面も文書も変えない。 | 無し |
| 34-7 | <span style="color: #0550AE">`readDelayDiagnosis`</span>（今は `readDelayDiagnostics`） | 遅延診断を読む | 遅延診断のレポートを凍結した値で返す。指摘、信用できない値、ボトルネックとボトルネック経路、修正案と修正の記録。画面も文書も変えない。正確な遅れの解析はこれだけである。量はすべて稼働の分。inheritedDelayMinutes は先行がタスクの開始をどれだけ押したか。selfDelayMinutes は見込みの終了が、開始に予定の長さを足した時をどれだけ過ぎるか（親タスクは 0）。pushOutMinutes は、このタスクが引き起こす末端タスク（マイルストーンと後続の無いタスク）の遅れの分で、届く terminalsReached 個の末端タスクについて足す。terminalPushOuts は末端タスクごとに terminalDelayMinutes（見込みの終了が予定の終了を過ぎる分）と givenTo（それを引き起こしたタスクとその分）を持つ。分を日にするには、文書の project.minutesPerDay で割る（null なら、文書のスキーマの説明が与える値で割る）。画面は押し出しを日に切り上げて見せる。walls は診断が止まった所を、原因のタスクごとに 1 つの壁として並べる。row は壁の種類で、末尾の数で分かる（1 は自分の値が食い違うタスク、2 は親を推せないタスク、3 は先行の無いマイルストーン）。causeUid は原因のタスク、stoppedUids は診断せずに残ったタスクで、原因が先頭。自分のタスクグループの頭に立つマイルストーン（そのタスクグループのどのタスクもそれより前の日に始まらない）は日程の起点であり、先行が要らず、壁ではない。同じ種類の 2 つの壁は causeUid で違い、依存が輪になったタスクのように stoppedUids は同じ並びになりうる。（中の量の名は `JDG-3476` の名に直す: `dependencyDelayMinutes`・`internalDelayMinutes`・`delayContributionMinutes`・`endTaskDelayMinutes`・`endTasksReached`）（`JDG-3512`） | 無し |
| 34-8 | &emsp;+- `parts`（持ち主 `readDelayDiagnostics`） | 残す部分 | 残す部分の名前（findings、bottlenecks、terminalPushOuts、walls、markerStates、settledPushOuts、derivedParentTasks、lateDays、fixProposals、fixLog）。空ならすべて残す。outcome、statusDate、unreliableCount はいつも残す。（`terminalPushOuts`・`settledPushOuts` は `JDG-3473` の `endTaskDelays`・`finishedDelayContributions` に直す） | 無し |
| 34-9 | &emsp;+- `limit`（持ち主 `readDelayDiagnostics`） | 並びの上限 | 各並びで返す要素の上限。0 は上限なし。 | 無し |
| 34-10 | `applyCommands` | 命令を当てる | 命令の束をまとめて書く。すべての命令を当てるか、束全体を断るかのどちらか。最後に読んだ刻印を expectedStamp として渡す。各命令の type と欄は、資源 grs-commands.schema.json にある。 | 無し |
| 34-11 | `importDocument` | 文書を取り込む | 開いている文書へ文書を取り込む。人が取り込み方（置き換える、足す、変更前の予定として重ねる）を選ぶ必要があるときは、問うたという答えをすぐに返す。人の選んだ結果は人自身の編集として書かれるので、watchChanges が知らせる。 | 画面の「取り込む」と同じ操作 |
| 34-12 | &emsp;+- `source`（持ち主 `importDocument`） | 取り込む文書 | 取り込む文書。文書そのもの、{ document }、または GRS JSON を持つ { text }。 | 無し |
| 34-13 | `requestOpenFile` | ファイルを開くよう頼む | 人にファイルを開いてもらうよう頼む。ページが問いを出し、呼び出しはすぐに戻る。人が続ければ、人のファイルの窓が開いて人がファイルを選ぶ。人が開いた文書は、人の編集として watchChanges で届く。人がファイルを選ぶと、ページは開き方を「置き換える」「合流させる」「重ねる」のボタンで人に問う。その問いが出ることを人に伝えておく。ファイルが入ったかを知るには watchChanges を呼ぶ（または刻印が変わるまで readStamp を呼ぶ）。そのあと readDocument で project.title を読めば、どの文書が開いているか分かる。 | 画面のファイルを開く操作 |
| 34-16 | `undoEdit` | 編集を取り消す | 編集の履歴のいちばん新しい段を取り消す。ただし呼んだ側が自分で書いた段だけで、人が書いた段は notOwnStep で断る。最後に読んだ刻印を expectedStamp として渡し、違う刻印は staleStamp で断る。タスクグループを展開した focusTask は自分の段を書く。タスクを作ってから focusTask を呼んだあとは、1 回目の undoEdit が展開を、2 回目が作成を取り消す。 | 画面の取り消し（呼んだ側の段だけ） |
| 34-17 | `redoEdit` | 編集をやり直す | いちばん最後に取り消した段をやり直す。ただし呼んだ側が自分で書いた段だけで、人が書いた段は notOwnStep で断る。最後に読んだ刻印を expectedStamp として渡し、違う刻印は staleStamp で断る。 | 画面のやり直し（呼んだ側の段だけ） |
| 34-18 | `exportJson` | GRS JSON を書き出す | 文書を GRS JSON の文字列で返す。fileName（.json で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-19 | `exportMspdi` | MSPDI を書き出す | 文書を Microsoft Project XML（MSPDI）で返す。fileName（.xml で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | MSPDI（書き出す形式） |
| 34-20 | `exportSvg` | SVG を書き出す | 書き出す絵を SVG の文字列で返す。文書が全体表示の期間を固定していれば、絵はその期間を使う。fileName（.svg で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-21 | `exportPng` | PNG を書き出す | 書き出す絵を PNG の画像で返す。失敗も値で返す。fileName（.png で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-22 | `exportEmbeddedHtml` | 文書入りの HTML を書き出す | GRS と文書を合わせた 1 つの .html ファイルを返す。fileName（.html で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 価値のことば「単一 HTML」（`JDG-3467`） |
| 34-23 | `exportFixLogTsv` | 修正の記録を TSV で書き出す | 遅延診断の修正の記録を、タブで区切った文字列で返す。人の「.tsv で保存」と同じ列と書き方で、記録のすべての行を表の順に並べる。fileName（.tsv で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 画面の「.tsv で保存」 |
| 34-24 | `focusTask` | タスクへ寄せる | タスクが載るタスクグループと祖先を展開し、タスクが見える所まで表示を寄せる。これは書き込みである。見せるものを変えなければタスクを見せられない（たたんだタスクグループを開く、表のスケジュールフィルターが隠すタスクを表示にする）ときは、その変更が呼んだ側の書いた編集の履歴の 1 段になる。寄せるだけなら段を足さない。 | 無し |
| 34-25 | &emsp;+- <span style="color: #0550AE">`taskUid`</span>（持ち主 `focusTask`） | 見せるタスク | 見せるタスクの uid。（`JDG-2685`） | GRS JSON の `taskUid` と同じ名 |
| 34-26 | `showOnlyTasks` | タスクだけを見せる | 並べたタスクだけを見せる。人ができるのと同じく、検索ウィンドウのタスクの表の表示の列を書き換え、その表のスケジュールフィルターを掛ける。空の並びはフィルターを解き、表示の値は残す。検索ウィンドウが出ていなければ最小化して出し、ページは帯を出すので、人は何が起きたかが分かる。遅延診断レポートと担当リストのフィルターには触れない。 | 画面のスケジュールフィルター |
| 34-27 | &emsp;+- `taskUids`（持ち主 `showOnlyTasks`） | 見せるタスク | 表示にするタスクの uid。空の並びはフィルターを解く。 | 無し |
| 34-28 | <span style="color: #0550AE">`runDelayDiagnosis`</span>（今は `runDelayDiagnostics`） | 遅延診断を行う | 人が炎のボタンを押したのと同じく、画面で遅延診断を行う。診断し、遅延診断レポートのウィンドウを開き、進捗マークに診断の印を出す。ウィンドウが既に開いていれば、その再診断のボタンと同じく診断をやり直す。文書は変えないので、刻印はそのままで、取り消しの段も足さない。値を読むのは readDelayDiagnostics で、この道具は画面に出すだけである。（`JDG-3512`） | 画面の炎のボタン |
| 34-31 | `watchChanges` | 変更を待つ | 呼んだ側以外の書き手が確定した変更を待つ。 | 無し |
| 33-10 | `fileName` | 保存するファイル名 | 書き出しを保存するファイル名。人が取次で選んだ保存先のフォルダからの相対の名。 | 無し |
| 33-11 | `overwrite` | 上書きの許し | 既にあるファイルを置き換えてよいか。先に人に問う。古いファイルは .bak として残る。 | 無し |

回答:

**受け渡す値の型**

#### ❓ 問 31-1. 画面の表を運ぶ型の一族 —— 頭の `Agent` と、列の `id`

場面: 4 つの型 `AgentTableRows`・`AgentTableRow`・`AgentTableColumn`・`AgentTableCell` と `AgentSearchPage` は、画面の表の 1 ページ・行・列・セルを運びます。頭の `Agent` は受け取る者を言い、物（画面の表）を言いません（`JDG-820`）。列の `id` の値は、今は仕様書の行 ID（`SQ-1` など）です。`JDG-3285` は行 ID を外へ出すのをやめ、値を変わらない英語の名（`plannedStart` など）にしました。GRS JSON は同じ値を型 `ColumnKey` とキー `column`（`ColumnFilter.column`・`ColumnSort.column`）で持ちます。また GRS JSON の `id` は、GRS 固有の実体のランダムな UUID を持ちます（`JDG-3565`）。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 31-13 | `AgentTableRows` | 表の行の 1 ページ分。知らない表の名なら断りの値。 | `ScreenTablePage` |
| 31-16 | `AgentTableRow` | 表の 1 行。行の対象とセル。 | `ScreenTableRow` |
| 31-9 | `AgentTableColumn` | Agent API が並べる、表の 1 つの列。 | `ScreenTableColumn` |
| 31-19 | `AgentTableCell` | 表の行の 1 つのセル。 | `ScreenTableCell` |
| 31-4 | `AgentSearchPage` | 検索ウィンドウの 1 ページ分。タスクの行、コメントボックスの行、列、総数、続きの位置。 | `SearchWindowPage` |
| 31-5 | `id`（持ち主 `AgentTableColumn`） | 列の行 ID。 | `key`（値は `ColumnKey`） |
| 31-17 | `column`（持ち主 `AgentTableCell`） | このセルの列の行 ID。 | `column`（GRS JSON の `column` と 1 語にまとめる） |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 頭を物の名にする（表の「案 a の名」の列）。列の `id` を `key`（表の中でその列を見分ける変わらない名。行の `key` と同じ役目）にし、値を `ColumnKey` にする。セルの `column` は GRS JSON の `column` と同じ意味になるので、辞書では GRS JSON の 1 語にまとめる。道具 `readSearchRows`・`readTableRows` は今のまま（動詞と目的語が物を言う） |
| b | 型の名は a と同じにする。列は `id` のまま、値だけを `ColumnKey` にする |
| c | 型の名は今のまま。列の `id` だけを `key` にする |
| d | 今のまま（値は `JDG-3285` のとおり変わらない英語の名になる） |

回答:

#### ❓ 問 30-1. 値の型の頭 `Agent` と末尾 —— 型の名を、中身と役目で言うか

場面: 11 の型が頭に `Agent` を持ちます。`Agent` は呼ぶ者を言い、型の中身を言いません（`JDG-820`）。型はもう Agent API（`grSchedulerAgentApi`）の中にあるので、頭の `Agent` は同じことを 2 度言います。末尾もばらばらです。答えの型の 4 つは `Outcome` で終わり、`AgentExport`・`AgentWatch` は名詞だけで終わります。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 30-12 | `AgentWriteRequest` | 書き込みの依頼。照らす刻印と命令の束。 | `WriteRequest` |
| 30-16 | `AgentWriteOutcome` | 書き込みへの答え。 | `WriteOutcome` |
| 30-18 | `AgentExport` | 書き出しへの答え。書き出した値か、断りの値。 | `ExportOutcome` |
| 30-20 | `AgentFocusOutcome` | focusTask への答え。 | `FocusOutcome` |
| 30-22 | `AgentImportSource` | importDocument が受け取るもの。 | `ImportSource` |
| 30-24 | `AgentImportOutcome` | 取り込みへの答え。 | `ImportOutcome` |
| 30-27 | `AgentShownTasks` | readShownTasks の答え。 | `ShownTasks` |
| 30-29 | `AgentDelayDiagnostics` | 遅延診断のレポートを凍結した値。 | `DelayDiagnosisReport`（`JDG-3512` の名の派生） |
| 30-31 | `AgentChangeReceiver` | 変更の知らせを受け取る関数。 | `ChangeReceiver` |
| 30-34 | `AgentWatch` | watchChanges の答え。 | `WatchOutcome` |
| 31-23 | `AgentSavedFile` | 取次が呼ぶ側のためにファイルを保存したときの答え。 | `SavedFile` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 頭の `Agent` を外し、答えの型の末尾を `Outcome` にそろえる（表の「案 a の名」の列）。断りの型は問 33-3、画面の表の型は問 31-1 で決める |
| b | 頭の `Agent` を Agent API の型の印として全部に残し、末尾だけをそろえる（`AgentExportOutcome`・`AgentWatchOutcome`・`AgentDelayDiagnosisReport`） |
| c | 今のまま |

回答:

#### ❓ 問 30-2. 日程表を絞る表の型 —— `VisibilityTable` を `tableWindows` の語にするか

場面: `VisibilityTable` の値は、日程表を絞れる 3 つの表の窓の名です（`searchWindow`・`delayDiagnosisReportWindow`・`resourceListWindow`。`JDG-3410`・`JDG-3512`）。`Visibility`（見えること）は、表が何かを言いません。GRS JSON は同じ 3 つを `documentSettings.tableWindows` に並べます（`JDG-3544`）。欄 `filteringTables`（`JDG-2687`）が、この型の値を並べます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 30-7 | `VisibilityTable` | 日程表を絞れる表の名前。検索ウィンドウ、遅延診断レポート、担当リストのどれか。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `TableWindow`（表を持つ窓の 1 つ）。GRS JSON の `tableWindows` と同じ語で、値（窓の名）とも合う |
| b | `ScheduleFilteringTable`。日程表を絞る役目を言い、`filteringTables` と同じ語になる |
| c | 今のまま |

回答:

#### ❓ 問 30-3. 取り込みで人に出した問い —— `asked` を、何を持つかを言う名にするか

場面: `importDocument` は、人に問いを出してまだ何も書いていないとき、欄 `asked` を返します。今の値は仕様書の行 ID（`U-61`・`QN-17`）です。`JDG-3285` により、値は変わらない英語の名（席の案 `mergeChoice`・`openFile`）になります。名 `asked`（問うた）は過去分詞で、真偽の値にも読めます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 30-23 | `asked` | 人に出した問いの在りか。差分確認ダイアログか、ファイルを開くことの問い。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `pendingQuestion`（人の答えを待つ問い）。値は `mergeChoice`・`openFile` |
| b | `askedQuestion`（出した問い）。値は a と同じ |
| c | `asked` のまま。値だけを英語の名にする |

回答:

#### ❓ 問 30-4. 変更の知らせの印 —— `mark` と `WatcherMark` を、中身の名にするか

場面: 変更の知らせ `ChangeNotice` は欄 `mark`（型 `WatcherMark`）を持ちます。中身は 1 つの値で、書き手が受け取った所までのスケジュールデータの更新の時刻です（src は `seenScheduleUpdatedAt` と呼ぶ）。`mark`（印）は、何の印かを言いません。`watchChanges` の引数 `receive`（受け取る）は、知らせを受け取る関数です。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 30-8 | `WatcherMark` | 購読者が変更の知らせをどこまで受け取ったかの印。 |
| 30-36 | `mark` | どこまで受け取ったかの印。スケジュールデータの更新の時刻。 |
| 34-32 | &emsp;+- `receive`（持ち主 `watchChanges`） | 知らせを受け取る手。MCP の道具は代わりに waitMs を受け取る。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `mark` を `seenScheduleDataUpdatedAt`（受け取った所までのスケジュールデータの更新の時刻。刻印の `scheduleDataUpdatedAt` と同じ語）にし、型 `WatcherMark` をなくす。`receive` は今のまま |
| b | a に加えて、`receive` を `onChangeNotice` にする（呼ばれる関数を `on…` で呼ぶ、よくある書き方） |
| c | 今のまま |

回答:

#### ❓ 問 30-5. 受け渡す値の型の 37 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。1 ページの答えは、2 つの並びを持つ検索ウィンドウだけが `task…`・`commentBox…` の頭を付け（`taskRows`・`taskTotal`）、1 つの並びの表は頭を付けません（`rows`・`total`）。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 30-3 | `Selection` | 選んだもの | readSelection が返す、選んだ順に並んだ選んだもの。 | 画面の選択 |
| 30-4 | `SearchRows` | 検索ウィンドウの行 | 画面が作る、検索ウィンドウの表の行。 | 画面の検索ウィンドウ |
| 30-9 | `ok` | 受け入れたか | 呼び出しを受け入れた（真）か断った（偽）か。断った答えは refusal を持つ。 | 無し |
| 30-10 | `expectedStamp` | 照らす刻印 | 呼ぶ側が最後に読んだ刻印。今の刻印と 1 つでも違えば、書き込みはまるごと断られる。 | GRS JSON の `documentStamp` |
| 30-11 | `commands` | 命令の束 | 文書の命令の束。束の単位でまとめて当てる。 | 無し |
| 30-13 | <span style="color: #0550AE">`hasUpdatedSchedule`</span> | スケジュールデータを変えたか | 書き込みがスケジュールデータを変えたか。変えればその更新の時刻が進む。（`JDG-2680`） | 無し |
| 30-14 | `createdUids` | 作ったものの uid | この書き込みで作ったものの uid（タスク・担当・割当・暦が 1 つの数え手を分け合う）を小さい順に並べたもの。何も作らなければ空。 | 無し |
| 30-15 | `refusal` | 断り | 断った呼び出しの、断りの値。 | 無し |
| 30-17 | `value`（持ち主 `AgentExport`） | 書き出した値 | 書き出した値。 | 無し |
| 30-19 | <span style="color: #0550AE">`isScrolled`</span> | 寄せたか | タスクが見えるように表示を寄せたか。ピン止めしたタスクグループに阻まれたら偽。（`JDG-2245`） | 無し |
| 30-21 | `text`（持ち主 `AgentImportSource`） | GRS JSON の文字列 | 1 つの文字列で渡す GRS JSON。 | 無し |
| 30-25 | `drawnTaskUids` | 描いているタスク | いま日程表に描いているタスクの uid の並び。スケジュールフィルターを掛けた表が無ければ null。 | 無し |
| 30-26 | <span style="color: #0550AE">`filteringTables`</span> | 絞っている表 | スケジュールフィルターを掛けている表の名の並び。（`JDG-2687`） | 無し |
| 30-28 | `fixProposals` | <span style="color: #0550AE">修正案</span> | 遅延診断の修正案の行。（`JDG-2141`） | 画面の修正案の表 |
| 30-30 | `notice` | 変更の知らせ | 届いた変更の知らせ。 | 無し |
| 30-32 | <span style="color: #0550AE">`hasReplacedEarlierWatch`</span> | 先の購読を置き換えたか | この購読が、呼ぶ側が先にしていた購読を置き換えたか。（`JDG-2245`） | 無し |
| 30-33 | `stopWatching` | 購読をやめる | 購読をやめ、やめた購読があったかを返す。 | 無し |
| 30-35 | `watcher` | 購読する書き手 | 知らせを受け取る書き手の名。 | GRS JSON の刻印の書き手の名 |
| 30-37 | `ChangeNotice` | 変更の知らせ（型） | 呼ぶ側以外の書き手が変更を確定したことの知らせ。今の刻印を持ち、文書は持たない。呼ぶ側は要るものを読み直す。 | 無し |
| 30-38 | `taskRows` | タスクの行 | 検索ウィンドウのタスクの行のうち、offset から limit までのもの。 | 検索ウィンドウのタスクの表 |
| 30-39 | `commentBoxRows` | コメントボックスの行 | 検索ウィンドウのコメントボックスの行。ページに分けない。 | 検索ウィンドウのコメントボックスの表 |
| 30-40 | `columns` | 列の一覧 | その表の列の一覧。id、画面の名前、値の種類。（「id」は問 31-1 で決める） | 無し |
| 31-1 | `taskTotal` | タスクの行の総数 | 絞った後のタスクの行の数。マイルストーンと親タスクも 1 行に数える。 | 無し |
| 31-2 | `offset`（持ち主 `AgentApi`） | 始めの位置 | 返した最初の行の位置。0 から数える。 | 無し |
| 31-3 | `nextOffset` | 続きの位置 | 続きの最初の位置。続きが無ければ null。 | 無し |
| 31-6 | `ja` | 日本語の列の名 | 日本語の画面での列の名。 | 画面の日本語の列見出し |
| 31-7 | `en` | 英語の列の名 | 英語の画面での列の名。 | 画面の英語の列見出し |
| 31-8 | <span style="color: #0550AE">`valueType`</span>（持ち主 `AgentTableColumn`） | 値の種類 | 列の値の種類。語か日付か。種類で列のフィルタの形が違う。（`JDG-3564`） | 無し |
| 31-10 | `table` | 表の名 | 読む表、または読んだ表。遅延診断レポートの表、担当リストの表、修正案の表、修正の記録の表のどれか。（値の窓の名は `JDG-3410`・`JDG-3512` に、修正案と修正の記録の表の名は問 34-1 に従う） | 無し |
| 31-11 | `rows` | 行 | 表の行のうち、offset から limit までのもの。 | 無し |
| 31-12 | `total` | 行の総数 | 絞った後の行の数。 | 無し |
| 31-14 | `key` | 行の対象 | 行が何についての行か。遅延診断レポートではタスクの uid、担当リストでは担当の uid（担当の無い行は unassigned）。 | 無し |
| 31-15 | `cells` | セル | 列ごとの、画面に出す値。 | 無し |
| 31-18 | `text`（持ち主 `AgentTableCell`） | セルの文字 | 英語の画面に出す値の文字。 | 画面の英語のセルの文字 |
| 31-20 | <span style="color: #0550AE">`savedTo`</span> | 保存した所 | 書いたファイルの、保存先のフォルダの下の絶対の所。（`JDG-2814`） | 無し |
| 31-21 | `bytes` | バイト数 | 書いたバイト数。 | 無し |
| 31-22 | <span style="color: #0550AE">`backedUpTo`</span> | 控えの所 | 上書きの前の中身を移した .bak の絶対の所。上書きでなければ null。（`JDG-2814`） | 無し |

回答:

**断り**

#### ❓ 問 33-3. 断りの 2 つの型 —— `Refusal` と `AgentRefusal`

場面: 断りの型が 2 つあります。`AgentRefusal` は呼び出し全体の断りで、答えの欄 `refusal` がそれを持ちます。`Refusal` は束の中の 1 つの命令の断りで、`AgentRefusal` の欄 `commandRefusals` がそれを並べます。短い名 `Refusal` が狭い物を指し、長い名が広い物を指します。入れ子の図で、2 つの形と添え物の欄を並べて見せます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 33-25 | `AgentRefusal` | 断り。誰が断ったか（from）、どの呼び出しか（member）、理由、説明、ページが断ったときは今の刻印を持ち、文書は持たない。断りはエラーではなく値である。 |
| 33-4 | `Refusal` | 束の中の 1 つの命令の断り。位置、種類、理由、欄。 |
| 33-5 | `commandRefusals` | 断られた命令ごとの断り。理由が commandRefused のときだけある。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `AgentRefusal` を `Refusal`（呼び出しの断り。欄 `refusal` と同じ語）にする。`Refusal` を `CommandRefusal`（1 つの命令の断り。欄 `commandRefusals`・`commandIndex`・`commandType` と同じ語）にする。`commandRefusals` は今のまま |
| b | `AgentRefusal` を `CallRefusal`、`Refusal` を `CommandRefusal` にする |
| c | 今のまま |

回答:

#### ❓ 問 31-2. 前置詞のキー —— `from` と `at` を、指す物の名にするか

場面: 断りの欄 `from`（から）は、断ったのがページか取次かを持ちます。文書の誤りの欄 `at`（で）は、誤りの所を JSON Pointer で持ちます。2 つとも前置詞で、何の値かを言いません（`JDG-820`）。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 31-24 | `from` | 呼び出しを断ったのが誰か。ページか取次か。 |
| 33-6 | `at` | 誤りのある、文書か呼び出しの中の所。JSON Pointer で表す。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `from` を `refusedBy`（断った者）、`at` を `pointer`（誤りの所を指す JSON Pointer）にする |
| b | `from` だけを `refusedBy` にする。`at` は `{ at, message }` の短い組として読めるので残す |
| c | 今のまま |

回答:

#### ❓ 問 32-1. 人かページが手を離せない 4 つの理由 —— 名の形をそろえるか

場面: 4 つの理由は、どれも「いま書けない。少し後で試す」を言います。名の形はばらばらです（名詞＋`InFlight`・動名詞・名詞＋過去分詞・動名詞）。取り込みの `cause` の値 `openInProgress` は、名詞＋`InProgress` の形です。`gesture` は、画面の語「ドラッグ」と違う語です。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 32-4 | &emsp;+- `gestureInFlight`（持ち主 `reason`） | 人が文書を変えるドラッグの途中である。 | `dragInProgress` |
| 32-5 | &emsp;+- `editingInPlace`（持ち主 `reason`） | 人がその場で打ち込んでいて、まだ確定していない。 | `inPlaceEditInProgress` |
| 32-6 | &emsp;+- `questionAsked`（持ち主 `reason`） | ページが人に確認の問いを出している。 | `confirmationInProgress` |
| 32-7 | &emsp;+- `deliveringNotices`（持ち主 `reason`） | ページが変更の知らせを配っている途中である。 | `noticeDeliveryInProgress` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 名詞＋`InProgress` にそろえる（表の「案 a の名」の列）。`openInProgress` と同じ形で、どれも「進んでいる最中の物」を言う |
| b | `gestureInFlight` だけを `dragInProgress` にする（画面の語に合わせる） |
| c | 今のまま |

回答:

#### ❓ 問 32-2. 無いタスクを名指した —— `unknownTask` と `notFound` を 1 つの名にするか

場面: 道具 `focusTask`・`showOnlyTasks` は、無いタスクの uid を受けると `unknownTask` で断ります。命令は、無い実体（タスクなど）を名指すと `notFound` で断ります。2 つの名が 1 つのことを言います。`unknownTask` のとき、断りは欄 `taskUids` に見つからない uid を並べます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-9 | &emsp;+- `unknownTask`（持ち主 `reason`） | 名指した uid のタスクが無い。 |
| 32-55 | &emsp;+- `notFound`（持ち主 `reason`） | 名指した実体（タスク、タスクグループ、ボックス、担当、割当、依存）が無い。（意味の文は `JDG-3561`） |
| 33-8 | `taskUids`（持ち主 `AgentRefusal`） | 名指したが見つからなかった uid の並び。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 道具も命令も `notFound` で断る。欄 `taskUids` を `missingTaskUids`（見つからないタスクの uid）にする |
| b | 2 つを残し、`unknownTask` を `taskNotFound` にする（`notFound` と同じ語を使う） |
| c | 今のまま |

回答:

#### ❓ 問 32-3. このページの造りが持たない部分 —— `notAvailable` と `notImplemented` を 1 つの名にするか

場面: `notAvailable` は「このページは、このメンバに答える部分を持たない」を言います。src は説明に「not built yet」と書きます。`notImplemented` は「まだ作っていない欄（`editGroup`）を書こうとした」を言います。2 つは同じこと（このビルドが、その部分をまだ持たない）を言います。また `notAvailable` は「今だけ使えない」とも読めるので、AI が同じ呼び出しを繰り返すおそれがあります。`unknownCommand`（どの命令の名でもない）は別のことを言います。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-14 | &emsp;+- `notAvailable`（持ち主 `reason`） | このページは、このメンバに答える部分を持たない。 |
| 32-66 | &emsp;+- `notImplemented`（持ち主 `reason`） | まだ作っていない欄（editGroup）を書こうとした。 |
| 32-65 | &emsp;+- `unknownCommand`（持ち主 `reason`） | type がどの命令の名でもない。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | メンバも欄も `notImplemented` で断る（HTTP の 501 Not Implemented と同じ意味）。`unknownCommand` は今のまま |
| b | 2 つを残し、`notAvailable` を `memberNotSupported` にする |
| c | 今のまま |

回答:

#### ❓ 問 32-4. 範囲の外の値 —— `outOfRange` と `settingOutOfBounds` を 1 つの名にするか

場面: `outOfRange` は「数が許す範囲の外にある」を言います。`settingOutOfBounds` は「設定の値が、ほかの設定の値を名指す下限か上限を満たさない」を言います。どちらも「値が範囲の外」を言い、違いは下限と上限の出どころだけです。断りは欄 `min`・`max` に範囲を書きます。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-57 | &emsp;+- `outOfRange`（持ち主 `reason`） | 数が許される範囲の外にある。整数が要る所で整数でないか、有限でない（NaN や無限大）ものも当たる。 |
| 32-42 | &emsp;+- `settingOutOfBounds`（持ち主 `reason`） | 設定の値が、ほかの設定の値を名指す下限か上限を満たさない。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | どちらも `outOfRange` で断り、`min`・`max` に範囲を書く（1 つの名に 1 つの意味。`OMPV`） |
| b | 2 つを残し、語をそろえる: `settingOutOfRange` |
| c | 今のまま |

回答:

#### ❓ 問 32-5. 終わりが始まりより前 —— 3 つの名の受け持ちを分け直すか

場面: 3 つの理由が「終わりが始まりより前」を言います。`endBeforeStart` は、予定の終了と開始、ハイライトボックスの `lastDay` と `firstDay` を受け持ちます。`highlightBoxInverted` も `lastDay` と `firstDay` を受け持ち、加えて上下のタスクグループの逆さを受け持ちます。`negativeActualLength` は、実績の終わりと始まりを受け持ちます。仕様書は後の 2 つを「予定の 2 列について定めるものを、注記と実績について定める」と書きます（`IV-19`・`IV-21`）。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-37 | &emsp;+- `endBeforeStart`（持ち主 `reason`） | 終わりが始まりより前にある（開始より前の終了、firstDay より前の lastDay）。 |
| 32-45 | &emsp;+- `highlightBoxInverted`（持ち主 `reason`） | ハイライトボックスの終わりが始まりより前にある。lastDay が firstDay より前か、下のタスクグループが上のタスクグループより上にある。 |
| 32-47 | &emsp;+- `negativeActualLength`（持ち主 `reason`） | 実際の作業が、始まるより前に終わっている。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 日時の前後は、予定・実績・注記のどれも `endBeforeStart` で断る。`highlightBoxInverted` は上下の逆さだけを受け持ち、名を `bottomTaskGroupAboveTop`（下のタスクグループが上のタスクグループより上）にする。`negativeActualLength` はなくす |
| b | 3 つを残し、受け持ちを分ける: 予定は `endBeforeStart`、実績は `actualEndBeforeStart`、注記は `highlightBoxInverted`（日と上下の両方） |
| c | 今のまま |

回答:

#### ❓ 問 32-6. 親の輪 —— 命令の `wouldMakeCycle` を、文書の理由の名にそろえるか

場面: 文書の検査は、親の結び付きの輪を `taskParentCycle`・`taskGroupParentCycle` で断ります。命令は、タスクかタスクグループを自分の配下へ動かすと `wouldMakeCycle` で断ります。2 つは同じ輪を言い、命令の側は「輪になる」と先のことを言います。ほかの理由（`duplicateKey`・`endBeforeStart` など）は、文書と命令で同じ名を使います。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-59 | &emsp;+- `wouldMakeCycle`（持ち主 `reason`） | タスクかタスクグループを、自分の下か自分の子孫の下へ動かそうとした。 |
| 32-32 | &emsp;+- `taskParentCycle`（持ち主 `reason`） | タスクの親の結び付きが輪になっている。 |
| 32-44 | &emsp;+- `taskGroupParentCycle`（持ち主 `reason`） | タスクグループの親の結び付きが輪になっている。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 命令も `taskParentCycle`・`taskGroupParentCycle` で断る。文書と命令で同じ名を使う、ほかの理由と同じ形にする |
| b | 3 つを 1 つの `parentCycle` にまとめる。どの実体の輪かは `field` と `message` が言う |
| c | 今のまま |

回答:

#### ❓ 問 32-7. 無いタスクグループのピン止め —— `pinnedTaskGroupMissing` を `danglingReference` にまとめるか

場面: `danglingReference` は「ほかの実体を指すプロパティが、文書に無い実体を指す」を言います。`pinnedTaskGroupMissing` は「ピン止めしたタスクグループが無い」を言います。ピン止めの並び `pinnedTaskGroupIds` もタスクグループを指すプロパティなので、後者は前者の 1 つです。仕様書は 2 つを別の行に置きます（`IV-2` は外部キーの列、`IV-3` は文書の設定の値を受け持つ）。

| # | 今の名 | 意味（日本語） |
|:---|:---|:---|
| 32-30 | &emsp;+- `danglingReference`（持ち主 `reason`） | ほかの実体を指すプロパティ（parentTaskUid など）が、文書に無い実体を指している。（意味の文は `JDG-3561`） |
| 32-31 | &emsp;+- `pinnedTaskGroupMissing`（持ち主 `reason`） | ピン止めしたタスクグループが無い。 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `danglingReference` にまとめる。どのプロパティかは、文書の誤りの所（`at`、問 31-2 の案 a なら `pointer`）が言う |
| b | 2 つを残し、`pinnedTaskGroupMissing` を `danglingPinnedTaskGroup` にする（`dangling` の語をそろえる） |
| c | 今のまま |

回答:

#### ❓ 問 32-8. 取り込みを当てなかった —— `importNotLanded` と `cause` の値

場面: `importNotLanded` は「取り込みを当てなかった」を言い、欄 `cause` が 3 つの値で訳を言います。「着地（land）」は席の中の比喩で、外の読み手には何が起きたかが見えにくい語です。値 `notValidated` は「文書が検査を通らなかった」を言い、上の理由 `documentInvalid` と同じことを言います。値 `importCanceled` は、持ち主の `import…` と語を重ねます。取り込みの流れ（人への問い・取りやめ・検査）の図で、どの道でどの断りが出るかを見せます。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 32-18 | &emsp;+- `importNotLanded`（持ち主 `reason`） | 取り込みを当てなかった。人が取りやめたか、開く操作の途中だったか、文書が検査を通らなかった。 | `importNotApplied` |
| 33-15 | `cause` | 取り込みが着地しなかった理由。 | `cause` |
| 33-16 | &emsp;+- `openInProgress`（持ち主 `cause`） | 開く操作の途中だった。 | `openInProgress` |
| 33-17 | &emsp;+- `notValidated`（持ち主 `cause`） | 文書が検査を通らなかった。 | `documentInvalid` |
| 33-18 | &emsp;+- `importCanceled`（持ち主 `cause`） | 人が取り込みを取りやめた。 | `canceled` |
| 32-22 | &emsp;+- `documentInvalid`（持ち主 `reason`） | 取り込んだ文書が取り込みの検査を通らなかった。documentFaults が誤りを 1 つずつ並べる。 | `documentInvalid` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の「案 a の名」の列にする。`importNotApplied`（取り込みを当てなかった）が何が起きたかを言い、検査の失敗は上の理由と同じ語 `documentInvalid` で言う |
| b | `importNotLanded` は残し、`notValidated` だけを `documentInvalid` にする |
| c | 今のまま |

回答:

#### ❓ 問 32-9. 何についての断りかを言わない 9 つの理由 —— before / after のとおりでよいか

場面: 9 つの理由の名は、何についての断りかを言わないか、兄弟の名と形が違います。下の表の after は、意味から選んだ名です。

| # | before | 意味（日本語） | after | after を選んだ訳 |
|:---|:---|:---|:---|:---|
| 32-3 | `notOwnStep` | 取り消すかやり直す段を書いたのが、呼んだ書き手ではなく別の書き手である。 | `notOwnEdit` | 道具 `undoEdit`・`redoEdit` と同じ語。「段」は中の語 |
| 32-11 | `tooTall` | 絵が、書き出せる高さより高い。 | `imageTooTall` | 何が高いかを言う。`fileTooLarge`・`taskTreeTooDeep` と同じ形 |
| 32-33 | `taskGroupTooDeep` | タスクグループの入れ子が 5 段より深くなる。 | `taskGroupTreeTooDeep` | `taskTreeTooDeep` と対にする |
| 32-34 | `taskGroupMembershipBroken` | あるタスクが、ちょうど 1 つのタスクグループに入っていない。 | `taskGroupMembershipCountNotOne` | 何が壊れたかを言う。`taskStyleCountNotOne` と同じ形 |
| 32-41 | `importSequenceAhead` | TaskOrigin.lastSeenImportNumber が project.lastImportNumber より大きい。 | `mspdiImportNumberAhead` | `JDG-3556` のキー `lastMspdiImportNumber`・`lastSeenMspdiImportNumber` と同じ語（キーの語は Number） |
| 32-49 | `taskVisualCountNotOne` | あるタスクを指す TaskGraphicStyle が、ちょうど 1 つでない。 | `taskStyleCountNotOne` | `JDG-3556` の `taskStyles` と同じ語（問 36-6） |
| 32-61 | `limitReached` | タスクグループをピン止めしようとしたが、ピン止めの上限の 5 に達している。 | `pinLimitReached` | どの上限かを言う。この理由はピン止めだけが使う |
| 32-62 | `missingValue` | 写しの新しい id が対応表に無い。 | `newTaskGroupIdMissing` | 何の値かを言う（`pasteTaskGroupSubtree` の対応表の値） |
| 32-63 | `bothEndsAreOneTask` | 依存の両端が同じタスクである。 | `selfDependency` | 文の形をやめ、兄弟と同じ名詞の形にする。自分への依存の通り名 |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の after を全部採る |
| b | 直す行に書き込み、その行だけを改める |
| c | 今のまま |

回答:

#### ❓ 問 33-4. 断りの添え物の 5 語 —— 何の値かを名に書くか

場面: 断りは、理由ごとに添え物の欄を持ちます。下の 5 つの名は一般の語で、何の値かを理由の側に頼ります。断りの値は平らな形なので、名だけを読むと別の理由の値と混ざります（例: `path` はファイルの所、`at` は文書の中の所）。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 33-9 | `seconds` | 取次があきらめるまでに待った秒数。 | `waitedSeconds` |
| 33-12 | `path` | 既にあるファイル。 | `existingFilePath` |
| 33-13 | `folder` | 使えない保存先のフォルダ。 | `saveFolder` |
| 33-21 | `name`（持ち主 `AgentRefusal`） | 送った、退けた名前。 | `retiredName` |
| 33-22 | `replacement` | 退けた名前の代わりに使う名前。無ければ書かない。 | `replacementName` |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の「案 a の名」の列にする。`min`・`max` は範囲の通り名なので今のまま |
| b | ほかの意味と混ざる 3 つ（`path`・`folder`・`name`）だけを改める |
| c | 今のまま |

回答:

#### ❓ 問 32-10. 断りの 49 語 —— 推奨の表のとおりでよいか

易しい語をまとめた推奨の表です。理由の名は「何が・どうなった」を言う変わらない英語の名で、仕様書の行 ID の代わりです（`JDG-3285`）。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 31-25 | &emsp;+- `page`（持ち主 `from`） | ページ | GRS のページが断った。 | 無し |
| 31-26 | &emsp;+- `relay`（持ち主 `from`） | 取次 | 取次が自分で断った。 | 無し |
| 31-27 | `member` | 断られた呼び出し | どの呼び出しが断られたか。道具かメンバの名前。例えば applyCommands。 | 無し |
| 31-28 | `message` | 説明 | 人が読む、英語の短い説明。 | 無し |
| 32-1 | `reason`（持ち主 `AgentApi`） | 断りの理由 | 呼び出し、命令、または取り込んだ文書が断られた理由。下の断りの理由のどれか。 | 無し |
| 32-2 | &emsp;+- `staleStamp`（持ち主 `reason`） | 古い刻印 | 渡した刻印が、今の刻印と少なくとも 1 つの値で違う。 | 無し |
| 32-8 | &emsp;+- `commandRefused`（持ち主 `reason`） | 命令の断り | 束の中の命令が断られたので、束のどの命令も当てていない。 | 無し |
| 32-10 | &emsp;+- `notDrawnYet`（持ち主 `reason`） | まだ描いていない | ページがまだ画面を描いていないので、全体表示のように画面の大きさが要ることができない。 | 無し |
| 32-12 | &emsp;+- `rasterFailed`（持ち主 `reason`） | 画像にできない | ページが絵を画像にできなかった。 | 無し |
| 32-13 | &emsp;+- `embeddedHtmlFailed`（持ち主 `reason`） | HTML を組めない | ページが 1 つの .html のファイルを組めなかった。 | 無し |
| 32-15 | &emsp;+- `malformedRequest`（持ち主 `reason`） | 呼び方の形の誤り | 呼び方の形がスキーマに合わない。命令か、readSchema の which・defs・full のような引数。 | 無し |
| 32-16 | &emsp;+- `historyEmpty`（持ち主 `reason`） | 履歴が空 | 履歴に、取り消す（またはやり直す）段が無い。 | 無し |
| 32-19 | &emsp;+- `schemaViolation`（持ち主 `reason`） | スキーマ違反 | 渡した GRS JSON がスキーマに合わない。0..2147483647 の外の uid もこれに当たる。 | 無し |
| 32-20 | &emsp;+- `formatTooNew`（持ち主 `reason`） | 形式が新しすぎる | schemaVersion がこのビルドの知るいちばん新しい版より新しく、文書がスキーマに合わない。 | 無し |
| 32-21 | &emsp;+- `formatTooOld`（持ち主 `reason`） | 形式が古すぎる | schemaVersion がこのビルドの読む版より古い（α の文書）。このビルドは古い版の変換を持たない。 | 無し |
| 32-23 | &emsp;+- `retiredName`（持ち主 `reason`） | 退けた名 | 退けた名前を送った（命令の種類、メンバの名、引数の名、編集の欄の名）。 | 無し |
| 32-24 | &emsp;+- `pageNotConnected`（持ち主 `reason`） | ページが未接続 | 取次に GRS のページがつながっていない。 | 無し |
| 32-25 | &emsp;+- `relayTimedOut`（持ち主 `reason`） | 取次の時間切れ | ページが期限までに答えなかった。 | 無し |
| 32-26 | &emsp;+- `badFileName`（持ち主 `reason`） | ファイル名の誤り | fileName が、保存先のフォルダの中の相対のファイル名でない。 | 無し |
| 32-27 | &emsp;+- `fileExists`（持ち主 `reason`） | ファイルが既にある | ファイルが既にあり、overwrite が真で渡されていない。 | 無し |
| 32-28 | &emsp;+- `saveFolderUnavailable`（持ち主 `reason`） | 保存先が使えない | 保存先のフォルダを作れない、読めない、または書けない。 | 無し |
| 32-29 | &emsp;+- `duplicateKey`（持ち主 `reason`） | 鍵の重複 | 同じ配列の 2 つの実体が同じ鍵（id や uid など）を持つことになる。例えば、新しい実体の id が既に使われている。（意味の文は `JDG-3561`） | 無し |
| 32-35 | &emsp;+- `noCalendar`（持ち主 `reason`） | カレンダーが無い | 暦が無い。 | 無し |
| 32-36 | &emsp;+- `fillAndStrokeBothInvisible`（持ち主 `reason`） | 塗りも線も見えない | 塗りと線の両方が見えなくなる。fillColor も strokeColor も無いタスクの描き方か、strokeColor が無く fillTransparencyPercent が 100 のハイライトボックス。 | 無し |
| 32-38 | &emsp;+- `fadeWithoutFinish`（持ち主 `reason`） | 終了の無いフェード | タスクがフェード（fadeInCalendarDays か fadeOutCalendarDays）を持つのに、終了を持たない。 | 無し |
| 32-39 | &emsp;+- `fadeLongerThanTask`（持ち主 `reason`） | タスクより長いフェード | フェード（fadeInCalendarDays と fadeOutCalendarDays の和）が、暦日で数えてタスクより長い。 | 無し |
| 32-40 | &emsp;+- `unusableDate`（持ち主 `reason`） | 使えない日時 | 日や時刻が読めないか、日が 1984-01-01..2149-12-31 の外にある。 | 無し |
| 32-43 | &emsp;+- `calendarWithoutWorkingDay`（持ち主 `reason`） | 稼働日の無いカレンダー | プロジェクトカレンダーに稼働する曜日が無い。 | 無し |
| 32-46 | &emsp;+- `noTaskGroup`（持ち主 `reason`） | タスクグループが無い | タスクグループが無い。 | 無し |
| 32-48 | &emsp;+- `milestoneShapeMismatch`（持ち主 `reason`） | 形とマイルストーンの食い違い | 形が Task.milestone と合わない。マイルストーンは milestoneShape を持ち taskShape を持たず、ほかのタスクは taskShape を持ち milestoneShape を持たない。 | 無し |
| 32-50 | &emsp;+- `invalidWorkingTimes`（持ち主 `reason`） | 稼働の時間帯の誤り | 1 日の稼働の時間帯が決まりを破っている。時間帯は 1 から 5 本で、時刻の順に並び、重ならないこと。 | 無し |
| 32-51 | &emsp;+- `fileTooLarge`（持ち主 `reason`） | ファイルが大きすぎる | 取り込むファイルが 32 MB より大きい。 | 無し |
| 32-52 | &emsp;+- `tooManyTasks`（持ち主 `reason`） | タスクが多すぎる | 取り込む文書のタスクが 20000 より多い。 | 無し |
| 32-53 | &emsp;+- `taskTreeTooDeep`（持ち主 `reason`） | タスクの木が深すぎる | 取り込むタスクの入れ子（parentTaskUid による）が 64 段より深い。 | 無し |
| 32-54 | &emsp;+- `taskWithoutDates`（持ち主 `reason`） | 日時の無いタスク | タスクが、要る所で予定の開始か予定の終了を持たない。 | 無し |
| 32-56 | &emsp;+- `alreadyExists`（持ち主 `reason`） | 既にある | 作ろうとした依存か割当が既にある。 | 無し |
| 32-58 | &emsp;+- `hyperlinkSchemeNotAllowed`（持ち主 `reason`） | 許さないリンクの形 | リンクのアドレス（hyperlinkAddress）が javascript:・vbscript:・data: で始まる。調べる前に、両端の空白と制御文字を除き、スキームを小文字で読む。 | 無し |
| 32-60 | &emsp;+- `siblingListMismatch`（持ち主 `reason`） | 兄弟の並びの食い違い | 並べ替える並びが、兄弟のそれぞれをちょうど 1 回ずつ名指していない。 | 無し |
| 32-64 | &emsp;+- `alreadyStarted`（持ち主 `reason`） | 既に始まっている | タスクの実際の作業を始めようとしたが、既に始まっている。 | 無し |
| 32-67 | &emsp;+- `fieldSetAndCleared`（持ち主 `reason`） | 書くと消すの両方 | 同じ欄が set と clear の両方にある。 | 無し |
| 33-1 | `commandIndex` | 命令の位置 | 断られた命令の、束の中の位置。0 から数える。 | 無し |
| 33-2 | <span style="color: #0550AE">`commandType`</span>（持ち主 `Refusal`） | 命令の種類 | 断られた命令の種類（名前）。（`JDG-3564`） | 無し |
| 33-3 | `field` | 断られた欄 | 命令の中の、断られた値。例えば set.start。 | 無し |
| 33-7 | `documentFaults` | 文書の誤り | 取り込んだ文書で見つかった問題ごとの誤り。所と説明を持つ。 | 無し |
| 33-14 | `pageUrl` | ページのアドレス | 取次に GRS のページをつなぐために人が開く、アドレスの全部。取次が起動するたびに変わる。 | 無し |
| 33-19 | `knownSchemaVersion` | 知っているスキーマの版 | このビルドが知る、いちばん新しい schemaVersion。 | GRS JSON の `schemaVersion` |
| 33-20 | `converterUrl` | 変換のページの所 | 古い文書を変換する HTML のページを入手する所。 | 無し |
| 33-23 | `min` | 下限 | 範囲の外にあった値の下限。 | 無し |
| 33-24 | `max` | 上限 | 範囲の外にあった値の上限、または達した上限。 | 無し |

回答:

## BGQA3 GRS JSON（後回し。2026-11-15、影響の小さい問い 6。問 6-9-2 は 2026-11-18 に BGQA3 の 13 回目へ出して決まった（`JDG-3624`））

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


#### ❓ 問 6-13-2. 画面の欄の名「段 0 の木の状態」 —— 「根」の語にそろえるか

場面: 問 6-13-1 の a で、`levelZeroTreeState` を `rootTreeState` に改め、タスクグループの階層を「深さ」で数えると決めました（`JDG-3602`）。辞書の日本語の名は、設定の欄の名（画面の語）を写します（`JDG-3518`）。画面の欄の名は、今も「段 0 の木の状態」（英語 Top-Level Tree State）です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 「木の根の状態」（英語 Root Tree State）にする。キー `rootTreeState` と同じ語になる。深さ 0 が木の根で、最上位のタスクグループの上にある |
| b | 「最上位の木の状態」（英語 Top-Level Tree State のまま）にする。「段 0」だけを外す |
| c | 今のまま |

回答:

#### ❓ 問 6-9-5. タスクと依存の、MSPDI の名と違う 3 語

あなたの答え「MSPDI同じならOK。 違うならそこだけ抽出して、裁定に回せ。」に従い、MSPDI の名と同じ 17 語を確定しました（`JDG-3553`）。キーが MSPDI の名と違う 3 語を、ここに残しました。案は GRWB の議論の後でこの問いに書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-1 | `parentTaskUid` |  | WBS での親タスク。この値を省くと最上位のタスク。 | 無し |
| 9-10 | <span style="color: #0550AE">`fadeInCalendarDays`</span> |  | 開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |
| 9-11 | <span style="color: #0550AE">`fadeOutCalendarDays`</span> |  | fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |

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

## BGQA3 GRS JSON（11 回目の答えの後に出し直す。2026-11-17）（問 6-8-8 は 2026-11-18 に BGQA3 の 13 回目の表で問い直して決まった（`JDG-3628`）。問 6-13-5 の構造図は、JDG-3618〜3629 を当てて描き直してから出す）

#### ❓ 問 6-13-5. 構造図（2026-11-17 版） —— このとおりでよいか

場面: あなたは「途中まで見た。 直せ。 そのあとまたツリーを見る。 ツリーで直したところは説明のところに更新マークをつけろ。 そうしないとツリーが壊れる」と書きました。構造図の ★ を直し、その後に決まったこと（`JDG-3606`・`JDG-3607`・`JDG-3610`〜`JDG-3613`）と問 6-8-8 の a（仮）を当てて描き直しました。直した行は、説明の欄の末尾に 🔄 があります。

**あなたの ★ と直し:**

| # | あなたの ★ | 直し |
|:---|:---|:---|
| 1 | `scrollPosition.type` の `placed`「なぜplaced?、decidedじゃないの？」 | `notDecided`・`decided` にした。対になる 2 つの語で「場所が決まっているか」を言う |
| 2 | `leftEdgeDayFraction`「これなん？」 | 開いたとき、左の端がその日のどこにあるか（日の始まりから何 %）。`JDG-3529` の決まりで `…Percent` にし、`leftEdgeDayOffsetPercent` とした |
| 3 | `topEdgeTaskGroupFraction`「これなん？」 | 開いたとき、上の端がその帯のどこにあるか（帯の上から何 %）。`topEdgeTaskGroupOffsetPercent` とした（`laneTopOffsetPercent` と同じ考え） |
| 4・5 | `offset`「NEIM違反では？ 最低単位必須」 | `utcOffsetMinutes`（UTC との差を分で。例 540）とした。N-10（量は単位で終える）に合う。`scheduleDataTimeZone`（名は `JDG-3569` で確定）の値の形も分の数にそろえるかは、下の案で問う |
| 6 | `season`「 isSummerTime とかは？」 | 値が標準時と夏時間の 2 つだけなので、真偽の値にした。名は `isDaylightSavingTime`（夏時間の国際的な呼び名。N-9） |
| 7 | `stackDirection`「taskStackDirectionか？」 | `taskStackDirection` とした。帯の中でタスクを積む向き（up・down）を言う |
| 8 | `taskGroupPanelWidthPx`「Hightか？」 | 横幅のまま。左にある帯の名の欄の横幅で、境目を左右にドラッグして変える |
| 9 | `pinnedTaskGroupIds`「配列か？ isTaskGroupPinnedか？」 | 配列のまま。ピン止めは見せ方なので、タスクグループ（中身）でなく文書設定に置く（`S-126`）。ピン止めした帯の並びも配列の順で持てる |
| 10 | `isScheduleFilterApplied`「isTaskFilterApoliedか？」 | `isTaskFilterApplied` とした。表でチェックしたタスクだけを描くか、を言う。画面の語「スケジュールフィルター」も合わせて直すかは、画面の名の問い（後の巡）で問う |
| 11 | `sort`「NEIM違反。」 | `columnSort` とした。型 `ColumnSort`（並べ替えの列と向き）と同じ名 |

構造図（β の形。プロパティの名を併記）:

印: `[M]` は MSPDI の要素を写すキー（括弧の中は、MSPDI の名が違う時の MSPDI の名）。`◆` は、MSPDI と往復する実体の中にある GRS 特有の値。GRS だけの群と根の部分のキーは印を持たない。`[]` は配列、`→` は下の共通の型を指す。行の末尾の 🔄 は、前の図から変わった所。

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
│   │   ├─ type                                     notDecided・decided 🔄
│   │   ├─ leftEdgeDay                              左の端の日
│   │   ├─ leftEdgeDayOffsetPercent                 左の端が、その日の始まりから何 % の所か 🔄
│   │   ├─ topEdgeTaskGroupId                       上の端の帯
│   │   └─ topEdgeTaskGroupOffsetPercent            上の端が、その帯の上から何 % の所か 🔄
│   ├─ fitSpan                                      全体表示の期間
│   │   ├─ firstDay                                 最初の日
│   │   ├─ lastDay                                  最後の日
│   │   └─ isFixed                                  期間を固定するか
│   ├─ viewTimeZone                                 見せるタイムゾーン
│   │   ├─ type                                     sameAsScheduleData・fixed
│   │   └─ utcOffsetMinutes                         UTC との差（分） 🔄
│   ├─ displayTimeZones[]                           追加の時計（4 つまで）
│   │   ├─ utcOffsetMinutes                         UTC との差（分） 🔄
│   │   └─ isDaylightSavingTime                     夏時間のゾーンか 🔄
│   ├─ is…Visible ×12                               見せるかの切り替え 12 個
│   ├─ taskStackDirection                           帯の中でタスクを積む向き（up・down） 🔄
│   ├─ isThemeMonochrome                            モノクロか
│   ├─ taskGroupPanelWidthPx                        左の帯の名の欄の横幅（高さではない） 🔄
│   ├─ isTaskGroupPanelWidthFixed                   幅を固定するか
│   ├─ rootTreeState                                木の根の状態
│   ├─ pinnedTaskGroupIds                           ピン止めした帯の id の配列（見せ方なので文書設定に置く） 🔄
│   └─ tableWindows                                 3 つの表の見せ方
│       ├─ searchWindow                             検索ウィンドウ
│       ├─ delayDiagnosticsReportWindow             遅延診断レポート
│       ├─ resourceListWindow                       担当リスト
│       └─ （3 つの表は、どれも次の欄を持つ）
│           ├─ isTaskFilterApplied                  表でチェックしたタスクだけを描くか 🔄
│           ├─ shownTaskUids                        チェックしたタスク
│           ├─ shownResourceUids                    チェックした担当（担当リスト）
│           ├─ isUnassignedShown                    （担当なし）の行（担当リスト）
│           ├─ columnFilters[]                      列のフィルタ → ColumnFilter
│           └─ columnSort                           並べ替えの列と向き → ColumnSort 🔄
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
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
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
│   │   │   │   ├─ predecessorLinkType [M] (Type)   依存の種類（FF・FS・SF・SS）（仮） 🔄
│   │   │   │   ├─ linkLag [M]                      ラグ
│   │   │   │   ├─ lagFormat [M]                    ラグの単位
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
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
│   │   │   │   │   └─ toTime [M]                   終わりの時刻 🔄
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   │   │   ├─ exceptions[] [M]                     例外の日
│   │   │   │   ├─ name [M]                         例外の名
│   │   │   │   ├─ fromDate [M] (TimePeriod/FromDate)  最初の日
│   │   │   │   ├─ toDate [M] (TimePeriod/ToDate)   最後の日
│   │   │   │   ├─ dayWorking [M]                   稼働日か
│   │   │   │   ├─ exceptionType [M] (Type)         例外の繰り返し方（仮） 🔄
│   │   │   │   ├─ recurrencePeriod [M] (Period) （問 6-7-7）  繰り返しの間隔
│   │   │   │   ├─ workingTimes[] [M]               稼働の時間帯（形は上と同じ）
│   │   │   │   └─ ◆passthrough                     持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   │   ├─ resources[] [M]                          担当
│   │   │   ├─ uid [M]                              一意な番号
│   │   │   ├─ name [M]                             担当の名
│   │   │   ├─ resourceType [M] (Type)              資材か作業か（仮） 🔄
│   │   │   ├─ isCostResource [M]                   コストの担当か
│   │   │   ├─ calendarUid [M]                      担当の暦
│   │   │   └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   │   └─ assignments[] [M]                        割当
│   │       ├─ uid [M]                              一意な番号
│   │       ├─ taskUid [M]                          就くタスク
│   │       ├─ resourceUid [M]                      就く担当
│   │       └─ ◆passthrough                         持ち越した MSPDI の値（MSPDI の構造と名のまま） 🔄
│   └─ ［GRS だけが持つ群］
│       ├─ （名は次の問いで決める）                 文書全体の GRS の値（名は後の問い 6-13-4） 🔄
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
│       │   ├─ style                                見た目 🔄
│       │   │   └─ color                            帯の色 → LaneColor 🔄
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
│       │   └─ style                                見た目 🔄
│       │       ├─ taskShape                        バーの形
│       │       ├─ milestoneShape                   マイルストーンの形
│       │       ├─ fill                             塗り → Paint 🔄
│       │       └─ stroke                           縁 → Stroke 🔄
│       ├─ commentBoxes[]                           コメントボックス
│       │   ├─ id                                   一意な UUID
│       │   ├─ text                                 文
│       │   ├─ style                                見た目 🔄
│       │   │   ├─ fill                             箱の塗り → Paint 🔄
│       │   │   ├─ stroke                           枠と引出し線 → Stroke 🔄
│       │   │   └─ font                             文字の見た目 🔄
│       │   │       ├─ color                        文字の色 → Color 🔄
│       │   │       └─ sizePx                       文字の大きさ 🔄
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
│       │   ├─ style                                見た目 🔄
│       │   │   ├─ cornerRadiusPx                   角の丸みの半径
│       │   │   ├─ fill                             塗り → Paint 🔄
│       │   │   └─ stroke                           枠 → Stroke 🔄
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
│       ├─ taskOrigins[]                            取り込み元の控え 🔄
│       │   ├─ taskUid                              タスク 🔄
│       │   ├─ sourceProjectId                      元のファイルの UID 🔄
│       │   ├─ sourceUid                            元のタスクの UID 🔄
│       │   ├─ importSessionId                      取り込みの id 🔄
│       │   └─ lastSeenMspdiImportNumber            最後に見た取り込み 🔄
│       ├─ passthroughTasks[]                       GRS がタスクにしない MSPDI の要素 🔄
│       │   ├─ precedingTaskUid                     前にある、いちばん近いタスクの uid 🔄
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
│       ├─ passthroughResources[]                   GRS が担当にしない MSPDI の要素 🔄
│       │   ├─ precedingResourceUid                 前にある、いちばん近い担当の uid 🔄
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
│       ├─ passthroughAssignments[]                 GRS が割当にしない MSPDI の要素 🔄
│       │   ├─ precedingAssignmentUid               前にある、いちばん近い割当の uid 🔄
│       │   └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
│       └─ passthroughCalendars[]                   GRS が暦にしない MSPDI の要素 🔄
│           ├─ precedingCalendarUid                 前にある、いちばん近い暦の uid 🔄
│           └─ mspdiElement                         MSPDI の要素（構造と名のまま） 🔄
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
├─ Paint                                            塗り 🔄
│   ├─ color                                        色 → Color 🔄
│   └─ opacityPercent                               不透明度（%） 🔄
├─ Stroke                                           線 🔄
│   ├─ color                                        色 → Color 🔄
│   ├─ opacityPercent                               不透明度（%） 🔄
│   └─ widthPx                                      太さ 🔄
└─ ShapeStyle                                       形の見た目（タスク・コメントボックス・ハイライトボックスで共にする） 🔄
    ├─ fill                                         塗り → Paint 🔄
    └─ stroke                                       線 → Stroke 🔄
```

消した行:

- project の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- tasks[].predecessorLinks[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- tasks[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- calendars[] の `◆ordinal`
- calendars[].weekDays[] の `◆ordinal`
- calendars[].weekDays[].workingTimes[] の `◆ordinal`
- calendars[].weekDays[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- calendars[].exceptions[] の `◆ordinal`
- calendars[].exceptions[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- calendars[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- resources[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- assignments[] の `◆passthroughValues`・`◆passthroughElements`（2 行を `◆passthrough` の 1 行にした）
- taskStyles[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）
- commentBoxes[].style の `opacityPercent`（`fill`・`stroke` の `opacityPercent` へ）
- commentBoxes[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）
- commentBoxes[].style の `textColor`（`font` の `color` へ）
- commentBoxes[].style の `fontSizePx`（`font` の `sizePx` へ）
- highlightBoxes[].style の `opacityPercent`（`fill`・`stroke` の `opacityPercent` へ）
- highlightBoxes[].style の `strokeWidthPx`（`stroke` の `widthPx` へ）
- 共通の型の `PassthroughElement` と、その子 `ordinal`・`name`・`fields`・`children[]`（5 行）

注:

- `taskOrigins[]` の 6 行と `workingTimes[].toTime` の 1 行は、木の線（`└─` と `├─`）だけが変わった。中身は変わっていない。
- `Color` は、ほかに変わる所がないので、「（問 6-6-4-7）」を外した。
- 3 つの `style` は、`ShapeStyle` を開いた形で描いた。`taskStyles[].style` は形のキーを足し、`commentBoxes[].style` は `font` を足し、`highlightBoxes[].style` は `cornerRadiusPx` を足す。
- `Paint`・`Stroke`・`ShapeStyle` は、共通の型の末尾に置いた。
- `passthroughResources[]`・`passthroughAssignments[]`・`passthroughCalendars[]` の説明は、`passthroughTasks[]` に倣って席が書いた。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | この構造図のとおりにする。`scheduleDataTimeZone` の値も、分の数（例 540）にそろえる（`utcOffsetMinutes` と同じ形。名は `JDG-3569` のまま） |
| b | この構造図のとおりにする。`scheduleDataTimeZone` の値は今の文字の形（`"+09:00"`）のまま |
| c | 直す行に ★ を書く |

回答:

