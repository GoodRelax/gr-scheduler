# CR-389 — 全画面表示はブラウザに求め、その状態を写す

> **閉じるもの**: 利用者の報告 2026-09-16 `JDG-125`「ヘッダーの全画面表示アイコンが動かないことに気づいた。 F11を押しても全画面表示できない。 修正しろ」 —— 逐語は `docs/development-records/rulings.md` の同行（前に立つ者が記録中。本書を書いた木 `b7b26607` にはまだ無い）。
> - 症状: `App Header` の全画面表示の入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-11`）を押しても、`F11`（表 T-036 の `SK-15`）を押しても、画面は全画面にならない。入口の押された見た目だけが変わる
>
> ⭐ **起草して、同じ波で `docs/spec` へ当てた。** 読んだ木は `b7b26607`。`src/` と `tests/` を手では書いていない。⚠️ `npm run gen` が生成物 `src/adapter/screen-renderer/display-words.json` に `RS-59` の項を刷った（原稿 `docs/spec/_source/display-words.json` の写し。前例 `CR-386` の波も同じ生成物を持った）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-002`（全体日程を 1 画面で見られる）**。`FR-071` の RATIONALE が、全画面表示をその最も直接的な手段としている。いまの造りは入口の見た目を変えるだけで、ブラウザのタブやアドレスバーが占める面積を 1px も日程に返していない。あわせて `GL-006`（マニュアルを読まずに使える）—— 入口の押された見た目が、実際に全画面かどうかと食い違わなくなる。

### ② レビュー観点のどの条項を当て、何が出たか

（`docs/development-rules/07-review-standards.md`）

- **`R1.3`（矛盾がない。唯一の正がある）** —— 全画面かどうかの正が 2 つ在りうる。ブラウザの全画面の状態と、アプリが反転させる `S-99f` である。`Esc` やブラウザの操作で全画面が解けたとき、`S-99f` は戻らない ⇒ 決定 2。表 T-028 の `IN-4a` の理由「渡さないと戻れなくなる」は、Fullscreen API の全画面ではブラウザが `Esc` で必ず解くので、決定 1 と食い違う ⇒ 決定 6。
- **`R1.4`（異常系・権限不足を網羅）と `R3.1`（エラーを握りつぶさない）** —— ブラウザは全画面の求めを拒むことがある（利用者の操作による活性の外、`allow="fullscreen"` の無い埋め込み、機能の無い環境）。いまの仕様には拒まれたときの扱いが無い ⇒ 決定 3。
- **`R4.3`（状態遷移に観測できる中間の不正状態がない）** —— 求めた時点で `S-99f` を反転させると、ブラウザが拒んだとき「全画面でないのに押された見た目」が観測できる ⇒ 決定 2 の MUST NOT。
- **`R1.3`（表 T-078 の全数）** —— 表 T-078 は「フレームが走る契機の全数」と「本表に無い契機でフレームを起こしてはならない（MUST NOT）」を持つ。`fullscreenchange` で `S-99f` を合わせても、それがフレームを起こせなければ入口の見た目が古いまま残る ⇒ 決定 7。

### ③ 利用者に問うたこと・**問わずに決めた**こと

**問うて裁定を得た**: `JDG-125`（直せという指示）。

**問うこと**: なし（0 件）。

