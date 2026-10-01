# CR-622 — ヘルプの塊を種類ごとの段に分けて枠で囲み、割当を右へ寄せ、ライセンスは 2 行で見せる

> 起草の状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。まだ当てていない。4 節の旧 12 件は、読んだ木でどれも 1 回だった（13 節）。⚠️ その後 `refactor` が `7a5b387b` へ進み（`CR-605` が着地）、E-01 の旧だけが 0 回になった —— 調整役が E-01 を `7a5b387b` の `HC-1` の行に合わせて切り直した（4 節）。残る 11 件は `7a5b387b` でも 1 回だった。11 節に問いが 4 つ残る —— 4 節はどれも推奨の答えで書いた（`DFC-1335` の割り付けは `PND-634` のまま裁定待ち）。
> 読んだ木: `refactor` `bfbe7eb7`（枝 `l4-review-crs`）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-622` だけを受けた。⚠️ 仕様の新しい識別子は仮である —— 表 T-256 の `HC-<新1>`、表 T-206 の `S-<新1>`・`S-<新2>`。番号は、当てる回が当てる日に木を測って取る（規則 02 の 2.5。2 節）。`S-<新4>`（リポジトリの所）は `CR-628` の行であり、本書は立てない。
> ⛔ 当てる順: `CR-621`（ウインドウの決まり・横のスクロール）→ `CR-628` の E-05（`S-<新4>` の行。`CR-627` の後）→ **本書** → `CR-630`。E-03 は `CR-621` の E-14 が書く段落を「上の段落」として引くので、`CR-621` の後でなければ文が偽になる。E-05 は `CR-628` の `S-<新4>` を引くので、その行が先に要る（4.1 節）。
> 閉じるもの: `DFC-1335` の割り付けの半分（群・枠・段の数・1 画面。窓の半分は `CR-621`）—— 11 節の問い 1〜3 の答えを待つ（`PND-634`）・`DFC-1365`（割当の右寄せ。仕様の側の食い違いとコードの回帰の両方）・`DFC-1351`（`JDG-940` の案 2）。
> 本書: `change-request/CR-622-help-groups-in-frames-and-the-licence-is-two-lines.md`。
> 触れる見本: `previous-project-result/32-help-layout/index.html`（本書の起草の前に、実物の名簿 `help-roster.json` と辞書から作られたもの。本書は書き換えていない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-865` | 「#16 ヘルプのショートカットキーは右詰めに直せ。 前回間隔を調整した際左詰めに変わってしまった。<br><br>基本操作、ヘッダー、行、コマンドパレットなどが混在している。<br>適切にグルーピングして、すべて収まるようにレイアウトして、各グループを枠で囲え<br>枠は長方形でなくてもよい。 現在3段組みだが4段組にしてもよい。<br>背景に対する左右のマージンを削ってホバーを拡げてもよい。極力1画面に収めろ。<br>…<br>先ずはサンプルの.htmlを出せ」 | 本書の骨格。右寄せ（E-04・E-09・E-12）、塊の割り付けと枠（E-01・E-02・E-07・E-08）、段の幅（E-03）、割合（E-06）。「ヘルプホバーは移動可能かつ…スクロールバーを出せ」の窓の半分は `CR-621`。見本の html は在る（ヘッダーの最後の行） |
| `JDG-155` | 「ヘルプが横方向にスクロールするようになっていた。<br>3段組みのまま縦方向にスクロールするようにしろ。<br>分類と順序は任せる。…」 | ⚠️ 「3段組みのまま」を覆す（`JDG-865` が後の裁定で「4段組にしてもよい」）。「分類と順序は任せる」は前に立つ者に任された割り付けであり、本書が選び直す。横のスクロールの部分は `CR-621` が覆す |
| `JDG-652` | 「ヘルプの説明とショートカットキーの隙間が無駄に広くて見にくい。 最適化しろ。」 | 変えない —— 隙間を詰める指示は生きている。⚠️ `CR-574` がこれを「割当を説明の直後へ寄せる」と読んだ（同書の決定 8）読みは、`JDG-865` の「右詰めに直せ。前回間隔を調整した際左詰めに変わってしまった」で覆る。本書は段を狭め（4 段）、`S-436` を間隔の下限にして隙間を詰める |
| `JDG-651` | 「ヘルプの内容がヘルプのヘッダー部にかぶさって見えない。 ヘッダー部分と本文を分けろ …」 | 変えない。題の行と本文の領域は `CR-574` の形のまま。本書が書くのは本文の領域の中だけ |
| `JDG-881` | 「#32 ヘルプで<br>アパッチライセンス表示が長い。 著作権表示とアパッチ2であることだけを書いて、<br>アパッチの本文はGoodRelaxのGitHubのライセンスにリンクを張ればいいだろ？<br><br>ヘルプでCopyright部分を押下しても GitHubにジャンプしない<br>Copyright部分を押下したら<br>https://github.com/GoodRelax/gr-scheduler<br>にジャンプさせろ」 | 2 行の表示と、Copyright を押した先（E-05）。全文をリンクで代える部分は `JDG-940` が案 2 で決め直した |
| `JDG-920` | 「#32 案1にしたいんだが、念のため、アパッチが何と推奨しているのか確認するセッションを開く提案チップを出せ。」 | 案 1 への傾き。確かめた後に決めると言った —— 決めたのは `JDG-940` |
| `JDG-940` | 「案 2 とせよ。」 | ⭐ **本書は案 2 に従う** —— `JDG-940`（2026-10-01）は `JDG-920`（2026-09-30）の後の裁定であり、`JDG-920` の傾き（案 1）を確かめた上で決め直した。表示は 2 行、全文は畳んで `.html` に残す。`FR-069` は所見 `docs/review/apache-license-notice-2026-09-30.md` §5 (b) の旧 → 新で書き換える（E-05） |
| `JDG-873` | 「#24 ヘッダーのアイコンの並び順を以下のように変えろ …」 | 変えない —— `CR-627` の持ち物。ヘルプの `App Header` の塊の中の順は、表 T-109 の行の順から生成が書く（継ぎ目、5 節） |
| `JDG-882` | 「#33 ヘッダー部分のタイトルの左に GRS とロゴを入れろ ロゴをクリックすると<br>https://github.com/GoodRelax/gr-scheduler<br>にジャンプさせろ。…」 | 変えない —— `CR-628` の持ち物。同じ URL を `CR-628` の `S-<新4>` の 1 行で共有する（E-05、4.1 節） |

⭐ `DFC-14` の前の裁定「Apache 2.0 である旨を書き、詳細は GitHub へリンク」（`docs/development-records/fixed-defects.md` の `DFC-14`）は、案 2 の後も真である —— Copyright の行がリポジトリへのリンクになる。全文は畳んで中に残る。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— ヘルプは「どこにどの入口が在り、どのキーが同じことをするかを 1 画面で見渡す道」（`FR-036` の RATIONALE）である。今は左の段に 5 つの塊（入口を持たない割当・ブラウザの機能・`Row Title Panel`・`Resource Roster`・`Search Panel`）が線だけで続き、見出しを持つのは前の 2 つだけなので、どこからが別の面の入口か読めない（利用者の言う「混在」）。1 つの段に 1 種類の塊を置き、塊を枠で囲めば、境目が見て分かる。段が 4 つになると最も高い段が低くなり、1 画面に収まる画面が増える（13 節の実測: 3 段は 1920 × 1080 だけ、4 段は 1366 × 768 まで本文の全部が収まる）。割当を右へ寄せると、キーを探す目は枠の右の縁をたどれば足りる。

