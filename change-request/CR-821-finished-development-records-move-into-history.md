# CR-821 —— 終わった開発の記録を `docs/development-records/history/` へ移し、それを指す道を書き換える

> 状態: ✅ **当てた** —— 2026-10-20、記録の棚卸しの席（`elegant-ramanujan-919a32`）が起草し、同じ席が当てた。
> 元: 利用者 2026-10-20 —— 公開したので、`docs/development-records/` を開いたとき意味の分からないファイルや要らないファイルを置かない。終わった記録は `history/` へ、`evidence/` は中身を確かめて `history/evidence/` へ（`JDG-2971`〜`JDG-2973`、逐語は `rulings.md`）。
> 当てる裁定: `JDG-2970`〜`JDG-2973`。新しい ID: `JDG-2974`。消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004` —— 公開の読者が `docs/development-records/` を開いたとき、一番上には今使っている台帳だけがあり、どのファイルも README に 1 行の説明を持つようにする。

### ② レビュー観点のどの条項を当て、何が出たか

`R2.5`（名は指すものを言う）—— `W4-adapter.md` や日付つきの計画・報告が今の台帳と並び、終わった記録か今の状態かが名から分からなかった。終わったものを `history/` にまとめ、索引を置いた。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 値と動きは変えない。仕様の本文は、移したファイルを指す道 3 か所（表 T-004 の `LM-19`、`ADR-002` の Context、`SF-5`）の綴りだけを書き換えた。要求も表の行も増減していない。
2. ⭐ **古い道を残す所**（`JDG-2974`、`JDG-2945` と同じ）: `rulings.md` の太字の逐語、過去の変更履歴の行、`docs/review/` の写し。着地した `CR` 30 本の綴りは、改名の表（`path-renames.txt`）に足した 9 行だけで説明がつく書き換えにした。
3. ⭐ 検査 24 と検査 25 は `history/` も歩く。歩かないと、波の記録 W4・W5 の状態表を木と突き合わせる 97 行が黙って 0 行になる。

## 1. 対応

| 直すこと | 直す所 |
| --- | --- |
| 移すファイル | `W4-adapter.md`・`W5-framework.md`・`refactor-plan-report-2026-09-13.md`・`refactor-stage1-state-inventory-2026-09-13.md`・`refactor-stage3-gates-proposal-2026-09-15.md`・`src-comment-cleanup-report-2026-09-13.md`・`cr-plan-2026-09-26.md`・`backlog-plan-2026-10-04.md`・`evidence/` → `docs/development-records/history/`（`git mv`） |
| 仕様の本文の道 | `docs/spec/01-04-requirements.md`（`LM-19`）・`docs/spec/05-07-design.md`（`ADR-002`・`SF-5`）・`docs/spec/_assets/tbl-row-id-prefixes.md`（生成物。`npm run gen`） |
| 改名の表 | `.claude/skills/spec-graph-check/path-renames.txt` に 9 行 |
| 動くもの | `check-development-record.py`・`check-pending-decisions.py`（`history/` も歩く）・検査と道具とフックの出典の注・`tests/unit/uf-47-48.test.ts` の注 |
| 生きている文書 | `docs/development-records/README.md`（一覧と英語の数行）・`history/README.md`（新規、索引）・`measurements/README.md`（新規、索引）・`history/evidence/README.md`（一覧に 6 本）・`defects.md`・`fixed-defects.md`・`handoff.md`・`docs/development-rules/README.md`・`rulings.md` の逐語でない欄 |
| 重複の写し | `measurements/frame-time-ab-2026-09-17-*` の `run-log.txt` ×2・`supp-log.txt`・`suppz-log.txt`（`summary.txt` 側と 1 バイトも違わない）を消し、`results.md` 2 本を直した（`JDG-2970`） |

## 2. 影響

```
生成物           tbl-row-id-prefixes.md（台帳のファイルの道だけ）
実装・形式の版   変えない
毎フレームの仕事 無い
```
