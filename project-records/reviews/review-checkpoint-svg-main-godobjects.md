# レビュー報告: チェックポイント・コードレビュー（svg-renderer / main 肥大化）

- 対象: `src/**`（重点: `src/adapters/render/svg-renderer.ts`, `src/app/main.ts`, `src/adapters/input/editing-controller.ts`, `src/domain/usecase/*`, `src/domain/command/commands.ts`, `src/domain/model/*`）
- 適用観点: R2（設計原則）, R3（コーディング品質）, R4（並行性・状態遷移）, R5（パフォーマンス）, R6（テスト品質）, R7（純粋性）
- 基準: `process-rules/review-standards.md`（R1-R7、更新版）
- 日付: 2026-07-19
- レビュアー: review-agent
- 種別: リファクタリング判断のためのチェックポイントレビュー（READ-ONLY。src/tests 未変更）

---

## 総合判定: FAIL（保守性 High 2件）

補足: 機能誤動作・データ破損・セキュリティ・並行性の **Critical は 0件**。アプリは機能的には出荷可能。
FAIL の要因は「保守性の著しい低下」に該当する god-object 2件（High）。これらは正しさの欠陥ではなく、
以降の機能追加を続ける前に分割すべきリファクタリング対象。routing 先は implementation フェーズ。

| 重大度 | 件数 |
|--------|------|
| Critical | 0 |
| High | 2 |
| Medium | 6 |
| Low | 3 |

### 良好だった点（PASS）
- **DIP / Clean Architecture（R2.16, R7.2）**: `src/domain` から `adapters` への import は 0件。domain に DOM/window/localStorage/crypto の混入なし。crypto は `adapters/security/watermark-password.ts` に、DOM 描画は `adapters/render` に、永続化は `adapters/io` に正しく分離。依存方向は内向き。優秀。
- **エラーハンドリング（R3.1, R3.2）**: catch 12箇所すべてが文脈付きでログ（`describeError`）するか、握りつぶす場合も理由コメントあり（localStorage privacy-mode 等）。素の空 catch なし。
- **構造化ログ（規約）**: 素の `console.*` は logger 内部の1箇所のみ（`src/app/logger.ts`）。名前空間付きロガー（`createLogger('grsch:...')`）を全面採用。
- **並行性（R4）**: 単一スレッド + rAF バッチ。`requestRender` が二重スケジュールをガードし、`renderNow` が保留 rAF を cancel。await 跨ぎの共有状態競合は検出されず。

---

## 指摘一覧（重大度順）

### [H-1] svg-renderer.ts が god-object（2935行・単一クラス60超メソッド） — R2.2 SRP / R2.11 SLAP — High
- 箇所: `src/adapters/render/svg-renderer.ts:238`（class SvgRenderer）全体
- 問題: 1クラスが grid / date-gridlines / category-gridlines / classification-lines / previous-plan-ghosts / date-ruler / watermark / today-line / dual-cursor / cursor-guide / illuminated-line / rounded-boxes / comments / dependencies / items / fade-handles / selection-outline / focus-ring / hit-test（item/fade/annotation/dependency の4系統）/ input-handlers（pointer/wheel）/ layout / viewport-math / coordinate-transform を単独で担う。変更理由が10以上あり、機能バッチごとに本ファイルへ付け足された痕跡（各 `render*`/`draw*`/`hitTest*` メソッド群）。
- 影響: 保守性の著しい低下。ある機能（例: watermark）の変更が無関係な描画パスに波及しうる。テスト容易性も低下（H-4 と連動）。
- 修正案: feature seam で分割。描画レイヤ別モジュール（`GridLayer`/`RulerLayer`/`WatermarkLayer`/`DependencyLayer`/`CommentLayer`/`ItemLayer`/`CursorGuideLayer`）へ抽出し、`SvgRenderer` はレイヤの合成 + rAF スケジューリング + 共有 viewport/座標変換の提供に縮小。hit-test も種別ごとに `*HitTester` へ分離。詳細はリファクタリング計画 §R1-R3 参照。

