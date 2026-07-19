# M5a セキュリティレビュー (敵対的レビュー) — data-import / sanitizer / persistence

- 文書ID: SEC-SCAN-M5a-001
- 種別: security-scan-report (敵対的コードレビュー)
- 対象: `src/domain/usecase/import-sanitizer.ts`, `json-codec.ts`, `mspdi-codec.ts`, `src/adapters/io/{import-service,file-io,autosave}.ts`, `src/domain/usecase/svg-exporter.ts`
- 基準: SEC-DESIGN-001 (C-01..C-20 / ST-01..ST-15), OWASP Top 10 (2021), CWE/SANS Top 25
- レビュア: security-reviewer (AI)
- 日付: 2026-07-18
- テスト: `npm run test` → 18 files / 137 tests **PASS**

> **重要 (人間による最終確認の推奨):** 本レビューは AI による補助的検査である。SVG サニタイズ実装
> (自前トークナイザ) と CSP の実機検証は、リリース前に人間のセキュリティ専門家が行うことを強く推奨する。

## 総合判定: **PASS** (Critical: 0 / High: 0)

| 深刻度 | 件数 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 4 |

M5a の信頼境界 (未信頼 Import → モデル/DOM) は堅牢に実装されている。具体的なスクリプト実行
バイパスは構築できなかった。ただし後述の Medium (自前サニタイザ採用・CSP 不在・色値未検証) は
リリース前に是正すべき防御多層化のギャップである。

---

## 1. 脅威別評価

### 1.1 SVG サニタイザのバイパス試行 (§3.2 / C-03/C-04)
- 実装は **DOMParser ではなく自前の文字列トークナイザ** (`tokenizeSvg`) + 許可リスト再直列化。
- 再直列化の安全性を分析した結果、**出力にスクリプト/`on*`/`foreignObject` が残ることはない**:
  - 要素名は許可リスト (`SVG_ELEMENT_ALLOWLIST`) に一致するもののみ出力。`script`/`foreignObject`/`a`/`style` は非許可 → サブツリーごと破棄 (`serializeSafe` L542)。
  - 属性名を小文字化し `on*` を全削除 (`filterAttributes` L376)。属性を出力するには `name=value` 形式でパースされ、かつ名前が `on` で始まらない必要があり、`on*` ハンドラは構造的に出力不能。
  - 属性値は `escapeXmlAttribute` で `& < > "` をエスケープ (常に二重引用符で出力) → 値からの属性ブレイクアウト不可。
  - テキストノードは `escapeXmlText` でエスケープ → マークアップ注入不可。
  - `javascript:` は値レベルで削除 (L381)。エンティティ難読化は `decodeEntities` で復号後に判定 (テスト「entity-obfuscated」で被覆)。
- **試行したバイパスと結果 (いずれも実行に至らず):**
  - `OnLoad`/大文字・名前空間 `on*` → 小文字化削除で無効化。
  - 属性値内 `>` によるタグ境界混乱 (例 `<rect fill="a>onload=alert(1)">`) → トークナイザが誤パースするが、余剰片は**エスケープ済みテキストノード**になり実行しない (下記 M-3 の脆弱性は「壊れるが安全」)。
  - `<image href="data:image/svg+xml;base64,...">` (入れ子 SVG) は許可されるが、消費経路が `<image>` (非スクリプト画像コンテキスト) のため実行不能 (下記 L-2)。
- **消費経路の確認 (最重要):** サニタイズ済み SVG は `svgToDataUri` で `data:image/svg+xml;base64,...` 化され、`ImportedAsset.sanitizedDataUri` として保持。唯一の描画消費者は **svg-exporter の `<image href="data:...">`** (L146) のみ。ライブキャンバス (`svg-renderer.ts`) は現時点で Import アセットを **インライン SVG として注入しない** (grep で `sanitizedDataUri` 消費なしを確認)。SVG-as-image は仕様上**非スクリプト**であり、万一サニタイザに穴があっても実行に至らない多層防御になっている。

### 1.2 XXE / XML (§3.4 / C-07/C-08)
- MSPDI は **XML パーサを一切使わず正規表現抽出** (`firstTagText`/`allTagBlocks`) で処理し、`rejectXmlDoctype` で `<!DOCTYPE`/`<!ENTITY` を**パース前に文字列拒否**。エンティティを解決する主体が存在しないため **XXE / billion-laughs は構造的に不成立** (設計の DOMParser 依存より更に安全側)。
- DOCTYPE 検出は `/<!DOCTYPE/i` `/<!ENTITY/i`。XML 仕様上 `<!` と `DOCTYPE` の間に空白は挿入不可のため回避不能。仮に検出漏れがあっても、後段でエンティティ展開する処理が無い。
- SVG 経路も `sanitizeSvg` 内で同関数を通し、トークナイザは `<!...>` を宣言としてスキップ (展開しない)。

