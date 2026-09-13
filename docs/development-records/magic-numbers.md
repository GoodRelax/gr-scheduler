# マジックナンバー問題管理表

`src/` のコードに直に書かれた数値リテラルを、まとめて直すための作業表である。
⭐ **不具合台帳（[`defects.md`](defects.md)）とは別に持つ。** 1 件ずつ押して見つけた不具合ではなく、同じ種類の書き方がファイルをまたいで大量にあるので、**ファイル単位で一括して**片付ける。

⛔ **直すのは別のセッションである。** コメント掃除の巡（2026-09-13）では、コードを 1 行も変えない。

---

## 1. 何を数えたか

| 項目 | 内容 |
|---|---|
| 対象 | `src/` の `.ts` 68 本 |
| 数えたもの | コード中の数値リテラル |
| 除いたもの | コメント・文字列・テンプレート文字列・正規表現リテラルの中、`<generated -- do not edit by hand>` の生成領域の中、値 `0` と `1` |
| 測った版 | コミット `768501a` |
| 測り方 | 小さな字句解析（文字列・コメント・正規表現を区別する）でコードだけを取り出し、数値の並びを数えた。分類は行の形から機械で当てた**第一の見当**である |

⚠️ **行番号は載せない。** コードが動けば必ずずれる。⇒ **作業するセッションの頭で測り直し、この表の数を更新すること。**

---

## 2. 分類と具体例

| 分類 | 何か | 実例（コミット `768501a`） |
|---|---|---|
| **比率** | 図形の形を決める小数。仕様書の表に行が無い値 | `schedule-geometry.ts` の記号の輪郭 `0.85`・`0.3`、`svg-renderer.ts` の `radius * 0.18` |
| **半分・倍** | `/ 2` や `* 2` | 中心を取る `x + width / 2` |
| **単位換算** | 時間・割合・色の単位の変換 | `mspdi-codec.ts` の `days * 24 * 60`、`86400000`（1 日のミリ秒）、`/ 100`（百分率）、`/ 255`（色の成分） |
| **文字列長** | 直前に書いた文字列の長さの分だけ位置をずらす数 | `mspdi-codec.ts` の `text.indexOf('-->', foundAt + 4)`（`4` は `<!--` の長さ）、`foundAt + 9`（`9` は `<![CDATA[` の長さ）、`body.slice(2)`（`#x` を読み飛ばす） |
| **基数** | 数を何進法で読み書きするか | `mspdi-codec.ts` の `Number.parseInt(body.slice(2), 16)`（16 進で読む）、`code.toString(16)`（16 進で書く）、`Number.parseInt(body.slice(1), 10)`（10 進で読む） |
| **添字** | 配列や正規表現の捕獲グループの位置 | `mspdi-codec.ts` の `hit[7]`、`snapshot-source.ts` の `Parameters<...>[3]` |
| **その他** | 上のどれにも当たらない整数 | `dom-input-source.ts` の `500`、`validate-imported-document.ts` の `1024` |

---

## 3. ⛔ 未決の論点（作業するセッションで裁定を受ける）

| # | 論点 | 前に立つ者の意見 |
|---|---|---|
| 1 | ✅ **基数と文字列長は除外しない**（利用者の裁定 2026-09-13） | **基数は名前付きの定数にする** —— `parseInt(x, 16)` の `16` だけでは 16 進と読めない。定数名は作業するセッションで利用者が裁定する。**文字列長は `.length` で計算する** —— `foundAt + '<!--'.length` |
| 2 | **比率の値の置き場** | 仕様書の表（`docs/spec/_source/settings.json`）へ行を足し、生成で `src/` へ入れる。⚠️ 値の追加は仕様変更なので CR が要る |
| 3 | **単位換算** | 既に `MS_PER_DAY` のような名前付きの定数がある所に揃える |
| 4 | **半分・倍** | 中心を取る `/ 2` を除外するか |
| 5 | **門にするか** | 除外の規則が決まったら、数を基準線に留める機械検査にする |

---

## 4. 状態表

状態は `未着手` / `判定済` / `修正済` / `除外` の 4 つ。分類の列は第一の見当の個数である。

