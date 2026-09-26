# CR-592 — モノクロでは、表 T-236 のすべての色を灰で描く

> 起草の状態: 当てた（2026-09-27、枝 `lane-l3`。調整役の割り当て）。4 節の旧 2 つは `CR-585` を当てた木でどちらも 1 回だけ現れ、そのまま当てた。コードは 9 節の 2 か所（`colourOf`・`hued`）。（起草の記: 起草のみ（2026-09-27、枝 `rulings-0927`）。）
> 読んだ木: `rulings-0927` 877527f5（`cr-organise` f953dc90 に裁定の記録 1 コミットを足した木。`docs/spec` と `src` は f953dc90 と同じ）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-592` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-585` の後（本書の旧は `CR-585` の E-01 の新の 1 文目と 4 文目。f953dc90 で当たっている）。コードは `CR-585` の波 2 の後。
> 閉じるもの: `JDG-771`。覆すもの: `CR-585` の決定 6（— の行は変えない）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-771` | 「B これらも灰にする (推奨)」 | モノクロ（`S-74`）のあいだは、表 T-236 の色相の欄が — の行も、○ の行と同じ方法で無彩色にする。画面と書き出した絵で揃える。例外はテーマの色相の欄の見本だけ | 4 節の E-01・E-02 |
| `JDG-700` | 「全部灰色にする (推奨)」 | ○ の行（罫・パネルの地・強調を含む）を灰にする（`CR-585` が当てた） | 本書は ○ の行の扱いを変えない。範囲を — の行へ広げるだけ |
| `JDG-524` | 「① ※モノクロでどの色に見えるかを選択するため。 カラーの確認が必要ならカラー画面に戻せばよい。」 | 色の欄の見本もモノクロで灰にする | 本書の理由（モノクロは白黒での見え方を見る表示）の出どころ |

問うた場面: 触れる見本 `previous-project-result/20-applied-recommendations/` の段 4。同じ小さな日程を カラー ／ A — の行は色のまま（`CR-585` が当てた形）／ B — の行も灰 で、明るいテーマと暗いテーマで並べた。推奨の理由は `JDG-524`・`JDG-700` と揃うこと。代償として「良／注意／不良の印はモノクロでは同じ灰になり、色はカラーに戻して見る」と示した。

### 0.2 調べた結果（877527f5）

1. **旧の文は 2 つで、どちらも 1 回だけ現れる**（`docs/spec/01-04-requirements.md:2099` の「表 T-236 の、色相の欄が ○ の行を」と `:2102` の「本段落が灰にするのは、色相の欄が ○ の行だけである」）。`FR-041` のほかの文（STATEMENT `:2067`、RATIONALE `:2104-2107`）は ○ に触れない。
2. **表 T-236 の — の行は 32 ある**（`docs/spec/_assets/tbl-settings.md:513-557`）: `S-147` `S-148` `S-152` `S-183` `S-195` `S-153` `S-154` `S-159` `S-160` `S-312` `S-161` `S-162` `S-310` `S-311` `S-364` `S-443` `S-163` `S-168` `S-169` `S-170` `S-223` `S-326` `S-327` `S-385` 〜 `S-390` `S-398` `S-336` `S-337`。値は `#rrggbb` 23・`hsl()` 2・「`S-xxx` に同じ」6・`rgba(0,0,0,a)` 1（`S-170`、もともと無彩色）。⚠️ 「に同じ」の 6 のうち `S-162`・`S-169`（`S-146` に同じ）と `S-311`（`S-158` に同じ）は ○ の行を継ぐ —— 今はモノクロで継いだ先だけが灰になりうる。本書の後は、どちらも灰で揃う。
3. **コードで — の行を塗る所は 4 つある。**
   - 日程の図: `colourOf`（`src/adapter/svg-renderer/svg-renderer.ts:139-146`）は `if (!row.followsHue) return written`（`:143`）で、— の行をモノクロでも色のまま返す。日程の図の色はすべて `themedColours`（`:151-153`）→ `colourOf` を通る（依存線 `S-159`・イナズマ線 `S-160`・基準日線 `S-163`・カーソル `S-195`・注記 `S-312`・遅延診断の印 `S-385` 〜 `S-390`・`S-398` ほか）。⇒ `:143` の 1 行で日程の図は揃う。人が指定した色は `chosenColourOf`（`:348`）が既に灰にする（`CV-7`）。
   - 画面の枠: `themeStyle`（`src/framework/dom-screen-surface/dom-screen-surface.ts:417-426`）が `PAINT_ROW`（`:86-103`）の 16 の名を `hued`（`:411-413`）で塗る。— の行を指す名は 8（`ink` `S-147`・`quiet` `S-148`・`shadow` `S-170`・`armed` ／ `pressed` `S-183`・`hoveredEntrance` `S-147`・`grabAxisDepth` `S-152`・`caution` `S-153`）。`CR-585` の波 2 が `hued` にモノクロを渡すが、灰にするのは ○ の行だけである（`CR-585` の 5 節の継ぎ目「Rows whose hue column is "-" are untouched」）。
   - 書き出した絵: `image-exporter.ts:61` の `colourOf('S-147', …)` —— `colourOf` を直せば揃う。
   - プロパティパネル: `checkerColour`（`src/framework/dom-screen-surface/properties-panel-drawing.ts:320-322`）が透明の見本の市松 `S-336`・`S-337` を明るい側の値で読む。値は `#ffffff`・`#c0c0c0` でもともと無彩色 ⇒ 直さなくても見た目は変わらない。