**問わずに決めた（覆してよい）**: 決定 1〜6 は前に立つ者の推奨をそのまま採った。決定 7〜10 は本書が足した。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `FR-071` の全画面表示は、ブラウザの Fullscreen API で文書全体（`document.documentElement`）を全画面にすることとする。アプリの中で描く領域を広げることではない | アプリが広げられるのはブラウザが渡した表示領域までであり、タブやアドレスバーの面積は取り戻せない（`GL-002`） | ブラウザが拒むと全画面にならない（決定 3 で告げる） |
| 決定 2 | `S-99f` の正はブラウザの全画面の状態とする。`IC-11` と `F11` は「いま全画面でなければ入る、全画面なら出る」をブラウザに求め、`S-99f` は `fullscreenchange` で `document.fullscreenElement` の有無に合わせる。求めただけで `S-99f` を反転させない | 入る・出るを決めるのはブラウザなので、アプリが別に真偽を持つと `Esc` やブラウザの操作で解けたときに食い違う（`R1.3` / `R4.3`） | 押してから見た目が変わるまで、ブラウザが全画面に入り終えるだけの遅れが出る |
| 決定 3 | ブラウザが拒んだとき（Promise の reject）と機能が無いときは、表 T-233 に足した `RS-59`（作法 `NT-3a`、正 `FR-071`）を運ぶ通知を出す | `FR-076` の結び「通知が運ぶ理由は 表 T-233 の行とすること（MUST）」と、黙ると押しても何も起きない入口になること（`FR-029` の RATIONALE が挙げる形）。拒まれたのは失敗なので `NT-3a`（次に取れる手段を添える） | 辞書の原稿に項を 1 つ足した（`FR-076` の結びの MUST）。次の一手は「ブラウザのメニューから全画面表示にしてください」—— `F11` は決定 4 でアプリが取るので、メニューを指す |
| 決定 4 | `F11` の既定動作は止めたまま、アプリの全画面の入口にする。修飾キーの無い `F11` について既定動作を止めることは `FR-071` に書き、表 T-036 の `SK-15` から `FR-071` を指す | 止めないと、同じ押下でブラウザの窓の全画面と API の全画面が両方動く。表 T-023 の `MK-10` は「本ツールが割り当てた修飾キーの付いた入力」だけを述べ、素のキーには届かない（`01-04-requirements.md:3205` の注） | ⚠️ 素の `F1`（`SK-13`）と `P`（`SK-14`）も `input-command-translator.ts:1314` で同じく既定動作を止めているが、どの条項も持たない。本書では扱わない（第 9 節） |
| 決定 5 | ブラウザに求めるのはシェル（`Framework` 層、表 T-060 の `LY-5`）であり、入口の入力を受けた呼び出しの中で、フレームを待たずに出す。層をまたがないので 表 T-065 に `IF` の行は足さない。表 T-075 の `UF-48` に書いた | ブラウザは利用者の操作による活性の中で出された求めしか受け付けず、活性をどこまで持ち越すかはブラウザごとに違う。入力を受けた呼び出しの中で出すことだけが、どのブラウザでも活性の中にある | 表 T-064 の `PI-25`（シェルは他から呼ばれるメンバを持たない）は変わらない |
| 決定 6 | 表 T-028 の `IN-4a` の理由を直した。MUST（消費する対象が無い `Esc` はブラウザへ渡す）は残し、理由を「本ツールが何もしない `Esc` を止めると、ブラウザが `Esc` に持たせた働きを奪う」とした。`Esc` で全画面を解くのはブラウザであり、アプリは後から `S-99f` を戻す、と注に置いた | 旧い理由「渡さないと戻れなくなる」は、決定 1 の全画面では偽である —— ブラウザはページが `Esc` を止めても全画面を解く。旧い注「構えたまま全画面にした利用者は `Esc` を 2 回押す」も、ブラウザが `Esc` をページへ渡すかどうかに依るので断言できない | `IN-4a` の MUST の字面（検査 39 の窓）は 1 文字も変えていない |
| 決定 7 | 表 T-078 に `FT-6`（ブラウザが全画面表示に入ったこと・出たこと。`SingleHtmlShell` が自分で観測する。正 `FR-071`）を足した | 表 T-078 は全数であり、本表に無い契機でフレームを起こすことを MUST NOT で禁じる。`FT-3`（寸法の変化）には任せない —— ブラウザの窓の全画面から API の全画面へ移るときのように、寸法が変わらないまま切り替わることがある | 行が 1 つ増える（`FT` 5 → 6） |
| 決定 8 | 表 T-075 の `UF-61`（`screen-frame.ts`）を「割り付けと、全画面表示かどうか（`S-99f`）を記述へ運ぶこと」に直し、全画面表示のために割り付けを変えないと注した | 旧い字面「割り付けと、全画面表示」は、純粋な割り付けのユニットが全画面を作ると読める（決定 1 と食い違う）。いまの造り（`screen-frame.ts:95` が真偽を運ぶだけ）はそのまま満たす | なし |
| 決定 9 | 表 T-206 の `S-99f` の注を「ブラウザの全画面表示の状態を写す値である。入口は `SK-15` と `IC-11`」とした（原稿 `_source/settings.json`） | 旧い注「切替は表 T-036 の `SK-15`」は、`SK-15` が `S-99f` を直に切り替えると読める（決定 2 と食い違う）。値の表には規則を置かない（1.9）ので、規則は `FR-071` に置き、注は写すことだけを述べる | なし |
| 決定 10 | `IC-11` の行（`_assets/tbl-glossary.md:513`）と辞書の語「全画面表示にする。もう一度押すと戻る」は変えない | どちらも決定 1〜2 の後も正しい | なし |

