# CR-548 — パレット色を名で保存し、カスタムカラーに明るいテーマと暗いテーマの 2 つの値を持たせる

> ⭐ **状態: 当てた（2026-09-22）。** 11 節の問いに前に立つ者が答え（11.1 節）、その答えを 4 節の編集へ入れてから、仕様とコードへ当てた。当てた後の測定は 13 節。
> 読んだ木: `4015736e`（`origin` の `006aefbc` の上に台帳と `CR-541` の仕様を載せた先端）。行番号・行数・参照の数は、すべてこの木で測った（測り方は 12 節）。
>
> **閉じるもの**: 利用者の 2026-09-22 の答え F1・F7・F8（scratchpad `user-words.md` の第 3〜5 通）と、前に立つ者が F7 に添えて利用者が「OK」と受けた 4 点。`PND-494`（綴り）・`DFC-566`（パネルの色の欄）・`DFC-684`（モノクロで色の名が素通りする）・見本の問い S1（10 色の値）。
> ⛔ **覆すもの**: Q3 の推奨 ②（「`#rrggbb` ＋透明だけ `"transparent"`」、`JDG-300`）と、`CR-541` が当てずに残した E-67（「⛔ 色の名で保存してはならない（MUST NOT）」）。利用者の逐語: 「前の裁定を覆して悪いけど、パレットは色名、色名がカスタムカラーの場合はRGBの値を決めて入力」（F7）。E-67 は当てない —— 本書の E-03 が置き換える。
> 裁定の行（`rulings.md`）の記入は本書の仕事ではない（`CR-549` か前に立つ者）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（`CH-4`、説明を読まずに操作できる）—— 色の欄が、選んでいる色の明るいテーマと暗いテーマの見本を並べて見せる（`CV-9`）。暗いテーマに切り替えたとき、何色で描かれるかを試さずに読める。
⚠️ 残り（名で保存する、明暗で描き分ける、純色の赤をやめる）は、暗いテーマで選んだ色が地に溶ける・純色が「原色を使ってはならない」に触れる、という仕様と絵の食い違いを閉じる手入れであり、`CH-` を直に前へ進めない。正直にそう書く。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正がある）** —— 3 つ出た。(i) `01-04:1933` の「パレットから選べば … 明暗を変えても動かなくなる」が F7・F8（明暗で描き分ける）と逆。(ii) 同じ色の保存に Q3 の `#rrggbb`、見本文書・案内の CSS の名、パネルの `type="color"` の 3 通りが混ざっている（`PND-494`）。(iii) `erd.json` の `fillColor` の意味が、透明の組の規則を `FR-030` に帰している —— その規則は `FR-007` の STATEMENT と `05-07` の 表 T-220 の `IV-9` にあり、`FR-030` は「色だけで伝えない」である。3 つとも 1 つの正へ直した（E-01・E-03・E-11）。
- **`R1.4`（異常系・境界値）** —— カスタムカラーの片側が未定義（`CV-3`）、両側が未定義（`CV-2` が禁じ、スキーマが拒む）、古い綴りの文書（4.3 節）、ハイライトボックスの透明（`AT-121` の `transparent: false`）、PoC に形の無い実績と行の帯（11 節の問い 2・問い 3）。
- **`R1.5`（MECE）** —— 色を持つ列は `erd.json` に 4 つだけである（`TaskGroup.color` / `TaskVisual.fillColor` / `TaskVisual.strokeColor` / `HighlightBox.strokeColor`。12 節で数えた）。4 つとも 1 つの型にした。1 つの名が描かれる形は 4 つ（塗り・縁・実績の塗り・行の帯）で、4 つの列の描く所をすべて `CV-6` で振り分けた。
- **`R2`（命名）** —— 新しい表 2（表 T-017b・表 T-294）、新しい接頭辞 1（`CV`）、新しい行 ID 20（`CV-1` 〜 `CV-9`、`S-314` 〜 `S-324`）。⚠️ 用語集のキーの規約「`palette` を設定値の名前に使わないこと（MUST NOT）」（`tbl-glossary.md:309`）に合わせ、辞書の節と生成物の定数に `palette` の語を使わない（`colourNames` / `colourField`）。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | ⭐ **保存の形は文字列 1 つ**: パレット色は名（`"red"`）、カスタムカラーは `"明るいテーマの値/暗いテーマの値"`（例 `"#c0504d/"`・`"/#3a5f8a"`・`"#c0504d/#e07a70"`）、未指定は `null`。4.3 節 | 列の JSON の型が `string \| null` のまま変わらないので、実体の型・コーデック・undo の写し・合流の比較（Q13）・`Agent API` の命令の形（`CM-22` / `CM-30` / `CM-55`）が 1 字も動かない。読み手が増やすのはスキーマの鍵 `pattern` の 1 つだけである（4.3 節） | カスタムカラーは合成した文字列なので、描く側に分ける関数が 1 つ要る。`{ "light": …, "dark": … }` の対象型を選ぶと、スキーマに `oneOf` ・ `pattern` ・ `anyOf` の 3 つの鍵が要り、4 列を読むコードがすべて型で分かれる（11 節の問い 6 で覆せる） |
| 決定 2 | 名の綴りは、いま見本文書・変換の案内・起動時の見本文書が使っている 11 語（`white` `black` `dimgray` `lightgray` `red` `blue` `yellow` `green` `orange` `purple` `transparent`）をそのまま使う | `palette-derivation.md` §2 が数えた綴りそのもの。起動時の見本文書・`sample-schedule/`・`docs/guides/schedule-to-grs-json/prompt-*.md` を 1 字も書き直さずに済む | 綴りは CSS の色の名と同じ字だが、描く値は CSS の色ではない（`CV-1` の注で断る） |
| 決定 3 | 1 つの名に 4 つの形（塗り・縁・実績の塗り・行の帯）を明暗ごとに持たせ、どの列がどの形で描くかを `CV-6` に置く | F1 の「色と縁取り」に合わせると、塗りと縁は同じ名でも別の値である（PoC `:53-56`）。同じ値で描くと、赤い塗りに赤い縁が溶ける。行の帯を塗りの値で描くと、同じ色のバーが帯の上で 1.0 : 1 になる（`palette-derivation.md` §3） | 表 T-294 は 12 列になる |
| 決定 4 | `CV-4`: カスタムカラーを選び直すとき、もう一方の側は、選ぶ前がカスタムカラーならその値を保つ | 利用者の F7「ダークも定義すればダーク用の色で描画」は、片側ずつ定義を足していく使い方である。選び直すたびに他方を消すと、ダークを定義した後にライトを直した瞬間にダークが消える | — |
| 決定 5 | 「原色を使ってはならない（MUST NOT）」を表 T-294 の値に掛け、カスタムカラーには掛けない（E-03） | 利用者が「RGB の値を決めて入力」と決めた値を `GRS` が拒むと、カスタムカラーを持つ意味が無い。点 2（自動補正も通知もしない）と同じ立場である | 作成者は原色を選べる |
| 決定 6 | 色の欄の名の見本は、その欄が描く形の、いま描いている明暗の値で塗る（`CV-9`）。行の色の見本は行の帯の値である | 見本と描かれる色が一致する（F8 で白と黒が入れ替わるので、見本を固定すると「白」が暗い見本の上に乗る。`palette-derivation.md` §5） | 行の色の見本は薄く、名で見分けることになる |
| 決定 7 | パレット色を選んでいるときも、欄には明るいテーマと暗いテーマの 2 つの見本を並べる（`CV-9`） | 前に立つ者の点 1 は「色の欄」の見せ方であり、カスタムカラーに限っていない。パレット色こそ明暗で値が変わる | — |
| 決定 8 | `strokeColor` は予定バーと実績バーの両方の縁を塗る（いまのコード `schedule-task-figures.ts:361-375` と同じ）。`fillColor` の実績バーは実績の塗りの値を使う | 実績の縁の形は PoC に在る（`--actual-stroke`）が、`palette-derivation.md` は導いていない。縁は今のままにし、差が要る塗りだけを変える | 実績の縁は予定の縁と同じ値のまま |
| 決定 9 | 新しい表は、値を `settings.json`（表 T-294、`S-314` 〜 `S-324`）に、規則を 01-04 の 表 T-017b（新しい接頭辞 `CV`）に置く。表 T-017 に `CL-3` 以降を足さない | 値は成果物に埋め込む定数で、表 T-236 と同じ生成器が読む（仕様は表で書く）。`CL-3` 〜 `CL-5` は `docs/review/inventory/A01-agent-api-spec.md:98-100` が別の意味で使っている（ID を二度使わない） | 接頭辞が 1 つ増える（`CV`） |
| 決定 10 | 表 T-294 の 白・黒・濃い灰色 の「実績の塗り」の欄と、黒 の「行の帯」の欄に、仮の値を入れる（`S-157` に同じ ／「行の色には選ばせない」）。当てる前に問い 2・問い 3 の答えで確かめる | 表の欄を空けると生成物の読み手が投げる（規則 02 の 3.5 節）。仮の値は `palette-derivation.md` §3 が挙げた候補である | 答えが違えば 1 セルずつ書き直す |
| 決定 11 | `erd.json` の型の欄（`文字列`）と NULL 可の欄は変えない。変えるのは `json` と意味の欄だけである | 検査 23 の除外数（型 129 など）を動かさない | 型の欄から色の形は読めない（意味の欄と `json` が持つ） |

---

## 1. 範囲 —— 項目ごとの行き先

