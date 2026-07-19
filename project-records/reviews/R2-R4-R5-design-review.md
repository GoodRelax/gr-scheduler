<!-- ============================================================
     COMMON BLOCK | DO NOT MODIFY STRUCTURE OR FIELD NAMES
     ============================================================ -->

## Identification

<doc:schema_version>0.0</doc:schema_version>
<doc:file_type>review</doc:file_type>
<doc:form_block_cardinality>single</doc:form_block_cardinality>
<doc:language>ja</doc:language>

## Document State

<doc:document_status>in-review</doc:document_status>

## Workflow

<doc:owner>review-agent</doc:owner>
<doc:commissioned_by>orchestrator</doc:commissioned_by>
<doc:consumed_by>orchestrator, architect</doc:consumed_by>

## Context

<doc:project>gr-scheduler</doc:project>
<doc:purpose>
Phase 3k 設計レビュー。docs/spec/30-architecture.sdoc（アーキテクチャ・35 コンポーネント・ADR-001..009）
および docs/spec/40-data-format.sdoc（JSON/MSPDI/SVG データ形式契約）を対象に、review-standards.md の
R2（SW 設計原則）・R4（並行性・状態遷移）・R5（パフォーマンス）観点で品質ゲートを判定する。
</doc:purpose>

## References

<doc:related_docs>
<doc:input>docs/spec/30-architecture.sdoc</doc:input>
<doc:input>docs/spec/40-data-format.sdoc</doc:input>
<doc:input>docs/spec/00-overview.sdoc</doc:input>
<doc:input>docs/spec/10-canvas-view.sdoc</doc:input>
<doc:input>docs/spec/20-io-interop.sdoc</doc:input>
<doc:input>docs/spec/25-nfr-a11y.sdoc</doc:input>
<doc:input>project-records/risks/risk-register.md</doc:input>
<doc:input>project-records/decisions/DEC-001-rendering-approach.md</doc:input>
<doc:ref>process-rules/review-standards.md</doc:ref>
</doc:related_docs>

## Provenance

<doc:created_by>review-agent</doc:created_by>
<doc:created_at>2026-07-18T00:00:00Z</doc:created_at>

---

# R2 / R4 / R5 設計レビュー報告（gr-scheduler アーキテクチャ・データ形式）

## 0. 総合判定

**VERDICT: FAIL**（PASS 条件 Critical=0 かつ High=0 を満たさない）

| 重大度 | 件数 |
|--------|:---:|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 3 |

High 内訳: F-01（インポート画像アセットが JSON に格納先を持たず往復整合を破る）／F-02（Must 要求 CANVAS-L1-006 に実装コンポーネントの Implements リンクが無い）。

**推奨戻り先:** design フェーズ（仕様書 Ch3-4 相当）— 30-architecture.sdoc および 40-data-format.sdoc を architect が修正する。R2/R5（設計レベル）の指摘であり、実装フェーズには進めない。

---

## 1. R2（SW 設計原則）観点ノート

### 1.1 Clean Architecture / DIP — 良好

- レイヤ仕訳（Entity / UseCase / Adapter / Framework）は妥当。コアドメイン（時間-座標マッパ、レイアウト、整列、ズーム LOD、依存線ルータ、予実差分、データ変換、履歴）を Entity/UseCase に、描画・入出力・永続化・検証・クリップボード・i18n を Adapter に、DOM/SVG/Web API を Framework に配置しており、「目的にとって本質か手段か」の基準に照らして誤分類は見当たらない。
- 依存関係図（§3, flowchart RL）は依存が常に外側→内側（Framework→Adapter→UseCase→Entity）へ向かい、`UcCore -->|operates on| EnCore` を除きコア（Entity/UseCase）から Adapter/Framework への逆流が無い。Adapter は UseCase 公開ポートを実装する形で DIP を満たす。**ドメイン層が Adapter/Framework に依存する DIP 違反は検出されなかった。**
- ARCH-C-035（拡張ポート）を UseCase 層に「データ層抽象ポート（永続/同期の差替え）」として予約するのは、UseCase が出力ポート（インタフェース）を定義し将来 Adapter が実装する Clean Architecture の正しい適用。ADR-007 と整合。

