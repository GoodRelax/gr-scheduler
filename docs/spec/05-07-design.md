# gr-scheduler 仕様書 — 設計

**Grammar**: spec.sgra
**UID**: DOC-DESIGN
**Version**: 0.1

本書は第 2 部（Chapter 5 〜 7）である。

> **この文書はまだ器である。** 未記入の節は引用で始まる行を持つ。

## Chapter 5. Design (設計)

### 5.1 Architecture Concept (アーキテクチャ方式)

**Type**: SECTION

> 未記入。採用するアーキテクチャと層の凡例を書く。Clean Architecture を採る場合は entity / use case / adapter / framework の依存方向を mermaid で示す。推奨案は `09-architecture/architecture-layering-draft-ja.md` にあるが `status: draft` であり決定ではない。ここで決める。

### 5.2 Components (コンポーネント)

**Type**: SECTION

> 未記入。部品と責務の分割をコンポーネント図で書く。各コンポーネントが Chapter 2.2 のどの機器に載るかを明記する。

### 5.3 File Structure (ファイル構成)

**Type**: SECTION

> 未記入。ディレクトリ構成と、コンポーネントとフォルダの対応を書く。各コンポーネントの公開面を宣言する。`src/` の中身が確定するのはここである。

### 5.4 Domain Model (ドメインモデル)

**Type**: SECTION

> 未記入。概念と関係を書く。データ構造の正は `02-data-model/grs-native-erd-ja.md`（14 エンティティ・2 軸）。ここへ複製せず、本製品が持つ形として引き直す。

### 5.5 Behavior (振る舞い)

**Type**: SECTION

> 未記入。処理フローと相互作用を書く。予実の 5 状態は状態遷移図で描く（`07-plan-actual/plan-actual-decisions-ja.md` §1-3）。レイアウトの計算順序（制約 → ラベル幅 → 積み順 → 依存線の経路）もここに置く。

### 5.6 Decisions (設計判断)

**Type**: SECTION

> 未記入。ADR-000 に「要求を満たす最小の構成と比べて何を増やしたか」を書く。以降は ADR-001 から採番する。前プロジェクトの記録番号は引き継がない（`previous-project-result/README.md` §0-4）。描かなかった図とその理由もここに書く。

## Chapter 6. Software Specification (ソフトウェア仕様)

### 6.1 Software Specifications (ソフトウェア仕様)

**Type**: SECTION

> 未記入。`SW_SPEC` ノード（`SWS-xxx`）を並べる。符号・状態遷移・境界値などの手段を EARS 1 文で書き、`FR-xxx` を親に取る。

### 6.2 Data Schema (データスキーマ)

**Type**: SECTION

> 未記入。JSON Schema を置く。永続ストアを持たない場合は「持たない」と書き、Chapter 2.4 と揃える。文書の形の正は `02-data-model/grs-native-erd-ja.md`、設定値の正は `02-data-model/grs-document-settings-ja.md`。

## Chapter 7. Test Strategy (テスト戦略)

**Type**: SECTION

> 未記入。系統・テストレベル・方針・ツール・合格基準の表を書く。系統は 3 つ（ユースケーステスト / ソフトウェア仕様テスト / 非機能テスト）。ソフトウェア仕様テストの `Unit` は**仕様書の外で実施する**ため Chapter 9 にケースを書かない。文法もそれを強制しており、`SW_SPEC_TEST` の `TEST_LEVEL` は `Integration` と `System` しか受け付けない。テストコードの置き場は `tests/usecase/` `tests/integration/` `tests/system/` `tests/nfr/` で、Chapter 8 〜 10 の `File` 関係が指す先になる。
