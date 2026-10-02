# CR-623 — ファイルの 2 つの選択面は選択肢を並べて見せ、絵をクリップボードへ写したら告げる

> 起草の状態: 当てた（2026-10-01、枝 `spec-pass-1001`、仕様の通し）—— E-01〜E-12 を当てた。旧 12 件は `66550d61`（`CR-610`・`CR-612`・`CR-619`・`CR-621`・`CR-622`・`CR-630` の後）でどれも 1 回で、書き直した旧は無い。本番の ID は 表 T-024a の `OP-16` と 表 T-233 の `RS-68`（全ての枝で `OP-16`・`RS-68` は 0 件）。E-03 の ⚠️ の 1 行は、`FR-068` の同じ形の文と検査 11 が重複と読んだので、言い換えて当てた（新の塊も当てた文に直した）。生成器は `tools/generate_display_words.py` に区 `openChooser`（`OPEN_CHOOSER_PARTS`）を足した（足さないと `npm run gen` が止まる）。当てていないもの: 8 節の波 1 のコードの側（`tools/generate_exchange_formats.py` の絵の印、`file-flow-values.ts` の手書きの型と `onDocumentFileRead`、`document-file-flow.ts`、`frame-loop.ts`、試験）・波 2〜波 4 —— 次の巡。⚠️ 波 1 は原稿とコードを 1 つの波で着地させる前提なので、`incomingFile` の生成された型が `src` の `tsc` を 4 件赤くする（次の巡の波 1 が消す）。
> 起草のときの状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。4 節の旧 12 件は、読んだ木でどれも 1 回だった（13 節）。11 節の 2 つの問い（語）は 2026-10-01 に答えを得た —— 問い 1 は推奨の A（`JDG-1094`）、問い 2 は「ファイルに保存 / 単一 HTML / SVG画像」（`JDG-1095`。見出しと `IO-7` は今の語のまま、絵の 2 つだけ空白を除く）。E-09・E-11 をその答えで書き直した（2026-10-01、調整役の依頼）。「PNG画像」の空白を詰める読みは `JDG-1098`（2026-10-01）で確定した。同じ依頼で決定 13（明暗とも既存の色の行だけで描く）と波 4（着地前のスクリーンショット照合）を足した。
> 読んだ木: `refactor` `bfbe7eb7`（枝 `l4-review-crs`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-623` を受けた。仕様の新しい行 ID は 2 つ —— 表 T-024a の `OP-16` と 表 T-233 の `RS-68`。当てる日（2026-10-01、枝 `spec-pass-1001`）に本番の番号 `OP-16`・`RS-68` を振った —— 全ての枝の `docs/spec` と `change-request/` で `OP` の最大は 15、`RS` の最大は 67（`CR-612` の `RS-67` を含む）、`OP-16`・`RS-68` はどの枝にも 0 件だった（2 節）。
> ⛔ 当てる順: **`CR-610` の後**（E-05 が `CR-610` の起こす 表 T-341 の `HS-3` を指す。`CR-610` より先に当てると指す先が無い）。`CR-612`（表 T-233 の `RS-67`）・`CR-605`（`surfaces` に 1 項）とは旧を共有しない —— どちらが先でも、本書の旧は 1 回ずつ現れる（4.1 節）。
> 閉じるもの: `DFC-1324`（`JDG-854`・`JDG-922` の #5）・`DFC-1357`（`JDG-887`）・`DFC-1328`（`JDG-858`）。語の 2 つの問い（11 節）は答えを得た（`JDG-1094`・`JDG-1095`）—— 3 行とも `仕様待ち`（12 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した。`<br>` は原文の改行） | 本書での扱い |
|---|---|---|
| `JDG-854` | 「#5 ファイルを開く時の画面が使いにくい<br>       ファイルの開き方          [x]<br>      -----------------------------<br>        ファイル:   xxxx.json (100kB)<br>        プロジェクト名 :  xxxx<br><br>        [  ] 現在の文書を置き換える<br>        [  ] ...<br>        [  ]<br>        [x ] キャンセル<br><br>のように、アイコンと説明を縦に並べろ」 | 開き方の面の並び —— 表 T-024a の `OP-16`（E-05）と、見出しの語（E-09）・段の名札の語（E-12） |
| `JDG-922` の #5 | 「他は、全部推奨どおり」（推奨の欄: 「#5: [x] と同じ働きのキャンセルを下にも置く（`FR-029` の例外）。プロジェクト名は文書の題」） | 取りやめる段（`OP-16` の ⑤）と `FR-029` の例外（E-01）。「プロジェクト名」の段は文書名（`AT-3`）を出す（`OP-16` の ③） |
| `JDG-971` の ③ | 「それ以外は、全部推奨で」（`CR-610` の問い 3 の推奨 A: 「`48.2[kB]`（1000 で割る、小数 1 桁、図の `[kB]` のまま。開き方の面（`JDG-854` の「(100kB)」）も同じ綴りにする）」） | 開き方の面の大きさは `CR-610` の `HS-3` を指すだけで、綴りを本書に書かない（`OP-16` の ②） |
| `JDG-887` | 「#38 ファイル保存のウインドウがダサい<br>以下のようにしろ<br>     ファイル保存                                          [x]<br>     ---------------------------------------------------------<br>       [GRS JSON .json]  [MSPDI XML .xml] [Single HTML .html]<br>       [SVG画像 .svg]    [PNG画像 .png  ]<br><br>ボタンの大きさは揃えろ」 | 保存の面の 2 段の格子と、ボタンの大きさを揃えること（E-02）。図の語を語の裁定とも読むかは問い 2（E-09・E-11） |
| `JDG-858` | 「#9 スケジュールをクリップボードにコピーしたあと<br>スケジュールをクリップボードにコピーしました [OK] の表示を出せ。<br>何が動いているか分からない。」 | `FR-025` の 1 文（E-03）と 表 T-233 の `RS-68`（E-04）。日本語の語は逐語（E-10） |
| `JDG-130` | 「案 1とせよ。」（`Agent API` の `importDocument` が文書を渡すときも、開く道と同じ三択を問う） | 変えない。渡された文書にも開き方の面が立つので、ファイルの無いときの ② の扱いを決めた（決定 5） |
| （`DFC-184` の裁定、2026-09-02） | 「案① `Save to File`」（保存の面の英語の見出し。`docs/development-records/fixed-defects.md`） | 変えない。問い 2 の答え（`JDG-1095`）でも英語の見出しは `Save to File` のまま |
| `JDG-1094` | 「Q12: 推奨通りA」（11 節の問い 1 への答え、2026-10-01。Q の番号は調整役がチャットで振った番号） | 問い 1 は A —— 英語の語（「How to Open the File」ほか）と、コピーの知らせの次の一手を空にすること。E-09・E-10・E-12 のまま |
| `JDG-1095` | 「Q13: ファイルに保存 / 単一 HTML / SVG画像」（11 節の問い 2 への答え、2026-10-01） | 問い 2 は 3 か所を 1 つずつ答えた —— 見出しは「ファイルに保存」のまま、`IO-7` は「単一 HTML」のまま、絵は「SVG画像」（空白なし）。英語は変えない。⚠️ 問いが絵の 2 つを 1 か所に束ねたので「PNG画像」も同じ形と読む（E-09・E-11） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4`（すぐわか）／ `GL-006`** —— 3 つとも、利用者が `dist/index.html` を使って「使いにくい」「ダサい」「何が動いているか分からない」と読んだ所である。
① 開き方の面は、いま見出しの行に説明の無い図形 3 つだけが並び（`src/framework/dom-screen-surface/open-modals-drawing.ts` の `modalTitleRow` が面の入口をすべて見出しの行に置く）、どのファイルを読んだのかも出さない。図形の横に説明を添え、読んだファイルと文書名を出せば、説明を読みに行かずに選べる。
② 保存の面は、ボタンの幅が語の長さで揃わず（`STYLE.formatChoices` が `flex-wrap`、`src/framework/dom-screen-surface/dom-screen-surface.ts:359`）、交換の形式と絵が 1 列に混ざる。
③ `IC-3` は押しても画面の絵が何も変わらず、成功を告げない（`src/framework/single-html-shell/frame-loop.ts` の `case 'copyPictureToClipboard'` は失敗の理由と `RS-24` しか上げない）—— `FR-029` の RATIONALE「無反応だと故障に見える」に当たる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① `FR-029` の RATIONALE は「**例外は無い。**」と言い、`JDG-922` の #5 は「[x] と同じ働きのキャンセルを下にも置く（`FR-029` の例外）」と裁いた。裁かれた行が勝つ（規則 02 の 1）⇒ 同要求の「例外を作るときは、ここに理由を書いて足すこと」に従い、例外と理由をそこへ足す（E-01）。② 大きさの綴りを持つ所は `CR-610` の `HS-3` の 1 つだけにする —— 同行が「ファイルの大きさを画面に出すほかの面も、本行の綴りに従うこと（MUST）」と自ら言い、`JDG-971` の ③ が開き方の面をそれに揃えた。本書は `HS-3` を指すだけで、綴りを書き写さない。
- **`R1.4`（境界・空の場合）** —— 開き方の面の中身が欠ける場合を 2 つ決めた: 文書名が `null`（`AT-3` は「可」）と、ファイルを持たずに渡された文書（`JDG-130` で渡された文書にも面が立つ）。コピーの知らせは、送れなかった 3 つの道（`RS-43`・絵の失敗・宿主の拒み）では出さない。
- **`R1.6`（否定の代わりの行動）** —— 「②を出さない」と書いた所には、出すものの規則（ほかの段はそのまま）を同じ行に置いた。
- **`R2.1`（命名）** —— 状態機械の運ぶ値の名を `incomingFile` とした。コードは読んだ文書を `incoming` と呼び（`document-file-flow.ts` の `openDocumentIntoHold`・副作用 `discardIncomingDocument`）、同じ語に揃えた。
- **`R2.7`（DRY）／ `R2.21`（1 つの仕事は 1 か所）** —— ① 大きさの綴りは `HS-3` の 1 か所（上の `R1.3`）。コードでも、ヘッダーと開き方の面が 1 つの関数を呼ぶ（5 節）。② 選択面の形式の並びは、段を分けるのも段の中の順も 表 T-024 から読む —— `FR-096` の「順を本要求に書き写してはならない（MUST NOT）」を守るため、行 ID を本文に並べない（E-02）。③ 取りやめる段は `IC-52` と同じことをする —— 閉じる道を 2 つ作らない（5 節）。
- **`R2.14`（POLA）** —— 取りやめる段は `IC-52` と同じ図形で描く。同じ図形が同じ働きを持つので、2 つ目の入口でも違いを探させない（E-01 の ⚠️）。
- **`R4.4`（状態遷移表）** —— 変えるのは出来事 1 つと状態 1 つの運ぶ値だけ（E-07・E-08）。状態・出来事・遷移の数は変わらない。先例は `mergeMappingAsked` → `awaitingMergeMapping`（`mergeCandidates` を出来事と状態の両方が運ぶ）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を `U-54`・`U-56`・`Open Chooser`・`Export Chooser`・「開き方」・「ファイル保存」・「ファイルに保存」・「単一 HTML」・「Single HTML」・「例外は無い」・「キャンセル」・`IC-3`・`RS-65`・`FR-025`・`FR-029`・`OP-3`・「コピーしました」で引いた（13 節）—— 当たりは 0.1 節の行と、`JDG-888`（Single HTML を別の GRS で読む。`CR-612` の持ち物で、本書の旧に触れない）・`JDG-510`（英語の語を利用者に問うた先例）だけで、下の決定と食い違う裁定は 0。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 開き方の面の中身と並びを、表 T-024a に 1 行（`OP-16`）として足す。新しい表・新しい接頭辞を立てない | 規則 02 の 2.5「同じ意味の表が既に無いか」—— 表 T-024a は開くときの規則の表で、`OP-3`（選ばせる）がすでに在る。`OP-13`・`OP-15` も面の振る舞いを 1 行で持つ | 同表の行が 1 つ長くなる |
| 決定 2 | 説明の段の語は、`IC-71`〜`IC-73` の辞書の `hint`（`FR-092` の `EZ-2` が出す語）をそのまま使い、新しい語を作らない | `JDG-854` の図は 1 段目だけを「現在の文書を置き換える」と書き、残りを「...」と空けている —— 並べ方の図であって語の裁定ではない。`IC-71` の `hint` は「読んだ内容で現在の文書を置き換える」で、図の語を含む | 図形にポインタを乗せると、段の語と同じ説明がもう 1 度出る |
| 決定 3 | ② の段は「名札: 名前 (大きさ)」と、図のとおり大きさを括弧に入れる。名札と値のあいだは図のとおり ASCII の `:` と空白 1 つ | `JDG-854` の図の逐語（「ファイル:   xxxx.json (100kB)」）。`:` と括弧は区切りの記号で語ではない（`HS-2` が `/`・`:` を辞書に持たないのと同じ） | `HS-3` の綴りが `[kB]` を持つので、括弧が入れ子に見える（`(48.2[kB])`）—— 利用者が嫌えば括弧を外す 1 語の直しで済む |
| 決定 4 | 文書名が `null` の文書では、③ の段に `Untitled` を出す | `FR-035` がブラウザのタブに同じ場合を `Untitled` とし、「画面の言語で切り替えない」と定めている —— 同じ値の無いことを 2 通りに見せない | 名の無い文書どうしは見分けられない（`FR-035` の ⚠️ と同じ） |
| 決定 5 | ファイルを持たずに渡された文書（`AM-8`）では ② の段を出さない | 名前の元になるファイルが無い。`JDG-130` で渡された文書にも面が立つ（今はコードの `DEVIATION`、`DFC-614`） | 渡された文書では大きさも見えない |
| 決定 6 | 取りやめる段を押したときは、`IC-52` を押したときと同じとする（状態機械の `flowSurfaceClosed` → `idle`、`discardIncomingDocument`）。表 T-109 に行を足さず、`IC-52` の行も書き換えない | `JDG-922` の #5「[x] と同じ働き」。同じ働きに 2 つ目の行を作れば、同じものに鍵が 2 つできる。`IC-52` の行はすでに `Open Chooser` を面に挙げている | 同じ面に `IC-52` の図形が 2 つ立つ（`FR-029` の例外として E-01 に書いた） |
| 決定 7 | 見出しの段の閉じる入口を、開き方の面でも保存の面でも右端に置く | 2 つの図とも `[x]` を右端に描いた。名簿の面の 表 T-257 の `RR-6` が同じ置き方を「面ごとに閉じる入口の場所を探させない」理由で既に持つ（ただし同行は名簿の面だけを縛る） | 無い。⚠️ ほかの面（`Import Report` ほか）は今のまま —— 全面へ広げるかは本書で決めない |
| 決定 8 | 図の「------」は見出しの段の境の描き方とみなし、新しい罫を足さない | 2 つの図とも罫を見出しの直下に描いたが、罫の色・太さは言っていない。足すなら色の行（`S-149`）を指す 1 文で済む | 利用者が罫を求めていたなら、もう 1 度直す |
| 決定 9 | 保存の面の 2 段は、表 T-024 の用途の欄が「画面の出力」である行（絵）を 2 段目、それ以外を 1 段目とする。列の数は長いほうの段の数 | `JDG-887` の図の 1 段目は交換の形式 3 つ、2 段目は絵 2 つであり、`FR-025` の 表 T-241 の `IX-2`・`IX-7` も同じ 2 つに分けている。「3 つずつ」と数で書くと魔法の数になり、形式が増えたとき崩れる | 用途の欄の語を生成器が読む（9 節）—— 語を書き換えれば生成器が止まる |
| 決定 10 | コピーの知らせの作法は `NT-5`（受け付けたうえで伝える）とし、`RS-65`（`FR-068` のプロンプトを写した）と同じ形にする | 依頼文の「`CR-562` の `IC-115`／`RS-65` と同じ型」。[OK] は `NT-8` の消す入口がどの通知にも既に在る | 無い |
| 決定 11 | 送れなかったとき（高さの天井 `RS-43`・絵の失敗 `RS-42`・宿主が書き込みを拒んだ `RS-15`）はコピーの知らせを出さない。`RS-24`（安全弁）は今のとおり、写した後に上げる | 写せていないのに「コピーしました」と告げると偽になる。`RS-24` は 表 T-014 の `ST-7` が、絵を書き出す経路でも書き出しを終えたあとに上げると定めた別の知らせ | 安全弁に達した絵を写したときは、知らせが 2 つ立つ（`NT-8` のとおり新しいものから消える） |
| 決定 12 | 状態機械の運ぶ値は 1 つ（`incomingFile`: 名前・バイト数・文書名）にし、3 つに分けない | 3 つは同時に生まれ同時に消え、読むのは開き方の面だけである。分けると、揃わない組（名前だけ在る）が型の上で作れる | 型が入れ子になる |
| 決定 13 | 本書が触れる 3 つの面（開き方の面・保存の面・コピーの知らせ）は、明暗とも既存の色の行だけで描くこと（MUST） —— 新しい色の行も、画面の色のマジックナンバーも作らない。実測（`src/framework/dom-screen-surface/dom-screen-surface.ts`）: 開き方の面・保存の面の枠（`STYLE.modal` → `STOPPING_BOX`）は `PAINT.ground`（`S-146`）・`PAINT.ink`（`S-147`）・`PAINT.rule`（`S-149`）・`PAINT.shadow`（`S-170`）、保存の面の形式ボタン（`entryStyle()`）は `PAINT.panel`（`S-150`）・`PAINT.ink`・`PAINT.rule`、コピーの知らせ（`STYLE.notice`）は `PAINT.ground`・`PAINT.ink`・`PAINT.rule` を使う。6 行とも `settings.json` に `light`／`dark` の両方の値を持つ（既存） | 利用者の確認「ダークモードでもきれいにせよ」（`JDG-1098`）。`R2.7`（DRY）・`FR-041`（テーマは色相だけを動かし、面ごとに色を作り直さない） | 無し —— 既存の行だけで足りる（実測）。本書の実装の波で、足りない色が要ると分かったときは、使う前にその旨をここへ書き、新しい色の行を仕様へ起草して提案すること（MUST NOT 使ってから書く） |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所（`bfbe7eb7`） | 編集 | 裁定を戻すとき |
|---|---|---|---|
| `FR-029` の例外 | `docs/spec/01-04-requirements.md:7267`（RATIONALE の「例外は無い」） | E-01 | その段 |
| 保存の面の格子 | `FR-096` の並べる順の段の後（`:6786` の次） | E-02 | 足した 3 行 |
| コピーの知らせ | `FR-025` の `IC-3` の段（`:6392`） | E-03 | 足した 3 行 |
| 知らせの理由の行 | 表 T-233 の `RS-15` の前（`:7400`） | E-04 | その 1 行 |
| 開き方の面の中身と並び | 表 T-024a の `OP-3` の次（`:6439`） | E-05 | その 1 行 |
| 名簿の指し先 | `docs/spec/_assets/tbl-glossary.md:138`（表 T-103 の `U-56`、手書き） | E-06 | その 1 句 |
| 読んだファイルを面へ運ぶ | `docs/spec/_source/state-machines.json` の出来事 `documentFileRead` と状態 `awaitingOpenChoice` | E-07・E-08 | 2 つの `carries` |
| 見出しの語 | `docs/spec/_source/display-words.json` の `surfaces` | E-09 | 2 項 |
| 知らせの語 | 同 `reasons`（`RS-15` の前） | E-10 | 1 項 |
| 形式の語 | 同 `exportFormats` | E-11 | 2 語（問い 2 の答え、`JDG-1095`） |
| 段の名札と取りやめる語 | 同、新しい節 `openChooser`（`arms` の前） | E-12 | 1 節 |

