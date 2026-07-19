# DEC-003: CR-001 予実案H 承認 — 仕様先行・実装後追い

- 日付: 2026-07-19
- 種別: 変更要求の承認および段階化方針（CLAUDE.md「重要判断の基準」: 変更要求の影響度が High）
- 決定者: ユーザー承認（2026-07-19）
- 関連: CR-001（`project-records/change-requests/change-request-001-20260719-230349.md`）,
  PLAN-L1-001/002/005, PLAN-L2-001, DEP-L1-005/006, ITEM-L1-011,
  DATA-JSON-006/008/011/015, DATA-MSPDI-003/004/007/008/009,
  ARCH-C-014（進捗線）, ARCH-C-018（MSPDI codec）,
  `docs/analysis/mspdi-json-fidelity.md`

## 背景

JSON⇔MSPDI フィデリティ分析と進捗入力/イナズマ線の検討から、予実の持ち方を「案H」へ移行する
判断に至った（CR-001）。案H は実績を別アイテムではなく同一アイテムの実績日フィールド
（actualStart / actualEnd）で持ち、旧 planActualKind / planGroupId を廃止する。あわせて MSPDI
codec の実装漏れ（B-1..B-6）と GR モデル追加（依存 linkType / 符号付き lagDays / 期限 targetDate）
を 1 パッケージで扱う。影響度は High（複数モジュール横断・データ形式変更）。

## 決定

1. **CR-001（High）を承認する（2026-07-19、ユーザー承認）。** Part A（予実案H）・Part B（MSPDI
   実装漏れ B-1..B-6）・Part C（linkType / lagDays / targetDate）を採用する。
2. **本セッションは仕様（`.sdoc`）確定を先行する。** 改訂対象は `18-plan-actual.sdoc` /
   `40-data-format.sdoc` / `16-dependencies.sdoc` / `11-items-icons.sdoc`（プローズ仕様＝テスト非依存）。
3. **実装（Part A/B/C）は別セッションで着手する。** `docs/api/gr-scheduler.schema.json` と `src/**` /
   `tests/**` は本セッションで変更しない。
4. **段階化の理由（緑維持）:** schema.json は F0 で SSOT 化され
   `tests/document-schema-conformance.test.ts` がコード出力と突合している。schema.json をコードより
   先に案H化するとテストが赤化するため、schema.json とコードは実装セッションで同時変更する。
5. **後方互換は不要**（未公開のため移行コードを書かない、CR §4）。表示スタイルは Overlap（既定）/
   Separate と呼称し、Opt1 / Opt2 は使わない。ブランチ運用は実装担当の判断に委ねる。

## 帰結

- `40-data-format.sdoc` §5 に「案H実装時に schema.json / モデル / codec へ加える具体差分」を明記し、
  実装セッションが正確に適用できるよう橋渡しした（actualStart/actualEnd/targetDate 追加、
  planActualKind/planGroupId 削除、viewState.planActualStyle enum、dependency.linkType enum + 符号付き
  lagDays）。
- トレーサビリティは `traceability-matrix.md` の「CR-001（予実案H）改訂トレース」で実装状態を
  **pending（次セッション）** として管理する。
- `strictdoc export docs/spec` = exit 0（仕様のリンク健全性を維持）。

## 残作業（次セッション＝実装フェーズ）

- schema.json + `schedule-model.ts` + `json-codec.ts` + `mspdi-codec.ts` +
  `progress-today-layer.ts` + `item-layer.ts` / `plan-actual-colors.ts` + `sample-data.ts` を
  案H へ同時変更し、単体/結合/往復整合/document-schema-conformance を緑で確定する。
- 完了後に `docs/analysis/mspdi-json-fidelity.md` の §5/§6 状態を更新する。
