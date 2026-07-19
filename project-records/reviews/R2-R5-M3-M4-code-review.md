# コードレビュー報告: M3 + M4 実装（R2 / R3 / R4 / R5）

- **対象マイルストーン**: M3（セクション/行整理 + 依存線自動配線 + 左ペイン）+ M4（予実/イナズマ線 + カーソル/コメント/角丸ボックス）
- **適用観点**: R2（設計原則・Clean Architecture・DIP）、R3（コーディング品質・堅牢性・セキュリティ）、R4（並行性・状態遷移）、R5（パフォーマンス）
- **レビュー種別**: 実装コードレビュー（M3/M4 追加分 + M1/M2 への回帰）
- **レビュー日**: 2026-07-18
- **レビュー担当**: review-agent
- **前回レビュー**: `project-records/reviews/R2-R5-M2-code-review.md`（M2, PASS）
- **総合判定**: **FAIL**（Critical 0 / **High 1** / Medium 2 / Low 6）

## 検証コマンド結果

| 検証 | 結果 |
|------|------|
| `npm run test` (vitest) | **96 passed / 14 files** |
| `npm run lint` (eslint) | 違反 0 |
| `npx tsc --noEmit` (strict) | エラー 0 |
| `npm run build` (tsc + vite singlefile) | 成功、`dist/index.html` 単一ファイル 66.95 kB |

自動検証はすべてグリーン。判定 FAIL は下記 H-01（自動テストの網羅外にある結合経路の論理不具合）による。

## レビュー対象範囲

- M3 新規: `section-organizer.ts` / `dependency-router.ts` / `left-pane-layout.ts` / `left-pane.ts`
- M4 新規: `annotation.ts` / `progress-line-builder.ts` / `cursor-span.ts` / `annotation-commands.ts`
- 変更: `schedule-model.ts` / `commands.ts` / `svg-renderer.ts` / `editing-controller.ts` / `property-panel.ts` / `main.ts` / `sample-data.ts`
- テスト: 8 ファイル（section-organizer / dependency-router / left-pane-layout / section-dependency-commands / property-edit-invariants / progress-line-builder / cursor-span / annotation-commands）

---

## ファイル別所見

### `src/domain/usecase/dependency-router.ts`（R2/R5 中核）
- 9アンカー幾何は `ANCHOR_FRACTIONS` の純データ表引きで、`anchorPoint` は矩形上に厳密に着地（DEP-L1-002）。端点が常に候補経路の先頭/末尾に来るため、描画線はアンカー幾何で終端する。**◯**
- **折れ点 0..3 の証明**: 候補は straight(0) / L(1) / Z(≤2) / staircase(≤3) のみを生成し、`bends = points.length - 2` が `maxBends`(=3) を超える候補は `continue` で除外。生成側で最大3、正規化は併合のみで折れ点を増やさないため、返却経路は常に 0..3。L字が必ず生成されるので解は必ず存在。**◯**（`dependency-router.test.ts` が全アンカー対で検証）
- **停止性・計算量**: 探索は列挙型で有界・多項式。指数的探索なし。ただし後述 M-01 の通り障害物数に対し O(V²)。
- **オーバーラップ選定の健全性**: `segmentInsideRectLength` は水平/垂直セグメントのみ扱い、全候補が直交なので妥当。lexicographic (overlap, bends, length) の順序も妥当。**ただし端点自己除外が壊れている（H-01）。**
- 端点除外を**参照同一性**（`obstacle !== fromRect`）で行う契約は脆弱（L-02）。

### `src/domain/usecase/section-organizer.ts`（R2 純粋性）
- 全関数が純粋・副作用なし。DOM 非依存。`moveSectionToIndex` は密な 0..n-1 番号再付与で冪等・隙間なし（SECT-L1-002）。`setSectionCollapsed` は無変更時に**同一参照**を返し、コマンド層の no-op 検出に載る（SECT-L1-003）。**◯**
- `orderedVisibleRows` は折畳セクションの行を除外しつつ孤児行を末尾へ回収し、行の暗黙脱落を防ぐ。`visibleSectionBands` の連続バンド集約も正しい。**◯**

