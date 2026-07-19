<!-- ============================================================
     COMMON BLOCK | DO NOT MODIFY STRUCTURE OR FIELD NAMES
     ============================================================ -->

## Identification

<!-- FIELD: schema_version | type: string | required: true -->

<doc:schema_version>0.0</doc:schema_version>

<!-- FIELD: file_type | type: enum | required: true -->

<doc:file_type>risk</doc:file_type>

<!-- FIELD: form_block_cardinality | type: enum | values: single,multiple | required: true -->

<doc:form_block_cardinality>multiple</doc:form_block_cardinality>

<!-- FIELD: language | type: string (ISO 639-1) | required: true -->

<doc:language>ja</doc:language>

## Document State

<!-- FIELD: document_status | type: enum | values: draft,in-review,approved,archived | required: true -->

<doc:document_status>draft</doc:document_status>

## Workflow

<!-- FIELD: owner | type: string | required: true -->

<doc:owner>risk-manager</doc:owner>

<!-- FIELD: commissioned_by | type: string | required: true -->

<doc:commissioned_by>phase-planning</doc:commissioned_by>

<!-- FIELD: consumed_by | type: string | required: true -->

<doc:consumed_by>orchestrator, risk-manager</doc:consumed_by>

## Context

<!-- FIELD: project | type: string | required: true -->

<doc:project>gr-scheduler</doc:project>

<!-- FIELD: purpose | type: string | required: true -->

<doc:purpose>
planning フェーズ（仕様書 Ch1-2 承認 / spec-foundation・spec-architecture 主要ドメインの sdoc 化）完了時点で
プロジェクト全体のリスクを識別し、リスク台帳として一元管理する。スコア 6 以上のリスクは
orchestrator 経由でユーザーへ通知し、承認を得る対象とする。以降、各フェーズ開始時に本台帳を更新する。
</doc:purpose>

<!-- FIELD: summary | type: string | required: true -->

<doc:summary>
gr-scheduler（単一HTML・クライアント完結型・WYSIWYG マルチバー日程表ツール）の技術・外部・プロセスの
3 カテゴリで 18 件のリスクを識別した。うち 9 件（RISK-001〜008, RISK-018）がスコア 6 以上（対応必要）に
該当し、軽減策を定義した上でユーザー通知対象とする。特に RISK-001（性能）はスコア 9 のため、
プロジェクト継続可否について特に慎重な確認を要する。
</doc:summary>

## References

<!-- FIELD: related_docs | type: list | required: false -->

<doc:related_docs>
<doc:input>project-management/interview-record.md</doc:input>
<doc:input>docs/spec/00-overview.sdoc</doc:input>
<doc:input>docs/spec/01-stakeholder-requirements.sdoc</doc:input>
<doc:input>docs/spec/10-canvas-view.sdoc</doc:input>
<doc:input>docs/spec/11-items-icons.sdoc</doc:input>
<doc:input>docs/spec/13-layout-alignment.sdoc</doc:input>
<doc:input>docs/spec/14-zoom-lod.sdoc</doc:input>
<doc:input>docs/spec/16-dependencies.sdoc</doc:input>
<doc:input>docs/spec/20-io-interop.sdoc</doc:input>
<doc:input>docs/spec/25-nfr-a11y.sdoc</doc:input>
<doc:input>CLAUDE.md</doc:input>
<doc:ref>process-rules/full-auto-dev-document-rules.md</doc:ref>
</doc:related_docs>

## Provenance

<!-- FIELD: created_by | type: string | required: true -->

<doc:created_by>risk-manager</doc:created_by>

<!-- FIELD: created_at | type: datetime | required: true -->

<doc:created_at>2026-07-18T09:00:00Z</doc:created_at>

---

# gr-scheduler リスク台帳

## 0. 本書の位置づけ

本書は `project-records/risks/risk-register.md` として管理する統合リスク台帳である。個別リスクは
本書に統合し、原則として個別ファイル（`risk-{NNN}-{YYYYMMDD}-{HHMMSS}.md`）は作成しない
（本台帳を正とし、変更履歴は本書 Footer の change_log で追跡する）。ただし、単独で緊急報告が必要な
新規リスクが発生した場合は個別ファイルを作成した上で本台帳にも反映する。

各リスクは、識別されたカテゴリ（技術/外部/プロセス）と、`process-rules/full-auto-dev-document-rules.md`
§9.5 の risk Form Block 仕様（`risk:` 名前空間）に従う構造化フィールドを併記する。