| 項目 | 裁定・点 | 仕様で変える所 | 4 節の編集 |
|---|---|---|---|
| F7 名で保存 | パレット色は名で保存する | 表 T-017b の `CV-1` ／ 表 T-294 の「保存する綴り」 ／ `erd.json` の 4 列 ／ 用語集 `P-19` | E-03、E-09、E-10 〜 E-13、E-18 |
| F7 カスタムカラー | ライトとダークの 2 つの値、それぞれ `#rrggbb` か未定義。未定義の側は他方で描く。選んだときの明暗の側だけを定義する | `FR-007` の STATEMENT ／ 表 T-017b の `CV-2` 〜 `CV-4` ／ `erd.json`（形） ／ `erd.schema.json`（型 `color`） | E-01、E-03、E-11、E-14 |
| F7 点 3 | パレット色に戻すと両方を捨てる | 表 T-017b の `CV-5` | E-03 |
| F7 点 1 | 欄に「ライト ■ / ダーク ■（ライトと同じ）」 | 表 T-017b の `CV-9` ／ 辞書 | E-03、E-19 |
| F7 点 2 | 未定義のダークを自動で補正せず、通知もしない | 表 T-017b の `CV-8` | E-03 |
| F1 | 10 色を PoC の色と縁取りに合わせ、明暗それぞれで決める | 表 T-294（新） ／ 表 T-017 の `CL-1` ／ 表 T-017a の結び | E-02、E-04、E-09、E-15、E-16 |
| F8 | 暗いテーマでは白黒を入れ替える | 表 T-294 の `S-314` ・ `S-315` ／ `CV-6` | E-03、E-09 |
| 明暗の文の食い違い（`01-04:1933`） | F7・F8 に合わせる | 表 T-017 の結び | E-03 |
| モノクロ（`FR-041`） | 明暗の値を選んでから無彩色 | 表 T-017b の `CV-7` ／ `FR-041` の RATIONALE ／ `NFR-007` の RATIONALE | E-03、E-05、E-06 |
| `FR-030` | 「塗りと輪郭の両方を透明にしない」は `FR-030` ではない。`erd.json` の引き先を直す。`FR-030`（色だけで伝えない）はモノクロで同じ灰になる色について `CV-7` から引く | `erd.json` の `AT-102` の意味 ／ `CV-7` | E-11、E-03 |
| 接頭辞 `CV` | 登録 | `row-id-prefixes.json` | E-17 |
| 生成器 | 型 `color`、`pattern`、表 T-294 の定数、辞書の節 | `tools/` と `docs/spec/_source/*.py`（形で示す） | E-20 |

**数**: 編集の単位は 19（E-01 〜 E-20 と E-14b。E-07 と E-08 は欠番 —— 起草の途中で `FR-019` と `UC-003` の編集を要らないと判じて外した。理由は 4.1 節の末尾）。うち仕様と原稿へのテキストの編集が 18、生成器を形で示すものが 1（E-20）。

### 1.1 表 T-294 の値（要約。当てる文は E-09 の JSON）

出所はすべて `palette-derivation.md` §3（PoC `previous-project-result/08-poc/poc-integrated.html` から導いた値）。

| 行 | 色 | 綴り | 明: 塗り / 縁 / 実績 / 帯 | 暗: 塗り / 縁 / 実績 / 帯 |
|---|---|---|---|---|
| S-314 | 白 | `white` | `#ffffff` / `#ffffff` / `S-157`⛔ / `S-146` | `#14161a` / `#14161a` / `S-157`⛔ / `S-146` |
| S-315 | 黒 | `black` | `#000000` / `#000000` / `S-157`⛔ / —⛔ | `#ffffff` / `#ffffff` / `S-157`⛔ / —⛔ |
| S-316 | 濃い灰色 | `dimgray` | `#575757` / `#383838` / `S-157`⛔ / `#e0e0e0` | `#a3a3a3` / `#cccccc` / `S-157`⛔ / `#474747` |
| S-317 | 薄い灰色 | `lightgray` | `#cccccc` / `#757575` / `#575757` / `#f5f5f5` | `#424242` / `#a8a8a8` / `#a3a3a3` / `#333333` |
| S-318 | 赤 | `red` | `#e3b9b5` / `#a94c42` / `#8c2c21` / `#f9f1f1` | `#58312d` / `#d08880` / `#dc766a` / `#3c2c2a` |
| S-319 | 青 | `blue` | `#b5c9e3` / `#426ea9` / `#21508c` / `#f1f4f9` | `#2d3f58` / `#80a3d0` / `#6a9cdc` / `#2a323c` |
| S-320 | 黄 | `yellow` | `#dfd6a9` / `#8c7d36` / `#79691c` / `#f9f8f1` | `#58502d` / `#d0c380` / `#dcc96a` / `#3c392a` |
| S-321 | 緑 | `green` | `#afe1bf` / `#3c9a5b` / `#1f8340` / `#f1f9f3` | `#2d583b` / `#80d09b` / `#6adc90` / `#2a3c30` |
| S-322 | オレンジ | `orange` | `#e3cab5` / `#a97242` / `#8c5321` / `#f9f5f1` | `#58412d` / `#d0a680` / `#dc9f6a` / `#3c322a` |
| S-323 | 紫 | `purple` | `#d8b5e3` / `#8f42a9` / `#72218c` / `#f7f1f9` | `#4d2d58` / `#bc80d0` / `#c06adc` / `#382a3c` |
| S-324 | 透明 | `transparent` | 描かない | 描かない |

⛔ 印のセルは起草のときの仮の値（決定 10、問い 2・問い 3）であり、前に立つ者が起草のとおりに決めた（11.1 節の 2 と 3）。黄と緑の明るいテーマは、PoC の寄せの規則（`:2750-2760`）で k = 8 と k = 4 寄せた値である（寄せないと縁 ÷ 地が 2.89 と 2.96 で `CT-4` を割る）。

---

## 2. 新しい識別子（2026-09-22 に `4015736e` と、手元の 64 のブランチの先端で測った）

⛔ 規則 02 の 2.5 節: **当てる直前に、同じ測り方で空いていることを測り直すこと。**

| 識別子 | 置く所 | 項目 |
|---|---|---|
| 表 T-017b | 01-04 の `FR-007` | 持ち方と描き方の規則 |
| `CV-1` 〜 `CV-9` | 表 T-017b | 同上 |
| 接頭辞 `CV` | `row-id-prefixes.json` | 同上 |
| 表 T-294 | `settings.json` → `tbl-settings.md` の §8（表 T-236 の直後） | 10 色＋透明の値 |
| `S-314` 〜 `S-324` | 表 T-294 | 同上 |

- 上の識別子は、起草の日（2026-09-22）に `4015736e` と 64 のブランチの先端を `git grep` で引いて、どれも空いていた（12 節）。
- 測った最大: 表は `T-293`（`T-290` 〜 `T-293` は別のブランチが使う。`T-301` 〜 `T-319` は退いた `tbl-datamodel.md` の番号として `CR-110` の文にだけ残る）、`S-` は `S-313`。
- 接頭辞の登録簿は 160 件（`CV` を足して 161 件になる）。

---

## 3. ⛔ 消すものを先に列挙する

| 消すもの | 所（`4015736e`） | 編集 |
|---|---|---|
| 「パレットから選べば上書きになり、`themeHue` や明暗を変えても動かなくなる。」の「や明暗」 | `01-04-requirements.md:1933` | E-03 |
| `CR-541` の E-67 の文（未当て。「⛔ 色の名（`"red"` など）で保存してはならない（MUST NOT）」） | `CR-541` の 4.11 節 | 当てない。E-03 が代わる |
| `NFR-007` の「モノクロ表示時のコントラストは未検証」 | `01-04-requirements.md:7120` | E-06 |
| `erd.json` の `fillColor` の意味の `（FR-030）` | `erd.json:2418` | E-11 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-541` と同じ）:
- 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（規則 02 の 4 節）。
- 行末の空白 2 つ（強制改行）は旧にも新にもそのまま書いてある。消さないこと。
- 旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である（12 節の照合の台本がこの形を読む）。
- 仕様書（`*.md`）へ新しく書いた文には `**` を 1 つも使っていない（CJK の直後の `**` の罠を避けるため）。

### 4.1 01-04 —— `FR-007`・表 T-017・表 T-017b・表 T-017a・`FR-041`・`NFR-007`

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧（`:1916-1917`、`FR-007` の STATEMENT）
```text
**STATEMENT**: 作成者が色を選ぶとき、`GRS` は、**表 T-017 のパレット色**から選ばせ、線色と塗り色を個別に指定できるようにすること。  
**塗りと輪郭を同時に透明にすることを許してはならない（MUST NOT）。**
```
新
```text
**STATEMENT**: 作成者が色を選ぶとき、`GRS` は、**表 T-017 のパレット色**から選ばせ、線色と塗り色を個別に指定できるようにすること。  
⭐ パレットに無い色は、カスタムカラーとして選ばせること（MUST） —— 持ち方と描き方は 表 T-017b に従うこと（MUST）。  
**塗りと輪郭を同時に透明にすることを許してはならない（MUST NOT）。**
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧（`:1928`、表 T-017 の `CL-1`）
```text
| CL-1 | パレット色 | 白 / 黒 / 濃い灰色 / 薄い灰色 / 赤 / 青 / 黄 / 緑 / オレンジ / 紫 / **透明** |
```
新
```text
| CL-1 | パレット色 | 白 / 黒 / 濃い灰色 / 薄い灰色 / 赤 / 青 / 黄 / 緑 / オレンジ / 紫 / **透明**。<br>保存する綴りと、明暗それぞれで描く値は `_assets/tbl-settings.md` の 表 T-294 が持つ |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧（`:1931-1934`、表 T-017 の結び。表 T-017b をこの後に置く）
```text
**原色を使ってはならない（MUST NOT）。**  
**色を指定しなければテーマ色に追随する。**  
パレットから選べば上書きになり、`themeHue` や明暗を変えても動かなくなる。  
**モノクロの効き方は `FR-041` が持つ。**
```
新
```text
**原色を使ってはならない（MUST NOT）。**  
⭐ この禁止は 表 T-294 の値に掛かる —— カスタムカラー（表 T-017b の `CV-2`）は作成者が選んだ値であり、`GRS` は拒まない（`CV-8`）。  
**色を指定しなければテーマ色に追随する。**  
パレットから選べば上書きになり、`themeHue` を変えても動かなくなる。  
⭐ 明暗を変えたときは、選んだ名がその明暗で持つ値で描く（表 T-017b の `CV-6`） —— 同じ名でも、明るいテーマと暗いテーマで描く値が違う。  
**モノクロの効き方は `FR-041` が持つ。**