⭐ 生成物 —— `docs/spec/_assets/tbl-state-machines.md`・`src/adapter/screen-renderer/display-words.json`・`src/use-case/advance-screen-session/file-flow-values.ts` の生成区画 —— は `npm run gen` だけが書く。⛔ 手で書かない。新しい節 `openChooser` は、生成器 `tools/generate_display_words.py` が節を知るまで `npm run gen` が止まる（9 節、波 1）。

## 2. 新しい識別子

| 識別子 | 何か | 番号 |
|---|---|---|
| 表 T-024a の `OP-16` | 選ばせる面（`U-56`）の中身と並び | 本番。当てる日に振った（規則 02 の 2.5） |
| 表 T-233 の `RS-68` | 日程の画像をクリップボードへ写した | 本番。同上。兄弟の `CR-612` の `RS-67` の次 |
| 状態機械の運ぶ値 `incomingFile` | 読んだファイルの名前・バイト数・文書名 | 名であり番号を持たない（表の行ではない） |
| 表示語の節 `openChooser`（部 `file`・`documentTitle`・`cancel`） | 段の名札 2 つと取りやめる語 | 名であり番号を持たない |

⭐ 表・図・要求・接頭辞・設定値の行は 1 つも足さない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「**例外は無い。**」 | `01-04-requirements.md:7267`（`FR-029` の RATIONALE） | 「**例外は 1 つだけである**」と、その例外と理由の 2 行 | E-01 |
| 状態 `awaitingOpenChoice` の `"carries": []` | `state-machines.json:4304` | `incomingFile` の 1 項 | E-08 |
| `surfaces` の `Open Chooser` の ja「開き方」・en「Open Chooser」 | `display-words.json:2380`〜`:2381` | 「ファイルの開き方」・「How to Open the File」（問い 1 の答え A、`JDG-1094`）。⭐ `Export Chooser` の「ファイルに保存」は変えない（`JDG-1095`） | E-09 |
| `exportFormats` の ja「SVG 画像」「PNG 画像」 | `display-words.json:3512`・`:3519` | 「SVG画像」「PNG画像」（問い 2 の答え、`JDG-1095`）。⭐ `IO-7` の「単一 HTML」は変えない | E-11 |
| コードの、開き方の面の入口を見出しの行に並べる描き方 | `open-modals-drawing.ts` の `modalTitleRow`（`IC-71`〜`IC-73` も見出しの行へ） | 見出しの行は `IC-52` だけ。3 つは本体に縦に | 9 節 |
| コードの `STYLE.formatChoices`（`display:flex;flex-wrap:wrap`） | `dom-screen-surface.ts:359` | 格子 | 9 節 |
| コードの、写せたときに何も告げない枝 | `frame-loop.ts` の `case 'copyPictureToClipboard'`（`writing.ok` の後） | `RS-68` を上げる | 9 節 |

