# 名の辞書の GQA —— 群 4 の出す前の問い

BGQA2（`goodrelax-qa-b2-glossary.md`）が 2026-10-31 に 1 回で出した群 4 の問いのうち、まだ出し直していない問いを、ここに置いています。利用者は、このファイルを直接は読みません。席が `JDG-3517` の形（分野ごとにまとめ、優先度の順）で GQA へ移し、移した問いをここから消します。文は Haiku と Sonnet の検査を通した形のままです（分けるときも、書き直さない）。

- 決まった問い: 問 6-6-2（`JDG-3514`）。
- 2026-11-01 の巡で GQA へ移した問い: 問 6-6-1・6-7-2・6-8-2・6-6-0（日時の型・色・表の列の 3 つに分けて 6-6-3〜6-6-5）・6-7-0 の #1〜4（6-6-5 へ）。
- 2026-11-01 16:5x の巡で GQA へ移した問い: 問 8（略語の正式名の欄。BOSS の頼み）。
- 2026-11-02 07:xx の巡で GQA へ移した問い: 問 6-7-1・6-7-3、6-7-0 の #16・29〜34・36・37、6-8-0 の #3・4・7（カレンダーの推奨の表 問 6-7-5）。
- 2026-11-05 の巡で GQA へ移した問い: 問 6-7-4・6-8-1・6-9-2、6-7-0 の #20〜24、6-8-0 のすべて（プロジェクトの推奨の表 問 6-8-5 と、タスクと依存の推奨の表 問 6-9-5 へ）、6-9-0 の #1〜11・13（問 6-9-5 へ）・#15〜18（担当と割当の推奨の表 問 6-9-6）・#19・21〜31（タスクグループの推奨の表 問 6-9-7）。
- 2026-11-05 23:0x の巡で GQA へ移した問い: 問 11（ホワイトボードの提案 A〜E。BOSS の頼み）。
- 下の注の「回答」欄の位置は古い形です。GQA へ移すときは、skill の今の形（回答欄は案の表のすぐ下）に直します。

### 問 6. Part 6〜13 —— GRS JSON（311 語）

GRS JSON の群を 1 回で出します（`JDG-3437`）。各パートの頭に迷う語だけを問いにし、残りは各 Part の最後の問 6-N-0 の表に置きました。

- 各問いの「回答」欄は、問いの見出しのすぐ下にあります。場面・案の表・語の表は、「回答」欄の後ろに置きました。
- 問 6-N-0 は、Part N の残りの表に直す所が無いかを聞きます。直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。
- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の言葉か決めの欄が、その名を挙げた所だけを青くしました。裁定の番号は意味の欄の最後にあります。
- 問いで聞く語は、表から外しました（表の # が飛んでいる所）。外した語は、その問いの表にあります。
- 「（→ 問 …）」の付いた語は、表に残したまま、その問いの答えで字が変わる語です。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 問 6-13-1 は、Part をまたいで名や数え方が被る語の問いです。Part 13 では、問 6-13-0 の前に置きました。
- 数え方は、それぞれの所に書きました。「裁定の行」は `docs/development-records/rulings.md` の JDG の行で、キーを前後が英数字でない形で含む行を数えたものです。

---

#### Part 7 / 43 —— GRS JSON / 共通の型とキー・暦（40 語）

##### 問 6-7-0. Part 7 の残りの 31 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 5 | <span style="color: #0550AE">`PassthroughValues`</span> |  | 持ち越した MSPDI の値。MSPDI の名前をキーにして持つ。（`JDG-3343`） | 無し |
| 6 | `ordinal` |  | MSPDI のファイルでの、持ち主の中でのこの行の順番。GRS はその順に書き戻す。 | 無し |
| 7 | `name`（持ち主 `PassthroughElement`） |  | MSPDI のファイルのとおりに綴った要素の名前。 | 無し |
| 8 | `fields` |  | この要素の子のうち、文字だけを持つ子要素の値を、要素の名前ごとに持つ。ほかの要素を含む子要素は children に入る。 | 無し |
| 9 | `children` |  | この要素の中に入れ子になった子要素。 | 無し |
| 10 | <span style="color: #0550AE">`PassthroughElement`</span> |  | 持ち越した 1 つの MSPDI の要素。GRS はまるごと持ち、同じ所へ書き戻す。（`JDG-3343`） | 無し |
| 11 | <span style="color: #0550AE">`passthroughValues`</span> |  | この要素の、持ち越した MSPDI の値。MSPDI の名前のまま持つ。（`JDG-3343`） | 無し |
| 12 | <span style="color: #0550AE">`passthroughElements`</span> |  | この要素の下にある、持ち越した MSPDI の要素。GRS はそれぞれを同じ所へ書き戻す。（`JDG-3343`） | 無し |
| 13 | `uid` |  | この行の、配列の中で一意な番号。MSPDI の UID と同じ。GRS は各 uid を 1 度だけ発行する。 | UID |
| 14 | `id` |  | この行の id。UUID である。 | 無し |
| 15 | `name` |  | この行の名前。MSPDI に Name があるものは、それと同じ。 | Name（MSPDI に名のある行だけ） |
| 18 | `taskUid` |  | この行が扱うタスクの uid。 | TaskUID（割当だけ） |
| 19 | `taskGroupId` |  | この行が扱うタスクグループの id。 | 無し |
| 25 | `fillColor` |  | この行が描くものの塗りの色。タスクでは予定バー（実績バーの塗りもこれから作る）、コメントボックスでは本文の箱、ハイライトボックスではその箱。色を省いてよい所で色を省くと、GRS は塗りの描画を省く。 | 無し |
| 26 | `fillTransparencyPercent` |  | 塗りの透過率（パーセント）。0 は不透明、100 のとき GRS は塗りの描画を省く。 | 無し |
| 27 | <span style="color: #0550AE">`strokeColor`</span> |  | この行が描くものの線の色。タスクではバーの輪郭、コメントボックスでは枠と引出し線、ハイライトボックスでは枠。色を省いてよい所で色を省くと、GRS は線の描画を省く。（`JDG-2691`） | 無し |
| 28 | <span style="color: #0550AE">`strokeWidthPx`</span> |  | この行が描くものの線の太さ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。新しい行には 1 を書く。（`JDG-2691`） | 無し |

---

#### Part 8 / 43 —— GRS JSON / 暦・プロジェクト・タスクと依存（40 語）

#### Part 9 / 43 —— GRS JSON / タスクと依存・担当と割当・タスクグループ・タスクの描き方・取り込み元・変更前の予定（36 語）

（見出しの「変更前の予定」は、問 6-10-3 で直します。）

##### 問 6-9-1. 両端に点のある細い線の名 —— `endpointSpan`（端点スパン）

回答:

場面: マイルストーンでないタスクの 4 つの形（`taskShape` の値）。画面では、タスクの形のパレットで選ぶ（仕様書の表 T-012 の `SH-1`〜`SH-4`）。`chevron` の日本語の名は矢羽根に決まりました（`JDG-3494`）。残るのは、両端に点のある細い線（画面の絵 `*----*`）の名です。

| # | キー | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|
| 36 | &emsp;+- `endpointSpan`（持ち主 `taskShape`） | 端点スパン: 両端に点のある細い線。 | 無し |

意味の根拠:

- 兄弟の 3 つの値は、描く物の形の名です: 矩形 `rectangle`・矢羽根 `chevron`・矢印 `arrow`。`endpointSpan`（端の点と幅）だけが、形の名でなく、形の説明です。
- 2 つの点を線で結んだ形には、データの図の世界で定まった名があります: dumbbell（ダンベル）。2 つの値を点で示し、その間を線で結ぶ図を、dumbbell chart（ダンベルチャート）と呼びます。GRS の形も、始まりと終わりの 2 点を線で結びます。
- 日本語の「ダンベル」は、多くの人が形を思い浮かべられる言葉です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | **`dumbbell`（ダンベル / Dumbbell）。** 両端に点のある細い線の形の名。兄弟と同じく形の名で、データの図の定まった名と同じ |
| b | `endpointSpan`（端点スパン）のまま。端点と幅という中身を、名が直接言う |
| c | `dotLine`（点付き線 / Dot Line）。字のとおりの、短い形の説明 |

##### 問 6-9-0. Part 9 の残りの 32 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 32 | <span style="color: #0550AE">`taskShape`</span> |  | マイルストーン以外のタスクのタスク図形の形。Task.milestone が偽のタスクすべてが持ち、そのタスクだけが持つ。マイルストーンは代わりに milestoneShape を持つ。（`JDG-3311`） | 無し |
| 33 | &emsp;+- `rectangle`（持ち主 `taskShape`） |  | 矩形: ふつうのバー。 | 無し |
| 34 | &emsp;+- `chevron`（持ち主 `taskShape`） | <span style="color: #0550AE">矢羽根</span> | 矢羽根: 始まりに切り欠きがあり、終わりが尖ったバー。（`JDG-3494`） | 無し |
| 35 | &emsp;+- `arrow`（持ち主 `taskShape`） |  | 矢印: 終わりに矢じりのある細い線。 | 無し |

---

#### Part 10 / 43 —— GRS JSON / タスクの描き方・取り込み元・変更前の予定・注記（40 語）

##### 問 6-10-1. 線先が吸着する部分の値 —— 画面の名にそろえるか

回答:

場面: 利用者がコメントボックスの線先をタスクに吸着させたとき、この値が、タスク図形のどの部分に付いたかを言います。

- `graphicPart` の値は `plannedBar`・`actualBar`・`milestone` です。
- 画面の群の語のキーは `planBar`（予定バー）・`actualBar`（実績バー）・`milestoneMark`（マイルストーンマーク。`JDG-3372`）です。表示のキーも `isPlanBarVisible` です（`JDG-3382`）。
- `plannedBar` だけが planned と綴ります。`milestone` は、タスクの真偽のキー `milestone`（Part 7 の #22）と同じ綴りで、別の物を指します（`OMPV`）。

| # | キー | 意味（日本語） | MSPDI の名 |
|---|---|---|---|
| 29 | &emsp;+- `plannedBar`（持ち主 `graphicPart`） | タスクの予定バー。 | 無し |
| 30 | &emsp;+- `actualBar`（持ち主 `graphicPart`） | タスクの実績バー。 | 無し |
| 31 | &emsp;+- `milestone`（持ち主 `graphicPart`） | タスクのマイルストーンマーク。 | 無し |

| 案 | 中身 |
|---|---|
| **a（推奨）** | `planBar`・`actualBar`・`milestoneMark` にする。画面の群の語のキーと同じ名になる |
| b | 今のまま |

##### 問 6-10-2. マイルストーンの 15 の形の名 —— 値・アイコン・日本語の名を 1 つに

回答:

場面: マイルストーンの 15 の形（`milestoneShape` の値）。画面では、マイルストーンの形のパレットのアイコンで選ぶ（仕様書の表 T-012 の `SH-5`）。1 つの形が、3 つの所に名を持ちます: GRS JSON の値、パレットのアイコンの名（`milestone…Icon`）、仕様書が並べる日本語の名。

数え方: 値は src の `grs-json-schema.ts` の列挙、アイコンの名は辞書の下書き `glossary.json`、日本語の名は仕様書の `SH-5` の行から取った。

| # | 値（GRS JSON） | アイコンの名 | 今の日本語の名 | 席の案（英語 / 日本語） |
|:---|:---|:---|:---|:---|
| 2 | `circle` | `milestoneCircleIcon` | 〇 | `circle` / 円 |
| 3 | `hexagon` | `milestoneHexagonIcon` | 六角形 | `hexagon` / 六角形 |
| 4 | `pentagon` | `milestonePentagonIcon` | 五角形 | `pentagon` / 五角形 |
| 5 | `diamond` | `milestoneDiamondIcon` | ◇ | `diamond` / ひし形 |
| 6 | `square` | `milestoneSquareIcon` | □ | `square` / 正方形 |
| 7 | `star` | `milestoneStarIcon` | ☆ | `star` / 星 |
| 8 | `triangleUp` | `milestoneTriangleUpIcon` | △ | `triangleUp` / 上向き三角 |
| 9 | `triangleDown` | `milestoneTriangleDownIcon` | ▽ | `triangleDown` / 下向き三角 |
| 10 | `file` | `milestoneFileIcon` | ファイル | `file` / ファイル |
| 11 | `box` | `milestoneBoxIcon` | ボックス | `box` / 箱 |
| 12 | `floppyDisk` | `milestoneFloppyDiskIcon` | フロッピー | `floppyDisk` / フロッピーディスク |
| 13 | `cylinder` | `milestoneCylinderIcon` | 円筒 | `cylinder` / 円筒 |
| 14 | `person` | `milestoneMeetingPeopleIcon` | 会議の人 | `meetingPeople` / 会議の人 |
| 15 | `smile` | `milestoneSmilingFaceIcon` | 嬉しい顔 | `smilingFace` / 笑顔 |
| 16 | `beerMug` | `milestoneBeerMugIcon` | ビールジョッキ | `beerMug` / ビールジョッキ |

意味の根拠:

- 1 つの形に 1 つの名を当てます。値・アイコン・日本語の名が同じ物を同じ名で呼べば、読む人は 3 つを結び付けて覚える必要がありません。
- 名は、描く物の名詞にします。`smile`（笑う、笑い）は動きの語で、描く物は笑った顔なので `smilingFace` にします。`person`（1 人の人）は、画面の名「会議の人」とアイコンの名が示す絵（会議をする人たち）より狭いので、`meetingPeople` にします。
- 日本語の名は記号でなく言葉にします。〇・◇・□・☆・△・▽ は字として読めず、辞書の名にも検索にも使いにくいからです。
- 「嬉しい顔」は、ふつう「笑顔」と呼びます（絵文字の名 smiling face の訳も笑顔）。「ボックス」と「フロッピー」は、ほかの名と同じく和語か正式な名（箱・フロッピーディスク）にそろえます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | **表の「席の案」の名にそろえる。** 15 の形それぞれで、値・アイコン・日本語の名を、描く物の名 1 つにそろえる（例: `circle` 円、`smilingFace` 笑顔） |
| b | 英語は表の案、日本語の名は今のまま（記号を残す）。〇・◇ は画面のアイコンの形そのままで、利用者がすぐ照らし合わせられる |
| c | 今のまま |
| d | 直す所を書く（表のセルに ★） |

##### 問 6-10-3. 「前の予定」「変更前予定輪郭」を「前回予定」に

回答:

場面: 前回予定のタスクを、型と配列が持ちます。

