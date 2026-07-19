# 最終デリバリレビュー報告（R1-R6 全観点 / Phase 6a 納品ゲート）

- 文書ID: REV-DELIVERY-001
- 種別: review（delivery gate）
- 対象: gr-scheduler MVP 全成果物（M1-M5c 実装 + 仕様 + 設計 + トレーサビリティ）
- 適用観点: R1（要求品質）/ R2（設計原則・CA/DIP）/ R3（コーディング品質）/ R4（並行性・状態遷移）/ R5（性能）/ R6（テスト品質）
- レビュー種別: 横断的完全性 + 残存 Critical/High の確認（先行レビューを土台とする再レビュー）
- レビュー日: 2026-07-18
- レビュー担当: review-agent
- 先行レビュー（対応済・再審理しない）: R1-spec-review（PASS）/ R2-R4-R5-design-review（修正済）/ R2-R5-M2-code-review（PASS）/ R2-R5-M3-M4-code-review（H-01 修正 + 回帰テスト）/ M5a-security-review（PASS, Medium 3 は M5b で是正）

## 総合判定: **NO-GO**

| 深刻度 | 件数 |
|--------|------|
| Critical | 0 |
| High | **1** |
| Medium | 3 |
| Low | 3 |

GO 条件は「Critical=0 かつ High=0 かつ 全 Must 要求が実装済」。Critical=0 は満たすが、**High 1 件（F-01: Must 要求 SECT-L1-002 セクション順序入替がユーザー到達不能）** により NO-GO。F-01 は配線のみの小規模修正で解消可能。

---

## 1. 品質ゲート別ステータス（CLAUDE.md 品質目標 = Single Source of Truth）

| 指標 | 目標値 | 実測 / 証跡 | 判定 |
|------|--------|-------------|:----:|
| 単体テスト合格率 | 95% 以上 | `npm run test` → 199 passed / 199（28 files, 100%） | **met** |
| 結合テスト合格率 | 100% | JSON/MSPDI 往復・双方向同期・section+dependency コマンドの結合テスト全 PASS（199 に含む） | **met** |
| コードカバレッジ | 80% 以上（ドメイン重点） | `vitest --coverage`: domain 全体 **89.58% lines / 97.26% funcs**（command 93.4% / usecase 89.6% / model 80%）。adapters/app/framework は計測対象外（Playwright E2E 側） | domain **met** / 全体 **not-met（計測外）** → M-02 |
| E2Eテスト | 主要ユーザーフロー PASS | `tests/e2e/` に **a11y.spec.ts のみ**（axe serious/critical 0）。UC（作成/整列/ズーム/依存線/入出力/透かし）の E2E は未整備 | **not-met** → M-01 |
| 性能テスト | NFR 数値目標達成（60fps/1.5s, 中規模） | PoC（ユーザー立会 2026-07-18）: 1000アイテム/50行 初期 4.6ms / 平均 162.3 FPS / p95 6.20ms → 目標大幅クリア | **met** |
| アクセシビリティ | WCAG 2.1 AA | axe-core（Playwright）serious/critical 0 + 手動チェックリスト（`docs/dev/a11y-wcag21-aa-checklist.md`）。キーボード操作トラップ無し（2.1.2）・可視フォーカス・コントラスト・色非依存・reduced-motion・html lang | **met** |
| セキュリティ脆弱性 | Critical:0 High:0 | `npm audit` → 0 脆弱性。M5a 敵対レビュー PASS（バイパス構築不可）。M5b で CSP/色値/サニタイザ不変条件を是正 | **met** |
| レビュー指摘 | Critical:0 High:0 | 本レビュー: **Critical 0 / High 1（F-01）** | **not-met** |
| コーディング規約準拠 | 違反 0 | `npm run lint`（eslint）違反 0 / `tsc --noEmit` エラー 0 | **met** |
| 成果物制約 | 単一 .html で動作 | `npm run build` → `dist/index.html` **107.95 kB**、外部参照 0（http/https/link/外部 script 無し）、インライン script 1 個 | **met** |
| CSP（成果物制約の一部） | 厳格 CSP 注入 | CSP meta 存在。`default-src 'none'; script-src 'sha256-...'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`。**注入 sha256 = 実 script の sha256 一致を検証済**（不一致ならアプリ起動不能になるが一致 → 起動可） | **met** |

