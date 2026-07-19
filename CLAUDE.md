# プロジェクト: gr-scheduler

## プロジェクト概要

1つの `.html` ファイルでブラウザだけで動作する、WYSIWYG な日程表作成ツール。
パワポで日程表を書く作業とほぼ同じ操作感を提供しつつ、成果物は画像ではなく
構造化データ（JSON / MSProject-XML）として保持する。

最大の差別化は **マルチバー表示**（1行に複数のマイルストーン/タスクを横並べ）であり、
日本のすり合わせ開発における「1車種＝1行＝全フェーズを一枚絵で俯瞰」という日程表文化を
そのままデジタル化する。既存ツール（OpenProject / Jira系 / Polarion / MS Project Web /
iQUAVIS 等）の調査結果は `old/日程管理ツール.md` を参照。本プロジェクトは同レポートの
「自社構築」案を実行するものである。

- **コア価値**: マルチバー行 + 上下左右整列 + ズーム連動LOD + 依存線自動配線 + AI連携用JSON
- **成果物**: ビルドで単一 `.html` にインライン化された自己完結アプリ（サーバー不要・完全オフライン）

## 概念の区別（重要）

- **gr-sw-maker** = 開発フレームワークのツール名 / リポジトリ名 / npm パッケージ名
- **full-auto-dev** = 手法論名（ツールに依存しない上位概念）
- **gr-scheduler** = 本プロジェクト（フレームワークで開発する成果物＝日程表ツール）
- full-auto-dev を gr-sw-maker に置換してはならない。逆も同様

## 開発方針

- 本プロジェクトはほぼ全自動開発（full-auto-dev）で進行する
- ユーザーへの確認は重要判断のみに限定する（下記「重要判断の基準」参照）
- 軽微な技術的判断はClaude Codeが自律的に行う
- 仕様書は **StrictDoc 形式**で `docs/spec/` 配下に出力する（下記「仕様形式」参照）
- その他の設計成果物は `docs/` 配下に Markdown で出力する
- プロセス文書（パイプライン状態、引継ぎ、進捗）は `project-management/` 配下に出力する
- プロセス記録（レビュー、意思決定、リスク、defect、CR、トレーサビリティ）は `project-records/` 配下に出力する
- コードは `src/` 配下、テストは `tests/` 配下、ビルド構成は repo ルートの Vite 設定に配置する
- 運用規則は以下を参照する:
  - process-rules/full-auto-dev-process-rules.md（プロセス規則）
  - process-rules/full-auto-dev-document-rules.md（文書管理規則）
  - process-rules/agent-list.md（エージェント一覧）
  - process-rules/prompt-structure.md（プロンプト構造規約）
  - process-rules/glossary.md（用語集）
  - process-rules/defect-taxonomy.md（不具合系用語の体系）
  - process-rules/review-standards.md（レビュー観点規約 R1-R6）

## 言語設定

- プロジェクト主言語: **ja**（日本語）
- 翻訳言語: **en**（英語。仕様書・ユーザーマニュアルはリリース前に翻訳）
- 主言語のファイルはサフィックスなし。翻訳版のみ `-en.md` / `-en.sdoc` を付与する
- **コード・識別子・コメント・ログ・スクリプトは英語かつ ASCII**（GitHub世界公開前提）
- **製品UIの表示文字列は i18n 対象**（多言語）。ただし property 編集時の property 名は英語固定（user-order item18）

## 仕様形式（StrictDoc）

本プロジェクトの仕様は **StrictDoc**（`.sdoc` + カスタム文法 `.sgra`）で記述する。
`C:\Users\good_\OneDrive\Documents\GitHub\StrictDocStarter` の `samples/sovd-automotive-ja`
を模範とする。CLAUDE.md 標準テンプレートの ANMS/ANPS/ANGS 選択は本プロジェクトでは
StrictDoc に置換する（StrictDoc は要求のUID・EARS文・階層トレース・被覆マトリクスを
ネイティブに扱えるため、55超の要求とV字トレースを持つ本プロジェクトに適する）。

