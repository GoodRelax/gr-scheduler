# gr-scheduler 仕様書 — 要求

**Grammar**: spec.sgra
**UID**: DOC-REQUIREMENTS
**Version**: 0.1

本書は第 1 部（Chapter 1 〜 4）である。仕様形式は **ANPS-part**（4 枚）。
書き方の規則は `previous-project-result/20-spec-template/spec-writing-rules.md`、
要望の入力は `previous-project-result/user-order.md` が正である。

> **この文書はまだ器である。** 章節の見出しと、そこに何を書くかだけがある。
> 未記入の節は引用で始まる行を持つ。`grep -n "^> 未記入" docs/spec/*.md` で残りを引ける。

## Chapter 1. Foundation (基本事項)

### 1.1 Background (背景)

**Type**: SECTION

> 未記入。なぜこのソフトウェアが必要かと、日程表作成の現状を書く。出どころは `user-order.md`「何を作りたい？」「それはどうして？」。

### 1.2 Challenges (課題)

**Type**: SECTION

> 未記入。現状の具体的な問題点を書く。既存ツールが 1 行に複数のタスクを置けないことを含む。

### 1.3 Goals (目標)

**Type**: SECTION

> 未記入。`GOAL` ノード（`GL-xxx`）を並べる。機能の目標と品質の目標を分ける。品質側は `user-order.md` 最優先事項 1（ぬるサク）から起こす。

### 1.4 Approach (解決方針)

**Type**: SECTION

> 未記入。技術スタックとアーキテクチャ方針を書く。単一 HTML・オフライン・TypeScript / Vite / Vitest / Playwright。

### 1.5 Scope (範囲)

**Type**: SECTION

> 未記入。In-scope と Out-of-scope の表。Out-of-scope は `user-order.md`「やらないこと」が正。

### 1.6 Constraints (制約事項)

**Type**: SECTION

> 未記入。破れない制約を書く。単一 HTML・サーバー不要・対応ブラウザ（Chromium 系基準 / Firefox は動作確認 / Safari 対象外）・タッチ対象外・第三者著作物を再配布しないこと。

### 1.7 Limitations (制限事項)

**Type**: SECTION

> 未記入。要求を完全には満たさない既知の妥協点を書く。透かしがクライアント単体では弱い抑止に留まること（`user-order.md` 55-3）など。

### 1.8 Glossary (用語集)

**Type**: SECTION

> 未記入。用語の正は 4 文書（`03-ui-naming/ui-parts-ja.md` / `02-data-model/grs-native-erd-ja.md` / `07-plan-actual/plan-actual-decisions-ja.md` / `02-data-model/grs-document-settings-ja.md`）にある。ここへ複製せず、本書で使う語だけを引く。

### 1.9 Notation (表記規約)

**Type**: SECTION

本書は RFC 2119 / RFC 8174 に従う。SHALL / MUST は必須、SHOULD は推奨、MAY は任意を表す。規範語として扱うのは大文字で書かれた場合に限る。

**例外:** EARS 構文中の小文字 `shall` は、本書では大文字の SHALL と同じ拘束力を持つものとする。

**文体:** 記述文では主語と他動詞の目的語を省略しない。指示文（「〜する（MUST）」の形）はこの限りでない。

**図:** 大きな図は `_assets/fig-<name>.md` へ出して本文から参照する。判定の閾値を変更した場合はここに記す。

**EARS 構文パターン（日英併記）:**

| パターン | 英語構文 | 日本語の形 | 用途 |
|---|---|---|---|
| Ubiquitous | The [System] shall [Response]. | [System] は、[Response] すること。 | 常に成り立つ要求 |
| Event-driven | **When** [Trigger], the [System] shall [Response]. | [Trigger] したとき、[System] は、[Response] すること。 | イベント起点の要求 |
| State-driven | **While** [In State], the [System] shall [Response]. | [In State] の間、[System] は、[Response] すること。 | 状態依存の要求 |
| Unwanted Behavior | **If** [Trigger], then the [System] shall [Response]. | もし [Trigger] ならば、[System] は、[Response] すること。 | 異常系・例外処理 |
| Optional Feature | **Where** [Feature is included], the [System] shall [Response]. | [Feature] がある場合、[System] は、[Response] すること。 | オプション機能・条件付き機能 |
| Complex | **While** [In State], **when** [Trigger], the [System] shall [Response]. | [In State] の間、[Trigger] したとき、[System] は、[Response] すること。 | 複合条件の要求。**状態が先、契機が後**（原論文の節順に従う） |

**条件は主語より先に書く（MUST）。これが EARS の要点である。**

**要求は必ず「〜すること。」で終える（MUST）。** 事実の記述は「〜する。」、推奨は「〜が望ましい。」で区別する。

> **`Where` は、製品にその機能が入っているかどうかで分ける。実行時に切り替わるものは State-driven である（MUST）。**

**`[System]` の定義。** EARS の `[System]` は、**Chapter 2.2 で「対象ソフトが載る」と記した機器の上で動くソフトウェアを指す。Chapter 2 を書かずに Chapter 4 を書いてはならない（MUST NOT）。**

## Chapter 2. System Overview (システム概要)

### 2.1 Overview Diagram (概要図)

**Type**: SECTION

> 未記入。アクターと機器の関係を mermaid の flowchart で描く。対象ソフトが載る機器を太枠で示し、色は使わない。線のラベルには何が流れるかを書く。

### 2.2 Devices (機器)

**Type**: SECTION

> 未記入。機器・種別・対象ソフトが載るか・供給元・こちらで変えられるかの表。Chapter 4 の `[System]` の定義がここに依存する。

### 2.3 Routes (経路)

**Type**: SECTION

> 未記入。from / to / 運ぶもの / 方式 / 入力として信頼できるかの表。MSPDI XML と JSON の取込経路は「信頼できない」と書く（`user-order.md` 62）。

### 2.4 Exclusions (持たないもの)

**Type**: SECTION

> 未記入。構成に含まれないものと理由。サーバー・認証・永続ストアを持たないことを書き、Chapter 6.2 と揃える。

## Chapter 3. Use Cases (ユースケース)

### 3.1 Actors (アクター)

**Type**: SECTION

> 未記入。アクター・種別・対応する機器・関心の表。人のほかに機械向けの口の利用者を含める（`10-agent-interface/`）。

### 3.2 Use Cases (ユースケース)

**Type**: SECTION

> 未記入。`USE_CASE` ノード（`UC-xxx`）を並べる。目標を動詞句で書き、`SCENARIO` と `EXTENSIONS` を持たせ、`GL-xxx` を親に取る。

## Chapter 4. Requirements (要求)

### 4.1 Functional Requirements (機能要求)

**Type**: SECTION

> 未記入。`FUNC_REQ` ノード（`FR-xxx`）を並べる。EARS 1 文・`ORIGIN`（どの手順または拡張から来たか）・`RATIONALE` を持たせ、`UC-xxx` を親に取る。

### 4.2 Non-Functional Requirements (非機能要求)

**Type**: SECTION

> 未記入。`NON_FUNC_REQ` ノード（`NFR-xxx`）を並べる。測定可能な数値基準を含めること。基準線は `04-performance/performance-notes-ja.md` と `08-poc/POC-RESULTS-ja.md` の実測から取り、新しく発明しない。

### 4.3 Reduction Candidates (削減候補)

**Type**: SECTION

> 未記入。親も子も持たない UID を並べ、外すと何が起きるかとユーザーの判断を書く。Chapter 4 を書き終えてから埋める。