補足: `style-src 'unsafe-inline'`（CSS インライン化と動的スタイルのため）と `img-src data:`（埋込 PNG/SVG）は設計 §4 の残余として明示。style 注入は script 実行不能かつ `connect-src 'none'` で封じ込み。

---

## 2. 要求→実装 完全性（R1/R2）

`project-records/traceability/user-order-coverage.md`（user-order 62項目 → UID 割当漏れ 0）を実 `src/` 実装と突合。コア差別化要素の実装対応:

| 差別化要素 | 主要 UID | 実装ファイル | ユーザー到達 |
|-----------|---------|-------------|:----:|
| マルチバー行 | ITEM-L1-001, CANVAS-L1-002 | layout-engine.ts | ◯ |
| 異方性ズーム + LOD + 仮想化 | ZOOM-L1-001..006, ZOOM-L2/L3-001 | viewport.ts / lod-selector.ts / time-coordinate-mapper.ts / svg-renderer.diffRender | ◯ |
| 上下左右整列 | ALIGN-L1-001..003, ALIGN-L2-001/002 | alignment-solver.ts | ◯ |
| 依存線 9アンカー自動配線 | DEP-L1-001..004, DEP-L2-001/002 | dependency-router.ts（H-01 修正済） | ◯ |
| 予実 + イナズマ線 | PLAN-L1-001..004, PLAN-L2-001 | progress-line-builder.ts | ◯ |
| セクション/タブ | SECT-L1-001,003,004,005,006 | section-organizer.ts / left-pane.ts | ◯ |
| **セクション順序入替** | **SECT-L1-002（Must）** | commands.reorderSectionCommand / section-organizer.moveSectionToIndex / left-pane.reorderSection | **✗ UI 未配線（F-01）** |
| JSON/MSPDI/SVG I/O | IO-L1-001..006 | json-codec / mspdi-codec / svg-exporter / import-sanitizer / adapters/io | ◯ |
| 透かし | TOOL-L1-007, TOOL-L2-001/002/003 | watermark-builder.ts（画面 + SVG 出力共用） | ◯ |
| i18n（値 + UI ラベル en/ja） | PROP-L1-003/004 | i18n.ts | ◯ |
| a11y（WCAG 2.1 AA） | NFR + M5c 群 | contrast / accessible-name / a11y-tokens / keyboard-commands / a11y-stylesheet / live-region / keyboard-navigation | ◯ |

**Must 要求の未到達 = 1 件**: SECT-L1-002（セクション順序入替）。ドメインコマンド `reorderSectionCommand` + `moveSectionToIndex` は実装・テスト済で、`left-pane.reorderSection(sectionId, targetIndex)` も公開されているが、これを呼び出す UI アフォーダンス（ドラッグ／ボタン／キーボード）が全 `src/` に存在しない（grep で呼出元 0 を確認、当該メソッドのコメントも "Exposed for a future drag-reorder affordance"）。→ **F-01（High）**。

なお行の縦移動（行入替に相当）はキーボード nudge（`deltaRows`, `keyboard-navigation.ts:111 nudgeSelection`）でユーザー到達可能であり、Must 未到達には該当しない。ドラッグ版 UI ジェスチャは強化項目として据置き可。

---

## 3. 横断的整合性（命名・CA/DIP・デッドコード）

