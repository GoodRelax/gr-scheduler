# CR-599 — 予定を表示しないときも、変更前の予定の輪郭の縦は予定の帯の縦とする

> 起草の状態: 起草した（2026-09-30、枝 `lane-l1`、段 B の持ち場 L1）。⛔ 仕様にもコードにもまだ当てていない —— 当てる時期は調整役が決める。
> 読んだ木: `lane-l1` `964efc45`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-599` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。
> 当てる順: `CR-588` の後（表 T-339 は `CR-588` が足した。`964efc45` で当たっている）。旧を持つほかの変更要求は、その文を書いた当てずみの `CR-588` だけである（13 節）。
> 閉じるもの: `DFC-1223`、`JDG-844`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-844` | 「予定の帯の縦 (推奨)」 | `S-227` が偽でも、輪郭の縦は配置の予定の帯の縦とする。表 T-339 の `BL-2` に 1 文を足す | 4 節の E-01 |

問うた場面（2026-09-27）: 「変更前の予定の輪郭（破線）: 「予定を表示」（S-227）をオフにしているときも輪郭は描く仕様ですが、縦の置き場を仕様が決めていません（DFC-1223）。どうしますか？」

### 0.2 調べた結果（964efc45）

1. **穴は 1 か所である。** 表 T-339 の `BL-1`（`01-04-requirements.md:3760`）は「予定の表示（同表の `S-227`）では止めない」と書く。一方 `BL-2`（`:3761`）は、縦を「一致する `Task` の予定の形が占める縦の範囲」と書く。`S-227` が偽のときは予定の形を描かないので、縦を取る形が画面に無い。仕様の自己矛盾ではなく、書かれていない場合である。
2. **コードはすでに推す案で動いている。** `schedule-geometry.ts:413` の `planExtentOf` は、配置（`TaskPlacement`）の `y` と `planHeight`（細い形では段の中央 ± 端の半分の高さ）から縦を取る。`S-227` を読まない。⇒ 手で書く src は 0 である。
3. **試験はまだ縦を見ていない。** `tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts:409` は「`S-227` が偽でも描く」だけを確かめる。
4. **旧の文を引く試験は影響を受けない。** 同じ試験の `:45` `BL_2_Y` は `BL-2` の 縦の文の前半を引く。E-01 はその文の後ろに 1 文を足すだけなので、引いた文字列は変わらない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 予定を隠して実績と変更前だけを比べるとき、輪郭が予定と同じ高さに留まる。表示を切り替えても輪郭の縦は変わらない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— `BL-1` と `BL-2` が同じ場合（`S-227` が偽）に別々の答えを持たない形に閉じる。
- **`R1.1`（抜け）** —— `DFC-1223` の穴を埋める 1 文である。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` を `BL-2`・`S-227`・「輪郭」で引いた。当たるのは `JDG-844` だけで、本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 足す文は「描いたなら予定の形が占める縦の範囲」と言い、`TaskPlacement` の名は書かない | 要求は描き方を言い、配置の型は設計（`05-07-design.md`）の言葉である | 実装の名との対応は 5 節の継ぎ目が持つ |
| 決定 2 | 文は `BL-2` の縦の文の直後に置く | 縦の規則を 1 か所に集める（`R2.21`） | 試験が引く隣の文（`:45`）は変わらない（0.2 節の 4） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| `S-227` が偽のときの輪郭の縦 | 表 T-339 の `BL-2`（`01-04-requirements.md:3761`） | E-01 |
| `BL-1`・`BL-3`・`BL-4`・`S-227`・`FR-049` | 変えない | — |

**数**: 表の行の編集 1（E-01）。原稿 JSON の編集 0。図の編集 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・関数の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消すものは無い。`BL-2` の文を 1 つも消さず、1 文を足す。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（964efc45 で 1 回）。旧・新は行の全体（末の改行まで）である。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
| BL-2 | 形と置き場 | 横は、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと（MUST）。<br>縦は、一致する `Task` の予定の形が占める縦の範囲とすること（MUST） —— 同じ位置に重ねることで、どの `Task` の変更前かを読ませる。<br>形は、`milestone`（`AT-138`）が偽なら矩形、真なら `start` の位置を中心とし、縦と横の対角線をどちらもその縦の範囲の高さとする菱形とすること（MUST） —— 変更前について読ませたいのは日付であり、現在の図形（表 T-012）を写すと、形が変わったのか日付が動いたのかが読めない。<br>置く区画（ピン止めの帯か、その下の残り、`FR-098`）は、一致する `Task` の予定の形と同じとする |
```
新
```text
| BL-2 | 形と置き場 | 横は、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと（MUST）。<br>縦は、一致する `Task` の予定の形が占める縦の範囲とすること（MUST） —— 同じ位置に重ねることで、どの `Task` の変更前かを読ませる。<br>予定を表示しない（`_assets/tbl-settings.md` の 表 T-202 の `S-227` が偽）ときも、縦は、描いたなら予定の形が占める縦の範囲とすること（MUST） —— 輪郭は `S-227` では止めない（`BL-1`）ので、縦の置き場も予定の表示に左右させない。<br>形は、`milestone`（`AT-138`）が偽なら矩形、真なら `start` の位置を中心とし、縦と横の対角線をどちらもその縦の範囲の高さとする菱形とすること（MUST） —— 変更前について読ませたいのは日付であり、現在の図形（表 T-012）を写すと、形が変わったのか日付が動いたのかが読めない。<br>置く区画（ピン止めの帯か、その下の残り、`FR-098`）は、一致する `Task` の予定の形と同じとする |
```

