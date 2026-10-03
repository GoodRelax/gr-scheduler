# CR-640 — ヘッダーのコマンドのツールチップの説明を、裁定どおりの短い語に替える

> 起草の状態: 当てた（2026-10-03、調整役の統合点 `f5d5ff05` から早送りした作業木）。起草と当てを同じコミットで行った。4 節の旧はどれも当てる木で 1 回だった（13 節）。
> ID の帯: 番号 `CR-640` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の新しい行は取らない —— 生成だけで `src` に届くため（9 節）。
> 閉じるもの: `JDG-1166`・`JDG-1167`・`JDG-1168` の仕様の側（`DFC-1724`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（長いものは要るところだけを写した。全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語（要約） | 本書での扱い |
|---|---|---|
| `JDG-1166` | トリアージのセッションが渡した 15 個のヘッダーのコマンドの説明（ja）を利用者が直して返した。「図形と文字を明記 (Recommended)」（`IC-104`・`IC-105`）。「副作用だけ短く残す (Recommended)」（`IC-18`）。手を付けていない行は揃えない | 15 個の `hint`（ja）を `JDG-1166` の返した文に替える（4 節） |
| `JDG-1167` | 「案で揃える (Recommended)」—— 15 個の英語の説明を、`JDG-1166` の ja と同じ短さの示した案に揃える | 15 個の `hint`（en）を示した案に替える（4 節） |
| `JDG-1168` | 「詰める (Recommended)」—— `IC-4` の「。」の後の空白を詰める | `IC-4` の ja は「。」の後に空白を置かない（4 節） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-002`**（読まずに使える） —— `FR-092` の `EZ-2`（表 T-040）はポインタを乗せて待つとアイコンの説明を出すと定め、`EZ-4` は「読まずに使える最短の道」を手立てに挙げる。利用者が指摘した通り（`DFC-1724`）、28 個のうち主要な 15 個の説明が長く、読み切るまでに待ち時間（`S-124`）の後も時間がかかっていた。短い語に替えることは `EZ-2` の定める振る舞い（出す・消す・待ちの数え方）を変えず、語の中身だけを変える。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— 語の正は `docs/spec/_source/display-words.json` の `icons` の `hint` のみであり（`FR-092` の `EZ-2` の RATIONALE）、要求の文もグロッサリーの表も個々のアイコンの説明文を写していない（`impact.py` で確認、6 節）。⇒ 書き直す先は 1 か所（辞書の `hint`）だけで足り、ほかの表・要求を直さない。
- **`R1.4`（境界・空の場合）** —— 触る 15 行のどれも `label`（名前）・`面`・`何の入口か` は変えない（利用者の裁定の範囲外）ので、表 T-109・用語集の升は 1 つも変えない。
- **`R2.9`（YAGNI）** —— 新しい区・新しい列は立てない。既にある `icons.hint` の中身だけを変える。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | `label`（アイコンの名前）はどの行も変えない | `JDG-1166`・`JDG-1167`・`JDG-1168` はどれも `hint` だけを示した。`DFC-1724` の対応案も「`hint` に逐語で入れて `npm run gen` する」である | 無い |
| 決定 2 | 触れていない 13 個（`IC-1`・`IC-2`・`IC-3`・`IC-5`・`IC-6`・`IC-16`・`IC-17`・`IC-20`・`IC-22`・`IC-100`・`IC-107`・`IC-115`・`IC-117`）の `hint` は変えない | `JDG-1166` の「手を付けていない行のうち…揃えるものはありますか」への答えは「何も選ばなかった（今の文のまま）」 | 一部の行だけ短く、ほかは長いままになる —— 揃えるなら新しい裁定が要る |
| 決定 3 | コードの波は立てない。`src/adapter/screen-renderer/display-words.json` は `npm run gen` が刷り、`tooltips.ts` は辞書の `hint` をそのまま読むので、手書きのコードは 1 行も変わらない | `tooltips.ts:63-78`（`DFC-1724` の記述）を読み、`hint` を直接出す。辞書を直せば画面もヘルプの一覧も揃って動く | コードの波専用の台帳行（`DFC-1715`〜）は要らない |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 15 個のアイコンのツールチップの説明（ja・en） | `docs/spec/_source/display-words.json` の `icons` の `hint`（`IC-7`・`IC-98`・`IC-4`・`IC-8`・`IC-9`・`IC-10`・`IC-104`・`IC-105`・`IC-11`・`IC-12`・`IC-13`・`IC-14`・`IC-15`・`IC-18`・`IC-21`） | E-01 |

**数**: 表の行の増減 0。要求の文 0。図 0。辞書の升 30（15 行 × ja/en）。

---

## 2. 新しい識別子

本書は新しい識別子を 1 つも取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。台帳の新しい行も取らない（0 節の決定 3）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 行 | 旧 ja | 新 ja | 旧 en | 新 en |
|---|---|---|---|---|
| `IC-7` | コマンドパレットを表示する。もう一度押すと非表示にする | コマンドパレットの表示切替 | Show the Command Palette; press again to hide it | Show or hide the Command Palette |
| `IC-98` | 開いている文書を捨てて、新しく始める | 現在の文書を破棄して、新規に文書を作成する | Discard the open document and start a new one | Discard the current document and create a new one |
| `IC-4` | 変更前の予定を重ねて表示する。もう一度押すと非表示にする。重ねる予定が無いときは、そのファイルを選ぶ | 変更前の予定の表示切替。変更前の予定が無いときは、そのファイルを選ぶ | Overlay the baseline; press again to hide it. With no baseline yet, choose its file | Show or hide the baseline. With no baseline yet, choose its file |
| `IC-8` | 予定バーを表示する。もう一度押すと非表示にする。実績の表示には影響しない | 予定の表示切替 | Show the Plan Bar; press again to hide it — the actual is left as it stands | Show or hide the plan |
| `IC-9` | 実績バーを表示する。もう一度押すと非表示にする。予定の表示には影響しない | 実績の表示切替 | Show the Actual Bar; press again to hide it — the plan is left as it stands | Show or hide the actual |
| `IC-10` | 日程の全体が 1 画面に収まる倍率と位置にする | 日程の全体を表示 | Set the zoom and position that fit the whole schedule on one screen | Show the whole schedule |
| `IC-104` | 日程表の図形と字を 1 段小さくする | 日程表の図形と文字を縮小 | Make the chart's shapes and text one step smaller | Make the chart's shapes and text smaller |
| `IC-105` | 日程表の図形と字を 1 段大きくする | 日程表の図形と文字を拡大 | Make the chart's shapes and text one step larger | Make the chart's shapes and text larger |
| `IC-11` | 全画面表示にする。もう一度押すと戻る | 全画面表示の切替 | Enter full screen; press again to leave | Enter or leave full screen |
| `IC-12` | 時間軸（横）を縮小する | 時間軸（横）を縮小 | Zoom the time axis out | Zoom the time axis (horizontal) out |
| `IC-13` | 時間軸（横）を拡大する | 時間軸（横）を拡大 | Zoom the time axis in | Zoom the time axis (horizontal) in |
| `IC-14` | 行軸（縦）を縮小する | 行軸（縦）を縮小 | Zoom the row axis out | Zoom the row axis (vertical) out |
| `IC-15` | 行軸（縦）を拡大する | 行軸（縦）を拡大 | Zoom the row axis in | Zoom the row axis (vertical) in |
| `IC-18` | AI との対話欄を表示する（Agent API が無効なら有効にする）。もう一度押すと非表示にする | AI との対話欄の表示切替（Agent API も有効にする） | Show the Dialogue Field for talking with the AI (turns the Agent API on if it is off); press again to hide it | Show or hide the Dialogue Field for the AI (also turns the Agent API on) |
| `IC-21` | 画面の言語を選ぶ。ヘルプの中は変えない。いまの言語は入口に出る | 画面の言語選択 | Choose the screen language; the help keeps its own. The current one shows on the entry | Choose the screen language |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧が `docs/spec/_source/display-words.json` に 1 回だけ現れることを数えること（13 節。どれも 1 回）。

<!-- EDIT id=E-01 file=docs/spec/_source/display-words.json -->
3 節の表のとおり、`icons` の 15 行の `hint.ja`・`hint.en` を旧から新へ置き換える。`label`・`面` ほかの升は触らない。

当てた後に打つもの: `npm run gen`（`tools/generate_display_words.py` が `src/adapter/screen-renderer/display-words.json` を刷る）→ `npm run gen:check` → `PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-dictionary-table-covariance.py --write-baseline`（この 15 行の対（`T-109 IC-x`）だけ指紋が動く —— 13 節）→ `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-6[0-3]*.md` のうち `icons` の `hint` を書くものは無い（`CR-635` は `label` と一部の `hint` を直したが、触る行は本書と重ならない —— `IC-98`・`IC-8`・`IC-9` は `CR-635` が既に当てた別の語から、本書がさらに短くする。13 節で `CR-635` 後の木の値を旧として数えた）。

---

## 5. 継ぎ目

```
SEAM (CR-640)
- display-words.json: icons[].hint for IC-7, IC-98, IC-4, IC-8, IC-9, IC-10,
  IC-104, IC-105, IC-11, IC-12, IC-13, IC-14, IC-15, IC-18, IC-21 (ja and en)
  are shortened per JDG-1166/1167/1168. Labels, 面, and 何の入口か are
  unchanged. The other 13 App Header icons are unchanged.
