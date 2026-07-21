# レビュー報告: CR-007 実装（選択・編集・移動・コピー&ペースト 5 パート）

- レビュー種別: 実装レビュー（R2 設計原則 / R3 コーディング品質 / R4 並行性・状態遷移 / R5 パフォーマンス）
- 対象 CR: `project-records/change-requests/change-request-007-20260721-070348.md`
- 対象決定: D-4（コピー時の依存線 内部再現/またぎ破棄）・D-5（端で no-op）・D-6（Ctrl+クリック当たり判定）・D-7（Enter/Escape コメント編集）
- レビュー日: 2026-07-21
- レビュアー: review-agent
- 総合判定: **PASS**（Critical 0 / High 0。合格基準を満たす。Medium 2 件は orchestrator に対応方針の承認を要請）

---

## 1. レビュー対象成果物

| 種別 | ファイル |
|------|---------|
| UseCase（純粋シーム） | `src/domain/usecase/selection-set.ts`（toggle / marquee 合成 / collectSelectableIds） |
| UseCase | `src/domain/usecase/multi-item-move.ts`（deepestSharedClassificationLevel / resolveAdjacentSiblingMove + 端停止 / applyAdjacentSiblingMove） |
| UseCase | `src/domain/usecase/classification-copy.ts`（nextNumericSuffixName / partitionDependenciesForCopy(D-4) / id ファクトリ） |
| UseCase | `src/domain/usecase/classification-tree.ts`（`duplicateCategorySubtree` に options 拡張 + `copyClassificationSubtree`） |
| Command | `src/domain/command/commands.ts`（bulkShiftItemsCommand / bulkReassignClassificationCommand / copyClassificationCommand） |
| Command | `src/domain/command/annotation-commands.ts`（editCommentTextCommand + resolveCommentEditOutcome） |
| Adapter | `src/adapters/input/keyboard-shortcuts.ts`（selectAll にコメント包含） |
| Adapter | `src/adapters/input/editing-controller.ts`（Ctrl+クリック toggle / マルチ移動ジェスチャ / コメント dblclick inline editor） |
| Adapter | `src/adapters/ui/left-pane.ts`（⧉ コピー分類ボタン） |
| テスト | `tests/cr-007-selection-move-copy.test.ts`（21 ケース）/ `tests/classification-pane-restructure.test.ts`（更新） |

## 2. 品質ゲート実測値

| ゲート | コマンド | 結果 |
|--------|---------|------|
| 型検査 | `npx tsc --noEmit` | **0 エラー**（PASS） |
| 単体・結合テスト | `npx vitest run` | **661 passed / 661（71 ファイル全緑）**（PASS） |
| Lint | `npx eslint src tests` | **0 違反**（PASS） |

スキーマ無変更の前提どおり `document-schema-conformance` を含む全テストが緑を維持。CR §8 の「schema には触らない」方針が守られている。

## 3. 観点別所見

### R2 設計原則（MUST 命名・SRP・SoC・CA）— PASS
- **命名（item60 / R2.1）**: `deepestSharedClassificationLevel`・`resolveAdjacentSiblingMove`・`partitionDependenciesForCopy`・`nextNumericSuffixName`・`collectSelectableIds`・`toggleSelectionMembership` いずれもドメイン限定で意図を叫んでいる。汎用語（`data`/`info`/`kind`/`tmp`）なし。真偽値 `additive`/`fromInside`/`toInside`、複数形コレクション `itemIds`/`commentIds`/`siblings` も規約準拠。
- **CA レイヤ仕訳（R2.16）**: 判定・再割当・依存線分割・採番はすべて UseCase 層の純粋関数に置かれ、DOM 結線（Ctrl+クリック当たり判定・inline textarea・⧉ ボタン）は Adapter に分離。ドメインが DOM に汚染されていない。`editing-controller` は純粋シーム（`resolveAdjacentSiblingMove`/`toggleSelectionMembership`/`resolveCommentEditOutcome`）を呼ぶだけで、判断ロジックを持たない適切な薄さ。
- **CQS / 不変性（R2.13）**: `toggleSelectionMembership`/`composeMarqueeSelection` は入力 Set を変更せず新 Set を返す（テストで immutability を明示検証）。`applyAdjacentSiblingMove`/各コマンドは変化なし時に同一参照を返し、no-op を identity で検出できる（履歴汚染なし）。
- **D-4 依存線分割の正しさ**: `partitionDependenciesForCopy` は両端が idRemap 内＝内部エッジのみを新 id・再マップ端点で再現し、片端のみ内側＝またぎエッジを破棄、両端外側＝無関係を無視。**複製側が原本アイテムを指すエッジは決して生成されない**（クローン→クローンのみ）。`makeDependencyIdFactory` は既存 dep id から採番し衝突しない。CR §6 受入基準・D-4 を満たす。
- **端停止（D-5）**: `adjacentSibling` は `indexOf(current)` が範囲外/端の場合 null を返し、`resolveAdjacentSiblingMove` が null を伝播、コミット側（editing-controller.ts:1571）が null で dispatch しないため、ツリー端で silent no-op。テストで先頭 major の up / 末尾 middle の down を検証済み。