- **Clean Architecture / DIP**: `src/domain/**` に DOM グローバル（`document.`/`window.`/`localStorage`/`createElement`/`querySelector`/`addEventListener`/`innerHTML`/`DOMParser`）の実使用なし（`document.` は全て `ScheduleDocument` 引数、`window.` は `ViewportWindow` 引数、`DOMParser` はコメントのみ）。domain の import は domain 内（time-coordinate-mapper 等）のみで、adapters/app への依存 0。依存方向は内向き。**全 M1-M5c を経ても CA/DIP 維持**。
- **注入シンク**: `innerHTML` は property-panel.ts:65 と main.ts:109 の 2 箇所のみ、いずれも `= ''`（クリア）。`outerHTML`/`insertAdjacentHTML`/`eval`/`new Function`/`document.write` は 0 件。ラベル/略称/透かし/コメントは `textContent` または `escapeSvg` 経由で inert。
- **命名（言霊）**: スポットチェックで `plan_actual_status`／`planActualKind`／`obstacleOverlap`／`illuminatedLine`／`rectByItemId`／`isSameItemRect`／`resolveCanvasKeyCommand` 等ドメイン限定の説明的命名を確認。裸の `data`/`info`/`tmp`/`obj` 無し。（kotodama-kun による全成果物の正式チェックは未実施 → L-02）
- **デッドコード/矛盾**: `left-pane.reorderSection` は現状呼出元 0（F-01 の裏返し。ドメインは生きているが UI 死線）。`schedule-model.ts` の `Dependency.bends` は advisory キャッシュで未使用（先行 L-03、実害なし）。他に矛盾コードなし。

---

## 4. 新規（M5b/M5c）モジュールの残存 Critical/High 確認

先行コードレビュー未実施の M5b/M5c を精査。**新規 Critical/High なし**。

- **color-validator.ts（M5b, M5a-M3 是正）**: 純関数。許可リスト（hex/rgb/hsl/CUD パレットキー・値/安全キーワード）+ `url(`/`expression`/`javascript:`/`image(` の多層拒否。`isSafePaintValue` は内部フラグメント参照 `url(#id)` のみ許可、外部 `url(http…)` を拒否。**import-sanitizer.ts:407（SVG paint 属性）と json-codec.ts:132（色フィールド）の両経路に配線済**。→ M5a-M3（色値未検証）解消を確認。◯
- **watermark-builder.ts（M5b）**: 純関数。タイル数を `MAX_TILES=2000` でハード上限（極小ズーム/巨大キャンバスでも爆発しない）。label は exporter で `escapeSvg`、renderer で `textContent`（inert, XSS 経路なし）。◯
- **i18n.ts（M5b）**: 純関数。フォールバック連鎖（active→default→any→空文字）で翻訳欠落でも描画破綻しない。property NAME は経由させず英語固定（PROP-L1-004 維持）。◯
- **CSP 注入（vite.config.ts injectStrictCsp, M5b, M5a-M2 是正）**: post ビルドで inline script を sha256 化し meta 注入。ハッシュ一致検証済（§1）。→ M5a-M2（CSP 不在）解消を確認。◯
- **keyboard-navigation.ts（M5c）**: 端点で Tab を離脱許可し `preventDefault` しない（2.1.2 キーボードトラップ無し）。矢印 nudge/リサイズ/配置/取消を明示分岐。◯
- **a11y-stylesheet / live-region / contrast / accessible-name / a11y-tokens（M5c）**: axe-core serious/critical 0 で裏付け。◯

---

## 5. 先行レビュー指摘の解消検証（再レビュー）

| 由来 | ID | 内容 | 検証結果 |
|------|----|------|----------|
| M3/M4 code review | H-01 | 依存線端点の自己除外が参照同一性で機能せず実障害物貫通 | **解消**: `Rect.itemId` 追加 + `isSameItemRect` による安定 ID/値比較で除外（dependency-router.ts:164-175）。renderer は `rectByItemId` Map で同一 Rect インスタンスを obstacle/端点に再利用（svg-renderer.ts:1185-1211）。L-02（脆い契約）も同時解消 |
| M3/M4 code review | M-01 | routeDependency の O(V²) | **緩和**: corridor（端点バウンディングボックス+margin）で obstacle を剪定（dependency-router.ts:150-175）。PoC 162 FPS で実測上も問題なし |
| M5a security | M-1 | 自前 SVG サニタイザの堅牢化 | **是正**: サニタイザ不変条件テスト（sanitizer-invariant.test.ts）追加、消費経路 `<image>`/data URI 限定を固定化 |
| M5a security | M-2 | 厳格 CSP 未注入 | **是正**: ビルド後 sha256 自動注入（§1・§4）。ハッシュ一致検証済 |
| M5a security | M-3 | 色値未検証 | **是正**: color-validator を両経路に配線（§4） |
| M2 code review | M2-M-01/02/03 | 履歴汚染/再レイアウト/milestone endDate | 先行レビューで解消済（回帰維持を本レビューでも確認） |

