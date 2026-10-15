# CR-770 —— 英語の画面の語を、UI の書き方の確立した慣習にそろえる（キーの書き方・設定の項目名・問いの答えのボタン・省略記号・文の終わり。棚卸しと当てる計画）

> 状態: ⭐ **当てた** —— 2026-10-15、当てる体が `84daf515` の上に当てた（`JDG-2248`〜`JDG-2251` の答えのとおり。変更履歴は 4.81、測り待ちは `perf-pending` の 218）。手順は 7 節のとおり: 辞書の値は旧い値 → 新しい値の表を 1 本の使い捨ての台本で当てた（旧い値が辞書に無ければ何も書かずに止まる。木には入れない）。理由と不変条件の en の文の句点は「空でなく、`.`・`?` で終わらない値に `.` を足す」の 1 規則で当てた。キーの書き方は生成器と描き方を替えた: 名簿 `help-roster.json` の `keys` はキーの列の列（`[["Ctrl","Y"],["Ctrl","Shift","Z"]]`）になり、画面の綴り（`Ctrl+Y`）と、割当のあいだの語・`+` のキーの語は `tooltips.ts` の `keysWords`・`assignmentWords` が辞書の新しい区 `keyNotation` から組む（ヘルプとツールチップが同じ関数を使う —— `EZ-2` の「同じ対を 2 通りに組み立てない」）。表 T-036・表 T-255 の `割当` の欄の綴り（`Ctrl` ＋ `A`）は原稿の綴りとして保ち、`FR-036` に画面の綴りの文を足した。
> 当てた日の木で測り直した差（`66d989c6` → `84daf515`。辞書の en の値の全文の比べ）: en の値 1,027 → 1,097（`CR-754` の読むだけの行 46・`CR-755` のタイムゾーン 39 と欄 7・`CR-757` の全体日程シフト 8 ほか）。⭐ 同じ族で `66d989c6` の後に着地し、本書が足したもの: 設定の項目名は `CR-769` が鍵の名を替えたので今の en が `rulerHeightPx`・`rulerFontSizePx`・`isThemeMonochrome`・`scrollTaskGroupId`・`taskGroupPanelWidthPx`・`pinnedTaskGroupIds`・`isTimeOfDayVisible` になっていた（2.2 の「今の en」の 7 つ。`K-86` の `importSequence` は画面に出ない）—— 19 行は 2.2 の新しい en のとおり。句点の族: `QN-15`（`CR-757`）と `timeZoneField` の `keepGlobalTimeHint`・`keepLocalTimeHint`（`CR-755`）の 2 文以上の値。`CR-754`・`CR-755` が当てた設定の項目名 13 行と `K-144`・`K-145` には触れていない。`IC-158` は `66d989c6` の後に `CR-759`（`JDG-2175`）が「Back Up the Schedule Under Another Name and Fix」に替えていた —— 2.6 の D1.4・D2.11 の案（Save a Backup and Fix の冠詞と省略記号）は旧い名への案なので当てていない（12 節の問い）。
> 数（当てた結果。`docs/spec/_source/display-words.json` の値を当てる前と後で比べた）: 値の変更 336（en 325、ja 11）、新しい値 4（`keyNotation` の 2 項 × 2 言語）。族ごと（重なりを含む）: キーの書き方 16（en 8・ja 8）、設定の項目名 19、問いの文 9（`QN-9`・`QN-11` は ja も）、構える 30、業務の語 11、省略記号 9、命令の語 6（と `defaultNames` の ja 1）、説明の書き方 26、そのほかの値 14、理由と不変条件の語 31、句点 197（理由と不変条件の en の 201 のうち 4 は既に持っていた）。⭐ `defaultNames` の `taskGroup` は ja も「Untitled」にした —— 新しいタスクグループの名は文書に保存される値で、利用者の裁定（2026-09-01「日本語で表示していても綴りは変えない」）が ja と en を同じ綴りに縛る。
> 当てる体が決めたこと: ① 範囲の「 - 」を「–」にする案（D8.3、4 つ）は当てていない —— `FR-055` の 表 T-367 の `FX-8`・表 T-347 の `DT-5`・表 T-251 の `ND-2`・表 T-348 の `TL-5`・`TL-6` が、2 つの日のつなぎを言語によらず「半角空白、`-`、半角空白」と MUST で定めており、辞書の en だけを替えると同じ画面で 2 通りになる（12 節の問い）。② 切り替えの説明は見せる物の切り替えを「Show or hide …」、状態の切り替え（`IC-20`・`IC-47`・`IC-48`）を「Turn … on or off」、畳む・最小化・ピン・記録は「Expand or collapse …」「Minimize or restore …」「Pin or unpin …」「Start or stop …」とした（1 つの型に押し込むと意味が違う）。③ `IC-132` の面の見出し（表 T-103 の `Holiday Settings` の画面の語）も「Working Time」にした —— 入口の名と面の名を 1 つにする。表 T-103 の確定名（`Holiday Settings`・`Dialogue Field`）とコードの名は変えない（`JDG-2250` の「部品の名は変えない」、`CR-771` の範囲）。④ `docs/download/index.html` の手順の入口の名（Open…・Save As…）も同じ語にした。
> 起草の状態（当てる前の記録）: **下書き（当てていない）**。2026-10-15、作業木 `66d989c6` の上で棚卸しを測り、当てる計画を書いた。`docs/spec`・`src`・`tests` には何も当てていない。台帳は動かしていない —— 利用者の指示は調整役の席が `JDG-2241` として既に記録した（本席は一度 `JDG-2245` として二重に記録し、調整役の指摘で取り下げた。帯の `JDG-2245`〜`JDG-2254` は使っていない）。
> ID の帯: 番号 `CR-770` を調整役から受けた（`CR-769`〜`CR-771` の帯）。`66d989c6` の木で `CR-770` を名乗る所は 0 件だった。新しい行 ID・`DFC`・`PND` は使わない。
> 当てる裁定: `JDG-2241`（英語の慣習に従う）。覆す裁定: `JDG-174` のキーの綴り（`JDG-2248`）、`JDG-1223` の「Save to File」（`JDG-2251`）。
> ⭐ 答えを受けた書き直し（2026-10-15）: 11 節の問い 1・3・4・5 に利用者が答えた（`JDG-2248`〜`JDG-2251`）。問い 1 は C（日本語も）、問い 3 は Yes／No を保つ、問い 4 は Bottleneck を保つ、問い 5 は `IC-2` を Save As… にする —— 推奨と違う所を 2 節の各表の頭に書いた。
> 棚卸しの全体: `docs/review/english-naming-survey-2026-10-15.md` の 2.4 節（1,027 の en の値を 1 つずつ数えた。番号 D1.1〜D8.14 は棚卸しの番号）。保存される名は `CR-769`、コードと配る物の名は `CR-771`。
> 測った木: `66d989c6`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定と、決めの土台