4. **灰にしたときの比を測った**（13 節の `c592.py`。明度を保って彩度 0、8 ビットへ丸め、WCAG 2.1 の比）:

   | 組 | 明るいテーマ | 暗いテーマ |
   |---|---|---|
   | 炎 `S-388` 対 印の地 `S-387`（`DG-2`） | 3.90 | 7.84 |
   | `!!` `S-386` 対 `S-385`（`DG-3`） | 9.57 | 11.06 |
   | `?` `S-390` 対 `S-389`（`DG-1`） | 3.36 | 9.16 |
   | `S-327` 対 `S-326` | 4.41 | 4.91 |
   | 依存線 `S-159` 対 地 `S-146` | 4.95 | 6.29 |
   | イナズマ線 `S-160` 対 地 | 5.33 | 7.11 |
   | 基準日線 `S-163` 対 地 | 4.17 | 6.53 |
   | カーソル `S-195` 対 地 | 5.17 | 8.74 |
   | 良 ／ 注意 ／ 不良 `S-152` ／ `S-153` ／ `S-154` 対 地 | 8.59 ／ 6.69 ／ 5.74 | 6.53 ／ 6.37 ／ 7.99 |
   | ⛔ **注記 `S-312` 対 地** | 6.48 | **2.76**（カラーでは 3.58） |

   ⇒ 暗いテーマのモノクロで、注記の枠と引出し線が `NFR-007` の図形の 3 : 1 を割る。`S-312` の備考は既に「⚠️ 暗いテーマも明るいテーマと同じ値である —— 暗いテーマで選び直していない」と書く（`tbl-settings.md:531`）。本書では直さない（11 節の問い 1）。
