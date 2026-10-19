# 測定の記録

> **English.** Raw performance and coverage measurements of GR Scheduler, kept so that every number quoted in
> the ledgers can be traced to the run that produced it. `performance-runs.md` is the index of the
> `GRS_PERF=1` runs; the dated folders hold each run's raw output and the throwaway scripts that drove it.
> Nothing here is used by the app. The text is in Japanese.

台帳（`../defects.md`・`../fixed-defects.md`・`../rulings.md`）に書いた数が、どの走行から来たかを辿れるように、生の出力を残す場所である。アプリはここを読まない。

## 今も使うもの

| ファイル | 何か | 読むもの |
|---|---|---|
| `performance-runs.md` | `GRS_PERF=1` で回した性能の走行の記録。1 走行 1 行で、下の日付のフォルダを指す | 検査 66（`check-perf-gate.py`） |
| `stats.jsonl` | 1 日 1 sha につき 1 行の、ソースと試験の行数・台帳の行数 | `tools/collect_stats.py` が書く（セッションの始まりのフック） |
| `coverage-stage0-2026-09-14.json` | 段 0 の試験の被覆の基準 | 規則 `../../development-rules/04-verification.md` の 6 節 |

## 走行ごとの生の出力（日付順）

| フォルダ・ファイル | 何を測ったか |
|---|---|
| `2026-09-05-performance.md` | 最初の性能の実測（操作ごとの応答時間） |
| `frame-time-stage0-2026-09-14.json`・`frame-time-stage0-exit-2026-09-14.json`・`frame-time-round-ab-2026-09-14.json` | リファクタの段 0 のフレーム時間と、段 0 の出口・巡の終わりの A/B（`../history/refactor-plan-report-2026-09-13.md` の記録 17） |
| `frame-time-ab-2026-09-16/` | `DFC-610`・`DFC-611` の A/B と trace |
| `frame-time-ab-2026-09-17-dfc-610/` | `DFC-610` を直した後の A/B（`results.md` が要約） |
| `frame-time-ab-2026-09-17-scale-and-fold/` | 表示の倍率と折り畳みの変更の後の A/B（`results.md` が要約） |
| `structure-stage8-2026-09-25/` | 段 8 の描画の要素の数と構造 |
| `stage8-root-cause-2026-09-26/` | 段 8 の性能の赤の原因の調べ（`README.md` が要約） |
| `perf-2026-10-01/`〜`perf-2026-10-04/` | `performance-runs.md` の走行 3〜10 の生の出力 |
| `mk6-drop-2026-10-08.md` | 範囲選択（`MK-6`）の落ち込みの調べ |
| `x14-2026-10-15-cr-751/`・`x14-2026-10-15-cr-755/` | スキーマだけを渡した書き手の試験（`X-14`、`JDG-2040`）。手順は `../../../tools/schema-only-writer/README.md` |
| `perf-2026-10-17/` | 2026-10-17 の PERF の赤が、その回の回帰かどうかの調べ（`README.md` が要約） |

⚠️ フォルダの中のスクリプト（`*.sh`・`*.py`・`*.mjs`）は、その回に使った使い捨ての写しである。今の木でそのまま動くとは限らない。今の測り方は規則 `04-verification.md` の 5 節が持つ。
