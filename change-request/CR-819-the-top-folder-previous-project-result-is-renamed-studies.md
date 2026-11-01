# CR-819 —— 最上位のフォルダ `previous-project-result/` を `studies/` に改め、それを指す道を書き換える

> 状態: ✅ **当てた** —— 2026-10-20、名の改めの席（`suspicious-curie-0ec164`）が起草し、同じ席が当てた。
> 元: 利用者 2026-10-20「previous-project-result ってpoc に改名したい。」、調整役が `studies` を提案して「studies に賛成。 今やるよ。」（`JDG-2940`・`JDG-2941`、調整役が中継）。
> 当てる裁定: `JDG-2940`・`JDG-2941`。新しい ID: `JDG-2942`〜`JDG-2945`。消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004` —— フォルダの名が中身（試作より見本と調べ物が大半）を言うようにし、読む人が入口で迷わないようにする。

### ② レビュー観点のどの条項を当て、何が出たか

`R2.5`（名は指すものを言う）—— `previous-project-result/` は「前のプロジェクトの結果」と言うが、中身は今のプロジェクトが引き続き使う見本・調べ物・試作である。`studies/` に改めた。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 値と動きは変えない。仕様の本文は、この名が指す道（`user-order.md`・`04-performance/`・`08-poc/`・`16-grab-area-sizing/` などへの参照、設定値の「由来」の道）の綴りだけを書き換えた。要求も表の行も増減していない。
2. ⭐ **古い名を残す所**（`JDG-2942`）: `rulings.md` の逐語、過去の変更履歴の行、`docs/review/` の写し、完了した記録、進み具合の写し、ビルド済みの `dist/index.html`。着地した `CR` の中の綴りは、改名の表（`path-renames.txt`、`JDG-2945`）の行だけで説明のつく書き換えなら検査 62 が進行中と数えないので、書き換えてよい。利用者が書き換えを許したので（2026-10-20）、着地した `CR` 135 本の綴りを表どおりに書き換えた。
3. ⭐ 名を読む検査は `studies/` を知る。古い名を受け入れたまま残すのは、綴りの検査の `HISTORY_PATH` だけ（`JDG-2943`）。

## 1. 対応

| 直すこと | 直す所 |
| --- | --- |
| フォルダの名 | `previous-project-result/` → `studies/`（`git mv`） |
| 仕様の本文の道 | `docs/spec/01-04-requirements.md`・`05-07-design.md`・`08-10-test.md`・`_assets/tbl-glossary.md`・`_assets/tbl-settings.md`（原稿 `_source/settings.json`）・`_assets/fig-*.svg` の由来の行 |
| 改名の表と検査 62 | `.claude/skills/spec-graph-check/path-renames.txt`（新規）・`check-identifier-reservation.py`（差分が表だけで説明がつくなら進行中と数えない、`--self-test`） |
| 動くもの | `.github/workflows/pages.yml`・`.gitignore`・`tools/`・`.claude/skills/spec-graph-check/`・`tests/contract/`・`src/adapter/document-codec/mspdi-child-order.json`（生成物。`npm run gen`） |
| 生きている文書 | `docs/development-rules/`・`docs/reference/`・`studies/` の中の README と見本・`handoff.md`・`defects.md`・`pending-decisions.md`・`rulings.md` の逐語でない欄 |

## 2. 影響

```
生成物           tbl-settings.md・mspdi-child-order.json（原稿の道の綴りだけ）
実装・形式の版   変えない
毎フレームの仕事 無い
```
