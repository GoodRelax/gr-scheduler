# 名の辞書 —— 出す前の問い（2026-11-15 から）

BGQA2 を約束の面ごとに分けたとき（`JDG-3568`）、まだ出していない問いをここに置いた。利用者はこのファイルを直接は読まない。席は、出す冊（BGQA3〜5）へ 10 問前後ずつ移し、移した問いをここから消す。
2026-10-31 版の古い下書き（Part 7〜13）は、2026-11-13 の巡で作り直して BGQA2 に載せ、その後ここへ移したので、もう残っていない。

## BGQA3 GRS JSON（3 回目以降）（19 問）

### [task] タスクと依存


### [tg] タスクグループ

#### ❓ 問 6-9-7. `hidden` とピン止め

状態: CLOSED-BY JDG-3662（キー `hidden` は帯の `selfShowMode` の値 `hidden` になり、`JDG-3663` で値は 4 つになった。ピン止めとの組み合わせは振る舞いなので、方針で決める（`JDG-3686`））

ほかの 11 語は、あなたの答えで確定しました（`JDG-3554`）。表のあなたの問い（★）に答えます: ピン止めは `treeState` と別の値で、文書の設定がピン止めしたタスクグループの id の並びとして持ちます（仕様書の設定の表の `S-126`）。タスクグループを消すと、GRS はそのピン止めも消します（`CD-2`）。`hidden` とピン止めを両方持つタスクグループをどう見せるかは、GRWB の議論の後でこの問いに案を書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
| :-------- | :-------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------- |
| 9-26 | &emsp;+- `hidden`（持ち主 `treeState`） |  | GRS はこのタスクグループをタスクグループパネルから隠す。 ★ピン止めはどう管理するの？ | 無し |

回答:

### [key] 共通のキー


#### ❓ 問 6-7-0. 共通のキーの 10 語 —— 推奨の表のとおりでよいか

状態: CLOSED-BY JDG-3606（持ち越しの 7 語は `passthrough` 1 つになった）

裁定が 10 語の名をすべて決めました。持ち越しの 7 語は `JDG-3606` が `passthrough` 1 つに改め、`name` は `JDG-3553`・`JDG-3561` が、`taskUid`・`taskGroupId` は参照の決まり N-5（`JDG-3609`）と `JDG-3614`・`JDG-3615` が決めました。

回答:

### [shape] タスクの形

#### ❓ 問 6-9-1. 両端に点のある細い線の名 —— `endpointSpan` を形の名にするか

状態: OPEN（2026-11-22 に持ち主へ出した。持ち主は推しの `dumbbell` を「初耳」とし、外の AI への質問状 `task-shape-naming-request-1.md` と見本の絵 `task-shape-naming-sample.png` で名を探す。答えを待つ）

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

状態: OPEN

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

状態: OPEN（意味の文の「taskStyles の style」は、`JDG-3614` の `grs.style` に直して出す）

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

#### ❓ 問 6-10-5. 見た目の型の名 —— 4 つの `style` の型を何と呼ぶか

状態: OPEN（作り直し 2026-11-22）

場面: タスク・コメントボックス・ハイライトボックス・タスクグループは、見た目をそれぞれの `style` に持ちます。スキーマは、その `style` の値に型の名を付けます。3 つの物は塗りと線の型 `ShapeStyle { fill, stroke }` を共にし、物ごとの足しを `allOf` で書きます（`JDG-3610`）。タスクの見た目は、`JDG-3614` で `taskStyles[]` からタスクの `grs.style` へ移りました。読む AI と開発者は、Agent API の `readSchema` でこの型の名を引きます。

前（`taskStyles[]` の 1 つ。`style` の型は `TaskGraphicStyle`）:

```json
"taskStyles": [ { "taskUid": 7, "style": { "taskShape": "rectangle", "fill": { "color": { "type": "palette", "name": "red" } } } } ]
```

後（タスクの `grs.style`。型の名は案 a）:

```json
"tasks": [ { "uid": 7, "grs": { "style": { "taskShape": "rectangle", "fill": { "color": { "type": "palette", "name": "red" } } } } } ]
```

```json
"$defs": {
  "TaskStyle": { "allOf": [ { "$ref": "#/$defs/ShapeStyle" },
                            { "properties": { "taskShape": {}, "milestoneShape": {} } } ] }
}
```

名を付けるもの: 4 つの `style` の値の型の名（スキーマの `$defs` の名）。JSON のキーと値は変わりません。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `TaskStyle`・`CommentBoxStyle`・`HighlightBoxStyle`・`TaskGroupStyle` | 4 つが「持ち主の型の名 ＋ キーの名 `style`」の 1 つの形でそろう。名が、どの物の `style` かを言う | `JDG-3384` の名 `TaskGraphicStyle` を改める |
| b | `TaskGraphicStyle`（今の名）・`CommentBoxStyle`・`HighlightBoxStyle`・`TaskGroupStyle` | `JDG-3384` の名を保つ | タスクだけが `Graphic` を持ち、4 つの形がそろわない |
| c | 型の名を付けない。各物の `style` の中に `allOf` をじかに書き、名を持つのは `ShapeStyle` だけ | 約束に出る型の名が減る | AI と開発者が `readSchema` で型を名で引けない |

推し: a。
1. 名は指すものを言う（N-2、`JDG-3638` の優先 ⑨）。`style` はいつも描き方を言うので、`Graphic` は何も区別しない（NEIM）。
2. `JDG-3556` は配列の名 `taskGraphicStyles` を `taskStyles` に縮めました。型の名も同じ向きにそろえる（OKPN）。
3. 4 つの名が 1 つの形を持つので、見た目を持つ物が増えても名が 1 つに決まる（MECE）。

回答:

### [origin] 取り込み元

#### ❓ 問 6-10-6. 取り込み元の 2 つの番号 —— 何の uid かを名に書くか

状態: OPEN（`sourceProjectUid` は `JDG-3617` で仮に採った。持ち主は `JDG-3641` で `grs.importOrigin`。`sourceUid` の名が残る）

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

#### ❓ 問 6-10-0. 取り込み元の 2 語 —— 推奨の表のとおりでよいか

状態: OPEN（作り直し 2026-11-22）

場面: GRS は MSPDI のファイルからタスクを取り込むと、そのタスクの `grs.importOrigin` に出どころの控えを書きます（`JDG-3614`・`JDG-3641`）。同じファイルをまた取り込むとき、GRS はこの控えで同じタスクを見つけ、写しを足さずに更新します。

```json
"grs": { "importOrigin": { "sourceProjectUid": "1", "sourceUid": 12,
                           "importSessionId": "8c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
                           "lastSeenMspdiImportCount": 2 } }
```

表から外した語: `importOrigin`（`JDG-3641`）と `lastSeenMspdiImportCount`（`JDG-3649`）は裁定が決めました。`sourceProjectUid` は `JDG-3617` の仮の名で、問 6-13-5 で全体と一緒に確かめます。`sourceUid` は問 6-10-6 で問います。`taskOrigins[]` は `JDG-3614` で無くなりました。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 10-22 | `ImportOrigin`（前の名 `TaskOrigin`） |  | `importOrigin` の値の型。取り込んだタスクが、どの MSPDI のファイルのどのタスクから来たかを持つ。型の名はキーの名にそろえる（`LeaderTarget` と同じ。`JDG-3556`）。 | 無し |
| 10-20 | `importSessionId` |  | タスクを持ち込んだ取り込みの id。GRS は取り込みのたびに新しく作る。MSPDI のファイルが Project/UID を持たないとき、GRS はこの id を `sourceProjectUid` の代わりに使う。 | 無し |

推し: 2 語とも表のとおり。
1. 型の名をキーの名にそろえる形は、`leaderTarget` と `LeaderTarget` で決まっています（`JDG-3556`、OKPN）。
2. `importSessionId` は、何の id か（1 回の取り込み）を名が言います（N-2）。

回答:

### [base] 前回予定

#### ❓ 問 6-10-3. 前回予定の 4 語 —— 「前の予定」「変更前予定輪郭」を「前回予定」にそろえるか

状態: OPEN

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

状態: CLOSED-BY JDG-3647（値は `planBar`・`actualBar`・`milestoneMark`。持ち主のキーは `JDG-3623` で `snapPart`）

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

状態: CLOSED-BY JDG-3623（`point` は `snapPoint` に決まった。`dateTime` は裁定の行を持たないまま構造図に残る）

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

#### ❓ 問 6-11-0. 注記の 12 語 —— 推奨の表のとおりでよいか

状態: OPEN（作り直し 2026-11-22）

場面: 人はコメントボックスを置き、引出し線の先をタスクやハイライトボックスの点に吸着させます。GRS は線の先を `leaderTarget` に書きます。

```json
{ "id": "3f2b8c1e-7a4d-4e9b-9c61-2d5a8e0f4b17",
  "text": "Confirm the date",
  "leaderTarget": { "type": "task", "taskUid": 7, "snapPart": "planBar", "snapPoint": "topRightCorner" },
  "bodyOffsetPx": { "dx": 12, "dy": -24 } }
```

表から外した語（裁定が決めた）: `leaderTarget`・`LeaderTarget`（`JDG-3556`）、`type`（`JDG-3563`）、`freePoint`（`JDG-3547`）、`laneTopOffsetPercent`（`JDG-3556`）、`highlightBoxId`・`taskUid`・`taskGroupId`（N-5、`JDG-3609`）、`snapPart` とその値（`JDG-3623`・`JDG-3647`）、`snapPoint`（`JDG-3623`）、`style.font { color, sizePx }`（`JDG-3612`）、`bodyOffsetPx`・`cornerRadiusPx`（`JDG-3291`）、`dx`・`dy`（`JDG-3643`）、`commentBoxes`・`highlightBoxes`（`JDG-3545`）、`firstTaskGroupId`・`lastTaskGroupId`（`JDG-3528`）。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-12 | `text`（持ち主 `CommentBox`） |  | コメントボックスの文。無ければ本文は空。 | 無し |
| 11-5・11-6 | `task`・`highlightBox`（`leaderTarget.type` の値） |  | 線先が吸着する物の種類。値は、指す物の型の名を camelCase にした語。`task` はタスクの予定バー・実績バー・マイルストーンマークの 8 つの点のどれか、`highlightBox` はハイライトボックスの 8 つの点のどれか。 | 無し |
| 10-33〜10-40 | `topLeftCorner`・`topMiddle`・`topRightCorner`・`rightMiddle`・`bottomRightCorner`・`bottomMiddle`・`bottomLeftCorner`・`leftMiddle`（`snapPoint` の値） |  | 線先が吸着する 8 つの点。4 つの角は `…Corner`、4 つの辺の中点は `…Middle` で終える。 | 無し |
| 10-27 | `dateTime`（持ち主 `leaderTarget`。`freePoint` のとき） |  | 自由な点の線先が、時間軸の上で立つ時点。名は値の型で終え（N-13）、持ち主の名を繰り返さない（N-4。兄弟は帯と高さなので、`JDG-3650` の ① の読み違えは起きない）。 | 無し |

推し: 4 行とも表のとおり。
1. 値 `task`・`highlightBox` は指す物の型の名と同じ語で、`taskUid`・`highlightBoxId` と頭がそろう（OKPN）。
2. 8 つの点の名は「どこの・何か」を語の順に言い、角と中点を語尾で分ける（NEIM・MECE）。

回答:

### [stamp] 文書の刻印と変更ログ

#### ❓ 問 6-11-5. 最後に書いた者 —— `lastEditedBy` と型 `Writer` の動詞をそろえるか

状態: OPEN

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

状態: OPEN（`changedBy` は `JDG-3626`・`JDG-3642` で `{ writerType, name }` の物になった。意味の文を直して出す）

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

#### ❓ 問 6-12-1. 設定の欄の札が後の裁定と食い違う 9 語 —— 案の札に直すか

状態: OPEN（作り直し 2026-11-22）

場面: 名の辞書は、設定の欄の札（画面の語）を日本語の名に写します（`JDG-3518`）。人は設定の画面でこの札を読み、AI は辞書でこの札を引きます。下の 9 つの札は、後の裁定と食い違います。例: 設定の画面は今、`isPlanBarVisible` の欄に「予定の表示 / Plan」と出します。案では「予定バー / Plan Bar」と出します。

名を付けるもの: 9 つのキーの欄の札（日本語 / 英語）。キーは変わりません。

| # | キー | 今の札（日本語 / 英語） | 案の札 | 根拠 |
|:---|:---|:---|:---|:---|
| 12-35 | `isProgressMarkVisible` | 進捗マーカー / Progress Marker | 進捗マーク / Progress Mark | `JDG-3372`（「マーカー」と書かない） |
| 12-17 | `fitDayRange` | 全体表示時の期間 / Fit Span | 全体表示期間 / Fit Span | `JDG-3376`。キーは `JDG-3623` で `fitDayRange` |
| 12-16 | `isFixed`（持ち主 `fitDayRange`） | 全体表示時の期間を固定する / Fix the fit span | 全体表示期間を固定する / Fix the fit span | `JDG-3376` |
| 12-29 | `isPlanBarVisible` | 予定の表示 / Plan | 予定バー / Plan Bar | キー（`JDG-3382`）と `snapPart` の値 `planBar`（`JDG-3647`）が Plan Bar と言う |
| 12-31 | `isActualBarVisible` | 実績の表示 / Actual | 実績バー / Actual Bar | 同じ（`JDG-3382`・`JDG-3647` の `actualBar`） |
| 12-5 | `dayWidthPx` | 横のズーム倍率 / Horizontal Zoom | 1 日の幅 / Day Width | 値は倍率でなく、1 日の幅の px（`JDG-3292`） |
| 12-39 | `isGroupGridLinesVisible` | グループ罫線（TaskGroup 境界の横線） | グループ罫線（タスクグループ境界の横線） | 日本語の札に英語の型の名が混ざる |
| 13-10 | `pinnedTaskGroupIds` | ピン止めの対象 / Pinned Task Groups | ピン止めしたタスクグループ / Pinned Task Groups | 画面の語 `pinnedTaskGroup`（`U-46`） |
| 12-22 | `viewTimeZone` | 本プロジェクトの基準タイムゾーン / Project Base Time Zone | 表示の基準タイムゾーン / Display Base Time Zone | キーは見せる時計を言う。データの時計は別の `scheduleDataTimeZone`（`JDG-3619`・`JDG-3644`） |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の案の札に直し、`display-words.json` と辞書を同じ字にそろえる（`CR-857`） | 画面と辞書とキーが、1 つの物を 1 つの語で言う | 画面の札が 9 つ変わる |
| b | 行ごとに ★ で直す | 1 行ずつ決められる | 回答が長くなる |
| c | 今のまま。画面の語の巡で問い直す | 今の画面が変わらない | 辞書が後の裁定と食い違ったまま残る |

推し: a。
1. 札とキーが同じ物を同じ語で言う（OKPN・NEIM）。
2. 9 行とも根拠は決まった裁定で、新しい決めを足さない。
3. 名の辞書が意味の正本なので、辞書と画面の字を 1 つにする（SSOT）。

回答:

#### ❓ 問 6-12-2. 開いた時の位置の 5 語 —— `…Fraction` の 2 つを何という `…Percent` にするか

状態: OPEN（`scrollPosition.type` の値は `JDG-3623` で `fixed`・`automatic` になった。意味の文を直して出す）

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

#### ❓ 問 6-12-0. 文書の設定の 5 語 —— 推奨の表のとおりでよいか

状態: OPEN（作り直し 2026-11-22）

場面: 文書設定（`documentSettings`）は、文書を開いたときの見せ方を持ちます。下の 5 語は、まだ裁定の行を持ちません。

```json
"documentSettings": {
  "taskGroupPanelWidthPx": 160,
  "fitDayRange": { "firstDay": "2026-11-30", "lastDay": "2026-12-11", "isFixed": false },
  "viewTimeZone": { "type": "fixed", "utcOffset": "+09:00" },
  "tableWindows": { "searchWindow": {
    "columnFilters": [ { "type": "values", "column": "taskName", "hiddenValues": ["Work package A"] } ],
    "columnSort": { "column": "start", "direction": "ascending" } } }
}
```

