# CR-648 —— 遅延診断レポートの窓を直す: ホイール・最大化からの飛び方・字の段・ファイル名・まとめの 1 行・辞書の語

> 起草の状態: 当てた（2026-10-04、`eac80d83` の上）。起草と当てを同じ作業木で行った（仕様・生成・コード・試験）。
> ID の帯: 番号 `CR-648` と台帳の帯 `DFC-1940`〜`DFC-1944` は調整役から受けた（10 節で、木のどこにも `CR-648` が無いことを測った。使ったのは `DFC-1940`〜`DFC-1942`）。仕様の新しい識別子は 表 T-351・接頭辞 `FN`（行 `FN-1`〜`FN-5`）・表 T-346 の `RW-10` の 3 つ（2 節）。⚠️ 表の番号 T-351 は `eac80d83` の最大（T-350）の次であり、ほかの枝が同じ番号を取っていないことを `git log --all -S"T-351"` で測った（0 件）—— 合流のときに調整役が確かめる。
> 当てる順: `CR-631`（コマンドパレット）・`CR-649`（MSPDI の日付と開き方の面の語）と同時に走る。触るファイルは重ならない（表 T-064 の `PI-37` のメンバと `display-words.json` の `icons` の 2 行・末尾の節だけが共通の原稿 —— 行が別なので文字の衝突は無い）。
> 閉じるもの: 台帳 `DFC-1855`〜`DFC-1859` と `DFC-1771`（語）。裁定 `JDG-1224`〜`JDG-1237` の着地先。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 何が起きているか