| 何 | 中身 | 本書での扱い |
|---|---|---|
| `JDG-2241` | 「英語の慣習に従う。 他の用語もそうしてきたはず。 もし慣習と違うなら、しかるべきタイミングで直すぞ。  まだ公開前なので今がラストチャンスぐらいに思え。」（真偽の鍵は `xxxVisible` のまま、画面の行の名は物の名） | 英語の画面の語を、名指しできる UI の書き方の慣習と比べ、違うものを直す |
| 規則 02 の 5 節の表記の表 | 綴りはアメリカ式（`JDG-1921`・`JDG-1925`）、画面で何かを指す名前は Title Case、文と値は Sentence case（`JDG-1862`） | 前提として守る。⚠️ 表の注「設定の項目名の en（識別子そのもの）…は変えない」は問い 2 が掛かる |
| 慣習の出どころ | Microsoft Writing Style Guide（以下 MSWSG）、Windows のアプリの設計の指針（以下 WinUX）、Apple Human Interface Guidelines（以下 HIG）、Google Material Design の書き方、Chicago Manual of Style、業務の語は Microsoft Project・Primavera P6・PMI の用語集 | 出どころは本書と棚卸しにだけ書く（`JDG-2241` の読み）。仕様の辞書には製品名を書かない |

### 0.2 裁定の鎖（rulings.md を「＋」「／」「Ctrl」「Yes」「項目名の en」「Save to File」「Open File」「構え」「Arm」「Dialogue Field」「コメントボックス」「ボトルネック」「中断」「無題」「No name」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-174` | ヘルプの割当と割当のあいだに「 ／ 」、キーの綴りを `Ctrl` ＋ `Shift` ＋ `0` の形にそろえる（「提案通りやってみろ」） | ⚠️ 問い 1 —— en だけ `Ctrl+Shift+0`・「or」にするなら一部覆す。ja は変えない |
| `JDG-1862` | 名前の en は Title Case。範囲の注に「設定の項目名の en（識別子そのもの）は変えない」 | ⚠️ 注は `JDG-2241`（画面の行の名は物の名）が既に覆した —— `CR-754` が 11 行に当てる。本書は残りの 19 行に当てる（2.2） |
| `JDG-2241` の読み | 画面の行の名は物の名（例 行の名 `Plan`、値 `Shown`）。状態「`CR-754` が当てる（行の名）・見直しは調整役が別の席に起こす」 | ⭐ 2.2 の土台。問い 2 は `JDG-2241` が答えた（問わない） |
| `JDG-2106` | 新しい設定の項目名の en は「語にする」（`Project Base Time Zone`・`Display Time Zone 1`〜`4`） | 同じ向きの先例。`CR-755` が `K-144`・`K-145` に当てる（本書は触れない） |
| `JDG-1223` | 開き方の面の英語の見出しは「Open File」、保存の面は「Save to File」 | ⚠️ 問い 5 の束に含める（`IC-2` の名を「Export…」にするなら覆す） |
| `JDG-1166`・`JDG-1167` | ヘッダーの 15 個の ja と en の説明（「Show or hide the Command Palette」ほか） | 覆さない —— 説明の型「Show or hide …」を本書が他の 23 個の切り替えにも広げる（D3.2） |
| `JDG-510` | 頼みの文のアイコンの名（「Prompt for Schedule Image to JSON ってどう？」） | 覆さない。`IC-115` の名を動詞で始める案（D2.19）は問い 5 の束に含める |
| 「構え」「Arm」で当たる 30 行 | 構えるという操作の仕組みと ja の語 | 仕組みも ja も変えない。en の語 Arm だけが問い 4 に掛かる |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4` / `GL-006`（説明を読まずに操作できる）—— 英語の利用者が、毎日使う他のアプリ（Windows・macOS・Office）と同じ語と書き方で操作を読める: `Ctrl+A`、「Open…」の省略記号、「Delete」／「Cancel」の答えのボタン、文の終わりの句点。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.1`（曖昧さの無さ）—— 「Expand One Level」が意味の違う 2 つの命令（`IC-90`・`IC-92`）の名である（D8.10）。日の単位が 3 通り（D6.6）、`{m}m` は分と読める（D6.7）。
- `R1.3`（唯一の正）—— 同じ面が 3 通りに綴られる（Properties Panel・properties panel・property panel、D8.9）。中断の語が Pause と Stop の 2 つ（D5.6）。
- 規則 02 の 5 節（新しく書く英語はアメリカ式）—— 「the wrong way round」4・「start-up」1 が残る（D8.1。検査 32 の家族の行が拾わない形）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | ja の値は 1 つも変えない —— 本書は en の値だけを替える | 利用者の指示は英語の慣習。⚠️ 問いの答えのボタンは ja も「Yes」「No」だが（`confirmation`）、ja の語は本書の外（問い 3 で ja も替えるかを添えた） | 無い |
| X-2 | アメリカ式の取り残し 5 つを直す（「the wrong way round」→「reversed」、「start-up」→「startup」） | 規則 02 の 5 節の「新しく書く英語はアメリカ式」 | 無い |
| X-3 | 業務の語のうち標準と同じものは変えない（Baseline・Planned/Actual Start/Finish・% Complete・Milestone・Deadline・Lag・Predecessor・Successor・Status Date・Progress Line・Resume） | Microsoft Project・Primavera P6 と同じ | 無い |
| X-4 | 標準の語が無い GRS の語は変えない（Task Group・Highlight Box・Endpoint Span・Fade In/Out Days・Delay Diagnostics・Schedule Filter） | 慣習が無いものに慣習は当たらない | 無い |
| X-5 | 「Please」「!」「Error:」は 0（MSWSG のとおり）—— 足さない | 棚卸しの 2.4 の「慣習どおり」 | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 |
|---|---|
| 辞書の en の値 | `docs/spec/_source/display-words.json`（生成で `src/adapter/screen-renderer/display-words.json`） |
| キーの書き方（問い 1） | `docs/spec/01-04-requirements.md` の `FR-036` と 表 T-036、生成器 `tools/generate_help_roster.py`、`src/adapter/screen-renderer/tooltips.ts` の区切り |
| 問いの答え（問い 3） | `docs/spec/01-04-requirements.md` の `U-55`・表 T-037 の `NT-7`（「2 つの答え」）、辞書の `questions` の形（問いごとに答えの語を持つ）、`src` の確認の描画 |
| 設定の項目名（2.2、`JDG-2241`） | 表 T-104（`tbl-glossary.md`）と辞書の `settings` の en のうち 19 行、規則 02 の 5 節の表の注 |
| 書き方の束（問い 5） | 辞書の en の値だけ |