## 1. リスク評価マトリクス（CLAUDE.md / 文書管理規則 §9.5 準拠）

スコア = 発生確率 (1-3) × 影響度 (1-3)

| 判定 | スコア | 対応 |
|------|:------:|------|
| 許容 | 1-2 | 記録のみ |
| 注視 | 3-5 | 軽減策を定義し監視 |
| 対応必要 | 6-9 | ユーザーに報告し承認を求める |

## 2. リスク台帳サマリー

| ID | カテゴリ | リスク概要 | 確率 | 影響 | スコア | 判定 | 対応方針 | オーナー | 状態 |
|----|---------|-----------|:---:|:---:|:---:|:---:|:---:|---------|:---:|
| RISK-001 | 技術 | SVG DOM 全面再描画による 60fps/1.5s 未達 | 3 | 3 | **9** | 対応必要 | 軽減 | architect, implementer | mitigated* |
| RISK-002 | 技術 | 単一HTML化によるアセット/フォントインライン肥大 | 2 | 3 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-003 | 技術 | 依存線自動配線（重なり回避+折れ点0-3）の実装難度 | 3 | 2 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-004 | 技術 | 異方性ズーム+LODの座標/表示モデル設計難度 | 2 | 3 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-005 | 技術 | MSPDI XML往復での非対応概念（マルチバー等）欠落 | 3 | 2 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-006 | 技術 | WCAG 2.1 AA達成困難（SVGキャンバスの操作性） | 3 | 2 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-007 | 技術 | 悪意あるインポート(SVG/XML/JSON)によるXSS/XXE等 | 2 | 3 | **6** | 対応必要 | 軽減 | security-reviewer | open |
| RISK-008 | 技術 | localStorage容量超過(約5MB上限)によるデータ損失 | 2 | 3 | **6** | 対応必要 | 軽減 | architect | open |
| RISK-009 | 技術 | 整列制約ソルバ(item3同一タイミング整列)の複雑性 | 2 | 2 | 4 | 注視 | 軽減 | architect | open |
| RISK-010 | プロセス | 将来拡張(item59/60)の設計余地確保によるMVP肥大 | 2 | 2 | 4 | 注視 | 軽減 | architect, orchestrator | open |
| RISK-011 | 技術 | 国際化: 多言語文字幅・フォント表示崩れ | 2 | 2 | 4 | 注視 | 軽減 | architect | open |
| RISK-012 | 外部 | ブラウザ間のSVG/File API/Clipboard API実装差異 | 2 | 2 | 4 | 注視 | 軽減 | implementer | open |
| RISK-013 | 外部 | 依存ライブラリ(Vite等)のEOL・破壊的変更 | 1 | 2 | 2 | 許容 | 受容 | license-checker | open |
| RISK-014 | 外部 | インライン化フォント/絵文字のライセンス・著作権問題 | 1 | 3 | 3 | 注視 | 軽減 | license-checker | open |
| RISK-015 | 外部 | MS Project側のMSPDIスキーマ仕様変更 | 1 | 3 | 3 | 注視 | 軽減 | architect | open |
| RISK-016 | プロセス | 未確定要求(item50初期テンプレート/item52ショートカット/i18n言語セット)による手戻り | 2 | 2 | 4 | 注視 | 軽減 | srs-writer, orchestrator | open |
| RISK-017 | プロセス | item61便利機能候補のトリアージ未決定によるスコープ不確実性 | 2 | 1 | 2 | 許容 | 受容 | orchestrator | open |
| RISK-018 | プロセス | 中規模データ(~1000アイテム)の性能テスト環境・データ未整備 | 2 | 3 | **6** | 対応必要 | 軽減 | test-engineer | mitigated |

**ユーザー通知対象（スコア 6 以上）: RISK-001, RISK-002, RISK-003, RISK-004, RISK-005, RISK-006, RISK-007, RISK-008, RISK-018（計 9 件）。RISK-001 はスコア 9 のため、CLAUDE.md「重要判断の基準」に基づき orchestrator は即座にユーザーへ報告し、プロジェクト継続可否の確認を求めること。**

