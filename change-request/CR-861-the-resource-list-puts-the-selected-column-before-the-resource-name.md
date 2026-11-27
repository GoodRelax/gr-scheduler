# CR-861 —— 担当リストは、選択の列を担当名の左に置く

> 状態: ✅ **当てた** —— 2026-11-27、SUB「CR-861」（起草は develop `e053fb30a`、当ては B9 の分割の後の develop `20fe577af` の上）。仕様（`docs/spec/spec-ch4-04.md`）・辞書と用語の原稿・src・試験に当てた。GRS JSON のスキーマは変えていない。
> 当てる裁定: `JDG-3754`（持ち主 2026-11-23「a だな。 担当リストも先頭にチェックを入れる方が使いやすい。」）。
> ⭐ **本 CR は β の「仕様への当て」の段で当てる。** GRS JSON の列の値（`ColumnFilter.column`）の並びは `CR-851` が当てる（`JDG-3754` の着地先の分担）。本 CR は画面の列の順だけを持つ。
> ⭐ GRS JSON のスキーマは変えない（β の GRS JSON は持ち主が確定した、`JDG-3807`）。確定したスキーマの担当リストの列の値は、すでに `resourceSelectionStatus` → `resourceName` → `assignedTaskCount` → `assignedTaskNames` の順である（`studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 裁定の鎖（`rulings.md` を「担当リスト」「T-371」「RQ-」「列の並び」で引いた）

| 裁定 | 何を決めたか | 本 CR との関係 |
| --- | --- | --- |
| `JDG-3754` | 担当リストの列を 表示 → 選択 → 担当名 → 担当タスク数 → 担当タスク の順にする。3 つの表が「表示 → 状態 → 中身」の同じ形になる。理由: 先頭でチェック（選択）を入れる方が使いやすい | 本 CR が画面の列の順を当てる |
| `JDG-3807` | GRS JSON の β のスキーマを確定した | 生かす —— JSON は変えない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-4`（すぐわか —— 説明を読まずに操作できるようにする、`GL-006`）。3 つの表（検索の表・遅延診断レポートの表・担当リストの表）が「表示 → 状態 → 中身」の同じ形になり、1 つの表で覚えた形がほかの表でもそのまま効く。担当リストでも、先頭の 2 列でチェックと選択を続けて入れられる（`JDG-3754`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **R1**（要求品質 —— 一貫性）と **NDD の OKPN**（1 つの名に 1 つの意味）。
出たこと:

- R1（一貫性）: 列の順は 3 か所が言っている —— 表 T-371 の行の順、`IMPS-284` の「表示・担当名・選択・担当タスク数・担当タスク」、`RO-7` の「`RQ-1`・`RQ-2`（表示・担当名）の 2 列を固定」。1 か所でも残すと食い違う。3 か所を 1 回で直す（4 節）。
- R1（一貫性）: 固定の列は左から続く列である（`SV-6` の形、`RW-10` は「表 T-347 の並びで左の 5 列」）。選択の列が担当名の左に来るので、担当名を固定し続けるには選択の列も固定に入る（③ の決定 1）。
- OKPN: 行 ID は振り直さない。`RQ-2` は担当名、`RQ-3` は選択のままである。表 T-331・表 T-347 も、表の行は画面の左からの順で、行 ID の数の順ではない（`SQ-10`・`SQ-5`…、`DT-8`・`DT-1`…）。振り直すと、`RQ-2`・`RQ-3` を指す外の所（`RO-3`・`RO-5`・`RO-9`、表 T-206 の `S-549`・`S-550`、src の `// Spec:`、試験）がすべて別の列を指してしまう。

### ③ 持ち主に**問わずに決めた**こと（**覆してよい**）