数（見込み —— 当てる体が測り直す）: 要求 ±0（`FR-036`・`U-55`・`NT-7` の文の書き換え）。表 ±0。辞書の項 ±0（問い 3 が A なら `questions` の項に答えの語の欄が 2 つ足される）。

---

## 2. 名前の対応表（推奨の案。棚卸しの番号 D…）

### 2.1 キーとマウスの書き方 —— ⭐ 答え `JDG-2248`（D7.1〜D7.5）

⭐ **答え: 日本語の画面でも英語の画面でも `Ctrl+Shift+E` の形**（推奨は英語だけだった）。選べるもののあいだは、en は or、ja は「 ／ 」を保つ（本席の読み）。下の表の「⚠️ ja の書き方は変えない」は答えで覆った。


| 今（en） | 慣習の形 | 出どころ | 数（`help-roster.json` の `keys` を Python で数えた） |
|---|---|---|---|
| `Ctrl ＋ A`・`Ctrl ＋ Shift ＋ E`（全角の ＋、前後に空白） | `Ctrl+A`・`Ctrl+Shift+E` | MSWSG「keys and keyboard shortcuts」（＋ で結び、空白を置かない） | 28 のうち 19 |
| `Delete ／ Backspace`・`Ctrl ＋ Y ／ Ctrl ＋ Shift ＋ Z`（全角の ／） | `Delete or Backspace`・`Ctrl+Y or Ctrl+Shift+Z` | MSWSG（選べるものは or で並べる） | 3 ＋ 辞書の値 1 |
| `Ctrl + {IC-102}`（半角の ＋、前後に空白、割当の `press` 8） | `Ctrl+wheel` の形 | 同上 | 8 |
| `Shift ＋ +` | `Shift+Plus sign (+)` | MSWSG（＋ のキーは Plus sign と書く） | 4 |
| `Ctrl + F5 : reload`（`QN-11`） | `Ctrl+F5: Reload` | 英語の句読（コロンの前に空白を置かない） | 1 |

⚠️ ja の書き方（全角の ＋ と ／）は変えない —— 結び方を言語ごとに持つ。

### 2.2 設定の項目名 —— `JDG-2241` が答えた（D6.1。2026-10-15 に調整役の指摘で範囲を測り直した）

⭐ 画面に出る行だけを数える: 文書の設定パネルが出すのは、表 T-369 の欄（`FO-1`〜`FO-16`）と、保存される見せ方の鍵（`SETTINGS_DEFAULTS`、`src/entity/document-model/document-settings/document-settings.ts`）の読むだけの行である。表 T-104 の `K` 行 131 のうち、道具の定数（`pxPerDayAt1x` ほか約 95）は画面に出ない —— 辞書の en が識別子のままでも利用者は見ない（棚卸しの D6.1 の「127」は辞書の上の数で、画面の数ではない）。

測った数（`66d989c6` ＋ `integ/coord-1011`）: 画面に出る `K` 行は 34 —— 表 T-369 の欄の名 11（`K-60`・`K-125`・`K-85`・`K-143`・`K-71`・`K-142`・`K-141`・`K-140`・`K-146`・`K-144`・`K-145`）と、読むだけの行 23（`SETTINGS_DEFAULTS` の鍵のうち表 T-369 の欄でも `tableViews.*` でもないもの）。そのうち en がプログラムの名のままのものは 30、語だが小文字のもの 2（theme color・Fit span）、語のもの 2（`K-142`・`K-143` の選ぶ箱）。

