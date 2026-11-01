# シート 1 の下調べ — 木のいちばん上（製品・文書・窓のたぐい・画面の大きな領域）

第 1 段（`1-glossary-tree.md`）と第 2 段（`2-json-mspdi-tree.md`）の上に、木の最上段の 4 つだけを、層ごとに数えた。
名を決めるのは利用者であり、本書は数と食い違いだけを並べる（どれが正しいかは選んでいない）。

## 数え方

| 層 | 読んだもの | 数え方 |
| --- | --- | --- |
| 用語集 | `docs/spec/_assets/tbl-glossary.md` | その語を含む行の数と行 ID |
| 画面 | `src/adapter/screen-renderer/display-words.json` | `"ja":` / `"en":` の行に出る回数（キー名の行は「キー」と書く） |
| 本文 | `docs/spec/*.md`・`docs/spec/_assets/*.md`（用語集は除く） | 出る回数。例の `01-04:5260` は `01-04-requirements.md` の 5260 行 |
| JSON 案 | `doc-shape-map.tsv` の `element_new`＋`description_new`、`spec-rows-map.tsv` の `ROOT_DESCRIPTION` の `new`（頭の文） | 出る回数。頭の文は別に書く |
| コード | `src/**/*.ts`（185 ファイル。注釈と文字列を除いた識別子） | 語の族ごとの「識別子の種類 / 使われた回数」。族は小文字始まり・大文字始まり・`_大文字_` の境目で切った（`append` は `app` に入れない） |
| MSPDI | `docs/reference/mspdi/pj12/mspdi_pj12.xsd` | 要素名と宣言の行番号だけ |

- 数はすべて Python スクリプトで数えた（scratchpad の `survey.py`）。日本語の「面」「窓」は、前後が漢字でないものだけを数えた（「画面」「面積」は入れない）。
- 「ツール」は「ツールチップ」を除いた。英語の `app` は `App Header` を除いた。

## 1. 製品（GoodRelax Scheduler / GRS、`U-45`）

| 語 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| `GoodRelax Scheduler` | `U-45` | 1 / 1（`display-words.json:253`・`:254`、AI 向けプロンプトの説明） | 3（`01-04:300`・`01-04:7444`・`tbl-agent-api-members.md:96`） | 頭の文 1（Terms の 1 行目） | 文字列 0（`.ts` の外の `mcp-tool-descriptions.json:3` に 1） |
| `GRS` | `U-45`・`IC-139` | 17 / 16（`:1503`「GRS リセット」・`:1507`・`:3765`） | 694（`01-04:171`・`:192`・`:234`） | 58（`doc-shape-map.tsv:2`・`:4`・`:5`） | 10 種 / 25 回（`GRS_RESET_ENTRY` ほか、`properties-panel.ts:179`） |
| `GRS JSON` | **行なし**（本文の 表 T-005 の `G-14`、`01-04:269` にだけある） | 2 / 2（`:3765`・`:3766`） | 130（`01-04:171`・`:269`・`:319`） | 頭の文 2 | — |
| 本ソフトウェア | `U-45` の説明 | 0 | 24（`01-04:197`・`:198`・`:262`） | — | — |
| 本ツール | 0 | 0 | 16（`01-04:214`・`:220`・`:1302`） | — | — |
| アプリ | 0 | 1（`:4495`「相手側のアプリ」） | 43。うち「AI のアプリ」24（`01-04:197`・`:494`）—— GRS 以外を指す | — | `appShell` 10・`AppShellSource` 10 |
| 製品 / 本製品 | `U-35`（製品の略称） | 0 | 31（うち本製品 4）。GRS を指すもの（「製品が従う」「製品の範囲」）と一般の製品（`01-04:60`「特定の業種にも製品にも」）が混ざる | — | 0 |
| app / application（英） | — | — | 0（8 件は MIME 型とファイル名） | — | — |