5. **色でしか分けていなかったものが、明度でしか分けられなくなる。** 良 ／ 注意 ／ 不良の灰の明度は、明るいテーマで 30.0 ／ 35.9 ／ 39.8%（ほぼ同じ灰）。依存線 44.0% と基準日線 48.4%（色相の距離で離していた、`tbl-settings.md:538`）。カーソル `S-195` と強調 `S-151`（マゼンタで見分けていた、`:522`）。⇒ 利用者は見本でこの代償を見て選んだ（0.1 節）。線は形（矢印の付いた折れ線 ／ 縦の直線 ／ ジグザグ）でも分かれる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— モノクロを入れたのに一部の線と印が色のまま残ると、白黒で刷ったときの見え方が画面から読めない（`JDG-524` の「モノクロでどの色に見えるかを選択するため」）。
- ⚠️ **`CH-3`（ぬるサク）にはわずかに負に働く** —— 日程の図の — の行の色を読むたびに、灰にする計算が 1 回足される（9 節）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `FR-041` の同じ段落の理由「画面の一部だけが色を残すと、モノクロが効いているのかが読めない」が、— の行を色のまま残す規則と食い違っていた → E-01 がすべての行へ広げる。② ○ の行を継ぐ — の行（0.2 節の 2 の `S-162`・`S-169`・`S-311`）が、モノクロで継いだ先と違う色になりうる → 同じ規則で消える。
- **`R1.4`（異常系・境界値）** —— 灰にしたときの比（0.2 節の 4）。暗いテーマの `S-312` が 3 : 1 を割る → 11 節の問い 1。
- **`R2.21`（1 つの仕事は 1 か所）** —— 灰にする関数は `achromatic`（`svg-renderer.ts:125`）1 本のまま。`CR-585` の継ぎ目と同じく、画面の側は `ScreenRenderer` の公開エントリから同じ 1 本を呼ぶ。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を「モノクロ」・「白黒」・`themeMonochrome`・`S-74`・`S-312` で引いた —— 当たるのは `JDG-327`・`JDG-373`・`JDG-452`・`JDG-524`・`JDG-621`・`JDG-625`・`JDG-626`・`JDG-700`・`JDG-771` で、本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 対象を「表 T-236 のすべての行」と書き、行を並べない | `CR-585` の決定 3 と同じ —— 規則は表を指す。行が増えても取り残されない | — |
| 決定 2 | 色相の欄（○ ／ —）は残す | ○ ／ — はテーマの色相に追随するかを決める欄であり、本書の後も `FR-041` の STATEMENT と表 T-236 の備考（「テーマの色相に追随させない」）が読む | — |
| 決定 3 | 見本の例外（`:2101`）と `CV-7` への指し（`:2102` の後半）は残す | `JDG-771` の読みが「例外はテーマの色相の欄の見本だけのまま」 | — |
| 決定 4 | 表 T-236 の備考のうち、色相で離すことを理由に書いた行（`S-163`・`S-195`）は書き換えない | 備考が述べるのはカラーのときの色の選び方であり、モノクロで灰になることと食い違わない | モノクロでは色相の距離が消える（0.2 節の 5）。E-02 の 1 文がそれを述べる |
| 決定 5 | 暗いテーマの `S-312` の比（2.76）は本書で直さない | 値を選び直すのは測って決める仕事であり、`JDG-771` の外である | 11 節の問い 1 |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| モノクロで灰にする行を、表 T-236 のすべての行にする（`JDG-771`） | `FR-041` のモノクロの段落の 1 文目（`01-04-requirements.md:2099`） | E-01 |
| 灰にする範囲の注 | 同じ段落の 4 文目（`:2102`） | E-02 |
| 表 T-236・`CV-7`・`NFR-007`・設定・用語 | 変えない | — |

