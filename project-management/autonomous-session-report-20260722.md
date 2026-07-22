# 自律セッション報告書 — ビジュアルレビュー指摘の是正（2026-07-22）

- 開始: 2026-07-22 06:00（ユーザー外出、帰宅22:00頃・その間対応不可）
- 前日分: `autonomous-session-report-20260721.md`（CR-004〜011 + CR-012 + DEF-008）
- モード: 自律実行。判断が要る点は推奨で実装 → 本書に記録 → 帰宅後に確認。
- コミット/タグ/プッシュはユーザーが手動。末尾にコミット提案を置く。
- 性能PoC（RISK-001）は**立会い必須のため実行しない**（memory `perf-test-notify`）。
- 実機検証は screenshot 厳禁（ハング）。`npm run dev`→localhost:5173→DOM/JS 検証。
  なおプレビューpaneは rAF をスロットルするため、rAF 遅延の再描画は観測不能。
  同期再描画（`renderNow`）を挟むか、モデル/localStorage 側で確認すること。

---

## 発端: ユーザーのビジュアルレビュー指摘（8点）

スクリーンショット3枚とともに提示された。分類:

| # | 指摘 | 記録 |
|---|------|------|
| 1 | 実績が予定の略称フォントを上書きして見えない | **DEF-009** |
| 2 | Asモードでバー高が半分になる。正しくは高さ維持で行を伸ばす | **CR-013** Part1 |
| 3 | 追加アイコンが絵文字でテイストが浮く。線画にせよ（PPT図参照） | **CR-014** |
| 4 | イナズマも絵文字。左の "LINE" 文字は不要 | **CR-014** |
| 5 | MSが増えるとタスクが見にくい。左タスク/右マイルストーン。比率を整えよ | **CR-014** |
| 6 | ヘッダー順が違う。GR Scheduler→タイトル→[Fit][P]… | **CR-015** |
| 7 | プロジェクト名を編集できない（ダブルクリック編集） | **CR-016** |
| 8 | JSON/XMLにプロジェクト名を出力（MSPにも名前属性あるはず） | **DEF-010** + CR-016 |

### 調査で判明した重要事実
- **点8は既に実装済み**だった。`json-codec` は `title` を必須で入出力、`mspdi-codec` は `<Title>` を
  出力・読込。見えなかった真因は**ヘッダー表示が `'gr-scheduler'` のハードコード**で
  `ScheduleDocument.title` と非連動だったこと → **DEF-010**。
- **MSPDI にプロジェクト名あり**: 同梱XSD `mspdi_pj12.xsd` の `<Project>` 直下に
  `Name` / `Title` / `Subject` / `Company` / `Author`。現状 `Title` のみ使用 → CR-016 で `Name` も出力。
- **パレットは文字グリフ/絵文字、キャンバスは線画SVG**という二重定義だった。
  タスク: `bar:'▭' arrow:'→' chevron:'»' span:'|—|'`（`»` `|—|` は単なる文字記号）。
  特殊MS7種: `📄📦💾🛢👤🙂🍺`。イナズマ: `'⚡'`。
  → **CR-014 はアイコンを描き起こすのではなく、パレットをキャンバスと同じパスビルダー
  （`taskGlyphPath`/`milestonePath`）で描くミニチュアSVGに一本化する**方針。
  ユーザー承認済み（「もとよりその意図だ」）。

---

## ユーザー確定事項（2026-07-22）

- `[R]` は **`[P]` のタイポ**。ヘッダー順は GR Scheduler → タイトル → **[Fit][P]** → 以降現行順。
- Separate の行高拡張は **実績を持つ行だけ**でよい。
- ラベル遮蔽は **ラベルを最前面へ**（実績バーの半透明化は採らない）。
- 線画化は **パレットの絵文字を全部**。
- PPT図の**黒枠は作図上の便宜**。実装は**他と同じグレーの角丸**に統一する。

## 自律判断（帰宅後の確認対象）

| # | 判断事項 | 推奨動作（採用） | 要確認 |
|---|---------|----------------|--------|
| E-1 | 初回実績入力時に実績バーが幅ゼロで掴めない | データは `actualStart` のみ（`actualEnd=null`＝着手済み未完了、PLAN-L2-001ケース2）。`actualStart` 既定＝予定開始日。**掴めるかどうかは描画側の画面空間最小幅/ヒット領域(~12px)で担保**し、日数をピクセルから逆算しない | ピクセル由来で日付を作るとズーム率で記録内容が変わり再現性を失うため。方針で良いか |

