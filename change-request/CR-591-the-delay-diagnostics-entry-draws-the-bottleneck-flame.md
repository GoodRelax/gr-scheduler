# CR-591 — 遅延診断の入口は、ボトルネックの印の炎を線で描く

> 起草の状態: 当てた（2026-09-27、枝 `lane-l1`、段 B の持ち場 L1）。E-01 の旧は当てる木で 1 回だけ現れた。`npm run glyphs` で `icon-glyphs.json` の `IC-107` の項だけが変わり、`glyphs:check` は 113 形。起草は 2026-09-27、枝 `rulings-0927`。
> 読んだ木: `rulings-0927` 877527f5（`cr-organise` f953dc90 に裁定の記録 1 コミットを足した木。`docs/spec` と `src` は f953dc90 と同じ）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-591` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-561` の後（`IC-107` の枡は `CR-561` が足した。f953dc90 で当たっている）。
> 閉じるもの: `JDG-770`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-770` | 「B 炎 (推奨)」 | `IC-107` の図形を、`S-395` の炎の道を 24 単位の枡に置いて線で描く形にする。`CR-561` が当てた「虫眼鏡に「!」」を覆す | 4 節の E-01 |
| `JDG-772` | 「A 今のまま (推奨)」 | 印の炎（`S-395`・`S-396`）は変えない | 本書は `S-395` を書き換えない。E-01 はその道を写すだけ |

問うた場面: 触れる見本 `previous-project-result/20-applied-recommendations/` の段 1。ヘッダーの並び 全体表示 `IC-10` → 検索 `IC-117` → 遅延診断 `IC-107` → 全画面 `IC-11`（表 T-109 の順）の中で、4 案（A 虫眼鏡に「!」／ B 炎／ C 砂時計に「!」／ D 脈の線）を 20px と 3 倍で並べた。推奨の理由は「検索 `IC-117` の虫眼鏡と隣り合い、2 つの虫眼鏡が並ぶ。炎は押すと現れる赤い印と同じ形」。

### 0.2 調べた結果（877527f5）

1. **旧の枡は 1 つだけである。** `docs/spec/_assets/fig-icons.svg:673-679` の `translate(304 408)` の群（`circle` 2・`path` 2）と、その下の札 `IC-107`（`:679`）。図 F-019 のほかに `IC-107` の形を言葉で述べる所は仕様に無い（`docs/spec` を「虫眼鏡」で引いて 0 件。`IC-117` の形も文では述べていない）。
2. **図形は生成器が src へ運ぶ。** `tools/generate_icon_glyphs.py` が図 F-019 を `src/framework/dom-screen-surface/icon-glyphs.json` に写し（`npm run glyphs`、`gen:check` の `glyphs:check`）、`dom-screen-surface.ts` の `fillEntry`（`:553-`）がそれを入口に描く。⇒ 手で書く src は 0 である。
3. **⛔ 生成器は 3 次曲線を歩けない。** `generate_icon_glyphs.py:118` の `PATH_ARGUMENTS` は `M L H V Q A Z` だけを持ち、`C` を見ると止まる（「a cubic ... measured by its control points would give a box wider than the ink」）。`S-395` の道は `C` だけでできている。写しの木で `S-395` の道をそのまま入れると、生成器は `IC-107 is drawn with the path command 'C', which this script cannot walk` で終了コード 1 を返した（13 節）。⇒ E-01 は、`S-395` の 3 次曲線の 1 本ずつを 2 次曲線 1 本に置き換えた道で描く（決定 1）。
4. **置き換えの誤差は見えない。** 同じ t で比べた最大のずれは 24 単位の 0.372（20px で描けば 0.31px）。20px と 120px で 3 次と 2 次を並べ、重ねた絵でも見分けられなかった（13 節）。
5. **ほかのアイコンは動かない。** FR-029 は図 F-019 の全図形に 1 つの座標系（全図形のインクの外接の枠）を求める。写しの木で E-01 を当てて生成し直すと、`viewBox` は `0.8 1.5 22.7 21` のまま、113 形のうち変わったのは `IC-107` だけ、`glyphs:check` は `OK the icon glyphs match figure F-019 (113 shape(s))` だった（13 節）。炎のインクは線の太さ込みで x 4.16〜19.84、y 2.45〜22.5 であり、今の枠の中に収まる。
6. **線の太さは全図形と同じ 2 である**（`FR-029` の「図 F-019 の全図形が 1 つの線の太さを持つこと（MUST）」、`01-04-requirements.md:7192`）。E-01 は `class="s"` だけを使う。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 虫眼鏡が 2 つ隣り合うと、どちらが検索かを札を読まずに選べない。炎は、押すと日程に出る赤い印（`DG-2`）と同じ形なので、押した結果と入口が結び付く。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— 炎の形の正は `S-395` の 1 か所であり、E-01 はその写しである。⚠️ `S-395` が後で変わっても、図 F-019 の枡は自動では追わない（決定 2）。
- **`R2.21`（1 つの仕事は 1 か所）** —— 図形を src へ運ぶ仕事は生成器 1 本のまま。手で写さない。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `IC-107`・`S-395`・「炎」・「グリフ」で引いた —— 当たるのは `JDG-490`（札と印の色）、`JDG-770`・`JDG-772` で、本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 3 次曲線 1 本を、同じ両端の 2 次曲線 1 本に置き換える（制御点 ＝ (3 (c1 ＋ c2) − (p0 ＋ p3)) ÷ 4、小数第 2 位） | 生成器は `C` を測らない（0.2 節の 3）。生成器に `C` を足す案より、図 1 枡の編集で閉じる（手で書く src が 0 のまま） | 形は `S-395` と最大 0.372 単位ずれる（0.2 節の 4）。生成器に `C` を足すなら、本書の E-01 を `S-395` の道そのものへ戻せる（11 節の問い 1） |
| 決定 2 | 枡には `S-395` の道を写した値を書き、`S-395` を参照する仕組みは作らない | 図 F-019 は字のとおりの SVG であり、設定値を読む口を持たない | `S-395` を変える変更要求は、図 F-019 の `IC-107` の枡も書き直すこと（10 節） |
| 決定 3 | 置き場は 24 単位の枡の (2.5, 2.5) から辺 19 の正方形 | 炎の中心の x を枡の中心 12 に合わせ、線の太さ込みのインクが今の `viewBox` の中に収まる最も大きい辺（0.2 節の 5） | 見本の案 B（辺 19.5、(2.5, 2)）より 0.5 小さい |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `IC-107` の図形 | 図 F-019（`docs/spec/_assets/fig-icons.svg`）の `translate(304 408)` の群 | E-01 |
| 表 T-109・`FR-029`・`FR-130`・`S-395`・`S-396`・辞書 | 変えない | — |

**数**: 図の編集 1（E-01）。原稿 JSON の編集 0。散文の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（877527f5） | 置き換わる先 | 編集 |
|---|---|---|---|
| `IC-107` の虫眼鏡に「!」（`circle` 2・`path` 2） | `docs/spec/_assets/fig-icons.svg:674-677` | 炎の `path` 1 | E-01 |
| その写し | `src/framework/dom-screen-surface/icon-glyphs.json` の `IC-107` の項（`:586` から） | 生成し直した項 | ⛔ 手で書かない。`npm run glyphs` |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（877527f5 で 1 回。ファイルの改行は LF）。旧・新は行の全体（末の改行まで）である。

<!-- EDIT id=E-01 file=docs/spec/_assets/fig-icons.svg -->
旧
```text
  <g transform="translate(304 408)">
    <circle class="s" cx="10" cy="10" r="6.5"/>
    <path class="s" d="M14.8 14.8 L20 20"/>
    <path class="s" d="M10 6.6 V10.4"/>
    <circle class="f" cx="10" cy="13.2" r="0.95"/>
  </g>