**数**: 仕様の文の編集 2（E-01・E-02、どちらも `docs/spec/01-04-requirements.md`）。原稿 JSON の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（877527f5） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「表 T-236 の、色相の欄が ○ の行を」（灰にするのは ○ の行だけ） | `docs/spec/01-04-requirements.md:2099` | 「表 T-236 のすべての行を（色相の欄が ○ の行も — の行も）」 | E-01 |
| 「本段落が灰にするのは、色相の欄が ○ の行だけである」 | 同 `:2102` | 「本段落は、色相の欄を問わず 表 T-236 のすべての行を灰にする」＋ 色で分けていたものの注 | E-02 |
| `CR-585` の決定 6「色相の欄が — の行 … は変えない」と 10 節の同じ行 | `change-request/CR-585-monochrome-greys-the-panel-lines-and-accent-too.md:69`・`:214` | 本書 | ⛔ 当てた CR は書き足さない —— 本書が覆したと本行が記す |
| `CR-585` の継ぎ目の「Rows whose hue column is "-" are untouched」 | 同 `:136` | 本書の 5 節 | 同上 |
| コードの `if (!row.followsHue) return written`（— の行をモノクロでも色のまま返す） | `src/adapter/svg-renderer/svg-renderer.ts:143` | 9 節 | 段 B の体 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（877527f5 でどちらも 1 回）。旧・新は行の全体（末の改行まで）である。
⚠️ 行末の 2 つの半角空白（改行の印）も新の一部である。写すときに落とさないこと。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ モノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、同書の 表 T-236 の、色相の欄が ○ の行を、日程の図の中にも画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`）にも、無彩色にして描くこと（MUST） —— 画面の一部だけが色を残すと、モノクロが効いているのかが読めない。  
```
新
```text
⭐ モノクロ（`_assets/tbl-settings.md` の 表 T-203 の `S-74`）が入っているあいだは、同書の 表 T-236 のすべての行を（色相の欄が ○ の行も — の行も）、日程の図の中にも画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`・文字 `S-147`・押下の緑 `S-183` ほか）にも、無彩色にして描くこと（MUST） —— モノクロは白黒で見たときの見え方を確かめる表示であり、画面の一部だけが色を残すと、その見え方もモノクロが効いているのかも読めない。  
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ 本段落が灰にするのは、色相の欄が ○ の行だけである —— 人が指定した色をモノクロで描く規則は 表 T-017b の `CV-7` が持つ。
```
新
```text
⚠️ 本段落は、色相の欄を問わず 表 T-236 のすべての行を灰にする —— 色相の欄が決めるのはテーマの色相に追随するかだけである。  
⚠️ 色だけで分けていたもの（良・注意・不良の `S-152` 〜 `S-154`、依存線 `S-159` と基準日線 `S-163`、カーソル `S-195` と強調 `S-151`）は、モノクロでは明度と形でしか分からない —— 色で確かめるときは色に戻す。  
人が指定した色をモノクロで描く規則は 表 T-017b の `CV-7` が持つ。
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- The rule is FR-041, the monochrome paragraph as CR-592 E-01 / E-02 leave
  it. While S-74 (themeMonochrome) is true, EVERY row of table T-236 --
  hue column "o" and "-" alike -- is drawn achromatic wherever it is drawn:
  the schedule picture, the screen chrome (DOM), the page ground, and the
  exported image. The hue column still decides only whether H is replaced.
- The one exception stays: the theme-hue swatches of table T-305 (CR-557)
  keep S-151 at each row's own hue and never take the monochrome path.
- Screen and export give the same value for the same row under the same
  (hue, dark, monochrome), as in CR-585.
- Code:
  * src/adapter/svg-renderer/svg-renderer.ts colourOf (:139-146): under
    monochrome return achromatic(...) for a row with followsHue false too
    (today :143 returns `written` untouched).
  * src/framework/dom-screen-surface/dom-screen-surface.ts hued /
    themeStyle / pageGroundStyle: CR-585 wave 2 greys the "o" rows; extend
    the same call to every PAINT_ROW name (8 "-" names: ink quiet shadow
    armed pressed hoveredEntrance grabAxisDepth caution).
  * One greying function (achromatic), reached through ScreenRenderer's
    published entry as in CR-585. Do not write a second one.
  * achromatic returns rgba(...) unchanged (S-170 is rgba(0,0,0,a),
    already achromatic): that is correct, not a gap.
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（877527f5）

- `impact.py FR-041 T-236 S-74 S-312 CV-7`: `FR-041` を指す要求 9 件・参照 36 か所（`FR-007` の `CV-*` 6 か所、`FR-072`・`FR-031` の `UN-13`・`FR-043`・`FR-013`・`FR-045` の `DA-3`・`FR-133`・`FR-074`・`FR-039` ほか）。表 T-236 を指す要求 19 件（2 次 55 件）。`S-74` 2 件・6。`S-312` 1 件・4。`CV-7` 2 件・4。
- ⭐ 届いた要求のうちモノクロに触れる文は 3 つ —— `FR-013`（`:3170`、形で分けるのはモノクロのため）、`FR-043`（`:3040`、色は実績バーを継ぐ）、`NFR-007` の RATIONALE（`:8061-8062`、パレット色をモノクロで測った）。どれも本書と食い違わない。`FR-013` は形で分ける理由にモノクロを挙げており、本書の後はその理由が強まる。
- ⭐ 本書が文を書くのは `FR-041` の 1 段落の 2 文だけであり、ほかは指すだけである。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 877527f5 | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2676 / 176 | 212 / 29 / 2676 / 176 | 0 |