### R3 コーディング品質 — PASS
- **防御的プログラミング（R3.3）**: `deepestSharedClassificationLevel` は空配列で null、`nonEmpty` で空白/未設定を正規化。`beginCommentEdit` は host==null / `createElement` 非関数（node 実行）を早期 return し DOM 非対応環境で安全。`resolveCommentEditOutcome` は commit で無変更なら `commit:false` を返し no-op コマンドを抑止。
- **エラー握りつぶしなし**: 空 catch・`_` 無視なし。コメント編集の commit/cancel は `settled` フラグで二重確定を防止（keydown Enter と blur の競合を排除）。
- **型アサーション**: `move as never`（テスト）・`selectedItems[0] as ScheduleItem` は直前の空/長さチェック後の安全な参照で、無条件アサーションではない。

### R4 並行性・状態遷移 — PASS
- **状態遷移の原子性（R4.3）**: 全変更は `ScheduleDocument -> ScheduleDocument` の純粋スナップショット変換として store 経由で適用され、複数フィールド（`majorCategory`/`middleCategory`/`minorCategory` と派生 `rowId`）は rebuild で一括再導出されるため観測可能な中間グリッチなし。クラス分類の付替えは「再割当レベルのみ変更・上位固定」で階層構造不変（Part 2 仕様どおり）。
- **プレビュー/コミットの一貫性**: マルチ移動は水平（bulkShift）を rAF レンダラで即時プレビューし、垂直（再分類）は store の tree rebuild 依存のため release 時のみ適用（editing-controller.ts:1538-1546）。プレビューは `renderer.updateItems` の一時描画のみで store を変異させず、コミットのみ undoable。二重適用・観測可能な不整合なし。
- **Undo/Redo**: bulkShift / bulkReassign / copyClassification / editCommentText いずれも store コマンドとして履歴に載り、テストで undo・redo の往復を検証（no-op は履歴に載らない）。CR §6「すべて Undo/Redo 可能」を満たす。
- 本製品はサーバーレス単一スレッド（イベントループ）で共有ロック・await 跨ぎの競合対象なし。R4 のマルチスレッド項は NA。

### R5 パフォーマンス — PASS
- **計算量（R5.1）**: `deepestSharedClassificationLevel` は O(n) 走査 3 回、`partitionDependenciesForCopy` は依存数 O(d)、`nextNumericSuffixName`/id ファクトリは Set で O(1) 判定。`adjacentSibling` の `indexOf` は sibling 数（通常小）に対し線形で、中規模（~50 行/~1000 アイテム）の NFR に影響しない。O(n²) 以上・N+1 相当なし。
- **メモリ（R5.3）**: inline textarea は `removeCommentEditor()` でリスナごと確実に除去、`settled` で多重生成を防止。タイマー/リスナー解放漏れ・循環参照なし。