```
新
```text
  <g transform="translate(304 408)">
    <path class="s" d="M12 3.45 Q17.13 9.1 18.84 15.04 Q18.27 21.12 12 21.5 Q5.73 21.12 5.16 15.04 Q5.92 10.48 8.96 8.2 Q9.62 12.19 12 12.76 Q10.86 7.68 12 3.45 Z"/>
  </g>
```

当てた後に打つもの: `npm run glyphs`（`src/framework/dom-screen-surface/icon-glyphs.json` の `IC-107` の項だけが変わる）→ `npm run gen:check`。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's brief)
- The shape is figure F-019, docs/spec/_assets/fig-icons.svg, the group
  translate(304 408) labelled IC-107: one path, class "s" (stroke 2, no fill),
  the S-395 flame with each cubic replaced by one quadratic, placed in the
  square (2.5, 2.5) side 19 of the 24-unit cell.
- src receives it only through tools/generate_icon_glyphs.py
  (npm run glyphs -> src/framework/dom-screen-surface/icon-glyphs.json).
  Do not hand-edit the JSON. Do not add 'C' to the generator for this CR.
- Expected: viewBox stays "0.8 1.5 22.7 21"; exactly one glyph (IC-107)
  changes; glyphs:check prints 113 shapes.
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（877527f5）

- `impact.py IC-107 F-019 S-395`: `IC-107` を指す要求 1 件・参照 1 か所（`FR-130`、`01-04-requirements.md:3346`）。`S-395` を指す要求 1 件・参照 1 か所（`FR-133` の 表 T-315 の `DG-2`、`:3548`）。`F-019` は表の行ではない（図）—— 図を指すのは `FR-029`（`:7174`・`:7189`・`:7192`）と `:239` の前文。
- ⭐ どれも「図 F-019 に従う」と指すだけで、`IC-107` の形を文で述べない ⇒ 文の書き換えは 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 877527f5 | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2676 / 176 | 212 / 29 / 2676 / 176 | 0 |
| 図 F-019 の形の数（`glyphs:check`） | 113 | 113 | 0 |
| `icon-glyphs.json` の `viewBox` | `0.8 1.5 22.7 21` | `0.8 1.5 22.7 21` | 0 |
| `IC-107` の要素の数 | 4 | 1 | −3 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | `CR-561` が当たった木で、4 節の旧をもう 1 度数える（1 回） | 調整役 |
| 1 | `docs/spec/_assets/fig-icons.svg`（図 1 枡）＋ 生成物 `src/framework/dom-screen-surface/icon-glyphs.json` | E-01、`npm run glyphs`、`npm run gen:check` | 段 B の **L1 描画**（調整役の割り当て）。⚠️ 生成物は L4 の持ち場のフォルダに在るが、生成器しか書かないので衝突しない —— 合流で食い違ったら `npm run glyphs` を打ち直せば揃う |
| 2 | ― | 実物でヘッダーを見る（`IC-117` と `IC-107` が別の形に見える） | 調整役 |

- ⭐ **毎フレームの経路に触れない。** コードは変わらず、変わるのはデータ 1 項である。`fillEntry` は入口を作るときに要素を 1 つずつ作る —— `IC-107` の要素は 4 から 1 へ減る。`perf-pending.md` の行は要らない。
- 仕様だけの試験の体は出さない —— 形が図のとおりかは `glyphs:check` が機械で見る。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `src/framework/dom-screen-surface/icon-glyphs.json` | 生成し直す（`npm run glyphs`）。手で書かない | いいえ（データ） |

---

## 10. ⛔ この変更でやらないこと

- `S-395`・`S-396`・印の色（`S-387`・`S-388`）を変えない（`JDG-772`）。
- 生成器に `C` を足さない（11 節の問い 1）。
- 表 T-109 の行・札・説明の文（`JDG-775`）を変えない。
- ⚠️ 申し送り: 後で `S-395` を変える変更要求は、図 F-019 の `IC-107` の枡も同じ変換（決定 1・3）で書き直すこと。

---

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推し |
|---|---|---|
| 問い 1 —— 3 次曲線を 2 次曲線で近づけてよいか | A 近づける（本書。図 1 枡の編集で閉じる）／ B 生成器 `generate_icon_glyphs.py` に `C` の極値の計算を足し、`S-395` の道をそのまま写す | A。ずれは 20px で 0.31px（0.2 節の 4）。B は生成器の「曲線を制御点で測らない」の規則に 1 つ足すことになり、L1 の外の作業が増える |

⚠️ 問い 1 は本書の E-01 を止めない —— B なら、E-01 の新の `d` を `S-395` の道を同じ箱へ写した 3 次の道に替える。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-770` | 0.1 節 | 「指示 —— `CR-591` が当てる」（本書と同じコミットで書いた） |

