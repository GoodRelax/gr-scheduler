# レビュー報告: CR-009 実装レビュー（透かし既定パスワード変更 / UTC 常時付与 / 内容変更時の再採番）

- レビュー種別: 実装コードレビュー（R2 設計原則 / R3 コーディング品質 / R4 並行性・状態遷移 / R5 パフォーマンス）
- レビュー観点重点: **R4（セキュリティ・並行性）**
- 対象 CR: `project-records/change-requests/change-request-009-20260721-070348.md`
- 関連決定: DEC-005 #3（ScheduleStore コマンドスタック上での再採番）
- レビュー日: 2026-07-21
- レビュアー: review-agent
- 版: 1.0（初回レビュー）

---

## 1. 総合判定

**PASS**

- Critical: **0 件**（合格基準: 0）
- High: **0 件**（合格基準: 0）
- Medium: **0 件**
- Low: **3 件**（すべて記録／受容。フェーズ遷移をブロックしない）

品質ゲート（CLAUDE.md 品質目標）: Critical 0 / High 0 を満たす。フェーズ遷移可。

### ゲート数値（実測）

| ゲート | コマンド | 結果 |
|--------|----------|------|
| 型チェック | `npx tsc --noEmit` | **0 エラー**（EXIT 0） |
| 単体/結合テスト | `npx vitest run` | **71 ファイル / 686 テスト 全 green**（EXIT 0） |
| Lint | `npx eslint src tests` | **0 違反**（EXIT 0） |
| ハッシュ独立検証 | `printf '%s' 'GoodRelax' \| sha256sum` | `380e83c3…dc9c8ec3` = 定数と一致 |

---

## 2. 対象成果物

| 種別 | ファイル |
|------|---------|
| 実装 | `src/domain/model/schedule-model.ts`（`DEFAULT_WATERMARK_HIDE_PASSWORD_HASH`） |
| 実装 | `src/domain/usecase/watermark-builder.ts`（`resolveWatermark` / `formatWatermarkTimestampUtc`） |
| 実装 | `src/domain/command/schedule-store.ts`（`onContentChange` / `notifyContentChange`） |
| 実装 | `src/app/main.ts`（`wireWatermarkTimestamp` / `wireWatermark` / `adoptDocument`） |
| 実装 | `src/adapters/security/watermark-password.ts`（`sha256Hex` / `matchesWatermarkHidePassword`） |
| 実装 | `src/adapters/render/layers/watermark-layer.ts`（`WatermarkLayer.render`） |
| テスト | `tests/watermark-builder.test.ts` / `watermark-password.test.ts` / `command-history.test.ts` / `render-layers.test.ts` |

---

## 3. 明示的評決（フォーカス項目）

### 評決 (1) — password == brand-text（生パスワードが JSON に現れる件）: **受容可能（Low）／セキュリティ欠陥ではない**

**判定: 資格情報（クレデンシャル）は正しく保護されている。** `hideHash` フィールドに保持されるのは
SHA-256 ハッシュ（`380e83c3…dc9c8ec3`）のみで、独立検証（`sha256sum`）で `GoodRelax` の SHA-256 と
バイト一致することを確認した（`schedule-model.ts:495`）。平文パスワードフィールドは存在せず、旧ハッシュ
・旧平文 `watermark-unlock` は削除済み。テストが (a) 旧パスワードで解錠不可、(b) 旧平文がシリアライズ
出力に存在しないこと、(c) 空入力で解錠不可、を実証している（`watermark-password.test.ts:74-90, 106`）。

**平文 `GoodRelax` が JSON に現れる状況の評価:** これは `DEFAULT_WATERMARK_TEXT`（表示ブランド文字列、
`schedule-model.ts:484`）が既定パスワードと同一であるため、透かしの `userName`（＝**可視のブランド
テキスト**）として正当に出力へ現れるものである。すなわち「クレデンシャルの漏洩」ではなく「可視マーク
としての表示文字列」の出現であり、ユーザーが「パスワード＝ブランド文字列」を選んだ帰結である。