- 文法定義: `docs/spec/gr-scheduler-grammar.sgra`（各 `.sdoc` が `IMPORT_FROM_FILE` で読込）
- プロジェクト設定: `docs/spec/strictdoc_config.py`
- 文書構成（V字トレース）:
  - `00-overview.sdoc` — 前付け（背景/課題/目標/範囲/構成/用語/表記規約/前提/改訂履歴）
  - `01-stakeholder-requirements.sdoc` — L0 ステークホルダ要求（EARS）
  - `02-usecases.sdoc` — ユースケース（アクター・UC図・シナリオ）
  - `10-*` 〜 ドメイン別 L1-L3 要求（キャンバス/アイテム/整列/ズーム/依存線/分類/コメント/透かし/入出力/i18n/a11y 等）
  - `30-architecture.sdoc` — アーキテクチャ（Clean Architecture レイヤ仕訳・ADR）
  - `40-data-format.sdoc` — データ形式契約（JSON スキーマ・MSPDI XML マッピング・SVG出力）
  - `50-test-spec.sdoc` / `51-test-results.sdoc` — テスト仕様 / 結果
  - `90-appendix-notation.sdoc` — 表記リファレンス
- 要求文は **EARS 構文**、UID は `<ドメイン>-<層>-<連番>`（例 `ITEM-L1-001`）
- 層: L0_Stakeholder → L1_System → L2_Component → L3_Unit
- リレーション: Parent/Child（要求分解）、Implements（設計）、Satisfies（データ形式）、Verifies（テスト）、ResultOf（結果）

## 技術スタック

- 言語: **TypeScript**（strict）
- ビルド: **Vite** + `vite-plugin-singlefile`（全JS/CSS/アセットを単一 `.html` にインライン化）
- UI/描画: フレームワーク非依存の vanilla TS + **SVG**（キャンバス描画・ズーム・依存線・SVG出力の低レベル制御が中心のため）
- 状態管理: 独自の軽量ストア（不変更新 + イベント）。重量級UIフレームワークは使わない
- データ: クライアント完結。**ファイル入出力（File API による .json/.xml ダウンロード・アップロード）+ localStorage 自動保存**（クラッシュ復旧）
- 外部連携形式: **JSON**（AI向け・主データ形式）、**MSPDI XML**（MS Project Data Interchange 双方向 Import/Export）、**SVG**（画面出力）
- テスト: **Vitest**（単体/結合）、**Playwright**（E2E・視覚回帰）
- Lint/Format: ESLint + Prettier（+ TypeScript type-check）
- CI/CD: GitHub Actions（lint / type-check / test / build 成果物検証）
- コンテナ/IaC: 本プロジェクトはサーバーレス単一HTMLのため不要（将来の共同編集サーバ導入時に再評価）

## ブランチ戦略

- メインブランチ: main（直接コミット禁止）
- 開発ブランチ: develop（統合ブランチ）
- 機能ブランチ: feature/{issue番号}-{説明}（develop から分岐）
- defect 修正ブランチ: fix/{issue番号}-{説明}
- リリースブランチ: release/v{バージョン}
- PRマージ: develop → main は review-agent PASS 後にのみ許可
- Agent Teams の並列実装: git worktree を使用し、各エージェントは専用ブランチで作業
- **注意**: 現状このディレクトリは Git 未初期化。実装フェーズ開始前に `git init` を提案する
- コミット/プッシュ/タグはユーザーが手動で行う（Claude Code は実行しない）

## コーディング規約

- ESLint / Prettier 設定に従う。TypeScript は strict モード
- すべての公開関数に JSDoc コメントを付与する
- エラーハンドリングは明示的に行う（握りつぶし禁止）
- ログは構造化（開発時のみ）。製品はクライアント側のため過剰ログを避け、デバッグは名前空間付きロガーで制御。`console.log` の素の使用は禁止
- **命名は言霊**（user-order item60）: `type`, `data`, `info`, `value` 等の無意味な汎用語は禁止。
  名前は「それが何か」を一目で伝える。ドメインで限定する（例: `status` → `plan_actual_status`、`kind` → `icon_shape_kind`）
