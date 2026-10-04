# CR-664 —— プロパティパネルの色の行を、ほかの欄と同じ右の端と値の欄にそろえる

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `79d9eaf8` から早送りした作業木の、`CR-662` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-664`、裁定の帯 `JDG-1405`〜`JDG-1409`、台帳の帯 `DFC-2061`〜`DFC-2063` は調整役から受けた（13 節で、木のどこにも `CR-664` と `DFC-2061` が無いことを測った）。裁定は `JDG-1344`・`JDG-1347`（既に記録済み）で、帯の `JDG-` は使っていない。台帳は `DFC-2061`・`DFC-2062` を起こした（12 節）。仕様の新しい識別子は取らない。
> 閉じるもの: 台帳 `DFC-2038`（プロパティパネルの色の欄が左に寄る）。
> 埋める穴: `FR-006` の色の行の例外は、上の 1 行の項目名の寄せも、色の欄の中身の始まりも言っていなかった。`CR-606` の E-30（`92c813d9`）は両方を左端からにした —— 利用者の裁定ではなく体が選んだ形なので、覆す裁定の行は無い。
> ⚠️ 並行して `CR-663`（タスクの説明の語、`tooltips.ts`）と `CR-660`（検索・遅延診断の表）が起草されている。本書は `tooltips.ts`・検索パネル・報告に触れない。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1344` | 「4) プロパティーパネルの色設定が左寄せになった。 右寄せにしろ。」 | 色の行の項目名をほかの行と同じ右の端に置く（E-01） |
| `JDG-1347` | 「(a) 項目名も中身も揃える (Recommended)」 | 色の欄の中身も値の欄の左端から始める（E-01） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（マニュアルを読まずに使える） —— 名前と値の境目が色の行だけ違うと、目がその行で境目を探し直す（`FR-006` の右詰めの理由）。境目を全行で 1 本の縦の線にそろえる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— 寄せの正は `FR-006` の「項目名は値の欄の左に置き、右詰めにすること（MUST）」である。色の行の例外はその 1 行の置き場だけを変え、寄せを言っていなかった。⇒ 例外の文の直後に、寄せと中身の始まりを言う 1 文を足す。幅は既に `S-189` が持つので写さない。
- **`R2.14`（POLA）** —— 例外の理由「名を左に置くと、見本の段が名の幅だけ狭くなる」は、本書の後は成り立たない（中身は値の欄の幅で描く）。⇒ 理由を書き直す（決定 X-1）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 項目名を上の 1 行に置く理由を「名を中身の 1 行目の横に置くと、名がその 1 行だけの名に読める」に替える | 上の 1 行に置くことは `JDG-990` の問い 1 が決めて変えない。前の理由（見本の段が狭くなる）は `JDG-1347` の (a) で偽になる。色の欄の 1 行目は側ごとの見本と値の行（`CV-9` の ①）であり、名がその横に立つと、② 〜 ④ の段を名の無い段に見せる | 理由は前に立つ者の読みであり、利用者の言葉ではない |
| X-2 | 色の欄の最後の行（透明とカスタム）とテーマの行を、幅が足りなければ折り返す | `FR-006` の「同じ行に並ぶ操作子をすべてその幅で並べられないときは、その行を折り返すこと（MUST）」。中身が値の欄の幅に狭まるので、狭いパネルで初めて効く | 狭いパネルでは透明とカスタムが 2 行になる |
| X-3 | 見本の段（`S-338` 個）とテーマに戻す入口の幅は縮めない | `FR-006` の「1 つの操作子に、その値を出すのに要る幅より狭い幅を割ってはならない（MUST NOT）」 | パネルの幅が約 238px を切ると、テーマに戻す入口がパネルの右の縁を越える（下限 `S-248` の 160px で 46px）—— `DFC-2061` に記録し、11 節で問う |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 色の行の項目名の寄せと中身の始まり、例外の理由 | `docs/spec/01-04-requirements.md` の `FR-006`（色の行の例外の文と、その直後） | E-01 |
| 裁定 | `docs/development-records/rulings.md` の `JDG-1344`・`JDG-1347`（適用済） | E-02 |
| 変更履歴 | `docs/development-records/changelog.md` に版 3.67 の 1 行 | E-03 |