表から外した語（裁定が決めた）: `displayScaleRatio`（`JDG-3621`）、`fontSizePreset`（`JDG-3623`）と値 `small`・`medium`・`large`（`JDG-3295`）、`dayWidthPx`（`JDG-3292`）、`verticalZoomRatio`（`JDG-3617`）、`scrollPosition.type` の値 `fixed`・`automatic`（`JDG-3623`）、`viewTimeZone.type` の値 `sameAsScheduleData`（`JDG-3302`）、`utcOffset`（`JDG-3644`）、`displayTimeZones`（`JDG-2691`）、`zoneNameType` と値 `standard`・`daylight`（`JDG-3631`）、`is…Visible` の 12 語（`JDG-2245`・`JDG-3382`）、`isThemeMonochrome`・`isTaskGroupPanelWidthFixed`（`JDG-2245`）、`taskStackDirection` と値 `bottomToTop`・`topToBottom`（`JDG-3632`）、`themeHue`（`JDG-3541`）、`pinnedTaskGroupIds`（`JDG-2246`）、`fitDayRange`（`JDG-3623`）、`firstDay`・`lastDay`（`JDG-3521`）、`tableWindows`・`searchWindow`・`resourceListWindow`（`JDG-3544`）、`isScheduleFilterApplied`（`JDG-3630`）。根の木の状態は `JDG-3664` で無くなりました。仮の名 `checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`（`JDG-3617`）は、問 6-13-5 で全体と一緒に確かめます。深さと縦の比の置き場は問 6-12-0-2、`delayDiagnostics…` の綴りは問 6-12-0-3 で問います。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 13-5 | `taskGroupPanelWidthPx` | タスクグループパネルの幅 | タスクグループパネルの横幅。表示の倍率 `displayScaleRatio` が 1 のときの CSS ピクセルで表す。あなたの ★「Hightか？」に答え、横幅のまま。 | 無し |
| 12-16 | `isFixed`（持ち主 `fitDayRange`） | 全体表示期間を固定する（札は問 6-12-1） | 真なら、全体表示と PNG・SVG の書き出しは、GRS が描くものすべてでなく `fitDayRange` の期間を出す。文書を開いても、ビューはこの期間へ動かない。 | 無し |
| 12-20 | `fixed`（`viewTimeZone.type` の値） |  | ここで与えた `utcOffset` で時刻を出す。`scrollPosition.type` の `fixed` と同じ語。 | 無し |
| 13-13 | `columnFilters` |  | この表の列のフィルタ。フィルタを掛けた列ごとに 1 つ、列の名前で持つ。無ければどの列にもフィルタは無い。 | 無し |
| 13-14 | `columnSort`（前の名 `sort`） |  | GRS がこの表をどう並べるか。無ければ既定の並び。あなたの ★「NEIM違反。」に答え、型 `ColumnSort` と同じ名にした。 | 無し |

推し: 5 語とも表のとおり。
1. `fixed` は `scrollPosition.type` の値（`JDG-3623`）と同じ語で、「人が値を与えた」を 1 つの語で言う（OKPN）。
2. `columnFilters`・`columnSort` は、型 `ColumnFilter`・`ColumnSort`（`JDG-3514`・`JDG-3522`）と同じ語を持つ（NEIM）。

回答:

#### ❓ 問 6-12-0-2. 自動で出す深さと縦の比の置き場 —— 1 つの物 `verticalZoom` にまとめるか

状態: OPEN（作り直し 2026-11-22）

場面: 人が縦にズームすると、GRS は縦の比と、自動で出す深さを同じ時に書きます（`JDG-3674`・`JDG-3675`）。全体表示も 2 つを一緒に選びます。GRS は 2 つを文書に保存します（`JDG-3669`）。裁定は深さの鍵の名を `automaticallyShownDepth` とし、入れ物を `taskGroupTreeView` と呼びました（`JDG-3651`・`JDG-3665`）。その後、根の値が `JDG-3664` で無くなったので、`taskGroupTreeView` は鍵を 1 つだけ持ちます。置き場は未決です（`JDG-3674`）。

前（β の木）:

```json
"documentSettings": { "verticalZoomRatio": 1.2, "taskGroupAutoExpandDepth": 2 }
```

後（案 a）:

```json
"documentSettings": { "verticalZoom": { "ratio": 1.2, "automaticallyShownDepth": 2 } }
```

名を付けるもの: 2 つの鍵の置き場と、入れ物の物の名。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `documentSettings.verticalZoom { ratio, automaticallyShownDepth }` | 縦の 1 刻みが一緒に書く 2 つの値を、1 つの物が持つ。中のキーは持ち主の名を繰り返さない（N-4） | `verticalZoomRatio`（`JDG-3617` の「今のまま」）を `verticalZoom.ratio` に改める |
| b | `documentSettings.verticalZoomRatio` と `documentSettings.taskGroupTreeView.automaticallyShownDepth` | `JDG-3651`・`JDG-3665` の形のまま。深さがタスクグループの木の値と読める | `taskGroupTreeView` が鍵を 1 つだけ持つ。一緒に変わる 2 つの値が別の所に分かれる |
| c | `documentSettings.verticalZoomRatio` と `documentSettings.automaticallyShownDepth` | 入れ物を作らず、浅い | 何を自動で出す深さかを、置き場も名も言わない。一緒に変わる 2 つが、ほかの設定の間に並ぶだけ |

推し: a。
1. 縦のズームの 1 刻みと全体表示が、比と深さを同じ時に書きます（`JDG-3675`）。一緒に変わる値を 1 つの物にまとめます（`JDG-3545` の「関連する要素を群にまとめる」）。
2. `JDG-3651` が `taskGroupTreeView` を作った理由は、根の値と深さをまとめることでした。根の値は `JDG-3664` で無くなり、その理由も消えました。
3. 中のキー `ratio` は、持ち主の名を繰り返さない決まり（N-4、優先 ⑩）と、倍率を `…Ratio` で言う決まり（N-16）の両方に合います。

回答:

#### ❓ 問 6-12-0-3. 遅延診断の 2 つのキーの綴り —— `delayDiagnosis…` にそろえるか

状態: OPEN（作り直し 2026-11-22）

場面: `JDG-3512` は、遅延診断の機能のキーを `delayDiagnosis` とし、派生の名もそろえると決めました（遅延診断レポートは `delayDiagnosisReport`、Agent API は `readDelayDiagnosis`・`runDelayDiagnosis`）。その後の 2 つの裁定は、`delayDiagnostics…` の字でキーを書きました: 表の窓 `delayDiagnosticsReportWindow`（`JDG-3544` の「中の名は今のまま」）と、許し幅の入れ物 `delayDiagnosticsSettings`（`JDG-3646`）。今、1 つの機能を 2 つの綴りが指します。

前（β の木と裁定の字）:

```json
"documentSettings": {
  "delayDiagnosticsSettings": { "toleranceWorkingDays": 1 },
  "tableWindows": { "delayDiagnosticsReportWindow": { "isScheduleFilterApplied": false } } }
```

後（案 a）:

```json
"documentSettings": {
  "delayDiagnosisSettings": { "toleranceWorkingDays": 1 },
  "tableWindows": { "delayDiagnosisReportWindow": { "isScheduleFilterApplied": false } } }
```

名を付けるもの: GRS JSON の 2 つのキー（文書設定の許し幅の入れ物と、遅延診断レポートの表の窓）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `delayDiagnosisSettings`・`delayDiagnosisReportWindow` | 機能の名 `delayDiagnosis`（`JDG-3512`）と 1 つの綴りになる。Agent API の `readDelayDiagnosis` ともそろう | `JDG-3544`・`JDG-3646` が書いた字を改める |
| b | `delayDiagnosticsSettings`・`delayDiagnosticsReportWindow`（今の字） | `JDG-3544`・`JDG-3646` の字のまま | 1 つの機能に 2 つの綴りが残り、`JDG-3512` の「派生の名もそろえる」に反する |

推し: a。
1. 1 つの物に 1 つの名（OKPN）。`JDG-3512` は派生の名もそろえると決めました。
2. `JDG-3544` の「中の名は今のまま」は `tableWindows` の改名だけを言い、`JDG-3646` の要は置き場です。どちらも綴りを選んだ行ではありません。
3. 名は指す物で選び、直す手間で選ばない（`JDG-3511`、NDD）。

回答:

### [root] スケジュールデータと文書の根

#### ❓ 問 6-13-0. スケジュールデータと文書の根の 7 語 —— 推奨の表のとおりでよいか

状態: CLOSED-BY JDG-3625（版の 2 つは `…VersionUtc` になり、ほかの語も裁定が決めた）

裁定が 7 語の名をすべて決めました。`schemaVersionUtc`・`buildVersionUtc` は `JDG-3625`、`ScheduleDocument`・`scheduleData` は `JDG-3518`、`tasks` は MSPDI と同じ名（`JDG-3553`）、`taskGroups` は `TaskGroup`（`JDG-3554`）の複数形（N-8）です。`taskGroupMembers` は `JDG-3614`・`JDG-3615` で無くなりました。

回答:

## BGQA4 文書の命令（16 問）

### [cmd] 文書の命令

#### ❓ 問 35-1. 日程全体をずらす 2 つの命令の名

状態: OPEN

場面: 人か AI が、日程のすべてのタスクを前か後へ動かします。命令は 2 つあります。`shiftScheduleTimes` は量（分）で動かし、`shiftScheduleToStartDate` は、いちばん早いタスクの開始を決めた日へ動かします。名付けるのは 2 つの**命令**です。

```json
{ "type": "shiftScheduleTimes", "minutes": 1440 }
{ "type": "shiftScheduleToStartDate", "newStartDay": "2026-12-01" }
```

今の名には 2 つの癖があります。`Times` は「時刻たち」とも「倍」とも読めます。後の命令は `Date` と言い、その引数は `newStartDay` と言います。GRS JSON は日付だけの値を `…Day` と呼びます（`firstDay`・`lastDay`。決まり N-13、`JDG-3616`）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `shiftScheduleByMinutes`・`shiftScheduleToStartDay` | 2 つの名が「分だけずらす」と「日へ動かす」の対になる。`Day` が引数 `newStartDay` とそろう | 名が少し長くなる |
| b | `shiftScheduleTimes`・`shiftScheduleToStartDay` | `Date` だけを直す。変える名が 1 つで済む | `Times` の 2 通りの読みが残る |
| c | 今のまま | 名を変えない | `Times` の読みと、`Date` と `Day` の食い違いが残る |

推し a: ① 名が中身（分で動かす・日へ動かす）をそのまま言う（`NEIM`）。② 日付だけの値を `…Day` で言う決まり（N-13、`JDG-3616`）に命令の名もそろう（`JDG-3410`: 同じ物に GRS JSON と Agent API で 1 つの名）。③ 引数 `minutes`・`newStartDay` は今のままでよい。

回答:

#### ❓ 問 35-2. 命令の形・プロジェクト・カレンダーの 6 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。命令の判別子 `type`（持ち主 `DocumentCommand`）は `JDG-3563`・`JDG-3564` で決まったので、表から外しました。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-2 | `set` | 書く値 | 編集の命令が書くプロパティと、その新しい値。（`JDG-3268`） | 無し |
| 35-3 | `clear` | 消す欄 | 編集の命令が取り除く、省けるプロパティ。set と clear の両方にあるプロパティを、GRS は断る。（`JDG-3268`） | 無し |
| 35-4 | `DocumentCommand` | 文書の命令 | 値として書いた 1 つの文書の命令。種類と欄を持つ。束にして applyCommands でまとめて書く。（`JDG-3426`） | 無し |
| 35-5 | `editProject` | プロジェクトを編集する | プロジェクトを編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。statusDate が無ければ、GRS は基準日線を描かない。（`scheduleDataTimeZone` は `JDG-3618` で `scheduleData` の直下へ移った。どの命令が書くかは方針で決める） | 形は `edit<実体>`（`JDG-3268`） |
| 35-10 | `replaceCalendarRules` | カレンダーの決まりを置き換える | カレンダーを編集する。稼働する曜日（workingDayTypes。1 が日曜日で、並べない曜日は休み）、週の始まりの曜日（weekStartDay）、例外日（exceptions。編集の後の全部の並び）、稼働日の 1 組の時間帯（workingTimes）。省いた部分はそのまま残る。workingTimes は 1 から 5 つの時間帯を持ち、空の並びは断る。既定の時間帯に戻すには、08:00:00-12:00:00 と 13:00:00-17:00:00 の 2 つを渡す。 | 無し |
| 35-11 | &emsp;+- `workingDayTypes` | 稼働する曜日 | 稼働する曜日を dayType の数で並べたもの（1 が日曜日）。並べない曜日は休み。 | MSPDI の WeekDay/DayType の数（GRS JSON の `dayType`） |

回答:

**タスク**

#### ❓ 問 35-3. 進捗ステータスの 2 つの命令と引数の名

状態: OPEN

場面: 人がタスクの進捗ステータスを選ぶと、GRS は命令を 1 つ書きます。人が進捗のボタンを押して状態を 1 つ進めるときも、GRS は別の命令を 1 つ書きます。名付けるのは 2 つの**命令**と、その 2 つの**引数**です。

```json
{ "type": "placeTaskPlanActual", "taskUid": 7, "place": { "state": "inProgress", … } }
{ "type": "cycleTaskPlanActualState", "taskUid": 7, "remembered": { … } }
```

`JDG-3461` は、この状態を `progressStatus`（進捗ステータス）と呼ぶと決め、「予実の状態」と `planActualState` を退けました。2 つの命令は、まだ `PlanActual` の語を使います。引数 `place` は「場所」とも読めます。`remembered`（覚えた）は、何を覚えたかを言いません。`JDG-3672` は、値を 1 つ置く命令を set 系と呼ぶ方針を記録しました。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `setTaskProgressStatus`（引数 `progressStatus`）・`cycleTaskProgressStatus`（引数 `removedActual`） | 4 つの名がどれも決まった語 `progressStatus` を使う。値を 1 つ置く命令を `set` で始める方針（`JDG-3672`）に合う | 名が少し長い |
| b | `changeTaskProgressStatus`（引数 `progressStatus`）・`cycleTaskProgressStatus`（引数 `removedActual`） | 前の席の推し。「変える」が動作を言う | 動詞 `change` を使う命令はほかに無く、`edit`・`set` と並ばない |
| c | 今のまま | 名を変えない | 退けた語 `PlanActual` が残る |

推し a: ① 決まった語 `progressStatus`（`JDG-3461`）を、命令と引数の両方に使う（`OKPN`）。② `removedActual` は中身（前の段が取り除いた実績）を言う（`NEIM`）。③ `place` の中の `state` は `JDG-2684` のまま残し、`beginTaskActual` も今のままでよい。

回答:

#### ❓ 問 35-4. 写しと並べ替えの 5 つの引数の名

状態: OPEN

場面: 人がタスクやタスクグループを写して貼ると、GRS は命令に「どれを写すか」と「どこへ置くか」を書きます。人が兄弟のタスクグループを並べ直すと、GRS は新しい順を書きます。名付けるのは 5 つの**引数**です。

```json
{ "type": "pasteTasks", "sourceUids": [7, 8], "landing": { "shiftMinutes": 1440, "taskGroupIdOf": { "7": "…", "8": "…" } } }
{ "type": "pasteTaskGroupSubtree", "sourceTaskGroupId": "…", "newTaskGroupIds": { "…": "…" } }
{ "type": "reorderTaskGroupSiblings", "orderedIds": ["…", "…"] }
```

`JDG-2685` は、命令が運ぶ値に指す物の名を付けると決めました（`taskUid`・`commentBoxId` など）。下の 5 つは、まだ指す物を言いません。`taskGroupIdOf`・`newTaskGroupIds` は対応表（元の uid か id から値へ）ですが、名は並びにも読めます。`landing`（着地）はたとえの語で、写しの置き方を言いません。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 35-15 | `sourceUids`（持ち主 `pasteTasks`） | 写すタスクの uid（1 つ以上）。 | `sourceTaskUids` |
| 35-16 | `landing`（持ち主 `pasteTasks`） | 写しの置き方。Ctrl を押したドラッグのコピーだけが送る。 | `placement` |
| 35-18 | `taskGroupIdOf`（持ち主 `landing`） | 写す元のタスクの uid ごとに、写しを載せるタスクグループの id。 | `taskGroupIdBySourceTaskUid` |
| 36-24 | `newTaskGroupIds`（持ち主 `pasteTaskGroupSubtree`） | 元のタスクグループの id ごとに、写しの id。 | `newTaskGroupIdBySourceId` |
| 36-26 | `orderedIds`（持ち主 `reorderTaskGroupSiblings`） | 兄弟のタスクグループの id を新しい順に並べたもの。 | `orderedTaskGroupIds` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の「案 a の名」の 5 つ | どの名も指す物を言う。対応表は「値 + `By` + 鍵」の形で、何から何への対応かを言う | 対応表の名が長くなる |
| b | `sourceTaskUids`・`orderedTaskGroupIds` だけを直す | 指す物の名を足す 2 つだけを変える | 対応表と `landing` の読みにくさが残る |
| c | 今のまま | 名を変えない | 5 つとも指す物を言わない |