⭐ **消さないもの**（読み直して真のまま）: `FR-029` の「同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）」と「例外を作るときは、ここに理由を書いて足すこと」。`FR-096` の「選択面が形式を並べる順は、表 T-024 の行の並びとすること（MUST）」（E-02 はその後ろに足すだけ）。`FR-025` の `IC-3` の段（E-03 は後ろに足すだけ）。`OP-3` の行（E-05 は次に行を足すだけ）。`U-56` の行の既存の文（E-06 は 1 句を挟むだけ —— `tests/unit/uf-47-48-choosers.test.ts:895` が逐語で引く「選ぶ面。選ばせる規則は …… が持つ」は切れない）。表 T-109 の `IC-52`・`IC-71`〜`IC-73`・`IC-3` の行と、その辞書の語。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える。4 ファイルとも `bfbe7eb7` では CRLF が 0）。新の文は 1 文 1 行（検査 46）。段の途中の行の末には空白 2 つを置く（その段のほかの行と同じ）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-029` の RATIONALE の段。旧
```text
**同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）。**  
どちらを押しても同じことが起きる面が 2 つあると、利用者は違いを探して迷う。  
**例外は無い。**  
⚠️ 画面の言語の入口（`IC-21`）とヘルプの言語の入口（`IC-128`）は、別の値を動かすので同じ機能の入口ではない（`FR-038`）。  
例外を作るときは、ここに理由を書いて足すこと。
```
新
```text
**同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）。**  
どちらを押しても同じことが起きる面が 2 つあると、利用者は違いを探して迷う。  
**例外は 1 つだけである** —— `Open Chooser`（`_assets/tbl-glossary.md` の `U-56`）の最後の段の取りやめる入口であり、見出しの段の `IC-52` と同じ働きを持つ（表 T-024a の `OP-16`）。  
⭐ 利用者がそう定めた —— 3 つの選び方を上から読み下した目の位置に「選ばない」が並ぶので、見出しの右端まで目を戻さずに取りやめられる。  
⚠️ 2 つは同じ図形で描く —— 同じ図形が同じ働きを持つので、違いを探させない。  
⚠️ 画面の言語の入口（`IC-21`）とヘルプの言語の入口（`IC-128`）は、別の値を動かすので同じ機能の入口ではない（`FR-038`）。  
例外を作るときは、ここに理由を書いて足すこと。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-096` の、選択面が形式を並べる順の段。旧
```text
⭐ **選択面が形式を並べる順は、表 T-024 の行の並びとすること（MUST）**—— ⛔ **順を本要求に書き写してはならない（MUST NOT）** —— **拡張子と同じ理由であり、正は同表ただ 1 か所である。**  
⚠️ **行 ID の順ではない** —— **同表の行は行 ID の順に並んでいない。**
```
新
```text
⭐ **選択面が形式を並べる順は、表 T-024 の行の並びとすること（MUST）**—— ⛔ **順を本要求に書き写してはならない（MUST NOT）** —— **拡張子と同じ理由であり、正は同表ただ 1 か所である。**  
⚠️ **行 ID の順ではない** —— **同表の行は行 ID の順に並んでいない。**