1. **ホイールが表を送らない**（`DFC-1855`）。`frame-loop.ts` の `isOnSearchPanelBody` は面の名が検索パネルのときだけ真を返し、レポートの窓の上のホイールは日程表へ流れていた。表 T-023 の後の段も検索パネルだけを名指していた。
2. **最大化したレポートから飛ぶと最大化のまま残る**（`DFC-1856`）。`SJ-3` を検索パネルの表示の状態にしか当てていなかった。
3. **字が大きすぎる**（`DFC-1857`、`JDG-1232`）。表 T-333 の 12・14・16・20 px（既定 16 px）を、9・10・12 px（既定 9 px）の 3 段にし、窓の見出しの行の名も段に従わせる。検索パネルも同じ段を共に使う。
4. **ファイル名に空白と ASCII でない字が入る**（`DFC-1858`、`JDG-1230`・`JDG-1231`・`JDG-1237`）。名を整える規則を 1 つの表（T-351）に置き、`FR-096` のすべての書き出しとレポートの書き出し（`RW-7`）が同じ規則を引く。
5. **上の段が縦に長く、凡例とまとめが同じことを 2 度言う**（`DFC-1859`、`JDG-1234`〜`JDG-1236`）。凡例を消し、まとめを横 1 行にし、`IC-108` の ja の札を「Copy」にする。
6. **語が行 ID のまま**（`DFC-1771`、`JDG-1224`〜`JDG-1229`）。欄の見出し・ステータス・まとめ・`DT-7` の文型・`VO-5` の問いの語を辞書と生成器の節に足し、ステータスの順と `DT-1` の優先順を 信用できない・要修正 → 疑義・記載漏れ → ボトルネック → ボトルネック経路 → 遅れ → 確定 にし、`RW-6` の炎の記号を 🔥（U+1F525）にし、`DT-1`〜`DT-4` を左に固定する（`RW-10`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- **表 T-054 の `CH-3`（軽快に動かす、`GL-003`）** —— 表を読もうとしたホイールが日程表を動かさなくなる。
- **表 T-054 の `CH-7`（遅れの発生源と、数字が信用できない行を、読み手が判断せずに受け取れるようにする、`GL-009`）** —— 窓が行 ID ではなく辞書の語で読め、値を確かめさせる行が先に並ぶ（利用者の言葉「遅延診断の結果が意味不明になっている。」）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R2.21`（1 つの仕事は 1 か所）** —— 名を整える規則を `exportNameBodyOf` 1 つに置き、`suggestedFileNameOf`（`FR-096`）と `delayDiagnosticsReportFileNameOf`（`RW-7`）の両方が引く。
- **`R2.1`・`R2`（名が体を表す）** —— 「指摘」（`finding`）は中身を言わない（`JDG-1224`）。コードのステータスの名を `doubtful` にした。`isOnSearchPanelBody` は 2 つの窓を答えるので `isOnTableWindowBody` にした。
- **`R2.7`（値を写さない）** —— 字の段は表 T-333 から生成したまま。既定の段の行 ID を `S-430` に替えた。窓の語はすべて辞書から引く。
- **`R5`（毎フレームの経路）** —— `frame-loop.ts`・`search-panel-drawing.ts`・`display-words.json`（生成）に触れる。どれも窓が出ているときだけ、入力 1 つか描き直し 1 つごとに定数の手間が増えるだけ。`perf-pending.md` に行を足した。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 見出しの行で段に従うのは面の名の字だけ。入口の図形（`IC-127` ほか）は段に従わない | 見本 `previous-project-result/35-delay-report-font-steps/` は見出しの字だけを段に合わせ、入口のボタンを 11 px に固定していた | 入口は 9 px の段でも同じ大きさで押せる |
| 決定 2 | 名を整える規則を新しい表 T-351（接頭辞 `FN`）に置き、`FR-096` と `RW-7` から指す | `DFC-1858` の対応案と、規則は表に置いて指す作法（`spec-table-first-writing`） | 表の番号を 1 つ使う |
| 決定 3 | `delay-diagnostics` と `schedule` は辞書の語ではなく仕様の値（`RW-7`・`FN-5`）とした | 表示の言語で変わらない（`JDG-1230`）。表 T-018 の略号と同じく、言語で変わらないものは辞書に置かない | コードは 2 つの字を行 ID を名乗る定数で持つ |
| 決定 4 | `S-433` は退かせ、席を焼いた（`retired.py`）。番号を詰めない | 退いた行の番号を再び使わない規則 | 無い |
| 決定 5 | `S-430` の下限を `fontMin` から「—」にし、`fontMin`（`S-8`）を割ることを備考に書いた | 利用者が 9 px を選んだ（`JDG-1232`）。12 px の下限のままでは表が自分の値を拒む | 和文の可読下限を割る字が窓にだけ在る |
| 決定 6 | `SJ-3` は、どちらの窓から飛んでも、最大化したレポートを `IC-131` と同じ遷移で通常へ戻す | 検索パネルの `onSearchHitJumped` は飛んだ窓を問わず検索パネルを戻している。同じ形にした。別の道を作らない（`FR-134` の MUST NOT） | 無い |
| 決定 7 | 利用者が英語を示さなかった語は本書が決めた（`DFC-1942` で利用者に確かめる）: まとめの「解析できなかった n 件」の en「Not analysed n」、写しの見出しの語（文書名 ／ Document name・作った日時 ／ Made at・絞り込み ／ Filter・なし ／ None。ja は `RW-6` の字）、表 T-312 の「実績が入力されていない」の en「Actual not entered」、`VO-5` の問いの en「Isn't this milestone already achieved?」 | `CR-633` の 0 節「英語は辞書を足す側が決める」。ja は仕様の字を写した | 利用者が語を替えるまで本書の英語が出る |
| 決定 8 | 表 T-310 ・ 表 T-311 の観点の語と 表 T-316 の壁の語は、行 ID のまま出す（`DFC-1940`） | どの表も語の欄を持たず、利用者の語も無い。辞書の節を作れば語を発明することになる | 理由の欄にまだ行 ID が残る |
| 決定 9 | 窓のステータスの絵は、まだ `RW-6` の記号の字で代える（`DFC-1941`） | `FR-133` の絵を表のセルに描く手立てと色 4 つ（`S-389` ほか）は、本書の範囲の外 | 窓では `?`・🔥・`!!`・`!` の字が絵の代わりに立つ |
| 決定 10 | 写しの頭の段の「基準日」の行は残し、まとめの 1 行の頭にも基準日を置く | `RW-6` は頭の段に基準日を持ち、`RW-4` のまとめは基準日から始まる（同じ並び） | 基準日が 2 度出る |
| 決定 11 | `DT-1` の新しい優先順はレポートだけに当てる。検索パネルの状態の列（`SQ-5`、`SV-8`）には触れない | `DFC-1870`（検索の状態の順の頭のボトルネック）は利用者が保留した | 11 節 |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| ホイール | `01-04-requirements.md` の 表 T-023 の後の段（本規則の例外の文・検索パネルの段・外にあるときの段） | E-01 |
| 窓の並び | `FR-134` の STATEMENT（上から、まとめ・タスクの表）と RATIONALE（凡例を置かない理由） | E-02 |
| 窓の違い | 表 T-346 の `RW-2`・`RW-3`・`RW-4`・`RW-6`・`RW-7`・`RW-8`、新しい `RW-10` | E-03 |
| 表の欄 | 表 T-347 の前文・`DT-1`・`DT-7` | E-04 |
| マーカーの状態 | 表 T-315 の `DG-1` の状態の語 | E-05 |
| 検索パネルの見せ方 | 表 T-330 の `SV-1`・`SV-16` | E-06 |
| 書き出しの名 | `FR-096` の提案する名の 2 文、新しい段 3 文と 表 T-351 | E-07 |
| 字の段 | `_source/settings.json` の 表 T-333（3 行）・`S-429`・`S-427` | E-08 |
| 用語 | `_assets/tbl-glossary.md` の `U-66`・`IC-108`・`IC-127` | E-09 |
| ファイル構成 | `05-07-design.md` の 表 T-075 の `UF-194` | E-10 |
| 公開名 | `_source/published-entries.json` の 表 T-064 の `PI-37`（`exportFileNameOf` を足し、`delayDiagnosticsReportFileNameOf` の注に 1 文） | E-11 |
| 辞書 | `_source/display-words.json`（`IC-108` の ja の札、`IC-127` の説明、節 5 つ） | E-12 |
| 接頭辞 | `_source/row-id-prefixes.json`（`FN`） | E-13 |

**数**: 要求の文 +5（`FR-096` の 3 文と 1 文の書き換え、`FR-134` の 1 文の書き換え）。表 +1（T-351）、表の行 +6（`FN-1`〜`FN-5`・`RW-10`）−1（`S-433`）。図 0。

---

## 2. 新しい識別子

| 識別子 | 何 | 置き場 |
|---|---|---|
| 表 T-351 | 書き出しの提案する名の整え方 | `01-04-requirements.md` の `FR-096` |
| `FN-1`〜`FN-5` | 同表の段（空白と OS で使えない字 → `_`、ASCII でない字を落とす、並んだ `_` を 1 つ、両端を落とす、残りが空） | 同上 |
| 接頭辞 `FN` | File Name | `_source/row-id-prefixes.json` |
| `RW-10` | 表 T-346 の固定（`DT-1`〜`DT-4`） | 表 T-346 |
| 公開名 `exportFileNameOf` | 表 T-064 の `PI-37` | `_source/published-entries.json` |
| 辞書の節 `delayReportColumns`・`delayReportStatuses`・`delayReportSummary`・`delayReportMarkdown`・`delayReportReasons` | 窓と写しの語。欄の見出しは 表 T-347 の行から読む。ステータスは作られた行で鍵を付ける —— `DG-1`・`DX-3`（疑義・記載漏れ）・`DG-2`・`DG-3`・`DG-4`・`DX-9`（確定）。コードの語彙（`doubtful`）を原稿へ入れない（生成器の `reasons` の節と同じ作法） | `_source/display-words.json`・`tools/generate_display_words.py` |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `RW-4`「凡例とまとめ」（凡例 4 行、まとめは縦） | 「まとめ」の 1 行。凡例は置かない |
| `RW-6` の「凡例（記号と語）」と例「? 信用できない」 | 凡例は書かない、まとめの 1 行、例「? 信用できない・要修正」、`DG-2` は 🔥 |
| `RW-7` の「辞書の語（ja「遅延診断」、en「delay-diagnostics」）」 | 表 T-351 で整えた名と `delay-diagnostics`（言語によらない） |
| `RW-8` の「表・凡例・まとめ」 | 「表とまとめ」 |
| `FR-134` の「凡例・まとめ・タスクの表」と RATIONALE「凡例を頭に置くのは …」 | 「まとめ・タスクの表」と「凡例を置かないのは …」 |
| `DT-1` の「指摘（`DX-3` だけ）」と順 DG-1 → DG-2 → DG-3 → DG-4 → 指摘 → 確定 | 疑義・記載漏れ と順 DG-1 → 疑義・記載漏れ → DG-2 → DG-3 → DG-4 → 確定 |
| `DG-1` の状態「信用できない」 | 「信用できない・要修正」 |
| `SV-1`「見出しの行の字は `IC-127` の段に追随しない」 | 「見出しの行の面の名の字は `SV-16` の段に従う」 |
| `SV-16`「（既定 16 px）」「末尾（20 px）の次は先頭（12 px）へ」 | 既定は `S-429`、末尾の段の次は先頭の段 |
| 表 T-333 の 12・14・16・20 px と `S-433` | 9・10・12 px。`S-433` は退く |
| `S-429` の既定 `S-432`（16 px） | `S-430`（9 px） |
| `FR-096`「文書名が空のときは拡張子だけを提案すること」 | 整えた名が空なら `FN-5` の `schedule` |
| `IC-108` の ja の札「写す」 | 「Copy」 |
| `IC-127` の説明「12・14・16・20 px」 | 「9・10・12 px」、見出しも変わる |
| コード: `DelayReportStatus` の `'finding'`・`isOnSearchPanelBody`・`DelayReportWords` の `legend`・`summary`・`unanalysed`・`meaning`・`DelayDiagnosticsReportView.legend` | `'doubtful'`・`isOnTableWindowBody`・まとめの 1 行を渡す `DelayReportDates.summaryLine` |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（表 T-023 の後の段）—— 例外は「次の段の 2 つの表の窓」。段は「検索パネル（`U-64`）か遅延診断レポートの窓（`U-66`）が出ていて、ポインタがその上にあるとき … その窓の表の送りとしてブラウザへ渡すこと（MUST）」。外の段は「窓の外」「どちらの窓も `S-99g` の面ではない（`FR-151`・`FR-134`）」。
- **E-02**（`FR-134`）—— 「窓には、上から、まとめ・タスクの表を置き」。RATIONALE「⭐ 凡例を置かないのは、まとめの各ステータスがマーカーの絵と語を並べるので、凡例が同じことを 2 度言うからである」。
- **E-03**（表 T-346）—— `RW-2` に「面の名の字は `SV-1` と同じく `SV-16` の段に従う —— 2 つの窓は 1 つの段（`S-429`）を共に使う」。`RW-3` の `IC-108` の括弧は「クリップボードへ写す」。`RW-4` はまとめの 1 行（左から基準日・ステータスごとに絵と語と件数・解析できなかった件数、項目の切れ目で折り返し、項目の中では折り返さない、凡例は置かない）。`RW-6` は凡例を書かず、まとめの 1 行、記号に 🔥（U+1F525）。`RW-7` は表 T-351 で整えた名 ＋ `delay-diagnostics`、空なら省く。`RW-8` は「表とまとめ」。`RW-10`（新）は `DT-1`〜`DT-4` を左に固定。
- **E-04**（表 T-347）—— 前文「`DX-3` の指摘を持つ `Task`」。`DT-1` の順と「疑義のあるボトルネックは疑義・記載漏れとして出し、まとめのボトルネックの件数に数えない」、理由（`FR-132`）、塗りの順とは別。`DT-7` は「`DG-1` と疑義・記載漏れ」と「`VO-5` は 表 T-312 の問いの語で告げ」。
- **E-05**（表 T-315）—— `DG-1` の状態を「信用できない・要修正 / `unreliable`」。
- **E-06**（表 T-330）—— `SV-1`・`SV-16`（3 節の表）。
- **E-07**（`FR-096`）—— 提案する名の 2 文、表 T-340 の後に「⭐ 選択面が提案する名と … 表 T-351 の 1 つの規則で整えること（MUST）」「⛔ 書き出しの種類ごとに別の整え方を持ってはならない（MUST NOT）」「⭐ 名を ASCII に限るのは …」、表 T-351。
- **E-08**（`settings.json`）—— 3 節の表。`S-429` の備考は「利用者が、いちばん小さい段を既定に選んだ —— 窓は日程表の横で開いたまま読むものであり …」。
- **E-09**〜**E-13** —— 1 節の表のとおり。

当てた後に打つもの: `npm run gen` → `npm run gen:check` → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。`docs/development-records/changelog.md` に 1 行足す。

---

## 5. 継ぎ目

```
SEAM
- Entity (Schedule): DelayReportStatus = DelayMarkerRow | 'doubtful' | 'settled';
  DELAY_REPORT_STATUSES = ['DG-1', 'doubtful', 'DG-2', 'DG-3', 'DG-4', 'settled'] (DT-1 order and precedence).
  delayDiagnosticsReportMarkdown(rows, filter, words, dates) -- no report argument, no legend;
  DelayReportDates = { documentName, statusDateLine, madeAt, summaryLine }.
