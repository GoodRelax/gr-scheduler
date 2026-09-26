# CR-585 — モノクロでは、罫・パネルの地・強調の色も灰で描き、画面と書き出した絵を揃える

> 起草の状態: 起草した（2026-09-26）。利用者の裁定 `JDG-700`（重複責務の調査の問い 1 への答え。逐語は 0.1 節）を受けた。⛔ 仕様・コード・試験はまだ 1 文字も変えていない。
> 読んだ木: `cr-organise` 87d98a47。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
> ID の帯: 調整役から `CR-585` と仮の番号の帯 90500 〜 90599 を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: 波 W2 の中で `CR-572` → `CR-557` の後。どちらも `FR-041` の「明暗テーマ（`themePreference`）とは別の値である」の行を書き換え（`CR-572` の 16.5 節、`CR-557` の E-01）、`CR-557` はその後ろに色相の欄の段落を足す。本書の旧はその 2 本を当てた後の文である（4 節・13 節）。
> 閉じるもの: `DFC-1052` の仕様の側（`FR-041` が名指さない色をモノクロで灰にするかの `裁定待ち`）。コードの側は 9 節（`DFC-1052` の案 ①）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-700` | 「全部灰色にする (推奨)」 | `themeMonochrome` のとき、`FR-041` が名指しする色（`S-146` ほか）に加え、罫線 `S-149`・パネルの地 `S-150`・強調色 `S-151` も画面で灰色にする。画面と書き出した絵を揃える | 本書の骨格（4 節の E-01 の 1 文目と 2 文目） |
| `JDG-452` | 「Q7. 選び方の形 → 推奨どおり (i) 」 | 選べる色相は 表 T-305 の 10 行。見本は各色相の `S-151` で塗り、モノクロを効かせない（`CR-557` が当てる） | `JDG-700` のただ 1 つの例外として残す（E-01 の 3 文目、決定 1） |

問うた場面（`JDG-700` の問いの文、同じ行から写した）: 「白黒の主題のとき、FR-041 が名指ししない画面の色（罫線 S-149・パネルの地 S-150・強調色 S-151）も灰色にするか」。出どころは `docs/review/duplicate-survey-2026-09-26.md` の 7 節の Q1（群 `G62x`）。

### 0.2 調べた結果（87d98a47）

1. **表 T-236 の色相の欄が ○ の行は 13 である**（`docs/spec/_source/settings.json` の `hue` が `○` の行: `S-146` `S-149` `S-150` `S-231` `S-151` `S-155` 〜 `S-158` `S-164` 〜 `S-167`）。`FR-041` の STATEMENT が名指す「色を指定していない `Task` と `TaskGroup`・行の帯・地の色」はそのうち 9（`S-146`・`S-155` 〜 `S-158`・`S-164` 〜 `S-167`）、`JDG-700` が足すのが 3（`S-149`・`S-150`・`S-151`）。残る 1 つ `S-231`（掴み代の印）は、同表の備考が「`S-149` の明度を、パネルの地（`S-150`）から 5 ポイント遠ざけた色である —— 色相と彩度は `S-149` のままとし、明度だけを動かす」と定める（`docs/spec/_assets/tbl-settings.md:459`）。⇒ 「色相の欄が ○ の行すべて」と「名指す 9 ＋ 裁定の 3 ＋ `S-149` を継ぐ 1」は同じ 13 行である。
2. **コードは今、3 通りに割れている。**
   - 日程の図: `colourOf`（`src/adapter/svg-renderer/svg-renderer.ts:139-146`）は ○ の行を、モノクロなら `achromatic`（`:125-135`）で灰にする。罫 `S-149`（`schedule-grid.ts:268`）も選択の枠 `S-151`（`schedule-overlays.ts:209`・`:237`、`schedule-task-figures.ts:429`、`svg-renderer.ts:633`）も灰になる。
   - 書き出した絵の枠: `chromeGround`（`src/adapter/image-exporter/image-exporter.ts:52-55`）は `colourOf('S-150', …, settings.themeMonochrome)`、`dividerLinesSvg`（`:159`）は `colourOf('S-149', …)` で灰になる。⭐ 裁定が引く `image-exporter.ts:52-55` は、この木でもその行である（確かめた）。
   - 画面の枠: `ScreenTheme`（`src/framework/dom-screen-surface/dom-screen-surface.ts:405-408`）はモノクロを持たず、`hued`（`:411-413`）は色相を入れるだけである。`themeStyle`（`:417-426`）と `pageGroundStyle`（`:436-446`）がこれを通すので、画面の地 `S-146`・罫 `S-149`・パネルの地 `S-150`・掴み代の印 `S-231`・強調 `S-151` は、モノクロでも色相を持ったまま残る。
   ⇒ モノクロで、画面の枠は色、同じ画面を縮めた書き出しの枠は灰（`G62x` の食い違い）。
3. **同じ形の所を数えた**（依頼の 4）: 表 T-236 の ○ の行に色相を入れる所は `src/` に 2 つの関数だけである —— `colourOf`（モノクロを効かせる）と `hued`（効かせない）。`hued` を呼ぶのは `themeStyle`（`:423`）と `pageGroundStyle`（`:444`）の 2 か所。`themeStyle` が名で塗る 16 の名（`PAINT_ROW`、`:85-102`）のうち、○ の行を指すのは 8（`ground` `S-146`・`rule` `S-149`・`panel` `S-150`・`grabStrip` `S-231`・`pinned` ／ `pinnedRow` ／ `grabAxisPosition` ／ `heldRow` の 4 つが `S-151`）。⭐ 仕様の側で直す所は `FR-041` の 1 か所である —— 同表の ○ の欄の意味は `FR-041` の STATEMENT の 2 文目が持ち、モノクロの効き方も `FR-041` が持つ（表 T-236 の前の段落の「描画時にどう効くかの規則と理由は `FR-041` が持つ」、`tbl-settings.md:217-218`）。
4. **`CR-557` の見本の色の出どころは `S-151` である。** 同書の E-01 の新: 「各行の見本は、その行の色相で解いた `_assets/tbl-settings.md` の 表 T-236 の `S-151` を、いま描いている明暗の値で塗ること（MUST）」、続けて「⛔ 見本にモノクロ（`S-74`）を効かせてはならない（MUST NOT） —— すべての見本が同じ灰になり選べなくなる。」⇒ 見本は `JDG-700` が灰にする行そのものを塗る。例外を書かないと 2 つの MUST がぶつかる（決定 1）。
5. **色の欄の見本（`JDG-524`、表 T-017b の `CV-9`）は別の見本である** —— 表 T-294 の名とカスタムカラーの見本で、モノクロでは灰で塗る。`JDG-700` と同じ向きであり、本書は触らない。
6. **灰にしたときの比を測った**（13 節の `585-contrast.py`。HSL を 8 ビットの sRGB へ丸め、WCAG 2.1 の相対輝度 L から (L1 + 0.05) ÷ (L2 + 0.05)）:

   | 組 | 明るいテーマ（色相 214 ／ 全色相の最悪 ／ モノクロ） | 暗いテーマ（同） |
   |---|---|---|
   | `S-151` 対 `S-146` | 8.774 ／ 4.066 ／ 7.814 | 7.236 ／ 5.025 ／ 7.989 |
   | `S-151` 対 `S-150` | 8.185 ／ 3.855 ／ 7.294 | 6.508 ／ 4.579 ／ 7.175 |
   | `S-151` 対 `S-155` | 5.193 ／ 3.083 ／ 4.866 | 4.302 ／ 3.530 ／ 4.478 |
   | `S-231` 対 `S-150`（`JDG-109`） | 1.445 ／ 1.363 ／ 1.425 | 1.698 ／ 1.623 ／ 1.733 |
   | `S-231` 対 `S-151`（掴む前と掴んだ後、`HF-15`） | 5.663 ／ 2.828 ／ 5.117 | 3.833 ／ 2.822 ／ 4.140 |

   ⇒ 強調の色は、モノクロでも 3 つの地に対して 3 : 1 を割らない（`NFR-007`）。掴み代の印は、掴む前と掴んだ後が明度で見分けられる（`HF-15` の「色が変わること自体が「いま掴んでいる」の印になる」）。⚠️ `JDG-109` の数（1.271 → 1.445 ／ 1.411 → 1.711）と違うのは、本書が 8 ビットへ丸めてから測ったためである —— 丸めずに測り直すと 4 つとも一致した（色相 214、13 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— モノクロを入れたのに画面の枠だけが色を残すと、効いたのか効いていないのかが読めない。画面をそのまま縮めて書き出すのに（`FR-080`）、画面と書き出した絵の色が違うのも同じ驚きである。
- ⚠️ **`CH-3`（ぬるサク）にはわずかに負に働く** —— `themeStyle` は描くたびに走るので（9 節）、○ の行を指す 8 つの名に灰にする計算が 1 回ずつ足される。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** —— ① 画面の枠と書き出した絵の枠が、モノクロで別の色になる（0.2 節の 2）→ E-01 の 2 文目が揃えることを MUST にする。② `JDG-700`（灰にする）と `JDG-452` ・ `CR-557` の E-01（見本は `S-151` で塗り、モノクロを効かせない）が同じ `S-151` でぶつかる → 見本を唯一の例外と名指した（E-01 の 3 文目）。③ `induced.py` の閉路 `CV-7` ↔ `FR-041`（値の行とその規則を持つ要求。作法）—— 本書は `CV-7` を書かない。E-01 の 4 文目は、人が指定した色の規則が `CV-7` に在ると指すだけである。
- **`R1.2`（検証できる表現）** —— 「画面の飾り」と書かず、表 T-236 の色相の欄の ○ で対象を決めた（決定 3）。どの行が当たるかは表を見れば数えられる。
- **`R1.4`（異常系・境界値）** —— モノクロでの比（0.2 節の 6）。見本がすべて同じ灰になる場合（決定 1 の理由）。
- **`R2.21`（1 つの仕事は 1 か所）** —— ○ の行に色相を入れる仕事を `colourOf` と `hued` の 2 か所が持つ（0.2 節の 3）→ 9 節で 1 本に寄せる（`DFC-1052` の案 ①）。⚠️ `hued` は最初の `H` だけを置き換える（`written.replace('H', …)`、`DFC-754` の罠）。
- **`R2.22`（補助関数の前に公開の入口）** —— 灰にする関数 `achromatic` は `SvgRenderer` に在る（`svg-renderer.ts:125`）。`DomScreenSurface` の辺は `ScreenRenderer` へだけ伸び（`docs/spec/_source/components.json`）、`ScreenRenderer` は `SvgRenderer` へ伸びる ⇒ 写さず、`ScreenRenderer` の公開エントリから出す（9 節。名を 1 つ足すだけなら規則 02 の 1 の手で足りる）。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる）。`rulings.md` を `S-149`・`S-150`・`S-151`・`S-231`・「モノクロ」・「白黒」・`themeMonochrome` で引いた —— 当たるのは `JDG-94` ・ `JDG-109`（掴み代の印の明度）、`JDG-327`（パレットの白と黒の入れ替え）、`JDG-373`（モノクロの入口の置き場）、`JDG-452`（見本）、`JDG-524`（色の欄の見本も灰）、`JDG-621` ・ `JDG-625` ・ `JDG-626`（モノクロを保存するか）、`JDG-700` で、決定 1 のほかは本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | ⭐ **`JDG-700` と `CR-557` の決定 4（`JDG-452`）がぶつかる所は、調整役が問わずに決めた（class C、表示だけ）**: テーマの色相の欄の見本（表 T-305）は、モノクロでも各行の色相で解いた `S-151` で塗る —— `JDG-700` のただ 1 つの例外とする。E-01 の 3 文目がそれを名指し、`CR-557` の「⛔ 見本にモノクロ（`S-74`）を効かせてはならない（MUST NOT）」は書き換えない | `JDG-700` は画面の色の一般の規則であり、`JDG-452` は 1 つの欄についての裁定である —— 狭いほうが勝つ。見本を灰にすると 10 の升が同じ灰になり、選べなくなる（`CR-557` の決定 4）。見本の色の出どころは `S-151`（0.2 節の 4）なので、例外を書かなければ 2 つの MUST が同じ行でぶつかる | モノクロの画面に色の升が 10 並ぶ（`CR-557` の決定 4 と同じ代償）。覆すなら E-01 の 3 文目と `CR-557` の 1 文を消す |
| 決定 2 | 掴み代の印 `S-231` も灰にする | 裁定の問いが挙げたのは `S-149`・`S-150`・`S-151` の 3 つだが、`S-231` は表 T-236 の備考で「色相と彩度は `S-149` のまま」と定まる（0.2 節の 1）。`S-149` を灰にして `S-231` に色相を残すと、その備考が偽になる | 裁定の問いの字面より 1 行多い。戻すなら E-01 に例外を 1 つ足す |
| 決定 3 | 対象を行の列挙ではなく「表 T-236 の色相の欄が ○ の行」で書く | 同表の ○ の欄は既に `FR-041` が意味を持つ（STATEMENT の 2 文目）。今日の 13 行と、名指す 9 ＋ 裁定の 3 ＋ 継ぐ 1 は一致する（0.2 節の 1）。列挙すると、○ の行が増えたときに取り残される（規則は表を指す） | ○ の行を足す変更要求は、モノクロでも灰になることを承知で足す |
| 決定 4 | E-01 は `FR-041` のモノクロの段落（`CR-557` が色相の欄を足した段落）の後ろに、新しい段落として足す | 規則 02 の 4 節「仕様に行を足すときは段落の終わりに足せ」。例外（見本）を「上の段落」と指せる | 旧が `CR-557` の新の最後の行になり、`CR-557` を当てる前には当てられない（当てる順で守る） |
| 決定 5 | 無彩色にする仕方（どの値を保って彩度を落とすか）は書かない | 本書の裁定の外である。今は `tbl-settings.md:497` の測り方の注（「HSL の明度を保ったまま彩度 0」）と、コードの `achromatic` が同じ読みをしている | 仕方を変えるなら別の変更要求 |
| 決定 6 | 色相の欄が — の行（文字・良 ／ 注意 ／ 不良・依存線・イナズマ線・注記・基準日線・カーソルほか）は変えない | `JDG-700` の問いは ○ の行だけを挙げた。`FR-041` は注記・依存線・イナズマ線を「追随させない」と既に定める | 11 節の問い 1（推すのは今のまま） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| モノクロで灰にする行（`JDG-700`） | `FR-041` のモノクロの段落の後ろに段落 1 つ | E-01 の 1 文目 | 1 文目を消す |
| 画面と書き出した絵を揃える | 同じ段落 | E-01 の 2 文目 | 2 文目を消す |
| 見本の例外（決定 1） | 同じ段落 | E-01 の 3 文目 | 3 文目と `CR-557` の MUST NOT を消す |
| 人が指定した色の持ち主 | 同じ段落 | E-01 の 4 文目（指すだけ） | — |
| 表 T-236・`CV-7`・`CV-9`・設定・用語・名簿・状態機械 | 変えない | — | — |

**数**: 仕様の文の編集 1（E-01、`docs/spec/01-04-requirements.md`）。原稿 JSON の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。受けた仮の番号の帯（90500 〜 90599）は 1 つも使わない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（87d98a47） | 置き換わる先 | 編集 |
|---|---|---|---|
| `DFC-1052` の「⛔ 残りの部分は `裁定待ち`」（`FR-041` が名指さない行をモノクロで灰にするか） | `docs/development-records/defects.md:352` | E-01 の 1 文目 | ⛔ 台帳は調整役が書く（12 節） |
| コードの「画面の枠は、モノクロでも色相を入れるだけ」（⛔ 本書は直さない。9 節） | `src/framework/dom-screen-surface/dom-screen-surface.ts:405-446`（`ScreenTheme`・`hued`・`themeStyle`・`pageGroundStyle`） | E-01 | 波 2 の実装する体 |

消す仕様の行・列・名・文は無い（E-01 は足すだけである）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-555` ・ `CR-557` と同じ）: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること。** 旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊であり、どちらも行の全体（末の改行まで）である。
⚠️ 行末の 2 つの半角空白（改行の印）も新の一部である。写すときに落とさないこと。
⛔ **旧は、`CR-572`（16.5 節）と `CR-557`（E-01 ・ E-02）を当てた後の `FR-041` の文である** —— `CR-557` の E-01 の新の最後の行であり、今日の木には 0 回しか現れない。13 節の `585-verify.py` が、今日の木の写しに `CR-572` の 16.5 節の 3 つの置き換えと `CR-557` の E-01（旧を `CR-572` の新の行へ読み替えた）・ E-02 を当て、その写しで旧が 1 回だけ現れることを確かめた。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-041` のモノクロの段落（`CR-557` が色相の欄を足した段落）の後ろに、段落を 1 つ足す（`**RATIONALE**:` の前）。旧
```text
⛔ この欄に、カスタムカラーの入口・透明・テーマ追随へ戻す入口（表 T-017b の `CV-9` と `FR-007` の「戻す入口」）を並べてはならない（MUST NOT） —— 色相は 0 〜 359 の数であって色ではなく、透明にも追随にも意味が無い。
```
新
```text
⛔ この欄に、カスタムカラーの入口・透明・テーマ追随へ戻す入口（表 T-017b の `CV-9` と `FR-007` の「戻す入口」）を並べてはならない（MUST NOT） —— 色相は 0 〜 359 の数であって色ではなく、透明にも追随にも意味が無い。