### 1.2 命名（言霊）— 概ね良好、軽微な不整合あり

- モジュール名・コンポーネント名はドメインを限定した具体名（layout-engine, dependency-router, progress-line-builder, viewport-coordinator 等）で、CLAUDE.md「名は体を表す」規約に概ね準拠。汎用語 `data/info/manager/tmp` の濫用は無い。
- ただし識別子の「種別」表現が不統一: `item.kind`（'milestone'|'task'）・`comment.kind`・`annotation` は `kind` を使う一方、`icon.type`（'shape'|'emoji'|'imported'）は汎用語 `type` を使う（F-07, Low）。

### 1.3 SRP / SoC / 凝集・結合

- 各コンポーネントは単一責務に分解され、35 個の分割は概ね MECE。ただし ARCH-C-033（DOM・SVG・Web API ホスト）が「薄いホスト」でありながら描画スケジューリング（rAF/差分更新）基盤と NFR-L1-002（性能）実装を兼務しており、責務がやや広い（F-06, Medium）。
- ARCH-C-034（observability）が IO-L1-005（自動保存）・IO-L1-006（インポート検証）を `Implements` するが、これら要求の中核実装は ARCH-C-025 / ARCH-C-026 にある。C-034 はエラートースト表示（UX 通知）のみで、Implements の粒度が過剰・重複気味（F-05, Medium）。

### 1.4 ADR の内部整合

- ADR-001（SVG）・ADR-005（重要度 LOD）・ADR-009（仮想化 + PoC ゲート）は RISK-001（score 9）/ DEC-001 と整合し、Context→Decision→Consequences の論理が通る。ADR-004（異方性座標 + 画面空間固定オーバレイ）、ADR-006（直交ルーティング）、ADR-008（英語キー・多言語値）も Context から妥当に導かれる。
- ADR-007 は将来拡張を「item60 / STK-L0-018」と記すが、実装対象の ARCH-C-035 STATEMENT とモジュールコメントは「item59」と記す。00-overview の Out-of-scope は「item60」。同一の将来拡張群への参照 item 番号が文書間で不一致（F-04, Medium）。

---

## 2. R4（並行性・状態遷移）観点ノート

- 実行モデルは単一 HTML・vanilla TS・単一スレッド（ADR-002）。マルチスレッド/共有メモリのデッドロック・レースは構造上発生しない。localStorage は同期 API のため自動保存の Read-Modify-Write 競合も原則生じない。
- グリッジ（状態遷移中の中間不正状態）対策として、ARCH-C-019 が **イミュータブルなスナップショット + コマンド適用**で状態を原子的に差し替える設計であり、WYSIWYG 双方向同期（アイコン位置とプロパティの複数フィールド同時更新, ARCH-C-012）も 1 コマンド = 1 スナップショットで原子性が担保される。R4 の「複数フィールド同時更新の原子性」は設計レベルで満たされている。
- 差分描画 + requestAnimationFrame バッチ（ADR-009）はスナップショット単位で描画するため、部分更新が観測される瞬間的不正状態は避けられる設計。
- **不足:** 設計文書に状態遷移図が一切無い。特に (a) 自動保存の 3 状態（保存済／保存中／失敗、ARCH-C-025）の遷移、(b) インポートフロー（読込→検証→適用／拒否、ARCH-C-026）の状態遷移が図・表で定義されていない。observability-lite の範囲でも、失敗→復旧・拒否時のロールバック挙動が未定義（F-03, Medium）。
- **不足（軽微）:** File API の非同期読込（インポート）中にユーザー編集が入った場合の調停（インポートが現ドキュメントを置換するのか、マージするのか）が未記述（F-08, Low）。

---

## 3. R5（パフォーマンス）観点ノート

### 3.1 NFR-L1-002（約 50 行/約 1000 アイテムで 60fps・初期 1.5 秒）— 設計は妥当

