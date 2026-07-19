# R1 レビュー報告 - gr-scheduler 要求仕様 (StrictDoc)

- 対象: `docs/spec/*.sdoc` (00-overview / 01-stakeholder / 02-usecases + 12 ドメイン文書) と `docs/spec/gr-scheduler-grammar.sgra`
- 観点: R1 (R1a 要求構造品質 + R1b 要求表現品質) + user-order.md 網羅トレーサビリティ独立監査
- 基準: `process-rules/review-standards.md` R1、CLAUDE.md 品質目標 (レビュー指摘 Critical:0 / High:0)
- 実施日: 2026-07-18 / 実施: review-agent
- 参照した正: `user-order.md` (62 項目 + サブ項目) を要求の Single Source of Truth とする

---

## 1. 総合判定

**VERDICT: PASS**

- Critical: **0**
- High: **0**
- Medium: **2**
- Low: **4**

合格基準 (Critical=0 かつ High=0) を満たす。Medium/Low 指摘は §5 の指摘対応テーブルで対応記録を要する（フェーズ遷移はブロックしない）。

### 機械検証の結果

| 検証 | 結果 |
|---|---|
| `strictdoc export docs/spec` | exit 0 / エラー 0（全 15 文書 publish 成功） |
| Parent/Child 関係の解決 | 全解決（dangling relation なし。未解決があれば strictdoc が非 0 終了する） |
| UID 重複 | なし（総数 126 / ユニーク 126） |
| フィールド順序 (UID,TYPE,PRIORITY,LAYER,WCAG,I18N,TITLE,STATEMENT,RATIONALE,VERIFICATION) | 全 REQUIREMENT で文法準拠 |

---

## 2. トレーサビリティ独立監査（最重要）

coverage 制御文書を信用せず、各 .sdoc を直接読み合わせて user-order.md 全項目の被覆を独立検証した。

### 2.1 未被覆項目

**なし（uncovered = 0）。** user-order.md の 1〜62（サブ項目 6.1-6.6 / 17.1-17.24 / 26.1-26.3 / 33.1 / 34.1-34.3 / 39.1 / 59.1-59.3 / 60.1-60.6 を含む）すべてが 1 つ以上の要求で被覆されている。

代表対応（抜粋）:

| user-order | 被覆要求 UID |
|---|---|
| 1 / 2 | CANVAS-L1-001 / CANVAS-L1-002, ITEM-L1-001 |
| 3 / 5 / 12(★) | ALIGN-L1-001 / ALIGN-L1-002 / ALIGN-L1-003, ALIGN-L2-002 |
| 6(★★) / 6.1 / 6.2(★★) / 6.3(★★) | CANVAS-L1-003 / CANVAS-L1-003 / TOOL-L1-001 / TOOL-L1-002 |
| 6.4-6.6 | NFR-L1-003 / NFR-L1-004 / NFR-L1-005 |
| 7-11 / 14-15 / 22-23 | ITEM-L1-002..006 / ITEM-L1-007, ITEM-L1-008, ITEM-L2-001 / ITEM-L1-009, ITEM-L1-010 |
| 16-21 | PROP-L1-001..006 (+ NFR-L1-006) |
| 17.1-17.24 (24 プロパティ) | PROP-L1-002（表 18 フィールド。label_position の 6 値展開で 24 に一致。§4.3 参照） |
| 24-25 / 26 (26.1-26.3) | CANVAS-L1-004, CANVAS-L1-005 / ZOOM-L1-001（3 段階） |
| 27-33 / 33.1 | CURS-L1-001..007 / CURS-L2-001 |
| 34 / 34.1 / 34.2 / 34.3 | DEP-L1-001 / DEP-L1-002 / DEP-L1-003, DEP-L2-001 / DEP-L2-002 |
| 35-39(★) / 39.1 / 40 | SECT-L1-001..005 / SECT-L1-005 / SECT-L1-006, CANVAS-L1-006 |
| 41 / 42 / 43 / 44 | CANVAS-L1-007 / IO-L1-002 / IO-L1-001 / IO-L1-003 |
| 45 / 46(★) / 47 / 48 / 49-50 / 51 / 52 | ZOOM-L1-002 / ZOOM-L1-003 / ZOOM-L1-004 / ZOOM-L1-005 / CANVAS-L1-008, CANVAS-L1-009 / CANVAS-L1-010 / CANVAS-L1-011, ZOOM-L1-006 |
| 53 / 54-57 / 58 | TOOL-L1-005 / PLAN-L1-001..004 / TOOL-L1-006 |
| 59 / 59.1 / 59.2 / 59.3 | TOOL-L1-007 / TOOL-L2-001 / TOOL-L2-002 / TOOL-L2-003 |
| 60 / 60.1-60.6 / 61 / 62 | NFR-L1-009（表に 6 拡張列挙） / NFR-L1-007 / NFR-L1-008 |