**\* RISK-001 / RISK-018 の PoC 結果（2026-07-18, M1 ウォーキングスケルトンで実ブラウザ計測、ユーザー立会い）:**
目標規模（1000 アイテム / 50 行）で **初期描画 4.6ms（目標 ≤1500ms）、平均 162.3 FPS（目標 ~60）、p95 フレーム 6.20ms（予算 ~16.7ms）、実 SVG ノード 93（仮想化有効）** を計測し、NFR-L1-002 を **大差で達成**。RISK-001 は目標規模で mitigated とする。
残留: 10 倍規模（10000 アイテム）では平均 20 FPS・p95 66.7ms と目標未達だが、これは中規模スコープ外の**既知上限**であり、将来 item60（複数プロジェクト統合等）で大規模が必要になった場合にノード併合 LOD・超高密度域の Canvas フォールバック等を追加検討する（残留リスクとして受容）。RISK-018 はベンチ harness（`docs/dev/perf-benchmark.md`, `?bench=N`）整備により mitigated。

---

## 3. 個別リスクエントリ

### RISK-001: SVG DOM 全面再描画による 60fps/1.5s 未達（技術リスク・スコア9）

**Form Block**

```xml
<risk:id>RISK-001</risk:id>
<risk:probability>high</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>9</risk:score>
<risk:mitigation>
仮想化（画面外/非表示アイテムのDOM非生成・遅延生成）、ZOOM-L2-001/ZOOM-L3-001のLOD間引きに
よる描画対象削減、差分描画（変更差分のみDOMパッチ、requestAnimationFrameでバッチ更新）を
アーキテクチャの必須設計方針とする。design フェーズ最初期（詳細設計着手前）に、約50行/約1000
アイテム相当のダミーデータでズーム/パン性能PoCを実施し、60fps/1.5s目標の達成見込みを検証する。
PoCで目標未達の場合は、SVGレンダリング方式の見直し（レイヤー分割、CanvasやWebGLとのハイブリッド
描画等）をarchitectがdecisionとして記録し、ユーザーに再確認する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect, implementer</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（パフォーマンス）
- **対応方針:** 軽減
- **リスク記述:** NFR-L1-002（中規模データでの応答性能: 約50行/約1000アイテムで60fps ズーム/パン、
  初期表示1.5秒以内、PRIORITY: Must）を、vanilla TS + SVG DOM のみで満たせない可能性がある。
  SVGはDOMノードであり、多数ノードの座標変更・再描画（特に依存線の経路再計算を伴う場合）は
  ブラウザの再レイアウト/再ペイントコストが大きく、素朴な実装ではフレーム落ちが生じやすい。
- **トリガー/兆候:** 性能PoCでのフレームレート計測が60fpsを下回る。初期表示計測（DOMContentLoaded
  〜描画完了）が1.5秒を超える。実装後の性能テスト（RISK-018と連動）でNFR未達が判明する。
- **根拠:** `docs/spec/25-nfr-a11y.sdoc` NFR-L1-002、CLAUDE.md 品質目標「性能テスト: NFR数値目標を
  すべて達成」、`interview-record.md` §2「想定規模（性能NFR基準）」。
- **備考:** スコア9はエスカレーション区分「スコア9のリスクが発見された」に該当する。orchestrator は
  即座にユーザーへ報告し、プロジェクト継続可否（アーキテクチャ方針の見直しを含む）を確認すること。
- **ユーザー決定（2026-07-18, DEC-001）:** レンダリング方式は「SVG + ビューポート仮想化/LOD + 早期性能
  PoC」を承認（ADR-009）。性能PoCは Phase 4 M1 ウォーキングスケルトンの計測ゲートとする。残留リスクは
  PoC結果まで受容（open）。PoC未達時は Canvas 併用ハイブリッド等を decision として再記録しユーザーへ再確認。

---

### RISK-002: 単一HTML化によるアセット/フォントインライン肥大（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-002</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
フォントはサブセット化（実使用グリフのみ埋め込み）、絵文字/アイコンはSVGパスまたは最小限の
グリフセットに限定する。ビルド時ファイルサイズ予算（例: 5MB以内）を設定し、CI（GitHub Actions）
でビルド後.htmlサイズを計測・警告する。非表示要素（多言語リソース等）は可能な範囲で遅延パース
（初期不要データの遅延ロード）を検討する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（単一HTML制約）
- **対応方針:** 軽減
- **リスク記述:** NFR-L1-001（単一HTMLでの完全動作、外部CDN依存禁止）を満たすため、全JS/CSS/
  アセット・多言語フォント・絵文字をインライン化する。多言語対応（i18n有効）でフォントを
  フルセット埋め込みすると、.htmlファイルが数十MB規模に肥大し、ブラウザの初期パース時間が
  RISK-001のNFR-L1-002（初期表示1.5秒）を圧迫する。
- **トリガー/兆候:** vite-plugin-singlefile ビルド後の.htmlファイルサイズがサイズ予算を超過。
  初期表示計測が1.5秒を超える。
- **根拠:** `docs/spec/25-nfr-a11y.sdoc` NFR-L1-001、`interview-record.md` §2「技術スタック」
  （vite-plugin-singlefile）。

---

### RISK-003: 依存線自動配線（重なり回避+折れ点0-3）の実装難度（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-003</risk:id>
<risk:probability>high</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
DEP-L2-001（障害物回避直交配線）とDEP-L2-002（折れ点0-3制約）のアルゴリズムをdesignフェーズ
初期にPoC実装し、密配置・多重障害物等の悪条件データセットで単体テストを先行実施する
（DEP-L2-002 VERIFICATIONの検証手順を先行適用）。重なりゼロが幾何的に不可能な配置では
「重なりコスト最小化」フォールバック方針を設計文書に明文化し、期待値のブレをなくす。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（コアドメイン: 依存線自動配線）
- **対応方針:** 軽減
- **リスク記述:** DEP-L1-003/DEP-L2-001/DEP-L2-002 が要求する「9点アンカー間の直交経路探索
  ＋障害物回避＋折れ点0〜3」は、経路探索アルゴリズムとして実装難度が高く、密なレイアウトでは
  重なりゼロと折れ点上限を同時に満たせないケースが生じ得る。品質未達（重なり多発・折れ点超過）は
  一枚絵の可読性という製品コンセプトの根幹に関わる。
- **トリガー/兆候:** PoC/単体テストで重なりゼロ経路が生成できない配置が頻発する。折れ点数が
  3を超える経路が生成される。
- **根拠:** `docs/spec/16-dependencies.sdoc` DEP-L1-003, DEP-L2-001, DEP-L2-002、
  `interview-record.md` §3 コアドメイン3「依存線の自動配線」。

---

### RISK-004: 異方性ズーム+LODの座標/表示モデル設計難度（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-004</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
時間↔座標マッピングを縦(行方向)・横(時間軸方向)で独立したスケール変換として抽象化するADRを
designフェーズ初期に作成しレビューを受ける。ZOOM-L3-001（表示閾値の単調性）の単体テストを
実装より先に定義し、LOD切替のちらつき・逆転を防止する。丸角囲みR等のスクリーン空間固定要素
（ズーム非依存表示、item32.1）との整合をプロトタイプで早期検証する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（コアドメイン: 異方性ズーム+LOD）
- **対応方針:** 軽減
- **リスク記述:** ZOOM-L1-003（縦横独立の異方性ズーム）とZOOM-L1-005/ZOOM-L2-001/ZOOM-L3-001
  （重要度ベースのLOD間引き、閾値単調性）を同一の座標変換基盤の上で矛盾なく実現する設計は
  複雑度が高い。誤った抽象化を採用すると、実装後半での大規模な設計やり直し（コアドメインの
  作り直し）につながる。
- **トリガー/兆候:** 横方向のみ拡大したのに縦の行高さが変化する等、ZOOM-L1-003検証項目に違反する
  不具合。縮小したのに表示アイテム数が増える等、ZOOM-L3-001の単調性検証に違反する不具合。
- **根拠:** `docs/spec/14-zoom-lod.sdoc` ZOOM-L1-003, ZOOM-L1-005, ZOOM-L2-001, ZOOM-L3-001、
  `interview-record.md` §3 コアドメイン2、§4 item45。

---

### RISK-005: MSPDI XML往復での非対応概念（マルチバー等）欠落（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-005</risk:id>
<risk:probability>high</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
MSPDIスキーマに対応物がない概念（1行複数バー配置、アイコン種別、色パレット、コメント等）の
拡張フィールド戦略（MSPDIのExtendedAttribute機構等の活用、または非対応時は内部JSON側でのみ
保持しMSProjectでは簡略表示になる旨をユーザーに明示）をdesignフェーズのI/O設計章で確定する。
Export→Import→内部モデル比較のラウンドトリップテストをtest-planに必須項目として追加する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（コアドメイン: データ形式変換）
- **対応方針:** 軽減
- **リスク記述:** MSPDI XML（MS Project標準交換フォーマット）は、gr-scheduler固有の概念
  （1行複数バーのマルチバーレイアウト、アイコン、色分け、依存線の折れ点、イナズマ線/予実差分等）
  に対応する標準フィールドを持たない。双方向Import/Exportの往復（round-trip）でこれらの情報が
  欠落し、MS Project経由でのデータ交換時にユーザーが意図しないデータ損失を経験するおそれがある。
- **トリガー/兆候:** ラウンドトリップテスト（内部モデル→MSPDI→内部モデル）で、マルチバー配置・
  アイコン・色・コメント等の情報欠落が検出される。
- **根拠:** `interview-record.md` §2「MSProject連携」（MSPDI XML双方向、.mppバイナリは対象外）、
  `docs/spec/20-io-interop.sdoc`。

---

### RISK-006: WCAG 2.1 AA達成困難（SVGキャンバスの操作性）（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-006</risk:id>
<risk:probability>high</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
SVG要素にARIA属性（role, aria-label, tabindex）を付与するアクセシブルなカスタムウィジェット
パターン（WAI-ARIA Authoring Practices準拠）をdesignフェーズで採用し、アイテム作成・移動・
ズーム・保存の代表操作にキーボードのみでの操作経路（item61候補として挙がっている「キーボード
のみでの作成・編集経路」）を用意する。testing フェーズでスクリーンリーダーによる手動検証を
テスト計画に組み込む。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（アクセシビリティ）
- **対応方針:** 軽減
- **リスク記述:** NFR-L1-003〜006（マニュアル不要操作、アフォーダンス、アイコン主導UI、CUD配色）は
  いずれもWCAG: AAが付与されたMust要求である。ドラッグ&ドロップ主体のSVGキャンバス型UIは、標準
  HTMLフォーム部品と異なりキーボード操作・スクリーンリーダー対応の実装コストが高く、AA達成が
  困難になりやすい典型パターンである。
- **トリガー/兆候:** アクセシビリティ監査（axe等の自動チェック、または手動スクリーンリーダー検証）で
  主要操作（アイテム作成・移動・ズーム・保存）がキーボードのみで到達不能と判明する。
- **根拠:** `docs/spec/25-nfr-a11y.sdoc` NFR-L1-003, NFR-L1-004, NFR-L1-005, NFR-L1-006、
  CLAUDE.md 条件付きプロセス「アクセシビリティ(WCAG 2.1): 有効」。

---

### RISK-007: 悪意あるインポート(SVG/XML/JSON)によるXSS/XXE等（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-007</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
SVG/PNGインポート解析基盤・.json/.xmlインポートに対し、SVG内のscript/onload/foreignObject等の
危険要素除去（サニタイズ）、XMLパーサでの外部実体参照(XXE)無効化、JSONスキーマバリデーション、
ファイルサイズ上限・展開後サイズ上限（zip系展開爆発対策）を実装する。security-reviewerと連携し、
脅威モデル（threat-model.md）にimport経路を明記した上でCodeQL/npm auditによる静的検査を行う。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>security-reviewer</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（セキュリティ）
- **対応方針:** 軽減
- **リスク記述:** gr-scheduler はクライアント完結型で、ユーザー（または第三者から受け取った）
  ファイル（.json/.xml/SVG/PNG）をFile APIでそのままブラウザ内で解析・レンダリングする。
  SVGインポートはXSS（script埋め込み、イベントハンドラ属性）、XMLインポート（MSPDI/内部XML）は
  XXE等のリスクを内包する。単一HTML・サーバーレス構成のためサーバーサイドでの検疫ができず、
  クライアント側の実装品質がそのままセキュリティ境界になる。
- **トリガー/兆候:** security-reviewerによる脆弱性レビュー・SASTスキャンでサニタイズ未実施箇所が
  検出される。悪意あるファイルインポートのテストケースでスクリプト実行や異常な高負荷が再現する。
- **根拠:** CLAUDE.md「セキュリティ要求」（OWASP Top 10対策必須、入力値バリデーション必須）、
  `interview-record.md` §3「既存技術の利用: SVG/PNGインポートの解析基盤」。

---

### RISK-008: localStorage容量超過(約5MB上限)によるデータ損失（技術リスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-008</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
localStorage使用量を監視し、閾値（例: 4MB=上限の8割）到達時にユーザーへ警告し、ファイル書き出しを
促す。localStorageの役割をクラッシュ復旧用の自動保存に限定し、正本データは.json/.xmlファイル
I/Oとする方針を設計文書で明確化する。画像/アイコン等の大きなバイナリはID参照+重複排除で保持量を
削減し、必要に応じて圧縮（例: LZ系の軽量圧縮）を検討する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（データ永続化）
- **対応方針:** 軽減
- **リスク記述:** データ保存/読込はファイルI/O（.json/.xml）+ localStorage自動保存（クラッシュ復旧）
  の方針である。中規模データ（約50行/約1000アイテム）に加え、インポートした画像/アイコンや
  透かし設定等を含めると、多くのブラウザのlocalStorage上限（オリジンあたり約5MB）を超過し、
  自動保存が失敗（QuotaExceededError）してクラッシュ復旧機能自体が機能しなくなるおそれがある。
- **トリガー/兆候:** 自動保存処理でQuotaExceededError（またはブラウザ固有の容量エラー）が発生する。
  大規模データ・多数画像インポートのテストシナリオで自動保存ログにエラーが記録される。
- **根拠:** `interview-record.md` §2「データ保存/読込」、`interview-record.md` §2「想定規模」。

---

### RISK-009: 整列制約ソルバ(item3同一タイミング整列)の複雑性（技術リスク・スコア4）

**Form Block**

```xml
<risk:id>RISK-009</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>4</risk:score>
<risk:mitigation>
整列制約（同一タイミングのタスク/同種マイルストーンを同じ高さに揃える）をグラフベースの
制約解決（優先度付き貪欲法等、NP困難な厳密最適化は避ける）として設計し、MVP版では
「概ね揃える（ヒューリスティック）」を許容範囲とすることをarchitectとユーザーで合意する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（コアドメイン: マルチバー・レイアウトエンジン）
- **対応方針:** 軽減
- **リスク記述:** `interview-record.md` §5 で「同一タイミングのタスク/同種マイルストーンを同じ
  高さに揃える（item3）→ 整列制約ソルバ」とされており、厳密な制約解決は組合せ爆発の懸念がある。