**表 T-017b — 選んだ色の持ち方と描き方**

| 行 ID | 事項 | 規則 |
| --- | --- | --- |
| CV-1 | パレット色を保存する | パレット色を選んだら、`_assets/tbl-settings.md` の 表 T-294 の「保存する綴り」の欄の名（例: `red`）を保存すること（MUST）。<br>描いた値（`#rrggbb`）を保存してはならない（MUST NOT） —— 同じ名が明暗で違う値で描かれるので、描いた値を保存すると、もう一方の明暗で何を描くかが文書から読めなくなる（`FR-041` の、派生する色を保存しない規則と同じ理由である）。<br>⚠️ 綴りは CSS の色の名と同じ字であるが、CSS の色ではない —— 描く値は 表 T-294 だけが持つ。<br>列の形は `_assets/fig-erd-detail.md` の `AT-58` ・ `AT-102` ・ `AT-103` ・ `AT-121` が持つ |
| CV-2 | カスタムカラーの持ち方 | カスタムカラーは、明るいテーマの値と暗いテーマの値の 2 つを持つこと（MUST）。<br>どちらも `#rrggbb`（16 進 6 桁）か未定義とする。<br>2 つとも未定義にしてはならない（MUST NOT） —— 描く値が無くなる。<br>綴りは `_assets/fig-erd-detail.md` の `AT-102` が持つ |
| CV-3 | 未定義の側 | 未定義の側の明暗で描くときは、もう一方の側の値で描くこと（MUST）。<br>例: 明るいテーマの値だけを持つ色は、暗いテーマでも明るいテーマの値で描く |
| CV-4 | カスタムカラーを選んだとき | いま描いている明暗（`FR-041`）の側の値だけを、選んだ値にすること（MUST）。<br>もう一方の側は、選ぶ前の色がカスタムカラーならその値を保ち、そうでなければ未定義とすること（MUST）。<br>⭐ 明るいテーマで決めた色に暗いテーマの値を足すには、暗いテーマに切り替えてから選び直す |
| CV-5 | パレット色へ戻す | カスタムカラーを持つ欄でパレット色（透明を含む）を選んだら、2 つの値を両方捨てること（MUST）。<br>テーマ追随へ戻したとき（本要求の「戻す入口」）も同じである |
| CV-6 | 描く値 | パレット色は、表 T-294 がその名に持つ、いま描いている明暗の値で描くこと（MUST）。<br>どの欄の値かは描く所で決める: `fillColor` は予定バーの塗りを塗りの値で、実績バーの塗りを実績の塗りの値で描く。<br>`strokeColor` は予定バーと実績バーの縁を、`HighlightBox.strokeColor` は枠の線を、縁の値で描く。<br>`TaskGroup.color` は行の帯の値で描く。<br>⭐ 白と黒は暗いテーマで入れ替わる（表 T-294 の `S-314` ・ `S-315`）。<br>カスタムカラーは、実績バーの塗りを除くどの所にも、`CV-3` で決まった値をそのまま使うこと（MUST）。<br>カスタムカラーの実績バーの塗りは、その値から試作の予定と実績の差で導くこと（MUST）: 明るいテーマは HSL の彩度に 16 を足して明度から 46 を引き、暗いテーマは彩度に 30、明度に 38 を足し、どちらも 0 〜 100 に収める（`previous-project-result/08-poc/poc-integrated.html` の `:53-55` / `:93-95`）。<br>⭐ 導くのは実績という別の形であり、`CV-8` の補正ではない —— 選んだ値は動かさず、表 T-017a の結びの「実績を濃く描くこと」を保つ（`CT-3`） |
| CV-7 | モノクロ | `FR-041` のモノクロは、`CV-6` で決まった値を無彩色にして描くこと（MUST） —— 明暗の値を選んだ後に効かせる。<br>⚠️ 赤・青・オレンジ・紫・薄い灰色は、モノクロでは同じ灰になる —— 見分けは線の太さ（`CL-2`）と `FR-030` の色以外の手段が担う |
| CV-8 | 満たす条件 | 表 T-294 の値は、白（`S-314`）と透明（`S-324`）を除き、表 T-017a の `CT-4` と `CT-5` を地（`_assets/tbl-settings.md` の `S-146`）に対して満たすこと（MUST）。<br>実績の塗りの欄が自分の値を持つ行は、`CT-3` も満たすこと（MUST）。<br>白は地と同じ色なので外す —— 別の色の塗りの縁、または別の色の縁の中の塗りとして使う色である。<br>⭐ `CT-1` / `CT-2` はラベルの縁取り（`S-169`）が担う。<br>⛔ カスタムカラーの値を、明暗のどちらの側でも自動で補正してはならない（MUST NOT）。<br>未定義の側を `CV-3` で描いたことを通知してはならない（MUST NOT） —— 選んだのは作成者である |
| CV-9 | 色の欄 | プロパティパネルの色の欄は、表 T-294 の名とカスタムカラーの入口を並べて選ばせること（MUST）。<br>並べ方は試作の色の選び（`previous-project-result/08-poc/poc-integrated.html` の `selHue`、`:940` / `:2777-2780`）に倣い、名を 1 列に表 T-294 の行の順で並べ、カスタムカラーの入口をその後に置く。<br>名の見本は、その欄が描く形（`CV-6`）の、いま描いている明暗の値で塗ること（MUST） —— 見本と描かれる色が食い違わない。<br>⭐ 欄には、選んでいる色の明るいテーマと暗いテーマの見本を並べて示すこと（MUST）（例: `ライト ■ / ダーク ■（ライトと同じ）`）。<br>未定義の側は、`CV-3` で描く値の見本に、どちらの側と同じかを添える。<br>ハイライトボックスの枠の欄には透明を並べない（`FR-019`）。<br>行の色の欄には黒を並べない（表 T-294 の `S-315`）。<br>語は `FR-038` の辞書が持つ |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧（`:1949-1950`、表 T-017a の結び）
```text
⚠️ **`NFR-007` はこの表を測る。**  
条件を満たせない色相があるときは、縁取り（`labelHaloOfFont`）で `CT-1` / `CT-2` を外す。
```
新
```text
⚠️ **`NFR-007` はこの表を測る。**  
条件を満たせない色相があるときは、縁取り（`labelHaloOfFont`）で `CT-1` / `CT-2` を外す。  
⭐ パレット色の値（`_assets/tbl-settings.md` の 表 T-294）も本表で測る —— 当てる行と外す色は 表 T-017b の `CV-8` が持つ。
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧（`:1996`、`FR-041` の RATIONALE）
```text
モノクロは描画の段で効くので、人が指定した色も無彩色で描かれる。  
```
新
```text
モノクロは描画の段で効くので、人が指定した色も無彩色で描かれる。  
⭐ 人が指定した色は、明暗の値を選んでから無彩色にする（表 T-017b の `CV-7`）。  
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧（`:7120`、`NFR-007` の RATIONALE の末尾）
```text
**モノクロ表示時のコントラストは未検証であり、本プロジェクトで測る**（彩度を落とすと色相差が明度差に化けないため、人の指定色と地の明度が近いと 3 : 1 を割りうる）。
```
新
```text
モノクロ表示時のコントラストは、パレット色の値（`_assets/tbl-settings.md` の 表 T-294）について測った —— 白（`S-314`）と透明（`S-324`）を除く 9 色の縁 ÷ 地は、モノクロでも明暗の両方で 3 : 1 以上であった（2026-09-22、測り方は同表の前文）。  
⚠️ カスタムカラーと地の明度が近いと、モノクロで 3 : 1 を割りうる（彩度を落とすと色相差が明度差に化けない） —— その値は作成者が選んだものであり、`GRS` は補正しない（表 T-017b の `CV-8`）。
```

⚠️ E-06 の「9 色」の出所: `palette-derivation.md` §4 の表。モノクロの縁 ÷ 地は、明るいテーマで最小 4.54（赤・青・オレンジ・紫）、暗いテーマで最小 7.54（薄い灰色と、黒・白・濃い灰色を除く有彩色）であり、白だけが 1.00 である。

⚠️ `FR-019`（ハイライトボックスの線色）と `UC-003` の拡張 3a は書き直さない —— 線色の値は `CV-6` が縁の値として振り分け、透明を並べないことは `FR-019` の既存の MUST NOT のまま `CV-9` が引く。起草の途中で立てた E-07（`FR-019`）と E-08（`UC-003`）はこの理由で外し、欠番とした。

### 4.2 用語集