---

## 6. 指摘一覧

| ID | 深刻度 | 観点 | 箇所 | 指摘 | 対応 |
|----|--------|------|------|------|------|
| F-01 | **High** | R2/R1 | left-pane.ts:290 / commands.ts:264（呼出元 0） | Must 要求 SECT-L1-002（★item36 セクション順序入替）のドメイン実装・テストは存在するが、`reorderSection` を呼ぶ UI アフォーダンスが無く**ユーザーが機能を実行不能**。全 Must 実装のゲート条件を満たさない | **要修正**（下記修正案） |
| M-01 | Medium | R6 | tests/e2e/ | 主要ユーザーフロー E2E が a11y.spec.ts のみ。UC（作成/整列/ズーム/依存線/入出力/透かし）の Playwright E2E 未整備。CLAUDE.md「E2E 主要フロー PASS」の証跡不足 | test-engineer で M6/testing フェーズに整備 |
| M-02 | Medium | R6 | vitest coverage 設定 | カバレッジ計測が domain 層のみ（adapters/app/framework は E2E 側で未計測）。全体 80% を数値で保証できない | test-engineer が計測範囲を定義（E2E カバレッジ含む）し全体値を明示 |
| M-03 | Medium | R1 | project-records/traceability/ | `traceability-matrix.md` 未作成（user-order-coverage.md のみ）。要求→設計→テストの DEEP TRACE/MATRIX が単一制御文書に集約されていない | 納品サインオフ前に生成推奨 |
| L-01 | Low | 運用 | CI | GitHub Actions（lint/type-check/test/build 検証）未整備 | M6/納品で整備 |
| L-02 | Low | R2/命名 | 全成果物 | kotodama-kun による正式な用語/命名チェック未実施（本レビューのスポットチェックは良好） | 納品前に実施推奨 |
| L-03 | Low | R5 | svg-renderer.ts オーバレイ | 先行 M-02（オーバレイ毎フレーム再構築・角丸/コメントのカリング無し）は据置き。装飾数比例で item 数非依存、PoC 通過のため実害小 | M6 リファクタ時に対応可 |

**件数**: Critical 0 / High 1 / Medium 3 / Low 3

---

## 7. F-01（High）詳細と修正案

- **現象**: `SECT-L1-002`（Must）は「セクション単位で表示順序を入れ替えられること」を要求。ドメインには `moveSectionToIndex`（純関数・冪等・0..n-1 密再付番）と `reorderSectionCommand`（no-op 検出付き undoable）があり `section-organizer.test.ts`/`section-dependency-commands.test.ts` で検証済。`left-pane.ts:290 reorderSection()` も公開済。しかしこのメソッドを呼ぶ入力ハンドラ（`dragstart`/ボタン/キーボード）が `src/` 全体に存在しない（grep 確認）。
- **影響**: エンドユーザーはセクション順序を変更できない。★ 明示の Must 差別化機能が MVP で操作不能。納品ゲートの「全 Must 実装」条件を満たさない。
- **なぜ既存テストで検出されないか**: ドメイン/コマンドは単体テストされ、`reorderSection` メソッドもテストから直接呼ばれるため緑。UI 配線の欠落は E2E（未整備・M-01）でしか露見しない。
- **修正案（いずれか、いずれも小規模）**:
  1. `left-pane.ts` のセクション見出しに ▲/▼（上げ/下げ）ボタンを追加し `reorderSection(id, currentIndex∓1)` を dispatch（最小・a11y 親和的）。
  2. セクション見出しに `draggable` + `dragstart/dragover/drop` を実装しドロップ位置の index を算出して `reorderSection` を dispatch（user-order の想定 UX）。
  3. キャンバスフォーカス時の追加キーボードコマンド（例: Alt+↑/↓）で選択セクションを移動。
  - 推奨: 1（即納品可・WCAG 適合が容易）を最小修正で入れ、2 を後続強化。**修正後、UI からの reorder を検証する E2E ケースを追加**（M-01 の一部を先行）。