- **トリガー/兆候:** 整列計算がアイテム数増加に対して非線形に遅延する。

---

### RISK-010: 将来拡張(item59/60)の設計余地確保によるMVP肥大（プロセスリスク・スコア4）

**Form Block**

```xml
<risk:id>RISK-010</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>4</risk:score>
<risk:mitigation>
NFR-L1-009に列挙された将来拡張（共同編集E2E、行単位権限、複数プロジェクト統合、サブプロジェクト
生成、モード切替、一覧モード列）は、MVPでは「抽象化点・フック・切替口の確保のみ」に限定し、
実装は行わない（PRIORITY: Wont）ことをdesignフェーズ開始時にarchitectとorchestratorで再確認する。
拡張点の設計コストが肥大化する兆候があれば、change-manager/決定記録を通じて設計余地の範囲を縮小する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect, orchestrator</risk:assigned_to>
```

**Detail**

- **カテゴリ:** プロセスリスク（スコープクリープ）
- **対応方針:** 軽減
- **リスク記述:** `docs/spec/25-nfr-a11y.sdoc` NFR-L1-009 は将来拡張のための設計余地確保を要求する。
  「余地確保」の線引きが曖昧だと、実装不要な抽象化・過剰設計に工数が流れMVPスケジュールを圧迫する。