- No src/ file is hand-edited. tooltips.ts reads icons[].hint from the
  generated src/adapter/screen-renderer/display-words.json, which npm run
  gen rewrites from the manuscript -- the new words reach the screen with
  no separate code wave.
- dictionary-table-pairing.txt: the 15 "T-109 IC-x" pairing fingerprints
  move (the dictionary half of the pair changed); re-recorded in the same
  commit, read together with their table rows, which did not change.
```

---

## 6. グラフ（`f5d5ff05`）

- `impact.py IC-7` / `IC-98` / `IC-4` / `IC-8` / `IC-9` / `IC-10` / `IC-104` / `IC-105` / `IC-11` / `IC-12` / `IC-13` / `IC-14` / `IC-15` / `IC-18` / `IC-21`: どれも、指す側は `01-04-requirements.md` の要求（行 ID で名指すのみ）と `tbl-state-machines.md` の状態機械の節名であり、`hint` の文言を写したものは 1 件も無い（確認した全行、13 節）。
- `induced.py IC-7 IC-98 IC-4 IC-8 IC-9 IC-10 IC-104 IC-105 IC-11 IC-12 IC-13 IC-14 IC-15 IC-18 IC-21 FR-092 T-040 EZ-2`: 種 18/18、閉路は `EZ-2` とその値の行（T-109 の各 `IC-x`）の間の作法の閉路のみ（02 の 3 節「値の行と、その規則を持つ要求との間の小さな閉路は作法」）—— 本書はどの `IC-x` も値（`hint`）だけを書き、`EZ-2`（規則）は書かない。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 辞書の升の中身だけを変える |
| `icons` の `hint`（ja・en 合わせて） | 30 升変更 | 15 行 × 2 言語 |
| `label`・`面`・`何の入口か` | 差 0 | 決定 1 |
| `dictionary-table-pairing.txt` の `T-109 IC-x` 指紋 | 15 行書き換え | 6 節。表の行（`T-109` 側）は動かない |
| 自動試験の失敗数（`tests/` フル） | 差 0（365 失敗のまま、CR-640 の前後で同数） | 13 節で base と当てた木を双方測った |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回） | 当てる体 |
| 1 | `docs/spec/_source/display-words.json` ＋ 生成物（`src/adapter/screen-renderer/display-words.json`）＋ `dictionary-table-pairing.txt` の該当 15 行 ＋ `changelog.md` の 1 行 | E-01、`npm run gen`、`gen:check`、check 37 の再記録、check.sh | 仕様の波（本書、唯一の波） |

⛔ **コードの波は無い（0 節の決定 3）** —— 生成だけで `src/adapter/screen-renderer/display-words.json` が動き、`tooltips.ts` はそれを読むだけなので、手書きの `src/` は 1 行も変わらない。

- ⭐ **毎フレームの経路: いいえ。** ツールチップの文字列は辞書から読むだけで、毎フレーム計算する値ではない。

---

## 9. 仕様の外で直すもの

無い（0 節の決定 3）。`DFC-1724` は本書の着地で閉じる（12 節）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 触れていない 13 個のアイコンの `hint` は変えない（決定 2）。
- `label`（アイコンの名前）はどの行も変えない（決定 1）。
- `CR-635` が直した語（`IC-98`・`IC-8`・`IC-9` ほか）に追補しない —— 本書は別の変更要求として新しい値を当てる（02 の 2.5 節）。

---

## 11. 利用者に問うこと

無い。⚠️ `JDG-1166` の「手を付けていない行のうち…揃えるものはありますか」は利用者がすでに「今の文のまま」と答えている（決定 2）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1166`・`JDG-1167`・`JDG-1168` | 本書の裁定 | 状態を「適用済」にした |
| `DFC-1724` | ヘッダーのコマンドのツールチップの説明が冗長 | 状態を `仕様待ち` → `実測待ち` にした（生成だけで `src` に届き、自動試験は緑。出荷ビルドの実測はまだ） |