⭐ **`CH-5` ／ `GL-005`**（1 つのファイルだけで動く） —— ライセンスの全文は `.html` の中に畳んで残すので、受け取った人がファイルを渡すだけで Apache License 2.0 第 4 条 (a) を満たせる（`FR-069` の新しい RATIONALE）。表示は 2 行に縮み、一覧と同じ本文の領域を取らない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— ① `FR-036` の「⛔ 割当を段の右端へ寄せてはならない（MUST NOT）」（`docs/spec/01-04-requirements.md:7586`）は、利用者の裁定 `JDG-865`「右詰めに直せ」と食い違う。裁かれた行が勝つ（規則 02 の 1）⇒ 文を書き換える（E-04）。`DFC-1365` は「仕様は鍵の位置を言わない」と書いたが、言っていた —— 仕様の側の直しである。② `FR-069` の STATEMENT「ヘルプから読めるようにすること」は、全文を常に読める形で出すとも読め、`JDG-940` の「2 行だけを見せる」と食い違いうる ⇒ 所見 §5 (b) の新しい STATEMENT へ（E-05）。③ リポジトリの URL を語やコードに書くと、`CR-628` のロゴのリンクと 2 か所に載る ⇒ `CR-628` の `S-<新4>` の 1 行を読む（E-05、4.1 節）。
- **`R1.4`（境界・空の場合）** —— ① `CR-621` の E-14 は「狭めて段の並びが入り切らないときは横にもスクロールする」と言うが、段がどこで縮むのをやめるかを言わない。下限が無いと段は字 1 つの幅まで縮み、横のスクロールは起こらない ⇒ 段の幅の下限 `S-<新2>`（E-03・E-08）。② 下限より狭い画面で開いたときは、`CR-621` の「開いたときは横にスクロールさせない（MUST）」と下限がぶつかる ⇒ 開いたときの段の幅が下限より狭ければ、その幅を下限とする（E-03）。③ 割当が説明の後ろに入り切らないとき（E-04 の 3 行目）。
- **`R1.2`・`R2.7`（曖昧さを除く・マジックナンバー）** —— 枠の内側とまわりの空きは仕様に無く、今のコードは段の間を `column-gap:1.5em`（`src/framework/dom-screen-surface/open-modals-drawing.ts:44`）、ライセンスの罫を `1px solid currentColor`・上の空きを `0.75em`（`src/framework/dom-screen-surface/dom-screen-surface.ts:356`）で持つ ⇒ 1 つの行 `S-<新1>` を 4 か所に当て（`S-143` と同じ考え）、罫は `S-437`・`S-149` を読む（E-02・E-05・E-08・E-10）。
- **`R1.6`（否定要求は代わりを示す）** —— 消える MUST NOT「割当を段の右端へ寄せてはならない」の代わりに、右へ寄せる MUST と下限の MUST を置く（E-04）。足す MUST NOT（頁を移さない・参照元を渡さない・全文を開いて出さない）には、それぞれ何をするか（新しいタブで開く・畳んで置く）を並べる（E-05）。
- **`R2.14`（POLA）** —— Copyright の行は今 `<details>` の `<summary>` で（`open-modals-drawing.ts:521`〜`:522`）、押すと全文が開く。利用者は押せばリポジトリへ行くと思って押した（`JDG-881`）。⇒ 著作権表示はリンクにし、全文を開く入口は別の行（「ライセンス全文」）にする（E-05・E-11）。リンクの開き方は `FR-073` の案内のリンクと `CR-628` の `BR-4` に揃える。
- **`R2.9`（YAGNI）** —— 「Apache License 2.0」を Apache の頁へのリンクにすると URL の行がもう 1 つ要る。利用者が押した先を求めたのは Copyright だけであり、全文は 1 行下に畳んで在る ⇒ リンクにしない（11 節の問い 4 の推奨）。枠の見出しの語も足さない（問い 3 の推奨）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **新しい段の行は `HC-<新1>` とし、表 T-256 の 3 行目（`HC-2` と `HC-3` のあいだ）に置く。** `HC-3` は `Command Palette` の段のまま | 行 ID の意味を変えない（1 つの接頭辞に 1 つの意味、ID を使い回さない）。`HC-3` を小さな面の段に付け替えると、`help-roster.json` の `column` と試験の `HC-3` が別の段を指すようになる | 段の並びが行 ID の番号の順にならない —— E-01 が「行 ID の番号の順ではない」と書く |
| 決定 2 | **小さな面の段の中は `Row Title Panel` → `Search Panel` → `Resource Roster`**（見本の並び） | 常に画面に在る面を上に、開く入口が左の段（`App Header` の `IC-117`）に在る面を次に、右の段（`Command Palette` の `IC-62`）に在る面を末に置く。今の `Row Title Panel` → `Resource Roster` → `Search Panel` は 1 つの段に 5 つを積むための並びで、種類を分けた後は理由が無い | 3 つの塊の位置が今と入れ替わる |
| 決定 3 | **枠の線は `S-437` の太さ・`S-149` の色。** `S-437` の値の語を「ヘルプの罫の太さ」へ広げ、題の行の境・塊の枠・ライセンスの上の罫の 3 つに当てる（E-10） | 規則 02 の 2.5「同じ意味の行が既に無いか」。ヘルプの中の罫はどれも同じ太さで描いてきた（題の行の境と、塊の境の線）。`S-143`（パレットの群の線）は `FR-053` の値で、`Command Palette` の塊の中の群の線にだけ残す | 3 つのうち 1 つの太さだけを変えたくなった日は、行を分ける |
| 決定 4 | **空きは 1 つの行 `S-<新1>`（`0.5` em 🔎）を、枠の内側・枠と枠のあいだ・段と段のあいだ・本文の領域の縁と枠のあいだの 4 か所に当てる**（E-02・E-08） | `S-143` の注「2 つ目の数は上下左右のすべてに当たる…新しい数を 1 つも起こさない」と同じ考え。値は見本の初期値（`--frame-space: 0.5em`） | 4 か所のどれか 1 つだけを詰められない |
| 決定 5 | **段の幅は本文の領域を段の数で等しく分け、下限を `S-<新2>`（`18` em 🔎）とする。開いたときの段の幅がそれより狭ければ、開いたときの幅が下限**（E-03・E-08） | `CR-621` の E-14（狭めたときだけ横にスクロール、開いたときは横にスクロールさせない）を満たす最も単純な形（② の `R1.4`）。値は見本の初期値（`--col-min: 18em`）。13 節の実測では、1280 × 720 の既定の大きさで段の幅は 305px（字 12.8px の約 23.8 em）で、下限は当たらない | 下限より狭い画面では、開いた直後に少しでも狭めると横のスクロールが出る |
| 決定 6 | **割当は「その項目の行の右端（枠の内側の右の縁）」へ寄せ、`S-436` を間隔の下限にし、入り切らなければ次の行の右端へ送る**（E-04・E-09・E-12） | `JDG-865` の「右詰め」。依頼文の 3 点（右寄せ・`S-436` は下限・入らなければ次の行へ右寄せ）。代償の文は正直に書き直す —— 短い説明ほど間隔が長い | 見本（`previous-project-result/32-help-layout/index.html`）は、次の行へ送った割当を左に置く（CSS 1 行の違い。13 節）—— 本書の文が正 |
| 決定 7 | **`App Header` の塊は 1 つの枠のまま、`CR-627` の 7 つの群で枠や線に分けない** | 利用者は「ヘッダー」を 1 つのグループとして挙げた（`JDG-865`）。`App Header` の群の境は画面でも線を引かない（`FR-053` の線は `Command Palette` の群だけ。`CR-627` の決定 2 の代償の欄） | 34 項目の塊が 1 つの枠に続く |
| 決定 8 | **ライセンスの 2 行は、本文の領域の段の下に置き、段とのあいだに `S-437`・`S-149` の罫を引く**（E-05） | 今のコードの置き場（`open-modals-drawing.ts:530`、段の後ろ）と同じ。罫の値は決定 3 の行を読み、`1px solid currentColor` の直書きを消す | 無い |
| 決定 9 | **ライセンスの名の行と「ライセンス全文」の語は、辞書の新しい区 `helpLegal` に置く**（E-11）。語は所見 §5 (a) の表の行 2・行 3 のまま（`Apache License 2.0 で提供しています。` ／ `Licensed under the Apache License 2.0.`、`ライセンス全文` ／ `Full license text`） | 辞書の原稿は「語は利用者が書く」と言う（`docs/spec/_source/display-words.json` の `$comment`）。この 2 つは、利用者が `JDG-940` で選んだ案 2 の所見が示した語である。区の形は `searchPanel` と同じ（鍵は `part`、語は `text`） | 生成器に区を 1 つ足す（9 節） |
| 決定 10 | **著作権表示は訳さず、どの言語でも原文の綴り**（E-05） | 所見 §5 (a)「著作権の行は ja でも英字のまま（法の告知の決まり文句を訳さない）」。綴りは `NOTICE` から `tools/generate_licence.py` が運ぶ（`src/adapter/screen-renderer/licence.json` の `copyrightNotice`） | 無い |
| 決定 11 | **1 画面の段落（`FR-036` の「基準環境では 1 画面に収め…」）は書き換えない** | 基準環境（`MC-6`、1920 × 1080）では今も収まる。「極力1画面に収めろ」は割り付け（4 段）と `S-201` で応える。収まる画面の下限を MUST にすると、書体と字の大きさで変わる数を要求に持つことになる | 1366 × 768 で収まることは仕様に書かれない（13 節の実測にだけ在る） |
| 決定 12 | **E-01 の旧の「⚠️ 塊の割り付けは、段ごとの項目の数がおよそ揃うように…」と `S-202` の注の数（89 項目・1538px・808px）を消す** | 割り付けの理由が「数を揃える」から「種類を分ける」に替わる。注の数は 1 段に積んだときの話で、方法（出荷ビルドの行送り）がもう当たらない（数は方法と一緒でなければ書かない） | 無い |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 塊を種類ごとの 4 段へ | `docs/spec/01-04-requirements.md` の 表 T-256 と直後の 2 行（`FR-036`） | E-01（問い 1 の推奨） | その 5 行 |
| 塊を枠で囲む | 同 `FR-036` の「塊の境目と…線で示す」の 2 行 | E-02 | その 2 行 |
| 段の幅と下限 | 同 `FR-036` の「段の高さを…縛ってはならない」の後ろ | E-03 | 足した 2 行 |
| 割当を右へ寄せる | 同 `FR-036` の割当の置き場の 4 行 | E-04 | その 4 行 |
| ライセンスは 2 行 | 同 `FR-069` の STATEMENT と RATIONALE と、足す段落 | E-05（問い 4 の推奨） | その段落 |
| ヘルプの割合 | `docs/spec/_source/settings.json` の `S-201` の既定 | E-06（問い 2 の推奨） | 既定の 1 項 |
| 段の数 | 同 `S-202` の既定と注 | E-07（問い 1 の推奨） | 既定と注 |
| 枠の空き・段の幅の下限 | 同 `S-203` の後ろに 2 行 | E-08 | その 2 行 |
| 間隔は下限 | 同 `S-436` の語と注 | E-09・E-12 | その語と注の 1 文 |
| 罫の太さを広げる | 同 `S-437` の語 | E-10 | その 1 項 |
| 2 行の語 | `docs/spec/_source/display-words.json` の新しい区 `helpLegal` | E-11 | その区 |

