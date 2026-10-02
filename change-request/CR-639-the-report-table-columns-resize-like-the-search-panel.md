# CR-639 — 遅延診断レポートの表の列も、検索パネルと同じく見出しの境目を掴んで幅を変える

> 起草の状態: 当てた（2026-10-03、`CR-638` を当てたコミット `bc3f36f9` の上）。起草と当てを同じコミットで行った。4 節の旧はどれも当てる木で 1 回だった（10 節）。
> ID の帯: 番号 `CR-639` は調整役から受けた。新しい識別子は 2 節（行 `RW-9`、設定値 `S-475` 〜 `S-481`）—— 当てる直前に測り直した。台帳の行は調整役の帯から `DFC-1714` と `PND-670` を使う（12 節）。
> 当てる順: `CR-637`・`CR-638` の後（触る行は重ならない）。
> 閉じるもの: `JDG-1183` の仕様の側（`CR-636` の 11 節の問い 1）。値は触れる見本で決める —— `PND-670`。コードの側は `DFC-1714`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-1183` | 「変えられるようにする (Recommended)」（問い「遅延診断レポートの表の列幅を、検索パネルと同じく変えられるようにしますか？」への答え。もう一方の択は「変えない」（中身から決める、長い理由は省略で切れる）） | 表 T-346 に `RW-9`（列の幅は `SV-18` に従い、既定は `DT-1` 〜 `DT-7` の列ごとの新しい設定値の行 7 つ）を足す（E-01）。`GR-28` を「`Search Panel` と遅延診断レポートの窓の列の境目」に広げる（E-02）。⭐ 7 つの既定の幅は触れる見本で決める（🔎）—— 仮の値に 🔎 を付け、`PND-670` を開いた（E-04） |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-7` ／ `GL-009`**（遅延診断） —— 遅延診断レポートの表の理由（`DT-7`）は長い文であり、列の幅を変えられなければ省略で切れたまま読めない。⭐ **`GL-006`** —— 2 つのウインドウの表を同じ手で扱える（`FR-134` の RATIONALE「同じ仕事に、2 つの作法を覚えさせない」）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.4`（境界・空の場合）** —— `CR-636` の 11 節の問い 1 のとおり、表 T-346 は「表 T-330 の行のうち、本表に無いものはそのまま当てる」ので `SV-18` も窓に当たるが、既定の幅（`S-466` 〜 `S-474`）は検索の列にしか無かった。⇒ `RW-9` が窓の列と既定の行を名指す（E-01）。下限 `S-425` と掴み代の幅 `S-465` は `SV-18`・`GR-28` を通して窓にも当たる —— 2 つの行の名を広げた（E-04）。
- **`R1.3`（矛盾がない・唯一の正）** —— `GR-28` の名「`Search Panel` の列の境目」と、`FR-106` の「検索パネルの列の境目（`GR-28`）でも `PK-10`」は、窓の境目にも同じ掴み代が敷かれると食い違う。⇒ 両方を広げた（E-02・E-03）。`RW-9` は `SV-18` を写さず、名指す（違いは列と既定の行だけ）。
- **`R2.9`（YAGNI）** —— 新しい掴み代の行（`GR-<新>`）を立てない。利用者は `GR-28` を広げると定めた。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **仮の値は検索の表の似た列の既定から採る**: `DT-1` 150（`S-470` 状態）・`DT-2` 190（`S-467`、`DT-2` は `SQ-2` と同じ値）・`DT-3` 110（最も狭い `S-468`）・`DT-4` 250（`S-466`、`SQ-1` と同じ値）・`DT-5` 220（日付の列 2 つ `S-468` ＋ `S-469`）・`DT-6` 220（`DT-5` と同じ書き方）・`DT-7` 380（最も広い `S-471`） | 規則 02 の 4 節「設計の数を丸めて書くな。導き方を書け」—— 導きを各行の注に書いた。どれも `S-425` を割らない | 測って決めた値ではない（🔎）。見本で選び直す（`PND-670`） |
| 決定 2 | **`PND-670` を分類 `A` にする** | 原稿に在り生成で届く寸法であり、保存しない（`S-451`）—— 覆しても文書に痕跡が残らない | 印 `@provisional PND-670` を生成器の群の注に置いた（検査 25） |
| 決定 3 | **7 つの行を新しい定数でなく `NOT_STORED_SEARCH_PANEL_SIZES` に載せる** | 窓は検索パネルと同じ見せ方で描く（`FR-134`）。新しい定数は窓が描かれるまで読まれず、`noUnusedLocals` が拒む（`CR-558` の `S-372` と同じ手） | 定数の名が検索パネルだけを言う —— 群の注に窓の列であることを書いた |
| 決定 4 | **`S-425` と `S-465` の名（`value`）を「検索の表と遅延診断レポートの表の」に広げ、注は変えない** | 2 つは `SV-18`・`GR-28` を通して窓に当たる。名が検索だけを言うと、窓の列の下限と掴み代がどこにも無いと読める | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 窓の列の幅 | `FR-134` の 表 T-346 に `RW-9` | E-01 |
| 境目の掴み代 | `FR-016` の 表 T-023d の `GR-28`（名の欄と、掴んだときの欄） | E-02 |
| ポインタの形 | `FR-106` の `PK-10` の文（検索パネルの列の境目 → 検索パネルと遅延診断レポートの窓の列の境目） | E-03 |
| 設定値 | `_source/settings.json` の 表 T-206 に `S-475` 〜 `S-481`、`S-425`・`S-465` の名 | E-04 |

**数**: 表の行 ＋8（`RW-9` 1、`S-475` 〜 `S-481` 7）。要求の文の升 2・文 1。図 0。

---

## 2. 新しい識別子

⛔ 規則 02 の 2.5 節: 当てる直前（2026-10-03、`bc3f36f9`）に、この木の `git grep` で測り直した。

| 識別子 | 測ったこと | 結果 |
|---|---|---|
| 行 `RW-9`（表 T-346） | `git grep -o -E "\bRW-[0-9]+\b"` の最大 | `RW-8`。`RW-9` 〜 `RW-19` はどのファイルにも無い |
| 設定値 `S-475` 〜 `S-481`（表 T-206） | `git grep -o -E "\bS-[0-9]+[a-z]?\b" -- docs/spec` の最大 | `S-474`。木の全体では `S-999` が在るが、検査の注の例の綴り（`.claude/skills/spec-graph-check/list-asserted-claims.py`）と変更要求の注だけである。`S-475` 〜 `S-489` はどのファイルにも無い |
| 台帳の `PND-670` | `git grep -o -E "\bPND-6(4[3-9]\|[5-7][0-9])\b"` | どのファイルにも無い（依頼文が確かめた結果と同じ） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bc3f36f9`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「`Search Panel` の列の境目」 | 表 T-023d の `GR-28` の名 | 「`Search Panel` と遅延診断レポートの窓（`Delay Diagnostics Report`）の列の境目」 | E-02 |
| 「検索パネルの列の境目（表 T-023d の `GR-28`）でも」 | `FR-106` | 「検索パネルと遅延診断レポートの窓の列の境目（…）でも」 | E-03 |
| 「検索の表の列の幅の下限」「検索の表の列の境目を掴める幅」 | `S-425`・`S-465` の名 | 「検索の表と遅延診断レポートの表の…」 | E-04 |

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること（当てる木で 1 回）。⚠️ 行は表の終わりに足す（規則 02 の 4 節）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-346 の `RW-8` の行の後に足す
```text
| RW-9 | 列の幅 | `SV-18` と同じとし、列は 表 T-347 の列とする。<br>既定は `_assets/tbl-settings.md` の 表 T-206 の `S-475` 〜 `S-481`（`DT-1` 〜 `DT-7` の順）とする。<br>列の境目の掴み代は 表 T-023d の `GR-28` である |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧（`GR-28` の行の頭から 4 つ目の欄の 1 文目まで）
```text
| GR-28 | `Search Panel` の列の境目 | …（敷き方は変えない）… | 掴めば境目の左の列の幅を変える（`FR-151` の 表 T-330 の `SV-18`）。<br>
```
新
```text
| GR-28 | `Search Panel` と遅延診断レポートの窓（`Delay Diagnostics Report`）の列の境目 | …（敷き方は変えない）… | 掴めば境目の左の列の幅を変える（`FR-151` の 表 T-330 の `SV-18`、`FR-134` の 表 T-346 の `RW-9`）。<br>
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
⭐ 検索パネルの列の境目（表 T-023d の `GR-28`）でも、
```
新
```text
⭐ 検索パネルと遅延診断レポートの窓の列の境目（表 T-023d の `GR-28`）でも、
```

<!-- EDIT id=E-04 file=docs/spec/_source/settings.json -->
`S-425` の名「検索の表の列の幅の下限（`FR-151` の 表 T-330 の `SV-18`）」→「検索の表と遅延診断レポートの表の列の幅の下限（`FR-151` の 表 T-330 の `SV-18`、`FR-134` の 表 T-346 の `RW-9`）」。`S-465` の名「検索の表の列の境目を掴める幅（…）」→「検索の表と遅延診断レポートの表の列の境目を掴める幅（…）」。

表 T-206 の `S-474` の後に 7 行を足す（どれも `default` は `num` ＋ `px` ＋ 印 🔎）:

| 行 | 名（`value`） | 既定（仮） | 注の導き |
|---|---|---|---|
| `S-475` | 遅延診断レポートの表の列の既定の幅 —— `FR-134` の 表 T-347 の `DT-1`（ステータス） | 150 | 保存しない（`S-451`）。同じ種類の列（状態）の `S-470` と同じ。`S-425` を割らない |
| `S-476` | 同 —— `DT-2`（担当） | 190 | `S-467`（`SQ-2`）と同じ |
| `S-477` | 同 —— `DT-3`（進捗） | 110 | 検索の既定のうち最も狭い `S-468` と同じ |
| `S-478` | 同 —— `DT-4`（タスク（マイルストーン）） | 250 | `S-466`（`SQ-1`）と同じ |
| `S-479` | 同 —— `DT-5`（予定日） | 220 | 日付 2 つ —— `S-468` と `S-469` の和 |
| `S-480` | 同 —— `DT-6`（実績日） | 220 | `S-479` と同じ |
| `S-481` | 同 —— `DT-7`（理由） | 380 | 検索の既定のうち最も広い `S-471` と同じ |

注の導きは `S-475` の注に 7 つまとめて書き、`S-476` 〜 `S-481` の注は「同上」とする（検索の列の `S-467` 〜 `S-474` と同じ形。同じ文を 7 回書くと検査 11 が重なりとして数える）。`S-475` の注は「⛔ **測って決めた値ではない** —— 触れる見本で決める （🔎、PND-670）」で終わる —— 台帳の番号は仕様の行 ID ではないので、刻みの印（バッククォート）を付けない（検査 7）。

当てた後に打つもの: `npm run gen`（`tbl-settings.md` と、`src/framework/dom-screen-surface/dom-screen-surface.ts` の `NOT_STORED_SEARCH_PANEL_SIZES` を刷る）→ `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

