# Z01 — 在庫表から機械抽出した列（2026-08-13）

**手写しではなく抽出である。** `previous-project-result/temp/inventory/E*.md` の 10 列表を
パーサで読み、`Z01-extracted-columns.json` に 559 行として落としてある。**総数は在庫表の自己申告 559 と一致した。**

⚠️ **パーサの罠**: セル内に `|` を含む行が 6 行ある（`型` 欄の列挙など）。
セル数不一致で表の読み取りを打ち切ると `TaskVisual` の表が丸ごと落ちる。**打ち切らずに読み飛ばすこと。**

## エンティティのネイティブ列（詳細 ERD の箱になるもの）

| エンティティ | 列数 | 出どころ |
| --- | --: | --- |
| `Project` | 25 | E04 |
| `Task` | 21 | E01 + E02 |
| `(calendar cluster: NEW)` | 9 | E05 |
| `TaskGroup` | 8 | E03 |
| `Resource` | 8 | E06 |
| `TaskVisual` | 8 | E07 |
| `Comment` | 8 | E08 |
| `Dependency` | 7 | E03 |
| `HighlightBox` | 7 | E08 |
| `Exception` | 6 | E05 |
| `CarryElement` | 6 | E10 |
| `Assignment` | 5 | E06 |
| `TaskOrigin` | 5 | E07 |
| `Calendar` | 4 | E05 |
| `TaskGroupMember` | 3 | E03 |
| `WeekDay` | 3 | E05 |
| **計** | **133** | ⚠️ `revisionStamp`(3) と `changeLog[]`(4) は A01 にあり E 側に無い |

## 箱にしないもの

| 群 | 行数 | 扱い |
| --- | --: | --- |
| `Task` の Carry 内訳 | 25 (E01 §3) ＋ 23 (E02 §3) | `carry` **1 列**に畳む。中身は列にしない |
| `Resource` / `Assignment` の Carry 内訳 | 65 ＋ 62 (E06 §10/§11) | 同上 |
| 暦の Carry 内訳 | 22 (E05 §6) | 同上 |
| 保存しない列（Reconstruct） | 5 (E01 §2) ＋ 5 (E02 §2) | **図に描かない。**別表で「持たない理由」を示す |
| `documentSettings` | 92 (E09 §3-1〜3-13) | **箱 1 つ ＋ 入れ子 2 つ ＋ 関係線 2 本。**値の正は `tbl-settings.md` |
| 拡張領域の定義と値 | 27 (E10 §10-1) | `carry` の内側 |
