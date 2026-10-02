# CR-636 — 遅延診断レポートの窓を、画面の重ね順の検索パネルと同じ段に置く

> 起草の状態: 当てた（2026-10-03、枝 `coord` から切った作業木。`CR-635` を当てたコミットの上）。起草と当てを同じコミットで行った。4 節の旧は当てる木で 1 回だった（10 節）。
> ID の帯: 番号 `CR-636` は調整役から受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）。台帳の行は調整役の帯 `DFC-1710`〜`DFC-1719` から `DFC-1711` を 1 つ使う（9 節）。
> 当てる順: `CR-635` と独立である（`CR-635` は 表 T-337 を書かない）。
> 閉じるもの: `JDG-1158` の仕様の側 —— 表 T-337 の「行の無い UI パーツを重ねてはならない（MUST NOT）」と、遅延診断レポートの窓（表 T-335 のウインドウ）が同表に行を持たないこととの食い違い。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-1158` | 「検索パネルと同じ段 (Recommended)」（問い「T-337 の穴：遅延診断レポートの窓を重ね順のどこに置きますか？」への答え。もう一方の択は「検索パネルの奥に別の段」） | 表 T-337 の `UZ-6` に遅延診断レポートの窓を入れる。同時に出ていれば後に開いたほうを前に置く（表 T-346 の `RW-5` と同じ）。見出しの帯 `GR-24` と縁 `GR-25` を含む（E-01） |
| `JDG-1152` | 「このまま (Recommended)」（遅延診断レポートの窓を 表 T-335 の 4 つ目のウインドウにした提案） | 前提 —— 窓はウインドウであり、帯と縁を持つ。変えない |
| `JDG-1153` | 「このまま (Recommended)」（`Esc` の段の語と `RW-5` の「後に開いたほうを前に置く」） | 前提 —— `RW-5` と 表 T-028 の `IN-4` の文は変えない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-7` ／ `GL-009`**（遅延診断） —— 遅延診断レポートの窓は、診断を人が読む面である。重ね順に行が無いと、窓がパレット・面・ヘルプ・ヘッダーのどれの前に出るかを誰も決めておらず（`FR-152` の RATIONALE「先に描いた方が奥になる」）、窓がヘッダーの奥へ潜れば掴む所を失って戻せない。⭐ **`GL-006`** —— 表 T-337 は「押下は最も手前の UI パーツが受ける」ので、行が無ければどこを押せば何が受けるかが決まらない。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— 表 T-337 の結び「⛔ 本表に行の無い UI パーツを画面に重ねてはならない（MUST NOT）」と、ウインドウとして浮く遅延診断レポートの窓（`FR-036` の 表 T-335 の前文、表 T-346）とが食い違っていた。`JDG-1158` で閉じる（E-01）。⭐ 段の中の 2 つの前後は 表 T-346 の `RW-5` が既に持ち、表 T-028 の `IN-4` も「遅延診断レポートの窓と検索パネルの前後は 表 T-346 の `RW-5` が持つ」と言う —— 本書は `RW-5` を写さず、名指す。
- **`R1.4`（境界・空の場合）** —— 検索パネルの列の幅（表 T-330 の `SV-18`）が遅延診断レポートの窓に当たるかを調べた。表 T-346 は「表 T-330 の行のうち、本表に無いものはそのまま当てる」ので `SV-18` も当たるが、`SV-18` の既定の幅は 表 T-331 の列（`SQ-1`〜`SQ-9`、`S-466`〜`S-474`）だけに在り、レポートの表の列（表 T-347 の `DT-1`〜`DT-7`）の既定の幅はどこにも無い。⇒ 仕様は決めていない。本書は決めず、11 節の問い 1 に置く（依頼文のとおり）。
- **`R2.9`（YAGNI）** —— 新しい段（`UZ-<新>`）を立てない。利用者は「検索パネルの奥に別の段」を退けた。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **`UZ-6` の UI パーツの欄に `Delay Diagnostics Report`（`U-66`）を並べ、同じ段の中の前後は `RW-5` を名指す** | `JDG-1158` の読みの欄。前後の規則を 2 か所に書かない（`R1.3`） | 無い |
| 決定 2 | **理由の欄の「パネル」を「パネルや窓」に広げ、同じ段に置く理由を 1 文足す** | 理由の欄は行の中身を言う。窓を足して理由がパネルだけを言うと、窓の帯を覆ってよいと読める | 無い |
| 決定 3 | **`SV-18` の当たり方は決めない**（11 節の問い 1） | 依頼文: 仕様が決めていなければ問いに置く | 遅延診断レポートの窓のコード（`CR-617` の後追い）は、列の幅を変える所で止まる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 遅延診断レポートの窓の重ね順 | `FR-152` の 表 T-337 の `UZ-6`（UI パーツの欄と、この順の理由の欄） | E-01 |