---

## 1. 原因 —— 読んで確かめた事実

| 事実 | 所 |
|---|---|
| `IC-11` の押下は `S-99f` を反転させるだけ | `src/adapter/input-command-translator/input-command-translator.ts:3569-3570`（`screenStateFromEntry`、`ENTRY.fullScreen` は `:720`） |
| `F11` も `S-99f` を反転させるだけ | `src/adapter/input-command-translator/input-command-translator.ts:3644`（`screenStateFromInput`） |
| `F11` は既定動作を止める（`CONSUMED_ELSEWHERE`、`isBrowserDefaultStopped: true`） | `src/adapter/input-command-translator/input-command-translator.ts:1314`（定義 `:250`） |
| 反転した値の行き先は属性 1 つ | `src/adapter/screen-renderer/screen-frame.ts:95` → `src/framework/dom-screen-surface/dom-screen-surface.ts:2287`（`data-full-screen`） |
| 入口の押された見た目も同じ値を読む | `src/adapter/screen-renderer/app-header-items.ts:83-84` |
| ブラウザの全画面の API を呼ぶ所 | **0 件**（`requestFullscreen` / `exitFullscreen` / `fullscreenchange` / `fullscreenElement` を `src/` `tests/` `tools/` で grep） |
| 入力はイベントハンドラから同期に `receiveInput` まで進む | `src/framework/dom-input-source/dom-input-source.ts:218-221`（`deliver`）→ `src/framework/single-html-shell/single-html-shell.ts:424` → `src/framework/single-html-shell/frame-loop.ts:3482`、画面の値の差し替えは `:3553` |
| ブラウザ呼び出しは先送りされていた | `change-request/CR-192-the-entries-nobody-could-press.md:44`（決定 6「ブラウザ呼び出しは本 CR で足さない」）と `:198`（「半分」） |

**見逃しの理由**: 属性の反転が「効いた」と数えられていた。
- `docs/development-records/fixed-defects.md:70` の `DFC-104` の証拠「`F11` 1 回で `data-full-screen` が `false` → `true`」
- `tests/system/nfr-004-file-scheme-sweep.sws.test.ts:1166` の `SK-15` は `expect: 'answers'` であり、判定 `answeredAsPromised`（`:1459-1463`）は DOM が動いたか（`one.moved`）しか見ない ⇒ 属性が変われば緑
- `tests/unit/uf-30-31.test.ts:1063-1071`「F11 switches full screen both ways」は `screenStateFromInput` の反転を主張する

## 2. 測った

| 数 | 値 | 測り方 |
|---|--:|---|
| ブラウザの全画面の API を呼ぶ所（`src/` `tests/` `tools/`） | 0 | `grep -rn` の件数 |
| `S-99f` を反転させる所 | 2（`:3570`、`:3644`） | 上の 2 行を読んだ |
| `FR-071` の `（MUST）` / `（MUST NOT）`（当てる前 → 当てた後） | 0 → 8 | 本文の段落を数えた |
| 表 T-075 の `UF-48` の `（MUST）`（当てる前 → 当てた後） | 0 → 1 | 同上 |
| 表 T-028 の `IN-4a` の `（MUST）` | 1 → 1（字面は同じ） | 同上 |
| 表 T-233 の行 | 54 → 55 | 生成物 `_assets/tbl-row-id-prefixes.md` の `RS` の欄 |
| 表 T-078 の行 | 5 → 6 | 同 `FT` の欄 |
| `rulings.md` を「全画面」「F11」「fullscreen」で引いた件数（本書の木） | 0 | `grep -n -i`。⚠️ 前に立つ者の作業木の `rulings.md` には `JDG-125` の 2 行（`:219`、`:226`）が在る（コミット前） |

## 3. グラフ

**`impact.py FR-071 SK-15 S-99f IC-11`**（当てる前）:

| 種 | 指している要求 / 参照 | 中身 |
|---|---|---|
| `FR-071` | 2 / 6 | `FR-098`（「同じ入口で解除する形は `FR-071` が既に採っている」）、`FR-040`（`IN-4a`）、5.2 の `CP-36`、5.3 の `UF-61`、表 T-109 の `IC-11`、表 T-206 の `S-99f` |
| `SK-15` | 0 / 1 | 表 T-206 の `S-99f` |
| `S-99f` | 0 / 3 | 5.2 の `CP-36`、5.3 の `PI-36`、表 T-109 の `IC-11` |
| `IC-11` | 3 / 4 | `FR-053`（トグルは 1 つの先例）、`FR-070`（`SK-15` の入口）、`FR-018`（繰り返さない入口）、表 T-109 の `IC-50` |

