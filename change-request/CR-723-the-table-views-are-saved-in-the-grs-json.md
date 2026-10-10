# CR-723 —— 表の見え方（表示の列・スケジュールフィルタ・列のフィルタ・並べ替え）を `GRS JSON` に保存し、変えれば未保存の編集として取り消せ、開けばスケジュールフィルタを掛けた表のウィンドウが最小化して出る

> 起草の状態: **波 1（仕様・生成器・形式の版）を当てた**（2026-10-11、作業木 `6195af6b` の上）。下書きは 2026-10-10 に `945a244f` の上で書き、`CR-724`〜`CR-726` の後に語を直した。当てる前に、`CR-722`（表ごとの表示の列とスケジュールフィルタ、4.29）・`CR-727`・`CR-728`・`CR-729`・`CR-730`（アメリカ式の綴り）が当たった木で数・行・ID・引いた旧文をすべて測り直し、本書を直した（X-12〜X-16）。波 2（実装）・波 3（仕様だけを読む試験）はまだである（8 節）。
> 利用者が 2026-10-11 に、`CR-731` より先に本書を当てると定めた（`JDG-1927`）。
> ID の帯: 番号 `CR-723`・変更履歴 `4.34`・裁定 `JDG-1927` を調整役から受けた。仮の名は、当てる直前（`6195af6b`）に測った木の、使われていた最も大きい番号の次を採った —— 設定値 `S-559` の次の `S-560`〜`S-572`、`UN-19` の次の `UN-20`、`CM-91` の次の `CM-92`、`OP-17` の次の `OP-18`、表 `T-371` の次の `T-372`。測り方は 13 節。`DFC`・`PND` の行は足さない。
> 当てる裁定: `JDG-1824`（`GRS JSON` の設定値に保存。MSPDI には書かない）・`JDG-1825` の前半（保存するのは表ごとの表示の列・スケジュールフィルタの入切・列のフィルタ・並べ替え。語・ウィンドウの位置・大きさ・字の段は保存しない）・`JDG-1826`（スケジュールフィルタを掛けた表のウィンドウは開いたときに最小化して出し、赤で示す）・`JDG-1872`（レポートなら診断を始める）・`JDG-1873`（ウィンドウを閉じての解除も編集）・`JDG-1927`（本書が先）。形式の変わりは `JDG-1673`〜`JDG-1678`（運用の前は台帳を空のまま）に従う。
> 覆す裁定（既に 覆された と記録済み）: `JDG-1380`（画面だけ —— `JDG-1824`）。
> 閉じるもの: `DFC-2329`（波 1 で `仕様待ち` → `実装待ち`。波 2 が着地したら実測待ちへ）。
> 本書の「目」は、表ごとのスケジュールフィルタの入口（`IC-143`）とその入切を指す略である（`CR-722` と同じ）。仕様には書かない。

### 仮の名 → 当てた番号

| 下書きの仮の名 | 当てた番号 | 置き場 |
|---|---|---|
| `S-NEW-C1` 〜 `S-NEW-C13` | `S-560` 〜 `S-572`（同じ順） | 表 T-203 |
| `UN-NEW-C1` | `UN-20` | 表 T-027 |
| `CM-NEW-C1` | `CM-92` | 表 T-108 |
| `T-NEW-C1` | 表 `T-372` | `_source/settings.json` の形の表（下書きは `05-07-design.md` —— X-13） |
| `OP-NEW-C1` | `OP-18` | 表 T-024a |
| （`CR-722` の下書きの名）`S-NEW-B4`・`S-NEW-B5`・`S-NEW-B6`・`T-NEW-B2`・`TV-NEW-B1` | `S-546`・`S-547`・`S-548`・`T-371`・`TV-12`（`CR-722` が当てた番号） | —— |

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（下書きは `945a244f`、当てる前に `6195af6b` で測り直した）

| 行の読み | 見たもの | 本書での扱い |
|---|---|---|
| `DFC-2329`: 表の表示状態とフィルタは文書に残らない | 正しい（`6195af6b`）。`FR-151` の「⛔ パネルの表示・位置・大きさ・語・フィルタ・並べ替え・列の幅を文書に保存してはならない（MUST NOT）」と「⛔ 表ごとの表示の列の値とスケジュールフィルタの入切も文書に保存してはならない（MUST NOT）」、`FR-134` の「⛔ レポートと窓の状態（…フィルタ・並べ替え）を文書に書いてはならない（MUST NOT）」、`FR-099` の「⛔ ウィンドウの状態（…列のフィルタ・並べ替え…）を文書に保存してはならない（MUST NOT）」。設定値は 表 T-206 の `S-420`・`S-494`・`S-495`・`S-546`・`S-547`・`S-548` | 保存するものだけを 表 T-203 へ移し、⛔ を狭める |
| 設定値の形は文字列の配列までしか作れない | 半分正しい。`erd_json_to_schema.py` の `settings_type` は型の欄からは文字列の配列しか作らないが、`settings.json` の行の `json`（`erd.json` の列と同じ形）は既に整数の配列を書ける。書けないのは、欄を持つ値（列のフィルタ）と、それを 3 つの表で 1 度だけ持つこと | 行の `json` で書き、形は形の表に 1 度だけ置く（X-3・X-13） |
| 形式の版を上げれば台帳に行が要る | 誤り。`S-541` は `null`、台帳（`grs-json-changes.json` の `changes`）は空 —— 検査 76 | 台帳に行を足さない。版だけを上げる |
| 版を上げると、今の版の文書は開けなくなる（下書きの 0.2・E-12・10 節） | **誤り**（`6195af6b` で測った —— 14.2）。版が古い文書は拒まず（`formatVersionReading` は新しい版だけを分ける）、欠けた `tableViews` は `OP-6` が既定で補う。`previous-project-result/38-project-progress/` の 10-10・10-10b・10-10c の 3 つは開ける。開けない 6 つ（10-04・10-08〜10-08d・`sample-schedule/Three-Year Product Plan.json`）は本書の前から開けない —— `CR-708` の改名（`wbsParentUid` → `parentTaskUid`）であり、本書の鍵の誤りは 0 件 | 進捗の文書は刷り直さない。本書の外の 6 つは 14.2 で調整役へ返す |

