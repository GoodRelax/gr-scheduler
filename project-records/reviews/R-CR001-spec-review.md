# R-CR001 レビュー報告 - CR-001 予実「実績日フィールド方式」仕様改訂（敵対的レビュー）

- 対象: `docs/spec/18-plan-actual.sdoc` / `docs/spec/16-dependencies.sdoc` / `docs/spec/11-items-icons.sdoc` / `docs/spec/40-data-format.sdoc`（CR-001 改訂差分）
- 観点: R1（R1a 要求構造品質 + R1b 要求表現品質）＋ データ形式契約の正当性（実績日フィールド方式のフィールド・MSPDI 往復忠実度・内部整合）
- 基準: `process-rules/review-standards.md` R1、CLAUDE.md 品質目標（レビュー指摘 Critical:0 / High:0）
- 実施日: 2026-07-20 / 実施: review-agent
- 参照した正: CR-001（`change-request-001-20260719-230349.md` Part A/B/C・§6・§8）、DEC-003、`traceability-matrix.md`「CR-001 改訂トレース」、SSOT である `docs/api/gr-scheduler.schema.json`（フィールド名の正）
- スコープ制約（CR §8 / DEC-003）: 本フェーズは仕様先行。`docs/api/gr-scheduler.schema.json` / `src/**` / `tests/**` の未変更・pending トレースは指摘対象外。§5 実装橋渡しはプローズであることが正。

---

## 1. 総合判定

**VERDICT: FAIL**

- Critical: **0**
- High: **5**
- Medium: **3**
- Low: **2**

合格基準（Critical=0 かつ High=0）を **満たさない**。High 5 件（データ形式契約の名称不整合・MSPDI ラグ符号化の自己矛盾・イナズマ線 front 規則の非網羅・相互参照誤り）を解消するまでフェーズ遷移をブロックする。

### 機械検証の結果

| 検証 | 結果 |
|---|---|
| `strictdoc export docs/spec` | exit 0（構造健全: SECTION/REQUIREMENT/DATAFIELD 対応・RELATIONS 全解決・VALUE→ROLE 順序準拠・CJK 隣接 bold の docutils 破損なし） |
| MSPDI Type コード（FF=0/FS=1/SF=2/SS=3） | 全箇所一致（DEP-L1-005 / DATA-MSPDI-004。FS/SS/FF/SF→1/3/0/2 正） |
| SSOT 名称照合（schema.json） | **不一致**（下記 High-1/High-2。schema は itemKind/startDate/endDate/planActualDisplay を required・正、例示は start/end/kind/showPlan を使用） |
| MSPDI LinkLag 数値自己整合 | **不整合**（下記 High-3。4800/日=8h稼働日換算 ↔ 「暦日近似」主張が矛盾） |

> 補足: 本改訂は StrictDoc の構造検証（exit 0）を通過している。以下の指摘はすべて **意味論・データ契約の正当性** に属し、リンクグラフやビルドは壊さない。

---

## 2. 指摘一覧（重大度順）

### High-1 [R1a 矛盾 / データ契約] 例示 JSON の予定スパン名が SSOT・自ファイル DATA-JSON-006 と不一致

- 箇所: `40-data-format.sdoc:161-163`（it-1）, `:172-182`（it-2 と previousPlan）, `:300`（DATA-JSON-005 EXAMPLE）, 併記表 `:102`
- 問題: 例示 JSON と DATA-JSON-005 の例が予定スパンを `"start"`/`"end"`、変更前予定を `previousPlan:{"start","end"}` と表記する。しかし SSOT `docs/api/gr-scheduler.schema.json` は `required:[... "startDate","endDate" ...]`（:150,155-156）・`previousPlan.required:["startDate","endDate"]`（:141-144）と定め、**同じ 40-data-format 内の DATA-JSON-006 EXAMPLE（:324）も CR Part A も `startDate`/`endDate`** を使う。1 ファイル内で同一フィールドが 2 名称で書かれ、片方は SSOT と衝突する。
- **KNOWN SUSPECT の裁定**: これは「例示の省略慣習」ではなく **真正の不整合**。理由:(a) 慣習を宣言する注記が本文に一切ない、(b) 同一ファイルの DATA-JSON-006 例・併記表の previousPlan（:110）は `startDate`/`endDate` を使い矛盾する、(c) SSOT schema.json が `startDate`/`endDate` を required 名として確定している。CR は it-2 に実績日フィールド（actualStart 等）を追記しながら同じ例内の start/end/previousPlan を放置しており、改訂が整合を取り損ねている。
- 影響: 例をそのまま写した実装/フィクスチャは schema 検証（required startDate/endDate）に落ち、往復整合が壊れる。データ契約の要である名称が二重化している。
- 修正案: 例示 JSON（it-1/it-2）と previousPlan、DATA-JSON-005 EXAMPLE の `start`→`startDate`・`end`→`endDate` へ統一。併記表 :102 の「start, end (startDate, endDate)」は正準名 `startDate`/`endDate` に一本化し、括弧の二重表記を削除。

### High-2 [R1a 矛盾 / データ契約] 例示 JSON の viewState が改訂後 DATA-JSON-011 と矛盾（showPlan/showActual）