- `JDG-3434` で、`baseline` の日本語は「前回予定」にしました。「変更前の予定」「前回の予定」は使いません。
- 「前の予定」は前回予定（`JDG-3434`）を指すが、名がそれを言い切らない。
- この群に残っている字: 「前の予定」4 か所（`uid`（持ち主 `BaselineTask`）・`BaselineTask`・`isBaselineOutlineVisible`・`baselineTasks`）、「前のタスク」1 か所、「変更前予定輪郭」2 か所、見出し「変更前の予定」（Part 9・10 の題）。
- 「変更前予定輪郭」は、画面の群の語 `baselineOutline` の名です（`JDG-3373`。`JDG-3434` より前の裁定）。

| # | キー | 直した意味の案 | MSPDI の名 |
|---|---|---|---|
| 23 | `uid`（持ち主 `BaselineTask`） | 前回予定でのタスクの uid。GRS は同じ uid を持つ今のタスクと突き合わせる。 | 無し |
| 24 | `BaselineTask` | 前回予定の 1 つのタスク。GRS は uid で今のタスクと突き合わせ、今のタスクの上に前回予定輪郭としてだけ描く。 | 無し |
| 13-30 | `baselineTasks` | 前回予定。前回予定のタスクの日時を保存した写し。GRS は uid で写しを今のタスクと突き合わせ、比べるために今のタスクの上に前回予定輪郭として描く。 | 無し |
| 12-33 | `isBaselineOutlineVisible` | GRS が前回予定（baselineTasks）を今のタスクに重ねて描くかどうか。新しいスケジュール文書は偽で始まる。（表に残し、字だけ変わる） | 無し |

見出しは「タスクの描き方・取り込み元・前回予定」になります。

| 案 | 中身 |
|---|---|
| **a（推奨）** | 「前回予定」と「前回予定輪郭」にする。画面の群の `baselineOutline` の名も、画面のパートで「前回予定輪郭」にする案を出す |
| b | 「前回予定」だけ直す。「変更前予定輪郭」は画面のパートで問う |
| c | 今のまま |

##### 問 6-10-4. 前の席が付けた名 —— 取り込みと線先の 3 つ

回答:

場面: 取り込みの数とコメントボックスの線先を、3 つの名が表します。

- 3 つとも α の名を改めた名です。名を言った裁定の行は 0 です（`dateTime`・`point` の字を含む行はあるが、日時の書き方 `xsd:dateTime` と、ファイルの名の中の字で、このキーの名ではない）。

| # | キー | 前の名 | 意味（日本語） | 決めた所 | 案 | MSPDI の名 |
|---|---|---|---|---|---|---|
| 21 | `lastSeenImportNumber` | `lastSeenImportSequence` | 取り込んだ MSPDI のファイルの中にこのタスクを見つけた、最後の取り込みの project.lastImportNumber。 | CHOICE N8（`lastImportNumber` と対） | 採る | 無し |
| 27 | `dateTime` | `anchorDate` | 時間軸の上で線先が立つ時点。 | CHOICE N12 | 採る（型 `DateTime` と同じ綴りだが、値はその型） | 無し |
| 32 | `point` | `anchorSnapPoint` | 線先が吸着する、対象の 8 つの点のどれか。4 つの角と、4 つの辺の中点。 | 所見 F30 | `snapPoint` にする（point だけでは何の点か分からない） | 無し |

| 案 | 中身 |
|---|---|
| **a（推奨）** | 表の案のとおり（2 つは採り、`point` は `snapPoint`） |
| b | 3 つとも今のまま |
| c | 直す所を書く |

##### 問 6-10-0. Part 10 の残りの 17 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 1 | <span style="color: #0550AE">`milestoneShape`</span> |  | マイルストーンマークの形。Task.milestone が真のタスクすべてが持ち、そのタスクだけが持つ。（`JDG-3311`） | 無し |
| 17 | <span style="color: #0550AE">`TaskGraphicStyle`</span> |  | GRS がタスクのタスク図形をどう描くか。形、色、バーの輪郭の太さ。どのタスクもちょうど 1 つの TaskGraphicStyle を持つ。（`JDG-3384`） | 無し |
| 18 | <span style="color: #0550AE">`sourceProjectId`</span> |  | GRS がこのタスクを取り込んだ元の MSPDI のファイルの Project/UID。GRS はこの値を、元のファイルが Project/UID を持つときだけ書く。（`JDG-2683`） | 無し |
| 19 | `sourceUid` |  | GRS がタスクを取り込んだ元の MSPDI のファイルでの、そのタスクの UID。 | 無し |
| 20 | `importSessionId` |  | タスクを持ち込んだ取り込みの id。GRS はこの id を取り込みのたびに新しく作る。MSPDI のファイルが Project/UID を省いたときは、この id が sourceProjectId の代わりを務める。 | 無し |
| 22 | `TaskOrigin` |  | 取り込んだタスクがどこから来たか。GRS が同じ MSPDI のファイルを再び取り込んだとき、写しを足す代わりにそのタスクを更新するために、GRS はこの記録を持つ。 | 無し |
| 25 | <span style="color: #0550AE">`laneFraction`</span> |  | そのタスクグループのタスクグループレーンの中での、線先の高さ。0 は上の縁、1 は下の縁。（`JDG-3381`） | 無し |
| 26 | <span style="color: #0550AE">`LeaderAnchorFallback`</span> |  | 線先の対象が消えたときに、線先が移る所。タスクグループと、そのタスクグループレーンの中での高さ。（`JDG-3381`） | 無し |
| 28 | <span style="color: #0550AE">`graphicPart`</span> |  | 線先が吸着するタスク図形の部分。予定バー、実績バー、マイルストーンマークのどれか。（`JDG-3381`） | 無し |
| 33 | &emsp;+- `topLeftCorner`（持ち主 `point`） |  | 左上の角。 | 無し |
| 34 | &emsp;+- `topMiddle`（持ち主 `point`） |  | 上の辺の中点。 | 無し |
| 35 | &emsp;+- `topRightCorner`（持ち主 `point`） |  | 右上の角。 | 無し |
| 36 | &emsp;+- `rightMiddle`（持ち主 `point`） |  | 右の辺の中点。 | 無し |
| 37 | &emsp;+- `bottomRightCorner`（持ち主 `point`） |  | 右下の角。 | 無し |
| 38 | &emsp;+- `bottomMiddle`（持ち主 `point`） |  | 下の辺の中点。 | 無し |
| 39 | &emsp;+- `bottomLeftCorner`（持ち主 `point`） |  | 左下の角。 | 無し |
| 40 | &emsp;+- `leftMiddle`（持ち主 `point`） |  | 左の辺の中点。 | 無し |

---

#### Part 11 / 43 —— GRS JSON / 注記・文書の刻印と変更ログ・文書の設定（38 語）

（見出しの「刻印」「変更ログ」「文書の設定」は、問 6-11-1・6-11-2 で直します。）

##### 問 6-11-1. 「文書スタンプ」か「刻印」か

回答:

場面: 文書が最後に変わった時・最後に保存した時・最後に書いた者の 3 つをまとめた物。Agent API の書き込みで照らす stamp と同じ物です（`JDG-3333`）。