**数**: 表の升 2。行の増減 0。要求の文 0。図 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・要求のどれも足さない。⚠️ 問い 1 の答えによっては、後の変更要求が設定値の行（レポートの列の既定の幅）を足す —— そのときの番号は、その変更要求が当てる日に木を測って取る（規則 02 の 2.5 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所 | 置き換わる先 | 編集 |
|---|---|---|---|
| 「パネルを動かせば見える」「掴む所を失ったパネルは動かせない」 | 表 T-337 の `UZ-6` の理由の欄 | 「パネルや窓を…」 | E-01 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること（当てる木で 1 回）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
| UZ-6 | 6 | `Search Panel`（`_assets/tbl-glossary.md` の `U-64`）。<br>見出しの帯（表 T-023d の `GR-24`）と縁（同表の `GR-25`）を含む | 浮いて動かせる UI パーツのうち、パレットの次に手前。<br>動かせるので、覆った面やヘルプは、パネルを動かせば見える。<br>⛔ 奥の UI パーツが見出しの帯を覆ってはならない（MUST NOT） —— 掴む所を失ったパネルは動かせない（`GR-19` と同じ理由） |
```
新
```text
| UZ-6 | 6 | `Search Panel`（`_assets/tbl-glossary.md` の `U-64`）・`Delay Diagnostics Report`（`U-66`）。<br>見出しの帯（表 T-023d の `GR-24`）と縁（同表の `GR-25`）を含む。<br>2 つが同時に出ているときは、後に開いたほうを前に置く（`FR-134` の 表 T-346 の `RW-5`） | 浮いて動かせる UI パーツのうち、パレットの次に手前。<br>動かせるので、覆った面やヘルプは、パネルや窓を動かせば見える。<br>⛔ 奥の UI パーツが見出しの帯を覆ってはならない（MUST NOT） —— 掴む所を失ったパネルや窓は動かせない（`GR-19` と同じ理由）。<br>⭐ 2 つを同じ段に置くのは、どちらも作業の横で開いたまま読む、動かせるウインドウ（`FR-036` の 表 T-335）だからである —— 利用者が、検索パネルと同じ段と定めた |
```

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-6[0-3]*.md` で `UZ-6` を書く草案はほかに無い。`CR-630`（着地）は `IN-4` に「遅延診断レポートの窓と検索パネルの前後は 表 T-346 の `RW-5` が持つ」と書いた —— 本書はその文を変えない。`CR-617`・`CR-621`（着地）には追記しない。

---

## 5. 継ぎ目

```
SEAM (CR-636)
- T-337 UZ-6 now holds the Search Panel AND the Delay Diagnostics Report
  window (data-role "Delay Diagnostics Report", U-66), header band GR-24 and
  edge GR-25 included. Same layer: when both are shown, the one opened later
  is in front (T-346 RW-5) -- the order inside UZ-6 is by opening time, not a
  fixed pair.
- Nothing else in T-337 moves: UZ-5 (palette) stays in front of both, UZ-13
  (open surfaces) and UZ-7 (help) stay behind both.
- Esc (IN-4, RG-16) already closes the window in front by T-337 and defers to
  RW-5 between these two -- no change there.
- Column widths of the report table: NOT settled (section 11, question 1).
```

---

## 6. グラフ（当てる木）

- `impact.py UZ-6`: 指す箇所 0（行が浮いている —— 表 T-337 は行 ID ではなく表で引かれる）。
- `impact.py T-337`: 指す要求 7 件（`FR-016`・`FR-110`・`FR-152`・`FR-053`・`FR-066`・`FR-036`・`FR-040`）、2 次 21 件。どれも表を名指すだけで、`UZ-6` の中身（検索パネルだけ）を写したものは無い。⭐ `FR-040` の `IN-4` は「表 T-337 の手前のものから閉じる」と「前後は `RW-5` が持つ」を既に持つ。
- `impact.py RW-5`: `FR-036`（表 T-335 の `WB-1`）・`FR-040`（`IN-4`）—— 変えない。
- `impact.py SV-18`: `FR-016`（`GR-28`）・`FR-151`（`SV-17`）・5.3 節（`IF-9`）・`tbl-settings.md` の 8 節。⇒ レポートの窓の列を名指すものは無い（11 節の問い 1 の根拠）。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables / figures / rows / uids | 差 0 | 升 2 つだけ |
| `（MUST NOT）` の印（`01-04-requirements.md`） | 差 0 | 旧 1 → 新 1 |
| `（MUST）` の印（同） | 差 0 | 旧 0 → 新 0 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（1 回） | 当てる体 |
| 1 | `docs/spec/01-04-requirements.md`（`UZ-6` の 1 行）＋ 生成物 ＋ `changelog.md` の 1 行 | E-01 | 仕様の波（本書） |
| 2 | `src/framework/dom-screen-surface/`・`tests/contract/t-337-screen-z-order.contract.test.ts` | 9 節 | コードの波（調整役が配る、`DFC-1711`） |

