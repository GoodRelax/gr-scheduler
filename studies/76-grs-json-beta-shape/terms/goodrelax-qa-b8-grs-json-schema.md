BGQA8

# GRS JSON の β のスキーマ —— 持ち主の目視（JDG-3328 の 4 段目）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA8 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

作った日: 2026-11-23（GRS JSON のスキーマの席、`JDG-3757`）
残 3（❓ で検索）

- 正のスキーマ: `studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json`。キーの順・列挙の値・構成は最終レビューの木と同じです（スキーマから木を作り直して、差 0 を確かめました）。
- 英語の説明 311 個とルートの説明は、AI の 3 段の確かめを終えました（1 段目 Haiku が仕様を見ずに読む → 2 段目 Sonnet が事実と書き方の決まりに突き合わせる → 3 段目 席が直す。記録は `studies/76-grs-json-beta-shape/text-check-2026-11-23-schema/`）。この GQA が 4 段目です。

***

## 決定事項

### [schema] スキーマ

席が、今までの裁定や決まりから選んだ事です。持ち主には問いません。覆したいものがあれば「自由」の欄に書いてください。

| 事 | 決めた事 | 拠り所 |
|:---|:---|:---|
| スキーマの置き場 | 今は studies の手書きのスキーマを正にする。CR-851 の当てで `docs/spec/_source` の原稿へ移し、2 つのスキーマの差が 0 であることを道具で確かめる | BOSS の承認（案 A） |
| 木の作り方 | 最終レビューの木は、スキーマと日本語の欄の表から道具で作る（🔄 なし） | `JDG-3756` |
| uid の範囲 | 1 以上 2147483647 以下 | `JDG-3564` |
| 必須のキー | 無いと文書が読めないキーだけを必須にする（ルートは `schemaVersionUtc` と `scheduleData`、各物の識別子、判別子 `type`、タスクの日付と見た目、箱の位置） | `JDG-3634` ④ |
| 型の名 | 【名を選んだ】キーの名の頭を大文字にする。一覧と拠り所は下の表と問 4 | `JDG-3710`・`JDG-3716` P-9 |
| 遅延診断の「隠す値」 | 【名を変えた】`doubtfulOrMissing` → `suspicion`・`omission`。下の表と問 4 | `JDG-3735`・`JDG-3508` |
| 塗りも線も無いタスク | 拒まない（読めるので） | `JDG-3634` ④ |
| 例外の繰り返しの 7・8 | 英語は MSPDI の定めの語のまま（7 = by day count、8 = by weekday count） | MSPDI の XSD |
| 全体表示の範囲 | 説明に「PNG と SVG の書き出しもこの範囲を使う」と書く | `JDG-3708` |
| 表示の倍率の値 | 0.5・0.67・0.75・0.9・1・1.1・1.25・1.5・1.75・2（前の百分率の段を割合に直しただけ） | `JDG-3621`・N-16 |
| 見本の 2 つの値 | `project.uid` と `importOrigin.sourceProjectUid` を短い文字列にする（MSPDI の Project の UID は 16 字まで） | MSPDI の XSD |
| GQA | スキーマの席の問いはこの BGQA8 で出す | `JDG-3757` |
| ✅ 問 1 取り込みの記録 | 【名を足した】`scheduleData.lastMspdiImport { importedAt, fileName }` を `mspdiImportCount` のすぐ後に足した（木の R108〜R110）。GRS が取り込みのたびに上書きし、一度も取り込んでいなければ書かない | `JDG-3758` |
| ✅ 問 2 冒頭の 6 文 | 席が足した 6 文を採った | `JDG-3759` |
| ✅ 問 3 説明の見せ方 | 英語の説明は木の形で見せる。長さは問 3-2 | `JDG-3760` |
| ✅ 問 3-2 説明の長さ | どの説明も「何を持つか」の 1 文と誤読を防ぐ文 1 つまで（30 語ほどまで）に縮める。縮めた全文を木の形で 1 回見せる（次の回） | `JDG-3761` |
| ✅ 問 4-2 席の名 7 つ | 隠す値 `suspicion`・`omission`、型の名 `Uid`・`Passthrough`・`MspdiElement`・`Uuid`・`StandardUtcOffset`・`MspdiValue` を採った。順と置き場は問 4-3 | `JDG-3762` |
| ✅ 問 4-3 型の定めの順 | `$defs` を 物の型（MSPDI → GRS → 刻印と帳簿）→ 共通の型（値の群 → 見た目の群 → 表の群）の順に置いた。4 つの Style は `ShapeStyle` のすぐ後。スキーマに当てた（中身は変わらず、順だけ） | `JDG-3763` |
| 説明の木の形 | 英語だけで見せる（キー ／ 英語の説明） | `JDG-3764` |
| 兄弟の中の位置 | 【名を変えた】`tasks[].siblingOrder`・`taskGroups[].siblingOrder` → `siblingIndex`（0 から数える）。Agent API の席で持ち主が決めた。スキーマ・見本・木・説明の木に当てた（木の R205・R296） | `JDG-3776`（BGQA7 の問 2-3） |
| ✅ 問 5 改訂履歴 | スキーマのルートに変更の台帳 `x-grsChanges` を置き、CR-851 の分は 1 行（`kind` `refused`: α の文書は丸ごと断る）。β から後は変わったキーごとに 1 行。スキーマに当てた | `JDG-3765` |
| ✅ 問 5-2 台帳の名の `x-` | `x-grsChanges` のまま（`x-` は自前の拡張を示す慣わし。α の名とも同じ） | `JDG-3768` |
| ✅ 問 7 仕様が決めていない 4 つの場合 | 終わりも中断の日時も無い実績は稼働時間 0 と数える ／ 日付の無い例外は保って数えない ／ 稼働しない日の時間帯は保って数えない ／ `siblingIndex` の無い兄弟は後ろに配列の順で並べる。説明に書いた。仕様への足しは CR-851 の当てで行う | `JDG-3769` |
| ✅ 問 8 繰り返しの説明 | 席の案のとおり 15 個を削った。さらに持ち主の指示で、説明の頭の `This value is` ／ `This object holds` などを除き、キーが持つ物を名詞の句で言う（例: `The day at the left edge of the view.`）。GRS が何かをする文は主語のある文のまま | `JDG-3770` |
| ✅ 問 9 説明の最終版 | 持ち主のチャットの指示で、すべてのキーに説明を付けることをやめ、自明な説明と重複を消す（「Same as MSPDI X」、名をなぞる文、色の名や大・中・小、MSPDI の番号の一覧の写し、ほかの説明と同じ事）。消した後、外の AI に 2 回目の質問状で確かめを頼み、その直しを終えた版をあらためて見せる | `JDG-3801` |
| 🔄 *✅ 問 10 passthrough の値の形* | 🔄 *MSPDI の値は文字列だけで書く（`"Priority": "500"`、`"IsNull": "0"`）。スキーマの `MspdiValue` から数の型を外し、見本の 32 か所を直した* | 🔄 *`JDG-3802`* |
| 🔄 *✅ 問 11 `highestIssuedUid` が無いとき・上限* | 🔄 *無ければ、GRS は開くときに 4 つの一覧の uid の最大を数える。2147483647 に届いたら、新しい物を足す操作を断る。説明に書いた。仕様の `AT-20`・`TC-2` は CR-851 の当てで直す* | 🔄 *`JDG-3803`* |
| 🔄 *外の AI の 2 回目* | 🔄 *矛盾 9・誤解 10・冗長 13・消しすぎ 12 を仕分け、席が決められる物を当てた（消しすぎで抜けた事実を戻した所を含む）。仕分けは `grs-json-schema-review-findings.md` の 6 節* | 🔄 *`JDG-3801`* |
| 🔄 *✅ 問 12 説明の最終版* | 🔄 *持ち主のチャットの指示で、スキーマの説明が仕様を書きすぎている所を消す（問 13・問 14）。ピン止めを hidden より優先する仕様は `CR-862` が当てる* | 🔄 *`JDG-3804`* |
| ✅ 問 6 語「Carried」 | 冒頭の説明から「Carried」を除き、passthrough で言い直した（英語版・日本語版の木も作り直した） | `JDG-3766` |
| 外の AI のレビュー | 外の AI（AI-A）がスキーマを読み、矛盾 13・誤解 18・冗長 30 を挙げた。席の仕分けは `grs-json-schema-review-findings.md` | `JDG-3717` ③ |
| 外の AI の指摘: 席が直した 25 件 | 裁定・決まり・仕様から答えが 1 つに決まる 25 件を、説明と必須に当てた。必須の変更は 3 つ: `CommentBoxStyle.stroke` を必須から外す（無いと枠線と引出し線を描かない）、`documentStamp.lastEditedBy` を必須にする、`scheduleData.scheduleDataTimeZone` を必須にする（無いと日時を読めない）。説明の直しの例: タスクの塗りと線はマイルストーンマークにも効く、頭の値は 6 つ、`lagFormat` が無いとラグを分で見せて数えない | `JDG-3634` ④・`JDG-3740`・`JDG-3669`・仕様 |
| 編集できる組（`allowedEditorGroupName`） | 名乗りのあるタスクグループのタスクは、どの人にも AI にも読み取り専用と説明に書いた（GRS は単体では自分の組を持たない）。外の AI の「組の外の人だけ」の読みは採らない | 仕様 FR-111 の GP-1 |
| 検索ウィンドウの 2 つの表 | 構成は今のまま（フィルタの配列 1 つ、並べ替え 1 つ）。表は一度に 1 つ見せ、フィルタは列で分かれ、並べ替えは 1 つを 2 つの表で使う、と説明に書いた | 仕様 SV-3・SV-8・S-562・S-563 |
| ✅ 冒頭の進捗の文（外の AI の C9） | `GRS decides from the actual dates of a task, together with resume and resumeValid, whether …` にした | `JDG-3767` |

外に見える名で、席が変えた物・選んだ物です（持ち主が 1 つずつ確かめる決まりなので、問 4 でも問います）。「型の名」は、スキーマの `$defs` の名です。AI は Agent API の readSchema でこの名を引きます。

| 印 | 何の名 | 前 | 今 | 拠り所 |
|:---|:---|:---|:---|:---|
| 【名を変えた】 | 遅延診断レポートの列 `diagnosisStatus` の「隠す値」 | `doubtfulOrMissing` | `suspicion`（疑義）・`omission`（記載漏れ） | `JDG-3735`（状態の列は用語集の英語の名で書く）と `JDG-3508`（用語集が 2 語に分けた）。`JDG-3735` の列挙が古い語のまま残っていた |
| 【名を選んだ】 | 型: uid の整数 | （α は型なし） | `Uid` | `JDG-3716` P-9（型の名はキーの名の頭を大文字に） |
| 【名を選んだ】 | 型: `grs.passthrough` の物 | `Carry`（α） | `Passthrough` | `JDG-3716` P-9・`JDG-3748`（キー `passthrough`） |
| 【名を選んだ】 | 型: `passthrough…[].mspdiElement` の物 | `CarryElement`（α） | `MspdiElement` | `JDG-3716` P-9（キー `mspdiElement`） |
| 【名を選んだ】 | 型: id の UUID の文字列 | （α は型なし） | `Uuid` | 席の案（裁定なし。値の形の名） |
| 【名を選んだ】 | 型: 標準時の UTC との差（27 通り） | （α は型なし） | `StandardUtcOffset` | 席の案（裁定なし。夏時間の差を許さないことを名で言う） |
| 【名を選んだ】 | 型: passthrough の中の 1 つの MSPDI の値 | （α は型なし） | `MspdiValue` | 席の案（裁定なし） |
| 裁定の名 | 型: 色の明るい側・暗い側 | `ColorSide`（10-25） | `ColorSide` | `JDG-3523`。最終レビューの木には出ていない |
| 裁定の名 | 型: コメントボックスの引出し線の先 | `LeaderAnchor`（α） | `LeaderTarget` | `JDG-3556`・`JDG-3710`。最終レビューの木には出ていない |
| 裁定の名 | 型: UTC の時刻 ／ 日付 ／ 日時 ／ 時刻 | — | `UtcInstant`・`Day`・`DateTime`・`Time` | `JDG-3331`（10-25 の名） |