### [H-2] main.ts bootstrap() が god-function（単一関数約667行） — R2.2 SRP / R2.11 SLAP — High
- 箇所: `src/app/main.ts:689`（`function bootstrap()`、〜1356行）
- 問題: 1関数が theme / watermark / language / plan-actual / cursor-guide / grid-date / grid-category / comment / box / fullscreen / today / link / font / properties-panel / palette-minimize / keyboard の各機能の DOM 配線・同期クロージャ（`sync*`）・イベントハンドラを直列に列挙。高レベル意図（「シェルを配線する」）と低レベル詳細（個別 addEventListener）が同一抽象レベルに混在。
- 影響: 保守性の著しい低下。特定機能の配線を追う際に667行を読む必要があり、機能追加のたびに本関数が伸びる（OCP 反）。
- 修正案: 機能単位の `wireTheme(chrome, deps)` / `wireWatermark(...)` / `wireGridToggles(...)` / `wirePlanActual(...)` / `wireCursorGuide(...)` 等へ分割し、bootstrap は依存の生成と各 wire 関数の呼び出しに縮小。`buildChrome()`（314行, `main.ts:375`）も同様にセクション別ヘルパへ。

### [M-1] `worldToScreen`（client空間）と `worldToScreenX/Y`（SVGコンテンツ空間）の名称衝突 — R2.14 POLA / R2.1 命名 — Medium
- 箇所: `src/adapters/render/svg-renderer.ts:638`（`worldToScreen`、rect.left/top を加算＝client空間） vs `:1658-1665`（`worldToScreenX/Y`、rect を含まない＝SVGローカル空間）
- 問題: ほぼ同名の2系統が `rect.left/top` の有無だけ異なる。描画コードで誤って client 版を呼ぶと viewport オフセット分ずれる。まさに「テストは緑だが実機でずれる」型の罠の温床。
- 影響: 将来のオーバーレイ追加時に座標ずれ defect を誘発。
- 修正案: 意図を叫ぶ命名へ改称。client 空間版 → `worldToClientPoint` / `screenToWorld`（既存の対）、SVG ローカル版 → `worldToContentX/Y`。または座標変換を単一の値オブジェクト（`ViewTransform`）へ集約し、`toClient()` / `toContent()` を明示メソッド化。

### [M-2] ドメイン引数名 `document` が DOM グローバル `document` を shadow — R2.14 POLA / R2.1 命名 — Medium
- 箇所: `src/domain/command/commands.ts`（`execute: (document) => ...` 多数）, `src/domain/command/annotation-commands.ts:32,48,58,197`, `src/domain/usecase/classification-tree.ts:295,301` ほか
- 問題: ブラウザ実行環境ではグローバル `document`（DOM）が存在するため、ドメインの `ScheduleDocument` 引数を `document` と命名すると `document.annotations` 等が DOM アクセスに誤読される。実害はない（ローカルスコープが優先）が、命名は最重要観点（R2.1 MUST）であり、DOM 混入を疑わせる名は避けるべき。
- 影響: 可読性・誤読リスク。DIP レビューの自動 grep（DOM 使用検出）にも偽陽性を出す。
- 修正案: `scheduleDocument`（既存の他所での命名と一致）または `doc` へ統一改称。

### [M-3] 色リテラルの散在（159個・11ファイル） — R2.7 DRY — Medium
- 箇所: `svg-renderer.ts`, `app/main.ts`, `ui/property-panel.ts`, `usecase/svg-exporter.ts`, `usecase/mspdi-codec.ts` ほか（`#rrggbb` 直書き159箇所）
- 問題: 一部は `theme.ts` / `a11y-tokens.ts` / `cud-palette.ts` / `plan-actual-colors.ts` に集約済みだが、描画・シェル層に生の hex が残存。テーマ／WCAG コントラスト調整時に複数ファイルの同期修正が必要。
- 影響: 色の一貫性維持コスト増、a11y（コントラスト）回帰リスク。
- 修正案: 描画で使う色をすべて design token（`theme.ts` / `a11y-tokens.ts`）参照に統一。残す hex は token 定義ファイル内のみに限定。

### [M-4] svg-renderer.ts の単体テストが 0件（最大・最多変更ファイルが E2E 依存のみ） — R6.2 テスト不足 — Medium（H-4）
- 箇所: `tests/**`（`new SvgRenderer` を import する Vitest は皆無。jsdom/happy-dom 使用の単体テストなし）
- 問題: 421本の単体テストはすべて純粋な domain/usecase ロジックを検証。最も肥大化・最多変更の `svg-renderer.ts`（diffRender / patchItemNode / hit-test 統合順序 / rAF パス）は Playwright E2E（82本）のみが実機で検証。これが「単体テストは緑だが実機で壊れる（rAF / CSP-hash / NUL）」再発パターンの構造的原因。E2E はシナリオ限定かつ低速で、レンダラ内部メソッドの境界値を細かく突けない。
- 影響: レンダラ回帰が該当 E2E シナリオがある場合のみ検出。抽出可能な純粋ロジック（hit-test 順序決定は既に `pickItemHit`/`pointInLabelBox` として分離済み）以外の統合部分がテスト空白。
- 修正案: H-1 の分割後、各 Layer / HitTester を注入可能にし、`@vitest-environment jsdom` で SVG ノード構築を単体検証。最低限、diffRender の create/patch/remove カウントと hit-test 種別優先順位（fade > body-edge > body > label、および dependency/annotation との横断順序）を real-DOM で assert する回帰テストを追加。

