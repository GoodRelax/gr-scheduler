# CR-607 — 設定の面の頭に GRS リセットの入口を置き、GRS がブラウザに持つ値を消して読み直す

> 起草の状態: 当てた —— 8 節の**波 2 の仕様と生成だけ**（2026-10-01、枝 `spec-pass-1001`、仕様の通し。`8b5480ed` の上）。E-01 〜 E-17 を当て、`npm run gen` を打った。番号は `FR-153`・表 `T-345`（接頭辞 `WP` を登録、`WP-1` 〜 `WP-9`）・`IC-139`・`QN-11`・`UN-19`（`8b5480ed` で測って 0 件）。⚠️ 載せ直した旧: E-01（`CR-606` の波 1 が語を「テーマ色」に替えた行）、E-03・E-07（数は 表 T-109 が 120 → 121 行、表 T-234 が 8 → 9 行、表 T-103 は 64 行）、E-09・E-10（`CR-605` の後の図 F-019: 高さ 504、最後の図形は `IC-138`）。検査 46 のため E-04 の 2 文を 2 行に分け、E-05 の括弧の中の「。」を「、」にした。⭐ 本書の外で足したもの（案。利用者に見せる）: 図 F-019 の `IC-139` の図形は E-10 の起草のまま、ヘルプは 表 T-256 の `HC-1` の末に `Properties Panel` の塊（`tools/generate_help_roster.py` も同じ）。⛔ 波 2 の手書きのコード（`file-flow-values.ts` の受け手・`advance-screen-session.ts` の `IS_FILE_FLOW_EVENT`・`frame-loop.ts`・`input-command-translator.ts`）と波 1・3・4 は当てていない —— 生成の区画に出来事の型が刷られたので、`tsc` は `HANDLERS` と `IS_FILE_FLOW_EVENT` の 2 か所で落ちる（コードの巡が閉じる）。
> 読んだ木（起草）: `b2-panel-crs` の `0590ad03`（`refactor`）。
> ID の帯: 調整役から受けた（B2: CR-606..609）。本書が作る識別子はどれも仮であり、当てる時に測り直して番号を取る（2 節）。
> 当てる順: `CR-606` → **本書** → `CR-609` → `CR-608`（調整役の順）。4 節の旧は、どれも `0590ad03` の木から写した。`CR-606` と `CR-609` も書き換えうる塊は 4.1 節（重なり）に挙げた —— 当てるときは、それらの新の文へ載せ直してから当てる。
> 閉じるもの: `DFC-1321`（利用者の指示 `JDG-851`、裁定 `JDG-922` の #2）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語（`docs/development-records/rulings.md` から写した）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-851` | 「#2 三 で設定を開いたあと、テーマ色の上に下記のボタンを配置しろ<br>[GRS リセット] / [GRS Reset]<br>押下した場合、下記のメッセージを表示して Yesの場合GRSをリセットせよ。<br>  GRSをリセットしますか? [Yes] / [No]<br>    ※リセットしても不具合が直らない場合、以下をお試しください。<br>        Ctrl + F5 : 再読み込み<br>        F12 (開発者ツール) → Application → GRSのローカルストレージとクッキーをクリア<br><br>主要なブラウザのショートカットキーは同じかな？<br>リセットは、GRSのクッキーとローカルストレージクリアでいいよね？あと何かある？ 意見くれたし。<br><br>目的:なんらかのバグでGRSの動作がおかしいとき、リセットする」 | 本書の骨格。入口の置き場・語・問いの文・直らないときの手順 |
| `JDG-922` | 「他は、全部推奨どおり」 | 同行の #2 の推奨「リセットで `S-99c`（透かしの合言葉）は消さない」を受けた —— 表 T-345 の `WP-4` |

**利用者の問い 2 つへの答え**（`JDG-851` の「主要なブラウザのショートカットキーは同じかな？」「あと何かある？」。測ったのは `DFC-1321` の行と本書）:

| 問い | 答え | 根拠 |
|---|---|---|
| ショートカットは同じか | Chrome ／ Edge ／ Firefox は `Ctrl` ＋ `F5` と `F12` が同じ。Firefox の開発者ツールでは欄の名が Application ではなく「ストレージ」。Safari（mac）は ⌥⌘R ・ ⌥⌘I | `DFC-1321` の行の最後から 2 つ目の欄。Safari は `CN-2` が対象外とする |
| クッキーとローカルストレージで足りるか、ほかに何かあるか | `GRS` がブラウザに置くのは `localStorage` の 4 つの値だけ（`S-99`・`S-99a`・`S-99b`・`S-99c`）。クッキー・`sessionStorage`・`IndexedDB`・Cache は 0 件。⇒ 消すのは `localStorage` の `GRS` の鍵だけで足りる。⛔ ただし `localStorage` をまるごと消してはならない（`WP-6`）。⭐ ほかに要るのは「読み直す」こと —— 消しても、いま動いているページは値を覚えたまま動く | `src/framework/single-html-shell/browser-stored-values.ts:10-15`。`git grep` で `document.cookie`・`sessionStorage`・`indexedDB`・`caches.`・`serviceWorker` を `src` から引いて 0 件（13 節） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-5` ／ `GL-005`**（1 つのファイルだけで動く） —— サーバーを持たない `GRS` は、ブラウザに残した値（表 T-206 の別枠）で次の起動の動きを変える。その値のせいでおかしくなったとき、いまは戻す手立てがブラウザの開発者ツールしか無い（`DFC-1321`）。本書はその手立てを画面の中に置く。
あわせて **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 直らないときの手順を、問いの文そのものが示す。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 4 つの食い違いが出た。どれも 1 か所に正を置いて解いた。
  1. `FR-041` は色相の入口を「文書の設定の面の先頭の欄」とする（`docs/spec/01-04-requirements.md:2089`）。リセットをその上に置けば「先頭」が偽に読める。⇒ リセットの入口は**欄ではない**（値を持たない）と新しい要求が定め、`FR-041` にはその 1 文への指しを足す（E-01）。`FR-072` の「その欄は読むだけ」（`:1967`）も欄の話であり、変えない。
  2. `FR-100`（`:6526`）は「未保存の編集を持ったまま離れようとしたとき、宿主の警告が出るようにすること（MUST）」とする。リセットの読み直しにもそれが当たる。⇒ 例外は新しい要求が理由とともに 1 か所で持ち、`FR-100` は指すだけにする（E-04）。
  3. `FR-031` の後の段は「対象外の操作で文書が戻ってはならない（MUST NOT）」とする（`:2300`）。リセットは対象外であり、読み直すと文書は最後に保存した形へ戻る。⇒ 表 T-027 の新しい行が、あちらは取り消しの履歴で戻ることを禁じる文であり、読み直しは 表 T-034 から開き直すことだと書く（E-02）。
  4. `FR-029`（`:7182`）は「用途を言葉ではなくアイコンで伝えること（MUST）」とし、利用者の逐語は語のボタン「[GRS リセット] / [GRS Reset]」を描く。⇒ 入口は図形の入口（表 T-109 の行と 図 F-019 の図形）とし、面の行の形（左に名、右に入口）で名に同じ語を刷る（決定 1）。
- **`R1.3`（出どころ）** —— `FR-072` の「落とした高さは、最も頻繁に触る項目が上へ来るぶんである」（`:1961`）に、めったに押さない入口を最上段に置くことは合わない。⇒ 置き場は利用者が名指した（`JDG-851` の「テーマ色の上」）。裁かれた行が勝つ（規則 02 の 1 節）。
- **`R1.4`（異常系）** —— ① `localStorage` を読めない・書けない閲覧環境: 消せなくても読み直す（`UF-159` の「書けないときは何もしない」をそのまま使う）。② 問いが立っているあいだの押下: `IC-98` と同じく 表 T-233 の `RS-27`（E-15）。③ 宿主の警告で留まる道: 無くす（上の 2）。④ 未保存の編集が無い: それでも問う（決定 9）。
- **`R1.6`（否定要求は代替を示す）** —— 「`localStorage` をまるごと消してはならない」の代わりに、`GRS` の鍵を共通の接頭辞で見分けて消す道を同じ表が示す（`WP-5`・`WP-6`）。
- **`R4.3`（原子性）** —— 「鍵は消えたがページは古い値のまま動く」という途中の状態を作らない: 消してから読み直し、その読み直しで宿主の警告を出させない（新しい要求の 2 つの MUST）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 鍵を消すのは、鍵を読み書きする `UF-159` だけとする（E-16）。
- **`R2.9`（YAGNI）** —— `Command Palette` の入口・キー・`Agent API` の関数を足さない（10 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 入口は 表 T-109 の図形の入口（`IC-139`、面は `Properties Panel`）とし、面の行の形で左に名「GRS リセット」／「GRS Reset」、右に図形の入口を置く。名は辞書が同行に持つ `label` | `FR-029` の MUST（アイコンで伝える）と、利用者の逐語の語（`JDG-851`）を両方満たす形。面のほかの行も左に名・右に値を置く（`src/adapter/screen-renderer/properties-panel.ts` の `themeHueField`） | 図形を 1 つ新しく起こす（E-10、右回りの円い矢印）。起草であり、実物と見比べて選び直す（表 T-026 の `RC-13`） |
| 決定 2 | リセットの入口は面の**欄ではない** —— テーマ色の欄は、その入口の下で欄の先頭のまま | `FR-041` の「先頭の欄」と `FR-072` の「その欄は読むだけ」を偽にしない、いちばん小さい形。`FR-072` も `IC-17` の行も書き換えない（`CR-609`・`CR-606` と重ならない） | `FR-041` に 1 文を足す（E-01） |
| 決定 3 | 消すのは `localStorage` の `GRS` の鍵（共通の接頭辞で見分ける）のうち `S-99c` を除くすべて。表に行の無い古い鍵も消す（`WP-5`）。ほかの鍵・クッキーほかには触れない | `DFC-1321` の対応方針と `JDG-922`（`S-99c` は消さない）。古い鍵を残すと、それが元のおかしさを直せない | 同じ出どころを共有する閲覧環境では、同じ端末のほかの `GRS` の `.html` の次の起動も戻る（新しい要求の RATIONALE。値がもともと出どころごとに 1 つなので、本書が作る代償ではない） |
| 決定 4 | 問いの文が運ぶ直らないときの手順は、`Ctrl` ＋ `F5`（読み直す）と `F12`（開発者ツール）→ Application（Firefox では「ストレージ」）→ GRS のローカルストレージを消す、の 2 つ。**Safari の打鍵は書かない。「とクッキー」は落とす。鍵の綴り（接頭辞）は書かない** | Safari は `CN-2` が対象外とする。`GRS` はクッキーに何も置かない（`WP-7`）—— 書くと、`GRS` の何も無い所を探させる。鍵の綴りを仕様に載せないのは `JDG-300` の Q14（`PND-180`）の裁定 | 利用者の逐語から 1 語（「とクッキー」）落ちる。開発者ツールでは、どの鍵が `GRS` のものかを利用者が見分ける（`grsched.` で始まる鍵は見れば分かる） |
| 決定 5 | 消すもの・残すものの表は、`_assets/tbl-settings.md` の 8 節ではなく、新しい要求の中の 表 T-345（`docs/spec/01-04-requirements.md`、手書き）に置く。接頭辞は新しく 1 つ（候補 `WP`） | 同書の原稿 `docs/spec/_source/settings.json` の行 ID は `settings.schema.json` が `^S-[0-9]+[a-z]?$` に限る。`S` の行を足せば、`S-99` 〜 `S-99c` と同じ値に 2 つ目の行 ID が付く（`JDG-274`）。どれを消すかは値ではなく規則であり、規則は要求が持つ（`FR-041` の 表 T-305 と同じ形） | 登録簿に接頭辞が 1 つ増える（E-17） |
| 決定 6 | リセットは取り消しの対象外（表 T-027 の新しい行 `UN-19`）。だから問う | `FR-031` の RATIONALE: 問うてよいのは「取り消しで取り戻せないものを失う場面」に限る。リセットは取り消しの履歴ごと読み直す | — |
| 決定 7 | リセットの読み直しでは `FR-100` の宿主の警告を出させない | 決定 9 の問いが、捨てる文書の名前を挙げて既に問うている。出させると、留まった人の画面で鍵だけが消えた途中の状態が残る（`R4.3`） | 未保存の編集を捨てる問いは `GRS` の問い 1 つだけになる |
| 決定 8 | `Agent API` にリセットを与えない（MUST NOT） | 読み直すと呼び手との繋がりごと消え、`FR-028` の「受理したか否かを値で返す」を果たせない | — |
| 決定 9 | 未保存の編集が無くても問う。名前を挙げるのは未保存の編集があるときだけ（捨てる文書の名前。`QN-5` と同じ） | 消える値（言語・`Agent API` の記録）はどれも取り消しで戻せない（決定 6）。`NT-7` の「消えるものの名前を挙げる」は文書の値に当たる | 毎回 1 度の問いが立つ |
| 決定 10 | 問いの文は、辞書の語の中の改行で行を分け、`Confirmation` がそこで行を改める | 利用者の逐語が手順を 1 行ずつ書いている。辞書の語に改行を持つのは本行が初めて（`display-words.json` の全語を引いて 0 件）なので、新しい要求が 1 文で定める | `notices-drawing.ts` の問いの文の描き方を 1 つ変える（9 節） |
| 決定 11 | `S-99b`（`Agent API` を有効にした記録）も消す | `JDG-922` が残すとしたのは `S-99c` だけ。⚠️ `JDG-896` の「`S-99b` は残す」は対話欄の既定を決めた裁定であり、リセットの範囲の裁定ではない | リセットの後は `Agent API` を有効にし直す |
| 決定 12 | 新しい要求の親は `GL-005`（`FR-069` と同じ `ORIGIN` の形）。置き場は `FR-100` の直後 | 未保存の編集の扱い（`FR-100`）の隣に読み直しの例外を置く | — |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 入口とその置き場・問い・消す順・例外 | 新しい要求 `FR-153`（`01-04-requirements.md`、`FR-100` の直後） | E-05 | その要求の 1 文 |
| 消すもの・残すもの | 同要求の中の 表 T-345（9 行） | E-05 | 表の 1 行の「リセットで」の欄 |
| 色相の欄は欄の先頭のまま | `FR-041` に 1 文 | E-01 | その 1 文 |
| 取り消せない | 表 T-027 に `UN-19` | E-02 | その行 |
| 数の主張 | `FR-086` の「表 T-109 の 113 行」「表 T-234 の 8 行」 | E-03 | — |
| 宿主の警告の例外 | `FR-100` に 1 文（指すだけ） | E-04 | その 1 文 |
| 問いの文 | 表 T-234 に `QN-11`、辞書 `questions` に 1 項 | E-06・E-12 | 辞書の語 |
| 入口の行と図形 | 表 T-109 に `IC-139`（前文の数 113 → 114）、図 F-019 に図形、辞書 `icons` に 1 項 | E-07・E-08・E-09・E-10・E-11 | 辞書の語 ／ 図形 |
| 状態機械 | `state-machines.json` の出来事 1 つ・`questionAsked` の運ぶ値・遷移 2 升 | E-13・E-14・E-15 | — |
| 設計 | `05-07-design.md` の `UF-159` の職務 | E-16 | — |
| 接頭辞 | `row-id-prefixes.json` に `WP` | E-17 | — |

**数**: 編集 17（手書きの `.md` 9・図 2・原稿 JSON 6）。生成物は手で直さない —— `npm run gen` が `tbl-state-machines.md`・`tbl-row-id-prefixes.md`・`src/adapter/screen-renderer/display-words.json`・`icon-roster.json`・`icon-glyphs.json`・`file-flow-values.ts` の生成の区画を書く。

## 2. 新しい識別子

⛔ どれも仮である。当てる時に、その時の木で測り直して番号を取る（規則 02 の 2.5 節）。測った日付と sha を、当てた記録に書く。

| 仮の名 | 何か | 取り方 |
|---|---|---|
| `FR-153` | 新しい要求（GRS リセット） | 要求 ID の最大の次 |
| `T-345` | 新しい表「GRS リセットが消すものと残すもの」 | 表の番号の最大の次 |
| `WP`（候補。`words` は `Wipe`） | 表 T-345 の行 ID の接頭辞。行は `WP-1` 〜 `WP-9` | 登録簿 `row-id-prefixes.json` で、ほかの接頭辞と見間違えないかを見てから（規則 02 の 2.5 節の 1。近いのは `WB`・`WM`・`WR`・`WS`） |
| `IC-139` | 表 T-109 の入口の行 | 表 T-109 の最大の次（`fig-icons.svg` の `aria-label` の範囲も合わせる） |
| `QN-11` | 表 T-234 の問いの行 | 同表の最大の次 |
| `UN-19` | 表 T-027 の行 | 同表の最大の次 |
| `grsResetEntryPressed` | 領域 `fileFlow` の出来事（表 T-290） | 名であり番号ではない。`R4.4` の形（主語 ＋ 過去形） |

コードの名（仮。当てる体が `R2.1` で決め直してよい）: `browser-stored-values.ts` の `clearBrowserStoredForReset`、`single-html-shell.ts` の `reloadAfterReset`、`FileFlowOwedAction` の種類 `resetGrs`。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`0590ad03`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `FR-086` の数「表 T-109 の 113 行」「表 T-234 の 8 行」 | `docs/spec/01-04-requirements.md:5776` | 114 ・ 9（⚠️ 当てる時に数え直す） | E-03 |
| 表 T-109 の前文の「113」の 3 か所 | `docs/spec/_assets/tbl-glossary.md:498`・`:505`・`:509` | 114（同） | E-07 |
| 図 F-019 の `aria-label` の範囲「IC-1 to IC-131」 | `docs/spec/_assets/fig-icons.svg:1` | 新しい最大 | E-09 |
| `FR-100` の、例外を持たない読み | `docs/spec/01-04-requirements.md:6528` | 例外 1 つへの指し | E-04 |
| `questionAsked` の運ぶ値の問いの列挙（`QN-1` 〜 `QN-5`）と `owedAction` の注 | `docs/spec/_source/state-machines.json:4808-4834` | `QN-11` と「GRS リセット」を足す | E-14 |
| コード: `beforeunload` が未保存の編集で常に止めること | `src/framework/single-html-shell/single-html-shell.ts:559` | リセットの読み直しでは止めない | 9 節 |

⭐ **消さないもの**: `IC-17` の行（`CR-606`・`CR-609` の持ち場）、表 T-305、`FR-072`、`K-60`、表 T-037 の `NT-7` の行、`S-99` 〜 `S-99c` の行。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊であり、どれも行の全体である。
⚠️ 行末の 2 つの半角空白（改行の印）も旧と新の一部である。
⚠️ `<新1>` の仮の名は、2 節で取った番号に置き換えてから当てる。
⚠️ 4.1 節に挙げた塊は、`CR-606` の新の文へ載せ直してから当てる。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-041`。旧
```text
⭐ テーマ色を選ぶ入口は、文書の設定の面（`FR-072`、面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の先頭の欄とすること（MUST） —— 色相は日程データの群の値であり（表 T-052 の `DR-5`）、`App Header` に読む人の明暗（`IC-16`）と並ぶ入口を別に立てると、2 つを同じ種類の選びと読ませる。  
```
新（旧の行は変えず、後ろに 1 行足す）
```text
⭐ テーマ色を選ぶ入口は、文書の設定の面（`FR-072`、面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の先頭の欄とすること（MUST） —— 色相は日程データの群の値であり（表 T-052 の `DR-5`）、`App Header` に読む人の明暗（`IC-16`）と並ぶ入口を別に立てると、2 つを同じ種類の選びと読ませる。  
⚠️ 面の頭に置く GRS リセットの入口（`FR-153`）は欄ではない —— テーマ色の欄は、その入口の下で欄の先頭に立つ。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-027。旧
```text
| UN-16 | 対象外 | **見る場所の割り付け** —— 行見出しパネルの幅（`FR-052`）。<br> ⛔ **ピン止めは本行ではない** —— `UN-14` が持つ。<br>⚠️ **保存することと戻せることは別である** —— 行見出しパネルの幅は文書に保存するが、読む人の都合であって、日程の内容ではない |
```
新（`UN-16` の行は変えず、後ろに 1 行足す）
```text
| UN-16 | 対象外 | **見る場所の割り付け** —— 行見出しパネルの幅（`FR-052`）。<br> ⛔ **ピン止めは本行ではない** —— `UN-14` が持つ。<br>⚠️ **保存することと戻せることは別である** —— 行見出しパネルの幅は文書に保存するが、読む人の都合であって、日程の内容ではない |
| UN-19 | 対象外 | **GRS リセット**（`FR-153`） —— ページを読み直すので、取り消しの履歴ごと消える。<br>⭐ 戻せないので、同要求は続ける前に問う（`FR-031` の RATIONALE の「取り消しで取り戻せないものを失う場面」）。<br>⚠️ 本表の後の「対象外の操作で文書が戻ってはならない（MUST NOT）」には当たらない —— あちらが禁じるのは取り消しの履歴で前の編集が戻ることであり、読み直しは 表 T-034 の順で文書を開き直す。<br>⚠️ `UN-10`（画面の言語の切替）が対象外であることと揃う —— リセットが消す値は、どれも文書の値ではない |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-086`。旧
```text
⛔ **入口は仕様のどの表にも無いことを数えて確かめてある**（各表の行を引いて数えた）—— 表 T-109 の 120 行・表 T-036 の 27 行・表 T-234 の 8 行・表 T-103 の 64 行・表 T-016 のいずれにも 0 件。  
```
新（⚠️ 数は当てる時に数え直す —— 本書のほかの変更要求が同じ表に行を足していれば、その数）
```text
⛔ **入口は仕様のどの表にも無いことを数えて確かめてある**（各表の行を引いて数えた）—— 表 T-109 の 121 行・表 T-036 の 27 行・表 T-234 の 9 行・表 T-103 の 64 行・表 T-016 のいずれにも 0 件。  
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
`FR-100`。旧
```text
**未保存の編集が無いときに出させてはならない（MUST NOT）** —— 毎回出る警告は読まれなくなる。  
**警告の文言を `GRS` が決めてはならない（MUST NOT）** —— 近代のブラウザは差し出された文字列を無視し、宿主自身の文を出す。
```
新
```text
**未保存の編集が無いときに出させてはならない（MUST NOT）** —— 毎回出る警告は読まれなくなる。  
**警告の文言を `GRS` が決めてはならない（MUST NOT）** —— 近代のブラウザは差し出された文字列を無視し、宿主自身の文を出す。  
⚠️ 例外は `FR-153`（GRS リセット）の読み直しだけである —— 同要求の問いに続けると答えたあとの読み直しでは、この警告を出させない。  
規則と理由は同要求が持つ。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
新しい要求。`FR-100` の後、次の要求の見出しの前に置く。旧
```text
#### 開いているファイルと、最後に書いた時刻を示す
```
新
```text
#### GRS がブラウザに持つ値を消して、ページを読み直す

