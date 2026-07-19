# DEC-003: CR-001 予実「実績日フィールド方式」承認 — 仕様先行・実装後追い

- 日付: 2026-07-19
- 種別: 変更要求の承認および段階化方針（CLAUDE.md「重要判断の基準」: 変更要求の影響度が High）
- 決定者: ユーザー承認（2026-07-19）
- 関連: CR-001（`project-records/change-requests/change-request-001-20260719-230349.md`）,
  PLAN-L1-001/002/005, PLAN-L2-001, DEP-L1-005/006, ITEM-L1-011,
  DATA-JSON-006/008/011/015, DATA-MSPDI-003/004/007/008/009,
  ARCH-C-014（進捗線）, ARCH-C-018（MSPDI codec）,
  `docs/analysis/mspdi-json-fidelity.md`

## 背景

JSON⇔MSPDI フィデリティ分析と進捗入力/イナズマ線の検討から、予実の持ち方を「実績を
actualStart/actualEnd で保持する方式」へ移行する判断に至った（CR-001。検討時の作業ラベル
『案H』は本決定をもって廃止し、以降は記述名のみを用いる）。本方式は実績を別アイテムではなく
同一アイテムの実績日フィールド（actualStart / actualEnd）で持ち、旧 planActualKind /
planGroupId を廃止する。あわせて MSPDI codec の実装漏れ（B-1..B-6）と GR モデル追加（依存
linkType / 符号付き lagDays / 期限 targetDate）を 1 パッケージで扱う。影響度は High（複数モジュー
ル横断・データ形式変更）。

## 決定

1. **CR-001（High）を承認する（2026-07-19、ユーザー承認）。** Part A（予実の実績日フィールド
   方式）・Part B（MSPDI 実装漏れ B-1..B-6）・Part C（linkType / lagDays / targetDate）を採用す
   る。
2. **本セッションは仕様（`.sdoc`）確定を先行する。** 改訂対象は `18-plan-actual.sdoc` /
   `40-data-format.sdoc` / `16-dependencies.sdoc` / `11-items-icons.sdoc`（プローズ仕様＝テスト非依存）。
3. **実装（Part A/B/C）は別セッションで着手する。** `docs/api/gr-scheduler.schema.json` と `src/**` /
   `tests/**` は本セッションで変更しない。
4. **段階化の理由（緑維持）:** schema.json は F0 で SSOT 化され
   `tests/document-schema-conformance.test.ts` がコード出力と突合している。schema.json をコードより
   先に実績日フィールド方式へ変更するとテストが赤化するため、schema.json とコードは実装セッションで
   同時変更する。
5. **後方互換は不要**（未公開のため移行コードを書かない、CR §4）。表示スタイルは Overlap（既定）/
   Separate と呼称し、Opt1 / Opt2 は使わない。ブランチ運用は実装担当の判断に委ねる。

## 帰結

- `40-data-format.sdoc` §5 に「実績日フィールド方式の実装時に schema.json / モデル / codec へ加える
  具体差分」を明記し、実装セッションが正確に適用できるよう橋渡しした（actualStart/actualEnd/targetDate
  追加、planActualKind/planGroupId 削除、viewState.planActualStyle enum、dependency.linkType enum + 符号付き
  lagDays）。
- トレーサビリティは `traceability-matrix.md` の「CR-001（実績日フィールド方式）改訂トレース」で
  実装状態を **pending（次セッション）** として管理する。
- `strictdoc export docs/spec` = exit 0（仕様のリンク健全性を維持）。

## 残作業（次セッション＝実装フェーズ）

- schema.json + `schedule-model.ts` + `json-codec.ts` + `mspdi-codec.ts` +
  `progress-today-layer.ts` + `item-layer.ts` / `plan-actual-colors.ts` + `sample-data.ts` を
  実績日フィールド方式へ同時変更し、単体/結合/往復整合/document-schema-conformance を緑で確定する。
- 完了後に `docs/analysis/mspdi-json-fidelity.md` の §5/§6 状態を更新する。

## 追記（2026-07-20）— 後続 CR による一部 supersede

- **CR-002**（`change-request-002-20260720-054132.md`、2026-07-20 承認）が本 CR の Part A の一部
  （`previousPlan` フィールドの据え置き）および Part B-4（MSPDI Baseline のクリーン往復）を
  **supersede** する。ベースライン（変更前予定）は per-item フィールドではなく、別ファイル参照
  （過去予定スナップショット文書を id 突合で読み込むグレー・編集不可アンダーレイ）方式へ変更され
  た。MSPDI Baseline は id 突合の best-effort 往復へ格下げされた。詳細は CR-002 および
  `project-records/decisions/DEC-004-docs-ssot.md` を参照。
- **CR-003**（`change-request-003-20260720-063933.md`、2026-07-20 承認）は本 CR・CR-002 のデータ
  モデルには手を加えず、UI/レイアウト（ヘッダー再編・ラベル位置・依存線自動配線）の改修を追加する。
  CR-002 のベースライン可視トグル（Base V/I）のヘッダー配置は CR-003 で確定した。

## 命名規則の是正（2026-07-20）

検討時の作業ラベル「案H」（A〜H の選択肢の8番目という無内容な符丁）は、user-order item60「命名は
言霊」に反するため本決定をもって廃止する。以降、本 CR・関連レビュー・トレーサビリティでは
「実績日フィールド方式（実績を actualStart/actualEnd で保持する方式）」という記述名のみを用いる。
