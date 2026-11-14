BGQA3

# GRS JSON の名（名の辞書 3）

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA3 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

2026-11-15 に作った。BGQA2（名の辞書）が大きくなりすぎたので、あなたの指示で約束の面ごとに分けた（`JDG-3568`）。この紙は GRS JSON の名を受け持つ。文書の命令は BGQA4、Agent API は BGQA5 が受け持ち、GRS JSON の名が決まった後に出す。決まりと、これまでの決定事項は BGQA2（`goodrelax-qa-b2-glossary.md`）にある。

残 11（❓ で検索）

1 回目は、ほかの名に効く 10 問です: キーの付け方の決まり、根の並びと呼び名、順番の数、色の形、MSPDI と違う名を保つかの 2 問。残りの GRS JSON の問い（21）は、答えの後で 10 問前後ずつ出します。

***

## 決定事項

### [proj] プロジェクト

この分野で決まった語は、答えの後でここに書きます。

### [root] スケジュールデータと文書の根

この分野で決まった語は、答えの後でここに書きます。

### [key] 共通のキー

この分野で決まった語は、答えの後でここに書きます。

### [color] 色

この分野で決まった語は、答えの後でここに書きます。

### [task] タスクと依存

この分野で決まった語は、答えの後でここに書きます。

### [tg] タスクグループ

この分野で決まった語は、答えの後でここに書きます。

***

## QA

表の読み方:

- 青い字は、前に裁定した名です。キーの欄が青ければキーの名を、日本語の名の欄が青ければ日本語の名を、裁定が決めました。裁定の番号は意味の欄の最後にあります。
- 表の # は「パート - パートの中の番号」です。番号が飛んでいる所の語は、ほかの問いで聞くか、もう決まっています。
- MSPDI の名の欄の「無し」は、GRS が自分で付けた名です（MSPDI に同じ要素が無い）。
- 表を見る問いでは、直す所が無ければ ok と書き、直す所は表のセルに ★ で書いてください。

### [proj] プロジェクト（❓ 1）

#### ❓ 問 6-8-5. プロジェクトの 24 語 —— 推奨の表のとおりでよいか

前回、あなたは「上記コメント参照」と答え、表に ★ を 2 つ書きました。2 つに答えます。

- 8-6 の ★「MSPDIと同じくuidにしないのか？」: `uid` に改めました（`JDG-3557`）。MSPDI から来た実体は `uid`、GRS 固有の実体は `id` です。
- 8-9 の ★「Project.titleって形になるのか？ 他も同様。projectTitleにする必要はないよね？」: はい、`project.title` の形です。キーは持ち主の名を繰り返しません（`Project.title`・`Task.name`）。持ち主の外の実体を指す参照のキーだけが、相手の名を持ちます（`taskUid`・`resourceUid`）。MSPDI も `Project/Title` で、同じ形です。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 表の 24 語を、このとおり確定する。キーに持ち主の名を繰り返さない決まりを、すべての物に当てる |
| b | 直す行に ★ を書き、その行だけを改める |