- `JDG-3365`: 「`Document Stamp` の日本語は「文書スタンプ」」。
- 確定した Part 2 の `stamp`（`JDG-3430`）の日本語は「刻印」です。
- 仕様書と辞書は「刻印」と書く。「刻印」は、最後の変更・保存・書いた者をまとめた値を指す。
- この群では、`documentStamp` の意味「文書の刻印。」、見出し「文書の刻印と変更ログ」、`ScheduleDocument` の意味の「文書の刻印」の 3 か所に、この字があります。

| # | キー | a のときの意味の案 | MSPDI の名 |
|---|---|---|---|
| 13-37 | <span style="color: #0550AE">`documentStamp`</span> | 文書スタンプ。最後に変わった時刻と最後に保存した時刻、スケジュール文書を最後に書いた者。（`JDG-3333`） | 無し |

| 案 | 中身 |
|---|---|
| **a（推奨）** | 「文書スタンプ」にそろえる。確定した `stamp` の日本語も「スタンプ」に改める。仕様書と辞書の「刻印」も、`CR-857` で「スタンプ」にそろえる。スタンプ: 日時と書いた者を押した印 |
| b | 「刻印」にそろえる（`JDG-3365` を改める）。名は「文書刻印」（名に「の」を挟まない `JDG-3365`）。刻印は、いつ・誰がを消えない印として残す語で、stamp が指す値に合う |

##### 問 6-11-2. 「変更履歴」と「文書設定」

回答:

場面: スケジュール文書の 2 つの部分が、日本語の名を持ちます。

| # | キー | 今の字 | 案 | 根拠 |
|---|---|---|---|---|
| 13-38 | <span style="color: #0550AE">`changeLogEntries`</span> | 変更ログ | 変更履歴 | `JDG-3332` で、画面の入口は「変更履歴」のボタンと「変更履歴ウインドウ」（利用者の言葉）。`JDG-3353` の「変更の記録」は、名に「の」を挟まない `JDG-3365` に合わない |
| 13-21 | `documentSettings` | 文書の設定 | 文書設定 | `JDG-3353` は「文書の設定」と呼んだが、その後の `JDG-3365` が、名に「の」を挟まないと決めた |

a のときの意味の案:

| # | キー | 意味の案 | MSPDI の名 |
|---|---|---|---|
| 13-38 | <span style="color: #0550AE">`changeLogEntries`</span> | 変更履歴。人や AI がスケジュール文書への変更について書いた記録で、古いものが先。新しい記録は末尾に足す。（`JDG-3332`・`JDG-3333`） | 無し |
| 13-21 | `documentSettings` | 文書設定。スケジュール文書を開いたとき、GRS がそれをどう描くか。GRS は値を持つキーを、既定の値であってもすべて書く。 | 無し |

見出しは、問 6-11-1 が a なら「文書スタンプと変更履歴」「文書設定」になります。

| 案 | 中身 |
|---|---|
| **a（推奨）** | 2 つとも案のとおり |
| b | 「変更ログ」「文書の設定」のまま |
| c | 直す所を書く |

##### 問 6-11-3. 前の席が付けた名 —— 注記と文書の 6 つ

回答:

場面: 線先の型の中身と、文書スタンプ・変更履歴の型を、6 つの名が表します。

- 6 つとも、名を言った裁定の行は 0 です（`DocumentStamp`・`ChangeLogEntry` の字を含む行は 1 つずつあるが、利用者の問いの中の字と、着地の欄の字で、名を決めた行ではない）。

| # | キー | 前の名 | 意味（日本語） | 決めた所 | MSPDI の名 |
|---|---|---|---|---|---|
| 1 | `fallback` | （無し） | 線先の対象（タスクかハイライトボックス）が消えたときに、線先が移る所。 | 所見 F30 | 無し |
| 4 | &emsp;+- `freePoint`（持ち主 `LeaderAnchor`） | （無し。前は 7 つの列を平らに持った） | タスクグループレーンの中の自由点（タスクにもハイライトボックスにも属さない点）。 | 所見 F30 | 無し |
| 21 | `documentUpdatedAt` | `settingsUpdatedAt` | スケジュール文書が、スケジュールデータか documentSettings で最後に変わった時。 | 所見 F48（どちらの部分が変わっても進む） | 無し |
| 28 | `Writer` | （無し。前は文字列） | 書いた者。GRS の画面で操作する人、同梱の起動時のテンプレート、Agent API の呼び手のどれか。（直した。前は「GRS の中の人」） | 所見 F49 | 無し |
| 30 | `DocumentStamp` | `documentStamp`（`$defs`） | スケジュール文書が最後に変わった時、GRS が最後に保存した時、最後に書いた者。（→ 問 6-11-1） | CHOICE N14（`$defs` の名を PascalCase に。文書の中のキー `documentStamp` は残る `JDG-3333`） | 無し |
| 37 | `ChangeLogEntry` | `changeLog`（`$defs`） | スケジュール文書への 1 つの変更についての記録。いつ、誰が、どの部分を、何を、なぜ、そのほか。 | `JDG-3332` の 1 件を表す型（型の名は前の席） | 無し |

| 案 | 中身 |
|---|---|
| **a（推奨）** | `fallback`（線先の対象が消えたときの移り先）・`freePoint`（タスクグループレーンの中の自由点）・`documentUpdatedAt`（スケジュール文書が最後に変わった時）・`Writer`（書いた者）・`DocumentStamp`（最後の変更・保存・書いた者をまとめた値）・`ChangeLogEntry`（変更履歴の 1 件）を、表の意味のとおり採る |
| b | 直す所を、キーと意味で書く |

