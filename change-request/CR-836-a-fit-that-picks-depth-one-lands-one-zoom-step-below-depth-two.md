# CR-836 —— 全体表示が深さ 1 を採ったときの縦の倍率は、深さ 2 のしきい値の 1 刻み下とする

> 起草の状態: 起草だけ（2026-10-24、枝 `draft-crs-31`、起点 develop `d0ae3a9c8`）。当てていない —— `docs/spec`・`src`・`tests` に触れていない。当てるのは後の子セッション（計画 uid 35）。
> 当てる裁定: `JDG-300`（2026-09-22、`PND-204` を推奨どおり）。
> 閉じる台帳: `DFC-3448`（`仕様待ち`）。
> 新しい ID: 無い —— `FR-055` の本文に 1 段を足す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の鎖（`rulings.md` を「`PND-204`」「`FR-055`」「深さ 1」「全体表示」「縦の倍率」「`zoomY`」「`S-53`」で引いた）

- `JDG-300`（2026-09-22、一括の 100 件のうち 1 件）: `PND-204` を推奨どおりとした。推奨は「深さ 2 のしきい値の `S-53` 1 刻み下」である（`pending-decisions.md:191`、状態は `裁定済`）。理由は 2 つある。深さ 1 だけを描く最大の倍率なので「無用に縦幅を増やすな」に合うこと、そして縦ズーム拡大（`IC-15`）を 1 押しするとちょうど深さ 2 に乗ることである。
- `CR-549` が `@provisional` の印と STOP を外した。だが値を仕様の文に書かなかった。`CR-423` の 9 節の問い 1 も、同じ穴を返している。
- これを覆す裁定は無い（`rulings.md` を上の語で引いて、`JDG-300` の後に `PND-204` や深さ 1 の倍率を名指す行は 0 件）。
- 台帳: `defects.md` の `DFC-3448`（本書が閉じる）。隣に `DFC-647` と `DFC-3446` がある（どちらも本書の外）。
- コードは裁定どおりに既に動いている。`src/entity/layout-engine/schedule-layout/fit-zoom.ts:36-39` の `landingZoomY` は、深さ 1 なら `groupDepthThresholdOf(2, settings) / step` を返す。`step` は `S-96` で、その値は `S-53` である（`docs/spec/_assets/tbl-settings.md:457`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-002`（全体日程を 1 画面で見られる）。全体表示（`FR-055`）は深さ 1 まで落としても収まらない文書で深さ 1 を採る。そのときの縦の倍率が、仕様のどこにも書かれていない。そのため仕様だけを読む試験が書けない（`tests/unit/cr-423-the-vertical-zoom-stops-where-the-picture-stops-changing.test.ts:727` の `it.skip`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R1.2`**（検証できること）と **`R2`**（規則の在り処が 1 つ）。

- `R1.2`: 値が文に無いので試験が書けない。値を書けば試験は 1 本で済む。
- `R2`: しきい値の式は表 T-205 の `S-87`・`S-88` の注が持ち、刻みは `S-53` が持つ。`FR-055` はその 2 つを指すだけにして、数（0.32 ÷ 1.1）を書かない。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 深さ 2 以上の段を採ったときの着地する縦の倍率（その段のしきい値）も、同じ 1 段に書く。`FR-055` は「その段が着地する縦の倍率」を 2 か所で使うが（6412・6414 行）、値をどこにも定めていない。コードはその段のしきい値に着地させている（`fit-zoom.ts:38`）ので、それをそのまま書く。深さ 1 の値だけを書くと、言葉の半分が定義されないまま残る。
2. ⭐ `FR-018` は書き換えない。induced.py は `FR-018` と `FR-055` の輪を 1 つ示す。だが、本書が書くのは `FR-055` だけである。`FR-018` のしきい値の定義は今のまま読む。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 採った段が着地する縦の倍率を定める（深さ 2 以上はその段のしきい値、深さ 1 は深さ 2 のしきい値を `S-53` で 1 度割った値） | `FR-055` | `docs/spec/01-04-requirements.md` の `FR-055` の本文に 1 段 |
| 2 | 飛ばしていた試験を書く | —— | `tests/unit/cr-423-the-vertical-zoom-stops-where-the-picture-stops-changing.test.ts:727` の `it.skip`（仕様だけを読む別のサブエージェント） |

