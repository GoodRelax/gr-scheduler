# CR-723 —— 表の見え方（Visibility・目・列のフィルタ・並べ替え）を `GRS JSON` に保存し、変えれば未保存の編集として取り消せ、開けば目を入れた表の窓が最小化して出る

> 起草の状態: **下書き**（2026-10-10、作業木 `945a244f` の上）。仕様・コード・試験・台帳の行の状態は変えていない。`CR-722` を当てた後に当てる（`CR-722` の値の形 `TableVisibility` の置き場を文書へ移す）。
> ID の帯: 番号 `CR-723` を調整役から受けた。`945a244f` の木で `CR-723` を名乗る所は 0 件だった。新しい行は仮の名（`C` は本書の印）で書く —— `S-NEW-C1`〜`S-NEW-C13`・`UN-NEW-C1`・`CM-NEW-C1`・`T-NEW-C1`（形の表）・`OP-NEW-C1`。当てるときの最大は `945a244f` で `S-542`・`UN-19`・`CM-91`・`T-369`。`JDG`・`DFC`・`PND` の行は足さない。
> 当てる裁定: `JDG-1824`（`GRS JSON` の設定値に保存。MSPDI には書かない）・`JDG-1825` の前半（保存するのは表ごとの Visibility・目の入切・列のフィルタ・並べ替え。語・窓の位置・大きさ・字の段は保存しない）・`JDG-1826`（目が入の表の窓は開いたときに最小化して出し、赤で示す）。形式の変わりは `JDG-1673`〜`JDG-1678`（運用の前は台帳を空のまま、古い形の文書は読み替えず拒む）に従う。
> 覆す裁定（既に 覆された と記録済み）: `JDG-1380`（画面だけ —— `JDG-1824`）。
> 閉じるもの: `DFC-2329`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`945a244f`）

| 行の読み | 見たもの | 本書での扱い |
|---|---|---|
| `DFC-2329`: 表の表示状態とフィルタは文書に残らない | 正しい。`FR-151` の「⛔ パネルの表示・位置・大きさ・語・フィルタ・並べ替え・列の幅を文書に保存してはならない（MUST NOT）」と「⛔ チェックとスケジュールフィルタの入切も文書に保存してはならない（MUST NOT）」、`FR-134` の「⛔ レポートと窓の状態（…フィルタ・並べ替え）を文書に書いてはならない（MUST NOT）」。設定値は 表 T-206（保存しない）の `S-420`・`S-494`・`S-495`・`S-451` | 保存するものだけを 表 T-203（文書に保存する画面の値）へ移し、2 つの ⛔ を狭める |
| 設定値の形は文字列の配列までしか作れない | 正しい。`erd_json_to_schema.py` の `settings_type`（619 行）は、配列の要素を文字列（UUID なら `format: uuid`）とし、オブジェクトは数の欄だけを持つ形（`` `{ a, b }` ``）しか読まない。`Task.uid`（整数）の配列も、列のフィルタ（列・外した値・いつから・いつまで）も書けない | 生成器を 2 か所広げる（X-3） |
| 形式の版を上げれば台帳に行が要る | 誤り。`S-541`（運用開始の版）は `null` であり、台帳（`grs-json-changes.json` の `changes`）は空のまま —— 古い形の文書は読み替えず拒む（`JDG-1677`・`JDG-1678`、検査 76） | 台帳に行を足さない。版だけを上げる |

