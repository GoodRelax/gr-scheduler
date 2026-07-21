# レビュー報告: CR-006 実装（パレット・ヘッダー UI 8 点）

- レビュー種別: 実装レビュー（R2 設計原則 / R3 コーディング品質 / R4 並行性・状態遷移 / R5 パフォーマンス）
- 対象 CR: `project-records/change-requests/change-request-006-20260721-070348.md`
- 対象決定: DEC-005 #2（`[en][jp]` は AI/Help モーダル内に置き、ヘッダーには置かない）
- レビュー日: 2026-07-21
- レビュアー: review-agent
- 総合判定: **PASS**（Critical 0 / High 0。合格基準を満たす）

---

## 1. レビュー対象成果物

| 種別 | ファイル |
|------|---------|
| 実装 | `src/app/main.ts`（ヘッダー Fit/P・3 パレットトグル結線・SS ハンドラ） |
| 実装 | `src/app/header-model.ts`（`HEADER_LEFT_CONTROL_ROLES`） |
| 実装 | `src/adapters/ui/tool-palette.ts` |
| 実装 | `src/adapters/ui/ai-export-modal.ts` / `help-modal.ts` / `modal-locale-toggle.ts` |
| 実装 | `src/adapters/io/screen-capture.ts` |
| 実装 | `src/adapters/render/layers/progress-today-layer.ts` / `src/domain/usecase/progress-line-builder.ts` |
| 実装 | `src/adapters/input/editing-controller.ts` |
| 実装 | `src/adapters/ui/property-panel.ts` |
| データ | `docs/api/gr-scheduler.schema.json`（`progressLineVisible` default:false / `assignee` / `assigneeVisible`） |
| サンプル | `src/app/sample-data.ts`（TeamA 4 アイテムに `assignee`） |
| テスト | `tests/cr006-palette-header.test.ts` / `cr006-modal-locale.test.ts` / `cr006-screen-copy.test.ts` / `cr006-box-placement.test.ts` |

## 2. 品質ゲート実測値

| ゲート | コマンド | 結果 |
|--------|---------|------|
| 型検査 | `npx tsc --noEmit` | **0 エラー**（PASS） |
| 単体・結合テスト | `npx vitest run` | **640 passed / 640（70 ファイル全緑）**（PASS） |
| Lint | `npx eslint src tests` | **0 違反**（PASS） |

サンプルデータへの `assignee` 追加は `document-schema-conformance` / サンプル系テストを破壊していない（schema に `assignee`（items）・`assigneeVisible`（viewState）・`progressLineVisible default:false` が定義済みで整合、全緑）。

## 3. 観点別所見

### R2 設計原則（MUST 命名・SRP・SoC・CA）— PASS
- **命名（item60）**: `HEADER_LEFT_CONTROL_ROLES`・`isProgressLineVisible`・`copyPngToClipboardOrDownload`・`armBoxPlacement`・`clipboardSupportsImages`・`buildModalLocaleToggle` いずれもドメイン限定で意図を叫んでいる。汎用語（`data`/`info`/`kind`）なし。真偽値は `is*`/`has*` 準拠。
- **CA レイヤ仕訳**: `header-model.ts`（Framework 純粋定数）・`progress-line-builder.ts`（UseCase 純粋・`@pure` 相当の副作用なし）・`tool-palette.ts` / `modal-locale-toggle.ts` / `screen-capture.ts`（Adapter・DOM/Clipboard 境界を内包）で分類が正しく、ドメインが DOM/Clipboard に汚染されていない。`isProgressLineVisible` を純粋関数としてドメインに置き、既定=非表示ロジックをレンダラ非依存で単体テスト可能にしている点は適切。
- **DRY/POLA**: ヘッダー左制御の DOM 順を `HEADER_LEFT_CONTROL_ROLES` の単一定数から `role→element` ルックアップで構築し、テストが同じ定数を検証する（ドリフト不能）。`[P]`↔`[-]` は `setPaletteMinimized` 単一適用点に集約し双方向同期を保証（main.ts:1198-1223）。

