# CR-693 —— 画面の枠が解いた色を読み、帯のベースラインの式を 1 本にする

> 起草の状態: 当てた（2026-10-07、調整役の統合点 `145dc115` から早送りした作業木。持ち場 W2c-F2）。起草・当て・コードを同じ作業木で行った（5 節）。
> ID の帯: 番号 `CR-693`、裁定の帯 `JDG-1584`〜`JDG-1585`、台帳の帯 `DFC-2198`〜`DFC-2199`、`PND-803` は調整役から受けた（13 節で、木のどこにも無いことを測った）。どれも使っていない —— 新しい利用者の言葉は無く、新しい台帳の行も起こさなかった。
> 仕様の新しい識別子: 無い。表 T-064 の既存の 2 行（`PI-19`・`PI-37`）に公開の名を足すだけである。
> 持ち場の行: `DFC-2162`（画面の枠の色が 表 T-366 の解きを読まない）と `DFC-1172` の対応案 ②（帯のベースラインの式が 2 つの部署に重複する）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定

本書が拠る利用者の言葉は無い。`FR-041` の同じ行を同じ値で塗る段落と 表 T-366 の `CF-1`（`CR-683` が当てた）、表 T-076 の `EP-1`（`CR-584`）を、コードの境に写すだけである。

### 0.2 裁定の鎖（rulings.md を同じ語と似た語で引いた）

| 引いた語 | 当たった行 | 本書との関係 |
|---|---|---|
| `DFC-2162`・`DFC-1172`・`colourOf`・`bandBaseline`・`labelBaseline` | 0 件 | —— |
| `ベースライン`・`画面の枠`・`T-366`・`CF-1` | 0 件（`JDG-771` はモノクロで灰にする行の範囲の話） | 解きの置き場を名指していない |

⭐ 本書が新たに「覆された」と印す行は無い。`CR-681` の決定 5 は「② の片付けは仕様に足さない」としたが、それは CR の判断であり利用者の言葉ではない。W2-D3 が「2 つの部署をまたいで 1 本にするには 表 T-064 の行が要る」と測ったので、本書がその行を足す。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` / `GL-006`**（読まずに使える） —— 明るいテーマで色相を 60 や 140 にしても、ピン止めの行・選びの印など画面の枠が描く強調の色（`S-151`）が、日程の図と書き出す絵の同じ色と同じ値になる（`DFC-2162`）。
`DFC-1172` の ② は画面の見た目を変えない片付けである（`R2.21`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.21`（判じは 1 か所）** —— 帯のベースラインの式（帯の縦の中点 ＋ 字の大きさ × `S-33`）を `SvgRenderer` の 1 本にし、日程の図のラベルと書き出す題・絞り込みの札が同じ 1 本を問う（E-01）。解いた色は `colourOf` の 1 本だけが求め、画面の枠はそれを読む（E-02）。
- **`R2.22`（写さずに公開する）** —— `DomScreenSurface` から `SvgRenderer` への辺を足さず、既にある `achromatic` と同じく `ScreenRenderer` の入口が写さずに公開し直す（E-02）。
- **`R1.4`（境界）** —— 日程の図が塗らない行（`S-231`・`S-152`・`S-183` ほか）は `colourOf` に問えない。画面の枠はその行を自分の表の値で描き、問える行かは `isScheduleColourRow` で見分ける（名簿を写さない）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `ScreenRenderer` の入口が `colourOf` を写さずに公開し直し、画面の主題の色（`themeStyle`・`pageGroundStyle`）は、日程の図も塗る行をそれから読む（`DFC-2162` の案 ①） | `CF-1` が画面と書き出す絵に同じ解を使えと定める。解きを 2 か所で行えば `R2.21` に背く。案 ② （解いた値を `ScreenTheme` に持たせる）は殻に解きの呼び出しを足し、主題の型も変わる | 公開の名が 2 つ増える（`PI-37`） |
| X-2 | 問える行かを見分ける `isScheduleColourRow` を `SvgRenderer` が公開する | `colourOf` は届かない行で投げる。画面の側に行の名簿を写せば、生成の名簿が 2 つになる | 公開の名が 1 つ増える（`PI-19`） |
| X-3 | 帯のベースラインの式 `bandBaselineYOf` を `SvgRenderer` が公開し、`ImageExporter` はそれを問う（`DFC-1172` の案 ②） | `colourOf`・`GROUP_GRID_LINE_WIDTH_PX` と同じく、描く当の本人が持ち、書き出しが同じ 1 本を問う形である | 公開の名が 1 つ増える（`PI-19`） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 行 |
|---|---|---|---|
| 帯のベースラインの式 | `_source/published-entries.json` の `PI-19` に `bandBaselineYOf` | E-01 | `DFC-1172` ② |
| 画面の枠の解いた色 | `_source/published-entries.json` の `PI-19` に `isScheduleColourRow`、`PI-37` に `colourOf`・`isScheduleColourRow` | E-02 | `DFC-2162` |
| 台帳・変更履歴 | `defects.md`（2 行）・`changelog.md` 3.96・`perf-pending.md` 120 | E-03 | —— |