- **トリガー/兆候:** design フェーズの設計文書で、Wont指定の将来拡張に対する実装相当のコードや
  過剰な抽象化レイヤーが現れる。
- **根拠:** `docs/spec/25-nfr-a11y.sdoc` NFR-L1-009、`interview-record.md` §2「MVPスコープ」。

---

### RISK-011: 国際化: 多言語文字幅・フォント表示崩れ（技術リスク・スコア4）

**Form Block**

```xml
<risk:id>RISK-011</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>4</risk:score>
<risk:mitigation>
property名は英語固定（item18）としラベル層のみi18n対象とする方針（interview-record §5）を
実装で徹底し、可変長文字列を表示するラベル・略称・ツールチップ領域は言語非依存のレイアウト
（自動折返し/省略記号+ツールチップ全文表示）で設計する。i18n初期対応言語（ja/en想定）で
文字幅の実機確認をtestingフェーズに組み込む。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 技術リスク（国際化）
- **対応方針:** 軽減
- **リスク記述:** CJK/欧文混在等、言語により文字幅・行高が異なり、固定サイズの丸角囲みラベルや
  ツールバーで表示崩れ（はみ出し・重なり）が生じるおそれがある。CLAUDE.md 条件付きプロセスで
  「製品i18n/l10n: 有効」。
- **トリガー/兆候:** 多言語データでのビジュアルリグレッションテストでラベルはみ出し・重なりを検出。
- **根拠:** `interview-record.md` §5「property多国語」、`docs/spec/12-properties-i18n.sdoc`。

---

### RISK-012: ブラウザ間のSVG/File API/Clipboard API実装差異（外部リスク・スコア4）

**Form Block**

```xml
<risk:id>RISK-012</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>4</risk:score>
<risk:mitigation>
対応ブラウザ範囲（例: 直近2バージョンのChrome/Edge/Firefox/Safari）をdesignフェーズで明文化し、
主要APIの機能検出（feature detection）とグレースフルデグラデーション（例: Clipboard API非対応時は
ダウンロードにフォールバック）を実装方針とする。testingフェーズでクロスブラウザ動作確認を実施する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>implementer</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 外部リスク（依存サービス/プラットフォーム変更）
- **対応方針:** 軽減
- **リスク記述:** 単一HTMLはサーバー無しで動作する前提上、ブラウザのSVGレンダリング差異・File
  API・（item61候補の）Clipboard API等のブラウザ間実装差により、環境依存の不具合が生じ得る。