推し a: ① `JDG-2685` の決まり（命令の値に指す物の名を付ける）を 5 つすべてに当てる（`NEIM`）。② 対応表の名が鍵と値を言うので、並びと読み違えない（`OMPV`）。③ `shiftMinutes`・`sourceTaskGroupId` は今のままでよい。

回答:

#### ❓ 問 35-5. タスクの 16 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。実績ダミーの部分の名（`barDummyStart` など）は、あなたの語「実績ダミー」を写します。`taskShape` の値の名は問 6-9-1 の答えに従います。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-12 | `createTask` | タスクを作る | 名前の無いタスクを、与えた start と finish で、タスクグループ taskGroupId の上に作る。taskShape（rectangle・chevron・arrow・endpointSpan）と milestoneShape（15 の印のどれか）のちょうど 1 つを与え、milestoneShape はタスクをマイルストーンにする。新しいタスクの uid は highestIssuedUid に 1 を足した数で、highestIssuedUid もそこへ進むので、同じ束の後の命令がそのタスクを名指せる（例えば highestIssuedUid が 41 なら、taskUid 42 の editTask）。どのタスクグループも指さない taskGroupId は、その id の最上位のタスクグループを新しく作る。 | 無し |
| 35-13 | `editTask` | タスクを編集する | タスク taskUid を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。GRS は規則を編集した後のタスクで調べるので、start と finish の片方だけを送ってよい。どちらかが動けば、GRS は percentComplete を計算し直す。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。 | 形は `edit<実体>`（`JDG-3268`） |
| 35-14 | `pasteTasks` | タスクを貼り付ける | sourceUids に並べたタスクを複製する。並べていない子タスクは写さず、写しは未着手で始まる。landing は写しの置き場所を言い、Ctrl を押したドラッグのコピーだけが送る。（`JDG-1727`。引数の名は問 35-4） | 無し |
| 35-17 | &emsp;&emsp;+- `shiftMinutes` | ずらす量 | 写しをずらす量（分、符号付き）。ドラッグと同じ刻み。 | 無し |
| 35-19 | `moveTaskToTaskGroup` | タスクを別のタスクグループへ動かす | タスク taskUid を、別のタスクグループ taskGroupId へ動かす。 | GRS JSON の `grs.taskGroupId` を書く（`JDG-3615`） |
| 35-22 | &emsp;&emsp;+- `state`（持ち主 `place`） | どの進捗ステータスか | どの進捗ステータスか。notStarted・inProgress・suspendedWithResumeDate・suspendedWithoutResumeDate・finished のどれか。（`JDG-2684`） | 無し |
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

#### ❓ 問 35-6. 依存線の端を言う 2 つの引数の名

状態: OPEN

場面: 人がタスク A の終わりからタスク B の始まりへ依存線を引くと、GRS は命令に、線が出る端と入る端を書きます。名付けるのは 2 つの**引数**です。

```json
{ "type": "createDependency", "predecessorUid": 7, "predecessorEdge": "finish", "successorUid": 8, "successorEdge": "start" }
```

グラフの語で `edge`（辺）は、線そのものを指します。だから人は `predecessorEdge` を「先行の依存線」とも読みます。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `predecessorSide`・`successorSide` | 「バーの開始の側か終了の側か」を 1 通りに言う | `side` は左右の側とも読める |
| b | `predecessorEnd`・`successorEnd` | 「2 つの端の 1 つ」を言う | `end` は「終了」とも読め、値 `finish` と紛れる |
| c | 今のまま | 名を変えない | `edge` が線そのものと紛れる |

推し a: ① 名が中身（バーのどちらの側か）を言う（`NEIM`）。② `edge` は線と、`end` は終了と紛れる。1 つの名に 1 つの意味を持たせる（`OMPV`）。

回答:

#### ❓ 問 36-1. ラグの形の値 `typed` の名

状態: OPEN

場面: 人が依存のラグに「2 稼働日」か「3 時間」を打つと、GRS は `changeDependencyLag` の `lag` に 2 つの形のどちらかを書きます。判別子 `type` が形を選びます（`JDG-3563`）。名付けるのは `type` の 1 つの**値**です。

```json
{ "type": "changeDependencyLag", "predecessorUid": 7, "successorUid": 8, "lag": { "type": "workingDays", … } }
{ "type": "changeDependencyLag", "predecessorUid": 7, "successorUid": 8, "lag": { "type": "typed", "minutes": 180, "unit": "hour" } }
```

値 `workingDays` は「稼働日の数で与える」を言います。値 `typed` は「分と見せる単位で与える」を言いますが、英語の `typed` は「型を持つ」か「打ち込んだ」と読めます。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `duration` | 値が中身（長さ）を言う。MSPDI も長さの形を Duration と呼ぶ | タスクの長さとも読める |
| b | `minutesWithUnit` | 値が持つ欄（分と単位）を直に言う | 名が長く、欄の名を写すだけで中身を言わない |
| c | 今のまま | 名を変えない | 「型を持つ」「打ち込んだ」と読み違える |

推し a: ① 値が「長さで与えるラグ」を言い、兄弟の `workingDays`（稼働日の数で与える）と対になる（`NEIM`・`MECE`）。② MSPDI の長さの形の名 Duration と同じ語で、初めて読む人にも通じる。

回答:

#### ❓ 問 36-2. 同じ向きの線の 1 本を名指す引数 `order` の名

状態: OPEN

場面: 同じ 2 つのタスクの間に同じ向きの線が 2 本あるとき、人が 1 本だけを消すと、GRS は並びの中の位置でその線を名指します。名付けるのは**引数**です。

```json
{ "type": "deleteDependencyAt", "predecessorUid": 7, "successorUid": 8, "order": 1 }
```

`order` は 0 から数える位置を持ちます。断りの `commandIndex` は、同じ「0 から数える位置」を `Index` と呼びます。GRS JSON の `siblingOrder` は、兄弟の中の順を 1 から振ります（`JDG-3622` ⑥）。`JDG-3650` は、並びの順を `…Order` で言うと決めました。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 引数 `index`。命令 `deleteDependencyAt` は今のまま | 0 から数える位置を `commandIndex` と同じ語で言う | 命令の名の `At` と引数の名が別の語になる |
| b | 引数 `index`、命令 `deleteDependencyAtIndex` | 命令の名も位置で名指すことを言う | 命令の名が長くなる |
| c | 今のまま | 名を変えない | 1 から振る `siblingOrder` と同じ語が、0 から数える位置を指す |

推し a: ① 0 から数える位置を、Agent API の中で 1 つの語 `Index` で言う（`OKPN`）。② `…Order` は 1 から振る順に取っておく（`JDG-3622`・`JDG-3650`、`OMPV`）。

回答:

#### ❓ 問 36-3. 依存の 9 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。ラグの長さと単位の引数（`minutes`・`unit`）は MSPDI の名と違うので、問 36-3-2 に分けました。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 35-35 | `createDependency` | 依存を作る | タスク predecessorUid からタスク successorUid へ依存線を引く。predecessorEdge と successorEdge は端（start か finish）を名指し、端の組が結び方の種類（例えば終了-開始）を決める。どちらかのタスクがマイルストーンなら、端が何と言っても線はいつも終了-開始である。（端の引数の名は問 35-6） | 無し |
| 35-36 | &emsp;+- `successorUid` | 後続のタスク | 後続のタスク（依存を持つタスク）の uid。 | MSPDI では後続のタスクが PredecessorLink を持つ（GRS JSON に同じキーは無し） |
| 36-1 | `changeDependencyLag` | 依存のラグを変える | predecessorUid から successorUid への依存のラグを変える。その向きのすべての線が新しいラグになる。lag は稼働日の数か、分の長さとラグを見せる単位（day・hour・minute）の組のどちらか。 | 無し |
| 36-2 | &emsp;+- `type`（持ち主 `lag`） | ラグの形 | ラグの形。workingDays か typed（値の名は問 36-1）。（`JDG-3563`） | 無し |
| 36-3 | &emsp;&emsp;+- `workingDays`（持ち主 `lag`） | 稼働日のラグ | 稼働日の数で与えるラグ。 | 無し |
| 36-7 | &emsp;&emsp;+- `day`（持ち主 `unit`） | 日 | 日。 | 無し |
| 36-8 | &emsp;&emsp;+- `hour`（持ち主 `unit`） | 時間 | 時間。 | 無し |
| 36-9 | &emsp;&emsp;+- `minute`（持ち主 `unit`） | 分 | 分。 | 無し |
| 36-10 | `deleteDependency` | 依存を削除する | predecessorUid から successorUid への依存線を削除する。その向きの線はすべて消える。1 本だけ消すには deleteDependencyAt を使う。 | 無し |

回答:

#### ❓ 問 36-3-2. ラグの長さと単位の引数 —— MSPDI の `linkLag`・`lagFormat` と違う名を保つか

状態: OPEN

場面: 人がラグに「3 時間」を打つと、GRS は命令に分の数と見せる単位を書きます。GRS JSON は同じラグを、MSPDI の名と数で持ちます。名付けるのは 2 つの**引数**です。

命令（今の名）:

```json
"lag": { "type": "typed", "minutes": 180, "unit": "hour" }
```

GRS JSON（`predecessorLinks[]` の 1 つ）:

```json
{ "predecessorUid": 7, "type": 1, "linkLag": 1800, "lagFormat": 5 }
```

MSPDI の LinkLag は 10 分の 1 分で数え、LagFormat は単位を数の符号（5 は時間）で持ちます。命令の 2 つの引数は、値の単位も形も違います。`JDG-3410` は「同じ物に GRS JSON と Agent API で 1 つの名」と決めました。`JDG-3553` は、MSPDI の名と違う名を裁定に回すと決めました。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `minutes` のまま、`unit` を `displayUnit` にする | 値の単位が違うので、名も GRS JSON と分ける。`displayUnit` は「見せて打ち込む単位」を言う | 読む人は、GRS JSON の 2 つのキーとの対応を覚える |
| b | `minutes`・`unit` のまま | 名を変えない。短い | `unit` は「minutes の単位」とも読める |
| c | `linkLag`・`lagFormat` にし、値も MSPDI の数（10 分の 1 分と符号）にする | GRS JSON・MSPDI と名も値も同じになる | AI と人が 10 分の 1 分と数の符号を打つことになる |

推し a: ① 値の単位と形が違うので、別の物として別の名で呼ぶ（`OKPN`・`OMPV`）。② `displayUnit` は見せる単位を言い、分の数の単位と取り違えない（`NEIM`）。③ 命令は人の打ち方（分と単位）を写し、MSPDI の数への換算は GRS が受け持つ（`SoC`）。

回答:

**担当と割当**

#### ❓ 問 36-4. 担当と割当の 7 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-13 | `editResource` | 担当を編集する | 担当 resourceUid を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。プロパティは name だけで、set.name は担当の名前を変え、name を clear すると名前の無い担当になる。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-14 | `createResource` | 担当を作る | 名前 name の担当を足す。 | 無し |
| 36-15 | `deleteResources` | 担当を削除する | resourceUids に並べた担当を削除する。（`JDG-2690`） | 無し |
| 36-16 | &emsp;+- `resourceUids` | 削除する担当 | 削除する担当の uid。（`JDG-2685`） | 無し |
| 36-17 | `deleteUnreferencedResources` | 使われていない担当を削除する | どの割当からも指されていない担当をすべて削除する。 | 無し |
| 36-18 | `createAssignment` | 割当を作る | 担当 resourceUid をタスク taskUid に就ける。 | 無し |
| 36-19 | `deleteAssignment` | 割当を外す | 担当 resourceUid の割当をタスク taskUid から外す。 | 無し |

回答:

**タスクグループ**

#### ❓ 問 36-5. タスクグループの 9 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。帯の値を戻す命令（今の `resetTaskGroupTreeStates`）は、`JDG-3690` で `setTaskGroupSelfShowModesToAutomaticExceptHidden` に決まり、`JDG-3691` で全体表示の部品になったので、表から外しました。引数の `parentId` は、`JDG-3410`（GRS JSON と同じ名）と `JDG-3622`（`parentTaskGroupId`）に従って `parentTaskGroupId` と書きました。写しと並べ替えの値は問 35-4 で問います。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-20 | `editTaskGroup` | タスクグループを編集する | タスクグループ taskGroupId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。style.color が無ければ、GRS は帯の色を塗らない。name は、そのグループが代表するタスクの名前に従わない。editableByGroupName はまだ作っていないので、設定も clear も断る（notImplemented）。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-21 | `createTaskGroup` | タスクグループを作る | 与えた id と siblingOrder で、タスクグループを作る。parentTaskGroupId（無ければ最上位）、name（無ければ名前なし）、representativeTaskUid、selfShowMode（無ければ automatic）も与えてよい。（`JDG-3639`・`JDG-3684`） | 無し |
| 36-22 | `pasteTaskGroupSubtree` | タスクグループの部分木を貼り付ける | sourceTaskGroupId を根とするタスクグループの部分木を複製し、根の写しを parentTaskGroupId（無ければ最上位）の下に置く。newTaskGroupIds は、元の id それぞれから写しの id への対応である。写しの根は selfShowMode（無ければ automatic）を得て、写しの配下は元の値を写す。（`JDG-3684`） | 無し |
| 36-23 | &emsp;+- `sourceTaskGroupId` | 写す元の根 | 写す部分木の根のタスクグループの id。 | 無し |
| 36-25 | `reorderTaskGroupSiblings` | 兄弟を並べ直す | parentTaskGroupId（無ければ最上位）の下の兄弟のタスクグループを、orderedIds の順に並べ直す。その順が siblingOrder になる。 | 無し |
| 36-27 | `moveTaskGroup` | タスクグループを動かす | タスクグループ taskGroupId の親と兄弟の中の位置を、parentTaskGroupId（無ければ最上位）と siblingOrder に変える。selfShowMode を与えれば、その値も書く。省けば値を保つ。（`JDG-3684`） | 無し |
| 36-29 | `deleteTaskGroup` | タスクグループを削除する | タスクグループ taskGroupId を削除する。最後のタスクグループを削除するときは、名前が Untitled の最上位のタスクグループを新しく作る。文書はいつも少なくとも 1 つのタスクグループを持つからである。 | 無し |
| 37-1 | `pinTaskGroup` | ピン止めする | タスクグループ taskGroupId をピン止めしたタスクグループに足して、ピン止めする。 | GRS JSON の `pinnedTaskGroupIds` を書く |
| 37-2 | `unpinTaskGroup` | ピン止めを外す | タスクグループ taskGroupId をピン止めしたタスクグループから外す。最後の 1 つを外すと pinnedTaskGroupIds のプロパティも取り除き、[] は書かない。 | GRS JSON の `pinnedTaskGroupIds` を書く |

回答:

**描き方・注記・文書の設定と表**

#### ❓ 問 36-6. タスクの見た目を編集する命令 `editTaskVisual` の名

状態: OPEN

場面: 人がタスクのバーの形や色を変えると、GRS はタスクの見た目を書き換える命令を書きます。名付けるのは**命令**です。

```json
// GRS JSON（JDG-3614 の後）
{ "uid": 7, "name": "設計", "grs": { "taskGroupId": "…", "style": { "taskShape": "rectangle", "fill": { "color": { "type": "palette", "name": "red" } } } } }
// 命令（今の名）
{ "type": "editTaskVisual", "taskUid": 7, "set": { "taskShape": "chevron" } }
```

`JDG-3614` は、タスクの見た目をタスクの中の `grs.style` に置くと決めました。`taskStyles[]` は無くなりました。命令の名は、まだ 2 代前の語 `Visual`（`taskVisuals` の名残）を使います。ほかの編集の命令は `edit<実体>` の形で、実体の名をそのまま使います（`JDG-3268`）。断りの `taskVisualCountNotOne` は問 32-9 で扱います。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `editTaskStyle` | GRS JSON のキー `style` と同じ語で、「タスクの style を編集する」と読める | `style` は独立の実体でなく、`edit<実体>` の形から少し外れる |
| b | 今のまま | 名を変えない | `Visual` は今の GRS JSON に無い語で、書き換える所を言わない |

推し a: ① 名が書き換える所（GRS JSON の `style`）を言う（`NEIM`・`JDG-3410`）。② 1 つの物（タスクの見た目）を 1 つの語 `style` で呼ぶ（`OKPN`）。

回答:

#### ❓ 問 37-1. 表の窓の見え方を編集する命令と、表を名指す引数の名

状態: OPEN

場面: 人が検索ウィンドウの表で、列のフィルタや並びを変えます。GRS は表の見え方を書き換える命令を書きます。名付けるのは**命令**と、表を名指す**引数**です。

```json
// GRS JSON
"documentSettings": { "tableWindows": { "searchWindow": { "isScheduleFilterApplied": true, "checkedTaskUids": [7, 8] } } }
// 命令（今の名）
{ "type": "editTableView", "table": "searchWindow", "set": { "isScheduleFilterApplied": true } }
```