直す所が無ければ a、直す所は表のセルに ★ で書いてください。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
| :-------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| 8-6 | <span style="color: #0550AE">`uid`</span>（持ち主 `Project`） |  | MSPDI の Project/UID と同じ（`JDG-3557`）。スケジュール文書を開いた元とは別の既存のファイルへ上書きする前に、GRS はこの値と project.name とファイル名がすべて一致するときだけ、そのファイルを同じスケジュール文書と見なす。値を省くと不一致になる。不一致なら、GRS は上書きの前に人へ確かめる。 | UID |
| 8-8 | `name`（持ち主 `Project`） | <span style="color: #0550AE">プロジェクト名</span> | MSPDI の Project/Name と同じ。GRS はこの値をプロジェクト名として表示し編集する。アプリヘッダーは title をプロジェクトタイトルとして出す。上書きしようとしている既存のファイルが同じスケジュール文書かを見分けるときにも、GRS は uid とファイル名に合わせてこの値を使う。（`JDG-3355`） | Name |
| 8-9 | `title` | <span style="color: #0550AE">プロジェクトタイトル</span> | MSPDI の Project/Title と同じ。GRS はこの値をプロジェクトタイトルとしてアプリヘッダーに出し、別名保存ダイアログの既定のファイル名もこの値から作る。この値を省くと、GRS はブラウザーのタブに Untitled と出す。（`JDG-3355`・`JDG-3365`） | Title |
| 8-10 | `subject` |  | MSPDI の Project/Subject と同じ。 | Subject |
| 8-11 | `category` |  | MSPDI の Project/Category と同じ。 | Category |
| 8-12 | `company` |  | MSPDI の Project/Company と同じ。 | Company |
| 8-13 | `manager` |  | MSPDI の Project/Manager と同じ。 | Manager |
| 8-14 | `author` |  | MSPDI の Project/Author と同じ。作成者を指し、スケジュール文書を最後に書いた者（documentStamp.lastEditedBy）とは役目が違う。 | Author |
| 8-15 | `revision` |  | MSPDI の Project/Revision と同じ。MSPDI のファイルを作った道具がプロジェクトを保存した回数。documentStamp のどの時刻とも別の値である。 | Revision |
| 8-16 | `creationDate` |  | MSPDI の Project/CreationDate と同じ。GRS は新しいスケジュール文書を作るときにこの値を書く。 | CreationDate |
| 8-17 | `startDate` |  | MSPDI の Project/StartDate と同じ。 | StartDate |
| 8-18 | `statusDate` |  | MSPDI の Project/StatusDate と同じ。GRS はこの日に基準日線を引く。この値を省くと、GRS は基準日線の描画と遅延診断の実行を省く。 | StatusDate |
| 8-19 | `scheduleDataTimeZone` |  | スケジュールデータの日時の時計の、固定の UTC オフセット。例えば UTC+09:00。標準時であり、GRS は 1 年中このオフセットをそのまま使う。GRS は MSPDI の書き出しからこのオフセットを除く。 | 無し |
| 8-20 | `minutesPerDay` |  | MSPDI の Project/MinutesPerDay と同じ。稼働日 1 日（1d）の長さを分で表し、この値を省くと 480（8 時間）。どれかの稼働日の時間帯の合計がこの値と違えば、スケジュール文書を開くときに GRS は注意を出す。 | MinutesPerDay |
| 8-21 | `minutesPerWeek` |  | MSPDI の Project/MinutesPerWeek と同じ。 | MinutesPerWeek |
| 8-22 | `daysPerMonth` |  | MSPDI の Project/DaysPerMonth と同じ。 | DaysPerMonth |
| 8-23 | `weekStartDay` |  | MSPDI の Project/WeekStartDay と同じで、0 が日曜日。WeekDay.dayType は曜日を 1 から数える点が違う。この値を省くと月曜日（1）。 | WeekStartDay |
| 8-24 | `defaultStartTime` |  | MSPDI の Project/DefaultStartTime と同じ。日付だけで時刻を省いた開始（Task や BaselineTask の start、actualStart、resume、project.startDate）に GRS が与える時刻で、この値を省くと 08:00:00。マイルストーンの開始には defaultFinishTime を与える。 | DefaultStartTime |
| 8-25 | `defaultFinishTime` |  | MSPDI の Project/DefaultFinishTime と同じ。日付だけで時刻を省いた終了（Task や BaselineTask の finish、actualFinish、stop、deadline、project.statusDate）に GRS が与える時刻で、この値を省くと 17:00:00。マイルストーンの開始にもこの時刻を与える。 | DefaultFinishTime |
| 8-31 | `sourceFormat` |  | スケジュール文書の元の形式。GRS で作った文書は grs、MSPDI のファイルから読んだ文書は pj12 か pj15（pj15 だけの要素を 1 つでも持てば pj15）。GRS は MSPDI の書き出しからこの値を除く。 | 無し |
| 8-32 | &emsp;+- `grs`（持ち主 `sourceFormat`） |  | GRS で作ったスケジュール文書。 | 無し |
| 8-33 | &emsp;+- `pj12`（持ち主 `sourceFormat`） |  | 2012 年版のスキーマの MSPDI のファイルから読んだスケジュール文書。 | 無し |
| 8-34 | &emsp;+- `pj15`（持ち主 `sourceFormat`） |  | 2015 年版のスキーマだけが持つ要素を含む MSPDI のファイルから読んだスケジュール文書。 | 無し |
| 8-35 | `Project` |  | MSPDI の Project と同じ。文書が表す 1 件のプロジェクト。 | Project |