<!-- EDIT id=E-18 file=docs/spec/_assets/tbl-glossary.md -->
旧（`:71`、`P-19`）
```text
| P-19 | `'transparent'` | 透明。<br>`strokeColor` / `fillColor` / `TaskGroup.color` が取りうる値。<br>`null`（選んでいない）とは別物である |
```
新
```text
| P-19 | `'transparent'` | 透明。<br>`strokeColor` / `fillColor` / `TaskGroup.color` が取りうる値であり、`tbl-settings.md` の 表 T-294 の保存する綴りの 1 つである（`S-324`）。<br>`null`（選んでいない）とは別物である |
```

### 4.3 原稿 `erd.json` と `erd.schema.json` —— 保存の形

⭐ **保存の形（決定 1）**: 4 列はどれも `string | null` のままで、文字列は次のどちらかである。

```text
パレット色     表 T-294 の保存する綴り（11 語）          "red"  "transparent"
カスタムカラー  <明るいテーマの値>/<暗いテーマの値>        "#c0504d/"  "/#3a5f8a"  "#c0504d/#e07a70"
               それぞれ #rrggbb か空。両方空は無い
未指定         null（テーマに追随する）
```

生成するスキーマの `pattern`（`AT-121` は `transparent` を除く）:

```text
^(?:white|black|dimgray|lightgray|red|blue|yellow|green|orange|purple|transparent|#[0-9a-fA-F]{6}/(?:#[0-9a-fA-F]{6})?|/#[0-9a-fA-F]{6})$
```

- ⭐ **往復する**: 読んだ文字列をそのまま持ち、そのまま書く。`GRS` が書く 16 進は小文字とする（読むときは大小を問わない）。
- ⭐ **古い綴りの文書の読み方**: 利用者の文書はまだ無い（`app-users-download-only` の前提で配った文書も無い）。起動時の見本文書・`sample-schedule/`・変換の案内は、決定 2 により既に名で書かれているので、そのまま読める。
  - それ以外の文字列（パネルが `DFC-566` の逸脱のもとで書いた `"#rrggbb"` の 1 つだけの値、ほかの CSS の色の名 `"gray"` など）は、スキーマの `pattern` が拒み、文書を開かない —— 表 T-220 の前文と `RS-25`（列の形が合わない）の既存の扱いであり、`S-234` の段の外の値と同じ扱いである（`01-04:6768`）。
  - ⚠️ `"#rrggbb"` だけの値を明るいテーマの値として読み替える案は採らない —— 同じ値に 2 つの綴りが生まれ、読んだものと書いたものが食い違う（問い 6 で覆せる）。
- ⚠️ 表 T-220 の前文は、1 つの列で決まる条件をスキーマに持たせ、同表に書かないことを求めている（MUST NOT）。形の条件はスキーマの `pattern` だけが持ち、表 T-220 に行を足さない。`IV-9`（塗りと輪郭が同時に透明）は 2 列の組なので同表に残る。

<!-- EDIT id=E-10 file=docs/spec/_source/erd.json -->
旧（`:1523-1535`、`AT-58` `TaskGroup.color`）
```text
     "name": "color",
     "type": "文字列",
     "nullable": "可（`null` = テーマから解く）",
     "json": {
      "kind": "string",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "行の帯の色"
     }
```
新
```text
     "name": "color",
     "type": "文字列",
     "nullable": "可（`null` = テーマから解く）",
     "json": {
      "kind": "color",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "行の帯の色。形は `AT-102` と同じ。規則は表 T-017b"
     }
```

<!-- EDIT id=E-11 file=docs/spec/_source/erd.json -->
旧（`:2407-2419`、`AT-102` `fillColor`）
```text
     "name": "fillColor",
     "type": "文字列",
     "nullable": "可（`null` = テーマから解く）",
     "json": {
      "kind": "string",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "塗り。**輪郭と同時に透明にできない**（`FR-030`）"
     }
```
新
```text
     "name": "fillColor",
     "type": "文字列",
     "nullable": "可（`null` = テーマから解く）",
     "json": {
      "kind": "color",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "塗り。`_assets/tbl-settings.md` の表 T-294 の保存する綴り（例: `red`）か、カスタムカラーの `明るいテーマの値/暗いテーマの値`（それぞれ `#rrggbb` か空、両方空は無い。例: `#c0504d/`）。規則は表 T-017b。輪郭と同時に透明にできない（`FR-007`、`05-07-design.md` の表 T-220 の `IV-9`）"
     }
```

<!-- EDIT id=E-12 file=docs/spec/_source/erd.json -->
旧（`:2422-2429`、`AT-103` `TaskVisual.strokeColor`。`"name": "strokeColor"` はファイルに 2 回あるので `"seat": 103` から錨にする）
```text
     "seat": 103,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可（同上）",
     "json": {
      "kind": "string",
      "null": true
     },
```
新
```text
     "seat": 103,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可（同上）",
     "json": {
      "kind": "color",
      "null": true
     },
```

<!-- EDIT id=E-13 file=docs/spec/_source/erd.json -->
旧（`:2771-2784`、`AT-121` `HighlightBox.strokeColor`）
```text
     "seat": 121,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可",
     "json": {
      "kind": "string",
      "null": true
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "枠の色"
     }
```
新
```text
     "seat": 121,
     "name": "strokeColor",
     "type": "文字列",
     "nullable": "可",
     "json": {
      "kind": "color",
      "null": true,
      "transparent": false
     },
     "key": "",
     "origin": "GRS",
     "exchange": "",
     "meaning": {
      "ja": "枠の色。形は `AT-102` と同じ。ただし透明は取らない（`FR-019`）"
     }
```

<!-- EDIT id=E-14 file=docs/spec/_source/erd.schema.json -->
旧（`:434-444` と `:497-500`。型 `color` と、その `transparent` を足す。1 つの塊で当てられないので、2 つの旧を順に置き換える —— まず 1 つ目）
```text
      "map",
      "array",
      "object"
     ]
    },
    "min": {
```
新
```text
      "map",
      "array",
      "object",
      "color"
     ],
     "description": "\"color\" is a colour an author chose (table T-017b of 01-04): a name of table T-294 (settings.json), or a custom colour spelled <light>/<dark>, each #rrggbb or empty and never both empty. The spellings are read from table T-294 by the generator, so they are not repeated here."
    },
    "min": {
```

<!-- EDIT id=E-14b file=docs/spec/_source/erd.schema.json -->
旧（2 つ目）
```text
    "null": {
     "type": "boolean",
     "description": "Must agree with the \"nullable\" prose: 可 is true, 否 is false."
    }
```
新
```text
    "transparent": {
     "const": false,
     "description": "Only with kind \"color\": this column may not hold the transparent name (FR-019 forbids it for a highlight box). Absent means it may."
    },
    "null": {
     "type": "boolean",
     "description": "Must agree with the \"nullable\" prose: 可 is true, 否 is false."
    }
```

### 4.4 原稿 `settings.json` と `settings.schema.json` —— 表 T-294

<!-- EDIT id=E-09 file=docs/spec/_source/settings.json -->
旧（`:4999-5003`、表 T-236 の最後の行 `S-223` の末尾と、表の閉じ）
```text
⛔ **濃さをここに書いてはならない** —— 表 T-207 の `S-102` が持つ"
     }
    }
   ]
  },