---

## 13. 測り方の再現

```
# the tree: rulings-0927 877527f5
# scratchpad: <scratchpad>/g591/

# the old block (section 4)
grep -c 'translate(304 408)' docs/spec/_assets/fig-icons.svg          # -> 1
sed -n '673,679p' docs/spec/_assets/fig-icons.svg

# the flame in the 24-unit cell (decision 1, 3): toq.py maps S-395 (unit square)
# to (2.5, 2.5) side 19, replaces each cubic by one quadratic with control point
# (3 (c1 + c2) - (p0 + p3)) / 4 rounded to 0.01, and prints the largest same-t gap
python <scratchpad>/g591/toq.py
#   -> M12 3.45 Q17.13 9.1 18.84 15.04 Q18.27 21.12 12 21.5 Q5.73 21.12 5.16 15.04
#      Q5.92 10.48 8.96 8.2 Q9.62 12.19 12 12.76 Q10.86 7.68 12 3.45 Z
#   -> max deviation 0.372 (units of 24)

# the generator on a copy (0.2 items 3 and 5)
git archive HEAD tools docs/spec/_assets src/framework/dom-screen-surface/icon-glyphs.json | tar -x -C <scratchpad>/g591/t
#   with the cubic path in the cell:
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py
#   -> "IC-107 is drawn with the path command 'C', which this script cannot walk", exit 1
#   with E-01's new block:
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py            # exit 0
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py --check    # OK ... (113 shape(s))
#   compared with the JSON before: viewBox 0.8 1.5 22.7 21 -> same; changed glyphs: ['IC-107']

# the look (0.2 item 4): cubic and quadratic at 20px and 120px, and overlaid,
# rendered with Playwright from the repository root -> scratch/cmp591.png

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IC-107 F-019 S-395
```

### 13.1 ⚠️ 測りが見られなかったもの

- **実物のアプリのヘッダーでは見ていない。** `IC-107` の入口はまだ描かれていない（`CR-561` の画面は段 B の L4）。見本と生成した JSON の比べだけである。
- ずれの 0.372 は同じ t の点どうしの距離であり、2 つの曲線の間の最短の距離（ハウスドルフ距離）はこれ以下である。