⭐ 生成物 `docs/spec/_assets/tbl-settings.md`（表 T-206）・`src/adapter/screen-renderer/display-words.json`・`src/adapter/screen-renderer/help-roster.json`・`src/framework/dom-screen-surface/dom-screen-surface.ts` の生成区画 `NOT_STORED_HELP_SIZES` は、`npm run gen` だけが書く。⛔ 手で書かない。

## 2. 新しい識別子

| 識別子（仮） | 何か | 置き場 | 編集 |
|---|---|---|---|
| `HC-<新1>` | ヘルプの左から 3 つ目の段（小さな面の段） | `FR-036` の 表 T-256 の 3 行目 | E-01 |
| `S-<新1>` | ヘルプの塊の枠の内側の空きと、枠のまわりの空き（em） | 表 T-206（`S-203` の次） | E-08 |
| `S-<新2>` | ヘルプの段の幅の下限（em） | 表 T-206（`S-<新1>` の次） | E-08 |

⚠️ 3 つとも仮の綴りである。⛔ 番号は、当てる回の仕様の体が、当てる日に木を測って振る（規則 02 の 2.5）。`HC` は既に登録された接頭辞（表 T-256 だけの順序）であり、新しい接頭辞は要らない。⚠️ 仮番のままでは `tools/generate_help_roster.py` も `settings.schema.json` も読めない —— 振ってから `npm run gen` を走らせる。
⭐ `S-<新3>` は本書では使わない（`CR-628` の仮番と取り違えないため、`CR-628` の綴りに合わせて欠番にした）。`S-<新4>` は `CR-628` が立てる「本ソフトウェアのリポジトリの URL」の行の仮の綴りで、本書は E-05 で読むだけである（4.1 節）。
表・図・要求・接頭辞・状態機械は 1 つも足さない。辞書には区 `helpLegal`（2 つの `part`）を足す —— 識別子の表に載る名ではない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 表 T-256 の 3 行（左の段に 5 つの塊、中・右の段） | `docs/spec/01-04-requirements.md:7511`〜`:7513` | 4 行（1 つの段に 1 種類） | E-01 |
| 「⚠️ 塊の割り付けは、段ごとの項目の数がおよそ揃うように選んだもの…」 | 同 `:7516` | 「1 つの段に置く塊の種類を 1 つに絞るように選んだもの」と小さな面の段の中の順 | E-01 |
| 「塊の境目と、`Command Palette` の塊の中の群の境目は、線で示すこと（MUST）」の「塊の境目と、」 | 同 `:7520` | 塊を枠で囲む MUST と枠の値の MUST。群の境目の線は残る | E-02 |
| 「⭐ 割当は説明の直後に、…`S-436` の間隔をあけて置くこと（MUST）」 | 同 `:7585` | 割当は行の右端へ寄せる（MUST）＋ `S-436` は下限（MUST） | E-04 |
| 「⛔ 割当を段の右端へ寄せてはならない（MUST NOT）…」 | 同 `:7586` | （消える。`JDG-865`） | E-04 |
| 「⭐ 割当が説明の後ろに入り切らないときは、次の行へ送り、説明の頭にそろえること（MUST）」 | 同 `:7587` | 次の行へ送り、その行の右端へ寄せる（MUST） | E-04 |
| 「⚠️ 代償: 割当は縦の 1 本の列にそろわない…」 | 同 `:7588` | 代償: 短い説明ほど空きが長い | E-04 |
| `FR-069` の STATEMENT「…中に持ち、ヘルプから読めるようにすること。」 | 同 `:7118` | 所見 §5 (b) の新しい STATEMENT | E-05 |
| `FR-069` の RATIONALE の 1 行目「完全にオフラインで動く単一ファイルなので、リンクでは頒布の義務を満たせない。」 | 同 `:7122` | 所見 §5 (b) の新しい 1 行目 | E-05 |
| `S-201` の既定 `0.95` | `docs/spec/_source/settings.json:3507` | `0.98` | E-06 |
| `S-202` の既定 `3` と注の「3 段に割り付ける…89 項目…1538px…808px」 | 同 `:3520`・`:3523` | `4` と、種類で分ける注 | E-07 |
| `S-436` の語（下限であることを言わない）と、注に右寄せの後の 1 文が無いこと | 同 `:4907`・`:4915` | 語の末に「の下限」、注に 1 文 | E-09・E-12 |
| `S-437` の語「ヘルプの題の行と本文を隔てる罫の太さ」 | 同 `:4921` | 「ヘルプの罫の太さ」（3 か所） | E-10 |
| 生成された表 T-206・名簿・辞書・定数 | 1 節の生成物 | `npm run gen` | ― |
| コードの左寄せ・線の境目・`<summary>` の Copyright・直書きの空きと罫 | `src/framework/dom-screen-surface/dom-screen-surface.ts:349`・`:353`・`:356`、`open-modals-drawing.ts:44`・`:162`・`:299`〜`:301`・`:519`〜`:531` | 9 節 | 実装する者 |
| 試験の逐語と 3 段の前提 | `tests/system/cr-574-help-window.test.ts:18`・`:622`〜`:633`、`tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts:147`〜`:158` | 9 節 | 実装する者・試験の体 |