### 0.2 裁定の鎖（rulings.md を「保存」「文書に保存」「GRS JSON」「documentSettings」「未保存」「取り消し」「treeState」「画面だけ」「最小化して開く」「x-grsChanges」「SCHEMA_VERSION」で引いた。当てる前に「スケジュールフィルタ」「表示の列」「CR-723」で引き直した）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1380` | チェックと入切は画面だけ | 覆された（`JDG-1824`） |
| `JDG-596`（`CR-570`） | 行ごとの `treeState` を保存し取り消せる | 先例 —— 保存する画面の値は、変えれば未保存の編集で取り消しの 1 段 |
| `JDG-1868`（`CR-722`） | スケジュールフィルタを掛けても展開しない | 保つ（`TV-6`）。掛けたこと自体は本書で取り消しの 1 段になる |
| `JDG-1673`〜`JDG-1678` | 形式の版・台帳・運用の前 | 版を上げ、台帳は空のまま |
| `JDG-601`・`JDG-1663`・`JDG-1733` | 運用の前は古い形を読み替えない | 読み替えは足さない。欠けた鍵は今の `OP-6` が既定で補う（読み替えではない） |
| `JDG-1821` | ウィンドウを閉じればスケジュールフィルタが解除される | 保つ。解除は編集になる（`JDG-1873`） |
| `JDG-1872`・`JDG-1873` | 11 節の 2 問の答え | `OP-18`・`S-445`・`TV-8`・`UN-20` |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-004`（渡す）—— スケジュールフィルタを掛けた日程をファイルのまま人に渡せる（利用者の理由: 「お前のタスクだけフィルタしておいた。遅れているからここだけがんばれ」）。
- `GL-006`（横断の作法）—— 保存する画面の値は、変えれば未保存の編集で取り消せる、という今の作法（`treeState`・ピン止め）に表の見え方をそろえる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 保存する値の全数は 表 T-203 の行だけが持ち、`FR-151`・`FR-134`・`FR-099` は行を指す。3 つの表が同じ形の値を持つので、形は 表 T-372 に 1 度だけ置く（X-13）。
- `R1.4`（境界）—— 保存するもの（表示の列・スケジュールフィルタの入切・列のフィルタ・並べ替え）と、保存しないもの（語・ウィンドウの位置と大きさ・最小化と最大化・字の段・列の幅・担当リストの選択・開いているフィルタ）を表で分ける（3 節）。
- `R7.1`（往復）—— 保存して開き直すと同じ見え方に戻ることを試験の継ぎ目に置く（9 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 鍵は `documentSettings.tableViews` の下に表ごと（`searchPanel`・`delayDiagnosticsReport`・`resourceList`）に置き、`isScheduleFilterApplied`（目）・`hiddenTaskUids`（検索とレポート）／`hiddenResourceUids` と `isUnassignedHidden`（担当リスト）・`columnFilters`・`sort` とする。どの鍵も既定の値で書く（`FR-024` —— 見せ方の群は毎回すべて書く） | `CR-722` の `TableVisibility` の形をそのまま運ぶ。「非表示」の側だけを持つのは、初めがすべて「表示」で、外した行だけが値を持つから | 文書が 13 鍵ぶん太る（既定なら数百字） |
| X-2 | 列のフィルタは画面が持つ形のまま保存する —— 列の行 ID（例 `SQ-5`）・外した値の語（担当名の列なら名前、「（空白）」は空の文字列）・いつから・いつまで。担当の改名で外した名前が古くなっても、読み替えない | 今の `SearchColumnFilter` と同じ。Excel のフィルタも値で覚える | 改名した担当のフィルタは外れたように見える |
| X-3 | 機械の型は各行の `json` で書く（整数の配列は `{"kind": "array", "of": {"kind": "integer"}}`、列のフィルタと並べ替えは形の参照 `{"kind": "ref", "entity": "ColumnFilter"}`）。生成器は `frag_body` に `ref` を 1 つ足すだけで、型の欄を読み解く規則は増やさない | `S-65` ほかが既に `json` で機械の型を書いている（`CR-175`） | 無い |
| X-4 | 読むときに、文書に無い `Task.uid`・`Resource.uid` と、表に無い列の行 ID は、黙って捨てる。拒まない | `OP-10` が無いタスクグループを指す表示位置を拒まないのと同じ —— 見え方の値のために文書を開けなくしない | 捨てたことを告げない |
| X-5 | 変えたら未保存の編集（`FR-100`）で、取り消しの 1 段（`UN-20`）。1 回の変更の全数は `UN-20` が持つ。命令は 1 つ（`CM-92` `setTableView` —— 表 1 つの見え方を置き換える） | `CR-570` の `treeState` と同じ。命令を 1 つにするのは、`Agent API` の `applyCommands` が同じ 1 本で書けるように | フィルタの印を 10 回外せば 10 段 |
| X-6 | `SJ-0` で飛ぶために行を「表示」に戻した・スケジュールフィルタを解除したのは、`SJ-2` の展開と同じ 1 段に入れる（`UN-20`） | 1 回の飛びは 1 段 | 無い |
| X-7 | 文書を置き換えたとき（`TV-9`）は、置き換えた文書の値を読み、スケジュールフィルタを掛けた表のウィンドウを最小化で出して赤で描く（`OP-18`）。検索パネルはタスクの表を出す | `JDG-1826` | 開いた直後にウィンドウが最小化で並ぶ |
| X-8 | ウィンドウを閉じての解除も表の見え方の変更（`TV-8`・`UN-20`）。帯の「スケジュールフィルタを解除」は、すべての表の解除を合わせて 1 段 | `JDG-1873` | ウィンドウを閉じただけで未保存の印が付く |
| X-9 | `Agent API`: `readDocument` が返す文書に `tableViews` が載る。`applyCommands` で `setTableView` を出せる。`showOnlyTasks`（`AM-27`）は `setTableView` を 1 つ出す（取り消しの 1 段・未保存の編集） | `JDG-1387`（読めて変えられる）と `FR-100` の「`Agent API` の書き込みも数える」 | 無い |
| X-10 | MSPDI へは書かない。単一 html の書き出しは `GRS JSON` を埋めるので載る | `JDG-1824`。表 T-203 のほかの行と同じ | 無い |
| X-11 | 担当リストの選択（消す相手）・開いているフィルタ・フィルタの中の検索欄の語は保存しない | `JDG-1825`（保存するのは 4 つ） | 無い |
| X-12 | 鍵の名を下書きの `search`・`report`・`roster`・`isApplied` から、`searchPanel`・`delayDiagnosticsReport`・`resourceList`・`isScheduleFilterApplied` へ替えた | `CR-722` が表の名をウィンドウの名（`VisibilityTable`、`AM-26` が返す名）にそろえ、担当者名簿を担当リスト（`resourceList`）にした。スキーマだけを持つ書き手に「何を掛けているか」を名で言う（Chapter 6.2、`names-say-what-they-point-at`） | 鍵が長い |
| X-13 | 形の表 `T-372` は、下書きの `05-07-design.md` の Chapter 6.2 ではなく、`_source/settings.json` の新しい塊（`kind: "shape"`）に置き、`_assets/tbl-settings.md` へ刷る。生成器 `erd_json_to_schema.py` はそこから `$defs`（`ColumnFilter`・`ColumnSort`）を起こし、`generate_entity_types.py` は同じ `$defs` から型 `ColumnFilter`・`ColumnSort` を刷る。Chapter 6.2 にはその旨の 1 段だけを足した | Chapter 6.2 の「起こす原稿は 2 つとする（MUST）」「値をコピーした 3 つ目の原稿を作ってはならない（MUST NOT）」—— 設計書の表を生成器が読めば 3 つ目の原稿になる | `settings.schema.json` と `settings_json_to_md.py` にも手が入った |
| X-14 | `ColumnSort` の定義は `null` も取る（`DateTime` の定義と同じ形）。並べ替えていないことを `null` で書く | 読む側の歩き手（`grs-json-schema.ts`）は参照を解いて止まり、参照の横に `null` を足せず、`oneOf` も持たない | 定義そのものが `null` を許す |
| X-15 | `S-445`（遅延診断を出しているか —— 保存しない）に、`S-564` が真の文書を開いたときだけ診断を始める例外を書いた | `JDG-1872` の読み「`S-445` に、レポートの目が入っているときだけの例外ができる」 | 無い |
| X-16 | 図 F-010（`erd.json` の `documentSettings` の箱）は変えない —— 下書きは `tableViews` の行を足すとした | 箱の行の型の語（「配列」）は言語の辞書でない字として数が決まっており（検査 23 の除外 7）、足せば除外の数を上げることになる。弱い参照の規則は 表 T-203 の行と `CD-1`・`CD-5` が持つ | 図に `tableViews` が出ない |
| X-17 | 列のフィルタの日付の欄の名は `fromDate`・`toDate`（下書きと今の画面の値は `from`・`to`） | `erd.json` の `Exception` と同じ綴り。`'from'` の字が生成した検証器の中で取り込みの指定子に読まれ、検査 19・59 が赤くなった（14.3） | 画面の値の欄の名と違う —— 波 2 がそろえる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 保存しない ⛔ を狭める | `docs/spec/01-04-requirements.md` の `FR-151`（2 つの ⛔ と結び）、`FR-134` の ⛔、`FR-099` の ⛔ | E-01・E-02 |
| スケジュールフィルタの寿命 | 同 表 T-353 の `TV-6`・`TV-8`・`TV-9`、表 T-330 の `SV-14`、表 T-335 の `WB-6` | E-03 |
| 開くとき | 同 表 T-024a に `OP-18` | E-04 |
| 取り消し・消す連鎖 | 同 `FR-031` の 表 T-027 に `UN-20`、表 T-050 の `CD-1`・`CD-5` | E-05 |
| 命令 | `docs/spec/_assets/tbl-glossary.md` の 表 T-108 に `CM-92`、`AM-27` の結び、`IC-143` の指す行 | E-06 |
| 設定値 | `docs/spec/_source/settings.json`: 表 T-203 に `S-560`〜`S-572`、表 T-206 の `S-494`・`S-495`・`S-547`・`S-548` を退け、`S-420`・`S-546` を狭め、`S-445` に例外 | E-07・E-08 |
| 形の表と生成器 | `_source/settings.json` の 表 `T-372`、`_source/settings.schema.json`、`_source/settings_json_to_md.py`、`_source/erd_json_to_schema.py`、`tools/generate_entity_types.py`、`05-07-design.md` の Chapter 6.2 と 表 T-075 の `UF-198`、`_source/published-entries.json` の `TableVisibility` の注 | E-09・E-10 |
| 形式の版 | `tools/generate_startup_template.py` の `SCHEMA_VERSION` と、入れ子を 2 段以上読む `settings_defaults` | E-11 |
| 案内と例 | `docs/guides/schedule-to-grs-json/grs-skeleton.json`（検査 75） | E-12 |
| 変更履歴 | `docs/development-records/changelog.md` の 4.34 | E-13 |

数（下書きの予測 → 実測 —— 14.1）: 要求 ±0。表 +1（`T-372`）。表 T-203 の行 +13、表 T-206 の行 −4、表 T-027 の行 +1、表 T-108 の行 +1、表 T-024a の行 +1。`（MUST NOT）` −2 の予測 → −1。

---

## 2. 新しい識別子

| 番号 | 置き場 | 鍵 / 何 | 型 | 既定 |
|---|---|---|---|---|
| `S-560` | 表 T-203 | `tableViews.searchPanel.isScheduleFilterApplied` —— 検索の表のスケジュールフィルタ | 真偽 | `false` |
| `S-561` | 同 | `tableViews.searchPanel.hiddenTaskUids` —— 検索の表で「非表示」の行 | `Task.uid` の配列 | `[]` |
| `S-562` | 同 | `tableViews.searchPanel.columnFilters` —— 検索パネルの 2 つの表の列のフィルタ | `ColumnFilter` の配列 | `[]` |
| `S-563` | 同 | `tableViews.searchPanel.sort` | `ColumnSort` / `null` | `null` |
| `S-564`〜`S-567` | 同 | `tableViews.delayDiagnosticsReport.isScheduleFilterApplied`・`hiddenTaskUids`・`columnFilters`・`sort` | 同上 | 同上 |
| `S-568` | 同 | `tableViews.resourceList.isScheduleFilterApplied` | 真偽 | `false` |
| `S-569` | 同 | `tableViews.resourceList.hiddenResourceUids` | `Resource.uid` の配列 | `[]` |
| `S-570` | 同 | `tableViews.resourceList.isUnassignedHidden` —— （担当なし）の行が「非表示」か | 真偽 | `false` |
| `S-571`・`S-572` | 同 | `tableViews.resourceList.columnFilters`・`sort` | 同上 | 同上 |
| 表 `T-372` | `_source/settings.json`（`_assets/tbl-settings.md` へ刷る） | 表の見え方の値の形 —— `ColumnFilter`（`column`・`hiddenValues`・`fromDate`・`toDate`）、`ColumnSort`（`column`・`direction`） | — | — |
| `UN-20` | 表 T-027 | 対象 —— 表の見え方の変更。1 回の変更の全数 | — | — |
| `CM-92` | 表 T-108 | 見せ方の群 ・ `setTableView` ・ — ・ 表 1 つの見え方を置き換える ・ `FR-151` | — | — |
| `OP-18` | 表 T-024a | 置き換えて開いた `GRS JSON` の表の見え方を読み、スケジュールフィルタを掛けた表のウィンドウを最小化で出し、赤で描く。レポートなら診断を始める | — | — |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）、および保存するもの・しないもの

| 旧（`6195af6b` の仕様） | 新 |
|---|---|
| `FR-151` の「⛔ パネルの表示・位置・大きさ・語・フィルタ・並べ替え・列の幅を文書に保存してはならない（MUST NOT） —— 画面の使い方であって文書の内容ではない（…`S-442`・`S-419`・`S-420`）。」 | 「⛔ パネルの表示・位置・大きさ・語・列の幅を文書に保存してはならない（MUST NOT） —— …（同じ）。」 |
| `FR-151` の「⛔ 表ごとの表示の列の値とスケジュールフィルタの入切も文書に保存してはならない（MUST NOT）。<br>取り消しの記録にも載せない —— 受け取った人が、欠けた日程だと知らずに開くことが無い（…`S-494`・`S-495`・`S-547`・`S-548`）。」 | 「⭐ 3 つの表の見え方 —— 表示の列の値・スケジュールフィルタの入切・列のフィルタ・並べ替え —— は文書に保存すること（MUST）（表 T-203 の `S-560` 〜 `S-572`） —— スケジュールフィルタを掛けた日程を、そのまま人に渡すためである（利用者が定めた）。<br>表の見え方を変えたら未保存の編集（`FR-100`）であり、取り消しの 1 段である（表 T-027 の `UN-20`）。<br>⚠️ 受け取った人は、開いた直後に赤い入口と帯（`U-67`）で、スケジュールフィルタを掛けた日程だと読める（表 T-024a の `OP-18`）。」 |
| `FR-134` の「⛔ レポートと窓の状態（出ているか・位置・大きさ・語・フィルタ・並べ替え）を文書に書いてはならない（MUST NOT）」 | 「…（出ているか・位置・大きさ・語・列の幅）…」＋「⚠️ レポートの表の見え方は保存する —— `FR-151`（表 T-203 の `S-564` 〜 `S-567`）。」 |
| `FR-099` の「⛔ ウィンドウの状態（出ているか・位置・大きさ・語・列のフィルタ・並べ替え・列の幅・選択）を文書に保存してはならない（MUST NOT）」 | 「…（出ているか・位置・大きさ・語・列の幅・選択）…」＋「⚠️ 保存する側の値は `FR-151` が持つ —— 担当リストの表は 表 T-203 の `S-568` 〜 `S-572`。」 |
| `TV-6` の「`treeState` を変えず、未保存の編集にも取り消しの段にもならない（利用者が定めた）」 | 「`treeState` を変えない（利用者が定めた）。<br>掛けたことは `UN-20` の 1 段である」。結びの「1 回の戻し…を 1 段とする」は「…を、表示の列の値の変更（`UN-20`）と合わせて 1 段とする」 |
| `TV-8` の結び「解除しても表示の列の値は残る（利用者が定めた）」 | そのまま保ち、「⭐ どの解除も表の見え方の変更であり、未保存の編集で取り消しの 1 段である —— ウィンドウを閉じて解除したときも同じで、取り消すとスケジュールフィルタが掛かり、ウィンドウが最小化（`WB-2`）で戻る（利用者が定めた）。<br>帯の「スケジュールフィルタを解除」は、すべての表の解除を合わせて 1 段とする」を足す |
| `TV-9` の項目「捨てる」と「文書を置き換えたとき（開く・新規・取り込み）は、3 つの表の表示の列の値を捨て、すべての表のスケジュールフィルタを解除する」 | 項目「文書を置き換えたとき」、「…置き換えた文書が持つ 3 つの表の見え方（表 T-203 の `S-560` 〜 `S-572`）に替え、スケジュールフィルタを掛けている表のウィンドウを出す（表 T-024a の `OP-18`）。<br>見え方を持たない文書（新規・MSPDI）は既定 —— …」 |
| `SV-14` の「語・表の切り替え・フィルタ・並べ替え・列の幅・位置・大きさは、同じ画面のあいだ覚え…」「表示の列の値（`SQ-10`）は、語やフィルタと同じく同じ画面のあいだ覚える」 | 「語・表の切り替え・列の幅・位置・大きさは、同じ画面のあいだ覚え…」「表示の列の値（`SQ-10`）・列のフィルタ・並べ替えは、閉じても残る —— 文書が持つ（…`S-560` 〜 `S-563`）」 |
| `WB-6`（状態を保存しない、開くたびに `WB-1` から） | 保ち、「⚠️ 文書を開いたときにスケジュールフィルタのために出すウィンドウ（`OP-18`）は、`WB-2` から始める」を足す |
| 表 T-206 の `S-494`・`S-495`・`S-547`・`S-548`（保存しない表示の列とスケジュールフィルタ） | 退く（ID は使い直さない）。表 T-203 の `S-560`〜`S-572` へ |
| 表 T-206 の `S-420`「検索パネルの語・出している表・列のフィルタ・並べ替え・列の幅」、`S-546`「…語・列のフィルタ・並べ替え・列の幅・選択」 | 列のフィルタと並べ替えを外し、注に「⚠️ 列のフィルタと並べ替えは文書に保存する（表 T-203 の …）」 |
| 表 T-075 の `UF-198`「3 つの表の表示の列とスケジュールフィルタ（`S-494`・`S-495`・`S-547`・`S-548`）から…」「文書を置き換えたら値を捨ててスケジュールフィルタを解除し（`TV-9`）」 | 「文書が持つ 3 つの表の表示の列とスケジュールフィルタ（表 T-203 の `S-560`・`S-561`・`S-564`・`S-565`・`S-568` 〜 `S-570`）から…」「文書を置き換えたら置き換えた文書の値に替え（`TV-9`）」 |
| 表 T-109 の `IC-143` の「（`S-495`・`S-547`・`S-548`）」 | 「（表 T-203 の `S-560`・`S-564`・`S-568`）」 |
| コード: `SearchPanelSession.visibility`・`filters.columns`・`sort`、レポートと担当リストのウィンドウの同じ欄（画面の値） | 文書の `documentSettings.tableViews` から読み、`setTableView` で書く。`filters.open`・語・幅・位置は画面に残る（波 2） |

**保存するか・取り消せるか・何で変わるか**（規則 01 の ⑧「状態を問うときはこの表で見せよ」）:

| 値 | 保存 | 取り消し | 何で変わるか |
|---|---|---|---|
| 表示の列（行の「表示」／「非表示」） | する | できる（1 回 1 段） | 表示の列のチェック・見出しのまとめて・飛ぶ（`SJ-0`）・`AM-27` |
| スケジュールフィルタ（`IC-143`） | する | できる | `IC-143`・ウィンドウを閉じる（`JDG-1873`）・帯の「スケジュールフィルタを解除」・飛ぶ（`SJ-0`、担当リスト）・`AM-27` |
| 列のフィルタ | する | できる | フィルタの印・`IC-125`・`IC-126`・いつから／いつまで・`IC-153` |
| 並べ替え | する | できる | 昇順・降順・`IC-153` |
| フィルタの中の検索欄の語・開いているフィルタ | しない | — | 打つ・閉じる |
| ウィンドウの位置・大きさ・最小化・最大化・列の幅・字の段 | しない | — | ウィンドウの操作 |
| 担当リストの選択（消す相手） | しない | — | `IC-63`〜`IC-68` |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
### E-01 —— `FR-151` の 2 つの ⛔

3 節の 2 行のとおり。`（MUST）` +1、`（MUST NOT）` −1。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
### E-02 —— `FR-134`・`FR-099` の ⛔

3 節のとおり。`（MUST）`・`（MUST NOT）` ±0（⚠️ の段は `FR-151` を指すだけで、自ら課さない）。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
### E-03 —— 表 T-353 の `TV-6`・`TV-8`・`TV-9`、表 T-330 の `SV-14`、表 T-335 の `WB-6`

3 節のとおり。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
### E-04 —— 表 T-024a に `OP-18`（`OP-6` の後、`OP-7` の前）

```text
| OP-18 | 表の見え方 | **置き換えを選んで** `GRS JSON` を読んだときは、文書が持つ 3 つの表の見え方（`_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`、規則は `FR-151` の 表 T-353）に替えること（MUST）。<br>スケジュールフィルタを掛けている表（`S-560`・`S-564`・`S-568` が真）のウィンドウを、最小化（`FR-036` の 表 T-335 の `WB-2`）で出し、その表の `IC-143` と起動アイコンを赤で描くこと（MUST）（表 T-353 の `TV-12`） —— 開いた直後から、赤をたどればスケジュールフィルタを解除できる（利用者が定めた）。<br>検索パネルはタスクの表を出す。<br>⭐ 遅延診断レポートの表のスケジュールフィルタを掛けている文書では、遅延診断を始め（`FR-130`）、レポートの窓を最小化で出す —— レポートの表は診断の結果で絞るので、診断しなければ絞れない（利用者が定めた）。<br>基準日（`FR-046`）が無く診断できないときは、レポートの表のスケジュールフィルタを解除して開く —— 未保存の編集にしない。<br>⭐ 文書に無い `uid`（`S-561`・`S-565`・`S-569`）と、表に無い列の行 ID（表 T-372 の `column`）は、読むときに黙って捨てる —— 拒まない（`OP-10` が無いタスクグループを指す表示位置を拒まないのと同じ）。<br>⚠️ 開いたことは未保存の編集ではない —— 文書が持つ値を読んだだけである |
```

`（MUST）` +2。

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
### E-05 —— 表 T-027 に `UN-20`（`UN-14` の後）、表 T-050 の `CD-1`・`CD-5`

```text
| UN-20 | 対象 | **表の見え方の変更** —— `FR-151` が文書に保存させる値（`_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`）。<br>1 回の変更を 1 段とする —— 行の「表示」／「非表示」の 1 回（見出しのまとめての入れ外しを含む）・スケジュールフィルタを掛ける・解除する（ウィンドウを閉じての解除と、帯の「スケジュールフィルタを解除」を含む —— `TV-8`）・列のフィルタの 1 回（値の印 1 つ・`IC-125`・`IC-126`・いつから・いつまで）・並べ替えの 1 回・`IC-153`。<br>⭐ 飛ぶ（`SJ-0`）ために行を「表示」に戻したこと・スケジュールフィルタを解除したことは、`SJ-2` の展開と同じ 1 段に入れる。<br>⚠️ 語・ウィンドウの位置と大きさ・最小化と最大化・列の幅・開いているフィルタは対象外 —— 文書に保存しない（`FR-151`） |
```

`CD-1` の「一緒に消えるもの」の末尾に「、表の見え方でその `Task` を「非表示」とする値（`_assets/tbl-settings.md` の `S-561`・`S-565`）」を、`CD-5` の行の末尾に「<br>表の見え方でその担当を「非表示」とする値（`S-569`）も消える」を足す（`CD-5` の頭の文は試験が逐語で引くので動かさない —— 検査 42）（`TV-2` の「タスクか担当が文書から消えたら、その行の値も捨てる」を、消す命令と同じ 1 段にする）。

<!-- EDIT id=E-06 file=docs/spec/_assets/tbl-glossary.md -->
### E-06 —— 表 T-108 に `CM-92`、`AM-27`・`IC-143`

```text
| CM-92 | 見せ方の群 | `setTableView` | — | 表 1 つの見え方（表示の列の値・スケジュールフィルタの入切・列のフィルタ・並べ替え —— `_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`）を置き換える | `FR-151` |
```

`AM-27` の結びに「出す命令は `setTableView`（表 T-108 の `CM-92`）1 つであり、未保存の編集（`FR-100`）で取り消しの 1 段である（`FR-031` の 表 T-027 の `UN-20`）」を足す。`IC-143` の指す行は 3 節のとおり。

<!-- EDIT id=E-07 file=docs/spec/_source/settings.json -->
### E-07 —— 表 T-203 に 13 行

2 節の `S-560`〜`S-572`。`S-560` の注は、保存する理由と取り消せることを `FR-151` へ指し、開いた文書で真ならウィンドウを最小化で出すこと（`OP-18`）と、保存しないものが 表 T-206 の行であることを持つ。ほかの行は「`S-560` と同じ」と指す。`hiddenTaskUids` の注は「文書に無い `uid` は読むときに捨てる（`OP-18`）」—— 消したときの扱いは `CD-1`・`CD-5` だけが持つ（検査 11 が同じ文の 2 か所を拒んだ）。

⚠️ 生成器 `erd_json_to_schema.py` は、注に「保存しない」を含む行を保存しない鍵として飛ばす（`document_settings`）。13 行の注は「保存しない」を含まない —— 保存しないものは「表 T-206 の行である」と書いた。

⚠️ 新しい行が `src` に届くかを確かめた: `document-settings.ts` の生成域に 13 鍵と既定が現れた（`DocumentSettings` の `tableViews`、`SETTINGS_DEFAULTS` の 13 行）。`generate_entity_types.py` の群（`NOT_STORED_*`）は保存しない値のためのものであり、本書の行には要らない。

<!-- EDIT id=E-08 file=docs/spec/_source/settings.json -->
### E-08 —— 表 T-206 の行

3 節のとおり（`S-494`・`S-495`・`S-547`・`S-548` を退け、`S-420`・`S-546` を狭め、`S-445` に例外 —— X-15）。⚠️ 下書きは退ける行を `retired.py` に足すとしたが、足さない —— `retired.py` は「何かがまだ名指す」退いた ID だけを持つ（同ファイルの頭の注）。退いた 4 つを名指すのは `src` と `tests` の注と試験の名であり、波 2・波 3 が付け替える。付け替えの後も名指しが残るなら、そのとき足す。

<!-- EDIT id=E-09 file=docs/spec/_source/settings.json -->
### E-09 —— 表 `T-372`（X-13）

`_source/settings.json` に形の塊（`kind: "shape"`）を 1 つ足し、表 T-203 の後の散文の段の後に刷る。前に 1 段の散文「表の見え方の値が持つ欄は 表 T-372 が持つ…」を置く。

```text
**表 T-372 — 表の見え方の値の形（表 T-203 の `S-562`・`S-563` ほか）**