`JDG-3544` は GRS JSON の `tableViews` を `tableWindows` に改めました。`JDG-3620` は窓の型を 2 つ（タスクの表・担当の表）に分けました。命令はまだ前の語 `View` を使います。引数 `table` は窓の名（`searchWindow`・`delayDiagnosticsReportWindow`・`resourceListWindow`）を持ちます（遅延診断の窓の名は問 6-12-0 の 13-18 の答えに従う）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 命令 `editTableWindow`、引数 `tableWindow` | 命令と引数が GRS JSON の `tableWindows` の 1 つを言う | 引数の名が少し長くなる |
| b | 命令 `editTableWindow`、引数 `table` のまま | 命令の名だけを直す | 引数 `table` は窓の名を持つのに「表」と言う |
| c | 今のまま | 名を変えない | GRS JSON に無い語 `View` が残る |

推し a: ① 命令と引数が GRS JSON の `tableWindows` と同じ語を使う（`JDG-3410`・`OKPN`）。② 引数の値は窓の名なので、`tableWindow` が値の中身と合う（`NEIM`）。

回答:

#### ❓ 問 37-2. 全体表示の命令 `fitScheduleToScreenOnPage` の名

状態: OPEN

場面: 人が「全体を収める」（英語の札 Zoom to Fit、`IC-10`）を押すと、GRS は日程全体を画面に収め、帯の値も戻します（`JDG-3677`）。AI は同じことを 1 つの命令で行います（`JDG-3691`）。名付けるのは**命令**です。

```json
{ "type": "fitScheduleToScreenOnPage" }
```

`OnPage` は、呼ぶ側が倍率を運ぶ前の命令 `fitScheduleToScreen` と分けるための語でした。前の命令は `JDG-3267` で `editDocumentSettings` に畳まれ、今は 1 つだけが残ります。`JDG-3661` は、出来事の名を「英語の札を camelCase にして `Pressed` を付ける」と決めました。`JDG-3672`・`JDG-3674` は、命令の名を「出来事の名から `Pressed` を除いたもの」にそろえる方針を記録しました。今の出来事の名は `fitPressed` です。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `zoomToFit`（出来事の名も `zoomToFitPressed` にする） | 画面の札 Zoom to Fit と同じ名になる。人と AI が 1 つの名で同じ操作を指す | 出来事の名 `fitPressed` も直す |
| b | `fitScheduleToScreen` | 何を何に収めるかを名が言う。前の席の推し | 画面の札と違う名になる。前の α の命令と同じ綴りで、中身が変わる |
| c | 今のまま | 名を変えない | `OnPage` は、もう無い命令との区別だけを言う |

推し a: ① 画面の札・出来事・命令の名をそろえる規則（`JDG-3661`・`JDG-3672`・`JDG-3674`）に合う。② 人と AI が同じ結果を作る（`JDG-3671`・`JDG-3691`）ので、名も 1 つにする（`OKPN`）。③ `OnPage` は区別の相手が消えた語で、中身を言わない（`NEIM`）。

回答:

#### ❓ 問 36-7. 描き方・注記・文書の設定の 10 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。色と線の形は `JDG-3607`・`JDG-3610`・`JDG-3612` で決まり、意味の文をその形で書き直しました。引数の名は `JDG-3410` に従い、GRS JSON の新しいキー（`leaderTarget`・`firstTaskGroupId`・`lastTaskGroupId`・`fitDayRange`）で書きました。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 36-31 | `createCommentBox` | コメントボックスを置く | id が commentBoxId のコメントボックスを、leaderTarget が言うとおりに付けて置く。leaderTarget は何にも吸着しない点、タスク、ハイライトボックスのどれかで、選んだ種類のプロパティはすべて要る。ほかのプロパティは既定の値になり、新しい箱は文を持たない。 | 無し |
| 36-32 | &emsp;+- `commentBoxId` | 扱うコメントボックス | 命令が扱うコメントボックスの id。（`JDG-2685`） | GRS JSON の `CommentBox.id` を指す |
| 36-33 | `editCommentBox` | コメントボックスを編集する | コメントボックス commentBoxId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。塗り・枠・文字はいつも色を持つので、clear では取り除けない。塗りを見せないときは、style.fill.opacityPercent を 0 にする。leaderTarget は createCommentBox と同じ形である。javascript:・vbscript:・data: で始まる hyperlinkAddress は断る（hyperlinkSchemeNotAllowed）。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-34 | `bringCommentBoxToFront` | コメントボックスをいちばん前へ | コメントボックス commentBoxId を、コメントボックスの並びの末尾、つまりいちばん前へ動かす。 | 無し |
| 36-35 | `deleteCommentBox` | コメントボックスを削除する | コメントボックス commentBoxId を削除する。 | 無し |
| 36-36 | `createHighlightBox` | ハイライトボックスを置く | 与えた highlightBoxId で、firstDay から lastDay までの日（両端を含む）と、firstTaskGroupId から lastTaskGroupId までのタスクグループを囲むハイライトボックスを置く。 | 無し |
| 36-37 | `editHighlightBox` | ハイライトボックスを編集する | ハイライトボックス highlightBoxId を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。style.stroke が無ければ、GRS は枠の線を描かない。最後の日が最初の日より前の箱と、最後のタスクグループが最初のタスクグループより前の箱は断る（highlightBoxInverted）。style.stroke が無く style.fill.opacityPercent が 0 の箱も断る（fillAndStrokeBothInvisible）。 | 形は `edit<実体>`（`JDG-3268`） |
| 36-38 | `bringHighlightBoxToFront` | ハイライトボックスをいちばん前へ | ハイライトボックス highlightBoxId を、ハイライトボックスの並びの末尾、つまりいちばん前へ動かす。 | 無し |
| 36-39 | `deleteHighlightBox` | ハイライトボックスを削除する | ハイライトボックス highlightBoxId を削除する。 | 無し |
| 36-40 | `editDocumentSettings` | 文書の設定を編集する | 日程の見せ方を言う文書の設定を編集する。set は並べたプロパティを書き、clear は並べた省けるプロパティを取り除く。両方にあるプロパティは断る（fieldSetAndCleared）。ピン止めと表の見え方には自分の命令がある（pinTaskGroup・unpinTaskGroup・editTableView。名は問 37-1）。fitDayRange は firstDay・lastDay・isFixed と一緒にまるごと書き、clear すると isFixed も消える。viewTimeZone を設定しても、GRS は見せる時刻だけを換算し、保存した値を変えない。 | GRS JSON の `documentSettings` |

回答:

## BGQA5 Agent API（29 問）

### [api] Agent API

#### ❓ 問 34-1. 修正案を当てる道具の一族の名

状態: OPEN

場面: 人が遅延診断レポートで行にチェックを入れ、「上書きして修正」（`IC-157`）を押すと、GRS はチェックした修正案を 1 つの束で文書に当てます。AI は同じことを道具 `issueDelayFixes` で行います。名付けるのは、同じ一族の**道具**・**引数**・2 つの**型**・断りの**値**・表の名の**値**です。

```json
issueDelayFixes({ "fixKeys": [] })
readTableRows({ "table": "delayFixProposals" })
```

修正案（`fixProposal`、`JDG-2141`）と修正の記録（`fixLog`、`JDG-3466`）の名は決まっています。道具と型は、別の語 `issue`・`DelayFix` を使います。`issue` は「出す・発行する」を言い、修正案を文書に当てることを言いません。`readDelayDiagnostics` の答えは、同じ 2 つを欄 `fixProposals`・`fixLog` で返します。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 34-14 | `issueDelayFixes` | 遅延診断の修正案を、画面の修正と同じく 1 つの束として当てる。 | `applyFixProposals` |
| 34-15 | &emsp;+- `fixKeys` | 当てる修正案の行のキー。空の並びは推奨の行を当てる。 | `fixProposalKeys` |
| 30-5 | `DelayFixRow` | 遅延診断の修正案の 1 行。 | `FixProposalRow` |
| 30-6 | `DelayFixLogRow` | 遅延診断の修正の記録の 1 行。 | `FixLogRow` |
| 32-17 | &emsp;+- `nothingToIssue`（持ち主 `reason`） | issueDelayFixes を呼んだが、当てる修正案が無い。 | `noFixProposalToApply` |
| （値） | `readTableRows` の `table` の値 `delayFixProposals`・`delayFixLog` | 修正案の表と修正の記録の表。 | `fixProposals`・`fixLog` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `applyFixProposals` ほか、表の「案 a の名」の 6 つ | 名詞が決まった語にそろう。動詞 `apply` は `applyCommands` と同じく「文書に当てる」を言う | 画面のボタンの動詞「修正 / Fix」とは別の語になる |
| b | `adoptFixProposals`・`noFixProposalToAdopt`（ほかは a と同じ） | 画面の「推奨案をすべて採用する / Adopt All Recommended」（`IC-166`）の動詞にそろう | 画面の Adopt はチェックを入れるだけで、文書を書き換えるのは「…して修正」の 2 つのボタン（`IC-157`・`IC-158`）である |
| c | 今のまま | 名を変えない | 決まった語と違う語 `issue`・`DelayFix` が残る |

推し a: ① 名詞を決まった語 `fixProposal`・`fixLog` にそろえる（`OKPN`、`JDG-2141`・`JDG-3466`）。② `apply` は、Agent API がすでに「文書に当てる」に使う動詞である（`applyCommands`、`NEIM`）。③ `exportFixLogTsv` はもう `fixLog` を使い、一族の名がそろう。

回答:

#### ❓ 問 33-1. 持ち越しの値を含める引数 `includeCarry` の名

状態: OPEN

場面: AI が `readDocument` で文書を読むとき、MSPDI から持ち越した値を答えに含めるかを、真偽の引数で選びます。名付けるのは**引数**です。

```json
readDocument({ "includeCarry": true })
// 答えのタスク（JDG-3606 の後）
{ "uid": 7, "name": "設計", "passthrough": { "Priority": "500" } }
```

GRS JSON は、持ち越した値を各実体の `passthrough` 1 つに持ちます（`JDG-3606`）。引数は同じ物を `carry` と呼びます。`JDG-3410` は「同じ物に GRS JSON と Agent API で 1 つの名」と決めました。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `includePassthrough` | GRS JSON のキー `passthrough` と同じ語で、含める物を言う | 今の名より少し長い |
| b | `includeMspdiPassthrough` | MSPDI から来た値であることも言う | `passthrough` はいつも MSPDI の値なので、同じことを 2 度言う |
| c | 今のまま | 名を変えない | 1 つの物が `passthrough` と `carry` の 2 つの名を持つ |

推し a: ① GRS JSON のキー `passthrough`（`JDG-3606`）と同じ語を使う（`JDG-3410`・`OKPN`）。② 名が含める物を言う（`NEIM`）。

回答:

#### ❓ 問 33-2. スキーマのどれを読むかを選ぶ引数 `which` の名

状態: OPEN

場面: AI は、書く前に `readSchema` でスキーマを読みます。引数 `which` が、読む物を 3 つから選びます。名付けるのは**引数**です。

```json
readSchema({ "which": "notes" })
readSchema({ "which": "document", "defs": ["Task", "PredecessorLink"] })
```

値は `document`（GRS JSON の文書の JSON Schema）・`commands`（命令のスキーマ）・`notes`（書く前に読む短い注意）です。`which`（どれ）は代名詞で、何を選ぶかを言いません（`JDG-820`）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `part` | 取次が持つ物のどの部分を読むかを言う。`readDocument` の引数 `parts` と同じ語 | `notes` はスキーマの部分でなく、注意の文である |
| b | `schemaName` | 値の 2 つ（`document`・`commands`）がスキーマの名であることを言う | `notes` はスキーマでないので、名と値が合わない |
| c | 今のまま | 名を変えない | 代名詞の名で、何を選ぶかを言わない |

推し a: ① 名が「どの部分を読むか」を言い、3 つの値のどれにも当たる（`NEIM`・`MECE`）。② `readDocument` の `parts` と同じ語で、「読む物の部分を選ぶ」を 1 つの語で言う（`OKPN`）。

回答:

#### ❓ 問 33-2-2. 窓かパネルを閉じる道具 `closeWindow` と、その引数 `which` の名

状態: OPEN

場面: AI が `closeWindow` を呼ぶと、ページは遅延診断レポートウィンドウかプロパティパネルを、その閉じるボタンと同じく閉じます。引数 `which` が、閉じる物を選びます。名付けるのは**道具**と、その**引数**です。

```json
closeWindow({ "which": "…" })
```

プロパティパネルはパネルで、ウィンドウとは別の種類です（`JDG-3356`）。道具の名は、閉じる物の片方だけを言います。`which` は、何を選ぶかを言いません。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `closeWindow` は窓だけを閉じ、引数を `window` にする。プロパティパネルは新しい道具 `closePropertiesPanel` で閉じる | どの道具の名も、閉じる物をそのまま言う | 道具が 1 つ増える |
| b | `closeWindow` は 1 つのまま、引数を `target`（値は窓とパネルの名）にする | 道具の数を変えない | 道具の名が「窓」と言い、パネルも閉じる |
| c | 今のまま | 名を変えない | 道具の名と閉じる物が食い違い、引数は代名詞のまま |

推し a: ① 1 つの名が 1 つの物（窓・パネル）を言う（`OKPN`・`NEIM`）。② 窓とパネルを別の種類とした決め（`JDG-3356`）と合う。

回答:

#### ❓ 問 34-2. 道具（メンバ）の 37 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。読む道具は `read…`、画面と同じことをする道具は画面の動詞、書き出す道具は `export…` で始まります。`readDelayDiagnosis`・`runDelayDiagnosis`（今は `…Diagnostics`）は `JDG-3512` で決まったので、表から外しました。版を返す 2 つの道具は問 34-2-2 に分けました。読む部分の引数 `which` は問 33-2 で問います。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 30-1 | `agentApi` | Agent API | Agent API: AI エージェントが、人と同じやり方と同じ検査で、開いている文書を読み書きするための接点。AI を提供する API ではなく、呼ぶ側がエージェントである。名前は訳さない。 | 画面の Agent API のボタンと同じ名 |
| 30-2 | &emsp;+- `grSchedulerAgentApi` | Agent API の識別子 | ページが Agent API をスクリプトに出すときの識別子。ほかの道具の同じような API とぶつからないよう、製品の接頭辞を残す。 | 無し |
| 33-28 | `readSchema` | スキーマを読む | 取次が持つ JSON Schema を部分ごとに返す。defs も full も無ければ目次を返す。目次は、いちばん上のキーと、すべての定義の名前とその 1 行の説明、文書のスキーマの版。defs を渡せばその定義だけを、それが指すほかの定義の名前と一緒に返す。full が真なら本文の全部を返し、資源 grs-document.schema.json か grs-commands.schema.json と同じになる。which が notes なら、書く前に読む短い注意を返す。ページがつながる前でも動き、スキーマは取次が配るページのものである。 | 無し |
| 33-30 | &emsp;+- `defs` | 定義の名 | 返す定義の名前。スキーマの $defs の名前で書く（例えば Task、PredecessorLink）。それらだけを返す。 | JSON Schema の `$defs` の名 |
| 33-31 | &emsp;+- `full` | 全部 | 真ならスキーマの本文の全部を返し、資源と同じになる。defs より勝つ。 | 無し |
| 33-32 | `readDocument` | 文書を読む | 文書の凍結した写しで、根の 3 つの群を持つ。既定では MSPDI の持ち越しの値（passthrough）を除き、includeCarry に真を渡せば含める（名は問 33-1）。空でない taskUids は、タスクに属する群（tasks、assignments、baselineTasks）にそのタスクだけを残す。タスクグループの一覧（id、名前、親、順番）だけが欲しければ parts に ['taskGroups'] を渡す。そのときタスク・カレンダー・担当は付いてこない。 | 無し |
| 33-34 | &emsp;+- `taskUids`（持ち主 `readDocument`） | 読むタスク | 読むタスクの uid。空か省けば、すべてのタスクを読む。 | 無し |
| 33-35 | &emsp;+- `parts`（持ち主 `readDocument`） | 残す部分 | 残す部分の名前。scheduleData のキー（tasks、calendars、resources、assignments、taskGroups など）と documentSettings、changeLogEntries。空ならすべて残す。documentStamp はいつも残し、外した部分は答えに無い。 | GRS JSON の `scheduleData` のキーの名 |
| 33-36 | `readStamp` | 刻印を読む | 楽観ロックのための文書刻印。書くときに expectedStamp として返す。 | GRS JSON の `documentStamp` |
| 33-37 | `readSelection` | 選んだものを読む | 人がいま選んでいるもの。選んだ順に並ぶ。 | 無し |
| 34-1 | `readSearchRows` | 検索の行を読む | 語を 1 つ受け取り、検索ウィンドウの行を返す。タスクの表を 1 ページずつと、コメントボックスの表。ウィンドウ自身の入力欄は読みも変えもしない。空の語は何も絞らないので、タスクの行は全体の目次になる。filters が 'asShown'（既定）なら、人がタスクの表に掛けた列のフィルタと並べ替えを当てるので、画面と同じ行が同じ順に返る。人と同じようにそれを変えるには、applyCommands で editTableView を送る（名は問 37-1）。人の表も変わる。offset から limit 個まで（多くても 100）のタスクの行を返す。答えは、タスクの表の列、タスクの行の総数（taskTotal）、次の offset を並べる。状態の列は日付を基準日と比べるだけである。正確な遅れの解析には readDelayDiagnostics を呼ぶ。 | 画面の検索ウィンドウ |
| 34-2 | &emsp;+- `word` | 探す語 | 探す語。タスクの行はタスク名か担当の名前がこの語を含めば、コメントボックスの行は本文が含めば残す。大文字と小文字、全角と半角は区別しない。空の語は何も絞らないので、答えは全体の目次になる。 | 検索ウィンドウの入力欄の語 |
| 34-3 | &emsp;+- `filters` | フィルタの当て方 | 'asShown'（既定）は、人が検索ウィンドウのタスクの表に掛けている列のフィルタと並べ替えを当てる。'none' はどちらも当てない。 | 無し |
| 34-4 | &emsp;+- `limit` | 行の数の上限 | 返す行の数。省けば 100、多くても 100。 | 無し |
| 34-5 | `readTableRows` | 表の行を読む | 遅延診断レポートの表か担当リストの表の行を、1 ページずつ、人が見るとおりのセルで返す。filters が 'asShown'（既定）なら、人がその表に掛けた列のフィルタと並べ替えを当てるので、画面と同じ行が同じ順に返る。表自身の入力欄は読みも変えもしない。遅延診断レポートの表は、readDelayDiagnostics と同じく新しい診断から作り、画面も文書も変えない。offset から limit 個まで（多くても 100）の行を返す。検索ウィンドウは readSearchRows で読む。修正案の表と修正の記録の表は、readDelayDiagnostics が fixProposals と fixLog で返すのと同じ行を並べる。 | 画面の遅延診断レポートウィンドウ・担当リスト |
| 34-6 | `readShownTasks` | 描いているタスクを読む | 日程表がいま描いているタスクの uid（どの表も日程表を絞っていなければ null）と、絞っている表の名前。読むだけで、画面も文書も変えない。 | 無し |
| 34-8 | &emsp;+- `parts`（持ち主 `readDelayDiagnostics`） | 残す部分 | 残す部分の名前（findings、bottlenecks、endTaskDelays、walls、markerStates、finishedDelayContributions、derivedParentTasks、lateDays、fixProposals、fixLog）。空ならすべて残す。outcome、statusDate、unreliableCount はいつも残す。（中の名は `JDG-3473`） | 無し |
| 34-9 | &emsp;+- `limit`（持ち主 `readDelayDiagnostics`） | 並びの上限 | 各並びで返す要素の上限。0 は上限なし。 | 無し |
| 34-10 | `applyCommands` | 命令を当てる | 命令の束をまとめて書く。すべての命令を当てるか、束全体を断るかのどちらか。最後に読んだ刻印を expectedStamp として渡す。各命令の type と欄は、資源 grs-commands.schema.json にある。 | 無し |
| 34-11 | `importDocument` | 文書を取り込む | 開いている文書へ文書を取り込む。人が取り込み方（置き換える、足す、前回予定として重ねる）を選ぶ必要があるときは、問うたという答えをすぐに返す。人の選んだ結果は人自身の編集になるので、watchChanges が知らせる。 | 画面の「取り込む」と同じ操作 |
| 34-12 | &emsp;+- `source`（持ち主 `importDocument`） | 取り込む文書 | 取り込む文書。文書そのもの、{ document }、または GRS JSON を持つ { text }。 | 無し |
| 34-13 | `requestOpenFile` | ファイルを開くよう頼む | 人にファイルを開いてもらうよう頼む。ページが問いを出し、呼び出しはすぐに戻る。人が続ければ、人のファイルの窓が開いて人がファイルを選ぶ。人が開いた文書は、人の編集として watchChanges で届く。人がファイルを選ぶと、ページは開き方を「置き換える」「合流させる」「重ねる」のボタンで人に問う。その問いが出ることを人に伝えておく。ファイルが入ったかを知るには watchChanges を呼ぶ（または刻印が変わるまで readStamp を呼ぶ）。 | 画面のファイルを開く操作 |
| 34-16 | `undoEdit` | 編集を取り消す | 編集の履歴のいちばん新しい段を取り消す。ただし呼んだ側が自分で書いた段だけで、人が書いた段は notOwnStep で断る。最後に読んだ刻印を expectedStamp として渡し、違う刻印は staleStamp で断る。 | 画面の取り消し（呼んだ側の段だけ） |
| 34-17 | `redoEdit` | 編集をやり直す | いちばん最後に取り消した段をやり直す。ただし呼んだ側が自分で書いた段だけで、人が書いた段は notOwnStep で断る。最後に読んだ刻印を expectedStamp として渡し、違う刻印は staleStamp で断る。 | 画面のやり直し（呼んだ側の段だけ） |
| 34-18 | `exportJson` | GRS JSON を書き出す | 文書を GRS JSON の文字列で返す。fileName（.json で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-19 | `exportMspdi` | MSPDI を書き出す | 文書を Microsoft Project XML（MSPDI）で返す。fileName（.xml で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | MSPDI（書き出す形式） |
| 34-20 | `exportSvg` | SVG を書き出す | 書き出す絵を SVG の文字列で返す。文書が全体表示の期間を固定していれば、絵はその期間を使う。fileName（.svg で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-21 | `exportPng` | PNG を書き出す | 書き出す絵を PNG の画像で返す。失敗も値で返す。fileName（.png で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 無し |
| 34-22 | `exportEmbeddedHtml` | 文書入りの HTML を書き出す | GRS と文書を合わせた 1 つの .html ファイルを返す。fileName（.html で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 価値のことば「単一 HTML」（`JDG-3467`） |
| 34-23 | `exportFixLogTsv` | 修正の記録を TSV で書き出す | 遅延診断の修正の記録を、タブで区切った文字列で返す。人の「.tsv で保存」と同じ列と書き方で、記録のすべての行を表の順に並べる。fileName（.tsv で終わる）を渡すと、代わりに取次が人の保存先のフォルダに保存する。 | 画面の「.tsv で保存」 |
| 34-24 | `focusTask` | タスクへ寄せる | タスクが載るタスクグループと祖先を見せ、タスクが見える所まで表示を寄せる。これは書き込みである。見せるものを変えなければタスクを見せられないときは、その変更が呼んだ側の書いた編集の履歴の 1 段になる。寄せるだけなら段を足さない。（帯の値の書き方は `JDG-3679`・`JDG-3680`） | 無し |
| 34-25 | &emsp;+- `taskUid`（持ち主 `focusTask`） | 見せるタスク | 見せるタスクの uid。（`JDG-2685`） | GRS JSON の `taskUid` と同じ名 |
| 34-26 | `showOnlyTasks` | タスクだけを見せる | 並べたタスクだけを見せる。人ができるのと同じく、検索ウィンドウのタスクの表の表示の列を書き換え、その表のスケジュールフィルターを掛ける。空の並びはフィルターを解き、表示の値は残す。検索ウィンドウが出ていなければ最小化して出し、ページは帯を出すので、人は何が起きたかが分かる。遅延診断レポートと担当リストのフィルターには触れない。 | 画面のスケジュールフィルター |
| 34-27 | &emsp;+- `taskUids`（持ち主 `showOnlyTasks`） | 見せるタスク | 表示にするタスクの uid。空の並びはフィルターを解く。 | 無し |
| 34-31 | `watchChanges` | 変更を待つ | 呼んだ側以外の書き手が確定した変更を待つ。 | 無し |
| 33-10 | `fileName` | 保存するファイル名 | 書き出しを保存するファイル名。人が取次で選んだ保存先のフォルダからの相対の名。 | 無し |
| 33-11 | `overwrite` | 上書きの許し | 既にあるファイルを置き換えてよいか。先に人に問う。古いファイルは .bak として残る。 | 無し |

回答:

#### ❓ 問 34-2-2. 版を言う 3 つの名 —— `…VersionUtc` にそろえるか

状態: OPEN

場面: AI は最初に `agentApiVersion` を呼び、Agent API の版を知ります。`schemaVersion` は、この GRS が読み書きする GRS JSON の形式の版を返します。取り込みを断るとき（`formatTooNew`）、ページは欄 `knownSchemaVersion` に、このビルドが知るいちばん新しい形式の版を書きます。名付けるのは 2 つの**道具**と 1 つの**欄**です。

```json
agentApiVersion()   // → "2026-11-20T00:00:00Z"
schemaVersion()     // → "2026-11-18T00:00:00Z"
// GRS JSON の根（JDG-3625 の後）
{ "schemaVersionUtc": "2026-11-18T00:00:00Z", "buildVersionUtc": "2026-11-21T09:30:00Z", … }
```

`JDG-3625` は GRS JSON の版のキーを `schemaVersionUtc`・`buildVersionUtc` に改め、「版を言うキーは `…VersionUtc` で終える」と決めました。`JDG-3410` は「同じ物に GRS JSON と Agent API で 1 つの名」と決めました。3 つの値はどれも UTC の時刻です。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `agentApiVersionUtc`・`schemaVersionUtc`・`knownSchemaVersionUtc` | 版の名が 1 つの形にそろう。GRS JSON と同じ物を同じ名で呼ぶ | 道具の名が長くなる |
| b | `schemaVersionUtc`・`knownSchemaVersionUtc` にし、`agentApiVersion` は今のまま | GRS JSON と同じ物を言う 2 つだけを直す | 同じ形の値（UTC の版）が 2 つの形の名を持つ |
| c | 今のまま | 名を変えない | GRS JSON の `schemaVersionUtc` と同じ物が別の名を持ち、`JDG-3410` と食い違う |

推し a: ① 3 つとも値は UTC の時刻の版で、`JDG-3625` の決まりが同じに当たる（`OKPN`）。② `schemaVersion` と `knownSchemaVersion` は、GRS JSON の `schemaVersionUtc` と同じ物を言う（`JDG-3410`）。③ 版の名が 1 つの形にそろい、AI が迷わない（`NEIM`）。

回答:

**受け渡す値の型**

#### ❓ 問 31-1. 画面の表を運ぶ 5 つの型の名

状態: OPEN

場面: AI が `readTableRows` か `readSearchRows` を呼ぶと、ページは画面の表の 1 ページを返します。その答えは 5 つの型でできています。名付けるのは 5 つの**型**です。

```json
// readTableRows の答え（型 AgentTableRows）
{ "table": "…",
  "columns": [ { "id": "…", "ja": "担当", "en": "Resource", "valueType": "text" } ],
  "rows": [ { "key": "12", "cells": [ { "column": "…", "text": "Sato" } ] } ],
  "total": 1, "offset": 0, "nextOffset": null }
```

頭の `Agent` は受け取る者を言い、物（画面の表）を言いません（`JDG-820`）。型はもう Agent API（`grSchedulerAgentApi`）の中にあります。ほかの型の頭の `Agent` は問 30-1 で問います。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 31-13 | `AgentTableRows` | 表の行の 1 ページ分。知らない表の名なら断りの値。 | `ScreenTablePage` |
| 31-16 | `AgentTableRow` | 表の 1 行。行の対象とセル。 | `ScreenTableRow` |
| 31-9 | `AgentTableColumn` | Agent API が並べる、表の 1 つの列。 | `ScreenTableColumn` |
| 31-19 | `AgentTableCell` | 表の行の 1 つのセル。 | `ScreenTableCell` |
| 31-4 | `AgentSearchPage` | 検索ウィンドウの 1 ページ分。タスクの行、コメントボックスの行、列、総数、続きの位置。 | `SearchWindowPage` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の「案 a の名」の 5 つ | 頭が物（画面の表・検索ウィンドウ）を言う | 名が少し長い |
| b | `TablePage`・`TableRow`・`TableColumn`・`TableCell`・`SearchPage` | 短い | `Table` だけでは、GRS JSON の表の窓の型（`TaskTableWindow` など）と紛れる |
| c | 今のまま | 名を変えない | 頭の `Agent` が物を言わない |

推し a: ① 頭が型の中身（画面の表）を言う（`NEIM`・`JDG-820`）。② `Screen` が付くので、GRS JSON の表の窓の型（`JDG-3620`）と取り違えない（`OKPN`）。③ 道具 `readSearchRows`・`readTableRows` は今のままでよい（動詞と目的語が物を言う）。

回答:

#### ❓ 問 31-1-2. 表の列を見分けるキー `id` の名

状態: OPEN

場面: 同じ答えの各列は、キー `id` を持ちます。今の値は仕様書の行 ID（`SQ-1` など）です。`JDG-3285` は行 ID を外へ出すのをやめ、値を変わらない英語の名（`plannedStart` など）にしました。名付けるのは列の**キー**です。

```json
// 今
{ "id": "SQ-1", "ja": "予定開始", "en": "Planned Start", "valueType": "date" }
// 案 a
{ "key": "plannedStart", "ja": "予定開始", "en": "Planned Start", "valueType": "date" }
```

GRS JSON は同じ値を型 `ColumnKey`（`JDG-3514`）とキー `column`（`ColumnFilter.column`・`ColumnSort.column`）で持ちます。GRS JSON の `id` は、GRS 固有の実体のランダムな UUID です（`JDG-3565`）。行はキー `key` で、表の中のどの行かを見分けます。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `key`（値は `ColumnKey`） | 行の `key` と同じく「表の中で見分ける名」を言う。値の型 `ColumnKey` と語がそろう | 行の `key`（タスクの uid など）と値の種類が違う |
| b | `column`（値は `ColumnKey`） | セルの `column`・GRS JSON の `column` と同じ語 | 持ち主 `…Column` の名を繰り返す（決まり N-4、`JDG-3609`） |
| c | `id` のまま、値だけを `ColumnKey` にする | キーの名を変えない | GRS JSON の `id`（UUID）と同じ綴りで別の物を指す |

推し a: ① 行と列が同じ語 `key` で「表の中で見分ける名」を持つ（`OKPN`）。② `id` は GRS JSON で UUID を言う（`JDG-3565`）ので、別の物に使わない（`OMPV`）。③ セルの `column` は今のままでよく、GRS JSON の `column` と 1 語にまとまる。

回答:

#### ❓ 問 30-1. 値の型の頭 `Agent` と、答えの型の末尾の名

状態: OPEN

場面: Agent API の道具は、引数と答えに型を持ちます。11 の型が頭に `Agent` を持ちます。名付けるのは 11 の**型**です。

```text
applyCommands(request: AgentWriteRequest): AgentWriteOutcome
exportSvg(…): AgentExport
watchChanges(…): AgentWatch
```

`Agent` は呼ぶ者を言い、型の中身を言いません（`JDG-820`）。型はもう Agent API の中にあるので、頭の `Agent` は同じことを 2 度言います。末尾もばらばらです。答えの型の 4 つは `Outcome` で終わり、`AgentExport`・`AgentWatch` は名詞だけで終わります。

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

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 頭の `Agent` を外し、答えの型の末尾を `Outcome` にそろえる（表の「案 a の名」） | 型の名が中身と役目を言う。答えの型が 1 つの形にそろう | 11 の名がすべて変わる |
| b | 頭の `Agent` を全部に残し、末尾だけをそろえる（`AgentExportOutcome`・`AgentWatchOutcome`・`AgentDelayDiagnosisReport`） | Agent API の型であることが、名だけで分かる | 頭が同じことを 2 度言い、名が長い |
| c | 今のまま | 名を変えない | 頭が物を言わず、末尾がばらばら |

推し a: ① 型の名が中身（書き込みの依頼・答え）を言う（`NEIM`・`JDG-820`）。② 答えの型を 1 つの末尾 `Outcome` で言う（`OKPN`）。③ 断りの型は問 33-3、画面の表の型は問 31-1 で同じ考えに当てる。

回答:

#### ❓ 問 30-2. 日程表を絞る表の名の型 `VisibilityTable` の名

状態: OPEN

場面: AI が `readShownTasks` を呼ぶと、答えの欄 `filteringTables` が、日程表を絞っている表の名を並べます。その値の型が `VisibilityTable` です。名付けるのは**型**です。