| 持ち主 | 行 | 数 |
|---|---|---|
| `CR-754`（X-12、`JDG-2241`） | 真偽の読むだけの行 `K-122`・`K-123`・`K-124`・`K-75`〜`K-79`・`K-82`〜`K-84`（Plan・Actual ほか） | 11 |
| `CR-754`（X-12、`JDG-2234`・`JDG-2240`） | `tableViews.*` の名の無い 13 行（Schedule Filter・Hidden Tasks ほか） | 13（新しい語） |
| `CR-755`（X-10、`JDG-2106`） | `K-144`（Project Base Time Zone）・`K-145`（Display Time Zone） | 2 |
| ⭐ **本書** | 下の 19 行 | 19 |

本書が替える 19 行（en だけ。ja は替えない。名は Title Case（`JDG-1862`）、選ぶ箱の名は `K-142`・`K-143` と同じ Sentence case の動詞句（HIG・WinUX のチェックボックス、D8.11））:

| 行 | 鍵 | ja | 今の en | 新しい en | 出る所 |
|---|---|---|---|---|---|
| `K-60` | `themeHue` | テーマ色 | theme color | Theme Color | `FO-2` |
| `K-125` | `displayScale` | 表示の倍率 | displayScale | Display Scale | `FO-3` |
| `K-85` | `fontScale` | 文字サイズ | fontScale | Font Size | `FO-4`（ヘッダーの入口の名「Font Size」と同じ語） |
| `K-71` | `taskGroupPanelWidth` | タスクグループパネルの幅 | taskGroupPanelWidth | Task Group Panel Width | `FO-6` |
| `K-141` | `fitSpanStart` ／ `fitSpanFinish` | 全体表示時の期間 | Fit span | Fit Span | `FO-10` |
| `K-140` | `parentProgressToleranceDays` | 遅延診断時に親タスクの進捗の疑義を許す日数 | parentProgressToleranceDays | Parent Task Progress Tolerance（単位 working days は `CR-754` の X-14 が欄の右に置く） | `FO-12` |
| `K-146` | `showsTimeOfDay` | 時刻を表示する | showsTimeOfDay | Show time of day | `FO-13` |
| `K-67` | `zoomX` | 横のズーム倍率 | zoomX | Horizontal Zoom | 読むだけ（View の組） |
| `K-68` | `zoomY` | 縦のズーム倍率 | zoomY | Vertical Zoom | 同 |
| `K-69` | `scrollDate` | 表示の左端が指す日付 | scrollDate | Left Edge Date | 同 |
| `K-121` | `scrollDayOffset` | 表示の左端が指す日のどこにあるか | scrollDayOffset | Left Edge Time | 同（値は「About {time} ({percent} of the day)」—— `CR-754`） |
| `K-70` | `scrollGroupId` | 表示の上端が指すタスクグループ | scrollGroupId | Top Task Group | 同 |
| `K-120` | `scrollGroupOffset` | 表示の上端が指すタスクグループのどこにあるか | scrollGroupOffset | Top Task Group Position | 同 |
| `K-110` | `pinnedGroupIds` | ピン止めの対象 | pinnedGroupIds | Pinned Task Groups | 同 |
| `K-138` | `levelZeroTreeState` | 段 0 の木の状態 | levelZeroTreeState | Top-Level Tree State | 同 |
| `K-61` | `themeMonochrome` | モノクロにするか | themeMonochrome | Monochrome | 読むだけ（Grid Lines and Color の組。値は Monochrome ／ Color —— `CR-754`） |
| `K-3` | `rulerFont` | 目盛の文字 | rulerFont | Ruler Font Size | 読むだけ（Ruler and Stack Direction の組） |
| `K-2` | `rulerHeight` | 目盛の帯の高さ | rulerHeight | Ruler Height | 同 |
| `K-73` | `stackDirection` | 積む向き | stackDirection | Stack Direction | 同 |

出どころ: MSWSG（コードの識別子を画面に出さない）。Visual Studio Code の設定の画面は `editor.fontSize` を「Editor: Font Size」と見せる。⚠️ 語は ja の項目名と、同じ物を指す入口・目盛の語から起こした案で、利用者は 1 つずつ覆してよい。

画面に出ない約 95 行（道具の定数）の en は変えない —— 規則 02 の 5 節の表の注「設定の項目名の en（識別子そのもの）」は、画面に出ない行についてだけ残る（9 節で注の文を直す）。

### 2.3 問いの答えのボタン —— ⭐ 答え `JDG-2249`（D2.1）

⭐ **答え: `Yes`／`No` のまま**（`y`／`n` のキーで答えるため）。下の表は問うた時の案の記録で、当てない。⭐ 代わりに、Yes／No で答える問いの文が ja・en とも Yes／No で答えられる形かを確かめた: 9 つは答えられる。`QN-12` は元から Yes／No の問いでない（`parentTaskChoice` の 2 択）。**`QN-9` だけが問いの形でない** —— 次へ直す（`WM-4` の証跡の文は保つ）:

| | 今 | 新 |
|---|---|---|
| ja | 透かしを非表示にするには、透かし解除パスワードが要ります。透かしはアクセス制御ではなく、画面に出した証跡です | 透かしを非表示にしますか？ 透かし解除パスワードが要ります。透かしはアクセス制御ではなく、画面に出した証跡です |
| en | Hiding the watermark needs the watermark unlock password. The watermark is a record that this was on screen, not access control | Hide the watermark? This needs the watermark unlock password. The watermark is a record that this was on screen, not access control |