- 画面で製品を名乗るのは、ほとんど略称 `GRS`（`branding` の `logo`、「GRS リセット」、通知「ブラウザの機能（GRS の機能ではない）」）。正式名は 1 か所だけ。
- MSPDI に製品名の要素は無い（交換形式なので当然）。

**ほころび**

1. **製品を指す語が 4 つ**: `GRS`（694）・本ソフトウェア（24）・本ツール（16）・本製品（4）。どれを散文で使うかの決めが無い。「製品」だけのときは GRS と一般の製品の両方を指す。
2. **製品の行が「UI パーツ」の表（T-103）にある**: `U-45` は画面の部品ではない。木の根なのに、部品の 1 行として並んでいる。
3. **語の表が 2 つある**: 本文の 表 T-005「本書を読むための語」（`G-1`〜`G-14`、`01-04:252`）が `GRS JSON`・WBS・MSPDI・Carry を定め、用語集（`tbl-glossary.md`）には無い。`GRS JSON` は用語集に行が無い。
4. JSON 案の頭の文は `GRS is GoodRelax Scheduler, which reads and writes the JSON files ...` と「ファイル」で GRS を定める（下の 2 を見よ）。

## 2. 文書・ファイル・プロジェクト

| 語 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 文書 / document | **行なし**。使う行 23（`N-5` `N-6` `N-8` `U-27` `U-49` `U-51` `U-52` `U-58` `U-61` `U-62` `U-65` と `IC-*` 12） | 27 / 31（`:22`・`:271`・`:275`） | 1208（`01-04:217`・`:224`・`:234`）。英 144 | 説明 48（`new document` 24・`the document` 17）。**頭の文は 0** | `document` 族 192 種 / 2830 回（`document` 950 —— うちブラウザの DOM の `document.`（`createElement` など）は 18、`DocumentSettings` 240） |
| ドキュメント | 0 | 0 | 4（`design-mcp-relay.md:215`・`:254`） | — | — |
| ファイル / file | 13 行（`U-58` `U-59` `U-61` `U-68` `K-97` ほか） | 98 / 97（`:33`・`:66`） | 429。英 44 | 34（うち頭の文 5、`JSON files` ほか） | `file` 族 194 種 / 1202 回（`fileName` 69・`fileOperationState` 51） |
| プロジェクト / project | 2 行（`N-8`「文書が表す 1 件」・`K-144`） | 3 / 3（`:2966`「本プロジェクトの基準タイムゾーン」・`:5002`） | 55。英 236（ほぼ `Project.xxx`） | 70（ほぼ `Same as MSPDI Project/...`） | `project` 族 31 種 / 489 回（`project` 312） |
| スケジュールデータ / schedule data | 0 | 1 / 1（`:5991`「スケジュールデータの時刻:」） | 88（日程データ含む、`01-04:56`・`:227`） | 6 ＋ `schedule` の title `Schedule data` | `schedule` 1385 回（`document.schedule` 221） |

同じ `Project.title` の呼び名（`U-27` `Document Title`）:

| 呼び名 | 出る所 | 数 |
| --- | --- | --- |
| `Document Title` / 文書名 | 用語集 `U-27`・本文（英 41、ja 37） | `01-04:4446`・`:5340` |
| 文書名を編集する / Edit the document name | 画面 `SK-9`（`display-words.json:3536`・`:3537`） | 1 |
| 文書名 / Document Name | 画面 遅延診断の Markdown（`:7123`・`:7124`） | 1 |
| プロジェクト名 / Project Name | 画面 `Open Chooser` の列（`:5002`・`:5003`） | 1 |
| ヘッダーのプロジェクト名 | 本文 `01-04:9011`・`DI-5`（`01-04:8057`） | 2 |
| 文書の名 | 本文 `01-04:7685`・`:7708`・`:9011` | 6 |
| the top of the page | JSON 案 `Project.title`（`doc-shape-map.tsv:83`） | 1 |