### 4.1 重なり

`change-request/CR-6[0-3]*.md` で 表 T-346・`GR-28`・`S-425`・`S-465` を書くのは、`CR-617`（表 T-346 を立てた）・`CR-629`（`GR-28`・`S-425`・`S-465`・`S-466` 〜 `S-474`）・`CR-636`（問いを置いた）—— どれも着地済み、⛔ 追記しない。`CR-637`・`CR-638` は本書の行に触れない。

---

## 5. 継ぎ目

```
SEAM (CR-639)
- T-346 RW-9: the report table's columns are T-347's DT-1 .. DT-7, resized as
  SV-18 says (grab GR-28 on the header's right border, drag, min S-425,
  settled on release, Esc / cancel restores). Defaults S-475 .. S-481 in
  DT order, not stored (S-451).
- Generated: NOT_STORED_SEARCH_PANEL_SIZES in
  src/framework/dom-screen-surface/dom-screen-surface.ts now carries
  'S-475' .. 'S-481' (150, 190, 110, 250, 220, 220, 380 -- provisional,
  PND-670). Read them as NOT_STORED_SEARCH_PANEL_SIZES['S-475'] and so on.
- GR-28 now names both windows' column borders; the grab width is S-465 for
  both. PK-10 (FR-106) is the pointer on both.
```

