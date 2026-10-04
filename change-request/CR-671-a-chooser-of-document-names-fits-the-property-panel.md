# CR-671 —— 文書の中の名を選ぶ欄は、プロパティパネルの幅に収め、入らない名を「…」で省く

> 起草の状態: 当てた（2026-10-04 夜、調整役の統合点 `032c9ce4` から早送りした作業木）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-671`、裁定の帯 `JDG-1448`〜`JDG-1449`、台帳の帯 `DFC-2089` は調整役から受けた（13 節で、木のどこにも 4 つが無いことを測った）。利用者の言葉は無いので、裁定の帯は使っていない。台帳は `DFC-2089`（下限の幅で空の日付の欄が字の形を切る、本書の外）を起こした。仕様の新しい識別子は取らない。
> 閉じるもの: 台帳 `DFC-2062`（WBS の親の欄が既定の幅でもパネルの右の縁を越える）。
> 決めるもの: 台帳 `DFC-2061`（狭いパネルで色の欄の入口が右の縁を越える）は調整役の推し「このまま」を読みとして記し、利用者に問う（11 節）。
> 埋める穴: `FR-006` は `文字` と `複数行` の操作子だけを「要る幅」の規則から外していた。`選択` の操作子のうち候補が文書の中の名であるもの（`PR-15` の親の名、`PR-16` の担当者の名）は、同じく人が書く長さの決まらない文なのに規則の内に残り、コードは要る幅を候補のうちいちばん長い名で測っていた。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

本書のための利用者の言葉は無い。向きを決めた先の言葉は `JDG-159`（「プロパティーパネルの名称と備考が右にはみ出している。はみ出さないようにしろ。」、`CR-408`）であり、本書は同じ理由を `選択` の欄へ広げる。`DFC-2062` の対応案 ②「名を欄の中で省く」を採る。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（マニュアルを読まずに使える） —— 欄がパネルの右の縁で切れると、値の後ろも、欄の縁も見えず、何が選ばれているかを横に送って探すことになる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（唯一の正）** —— はみ出さない規則の正は `FR-006` の `文字`・`複数行` の段である。⇒ 同じ段の後ろに、`選択` のうち候補が文書の中の名であるものを足す。どの行がそれに当たるかは数え上げない（「候補がスキーマの選択肢でないもの」という性質で言う。表 T-016 の行を足したときに 2 か所を直さない）。
- **`R2.14`（POLA）** —— 選択の欄は折り返せないので、`文字` の欄と同じ「縦に伸ばす」は当てられない。⇒ 省いて「…」で示す（決定 X-2）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | `選択` の操作子のうち候補を文書の中の名から集めるものは、要る幅の規則から外し、パネルの幅に収める | `FR-006` の `文字`・`複数行` の段と同じ理由（人が書く長さの決まらない文）。コードは要る幅を、選んでいる名ではなく候補のうちいちばん長い名で測っていた —— 文書に長い名が 1 つ在るだけで、どのタスクを選んでも欄が外へ出る | 名が値の欄より長いときは、欄に名の全部が見えない |
| X-2 | 入らない名は欄の中で後ろを省き、「…」で示す。全部は開いた候補の一覧で読む | 選択の欄は 1 行で、折り返して縦に伸ばせない（`DFC-2062` の対応案 ②） | 似た頭の名が 2 つあると、閉じた欄では見分けにくい |
| X-3 | 色の欄（`DFC-2061`）は変えない | 調整役の推し —— 既定の幅 280px では収まり、ほかの欄も下限の幅では越えていた。`CR-664` の X-3（入口を縮めない）を保つ | 約 238px より狭いと、テーマに戻す入口が右の縁を越えたまま（11 節で問う） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 文書の中の名を選ぶ欄の幅と省き方 | `docs/spec/01-04-requirements.md` の `FR-006`（`文字`・`複数行` の段の後ろに 1 段） | E-01 |
| 台帳 | `docs/development-records/defects.md` の `DFC-2062`・`DFC-2061` | E-02 |
| 変更履歴 | `docs/development-records/changelog.md` に版 3.72 の 1 行 | E-03 |

**数**: 表の行の増減 0。要求の増減 0。図 0。`FR-006` に足す段 1（MUST 2 つ・MUST NOT 2 つ）。

---

## 2. 新しい識別子

取らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

消す文は無い。`FR-006` の「1 つの操作子に、その値を出すのに要る幅より狭い幅を割ってはならない（MUST NOT）」は残り、足す段がその例外を 1 つ増やす。

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-006` の、閉じる入口（`IC-52`）を欄に重ねない文の後ろに、次の段を足す。