⭐ 選択面は、形式を 2 段の格子に並べること（MUST） —— 表 T-024 の用途の欄が「画面の出力」である行（絵）を 2 段目に、それ以外の行を 1 段目に置き、どちらの段の中も上の順とする。  
⭐ 形式のボタンは、幅も高さもすべて揃えること（MUST） —— 列の数は長いほうの段の形式の数とし、どの列の幅も最も長い語のボタンに合わせる。  
⚠️ 利用者が図で示し、「ボタンの大きさは揃えろ」と定めた —— 語の長さでボタンの幅が変わると、段の中の並びが崩れて読みにくい。  
⭐ 見出しの段は、見出しの語を左に、閉じる入口（表 T-109 の `IC-52`）を右端に置くこと（MUST） —— 利用者が図でそう描いた。
```
⭐ 決定 9 のとおり、行 ID も段ごとの数も書かない。`npm run gen` の前に、生成器が用途の欄を読むよう直す（9 節、波 1）。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`FR-025` の、`IO-6` の入口の段。旧
```text
⭐ `IO-6`（クリップボード）の入口は 表 T-109 の `IC-3` とし、選択面を開かずに直ちに送ること（MUST）—— **送り先が 1 つしか無いので選ばせるものが無く**、`FR-096` の選択面は同行を出さない。
```
新
```text
⭐ `IO-6`（クリップボード）の入口は 表 T-109 の `IC-3` とし、選択面を開かずに直ちに送ること（MUST）—— **送り先が 1 つしか無いので選ばせるものが無く**、`FR-096` の選択面は同行を出さない。  
⭐ クリップボードへ送れたときは、送ったことを告げること（MUST） —— 運ぶ理由は 表 T-233 の `RS-68` とする。  
⚠️ クリップボードの中身は画面に出ないので、知らせが無いと、写せたのか押し損じたのかを利用者が見分けられない —— 利用者が「何が動いているか分からない」と定めた。  
⛔ 送れなかったときは、この知らせを出してはならない（MUST NOT） —— 高さの天井（`IX-6`）・絵を作れなかったとき・宿主が書き込みを拒んだときは、それぞれの理由だけを告げる。
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
表 T-233 の末、`RS-15` の前。旧
```text
| RS-15 | この理由にまだ行が無い | `NT-3a` | 本表 |
```
新
```text
| RS-68 | 日程の画像（表 T-024 の `IO-6`）をクリップボードへ写した | `NT-5` | `FR-025` |
| RS-15 | この理由にまだ行が無い | `NT-3a` | 本表 |
```
⭐ 表の結び「行を足すときは、辞書の原稿にも項を足すこと（MUST）」は E-10 が満たす。「その行へ振り分ける道が在ることまで確かめること（MUST）」は 5 節の継ぎ目 C と 8 節の波 1 が満たす。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
表 T-024a の `OP-3` の次。旧
```text
| OP-3 | 現在の文書 | **読んだ内容をどう扱うかを人に選ばせること（MUST）** —— **置き換える**（現在の文書を捨てて新しい日程を出す）か、**合流させる**（現在の文書へ足す）か、**重ねる**（`FR-015`。<br>現在の文書を変えずに変更前の予定として重ねて描く）かの 3 つとする。<br>**どちらになるかを`GRS` が勝手に決めてはならない（MUST NOT）。<br>** 合流を選んだ後の規則は `FR-022` と `FR-056` が持つ |
```
新
```text
| OP-3 | 現在の文書 | **読んだ内容をどう扱うかを人に選ばせること（MUST）** —— **置き換える**（現在の文書を捨てて新しい日程を出す）か、**合流させる**（現在の文書へ足す）か、**重ねる**（`FR-015`。<br>現在の文書を変えずに変更前の予定として重ねて描く）かの 3 つとする。<br>**どちらになるかを`GRS` が勝手に決めてはならない（MUST NOT）。<br>** 合流を選んだ後の規則は `FR-022` と `FR-056` が持つ |
| OP-16 | **選ばせる面の中身と並び**（`OP-3` を問う `Open Chooser`。<br>`_assets/tbl-glossary.md` の `U-56`） | 面には、次の 5 つの段を上からこの順に 1 列に並べること（MUST） —— 利用者が図で示した並びである。<br>① 見出しの段 —— 見出しの語を左に、閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）を右端に置く。<br>② 読んだファイルの段 —— ファイルの名前と、読んだ中身の大きさを括弧に入れて並べる。<br>大きさは読んだ中身のバイト数とし、`FR-101` の 表 T-341 の `HS-3` のとおり綴ること（MUST） —— 大きさの綴りを 2 か所に置かない。<br>③ 文書名の段 —— 読んだ文書の文書名（`_assets/fig-erd-detail.md` の `AT-3`。<br>`U-27`）を出す。<br>利用者はこの段を「プロジェクト名」と呼んだ。<br>④ 選び方の段 —— `OP-3` の 3 つの入口（表 T-109 の `IC-71` 〜 `IC-73`）を同表の並びで 1 段に 1 つずつ置き、図形の右にその入口の説明（`FR-092` の 表 T-040 の `EZ-2` が出すのと同じ語）を添える。<br>⑤ 取りやめる段 —— `IC-52` と同じ図形の右に取りやめる語を添え、押されたときは `IC-52` が押されたときと同じことをすること（MUST）。<br>⚠️ この 2 つ目の入口は `FR-029` の「同じ機能の入口を 2 か所に置かない」の例外であり、理由は同要求が持つ。<br>⚠️ 説明の語は図形に添えるものであり、図形を語で置き換えない（`FR-029`）。<br>⚠️ 段の名札（ファイルとプロジェクト名）と取りやめる語は `FR-038` の辞書が持つ。<br>⚠️ 文書名が `null` の文書では、③ に `FR-035` がブラウザのタブに出すのと同じ `Untitled` を出すこと（MUST） —— 空の段では、名が無いのか読めなかったのかが読めない。<br>⚠️ ファイルを持たずに渡された文書（`_assets/tbl-glossary.md` の 表 T-107 の `AM-8`）では ② を出さないこと（MUST） —— 名前の元になるファイルが無い。<br>⭐ 名前・大きさ・文書名は読んだ時点のものとし、面を出しているあいだ変えないこと（MUST） |
```
⭐ ② の `HS-3` と 表 T-341 は `CR-610` が起こす —— 同書の番号が当てる日に変われば、本書の 表 T-341 の綴りも同じ番号へ置き換える。

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md partial -->
表 T-103 の `U-56` の行。旧
```text
3 つの入口は表 T-109 の `IC-71` 〜 `IC-73` が持つ。<br>⚠️ **`Confirmation` ではない**
```
新
```text
3 つの入口は表 T-109 の `IC-71` 〜 `IC-73` が持つ。<br>面の中身と並びは 表 T-024a の `OP-16` が持つ。<br>⚠️ **`Confirmation` ではない**
```

<!-- EDIT id=E-07 file=docs/spec/_source/state-machines.json -->
出来事 `documentFileRead` の運ぶ値。旧
```text
     "key": "documentFileRead",
     "source": {
      "kind": "effectResult",
      "rows": [
       "OP-5",
       "OP-12",
       "FR-023"
      ],
      "note": {
       "ja": "`readDocumentFile` が読み、形式を判じ、検証を通した"
      }
     },
     "carries": [
      {
       "name": "question",
       "rows": [
        "QN-5"
       ],
       "note": {
        "ja": "読み直すときに立てる問い。挙げる名前は操作を始めた時点の文書（`CS-4`）。副作用の実行が詰める"
       }
      }
     ]
```
新
```text
     "key": "documentFileRead",
     "source": {
      "kind": "effectResult",
      "rows": [
       "OP-5",
       "OP-12",
       "FR-023"
      ],
      "note": {
       "ja": "`readDocumentFile` が読み、形式を判じ、検証を通した"
      }
     },
     "carries": [
      {
       "name": "question",
       "rows": [
        "QN-5"
       ],
       "note": {
        "ja": "読み直すときに立てる問い。挙げる名前は操作を始めた時点の文書（`CS-4`）。副作用の実行が詰める"
       }
      },
      {
       "name": "incomingFile",
       "rows": [
        "OP-16"
       ],
       "note": {
        "ja": "読んだファイルの名前（ファイルを持たずに渡された文書では無い）と、読んだ中身のバイト数と、読んだ文書の文書名（`AT-3`。無いこともある）。`Open Chooser` が出す。副作用の実行が詰める"
       }
      }
     ]
```

<!-- EDIT id=E-08 file=docs/spec/_source/state-machines.json -->
状態 `awaitingOpenChoice` の運ぶ値。旧
```text
       "key": "awaitingOpenChoice",
       "parent": null,
       "initial": false,
       "carries": [],
```
新
```text
       "key": "awaitingOpenChoice",
       "parent": null,
       "initial": false,
       "carries": [
        {
         "name": "incomingFile",
         "rows": [
          "OP-16"
         ]
        }
       ],
```
⭐ 遷移（`documentFileRead` × `readingDocumentFile` → `awaitingOpenChoice`）は変えない —— 出来事が運んだ値を状態が持つのは、`mergeMappingAsked` → `awaitingMergeMapping` と同じ形である。状態を出るとき（`openChoiceAnswered`・`flowSurfaceClosed`）に値は捨てられる。

<!-- EDIT id=E-09 file=docs/spec/_source/display-words.json -->
`surfaces` の `Open Chooser` の見出し。**問い 1 の答え A（`JDG-1094`）で書いた。** `Export Chooser` の見出しは問い 2 の答え（`JDG-1095`）で「ファイルに保存」のまま —— 旧と新の両方に、当てる所を 1 回に定める前後として残してある。旧
```text
   "name": "Export Chooser",
   "heading": {
    "ja": "ファイルに保存",
    "en": "Save to File"
   }
  },
  {
   "name": "Open Chooser",
   "heading": {
    "ja": "開き方",
    "en": "Open Chooser"
   }
```
新
```text
   "name": "Export Chooser",
   "heading": {
    "ja": "ファイルに保存",
    "en": "Save to File"
   }
  },
  {
   "name": "Open Chooser",
   "heading": {
    "ja": "ファイルの開き方",
    "en": "How to Open the File"
   }
```
⭐ 問い 2 の答え（`JDG-1095`）で、`Export Chooser` の ja は「ファイルに保存」のまま —— 本編集が変えるのは `Open Chooser` の 2 語だけである。