**`impact.py IN-4a UF-48 UF-61 T-078 RS-59`**（当てた後）: `IN-4a` 2 / 2（`FR-071`、`FR-040`）。`UF-48` 1 / 1（`FR-071`）。`UF-61` 0 / 1（5.6 の `MN-8`、`UF-61`〜`UF-69` を束で名指すだけ）。表 T-078 は 6 行、要求 1（`NFR-010`）/ 2 次 2（`FR-048` `NFR-002`）/ 要求以外 4。`RS-59` 1 / 1（`FR-071`）。

**`induced.py FR-071 SK-15 S-99f IC-11 IN-4a MK-10 FR-076 UF-48 PI-25 LY-5`**: 10 種すべて解決、辺 7、閉路 2 —— `FR-071 IN-4a`（大きさ 2）と `IC-11 S-99f SK-15`（大きさ 3）。⇒ 2 つの閉路の員を 1 つの計画で 1 度に書いた（`FR-071` と `IN-4a` を同じ巡で、`S-99f` と `SK-15` を同じ巡で。`IC-11` は決定 10 で据置）。

**⛔ 別の道を退けた**: 「アプリの中で描く領域を広げる」読みは、アプリが既にブラウザの渡した表示領域いっぱいに描いており、タブやアドレスバーの面積を取り戻せないので、`GL-002` を 1px も進めない。

**届いた行を `rulings.md` で引いた**: `FR-071` `SK-15` `S-99f` `IC-11` `IN-4a` `MK-10` `FR-076` `UF-48` `UF-61` `T-078` `FT-` `RS-59` `PI-25` のどれも、裁定の行に現れない（本書の木）。`T-233` は `JDG-113`（`RS-51` の件）だけで、`RS-59` と衝突しない ⇒ 衝突 0。

## 4. 当てた中身（仕様の差分）