1. 決定 1 —— ⭐ **固定の列は、表示・選択・担当名の 3 列にする。** 固定は左から続く列なので、選択の列だけを飛ばして担当名を固定することはできない。担当名を固定から外すと、担当タスクを読むあいだ誰の行かが見えなくなる（`RO-7` の RATIONALE）。選択の列は札 1 つの幅（測る、`S-550`）なので、固定が広がる分は小さい。
2. 決定 2 —— ⭐ **行 ID は振り直さない**（② の OKPN）。表の行を画面の順に並べ替えるだけにする。
3. 決定 3 —— ⭐ **列の幅の既定（`RO-9`、表 T-206 の `S-549` 〜 `S-552`）は変えない。** 幅は列ごとに持つので、列の順に依らない。⭐ ただし `RO-9` の「（`RQ-2` 〜 `RQ-5` の順）」は、行の順が変わると「画面の順か行 ID の順か」が読み分けられなくなる（仕様だけを読む試験役が当ての段で指摘した）。そこで設定と列の対を 1 つずつ書く形に直す（X-8）。対応そのものは変えない。
4. 決定 4 —— ⭐ **辞書（`display-words.json` の `resourceListColumns`）と用語の原稿（`glossary.json` の担当リストの列の 5 語）の並びも、表 T-371 の新しい行の順にそろえる。** 表 T-347 の語（`delayReportColumns`、`DT-8`・`DT-1`…）が表の行の順に並ぶのと同じ形にする。画面の列の順は辞書の並びから読まれる（`src/adapter/screen-renderer/resource-list.ts` の `RESOURCE_LIST_COLUMNS`）。

### ④ 持ち主に問うたこと

無し（`JDG-3754` が順を決めている）。

---

## 1. 対応

担当リストの表の列を、左から **表示（`RQ-1`）→ 選択（`RQ-3`）→ 担当名（`RQ-2`）→ 担当タスク数（`RQ-4`）→ 担当タスク（`RQ-5`）** にする。見出し行と、左の 3 列（表示・選択・担当名）を固定する。

| 置き場 | 前 | 後 |
| --- | --- | --- |
| 表 T-371 の行の順 | `RQ-1` → `RQ-2` → `RQ-3` → `RQ-4` → `RQ-5` | `RQ-1` → `RQ-3` → `RQ-2` → `RQ-4` → `RQ-5`（行の中身は変えない） |
| `IMPS-284` | `GRS` は、担当リストの表の列を、表 T-371 の行の順に左から並べること —— 表示・担当名・選択・担当タスク数・担当タスク。 | `GRS` は、担当リストの表の列を、表 T-371 の行の順に左から並べること —— 表示・選択・担当名・担当タスク数・担当タスク。 |
| `RO-7` | `GRS` は、見出し行と、`RQ-1`・`RQ-2`（表示・担当名）の 2 列を固定すること（`SV-6` の形）。 | `GRS` は、見出し行と、`RQ-1`・`RQ-3`・`RQ-2`（表示・選択・担当名 —— 表 T-371 の並びで左の 3 列）を固定すること（`SV-6` の形）。 |
| `RO-9` | …の `S-549` 〜 `S-552`（`RQ-2` 〜 `RQ-5` の順）にすること… | …の `S-549` 〜 `S-552`（`S-549` が `RQ-2`、`S-550` が `RQ-3`、`S-551` が `RQ-4`、`S-552` が `RQ-5`）にすること…（対応は変えない） |
| `FR-099` の RATIONALE の `IMPS-284` | `IMPS-284` —— 列の並びは利用者が定めた。 | `IMPS-284` —— 列の並びは利用者が定めた。<br>選択の列を担当名の左に置くのは、先頭の列でチェックと選択を続けて入れる方が使いやすく、3 つの表が「表示 → 状態 → 中身」の同じ形になるからである。 |
| `FR-099` の RATIONALE の `RO-7` | `RO-7` —— 担当タスクを読むあいだも、誰の行かが見える。 | `RO-7` —— 担当タスクを読むあいだも、誰の行かが見える。<br>固定は左から続く列なので、担当名の左の選択の列も固定する。 |

## 2. 影響（`impact.py` と `induced.py` で測った。10 節に再現の手順）

起草の時点（develop `e053fb30a`、`docs/spec/01-04-requirements.md` の行番号）の測り。⚠️ B9 の分割で置き場のファイルが変わるので、当ての段で測り直す。

```
表 T-371 を指す要求    2 件: FR-099（3295・3298・3333 行）・FR-151（7082・7105 行 —— 表示の列を言うだけ）
2 次（要求を指す要求）  26 件 —— 読むだけで足りる。列の順を言う所は無い
要求以外から指す所      4 件（5.3 File Structure・3. UI パーツ・5. 画面の状態・8. 保存しないもの）
RQ-2 を指す所          FR-099（RO-3・RO-7・RO-9）・tbl-settings.md:599（S-549）
RQ-3 を指す所          FR-099（RO-5・RO-9）・tbl-agent-api-members.md:87（AV-20）・tbl-settings.md:600（S-550）
RO-7                   FR-099 と閉路（大きさ 2: FR-099 RO-7）—— 1 回で一緒に書く
IMPS-284               仕様のオブジェクトではない（表 T-390 の行）
外部契約（GRS JSON）    変えない（JDG-3807）。列の値の並びは CR-851 が当てる
```

列の順を言うのは X-1 〜 X-4 の 4 か所だけである。`RQ-2`・`RQ-3` を指すほかの所は列の中身か幅を言うので、行 ID を振り直さない限り直さない（③ の決定 2）。

## 3. 消すもの（旧 → 新）

無し。文を消さず、行の順と 2 つの文を直す（1 節）。

## 4. 書き直す所（当ての段で行う）

| # | 置き場 | 中身 |
| --- | --- | --- |
| X-1 | 仕様の 表 T-371（今は `docs/spec/01-04-requirements.md`。B9 の分割の後の置き場で当てる） | `RQ-3` の行を `RQ-2` の行の前へ移す。行の中身は 1 文字も変えない |
| X-2 | 同 `FR-099` の 表 T-390 の `IMPS-284` | 1 節のとおり |
| X-3 | 同 表 T-370 の `RO-7` | 1 節のとおり |
| X-4 | 同 `FR-099` の RATIONALE の `IMPS-284`・`RO-7` | 1 節のとおり（各段落の末尾に足す） |
| X-5 | `docs/spec/_source/display-words.json` の `resourceListColumns` | `RQ-3` の項を `RQ-2` の項の前へ移す（③ の決定 4）。`npm run gen` で `src/adapter/screen-renderer/display-words.json` が追いつく |
| X-6 | `docs/spec/_source/glossary.json` の担当リストの列の 5 語（`xSpecTableRowId` が `RQ-1` 〜 `RQ-5`） | `RQ-3` の語を `RQ-2` の語の前へ移す（③ の決定 4）。`npm run gen` で用語集の表が追いつく |
| X-7 | `docs/development-records/changelog.md` | 末尾に 1 行足す（版はコミットの UTC の時刻、`docs/development-rules/10-versions.md`） |
| X-8 | 同 表 T-370 の `RO-9` | 「（`RQ-2` 〜 `RQ-5` の順）」→「（`S-549` が `RQ-2`、`S-550` が `RQ-3`、`S-551` が `RQ-4`、`S-552` が `RQ-5`）」（③ の決定 3） |

## 5. 継ぎ目（コード）

| 置き場 | 直すこと |
| --- | --- |
| `src/adapter/screen-renderer/resource-list.ts` の `lineOf` | 行のセルを、列の行 ID ごとに作り、`RESOURCE_LIST_COLUMNS` の順に並べる（今は 5 つの値を位置で並べている）。⭐ 起草の席が先に直した（9 節）—— 辞書の並びを変えれば画面の列の順が変わり、セルが列からずれない |
| 同 `LINE_TABLE` の `RQ-4` の値 | `line.cells[3]` を、`RQ-4` の列の位置で引く形にする（同上） |
| 同 `FIXED_COLUMN_COUNT` | 今のまま（担当名の列の位置 + 1）。辞書の並びが変わると 3 になる（③ の決定 1） |
| `src/framework/dom-screen-surface/` | 変えない —— 選択の札は `chosenAt`（`RQ-3` の位置）で、表示の列は `showAt` で引いている。列の幅は行 ID で引いている（`SEARCH_COLUMN_WIDTH_ROWS`） |
| Agent API（`readTableRows` の `resourceList`） | 変えない —— 列は `RESOURCE_LIST_COLUMNS` の順で返るので、辞書の並びに付いてくる。セルは行 ID（`column`）を持つ |

## 6. 試験

試験の観点（仕様だけを読む別のサブエージェントが書く。Gherkin）:

```gherkin
Scenario: 担当リストの列は、表示・選択・担当名・担当タスク数・担当タスクの順に並ぶ
  Given 担当が 2 人いる文書を開いている
  When 利用者がコマンドパレットの担当リスト（IC-62）を押す
  Then 担当リストの表の見出しは、左から 表示・選択・担当名・担当タスク数・担当タスク である

Scenario: 左の 3 列が固定される
  Given 担当リストを開いている
  Then 表示・選択・担当名の 3 列は固定され、担当タスク数と担当タスクは固定されない

Scenario: 選択の札は担当名の左のセルにあり、押すと選択が切り替わる
  Given 担当リストを開いている
  When 利用者が担当「佐藤」の行の選択の札を押す
  Then 佐藤が選択され、札は担当名のセルの左のセルに出ている

Scenario: AI が読む担当リストの列も同じ順である
  When AI が readTableRows で担当リストを読む
  Then 列は RQ-1・RQ-3・RQ-2・RQ-4・RQ-5 の順で返る
```

直す今の試験（列の順を言う所だけ。当ての段で、仕様の文を引く所を 1 文字ずつ数えて直す）:

| 試験 | 直すこと |
| --- | --- |
| `tests/contract/cr-722-ro-rq-the-resource-list-is-a-table-window.contract.test.ts` | `T_371_ORDER`・`RO_7_FIXED` の引用、表 T-371 の行の順の期待、固定の列の期待（`[true, true, true, false, false]`） |
| `tests/contract/cr-796-s4b-the-ai-reads-the-report-and-the-resource-list.contract.test.ts` | 前提「表 T-371 は `RQ-1` .. `RQ-5`」の並びの期待 |

⚠️ playwright（`tests/system/`）は、担当リストの列を行 ID の見出し（`data-column`）で引く。列の位置では読まない（`tests/system/cr-722-the-eyes-the-red-and-the-resource-list-on-the-shipped-build.test.ts` の `columnTexts`）。⭐ それでも当ての段で `playwright test --list` と担当リストの system の試験を走らせる（GT-2 の 7 回目の罠 —— 表を列の位置で読む試験が在った）。

## 7. 台帳

| 台帳 | 行 |
| --- | --- |
| `rulings.md` | `JDG-3754` —— 当てた時に着地先を `spec-ch4-04.md` に直し、状態に「画面の列の順は `CR-861` が当てた」を足した。状態の頭は「指示 —— `CR-851`（列の値の並び）が当てる」のまま |
| `defects.md` | 無し |

## 8. 数（予測 → 実測）

| 数 | 予測 | 実測（check.sh の頭の行、当てる前 → 当てた後） |
| --- | --- | --- |
| tables | 変わらない | 394 → 394 |
| rows | 変わらない（行を足さず、消さない） | 3389 → 3389 |
| uids | 変わらない | 219 → 219 |
| figures | 変わらない | 30 → 30 |

予測はすべて当たった。

## 9. 起草の席が先に直したこと

