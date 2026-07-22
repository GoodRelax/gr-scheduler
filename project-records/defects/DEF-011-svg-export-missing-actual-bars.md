# DEF-011: SVG エクスポートが実績バーを描かないのに行だけ伸びる（画面と出力が不一致）

- 起票: 2026-07-23（CR-013 の仕様改訂中に architect が発見。レビュー L-7）
- 種別: defect（画面表示とエクスポート出力の不一致）
- 重大度: **Medium**（データ欠損はないが、配布物として出す SVG が画面と違う絵になる。
  `separate` 表示では実績が消えたうえに無駄な余白だけが残るため、誤読を招く）
- 状態: **Fixed（2026-07-23、単体テストで画面/出力の矩形一致を検証済み）**
- 関連: PLAN-L1-005（Overlap/Separate・CR-013 で行高拡張に改訂）, ARCH-C-022（SVG エクスポート）,
  IO-L1-003（SVG 出力）, CR-013

---

## 事象

`src/domain/usecase/svg-exporter.ts` は行ジオメトリを画面と共有する
（`computeRowGeometry` を利用）ため、CR-013 で導入した **`separate` 表示時の行高拡張は
SVG 出力にも反映される**。しかしエクスポータ自体は **実績バーを一切描画しない**。

結果、`separate` を選んだ状態で SVG を出力すると:

- 行は実績バーの分だけ高くなる（余白が確保される）
- しかしその余白に**実績バーが描かれない**
- 画面では上下に並んで見えていた予実が、出力では**予定だけ**になる

## 矛盾する要求

`ARCH-C-022` は「画面と SVG 出力は同一のレンダラ経路を用い、見た目が一致すること」を趣旨と
しており、CR-013 改訂後の `PLAN-L1-005`（バー高を維持して行を伸ばし、予定の下に実績を並置する）
とも整合しない。すなわち**仕様上は実績が描かれるべき**である。

## 原因（推定・要確認）

SVG エクスポータは予実統一モデル（CR-001）導入以前の描画責務のまま、アイテム 1 つにつき
1 つのグリフ（予定バー）だけを出力しており、`item-layer` が持つ実績バー描画・
`computeDisplayedPlanActualBars` によるモードごとのゲーティングを取り込んでいない。
行高だけが共有ジオメトリ経由で自動的に追従したため、不一致が表面化した。

## あるべき挙動

SVG 出力は画面と同じ予実描画規則に従う:
- `overlap`: 予定バーの上に実績バーを重ねる
- `separate`: 伸びた行の中に予定（上）・実績（下）を並置する
- `plan-only` / `actual-only`: 表示フィルタ（DEF-008 で導入した
  `computeDisplayedPlanActualBars`）に従い、抑止された側を描かない
- ラベルの重ね順（DEF-009）も画面と同じく最前面

## 修正方針

`svg-exporter` の描画を `computeDisplayedPlanActualBars` 経由に統一し、実績バー
（および `actual-only` 時の単独グリフ）を出力する。可能なら `item-layer` と共有できる
純粋な「描くべき矩形の列挙」に切り出し、画面とエクスポートで二重定義にしない
（CR-014 でパレットとキャンバスの形状定義を一本化したのと同じ方針）。

## 検証

- `separate` かつ実績を持つアイテムを含む文書を SVG 出力し、実績バーが存在すること。
- `overlap` / `plan-only` / `actual-only` の各モードで、画面の描画結果と出力の矩形集合が一致すること。
- 実績を持たない行では行高も出力も従来どおりであること。

---

## 修正結果（2026-07-23）

- 新規モジュール `src/domain/usecase/plan-actual-paint.ts` に「アイテムが描く矩形の列挙」
  （`computeItemPlanActualPaint`）を純粋関数として切り出した。既存の
  `computeItemDisplayedBars` / `actualSideLaneRect` / `drawsActualBar` を**合成**するだけで、
  モード判定のロジックは二重定義していない。
- `src/domain/usecase/svg-exporter.ts` をこのヘルパ経由に統一し、
  `filterByPlanActualDisplay`（アイテム単位のフィルタ）、`displayFillColor` /
  `actualDisplayFillColor`（淡い予定・鮮やかな実績）、`planActualStrokeWidthPx`
  （細線=予定 / 太線=実績の非色冗長化）を画面と共有した。マイルストーンの実績マーカーと
  リーダー線（CR-002 Part 2）も出力するようにした。
- 検証: `tests/def011-svg-export-plan-actual.test.ts`（16 ケース）。うち 6 ケースは実物の
  `ItemLayer` を fake DOM で描画し、**画面の矩形と出力の矩形が一致する**ことを
  style × display の組合せで直接比較している（再発防止のドリフト検知）。
- 未対応（別課題）: `item-layer.ts` は他エージェントが編集中のため、同ヘルパを画面側からも
  消費する統一リファクタは未実施。推奨内容は下記「残作業」を参照。

### 残作業（推奨リファクタ）

`ItemLayer.patchItemNode` の「glyphIsLoneActual / glyphPlacement / bars」導出部を
`computeItemPlanActualPaint` の呼び出し 1 回に置き換える（`primaryGlyphRect` →
glyph 配置、`primaryGlyphSide` → `data-plan-actual-side` と塗り分け、`actualBarRect` →
`updateActualBar`、`milestoneActualCenterX` → `updateMilestoneActualMarker`）。
これにより画面とエクスポートが同一の判定関数を共有する。