---

## 8. 据置き（deferred）項目のデリバリ判定

`project-management/pipeline-state.md` の未配線/未処理フォローアップを個別評価:

| 項目 | 判定 | 根拠 |
|------|:----:|------|
| セクション drag 並替 UI ジェスチャ（command/test 済） | **ブロッカー** | SECT-L1-002 は Must。ユーザー到達不能 → F-01。要配線 or 正式据置き decision（Must のため配線を推奨） |
| 行並替 UI/行縦 nudge | 許容 | 行縦移動はキーボード nudge（deltaRows）で到達可能。drag 版は強化項目 |
| traceability-matrix.md 未作成 | 許容（要フォロー） | user-order-coverage.md で漏れ 0 は保証済。DEEP TRACE 集約は納品サインオフ前に生成推奨（M-03） |
| kotodama-kun 用語チェック未実施 | 許容（要フォロー） | 本レビュー命名スポットチェックは良好。正式実行を納品前に推奨（L-02） |
| CI 未整備 | 許容 | 単一 HTML・ローカル検証は全通過。チーム拡大/継続開発前に整備（L-01） |
| DOMPurify 採用 → license-checker | N/A（解消） | DOMPurify 不採用（runtime 依存 0 維持）。`@axe-core/playwright`(MPL-2.0) は dev 専用・製品バンドル非混入。license-checker/SCA で最終確認推奨 |
| M1 実ファイルパスと 30-architecture の差異 | 許容 | フルビルド成立で機能整合。ドキュメント整合は納品時に追随 |
| M5a Medium（M-1/M-2/M-3） | 解消 | M5b で全是正（§5 で検証） |

---

## 9. 判定と推奨戻り先

- **Critical: 0**。単一 HTML・CSP・セキュリティ・性能・a11y・lint/tsc・単体テスト（199/199）は全て目標達成。
- **High: 1（F-01）** かつ **Must 要求 1 件（SECT-L1-002）がユーザー到達不能** → GO 条件（Critical=0 かつ High=0 かつ 全 Must 実装）を満たさない。
- **総合判定: NO-GO**。

**推奨戻り先: コード修正フェーズ（implementation 相当）**
- F-01: `left-pane.ts` に §7 修正案 1 のセクション上下移動アフォーダンスを配線し、UI→reorder の E2E を追加 → 本 review-agent に再レビュー依頼。
- 並行して Medium（M-01 主要フロー E2E / M-02 全体カバレッジ計測 / M-03 traceability-matrix）の対応方針を orchestrator 承認のうえ testing/納品フェーズで解消。
- F-01 は配線のみの局所修正で、設計（Ch3-4）差戻しは不要（設計は正しく、UI 配線欠落）。

---

## 10. 検証コマンド実行ログ（2026-07-18）

| 検証 | コマンド | 結果 |
|------|---------|------|
| 単体/結合テスト | `npm run test`（vitest run） | 199 passed / 28 files |
| カバレッジ | `npx vitest run --coverage` | domain 89.58% lines / 97.26% funcs（全体は adapters/app 計測外） |
| Lint | `npm run lint`（eslint） | 違反 0 |
| 型チェック | `npx tsc --noEmit`（strict） | エラー 0 |
| ビルド | `npm run build`（tsc + vite singlefile） | `dist/index.html` 107.95 kB、外部参照 0、script 1 |
| CSP 検証 | sha256(inline script) vs CSP meta | 一致（アプリ起動可） |
| 依存監査 | `npm audit` | 0 vulnerabilities |
