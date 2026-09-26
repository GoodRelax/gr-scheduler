# 確かめるものと試験の置き場 — 表 T-334・表 T-218

**UID**: DOC-TBL-VERIFICATION
**Version**: 0.1

> ⛔ 本書は生成物である。  
> 手で直さない —— 直しても次の `npm run gen` で消える。
> **確かめるものと試験の置き場の唯一の正は `_source/verification.json` である。**  
> 本書はそれを `_source/verification_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。

規則は `05-07-design.md` の Chapter 7 が持つ。  
本書は 2 つの表の全数を印字する。

⭐ **表 T-218 の `確かめるもの` の欄は原稿に無い** —— 表 T-334 の各行が名指す系統から、生成のたびに引く。  
⛔ 表 T-218 に無い系統を 表 T-334 の行が名指すと、`npm run gen` が何も書かずに止まる。

**表 T-334 — 確かめるもの**

| 行 ID | 確かめるもの | 全数を持つ所 | 1 件の単位 | 系統（表 T-218） | 走らせ方 |
| --- | --- | --- | --- | --- | --- |
| VT-1 | 利用者の手順 | Chapter 3.2 の `USE_CASE` のすべて | `UC-xxx` 1 つにつき 1 本。<br>その `SCENARIO` の手順を頭から終わりまで押す | `TS-1` | 出荷ビルドの `dist/index.html` を file:// で開く |
| VT-2 | 状態表の全行 | `_source/state-machines.json` の領域のすべて（表 T-250 の `SD-3`） | 領域 1 つにつき 1 本。<br>出来事 × いまの状態 のすべての組（表 T-285 の `RA-6`） | `TS-5` | 値だけで決まるので Vitest |
| VT-3 | 性能 | 表 T-043 の、合否が「ゲート」の行 | 行 1 つにつき 1 件以上 | `TS-4` | 測定条件は 表 T-025。<br>合否は 表 T-043 の「正」の欄の要求 |

**表 T-218 — テストの系統**

| 行 ID | 系統 | 確かめるもの | 親に取るもの | テストレベル | 置き場 | ツール |
| --- | --- | --- | --- | --- | --- | --- |
| TS-1 | ユースケーステスト | 表 T-334 の `VT-1` | `UC-xxx` | System | `tests/usecase/` | Playwright |
| TS-2 | ソフトウェア仕様テスト | —— | `SWS-xxx` | Integration | `tests/integration/` | Vitest |
| TS-3 | ソフトウェア仕様テスト | —— | `SWS-xxx` | System | `tests/system/` | Playwright |
| TS-4 | 非機能テスト | 表 T-334 の `VT-3` | `NFR-xxx` | —— | `tests/nfr/` | Playwright |
| TS-5 | 契約テスト | 表 T-334 の `VT-2` ／ 継ぎ目 | —— | Unit | `tests/contract/` | Vitest |
| TS-6 | 単体テスト | 省略の表が覆わない関数（Chapter 7 の本文） | —— | Unit | `tests/unit/` | Vitest |