回答:

### [root] スケジュールデータと文書の根（❓ 2）

#### ❓ 問 6-13-1. 似た字の 2 組と根の並び —— 名を分けるか、並びを確かめるか

場面: 2 組の語が、ほかの所の語と似た字を使います。あわせて、根の並びを確かめます。

- 組 1: `note`（変更ログの 1 件の備考）と、タスクの `notes`（MSPDI の Notes。確定済み）は 1 字違いです。
- 組 2: タスクグループの階層を、`levelZeroTreeState` は「段 0」、`taskGroupAutoExpandDepth` は「深さ 1」と、2 つの語で数えます。「段」は積み段・1 段分・文字の大きさの段にも出ます。
- 根の並び: `JDG-3556` の B は、`documentSettings` を `scheduleData` の前に置くと決めました。私は根を `$schema`・`schemaVersion`・`buildVersion`・`documentSettings`・`scheduleData`・`documentStamp`・`changeLogEntries` の順と読みました。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 11-36 | <span style="color: #0550AE">`note`</span> |  | 変更についてのそのほかのこと。（`JDG-3332`） | 無し |
| 13-7 | <span style="color: #0550AE">`levelZeroTreeState`</span> | 段 0 の木の状態 | タスクグループパネルの頭（段 0）、つまり最上位のすべてのタスクグループの上の状態。collapsed はタスクグループを 1 つも描かない。新しいスケジュール文書は auto で始まる。（`JDG-600`・`JDG-2691`） | 無し |
| 12-7 | <span style="color: #0550AE">`taskGroupAutoExpandDepth`</span> |  | treeState が auto のタスクグループを、どの深さまで開くか。最上位のタスクグループが深さ 1。値が N なら深さ N までのタスクグループが開き、GRS は深さ N + 1 までの行を出す。0 は最上位のタスクグループだけを閉じて出す。（`JDG-3296`） | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 組 1: `note` を `remarks`（変更の 1 件に添える備考）にする。組 2: 階層を「深さ」で数え、`levelZeroTreeState` を `rootTreeState`（木の根、つまり最上位のタスクグループの上の開閉の状態）にする。根の並びは読んだ順のまま |
| b | 2 組とも今のまま。意味の文と持ち主が区別を言う。根の並びは読んだ順のまま |
| c | 組 1 だけ a のとおり直し、組 2 は今のまま |

回答:

#### ❓ 問 6-11-1. 根の 3 つの部分の呼び名 —— 「刻印」「設定」「変更ログ」の字をどうそろえるか

場面: スケジュール文書の根は、文書の刻印・文書の設定・変更ログの 3 つの部分を持ちます（前の問 6-11-2 もここにまとめました）。3 つのキーは日本語の名を持ちません（`JDG-3518`）。けれども、意味の文と見出しは呼び名を使います。呼び名は 4 つの裁定と食い違います。

- Part 2 の確定語 `stamp` の日本語は「刻印」です（`JDG-3513`）。
- `JDG-3365` は、用語集の名に「の」を挟まず、「文書スタンプ」「文書設定」「変更記録」と書くと決めました。
- `JDG-3332` は、変更ログの画面の入口を「変更履歴」のボタンと「変更履歴ウインドウ」と呼びます。

| # | キー | 今の意味の頭 | MSPDI の名 |
|:---|:---|:---|:---|
| 13-37 | <span style="color: #0550AE">`documentStamp`</span> | 文書の刻印。最後に変わった時刻と最後に保存した時刻、スケジュール文書を最後に書いた者。（`JDG-3333`） | 無し |
| 13-21 | `documentSettings` | スケジュール文書を開いたとき、GRS がそれをどう描くか。GRS は値を持つキーを、既定の値であってもすべて書く。 | 無し |
| 13-38 | <span style="color: #0550AE">`changeLogEntries`</span> | 変更ログ。人や AI がスケジュール文書への変更について書いた記録で、古いものが先。新しい記録は末尾に足す。（`JDG-3332`・`JDG-3333`） | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 「文書刻印」「文書設定」「変更履歴」にそろえる。刻印は Part 2 の `stamp` と同じ物なので同じ字を使い、`JDG-3365` の決まりで「の」を挟まない。変更履歴は画面の入口の名（`JDG-3332`）と同じ字になる。`JDG-3365` の「文書スタンプ」「変更記録」を改め、見出し・`ScheduleDocument` の意味・問 6-11-4 の表の字も直す |
| b | 「文書スタンプ」「文書設定」「変更記録」（`JDG-3365` のまま）にする。Part 2 の `stamp` の日本語も「スタンプ」に改め、仕様書の「刻印」も `CR-857` でそろえる |
| c | 「文書の刻印」「文書の設定」「変更ログ」（今のまま） |