<!-- EDIT id=E-10 file=docs/spec/_source/display-words.json -->
`reasons` の `RS-15` の前（表 T-233 の並びと同じ所）。日本語の語は `JDG-858` の逐語。**英語の語と次の一手は問い 1 の答え A（`JDG-1094`）で書いた。** 旧
```text
  {
   "rowId": "RS-15",
```
新
```text
  {
   "rowId": "RS-68",
   "text": {
    "ja": "スケジュールをクリップボードにコピーしました",
    "en": "The schedule was copied to the clipboard"
   },
   "nextStep": {
    "ja": "",
    "en": ""
   }
  },
  {
   "rowId": "RS-15",
```
⭐ 次の一手を空にすると、通知は語と `OK`（`NT-8`）だけになる —— `src/adapter/screen-renderer/notices.ts` は空の語を「次の一手なし」として描かない（`NO_WORDS` → `NO_NEXT_STEPS`）。`NT-3a` の行ではないので、次の一手を求める試験（`tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` の「adds the next step wherever the row calls for NT-3a」）にも当たらない。

<!-- EDIT id=E-11 file=docs/spec/_source/display-words.json -->
`exportFormats` の 2 語。**問い 2 の答え（`JDG-1095`「Q13: ファイルに保存 / 単一 HTML / SVG画像」）で書いた** —— `IO-7` の「単一 HTML」は変えず、絵の 2 つの空白を除く。旧
```text
   "rowId": "IO-7",
   "name": {
    "ja": "単一 HTML",
    "en": "Single HTML"
   }
  },
  {
   "rowId": "IO-3",
   "name": {
    "ja": "SVG 画像",
    "en": "SVG image"
   }
  },
  {
   "rowId": "IO-4",
   "name": {
    "ja": "PNG 画像",
```
新
```text
   "rowId": "IO-7",
   "name": {
    "ja": "単一 HTML",
    "en": "Single HTML"
   }
  },
  {
   "rowId": "IO-3",
   "name": {
    "ja": "SVG画像",
    "en": "SVG image"
   }
  },
  {
   "rowId": "IO-4",
   "name": {
    "ja": "PNG画像",
```
⭐ `IO-7` の行は旧と新で同じ（前後として残した）—— 変わるのは `IO-3`「SVG画像」と `IO-4`「PNG画像」の 2 語だけ。⚠️ 「PNG画像」は、問いが絵の 2 つを 1 か所に束ねて問うた（11 節の問い 2 の表）ことからの読みである（`JDG-1095` の読みの欄）。⭐ **その読みは確定した**（`JDG-1098`、2026-10-01。調整役の確認「Q13 は「SVG画像」だけを名指ししていた。「PNG画像」の空白も詰めてよいか」への答え） —— 読みではなく裁定として扱ってよい。

<!-- EDIT id=E-12 file=docs/spec/_source/display-words.json -->
新しい節 `openChooser`（`exportFormats` の後、`arms` の前）。日本語の語は `JDG-854` の逐語（「ファイル」「プロジェクト名」「キャンセル」）。**英語の語は問い 1 の推奨で書いた。** 旧
```text
 ],
 "arms": [
```
新
```text
 ],
 "openChooser": [
  {
   "part": "file",
   "text": {
    "ja": "ファイル",
    "en": "File"
   }
  },
  {
   "part": "documentTitle",
   "text": {
    "ja": "プロジェクト名",
    "en": "Project name"
   }
  },
  {
   "part": "cancel",
   "text": {
    "ja": "キャンセル",
    "en": "Cancel"
   }
  }
 ],
 "arms": [
```
⭐ 部の鍵は表の行ではないので、生成器に並びを持たせる —— `SEARCH_PANEL_PARTS` と同じ形（`tools/generate_display_words.py:266`）。

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → vitest。`docs/development-records/changelog.md` に 1 行足す（調整役）。

### 4.1 重なり

`bfbe7eb7` で `change-request/CR-603`〜`CR-620` の頭の 9 行を読み、本書の 12 の旧の文と、触る行 ID（`U-54`・`U-56`・`OP-3`・`IC-52`・`IC-71`・`IC-3`・`RS-15`・`FR-029`・`FR-025`・`documentFileRead`・`awaitingOpenChoice`・`surfaces`・`exportFormats`）で引いた（13 節）。

| 変更要求 | 触れ合う所 | どちらが先か ／ 数え直す側 |
|---|---|---|
| `CR-610`（起草） | E-05 が同書の 表 T-341 の `HS-3` を指す。同書の E-01 は `FR-096` の MSPDI の文の後ろに段と表を足すが、本書の E-02 の旧（並べる順の段）はそれより前の別の行である | ⛔ **`CR-610` が先。** 旧は重ならない。同書の表の番号が当てる日に動けば、本書の「表 T-341」を同じ番号へ置き換える |
| `CR-612`（起草） | 表 T-233 に `RS-67` を足す（旧は `RS-65` の行）。辞書の `reasons` にも `RS-65` の項を旧として足す。本書は `RS-15` の行と項を旧にする | どちらが先でもよい。後の側も旧は 1 回（`RS-65` と `RS-15` は隣でも別の行）。並びはどちらの順でも `RS-65`・`RS-67`・`RS-68`・`RS-15` になる。⚠️ 同書は 表 T-024 の `IO-7` を取込にも開く —— 開き方の面は `.html` を読んだときも立つが、本書の段の規則はそのまま当たる |
| `CR-605`（起草） | 辞書の `surfaces` に `Calendar Editor` を足す（旧は `Resource Roster` の項）。表 T-109 の `IC-52` の面の欄に面を足す | どちらが先でもよい。本書の E-09 の旧は `Export Chooser` と `Open Chooser` の項で、同書の旧・新と行を共有しない。本書は `IC-52` の行を書き換えない（決定 6） |
| `CR-617`（起草。遅延診断 —— 本書の対象外） | `IC-52` の面の欄に面を足す | 本書は `IC-52` の行を書き換えないので重ならない |
| `CR-611`・`CR-619`（起草） | `OP-3` を文中で指す・`OP-2` のファイル選択の画面 | 旧を共有しない |
| 兄弟の `CR-621`〜`CR-630`（読めない） | `CR-630` の `Esc` の段（`IN-4`）は開き方の面を閉じる道として今のまま当たる。`CR-627` が 表 T-109 の行を並べ替えても、本書は同表の行を書かない。`CR-622` のヘルプ（`FR-036`）は `IC-71`〜`IC-73` を `IC-1` の下に並べる規則を持つが、本書はそれを変えない | ⚠️ `FR-029` の RATIONALE の段（E-01 の旧）や 表 T-233 の末（E-04 の旧）を兄弟が書くなら、後に当てる側が旧を数え直す |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
Ids OP-16 (table T-024a) and RS-68 (table T-233) are the final ids the spec
pass gave at landing. HS-3 / table T-341 come from
CR-610, which lands first.

A. Open Chooser (U-56), row OP-16
- fileFlow event documentFileRead carries incomingFile; the state
  fileOperationStateMachine.awaitingOpenChoice carries the same value
  (generated by npm run gen). Hand-written type, in
  src/use-case/advance-screen-session/file-flow-values.ts, added to BOTH
  FileFlowValuesStateCarried and FileFlowValuesEventCarried:
    incomingFile: {
      readonly fileName: string | null     // null: handed without a file (AM-8)
      readonly byteLength: number          // bytes of the content read
      readonly documentTitle: string | null // Project.title (AT-3) of the document read
    }
  onDocumentFileRead puts it on { kind: 'awaitingOpenChoice', incomingFile }.
- document-file-flow.ts: askHowToOpen sends it with documentFileRead;
  openDocumentIntoHold has file.fileName, file.byteLength and
  incoming.project.title (handed: fileName null, handed.byteLength).
- The frame reads it from session.fileFlow.fileOperationState when its kind is
  'awaitingOpenChoice' (the way mergeReviewIn reads awaitingMergeMapping) into
  ScreenViewReadings; open-modals.ts builds a NEW OpenModal member for
  'Open Chooser' (it falls into the catch-all today).
- Order, top to bottom, one column:
    1 heading row: heading word (surfaces 'Open Chooser') left, IC-52 at the right end
    2 "<file word>: <file name> (<size>)"      -- omitted when fileName is null
    3 "<documentTitle word>: <title>"          -- title null -> "Untitled"
    4 IC-71, IC-72, IC-73, one per row, table T-109 order: glyph, then the
      entry's hint word (the word EZ-2 shows)
    5 IC-52's glyph, then the cancel word
  IC-71..73 no longer stand in the heading row. ':' is ASCII followed by one
  space; the size sits in ASCII parentheses after one space.
- size = HS-3 spelling of the byte length. ONE pure function spells HS-3 for the
  App Header (CR-610 SEAM-2) and this surface; if CR-610 left it private in
  app-header-drawing.ts, export or move it -- never a second copy (R2.21, R2.22).
- Row 5 is an entrance of IC-52 (data-icon="IC-52", a second one on this
  surface). Pressing it does exactly what the heading's IC-52 does:
  flowSurfaceClosed with U-56 -> idle, discardIncomingDocument, current document
  untouched. Esc (IN-4) unchanged.
- Words: display-words section openChooser, key 'part', parts in this order:
  file, documentTitle, cancel. tools/generate_display_words.py gains
  OPEN_CHOOSER_PARTS = ('file', 'documentTitle', 'cancel') and SHAPE entry
  ('part', ('text',)), the same move as SEARCH_PANEL_PARTS.

B. Export Chooser (U-54), FR-096
- Two rows in one grid: row 1 = offered formats whose table T-024 use column
  (用途) is NOT 「画面の出力」, row 2 = those whose use IS 「画面の出力」; inside
  a row, table T-024 order. Number of columns = the longer row's count.
  Every format button has the same width and height (equal columns, each as
  wide as the widest label). data-format attributes unchanged.
- The split is read from table T-024 by tools/generate_exchange_formats.py into
  src/adapter/screen-renderer/export-formats.json (e.g. "isPicture": true);
  the generator refuses to write when no offered row has 「画面の出力」. No IO id
  is listed in src.
- Heading row: heading word left, IC-52 at the right end.

C. Copy notice, FR-025, row RS-68, manner NT-5
- frame-loop.ts case 'copyPictureToClipboard': when writing.ok, raise
  RS-68; then RS-24 as today when capStopInPicture !== null.
  Never on HEIGHT_CEILING_REASON (RS-43), a raster fault, or a refused write
  (RS-15 stays for that).
- NoticeReason union and NOTICE_MANNER_OF_REASON gain 'RS-68': 'NT-5'.
- Its nextStep words are empty: the notice shows the text and OK (NT-8) only.

Observable (for the tester, from docs/spec only):
- Open a.json (N bytes, title T): the surface [data-role="Open Chooser"] shows,
  top to bottom: heading "ファイルの開き方" (en per question 1) with IC-52 right
  of it; a line holding "a.json" and "(" + HS-3(N) + ")"; a line holding T;
  three rows whose data-icon are IC-71, IC-72, IC-73 in that order, each
  glyph left of its hint text, each row's top below the previous row's bottom;
  a last row with data-icon IC-52 and the cancel word. The heading row holds no
  IC-71..73.
