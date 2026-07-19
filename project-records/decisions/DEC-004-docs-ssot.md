# DEC-004: 文書 SSOT の整流（図の配置・スキーマ次期版・命名是正）

- 日付: 2026-07-20
- 種別: 技術的判断（文書管理・データ契約の Single Source of Truth 整理）
- 決定者: change-manager（orchestrator セッション、AI側の技術的判断。ユーザー承認事項ではない）
- 関連: CR-001, CR-002, CR-003, DEC-003, `docs/spec/_assets/*.md`,
  `docs/api/gr-scheduler.schema.json`, `docs/api/gr-scheduler.schema.next.json`

## 背景

CR-001〜CR-003 の仕様先行フェーズを通じて、以下 3 点の文書管理上の整流が必要になった。

1. UML 相当の図（コンポーネント構成・シーケンス・ドメインモデルクラス図）が `.sdoc` 内にインライン
   記述されると、CR ごとの改訂で図と本文が二重管理になり SSOT が崩れる懸念があった。
2. `docs/api/gr-scheduler.schema.json` は F0 で SSOT 化され
   `tests/document-schema-conformance.test.ts` がコード出力と突合しているため、CR-001〜CR-003 の
   スキーマ変更をコードより先に反映するとテストが赤化する（DEC-003 §4 と同じ制約）。CR が複数
   累積する中、次期版フィールドを仕様と同期しつつ緑を保つ置き場所が必要だった。
3. 予実データモデルの検討時の作業ラベル「案H」（A〜H の選択肢の8番目という無内容な符丁）が、
   user-order item60「命名は言霊」に反すると判断された。

## 決定

1. **UML 図は `docs/spec/_assets/*.md` を SSOT とし、`.sdoc` から参照する。** `.sdoc` 側に図を
   インライン重複させない。現状 `component-architecture-full.md` / `sequence-io-roundtrip.md` /
   `sequence-progress-line.md` / `domain-model-class.md` を配置済み。
2. **`docs/api/gr-scheduler.schema.json` を現行版 JSON Schema の単一真実源とし、`gr-scheduler.schema.next.json`
   を次期版（CR-001/CR-002/CR-003 のフィールド変更を先行反映する場所）として用意する。**
   実装セッションで `src/**` のコード変更と同時に、`schema.next.json` の内容を `schema.json` へ
   スワップする（`tests/document-schema-conformance.test.ts` の緑を維持したまま切替える）。
3. **作業ラベル「案H」を廃止する。** 以降、予実データモデルは「実績日フィールド方式（実績を
   actualStart/actualEnd で保持する方式）」という記述名のみを用いる。既存記録の是正は
   `change-request-001-20260719-230349.md` / `R-CR001-spec-review.md` / `traceability-matrix.md` /
   `DEC-003-cr-001-approved.md`（旧 `DEC-003-cr-001-approved-plan-h.md` から改称）で実施済み。

## 帰結

- `.sdoc` は図を `docs/spec/_assets/*.md` への参照のみとし、図の実体を持たない（トレース経路は
  `.sdoc` 内のプローズ参照＋StrictDoc の RELATIONS 健全性で担保）。
- `gr-scheduler.schema.next.json` は CR-001（previousPlan 追加時点）・CR-002（previousPlan 除去）・
  CR-003（labelPosition enum 拡張）の変更を先行反映済み。実装フェーズでのスワップまで
  `gr-scheduler.schema.json`（現行 SSOT）は不変。
- DEC-003 の旧ファイル名 `DEC-003-cr-001-approved-plan-h.md` は本決定の命名是正に伴い
  `DEC-003-cr-001-approved.md` へ改称した（旧ファイルは削除対象。ユーザーが手動削除）。

## 非決定事項

- ベースライン参照文書（CR-002 Part 3）の JSON スキーマ上の扱い（gr-scheduler JSON のサブセット
  か専用バリデーションか）は CR-002 §7 の未決事項のまま、実装フェーズで確定する。