回答:

### [key] 共通のキー（❓ 1）

#### ❓ 問 6-7-6. `ordinal` —— 配列の順と別に、順番の数を持つか

場面: `ordinal` は、MSPDI のファイルでの順を数で持ちます。Calendar・WeekDay・Exception・WorkingTime・PassthroughElement の 5 つが持ちます。配列も順を持つので、今の形は 1 つの順を 2 か所に書きます。変更ログは `JDG-3332` で `ordinal` を外し、配列の順だけで順を言います。PassthroughElement の `ordinal` だけは、持ち主の中で、ほかの要素とのあいだのどこに書き戻すかを言います。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 7-6 | `ordinal` |  | MSPDI のファイルでの、持ち主の中でのこの実体の順番。GRS はその順に書き戻す。 | 無し |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | Calendar・WeekDay・Exception・WorkingTime の `ordinal` を外し、配列の順で MSPDI のファイルでの順を言う。PassthroughElement だけが `ordinal` を持ち、意味は「持ち主の子の中で、この要素を書き戻す位置」にする。順を 1 か所に書く（`SSOT`）。`changeLogEntries` と同じ決まりになる |
| b | 5 つとも `ordinal` を持つ（今のまま）。配列の並びと別に、ファイルでの順を数で残す |
| c | 5 つとも持ち、名を `mspdiOrder` に改める。`siblingOrder`（木の中の順。`JDG-3552`）と並べて、名が「MSPDI のファイルでの順」を言う（`NEIM`） |

回答:

### [color] 色（❓ 4）

#### ❓ 問 6-6-4-7. 色の要素の一覧 —— 抜けと誤りは無いか

`JDG-3563` で、判別子のキーは `kind` から `type` に変わりました。下の形と例も `type` で書きます。`JDG-3556` の A で、塗りと線は各物の入れ子の `style` の中に入ります。

場面: あなたは「ここ、大事なところだから、丁寧に考えよう。 そもそも色について必要な要素を網羅的に列挙しろ。テーマとかあるやろ？ ダーク・ライトも.... ちなみにCopilotに聞いたらこっちも中途半端な回答が来た。 まぁ、参考にしろ。」と書きました。

GRS の色の要素を、仕様書と β の形から 12 に数えました（数え方: `doc-shape-map.tsv` で `Color`・`LaneColor` を取るプロパティと、テーマ・色相・モノクロのプロパティ。仕様書の表 T-017b の `CV-1`〜`CV-10`、表 T-294、`FR-039`、`FR-007`。文書の外の色は `_assets/tbl-settings.md` の `S-` の行のうち、`#rrggbb` か `rgba(` の値を持つ行）。