- Adapter (ScreenRenderer, PI-37): exportFileNameOf(documentName, extension) -- T-351, FN-5 'schedule';
  exportNameBodyOf(documentName) inside the component; delayDiagnosticsReportFileNameOf(documentName, statusDate)
  -- no language; DelayDiagnosticsReportView has no legend; summary is one line of items.
- Framework: suggestedFileNameOf (FR-096) calls exportFileNameOf; isOnTableWindowBody answers both table
  windows (T-023); a jump with a maximised report sends IC-131 to the report first (SJ-3);
  windowTitleRowElement takes the heading font px (SV-16).
- Generated: display-words.json gains five sections (statuses keyed DG-1, DX-3, DG-2, DG-3, DG-4, DX-9;
  DELAY_REPORT_COLUMNS is read from delayReportColumns); NOT_STORED_SEARCH_PANEL_FONT_SIZES holds 3 rows.
```

---

## 6. グラフ（`eac80d83` に当てた後の木）

- `impact.py RW-7`: 指す要求 2 件（`FR-060`・`FR-096`）と 5.3 の `UF-194`。`FR-096` は本書が表 T-351 で結んだ。`FR-060` はフォルダの段で、名には触れない。
- `impact.py T-333`: 指す要求 1 件（`FR-151` の `SV-16`）。
- `impact.py SV-1`: 指す要求 3 件（`FR-134` の `RW-2`、`FR-016` の題の行の帯、`FR-036` の題の行）。どれも字の大きさを言わない ⇒ 書き換え 0。

---

## 7. 数の予測と測った数

| 数 | `eac80d83` | 本書を当てた後 | 差 |
|---|---|---|---|
| 表 T-333 の行 | 4 | 3 | −1 |
| 表 T-346 の行 | 9 | 10 | +1 |
| 表 | （生成物が刷る） | +1（T-351） | +1 |
| 接頭辞の登録 | 200 | 201 | +1 |
| 表 T-064 の公開名（`tbl-published-entries.md` の総数） | 296 | 297 | +1 |
| 辞書の節 | 37 | 42 | +5 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様と原稿（E-01〜E-13）・`tools/generate_display_words.py`・`retired.py` ＋ 生成物 | `npm run gen` |
| 2 | `src/entity/document-model/schedule/delay-diagnostics-report-table.ts`・`src/adapter/screen-renderer/delay-diagnostics-report.ts`・`open-modals.ts`・`screen-renderer.ts`・`src/use-case/advance-screen-session/screen-values.ts`・`src/framework/dom-screen-surface/search-panel-drawing.ts`・`window-frame-drawing.ts`・`src/framework/single-html-shell/frame-loop.ts`・`document-file-flow.ts`・`delay-diagnostics-report-window.ts` | コード |
| 3 | `tests/unit/cr-648-the-delay-diagnostics-report-window-fixes.test.ts`・`tests/system/cr-648-the-delay-diagnostics-report-window-fixes.test.ts` と、`CR-617` の試験 2 つの期待値 | 試験 |

- ⭐ **毎フレームの経路: はい。** `frame-loop.ts`（ホイールの判定と飛ぶ前の 1 手）・`search-panel-drawing.ts`（窓を描くとき）・生成の `display-words.json`。`perf-pending.md` に行を足す。

---

## 9. 仕様の外で直すもの

- 8 節の波 2・3。
- 基準線: `docs/review/duplication-baseline.txt` の 表 T-333 の群を `S-431 + S-432` に改名した（`S-433` が退いて群が縮んだ。上げていない）。検査 37 の指紋 `.claude/skills/spec-graph-check/dictionary-table-pairing.txt` の `IC-108`・`IC-127` を、行と語を読み合わせてから刷り直した。
- 台帳: `defects.md` の `DFC-1855`〜`DFC-1859`・`DFC-1771`（`実測待ち` へ）、新しい行 `DFC-1940`（観点と壁の語）・`DFC-1941`（窓のステータスの絵）・`DFC-1942`（本書が決めた英語の語）。`rulings.md` の `JDG-1224`〜`JDG-1237` の着地先。`perf-pending.md` の行。

---

## 10. 測り方の再現

```
# the tree: eac80d83