- **Clean Architecture / DIP 遵守**: ドメイン（レイアウトエンジン・整列・LOD・依存線ルーティング・日付モデル）を
  Entity/UseCase に置き、SVG描画・File I/O・localStorage は Adapter/Framework に分離する
- **プロンプト配置**: 本製品はAI推論を組込まないため製品プロンプトは無し。プロジェクトを回すプロンプトは `.claude/` 配下

## ドメイン境界（コアロジック）

以下は本プロジェクト固有のコアドメイン（既製ライブラリで代替しない、自作する価値の中心）:

- **マルチバー・レイアウトエンジン**: 1行に複数アイテムを重ならず配置し、上下左右揃え（自動/中央/上下左右）を解決する
- **異方性ズーム + LOD**: 縦/横独立ズーム、拡大縮小に応じた時間軸粒度（年→年月→月日曜）とアイテムの自動増減
- **依存線の自動配線**: 9点アンカーからの引出し、他アイコンとの重なり最小化、折れ点0〜3の経路探索
- **時間↔座標マッピング**: 日付・期間と画面座標の相互変換（ズーム・スクロールに追従）
- **イナズマ線 / 予実差分**: 実績の遅延可視化、変更前予定のグレー表示
- **データ形式変換**: 内部モデル ↔ JSON ↔ MSPDI XML の双方向マッピング

以下はドメインではなく既存技術の利用（Adapter/Framework）: SVGレンダリング、File API、localStorage、絵文字/フォント描画。

## セキュリティ要求

- OWASP Top 10 のうちクライアントアプリに該当する項目（主に XSS / インジェクション）へ対策する
- **入力値バリデーション必須**: Import する JSON / MSProject-XML / SVG / PNG は信頼できない入力として扱い、
  厳格にパース・サニタイズする（XXE 対策として XML 外部エンティティ無効化、SVG は危険要素除去、`innerHTML` 直挿し禁止）
- 認証・サーバ通信は MVP に無し（将来の共同編集で JWT + E2E 暗号を導入。設計で拡張点を確保）
- SAST: CodeQL（GitHub Actions）。SCA: npm audit（依存追加時）。シークレットスキャン: コミット前
- スキャン結果: `project-records/security/` に記録

## 品質目標（全品質ゲートの Single Source of Truth）

| 指標 | 目標値 | 備考 |
|------|--------|------|
| 単体テスト合格率 | 95% 以上 | 全ドメインロジック（レイアウト/ズーム/依存線/日付/変換） |
| 結合テスト合格率 | 100% | モジュール間・データ変換往復 |
| コードカバレッジ | 80% 以上 | ドメイン層は重点的に |
| E2Eテスト | 主要ユーザーフロー PASS | UC対応（アイテム作成/整列/ズーム/依存線/入出力/透かし） |
| 性能テスト | NFR数値目標を達成 | 中規模（~50行 / ~1000アイテム）で 60fps のズーム/パン、初期表示 1.5s 以内 |
| アクセシビリティ | **WCAG 2.1 AA** | axe 等で自動チェック + 手動確認（色弱者対応・キーボード操作） |
| セキュリティ脆弱性 | Critical: 0, High: 0 | SAST/SCA |
| レビュー指摘 | Critical: 0, High: 0 | review-agent |
| コーディング規約準拠 | 違反 0 件 | ESLint/Prettier/tsc |
| 成果物制約 | 単一 `.html` で動作 | ビルド後 SPA が1ファイルで完全動作すること |

## データ形式

- **JSON**: 主データ形式（AI向け）。スキーマは `docs/spec/40-data-format.sdoc` と `docs/api/`（JSON Schema）に定義
- **MSPDI XML**: MS Project Data Interchange。双方向 Import/Export。マッピング表を仕様に定義
- **SVG**: 画面出力（エクスポート専用）
- architect が仕様詳細化と同時に JSON Schema / XML マッピングを生成し、test-engineer が往復整合性を検証する