##### 問 6-11-0. Part 11 の残りの 32 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 2 | <span style="color: #0550AE">`highlightBoxId`</span> |  | 線先が吸着するハイライトボックスの id。（`JDG-2685`） | 無し |
| 3 | `kind`（持ち主 `LeaderAnchor`） |  | freePoint: タスクグループレーンの中の自由点（タスクにもハイライトボックスにも属さない点）。task: タスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか。highlightBox: ハイライトボックスの 8 つの点のどれか。 | 無し |
| 5 | &emsp;+- `task`（持ち主 `LeaderAnchor`） |  | タスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか。 | 無し |
| 6 | &emsp;+- `highlightBox`（持ち主 `LeaderAnchor`） |  | ハイライトボックスの 8 つの点のどれか。 | 無し |
| 7 | <span style="color: #0550AE">`LeaderAnchor`</span> |  | コメントボックスの引出し線が指す所。kind で、自由点、タスク、ハイライトボックスのどれかを選ぶ。（`JDG-3381`） | 無し |
| 8 | `dx` |  | bodyOffsetPx の横の成分。正の値は箱を右へ動かす。 | 無し |
| 9 | `dy` |  | bodyOffsetPx の縦の成分。GRS と同じく、正の値は箱を下へ動かす。 | 無し |
| 10 | `bodyOffsetPx` |  | 線先から、コメントボックスの本文の箱の左下の角までのずれ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。 | 無し |
| 11 | <span style="color: #0550AE">`leaderAnchor`</span> |  | コメントボックスの引出し線が指す所。タスクグループレーンの中の自由点か、引出し線が吸着したタスクやハイライトボックスの点。吸着した線先は、対象が消えたときの移り先も持つ。（`JDG-3381`） | 無し |
| 12 | `text`（持ち主 `CommentBox`） |  | コメントボックスの文。この値を省くと本文は空。 | 無し |
| 13 | `textColor` |  | コメントボックスの文字の色。 | 無し |
| 14 | `fontSizePx` |  | コメントボックスの文字の大きさ。値は displayScalePercent が 100 のときの CSS ピクセルで表す。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。箱を置くときは 10 を書く。 | 無し |
| 15 | <span style="color: #0550AE">`CommentBox`</span> |  | 1 つのコメントボックス。線先は、自由点（時点・タスクグループ・そのタスクグループレーンの中の高さ）か、吸着したタスクやハイライトボックスの 8 つの点のどれかに立つ。（`JDG-3371`） | 無し |
| 16 | `topTaskGroupId` |  | 箱の上の縁にあるタスクグループ。 | 無し |
| 17 | `bottomTaskGroupId` |  | 箱の下の縁にあるタスクグループ。 | 無し |
| 18 | `cornerRadiusPx` |  | ハイライトボックスの角の丸みの半径。値は displayScalePercent が 100 のときの CSS ピクセルで表し、0 は四角い角。displayScalePercent に従って拡大縮小し、ズームの倍率とは別に決まる。箱を置くときは 4 を書く。 | 無し |
| 19 | `HighlightBox` |  | 1 つのハイライトボックス。日付の範囲とタスクグループの範囲を囲む。 | 無し |
| 20 | <span style="color: #0550AE">`scheduleDataUpdatedAt`</span> |  | スケジュールデータが最後に変わった時。watchChanges はこの時刻だけを見る。（`JDG-3380`） | 無し |
| 22 | `fileSavedAt` |  | GRS がスケジュール文書を最後に保存した時（UTC）。GRS は初めて保存したときに、この値を初めて書く。 | 無し |
| 23 | <span style="color: #0550AE">`kind`</span>（持ち主 `Writer`） |  | user: GRS の画面で操作する人。template: 同梱の起動時のテンプレート。agent: Agent API の呼び手。（`JDG-3275`） | 無し |
| 24 | &emsp;+- <span style="color: #0550AE">`user`</span>（持ち主 `Writer`） |  | GRS の画面で操作する人。（`JDG-3275`） | 無し |
| 25 | &emsp;+- `template`（持ち主 `Writer`） |  | 同梱の起動時のテンプレート。 | 無し |
| 26 | &emsp;+- `agent`（持ち主 `Writer`） |  | Agent API の呼び手。 | 無し |
| 27 | `name`（持ち主 `Writer`） |  | Agent API の呼び手が自分に付けた名前。 | 無し |
| 29 | `lastEditedBy` |  | スケジュール文書を最後に書いた者。GRS の画面で操作する人は {"kind":"user"}、同梱の起動時のテンプレートは {"kind":"template"}、Agent API の呼び手は {"kind":"agent","name":...}。 | 無し |
| 31 | <span style="color: #0550AE">`changedAt`</span> |  | 変更が起きた時（UTC）。GRS は記録を足した時刻を入れ、人はその時刻を変えてよい。（`JDG-3332`） | 無し |
| 32 | <span style="color: #0550AE">`changedBy`</span> |  | 変更をした者。人が打った名前か、AI が自分に付けた名前。（`JDG-3332`） | 無し |
| 33 | <span style="color: #0550AE">`affectedArea`</span> |  | 変更がスケジュール文書のどの部分に及んだか。（`JDG-3332`） | 無し |
| 34 | <span style="color: #0550AE">`changeDescription`</span> |  | 何が変わったか。（`JDG-3332`） | 無し |
| 35 | <span style="color: #0550AE">`reason`</span>（持ち主 `ChangeLogEntry`） |  | 変更の理由。（`JDG-3332`） | 無し |
| 36 | <span style="color: #0550AE">`note`</span> |  | 変更についてのそのほかのこと。（`JDG-3332`） | 無し |
| 38 | <span style="color: #0550AE">`displayScalePercent`</span> | 表示の\|倍率 | スケジュールキャンバスの描画の表示の倍率（パーセント）。100 では、名前が Px で終わるプロパティの値をすべてその数の CSS ピクセルで描き、50 ではそれを半分の大きさで描く。形と文字を一緒に拡大縮小する。アプリヘッダー・コマンドパレット・ブラウザーのズームは、この値を変えても同じ大きさを保つ。（`JDG-3292`） | 無し |

---

#### Part 12 / 43 —— GRS JSON / 文書の設定（39 語）

##### 問 6-12-1. 設定の欄の名が、後の裁定に追いついていない

回答:

場面: 設定の欄に出る名（画面の語）を、辞書の日本語の名が写しています。

- `display-words.json` の注は、「どの語も利用者が書く。エージェントは語を作らない」と言います。だから、直すかどうかを 1 行ずつ見てください。
- 下の名は、その後の裁定と食い違います。

| K 行 | キー | 今の名（日本語 / 英語） | 案 | 根拠 |
|---|---|---|---|---|
| `K-78` | `isProgressMarkVisible` | 進捗マーカー / Progress Marker | 進捗マーク / Progress Mark | `JDG-3372`（「マーカー」と書かない） |
| `K-84` | `isBaselineOutlineVisible` | 変更前の予定を重ねるか / Baseline | 前回予定を重ねるか / Baseline | `JDG-3434` |
| `K-141` | `fitSpan` | 全体表示時の期間 / Fit Span | 全体表示期間 / Fit Span | `JDG-3376`（Fit Span は全体表示期間） |
| `K-142` | `isFixed` | 全体表示時の期間を固定する / Fix the fit span | 全体表示期間を固定する / Fix the fit span | `JDG-3376` |
| `K-122` | `isPlanBarVisible` | 予定の表示 / Plan | 予定バー / Plan Bar | キーは Plan Bar（`JDG-3382`）。画面の語 `planBar` は「予定バー」。ほかの欄（担当ラベル・依存線・イナズマ線）も描く物の名 |
| `K-123` | `isActualBarVisible` | 実績の表示 / Actual | 実績バー / Actual Bar | 同じ |
| `K-67` | `dayWidthPx` | 横のズーム倍率 / Horizontal Zoom | 1 日の幅 / Day Width | 値は倍率でなく、1 日の幅の px（`JDG-3292`）。推奨: 1 日の幅。欄が倍率を見せるなら、別の行で問う |
| `K-83` | `isGroupGridLinesVisible` | グループ罫線（TaskGroup 境界の横線） | グループ罫線（タスクグループ境界の横線） | 日本語の名に、英語の型の名が入っている |
| `K-110` | `pinnedTaskGroupIds` | ピン止めの対象 / Pinned Task Groups | ピン止めしたタスクグループ / Pinned Task Groups | 画面の語 `pinnedTaskGroup`（`U-46`）と同じ名 |
| `K-144` | `viewTimeZone` | 本プロジェクトの基準タイムゾーン / Project Base Time Zone | 表示の基準タイムゾーン / Display Base Time Zone | キーは「見せる」時計（`S-574` の「見せる基準」）。スケジュールデータの時計は `scheduleDataTimeZone` で、別の物 |
| `K-86` | `lastImportNumber`（Part 8） | 取り込みの連番 / importSequence | 取り込みの連番 / Last Import Number | 英語の名が、α のキーのまま（CHOICE N8 で改名した） |

（名の「|」は、問 6-8-2 のとおり除いて書きました。）

| 案 | 中身 |
|---|---|
| **a（推奨）** | 表の案で直す。`display-words.json` の名と辞書の名を、同じ字にそろえる（`CR-857`） |
| b | 行ごとに直す所を書く |
| c | 今のまま（画面の語のパートで問い直す） |