### R3 コーディング品質 — PASS
- **エラーハンドリング**: SS ハンドラ（main.ts:2017-2042）はキャプチャ失敗を try/catch で捕捉しトースト通知、ラスタライズ失敗を `.catch` で処理、クリップボード拒否は download フォールバック（screen-capture.ts:118-127）。握りつぶしなし、内部詳細の露出も `error.message` のみで妥当。
- **防御的プログラミング / node-safe Element ガード**: editing-controller.ts:972-980 の `typeof Element !== 'undefined' && target instanceof Element` は Node 実行時の安全化のみで、ブラウザ経路を弱めない（ブラウザでは `Element` 定義済みで従来どおり `closest()` によるオーバーレイ制御ガードが機能）。同パターンは既存の pan ガード（F-01）と一致。
- **ja 翻訳の内容限定**: `buildAiPromptText('ja')`（ai-export-modal.ts:50-72）はプロンプト散文のみ和訳し、識別子（`startDate`/`endDate`/`actualStart`/`actualEnd`/`progressRatio`/`majorCategory`/`abbrev`/`"milestone"`/`"task"`/schema id）を英語のまま保持。`buildAiClipboardPayload` はスキーマ部を常に英語 SSOT（`schemaJsonText()`）で連結。コード・識別子・スキーマの和訳汚染なし。

### R4 並行性・状態遷移 — PASS
- **二重レンダー/ループ回避**: 3 つのパレットトグル（`wireProgressLine`/`wirePlanActualStyle`/`wireAssigneeToggle`）はいずれも `setViewState` 後に `renderNow()` を呼ぶ。`renderNow()` は保留中の rAF を `cancelAnimationFrame` で取り消してから同期描画する（svg-renderer.ts:949-956）ため、単一描画でループなし。スロットリングされたタブでも即時反映される正しい設計。
- **状態同期（グリッジなし）**: `progressLineVisible` はパレットボタン（`palette-progress-line-toggle`）と property-panel 制御（`toggle-progress-line`）が単一 `applyVisible` を経由し、フリップ時に両制御を lock-step で再同期（main.ts:1673-1693）。data-role は全 22 件ユニーク（重複解消済み）。
- **2 クリック矩形指定の状態機械**: `boxPlacement.firstCorner` の 2 状態遷移は原子的で、Esc/再アームで確実に解除（editing-controller.ts:536-596, 919-922）。`roundedBoxRectFromCorners` が日付・行を順序化し、`clampRowIndexToSection` で単一セクションにクランプ。中間不正状態は観測不能。

### R5 パフォーマンス — PASS
- 追加ロジックに O(n²) 以上・N+1・リスナー/タイマー解放漏れ・循環参照なし。`renderNow` の同期描画はユーザークリック時のみ発火（低頻度）で NFR に影響しない。`screen-capture` は data URL 経由でオフスクリーンキャンバスへ一度だけ描画、blob revoke は `setTimeout(...,0)` で確実。

### テスト品質（補助所見）— 良好
- `cr006-screen-copy.test.ts`: clipboard 成功・write 拒否→download・非対応→download の 3 分岐を決定論的にスタブで網羅。
- `cr006-box-placement.test.ts`: fake host + mock renderer でキャプチャ相 pointerdown を直接駆動し、2 クリックが実際に store を変異させること・Esc キャンセルで生成されないことを end-to-end で検証（空虚でない）。
- `cr006-modal-locale.test.ts`: ja/en でプロンプトが異なり識別子・schema・ショートカットが英語/ASCII のまま byte-identical であることを検証。

## 4. 指摘対応テーブル

| No | 重大度 | 観点 | 箇所 | 問題 | 影響 | 修正案 | 対応 |
|----|--------|------|------|------|------|--------|------|
| 1 | Low | R2(PIE/POLA) | `src/app/main.ts:544-546` | SS ボタンのインラインコメントが「screenshot ... as a PNG download」と旧仕様（CR-003）のまま。CR-006 Part 3 で SS は「クリップボードへ画像コピー（不可時のみ download フォールバック）」に変更済み。アクセシブル名 `'Screenshot viewport (PNG)'` もクリップボードコピーの意味を伝えていない。 | 動作は正しく（ハンドラは clipboard→download）機能影響なし。コメントが現挙動と不一致で保守時の誤読を招く。a11y は成果トーストが実挙動を通知するため WCAG 4.1.2 は不合格に至らない。 | コメントを「copy the CURRENT viewport to the clipboard as a PNG (falls back to a download when unsupported/denied)」に更新。アクセシブル名を `'Copy viewport image to clipboard (PNG)'` 等へ調整を推奨。 | 記録のみ（Low） |

## 5. 総合判定

**PASS**

- Critical: **0 件**（合格）
- High: **0 件**（合格）
- Medium: **0 件**
- Low: **1 件**（記録のみ。フェーズ遷移をブロックしない）

品質ゲート（tsc 0 / vitest 640-640 全緑 / eslint 0）を満たし、Critical・High 指摘ゼロのため、CR-006 実装のフェーズ遷移を許可する。Low 指摘 No.1 は次回のパレット/ヘッダー系タッチ時に併せて是正することを推奨する。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-21 | 1.0 | 初版（CR-006 実装 R2-R5 レビュー。PASS） | review-agent |