⭐ モノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、同書の 表 T-236 の、色相の欄が ○ の行を、日程の図の中にも画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`）にも、無彩色にして描くこと（MUST） —— 画面の一部だけが色を残すと、モノクロが効いているのかが読めない。  
⭐ 画面と書き出した絵とで、同じ行を同じ値で塗ること（MUST） —— 書き出した絵は画面を縮めた絵であり（`FR-080`）、モノクロで片方だけが色を残すと、2 つが別の絵になる。  
⚠️ 例外は、上の段落のテーマの色相の欄の見本だけである —— 見本は 表 T-305 の各行の色相で解いた `S-151` で塗り、モノクロを効かせない（上の段落の MUST NOT）。  
⚠️ 本段落が灰にするのは、色相の欄が ○ の行だけである —— 人が指定した色をモノクロで描く規則は 表 T-017b の `CV-7` が持つ。
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The rule is FR-041, the paragraph CR-585 E-01 adds after the theme-hue
  field paragraph of CR-557. While S-74 (themeMonochrome) is true, every row
  of table T-236 whose hue column is "o" (today: S-146 S-149 S-150 S-231
  S-151 S-155..S-158 S-164..S-167) is drawn achromatic wherever it is drawn:
  the schedule picture, the screen chrome (DOM), the page ground, and the
  exported image. Rows whose hue column is "-" are untouched.
- The one exception: the theme-hue swatches of table T-305 (CR-557) keep
  S-151 at each row's own hue and never take the monochrome path.
- Screen and export must give the same value for the same row: for any row
  above, the DOM custom property --gr-<name> and the export's colour for the
  same row are equal strings under the same (hue, dark, monochrome).
- Code: src/framework/dom-screen-surface/dom-screen-surface.ts --
  ScreenTheme gains `monochrome: boolean`; hued / themeStyle /
  pageGroundStyle apply the SAME achromatic function the SvgRenderer's
  colourOf uses (src/adapter/svg-renderer/svg-renderer.ts `achromatic`),
  reached through ScreenRenderer's published entry (DomScreenSurface has an
  edge only to ScreenRenderer; ScreenRenderer has one to SvgRenderer).
  Do not write a second greying function. Replace every H, not the first
  one only (DFC-754).
- src/framework/single-html-shell/single-html-shell.ts heldTheme reads
  document.documentSettings.themeMonochrome (S-74 stays a stored document
  value after CR-572, JDG-626).
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（87d98a47）

- `induced.py`（`FR-041` `S-74` `S-146` `S-149` `S-150` `S-151` `S-231` `T-236` `CV-7` `FR-080` `T-076` `FR-007` の 12、12 がすべて仕様に在る）: 内側の辺 11、閉路 1 —— 大きさ 2: `CV-7` ↔ `FR-041`（値の行と規則を持つ要求。作法であり、本書は `CV-7` を書かない）。
- `impact.py`（2 次まで）: `FR-041` を指す要求 6 件・参照 28 か所、`S-74` 2 件・3、`S-146` 3 件・10、`S-149` 2 件・5、`S-150` 1 件・3、`S-151` 4 件・7（`FR-004` の `HF-15`、`FR-081` の 2 か所、`FR-098` の留めた行の地、`FR-029` の `EN-3`）、`S-231` 2 件・2（`HF-15`・`GR-20`）、表 T-236 を指す要求 12 件（2 次 45 件）、`CV-7` 2 件・3、`CV-9` 0 件・7、`EP-1` 1 件・4、`EP-9` 0 件・1、`FR-080` 6 件・24、表 T-076 6 件。
- ⭐ 届いた行ごとに `rulings.md` を引いた（0 節の ③ の前文）—— 決定 1 のほかに食い違いは無い。`S-151` を読む要求（`HF-15` の軸の帯・掴んでいる行の地・掴み代の印、`FR-081` の枠、`FR-098` の地、`EN-3`）は色を「`S-151` とする」と行を指すだけで、色相を持つことを求めない —— 灰になっても文は真のまま。`HF-15` の「色が変わること自体が「いま掴んでいる」の印になる」は、灰でも明度で割れる（0.2 節の 6）。
- ⭐ 本書が文を書くのは `FR-041` の 1 段落だけであり、ほかは指すだけである。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 今日の木 87d98a47 | `CR-572` 16.5 節 ＋ `CR-557` E-01 ・ E-02 を当てた写し | その写しに本書を当てた後 | 本書の差 |
|---|---|---|---|---|
| tables | 189 | 190 | 190 | 0 |
| figures | 28 | 28 | 28 | 0 |
| rows | 2364 | 2374 | 2374 | 0 |
| uids | 164 | 164 | 164 | 0 |

測り方: `md-checks.py` を写しの根に打つ（13 節）。⚠️ 真ん中の列は `CR-572` と `CR-557` の `01-04-requirements.md` の `FR-041` の編集だけを当てた写しであり、両書のほかの編集は入っていない —— 本書が見るのは最右列の差だけである。
⭐ 検査の見つけたものも、真ん中の列と最右列で同じである（`md-checks.py` の出力を突き合わせ、違いは行番号が 5 行下がった 1 件だけ）。⚠️ 真ん中の列の写しは `md-checks.py` が 4 件を見つける（終了コード 1）—— `S-368` と `S-72` の 2 件は、写しに `CR-557` の J-01 と `CR-572` の設定の移し替えを当てていないためであり、残る 1 件は `CR-572` の 16.5 節の新が `FR-041` の理由の段に書く `JDG-626` である（検査 7 は仕様の中の `JDG-` を、在らない行と読む。今日の仕様は `JDG-` を 1 つも引かない）。⇒ 本書の E-01 は `JDG-` を引かない。`CR-572` の側は 11 節の申し送り。

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | `CR-572`（16.5 節）と `CR-557`（E-01 ・ E-02）が当たったことを確かめ、その木で 4 節の旧をもう 1 度数える | 調整役 |
| 1 | `docs/spec/01-04-requirements.md`（`FR-041` の 1 段落） | 4 節の E-01 | 仕様の体 |
| 2 | `src/framework/dom-screen-surface/dom-screen-surface.ts`・`src/framework/single-html-shell/single-html-shell.ts`・`src/adapter/screen-renderer/screen-renderer.ts`（再公開の 1 名）・`docs/spec/_source/published-entries.json`（規則 02 の 1 の手）とその試験 | 5 節の継ぎ目。⚠️ `CR-572` の波 1 のコード（`heldTheme` が読む `themePreference` が画面の値へ移る）の後 | 実装の体（Sonnet） |
| 3 | `tests/`（新しいファイル `cr-585-*.test.ts` だけ） | 5 節の継ぎ目を仕様だけから確かめる: モノクロの ○ の行が DOM と書き出しで同じ灰になる／— の行は変わらない／`CR-557` の見本は色のまま | ⭐ 仕様だけの試験の体。実装の体と別 |
| 4 | 基準線・dist | 実物でモノクロを入れ、画面の枠と書き出しの枠を見比べる | 調整役 |

⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数・名 | 何を | 毎フレーム |
|---|---|---|---|
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `ScreenTheme`（`:405-408`） | `monochrome` を持つ | — |
| 同 | `hued`（`:411-413`） | モノクロなら、`SvgRenderer` の `achromatic` と同じ 1 本で灰にする。すべての `H` を置き換える（`DFC-754`） | はい |
| 同 | `themeStyle`（`:417-426`） | `hued` にモノクロを渡す | ⭐ **はい** —— `showScreenView`（`:738` から、`:857` で根の `style` を書く）が描くたびに呼ぶ。行見出しパネルの寸法の鍵 `rowControlsMeasureKey`（`row-title-panel-drawing.ts:530-549`、`:780` から）も呼ぶ |
| 同 | `pageGroundStyle`（`:436-446`） | 同上 | ⭐ **はい** —— `single-html-shell.ts` の `paintPageGround`（`:381-386`）が、`painting.showScreenView`（`:459-465`）から描くたびに呼ぶ（書く値が変わらなければ DOM は書かない） |
| `src/framework/single-html-shell/single-html-shell.ts` | `heldTheme`（`:370-376`） | `documentSettings.themeMonochrome` を読む | はい（上の 2 つの入口） |
| `src/adapter/screen-renderer/screen-renderer.ts` | 公開エントリ | `achromatic`（または `colourOf` に相当する 1 本）を再公開する。`docs/spec/_source/published-entries.json` に 1 項（規則 02 の 1 の「変更要求の要らない変更」） | — |

- ⚠️ `SCREEN_COLOURS`（`dom-screen-surface.ts:1134-1155`）と `SCHEDULE_COLOURS`（`svg-renderer.ts:745-`）は、同じ 表 T-236 から生成された 2 つの写しである —— 本書は畳まない（`DFC-1074` の範囲）。`S-231` は `SCREEN_COLOURS` にしか無い（`SCHEDULE_COLOURS` は 26 行で `S-231` を持たない）ので、`colourOf` を画面の側から `S-231` で呼ぶと投げる（`svg-renderer.ts:141`）。⇒ 寄せるのは灰にする関数（`achromatic`）であって、表を引く関数ではない。
- ⚠️ `CR-557` の見本（`properties-panel.ts` の色相の欄、まだ無い）は、モノクロの道を通してはならない（5 節の例外）。
- 書き出し（`image-exporter.ts:52-55`・`:159`）と日程の図（`colourOf`）は直さない —— 既に灰にしている。

---

## 10. ⛔ この変更でやらないこと

- 表 T-236 の色相の欄が — の行を変えない（決定 6。11 節の問い 1）。
- 表 T-017b の `CV-7`（人が指定した色）・`CV-9`（色の欄の見本、`JDG-524`）を変えない。
- 無彩色にする仕方を定めない（決定 5）。
- 色相ごとの明度の寄せと地の彩度の解き（`DFC-865`）に触れない。
- 書き出しと日程の図のコードを変えない。
- 生成された 2 つの色の表の写しを畳まない（`DFC-1074`）。
- 新しい設定行・定数・識別子を足さない。

---

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推し |
|---|---|---|
| 問い 1 —— 表 T-236 の色相の欄が — の行（良 `S-152`・注意 `S-153`・不良 `S-154`・押下の緑 `S-183`・依存線 `S-159`・イナズマ線 `S-160`・注記 `S-312`・基準日線 `S-163`・カーソル `S-195` ほか）は、モノクロでも色のまま描くか。`JDG-700` の問いは ○ の 3 行だけを挙げており、「全部」がこれらまで指すかは逐語から読めない | A: 色のまま（今の画面・図・書き出しのとおり。本書のまま） ／ B: これらも灰にする（`FR-041` の「注記・依存線・イナズマ線は追随させない」の文と、`FR-030` の色以外の見分けを読み直す別の変更要求） | ⭐ A —— 良 ／ 注意 ／ 不良は状態の意味を色で持ち、注記は `FR-019` がテーマから離した色を求める。今の 3 つの描き手はどれも — の行を灰にしておらず、揃っている。代償: モノクロの画面に状態の色が残る |

⚠️ 問い 1 は本書の E-01 を止めない —— A なら今のまま、B なら別の変更要求である。

**申し送り（問いではない）**: `CR-572` の 16.5 節の新は、`FR-041` の理由の段に 括弧書きの `JDG-626` を書く。今日の仕様は `JDG-` を 1 つも引かず、`md-checks.py` の検査 7 はそれを在らない行と読む（7 節）。⇒ `CR-572` を当てる体がその括弧を外すか、調整役が判じる。本書の旧はその括弧を含まないので、どちらでも E-01 は 1 回だけ現れる。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1052` | モノクロにしても画面の地（`S-146`）が色相を持ったまま残る。`FR-041` が名指さない行は `裁定待ち` だった | 本書の E-01（仕様）と 9 節（コード）で閉じる。⛔ 台帳は調整役が書く |
| `JDG-700` | 0.1 節 | 状態の「指示 —— 変更要求はまだ無い。`DFC-1052` が運ぶ」を、本書が当てる形へ（調整役が書く） |
| `JDG-452` | 0.1 節。見本の例外 | 変えない（`CR-557` が当てる）。本書の E-01 の 3 文目が指す |