ところが「プロジェクト名」は **`Project.name` も指す**: 表 T-224 の `PF-1`（`01-04:7840`、編集「可」）と `fig-erd-detail.md:337` の `AT-2`。
一方 `AT-2` と JSON 案（`doc-shape-map.tsv:82`）は「`Project.name` は画面に出さない」と書く。

ファイルの側: `Opened File Name`（`U-58`、本文 3・`openedFileName` 34 回）・`File Saved At`（`U-59`、本文 3・`fileSavedAt` 26 回）。
この 2 つを載せる「ファイルの状態」（本文 12、`01-04:5340`・`:7740`）は `U-59` の説明の中にしか無く、コードでは `data-role` `File Status`（`dom-screen-surface.ts:80`）。

MSPDI（名と行だけ）: `Project`（225）・`Name`（248 → `Project.name`）・`Title`（258 → `Project.title`）・`Subject`（268）・`Author`（308）・`CreationDate`（318）・`LastSaved`（328、GRS の名なし —— `fileSavedAt` は GRS だけの値）。

**ほころび**

1. **「文書」に行が無い**（第 1 段の大事な 1 と同じ）。用語集 23 行・本文 1208 回・コード 2830 回が使う根の語なのに、定めが無い。JSON 案の説明は document（48）、頭の文は files（5）と、別の語で根を語る。
2. **1 つのもの（`Project.title`）に 5 つの名**: `Document Title`・文書名・Document Name・プロジェクト名・Project Name。用語集は `U-27` に「表題・題名と呼ぶな」と書くが、「プロジェクト名」は禁じていない。
3. **1 つの名（プロジェクト名）が 2 つの値**: ヘッダーと `Open Chooser` では `Project.title`、表 T-224 と `AT-2` では `Project.name`。
4. **表 T-224 と `AT-2` の食い違い**: T-224 は `Project.name` を「出して編集できる項目」とし、`AT-2`・JSON 案は「画面に出さない」とする（要確認）。T-224 の表題は「文書の基本情報」、その RATIONALE は「プロジェクトの基本情報」。
5. **文書とプロジェクトの関係が書かれていない**: `N-8` は「文書が表す 1 件」と書くだけで、文書・ファイル・`Project` のどれが何を持つか（文書 ⊃ `schedule` ⊃ `project`）は JSON 案にしか無い。
6. **「ファイルの状態」に行が無い**（画面の帯の中の領域なのに）。

## 3. 窓のたぐい（ウィンドウ・窓・面・モーダル・パネル）

### 3a. 総称の語

| 語 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| ウィンドウ / window | 8 行（`U-32` `U-49` `U-68` `IC-52` `IC-127` `IC-129`〜`IC-131`） | 3 / 6（`:968` 最小化・`:771` `IC-52`） | 183（英 15） | 0 | `Window` 族 131 種 / 1108 回（`TableWindowState` 27・`DelayDiagnosticsReportWindow` 64） |
| 窓 | 5 行（`U-66` `IC-52` `IC-107` `IC-154` `IC-168`） | 1（`:4843`「ファイルを選ぶ窓」＝ブラウザの窓） | 197 | 0 | — |
| 面 / surface | 18 行（`U-49` `U-53`〜`U-57` `U-60`〜`U-66` ほか）。**行なし**（定めは `tbl-settings.md:472` の `S-99g`） | 2 / 0（`:770` `IC-52`「開いている面を閉じる」） | 350（英 surface 15、`05-07:315`） | 0 | `surface` 族 84 種 / 472 回（`surfaceName` 49・`openSurfaceState` 26） |
| モーダル / modal | 0 / 英 7 行（すべて `Help Modal`） | 0（キー名だけ） | 0 / 英 8 | 0 | `modal` 族 24 種 / 281 回（`OpenModal` 17・`helpModal` 27） |
| パネル / panel | 19 行 | 15 / 13 | 533（英 56） | 11（`task group panel` ほか） | `Panel` 族 149 種 / 1116 回 |
| 浮く | 3 行（`U-49` 浮くウィンドウ・`U-64` 浮く UI パーツ・`U-66` 浮く窓） | 0 | 16 | — | — |
| ダイアログ / dialog | 0 | 0 | 3 / 0 | 0 | 0 |
| タイトルバー | 1 行（`IC-127`） | 1 | 82 | — | — |