- Title null -> the title line reads "Untitled" in both languages.
- Last row pressed: the surface closes, the current document is unchanged,
  no question is asked (same as the heading's IC-52).
- Export Chooser: buttons for IO-2, IO-1, IO-7 share one top; IO-3, IO-4 share
  a lower top; IO-3's left equals IO-2's left, IO-4's equals IO-1's; all five
  have equal width and equal height (within 0.5px).
- IC-3 with the clipboard accepting: one notice whose text is the dictionary
  word of RS-68, manner NT-5, with OK and no next step; Enter or Esc removes
  it. Clipboard refusing, or the picture over the height ceiling: no RS-68.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py U-56 OP-3 IC-71 U-54 FR-096 IC-3 FR-025 T-233`:
  - `U-56`: 要求 3 ／ 参照 10（`FR-152`・`FR-080` の `EP-19`・`FR-076` の 表 T-234 の結び、`tbl-state-machines.md` の 6 か所）。
  - `OP-3`: 要求 8 ／ 参照 29（`FR-031`・`FR-032`・`FR-022`・`FR-056`・`FR-080`・`FR-087`・`FR-060`・`FR-076`、`05-07-design.md:500`（`UF-165`）・`:747`（`RD-4`）、表 T-109 の `IC-71`〜`IC-73`、`U-56`、生成された状態機械の表）。
  - `IC-71`: 要求 1 ／ 参照 5（`FR-036`:7519 のヘルプの並び、`RC-13`:8141、`U-56`、状態機械の表 2 か所）。
  - `U-54`: 要求 2 ／ 参照 5。`FR-096`: 要求 6 ／ 参照 15。`IC-3`: 要求 2 ／ 参照 3（`FR-025`:6392・`FR-096`:6767・`RC-13`）。`FR-025`: 要求 4 ／ 参照 14。
  - 表 T-233: 行 61、指す要求 23、2 次 59。
- 追加で `impact.py T-233 FR-029 T-024a`: `FR-029` を指す要求 26 ／ 参照 68。
- ⭐ 届いた先を読んだ: 「同じ機能の入口を 2 か所に置かない」を引く文（`FR-091`:1430・`FR-008`:2212・`FR-099`:2492・`FR-097`:6750・`FR-066`:7032・`FR-038`:7648・表 T-109 の `IC-99`）は、どれも自分の入口が例外に当たらないことを言うだけで、「例外は無い」を前提にしない ⇒ 真のまま。`FR-036`:7519（ヘルプで `IC-71`〜`IC-73` を `IC-1` の下に字下げ）・`EP-19`（書き出す絵に面を描かない）・`UZ-13`（面の重なりの順）・`RC-13`（図形の見比べ）・表 T-234 の結び（`OP-3` は `Confirmation` ではない）・`UF-165`・`UF-66`・`UF-109`（「ほか」で面を数え上げない）は、本書の後も真 ⇒ 書き換えない。表 T-233 の結びの 3 つの MUST（辞書に項・語を合わせる・振り分ける道）は E-10 と 5 節の C で満たす。
- `induced.py U-56 OP-3 IC-71 U-54 FR-096 IC-3 FR-025 T-233`: 種 8/8、種の中の辺 10、閉路 1（`FR-025` `FR-096` `IC-3`、大きさ 3）。種に `FR-029` `T-024a` `FR-087` を足した 11 でも閉路は同じ 1 つ（辺 16）。⇒ **E-02（`FR-096`）と E-03（`FR-025`）は同じ回に当てる。** 閉路は前から在る（`IC-3` の行が `FR-025` を、`FR-025` が `FR-096` の選択面を、`FR-096` が `IC-3` を指す）。本書は閉路に辺を足さない。
- `rulings.md` の照合は 0 節 ③ の頭に書いた。`pending-decisions.md`: `PND-140`（面ごとに何を運ぶか —— 挙げる 5 面に `U-56` は入らない）・`PND-448`（形式を選べば面が閉じる —— 裁定済、変えない）・`PND-474`（行を持たない要素の印 —— 本書は印を足さない。② と ③ の段は面の中の文で読める）は、どれも本書で閉じない。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2683 / 176 → 212 / 29 / 2685 / 176 | rows ＋2（`OP-16`・`RS-68`）。⚠️ 先に当たる `CR-610`・`CR-612` の差はこの上に積む |
| 表 T-233 の行 | 61 → 62 | E-04 |
| 表 T-024a の行 | ＋1 | E-05 |
| `fileOperationStateMachine` の状態 / 出来事 / 遷移 | 変わらない | 運ぶ値だけが変わる |
| 運ぶ値（出来事 `documentFileRead` ／ 状態 `awaitingOpenChoice`） | 1 → 2 ／ 0 → 1 | E-07・E-08 |
| 表示語の節 | 31 → 32 | `openChooser`（3 項） |
| 表示語の `reasons` | 61 → 62 | E-10 |
| `（MUST）`・`（MUST NOT）` の印（`01-04-requirements.md`） | ＋11 | E-02 ＋3、E-03 ＋2、E-05 ＋6（13 節のスクリプトが新と旧の塊の印を数えた差）。検査 39 のために、波 3 の試験が新しい MUST を逐語で引く |
| 検査 37 の対（`dictionary-table-pairing.txt`） | 変わらない | 表 T-109 の行とその語を書き換えない |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-610` が当たったことを確かめる（`HS-3` が在る）。`CR-612`・`CR-605` の後なら、4 節の旧 12 件をもう 1 度数える。問い 1・問い 2 の答え（`JDG-1094`・`JDG-1095`）は E-09〜E-12 に書き入れてある（問い 2 は推奨 B ではない —— E-09 は `Open Chooser` だけ、E-11 は絵の 2 語だけ）。本番の番号 `OP-16`・`RS-68` を振り、本書と 5 節の綴りを機械で置き換えた（当てた日） | 調整役 | ― |
| 1 | ⛔ **L4 の合流を待つ**（`frame-loop.ts`・生成器は L4 の持ち物）。`docs/spec`（E-01〜E-12）＋ `tools/generate_display_words.py`（節 `openChooser`）＋ `tools/generate_exchange_formats.py`（用途の欄から絵の印）＋ `npm run gen` ＋ 読む側 —— `src/use-case/advance-screen-session/file-flow-values.ts`（手書きの 2 つの型と `onDocumentFileRead`）・`src/framework/single-html-shell/document-file-flow.ts`（`askHowToOpen` が送る）・`src/framework/single-html-shell/frame-loop.ts`（`NoticeReason`・`NOTICE_MANNER_OF_REASON`・写せたときに `RS-68`）＋ 9 節の試験の 5 ファイル | 原稿と、それを読んで `tsc` か試験が落ちる側を 1 つの波で着地させる（規則 02 の 3.5 —— 生成区画の出来事に `incomingFile` が加わると `askHowToOpen` と 3 つの試験が `tsc` で落ち、表 T-233 に行が加わると `t-233` の指紋の試験が落ちる） | L4 の後の実装の体 | いいえ —— `incomingFile` はファイルを読んだとき 1 度だけ運ばれ、知らせは `IC-3` の 1 回の押しに 1 度だけ上がる。語は差し替わるだけで、描く手順も回数も変わらない |
| 2 | ⛔ **L4 の合流を待つ**。`src/adapter/screen-renderer/open-modals.ts`・`src/adapter/screen-renderer/screen-renderer.ts`（`OpenModal` の新しい員・`ScreenViewReadings.incomingFile`）・`src/framework/dom-screen-surface/open-modals-drawing.ts`・`src/framework/dom-screen-surface/dom-screen-surface.ts`（`STYLE`）・`frame-loop.ts`（読みの 1 関数）・`HS-3` の綴りの関数の置き場（`CR-610` の波 1c の後） | 5 節の A と B の画面の側。`STOP`・`@provisional PND-140` の印は、`FR-074`・`FR-088` の 2 面について残る —— 開き方の面の枝だけを外す | 実装の体（波 1 と別の体） | **はい** —— 開いた面は描くフレームごとに組まれ、読みの関数が毎フレーム走る。⇒ 着地の時に `docs/development-records/perf-pending.md` に 1 行を足す（PW-2） |
| 3 | `tests/contract/cr-623-*.test.ts`（新しいファイルだけ） | 下の「仕様だけの試験」 | 仕様だけを読む試験の体（波 2 と並べてよい。実装した体に書かせない） | ― |
| 4 | スクラッチビルドのスクリーンショット（決定 13、`JDG-1098`） | 波 2 を当てた後、当てる前（着地前）に 1 度だけ行う見た目の検証。`scratch/` に波 2 のビルドを作り、`prefers-color-scheme` を `light`・`dark` の両方に切り替えて Playwright で 3 つの面（開き方の面・保存の面・コピーの知らせ）をスクリーンショットする。6 枚とも、決定 13 の 6 行（`S-146`・`S-147`・`S-149`・`S-150`・`S-170`）どおりの色で、どちらのテーマでも読める（罫・地・字の境がつぶれていない）ことを目で見比べて確かめる。緑でも、この見比べを飛ばして当ててはならない（MUST NOT） | 波 2 の体（または調整役） | ― |

**仕様だけの試験**（`tests/contract/cr-623-the-file-choosers-list-their-choices-and-a-copy-is-told.test.ts`。docs/spec だけを読んで書く）:

1. `OP-16: the open chooser stacks heading, file, document name, three choices and cancel` —— 5 つの段が上から順に並び、各段の上端が前の段の下端より下。
2. `OP-16 ②: the file line spells the size by HS-3` —— 既知のバイト数（例 48213）のファイルで `(48.2[kB])` を含む。1024 で割った数が出ない。
3. `OP-16 ③: the document name line is AT-3, and Untitled when it is null` —— 両言語で `Untitled`。
4. `OP-16 ④: each choice is its glyph with the hint word to its right, in table T-109 order` —— `data-icon` が `IC-71`・`IC-72`・`IC-73` の順、語は辞書の `hint`、図形の右端 ≤ 語の左端。見出しの段に `IC-71`〜`IC-73` が無い。
5. `OP-16 ⑤ / FR-029: the last row is IC-52 and does what the heading's IC-52 does` —— 押すと面が閉じ、現在の文書が変わらず、問いが立たない。見出しの `IC-52` を押した場合と結果が等しい。
6. `OP-16: the lines are those of the file read, not of the current document` —— 現在の文書と違う名前・文書名のファイルを読み、② と ③ が読んだほうの値であること。取りやめてから別のファイルを読み直すと、2 つ目の値に替わること。
7. `FR-096: the export chooser is a two-row grid split by the use column of table T-024` —— 1 段目が用途「画面の出力」でない行、2 段目がその行。行 ID を試験に書かず、表 T-024 から読む。
8. `FR-096: every format button has one width and one height` —— 5 つの幅・高さが 0.5px 以内で等しく、2 段の列の左端が揃う。
9. `FR-096 / OP-16 ①: IC-52 stands at the right end of the heading row` —— 両方の面で。
10. `FR-025 / RS-68: a copied picture is told with NT-5 and OK` —— 語は辞書の `RS-68`、次の一手なし、`Enter` と `Esc` で消える。
11. `FR-025: no RS-68 when the copy did not happen` —— 宿主が拒む・高さの天井（`RS-43`）の 2 つで `RS-68` が立たない。
12. `T-233: RS-68 has manner NT-5 and owner FR-025` —— 表から読む。

⭐ 仕様だけの試験の体の依頼文には、5 節の SEAM を逐語で写す（実装の体と同じ文）。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 波 |
|---|---|---|---|
| `tools/generate_display_words.py` | `SEARCH_PANEL_PARTS`（`:266`）の並び・`wanted` の辞書（`:459` 付近）・`SHAPE`（`:524` 付近）・節の名の 2 つの並び（`:601`〜`:611`・`:667` 付近） | `OPEN_CHOOSER_PARTS = ('file', 'documentTitle', 'cancel')` と節 `openChooser` を足す | 1 |
| `tools/generate_exchange_formats.py` | 表 T-024 を読む所 | 用途の欄が「画面の出力」の行に絵の印を出し、選択面の行に 1 つも無ければ書かずに止まる（決定 9） | 1 |
| `src/use-case/advance-screen-session/file-flow-values.ts` | 手書きの `FileFlowValuesStateCarried`・`FileFlowValuesEventCarried`（`:62`〜`:88`）、`onDocumentFileRead`（`:301`〜`:312`） | `incomingFile` の型を足し、`awaitingOpenChoice` へ運ぶ（生成区画は `npm run gen` が書く） | 1 |
| `src/framework/single-html-shell/document-file-flow.ts` | `askHowToOpen`（`:354`〜`:361`）と、それを呼ぶ `openDocumentIntoHold`（`:475` から） | 読んだファイルの名前・バイト数・文書名を `documentFileRead` に載せる。渡された文書では名前を `null` | 1 |
| `src/framework/single-html-shell/frame-loop.ts` | `NoticeReason`（`:573` 付近）・`NOTICE_MANNER_OF_REASON`（`:631` 付近、`TRAP` の手写し）・`case 'copyPictureToClipboard'`（`:2630`〜`:2663`） | `RS-68` を足し、`writing.ok` のときに上げる（決定 11） | 1 |
| 同 | `mergeReviewIn`（`:1494`）の隣 | `awaitingOpenChoice` から `incomingFile` を読む関数 | 2 |
| `src/adapter/screen-renderer/screen-renderer.ts` | `OpenModal`（`:341` から）・`ScreenViewReadings`（`:512` 付近） | `Open Chooser` の員と読み | 2 |
| `src/adapter/screen-renderer/open-modals.ts` | `openModalFromSession`（`:297` から） | `Open Chooser` の枝。`STOP`・`@provisional PND-140` の注は、残る 2 面（`FR-074`・`FR-088`）のために残す | 2 |
| `src/framework/dom-screen-surface/open-modals-drawing.ts` | `modalTitleRow`（`:328` から）・`headingRowCommands`・`modalElement` の `'formats' in modal`（`:398`〜`:412`） | 開き方の面の 5 段、`IC-52` を右端へ（`pushToTheRightEnd` を 2 面にも）、形式の格子 | 2 |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `STYLE.formatChoices`（`:359`） | 格子（等幅の列）。新しい長さを持たない —— 隙間は今の値のまま | 2 |
| `HS-3` の綴りの関数（`CR-610` の波 1c が作る） | ― | ヘッダーと開き方の面が同じ 1 つを呼ぶ（5 節） | 2 |
| `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` | `PAIRED_ON_2026_09_03`（`:146`、`:567` が行の全数と突き合わせる） | `RS-68` の指紋を、行と語を読んでから 1 行足す | 1 |
| `tests/contract/display-words.contract.test.ts` | 節と鍵の対応（`:300`〜`:360` 付近） | `openChooser: 'part'` | 1 |
| `tests/contract/cr-588-no-pre-change-plan-asks-for-the-file.contract.test.ts`・`tests/contract/state-machine-file-flow.contract.test.ts`・`tests/contract/state-machine-unsaved-edits.contract.test.ts` | `documentFileRead` の出来事を組む所（`git grep -c` で 8・2・1） | `incomingFile` を足す（型が求める） | 1 |
| `tests/contract/dfc-271-d-345-st-7-tells-on-the-screen-and-after-the-export.test.ts` | `:775` の場合の名「sends the picture and tells nobody」 | 主張は安全弁の知らせだけを見るので緑のまま。名を「tells no valve」へ直す（任意） | 1 |

⭐ 逐語で旧の文を引く試験: `git grep` で「例外は無い」「ファイルに保存」「単一 HTML」「SVG 画像」「PNG 画像」「'開き方'」を `tests/` に引いて 0 件（13 節）。`tests/unit/uf-47-48-choosers.test.ts:895` の `U-56` の引用は E-06 の後も連なったまま残る。`:2597` の `entriesOn(OPEN_CHOOSER)` は 表 T-109 を読むので変わらない。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 表 T-109 の行（`IC-3`・`IC-52`・`IC-71`〜`IC-73`）と、その辞書の語・ヒントを変えない（決定 2・決定 6）。
- 大きさの綴りを本書に書かない —— `HS-3`（`CR-610`）を指すだけ。
- 開き方の面の選び方そのもの（`OP-3`・`OP-4`・`OP-13`・`OP-15`）と、渡された文書の `DEVIATION`（`DFC-614`）を変えない。
- 形式を選んだら保存の面を閉じること（`PND-448`、裁定済）を変えない。
- クリップボードへの書き込みを宿主が拒んだときの理由（今は `RS-15` へ落ちる）に行を作らない —— 報告の潜む欠陥 1 に回す。
- 語の読み上げの手立てを足さない（利用者の裁定）。
- 遅延診断（`CR-616`・`CR-617`）・`MCP`・`DFC-1350` に触れない。

## 11. 利用者に問うこと

⭐ **2 つとも 2026-10-01 に答えを得た**（Q の番号は調整役がチャットで振った番号）—— 問い 1 は `JDG-1094`「Q12: 推奨通りA」、問い 2 は `JDG-1095`「Q13: ファイルに保存 / 単一 HTML / SVG画像」。問い 2 は推奨 B ではなく、見出しと `IO-7` は今の語のまま、絵のボタンだけ空白を除く答えである —— E-09・E-11 をその答えで書き直した。残る問いは無い。下の表は問うたときの形のまま残す。

**問い 1 —— 新しく画面に出す語（英語の語と、コピーの知らせの次の一手）**

日本語の語は利用者の図と文の逐語である。英語の語と次の一手は利用者の言葉に無いので、辞書の原稿の規則（「AN AGENT MUST NOT INVENT ONE」）により、案を見せて答えを受ける（先例 `JDG-510`）。

| 所 | 日本語（逐語） | 英語 —— 推奨（案 A） |
|---|---|---|
| 開き方の面の見出し | ファイルの開き方 | How to Open the File |
| 段の名札 | ファイル | File |
| 段の名札 | プロジェクト名 | Project name |
| 取りやめる語 | キャンセル | Cancel |
| コピーの知らせ | スケジュールをクリップボードにコピーしました | The schedule was copied to the clipboard |
| コピーの知らせの次の一手 | （空 —— 語と `OK` だけ） | （空） |

- **案 A（推奨）** —— 上の表のとおり。理由: 見出しは `DFC-184` の裁定（`Save to File`、目的を名乗る語）と同じく面の目的を言う。次の一手を空にするのは、利用者の図が「…コピーしました [OK]」だけで、写した後にすべきことを言っていないからである（`RS-65` は AI へ渡す次の一手が要ったので持つ）。代償: 英語の見出しが長い。
- **案 B** —— 見出しを `Open File`、次の一手に「貼り付け先で貼り付けてください」／「Paste it where you need it」。代償: `Open File` は「開く」の入口の名と読み違えられる。次の一手は分かりきったことを 1 行足す。

**問い 2 —— 保存の面の図の語を、語の裁定とも読むか**

`JDG-887` の図の語は、今の語と 3 か所違う: 見出し（図「ファイル保存」／今「ファイルに保存」）・`IO-7`（図「Single HTML」／今「単一 HTML」）・絵の 2 つ（図「SVG画像」「PNG画像」／今「SVG 画像」「PNG 画像」、空白の有無）。

| 案 | 語 | 代償 |
|---|---|---|
| **A** 並べ方の図と読む | 語は今のまま | 利用者が図に書いた語が画面に出ない |
| **B（推奨）** 図の語をそのまま採る | 見出し「ファイル保存」、`IO-7`「Single HTML」、「SVG画像」「PNG画像」。英語はどれも今のまま | 日本語で英字と漢字のあいだを空ける書き方が、この 2 つのボタンだけ崩れる |
| **C** 見出しと `IO-7` だけ採る | 「ファイル保存」「Single HTML」。絵の 2 つは空白を残す | 図のとおりではない |

推奨は **B** —— 利用者は「以下のようにしろ」と図全体を指し、同じ日の `JDG-888` でも単一 HTML を「Single HTML」と呼んでいる。「ファイル保存」も同じ裁定の本文（「ファイル保存のウインドウ」）の語である。E-09・E-11 は B で書いた。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1324` | 開き方の面が使いにくい | 本書で閉じる（仕様は波 1、画面は波 2）。英語の語は問い 1 の答え A（`JDG-1094`）で決まった |
| `DFC-1357` | 保存の面のボタンの幅がばらばら | 本書で閉じる（格子は波 2）。語は問い 2 の答え（`JDG-1095`）で決まった —— 見出し「ファイルに保存」・「単一 HTML」は今のまま、「SVG画像」「PNG画像」 |
| `DFC-1328` | 絵を写しても成功を告げない | 本書で閉じる（波 1）。英語の語は問い 1 の答え A（`JDG-1094`）で決まった |
| `JDG-854`・`JDG-858`・`JDG-887` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら「指示 —— `CR-623` が当てる」（検査 43）。着地したら 適用済 |
| `JDG-922` | #5 の部分 | 同上（#5 のみ。ほかの項は他の変更要求の持ち物） |
| `JDG-971` | ③ の部分（開き方の面も `HS-3`） | `CR-610` の持ち物。本書は指すだけ |
| `PND-140`・`PND-448`・`PND-474` | 6 節 | 触れない（閉じない） |
| `JDG-1094`・`JDG-1095` | 11 節の問い 1・問い 2 への答え（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書の波が決まったら「指示 —— `CR-623` が当てる」。着地したら 適用済 |

## 13. 測り方の再現

```
# the tree: refactor bfbe7eb7 (branch l4-review-crs)
git log --oneline -1          # -> bfbe7eb7 Record JDG-1052, JDG-1053 ...

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py U-56 OP-3 IC-71 U-54 FR-096 IC-3 FR-025 T-233
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-233 FR-029 T-024a
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py U-56 OP-3 IC-71 U-54 FR-096 IC-3 FR-025 T-233
#   -> seeds 8 of 8, edges 10, cycles 1 (FR-025 FR-096 IC-3)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py U-56 OP-3 IC-71 U-54 FR-096 IC-3 FR-025 T-233 FR-029 T-024a FR-087
#   -> seeds 11 of 11, edges 16, cycles 1 (the same)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py .
#   -> tables=212 figures=29 rows=2683 uids=176

# the rulings and ledger rows read whole
grep -n "^| JDG-854 \|^| JDG-858 \|^| JDG-887 \|^| JDG-922 \|^| JDG-971 " docs/development-records/rulings.md
grep -n "U-56\|開き方\|Open Chooser\|U-54\|ファイルに保存\|Export Chooser\|ファイル保存\|単一 HTML\|Single HTML\|例外は無い\|キャンセル" docs/development-records/rulings.md
grep -n "IC-3[^0-9]\|RS-65\|コピーしました\|画像をコピー\|FR-025\|OP-3[^0-9]\|DFC-184\|FR-029" docs/development-records/rulings.md
grep -n "^| DFC-1324 \|^| DFC-1357 \|^| DFC-1328 \|^| DFC-1143 " docs/development-records/defects.md
grep -n "^| DFC-184 \|^| DFC-118 \|^| DFC-119 " docs/development-records/fixed-defects.md
grep -n "^| PND-140 \|^| PND-448 \|^| PND-474 " docs/development-records/pending-decisions.md

# who reads what (section 9)
git grep -n "documentFileRead" -- src                     # file-flow-values.ts (generated + onDocumentFileRead), document-file-flow.ts:357
git grep -c "documentFileRead" -- tests                   # cr-588 8, state-machine-file-flow 2, state-machine-unsaved-edits 1
grep -n "formatChoices" src/framework/dom-screen-surface/dom-screen-surface.ts   # :359 flex-wrap
grep -n "copyPictureToClipboard\|PROMPT_COPIED_REASON\|'RS-65'" src/framework/single-html-shell/frame-loop.ts
grep -n "NO_WORDS\|NO_NEXT_STEPS" src/adapter/screen-renderer/notices.ts          # an empty nextStep draws no next step

# old wording quoted by tests: 0 hits
git grep -n "例外は無い\|ファイルに保存\|単一 HTML\|SVG 画像\|PNG 画像\|'開き方'" -- tests

# overlaps (section 4.1): heads of CR-603..620 and their EDIT targets, by a script in the session scratchpad
#   grep for IC-52 / OP-3 / U-56 / RS-15 / U-54 -> CR-605, CR-610, CR-611, CR-612 (and CR-617, excluded)
grep -n "| IC-52 |\|\"Open Chooser\"\|surfaces" change-request/CR-605-*.md change-request/CR-617-*.md
grep -n "^| OP-\|^| RS-\|^| IO-\|documentFileRead\|awaitingOpenChoice" change-request/CR-6*.md

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of this file, takes each 旧 fenced block, counts it in its file)
#   E-01..E-05 01-04-requirements.md 1 each / E-06 tbl-glossary.md 1 / E-07, E-08 state-machines.json 1 each /
#   E-09..E-12 display-words.json 1 each; both JSON files still parse with all edits applied
#   the same script sums （MUST）/（MUST NOT） in 新 minus 旧 for 01-04-requirements.md: +11
#   (E-02 +3, E-03 +2, E-05 +6)
# the same blocks after CR-605, CR-610, CR-611, CR-612 are applied first to an in-memory copy
#   (a second script in the session scratchpad applies every EDIT of those files in order): still 1 each
```
