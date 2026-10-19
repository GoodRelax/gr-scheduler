# CR-813 —— 修正の記録を .tsv で保存し、親子関係のタブで推定の親を指定に変え、指定を外す

> 状態: ⭐ **1 つ目を当てた** —— 2026-10-19、一問の席が `.tsv` の保存と 2 つの語を仕様とコードへ当てた（変更履歴は 5.26、`perf-pending` の 258）。仕様だけを読む別の席が試験を書いた（`tests/unit/cr-813-the-fix-log-saves-as-tsv-and-two-words-change.test.ts`）。
> ⏳ **2 つ目（親子関係のタブ）は未着地** —— 週の上限が戻った後の新しい席が当てる（`JDG-2913`）。設計と引き継ぎは 3 節（`JDG-2914`「設計内容はCRに残せ。」）。`Agent API` と `GRS Relay` への組み込みは、利用者が実物で確かめた後に調整役が組む（`JDG-2912`）。
> 当てる裁定: 1 つ目は `JDG-2905`（`DFC-3356`）・`JDG-2906`（`DFC-3357`）・`JDG-2907`（`DFC-3355`）。2 つ目は `JDG-2908`〜`JDG-2914`（`DFC-3358`、どれも「指示 —— `CR-813` が当てる」）。
> 新しい ID: 表 T-109 の `IC-169`、表 T-346 の `RW-20`、表 T-024 の `IO-9`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-008`（見たとおりに応える）と `CH-3`。利用者が、遅延診断で親を明記したときと形から導いたときとで結果が変わる理由を確かめた（`VC-9` 〜 `VC-12` と `VS-6` は明記の親だけで判じる —— `JDG-1954`）。そのうえで、導いた親を一覧で見て明記へ変える道と、直した記録を表計算ソフトへ渡す道を求めた。確かめる途中で、修正の記録の見出し「列」が表の列と紛れること、導いた親をパネルと新しいタブが別の語で呼ぶことが分かった。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2`**（規則の在り処が 1 つ）。
出たこと: ① `.tsv` の行は修正の記録の表が出している行そのもの（`foundFixRowsOf`）から作り、`[.md]` と同じく並べ替えとフィルタを 1 か所で済ませる。② 名の作り方は `before-fix` のバックアップの名と同じ関数（`momentFileNameOf`）に寄せ、語だけを `fix-log` に替える。③ 拡張子と媒体の型は 表 T-024 の `IO-9` の 1 行から生成器が出す（`export-formats.json`・`file-system-access-file-store.ts` の生成域）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ `.tsv` の最後の行の後に改行を置かない —— 行の「区切り」を CRLF とした。
2. ⭐ 修正前 UID と修正後 UID は、今の修正の値（空・日付・真偽・依存線）がどれも `Task` を指さないので、1 つ目では常に空。親子関係のタブが書く行（2 つ目）で親の `uid` が入る。
3. ⭐ `IC-169` の図形は、`IC-140`（`.md`）と同じ紙の形に、表の罫を描いた。
4. ⭐ 修正の記録の下の段には件数の語を置かない —— 修正案の段（`RW-12`）の「修正件数」は直す前の数であり、記録には当たらない。

---

## 1. 対応（1 つ目）

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 修正の記録の表の下の段に「.tsv で保存」を置く | `RW-20`・`IC-169`・`FR-155` | 原稿、`tbl-glossary.md`・`fig-icons.svg`・`display-words.json` → 生成。`delay-diagnostics-report.ts` の `delayFixFooterOf` |
| 2 | 出している行を `.tsv` の文字列にする（BOM・TAB・CRLF、セルの中のタブと改行は空白 1 つ、見出しの後に UID の 3 列） | `RW-20` | `delay-diagnostics-report-table.ts` の `delayFixLogTsv`、`delay-diagnostics-report.ts` の `delayFixLogTsvOf` |
| 3 | 選択面に 文書名_fix-log_yyyy-mm-dd-hhmm.tsv を出して書く | `RW-20`・`RW-7`・`IO-9` | `open-modals.ts` の `delayFixLogFileNameOf`、`delay-diagnostics-report-window.ts` の `handOutFixLogTsv` |
| 4 | 新しい形式 `.tsv` | 表 T-024 の `IO-9` | 原稿 → 生成（`export-formats.json`・`exchange-formats.json`・保存の選択面の媒体の型） |
| 5 | 見出し「列 / Field」→「プロパティ / Property」 | 表 T-374 の `FM-6`・`RW-11` | `display-words.json` |
| 6 | 導いた親の語「（導出）/ (derived)」→「（推定(自明)）/ (inferred)」 | 表 T-351 の `PTL-15` ② | `display-words.json` |

## 2. 影響（1 つ目）