---

## 13. 測り方の再現

```
# the tree: cr-organise 87d98a47
# scratchpad: <scratchpad>/draft/ (files with the prefix 585-)

# hue-following rows of table T-236 (0.2 item 1)
#   read docs/spec/_source/settings.json, rows with hue.ja == "o"
#   -> 13: S-146 S-149 S-150 S-231 S-151 S-155 S-156 S-157 S-158 S-164 S-165 S-166 S-167
#   CR-556's S-364 (a later wave) is "-"

# the three painters (0.2 item 2, item 3)
git grep -n "replace('H'\|followsHue\|hued(" 87d98a47 -- src
#   -> svg-renderer.ts:143 (colourOf), dom-screen-surface.ts:411-412 (hued), :423, :444
git grep -n "'S-14[69]'\|'S-15[01]'\|'S-231'" 87d98a47 -- src
#   -> image-exporter.ts:54 (S-150), :159 (S-149); dom-screen-surface.ts:87-101 (PAINT_ROW)

# contrast (0.2 item 6)
python <scratchpad>/draft/585-contrast.py

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-041 S-74 S-146 S-149 S-150 S-151 S-231 T-236 CV-7 FR-080 T-076 FR-007
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-041 S-74 S-146 S-149 S-150 S-151 S-231 T-236 CV-7 CV-9 EP-1 EP-9
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-080 T-076

# the old block (section 4) and the counts (section 7)
git archive 87d98a47 docs/spec change-request/CR-557-* .claude/skills/spec-graph-check | tar -x -C <scratchpad>/draft/585-head   (plus this file copied into its change-request/)
python <scratchpad>/draft/585-verify.py <scratchpad>/draft/585-head <scratchpad>/draft/585-tree3
#   copies docs/spec three times (today / prior / after); on prior and after applies
#   CR-572 16.5 (3 replacements in FR-041, each counted once) and CR-557 E-01 (its old
#   read as CR-572's new line; asserted equal to the line CR-572 rewrites) and E-02,
#   parsing CR-557's text blocks from its file; then counts and applies CR-585 E-01
#   -> CR-585 E-01 old: today 0, prior (after CR-572 + CR-557) 1
#   -> CR-585 E-01 new occurs in after: 1
#   -> today  tables=189  figures=28  rows=2364  uids=164  exit=0
#   -> prior  tables=190  figures=28  rows=2374  uids=164  exit=1
#   -> after  tables=190  figures=28  rows=2374  uids=164  exit=1
# the findings of prior and after, diffed: only JDG-626's line moves (:2029 -> :2034)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py <scratchpad>/draft/585-tree3/prior
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py <scratchpad>/draft/585-tree3/after
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-spec-holds-no-history.py <scratchpad>/draft/585-tree3/after
#   -> OK, 0 sites
```

