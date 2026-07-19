# レビュー報告: CR-002 / CR-003 仕様反映レビュー

- 対象: CR-002（予実配色・マイルストーン描画・ベースライン別ファイル参照）および CR-003
  （ヘッダー再編・ラベル位置・依存線自動配線）の `.sdoc` 反映＋横断チェック
- 形式: アドバーサリアル・レビュー（R1 要求品質 / R2 設計原則 / R4 並行性・状態遷移）
- 出力先: `project-records/reviews/R-CR002-CR003-spec-review.md`
- 注記: 本ファイルは CR-002 担当と CR-003 担当が各自セクションを **追記** する共有ファイル。

<!-- CR-002 セクションは CR-002 担当レビューアが追記する。上書き禁止。 -->

---

## CR-003 + 横断チェック レビュー（review-agent, 2026-07-20）

- レビューア: review-agent
- 権威ソース: `project-records/change-requests/change-request-003-20260720-063933.md`（Part 1/2/3）
- SSOT: `docs/api/gr-scheduler.schema.next.json`
- 手法: R1（要求品質＝構造品質＋表現品質）, R2（設計原則）, R4（状態遷移）。
  StrictDoc 構造健全性は `strictdoc export docs/spec` を再実行して確認（EXIT=0）。

### 総合判定: **PASS**（Critical=0, High=0）

Medium 1 件（トレーサビリティ記録の UID 引用不正確）、Low 3 件。Medium は orchestrator へ
対応方針の承認を求める（下記ルーティング参照）。仕様 `.sdoc` 本体・スキーマ・アーキテクチャの
構造/整合は健全であり、フェーズ遷移をブロックする指摘は無い。

### 検証サマリ（依頼 6 項目）

| # | 検証項目 | 結果 | 根拠 |
|---|---------|------|------|
| 1 | CR-003 Part1 ヘッダー（TOOL-L1-008）ボタン順序・各ボタン意味・item60 非該当 | PASS | 19-tools-watermark.sdoc:58-140。15 要素の順序が CR §2/§6 と一致、各ボタンに機能実体を明記、既存 TOOL-*/IO-* と整合注記あり |
| 2 | CR-003 Part2 ラベル（ITEM-L2-002 inner-left / ITEM-L2-003 icon-right / ALIGN-L2-003 はみ出し衝突回避） | PASS | inner-left が left と峻別され既定=タスク、schema.next.json enum に inner-left 存在、40-data-format に文書化 |
| 3 | CR-003 Part3 依存線自動配線（右出/左入・2×スタブ・下折れ/上折れ・行間ギャップ・折れ点0-3） | PASS | 16-dependencies.sdoc DEP-L1-002/003, DEP-L2-001/002 整合。CR-001 DEP-L1-005/006 未改変 |
| 4 | OBS-1（30-architecture）語彙・モジュールパス・図の外部化 | PASS | 陳腐化 planActual('plan'\|'actual') 語彙なし、nested icon path なし、パスは実ツリーと一致、inline mermaid 3 図は外部化済 |
| 5 | 横断（コードネーム purge・トレーサビリティ UID 実在・StrictDoc 健全性） | 一部 MEDIUM | コードネーム purge 完全、UID 実在、export EXIT=0。ただしトレース記録の UID 引用が不正確（M-1） |
| 6 | アドバーサリアル（UID衝突・壊れRELATION・Parent層・図参照・規則矛盾） | PASS | export EXIT=0＝衝突/未解決RELATION 0、Parent 層すべて正、図参照先 4 ファイル実在、規則矛盾なし |

### 指摘一覧（重大度順）

#### [MEDIUM] M-1 トレーサビリティ CR-003 節の UID 引用が不正確・新規 UID の記載漏れ

