# CR-755 —— タイムゾーンの名は略称を持ち、目盛の段の左に略称を刷り、基準の変更は別の地域を選んだときだけ 3 つの答えで問う

> 起草の状態: **起草だけ —— 当てていない**（2026-10-15、作業木 `601aeec7` の上）。`docs/spec`・`docs/spec/_source`・`src`・`tests`・台帳には触れていない。仕様の差し替え・`npm run gen`・コード・試験は、調整役が体に手配する。
> ID の帯: 番号 `CR-755` だけを調整役から受けた。新しい行 ID は作らない（2 節）。変更履歴・`perf-pending`・裁定の番号は当てる体が調整役から受ける。`601aeec7` の木で `CR-755` を名乗るものは `change-request`・`docs/spec`・`src`・`tests` に 0 件（13 節）。
> 当てるもの: `JDG-2043`（目盛の段の左に略称）・`JDG-2048`（名に略称）・`JDG-2049`（夏時間が名で分かる）・`JDG-2056`（「UTC +9:00 JST 東京」、季節で変わる地域は両方を並べ、目盛の段にはその時点の 1 つ）・`JDG-2057`（項目名「本プロジェクトの基準タイムゾーン」と番号つきの「表示するタイムゾーン 1」…、2 択は別の地域を選んだときだけ結果の時刻つきで）・`JDG-2058` の後半（3 つ目の答え [キャンセル]）。台帳 `DFC-2515`・`DFC-2521`・`DFC-2522`・`DFC-2523`。
> 起こり: 利用者の 2026-10-15 の 11 件のうち 1・6・7・8（聞き取りの席が `bf75ab22` の出荷ビルドで再現した）。
> ⚠️ **`CR-751` が着地したものとして書いた。** `CR-751`（別のセッションが今まさに当てている）の X-10・X-11 は、表 T-376 の 28 の地域名を `Project.scheduleDataTimeZone` の JSON スキーマの `enum` にし、`viewTimeZone`・`displayTimeZones` を表 T-376 の地域名で型づける。本書は地域名の列（見出し「地域名」）と 28 の値を**変えない** —— 足す略称の列と見せる名は `enum` に入らない。`CR-751` が着地していないときに当てる体が確かめることは 12 節。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`601aeec7`）

| 主張（台帳の行） | 見たもの | 本書での扱い |
|---|---|---|
| `DFC-2515`: 時刻を表示しても、基準の時の段と表示するタイムゾーンの段の左の空欄に何も刷らない | 正しい。`src/adapter/svg-renderer/schedule-grid.ts:302` の `zoneRowsSvg` は段を `band.x`（タスクグループエリアの左端、`screen-regions.ts:192` の `taskGroupAreaX`）から右にしか描かない。`rulerSvg`（`:371`）も同じ。パネルの側（`task-group-panel-drawing.ts`）は頭の操作子（`HF-10`、`dom-screen-surface.ts:397` の `top:0`）と折りたたみ込んだ数（`HF-12`）だけを描く | X-1 で `FR-017` に刷る所を足す |
| `DFC-2515`: 仕様に名の欄の条項が無い（`FR-017`・`FR-156`・表 T-376）。`CR-710` の X-6 も書かない | 正しい。`FR-017` の該当の文（`01-04-requirements.md:5647`）は「その地域の時か 0 時の日付」を刷るだけ。`CR-710` に「略称」「`shortZoneName`」は 0 件 | 仕様の穴 |
| `DFC-2515`: 左の空欄の高さ（`bandHeight`）は `screen-regions.ts` と `task-group-panel-drawing.ts` に在る | ⚠️ **半分は偽。** `screen-regions.ts:180` には在る（`rulerBandHeightOf`）。`task-group-panel-drawing.ts` に `bandHeight` は 0 件 —— パネルは目盛の高さを知らず、`taskGroupsTopPx`（同ファイル、注「ScreenFrame carries no corner rectangle and no ruler height」）でタスクグループの上端から推している | 5 節: 段の箱（上端と高さ）と略称の字を、画面の値（`ScreenView`）に載せてパネルへ渡す継ぎ目が要る |
| `DFC-2515`: 見本 `46` は略称を左の欄に書いた | 正しい。`previous-project-result/46-minute-level-time-axis/index.html:216` の `shortZoneName`、`:452` で段ごとに「基準 PDT UTC-7」の形。略称を決める瞬間は `:450` の `mid`（見えている範囲の真ん中） | 11 節の問い 1 の推奨の根拠 |
| `DFC-2522`: 名は「(UTC+09:00) 東京」の形で、略称の列は表 T-376 にも辞書にも無い | 正しい。表 T-376 の列は 行 ID・地域名・標準時の UTC の差・夏時間 の 4 つ（`01-04-requirements.md:5819`〜）。辞書 `docs/spec/_source/display-words.json:5127` の `timeZones` は 28 行とも「(UTC±hh:mm) 地名」の 1 語 | X-3・X-4。⭐ 差は表と辞書の 2 か所に在った（`R1.3`）—— 本書で辞書から差を外す |
| `DFC-2522`: 季節で略称が変わる地域は 10 組（PST/PDT、CST/CDT、EST/EDT、AKST/AKDT、AST/ADT、CET/CEST、EET/EEST、GMT/BST、AEST/AEDT、NZST/NZDT） | ⚠️ **数え落とし。** 表 T-376 の夏時間「有」は 12 行（13 節の数え方）。IANA の略称（13 節の `zoneinfo`）で 2 つの字を持つのは 11 行 —— 山岳部（`ZN-6`、MST/MDT）が抜けている。残る 1 行のアゾレス（`ZN-12`）は IANA が字を持たない（`-01`／`+00`） | X-3 の表と 11 節の問い 4 |
| `DFC-2522`: ブラウザの `Intl` は ja や en-US で東京を「GMT+9」と返し JST を返さない | ⚠️ **半分は偽。** Node の `Intl`（13 節）は ja で東京を `JST` と返す。ただし ja はロサンゼルスを `GMT-7`、en-US は東京を `GMT+9`、インドはどちらでも `GMT+5:30` と返す —— **1 つの言語で 28 の略称が揃うことは無い** | 結論は同じ —— 略称は表 T-376 の列で持つ |
| `DFC-2523`: 夏時間は既に効いていて、名が言わないだけ | 正しい。`src/entity/document-model/schedule/time-zone.ts:58` の `zoneClockOf` が `Intl`（en-US）でその瞬間の差を読む。表 T-376 の `ZN-4`〜`ZN-9` は「有」 | 働きは変えない（X-3） |
| `DFC-2521`: 基準の欄は地域の選び・選び方の選び・例の 1 行・[基準を変える] を持ち、同じ地域では例の前後が同じ | 正しい。`src/adapter/screen-renderer/properties-panel.ts` の `baseChangeControls`（地域・選び方・`IC-161`）と `baseExampleLine`（`TX-11`）。選び方の初めは `keepGlobalTime`（`baseChangeDraftOf`） | X-5〜X-9 で欄を作り替える |
| （本書が見つけた）「ローカルタイムを保つ」は、見せる基準（`S-574`）が空でないと、選んだ地域を基準に見せない | `src/use-case/edit-document/edit-document-settings.ts` の `baseTimeZonesAfterChange` は `keepLocalTime` で日程データのタイムゾーンだけを付け替え、`viewTimeZone` を残す。前に「グローバルタイムを保つ」でシンガポールを基準にした文書で、東京を選んで「ローカルタイムを保つ」を当てると、基準の欄はシンガポールのまま、日時はシンガポールの時刻で見える | `JDG-2057` の項目名（本プロジェクトの基準タイムゾーン）の下では、どちらの答えでも選んだ地域が基準になる —— X-6（③ の X-f） |
| （本書が見つけた）設定の項目名の en | 辞書の区 `settings` の `K-144` の en は `viewTimeZone`、`K-145` は `displayTimeZones`（識別子そのまま）。同じ区の `K-142`・`K-143` は語（`Fix the fit span`）。規則 02 の 5 節は「設定の項目名の en（識別子そのもの）」を Title Case の検査の外に置く | 新しい名の en は 11 節の問い 3 |