| ID | 置き場 | 中身 |
|---|---|---|
| `FR-071` | `01-04-requirements.md:4064-4091` | RATIONALE の最後の文を「`Esc` で全画面表示を解くのはブラウザであり、アプリの `Esc` の階層（`IN-4` / `IN-4a`）とは別である」に。RATIONALE の後に段を置いた: Fullscreen API で `document.documentElement` を全画面にする（MUST）／ アプリの中で広げて代えない（MUST NOT）／ 入口が押されたら全画面でなければ入る・全画面なら出るを求める（MUST）／ 全画面かどうかは `document.fullscreenElement` の有無で判じる（MUST）／ `S-99f` は `fullscreenchange` で合わせる（MUST）／ 求めただけで `S-99f` を変えない（MUST NOT）／ `Esc` やブラウザの操作で解けたときも同じ道で戻る（⚠️）／ 時機は `UF-48` が持つ ／ 拒まれたか機能が無いときは `RS-59` の通知（MUST）／ `SK-15` の `F11` の既定動作を止める（MUST）／ `MK-10` は届かない（⚠️）／ ブラウザの窓の全画面では `S-99f` は通常のまま（⚠️） |
| `SK-15` | `01-04-requirements.md:3655`（表 T-036） | 操作の欄を「全画面表示を切り替える（規則は `FR-071`）」に |
| `RS-59` | `01-04-requirements.md:5864`（表 T-233、`RS-58` の次・`RS-15` の前） | 場面「ブラウザが全画面表示を認めなかった（求めを拒んだか、全画面表示の機能を持たない）」、作法 `NT-3a`、正 `FR-071` |
| `RS-59` の語 | `_source/display-words.json`（`reasons`） | 語「ブラウザが全画面表示を認めませんでした」／「The browser did not allow full screen」、次の一手「ブラウザのメニューから全画面表示にしてください」／「Use the browser's own menu to go full screen」 |
| `IN-4a` | `01-04-requirements.md:6093`（表 T-028） | 決定 6 のとおり理由と 2 つの ⚠️ を差し替えた |
| `S-99f` | `_source/settings.json` → 生成 `_assets/tbl-settings.md:340` | 注を決定 9 のとおりに |
| `UF-48` | `05-07-design.md:383`（表 T-075） | 責務に「全画面表示をブラウザに求めることと、ブラウザが告げた全画面表示の変化を `S-99f` へ写すこと（`FR-071`）」を足し、「求めは入口の入力（`FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST）」とその理由を置いた |
| `UF-61` | `05-07-design.md:395`（表 T-075） | 決定 8 のとおりに |
| `FT-6` | `05-07-design.md:803`（表 T-078） | 決定 7 のとおりに |
| 生成物 | `_assets/tbl-row-id-prefixes.md`（`FT` 5 → 6、`RS` 54 → 55）、`_assets/tbl-settings.md`（`S-99f` の 1 行）、`src/adapter/screen-renderer/display-words.json`（`RS-59` の項） | `npm run gen` |
| 変更履歴 | `docs/development-records/changelog.md` | 2.16 の 1 行 |

**足した MUST 条項**: 9（`FR-071` に 8、`UF-48` に 1）。

## 5. 数の予測

当てる前（`b7b26607`）`tables=150  figures=11  rows=1943  uids=153`。本書の差: tables 0 / figures 0 / rows +2（`RS-59`、`FT-6`）/ uids 0。予測 `tables=150  figures=11  rows=1945  uids=153`。実測は第 8 節。

## 6. 実装と試験で直す所（本書は直さない）

| 所 | 何が動くか |
|---|---|
| `src/adapter/input-command-translator/input-command-translator.ts:3569-3570` | `IC-11` の押下で `S-99f` を反転させない。全画面の求めを表す値を返す（形は実装の体が決める。シェルが外へ命じる操作の先例は `openDocumentFile` の行き先 `src/framework/single-html-shell/frame-loop.ts:3203-3213`） |
| `src/adapter/input-command-translator/input-command-translator.ts:3644` | `F11` でも反転させない。同じ求めを返す |
| `src/adapter/input-command-translator/input-command-translator.ts:1314` | `F11` の既定動作を止めることは保つ（決定 4）。`action: null` のままでは求めが殻に届かないので、`F11` を上の求めの値にする |
| `src/framework/single-html-shell/frame-loop.ts:3482`（`receiveInput`）/ `:3553` | 求めの値を受けたその呼び出しの中で、`document.fullscreenElement` を読み、無ければ `document.documentElement.requestFullscreen()`、在れば `document.exitFullscreen()` を呼ぶ。⛔ フレーム（rAF）へ回さない（`UF-48` の MUST）。⭐ 試験のため、この 3 つはシェルへ渡す小さな口（在るか・入る・出る）にまとめるとよい |
| `src/framework/single-html-shell/frame-loop.ts:425-476`（`NoticeReason`）/ `:1982`（`raiseNotice`） | `RS-59` を型に足し、Promise の reject と、`requestFullscreen` が無いときに `raiseNotice('RS-59', null)` |
| `src/framework/single-html-shell/single-html-shell.ts:426`（`resize` の購読の隣） | `document` の `fullscreenchange` を購読し、`document.fullscreenElement !== null` を殻へ渡す。殻は `screenStateWithFullScreen`（`src/entity/document-model/screen-state/screen-state.ts:56`）で `S-99f` を書き、フレームを起こす（`FT-6`） |
| `src/adapter/screen-renderer/app-header-items.ts:83-84` | 変えない —— `S-99f` を読むので、`S-99f` がブラウザを写せば押された見た目も写す |
| `src/adapter/screen-renderer/screen-frame.ts:95` / `src/framework/dom-screen-surface/dom-screen-surface.ts:2287` | `data-full-screen` は `S-99f` の写しとして残してよい。⛔ 全画面になった証拠として数えない |
| `tests/unit/uf-30-31.test.ts:1063-1071` | 反転を主張する ⇒ 直した後は赤。「`S-99f` は変わらず、求めが返る」の主張へ |
| `tests/unit/uf-30-31.test.ts:213` | `SK-15` の行の `member: 'screenState'` —— 答えるメンバが変わる |
| `tests/system/nfr-004-file-scheme-sweep.sws.test.ts:1166` | `SK-15` を `answers`（DOM が動いた）で数えている ⇒ `document.fullscreenElement` を読む主張へ |
| `tests/unit/document-model.test.ts:724-730` | 名と注が旧い `IN-4a` の理由（「FR-071 needs the browser press」）を引く。主張（`escapeTarget`）は正しいまま |
| `tests/unit/in-4-escape-closes-the-panel.test.ts:59-61`、`:739` | 旧い `IN-4a` の理由を逐語で引く（注と主張の文） ⇒ 仕様に無い引用になる |
| `tests/unit/dfc-307-in-4-the-standing-explanation-is-the-last-rung.test.ts:692` | 注が「全画面表示から `Esc` で戻る (FR-071)」を引く |
| `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts:290-491` | 表 T-233 の行ごとの指紋を持つ ⇒ `RS-59` の指紋が無く赤になる見込み（走らせていない） |
| `docs/development-records/defects.md` | 台帳の行を立てる（`JDG-125` の「原因を調べてから行を立てる」）。本書は立てない |

## 7. 試験が主張すべきこと

**単体**（仕様だけを読む試験の体が書く）:
1. `F11`（修飾キー無し）の `isBrowserDefaultStopped` が真である（`FR-071`）。
2. `IC-11` の押下と `F11` のどちらでも、全画面の口がちょうど 1 回、`receiveInput` の同じ呼び出しの中で呼ばれ、どの rAF の呼び返しよりも前である（`UF-48`）。`fullscreenElement` が無ければ「入る」、在れば「出る」である（`FR-071`）。
3. 求めた直後、`S-99f` と `IC-11` の押された見た目は変わっていない（`FR-071` の MUST NOT）。
4. 宿主から「解けた」（`fullscreenElement` 無し）が届くと `S-99f` が偽に戻り、`IC-11` の押された見た目も戻り、フレームが 1 つ起きる（`FR-071`、`FT-6`）。「入った」も同様に真。
5. 求めが reject されたとき、または口が「機能が無い」と答えたとき、`RS-59` の通知が 1 つ出て、`S-99f` は変わらない（`FR-071`、表 T-233）。

**系**（出荷ビルド `dist/index.html`）: `IC-11` を押すと `document.fullscreenElement === document.documentElement` になり、もう一度押すと `null` に戻る。`F11` も同じ。入口の押された見た目がそれに従う。

**限界**: Playwright のキー入力はページへ直に配られ、ブラウザのアクセラレータ（窓の `F11`）を通らない。⇒ 本物の `F11` で窓の全画面が二重に動かないこと、本物の `Esc` でブラウザが全画面を解きアプリの見た目が追うことは、人の手でしか確かめられない。

## 8. 検査

走らせたもの: `npm run gen`（exit 0）、`npm run gen:check`（exit 0）、`bash .claude/skills/spec-graph-check/check.sh` を当てる前と当てた後に 1 回ずつ（どちらも `ALL GREEN`。StrictDoc の export は同スクリプトが `scratch/` へ出す。`docs/spec/output/` は作られていない）。⛔ vitest と Playwright は走らせていない。

| 行（check.sh の要約） | 当てる前 | 当てた後 | 読み |
|---|---|---|---|
| `md-checks.py` の最終行 | `tables=150 figures=11 rows=1943 uids=153` | `tables=150 figures=11 rows=1945 uids=153` | 第 5 節の予測どおり |
| 検査 22（変更要求の 3 つの問い） | 214 件 | 215 件 | 本書が加わった |
| 辞書の生成物 | 566 語（524 記入） | 568 語（526 記入） | `RS-59` の語と次の一手 |
| 接頭辞の表が歩いた仕様の行 | 1943 | 1945 | `RS-59`、`FT-6` |
| 変更履歴の版 | 215 | 216 | 2.16 |
| 検査 39（MUST の条項を試験が逐語で持つか） | 1795 条項、保持 443、未保持 1352 | 1804 条項、保持 443、未保持 1361 | ⭐ +9 は第 4 節で足した MUST 条項の数と一致する。試験がまだ持たないので未保持が増えるのが正しい。基準線 1401 の内側 |

⭐ **赤は当てる前も当てた後も 0。** 動いた基準線ファイルは 0（どの行も「which is the baseline」か基準線の内側のまま）。

## 9. ⛔ この変更でやらないこと

- ⛔ 表 T-065 に `IF` の行を足さない、表 T-064 にメンバを足さない（決定 5）
- ⛔ 表 T-023 の `MK-10` を変えない —— 素のキーの既定動作は `FR-071` が `F11` についてだけ持つ
- ⛔ 素の `F1`（`SK-13`）と `P`（`SK-14`）の既定動作を止めている造り（`input-command-translator.ts:1314`）に条項を与えない —— 同じ穴だが、`JDG-125` の射程の外である
- ⛔ `IC-11` の行と辞書の語を変えない（決定 10）
- ⛔ `src/` と `tests/` と検査の基準線を手で書かない