⭐ **消さないもの**（読み直して真のまま）: `FR-036` の「入口を持たない割当は 1 つの塊に、表 T-255 の行はもう 1 つの塊にまとめ、この 2 つの塊にだけ見出しを刷ること（MUST）」（問い 3 の推奨 A。`tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts:39` が逐語で引く）・「塊の中は画面に並んでいる順とすること（MUST）」・「⛔ 塊を段の途中で切ってはならない（MUST NOT）」・`S-202` の数と 表 T-256 の行の数を一致させる MUST・1 画面の段落（決定 11）・`FR-053` の「⛔ ヘルプ（`FR-036`）も群の境目を線で示し、群の名を刷らない。」（`:4849`。群の線は `Command Palette` の塊の中に残る）。

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える）。E-03 は `CR-621` を当てた後の木に当てる —— 旧の 1 行は `CR-621` の E-14 の外にあり、`CR-621` の後も 1 回だけ現れる（4.1 節）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
問い 1 の推奨で書いた。⚠️ 旧は `refactor` `7a5b387b`（`CR-605` が着地し、`HC-1` の末に `Calendar Editor` が加わった木）に合わせて、調整役が `git diff bfbe7eb7 7a5b387b` の `HC-1` の行から切り直した（2026-10-01）。読んだ木 `bfbe7eb7` では 0 回になる。⛔ 当てる体は `7a5b387b` 以降の木で 1 回を数え直すこと。旧
```text
| HC-1 | 左の段 | 入口を持たない割当 → 表 T-255 のブラウザの機能 → `Row Title Panel` → `Resource Roster` → `Search Panel` → `Calendar Editor` |
| HC-2 | 中の段 | `App Header` |
| HC-3 | 右の段 | `Command Palette` |

⭐ 段は本表の行の順に左から並べること（MUST）。  
⚠️ 塊の割り付けは、段ごとの項目の数がおよそ揃うように選んだものであり、キーだけの操作と、行見出しパネルと名簿という小さな面の入口を 1 つの段に集めている。  
```
新
```text
| HC-1 | 左端の段 | 入口を持たない割当 → 表 T-255 のブラウザの機能 |
| HC-2 | 左から 2 つ目の段 | `App Header` |
| HC-<新1> | 左から 3 つ目の段 | `Row Title Panel` → `Search Panel` → `Resource Roster` → `Calendar Editor` |
| HC-3 | 右端の段 | `Command Palette` |

⭐ 段は本表の行の順に左から並べること（MUST） —— 行 ID の番号の順ではない（`HC-<新1>` は後から足した段である）。  
⚠️ 塊の割り付けは、1 つの段に置く塊の種類を 1 つに絞るように選んだものである —— キーだけの操作（入口を持たない割当とブラウザの機能）・`App Header`・画面の中の小さな面・`Command Palette` の 4 つであり、種類の違う塊を 1 つの段に積むと、どこからが別の面の入口かが読みにくい。  
⚠️ 小さな面の段の中は、常に画面に在る `Row Title Panel`、`App Header` の入口（`IC-117`）が開く `Search Panel`、`Command Palette` の入口（`IC-62`）が開く `Resource Roster`、同じく `IC-132` が開く `Calendar Editor` の順である —— 開く入口が左の段に在る面ほど上に置く。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
塊の境目と、`Command Palette` の塊の中の群の境目は、線で示すこと（MUST）。  
⛔ 群の名を刷ってはならない（MUST NOT） —— 規則と理由は 表 T-109 の前文と `FR-053` が持つ。  
```
新
```text
⭐ 塊を 1 つずつ枠で囲むこと（MUST） —— 利用者が、塊を分けて枠で囲むよう定めた。  
どこからどこまでが 1 つの面（または、キーだけの操作）の入口かを、線の切れ目ではなく囲みで示す。  
枠の内側の空きと、枠のまわりの空き（枠と枠・段と段・本文の領域の縁と枠のあいだ）は、どれも `_assets/tbl-settings.md` の 表 T-206 の `S-<新1>` とし、枠の線は 表 T-236 の `S-149` の色、表 T-206 の `S-437` の太さとすること（MUST）。  
⚠️ 塊は段の途中で切らない（下の段落）ので、枠はどれも 1 つの段の中の長方形になる —— 利用者は長方形でない枠も許したが、要る塊が無い。  
`Command Palette` の塊の中の群の境目は、線で示すこと（MUST）。  
⛔ 群の名を刷ってはならない（MUST NOT） —— 規則と理由は 表 T-109 の前文と `FR-053` が持つ。  
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
`CR-621` の後に当てる（「上の段落」は `CR-621` の E-14 が書く段落である）。問い 1 の推奨で書いた（下限の値）。旧
```text
⛔ 段の高さを本文の領域の高さで縛ってはならない（MUST NOT） —— 縛ると、入り切らない塊が箱の右に足された段へ送られ、箱が横に伸びる。  
```
新
```text
⛔ 段の高さを本文の領域の高さで縛ってはならない（MUST NOT） —— 縛ると、入り切らない塊が箱の右に足された段へ送られ、箱が横に伸びる。  
⭐ 段の幅は、本文の領域の幅を段の数で等しく分けた幅とし、`_assets/tbl-settings.md` の 表 T-206 の `S-<新2>` より狭めないこと（MUST） —— それより狭めたときは、本文の領域を横にもスクロールさせる（上の段落）。  
⭐ 開いたとき（表 T-335 の `WB-1` の既定の大きさ）の段の幅が `S-<新2>` より狭い画面では、その開いたときの段の幅を下限とすること（MUST） —— 開いたときは横にスクロールさせない（上の段落）ためである。  
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ 割当は説明の直後に、`_assets/tbl-settings.md` の 表 T-206 の `S-436` の間隔をあけて置くこと（MUST）。  
⛔ 割当を段の右端へ寄せてはならない（MUST NOT） —— 寄せると、短い説明ほど割当までの空きが段の幅の大半になり、目が項目を見失う。  
⭐ 割当が説明の後ろに入り切らないときは、次の行へ送り、説明の頭にそろえること（MUST）。  
⚠️ 代償: 割当は縦の 1 本の列にそろわない —— 割当を持つ項目は一部であり、そろえた列はほとんど空く。
```
新
```text
⭐ 割当は、その項目の行の右端（枠の内側の右の縁）へ寄せて置くこと（MUST） —— 利用者が右詰めと定めた。  
割当を持つ項目の割当が、枠ごとに縦の 1 本の右の縁にそろい、キーを探す目はその縁をたどれば足りる。  
⭐ 説明と割当のあいだは、`_assets/tbl-settings.md` の 表 T-206 の `S-436` を下限としてあけること（MUST）。  
⭐ 説明の後ろに `S-436` をあけて割当が入り切らないときは、割当を次の行へ送り、その行の右端へ寄せること（MUST）。  
⚠️ 代償: 短い説明ほど、説明の終わりから割当までの空きが長くなり、目が項目を横にたどりにくい —— 段の幅が狭いほど、その空きは短い。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`JDG-940` の案 2。STATEMENT と RATIONALE の 1 行目・足す 1 行は、所見 `docs/review/apache-license-notice-2026-09-30.md` §5 (b) の「新（案 2）」の欄の逐語である。問い 4 の推奨で書いた（ライセンスの名はリンクにしない）。旧
```text
**STATEMENT**: `GRS` は、**本体のライセンス全文・著作権表示・第三者ライブラリの帰属表示**を成果物の `.html` の中に持ち、ヘルプから読めるようにすること。

**ORIGIN**: `GL-005`（1 つのファイルだけで動く）

**RATIONALE**: **完全にオフラインで動く単一ファイルなので、リンクでは頒布の義務を満たせない。**  
外部へ取りに行けない以上、全文が中に無ければ利用者は読めない。  
**実装後に足すことができない性質のもの**であり、依存ライブラリを選ぶ前に決めておく必要がある。
```
新
```text
**STATEMENT**: `GRS` は、**本体のライセンス全文・著作権表示・第三者ライブラリの帰属表示**を成果物の `.html` の中に持つこと。ヘルプは著作権表示とライセンスの名だけを常に見せ、著作権表示は本ソフトウェアのリポジトリへのリンクとし、全文と帰属表示は畳んで読めるようにすること。

**ORIGIN**: `GL-005`（1 つのファイルだけで動く）

**RATIONALE**: **単一ファイルが配布物の全部なので、全文を中に持つ。** 受け取った人がそのまま渡せば、Apache License 2.0 第 4 条 (a)（許諾書の写しを渡す）が満たせる。ASF はリンクで代えてよいとは言わない（`docs/review/apache-license-notice-2026-09-30.md`）。  
外部へ取りに行けない以上、全文が中に無ければ利用者は読めない。  
**実装後に足すことができない性質のもの**であり、依存ライブラリを選ぶ前に決めておく必要がある。  
見た目の長さは畳んで解く。

⭐ ヘルプは、本文の領域の段の下に、著作権表示の 1 行と、ライセンスの名を言う 1 行の 2 行を常に見せ、その下に全文と帰属表示を畳んで置くこと（MUST） —— 利用者が、著作権表示と Apache License 2.0 であることだけを見せ、全文は畳んで残すと定めた。  
2 行と段のあいだには、`_assets/tbl-settings.md` の 表 T-236 の `S-149` の色で、表 T-206 の `S-437` の太さの罫を引くこと（MUST）。  
⭐ 著作権表示は、ヘルプの言語によらず原文の綴りのまま出すこと（MUST） —— 法の告知の決まり文句であり、訳さない。  
ライセンスの名の行の語と、畳んだ全文を開く入口の語は、`FR-038` の辞書が持つこと（MUST）。  
⭐ 著作権表示を押したら、閲覧環境の新しいタブで、同書の 表 T-206 の `S-<新4>`（本ソフトウェアのリポジトリの所）の頁を開くこと（MUST） —— 利用者が、Copyright を押せばリポジトリへ移るよう定めた。  
⛔ `GRS` を開いている頁そのものを移してはならない（MUST NOT） —— 未保存の編集（`FR-100`）を持つ頁を離れることになる。  
⛔ 開いた頁へ、この頁への参照と参照元を渡してはならない（MUST NOT） —— `FR-073` の案内のリンクと同じ理由である。  
⚠️ 押して頁を開くのは閲覧環境であり、表 T-003 の `CN-6` の通信に当たらない（同行）。  
⛔ 全文と帰属表示を、ヘルプを開いたときに開いた形で出してはならない（MUST NOT） —— 全文は一覧と同じ本文の領域に在り、開いて出すと一覧が 1 画面に収まらない。  
```

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json -->
問い 2 の推奨で書いた。旧
```text
      "ja": "ヘルプが画面に占める割合（`FR-036`）"
     },
     "default": {
      "num": "0.95",
```
新
```text
      "ja": "ヘルプが画面に占める割合（`FR-036`）"
     },
     "default": {
      "num": "0.98",
```

<!-- EDIT id=E-07 file=docs/spec/_source/settings.json -->
問い 1 の推奨で書いた。旧
```text
      "ja": "ヘルプの段の数（`FR-036`）"
     },
     "default": {
      "num": "3"
     },
     "note": {
      "ja": "同上。⭐ **`FR-036` が名指す項目を 3 段に割り付けるための値である**。⛔ `FR-036` は「基準環境では 1 画面に収め、スクロールを要さないこと」と定めており、段の数はそれを満たすための割り付けである —— 89 項目を 1 段に積むと約 1538px（出荷ビルドの行送り 17.28px × 89）になり、基準環境の段の高さ 808px（出荷ビルド、1920 × 1080）に入らない。⚠️ **これより低い画面ではスクロールを許す** （同要求）。⭐ どの塊をどの段に置くかは `FR-036` の 表 T-256 が持ち、本行は段の数だけを持つ —— 同表の行の数は本行と一致する（同要求）"
```
新
```text
      "ja": "ヘルプの段の数（`FR-036`）"
     },
     "default": {
      "num": "4"
     },
     "note": {
      "ja": "同上。⭐ **`FR-036` が名指す項目を 4 段に割り付けるための値である** —— 1 つの段に 1 種類の塊を置く（`FR-036` の 表 T-256）。⛔ `FR-036` は「基準環境では 1 画面に収め、スクロールを要さないこと」と定めており、段の数はそれを満たすための割り付けである —— 3 段のときは左の段に 5 つの塊を積み、その段だけが高かった。⚠️ **これより低い画面ではスクロールを許す** （同要求）。⭐ どの塊をどの段に置くかは `FR-036` の 表 T-256 が持ち、本行は段の数だけを持つ —— 同表の行の数は本行と一致する（同要求）"
```

