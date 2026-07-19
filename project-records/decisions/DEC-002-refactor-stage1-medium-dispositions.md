# DEC-002: リファクタリング Stage 1 — 中位指摘 M-5 / M-6 の据置き判断

- 日付: 2026-07-19
- 種別: リファクタリング方針判断（defect 修正の方法。CLAUDE.md「Claude Code が自律判断してよい」範囲）
- 決定者: implementer（Stage 1 リファクタリングの一環）
- 関連: `project-records/reviews/review-checkpoint-svg-main-godobjects.md`（R2/R3/R4/R5/R6/R7）, RISK-001, review-standards R5.1 / R7.6

## 背景

チェックポイントレビュー（`review-checkpoint-svg-main-godobjects.md`）の指摘のうち、Stage 1 では
以下の 4 件を behavior-preserving に適用した:

- **R1（H-2）**: `src/app/main.ts` の `bootstrap()`（約667行）を機能別 `wire*()` に分割
- **R7（M-2）**: ドメインの引数/ローカル `document` → `scheduleDocument` 改称
- **R5（M-3）**: 描画/シェルの色リテラルを design token 参照へ集約
- **R2（M-1）**: 座標変換を `ViewTransform` 値オブジェクトへ集約（`toContent`/`toClient` と逆変換）

残る中位指摘のうち **M-5**（`@purity` タグ）と **M-6**（O(n) ヒットテスト）は Stage 1 では実施せず、
本 decision で据置き（DEFERRED）とその根拠を記録する。

## 決定

### M-5（`@purity` タグ全関数付与, review-standards R7.6）= DEFERRED（別パスへ）

Stage 1 では付与しない。理由:

- 付与対象は `src/**` の 1200 超の関数/メソッドに及ぶ大規模な機械的アノテーションであり、
  behavior-preserving リファクタリング（R1/R2/R5/R7）とは独立した別種の作業。混在させると
  差分レビューが座標・配線・命名の変更（本 Stage の主眼）から逸れる。
- レビュー自身が「純粋/非純粋の物理分離は概ね健全（domain=純粋計算中心 / adapters=副作用）で、
  運用実態は標準の意図に沿う」と評価しており、正しさ上の欠陥ではない。
- R7.6 は対象コード作成後に更新された標準であり、段階導入が妥当。

**次アクション**: `@purity` は独立パスとして、domain/usecase（純粋核）から着手し、CI に grep 検査を
追加する。着手時期は未定（Stage 2 と切り離す）。

### M-6（`hitTest` / `updateHoverCursor` の pointermove 毎 O(n) 走査, R5.1）= DEFERRED（ベンチ計測後に判断）

Stage 1 では最適化しない。理由:

- YAGNI。現状 NFR-L1-002（中規模 ~1000 アイテムで 60fps）は満たしている可能性が高く、レビューも
  「現時点は許容」と評価。空間分割（行インデックスによる列走査の事前絞り込み等）は複雑度を上げる。
- 本プロジェクトの性能判断は **RISK-001 の性能 PoC ゲート**（DEC-001）に従う。ホバー中の O(n) 走査が
  実際にフレーム落ちを生むかは、`app/benchmark.ts` に 1000 アイテムのホバー計測を足して実測してから
  判断すべきで、投機的最適化は避ける。
- 性能 PoC の実行はユーザー通知が必要（MEMORY: perf-test-notify, RISK-001 gate）。したがって Stage 1 の
  自律作業では踏み込まない。

**次アクション**: RISK-001 性能 PoC の実施時に、1000 アイテムのホバー hitTest を計測項目へ追加し、
NFR 逼迫が確認された場合にのみ空間分割を導入する。

## 根拠

- Stage 1 の目的は「保守性 High（god-object 2件）と座標ずれ型 defect の予防」を behavior-preserving に
  進めること。M-5/M-6 はいずれも正しさの欠陥ではなく、混入させると回帰リスクと差分ノイズが増える。
- 全 503 テスト（unit 427 + Playwright 82、うち transform ピン留め 6 本を新規追加）が緑で、単一 HTML
  ビルドも自己完結（CSP hash 整合・NUL なし）を維持。M-5/M-6 の据置きは品質ゲートに影響しない。

## 帰結・残留リスク

- **残留（M-5）**: `@purity` の機械的検査（R7.1-R7.9）は当面不能。物理分離は健全なため実害は低い。
- **残留（M-6）**: アイテム数が NFR 上限に近づくとホバー時のフレーム余裕が減る可能性。RISK-001 PoC の
  計測で監視する。
- Stage 2（svg-renderer のレイヤ分割 + HitTester 抽出 + jsdom 単体テスト, レビュー R3/R4/R6）は本 Stage の
  `ViewTransform` と `wire*` シームを土台に別途実施する。M-6 の hitTest 最適化は Stage 2 の HitTester 抽出時に
  再評価するのが自然。

## Footer（更新履歴）

- 2026-07-19 implementer 初版作成（Stage 1 リファクタリングの中位指摘据置き判断）