### 1.3 JSON プロトタイプ汚染 (§3.3 / C-06)
- `safeJsonParse` の reviver が `__proto__`/`constructor`/`prototype` を全ノード (入れ子・配列含む) で `undefined` 化。`JSON.parse` は `__proto__` を own プロパティとして生成し reviver で削除されるため `Object.prototype` は汚染されない (標準的な正しい緩和)。
- 後段 `migrateToCurrent` の spread は既に無害化済み値のみ展開。`Object.assign(target, untrusted)` の全展開は不使用。汚染再導入経路なし。
- 深さガード `assertJsonDepth` (上限 64) はパース後に走査、ガード自体の再帰も 65 で打切りスタック安全。

### 1.4 PNG (§3.5 / C-09/C-10)
- マジックバイト 8B + IHDR width/height (offset 16/20) を検証。`0 < w,h ≤ 4096` を強制、10MB 上限。拡張子偽装は import-service のバイトスニフ (`looksLikePng`) で防御。
- 不透明 `data:image/png;base64` として保持し復号しない。デコード後ビットマップは 4096²×4 ≈ 67MB に上界され解凍爆弾は限定的。

### 1.5 DoS 上限 (§3.6 / C-11)
- バイト上限は**全経路でパース前**に `assertWithinByteLimit` を最初に実行 (JSON L290 / MSPDI L270 / SVG L569 / PNG L218)。重い処理前の順序は正しい。
- ノード数 (SVG 5000)・ネスト深さ (64)・アイテム数 (20000) を各所で全か無かで強制。部分適用なし (`ImportRejectedError`)。

### 1.6 永続化 (autosave / localStorage §5 / C-15)
- `loadAutosavedDocument` は復元ペイロードを **`deserializeScheduleDocument` に通し未信頼として再検証** (byte→proto→depth→migrate→validate)。破損は `null` を返しサイレント破棄せず `warn` ログ。
- 書込は quota/無効ストレージ/プライベートモードを try/catch で捕捉し `failed` ステータスへ降格。堅牢。

### 1.7 注入シンク (grep 全 src)
- `innerHTML` は 2 箇所のみ (`property-panel.ts:64`, `main.ts:91`) いずれも `= ''` (空文字クリア、未信頼データ非接触)。
- `insertAdjacentHTML`/`outerHTML`/`eval`/`new Function`/`document.write`/`createContextualFragment` は **0 件**。
- ラベル/略称/透かしは全て `textContent` (left-pane) または `escapeSvg` (svg-exporter) 経由で inert 化。`setAttribute('href',…)` に未信頼値を渡す箇所なし (`<image href>` はサニタイズ済み data URI のみ)。

### 1.8 依存 (自己完結)
- `package.json` の runtime 依存は **0**。DOMPurify 等の新規追加なし。単一 HTML 自己完結性を維持。

---

## 2. コントロール適合表

| 控 | 状態 | 根拠 |
|----|------|------|
| C-01 innerHTML 未信頼禁止 | **満たす** | 使用 2 箇所とも `= ''` |
| C-02 安全描画 (textContent/escape) | 満たす (色値除く→L-1) | left-pane / svg-exporter |
| C-03 SVG script/on*/foreignObject 除去 | **満たす** | 許可リスト再直列化 + tests ST-01..04 |
| C-04 SVG 外部/javascript URL 除去 | **満たす** | `isSafeUrlValue`/値 javascript: 削除 |
| C-05 JSON スキーマ検証・拒否 | **満たす** | `validateScheduleDocument` (coerce せず reject) |
| C-06 プロトタイプ汚染防御 | **満たす** | reviver 全ノード削除 |
| C-07 XXE (DOCTYPE/ENTITY 拒否) | **満たす** | `rejectXmlDoctype` + パーサ不使用 |
| C-08 エンティティ展開 DoS | **満たす** | ENTITY 拒否 + 展開主体なし |
| C-09 PNG マジック+寸法 | **満たす** | `validatePng` |
| C-10 SVG/PNG 限定 | **満たす** | import-service バイトスニフ + reject |
| C-11 リソース上限 | **満たす** | byte/node/depth/item 全か無か |
| C-12 厳格 CSP | **未達 (M-2)** | index.html に CSP meta なし |
| C-13 script ハッシュ許可 | 未達 (M-2 関連) | ビルド未組込 |
| C-14 外部依存ゼロ | 満たす | vite-plugin-singlefile / runtime dep 0 |
| C-15 localStorage 復元再検証 | **満たす** | autosave が deserialize 再検証 |
| C-16/C-17 透かし | 部分 (M5b で完全配線) | 透かし文字列は `escapeSvg` 経由 |
| C-18 SCA | 該当なし | runtime dep 0 |
| C-19 シークレット | 満たす | ハードコード検出なし |

