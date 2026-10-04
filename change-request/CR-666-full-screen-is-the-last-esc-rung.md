# CR-666 —— 全画面表示を `Esc` の最後の段にする（何も取り消せなくなってから全画面表示を出る）

> 起草の状態: 当てた（2026-10-04 夜）。段 1 で `20efb9fe` の上に起草し、調整役の go を受けて `8a02e43d`（`CR-660` が着地済み）へ載せ替えてから当てた。11 節の問いは調整役が利用者に問い、答えは `JDG-1421`・`JDG-1422`。
> ID の帯: 番号 `CR-666`、裁定の帯 `JDG-1420`〜`JDG-1429`、未決の帯 `PND-734`〜`PND-739`、台帳の帯 `DFC-2071`〜`DFC-2075`、見本の置き場 `previous-project-result/39-` は調整役から受けた（13 節で、木のどこにも `CR-666` ・ `JDG-1420` ・ `DFC-2071` が無いことを測った）。使ったのは `JDG-1420`〜`JDG-1422` と `DFC-2071` だけ。
> 閉じるもの: 台帳 `DFC-2071`（全画面表示のまま検索パネル・遅延診断・ヘルプを開いて `Esc` を押すと、先に全画面表示が抜ける）。
> 仕様の新しい識別子: 表 T-283 の行 `RG-17` を 1 つ取る（表の注「番号は最後の次を採り、並びは表の上下が持つ」に従う。表と行の頭字は既に在るので、新しい表番号も頭字も取らない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1420` | 「全画面表示中に検索パネルや、遅延診断、ヘルプを開いてESCを押下すると、先に全画面表示が抜ける。 全画面表示を抜けるのは、もう何もキャンセルできない状態になってからESCで全画面表示を抜けるようにしろ。 まずはESCの対象を列挙し、次に優先度を整理するところからやれ。」 | 全画面表示を `IN-4` の段の最後に足す（E-01・E-03）。対象の列挙は 1 節、優先度は 2 節 |
| `JDG-1421` | 「はい、全画面はいちばん最後 (Recommended)」 | 11 節の問い 1。選択・`Dual Cursor` モード・説明も全画面表示より先に消す（E-01） |
| `JDG-1422` | 「受け入れる (Recommended)」 | 11 節の問い 2。Firefox・Safari の限りを受け入れ、仕様に書く（E-02） |
| `JDG-1082` | 「Q3: 推奨通りC」（`CR-630`） | 開いているウインドウの段の中の前後（焦点が中にある窓 → 表 T-337 の手前）は変えない |
| `JDG-1083` | 「Q4: ーーーQ3のルールによる」（`CR-630`） | ウインドウとプロパティパネルの前後は変えない |
| `JDG-1353` | 「アイコン + ESC のみ  枠外では閉じない。 …」 | 列の絞り込みは `Esc` で先に閉じる（`SV-14`）—— 変えない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-002`**（狭い画面に最大の情報量を出す。その最も直接的な手段が全画面表示 —— `FR-071` の RATIONALE）。検索パネルを閉じるつもりの `Esc` が全画面表示を解くと、人は全画面表示に入り直すことになり、全画面表示が使いにくい道具になる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.14`（POLA）** —— 「`Esc` は手前のものから 1 つずつ閉じる」（`IN-4`）を覚えた人には、全画面表示の中でだけ一番外側（全画面表示）が先に解けるのは驚きである。⇒ 全画面表示を段の最後に置く。
- **`R1.3`（唯一の正）** —— 段の並びの正は `IN-4` の「消費する階層は」の並びで、表 T-283 は生成器がそれと 1 対 1 で一致することを確かめる（`tbl-state-machines.md` の表の前文）。⇒ 段は両方に同じ語で足す。新しい表は起こさない —— 並びを持つ表は既に表 T-283 である（決定 X-1）。
- **`IN-4a` の偽になる文** —— 「全画面表示を `Esc` で解くのはブラウザであり、本行が渡すかどうかに左右されない」は、本書の後は Keyboard Lock の効く閲覧環境で偽になる。⇒ 書き直す（E-02）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 並びの表は表 T-283 のまま。`IN-4` の並びと表 T-283 の `Esc` の行を、生成器の照合（`state_machines_json_to_md.py` の `ESCAPE_CHAIN`）ごと残し、両方に「全画面表示」を足す | 並びを持つ表が既に在り、2 か所の一致は機械が確かめている（規則の信頼の梯子では機械の照合が最上段）。正の向きを表へ移すと生成器の照合を書き直すことになり、本書の目的（段を 1 つ足す）より大きい | `IN-4` は並びを文で持ち続ける（表を指す形にはならない）—— 調整役が向きを移したいなら 11 節の問い 3 |
| X-2 | 全画面表示の段は、アプリが `document.exitFullscreen()` を求めて出る（`IC-11` の押下と同じ道）。`S-99f` は今までどおり `fullscreenchange` で戻す | `FR-071` の「求めただけで `S-99f` を変えてはならない」 | —— |
| X-3 | 全画面表示に入るとき、閲覧環境が Keyboard Lock を持てば `navigator.keyboard.lock(['Escape'])` を求め、全画面表示を出たら `navigator.keyboard.unlock()` で放す | 3 節。Keyboard Lock が無いとブラウザが `Esc` を先に取り、段が並びどおりに立たない | Chromium の外（Firefox・Safari）では直らない（3 節） |
| X-4 | Keyboard Lock が無い・断られたときは何も告げない（通知を出さない） | 断られても今と同じ振る舞い（ブラウザが全画面表示を解く）に戻るだけで、壊れるものが無い。告げると、全画面表示に入るたびに通知が出る | Firefox・Safari の人は、なぜ順が違うのかを画面から知れない |
| X-5 | 押しっぱなしの `Esc`（キーの自動の繰り返し、`KeyboardEvent.repeat` が真）は段を消費しない —— 押した最初の 1 回だけが 1 段を消費する | Keyboard Lock の下では、全画面表示を出る逃げ道は `Esc` の長押し（約 2 秒）である（3 節）。繰り返しの 1 回ごとに段を消費すると、長押しの 2 秒のあいだに開いている検索パネル・ヘルプ・選択まで全部が閉じる | 全画面表示でないときも、押しっぱなしで段を次々に閉じることはできなくなる（今もそれを求める行は無い） |

---

## 1. `Esc` の対象の全数（仕様とコード、`20efb9fe`）

⭐ 段の並びの正は `IN-4`（`docs/spec/01-04-requirements.md:8302`）と表 T-283 の `RG-1`〜`RG-8`・`RG-14`・`RG-16`（`docs/spec/_assets/tbl-state-machines.md`）。コードの段の判定は `escapeTarget`（`src/entity/document-model/screen-state/screen-state.ts:96`）、シェルの消費は `escapeLevelOf` と `spendEscapeRung`（`src/framework/single-html-shell/frame-loop.ts:1668`・`:1574`）。

| # | 対象 | `Esc` がすること | 段（表 T-283） | 仕様の行 | コード |
|---|---|---|---|---|---|
| 1 | 出ている通知（`U-57`） | 1 つ消す | `RG-1` 出ている通知 | `IN-4` ・ `NT-8` | `screen-state.ts:97`、`field-editing.ts` の `isPressTakenByStandingNotice` |
| 2 | プロパティパネルの文字の欄の編集 | 1 度目で打つ前の値へ戻し、離すと欄を離れる | `RG-2` その場の編集 | `IN-4` ・ `IN-6` ・ `SK-19` | `field-editing.ts:218` ・ `:253` |
| 3 | 文書名の欄の編集（`SK-9`） | 同上 | `RG-2` | 同上 | `field-editing.ts:405` ・ `:417` |
| 4 | 透かし解除の欄（`U-60` の中） | 1 度目で空にし、離すと欄を離れる | `RG-2` | 同上 | `field-editing.ts:478` ・ `:493` |
| 5 | 作ったタスクの名付け（`FR-091`） | 名付けをやめる | `RG-2` | `IN-4` ・ `FR-091` | `input-command-translator.ts:1414` の `isTextEntryUnsettled` |
| 6 | 問い `Confirmation`（`U-55`、`NT-7`） | 択を選ばずに閉じる | `RG-3` 開いている面（問いが先） | `IN-4` ・ `FR-070` | `screen-state.ts:99` |
| 7 | WBS の親の 2 択（`QN-12`、`WL-14`） | 択を選ばずに閉じ、混ざる前の選択に戻す | `RG-3`（問い） | `WL-14` ・ `QN-12` | `wbs-parent-hold.ts:94` |
| 8〜13 | 面: 書き出しの形式（`U-54`）・読んだ内容の扱い（`U-56`）・透かし解除（`U-60`）・差分の確認（`U-61`）・取り込みの報告（`U-62`）・休日の設定（`U-65`） | 閉じる | `RG-3`（面） | `IN-4` ・ `S-99g` | `screen-values.ts` の `openSurfaceState` |
| 14 | 進行中のドラッグ（バーの移動・作成・範囲選択・行や列の境界・パネルの境界・窓を動かす／大きさを変える `SV-10` ・ `SV-11`） | 中断し、押す前へ戻す | `RG-4` | `IN-1` ・ `IN-4` | `input-command-translator.ts:1416` の `gestureInFlight` |
| 15 | 引きかけの依存線（`AR-4`、`FR-009`） | 引くのをやめる | `RG-4` | `IN-4` | 同上 |
| 16 | 検索パネルの列の絞り込み（`IC-122`、`CR-660`） | 絞り込みだけを閉じる（次の `Esc` でパネル） | `RG-16` の中 | `SV-14` ・ `JDG-1353` | `frame-loop.ts:1523` |
| 17 | 検索パネル（`U-64`、通常・最大化） | 閉じる | `RG-16` 開いているウインドウ | `IN-4` ・ `SV-14` | `screen-state.ts:88` |
| 18 | 遅延診断レポートの窓の列の絞り込み | 絞り込みだけを閉じる | `RG-16` の中 | `RW-1` ・ `SV-14` | `frame-loop.ts:1528` |
| 19 | 遅延診断レポートの窓（`U-66`、通常・最大化） | 閉じる（印は残す） | `RG-16` | `IN-4` ・ `RW-1` ・ `RW-5` | `screen-state.ts:88` |
| 20 | ヘルプ（`helpModal`、通常・最大化） | 閉じる | `RG-16` | `IN-4` ・ `HN-2` | 同上 |
| 21 | 対話欄（`U-44`、通常・最大化） | 閉じる | `RG-16` | `IN-4` ・ `FR-066` | 同上 |
| 22 | プロパティパネル（選択 ／ 文書全体の設定） | 出すのをやめる（選択は残す） | `RG-14` | `IN-4` ・ `S-99h` | `screen-state.ts:104` |
| 23 | 構え（`AR-2` タスク形状・`AR-3` マイルストーン形状・`AR-4` 依存線・`AR-5` コメントボックス・`AR-6` ハイライトボックス・`AR-7` WBS の親） | 構えを解く（選択は残す） | `RG-5` | `IN-4` ・ 表 T-023b | `screen-state.ts:105` |
| 24 | 選択 | 解く | `RG-6` | `IN-4` | `screen-state.ts:106` |
| 25 | `Dual Cursor` モード | 出る | `RG-7` | `IN-4` ・ `DC-4` | `screen-state.ts:107` |
| 26 | 出ている説明（ツールチップ） | 消す | `RG-8` | `IN-4` ・ `IN-3` | `screen-state.ts:108` |
| 27 | **全画面表示（Fullscreen API、`S-99f`）** | ⚠️ **今は段に無い** —— ブラウザが `Esc` を先に取って解く | 無い（`IN-4a` の注） | `FR-071` ・ `IN-4a` | 無い（ブラウザが持つ） |

**数**: 対象 27（同じ段に括った面 6 つを 1 行に数えれば 22 行）。段は今 10、本書の後 11。

⛔ **`Esc` の対象ではないもの**（仕様が「閉じない」と言う）: マイルストーンの図形の一覧「…」（`S-142`、`FR-053`）・パレットの最小化（`S-200`）・記録（`S-206`）・最小化したヘルプと窓（`HN-2`、`IN-4` の「最小化していないもの」）・ガイドカーソルだけのとき（`DC-4` は `Dual Cursor` モードを出るだけ）。本書はこれらを変えない。

---

## 2. 提案する優先順（本書の後の `IN-4`）

| 順 | 段 | `Esc` がすること | 表 T-283 |
|---|---|---|---|
| 1 | 出ている通知 | 1 つ消す | `RG-1` |
| 2 | 確定していないその場の編集 | 打つ前へ戻す | `RG-2` |
| 3 | 開いている面（問いが先、面が後） | 閉じる | `RG-3` |
| 4 | 進行中のドラッグ・引きかけの矢印 | 中断する | `RG-4` |
| 5 | 開いているウインドウ（焦点が中にある窓 → 表 T-337 の手前。検索パネルと報告の窓は列の絞り込みが先） | 1 つ閉じる | `RG-16` |
| 6 | プロパティパネル | 出すのをやめる | `RG-14` |
| 7 | 構え | 解く | `RG-5` |
| 8 | 選択 | 解く | `RG-6` |
| 9 | `Dual Cursor` モード | 出る | `RG-7` |
| 10 | 出ている説明 | 消す | `RG-8` |
| **11** | **全画面表示** | **アプリが全画面表示を出ることをブラウザに求める（`IC-11` と同じ道）** | **`RG-17`（新）** |

⭐ 1〜10 は今の並びのまま（`CR-630`・`JDG-1082`・`JDG-1083`・`JDG-1353` を変えない）。足すのは 11 だけ。
⭐ 全画面表示を最後に置くのは、利用者の「もう何もキャンセルできない状態になってから」（`JDG-1420`）による —— 段が 1 つでも立っているあいだは、全画面表示を出ない。
⚠️ 説明（10）より後に置く: 説明は `IN-3` の「消せること」の手立てが `Esc` しか無いので、全画面表示より先に消す。

---

## 3. なぜ全画面表示が先に抜けるのか —— 閲覧環境の事実

**原因**: `FR-071` は全画面表示にブラウザの Fullscreen API（`document.documentElement.requestFullscreen()`、`single-html-shell.ts:164`）を使うと定める。Fullscreen API の全画面表示では、ブラウザが `Esc` をページより先に取り、全画面表示を解く。アプリの段（`IN-4`）はそこに届かない。仕様もそれを認めて「全画面表示を `Esc` で解くのはブラウザであり、本行が渡すかどうかに左右されない」と書いている（`IN-4a`、`FR-071` の RATIONALE）。⇒ **コードの不具合ではなく、仕様が全画面表示を段の外に置いている**。

| 事実 | 出典 |
|---|---|
| 既定では、ページの開いた窓と全画面表示が `Esc` を奪い合い、全画面表示が勝つ | Chrome for Developers「Better full screen mode with the Keyboard Lock API」 https://developer.chrome.com/blog/better-full-screen-mode |
| `navigator.keyboard.lock(['Escape'])` で、ページが全画面表示の中の `Esc` を受け取れる。人は `Esc` を押し続ける（長押し）と全画面表示を出られる | 同上 ／ Chrome for Developers「Keyboard Lock API」 https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock （「long (two second) Esc key press」） |
| Keyboard Lock が効くのは JavaScript から入った全画面表示（`requestFullscreen`）のあいだだけ。ブラウザの窓の全画面表示（ブラウザのメニューなど）では効かない | 同上（Keyboard Lock API） |
| 対応: Chrome 68 から。Edge・Opera は Chromium と同じ。**Firefox と Safari は持たない**（実験的・標準化の途中） | MDN「Keyboard: lock() method」 https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/lock 、browser-compat-data の `api.Keyboard.lock`（2026-10-04 に取得: chrome 68、edge mirror、firefox false、safari false） |
| 安全な文脈（secure context）が要る | MDN（同上） |
| `file://` は Chromium で「信頼してよい」起点（secure context）に数える —— 利用者が `dist/index.html` を `file://` で開いても、Pages の `https://` でも効く | W3C Secure Contexts https://www.w3.org/TR/secure-contexts/ （file の起点は Potentially Trustworthy）、MDN「Secure contexts」 |
| Chrome 131 で Keyboard Lock に許可の問いを足す計画は、出さないことに決まった（2026-03-17 の追記） | Chrome for Developers「The Keyboard Lock and the Pointer Lock APIs require permission from Chrome 131」 https://developer.chrome.com/blog/keyboard-lock-pointer-lock-permission |

