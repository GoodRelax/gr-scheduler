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
- **IM2（#13）**: `progress-line-builder.ts` 4ケース＋マイルストーン点 front／`mspdi-codec.ts` B-1..B-6＋linkType/lagDays/Deadline／Overlap/Separate 描画。単体＋往復テスト。
- **IM3（#14）**: `plan-actual-colors.ts` 彩度+線幅（緑/橙廃止）／マイルストーン2マーカー／ベースライン別ファイルローダ+グレーアンダーレイ+id突合+ヘッダートグル。テスト。
- **IM4（#15）**: ヘッダー再編（`main.ts`: ボタン群・SS・Monoテーマ・Base V/I・AI・Help）／ラベル inner-left+衝突回避エンジン／依存線ルータ書換え（右出左入・2×スタブ・上下折れ・行間ギャップ）。単体＋E2E。
- **IM5（#16）**: DEF-004 `.sdoc` flat 同期／単一HTMLビルド検証／a11y(axe)＋性能再確認（**性能PoCはユーザー立会い必須** = memory `perf-test-notify` / RISK-001）／R1-R6 最終レビュー／traceability 実装状態 pending→done。

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
