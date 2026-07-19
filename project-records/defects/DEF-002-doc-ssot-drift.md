# DEF-002: 40-data-format.sdoc が SSOT（schema.json）からフラット構造で逸脱していた

- 発見: 2026-07-20（CR-001 敵対的レビュー Round 2、review-agent の N-1/N-2 指摘）
- 重大度: High（データ契約の名称不整合。実装がプローズを写すと SSOT 検証に落ちる）
- 状態: **修正済み（本セッションで `.sdoc` を SSOT へ整合）**
- 関連要求: DATA-JSON-005/006/007/013, ITEM-L1-011
- 関連文書: `docs/api/gr-scheduler.schema.json`（SSOT）, `docs/spec/40-data-format.sdoc`,
  `project-records/reviews/R-CR001-spec-review.md`（Round 2 High-1/High-2、N-1/N-2）

## 事象

`docs/spec/40-data-format.sdoc` の item 記述が、SSOT である `docs/api/gr-scheduler.schema.json`
の**フラット構造**から乖離していた。

1. **アイコン/スタイル系フィールドのネスト表記**: 例示・プローズが `item.icon.importedAssetId` /
   `icon.importedAssetId` のようなネストされた `icon{}` オブジェクト経由の参照を記述していたが、
   SSOT は `importedAssetId` を **item 直下のフラットフィールド**として定義していた
   （schema `:182`）。同様に `style{}` 相当のネストも一部プローズに残存していた。
2. **予定スパン/種別の旧名残置**: 例示 JSON や要約表が予定スパンを `start`/`end`、アイテム種別を
   `kind` と表記していたが、SSOT は `startDate`/`endDate`（required, schema `:150,155-156`）・
   `itemKind`（required, schema `:154`）を正としていた。
3. **previousPlan の旧名**: `previousPlan` 内の日付も `start`/`end` 表記が残り、SSOT の
   `previousPlan.required:["startDate","endDate"]`（schema `:141-144`）と不一致だった。

## 根本原因

- CR-001（実績日フィールド方式移行）の仕様改訂で item フィールドを追記した際、既存の例示・併記表
  ・要約プローズが SSOT のフラット化（M5 前後の実装リファクタリングで `icon{}`/`style{}` を
  廃してフラット化済み）に追随していなかった。**改訂の波及漏れ**（修正が一部箇所のみに適用され、
  兄弟記述に伝播しなかった）。
- 仕様が「例示」「併記表」「DATAFIELD 本文」の複数箇所に同じ情報を重複保持する構造のため、SSOT
  変更時に全箇所を機械的に同期する仕組みがなかった（StrictDoc の構造検証は RELATIONS の健全性は
  保証するが、プローズ内のフィールド名一致までは検証しない）。

## 対策（実装）

- 例示 JSON（it-1/it-2）・previousPlan・DATA-JSON-005/006/007 EXAMPLE を `itemKind`/`startDate`/
  `endDate`/`importedAssetId`（フラット）へ統一。
- `item.icon.importedAssetId` / `icon.importedAssetId` の残置箇所（assets 併記表、DATA-JSON-013
  STATEMENT、MSPDI サイドカー節など計 5 箇所）を `importedAssetId`（item 直下）へ統一。
- 非正規のプローズ/要約表（DATA-JSON-005 STATEMENT、MSPDI 対応表）の旧名 `kind`/`start`/`end` も
  是正し、正規部（例・schema 差分）との表現一貫性を回復。
- review-agent の敵対的レビュー（Round 2 → Round 3）で解消を検証（`project-records/reviews/R-CR001-spec-review.md`
  Round 3 で N-1/N-2/Medium-2 CLOSED）。

## 検証

`strictdoc export docs/spec` = exit 0（構造健全性維持）。SSOT 照合により `itemKind`/`startDate`/
`endDate`/`importedAssetId`（フラット）/`previousPlan{startDate,endDate}` が `.sdoc` 全体で一貫。
schema.json 自体は本フェーズ未変更（CR-001 §8 の段階化方針どおり）。

## 再発防止（プロセス改善提案）

- SSOT（schema.json）変更・フラット化リファクタリング時は、`40-data-format.sdoc` 内の**例示・
  併記表・DATAFIELD 本文の全箇所**を同一 PR/コミットで同期する運用を徹底する。
- レビュー観点に「SSOT 名称照合」（schema.json の required フィールド名とプローズ表記の grep 突合）
  を明示的に加える（本件は review-agent が独自に実施し発見したが、恒常チェックリスト化が望ましい）。