---

## 13. 測り方の再現

```
# the tree: worktree fast-forwarded to f5d5ff05; the manuscript is LF-only

# the old texts (section 3) appear exactly once each in
# docs/spec/_source/display-words.json before editing -- read with the Read
# tool at the rowId offsets found by:
grep -n '"rowId": "IC-7"\|"rowId": "IC-98"\|"rowId": "IC-4"\|"rowId": "IC-8"\|"rowId": "IC-9"\|"rowId": "IC-10"\|"rowId": "IC-104"\|"rowId": "IC-105"\|"rowId": "IC-11"\|"rowId": "IC-12"\|"rowId": "IC-13"\|"rowId": "IC-14"\|"rowId": "IC-15"\|"rowId": "IC-18"\|"rowId": "IC-21"' docs/spec/_source/display-words.json

# no test or spec table quotes the 15 old hints verbatim:
#   grepped each of the 15 old ja/en strings against docs/ and tests/ --
#   only dist/index.html (build output), src/adapter/screen-renderer/
#   display-words.json (regenerated by this CR), previous-project-result/
#   sample .html files (historical, not spec), and change-request/CR-*.md
#   files already landed (not edited, rule 02 section 2.5) matched.

# check 37 (dictionary-table-pairing): only the 15 "T-109 IC-x" keys move
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-dictionary-table-covariance.py

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py IC-7
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py IC-7 IC-98 IC-4 IC-8 IC-9 IC-10 IC-104 IC-105 IC-11 IC-12 IC-13 IC-14 IC-15 IC-18 IC-21 FR-092 T-040 EZ-2

# full vitest suite, run once on f5d5ff05 (base) and once on this CR's tree:
# both give 36 failed test files / 365 failed tests -- identical, so CR-640
# introduces 0 new failures (the 3 pre-existing failures in
# tests/contract/display-words.contract.test.ts are unrelated: a missing
# openChooser/hintLines entry in that file's own KEY_FIELD map, not the
# word content this CR changes -- reproduced by reverting just this CR's
# files and re-running the same test file, same numbers either way).
node ../../../node_modules/vitest/vitest.mjs run
```