- ADR-009 + DEC-001 の三本柱（ビューポート仮想化 = 可視+近傍のみ DOM 生成、重要度 LOD 間引き、差分描画 + rAF バッチ）は、SVG DOM の同時ノード数を「全 1000」から「可視+近傍の数十〜百数十」へ抑える標準的かつ合理的な手法。Phase 4 M1 ウォーキングスケルトンでの 1000 アイテム PoC 計測ゲートを設けており、未達時は Canvas 併用へ decision 再記録する退避路も定義済み。**設計レベルでは 60fps/1.5s 到達計画は plausible** と評価する。残留リスクは RISK-001（open, PoC まで受容）として正しく追跡されている。

### 3.2 依存線自動ルータ（ARCH-C-013 / ADR-006）— 計算量の懸念は認識済み

- 直交 + 障害物回避の経路探索は最悪 O(n²) 以上になりうるが、ADR-006 が「近傍のみ障害物」による計算量制御を明示。RISK-003 で追跡。設計レベルでは許容。
- **未定義（機能整合）:** LOD 間引きで依存線の端点アイテムが非表示になった場合の依存線の扱い（非表示化するか、端点までクランプするか）が設計に無い。仮想化で端点が DOM 非生成のときの描画規則も未記述。ジオメトリは純粋関数（UseCase）で算出可能なため性能上の破綻は無いが、表示規則の欠落は不整合の温床（F-09, Low）。

### 3.3 データ形式の完全性・往復整合

- **重大（F-01, High）:** `item.icon.importedAssetId` はインポート画像を参照するが、コアデータモデル ScheduleDocument（schemaVersion, meta, palette, i18n, viewState, sections, rows, items, dependencies, annotations, watermark）にも JSON トップレベル DATAFIELD にも、`ImportedAsset{id, format, sanitizedData}` を格納する配列（例: `assets[]` / `importedAssets[]`）が存在しない。ImportedAsset は ARCH-C-026（サニタイザ）が保持し、SVG エクスポート時は data URI で埋め込むと定義されるが、**JSON 主データ形式には保存先が無い**。結果として、インポート画像アイコン（ITEM-L1-007 / ITEM-L1-008）を持つドキュメントを JSON Export→Import すると `importedAssetId` が dangling となり画像が失われ、IO-L1-001（往復整合, Must）と 40-data-format 冒頭の「Export した JSON を再 Import しても意味が保持される」に反する（silently lossy）。
- MSPDI: MSPDI 非対応概念（マルチバー/アイコン/色/コメント/透かし/丸角囲み/previousPlan/viewState）をサイドカーで往復保持する方針自体は妥当。ただし DATA-MSPDI-006 の EXAMPLE `FieldID="grsch:sidecar"` は MSPDI の ExtendedAttribute 仕様（FieldID は数値の MS カスタムフィールド ID）に非適合で、実 MS Project を経由する往復では欠落/拒否されうる。gr-scheduler↔gr-scheduler の往復はサイドカー自読で成立するが、実 MS Project 経由はロッシー。Notes 格納または正規の ExtendedAttributes 定義を推奨（F-10, Medium）。なお画像アセットの往復も F-01 と同根で、サイドカー "icons": {} に実バイナリの格納先設計が無い。
- SVG エクスポート: 外部参照なし・data URI 埋め込み・フォント同梱・テキストのアウトライン化オプションを備え、自己完結契約は妥当（DATA-SVG-001..003）。
- 入力検証/エラーハンドリング（IO-L1-006, ARCH-C-026）: XXE 無効化・SVG ホワイトリスト無害化・innerHTML 直挿し禁止・スキーマ/型不適合拒否を定義し、RISK-007 と整合。良好。ただし schemaVersion 非互換時の「変換（migration）」経路（DATA-JSON-001）を担うコンポーネント/戦略が未定義（F-08 と併せ Low）。

---

## 4. 要求カバレッジ相互チェック（設計 vs 要求）

10-25 番台の要求 UID を全走査し、30-architecture の `Implements` リンクと突合した。**以下を除き全要求に実装コンポーネントが対応する。**

| 未カバー要求 | 優先度 | 内容 | 評価 |
|--------------|:---:|------|------|
| CANVAS-L1-006 | **Must** | 画面左の固定分類ペイン（i18n） | **High（F-02）** — Must 要求に Implements リンクが 1 件も無い。機能はレンダラ/レイアウト/ビューポート/i18n で実現可能だが、トレース欠落（CLAUDE.md 要求→設計 トレーサビリティ必須違反）。 |
| CANVAS-L1-011 | Should | 拡大時のマウスだけのドラッグパン | Medium（F-02） — ARCH-C-023 の Implements に含まれない。 |
| CANVAS-L2-001 | Should | 分類ペイン幅の可変化（ドラッグ） | Medium（F-02） — leftPaneWidth は ViewState に在るが、リサイズ操作を担うコンポーネントの Implements が無い。 |
| NFR-L1-008 | Could | 便利機能候補群 | Low — Could/トリアージ対象（RISK-017）。未実装は許容だが、design での採否 decision が未記録。 |

（他の全要求 = CANVAS/ITEM/PROP/ALIGN/ZOOM/SECT/DEP/CURS/PLAN/TOOL/IO/NFR 各群は Implements で 1 つ以上の ARCH-C にトレース済み。）

---

## 5. 指摘一覧（Findings）

| ID | 重大度 | 観点 | 対象 | 指摘（問題→影響） |
|----|:---:|:---:|------|------|
| F-01 | **High** | R5 | 40-data-format / ScheduleDocument, DATA-JSON-005/007, ARCH-C-026 | インポート画像アセット（ImportedAsset）の格納先がコアモデル/JSON に無く、`importedAssetId` が dangling → インポート画像アイコンが JSON 往復で消失し IO-L1-001 往復整合（Must）違反（silently lossy）。 |
| F-02 | **High** | R2 | 30-architecture / CANVAS-L1-006（Must）, CANVAS-L1-011, CANVAS-L2-001 | Must 要求 CANVAS-L1-006 に実装コンポーネントの Implements リンクが皆無（加えて Should の L1-011/L2-001 も未トレース）→ 要求→設計トレーサビリティに穴、テスト設計時にカバレッジ欠落。 |
| F-03 | Medium | R4 | 30-architecture §6 / ARCH-C-025, ARCH-C-026 | 自動保存 3 状態（保存済/保存中/失敗）とインポートフロー（読込→検証→適用/拒否）の状態遷移図が無く、失敗→復旧・拒否時ロールバックが未定義。 |
| F-04 | Medium | R2 | 30-architecture / ADR-007, ARCH-C-035 | 将来拡張の item 番号が不一致（ADR-007=item60, ARCH-C-035/モジュールコメント=item59, 00-overview=item60）。 |
| F-05 | Medium | R2 | 30-architecture / ARCH-C-034 | observability が IO-L1-005/IO-L1-006 を Implements するが中核実装は C-025/C-026。Implements の重複・粒度過剰でトレースが希薄化。 |
| F-06 | Medium | R2 | 30-architecture / ARCH-C-033 | 「薄いホスト」が描画スケジューリング基盤 + NFR-L1-002（性能）を兼務し責務が広い（SRP/SoC）。 |
| F-10 | Medium | R5 | 40-data-format / DATA-MSPDI-006 | サイドカー例 `FieldID="grsch:sidecar"` は MSPDI 仕様（数値 FieldID）に非適合。実 MS Project 経由の往復で欠落しうる。 |
| F-07 | Low | R2 | 40-data-format / DATA-JSON-007（icon.type） | 種別表現の不統一（item.kind/comment.kind に対し icon.type は汎用語 `type`）。命名（言霊）規約の一貫性。 |
| F-08 | Low | R4/R5 | 40-data-format / DATA-JSON-001, ARCH-C-024/026 | schemaVersion 非互換時の「変換（migration）」経路と、インポート中のユーザー編集調停が未定義。 |
| F-09 | Low | R5 | 30-architecture / ARCH-C-010, ARCH-C-013 | LOD 間引き・仮想化で依存線の端点アイテムが非表示/非生成のときの依存線の表示規則が未定義。 |