**数**: 表の行 0。表 T-064 の公開の名 +4（`PI-19` に 2、`PI-37` に 2）。要求の増減 0。図の辺 0。設定値 0。

---

## 2. 新しい識別子

無い（公開の名は行 ID ではない）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消すもの | 代わり |
|---|---|---|
| `src/adapter/image-exporter/image-exporter.ts` | 私的な `bandBaselineYOf`（題 `EP-1` と絞り込みの札 `IX-11` が読んでいた） | `SvgRenderer` の公開の `bandBaselineYOf`（E-01） |
| `src/adapter/svg-renderer/schedule-task-figures.ts` の `labelSvg` | 縦の位置の式 `box.y + box.height / 2 + fontSize * settings.labelBaseline` | `bandBaselineYOf(box, fontSize)`（E-01。`S-33` は文書が変えない定数なので値は同じ） |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` の `hued` | 日程の図も塗る行を、表の値の `H` を色相に替えて描くこと | `colourOf` の解いた値（E-02） |

⭐ 消さないもの: 表 T-366 の `CF-1`〜`CF-6` の文、`FR-041` の文、`EP-1` の文（ベースラインの式は既に `EP-1` が書いている）。日程の図が塗らない行の描き方（`hued` の残りの道）。

---

## 4. 書き直す所（当てた文）

**E-01** 表 T-064 の `PI-19`（`SvgRenderer`）の `achromatic` の次に `bandBaselineYOf` を足す。注: 帯の箱と字の大きさから、字のベースラインの縦の位置を返す —— 帯の縦の中点から、字の大きさに 表 T-201 の `S-33` を掛けた長さだけ下である。表 T-076 の `EP-1` が書き出す `Document Title` のベースラインをこの位置に置けと定め、日程の図のラベルも同じ式で置くので、`ImageExporter` が写さずに同じ 1 本を問う（`R2.21`）。

**E-02** 表 T-064:

- `PI-19` の `colourOf` の次に `isScheduleColourRow`。注: 表 T-236 の行 ID が、`colourOf` の答えられる行（日程の図も塗る行）かを返す。`CF-1` が画面と書き出す絵に同じ解を使えと定めるので、画面の枠は日程の図も塗る行だけを `colourOf` から読み、ほかの行は自分の表の値を描く —— 行の名簿を写さずに見分けるために問う。
- `PI-37`（`ScreenRenderer`）の `achromatic` の次に `colourOf` と `isScheduleColourRow`。注: どちらも `SvgRenderer` の同じ名を、`DomScreenSurface` へ渡すために写さずに公開し直したもの。画面の主題の色のうち日程の図も塗る行は `colourOf` の 1 本から読む —— `DomScreenSurface` から `SvgRenderer` への辺は無い。

**E-03** 台帳（12 節）、変更履歴 3.96（並行した CR と版が重なれば調整役が振り直す）、`perf-pending.md` の 120（`themeStyle` は画面の記述を見せるたびに走り、`labelSvg` は日程の図を描くたびに走る）。

### 4.1 生成物

`npm run gen` が `_assets/tbl-published-entries.md` と `docs/review/public-entry-index.md` を作り直した。手では触れていない。

---

## 5. 継ぎ目（コード —— 本書の持ち場が同じ作業木で書いた）

| 行 | コード | したこと | 条項 |
|---|---|---|---|
| `DFC-1172` ② | `src/adapter/svg-renderer/svg-renderer.ts`（`bandBaselineYOf` を公開）・`schedule-task-figures.ts` の `labelSvg`・`src/adapter/image-exporter/image-exporter.ts`（私的な写しを消し、公開の 1 本を読む） | 式を 1 本にした | `EP-1`・`PI-19` |
| `DFC-2162` | `svg-renderer.ts`（`isScheduleColourRow` を公開）・`src/adapter/screen-renderer/screen-renderer.ts`（`colourOf`・`isScheduleColourRow` を写さずに公開し直す）・`src/framework/dom-screen-surface/dom-screen-surface.ts` の `hued` | 日程の図も塗る行は `colourOf` の解いた値を描く | `CF-1`・`PI-19`・`PI-37` |

古い振る舞いを主張していた試験 2 本を、新しい条項に向け直した（弱めていない）: `tests/contract/cr-585-monochrome-greys-the-chrome-and-ground.test.ts` の (3)（`S-151` は表の値ではなく 表 T-366 で動いた値 —— 書き出しの側の (1)(7) と同じ判じ）と、`tests/contract/cr-592-monochrome-greys-every-t-236-row.test.ts` の (2)（モノクロの灰は、動いた色ではなく 表 T-236 の値の明度を保つ —— `T-294`）。

---

## 6. グラフ（`145dc115`、`impact.py`）

- 行 `PI-19`: 要求 0 件 / 参照 0 箇所。行 `PI-37`: 要求 1 件 / 参照 4 箇所（`FR-016`・5.3 節・5.6 節・表の頭） —— どれも公開の名の数を読まない。
- 表 T-064: 要求 6 件（`FR-003`・`FR-009`・`FR-045`・`FR-016`・`FR-052`・`FR-039`） —— 名が増えるだけで、どの要求の文も変わらない。
- 行 `CF-1`: 要求 0 件 / 参照 0 箇所。行 `EP-1`: 要求 3 件 / 参照 10 箇所。行 `S-33`: 要求 3 件 / 参照 3 箇所 —— 本書は文を変えない。

---

## 7. 数（当てた後に測った）

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| `PI-19` の公開の名 | 8 → 10 | `published-entries.json` の `members` の数 |
| `PI-37` の公開の名 | +2 | 同上 |
| 帯のベースラインの式の写し | 2 か所（`image-exporter.ts`・`schedule-task-figures.ts`） → 1 か所 | `grep -rn "labelBaseline" src/adapter` |
| `cr-585` の (5) の赤 | 2 → 0 | 13 節の試験 |

---

## 8. 波

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec` と生成物とコード | E-01〜E-03、5 節 | 本書の体（W2c-F2） |
| 2 | `tests/` | 9 節 | 仕様だけを読む別の体 |