### 3b. 1 つずつ

| 名（行） | 用語集の日本語 | 仕様の種類 | 画面の見出し ja / en | 本文 ja の数 | コードの名 |
| --- | --- | --- | --- | --- | --- |
| `Help Modal`（`U-30`） | ヘルプ | ウィンドウ（表 T-335、`01-04:8812`）。`S-99g` は「面ではない」 | ヘルプ / Help（`:3371`） | ヘルプ 158 | `helpModal` 5 種 / 54。`OpenModal` の一員。`HELP_MODAL_SURFACE` |
| `Confirmation`（`U-55`） | **短い名なし**（「問う面」） | 用語集は「面」と書くが、`UZ-13` の面の列挙に入らず、層は `UZ-3` | 答え Yes / No | 確認 84・問い 125（ほかの意味も混ざる） | `confirmation` 40 種 / 190 |
| `Export Chooser`（`U-54`） | **短い名なし** | 面（`WB-10` の形だけ借りる、`01-04:8817`） | ファイルに保存 / Save As（`:3385`） | 保存の面 5 | `ExportChooser` 7 種 / 25 |
| `Open Chooser`（`U-56`） | **短い名なし** | 面 | ファイルを開く / Open File（`:3392`） | 開く面 8・選ばせる面 14 | `OpenChooser` 8 種 / 23 |
| `Search Panel`（`U-64`） | 検索パネル | ウィンドウ | 検索パネル / Search Panel（`:3399`） | 93 | `searchPanel` 53 種 / 339。`SEARCH_PANEL_SURFACE` |
| `Resource List`（`U-49`） | 担当リスト | ウィンドウ | 担当リスト / Resource List（`:3378`） | 92（うち「担当リストのウィンドウ」29） | `resourceList` 44 種 / 286。`ResourceListWindow` |
| `Delay Diagnostics Report`（`U-66`） | 遅延診断レポート | ウィンドウ | 遅延診断レポート / 同（`:3406`） | 90（うち「遅延診断レポートの窓」36） | 28 種 / 298。`DelayDiagnosticsReportWindow` |
| `Holiday Settings`（`U-65`） | 休日の設定 | 面 | 休日の設定 / **Working Time**（`:3413`・`:3414`、入口 `IC-132` は `Working Time…` `:1207`） | 25 | 20 種 / 94。`isHolidaySettingsModal` |
| `Notification Area`（`U-57`） | 通知が立つ場所（短い名なし） | 面でもウィンドウでもない | — | 通知 180 | `notificationArea` 0。`data-role` のキーは `notices`（`dom-screen-surface.ts:96`）、`notice` 族 107 種 / 748 |

`S-99g` の面は、`UZ-13`（`01-04:5255`）の列挙で `Export Chooser`・`Open Chooser`・`Watermark Unlock`・`Difference Review`・`Import Report`・`Holiday Settings` の 6 つ。
表 T-335 のウィンドウは、`01-04:8812` の列挙で ヘルプ・検索パネル・遅延診断レポートの窓・担当リストのウィンドウ の 4 つ。

**ほころび**