## 2. 影響

```
数の予測         tables 0 ・ rows 0 ・ uids 0 ・ figures 0 ・（MUST）+1（FR-055 の 1 段）
仕様の他の行     impact.py FR-055 —— この要求を指す要求 19 件・参照 55 箇所。
                 足す段は値を定めるだけで、どの参照の読みも変えない（参照はみな「全体表示」を指すだけ）
induced.py       FR-055 FR-018 S-87 S-88 S-53 T-205 —— 種 6 / 種の間の辺 6 / 輪 1（大きさ 2: FR-018 FR-055）。
                 書くのは FR-055 だけなので 1 回で足りる
生成物           無い
コード           変わらない（fit-zoom.ts の landingZoomY が既にこの値を返す）
試験             仕様だけを読む試験を 1 本足す（4 節）
毎フレームの仕事 変わらない
```

## 3. 書き直す所

### X-1 —— `FR-055` の本文（`docs/spec/01-04-requirements.md` 6406 行の「⛔ 採った段を描ける最小の倍率より下へ…」の段の直後）

前: （無い）

後:

```
⭐ 採った段が着地する縦の倍率は、深さ 2 以上ではその段のしきい値（`_assets/tbl-settings.md` の 表 T-205 の `S-87`・`S-88` が定める式）とし、深さ 1 では深さ 2 のしきい値を `S-53` で 1 度割った値とすること（MUST） —— 深さ 1 には「描ける最小の倍率」が無い（`FR-018` のしきい値は深さ 2 から始まる）ので、深さ 1 だけを描く倍率のうち最も大きいものを採る。縦軸を拡大する入口（表 T-109 の `IC-15`）を 1 度押すと、ちょうど深さ 2 に乗る（利用者が定めた）。
```

消すもの: 無い。

## 4. 継ぎ目（コード）と試験

- 継ぎ目: `src/entity/layout-engine/schedule-layout/fit-zoom.ts` の `fitZoom`（165 行）が返す `FitToScreen.zoomY`。名も形も変えない。
- 仕様だけを読む試験（別のサブエージェント）が確かめること:
  1. 深さ 1 でも `Task Group Area` に収まらない文書で全体表示（`IC-10`）を押すと、書いた `zoomY` が、深さ 2 のしきい値（`S-87`）÷ `S-53` に等しいこと。
  2. 続けて `IC-15` を 1 度押すと、深さ 2 のタスクグループが描かれること。押す前は描かれないこと。
  3. 深さ 3 で収まる文書で全体表示を押すと、書いた `zoomY` が深さ 3 のしきい値（`S-87` × `S-88`）に等しいこと。
- 上の 1 と 2 で、`tests/unit/cr-423-the-vertical-zoom-stops-where-the-picture-stops-changing.test.ts:727` の `it.skip` を置き換える。

## 5. 台帳

- `defects.md` の `DFC-3448` —— 当てたら、試験が緑になった時点で閉じてよい（画面の振る舞いは変わらない）。状態は調整役が決める。
- 変更履歴: `A-appendix.md` に 1 行（UTC の時刻、規則 10）。

## 6. 波

1 波で足りる。仕様（X-1）→ 仕様だけを読む試験（別のサブエージェント）。大きさ S。

## 11. 利用者に問うこと

無い —— 値は `JDG-300` が決めている。③ の 1 は、コードが既にしている読みを書くだけである。

## 13. 測り方の再現

```bash
grep -n "^| PND-204 " docs/development-records/pending-decisions.md
sed -n 36,39p src/entity/layout-engine/schedule-layout/fit-zoom.ts
grep -n "| S-96 \|| S-53 \|| S-87 \|| S-88 " docs/spec/_assets/tbl-settings.md
grep -n "着地する縦の倍率" docs/spec/01-04-requirements.md
sed -n 727p tests/unit/cr-423-the-vertical-zoom-stops-where-the-picture-stops-changing.test.ts
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-055
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-055 FR-018 S-87 S-88 S-53 T-205
```
