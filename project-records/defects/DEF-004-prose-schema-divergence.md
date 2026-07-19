# DEF-004: 40-data-format.sdoc §1 プローズ/例が SSOT スキーマ（flat 形状）から広域に乖離している

- 発見: 2026-07-20（CR-002/CR-003 仕様反映レビュー、review-agent の参考-A 指摘。CR-001 敵対的
  レビューの N-1/N-2（DEF-002 で修正済み）とは別系統・より広範囲の既存ドリフト）
- 重大度: Medium（文書 SSOT の広域ドリフト。CR-001/CR-002/CR-003 のスコープを超える既存事象であり、
  当該 CR 群のゲートはブロックしない）
- 状態: **未修正（既存ドリフト）**
- 関連要求: DATA-JSON-002, DATA-JSON-003, DATA-JSON-004, DATA-JSON-005, DATA-JSON-009,
  DATA-JSON-010, DATA-JSON-011, DATA-JSON-013
- 関連文書: `docs/spec/40-data-format.sdoc`（§1 トップレベル表・item 表・JSON 例、38-196行付近）,
  `docs/api/gr-scheduler.schema.json`（SSOT）, `docs/api/gr-scheduler.schema.next.json`,
  `project-records/reviews/R-CR002-CR003-spec-review.md`（参考-A）,
  `project-records/defects/DEF-002-doc-ssot-drift.md`（別系統の先行修正済み事案）

## 事象

`docs/spec/40-data-format.sdoc` §1 のプローズ・トップレベル表・item 表・JSON 例が、**ネスト志向・
i18n オブジェクト志向のモデル**を記述しているのに対し、SSOT である `docs/api/gr-scheduler.schema.json`
（および次期版 `gr-scheduler.schema.next.json`）は **flat モデル**を定義しており、両者が広域に
乖離している。主な不一致箇所:

1. **トップレベル構造**: 40 のプローズは `meta`（title/locale/createdAt/author オブジェクト）・
   `palette`・`i18n`（locales/activeLocale）を個別トップレベルフィールドとして記述するが、
   schema.json は `title`（string）・`epochDate` を **ScheduleDocument 直下のフラットフィールド**
   として定義する（schema.json:4,8,20-21）。`meta`/`palette`/`i18n` に相当する構造が SSOT に
   見当たらない。
2. **分類（category/classification）**: 40 は `rows[].classification{major, middle, minor}`（各
   i18n オブジェクト）・`items[].category{major, middle, minor}`（同）と記述するが、schema.json は
   item 直下に `majorCategory`（string, required）・`majorLabel`（string）等の**フラットな
   個別フィールド**を定義する（schema.json:123,169）。
3. **viewState**: 40 は `timeGranularity`・`cursors`（today/dual のネストオブジェクト）を記述するが、
   実装コードの語彙は `dualCursor`・`todayLineVisible` 等（30-architecture.sdoc・schema.next.json
   側で確認済み）であり、40 の viewState 記述が実装/次期スキーマの語彙と一致しない。
4. **annotation（コメント）**: 40 は `{ "comment": { "id", "kind", "anchor", "text", "path" } }` の
   ラッパオブジェクト形式で例示するが、schema.json は annotation 直下に **フラットな**
   `annotationKind`（required, enum, schema.json:237,240）を定義し、`comment{}` ラッパは存在しない。
5. **assets（インポート画像）**: 40 は `assets[].format`（'svg'|'png'）・`assets[].sanitizedData`
   （data URI）と記述するが、schema.json は `assetFormat`（required, enum, schema.json:204,207）・
   `sanitizedDataUri`（required, pattern `^data:`, schema.json:204,208）という**別名かつ命名規則が
   異なる**フィールドを定義する。
6. **abbrev/fullName 等の i18n 値**: 40 のプローズ・JSON 例は `abbrev`/`fullName`/`description` を
   `{en, ja}` の i18n マップとして例示するが、schema.json の item 必須項目 `abbrev` は
   `{ "type": "string" }`（schema.json:150,157）であり、i18n オブジェクトではなく単純文字列を
   要求している。

## 根本原因（暫定・要判定）

以下のいずれか、または両方が根本原因である可能性があり、**判定が未了**:

- (a) `docs/api/gr-scheduler.schema.json` が旧い/簡略化された段階のスキーマであり、40 の
  プローズが本来あるべき i18n・ネスト構造（製品要求である多言語対応 STK-L0-007/016、
  PROP-L1-004 等）を先に反映していて、**schema.json 側が未実装/不完全**である可能性。
- (b) 実装（`src/domain/model/schedule-model.ts` 等）が M5 前後のリファクタリングで flat 化され、
  schema.json はその実装に追随して正しく flat 化されたが、`.sdoc` の §1 プローズ・例が**追随せず
  旧いネスト/i18n 記述のまま取り残された**（DEF-002 で修正した箇所と同種だが、修正範囲外だった
  §1 全域に同型の問題が残置している）可能性。

DEF-002 の対策時、修正対象は DATA-JSON-005/006/007（CR-001 で直接触れた箇所）に限定されており、
§1 のトップレベル表・item 表・JSON 例・DATA-JSON-002/003/004/009/010/011/013 は対象外のまま
据え置かれた。CR-002/CR-003 のレビュー（review-agent, 2026-07-20）で「CR-002 の回帰ではないが
広域に存在する既存乖離」として改めて発見された。

## 影響

- 実装者が `.sdoc` のプローズ・JSON 例をそのまま実装/テストの参照にすると、SSOT
  （`document-schema.ts` が取り込む schema.json）の検証（`tests/document-schema-conformance.test.ts`）
  に落ちる。DEF-002 と同型のリスクが §1 全域に潜在する。
- ただし、CR-001/CR-002/CR-003 のいずれのレビューにおいても「当該 CR が直接触れたフィールド」は
  是正済みであり、本件は CR 群のスコープ外・非回帰の既存事象として扱われ、品質ゲート（Critical/High
  ゼロ）はブロックしていない。

## 対応方針

- 実装フェーズで `docs/api/gr-scheduler.schema.json` ↔ `docs/api/gr-scheduler.schema.next.json` の
  スワップ（CR-001/CR-002/CR-003 の段階化方針・各 CR §8）を行うタイミングに合わせて、
  `40-data-format.sdoc` §1（トップレベル表・item 表・JSON 例・DATA-JSON-002/003/004/005/009/010/
  011/013 の STATEMENT/EXAMPLE）を SSOT の flat 形状へ**一括同期**する専用タスクを実施する。
- 一括同期タスクの中で、根本原因 (a)/(b) の判定（= schema.json が不完全で拡張すべきか、`.sdoc` が
  停滞していて是正すべきか）を確定する。i18n 要求（STK-L0-007/016, PROP-L1-004, ADR-008）と
  flat スキーマの両立が必要なため、単純に `.sdoc` を schema.json へ合わせるだけでなく、i18n
  マップが必要なフィールド（abbrev/fullName/description 等）については schema 側の拡張要否も
  併せて検討する。
- 根拠: `project-records/reviews/R-CR002-CR003-spec-review.md` 参考-A（40-data-format §1 広域乖離の
  指摘）、および `project-records/reviews/...`（40-data-format collapse flag、DEF-002 の対応範囲限定）。

## 検証（未実施）

一括同期タスク完了後に以下で検証する:
- `strictdoc export docs/spec` = exit 0（構造健全性維持）。
- SSOT 照合により §1 トップレベル表・item 表・JSON 例が schema.json（またはスワップ後の
  schema.next.json）のフィールド名・形状（flat/nested）と完全一致すること。
- `tests/document-schema-conformance.test.ts` が引き続き緑であること。

## 再発防止（プロセス改善提案）

- SSOT（schema.json）変更・flat 化リファクタリング時は、`40-data-format.sdoc` の**全節**（DATAFIELD
  本文だけでなく §1 冒頭のトップレベル表・item 表・JSON 例を含む）を同一 PR/コミットで同期する
  運用を徹底する（DEF-002 の再発防止案の適用範囲を §1 全域へ拡張）。
- レビュー観点「SSOT 名称照合」を、CR が直接触れたフィールドだけでなく `40-data-format.sdoc` 全体を
  対象にした定期棚卸し（例: マイルストーンごとの横断レビュー）として制度化することを検討する。