### 0.2 裁定の鎖（`rulings.md` を「タイムゾーン」「略称」「時差」「UTC」「夏時間」「基準を変え」「グローバルタイム」「ローカルタイム」「`IC-161`」「`T-376`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1705` | 基準 1 つと表示するもの 0〜4 つ | 変えない —— 番号つきの行は 4 つまで（X-7） |
| `JDG-1711` | MSPDI を取り込んだ文書は PC の地域、通知とヘッダーで見せる | 変えない。通知とヘッダーの名は新しい形になる（同じ関数 `timeZoneLabelOf` を通る） |
| `JDG-1712` | 地域名（IANA）で持ち、「(UTC+09:00) 東京」の形で見せる。28 個 | **形の部分を `JDG-2056` が置き換えた**（「UTC +9:00 JST 東京」）。地域名で持つ・28 個・夏時間は地域の規則 —— は保つ |
| `JDG-1767` | 「瞬間を保つ」では伝わらない、語を考え直す | 本書もその続き |
| `JDG-1780` | 2 つの選び方を「グローバルタイム（UTC）を保つ」「ローカルタイムを保つ」で見せ、例の 1 行を出す | **一部を覆す**（`JDG-2057` が覆した —— `rulings.md` の状態は既に「覆された（一部。`JDG-2057`）」）。覆すのは、2 択を常に出すことと、語（換算する ／ 数字をそのまま に替える。③ の X-c）と、例の 1 行（各答えに結果の時刻を添える形に替える）。2 つの働き（`CM-95`・`CM-94`）は保つ |
| `JDG-1781` | データのタイムゾーンと見せる基準の 2 つ | 保つ。⚠️ 数字をそのまま は見せる基準を空に戻す（X-6）—— 2 つを分ける形は変えない |
| `JDG-1782`・`JDG-1783` | 時の段は 2 段、地域の段を足す。名の欄は採らなかった | 保つ。左の空欄に略称を刷るのは `JDG-2043` が足した |
| `JDG-1784` | 列名 `scheduleDataTimeZone`・`viewTimeZone`・`displayTimeZones` | 変えない（設定の鍵・列名は変えない） |
| `JDG-1977` | `IC-161` の説明（利用者の字）「選んだタイムゾーンを表示の基準にする。スケジュールの日時の値は書き換えない」 | **字は保ち、置き場を移す** —— `IC-161` を消す（X-9）ので、同じ字を 換算する の答えの説明にする（X-10）。覆さない |
| `JDG-1983` | 選んだだけでは当てず、例を見せ、`IC-161` を押して当てる | **入口の段だけを `JDG-2057`・`JDG-2058` が置き換えた** —— 当てるのは答え（換算する ／ 数字をそのまま）を押したとき。「読んでから当てる」は保つ（各答えが結果の時刻を持つ）。確認を取らない・取り消しで戻る も保つ |
| `JDG-1986`・`JDG-2038` | `RS-90` は時間で消える。次の一手は [基準を変える] を押すまでを言う（`CR-750`） | **`JDG-2038` の語は `IC-161` を消すので書き直す**（X-11）—— 「押す一手まで言う」という中身は保ち、押すものを [数字をそのまま] に替える |
| `JDG-2039` | 28 の地名を `enum` にする（`CR-751`） | 保つ。本書は地域名を変えない |
| `JDG-2043`・`JDG-2048`・`JDG-2049`・`JDG-2056`〜`JDG-2058` | 本書が当てる | — |