<!-- EDIT id=E-08 file=docs/spec/_source/settings.json -->
`S-203` の後ろ、`S-204` の前に 2 行を足す。問い 1 の推奨で書いた（値は見本の初期値）。旧
```text
      "ja": "⭐ **ヘルプの字をアイコンの大きさに合わせるための係数である**。⛔ **px で持たない理由は `FR-036` が持つ。** ⚠️ 掛ける相手は宿主の地の文字であり、`fontScaleSizes`（表 T-215）ではない —— ヘルプは日程の絵ではなく、その周りの枠である（`S-197` と同じ立場）"
     }
    },
    {
     "id": "S-204",
```
新
```text
      "ja": "⭐ **ヘルプの字をアイコンの大きさに合わせるための係数である**。⛔ **px で持たない理由は `FR-036` が持つ。** ⚠️ 掛ける相手は宿主の地の文字であり、`fontScaleSizes`（表 T-215）ではない —— ヘルプは日程の絵ではなく、その周りの枠である（`S-197` と同じ立場）"
     }
    },
    {
     "id": "S-<新1>",
     "value": {
      "ja": "ヘルプの塊の枠の内側の空きと、枠のまわりの空き（`FR-036`、字の大きさに対する倍率）"
     },
     "default": {
      "num": "0.5",
      "suffix": " em",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上。⭐ **1 つの値を、枠の内側・枠と枠のあいだ・段と段のあいだ・本文の領域の縁と枠のあいだの 4 か所に当てる** —— 新しい数を 1 つも起こさない（`S-143` と同じ考え）。⭐ **px ではなく倍率である** —— 理由は `S-203` と同じ（`FR-036`）。⛔ **測って決めた値ではない** （🔎）—— 触れる見本で選び直す"
     }
    },
    {
     "id": "S-<新2>",
     "value": {
      "ja": "ヘルプの段の幅の下限（`FR-036`、字の大きさに対する倍率）"
     },
     "default": {
      "num": "18",
      "suffix": " em",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上。⭐ 利用者がヘルプを狭めたとき、段はこの幅で縮むのをやめ、それより狭めると本文の領域が横にもスクロールする（`FR-036`）—— 段の数も塊の置き場も変えない。⭐ 開いたときの段の幅がこれより狭い画面では、開いたときの段の幅が下限になる（同要求）—— 開いたときに横にスクロールさせないためである。⭐ **px ではなく倍率である** —— 理由は `S-203` と同じ。⛔ **測って決めた値ではない** （🔎）—— 触れる見本で選び直す"
     }
    },
    {
     "id": "S-204",
```

<!-- EDIT id=E-09 file=docs/spec/_source/settings.json -->
`S-436` の語。旧
```text
     "id": "S-436",
     "value": {
      "ja": "ヘルプの説明と割当のあいだの空き（`FR-036`、字の大きさに対する倍率）"
```
新
```text
     "id": "S-436",
     "value": {
      "ja": "ヘルプの説明と割当のあいだの空きの下限（`FR-036`、字の大きさに対する倍率）"
```

<!-- EDIT id=E-10 file=docs/spec/_source/settings.json -->
旧
```text
     "id": "S-437",
     "value": {
      "ja": "ヘルプの題の行と本文を隔てる罫の太さ（`FR-036`）"
```
新
```text
     "id": "S-437",
     "value": {
      "ja": "ヘルプの罫の太さ —— 題の行と本文の境・塊の枠・ライセンスの表示の上の罫（`FR-036`・`FR-069`）"
```

<!-- EDIT id=E-11 file=docs/spec/_source/display-words.json -->
区 `helpHeadings` と `helpNotes` のあいだに、区 `helpLegal` を足す。旧
```text
    "ja": "ブラウザの機能（GRS の機能ではない）",
    "en": "Browser functions (not GRS)"
   }
  }
 ],
 "helpNotes": [
```
新
```text
    "ja": "ブラウザの機能（GRS の機能ではない）",
    "en": "Browser functions (not GRS)"
   }
  }
 ],
 "helpLegal": [
  {
   "part": "licensedUnder",
   "text": {
    "ja": "Apache License 2.0 で提供しています。",
    "en": "Licensed under the Apache License 2.0."
   }
  },
  {
   "part": "fullText",
   "text": {
    "ja": "ライセンス全文",
    "en": "Full license text"
   }
  }
 ],
 "helpNotes": [
```

⭐ `helpLegal` の 2 つの `part` は、生成器 `tools/generate_display_words.py` が鍵として持つ（`SEARCH_PANEL_PARTS` と同じ置き方。9 節）。⚠️ 生成器に区を足さずに `npm run gen` を走らせると、知らない区として止まる —— 原稿と生成器を同じ波で着地させる（8 節の波 1、規則 02 の 3.5）。

<!-- EDIT id=E-12 file=docs/spec/_source/settings.json partial -->
`S-436` の `note` の 1 行の中。「⭐ 1 em は…」の前に 1 文を挟む（行の残りは変えない）。旧
```text
⭐ 1 em は全角 1 字ぶんであり、説明の終わりと割当の始まりを別の語と読ませる。
```
新
```text
⭐ **割当は項目の行の右端へ寄せるので、説明と割当の間隔は説明の長さで変わる** —— 本行は、その間隔が狭まってよい下限であり、説明の後ろに本行の間隔をあけて割当が入り切らないときは、割当を次の行へ送る（`FR-036`）。⭐ 1 em は全角 1 字ぶんであり、説明の終わりと割当の始まりを別の語と読ませる。
```

### 4.1 重なり

| 変更要求 | 重なる所 | どちらが先か・誰が数え直すか |
|---|---|---|
| `CR-621`（兄弟。ウインドウの決まり） | `FR-036` の同じ段落の隣: 同書の E-10（「本文の領域だけを縦にスクロール」）・E-11〜E-13（表 T-335・`HN-7`）・E-14（`:7574`〜`:7575` の横のスクロール）。本書の E-03 の旧（`:7576`）は E-14 の旧の直後の行で、E-14 は含まない | `CR-621` が先。本書の E-03 の新は「上の段落」で E-14 の新を引く ⇒ `CR-621` の前に当てると「上の段落」が「⛔ 横にスクロールさせてはならない」を指し、本書の 1 行目と食い違う。本書の側が、`CR-621` の後の木で旧を数え直す（`:7576` の 1 行は同書の後も 1 回の見込み）。⚠️ 継ぎ目: 同書の E-14 の「開いたときは横にスクロールさせない（MUST）」は、本書が段を 4 つにし割合を 0.98 にした後も、下限の決まり（E-03 の 2 行目）で真のまま |
| `CR-628`（兄弟。ロゴ） | 値が重なる: リポジトリの URL。同書の E-05 が 表 T-206 に `S-<新4>`（`S-350` の次）を立てる。本書の E-05 はその行を読む | ⭐ **URL の行は `CR-628` が立てる。本書は立てない**。`CR-628` は `CR-627` の後に当たる。本書の E-05 を当てる時に `S-<新4>` が木に無ければ、当てる体は `CR-628` の E-05（その 1 項だけ）を先に当て、`CR-628` を当てる回はそれを当て済みとして飛ばす —— 行は 1 つだけ立つ（調整役が当てる日に決める）。コードの定数も 1 つ（5 節） |
| `CR-627`（兄弟。ヘッダーの並び） | ヘルプの `App Header` の塊の中の順。同書は 表 T-109 の行を並べ替え、生成器 `tools/generate_help_roster.py` がその順で塊を並べる | 旧は重ならない。どちらが先でもよい。本書は塊の中の順を書かない（決定 7）。同書の群（7 つ）で `App Header` の塊を分けない |
| `CR-619`（起草。最後のフォルダ） | `settings.json` の `S-437` の後ろに 1 行を足す。同書の旧は `S-437` の `note` から `]` まで | 本書の E-10 の旧は `S-437` の `id` から `value` の語まで —— 行は重ならない。どちらが先でもよい |
| `CR-620`（起草。MCP の案内 —— ⛔ 本書の範囲の外。重なりを書くだけ） | `FR-036` の `IC-54` の文（`:7523`）の後ろに本文の末の備考 ※1 を足す（同書の E-04）。辞書の `helpNotes` に `IC-20` の行（J-02）、`browserFunctions` の前に `helpFootnotes`（J-03） | 本書の旧はどれも同書の旧と重ならない（本書の E-02 は `:7520`〜`:7521`、E-11 は `helpHeadings` と `helpNotes` の境）。どちらが先でもよい。⚠️ 両方の後、本文の領域の段の下に 2 つのもの（備考 ※1 と、本書のライセンスの 2 行）が並ぶ —— 本書は順を決めない。今のコードの置き方なら、ライセンスが本文の末に在る |
| `CR-574`（着地済み） | 割当の置き場の 4 行（E-04）は同書の決定 8 が書いた文である | 着地済み。本書が上書きする（`JDG-865`） |
| `CR-610`〜`CR-612` | ヘルプの語に触れるかを引いた: `CR-611` は `IC-98` の割当 `N` がヘルプに出ることを言うだけ（`FR-036` を書かない）。`CR-610`・`CR-612` は 0 件 | 重ならない |
| `CR-623`・`CR-629`・`CR-617`・`CR-615` | `FR-036` を名指すが、読むだけ（`IC-71` の並び・`IC-52` の面の欄・`FR-152`）。`CR-629` は `S-436` の値の形を先例に引くだけ | 重ならない |
| `CR-630`（兄弟。`Esc` の段） | `IN-4` の段。ヘルプの割り付けに触れない | 重ならない。`CR-621` の頭の順（`CR-621` → `CR-622` → `CR-630`）に従う |

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-256 (FR-036) has FOUR rows, left to right in ROW order:
    HC-1      basics (heading) + browser functions (heading)
    HC-2      App Header
    HC-<new1> Row Title Panel -> Search Panel -> Resource Roster
    HC-3      Command Palette
  S-202 = 4 = the number of rows. HC-3 still means the Command Palette
  column. help-roster.json is generated from the table; never write it.