### `src/domain/usecase/progress-line-builder.ts`（R2/R5）
- 3責務（予実フィルタ / イナズマ線頂点 / 旧計画ゴースト収集）が純関数で分離。`filterByPlanActualDisplay` は `planActualKind` 未設定を plan 扱い、`buildIlluminatedLine` は行順ソート後に基準軸→各行前線→基準軸で頂点生成。端子ドットなしのプレーン折線（モックフィードバック一致）。**◯**
- `RowProgressFront.frontDate` および関数引数が `IsoDate` 別名でなく生 `string`（L-04、軽微な一貫性）。

### `src/domain/usecase/cursor-span.ts`（R2/R4/R5）
- `cursorSpanDays = toDayNumber(diff) - toDayNumber(base)`：日番号は整数のため符号・丸め正確（CURS-L1-002）。
- `roundedBoxScreenRect`：矩形位置/寸法は world 由来でズーム追従、`cornerRadiusPx` は注釈値をそのまま返すため**ズーム不変**（CURS-L2-001 / ADR-004）。`Math.max(0, …)` で負の幅/高さを防御。bottomRowIndex+1 で下端行を包含。**◯**

### `src/domain/model/annotation.ts`（R2 Entity）
- discriminated union（callout-box / polyline / rounded-box）+ narrowing helper。全フィールド `readonly`、位置は domain 単位、screen 固有値（`cornerRadiusPx`/`bodyOffsetPx`）のみ screen 空間で ADR-004 と整合。`annotations` は optional で pre-M4 fixture 互換。**◯**

### `src/domain/command/annotation-commands.ts`（R2/R4）
- 全コマンドが純関数 `Document -> Document`。`mapAnnotations` は無変更時に同一 doc を返し履歴を汚さない。`moveCommentComment` はゼロ delta で no-op、非コメントを無視。`recolorRoundedBox` は同色/非該当で no-op。`deleteAnnotation` は不在で no-op。可変リークなし（毎回新オブジェクト、構造共有）。**◯**

### `src/domain/command/commands.ts`（R2 純粋性・M2 回帰）
- 新規 section/dependency コマンドはすべて no-op 検出付き（`sectionsEqualByOrder`、自己ループ/重複依存の排除）。**◯**
- **M2 指摘の解消を確認（良好な回帰）**:
  - M2-M-01（無変更プロパティ編集で履歴増加）→ `applyItemPatch` が全キー現値一致時に**同一 item 参照**を返し解消。
  - M2-M-03（milestone に endDate 設定で不変条件違反）→ `sanitizePatchForKind` が milestone の `endDate` キーを除去し解消。

### `src/adapters/render/svg-renderer.ts`（R5 中核・変更）
- **M1 仮想化維持**: `diffRender` はビューポート交差 + LOD + 予実フィルタ通過のアイテムのみ DOM 化し離脱ノードを除去。**◯**
- 依存線: 障害物を mounted（可視）集合に限定、端点いずれかが可視の依存のみ描画（有界ノード数、ADR-006/RISK-001）。折畳/削除で placement 無しの端点はスキップ。**設計方針は正しいが、障害物として端点自身が混入（H-01）。**
- オーバーレイ（今日線/デュアルカーソル/イナズマ線/角丸ボックス/コメント）は screen 空間群で毎フレーム全消去→再構築。カーソル/今日線はビューポート外で早期 return。**ただし角丸ボックス・コメントは画面外でも描画され、予実系走査が全アイテムを毎フレーム走査（M-02）。**
- **M2-M-02 の解消を確認**: `updateItems` が `layoutDirty` + rAF で per-frame 再レイアウトを1回に集約。
- セキュリティ: コメント本文は `text.textContent` 経由（`buildCommentText`）、色は SVG 属性 `setAttribute('stroke', …)`。未信頼文字列の `innerHTML` 挿入なし → **XSS 経路なし**。**◯**
- `diffRender` の `const window`（ViewportWindow）が DOM グローバル `window` を隠蔽（L-01、M2-L-06 の拡大）。

### `src/adapters/input/editing-controller.ts`（R2/R4/R5）
- capture フェーズ消費でレンダラ pan を抑止、ドラッグ全体を1コマンド commit（Undo 1ステップ）。link/create/move/resize/label のジェスチャ分岐明確。**◯**
- **M2-L-01/L-02 の解消を確認**: スナップ baseline をジェスチャ開始時に1度だけ収集（`MoveGesture.baselinesX` immutable）。
- 依存リンク（DEP-L1-002）は nearest 9アンカーへスナップし `addDependencyCommand` を commit。自己ループ/未着地はガード。**◯**

### `src/adapters/ui/left-pane.ts`（R3 セキュリティ / R2）
- 全ラベル（section 名・`classificationLabel`・`subClassificationLabel`）を `textContent` で描画 → **XSS 経路なし**。hide/show ボタンは undoable コマンド経由。分類はインデントのみ（SECT-L2-001）。隠しタブは折畳数ぶんだけ増える（SECT-L1-004/005）。**◯**
- divider ドラッグは `clampLeftPaneWidth` で有界。pointer capture 適切。teardown なし（L-06、アプリ寿命につき許容）。

### `src/adapters/ui/property-panel.ts`（R3 セキュリティ / R2）
- 全書込が `textContent` / `.value` / `setAttribute`。`innerHTML` はクリアのみ。編集中フィールドは `activeElement` 判定で非上書き。milestone は end_date 行を非表示（M-03 の UI 側二重防御）。**◯**

### `src/app/main.ts` / `sample-data.ts`（Framework 層）
- 配線のみ。注釈作成/予実/今日線/カーソルのトグルは適切に view 状態 or undoable コマンドへ振り分け。sample-data は決定的で M4 の全機能に実データを供給。**◯**
- cursor ボタンは `dualCursor === undefined` 時に無反応だが sample が常に供給するため実害なし。

### Clean Architecture / DIP 検証
- `src/domain/**` に DOM グローバル（`window.`/`document.`/`createElement`/`querySelector`/`addEventListener`/`localStorage`）が存在しないことを grep で確認（`document` は全て `ScheduleDocument` 引数、`window` は `ViewportWindow` 引数）。依存方向は内向き。**CA/DIP 遵守**。

---

## 指摘一覧