- 箇所: `40-data-format.sdoc:146-151`（例示 viewState、特に :149 `"showPlan": true, "showActual": true`）
- 問題: 例示 viewState は `showPlan`/`showActual` を持ち、**本 CR で規定した `planActualDisplay` と `planActualStyle` を一切示していない**。改訂後の viewState 表（:57-61）と DATA-JSON-011（:431-443）は planActualDisplay('plan-only'|'actual-only'|'both'|'none') と planActualStyle('overlap'|'separate', 既定 overlap) を定義しており、`showPlan`/`showActual` はどの表・DATAFIELD・schema にも存在しない（schema は planActualDisplay を持つ・:58、showPlan/showActual は無い）。
- 影響: 本 CR の受入基準「Overlap(既定)/Separate が viewState.planActualStyle で切替」を、フラッグシップ例が実証できていない。実装者が旧・非存在フィールドを踏襲するおそれ。
- 修正案: 例示 viewState の `showPlan`/`showActual` を削除し、`"planActualDisplay": "both", "planActualStyle": "overlap"` を追加（DATA-JSON-011 EXAMPLE :443 と同形）。

### High-3 [R1a 矛盾 / MSPDI 忠実度] LinkLag 符号化が「暦日近似」契約と自己矛盾

- 箇所: `40-data-format.sdoc:713-721`（DATA-MSPDI-004 の本文・EXAMPLE）。関連: `16-dependencies.sdoc:300-302`（DEP-L1-006）、CR §Part C。
- 問題: DATA-MSPDI-004 は「8 時間稼働日 1 日 = 4800、lagDays 10 は LinkLag 48000（LagFormat=7 は日単位）」と **8h 稼働日換算** で符号化する一方、同じ本文が「lagDays を暦日として近似」「LagFormat は暦日近似を示す値を用い」と述べる。両者は両立しない:
  - LinkLag は 1/10 分単位。稼働日（LagFormat=7, d）は既定 8h=4800/日 → 10 日=48000。
  - 暦日（elapsed day, LagFormat=8, ed）は 24h=14400/日 → 10 日=**144000**。
  例（LinkLag=48000, LagFormat=7）は **10 稼働日** を符号化しており、宣言している暦日近似（24h）ではない。DEP-L1-006・CR は一貫して「暦日近似」を要求する。
- 影響: 相互運用先（MS Project）が LagFormat=7 を自カレンダーの稼働日として解釈し、暦日意図とズレる。契約が二枚舌で、往復忠実度が保証できない。
- 修正案: 暦日忠実にするなら EXAMPLE を `LinkLag=144000 / LagFormat=8`（elapsed days, 14400/日）に改め、「8 時間稼働日 1 日=4800」の一文を「暦日 1 日=14400（elapsed day 基準）」に置換。DEP-L1-006 の VERIFICATION（`16:311-313`）の LagFormat（暦日近似）記述と用語を一致させる。稼働日方式を採る場合は逆に「暦日近似」の文言を全所（DATA-MSPDI-004・DEP-L1-006・CR）から撤去して稼働日換算と明記する（どちらかに一本化）。

### High-4 [R1a/R1b 非網羅] イナズマ線 front 統一規則が「着手済み・未完了」を欠く

- 箇所: `18-plan-actual.sdoc:125-128`（PLAN-L2-001 の 3 分岐）, VERIFICATION `:137-142`
- 問題: 分岐(1)「実績日あり: front = actualStart + progressRatio × (actualEnd − actualStart)」は **actualStart はあるが actualEnd = null（進行中）** のとき (actualEnd − actualStart) が未定義になり front を算出できない。3 分岐（実績日あり／実績日なし／両無）は MECE でなく、最頻ケース「着手したが未完了」が未定義。**まさにこの状態が例示アイテム it-2（`40-data-format.sdoc:174` actualStart 有・actualEnd=null・progressRatio 0.4・status in-progress）** に該当し、標準例が規則で描画不能。CR の front 規則も同じ欠落を持つが、本 spec は「統一規則」を厳密・一意に定める場である。
- 影響: 進捗線（イナズマ線）の中心ユースケース（進行中タスクの遅れ可視化）が未定義動作。実装が分岐ごとに独自解釈し挙動不一致となる。
- 修正案: 分岐(1) を「actualStart かつ actualEnd の両方あり」に限定し、分岐(1b)「actualStart あり・actualEnd なし: front = actualStart + progressRatio × (endDate − actualStart)（実績開始を起点に予定終了を遠端とする）」を追加。VERIFICATION に当該ケースを追記。CR §Part A の規則テキストも同様に補正（change-manager 経由）。

### High-5 [R1a/トレーサビリティ] データ契約の相互参照が誤り（非存在 UID 含む）

- 箇所: 3 か所
  1. `11-items-icons.sdoc:299`（ITEM-L1-011 RATIONALE）: 「`40-data-format.sdoc` DATA-JSON-016 / DATA-MSPDI-009」→ **DATA-JSON-016 は存在しない**（targetDate は DATA-JSON-015・`40:498`）。ダングリング参照。
  2. `16-dependencies.sdoc:262-263`（§6 intro）: 依存 linkType/lagDays の詳細を「DATA-JSON-015（JSON）および DATA-MSPDI-008（MSPDI 往復）」と案内 → **DATA-JSON-015 は targetDate**（正: 依存は DATA-JSON-008・`40:364`）、**DATA-MSPDI-008 は SplitParts/Notes**（正: 依存は DATA-MSPDI-004・`40:707`）。2 件とも別機能を指す。
  3. `40-data-format.sdoc:373`（DATA-JSON-008 本文）: 「MSPDI PredecessorLink … 往復する（DATA-MSPDI-008）」→ 正は **DATA-MSPDI-004**（DATA-MSPDI-008 は SplitParts）。
- 影響: 本 CR の主目的は「実装セッションが正確に適用できる橋渡し」（CR §8 / DEC-003 帰結）。データ契約の参照が別フィールド（依存→SplitParts, 期限→非存在）を指し、実装者を誤誘導する。StrictDoc は RELATIONS でなくプローズ参照のため exit 0 だが、契約整合性の欠陥。
- 修正案: (1) `DATA-JSON-016`→`DATA-JSON-015`。(2) `16:263` の `DATA-JSON-015`→`DATA-JSON-008`、`DATA-MSPDI-008`→`DATA-MSPDI-004`。(3) `40:373` の `DATA-MSPDI-008`→`DATA-MSPDI-004`。

### Medium-1 [トレーサビリティ] planActualDisplay/planActualStyle の Satisfies 割当ずれ

- 箇所: `40-data-format.sdoc:444-453`（DATA-JSON-011 RELATIONS）, `:325-337`（DATA-JSON-006 RELATIONS）
- 問題: planActualDisplay(PLAN-L1-002) と planActualStyle(PLAN-L1-005) の実データは viewState=DATA-JSON-011 にあるが、DATA-JSON-011 の Satisfies は IO-L1-001/ZOOM-L1-003/CURS-L1-002 のみで **PLAN-L1-002・PLAN-L1-005 を辿らない**。一方 DATA-JSON-006（item 実績フィールド）が PLAN-L1-005（描画スタイル=viewState 概念）を Satisfies している。結果、PLAN-L1-002 はデータ契約からの Satisfies が皆無、PLAN-L1-005 は誤フィールドから辿られる。トレース表（`traceability-matrix.md:121,122,129`）の意図（DATA-JSON-011 が PLAN-L1-002/005 を担う）と不一致。
- 修正案: DATA-JSON-011 に `Satisfies PLAN-L1-002` と `Satisfies PLAN-L1-005` を追加。DATA-JSON-006 は PLAN-L1-001/PLAN-L1-004 を維持し PLAN-L1-005 の Satisfies を除去（or 妥当性を再検討）。

### Medium-2 [データ契約 名称] `kind` と SSOT `itemKind` の恒常的不一致

- 箇所: `40-data-format.sdoc:99,297,300`、例示 JSON `:161,172`（`"kind"`）
- 問題: schema.json は `itemKind`（required・`:150,154`）だが、40-data-format は一貫して `kind` を使う。CR 改訂で導入された不整合ではない（既存）が、データ契約の正当性観点では SSOT と食い違う。High-1 の名称一本化と併せて是正するのが妥当。
- 修正案: 併記表・DATA-JSON-005 本文/例・例示 JSON の `kind`→`itemKind`（本件は既存問題のため、CR 実装セッションでの一括是正を推奨。Medium として据置き可）。

### Medium-3 [データ契約 精度] DATA-JSON-006 の PATH がスカラ 1 点で 4 フィールド群を代表

- 箇所: `40-data-format.sdoc:313-324`
- 問題: PATH が `$.items[].actualStart`（スカラ isoDate）でありながら、STATEMENT/TITLE は actualStart/actualEnd/progressRatio/previousPlan の 4 フィールドを規定し、EXAMPLE（:324）はそれらを含むオブジェクトを示す。PATH（スカラ）と EXAMPLE（オブジェクト）が型として食い違い、PATH→フィールドの一意対応が崩れる。
- 修正案: PATH をフィールド群を表す記法（例 `$.items[].{actualStart,actualEnd,progressRatio,previousPlan}` の注記）にするか、DATAFIELD を分割。少なくとも previousPlan は `$.items[].previousPlan` を別途明示。

### Low-1 [R1a 表現] 11-items-icons 前文の Parent 一括宣言が ITEM-L1-011 と不一致

- 箇所: `11-items-icons.sdoc:10-12` vs ITEM-L1-011 RELATIONS `:307`
- 問題: 前文は「各 L1 要求は Parent 関係で STK-L0-006 および STK-L0-001 をトレース」と断言するが、新規 ITEM-L1-011 は STK-L0-011（予実管理と遅れの可視化）を Parent とする。前文の一括宣言が不正確になった。
- 修正案: 前文に「ただし ITEM-L1-011（期限マーカー）は予実管理の観点から STK-L0-011 をトレースする」と例外を明記。

### Low-2 [トレーサビリティ] DATA-MSPDI-007 の Satisfies PLAN-L1-003 が緩い

- 箇所: `40-data-format.sdoc:787-793`
- 問題: DATA-MSPDI-007 は assignee(Resource/Assignment, B-2) と progressRatio(PercentComplete, B-3) を扱うが、Satisfies が PLAN-L1-003（イナズマ線）のみ。assignee は PLAN-L1-003 と無関係で、対応する担当者要求への Satisfies が無い（担当者専用要求が未定義）。
- 修正案: progressRatio↔PercentComplete の PLAN-L1-003 トレースは可。assignee は該当する担当プロパティ要求（PROP 系）への Satisfies 追加を検討、または担当者要求の要否を orchestrator と確認。

---

## 3. 個別確認（PASS 項目・敵対的に確認済み）

- MSPDI PredecessorLink Type コード: FF=0/FS=1/SF=2/SS=3 が DEP-L1-005（`16:275,283`）・DATA-MSPDI-004（`40:713`）で一致。既定 FS=1 も整合。**PASS**
- 旧予実フィールドの廃止（planActualKind/planGroupId）: PLAN-L1-001（`18:38,50`）・DATA-JSON-006（`40:322`）・DATA-MSPDI-003（`40:692`）・§5 実装差分（`40:958`）で一貫して廃止明記。**PASS**
- targetDate ↔ Deadline / Constraint 見送り: DATA-MSPDI-009（`40:820-826`）・ITEM-L1-011 が整合。Constraint のみ Import 時 targetDate 非生成も明記。**PASS**
- actualStart/actualEnd ↔ ActualStart/ActualFinish、progressRatio(0..1)↔PercentComplete(0..100 整数): DATA-MSPDI-003/007 で往復規定。**PASS**
- lagDays 符号（正=ラグ/負=リード）: DEP-L1-006・DATA-JSON-008・DATA-MSPDI-004・CR で符号意味一致（数値換算の LagFormat/LinkLag のみ High-3）。**PASS（符号意味）**
- §5 実装橋渡しがプローズであること（schema/コード未変更）: CR §8 / DEC-003 の意図どおり。スコープ制約に従い指摘対象外。**PASS**
- StrictDoc 構造健全性（exit 0・RELATIONS 全解決・VALUE→ROLE・bold 破損なし）: **PASS**

---

## 4. 指摘対応テーブル（document-rules §9.3 / review-standards「レビュー指摘対応ルール」）

| ID | 重大度 | 観点 | 箇所 | 対応 | 記録 |
|----|--------|------|------|------|------|
| High-1 | High | R1a/契約 | 40:161-182,300,102 | 未対応（修正必須） | start/end→startDate/endDate 統一 |
| High-2 | High | R1a/契約 | 40:146-151 | 未対応（修正必須） | showPlan/showActual→planActualDisplay+planActualStyle |
| High-3 | High | R1a/MSPDI | 40:713-721 | 未対応（修正必須） | 暦日=14400/LagFormat=8 へ、or 暦日文言撤去で一本化 |
| High-4 | High | R1a/R1b | 18:125-128 | 未対応（修正必須） | actualStart 有・actualEnd 無の分岐追加 |
| High-5 | High | 参照整合 | 11:299 / 16:263 / 40:373 | 未対応（修正必須） | 016→015, 015→008, MSPDI-008→004 |
| Medium-1 | Medium | トレース | 40:444-453,325-337 | 未対応 | DATA-JSON-011 に PLAN-L1-002/005 の Satisfies |
| Medium-2 | Medium | 契約名称 | 40:99,300,161,172 | 据置き可（既存問題） | kind→itemKind を実装セッションで一括是正 |
| Medium-3 | Medium | 契約精度 | 40:313-324 | 未対応 | PATH/EXAMPLE 型整合（フィールド群明示 or 分割） |
| Low-1 | Low | R1a 表現 | 11:10-12 | 未対応 | 前文に ITEM-L1-011→STK-L0-011 例外を明記 |
| Low-2 | Low | トレース | 40:787-793 | 未対応 | assignee のトレース先を確認 |

---

## 5. ルーティング（FAIL 時）

- 主たる指摘は仕様 Ch3-4・データ形式契約（設計レベル）に属する。**戻り先: design フェーズ相当**（`18-plan-actual.sdoc` / `16-dependencies.sdoc` / `11-items-icons.sdoc` / `40-data-format.sdoc` の修正）。
- High-4 の front 規則および High-3 の暦日/稼働日方針は CR-001 本文（承認済み）の規則にも波及するため、規則テキストの補正は **change-manager 経由**で CR 追補として反映する。
- 最小修正セット: High-1〜High-5 の 5 件を解消すれば Critical=0 / High=0 となり PASS。Medium/Low は指摘対応テーブルで対応記録を付せばフェーズ遷移はブロックしない（Medium-2 は既存問題として据置き可）。

---

## Round 2 (再レビュー)

- 実施日: 2026-07-20 / 実施: review-agent
- 対象: round-1 FAIL 後の修正版（`18-plan-actual.sdoc` / `16-dependencies.sdoc` / `11-items-icons.sdoc` / `40-data-format.sdoc`）＋ CR-001 v1.2（`change-request-001-20260719-230349.md` §2 Part A front 規則が 4-case MECE 化）
- 手順: (a) round-1 全 10 指摘を対応記録と照合して解消検証、(b) 修正が新たに壊した/持ち込んだ不整合を敵対的に探索、(c) 新判定。
- 機械検証: `strictdoc export docs/spec` = **exit 0**（SECTION/REQUIREMENT/DATAFIELD 対応・RELATIONS 全解決・VALUE→ROLE 準拠・bold 破損なし。ダングリング UID なし）。
- SSOT 照合: schema.json は本フェーズ未変更（planActualKind/planGroupId 残置・actualStart 等未追加）が、これは CR §8 / DEC-003 のスコープ制約により指摘対象外。フィールド名の正（itemKind/startDate/endDate/planActualDisplay/previousPlan{startDate,endDate}/importedAssetId(フラット)）としてのみ参照した。

### 6.1 総合判定（Round 2）

**VERDICT: PASS**

- Critical: **0**
- High: **0**
- Medium: **1**（新規 N-1）
- Low: **1**（新規 N-2）

合格基準（Critical=0 かつ High=0）を **満たす**。round-1 の High 5 件は全て CLOSED。新規 High/Critical なし。新規 Medium/Low は非ブロッキング（Medium は件数を orchestrator へ報告し対応方針の承認を得ること）。

### 6.2 round-1 指摘の解消検証

| ID | 重大度 | 判定 | 検証根拠 |
|----|--------|------|----------|
| High-1 | High | **CLOSED** | フラッグシップ例 it-1(`40:160-161`)/it-2(`40:171-173`) と previousPlan(`40:181`) が `itemKind`/`startDate`/`endDate`/`previousPlan{startDate,endDate}`、DATA-JSON-005 EXAMPLE(`40:299`)・DATA-JSON-006 EXAMPLE(`40:323`)・併記表(`40:101-102`,`110`) も同名で SSOT(schema `:150,155-156`,`:141-144`) と一致。start/end の JSON 例は消滅。（※非正規のプローズ残置は N-2 参照） |
| High-2 | High | **CLOSED** | フラッグシップ viewState(`40:148`) と DATA-JSON-011 EXAMPLE(`40:438`) が `planActualDisplay`/`planActualStyle` を使用。`showPlan`/`showActual` は全ファイルから消滅。 |
| High-3 | High | **CLOSED** | DATA-MSPDI-004(`40:714-717`) が「暦日 1 日=24h×60×10=14400、lagDays 10=LinkLag 144000、LagFormat=8(elapsed days)」。EXAMPLE(`40:723`) `<LinkLag>144000</LinkLag><LagFormat>8</LagFormat>`。数値検算 10×14400=144000 正。DATA-JSON-008 lagDays 10(`40:370`)・フラッグシップ dep-1 lagDays 10(`40:185`)・DEP-L1-006(`16:300-302`)/VERIFICATION(`16:311`) の「暦日近似」と用語・数値が一致。稼働日換算の二枚舌は解消。 |
| High-4 | High | **CLOSED** | PLAN-L2-001(`18:124-134`) が 4 ケースを明示し「MECE(相互排他かつ網羅的)」と宣言。(1)完了=actualStart+ratio×(actualEnd−actualStart)、(2)進行中(actualStart 有・actualEnd 無)=actualStart+ratio×(endDate−actualStart)[Formula A]、(3)実績日なし=startDate+ratio×(endDate−startDate)、(4)未着手=頂点なし。エッジ endDate≤actualStart→actualStart クランプを明記。VERIFICATION(`18:143-151`) が 4 分岐＋クランプ＋遅れ/先行/定時を網羅。CR §2 v1.2(`55-61`) の Formula A 文言と一致。MECE 検証: actualStart 有無で二分→各々を actualEnd 有無 / progressRatio 有無(「なし/0」で 0 を(4)へ明示帰属)で二分し、重複・欠落なし。 |
| High-5 | High | **CLOSED** | (1) 11-items-icons(`11:299`)=「DATA-JSON-015 / DATA-MSPDI-009」に修正、両 UID 実在(`40:499`,`40:818`)。(2) 16-dependencies(`16:262-263`)=「DATA-JSON-008 / DATA-MSPDI-004」に修正、実在(`40:359`,`40:708`)。(3) 40-data-format DATA-JSON-008(`40:367-368`)=「DATA-MSPDI-004」に修正。全プローズ参照が正しいフィールドを指し、非存在 UID なし。 |
| Medium-1 | Medium | **CLOSED** | DATA-JSON-011 RELATIONS(`40:449-453`) に `Satisfies PLAN-L1-002` と `Satisfies PLAN-L1-005` を追加。DATA-JSON-006 RELATIONS(`40:324-333`) は PLAN-L1-001/PLAN-L1-004 のみで PLAN-L1-005 を除去済み。traceability-matrix(`:121,122,129`) の意図（DATA-JSON-011 が PLAN-L1-002/005 を担う）と整合。 |
| Medium-2 | Medium | **DEFERRED（据置き・受容）** | `kind` は依然 併記表(`40:99`)・DATA-JSON-005 STATEMENT(`40:296`)・MSPDI 表(`40:558,570`)に残るが、round-1 で「既存問題・実装セッションで一括是正・Medium 据置き可」と裁定済み。JSON 例(`40:160,171,299`)は `itemKind` 化済み。契約の正規部（例・schema 差分 §5）は itemKind。**非ブロッキング据置きを維持**（実装セッションで是正）。 |
| Medium-3 | Medium | **CLOSED** | DATA-JSON-006 PATH(`40:314`) が `$.items[]`（オブジェクト）に修正され、EXAMPLE(`40:323`) のオブジェクトと型整合。スカラ⇔オブジェクトの食い違いは解消。 |
| Low-1 | Low | **NOT-CLOSED（Low・非ブロッキング）** | 11-items-icons 前文(`11:10-12`) は依然「各 L1 要求は STK-L0-006 および STK-L0-001 をトレース」と一括宣言し、ITEM-L1-011(`11:308` Parent=STK-L0-011)の例外を明記していない。round-2 課題の必須修正対象外（Low）。次回是正推奨。 |
| Low-2 | Low | **NOT-CLOSED（Low・非ブロッキング）** | DATA-MSPDI-007 RELATIONS(`40:789-795`) は依然 `Satisfies PLAN-L1-003` のみで、assignee(B-2)の担当者要求トレースは未追加。round-2 課題の必須修正対象外（Low）。orchestrator への担当者要求要否確認は未実施のまま。 |

**追加検証（flat-alignment follow-on）**: DATA-JSON-007 は PATH `$.items[]`(`40:338`)・STATEMENT がフラットフィールド列挙(`40:340-344`: milestoneShape/taskShape/iconShapeKind, importedAssetId, fillColor/fillColorExplicit/strokeColor/lineWeight, labelPosition/labelOffset。icon{}/style/emoji なし)・EXAMPLE(`40:346`) がフラット(strokeColor/fillColor/lineWeight, strokeWidth なし)。**DATA-JSON-007 自体は CLOSED**。ただし同フラット化に伴う波及漏れを N-1 で検出。

### 6.3 新規指摘（敵対的探索）

#### N-1 [Medium / データ契約 内部整合] flat 化した importedAssetId を参照する記述が旧ネストパス `icon.importedAssetId` のまま残置（修正の波及漏れ）

- 箇所: `40-data-format.sdoc:84`（assets 併記表）, `:484`（DATA-JSON-013 STATEMENT）, `:626`, `:643`, `:767`（MSPDI サイドカー節）
- 問題: flat-alignment 修正で DATA-JSON-007 は item のアイコン系フィールドを**フラット**化し（`importedAssetId` 直下、`40:341-343`）、併記表(`40:119`)・SSOT schema(`:182` `importedAssetId`) も **item 直下フラット**である。しかし item がアイコン画像実体を参照する経路を、上記 5 箇所は依然 **`item.icon.importedAssetId` / `icon.importedAssetId`**（存在しないネスト `icon` オブジェクト経由）と記述する。とりわけ DATA-JSON-013 STATEMENT(`40:484`) は「`item.icon.importedAssetId`（DATA-JSON-007）がこの id を参照する」と **DATA-JSON-007 を明示引用しながら、当の DATA-JSON-007 が定義しないネストパスを名指す**（自己矛盾のクロスリファレンス）。
- 原因: round-1 の flat-alignment が DATA-JSON-007 本体のみをフラット化し、それを参照する兄弟記述（DATA-JSON-013・併記表・サイドカー節）を追随させなかった。**修正が持ち込んだ内部不整合**。
- 影響: 実装者が schema でなくプローズから資産参照を実装すると、存在しないネスト `icon` オブジェクトを探す。往復のリーフ名（importedAssetId）自体は一致するため破断はしないが、データ契約の経路記述が SSOT・DATA-JSON-007 の双方と食い違う。非ブロッキング（High には至らない）。
- 修正案: 5 箇所の `item.icon.importedAssetId` / `icon.importedAssetId` を `item.importedAssetId` / `importedAssetId` へ統一（`40:84,484,626,643,767`）。DATA-MSPDI-006 EXAMPLE(`40:770`) のサイドカー `"icons": {}` はサイドカー内部構造名であり item スキーマパスではないため対象外。

#### N-2 [Low / R1a 表現] 非正規のプローズ/要約表に旧フィールド名（start/end・kind）が残り、修正済みの正規例とズレる

- 箇所: `40-data-format.sdoc:296`（DATA-JSON-005 STATEMENT「kind, start, end(null=マイルストーン)」）, `:558`（MSPDI 表 `item (kind=task)`）, `:564`（MSPDI 表 `item.start`）, `:567`（MSPDI 表 `item.end`）
- 問題: High-1/Medium-2 の是正は JSON 例・item 併記表(`40:101-102`)・DATA-MSPDI-003 本文(`40:688` `item.startDate`/`item.endDate`)まで及んだが、**人間可読の要約プローズ/対応表**が旧名 `start`/`end`/`kind` のまま残る。DATA-JSON-005 は STATEMENT が「kind, start, end」・EXAMPLE が「itemKind, startDate, endDate」と同一 DATAFIELD 内で二枚。MSPDI 対応表は `item.start`/`item.end` を掲げるが、直下の DATA-MSPDI-003 は `item.startDate`/`item.endDate`。
- 影響: データ契約の正規部（例・schema 差分 §5・DATAFIELD 本文）は正しく startDate/endDate/itemKind であり、機械検証・往復には影響しない。保守時の混乱要因（表現一貫性）に留まる。`kind` 部分は Medium-2（据置き）と重複。
- 修正案: `40:296` の「kind, start, end」→「itemKind, startDate, endDate」、MSPDI 表 `item.start`/`item.end`(`40:564,567`)→`item.startDate`/`item.endDate`、`item (kind=task)`(`40:558`)→`item (itemKind=task)`。Medium-2 の実装セッション一括是正に含めて処理可。

### 6.4 敵対的探索で問題なしと確認した項目（Round 2）

- RELATIONS の破断・ダングリング UID: なし（strictdoc exit 0）。プローズ引用 UID も全実在（DATA-JSON-008/015, DATA-MSPDI-004/009 等）。
- Satisfies の層違い: DATA-JSON-011→PLAN-L1-002/005（ともに L1）・DATA-JSON-006→PLAN-L1-001/004（L1）と、DATAFIELD→L1 要求の一貫したパターン。誤層なし。
- VERIFICATION と STATEMENT の矛盾: PLAN-L2-001 は STATEMENT 4 ケース・VERIFICATION 4 ケース＋クランプで整合。
- 4-case 規則の MECE 破れ（gap/overlap）: なし（6.2 High-4 参照。progressRatio=0 を(4)へ明示帰属し重複回避）。
- lag 例の数値誤り: なし（10 elapsed days=144000, LagFormat=8。Type FS=1）。
- MSPDI Type コード: FF=0/FS=1/SF=2/SS=3 が DEP-L1-005・DATA-MSPDI-004 で一致（FS/SS/FF/SF→1/3/0/2）。

### 6.5 ルーティング / 対応方針（Round 2）

- **PASS のためフェーズ遷移をブロックしない。** design フェーズ相当の当該仕様は品質ゲートを通過。
- 新規 Medium N-1 は CLAUDE.md 品質目標に従い **件数（1 件）を orchestrator へ報告し対応方針の承認を得る**。据置きの Medium-2 と Low（Low-1/Low-2/N-2）は、CR-001 実装セッションでの一括是正を推奨（`item.icon.importedAssetId`→`importedAssetId`、旧名プローズ、前文例外、assignee トレース）。
- High-4/High-3 に関する CR 本文の規則は v1.2 で既に整合（change-manager 反映済み）。追加の CR 追補は不要。

---

## Round 3 (確認)

- 実施日: 2026-07-20 / 実施: review-agent
- 対象: Round 2 PASS 後の consolidation pass 適用版（`40-data-format.sdoc` / `11-items-icons.sdoc` ＋ Low-2 の Satisfies ターゲット検証のため `12-properties-i18n.sdoc`）。`18-plan-actual.sdoc` / `16-dependencies.sdoc` は回帰再スキャンのみ。
- 手順: (a) Round 2 の N-1 / N-2 / Low-1 / Low-2（＋据置き Medium-2）を対応記録と照合して解消検証、(b) 当該修正が新たに壊した/持ち込んだ不整合（ミスマッチ・RELATION 破断・誤/非存在 UID への Satisfies・例↔表デシンク・MECE/数値誤り）を敵対的に探索、(c) 新判定。
- 機械検証: `strictdoc export docs/spec` = **exit 0**（SECTION/REQUIREMENT/DATAFIELD 対応・RELATIONS 全解決・VALUE→ROLE 準拠・bold 破損なし。ダングリング UID なし）。
- SSOT 照合: schema.json は本フェーズ未変更（CR §8 / DEC-003 のスコープ制約）。フィールド名の正（itemKind/startDate/endDate/planActualDisplay/previousPlan{startDate,endDate}/importedAssetId(フラット)/assignee）としてのみ参照した。

### 7.1 総合判定（Round 3）

**VERDICT: PASS**

- Critical: **0**
- High: **0**
- Medium: **0**（スコープ内。Round 2 N-1 は CLOSED）
- Low: **0**（スコープ内。Round 2 N-2 / Low-1 / Low-2 は全て CLOSED）

合格基準（Critical=0 かつ High=0）を **満たす**。Round 2 の未了指摘（N-1 / N-2 / Low-1 / Low-2）および据置き Medium-2 は全て CLOSED。consolidation pass が新規に持ち込んだ Critical/High/Medium/Low（スコープ内）は **なし**。スコープ外（CR-001 レビュー対象文書外）の既存残渣を 2 件観察したが、いずれも本 consolidation pass の産物ではなく、DEC-003 の実績日フィールド方式移行段階化と整合する非ブロッキング事項（7.4 参照）。

### 7.2 Round 2 指摘の解消検証

| ID | 重大度 | 判定 | 検証根拠 |
|----|--------|------|----------|
| N-1 | Medium | **CLOSED** | flat 化した `importedAssetId` を参照する 5 箇所（`40:84`assets 併記表 / `40:484`DATA-JSON-013 STATEMENT / `40:626` / `40:643` / `40:767`）が全て `importedAssetId`（フラット）に統一。ネスト `icon.importedAssetId` は 40-data-format から消滅（grep 0 件）。とくに DATA-JSON-013 STATEMENT(`40:484`)「importedAssetId ( DATA-JSON-007 ) がこの id を参照する」は引用先 DATA-JSON-007(`40:341-343` フラット) と自己整合。サイドカー `"icons": {}`(`40:770`)・トップレベル `assets[]`(schema `:33,201`) は正当に残置。SSOT schema `importedAssetId`(`:182` item 直下) と一致。 |
| N-2 | Low | **CLOSED** | DATA-JSON-005 STATEMENT(`40:296`)=「itemKind, startDate, endDate(null=マイルストーン)」に更新。MSPDI 対応表 `item (itemKind=task)`(`40:558`)・`item.startDate`(`40:564`)・`item.endDate`(`40:567`)・`item (itemKind=milestone)`(`40:570`) に更新。item レベルの bare `kind`/`item.start`/`item.end` は消滅（grep 0 件、残る `kind` は comment.kind(`40:188,391,395`) の正当サブ名のみ）。直下 DATA-MSPDI-003(`40:688-689`) の `item.startDate`/`item.endDate` と用語一致。 |
| Medium-2 | Medium | **CLOSED**（N-2 是正に伴い解消） | Round 2 で据置き受容としていた item レベル `kind` は N-2 是正で全て `itemKind` に統一済み（`40:296,558,570`）。SSOT `itemKind`(schema `:154`) と食い違う item レベル記述は残らない。据置き解消。 |
| Low-1 | Low | **CLOSED** | 11-items-icons 前文(`11:10-13`) に「ただし ITEM-L1-011 (期限マーカー) のみは例外で、STK-L0-011 (予実管理と遅れの可視化) を Parent とする。」を追記。ITEM-L1-011 RELATIONS(Parent=STK-L0-011) と一致し、前文の一括宣言の不正確さを解消。 |
| Low-2 | Low | **CLOSED** | DATA-MSPDI-007 RELATIONS(`40:793-798`) に `Satisfies PROP-L1-002` を追加（PLAN-L1-003 と併記）。ターゲット検証: PROP-L1-002(`12-properties-i18n.sdoc:39` LAYER=L1_System)「プロパティ項目セット」が assignee(`12:100-102`) を当該要求ブロック内に列挙し、assignee を実際に所有。層は DATA-MSPDI-007→PROP-L1-002(L1) で DATAFIELD→L1 の一貫パターン。RELATION well-formed（VALUE `:794` → ROLE `:795`、順序準拠）。 |