### 13.1 ⚠️ 測りが見られなかったもの

- **`CR-572` の 16.5 節は旧 ・ 新の塊ではなく、引用の文である。** `585-verify.py` はその 3 つを字のとおり置き換えた。当てる体が語を変える（たとえば括弧書きの `JDG-626` を外す）と真ん中の写しは変わるが、本書の旧（`CR-557` の E-01 の新の最後の行）は `CR-572` が触らないので、その行が逐語で着地する限り 1 回だけ現れる。⛔ `CR-557` を当てる体がその行を書き換えたら、本書の旧も書き直す（8 節の波 0）。
- **`CR-557` の E-01 の旧は、`CR-572` の後の木では 0 回である**（`CR-557` は `CR-572` の前の文で書かれている）。写しでは、旧を `CR-572` の新の行へ読み替えて当てた（調整役の計画の表 `docs/development-records/cr-plan-2026-09-26.md` の W2 の行の読みと同じ）。
- **同じ波で起草中の兄弟（`CR-584`・`CR-586` 〜 `CR-589`）は、この木に無いので読めない。** そのどれかが `FR-041` のモノクロの段落を書き換えるなら、本書の旧が動く。
- **画面は動かしていない。** 9 節の「毎フレーム」はコードを読んで判じた（`showScreenView` と `paintPageGround` の呼び出し）。測ってはいない。`DFC-1052` の写しの再現（色相 359・暗・モノクロ → 画面 `hsl(359 14% 13%)`）も打ち直していない。
- **比は 表 T-236 の値から計算した。** 描かれた画素ではない。`S-214`（9%）で薄めて敷く地（留めた行・掴んでいる行）の比は測っていない。
- 丸めずに測ると、`JDG-109` の 4 つの数と一致した（`585-contrast.py` の 8 ビットの丸めを外して、色相 214 で `S-231` 対 `S-150` と `S-149` 対 `S-150` を明暗それぞれ）。
- ⚠️ **起草のあいだに、同じ作業木で別のセッションが `CR-555` を当てていた**（`git status` で `docs/spec/01-04-requirements.md`・`svg-renderer.ts` ほか 18 ファイルが変わっていた。本書は触っていない）。⇒ 数（7 節）と旧の数え（4 節）は、作業木ではなく `git archive 87d98a47` で写した木で測り直した。作業木で測った初めの数（tables 190・rows 2384）は `CR-555` の途中の文を含んでいたので捨てた。`impact.py` の数は、写した木で打ち直して同じだった。本書が引く `src/` の行番号は 87d98a47 のものである（`svg-renderer.ts` は作業木では 6 行ずれている）。
- `induced.py` は `check.sh` が書く書き出し（`scratch/spec-check/sd-out/json/index.json`、2026-09-26 17:29、87d98a47 のコミットの 6 分後）を読む。依頼が `check.sh` を禁じるので、写した木では打てず、作業木にあったその書き出しで測った。`FR-041` のまわりは `CR-555` の編集が届かない所なので、閉路の答えは変わらないと見るが、測ってはいない。
