# 20 推奨で当てた 5 件の見本（2026-09-27）

⭐ **仕様の整理（枝 `cr-organise`、`f953dc90`）が、利用者に問わずに推奨で当てた 5 件（規則 06 の A・C）を、利用者がまとめて選べるようにした見本である。** 裁定は `JDG-770` 以降（`docs/development-records/rulings.md`）。

| ファイル | 中身 |
|---|---|
| `applied-recommendations-sample.html` | 1 ファイルの見本。1 遅延診断の入口のグリフ（`IC-107`）の 4 案 ／ 2 ボトルネックの印の炎の形（`S-395`）の 3 案と大きさ（`S-396`）／ 3 変更前の予定の輪郭の破線の刻み（`S-444`）3 案 ／ 4 モノクロで灰にする範囲（`CR-585`）2 案 ／ 5 入口の説明の文 12 件 |
| `sweep-sample.mjs` | Playwright で見本を開き、明るい・暗い・モノクロ・暗いモノクロの画面写真を `scratch/applied-recommendations/` に撮る |

## 開き方

`applied-recommendations-sample.html` をブラウザで開く。上のつまみで 暗いテーマ・モノクロ を切り替えられる。各段の「今」の印が、いま仕様に入っている形である。

## 測り方

```bash
node previous-project-result/20-applied-recommendations/sweep-sample.mjs
```

色・寸法は `docs/spec/_assets/tbl-settings.md`（表 T-236 ほか）と `docs/spec/_assets/fig-icons.svg` から写した。テーマの色相は既定の 214。見本の `!!` と `?` の記号は字で代用した（形の比べには関わらない）。