***

## QA

### [schema] スキーマ（❓ 2）

🔄 *席: GRS JSON のスキーマ 2（BOSS は gr-scheduler BOSS（4 代目））。持ち主の指示（`JDG-3804`）で、スキーマの説明が仕様を書きすぎている所を消しました。ピン止めを hidden より優先する仕様は、BOSS が `CR-862` に割り当てました。説明の最終版の木（前の問 12）は、問 13・問 14 の答えを当てた後に出し直します。*

#### 🔄 *❓ 問 13. 書きすぎとして消した文（49 文）*

🔄 ***場面:** スキーマの説明は、ファイルの値の読み方（意味・単位・タイムゾーン・無いときの意味・GRS が読むときの扱い）だけを書く、と決めました（`JDG-3804`）。画面の描き方、操作の振る舞い、遅延診断や書き出しの細目は、将来変わり得るので消しました。消したのは次の文です（説明 10 個が丸ごと消え、30 個が短くなりました）。木の差 0、見本の検証エラー 0 です。*

| 🔄 *#* | 🔄 *キー* | 🔄 *消した文（英語/日本語）* | 🔄 *何の約束だったか* |
|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *`(root)`* | 🔄 *When a person starts Delay Diagnostics or an AI agent asks for Delay Diagnostics, GRS calculates the results from the current Schedule Data and project.statusDate.<br>人が遅延診断を始めるとき、または AI エージェントが遅延診断を求めるとき、GRS は今のスケジュールデータと project.statusDate から結果を計算する。* | 🔄 *遅延診断の細目* |
| 🔄 *2* | 🔄 *`(root)`* | 🔄 *While GRS shows Delay Diagnostics results, GRS keeps those results and does not recalculate them.<br>GRS は遅延診断の結果を見せている間、その結果を保ち、計算し直さない。* | 🔄 *画面の振る舞い* |
| 🔄 *3* | 🔄 *`isThemeMonochrome`* | 🔄 *GRS draws every color in monochrome when this value is true: the theme colors, the palette colors and the custom colors.<br>この値が true のとき、GRS はすべての色をモノクロで描く: テーマの色、パレットの色、任意の色。* | 🔄 *画面の描き方* |
| 🔄 *4* | 🔄 *`additionalTimeZones`* | 🔄 *While GRS shows times of day, each clock adds a row under the Time Ruler.<br>GRS が時刻を見せている間、各時計はタイムルーラーの下に 1 行を足す。* | 🔄 *画面の描き方* |
| 🔄 *5* | 🔄 *`dayWidthPx`* | 🔄 *Zoom to Fit sets this value.<br>「全体を収める」がこの値を決める。* | 🔄 *操作の振る舞い* |
| 🔄 *6* | 🔄 *`type`* | 🔄 *and those two whole days touch the edges of the Task Group Lanes<br>その 2 日まるごとがタスクグループレーンズの両端に接する* | 🔄 *画面の描き方* |
| 🔄 *7* | 🔄 *`verticalZoom`* | 🔄 *The two values that one step of vertical zoom and Zoom to Fit change together.<br>縦のズームの 1 段と「全体を収める」が一緒に変える 2 つの値。* | 🔄 *操作の振る舞い* |
| 🔄 *8* | 🔄 *`ratio`* | 🔄 *2 draws Plan Bars, Actual Bars and Name Labels twice as tall<br>2 のとき、GRS は予定バー、実績バー、名称ラベルを 2 倍の高さで描く。* | 🔄 *画面の描き方* |
| 🔄 *9* | 🔄 *`automaticallyShownDepth`* | 🔄 *A zoom-in step changes ratio only after this value reaches the depth of the deepest task group in the Schedule Document; ratio never sets this value.<br>ズームインの 1 段は、この値がスケジュール文書の中のいちばん深いタスクグループの深さに届いてから初めて ratio を変える。ratio はこの値を決して変えない。* | 🔄 *操作の振る舞い* |
| 🔄 *10* | 🔄 *`isTaskGroupPanelWidthFixed`* | 🔄 *GRS always draws the Task Group Panel at taskGroupPanelWidthPx.<br>GRS はタスクグループパネルを、いつも taskGroupPanelWidthPx の幅で描く。* | 🔄 *画面の描き方（true・false の意味は残した）* |
| 🔄 *11* | 🔄 *`pinnedTaskGroupIds`* | 🔄 *which stay at the top during vertical scrolling<br>縦にスクロールしても上端に留まる* | 🔄 *画面の描き方* |
| 🔄 *12* | 🔄 *`pinnedTaskGroupIds`* | 🔄 *A pin shows the task group at any depth if showMode is "automatic", never if "hidden"; an ancestor with showMode "hidden" or "hiddenUntilZoomIn" still hides the pinned task group.<br>ピンは、showMode が "automatic" ならタスクグループをどの深さでも見せ、"hidden" なら決して見せない。showMode が "hidden" か "hiddenUntilZoomIn" の祖先があると、ピン止めしたタスクグループも隠れる。* | 🔄 *表示の細目* |
| 🔄 *13* | 🔄 *`taskPlacementDirection`* | 🔄 *earliest task first<br>早いタスクから* | 🔄 *画面の描き方* |
| 🔄 *14* | 🔄 *`isProgressStatusMarkVisible`* | 🔄 *which show progress status by shape past the Actual Bar end, not on the Progress Line<br>イナズマ線の上ではなく実績バーの終わりの先で、形によって進捗ステータスを示す* | 🔄 *画面の描き方* |
| 🔄 *15* | 🔄 *`isPlanDatesVisible`* | 🔄 *GRS draws the planned start and finish dates to the right of each Name Label when this value is true.<br>この値が true のとき、GRS は各名称ラベルの右に、予定の開始日と終了日を描く。* | 🔄 *画面の描き方* |
| 🔄 *16* | 🔄 *`isProgressLineVisible`* | 🔄 *one zigzag line from the status date through the task progress point of each task<br>基準日から各タスクのタスク進捗点を通る 1 本のジグザグの線* | 🔄 *画面の描き方* |
| 🔄 *17* | 🔄 *`parentTaskProgressToleranceWorkingDays`* | 🔄 *This value excuses no late finish.<br>この値は、どの終了の遅れも許さない。* | 🔄 *遅延診断の細目* |
| 🔄 *18* | 🔄 *`searchWindow`* | 🔄 *and the other table then shows the default order<br>そのとき他方の表は既定の並びで見せる* | 🔄 *画面の振る舞い* |
| 🔄 *19* | 🔄 *`scheduleDataTimeZone`* | 🔄 *GRS does not write this zone to MSPDI.<br>GRS はこのゾーンを MSPDI へ書かない。* | 🔄 *書き出しの細目* |
| 🔄 *20* | 🔄 *`highestIssuedUid`* | 🔄 *GRS gives a new entity this value plus 1.<br>GRS は新しい実体に、この値に 1 を足した値を付ける。* | 🔄 *編集操作の振る舞い* |
| 🔄 *21* | 🔄 *`highestIssuedUid`* | 🔄 *at 2147483647, GRS refuses to add a new entity.<br>この値が 2147483647 に届いたら、GRS は新しい実体を足す操作を断る。* | 🔄 *追加を断る操作* |
| 🔄 *22* | 🔄 *`tasks`* | 🔄 *GRS writes MSPDI tasks depth first along that tree and rebuilds ID, OutlineLevel, OutlineNumber and Summary.<br>GRS は MSPDI のタスクをその木に沿って深さ優先で書き、ID、OutlineLevel、OutlineNumber、Summary を作り直す。* | 🔄 *書き出しの細目* |
| 🔄 *23* | 🔄 *`passthroughTasks`* | 🔄 *which GRS writes first<br>GRS はこれを最初に書く* | 🔄 *書き出しの細目* |
| 🔄 *24* | 🔄 *`resources`* | 🔄 *GRS lists the resources in the Resource List Window and shows the resources of each task in the Assignee Label.<br>GRS は担当を担当リストウィンドウに並べ、各タスクの担当を担当ラベルに見せる。* | 🔄 *画面の描き方* |
| 🔄 *25* | 🔄 *`taskGroups`* | 🔄 *GRS builds this list from the WBS when reading MSPDI<br>GRS は MSPDI を読むとき、WBS からこのリストを作る* | 🔄 *取り込みの細目* |
| 🔄 *26* | 🔄 *`changeLogEntries`* | 🔄 *GRS adds a new entry at the end.<br>GRS は新しい項目を末尾に足す。* | 🔄 *編集操作の振る舞い* |
| 🔄 *27* | 🔄 *`uid`* | 🔄 *Before writing over another file, GRS treats that file as the same Schedule Document only when project.uid, project.name and the file name all match; an absent value never matches.<br>GRS は別のファイルに上書きする前に、project.uid、project.name、ファイル名がすべて一致するときだけ、そのファイルを同じスケジュール文書とみなす。無い値は決して一致しない。* | 🔄 *保存操作の振る舞い* |
| 🔄 *28* | 🔄 *`title`* | 🔄 *GRS shows the value as the Project Title in the App Header and builds the default file name in the Save As Dialog from the value.<br>GRS はこの値を、アプリヘッダーのプロジェクトタイトルとして見せる。GRS は、別名保存ダイアログの既定のファイル名をこの値から作る。* | 🔄 *画面と保存ダイアログの振る舞い* |
| 🔄 *29* | 🔄 *`weekStartDay`* | 🔄 *GRS starts each week of the Time Ruler on this day.<br>GRS はタイムルーラーの各週を、この曜日から始める。* | 🔄 *画面の描き方* |
| 🔄 *30* | 🔄 *`statusDate`* | 🔄 *GRS draws the Status Line at this date-time and runs Delay Diagnostics for this date.<br>GRS はこの日時に基準日線を描き、この日について遅延診断を行う。* | 🔄 *画面の描き方と遅延診断の細目* |
| 🔄 *31* | 🔄 *`statusDate`* | 🔄 *Without statusDate, GRS draws no Status Line and Delay Diagnostics does not run.<br>statusDate が無いとき、GRS は基準日線を描かず、遅延診断は動かない。* | 🔄 *画面の描き方と遅延診断の細目* |
| 🔄 *32* | 🔄 *`type`* | 🔄 *a new exception takes 1<br>新しい例外は 1 を取る* | 🔄 *編集操作の振る舞い* |
| 🔄 *33* | 🔄 *`stop`* | 🔄 *GRS removes stop when GRS finishes the task; actualFinish then holds the end.<br>GRS はタスクを完了にするとき、stop を消す。そのあとは、actualFinish が終わりを持つ。* | 🔄 *状態遷移の操作* |
| 🔄 *34* | 🔄 *`passthrough`* | 🔄 *Only for a task that GRS made or whose dates a person changed, GRS rebuilds Duration and ManualStart, ManualFinish and ManualDuration, writes ConstraintType and ConstraintDate, and leaves out FreeSlack, TotalSlack, StartSlack and FinishSlack; GRS rebuilds ActualDuration after a person changes the actual dates.<br>GRS が作ったタスクと、人が日付を変えたタスクに限り、GRS は Duration と ManualStart・ManualFinish・ManualDuration を作り直し、ConstraintType と ConstraintDate を書き、FreeSlack・TotalSlack・StartSlack・FinishSlack を書かない。人が実績の日付を変えた後は、GRS は ActualDuration を作り直す。* | 🔄 *書き出しの細目* |
| 🔄 *35* | 🔄 *`lagFormat`* | 🔄 *and for other codes only shows the lag<br>ほかの番号ではラグを見せるだけである* | 🔄 *画面の見せ方* |
| 🔄 *36* | 🔄 *`lagFormat`* | 🔄 *shows the lag in minutes, such as 2880m, and<br>ラグを 2880m のように分で見せ、* | 🔄 *画面の見せ方* |
| 🔄 *37* | 🔄 *`ImportOrigin`* | 🔄 *so that a later import of that file updates the task rather than adding a copy<br>これにより、後でそのファイルを取り込むと、GRS は写しを足さずにそのタスクを更新する* | 🔄 *取り込みの細目* |
| 🔄 *38* | 🔄 *`representativeTaskUid`* | 🔄 *When a person nests this task group under another, GRS moves that task in the WBS to match.<br>人がこのタスクグループを別のタスクグループの下に入れると、GRS はそれに合わせて、そのタスクを WBS の中で動かす。* | 🔄 *操作の振る舞い* |
| 🔄 *39* | 🔄 *`showMode`* | 🔄 *even on zoom or Zoom to Fit<br>ズームでも「全体を収める」でも* | 🔄 *操作の振る舞い* |
| 🔄 *40* | 🔄 *`showMode`* | 🔄 *until a person shows the task group again<br>人が再び見せるまで* | 🔄 *操作の振る舞い* |
| 🔄 *41* | 🔄 *`showMode`* | 🔄 *and then changes the value to "automatic"<br>そのあと値を "automatic" に変える* | 🔄 *状態遷移の操作* |
| 🔄 *42* | 🔄 *`allowedEditorGroupName`* | 🔄 *and refuses moves into a task group with another value<br>GRS は、値の違うタスクグループへの移動も断る* | 🔄 *移動を断る操作* |
| 🔄 *43* | 🔄 *`leaderTarget`* | 🔄 *When the target is deleted in GRS, GRS turns this object into a free point<br>GRS の中で先を消すと、GRS はこのオブジェクトを何にも付かない点に変える。* | 🔄 *削除操作の振る舞い* |
| 🔄 *44* | 🔄 *`snapPart`* | 🔄 *GRS hides the Comment Box while the named part is not drawn.<br>名指した部分が描かれていない間、GRS はコメントボックスを隠す。* | 🔄 *画面の描き方* |
| 🔄 *45* | 🔄 *`DocumentStamp`* | 🔄 *The Agent API uses this stamp to refuse writes based on an old read.<br>Agent API はこの刻印を使って、古い読み取りに基づく書き込みを断る。* | 🔄 *Agent API の振る舞い* |
| 🔄 *46* | 🔄 *`fill`* | 🔄 *GRS fills the Actual Bar from the same color<br>GRS は実績バーも同じ色から塗る* | 🔄 *画面の描き方* |
| 🔄 *47* | 🔄 *`isScheduleFilteredByChecks`* | 🔄 *The table itself keeps every row.<br>表そのものはすべての行を残す。* | 🔄 *画面の振る舞い* |
| 🔄 *48* | 🔄 *`（冒頭の説明）passthrough`* | 🔄 *unchanged（GRS writes both back to MSPDI unchanged）<br>そのまま（GRS は両方を MSPDI へそのまま書き戻す）* | 🔄 *書き出しの細目（作り直す値があるので「そのまま」を約束しない）* |
| 🔄 *49* | 🔄 *`Passthrough（型）`* | 🔄 *unchanged in MSPDI schema order, repeats in array order<br>MSPDI のスキーマの順でそのまま、繰り返しは配列の順で* | 🔄 *書き出しの細目* |