- Every block is ONE frame: border S-437 px in colour S-149 (table T-236),
  padding S-<new1> em; the same S-<new1> em between frames, between
  columns, and between the body region edge and the frames. A block is never
  split across columns, so every frame is a rectangle inside one column.
  Command Palette group borders stay lines (S-143) INSIDE its frame; no group
  names. Headings only on the basics and browser blocks (unchanged).
- Column width = the body region width / column count, equal columns, floor
  S-<new2> em. If the column width at the default size (T-335 WB-1, S-201
  of the browser window) is below S-<new2> em, that default width is the
  floor instead. Narrowed below the floor -> horizontal scroll (CR-621
  E-14); never reflow, never change the column count.
- Assignment (keys / press words) sits at the RIGHT end of its item row (the
  frame's inner right edge). Gap description -> assignment >= S-436 em
  (a minimum, not an exact gap). If it does not fit after the description
  with S-436, the assignment goes to the next line, still right-aligned.
  Fix of the regression from f8b5f2ad: helpText gets flex:1 1 auto back;
  helpKeys gets margin-left:auto so a wrapped key stays on the right.
- Licence (FR-069): below the columns, a rule S-437 px / S-149, then two
  lines always shown:
    line 1  copyrightNotice (licence.json, from NOTICE), NOT translated, an
            <a> to S-<new4> (CR-628's repository URL row; ONE settings row
            and ONE generated constant for the logo and the help) with
            target "_blank" and rel "noopener noreferrer"; never a <summary>
    line 2  display-words helpLegal.licensedUnder in the HELP language; not
            a link
  then a CLOSED <details> whose <summary> is helpLegal.fullText (help
  language) holding licenceText and the attributions. Never open on opening
  the help.
- S-201 = 0.98 (one ratio for width and height, unchanged rule).
- No new command, no new event, no state; nothing is stored.
- NOT in this CR: window move / resize / scrollbars (CR-621), Esc (CR-630),
  header order (CR-627), the repository URL row itself (CR-628), the help
  note *1 for the MCP bundle (CR-620).
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py FR-036 T-256 S-202 S-201 S-436 FR-069 S-437`（依頼の種と `S-437`）:
  - `FR-036` を指す要求 7 件・参照 27 か所（`FR-099`:2520 の `RR-6`、`FR-016`:3955、`FR-053`:4849、`FR-070`:5014、`FR-092`:7150・7151 の `EZ-2`・`EZ-3`、`FR-038`:7653、`NFR-004`:8007、5 章の `CP-37`・`UF-66`・`UF-109`・6.2 節、表 T-109 の `IC-22`・`IC-61`・`IC-102`・`IC-129`〜`IC-131`、公開名 `PI-37`、表 T-206 の 7 行、状態機械 `helpDisplayStateMachine`）。
  - 表 T-256 を指す要求 1（`FR-036` の 3 か所）・2 次 7。`S-202`・`S-436`・`S-437` は `FR-036` の 1 か所ずつ、`S-201` は 2 か所。`FR-069` は要求 0・参照 2（`CN-7`:198、5.3 節:569）。
- ⭐ 届いた先を 1 つずつ読んだ: 割当の置き場・段の数・塊の境目の線・ライセンスの見せ方を言う文は、本書が書き換える所だけ。`RR-6`（名簿の閉じる入口の置き場）・`FR-016`・`FR-053`:4849（群の線と群の名 —— `Command Palette` の塊の中で真のまま）・`FR-070`・`EZ-2`（ツールチップの割当は「指すものと語の出どころが `FR-036` と同じ」で、置き場は言わない）・`EZ-3`・`FR-038`・`NFR-004`（母数）・`UF-109`（「ヘルプ（`FR-036`・表 T-256）」—— 表の名だけ）・`CN-7`（帰属表示を埋め込む —— 真のまま）・5.3 節:569（`tools/generate_licence.py --check` —— 全文は残るので真のまま）は、書き換えの後も真 ⇒ 書き換えない。
- `induced.py FR-036 T-256 S-202 S-201 S-436 FR-069 S-437`: 種 7/7、辺 10、閉路 1（大きさ 5: `FR-036`・`S-201`・`S-202`・`S-436`・`S-437`）⇒ ⛔ 閉路の全員（E-01〜E-04・E-06・E-07・E-09・E-10・E-12）を 1 つの波（8 節の波 1）で 1 度に書く。
- ⛔ `rulings.md` を、本書が書く行の ID と語（`FR-036`・`FR-069`・`T-256`・`HC-`・`S-201`・`S-202`・`S-436`・`S-437`・`段組`・`右詰`・`左詰`・`ライセンス`・ヘルプと「見出し」「群の名」「枠」）で引いた: 当たりは `JDG-155`・`JDG-865`・`JDG-881`・`JDG-920`・`JDG-940`（0.1 節）、`JDG-652`（`S-436` の元）、`JDG-73`〜`JDG-76`（ヘルプを入口とキーの一覧にする・見出し「基本操作」・凡例 —— 本書の後も真）、`JDG-374`（名簿の閉じる入口 —— 触れない）、`JDG-1028`・`JDG-1050`・`JDG-1051`（`CR-620` の備考 —— 範囲の外）、`JDG-183`（日程の札の右寄せ —— 別の話）。⇒ 導いた決定 1〜12 と食い違う裁定は 0。`JDG-155` の「3段組みのまま」だけが覆る（`JDG-865` が後）。
- `pending-decisions.md`: `PND-634`（見本で決める割り付けと初期値 —— 本書の問い 1〜3）。ほかに `DFC-1335`・`DFC-1351`・`DFC-1365`・`FR-069`・表 T-256・`S-436` を引く行は 0。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図に触れない |
| rows | ＋3 | 表 T-256 に `HC-<新1>`（3 → 4 行）、表 T-206 に `S-<新1>`・`S-<新2>` |
| uids | 差 0 | 要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | ＋10 | 旧ブロックの 4 → 新ブロックの 14（E-01 1→1、E-02 1→3、E-03 0→2、E-04 2→3、E-05 0→5）。13 節の数え方 |
| `（MUST NOT）` の印（同） | ＋2 | 旧ブロックの 3 → 新ブロックの 5（E-02 1→1、E-03 1→1、E-04 1→0、E-05 0→3）。⚠️ 足した印はどれも、検査 39 のために試験が逐語で引く（8 節の波 2） |
| 辞書の区 | ＋1（`helpLegal`、`part` 2 つ） | E-11 |
| `NOT_STORED_HELP_SIZES` の行 | 9 → 11 | `S-<新1>`・`S-<新2>`（生成器の群に足す。9 節） |
| ヘルプの項目の数（`help-roster.json`） | 差 0 | 載せる行は変わらない —— 段（`column`）が変わるだけ |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-621` を当てた木で、4 節の旧 12 件を数え直す（E-03 は `CR-621` の E-14 の新の直後の行で 1 回）。`CR-628` の `S-<新4>` が木に在るかを見る（無ければ 4.1 節のとおり）。仮番 `HC-<新1>`・`S-<新1>`・`S-<新2>` に番号を振る（2 節） | 調整役・仕様の体 | ― |
| 1 | ⛔ **L4 の合流を待つ**（`tools/generate_entity_types.py`・`tools/generate_display_words.py`・生成区画・`src/framework/dom-screen-surface/` は L4 の持ち物）。`docs/spec`（E-01〜E-12）＋ `npm run gen` ＋ 生成器 2 つ ＋ 9 節の `src` 4 ファイル ＋ 9 節の試験の 7 ファイル | 原稿と、それを読むコードを 1 つの波で着地させる（規則 02 の 3.5 —— 区 `helpLegal` は生成器が知らないと `npm run gen` が止まる。`S-<新1>`・`S-<新2>` は生成器の群に足さないと `src` に届かない）。閉路（6 節）の全員もこの波 | L4 の後の実装の体 | いいえ —— ヘルプの DOM は `changed('helpModal')` のときだけ組み直す（`dom-screen-surface.ts:932`〜`:935`）。枠は塊ごとに要素を 1 つ足すだけで、開いている間の毎フレームの仕事は増えない。⚠️ `CR-621` の動かす・大きさを変えるが掴んでいる間にヘルプを組み直すなら、その毎フレームの重さは `CR-621` の perf-pending の行が持つ（枠の要素 7 つ・ライセンスの要素 3 つが加わる） |
| 2 | `tests/contract/cr-622-*.test.ts`（新しいファイルだけ） | 下の場合の一覧 | 仕様だけの試験の体（波 1 と並べてよい） | ― |

仕様だけを読む試験の体が書く場合（`tests/contract/cr-622-help-frames-and-licence.test.ts`）:

1. `T-256 has four rows in the order HC-1, HC-2, HC-<new1>, HC-3, and S-202 equals the row count` —— E-01・E-07 の逐語（「⭐ 段は本表の行の順に左から並べること（MUST）」ほか）。
2. `the help roster places basics and browser in HC-1, App Header in HC-2, Row Title Panel / Search Panel / Resource Roster in HC-<new1>, Command Palette in HC-3` —— 生成された名簿の `column` と塊の順。
3. `every block is drawn in one frame of S-437 px in S-149, padded S-<new1> em` —— 塊の数だけ枠があり、枠は段をまたがない。
4. `the frames, the columns and the body edge are S-<new1> em apart` —— 4 か所の空き。
5. `Command Palette group borders are lines inside its frame, and no group name is printed` —— E-02 の MUST と MUST NOT。
6. `only the basics and browser blocks carry a heading` —— 今の MUST が真のまま。
7. `every one-line item with an assignment ends it at the frame's inner right edge, at least S-436 em after the description` —— 右端との差 1px 以内、空き ≥ `S-436` em。
8. `an assignment that does not fit after the description wraps to the next line and stays right-aligned` —— 狭めた段で。
9. `columns stop shrinking at S-<new2> em and the body scrolls sideways; the column count and block places do not change`。
10. `at the default size of the reference environment (MC-6) neither the list nor the licence lines need a scroll`。
11. `the help opens at S-201 = 0.98 of the window width and height`。
12. `the licence shows two lines below the columns: the copyright link and the licence name` —— 罫は `S-437`・`S-149`。
13. `the copyright line is a link to S-<new4> with target _blank and rel noopener noreferrer, and pressing it keeps the page` —— 頁が移らず、未保存の編集が残る。
14. `the copyright text is the same in ja and en; the licence-name line and the fold word follow the help language` —— `helpLegal` の 2 語。
15. `the full licence text and the attributions sit in a closed fold that opens on press` —— 開いたときは閉じている。

逐語で旧を引く既存の試験（同じ波 1 で替える）:

| 試験 | 所 | 何を |
|---|---|---|
| `tests/system/cr-574-help-window.test.ts` | `:18`（`FR_036_GAP`、E-04 の旧の 1 行目の逐語） | E-04 の新の文（右端・下限）を逐語で引く |
| 同 | `:622`〜`:633`（「the space from the description to the key is S-436 em」—— 空きが `S-436` に等しいことを確かめる） | 空きが `S-436` 以上で、割当の右の縁が枠の内側の右の縁にあることを確かめる |
| `tests/unit/cr-405-the-help-scrolls-down-in-three-columns.test.ts` | `:147`〜`:150`（`['HC-1', 'HC-2', 'HC-3']`）・`:152`〜`:158`（3 段の塊の並び） | 4 行と新しい並び。⚠️ 同ファイルの `:47`（横のスクロールの MUST NOT）は `CR-621` が替える |

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `STYLE.helpText`（`:349`） | `min-width:0;` → `flex:1 1 auto;min-width:0;`（`f8b5f2ad` が `flex:1;min-width:0;` から `flex:1` を落とした回帰、`DFC-1365`） | いいえ |
| 同 | `STYLE.helpKeys`（`:350`） | `margin-left:auto;` を足す —— 次の行へ送った割当も右端に置く | いいえ |
| 同 | `STYLE.helpBlock`（`:353`）・`STYLE.helpLegal`（`:356`） | 枠（`S-437` px・`PAINT.rule`＝`S-149`・内側 `S-<新1>` em）と、ライセンスの上の罫（`currentColor` と `0.75em` の直書きを消す） | いいえ |
| `src/framework/dom-screen-surface/open-modals-drawing.ts` | `helpColumnsStyle`（`:41`〜`:47`） | `column-gap:1.5em` → `S-<新1>` em。列を `minmax(<下限>,1fr)`、下限は `min(S-<新2> em, 開いたときの段の幅)`（`S-201` と段の数から求まる） | いいえ |
| 同 | `helpColumnsElement`（`:281`〜`:320`） | 段の頭でない塊の前に引いていた線（`:301` の `paletteGroupRuleStyle()`）を消し、塊ごとの枠にする。群の線（`:307`）は残す | いいえ |
| 同 | `helpItemElement`（`:162`） | `margin-right` の `S-436` は下限として残る（`flex:1` と組んで間隔の下限になる） | いいえ |
| 同 | `helpBodyElement`（`:519`〜`:531`） | 2 行（`<a href=S-<新4> target=_blank rel="noopener noreferrer">` の著作権表示、ライセンスの名の語）と、閉じた `<details>`（`<summary>` は「ライセンス全文」の語、中に全文と帰属表示） | いいえ |
| `src/adapter/screen-renderer/screen-renderer.ts`（`HelpModal`、`:297` 付近）・`open-modals.ts`（`:290` 付近） | `copyrightNotice` の隣 | ライセンスの名の語・全文を開く入口の語（ヘルプの言語で引いた `helpLegal`）と、リポジトリの所（`CR-628` の `S-<新4>` の生成された定数）を運ぶ | いいえ |
| `tools/generate_entity_types.py` | `NOT_STORED_HELP_SIZES` の群（`:1339`〜`:1341`） | `S-<新1>`・`S-<新2>` を足す（足さないと `src` に届かず、`gen:check` は緑のまま） | ― |
| `tools/generate_display_words.py` | 区の一覧（`:422`・`:494`・`:602`〜`:611` 付近） | 区 `helpLegal`（`HELP_LEGAL_PARTS = ('licensedUnder', 'fullText')`、鍵は `part`、語は `text`） | ― |
| `tools/generate_help_roster.py` | 冒頭の説明（`:23`〜`:27`） | 3 段の割り付けを言う注を 4 段へ（コードは 表 T-256 を毎回読むので変わらない） | ― |
| 試験の `HelpModal` の作り物 5 つ | `tests/unit/cr-439-open-modals-help-roster-report-export.test.ts:120`〜`:121`・`tests/unit/cr-541-panels-help-tooltip-and-dialogue.test.ts:268`〜`:269`・`tests/unit/fr-036-help-item-order-and-size.test.ts:292`・`tests/unit/uf-71.test.ts:1209`・`tests/unit/uf-72-screen-part.test.ts:1576` | `HelpModal` に足す性質を埋める（足さないと `tsc` が落ちる） | ― |
| 8 節の表の試験 2 つ | `cr-574`・`cr-405` | 8 節のとおり | ― |

⚠️ リポジトリの所の定数: `CR-628` の 5 節は `NOT_STORED_REPOSITORY_ADDRESS` を `app-header-items.ts` に置く。ヘルプも同じ定数を読むので、生成器の置き場（読む所に置く `READ_WHERE_IT_STANDS`）を 2 つの読み手が引ける所にするか、ヘルプは `HelpModal` 経由で受け取る —— 定数は 1 つ（`R2.21`）。どちらにするかは波 1 の実装の体が決め、報告する。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- ヘルプを動かす・大きさを変える・右と下のスクロールバー・ポインタの形（`CR-621`）。
- `Esc` の段（`CR-630`）。ヘッダーの並び（`CR-627`）。リポジトリの URL の行そのもの（`CR-628`）。
- `CR-620` の備考 ※1 と `IC-20` の添え書き（MCP —— 範囲の外。4.1 節は重なりを書くだけ）。
- 題の行（`JDG-651`・`FR-036` の題の行の並び）を変えない。凡例も題の行のまま。
- 見出しを持つ塊を増やさない（問い 3 の推奨 A）。群の名を刷らない（`FR-053`）。
- 載せる行（表 T-109・表 T-036・表 T-023・表 T-255 の選び方）を変えない。項目の数は変わらない。
- 1 画面の段落の MUST を変えない（決定 11）。
- ライセンスの全文・帰属表示・`NOTICE` の中身・`tools/generate_licence.py` を変えない（全文は残る）。

## 11. 利用者に問うこと

⭐ 触れる見本 `previous-project-result/32-help-layout/index.html` を開いて選ぶ（左下の破線の枠が見本の操作で、GRS の画面ではない）。見本の中身は `help-roster.json` と辞書（`npm run gen` の出力）そのままで、外へは何も取りに行かない。

| 問い | 選択肢 | 推奨 | 理由 |
|---|---|---|---|
| 問い 1 —— 段の数と塊の置き方（表 T-256・`S-202`・`S-<新1>`・`S-<新2>`） | **A**: 3 段のまま（今の置き方）に枠だけを足す ／ **B**: 4 段 —— 基本操作とブラウザの機能 ／ ヘッダー ／ 行見出しパネル・検索パネル・名簿 ／ コマンドパレット | **B**（枠の余白 `0.5` em・段の幅の下限 `18` em は見本の初期値。見本のつまみで選び直せる） | 1 つの段に 1 種類の塊になり、「混在」が消える。最も高い段が 1 画面に収まる画面が広がる —— 見本の実測（13 節）で、一覧と 2 行の全部が収まるのは A では 1920 × 1080 だけ、B では 1366 × 768 まで（1280 × 720 は一覧だけ収まり、2 行が 13px あふれる） |
| 問い 2 —— 開く大きさ `S-201`（画面の幅と高さに対する割合） | **A**: `0.95`（今） ／ **B**: `0.98` | **B** | 利用者が「左右のマージンを削ってホバーを拡げてもよい」とした。B は段の幅を 14px 前後広げ、本文の領域を 20px 前後高くする（13 節）。⚠️ 割合は幅と高さに同じ値を当てる行なので、上下の余白も同じだけ削れる |
| 問い 3 —— 枠の見出し | **A**: 今の 2 つ（基本操作・ブラウザの機能）だけ ／ **B**: どの枠にも面の名を刷る | **A** | 枠が境目を示すので、名が無くても塊は分かれる。B は `FR-036` の「この 2 つの塊にだけ見出しを刷ること（MUST）」を覆し、`App Header` と `Row Title Panel` の見出しの語は辞書に無い（語は利用者が書く —— 見本の B の語は仮）。⚠️ B を選ぶなら、語を決めてもらう問いが 1 つ増える |
| 問い 4 —— 「Apache License 2.0」の行をリンクにするか | **A**: Apache の頁（`https://www.apache.org/licenses/LICENSE-2.0`）へのリンクにする（所見 §5 (a) の行 2。設定の行がもう 1 つ要る） ／ **B**: リンクにしない（見本の形） | **B** | 利用者が押した先を求めたのは Copyright だけ（`JDG-881`）。全文は 1 行下に畳んで在り、オフラインでも読める。リンクにすると外の所の行がもう 1 つ増える |

⭐ どの答えでも、割当の右寄せ（`DFC-1365`）とライセンスの 2 行（`DFC-1351`）は変わらない —— この 2 つは問いを待たずに当ててよい（E-04・E-05・E-09〜E-12）。⚠️ ただし E-01〜E-04・E-06・E-07・E-09・E-10・E-12 は閉路の中にあり（6 節）、1 つの波で書く。問い 1 の答えが A なら E-01・E-03・E-07・E-08 を書き直す（3 段の表のまま枠を足し、`S-202` は 3）。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1335` | ヘルプの群が混ざり、枠が無く、1 画面に収まらない（割り付けの半分） | 本書で閉じる（窓の半分は `CR-621`）。⏸ 問い 1〜3 の答えを待つ —— `裁定待ち` のまま（`PND-634`） |
| `DFC-1365` | ヘルプの割当が左詰めになった（回帰） | 本書で閉じる —— 仕様（E-04・E-09・E-12）とコード（9 節の `STYLE.helpText`・`STYLE.helpKeys`）を波 1 で。⚠️ 行の「仕様は行の中の鍵の位置を言わない」は誤り —— `FR-036` が言っていた（`R1.3`） |
| `DFC-1351` | ライセンスの表示が長く、Copyright を押しても GitHub へ跳ばない | 本書で閉じる（`JDG-940` の案 2、E-05・E-11、コードは波 1）。URL の行は `CR-628` |
| `JDG-865` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書と `CR-621` の 2 本が当てる。波が決まったら「指示 —— `CR-621`・`CR-622` が当てる」 |
| `JDG-881`・`JDG-920`・`JDG-940` | ライセンスの表示（`JDG-920` は `JDG-940` で決め直された） | 調整役へ: 「指示 —— `CR-622` が当てる」。`JDG-920` は「覆された —— `JDG-940`（案 2）」 |
| `JDG-155` | 3 段組みのまま縦にスクロール | 調整役へ: 本書が着地したら「覆された（一部。`JDG-865`）—— 3 段組み（`CR-622`）」。横のスクロールの部分は `CR-621` |
| `JDG-652` | 説明とキーの隙間を詰める | 変えない。⚠️ `CR-574` の読み（左詰め）は `JDG-865` で覆った —— 調整役が注を足すか判断する |
| `PND-634` | 見本で決める割り付けと初期値 | 本書の 11 節の問い 1〜3（① の部分）。答えが来たら調整役が閉じる |

## 13. 測り方の再現

```
# the tree: l4-review-crs bfbe7eb7 (= refactor)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-036 T-256 S-202 S-201 S-436 FR-069 S-437
#   FR-036: 7 requirements / 27 places; T-256: 3 rows, 1 requirement, 7 second-hop;
#   S-202 1, S-201 2, S-436 1, S-437 1 (all FR-036); FR-069: 0 requirements / 2 places
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-036 T-256 S-202 S-201 S-436 FR-069 S-437
#   -> seeds 7 of 7, edges 10, cycles 1 (size 5: FR-036 S-201 S-202 S-436 S-437)

# the sentences quoted verbatim by tests
git grep -n "塊の境目\|段の右端\|説明の直後\|左の段\|中の段\|右の段" -- docs/spec tests src tools
#   spec 01-04-requirements.md :7511-7513 :7520 :7585 :7586 ; tests/system/cr-574-help-window.test.ts :18
git grep -n "HC-[0-9]\|S-202\|S-201\|S-436\|copyrightNotice" -- tests
#   cr-405 :147-158 ; cr-574 :18 :104 :622 ; 5 HelpModal fixtures (section 9)

# the code
grep -n "helpText\|helpKeys\|helpBlock\|helpLegal" src/framework/dom-screen-surface/dom-screen-surface.ts     # :349 :350 :353 :356-358
grep -n "column-gap\|S-436\|helpBodyElement\|paletteGroupRuleStyle" src/framework/dom-screen-surface/open-modals-drawing.ts
git show f8b5f2ad -- src/framework/dom-screen-surface/dom-screen-surface.ts   # helpText lost flex:1 (DFC-1365)
grep -n "NOT_STORED_HELP_SIZES" tools/generate_entity_types.py               # :1339 group, :3107 placement

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of this file, takes each 旧 fenced block, counts it in its file)
#   E-01 1 / E-02 1 / E-03 1 / E-04 1 / E-05 1   (01-04-requirements.md)
#   E-06 1 / E-07 1 / E-08 1 / E-09 1 / E-10 1 / E-12 1 (partial, inside one line)   (settings.json)
#   E-11 1                                        (display-words.json)
#   MUST markers of the old blocks 4 -> new 14; MUST NOT 3 -> 5 (01-04-requirements.md only)
#   the FR-069 old STATEMENT of docs/review/apache-license-notice-2026-09-30.md section 5 (b) occurs once

