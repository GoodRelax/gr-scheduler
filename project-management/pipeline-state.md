# gr-scheduler パイプライン状態 / 引き継ぎ (handoff)

- 更新: 2026-07-18
- 目的: full-auto-dev の進行状態を記録し、セッションをまたいで再開可能にする

## プロジェクト概要
1つの `.html` で動く WYSIWYG マルチバー日程表ツール。差別化=1行に複数アイテム横並べ。
成果物=単一HTML（Vite + vite-plugin-singlefile）。詳細は `CLAUDE.md`、要求は `user-order.md`（62項目）。

## 確定した重要判断
- 仕様形式: **StrictDoc**（`docs/spec/*.sdoc` + `gr-scheduler-grammar.sgra`）。検証: `strictdoc export docs/spec`（`C:\Python313\Scripts\strictdoc.exe`、exit 0 が健全）
- 技術: TypeScript(strict) + Vite + vite-plugin-singlefile、vanilla TS + SVG、Vitest/Playwright
- 保存: ファイルI/O + localStorage 自動保存 / MSProject=MSPDI XML双方向 / 規模=中規模(~50行/~1000アイテム)
- 製品名: gr-scheduler / 条件付きプロセス: WCAG 2.1 AA + i18n 有効
- **DEC-001**: レンダリング=SVG + ビューポート仮想化/LOD + 差分描画（`project-records/decisions/DEC-001-rendering-approach.md`, ADR-009）
- StrictDoc の落とし穴: RELATIONS は `VALUE:` が `ROLE:` より前 / `**bold**` は CJK 直接隣接不可（両側に半角空白）。詳細は memory `strictdoc-authoring`

## フェーズ状態
| Phase | 状態 |
|---|---|
| 0 条件付き評価・CLAUDE.md | ✅ |
| 1 仕様（StrictDoc 15文書, L0/UC/L1-L3, 126要求）| ✅ R1 PASS（`project-records/reviews/R1-spec-review.md`）|
| 1 トレーサビリティ（user-order 全62項目→UID, 漏れ0）| ✅ `project-records/traceability/user-order-coverage.md` |
| 3 設計（30-architecture 35コンポ+ADR9, 40-data-format, security, risk, wbs）| ✅ R2/R4/R5 指摘修正済（`project-records/reviews/R2-R4-R5-design-review.md`）|
| 4 M1 骨格＋性能PoC | ✅ **PASS**（下記）|
| 4 M2 編集＋プロパティ＋Undo/Redo | ✅ 完了・R2-R5レビュー PASS。Medium3はM3で修正済 |
| 4 M3 セクション＋依存線＋左可変ペイン | ✅ 完了（69テスト, 単一HTML 55.6kB, tsc/lint clean）。依存線ルータ純関数検証済。単独レビュー省略→M4後にM3+M4合同レビュー予定 |
| 4 M4 予実＋注記 | ✅ 完了（予実表示切替/イナズマ線/変更前グレー/本日線/デュアルカーソル/コメント/丸角囲み）。96テスト全PASS（14ファイル）, tsc/lint clean, 単一HTML 66.95kB。M3+M4合同レビュー予定 |
| 4 M3+M4 合同レビュー(R2-R5) | ✅ 指摘解消（初回FAIL High1=H-01 依存線端点自己除外バグ→参照比較を安定ID/値比較へ修正+回帰テスト。Medium/Low対応）。99テスト全PASS, 単一HTML67.76kB |
| 4 M5a 入出力+サニタイザ+永続化 | ✅ 実装完了（JSON/MSPDI/SVG コーデック・ハンドロール SVG サニタイザ・PNG検証・XXE/proto/DoS上限・File I/O・localStorage自動保存/復旧）。137テスト全PASS（新規4ファイル+41ケース, うちセキュリティ多数）, tsc/lint clean, 単一HTML 90.07kB 自己完結。新規ランタイム依存ゼロ。R2-R5レビュー/kotodama用語チェック待ち |
| 4 M5a セキュリティ敵対レビュー | ✅ PASS（Critical/High=0, バイパス構築不可）。Medium3=M-1サニタイザ不変条件テスト/M-2厳格CSP未注入/M-3色値未検証 → M5bで対応。報告`project-records/security/M5a-security-review.md` |
| 4 M5b 透かし+ツール仕上げ+i18n値+SecMedium | ✅ 実装完了。透かし(斜めタイル・画面+SVG出力=TOOL-L1-007/L2-001/002/003)・パレット非選択時透明化(TOOL-L1-006)・全UIフォント一律スケール(TOOL-L1-002)・i18n値レイヤ+言語トグル en/ja(PROP-L1-003)。SecMedium 3件是正: M-3色値検証(color-validator, JSON/SVG paint 検証)・M-2厳格CSP(ビルド後sha256自動注入, connect-src none)・M-1サニタイザ不変条件テスト。165テスト全PASS(新規6ファイル28ケース), tsc/lint clean, 単一HTML 96.48kB(CSP meta付, 外部参照0, sha256一致検証済)。R2-R5/セキュリティ再レビュー待ち |
| 4 M5c a11y(WCAG 2.1 AA) | ✅ 実装完了。キーボード操作(キャンバスフォーカス/Tabローピング/矢印nudge・行移動/Shift+矢印リサイズ/Enter配置/Escape取消, トラップ無し=2.1.1/2.1.2)・可視フォーカス(SVG実線リング+DOM outline=2.4.7)・フォーカス順(ツールバー→パレット→左ペイン→キャンバス→パネル=2.4.3)・名前/役割(role/aria-label, アイテム=role img+title「略称+種別+日付」, live region=4.1.2/1.1.1/4.1.3)・色非依存(選択破線/予実破線実線/フォーカスリング=1.4.1)・コントラスト(UIトークン集約, パレット遊休は地色のみフェード, empty-state/sub-label/armed色是正=1.4.3)・reduced-motion(2.3.3)・html lang(3.1.1)。新規純関数: contrast.ts/accessible-name.ts/a11y-tokens.ts/keyboard-commands.ts。新規adapter: a11y-stylesheet.ts/live-region.ts/keyboard-navigation.ts。**axe-core自動スキャン(tests/e2e/a11y.spec.ts, Playwright)を本環境で実行しserious/critical 0件PASS**。単体199テスト全PASS(新規34, 28ファイル), tsc/lint clean, 単一HTML 107.95kB(外部参照0/CSP維持/axe・playwright非バンドル)。新規DEVのみ依存 @axe-core/playwright@4.12.1 (MPL-2.0, license-checker/SCA要確認, 製品バンドル非混入)。チェックリスト docs/dev/a11y-wcag21-aa-checklist.md。R2-R5/人手SRレビュー待ち |
| 4 M6 | ⏳ 未着手 |
| 未配線（後続で対応）| 行並替UI/行縦nudge、セクションdragドラッグ並替のUIジェスチャ（command/testは実装済） |
| 5 テスト / 6 納品 | ⏳ |