**Type**: FUNC_REQ
**UID**: FR-153

**STATEMENT**: 利用者が GRS リセットの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-139`）を押したとき、`GRS` は、続けてよいかを問い、続けると答えられたら、表 T-345 が「消す」とする値を消してから、ページを読み直すこと。  
その入口は、文書の設定の面（`FR-072`、面を出す入口は同表の `IC-17`）の頭、テーマ色の欄（`FR-041`）の上に置くこと（MUST）。  
⚠️ この入口は面の欄ではない —— 値を持たないので、`FR-072` の「その欄は読むだけ」にも、`FR-041` の「先頭の欄」にも数えない。  
入口の行は、面のほかの行と同じく左に名、右に入口を置き、名は `FR-038` の辞書が同行に持つ語（`label`）とすること（MUST） —— めったに押さない入口は、図形だけでは職務が読めない。  
⚠️ 図形は右の入口が持つ（`FR-029`）。  
⚠️ この入口を薄く描かない（`FR-029`） —— 読み直すと画面の値（表 T-345 の `WP-9`）が起動の値へ戻るので、押して何も変わらない時は無い。  
問い方は 表 T-037 の `NT-7` に従い、示す文は 表 T-234 の `QN-11` とすること（MUST）。  
⭐ 未保存の編集が無くても問うこと（MUST） —— 消える値は、どれも取り消しで戻せない（表 T-027 の `UN-19`）。  
⭐ その文の語に含まれる改行は、`Confirmation`（`_assets/tbl-glossary.md` の `U-55`）の中で、そこで行を改めて示すこと（MUST） —— 直らないときの手順を、問いの後に 1 行ずつ示すためである。  
続けると答えられたときに消すのは、`localStorage` の `GRS` の鍵のうち、表 T-345 が「消す」とするものだけとすること（MUST）。  
⛔ `localStorage` をまるごと消してはならない（MUST NOT） —— 理由は同表の `WP-6` が持つ。  
⭐ 消してから読み直すこと（MUST） —— 読み直してから消すと、読み直した `GRS` が消す前の値で起動する。  
⛔ この読み直しで、`FR-100` の宿主の警告を出させてはならない（MUST NOT） —— 未保存の編集を捨てることは、本要求の問いが文書の名前を挙げて既に問うている。  
⚠️ 出させると、宿主の警告で留まった人の画面では、鍵だけが消え、ページは消す前の値のまま動き続ける。  
⛔ `Agent API` にこの操作を与えてはならない（MUST NOT） —— 読み直すと呼び手との繋がりごと消え、`FR-028` の「受理したか否かを値で返す」を果たせない。

**ORIGIN**: `GL-005`（1 つのファイルだけで動く）

**RATIONALE**: `GRS` はサーバーを持たず、ブラウザに値を残して次の起動の動きを変える（`_assets/tbl-settings.md` の 表 T-206 の別枠）。  
その値のせいで動きがおかしくなったとき、戻す手立てがブラウザの開発者ツールしか無いと、その手立てを知らない人は戻せない。  
⭐ 画面の中に戻す入口を置き、それでも直らないときの手順を問いの文が添える —— 入口で直らなくても、次に何をすればよいかが読める。  
⚠️ 代償: `file://` で開いたページが出どころを共有する閲覧環境では、同じ端末で開くほかの `GRS` の `.html` も同じ鍵を読むので、リセットはそれらの次の起動も戻す。  
値はもともと出どころごとに 1 つであり（同表の `S-99b` の注）、本要求が新たに作る代償ではない。