# the sample: previous-project-result/32-help-layout/index.html, read whole; not changed
#   no absolute path, no personal data, no fetch / import / external src or href;
#   the only URLs are the repository link and two inside the Apache licence text
#   109 entries = the generated help-roster.json (107 items + 2 headings)
#   headless Chromium (the root's node_modules/playwright), file:// page, a probe in the session
#   scratchpad that sets the sample's own state and reads the box sizes; ja and en alike:
#     screen       layout                       body h  list h  whole body fits
#     1920x1080    3 cols, 0.95, no frames       987     837     yes
#     1920x1080    4 cols, 0.98, frames          1019    602     yes
#     1366x768     3 cols, 0.95, no frames       691     837     no
#     1366x768     4 cols, 0.95 / 0.98, frames   691/714 602     yes
#     1280x720     3 cols, 0.95, frames          645     876     no
#     1280x720     4 cols, 0.98, frames          667     602     list yes, licence lines 13px over
#     1280x720     4 cols, 1.00, frames          681     602     yes
#   column width at 4 cols, 0.98: 1920 462px, 1366 326px, 1280 305px (help text 12.8px)
#   the sample puts a wrapped assignment at the left of its next line (no margin-left:auto);
#   this CR says right (E-04) -- 1 to 4 items wrap at these sizes

# the rulings and ledger rows read whole
grep -n "^| JDG-155 \|^| JDG-65[1-4] \|^| JDG-865 \|^| JDG-873 \|^| JDG-881 \|^| JDG-882 \|^| JDG-920 \|^| JDG-940 " docs/development-records/rulings.md
grep -n "^| DFC-1335 \|^| DFC-1351 \|^| DFC-1365 " docs/development-records/defects.md
grep -n "^| DFC-14 " docs/development-records/fixed-defects.md
grep -n "PND-634" docs/development-records/pending-decisions.md
```