CR 受入基準 §6 は「生パスワード `GoodRelax` がモデル・出力のいずれにも現れず」と字義的に記述するが、
本 CR 自身がクライアント側の隠蔽ゲートを **「ソフト抑止のみ」**（DOM/HTML 直接編集で回避可）と明記し
（`watermark-password.ts:9-13`, security-design §6）、既定パスワードは **サーバー配備時ローテーション用の
公開値**として StrictDoc 仕様に記録される設計である（`schedule-model.ts:490-493`）。したがって既定
パスワードはそもそも秘匿対象ではなく、暗号的強制力も存在しない。この前提下で「hideHash はハッシュ
のみ保持」という受入意図は**完全に満たされている**。平文がブランドテキストとして現れることは**設計上
不可避かつ受容可能**であり、コード欠陥ではない。

**残る指摘（Low・記録のみ）:** 受入基準の文言が「hideHash はハッシュのみ保持（充足）」と「文字列
`GoodRelax` が一切出力に現れない（ブランドテキストとして現れるため不充足）」を区別していない。将来
ユーザーが可視ブランドと解錠パスワードを別値にしたい場合に備え、受入基準の文言を明確化すること（下記
Low-2）。

### 評決 (2) — watermark フィールドが完全欠落した文書を IMPORT した際の zoom で UTC が変わる件: **実在するが軽微（Low）**

**判定: 実在の逸脱だが、トリガーが狭く、アプリ自身の出力は免疫。修正推奨だが PASS をブロックしない。**

根本原因を確認した。`WatermarkLayer.render` は毎レンダーで `resolveWatermark(ctx.viewState.watermark)`
を呼ぶ（`watermark-layer.ts:21`）。`resolveWatermark(undefined)` は `Date.now()` を読む（`watermark-builder.ts:119-125`）。
`adoptDocument`（import 経路）は `store.replaceDocument` → `renderer.setDocument` を呼び、`setDocument` は
`this.viewState = { ...scheduleDocument.viewState }` で置換する（`svg-renderer.ts:397`）。取り込んだ文書の
`watermark` が欠落していれば `renderer.viewState.watermark` は `undefined` となる。再採番シード（`stampNow`）は
起動時 1 回と `store.onContentChange` 経由のみで発火し、**`replaceDocument` は onContentChange を発火しない**
（`schedule-store.ts:175-180`、テスト `command-history.test.ts:153-162`）。したがって import 後は再シードされず、
以降の zoom/scroll 再レンダーが毎回クロックを読み、UTC が変動する。これは CR 受入基準「ズーム／スクロール
のみでは UTC が更新されない」の字義的違反である。

**なぜ Low か:**
- **アプリ自身の出力は免疫。** 起動時（bootstrap）は `stampNow()` シードでマークを materialize し、
  export 経路も `resolveWatermark` で materialize してから保存する（`main.ts:1986-1988` の注記）。よって
  本アプリが出力・保存した文書を再取り込みしても `watermark` は常に存在し、影響しない。
- **トリガーが狭い。** `watermark` フィールドを**完全に欠く**手書き／レガシー JSON の import に限られる。
- **セキュリティ・データ破損なし。** マーク自体は正しく表示され、影響は「証跡時刻が受動閲覧中に進む」
  という表示・証跡精度の問題にとどまる。

**推奨修正（Low-1）:** `adoptDocument` にて `renderer.setDocument(...)` の直後に透かしを 1 回だけ materialize
する（例: `wireWatermarkTimestamp` のシードを import 後にも呼べるよう公開するか、`setDocument` 内で
`resolveWatermark` の結果を `viewState.watermark` へ焼き込む）。これで import 文書も bootstrap と同様に
zoom 不変となる。根治するなら、下記 Low-3（描画経路でクロックを読まない）を併せて解消するのが望ましい。

---

## 4. 指摘一覧

### R2 設計原則

- **命名（item60）: 良好。** `formatWatermarkTimestampUtc`、`notifyContentChange`、`ContentChangeListener`、
  `resolveWatermark` などドメイン限定で意図が叫んでいる。汎用語（`data`/`info`/`type`）なし。真偽値は
  `enabled`/`isWatermarkEnabled`/`canUndo`。English/ASCII 準拠。
- **SRP: 良好。** `StoreListener`（文書更新一般）と `ContentChangeListener`（内容変更のみ）を明確に分離し、
  「viewport 変更・file load を content change と扱わない」責務境界が型で表現されている（`schedule-store.ts:20-34`）。