---

## 進捗ログ（随時追記）

### DEF-009 実績バーがラベルを遮蔽 — ✅ 完了
- `item-layer` に専用の `item-label-layer` グループを常設し、バー類は `insertBefore(node, labelLayer)` で
  必ずラベルより背面へ。担当者名ラベルも同グループへ。遅延生成・モード往復に強い構造。
- テスト11件追加（深さ優先の描画順で検証、変異テストで有効性確認済み）。
- **実機検証**: `Concept`/`Series Development` ともラベル index 4 > 実績バー index 2 ＝前面 ✅。
- gate: tsc0 / vitest757 / eslint0 / build 296.17kB。DEF-009 を Fixed へ。

### DEF-010 の記述を訂正（自己修正）— 要報告
初版で「ヘッダーのタイトルは `'gr-scheduler'` のハードコードで `title` と**非連動**」と書いたが、
**これは誤りだった**。change-manager が CR-016 起草中に指摘し、コードで確認:
- `syncScheduleName()` は `store.getDocument().title` を読み、**空欄時のみ**フォールバックする。
  すなわちタイトルは**実データに束縛されている**。
- 構築時の `'gr-scheduler'` は初期値であって恒久的上書きではない。
- 誤診の原因: テンプレートの `title` が `'gr-scheduler template'` で、空欄フォールバック
  `'gr-scheduler'` と酷似していたため「固定文字列」に見えた。
- **実際に残る欠陥**は「`syncScheduleName` が起動時と Import 時の2箇所でしか呼ばれず、
  ストア変更に継続追従しない」こと。→ 票を全面改訂し**重大度 Medium→Low へ引下げ**。
- 実装中の implementer にも前提の訂正を送付済み（Undo/Redo でヘッダーが追従するテストを追加指示）。
- **教訓（プロセス）**: defect 起票時は症状観察だけで断定せず、該当コードの全呼出経路を確認する。

### CR-013〜016 起票完了
- CR-013 `change-request-013-20260722-091015.md`（Separate行高＋掴める初回実績）
- CR-014 `change-request-014-20260722-091148.md`（パレット アイコン刷新。タスク形状は当初「未決」で
  起票されたが、その後ユーザーから画像が提供され**ミニチュアSVG一本化**で確定）
- CR-015 `change-request-015-20260722-091302.md`（ヘッダー順。`[R]` は `[P]` のタイポと明記）
- CR-016 `change-request-016-20260722-091430.md`（タイトル編集＋MSPDI `Name` 出力）

### DEF-010＋CR-015＋CR-016 ヘッダー/タイトル — ✅ 実装完了（実機検証待ち）
- **CR-015 ヘッダー順**: `HEADER_ELEMENT_ROLES` 単一定数へ集約（branding→title→header-fit→
  header-palette-toggle→screenshot→load→save→themes→baseline→undo→redo→open-ai→open-help）。
  `HEADER_LEFT_CONTROL_ROLES` は廃止し `buildChrome` から位置リテラルを排除。`[Fit]`/`[P]` の挙動
  （`[P]`↔パレット`[-]` 双方向同期）は不変で位置のみ移動。`[R]` は存在しない。
- **DEF-010 継続追従**: `bindHeaderTitleText(source, setTitleText)`（DOM非依存・DIP）を新設し
  `store.subscribe` で再描画。dispatch/undo/redo/replaceDocument を網羅（`onContentChange` の上位集合
  なので二重購読不要）。点呼び出し2箇所を撤去。空欄フォールバックは
  `HEADER_TITLE_PLACEHOLDER = '(untitled schedule)'` に一本化（リテラル二重管理を解消）。
- **CR-016 インライン編集**: ダブルクリック（フォーカス時 Enter/F2 も）で `<input>` に切替。
  Enter/blur 確定・Escape 取消。判断は純粋シーム `resolveTitleEditOutcome`（CR-007 の
  `resolveCommentEditOutcome` に倣う）。確定は `setScheduleTitleCommand` で **undo 可能**、
  CR-009 の透かしUTCも正しく再採番。空/未変更/前後空白は確定しない。