### 2.2 ★ / ★★ 追加要望・モックフィードバックの反映確認

| 由来 | 要求 | 反映 |
|---|---|---|
| ★ item12 ドラッグ→プロパティ同期 | ALIGN-L1-003 + ALIGN-L2-002（往復写像・丸め誤差なし） | OK |
| ★ item36-39 セクション/小タブ | SECT-L1-002..005 | OK |
| ★ item46 異方性ズーム（縦のみ/横のみ） | ZOOM-L1-003 | OK |
| ★★ item6/6.1/6.2/6.3 最大化/最小ヘッダー/フローティング/フォント | CANVAS-L1-003, TOOL-L1-001, TOOL-L1-002 | OK |
| mock: 依存線の矢じり最小サイズ | DEP-L1-004 | OK |
| mock: 依存線端が 9 点アンカーに接続 | DEP-L1-002（許容誤差 1px、移動追従を明記） | OK |
| mock: デュアルカーソル primary/secondary、日数を secondary 上部に表示 | CURS-L1-002（明示済み） | OK |
| mock: 角丸 R がズーム非依存 | CURS-L2-001（スクリーン空間固定 px） | OK |
| mock: 左ペイン幅可変・階層はインデント | CANVAS-L2-001 + SECT-L2-001 | OK |

### 2.3 user-order に直接対応しない要求（派生要求の妥当性）

以下は user-order の明示項目ではないが、確定事項・セキュリティ・性能からの派生として正当。孤立要求ではない。

| UID | 派生根拠 |
|---|---|
| NFR-L1-001 | item4（単一 HTML）+ 確定事項（外部 CDN 依存禁止） |
| NFR-L1-002 | STK-L0-017 性能（確定事項: 中規模 50 行/1000 アイテム） |
| IO-L1-004 / IO-L1-005 | 確定事項（ファイル I/O + localStorage 自動保存/復旧） |
| IO-L1-006 / ITEM-L2-001 | 00-overview 前提（Import は信頼できない入力）+ OWASP Top 10 |
| TOOL-L1-004 | Undo/Redo（STK-L0-008 に内包、パワポ代替の前提） |

すべて RATIONALE で派生根拠を明示しており、正当化なしの孤立要求は **0 件**。

---

## 3. 文書別ノート

| 文書 | 所見 |
|---|---|
| 00-overview | 背景・範囲・用語・参照規格・表記規約・EARS/MoSCoW 定義が整備され前付けとして十分。§3.4 の文書一覧に **`19-watermark-shortcuts`** とあるが実ファイルは `19-tools-watermark`（→ M2）。改訂履歴が「61 項目」と記載（→ L1）。 |
| 01-stakeholder (L0) | STK-L0-001..022、EARS・MoSCoW 準拠。全 22 件が 1 つ以上の子要求を持つ。RATIONALE の user-order 参照番号が旧 61 項目版基準で現行 62 項目版と不一致（→ M1）。STK-L0-019 の STATEMENT がセンターホイールを含むが同機能の子は STK-L0-002 側（→ L2）。 |
| 02-usecases | UC-001..010、UseCase 型で L0 へ Parent。主フロー/事後条件あり。Import 系（UC-008）に異常データ拒否の代替動作を明記。E2E/受入への橋渡し良好。 |
| 10-canvas-view | CANVAS-L1-001..011 + L2-001/002。1 画面俯瞰・固定ペイン・連動スクロールを縦=連動/横=独立と明確化。CANVAS-L1-003（ヘッダー最小高さ）は VERIFICATION 未設定・定量基準なし（→ L4）。 |
| 11-items-icons | ITEM-L1-001..010 + L2-001。既定図形を機械可読キー（circle 等）へ写像。インポート検証（ITEM-L2-001）で XXE/スクリプト除去を規定。user-order 参照は現行番号で正確。 |
| 12-properties-i18n | PROP-L1-001..006。24 プロパティを 18 フィールド + label_position 6 値として整理し RATIONALE で計数根拠を明示。フィールドキー英語固定/ラベル多言語の区別が明確。 |
| 13-layout-alignment | ALIGN-L1-001..003 + L2-001/002。双方向同期を往復写像として L2 で詳細化。導入文と ALIGN-L1-003 RATIONALE が「item11」を引用するがドラッグ同期は現行 item12（→ M1）。 |
| 14-zoom-lod | ZOOM-L1-001..006 + L2-001 + L3-001。LOD を重要度閾値の単調性（L3）まで分解。異方性ズームを明記。参照番号は現行で正確。 |
| 15-classification-sections | SECT-L1-001..006 + L2-001。★セクション/小タブ/水平線非肥大を制約として明記。階層はインデント表現（mock 反映）。参照番号は現行で正確。 |
| 16-dependencies | DEP-L1-001..004 + L2-001/002。9 点アンカー座標表・直交配線・折れ点 0-3・矢じり最小を網羅。導入文で「item33 = coverage の item34 系列」と番号差を明示的に整合（好例）。 |
| 17-cursors-comments | CURS-L1-001..007 + L2-001。primary/secondary・日数表示位置・角丸ズーム非依存を mock 通り明記。参照番号は現行で正確。 |
| 18-plan-actual | PLAN-L1-001..004 + L2-001。イナズマ線の頂点算出を L2 で単体テスト可能に詳細化。参照番号は現行で正確。 |
| 19-tools-watermark | TOOL-L1-001..007 + L2-001..003。ショートカット割当表・透かし内容/配置/切替を具体化。参照番号は現行で正確。ファイル名は 19-tools-watermark（overview の記載と不一致 → M2）。 |
| 20-io-interop | IO-L1-001..006。JSON 往復整合・MSPDI・SVG・localStorage・XXE/innerHTML 禁止を規定。派生（保存/検証）に根拠明記。 |
| 25-nfr-a11y | NFR-L1-001..009。性能を定量（60fps/1.5s、目標付き）、WCAG 2.1 AA、CUD、言霊、将来拡張（Wont）を整理。 |