（NFR-L1-008 未トリアージは §4 表内に Low として記録。）

---

## 6. Critical/High の修正指示（file / UID / 具体策）

### F-01（High）— インポート画像アセットの JSON 格納先が無い
- **file:** docs/spec/40-data-format.sdoc（および 30-architecture.sdoc の ScheduleDocument 定義 ARCH-C-001）
- **UID:** DATA-JSON-005 / DATA-JSON-007 近傍、ARCH-C-001, ARCH-C-026, IO-L1-001
- **具体策:** ScheduleDocument トップレベルに `assets[]`（または `importedAssets[]`）を追加し、`ImportedAsset{id, format('svg'|'png'), sanitizedData(data URI/base64)}` を保持する新規 DATAFIELD（例 DATA-JSON-013, Satisfies: IO-L1-001, ITEM-L1-007/008）を定義する。`item.icon.importedAssetId` はこの配列を参照する旨を明記。ARCH-C-001 の集約フィールド列挙にも `assets[]` を追加し、JSON 変換（ARCH-C-017）の往復対象に含める。MSPDI サイドカー（DATA-MSPDI-006）にも同アセットの格納方針を追記する。

### F-02（High）— Must 要求 CANVAS-L1-006 に実装コンポーネントの Implements が無い
- **file:** docs/spec/30-architecture.sdoc
- **UID:** CANVAS-L1-006（Must）、加えて CANVAS-L1-011・CANVAS-L2-001（Should）
- **具体策:** 左固定分類ペインを実際に描画/配置/固定する担当コンポーネントに Implements リンクを追加する。妥当な割当は、CANVAS-L1-006 = ARCH-C-022（SVG レンダラ、分類ペイン描画）＋ ARCH-C-011（レイアウトエンジン、leftPaneWidth 領域算出）、CANVAS-L1-011（ドラッグパン）= ARCH-C-023（ポインタ・ジェスチャコントローラ）、CANVAS-L2-001（ペイン幅ドラッグ可変）= ARCH-C-023 ＋ ARCH-C-021（viewport-coordinator, leftPaneWidth 保持）。併せて NFR-L1-008 の採否を design decision として記録する。

---

## 7. 指摘対応テーブル（review-standards「レビュー指摘対応ルール」/ document-rules §9.3）

| 指摘 ID | 重大度 | 対応状態 | 担当 | 対応内容/理由 | 再レビュー |
|---------|:---:|:---:|------|------|:---:|
| F-01 | High | open | architect | 未対応（修正必須） | 要 |
| F-02 | High | open | architect | 未対応（修正必須） | 要 |
| F-03 | Medium | open | architect | 未対応 | 要 |
| F-04 | Medium | open | architect | 未対応 | 要 |
| F-05 | Medium | open | architect | 未対応 | 要 |
| F-06 | Medium | open | architect | 未対応 | 要 |
| F-10 | Medium | open | architect | 未対応 | 要 |
| F-07 | Low | open | architect | 未対応 | 任意 |
| F-08 | Low | open | architect | 未対応 | 任意 |
| F-09 | Low | open | architect | 未対応 | 任意 |

- High（F-01, F-02）は修正必須（フェーズ遷移ゼロ要件）。
- Medium 5 件（F-03/F-04/F-05/F-06/F-10）は orchestrator が対応方針（修正/据置き/受容）の承認を得ること。据置きは decision 記録、受容は本テーブルに理由記載が必要。

---

## 8. 結論

- **VERDICT: FAIL**（High 2 件）。
- 良好点: Clean Architecture/DIP 準拠、依存方向の内向き整合、イミュータブル + コマンドによる R4 原子性、ADR-009/DEC-001 による R5 性能設計（仮想化 + LOD + 差分 + PoC ゲート）はいずれも妥当。
- 修正必須: F-01（データ往復整合を破るアセット格納先欠落）と F-02（Must 要求の設計トレース欠落）。architect が 30-architecture.sdoc / 40-data-format.sdoc を修正し再レビューを依頼すること。Medium 5 件は orchestrator の対応方針承認を経てゲート判定する。
</content>