- **CQS/POLA: 良好。** `dispatch` の no-op ガード（`executed === previous` / `next === previous`）が「変更が
  なければ履歴も通知もしない」を保証し、名前どおりの挙動。

### R3 コーディング品質

- **エラーハンドリング: 良好。** `matchesWatermarkHidePassword` は空入力で早期 `false`（`watermark-password.ts:47-49`）、
  hex 変換は `padStart(2,'0')` でゼロ詰め。`main.ts` の非表示は `void …then` で解決し、誤パスワード時は
  マークを可視のまま維持（握りつぶしなし、`main.ts:1516-1522`）。
- **防御的表示: 良好。** 透かしラベルは `textContent` で挿入され XSS ペイロードが不活性化される
  （`watermark-layer.ts:39`、C-17）。

### R4 並行性・状態遷移（重点）

- **再帰なし: 検証済み（PASS）。** 再採番は `store.dispatch` ではなく `renderer.setViewState` 経由で
  コマンドフロー外に書き込む（`main.ts:1546-1556`）。リスナーは dispatch しないため content change を
  再誘発せず、1 内容変更 → 厳密に 1 再採番。テスト `command-history.test.ts:164-180` が非再帰を実証。
- **発火条件: 検証済み（PASS）。** mutating dispatch / undo / redo のみ `notifyContentChange` を呼び
  （`schedule-store.ts:132,154,166`）、no-op dispatch・空スタック undo/redo・`replaceDocument` は発火しない。
  テスト `command-history.test.ts:112-162` が「1 回だけ発火／no-op で 0／replaceDocument で 0」を網羅。
  viewport（zoom/scroll）はストアを通らないため構造的に content change にならない。
- **状態一貫性（グリッチ）: 良好。** `stampNow` は `resolveWatermark` で全フィールド（enabled/userName/
  timestamp/hideHash）を materialize してから書き戻すため、シード後の描画経路は常に「保存済み値」を
  受け取り zoom/scroll をまたいで安定する（`main.ts:1547-1554`）。単一スレッド・同期のためレース無し。

### R5 パフォーマンス

- **タイル数の上界: 良好。** `MAX_TILES = 2000` のハード上限で巨大キャンバス／極小ズームでもノード爆発
  なし（`watermark-builder.ts:64,85-87`、テスト `watermark-builder.test.ts:50-53`）。
- **リーク観点: 問題なし。** `onContentChange` は unsubscribe を返し（`schedule-store.ts:105-110`）、
  テストで解除後不発を確認（`command-history.test.ts:182-193`）。`wireWatermarkTimestamp` はアプリ全体
  寿命のシングルトン購読のため解除不要。

---

## 5. 指摘対応テーブル（document-rules §9.3 / review-standards「レビュー指摘対応ルール」）

| ID | 重大度 | 観点 | 箇所 | 問題 | 影響 | 修正案 | 対応 |
|----|--------|------|------|------|------|--------|------|
| Low-1 | Low | R4/正当性 | `main.ts:1960-1971`（`adoptDocument`）＋`svg-renderer.ts:397` | `watermark` フィールドを完全欠落した文書を import すると再シードされず、`WatermarkLayer.render` が毎回 `resolveWatermark(undefined)` でクロックを読み、zoom/scroll で UTC が変動する。CR 受入「zoom で UTC 不変」の字義的違反 | 狭い（手書き/レガシー import のみ）。bootstrap・自アプリ export 文書は materialize 済みで免疫。セキュリティ・データ破損なし。証跡時刻が受動閲覧で進む表示問題 | `adoptDocument` の `renderer.setDocument(...)` 直後に透かしを 1 回 materialize（シードを import 後にも呼ぶ／`setDocument` 内で焼き込む） | **受容（据置き可）** — アプリ出力は免疫でトリガーが狭く PASS をブロックしない。次回の透かし関連改修時に Low-3 と併せ根治を推奨 |
| Low-2 | Low | 文書整合 | CR-009 §6 受入基準 vs `schedule-model.ts:484,495` | 受入基準「生 `GoodRelax` が出力に現れず」が「hideHash はハッシュのみ（充足）」と「文字列 `GoodRelax` が一切現れない（ブランドテキストとして現れ不充足）」を区別していない | 誤解のリスクのみ。実装は正しくクレデンシャルをハッシュ化保持 | 受入基準を「hideHash はハッシュのみで保持し、平文パスワードフィールドを持たない。可視ブランドテキストとしての `userName` 出現は別概念」と明確化 | **受容** — 実装意図は充足。ブランド＝パスワードはユーザー選択の帰結でセキュリティ欠陥ではない |
| Low-3 | Low | R2/CA・純粋性 | `watermark-builder.ts:118-125`（`resolveWatermark`） | ドメイン UseCase の関数が undefined 分岐で `Date.now()`（クロック）を直接読む。描画経路から呼ばれると Low-1 の根本原因になる | 設計上のにおい。JSDoc で明示済み。現状テスト・動作は正しい | クロックを引数注入するか、描画経路には常に materialize 済みの値を渡し `resolveWatermark` の undefined 分岐を描画から外す（Low-1 の根治と一体） | **受容** — CA 上の軽微な逸脱。Low-1 修正時に一体で解消を推奨 |