- ⭐ **毎フレームの経路: はい。** `themeStyle` は画面の記述を見せるたびに走り、`labelSvg` は日程の図を描くたびに走る。増えるのは表を引く 1 回と関数の呼び出し 1 回だけである（解きは読み込みのとき 1 回、`perf-pending.md` の 117）。`perf-pending.md` に 120 を足した。

---

## 9. 仕様の外で直すもの

- 新しい試験（仕様だけを読む体）: `CF-1`（明るいテーマ・暗いテーマの色相 0・50・60・95・140・250 で、`--gr-pinned` と書き出しの `S-151` が同じ値。地 `S-146` も同じ）、`PI-37`（`ScreenRenderer` の入口から `colourOf`・`isScheduleColourRow` が読める）、`EP-1`（書き出す題のベースラインと日程の図のラベルが同じ式 —— 帯の縦の中点 ＋ 字 × `S-33`）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 日程の図が塗らない行（`S-231`・`S-152`・`S-183`・`S-153`・`S-154`・`S-170`・`S-336`・`S-337`・`S-464`・`S-493`）を `SvgRenderer` の名簿に足さない —— 表 T-366 はそれらを動かさないので、いまの値で食い違わない。
- `EP-3` の行の名前の縦の位置（`rowTitleSvg`）は変えない —— 帯の中点ではなく箱の上端からの式である（`CR-681` の決定 5）。
- 基準線は書かない。

---

## 11. 利用者に問うこと

無い。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `DFC-2162` | 画面の枠の色が 表 T-366 の解きを読まない | `未検討` → `実測待ち`。案 ① で直した。`cr-585` の (5) が緑 |
| `DFC-1172` | 書き出しの行見出しの縦の位置と、帯のベースラインの式の重複 | `試験待ち` のまま（`EP-3` の試験待ち）。案 ② の残り（`labelSvg`）を 1 本にした注を足した |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 145dc115

# the numbers are unused
grep -rn "CR-693" docs change-request src tests tools                         # nothing before this CR
grep -rn -e JDG-1584 -e JDG-1585 -e DFC-2198 -e DFC-2199 -e PND-803 docs src tests tools   # nothing

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py PI-19 PI-37 T-064 CF-1 EP-1 S-33

# one formula left (section 7)
grep -rn "labelBaseline" src/adapter

# the reds this CR closes
node ../../../node_modules/vitest/vitest.mjs run tests/contract/cr-585-monochrome-greys-the-chrome-and-ground.test.ts tests/contract/cr-592-monochrome-greys-every-t-236-row.test.ts

# generated
npm run gen
strictdoc export docs/spec && rm -rf output
```
