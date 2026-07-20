# DEF-006: 起動時 Fit が最下段アイテムを縦方向に約10pxクリップする（Model H 26アイテム版テンプレートで再現）

- 発見: 2026-07-21（test-engineer、CR-001/002/003 実装後の Playwright E2E テスト債務解消セッションで
  `tests/e2e/visual-data-batch.spec.ts`「Fit frames the RENDERED box (marker + label) of EVERY item
  inside the viewport」の再検証中に判明）
- 重大度: **Medium**（起動直後のデフォルト表示で実際にコンテンツがクリップされる可視的な不具合。
  クラッシュ・データ損失はないが、ズーム/スクロール操作で回避可能な範囲を超えて「フィットしたはず
  なのに最下段が切れている」という明白な視覚的破綻）
- 状態: **修正済み(検証グリーン)**（2026-07-21 implementer）
- 関連要求: STK-L0-021, item7（Fit machine — 全アイテムをクリップなく画面内に収める）
- 関連ファイル: `src/domain/usecase/viewport.ts`（`measureItemsFitExtent` / `computeFitViewForItems`）,
  `src/app/main.ts`（`wireInitialFraming`）, `tests/e2e/visual-data-batch.spec.ts`

## 事象

`npm run build` した `dist/index.html` を rAF 無効化（`requestAnimationFrame` を no-op 化。ビルド後の
初回同期 Fit パスのみを決定的に再現する既存テスト手法）で開くと、テンプレート文書
（`src/app/sample-data.ts` の `generateTemplateDocument`, 26アイテム）の最終行アイテム
`ta-task-plan-clarify-uc`（abbrev "Clarify Usecase"）のレンダリング済みバー矩形＋ラベルが、
Fit 後のキャンバス下端を **約9.8px** はみ出す。

再現手順:
1. `window.requestAnimationFrame = () => 1;` を `addInitScript` で注入（実アプリの
   `wireInitialFraming` は同期 Fit と rAF 内 Fit を二重に呼ぶが、後者は同じ入力に対し同じ結果を
   返す純粋計算のため、rAF が有効でも本事象は解消しない見込み — 下記「根本原因（仮説）」参照）。
2. `dist/index.html` をロード。
3. `svg[data-item-id="ta-task-plan-clarify-uc"]` の `getBoundingClientRect()` を、
   `svg[data-role="schedule-canvas"]` の同 rect と比較する。

観測値（1280x720 ビューポート、既定の起動フロー）:

```
svg (canvas) rect  : top=30,  bottom=720
group bbox          : top=698.14, bottom=729.76   <- bottom が 9.76px 超過
bar <rect> bbox     : top=703.77, bottom=729.76   <- ラベルではなく BAR 本体も超過
```

label（`<text>`）の overhang だけでなく、**バー矩形そのもの** がキャンバス下端を超えている点が
重要（`measureItemsFitExtent` は水平方向のラベル/マーカーはみ出しは `renderedHorizontalSpan` で
明示的に加算しているが、垂直方向は `placement.worldY + placement.worldHeight` のみで、ラベルの
垂直オーバーハングは一切加味していない。加えて本ケースはバー本体まで超過しているため、ラベル
オーバーハングだけでは説明がつかない）。

## 根本原因（仮説・要 implementer 精査）

- `measureItemsFitExtent`（`viewport.ts`）は `zoomY = 1` で `layoutItems` を1回実行し、その
  `contentBottomUnit`（= 最下段の `worldY + worldHeight`）を最終 `zoomY` へ線形スケールする設計
  （コード内コメント「sub-lane count is zoomY-independent」という前提）。この前提が崩れている
  可能性がある: 例えば行の積み上げ位置が丸め (`Math.round` 等) を伴う場合、`zoomY = 1` での
  プローブと実際の `zoomY`（本document では約1.6〜1.8）とで蓄積誤差が生じ、行数が多いほど
  （本テンプレートは分類ツリーの葉が10行以上）誤差が線形以上に蓄積し得る。