覆す裁定: `JDG-1780`（一部。`JDG-2057` が既に覆した）・`JDG-1712`（名の形の部分。`JDG-2056` が置き換えた）・`JDG-1983`（入口の段の部分）・`JDG-2038`（語の部分）。当てる体はそれぞれの状態の欄に「覆された（一部。`CR-755`）」を書く。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4`（`GL-006`）—— 分単位の日程で、目盛のどの段をどの地域の時計で読むかが段ごとに分かり（X-1）、選ぶ欄の名から夏時間の有無が分かり（X-3）、基準を変えるときは結果の時刻を読んでから答えられる（X-5）。
- `CH-1`（`GL-008`）—— 交換相手と時差の違う相手と日程を合わせるとき、基準の付け替え（数字をそのまま）が、選んだ地域を本当に基準にする（X-6）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 標準時の差が表 T-376 の列と辞書の `timeZones` の語の 2 か所に在った。本書は辞書を地名だけにし、差と略称は表だけが持つ（X-3・X-4）。名の形は辞書の 1 語 `zoneName` だけが持つ。
- `R2.22`（名は指すものを言う）—— `IC-161`（基準を変える）は押す相手が無くなるので消し、答えは辞書の語で名指す。状態機械の出来事 `baseChangeEntryPressed` は答えの押下を受け、運ぶ `chosenWay` の名は働き（`keepGlobalTime`・`keepLocalTime`）を言うので保つ（③ の X-d）。
- `R2.21`（関心の分離）—— どの略称を刷るか（その瞬間に夏時間か）は Entity の純粋な関数（名簿と同じ所）に置き、描き手は字を受けるだけ（5 節）。
- 表が正 —— 略称は表 T-376 の列、名の形は辞書、答えの語は辞書、欄の並びは表 T-369 が持ち、`FR-156` は表を指す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 名の差は標準時の差とし、時を 0 で埋めず分を 2 桁、0 は `±0:00` とする（「UTC +9:00」「UTC +5:30」「UTC ±0:00」）。符号は ASCII の `+`・`-` | `JDG-2056` の 2 つの例。表 T-376 の差の列が 0 を `±00:00` と書く | 今の「(UTC+09:00)」の形を引く字は無くなる（試験は辞書を読むので字を写していない —— 13 節） |
| X-b | 協定世界時（`ZN-13`）も同じ形にし、名は「UTC ±0:00 UTC 協定世界時」とする | 行ごとに形を変えない。略称の列は目盛の段にも要る | 「UTC」が 2 度並ぶ |
| X-c | 答えの語は 換算する ／ 数字をそのまま とし、「保つ」の語は使わない | `JDG-2057` の 2 つ目の答え（A）の択の文が「換算する: 4/1 8:00 → 4/1 17:00」「数字をそのまま: 4/1 8:00 → 4/1 8:00（東京）」。`JDG-2057` の読みが「`JDG-1780` の語を覆す（一部）」。利用者の問いは「保つって何？」（`DFC-2521`） | 語を替えるときは辞書の 1 か所 |
| X-d | 辞書の部の鍵 `keepGlobalTime`・`keepLocalTime` と、状態機械の運ぶ値の名は変えない —— 値（語）だけを替える | 鍵は働き（同じ瞬間を保つ ／ 時計の数字を保つ）を言い、語が替わっても指すものは同じ（`R2.22`）。名を変えると生成物・試験・コードの全部が動く | 鍵と画面の語が違って見える |
| X-e | 答えは押した時に当てる（[基準を変える] の段を置かない）。`IC-161` は表 T-109 から消し、番号は再び使わない | `JDG-2058` の「その 2 択の 3 つ目に [キャンセル]」—— 3 つが並ぶ答えであり、答えの後にもう 1 つ押す入口を置くと 4 つ目の押下になる。答えに結果の時刻が付くので「読んでから当てる」（`JDG-1983`）は保たれる。語だけの釦は表 T-109 に行を持たない先例が在る（`FO-11` の `fitSpanField` の `copyCurrent`） | アイコン 1 つ（図形・名簿・辞書の 1 行）が消える。`DFC-2517`（テーマ色の行の重なり）の `IC-161` の半分は、本書で行ごと消える |
| X-f | 数字をそのまま は、日程データのタイムゾーンを付け替え（`CM-94`）、見せる基準を空に戻す（`CM-95` で `null`）—— 2 つを 1 回の書き込みとし、取り消し 1 回で戻る | 項目名が「本プロジェクトの基準タイムゾーン」になり、選んだ地域が基準に見えないと名と食い違う（0.1 の最後から 2 つ目の行）。`field-entry.ts:226` の `baseChangeCommandsOf` は既に命令の並びを 1 回の書き込みとして返す | 見せる基準と日程データが違っていた文書では、数字をそのまま の前と後で画面の数字が変わる（保存の数字は変わらない）。結果の時刻がそれを見せる |
| X-g | 3 つの答えは、基準の選ぶ欄のすぐ下に、1 行に 1 つずつ出す。表示するタイムゾーンの行はその下 | 答えが結果の時刻を持つと 1 行に 3 つは収まらない（13 節の幅）。問いは選んだ欄のそばに出す | 答えが出ているあいだ、下の行が 3 行ぶん下がる |
| X-h | いまの見せる基準と同じ地域を選び直したときは、答えを出さない（下書きを捨てる）。答えが出ているあいだに別の地域を選び直したときは、答えの時刻をその地域で作り直す | 「別の地域を選んだときだけ」（`JDG-2057`）。同じ地域に戻すのは取りやめと同じ | — |
| X-i | 欄の読み取りの行（今の「(UTC+09:00) 東京」といまの基準を示す行）は消す | 選ぶ欄そのものが、答えていないあいだは今の基準を示す。同じ名が 2 度並ぶ | — |
| X-j | 表示するタイムゾーンは 4 行を常に出す（どれも「（なし）」を選べる） | `S-575` の上限 4。値を入れるたびに行が増えると、欄が上下に動く | 使わない行も 4 行ぶんの高さを取る |
| X-k | 基準の時の段の略称は、目盛が時の段（表 T-238 の `TM-5`）のときだけ、その 2 行目（時の行）の左に刷る。表示するタイムゾーンの段の略称は、その段があるあいだ（時刻を表示しているあいだ）いつも刷る —— 時の段でないときの日付の段にも刷る | `JDG-2043` は「時の段と表示するタイムゾーンの段」を名指した。時の段でない基準の段は日付を刷る段で、どの時計の 0 時かを言う要が無い。地域の段は時の段でないときもその地域の 0 時の日付を刷る（`FR-017`）ので、どの地域かが要る | 時の段でないとき、基準の略称は見えない |
| X-l | 略称は 目盛の字（`rulerFont`）と色（表 T-236 の `S-147`）で刷り、右端はパネルの右端から 表 T-206 の `S-313` 内側とする。パネルが字より狭いときは左を切る | 頭の操作子（`HF-10`）がパネルの右端から同じ距離に立つ —— 新しい値を作らない。最上部の段（操作子の段）には刷らないので重ならない | 狭いパネルで略称の頭が欠ける |
| X-m | 書き出す絵（`FR-025`）にも略称を刷る | 表 T-076 の `EP-2`（目盛を描く）と `EP-3`（パネルを描く）。どの時計の段かが読めない絵は、時刻を読めない | `image-exporter.ts` にも手が入る |
| X-n | 略称の無い行（11 節の問い 4 の推奨のとき 10 行）は、目盛の段の左に「UTC」とその瞬間の差（「UTC-3」「UTC±0」の形、分が 0 なら書かない）を刷る | 見本 `46` の `offsetText`（`:222`）の形。名に差が在るのと同じく、段にも何かを刷らないと、その段だけどの地域か読めない | — |

---

## 1. 範囲 —— 行き先

| 場面（画面で見ること） | 今（`601aeec7`） | 本書の後 |
|---|---|---|
| 文書の設定（`Document Settings`）でタイムゾーンの選ぶ欄を開く | 「(UTC-08:00) 太平洋時間（米国・カナダ）」—— 夏時間が有るかは名から分からない | 「UTC -8:00 PST/PDT 太平洋時間（米国・カナダ）」「UTC +9:00 JST 東京」（名は季節で変わらない） |
| 基準のタイムゾーンの欄 | 名「基準のタイムゾーン」。地域の選び・選び方の選び（グローバルタイム（UTC）を保つ ／ ローカルタイムを保つ）・例の 1 行・[基準を変える] が常に在る | 名「本プロジェクトの基準タイムゾーン」と 28 個の選び 1 つだけ。別の地域を選んだときだけ、その下に「換算する: 4/1 8:00 UTC → 4/1 17:00 JST」「数字をそのまま: 4/1 8:00 UTC → 4/1 8:00 JST」「キャンセル」が 1 行ずつ出て、押すと当たる（確認なし、`Ctrl+Z` 1 回で戻る） |
| 表示するタイムゾーンの欄 | 名「表示するタイムゾーン」の 1 項目に 4 つの選び | 「表示するタイムゾーン 1」〜「表示するタイムゾーン 4」の 4 行、それぞれ「（なし）」と 28 個 |
| 時刻を表示し、時の段まで拡大し、表示するタイムゾーンに東京を足す | 基準の時の段と東京の段の左（タスクグループパネルの上）は空欄 | 基準の時の段の左に「UTC」、東京の段の左に「JST」が右寄せで刷られる。太平洋時間を足すと、8 月なら「PDT」、1 月なら「PST」 |
| MS Project のファイルを置き換えて開き、知らせ（`RS-90`）を読む | 「…「ローカルタイムを保つ」を選んで [基準を変える] を押してください」 | 「…「本プロジェクトの基準タイムゾーン」でその地域を選び、[数字をそのまま] を押してください」 |
| 夏時間の働き・保存の値・MSPDI・`GRS JSON` の `enum` | — | 変わらない |

---

## 2. 新しい識別子

⛔ 新しい行 ID は作らない。消す行 ID は 1 つ（`IC-161`。番号は再び使わない）。

| 名 | 置き場 | 何か |
|---|---|---|
| 表 T-376 の列「標準時の略称」「夏時間の略称」 | `01-04-requirements.md` の 表 T-376 | 28 行の略称（X-3）。略称の無い升は `—` |
| `standardAbbreviation`・`daylightAbbreviation` | `tools/generate_time_zone_roster.py` が書く名簿（`src/entity/document-model/schedule/time-zone-roster.json`）の項 | 2 つの列の写し（無い升は `null`） |
| 辞書の区 `timeZoneField` の部 `zoneName` | `docs/spec/_source/display-words.json` | 名の形「UTC {offset} {abbreviations} {place}」（X-4） |
| 同じ区の部 `offsetName` | 同上 | 略称の無い行が目盛の段に刷る形「UTC{offset}」（X-1、X-n） |
| 同じ区の部 `baseChangeAnswer` | 同上 | 答えの 1 行「{way}: {before} → {after}」（X-10）。今の部 `example` に替わる |
| 同じ区の部 `cancelBaseChange`・`keepGlobalTimeHint`・`keepLocalTimeHint` | 同上 | 3 つ目の答えの語、2 つの答えの説明（X-10） |
| 出来事 `baseChangeCancelPressed` | `docs/spec/_source/state-machines.json` の領域 `screen`（表 T-280） | [キャンセル] を押した（X-8） |
| ガード `isOtherThanShownBase` | 同上 | 選んだ地域がいまの見せる基準と違う（X-8。ガードの名は `is`／`has`／`can` で始める —— 生成器の決まり） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-109 の `IC-161`（基準を変える）の行・`_assets/fig-icons.svg` の図形・辞書の区 `icons` の `IC-161`（label と hint） | 消す（X-9）。hint の字（`JDG-1977`）は `keepGlobalTimeHint` へ移す |
| 表 T-280 の出来事 `baseChangeWayChosen` と、`drafted` が運ぶ `chosenWay` | 消す（X-8）。`chosenWay` は `baseChangeEntryPressed` が運ぶ |
| 辞書の区 `timeZoneField` の部 `example`（「例: {name} {before} -> {after}」） | `baseChangeAnswer`（X-10） |
| 辞書の区 `timeZones` の 28 語の頭の「(UTC±hh:mm) 」「(UTC) 」 | 地名だけにする（X-4）。差は表 T-376 だけが持つ |
| `FR-156` の RATIONALE の「見せる名は…（例「(UTC+09:00) 東京」）」から「⛔ `IC-161` は確認を取らずに…」までの 2 択・例の 1 行・`IC-161` の段落 | X-5〜X-7 |
| 表 T-369 の `FO-14`・`FO-15` の「欄」と「名の語」の升 | X-7 |
| 表 T-375 の `TX-11` の升（`->` の形） | X-12 |
| 表 T-108 の `CM-94`・`CM-95` の説明の括弧の中の旧い語 | X-13 |
| 表 T-233 の `RS-90` の次の一手（`CR-750` の語） | X-11 |
| `src/adapter/screen-renderer/properties-panel.ts` の `BASE_CHANGE_ENTRY`・`CHOSEN_WAY_KEY`・`isBaseChangeIdle`・`baseExampleLine` と、欄の読み取りの行 | 5 節 |

---

## 4. 書き直す所

⭐ 4.1〜4.3 は 1 つの閉路（6 節: `FO-14`・`FO-15`・`FR-017`・`FR-156`・`IC-161`・`RS-90`・`S-574`・`S-575`・`TX-11`）に入る —— **1 つの体が 1 度に書く**。

### 4.1 `FR-017`

#### X-1 —— 「表示するタイムゾーン（`FR-156`）は、時刻を表示しているあいだ、…」の文と「⭐ 帯の高さを変えるのは…」の文のあいだに足す

```
時刻を表示しているあいだ、見せる基準の時の行（表 T-238 の `TM-5` の 2 行目。目盛が時の段のときだけ）と、表示するタイムゾーンの各段について、その段の左の、タスクグループパネルの上の空欄に、その地域の略称を右寄せで刷ること（MUST） —— どの段をどの地域の時計で読むかが、段ごとに読める（利用者の判断）。
略称は `FR-156` の 表 T-376 の列から、その瞬間に効いている側（その瞬間の UTC の差が標準時の差と同じなら標準時の略称、違えば夏時間の略称）の 1 つとし、瞬間は〈11 節の問い 1 の答え。推奨: 目盛の帯の見えている範囲の真ん中〉とすること（MUST）（利用者の判断）。
略称を持たない行は、`FR-038` の辞書の `timeZoneField` の `offsetName` の形で、その瞬間の UTC の差を刷る（例 `UTC-3`）。
字は目盛のラベルと同じ大きさと色とし、右端はタスクグループパネルの右端から `_assets/tbl-settings.md` の 表 T-206 の `S-313` 内側とする。
⚠️ パネルの最上部の段には頭の操作子（表 T-051 の `HF-10`）が在る —— 略称を刷る段は 2 段目より下なので重ならない。
書き出す絵（`FR-025`）にも刷る（`05-07-design.md` の 表 T-076 の `EP-2`・`EP-3`）。
```

### 4.2 `FR-156` と 表 T-376

#### X-2 —— `FR-156` の STATEMENT の 2 文目

旧:

```
作成者が文書の設定の面で基準を変えたときは、選んだ選び方に従って、見せる基準だけを変えるか、日程データのタイムゾーンを付け替えること。
```

新:

```
作成者が文書の設定の面で基準に別の地域を選び、答えを押したときは、その答えに従って、見せる基準だけを変えるか、日程データのタイムゾーンを付け替えて見せる基準を日程データのタイムゾーンへ戻すこと。
```

#### X-3 —— 表 T-376 に 2 列を足す（「夏時間」の右。行・地域名・差・夏時間の升は変えない）

| 行 ID | 地域名 | 標準時の略称 | 夏時間の略称 | 本書の見立て（表には書かない） |
|---|---|---|---|---|
| ZN-1 | `Etc/GMT+12` | — | — | ⚑ 広く使われる字が無い（IANA も `-12`） |
| ZN-2 | `Pacific/Pago_Pago` | SST | — | IANA と同じ |
| ZN-3 | `Pacific/Honolulu` | HST | — | 同 |
| ZN-4 | `America/Anchorage` | AKST | AKDT | 同 |
| ZN-5 | `America/Los_Angeles` | PST | PDT | 同 |
| ZN-6 | `America/Denver` | MST | MDT | 同（`DFC-2522` の 10 組から抜けていた） |
| ZN-7 | `America/Chicago` | CST | CDT | 同 |
| ZN-8 | `America/New_York` | EST | EDT | 同 |
| ZN-9 | `America/Halifax` | AST | ADT | 同 |
| ZN-10 | `America/Sao_Paulo` | — | — | ⚑ IANA は `-03`。英語圏では BRT も使う |
| ZN-11 | `Atlantic/South_Georgia` | — | — | ⚑ IANA は `-02`。GST はドバイの字と同じ |
| ZN-12 | `Atlantic/Azores` | — | — | ⚑ IANA は `-01`／`+00`。夏時間「有」で字を持たない唯一の行（AZOT/AZOST も使われる） |
| ZN-13 | `UTC` | UTC | — | IANA と同じ |
| ZN-14 | `Europe/London` | GMT | BST | 同 |
| ZN-15 | `Europe/Berlin` | CET | CEST | 同 |
| ZN-16 | `Europe/Helsinki` | EET | EEST | 同 |
| ZN-17 | `Europe/Moscow` | MSK | — | 同 |
| ZN-18 | `Asia/Dubai` | — | — | ⚑ IANA は `+04`。英語圏では GST も使う |
| ZN-19 | `Asia/Karachi` | PKT | — | IANA と同じ |
| ZN-20 | `Asia/Kolkata` | IST | — | 同 |
| ZN-21 | `Asia/Dhaka` | — | — | ⚑ IANA は `+06`。BST（バングラデシュ）はロンドンの夏の字と同じ |
| ZN-22 | `Asia/Bangkok` | — | — | ⚑ IANA は `+07`。英語圏では ICT も使う |
| ZN-23 | `Asia/Singapore` | — | — | ⚑ IANA は `+08`。SGT も使うが、名は北京も言い、北京の CST は `ZN-7` の字と同じ |
| ZN-24 | `Asia/Tokyo` | JST | — | IANA と同じ |
| ZN-25 | `Australia/Sydney` | AEST | AEDT | 同 |
| ZN-26 | `Pacific/Noumea` | — | — | ⚑ IANA は `+11`（NCT はまれ） |
| ZN-27 | `Pacific/Auckland` | NZST | NZDT | IANA と同じ |
| ZN-28 | `Pacific/Tongatapu` | — | — | ⚑ IANA は `+13`（TOT はまれ） |

⭐ 上は 11 節の問い 4 の択 A（推奨。IANA の時刻の地域の名簿が字を持つ 18 行だけに字を置く）の形。択 B なら ⚑ のうち `ZN-10` BRT・`ZN-18` GST・`ZN-22` ICT・`ZN-23` SGT・`ZN-12` AZOT/AZOST を足す。28 行の内訳: 字あり 18（うち夏時間の字も持つ 11）・字なし 10（13 節の数え方）。

表の下の注に足す:

```
略称は、その地域の時刻の名として広く使われる字だけを置く —— 地域名（IANA）の時刻の名簿が字を持たない行は `—` とし、字を作らない（利用者の判断）。
夏時間の略称は、夏時間が「有」の行だけが持つ。
⚠️ 略称は見せる名と目盛の段の字であり、保存しない —— 文書が持つのは地域名だけである（`GRS JSON` の地域名の選択肢も地域名の列だけから作る）。
```

#### X-4 —— `FR-156` の RATIONALE の「見せる名は `FR-038` の辞書の `timeZones` が 表 T-376 の行ごとに持つ（例「(UTC+09:00) 東京」）。」を置き換える

```
見せる名は、表 T-376 の標準時の差と略称と、`FR-038` の辞書の `timeZones` が行ごとに持つ地名とを、辞書の `timeZoneField` の `zoneName` の形でつないだものとすること（MUST）（利用者の判断） —— 例「UTC +9:00 JST 東京」「UTC -8:00 PST/PDT 太平洋時間（米国・カナダ）」。
差は時を 0 で埋めず分を 2 桁とし、0 は `±0:00` と書く。
夏時間の略称を持つ行は、標準時の略称と `/` でつないで 2 つを並べる。
略称を持たない行は、略称の部を詰める（例「UTC -3:00 サンパウロ」）。
⭐ 名は季節で変わらない —— 夏時間が有ることを名が見せ、働き（地域の規則で自動に効く）は変えない（利用者の判断）。
```

#### X-5 —— 同じ RATIONALE の「基準を変える 2 つの選び方を、次の語で示し、…」から「⛔ `IC-161` は確認を取らずに当て、…（利用者の判断）。」までを置き換える

```
基準の欄は、表 T-104 の `K-144` の名で表 T-376 の 28 個を選ぶ欄を 1 つ置く。
⭐ その欄で、いまの見せる基準と違う地域を選んだときだけ、欄のすぐ下に次の 3 つの答えを 1 行に 1 つずつ出すこと（MUST）（利用者の判断）:

- 換算する —— 見せる基準（`S-574`）を選んだ地域にし、保存の数字は変えない（同じ瞬間を新しい地域の時刻で見せる。暦は日程データのタイムゾーンのまま瞬間について行く）。
- 数字をそのまま —— 日程データのタイムゾーン（`AT-157`）を選んだ地域に付け替え、見せる基準を `null`（日程データのタイムゾーンと同じ）に戻す。保存の数字は変えない（瞬間は動き、暦は新しい地域の数字で読む）。
- キャンセル —— 選んだ地域を取り消し、基準を変えない。

語は `FR-038` の辞書の `timeZoneField` の `keepGlobalTime`・`keepLocalTime`・`cancelBaseChange` が持つ。
換算する と 数字をそのまま には、その答えで当てた結果の時刻を、辞書の `baseChangeAnswer` の形で添えること（MUST） —— 開始を持つ最初のタスク（文書の `Task` の並びの順）の開始の日時を、いまの見せる基準で見せた字と、その答えで当てた後の見せる基準で見せた字とを、表 T-375 の `TX-11` の形でつなぐ（例「換算する: 4/1 8:00 UTC → 4/1 17:00 JST」）。
開始を持つタスクが無いときは、答えの語だけを出す。
⭐ 地域を選んだだけでは当てず、答えを押したときに当てること（MUST） —— 結果の時刻を読んでから当てる（利用者の判断）。
選んだ地域は、答えるまで画面の値（`_assets/tbl-state-machines.md` の 表 T-280 の `baseTimeZoneDraftStateMachine`）が持つ。
⛔ 答えは確認を取らずに当て、取り消し 1 回で戻せること（MUST）（`FR-031` の 表 T-027 の `UN-13`） —— 数字をそのまま の 2 つの書き換えも 1 回の書き込みとする。
確認を取るのは、データを大幅に書き換えるタイムシフト（`FR-157`）だけである（利用者の判断）。
```

#### X-6 —— 同じ RATIONALE の「表示するタイムゾーン（`S-575`）は 0 〜 4 つとし、…」の文の後に足す

```
表示するタイムゾーンの欄は、基準の欄の下に、`K-145` の名に番号（1 〜 4）を添えた選ぶ欄を 1 行に 1 つずつ 4 行置き、どれも「なし」を選べる（利用者の判断）。
```

### 4.3 `FR-072` の 表 T-369 と 表 T-104

#### X-7 —— `FO-14`・`FO-15`

| 行 ID | 欄 | 名の語 | 規則 |
| --- | --- | --- | --- |
| FO-14 | 本プロジェクトの基準タイムゾーン（28 個の選ぶ欄。いまの見せる基準と違う地域を選んだときだけ、その下に 3 つの答え） | 表 T-104 の `K-144`（答えの語は辞書の `timeZoneField` の `keepGlobalTime`・`keepLocalTime`・`cancelBaseChange`） | `FR-156` |
| FO-15 | 表示するタイムゾーン 1 〜 4（選ぶ欄を 1 行に 1 つずつ 4 行。どれも「なし」を選べる） | 表 T-104 の `K-145` に番号を添える | `FR-156` |

表 T-104 の `K-144` の「日本語」の升と、辞書の区 `settings` の `K-144` の ja: 「基準のタイムゾーン」 → 「本プロジェクトの基準タイムゾーン」。en は 11 節の問い 3 の答えに従う（推奨のとき `K-144` は `Project Base Time Zone`、`K-145` は `Display Time Zone`）。

### 4.4 表 T-280（`state-machines.json` の領域 `screen`）

#### X-8 —— `baseTimeZoneDraftStateMachine` を作り替える（`CR-742` の X-13 の形を引き継ぐ）

| 状態 | 初め | 運ぶもの | 根拠 |
|---|:--:|---|---|
| `untouched` | ○ | — | `FO-14`・`FR-156` |
| `drafted` | | `chosenRegion`（表 T-376 の地域名。いまの見せる基準と違う） —— ⚠️ `chosenWay` は運ばない | `FR-156`・`FO-14` |

| 出来事 | 出どころ | 運ぶもの | `untouched` | `drafted` |
|---|---|---|---|---|
| `baseTimeZoneChosen` | 入力（`FO-14` の選ぶ欄で地域を選んだ）・`FR-156` | `chosenRegion` | → `drafted` [`isOtherThanShownBase`]、それ以外 → — | → 自己（`chosenRegion` を書き換える）[`isOtherThanShownBase`]、それ以外 → `untouched`（X-h） |
| `baseChangeEntryPressed` | 入力（`FO-14` の答え 換算する ／ 数字をそのまま を押した）・`FR-156` —— ⚠️ `IC-161` を外す | `chosenWay`（`keepGlobalTime` ／ `keepLocalTime`） | — | → `untouched` / `issueBaseChangeCommand`（`keepGlobalTime` は `CM-95` を、`keepLocalTime` は `CM-94` と `CM-95`（`null`）を、1 回の書き込みで出す。確認を取らない） |
| `baseChangeCancelPressed`（新） | 入力（`FO-14` の答え キャンセル を押した）・`FR-156` | — | — | → `untouched` |
| `surfaceCloseAsked` ほか、文書の設定を離れる 7 つと `documentReplacedByOpenOrNew` | 既にある出来事 | — | — | 変えない（`isLeavingDocumentSettings` のまま） |

⛔ `baseChangeWayChosen` を消す（出どころも、運ぶ値 `chosenWay` の状態の升も）。
⭐ `isOtherThanShownBase` の「いまの見せる基準」は `S-574`、空なら `AT-157`（今の `FR-156` と同じ読み）。

`npm run gen` が `_assets/tbl-state-machines.md`（表 T-280）と `src/use-case/advance-screen-session/screen-values.ts` の生成の区画を作り直す（手で直さない）。

### 4.5 表 T-109（アイコンの全数）

#### X-9 —— `IC-161` の行を消す

`_assets/tbl-glossary.md` の 表 T-109 の `IC-161` の行、`_assets/fig-icons.svg` の `IC-161` の図形、辞書の区 `icons` の `IC-161`、`docs/spec/_source/published-entries.json` の `baseChangeCommandOf` の注の「表 T-109 の `IC-161`」（→「表 T-369 の `FO-14` の答え」）。⛔ 番号 `IC-161` は再び使わない。生成物（`icon-roster.json`・`icon-glyphs.json`・`help-roster.json` ほか）は `npm run gen` が作り直す。

### 4.6 辞書（`FR-038`）

#### X-10 —— 区 `timeZoneField`

| 部 | ja | en | 旧 |
|---|---|---|---|
| `keepGlobalTime` | 換算する | Convert | グローバルタイム（UTC）を保つ ／ Keep Global Time (UTC) |
| `keepLocalTime` | 数字をそのまま | Keep the Numbers | ローカルタイムを保つ ／ Keep Local Time |
| `cancelBaseChange`（新） | キャンセル | Cancel | — |
| `baseChangeAnswer`（新。`example` に替わる） | {way}: {before} → {after} | {way}: {before} → {after} | 例: {name} {before} -> {after} |
| `keepGlobalTimeHint`（新。`JDG-1977` の字を `IC-161` の hint から移す） | 選んだタイムゾーンを表示の基準にする。スケジュールの日時の値は書き換えない | Use the chosen time zone as the base for display. The schedule date-time values are not rewritten | — |
| `keepLocalTimeHint`（新） | 選んだタイムゾーンを、スケジュールの日時の数字が指す地域にする。数字は書き換えず、瞬間が動く | Make the chosen time zone the region the schedule date-time numbers are read in. The numbers are not rewritten, so the instants move | — |
| `zoneName`（新） | UTC {offset} {abbreviations} {place} | UTC {offset} {abbreviations} {place} | — |
| `offsetName`（新） | UTC{offset} | UTC{offset} | — |

⚠️ `{abbreviations}` が空のときは前の空白ごと詰める（X-4）。`→` は区の `shiftExampleLine` と同じ字（`JDG-2057` の利用者の例も `→`）。

区 `timeZones` の 28 語は地名だけにする（ja ／ en、例: `ZN-24` 東京 ／ Tokyo、`ZN-13` 協定世界時 ／ Coordinated Universal Time、`ZN-5` 太平洋時間（米国・カナダ） ／ Pacific Time (US and Canada)）—— 今の語から頭の「(UTC±hh:mm) 」「(UTC) 」を外すだけで、地名の字は変えない。`tools/generate_display_words.py:158` の注（「the table holds the region name and the offset, and the name a person reads is the dictionary's」）を「the table holds the offset and the abbreviations, the dictionary the place」に直す。

#### X-11 —— 区 `reasons` の `RS-90` の `nextStep`（`CR-750` の語）

| | 新 |
|---|---|
| ja | この PC の地域が一覧に無いときは、UTC の差が同じ一覧の地域に寄せています。別の地域で読みたいときは、文書の設定の「本プロジェクトの基準タイムゾーン」でその地域を選び、[数字をそのまま] を押してください |
| en | If this PC's region is not in the list, the listed region with the same UTC offset was used. To read the dates in another region, pick it as the Project Base Time Zone in Document Settings, then press Keep the Numbers |

⚠️ en の項目名は 11 節の問い 3 の答えに従う（択 B のときは `viewTimeZone`）。

### 4.7 表 T-375 と 表 T-108

#### X-12 —— 表 T-375 の `TX-11`

```
| TX-11 | 基準を変える答え（換算する ／ 数字をそのまま）に添える結果の時刻（`FR-156`、`FR-072` の 表 T-369 の `FO-14`）。<br>⭐ 時刻を表示しないときも時刻を添える —— 基準の変更が動かすのは時刻である。<br>前と後の字には、それを読む地域の略称（`FR-156` の 表 T-376。その瞬間の 1 つ、略称を持たない行は `offsetName` の形）を添える | `4/1 8:00 UTC → 4/1 17:00 JST` | `4/1 8:00 UTC → 4/1 17:00 JST` | — |
```

⚠️ 「前と後の字には…」の文と例の `UTC`・`JST` は 11 節の問い 2 の答えで変わる（推奨のままなら上のとおり）。

#### X-13 —— 表 T-108 の説明の括弧

- `CM-94`: 「日程データのタイムゾーンを付け替える（数字をそのまま —— 保存の数字は変えない。見せる基準を戻す `CM-95` と 1 回の書き込みにする）」
- `CM-95`: 「見せる基準を変える（換算する）」

### 4.8 生成器

`tools/generate_time_zone_roster.py` は 2 つの列を見出し（「標準時の略称」「夏時間の略称」）で読み、名簿の項 `standardAbbreviation`・`daylightAbbreviation`（`—` は `null`）を書く。断る: 字が `^[A-Z]{2,5}$` でない・夏時間「—」の行が夏時間の略称を持つ・28 行で同じ字が 2 つの行に在る。⭐ 地域名の列の読み（見出し「地域名」）は変えない —— `CR-751` の `enum` の生成もこの見出しで読む。

---

## 5. 継ぎ目（コード）と試験 —— 当てる体への見込み

持ち場はファイルで分ける。A を先に当て、B と C は並べて走れる。

| 持ち場 | 仕様の行 | `src`（`601aeec7` の場所） | 中身 |
|---|---|---|---|
| A 名簿と名（Entity ／ Adapter） | 表 T-376・`FR-156`・`zoneName`・`offsetName` | `tools/generate_time_zone_roster.py`（`build()`）・生成の `time-zone-roster.json`・`src/entity/document-model/schedule/time-zone.ts`（`TIME_ZONE_ROWS` の型に 2 項。その瞬間の略称を答える純粋な関数を足す —— その瞬間の差（`zoneClockOf`、`:58`）が標準時の差と違えば夏時間の字、字が無ければ `offsetName`）・`src/adapter/screen-renderer/notices.ts:38` の `timeZoneLabelOf`（名を `zoneName` で組む。通知・ヘッダー・選ぶ欄が同じ関数を通る） | ⚠️ `time-zone.ts` は `CR-751` の持ち場 —— 着地してから当てる（12 節） |
| B 目盛の段の略称（Entity ／ Adapter ／ Framework） | `FR-017`（X-1）・`EP-2`・`EP-3`・`S-313` | `src/adapter/svg-renderer/schedule-grid.ts:302` の `zoneRowsSvg` と `:371` の `rulerSvg`（段の箱は既に求めている —— 基準の時の行と各地域の段の上端・高さ・略称の字を返す純粋な関数に切り出す）・`src/entity/layout-engine/screen-regions/screen-regions.ts:152`〜`:163`（`rulerZoneRowsOf`・`rulerZoneRowHeightOf`）・`src/adapter/screen-renderer/task-group-panel.ts`／`screen-frame.ts`（`ScreenView.taskGroupPanel` に略称の行を載せる —— いまパネルは目盛の高さを知らない、0.1）・`src/framework/dom-screen-surface/task-group-panel-drawing.ts`（描く）・`src/adapter/image-exporter/image-exporter.ts`（書き出す絵） | 見えている範囲の真ん中（問い 1 の推奨）の瞬間は、`rulerAxisOf`（`schedule-grid.ts:152`）の軸から求める |
| C 基準の欄と答え（Adapter ／ UseCase ／ Framework） | `FO-14`・`FO-15`・`TX-11`・表 T-280・`CM-94`・`CM-95`・`RS-90` | `src/adapter/screen-renderer/properties-panel.ts:1430`〜`:1590`（`baseChangeControls`・`baseExampleLine`・`isBaseChangeIdle`・`baseTimeZoneField`・`displayTimeZonesField` —— 答え 3 行、読み取りの行を消す、表示の 4 行に番号、`IC-161` を外す。`IN_FIELD_ENTRIES`（`:142`）にも `IC-161` が在れば外す）・`src/adapter/input-command-translator/field-commit.ts`（鍵 `baseTimeZoneDraft` の列を `chosenRegion`・`keepGlobalTime`・`keepLocalTime`・`cancel` に）・`screen-state-input.ts:344` の `baseTimeZoneDraftEventOf`・`src/use-case/edit-document/edit-document-settings.ts:561` の `baseTimeZonesAfterChange`（`keepLocalTime` で `viewTimeZone` を `null`）と `baseChangeCommandOf`（命令の並びを返す）・`src/framework/single-html-shell/field-entry.ts:226` の `baseChangeCommandsOf`（2 つの命令を 1 回の書き込みに） | 生成の `screen-values.ts`（X-8）を読む |

- 検査 60（関数の大きさ）: `baseTimeZoneField` 周りは答えの 3 行で太る —— 規則 07 の `R2` で割る。基準を上げない。
- 毎フレームの経路: 目盛は毎フレーム描く。段ごとに略称を求めるので、`zoneClockOf` の `Intl.DateTimeFormat` を毎フレーム作らないこと（地域ごとに作り置く）。B の体は `perf-pending` に 1 行足す（番号は調整役）。
- 古い振る舞いを縛る試験（`601aeec7`、13 節の `git grep`）: `tests/contract/cr-750-rs-90-ends-on-the-change-base-time-zone-entry.contract.test.ts`（`RS-90` の次の一手が `IC-161` の語で終わる —— 本書で偽になる。`CR-750` の試験を、押すものが辞書の `keepLocalTime` の語で終わる形に書き直す）・`tests/contract/t-233-reason-words-tell-the-row.contract.test.ts`（`RS-90` の指紋を記録し直す）・`tests/contract/state-machine-screen-values.contract.test.ts`（`baseChangeWayChosen`）・`tests/contract/display-words.contract.test.ts`（区 `timeZones`・`timeZoneField` の部の数）。
- 仕様だけを読む試験の体への手引き（7 項）:
  1. 28 の名が `zoneName` の形で、`ZN-5` は「UTC -8:00 PST/PDT 太平洋時間（米国・カナダ）」、`ZN-24` は「UTC +9:00 JST 東京」、`ZN-13` は「UTC ±0:00 UTC 協定世界時」、`ZN-20` は「UTC +5:30 IST インド」、字の無い行は略称の部が詰まる（表 T-376・X-4）。
  2. 名は季節で変わらない（1 月と 8 月で同じ名）。
  3. 目盛の段の略称: 時刻を表示し時の段まで拡大し、表示するタイムゾーンに `America/Los_Angeles` を足すと、8 月の範囲で `PDT`、1 月の範囲で `PST`、基準（UTC）の時の行に `UTC`。字の無い行（例 `America/Sao_Paulo`）は `UTC-3`。時の段でないとき基準の行には刷らず、地域の段には刷る（X-1・X-k・X-n）。書き出した SVG にも在る。
  4. 基準の欄: 同じ地域を選んでも答えは出ない。別の地域を選ぶと 3 つの答えが出て、文書は変わらない（`FR-156`・表 T-280）。
  5. 換算する を押すと `S-574` だけが変わり、取り消し 1 回で戻る。数字をそのまま を押すと `AT-157` が変わり `S-574` が `null` になり、取り消し 1 回で両方戻る。キャンセル と文書の設定を離れることでは何も書かない（X-5・X-8）。
  6. 答えの時刻: 基準 UTC・最初のタスクの開始 4/1 8:00 で東京を選ぶと、換算する の行は `4/1 8:00 UTC → 4/1 17:00 JST`、数字をそのまま の行は `4/1 8:00 UTC → 4/1 8:00 JST`（`TX-11`。問い 2 の推奨のとき）。開始を持つタスクが無いと語だけ。
  7. `RS-90` の次の一手が [数字をそのまま] を押すまでを言う（X-11）。

---

## 6. グラフ（`impact.py`・`induced.py`、`601aeec7`）

`impact.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90` の答え:

| 種 | 指している箇所 |
|---|---|
| `FR-017` | 要求 13 件・38 か所（`FR-009`・`FR-016`・`FR-103`・`FR-158`・`FR-156`・`FR-054`・`FR-089`・`FR-018`・`FR-055`・`FR-025`・`FR-092`・`FR-038`・`FR-039`）。塊「設定値の相互依存」（`fontScale` → `rulerFont` → `rulerHeight` → 目盛の段階）に触れる |
| `FR-156` | 要求 7 件・26 か所（`FR-072`・`FR-031`・`FR-017`・`FR-158`・`FR-157`・`FR-054`・`FR-095`） |
| 表 T-376 | 要求 2 件（`FR-156`・`FR-095`）、2 次 11 件、要求の外 4 か所（5.3 節 2・`fig-erd-detail.md` の 4 節 1・`tbl-settings.md` の 4 節 2・画面の値の出来事 1 —— 計 6 の参照） |
| `FO-14` ／ `FO-15` ／ `TX-11` | 要求 2 件・6 か所 ／ 1 件・2 か所 ／ 1 件・1 か所 |
| `IC-161` | 要求 2 件・7 か所（`FR-072`・`FR-156` 2・`tbl-published-entries.md` 1・`tbl-state-machines.md` 3） |
| `K-144` ／ `K-145` ／ `S-574` ／ `S-575` | 1 件・1 か所 ／ 1 件・1 か所 ／ 1 件・4 か所 ／ 1 件・1 か所 |
| `CM-94` ／ `CM-95` ／ `RS-90` | 0 件・2 か所 ／ 0 件・2 か所 ／ 1 件・3 か所 |

`induced.py` に上の 14 と `T-369`・`T-375`・`HF-10`・`EP-2`・`EP-3` を足した 19 の種: 種 19 のうち 19 が解決、種の中の辺 30、**閉路 1 つ（大きさ 9: `FO-14` `FO-15` `FR-017` `FR-156` `IC-161` `RS-90` `S-574` `S-575` `TX-11`）** —— 1 つの計画で 1 度に書く（4 節の頭）。`IC-161` は行ごと消えるので、当てた後の閉路は 8 の見込み（当てる体が測る）。

足す辺: `FR-017` → 表 T-376・`S-313`・`HF-10`・`EP-2`・`EP-3`（X-1）。消す辺: `FR-156` → `IC-161`、表 T-369 → `IC-161`、表 T-280 → `IC-161`。⛔ `FR-095`（新しく作る文書の `BK-4` が表 T-376 を指す）は地域名の列だけを読むので変わらない。

---

## 7. 数（見込み —— 当てる体が測り直す）

- 要求 ±0、表 ±0、表の行 −1（表 T-109 の `IC-161`）。表 T-376 は列 +2（行 ±0、升 +56）。表 T-369 ・表 T-375・表 T-104・表 T-108 は升の書き換えだけ。
- 図 −1 の図形（`fig-icons.svg` の `IC-161`。図そのものの数は ±0）。uid ±0。
- 状態機械 ±0、出来事 ±0（−`baseChangeWayChosen` ＋`baseChangeCancelPressed`）、ガード ＋1（`isOtherThanShownBase`）。
- 辞書: 区 `timeZoneField` の部 ＋5（`cancelBaseChange`・`baseChangeAnswer`・`keepGlobalTimeHint`・`keepLocalTimeHint`・`zoneName`・`offsetName` の 6 を足し、`example` を消す）。区 `icons` −1。区 `timeZones` は 28 語の書き換え。区 `reasons` は `RS-90` の `nextStep` の書き換え。
- `（MUST）`: 旧の段落（X-5 が置き換える範囲）の `（MUST）` 4 つに対し、新は 7 つ（X-1 に 2、X-4 に 1、X-5 に 4）—— ＋3 の見込み（`FR-156` の X-6 は MUST を持たない）。`（MUST NOT）` ±0。当てる体は `git diff -U0 <base> -- docs/spec | grep -c "（MUST）"` で数え直す。

---

## 8. 台帳（当てるとき）

| 台帳 | 動かすもの |
|---|---|
| `defects.md` | `DFC-2515`・`DFC-2521`・`DFC-2522`・`DFC-2523` を、仕様を当てたら `実装待ち`、`src` を当てたら `実測待ち`（利用者の手順は 12 節）。`DFC-2522` の 10 組に `ZN-6`（MST/MDT）が抜けていたことを 1 行。`DFC-2515` の「`task-group-panel-drawing.ts` の `bandHeight`」は偽だったことを 1 行（0.1）。`DFC-2517` に「`IC-161` は `CR-755` が行ごと消す」を 1 行 |
| `rulings.md` | `JDG-2043`・`JDG-2048`・`JDG-2049`・`JDG-2056`・`JDG-2057`・`JDG-2058`（後半）を `適用済`（着地は X-1・X-3〜X-8・X-10）。`JDG-1712`・`JDG-1983`・`JDG-2038` の状態に「覆された（一部。`CR-755`）」。`JDG-1977` の着地を `keepGlobalTimeHint` へ。11 節の答えの行（番号は調整役） |
| `changelog.md` | 1 行（番号は調整役） |
| `perf-pending.md` | B の体が 1 行（5 節） |

---

## 9. 見積もり

| 持ち場 | 時間 | 中身 |
|---|---|---|
| 仕様（`_source` と 2 つの要求の書・`tbl-glossary.md`・`fig-icons.svg`） | 3 h | X-1〜X-13 を 1 体が 1 度に（閉路 9）、`npm run gen`、`strictdoc export`（一時フォルダへ） |
| `src` A 名簿と名 | 1.5 h | 生成器の 2 列・名簿の型・略称の関数・`timeZoneLabelOf` |
| `src` B 目盛の段の略称 | 3 h | 段の箱と字の純粋な関数・パネルへの継ぎ目・描き手・書き出す絵・`Intl` の作り置き |
| `src` C 基準の欄と答え | 3 h | 欄の作り替え・翻訳・状態機械・2 つの命令を 1 回の書き込みに・`IC-161` を外す |
| 試験（仕様だけを読む体） | 3 h | 5 節の 7 項と、古い試験 4 本の手当て |
| 利用者の実物の確かめ | 0.5 h | 12 節の手順 |
| 計 | 14 h | ⚠️ 台帳の見積もり（`DFC-2515` 4 h・`DFC-2521` 2 h・`DFC-2522` 3 h、計 9 h）は、`IC-161` を消すこと・数字をそのまま の 2 つの書き換え（X-f）・段の箱をパネルへ渡す継ぎ目（0.1）・書き出す絵を含まない |

波の順: ① 仕様（1 体）→ ② `src` A（`CR-751` の `time-zone.ts` が着地してから）→ ③ `src` B と C を並べて（B は `schedule-grid.ts`・`screen-regions.ts`・パネル・書き出し、C は設定の面・翻訳・UseCase・殻 —— ファイルが重ならない）→ ④ 仕様だけを読む試験の体 → ⑤ 調整役が実物の手順を利用者へ（利用者の試しは全部の欠陥を直した後の 1 回にまとめる決まりに従う）。

⚠️ **`CR-754` との関係**: `CR-754`（並べて起草中）は文書の設定のパネルの既定の幅 `S-171` を、いちばん広い選ぶ欄に合わせて測り直す。本書は選ぶ欄の名を長くする —— いちばん広い名は ja「(UTC+01:00) 中央ヨーロッパ（ベルリン・パリ）」の 44 から「UTC +1:00 CET/CEST 中央ヨーロッパ（ベルリン・パリ）」の 51 へ、en は 42 から 49 へ（東アジアの全角を 2 と数えた字の幅、13 節）。答えの 1 行（「数字をそのまま: 10/28 10:00 UTC → 10/28 10:00 JST」）も幅を取る。**`CR-754` の測り直しは本書の名と答えの行で行うこと** —— 先に `CR-754` を当てるなら、本書を当てた後にもう 1 度測る。

---

## 10. この変更でやらないこと・残したもの

- 夏時間の働き（地域の規則で自動に効く）と、28 の地域名・`enum`（`CR-751`）—— 変えない。
- 見本 `46` の「基準 PDT UTC-7」のように、段に略称と差の両方を刷ること —— `JDG-2043` は略称だけを求めた。
- 時刻を表示していないときの目盛に略称を刷ること —— 地域の段が無く、基準の段は日を刷るだけ。
- `K-146`（時刻を表示する）ほか、項目名の en が識別子のままの設定（`K-71`・`K-140`）—— 11 節の問い 3 の答えが「語にする」でも、本書が直すのは `K-144`・`K-145` だけ。残りを揃えるなら別の変更要求。
- 表示するタイムゾーンの行の並べ替え・増減の入口 —— 4 行の選ぶ欄のまま。
- 見せる基準と日程データが違う文書で、数字をそのまま の前後に画面の数字が変わること（③ の X-f の代償）—— 結果の時刻が見せるので、別の答えは作らない。

---

## 11. 利用者（調整役）に問うこと

### 問い 1 —— 見えている範囲が夏時間の変わり目をまたぐとき、目盛の段の左に刷る 1 つの略称はどの瞬間で決めるか

- 場面: 文書の設定（`Document Settings`）で 時刻を表示する（`showsTimeOfDay`、`K-146`）を入れ、表示するタイムゾーン 1（`Display Time Zone 1`）に「UTC -8:00 PST/PDT 太平洋時間（米国・カナダ）」を選ぶ。2027 年 3 月 14 日（米国の夏時間の始まり）の前後 2 日が見える倍率まで拡大する。太平洋時間の段は 3/13 が PST（UTC-8）、3/15 が PDT（UTC-7）。段の左の空欄には 1 つだけ刷る（`JDG-2056`）。
- 使う例: 米国の協力先と時差をまたぐ会議の日程を、変わり目の週に組む。
- 択 A（推奨）: 見えている範囲の真ん中の瞬間で決める。—— パンで真ん中が変わり目を越えた瞬間に PST が PDT に替わる。代償: 端のほうの時刻は、刷った字と違う側で読むことがある（時の数字そのものは正しい）。
- 択 B: 見えている範囲の左端の瞬間で決める。—— 代償: 範囲の大半が夏時間でも、左端が冬なら PST と刷る。
- 択 C: 基準日（`Status Date`）の瞬間で決める。—— パンしても変わらない。代償: 基準日が見えている範囲の外だと、見ている所と違う側の字になる。基準日の無い文書では決まらない（別の決め方が要る）。
- 推奨の理由: 見本 `46` が真ん中（`index.html:450` の `mid`）で決めており、`JDG-2043` の「書くはずだった」はこの見本を指す。読む人が見ている所に最も近い。

### 問い 2 —— 答えの結果の時刻に、どの地域の時刻かを添えるか

- 場面: 文書の設定の 本プロジェクトの基準タイムゾーン（`Project Base Time Zone`、問い 3 の推奨の en）で、いまの基準 UTC から「UTC +9:00 JST 東京」を選ぶ。その下に 換算する（`Convert`）・数字をそのまま（`Keep the Numbers`）・キャンセル（`Cancel`）が出る。最初のタスクの開始は 4/1 8:00（UTC）。
- 使う例: 日程を作った人が UTC で入れ、東京の人が自分の時計で読み直したい。
- 択 A（推奨）: 前と後の両方に略称を添える。「換算する: 4/1 8:00 UTC → 4/1 17:00 JST」「数字をそのまま: 4/1 8:00 UTC → 4/1 8:00 JST」。—— 2 つの答えが同じ形で並び、数字をそのまま の行で「同じ 8:00 だが時計が違う」ことが読める。本書が足す略称を使う。代償: 1 行が 8 字ほど長い（`CR-754` の幅に効く）。
- 択 B: `JDG-2057` で示した例のとおり、数字をそのまま の後の時刻にだけ地名を括弧で添える。「換算する: 4/1 8:00 → 4/1 17:00」「数字をそのまま: 4/1 8:00 → 4/1 8:00（東京）」。—— 代償: 地名に括弧を持つ地域では「4/1 8:00（太平洋時間（米国・カナダ））」と括弧が重なる。換算する の行はどちらの時計かを言わない。
- 択 C: 何も添えない。—— 代償: 数字をそのまま の行の前後が同じ字になり、何が変わるかが読めない（`DFC-2521` の再現と同じ）。
- 推奨の理由: 択 B の例は問いの文の中の例で、利用者が選んだのは「その時だけ問う」の形である。字を揃えると、地名の括弧が重ならず、変わるもの（時計）が両方の行で読める。

### 問い 3 —— 新しい項目名の en

- 場面: 画面の言語を English にして文書の設定（`Document Settings`）を開く。今は基準の欄の名が `viewTimeZone`、表示の欄の名が `displayTimeZones`（設定の鍵がそのまま出ている）。本書で ja は「本プロジェクトの基準タイムゾーン」「表示するタイムゾーン 1」〜「4」になる。
- 使う例: 英語で使う人が、どの欄が基準かを名だけで知る（`DFC-2521` の「何を設定する項目か分からない」の en の側）。
- 択 A（推奨）: 語にする。`K-144` → `Project Base Time Zone`、`K-145` → `Display Time Zone`（行は `Display Time Zone 1`〜`4`）。—— 代償: 設定の項目名の en が識別子と語の混在のまま（`K-142`・`K-143` は既に語）。`Base Time Zone of This Project` も意味は同じだが、幅（`CR-754`）を取る。
- 択 B: 識別子のまま。`viewTimeZone`、`displayTimeZones 1`〜`4`。—— 規則 02 の 5 節の「設定の項目名の en（識別子そのもの）」に合う。代償: ja で直した「何の項目か分からない」が en では残る。
- 推奨の理由: `JDG-2057` は名を「何を決めるかが読める名」にした。en だけ識別子だと同じ不満が英語で残る。

### 問い 4 —— 広く使われる略称の無い 10 行をどう見せるか

- 場面: 文書の設定の選ぶ欄を開くと 28 行が並ぶ。IANA の時刻の地域の名簿（各地域の略称の出どころ）は、18 行に字（JST・PDT など）を持ち、10 行（`ZN-1` 日付変更線の西・`ZN-10` サンパウロ・`ZN-11` 南ジョージア・`ZN-12` アゾレス・`ZN-18` ドバイ・`ZN-21` ダッカ・`ZN-22` バンコク・`ZN-23` シンガポール・北京・`ZN-26` ヌメア・`ZN-28` トンガ）は字を持たず数字（`-03`・`+04` など）で書く。表 T-376 の見立ては 4.2 の X-3。
- 使う例: ドバイの拠点の時刻を表示するタイムゾーンに足し、目盛の段の左を読む。
- 択 A（推奨）: 字を作らない。名は略称の部を詰め（「UTC +4:00 ドバイ」）、目盛の段には「UTC+4」を刷る。—— IANA と同じ立場で、字がぶつからない（28 行の中で同じ字は 0）。代償: アゾレス（`ZN-12`）だけは夏時間が有るのに名がそれを言わない（段には `UTC-1`／`UTC±0` が出る）。英語圏で使われる BRT・GST・ICT・SGT も出ない。
- 択 B: 英語圏で使われる字を足す（`ZN-10` BRT・`ZN-18` GST・`ZN-22` ICT・`ZN-23` SGT・`ZN-12` AZOT/AZOST）。残る 5 行（`ZN-1`・`ZN-11`・`ZN-21`・`ZN-26`・`ZN-28`）は A と同じ。—— 代償: GST は南ジョージアの字としても使われ、SGT は名の「北京」と合わない（北京の CST は米国中部と同じ字）。どの字が「広く使われる」かの線引きを本書が持つことになる。
- 択 C: 字の無い行にも数字の略称を名に入れる（「UTC +4:00 UTC+4 ドバイ」）。—— 代償: 名の中で差が 2 度並ぶ。
- 推奨の理由: 字を作らないことが、ぶつからない唯一の決め方であり、出どころ（IANA）を 1 つにできる。目盛の段には差が出るので、どの地域かは読める。

---

## 12. 当てる体への申し送り

- ⚠️ **`CR-751` が着地したものとして書いた。** 当てる前に確かめる: ① `docs/spec/_source/grs-document.schema.json` の `scheduleDataTimeZone` が 28 の `enum` を持つか（`601aeec7` では `type: string` だけ —— 13 節）。② `CR-751` の `enum` の生成が表 T-376 を見出し「地域名」で読むか（列の位置で読むなら、本書の 2 列で壊れないかを見る）。③ `time-zone.ts` の名簿の外の値の扱いが `CR-751` の形になっているか。**着地していなければ**: 本書の仕様（X-1〜X-13）は `enum` に依らないので当ててよいが、`src` の A（`time-zone.ts` に手を入れる）は `CR-751` の体が `time-zone.ts` を離れるまで待つ。本書の 0 節・本節の「`CR-751` が着地した」の文は、そのまま残す（調整役が順を見る）。⛔ 本書は地域名の列・値・見出しを変えない —— `enum` と食い違う道は無い。
- `CR-754` は本書の後で `S-171` を測る（9 節）。
- `DFC-2517`（テーマ色の行の `IC-161`・`IC-162` の重なり、`IN_FIELD_ENTRIES` に足す 1 行）は本書と独立に先に直してよい。本書を当てるときは `IN_FIELD_ENTRIES` からも `IC-161` を外す。
- `CR-742` の X-13 の機械の名（`baseTimeZoneDraftStateMachine`）・離れる 7 つの出来事・`documentReplacedByOpenOrNew` はそのまま使う。`CR-743` の `calendarDraftStateMachine` には触れない。
- 11 節の 4 つの答えで、X-1（瞬間）・X-12 と 5 節の手引き 6（添える字）・X-7 と X-11（en の名）・X-3（字の有る行）が変わる。
- 利用者の実物の手順（当てた後。調整役が全部の欠陥の後の 1 回にまとめる）: ① 文書の設定を開き、本プロジェクトの基準タイムゾーンの選ぶ欄に「UTC -8:00 PST/PDT 太平洋時間（米国・カナダ）」「UTC +9:00 JST 東京」の形で並ぶか。② 時刻を表示するを入れ、表示するタイムゾーン 1 に東京、2 に太平洋時間を選び、時の段まで拡大して、基準の時の行の左に `UTC`、東京の段の左に `JST`、太平洋時間の段の左に（8 月なら）`PDT` が右寄せで在り、頭の操作子と重ならないか。③ 基準の欄で東京を選び、3 つの答えが出るか、換算する を押して目盛が東京の時刻になり `Ctrl+Z` 1 回で戻るか。④ もう 1 度東京を選んで 数字をそのまま を押し、バーの位置が動き（瞬間が 9 時間動く）、基準の欄が東京を示し、`Ctrl+Z` 1 回で戻るか。⑤ キャンセル で何も変わらないか。

---

## 13. 測り方の再現

```
git grep -c "CR-755" 601aeec7 -- change-request docs/spec src tests                     # 0 件（出力なし）
grep -c "^| ZN-" docs/spec/01-04-requirements.md                                         # 28
sed -n 5819,5850p docs/spec/01-04-requirements.md | grep -c "| 有 |"                      # 12（夏時間「有」）
sed -n 5803,5812p docs/spec/01-04-requirements.md | grep -o "（MUST）" | wc -l          # 4（X-5 が置き換える段落）
grep -n "scheduleDataTimeZone\": {" -A3 docs/spec/_source/grs-document.schema.json        # type: string だけ（enum なし）
grep -n "bandHeight" src/framework/dom-screen-surface/task-group-panel-drawing.ts         # 0 件
grep -n "ScreenFrame carries no corner rectangle" src/framework/dom-screen-surface/task-group-panel-drawing.ts
grep -n "shortZoneName\|const mid" previous-project-result/46-minute-level-time-axis/index.html
git grep -l "IC-161\|keepGlobalTime\|keepLocalTime\|baseChangeWayChosen\|baseChangeEntryPressed\|TX-11\|timeZoneLabelOf" 601aeec7 -- tests   # 4 本
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90 T-369 T-375 HF-10 EP-2 EP-3
```

IANA の略称（18 行が字、10 行が数字）—— Python の `zoneinfo` で 2026-01-15 と 2026-07-15 の正午の `tzname()` を 28 の地域名ごとに読んだ:

```
PYTHONIOENCODING=utf-8 python -c "from zoneinfo import ZoneInfo; from datetime import datetime; import sys; [print(z, datetime(2026,1,15,12,tzinfo=ZoneInfo(z)).tzname(), datetime(2026,7,15,12,tzinfo=ZoneInfo(z)).tzname()) for z in sys.argv[1:]]" Etc/GMT+12 Pacific/Pago_Pago Pacific/Honolulu America/Anchorage America/Los_Angeles America/Denver America/Chicago America/New_York America/Halifax America/Sao_Paulo Atlantic/South_Georgia Atlantic/Azores UTC Europe/London Europe/Berlin Europe/Helsinki Europe/Moscow Asia/Dubai Asia/Karachi Asia/Kolkata Asia/Dhaka Asia/Bangkok Asia/Singapore Asia/Tokyo Australia/Sydney Pacific/Noumea Pacific/Auckland Pacific/Tongatapu
```

`Intl` の言語ごとの答え（ja は東京を `JST`、ロサンゼルスを `GMT-7`。en-US は東京を `GMT+9`、ロサンゼルスを `PDT`。インドはどちらも `GMT+5:30`）:

```
node -e "for (const z of ['Asia/Tokyo','America/Los_Angeles','Asia/Kolkata']) for (const l of ['ja','en-US']) console.log(z,l,new Intl.DateTimeFormat(l,{timeZone:z,timeZoneName:'short'}).formatToParts(new Date(Date.UTC(2026,6,15))).find(p=>p.type==='timeZoneName').value)"
```

名の幅（9 節。`unicodedata.east_asian_width` が W／F の字を 2、ほかを 1 と数え、辞書の `timeZones` の今の語と、X-3 の略称で X-4 の形に組んだ語の最大を比べた。いちばん広いのはどちらも `ZN-15`）: ja 44 → 51、en 42 → 49。辞書 `docs/spec/_source/display-words.json` の `timeZones` を読み、頭の「(UTC±hh:mm) 」を外して「UTC {差} {略称} {地名}」に組み直す 1 回きりの Python で測った（`601aeec7`）。