```
仕様の他の行     FR-155 に 1 文・表 T-024 に 1 行・表 T-346 に 1 行・表 T-109 に 1 行と行の数（137 → 138、3 か所）・図 F-019 に 1 段
生成物           display-words.json・icon-roster.json・icon-glyphs.json・export-formats.json・exchange-formats.json・
                 file-system-access-file-store.ts の媒体の型・tbl-row-id-prefixes.md
生成器           generate_display_words.py の delayFixes の語の並びに 3 語（tsvTaskUid・tsvBeforeUid・tsvAfterUid）
試験             新しい試験は別の席が仕様だけから書く。辞書の契約の試験（display-words.contract）で、IC-169 を修正の記録の表を出した絵で探すようにした
毎フレームの仕事 修正の記録の表を出しているときに段へ入口を 1 つ足すだけ。.tsv の文字列は押したときにだけ作る
```

## 3. 2 つ目（親子関係のタブ） —— 未着地

⭐ 利用者の逐語は `docs/development-records/rulings.md` の `JDG-2908`〜`JDG-2914` にある。本節は設計と、次の席への引き継ぎである（`JDG-2914`）。1 つ目の着地点: 本 CR の 1 つ目のコミット（`.tsv`・`FM-6`・`PTL-15`）。

### 3.1 利用者が定めた形

| 項目 | 定め | 裁定 |
|---|---|---|
| 置き場 | 遅延診断レポートの診断結果のタブ（`IC-154`）の左に「親子関係 / Parent-Child」のタブ。窓を開いたときは今どおり診断結果を出す（`RW-11`） | `JDG-2908` |
| 表を作る時 | 遅延診断のたびにだけ（`FR-130` の `IC-107`・`IC-168`・`Agent API`）。入口を押しても [再診断] まで表は変えない | `JDG-2909` |
| 行 | 子 1 つに 1 行。明記の親 = 指定 / Set、表 T-318 の `IP-2` で導いた親 = 推定(自明) / Inferred、親が 1 つに決まらない子（`VO-4`）= 不明 / Unknown（親タスクの欄は [不明] / [Unknown]）、最上位のタスクグループのタスク（`IP-5`）= 親なし / No Parent（親の側の欄は空） | `JDG-2908`・`JDG-2909`・`JDG-2911` |
| 列（左から） | チェック・関係種別・親タスク・子タスク・親タスクステータス・子タスクステータス・親タスク進捗・子タスク進捗・親タスク予定日・子タスク予定日・親タスク実績日・子タスク実績日。英語は Check・Link Type・Parent Task・Child Task・Parent Status・Child Status・Parent Progress・Child Progress・Parent Planned Dates・Child Planned Dates・Parent Actual Dates・Child Actual Dates | `JDG-2910`・`JDG-2912` |
| 固定 | 見出し行は縦に、チェックから子タスクまでの 4 列は横に固定（`RW-10` と同じ作り） | `JDG-2910` |
| 名を押す | 親タスクの名も子タスクの名も、押すとそのタスクへ飛ぶ（`RW-13` と同じ飛び方） | `JDG-2909` |
| 入口 1 | [チェックした推定(自明)の親子関係を指定に変更] / Set Checked Inferred Links —— チェックした推定の行だけに効く | `JDG-2908`・`JDG-2912` |
| 入口 2 | [チェックした親子関係を削除] / Delete Checked Links —— チェックした指定の行だけに効く（推定は文書に無いので、次の診断でまた導かれる） | `JDG-2910` |
| 書き方 | 子ごとの `CM-18`（`setTaskParentTask`）を 1 回の呼び出しで走らせ、取り消しは 1 段、未保存の編集を立てる（親タスク設定のドラッグと同じ。修正案のような先の保存はしない） | `JDG-2909` |
| 知らせ | 押した後に 1 行。「指定に変更: {n} 件（推定(自明)でない {m} 件は変更しない）。[再診断] で表に反映」/ "Set: {n} ({m} not inferred, unchanged). Press [Diagnose Again] to update the table"。削除は「削除: {n} 件（指定でない {m} 件は削除しない）。[再診断] で表に反映」/ "Deleted: {n} ({m} not set, unchanged). Press [Diagnose Again] to update the table" | `JDG-2912` |
| 修正の記録 | 指摘 = 親子関係の指定 / Parent Link Set、親子関係の削除 / Parent Link Deleted。タスク = 子。プロパティ = 親タスク（表 T-016 の `PR-15` の語）。修正前・修正後 = 「{name}（推定(自明)）」/ "{name} (inferred)"、「{name}（指定）」/ "{name} (set)"、空は「（空白）」。`.tsv` の修正前 UID・修正後 UID に親の `uid` が入る | `JDG-2912` |
| `Agent API` / `GRS Relay` | 本 CR に入れない。利用者が実物で確かめて通った後に、調整役が別に組む | `JDG-2912` |

### 3.2 仕様に当てる所（案）