# the number is unused (no change request, no commit message, no file names it)
ls change-request | grep CR-648
git log --all --oneline --grep CR-648
git log --all --oneline -S"T-351"

# the steps of table T-333 before and after
PYTHONIOENCODING=utf-8 python -c "import json; d=json.load(open('docs/spec/_source/settings.json', encoding='utf-8')); print([(r['id'], r['value']['num']) for b in d['blocks'] if b.get('id')=='T-333' for r in b['rows']])"

# the wheel and the jump on the dev build
GRS_DEV_PORT=5991 node tools/gate/gate-queue.mjs run -- npx playwright test tests/system/cr-648-the-delay-diagnostics-report-window-fixes.test.ts

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py RW-7
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-333
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py SV-1
```

---

## 11. 保留の行との重なり

- ⛔ `DFC-1870`（検索の状態の列の並べ替えの頭の「ボトルネック」、`SV-8`・`SQ-5`・`search-table-filters.ts`）は利用者が保留した。本書の `DT-1` の順はレポートの表だけに当て、`SV-8`・`SQ-5`・`search-table-filters.ts` の `STATES_ASCENDING` には触れていない。
- ⚠️ 意味の重なりは 1 つ: 2 つの表がどちらも「ステータス ／ 状態」の列の並べ替えを持ち、レポートは本書で 疑義・記載漏れ をボトルネックより前に置いた。検索の状態の列にボトルネックを入れるとき（`DFC-1870`）、その順をレポートの `DT-1` の順と揃えるかは、監査の結論を待つ。