| ファイル | 計 | 比率 | 半分・倍 | 単位換算 | 文字列長 | 基数 | 添字 | その他 | 多い値（値×個数） | 状態 |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --- | --- |
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | 226 | 169 | 42 | 1 | 0 | 0 | 0 | 14 | 2×46, 0.85×16, 0.3×14, 0.7×14, 0.8×12, 0.35×12, 0.62×8, 0.45×8 | 未着手 |
| `src/adapter/svg-renderer/svg-renderer.ts` | 51 | 13 | 20 | 7 | 5 | 2 | 0 | 4 | 2×24, 7×3, 100×3, 12×2, 0.7×2, 0.6×2, 0.001×2, 3×1 | 未着手 |
| `src/adapter/document-codec/mspdi-codec.ts` | 36 | 0 | 0 | 8 | 13 | 4 | 5 | 6 | 2×9, 3×5, 60×5, 9×3, 16×3, 4×2, 11×2, 5×1 | 未着手 |
| `src/framework/dom-screen-surface/dom-screen-surface.ts` | 27 | 1 | 3 | 2 | 1 | 0 | 0 | 20 | 2×18, 4×3, 3×2, 19×1, 100×1, 1000×1, 0.75×1 | 未着手 |
| `src/entity/document-model/schedule/schedule.ts` | 22 | 0 | 0 | 5 | 0 | 0 | 2 | 15 | 2×4, 86400000×3, 3×2, 4×2, 7×2, 12×2, 31×2, 5×1 | 未着手 |
| `src/entity/layout-engine/schedule-layout/schedule-layout.ts` | 12 | 0 | 3 | 2 | 0 | 0 | 0 | 7 | 2×10, 7×1, 86400000×1 | 未着手 |
| `src/adapter/input-command-translator/input-command-translator.ts` | 8 | 0 | 3 | 1 | 0 | 0 | 0 | 4 | 2×7, 86400000×1 | 未着手 |
| `src/entity/layout-engine/item-hit-area/item-hit-area.ts` | 8 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 2×8 | 未着手 |
| `src/use-case/edit-document/edit-calendar.ts` | 8 | 0 | 0 | 2 | 0 | 0 | 0 | 6 | 6×2, 7×2, 2×1, 3×1, 4×1, 5×1 | 未着手 |
| `src/framework/dom-input-source/dom-input-source.ts` | 7 | 0 | 0 | 1 | 0 | 0 | 0 | 6 | 2×2, 3×1, 4×1, 40×1, 100×1, 500×1 | 未着手 |
| `src/framework/single-html-shell/frame-loop.ts` | 5 | 0 | 1 | 0 | 0 | 0 | 0 | 4 | 2×2, 1024×2, 4×1 | 未着手 |
| `src/framework/canvas-rasterizer/canvas-rasterizer.ts` | 3 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 2×2, 3×1 | 未着手 |
| `src/use-case/apply-document-change/document-change-plan.ts` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 2×1, 3×1, 4×1 | 未着手 |
| `src/use-case/edit-document/edit-task.ts` | 3 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 100×2, 8×1 | 未着手 |
| `src/adapter/agent-api-endpoint/snapshot-source.ts` | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 3×1, 4×1 | 未着手 |
| `src/adapter/document-codec/embedded-html-codec.ts` | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 2×1, 3×1 | 未着手 |
| `src/adapter/image-exporter/image-exporter.ts` | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 100×2 | 未着手 |
| `src/framework/single-html-shell/single-html-shell.ts` | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2×1, 100×1 | 未着手 |
| `src/use-case/edit-document/edit-dependency.ts` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 2×1, 3×1 | 未着手 |
| `src/use-case/validate-imported-document/validate-imported-document.ts` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1024×2 | 未着手 |
| `src/adapter/screen-renderer/command-palette.ts` | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 2×1 | 未着手 |
| `src/adapter/screen-renderer/notices.ts` | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 2×1 | 未着手 |
| `src/adapter/screen-renderer/row-title-panel.ts` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2×1 | 未着手 |
| `src/adapter/screen-renderer/screen-frame.ts` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2×1 | 未着手 |
| `src/use-case/edit-document/edit-project.ts` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 359×1 | 未着手 |
| **計** | **436** | **183** | **82** | **34** | **21** | **6** | **14** | **96** | | |

⚠️ **分類は機械の見当である。** たとえば `mspdi-codec.ts` の `9` は文字列長（`<![CDATA[`）だが、「その他」に落ちているものもある。⇒ 作業するセッションで 1 つずつ判定し、状態を `判定済` へ進めること。