**利用者の閲覧環境（Edge・Chrome）にとって**: Keyboard Lock を求めれば、全画面表示の中でも `Esc` がページに届き、2 節の順で段を消費できる。段が尽きた 11 番目の `Esc` で、アプリが全画面表示を出る。⚠️ 長押し（約 2 秒）の `Esc` は、段に関わらずブラウザが全画面表示を解く —— ブラウザの逃げ道であり、ページは止められない（止めてはならない）。そのときも `fullscreenchange` で `S-99f` が戻る（今と同じ道）。
**ほかの閲覧環境（Firefox・Safari）**: Keyboard Lock が無いので、今と同じくブラウザが先に全画面表示を解く。本書はそれを直せない —— 仕様に限りとして書く（E-02）。
**F11 の全画面表示**: `SK-15` の `F11` はブラウザの既定動作を止めて Fullscreen API へ回している（`FR-071`）ので、Keyboard Lock が効く。ブラウザのメニューで入った窓の全画面表示は `S-99f` が通常のまま（`FR-071`）で、本書の段にも乗らない。

⚠️ **段 2 で実物を測る**: Edge で ① 全画面表示 → 検索パネル → `Esc` で検索パネルだけ閉じる ② 次の `Esc` で全画面表示を出る ③ 長押しで出る ④ 押しっぱなしでも段を 1 つしか消費しない（X-5）。測りは `previous-project-result/39-` に置く。Keyboard Lock がユーザーの活性化（transient activation）を要るかは資料で揃わない（MDN は要ると書き、Chrome の資料は書かない）ので、`requestFullscreen` と同じ押下の中で求める（5 節）。

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`IN-4`（表 T-028）の並びの末尾に「全画面表示」を足す。