1. **「面」が 4 つの意味**: (a) `S-99g` の重ねて開くもの、(b) 表 T-109 の列「面」 —— 値は 12 種で、`S-99g` の面はそのうち 4（`Export Chooser`・`Open Chooser`・`Difference Review`・`Holiday Settings`）だけ、残りは `App Header`・`Command Palette`・ウィンドウなど、(c)「文書の設定の面」（本文 25、`01-04:2058` 表 T-369）＝プロパティパネルの中身、(d) 表の列「面」（`01-04:328` の `W-*`、側面の意味）。さらに用語集が「面」と呼ぶ `Confirmation`（`U-55`）と `Drop Cue`（`U-68`）は、`UZ-13` の面の列挙に無い。
2. **画面で「面」と「window」が同じ入口**: `IC-52` は ja「開いている面を閉じる」、en「Close the open window」。しかも `IC-52` は面・プロパティパネル・ウィンドウの 3 つを閉じる。
3. **「窓」「ウィンドウ」が 2 つのもの**: GRS の中のウィンドウ（表 T-335）と、ブラウザの窓（本文の閲覧環境の窓 13・ブラウザの窓 4、用語集の `U-32`・`U-68` と本文 5 か所の「ウィンドウの下の端」「ウィンドウ全体」「ウィンドウの上に」）。表 T-335 の前文（`01-04:8813`）は「閲覧環境の窓とは別」と書くが、遅延診断レポートは「窓」（36）と呼ばれ、担当リストは「ウィンドウ」（29）と呼ばれる。
4. **`Help Modal` の名に Modal**: 仕様はヘルプを「作業の横で開いたまま読む」ウィンドウとし、面でもないとする。本文の「モーダル」は 0。なのに `UZ-13` は「面のうち `Help Modal` を除くもの」と書き、ヘルプが面の一員であるかのように読める。コードの `OpenModal`（`screen-renderer.ts:566`）もヘルプと面 5 つを 1 つの型に入れる。
5. **コードの surface は面と一致しない**: `*_SURFACE` の定数 14 のうち 9 が面でないもの（ヘルプ 3・検索パネル 2・プロパティパネル 1・`Schedule Filter Bar` 1・担当リスト 1・遅延診断レポート 1）を指す。画面の語の `surfaces`（7 件）もウィンドウ 4 と面 3 を混ぜる。
6. **「Panel」が 2 種類**: `Search Panel` は動かせるウィンドウ、`Task Group Panel`・`Properties Panel` は動かない帯。
7. **行が無い**: 面・ウィンドウ（表 T-335 の種類）・タイトルバー。親の名が無いので、9 つの子をまとめて呼べない。
8. **画面の見出しが用語集の名と違う**: `Holiday Settings` → en「Working Time」、`Export Chooser` → 「ファイルに保存 / Save As」、`Open Chooser` → 「ファイルを開く / Open File」。`U-54`・`U-55`・`U-56`・`U-57` は日本語の短い名が無い。

## 4. 画面の大きな領域