| # | 要素 | 中身 | 文書に保存するか | 決めた所 |
|:---|:---|:---|:---|:---|
| 1 | 明暗（表示のテーマ） | light と dark。GRS は、起動したときにブラウザーが伝える明暗で描き、読めないときは light で描く。画面の切り替えは、そのページを閉じるまで効く | しない（読む人ごとに違う） | `FR-039` |
| 2 | モノクロ | 決まった色を無彩色にして描く | する（`documentSettings.isThemeMonochrome`） | `CV-7` |
| 3 | テーマの色相 | テーマの色を、この色相で描く。新しい文書は 214 | する（`project.themeHueDegrees`） | `doc-shape-map.tsv`（問 6-8-1 で名を問う） |
| 4 | 色の 3 つの源 | theme（テーマが、その置き場に決める色）・palette（名の付いた 10 色）・custom（人が決めた色） | する（`Color.type`） | `JDG-3260`・`JDG-3310` |
| 5 | パレットの 10 色 | paper・ink・dimGray・lightGray・red・blue・yellow・green・orange・purple。1 つの名が、明暗ごとに 4 つの値を持つ: 塗り・縁・実績の塗り・タスクグループの帯（10 × 4 × 2 = 80 の値） | 名だけ保存する。値はアプリが持つ（表 T-294） | `CV-1`・`CV-6` |
| 6 | カスタムの色 | 明るい側と暗い側。各側は `hexColor` と `source`（chosen・derived）を持つ。片側を省くと、GRS は文書を開くときに、もう一方の側から作る（色相を保って明度を反転する） | する | `CV-2`〜`CV-4`・`JDG-3523` |
| 7 | 置き場ごとに導く値 | 1 つの色から、置き場に応じて描く値を導く。予定バーの塗りは塗りの値、実績バーの塗りは実績の塗りの値（カスタムの色は、選んだ値から HSL で導く）、縁は縁の値 | しない（描くときに導く） | `CV-6`・`CV-10` |
| 8 | 色を塗る 8 つの置き場 | タスクグループの帯（`LaneColor`。ink を取らない）・タスクの塗りと縁・コメントボックスの塗りと枠（引出し線を含む）と文字・ハイライトボックスの塗りと枠 | する | `doc-shape-map.tsv` |
| 9 | 透明 | 塗りと線の不透明度（`opacityPercent`。100 が透けない）と、色を省く道（タスクの塗りと縁、ハイライトボックスの枠） | する | `JDG-3310`・`JDG-3526` |
| 10 | 透明の制約 | 塗りと線の両方を透明にはできない（画面の通知「塗りと線の両方を透明にはできません」） | しない（GRS が入力を断る） | `FR-007` |
| 11 | コントラストの条件 | パレットの値は、白を除き、地に対して決まったコントラスト比を満たす | しない（アプリの値の条件） | `CV-8` |
| 12 | 文書の外の色 | 非稼働日の塗り・基準日線・マーカーなど、アプリが決める描画と画面の色。色の値を持つ設定の行が 42 行 | しない | `_assets/tbl-settings.md` |

Copilot の案と、上の一覧を比べました。

| Copilot の案 | GRS の今の形と決まり | 07 の観点 |
|:---|:---|:---|
| テーマの色の役割（task・milestone・criticalTask・summaryTask・comment・highlight）を、値に書く | 置き場が役割を決める。値には `{"type": "theme"}` だけを書く | `OMPV`: 値に書いた役割と置き場が食い違える（タスクの塗りに highlight）。criticalTask は GRS の範囲の外（`JDG-3510`）→ 問 6-6-4-8 |
| カスタムの色は、1 つの #hex | 明るい側と暗い側の 2 つ（要素 6） | 暗いテーマでも同じ値で描き、コントラストの条件（要素 11）を割りうる |
| パレットが無い | 名の付いた 10 色（要素 5） | 名でテーマに追う道が無くなる |
| `opacityPercent`（100 が不透明。既定 100） | 前は `fillTransparencyPercent`（0 が不透明） | `JDG-3526` で `opacityPercent` に決まった（W3C と同じ向き） |
| `Stroke { paint, widthPx }` | `strokeColor` と `strokeWidthPx` を平らに持つ | → 問 6-6-4-10 |
| `ShapeStyle` を 3 つの型で共にする | 型ごとに、必ず持つ欄が違う（コメントボックスは塗り・枠・文字を必ず持つ。タスクは塗りも縁も省ける） | → 問 6-6-4-11 |
| テーマの色の値（#3B82F6 など）を文書に書く | テーマとパレットの値は、アプリの設定だけが持つ。文書は名だけを持つ | `SSOT`: 文書がアプリの値を写すと、2 か所が食い違う |
| 書いていない要素 | モノクロ・色相・タスクグループの帯・文字の色・実績の塗りの導き方・明暗の片側の導き方・透明の制約（要素 2・3・6〜8・10） | 網羅の抜け |