### 0.2 裁定の鎖（rulings.md を「保存」「文書に保存」「GRS JSON」「documentSettings」「未保存」「取り消し」「treeState」「画面だけ」「最小化して開く」「x-grsChanges」「SCHEMA_VERSION」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1380` | チェックと入切は画面だけ | 覆された（`JDG-1824`） |
| `JDG-596`（`CR-570`） | 行ごとの `treeState` を保存し取り消せる | 先例 —— 保存する画面の値は、変えれば未保存の編集で取り消しの 1 段 |
| `JDG-1379` | 入るときに開いたら未保存の編集・取り消しの 1 段 | 同じ形（`TV-6`） |
| `JDG-1673`〜`JDG-1678` | 形式の版・台帳・運用の前は拒む | 版を上げ、台帳は空のまま |
| `JDG-601` | 古い形の文書は読み替えず拒む | 本書の後、今の版の文書は開けない（運用の前 —— `no-backward-compat-before-launch`） |
| `JDG-1821` | 窓を閉じれば目が切れる | 保存の値も変わる —— 11 節の問い 2 |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-004`（渡す）—— フィルタを掛けた日程をファイルのまま人に渡せる（利用者の理由: 「お前のタスクだけフィルタしておいた。遅れているからここだけがんばれ」）。
- `GL-006`（横断の作法）—— 保存する画面の値は、変えれば未保存の編集で取り消せる、という今の作法（`treeState`・ピン止め）に表の見え方をそろえる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 保存する値の全数は 表 T-203 の行だけが持ち、`FR-151`・`FR-134`・`FR-099` の ⛔ は「表 T-203 の行のほか」と指す。
- `R1.4`（境界）—— 保存するもの（Visibility・目・列のフィルタ・並べ替え）と、保存しないもの（語・窓の位置と大きさ・最小化と最大化・字の段・列の幅・担当リストの選択・開いているフィルタ）を表で分ける（3 節）。
- `R7.1`（往復）—— 保存して開き直すと同じ見え方に戻ることを試験の継ぎ目に置く（9 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 鍵は `documentSettings.tableViews` の下に表ごと（`search`・`report`・`roster`）に置き、`isApplied`（目）・`hiddenTaskUids`（検索とレポート）／`hiddenResourceUids` と `isUnassignedHidden`（担当リスト）・`columnFilters`・`sort` とする。どの鍵も既定の値で書く（`FR-024` —— 見せ方の群は毎回すべて書く） | `CR-722` の `TableVisibility` の形をそのまま運ぶ。名は Visibility ／ Show ／ Hide の語（`JDG-1817`）—— Hide の側だけを持つのは、初めがすべて Show で、外した行だけが値を持つから | 文書が 13 鍵ぶん太る（既定なら数百字） |
| X-2 | 列のフィルタは画面が持つ形のまま保存する —— 列の行 ID（例 `SQ-5`）・外した値の語（担当名の列なら名前）・いつから・いつまで。担当の改名で外した名前が古くなっても、読み替えない（その値は何にも当たらなくなる） | `S-420` が持つ形（`SearchColumnFilter`）と同じ。Excel のフィルタも値で覚える | 改名した担当のフィルタは外れたように見える |
| X-3 | 生成器 `erd_json_to_schema.py` を 2 か所広げる: ① 型の欄が「`Task.uid` の配列」「`Resource.uid` の配列」なら要素を整数に ② 型の欄が `ColumnFilter` の配列 ／ `ColumnSort` ／ `null` なら、Chapter 6.2 の新しい表 `T-NEW-C1` が持つ欄から `$defs` を作る | 生成器は値を作らず、表から読む（検査 17）。形を表に置けば、生成器も人も同じ 1 か所を読む | 生成器の手入れ（約 1 時間） |
| X-4 | 読むときに、文書に無い `Task.uid`・`Resource.uid` と、表の列に無い列の行 ID は、黙って捨てる。拒まない | 今の `S-78`（`scrollGroupId`）が無い id を指すときの扱い（表 T-024a の `OP-10`）と同じ —— 見え方の値のために文書を開けなくしない | 捨てたことを告げない |
| X-5 | 変えたら未保存の編集（`FR-100`）で、取り消しの 1 段（`UN-NEW-C1`）。1 回の変更とは: 行の Show ／ Hide の 1 回（見出しのまとめての入れ外しを含む）・目の入切・列のフィルタの 1 回（値の印 1 つ・`IC-125`・`IC-126`・いつから・いつまで）・並べ替え・クリア（`IC-NEW-A1`）。命令は 1 つ（`CM-NEW-C1` `setTableView` —— 表 1 つの見え方を置き換える） | `CR-570` の `treeState` と同じ（保存する画面の値は変えれば編集）。命令を 1 つにするのは、`Agent API` の `applyCommands` が同じ 1 本で書けるように | フィルタの印を 10 回外せば 10 段 |
| X-6 | `SJ-0` で飛ぶために行を Show に戻した・目を切ったのは、`SJ-2` の開きと同じ 1 段に入れる | 1 回の飛びは 1 段（`SJ-2`） | 無い |
| X-7 | 文書を置き換えたとき（`TV-9`）は、捨てずに開いた文書の値を読む。目が入の表の窓を最小化して出し、赤で描く（`JDG-1826`）。検索パネルはタスクの表を出す | `JDG-1826` | 開いた直後に窓が最小化で並ぶ |
| X-8 | 窓を閉じたときに目が切れる（`JDG-1821`）のも保存の値の変更として数える（11 節の問い 2 の推奨） | 保存した値と画面がずれない | 窓を閉じただけで未保存の印が付く |
| X-9 | `Agent API`: `readDocument` が返す文書に `tableViews` が載る。`applyCommands` で `setTableView` を出せる。`showOnlyTasks`（`AM-27`）は `setTableView` を 1 つ出すのと同じ（取り消しの 1 段・未保存の編集） | `JDG-1387`（読めて変えられる）と `FR-100` の「`Agent API` の書き込みも数える」 | 無い |
| X-10 | MSPDI へは書かない。単一 html の書き出しは `GRS JSON` を埋めるので載る | `JDG-1824`。表 T-203 のほかの行と同じ | 無い |
| X-11 | 担当リストの窓の選択（消す相手）・開いているフィルタの列・フィルタの中の検索欄の語は保存しない | `JDG-1825`（保存するのは 4 つ） | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 保存しない ⛔ を狭める | `docs/spec/01-04-requirements.md` の `FR-151`（2 つの ⛔ と結び）、`FR-134` の ⛔、`FR-099` の ⛔（`CR-722` が足したもの） | E-01・E-02 |
| スケジュールフィルタの寿命 | 同 表 T-353 の `TV-8`・`TV-9`、`SV-14` の「同じ画面のあいだ覚える」の対象 | E-03 |
| 開くとき | 同 表 T-024a に `OP-NEW-C1`（目が入の表の窓を最小化して出す） | E-04 |
| 取り消し | 同 `FR-031` の 表 T-027 に `UN-NEW-C1` | E-05 |
| 命令 | `docs/spec/_assets/tbl-glossary.md` の 表 T-108 に `CM-NEW-C1` | E-06 |
| 設定値 | `docs/spec/_source/settings.json`: 表 T-203 に `S-NEW-C1`〜`S-NEW-C13`、表 T-206 の `S-420`・`S-494`・`S-495`・`S-NEW-B4`〜`S-NEW-B6` を狭める・退ける | E-07・E-08 |
| 形の表と生成器 | `docs/spec/05-07-design.md` の Chapter 6.2 に 表 `T-NEW-C1`、`docs/spec/_source/erd_json_to_schema.py`、`erd.json` の `documentSettings` の箱 | E-09・E-10 |
| 形式の版 | `tools/generate_startup_template.py` の `SCHEMA_VERSION`（当てる時刻） | E-11 |
| 案内と例 | `docs/guides/schedule-to-grs-json/grs-skeleton.json`（検査 75）、`image-to-grs-json-prompt.*.md` | E-12 |
| 変更履歴 | `docs/development-records/changelog.md` | E-13 |

数（予測）: 要求 ±0。表 +1（`T-NEW-C1`）。表 T-203 の行 +13、表 T-206 の行 −3〜−4（当てる体が数える）。表 T-027 の行 +1、表 T-108 の行 +1、表 T-024a の行 +1。`（MUST NOT）` −2（狭めた ⛔ が残るなら ±0）。

---

## 2. 新しい識別子（仮の名）

| 仮の名 | 置き場 | 鍵 / 何 | 型 | 既定 |
|---|---|---|---|---|
| `S-NEW-C1` | 表 T-203 | `tableViews.search.isApplied` —— 検索の表の目 | 真偽 | `false` |
| `S-NEW-C2` | 同 | `tableViews.search.hiddenTaskUids` —— 検索の表で Hide の行 | `Task.uid` の配列 | `[]` |
| `S-NEW-C3` | 同 | `tableViews.search.columnFilters` —— 検索パネルの 2 つの表の列のフィルタ | `ColumnFilter` の配列 | `[]` |
| `S-NEW-C4` | 同 | `tableViews.search.sort` | `ColumnSort` / `null` | `null` |
| `S-NEW-C5`〜`S-NEW-C8` | 同 | `tableViews.report.isApplied`・`hiddenTaskUids`・`columnFilters`・`sort` | 同上 | 同上 |
| `S-NEW-C9` | 同 | `tableViews.roster.isApplied` | 真偽 | `false` |
| `S-NEW-C10` | 同 | `tableViews.roster.hiddenResourceUids` | `Resource.uid` の配列 | `[]` |
| `S-NEW-C11` | 同 | `tableViews.roster.isUnassignedHidden` —— （担当なし）の行が Hide か | 真偽 | `false` |
| `S-NEW-C12`・`S-NEW-C13` | 同 | `tableViews.roster.columnFilters`・`sort` | 同上 | 同上 |
| `T-NEW-C1` | `05-07-design.md` Chapter 6.2 | 表の見え方の形 —— `ColumnFilter`（`column`: 列の行 ID の文字列・`hiddenValues`: 文字列の配列・`from`: 日付 / `null`・`to`: 日付 / `null`）、`ColumnSort`（`column`: 列の行 ID・`direction`: `'ascending'` / `'descending'`） | — | — |
| `UN-NEW-C1` | 表 T-027 | 対象 —— **表の見え方の変更**（`FR-151` の 表 T-353、`_assets/tbl-settings.md` の 表 T-203 の `S-NEW-C1`〜`S-NEW-C13`）。1 回の変更が 1 段（X-5）。⚠️ 語・窓の位置と大きさ・列の幅は対象外（保存しない） | — | — |
| `CM-NEW-C1` | 表 T-108 | 見せ方の群 ・ `setTableView` ・ — ・ 表 1 つの見え方（目・Hide の行・列のフィルタ・並べ替え）を置き換える ・ `FR-151` | — | — |
| `OP-NEW-C1` | 表 T-024a | 開いた文書の `tableViews` で目が入の表の窓を、最小化して出す（`JDG-1826`）。遅延診断レポートは 11 節の問い 1 | — | — |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）、および保存するもの・しないもの

| 旧 | 新 |
|---|---|
| `FR-151` の「⛔ パネルの表示・位置・大きさ・語・フィルタ・並べ替え・列の幅を文書に保存してはならない（MUST NOT） —— 画面の使い方であって文書の内容ではない（…`S-442`・`S-419`・`S-420`）。」 | 「⛔ パネルの表示・位置・大きさ・語・列の幅を文書に保存してはならない（MUST NOT） —— 画面の使い方であって文書の内容ではない（…`S-442`・`S-419`・`S-420`）。<br>⭐ 表の見え方（Visibility・目・列のフィルタ・並べ替え）は文書に保存すること（MUST）（`_assets/tbl-settings.md` の 表 T-203 の `S-NEW-C1`〜`S-NEW-C13`） —— フィルタを掛けた日程をそのまま人に渡すためである（利用者が定めた）。」 |
| `FR-151` の「⛔ 表ごとの Visibility と目の入切も文書に保存してはならない（MUST NOT）。<br>取り消しの記録にも載せない —— 受け取った人が、欠けた日程だと知らずに開くことが無い（…`S-494`・`S-495`）。」（`CR-722` の後の文） | 消す。代わりに「⭐ 表の見え方を変えたら未保存の編集（`FR-100`）であり、取り消しの 1 段（`FR-031` の 表 T-027 の `UN-NEW-C1`）である。<br>⚠️ 受け取った人は、開いた直後に赤い目と帯（`U-67`）で、フィルタを掛けた日程だと読める（`JDG-1826`）。」 |
| `FR-134` の「⛔ レポートと窓の状態（出ているか・位置・大きさ・語・フィルタ・並べ替え）を文書に書いてはならない（MUST NOT）」 | 「⛔ レポートと窓の状態（出ているか・位置・大きさ・語・列の幅）を文書に書いてはならない（MUST NOT） —— レポートの表の見え方（Visibility・目・列のフィルタ・並べ替え）は `FR-151` が保存させる」 |
| `FR-099` の ⛔（`CR-722` が足した「窓の状態（出ているか・位置・大きさ・語・列のフィルタ・並べ替え・列の幅・選択）を文書に書いてはならない」） | 「…（出ているか・位置・大きさ・語・列の幅・選択）…」—— 列のフィルタと並べ替えを外す |
| `TV-9` の「文書を置き換えたとき（開く・新規・取り込み）は、3 つの表の Visibility を捨て、目をすべて切る」 | 「文書を置き換えたとき（開く・新規・取り込み）は、置き換えた文書の表の見え方（表 T-203 の `S-NEW-C1`〜`S-NEW-C13`）を読み、目が入の表の窓を最小化して出す（表 T-024a の `OP-NEW-C1`）。<br>新規の文書はすべて既定（目なし・Hide なし・フィルタなし）」 |
| `TV-8` の「目が切れても Visibility の値は残る」 | 「目が切れても Visibility の値は残る —— 目が切れたことは表の見え方の変更である（`UN-NEW-C1`）」 |
| `SV-14` の「語・表の切り替え・フィルタ・並べ替え・列の幅・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す」 | 「語・表の切り替え・列の幅・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す。<br>列のフィルタと並べ替えは文書が持つ（`FR-151` の結び）」 |
| 表 T-206 の `S-494`・`S-495`・`S-NEW-B5`・`S-NEW-B6`（保存しない Visibility と目） | 退く（ID は使い直さない）。表 T-203 の `S-NEW-C1`〜`S-NEW-C13` へ |
| 表 T-206 の `S-420` の「語・出している表・列のフィルタ・並べ替え・列の幅」、`S-NEW-B4` の「…列のフィルタ・並べ替え…」 | 列のフィルタと並べ替えを外す |
| コード: `SearchPanelSession.visibility`・`filters.columns`・`sort`、`TableWindowSession` の同じ欄（画面の値） | 文書の `documentSettings.tableViews` から読み、`setTableView` で書く。`filters.open`・語・幅・位置は画面に残る |

**保存するか・取り消せるか・何で変わるか**（規則 01 の ⑧「状態を問うときはこの表で見せよ」）:

| 値 | 保存 | 取り消し | 何で変わるか |
|---|---|---|---|
| Visibility（行の表示 ／ 非表示） | する | できる（1 回 1 段） | 表示の列のチェック・見出しのまとめて・飛ぶ（`SJ-0`）・`AM-27` |
| 目（`IC-143`） | する | できる | `IC-143`・窓を閉じる（問い 2）・帯の「すべて表示に戻す」・飛ぶ（`SJ-0`、担当リスト）・`AM-27` |
| 列のフィルタ | する | できる | フィルタの印・すべて入れる／外す・いつから／いつまで・クリア |
| 並べ替え | する | できる | 昇順・降順・クリア |
| フィルタの中の検索欄の語・開いているフィルタ | しない | — | 打つ・閉じる |
| 窓の位置・大きさ・最小化・最大化・列の幅・字の段 | しない | — | 窓の操作 |
| 担当リストの選択（消す相手） | しない | — | `IC-63`〜`IC-68` |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
### E-01 —— `FR-151` の 2 つの ⛔

3 節の 2 行のとおり。`（MUST）` +2（保存すること・`TV-9` の読むこと —— 当てる体が数える）。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
### E-02 —— `FR-134`・`FR-099` の ⛔

3 節のとおり。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
### E-03 —— 表 T-353 の `TV-8`・`TV-9`、表 T-330 の `SV-14`

3 節のとおり。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
### E-04 —— 表 T-024a に `OP-NEW-C1`

```text
| OP-NEW-C1 | 表の見え方 | 開いた文書の 表 T-203 の `S-NEW-C1`・`S-NEW-C5`・`S-NEW-C9`（目）が真の表の窓を、最小化（`FR-036` の 表 T-335 の `WB-2`）で出し、その目と起動アイコンを赤で描く（`FR-151` の 表 T-353 の `TV-NEW-B1`）—— 開いた直後から、赤をたどればフィルタを外せる（利用者が定めた）。<br>検索パネルはタスクの表を出す。<br>遅延診断レポートの目が真のときは 11 節の問い 1 の答え（推奨: 遅延診断を始め、レポートの窓を最小化で出す。基準日が無く診断できないときは、レポートの目を偽にして開く —— 未保存の編集にしない）。<br>文書に無い `uid` と、表に無い列の行 ID は、読むときに捨てる（`OP-10` の `S-78` と同じ） |
```

⚠️ 表 T-024a の行の欄の並びは当てる体が今の行（`OP-10`）に合わせる。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
### E-05 —— 表 T-027 に `UN-NEW-C1`

2 節の行。並びは `UN-14`（タスクグループの木の状態）の後。

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md -->
### E-06 —— 表 T-108 に `CM-NEW-C1`

2 節の行（`CM-91` の後）。`AM-27`（`CR-722` の E-13）の末尾に「出すのは `setTableView`（表 T-108 の `CM-NEW-C1`）1 つであり、取り消しの 1 段・未保存の編集である」を足す。

<!-- EDIT id=E-07 file=docs/spec/_source/settings.json -->
### E-07 —— 表 T-203 に 13 行

2 節の `S-NEW-C1`〜`S-NEW-C13`。意味の欄の共通の注: 「⭐ 文書に保存する —— フィルタを掛けた日程をそのまま人に渡すためである（利用者が定めた。`FR-151`）。<br>変えれば未保存の編集で、取り消しの 1 段（表 T-027 の `UN-NEW-C1`）。<br>⚠️ 語・窓の位置と大きさ・列の幅は保存しない（表 T-206 の `S-420`・`S-419`）」。`hiddenTaskUids` の注に「文書に無い `uid` は読むときに捨てる（表 T-024a の `OP-NEW-C1`）。タスクを消したら、その `uid` も同じ命令の中で外す」。`hiddenResourceUids` の注に同じ形で担当（表 T-050 の `CD-5` の「一緒に消えるもの」に 1 句足す —— 当てる体）。

⚠️ 新しい行が `src` に届くには、`tools/generate_entity_types.py` の群に名が要ることがある（`CR-551`、`new-settings-rows-need-generator-group`）。当てる体は `src/entity/document-model/document-settings/document-settings.ts` の生成域に 13 鍵と既定が現れたことを確かめ、現れなければ群を足す。

<!-- EDIT id=E-08 file=docs/spec/_source/settings.json -->
### E-08 —— 表 T-206 の行

3 節のとおり（`S-494`・`S-495`・`S-NEW-B5`・`S-NEW-B6` を退け、`S-420`・`S-NEW-B4` を狭める）。退ける行は `retired.py` に足す（検査が退いた ID の再使用を拒む）。

<!-- EDIT id=E-09 file=docs/spec/05-07-design.md -->
### E-09 —— Chapter 6.2 に 表 `T-NEW-C1`

```text
**表 T-NEW-C1 — 表の見え方の形（`documentSettings.tableViews` の値）**