- ⭐ **毎フレームの経路: いいえ。** 層の z の値は窓を描くときに 1 度決まる。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- 遅延診断レポートの窓は、まだ画面に描かれていない（`DFC-1481`、`CR-617` の後追い）。描くときに、窓の層を `UZ-6` の z で描き、検索パネルと同時に出ているときは後に開いたほうを前にする（`src/framework/dom-screen-surface/dom-screen-surface.ts` の `markZOrder` と、`searchPanelLayer` を `UZ-6` に置く所）。
- `tests/contract/t-337-screen-z-order.contract.test.ts` の `PARTS` に `U-66` の組を足す（窓が描かれた後）。⚠️ 同じ試験の `RESERVED_NOT_YET_ON_SCREEN` は `UZ-6` を「まだ画面に無い」として免じている —— 検索パネルは既に描かれているので、免除がまだ要るかを確かめる。
- 台帳: `DFC-1711` を足した（`実装待ち`）。

---

## 10. 測り方の再現

```
# the tree: this worktree after the CR-635 commit (base 0c215684); 01-04-requirements.md is LF-only

# the old block appears once (section 4) -- a script in the session scratchpad
#   (cr636_edits.py: E-01 old=1 new=0 before applying)

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py UZ-6
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-337
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py RW-5
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SV-18

# no setting holds a default width for a column of table T-347
grep -n "DT-[0-9]" docs/spec/_source/settings.json        # -> nothing
grep -n "S-46[6-9]\|S-47[0-4]" docs/spec/01-04-requirements.md   # -> SV-18 only (SQ-1..SQ-9)

# who else draws UZ-6
grep -rn "UZ-6" src tests   # dom-screen-surface.ts (search panel layer), t-337 contract, uf-71
```

---

## 11. 利用者に問うこと

### 問い 1: 遅延診断レポートの窓の表の列の幅（表 T-330 の `SV-18` の当たり方）

表 T-346 は「表 T-330 の行のうち、本表に無いものはそのまま当てる」ので、検索パネルの列の幅の決まり（`SV-18`: 列ごとに既定の幅を持ち、見出しの境目を掴んで変え、下限は `S-425`）はレポートの窓にも当たる。ところが既定の幅（`S-466`〜`S-474`）は検索の表の列（`SQ-1`〜`SQ-9`）だけに在り、レポートの表の列（表 T-347 の `DT-1`〜`DT-7`）には無い。境目の掴み代 `GR-28` も「`Search Panel` の列の境目」と書かれている。

| 案 | 中身 | 良い所 | 悪い所 |
|---|---|---|---|
| **A（推奨）** | レポートの列も幅を変えられる。表 T-346 に 1 行（列の幅は `SV-18` に従い、既定は 表 T-347 の `DT-1`〜`DT-7` の列ごとの新しい設定値の行 7 つ）を足し、`GR-28` を「`Search Panel` と遅延診断レポートの窓の列の境目」に広げる | 2 つのウインドウの表が同じ手で扱える（`DT-2`・`DT-4` は既に「`SQ-2`・`SQ-1` と同じ」と言う） | 設定値の行が 7 つ増え、値は触れる見本で決める |
| B | レポートの列は幅を変えない。表 T-346 に「`SV-18` は当てない。列の幅は中身から決める」の 1 行 | 行が少ない | 長い理由（`DT-7`）が省略で切れて読めない |

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1158` | 本書の裁定 | 状態は書き換えていない（依頼文の範囲は `JDG-1086` だけ）—— 調整役が「適用済」にする |
| `DFC-1481` | 遅延診断レポートの窓が無い（コード） | 触れない —— 窓を描く行。`DFC-1711` が重ね順の分を持つ |
| `DFC-1711` | コードの波（9 節） | 足した（`実装待ち`） |