- 箇所: `project-records/traceability/traceability-matrix.md:163-167`（CR-003 改訂トレース表）
- 問題:
  1. 実際に **新規追加された UID**（TOOL-L1-008 / ITEM-L2-002 / ITEM-L2-003 / ALIGN-L2-003）が
     トレース表に一切記載されていない。表は親/関連の既存 UID（TOOL-L1-001/002/004/005、
     ITEM-L1-009/010、ALIGN-L1-001/ALIGN-L2-001）を「（改訂）」として挙げるのみ。
  2. これら親 UID は「（改訂）」と表記されているが、`.sdoc` 本文（19/11/13 各仕様）を確認した限り
     **STATEMENT 本文は改変されていない**（新規 sibling 要求が追加されただけ）。よって「（改訂）」の
     表記は事実と不一致。
  3. Part3 の配線規則で **全面書き換えされた DEP-L1-003** が表に記載されていない（表は DEP-L1-002
     の注記と DEP-L2-001/002 の specialize のみ挙げる）。
- 影響: 人間可読のロールアップ表が「どの要求 UID が CR-003 で生まれ/変わったか」を誤って伝える。
  StrictDoc の機械トレース（DEEP TRACE / MATRIX、export EXIT=0）は RELATIONS 経由で正しく捕捉して
  いるため機能的トレース断絶ではないが、記録の完全性・正確性を損なう。
- 重大度根拠: 機械可読 SSOT は健全で要求本体も構造健全のため High ではない。記録の正確性欠落として
  Medium。
- 修正案: 163-167 行を実際の追加/改訂 UID で書き換える。例:
  - 「TOOL-L1-008（新規）」＝ヘッダー配置順・各ボタン意味
  - 「ITEM-L2-002（新規）inner-left 既定 / ITEM-L2-003（新規）マイルストーン icon-right」
  - 「ALIGN-L2-003（新規）はみ出し衝突の縦オフセット回避」
  - 「DEP-L1-003（改訂・決定的配線へ書換）/ DEP-L1-002（注記）/ DEP-L2-001（specialize）/
    DEP-L2-002（整合明記）」
  親 UID を併記する場合は「（改訂）」ではなく「（親・本文不変。子要求追加）」等の正確な表記にする。

#### [LOW] L-1 ARCH-C-013 / ADR-006 が CR-003 Part3 の specialize を未反映

- 箇所: `docs/spec/30-architecture.sdoc:382-403`（ARCH-C-013 依存線自動ルータ）, `:1024-1038`（ADR-006）
- 問題: ルータ記述が「9 点アンカー間を…障害物回避経路を探索」という汎用配線のままで、CR-003 の
  決定的規則（始点=middle_right / 終点=middle_left 固定、右出/左入、行間ギャップ）に触れていない。
- 影響: 汎用配線は決定的配線の上位集合であり矛盾ではない。ただし設計記述と要求（DEP-L1-003/L2-001）の
  現況にズレがある。
- 重大度根拠: CR-003 §3 影響範囲表に 30-architecture の配線更新は含まれておらず、スコープ外。矛盾では
  ないため Low。
- 修正案: 実装フェーズで ARCH-C-013 STATEMENT / ADR-006 に「CR-003 Part3 により決定的直交配線へ
  specialize」の一文を追記（任意）。

#### [LOW] L-2 ALIGN-L2-003 の UID 採番が文書内順序と非連続

- 箇所: `docs/spec/13-layout-alignment.sdoc:63`（ALIGN-L2-003 が §1 に配置。ALIGN-L2-002 は §3）
- 問題: 新規 ALIGN-L2-003 が整列 §1 に置かれ、既存 ALIGN-L2-002（座標-日付写像、§3）より前方に
  出現。UID 番号と文書出現順が逆転。
- 影響: StrictDoc は許容（export EXIT=0）。整列関連の論理グルーピングとしては妥当。純粋に体裁上の
  読みづらさのみ。
- 修正案: 任意。整合を重視するなら将来のリナンバリング時に検討（現状放置可）。

#### [LOW / 情報] L-3 TOOL-L1-008 の線形順序と実装済み 3 ゾーンヘッダーの整合は実装フェーズで要調停

- 箇所: `docs/spec/19-tools-watermark.sdoc:63-140`（TOOL-L1-008 線形順序。タイトル=位置2） vs
  `traceability-matrix.md:79-88`（実装済み HEADER-G＝左/中央/右の 3 ゾーン、タイトル中央寄せ、
  Undo/Redo/AI/? を右ゾーン）