---

## 6. グラフ（`bc3f36f9`）

- `impact.py T-346`: 指す要求 5 件（`FR-134`・`FR-152`・`FR-060`・`FR-036`・`FR-040`）、2 次 19 件 —— 列の幅を写したものは無い。
- `impact.py T-347`: `FR-134` の 4 箇所、2 次 6 件。
- `impact.py GR-28`: `FR-016`・`FR-106`・`FR-151`（2）・5.3 節（`IF-9`）・`tbl-settings.md` の 8 節。`FR-106` の 1 文だけが「検索パネルの列の境目」と名を写していた（E-03）。`FR-151` の `SV-7` は「列の境目の掴み代」と書くだけ —— 変えない。
- `impact.py SV-18`: `FR-016`（2）・`FR-151`・5.3 節・`tbl-settings.md` の 8 節。
- `impact.py S-425`: `FR-151` と `tbl-settings.md` の 8 節（3）。`impact.py S-465`: `FR-016` の 1 箇所。
- `induced.py T-346 RW-9 T-347 GR-28 SV-18 S-425 S-465 FR-134 FR-106 FR-151`: 種 10/10（`RW-9` は当てた木で）、辺 22、閉路 1（`FR-106` `GR-28` `RW-9` `S-425` `S-465` `SV-18`）—— 本書が書く 5 つ（`SV-18` を除く）は 1 回の計画（1 つのスクリプト）で書いた。