- **MSPDI**: Export は `<Name>`→`<Title>` の順で両方に title を出力（XSD の Project シーケンス順）。
  Import は `projectScalarScope`（最初の `<Tasks>` より前）に限定して読むため、**タスクの `<Name>` を
  プロジェクト名と誤読しない**。`<Title>` 優先・空/欠落時 `<Name>` フォールバック。往復ロスレス確認。
- テスト: `cr016-project-title.test.ts`（22件。改名→Undo→Redo で毎回追従、MSPDI 各種）、
  `header-model.test.ts` 拡充。`cr006-palette-header.test.ts` は位置契約を header-model 側へ移管。
- **gate: tsc0 / vitest783 / eslint0**。

### 週次トークン上限による中断と復旧（2026-07-22）
CR-013 と CR-014 の実装エージェントが**編集途中でAPI上限により停止**。上限リセット後に状態を確認:
- **作業ツリーは健全**だった。`npx vitest run` = **801 pass / 77 files 全緑**。
  tsc エラーは **1件のみ**（`main.ts:56` の未使用import＝CR-014 が main.ts に着手した直後の痕跡）。
- CR-013: 実装一式（plan-actual-geometry / plan-actual-display / layout-engine / viewport /
  item-layer / hit-tester / progress-line-builder / property-panel）＋
  `tests/cr013-separate-row-growth.test.ts` 投入済み。「レーン単位の伸長テスト」追加の途中で停止。
- CR-014: `src/adapters/ui/palette-icon.ts`（383行・**白銀比 √2** を採用し比率を導出、
  `paletteTaskShapePathD`/`paletteMilestoneShapePathD`/`createCommandIcon`/`setPaletteButtonIcon`）と
  `tool-palette.ts` は完了。**`main.ts` 側（⚡💬▢© の置換・TASK/MILESTONE順・"LINE"削除）が未着手**。
- 両エージェントを担当ファイル分離のまま**並行再開**（CR-014=main.ts系 / CR-013=domain・render系）。
- 教訓: 長時間の並行実装でも、各エージェントが gate を保ちながら進めていたため中断コストが小さかった。

### CR-013 Separate行高＋初回実績の最小幅 — ✅ 実装完了（実機検証待ち）
- **行高の判定は `layout-engine.layoutRows()`**（UseCase層）に集約。純粋述語
  `stacksActualBarBelowPlan(item, style, display)` が `separate` かつ両側表示かつ実際に実績バーを
  描くアイテム（plain-rect タスクで `actualStart` 有）のときだけ真。`plan-actual-geometry` は
  アイテム/行/フィルタを知らない純粋数値のまま（ドメイン純度維持）。
- **伸長はレーン単位**（行単位でない）: `rowBandUnitHeight(laneCount, stackedActualLaneCount)`。
  6レーン中1つだけ実績を持つ行は1回だけ伸びる。`RowGeometry.stacksActualBars` を公開。
- 幾何（zoomY=1）: **バー高 16.2px は据置き（両バーとも）**、gap は**バー高**の12%=1.944px、
  実績オフセット18.144px、行band 44px → **62.144px**（実績を持つレーンがある行のみ）。
  overlap / plan-only / actual-only / none は従前とバイト一致。
- **最小幅 12px はワールド px＝スクリーン px**（コンテンツgroupは平行移動のみでスケールしない）
  ため真にズーム非依存。`computePlanActualBars` / `actualSideLaneRect` / `HitTester.itemGrabRects`
  の3箇所が同一矩形を共有。実績バーは**body掴みのみ**でリサイズ辺は予定側＝実績を掴んで予定終了日を
  書き換える事故が起きない。
- データ側: `defaultActualStartDate(item) = actualStart ?? startDate`。プロパティパネルで
  `actual_end` を入れると `actualStart` を**予定開始日から**seed。**嘘の `actualEnd` は作らない**（E-1方針どおり）。
- 併せて `SvgRenderer.setViewState` が `planActualStyle`/`planActualDisplay` 変更時にレイアウトを
  dirty 化するよう修正（従来はzoomのみ。無いと `[As]` で古い行bandが残る）。
- 既存2テストを**決定により**更新（separateが半分になる前提／実績幅0の前提は now 誤り）。新規18ケース。
- gate: vitest 801 pass。tsc/eslint の残1件は CR-014 側の `main.ts` 未使用import。
- **積み残し（main.ts 側・CR-014へ引継ぎ済）**: Fit が separate の伸びた行を測るための
  `viewport` 呼び出しに view state を渡す1行。未実施だと `[As]` で Fit が縮み不足になる。

### CR-014 パレット刷新 — ✅ 実装完了（実機検証済み）
- 新設 `src/adapters/ui/palette-icon.ts`。**パレットアイコンをキャンバスの形状定義から生成**:
  arrow/chevron/span は `taskGlyphPath`、bar は `fadeTrapezoidPoints`(fade=0)、マイルストーン12種は
  `item-geometry` を shape キーの `milestoneShapePath` に切り出して共有（既存シグネチャは不変なので
  `item-layer` の変更不要）。**パレットとキャンバスが原理的にズレない**。
- 除去した絵文字/文字グリフ: `▭ → » |—|` / `O Δ □ ◇ ☆` / `📄📦💾🛢👤🙂🍺` / `⚡` / `💬` / `▢` / `©` /
  `⃠ ✛ │ ‖` / `☰| ≡`。キャンバス対応の無い操作（進捗線・コメント・囲み・透かし・カーソル・グリッド）は
  同じ20×20線画グリッドで新規描画。パス文字列を正規表現で固定するテストで絵文字の再混入を防止。
- **白銀比 1:√2** を採用（A系列＝日本の帳票比、半裁しても自己相似）。`paletteSilverRungPx(n)` の単一ラダー:
  n0 ボタン20px / n1 グリフ14.14px / n3 グループ間7.07px / n5 ボタン間3.54px。`paletteProportionCss` が
  定数からCSSを生成するのでシートがドリフトしない。
- TASK左/MILESTONE右（`task-shapes`/`milestone-shapes` を新設して順序を検証可能に）、"LINE"キャプション削除、
  黒枠は実装せずグレー角丸を維持。
- CR-013 から引き継いだ Fit の積み残しは `svg-renderer.fitToContent()` 側だったため、そこで解決。
- **オーケストラによる追加修正**: `shape-groups` 行はグループを2つ内包するのに**ボタン間ギャップ(3.54px)**が
  効いており、他の全グループ間(7.07px)と不揃いだった → `[data-role='shape-groups']` に**グループ間ラダー**を
  当てる規則を追加。実測 4px → **7px** で統一。
- gate: tsc0 / vitest816 / eslint0 / build 302.99kB。

### 実機ライブ検証（バッチ全体）
- ヘッダー順: branding(12) < title(330) < Fit(670) < P(702) < SS(732) ✅
- タイトル: 実データ `gr-scheduler template` を表示。**ダブルクリック→編集→Enterで確定→Undoで復帰**し
  ヘッダーが毎回追従 ✅（DEF-010 の継続購読修正を実証）
- Separate: 予定 y=122 h=24 / 実績 y=149 h=24 ＝**バー高24を維持したまま上下に並置**（従来は半減）✅
- パレット: SVG26個・絵文字なし・TASK左/MILESTONE右・"LINE"なし・グループ間7px ✅
- console エラー 0 ✅

### review-agent（R-CR013-016）: **FAIL（High 2 / Medium 4 / Low 9）** — 是正中
ゲート数値自体は緑（tsc0 / vitest816 / eslint0）だが、以下2件でFAIL。

- **H-1（実害）**: 実績バーの body 掴みが `moveItemCommand` に落ち、**予定日付(startDate/endDate)だけを
  シフト**する。`separate` では掴んだ実績が止まったまま予定バーが動き、`actual-only` では**画面上何も
  動かないのに予定日付が書き換わる**。CR-013実装者の「予定を書き換えられない」という説明は**誤り**だった。
  → 実績側の掴み/リサイズを正しく実装し直し中（右端ドラッグで `actualEnd` 書込＝CR-013のAC も同時に充足）。
- **H-2（オーケストラのプロセス違反）**: CR-013〜016 で **`.sdoc` 仕様改訂を一度も走らせなかった**。
  CR-004〜011 では毎回 architect を並行させていたのに、今回は implementer のみを出した。結果
  `TOOL-L1-008` は今も「Fit→P→ブランディング→タイトル」を要求し、実装・新テストと**正反対**。
  DEF-002（doc-SSOTドリフト）の再発。→ architect で全面改訂中。
- Medium: M-1 実績右端ドラッグ未実装（H-1修正に統合）/ M-2 hit-test がAABB棄却前に全アイテムの
  掴み矩形を構築し `Date.parse` が毎ポインタ移動で走る / M-3 `PLAN-L1-005` に行高拡張規則が未記載（H-2に統合）/
  M-4 DEF-010 が Open のまま（→ **Fixed に更新済**）・CR受入基準が未チェック。
- 焦点確認は良好: レーン単位伸長の整合、12pxフロアのズーム非依存、ラベルz順の堅牢性、
  形状SSOT（テストが**実行結果**と比較しており写しでない）、MSPDI往復ロスレスはいずれも「正しい」と判定。

**教訓（プロセス）**: 仕様先行は「CRごとに architect と implementer を必ず対で出す」こと。
片方だけ出すと実装が仕様を追い越し、SSOTドリフトが再発する。

### H-2＋M-3 仕様改訂 — ✅ 完了（strictdoc exit 0 確認）
- `TOOL-L1-008`: 並び順を **ブランディング→タイトル→Fit→P→SS…** へ改訂（CR-006 Part1/2 を supersede と明記、
  `[R]` はタイポで存在しないことも記録）。`TOOL-L2-006` の `[P]` を第4要素へ。
- `TOOL-L2-009` 新設（CR-014）: パレットアイコンはキャンバスと同一の形状定義から生成＝二重定義不可、
  絵文字全廃・"LINE"削除・TASK左/MILESTONE右・白銀比・グレー角丸維持。検証は「ビルダー出力との一致」。
- `TOOL-L2-010` 新設（CR-016）: ダブルクリック編集/Enter確定(undo可)/Escape取消/継続購読/プレースホルダ単一定義。
- `DATA-MSPDI-001` 改訂（CR-016）: `<Name>`+`<Title>` を XSD 順で出力、Import は Title 優先・Name フォールバック、
  `<Tasks>` 前へスコープ限定。EXAMPLE も実出力に一致させた。
- `PLAN-L1-005` 改訂（CR-013）: **バー高維持・行が伸びる**（半裁規則を supersede）、レーン単位、
  実績を描く場合のみ。`PLAN-L2-002` 新設: `actualStart` のみ/既定=予定開始日/画面空間12px下限/
  **実績を掴んでも予定日付は変えない**。
- `ITEM-L2-005` 新設（DEF-009）: テキストは常に両バーより前面（構造的不変条件として規定）。
- `ARCH-C-011` に行高決定の責務と `PLAN-L1-005` への Implements を追加。

### architect が報告した残存矛盾 → 起票・是正へ
- **DEF-011**（新規, Medium）: `svg-exporter` は行だけ伸びるのに**実績バーを描かない**＝画面と出力が不一致
  （`ARCH-C-022` に反する）。→ 修正実装を並行着手。
- **DEF-012**（新規, Medium）: 編集可能タイトルが `<span tabindex=0>` で **role 無し＝WCAG 4.1.2 違反**
  （本プロジェクトは AA を品質目標として有効化済）。加えて `HEADER_TITLE_PLACEHOLDER` が英語ハードコードで
  **i18n 対象漏れ**。→ 仕様追記のうえ是正予定。
- M-1（実績右端ドラッグで `actualEnd` 書込）は architect が「未実装のものを仕様に書かない」判断で
  あえて `PLAN-L2-002` に含めなかった。**実装が入り次第、仕様にも追記する**（下記フォロー）。
- L-2（overlapで12px下限が予定バー右端を超え「実績が超過した」ように誤読される）→ 実装中エージェントへ
  真値クランプを追送済み。

### H-1＋M-1＋M-2＋L-2 — ✅ 修正完了（実機検証待ち）
- **H-1**: `PlanActualSide` を `edge-hit`/`hit-tester`/`editing-controller` に貫通。`ItemHit` を
  **判別可能ユニオン**（`PlanSideItemHit` / `ActualSideItemHit`）にしたため、ラベルやフェード掴みが
  `side:'actual'` を持ち得ないことが**型で強制**される。`beginItemGesture` は CR-007 の複数移動を含む
  **全ての予定側分岐より前**で実績側へ振り分け → `moveItemCommand`/`resizeItemCommand`/
  `bulkShiftItemsCommand` は実績掴みから**到達不能**。overlap の body 同点は従来どおり予定が勝つ（安定ソート）。
- **M-1**: `moveActualSpanCommand`（実績スパン全体を平行移動・期間保持）と
  `resizeActualSpanCommand`（`end` は未記録時に実績開始を基準に `actualEnd` を初回書込、`start` は
  `actualEnd` 以下にクランプ、マイルストーンは no-op）を新設。CR-013 の AC を充足。
  新規実績は12px＝エッジ2つ分のため body 領域が無く、左右半分が resize-start/end になる（テストで固定）。
- **M-2**: レーン帯スカラー棄却 →（実績矩形を持たない場合は）placement の AABB → 生存者のみ
  `itemGrabRects`。`ownsActualGrabRect` は日付解析なしのフィールド判定。**実測 578.9ms → 28.5ms（20.3倍）**。
  素朴実装との**差分テスト**で意味論不変を保証。
- **L-2**: `actualBarDrawnWidthPx` が12px下限適用後、**実績が実際には予定終了を超えていない場合のみ**
  右端を予定終了へクランプ。真の超過は full length を維持。`actual-only` では比較対象の予定バーが無く
  掴み代確保が優先なのでクランプしない。描画矩形とヒット矩形は同一関数由来で一致。
- テスト: `tests/actual-side-drag.test.ts` 31ケース（**実物の EditingController + HitTester** を
  fake host で press/move/release 駆動。zoom 0.5/1/4、複数選択時のバイパス、undo/redo、
  予定側の非回帰も含む）。**変異テストで非空虚性を確認**（`side:'plan'` に戻すと20ケース失敗）。
- gate: tsc0 / eslint0 / **vitest 852**。

### DEF-011 SVG出力の予実描画 — ✅ 修正完了
- 新設 `src/domain/usecase/plan-actual-paint.ts` の `computeItemPlanActualPaint` に
  「アイテムが描く矩形の列挙」を集約。既存の `computeItemDisplayedBars`/`actualSideLaneRect`/
  `drawsActualBar`/`filterByPlanActualDisplay`/色・線幅ヘルパを**合成するだけ**でモード判定を二重定義しない。
- `svg-exporter` をこれ経由に統一。予定バー・実績バー・単独実績グリフ・マイルストーン実績マーカー＋
  リーダー線を出力し、`<text>` をグループ最後に置いて DEF-009 の重ね順も再現。実績の張り出しを
  `contentRight` に算入し viewBox で切れないようにした。
- テスト16件。うち**6件はドリフト検知**: 実物の `ItemLayer` を fake DOM で描画し、
  **画面の矩形＝出力の矩形**を style×display の全組合せで直接比較する。

### ItemLayer の共有ヘルパ統一（DEF-011 フォロー） — ✅ 完了
- `ItemLayer` の私的導出（`actualSidePlacement` / `computeItemDisplayedBars` ラッパ /
  `actualSpanWorldX` ラッパ / 表示側booleans）を全廃し `computeItemPlanActualPaint` 1呼び出しへ。
  `updateMilestoneActualMarker` も再導出をやめ引数受取に。
- **テストファイルを1つも変更せずに**ガード5本（107ケース、ドリフト検知6件含む）が緑
  ＝挙動不変のリファクタであることを実証。**画面とSVG出力が同一定義を共有**する状態になった。

### DEF-012 タイトルの role / i18n — ✅ 修正完了
- `role="button"` を既存 span に付与。実 `<button>` にしなかった理由は、インライン編集の `<input>` が
  その内側に入るため axe の `nested-interactive` 違反になること（妥当な判断）。**編集中は role を外し
  終了時に復元**。アクセシブル名は `"<プロジェクト名> - <操作ヒント>"` で可視文字列が先頭＝
  WCAG 2.5.3 label-in-name も満たす。純粋関数 `scheduleTitleAccessibleName` として `header-model` に抽出。
- プレースホルダと操作ヒントを `UI_LABELS` に集約（ja: `(無題の日程表)` 等）。`HEADER_TITLE_PLACEHOLDER`
  リテラルは廃止。`wireScheduleTitle` が `locale.onChange` で再描画するため言語切替に追従。
- axe の E2E ケースも追加（role/名前/編集中の role 除去と復元）。
- gate: tsc0 / **vitest 876** / eslint0。

### 既知の結合（仕様に明記済み・変更不要と判断）
- 12px 下限は L-2 クランプ適用時に近似となる（予定バーが極端に短い場合）。仕様に例外として明記。
- `PLAN-L2-002` 規則(6)（新規実績に body 領域が無い）は実装定数 `MIN_ACTUAL_BAR_WIDTH_PX=12` と
  `RESIZE_HANDLE_PX=9` に依存。仕様では「目安」として結合を緩めて記述。

### 進行中
- 仕様の限定追記（arrow/chevron/span・フェード付き・マイルストーンは `both` では実績専用の掴み矩形が
  無いため実績ドラッグ操作が到達不能＝仕様が広く主張しすぎている点の是正）＋
  `50-test-spec.sdoc` に `PLAN-L2-002`/`TOOL-L2-010` の `[TEST]` 追加（V字トレースの穴埋め）

### 残フォロー
- M-1 実装後の `PLAN-L2-002` への仕様追記
- DEF-012（role 追加＋プレースホルダ i18n）の仕様追記→実装
- CR-013〜016 の受入基準チェック記入（M-4）

### 未着手
- CR-014 パレット刷新（`main.ts` 競合回避のためヘッダー/タイトル完了後）

---

### 再レビュー（R-CR013-016 追記）: **PASS**（Critical 0 / High 0）
前回 FAIL の High 2件はいずれも解消。H-1 は「`side:'actual'` を生成する箇所が `hit-tester.ts` の
1 箇所のみ・`as` キャスト 0 件・早期リターンが全予定側分岐より前」と**構造的に閉じた**ことを確認。
H-2 も仕様⇔実装がケース単位で一致。単一定義の主張（パレット⇄キャンバス、キャンバス⇄SVG出力）も
「実出力どうしの比較であってコピー比較ではない」と確認された。

### E2E の見落としと是正（重要・プロセス）
**私はこのセッション中、ゲートを vitest だけで回し Playwright を一度も実行していなかった。**
CLAUDE.md の品質目標には「E2Eテスト 主要ユーザーフロー PASS」が含まれ、以前は 116/116 緑だった。
最終盤に実行したところ **19件が失敗**していた（98 pass / 19 fail）。

test-engineer に「(A)承認済み変更で陳腐化したテスト / (B)本物の回帰」を**必ず分類**させ、
「通すためにアサーションを緩めるな」と明示して是正:
- 大半は (A)（CR-015のヘッダー順、CR-013の半裁ジオメトリ廃止、CR-007の⧉追加、CR-004の
  アイコンimport撤去、CR-006のAdd Box2クリック化など）。各修正に根拠CRをコメントで明記。
- **(B) 本物の回帰を1件検出・修正**: CR-007 の複数移動ジェスチャで、ドラッグせずクリックした場合に
  `commitMultiMove` が `!moved` で早期 return し `setSelection` を呼ばないため、選択が1件に畳まれない。
  **単体テストが通っていない経路**だった（`editing-controller.ts` を修正）。
  → E2E を回した価値がここに出た。
- **DEF-013** 起票: ヘッダー[Fit]とパレット旧[⤢]が**同一アクセシブル名**を共有し一意に識別できない。
  → CR-006 が「両方残す」意図だったため削除せず、`fit_to_content_palette` を追加して**名前を区別**（非破壊）。
  パレット側を廃止して一本化するかは**ユーザー判断待ち**。
- **DEF-014** 起票: 日付ルーラーの `boundingBox()` がストレス時 30〜40% で null（ResizeObserver 整定前の
  0 幅読みの疑い）。**原因未確定のまま Open で記録**（緑になったから解決とはみなさない）。

### 最終ゲート（全部緑）
`strictdoc export` exit 0（21文書） / `tsc` 0 / `eslint` 0 / **`vitest` 876 pass（80ファイル）** /
**`playwright` 117/117** / `npm run build` → dist/index.html 309.50kB。変更65ファイル（うち新規20）。