- 旧: 「消費する階層は 出ている通知 → … → `Dual Cursor` モード → 出ている説明 の順とすること（MUST） —— 説明を最後に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである。」
- 新: 「消費する階層は 出ている通知 → … → `Dual Cursor` モード → 出ている説明 → 全画面表示 の順とすること（MUST） —— 説明を全画面表示の前に置くのは、`IN-3` が求める「消せること」を果たす手立てがほかに 1 つも無いからである。<br>⭐ **全画面表示を最後に置くのは、利用者が「もう何もキャンセルできない状態になってから」全画面表示を出ると定めたからである**（`JDG-1420`） —— 前に置くと、検索パネルやヘルプを閉じるつもりの `Esc` が全画面表示を解き、人は入り直すことになる。<br>全画面表示の段は、全画面表示を出ることをブラウザに求める（`FR-071` の入口の押下と同じ求め）。<br>⛔ 押しっぱなしの `Esc` の繰り返し（`KeyboardEvent.repeat` が真の押下）で段を消費してはならない（MUST NOT） —— 全画面表示を出るブラウザの逃げ道は `Esc` の長押しなので、繰り返しのたびに消費すると、長押しのあいだに開いているものが全部閉じる。」

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`IN-4a` の 2 つの注を替える。

- 旧: 「⚠️ **全画面表示を `Esc` で解くのはブラウザであり、本行が渡すかどうかに左右されない** —— アプリは解けたことを後から受けて `S-99f` を戻す（`FR-071`）。<br>⚠️ 全画面表示の中で押した `Esc` がページにも届くかどうかはブラウザが決める —— 届いたときの扱いは `IN-4` の階層のとおりである」
- 新: 「⚠️ 全画面表示のあいだは、`IN-4` の全画面表示の段がいつも立つので、本行の「渡す」は起きない。<br>⚠️ **閲覧環境が Keyboard Lock を持たないか断ったときは、ブラウザが `Esc` をページより先に取って全画面表示を解く** —— `IN-4` の並びはそのとき成り立たず、アプリは解けたことを後から受けて `S-99f` を戻す（`FR-071`）。<br>⚠️ `Esc` の長押しで全画面表示を解くのはブラウザの逃げ道であり、`IN-4` の段に左右されない —— これも `S-99f` を同じ道で戻す」

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-071` の RATIONALE の「`Esc` で全画面表示を解くのはブラウザであり、アプリの `Esc` の階層（表 T-028 の `IN-4` / `IN-4a`）とは別である。」を替え、同じ段落の `fullscreenchange` の文の後に 2 文を足す。

- 新（替える 1 文）: 「`Esc` で全画面表示を出るのは、アプリの `Esc` の階層の最後の段である（表 T-028 の `IN-4`）。」
- 新（足す 2 文）: 「全画面表示に入ることをブラウザに求める押下の中で、閲覧環境が Keyboard Lock（`navigator.keyboard`）を持つなら `Escape` の鍵をかけることを求め、全画面表示を出たことを受けたら鍵を放すこと（MUST） —— 鍵が無いと、ブラウザが `Esc` をページより先に取り、`IN-4` の段より先に全画面表示を解く。<br>⛔ 鍵を断られたこと・閲覧環境が持たないことを通知してはならない（MUST NOT） —— 断られても、ブラウザが全画面表示を解く今までの振る舞いに戻るだけであり、告げると全画面表示に入るたびに通知が出る（`IN-4a`）。」

<!-- EDIT id=E-04 file=docs/spec/_source/state-machines.json -->
表 T-283 の `RG-8` の次に行 `RG-17` を足す（`npm run gen` で `_assets/tbl-state-machines.md` を作り直す）。

| 行 ID | 奪い合う出来事 | 段 | 段ごとの状態のキー | 順を決めた行 | 注 |
| --- | --- | --- | --- | --- | --- |
| RG-17 | `Esc` | 全画面表示 | `fullScreenModeStateMachine.full` | `IN-4` ・ `FR-071` | 最後の段。閲覧環境が Keyboard Lock を持たないときはブラウザが先に取る（`IN-4a`）。番号は最後の次を採り、並びは表の上下が持つ |

⚠️ `escapePressed` の `rung` の語に `fullScreen` を足す（表 T-280 の出来事の運ぶ値）。状態機械 `fullScreenModeStateMachine` の遷移は足さない —— `S-99f` は `fullscreenchange` だけで動く（X-2）。

<!-- EDIT id=E-07 file=docs/spec/_source/published-entries.json -->
表 T-064 の `PI-27`（`DomInputSource`）に、公開する 2 つの名を足す（`npm run gen` で `_assets/tbl-published-entries.md` を作り直す）: `escapeKeyLockOf`（閲覧環境の `navigator.keyboard` を受け、`Escape` の鍵をかける手と放す手を返す。Keyboard Lock を持たない・断られたときは何もせず、告げない）と、その返す型 `EscapeKeyLock`。⚠️ 当てるときに足した —— 鍵の手を `SingleHtmlShell` の外（`DomInputSource`）に置いて試験から呼べるようにしたので、部品をまたぐ名になった（check 26b）。

<!-- EDIT id=E-05 file=docs/development-records/rulings.md -->
`JDG-1420` の状態を 適用済、着地先を `IN-4`・`IN-4a`・`FR-071`・表 T-283 の `RG-17` にする。

<!-- EDIT id=E-06 file=docs/development-records/changelog.md -->
表の末尾に次の版の 1 行を足す（並行した CR と重なれば調整役が振り直す）。

---

## 5. 継ぎ目

```
SEAM (CR-666) -- as applied
- screen-state.ts EscapeTarget: 'fullScreen' added; EscapeContext gains isFullScreen?: boolean;
  escapeTarget returns 'fullScreen' after 'tooltip' when isFullScreen is true.