---

## 4. R1 チェック結果サマリ

### 4.1 R1a 要求構造品質

- ID 付与: 全要求に UID（126 件ユニーク）。層命名 `<ドメイン>-<層>-<連番>` 一貫。**OK**
- 矛盾: 同一操作に競合する結果の定義なし。既定ズーム俯瞰（CANVAS-L1-001）と拡大時スクロール（CANVAS-L1-008）は条件が排他で矛盾なし。**OK**
- ユースケース: UC-008/UC-010 等に異常系（破損データ拒否・復旧確認）あり。**OK**
- NFR 定量: NFR-L1-002（60fps / 1.5s）、DEP（誤差 1px、折れ点 0-3）等、測定可能。**OK**
- エンティティ/操作名の一貫: item / milestone / task / section / anchor / dual-cursor 等、用語集（00 §4）と整合。**OK**
- 用語集: 00-overview §4 に主要語を定義。**OK**
- Parent 妥当性: 全 L1→既存 L0(001-022)、L2→L1、L3→L2。dangling 0。**OK**
- MoSCoW: Must=MVP 必須、Wont=item60 将来拡張のみ、Could=item62 提案。妥当。**OK**

### 4.2 R1b 要求表現品質

- EARS: L1 以下は主語明示・能動態・単一・検証可能。Event/State/Unwanted パターン適用（例: ITEM-L2-001「もし…場合」、CANVAS-L1-008「…超えた場合」）。**OK**
- 否定形: 「太くしない」(SECT-L1-005)「原色を用いず」(PROP-L1-006) 等は代替動作（小タブ増加・CUD 調整色）を併記。**OK**
- 曖昧表現: 「極力避ける」(DEP-L1-003)「認識できる最小」(DEP-L1-004) は VERIFICATION で操作的基準に落として緩和。CANVAS-L1-003「視認できる範囲で最小の高さ」のみ検証未設定（→ L4）。
- テスト可能性: 大半に VERIFICATION あり（受入・単体レベルの判定基準）。**概ね OK**
- 命名（言霊）: フィールドキー（abbreviation/start_date/plan_actual_kind 等）・図形キー（circle/chevron 等）に汎用語なし。NFR-L1-007 で自己制約。**OK**
- DRY: TOOL-L1-002 が STK-L0-022 とほぼ同文（L1 が L0 をほぼ複写）。L1 に定量・一貫適用の付加はあるが冗長（→ L3）。

### 4.3 24 プロパティ被覆の精査

user-order item17.1-17.24 を PROP-L1-002 の表（18 フィールド）へ突き合わせた結果、24 サブ項目すべてが被覆（label_position=表示位置 に auto/center/top/bottom/right/left の 6 値を集約）。**漏れ 0**。RATIONALE に計数根拠が明記されており、24→18 の差は説明済みで矛盾なし。

---

## 5. 指摘対応テーブル

Critical/High は **0 件**。以下は Medium/Low（フェーズ遷移非ブロックだが対応記録が必要）。