- 新: 「⭐ 表 T-016 の `入力の型` が `選択` の操作子のうち、候補を文書の中の名から集めるもの（候補がスキーマの選択肢でないもの）にも、上の「要る幅より狭い幅を割ってはならない」を当てず、パネルの幅の中に収めること（MUST）。」
- 新: 「⛔ その操作子をパネルの右へはみ出させてはならない（MUST NOT） —— 候補はタスクの名や人の名であり、名称と同じく人が書く長さの決まらない文なので、要る幅を割ると、文書にいちばん長い名が 1 つ在るだけで欄がパネルの外へ出る。」
- 新: 「⭐ 欄の幅に入り切らない名は、欄の中で後ろを省き、省いたことを「…」で示すこと（MUST） —— 選択の欄は 1 行であり、`文字` の欄のように折り返して縦に伸ばせない。」
- 新: 「名を省かずに読むのは、開いた候補の一覧である。」
- 新: 「⛔ 省くのは見せ方であり、値を変えてはならない（MUST NOT）。」

<!-- EDIT id=E-02 file=docs/development-records/defects.md -->
`DFC-2062` を `実測待ち` にし、原因（要る幅を候補のいちばん長い名で測っていた）と着地先（`FR-006`）を書く。`DFC-2061` を `裁定待ち` にし、調整役の推し（① このまま）を対応方針の読みとして書く。

<!-- EDIT id=E-03 file=docs/development-records/changelog.md -->
表の末尾に版 3.72 の 1 行を足す（並行する組と重なれば、統合のときに調整役が振り直す）。

---

## 5. 継ぎ目

```
SEAM (CR-671)
- properties-panel.ts Candidates.areDocumentNames: true from parentCandidates (PR-15),
  false from the schema's choices. controlOf hands NO_ROOM_FLOOR (0) as widthInFontSizes
  when it is true, else widthOf as before.
- properties-panel.ts assigneeControls (PR-16): widthInFontSizes = NO_ROOM_FLOOR.
- properties-panel-drawing.ts propertyControlStyle: adds text-overflow:ellipsis. A control
  handed its floor never reaches it; one handed 0 fills the value column (flex:1, min-width 0)
  and the host cuts the shown name with an ellipsis.
- Nothing else moves: the option list of the select and the combo's candidate list keep the
  whole names.
```

---

## 6. グラフ（`032c9ce4`）

- `impact.py FR-006`: 要求 6 件 / 参照 30 か所。どれも `FR-006` の寸法・入力の型・字の大きさを指すだけで、要る幅の例外を写していない。
- 要る幅を言う文を `grep -rn "要る幅" docs/spec` で数えた: `FR-006` の段と、表 T-206 の `S-199` の名（「値のほかに要る幅」—— 変えない）だけ。

---

## 7. 数の予測と実測

`032c9ce4` と本書を当てた木をそれぞれビルドした `dist/index.html` を、Playwright（chromium、1920×1080）でタスク 16 を選んで測った。測り方は 13 節。数はパネルの右の内側の縁を越える量（px、正が越える）。明暗・`ja`／`en` の 4 通りで同じ数（`en` の色の行だけ語の長さで違う）。

| 欄 | 幅 | 前 | 後（実測） |
|---|---|---|---|
| `PR-15` WBS の親 | 280px（既定、`S-171`） | 178 | 0（欄の幅 147px、「Mobile Client workstre…」と省く） |
| `PR-15` | 240px | 201.2 | 0（123px） |
| `PR-15` | 160px（`S-248`） | 247.6（`ja`）／ 248.8（`en`） | 0（77px ／ 76px） |
| `PR-15` | 159px | 248.1 ／ 249.8 | 0 |
| `PR-16` 担当 | 160 ／ 159px | 40.4 ／ 40.9 | 0 ／ 0（「Ana…」と省く） |
| `PR-12`・`PR-39` 色の欄 | 160 ／ 159px | 25.9 ／ 26.5（`ja`）、45.5 ／ 46.1（`en`） | 変わらない（`DFC-2061`、11 節の問い 1） |