| 案 | 中身 | 変わること |
|:---|:---|:---|
| **a（推奨）** | 🔄 *消したままでよい* | 🔄 *このまま* |
| b | 🔄 *戻す文がある（番号を回答に書く）* | 🔄 *席が戻す* |

回答:

#### 🔄 *❓ 問 14. 迷って残した文（15 か所）*

🔄 ***場面:** 次の所は、値の読み方と振る舞いの両方にまたがるので、残しました。消したい物があれば番号で教えてください。*

| 🔄 *#* | 🔄 *キー* | 🔄 *残した文（要旨）* | 🔄 *迷った点* |
|:---|:---|:---|:---|
| 🔄 *1* | 🔄 *`documentSettings・scheduleCanvasElements・project`* | 🔄 *キーを書く順（効く範囲の広い順、バー・ラベル・線の順、MSPDI のスキーマの順）* | 🔄 *ファイルの書き方だが、約束しすぎかもしれない* |
| 🔄 *2* | 🔄 *`viewTimeZone`* | 🔄 *「スケジュールキャンバスとタイムルーラーで」日時を見せるタイムゾーン* | 🔄 *語の定めの中に画面の場所がある* |
| 🔄 *3* | 🔄 *`searchWindow`* | 🔄 *2 つの表を「一度に 1 つ」見せる* | 🔄 *画面の細目だが、2 つの表の定めの中にある* |
| 🔄 *4* | 🔄 *`importedTopTaskOutlineLevel`* | 🔄 *MSPDI を書き出すとき、上のタスクにこの OutlineLevel を付ける* | 🔄 *書き出しの細目だが、値の目的そのもの* |
| 🔄 *5* | 🔄 *`baselineTasks`* | 🔄 *前回予定の枠は、同じ uid の今のタスクの形を取る* | 🔄 *描き方だが、uid のつながりを言う* |
| 🔄 *6* | 🔄 *`minutesPerDay`* | 🔄 *1 日の稼働時間の合計が違うと、開くときに知らせる* | 🔄 *画面の知らせだが、書く人への決まりでもある* |
| 🔄 *7* | 🔄 *`creationDate`* | 🔄 *新しい文書を作るとき、GRS が作った時刻を書く* | 🔄 *値の意味と操作の両方* |
| 🔄 *8* | 🔄 *`startSlopeCalendarDays・finishSlopeCalendarDays`* | 🔄 *予定バーの端を斜めにして、確かでない開始・終了を示す* | 🔄 *描き方と意味が 1 つの文にある* |
| 🔄 *9* | 🔄 *`minHeightPx・bodyOffsetPx・widthPx・sizePx`* | 🔄 *横と縦のズームはこの値を変えない* | 🔄 *単位の意味（ズームで変わらないピクセル）だが、ズームの話でもある* |
| 🔄 *10* | 🔄 *`showMode`* | 🔄 *"automatic": 深さ・ピン・出ている配下への道から GRS が決める* | 🔄 *ピンの扱いの約束に近い（CR-862 で変わる所）* |
| 🔄 *11* | 🔄 *`allowedEditorGroupName`* | 🔄 *それらのタスクを、どの人にも AI にも読み取り専用として扱う* | 🔄 *値の効き目か、操作の振る舞いか* |
| 🔄 *12* | 🔄 *`leaderTarget`* | 🔄 *スケジュールデータに無い先をファイルが指すとき、引出し線を描かない* | 🔄 *読み方（ファイルを断らない）だが、描き方の言葉* |
| 🔄 *13* | 🔄 *`changedAt・editorType`* | 🔄 *GRS が時刻・種類を入れる。人は後で時刻を変えてよい* | 🔄 *操作だが、値の出どころを言う* |
| 🔄 *14* | 🔄 *`Color.name`* | 🔄 *暗いテーマでは、GRS は色相を保ち明るさを反転する* | 🔄 *色の導き方の決まり* |
| 🔄 *15* | 🔄 *`ColumnFilter.hiddenValues`* | 🔄 *「GRS が遅延診断の結果を見せている間」の診断の印* | 🔄 *画面の状態が値の一覧の中にある* |

| 案 | 中身 | 変わること |
|:---|:---|:---|
| **a（推奨）** | 🔄 *残したままでよい* | 🔄 *このまま* |
| b | 🔄 *消す文がある（番号を回答に書く）* | 🔄 *席が消す* |

回答:

***

## ❓ 自由

回答:
