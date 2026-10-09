# CR-708 の持ち場の計画 —— 段 0 の測りと、読む仕事の分け方

> 作った日: 2026-10-09。測った木: `d4a165a1`（`origin/main`）。`docs/spec`・`src`・`tests`・`tools` の生成器には何も当てていない（段 0）。
> 元: `change-request/CR-708-rename-row-to-task-group-and-wbs-parent-to-parent-task.md` の 7 節（手順 1〜5）と 8 節の「並べ方」。
> ⭐ 本書の数は、すべて下の 7 節の命令で作り直せる。数の横にその命令を置いた。時間だけは測っていない（読みの速さを仮に置いた。3 節の注）。

---

## 1. 作ったもの

| ファイル | 何 | 書くのは |
|---|---|---|
| `tools/rename/rename_common.py` | 共通部 —— 生きているファイルの範囲、生成物の見分け、持ち場（`lane_of`）、和文の「行」の分類、2.5 節の規則、字句の切り分け、TSV、持ち場ごとの決めの重ね読み | — |
| `tools/rename/build_rename_tables.py` | 段 0 の測り。下の 4 つの表を木から作る。作り直しても、読み手の決めを場所で引き継ぐ。`--report` は 3 節の表を出す | 調整役・段 0 |
| `tools/rename/apply_rename.py` | 適用の台本（7 節の手順 4）。決まった所だけを書く。持ち場に未決が 1 つでも残れば何も書かずに止まり、全持ち場の未決数を出す | 各段の適用の体 |
| `tools/rename/rename_symbols.mjs` | 識別子の改名（7 節の手順 5）。TypeScript 7 の検査器で参照ごと変え、汎用の `row` / `rows` は型で決め（X-12）、注釈と文字列の中の名を語の継ぎ目で変え、ファイルを動かす | 段 2 の `S2-LS`（と段 3 の 2 回目） |
| `docs/review/rename-map.tsv` | 対応表（手順 1）。1 行 ＝ 1 つの名。1,754 行 | 読み手は直に書かない（6 節） |
| `docs/review/rename-phrases-ja.tsv` | 和文の句の表（手順 2）。49 句、当たり 1,110 か所。手で書いた表で、`hits` だけを台本が数える | 調整役 |
| `docs/review/rename-lines-ja.tsv` | 和文の読み票（手順 3）。1 行 ＝ 「行」の 1 か所（と「WBS の親」の仲間、Task の「親子」）。5,702 行 | 読み手は直に書かない（6 節） |
| `docs/review/rename-lines-en.tsv` | 英語の読み票（本書が足した）。散文・注釈・文字列の素の `row` / `rows`、`'row'` だけの文字列、型の無い JS の識別子。10,819 行 | 同上 |
| `docs/review/rename-types.tsv` | 検査器が型で決められなかった汎用の `row` / `rows` 307 か所と、未決の名 665 個に添えた型の手がかり | 同上 |

- ⚠️ **CR の手順 5 との違い（1 つ）**。手順 5 は言語サービスの `findRenameLocations` を名指すが、この木の TypeScript は 7.0.2 で、JavaScript の API（`typescript/unstable/sync`）に `findRenameLocations` が無い。同じ問いに答える `getReferencedSymbolsForNode`（定義と参照の節点の全部）を使った（検査 64 が同じ API を既に使っている）。省略記法の `{ row }` だけは改名に前置きが要るので書かず、`manual` として読み手へ回す。
- 英語の読み票は CR の 7 節に無い。2.1 節の英の語（`row` → `task group`）と X-12 の「型を持たない JS の中の `row` は手で読む」を、和文と同じ形で 1 か所ずつ決めるために足した。

## 2. 表の読み方と決めの書き方

| 表 | 決めの欄 | 書ける値 |
|---|---|---|
| 読み票（和・英） | `decision` | `task-group`（＝「タスクグループ」/ task group）・`task`（＝「タスク」、`JDG-1664`）・`keep`（＝「残す」）・`rewrite`（＝「書き換え」。`rewrite_old` → `rewrite_new` をその行で 1 回）。和の語（タスクグループ・タスク・残す・書き換え）も受ける。台本が埋める値: `phrase`（句の表が当たった）・`mirror`（試験の引用が仕様の同じ所に従う）・`keep`（`machine:table` —— 表の行・行 ID） |
| 対応表 | `class` | `a`（変える）・`b`（変えない）・`?`（未決）。`collision` が空でない行も未決 |
| 型の表 | `decision` | `task-group`・`keep` |

- **未決** ＝ 読み票の `decision` が空（か、未決の行に従う `mirror`）、対応表の `class` が `?` か `collision` 付き、型の表の `decision` が空。
- ⭐ **読み手は表を直に書かない。持ち場ごとに自分のファイルへ書く**: `docs/review/rename-decisions/<持ち場>-lines.tsv`（`path line col text decision rewrite_old rewrite_new note`）、`<持ち場>-map.tsv`（`old new class note`）、`<持ち場>-types.tsv`（`path line col nth name decision note`）。台本はそれを表の上に重ねて読む（`rename_common.overlay_lines` / `overlay_map`）。照合は ID ではなく場所（パス・行・列・語）で行う —— 表を作り直すと ID は振り直されるが、場所は変わらない。⇒ 並んで読む体どうしが同じファイルを書くことは無い。
- 表の文脈の欄が木の中の旧い ID の綴り（検査 51・52・63 が禁じる形）を写すと、追跡したとたんにそれらの検査が赤くなる。そこで表に書くときだけ、その綴りのハイフンの後に見えない語結合子（U+2060）を挟み、台本は読むときに外す（`rename_common.MASK`）。読み手が自分の決めのファイルに文脈を写すときも、この字は要らない（照合は場所で行う）。
- 対応表の各行の `home_lane` が、その名を読む持ち場である（その名に会う最も早い段の、最も多く会う持ち場。`src` に出る名は、試験に多く出ても段 2 で読む —— 段 2 の検査器の一手が参照を全部変えるから）。

## 3. 持ち場の表（`d4a165a1`）

| 持ち場 | 段 | ファイル | 和 未決 | 英 未決 | 未決の名（か所） | 型 | 見込み h | 終わりの証（0 にする数） |
|---|---:|---|---:|---:|---:|---:|---:|---|
| `S1-A` | 1 | `01-04-requirements.md` の頭〜「#### 診断の一覧とレポート」の前（1 本の前半、3,723 行） | 720 | 3 | 0 | — | 2.9 | `apply_rename.py --lane S1-A --dry-run` の未決 0・problems 0 |
| `S1-B` | 1 | `01-04-requirements.md` の「#### 診断の一覧とレポート」から末尾 | 744 | 1 | 0 | — | 3.0 | 同 `--lane S1-B` |
| `S1-C` | 1 | `05-07-design.md`・`08-10-test.md`・`A-appendix.md`・`_assets` の原稿（`tbl-glossary.md`・`design-mcp-relay.md`・図）・**開発規則**（32 本） | 834 | 23 | 4（9） | — | 3.5 | 同 `--lane S1-C` |
| `S1-D` | 1 | `_source` の原稿と生成器（`notice-reasons.json`・`display-words.json` を含む）・手引き・ダウンロードの頁・`tools/generate_*.py` の名と和文（61 本） | 472 | 434 | 78（613） | — | 4.9 | 同 `--lane S1-D` |
| `S1-T` | 1 | 仕様を引く試験の和文（241 本） | 513（＋ 仕様に従う 635） | — | — | — | 2.1 | 同 `--lane S1-T`（従う 635 は仕様の持ち場が決めれば 0 になる） |
| `S2-LS` | 2 | `src`＋`tests` の全部を検査器で 1 回（読みは無い。計 7,114 か所・461 本・移動 58） | — | — | — | — | 0 | `rename_symbols.mjs --dry-run` の `undecided map names in code: 0`・`overlaps: 0`・`library references: 0` |
| `S2-ENT` | 2 | `src/entity`（46 本） | — | 80 | 17（1,021） | 31 | 0.9 | `--lane S2-ENT` の未決 0、`rename-types.tsv` の `S2-ENT` が 0 |
| `S2-UA` | 2 | `src/use-case`・`src/adapter`（98 本） | — | 211 | 109（593） | 122 | 3.7 | 同 `S2-UA` |
| `S2-FW` | 2 | `src/framework`・根の設定・`index.html`（49 本） | — | 80 | 37（457） | 5 | 1.0 | 同 `S2-FW` |
| `S2-TL` | 2 | `tools`（生成器の英語の散文を含む）・`.claude/skills/spec-graph-check`（基準値を除く）（94 本） | 54 | 1,830 | 45（163） | — | 8.3 | 同 `S2-TL` |
| `S3-UNIT` | 3 | `tests/unit`（191 本） | — | 3,249 | 201（1,345） | 67 | 16.9 | 同 `S3-UNIT`、型 0 |
| `S3-CON` | 3 | `tests/contract`（284 本） | — | 1,858 | 268（1,861） | 67 | 12.5 | 同 `S3-CON` |
| `S3-SYS` | 3 | `tests/system`・`usecase`・`integration`・`nfr`・`fixtures`・`known-red.txt`（110 本） | — | 1,241 | 99（487） | 15 | 6.7 | 同 `S3-SYS` |
| `S3-BASE` | 3 | 検査の基準値（21 本、調整役 `JDG-520`） | — | 81 | 4（5） | — | 0.4 | 段 2・3 の後に検査を回し、名とパスだけを直す（読み票では決めない） |
| **計** | | | **3,337**（＋従う 635） | **9,091** | **862 名（6,554）** | **307** | **66.6** | |

- 数え方: `PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py --report`（表を作った後）。「型」は `node tools/rename/rename_symbols.mjs --survey` の後の `rename-types.tsv` の未決。
- ⚠️ **時間は測っていない**。読みの速さを仮に、読み票 250 行/h（ファイルごとにまとめて読む）、未決の名 60 名/h（使われ方を引いて読む）、型の行 120 行/h と置いた（`build_rename_tables.py` の `RATE_*`）。最初の持ち場が実の速さを返したら、h の列を（仮の速さ ÷ 実の速さ）倍にする。
- **CR 8 節との違い（2 つ）**。① 開発規則（和 597 か所）を `S1-D` から `S1-C` へ移した —— `S1-D` が 10.4 h、ほかが 1〜3 h と偏っていたため。② `tools/generate_*.py` の英語の散文（746 か所、ほぼ「表の行」の注釈）は段 2 の `S2-TL` で読む。生成器の名（鍵の字面など、X-16）と和文は段 1 の `S1-D` に残る —— 段 1 で生成器を回すから。段 2 に層の外の持ち場 `S2-TL` を 1 つ足した（8 節の 3 層の外の `tools` と検査、9 節）。
- 未決の名の内訳: 識別子 822・ファイル 9・ファイルのパス 20（試験の名）・JSON の鍵 5、衝突 6（下の 5.2）。

### 3.1 長い持ち場の割り方（ファイル単位で交わらない）

| 持ち場 | 割り方（パスの辞書順で切る） | 見込み h |
|---|---|---:|
| `S2-TL` | `tools/` の頭〜`tools/generate_help_roster.py` ／ その後〜`tools/` の末尾と `.claude/` | 4.2 ／ 4.1 |
| `S3-UNIT` | 頭〜`tests/unit/fr-036-help-item-order-and-size.test.ts` ／ 〜`tests/unit/uf-39-40.test.ts` ／ 残り | 5.7 ／ 6.0 ／ 5.2 |
| `S3-CON` | 頭〜`tests/contract/dfc-290-d-321-fr-033-copy-and-paste-reach-the-document.test.ts` ／ 残り | 6.3 ／ 6.2 |

- 数え方: 各ファイルの未決を上の仮の速さで時間にし、辞書順に積んで等分に近い所で切った（未決の名は、`rename-types.tsv` の手がかりが最初に会うファイルに数えた）。割った持ち場の決めのファイル名は `S3-UNIT-1-lines.tsv` のように番号を付ける。
- `01-04` の分け目は `--suggest-split` が 01-04 の未決（1,464）を半分にする見出しとして出した 3808 行（「明記されていない WBS の親」—— 改名で書き換わる見出し）の隣の 3724 行「診断の一覧とレポート」にした（737 ／ 727 に対し 723 ／ 745）。

## 4. 段の順と並べ方

⭐ **読むことと当てることを分ける**。読み票・対応表・型の表の場所は、凍結した `d4a165a1` の木の上の場所である。適用の台本は、前の段が同じ行を書き換えていても、前後の文字を短くしながら行の中で一意な所を探して当てる（`apply_rename.locate`）。型の決めはパス・行・名・その行で何番目か（`nth`）で引く —— 改行を足す編集は無いので行はずれない。⇒ **どの持ち場の読みも、凍結の間ならいつでも始められる**。当てるのは段の順に 1 回ずつ。

| 順 | 何をする | 前に要るもの | 終わりの確かめ |
|---|---|---|---|
| 1 | 段 1 の 5 つの持ち場（`S1-A`〜`S1-D`・`S1-T`）が読む | 凍結 | 各持ち場の `--dry-run` で未決 0 |
| 2 | `apply_rename.py --stage 1` → `npm run gen` → スキーマの版（2.3）→ 手引き（X-16） | 1 | CR 8 節の段 1 の欄（`gen:check`・`strictdoc export`・check.sh の仕様の側・`induced.py`） |
| 3 | 段 2 の 4 つの持ち場が読む（1 と並べてよい） | 凍結 | 各持ち場の未決 0、`rename-types.tsv` の `src` の行 0 |
| 4 | `apply_rename.py --stage 2` → `rename_symbols.mjs --apply --leave-tests-undecided` → `npm run gen` → `agentApiVersion` 2・`.mcpb` | 2・3 | CR 8 節の段 2 の欄（`typecheck`・`build`） |
| 5 | 段 3 の持ち場が読む（1・3 と並べてよい） | 凍結 | 各持ち場の未決 0、`rename-types.tsv` の `tests` の行 0 |
| 6 | `apply_rename.py --stage 3` → `rename_symbols.mjs --apply`（2 回目。試験だけの名と型）→ `npm run gen:tests` → 基準値（`S3-BASE`、調整役） | 4・5 | CR 8 節の段 3 の欄 |
| 7 | 7 節の手順 6 の数え直し: `build_rename_tables.py` を新しい木で回し、区分 a の印・`WL-n` が 0、素の「行」が `keep` の数と等しい | 6 | 0 |

- 段の中の順: 同じ段で `apply_rename.py` を先、`rename_symbols.mjs` を後に回す（読み票の場所は凍結の木の場所。検査器は今の木から場所を計り直す）。
- `S2-LS` は 1 つの体が 1 回で回す（参照が層をまたぐ）。段 2 の `--apply` は `src` に出る未決が 1 つでもあれば止まる。試験にしか出ない名と型は `--leave-tests-undecided` で残し、段 3 の 2 回目で変える。
- 全部を並べたときの実時間: 読みの最長は 3.1 の割り方で約 6.7 h（`S3-SYS`）。段 1 だけなら 4.9 h（`S1-D`）。これに CR 8 節の適用と確かめの時間が段ごとに足される。

## 5. 気づいたこと

### 5.1 写しの上での空回し（手順 4 の確かめ）

`git archive d4a165a1` を scratchpad に展開し、表と台本を写して回した（作業木には書いていない）。

| 回し方 | 結果 |
|---|---|
| `apply_rename.py --stage 1 --dry-run` | **拒んだ**（終了 1）。段 1 の未決 4,379 行（`S1-A` 723・`S1-B` 745・`S1-C` 857・`S1-D` 906・`S1-T` 1,148）、未決の名 82 名 271 か所、problems 0、書く予定 1,635 か所 129 本 |
| `apply_rename.py --all --dry-run` | **拒んだ**。全持ち場の未決 13,063 行、未決の名 143 名 492 か所 |
| 表が無い写しで回す | 「表が無い」と言って拒んだ（0 と数えて通ることはない） |
| 持ち場の決めのファイルを 1 本置いて回す | 未決が 2 つ減った（`S1-A` 723 → 721）—— 重ね読みが効く |
| 写しの表の未決を全部仮に埋めて段 1〜3 を当て、`rename_symbols.mjs --apply` まで回す | 書けた。CRLF の数は比べた 965 本すべてで前後一致（段 1 5,901 か所・段 2 3,208 か所・段 3 7,417 か所、problems 0）。旧名が残ったのは生成物（`npm run gen` が追う）と、仮に `b` にした衝突の名だけ。`wbs-parent-hold.ts` は `parent-task-hold.ts` へ動き、import の道も追った |

- 段 1 の数（4,379）が 3 節の和（720＋3＋744＋1＋834＋23＋472＋434＋513 ＝ 3,744）より多いのは、`S1-T` の従う 635 が仕様の決めを待って未決に数えられるからである（3,744＋635 ＝ 4,379）。

### 5.2 衝突 6 名（段 2 で読む）

| 旧 | 新 | 衝突の相手 |
|---|---|---|
| `rowPanel` | `taskGroupPanel` | `rowTitlePanel` |
| `rowPanelWidth` | `taskGroupPanelWidth` | `rowTitlePanelWidth` |
| `ROW_PANEL` | `TASK_GROUP_PANEL` | `ROW_TITLE_PANEL` |

- 2.5 節の規則 2（`row title panel` → `task group panel`）と規則 8 が、2 つの旧名を同じ新名にする。同じものの別名なら 1 つに寄せてよいが、同じ有効範囲に両方があれば名がぶつかる。読み手が名ごとに決める（`<持ち場>-map.tsv` で `new` を書けば衝突は消える）。

### 5.3 CR の数との突き合わせ

| CR の数 | 段 0 の数 | 違いの理由 |
|---|---|---|
| `WL-n` 17 行、仕様の原稿 43・`src` 46・`tests` 79・`tools` 2（2.7） | 17 種、生成物を除く 170 か所 | 一致（43＋46＋79＋2） |
| `src` のファイル 11（2.6） | 11 | 一致 |
| 試験のファイル 62 ＋ 接頭辞 1（2.6） | `a` 46 ＋ 未決 20 ＋ 固定データ 1 | 機械は名の部分だけで分ける。未決 20 を読むと CR の数に寄る |
| 「区分 a の複合の識別子」`src` 1,704・`tests` 2,776（3.2・3.3） | 検査器が変える所 7,114（`src`＋`tests`、注釈と文字列の名を含む） | 数え方が違う（CR は字面の出現、本書は改名する場所） |
| 段 3 の見込み 6〜7.5 h（3 つの体） | 読みだけで 36.1 体時間（仮の速さ） | 試験の英語の注釈と文字列の素の `row` 6,348 か所を CR は数えていない。3.1 の割り方で実時間は約 6.7 h |

### 5.4 機械が決めたものと、決めなかったもの

- 機械が決めた: 和文 —— 句の表 965 か所（＋「WBS の親」の仲間 147）、表の行・行 ID の後の「行」618 か所（`keep`）、試験の引用が仕様に従う 635 か所。英語 —— 「表 T-nnn の row」「row id」など 1,728 か所（`keep`）。識別子 —— 検査器が型で決めた汎用の `row` 571 か所、`keep` 7,812 か所。
- 機械が決めなかった（読む）: 3 節の表の数。⛔ 句の表の「行の高さ」は、文字の行の高さ（行送り）に当たった所を読み手が覆す（句の表の `note`）。
- 区分 b の既定（2.5 節の部分の一覧）に `fields`・`icons` などの複数形、`tooltip`・`marker`・`template`・`dictionary`・`entry`（元の一覧の台本と同じ）と `csv`・`tsv`・`text`・`line(s)` を足した。2.5 節の規則 2〜7 に当たる名は、b の部分を持っていても `a` とした（`rowTitleWidthField` は規則 3）。

## 6. 測り方（`d4a165a1` で、作業木の根から）

```
git merge --ff-only d4a165a1                                         # Already up to date
PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py    # writes the four tables, prints the lane table
node tools/rename/rename_symbols.mjs --survey                        # writes rename-types.tsv (307 + 665 hints)
PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py --report   # section 3 table, from the tables on disk
PYTHONIOENCODING=utf-8 python tools/rename/build_rename_tables.py --suggest-split   # the 01-04 split (3.1)
node tools/rename/rename_symbols.mjs --dry-run                       # 7,114 edits in 461 files, 58 moves, 0 overlaps
# dry run on a copy: git archive d4a165a1 | tar -x -C <scratch>/copy; copy tools/rename and docs/review/rename-*.tsv in
PYTHONIOENCODING=utf-8 python tools/rename/apply_rename.py --root <scratch>/copy --stage 1 --dry-run   # REFUSED, exit 1
```

- 生きているファイル: `docs/spec`・`docs/development-rules`・`docs/guides`・`docs/download`・`docs/README.md`・`src`・`tests`・`tools`（`tools/rename` を除く）・`.claude/skills/spec-graph-check`・根の設定。履歴（`docs/development-records`・`change-request`・`docs/review`・`previous-project-result`）と `dist` と `sample-schedule`（MSPDI の見本）は外（X-4・X-15）。
- 生成物: 頭の 15 行に `GENERATED` か「本書は生成物である」を持ち、`SINGLE SOURCE OF TRUTH` を持たないファイル（`.py` は生成物にしない）—— 37 本。数えるが書かない。
- 和文の分類は `docs/review/rename-row-to-task-group-remeasure.py` の `ja_class` を写し、2 つだけ変えた: 中黒（・）を語の連なりに入れない（「行・隠」を 1 語に数えない）、数の直後の素の「行」を読みに回す（「1 行」はタスクグループを数えることがある —— 7 節の表）。

## 7. 突き合わせ（reconcile、2026-10-09、16 の持ち場の決めを合わせた後）

⭐ 持ち場をまたいで決めを揃え、表を作る道具の穴を塞いだ。調整役の決めは `docs/review/rename-decisions/RECONCILE-lines.tsv`（179 行: 残す 103・タスクグループ 53・書き換え 23）・`RECONCILE-map.tsv`・`RECONCILE-types.tsv`、持ち場の決めを覆したものはその持ち場のファイルの行を書き換え、`note` を `reconcile:` で始めた（`S1-B` 1・`S1-C` 3・`S1-T` 7・`S3-BASE` 5・`S3-UNIT-1` 1・`S3-UNIT-2` 1）。`S3-BASE` は `S3-BASE-lines.tsv`（81 行）と `S3-BASE-map.tsv`（4 名）。