**表 T-345 — GRS リセットが消すものと残すもの**

| 行 ID | 何か | リセットで | 理由 |
| --- | --- | --- | --- |
| WP-1 | 画面の言語（`_assets/tbl-settings.md` の 表 T-206 の `S-99`） | 消す | 次の起動は宿主の言語から決まる（`FR-038`）。<br>言語を選び直せば戻る |
| WP-2 | 透かしに出す開いた者の名前（同表の `S-99a`） | 消す | 次の起動は同行の既定値から始まる（`FR-086`）。<br>⚠️ いまは名前を入力させる道が無い（同要求） —— 既定値のほかの値は、画面の外から置かれたものである |
| WP-3 | `Agent API` を有効にした記録（同表の `S-99b`） | 消す | 次の起動は無効から始まる（`FR-065`）。<br>有効にし直せば戻る |
| WP-4 | 透かし解除パスワードの SHA-256（同表の `S-99c`） | 残す | 作成者が決める値であり（`FR-086`）、画面の動きを左右しない。<br>⛔ 消すと既定のパスワード（同書の 表 T-207）へ黙って戻り、透かしを消せる人が増える |
| WP-5 | 本表に行の無い `GRS` の鍵（前の版が置き、いまの版が読まないもの） | 消す | 読まない値も、動きがおかしい元でありうる。<br>`GRS` の鍵は、`GRS` が自分の鍵に付ける共通の接頭辞で見分ける（`05-07-design.md` の 表 T-075 の `UF-159`） |
| WP-6 | `GRS` の鍵ではない `localStorage` の鍵 | 触れない | `file://` で開いたページは、閲覧環境によっては出どころ（オリジン）を同じ端末のほかのローカルの `.html` と共有する（`CN-2` が基準とする Chromium 系がそうである）。<br>⛔ まるごと消すと、ほかのページの値まで消える |
| WP-7 | クッキー・`sessionStorage`・`IndexedDB`・Cache Storage | 触れない | `GRS` はここに何も置かない —— ブラウザに置く値は 表 T-206 の別枠の行だけであり、置き場は `localStorage` である（同表の表題） |
| WP-8 | 開いている文書の、保存していない編集と取り消しの履歴 | 失う | 読み直すと、文書は 表 T-034 の順で開き直す（表 T-027 の `UN-19`）。<br>⭐ 失う前に、表 T-234 の `QN-11` が文書の名前を挙げて問う |
| WP-9 | 画面の値（表 T-206 の本体の行 —— パネルの幅・開いている面・パレットの表示ほか） | 起動の値に戻る | 画面の値は保存しないので、読み直すと既定から始まる（同表） |

**Relations**:

- **Type**: `Parent`
  **ID**: `GL-005`
  **Role**: `Satisfies`

#### 開いているファイルと、最後に書いた時刻を示す
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
表 T-234。旧
```text
| QN-8 | この問いにまだ行が無い | 挙げない | 本表 |
```
新（落ち先の `QN-8` の前に 1 行）
```text
| QN-11 | GRS をリセットする前（`FR-153`） | 挙げる —— 保存していない編集があるときだけ、捨てる文書の名前（`QN-5` と同じ）。<br>⚠️ ブラウザから消える値の名前は挙げない —— 文書の値ではなく、どれが消えるかは `FR-153` の 表 T-345 が持ち、問いの文が一括して言う | `FR-153` |
| QN-8 | この問いにまだ行が無い | 挙げない | 本表 |
```

<!-- EDIT id=E-07 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の前文。旧
```text
**120 行ある。**  
⛔ 本表の `群` の欄は、入口を並べる順を決めるためだけに在る。  
画面に刷ってはならない（MUST NOT） —— 規則と理由は `FR-053` が持つ。  
⭐ **図形は 図 F-019 が正であり、本表は図形を語で説明しない**（1.9）—— 語で書き取らない理由は `FR-029` が持つ。  
**繋ぎ目は行 ID `IC-nn` だけである** —— 図では各図形の下に刷り、本表では第 1 列に立つ。  
**`面` の欄は 表 T-103 の確定名である。**  
 新しい面の名を作らない。
⚠️ **本表は英名の欄を持たない** —— 持つと 120 個の確定名を新たに作ることになる。  
**表 T-012 の `SH-5` が既に書いている表記だけを使う。**  
⭐ `milestoneGlyph` の綴りは `_source/erd.json` が持つ—— 本表に写さない。  
⚠️ **`図形` の欄を持たないのも同じ理由である。**  
⭐ **図形を持たない行は無い** —— 全 120 行が 図 F-019 に図形を持つ。  
```
新（⚠️ 数は当てる時に数え直す）
```text
**121 行ある。**  
⛔ 本表の `群` の欄は、入口を並べる順を決めるためだけに在る。  
画面に刷ってはならない（MUST NOT） —— 規則と理由は `FR-053` が持つ。  
⭐ **図形は 図 F-019 が正であり、本表は図形を語で説明しない**（1.9）—— 語で書き取らない理由は `FR-029` が持つ。  
**繋ぎ目は行 ID `IC-nn` だけである** —— 図では各図形の下に刷り、本表では第 1 列に立つ。  
**`面` の欄は 表 T-103 の確定名である。**  
 新しい面の名を作らない。
⚠️ **本表は英名の欄を持たない** —— 持つと 121 個の確定名を新たに作ることになる。  
**表 T-012 の `SH-5` が既に書いている表記だけを使う。**  
⭐ `milestoneGlyph` の綴りは `_source/erd.json` が持つ—— 本表に写さない。  
⚠️ **`図形` の欄を持たないのも同じ理由である。**  
⭐ **図形を持たない行は無い** —— 全 121 行が 図 F-019 に図形を持つ。  
```