| # | 重大度 | 観点 | ファイル / UID | 指摘 | 影響 | 修正案 | 対応 |
|---|---|---|---|---|---|---|---|
| M1 | Medium | R1a 一貫性 | 01-stakeholder（STK-L0-002/004/005/006/007/008/009/010/011/012/013/016/018/019/020）, 13-layout（導入文・ALIGN-L1-003） | RATIONALE 内の user-order 参照番号が旧 61 項目版基準で、現行 62 項目版と多くが 1 ずれ（例: L0-012「item26-32」→ 実 item27-33、L0-011「item53-56」→ 実 item54-57、13-layout「item11」→ ドラッグ同期は item12）。11/14/15/17/18/19/20/25 は現行番号で正しく、16 は「item33=coverage item34」と整合済みで、文書間で番号基準が混在。 | 被覆自体は完全（coverage 制御文書は現行番号で正）。ただし仕様内参照が SoT(user-order.md) と不一致で、以後の変更管理・追跡で誤解を招く。 | 全 .sdoc の user-order 参照を現行 62 項目版へ正規化する。一括が困難なら 00-overview に旧→新の対応注記を 1 箇所設け、各 RATIONALE は現行番号へ更新する。 | 未対応（起票） |
| M2 | Medium | R1a 一貫性 | 00-overview §3.4 文書構成 | 文書一覧が `19-watermark-shortcuts` と記載するが、実ファイル/タイトルは `19-tools-watermark`（透かし＋ショートカット＋パレット透明化＋Undo/Redo を包含）。 | ナビゲーション/参照時に存在しないファイル名を指し、読者・後続エージェントを誤導する。 | §3.4 の該当行を `19-tools-watermark`（内容: 透かし・ショートカット・パレット透明化・Undo/Redo）に修正する。 | 未対応（起票） |
| L1 | Low | R1a 一貫性 | 01-stakeholder 冒頭 TEXT / 00-overview §8 改訂履歴 | 「user-order.md（★追加要望反映版・61 項目）」と記載するが現行は 62 項目。 | 版数の食い違い。実害小だが M1 と同根。 | 「62 項目」に更新（M1 と同時対応）。 | 未対応（起票） |
| L2 | Low | R1a 一貫性 | 01-stakeholder / STK-L0-019 | STATEMENT が「センターホイールで拡大縮小」を含むが、同機能を詳細化する子は STK-L0-002 配下の ZOOM-L1-002 で、STK-L0-019 には対応する子がない。 | センターホイールの帰属 L0 が STATEMENT と Parent 構造で食い違う（被覆は ZOOM-L1-002 で確保、機能欠落ではない）。 | STK-L0-019 STATEMENT からセンターホイール記述を除き（帰属は STK-L0-002）、パレット透明化＋マウスパンに絞る。RATIONALE の item 番号も M1 に合わせて是正。 | 未対応（起票） |
| L3 | Low | R1b DRY | 19-tools / TOOL-L1-002 | STATEMENT・RATIONALE が STK-L0-022 とほぼ同文で、L1 が L0 を複写。 | 二重管理による将来の不整合リスク（軽微）。 | L1 は L0 を要約せず差分（全表示要素への一貫適用の検証条件等）に集中させる。 | 未対応（起票） |
| L4 | Low | R1b 検証可能性 | 10-canvas / CANVAS-L1-003 | 「ヘッダー領域は…視認できる範囲で最小の高さ」に定量基準・VERIFICATION がない。 | 「最小」の判定が主観的で受入時に合否が割れうる。 | VERIFICATION を追加し、既定フォントで年月日曜が 1 行表示できる最小高さ、または上限 px 等の測定可能な代理指標を規定する。 | 未対応（起票） |

---

## 6. FAIL 時ルーティング（参考）

本レビューは PASS のため戻し不要。仮に Critical/High が生じた場合、R1 指摘は planning 相当（仕様書 Ch1-2 = L0/L1 要求）へ戻す。

---

## 7. 結論

要求構造（UID・層・Parent トレース・MoSCoW）と表現（EARS・命名・検証可能性）はいずれも R1 基準を満たし、strictdoc は exit 0、UID 重複・dangling relation なし。user-order.md 全 62 項目＋サブ項目の被覆に **漏れなし**、正当化なしの孤立要求なし、★/★★・モックフィードバック項目もすべて反映済み。**Critical=0 / High=0 につき VERDICT: PASS。** Medium 2 件・Low 4 件は主に「仕様内 user-order 参照番号の版ずれ」と「overview の文書名不一致」で、いずれも被覆・機能には影響しない文書一貫性の是正であり、次フェーズと並行して対応可能。