```
新
```text
⛔ **濃さをここに書いてはならない** —— 表 T-207 の `S-102` が持つ"
     }
    }
   ]
  },
  {
   "kind": "prose",
   "lines": [
    "",
    {
     "ja": "表 T-294 はパレット色（`01-04-requirements.md` の 表 T-017 の `CL-1`）が描く値である。保存するのは「保存する綴り」の欄の名だけであり、値は保存しない（同書の 表 T-017b の `CV-1`）。"
    },
    {
     "ja": "値は `previous-project-result/08-poc/poc-integrated.html` の「色と縁取り」タブの確定した組（予定の塗り・予定の縁・実績の塗り）と行の帯の規則を、各色の色相に当てて求めた。テーマの色相には追随しない。"
    },
    {
     "ja": "測り方（2026-09-22）: 比は WCAG 2.1 のコントラスト比で、丸めた `#rrggbb` の値から PoC 自身の輝度の式（同ファイル `:610-615`）で求めた。暗いテーマの地は `S-146` の 360 の色相の最悪と `#14161a` の悪いほうとした。モノクロは、その値を HSL の明度を保ったまま彩度 0 にして測った（`01-04-requirements.md` の `FR-041`）。"
    },
    ""
   ]
  },
  {
   "kind": "table",
   "id": "T-294",
   "caption": {
    "ja": "パレット色の値（成果物に埋め込む定数、文書には保存しない）"
   },
   "columns": [
    {
     "field": "id",
     "ja": "行 ID"
    },
    {
     "field": "name",
     "ja": "色"
    },
    {
     "field": "key",
     "ja": "保存する綴り"
    },
    {
     "field": "lightFill",
     "ja": "明るいテーマの塗り"
    },
    {
     "field": "lightOutline",
     "ja": "明るいテーマの縁"
    },
    {
     "field": "lightActual",
     "ja": "明るいテーマの実績の塗り"
    },
    {
     "field": "lightBand",
     "ja": "明るいテーマの行の帯"
    },
    {
     "field": "darkFill",
     "ja": "暗いテーマの塗り"
    },
    {
     "field": "darkOutline",
     "ja": "暗いテーマの縁"
    },
    {
     "field": "darkActual",
     "ja": "暗いテーマの実績の塗り"
    },
    {
     "field": "darkBand",
     "ja": "暗いテーマの行の帯"
    },
    {
     "field": "note",
     "ja": "備考"
    }
   ],
   "separator": "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
   "blank_before_header": "",
   "rows": [
    {
     "id": "S-314",
     "name": {
      "ja": "白"
     },
     "key": "`white`",
     "lightFill": {
      "colour": "#ffffff",
      "code": true
     },
     "lightOutline": {
      "colour": "#ffffff",
      "code": true
     },
     "lightActual": {
      "sameAs": "S-157"
     },
     "lightBand": {
      "sameAs": "S-146"
     },
     "darkFill": {
      "colour": "#14161a",
      "code": true
     },
     "darkOutline": {
      "colour": "#14161a",
      "code": true
     },
     "darkActual": {
      "sameAs": "S-157"
     },
     "darkBand": {
      "sameAs": "S-146"
     },
     "note": {
      "ja": "地と同じ色である（PoC の地 `:41` / `:663`）。暗いテーマでは黒と入れ替わる（`CV-6`）。⚠️ 地の上では塗りも縁も見えない —— 表 T-017a の `CT-4` と `CT-5` を問わない（`CV-8`）。実績の塗りはテーマの実績（`S-157`）を継ぐ —— PoC に白の実績の形が無い"
     }
    },
    {
     "id": "S-315",
     "name": {
      "ja": "黒"
     },
     "key": "`black`",
     "lightFill": {
      "colour": "#000000",
      "code": true
     },
     "lightOutline": {
      "colour": "#000000",
      "code": true
     },
     "lightActual": {
      "sameAs": "S-157"
     },
     "lightBand": {
      "ja": "—（行の色には選ばせない）"
     },
     "darkFill": {
      "colour": "#ffffff",
      "code": true
     },
     "darkOutline": {
      "colour": "#ffffff",
      "code": true
     },
     "darkActual": {
      "sameAs": "S-157"
     },
     "darkBand": {
      "ja": "—（行の色には選ばせない）"
     },
     "note": {
      "ja": "ラベルの文字色（`S-168`、PoC `:72` / `:106`）と同じ値である。暗いテーマでは白と入れ替わる（`CV-6`）。実績の塗りはテーマの実績（`S-157`）を継ぐ —— 黒より濃い実績は無い。行の帯を持たない —— 明るいテーマで黒の帯はラベルの黒い字を消す（`01-04-requirements.md` の 表 T-017b の `CV-9`）"
     }
    },
    {
     "id": "S-316",
     "name": {
      "ja": "濃い灰色"
     },
     "key": "`dimgray`",
     "lightFill": {
      "colour": "#575757",
      "code": true
     },
     "lightOutline": {
      "colour": "#383838",
      "code": true
     },
     "lightActual": {
      "sameAs": "S-157"
     },
     "lightBand": {
      "colour": "#e0e0e0",
      "code": true
     },
     "darkFill": {
      "colour": "#a3a3a3",
      "code": true
     },
     "darkOutline": {
      "colour": "#cccccc",
      "code": true
     },
     "darkActual": {
      "sameAs": "S-157"
     },
     "darkBand": {
      "colour": "#474747",
      "code": true
     },
     "note": {
      "ja": "PoC の実績の組（`:55-56` / `:95-96`）を彩度 0（`:2733`）で描いた値である。実績の塗りはテーマの実績（`S-157`）を継ぐ —— これより濃い灰で 3 : 1 に届く値が無い（明 2.95、暗 2.52）。行の帯は PoC の帯の縁の灰であり、帯としての根拠は PoC に無い"
     }
    },
    {
     "id": "S-317",
     "name": {
      "ja": "薄い灰色"
     },
     "key": "`lightgray`",
     "lightFill": {
      "colour": "#cccccc",
      "code": true
     },
     "lightOutline": {
      "colour": "#757575",
      "code": true
     },
     "lightActual": {
      "colour": "#575757",
      "code": true
     },
     "lightBand": {
      "colour": "#f5f5f5",
      "code": true
     },
     "darkFill": {
      "colour": "#424242",
      "code": true
     },
     "darkOutline": {
      "colour": "#a8a8a8",
      "code": true
     },
     "darkActual": {
      "colour": "#a3a3a3",
      "code": true
     },
     "darkBand": {
      "colour": "#333333",
      "code": true
     },
     "note": {
      "ja": "PoC の予定の組（`:53-55` / `:93-95`）を彩度 0 で描いた値である"
     }
    },
    {
     "id": "S-318",
     "name": {
      "ja": "赤"
     },
     "key": "`red`",
     "lightFill": {
      "colour": "#e3b9b5",
      "code": true
     },
     "lightOutline": {
      "colour": "#a94c42",
      "code": true
     },
     "lightActual": {
      "colour": "#8c2c21",
      "code": true
     },
     "lightBand": {
      "colour": "#f9f1f1",
      "code": true
     },
     "darkFill": {
      "colour": "#58312d",
      "code": true
     },
     "darkOutline": {
      "colour": "#d08880",
      "code": true
     },
     "darkActual": {
      "colour": "#dc766a",
      "code": true
     },
     "darkBand": {
      "colour": "#3c2c2a",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 6（`:707`）に、確定した組（`:53-56` / `:93-96`）を当てた値である"
     }
    },
    {
     "id": "S-319",
     "name": {
      "ja": "青"
     },
     "key": "`blue`",
     "lightFill": {
      "colour": "#b5c9e3",
      "code": true
     },
     "lightOutline": {
      "colour": "#426ea9",
      "code": true
     },
     "lightActual": {
      "colour": "#21508c",
      "code": true
     },
     "lightBand": {
      "colour": "#f1f4f9",
      "code": true
     },
     "darkFill": {
      "colour": "#2d3f58",
      "code": true
     },
     "darkOutline": {
      "colour": "#80a3d0",
      "code": true
     },
     "darkActual": {
      "colour": "#6a9cdc",
      "code": true
     },
     "darkBand": {
      "colour": "#2a323c",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 214（`:701`。`themeHue` の既定と同じ）に、確定した組を当てた値である"
     }
    },
    {
     "id": "S-320",
     "name": {
      "ja": "黄"
     },
     "key": "`yellow`",
     "lightFill": {
      "colour": "#dfd6a9",
      "code": true
     },
     "lightOutline": {
      "colour": "#8c7d36",
      "code": true
     },
     "lightActual": {
      "colour": "#79691c",
      "code": true
     },
     "lightBand": {
      "colour": "#f9f8f1",
      "code": true
     },
     "darkFill": {
      "colour": "#58502d",
      "code": true
     },
     "darkOutline": {
      "colour": "#d0c380",
      "code": true
     },
     "darkActual": {
      "colour": "#dcc96a",
      "code": true
     },
     "darkBand": {
      "colour": "#3c392a",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 50（`:705`）。明るいテーマは PoC の寄せの規則（`:2750-2760`）で k = 8 寄せた —— 寄せないと縁 ÷ 地が 2.89 : 1 で `CT-4` を割る。k は、地と行の地（`S-164` / `S-166` / `S-167`、360 の色相の最悪）の両方で `CT-3` ・ `CT-4` ・ `CT-5` を満たす最小の値である"
     }
    },
    {
     "id": "S-321",
     "name": {
      "ja": "緑"
     },
     "key": "`green`",
     "lightFill": {
      "colour": "#afe1bf",
      "code": true
     },
     "lightOutline": {
      "colour": "#3c9a5b",
      "code": true
     },
     "lightActual": {
      "colour": "#1f8340",
      "code": true
     },
     "lightBand": {
      "colour": "#f1f9f3",
      "code": true
     },
     "darkFill": {
      "colour": "#2d583b",
      "code": true
     },
     "darkOutline": {
      "colour": "#80d09b",
      "code": true
     },
     "darkActual": {
      "colour": "#6adc90",
      "code": true
     },
     "darkBand": {
      "colour": "#2a3c30",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 140（`:703`）。明るいテーマは `S-320` と同じ規則で k = 4 寄せた —— 寄せないと縁 ÷ 地が 2.96 : 1 で `CT-4` を割る"
     }
    },
    {
     "id": "S-322",
     "name": {
      "ja": "オレンジ"
     },
     "key": "`orange`",
     "lightFill": {
      "colour": "#e3cab5",
      "code": true
     },
     "lightOutline": {
      "colour": "#a97242",
      "code": true
     },
     "lightActual": {
      "colour": "#8c5321",
      "code": true
     },
     "lightBand": {
      "colour": "#f9f5f1",
      "code": true
     },
     "darkFill": {
      "colour": "#58412d",
      "code": true
     },
     "darkOutline": {
      "colour": "#d0a680",
      "code": true
     },
     "darkActual": {
      "colour": "#dc9f6a",
      "code": true
     },
     "darkBand": {
      "colour": "#3c322a",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 28（`:706`）に、確定した組を当てた値である"
     }
    },
    {
     "id": "S-323",
     "name": {
      "ja": "紫"
     },
     "key": "`purple`",
     "lightFill": {
      "colour": "#d8b5e3",
      "code": true
     },
     "lightOutline": {
      "colour": "#8f42a9",
      "code": true
     },
     "lightActual": {
      "colour": "#72218c",
      "code": true
     },
     "lightBand": {
      "colour": "#f7f1f9",
      "code": true
     },
     "darkFill": {
      "colour": "#4d2d58",
      "code": true
     },
     "darkOutline": {
      "colour": "#bc80d0",
      "code": true
     },
     "darkActual": {
      "colour": "#c06adc",
      "code": true
     },
     "darkBand": {
      "colour": "#382a3c",
      "code": true
     },
     "note": {
      "ja": "PoC の色相 285（`:709`）に、確定した組を当てた値である"
     }
    },
    {
     "id": "S-324",
     "name": {
      "ja": "透明"
     },
     "key": "`transparent`",
     "lightFill": {
      "ja": "描かない"
     },
     "lightOutline": {
      "ja": "描かない"
     },
     "lightActual": {
      "ja": "描かない"
     },
     "lightBand": {
      "ja": "描かない"
     },
     "darkFill": {
      "ja": "描かない"
     },
     "darkOutline": {
      "ja": "描かない"
     },
     "darkActual": {
      "ja": "描かない"
     },
     "darkBand": {
      "ja": "描かない"
     },
     "note": {
      "ja": "塗りも線も描かない。`null`（選んでいない）とは別物である（`_assets/tbl-glossary.md` の `P-19`）"
     }
    }
   ]
  },