### 7.3 敵対的 new-ripple 探索（consolidation pass 起因の副作用検査）

- **ミスマッチ（例↔表↔DATAFIELD）**: なし。DATA-JSON-005 は STATEMENT(`40:296` itemKind/startDate/endDate)・EXAMPLE(`40:299` 同名) が一致。MSPDI 対応表 `item.startDate`/`item.endDate`(`40:564,567`) が直下 DATA-MSPDI-003(`40:688-689`) と一致。DATA-JSON-006 previousPlan EXAMPLE(`40:323` startDate/endDate) が schema previousPlan.required(`:141-144`) と一致。
- **RELATION 破断 / ダングリング UID**: なし（strictdoc exit 0）。新規追加の Satisfies（DATA-MSPDI-007→PROP-L1-002）も含め全解決。
- **誤/非存在 UID への Satisfies**: なし。PROP-L1-002 は実在（`12:39`）かつ assignee を所有。層違いなし（L1）。
- **例↔表デシンク**: なし。フラッグシップ JSON(`40:158-193`) は importedAssetId フラット(`40:165`)・itemKind(`40:160,171`)・startDate/endDate(`40:161,172`) を用い、併記表・DATAFIELD・schema と同期。
- **MECE / 数値誤り**: consolidation pass は front 4-case 規則・LinkLag 数値（High-3/High-4 領域）に触れておらず、Round 2 で確認済みの MECE・144000/LagFormat=8・Type FS=1 は不変（16/18 の回帰再スキャンで planActualKind/planGroupId は「廃止」文脈のみ、showPlan/showActual・bare start/end なし、暦日近似のみで稼働日残渣なし）。

### 7.4 スコープ外の観察事項（非ブロッキング・本判定に不算入）

CR-001 レビュー対象文書（18/16/11/40、＋Low-2 検証の 12）**外**にある既存残渣を、網羅性のため記録する。いずれも本 consolidation pass が触れておらず（＝新規 ripple ではない）、DEC-003 の実績日フィールド方式移行段階化・schema/src 未変更方針と整合するため、フェーズ遷移をブロックしない。

- OBS-1: `docs/spec/30-architecture.sdoc:89,475` が item のアイコン参照を旧ネストパス `item.icon.importedAssetId` と記述（40-data-format のフラット化と不整合の可能性）。また `30:127` はアイテム基底を `kind('milestone'|'task'), planActual('plan'|'actual')` と旧語彙で記述。30-architecture は Round 1-3 のいずれでも CR-001 レビュー対象文書に含まれず、実装セッション（実績日フィールド方式の一括反映）で schema/src と併せて整流するのが妥当。
- OBS-2: `docs/spec/12-properties-i18n.sdoc:70` PROP-L1-002 が旧フィールド `plan_actual_kind`（予定/実績の区別）を列挙。実績日フィールド方式で planActualKind は廃止されるため将来の要不整合になるが、schema.json の planActualKind 残置（DEC-003 で実装セッションまで据置き）と同性質の移行残渣。

### 7.5 ルーティング / 対応方針（Round 3）

- **PASS のためフェーズ遷移をブロックしない。** design フェーズ相当の当該仕様（実績日フィールド方式 改訂差分）は品質ゲートを通過。スコープ内の Critical/High/Medium/Low は 0 件。
- OBS-1 / OBS-2 は CR-001 実装セッション（実績日フィールド方式を schema.json / `src/**` へ一括反映するセッション）で 30-architecture・12-properties の旧語彙整流と併せて是正することを推奨。orchestrator への新規報告義務は生じない（スコープ外・非ブロッキング・移行段階化と整合）。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-20 | 1.0 | CR-001 実績日フィールド方式 仕様改訂の敵対的 R1＋データ契約レビュー初版（High 5 / Medium 3 / Low 2、VERDICT FAIL） | review-agent |
| 2026-07-20 | 2.0 | Round 2 再レビュー追記。round-1 High 5 全て CLOSED（Medium-1/3 も CLOSED、Medium-2 据置き受容、Low-1/2 未了）。新規 Medium 1（N-1: icon.importedAssetId ネストパス残置）＋ Low 1（N-2: 旧名プローズ残置）。**VERDICT PASS（Critical=0 / High=0）** | review-agent |
| 2026-07-20 | 3.0 | Round 3 確認レビュー追記。consolidation pass 適用を検証: N-1 / N-2 / Low-1 / Low-2 ＋据置き Medium-2 を全て CLOSED。敵対的 new-ripple 探索で新規 Critical/High/Medium/Low（スコープ内）なし。スコープ外の既存残渣 2 件を観察（OBS-1: 30-architecture ネストパス/旧語彙, OBS-2: 12-properties plan_actual_kind、いずれも非ブロッキング・実装セッションで整流）。**VERDICT PASS（Critical=0 / High=0、スコープ内 Medium/Low とも 0）** | review-agent |
