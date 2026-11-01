---
type: Design Review Table
title: GRS JSON の β の形 —— 行のレビューの表
description: CR-851（と同じ形に乗る CR-849 のリンクの欄）で GRS JSON の文書の要素・設定のプロパティ・命令・拒否の理由がどう変わるかを、今の要素 1 つにつき 1 行で並べた表。利用者が全行を見るための材料。2026-10-25。
tags: [grs-json, schema, commands, agent-api, line-review]
phase: design
status: draft
---

# GRS JSON の β の形 —— 行のレビューの表

- 作った日: 2026-10-25（今の形は `develop` の `80927c91d` のスキーマと原稿）
- 変更要求: `change-request/CR-851-grs-json-is-reshaped-once-before-beta-and-alpha-files-go-through-a-converter.md`
- 裁定: `docs/development-records/rulings.md` の `JDG-3259`〜`JDG-3268`・`JDG-3274`〜`JDG-3289`・`JDG-3300`〜`JDG-3315`。拡大縮小の名は `JDG-3290`〜`JDG-3297`（拡大縮小の席、`CR-853`）
- 材料: 棚卸し `studies/75-grs-json-reshape/multi-meaning-inventory.md`（所見 55）、外部契約の棚卸し `studies/77-external-contract-inventory/`
- ⛔ 利用者の指示 `JDG-3274`: GRS の外とつながる仕様は利用者が全行を見る。この表のどの行も、利用者が良しとするまで仕様・スキーマ・`src` へ当てない

## 読む順

| ファイル | 何か | 行 |
|---|---|---|
| [`doc-shape-map.md`](doc-shape-map.md) | GRS JSON の文書の全要素（最上段・`documentSettings`・`$defs` の各実体）。列は 今 ｜ 新 ｜ 例 ｜ 変わり方 ｜ 理由 ｜ 画面の変化 | 300（今の要素 260、足す 40、消す 3） |
| [`commands-map.md`](commands-map.md) | `applyCommands` の命令（93 → 43: 名つき 34 ＋ 実体ごとの編集 9）、退く名、拒否の理由の名（行 ID → 変わらない名 66）、拒否の形 | 命令 112・理由 94 |
| [`doc-shape-choices.md`](doc-shape-choices.md) | 文書の表を作るときに選んだこと（覆してよい）・数の測り方・裁定どうしの食い違いとその解き方 | — |
| [`commands-choices.md`](commands-choices.md) | 命令の表を作るときに選んだこと（覆してよい）・数の測り方 | — |
| [`property-order.md`](property-order.md) | スキーマと文書のプロパティの順（`JDG-3322`、規則は `DR-6` の案）。表の行はこの順に並ぶ | — |

正は 3 つの TSV（[`doc-shape-map.tsv`](doc-shape-map.tsv)・[`commands-map.tsv`](commands-map.tsv)・[`refusal-reasons-map.tsv`](refusal-reasons-map.tsv)）で、`.md` はそれを読みやすく刷った版である。

## 理由の欄の略

- `Fnn` —— 棚卸し `studies/75-grs-json-reshape/multi-meaning-inventory.md` の所見の番号
- `JDG-nnnn` —— `docs/development-records/rulings.md` の裁定
- `E-n` —— 拡大縮小の席が書いたスキーマの説明の英文（`CR-853` の下書きの付録）
- `CHOICE`・`OPEN` —— 各 `*-choices.md` の選んだこと・決まっていないこと

## 確かめ方

表が今の形の要素と命令をちょうど 1 度ずつ覆うこと:

```
python -I studies/76-grs-json-beta-shape/check_tables.py
```

2026-10-25 の結果: 文書の要素 260 のうち欠け 0・余り 0・重複 0、新しい要素の重複 0、命令 103（生きている 93 ＋ 退いた 10）のうち欠け 0・余り 0・重複 0。⚠️ `CR-851` を当てた後は原稿が変わるので、この確かめは赤くなる —— 表はレビューの記録であり、門ではない。