##### 問 6-12-2. 前の席が付けた名 —— 開いた時の位置とタイムゾーンの 12 語

回答:

場面: スケジュール文書を開いたときにビューがどこから始まるかと、追加の時計に、12 語の名があります。

- 12 語とも、名を言った裁定の行は 0 です。
- 表示の位置の 4 つは、前の席が 1 つの入れ物 `scrollPosition` にまとめました（`doc-shape-choices.md` の CHOICE N4。値でない状態の語 `notDecided` は `JDG-3302`・`JDG-3309`）。
- 日本語の名（画面の欄の名 `K-69`・`K-70`・`K-120`・`K-121`）は、利用者が書いた今の名です。

| # | キー | 前の名 | 日本語の名（画面） | 意味（日本語） | 決めた所 | MSPDI の名 |
|---|---|---|---|---|---|---|
| 10 | &emsp;+- `placed`（持ち主 `scrollPosition`） | （無し） |  | ほかのキーが場所を与える。 | 席が値の名を付けた | 無し |
| 11 | `leftEdgeDay` | `scrollDate` | 表示の\|左端が\|指す\|日付 | ビューの左の端にある日。 | CHOICE N4 | 無し |
| 12 | `leftEdgeDayFraction` | `scrollDateFraction` | 表示の\|左端が\|指す\|日の\|どこに\|あるか | 左の端が leftEdgeDay の中のどこにあるか。その日の割合で表し、0 は日の始まり。 | CHOICE N4・`JDG-3297`（Fraction） | 無し |
| 13 | `topEdgeTaskGroupId` | `scrollTaskGroupId` | 表示の\|上端が\|指す\|タスクグループ | ビューの上の端にあるタスクグループ。そのタスクグループが消えたら、scrollPosition は notDecided になる。 | CHOICE N4 | 無し |
| 14 | `topEdgeTaskGroupFraction` | `scrollTaskGroupFraction` | 表示の\|上端が\|指す\|タスクグループの\|どこに\|あるか | 上の端がそのタスクグループの中のどこにあるか。タスクグループの 1 段分（タスクグループレーンの高さと下の隙間）に対する割合でこの位置を表し、0 はタスクグループレーンの上の端。 | CHOICE N4・`JDG-3297` | 無し |
| 15 | `scrollPosition` | （無し。4 つを平らに持った） |  | スケジュール文書を開いたときにビューがどこから始まるか。notDecided は GRS に選ばせ、placed は左の端の日と上の端のタスクグループを与える。 | CHOICE N4 | 無し |
| 16 | `isFixed` | `isFitSpanFixed` | 全体表示時の\|期間を\|固定する（→ 問 6-12-1） | 真なら、GRS は全体表示と PNG・SVG の書き出しで、描くものすべての代わりに全体表示期間を出す。スケジュール文書を開くとき、GRS はビューを全体表示期間へ動かす手順を省く。（直した。前は「全体表示時の期間」`JDG-3376`） | 所見 F54（`fitSpan` の中へ入れた） | 無し |
| 21 | `offset`（持ち主 `viewTimeZone`） | （無し） |  | GRS がスケジュールキャンバスを出す UTC オフセット。 | 所見 F13 | 無し |
| 23 | `offset`（持ち主 `displayTimeZones`） | （無し） |  | この追加の時計の UTC オフセット。 | 所見 F13 | 無し |
| 24 | `observance` | （無し） |  | この時計が、標準時のゾーン名か夏時間のゾーン名かを選ぶ。この値は GRS が出すゾーンの名前を選ぶだけで、GRS は 1 年中オフセットそのものを使う。 | 所見 F13（略称の行を選ぶ） | 無し |
| 25 | &emsp;+- `standard`（持ち主 `observance`） | （無し） |  | そのオフセットの標準時のゾーン。 | 所見 F13 | 無し |
| 26 | &emsp;+- `daylight`（持ち主 `observance`） | （無し） |  | そのオフセットの夏時間のゾーン。 | 所見 F13 | 無し |

| 案 | 中身 |
|---|---|
| **a（推奨）** | `leftEdgeDay`（ビューの左端の日）・`leftEdgeDayFraction`・`topEdgeTaskGroupId`・`topEdgeTaskGroupFraction`・`scrollPosition`・`placed`・`isFixed`・`offset`・`observance`・`standard`・`daylight` を、表の意味のとおり採る。根拠: この値は標準時か夏時間かを選ぶもので、季節ではない。iCalendar（RFC 5545）は、この 2 つを observance と呼ぶ |
| b | `observance` の代わりに `season` を使い、ほかは a と同じにする。根拠: 日常の語で、標準時か夏時間かを思い浮かべやすい |
| c | 直す所を、キーと意味で書く |