| ID | 重大度 | 観点 | 箇所 | 指摘 |
|----|--------|------|------|------|
| H-01 | **High** | R2/R5 | svg-renderer.ts:1019-1026,1059-1067 / dependency-router.ts:143-146 | 依存線の端点自己除外が参照同一性のミスマッチで機能せず、始点/終点アイテム自身が障害物として計上される。overlap 指標が自己重なりで汚染され、実障害物を貫通する経路が選定されうる（DEP-L1-003/DEP-L2-001 の避け機能誤動作） |
| M-01 | Medium | R5 | dependency-router.ts:217-257,303-313 / svg-renderer.ts:1015-1051 | `routeDependency` は候補数 O(V)・各候補の overlap 計算 O(V) で1依存あたり O(V²)、フレーム全体で O(D·V²)（V=可視アイテム数, D=可視依存数）。ビューポート有界だが可視アイテム/依存が密な場面で 60fps を圧迫しうる |
| M-02 | Medium | R5 | svg-renderer.ts:733-745,701,871-895,902-941 | オーバーレイを毎フレーム全消去→全再構築。`computeRowProgressFronts`/`collectPreviousPlanGhosts` は全アイテムを毎フレーム走査、角丸ボックス/コメントはビューポート外でも描画（カリングなし） |
| L-01 | Low | R2/POLA | svg-renderer.ts:584 ほか / viewport.ts:57 | ローカル/引数の `window`（ViewportWindow）が DOM グローバル `window` を隠蔽（M2-L-06 の拡大） |
| L-02 | Low | R2 | dependency-router.ts:144-146 | 端点除外が参照同一性依存の脆い契約。H-01 修正後も、明示的端点引数か値比較へ変更が望ましい |
| L-03 | Low | R2/YAGNI | schedule-model.ts:212-213 | `Dependency.bends` は「render で再計算」とされるがレンダラは書き戻さず、描画にも未使用の advisory キャッシュ |
| L-04 | Low | R2/命名 | progress-line-builder.ts:48,77-83 | `frontDate`/`baseDate`/`epochDate` が他所で使う `IsoDate` 別名でなく生 `string` |
| L-05 | Low | R3 | svg-renderer.ts:920 / annotation-commands.ts:111 | 注釈 `strokeColor`・コメント長は未検証（SVG 属性のため注入不能・`textContent` 安全なので実害なし） |
| L-06 | Low | R5 | left-pane.ts:103-104 / svg-renderer.ts:211 | store/viewState 購読・ResizeObserver の teardown なし（アプリ寿命の単一インスタンスのため実害小、M2-L-03 継続） |

**件数**: Critical 0 / **High 1** / Medium 2 / Low 6

---

## High 指摘の詳細と修正案（H-01）

**現象**: `renderDependencies` は障害物を `placementRect(placement)`（毎回新規 `Rect` インスタンス）で構築し、`drawDependency` も `fromRect`/`toRect` を別途 `placementRect` で新規生成する。`routeDependency` 内の除外 `obstacle !== fromRect && obstacle !== toRect` は参照比較のため、同一アイテムでもインスタンスが異なり**一致しない**。結果、始点/終点アイテムの矩形（margin 膨張済み）が自分の依存線の障害物として残る。

**影響（具体シナリオ）**: あるアンカーから出る経路が実障害物を避けてクリーン（実 overlap=0）だが自箱を縦に舐める（自己 overlap=15）候補 A と、実障害物を貫通する（実 overlap=10）が自箱を舐めない（自己 overlap=2）候補 B があるとき、汚染された合計で A=15 > B=12 となり**実障害物を貫通する B が選定される**。overlap を第一基準とする lexicographic 選定の健全性が崩れる。コード自身のコメント「Do not treat the two endpoint items as obstacles for their own line」の不変条件違反。

**なぜテストで検出されないか**: `dependency-router.test.ts` は `routeDependency` を直接呼び、`obstacles` に始点/終点矩形を含めないため除外ロジックの破綻が露見しない。破綻はレンダラの障害物構築経路（結合）でのみ発生する。

**修正案（いずれか）**:
1. `renderDependencies` で `itemId -> Rect` の Map を1回構築し、`drawDependency` は `fromRect`/`toRect` をその Map から取得（同一インスタンス）して参照除外を成立させる。
2. `routeDependency` の除外を値比較（x/y/width/height 一致）または明示的な端点 itemId 引数へ変更し、参照同一性契約を廃止（L-02 も同時解消）。
推奨は 1（最小変更）+ 将来的に 2（契約の堅牢化）。

---

## 指摘対応テーブル

| ID | 重大度 | 対応 | 推奨修正 |
|----|--------|------|----------|
| H-01 | High | **要修正**（フェーズ遷移ブロック） | 上記「H-01 詳細」の修正案1を適用し、`dependency-router.test.ts` に「始点/終点矩形を obstacles に含めても自己 overlap が計上されない」結合ケースを追加 |
| M-01 | Medium | 対応方針を orchestrator 承認 | channel 座標を経路のバウンディングボックスに交差する障害物へ剪定、または障害物集合に上限を設けて O(V²) を抑制。性能ベンチ（RISK-001）で実測後に据置き判断可 |
| M-02 | Medium | 対応方針を orchestrator 承認 | オーバーレイをアイテム同様に diff 化、予実前線を編集時のみ再計算しキャッシュ、角丸ボックス/コメントにビューポートカリング追加 |
| L-01〜L-06 | Low | 記録（据置き可） | 上表「指摘」列の通り。M5 リファクタ時にまとめて解消を推奨 |