- **トリガー/兆候:** クロスブラウザテストで特定ブラウザのみ描画崩れ/機能不動作が検出される。

---

### RISK-013: 依存ライブラリ(Vite等)のEOL・破壊的変更（外部リスク・スコア2）

**Form Block**

```xml
<risk:id>RISK-013</risk:id>
<risk:probability>low</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>2</risk:score>
<risk:mitigation>
依存関係追加時にlicense-checkerによるライセンス確認と合わせて、主要ライブラリ（Vite,
vite-plugin-singlefile, TypeScript）のメンテナンス状況を確認する。npm audit / Snykを定期実行し
SCA結果をproject-records/security/に記録する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>license-checker</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 外部リスク（技術動向）
- **対応方針:** 受容（監視を継続）
- **リスク記述:** ビルドツールチェーンの将来的な破壊的変更・メンテナンス停止は一般的なOSS依存リスク
  であり、現時点でVite/vite-plugin-singlefileの活発なメンテナンスが確認できる限り影響は限定的。

---

### RISK-014: インライン化フォント/絵文字のライセンス・著作権問題（外部リスク・スコア3）

**Form Block**

```xml
<risk:id>RISK-014</risk:id>
<risk:probability>low</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>3</risk:score>
<risk:mitigation>
埋め込みフォント/絵文字素材の選定時にlicense-checkerを起動し、単一HTMLへのバイナリ埋め込みが
ライセンス上許容されるか（再配布・埋め込み条項）を確認する。帰属表示が必要な場合はドキュメント
（docs/）に記載する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>license-checker</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 外部リスク（規制/ライセンス）
- **対応方針:** 軽減
- **リスク記述:** RISK-002のフォント/絵文字インライン化対策と連動。埋め込み配布が禁止された
  フォント/絵文字を誤用すると法的リスクが生じる。影響度は高いが、選定時の確認で回避可能なため
  発生確率は低いと評価。