`src/adapter/screen-renderer/resource-list.ts`（5 節の上 2 行）。⭐ 起草の時点では画面は変わらなかった —— 辞書の並びが今のままなので、列の順も今のままである。仕様が今のままでも試験が通る形で、当ての段の差分を小さくする。

## 10. 測り方の再現

```bash
rm -rf output && bash .claude/skills/spec-graph-check/check.sh   # strictdoc の出力を作る
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-371
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py RO-7 IMPS-284 RQ-2 RQ-3
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-371 T-370 RO-7 IMPS-284 FR-099
grep -rn "RQ-[1-5]" tests src | grep -v "Spec:"
```

## 11. 反映記録

2026-11-27、B9 の分割の後の develop `20fe577af` の上で当てた。

| # | 置き場 | 当てたこと |
| --- | --- | --- |
| X-1 | `docs/spec/spec-ch4-04.md` の 表 T-371 | `RQ-3` の行を `RQ-2` の行の前へ移した（行の中身は 1 文字も変えていない） |
| X-2 | 同 `IMPS-284` | 「表示・担当名・選択・…」→「表示・選択・担当名・…」 |
| X-3 | 同 `RO-7` | 1 節の文 |
| X-4 | 同 `FR-099` の RATIONALE | `IMPS-284`・`RO-7` の段落の末尾に 1 文ずつ |
| X-5 | `docs/spec/_source/display-words.json` | `resourceListColumns` の `RQ-3` の項を `RQ-2` の前へ。`npm run gen` で `src/adapter/screen-renderer/display-words.json` が追いついた |
| X-6 | `docs/spec/_source/glossary.json` | 担当リストの選択の列の語を担当名の列の語の前へ。`npm run gen` で `studies/82-anms-ndd-apply-plan/glossary-review/glossary-terms.tsv` が追いついた |
| X-8 | 同 `RO-9` | 幅の既定の設定と列の対を 1 つずつ書く形にした（対応は変えない）。⭐ 当ての段で足した —— 仕様だけを読む試験役が、行の順が変わると「（`RQ-2` 〜 `RQ-5` の順）」が読み分けられないと指摘した |
| X-7 | `docs/development-records/changelog.md` | 末尾に 1 行 |
| — | `src/adapter/screen-renderer/resource-list.ts` | 5 節のとおり（行のセルを列の行 ID ごとに作る） |
| — | `tools/artifact-versions.json` | src を変えたので `grsRelayBuiltAt` を上げた（検査 85） |
| — | `docs/development-records/rulings.md` の `JDG-3754` | 着地先を `spec-ch4-04.md` に直し、状態に「画面の列の順は `CR-861` が当てた」を足した。列の値の並びは `CR-851` が当てる |

試験:

- 新しい試験 `tests/contract/cr-861-the-resource-list-puts-the-selected-column-before-the-resource-name.contract.test.ts`（14 件）—— 仕様だけを読む別のサブエージェントが書いた。
- 直した試験: `tests/contract/cr-722-ro-rq-the-resource-list-is-a-table-window.contract.test.ts`（引用 2 つ、行の順、固定の 3 列、題と頭の注）、`tests/contract/cr-796-s4b-the-ai-reads-the-report-and-the-resource-list.contract.test.ts`（前提の並び）。
- playwright: `--list` で 860 件、121 ファイルを読み込みエラー無しで読んだ。担当リストを開く system の試験 8 ファイル（`cr-574`・`cr-722`・`cr-723`・`cr-733`・`cr-737`・`cr-739`・`cr-762`・`display-words-reasons-and-watermark`）を、組み立て直した dist で 128 件すべて通した。dist は後で戻した。
- vitest の全件: 674 ファイル中 673 が通った。落ちたのは `tests/contract/cr-586-iv-22-a-drawn-milestone-that-disagrees-is-refused.test.ts` の 2 件だけで、本 CR を外した develop `20fe577af` でも同じ 2 件が落ちる（本 CR の外）。
