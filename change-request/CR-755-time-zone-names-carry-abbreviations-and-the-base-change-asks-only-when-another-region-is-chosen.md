# CR-755 —— タイムゾーンは固定の時差と 1 つの略称で持ち、基準は標準時だけを選び、基準の変更は別のタイムゾーンを選んだときだけ 3 つの答えで問い、MS Project を開いても知らせない

> ⭐ 問い 6・7 の答え（2026-10-15）: 利用者が戻ってから、CR-754〜757 を起草した席が 11 節の問い 6・7 を問うた。±0:00 の標準時の略称は `UTC`（`JDG-2242`）。今の表 T-376（地域名の 28 行）で地域が IANA の字の略称を持っていた行はその略称を保ち（+1:00 `CET`・+3:00 `MSK`・−4:00 `AST`・−3:00 夏時間 `ADT` ほか）、人口の規則（`JDG-2106`）は略称を持っていなかった行だけを埋める（`JDG-2243` —— `JDG-2106` を一部覆す）。X-4 の表の 5 行・X-c・X-d・③・0.2・8・11・12 節を書き直した。
> ⭐ 答えの記録（2026-10-15）: 本書の 11 節の問い 1〜5 に、利用者が答えた（`JDG-2100`・`JDG-2101` の後、CR-754〜757 を起草した席が問うた）。答えは裁定 `JDG-2104`（基準の変更の答えの形）・`JDG-2105`（固定の時差。基準は標準時だけ）・`JDG-2106`（略称は代表の 1 つ。項目名の en は語）・`JDG-2107`（MSPDI は PC の標準時、知らせない）にまとまる（記録は別の体が `rulings.md` に書く）。本書はその答えに合わせて全体を書き直した。⛔ 前の版の「夏時間は地域の規則で自動に効く」「季節で変わる地域は略称を並べる」「目盛の段にはその時点の 1 つ」「[数字をそのまま]」は、どれも答えで消えた。
> 起草の状態: **起草だけ —— 当てていない**（2026-10-15、作業木 `6f7c3ac3` の上で書いた。コードと仕様の位置は、`CR-751` が着地した統合の枝 `integ/coord-1011` の `4a907919` で測った —— 13 節）。`docs/spec`・`docs/spec/_source`・`src`・`tests`・台帳には触れていない。仕様の差し替え・`npm run gen`・コード・試験は、調整役が体に手配する。
> ID の帯: 番号 `CR-755` だけを調整役から受けた。表 T-376 の新しい行 ID（2 節の 39 行）は**仮の番号**であり、当てる体が調整役から帯を受けて振り直す。消す行 ID は `ZN-1`〜`ZN-28`・`IC-161`・`RS-90`（番号は再び使わない）。変更履歴・`perf-pending`・裁定の番号は当てる体が調整役から受ける。
> 当てるもの: `JDG-2043`（目盛の段の左に略称）・`JDG-2048`（名に略称）・`JDG-2049`（夏時間が名で分かる）・`JDG-2056` の形の残り（「UTC +9:00 JST 東京」の並び）・`JDG-2057`（項目名と番号つきの表示の行。答えは別のタイムゾーンを選んだときだけ）・`JDG-2058` の後半（3 つ目の答え [キャンセル]）・`JDG-2104`〜`JDG-2107`。台帳 `DFC-2515`・`DFC-2521`・`DFC-2522`・`DFC-2523`。
> 起こり: 利用者の 2026-10-15 の 11 件のうち 1・6・7・8（聞き取りの席が `bf75ab22` の出荷ビルドで再現した）。
> ⚠️ **`CR-751` は着地している**（統合の枝 `integ/coord-1011`、`80fa07fc`「Apply CR-751」。まだ push していない）。本書は `CR-751` の X-10・X-11 の**仕組み**（タイムゾーンの欄を表 T-376 から作る `enum` で縛り、名簿の外の日程データのタイムゾーンを `RS-25` で拒み、見せ方の 2 つのキーは `OP-6` で既定へ戻す）を**保ち**、その**値**を 28 の地域名（IANA）から固定の時差の鍵に**置き換える** —— 基準の 2 つの欄は標準時の鍵だけ、`displayTimeZones` はすべての鍵。`CR-751` には追記しない（着地した CR に足すと検査 62 が赤くなる）。覆す文は 3 節と 0.2 節に並べた。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`4a907919`）

| 主張（台帳の行・指示） | 見たもの | 本書での扱い |
|---|---|---|
| `DFC-2515`: 時刻を表示しても、基準の時の段と表示するタイムゾーンの段の左の空欄に何も刷らない | 正しい。`src/adapter/svg-renderer/schedule-grid.ts` の `zoneRowsSvg` と `rulerSvg` は段をタスクグループエリアの左端（`screen-regions.ts` の `taskGroupAreaX`）から右にしか描かない。パネルの側（`task-group-panel-drawing.ts`）は頭の操作子（`HF-10`）と折りたたみ込んだ数（`HF-12`）だけを描く | X-1 で `FR-017` に刷る所を足す |
| `DFC-2515`: 左の空欄の高さ（`bandHeight`）は `screen-regions.ts` と `task-group-panel-drawing.ts` に在る | ⚠️ **半分は偽。** `screen-regions.ts` には在る（`rulerBandHeightOf`）。`task-group-panel-drawing.ts` に `bandHeight` は 0 件 —— パネルは目盛の高さを知らず、`taskGroupsTopPx` でタスクグループの上端から推している | 5 節: 段の箱と略称の字を画面の値（`ScreenView`）に載せてパネルへ渡す継ぎ目が要る |
| `DFC-2522`: 名は「(UTC+09:00) 東京」の形で、略称の列は表 T-376 にも辞書にも無い | 正しい。表 T-376 の列は 行 ID・地域名・標準時の UTC の差・夏時間 の 4 つ。辞書 `display-words.json` の区 `timeZones` は 28 行とも「(UTC±hh:mm) 地名」の 1 語 | X-4・X-13。差は表と辞書の 2 か所に在った（`R1.3`）—— 本書で辞書は地名だけを持つ |
| `DFC-2522`: 季節で略称が変わる地域は 10 組 | ⚠️ **数え落とし。** 夏時間「有」は 12 行。山岳部（`ZN-6`）とアゾレス（`ZN-12`）が抜けていた | 答え（`JDG-2105`）の後は、12 行の夏時間がそれぞれ 1 行（夏時間の鍵）になる —— X-4 |
| `DFC-2523`: 夏時間は既に効いていて、名が言わないだけ | 正しかった（`time-zone.ts` の `zoneClockOf` が `Intl` でその瞬間の差を読む）。⛔ **答え（`JDG-2105`）で働きそのものを消す** —— 夏時間の行は 1 年中その差で読む | X-3・5 節の A |
| `DFC-2521`: 基準の欄は地域の選び・選び方の選び・例の 1 行・[基準を変える] を持ち、同じ地域では例の前後が同じ | 正しい。`properties-panel.ts` の `baseChangeControls`（地域・選び方・`IC-161`）と `baseExampleLine`（`TX-11`） | X-6・X-10〜X-12 で欄を作り替える |
| （本書が見つけた）「ローカルタイムを保つ」は、見せる基準（`S-574`）が空でないと、選んだ地域を基準に見せない | `edit-document-settings.ts` の `baseTimeZonesAfterChange` は `keepLocalTime` で日程データのタイムゾーンだけを付け替え、`viewTimeZone` を残す | 答え（`JDG-2104` の「押した後は選んだタイムゾーンで見せる」）で決まった —— X-6 |
| MSPDI はタイムゾーンを持つか（利用者の問い「MSPDIのデータって、タイムゾーン無いの？ 念のため再調査しろ。」） | **持たない。** 公式のスキーマ pj12／pj15（`docs/reference/mspdi` —— 作業木には無い、ローカルだけの写し）に時差の要素は無く、日時は時差の無い壁時計（読みの体の調べ、`mspdi_pj12.xsd` の 225〜730 行）。`GRS` は MSPDI を置き換えて開くと日程データのタイムゾーンを PC の地域にし（`document-file-flow.ts:846`・`:972`〜`:975`）、そのたびに `RS-90` を告げる（`:981`、`frame-loop.ts:3525` は `IC-98`） | X-8・X-15（`JDG-2107`） |
| `CR-751` は「いま当てている」 | ⚠️ **偽 —— 着地している**（`80fa07fc`）。`grs-document.schema.json` の `Project.scheduleDataTimeZone` は 28 の `enum`、`settings.json` の `S-574`・`S-575` は `"valuesFrom": "T-376"`、生成器 `erd_json_to_schema.py` の `VALUES_FROM` が表 T-376 を `generate_time_zone_roster.build()` で読む | X-18 で値だけを置き換える |

### 0.2 裁定の鎖（`rulings.md` を「タイムゾーン」「略称」「時差」「UTC」「夏時間」「基準を変え」「グローバルタイム」「ローカルタイム」「`IC-161`」「`RS-90`」「`T-376`」「MSPDI」で引いた）

⭐ 本書が覆すものは、**どれも利用者の 2026-10-15 の答えが覆す**（問わずに覆すものは 0）。当てる体は、覆されるそれぞれの行の状態の欄に「覆された（一部。`JDG-210x`）」を書く。