<!-- EDIT id=E-08 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の末に 1 行。旧
```text
| IC-97 | `Difference Review` | — | 取込をやめ、取込前の状態へ戻す（表 T-032a の `MM-4`）| `FR-022` | — | — |
```
新
```text
| IC-97 | `Difference Review` | — | 取込をやめ、取込前の状態へ戻す（表 T-032a の `MM-4`）| `FR-022` | — | — |
| IC-139 | `Properties Panel` | — | `GRS` がこのブラウザに持つ値を消し、ページを読み直す（GRS リセット）。<br>⭐ 置き場は文書の設定の面（`IC-17`）の頭、テーマ色の欄の上 —— 規則は `FR-153` が持つ。<br>消すものと残すものは同要求の 表 T-345 が持ち、問い方は 表 T-037 の `NT-7` が持つ（示す文は 表 T-234 の `QN-11`） | `FR-153` | — | — |
```

<!-- EDIT id=E-09 file=docs/spec/_assets/fig-icons.svg -->
図 F-019 の `aria-label`。旧
```text
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 452 504" width="452" height="504" role="img" aria-label="GRS icon glyphs IC-1 to IC-138 (IC-19, IC-46 and IC-49 retired; IC-108 to IC-114 and IC-116 unused)">
```
新（⚠️ `IC-139` が 131 より大きいときの形。未使用の番号を取ったときは、範囲を変えずに未使用の列挙からその番号を外す）
```text
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 452 504" width="452" height="504" role="img" aria-label="GRS icon glyphs IC-1 to IC-139 (IC-19, IC-46 and IC-49 retired; IC-108 to IC-114 and IC-116 unused)">
```

<!-- EDIT id=E-10 file=docs/spec/_assets/fig-icons.svg -->
図 F-019 の末に図形 1 つ（右回りの円い矢印。第 13 段の 5 番目 —— `IC-138` の図形の右隣。⚠️ 当てる時に `CR-605` の後の木へ載せ直した）。旧
```text
  <text class="lbl" x="136" y="486">IC-138</text>
</svg>
```
新
```text
  <text class="lbl" x="136" y="486">IC-138</text>
  <g transform="translate(160 452)">
    <path class="s" d="M19 12 A7 7 0 1 1 16.95 7.05"/>
    <path class="s" d="M12.95 7.05 H16.95 V3.05"/>
  </g>
  <text class="lbl" x="172" y="486">IC-139</text>
</svg>
```

⭐ 図形は起草である —— 半径 7 の円を右回りに 315° 描き、右上の切れ目に右下向きの矢じりを置く（線は図の 1 つの太さ `.s`。`FR-029`）。実物と見比べて選び直す（表 T-026 の `RC-13`）。似た図形は無い: `IC-5`・`IC-6` は鉤の矢印、`IC-99` は横線 3 本。

<!-- EDIT id=E-11 file=docs/spec/_source/display-words.json -->
辞書 `icons` の末（表 T-109 の並びの末 `IC-97` の次）に 1 項。旧
```text
    "en": "Stop the import and put the document back exactly as it was"
   }
  }
 ],
 "properties": [
```
新
```text
    "en": "Stop the import and put the document back exactly as it was"
   }
  },
  {
   "rowId": "IC-139",
   "label": {
    "ja": "GRS リセット",
    "en": "GRS Reset"
   },
   "hint": {
    "ja": "GRS がこのブラウザに覚えた値を消して、ページを読み直す。先に確かめる",
    "en": "Clear what GRS keeps in this browser and reload the page; asks first"
   }
  }
 ],
 "properties": [
```

<!-- EDIT id=E-12 file=docs/spec/_source/display-words.json -->
辞書 `questions`（表 T-234 の並びのとおり、落ち先 `QN-8` の前）に 1 項。旧
```text
  {
   "rowId": "QN-8",
```
新
```text
  {
   "rowId": "QN-11",
   "text": {
    "ja": "GRS をリセットしますか？ GRS がこのブラウザに覚えた値（画面の言語など）を消して、ページを読み直します。保存していない編集があれば、それも失われます\n※ リセットしても不具合が直らない場合、以下をお試しください。\nCtrl + F5 : 再読み込み\nF12（開発者ツール）→ Application（Firefox では「ストレージ」）→ GRS のローカルストレージをクリア",
    "en": "Reset GRS? What GRS keeps in this browser (such as the screen language) is cleared and the page is reloaded. Unsaved edits, if any, are lost too\n* If resetting does not fix the problem, try the following.\nCtrl + F5 : reload\nF12 (developer tools) → Application (Storage in Firefox) → clear GRS's local storage"
   }
  },
  {
   "rowId": "QN-8",
```

⭐ **辞書と表の組み方**（`FR-038`）: `tools/generate_display_words.py` の `roster()` は、節 `icons` の鍵を 表 T-109 の行の並びから、節 `questions` の鍵を 表 T-234 の行の並びから毎回読み、`problems()` が原稿の鍵の並びと 1 つでも違えば書かずに止まる。⇒ 2 つの項は、表の行と同じ位置（`icons` は末、`questions` は `QN-8` の前）に置く。語の形は `icons` が `label` ／ `hint`、`questions` が `text`（`SHAPE`）。⚠️ 検査 37（`check-dictionary-table-covariance.py`）の対の指紋 `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` に 2 行（`T-109 IC-139`・`T-234 QN-11`）が増える —— 対を読んだうえで調整役が登録する（`JDG-520`）。

<!-- EDIT id=E-13 file=docs/spec/_source/state-machines.json -->
領域 `fileFlow` の出来事（`newDocumentEntryPressed` の次）。旧
```text
       "note": {
        "ja": "いまの文書を捨てる問い。呼び手が詰める"
       }
      }
     ]
    },
    {
     "key": "flowSurfaceClosed",
```
新
```text
       "note": {
        "ja": "いまの文書を捨てる問い。呼び手が詰める"
       }
      }
     ]
    },
    {
     "key": "grsResetEntryPressed",
     "source": {
      "kind": "input",
      "rows": [
       "IC-139",
       "FR-153"
      ],
      "note": {
       "ja": "GRS リセットの入口"
      }
     },
     "carries": [
      {
       "name": "question",
       "rows": [
        "QN-11"
       ],
       "note": {
        "ja": "GRS をリセットする問い。挙げる名前は、未保存の編集があるときだけ、いまの文書。呼び手が詰める"
       }
      }
     ]
    },
    {
     "key": "flowSurfaceClosed",
```

<!-- EDIT id=E-14 file=docs/spec/_source/state-machines.json -->
`confirmationStateMachine` の `questionAsked` の運ぶ値と根拠。旧
```text
       "carries": [
        {
         "name": "question",
         "rows": [
          "QN-1",
          "QN-2",
          "QN-3",
          "QN-4",
          "QN-5"
         ]
        },
        {
         "name": "owedAction",
         "note": {
          "ja": "「続ける」で行う書き込みの束か、新しく始めること。ファイル操作の問いでは無い"
         }
        }
       ],
       "evidence": [
        "NT-7",
        "U-55",
        "QN-1",
        "QN-2",
        "QN-3",
        "QN-4",
        "QN-5"
       ]
```
新
```text
       "carries": [
        {
         "name": "question",
         "rows": [
          "QN-1",
          "QN-2",
          "QN-3",
          "QN-4",
          "QN-5",
          "QN-11"
         ]
        },
        {
         "name": "owedAction",
         "note": {
          "ja": "「続ける」で行う書き込みの束か、新しく始めることか、GRS リセット（`FR-153`）。ファイル操作の問いでは無い"
         }
        }
       ],
       "evidence": [
        "NT-7",
        "U-55",
        "QN-1",
        "QN-2",
        "QN-3",
        "QN-4",
        "QN-5",
        "QN-11"
       ]
```

