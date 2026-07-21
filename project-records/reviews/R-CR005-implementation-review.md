# レビュー報告: CR-005 実装レビュー（フォントスケール [S][M][L]）

- レビュー対象: CR-005 実装（Part 1 表記変更 / Part 2 対象限定 / Part 3 パネル収まり / Part 4 コメント追従）
- 対象ファイル: `src/app/font-scale.ts`, `src/app/main.ts`（`wireFontScale`）,
  `src/adapters/ui/property-panel.ts`, `src/adapters/ui/left-pane.ts`,
  `src/adapters/render/layers/comment-layer.ts`,
  `tests/font-scale.test.ts`, `tests/comment-font-scale.test.ts`
- 適用観点: R2（設計原則）, R3（コーディング品質・補足）, R4（並行性・状態遷移）, R5（パフォーマンス）
- 実施日: 2026-07-21
- レビュアー: review-agent
- 根拠 CR / 決定: `project-records/change-requests/change-request-005-20260721-070348.md`,
  DEC-005 Decision 1（対象 = セクション名 / プロパティパネル / アイテムコメントの 3 種のみ、ヘッダー・パレット除外）

---

## 総合判定: **PASS**

- Critical: **0 件**
- High: **0 件**
- Medium: **1 件**（orchestrator に対応方針の承認を要請）
- Low: **3 件**（記録のみ）

Critical / High がゼロのため品質ゲートを通過する（CLAUDE.md 品質目標準拠）。
Medium 1 件は機能を破壊しないが、CR-005 Part 3 のテスト妥当性と DRY に関わるため、対応方針（修正 / 受容）の判断を求める。

### 品質ゲート実測値

| ゲート | コマンド | 結果 |
|--------|----------|------|
| 型チェック | `npx tsc --noEmit` | **0 エラー**（exit 0） |
| 単体/結合テスト | `npx vitest run` | **66 ファイル / 614 テスト 全 PASS**（exit 0） |
| Lint | `npx eslint src tests` | **0 違反**（exit 0） |

---

## 観点別 検証結果（R2–R5）

### R2 設計原則

- **命名（MUST・item60）: PASS。** `minorCategoryNameFontPx` / `CHROME_BASE_FONT_PX` /
  `applyScaledFontVar` / `scaledFontSizeCss` / `FONT_SCALE_GLYPHS` / `UI_FONT_CSS_VAR` /
  `propertyPanelCaptionFontPx` はいずれも役割を正確に表す。汎用語（data/info/tmp）なし。英語 ASCII。
- **単一情報源（Part 4）: PASS。** 小分類ラベルとコメント本文は双方とも
  `minorCategoryNameFontPx(scale)` を直接呼ぶ（`left-pane.ts:455`, `comment-layer.ts:169`）。
  ドリフトの余地なし。左ペインは em ネストではなく明示 px で適用しており、二重 em による丸め差も回避している。
- **対象スコープの正しさ（Part 2 / DEC-005）: PASS。** `UI_FONT_CSS_VAR`（`--grsch-ui-font`）は
  グローバル `<style>` には一切出力されず（`font-scale.ts:134-149` の CSS に変数名が現れない。
  `font-scale.test.ts:82` が明示的に検証）、`applyScaledFontVar` により左ペインコンテナと
  プロパティパネル root にのみ設定される。ヘッダー / パレットは `#app` 直下の兄弟で当該サブツリー外のため、
  CSS カスタムプロパティを継承し得ない。`#app` は固定 px（`CHROME_BASE_FONT_PX`=14）に固定され、
  em 基準のヘッダー / パレットは全スケールで不変。**correctness の主張は成立。**
- **回帰（アイテム略称・その他キャンバスラベル）: PASS（対象外を維持）。** アイテム略称は
  `taskAbbrevFontSize(barHeight)` / `milestoneLabelFontSizePx(iconHeight)`（`item-layer.ts:432-435`）で
  バー / アイコン高から算出され、`fontScale` に依存しない。すなわち [S][M][L] で略称は再スケールされない。