⚠️ `QN-8` の en を「Continue? This can't be undone.」にする束の項（D4.6）も Yes／No で答える形を保つ。


| 今 | 案 | 出どころ |
|---|---|---|
| 11 の問いのすべてで `Yes`／`No`（`confirmation`、ja も `Yes`／`No`） | 問いごとの動詞 ＋ `Cancel`: 「Delete」／「Cancel」（消す問い）、「Overwrite」／「Cancel」、「Reset」／「Cancel」、「Shift Dates」／「Cancel」ほか | HIG の Alerts（「Yes と No を避け、何が起きるかを言う動詞にする」）、WinUX のダイアログのボタン |

### 2.4 「Arm」—— 問い 4（D3.1）

| 今 | 案 | 数（`\b[Aa]rm(ed|ing)?\b`） |
|---|---|---|
| パレットの説明「Arm the rectangle; drag on empty space to create a rectangle task」ほか 23 | 「Rectangle: drag on empty space to draw a rectangle task」（道具の名 ＋ 身振り） | 30（説明の頭 23・名「Armed Glyph」「Armed Shape」ほか） |
| 名「Armed Glyph」・群の名「Armed Shape」 | 「Current Tool」 | |
| `RS-54`「The arming is still live」 | 「The tool is still selected」 | |

出どころ: Figma・PowerPoint の道具の説明は道具の名と操作を言う（「Rectangle (R)」）。arm は MSWSG・HIG の語彙に無い。⚠️ 仕様の中の操作の名（構える、`AR-*`、表 T-023 ほか）は変えない —— 画面に出る en の語だけ。

### 2.5 業務の語 —— ⭐ 答え `JDG-2250`（D5.6・D5.9・D5.12・D5.18）

⭐ **答え: Paused → Stop、Comment Box → Callout、Dialogue Field → Chat は替える。Bottleneck・Bottleneck path は変えない**（`DG-3` は祖先のタスクを指し、Driving path（先行タスクの鎖）と意味が違う。The Goal も bottleneck の語を使う）。2.4 の Arm も替える。


| 今 | 標準の語 | 出どころ | 推奨 |
|---|---|---|---|
| Paused（`PS-3`・`PS-4`、「Clear the Pause Values」）と stop（`VC-7`）が混ざる | Stop／Resume | Microsoft Project のタスクの欄 Stop・Resume（GRS の列も `stop`・`resume`） | 変える —— Stop にそろえる |
| Bottleneck・Bottleneck path（`DG-2`・`DG-3`） | Driving task・Driving path | Microsoft Project の Task Path「Driving Predecessors」、Primavera P6 の「Driving path」 | 変える |
| Comment Box（`IC-35`・`AR-5`） | Callout | Microsoft Project の Timeline・PowerPoint の「Callout」（引き出し線を持つ箱） | 変える（en だけ。データの `CommentBox` は `CR-769` の範囲の外で変えない） |
| Dialogue Field（`IC-18`） | Chat | Visual Studio Code・Office の「Chat」。field は MSWSG で 1 つの入力欄を指す | 変える（en の語だけ。`postDialogueMessage` ほかの名は変えない） |

### 2.6 書き方の束 —— ⭐ 答え `JDG-2251`

⭐ **答え: 推奨どおり当てる。ただし `IC-2` は Export… にしない —— 入口の名は「Save As…」、面の見出しは「Save As」**（GRS JSON は書き出しでなく保存。MSPDI・html も同じ面から保存する）。下の表の D1 の「Export…」は「Save As…」と読む。


| # | 今 | 案 | 出どころ | 数 |
|---|---|---|---|---|
| D1 | 省略記号 0（辞書の en に `...`・`…` が 0） | 入力を求めてから動く命令に付ける: Open…（`IC-1`）・Export…（`IC-2`、今「Save to File」）・Working Time…（`IC-132`、今「Holiday Settings」）・Save as Markdown…（`IC-140`、今「.md」）・More Colors…（色の欄） | WinUX・HIG・MSWSG「ellipses」 | 7 |
| D2.3 | No name（新しい文書の名） | Untitled | Word・Google ドキュメント・Figma・VS Code | 1 |
| D2.4 | Fit（`IC-10`） | Zoom to Fit | Figma「Zoom to fit」 | 1 |
| D2.6 | Enter or leave full screen | Enter or exit full screen | HIG「Enter Full Screen／Exit Full Screen」 | 1 |
| D2.11 | 名の中の冠詞（Draw a Dependency Line・Hide the Watermark ほか） | 冠詞を落とす（Link Tasks・Save Backup and Fix・Cancel Import） | WinUX（名に冠詞を置かない） | 5 |
| D3.2 | 切り替えの説明が 5 通り（Show or hide X ／ Show X; press again to hide it ／ Turn X on or off ／ Enable X; press again… ／ Enter or leave） | 「Show or hide X」1 通り（`JDG-1167` の型） | MSWSG（説明は短く一貫させる） | 29 |
| D3.3 | press again（ボタンを押す意味） | click again、または落とす | MSWSG（ボタンは select／click、press はキー） | 27 |
| D3.4 | 内の語 surface・glyph が画面に出る | window／panel、shape／icon | MSWSG（内部の語を出さない） | 4 |
| D4.1・D4.2 | 知らせの文の句点: 203 のうち 4 だけが「.」で終わり、2 文以上の値 15 が最後の句点を持たない | 文は句点で終わる | MSWSG「error messages」・HIG | 203 ＋ 15 |
| D4.4 | Try once more | Try again | MSWSG・WinUX | 9 |
| D4.5 | write it out（保存・書き出しの意味） | save／export | MSWSG | 6 |
| D4.6 | 「Go on? This makes a change that undo cannot bring back」（`QN-8`） | 「Continue? This can't be undone.」 | WinUX・HIG の定型 | 2 |
| D6.6・D6.7 | 日の単位が `1d`・`{lag} d`・`{d}d` の 3 通り、`{y}y {m}m {d}d` | `{n}d` 1 通り（Microsoft Project の表示）、`{y} yr {m} mo {d} d` | MSWSG の単位の略記 | 5 ＋ 2 |
| D8.2・D8.3 | 並びの最後のカンマ（serial comma）が無い 5、範囲の「 - 」4 | 「, and」、範囲は「–」（空白なし） | MSWSG・Chicago Manual of Style 6.19・6.78 | 9 |
| D8.8・D8.9 | 文の中の「the Selection」「that Item」、Properties Panel の 3 通りの綴り | the selection、Properties Panel 1 通り | Sentence case の決まり（`JDG-1862`）、1 つの名に 1 つの綴り | 6 ＋ 5 |
| D8.10 | 「Expand One Level」が 2 つの命令の名（`IC-90`・`IC-92`） | `IC-92` を「Show Top Level Only」 | 1 つの名に 1 つの命令 | 1 |

