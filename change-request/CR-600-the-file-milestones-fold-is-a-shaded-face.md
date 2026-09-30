# CR-600 — マイルストーンの「書類」の折り返しは、薄く塗った面で描く

> 起草の状態: 起草した（2026-09-30、枝 `lane-l1`、段 B の持ち場 L1）。⛔ 仕様にもコードにもまだ当てていない —— 当てる時期は調整役が決める。
> 読んだ木: `lane-l1` `964efc45`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-600` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: `CR-583` の後（表 T-221 の `LF-18` と図 F-044 は `CR-583` が書き直した。`964efc45` で当たっている）。旧を持つほかの変更要求は、その文を書いた当てずみの `CR-583` だけである（13 節）。
> 閉じるもの: `DFC-1225`、`JDG-845`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-845` | 「薄く塗った面 (推奨)」 | 折り返しは図 F-044 のとおり `shade`（薄く塗った面）で描く。表 T-221 の `LF-18` の列挙から外す | 4 節の E-01 |

問うた場面（2026-09-27）: 「マイルストーンの「書類」の折り返し（右下の角）: 仕様の表は「線で描く」、図（見本でご覧になった形）は「薄く塗った面」で食い違っています（DFC-1225）。どちらにそろえますか？」

### 0.2 調べた結果（964efc45）

1. **食い違いは 1 か所である。** `LF-18`（`05-07-design.md:1330`）は「絵の中の線（…・書類の折り返し・…）は、…塗りの上に線で描く」と列挙する。一方、図 F-044（`_assets/fig-milestone-shapes.svg:61`）は折り返しを `class="shade"` の閉じた道で描く。
2. **`shade` の役はすでに仕様に在る。** `05-07-design.md:1344` は「`shade` は薄く塗った面である（`LF-18`）」と書く。ところが `LF-18` の本文には `shade` を使う形が 1 つも無い。E-01 はその持ち主を `LF-18` に書く。
3. **コードと図はすでに面で描く。** 生成器 `tools/generate_milestone_shapes.py:72` は `shade` を `h` の class へ写し、描画 `schedule-task-figures.ts:441` は `shade` を薄い塗りと縁で描く。⇒ 手で書く src は 0 である。
4. **試験の 1 か所が旧の文を引く。** `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts:45` は旧の文をそのまま引く。当てたら、この引用を新の文に合わせる（検査 42 は、試験が引く文が仕様に在ることを見る）。隣の文を引く `:46` `LF_18_DOT`（「顔の目は点で塗る。」）と `:57` は変わらない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 折り返しを面で塗ると紙の裏が見え、角の折れた書類と読める。線だけでは角の欠けた四角と読まれうる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— 形の正は図 F-044 であり、`LF-18` の文をそれに合わせる。
- **`R2.21`（1 つの仕事は 1 か所）** —— `shade` の役を述べるのは `:1344` の 1 文のままとする。E-01 は「どの形が `shade` を使うか」だけを書く。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `LF-18`・`shade`・「折り返し」で引いた。当たるのは `JDG-845` だけで、本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 新しい文は「顔の目は点で塗る。」の直後に置く | 線 → 点 → 面の順に役を並べる。試験が引く「顔の目は点で塗る。」の前後を切らない（0.2 節の 4） | 無い |
| 決定 2 | 面の色は中の線と同じ色とし、次の ⭐ の文（色の規則）がそのまま面にも掛かるように、「中の線と点の色」を「中の線・点・面の色」と書き直す | 描画はすでに `innerInk` で面を塗る（0.2 節の 3） | 旧の ⭐ の文も書き換わる（E-01 に含めた） |
| 決定 3 | 面の薄さ（塗りの不透明度）の値は、本書では文に書かない | 値は図 F-044 の `.shade` の様式（`fill-opacity: 0.35`、`fig-milestone-shapes.svg:11`）が持つ | ⚠️ `schedule-task-figures.ts:381` の `SHADE_FILL_OPACITY = 0.35` は図の値の手写しである（9 節に申し送り） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 書類の折り返しの描き方 | 表 T-221 の `LF-18`（`05-07-design.md:1330`） | E-01 |
| 図 F-044・`:1344`・`:1345` の文 | 変えない | — |