| 項 | 何をしたか |
|---|---|
| 字句（14） | `code_segments` を本物の字句に替えた —— JS / TS は `@babel/parser`（`tools/rename/lex_spans.mjs`、node 1 回で全ファイル）、Python は `tokenize`。正規表現の字面も文字列と並べて読み票に載せる（`data-figure="row-…"` を引く試験）。`rename_symbols.mjs` の注釈・文字列の区切りも同じ字句を使う。作り直すと、コードを文字列と読み違えていた所 1,135 か所（すべて「残す」）が消え、見落としていた注釈・文字列 193 か所が現れた（すべて決めた） |
| 動詞（1） | 「行」の後の仮名を 3 字まで見る。「行う」の活用と「行く」の活用（か＋ない・せ・れ・ず・ね、き＋ま・先・来・止・渡・届・過・着、く・け・こ）だけを動詞とする。「行か」「行から」が票に現れた（和 55 か所、うち 17 は同じ行の書き換えが既に覆う） |
| 表の行（2） | 行 ID の後の「行」を表の行とするのは、接頭辞が `docs/spec/_source/row-id-prefixes.json` に在るときだけ（要求の ID は表の行を名指さない）。英語の側も同じ。`published-entries.json`・`settings.json` の `FR-016` の 5 か所は縦軸に書き換え。作り直しは機械の決めを持ち越さない（規則が変わった所が開く） |
| 句の前の空白（3） | 「WBS」で始まる句が和文だけになるとき、前の半角空白 1 つ（和字と和字のあいだ）も取る。写しで「和字＋空白＋WBS の句」77 → 0 |
| 題の行の帯（4） | `WB-8`・`WB-10` の「題の行の帯」と、それを引く試験 3 か所を「残す」に戻した |
| `S-208`（5） | `settings.json` の「掴んだ行の軸」をタスクグループに（`03-implementation.md` と試験の引用に揃う） |
| 引用（6） | 写しの上で、試験が仕様の文を引く 672 か所すべてが当てた後も仕様の文に含まれる（壊れていた 6 か所と、仕様の側の 2 か所を直した） |
| コードの位置（7） | コードのファイル（`.ts`・`.mjs`・`.js`・`.py`）の task-group / task の決め 3,083 か所を字句で引き、コードの上のものは 0（注釈 1,479・文字列 1,604） |
| `row-controls`（8） | `row-controls`・`row-controls-sample` は区分 b（履歴のパス） |
| 試験のファイル名（9） | `dfc-1054-a-pasted-row-copy-writes-no-slack`・`sit-on-the-row-centre` はファイルのパスの行と同じ a。`known-red.txt` と `cr-586` の題はともにタスクグループ |
| `rows` と種類（10） | 配置を局所の形に投げ直して `rows` を読む試験 4 本（型が `keep` になる所）を `RECONCILE-types.tsv` で名指し、`rename_symbols.mjs` が型の行の外でも当てるようにした。`data-figure` の頭 `row-` → `task-group-` を試験の正規表現 7 か所と `slice(4,` → `slice(11,` に |
| `rows()`（11） | `09-tools.md` の `rows` は道具の読み `rows()` の名なので残す（`S2-TL` が残す） |
| 検査 70（12・15） | 自分試しの `rowanchorin` と、基準値の鍵の `rowanchorat`・`rowgrabaxisat` は小文字に畳んだ名として対応表に足した（`FOLDED_NAMES`）。基準値の鍵 5 つは、`row` が `task group` になると鍵の語の窓から最後の語が落ちるので、書き換えで揃えた。数は変えていない |
| `S1-T` の problems（13） | 折り返した引用 2 つは仕様の書き換えを折り目で切って当て、重なりは鏡の書き換えが覆うので「残す」 |

- **道具の直し（上の表の外）**: 型の決めの `nth` は、その行の「コードの識別子」だけを数える（前の段が同じ行の文字列を書き換えても鍵がずれない。決めのファイルの `nth` を数え直した）。`apply_rename.py` は、先に動いたファイルを新しいパスで読み、ファイルの構文を壊す編集を拒む（読み手の書き換えが単引用符の文字列に `'s` を入れた 2 か所を言い換えた）、「残す」の行は場所を探さない、列は前後の文字と合うときだけ信じる、片側の文脈だけでも探す。`rename_symbols.mjs` は `--project` で開く設定を選べる（`node_modules` の無い写しで型を解くため）、2 回目の実行は済んだ移動を飛ばす、決めのパスを移動の後に読み替える。
- ⚠️ **当てる順を変える（4 節の表と CR 8 節に対して）**: `rename_symbols.mjs --apply` を **最初に 1 回**（全持ち場が決まったので `--leave-tests-undecided` は要らない）、その後で `apply_rename.py --stage 1`・`--stage 2`・`--stage 3`、それから `npm run gen`。`apply_rename` を先に回すと、型の位置の文字列（`ScheduleLayout['rows']`・`kind: 'row'`）が先に変わり、検査器がその周りの識別子を error / any と読んで、試験の 231 か所が未決に戻る。
- **証（`fad213e8`、写しの上）**: `apply_rename.py --all --dry-run` 未決 0・problems 0・編集 9,193 か所 354 本。`rename_symbols.mjs --dry-run` 未決の名 0・重なり 0・ライブラリ参照 0・決めの後の未決の型 0。写しに上の順で当て `npm run gen` まで回すと、`tsc --noEmit` の誤りは当てる前の写しと同じ（写しは `node_modules` を木の外から引くので 1,267 件の環境の誤りが両方に同じだけ出る。作業木そのものは 0 件）。検査 70（自分試しを含む）・関数の大きさ・`published-members`・`quoted-source` ほか基準値を読む検査はすべて緑。