## 性能PoC 結果（RISK-001 mitigated, ユーザー立会い実測 2026-07-18）
- 1000アイテム/50行: 初期描画 4.6ms / 平均 162.3 FPS / p95 6.20ms / 実SVGノード 93 → **目標(60fps/1.5s)大差クリア**
- 10000アイテム: 20 FPS（既知上限・中規模スコープ外・将来のみ再検討）

## 実装(M1)の現状
- src: `src/domain/model/schedule-model.ts`, `src/domain/usecase/{time-coordinate-mapper,layout-engine,lod-selector,viewport}.ts`, `src/adapters/render/svg-renderer.ts`, `src/app/{main,logger,sample-data,benchmark}.ts`
- tests: `tests/*.test.ts`（14 PASS）/ ビルド: `npm run build` → `dist/index.html` 単一自己完結(14.3kB) / dev: `npm run dev`（5173稼働中）/ bench: `?bench=N`
- lint clean、npm audit 0脆弱性（vite@8/vitest@4へ更新済）

## M4 実装ファイル（追加/変更）
- 新規: `src/domain/model/annotation.ts`（ARCH-C-005 注釈）, `src/domain/usecase/progress-line-builder.ts`（ARCH-C-014 予実フィルタ+イナズマ線+変更前ゴースト）, `src/domain/usecase/cursor-span.ts`（ARCH-C-016 本日線/スパン/丸角スクリーン矩形）, `src/domain/command/annotation-commands.ts`（Undo対応の注釈作成/移動/色/削除）
- 変更: `src/domain/model/schedule-model.ts`（PlanActualDisplay/CursorMode/DualCursorState/PreviousPlan・ViewState/ScheduleItem/ScheduleDocument 追加フィールド）, `src/adapters/render/svg-renderer.ts`（画面空間オーバレイ: 本日線/カーソル/イナズマ線/丸角囲み/コメント + ゴーストbar + 予実フィルタ）, `src/app/main.ts`（P/A・Today・Cursor トグル + コメント/囲み作成ボタン）, `src/app/sample-data.ts`（予実ペア/変更前予定/注記のショーケース）
- 新規テスト: `tests/progress-line-builder.test.ts`, `tests/cursor-span.test.ts`, `tests/annotation-commands.test.ts`
- オーバレイは装飾数に比例（画面空間・item数非依存）で仮想化性能に影響なし