## 可観測性要求（クライアント版に調整）

- サーバーレスのため RED メトリクス・分散トレーシングは対象外
- 開発時: 名前空間付き構造化デバッグロガー（本番ビルドで除去）
- 製品内: ユーザー操作の Undo/Redo 履歴、localStorage 自動保存の成否表示、エラー時のユーザー通知（トースト）
- 将来の共同編集サーバ導入時に本節を可観測性設計へ拡張する

## Agent Teams 設定

`process-rules/agent-list.md` および各 `.claude/agents/*.md` の定義を使用する。
主要ロール: orchestrator / srs-writer / architect / security-reviewer / implementer / test-engineer /
review-agent / progress-monitor / change-manager / risk-manager / license-checker / kotodama-kun /
user-manual-writer / runbook-writer / process-improver / decree-writer。
（本プロジェクトで無効: field-test系・incident-reporter は MVP 段階では不使用。運用フェーズ有効化時に再検討）

## 重要判断の基準

以下はユーザーに確認を求める:
- アーキテクチャの根本的選択（レンダリング方式・状態管理方式の変更等）
- 外部サービス/ライブラリの重大な選定
- セキュリティモデルの重大な変更
- 予算・スケジュールに影響する判断
- 要求の曖昧さで複数解釈が可能な場合
- リスクスコア6以上の発生
- 変更要求の影響度が High の場合

以下は Claude Code が自律判断してよい:
- ライブラリの具体的バージョン選定
- リファクタリング方針
- テストケース設計
- ドキュメント構成
- defect 修正の方法

## 必須プロセス設定

- 変更管理: 仕様承認後の変更は change-manager 経由
- リスク管理: 設計フェーズでリスク台帳を作成し各フェーズ開始時に更新
- トレーサビリティ: 要求→設計→テストの対応を StrictDoc のリレーションで表現（DEEP TRACE / MATRIX）
- 問題管理: defect は `project-records/defects/` に記録し根本原因分析
- ライセンス管理: 依存追加時に license-checker を実行
- 監査記録: 重要判断は `project-records/decisions/` に記録
- コスト管理: `project-management/progress/cost-log.json` に記録

## 条件付きプロセス（Phase 0 評価結果）

有効化:
- **アクセシビリティ (WCAG 2.1 AA)**: 有効 — 理由: user-order item6（アフォーダンス/マニュアル不要）、item20（色弱者対応・原色不使用）、各国ユーザー対象
- **製品i18n/l10n**: 有効 — 理由: user-order item17（property多国語）、item18（property名英語固定）、item6（各国ユーザー）、item23-25

無効（理由付き）:
- 機能安全(HARA/FMEA/FTA): 無効 — 人命・インフラ制御なし
- 法規調査: 無効 — サーバー送信なしのローカルツール。将来の共同編集（item59）で透かしのユーザー名等につきプライバシー再評価
- 特許調査: 無効 — OSS/自社利用、商用販売想定なし
- 技術動向調査: 無効 — ブラウザ標準技術は安定
- HW連携 / HW生産工程管理: 無効
- AI/LLM連携: 無効 — JSON出力はAI向けだがツールにAI推論を組込まない
- フレームワーク要求定義: 無効 — 単一HTMLのバンドル戦略は設計で判断
- 認証取得: 無効
- 運用・保守: 無効（MVP）— サーバーレス単一HTML。item59 共同編集実装時に再評価

## ドキュメントの基本形式 (MCBSMD)

チャットへドキュメント成果物を提示する際は MCBSMD（六重バッククォートで全体を囲む単一 Markdown、
内部の図/コードは三連バッククォート + 言語指定 + `**title:**`、図は原則 Mermaid、数式は LaTeX）に従う。
矢印にはラベルを付す。`.sdoc` / ソースコード等のファイル書き出しはこの限りではない（通常のファイル内容として書く）。