| 名（行） | 用語集の日本語 | 用語集が親を書くか | 本文 英 / ja | 画面 | コード |
| --- | --- | --- | --- | --- | --- |
| `App Header`（`U-31`） | ヘッダー | 書かない | 65 / 23 | ヘルプの見出し ヘッダー / App Header（`:3573`）、`K-100` の ja ラベル「App Header の高さの上限」（`:3095`） | `appHeader` 15 種 / 78 |
| `Schedule Canvas`（`U-32`） | なし（構造名） | 範囲を書く（`App Header` の下の縁から下の端、全幅） | 29 / — | 0 | `scheduleCanvas` 2 種 / 19 |
| `Task Group Area`（`U-50`） | なし（構造名） | `Schedule Canvas` の中、左右はパネルの内側 | 106 / — | 0 | `taskGroupArea` 15 種 / 159 |
| `Task Group Panel`（`U-22`） | タスクグループパネル | 書かない | 10 / 99 | ja 4 / en 2（`:3580`） | 12 種 / 109 |
| `Task Group Title Tree`（`U-23`） | タスクグループ見出しツリー | `U-22` の中身 | 3 / 0 | 0 | `taskGroupTitleTree` 2 種 / 17 |
| `Properties Panel`（`U-25`） | プロパティパネル | 書かない | 7（ほか `propertyPanel` 12）/ 155 | ja 8 / en 8、`K-72` の ja「Properties Panel の幅」（`:2682`） | `propertiesPanel` 20 種 / 148 ＋ `propertyPanel` 7 種 / 39 |
| `Command Palette`（`U-26`） | コマンドパレット | 書かない | 31 / 23（パレット 111） | 6 / 6（`:7`） | 11 種 / 62（`palette` 族 53 種 / 238） |
| `Time Ruler`（`U-19`） | タイムルーラー | 自分の行は書かない（`U-50` の文から `Schedule Canvas` の中と引ける） | 9 / 13（目盛の帯 13・時間軸 32） | 0 | `timeRuler` 1 種 / 3、`ruler` 族 37 種 / 151。JSON 案は `time axis` 2 |
| `Schedule Filter Bar`（`U-67`） | スケジュールフィルタの帯 | 置き場を書く（`App Header` と `Schedule Canvas` のあいだ） | 1 / 5 | 帯の文（`searchPanel` の `scheduleFilterBar`） | 9 種 / 30 |
| `Panel Divider`（`U-24`） | パネル境界 | 書かない | 8 / 0（「パネルの境」11） | 0 | 5 種 / 18 |
| `Scrollbars`（`U-21`） | スクロールバー | 書かない | 22 / 28 | 0 | `scrollbar` 17 種 / 88 |
| `Canvas Overlays`（`U-33`） | （同上）＝説明なし | 書かない | 2 / 0 | 0 | 0（`overlay` 族 13 種 / 46） |
| `Palette Groups` / `Palette Commands`（`U-34`） | 説明なし | 書かない | 2 / 0 | 群の名 5（置く・揃える・表示・カーソル・構え） | 5 種 / 18 ・ 1 種 / 4 |
| `Header Commands` / `Branding`（`U-35`） | 説明は `Branding` だけ | `Branding` は `App Header` の左端 | 4 ・ 37 / 0 | `branding` の `logo` = GRS | 1 種 / 5 ・ 10 種 / 29 |
| `Watermark`（`U-20`） | 透かし | 書かない | 16 / 95 | 10 / 1 | `watermark` 族 46 種 / 162（多くは `Watermark Unlock`） |

一般の語:

| 語 | 用語集 | 画面 ja / en | 本文 | JSON 案 | コード |
| --- | --- | --- | --- | --- | --- |
| 日程表 / chart | **行なし**。使う行 5（`U-63` `U-67` `X-2` `X-4` `IC-168`） | 9 / chart 2（`:110`→`:111`「chart's shapes」、`:33`→`:34` は「the schedule」） | 126 / chart 0 / チャート 7 | chart 16（うち頭の文 1、`doc-shape-map.tsv:11`・`:16`） | `chart` 族 4 種 / 8（`isOnTheChart`） |
| 画面 / screen | 行なし。使う行 28 | 18 / 13 | 831 / 194 | 10 | `screen` 族 102 種 / 1509 |
| ページ / page | 行なし。使う行 2（`U-32` `IC-139`） | 2 / 2（`:1507` GRS リセット） | 143 / 11 | 1（`doc-shape-map.tsv:83`） | `page` 族 33 種 / 95 |
| キャンバス / canvas | `K-65` / 英 4 行（`U-32` `U-33` `U-50` `U-68`） | 1（`:2567`「キャンバスの余白」） | 4 / 35 | 0 | `canvas` 族 9 種 / 110（`exportCanvas` も） |
| view | 行なし | en 3（`MK-7`「Pan the view」＝ ja「画面をパンする」） | 13 | 4（`scrollPosition`） | `view` 族 118 種 / 1408 |

入れ子の書かれ方（3 か所で違う）:

| 出典 | `Schedule Canvas` が含むもの |
| --- | --- |
| 用語集 `U-32`・`U-50` | 範囲は全幅 —— `Task Group Area` は「左右は 2 つのパネルの内側」なので、パネルも範囲の中に入る |
| 本文 `UZ-12`（`01-04:5260`） | `Time Ruler`・`Task Group Area`・`Scrollbars`・`Canvas Overlays`・`Watermark` だけ。パネルは別の段 `UZ-11`、`Panel Divider` は `UZ-10` |
| コード `screen-regions.ts:30`〜`:36` | `appHeader`・`scheduleCanvas`・`taskGroupPanel`・`timeRuler`・`propertiesPanel`・`taskGroupArea` を同じ段に並べ、入れ子を持たない |

`data-role` の名（`dom-screen-surface.ts:74` の `ROLE`）28 のうち 7 は用語集に無い: `Branding Divider`・`Title And File Strip`・`Document Title Ground`・`File Status`（以上 `App Header` の中）・`Task Group Drop Line`・`Task Group Grab Copy`・`Task Group Grab Cues`。
ほかに `Jump Landing Ring` ほか 5 つの `data-role` も無い。`W-4`（`01-04:334`）は「UI パーツの `data-role` は表 T-103 の名をそのまま書く」と定めている。

**ほころび**

1. **入れ子が書かれていない**: パネル 2 つが `Schedule Canvas` の中か外かが、用語集・`UZ-12`・コードで 3 通り。上の 15 行のうち用語集から親か置き場を引けるのは 6（`U-19`・`U-23`・`U-32`・`U-35` の `Branding`・`U-50`・`U-67`）だけ。
2. **日程表（chart）に行が無い**: 画面 ja 9・本文 126 が使い、画面 en は「chart」と「schedule」に割れ、JSON 案は chart（16）。どの領域を指すのか（`Schedule Canvas` か `Task Group Area` か）も書かれていない。
3. **schedule が 4 つのもの**: 製品名（Scheduler）・データ（`schedule`、スケジュールデータ）・絵（`Schedule Canvas`、日程表）・`Schedule Filter`。
4. **`Time Ruler` に名が 4 つ**: タイムルーラー（13）・目盛の帯（13）・時間軸（32、軸そのものの意味も混ざる）・JSON 案の `time axis`（JDG-3348）。
5. **canvas が 3 つ**: `Schedule Canvas` の範囲・同じ名の `data-role` の層（`U-32` 自身が「別」と書く）・`K-65` の「キャンバスの余白」と `exportCanvas`。画面には「キャンバスの余白」だけが出る。
6. **単数と複数の揺れ**: `Properties Panel` と `propertyPanelWidth`（`K-72`、コード 39 回）。画面の ja ラベルは「Properties Panel の幅」（英名がそのまま）で、隣の `K-71` は「タスクグループパネルの幅」。
7. **画面に出るのに用語集に無い領域**: `App Header` の中の「ファイルの状態」（`File Status`）と、題とファイルの帯（`Title And File Strip`）。
8. **説明の無い構造名**: `U-33`・`U-34`・`U-35` の `Header Commands`（第 1 段の G と同じ）。`Palette Groups` の 5 つの群の名は画面にあるが、用語集は列挙しない。

## まとめ —— 概念ごとにいちばん裁定が要るもの

| 概念 | 問い |
| --- | --- |
| 1 製品 | 散文で製品を何と呼ぶか（`GRS` 694 / 本ソフトウェア 24 / 本ツール 16 / 本製品 4）と、製品の行を UI パーツの表に置くか —— 語の表が T-005 と用語集の 2 つあることも合わせて |
| 2 文書 | 「文書」の行を立てるか、そして `Project.title` を何と呼ぶか（5 つの名。「プロジェクト名」は `Project.name` も指す） |
| 3 窓 | 「面」「ウィンドウ」「窓」を何に割り当てるか —— 面は 4 つの意味、窓はブラウザと GRS の 2 つ、コードの surface / modal はどちらとも合わない |
| 4 領域 | パネル 2 つは `Schedule Canvas` の中か外か（3 通り）と、「日程表」（chart）の行を立てるか |