### [M-5] `@purity` タグが全コードで 0件 — R7.6（MUST・更新版標準） — Medium
- 箇所: `src/**` 全関数（1200超）に `@purity` タグなし
- 問題: 更新版 review-standards R7.6 は全関数/メソッドに `@purity`（pure/semi-pure/semi-pure-b/non-pure）コメントを MUST とするが、コードは標準更新前に書かれており未付与。grep 検査で 0 ヒット。
- 影響: 純粋性の機械的検査（R7.1-R7.9）が不能。ただし実コードの純粋/非純粋の物理分離自体は概ね健全（domain=純粋計算中心、adapters=副作用）で、運用実態は標準の意図に沿う。
- 修正案: 標準適用対象とするなら段階導入。まず domain/usecase（純粋核）から `@purity` を付与し、CI で grep 検査を追加。据置きとする場合は `project-records/decisions/` に据置き decision を記録（R7 は今回対象コードの作成後に更新された経緯を明記）。

### [M-6] hitTest / updateHoverCursor が pointermove ごとに全 placement を線形走査 — R5.1 — Medium/Low
- 箇所: `src/adapters/render/svg-renderer.ts:667`（`hitTest` の `for (const placement of this.placements)` を複数回）、`editing-controller.ts:300`（`updateHoverCursor` が pointermove で hitTest 呼出）
- 問題: 1回の hitTest 内で placements を最大3周（fade / body候補収集 / label）。pointermove ごとに O(n)。NFR は中規模 ~1000 アイテム。
- 影響: 1000アイテム時、ホバー中の毎フレーム O(n) 走査。現状 60fps 目標は満たしている可能性が高いが、アイテム増で劣化余地。
- 修正案: 現時点は許容（YAGNI）。将来 NFR 逼迫時は viewport 可視集合への事前 cull（既に描画は cull 済み）や行インデックス（`rowIndexAtWorldY` で行を絞ってから列走査）で空間分割。まずは perf ベンチ（`app/benchmark.ts`）で 1000 アイテムのホバー計測を追加し数値確認。

### [L-1] SVG パスデータ変数 `data` — R2.1 命名 — Low
- 箇所: `svg-renderer.ts:1073, 1842`（`const data = worldPoints...`）
- 問題: SVG `d` 属性文字列に汎用名 `data`。文脈上ほぼ自明だが標準は汎用名を禁止。
- 修正案: `pathData` / `polylinePathD` 等へ改称。

### [L-2] パース結果変数 `value` の汎用名 — R2.1 命名 — Low
- 箇所: `svg-renderer.ts:2795`, `import-sanitizer.ts:370,379`, `json-codec.ts:463` ほか
- 問題: 正規化対象に `value`。ドメイン限定名が望ましい（例: `normalizedColor`, `rawFieldValue`）。
- 修正案: 用途を表す名へ改称。

### [L-3] addEventListener 90 / removeEventListener 7 の非対称 — R5.3 — Low
- 箇所: `src/**`（`window`/`document`/host への登録）
- 問題: 大半はアプリ生存期間の singleton（renderer/controller/shell）で実害なし。ただし将来 renderer を再生成する設計になった場合はリーク源。
- 修正案: 現状は問題なし。renderer に `dispose()` を設け、`attach()` で登録したハンドラを対で解除できる構造を H-1 分割時に用意しておく。

---

## リファクタリング計画（価値/リスク順・上位）

回帰リスク凡例: LOW=純粋な移動・抽出で外部挙動不変 / MED=座標や状態共有の再配線あり / HIGH=描画順序・イベント順序に影響。

| # | リファクタ | 対象 | 価値 | 回帰リスク | 推奨時期 |
|---|-----------|------|------|-----------|----------|
| R1 | main.ts の bootstrap() を機能別 `wire*()` に分割、buildChrome() をセクション別ヘルパに | main.ts (H-2) | 高（可読性・OCP・以降の追加コスト減） | **LOW**（配線の移動のみ、順序保持で挙動不変） | 今すぐ |
| R2 | 座標変換を `ViewTransform` 値オブジェクトへ集約し `toClient()`/`toContent()` を明示化、`worldToScreen*` 改称 | svg-renderer (M-1) | 高（座標ずれ defect 予防） | **MED**（全描画/hit-test の呼出差し替え） | 今すぐ〜近々 |
| R3 | svg-renderer を描画レイヤ別モジュールに分割（Grid/Ruler/Watermark/Dependency/Comment/Item/CursorGuide Layer） | svg-renderer (H-1) | 最高（保守性の根治） | **HIGH**（描画順序・overlay/content group 共有・rAF 統合を再設計） | 段階的（R1/R2 の後） |
| R4 | hit-test を種別ごとの `*HitTester` に分離し優先順位を単一の合成関数へ | svg-renderer (H-1, M-4) | 高（テスト容易性・順序の明示化） | **MED**（既存 `pickItemHit` 等の純粋関数を再利用できるため中） | R3 と同時 |
| R5 | 色リテラルを design token 参照に統一（描画・シェル層の生 hex 撤去） | 11ファイル (M-3) | 中（a11y/テーマ一貫性） | **LOW**（定数への置換） | 近々 |
| R6 | svg-renderer 分割後、各 Layer/HitTester に jsdom 単体テストを追加（diffRender カウント・hit-test 優先順位） | tests (M-4) | 高（「緑だが実機で壊れる」根治） | **LOW**（テスト追加のみ） | R3/R4 の直後 |
| R7 | ドメイン引数 `document` → `scheduleDocument` 一括改称 | commands / classification-tree ほか (M-2) | 中（誤読・grep 偽陽性の解消） | **LOW**（機械的リネーム） | 今すぐ |
| R8 | `@purity` タグの段階導入（domain/usecase から）または据置き decision 記録 | src 全体 (M-5) | 中（標準準拠・純粋性検査の自動化） | **LOW** | 方針決定後 |

推奨着手順: **R1 → R7 → R5**（いずれも LOW リスクで即効）→ **R2**（MED）→ **R3 + R4 + R6**（レンダラ根治、HIGH を含むため慎重に、E2E を安全網に段階適用）。

---

## 出荷可否の明示

- **機能・安全性の観点では出荷可能**: Critical 0、セキュリティ/並行性/データ破損の High も 0。DIP・エラー処理・ログ・rAF は健全。
- **品質ゲート（CLAUDE.md: High=0）では FAIL**: 保守性 High が2件（H-1 svg-renderer, H-2 main.bootstrap）。これらは正しさの欠陥ではないが、リファクタリングを続けるなら「以降の機能追加を積む前」に少なくとも R1（LOW リスク）を適用し、R3/R4 を計画化すべき。
- 公開（publish）前に必須ではないが強く推奨: **R1（main 分割・LOW）と R2（座標変換集約・MED）**。これらは M-1 の座標ずれ型 defect（実機回帰の常習パターン）を将来的に予防する。

---

## 指摘対応テーブル

| ID | 重大度 | 観点 | 対応 | 記録 |
|----|--------|------|------|------|
| H-1 | High | R2.2/R2.11 | 未対応（リファクタ R3/R4 提案） | orchestrator トリアージ待ち |
| H-2 | High | R2.2/R2.11 | 未対応（リファクタ R1 提案） | orchestrator トリアージ待ち |
| M-1 | Medium | R2.14/R2.1 | 未対応（R2 提案） | 〃 |
| M-2 | Medium | R2.14/R2.1 | 未対応（R7 提案） | 〃 |
| M-3 | Medium | R2.7 | 未対応（R5 提案） | 〃 |
| M-4 | Medium | R6.2 | 未対応（R6 提案） | 〃 |
| M-5 | Medium | R7.6 | 方針判断要（段階導入 or 据置き decision） | 〃 |
| M-6 | Medium | R5.1 | 据置き推奨（YAGNI・ベンチ計測後判断） | 〃 |
| L-1 | Low | R2.1 | 据置き可 | 〃 |
| L-2 | Low | R2.1 | 据置き可 | 〃 |
| L-3 | Low | R5.3 | 据置き可（H-1 分割時に dispose 導入） | 〃 |

---

## Footer（更新履歴）

- 2026-07-19 review-agent 初版作成（チェックポイントレビュー、READ-ONLY）