- 問題: TOOL-L1-008 は「左→右の単一線形順序」でタイトルを位置 2 に置くが、既存実装は 3 ゾーンで
  タイトルを中央に置く。TOOL-L1-008 はゾーン/中央寄せの意味論に言及していない。
- 影響: 仕様間の矛盾ではない（本件は新仕様 vs 既存実装であり、CR-003 は仕様先行・実装 pending）。
  ただし実装セッションがタイトル配置（線形か中央か）を明示的に調停する必要がある。
- 修正案: 実装フェーズで TOOL-L1-008 の「順序」を論理順序（左ゾーン→中央→右ゾーンの読み順）として
  実装するか、線形バーへ改めるかを決定し、必要なら TOOL-L1-008 に注記を追加。

### 各観点 PASS の詳細根拠

- **R1 Part1（TOOL-L1-008）**: ボタン 15 要素の順序が CR §6 受入基準と完全一致。SS＝ビューポート PNG、
  Save＝全キャンバス Fix の JSON/XML/SVG/PNG、テーマ 4 種、Base V/I＝ベースライン可視トグル
  （CR-002 連動、planActualDisplay と独立と明記）、AI＝プロンプト+スキーマ copy、?＝ヘルプ。
  各ボタンに機能実体の定義があり、item60（無意味な汎用語禁止）は UI ラベル＋意味表で満たす。
  IO-L1-001/002/003 と入出力対応、IO-L1-006 で Import 検証、TOOL-L1-001/002/004/005 と整合注記あり。
- **R1 Part2**: ITEM-L2-002 が inner-left（バー内左）を既定とし left（バー外左）と峻別、Parent=ITEM-L1-009。
  ITEM-L2-003 が milestone icon-right、Parent=ITEM-L1-009。schema.next.json:173 の enum に inner-left 実在、
  40-data-format.sdoc:123-124,347-348,1001,1007 で inner-left をタスク既定として文書化。ALIGN-L2-003 が
  はみ出し許容＋同一セクション内縦オフセット回避を ALIGN-L2-001 ソルバ枠組みへ制約追加、Parent=ALIGN-L1-001。
- **R2/R4 Part3**: DEP-L1-002 は 9 点座標定義を保持しつつ手動選択面を簡素化（自動のみ、始点 middle_right /
  終点 middle_left）。DEP-L1-003 は右出/左入・2×スタブ・後続下=出直後下折れ・後続上=直前縦折れ・
  上下積み水平重なり=行間ギャップ・前進依存主対象を規定。DEP-L2-001 が middle_right/middle_left 固定へ
  specialize、DEP-L2-002 の折れ点 0-3 と整合明記。DEP-L1-004（最小矢じり）・DEP-L1-005/006（linkType/lagDays,
  CR-001）は未改変。16-dependencies の 9 点アンカー mermaid も A6→A4（middle_right→middle_left）へ更新済で
  CR-003 と一致。
- **R2 OBS-1（item4）**: ライブ語彙は planActualDisplay/planActualStyle（30-architecture:228-231,411）で、
  planActual('plan'|'actual')/planActualKind の陳腐化語は **廃止（retirement）注記** のみ（:136-138）で
  ライブモデルには残らない。アイコンは flat な item.importedAssetId 参照でネストパスなし（:133）。
  モジュールパスは実ツリーと一致（src/adapters 複数形、src/domain/usecase フラット）。スポットチェック:
  ARCH-C-013→src/domain/usecase/dependency-router.ts、ARCH-C-012→alignment-solver.ts、
  ARCH-C-001→src/domain/model/schedule-model.ts、ARCH-C-022→src/adapters/render/svg-renderer.ts、
  ARCH-C-024→src/adapters/io/file-io.ts いずれも実在。ARCH-C-035（src/domain/ports/extension-ports.ts）と
  ARCH-C-020（template-provider.ts）は未実在だが「reserved / not yet in tree」と明記（:74,938）で意図的。
  inline mermaid 3 図は 30-architecture から除去され `_assets/arch-component-overview.md` /
  `arch-autosave-state.md` / `arch-import-state.md` / `component-architecture-full.md` へ外部化。4 図とも
  実在し `stateDiagram-v2` / flowchart の有効な mermaid で、状態名（autosave: idle/saving/saved/failed、
  import: idle/reading/validating/applying/applied/rejected）が §7 本文と完全一致。