<!-- EDIT id=E-15 file=docs/spec/_source/state-machines.json -->
`confirmationStateMachine` の遷移（`newDocumentEntryPressed` の次）。旧
```text
       "questionAsked": {
        "to": "questionAsked",
        "effect": "raiseNotice",
        "effectArgument": "RS-27",
        "evidence": [
         "RS-27"
        ]
       }
      },
      "openChoiceAnswered": {
```
新
```text
       "questionAsked": {
        "to": "questionAsked",
        "effect": "raiseNotice",
        "effectArgument": "RS-27",
        "evidence": [
         "RS-27"
        ]
       }
      },
      "grsResetEntryPressed": {
       "notAsked": {
        "to": "questionAsked",
        "evidence": [
         "FR-153",
         "QN-11"
        ]
       },
       "questionAsked": {
        "to": "questionAsked",
        "effect": "raiseNotice",
        "effectArgument": "RS-27",
        "evidence": [
         "RS-27"
        ]
       }
      },
      "openChoiceAnswered": {
```

⭐ `confirmationAnswered` の升は変えない —— `[isProceeding & not isFileOperationQuestion] / carryOutOwedAction` が、`owedAction` の「GRS リセット」をそのまま運ぶ（消して読み直すのは、その実行の側。9 節）。⭐ 生成の後の 表 T-290 の `confirmationStateMachine` の表（見込み）: 行 `| `fileFlow/grsResetEntryPressed` | → `questionAsked` | → 自己 / `raiseNotice`（`RS-27`） |` が `newDocumentEntryPressed` の行の後に 1 行増える。

<!-- EDIT id=E-16 file=docs/spec/05-07-design.md -->
`UF-159` の職務。旧
```text
| UF-159 | `SingleHtmlShell` | `browser-stored-values.ts` | `non-pure` | ブラウザに残す値（表 T-206 の `S-99`〜`S-99c`）を読み書きする —— 起動時の画面の言語と `Agent API` の記憶を読む（`FR-038`・`FR-065`）。<br>鍵に共通の接頭辞を付け、読めない値は無いものとし、書けないときは何もしない | — |
```
新
```text
| UF-159 | `SingleHtmlShell` | `browser-stored-values.ts` | `non-pure` | ブラウザに残す値（表 T-206 の `S-99`〜`S-99c`）を読み書きし、GRS リセット（`01-04-requirements.md` の `FR-153`）では同書の 表 T-345 が「消す」とする鍵を消す —— 起動時の画面の言語と `Agent API` の記憶を読む（`FR-038`・`FR-065`）。<br>鍵に共通の接頭辞を付け、読めない値は無いものとし、書けないときは何もしない。<br>⭐ 消すときも、共通の接頭辞で `GRS` の鍵を見分け、ほかの鍵に触れない（同表の `WP-6`） | — |
```

<!-- EDIT id=E-17 file=docs/spec/_source/row-id-prefixes.json -->
接頭辞の登録（並びは綴りの順 —— `WM` の次、`WR` の前）。旧
```text
   "prefix": "WM",
   "words": "Watermark",
   "owner": "spec",
   "means": {
    "ja": "透かしの規則の条"
   }
  },
```
新
```text
   "prefix": "WM",
   "words": "Watermark",
   "owner": "spec",
   "means": {
    "ja": "透かしの規則の条"
   }
  },
  {
   "prefix": "WP",
   "words": "Wipe",
   "owner": "spec",
   "means": {
    "ja": "GRS リセットが消すか残すかを決める 1 つのもの（表 T-345）"
   }
  },
```

### 4.1 重なり（`CR-606`・`CR-609` も書き換えうる塊）

⛔ 本書は `CR-606` の後、`CR-609` の前に当てる。**下の塊は、当てる時に `CR-606` の新の文へ載せ直す（rebase）。** 本書の差分は右の列だけであり、載せ直すときはそれだけを当てる。`CR-609` は本書の後なので、`CR-609` の側が本書の新の文へ載せ直す。

| 本書の編集 | 同じ所を書き換えうる変更要求 | 本書の差分（載せ直すときはこれだけ） |
|---|---|---|
| E-01（`FR-041` の `:2089` の行） | `CR-606`（語「テーマの色相」→「テーマ色」。同じ行を書き換える見込み） | `CR-606` が書いた行の**後ろに 1 行足す**だけ。本書は `:2089` の行の中身を変えない |
| E-05（新しい要求の文と 表 T-345）・E-08（`IC-139` の行）・E-12（問いの語） | `CR-606`（語の持ち主） | 本書の新しい文は、`CR-606` の後の語「テーマ色」で書いた。`CR-606` が別の語に決めたら、本書の「テーマ色の欄」をその語に合わせる |
| E-11・E-12（`display-words.json`） | `CR-606`（`IC-17` の hint、`K-60`、`themeHues`）・`CR-609`（`IC-17` の hint） | 塊は重ならない（本書は `icons` の末と `questions` の `QN-8` の前）。同じファイルなので、旧を数え直してから当てる |
| E-13 〜 E-15（`state-machines.json`） | `CR-609`（`propertiesPanelContentStateMachine`、表 T-280） | 塊は重ならない（本書は領域 `fileFlow`、表 T-290）。同じファイルなので、旧を数え直してから当てる |
| 検査 37 の指紋 `dictionary-table-pairing.txt` | `CR-606`・`CR-609`（`T-109 IC-17` の 1 行） | 本書は 2 行を**足す**だけ（`T-109 IC-139`・`T-234 QN-11`）。`IC-17` の行には触れない |

⭐ 当てた時（2026-10-01、`8b5480ed`）: `CR-606` は波 1 だけが着地していた。本書の塊のうち `CR-606` の新の文に載ったのは E-01 だけ（語「テーマ色」は波 1 で着地済み）。`CR-606` が波 2・3 に残した編集（`display-words.json` の `IC-17` の hint ほか）は本書の塊と重ならず、E-11・E-12 は今の木の文にそのまま当たった。
| 閉路 `FR-041` ・ `FR-072` ・ `IC-17`（6 節） | `CR-606`（`FR-041`・`IC-17`）・`CR-609`（`FR-072`・`IC-17`） | 本書が触れるのは `FR-041` だけ（E-01、1 行を足す）。3 本の順（`CR-606` → 本書 → `CR-609`）が、閉路を 1 つの計画で書く順である（規則 02 の 1 節の 3） |

⚠️ 本書は `IC-17` の行・表 T-305・`K-60`・`FR-072` を書き換えない（決定 2）。`CR-606` が 表 T-305 に触れても、本書とは重ならない。

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The rule is FR-153 as CR-607 E-05 writes it, with table T-345
  (rows WP-1..WP-9). The entry is table T-109 row IC-139, surface
  Properties Panel, drawn as the FIRST row of the document-settings face
  (the face IC-17 shows), above the theme colour field. The row shows the
  dictionary label of IC-139 on the left and the glyph entry on the
  right. It is not a field: it holds no value. It is never drawn faded.
- Pressing it sends fileFlow/grsResetEntryPressed carrying question
  QN-11. Its items name the open document ONLY when it has unsaved
  edits (the same item discardQuestionOf builds for QN-5); otherwise items
  is empty. The question is asked even with no unsaved edits. While a
  question already stands, the press raises RS-27 (same as IC-98).
- Answer No / n / Esc: nothing changes.
- Answer Yes / y: owedAction kind resetGrs is carried out:
  1. remove every localStorage key that starts with the GRS key prefix
     (WEB_STORAGE_KEY_PREFIX in browser-stored-values.ts) EXCEPT the key
     of S-99c. Never call localStorage.clear(). Touch no cookie,
     sessionStorage, IndexedDB or Cache. A storage that throws is skipped
     silently (the reload still happens).
  2. then reload the page, with the beforeunload guard (FR-100) disarmed
     for this reload only -- the host's "leave site?" prompt must not
     appear.
- Line breaks ("\n") in a question's dictionary text are shown as line
  breaks inside the Confirmation (only QN-11 has them today).
