# CR-811 —— コメントボックスのフォントサイズは 8 〜 24 px、既定は 10 px

> 状態: ⭐ **当てた** —— 2026-10-19、取次の席 E が仕様とコードを当てた（変更履歴は 5.24、`perf-pending` に 1 行）。仕様だけを読む別の席が試験を書き直した（`tests/unit/cr-811-the-comment-box-font-size-is-8-to-24-and-10-by-default.test.ts`）。
> 当てる裁定: `JDG-2897`・`JDG-2898`（`DFC-3347`）。
> 新しい ID: 無い —— `CR-809` の `AT-168`・`S-624`・`PR-50`・`CM-103` の名と値を改める。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-008`（見たとおりに応える）と `CH-3`。利用者が `CR-809`（コメントボックスごとの字の大きさ）を実物で試し、3 つを直すよう求めた: 下限を 8 px に、名を「フォントサイズ」に、既定を 10 px にして欄に出す。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2`**（規則の在り処が 1 つ）。
出たこと: ① 既定は表 T-217 の `S-624` の 1 か所に置き、描く側（`drawnAnnotationNumber`）とパネルの欄が同じ生成物を読む —— 範囲の生成物 `NOT_STORED_ANNOTATION_BOUNDS` に既定の値を添えた。② `CR-809` が足した生成器の 2 つの特例（`index` の既定を `null` として出す、導出の設定から実体の列を外す）は、既定が数になったので要らなくなり、外した。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 上限の 24 はそのまま（利用者に告げて問うた —— `JDG-2898`）。
2. ⭐ 欄に既定を出すのは `PR-50` だけ —— 線の太さや透過率の欄は今までどおり空で出す（頼まれていない。`cornerRadiusPx` の `null` は既定でなく「角を丸めない」なので、一律にはできない）。
3. ⭐ 列の名を改めるので形式の版を `2026-10-19T00:35:37Z` へ上げた（`FR-073`、`DFC-2950` の試験に 1 組足した）。見本と計画の JSON の版も替えた。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
|---|---|---|---|
| 1 | 列の名 `textSizePx` → `fontSizePx`、命令の名 `setCommentBoxTextSizePx` → `setCommentBoxFontSizePx` | `AT-168`・表 T-108 の `CM-103` | `erd.json`・`document-commands.json`・`settings.json`・`property-items.json` → 生成、`src` の 6 ファイル、試験 |
| 2 | 範囲 8 〜 24、既定 10（文書の文字サイズに従わない） | 表 T-217 の `S-624`・`FR-019`・`FR-097`・`FR-077`・05-07 の補いの段 | `settings.json`、原稿 2 ファイル、`comment-box.ts` |
| 3 | 欄の名「フォントサイズ / Font Size」、`null` の箱は欄に既定を出す | 表 T-016 の `PR-50` | `display-words.json`・`property-items.json`、`properties-panel.ts` の `shownValueOf` |

## 2. 影響

```
仕様の他の行     FR-019 の 2 文・FR-097 の 2 文・FR-077 の 1 文・05-07 の補いの段に 1 文
生成物           tbl-settings.md・fig-erd-detail.md・tbl-property-items.md・tbl-document-commands.md・スキーマ 2 つ・
                 grs-json-schema.ts・schedule-entities.ts・範囲の表 3 か所（既定を添える）・MCP の道具の説明・辞書とパネルの項目の写し
見本             docs/about・demo・guides の見本と project-plan.json・previous-plan.json の版、計画の 2 ファイルの列の名
試験             CR-809 の試験を別の席が仕様だけから書き直した（ファイル名も改めた）。仕様の文を引く試験 1 本、空の箱の床の試験（dfc-722）、2 つの箱をずらす量（cr-786）、形式の版の組
毎フレームの仕事 変わらない —— 字の大きさは列か表の既定から 1 度選ぶだけ
```