棚卸しの 2.4 に、束に入れなかった低い所見（D2.5「Screen Language」→「Display Language」、D2.7・D2.8・D2.17・D5.5・D5.23 ほか）を残した。調整役か次の席が拾う。

---

## 3. 数（`66d989c6`）

- 辞書の en の値 1,027（空でない 1,025）。問い 5 の束が触れる値 約 330、問い 1・3・4 と 2.2 が触れる値 約 80（2.1〜2.5 の数の和。重なりを含む）。
- 試験が en の語を引く所（`grep -rlF "<語>" tests`）: 「Yes」10 ファイル、「Dialogue Field」13、「Holiday Settings」4、「Save to File」1、「No name」2。⚠️ 当てる体が当てる日に語ごとに数え直す（試験が語を符号で綴る所は検査 77 が解く。英語の語は 0 の見込み）。

---

## 4. ⛔ 変えない語

- ja の値（X-1）。業務の標準の語（X-3）。標準の無い GRS の語（X-4）。
- 仕様の中の操作の名・部品の確定名（`AR-*`・`U-*`・表 T-103）—— 本書は画面に出る en の値だけを替える。⚠️ 確定名と画面の en が別の綴りになる所（Comment Box → Callout、Dialogue Field → Chat）は、表 T-103 の en の名も同じ回に替えるかを当てる体が測る（規則 03 の 1 節「別名を与えない」に掛かる。問い 4 の答えの範囲で決める）。
- 履歴（rulings の逐語、台帳、`change-request/`、`docs/review/`）。

---

## 5. 継ぎ目（コード）

- 辞書の値は `npm run gen` が `src` の写しへ刷る。検査 32（Title Case・綴り）、検査 37（辞書の項と表の行の対の指紋）が読む —— en の名が替わる項の指紋を、語を並べて読んでから付け直す（`CR-726` の 6 節と同じ）。
- 問い 1: `tools/generate_help_roster.py` は今 `Ctrl+A` を拒む（`FR-036` の MUST）—— 生成器と `tooltips.ts` の区切りを言語ごとにする。
- 問い 3: 確認の面は答えの語を 1 組しか持たない（`confirmation`）—— 問いごとに答えの語を持つ形へ変えるのは振る舞いの変更で、`U-55`・`NT-7` と描画のコードを同じ段で替える。

---

## 6. グラフ

辞書の値だけを替える所は行 ID を変えない。問い 1 と問い 3 は要求の文（`FR-036`・`U-55`・`NT-7`）を書き換える —— 当てる体は `impact.py FR-036 T-036 U-55 NT-7` を当てる日の木で測る。

---

## 7. 機械の手順

辞書の en の値は、旧い値 → 新しい値の表（`rowId`・欄・旧・新）を 1 本の台本で当てる（`CR-730` の `apply_spelling.py` の止まり方 —— 表の旧い値が辞書に無ければ何も書かずに止まる —— に倣う）。試験が同じ語を引く所は、同じ表で文字列の一致を挙げて 1 か所ずつ読む（題の文・期待値）。検査 77 で、試験が語を符号で綴る所を解いて数える。

---

## 8. 段・時機・見積もり

### 8.1 ⛔ 当てる時機 —— 進行中の波の後（`66d989c6` で各変更要求の本文を数えた）

| 群 | 触れ合う変更要求 | 何が重なるか |
|---|---|---|
| 2.2（設定の項目名 19 行） | `CR-754`（11 行と 13 行を持つ —— 本書の 19 行と重ならない。⚠️ `CR-754` の X-12 の組の名と値の語の後に当てる）、`CR-755`（`K-144`・`K-145` を持つ —— 重ならない）、`CR-756`（`K-` 3） | 同じ `settings` の区の別の行 |
| 問い 1（キー） | `CR-754`・`CR-755`・`CR-757`・`CR-759`・`CR-762`（`FR-036`・表 T-036 を名指す） | ヘルプの名簿の行 |
| 問い 3（答えのボタン） | `CR-757`（`QN-` 8 —— 全体を動かす問い `QN-14`）、`CR-767`（状態機械の確認の 6） | 問いの語と確認の状態機械 |
| 問い 5 の D1・D2.2 | `CR-768`（`IC-2`・保存の面と `.md` を 23 か所名指す） | `IC-2`・`IC-140` の名 |
| 辞書の値（全般） | `CR-754`〜`CR-760`（辞書を名指す 2〜8 か所ずつ） | 当てる体が値ごとに旧い値の一致を数える |
| 触れない | `CR-740`・`CR-765`・`CR-766` | 画面の語を名指さない |
| 触れ合う（`integ/coord-1011` の `f6796d70` で測った） | `CR-764`（`FR-036` を 1 か所、辞書を 2 か所名指す）・`CR-763`（辞書を 1 か所） | 問い 1 のヘルプの名簿と、辞書の値 —— 着地の後に当てる |