### 実機検証の状況（正確に）
- **セッション中盤にプレビューpaneで検証済み**: ヘッダー順、タイトル束縛/ダブルクリック編集/Enter確定/
  Undo追従、Separateのバー高維持と上下並置、パレット（SVG26個・絵文字なし・TASK左/MILESTONE右・
  "LINE"削除・グループ間7px）、console エラー0。
- **終盤はプレビューpaneがCDPレベルで応答停止**したため、H-1のドラッグ体感・DEF-011のSVG出力・
  DEF-012のroleは**paneでは未確認**。ただし **Playwright（実Chromium）で 117/117 緑**であり、
  a11y スイート（axe serious/critical 0件＋DEF-012のrole/名前検証）も実ブラウザで通っている。
- 未確認のまま残るのは「実績側ドラッグの操作感」「`[As]` のSVG出力の見た目」など**目視の質感**のみ。

### 残オープン（帰宅後の判断待ち・いずれもコミット非阻害）
| 項目 | 内容 | 推奨 |
|---|---|---|
| M-5 | overlap では実績body掴みが安定ソートで予定に解決するため、仕様の操作(3)が overlap で成立しない（仕様が広い） | 仕様に overlap 除外を追記 |
| M-6 | `actual-only` で選択枠・**フォーカスリング**が描かれていない予定位置に出る（WCAG 2.4.7 懸念） | 実績位置へ追従させる |
| M-7 | `ITEM-L2-005` / `TOOL-L2-009` に Verifies トレース無し（テストは実在） | `[TEST]` 追加 |
| M-8 | `actual-only` のフェード付きタスクで描画幅=予定長・掴み幅=実績長 | 規則(2)に合わせる |
| DEF-013 | パレット Fit を廃止して一本化するか | ユーザー判断 |
| DEF-014 | ルーラー間欠 null の原因究明 | 追調査 |
| E-1 | 初回実績のデータ方針（嘘の `actualEnd` を作らない） | 方針確認 |

---

## コミット提案

**Summary:**
```
Fix visual review findings: labels, rows, palette, header, title
```

**Description:**
```
Address the eight findings from the user's visual review, spec-first, plus the
defects that surfaced while verifying them.

DEF-009: the actual bar painted over the plan item's abbreviation. Item groups
now own a never-removed label layer and every bar mounts beneath it, so item
text always paints above both bars in either style.

CR-013: separate mode no longer halves the task bar -- the bar keeps its height
and the ROW grows, per lane and only where an actual bar is really drawn. A
newly recorded actual sets actualStart only (default: the planned start), never
a synthesized end; the renderer enforces a screen-space ~12px floor so it stays
grabbable at any zoom, clamped to the plan end so a degenerate actual cannot
read as an overrun.

CR-014: palette icons are now generated from the SAME builders the canvas uses,
so palette and canvas cannot drift; every emoji is replaced by line art, the
LINE caption is gone, TASK sits left of MILESTONE, and sizes follow a silver
ratio ladder. DEF-011 extends the same single-definition idea to SVG export
(which previously grew rows but drew no actual bars), and ItemLayer was
refactored onto that shared helper with no test changes.

CR-015 / CR-016 / DEF-010: header order is branding -> title -> Fit -> P -> rest;
the title follows the store continuously, is renamed by double-click (Enter
commits, Escape reverts, undoable), and MSPDI now carries both Name and Title.
DEF-012 gives the title control a role and an accessible name and moves its
placeholder into the i18n table.

Also fixed while verifying: an actual-bar grab used to rewrite the PLANNED
dates (the side is now carried in the hit result as a discriminated union, so
plan-writing commands are unreachable from an actual grab), actual-side drag
now records actualStart/actualEnd, hit-testing rejects candidates before
building rects (20x faster per pointer move), and a multi-select click failed
to collapse the selection.

Records: CR-013..016, DEF-009..DEF-014, R-CR013-016 review (re-review PASS,
Critical/High 0). Spec revised for every change -- an earlier pass shipped code
without it, which the review caught as SSOT drift.

Gate: strictdoc exit 0 / tsc 0 / eslint 0 / vitest 876 / playwright 117 /
build 309.50 kB.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