- **根拠:** CLAUDE.md「ライセンス管理: 依存ライブラリ追加時にlicense-checkerエージェントを実行する」。

---

### RISK-015: MS Project側のMSPDIスキーマ仕様変更（外部リスク・スコア3）

**Form Block**

```xml
<risk:id>RISK-015</risk:id>
<risk:probability>low</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>3</risk:score>
<risk:mitigation>
MSPDIスキーマは長期間安定した公開仕様であるが、対応MS Projectバージョンをdesign文書に明記し、
主要バージョン（例: MS Project 2016以降）でのExport/Importの動作確認をtest-planに含める。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>architect</risk:assigned_to>
```

**Detail**

- **カテゴリ:** 外部リスク（依存サービス仕様変更）
- **対応方針:** 軽減
- **リスク記述:** MSPDIはMicrosoft公開の交換フォーマットで安定しているが、将来のMS Projectメジャー
  更新でスキーマ拡張・非推奨化が行われる可能性はゼロではない。発生確率は低いが、発生時は連携機能
  全体に影響するため影響度は高い。

---

### RISK-016: 未確定要求(item50/52/i18n言語セット)による手戻り（プロセスリスク・スコア4）

**Form Block**

```xml
<risk:id>RISK-016</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>medium</risk:impact>
<risk:score>4</risk:score>
<risk:mitigation>
`interview-record.md` §7「未確定・次アクション」に記載の初期テンプレート（item50）、
ショートカットキー割当（item52）、i18n初期対応言語セット（item17系）を、design フェーズ開始前に
srs-writer/architectがユーザーレビューを通じて確定させ、仕様書に反映してから実装に着手する
ゲートを設ける。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>srs-writer, orchestrator</risk:assigned_to>
```