- あるいは `computeFitViewForItems` の `marginPx`（既定24px）が水平方向のみに正しく機能し、
  垂直方向の margin 計算に off-by-one 相当のズレがある可能性。
- いずれも実装側（`src/domain/usecase/viewport.ts` の `computeFitViewForItems` /
  `measureItemsFitExtent` とそれが呼ぶ `layoutItems`）の詳細調査が必要なため、根本原因の確定は
  implementer に委ねる。

## 影響

- デフォルトテンプレート文書（起動時にユーザーが最初に見る画面）で、最下段アイテムが常時
  約10pxクリップされる可能性が高い（rAF が有効な通常フローでも、Fit の再計算は同じ入力に対し
  同じ結果を返す純粋関数のため解消しない可能性が高いが、実ブラウザでの目視確認は未実施 — 下記
  「検証（現状）」参照）。
- ユーザー操作（手動でのわずかなズームアウトやスクロール）で容易に回避できるため機能停止には
  至らないが、「Fit」という機能が名前通りに動作していないという品質目標（性能テスト/UI feedback
  batch の意図）に反する。
- 品質ゲート（Critical/High=0）を直ちに脅かすものではないため severity は Medium とした。

## 影響範囲の切り分け（本 defect が CR-001/002/003 由来か既存潜在バグかの整理）

- 水平方向のラベル/マーカーはみ出し対策（`renderedHorizontalSpan`）は既存実装済みで、
  `tests/e2e/interaction-batch.spec.ts` の "Fit frames the whole schedule" 等は現行 green。
- 垂直方向は元々このような保護ロジックが存在しない実装であり、CR-001（Model H, 26アイテム化）に
  よってテンプレートの最終行アイテムが変わったことで **たまたま** 顕在化した可能性が高い
  （32アイテム版フィクスチャの最終行では誤差が偶然マージン内に収まっていたと推測される）。
  すなわち CR-001/002/003 自体が原因ではなく、既存の潜在バグが新フィクスチャで露見したもの。

## 対応方針（提案、要 implementer / user 判断）

1. `measureItemsFitExtent` の垂直方向にも水平方向と同様の保護的マージンを持たせる
   （例: 最終行の `worldHeight` に加えてラベルの想定フォントサイズ分の overhang 見積りを加算する）。
2. または `contentBottomUnit` の計算・スケーリングにおける丸め誤差の蓄積を特定し、
   累積誤差が出ない計算式に改める。
3. 修正後、`tests/e2e/visual-data-batch.spec.ts`「Fit frames the RENDERED box (marker + label) of
   EVERY item inside the viewport」を green 化して回帰確認する（現状このテストは意図的に
   **red のまま** 残置し、本 defect の再現テストとして機能させている — マスクしていない）。

## 検証（発見時点・当時の現状）

- （発見時）`tests/e2e/visual-data-batch.spec.ts` の該当テストは意図的に修正せず、現状の実装の
  ありのままの挙動（red）を保持していた。テスト側の item id / count は CR-001（Model H, 26アイテム）に
  追随済みで、この1点のみ実装側の対応待ちだった。
- （修正後）上記「修正（2026-07-21 implementer）> 検証（グリーン）」を参照。当該 e2e はジオメトリ
  修正によりグリーン化済み。

## 修正（2026-07-21 implementer）

### 確定した根本原因（対応方針の仮説を精査した結果）

仮説2（`marginPx` の off-by-one）と、仮説1のうち「行積み上げの丸め蓄積」は **いずれも誤り**
だった。数値再現（テンプレート文書, canvas 1280x690, leftPaneWidth=200, marginPx=24）で確定した
真因は次のとおり:

- 実レンダラ（`svg-renderer.ts` の `layoutRows`）は CR-003 Part 2 のラベル衝突回避推定器
  `estimateInnerLeftLabelExtentPx` を渡してサブレーンを割り当てる。一方 Fit の測定
  （`viewport.ts` の `measureItemsFitExtent` → `layoutItems`）は **この推定器を渡していなかった**。
- さらに致命的なのは、この推定器の占有幅が `barHeightPx`（＝ `BASE_LANE_HEIGHT × zoomY × 0.9`）に
  比例するため、**サブレーン数が zoomY 依存**である点。`measureItemsFitExtent` の設計前提
  「サブレーン数は zoomY 非依存なので zoomY=1 で測り最終 zoomY へ線形スケールできる」は、推定器が
  絡むと **成立しない**。zoomY=1 では追加レーンが出ず、fit 後の zoomY≈1.60 で初めて行が 1 レーン
  分伸び、下段が押し下げられて最終行バーが約 9.75px はみ出していた（DEF-006 の 9.76px と一致）。

すなわち真因は viewport.ts 内（`computeFitViewForItems`/`measureItemsFitExtent` が実描画と異なる
レイアウトを測っていたこと）であり、当初提案の「垂直マージン加算」は対症療法で不正確（テンプレート
依存で脆く、他文書で破綻し得る）。

### 修正内容（純粋 usecase・DIP 準拠・最小）

1. `measureItemsFitExtent` / `computeFitViewForItems` に任意引数
   `labelExtent?: ItemLabelExtentEstimator` を追加し、実描画と同じ推定器を測定に注入できるようにした
   （型は usecase 層の `layout-engine.ts` 定義。具体実装はアダプタから注入＝DIP 準拠。水平方向の
   `contentLeftPx/RightPx` はレーン割当に依存しないため **水平挙動は不変**）。
2. サブレーン数の zoomY 依存を吸収するため、`computeFitViewForItems` に zoomY 精緻化ループを追加。
   新ヘルパ `measureRenderedContentBottomPx`（指定 zoomY での実 world bottom を測る）で候補 zoomY での
   真の描画下端を測り、垂直バジェット（`usableHeight` は既に上下 `marginPx` を控除済み＝水平と同一の
   保護マージン）に収まるまで単調縮小（`zoomY ← zoomY × usableHeight / bottom`）。単調なので 1〜2 パスで
   収束（本テンプレートは 1 パス）。二重計上なし（既存の行バンド padding や 2×margin に上乗せしない）。
3. `svg-renderer.ts` の `fitToContent` から `computeFitViewForItems` に `estimateInnerLeftLabelExtentPx`
   を渡すよう配線。

### 検証（グリーン）

- 数値: 修正前 最終行バー overflow = **+9.75px**（クリップ）→ 修正後 **-74.4px**（枠内, zoomY 1.604→1.469）。
- `npx tsc --noEmit` = 0 エラー。
- `npx vitest run` = 592 passed（新規単体テスト
  `tests/visual-data-batch.test.ts`「frames the estimator-aware RENDERED bottom (last bar not clipped, DEF-006)」
  を追加。推定器込みの実描画下端 ≤ fit 後キャンバス下端 を主張）。
- `npx eslint`（変更ファイル）= 0。
- `npx playwright test tests/e2e/visual-data-batch.spec.ts --workers=1` = 6 passed。
  従来 red だった「Fit frames the RENDERED box (marker + label) of EVERY item inside the viewport」が
  **ジオメトリの正しさにより** グリーン化（許容誤差の緩和・フィクスチャ差し替えは行っていない）。

## 再発防止（プロセス改善提案）

- Fit（フィット）機能のような「全アイテムを画面内に収める」系の要求は、水平・垂直の両軸で
  同一水準の保護的マージン計算を要求仕様（STK-L0-021 / item7）に明記し、実装レビュー観点
  （review-standards.md R1 相当）に「軸ごとの overhang 加算ロジックの対称性」を追加することを
  検討する。