- **横断（item5）**: コードネーム purge 完全（`案H|Model H|モデルH|Model E|Plan H|scheme H` で
  docs/spec に **ヒット 0**）。planActualKind/planGroupId/previousPlan の出現はすべて「廃止」文脈の
  意図的 retirement 注記。CR-003/CR-002 関連 UID 実在確認: TOOL-L1-008 / ITEM-L2-002 / ITEM-L2-003 /
  ALIGN-L2-003 / DEP-L1-002/003/L2-001/002 / PLAN-L1-004/005/006 / DATA-JSON-016 いずれも `.sdoc` に実在。
  StrictDoc `strictdoc export docs/spec` = **EXIT 0**（未解決 RELATION は hard error のため 0＝全解決、
  重複 UID も 0）。
- **アドバーサリアル（item6）**: UID 衝突なし（export 成功）。壊れた RELATION なし。Parent 層すべて正
  （TOOL-L1-008 L1→STK-L0-021 L0、ITEM-L2-002/003 L2→ITEM-L1-009 L1、ALIGN-L2-003 L2→ALIGN-L1-001 L1、
  DEP 各要求→STK-L0-010 / DEP-L1-003）。図参照先 `_assets/*.md` はすべて実在。ヘッダー/ラベル/依存線
  規則が他仕様と矛盾する箇所は検出されず（L-3 は仕様間矛盾ではなく仕様先行 vs 既存実装の調停事項）。

### FAIL 時ルーティング（参考・本判定は PASS）

- M-1 は仕様 `.sdoc` ではなく `project-records/traceability/traceability-matrix.md`（記録）への指摘。
  test-engineer / トレーサビリティ担当（または change-manager）が CR-003 節の UID を実 UID へ修正する。
  修正は品質ゲートをブロックしない（記録の正確性向上）。

### 再レビュー時の検証観点

- M-1 修正後: 163-167 行に TOOL-L1-008 / ITEM-L2-002 / ITEM-L2-003 / ALIGN-L2-003 / DEP-L1-003 が
  実 UID で明記され、親 UID の「（改訂）」表記が実態（本文不変・子追加）に合わせて訂正されていること。

---

## CR-002 仕様反映レビュー（review-agent, 2026-07-20・敵対的）

- レビューア: review-agent
- 権威ソース: `project-records/change-requests/change-request-002-20260720-054132.md`（Part 1/2/3・2026-07-20 ベースライン詳細・§3・§8）、CR-001（supersede 元）
- SSOT: `docs/api/gr-scheduler.schema.next.json`（次期版・フィールド形状の正）
- 対象: `docs/spec/18-plan-actual.sdoc`（PLAN-L1-006 新設・PLAN-L2-001 マイルストーン特例・PLAN-L1-004 ベースライン改訂）/ `docs/spec/40-data-format.sdoc`（previousPlan 廃止・DATA-JSON-016 新設・DATA-MSPDI-003 best-effort・schemaVersion integer・§5 橋渡し）/ `gr-scheduler.schema.next.json` / `_assets/domain-model-class.md` / `sequence-progress-line.md` / `sequence-io-roundtrip.md`
- 観点: R1（R1a 構造品質＋R1b 表現品質）＋データ形式契約の正当性（次期版スキーマ整合・MSPDI 往復忠実度・内部整合・トレース健全性）
- スコープ制約（CR-002 §8）: 仕様先行。現行 `gr-scheduler.schema.json`（previousPlan 保持）/ `src/**` / `tests/**` の未変更は指摘対象外。`schema.next.json` が実装スワップ時の目標形状の正。§5 橋渡しはプローズが正。

### 総合判定: **PASS**（Critical=0, High=0）

- Critical: **0** / High: **0** / Medium: **1** / Low: **3** / 参考（スコープ外・非回帰）: **1**

CR-002 の 3 パート（Q1 配色・Q2 マイルストーン・Q3 ベースライン別ファイル参照）は仕様・データ契約・図の各面で一貫反映。previousPlan は次期版 SSOT・item フィールド表・ドメインモデルから live 定義として完全除去され、残存言及はすべて廃止/対比プローズ。Medium 1 件・Low 3 件は品質ゲートを塞がない。

### 機械検証の結果

| 検証 | 結果 |
|---|---|
| `strictdoc export docs/spec` | exit 0（構造健全・dangling UID なし・PLAN-L1-006 新設と PLAN-L2-001/PLAN-L1-004/DATA-JSON-016 追記後も全 RELATIONS 解決） |
| previousPlan の live 定義（schema.next.json） | 除去確認（プロパティ定義なし。$comment:4 の廃止説明のみ） |
| previousPlan 残存言及（18/40/図） | すべて廃止/対比プローズ（18:183,187,192,198 / 40:534,615,672,729,998,1006,1009 / domain-model:6,17,19,213 / io-roundtrip:135） |
| schema.next.json ↔ 40 item表 ↔ domain-model | 一致（actualStart/actualEnd/targetDate/progressRatio/planActualStyle 存在・planActualKind/planGroupId/previousPlan 不在・inner-left） |
| schemaVersion 型 | integer で統一（schema.next.json:16-19・40:45-47・DATA-JSON-001:206「semver 文字列ではない」・例:144=1・domain-model:33。"1.0.0" 不使用） |
| MSPDI LinkLag（暦日近似） | 自己整合（DATA-MSPDI-004:755-762「暦日1日=14400、lagDays10=144000」・LagFormat 8。CR-001 High-3 の稼働日矛盾は解消済） |
| front 4ケース MECE ＋ マイルストーン特例 | 網羅・sequence-progress-line.md と一致 |

### 検証項目別（Q1〜Q5）

- **Q1 配色（PLAN-L1-006）— PASS**: 彩度導出（ベース fillColor 1 色→予定=淡/実績=濃、18:246-248）／非色冗長符号=線幅（予定細・実績太、破線不使用、18:248-249、40:350）／旧固定 緑・橙 2 色廃止（18:250-251）／fillColorExplicit 優先（18:249-250、schema.next.json:158）／WCAG 1.4.1・1.4.3（18:248,250,257,262）／配色は描画派生・fillColor は保存値（40:350-351）。すべて充足。
- **Q2 マイルストーン（PLAN-L2-001）— PASS（Medium-1 の完全性指摘あり）**: 点特例（front=実績あれば actualStart・無ければ startDate・補間なし、18:138-140,156-158）／task 4 ケース MECE 維持（18:129-135、actualStart 有無×actualEnd/progressRatio の 2×2）／sequence-progress-line.md 一致（Q0 milestone 先頭分岐→M1、以降 4 ケース・2 を 2a/2b クランプ分割、23-55）。ただし「2 マーカー・区間塗り無し」の**描画**規則は要求未定位（Medium-1）。
- **Q3 ベースライン（PLAN-L1-004/DATA-JSON-016/DATA-MSPDI-003）— PASS**: previousPlan 全廃（schema.next.json live 定義なし・item 表不在・domain-model ScheduleItem 不在）／DATA-JSON-016（別 JSON のみ・読取専用・id 突合・同高さグレー・独立トグル、40:526-549）／DATA-MSPDI-003 best-effort id 突合（40:726-732）／domain-model に BaselineReferenceDocument（フィールドでなく別文書、82-87,174,208-213）／PLAN-L1-004 は DATA-JSON-016＋DATA-MSPDI-003 の双方から Satisfies（孤児なし、export exit 0）。
- **Q4 整合 — PASS**: フィールド集合三者一致・planActualStyle は viewState 側・schemaVersion integer・labelPosition inner-left が schema.next.json:173／40:122-124,348／domain-model:205-207 で一致。
- **Q5 敵対的走査 — 重大な破綻なし**: dangling UID/broken RELATIONS なし（export exit 0）、PLAN-L1-006 Parent STK-L0-011 実在（01:177）、数値誤りなし（LinkLag 144000・PercentComplete 40）、CR-002 領域のゴーストフィールド（start/end/kind/planActual/showPlan/showActual/planActualKind/planGroupId）再導入なし。CR-002 で触れた例フィールドは次期版スキーマと一致。

### 指摘一覧（重大度順）

#### [MEDIUM] Medium-1 マイルストーン「2 マーカー・区間塗り無し」描画が要求として未定位

- 箇所: `18-plan-actual.sdoc`（PLAN-L1-005 :210-237 / PLAN-L2-001 :118-163）。根拠 CR-002 §Part 2（:53-62）・受入基準（:134-135）。
- 問題: CR-002 Part 2 の 2 側面 ―(a) マイルストーン予実を「予定マーカー＋実績マーカーの 2 点」で描き**区間を塗らない**、(b) front を点に退化 ― のうち (b) のみ PLAN-L2-001 に取り込まれ、(a) の描画規則がどの要求にも定位されていない。PLAN-L1-005（Overlap/Separate）は「予定バーの上に…塗り重ねる」等**スパン前提**で書かれ、幅 0 マイルストーンへの挙動を規定しない。(a) は §5 橋渡し（40:1017 item-layer 注記）と CR 本文のみに存在。
- 影響: 受入基準「マイルストーンの予実が…2 点・塗り無しで描かれ」を実証する要求が欠落。実装者が Overlap/Separate をマイルストーンにどう適用するか独自解釈するおそれ。R1 完全性（MECE）の隙間。
- 修正案: PLAN-L1-005 に「itemKind=milestone（幅 0）では Overlap/Separate いずれでも区間塗りを行わず、予定マーカー（startDate）＋実績マーカー（actualStart）の 2 点で予実ズレを表す」を追加、または PLAN-L2-001 と対の描画側コンポーネント要求（例 PLAN-L2-002）を新設。VERIFICATION に「マイルストーンで区間塗りが生じないこと」を追記。CR 承認範囲の反映漏れ補完のため change-manager 経由は不要。

#### [LOW] Low-1 PLAN-L2-001 case 3/4 の progressRatio 境界文言が present-but-zero で曖昧

- 箇所: `18-plan-actual.sdoc:133-135`（case 3「progressRatio あり」/ case 4「progressRatio なし/0」）、VERIFICATION :153。
- 問題: 「あり（present）」と「なし/0」は、値が存在し 0 のケースで両文言に該当し MECE 相互排他が文言上崩れる。意図（case3=>0、case4=0 または未指定）は括弧書きと sequence-progress-line.md:63「ratio > 0」で明確だが本文閾値が不精確。
- 影響: 軽微（progressRatio=0 で頂点の有無がぶれ得るが 0×span=0 で実害小）。
- 修正案: case 3=「progressRatio > 0」、case 4=「progressRatio = 0 または未指定」と閾値明記し、flowchart（sequence-progress-line.md:37「progressRatio > 0?」）と用語一致。

#### [LOW] Low-2 CR-002 改訂 DATAFIELD の SSOT ポインタが現行 schema.json を指し記述形状は schema.next.json と一致（部分崩れ）

- 箇所: `40-data-format.sdoc` DATA-JSON-006:326 / DATA-JSON-007:351-352 / DATA-JSON-015:515 / DATA-JSON-016:541 / §0 本文:24-26。
- 問題: これら DATAFIELD は「型・形状は SSOT スキーマ（`gr-scheduler.schema.json`）が規定」と現行を指すが、現行 schema.json は previousPlan を保持（schema.json:138,178）し、記述側プローズ（previousPlan 廃止・actual・inner-left）は schema.next.json のみに一致。SSOT ポインタの指す先と記述形状の出所が食い違う。§5（977-1026）が段階化を明示し誤解を緩和するが、DATAFIELD 単体では廃止済みフィールドを持つ schema.json に辿り着く。
- 影響: 軽微（§5 で救済・意図的段階化）。自己言及の弱い不整合が残る。
- 修正案: CR-002/CR-003 で形状が変わる DATAFIELD の SSOT ポインタに「実装スワップ後の目標形状は schema.next.json。現行 schema.json はスワップまで旧形状を保持（§5・CR §8）」を添える、または §5 相互参照を明示。据置き可。

#### [LOW] Low-3 新設 PLAN-L1-006 に下流 Satisfies/Verifies が無く、テスト仕様に previousPlan 残存

- 箇所: `18-plan-actual.sdoc:239-267`（PLAN-L1-006、Parent STK-L0-011 のみ）、`50-test-spec.sdoc:168,472` / `51-test-results.sdoc:335`（previousPlan を live 概念として参照）。
- 問題: (a) PLAN-L1-006（配色・線幅）は上位 STK-L0-011 のみで下流 Satisfies（40:350 は言及のみで ITEM-L1-006/009 を Satisfies）・テスト Verifies が無い。(b) 50/51（本レビュー対象外・意図的不変）は previousPlan を現役概念として記述し、実装スワップ時に PLAN-L1-006 の検証追加と previousPlan 記述の更新が要る。
- 影響: 軽微・段階化の範囲内。V 字トレース完全性上 PLAN-L1-006 は現状テスト被覆なしの新規要求。
- 修正案: 実装フェーズで PLAN-L1-006 を Verifies するテスト（彩度導出・線幅・グレースケール判別・fillColorExplicit 優先）を追加し、50/51 の previousPlan 記述を DATA-JSON-016 方式へ更新。据置き。

### CR-002 スコープ外・非回帰の参考指摘（別途調整を推奨）

#### [参考・既存] 参考-A 40-data-format §1 プローズ/例 ↔ 次期版スキーマの広域構造乖離（CR-002 回帰ではない）

- 箇所: `40-data-format.sdoc` §1 トップレベル表（38-85）・item 表（91-127）・JSON 例（143-196）・DATA-JSON-002/003/004/005/009/010/011/012/013、対 `gr-scheduler.schema.next.json`。
- 問題: 40 のプローズ/例は旧ネスト志向モデルを描き、次期版スキーマ（現行コード）は flat モデル。主な乖離: トップレベル `meta`/`palette`/`i18n`（40）↔ `title`/`epochDate` 直持ち（schema）／`category:{…}`・`classification:{…}`（40）↔ `majorCategory`…・`classificationLabel`（schema）／viewState `timeGranularity`/`cursors`（40）↔ `dualCursor`/`todayLineVisible`…（schema）／`{comment:{kind}}` ラッパ（40）↔ flat `annotationKind`（schema）／`format`/`sanitizedData`（40）↔ `assetFormat`/`sanitizedDataUri`（schema）／abbrev/fullName の i18n オブジェクト（40）↔ string（schema）。
- 裁定: **CR-002 の回帰ではない**（40 担当が事前指摘の既存広域乖離。CR-002 は previousPlan/actual/planActualStyle/inner-left/baseline のみを触り一貫反映済み）。文書整合上の重大度は高いが CR-002 ゲートには**影響しない**（本判定 PASS を覆さない）。
- 推奨: 40-data-format §1 を `schema.next.json` の flat 形状へ一括同期する専用調整タスク（別 CR もしくは実装スワップと同一セッション）を起票し、CR-002 とは分離。放置すると CR-001 レビューで是正した「例と SSOT の名称二重化」型 defect が §1 全域に再燃する。

### CR-001 指摘の回帰確認（再レビュー検証）

先行 R-CR001-spec-review.md（VERDICT FAIL / High 5）の High 指摘は、CR-001 実装先行差分＋本 CR-002 反映を通じ現状態で解消を確認。

| 前回 | 内容 | 状態 | 検証箇所 |
|---|---|---|---|
| CR-001 High-1 | 例の予定スパン名 start/end が SSOT と不一致 | 解消（startDate/endDate 統一・previousPlan 例除去） | 40 例:162-184 |
| CR-001 High-2 | 例 viewState が showPlan/showActual | 解消（planActualDisplay/planActualStyle） | 40:151、DATA-JSON-011 |
| CR-001 High-3 | LinkLag 稼働日換算で「暦日近似」と自己矛盾 | 解消（14400/日・144000・LagFormat=8） | DATA-MSPDI-004:755-762 |
| CR-001 High-4 | front 3分岐が進行中で未定義 | 解消（4 ケース MECE・case2 Formula A＋クランプ） | PLAN-L2-001:129-140 |
| CR-001 High-5 | 相互参照に非存在 UID | 解消（export exit 0・全 RELATIONS 解決） | 機械検証 |

### 指摘対応テーブル（document-rules §9.3 準拠）

| ID | 重大度 | 観点 | 推奨対応 | 対応記録の所在 | 状態 |
|----|--------|------|---------|----------------|------|
| Medium-1 | Medium | R1a/R1b 完全性 | fixed = PLAN-L1-005 追記 or PLAN-L2-002 新設（orchestrator トリアージ） | — | 未対応 |
| Low-1 | Low | R1b 曖昧性 | fixed = case3/4 を >0 / =0・未指定に文言化 | — | 未対応 |
| Low-2 | Low | R1a 文書整合 | accepted or fixed = SSOT ポインタに §5 相互参照 | — | 未対応 |
| Low-3 | Low | R1a トレース | deferred = 実装フェーズでテスト追加・50/51 更新 | — | 未対応 |
| 参考-A | （スコープ外・非回帰） | 文書整合 | 別タスク起票（CR-002 ゲート対象外） | — | 別途調整 |

- ゲート要件: Critical/High=0（達成）。Medium/Low は全件に対応記録が付くこと（本テーブルで追跡）。
- FAIL 時ルーティング: 本判定 PASS のため戻し不要。Medium-1/Low-1〜3 を修正する場合の戻り先は 18-plan-actual・40-data-format の要求/契約文言（planning/design 相当）。

### 結論

CR-002（Q1 配色・Q2 マイルストーン・Q3 ベースライン別ファイル参照）の仕様反映は Critical/High ゼロで **PASS**。previousPlan は次期版 SSOT・item 表・ドメインモデルから完全除去（残存は廃止/対比プローズのみ）。DATA-JSON-016・DATA-MSPDI-003・PLAN-L1-006・PLAN-L2-001 点特例が仕様・図・スキーマで一貫、schemaVersion integer・inner-left も三者整合。Medium-1（マイルストーン 2 マーカー描画の要求定位）と Low-1〜3 はゲートを塞がないが実装フェーズ前に対応記録を残すこと。参考-A（40 §1 プローズ ↔ 次期版スキーマ広域乖離）は CR-002 回帰ではないが実装スワップと同期して別途一括調整を強く推奨する。

---

## レビュー後 disposition（change-manager, 2026-07-20）

- **CR-002 Medium-1**（マイルストーン「2 マーカー・区間塗り無し」描画の要求未定位）:
  対応済み — 18-plan-actual.sdoc に描画要求を追記（architect、本セッション）。
- **CR-002 Low-1**（case 3/4 progressRatio 境界文言の曖昧性）:
  対応済み — MECE 文言を `>0` / `=0・未指定` へ修正（本セッション）。
- **CR-002 Low-2**（SSOT ポインタが現行 schema.json を指し記述形状は schema.next.json と一致）:
  accepted — §8 の段階化方針で既に説明済みであり、実装スワップ時に自己解消するため追加修正は不要。
- **CR-002 Low-3**（PLAN-L1-006 の下流 Satisfies/Verifies 不在、50/51 に previousPlan 残存）:
  実装フェーズ対応 — deferred のまま。
- **CR-003 L-1**（ARCH-C-013 / ADR-006 が Part3 decisive routing 未反映）:
  実装フェーズ対応 — deferred のまま。
- **CR-003 L-2**（ALIGN-L2-003 の UID 採番が文書内順序と非連続）:
  accepted — 体裁のみの指摘であり StrictDoc 構造健全性に影響しないため現状維持。
- **CR-003 L-3**（TOOL-L1-008 線形順序 vs 実装済み3ゾーンヘッダーの調停）:
  実装フェーズ対応 — deferred のまま。
- **参考-A**（40-data-format §1 プローズ ↔ 次期版スキーマの広域構造乖離、CR-002/CR-003 の回帰ではない
  既存ドリフト）: `project-records/defects/DEF-004-prose-schema-divergence.md` を起票し、実装スワップ
  と同期した一括同期タスクとして追跡する。