| 裁定・文 | 何を決めたか | 本書との関係 | 覆す答え |
|---|---|---|---|
| `JDG-1705` | 基準 1 つと表示するもの 0〜4 つ | 保つ（X-7） | — |
| `JDG-1711` | MSPDI を取り込んだ文書は PC の地域、通知とヘッダーで見せる | **覆された（一部）** —— PC の**標準時**の鍵にし（夏でも標準時）、通知では見せない | `JDG-2107` |
| `JDG-1712` | 地域名（IANA）で持ち、「(UTC+09:00) 東京」の形で見せる。28 個。夏時間は地域の規則 | **覆された** —— 固定の時差の鍵で持ち、夏時間を自動に当てない。名の形は「UTC +9:00 JST 東京」 | `JDG-2105`（持ち方）・`JDG-2106`（名） |
| `FR-156` の文「タイムゾーンの値は地域名とし…夏時間は地域の規則で自動に効く」「固定の時差で持ってはならない（MUST NOT）」 | — | **書き換える**（X-3） | `JDG-2105` |
| `JDG-1780` | 2 つの選び方を「グローバルタイム（UTC）を保つ」「ローカルタイムを保つ」で見せる | **覆された（語）** —— 「スケジュールデータの時刻:」の下の [換算して適用する] ／ [換算しない]。2 つの働き（`CM-95`・`CM-94`）は保つ（2 択を常に出すことと例の 1 行は既に `JDG-2057` が覆した） | `JDG-2104` |
| `JDG-1781` | データのタイムゾーンと見せる基準の 2 つ。確認を取るのはタイムシフトだけ | 保つ | — |
| `JDG-1782`・`JDG-1783` | 時の段は 2 段、地域の段を足す | 保つ。左の空欄に略称を刷るのは `JDG-2043` | — |
| `JDG-1784` | 列名 `scheduleDataTimeZone`・`viewTimeZone`・`displayTimeZones` | 保つ（鍵の名は変えない。値が変わる） | — |
| `JDG-1977` | `IC-161` の説明の字「選んだタイムゾーンを表示の基準にする。スケジュールの日時の値は書き換えない」 | **字は保ち、置き場を移す** —— [換算して適用する] の説明にする（X-13） | — |
| `JDG-1983` | 選んだだけでは当てず、例を見せ、`IC-161` を押して当てる | **覆された（入口の段）** —— 答えを押したときに当てる。`IC-161` を消す。「読んでから当てる」は保つ（各答えが前後の時刻を持つ） | `JDG-2104` |
| `JDG-1986` | `RS-90` は時間で消える | **覆された** —— `RS-90` を告げない（行ごと消す） | `JDG-2107` |
| `JDG-2038` | `RS-90` の次の一手は [基準を変える] を押すまでを言う | **覆された** —— 知らせが無くなる | `JDG-2107` |
| `JDG-2039` | 28 の地名を `enum` で縛る（`CR-751`） | **覆された（値）** —— 縛る仕組みは保ち、値を鍵にする（基準の 2 つの欄は標準時の鍵だけ） | `JDG-2105` |
| `CR-751` が `FR-156` に足した 2 文（「表 T-376 に無い値の `GRS JSON` は開かず `RS-25` で拒む」「`S-574`・`S-575` に無い値は `OP-6`」）と X-10 の説明「The region whose wall clock…」 | — | 2 文は保ち「値」を「鍵」と読む。基準の欄に夏時間の鍵が在る文書も同じ道で拒む（X-9）。説明の英文は書き換える（X-18） | `JDG-2105` |
| `JDG-2043` | 時の段と表示するタイムゾーンの段の左に略称を右寄せで | 当てる（X-1） | — |
| `JDG-2048`・`JDG-2049` | 名に略称。夏時間が名で分かる | 当てる（X-5。夏時間は別の行で、名が夏時間の略称を持つ） | — |
| `JDG-2056` | 「UTC +9:00 JST 東京」の形。季節で変わる地域は両方を並べ、目盛の段にはその時点の 1 つ | **覆された（一部）** —— 並べず、標準時と夏時間を別の行にする。段には行ごとに決まった 1 つ。名の並び（UTC・差・略称・地名）は保つ | `JDG-2105` |
| `JDG-2057` | 項目名「本プロジェクトの基準タイムゾーン」と「表示するタイムゾーン 1」…。答えは別の地域を選んだときだけ、結果の時刻つきで | 当てる（X-6・X-7・X-10） | — |
| `JDG-2058` | 3 つ目の答え [キャンセル] | 当てる。⭐ 答え（`JDG-2104`）は [キャンセル] を退けていない —— 3 つのまま | — |
| `JDG-2100`〜`JDG-2102` | 問い 1・2 の答えの向きと、問う席 | `JDG-2100` の向き（プロジェクト全体で 1 つにそろえる）は `JDG-2105` で形になった —— 行ごとの略称は決まっていて、瞬間で変わらない | — |
| `JDG-2106` | 略称は行ごとに代表の 1 つ。その時差で略称の決まった国（都市）のうち、人口のいちばん多い所の略称 | **覆された（一部）** —— 今の表で地域が略称を持っていた行はその略称を保ち、人口の規則は略称を持っていなかった行だけを埋める。±0:00 の標準時は `UTC`（`JDG-2242`）。代表の 1 つとすることと項目名の en は保つ | `JDG-2243` |
| `JDG-2104`〜`JDG-2107` | 本書が当てる（`JDG-2106` は上の一部を除く） | — | — |
| `JDG-2242`・`JDG-2243` | 11 節の問い 6・7 の答え: ±0:00 の標準時は `UTC`。今の略称を保ち、規則は略称の無い行だけ | 当てる（X-4・X-c） | — |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4` が受ける目標は `GL-006` —— 分単位の日程で、目盛のどの段をどの時計で読むかが段ごとに略称で分かり（X-1）、選ぶ欄の名から標準時か夏時間かが分かり（X-4・X-5）、基準を変えるときは前と後の時刻を読んでから答えられる（X-6）。MS Project を開くたびの知らせが無くなる（X-15）。
- `CH-1` が受ける目標は `GL-008` —— 時差の違う交換相手と日程を合わせるとき、基準の付け替え（換算しない）が選んだタイムゾーンを本当に基準にし（X-6）、季節で時差が勝手に動かない（X-3）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 標準時の差が表 T-376 と辞書の `timeZones` の 2 か所に在った。本書の後は、鍵・差・種・略称は表 T-376 だけ、地名は辞書だけが持ち、名は辞書の `zoneName` の形で組む（X-4・X-13）。
- `R2.22`（名は指すものを言う）—— 保存する値は略称ではなく時差の鍵（略称は CST・BST・IST がぶつかる —— X-4 の表で CST と BST は 2 行ずつ）。`IC-161` は押す相手が無くなるので消す。辞書の部の鍵 `keepGlobalTime`・`keepLocalTime` は働き（同じ瞬間を保つ ／ 時計の数字を保つ）を言うので保つ。
- `R2.21`（関心の分離）—— どの略称を刷るかは表 T-376 の行で決まり、瞬間に依らない。名簿と時計は Entity、描き手は字を受けるだけ（5 節）。
- 表が正 —— 鍵・略称は表 T-376、名の形と答えの語は辞書、欄の並びは表 T-369 が持ち、`FR-156` は表を指す。

### ③ 利用者に問わずに決めたこと

⭐ 答え（`JDG-2104`〜`JDG-2107`）で決まったものは本表から外した（基準は標準時だけ・夏時間を自動に当てない・答えの語・押すと当たる・[キャンセル]・知らせない・PC の標準時）。残るのは、答えを形にするときに本書が選んだ細部である。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 保存する鍵の綴りは、標準時は `UTC-08:00`、夏時間は `UTC-07:00 DST`（`UTC`・符号・2 桁の時・`:`・2 桁の分。0 は `UTC+00:00`。夏時間の行だけ後ろに空白と `DST`）。⚠️ **当てる体が綴りを確かめて決める**（利用者の問いではない） | 略称は行の間でぶつかる（CST・BST）ので値にできない。差だけでは MST と PDT（どちらも UTC-7）を分けられない —— 利用者は表示に PDT を選べる（`JDG-2105`）。読む人にも書く人（スキーマだけを読む体）にも意味が読める | 鍵に空白を含む。基準の 2 つの欄の `enum` は `DST` の付かない 27 個 |
| X-b | 名の差は時を 0 で埋めず分を 2 桁、0 は `±0:00`（「UTC +9:00」「UTC +5:30」「UTC ±0:00」）。符号は ASCII の `+`・`-` | `JDG-2048` の例「UTC +9:00 JST 東京」。表 T-376 の差の列が 0 を `±00:00` と書く | — |
| X-c | ⭐ 略称の採り方は 3 段（`JDG-2242`・`JDG-2243`）: ① ±0:00 の標準時の行は `UTC`。② 今の表 T-376（地域名の 28 行）で地域が IANA の字の略称を持っていた行は、その略称を保つ（`ZN-1`〜`ZN-28` のうち 18 地域）。③ 残る行（今は略称を持たない行）だけを、代表の略称（`JDG-2106`「人口が一番多い国（都市)」）で埋める。③ は**その時差を標準時（夏時間の行は夏時間）として使う所に住む人の数**で比べる。国の一部だけがその時差なら、その部分の人口で比べる。略称は、その国がその時差の時刻の名として使う字 | 国の人口のまま比べると、+9:00 は東部（パプア）が +9:00 のインドネシアの WIT になり、利用者の例「UTC +9:00 JST 東京」（`JDG-2048`）と合わない。「（都市）」の添えもその時差に住む所を指す | 「代表の 1 つ」を決める規則が 3 段になる（利用者が問い 6・7 で選んだ）。今の略称から替わる行は 0（±0:00 は今の `UTC` の行の字）、今は略称を持たない行に入る字が 10 行ある（X-4 の表の「今の行と略称」の列）。CST（米国中部と中国）と BST（英国の夏とバングラデシュ）は 2 行で同じ字になる（鍵は違うので働きは変わらない） |
| X-d | 地名は、略称の出どころの地を先に、今の表の地名を後に「・」でつなぐ（例「ジャカルタ・バンコク」。出どころが今の表の地と同じなら今の地名だけ —— 例「中央ヨーロッパ（ベルリン・パリ）」）。夏時間の行は「…夏時間」と名で言う | 略称と地名が食い違わず、今の地名で探す人も見つけられる | 名が長くなる —— いちばん広い名は ja 44 → 55、en 42 → 61（13 節）。`CR-754` の幅に効く（9 節） |
| X-e | 表 T-376 の 28 行の行 ID（`ZN-1`〜`ZN-28`）は消し、39 行に新しい行 ID を振る（番号は再び使わない）。本書の `ZN-29`〜`ZN-67` は仮 | 行が指すものが地域から時差の鍵に変わる —— 同じ ID に別の意味を持たせない（1 つの接頭辞に 1 つの意味） | `BK-4` と `FR-156` の例が指す行 ID も書き換える（X-8・X-20） |
| X-f | 表の並びは時差の小さい順、同じ時差では標準時の行を先にする。基準の選ぶ欄は標準時の行だけを同じ順で出す | 今の表も西から東の順。PC の寄せ方の「同じ近さなら本表の上の行」（`FR-156`）を保てる | 表示の選ぶ欄では、標準時と夏時間が交互に並ぶ所がある |
| X-g | 辞書の部の鍵 `keepGlobalTime`・`keepLocalTime` と状態機械の運ぶ値の名は変えない —— 語だけを替える | 鍵は働きを言う（`R2.22`）。名を変えると生成物・試験・コードの全部が動く | 鍵と画面の語が違って見える |
| X-h | 答えの並びは、基準の選ぶ欄のすぐ下に「スケジュールデータの時刻:」の 1 行、その下に [換算して適用する]・その変更前の行・変更後の行、[換算しない]・その変更前の行・変更後の行、[キャンセル] を 1 行に 1 つずつ。表示するタイムゾーンの行はその下 | `JDG-2104`「略称を付けるが変更前後で行を分けろ」。答えは選んだ欄のそばに出す | 答えが出ているあいだ、下の行が 7 行ぶん下がる |
| X-i | 前後の時刻は、開始を持つ最初のタスク（文書の `Task` の並びの順）の開始の日時を、いまの見せる基準と答えで当てた後の見せる基準で見せた字に、それぞれの略称を添えたもの。開始を持つタスクが無いときは前後の行を出さない | 今の例の 1 行（`TX-11`）と同じタスクを使う | — |
| X-j | いまの見せる基準と同じタイムゾーンを選び直したときは答えを出さない（下書きを捨てる）。答えが出ているあいだに別のタイムゾーンを選び直したときは前後の時刻を作り直す | 「別の地域を選んだときだけ」（`JDG-2057`） | — |
| X-k | 欄の読み取りの行（今の「(UTC+09:00) 東京」といまの基準を示す行）は消す | 選ぶ欄そのものが、答えていないあいだは今の基準を示す | — |
| X-l | 表示するタイムゾーンは 4 行を常に出す（どれも「（なし）」を選べる） | `S-575` の上限 4。値を入れるたびに行が増えると、欄が上下に動く | 使わない行も 4 行ぶんの高さを取る |
| X-m | 基準の時の段の略称は、目盛が時の段（表 T-238 の `TM-5`）のときだけ、その 2 行目（時の行）の左に刷る。表示するタイムゾーンの段の略称は、その段があるあいだ（時刻を表示しているあいだ）いつも刷る | `JDG-2043` は「時の段と表示するタイムゾーンの段」を名指した。地域の段は時の段でないときもその時計の 0 時の日付を刷る（`FR-017`） | 時の段でないとき、基準の略称は見えない |
| X-n | 略称は目盛の字（`rulerFont`）と色（表 T-236 の `S-147`）で刷り、右端はパネルの右端から 表 T-206 の `S-313` 内側とする。パネルが字より狭いときは左を切る | 頭の操作子（`HF-10`）がパネルの右端から同じ距離に立つ —— 新しい値を作らない | 狭いパネルで略称の頭が欠ける |
| X-o | 書き出す絵（`FR-025`）にも略称を刷る | 表 T-076 の `EP-2`（目盛）と `EP-3`（パネル）。どの時計の段かが読めない絵は時刻を読めない | `image-exporter.ts` にも手が入る |
| X-p | 略称を持たない行（`UTC-12:00` の 1 行だけ）は、名の略称の部を詰め（「UTC -12:00 日付変更線の西」）、目盛の段の左には「UTC-12」を刷る（辞書の `offsetName`。分が 0 なら書かない） | その時差を時刻として使う人が住んでいない —— 代表を選べない（`JDG-2106` の規則が字を返さない） | — |
| X-q | PC の標準時は、その PC の今年の 1 月 1 日と 7 月 1 日の正午の UTC の差の小さいほうとする。それと同じ差の標準時の行へ、無ければ差が最も近い標準時の行（同じ近さなら表の上の行）へ寄せる（例: UTC+05:45 は `UTC+05:30`、UTC+10:30 は `UTC+10:00`） | 夏時間は差を足す向きにしか動かない（北半球も南半球も、小さいほうが標準時）。地域名を読まずに差だけで決まる。寄せ方の文は今の `FR-156` の形のまま | 夏時間を減らす向きに持つ地域（例はまれ）は、夏の差を標準時と読む |
| X-r | `GRS JSON` の `scheduleDataTimeZone` に夏時間の鍵が在る文書は、名簿の外の値と同じく `RS-25` で拒む。`viewTimeZone` の夏時間の鍵は `OP-6` で既定へ戻す | `CR-751` が決めた 2 つの道（`JDG-2039`）を値が変わっても保つ。基準は標準時だけ（`JDG-2105`）を、読み口でも守る | — |
| X-s | 地域名を持つデータは、その地域の標準時の鍵へ書き換える（`Asia/Tokyo` → `UTC+09:00`、`UTC` → `UTC+00:00`）。⛔ 古い地域名を読む口は作らない。前の試験の記録（`docs/development-records/measurements/x14-2026-10-15-cr-751/`）は書き換えない | 公開前は古い形の読みを作らない（利用者 2026-09-26）。記録はその日の測りの証拠である | 古い地域名の文書は開くと `RS-25` で拒まれる |
| X-t | 答えの語の en を「Schedule data times:」「Convert and Apply」「Don't Convert」「Cancel」とする —— 推奨を採った（利用者不在、`JDG-1696` に従う。`JDG-2230`） | ja の語（`JDG-2104`）をそのまま訳した。Title Case は規則 02 の 5 節 | — |
| X-u | 前後の行の語を ja「変更前: {time}」「変更後: {time}」、en「Before: {time}」「After: {time}」とする —— 推奨を採った（利用者不在、`JDG-1696` に従う。`JDG-2231`） | `JDG-2104`「変更前後で行を分けろ」の語をそのまま使った | — |
| X-v | 夏時間の行の地名の語（「太平洋夏時間（米国・カナダ）」「Pacific Daylight Time (US and Canada)」ほか、X-4 の表）と、標準時の行の「…標準時」の語 —— 推奨を採った（利用者不在、`JDG-1696` に従う。`JDG-2232`） | 同じ地の標準時と夏時間の 2 行が、名で見分けられる | — |

---

## 1. 範囲 —— 行き先

| 場面（画面で見ること） | 今（`4a907919`） | 本書の後 |
|---|---|---|
| 文書の設定（`Document Settings`）でタイムゾーンの選ぶ欄を開く | 「(UTC-08:00) 太平洋時間（米国・カナダ）」—— 夏時間が有るかは名から分からず、夏時間は季節で勝手に効く | 本プロジェクトの基準タイムゾーンは標準時の 27 行（「UTC -8:00 PST 太平洋標準時（米国・カナダ）」「UTC +9:00 JST 東京」）。表示するタイムゾーンは 39 行（夏時間の「UTC -7:00 PDT 太平洋夏時間（米国・カナダ）」も選べる）。どの行も 1 年中同じ差で読む |
| 基準の欄 | 名「基準のタイムゾーン」。地域の選び・選び方の選び・例の 1 行・[基準を変える] が常に在る | 名「本プロジェクトの基準タイムゾーン」と選ぶ欄 1 つ。別のタイムゾーンを選んだときだけ、下に「スケジュールデータの時刻:」と [換算して適用する]（変更前・変更後の 2 行つき）・[換算しない]（同）・[キャンセル] が出て、押すと当たる（確認なし、`Ctrl+Z` 1 回で戻る）。どちらの答えでも、押した後は選んだタイムゾーンが欄に示され、画面の日時はすべてその時刻で見える |
| 表示するタイムゾーンの欄 | 名「表示するタイムゾーン」の 1 項目に 4 つの選び | 「表示するタイムゾーン 1」〜「4」の 4 行、それぞれ「（なし）」と 39 行 |
| 時刻を表示し、時の段まで拡大し、表示するタイムゾーンに東京を足す | 基準の時の段と東京の段の左（タスクグループパネルの上）は空欄 | 基準の時の段の左に基準の略称（例 `PST`）、東京の段の左に `JST` が右寄せで刷られる。表示に PDT の行を足すと、1 月でも 8 月でも `PDT`（UTC-7） |
| MS Project のファイルを置き換えて開く | 日程データのタイムゾーンを PC の地域にし、知らせ（`RS-90`）を出す | 日程データのタイムゾーンを PC の標準時の鍵にする（太平洋時間の PC なら夏でも `UTC-08:00` の PST）。知らせは出さない |
| 新しく始める（`IC-98`） | PC の地域にし、`RS-90` を出す | PC の標準時の鍵にする。知らせは出さない |
| `GRS JSON` の `scheduleDataTimeZone`・`viewTimeZone`・`displayTimeZones` | 28 の地域名（`CR-751` の `enum`） | 基準の 2 つは標準時の鍵 27 個、`displayTimeZones` は鍵 39 個（`enum`）。地域名の文書は `RS-25` で拒まれる |

---

## 2. 新しい識別子

| 名 | 置き場 | 何か |
|---|---|---|
| 表 T-376 の 39 行（仮 `ZN-29`〜`ZN-67`） | `01-04-requirements.md` の 表 T-376 | 時差の鍵ごとの行（X-4）。⚠️ 番号は仮 —— 当てる体が調整役から帯を受ける |
| 表 T-376 の列「鍵」「UTC の差」「種」「略称」「略称の出どころ」 | 同 | 「地域名」「標準時の UTC の差」「夏時間」に替わる（X-4） |
| 名簿の項 `key`・`offsetMinutes`・`isDaylight`・`abbreviation` | `tools/generate_time_zone_roster.py` が書く `src/entity/document-model/schedule/time-zone-roster.json` | 4 列の写し（略称の無い升は `null`）。`region`・`standardOffsetMinutes`・`observesDaylightSaving` に替わる |
| 辞書の区 `timeZoneField` の部 `baseChangeQuestion`・`cancelBaseChange`・`beforeLine`・`afterLine`・`zoneName`・`offsetName`・`keepGlobalTimeHint`・`keepLocalTimeHint` | `docs/spec/_source/display-words.json` | X-13 |
| 出来事 `baseChangeCancelPressed` | `docs/spec/_source/state-machines.json` の領域 `screen`（表 T-280） | [キャンセル] を押した（X-11） |
| ガード `isOtherThanShownBase` | 同上 | 選んだタイムゾーンがいまの見せる基準と違う（X-11。ガードの名は `is`／`has`／`can` で始める —— 生成器の決まり） |
| `enum` の読みの絞り `"only": "standard"` | `docs/spec/_source/erd.json` の `Project.scheduleDataTimeZone`・`settings.json` の `S-574` と、生成器 `erd_json_to_schema.py` | 表 T-376 の標準時の行の鍵だけを `enum` にする（X-18）。⚠️ 綴りは当てる体が決める |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-376 の 28 行（`ZN-1`〜`ZN-28`）と列「地域名」「標準時の UTC の差」「夏時間」 | 39 行と 5 列（X-4）。番号 `ZN-1`〜`ZN-28` は再び使わない |
| `FR-156` の RATIONALE の「タイムゾーンの値は地域名とし、表 T-376 の 28 個から選ばせること（MUST） —— 夏時間は地域の規則で自動に効く。」「固定の時差で持ってはならない（MUST NOT）。」 | X-3（`JDG-2105`） |
| `FR-156` の「見せる名は…（例「(UTC+09:00) 東京」）。」 | X-5 |
| `FR-156` の「基準を変える 2 つの選び方を…」から「⛔ `IC-161` は確認を取らずに当て、…（利用者の判断）。」まで（2 択・例の 1 行・`IC-161`） | X-6（`JDG-2104`） |
| `FR-156` の「⭐ MSPDI を置き換えて開いた文書と…その PC の地域とすること（MUST） —— …（例 UTC+05:45 は `ZN-20`）。」と「寄せたこと・決めたことを 表 T-233 の `RS-90` で告げること（MUST） —— …」 | X-8（`JDG-2107`）。告げる文は消す |
| `FR-156` の STATEMENT の 2 文目 | X-2 |
| 表 T-109 の `IC-161`（基準を変える）の行・`_assets/fig-icons.svg` の図形・辞書の区 `icons` の `IC-161` | 消す（X-12）。hint の字（`JDG-1977`）は `keepGlobalTimeHint` へ |
| 表 T-233 の `RS-90` の行・`notice-reasons.json` の `RS-90`・辞書の区 `reasons` の `RS-90` | 消す（X-15）。番号は再び使わない |
| 表 T-280 の出来事 `baseChangeWayChosen` と、`drafted` が運ぶ `chosenWay` | 消す（X-11）。`chosenWay` は `baseChangeEntryPressed` が運ぶ |
| 辞書の区 `timeZoneField` の部 `example` | `beforeLine`・`afterLine`（X-13） |
| 辞書の区 `timeZones` の 28 語（行 ID `ZN-1`〜`ZN-28`） | 39 行の地名（X-14） |
| 表 T-369 の `FO-14`・`FO-15` の「欄」と「名の語」の升 | X-10 |
| 表 T-375 の `TX-11` の升（`->` の 1 行） | X-16 |
| 表 T-108 の `CM-94`・`CM-95` の説明の括弧の中の旧い語 | X-17 |
| 表 T-104 の `K-144` の ja「基準のタイムゾーン」と en `viewTimeZone`、`K-145` の en `displayTimeZones` | X-10（`JDG-2106`） |
| `erd.json` の `Project.scheduleDataTimeZone` の `schemaNote`（`CR-751` の「The region whose wall clock the schedule date-times are…」）と、`erd_json_to_schema.py` の `VALUES_FROM['T-376']`（地域名の列） | X-18 |
| `tools/generate_time_zone_roster.py` の見出し `地域名`・`標準時の UTC の差`・`夏時間` の読みと名簿の 3 項 | X-19 |
| `05-07-design.md` の 表 T-075 の `UF-202` の説明（「地域の規則で UTC の差を読む時計」「この PC の地域を…」） | X-21 |
| `published-entries.json` の注「この PC の地域を 表 T-376 の行へ寄せる（`FR-156`・`RS-90`）」 | X-21 |
| 表 T-342 の `BK-4` の「新しく始めたその PC の地域（…表 T-376 の `ZN-13` を持ち…）」 | X-20 |
| `src` の `zoneClockOf` の `Intl` の読み・`regionForPc`・`readPcRegion`・`PcTimeZone.region`・`RS-90` を告げる 3 か所・`properties-panel.ts` の `BASE_CHANGE_ENTRY`・`CHOSEN_WAY_KEY`・`isBaseChangeIdle`・`baseExampleLine` と欄の読み取りの行 | 5 節 |
| 地域名を持つデータ 10 ファイル（X-22） | 鍵へ書き換える |

---

## 4. 書き直す所

⭐ 4.1〜4.4 と 4.9 の `BK-4` は 1 つの閉路（6 節: `BK-4`・`FO-14`・`FO-15`・`FR-017`・`FR-095`・`FR-156`・`IC-161`・`IC-98`・`RS-90`・`S-574`・`S-575`・`TX-11`）に入る —— **1 つの体が 1 度に書く**。

### 4.1 `FR-017`

#### X-1 —— 「表示するタイムゾーン（`FR-156`）は、時刻を表示しているあいだ、…」の文と「⭐ 帯の高さを変えるのは…」の文のあいだに足す

```
時刻を表示しているあいだ、見せる基準の時の行（表 T-238 の `TM-5` の 2 行目。目盛が時の段のときだけ）と、表示するタイムゾーンの各段について、その段の左の、タスクグループパネルの上の空欄に、そのタイムゾーンの略称（`FR-156` の 表 T-376 の行が持つ 1 つ）を右寄せで刷ること（MUST） —— どの段をどの時計で読むかが、段ごとに読める（利用者の判断）。
略称は行ごとに決まっていて、見えている日や季節で変わらない（利用者の判断）。
略称を持たない行は、`FR-038` の辞書の `timeZoneField` の `offsetName` の形で、その行の UTC の差を刷る（例 `UTC-12`）。
字は目盛のラベルと同じ大きさと色とし、右端はタスクグループパネルの右端から `_assets/tbl-settings.md` の 表 T-206 の `S-313` 内側とする。
⚠️ パネルの最上部の段には頭の操作子（表 T-051 の `HF-10`）が在る —— 略称を刷る段は 2 段目より下なので重ならない。
書き出す絵（`FR-025`）にも刷る（`05-07-design.md` の 表 T-076 の `EP-2`・`EP-3`）。
```

### 4.2 `FR-156`

#### X-2 —— STATEMENT の 2 文目

旧:

```
作成者が文書の設定の面で基準を変えたときは、選んだ選び方に従って、見せる基準だけを変えるか、日程データのタイムゾーンを付け替えること。
```

新:

```
作成者が文書の設定の面で基準に別のタイムゾーンを選び、答えを押したときは、その答えに従って、見せる基準を選んだタイムゾーンにするか、日程データのタイムゾーンを選んだタイムゾーンに付け替えて見せる基準を日程データのタイムゾーンへ戻すこと。
```

#### X-3 —— RATIONALE の「タイムゾーンの値は地域名とし、…自動に効く。」「固定の時差で持ってはならない（MUST NOT）。」を置き換える

```
タイムゾーンは、1 つの固定の UTC の差と 1 つの略称で決まるものとし、値は 表 T-376 の鍵とすること（MUST）（利用者の判断） —— 鍵は略称ではない（略称は行の間でぶつかる）。
⛔ 夏時間を季節で自動に切り替えてはならない（MUST NOT） —— 夏時間の行も 1 年中その差で読む（例 PDT の行は 1 月でも UTC-7）（利用者の判断）。
日程データのタイムゾーン（`AT-157`）と見せる基準（`S-574`）は、表 T-376 の種が標準時の行だけから選ばせ、表示するタイムゾーン（`S-575`）はすべての行から選ばせること（MUST）（利用者の判断） —— 夏時間で時刻を読みたい人は、表示の段で読む。
```

`CR-751` が足した 2 文（`RS-25` で拒む ／ `OP-6` で既定へ戻す）は文言を保ち、「表 T-376 に無い値」の後に「（基準の 2 つは、種が標準時の行に無い値）」を足す（X-9 で 1 文にまとめる）。

#### X-4 —— 表 T-376 を作り替える

表の見出し「表 T-376 — タイムゾーンの選択肢」は保つ。列は 行 ID・鍵・UTC の差・種・略称・略称の出どころ の 6 つ。下の表の「今の行と略称」「名（ja）」「名（en）」の 3 列は本書の見立てで、表には書かない（名は辞書と X-5 の形で組む）。

| 行 ID（仮） | 鍵 | UTC の差 | 種 | 略称 | 略称の出どころ | 今の行と略称 | 名（ja） | 名（en） |
|---|---|---|---|---|---|---|---|---|
| ZN-29 | `UTC-12:00` | −12:00 | 標準時 | — | — （住む人がいない） | ZN-1 — | UTC -12:00 日付変更線の西 | UTC -12:00 International Date Line West |
| ZN-30 | `UTC-11:00` | −11:00 | 標準時 | SST | 米国（米領サモア） | ZN-2 SST | UTC -11:00 SST サモア（米領） | UTC -11:00 SST American Samoa |
| ZN-31 | `UTC-10:00` | −10:00 | 標準時 | HST | 米国（ハワイ） | ZN-3 HST | UTC -10:00 HST ハワイ | UTC -10:00 HST Hawaii |
| ZN-32 | `UTC-09:00` | −09:00 | 標準時 | AKST | 米国（アラスカ） | ZN-4 AKST | UTC -9:00 AKST アラスカ標準時 | UTC -9:00 AKST Alaska Standard Time |
| ZN-33 | `UTC-08:00` | −08:00 | 標準時 | PST | 米国（太平洋岸） | ZN-5 PST | UTC -8:00 PST 太平洋標準時（米国・カナダ） | UTC -8:00 PST Pacific Standard Time (US and Canada) |
| ZN-34 | `UTC-08:00 DST` | −08:00 | 夏時間 | AKDT | 米国（アラスカ） | ZN-4 AKDT | UTC -8:00 AKDT アラスカ夏時間 | UTC -8:00 AKDT Alaska Daylight Time |
| ZN-35 | `UTC-07:00` | −07:00 | 標準時 | MST | 米国（山岳部） | ZN-6 MST | UTC -7:00 MST 山岳部標準時（米国・カナダ） | UTC -7:00 MST Mountain Standard Time (US and Canada) |
| ZN-36 | `UTC-07:00 DST` | −07:00 | 夏時間 | PDT | 米国（太平洋岸） | ZN-5 PDT | UTC -7:00 PDT 太平洋夏時間（米国・カナダ） | UTC -7:00 PDT Pacific Daylight Time (US and Canada) |
| ZN-37 | `UTC-06:00` | −06:00 | 標準時 | CST | 米国（中部） | ZN-7 CST | UTC -6:00 CST 中部標準時（米国・カナダ） | UTC -6:00 CST Central Standard Time (US and Canada) |
| ZN-38 | `UTC-06:00 DST` | −06:00 | 夏時間 | MDT | 米国（山岳部） | ZN-6 MDT | UTC -6:00 MDT 山岳部夏時間（米国・カナダ） | UTC -6:00 MDT Mountain Daylight Time (US and Canada) |
| ZN-39 | `UTC-05:00` | −05:00 | 標準時 | EST | 米国（東部） | ZN-8 EST | UTC -5:00 EST 東部標準時（米国・カナダ） | UTC -5:00 EST Eastern Standard Time (US and Canada) |
| ZN-40 | `UTC-05:00 DST` | −05:00 | 夏時間 | CDT | 米国（中部） | ZN-7 CDT | UTC -5:00 CDT 中部夏時間（米国・カナダ） | UTC -5:00 CDT Central Daylight Time (US and Canada) |
| ZN-41 | `UTC-04:00` | −04:00 | 標準時 | AST | カナダ（大西洋岸）—— 今の略称（`JDG-2243`） | ZN-9 AST | UTC -4:00 AST 大西洋標準時（カナダ） | UTC -4:00 AST Atlantic Standard Time (Canada) |
| ZN-42 | `UTC-04:00 DST` | −04:00 | 夏時間 | EDT | 米国（東部） | ZN-8 EDT | UTC -4:00 EDT 東部夏時間（米国・カナダ） | UTC -4:00 EDT Eastern Daylight Time (US and Canada) |
| ZN-43 | `UTC-03:00` | −03:00 | 標準時 | BRT | ブラジル（ブラジリア時間） | ZN-10 — | UTC -3:00 BRT サンパウロ | UTC -3:00 BRT Sao Paulo |
| ZN-44 | `UTC-03:00 DST` | −03:00 | 夏時間 | ADT | カナダ（大西洋岸）—— 今の略称（`JDG-2243`） | ZN-9 ADT | UTC -3:00 ADT 大西洋夏時間（カナダ） | UTC -3:00 ADT Atlantic Daylight Time (Canada) |
| ZN-45 | `UTC-02:00` | −02:00 | 標準時 | WGT | グリーンランド（ヌーク） | ZN-11 — | UTC -2:00 WGT ヌーク・南ジョージア | UTC -2:00 WGT Nuuk, South Georgia |
| ZN-46 | `UTC-01:00` | −01:00 | 標準時 | CVT | カーボベルデ | ZN-12 — | UTC -1:00 CVT カーボベルデ・アゾレス | UTC -1:00 CVT Cape Verde, Azores |
| ZN-47 | `UTC+00:00` | ±00:00 | 標準時 | UTC | 協定世界時 —— 国の略称の外（`JDG-2242`） | ZN-13 UTC ／ ZN-14 GMT | UTC ±0:00 UTC 協定世界時・ロンドン | UTC ±0:00 UTC Coordinated Universal Time, London |
| ZN-48 | `UTC+00:00 DST` | ±00:00 | 夏時間 | AZOST | ポルトガル（アゾレス） | ZN-12 — | UTC ±0:00 AZOST アゾレス夏時間 | UTC ±0:00 AZOST Azores Summer Time |
| ZN-49 | `UTC+01:00` | +01:00 | 標準時 | CET | 中央ヨーロッパ（ドイツ・フランス）—— 今の略称（`JDG-2243`） | ZN-15 CET | UTC +1:00 CET 中央ヨーロッパ（ベルリン・パリ） | UTC +1:00 CET Central Europe (Berlin, Paris) |
| ZN-50 | `UTC+01:00 DST` | +01:00 | 夏時間 | BST | 英国 | ZN-14 BST | UTC +1:00 BST ロンドン夏時間 | UTC +1:00 BST London Summer Time |
| ZN-51 | `UTC+02:00` | +02:00 | 標準時 | EET | エジプト | ZN-16 EET | UTC +2:00 EET カイロ・東ヨーロッパ（ヘルシンキ） | UTC +2:00 EET Cairo, Eastern Europe (Helsinki) |
| ZN-52 | `UTC+02:00 DST` | +02:00 | 夏時間 | CEST | ドイツ | ZN-15 CEST | UTC +2:00 CEST 中央ヨーロッパ夏時間（ベルリン・パリ） | UTC +2:00 CEST Central European Summer Time (Berlin, Paris) |
| ZN-53 | `UTC+03:00` | +03:00 | 標準時 | MSK | ロシア（モスクワ）—— 今の略称（`JDG-2243`） | ZN-17 MSK | UTC +3:00 MSK モスクワ | UTC +3:00 MSK Moscow |
| ZN-54 | `UTC+03:00 DST` | +03:00 | 夏時間 | EEST | エジプト | ZN-16 EEST | UTC +3:00 EEST 東ヨーロッパ夏時間（カイロ・ヘルシンキ） | UTC +3:00 EEST Eastern European Summer Time (Cairo, Helsinki) |
| ZN-55 | `UTC+04:00` | +04:00 | 標準時 | GST | アラブ首長国連邦 | ZN-18 — | UTC +4:00 GST ドバイ | UTC +4:00 GST Dubai |
| ZN-56 | `UTC+05:00` | +05:00 | 標準時 | PKT | パキスタン | ZN-19 PKT | UTC +5:00 PKT カラチ | UTC +5:00 PKT Karachi |
| ZN-57 | `UTC+05:30` | +05:30 | 標準時 | IST | インド | ZN-20 IST | UTC +5:30 IST インド | UTC +5:30 IST India |
| ZN-58 | `UTC+06:00` | +06:00 | 標準時 | BST | バングラデシュ | ZN-21 — | UTC +6:00 BST ダッカ | UTC +6:00 BST Dhaka |
| ZN-59 | `UTC+07:00` | +07:00 | 標準時 | WIB | インドネシア（ジャワ・スマトラ） | ZN-22 — | UTC +7:00 WIB ジャカルタ・バンコク | UTC +7:00 WIB Jakarta, Bangkok |
| ZN-60 | `UTC+08:00` | +08:00 | 標準時 | CST | 中国 | ZN-23 — | UTC +8:00 CST 北京・シンガポール | UTC +8:00 CST Beijing, Singapore |
| ZN-61 | `UTC+09:00` | +09:00 | 標準時 | JST | 日本 | ZN-24 JST | UTC +9:00 JST 東京 | UTC +9:00 JST Tokyo |
| ZN-62 | `UTC+10:00` | +10:00 | 標準時 | AEST | オーストラリア（東部） | ZN-25 AEST | UTC +10:00 AEST シドニー | UTC +10:00 AEST Sydney |
| ZN-63 | `UTC+11:00` | +11:00 | 標準時 | SBT | ソロモン諸島 | ZN-26 — | UTC +11:00 SBT ホニアラ・ヌメア | UTC +11:00 SBT Honiara, Noumea |
| ZN-64 | `UTC+11:00 DST` | +11:00 | 夏時間 | AEDT | オーストラリア（東部） | ZN-25 AEDT | UTC +11:00 AEDT シドニー夏時間 | UTC +11:00 AEDT Sydney Daylight Time |
| ZN-65 | `UTC+12:00` | +12:00 | 標準時 | NZST | ニュージーランド | ZN-27 NZST | UTC +12:00 NZST オークランド | UTC +12:00 NZST Auckland |
| ZN-66 | `UTC+13:00` | +13:00 | 標準時 | WST | サモア | ZN-28 — | UTC +13:00 WST サモア・トンガ | UTC +13:00 WST Samoa, Tonga |
| ZN-67 | `UTC+13:00 DST` | +13:00 | 夏時間 | NZDT | ニュージーランド | ZN-27 NZDT | UTC +13:00 NZDT オークランド夏時間 | UTC +13:00 NZDT Auckland Daylight Time |

⭐ 39 行の内訳: 標準時 27（今の 28 地域の標準時の差。`UTC` と `Europe/London` がどちらも ±00:00 なので 1 行にまとめた）・夏時間 12（今の夏時間「有」の 12 地域の夏の差）。差の重なる行は種が違えば別の行である（例 −07:00 は MST と PDT）。略称を持たない行は `UTC-12:00` の 1 行（X-p）。13 節の数え方。
⭐ 略称の出どころ（X-c）: ±0:00 の標準時は `UTC`（`JDG-2242`）。今の表で地域が IANA の字の略称を持っていた行は、その略称（出どころの列は「今の略称」と書いた行のほか、今の略称と規則の答えが同じ行 —— `SST`・`HST`・`PST`・`EST`・`JST` など）。残る 10 行（`BRT`・`WGT`・`CVT`・`AZOST`・`GST`・+6:00 `BST`・`WIB`・+8:00 `CST`・`SBT`・`WST`）は、その時差を標準時（夏時間の行は夏時間）として使う所に住む人の数がいちばん多い国（`JDG-2243` —— 規則はこの行だけを埋める）。人口は国連の World Population Prospects 2024 の 2024 年の推計、国の一部だけならその州・地域の統計で比べた —— 差の近い所は +4:00（アラブ首長国連邦 と アゼルバイジャン の AZT）。⚠️ 当てる体は残る 10 行の人口を数え直し、代表が替わるなら升だけを直す（今の略称を保つ行は数えない）。

表の下の注を置き換える:

```
鍵は時差と種（標準時 ／ 夏時間）で決まり、保存するのは鍵だけである —— 略称は見せる名と目盛の段の字であり、行の間で同じ字を持つことがある（CST・BST）。
±0:00 の標準時の略称は UTC とする（利用者の判断）。
地域名の 28 行の表で地域が略称を持っていた時差の行は、その略称を保つ（利用者の判断）。
ほかの行の略称は、その時差を時刻として使う所に住む人の数がいちばん多い国の、その時刻の名とする（利用者の判断）。
その時差を時刻として使う人がいない行は略称を持たない（`—`）。
本表の並びは時差の小さい順、同じ時差では標準時を先とする。
```

#### X-5 —— RATIONALE の「見せる名は `FR-038` の辞書の `timeZones` が 表 T-376 の行ごとに持つ（例「(UTC+09:00) 東京」）。」を置き換える

```
見せる名は、表 T-376 の UTC の差と略称と、`FR-038` の辞書の `timeZones` が行ごとに持つ地名とを、辞書の `timeZoneField` の `zoneName` の形でつないだものとすること（MUST）（利用者の判断） —— 例「UTC +9:00 JST 東京」「UTC -7:00 PDT 太平洋夏時間（米国・カナダ）」。
差は時を 0 で埋めず分を 2 桁とし、0 は `±0:00` と書く。
略称を持たない行は、略称の部を詰める（例「UTC -12:00 日付変更線の西」）。
```

#### X-6 —— RATIONALE の「基準を変える 2 つの選び方を、次の語で示し、…」から「⛔ `IC-161` は確認を取らずに当て、…（利用者の判断）。」までを置き換える

```
基準の欄は、表 T-104 の `K-144` の名で、表 T-376 の種が標準時の行を選ぶ欄を 1 つ置く。
⭐ その欄で、いまの見せる基準と違うタイムゾーンを選んだときだけ、欄のすぐ下に、辞書の `timeZoneField` の `baseChangeQuestion` の 1 行と、次の 3 つの答えを 1 行に 1 つずつ出すこと（MUST）（利用者の判断）:

- 換算して適用する —— 見せる基準（`S-574`）を選んだタイムゾーンにし、保存の数字は変えない（同じ瞬間を新しいタイムゾーンの時刻で見せる）。
- 換算しない —— 日程データのタイムゾーン（`AT-157`）を選んだタイムゾーンに付け替え、見せる基準を `null`（日程データのタイムゾーンと同じ）に戻す。保存の数字は変えない（瞬間は動き、数字は新しいタイムゾーンの時刻として読む）。
- キャンセル —— 選んだタイムゾーンを取り消し、基準を変えない。

語は `FR-038` の辞書の `timeZoneField` の `keepGlobalTime`・`keepLocalTime`・`cancelBaseChange` が持つ。
換算して適用する と 換算しない の下には、その答えで当てる前と後の時刻を、辞書の `beforeLine` と `afterLine` の 2 行に分けて添えること（MUST）（利用者の判断） —— 時刻は、開始を持つ最初のタスク（文書の `Task` の並びの順）の開始の日時を、前はいまの見せる基準で、後はその答えで当てた後の見せる基準で見せ、それぞれにそのタイムゾーンの略称を添えた字（表 T-375 の `TX-11`）とする。
開始を持つタスクが無いときは、前と後の行を出さない。
⭐ どちらの答えでも、押した後は選んだタイムゾーンが基準の欄に示され、画面の日時はすべてその時刻で見える（利用者の判断）。
⭐ タイムゾーンを選んだだけでは当てず、答えを押したときに当てること（MUST） —— 前と後の時刻を読んでから当てる（利用者の判断）。
選んだタイムゾーンは、答えるまで画面の値（`_assets/tbl-state-machines.md` の 表 T-280 の `baseTimeZoneDraftStateMachine`）が持つ。
⛔ 答えは確認を取らずに当て、取り消し 1 回で戻せること（MUST）（`FR-031` の 表 T-027 の `UN-13`） —— 換算しない の 2 つの書き換えも 1 回の書き込みとする。
確認を取るのは、データを大幅に書き換えるタイムシフト（`FR-157`）だけである（利用者の判断）。
```

#### X-7 —— RATIONALE の「表示するタイムゾーン（`S-575`）は 0 〜 4 つとし、…」の文の後に足す

```
表示するタイムゾーンの欄は、基準の欄の下に、`K-145` の名に番号（1 〜 4）を添えた選ぶ欄を 1 行に 1 つずつ 4 行置き、どれも「なし」と 表 T-376 のすべての行を選べる（利用者の判断）。
```

#### X-8 —— 「⭐ MSPDI を置き換えて開いた文書と…（例 UTC+05:45 は `ZN-20`）。」と「寄せたこと・決めたことを 表 T-233 の `RS-90` で告げること（MUST） —— …」を置き換える

```
⭐ MSPDI を置き換えて開いた文書と、新しく作った文書（表 T-342 の `BK-4`）の日程データのタイムゾーンは、その PC の標準時の行とすること（MUST） —— 夏時間の季節に開いても標準時とする（例 太平洋時間の PC は 8 月でも `UTC-08:00`）（利用者の判断）。
PC の標準時は、その PC の今年の 1 月 1 日と 7 月 1 日の UTC の差の小さいほうとする。
表 T-376 の標準時の行に同じ差が無いときは、差が最も近い標準時の行（同じ近さなら本表の上の行）へ寄せる（例 UTC+05:45 は `UTC+05:30`）。
⛔ 寄せたことも決めたことも告げない（利用者の判断） —— MSPDI を開くたびに知らせが出るのは煩わしい。基準の欄が示すので、読む人はそこで分かる。
```

（「MSPDI を合流・重ねで読むときは、今の文書の日程データのタイムゾーンを変えない。」と「⛔ 日程データのタイムゾーンを MSPDI へ書いてはならない（MUST NOT）」は保つ。）

#### X-9 —— `CR-751` の 2 文（「⛔ 日程データのタイムゾーンが 表 T-376 に無い値の `GRS JSON` は開かず…」「見せる基準（`S-574`）と表示するタイムゾーン（`S-575`）に…`OP-6`）。」）を置き換える

```
⛔ 日程データのタイムゾーンが 表 T-376 の種が標準時の行の鍵でない `GRS JSON` は開かず、表 T-233 の `RS-25` で拒むこと（MUST） —— 名簿の外の値を黙って別のタイムゾーンとして読むと、保存した数字が書き手の意図と違う瞬間を指す（利用者の判断）。
見せる基準（`S-574`）が標準時の行の鍵でないとき、表示するタイムゾーン（`S-575`）に 表 T-376 の鍵でない値があるときは、文書を拒まず、そのキーを既定へ戻す（`FR-087` の 表 T-024a の `OP-6`）。
```

### 4.3 `FR-072` の 表 T-369 と 表 T-104

#### X-10 —— `FO-14`・`FO-15` と `K-144`・`K-145`

| 行 ID | 欄 | 名の語 | 規則 |
| --- | --- | --- | --- |
| FO-14 | 本プロジェクトの基準タイムゾーン（標準時の行を選ぶ欄。いまの見せる基準と違うタイムゾーンを選んだときだけ、その下に「スケジュールデータの時刻:」と 3 つの答え、2 つの答えには前と後の時刻の 2 行） | 表 T-104 の `K-144`（答えの語は辞書の `timeZoneField` の `baseChangeQuestion`・`keepGlobalTime`・`keepLocalTime`・`cancelBaseChange`・`beforeLine`・`afterLine`） | `FR-156` |
| FO-15 | 表示するタイムゾーン 1 〜 4（選ぶ欄を 1 行に 1 つずつ 4 行。どれも「なし」とすべての行を選べる） | 表 T-104 の `K-145` に番号を添える | `FR-156` |

表 T-104 と辞書の区 `settings`（`JDG-2106`、問い 3 の答え A）:

| 行 | ja（旧 → 新） | en（旧 → 新） |
|---|---|---|
| `K-144` | 基準のタイムゾーン → 本プロジェクトの基準タイムゾーン | `viewTimeZone` → `Project Base Time Zone` |
| `K-145` | 表示するタイムゾーン（変えない。番号は欄が添える） | `displayTimeZones` → `Display Time Zone`（行は `Display Time Zone 1`〜`4`） |

### 4.4 表 T-280（`state-machines.json` の領域 `screen`）

#### X-11 —— `baseTimeZoneDraftStateMachine` を作り替える（`CR-742` の X-13 の形を引き継ぐ）

| 状態 | 初め | 運ぶもの | 根拠 |
|---|:--:|---|---|
| `untouched` | ○ | — | `FO-14`・`FR-156` |
| `drafted` | | `chosenRegion`（表 T-376 の標準時の行の鍵。いまの見せる基準と違う） —— ⚠️ `chosenWay` は運ばない | `FR-156`・`FO-14` |

| 出来事 | 出どころ | 運ぶもの | `untouched` | `drafted` |
|---|---|---|---|---|
| `baseTimeZoneChosen` | 入力（`FO-14` の選ぶ欄で選んだ）・`FR-156` | `chosenRegion` | → `drafted` [`isOtherThanShownBase`]、それ以外 → — | → 自己（`chosenRegion` を書き換える）[`isOtherThanShownBase`]、それ以外 → `untouched`（X-j） |
| `baseChangeEntryPressed` | 入力（`FO-14` の答え 換算して適用する ／ 換算しない を押した）・`FR-156` —— ⚠️ `IC-161` を外す | `chosenWay`（`keepGlobalTime` ／ `keepLocalTime`） | — | → `untouched` / `issueBaseChangeCommand`（`keepGlobalTime` は `CM-95` を、`keepLocalTime` は `CM-94` と `CM-95`（`null`）を、1 回の書き込みで出す。確認を取らない） |
| `baseChangeCancelPressed`（新） | 入力（`FO-14` の答え キャンセル を押した）・`FR-156` | — | — | → `untouched` |
| `surfaceCloseAsked` ほか、文書の設定を離れる 7 つと `documentReplacedByOpenOrNew` | 既にある出来事 | — | — | 変えない（`isLeavingDocumentSettings` のまま） |

⛔ `baseChangeWayChosen` を消す。⭐ `isOtherThanShownBase` の「いまの見せる基準」は `S-574`、空なら `AT-157`。運ぶ値の名 `chosenRegion` は保つ（X-g。値は地域名から鍵に変わる）。`npm run gen` が `_assets/tbl-state-machines.md` と `src/use-case/advance-screen-session/screen-values.ts` の生成の区画を作り直す。

### 4.5 表 T-109（アイコンの全数）

#### X-12 —— `IC-161` の行を消す

`_assets/tbl-glossary.md` の 表 T-109 の `IC-161` の行、`_assets/fig-icons.svg` の `IC-161` の図形、辞書の区 `icons` の `IC-161`、`published-entries.json` の `baseChangeCommandOf` の注の「表 T-109 の `IC-161`」（→「表 T-369 の `FO-14` の答え」）。⛔ 番号 `IC-161` は再び使わない。生成物（`icon-roster.json`・`icon-glyphs.json`・`help-roster.json` ほか）は `npm run gen` が作り直す。`properties-panel.ts` の `IN_FIELD_ENTRIES` に `IC-161` が在れば外す（`DFC-2517`）。

### 4.6 辞書（`FR-038`）

#### X-13 —— 区 `timeZoneField`

| 部 | ja | en | 旧 |
|---|---|---|---|
| `baseChangeQuestion`（新） | スケジュールデータの時刻: | Schedule data times: | — |
| `keepGlobalTime` | 換算して適用する | Convert and Apply | グローバルタイム（UTC）を保つ ／ Keep Global Time (UTC) |
| `keepLocalTime` | 換算しない | Don't Convert | ローカルタイムを保つ ／ Keep Local Time |
| `cancelBaseChange`（新） | キャンセル | Cancel | — |
| `beforeLine`（新） | 変更前: {time} | Before: {time} | — |
| `afterLine`（新。`example` に替わる） | 変更後: {time} | After: {time} | 例: {name} {before} -> {after} |
| `keepGlobalTimeHint`（新。`JDG-1977` の字を `IC-161` の hint から移す） | 選んだタイムゾーンを表示の基準にする。スケジュールの日時の値は書き換えない | Use the chosen time zone as the base for display. The schedule date-time values are not rewritten | — |
| `keepLocalTimeHint`（新） | 選んだタイムゾーンを、スケジュールの日時の数字が指すタイムゾーンにする。数字は書き換えず、瞬間が動く | Make the chosen time zone the one the schedule date-time numbers are read in. The numbers are not rewritten, so the instants move | — |
| `zoneName`（新） | UTC {offset} {abbreviation} {place} | UTC {offset} {abbreviation} {place} | — |
| `offsetName`（新） | UTC{offset} | UTC{offset} | — |

⚠️ `{abbreviation}` が空のときは前の空白ごと詰める（X-5）。en の語は X-t・X-u（推奨を採った（利用者不在、`JDG-1696` に従う））。

#### X-14 —— 区 `timeZones`

28 語（行 ID `ZN-1`〜`ZN-28`）を消し、39 行の地名（X-4 の表の名から「UTC」・差・略称を除いた語。例 `ZN-61` 東京 ／ Tokyo、`ZN-36` 太平洋夏時間（米国・カナダ） ／ Pacific Daylight Time (US and Canada)）を行 ID ごとに置く。`tools/generate_display_words.py` の注（「the table holds the region name and the offset, and the name a person reads is the dictionary's」）を「the table holds the key, the offset and the abbreviation, the dictionary the place」に直す。

#### X-15 —— 区 `reasons` と 表 T-233 の `RS-90`

`RS-90` の行を 表 T-233（`_assets/tbl-notice-reasons.md`、生成元 `notice-reasons.json`）と辞書の区 `reasons` から消す。⛔ 番号 `RS-90` は再び使わない。`CR-750` の語（次の一手）も行ごと消える。

### 4.7 表 T-375 と 表 T-108

#### X-16 —— 表 T-375 の `TX-11`

```
| TX-11 | 基準を変える答え（換算して適用する ／ 換算しない）の下に添える、変更前と変更後の時刻（`FR-156`、`FR-072` の 表 T-369 の `FO-14`）。<br>⭐ 時刻を表示しないときも時刻を添える —— 基準の変更が動かすのは時刻である。<br>前と後は 2 行に分け、それぞれ、その時刻を読むタイムゾーンの略称（`FR-156` の 表 T-376。略称を持たない行は `offsetName` の形）を添える | `4/1 8:00 PST` | `4/1 8:00 PST` | — |
```

例（基準 PST、最初のタスクの開始 4/1 8:00 PST、東京を選んだとき）:

```
スケジュールデータの時刻:
[換算して適用する]
変更前: 4/1 8:00 PST
変更後: 4/2 1:00 JST
[換算しない]
変更前: 4/1 8:00 PST
変更後: 4/1 8:00 JST
[キャンセル]
```

#### X-17 —— 表 T-108 の説明の括弧

- `CM-94`: 「日程データのタイムゾーンを付け替える（換算しない —— 保存の数字は変えない。見せる基準を戻す `CM-95` と 1 回の書き込みにする）」
- `CM-95`: 「見せる基準を変える（換算して適用する）」

### 4.8 `GRS JSON` のスキーマ（`CR-751` の仕組みの値を置き換える）

#### X-18 —— `erd.json`・`settings.json`・`erd_json_to_schema.py`

- `erd_json_to_schema.py` の `VALUES_FROM['T-376']` が返すものを、地域名の列から**鍵の列**（39 個、表の順）にする。`"only": "standard"` を持つ欄には、種が標準時の行の鍵（27 個）だけを返す（絞りの綴りは当てる体が決める）。読みは `generate_time_zone_roster.build()` の 1 つのまま（再び打たない）。
- `erd.json` の `Project.scheduleDataTimeZone` と `settings.json` の `S-574`（`viewTimeZone`、`null` を取る）に絞り `standard` を足す。`S-575`（`displayTimeZones`）は絞らない（`maxItems` 4 は保つ）。
- `Project.scheduleDataTimeZone` の `schemaNote`（`CR-751` の英文）を置き換える:

```
The fixed UTC offset whose wall clock the schedule date-times are, as a standard-time key
such as UTC+09:00. Daylight saving is never applied by season. Not written to MS Project,
which has no place for it.
```

- `S-575` の `schemaNote`（無ければ足す）:

```
Up to four extra clocks shown under the time ruler. A key ending in " DST" is a daylight-time
zone read at that offset all year.
```

- 生成物（`grs-document.schema.json`・`src/adapter/document-codec/grs-json-schema.ts`・`image-to-grs-json-prompt.json`・エンティティの型・`_assets/tbl-settings.md`）は `npm run gen` が作り直す。⚠️ `enum` の値が変わるので、地域名を書いた `GRS JSON` は開くと拒まれる（X-s。古い読みは作らない）。形式の版（`SCHEMA_VERSION`）を上げるかは、版を決める今の決まりに従う（当てる体が確かめる）。

### 4.9 生成器・`BK-4`・設計の書

#### X-19 —— `tools/generate_time_zone_roster.py`

見出し「鍵」「UTC の差」「種」「略称」で読み、名簿の項 `rowId`・`key`・`offsetMinutes`・`isDaylight`・`abbreviation`（`—` は `null`）を書く。断る: 鍵が `^UTC[+-]\d{2}:\d{2}( DST)?$` でない・鍵の差と「UTC の差」の升が食い違う・種が「夏時間」なのに鍵に ` DST` が無い（逆も）・略称が `^[A-Z]{2,5}$` でも `—` でもない・同じ鍵が 2 行に在る。

#### X-20 —— 表 T-342 の `BK-4`（`FR-095`）

「`scheduleDataTimeZone` を新しく始めたその PC の地域（`FR-156` —— 刷った空の文書は 表 T-376 の `ZN-13` を持ち、新しく始めたときに書き換える）」→「`scheduleDataTimeZone` を新しく始めたその PC の標準時の行の鍵（`FR-156` —— 刷った空の文書は 表 T-376 の `UTC+00:00` の行を持ち、新しく始めたときに書き換える）」。`tools/generate_startup_template.py` の `PRINTED_SCHEDULE_DATA_TIME_ZONE = 'UTC'` を `'UTC+00:00'` にする。

#### X-21 —— `05-07-design.md` の 表 T-075 の `UF-202` と `published-entries.json`

`UF-202` の説明の「地域の規則で UTC の差を読む時計」→「表 T-376 の行の固定の UTC の差で読む時計」、「この PC の地域を…」→「この PC の標準時の差を表 T-376 の標準時の行へ寄せる」。`published-entries.json` の注「この PC の地域を 表 T-376 の行へ寄せる（`FR-156`・`RS-90`）」→「この PC の標準時を 表 T-376 の標準時の行へ寄せる（`FR-156`）」。

#### X-22 —— 地域名を持つデータを鍵へ書き換える（`4a907919` で数えた。13 節）

| ファイル | 数 | 今の値 → 新 |
|---|---|---|
| `docs/development-records/project-plan.json` | 2 | `scheduleDataTimeZone`・`viewTimeZone` の `Asia/Tokyo` → `UTC+09:00` |
| `studies/38-project-progress/gr-scheduler-progress-2026-10-15.json` | 1 | `Asia/Tokyo` → `UTC+09:00` |
| `studies/38-project-progress/README.md` | 1（文） | 「`scheduleDataTimeZone` = `Asia/Tokyo`」→「`UTC+09:00`」 |
| `docs/guides/schedule-to-grs-json/grs-skeleton.json` | 1 | `UTC` → `UTC+00:00` |
| `src/framework/single-html-shell/empty-document.json`・`startup-template.json` | 1・1 | `UTC` → `UTC+00:00`（生成物 —— X-20 の定数を直して `npm run gen`） |
| `tests/fixtures/measuring-document.json` | 1 | `UTC` → `UTC+00:00` |
| `tests` の 6 本（`cr-718-…`・`cr-719-stage.ts`・`dfc-577-…`・`document-invariants.contract.test.ts`・`integration/schedule-drawing.sws.test.ts`・`unit/uf-8-9-replace-document.test.ts`） | 各 1 | `scheduleDataTimeZone: 'UTC'` → `'UTC+00:00'` |
| `tests` の地域名を名指す 4 本（`cr-751-a-region-outside-t-376-…`（10 行）・`fr-101-…`（1）・`state-machine-screen-values.contract.test.ts`（2）・`system/measured-sweep.test.ts`（1）） | 14 行 | 鍵に書き換える。`cr-751-…` の「名簿の外の地名は拒まれる」は「地域名と夏時間の鍵（基準の欄）は拒まれる」に書き直す |
| `tools/schema-only-writer/writer-brief.md` | 1（文） | 「the schedule's time zone is Asia/Tokyo」→「UTC+09:00」 |
| `dist/index.html` | 2 | 組み直しで変わる（手で直さない） |
| `sample-schedule/` | 0 | `Three-Year Product Plan.json` はタイムゾーンの鍵を持たず、残りは MSPDI（`.xml`） |
| `docs/development-records/measurements/x14-2026-10-15-cr-751/` | 6 | 書き換えない（前の試験の記録。X-s） |

`UTC` の 10 か所（`grs-skeleton.json`・`empty-document.json`・`startup-template.json`・`measuring-document.json`・`tests` の 6 本）と `Asia/Tokyo` の進捗の 1 か所は、`CR-751` の席の数えと同じ。

---

## 5. 継ぎ目（コード）と試験 —— 当てる体への見込み（場所は `4a907919`）

持ち場はファイルで分ける。A を先に当て、B と C は並べて走れる。

| 持ち場 | 仕様の行 | `src` の場所 | 中身 |
|---|---|---|---|
| A 名簿と時計と PC（Entity ／ Framework ／ 生成器） | 表 T-376・`FR-156`・`BK-4`・`zoneName`・`offsetName` | `tools/generate_time_zone_roster.py`（X-19）・生成の `time-zone-roster.json`・`src/entity/document-model/schedule/time-zone.ts`（`TimeZoneRow` の型を 5 項に。`zoneClockOf` は `Intl` を読まず行の差を返す —— `offsetAt` は定数、`OFFSET_BUCKET_MINUTES` の作り置きは要らなくなる。`regionForPc` を「PC の標準時の差 → 標準時の行の鍵」に作り直し `PcTimeZone.region` を外す。`isTimeZoneRegion` を鍵の判定と、標準時の鍵の判定の 2 つに）・`src/framework/single-html-shell/frame-loop.ts:2610`〜`:2613` の `readPcRegion`（1 月 1 日と 7 月 1 日の `getTimezoneOffset` の小さいほう。`Intl` の `resolvedOptions().timeZone` は読まない）・`document-file-flow.ts:846`・`:972`〜`:975` の `withPcTimeZone`（呼び名を保ち中身は PC の標準時の鍵）・`src/adapter/screen-renderer/notices.ts:38` の `timeZoneLabelOf`（名を `zoneName` で組む）・`tools/generate_startup_template.py:980` | ⚠️ `erd_json_to_schema.py`（X-18）も A が持つ —— 生成器の読みと同じ名簿を使う |
| A2 `RS-90` を消す（Framework ／ Adapter） | X-15 | `document-file-flow.ts:967` の `TIME_ZONE_SET_REASON` と `:981` の告げる 1 行・`tellOpenedCalendarAndZone` の名と注・`frame-loop.ts:2606` と `:3525` の `raiseNotice(TIME_ZONE_SET_REASON, …)`・`notices.ts:104` と `:304`〜`:307` の `detailOf`（`RS-90` の詳しい行。`RS-90` が無くなるので関数ごと要るかを見る）・生成の `notice-values.ts` | A と同じ体でよい（ファイルが重なる） |
| B 目盛の段の略称（Entity ／ Adapter ／ Framework） | `FR-017`（X-1）・`EP-2`・`EP-3`・`S-313` | `src/adapter/svg-renderer/schedule-grid.ts` の `zoneRowsSvg`・`rulerSvg`（段の箱は既に求めている —— 基準の時の行と各段の上端・高さ・略称を返す純粋な関数に切り出す）・`src/entity/layout-engine/screen-regions/screen-regions.ts` の `rulerZoneRowsOf`・`rulerZoneRowHeightOf`・`src/adapter/screen-renderer/task-group-panel.ts`／`screen-frame.ts`（`ScreenView.taskGroupPanel` に略称の行を載せる）・`src/framework/dom-screen-surface/task-group-panel-drawing.ts`（描く）・`src/adapter/image-exporter/image-exporter.ts`（書き出す絵） | 略称は行で決まる —— 瞬間を求める道は要らない |
| C 基準の欄と答え（Adapter ／ UseCase ／ Framework） | `FO-14`・`FO-15`・`TX-11`・表 T-280・`CM-94`・`CM-95` | `src/adapter/screen-renderer/properties-panel.ts`（`baseChangeControls`・`baseExampleLine`・`isBaseChangeIdle`・`baseTimeZoneField`・`displayTimeZonesField` —— 基準は標準時の行だけ、答えの 1 行と 3 つの答えと前後の 2 行ずつ、読み取りの行を消す、表示の 4 行に番号、`IC-161` を外す）・`src/adapter/input-command-translator/field-commit.ts`（鍵 `baseTimeZoneDraft` の列を `chosenRegion`・`keepGlobalTime`・`keepLocalTime`・`cancel` に）・`screen-state-input.ts` の `baseTimeZoneDraftEventOf`・`src/use-case/edit-document/edit-document-settings.ts` の `baseTimeZonesAfterChange`（`keepLocalTime` で `viewTimeZone` を `null`）と `baseChangeCommandOf`・`src/framework/single-html-shell/field-entry.ts` の `baseChangeCommandsOf`（2 つの命令を 1 回の書き込みに）・`edit-project.ts`（`CM-94` が夏時間の鍵を拒む） | 生成の `screen-values.ts`（X-11）を読む |

- 検査 60（関数の大きさ）: `baseTimeZoneField` 周りは答えの 7 行で太る —— 規則 07 の `R2` で割る。基準を上げない。
- 毎フレームの経路: `zoneClockOf` は `Intl.DateTimeFormat` を作らなくなる（軽くなる）。B の体は `perf-pending` に 1 行足す（番号は調整役）。
- 古い振る舞いを縛る試験（`4a907919`、13 節の `git grep`）: `tests/contract/cr-750-rs-90-ends-on-the-change-base-time-zone-entry.contract.test.ts`（20 か所。`RS-90` が無くなる —— 試験ごと退ける）・`tests/contract/dfc-2463-fr-156-the-pc-region-and-where-rs-90-is-told.contract.test.ts`（32 か所。PC の標準時の寄せ方と「告げない」に書き直す）・`tests/contract/cr-751-a-region-outside-t-376-and-the-working-day-count.contract.test.ts`（26 か所）・`tests/contract/cr-751-the-schema-names-the-regions-and-no-spec-id.contract.test.ts`（9 か所。`enum` が鍵になる）・`tests/contract/display-words.contract.test.ts`（8 か所）・`tests/contract/t-233-reason-words-tell-the-row.contract.test.ts`（3 か所）・`tests/contract/state-machine-screen-values.contract.test.ts`（2 か所）・`tests/contract/cr-712-the-display-manner-of-every-task-group.contract.test.ts`（1 か所）・`tests/system/cr-570-tree-state-stage.ts`（3）・`tests/usecase/uc-harness.ts`（3）。
- 仕様だけを読む試験の体への手引き（8 項）:
  1. 表 T-376 は 39 行（標準時 27・夏時間 12）。名は `zoneName` の形で、`UTC-08:00` は「UTC -8:00 PST 太平洋標準時（米国・カナダ）」、`UTC-07:00 DST` は「UTC -7:00 PDT 太平洋夏時間（米国・カナダ）」、`UTC+09:00` は「UTC +9:00 JST 東京」、`UTC+05:30` は「UTC +5:30 IST インド」、`UTC-12:00` は略称の部が詰まる（X-4・X-5）。
  2. 基準の選ぶ欄は標準時の 27 行だけ、表示の 4 行は「（なし）」と 39 行（X-6・X-7）。
  3. 夏時間を自動に当てない: `UTC-07:00 DST` を表示に足すと、1 月の範囲でも 8 月の範囲でも段の時刻は UTC-7、段の左は `PDT`。基準 `UTC-08:00` の時の行の左は 1 年中 `PST`（X-1・X-3）。時の段でないとき基準の行には刷らず、表示の段には刷る。書き出した SVG にも在る。
  4. 基準の欄: 同じタイムゾーンを選んでも答えは出ない。別のタイムゾーンを選ぶと「スケジュールデータの時刻:」と 3 つの答えが出て、文書は変わらない（`FR-156`・表 T-280）。
  5. 換算して適用する を押すと `S-574` だけが変わり、取り消し 1 回で戻る。換算しない を押すと `AT-157` が変わり `S-574` が `null` になり、取り消し 1 回で両方戻る。どちらの後も基準の欄は選んだタイムゾーンを示す。キャンセル と文書の設定を離れることでは何も書かない（X-6・X-11）。
  6. 前後の時刻: 基準 `UTC-08:00`・最初のタスクの開始 4/1 8:00 で `UTC+09:00` を選ぶと、換算して適用する の下は「変更前: 4/1 8:00 PST」「変更後: 4/2 1:00 JST」、換算しない の下は「変更前: 4/1 8:00 PST」「変更後: 4/1 8:00 JST」（`TX-11`）。開始を持つタスクが無いと前後の行は出ない。
  7. MSPDI を置き換えて開くと、`scheduleDataTimeZone` は PC の標準時の鍵（PC の差を 1 月 −480 分・7 月 −420 分とすると `UTC-08:00`。+345 分なら `UTC+05:30`）になり、知らせは 1 つも出ない。`IC-98` も同じ（X-8）。
  8. `GRS JSON` の `scheduleDataTimeZone` が `Asia/Tokyo`・`UTC-07:00 DST` の文書は `RS-25` で拒まれ、`viewTimeZone` が `UTC-07:00 DST` の文書は開いて `viewTimeZone` が既定へ戻る（X-9）。

---

## 6. グラフ（`impact.py`・`induced.py`、`4a907919`）

`impact.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90 RS-25 BK-4 IC-98 FR-095` の答え:

| 種 | 指している箇所 |
|---|---|
| `FR-017` | 要求 13 件・38 か所。塊「設定値の相互依存」（`fontScale` → `rulerFont` → `rulerHeight` → 目盛の段階）に触れる |
| `FR-156` | 要求 7 件・26 か所（`FR-072`・`FR-031`・`FR-017`・`FR-158`・`FR-157`・`FR-054`・`FR-095`）。塊「開くと合流」に触れる |
| 表 T-376 | 28 行。要求 2 件（`FR-156`・`FR-095`）、2 次 11 件 |
| `FO-14` ／ `FO-15` ／ `TX-11` | 要求 2 件・6 か所 ／ 1 件・2 か所 ／ 1 件・1 か所 |
| `IC-161` | 要求 2 件・7 か所 |
| `K-144` ／ `K-145` ／ `S-574` ／ `S-575` | 1 件・1 か所 ／ 1 件・1 か所 ／ 1 件・5 か所 ／ 1 件・2 か所 |
| `CM-94` ／ `CM-95` | 0 件・2 か所 ／ 0 件・2 か所 |
| `RS-90` ／ `RS-25` | 1 件・3 か所 ／ 3 件・6 か所 |
| `BK-4` ／ `IC-98` | 2 件・4 か所 ／ 2 件・3 か所 |
| `FR-095` | 要求 5 件・14 か所 |

`induced.py` に上の 18 と `T-369`・`T-375`・`T-233`・`HF-10`・`EP-2`・`EP-3` を足した 24 の種: 種 24 のうち 24 が解決、種の中の辺 39、**閉路 1 つ（大きさ 12: `BK-4` `FO-14` `FO-15` `FR-017` `FR-095` `FR-156` `IC-161` `IC-98` `RS-90` `S-574` `S-575` `TX-11`）** —— 1 つの計画で 1 度に書く（4 節の頭）。`IC-161` と `RS-90` は行ごと消えるので、当てた後の閉路は 10 の見込み（当てる体が測る）。⚠️ `induced.py` が読む `strictdoc` の書き出しは、作業木 `6f7c3ac3` の `scratch/spec-check/sd-out` の写し（`CR-751` の前）を使った —— `Parent` の関係は `CR-751` で変わっていない。

足す辺: `FR-017` → 表 T-376・`S-313`・`HF-10`・`EP-2`・`EP-3`（X-1）。消す辺: `FR-156` → `IC-161`・`RS-90`・`ZN-20`、`FR-095`（`BK-4`）→ `ZN-13`、表 T-369 → `IC-161`、表 T-280 → `IC-161`。足す辺: `FR-156` → 表 T-376 の `UTC+05:30` の行（X-8 の例）、`BK-4` → `UTC+00:00` の行。

---

## 7. 数（見込み —— 当てる体が測り直す）

- 要求 ±0、表 ±0。表の行: 表 T-376 は 28 → 39（+11。行 ID は −28・+39）、表 T-109 −1（`IC-161`）、表 T-233 −1（`RS-90`）。表 T-376 の列は 4 → 6。表 T-369・表 T-375・表 T-104・表 T-108・表 T-342 は升の書き換えだけ。
- 図 −1 の図形（`fig-icons.svg` の `IC-161`。図そのものの数は ±0）。uid ±0。
- 状態機械 ±0、出来事 ±0（−`baseChangeWayChosen` ＋`baseChangeCancelPressed`）、ガード ＋1（`isOtherThanShownBase`）。
- 辞書: 区 `timeZoneField` の部 ＋7（`baseChangeQuestion`・`cancelBaseChange`・`beforeLine`・`afterLine`・`keepGlobalTimeHint`・`keepLocalTimeHint`・`zoneName`・`offsetName` の 8 を足し、`example` を消す）。区 `timeZones` 28 → 39。区 `icons` −1。区 `reasons` −1。
- `GRS JSON` のスキーマ: `scheduleDataTimeZone` の `enum` 28 → 27、`viewTimeZone` 28＋`null` → 27＋`null`、`displayTimeZones` の項 28 → 39。
- `（MUST）`: `FR-156` で消える文の `（MUST）` 7 つ（地域名・2 択と例・例の形・押して当てる・取り消し・PC の地域・`RS-90`）に対し、新は 9 つ（X-3 に 2、X-5 に 1、X-6 に 4、X-8 に 1、X-9 に 1）、`FR-017` の X-1 に 1 —— ＋3 の見込み。`（MUST NOT）`: 「固定の時差で持ってはならない」が消え「夏時間を季節で自動に切り替えてはならない」が入る —— ±0。当てる体は `git diff -U0 <base> -- docs/spec | grep -c "（MUST）"` で数え直す。

---

## 8. 台帳（当てるとき）

| 台帳 | 動かすもの |
|---|---|
| `defects.md` | `DFC-2515`・`DFC-2521`・`DFC-2522`・`DFC-2523` を、仕様を当てたら `実装待ち`、`src` を当てたら `実測待ち`（利用者の手順は 12 節）。`DFC-2522` の 10 組に `ZN-6`・`ZN-12` が抜けていたことを 1 行。`DFC-2523` は「夏時間の働きそのものを `JDG-2105` で消した」を 1 行。`DFC-2515` の「`task-group-panel-drawing.ts` の `bandHeight`」は偽だったことを 1 行（0.1）。`DFC-2517` に「`IC-161` は `CR-755` が行ごと消す」を 1 行 |
| `rulings.md` | **適用済**にするもの: `JDG-2043`・`JDG-2048`・`JDG-2049`・`JDG-2057`・`JDG-2058`（後半）・`JDG-2104`・`JDG-2105`・`JDG-2106`・`JDG-2107`（着地は X-1〜X-22 の各升 —— 検査 43 は仕様の ID を着地に要る）。`JDG-2056` は名の並びだけ適用済、残りは覆された。**覆された（一部。答えの ID）**を状態に書くもの: `JDG-1711`（`JDG-2107`）・`JDG-1712`（`JDG-2105`・`JDG-2106`）・`JDG-1780`（`JDG-2104`）・`JDG-1983`（`JDG-2104`）・`JDG-1986`（`JDG-2107`）・`JDG-2038`（`JDG-2107`）・`JDG-2039`（`JDG-2105`）・`JDG-2056`（`JDG-2105`）。`JDG-1977` の着地を `keepGlobalTimeHint` へ。`JDG-2100`〜`JDG-2102` は答えの記録としてそのまま。11 節の問い 6・7 の答え `JDG-2242`・`JDG-2243` も **適用済**（着地は表 T-376 の `UTC+00:00` の行と X-4 の表の下の注）。⚠️ `JDG-2106` の状態は 2026-10-15 に既に「覆された（一部。`JDG-2243`）」—— 状態は変えず、着地の升に表 T-376・`K-144`・`K-145` を書き、残る部分（代表の 1 つ・項目名の en）を当てたことを 1 文足す |
| `changelog.md` | 1 行（番号は調整役） |
| `perf-pending.md` | B の体が 1 行（5 節） |

---

## 9. 見積もり

| 持ち場 | 時間 | 中身 |
|---|---|---|
| 仕様（`_source` と 2 つの要求の書・`tbl-glossary.md`・`fig-icons.svg`・設計の書） | 4 h | X-1〜X-21 を 1 体が 1 度に（閉路 12）、表 T-376 の 39 行と辞書の 39 語、`npm run gen`、`strictdoc export`（一時フォルダへ） |
| `src` A・A2 名簿と時計と PC、`RS-90` を消す、スキーマ生成器 | 3.5 h | 生成器の 5 列・名簿の型・固定の差の時計・PC の標準時・`timeZoneLabelOf`・`erd_json_to_schema.py` の絞り・`RS-90` の 3 か所 |
| `src` B 目盛の段の略称 | 2.5 h | 段の箱と字の純粋な関数・パネルへの継ぎ目・描き手・書き出す絵（瞬間の道が要らなくなった分、前の見積もり 3 h から減る） |
| `src` C 基準の欄と答え | 3 h | 欄の作り替え・答えの 7 行・翻訳・状態機械・2 つの命令を 1 回の書き込みに・`IC-161` を外す |
| データの書き換え（X-22） | 1 h | 10 ファイルと試験の値 |
| 試験（仕様だけを読む体） | 3.5 h | 5 節の 8 項と、古い試験 10 本の手当て |
| `CR-751` の X-14 を回し直す | 1 h | `tools/schema-only-writer/` の手順で、鍵の `enum` だけを読んだ新しい体に日単位と分単位の日程を書かせ、`CR-751` の後の結果と比べる |
| 利用者の実物の確かめ | 0.5 h | 12 節の手順 |
| 計 | 19 h | ⚠️ 前の版の 14 h に、表の作り替え（39 行）・固定の差の時計と PC の標準時・`RS-90` を消すこと・スキーマの値の置き換え・データの書き換え・X-14 の回し直しが加わり、瞬間で略称を決める道が減った。台帳の見積もり（`DFC-2515` 4 h・`DFC-2521` 2 h・`DFC-2522` 3 h、計 9 h）はどれも含まない |

波の順: ① 仕様（1 体）→ ② `src` A・A2（`erd_json_to_schema.py` を含む）→ ③ `src` B と C とデータの書き換えを並べて（B は `schedule-grid.ts`・`screen-regions.ts`・パネル・書き出し、C は設定の面・翻訳・UseCase・殻 —— ファイルが重ならない）→ ④ 仕様だけを読む試験の体 → ⑤ `CR-751` の X-14 を回し直す → ⑥ 調整役が実物の手順を利用者へ（利用者の試しは全部の欠陥を直した後の 1 回にまとめる決まりに従う）。

⭐ **`CR-756`・`CR-757` との関係**: 本書は `CR-756`・`CR-757` と並べて走れる。ただしスキーマの生成器 `docs/spec/_source/erd_json_to_schema.py` に触れるのは本書だけである —— 2 つの CR の体は触れない。`FR-156` の「確認を取るのはタイムシフトだけ」の文は `CR-757`（`JDG-2109`）が書き換える —— X-6 の最後の文は、`CR-757` が先に着地していればその語に合わせる。

⚠️ **`CR-754` との関係**: `CR-754` は文書の設定のパネルの既定の幅 `S-171` を、いちばん広い選ぶ欄に合わせて測り直す。本書は選ぶ欄の名を長くする —— いちばん広い名は ja「(UTC+01:00) 中央ヨーロッパ（ベルリン・パリ）」の 44 から「UTC +3:00 EEST 東ヨーロッパ夏時間（カイロ・ヘルシンキ）」の 55 へ、en は 42 から 61 へ（東アジアの全角を 2 と数えた字の幅、13 節）。**`CR-754` の測り直しは本書の名で行うこと** —— 先に `CR-754` を当てるなら、本書を当てた後にもう 1 度測る。

---

## 10. この変更でやらないこと・残したもの

- 夏時間を季節で切り替える働き —— 答え（`JDG-2105`）で消す。夏時間で読みたい人は表示の段に夏時間の行を足す。
- 39 行より細かい時差（例 UTC+05:45、UTC+10:30）の行 —— 今の 28 地域の標準時と夏時間だけを持つ。PC の寄せ方が近い行へ寄せる。
- 見本 `46` の「基準 PDT UTC-7」のように、段に略称と差の両方を刷ること —— `JDG-2043` は略称だけを求めた。
- 時刻を表示していないときの目盛に略称を刷ること —— 表示の段が無く、基準の段は日を刷るだけ。
- `K-146`（時刻を表示する）ほか、項目名の en が識別子のままの設定（`K-71`・`K-140`）—— 本書が直すのは `K-144`・`K-145` だけ。残りを揃えるなら別の変更要求。
- 表示するタイムゾーンの行の並べ替え・増減の入口 —— 4 行の選ぶ欄のまま。
- 古い地域名の `GRS JSON` を読む口 —— 作らない（X-s）。

---

## 11. 利用者（調整役）に問うこと

⭐ 問い 1〜5 は 2026-10-15 に利用者が答えた（答えの字は 0 節の頭の裁定に記録される）。問いの文は短くし、答えを下に書いた。問い 6・7 は本書を書き直して出たもの —— 利用者が不在のあいだは残し、戻ってから CR-754〜757 を起草した席が問うて答えを受けた（`JDG-2242`・`JDG-2243`）。どちらも表 T-376 の升だけに効く。

### 問い 1 —— 見えている範囲が夏時間の変わり目をまたぐとき、目盛の段の左に刷る略称はどの瞬間で決めるか —— 答え済み

- 答え（`JDG-2100`）: 「気にせずプロジェクト全体で表示を統一すればいいのでは？ シンプルに。理由: 日付の左にタイムゾーンの略称を書くのでそこで判断できるし、むしろその略称に合わせるべき。」
- 続き（`JDG-2105`）: 「夏時間については日付の行だけずらすか...  ただし基準タイムゾーンは夏時間を選択できないようにしろ。 JSONスキーマも基準タイムゾーンは夏時間を選択できないようにしろ。」「1つ前の裁定に従え。 ってことでいいか？」「意味が分からん。 米人は 基準タイムゾーンを ESTやPSTを選べるが、EDTやPDTなど夏時間を選べない。 ただし、表示のタイムゾーンはEST,PST,EDT,PDTなど夏時間も通常の時間(冬時間？)も選べる。 意味わかる？ これで何か問題になる？」「前の問いによる」、確かめ（固定の時差の形）に「A その形でよい (推奨)」。
- 本書での形: タイムゾーンは固定の時差と 1 つの略称。行ごとに略称は決まっていて、瞬間を選ぶ問いは無くなった（X-1・X-3・X-4）。

### 問い 2 —— 答えの結果の時刻に、どのタイムゾーンの時刻かを添えるか —— 答え済み

- 答え（`JDG-2104`）: 「略称を付けるが変更前後で行を分けろ。」
- 本書での形: 2 つの答えの下に「変更前: 4/1 8:00 PST」「変更後: 4/2 1:00 JST」の 2 行（X-6・X-13・X-16）。行の語は X-u（推奨を採った（利用者不在、`JDG-1696` に従う））。

### 問い 3 —— 新しい項目名の en —— 答え済み

- 答え（`JDG-2106`）: 「A 語にする (推奨)」。
- 本書での形: `K-144` → `Project Base Time Zone`、`K-145` → `Display Time Zone`（行は `Display Time Zone 1`〜`4`）（X-10）。

### 問い 4 —— 広く使われる略称の無い行をどう見せるか —— 答え済み

- 答え（`JDG-2106`）: 「略称は各タイムゾーンの 代表の1つの略称でよい。 そのタイムゾーンで略称が決まっているうち、人口が一番多い国（都市)のタイムゾーンの略称とせよ。」
- 本書での形: 39 行のそれぞれに代表の略称 1 つ（X-4 の表と出どころの列）。人口の比べ方は X-c。略称の無い行は `UTC-12:00` の 1 行だけ（X-p）。

### 問い 5 —— 覆す案のある 4 つの裁定と X-f を、そのとおりにしてよいか —— 答え済み

- 答え: 2 つの選び方の語と入口（`JDG-1780`・`JDG-1983`）は「スケジュールデータの時刻:  [換算して適用する] [換算しない] でいいだろ？」（`JDG-2104`。[キャンセル] は退けていない —— `JDG-2058` のまま 3 つ）。名の形（`JDG-1712`）は固定の時差の形への「A その形でよい (推奨)」（`JDG-2105`）。`RS-90` の語（`JDG-2038`）は「うーん。微妙。 MSPDIのデータって、タイムゾーン無いの？ 念のため再調査しろ。 MSPDIのデータにタイムゾーンが無い場合は、そのPCのタイムゾーンを基準タイムゾーンとしろ。 MSPDIのデータを開く旅のそのメッセージが出るのはダルすぎだ。」と「A 知らせを出さない (推奨)」（`JDG-2107`）。X-f（換算しない の後も選んだタイムゾーンで見せる）は「そのとおり (推奨)」（`JDG-2104`）。
- 本書での形: 0.2 節の「覆す答え」の列。

### 問い 6 —— ±0:00 の標準時の行の略称を、規則どおり GMT にするか、UTC にするか —— 答え済み

- 場面: 文書の設定の 本プロジェクトの基準タイムゾーン（`Project Base Time Zone`）を開くと、±0:00 の行が「UTC ±0:00 GMT 協定世界時・ロンドン」と出る。時刻を表示して時の段まで拡大すると、基準の時の行の左に `GMT` が刷られる。新しく刷った空の文書（`BK-4`）と、今の `UTC` の文書 10 か所（X-22）はこの行になる。
- 使う例: 世界の拠点が集まる会議の日程を、どの国にも寄らない時計で組む。
- 択 A（推奨）: `UTC` にする（「UTC ±0:00 UTC 協定世界時・ロンドン」、段の左は `UTC`）。—— 代償: 規則（人口の一番多い国の略称）の例外が 1 行できる。英国の冬の人は `GMT` を見ない。
- 択 B: 規則どおり `GMT`（英国）にする。—— 代償: 利用者の言葉「タイムゾーンの略称(UTCとかPDTとか)」（`JDG-2043`）の `UTC` が画面から消える。
- 推奨の理由: ±0:00 の基準は国の時計ではなく世界の基準の時計（協定世界時）であり、規則が比べる「国の略称」の外に在る。利用者自身が `JDG-2043` で `UTC` を略称の例に挙げた。
- 答え（`JDG-2242`）: 「A UTC (推奨)」。
- 本書での形: X-4 の表の `ZN-47` の略称を `UTC` にし、名を「UTC ±0:00 UTC 協定世界時・ロンドン」とした。表の下の注に 1 文（X-4）。

### 問い 7 —— 規則で今の略称から替わる行を、そのままにするか —— 答え済み

- 場面: 表示するタイムゾーンの選ぶ欄を開くと、ベルリン・パリの冬の行が「UTC +1:00 WAT ラゴス・中央ヨーロッパ（ベルリン・パリ）」と出る。規則（`JDG-2106`）で、+1:00 に住む人がいちばん多いのはナイジェリア（WAT）である。
- 替わる行（今の略称 → 本書）: −4:00 AST → VET、−3:00 夏 ADT → CLST、+1:00 CET → WAT、+3:00 MSK → EAT。今は略称を持たない行に入るもの: −3:00 BRT、−2:00 WGT、−1:00 CVT、±0:00 夏 AZOST、+4:00 GST、+6:00 BST、+7:00 WIB、+8:00 CST、+11:00 SBT、+13:00 WST。
- 使う例: ヨーロッパの協力先の冬の時刻を、表示の段で読む。
- 択 A（推奨）: 規則どおりにする（本書の X-4）。—— 代償: ヨーロッパの人は冬の行に見慣れない WAT を見る（地名にベルリン・パリは残る）。CST と BST が 2 行ずつになる。
- 択 B: 今の表で略称を持っていた行（`ZN-1`〜`ZN-28` のうち IANA が字を持つ 18 行）はその略称を保ち、規則は略称の無かった行だけに当てる。—— 代償: 「代表の 1 つ」を決める規則が 2 つになる。+1:00 は CET、+3:00 は MSK、−4:00 は AST のまま。
- 推奨の理由: 利用者が示した規則そのものであり、行ごとに例外を作らない。替わるのは略称の字だけで、鍵・時刻・地名で探すことは変わらない。
- ⚠️ 問うた形では、択の名と推奨を替えた: 択 A「知られた略称を保つ」（推奨。上の択 B）／ 択 B「規則どおり CET→WAT・MSK→EAT・AST→VET・ADT→CLST」（上の択 A）。推奨は問うた席が替えた。
- 答え（`JDG-2243`）: 「A 知られた略称を保つ (推奨)」。
- 本書での形: 今の表で地域が IANA の字の略称を持っていた行はその略称を保つ —— X-4 の表の `ZN-41` AST・`ZN-44` ADT・`ZN-49` CET・`ZN-53` MSK を戻し（名は今の地名だけ）。今の略称を持っていたほかの行（`SST`・`HST`・`PST`・`EST`・`JST`・`CEST`・+1:00 夏時間 `BST` ほか）は、規則の答えと今の略称がもとから同じだった。人口の規則は略称を持っていなかった 10 行だけを埋める（X-c）。`JDG-2106` は一部覆された。

---

## 12. 当てる体への申し送り

- ⭐ **`CR-751` は着地している**（`integ/coord-1011` の `80fa07fc`。本書を書いた作業木 `6f7c3ac3` には無い）。本書は `CR-751` の X-10・X-11 の仕組みを保ち値を置き換える。⛔ `CR-751` に追記しない（検査 62）。当てる前に確かめる: ① `grs-document.schema.json` の `scheduleDataTimeZone` が 28 の地域名の `enum` を持つ。② `erd_json_to_schema.py` の `VALUES_FROM` が `generate_time_zone_roster.build()` を読む。③ `settings.json` の `S-574`・`S-575` が `"valuesFrom": "T-376"`。どれかが違えば、本書の X-18 の起点を調整役に告げる。
- 当てた後に `CR-751` の X-14（スキーマだけの書き手の試験。`tools/schema-only-writer/` の `README.md`・`writer-brief.md`・`measure.mjs`・`validate.py`）を回し直す —— `docs/development-rules/04-verification.md` の「いつ回すか」に `FR-156` の読みの変更が入っている。`writer-brief.md` の「Asia/Tokyo」は X-22 で鍵に直す。結果は新しい記録の場所に置き、`x14-2026-10-15-cr-751/` は書き換えない。
- 鍵の綴り（X-a）・`enum` の絞りの綴り（X-18）・行 ID の帯（X-e）は当てる体が決める（利用者の問いではない）。人口の比べ（X-4 の注）は数え直し、代表が替われば升だけを直す。
- `CR-754` は本書の後で `S-171` を測る（9 節）。`CR-756`・`CR-757` と並べてよいが、`erd_json_to_schema.py` は本書だけが触れる（9 節）。
- `DFC-2517`（テーマ色の行の `IC-161`・`IC-162` の重なり）は本書と独立に先に直してよい。本書を当てるときは `IN_FIELD_ENTRIES` からも `IC-161` を外す。
- `CR-742` の X-13 の機械の名（`baseTimeZoneDraftStateMachine`）・離れる 7 つの出来事・`documentReplacedByOpenOrNew` はそのまま使う。`CR-743` の `calendarDraftStateMachine` には触れない。
- 11 節の問い 6・7 は答え済み（`JDG-2242`・`JDG-2243`）—— X-4 の表はその答えの形（±0:00 は `UTC`、今の略称を保つ行は保ち、規則は略称の無かった 10 行だけ）。
- 利用者の実物の手順（当てた後。調整役が全部の欠陥の後の 1 回にまとめる）: ① 文書の設定を開き、本プロジェクトの基準タイムゾーンの選ぶ欄が標準時だけ（「UTC -8:00 PST 太平洋標準時（米国・カナダ）」「UTC +9:00 JST 東京」の形、PDT は無い）で並ぶか。② 表示するタイムゾーン 1 に東京、2 に「UTC -7:00 PDT 太平洋夏時間（米国・カナダ）」を選び、時刻を表示するを入れて時の段まで拡大し、基準の時の行の左に基準の略称、東京の段の左に `JST`、PDT の段の左に `PDT` が右寄せで在り、頭の操作子と重ならないか。1 月の範囲へ動かしても `PDT` のままで時刻が UTC-7 か。③ 基準の欄で東京を選び、「スケジュールデータの時刻:」と 3 つの答えと前後の 2 行ずつが出るか。[換算して適用する] を押して目盛が東京の時刻になり、`Ctrl+Z` 1 回で戻るか。④ もう 1 度東京を選んで [換算しない] を押し、バーの位置が動き（瞬間が動く）、基準の欄が東京を示し、`Ctrl+Z` 1 回で戻るか。⑤ [キャンセル] で何も変わらないか。⑥ MS Project のファイルを開いて、知らせが出ず、基準の欄がこの PC の標準時（夏でも標準時）を示すか。

---

## 13. 測り方の再現

```
git log --oneline -1 80fa07fc                                                    # Apply CR-751 ...（着地）
git branch -a --contains 102a84742                                               # integ/coord-1011 ほか
git show 4a907919:docs/spec/_source/grs-document.schema.json | grep -n "scheduleDataTimeZone\": {" -A32   # 28 の enum
git show 4a907919:docs/spec/01-04-requirements.md | grep -c "^| ZN-"             # 28
git show 4a907919:docs/spec/01-04-requirements.md | grep "^| ZN-" | grep -c "| 有 |"   # 12（夏時間「有」）
git grep -n "TIME_ZONE_SET_REASON\|readPcRegion\|regionForPc\|withPcTimeZone" 4a907919 -- src   # 告げる 3 か所と PC の読み
git grep -cE "(scheduleDataTimeZone|viewTimeZone)\"?\s*:\s*['\"][A-Za-z_/+0-9-]+['\"]" 4a907919 -- . ':!change-request' ':!docs/spec/_source/grs-document.schema.json'   # X-22 の数
git grep -c -E "RS-90|IC-161|keepGlobalTime|keepLocalTime|baseChangeWayChosen|baseChangeEntryPressed|TX-11|timeZoneLabelOf|regionForPc|readPcRegion|zoneClockOf|isTimeZoneRegion|TIME_ZONE_ROWS|T-376|ZN-[0-9]" 4a907919 -- tests   # 10 本
git grep -n "VALUES_FROM\|def enum_node" 4a907919 -- docs/spec/_source/erd_json_to_schema.py
git show "4a907919:sample-schedule/Three-Year Product Plan.json" | grep -c "TimeZone"   # 0
```

グラフは `4a907919` の `docs/spec` と `.claude/skills/spec-graph-check` を `git archive` で一時フォルダへ出し、その中で回した（`induced.py` の書き出しは 6 節の注）:

```
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90 RS-25 BK-4 IC-98 FR-095
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-017 FR-156 T-376 FO-14 FO-15 TX-11 IC-161 K-144 K-145 S-574 S-575 CM-94 CM-95 RS-90 RS-25 BK-4 IC-98 FR-095 T-369 T-375 HF-10 EP-2 EP-3 T-233
```

表 T-376 の 39 行（標準時 27・夏時間 12、鍵の重なり 0）と名の幅は、X-4 の行を書いた 1 回きりの Python（一時フォルダ）で数えた: 名を「UTC {差} {略称} {地名}」に組み、`unicodedata.east_asian_width` が W／F の字を 2、ほかを 1 と数えて最大を取る —— 本書の後 ja 55（`UTC+03:00 DST`）・en 61（同）。今の名は辞書 `display-words.json` の区 `timeZones` の最大で ja 44・en 42。

MSPDI にタイムゾーンが無いこと: 読みの体が `docs/reference/mspdi` の pj12／pj15 のスキーマを読んだ（作業木には無い、ローカルだけの写し）。時差の要素は無く、日時は時差の無い壁時計（`mspdi_pj12.xsd` の 225〜730 行）。