- 表 T-109: 新しい入口を 3 つ（タブ・入口 1・入口 2）。図 F-019（`docs/spec/_assets/fig-icons.svg`）に図形を 3 つ —— y = 574 の段は、1 つ目で足した図形が左端（x = 28）に 1 つあるだけで、x = 64・100・136 に置ける。行の数を 3 か所で改める（`docs/spec/_assets/tbl-glossary.md` の「138 行ある」「全 138 行」「138 個の確定名」と、`docs/spec/01-04-requirements.md` の「表 T-109 の 138 行」）。
- タブの表の欄の表を新しく置く。行 ID の接頭は新しく 1 つ登録する（`docs/spec/_source/row-id-prefixes.json` —— 1 つの接頭に 1 つの意味）。
- 表 T-346: `RW-11` にタブを足し、タブの表を作る時・行・固定・飛び方・下の段（入口 2 つと知らせ）の行を足す。文は他の行を指して書き、同じ文を 2 行に書かない（下の 3.4 の検査 11）。
- `FR-135`: `parentTaskUid` を書く道に 2 つの入口を足す（今はドラッグ・矢印の `Delete`・パネルの × だけ）。「⛔ `GRS` が候補から自動で書いてはならない」は保つ —— 人がチェックして押す。
- `FR-155` と 表 T-374: タブから来る行が修正の記録に入ること、`FM-4` の 2 語、`FM-7`・`FM-8` の「タスクを指す値」の書き方。
- 辞書 `docs/spec/_source/display-words.json`: 上の語のすべて。`tools/generate_display_words.py` は部ごとに語の並びを名指しで持つので、足した語をそこにも足す（1 つ目では `delayFixes` に 3 語を足した）。

### 3.3 コードの継ぎ目

| 継ぎ目 | 場所 | 1 つ目で分かったこと |
|---|---|---|
| 表の種類 | `src/adapter/screen-renderer/delay-diagnostics-report.ts` の `DelayReportTable`（`'diagnosis' \| 'proposals' \| 'log'`）と `DelayFixWindowValues`（表ごとの `views`・`picks`） | このファイルは約 1,570 行。タブの表は新しいモジュールに分け、`docs/spec/05-07-design.md` の 表 T-075 に UF の行を足すのがよい |
| タブ | 同ファイルの `delayReportTabEntriesOf` | 修正の記録のタブは記録が 1 行以上のときだけ置く —— 親子関係のタブは常に置く |
| 下の段 | 同ファイルの `delayFixFooterOf`（`DelayFixFooterView` = 件数・入口・知らせ）。描くのは `src/framework/dom-screen-surface/search-panel-drawing.ts` の `fixFooterElements` | 1 つ目で修正の記録の表に `IC-169` の段を足した。入口は `wordedEntry` で語を描く |
| 導いた親 | `src/entity/document-model/schedule/delay-diagnostics.ts` の `derivedParentsOf`・`parentTaskResolutionsOf`（`src/entity/document-model/schedule/schedule.ts` から公開） | 推定・不明・根の 3 つはここで分かれる |
| 書き込みと記録 | `src/framework/single-html-shell/document-file-flow.ts`（約 537 行目で `delayFixLogRowsOf(fixBundle, readLocalMoment())` から記録の行を作る）。命令は `CM-18` | 修正案の束は先に保存するが、タブの入口は保存しない |
| 修正の記録の値 | `src/entity/document-model/schedule/delay-fixes.ts` の `DelayFixValue`（`empty`・`date`・`dates`・`flag`・`links`） | タスクを指す種類を足すと、`delay-diagnostics-report.ts` の `taskUidCellOf`（網羅の `switch`）が型の誤りで知らせるので、そこで親の `uid` を返す |
| 入口の振り分け | `src/framework/single-html-shell/delay-diagnostics-report-window.ts` の `answerDelayDiagnosticsReportEntry` | 1 つ目で `IC-169` を足した形に倣う |

### 3.4 1 つ目で踏んだ検査（`.claude/skills/spec-graph-check/check.sh`）

| 検査 | 起きたこと | 直し方 |
|---|---|---|
| 26b | フォルダを越えて import した名が 表 T-064 に無い | `docs/spec/_source/published-entries.json` に行を足して `npm run gen:entries` |
| 32 | 英語の札が Title Case でない（"Save as .tsv"） | "Save As .tsv" |
| 37 | 表 T-109 の新しい行と辞書の組が記録に無い | 行と語を読み合わせてから `check-dictionary-table-covariance.py --write-baseline` |
| 46 | 公開の項の注記で 1 つの文字列に 2 文 | 文ごとに分ける |
| 55 | `src/` のファイルの注釈が 10 % を超えた／`tests/` に注釈の行を足した（`JDG-62`） | 注釈を減らす。試験には注釈を足さない |
| 9 | 文中の「表 T-109 の 137 行」 | 数を改める |
| 11 | `RW-20` の名の文が `RW-15` と重なった | 「`RW-15` と同じ作りとし…」と他の行を指す |
| 試験 | `T-024` の行の並びや `IC-` の見える絵を固定している古い試験 | `tests/contract/cr-768-*`・`tests/unit/uf-47-48-choosers.test.ts`・`tests/contract/display-words.contract.test.ts` を合わせた |

⚠️ `tests/contract/cr-586-iv-22-a-drawn-milestone-that-disagrees-is-refused.test.ts` の 2 件は前から赤い（`DFC-922`、`tests/known-red.txt`）。