**数**: 表の行の編集 1（E-01）。原稿 JSON の編集 0。図の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（964efc45） | 置き換わる先 | 編集 |
|---|---|---|---|
| 列挙の「書類の折り返し・」 | `05-07-design.md:1330` の `LF-18` の 2 文目 | 3 文目の後ろに足す「書類の折り返しは、…薄く塗った面…で描く。」 | E-01 |
| 「中の線と点の色は」 | 同じ行の ⭐ の文 | 「中の線・点・面の色は」 | E-01 |
| その引用 | `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts:45` | 新の 2 文目 | ⛔ 本書は直さない。2 波 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（964efc45 で 1 回）。旧・新は行の全体（末の改行まで）である。

<!-- EDIT id=E-01 file=docs/spec/05-07-design.md -->
旧
```text
| LF-18 | マイルストーンの図形の線と塗り | 外形は塗り、縁の線で囲む。<br>絵の中の線（箱の稜線・円筒と杯の上面の手前の弧・書類の折り返し・フロッピーの窓・顔の口）は、塗りに穴を開けずに、塗りの上に線で描く。<br>顔の目は点で塗る。<br>⭐ 中の線と点の色は、予定では予定の縁の色、実績とダミーでは予定の塗りの色とする —— 実績の塗りは濃いので、縁の色では見えない。<br>カスタムカラーのタスクでは、そのタスクの予定の塗りの色である。<br>⭐ 重なる部分は、奥から順に描く —— 人は胴の上に頭、杯は取っ手の上に胴。<br>⭐ 円・顔の輪郭・円筒・杯の丸みは曲線で描き、多角形で近似しない —— 多角形は拡大すると角が見える。<br>⭐ 形そのもの（単位の正方形の中の座標）は 図 F-044 が持つ。<br>⭐ `_assets/tbl-glossary.md` の 図 F-019 のグリフは同じ形を線だけで描く。<br>違いは 2 つだけとする —— 杯の取っ手は 1 本の線（小さな箱では二重の線が潰れて 1 つの塊になる）、人の肩の線は頭の輪郭で止める（線だけの絵には、胴を隠す塗りが無いため） |
```
新
```text
| LF-18 | マイルストーンの図形の線と塗り | 外形は塗り、縁の線で囲む。<br>絵の中の線（箱の稜線・円筒と杯の上面の手前の弧・フロッピーの窓・顔の口）は、塗りに穴を開けずに、塗りの上に線で描く。<br>顔の目は点で塗る。<br>書類の折り返しは、塗りの上に薄く塗った面（`shade`）で描く —— 面は紙の裏を見せ、角が折れていると読ませる。線だけでは、角の欠けた四角と読まれうる。<br>⭐ 中の線・点・面の色は、予定では予定の縁の色、実績とダミーでは予定の塗りの色とする —— 実績の塗りは濃いので、縁の色では見えない。<br>カスタムカラーのタスクでは、そのタスクの予定の塗りの色である。<br>⭐ 重なる部分は、奥から順に描く —— 人は胴の上に頭、杯は取っ手の上に胴。<br>⭐ 円・顔の輪郭・円筒・杯の丸みは曲線で描き、多角形で近似しない —— 多角形は拡大すると角が見える。<br>⭐ 形そのもの（単位の正方形の中の座標）は 図 F-044 が持つ。<br>⭐ `_assets/tbl-glossary.md` の 図 F-019 のグリフは同じ形を線だけで描く。<br>違いは 2 つだけとする —— 杯の取っ手は 1 本の線（小さな箱では二重の線が潰れて 1 つの塊になる）、人の肩の線は頭の輪郭で止める（線だけの絵には、胴を隠す塗りが無いため） |
```