E-01 は 1 行を 1 行に、E-02 は 1 行を 3 行に替える（`01-04-requirements.md` は 2 行伸びる）。表・行 ID・UID は増えない。
測り方: 877527f5 の `docs/spec` を 2 つ写し、片方に `CR-591` の E-01 と本書の E-01・E-02 を本書の塊から読んで当て（旧はどれも 1 回、新は当てる前 0 回）、両方の根に `md-checks.py` を打った —— 出力は 1 字も違わず、終了コードはどちらも 0。`check-spec-holds-no-history.py` も当てた後の写しで 0 か所。

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | `CR-585` が当たった木で、4 節の 2 つの旧をもう 1 度数える（各 1 回） | 調整役 |
| 1 | `docs/spec/01-04-requirements.md`（`FR-041` の 1 段落の 2 文） | E-01・E-02 | 仕様の体 |
| 2 | 段 B の **L3 設定とパネル**（調整役の割り当て）。書くのは `svg-renderer.ts` の `colourOf` の 1 行と、`dom-screen-surface.ts` の `hued` ／ `themeStyle` ／ `pageGroundStyle`（`CR-585` の波 2 が書いた所）とその試験 | 5 節の継ぎ目。⛔ `CR-585` の波 2 の後に書く（同じ関数を広げるので） | 実装の体。⚠️ `svg-renderer.ts` は性能のセッションが合流するまでその持ち場であり、`dom-screen-surface.ts` は L4 の持ち場である（`cr-plan-2026-09-26.md` の段 B）—— 調整役が順を決める |
| 3 | `tests/`（新しいファイル `cr-592-*.test.ts` だけ） | 仕様だけから確かめる: モノクロで — の行（例: `S-159`・`S-163`・`S-195`・`S-312`・`S-387`・`S-147`）が日程の図・DOM・書き出しで彩度 0 になる ／ ○ の行は `CR-585` のまま ／ `CR-557` の見本は色のまま ／ モノクロを外すと — の行は元の値に戻る | ⭐ 仕様だけの試験の体。実装の体と別 |
| 4 | 基準線・dist | 実物でモノクロを入れ、日程の図・画面の枠・書き出しの線と印が灰になることを見る | 調整役 |

- ⭐ **毎フレームの経路に触れる。** `colourOf` は描くたびに色 1 つごとに呼ばれ、`themeStyle` と `pageGroundStyle` も描くたびに走る（`CR-585` の 9 節）。モノクロのあいだだけ、— の行ごとに `achromatic`（正規表現 1〜2 回）が足される。モノクロでないときは分岐 1 つだけ増える。⇒ `perf-pending.md` に行を持つ（`PW-2`）。値は (色相, 明暗, モノクロ) で決まるので、行ごとに前もって解いて持てば毎フレームの計算は増えない —— 形は実装の体が決める。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 関数・名 | 何を | 毎フレーム |
|---|---|---|---|
| `src/adapter/svg-renderer/svg-renderer.ts` | `colourOf`（`:139-146`） | `:143` —— `followsHue` が偽でも、モノクロなら `achromatic(written)` を返す | ⭐ はい |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | `hued`（`:411-413`）・`themeStyle`（`:417-426`）・`pageGroundStyle`（`:436-446`） | `CR-585` の波 2 が ○ の行に効かせるモノクロを、— の行にも効かせる | ⭐ はい |
| `src/adapter/image-exporter/image-exporter.ts` | `:61` ほか | 直さない —— `colourOf` を直せば揃う | — |
| `src/framework/dom-screen-surface/properties-panel-drawing.ts` | `checkerColour`（`:320-322`） | 直さない —— `S-336`・`S-337` はもともと無彩色 | — |

---