| 形 | 欄 | 値 | 意味 |
| --- | --- | --- | --- |
| `ColumnFilter` | `column` | 文字列 | 列の行 ID —— 表 T-331・表 T-347・表 T-371 の行（例 `SQ-5`） |
| `ColumnFilter` | `hiddenValues` | 文字列の配列 | 値の一覧で印を外した値の語（`SV-7`）。担当名の列では担当の名前、「（空白）」は空の文字列。改名しても読み替えない |
| `ColumnFilter` | `fromDate` | 日付 / `null` | 「いつから」。日付の列だけが置く |
| `ColumnFilter` | `toDate` | 日付 / `null` | 「いつまで」 |
| `ColumnSort` | `column` | 文字列 | 並べ替える列の行 ID。値の全体が `null` なら並べ替えていない（`SV-8`） |
| `ColumnSort` | `direction` | `'ascending'` / `'descending'` | 昇順 ／ 降順（`SV-8`） |
```

`05-07-design.md` の Chapter 6.2 には、形も見せ方の群の原稿が 1 度だけ持ち、`$defs` はそこから起こす、という 1 段を足した（`（MUST）` ±0）。

<!-- EDIT id=E-10 file=docs/spec/_source/erd_json_to_schema.py -->
### E-10 —— 生成器と `erd.json`

- `settings.schema.json`: 塊の種類に `shape` を足し、形の塊の形を定める（`fields` の各行が `shape`・`name`・`type`・`note`・`json` を持つ。`nullable` が `null` も取る形を名指す）。
- `settings_json_to_md.py`: 形の塊を表として刷る（行は `fields`、`json` は刷らない）。
- `erd_json_to_schema.py`: `TABLE_GROUP` に `T-372` を `shape` の群として分類し、`shape_defs` が形の塊から `$defs` を起こす（日付の欄は `$defs/DateTime` を指す）。`frag_body` に `ref` を足す（`null` を横に足すことは拒む —— X-14）。
- `generate_entity_types.py`: `$ref` の鍵を型の名（`null` を取る定義なら `| null`）で刷り、`documentSettings` が指す形ごとに `interface ColumnFilter`・`interface ColumnSort` を刷る。
- `erd.json` は変えない（X-16）。`published-entries.json` の `TableVisibility` の注が指す行を `S-560` ほかへ替えた（検査 7）。
- `npm run gen` が `grs-document.schema.json`（`documentSettings` の必須の鍵 30 → 31、定義 21 → 23）と `grs-json-schema.ts` を刷る（検査 17）。`x-grsChanges` は空のまま。

<!-- EDIT id=E-11 file=tools/generate_startup_template.py -->
### E-11 —— 形式の版

`SCHEMA_VERSION` を `2026-10-09T11:56:15Z` から `2026-10-10T17:02:00Z`（当てた時刻、`FR-073`）へ上げた。`settings_defaults` は点の入った鍵を 1 段しか入れ子にしなかった（`partition('.')`）ので、2 段以上を読むようにした —— `tableViews.searchPanel.sort` が `tableViews` の下の `searchPanel.sort` という鍵になっていた。`npm run gen` が起動の雛形・空の文書・雛形の目録・画像からのプロンプト・`tests/fixtures/measuring-document.json` を刷った。台帳（`grs-json-changes.json`）に行を足さない（検査 76）。

<!-- EDIT id=E-12 file=docs/guides/schedule-to-grs-json/grs-skeleton.json -->
### E-12 —— 案内と例

`grs-skeleton.json` の `documentSettings` に `tableViews`（13 鍵、既定）を `stackDirection` の後に足し、版を上げた（検査 75）。`prompt-ja.md`・`prompt-en.md` は `documentSettings` を変えずに写させる（38 行）ので変えない。⚠️ 下書きの「進捗の文書は版が古くなり開けなくなる」は誤りだった（0.1、14.2）。

<!-- EDIT id=E-13 file=docs/development-records/changelog.md -->
### E-13 —— 変更履歴に 1 行（4.34）

---

## 5. 継ぎ目（コード、波 2）—— 名は 2 つの指示に逐語で書く

| ファイル | 変えるもの | 体 |
|---|---|---|
| `src/entity/document-model/document-settings/document-settings.ts` | 生成域は波 1 で済んだ（`DocumentSettings.tableViews`・`ColumnFilter`・`ColumnSort`・`SETTINGS_DEFAULTS` の 13 行）。生成域の外に型の別名 `TableViews`（`= DocumentSettings['tableViews']`）を置く | A |
| `src/use-case/advance-screen-session/screen-values.ts` | `TableView`（`{ visibility: TableVisibility; columnFilters: readonly ColumnFilter[]; sort: ColumnSort \| null }`）と読み手 `tableViewOf(settings: DocumentSettings, table: VisibilityTable): TableView` を置く。`SearchPanelSession`・レポートと担当リストのウィンドウから `visibility`・`filters.columns`・`sort` を外す。`filters.open`・語・幅・位置は画面に残る。`SearchColumnFilter`・`SearchSort` は `ColumnFilter`・`ColumnSort` に置き換える | A |
| `src/use-case/edit-document/edit-document-settings.ts` | 命令 `{ kind: 'setTableView'; table: VisibilityTable; view: TableView }`（`CM-92`）。取り消しの 1 段（`UN-20`）。`TableView` を文書の形（`hiddenTaskUids` ／ `hiddenResourceUids` と `isUnassignedHidden`）へ移す。`edit-task.ts`・`edit-resource.ts` の消す命令は、同じ `uid` を `hiddenTaskUids` ／ `hiddenResourceUids` から外す（`CD-1`・`CD-5`、同じ段） | A |
| `src/adapter/document-codec/json-codec.ts` | 読むときに文書に無い `uid` と表に無い列の行 ID を捨てる（`OP-18`）。書くときは 13 鍵をすべて書く | A |
| `src/adapter/agent-api-endpoint/agent-api-members.ts` | `showOnlyTasksThrough` を `setTableView` 1 つの書き込みに（`AM-27`）。`SearchTableVisibility`・`readSearchVisibility`・`holdShownTasks` は文書の値に替わる | A |
| `src/adapter/screen-renderer/search-panel.ts`・`table-window.ts`・`search-table-filters.ts`・`delay-diagnostics-report.ts`・`resource-list.ts` | 見え方を `tableViewOf` から読み、変更を「画面の値を書き換える」から「`setTableView` を出す」へ | A |
| `src/framework/single-html-shell/frame-loop.ts` | 表の見え方の変更を文書の書き込み（`setTableView`）として流す。ウィンドウを閉じての解除も書き込み（`TV-8`）。`SJ-0` の戻しを `SJ-2` と同じ 1 段に（`UN-20`） | B |
| `src/framework/single-html-shell/document-file-flow.ts` | 文書を置き換えたあと、スケジュールフィルタが真の表のウィンドウを最小化で出す。レポートなら診断を始め、基準日が無ければ解除して開く（`OP-18`） | B |
| `src/framework/single-html-shell/shown-tasks-hold.ts` | 積の入力を `tableViewOf(settings, table).visibility` から読む（`drawnTaskUidsOf` の形は変えない）。`HeldTableWindows` から見え方を外す | B |
| `src/framework/single-html-shell/delay-diagnostics-report-window.ts`・`resource-list-window.ts` | 閉じての解除を `setTableView` で出す（`TV-8`） | B |

⭐ 体 A と体 B の継ぎ目の名（2 つの指示に逐語で書く）: `TableViews`・`TableView`・`tableViewOf`・`setTableView`（`CM-92`）・`VisibilityTable`・`ColumnFilter`・`ColumnSort`・`drawnTaskUidsOf`。

毎フレームの経路: **はい**（`shown-tasks-hold.ts` の入力が文書になる —— 文書が変わったときだけ作り直す）。波 2 が `perf-pending.md` に行 169・170 を足す（検査 66）。波 1 は毎フレームの経路に触れていない。

### 5.1 既存の試験

- `SCHEMA_VERSION` を引く試験は版を定数から読む。`tests/fixtures/measuring-document.json` は生成で刷り直した（波 1）。
- 退いた `S-494`・`S-495`・`S-547`・`S-548` を名指す試験: `tests/contract/cr-722-tv-5-tv-8-dt-8-each-table-holds-its-own-visibility.contract.test.ts`（1 行目・38 行目）。「保存しない」「取り消しに載らない」「文書を置き換えたら捨てる」を主張する試験は波 3 が付け替える。
- ⚠️ 形式の版を上げたので、Playwright の実物の試験（`tests/system/`）を波 2 の合流の後に 1 度だけ全数走らせる（ロックの下、`GRS_DEV_PORT=5991`）。

---

## 6. グラフ（下書きは `945a244f`。当てた木は 14.3）

- `FR-151` を指すのは要求 15 件・70 か所、`FR-134` は 9 件・23 か所（`945a244f`）。
- 新しく指す辺: `FR-151` → 表 T-203（`S-560`〜`S-572`）・表 T-027（`UN-20`）・表 T-024a（`OP-18`）、表 T-203 → 表 `T-372`、表 T-024a（`OP-18`）→ `FR-151`・`FR-036`・`FR-130`・`FR-046`、表 T-027（`UN-20`）→ `FR-151`。⚠️ `FR-151` ↔ 表 T-027（`FR-031`）は `UN-14` が `S-418`（`FR-018`）を指す形と同じ。
- `GRS JSON` の形（`grs-document.schema.json`）を読む生成器と検査: 検査 17（スキーマの生成）・検査 75（案内）・検査 76（台帳）。

---

## 7. 数（下書きは `945a244f`。当てた数は 14.1）

- `documentSettings` の必須の鍵 30 → 31（`tableViews` 1 つ。中の 13 は入れ子の必須）。
- 形式の版の直書き（`grep -rl "2026-10-09T11:56:15Z"`）は `6195af6b` で 14 ファイル —— 生成物 4・`dist/index.html` 1・案内 1・仕様の原稿（スキーマ）1・生成器 1・変更履歴 1・本書 1・試験の文書 1・利用者の進捗の文書 3。進捗の文書 3 つと変更履歴の古い行と `dist` は書き換えない。

---

## 8. 波・持ち場・見積り

| 波 | 持ち場（重ならない） | 中身 | 体 | 見積り |
|---|---|---|---|---|
| W0 | 調整役 | 11 節の 2 問（答えた —— `JDG-1872`・`JDG-1873`）。番号・版の時刻・変更履歴の版を渡す | — | 済 |
| W1 | `docs/spec/**`・`tools/generate_startup_template.py`・`tools/generate_entity_types.py`・`docs/guides/schedule-to-grs-json/`・台帳（`changelog.md`・`rulings.md`・`defects.md`）・生成物 | E-01〜E-13、`npm run gen`、`npm run gen:check`、`strictdoc export docs/spec && rm -rf output`、`check.sh` | 仕様と生成器の体 1 つ | 済（14 節） |
| W2a | 5 節の「体 A」（`src/entity/`・`src/use-case/`・`src/adapter/`） | 5 節 | 実装の体 A | 4 時間 |
| W2b | 5 節の「体 B」（`src/framework/`）・`perf-pending.md` | 5 節 | 実装の体 B | 2.5 時間 |
| W3 | `tests/` | 5.1 の付け替え、9 節の仕様だけを読む試験、Playwright の全数（ロックの下で 1 回） | 試験の体 | 3.5 時間 |

- ⚠️ 形式の版を上げる波なので、W2 の合流の後に Playwright の全数を 1 回走らせる（`JDG-1773` の負荷の取り決め —— ロックの下で 1 回だけ）。

---

## 9. 仕様だけを読む試験の継ぎ目（試験の体に名指す名）

1. 往復（`S-560`〜`S-572`）: 検索の表で 2 行を「非表示」、担当リストで 1 人を「非表示」、ステータスの列（`SQ-5`）を絞り、担当名で並べ替え、2 つの表のスケジュールフィルタを掛けて保存する。開き直すと同じ見え方で、検索パネルと担当リストのウィンドウが最小化で出て、`IC-143` と起動アイコンが赤（`OP-18`・`TV-12`）。
2. 未保存と取り消し（`UN-20`）: 行を「非表示」にすると未保存の印が付き、取り消しで戻り、印が消える（`FR-100` の「取り消しで元の文書に戻ったら未保存の編集は無い」）。ウィンドウを × で閉じて解除すると印が付き、取り消すとスケジュールフィルタが掛かり、ウィンドウが最小化で戻る（`TV-8`）。
3. 消した相手（`CD-1`・`CD-5`・`OP-18`）: 「非表示」にしたタスクを消すと `hiddenTaskUids` から外れ、取り消すと戻る。文書に無い `uid` と表に無い列の行 ID を持つ `GRS JSON` を開くと、それを捨てて開ける。
4. 遅延診断（`OP-18`・`S-445`・`S-564`）: レポートの表のスケジュールフィルタを掛けて保存した文書を開くと診断が始まり、レポートの窓が最小化で出る。基準日の無い文書では解除して開き、未保存の印は付かない。
5. 保存しないもの: 語・ウィンドウの位置・列の幅・担当リストの選択は、保存して開き直すと既定に戻る。
6. 形式（検査 17 の外の確かめ）: `exportJson` の `documentSettings.tableViews` が 3 つの表・13 鍵をすべて持ち、スキーマ（`$defs/ColumnFilter`・`$defs/ColumnSort`）に通る。`Agent API` の `showOnlyTasks` の後、`readDocument` の `tableViews.searchPanel` が同じ値。
7. MSPDI（X-10）: スケジュールフィルタを掛けたまま MSPDI へ書き出しても、全部のタスクが出る。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 台帳（`x-grsChanges`）に行を足さない —— 運用の前（`S-541` が `null`）。古い形の文書の読み替えは足さない（`JDG-1663`・`JDG-1733`）。欠けた `tableViews` は今の `OP-6` が既定で補う。
- ウィンドウの位置・大きさ・字の段・列の幅は保存しない（`JDG-1825`）。
- 合流（`FR-022`、`Difference Review`）で 2 つの文書の `tableViews` が違うときの取捨は足さない —— 今の合流が `documentSettings` をどう扱うかのまま。波 2 は、合流が `documentSettings` の鍵を 1 つずつ問うなら 13 鍵が問いに出ないかを確かめ、出るなら調整役へ返す。
- `previous-project-result/38-project-progress/` の進捗の文書は刷り直さない（開ける —— 14.2）。

---

## 11. 利用者に問うたこと（答えた）

### 問い 1 —— 遅延診断レポートの目を入れたまま保存した文書を開いたら、遅延診断も始めますか？

⭐ **答えた（`JDG-1872`）** —— 案 A。診断を始め、レポートの窓を最小化で出す。基準日の無い文書ではレポートのスケジュールフィルタを解除して開く（未保存の編集にしない）。`S-445` に、レポートのスケジュールフィルタが掛かっているときだけの例外を書く。→ `OP-18`・`S-445`（X-15）。

**使う場面**: 作成者が遅延診断を出し、レポートの窓で「伊藤さんの遅れているタスクだけ」が見えるようにスケジュールフィルタを掛けて保存し、ファイルを伊藤さんへ渡す。伊藤さんがそのファイルを開く。

| | 案 A（推奨）: 診断を始め、レポートの窓を最小化で出す | 案 B: レポートの目だけを切って開く | 案 C: 診断を始めず、レポートの絞りだけを効かせる |
|---|---|---|---|
| 伊藤さんが開いた直後の日程表 | 遅れているタスクだけ。診断のマーカーも出る | 全部（レポートの絞りが消える） | 遅れているタスクだけ。マーカーは出ない |
| 赤 | レポートの目と `IC-107` | 無い（ほかの表の目が入っていればその分） | `IC-107` が赤なのに、レポートの窓が出せない |
| 渡した意図（「ここだけがんばれ」） | 届く | 届かない | 届くが、どこでフィルタを掛けているかをたどれない |
| 基準日が無い文書 | 診断できないので、レポートの目を切って開く（未保存の編集にしない） | 同左 | 同左 |
| 代償 | 開くたびに診断が走る。`S-445` に例外ができる | 渡した人の絞りの半分が消える | 窓と目と赤が食い違う（`JDG-1821` に反する） |

### 問い 2 —— ウィンドウを閉じて目が切れたことを、文書の変更（未保存の印・取り消しの 1 段）に数えますか？

⭐ **答えた（`JDG-1873`）** —— 案 A、数える。未保存の編集（`FR-100`）で、取り消しの 1 段（目が入り、ウィンドウが最小化で戻る）。→ `TV-8`・`UN-20`。

| | 案 A（推奨）: 数える | 案 B: 数えない |
|---|---|---|
| 閉じた直後の未保存の印 | 付く | 付かない |
| 取り消し | 1 段で、目が入ってウィンドウが最小化で戻る | できない（ウィンドウを開いて目を入れ直す） |
| そのまま保存して開き直した | 目は切れている（画面と同じ） | 目は入っている —— 開くと担当リストのウィンドウが最小化で出て赤 |
| 代償 | ウィンドウを閉じただけで「保存しますか」の警告が出る | 保存したファイルと、閉じたあとの画面が食い違う |

---

## 12. 台帳

| 行 | 起草で | 波 1 で（本コミット） | 波 2 が着地したら |
|---|---|---|---|
| `DFC-2329` | 詳細状況に「`CR-723` が当てる（起草）」 | `仕様待ち` → `実装待ち`（決定仕様の欄に `FR-151`・`TV-6`・`TV-8`・`TV-9`・`OP-18`・`UN-20`・`CM-92`・`S-560`〜`S-572`・表 T-372） | `実測待ち`（手順は下） |
| `JDG-1824`・`JDG-1825` の前半・`JDG-1826` | 変えていない | `適用済`（着地先 `FR-151`・`UN-20`・`S-560`〜`S-572`・`OP-18`） | —— |
| `JDG-1872`・`JDG-1873` | `指示 —— CR-723 が当てる` | `適用済`（着地先 `OP-18`・`S-445`・`S-564` ／ `TV-8`・`UN-20`） | —— |
| `JDG-1927` | —— | 足した（本書を `CR-731` より先に当てる）、`適用済` | —— |

利用者の実物での確かめ（波 2 の後、調整役が頼む）: ① 担当リストで 1 人を「非表示」にしてスケジュールフィルタを掛け、検索の表のステータスの列を絞って保存する。② 新規で白紙にしてから、保存したファイルを開く —— 担当リストと検索パネルのウィンドウが最小化で出て、`IC-143` と起動アイコンが赤、帯が出て、同じタスクだけが描かれる。③ 担当リストの行を「表示」に戻す —— 未保存の印が付く。`Ctrl` ＋ `Z` で戻り、印が消える。④ 担当リストのウィンドウを × で閉じる —— 印が付き、`Ctrl` ＋ `Z` でスケジュールフィルタが掛かり、ウィンドウが最小化で戻る。

---

## 13. 測り方の再現

```
# the tree: worktree at 6195af6b (CR-722 .. CR-730 landed)
python <scratch>/maxids.py .        # spec max: S-559, UN-19, CM-91, OP-17, T-371 (S-999 / CM-99 are a test placeholder and a regex in CR-677)
grep -n "文書に保存してはならない\|文書に書いてはならない" docs/spec/01-04-requirements.md   # FR-099, FR-134, FR-151 x2
grep -rn "S-494\|S-495\|S-547\|S-548" docs/spec src tests          # UF-198, IC-143, settings rows; src notes; one CR-722 contract test
cat docs/spec/_source/grs-json-changes.json                         # "changes": []
grep -n "SCHEMA_VERSION =" tools/generate_startup_template.py       # 2026-10-09T11:56:15Z
grep -rl "2026-10-09T11:56:15Z" . --include=*.json --include=*.ts --include=*.md --include=*.py --include=*.html   # 14
# open-ability (14.2): a throwaway vitest file calling documentFromJson(text, own version) on
#   previous-project-result/38-project-progress/*.json and sample-schedule/*.json, counting faults by path
```

---

## 14. 当てた記録（波 1）

### 14.1 予測と実測

| 数 | 予測 | 実測（`6195af6b` → 波 1） |
|---|---|---|
| 要求 | ±0 | ±0 |
| 表 | +1 | +1（`T-372`） |
| 表 T-203 の行 | +13 | 12 → 25 |
| 表 T-206 の行 | −3〜−4 | 270 → 266 |
| 設定値の行（`S`） | +13 −4 | 484 → 493 |
| 表 T-027・表 T-108・表 T-024a の行 | 各 +1 | `UN` 19 → 20・`CM` 81 → 82・`OP` 18 → 19 |
| `（MUST）`（`01-04-requirements.md`） | +2 | 1763 → 1766（+3: `FR-151` の保存・`OP-18` の 2 つ） |
| `（MUST NOT）`（`01-04-requirements.md`） | −2 | 943 → 942（−1: `FR-151` の 2 つ目の ⛔ を消した。`FR-134`・`FR-099` の ⛔ は狭めて残した） |
| `documentSettings` の必須の鍵 | 30 → 31 | 30 → 31 |
| スキーマの定義（`$defs`） | —— | 21 → 23（`ColumnFilter`・`ColumnSort`） |

### 14.2 今ある文書が開けるか（形式の版を上げた後、`documentFromJson` で測った）

| 文書 | 開けるか | 理由 |
|---|---|---|
| `previous-project-result/38-project-progress/gr-scheduler-progress-2026-10-10.json`・`-10b.json`・`-10c.json`（3） | 開ける（誤り 0） | 版が古いだけでは拒まない。欠けた `tableViews` は `OP-6` が既定で補う |
| 同 `-10-04.json`・`-10-08.json`・`-10-08b.json`・`-10-08c.json`・`-10-08d.json`（5） | 開けない | 本書の前から —— 誤りはすべて `/schedule/tasks/N/parentTaskUid` が無い・`wbsParentUid` を知らない（`CR-708` の改名）。`documentSettings` の誤りは 0 件 |
| `sample-schedule/Three-Year Product Plan.json`（1） | 開けない | 同上（誤り 2000 件、すべて `CR-708` の改名） |
| `sample-schedule/*.xml`（6） | 開ける | MSPDI は `GRS JSON` の形式の版に関わらない |

### 14.3 検査と、波 2 ・波 3 まで赤いもの

- `npm run gen` 0、`npm run gen:check` 0、`npm run typecheck`（`tsc --noEmit` と `-p tsconfig.entity.json`）0 —— 生成した型は `src` のどこでも食い違わなかった（`DocumentSettings` を組むのは `SETTINGS_DEFAULTS` を多段に入れ子にする `document-file-flow.ts` だけで、2 段以上も読む）。`strictdoc export docs/spec` 0（`output` は消した）。
- check.sh の 1 回目: 赤は 5-10・11・19・23・37・39・42・44・59・69。7 は `published-entries.json` の `TableVisibility` の注が退いた 4 行を指していた（替えた）。11 は同じ文の 2 か所が 8 組（`UN-20` と `FR-151`、`S-560` と `FR-151`、`FR-099` と `FR-134`、`TV-6` と `TV-8`、`S-420` と `S-546`、`S-561` と `S-569`、`S-564` と `S-568` —— 指す形に書き直した）。19・59 は生成した検証器の `'from', 'to'` が取り込みの指定子に読まれた（欄を `fromDate`・`toDate` に —— X-17）。23 は型の欄の日本語が辞書でなかった（辞書にした）と、図 F-010 の箱の行（X-16 で取り下げた）。37 は `IC-143` の行が指す行だけを替えたので、辞書の語「スケジュールフィルタの切替。この表で「表示」の行のタスクだけを日程表に描く」と読み合わせて、その 1 行の指紋だけを付け直した。42 は `CD-5` の頭の文を試験が逐語で引いていた（足す句を行の末尾へ移した）。
- check.sh の 2 回目: 赤は 39・44・69 だけ。どれも基準線は動かしていない。
  - 39（`（MUST）` ／ `（MUST NOT）` を逐語で引く試験が無い）2117 → 2120（+3: `FR-151` の保存・`OP-18` の 2 つ）—— 波 3 の仕様だけを読む試験（9 節の 1・4）が閉じる。
  - 44（退いた ID を名指す）84 → 100（+16）—— 退いた `S-494`・`S-495`・`S-547`・`S-548` を、`src` の注が 11 か所（`agent-api-members.ts` 4・`screen-values.ts` 4・`delay-diagnostics-report.ts` 1 —— 体 A、`frame-loop.ts` 2 —— 体 B）、`tests/contract/cr-722-tv-5-tv-8-dt-8-each-table-holds-its-own-visibility.contract.test.ts` が 5 か所で名指す。波 2・波 3 が `S-560` ほかへ付け替える。
  - 69（手で書いた値の集合が生成した集合を写す）新しく 5 —— 表の名 3 つ（`searchPanel`・`delayDiagnosticsReport`・`resourceList`）が生成した `documentSettings.tableViews` の鍵と同じになった: `VisibilityTable`（`screen-values.ts:80`・`agent-api-members.ts:106`）、`VISIBILITY_TABLES`（`table-window.ts:59`）、`TABLE_ORDER`（`shown-tasks-hold.ts:30`）、`tableWindowsOf`（`screen-renderer.ts:773`）。体 A は `VisibilityTable` を `keyof TableViews` から起こす（5 節の継ぎ目）。
- vitest の全数（ロックの下、1 回）: 483 ファイル中 3 ファイル・5 件が赤。本書のもの 3 件 —— `cr-572-the-file-holds-tables-t-202-and-t-203-only.contract.test.ts` の 2 件（`documentSettings` の鍵の全数に `tableViews` が加わった。点の入った鍵の頭で数える形へ）と `dfc-1362-search-column-filter.contract.test.ts` の 1 件（`SV-14` の旧文を逐語で引く）—— 波 3 が付け替える。⚠️ 残る `cr-586-iv-22-a-drawn-milestone-that-disagrees-is-refused.test.ts` の 2 件は本書の前から赤い（生成した `src` の 9 ファイルを `6195af6b` に戻しても同じ 2 件が赤い。開く道の検証 `validate-imported-document.ts` は `IV-23` だけを判じ、`IV-22` を判じない）—— 本書の外。

### 14.4 グラフと、本書の外で見つけたもの

- `documentFromJson` は版の古い文書を拒まない（`formatVersionReading` は新しい版だけを分ける）。下書きの「版を上げれば開けない」は誤りだった（0.1）。
- `sample-schedule/Three-Year Product Plan.json` と進捗の文書 5 つ（10-04・10-08〜10-08d）は、`CR-708` の改名から開けない（14.2）。刷り直すかは調整役が決める。
- `cr-586` の 2 件（14.3）—— `IV-22` を開く道で判じていない。台帳の行を足すのは調整役（本書は `DFC` の帯を持たない）。