### 8.2 段

| 段 | 何をする | 見込み |
|---|---|---|
| 0 | 2 節の表を答えに合わせて確定し、値の表を作る（1 つの体） | 1.5〜2 h |
| 1 | 辞書の値（2.2・問い 4・5 と X-2）、`npm run gen`、検査 37 の指紋 | 1〜1.5 h |
| 2 | 問い 1（`FR-036`・生成器・`tooltips.ts`）、問い 3（`U-55`・`NT-7`・辞書の形・確認の描画） | 2〜3 h |
| 3 | 試験の語、check.sh、`vitest`・`playwright`（錠の下） | 1〜1.5 h |

- 計 約 5.5〜8 h。`CR-769` と同じ凍結に入れず、別の回に当ててよい —— 辞書の値はファイルの形を変えない。⚠️ ただし `CR-769` の問い 1 の答えで設定の識別子が替わると、画面に出ない項目名（識別子のまま）も替わる。2.2 の鍵の列は `CR-769` の後の綴りで読む —— `CR-769` を先に当てる。

---

## 9. 仕様の外で直すもの

- 規則 02 の 5 節の表の Title Case の行の注「設定の項目名の en（識別子そのもの）…は変えない」を「画面に出ない設定の項目名の en（識別子そのもの）…は変えない」に直す（`JDG-2241`）。`settings.label` を Title Case の欄の一覧に足さない —— 選ぶ箱の名（`K-142`・`K-143`・`K-146`）は Sentence case である。
- 英語の手引き（`docs/guides/schedule-to-grs-json/prompt-en.md`）が画面の語を引く所があれば同じ語にする。

---

## 10. ⛔ この変更でやらないこと

- ja の値を変えない。保存の鍵・コードの名を変えない（`CR-769`・`CR-771`）。
- 操作の振る舞いを変えない —— 問い 3 の答えのボタンは、押したときに起きること（続ける／やめる）を変えず、語だけを問いごとにする。

---

## 11. 利用者に問うこと

**用語の説明**: 「ヘルプの名簿」＝ ヘルプとツールチップに出る、キーと操作の一覧。「設定の項目名」＝ 文書の設定パネルの各行の左の名。

**問い 1 —— 英語の画面で、キーの組み合わせを `Ctrl+A` と書きますか？（`JDG-174` を英語だけ覆すか）**
**Q1 —— In English, write key combinations as "Ctrl+A"?**

使う場面: 英語に切り替えた画面で、ツールチップとヘルプに `Ctrl ＋ A`（全角の ＋、前後に空白）、`Delete ／ Backspace`（全角の ／）と出る。

| | **A（推奨）英語は `Ctrl+A`・「or」、日本語は今のまま** | B 両方とも今のまま | C 両方とも `Ctrl+A` |
|---|---|---|---|
| 英語の画面 | `Ctrl+Shift+E`、`Delete or Backspace` | `Ctrl ＋ Shift ＋ E`、`Delete ／ Backspace` | `Ctrl+Shift+E` |
| 日本語の画面 | 今のまま | 今のまま | `Ctrl+Shift+E`（ja の書き方も変わる） |

推奨: **A**。理由 —— Windows・Office・macOS の英語の画面と説明書きは `Ctrl+A` と書く（Microsoft の書き方の指針）。全角の ＋ は英語の字に無い。日本語の書き方は `JDG-174` で決めたまま保つ。

**問い 2 —— （問わない）英語の設定パネルの項目名を語にするか**

⭐ `JDG-2241`（2026-10-15）が答えた —— 画面の行の名は物の名にする。本書は `CR-754`・`CR-755` が持たない 19 行に当てる（2.2）。2.2 の語の案は、利用者が 1 つずつ覆してよい。

**問い 3 —— 問いの答えのボタンを「Yes／No」から「Delete／Cancel」のような動詞にしますか？**
**Q3 —— Should question buttons say what they do ("Delete" / "Cancel") instead of "Yes" / "No"?**

使う場面: 「このタスクグループと、その上のタスクを消しますか？」などの 11 の問いの下に、いつも `Yes`／`No` が出る（日本語の画面でも `Yes`／`No`）。

| | **A（推奨）問いごとの動詞 ＋ Cancel（英語）** | B 英語も日本語も動詞にする | C 今のまま |
|---|---|---|---|
| 英語 | Delete／Cancel、Overwrite／Cancel、Reset／Cancel ほか | 同左 | Yes／No |
| 日本語 | Yes／No のまま | 削除／キャンセル ほか | Yes／No |
| 手間 | 仕様の 2 か所（`U-55`・`NT-7`）と確認の描画を変える（約 2 h） | ＋ ja の語 11 組 | 0 |

推奨: **A**。理由 —— Apple と Microsoft の指針はどちらも「Yes／No を避け、押すと何が起きるかを言う」。日本語の語は今回の指示（英語の慣習）の外なので、B は別に決める。

**問い 4 —— 画面の英語の語のうち、標準の語がある 5 つを替えますか？（複数選んでよい）**
**Q4 —— Which GRS-made English words should become the standard words? (multi-select)**