| 形 | 欄 | 値 | 意味 |
| --- | --- | --- | --- |
| `ColumnFilter` | `column` | 文字列 | 列の行 ID（`01-04-requirements.md` の 表 T-331 ・ 表 T-347 ・ 表 T-NEW-B2 の行） |
| `ColumnFilter` | `hiddenValues` | 文字列の配列 | 値の一覧で印を外した値の語（`SV-7`） |
| `ColumnFilter` | `from` | 日付 / `null` | 「いつから」 |
| `ColumnFilter` | `to` | 日付 / `null` | 「いつまで」 |
| `ColumnSort` | `column` | 文字列 | 列の行 ID |
| `ColumnSort` | `direction` | `'ascending'` / `'descending'` | 昇順 ／ 降順（`SV-8`） |
```

<!-- EDIT id=E-10 file=docs/spec/_source/erd_json_to_schema.py -->
### E-10 —— 生成器（X-3）と `erd.json`

- `settings_type`: 型の欄が「`Task.uid` の配列」「`Resource.uid` の配列」なら `items: {type: integer}`。型の欄が `ColumnFilter` の配列・`ColumnSort` / `null` なら、表 `T-NEW-C1` から作った `$defs` を `$ref` で指す。⛔ 形を生成器に直書きしない —— 表から読む。
- `erd.json` の `documentSettings` の箱に `tableViews` の行（オブジェクト、`S-NEW-C1`〜`S-NEW-C13`）を足す（図 F-010 が全体を 1 度ずつ置く —— 生成器が拒まないことを確かめる）。
- `npm run gen` が `grs-document.schema.json` を刷る（検査 17）。`x-grsChanges` は空のまま（`S-541` が `null`）。

<!-- EDIT id=E-11 file=tools/generate_startup_template.py -->
### E-11 —— 形式の版

`SCHEMA_VERSION` を当てる時刻（`YYYY-MM-DDTHH:MM:SSZ`、`FR-073`）に上げる。`npm run gen` が起動の雛形（`startup-template.json`・`empty-document.json`・`startup-template-manifest.json`）と `image-to-grs-json-prompt.json` を刷る。台帳（`grs-json-changes.json`）に行を足さない（検査 76 が両向きに守る）。

<!-- EDIT id=E-12 file=docs/guides/schedule-to-grs-json/grs-skeleton.json -->
### E-12 —— 案内と例

`grs-skeleton.json` の `documentSettings` に 13 鍵を既定で足し、版を上げる（検査 75）。`prompt-ja.md`・`prompt-en.md` は、AI が `documentSettings` を書かない（骨組みに任せる）なら変えない —— 当てる体が検査 75 で確かめる。`tests/fixtures/measuring-document.json` と `previous-project-result/38-project-progress/gr-scheduler-progress-2026-10-10.json` は版が古くなり開けなくなる —— 前者は試験の体が刷り直す。後者は利用者の進捗の頁の文書であり、調整役が刷り直すかを決める（10 節）。

<!-- EDIT id=E-13 file=docs/development-records/changelog.md -->
### E-13 —— 変更履歴に 1 行

---

## 5. 継ぎ目（コード）—— `CR-722` の後の名で書く

| ファイル | 変えるもの | 体 |
|---|---|---|
| `src/entity/document-model/document-settings/document-settings.ts`（生成域） | 13 鍵と既定（`npm run gen`）。手で書くのは生成域の外の型の別名だけ（`TableViews`） | A |
| `src/use-case/edit-document/`（`edit-document-settings.ts` か、表の見え方の新しい関数 —— 新しいファイルなら表 T-075 に行） | 命令 `setTableView(table, view)` を `applyDocumentChange` に。取り消しの 1 段（`UN-NEW-C1`）。タスク・担当を消す命令が `hiddenTaskUids`・`hiddenResourceUids` から同じ `uid` を外す（同じ段） | A |
| `src/adapter/document-codec/json-codec.ts` | 読むときに文書に無い `uid` と表に無い列の行 ID を捨てる（X-4）。書くときは 13 鍵をすべて書く | A |
| `src/adapter/agent-api-endpoint/agent-api-members.ts` | `showOnlyTasksThrough` を `setTableView` 1 つの書き込みに（X-9）。`readShownTasks` は文書から読む | A |
| `src/use-case/advance-screen-session/screen-values.ts` | `SearchPanelSession`・`TableWindowSession` から `visibility`・`filters.columns`・`sort` を外し、文書から読む読み手（`tableViewOf(settings, table)`）を置く。`filters.open` は画面に残る | A |
| `src/adapter/screen-renderer/search-panel.ts`・`table-window.ts`・`delay-diagnostics-report.ts`・`resource-roster.ts` | 見え方を `tableViewOf` から読み、変更を「画面の値を書き換える」から「`setTableView` を出す」へ | A |
| `src/framework/single-html-shell/frame-loop.ts` | 表の見え方の変更を文書の書き込み（`setTableView`）として流す。窓を閉じて目を切るのも書き込み（問い 2）。`SJ-0` の戻しを `SJ-2` と同じ 1 段に | B |
| `src/framework/single-html-shell/document-file-flow.ts` | 文書を置き換えたあと、目が真の表の窓を最小化で出す（`OP-NEW-C1`）。レポートは問い 1 | B |
| `src/framework/single-html-shell/shown-tasks-hold.ts` | 積の入力を文書の `tableViews` から読む（`drawnTaskUidsOf` の形は変えない） | B |

⭐ 体 A と体 B の継ぎ目の名（2 つの指示に逐語で書く）: `TableViews`・`tableViewOf`・`setTableView`・`CM-NEW-C1`（当てた番号）・`drawnTaskUidsOf`。

毎フレームの経路: **はい**（`shown-tasks-hold.ts` の入力が文書になる —— 文書が変わったときだけ作り直す）。`perf-pending.md` に 1 行（検査 66）。

### 5.1 既存の試験

- 形式の版と鍵の全数を引く試験: `SCHEMA_VERSION` を読む試験は 3 ファイル（`grep -rln SCHEMA_VERSION tests`）—— 版を定数から読むので赤くならない見込み。`documentSettings` の鍵を数える試験・`levelZeroTreeState` を持つ試験の文書（`tests/contract` 10・`tests/unit` 6・`tests/system` 1・`tests/fixtures` 1 ファイル）は、鍵の全数を主張していれば 13 鍵を足す。
- 「チェックは保存しない」「取り消しに載らない」を主張する試験（`CR-661` の試験 —— `CR-722` の後の名）: 付け替える。
- ⚠️ 形式の版を上げると、雛形から作らずに版を直書きした文書は拒まれる —— Playwright の実物の試験（`tests/system/`）をすべて走らせて確かめる（ロックの下、`GRS_DEV_PORT=5991`）。

---

## 6. グラフ（`945a244f` の上）

- `FR-151` を指すのは要求 15 件・70 か所、`FR-134` は 9 件・23 か所。`S-420` は要求 2 件・4 か所、`S-494` は 1 件・2 か所、`S-495` は 1 件・3 か所。`TV-8` 1 件・6 か所、`TV-9` は `FR-151` の中だけ。
- 新しく指す辺: `FR-151` → 表 T-203（`S-NEW-C*`）・表 T-027（`UN-NEW-C1`）、表 T-203 → 表 `T-NEW-C1`（Chapter 6.2）、表 T-024a（`OP-NEW-C1`）→ `FR-151`・`FR-036`。⚠️ `FR-151` ↔ 表 T-027（`FR-031`）は今 `TV-6` が `FR-100` を指す形で片向きに在り、本書で `UN-NEW-C1` → `FR-151` の逆向きが足される —— `UN-14` が `S-418`（`FR-018`）を指す形と同じ（取り消しの表は対象の要求を指し、対象の要求は取り消しの表を指す）。当てる体は `induced.py FR-151 FR-031 FR-100 T-203 T-027` で輪の成分を測る。
- `GRS JSON` の形（`grs-document.schema.json`）を読む生成器と検査: 検査 17（スキーマの生成）・検査 75（案内）・検査 76（台帳）。

---

## 7. 数（実測、`945a244f`）

- `documentSettings` の必須の鍵 30（`grs-document.schema.json` の `documentSettings.required`）→ 31（`tableViews` 1 つ。中の 13 は入れ子の必須）。
- 形式の版の直書き 10 ファイル（`grep -rl "2026-10-09T11:56:15Z"`）—— 生成物 5・案内 1・仕様の原稿 1・変更履歴 1・試験の文書 1・利用者の進捗の文書 1。
- 表 T-206 の保存しない行のうち本書が触る 6（`S-420`・`S-494`・`S-495`・`S-NEW-B4`〜`S-NEW-B6`）。

---

## 8. 波・持ち場・見積り

| 波 | 持ち場（重ならない） | 中身 | 体 | 見積り |
|---|---|---|---|---|
| W0 | 調整役 | 11 節の 2 問を利用者に問う。番号・版の時刻・変更履歴の版を渡す。`CR-722` が当たっていること | — | — |
| W1 | `docs/spec/**`（`01-04-requirements.md`・`05-07-design.md`・`_assets/tbl-glossary.md`・`_source/settings.json`・`_source/erd.json`・`_source/erd_json_to_schema.py`）・`tools/generate_startup_template.py`・`tools/generate_entity_types.py`・`docs/guides/schedule-to-grs-json/`・`changelog.md`・生成物 | E-01〜E-13、`npm run gen`、`npm run gen:check`、`strictdoc export docs/spec && rm -rf output`、`check.sh`（検査 17・75・76） | 仕様と生成器の体 1 つ | 3 時間 |
| W2a | 5 節の「体 A」（`src/entity/`・`src/use-case/`・`src/adapter/`） | 5 節 | 実装の体 A | 4 時間 |
| W2b | 5 節の「体 B」（`src/framework/`）・`perf-pending.md` | 5 節 | 実装の体 B | 2.5 時間 |
| W3 | `tests/`（`tests/fixtures/` の刷り直しを含む） | 5.1 の付け替え、9 節の仕様だけを読む試験、Playwright の全数（ロックの下で 1 回） | 試験の体 | 3.5 時間 |

- ⚠️ 形式の版を上げる波なので、W2 の合流の後に Playwright の全数を 1 回走らせる（`JDG-1773` の負荷の取り決め —— ロックの下で 1 回だけ）。
- 合わせて約 13 時間（体の時間）。

---

## 9. 仕様だけを読む試験の継ぎ目（試験の体に名指す名）

1. 往復（`S-NEW-C1`〜`S-NEW-C13`）: 検索の表で 2 行を Hide、担当リストで 1 人を Hide、ステータスの列を絞り、担当名で並べ替え、2 つの目を入れて保存する。開き直すと同じ見え方で、検索と担当リストの窓が最小化で出て、目と起動アイコンが赤（`OP-NEW-C1`）。
2. 未保存と取り消し（`UN-NEW-C1`）: 行を Hide にすると未保存の印が付き、取り消しで戻り、印が消える（`FR-100` の「取り消しで元の文書に戻ったら未保存の編集は無い」）。
3. 消した相手（X-4・E-07）: Hide にしたタスクを消すと `hiddenTaskUids` から外れ、取り消すと戻る。文書に無い `uid` を持つ `GRS JSON` を開くと、その `uid` を捨てて開ける。
4. 保存しないもの: 語・窓の位置・列の幅・担当リストの選択は、保存して開き直すと既定に戻る。
5. 形式（検査 17 の外の確かめ）: `exportJson` の `documentSettings.tableViews` が 13 鍵をすべて持ち、スキーマに通る。`Agent API` の `showOnlyTasks` の後、`readDocument` の `tableViews.search` が同じ値。
6. MSPDI（X-10）: 目を入れたまま MSPDI へ書き出しても、全部のタスクが出る。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 台帳（`x-grsChanges`）に行を足さない —— 運用の前（`S-541` が `null`）。古い版の文書は読み替えず拒む（`JDG-601`）。
- 窓の位置・大きさ・字の段・列の幅は保存しない（`JDG-1825`）。
- 合流（`FR-022`、`Difference Review`）で 2 つの文書の `tableViews` が違うときの取捨は足さない —— 今の合流が `documentSettings` をどう扱うか（どちらを採るか）のまま。当てる体は、合流が `documentSettings` の鍵を 1 つずつ問うなら 13 鍵が問いに出ないかを確かめ、出るなら調整役へ返す。
- `previous-project-result/38-project-progress/` の進捗の文書は、版が古くなり開けなくなる。刷り直すかは調整役が決める（本書は触れない）。

---

## 11. 利用者に問うこと

### 問い 1 —— 遅延診断レポートの目を入れたまま保存した文書を開いたら、遅延診断も始めますか？

⭐ **答えた（`JDG-1872`）** —— 案 A。診断を始め、レポートの窓を最小化で出す。基準日の無い文書ではレポートの目を切って開く（未保存の編集にしない）。`S-445` に、レポートの目が入っているときだけの例外を書く。

**使う場面**: 作成者が遅延診断を出し、レポートの窓で「伊藤さんの遅れているタスクだけ」が見えるように目を入れて保存し、ファイルを伊藤さんへ渡す。伊藤さんがそのファイルを開く。いまは、遅延診断の表示（進捗マーカーの診断の色）は文書に保存せず、開いた直後は出ていない。レポートの窓は診断を出しているあいだしか出ない（`RW-1`）。

| | 案 A（推奨）: 診断を始め、レポートの窓を最小化で出す | 案 B: レポートの目だけを切って開く | 案 C: 診断を始めず、レポートの絞りだけを効かせる |
|---|---|---|---|
| 伊藤さんが開いた直後の日程表 | 遅れているタスクだけ。診断のマーカーも出る | 全部（レポートの絞りが消える） | 遅れているタスクだけ。マーカーは出ない |
| 赤 | レポートの目と `IC-107` | 無い（ほかの表の目が入っていればその分） | `IC-107` が赤なのに、レポートの窓が出せない |
| 渡した意図（「ここだけがんばれ」） | 届く | 届かない | 届くが、どこでフィルタを掛けているかをたどれない |
| 基準日が無い文書 | 診断できないので、レポートの目を切って開く（未保存の編集にしない） | 同左 | 同左 |
| 代償 | 開くたびに診断が走る（大きな文書では開くのが少し遅れる）。診断の表示を保存しない決まり（`S-445`）に、レポートの目が入っているときだけの例外ができる | 渡した人の絞りの半分が消える | 窓と目と赤が食い違う（`JDG-1821` の「閉じた表は掛からない」に反する） |

**推奨: 案 A。** 利用者が保存を求めた理由（`JDG-1824`）は、フィルタを掛けた日程をそのまま渡すことである。レポートの目は診断の結果で絞るので、診断を走らせなければ絞れない。案 C は赤と窓が食い違い、赤をたどって外す道（`JDG-1813`）が切れる。

### 問い 2 —— 窓を閉じて目が切れたことを、文書の変更（未保存の印・取り消しの 1 段）に数えますか？

⭐ **答えた（`JDG-1873`）** —— 案 A、数える。未保存の編集（`FR-100`）で、取り消しの 1 段（目が入り、窓が最小化で戻る）。

**使う場面**: 担当リストの目を入れて絞り、保存した。そのあと担当リストの窓を × で閉じる —— 決まり（`JDG-1821`）により担当リストの目が切れ、日程表は全部に戻る。

| | 案 A（推奨）: 数える | 案 B: 数えない |
|---|---|---|
| 閉じた直後の未保存の印 | 付く | 付かない |
| 取り消し | 1 段で、目が入って窓が最小化で戻る | できない（窓を開いて目を入れ直す） |
| そのまま保存して開き直した | 目は切れている（画面と同じ） | 目は入っている（保存の値は変わっていない）—— 開くと担当リストの窓が最小化で出て赤 |
| 代償 | 窓を閉じただけで「保存しますか」の警告が出るようになる | 保存したファイルと、閉じたあとの画面が食い違う |

**推奨: 案 A。** 保存した値と画面が同じであることを守る（`FR-100` の「取り消しで元の文書に戻れば未保存は無い」の形もそのまま使える）。先例: 全体表示がタスクグループの木の状態を戻すのも取り消しの 1 段である（`UN-17`）。

---

## 12. 台帳（起草で動かしたもの・当てるときに動かすもの）

| 行 | 起草で（本コミット） | 当てたときの扱い |
|---|---|---|
| `DFC-2329` | 詳細状況の欄に「`CR-723` が当てる（起草）」を足した。状態は `仕様待ち` のまま | `実測待ち`（手順は下） |
| `JDG-1824`・`JDG-1825`・`JDG-1826` | 変えていない（任の外 —— 調整役が「指示 —— `CR-723` が当てる」へ動かす）。`JDG-1825` の後半（画像の帯を詰める）は `CR-721` | `適用済`。着地先は `FR-151`・表 T-203 の `S-NEW-C1`〜`S-NEW-C13`・表 T-024a の `OP-NEW-C1` |

利用者の実物での確かめ（当てた後、調整役が頼む）: ① 担当リストで 1 人を「非表示」にして目を入れ、検索の表のステータスの列を絞って保存する。② 新規で白紙にしてから、保存したファイルを開く —— 担当リストと検索の窓が最小化で出て、目と起動アイコンが赤、帯が出て、同じタスクだけが描かれる。③ 担当リストの行を「表示」に戻す —— 未保存の印が付く。`Ctrl` ＋ `Z` で戻り、印が消える。④ PNG を書き出す —— 帯の語が無い（`CR-721`）。

---

## 13. 測り方の再現

```
# the tree: worktree at 945a244f
git log --all --oneline | grep -E "CR-72[1-9]"          # 0
grep -n "文書に保存してはならない\|文書に書いてはならない" docs/spec/01-04-requirements.md   # FR-151 x2, FR-134
sed -n 619,700p docs/spec/_source/erd_json_to_schema.py   # settings_type: string arrays, numeric-field objects only
cat docs/spec/_source/grs-json-changes.json               # "changes": []
grep -n "SCHEMA_VERSION =" tools/generate_startup_template.py   # 2026-10-09T11:56:15Z
grep -rl "2026-10-09T11:56:15Z" . --include=*.json --include=*.ts --include=*.md --include=*.py   # 10
grep -rln "SCHEMA_VERSION" tests | wc -l                  # 3
grep -rl "levelZeroTreeState" tests                      # contract 10, unit 6, system 1, fixtures 1
python <scratch>/maxids.py                                # S 542, UN 19, CM 91, T 369
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-151 FR-134 S-420 S-494 S-495 TV-8
```