**数**: 表の行の増減 0。要求の増減 0。図 0。`FR-006` の文の書き換え 1 と、足す文 1（MUST 1 つ）。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `FR-006` の色の行の例外の理由 | 「名を左に置くと、見本の段が名の幅だけ狭くなる。」 | 「名を中身の 1 行目の横に置くと、名がその 1 行だけの名に読める。」（X-1） |

⭐ 消さないもの: 例外の本文「⭐ ただし、色の行（入力の型が `色` の行）は、項目名を欄の上の 1 行に置くこと（MUST）」（`JDG-990` の問い 1。`tests/contract/cr-606-the-panel-rows-follow-t-016.test.ts` が引く）、`CV-9` の ⓪、`S-189`。

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-006` の色の行の例外の文の後半（理由）を 3 節のとおり替え、その直後（「幅は `S-189` が持つ。」の前）に次の 1 文を足す。

- 新: 「その 1 行でも項目名はほかの行と同じ項目名の欄に右詰めで置き、色の欄の中身は値の欄の左端から始めること（MUST） —— 名前と値の境目を、色の行でもほかの行と同じ縦の線に揃える。」

<!-- EDIT id=E-02 file=docs/development-records/rulings.md -->
`JDG-1344`・`JDG-1347` の状態を 適用済、着地先を `FR-006` にする。

<!-- EDIT id=E-03 file=docs/development-records/changelog.md -->
表の末尾に版 3.67 の 1 行を足す（並行した `CR-663` が 3.65、`CR-662` が 3.66 を取ったので、統合のときに調整役が振り直した）。

---

## 5. 継ぎ目

```
SEAM (CR-664)
- properties-panel-drawing.ts propertyFieldNameAboveStyle: the name takes its own line
  (flex-basis 100%, border-box) and pads its right side by 100 - S-189 percent, so its
  right-aligned text ends on the name column's edge, the same as propertyFieldNameStyle.
- properties-panel-drawing.ts propertyControlsBelowNameStyle (new): propertyControlsStyle
  plus margin-left = S-189 percent + S-190 px, the left edge of every other row's value.
  fieldElement picks it when field.isNameAbove is true.