## 10. ⛔ この変更でやらないこと

- 表 T-236 の色相の欄（○ ／ —）と値を変えない（決定 2）。
- 暗いテーマの `S-312` の値を選び直さない（決定 5、11 節の問い 1）。
- 良・注意・不良を形で分ける仕組みを足さない（利用者は代償を見て選んだ、0.1 節）。
- 見本の例外（`CR-557`、`:2101`）と `CV-7` を変えない。
- 無彩色にする仕方（明度を保って彩度 0）を定めない（`CR-585` の決定 5 と同じ）。

---

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推し |
|---|---|---|
| 問い 1 —— 暗いテーマのモノクロで、注記の色 `S-312`（`#b45309`）が地に対して 2.76 になり、`NFR-007` の図形の 3 : 1 を割る（カラーでは 3.58）。どう扱うか | A 不具合として台帳に起こし、暗いテーマの `S-312` を測って選び直す別の変更要求で閉じる ／ B 本書に `S-312` の暗いテーマの値を足す | A。値を選ぶのは測って決める仕事で、`JDG-771` の外である。`S-312` の備考が既に「暗いテーマで選び直していない」と書く |

⚠️ 問い 1 は本書の E-01・E-02 を止めない。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-771` | 0.1 節 | 「指示 —— `CR-592` が当てる」（本書と同じコミットで書いた） |
| `CR-585` の決定 6 | — の行は変えない | 本書が覆す。⛔ `CR-585` は当てた後なので書き足さない |
| （新しい DFC） | 暗いテーマのモノクロで `S-312` が 3 : 1 を割る（0.2 節の 4） | ⛔ 台帳は調整役が書く（11 節の問い 1） |

---

## 13. 測り方の再現

```
# the tree: rulings-0927 877527f5

# the old sentences (section 4)
grep -c "表 T-236 の、色相の欄が ○ の行を" docs/spec/01-04-requirements.md             # -> 1 (:2099)
grep -c "本段落が灰にするのは、色相の欄が ○ の行だけである" docs/spec/01-04-requirements.md   # -> 1 (:2102)

# the "-" rows (0.2 item 2): table T-236 rows whose 色相追随 cell is "-"
sed -n '509,560p' docs/spec/_assets/tbl-settings.md | awk -F'|' '$6 ~ /—/ {print $2"|"$4"|"$5}'
#   -> 32 rows

# the painters (0.2 item 3)
grep -n "followsHue" src/adapter/svg-renderer/svg-renderer.ts                   # :143
grep -n "PAINT_ROW\|function hued\|function themeStyle\|function pageGroundStyle" src/framework/dom-screen-surface/dom-screen-surface.ts
for s in S-147 S-148 S-152 ... S-443; do grep -rln "'$s'" src --include=*.ts; done

# contrast (0.2 item 4): c592.py keeps HSL lightness, sets saturation 0, rounds
# to 8-bit sRGB and takes the WCAG 2.1 ratio (L1 + 0.05) / (L2 + 0.05); dark
# ground S-146 at hue 214 = hsl(214 12% 9%)
python <scratchpad>/c592.py
#   -> S-312 grey vs dark ground 2.76; S-312 colour #b45309 vs #14171a 3.58

# counts (section 7): <scratchpad>/apply.py reads the EDIT blocks of CR-591 and CR-592 and applies
# them to a git-archive copy of docs/spec (each old counted: 1)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py <scratchpad>/v/before   # 212/29/2676/176, exit 0
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py <scratchpad>/v/after    # same, exit 0

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-041 T-236 S-74 S-312 CV-7
```

### 13.1 ⚠️ 測りが見られなかったもの

- **実物では見ていない。** 灰にした見え方は見本（`previous-project-result/20-applied-recommendations/` の段 4）で見ただけで、`CR-585` の波 2 のコードはまだ無い。
- **比は表の値から計算した。** 描かれた画素ではない。薄めて敷く地（`S-214`）の上の比は測っていない。
- 「毎フレーム」はコードを読んで判じた（`CR-585` の 9 節と同じ呼び出し）。測ってはいない。