### テスト品質（R6 補助所見）— 良好
- 21 ケースは実シームを駆動（空虚でない）: toggle の immutability、marquee の plain-replace/additive-union、deepest-level の major/middle/minor/null 4 分岐、adjacent-sibling の各レベル + 端 no-op、D-4 の internal 再現/crossing 破棄/unrelated 無視、Part 5 end-to-end（`-1` 採番・クローン新 id・内部 dep 再現・crossing 破棄・undo で復元）、コメント編集 commit/cancel/no-op。
- 全て store 経由で store を実際に変異させ、undo/redo を往復検証。フレーキー要素（タイミング/ランダム依存）なし。DOM 結線ジェスチャは live-verify で別途確認済みという役割分担が明示されている。

## 4. 指摘対応テーブル

| No | 重大度 | 観点 | 箇所 | 問題 | 影響 | 修正案 | 対応 |
|----|--------|------|------|------|------|--------|------|
| 1 | Medium | R2(POLA/一貫性) | `src/domain/command/commands.ts:872,889` / `src/adapters/ui/left-pane.ts:612,716` | 分類複製に**2 経路**が併存: 旧 `duplicateCategorySubtreeCommand`（Ctrl+C/V + コンテキストメニュー、` (n)` 命名、依存線再現なし）と CR-007 `copyClassificationCommand`（⧉ ボタン、`-N` 命名、D-4 で内部依存再現+またぎ破棄）。同一「分類を複製する」ユーザ操作が入口により**異なる結果**（命名規則・依存線扱いが相違）を生む。 | データ破損・機能誤動作ではない（両経路とも妥当な文書を生成し全緑）。ただし POLA 違反で、同じ意図の操作が入口で分岐するのはユーザ混乱と将来の保守負債。Critical/High には至らない。 | 単一経路に統合を推奨: Ctrl+C/V も `copyClassificationCommand`（CR-007 の `-N` + D-4）に張り替え、旧 `duplicateCategorySubtreeCommand` を撤去するか、逆に CR-007 経路へ一本化。統合しない場合は据置き decision 記録で意図（旧経路の残置理由）を明記。 | orchestrator 判断（Medium） |
| 2 | Medium | R3/POLA(Part 4 完全性) | `src/adapters/input/keyboard-shortcuts.ts:94-102,115-122` / SVG レンダラ（単一注釈ハイライト） | Ctrl+A はモデル上コメント id を選択集合に含める（`collectSelectableIds.all`）が、下流が未対応: (a) `deleteSelection`/`copySelection` は items のみに filter するため、選択されたコメントは削除・コピーで無視される（`deleteItemsCommand` は未知 id を安全に無視するのでクラッシュはないが、Ctrl+A→Delete でコメントが残存し、かつ `selected.size>0` により注釈フォールバック削除経路も到達しない）。(b) レンダラは注釈を単一しかハイライトしないため複数選択コメントが視覚化されない。 | CR §6 の Part 4 受入基準（「Ctrl+A でアイテムとコメントの両方が全選択される」）は**モデル層では充足**。しかし選択されたコメントは現状いかなる操作にも寄与せず視覚フィードバックもないため、機能として不完全（inert）。データ破損・クラッシュなし。 | (i) `deleteSelection`/`copySelection` を items+comments の混在集合に対応させ、複数注釈ハイライトをレンダラに追加する、または (ii) 「Part 4 はモデル選択のみ・削除/コピー波及と複数注釈ハイライトは後続 CR」とする据置き decision 記録を `project-records/decisions/` に作成し追跡対象として残す。CR §6 の文言は満たすため受容も可。 | orchestrator 判断（Medium） |
| 3 | Low | R2(POLA/シャドーイング) | `src/adapters/input/editing-controller.ts:1568` | `const document = this.store.getDocument();` が DOM グローバル `document` をシャドーイング。同ファイルは他所で `window.document` を使用しており、`document` をローカル変数名にするのは誤読・foot-gun。 | 機能影響なし（`this.store.getDocument()` を束縛しているだけ）。可読性・将来の編集時の取り違えリスクのみ。 | `scheduleDocument` 等ドメイン名にリネーム。 | 記録のみ（Low） |
| 4 | Low | R2(DRY/KISS) | `src/domain/usecase/classification-tree.ts:1366-1480` | `duplicateCategorySubtree` の depth 0/1/2 三分岐が近似構造（clonedItems + clonedDeclared + 空なら早期 return + spread に `dependenciesPatch`）を反復。 | 動作は正しくテスト済み。分岐は filter 述語と sibling 挿入先が異なるため完全共通化はできないが、共通骨格の抽出余地あり。保守時の三重編集リスク。 | クローン+早期 return+文書組立の共通ヘルパ抽出を検討（必須ではない）。 | 記録のみ（Low） |
| 5 | Low | R5/R2(POLA) | `src/domain/usecase/classification-copy.ts:32-40` | `nextNumericSuffixName` は base 名の末尾 `-<digits>` を無条件 stem 化するため、正当にハイフン数字で終わる名前（例 `Phase-1`）を複製すると `Phase-2` になり、意味的に無関係の既存 `Phase-2` があると `Phase-3` へスキップする。 | CR §2 Part 5 の採番仕様（`Body`→`Body-1`→`Body-2`）どおりで、`taken.has` により**名前衝突は発生しない**。ハイフン数字終端名でのみ挙動が驚きうる程度。`nextCopyName` の ` (n)` 剥がしと同じ既知パターン。 | 仕様準拠のため修正不要。将来ハイフン数字終端名を多用するなら剥がし条件の見直しを検討。 | 記録のみ（Low） |
| 6 | Low | 情報（R2-R5 対象外） | 新規純粋関数群（`selection-set.ts` / `multi-item-move.ts` / `classification-copy.ts`） | ファイル冒頭に「Pure and side-effect free.」の宣言はあるが、関数単位の `@purity` タグ（R7 規約）が未付与。 | 本レビューは R2–R5 スコープのため合否に影響しない。R7 純粋性レビュー（delivery 最終）での指摘対象になりうる。 | R7 パス実施時に各純粋関数へ `@purity pure` タグを付与。 | 記録のみ（Low・R2-R5 対象外） |