```

⚠️ E-09 の新しい文のうち、原稿の `note` と前文に `**` は無い（`settings.json` の既存の `**` は旧に残した分だけである）。

<!-- EDIT id=E-15 file=docs/spec/_source/settings.schema.json -->
旧（`:455-471`、列の `field` の列挙）
```text
        "description": "The English name the cells of this column are keyed by. 値 is one field even though table T-206 uses that column for what the value IS while the T-211 shape uses it for the value itself; telling those apart is a promotion, not a rename. light / dark / hue belong to table T-236 alone: a colour is ONE decision with two renderings, so the pair is one ROW with two cells rather than two tables whose rows could silently drift apart, and hue says whether the row follows themeHue (S-73) or is fixed.",
        "enum": [
         "id",
         "group",
         "key",
         "name",
         "unit",
         "type",
         "default",
         "value",
         "min",
         "max",
         "note",
         "light",
         "dark",
         "hue"
        ]
```
新
```text
        "description": "The English name the cells of this column are keyed by. 値 is one field even though table T-206 uses that column for what the value IS while the T-211 shape uses it for the value itself; telling those apart is a promotion, not a rename. light / dark / hue belong to table T-236 alone: a colour is ONE decision with two renderings, so the pair is one ROW with two cells rather than two tables whose rows could silently drift apart, and hue says whether the row follows themeHue (S-73) or is fixed. lightFill .. darkBand belong to table T-294 alone, for the same reason: one palette colour is one ROW holding its four drawn forms in both themes.",
        "enum": [
         "id",
         "group",
         "key",
         "name",
         "unit",
         "type",
         "default",
         "value",
         "min",
         "max",
         "note",
         "light",
         "dark",
         "hue",
         "lightFill",
         "lightOutline",
         "lightActual",
         "lightBand",
         "darkFill",
         "darkOutline",
         "darkActual",
         "darkBand"
        ]
```

<!-- EDIT id=E-16 file=docs/spec/_source/settings.schema.json -->
旧（`:540-543`、行の `properties`）
```text
       "hue": {
        "$ref": "#/$defs/cell"
       },
       "json": {
```
新
```text
       "hue": {
        "$ref": "#/$defs/cell"
       },
       "lightFill": {
        "$ref": "#/$defs/cell"
       },
       "lightOutline": {
        "$ref": "#/$defs/cell"
       },
       "lightActual": {
        "$ref": "#/$defs/cell"
       },
       "lightBand": {
        "$ref": "#/$defs/cell"
       },
       "darkFill": {
        "$ref": "#/$defs/cell"
       },
       "darkOutline": {
        "$ref": "#/$defs/cell"
       },
       "darkActual": {
        "$ref": "#/$defs/cell"
       },
       "darkBand": {
        "$ref": "#/$defs/cell"
       },
       "json": {
```

### 4.5 原稿 `row-id-prefixes.json` と `display-words.json`

<!-- EDIT id=E-17 file=docs/spec/_source/row-id-prefixes.json -->
旧（`:205-212`、`CU` の項）
```text
   "prefix": "CU",
   "words": "Cursor",
   "owner": "spec",
   "means": {
    "ja": "画面に立てるカーソルの種別"
   }
  },
```
新
```text
   "prefix": "CU",
   "words": "Cursor",
   "owner": "spec",
   "means": {
    "ja": "画面に立てるカーソルの種別"
   }
  },
  {
   "prefix": "CV",
   "words": "Colour Value",
   "owner": "spec",
   "means": {
    "ja": "作成者が選んだ色の持ち方と描き方"
   }
  },
