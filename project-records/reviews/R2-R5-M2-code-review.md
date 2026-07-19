# コードレビュー報告: M2 実装（R2 / R3 / R4 / R5）

- **対象マイルストーン**: M2（編集 + プロパティ + Undo/Redo + 整列スナップ + コピペ + ショートカット）
- **適用観点**: R2（設計原則・Clean Architecture・DIP）、R3（コーディング品質・堅牢性・セキュリティ）、R4（並行性・状態遷移）、R5（パフォーマンス）
- **レビュー種別**: 実装コードレビュー（新規レビュー）
- **レビュー日**: 2026-07-18
- **レビュー担当**: review-agent
- **総合判定**: **PASS**（Critical 0 / High 0）

## 検証コマンド結果

| 検証 | 結果 |
|------|------|
| `npm run test` (vitest) | 33 passed / 6 files |
| `npm run lint` (eslint) | 違反 0 |
| `npx tsc --noEmit` (strict) | エラー 0 |
| `npm run build` (tsc + vite singlefile) | 成功、`dist/index.html` 単一ファイル 39.31 kB |

## レビュー対象範囲

新規: `schedule-store.ts` / `commands.ts` / `alignment-solver.ts` / `cud-palette.ts` / `editing-controller.ts` / `keyboard-shortcuts.ts` / `item-clipboard.ts` / `property-panel.ts` / `tool-palette.ts`。
変更: `schedule-model.ts` / `svg-renderer.ts` / `main.ts`。
テスト: `command-history.test.ts` / `alignment-solver.test.ts` / `bidirectional-sync.test.ts`。

---

## ファイル別所見

### `src/domain/command/schedule-store.ts`（R2/R4 中核）
- スナップショット方式の Undo/Redo は妥当。文書は全フィールド `readonly` の不変集約であり、コマンドは変更部分のみ新オブジェクトを生成（構造共有）するため、スナップショット間の可変共有リーク（shared mutable leakage）は発生しない。
- `dispatch` は no-op（同一参照）を検出して履歴を汚さない。新コマンドで redo スタックをクリア（branching）＝標準エディタ意味論に一致。tests で網羅検証済み。
- View 状態（zoom/scroll/selection）を履歴に含めない設計は R4 グリッジ回避として正しい（`currentDocument` を単一代入 → `notify` の順で、中間状態が観測されない）。
- 履歴上限（`DEFAULT_HISTORY_LIMIT=200`, `shift()`）でメモリ有界化。良好。

### `src/domain/command/commands.ts`（R2 純粋性）
- 全コマンドが `ScheduleDocument -> ScheduleDocument` の純関数。ピクセル変換をアダプタに残し日単位で動作 → DIP 遵守。
- `mapItems` の参照等価 no-op 検出は良い設計。ただし `editPropertyCommand` は該当 item を常に `{...item, ...patch}` で新規生成する（下記 M-01）。
- resize のクランプ（最小 1 日）、move の duration 保持は正しく、`bidirectional-sync.test.ts` で検証済み。

### `src/domain/usecase/alignment-solver.ts`（R2/R5）
- 汎用 1-D スナッパ + baseline 収集の分離は SRP 良好。閾値内最近傍選択は正しく、境界包含（`<=`）も test 済み。
- `collectStartDateBaselinesX` は `Set` で重複排除 + ソート。ドラッグ中は不変だが毎 move 再計算される（下記 L-01）。

### `src/domain/model/cud-palette.ts`（R2/a11y）
- Okabe-Ito ベースの CUD 配色。原色 `#FF0000` 等を使わず PROP-L1-006 を満たす純データ。良好。

### `src/adapters/input/editing-controller.ts`（R2/R4/R5）
- capture フェーズでポインタを消費し、`stopPropagation` でレンダラの pan（bubble）を抑止 → アイテム操作と空白 pan の分岐が明確。ポインタキャプチャの二重取得は発生しない。
- ドラッグ全体を 1 コマンド commit（プレビューは store を経由せず baseline に適用）＝ Undo 1 ステップ。R4 的に健全。
- プレビュー毎フレームでモデル全走査（下記 M-02）。ズーム基準の frozen/live 混在（下記 L-02）。

### `src/adapters/input/keyboard-shortcuts.ts`（R3）
- テキスト入力フォーカス中はショートカット抑止（`isEditableTarget`）。Ctrl/Meta 両対応。ハンドラ detach 関数を返却。良好。
- Delete/Backspace 両対応。矢印上下は no-op だが preventDefault する（下記 L-05）。

### `src/adapters/clipboard/item-clipboard.ts`（R2/R3）
- セッションローカル。`copy` で防御的スナップショット、`createPasteClones` で新 id + オフセット。id 衝突は `Date.now()+serial+index` で回避。
- 浅いクローンにより入れ子 `labelOffset` を参照共有（下記 L-04）。現状は labelOffset を差し替えのみで変異しないため安全。

### `src/adapters/ui/property-panel.ts`（R3 セキュリティ）
- 全 DOM 書き込みが `textContent` / `.value` / `setAttribute` 経由。`innerHTML` はクリア（`= ''`）のみで未信頼文字列を挿入しない → XSS 経路なし。
- 編集中フィールドを `activeElement` 判定で上書きしない。良い配慮。
- milestone にも end_date フィールドを提示（下記 M-03）。

### `src/adapters/ui/tool-palette.ts`（R2）
- パレット arm / Undo-Redo ボタン / ドラッグ移動。境界クランプあり。ドラッグリスナの teardown なし（下記 L-03、アプリ寿命のため許容）。

### `src/adapters/render/svg-renderer.ts`（R5 中核・変更）
- **M1 の仮想化は維持されている**: `diffRender` はビューポート交差 + LOD 通過アイテムのみ DOM ノード化し、離脱ノードを除去。編集はモデル先行 → diff 反映で、1000 ノードの全再構築は発生しない（＝タスク主要懸念はクリア）。
- `updateItems` は view 状態を保持したまま items のみ差し替え（`setDocument` と分離）＝編集でビューポートがリセットされない。良好。
- `hitTest` は全 placement を走査するが `mountedById.has` で可視集合に限定、pointerdown 時のみ（毎フレームでない）。許容。
- ローカル `const window`（`computeViewportWindow` の戻り）が DOM グローバル `window` を隠蔽（下記 L-06）。

### `src/app/main.ts`（R2 Framework 層）
- 配線のみ。ベンチ後に `renderer.setDocument(store.getDocument())` で store を権威として復元。良好。

### 仕様整合（UID）
- ALIGN-L1-001/002/003・ALIGN-L2-001（スナップ）・ALIGN-L2-002（start_date 座標同期 = property 逆同期）・PROP-L1-001/002/004/005/006・TOOL-L1-001/003/004/005・ITEM-L1-002/004/009（略称表示）/010（略称ドラッグ）はコード上に実装・対応を確認。齟齬なし。

### Clean Architecture / DIP 検証
- `src/domain/**` に DOM（`window`/`document`/`querySelector`/`innerHTML`）およびアダプタ import が存在しないことを grep で確認（`document` 一致は全て `ScheduleDocument` 引数名）。依存方向は内向き。**CA/DIP 遵守**。

---

## 指摘一覧

| ID | 重大度 | 観点 | 箇所 | 指摘 |
|----|--------|------|------|------|
| M-01 | Medium | R2/R4 | commands.ts:177-183 | 値が現状と同一のプロパティ編集でも常に新 item を生成し履歴エントリが増える |
| M-02 | Medium | R5 | editing-controller.ts:319-329 / svg-renderer.ts:176-184 | ドラッグ毎 move でモデル全走査 + `recomputeLayout`(O(n log n)) を同期実行。DOM 仮想化は維持だがフレーム内で冗長 |
| M-03 | Medium | R2/R4 | property-panel.ts:93 / commands.ts:177 | milestone に end_date を編集可能で、`itemKind='milestone'` かつ `endDate!=null` の不変条件違反状態に到達しうる |
| L-01 | Low | R5 | editing-controller.ts:351 | `collectStartDateBaselinesX` はドラッグ中不変だが毎 move 再計算 |
| L-02 | Low | R4 | editing-controller.ts:349-360 | ドラッグ中ホイールズーム時、frozen baseline zoomX と live viewState zoom が混在し deltaDays が不正化しうる |
| L-03 | Low | R5 | editing-controller.ts:127 / tool-palette.ts:151 / svg-renderer.ts:129 | listener/ResizeObserver/subscription の teardown なし（アプリ寿命の単一インスタンスのため実害は小） |
| L-04 | Low | R2 | item-clipboard.ts:29-52 | 浅いクローンで入れ子 `labelOffset` を参照共有（現状は不変前提のため安全だが脆い） |
| L-05 | Low | R3 | keyboard-shortcuts.ts:65-68 | 矢印上下は無処理だが `preventDefault` しネイティブスクロールを抑止 |
| L-06 | Low | R2 | svg-renderer.ts:409 | ローカル `const window` が DOM グローバルを隠蔽（POLA） |
| L-07 | Low | R2 | property-panel.ts / alignment-solver.ts:23 | 汎用名 `value`（`toPatch(value)`, `SnapResult.value`）が言霊ルールに軽微抵触 |

**件数**: Critical 0 / High 0 / Medium 3 / Low 7

---

## 指摘対応テーブル

| ID | 重大度 | 対応 | 推奨修正 |
|----|--------|------|----------|
| M-01 | Medium | 対応方針を orchestrator 承認 | `editPropertyCommand` で patch 適用後に全対象キーが現値と等しければ同一 item 参照を返し、`mapItems` の no-op 検出に載せる |
| M-02 | Medium | 対応方針を orchestrator 承認 | `recomputeLayout` を rAF 内に遅延（フレーム集約）、または baseline をジェスチャ開始時に 1 度だけ収集して再利用 |
| M-03 | Medium | 対応方針を orchestrator 承認 | `itemKind` に応じて非該当フィールド（milestone の end_date 等）を非表示、または `editPropertyCommand` で kind 別に適用フィールドをガード |
| L-01〜L-07 | Low | 記録（据置き可） | 上表「指摘」列の通り。M3 リファクタ時にまとめて解消を推奨 |

---

## 判定と根拠

- **Critical: 0、High: 0** → CLAUDE.md 品質目標「レビュー指摘 Critical:0 / High:0」を満たす。
- 中核の Undo/Redo 不変性・コマンド純粋性・Clean Architecture/DIP・XSS 非該当・M1 仮想化維持のいずれも健全。
- Medium 3 件は機能を破壊せず（M-03 はレンダラが無視するため視覚破綻なし、M-02 は 1000 アイテムでも予算内、M-01 は履歴 UX のみ）、フェーズ遷移のブロック要因にならない。

**総合判定: PASS**。Medium 3 件の件数と対応方針を orchestrator に報告し承認を求める（review-standards「レビュー指摘対応ルール」に従い Medium は全件対応記録が必要）。フェーズ遷移（M2 → M3）は許可可能。

## 推奨戻り先

なし（PASS）。Medium 指摘は M3 実装フェーズ内での対応または orchestrator 承認による据置きを推奨。