当てた後に打つもの: `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Table T-339 row BL-2 gains one sentence: when S-227 (planVisible) is false,
  the outline's vertical extent is still the extent the plan shape would take.
- The code source is schedule-geometry.ts planExtentOf(placed, settings):
  { top: placed.y, height: placed.planHeight } for ordinary shapes, and the
  thin tier middle +/- thinEndHalfHeightOf for thin shapes. It never reads S-227.
- Expected code change: none. The tester adds, in
  tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts, a case
  that geometryFromLayout with S-227 false gives the same baselineOutlines
  boxes (y and height) as with S-227 true, for one bar and one milestone.
- No new settings row, no new constant, no new identifier.
```

---

## 6. グラフ（964efc45）

- `impact.py BL-2 T-339`: `BL-2` を指す要求 0 件・参照 0 箇所（行は表 T-339 を通じてだけ指される）。表 T-339 を指す要求 2 件 —— `FR-015`（`01-04-requirements.md:3740`）・`FR-110`（`:4610`、`ZO-15`）。2 次は 10 件（`FR-031`・`FR-016`・`FR-108`・`FR-087` ほか）。
- ⭐ どれも「表 T-339 に従う」と指すだけで、縦の置き場を文で述べない ⇒ ほかの文の書き換えは 0。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 964efc45 | 本書を当てた後 | 差 |
|---|---|---|---|
| 表 T-339 の行 | 4 | 4 | 0 |
| tables / figures / rows / uids（`md-checks.py`） | 変わらない | 変わらない | 0 |
| `BL-2` の中の「（MUST）」 | 3 | 4 | ＋1 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（1 回） | 調整役 |
| 1 | `docs/spec/01-04-requirements.md`（`BL-2` の 1 行）＋ `changelog.md` の 1 行 | E-01、`gen:check`、check.sh | 段 B の **L1 描画**（`CR-588` の持ち場） |
| 2 | `tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts` | 5 節の試験を 1 つ足す（仕様だけを読む試験の体）。赤なら `planExtentOf` を直す | L1。試験の体は `docs/spec` だけを読む |

- ⭐ **毎フレームの経路: いいえ。** コードは変わらない見込みである（0.2 節の 2）。2 波の試験が赤になり `planExtentOf` を直すときだけ、毎フレームの経路（`geometryFromLayout`）に触れる —— そのときは `perf-pending.md` に行を足すよう調整役に伝える。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts` | 5 節の試験を足す | いいえ（試験） |
| `docs/development-records/defects.md` | `DFC-1223` を閉じる | いいえ |
| `docs/development-records/rulings.md` | `JDG-844` を「適用済」にする | いいえ |

---

## 10. ⛔ この変更でやらないこと

- `BL-1` の「`S-227` では止めない」を変えない（案 ② は `JDG-844` で退いた）。
- `S-227` の行・`FR-049` を変えない。
- 輪郭の横・形・区画を変えない。

---

## 11. 前に立つ者へ返す問い

無い —— `JDG-844` が決めた。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-844` | 0.1 節 | 「指示 —— `DFC-1223` の変更要求が当てる」。当てたら「適用済」 |
| `DFC-1223` | 0.2 節の 1 | `仕様待ち`。当てたら閉じる |

---

## 13. 測り方の再現

```
# the tree: lane-l1 964efc45

# the old row (section 4) appears once
grep -c '縦は、一致する `Task` の予定の形が占める縦の範囲とすること（MUST） —— 同じ位置に重ねることで、どの `Task` の変更前かを読ませる。' docs/spec/01-04-requirements.md   # -> 1

# the code already ignores S-227 (0.2 item 2)
sed -n '411,417p' src/entity/layout-engine/schedule-geometry/schedule-geometry.ts

# tests that quote BL-1 / BL-2 (0.2 items 3 and 4)
grep -n 'BL_2_Y\|BL_1_NOT_S227\|S-227' tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts

# only the landed CR that wrote the old text holds it
grep -rl '縦は、一致する `Task` の予定の形が占める' change-request/   # -> CR-588 (landed) and this file

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py BL-2 T-339
```

### 13.1 ⚠️ 測りが見られなかったもの

- **実物で `S-227` を偽にして輪郭を見てはいない。** 縦が予定と同じ所に在るかは、2 波の試験が確かめる。