使う場面: パレットの説明の頭が「Arm the rectangle; …」（構える）、遅延診断の「Bottleneck」、プロパティの「Paused」、パレットの「Comment Box」、ヘッダーの「Dialogue Field」。

| 今 | 案 | 標準の出どころ | 推奨 |
|---|---|---|---|
| Arm（30 の値） | 道具の名 ＋ 身振り（「Rectangle: drag on empty space…」）、Current Tool | Figma・PowerPoint の道具の説明 | 替える |
| Bottleneck | Driving | Microsoft Project・Primavera P6 | 替える |
| Paused | Stop（Stop／Resume の対） | Microsoft Project の列 | 替える |
| Comment Box | Callout | Microsoft Project の Timeline・PowerPoint | 替える |
| Dialogue Field | Chat | VS Code・Office | 替える |

推奨: **5 つとも替える**。理由 —— どれも英語の利用者が他のアプリで既に知っている語がある。⚠️ 仕様の中の部品の名（`CommentBox` のデータ、構えるという操作の名）は変えない —— 画面の英語の語だけ。

**問い 5 —— 書き方の束（2.6 の 17 項目: 省略記号「Open…」、Untitled、Zoom to Fit、文の句点、Try again ほか）を推奨どおりにまとめて当ててよいですか？（`JDG-1223` の「Save to File」を「Export…」にすることを含む）**
**Q5 —— May the 17 style fixes in section 2.6 be applied as recommended, in one batch?**

| | **A（推奨）まとめて当てる** | B 1 つずつ選ぶ | C 当てない |
|---|---|---|---|

推奨: **A**。理由 —— どれも Microsoft・Apple の書き方の指針にある定型で、選び分ける余地が小さい（2.6 の表に 1 つずつ出どころを書いた）。

⭐ 答え（2026-10-15、本席が利用者に問うた）:

| 問い | 答え | 裁定 |
|---|---|---|
| 問い 1 | C 両方とも Ctrl+A | `JDG-2248` |
| 問い 3 | 「Yes / Noにしておけ。…必要なら念確しろ。」—— Yes／No を保ち、問いの文を確かめた（`QN-9` を直す、2.3） | `JDG-2249` |
| 問い 4 | Arm・Paused・Comment／Dialogue を替える。Bottleneck は「ボトルネックって変なの？ The Goalでは…」と問い返し、意味の違いを示して問い直した答え「A Bottleneck のまま」 | `JDG-2250` |
| 問い 5 | 「基本は提案通りだが、 SaveAsはそのままで。…」、確かめの問いに「A Save As… にする」 | `JDG-2251` |


### 11.1 当てた後に残る問い（調整役へ。利用者には問うていない）

| # | 何 | 案 |
|---|---|---|
| Q-A | 範囲の「 - 」→「–」（D8.3）は仕様の MUST（`FX-8`・`DT-5`・`ND-2`・`TL-5`・`TL-6`）が言語によらない綴りを定めるので当てていない | 仕様の 5 行を「–」に替える別の変更要求を起こすか、今のまま保つ |
| Q-B | `IC-158` の名は `JDG-2175` が「Back Up the Schedule Under Another Name and Fix」に定めた後である —— 冠詞を落とす案・省略記号の案（D1.4・D2.11）は当てていない | 今のまま（推奨 —— 幅を測って決めた名）か、末尾に「…」を足す |
| Q-C | `JDG-1950` が定めた `FA-7` の en「Clear the Pause Values」を `JDG-2250` で「Clear the Stop and Resume Dates」にした —— `JDG-1950` の行に覆された印は付けていない（台帳の行の持ち主でないため） | 調整役が `JDG-1950` の状態に「覆された（一部。`JDG-2250`）」を付ける |
| Q-D | `plusKey` の語「Plus (+)」・「プラス (+)」は本体が書いた語である（利用者の語ではない）。慣習の綴りは「Plus sign (+)」だが、英語のヘルプが 1280 × 627 で 7px あふれた（`FR-036` の 1 画面の MUST、`cr-665` の試験）ので短くした。IC-54 の注も「(while a tool is selected)」に短くした | 利用者が覆してよい（覆すなら `S-203` を測り直す） |

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-2248`〜`JDG-2251` を足した（状態「指示 —— CR-770 が当てる」）。`JDG-174`・`JDG-1223` の状態を「覆された（一部）」にした（旧の状態は残した） |
| `changelog.md` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
# the tree: worktree at 66d989c6
# every en value: python json walk of docs/spec/_source/display-words.json, each dict holding a string "en" -> 1027
# settings labels: d["settings"][*]["label"]["en"]; identifier = fullmatch [a-z][A-Za-z0-9.]* with an upper-case letter -> 125 (+2 joined by " / ")
# message periods: reasons + invariants, every {"en": ...} value -> 203, ending with "." -> 4
# key strings: src/adapter/screen-renderer/help-roster.json "keys", count of U+FF0B -> 19 of 28
# the rest: docs/review/english-naming-survey-2026-10-15.md section 2.4 (regex beside each count)
```

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る。`JDG-1340`）: 英語の画面で (1) ヘッダーの「Open…」の名と、キーを持つツールチップのキーが `Ctrl+Shift+E` の形（全角の ＋ も空白も無い）で出ること、(2) タスクグループを消すと「Delete」／「Cancel」が出ること、(3) 文書の設定パネルの 2.2 の 19 行の名が語で出ること（Display Scale・Horizontal Zoom・Monochrome ほか）、(4) パレットの説明が道具の名で始まること。
- 見積り: 段 0〜3 で約 5.5〜8 h（8.2）。