Critical / High の指摘なし（対応テーブルへの必須計上なし）。

---

## 6. 受入基準（CR-009 §6）との照合

| 受入基準 | 判定 | 根拠 |
|---------|------|------|
| 既定パスワードが `GoodRelax`（誤りでは非表示不可、正で非表示） | PASS | `watermark-password.test.ts:74-89`、`main.ts:1512-1522` |
| 生 `GoodRelax` がモデル/出力に現れず、hideHash に SHA-256 のみ保持 | **PASS（意図充足）** | hideHash はハッシュのみ（独立検証一致）。平文の出現は可視ブランドテキスト由来で別概念（評決1・Low-2） |
| 透かしに UTC 時刻（ISO8601・末尾 Z・分精度）を常時含む（空なし） | PASS | `watermark-builder.ts:100-102`、`watermark-builder.test.ts:65-83`、`render-layers.test.ts:137-139` |
| アイテム変更で UTC が変更直後の時刻へ更新 | PASS | `schedule-store.ts:132,154,166`、`main.ts:1546-1556`、`command-history.test.ts:112-128` |
| zoom/scroll のみでは UTC 不変 | **PASS（1 例外は Low-1）** | viewport はストアを通らず不発火。ただし watermark 欠落 import 文書のみ逸脱（評決2・Low-1） |
| 表示/非表示トグル単体では UTC 不変 | PASS | トグルは `renderer.setViewState` 直行でストア非経由（`main.ts:1495-1522`、`wireWatermark` JSDoc） |
| 単体 95%↑ / 結合 100% green | PASS | 686/686 green |

---

## 7. テスト品質（R6 参考所見）

本レビューは R2–R5 が主対象だが、テストが指摘の根拠として妥当かを確認した:

- ハッシュを**値でピン留め**（`watermark-password.test.ts:58-72`: 定数＝検証済みダイジェスト、かつ
  `sha256Hex(DEFAULT_WATERMARK_TEXT)` と一致、旧ハッシュ不一致）。
- **フォーマットを固定 instant で決定的に検証**（`watermark-builder.test.ts:102-114`、正規表現
  `UTC_MINUTE_ISO`）。クロック非依存でフレーキーでない。
- **再採番が内容変更ごとに厳密 1 回、viewport/トグル/replace/no-op で 0** を網羅
  （`command-history.test.ts:111-193`）。非再帰も明示テスト。

不足所見: watermark フィールド欠落 import 文書での zoom 不変を確認する統合/E2E テストは存在しない
（Low-1 のケース）。Low-1 修正時に回帰テストを追加することを推奨。

---

## Footer: 変更履歴

| 日付 | 版 | 変更 | 記録者 |
|------|----|----|--------|
| 2026-07-21 | 1.0 | 初回レビュー（PASS: Critical 0 / High 0 / Medium 0 / Low 3）。評決2件（password==brand=受容Low、absent-import zoom=Low）。ゲート: tsc 0 / vitest 686 green / eslint 0 / hash 一致 | review-agent |