---

## 3. 指摘一覧

| # | 深刻度 | 箇所 | 内容 | 是正 |
|---|--------|------|------|------|
| M-1 | Medium | import-sanitizer.ts `sanitizeSvg`/`tokenizeSvg` | 設計 §3.2 は DOMParser + (推奨) DOMPurify だが **自前文字列トークナイザ**を採用。現状は消費経路が非スクリプト `<image>` のため実行不能だが、将来アセットをライブ SVG としてインライン注入すると脆弱化する潜在リスク。バイパスされやすいと設計自身が警告。 | DOMParser(`image/svg+xml`)ベースへ移行、または DOMPurify(svg profile)採用。少なくとも「アセットは data: URI/`<image>` 経由でしか消費しない」不変条件をテストで固定化。 |
| M-2 | Medium | index.html | 設計 C-12 の**厳格 CSP (特に `connect-src 'none'`) が未実装**。万一の XSS 時に外部送信を封じる最後の砦が欠落。build 後 script ハッシュ注入 (C-13) も未組込。 | リリース前に `<meta http-equiv="Content-Security-Policy">` を設計 §4 の内容で注入。ビルド後 SHA-256 自動注入で `'unsafe-inline'` 回避。 |
| M-3 | Medium | svg-exporter.ts L154-157, json-codec `validateItem` L156-157 | `fillColor`/`strokeColor` が `requireString` のみで**形式未検証** (設計 §3.1/C-02 は `#RRGGBB`/`rgb()`/パレットキー正規表現を要求)。引用符エスケープでブレイクアウトは不可だが、`url(http://evil)` 等の paint 参照を出力 SVG に注入でき、共有先で外部フェッチ (情報漏洩/ビーコン) の恐れ。 | Import 時に色値を正規表現検証し、不正は reject。 |
| L-1 | Low | import-sanitizer `SVG_ELEMENT_ALLOWLIST` | `image` 許可 + `isSafeUrlValue` が `data:image/svg+xml` を許可 → 入れ子スクリプト付き SVG data URI が残存しうる。現状は非スクリプト画像コンテキストで無害。 | `<image>` の data URI は PNG のみ許可、SVG 入れ子は不許可を検討。 |
| L-2 | Low | import-sanitizer `tokenizeSvg` L445 | 属性値内の `>` で `indexOf('>')` がタグを早期終了し誤パース。壊れるが inert (実行なし)。堅牢性/往復忠実度の問題。 | DOMParser 化 (M-1) で解消。 |
| L-3 | Low | import-sanitizer `validatePng` L233-237 | IHDR チャンク種別 (offset 12-16 の "IHDR") を未検証で offset 16/20 を width/height と仮定。非標準 PNG で誤読の可能性 (安全側だが堅牢性低)。 | offset 12-16 == "IHDR" を検証。 |
| L-4 | Low | import-sanitizer 属性名出力 L548 | 属性名は無エスケープ出力。名前に `"`/`<` を含む細工は XML パースエラーで描画失敗に留まる (実行不能) が、堅牢性の観点で属性名も許可リスト化が望ましい。 | 属性名の許可リスト/正規化。 |

---

## 4. 具体的バイパス PoC
**スクリプト実行に至る PoC は構築できなかった。** 試行 (§1.1) はいずれも「壊れるが安全 (fail-closed / inert)」で終息。M-3 の色値のみ、共有先での外部参照フェッチという限定的情報漏洩の余地があるが、`connect-src 'none'` CSP (M-2) を入れれば本アプリ内では封殺される (共有先の第三者環境では別途)。

## 5. 結論
M5a の信頼境界実装は**設計の主要コントロール (C-01..C-11, C-15, C-19) を満たし、判定は PASS**。
リリースゲート前に **M-1 (サニタイザ堅牢化)・M-2 (CSP)・M-3 (色値検証)** の是正を推奨する。特に M-2 CSP は
サニタイザの多層防御バックストップであり、優先的に導入すべき。SVG サニタイズと CSP は人間の
セキュリティ専門家による実機確認を推奨する。