- properties-panel-drawing.ts colourLastLineStyle: flex-wrap: wrap (X-2).
- properties-panel.ts (isNameAbove) is unchanged: which rows carry the name above stays.
```

---

## 6. グラフ（`79d9eaf8`）

- `impact.py FR-006`: 要求 6 件 / 参照 30 か所。どれも `FR-006` の寸法・入力の型・字の大きさを指すだけで、色の行の項目名の寄せを写していない。
- 寄せを言う文を `grep -n "名の幅だけ狭く\|欄の上の 1 行" docs/spec` で数えた: `FR-006` の 1 か所と `CV-9` の ⓪（「欄の名（`FR-006` の項目名）だけの 1 行」—— 寄せを言わず、`FR-006` を指す。変えない）。`CR-606` の 568 行は履歴であり書き換えない。

---

## 7. 数の予測と実測

`79d9eaf8` に本書を当ててビルドした `dist/index.html` を、Playwright（msedge、1920×1080、`en-US`）でタスク 16 を選んで測った。測り方は 13 節。

| 数 | 前 | 後（実測） |
|---|---|---|
| 色の行の項目名の字の右端（パネルの幅 279px） | パネルの左端から（左詰め） | 1760px —— ほかの行と同じ |
| 色の欄の中身の左端（同） | パネルの左端 | 1766px —— ほかの行の値の欄と同じ（項目名の右端 ＋ `S-190` の 6px） |
| 色の行がパネルの右の縁を越える量（279 / 240 / 220 / 200 / 180 / 159px） | 0（全幅） | −8 / −0.9 / 10.7 / 22.3 / 33.9 / 46.1px |
| 暗いテーマ（159px） | — | 明るいテーマと同じ位置 |

⚠️ 越えるのはテーマに戻す入口（「Project theme colour」）で、その入口の要る幅が値の欄より広くなる幅（約 238px）から下で越える。ほかの行も下限の幅では既に越えている（同じ測りで `PR-16` 担当 40.9px、`PR-15` WBS の親 249.8px）。

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ＋ 台帳 | E-01〜E-03 |
| 2 | `src/framework/dom-screen-surface/properties-panel-drawing.ts` | 5 節の継ぎ目 |
| 3 | `tests/` | 9 節 |

- ⭐ **毎フレームの経路: いいえ。** パネルの DOM は記述が変わったときだけ作り直す（`propertiesPanelKeyOf`）。`perf-pending.md` に行は足さない。

---

## 9. 仕様の外で直すもの

- コード: 8 節の波 2。
- 新しい試験（仕様だけを読む体）: 色の行の項目名の右端と中身の左端が、ほかの行の項目名の右端と値の左端に一致すること（明暗の両テーマ、既定の幅と下限の幅）。
- 動く試験: 旧の振る舞い（左詰め）を言う試験は無い（`grep -rn "text-align:left\|NameAbove" tests`）。`cr-606-the-panel-rows-follow-t-016.test.ts` が引く例外の本文は変えていない。
- 台帳: `defects.md` の `DFC-2038`（`仕様待ち` → `実測待ち`）、新しい `DFC-2061`（X-3）と `DFC-2062`（13 節で見つけた `PR-15` のはみ出し）、`rulings.md` の 2 行。

---

## 10. ⛔ この変更でやらないこと

- 色の行が項目名を上の 1 行に置くこと（`JDG-990` の問い 1）は変えない。
- 見本の数（`S-338`）、入口の語、`CV-9` の並びは変えない。
- 狭いパネルでテーマに戻す入口を縮めることはしない（X-3）。

---

## 11. 利用者に問うこと

1. パネルを約 238px より狭くすると、色の欄のテーマに戻す入口がパネルの右の縁を越える（下限 160px で 46px。ほかの欄も下限では越える）。このままでよいか、それとも狭いときだけ色の欄の中身を全幅に戻すか（`DFC-2061`）。前に立つ者の推し: このまま —— 既定の幅（280px）では収まり、狭めた人は横に送って読める。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1344`・`JDG-1347` | 本書の裁定。適用済、着地先は `FR-006` |
| `JDG-863`・`JDG-990` | 色の欄の並びと名の置き場の裁定。本書はそれを変えない —— 書き換えない |
| `DFC-2038` | 本書が閉じる。`仕様待ち` → `実測待ち` |
| `DFC-2061` | 狭いパネルで色の欄の入口が右の縁を越える（X-3）。新しく起こす |
| `DFC-2062` | WBS の親の欄（`PR-15`）が既定の幅でもパネルの右の縁を越える（実測 178.5px）。本書の外。新しく起こす |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 79d9eaf8, CR-662 on top

# the numbers are unused
git grep -n -e "CR-664" -e "DFC-2061" -e "DFC-2062"     # 0 before drafting

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-006
grep -rn "名の幅だけ狭く\|欄の上の 1 行" docs/spec

# tests that hold the old shape
grep -rn "text-align:left\|NameAbove" tests

# the measurement of section 7 (a Playwright probe kept outside the tree)
#   build dist, open dist/index.html at 1920x1080 en-US, double-click task-16-plan, Escape;
#   for every [data-field-row] div of the Properties Panel read the right edge of the name's
#   text (a Range over the first span) and the left edge of the second child;
#   drag the panel's left boundary to 240 / 220 / 200 / 180 px and to the floor, read again;
#   press IC-16 (dark theme) and read again.
```