- input-command-translator.ts escapeContextOf: isFullScreen = screen.fullScreenModeState is 'full'
  (S-99f, which follows fullscreenchange), so shortcut-keys stops the browser default while full.
- frame-loop.ts ESCAPE_RUNG_EVENTS: fullScreen -> { type: 'fullScreenEntryPressed' } (ESCAPE_FULL_SCREEN),
  the IC-11 event; askBrowserForFullScreen then asks exitFullScreen inside the same input call.
  Functions touched on the Esc path: the ESCAPE_RUNG_EVENTS table and one new constant only;
  escapeLevelOf, spendEscapeRung and isBrowserDefaultStopped are unchanged.
- dom-input-source.ts: isHeldEscapeRepeat drops a keydown of Escape with repeat true (onKeyDown);
  escapeKeyLockOf(keyboard) / EscapeKeyLock wrap navigator.keyboard.lock(['Escape']) / unlock(),
  swallowing a throw, a rejection and an absent API (X-4). Published in PI-27 (E-07).
- single-html-shell.ts pageFullScreenHost.requestFullScreen: locks before requestFullscreen (which
  spends the press's activation), unlocks if the request is refused; fullscreenchange to "not full"
  unlocks.
- field-editing.ts: isFreshEscape replaces the three Esc key checks of the keydown listeners, so a
  repeat does not let go of a field the first press took back.
- screen-values.ts: unchanged (no new transition; S-99f moves by fullScreenChanged only).
```

---

## 6. グラフ（`20efb9fe`、`impact.py`）

- `IN-4`: 要求 12 件 / 参照 65 か所。並びの語を写しているのは表 T-283（生成器が照合）だけ。ほかは段の名を指すだけで、全画面表示の位置を言わない。
- `IN-4a`: 要求 2 件 / 参照 2 か所（`FR-071` の RATIONALE と `IN-4` の本文）。
- `FR-071`: 7 表（T-028・T-109・T-036・T-206・T-075・T-233・T-023）の 8 行を指す。替えるのは RATIONALE の 1 文と足す 2 文だけで、入口（`IC-11`・`SK-15`）と `S-99f` は変えない。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後（予測） |
|---|---|---|
| `IN-4` の並びの段 | 10 | 11 |
| 表 T-283 の `Esc` の行 | 10 | 11 |
| `escapeTarget` が返す語 | 14（窓 4 を含む） | 15（実測 —— `EscapeTarget` の語） |
| 全画面表示の中で、検索パネルを開いて押す `Esc` の 1 度目 | 全画面表示が解ける（パネルは残る） | パネルが閉じる（全画面表示は残る） |
| 全画面表示の中で、何も立っていないときの `Esc` | 全画面表示が解ける（ブラウザ） | 全画面表示が解ける（アプリが求める） |

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ・ `docs/spec/_source/state-machines.json` ＋ 台帳 | E-01〜E-06、`npm run gen` |
| 2 | `src/entity/document-model/screen-state/screen-state.ts` ・ `src/framework/single-html-shell/frame-loop.ts` ・ `single-html-shell.ts` ・ `src/framework/dom-input-source/dom-input-source.ts` ・ `src/use-case/advance-screen-session/screen-values.ts` | 5 節の継ぎ目 |
| 3 | `tests/` | 9 節 |

- ⭐ **毎フレームの経路: いいえ。** 段の判定は `Esc` の押下のときだけ走る。`perf-pending.md` に行は足さない。
- ⚠️ 当てたとき、鍵の手は `single-html-shell.ts` ではなく `dom-input-source.ts` に置いた（`single-html-shell.ts` は読み込むだけで `document` に触れ、試験から読めない）。

---

## 9. 仕様の外で直すもの

- コード: 8 節の波 2。
- 動く試験: 段の並びを数える試験（`tests/contract/t-283-priorities.contract.test.ts`、`tests/contract/dfc-307-in-4-the-standing-explanation-is-the-last-rung.test.ts` —— 説明を「最後の段」と言う）、全画面表示の求め（`tests/unit/cr-389-fr-071-full-screen-is-asked-of-the-browser.test.ts`）。
- 新しい試験（仕様だけを読む体）: `tests/unit/cr-666-full-screen-is-the-last-esc-rung.test.ts`（39 件、緑）—— 全画面表示のとき、立っている段がある `Esc` は全画面表示を出ず、段が尽きた `Esc` で出る ／ 繰り返しの `Esc` を報告しない ／ 鍵を求め、放し、断られても投げない。体は仕様と継ぎ目の名だけを読んだ。
- 書き換えた試験: 上の 3 つと `tests/contract/dfc-1362-search-column-filter.contract.test.ts`・`tests/unit/document-model.test.ts`（`IN-4a` の「全画面表示はどちらの答えも変えない」→「全画面表示のあいだは全画面表示の段が立つ」）。
- 実物の確かめ: 3 節の ①〜④ を Edge で。利用者に押してもらう手順は調整役へ渡す（`JDG-1340`）。
- 台帳: `defects.md` の `DFC-2071`、`rulings.md` の `JDG-1420`、`changelog.md`。

---

## 10. ⛔ この変更でやらないこと

- 1〜10 の段の並び（`CR-630`・`JDG-1082`・`JDG-1083`・`JDG-1353`）は変えない。
- 全画面表示の入口（`IC-11`・`SK-15`）と `S-99f` の持ち方は変えない。
- Firefox・Safari で全画面表示を段の最後に置く手立て（アプリの中で描く領域を広げる代わり）は採らない —— `FR-071` が禁じている。
- `Esc` の対象でないもの（1 節の末尾）を対象にしない。

---

## 11. 利用者に問うこと

1. **選択・`Dual Cursor` モード・出ている説明も、全画面表示より先に消すか。** 前に立つ者の推し: **はい（2 節のとおり、全画面表示をいちばん最後）** —— 「もう何もキャンセルできない状態になってから」の字のとおり。代償: タスクを選んでいるときは、全画面表示を出るのに `Esc` が 1 度多く要る（長押しならすぐ出られる）。もう一方の択: 全画面表示を「プロパティパネル」の次（構え・選択・`Dual Cursor` モード・説明より前）に置く。
2. **Firefox・Safari で直らないことを受け入れるか。** 推し: 受け入れる —— 利用者の閲覧環境は Edge・Chrome で、Keyboard Lock を持たない閲覧環境ではページが `Esc` を受け取れない（3 節）。
3. **（調整役へ）並びの正を表 T-283 へ移すか。** 推し: 移さない（X-1）—— 2 か所の一致は生成器が確かめている。

---

### 答え（2026-10-04 夜）

1. → 「はい、全画面はいちばん最後 (Recommended)」（`JDG-1421`）。`IN-4` に 1 文を足した。
2. → 「受け入れる (Recommended)」（`JDG-1422`）。調整役の添え「仕様にもその旨を書いてください」に従い、`IN-4a` に「この限りは受け入れる」の 1 文を足した。
3. → 調整役: 移さない（推しどおり）。③ の X-1〜X-5 も調整役が認めた。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1420`〜`JDG-1422` | 本書の裁定（利用者の言葉と、11 節の答え）。適用済 |
| `JDG-1082`・`JDG-1083`・`JDG-1353` | `Esc` の段の中の前後の裁定。本書は変えない —— 書き換えない |
| `DFC-2071` | 本書が閉じる症状。`実測待ち`（実物の確かめは 14 節） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to origin/refactor 20efb9fe

# the numbers are unused (0 before drafting)
git grep -n -e "CR-666" -e "JDG-142[0-9]" -e "DFC-207[1-5]" -e "PND-73[4-9]" -e "RG-17"

# every Esc target in the spec and the code
grep -nE "\bEsc\b|Escape" docs/spec/01-04-requirements.md docs/spec/05-07-design.md
grep -rnE "'Escape'|ESCAPE_KEY|escapeTarget\(|escapePressed" src --include=*.ts | grep -v test
grep -n "RG-" docs/spec/_assets/tbl-state-machines.md

# the blast radius
python .claude/skills/spec-graph-check/impact.py IN-4
python .claude/skills/spec-graph-check/impact.py IN-4a
python .claude/skills/spec-graph-check/impact.py FR-071

# browser support of Keyboard Lock
curl -s https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Keyboard.json
```

---

## 14. 実物の確かめ

### 14.1 ページの側（2026-10-04 夜、本席が測った）

本書を当てた木をビルドした `index.html` を、Playwright（msedge、headless、1920×1080）で開いた。headless では本物の全画面表示に入れないので、`requestFullscreen` ・ `exitFullscreen` ・ `navigator.keyboard` を数える代役に差し替えた（`tests/system/cr-389-full-screen-is-asked-of-the-browser.test.ts` の代役と同じ形）。

| 手 | 全画面表示 | 検索パネル | 鍵 |
|---|---|---|---|
| `IC-11` を押す | 入る（求め 1） | — | `lock(["Escape"])` |
| `Ctrl` ＋ `F` | 入ったまま | 出る | — |
| `Esc` 1 度目 | **入ったまま** | **閉じる** | — |
| `Esc` 2 度目 | **出る（`exitFullscreen` 1）** | — | `unlock()` |
| 入り直して検索パネルを出し、`Esc` を押しっぱなし（繰り返し 2 回） | 入ったまま | 閉じる（1 段だけ） | — |

⚠️ ブラウザが `Esc` をどう扱うか（鍵の効き目、長押しで出ること）は代役では測れない —— 14.2 を利用者が実物で押す。

### 14.2 利用者に押してもらう手順（調整役へ渡す。`JDG-1340`）

Edge（または Chrome）で、調整役が作り直した `dist/index.html` を開く。

1. ヘッダーの全画面表示のアイコン（または `F11`）で全画面表示に入る。
2. ヘッダーの検索のアイコン（または `Ctrl` ＋ `F`）で検索パネルを開き、`Esc` を 1 度押す。⇒ **検索パネルだけが閉じ、全画面表示のまま**であること。
3. もう 1 度 `Esc` を押す。⇒ 全画面表示を出ること。
4. 全画面表示に入り直し、遅延診断のレポート、ヘルプ、検索パネルを順に開き、タスクを 1 つ選ぶ。`Esc` を 1 度ずつ押す。⇒ 手前のものから 1 つずつ閉じ、選択が解け、**最後の `Esc` で全画面表示を出る**こと。
5. 全画面表示に入り直し、ヘルプを開いてから検索パネルを開き、`Esc` を 2 秒ほど押し続ける。⇒ 押し始めで検索パネルだけが閉じ（ヘルプは残る）、押し続けるとブラウザが全画面表示を解くこと。