**Detail**

- **カテゴリ:** プロセスリスク（要求の曖昧さ）
- **対応方針:** 軽減
- **リスク記述:** 未確定のまま実装が先行すると、後からの仕様確定によりUI/データモデルの手戻りが
  発生する。
- **根拠:** `interview-record.md` §7。

---

### RISK-017: item61便利機能候補のトリアージ未決定によるスコープ不確実性（プロセスリスク・スコア2）

**Form Block**

```xml
<risk:id>RISK-017</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>low</risk:impact>
<risk:score>2</risk:score>
<risk:mitigation>
`docs/spec/25-nfr-a11y.sdoc` NFR-L1-008に列挙された提案候補（スナップ整列、祝日網掛け、
ミニマップ、印刷/PDFレイアウト、PNG/クリップボード出力）はMVP必須ではない（PRIORITY: Could）。
design フェーズでarchitectが採否をdecisionとして記録し、採用分のみ要求へ昇格させる。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>orchestrator</risk:assigned_to>
```

**Detail**

- **カテゴリ:** プロセスリスク（スコープクリープ）
- **対応方針:** 受容（トリアージ手続きに委ねる）
- **リスク記述:** 採否未定の候補が多いが、Could優先度でありMVPをブロックしないため影響は小さい。

---

### RISK-018: 中規模データ(~1000アイテム)の性能テスト環境・データ未整備（プロセスリスク・スコア6）

**Form Block**

```xml
<risk:id>RISK-018</risk:id>
<risk:probability>medium</risk:probability>
<risk:impact>high</risk:impact>
<risk:score>6</risk:score>
<risk:mitigation>
design フェーズ早期に、約50行/約1000アイテム相当のテストデータ生成スクリプトと、フレームレート/
初期表示時間を自動計測する性能テストハーネス（例: Playwright + Performance API、または合意済み
性能テストツール）を用意する。testingフェーズ前に少なくとも1回、performance-reportとして
NFR-L1-002達成状況を記録し、RISK-001の軽減策の効果を継続的に検証する。
</risk:mitigation>
<risk:risk_status>open</risk:risk_status>
<risk:assigned_to>test-engineer</risk:assigned_to>
```

**Detail**

- **カテゴリ:** プロセスリスク（テスト不足）
- **対応方針:** 軽減
- **リスク記述:** RISK-001（性能未達そのもの）とは別に、性能テストの環境・データセット・自動計測が
  未整備のままimplementationフェーズへ進むと、性能問題の発見がtestingフェーズ終盤にずれ込み、
  手戻りコストが増大する（発見の遅延が影響度を押し上げる）。
- **トリガー/兆候:** design フェーズ完了時点で性能テスト計画（test-plan.md）に中規模データでの
  計測手順が定義されていない。
- **根拠:** CLAUDE.md 品質目標「性能テスト: NFR数値目標をすべて達成」、
  `docs/spec/25-nfr-a11y.sdoc` NFR-L1-002 VERIFICATION。

---

## 4. 今後の運用

1. 各フェーズ（design / implementation / testing / delivery）開始時に本台帳を見直し、状態
   （open / mitigated / closed / accepted）を更新する。
2. 新規リスクが発生した場合は即座に本台帳へ追記し、スコア6以上であれば orchestrator へ即時報告する。
3. 軽減策の実行可否が不明・実行不可能と判明した場合は、代替策を提案し orchestrator の判断を求める。
4. 用語・命名の一貫性チェックを kotodama-kun に依頼する（本台帳の risk カテゴリ用語について）。

<!-- ============================================================
     FOOTER | append change_log entry on every write
     ============================================================ -->

## Last Updated

<!-- FIELD: updated_by | type: string | required: true -->

<doc:updated_by>risk-manager</doc:updated_by>

<!-- FIELD: updated_at | type: datetime | required: true -->

<doc:updated_at>2026-07-18T09:00:00Z</doc:updated_at>

## Change Log

<!-- FIELD: change_log | type: list | append-only | DO NOT MODIFY OR DELETE EXISTING ENTRIES -->

<doc:change_log>
<entry at="2026-07-18T09:00:00Z" by="risk-manager" action="created: initial risk register with 18 risks identified at planning-phase completion (9 risks scored >=6, requiring user notification)" />
</doc:change_log>