- The Agent API gets no reset function.
- No undo step, no palette entry, no key binding.
```

## 6. グラフ（`0590ad03`）

`impact.py FR-072 FR-041 IC-17 NT-7 T-305 S-99 S-99a S-99b S-99c FR-020 FR-086`（13 節）:

| 対象 | 指している要求 ／ 参照 | 本書で変えるか | 偽になる所 |
|---|---|---|---|
| `FR-072` | 6 件 ／ 17 か所 | 変えない | 無い —— 「その欄は読むだけ」「欄を数え上げない」はどちらも欄の話であり、入口は欄ではない（決定 2） |
| `FR-041` | 9 件 ／ 37 か所（2 次は 表 T-305 経由でも 9 件） | 1 文を足す（E-01） | 無い —— 「先頭の欄」は E-01 の後も真（入口は欄に数えない） |
| `IC-17` | 1 件 ／ 3 か所（`FR-041`、表 T-280 の 2 か所） | 変えない | 無い —— 「テーマの色相は、その面の先頭の欄で選ぶ」は真のまま |
| `NT-7` | 9 件 ／ 28 か所 | 変えない（新しい問いが従う） | 無い —— 「問うてよいのは、要求が確認を求めると定めた場面だけ」を新しい要求が満たす |
| 表 T-305 | 1 件（`FR-041`） | 変えない | 無い |
| `S-99` ・ `S-99a` ・ `S-99b` ・ `S-99c` | 1/7 ・ 2/5 ・ 0/4 ・ 1/4 | 変えない（表 T-345 が指す） | 無い —— 保存しない理由・置き場は変わらない |
| `FR-020` | 6 件 ／ 30 か所 | 変えない | 無い |
| `FR-086` | 1 件 ／ 4 か所 | 数 2 つ（E-03） | 数を直さなければ偽になる（E-03 が直す） |

`induced.py` の同じ 11 の種: 種の中の辺 14、閉路 3 —— `FR-041` ・ `FR-072` ・ `IC-17`（大きさ 3）、`FR-020` ・ `S-99a`、`FR-086` ・ `S-99c`（どちらも値の行とその規則の要求の作法の閉路。規則 02 の 1 節）。本書が触れるのは、大きさ 3 の閉路の `FR-041` だけ（1 行を足す）と、`FR-086` の数だけ（`S-99c` は変えない）。⇒ 閉路の中で 2 つ以上を同時に書き換える所は、本書の中には無い（4.1 節の最後の行は変更要求をまたぐ）。

導いた条項で打った `impact.py FR-100 UF-159 T-027 T-234 T-109 FR-031`:
- `FR-100` を指す要求 5 件（`FR-009`・`FR-130`・`FR-016`・`FR-151`・`FR-018`）と `LM-11` は「未保存の編集」を引くだけで、例外 1 つを足しても偽にならない。
- 表 T-027（18 行、指す要求 8 件）・表 T-234（8 行、指す要求 5 件）・表 T-109（113 行、指す要求 35 件）は行が 1 つ増える。件数を書くのは `FR-086` と 表 T-109 の前文だけ（`grep` で「T-234 の [0-9]+ 行」「T-027 の [0-9]+ 行」「T-109 の [0-9]+ 行」を引いた。13 節）。
- `UF-159` を指す所は 0。

**裁定との照合**（`rulings.md` を行 ID と語で引いた。13 節）: `FR-100`（`JDG-598` —— 未保存の編集に数える値の話。当たらない）、`FR-072`・`IC-17`（`JDG-173`・`JDG-451`・`JDG-855` —— 色相の欄を面の先頭の欄とする `JDG-451` は決定 2 で真のまま。`JDG-855` は `CR-609` の持ち場）、`FR-041`・表 T-305（`JDG-450`〜`JDG-453` ほか —— 変えない）、`S-99b`（`JDG-896` —— 決定 11）、`S-99c`（`JDG-312`・`JDG-922` —— 残す）、`NT-7`・表 T-234（`JDG-158`・`JDG-380` —— 見出し部に問いと答え、一覧を持つ確認の形。新しい問いもその形で出る）、`FR-029`（`JDG-76` ほか —— 新しい図形は `RC-13` で選び直す）、`localStorage`（`JDG-624` —— 明暗は覚えない。本書は明暗の値に触れない）。⇒ ぶつかる裁定は無い。

## 7. 数の予測

| 数 | 差 | 内訳 |
|---|---|---|
| tables | +1 | 表 T-345 |
| rows | +12 | 表 T-345 の 9 ・ 表 T-109 の 1 ・ 表 T-234 の 1 ・ 表 T-027 の 1 |
| uids | +1 | `FR-153` |
| figures | 0 | 図 F-019 に図形が 1 つ増えるが、図は増えない |
| 辞書の項 | +2 | `icons` 1 ・ `questions` 1 |
| 状態機械 | 出来事 +1、状態 0、升 +2 | 表 T-290 の `fileFlow/grsResetEntryPressed` |
| 接頭辞 | +1 | `WP`（仮） |
| 設定値の行 ・ 生成器の群 | 0 | 設定値の行を足さない（規則 02 の 3.5 節の後段に当たらない） |
| 検査 37 の指紋 | +2 行 | `T-109 IC-139` ・ `T-234 QN-11` |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場（ファイル） | 中身 | L4 | 毎フレーム | 体 |
|---|---|---|---|---|---|
| 0 | ― | 2 節の番号を取る。4 節の旧を `CR-606` を当てた木で数え直す（13 節の道具）。L4 の合流を確かめる | ― | ― | 調整役 |
| 1 | `src/framework/single-html-shell/browser-stored-values.ts` ・ `src/framework/single-html-shell/single-html-shell.ts` と、その単体の試験（新しいファイルだけ） | 5 節の手順 1・2 の 2 つの関数（まだどこからも呼ばない）。`beforeunload` の見張りを、リセットの読み直しのときだけ外せる形にする | 待たない（どちらも L4 の持ち場に無い） | いいえ（押したときだけ） | 実装の体（Sonnet） |
| 2 | 仕様（4 節のすべて）＋ `npm run gen` ＋ `src/use-case/advance-screen-session/file-flow-values.ts` ＋ `src/framework/single-html-shell/frame-loop.ts` ＋ `src/adapter/input-command-translator/input-command-translator.ts` | ⛔ 規則 02 の 3.5 節: `npm run gen` が `file-flow-values.ts` の生成の区画に出来事の型を刷ると、`HANDLERS` の写像が新しい出来事の受け手を求めて `tsc` が落ちる ⇒ 仕様と受け手を 1 つの波にする。受け手 `onGrsResetEntryPressed`、`FileFlowQuestion` の問いに `QN-11`、`FileFlowOwedAction` に `resetGrs`、`frame-loop.ts` の `carryOutOwedAction` の腕（波 1 の 2 つの関数を呼ぶ）と `answerSettledEntry` の入口の腕（`discardQuestionOf` と同じ形の問いを作る）、翻訳係の `ENTRY` に `IC-139`。⚠️ `icon-roster.json` を読む側が知らない面の行で投げるかを、1 行足して `gen` し試験を 1 ファイル走らせて測ること | **L4 の合流を待つ**（`frame-loop.ts`・`input-command-translator.ts` は L4 の持ち場） | いいえ | 判断を任せられる体（Opus） |
| 3 | `src/adapter/screen-renderer/properties-panel.ts` ・ `src/framework/dom-screen-surface/properties-panel-drawing.ts` ・ `src/framework/dom-screen-surface/notices-drawing.ts` | 設定の面の頭の入口の行（左に名、右に図形の入口）。問いの文の改行を行として描く | **L4 の合流を待つ**（プロパティパネルは `CR-563` の L4 の持ち場でありうる） | **はい**（面と問いの描画。行 1 つと文の分け方だけ） | 実装の体（Sonnet） |
| 4 | `tests/contract/cr-607-*.test.ts`（新しいファイルだけ） | 仕様だけを読む試験の体: 入口の行が面の最初でテーマ色の欄の上／名が辞書の語／問いが未保存の編集の無いときも立ち、有るときだけ文書の名を挙げる／No・`n`・`Esc` で何も変わらない／Yes で `GRS` の鍵が `S-99c` を除いて消え、ほかの鍵と `S-99c` が残り、`clear()` を呼ばない／読み直しで宿主の警告が出ない／`Agent API` にリセットが無い／問いの文の改行が行になる／取り消しの段を積まない | ― | ― | 仕様だけの試験の体 |
| 後 | `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` ・ 変更履歴 | 指紋 2 行の登録（`JDG-520`）。変更履歴に 1 行 | ― | ― | 調整役 |

⚠️ `properties-panel.ts` は手書きが 993 行である（生成の区画は `:994`〜`:1019`）。行を足して `JDG-695` の 1,000 行を超えるなら、入口の行を作る関数は兄弟のファイルへ出す。

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数・定数（`git grep` で引いた） | 何を | 毎フレーム |
|---|---|---|---|
| `src/framework/single-html-shell/browser-stored-values.ts` | 新しい `clearBrowserStoredForReset`（`WEB_STORAGE_KEY_PREFIX`・`BROWSER_STORED_KEY['S-99c']` を読む） | 接頭辞で始まる鍵を `S-99c` の鍵のほかすべて消す。`try` の中で行い、投げる宿主では何もしない | いいえ |
| `src/framework/single-html-shell/single-html-shell.ts` | `beforeunload` の見張り（`:559`）と新しい `reloadAfterReset` | リセットの読み直しのときだけ見張りを外して `location.reload()` | いいえ |
| `src/use-case/advance-screen-session/file-flow-values.ts` | `FileFlowQuestion`（`:36-40`）・`FileFlowOwedAction`（`:47-53`）・`HANDLERS`（`:466`〜）と新しい `onGrsResetEntryPressed`（`onNewDocumentEntryPressed` `:447` と同じ形） | 出来事を受けて問いを立てる。問いが立っていれば `RS-27` | いいえ |
| `src/framework/single-html-shell/frame-loop.ts` | `carryOutOwedAction`（`:2364`）・`answerSettledEntry`（`:2377`、`NEW_DOCUMENT_ENTRY` の腕 `:2421` の隣）・`discardQuestionOf`（`:1448`） | `resetGrs` の腕（消して読み直す）。入口の腕（未保存の編集があるときだけ文書の名を挙げる問い） | いいえ |
| `src/adapter/input-command-translator/input-command-translator.ts` | `ENTRY`（`documentSettingsProperties: 'IC-17'` の `:705` の並び） | `IC-139` を足す | いいえ |
| `src/adapter/screen-renderer/properties-panel.ts` | `settingsFields`（`:823`〜`:835`） | 入口の行を `themeHueField` の前に置く | はい |
| `src/framework/dom-screen-surface/properties-panel-drawing.ts` | 面の行の描き方 | 名と図形の入口の行を描く | はい |
| `src/framework/dom-screen-surface/notices-drawing.ts` | `confirmationElement`（`:103`〜。`text.textContent = confirmation.text`） | 改行を行として描く | はい（問いが立っているあいだ） |

## 10. ⛔ この変更でやらないこと

- `S-99c` を消さない（`JDG-922`）。クッキー・`sessionStorage`・`IndexedDB`・Cache に触れない（何も無い）。
- `Command Palette` の入口・キーの割当・`Agent API` の関数を足さない（決定 8、`R2.9`）。
- `IC-17` の行・表 T-305・`K-60`・`FR-072` を書き換えない（`CR-606`・`CR-609` の持ち場。決定 2）。
- 表 T-037 の `NT-7` の行を書き換えない —— 新しい問いは今の作法に従う。
- 明暗テーマ（`S-72`）に触れない —— もともと覚えない（`JDG-624`）。
- 状態機械の既存の問いの列挙の穴（下の 12 節の候補）を本書で直さない —— 1 つの変更要求は 1 つの規則の族。

## 11. 利用者に問うこと

無い。置き場・語・問いの文・`S-99c` を残すことは `JDG-851` と `JDG-922` が決めた。ほかは ③ の表に理由と代償を書いて決めた。図形は起草であり、実物と見比べて選び直す義務は 表 T-026 の `RC-13` が持つ。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1321` | 設定パネルに「GRS リセット」の入口が無い | 本書で閉じる（仕様とコード） |
| （候補）新しい行 | 表 T-290 の `confirmationStateMachine.questionAsked` の運ぶ値 `question` と、出来事 `fileFlow/changeQuestionRaised` の運ぶ値が `QN-10` を挙げない（`docs/spec/_assets/tbl-state-machines.md:725`・`:847`）。コードは `QN-10` をその出来事で立てる（`src/use-case/advance-screen-session/file-flow-values.ts:38`、`src/adapter/input-command-translator/row-tree-entrances.ts:138`） | 調整役が台帳へ起こすかを決める（本書は直さない） |