---

## 7. 数の予測（当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| rows | ＋8 | `RW-9`、`S-475` 〜 `S-481` |
| tables / figures / uids | 差 0 | |
| `（MUST）` ／ `（MUST NOT）` の印（`01-04-requirements.md`） | 差 0 | E-03 の文の MUST は 1 のまま |
| `NOT_STORED_SEARCH_PANEL_SIZES` の鍵 | 2 → 9 | 決定 3 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（どれも 1 回）。2 節の識別子を測り直す | 当てる体 |
| 1 | `docs/spec/01-04-requirements.md`・`_source/settings.json`・`tools/generate_entity_types.py` ＋ 生成物 ＋ `changelog.md` の 1 行 | E-01〜E-04、`npm run gen`、`gen:check`、check.sh | 仕様の波（本書） |
| 2 | `src/framework/dom-screen-surface/`・`src/adapter/screen-renderer/` | 9 節 | コードの波（調整役が配る、`DFC-1714`） |

- ⭐ **毎フレームの経路: はい（コードの波で）。** 境目を握っているあいだ、ポインタが動くたびに表を組み直す（`SV-18` と同じ）。本書の生成の差分は定数に 7 つの数を足しただけ —— `docs/development-records/perf-pending.md` に行 57 を足した。

---

## 9. 仕様の外で直すもの

⭐ 本書（仕様の波）が直したもの:

- `tools/generate_entity_types.py` —— `NOT_STORED_SEARCH_PANEL_SIZES` に `S-475` 〜 `S-481` を足し、注に `@provisional PND-670` を置いた（決定 2・決定 3）。生成物で `S-475` 〜 `S-481` が `src` に出ることを `git grep` で確かめた（10 節）。

⛔ 本書が直さないもの（コードの波、`DFC-1714`）:

- 遅延診断レポートの窓は、まだ画面に描かれていない（`DFC-1481`）。描くとき、表の列を `S-475` 〜 `S-481` の幅で組み、`GR-28` で幅を変える（検索パネルの `search-panel-drawing.ts` と同じ手）。
- ⚠️ 本書の外で見つけたこと: 検索の表の列の既定 `S-466` 〜 `S-474`・掴み代 `S-465`・下限 `S-425`（`CR-629`）は、どの生成の群にも載っておらず `src` に届いていない（`git grep "S-466" -- src` が 0 件）。本書は群に足していない —— `CR-629` のコードの巡（`DFC-1714` の直し方の欄に書いた）。

---

## 10. 測り方の再現

```
# the tree: this worktree after the CR-638 commit (bc3f36f9); every file this CR
# edits is LF-only

# the old texts appear once (section 4) -- a script in the session scratchpad
#   (cr639_edits.py --count: E-01 .. E-04 and the generator line, old=1)

# the identifiers (section 2), measured right before applying
git grep -h -o -E "\bS-[0-9]+[a-z]?\b" -- docs/spec    # max S-474
git grep -n -o -E "\bS-(47[5-9]|48[0-9])\b"            # nothing
git grep -n -o -E "\bRW-(9|1[0-9])\b"                   # nothing
git grep -n -o -E "\bPND-6(4[3-9]|[5-7][0-9])\b"         # nothing

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-346
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-347
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py GR-28
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SV-18
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-425
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-465
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-346 RW-9 T-347 GR-28 SV-18 S-425 S-465 FR-134 FR-106 FR-151

# the new rows reach src (the generator group, section 9)
git grep -n "S-475\|S-481" -- src    # dom-screen-surface.ts, NOT_STORED_SEARCH_PANEL_SIZES
git grep -n "S-466" -- src           # nothing (CR-629's rows, not this CR's)
```

---

## 11. 利用者に問うこと

無い。7 つの既定の幅は、利用者が見本で決めると定めた（`PND-670`）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1183` | 本書の裁定 | 状態を「適用済」にした |
| `PND-670` | 7 つの既定の幅を見本で決める | 開いた（分類 `A`、`未裁定`） |
| `DFC-1714` | コードの波（9 節） | 足した（`実装待ち`） |