---

## 再レビュー（M2 指摘）検証結果

M2 の Medium 3 件が M3/M4 変更で解消されていることを確認:

| M2 ID | 内容 | 検証 |
|-------|------|------|
| M2-M-01 | 無変更プロパティ編集で履歴増加 | **解消**: `applyItemPatch`（commands.ts:193-204）が全キー現値一致で同一参照返却 |
| M2-M-02 | ドラッグ毎フレームの同期再レイアウト | **解消**: `updateItems` の `layoutDirty`+rAF 集約（svg-renderer.ts:289-299）＋ baseline 1回収集（editing-controller.ts:274-280） |
| M2-M-03 | milestone に endDate 設定可能 | **解消**: `sanitizePatchForKind`（commands.ts:180-186）＋ property-panel の end_date 非表示（property-panel.ts:277-279） |

M1/M2 コアへの回帰（仮想化・Undo/Redo 不変性・コマンド純粋性・XSS 非該当）は維持。

---

## 仕様整合（UID）

| ドメイン | UID | 実装確認 |
|---------|-----|---------|
| セクション | SECT-L1-001(分類線)/002(並替)/003(折畳)/004-005(タブ)/006(名称)/L2-001(インデント階層) | section-organizer.ts / left-pane.ts / svg-renderer.renderClassificationLines |
| 依存線 | DEP-L1-001(依存)/002(9アンカー)/003(回避)/004(矢頭)/L2-001(重なり最小)/002(0-3折れ) | dependency-router.ts / svg-renderer.renderDependencies（**002 の回避が H-01 で不完全**） |
| キャンバス | CANVAS-L1-006(固定ペイン)/007(縦スクロール同期)/L2-001(幅可変) | left-pane.ts / left-pane-layout.ts |
| 予実 | PLAN-L1-001(予実対)/002(フィルタ)/003(イナズマ線)/004(旧計画ゴースト)/L2-001(前線) | progress-line-builder.ts / svg-renderer 予実系 |
| カーソル | CURS-L1-001(今日線)/002(デュアル)/003(モード)/004(表示)/005-006(コメント)/007(角丸箱)/L2-001(半径不変) | cursor-span.ts / annotation.ts / svg-renderer overlay |

DEP-L2-001/002 の「重なり最小」は H-01 により意図通り機能していない。他 UID は齟齬なし。

---

## 判定と根拠

- **Critical: 0、High: 1** → CLAUDE.md 品質目標「レビュー指摘 High:0」を満たさない。
- H-01 は load-bearing な依存線自動配線（コアドメイン）の overlap 選定を不健全化し、実障害物貫通という機能誤動作を招く。コード自身の明記された不変条件に反し、修正は局所的かつ低コスト。品質ゲートとして見送り不可。
- Medium 2 件は有界（ビューポート内）でクラッシュ要因ではないが、60fps NFR（RISK-001）に対する実測での再評価を要する。
- M2 の全 Medium は解消済み、M1/M2 コアの回帰なし、XSS/CA/DIP は健全。

**総合判定: FAIL**（High 1 件）。

## 推奨戻り先

- **コード修正フェーズ（implementation 相当）**: H-01（R2/R5 実装レベル）を修正し再レビュー依頼。修正確認後に Medium 2 件の件数・対応方針を orchestrator へ報告し承認を得る。
- H-01 単独修正のため戻り幅は最小。設計（仕様書 Ch3-4）への差戻しは不要（設計方針＝障害物回避は正しく、実装の参照同一性バグ）。