⚠️ 前の `PR-15` の選択の欄は `min-width` 332.5px（候補のいちばん長い名の要る幅）で、選んでいる名「Mobile Client workstream」より広かった。

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | `docs/spec/01-04-requirements.md` ＋ 台帳 | E-01〜E-03 |
| 2 | `src/adapter/screen-renderer/properties-panel.ts`・`src/framework/dom-screen-surface/properties-panel-drawing.ts` | 5 節の継ぎ目 |
| 3 | `tests/` | 9 節 |

- ⭐ **毎フレームの経路: いいえ。** パネルの DOM は記述が変わったときだけ作り直す（`propertiesPanelKeyOf`）。ただし検査 66 は `properties-panel.ts` を毎フレームの経路の名簿に数えるので、`perf-pending.md` に行 92 を足した。

---

## 9. 仕様の外で直すもの

- コード: 8 節の波 2。
- 新しい試験（仕様だけを読む体）: 候補が文書の中の名である選択の欄（`PR-15`・`PR-16`）が、既定の幅と下限の幅でパネルの右の縁を越えないこと、入らない名が「…」で省かれること、値が変わらないこと。スキーマの選択肢の欄（`PR-17` ほか）は要る幅を保つこと。
- 動く試験: 旧の振る舞い（候補のいちばん長い名で幅を測る）を言う試験は無い（`grep -rln "wbsParentUid\|PR-15" tests | xargs grep -ln "widthInFontSizes"` は 0 件）。
- 台帳: `defects.md` の `DFC-2062`（`未検討` → `実測待ち`）と `DFC-2061`（`未検討` → `裁定待ち`）、新しい `DFC-2089`（12 節）。

---

## 10. ⛔ この変更でやらないこと

- `文字`・`複数行`・`日付`・`数値` の欄、スキーマの選択肢の欄の幅は変えない。
- 色の欄（`CV-9`）の入口を縮めない（`CR-664` の X-3、`DFC-2061`）。
- 候補の一覧の並びと語は変えない。

---

## 11. 利用者に問うこと

1. パネルを約 238px より狭くすると、色の欄のテーマに戻す入口がパネルの右の縁を越える（下限 160px で `ja` 25.9px・`en` 45.5px。`DFC-2061`）。このままでよいか、狭いときだけ色の欄の中身を全幅に戻すか。調整役の推し: **このまま** —— 既定の幅（280px）では収まり、狭めた人は横に送って読める。
2. 文書の中の名を選ぶ欄（WBS の親・担当）は、入らない名を「…」で省くことにした（X-2）。名を欄の中で折り返して縦に伸ばす（`文字` の欄と同じ）ほうがよいか。前に立つ者の推し: **省く** —— 選択の欄は折り返せず、全部は開いた一覧で読める。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `DFC-2062` | 本書が閉じる。`未検討` → `実測待ち` |
| `DFC-2061` | 調整役の推し（このまま）を読みとして記し、利用者に問う。`未検討` → `裁定待ち` |
| `DFC-2089` | 下限の幅（160px）で、値の無い日付の欄が字の形（`yyyy/mm/dd`）と暦の釦を切って描く。本書の前のビルドでも同じで、本書の外。新しく起こす（`未検討`） |
| `JDG-159` | 向きを決めた先の裁定。書き換えない |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to 032c9ce4

# the numbers are unused
git grep -n -e "CR-671" -e "DFC-2089" -e "JDG-1448" -e "JDG-1449"     # 0 before drafting

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-006
grep -rn "要る幅" docs/spec

# tests that hold the old shape
grep -rln "wbsParentUid\|PR-15" tests | xargs grep -ln "widthInFontSizes"

# the measurement of section 7 (a Playwright probe kept outside the tree)
#   build dist, open dist/index.html at 1920x1080 in a ja-JP and an en-US context, each light
#   and dark (colorScheme); double-click task-16-plan, Escape;
#   for every div[data-field-row] of the Properties Panel take the largest right edge of its
#   descendants minus the panel's right edge less its right border;
#   drag the panel's left boundary to 240 / 160 / 159 px and read again.
```