## M5a 実装ファイル（追加/変更）
- 新規(pure usecase): `src/domain/usecase/import-sanitizer.ts`（ARCH-C-026 トラスト境界。ハンドロール SVG allowlist サニタイザ=parse→再直列化 / __proto__ proto-pollution reviver+depth / DOCTYPE-ENTITY 拒否 / PNG magic+IHDR寸法 / バイト・ノード・深さ上限 / base64・data URI）, `src/domain/usecase/json-codec.ts`（IO-L1-001 直列化+schemaVersion移行DATA-JSON-001+strict validator）, `src/domain/usecase/mspdi-codec.ts`（IO-L1-002 標準MSPDI要素+base64サイドカーで完全往復）, `src/domain/usecase/svg-exporter.ts`（IO-L1-003 全アイテム自己完結SVG・透かしフック=M5b）
- 新規(adapter io, DOM境界): `src/adapters/io/file-io.ts`（Blobダウンロード/File選択/読取）, `src/adapters/io/import-service.ts`（バイト判定でJSON/MSPDI/SVG/PNGを各サニタイザへ振分）, `src/adapters/io/autosave.ts`（デバウンスlocalStorage自動保存+復旧、破損再検証、quotaガード）
- 変更: `src/domain/model/schedule-model.ts`（ImportedAsset型+assets[]/item.importedAssetId, DATA-JSON-013）, `src/app/main.ts`（Export JSON/XML/SVG・Import・Import icon ボタン+自動保存配線+起動時セッション復旧確認）
- 新規テスト: `tests/{import-sanitizer,json-codec,mspdi-codec,svg-exporter}.test.ts`（セキュリティST-01..13相当を含む41ケース）
- セキュリティ: 新規ランタイム依存ゼロ（DOMPurify不採用。security-design §3.2 許可リストを自前実装しparse→再直列化で網羅）。CSP metaのビルド注入(C-13)はM5b/M6の残タスク

## 実装マイルストーン（WBS `project-management/progress/wbs.md`）
- M2 編集＋プロパティ（作成/移動/リサイズ・整列ソルバ・双方向同期・プロパティパネル・Undo/Redo）
- M3 セクション＋依存線（順序/表示切替/小タブ・9点アンカー自動配線・左可変ペイン）
- M4 予実＋注記（イナズマ線・グレー・カーソル/コメント/丸角囲み）
- M5 入出力＋透かし＋a11y（JSON/MSPDI XML/SVG・localStorage・サニタイザ・WCAG）
- M6 堅牢化＋単一HTMLビルド＋納品

## 未処理フォローアップ
- M1 実ファイルパスが 30-architecture の MODULE 提案と一部差異 → フルビルドで整合
- `project-records/traceability/traceability-matrix.md` 未作成（現状 user-order-coverage.md のみ）
- kotodama-kun 用語チェック未実施（成果物一式）
- DOMPurify 採用予定 → license-checker 確認
- CI（GitHub Actions: lint/type-check/test/build 検証）未整備

## 再開の要点
- 仕様検証: `cd <repo> && strictdoc export docs/spec --output-dir <tmp>` → exit 0
- アプリ: `npm run dev` → http://localhost:5173/（`?bench=1000` で性能再計測）
- 進行方針: 各マイルストーンを「実装→単体テスト→review-agent(R2-R5)」で回し節目報告。性能テスト実行時はユーザーを呼ぶ（memory `perf-test-notify`）

## 完了 (2026-07-18): 納品判定 GO — MVP 完成
- user-order 62項目 全実装。213単体テスト+E2E 4 PASS、domainカバレッジ90.47%、tsc/lint 0、npm audit 0、単一HTML 109.6kB+厳格CSP、strictdoc 17文書 exit 0、性能162fps(ユーザー立会い)、セキュリティ敵対レビューPASS、ライセンス配布クリア
- 最終デリバリレビュー: 初回NO-GO(High=F-01 セクション順序入替UI未配線)→F-01修正(上下ボタン配線+pointer-capture不具合修正+回帰/E2E)→**GO**
- 納品文書: `project-management/final-report.md`, `project-management/acceptance-test-procedure.md`, `project-records/traceability/traceability-matrix.md`
- 残タスク（非ブロッカー, final-report §6）: 依存線キーボード作成/任意色ラベル自動コントラスト/実SR目視/CI(GitHub Actions)未整備/ViewState項目のautosave未捕捉+DATA-JSON-010パス差異/kotodama用語チェック/セクション行ドラッグ並替UI/M1パス整合
- 次アクション: ユーザーが手動コミット（規約）。推奨コミットは会話末尾参照