## 5. 総合判定

**PASS**（Critical 0 / High 0。CLAUDE.md 品質目標「レビュー指摘 Critical:0, High:0」を満たす）。

- 3 品質ゲート（tsc 0 / vitest 661 全緑 / eslint 0）合格。スキーマ無変更で `document-schema-conformance` 維持。
- D-4（依存線の内部再現/またぎ破棄）・D-5（端 no-op）・D-6（Ctrl+クリック非ドラッグ toggle）・D-7（Enter commit / Escape revert）はいずれも正しく実装・検証されている。
- Medium 2 件（#1 分類複製の二重経路 / #2 Part 4 コメント選択の下流未対応）は**フェーズ遷移をブロックしない**が、合格基準に従い件数と対応方針を orchestrator に報告し承認を得ること。据置き選択時は `project-records/decisions/` に decision 記録が必要。

### 焦点質問への評決

- **Part 4 コメント選択ギャップ**: CR §6 の受入基準（「Ctrl+A でアイテムとコメントの両方が全選択」）は**モデル層で充足**と判定する。ただし削除・コピーへの波及と複数注釈ハイライトが未対応のため、ユーザから見た機能は現状 inert であり **incomplete-feature（Medium #2）** と評価する。Critical/High ではない（データ破損・クラッシュなし。`deleteItemsCommand` は未知 id を安全に無視）。受容するなら decision 記録で明示、完成させるなら delete/copy と複数ハイライトの結線を推奨。
- **二重複製経路**: 併存自体は defect（データ不整合）ではないが、同一意図の操作が入口で結果分岐する **POLA/一貫性の Medium 指摘（#1）**。単一経路への統合、または旧経路残置の decision 記録を推奨する。

### FAIL 時ルーティング（参考・本回は PASS のため不発）
- 仮に Medium を修正で解消する場合、いずれも R2/R3 実装レベルのため戻り先は **implementation フェーズ相当（コード修正）**。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-21 | 1.0 | 初版（CR-007 実装レビュー R2–R5。PASS / Critical 0・High 0・Medium 2・Low 4） | review-agent |