##### 問 6-12-0. Part 12 の残りの 27 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 1 | <span style="color: #0550AE">`fontSizeStep`</span> | 文字サイズ | スケジュールキャンバスの文字の大きさの段。small・medium・large で、displayScalePercent が 100 のとき 7.5・8.75・10 CSS ピクセル。GRS はスケジュール文書をこの段で開く。段を変えた読み手は、スケジュール文書を編集したことになる。（`JDG-3295`） | 無し |
| 2 | &emsp;+- <span style="color: #0550AE">`small`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 7.5 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 3 | &emsp;+- <span style="color: #0550AE">`medium`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 8.75 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 4 | &emsp;+- <span style="color: #0550AE">`large`</span>（持ち主 `fontSizeStep`） |  | displayScalePercent が 100 のとき 10 CSS ピクセルの文字。（`JDG-3295`） | 無し |
| 5 | <span style="color: #0550AE">`dayWidthPx`</span> | 横の\|ズーム\|倍率 | 時間軸の上の暦日 1 日の幅。値は displayScalePercent が 100 のときの CSS ピクセルで表す。全体表示をすると、GRS は描くものすべて（または固定した全体表示期間）がタスクグループレーンの幅に収まるようにこの値を決める。（→ 問 6-12-1）（`JDG-3292`） | 無し |
| 6 | <span style="color: #0550AE">`verticalZoomRatio`</span> | 縦の\|ズーム\|倍率 | タスク図形の縦の大きさの、既定の大きさに対する比。1 が既定の大きさで、2 では予定バー・実績バー・名称ラベルを 2 倍の高さで描く。（`JDG-3296`） | 無し |
| 7 | <span style="color: #0550AE">`taskGroupAutoExpandDepth`</span> |  | treeState が auto のタスクグループを、どの深さまで開くか。最上位のタスクグループが深さ 1。値が N のとき、GRS は深さ N までのタスクグループを開き、深さ N + 1 までの行を出す。0 のとき、GRS は最上位のタスクグループだけを閉じた形で出す。（`JDG-3296`） | 無し |
| 8 | `kind`（持ち主 `scrollPosition`） |  | notDecided: GRS がスケジュール文書を開くときに場所を選ぶ。placed: ほかのキーが場所を与える。 | 無し |
| 9 | &emsp;+- <span style="color: #0550AE">`notDecided`</span>（持ち主 `scrollPosition`） |  | GRS がスケジュール文書を開くときに場所を選ぶ。（`JDG-3302`・`JDG-3309`） | 無し |
| 17 | <span style="color: #0550AE">`fitSpan`</span> | 全体表示時の\|期間 | 全体表示期間。firstDay から lastDay まで（両端を含む）の日の範囲で、isFixed が真なら、GRS は全体表示と PNG・SVG の書き出しで、描くものすべての代わりにこれを出す。この値を省くと全体表示期間は未指定になる。（→ 問 6-12-1）（`JDG-3376`） | 無し |
| 18 | `kind`（持ち主 `viewTimeZone`） |  | sameAsScheduleData: スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。fixed: ここで与えたオフセットを出す。 | 無し |
| 19 | &emsp;+- <span style="color: #0550AE">`sameAsScheduleData`</span>（持ち主 `viewTimeZone`） |  | スケジュールデータのタイムゾーンを出し、それが変わればそれに従う。（`JDG-3302`） | 無し |
| 20 | &emsp;+- `fixed`（持ち主 `viewTimeZone`） |  | ここで与えたオフセットを出す。 | 無し |
| 22 | <span style="color: #0550AE">`viewTimeZone`</span> | 本プロジェクトの\|基準\|タイムゾーン | タイムルーラーと、出す日時が使うタイムゾーン。sameAsScheduleData は project.scheduleDataTimeZone に従い、fixed はここで与えたオフセットを使う。（→ 問 6-12-1）（`JDG-2691`） | 無し |
| 27 | <span style="color: #0550AE">`displayTimeZones`</span> | 表示する\|タイムゾーン | 最大 4 つの追加の時計。GRS が時刻を出しているあいだ、追加の時計をそれぞれタイムルーラーの下の 1 行として出す。（`JDG-2691`） | 無し |
| 28 | `isTimeOfDayVisible` | 時刻を\|表示する | GRS がスケジュールキャンバスに時刻を出すかどうか。保存した日時はどちらでも時刻を持ち続ける。新しいスケジュール文書は偽で始まる。 | 無し |
| 29 | <span style="color: #0550AE">`isPlanBarVisible`</span> | 予定の表示 | GRS が予定バーを出すかどうか。isActualBarVisible とは別に決める。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`） | 無し |
| 30 | `isPlanDatesVisible` | 名称ラベルに\|添える\|予定日 | GRS が各名称ラベルの右に予定の日時を出すかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 31 | <span style="color: #0550AE">`isActualBarVisible`</span> | 実績の表示 | GRS が実績バーを出すかどうか。isPlanBarVisible とは別に決める。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`） | 無し |
| 32 | <span style="color: #0550AE">`isPercentCompleteLabelVisible`</span> | 完了率ラベル | GRS が各タスクの完了率ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`） | 無し |
| 33 | <span style="color: #0550AE">`isBaselineOutlineVisible`</span> | 変更前の\|予定を\|重ねるか | GRS が前の予定（baselineTasks）を今のタスクに重ねて描くかどうか。新しいスケジュール文書は偽で始まる。（→ 問 6-10-3・問 6-12-1）（`JDG-3382`） | 無し |
| 34 | `isProgressLineVisible` | イナズマ線 | GRS がイナズマ線を描くかどうか。イナズマ線は、基準日から各タスクのタスク進捗点を通る線。新しいスケジュール文書は偽で始まる。 | 無し |
| 35 | <span style="color: #0550AE">`isProgressMarkVisible`</span> | 進捗マーカー | GRS が進捗マークと再開マークを描くかどうか。遅延診断を出しているあいだは、この値が偽でも進捗マークを描く。新しいスケジュール文書は真で始まる。（→ 問 6-12-1）（`JDG-3382`） | 無し |
| 36 | <span style="color: #0550AE">`isDependencyLineVisible`</span> | 依存線 | GRS が依存線を描くかどうか。新しいスケジュール文書は真で始まる。（`JDG-3382`） | 無し |
| 37 | <span style="color: #0550AE">`isAssigneeLabelVisible`</span> | 担当ラベル | GRS が各タスクの担当ラベルを出すかどうか。新しいスケジュール文書は偽で始まる。（`JDG-3382`） | 無し |
| 38 | `isDateGridLinesVisible` | 日付罫線\|（日付ごとの\|縦線） | GRS が縦の日付罫線を描くかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 39 | `isGroupGridLinesVisible` | グループ罫線\|（TaskGroup 境界の\|横線） | GRS が、タスクグループレーンとタスクグループパネルで、タスクグループのあいだにグループ罫線を描くかどうか。新しいスケジュール文書は真で始まる。（→ 問 6-12-1） | 無し |

---

#### Part 13 / 43 —— GRS JSON / 文書の設定・スケジュールデータと文書の根（39 語）

このパートには、このパートだけの問いを置かない。パートの終わりに、Part をまたぐ名の被りを 1 つの問い（問 6-13-1）にしました。表から外した 8 語は、前のパートの問いで聞いています: #21・#38 は問 6-11-2、#22・#24・#25・#33 は問 6-7-2、#30 は問 6-10-3、#37 は問 6-11-1。

##### 問 6-13-1. 名や数え方が被る語 —— 4 組

回答:

場面: 別々のパートで、同じ字や似た字を使う語が 4 組あります。

- 4 組とも、意味の文が区別を書いています。

| 組 | 語（Part の #） | 出る所 | 被る点 | 名で区別できるか |
|:---|:---|:---|:---|:---|
| 1 | `note`（Part 11 の #36）と `notes`（Part 9 の #2） | `note` は変更履歴の 1 件の備考（`JDG-3332`）。`notes` はタスクの MSPDI の Notes | 1 字違い。どちらも自由な文字の欄 | 区別しにくい。1 字違いで、名は備考かタスクの注かを言わない |
| 2 | `editGroup`（Part 9 の #27）の「group」と、タスクグループ（Part 9 の #30 `TaskGroup`） | `editGroup` の group は、編集してよい人のグループ。同じ Part 9 の `TaskGroup` の Group は、タスクグループ | 「Group」の字が 2 つの意味を持ち、`editGroup` をタスクグループの名と読める | 区別できない。`editGroup` は、編集してよい人のグループではなく、タスクグループに読める |
| 3 | `levelZeroTreeState` の「段 0」（Part 13 の #7。`JDG-600`・`JDG-2691`）と、`taskGroupAutoExpandDepth` の「深さ」（Part 12 の #7。`JDG-3296`）と、積み段（`JDG-3377`） | 段 0 は最上位のタスクグループの上の頭。深さ 1 は最上位のタスクグループ。Part 12 の #14 は「1 段分」、Part 12 の #1 は「文字の大きさの段」と書く | タスクグループの階層という 1 つの軸を、「段」と「深さ」の 2 語で数える。「段」は積み段・1 段分・文字の大きさの段にも出る | 区別しにくい。「段」と「深さ」は、同じ軸の別の数え方に見える |
| 4 | `id`（Part 7 の #14）と `id`（持ち主 `Project`、Part 8 の #6） | 前者は GRS の行の UUID。後者は MSPDI の Project/UID の字（`JDG-2683` が受けた形） | 同じキー `id` が 2 つの意味を持つ。持ち主で別の語に分けた | 名だけでは区別できない。持ち主（行か `Project` か）が区別を言う |

| 案 | 中身 |
|---|---|
| **a（推奨）** | 今のまま。組 2 は名が曖昧なまま残り、ほかの組は意味の文か持ち主が区別を言う |
| b | 直す組を書く（組の番号と、新しい名）。例: 組 2 の `editGroup` を `editorGroup`（編集者のグループ）にする。表の意味「編集してよいグループの名前」に合う |

##### 問 6-13-0. Part 13 の残りの 31 語 —— 表のとおりでよいか

回答:

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|---|---|---|---|---|
| 1 | `stackDirection` | 積む向き | up は、タスクが右上のゴールへ登るようにタスクグループのタスクを積む。down は、右下のゴールへ下るように積む。新しいスケジュール文書は up で始まる。 | 無し |
| 2 | &emsp;+- `up`（持ち主 `stackDirection`） |  | タスクが右上のゴールへ登るように積む。 | 無し |
| 3 | &emsp;+- `down`（持ち主 `stackDirection`） |  | タスクが右下のゴールへ下るように積む。 | 無し |
| 4 | `isThemeMonochrome` | モノクロに\|するか | テーマがモノクロかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 5 | `taskGroupPanelWidthPx` | タスク\|グループパネルの\|幅 | タスクグループパネルの幅。値は displayScalePercent が 100 のときの CSS ピクセルで表す。 | 無し |
| 6 | `isTaskGroupPanelWidthFixed` | タスクグループ\|パネルの\|幅を\|固定する | taskGroupPanelWidthPx の数が、パネル境界のドラッグの代わりにタスクグループパネルの幅を決めるかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 7 | <span style="color: #0550AE">`levelZeroTreeState`</span> | 段 0 の\|木の\|状態 | タスクグループパネルの頭（段 0）、つまり最上位のすべてのタスクグループの上の状態。collapsed は GRS がすべてのタスクグループの描画を省く。新しいスケジュール文書は auto で始まる。（`JDG-600`・`JDG-2691`） | 無し |
| 8 | &emsp;+- `auto`（持ち主 `levelZeroTreeState`） |  | 最上位のタスクグループを描く。 | 無し |
| 9 | &emsp;+- `collapsed`（持ち主 `levelZeroTreeState`） |  | GRS はすべてのタスクグループの描画を省く。 | 無し |
| 10 | `pinnedTaskGroupIds` | ピン止めの\|対象 | ピン止めしたタスクグループ。遠くのタスクグループと比べるために、タスクグループレーンの上にまとまって残るタスクグループ。この値を省くとピン止めしたタスクグループは 0 件。（→ 問 6-12-1） | 無し |
| 11 | `isScheduleFilterApplied` |  | この表のスケジュールフィルターが掛かっているかどうか。掛かっているあいだ、GRS はこの表のチェックの入った行が選ぶタスクだけを描く。新しいスケジュール文書は偽で始まる。 | 無し |
| 12 | `shownTaskUids` |  | この表の表示の列にチェックが入った行のタスク。この値を省くとチェックの入った行は 0 件。 | 無し |
| 13 | `columnFilters` |  | この表の列のフィルタ。フィルタを掛けた列ごとに 1 つ、この表の列の名前で持つ。この値を省くとフィルタを掛けた列は 0 件。 | 無し |
| 14 | `sort` |  | GRS がこの表をどう並べるか。この値を省くと既定の並び。 | 無し |
| 15 | `shownResourceUids` |  | この表の表示の列にチェックが入った行の担当。この値を省くとチェックの入った行は 0 件。 | 無し |
| 16 | `isUnassignedShown` |  | 担当リストウィンドウの（担当なし）の行にチェックが入っているかどうか。新しいスケジュール文書は偽で始まる。 | 無し |
| 17 | <span style="color: #0550AE">`searchWindow`</span>（持ち主 `tableViews`） |  | 検索ウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`） | 無し |
| 18 | <span style="color: #0550AE">`delayDiagnosisReportWindow`</span>（持ち主 `tableViews`） |  | 遅延診断レポートウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`） | 無し |
| 19 | <span style="color: #0550AE">`resourceListWindow`</span>（持ち主 `tableViews`） |  | 担当リストウィンドウの表をどう出すか。スケジュールフィルター、チェックした行、列のフィルタ、並べ替え。（`JDG-3383`） | 無し |
| 20 | `tableViews` |  | GRS が 3 つの表をどう出すか。検索ウィンドウ、遅延診断レポートウィンドウ、担当リストウィンドウ。 | 無し |
| 23 | `tasks` |  | MSPDI の Tasks と同じ。ただし Task.parentTaskUid と Task.siblingOrder が WBS の木を与える。GRS は MSPDI を書くたびに、その木から ID・OutlineLevel・OutlineNumber・Summary を作る。 | Tasks |
| 26 | `taskGroups` |  | タスクグループ。GRS はそれぞれをタスクグループパネルの 1 行と 1 つのタスクグループレーンとして出す。どのタスクグループがどのタスクを持つかは taskGroupMembers が言う。MSPDI のファイルを読むとき、GRS は WBS からタスクグループを作る。 | 無し |
| 27 | `taskGroupMembers` |  | 各タスクがどのタスクグループに入るか。タスクごとに 1 つ、taskUid から taskGroupId への対応。 | 無し |
| 28 | <span style="color: #0550AE">`taskGraphicStyles`</span> |  | GRS が各タスクのタスク図形をどう描くか（形、色、バーの輪郭の太さ）。タスクごとにちょうど 1 つ。（`JDG-3384`） | 無し |
| 29 | `taskOrigins` |  | 取り込んだ MSPDI のファイルから来たタスクごとの 1 つの記録。どの MSPDI のファイルの、そのファイルのどのタスクか。GRS が後で同じ MSPDI のファイルを取り込んだとき、写しを足す代わりにそのタスクを更新するために、GRS はこの記録を持つ。記録を持つのは、取り込んだタスクだけである。 | 無し |
| 31 | `commentBoxes` |  | タスクグループレーンの中のコメントボックス。各コメントボックスは、タスク・ハイライトボックス・自由点のどれかを指す。 | 無し |
| 32 | `highlightBoxes` |  | ハイライトボックス。タスクグループレーンの中で、日の範囲とタスクグループの範囲を示す矩形。GRS は各ハイライトボックスを枠か塗りか両方で描く。 | 無し |
| 34 | <span style="color: #0550AE">`scheduleData`</span> | <span style="color: #0550AE">スケジュールデータ</span> | スケジュールデータ。MSPDI 由来の部分（GRS が MSPDI へ書き出す）と、GRS 独自の部分（GRS だけが使う）。（`JDG-3380`・`JDG-3353`） | 無し |
| 35 | `schemaVersion`（持ち主 `ScheduleDocument`） |  | この GRS JSON スキーマの形が最後に変わった UTC の時刻（YYYY-MM-DDTHH:MM:SSZ）。 | 無し |
| 36 | <span style="color: #0550AE">`buildVersion`</span> |  | この GRS JSON のファイルを書いた GRS のビルドの時刻（UTC、YYYY-MM-DDTHH:MM:SSZ）。この値は不具合を調べるためだけのもので、GRS JSON のファイルが読めるかを確かめるには schemaVersion を使う。（`JDG-3324`・`JDG-3335`） | 無し |
| 39 | `ScheduleDocument` | <span style="color: #0550AE">スケジュール文書</span> | スケジュール文書: 1 つの GRS JSON のファイル。根に、スキーマの所、スキーマの版、ビルドの版、スケジュールデータ、文書の設定、文書の刻印、変更ログを持つ。（→ 問 6-11-1・問 6-11-2）（`JDG-3353`） | 無し |