```

<!-- EDIT id=E-19 file=docs/spec/_source/display-words.json -->
旧（`scaleEcho` の節の直前。`CR-550` が書き直す `dualCursorSpan` の節とは重ならない）
```text
  }
 ],
 "scaleEcho": [
```
新
```text
  }
 ],
 "colourNames": [
  {
   "spelling": "white",
   "text": {
    "ja": "白",
    "en": "White"
   }
  },
  {
   "spelling": "black",
   "text": {
    "ja": "黒",
    "en": "Black"
   }
  },
  {
   "spelling": "dimgray",
   "text": {
    "ja": "濃い灰色",
    "en": "Dark gray"
   }
  },
  {
   "spelling": "lightgray",
   "text": {
    "ja": "薄い灰色",
    "en": "Light gray"
   }
  },
  {
   "spelling": "red",
   "text": {
    "ja": "赤",
    "en": "Red"
   }
  },
  {
   "spelling": "blue",
   "text": {
    "ja": "青",
    "en": "Blue"
   }
  },
  {
   "spelling": "yellow",
   "text": {
    "ja": "黄",
    "en": "Yellow"
   }
  },
  {
   "spelling": "green",
   "text": {
    "ja": "緑",
    "en": "Green"
   }
  },
  {
   "spelling": "orange",
   "text": {
    "ja": "オレンジ",
    "en": "Orange"
   }
  },
  {
   "spelling": "purple",
   "text": {
    "ja": "紫",
    "en": "Purple"
   }
  },
  {
   "spelling": "transparent",
   "text": {
    "ja": "透明",
    "en": "Transparent"
   }
  }
 ],
 "colourField": [
  {
   "part": "custom",
   "text": {
    "ja": "カスタムカラー",
    "en": "Custom color"
   }
  },
  {
   "part": "light",
   "text": {
    "ja": "ライト",
    "en": "Light"
   }
  },
  {
   "part": "dark",
   "text": {
    "ja": "ダーク",
    "en": "Dark"
   }
  },
  {
   "part": "sameAsLight",
   "text": {
    "ja": "（ライトと同じ）",
    "en": " (same as light)"
   }
  },
  {
   "part": "sameAsDark",
   "text": {
    "ja": "（ダークと同じ）",
    "en": " (same as dark)"
   }
  }
 ],
 "scaleEcho": [
```

⭐ **E-19 の語の出所。**
- ja の色の名 11 は 表 T-017 の `CL-1` の字そのもの。
- ja の `ライト` ・ `ダーク` ・ `（ライトと同じ）` は前に立つ者の点 1 の字で、利用者が「F7: OK」で受けた。`（ダークと同じ）` と `カスタムカラー` は、それと F7 の「カスタムカラー」から起草者が組んだ。
- en の 16 語は起草者の提案を、利用者が 2026-09-22 に提案のとおり受けた（「英語は治安通り」 —— 「推奨通り」の打ち違い。11.1 節の 7）。

### 4.6 生成器（形で示す）

<!-- EDIT id=E-20 file=(tools。形で示す) -->
旧
```text
(docs/spec/_source/erd_json_to_schema.py, erd_json_to_md.py, tools/generate_entity_types.py,
 tools/generate_json_schema_validator.py, tools/generate_display_words.py as on 4015736e)
```
新
```text
docs/spec/_source/erd_json_to_schema.py
  1. frag(): kind 'color' ->
       {"type": ["string", "null"] if null else "string",
        "pattern": ^(?:<the key column of table T-294, in row order>|
                      #[0-9a-fA-F]{6}/(?:#[0-9a-fA-F]{6})?|/#[0-9a-fA-F]{6})$ }
     with 'transparent' left out of the names when the column says "transparent": false.
     The names are READ from settings.json table T-294 (column "key", backticks stripped),
     never written in erd.json or in this generator.
docs/spec/_source/erd_json_to_md.py
  2. accept kind 'color' wherever a kind is switched on (the printed 型 cell is the
     manuscript's "type", which stays 文字列).
tools/generate_entity_types.py
  3. ts_type(): 'color' -> 'string' (the stored text; the parser lives in the entity).
  4. a new generated constant beside SCHEDULE_COLOURS (T-236), read from table T-294:
       COLOUR_NAME_VALUES: { [spelling]: { rowId,
         light: { fill, outline, actual, band }, dark: { fill, outline, actual, band } } }
     each form is '#rrggbb', null (描かない), or { sameAs: 'S-nnn' } (resolved by the
     renderer through themed(), because S-146 / S-157 follow the hue).
tools/generate_json_schema_validator.py
  5. EXPRESSED gains 'pattern' (eleven keywords); the walker in
     src/adapter/document-codec/json-codec.ts tests a string against it (new RegExp,
     no flags). The generator still refuses any twelfth keyword.
tools/generate_display_words.py
  6. 'colourNames': keyed by 'spelling'; the roster is READ from table T-294's key column
     (not held here), so a twelfth colour needs no generator edit.
     'colourField': keyed by 'part'; held keys
       COLOUR_FIELD_PARTS = ('custom', 'light', 'dark', 'sameAsLight', 'sameAsDark')
     Both sections go into the tuple that lists the held sections (:536, beside
     'scaleEcho'). ('rowId' is not their key: neither is a row of a 01-04 table.)
No new generator: check 27's count of generated artifacts does not move.
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-A | 仕様 ↔ コーデック・use case・`Agent API` | 4 列（`TaskGroup.color` / `fillColor` / `strokeColor` / `HighlightBox.strokeColor`）の値は `string \| null`。文字列は 4.3 節の `pattern` に合うものだけ。`GRS` が書く 16 進は小文字。命令 `CM-22` / `CM-30` / `CM-55` の形は変わらず、この文字列を運ぶ |
| S-B | 仕様 ↔ 描く側 | 生成される `COLOUR_NAME_VALUES`（4.6 節の 4）。描く値は `CV-6`: 塗り → `fill`、実績バーの塗り → `actual`、縁（予定・実績・ハイライトボックス） → `outline`、行の帯 → `band`。`null` は描かない（透明）。`{ sameAs }` は `themed(rowId)` で解く。カスタムカラーは `CV-3`（未定義の側は他方）。モノクロは解いた後に `achromatic()`（`CV-7`） |
| S-C | 仕様 ↔ パネル・訳者 | カスタムカラーを選んだときの新しい値は `CV-4`: いまの明暗の側だけを選んだ値にし、他方は「前がカスタムカラーならその側の値、でなければ空」。パレット色を選んだら名だけ（`CV-5`） |
| S-D | 仕様 ↔ パネル | 生成される `display-words.json` の節 `colourNames`（`spelling` で引く、11 項）と `colourField`（`part` で引く: `custom` / `light` / `dark` / `sameAsLight` / `sameAsDark`） |

---

## 6. グラフ（`4015736e` で測った）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 指している箇所 |
|---|---|---|
| `FR-007` | 0 / 7 | `LM-18`（`01-04:216`）、5.3（`05-07:387`）、表 T-108 の `CM-22` ・ `CM-23` ・ `CM-24` ・ `CM-31`（`tbl-glossary.md:428-437`）、表 T-016（`tbl-property-items.md:43`）。⭐ 本書は STATEMENT に 1 文足すだけで、引かれる「パレット色から選ばせる」「透明の組を許さない」は動かない |
| 表 T-017 | — | `FR-007` だけ |
| `CL-1` | 0 / 0 | 浮いている（Q3 の 3 手と同じ）。E-02 で 表 T-294 を指す |
| 表 T-017a | — | `FR-007` だけ |
| `CT-3` / `CT-4` | 0 / 1 | どちらも `LM-18` だけ。⭐ 本書は 2 行を動かさず、`CV-8` から引く |
| `CT-5` | 0 / 0 | — |
| `FR-041` | 7 / 23 | `FR-003` ・ `FR-007` ・ `FR-031` ・ `FR-043` ・ `FR-013` ・ `FR-074` ・ `FR-039` ほか。⭐ 本書は RATIONALE に 1 文足すだけで、STATEMENT と MUST の段は動かない |
| `NFR-007` | 4 / 11 | `FR-007` ・ `FR-101` ・ `FR-092` ・ `FR-036`、`LM-` の行、`tbl-settings.md` の 5 か所。⭐ 本書は RATIONALE の末尾 1 文を書き直すだけ |
| `FR-019` / `FR-042` / `UC-003` | 6 / 28 ・ 4 / 16 ・ 16 / 34 | 書き直さない（4.1 節の末尾）。`CV-6` / `CV-9` が引く |
| `FR-030` | 10 / 12 | 書き直さない。`CV-7` と `AT-102` の意味が引く |
| `P-19` | 0 / 1 | `IV-9`（`05-07:1236`）。⭐ `IV-9` は `P-19` の値を引くだけで、E-18 のあとも同じ `'transparent'` である |
| `IV-9` | 0 / 0 | 書き直さない |
| 表 T-236 | — | 要求 14 件以上。⭐ 本書は表 T-236 に 1 行も足さない（表 T-294 は隣の別の表） |
| `AT-58` / `AT-102` / `AT-103` / `AT-121` | どれも 0 / 0 | — |
| `PR-12` / `PR-19` | 1 / 1 ・ 0 / 0 | `PR-12`: `FR-006`。書き直さない（入力の型は「色」のまま） |
| `CM-22` / `CM-30` / `CM-55` / `LM-18` | どれも 0 / 0 | 書き直さない（S-A）。`LM-18` は問い 4 |

⭐ 導いた条項（`CV-4` の他方を保つ読み、決定 5 の原色の範囲、`CV-9` の見本）について、届いた行ごとに `rulings.md` を引いた: 当たるのは `JDG-300` の Q3（本書が覆す。利用者の F7）だけである。

### 6.2 `induced.py`（11 の種）

種: `FR-007 T-017 T-017a FR-041 NFR-007 FR-019 FR-042 LM-18 IV-9 P-19 T-236` —— 解決 11/11、種の中の辺 11、閉路 0。1 つずつ書いてよい。

---

## 7. 数の予測（`4015736e` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 | 内訳 |
|---|--:|--:|---|
| tables | 181 | 183 | ＋ 表 T-017b、表 T-294 |
| figures | 25 | 25 | — |
| rows | 2245 | 2265 | ＋ `CV-1` 〜 `CV-9`（9）、`S-314` 〜 `S-324`（11） |
| uids | 162 | 162 | 新しい要求 0 |
| 接頭辞 | 160 | 161 | ＋ `CV` |
| `tbl-settings.md` の `\| S-` の行 | 301 | 312 | ＋ 11 |
| 検査 23 の除外数 | — | 動かない | `erd.json` の型と NULL 可の欄を変えない（決定 11）。新しい原稿の散文はすべて `ja` の辞書の中にある |

---

## 8. 当てる順と commit の割り方（規則 02 の 3.5 節: 原稿と読む側は同じ波）

```
0. answer section 11 first (questions 1-3 change cells of E-09 and a row of E-03)
1. re-measure section 2's identifiers on every branch tip (rule 02 section 2.5)
2. spec   E-01..E-06, E-18, E-10..E-14b, E-09, E-15..E-17, E-19
3. tools  E-20 (1-6) -- the schema generator MUST learn 'color' before npm run gen,
          or erd_json_to_schema.py stops on an unknown kind
4. npm run gen ; npm run gen:check
5. code (same wave; the generated constants are read by nothing until then):
     see section 9
6. strictdoc export docs/spec into a TEMP dir (never into docs/) + check-render.py
   bash .claude/skills/spec-graph-check/check.sh (diff against a before-run)
   npx vitest run
```

- ⚠️ **1 つの worktree の中で仕様だけを当てると赤が出る** —— 生成されるスキーマが `"#rrggbb"` だけの値を拒み、`tests/` の色の値（9 節）が落ちる。門は仕様とコードを合わせた木で打つ。
- ⚠️ 基準線: 検査 23 は動かない（7 節）。検査 39（MUST を逐語で持つ試験）は `CV-` の MUST の数だけ動きうる —— 仕様だけを読む試験者が逐語の試験を足して止める。止まらなければ利用者に問う（本書に許しは無い）。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

`palette-derivation.md` §6 の一覧を `4015736e` で引き直した（行番号はこの木のもの）。

| 所 | 何が偽になるか | 直し |
|---|---|---|
| `src/adapter/document-codec/json-codec.ts`（生成される節点表と、手書きの歩き手） | `pattern` を知らない | 4.6 節の 5 |
| `src/entity/document-model/schedule/schedule.ts:271` ・ `:273` ・ `:321`（型）、`:441-442`（列の形 `kind: 'string'`）、`:1032`（`TRANSPARENT`）、`:1478`（`IV-9`） | 型は `string \| null` のまま。カスタムカラーを分ける純粋な関数（`CV-2` / `CV-3`）をここに置く | S-A |
| `src/use-case/edit-document/task-appearance.ts:127` ・ `task-group-look.ts:24` ・ `edit-annotation.ts:258` の STOP（`PND-494`） | 書く側の検査が決まった | 4.3 節の `pattern` で拒む。STOP を消す |
| `src/adapter/input-command-translator/field-commit.ts:226`（`case 'color'`） | `CV-4` / `CV-5` の値を組む | S-C |
| `src/adapter/screen-renderer/properties-panel.ts:300` ・ `:312`（`COLOUR_COLUMNS`）、`src/framework/dom-screen-surface/properties-panel-drawing.ts:133-134`（`DEVIATION` `DFC-566`）・ `:240` | 宿主の色選びだけ → 名の見本とカスタムカラーの入口、2 つの見本（`CV-9`） | S-D。`DEVIATION` を消す |
| `src/adapter/svg-renderer/svg-renderer.ts:126-136`（`achromatic`、`DFC-684`）・ `:140-147`（`colourOf`） | 名が素通りする | 名を先に解き、解いた値に `achromatic`（`CV-7`） |
| `src/adapter/svg-renderer/schedule-task-figures.ts:130-145`（`paintOf`）・ `:361-375` | 実績を予定と同じ塗りで描く（`CT-3` が 1.00） | 実績の塗りは `actual` の形（`CV-6`、S-B） |
| `src/adapter/svg-renderer/schedule-grid.ts:222-230` | 行の色をそのまま帯に塗る | `band` の形（`CV-6`） |
| `src/adapter/svg-renderer/schedule-overlays.ts`（ハイライトボックスの枠 `strokeOfBox`） | 名がそのまま `stroke` に出る | `outline` の形 |
| 試験: `tests/unit/uf-32.test.ts`（7）・`edit-task.test.ts`（4）・`uf-19.test.ts`（4）・`cr-432-svg-renderer-branches-the-spec-decides.test.ts`（3）・`cr-432-edit-task-group-branches-the-spec-decides.test.ts`（2）・`edit-annotation.test.ts`（2）・`uf-64.test.ts`（2）・`fr-032-a-nameless-task-can-be-deleted.test.ts`（1）・`t-023c-selected-line-width.test.ts`（1） | 16 進 1 つだけの値や CSS の色の名を書いている（数は `palette-derivation.md` §6 が数えた行数） | 名か `#rrggbb/` の形へ |
| 起動時の見本文書・`tools/generate_startup_template.py:869-881`・`sample-schedule/`・`docs/guides/schedule-to-grs-json/prompt-*.md` | ⭐ 何も偽にならない（決定 2） | 直さない。案内の `:34` に「CSS の色ではなく `GRS` のパレットの名」と 1 行添えるのは任意 |
| `docs/development-records/`: `PND-494` を閉じる、`DFC-566` ・ `DFC-684` を直ったものへ | 台帳 | `CR-549` の型の記帳 |

---

## 10. ⛔ この変更でやらないこと

- `LM-18` と、暗いテーマの予定の塗り ÷ 行の地が 1.3 を割る件（問い 4）—— 閾値を本書で決めない（`palette-derivation.md` §3 の最後から 2 つ目の注）。`defects.md` の `DFC-728`（仕様待ち）に測った比と測り方を記した（11.1 節の 4）。
- 表 T-236 の `S-164` の注「いまは 1 本も描かれていない」が古いこと（`schedule-grid.ts:52` が偶数の行に描いている）—— 本書の範囲外。台帳へ（`palette-derivation.md` §3 の最後の注）。
- `rulings.md` ・ `pending-decisions.md` ・ `changelog.md` ・ `@provisional` の印。`defects.md` は `DFC-728` の 1 行を足すだけである。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 推奨と理由 |
|---|---|---|
| 1 | ⛔ **実績バーがカスタムカラーで予定と同じ塗りになる**（いまは全色でそうである。`paintOf` が予定と実績に同じ色を渡す。実績 ÷ 予定 = 1.00 で `CT-3` と `01-04:1952` の「実績を濃く描くこと（MUST）」を割る）。パレット色は本書の「実績の塗り」の欄で直る（`CV-6`）。カスタムカラーは (a) 同じ塗りのまま、`01-04:1952` に「カスタムカラーを除く」と足す (b) PoC の組の差（明: 明度 −46・彩度 +16、暗: 明度 +38・彩度 +30。`:53-55` / `:93-95`）でカスタムカラーから実績の値を導く | (b)。`01-04:1952` の MUST を保ち、新しい閾値を作らない（PoC の差をそのまま使う）。⚠️ (b) は点 2（自動で補正しない）に触れない —— 補正ではなく実績という別の形を導くだけである。ただし閾値の話に近いので決めずに問う |
| 2 | 白・黒・濃い灰色の「実績の塗り」の欄（PoC に形が無い。黒と濃い灰色の上では、より濃い灰で 3 : 1 に届く値が無い —— 濃い灰色 明 2.95、暗 2.52） | テーマの実績（`S-157` に同じ）。`palette-derivation.md` §3 の候補であり、表の欄を空けない |
| 3 | 黒を行の色にしたときの帯（PoC に帯としての根拠が無い。明るいテーマで黒の帯はラベルの黒い字を消し、暗いテーマでは白の帯になる） | 行の色の欄には黒を並べない（`CV-9`、表 T-294 の `S-315`）。代わりの帯の値を発明しない |
| 4 | ⛔ **暗いテーマで、予定の塗り ÷ 行の地が 1.3 を割る**（パレットで 1.00 〜 1.39、テーマの青でも `#2d3f58` ÷ `hsl(H 18% 20%)` = 1.05）。`CT-5` の「背景」を地だけと読めばどの色も満たすが、行の帯の上では満たさない。直すには k = 16 〜 22 寄せる（見た目が変わる） | 本書では決めない。`LM-18` に並べて記し、表 T-026 の `RC-1` で測り直す対象にする案を推す（パレットに限らず仕様全体の件である） |
| 5 | 実績の塗りを予定と別の値にする（問い 1 の上半分、パレット色の分）を、本書の範囲で直してよいか | よい。`CV-6` と表 T-294 の「実績の塗り」の欄で直す。コードは 9 節の `paintOf` |
| 6 | 古い綴り（パネルが書いた `"#rrggbb"` だけの値）を読むか | 読まない（`RS-25` で拒む）。利用者の文書はまだ無く、読み替えると同じ値に綴りが 2 つできる。⚠️ 決定 1 の対象型（`{ "light", "dark" }`）を選び直す場合も、ここで一緒に答える |
| 7 | 辞書の en の 16 語（色の名 11、`Custom color` ・ `Light` ・ `Dark` ・ ` (same as light)` ・ ` (same as dark)`） | 起草者の提案。利用者の語を待つ |
| 8 | 色の欄の見本の並べ方（1 列か格子か。S1 の残り） | 見本の HTML（`ui-numbers-by-touchable-sample`）で決める。本書は並べることだけを定める |

### 11.1 前に立つ者の判断（2026-09-22）

| # | 前に立つ者の判断（2026-09-22） | 理由 | 本書へ入れた所 |
|---|---|---|---|
| 1・5 | 実績バーは、カスタムカラーでもパレット色でも、試作の差で予定より濃く描く。パレット色は表 T-294 の「実績の塗り」の欄、カスタムカラーは予定の値から試作の差（明: 彩度 +16・明度 −46、暗: 彩度 +30・明度 +38）で導く | 既存の `CT-3`（実績 ÷ 予定 ≧ 3 : 1）と表 T-017a の結びの「実績を濃く描くこと（MUST）」がそれを求める | E-03 の `CV-6` |
| 2 | 白・黒・濃い灰色の実績の塗りは、起草のとおりテーマの実績（`S-157`）を継ぐ | 起草の推奨のとおり | E-09（変えない） |
| 3 | 黒は行の色（帯）の選びから外す | 黒い帯は行の名を読めなくする | E-03 の `CV-9`、E-09 の `S-315`（変えない） |
| 4 | 暗いテーマで予定の塗り ÷ 行の帯が 1.3 : 1 を割る件は、閾値を決めない。`defects.md` に新しい行 `DFC-728` として、`LM-18` のそばに、測った比と測り方を添えて「仕様待ち」で記す | 閾値は利用者の見た目の判断であり、本書が決めない。「裁定待ち」ではなく「仕様待ち」—— 仕様（`LM-18` と表 T-026 の `RC-1`）が測り直しの場を既に持っている | `defects.md` の `DFC-728`（10 節） |
| 6 | `"#rrggbb"` だけの古い綴りは、読むときに拒む（`RS-25`）。起草のとおり | 利用者の文書はまだ無く、見本文書と案内は名で書かれている | 4.3 節（変えない） |
| 7 | en の 16 語は利用者が提案のとおり受けた（利用者、2026-09-22: 「英語は治安通り」 —— 「推奨通り」の打ち違い） | 利用者の語 | E-19 の注から「利用者の語を待つ」を消した |
| 8 | 色の欄の見本は、試作の色の選び（`poc-integrated.html` の `selHue`、`:940` / `:2777-2780`）の並べ方に倣う —— 名を 1 列に並べる | 試作が参照実装である | E-03 の `CV-9` |

---

## 12. 測り方の再現

```
# totals (before)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | grep "tables="
#   -> tables=181  figures=25  rows=2245  uids=162   (4015736e, 2026-09-22)
python -c "import json;print(len(json.load(open('docs/spec/_source/row-id-prefixes.json',encoding='utf-8'))['prefixes']))"
#   -> 160
grep -c "^| S-" docs/spec/_assets/tbl-settings.md      # -> 301

# the colour columns of erd.json (R1.5)
grep -n -i '"name": "[a-zA-Z]*colou\?r[a-zA-Z]*"' docs/spec/_source/erd.json
#   -> 4 (:1523 color, :2407 fillColor, :2423 strokeColor, :2772 strokeColor)

# free identifiers: every local and remote branch tip (64 refs), docs/ change-request/ src/ tools/ tests/
#   git grep -ohE "\bT-29[4-9]\b|\bS-31[4-9]\b|\bS-32[0-9]\b|\bCV-[0-9]+\b|\bT-017b\b" <ref> -- docs change-request src tools tests
#   -> 0 hits on every ref (2026-09-22)
#   CL-3..CL-5: used by docs/review/inventory/A01-agent-api-spec.md:98-100 (another meaning) -> not taken

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <ID>     # each ID of 6.1
strictdoc export docs/spec --formats=json --output-dir scratch/spec-check/sd-out --no-parallelization
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <the 11 seeds of 6.2>

# every old block of section 4 occurs exactly once in its file:
#   read each "<!-- EDIT id=... file=... -->", take the next two ```text blocks as old/new,
#   assert text.count(old) == 1 on the file (LF)
#   -> 18 of 18 file edits occur exactly once (tool edits are described, not text edits)
# E-09 and E-19 were built by a script from the values of section 1.1 and checked by
#   applying every edit to a COPY of the six JSON files it touches and loading them with json.loads,
#   and validating settings.json against the edited settings.schema.json and erd.json against
#   the edited erd.schema.json  -> all six load; settings.json and erd.json validate (jsonschema 4.26, 2026-09-22); the pattern accepts red / transparent / #c0504d/ / /#3a5f8a and refuses / #c0504d gray
```
