# CR-811 —— 修正の記録を .tsv で保存し、親子関係のタブで推定の親を指定に変え、指定を外す

> 状態: ⭐ **1 つ目を当てた** —— 2026-10-19、一問の席が `.tsv` の保存と 2 つの語を仕様とコードへ当てた（変更履歴は 5.24、`perf-pending` の 257）。仕様だけを読む別の席が試験を書いた（`tests/unit/cr-811-the-fix-log-saves-as-tsv-and-two-words-change.test.ts`）。
> ⏳ **2 つ目（親子関係のタブ）は未着地** —— 同じ席が 2 つ目のコミットで当てる。`Agent API` と `GRS Relay` への組み込みは、利用者が実物で確かめた後に調整役が組む（利用者の指示）。
> 当てる裁定: `JDG-2905`（`DFC-3356`）・`JDG-2906`（`DFC-3357`）・`JDG-2907`（`DFC-3355`）。タブの裁定は 2 つ目で `JDG-2908` 以降に記す。
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

利用者が定めた形（裁定は 2 つ目で記す。逐語の控えは席の手元のメモ）:

- 遅延診断レポートの診断結果のタブの左に「親子関係 / Parent-Child」のタブ。表は遅延診断のたびにだけ作る（`FR-130`）。
- 列: チェック・関係種別・親タスク・子タスク（ここまで横に固定）・親タスクステータス・子タスクステータス・親タスク進捗・子タスク進捗・親タスク予定日・子タスク予定日・親タスク実績日・子タスク実績日。名前はどちらも押すとそのタスクへ飛ぶ。
- 関係種別: 指定 / Set、推定(自明) / Inferred、不明 / Unknown（親タスクは [不明]）、親なし / No Parent（最上位のタスク）。
- タブの下に [チェックした推定(自明)の親子関係を指定に変更] と [チェックした親子関係を削除]（指定の行だけ）。書き込みは `CM-18` を 1 回の束で、取り消しは 1 段、未保存の編集を立てる。修正の記録に「親子関係の指定 / 親子関係の削除」、プロパティ「親タスク」、修正前・修正後に親の名と（推定(自明)）（指定）を書く。押した後、表は [再診断] まで変わらない。