- **デッドコード（`applyUniformFontScale` 撤去）: PASS。** `src` 全体に参照なし（grep 確認）。旧 `fontGlyphs`
  も撤去され、`main.ts:721` は `FONT_SCALE_GLYPHS[scale]` を使用。

### R3 コーディング品質（補足）

- 型アサーション `button.dataset.fontScale as FontScale`（`main.ts:1345`）はアプリ自身が生成した
  ボタン属性を読むため実害は低い（Low-3 参照）。

### R4 並行性・状態遷移

- **二重描画 / 無限ループなし: PASS。** `wireFontScale`（`main.ts:1354-1356`）は
  `setViewState` → `renderNow()` の順。`setViewState` は `requestRender()` で rAF を予約するが
  （`svg-renderer.ts:930`）、直後の `renderNow()` が `cancelAnimationFrame` で予約済み rAF を確実に取り消してから
  同期 `diffRender` を 1 回だけ実行する（`svg-renderer.ts:953-961`）。`renderNow` は `requestRender` を呼ばないため
  再入・ループなし。左ペインは `setViewState` 末尾の `viewStateListener`（`svg-renderer.ts:931`）で同期 1 回描画。
  結果、クリック 1 回につき「左ペイン 1 回 + キャンバス 1 回」で 3 対象が同一フレーム・同一スケールに整合する。
  **単一描画の主張は成立。**
- **状態同期グリッジなし: PASS。** レイアウトは `fontScale` に依存しない（略称はバー高基準）ため、
  `fontScale` 変更で `layoutDirty` を立てずに `renderNow` する現設計でキャンバスにレイアウト陳腐化は生じない。
  コメント本文は毎 `diffRender` で `fontScale` を新規参照するため即時追従する。

### R5 パフォーマンス

- **PASS。** フォントスケール切替は離散なユーザー操作であり、同期 `renderNow` 1 回のコストは許容範囲。
  `minorCategoryNameFontPx` は O(1)。新規のループ・O(n²)・リスナー / タイマーのリークなし。

---

## 指摘一覧

### [M-1] `propertyPanelCaptionFontPx` が本番未使用のデッドコードであり、Part 3 のテストが実経路を検証していない（R2.7 DRY / R2.9 YAGNI）

- **重大度: Medium**
- **箇所:**
  - `src/app/font-scale.ts:66-67, 121-123`（`PROPERTY_PANEL_CAPTION_EM` / `propertyPanelCaptionFontPx` 定義）
  - `src/adapters/ui/property-panel.ts:519`（`caption.style.fontSize = '0.9em';`）
  - `src/adapters/ui/property-panel.ts:866`（progress-line セクション caption も `'0.9em'`）
  - `tests/font-scale.test.ts:138-146`（`propertyPanelCaptionFontPx(scale) <= 行高` を検証）
- **問題:** `propertyPanelCaptionFontPx` / 定数 `PROPERTY_PANEL_CAPTION_EM`（=0.9）は `src/` 内で
  一切消費されていない（grep 確認）。プロパティパネルの実際のキャプションフォントは、定数ではなく
  ハードコードされた文字列 `'0.9em'` で 2 箇所（:519, :866）に設定されている。すなわち
  「0.9」というキャプション比率が 3 箇所（定数 1 + 文字列 2）に重複し、意図された単一情報源
  （`PROPERTY_PANEL_CAPTION_EM`）は本番に接続されていない。
- **影響:** (1) CR-005 Part 3「L でもスクロールなしで収まる」を保証するはずの単体テスト
  （`font-scale.test.ts:138`）は、本番が使わない関数の戻り値を検証しているため、
  **実際の描画経路（`'0.9em'`）がフィックス行高に収まることを保証しない。** 現状は em 連鎖
  （0.7×0.9×base）と px 関数（round(base×0.7×0.9)）が偶然一致して収まっているだけで、
  誰かが `'0.9em'` を変更してもテストは検知しない（偽の安心）。(2) デッドコード + マジックナンバー重複。
