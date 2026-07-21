# レビュー報告: CR-004 実装レビュー（Pass A + Pass B）

- 対象: CR-004（表示・レイアウト・アイコン体系刷新）の実装
  - Pass A: 外部画像インポート撤去（Part 6a）+ `milestoneShape` enum 拡張（Part 6c）
  - Pass B: 描画/レイアウト（Part 1/2/3/4/5, 6b/6c 描画）
- 適用観点: R2（設計原則）, R3（コーディング品質）, R4（並行性・状態遷移／セキュリティ境界）, R5（パフォーマンス）
- レビュー種別: 初回実装レビュー（本 CR に対する再レビューではない）
- 実施者: review-agent
- 実施日: 2026-07-21
- 参照: `process-rules/review-standards.md`, `project-records/change-requests/change-request-004-20260721-070348.md`

---

## 総合判定: **PASS**

Critical 0 件 / High 0 件（フェーズ遷移の必須基準を満たす）。Medium 0 件。Low 4 件（すべて記録のみ、対応推奨）。

### 品質ゲート実測値（review-agent が自ら実行）

| ゲート | コマンド | 結果 |
|--------|----------|------|
| 型検査 | `npx tsc --noEmit` | **exit 0**（エラー 0） |
| テスト | `npx vitest run` | **65 files / 602 tests 全 green**（Duration 2.34s） |
| Lint | `npx eslint src tests` | **clean（違反 0）** |

CLAUDE.md 品質目標（レビュー指摘 Critical:0/High:0、規約準拠 違反0）を満たす。

---

## Focus 項目の検証結果

### 正確性（R2/R3）

- **サブレーン積み順反転の全単射性 — PASS**
  `layout-engine.ts:148-153`。`laneByItemId.set(itemId, laneCount - 1 - lane)`（`laneCount = laneEndX.length`）はレーン index 上の全単射。同一レーンの item は反転後も同一レーンに留まるため非重なり不変量は保存され、割当の起点のみ反転する。`laneCount > 1` ガードで単一レーン行は不変。Map の for-of 中の `set` は既存キーへの更新のみで反復は破綻しない（新規キー追加・削除なし）。`tests/layout-engine.test.ts:99-138` が「最初配置 item が最下段（最大index）」「後発マイルストーンが最上段 lane 0」「worldY 大小」を非空アサートで検証。**非重なり・全item一意**は `tests/layout-engine.test.ts:29-74` が検証。
- **Fit が +15% マイルストーンをクリップしない（DEF-006 回帰）— PASS**
  `viewport.ts:39-46` `renderedGlyphBottom` がマイルストーンで `centerY + milestoneIconHeightPx(h)/2 = worldY + 1.075h`（レーン下端から 0.075h の張り出し）を返し、`measureItemsFitExtent`（unit）と `measureRenderedContentBottomPx`（実 zoomY）双方がこれを採用。`computeFitViewForItems:531-545` の単調収縮リファイン（最大 4 pass）で実描画下端が縦バジェット内に収まるまで zoomY を縮小。`tests/cr004-render-geometry.test.ts:65-90` が最下段行マイルストーンで有限・正の zoomY を非空検証。
- **star 輪郭は fill_color 未指定時のみ no-fill — PASS**
  `item-layer.ts:334` `milestoneShape === 'star' && item.fillColorExplicit !== true` で fill=none / stroke=fillColor。`fillColorExplicit` は property-panel の塗り操作（`property-panel.ts:454`）でのみ true になる明示フラグであり、生成時（`editing-controller.ts:775`）は未設定＝輪郭、ユーザー塗り指定＝塗り、という仕様（Part 6b）と一致。既定 `fillColor=#0072b2`（`cud-palette.ts:47`）のため既定輪郭は可視。`tests/cr004-render-geometry.test.ts:133-141` が star が starPath であり diamond fallback でないことを検証。