問 6-6-4-8・6-6-4-10・6-6-4-11 の推奨と `JDG-3526` をすべて採ると、色の形は次のとおりです（β の案）。

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
      "required": ["hexColor", "source"],
      "properties": {
        "hexColor": { "type": "string", "pattern": "^#[0-9a-f]{6}$" },
        "source":   { "enum": ["chosen", "derived"] }
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
    "TaskGraphicStyle": { "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } } },
    "CommentBox": {
      "required": ["fill", "stroke", "textColor"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" }, "textColor": { "$ref": "#/$defs/Color" } }
    },
    "HighlightBox": {
      "required": ["fill"],
      "properties": { "fill": { "$ref": "#/$defs/Paint" }, "stroke": { "$ref": "#/$defs/Stroke" } }
    },
    "TaskGroup": { "properties": { "color": { "$ref": "#/$defs/LaneColor" } } }
  }
}
```

実例（同じ形で書いた 3 つ）:

```json
"fill": { "color": { "type": "palette", "name": "red" } }

"fill":   { "color": { "type": "theme" }, "opacityPercent": 0 },
"stroke": { "color": { "type": "theme" }, "widthPx": 1 },
"textColor": { "type": "palette", "name": "ink" }

"fill":   { "color": { "type": "custom", "light": { "hexColor": "#c0504d", "source": "chosen" } }, "opacityPercent": 50 },
"stroke": { "color": { "type": "palette", "name": "purple" }, "opacityPercent": 70, "widthPx": 2 }
```

- 上から、タスクのバー（赤で塗り、縁を描かない）・コメントボックス（塗りを見せず、テーマの色の枠と、ink の文字）・タスクのバー（自前の赤を不透明度 50% で塗り、紫の縁を不透明度 70% で描く）です。
- 文書の外のもの（要素 1・7・11・12）と、透明の制約（要素 10）は、スキーマに書きません。GRS が描くときと入力を受けるときに守ります。

直す所が無ければ ok、直す所は表のセルに ★ で書いてください。

前回の答え「一旦保留。 GRWBで決めたい。」は、`JDG-3567` で、この紙で決める形に変わりました。

回答:

#### ❓ 問 6-6-4-8. テーマの色の役割 —— 置き場で決めるか、値に書くか

場面: `{"type": "theme"}` の色は、テーマがその置き場に決める色です（要素 4）。Copilot の案は、役割（task・milestone など）を値に書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 置き場が役割を決める（今の形）。値には `{"type": "theme"}` だけを書く。1 つの値が 1 つの意味を持つ（`OMPV`）。置き場と役割が食い違う文書を書けない |
| b | 値に役割を書く（`{"type": "theme", "role": "milestone"}`）。どの置き場でも、ほかの役割のテーマの色を使える。役割の名の一覧を、外との約束として持つ |

前回の答え「一旦保留。 GRWBで決めたい。」は、`JDG-3567` で、この紙で決める形に変わりました。

回答:

#### ❓ 問 6-6-4-10. 線の形 —— 線の太さを線の中に入れるか

場面: 今の形は、線の色 `strokeColor` と太さ `strokeWidthPx` を平らに持ちます。線を描かないタスクにも、太さを必ず書きます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 線の型 `Stroke { color, opacityPercent, widthPx }` を作る（平ら、2 段）。線を描かないときは、太さも書かない（`NullTrap`・`OMPV`: 描かない線の太さという、意味の無い値を持たない）。塗りは `Paint { color, opacityPercent }`。W3C のデザイントークンの border 型も、色と太さを 1 つの型に入れる（`{ color, width, style }`） |
| b | 塗りも線も `Paint` を取り、太さは今のまま外に置く（`strokeWidthPx`。SVG の `stroke-width` と同じ置き方） |
| c | Copilot の形 `Stroke { paint, widthPx }`（`stroke.paint.color` と 3 段になる） |

前回の答え「一旦保留。 GRWBで決めたい。」は、`JDG-3567` で、この紙で決める形に変わりました。

回答:

#### ❓ 問 6-6-4-11. 3 つの型で、塗りと線の形を共にするか

場面: タスクの描き方・コメントボックス・ハイライトボックスの 3 つの型が、塗りと線を持ちます。必ず持つ欄は型ごとに違います（コメントボックスは塗り・枠・文字を必ず持ち、タスクは塗りも縁も省ける）。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | 型 `Paint`・`Stroke` だけを共にし、どの欄を必ず持つかは型ごとに書く（`ISP`: 型ごとに要る欄だけを持つ） |
| b | Copilot の案のように `ShapeStyle { fill, stroke }` を 3 つの型で共にし、必ず持つ欄の違いは型ごとの足しの決まり（`allOf`）で書く（`DRY`） |

前回の答え「一旦保留。 GRWBで決めたい。」は、`JDG-3567` で、この紙で決める形に変わりました。

回答:

### [task] タスクと依存（❓ 1）

#### ❓ 問 6-9-8. `dependencies` —— MSPDI の名 PredecessorLink と違う名を保つか

場面: このキーは、タスクの下に、このタスクが後続になる依存を並べます（`JDG-3520` の文）。MSPDI は同じ物を PredecessorLink と呼びます。タスクの依存には先行と後続の 2 つの向きがあり、名 `dependencies` はどちらの向きかを言いません。1 つの依存の型は Part 8 の `Dependency` で、中のキーは MSPDI の名（`predecessorUid`・`linkLag`・`linkType`）を写します。

| # | キー | 日本語の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-12 | `dependencies` |  | MSPDI の Task/PredecessorLink と同じ。このタスクが後続になる依存の並び。（`JDG-3520`） | PredecessorLink |

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `predecessorLinks`（このタスクの先行への結び付きの並び）にする。名が向きを言い（`NEIM`）、MSPDI の名を写す（`JDG-3563`）。型 `Dependency`（Part 8）も `PredecessorLink` に改める。日程の考えの語「依存」（Part 4 の `dependency`）は、考えの名として今のまま残す |
| b | `dependencies` と `Dependency` を保つ。日程の考えの語「依存」と同じ語で読める。向きは意味の文が言う |
| c | `predecessorDependencies`（このタスクが後続になる依存の並び）にする。名が向きを言い、語「依存」も保つ。型 `Dependency` は今のまま |

回答:

### [tg] タスクグループ（❓ 1）

#### ❓ 問 6-9-2. タスクグループが表すタスク —— `derivedFromTaskUid` の新しい名

場面: タスクグループが、WBS のどのタスクを表すかを持ちます。MSPDI を開くとき、GRS は WBS の親タスクからタスクグループを作り、そのタスクの uid をここに書きます。タスクグループを別の親の下へ移すと、GRS は WBS でもそのタスクの親を付け替えます（仕様書の `HM-12`）。前回、あなたは前の席の案 `representedTaskUid` に「微妙。 他の案を出せ。 MSPDI由来ならその旨が分かるようにしろ。」と答えました。

| # | キー | 今の名 | 意味（日本語） | MSPDI の名 |
|:---|:---|:---|:---|:---|
| 9-20 | （新しい名） | `derivedFromTaskUid` | このタスクグループが WBS で表すタスク。値を書いたタスクグループだけが、タスクを表す。タスクグループの名前は name が持ち、このプロパティが指すタスクの名前から独立している。 | 無し |

MSPDI 由来を示す手がかりは 2 つあります。末尾の `Uid` は、指す先が MSPDI 由来の実体（Task）であることを言います（`JDG-3557`）。頭の語は、どの木の中のタスクかを言えます。

| 案 | 中身 |
|:---|:---|
| **a（推奨）** | `wbsTaskUid`（このタスクグループが表す、WBS の中のタスク）。`wbs` は辞書の語で「親タスクと子タスクの木」（`JDG-3431`）、つまり MSPDI の木を指す。名が「MSPDI の木のタスク」と「指す先は MSPDI の実体」を両方言う。移すと WBS の親が付け替わる関係（`HM-12`）とも合う |
| b | `summaryTaskUid`（WBS の要約タスク）。MS Project の語 Summary に合う。ただし子を持たなくなったタスクも指し続けるので、そのとき名が中身と食い違う |
| c | `outlineTaskUid`。MSPDI の語 Outline（`OutlineLevel`・`OutlineNumber`）に合う。GRS の画面と辞書は Outline の語を使わない |
| d | `representedTaskUid`（前の案）。「表す」関係を言うが、MSPDI の木の中のタスクだとは言わない |

回答:

***

## ❓ 自由

答えを読んで、ほかに聞きたいこと・違うと思う所があれば、ここに書いてください。

回答:
