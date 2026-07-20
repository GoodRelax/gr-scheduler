# 引継ぎプロンプト: CR-001/002/003 実装フェーズ

- 作成: 2026-07-20（オーケストラセッション）
- 目的: 予算(週次上限)制約により、次セッションが本作業を確実に再開できるよう状態を固定する
- あなた(次オーケストラ)への指示: 本ファイル＋`pipeline-state.md`＋各 CR/DEC/レビュー記録を読み、下記「再開手順」から続行せよ。ユーザー確認は full-auto-dev の重要判断基準に限定。

## 1. これまでに完了したこと（コミット済み）

**仕様フェーズ完了・コミット済み**（ユーザーが手動コミット）:
- **CR-001 実績日フィールド方式**（旧「案H/Model H」＝命名廃止済み item60）の仕様確定。3ラウンド敵対レビューで High5件解消。
- **CR-002** = 予実配色（彩度: 予定=淡/実績=濃、非色冗長は**線幅**〔予定細/実績太〕、破線不使用）／マイルストーン（**2マーカー・塗り無し**、front は点）／ベースライン（`previousPlan`廃止→**別ファイル参照**方式）。
- **CR-003** = ヘッダー再編／ラベル `inner-left`＋はみ出し衝突回避／依存線**自動配線**（右出・左入・2×スタブ・上下折れ・行間ギャップ）。
- 2本の敵対レビュー **PASS（Critical/High=0）**、`strictdoc export docs/spec` = exit 0。
- SSOT整備: 図を `docs/spec/_assets/*.md` へ外部化、次期スキーマ `docs/api/gr-scheduler.schema.next.json` 作成、命名パージ完了。
- 記録: `DEC-003-cr-001-approved.md`（改名済）、`DEC-004-docs-ssot.md`、`DEF-002/003/004`、`change-request-002/003-*.md`、traceability・pipeline-state 更新済。

**確定した設計判断（変更禁止・実装が従うべき契約）**:
- 予実 = 同一アイテムの `actualStart`/`actualEnd`（milestone は `actualEnd=null`）＋`progressRatio`＋`targetDate`。`planActualKind`/`planGroupId`/`previousPlan` は廃止。
- イナズマ線 front（`PLAN-L2-001`、4ケース MECE）: (1)実績両日→`actualStart+r×(actualEnd−actualStart)`、(2)actualStart有/actualEnd無→`actualStart+r×(endDate−actualStart)`〔Formula A、endDate≤actualStart は actualStart にクランプ〕、(3)actualStart無・r>0→`startDate+r×(endDate−startDate)`、(4)actualStart無・r無/0→頂点なし。**マイルストーンは点**（実績あれば actualStart、無ければ startDate、補間なし）。
- 表示スタイル Overlap（既定）/Separate は不変（`PLAN-L1-005`）。
- 依存 `linkType`(FS/SS/FF/SF, 既定FS) `Type` FF=0/FS=1/SF=2/SS=3。符号付き `lagDays`（+ラグ/−リード）↔ MSPDI `LinkLag`/`LagFormat=8`（暦日、10日=144000）。`targetDate`↔`Deadline`。
- ベースライン: **JSON のみ**を Load 時オプションで「ベースライン扱い」→ 薄グレー・**同高さ**・編集不可アンダーレイ、現行と **id 突合**。ヘッダー **Base V/I** トグル（`planActualDisplay` と独立）。MSPDI Baseline は id 突合 best-effort。
- ヘッダー順: `GR Scheduler +(c)` → タイトル → SS → Load → Save → Light → Dark → Mono L → Mono D → Base V → Base I → Undo → Redo → AI → ?。SS=表示域PNG／Load=JSON,XML／Save=JSON,XML,SVG,PNG／AI=プロンプト+スキーマのコピー(実装済)。
- ラベル: `labelPosition` に `inner-left`（タスク既定・バー内左）。はみ出しは許容、同一セクション内で被る場合は縦オフセットで回避（`ALIGN-L2-003`）。マイルストーンラベルはアイコン右（`ITEM-L2-003`）。

## 2. IM0 の結論（重要・スキーマ確定）

**現行 `schema.json` は実コードモデル（flat）と一致し正しい**。`I18nValue{en,ja}` は `usecase/i18n.ts` の **UI ラベル専用**で、永続化データ（item 名/カテゴリ/section 名/annotation text）は **flat string**。よって:
- **`schema.next.json` は i18n 補正不要**。スワップ可。
- **DEF-004** は `40-data-format.sdoc` の**プローズだけが陳腐化**（nested meta/i18n/classification 記述）。→ IM5 で flat 同期（`.sdoc` のみ、コード変更不要・非ブロッカー）。

## 3. 実装ミルストーン（タスク #12-16）

- **IM1（#12）= ✅完了・green（2026-07-20、未コミット）**: スワップ `next.json→schema.json` 済（$id修正・next.json削除・`schemaVersion`=2・1→2 identity migrator）。`schedule-model.ts`（item +actual*/targetDate、−planActualKind/planGroupId/previousPlan、`PreviousPlan`/`PlanActualKind`型削除、Dependency +linkType/lagDays、ViewState +planActualStyle、LabelPosition +inner-left）／`json-codec.ts`／`sample-data.ts` 反映済。**gate 到達: `tsc` 0 / vitest 529 pass・14 skip・0 fail / ESLint 0**。
  - **IM2/IM3 が復元すべき中和箇所（TODO付き）**: `plan-actual-colors.ts`(fillColor返し→IM3彩度)、`a11y-tokens.ts`(dash='none'→IM3線幅)、`progress-line-builder.ts`(フィルタ簡易/ghost空→IM2フィルタ・IM3ベースライン)、`dependency-visibility.ts`(同種制約撤廃→IM2)、`layers/progress-today-layer.ts`(front簡易補間→IM2 4ケース+マイルストーン)、`layers/ghost-layer.ts`(空→IM3アンダーレイ)、`ui/property-panel.ts`(plan_actual_kind削除+inner-left追加→IM2予実日付UI)。`collectPreviousPlanGhosts`/`PreviousPlanGhost` は配線保持(IM3で別ファイル参照に再利用)。
  - **skip 14件**（`it.skip`+TODO、削除禁止・IM2/IM3で復元）: a11y-encoding(1,IM3)/dependency-visibility(4,IM2)/progress-line-builder(4: 2 IM2+2 IM3)/ui-feedback-batch(2,IM3)/visual-data-batch(3: 2 IM3+1 IM2)。
- **IM2（#13）= ✅完了・green（2026-07-20、未コミット）**: `progress-line-builder.ts`(4ケースMECE `computeProgressFrontDate`＋マイルストーン点＋`filterByPlanActualDisplay`)／`progress-today-layer.ts`／`dependency-visibility.ts`(actual-date基準に再定義)／新`plan-actual-geometry.ts`＋`item-layer.ts`(Overlap/Separate幾何、色は現行fillColor=IM3)／`mspdi-codec.ts`(B-1..B-6＋Type FF=0/FS=1/SF=2/SS=3＋LinkLag/LagFormat=8＝暦日10日→144000＋Deadline↔targetDate、サイドカー無損失往復)／`commands.ts`・`property-panel.ts`(actual_start/end・target_date・progress UI)。**gate: tsc 0 / vitest 554 pass・7 skip・0 fail / eslint 0**。IM2旗のskip 7件は復元済。**残skip 7件は全てIM3**（a11y非色1・previous-planゴースト2・fill色相2・green/orange配色2）。判断: 復元テストは旧planActualKindを実績日方式へ忠実に再定義（item が実績持つ⇔actualStart有）。
- **IM3（#14）= ✅完了・green（2026-07-20、未コミット）**: `plan-actual-colors.ts` 彩度導出(`parseColorToHsl`/`hslToCss`/`planColorFrom`淡/`actualColorFrom`濃、緑/橙定数削除)／`a11y-tokens.ts` 線幅冗長(`PLAN/ACTUAL_STROKE_WIDTH_PX`、dash='none'維持)／`item-layer.ts` マイルストーン2マーカー(startDate予定+actualStart実績、塗り無し、細リーダー)／ベースライン: `import-service.importBaselineDocumentFile`(JSON限定)＋`SvgRenderer` runtime state(baselineDocument/baselineVisible、非永続)＋`collectBaselineGhosts`(id突合)＋`ghost-layer` グレー同高さアンダーレイ＋`main.ts` 仮トグル。**gate: tsc 0 / vitest 575 pass・0 skip・0 fail / eslint 0**（全skip復元）。**IM4 TODO**: `main.ts` 仮 Load-as-baseline/Base V ボタン→ヘッダー Base V/I へ集約(~L685,~L733)。
- **IM4（#15）= ✅完了・green（2026-07-20、未コミット）**: ヘッダー再編(`header-model.ts`新 SSOT順・`header-menu.ts` Load/Saveドロップダウン・`viewport-capture.ts` SS=ビューポートPNG・`main.ts` 再構築、IM3仮ベースライン制御を Load/Base V/I へ集約)／ラベル(`item-geometry.ts` inner-left・マイルストーン右・`layout-engine.ts` はみ出し衝突=後発アイテムを1レーン下げ)／依存線(`dependency-connector.ts` 右出左入・2×スタブ・上下折れ・行間ギャップ)。**gate: tsc 0 / vitest 588 pass・0 skip・0 fail / eslint 0(変更ファイル)**。traceability: TOOL-L1-008/ITEM-L2-002/003/ALIGN-L2-003/DEP-*/PLAN-L1-004 を done(IM4)。
  - **要報告の推奨仕様判断**: DEP-L2-002(折れ0..3) と「重なる後方(左)ターゲットへの行間ギャップ迂回」はパリティ上4折れ不可避。前進依存は≤2で規格内。4折れ非交差ルートを正として実装し、将来CRで DEP-L2-002 緩和 or 重なり時の上下端入線を検討(=IM5でフォロー記録)。
  - **IM5宿題**: 陳腐化E2E 3本(header-shell-batch/shell-theme-batch/lines-cursor-dependency-batch)を新ヘッダーrole・新依存幾何へ改修＋dist で Playwright+axe。DEF-004 の 40-data-format flat同期(schema.json は inner-left 既含・要確認のみ)。traceability の IM2/IM3 行 pending→done。単一HTMLビルド検証。性能PoCはユーザー立会い(保留)。
- **IM5（#16）= ✅完了・green（2026-07-20/21、未コミット）**: DEF-004 flat同期(40-data-format、strictdoc exit0)／陳腐化E2E 15本改修（3本IM5a+12本IM5e）→ Playwright **116/116**(serial)／単一HTMLビルド `dist/index.html` **271.51kB 自己完結**／axe WCAG2.1 AA 4テーマ PASS／MSPDI Baseline best-effort往復実装(IM5d)／traceability pending→done／DEF-005(依存線折れパリティ・要方針)・DEF-006(Fit縦クリップ→**修正済**)起票。**最終gate: tsc 0 / vitest 592 pass・0 skip・0 fail / eslint 0 / strictdoc exit 0**。
  - **未了（ユーザー立会い）**: 性能PoC=RISK-001でユーザー立会い必須のため未実行（memory `perf-test-notify`）。

- **IM6（#17）= ✅完了・green**: 予実配色の彩度調整（`#4477aa`→淡い青 `#81a4c7`、灰色化解消／実績 `#24629f` 濃）＋小規模ドキュメント（≤200件）は起動Fitに関わらず全アイテム描画（`lod-selector` `shouldRenderAllItems`＋`item-layer` 仮想化スキップ）。vitest 598。
- **IM7（#18）= ✅完了・green**: `old/gr-scheduler-template.json`（旧モデル）を新モデルへ keep-as-is 移植し**デフォルト起動サンプルに差し替え**。plan/actual は別行のまま（青予定/赤実績）、planActualKind等除去、strokeColor→TRANSPARENT_COLOR_KEY、32アイテム/13行/依存4/注記1、schemaVersion 2。vitest 598・ビルド273kB。
- **IM8（#19）= ✅完了・green＝DEF-005 解決**: 依存線ルータを再設計。前進別行=右出左入（現状維持）／同一行連続=下端へ可視U字／重なり・後方=上端/下端入線・逆走なし・折れ≤3。`dependency-connector.ts`＋テスト13。**実機DOM検証済**（テンプレ4依存: コブ/逆走消滅、spanY>0、goesBackward=false）。vitest 604。16-dependencies.sdoc も文言更新。
  - **実機ライブ検証（本セッションで実施）**: dev DOM で全32件描画・青/赤分離・依存線クリーンを確認（screenshotは当環境でハングするためDOM/JSで検証）。
  - **未了（ユーザー立会いのみ）**: 性能PoC（RISK-001, memory `perf-test-notify`）。それ以外の残件なし。

## 4. 再開手順（次セッション冒頭で実行）

1. `git status` と `git log --oneline -5` で現状把握。IM1 が未完/未コミットなら作業ツリーを確認。
2. IM1 未完なら §3 IM1 を実装 → **gate 到達**を確認（`cd <repo> && npx tsc --noEmit && npm test`）。
3. IM1 green 後、IM2→IM3→IM4→IM5 を順に。各ミルストーンは「実装→単体→review-agent(R2-R5)→節目でユーザーにコミット推奨」。
4. 仕様検証: `C:\Python313\Scripts\strictdoc.exe export docs/spec --output-dir <tmp>` = exit 0。
5. 各節目で `pipeline-state.md` と本ファイルを更新（こまめに進捗を残す）。

## 5. 環境・落とし穴

- OS Windows / PowerShell 主・Bash ツール併用。strictdoc: `C:\Python313\Scripts\strictdoc.exe`。
- **architect サブエージェントは Bash 不可** → strictdoc 検証はオーケストラが中央実行。
- **implementer は Bash 可**（tsc/vitest 実行可）。
- `document-schema-conformance.test.ts` はコード出力を `docs/api/gr-scheduler.schema.json` と突合（スワップ後に緑を保つこと）。
- スキーマ import は `src/domain/usecase/document-schema.ts:11`（ハードコード、glob 無し）。
- コミット/プッシュ/タグは**ユーザーが手動**（Claude は実行しない）。節目でコミット推奨（英語 Summary/Description）。
- 命名 item60: 無意味符牒禁止（案H/Model H 全廃済み。再導入するな）。コード/コメント/ログは英語ASCII。
- OneDrive 同期ディレクトリのため strictdoc export が稀に一過性の file-read error → 出力先を変えて再実行。

## 6. 主要ファイル地図

- モデル: `src/domain/model/schedule-model.ts`（+ `annotation.ts`）
- codec: `src/domain/usecase/{json-codec,mspdi-codec}.ts` / `import-sanitizer.ts` / `document-schema.ts`
- 描画: `src/adapters/render/svg-renderer.ts` + `layers/*`、`src/domain/usecase/{progress-line-builder,plan-actual-colors,cursor-span}.ts`
- 依存線: `src/domain/usecase/`（ルータ純関数）＋レンダラ
- app: `src/app/{main,sample-data,logger,benchmark}.ts`
- スキーマ: `docs/api/gr-scheduler.schema.json`（IM1 後は実績日フィールド方式）
- 仕様: `docs/spec/*.sdoc`（18-plan-actual, 16-dependencies, 11-items-icons, 13-layout-alignment, 19-tools-watermark, 40-data-format, 30-architecture）
- 図SSOT: `docs/spec/_assets/*.md`
- CR/記録: `project-records/change-requests/`, `/decisions/`, `/defects/`, `/reviews/R-CR001-spec-review.md`, `R-CR002-CR003-spec-review.md`, `/traceability/traceability-matrix.md`

---

# 次フェーズ: CR-004〜009（改善要求バッチ）実装 — 2026-07-21 起草

CR-001/002/003 の実装（IM1-IM8）＋サンプル刷新は完了。以下は**未着手**の改善CR群。**進め方**: 各CRを仕様先行（srs-writer/architect が該当 `.sdoc`＋schema を改訂 → implementer/test-engineer が実装＋テスト → review-agent）で回す。CR-001..003 と同じ gate（tsc0 / vitest green / eslint0 / strictdoc exit0 / build）を各節目で維持。**コミット/タグ/プッシュはユーザーが手動**。実機は screenshot がハングするため **DOM/JS 検証**で代替（`npm run dev` → localhost:5173 → javascript_tool でDOM確認）。