- **修正案:** いずれか。
  1. プロパティパネルの caption を `propertyPanelCaptionFontPx(scale)` から明示 px で設定するよう接続し、
     `'0.9em'` の直書きを撤去して単一情報源に一本化する（`minorCategoryNameFontPx` を左ペイン + コメントで
     共有しているのと同じ方式）。テストは実経路を検証する状態になる。
  2. あるいは `propertyPanelCaptionFontPx` / `PROPERTY_PANEL_CAPTION_EM` を撤去し、テストを
     「実 caption 比率（0.9em）× パネル body px が行高に収まる」ことを検証する形に置き換える。
- **推奨戻り先:** コード修正（implementation フェーズ相当）。

### [L-1] renderNow によるタイミング修正（実際に発見・修正されたライブ defect）に自動回帰ガードがない（R6 補足 / テスト品質）

- **重大度: Low**
- **箇所:** `src/app/main.ts:1354-1356`（`renderNow()` 追加箇所） / `tests/comment-font-scale.test.ts`
- **問題:** 今回修正したライブ defect は「トグル時にコメントが左ペインより rAF 1 フレーム遅れる」タイミング問題で、
  修正は `wireFontScale` 内の `renderNow()` 呼び出し。しかし `comment-font-scale.test.ts` は
  overlay を手動でクリア → `CommentLayer.render` を直接呼ぶレイヤ単体経路を検証しており、
  `setViewState`+`renderNow`+rAF の統合経路を通らない。したがって将来 `wireFontScale` から
  `renderNow()` が除去されても当該テストは PASS のままで、**修正した defect そのものは回帰検知されない。**
  （レイヤ単体のスケール追従は本テストで十分に検証されている点は良好。）
- **影響:** 機能影響は 1 フレームの視覚遅延に留まる。ライブ検証済みのため現時点のリスクは低い。
- **修正案:** fake rAF（`setViewState` 後に rAF を発火させない状態で）でキャンバスが同期描画され
  左ペインと同一スケールになることを検証する統合テストを追加すると、修正が恒久的に保護される。

### [L-2] `applyScaledFontVar` の docstring が対象数を「three targets (left pane, property panel)」と誤記（R2.15 PIE）

- **重大度: Low**
- **箇所:** `src/app/font-scale.ts:155-156`
- **問題:** 「three targets」と述べつつ 2 つ（左ペイン・プロパティパネル）しか列挙していない。第 3 の対象
  （コメント）は変数ではなく `minorCategoryNameFontPx` の px を直接読むため本関数の呼び出し対象外、という
  正しい設計だが、文言が対象数と食い違い読者を惑わせる。
- **修正案:** 「the two variable-driven targets（left pane, property panel）。第 3 の対象コメントは px を直接参照」
  と明確化する。

### [L-3] `button.dataset.fontScale as FontScale` の無検証型アサーション（R3.3・情報提供）

- **重大度: Low**
- **箇所:** `src/app/main.ts:1345`
- **問題:** `dataset.fontScale`（string | undefined）を検証なしで `FontScale` にアサート。値はアプリが
  `FONT_SCALE_GLYPHS` のキーから生成したボタン属性であり信頼できるため実害は低いが、防御的には
  未知値を弾く方が堅牢。
- **修正案:** `S`/`M`/`L` の集合に含まれることを確認してから使用する（任意）。

---

## 指摘対応テーブル（document-rules §9.3 準拠）

| ID | 重大度 | 観点 | 対応 | 対応記録 | 検証 |
|----|--------|------|------|----------|------|
| M-1 | Medium | R2.7 / R2.9 | 未対応（orchestrator 承認待ち） | — | — |
| L-1 | Low | R6 | 未対応 | — | — |
| L-2 | Low | R2.15 | 未対応 | — | — |
| L-3 | Low | R3.3 | 未対応 | — | — |

- Medium（M-1）は据置き / 修正いずれの場合も対応記録が必要（修正の場合は再レビューで解消確認、
  据置きの場合は `project-records/decisions/` に据置き記録）。
- Low 3 件は記録のみ（修正 / 据置き / 受容のいずれでも可）。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-21 | 1.0 | 初版（CR-005 実装レビュー、R2–R5。PASS: Critical 0 / High 0、Medium 1 / Low 3） | review-agent |