- **特殊 7 glyph が例外を投げず diamond と判別可能 — PASS**
  `item-geometry.ts:325-356` の switch が 7 種を個別 path 生成、`EVEN_ODD_MILESTONE_SHAPES` で evenodd 指定。`tests/cr004-render-geometry.test.ts:143-166` が「各 path 非空・diamond 非一致・7種相互 distinct・evenodd 判定（base は nonzero）」を検証。
- **enum と code の schema↔conformance — PASS**
  `schema.json:152` milestoneShape=12値（base5+special7）、`:154` iconShapeKind=16値、`:69` `assigneeVisible: boolean`。`MILESTONE_SHAPE_KINDS`（12）は `tests/milestone-shape-enum.test.ts:58-89` が SSOT enum 包含と json-codec 往復（floppy）を検証。`tests/document-schema-conformance.test.ts` が SSOT とコード出力の突合を担保（602 内で green）。

### セキュリティ / 信頼境界（R4）

- **JSON/MSPDI 信頼境界は無傷 — PASS**
  `import-sanitizer.ts` は proto-pollution reviver（`safeJsonParse`、`FORBIDDEN_JSON_KEYS`）、深さガード（`assertJsonDepth`）、バイト上限（`assertWithinByteLimit`）、XML DOCTYPE/ENTITY 拒否（`rejectXmlDoctype`、XXE + billion-laughs）を保持。配線も維持: `json-codec.ts:444-446`（byte/parse/depth）+ `:397` item数上限、`mspdi-codec.ts:467-468`（byte/doctype）+ `:570` task数上限。画像経路（SVG allowlist / PNG magic/IHDR）は撤去され、サニタイザの責務が JSON/MSPDI に純化。
- **画像経路の残骸なし・悪用可能な残存なし — PASS**
  `import-service.ts` は JSON/MSPDI のみに routing、画像 import 参照なし。`schedule-model.ts` / `id-migration.ts` に `importedAssetId`/`asset` 残存なし。`import_icon` i18n キーは完全撤去（dangling 参照なし）。`tests/sanitizer-invariant.test.ts:13-37` が「renderer/exporter は `sanitizedDataUri` を一切参照しない」「`innerHTML`/`insertAdjacentHTML`/`outerHTML`/`DOMParser`/`document.write` 等の HTML インライン sink 不使用」というより強い不変量をソースレベルで固定。

### 並行性 / パフォーマンス（R4/R5）

- **+15% Fit 計測・担当者ジオメトリは O(items)・毎フレーム劣化なし — PASS**
  `renderedGlyphBottom`（O(1)/item）、`assigneeLabelGeometry`（O(1)/item）はいずれも定数時間追加。Fit は最大 6 回の全レイアウト（probe + measured + 最大4リファイン、各 O(n log n)）を要するがユーザー起点操作でありレンダーループ外。描画ホットパス（`item-layer.patchItemNode`）には O(items) 超の新規処理なし。共有可変状態・await 跨ぎ競合・状態遷移グリッチは本 CR の pure 追加分に存在しない（ドメイン計算はすべて side-effect free）。

---

## 指摘一覧

すべて Low（記録のみ、CLAUDE.md 品質目標では対応記録があれば据置き/受容可）。PASS を妨げない。

### L-1 (Low) `readFileAsBytes` がデッドコード
- 箇所: `src/adapters/io/file-io.ts:90-97`
- 問題: PNG magic-byte/寸法検証（撤去済み画像経路）専用の関数が、Part 6a 撤去後に唯一の定義のみで参照ゼロ（`grep -rn readFileAsBytes src tests` は定義行のみ）。export 済みのため eslint no-unused-vars に掛からない。R2.9 YAGNI / 撤去に伴う dead code。
- 影響: 保守性。将来 File→bytes の唯一の口として無警告で残り、撤去済み画像経路の再導入を誘発しうる。
- 修正案: `readFileAsBytes` を削除する。再ラスタライズ等で bytes が将来必要なら、その CR 時点で再導入する。