当てた後に打つもの: `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-221 row LF-18: the document fold ("file" milestone, lower-right
  corner) is no longer in the list of inner lines; it is a shaded face,
  role "shade" in figure F-044 (docs/spec/_assets/fig-milestone-shapes.svg,
  the group labelled "file": one body path and one shade path).
- The colour sentence now covers lines, dots AND faces: plan = the plan edge
  colour, actual and dummy = the plan fill colour, a custom-colour task = its
  plan fill colour.
- Expected code change: none (generate_milestone_shapes.py already maps shade
  to class h; schedule-task-figures.ts draws shade with innerInk).
- Test change: the quote at
  tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts:45
  follows the new second sentence; the tester adds one case that the "file"
  milestone draws exactly one shade element filled with the inner ink.
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（964efc45）

- `impact.py LF-18 F-044`: `LF-18` を指す要求 0 件・参照 2 箇所（`05-07-design.md:1344`・`:1345`、同じ節の前文）。`F-044` は表の行ではない（図）。
- ⭐ `:1344` は `shade` の役を、`:1345` はグリフとの違いを述べ、どちらも E-01 と食い違わない ⇒ ほかの文の書き換えは 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 964efc45 | 本書を当てた後 | 差 |
|---|---|---|---|
| 表 T-221 の行 | 変わらない | 変わらない | 0 |
| tables / figures / rows / uids（`md-checks.py`） | 変わらない | 変わらない | 0 |
| `05-07-design.md` の「書類の折り返し」 | 1 | 1 | 0（列挙から新しい文へ移る） |
| `LF-18` の中の `shade` | 0 | 1 | ＋1 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（1 回） | 調整役 |
| 1 | `docs/spec/05-07-design.md`（`LF-18` の 1 行）＋ `changelog.md` の 1 行 ＋ `cr-583` の試験の引用 1 行 | E-01、試験の `:45` の引用を新に合わせる、`gen:check`、check.sh | 段 B の **L1 描画**（`CR-583` の持ち場）。⛔ 仕様と引用は同じコミットに入れる —— 別にすると、間のコミットで検査 42 が赤になる |
| 2 | `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts` | 5 節の試験を 1 つ足す（仕様だけを読む試験の体） | L1。試験の体は `docs/spec` だけを読む |

- ⭐ **毎フレームの経路: いいえ。** コードは変わらない見込みである（0.2 節の 3）。`perf-pending.md` の行は要らない。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts` | `:45` の引用を新の文へ（1 波）、面の試験を 1 つ足す（2 波） | いいえ（試験） |
| `docs/development-records/defects.md` | `DFC-1225` を閉じる | いいえ |
| `docs/development-records/rulings.md` | `JDG-845` を「適用済」にする | いいえ |
| ⚠️ 申し送り: `src/adapter/svg-renderer/schedule-task-figures.ts:381` | `SHADE_FILL_OPACITY = 0.35` は図 F-044 の `.shade` の値の手写しである。本書は直さない —— 図から生成器で運ぶかを調整役が別に決める | いいえ（定数） |

---

## 10. ⛔ この変更でやらないこと

- 図 F-044 を変えない（`JDG-845` は図に合わせた）。
- 図 F-019 のグリフとの違い（`:1345` の 2 つ）を変えない。
- 面の薄さの値を文に書かない（決定 3）。

---

## 11. 前に立つ者へ返す問い

無い —— `JDG-845` が決めた。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-845` | 0.1 節 | 「指示 —— `DFC-1225` の変更要求が当てる」。当てたら「適用済」 |
| `DFC-1225` | 0.2 節の 1 | `仕様待ち`。当てたら閉じる |

---

## 13. 測り方の再現

```
# the tree: lane-l1 964efc45

# the old sentence appears once (section 4)
grep -c '絵の中の線（箱の稜線・円筒と杯の上面の手前の弧・書類の折り返し・フロッピーの窓・顔の口）は、塗りに穴を開けずに、塗りの上に線で描く。' docs/spec/05-07-design.md   # -> 1

# the figure draws the fold as a shade (0.2 item 1) and its opacity (decision 3)
sed -n '11p;59,62p' docs/spec/_assets/fig-milestone-shapes.svg

# the generator and the renderer already know shade (0.2 item 3)
grep -n 'shade' tools/generate_milestone_shapes.py src/adapter/svg-renderer/schedule-task-figures.ts

# tests that quote LF-18 (0.2 item 4)
grep -n '書類の折り返し\|LF_18\|顔の目は点で塗る' tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts

# only the landed CR that wrote the old text holds it
grep -rl '書類の折り返し・フロッピーの窓' change-request/   # -> CR-583 (landed) and this file

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py LF-18 F-044
```

### 13.1 ⚠️ 測りが見られなかったもの

- **実物で「書類」のマイルストーンを見てはいない。** 面の塗りの色が予定・実績・カスタムカラーで決定 2 のとおりかは、2 波の試験が確かめる。