## CR一覧（すべて `project-records/change-requests/change-request-00N-20260721-070348.md`）
- **CR-004 表示・レイアウト・アイコン**: (1)下→上へ積む(サブレーン反転・最上段=マイルストーン) (2)マイルストーン高さ=タスク+15%・フォントはアイコン基準 (3)フォント大時のセクション行マージン(小分類/中分類重なり回避) (4)プロパティの end_date/fade_in_days/fade_out_days/actual_end ラベルを左・右詰め統一 (5)担当者名レイアウト(左・右詰め・依存線入口と非干渉) (6)**アイコン取込廃止**(import-sanitizer 画像経路撤去)・★→☆(輪郭)・**特殊マイルストーン7種**(ファイル/立体箱/フロッピー/円筒/上半身輪郭/笑顔/ビアタンブラー、[...]から選択、milestoneShape enum拡張)。既知ギャップ: fade_in_days/fade_out_days が PROP-L1-002 表に未列挙(同時修正推奨)。
- **CR-005 フォントスケール**: [A-][A][A+]→**[S][M][L]**改称／対象=セクション/プロパティ/コメント、**ヘッダー・パレットは対象外**(現 `font-scale.ts` は #app全体に適用＝要スコープ縮小)／プロパティは全サイズでスクロール無し／**コメントを追従**(現 `comment-layer.ts` は font-size 12 固定＝要修正、小分類名と同サイズ)。未決: 他にスケール対象があるか(要ユーザー確認)。
- **CR-006 パレット/ヘッダーUI**: (1)[Fit]最左 (2)[P]パレットトグル(パレット[-]と連動・最小化で色変化) (3)**[SS]→クリップボード**画像コピー(=CR-003 TOOL-L1-008 改訂) (4)[en][jp]言語トグル(右上、[AI]/[?]日英切替、**AI和訳はプロンプトのみ・スキーマ非対象**) (5)イナズマ線トグル(**既定=非表示**へ変更) (6)予実[Ao]/[As]トグル(=CR-002 PLAN-L1-005 UI化、既定[Ao]) (7)担当者名トグル (8)Add Box を左上/右下2クリック指定。未決: Part4 の「[X]」=現ヘッダー最右は[?]のため配置対象を要確認。
- **CR-007 選択・編集・移動・コピペ**: (1)Ctrl+クリック増減(矩形と併用) (2)★2 複数移動: 左右=日付一括シフト／上下=**最深共有分類レベル**(大/中/小)で隣接siblingへ再割当・上位維持・端で停止 (3)コメント ダブルクリック編集+Enter (4)Ctrl+A にコメントを含める(現 `keyboard-shortcuts.ts selectAll` は items のみ) (5)★1 分類コピペ(選択レベルで直下複製・xxx-N suffix・新ID・跨ぎ依存は複製側で破棄)。
- **CR-008 依存線スタブ・方向(★3)**: 出口/入口に**必ず水平スタブ**(2×矢印)／向きが正しく見える／重なり・後方・連続は**最大4折れ許容**(DEP-L2-002緩和)。**IM8の上下端入線(水平スタブ無し)を上書き＝DEF-005 再オープン**。テンプレの SYS1→SYS2 と Concept→Series Development が非破綻になること。
- **CR-009 透かし**: 既定パスワード=**GoodRelax**、格納は SHA-256 ハッシュのみ = `380e83c38461aa049922c0d277df334b01cfa0783f312be5e486ac06dc9c8ec3`(算出済。現行 `DEFAULT_WATERMARK_HIDE_PASSWORD_HASH=a8f81cfc…` を差替え)／透かしに**ユーザー名+UTC時刻**／UTCは**JSON変更時のみ更新**(ズーム/スクロールでは不変)。未決: 「アイテム変更検知」の結線点(Undo/Redo push時 or diff)。
- **CR-010 単一HTMLアプリ内DL(★0)**: `[?]`Help内に **[Download GR Scheduler]**。`fetch(location.href)` で素HTMLを取得しBlobで `gr-scheduler.html` をDL(現DOMは使わない=データ混入回避)。Release/タグ運用は不要。
- **CR-011 ヘルプのワンスクリーン収まり**: 日/英ともスクロール無しで1画面／3段組み維持／**幅を利用可能域まで拡大**(現 `help-modal.ts` は width:85vw・max-height:92vh・overflow:auto・column-count:3)／不足時のみフォント微縮。現行のレスポンシブ縮退(900px→2列/620px→1列)と3列維持方針の整合は実装時に確認。

## ★0（公開・単一HTML配布）— ユーザー確認待ち（CR不要・runbook）
現状: Pages Source=GitHub Actions（`pages.yml` が dist/index.html を `/` に、spec-html を `/spec-html/` に配信）。単一HTMLはリポジトリに無い（CI産物）。**推奨=GitHub Releases 添付**: 新規 `.github/workflows/release.yml`(`on: push tags 'v*'`)で build→`gr-scheduler.html` をそのReleaseに添付。ユーザーはタグを打つだけ。DL=`releases/download/<tag>/gr-scheduler.html`。**ユーザーのOK後に runbook 作成＋(実装セッションで)workflow追加**。

## CR間の依存・順序メモ
- CR-006 は CR-003(ヘッダー/SS) と CR-002(PLAN-L1-005) を改訂 → 先に CR-003/002 の該当 .sdoc を確認して整合。
- CR-008 は IM8/DEF-005 を上書き（依存線ルータ再設計）。CR-004 の下→上積みとも整合させる。
- CR-004 の特殊マイルストーン7種は milestoneShape enum 拡張＝schema+model+renderer。アイコン取込廃止は import-sanitizer/ARCH-C-026 撤去（セキュリティ簡素化）。

## CR外の申し送り事項（ナンバリング／実装セッションのAI向け・厳守）

> これらは CR に含めない事実・手順・要確認点。番号で参照せよ。曖昧に解釈するな。

- **H-1 性能PoC（未実行・ユーザー立会い必須）**: 中規模（~50行/~1000アイテム）で 60fps ズーム/パン・初期表示 1.5s 以内を実測する（RISK-001）。**AIが勝手に実行してはならない。必ずユーザーを呼んで一緒に測る**（memory `perf-test-notify`）。ベンチは `?bench=N`。
- **H-2 実機検証の方法**: この環境では `computer{action:"screenshot"}` が30秒ハングする（再現確認済み）。**スクショに頼るな。** `npm run dev`→http://localhost:5173/→`mcp__Claude_Browser__javascript_tool` で DOM を問い合わせて検証せよ（例: `[data-item-id]` 数、rect の `fill`、`[data-dependency-id] path` の `d`）。**テスト緑＝実機OK ではない**（memory `live-verify-gotchas`）。プレビューは 0×0/534px で cold-start することがある→`resize_window` 後に `navigate` で再読込。
- **H-3 PROP 表の既存ギャップ**: `PROP-L1-002` の項目表に `fade_in_days`/`fade_out_days` が未列挙（schema/モデルには `fadeInDays`/`fadeOutDays` が存在）。**CR-004 Part 4 の実装時に同表へ同時追加**すること。
- **H-4 実装着手前に要ユーザー確認（3件）**: (a) CR-005＝[S][M][L]でフォントが変わる対象は「セクション/プロパティ/コメント」で確定か、他にもあるか。 (b) CR-006＝[en][jp]を置く「画面右上[X]の左」の[X]の実体（現ヘッダー最右は[?]で、[X]相当は未定義）。 (c) CR-009＝「アイテム変更検知（JSON値変化）」でUTC時刻を更新する結線点（Undo/Redo push時 or ドキュメントdiff）。**これらは推測で実装せず、ユーザーに確認**。
- **H-5 透かし既定ハッシュ**: パスワード "GoodRelax" の SHA-256 = `380e83c38461aa049922c0d277df334b01cfa0783f312be5e486ac06dc9c8ec3`（算出済）。CR-009 実装で現行 `DEFAULT_WATERMARK_HIDE_PASSWORD_HASH=a8f81cfc4f489a27c6e6fa3a31c6089878a3648e24c04ee1b934ac03b99ce46c` を**この値へ差し替え**。生パスワードはコード/HTML/JSON に一切保存しない。
- **H-6 CR間の上書き関係（整合を保て）**: CR-006 は CR-003（ヘッダー `TOOL-L1-008`／SS=クリップボード）と CR-002（`PLAN-L1-005` 予実トグルUI化）を改訂。**CR-008 は IM8/DEF-005 の依存線ルータを上書き＝再設計**（水平スタブ必須・向き正・折れ最大4）で、CR-004 Part1（下→上積み）とも整合させる。CR-010 は ★0 を解決（Release/タグ不要）。
- **H-7 アイコン取込廃止の波及（CR-004 Part6）**: `import-sanitizer` の SVG/PNG 画像経路・PNG検証・`ARCH-C-026` の該当部を撤去。`ImportedAsset` 型・`assets[]`・`importedAssetId`・JSON/MSPDI の assets 往復も除去し、関連サニタイザテストを整理。未公開ゆえ互換不要。
- **H-8 ★0 の結論**: 単一HTML配布は **CR-010 の[Download GR Scheduler]（アプリが `fetch(location.href)` で自分の素HTMLをBlob DL）** で確定。GitHub Releases/タグ運用は不要（将来の版管理が要れば任意で別途）。
- **H-9 既存の未整備（非ブロッカー）**: CI（GitHub Actions での lint/type-check/test/build 検証）未整備。kotodama 用語チェック未実施。必要に応じ実施。
- **H-10 進め方の厳守**: 各CRは仕様先行（srs-writer=L1要求文／architect=specialize・verification・schema・data-format）→ implementer/test-engineer 実装＋テスト → review-agent。gate（tsc0 / vitest green / eslint0 / strictdoc exit0 / build）を各節目で維持。**コミット/タグ/プッシュはユーザーが手動**。命名は item60（無意味符牒禁止、コード/コメント/ログは英語ASCII）。