### L-2 (Low) 撤去済み画像経路を指す stale なドキュメントコメント
- 箇所: `src/adapters/io/file-io.ts:43`（`@param accept` の例 `image/png,.svg`）, `:85`（`Read a File's contents as raw bytes (for PNG magic-byte/dimension validation)`）
- 問題: Part 6a で撤去した画像 import を前提とする記述が JSDoc に残存。PIE（意図の明確化）に反し読者を誤誘導。
- 影響: 保守性（軽微）。
- 修正案: L-1 で `readFileAsBytes` を削除するなら :85 の JSDoc も同時に消える。`pickFile` の `@param accept` 例は `.json,.xml` のみへ更新する。

### L-3 (Low) 単一文字関数名 `n`（命名 = 言霊 / item60・R2.1）
- 箇所: `src/adapters/render/item-geometry.ts:359` `function n(value: number): string`
- 問題: 座標を 2 桁丸めして文字列化するヘルパーが `n` という無意味な汎用名。R2.1（命名は最重要 MUST）および CLAUDE.md item60（`type`/`value` 等の無意味語禁止）に照らし、役割を表さない。glyph path 内で約 40 回呼ばれ可読性への寄与はあるが、名前が「何をするか」を叫んでいない。
- 影響: 可読性（局所）。
- 修正案: `roundCoord2` もしくは `formatPathCoord` へ改名する（丸め桁と ASCII path 生成という意図を表す）。

### L-4 (Low) 担当者ラベルのボックス上端がレーン上端を約 0.105×laneHeight 超過
- 箇所: `src/domain/usecase/assignee-layout.ts:72`（`y = centerY - fontSizePx * 0.6`, font=0.55×laneHeight）
- 問題: ボックス下端はレーン中心以下に収まり `middle_left` 入線 stub とは非干渉（設計意図どおり、`tests/cr004-render-geometry.test.ts:117-125` で検証済み）。一方ボックス上端は `centerY - 1.1×0.55h = centerY - 0.605h` で、レーン上端（`centerY - 0.5h`）を約 0.105h 上回り、最上段レーンの item ではルーラー/上行側へわずかに食み出しうる。
- 影響: 表示（軽微・美観）。`assigneeVisible` は既定非表示（トグル配線は CR-006）のため現状ユーザーには露見しない。
- 修正案: フォント比 `ASSIGNEE_FONT_HEIGHT_RATIO`（0.55）と上寄せ量（0.6）を、ボックスがレーン帯内（上端 ≥ laneTop）に収まる値へ調整するか、CR-006 で担当者列を実配線する際に上端クリップの実挙動を live-verify して確定する。

---

## 指摘対応テーブル（document-rules §9.3 / review-standards「レビュー指摘対応ルール」）

| ID | 重大度 | 観点 | 箇所 | 対応 | 対応記録 |
|----|--------|------|------|------|----------|
| L-1 | Low | R2.9 YAGNI | file-io.ts:90-97 | 未対応（対応推奨） | 実装担当 or orchestrator がトリアージ。fixed / deferred / accepted を記録する |
| L-2 | Low | R2.15 PIE | file-io.ts:43,85 | 未対応（対応推奨） | 同上（L-1 と同時修正が自然） |
| L-3 | Low | R2.1 命名 | item-geometry.ts:359 | 未対応（対応推奨） | 同上 |
| L-4 | Low | R5/表示 | assignee-layout.ts:72 | 未対応（対応推奨） | CR-006 実配線時の live-verify で確定可 |

Low は「修正済み / 据置き / 受容済み」いずれも許容。フェーズ遷移には全 Low に対応記録があること（orchestrator が検証）。Critical/High が 0 のため本 CR は品質ゲートを通過する。

---

## 判定サマリ

- Critical: **0** / High: **0** / Medium: **0** / Low: **4**
- 総合: **PASS**
- 推奨戻り先: なし（PASS のため FAIL ルーティング不要）
- 補足: Focus に挙がった正確性・セキュリティ・並行性・性能の各点はすべて充足。DEF-007（base shape vocabulary drift）は追跡中の意図的決定であり不健全性なし。`assigneeVisible` 既定非表示、担当者ラベルをレーン中心上に置く決定はいずれも健全。