```json
{ "drawnTaskUids": [7, 8], "filteringTables": ["searchWindow"] }
```

値は `documentSettings.tableWindows` のキーの名（`searchWindow`・`delayDiagnosticsReportWindow`・`resourceListWindow`）です（`JDG-3410`・`JDG-3544`）。`JDG-3620` は窓の物の型を 2 つ（`TaskTableWindow`・`ResourceTableWindow`）に分けました。`Visibility`（見えること）は、表が何かを言いません。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `TableWindowName` | 値が窓の物でなく、`tableWindows` のキーの名であることを言う | 名が少し長い |
| b | `TableWindow` | GRS JSON の `tableWindows` と同じ語で短い。前の席の推し | `JDG-3620` の 2 つの窓の型の親の型と読め、窓の物と紛れる |
| c | `ScheduleFilteringTable` | 日程表を絞る役目を言い、欄 `filteringTables` と語がそろう | GRS JSON の `tableWindows` と別の語になる |

推し a: ① 値の中身（窓のキーの名）を名が言う（`NEIM`）。② 窓の物の型（`TaskTableWindow`・`ResourceTableWindow`）と取り違えない（`OKPN`・`JDG-3620`）。③ GRS JSON の `tableWindows` と同じ語を使う（`JDG-3410`）。

回答:

#### ❓ 問 30-3. 取り込みで人に出した問いを言う欄 `asked` の名

状態: OPEN

場面: AI が `importDocument` を呼び、ページが人に問いを出したとき、ページはまだ何も書かずに答えを返します。答えの欄 `asked` が、出した問いを言います。名付けるのは**欄**です。

```json
// 今
{ …, "asked": "U-61" }
// 案 a（値は JDG-3285 のとおり変わらない英語の名。席の案）
{ …, "pendingQuestion": "mergeChoice" }
```

今の値は仕様書の行 ID（`U-61`・`QN-17`）です。`JDG-3285` により、値は変わらない英語の名になります。名 `asked`（問うた）は過去分詞で、真偽の値とも読めます。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `pendingQuestion` | 人の答えを待つ問いを言い、今どうなっているかが分かる | 名が長い |
| b | `askedQuestion` | 「出した問い」を言い、今の名に近い | 問いが答えを待っていることを言わない |
| c | `asked` のまま（値だけを英語の名にする） | 名を変えない | 過去分詞で、真偽の値と読み違える |

推し a: ① 名が中身（人の答えを待つ問い）を言う（`NEIM`）。② 真偽の値は `is…` で言う決まり（N-9）があり、`asked` はそれと紛れる（`OMPV`）。

回答:

#### ❓ 問 30-4. 変更の知らせの欄 `mark` と、その型 `WatcherMark` の名

状態: OPEN

場面: AI が `watchChanges` で変更を待つと、ページは変更の知らせ `ChangeNotice` を渡します。知らせは欄 `mark`（型 `WatcherMark`）を持ちます。中身は 1 つの時刻で、書き手が受け取った所までのスケジュールデータの更新の時刻です（src は `seenScheduleUpdatedAt` と呼ぶ）。名付けるのは**欄**と、その**型**です。

```text
今:   ChangeNotice { mark: WatcherMark, … }      WatcherMark = スケジュールデータの更新の時刻
案 a: ChangeNotice { seenScheduleDataUpdatedAt: UtcInstant, … }
```

`mark`（印）は、何の印かを言いません。刻印は同じ時刻を `scheduleDataUpdatedAt` と呼びます。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 欄 `seenScheduleDataUpdatedAt`。型 `WatcherMark` を無くし、値の型を `UtcInstant` にする | 刻印の `scheduleDataUpdatedAt` と同じ語で、何の時刻かを言う | 名が長い |
| b | 欄 `receivedUpTo`。型は `UtcInstant` | 「どこまで受け取ったか」を短く言う | 何の時刻かを言わない |
| c | 今のまま | 名を変えない | `mark` が何の印かを言わない |

推し a: ① 刻印の `scheduleDataUpdatedAt`（`JDG-3380`）と同じ語で、同じ時刻を 1 つの語で呼ぶ（`OKPN`・`JDG-3410`）。② 中身が 1 つの時刻なので、包む型は要らない。時刻の型 `UtcInstant`（`JDG-3521`）で言う（`NEIM`）。

回答:

#### ❓ 問 30-4-2. 知らせを受け取る関数の引数 `receive` の名

状態: OPEN

場面: AI が `watchChanges` を呼ぶとき、引数 `receive` に、知らせを受け取る関数を渡します。MCP の道具は代わりに `waitMs` を受け取ります。名付けるのは**引数**です。

```js
api.watchChanges({ watcher: "agent-1", receive: (notice) => { … } })
```

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `receive` のまま | 動詞 1 語で「受け取る」を言い、短い | 関数を渡す引数であることを、名だけでは言わない |
| b | `onChangeNotice` | 呼ばれる関数を `on…` で呼ぶ、よくある書き方 | 出来事の名の決まり（過去形、`JDG-3674`）と形が違う |

推し a: ① 名が関数の働き（知らせを受け取る）を言う（`NEIM`）。② 出来事の名（過去形の `…Requested`・`…ed`、`JDG-3674`）と別の形に保ち、出来事と取り違えない（`OMPV`）。

回答:

#### ❓ 問 30-5. 受け渡す値の 36 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。1 ページの答えは、2 つの並びを持つ検索ウィンドウだけが `task…`・`commentBox…` の頭を付け（`taskRows`・`taskTotal`）、1 つの並びの表は頭を付けません（`rows`・`total`）。列の値の種類 `valueType` は `JDG-3564` で決まったので、表から外しました。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 30-3 | `Selection` | 選んだもの | readSelection が返す、選んだ順に並んだ選んだもの。 | 画面の選択 |
| 30-4 | `SearchRows` | 検索ウィンドウの行 | 画面が作る、検索ウィンドウの表の行。 | 画面の検索ウィンドウ |
| 30-9 | `ok` | 受け入れたか | 呼び出しを受け入れた（真）か断った（偽）か。断った答えは refusal を持つ。 | 無し |
| 30-10 | `expectedStamp` | 照らす刻印 | 呼ぶ側が最後に読んだ刻印。今の刻印と 1 つでも違えば、ページは書き込みをまるごと断る。 | GRS JSON の `documentStamp` |
| 30-11 | `commands` | 命令の束 | 文書の命令の束。束の単位でまとめて当てる。 | 無し |
| 30-13 | `hasUpdatedSchedule` | スケジュールデータを変えたか | 書き込みがスケジュールデータを変えたか。変えればその更新の時刻が進む。（`JDG-2680`） | 無し |
| 30-14 | `createdUids` | 作ったものの uid | この書き込みで作ったものの uid（タスク・担当・割当・カレンダーが 1 つの数え手を分け合う）を小さい順に並べたもの。何も作らなければ空。 | 無し |
| 30-15 | `refusal` | 断り | 断った呼び出しの、断りの値。 | 無し |
| 30-17 | `value`（持ち主 `AgentExport`） | 書き出した値 | 書き出した値。 | 無し |
| 30-19 | `isScrolled` | 寄せたか | タスクが見えるように表示を寄せたか。ピン止めしたタスクグループに阻まれたら偽。（`JDG-2245`） | 無し |
| 30-21 | `text`（持ち主 `AgentImportSource`） | GRS JSON の文字列 | 1 つの文字列で渡す GRS JSON。 | 無し |
| 30-25 | `drawnTaskUids` | 描いているタスク | いま日程表に描いているタスクの uid の並び。スケジュールフィルターを掛けた表が無ければ null。 | 無し |
| 30-26 | `filteringTables` | 絞っている表 | スケジュールフィルターを掛けている表の名の並び。（`JDG-2687`） | 無し |
| 30-28 | `fixProposals` | 修正案 | 遅延診断の修正案の行。（`JDG-2141`） | 画面の修正案の表 |
| 30-30 | `notice` | 変更の知らせ | 届いた変更の知らせ。 | 無し |
| 30-32 | `hasReplacedEarlierWatch` | 先の購読を置き換えたか | この購読が、呼ぶ側が先にしていた購読を置き換えたか。（`JDG-2245`） | 無し |
| 30-33 | `stopWatching` | 購読をやめる | 購読をやめ、やめた購読があったかを返す。 | 無し |
| 30-35 | `watcher` | 購読する書き手 | 知らせを受け取る書き手の名。 | GRS JSON の刻印の書き手の名 |
| 30-37 | `ChangeNotice` | 変更の知らせ（型） | 呼ぶ側以外の書き手が変更を確定したことの知らせ。今の刻印を持ち、文書は持たない。呼ぶ側は要るものを読み直す。 | 無し |
| 30-38 | `taskRows` | タスクの行 | 検索ウィンドウのタスクの行のうち、offset から limit までのもの。 | 検索ウィンドウのタスクの表 |
| 30-39 | `commentBoxRows` | コメントボックスの行 | 検索ウィンドウのコメントボックスの行。ページに分けない。 | 検索ウィンドウのコメントボックスの表 |
| 30-40 | `columns` | 列の一覧 | その表の列の一覧。列を見分ける名、画面の名前、値の種類。（列を見分けるキーの名は問 31-1-2） | 無し |
| 31-1 | `taskTotal` | タスクの行の総数 | 絞った後のタスクの行の数。マイルストーンと親タスクも 1 行に数える。 | 無し |
| 31-2 | `offset`（持ち主 `AgentApi`） | 始めの位置 | 返した最初の行の位置。0 から数える。 | 無し |
| 31-3 | `nextOffset` | 続きの位置 | 続きの最初の位置。続きが無ければ null。 | 無し |
| 31-6 | `ja` | 日本語の列の名 | 日本語の画面での列の名。 | 画面の日本語の列見出し |
| 31-7 | `en` | 英語の列の名 | 英語の画面での列の名。 | 画面の英語の列見出し |
| 31-10 | `table` | 表の名 | 読む表、または読んだ表。遅延診断レポートの表、担当リストの表、修正案の表、修正の記録の表のどれか。（修正案と修正の記録の表の名は問 34-1） | 無し |
| 31-11 | `rows` | 行 | 表の行のうち、offset から limit までのもの。 | 無し |
| 31-12 | `total` | 行の総数 | 絞った後の行の数。 | 無し |
| 31-14 | `key` | 行の対象 | 行が何についての行か。遅延診断レポートではタスクの uid、担当リストでは担当の uid（担当の無い行は unassigned）。 | 無し |
| 31-15 | `cells` | セル | 列ごとの、画面に出す値。 | 無し |
| 31-18 | `text`（持ち主 `AgentTableCell`） | セルの文字 | 英語の画面に出す値の文字。 | 画面の英語のセルの文字 |
| 31-20 | `savedTo` | 保存した所 | 書いたファイルの、保存先のフォルダの下の絶対の所。（`JDG-2814`） | 無し |
| 31-21 | `bytes` | バイト数 | 書いたバイト数。 | 無し |
| 31-22 | `backedUpTo` | 控えの所 | 上書きの前の中身を移した .bak の絶対の所。上書きでなければ null。（`JDG-2814`） | 無し |

回答:

**断り**

#### ❓ 問 33-3. 呼び出しの断りと命令の断りの、2 つの型の名

状態: OPEN

場面: AI の呼び出しをページが断ると、答えは欄 `refusal` に断りを持ちます。束の中の命令が断られたときは、その断りが欄 `commandRefusals` に、命令ごとの断りを並べます。名付けるのは 2 つの**型**です。

```json
{ "ok": false,
  "refusal": { "from": "page", "member": "applyCommands", "reason": "commandRefused", "message": "…",
               "commandRefusals": [ { "commandIndex": 2, "commandType": "editTask", "reason": "endBeforeStart", "field": "set.finish" } ] } }
```

今の名では、外側の型が `AgentRefusal`（呼び出しの断り）で、内側の型が `Refusal`（1 つの命令の断り）です。短い名が狭い物を指し、長い名が広い物を指します。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 外側 `Refusal`、内側 `CommandRefusal` | 型の名が欄の名とそろう（`refusal` と `Refusal`、`commandRefusals` と `CommandRefusal`） | 今の `Refusal` と同じ綴りが別の物を指すようになり、移る間に読み違えやすい |
| b | 外側 `CallRefusal`、内側 `CommandRefusal` | 2 つとも何の断りかを名が言う | 欄 `refusal` と型の名がずれる |
| c | 今のまま | 名を変えない | 短い名が狭い物を指し、頭の `Agent` は物を言わない |

推し a: ① 型の名と欄の名を 1 つの語でそろえる（`OKPN`）。② 頭の `Agent` は物を言わない（`JDG-820`。問 30-1 と同じ考え）。③ 内側の名が `commandIndex`・`commandType` と同じ語 `command` を持つ。

回答:

#### ❓ 問 31-2. 断った者を言う欄 `from` の名

状態: OPEN

場面: ページか取次が呼び出しを断ると、断りは欄 `from` に、断ったのがページか取次かを書きます（値 `page`・`relay`）。名付けるのは**欄**です。

```json
{ "ok": false, "refusal": { "from": "relay", "member": "readDocument", "reason": "pageNotConnected", "pageUrl": "…" } }
```

`from`（から）は前置詞で、何の値かを言いません（`JDG-820`）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `refusedBy` | 名が中身（断った者）を言う。刻印の `lastEditedBy`、変更履歴の `changedBy` と同じ「…By」の形 | 今の名より長い |
| b | `source` | 出どころを言い、短い | `importDocument` の引数 `source`（取り込む文書）と同じ綴りで別の物を指す |
| c | 今のまま | 名を変えない | 前置詞のキーで、何の値かを言わない |

推し a: ① 名が中身（断った者）を言う（`NEIM`・`JDG-820`）。② 「…した者」を `…By` で言う形が、GRS JSON の `lastEditedBy`・`changedBy` とそろう（`OKPN`）。

回答:

#### ❓ 問 31-2-2. 文書の誤りの所を言う欄 `at` の名

状態: OPEN

場面: 取り込んだ文書に誤りがあると、ページは断りの欄 `documentFaults` に誤りを 1 つずつ並べます。各誤りは欄 `at` に、誤りの所を JSON Pointer で書きます。名付けるのは**欄**です。

```json
{ "reason": "documentInvalid", "documentFaults": [ { "at": "/scheduleData/tasks/3/finish", "message": "…" } ] }
```

`at`（で）は前置詞で、何の値かを言いません（`JDG-820`）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `pointer` | 値の形（JSON Pointer、RFC 6901）を名が言う | 何を指すか（誤りの所）は持ち主 `documentFaults` に頼る |
| b | `jsonPointer` | 値の形をはっきり言う | 名が長い |
| c | 今のまま | 名を変えない。`{ at, message }` の組として短く読める | 前置詞のキーで、何の値かを言わない |

推し a: ① 名が値の形（JSON Pointer）を言う（`NEIM`・`JDG-820`）。② 持ち主 `documentFaults` が「誤り」を言うので、`pointer` だけで「誤りの所」と読める（決まり N-4: 持ち主の名を繰り返さない）。

回答:

#### ❓ 問 32-1. 人かページが手を離せない 4 つの理由の名

状態: OPEN

場面: 人がドラッグしている間や、ページが人に問いを出している間に AI が書くと、ページは書き込みを断ります。AI は少し後でもう一度試します。名付けるのは断りの理由の 4 つの**値**です。

```json
{ "ok": false, "refusal": { "from": "page", "member": "applyCommands", "reason": "gestureInFlight", "message": "…" } }
```

4 つの理由は、どれも「いま書けない。少し後で試す」を言います。名の形はばらばらです（名詞＋`InFlight`・動名詞・名詞＋過去分詞・動名詞）。取り込みの `cause` の値 `openInProgress` は、名詞＋`InProgress` の形です。`gesture` は、画面の語「ドラッグ」と違う語です。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 32-4 | `gestureInFlight` | 人が文書を変えるドラッグの途中である。 | `dragInProgress` |
| 32-5 | `editingInPlace` | 人がその場で打ち込んでいて、まだ確定していない。 | `inPlaceEditInProgress` |
| 32-6 | `questionAsked` | ページが人に確認の問いを出している。 | `confirmationInProgress` |
| 32-7 | `deliveringNotices` | ページが変更の知らせを配っている途中である。 | `noticeDeliveryInProgress` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 名詞＋`InProgress` にそろえる（表の「案 a の名」） | 4 つが 1 つの形で「進んでいる最中の物」を言う。`openInProgress` とそろう | 名が少し長くなる |
| b | `gestureInFlight` だけを `dragInProgress` にする | 画面の語「ドラッグ」に合わせる 1 つだけを直す | 4 つの形はばらばらのまま |
| c | 今のまま | 名を変えない | 形がばらばらで、AI が「待てばよい理由」の組と読み取りにくい |