## 13. 測り方の再現

```
# the tree: b2-panel-crs 0590ad03 (every file below is LF only: 0 CRLF)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-072 FR-041 IC-17 NT-7 T-305 S-99 S-99a S-99b S-99c FR-020 FR-086
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-072 FR-041 IC-17 NT-7 T-305 S-99 S-99a S-99b S-99c FR-020 FR-086
#   -> 11 of 11 seeds, 14 edges, 3 cycles (FR-041 FR-072 IC-17 / FR-020 S-99a / FR-086 S-99c)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-100 UF-159 T-027 T-234 T-109 FR-031
grep -rn "T-234 の [0-9]\+ 行\|T-027 の [0-9]\+ 行\|T-109 の [0-9]\+ 行" docs/spec       # 1 hit: 01-04-requirements.md:5776
grep -rn "113" docs/spec/_assets/tbl-glossary.md                                            # :498 :505 :509 (+ K-113, unrelated)
git grep -n "document.cookie\|sessionStorage\|indexedDB\|caches\.\|serviceWorker\|localStorage" -- src
#   -> only browser-stored-values.ts:33 and :42 (localStorage)
grep -n "grsched" -r docs/spec                                                              # 0 hits (JDG-300 Q14: spellings stay out)
# rulings: every JDG row whose text names FR-100 FR-072 FR-041 UF-159 S-99 S-99a S-99b S-99c
#          QN-5 T-234 T-027 NT-7 IC-17 T-305 FR-029 T-109, localStorage, リセット (a python regex walk)
# old blocks: every old block was copied from the tree by line range (a throwaway
#   script in the session scratchpad, not kept in the repo), then counted as a
#   substring of its whole target file (LF, str.count):
#   -> 17 of 17 old blocks occur exactly once (0590ad03)
#   the same script applied all 17 edits to in-memory copies (provisional ids
#   replaced by dummies): display-words.json, state-machines.json and
#   row-id-prefixes.json still parse with json.loads
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py   # check 22: OK
```

| 編集 | ファイル | 旧の行（`0590ad03`） | 旧が現れる数 |
|---|---|---|---|
| E-01 | `docs/spec/01-04-requirements.md` | `:2089` | 1 |
| E-02 | `docs/spec/01-04-requirements.md` | `:2289` | 1 |
| E-03 | `docs/spec/01-04-requirements.md` | `:5776` | 1 |
| E-04 | `docs/spec/01-04-requirements.md` | `:6527-6528` | 1 |
| E-05 | `docs/spec/01-04-requirements.md` | `:6545` | 1 |
| E-06 | `docs/spec/01-04-requirements.md` | `:7423` | 1 |
| E-07 | `docs/spec/_assets/tbl-glossary.md` | `:498-509` | 1 |
| E-08 | `docs/spec/_assets/tbl-glossary.md` | `:639` | 1 |
| E-09 | `docs/spec/_assets/fig-icons.svg` | `:1` | 1 |
| E-10 | `docs/spec/_assets/fig-icons.svg` | `:676-677` | 1 |
| E-11 | `docs/spec/_source/display-words.json` | `:1253-1257` | 1 |
| E-12 | `docs/spec/_source/display-words.json` | `:3194-3195` | 1 |
| E-13 | `docs/spec/_source/state-machines.json` | `:4019-4026` | 1 |
| E-14 | `docs/spec/_source/state-machines.json` | `:4808-4834` | 1 |
| E-15 | `docs/spec/_source/state-machines.json` | `:4880-4889` | 1 |
| E-16 | `docs/spec/05-07-design.md` | `:495` | 1 |
| E-17 | `docs/spec/_source/row-id-prefixes.json` | `:1483-1489` | 1 |
