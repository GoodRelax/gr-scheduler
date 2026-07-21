# レビュー報告: CR-010 実装（Help からの単一HTMLアプリ内蔵ダウンロード）

- レビューID: R-CR010-implementation-review
- 日付: 2026-07-21
- レビュア: review-agent
- 対象CR: [CR-010](../change-requests/change-request-010-20260721-071425.md)
- 適用観点: **R2**（設計原則/命名/CA）, **R3**（コーディング品質/エラー処理）, **R4**（並行性・状態）, **R5**（性能）— セキュリティ重点
- 複雑度: Low（比例的レビュー）
- レビュー対象成果物:
  - `src/adapters/io/file-io.ts`（`downloadDeliveredApp`, `downloadBlobFile`, `DELIVERED_APP_FILE_NAME`, `DeliveredAppDownloadDeps`）
  - `src/adapters/ui/help-modal.ts`（`download-app` ボタン, `downloadAppLabel`）
  - `src/app/main.ts`（配線, 失敗時の polite live region 通知）
  - `tests/file-io-delivered-app.test.ts`, `tests/help-modal.test.ts`

---

## 総合判定: **PASS**

Critical/High いずれも 0 件。CR-010 の受入基準（§6）およびコア要件（編集中データを配布物へ混入させない）を満たす。フェーズ遷移を許可する。

### 指摘件数（重大度別）

| 重大度 | 件数 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 |

### 品質ゲート数値

| ゲート | コマンド | 結果 |
|--------|----------|------|
| 型検査 | `npx tsc --noEmit` | **0 errors** |
| テスト | `npx vitest run` | **696 passed / 72 files（0 fail）**（うち CR-010 関連 11/11） |
| Lint | `npx eslint src tests` | **0（違反なし）** |

---

## 観点別評価

### R2 設計原則・命名・Clean Architecture — PASS

- **命名（item60・MUST）**: `downloadDeliveredApp` / `downloadBlobFile` / `deliveredHtml` / `sourceUrl` / `fetchImpl` / `downloadBlob` / `DELIVERED_APP_FILE_NAME` / `downloadAppLabel` はいずれも動詞+目的語・役割が一目で伝わる。`data`/`info`/`value` 等の汎用語なし。
- **DRY**: DOM ダウンロード原始操作を `downloadBlobFile` に抽出し、`downloadTextFile` はそれへ委譲。重複なし。既存 `downloadTextFile` の振る舞いは回帰なし（全テスト緑）。
- **CA/DIP（MUST）**: `file-io.ts` は Adapter 層に閉じ、ドメインは `document`/`Blob`/`fetch` を import しない。`DeliveredAppDownloadDeps` による依存注入で `fetch`/`downloadBlob`/`sourceUrl` を差し替え可能にし、テスト容易性と境界分離を両立。UI（help-modal）・IO（file-io）・配線（main.ts）が SoC で分離。
- **KISS/SRP/YAGNI**: 単一の自己ダウンロード責務。過度な抽象化・死コード・未使用パラメータなし。

### R3 コーディング品質・エラー処理 — PASS

- **外部I/O のエラー捕捉（MUST）**: `fetch` を `try/catch` で包み、(a) reject（file:// / CORS / オフライン）、(b) `!response.ok`（404/500 等）の双方を扱い `false` を返す。握りつぶしなし——`log.warn` に `reason` / `http_status` の文脈を付与。
- **未処理 rejection なし**: `downloadDeliveredApp` は内部で全例外を捕捉し常に resolve するため、`main.ts` 側の `void ...then(...)`（`.catch` 無し）でも未処理 rejection は発生しない。
- **防御的**: `deps` 既定値、`error instanceof Error` ガード。安全確認なしの型アサーションなし。

### R4 並行性・状態 — PASS（セキュリティ重点で確認）

- **編集データ非混入（コア要件・最重要）**: 取得は `response.text()`（配信バイト列）のみで、`document.documentElement.outerHTML` を一切読まない。これによりユーザーの編集中文書状態が「クリーンアプリ」配布物へ漏洩しない。コード読解に加え、`outerHTML` の getter を罠に仕掛けた専用テストが「読まれないこと」を実証（`outerHtmlRead === false`）。CR-010 §2 Part 2 / §6 の中核受入基準を満たす。
- **共有可変状態なし**: 各クリックは独立した fetch であり、破壊しうる共有状態を持たない。await 跨ぎの競合なし。

### R5 性能 — PASS

- `cache: 'no-store'` は「最新の配信 HTML を取得する」という要件に合致した意図的選択（キャッシュ済み旧版でなく素のアプリを配布）。
- 単発 fetch、ループ内 I/O なし。object URL は `setTimeout(…, 0)` で確実に `revokeObjectURL`——リーク防止。単一 HTML 全体をテキスト化する点はワンショットのダウンロード用途として妥当（ストリーミング化は不要, NFR 非該当）。

### セキュリティ横断 — PASS

- 取得は同一オリジンの `location.href` の再取得であり新たな攻撃面を増やさない。ダウンロード物は現ページで描画されず保存のみのため XSS 面なし。Blob は `text/html`・固定ファイル名 `gr-scheduler.html`。
- 失敗通知は `aria-live="polite"` 領域へ **`textContent`** 経由（`innerHTML` 不使用）で、通知文は静的リテラル（en/ja）——注入面なし。`anchor.rel = 'noopener'` も設定済み。

### R6 テスト品質（比例的に確認） — 良好

- 4 ケース（正常, outerHTML 罠, not-ok, reject）で正常系・境界・異常系を網羅。罠テストは「DOM を直列化しない」というコア契約を実挙動で検証しており、モック過剰ではなく本質を突いている。失敗パスが throw せず `false` を返すことを明示検証。テスト名が意図（前提→操作→期待）を表現。

---

## 指摘対応テーブル

| # | 重大度 | 観点 | 箇所 | 問題 | 影響 | 修正案 | 対応 |
|---|--------|------|------|------|------|--------|------|
| L-1 | Low | R4/POLA | `src/app/main.ts` 失敗通知 | 失敗時の通知文が「オフラインでは利用できません」固定だが、`downloadDeliveredApp` はオンラインの `!response.ok`（404/500 等）でも `false` を返し同じ文言を表示する。この場合「オフライン」という表現は厳密には不正確。 | 実害なし（機能は劣化せず、ユーザーは既にファイルを保有）。まれな配信側エラー時に文言がやや実態とずれるのみ。 | 通知文を「取得に失敗しました（このファイルは既にお手元にあります）」等、原因非依存の中立表現にする。CR-010 §7 で「失敗時 UI 通知は実装フェーズで確定」とされた範囲内の軽微調整。 | 記録のみ（据置き可） |
| L-2 | Low | R4 | `help-modal.ts` / `main.ts` ダウンロードボタン | fetch 完了前の連打で複数の並行ダウンロードが起動しうる（in-flight ガード・押下中 disable なし）。 | 冪等（同一配信物の再取得のみ）で共有状態を破壊せず実害なし。UX 上の細部のみ。 | 任意: fetch 中はボタンを一時 disable、または in-flight フラグで多重起動を抑止。YAGNI 的には現状可。 | 記録のみ（受容可） |

いずれも Low であり、ゲート要件（Critical/High=0）に影響しない。L-1/L-2 は orchestrator の裁量で「据置き」または「受容」として対応記録を残せば足りる。

---

## ルーティング

FAIL 指摘なし。戻し不要。develop への統合可（review-agent PASS 条件成立）。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-21 | 1.0 | 初版（CR-010 実装レビュー。R2-R5 セキュリティ重点。PASS, Critical/High=0, Low 2） | review-agent |