推し a: ① 同じ種類の理由を 1 つの形で言う（`MECE`・`OKPN`）。② `dragInProgress` は画面の語「ドラッグ」を使う（`NEIM`）。

回答:

#### ❓ 問 32-2. 無いタスクを名指したときの 2 つの理由 `unknownTask` と `notFound` を 1 つにするか

状態: OPEN

場面: AI が `focusTask` に無いタスクの uid を渡すと、ページは `unknownTask` で断ります。命令が無い実体を名指すと、ページは命令の断りに `notFound` を書きます。名付けるのは断りの理由の**値**です。

```json
focusTask({ "taskUid": 999 })
// → { "reason": "unknownTask", … }
applyCommands({ …, "commands": [ { "type": "editTask", "taskUid": 999, "set": { "name": "x" } } ] })
// → { "reason": "commandRefused", "commandRefusals": [ { "reason": "notFound", … } ] }
```

2 つの名が、1 つのこと（名指した物が無い）を言います。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 道具も命令も `notFound` で断る | 1 つのことに 1 つの名 | 道具の断りが、何が無いかを名だけでは言わない（欄が言う。問 32-2-2） |
| b | 2 つを残し、`unknownTask` を `taskNotFound` にする | `notFound` と同じ語を使い、タスクであることも言う | 同じことに 2 つの名が残る |
| c | 今のまま | 名を変えない | 2 つの語（`unknown`・`notFound`）が 1 つのことを言う |

推し a: ① 1 つのことに 1 つの名（`OKPN`）。② 何が無いかは欄（問 32-2-2）と `message` が言う（`SoC`）。

回答:

#### ❓ 問 32-2-2. 見つからない uid を並べる欄 `taskUids` の名

状態: OPEN

場面: 無いタスクの uid を受けると、ページは断りの欄 `taskUids` に、見つからない uid を並べます。道具 `showOnlyTasks` の引数も `taskUids`（見せるタスク）です。断りの値は平らな形なので、名だけを読むと引数と同じに見えます。名付けるのは**欄**です。

```json
showOnlyTasks({ "taskUids": [7, 999] })
// → { "reason": "unknownTask", "taskUids": [999] }
```

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `missingTaskUids` | 名が中身（見つからないタスク）を言う | 今の名より長い |
| b | `notFoundTaskUids` | 理由 `notFound` と同じ語を使う | 語の並びが英語として読みにくい |
| c | 今のまま | 名を変えない | 渡した全部と、見つからない分を取り違える |

推し a: ① 名が中身（見つからないタスクの uid）を言う（`NEIM`）。② 呼んだときの引数 `taskUids` と別の名になり、2 つの並びを取り違えない（`OKPN`）。

回答:

#### ❓ 問 32-3. このページの造りが持たない部分の 2 つの理由 `notAvailable` と `notImplemented` を 1 つにするか

状態: OPEN

場面: AI がこのページの造りが持たないメンバを呼ぶと、ページは `notAvailable` で断ります。AI がまだ作っていない欄（`editableByGroupName`）を書こうとすると、ページは `notImplemented` で断ります。名付けるのは断りの理由の**値**です。

```json
{ "reason": "notAvailable", "member": "exportPng" }
{ "type": "editTaskGroup", "taskGroupId": "…", "set": { "editableByGroupName": "…" } }
// → 命令の断り notImplemented
```

src は `notAvailable` の説明に「not built yet」と書きます。2 つは同じこと（このビルドが、その部分をまだ持たない）を言います。`notAvailable` は「今だけ使えない」とも読め、AI が同じ呼び出しを繰り返すおそれがあります。`unknownCommand`（どの命令の名でもない）は別のことを言います。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | メンバも欄も `notImplemented` で断る | HTTP の 501 Not Implemented と同じ意味で、繰り返しても無駄だと分かる | 「造りが持たない」と「まだ作っていない」の違いを名で言わない |
| b | 2 つを残し、`notAvailable` を `memberNotSupported` にする | メンバの断りであることを言う | 同じことに 2 つの名が残る |
| c | 今のまま | 名を変えない | `notAvailable` が「今だけ」と読める |

推し a: ① 1 つのことに 1 つの名（`OKPN`）。② 広く知られた語（HTTP の Not Implemented）で、初めて読む AI にも意味が通じる（`NEIM`）。③ `unknownCommand` は今のままでよい。

回答:

#### ❓ 問 32-4. 範囲の外の値の 2 つの理由 `outOfRange` と `settingOutOfBounds` を 1 つにするか

状態: OPEN

場面: AI が許す範囲の外の数を書くと、ページは `outOfRange` で断ります。AI が設定の値に、ほかの設定の値が決める上限を超える数を書くと、ページは `settingOutOfBounds` で断ります。どちらの断りも、欄 `min`・`max` に範囲を書きます。名付けるのは断りの理由の**値**です。

2 つは「値が範囲の外」を言い、違いは下限と上限の出どころだけです。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | どちらも `outOfRange` で断り、`min`・`max` に範囲を書く | 1 つのことに 1 つの名 | 上限がほかの設定から来たことを、名で言わない |
| b | 2 つを残し、語をそろえる: `settingOutOfRange` | 設定の値であることを言い、語 `Range` がそろう | 同じことに 2 つの名が残る |
| c | 今のまま | 名を変えない | `Range` と `Bounds` の 2 つの語が 1 つのことを言う |

推し a: ① 1 つの名に 1 つの意味（`OMPV`・`OKPN`）。② 範囲そのものは `min`・`max` が言うので、名で出どころを分けなくてよい（`SoC`）。

回答:

#### ❓ 問 32-5. 「終わりが始まりより前」を言う 3 つの理由の名と受け持ち

状態: OPEN

場面: AI がハイライトボックスの `lastDay` を `firstDay` より前に書くと、ページは書き込みを断ります。今は 3 つの理由が「終わりが始まりより前」を言います。名付けるのは断りの理由の**値**です。

```json
{ "type": "editHighlightBox", "highlightBoxId": "…", "set": { "firstDay": "2026-12-10", "lastDay": "2026-12-01" } }
// → 命令の断り highlightBoxInverted
```

`endBeforeStart` は、予定の終了と開始、ハイライトボックスの `lastDay` と `firstDay` を受け持ちます。`highlightBoxInverted` も `lastDay` と `firstDay` を受け持ち、加えて最初と最後のタスクグループの逆さを受け持ちます。`negativeActualLength` は、実績の終わりと始まりを受け持ちます。仕様書は後の 2 つを「予定の 2 列について定めるものを、注記と実績について定める」と書きます（`IV-19`・`IV-21`）。`JDG-3528` は箱の上下のキーを `firstTaskGroupId`・`lastTaskGroupId` に改めました。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 日時の前後は、予定・実績・注記のどれも `endBeforeStart`。`highlightBoxInverted` はタスクグループの逆さだけを受け持ち、名を `lastTaskGroupBeforeFirst` にする。`negativeActualLength` は無くす | 1 つのこと（日時の前後）に 1 つの名。タスクグループの逆さの名が `JDG-3528` の語とそろう | 実績の断りか予定の断りかを、名だけでは言わない（`field` が言う） |
| b | 3 つを残し、受け持ちを分ける: 予定は `endBeforeStart`、実績は `actualEndBeforeStart`、注記は `highlightBoxInverted`（日とタスクグループの両方） | 名だけで、どの物の断りかが分かる | 同じこと（日時の前後）に 3 つの名が残る |
| c | 今のまま | 名を変えない | 2 つの名が同じ日の前後を受け持ち、受け持ちが重なる |

推し a: ① 1 つのことに 1 つの名を当て、受け持ちを重ねない（`OKPN`・`MECE`）。② タスクグループの逆さを、`JDG-3528` の first・last の語で言う（`NEIM`）。

回答:

#### ❓ 問 32-6. 親の輪を言う命令の理由 `wouldMakeCycle` を、文書の理由の名にそろえるか

状態: OPEN

場面: AI がタスクグループ A を、A の子 A1 の下へ動かそうとすると、ページは命令を `wouldMakeCycle` で断ります。読んだ文書の中で親の結び付きが輪になっていると、ページは文書を `taskParentCycle`・`taskGroupParentCycle` で断ります。名付けるのは断りの理由の**値**です。

```json
{ "type": "moveTaskGroup", "taskGroupId": "A", "parentTaskGroupId": "A1" }
// → 命令の断り wouldMakeCycle
```

2 つは同じ輪を言い、命令の側は「輪になる」と先のことを言います。ほかの理由（`duplicateKey`・`endBeforeStart` など）は、文書と命令で同じ名を使います。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 命令も `taskParentCycle`・`taskGroupParentCycle` で断る | 文書と命令で同じ名を使う、ほかの理由と同じ形になる | 命令の断りが「まだ輪になっていない」ことを名で言わない |
| b | 3 つを 1 つの `parentCycle` にまとめる。どの実体の輪かは `field` と `message` が言う | 名が 1 つで済む | タスクの輪かタスクグループの輪かを、名で言わない |
| c | 今のまま | 名を変えない | 1 つの輪が 2 通りの名を持つ |

推し a: ① 1 つのこと（親の輪）に、文書と命令で 1 つの名を使う（`OKPN`）。② ほかの理由の決まり（文書と命令で同じ名）とそろう。

回答:

#### ❓ 問 32-7. 無いタスクグループのピン止めの理由 `pinnedTaskGroupMissing` を `danglingReference` にまとめるか

状態: OPEN

場面: 読んだ文書の `pinnedTaskGroupIds` が、文書に無いタスクグループの id を持つと、ページは文書を `pinnedTaskGroupMissing` で断ります。ほかのプロパティが無い実体を指すと、ページは `danglingReference` で断ります。名付けるのは断りの理由の**値**です。

```json
"documentSettings": { "pinnedTaskGroupIds": ["9f…"] }
// "9f…" のタスクグループが文書に無い → pinnedTaskGroupMissing
```

`pinnedTaskGroupIds` もタスクグループを指すプロパティなので、後者は前者の 1 つです。仕様書は 2 つを別の行に置きます（`IV-2` は外部キーの列、`IV-3` は文書の設定の値を受け持つ）。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | `danglingReference` にまとめる。どのプロパティかは、誤りの所（`at`。問 31-2-2）が言う | 1 つのこと（指す先が無い）に 1 つの名 | ピン止めの誤りであることを、名だけでは言わない |
| b | 2 つを残し、`pinnedTaskGroupMissing` を `danglingPinnedTaskGroup` にする | 語 `dangling` がそろい、ピン止めであることも言う | 同じことに 2 つの名が残る |
| c | 今のまま | 名を変えない | 同じことを 2 つの語（`dangling`・`Missing`）で言う |

推し a: ① 1 つのことに 1 つの名（`OKPN`）。② どのプロパティかは誤りの所が言う（`SoC`）。

回答:

#### ❓ 問 32-8. 取り込みを当てなかった理由 `importNotLanded` と、その訳 `cause` の値の名

状態: OPEN

場面: AI が `importDocument` を呼んでも、人が取りやめたときや、文書が検査を通らないとき、ページは取り込みを当てずに断ります。理由 `importNotLanded` の欄 `cause` が、3 つの値で訳を言います。名付けるのは理由の**値**と、`cause` の 3 つの**値**です。

```json
{ "ok": false, "refusal": { "member": "importDocument", "reason": "importNotLanded", "cause": "importCanceled", … } }
```

「着地（land）」は席の中のたとえで、外の読み手には何が起きたかが見えにくい語です。値 `notValidated` は「文書が検査を通らなかった」を言い、理由 `documentInvalid` と同じことを言います。値 `importCanceled` は、持ち主の `import…` と語を重ねます。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 32-18 | `importNotLanded`（持ち主 `reason`） | 取り込みを当てなかった。人が取りやめたか、開く操作の途中だったか、文書が検査を通らなかった。 | `importNotApplied` |
| 33-15 | `cause` | 取り込みを当てなかった訳。 | `cause` |
| 33-16 | &emsp;+- `openInProgress`（持ち主 `cause`） | 開く操作の途中だった。 | `openInProgress` |
| 33-17 | &emsp;+- `notValidated`（持ち主 `cause`） | 文書が検査を通らなかった。 | `documentInvalid` |
| 33-18 | &emsp;+- `importCanceled`（持ち主 `cause`） | 人が取り込みを取りやめた。 | `canceled` |
| 32-22 | `documentInvalid`（持ち主 `reason`） | 取り込んだ文書が取り込みの検査を通らなかった。documentFaults が誤りを 1 つずつ並べる。 | `documentInvalid` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の「案 a の名」 | `importNotApplied` が何が起きたかを言う。検査の失敗を理由と同じ語 `documentInvalid` で言う | `cause` の値 `documentInvalid` と理由 `documentInvalid` が同じ綴りで、置き場が 2 つある |
| b | `importNotLanded` を残し、`notValidated` だけを `documentInvalid` にする | 変える名が 1 つで済む | たとえの語「着地」が残る |
| c | 今のまま | 名を変えない | たとえの語と、同じことを言う 2 つの名が残る |

推し a: ① 名が起きたこと（取り込みを当てなかった）を言う（`NEIM`）。② 検査の失敗を 1 つの語 `documentInvalid` で言う（`OKPN`）。③ `apply` は `applyCommands`・問 34-1 と同じ「文書に当てる」の動詞である。

回答:

#### ❓ 問 32-9. 何についての断りかを言わない 9 つの理由 —— before / after のとおりでよいか

状態: OPEN

場面: 9 つの理由の名は、何についての断りかを言わないか、兄弟の名と形が違います。下の表の after は、意味から選んだ名です。名付けるのは断りの理由の 9 つの**値**です。2 つの行（32-34・32-49）は、`JDG-3614`・`JDG-3615` の後に理由そのものが残るかを方針で決めます（`JDG-3686`）。残るなら after の名を使います。

| # | before | 意味（日本語） | after | after を選んだ訳 |
|:---|:---|:---|:---|:---|
| 32-3 | `notOwnStep` | 取り消すかやり直す段を書いたのが、呼んだ書き手ではなく別の書き手である。 | `notOwnEdit` | 道具 `undoEdit`・`redoEdit` と同じ語。「段」は中の語 |
| 32-11 | `tooTall` | 絵が、書き出せる高さより高い。 | `imageTooTall` | 何が高いかを言う。`fileTooLarge`・`taskTreeTooDeep` と同じ形 |
| 32-33 | `taskGroupTooDeep` | タスクグループの深さが 5 より深くなる。 | `taskGroupTreeTooDeep` | `taskTreeTooDeep` と対にする |
| 32-34 | `taskGroupMembershipBroken` | あるタスクが、ちょうど 1 つのタスクグループに入っていない。（`JDG-3615` でタスクが `grs.taskGroupId` を 1 つ持つ形になった） | `taskGroupMembershipCountNotOne` | 何が壊れたかを言う。`taskStyleCountNotOne` と同じ形 |
| 32-41 | `importSequenceAhead` | タスクの `grs.importOrigin.lastSeenMspdiImportCount` が `scheduleData.mspdiImportCount` より大きい。 | `mspdiImportCountAhead` | `JDG-3627`・`JDG-3649` のキー `mspdiImportCount`・`lastSeenMspdiImportCount` と同じ語 |
| 32-49 | `taskVisualCountNotOne` | あるタスクの見た目が、ちょうど 1 つでない。（`JDG-3614` で見た目はタスクの `grs.style` に入った） | `taskStyleCountNotOne` | GRS JSON の `style` と同じ語（問 36-6） |
| 32-61 | `limitReached` | タスクグループをピン止めしようとしたが、ピン止めの上限の 5 に達している。 | `pinLimitReached` | どの上限かを言う。この理由はピン止めだけが使う |
| 32-62 | `missingValue` | 写しの新しい id が対応表に無い。 | `newTaskGroupIdMissing` | 何の値かを言う（`pasteTaskGroupSubtree` の対応表の値。対応表の名は問 35-4） |
| 32-63 | `bothEndsAreOneTask` | 依存の両端が同じタスクである。 | `selfDependency` | 文の形をやめ、兄弟と同じ名詞の形にする。自分への依存の通り名 |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の after を全部採る | どの名も何についての断りかを言い、兄弟と形がそろう | 9 つの名が変わる |
| b | 直す行に ★ を書き、その行だけを改める | 行ごとに選べる | 形のそろわない名が残りうる |
| c | 今のまま | 名を変えない | 何についての断りかを言わない名が残る |

推し a: ① 名が何についての断りかを言う（`NEIM`）。② 兄弟の名と同じ形にそろう（`OKPN`）。③ GRS JSON の新しいキーの語（`JDG-3410`・`JDG-3627`・`JDG-3649`）とそろう。

回答:

#### ❓ 問 33-4. 断りに添える 5 つの欄 —— 何の値かを名に書くか

状態: OPEN

場面: ページの断りは、理由ごとに添える欄を持ちます。例えば `fileExists` の断りは、既にあるファイルを欄 `path` に書きます。名付けるのは 5 つの**欄**です。

```json
{ "reason": "fileExists", "path": "plan.json", … }
{ "reason": "retiredName", "name": "kind", "replacement": "type", … }
```

5 つの名は一般の語で、何の値かを理由の側に頼ります。断りの値は平らな形なので、名だけを読むと別の理由の値と混ざります（例: `path` はファイルの所、`at` は文書の中の所）。前の席の案 `retiredName` は、理由の値 `retiredName`（32-23）と同じ綴りになるので、`sentName` に改めました。

| # | 今の名 | 意味（日本語） | 案 a の名 |
|:---|:---|:---|:---|
| 33-9 | `seconds` | 取次があきらめるまでに待った秒数。 | `waitedSeconds` |
| 33-12 | `path` | 既にあるファイル。 | `existingFilePath` |
| 33-13 | `folder` | 使えない保存先のフォルダ。 | `saveFolder` |
| 33-21 | `name`（持ち主 `AgentRefusal`） | 送った、退けた名前。 | `sentName` |
| 33-22 | `replacement` | 退けた名前の代わりに使う名前。無ければ書かない。 | `replacementName` |

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 表の「案 a の名」の 5 つ | どの名も何の値かを言い、平らな断りの中で混ざらない | 名が長くなる |
| b | ほかの意味と混ざる 3 つ（`path`・`folder`・`name`）だけを改める | 変える名が 3 つで済む | `seconds`・`replacement` は何の値かを言わないまま |
| c | 今のまま | 名を変えない | 名だけを読むと、別の理由の値と混ざる |

推し a: ① 名が何の値かを言う（`NEIM`）。② 理由の値 `retiredName` と欄の名を別の綴りにし、1 つの綴りに 1 つの意味を持たせる（`OMPV`）。③ `min`・`max` は範囲の通り名（`JDG-3643` の許す略）なので今のままでよい。

回答:

#### ❓ 問 32-10. 断りの 47 語 —— 推奨の表のとおりでよいか

状態: OPEN

易しい語をまとめた推奨の表です。理由の名は「何が・どうなった」を言う変わらない英語の名で、仕様書の行 ID の代わりです（`JDG-3285`）。`commandType` は `JDG-3564` で決まったので、表から外しました。`knownSchemaVersion` は問 34-2-2 に移しました。直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | 既存の名との関係 |
|:---|:---|:---|:---|:---|
| 31-25 | &emsp;+- `page`（持ち主 `from`） | ページ | GRS のページが断った。（欄の名は問 31-2） | 無し |
| 31-26 | &emsp;+- `relay`（持ち主 `from`） | 取次 | 取次が自分で断った。 | 無し |
| 31-27 | `member` | 断られた呼び出し | どの呼び出しを断ったか。道具かメンバの名前。例えば applyCommands。 | 無し |
| 31-28 | `message` | 説明 | 人が読む、英語の短い説明。 | 無し |
| 32-1 | `reason`（持ち主 `AgentApi`） | 断りの理由 | 呼び出し、命令、または取り込んだ文書を断った理由。下の断りの理由のどれか。 | 無し |
| 32-2 | &emsp;+- `staleStamp`（持ち主 `reason`） | 古い刻印 | 渡した刻印が、今の刻印と少なくとも 1 つの値で違う。 | 無し |
| 32-8 | &emsp;+- `commandRefused`（持ち主 `reason`） | 命令の断り | 束の中の命令を断ったので、ページは束のどの命令も当てていない。 | 無し |
| 32-10 | &emsp;+- `notDrawnYet`（持ち主 `reason`） | まだ描いていない | ページがまだ画面を描いていないので、全体表示のように画面の大きさが要ることができない。 | 無し |
| 32-12 | &emsp;+- `rasterFailed`（持ち主 `reason`） | 画像にできない | ページが絵を画像にできなかった。 | 無し |
| 32-13 | &emsp;+- `embeddedHtmlFailed`（持ち主 `reason`） | HTML を組めない | ページが 1 つの .html のファイルを組めなかった。 | 無し |
| 32-15 | &emsp;+- `malformedRequest`（持ち主 `reason`） | 呼び方の形の誤り | 呼び方の形がスキーマに合わない。命令か、readSchema の which・defs・full のような引数。 | 無し |
| 32-16 | &emsp;+- `historyEmpty`（持ち主 `reason`） | 履歴が空 | 履歴に、取り消す（またはやり直す）段が無い。 | 無し |
| 32-19 | &emsp;+- `schemaViolation`（持ち主 `reason`） | スキーマ違反 | 渡した GRS JSON がスキーマに合わない。1..2147483647 の外の uid もこれに当たる（`JDG-3564`）。 | 無し |
| 32-20 | &emsp;+- `formatTooNew`（持ち主 `reason`） | 形式が新しすぎる | 文書のスキーマの版が、このビルドの知るいちばん新しい版より新しく、文書がスキーマに合わない。 | 無し |
| 32-21 | &emsp;+- `formatTooOld`（持ち主 `reason`） | 形式が古すぎる | 文書のスキーマの版が、このビルドの読む版より古い（α の文書）。このビルドは古い版の変換を持たない。 | 無し |
| 32-23 | &emsp;+- `retiredName`（持ち主 `reason`） | 退けた名 | 退けた名前を送った（命令の種類、メンバの名、引数の名、編集の欄の名）。 | 無し |
| 32-24 | &emsp;+- `pageNotConnected`（持ち主 `reason`） | ページが未接続 | 取次に GRS のページがつながっていない。 | 無し |
| 32-25 | &emsp;+- `relayTimedOut`（持ち主 `reason`） | 取次の時間切れ | ページが期限までに答えなかった。 | 無し |
| 32-26 | &emsp;+- `badFileName`（持ち主 `reason`） | ファイル名の誤り | fileName が、保存先のフォルダの中の相対のファイル名でない。 | 無し |
| 32-27 | &emsp;+- `fileExists`（持ち主 `reason`） | ファイルが既にある | ファイルが既にあり、呼ぶ側が overwrite に真を渡していない。 | 無し |
| 32-28 | &emsp;+- `saveFolderUnavailable`（持ち主 `reason`） | 保存先が使えない | 取次が保存先のフォルダを作れない、読めない、または書けない。 | 無し |
| 32-29 | &emsp;+- `duplicateKey`（持ち主 `reason`） | 鍵の重複 | 同じ配列の 2 つの実体が同じ鍵（id や uid など）を持つことになる。例えば、新しい実体の id がもう使われている。（意味の文は `JDG-3561`） | 無し |
| 32-35 | &emsp;+- `noCalendar`（持ち主 `reason`） | カレンダーが無い | カレンダーが無い。 | 無し |
| 32-36 | &emsp;+- `fillAndStrokeBothInvisible`（持ち主 `reason`） | 塗りも線も見えない | 塗りと線の両方が見えなくなる。fill も stroke も無いタスクの見た目か、stroke が無く fill.opacityPercent が 0 のハイライトボックス。（`JDG-3526`・`JDG-3607`） | 無し |
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
| 33-1 | `commandIndex` | 命令の位置 | 断った命令の、束の中の位置。0 から数える。 | 無し |
| 33-3 | `field` | 断られた欄 | 命令の中の、断った値。例えば set.start。 | 無し |
| 33-7 | `documentFaults` | 文書の誤り | 取り込んだ文書で見つかった問題ごとの誤り。所と説明を持つ。 | 無し |
| 33-14 | `pageUrl` | ページのアドレス | 取次に GRS のページをつなぐために人が開く、アドレスの全部。取次が起動するたびに変わる。 | 無し |
| 33-20 | `converterUrl` | 変換のページの所 | 古い文書を変換する HTML のページを入手する所。 | 無し |
| 33-23 | `min` | 下限 | 範囲の外にあった値の下限。 | 無し |
| 33-24 | `max` | 上限 | 範囲の外にあった値の上限、または達した上限。 | 無し |

回答:

## BGQA3 GRS JSON（後回し。2026-11-15、影響の小さい問い 6。問 6-9-2 は 2026-11-18 に BGQA3 の 13 回目へ出して決まった（`JDG-3624`））

#### ❓ 問 6-6-4-7. 色の要素の一覧 —— 抜けと誤りは無いか

状態: POLICY（JDG-3686）

色の形の名は、裁定がすべて決めました（`JDG-3523`・`JDG-3526`・`JDG-3541`・`JDG-3563`・`JDG-3607`・`JDG-3608`・`JDG-3610`・`JDG-3612`・`JDG-3636`）。残る名の問いは、パレットの `paper`・`ink`（問 6-6-4-12）と見た目の型の名（問 6-10-5）の 2 つです。要素の一覧に抜けや誤りが無いかは中身の確かめなので、適用する席（`CR-851`）が方針で確かめます。

回答:

#### ❓ 問 6-6-4-12. パレットの paper と ink —— 白と黒を、見え方の名で呼ぶか、役の名で呼ぶか

状態: OPEN

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

状態: CLOSED-BY JDG-3664（根は表示の値を持たない。値 `levelZeroTreeState` も画面の欄も除く）

場面: 問 6-13-1 の a で、`levelZeroTreeState` を `rootTreeState` に改め、タスクグループの階層を「深さ」で数えると決めました（`JDG-3602`）。辞書の日本語の名は、設定の欄の名（画面の語）を写します（`JDG-3518`）。画面の欄の名は、今も「段 0 の木の状態」（英語 Top-Level Tree State）です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 「木の根の状態」（英語 Root Tree State）にする。キー `rootTreeState` と同じ語になる。深さ 0 が木の根で、最上位のタスクグループの上にある |
| b | 「最上位の木の状態」（英語 Top-Level Tree State のまま）にする。「段 0」だけを外す |
| c | 今のまま |

回答:

#### ❓ 問 6-9-5. タスクと依存の、MSPDI の名と違う 3 語

状態: CLOSED-BY JDG-3694（`parentTaskUid` のまま。`fadeInCalendarDays`・`fadeOutCalendarDays` は `JDG-3635` で今のまま）

あなたの答え「MSPDI同じならOK。 違うならそこだけ抽出して、裁定に回せ。」に従い、MSPDI の名と同じ 17 語を確定しました（`JDG-3553`）。キーが MSPDI の名と違う 3 語を、ここに残しました。案は GRWB の議論の後でこの問いに書きます。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-1 | `parentTaskUid` |  | WBS での親タスク。この値を省くと最上位のタスク。 | 無し |
| 9-10 | <span style="color: #0550AE">`fadeInCalendarDays`</span> |  | 開始が未確定であることを示すために、予定バーの始まりにフェード斜面を描く暦日の数。矩形では始まりの辺が斜めになる。矢羽根では始まりの切り欠きの深さになる。ほかの形ではこの値を無視する。この値を省くとフェードの描画を省く（矢羽根は既定の深さを保つ）。0 は平らな始まり。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |
| 9-11 | <span style="color: #0550AE">`fadeOutCalendarDays`</span> |  | fadeInCalendarDays と同じことを終わりの側に対して行う（矢羽根では先の深さ）。GRS はこの値を MSPDI に Task/ExtendedAttribute として書く。（`JDG-3312`） | ExtendedAttribute |

回答:

#### ❓ 問 6-7-7. `recurrencePeriod` —— MSPDI の名 Period と違う名を保つか

状態: CLOSED-BY JDG-3628（MSPDI の名を写して `period`）

`JDG-3628` は、MSPDI の要素を写すキーに MSPDI の名を使うと決め、兄弟の Type を `type` にしました。同じ決まり（N-3、`JDG-3638` の優先 ③）で、Exception/Period を写すキーは `period` です。MSPDI と同じ名なので、あなたに問う所はありません（`JDG-3553`）。

回答:

## BGQA3 GRS JSON（11 回目の答えの後に出し直す。2026-11-17）（問 6-8-8 は 2026-11-18 に BGQA3 の 13 回目の表で問い直して決まった（`JDG-3628`）。問 6-13-5 の構造図は、JDG-3618〜3629 を当てて描き直してから出す）

#### ❓ 問 6-13-5. 構造図 —— 裁定と食い違う所を直した木で、全体を確かめるか

状態: OPEN（作り直し 2026-11-22）

場面: β の構造図は `grs-json-beta-tree.md`（2026-11-19 版）にあります。席はその木を、裁定 `JDG-3618`〜`JDG-3694` と照らしました。木と裁定は、下の 9 か所で食い違います。席は出す前に、木をこの表のとおりに直します。あなたは直した木で全体を見ます。`JDG-3617` は、仮の名の最終の決めを「全体を見てから」としました。

| # | 木の今のキー | 裁定が与える名 | 裁定 |
|:---|:---|:---|:---|
| 1 | `documentSettings.taskGroupAutoExpandDepth` | `automaticallyShownDepth`（置き場は問 6-12-0-2） | `JDG-3651`・`JDG-3662`・`JDG-3665`・`JDG-3674` |
| 2 | `documentSettings.taskGroupRootTreeState`（`auto`・`collapsed`） | 無くなる（根は表示の値を持たない） | `JDG-3664` |
| 3 | `taskGroups[].treeState`（`auto`・`collapsed`・`expanded`・`temporarilyExpanded`・`hidden`） | `selfShowMode`（`shown`・`hidden`・`automatic`・`hiddenUntilZoomIn`。書かなければ `automatic`） | `JDG-3662`・`JDG-3663`・`JDG-3685` |
| 4 | `documentSettings.delayDiagnosticsToleranceWorkingDays`（仮） | `documentSettings.delayDiagnosticsSettings.toleranceWorkingDays`（綴りは問 6-12-0-3） | `JDG-3646` |
| 5 | `documentSettings.tableWindows.delayDiagnosticsReportWindow` | `delayDiagnosisReportWindow`（問 6-12-0-3） | `JDG-3512` |
| 6 | `scheduleData.topTaskOutlineLevel` | `importedTopTaskOutlineLevel` | `JDG-3648` |
| 7 | `tasks[].grs.importOrigin.lastSeenMspdiImportNumber` | `lastSeenMspdiImportCount` | `JDG-3649` |
| 8 | `commentBoxes[].leaderTarget.snapPart` の値 `plannedBar`・`actualBar`・`milestone` | `planBar`・`actualBar`・`milestoneMark` | `JDG-3647` |
| 9 | `highlightBoxes[].topTaskGroupId`・`bottomTaskGroupId` | `firstTaskGroupId`・`lastTaskGroupId` | `JDG-3528` |

木で、まだ裁定の無い所（この問いで全体と一緒に決める）:

- 仮の名（`JDG-3617`）: `checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`・`sourceProjectUid`。
- 仮の置き場: `documentSettings.themeHue`。木は「置き場は問 6-13-4」と書きますが、問 6-13-4 は問 6-13-8（`JDG-3618`）に移り、`themeHue` の置き場を決めていません。

開いた問いにかかる所（その問いの答えで、席が木を直す）: `sourceUid`（問 6-10-6）・`style` の型の名（問 6-10-5）・`scrollPosition` の 2 つの `…OffsetPercent`（問 6-12-2）・`taskShape` と `milestoneShape` の値（問 6-9-1・6-10-2）・前回予定（問 6-10-3）・`lastEditedBy`（問 6-11-5）・パレットの `paper`・`ink`（問 6-6-4-12）。

名を付けるもの: 木の全体。仮の 4 つの名を確定し、`themeHue` の置き場を決める。

| 案 | 名 | 良い点 | 弱い点 |
|:---|:---|:---|:---|
| a（推し） | 上の 9 か所を直した木を採る。仮の 4 つの名を確定し、`themeHue` を `documentSettings` に置く | 全体を 1 度見て、仮の名と置き場を閉じる（`JDG-3617`） | 開いた問いの答えで、席が木をもう 1 度直す |
| b | 開いた問いがすべて閉じてから、木を出し直す | 1 度で最終の木を見る | 仮の名が残り続ける |
| c | 直す所を木の行に ★ で書く | 1 行ずつ直せる | 回答が長くなる |

推し: a。
1. `JDG-3617` は、仮の名の最終を全体を見て決めると言いました。この問いが、その「全体」です。
2. 9 か所はどれも裁定のとおりに直すだけで、新しい決めを足しません。`themeHue` は色の見せ方の値なので、見せ方の群 `documentSettings` に置きます（`JDG-3605`・`SoC`）。
3. 開いた問いのうち、木の形を変えるのは問 6-12-0-2 だけです。席はそれを先に問い、ほかの問いは名を 1 つずつ変えるだけにします（`JDG-3543`: 物の境目と入れ子を先に決める）。

回答:

