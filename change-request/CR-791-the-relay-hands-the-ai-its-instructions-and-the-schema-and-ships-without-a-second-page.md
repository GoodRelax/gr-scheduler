# CR-791 —— 取次は AI に最初に読むものの案内と GRS JSON のスキーマを渡し、束はページの写しを 2 つ目に持たない

> 状態: ⭐ **当てた** —— 2026-10-18、AI 連携の調べの席（`trusting-kowalevski-9290c1`）が仕様とコードを当てた。2026-10-17 に半分を当てたところで利用者の指示で止め（`JDG-2644`）、改名 `CR-792`（`815ecba8`）を取り込んでから仕上げた。仕様だけを読む別の体が試験を書いた（`tests/contract/cr-791-*` と、`cr-613`・`cr-614` の試験の直し）。変更履歴は 5.08（5.03・5.04 は空いたまま、5.05〜5.07 が先に使われたので次の空きを使った）。
> 当てる裁定: `JDG-2641`（`PND-930` の推奨 A ＋ 束の無駄なファイルを消す）。読み違えを正した裁定: `JDG-2642`（AI に使わせたいのはタスクグループの追加・削除・移動で、既にできる —— `CM-76` は人だけのまま）。
> 閉じる不具合: `DFC-3130`（AI へスキーマも案内も届かない）・`DFC-3132`（束が読まれない `index.html` を持ち、版が `0.0.0`）。`DFC-3131`（道具の説明が日本語だけ）は閉じない —— 案内が「説明は日本語で、行 ID は仕様の行である」と仕様の所を添えるだけである（`PND-931` は未裁定のまま）。
> 新しい ID: 無い。表 T-064 の `PI-40` に公開名 `mcpInstructions` を 1 つ足す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`（構造化した日程データを AI に渡す）。取次だけを入れた AI が、文書の形を当て推量せずに読み書きできるようにする。利用者の指示 2026-10-15「初見AIがGRSのJSONのスキーマを読むだけでスケジュールの読み書き方法を理解できることが要求だ」（`DFC-2494` の行）の前提を、MCP の道でも満たす。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2.21`**（1 つの仕事は 1 か所）と **`R2.9`**（要らないものを持たない）。
出たこと: ① 案内の文を取次のコードに手で書くと、道具の名と 2 か所で持つことになる —— 表 T-107 の原稿 `_source/agent-api-members.json` に `mcpInstructions` として置き、道具の説明と同じ生成器が刷る。② スキーマは `_source/grs-document.schema.json` の 1 つを、取次の組み立てが中に持つ —— 取次がスキーマを読み解く規則を持たないので、`AG-12` の結び（取次は文書もドメインの規則も持たない）を破らない。③ 束の `index.html` は読まれない（取次の JavaScript が同じバイト列を中に持つ）—— 外す。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 案内は英語で書く —— 読むのは AI であり、世界に出すものは英語が原則。道具の説明（日本語）は変えない（`PND-931`）。
2. ⭐ 資源の所は `grs-relay://grs-document.schema.json` —— 公開の `$id`（最新版の所）を使わないのは、中身が配るページと同じ版であって最新版とは限らないからである。
3. ⭐ 資源を読めない客のために、案内に「`exportJson` の文字列の先頭の `$schema` が最新版の所」と書く —— AI のアプリによっては、資源を AI が自分で読めず、人が添えるときだけ読める。
4. ⭐ 版の印は `package.json` の版 ＋ `+` ＋ 単一 `.html` の SHA-256 の頭 12 桁（例 `0.0.0+f262abd0363f`）—— 版の番号の付け方（`package.json` の `0.0.0`）は変えず、同じ入力から同じ版ができる。`serverInfo` の版も同じ文字列にする。
5. ⭐ `resources/templates/list` には空の並びを答える —— 客が尋ねたときに「知らない方法」の誤りにしない。

---

## 1. 対応

| # | 直すこと | 仕様の ID | 直す物 |
| --- | --- | --- | --- |
| 1 | 初期化の答えに案内（`instructions`）を載せ、能力を道具と資源の 2 つにする | 表 T-035 の `AG-12` の ⑧、`_assets/design-mcp-relay.md` の 3.1、`_assets/tbl-agent-api-members.md` の「MCP の初期化の答えに載せる案内」 | `_source/agent-api-members.json`（`mcpInstructions`）・同 `.schema.json`・`agent_api_members_json_to_md.py`・`tools/generate_mcp_tool_descriptions.py`（`instructions`）、`mcp-tool-translator.ts` の `mcpInstructions`（表 T-064 の `PI-40`）、`mcp-relay-server.ts` の `initializeResultOf` |
| 2 | スキーマを 1 つの資源として出す（一覧・読む・無い所は `-32002`） | `AG-12` の ⑧、設計 3.1 | `mcp-relay-server.ts` の `schemaResourceOf`・`resourceReadReplyOf`・`McpRelayOptions.documentSchema`、`vite.relay.config.ts`（`_source/grs-document.schema.json` を中に持つ） |
| 3 | 束は `manifest.json` と JavaScript の 2 つだけ | 設計 6 | `tools/build_relay_bundle.mjs` |
| 4 | 束と取次の版の印 | 設計 6 | `tools/build_relay_bundle.mjs`（`manifest.json` の `version`）・`vite.relay.config.ts`（`__GRS_RELAY_VERSION__`） |

## 2. 影響

```
仕様の他の行     AG-12 の頭の「① 〜 ⑦」→「① 〜 ⑧」。④（道具は T-107 と 1 対 1）は変わらない —— 資源は道具ではない
生成物           tbl-agent-api-members.md（案内の段）・mcp-tool-descriptions.json（instructions）・tbl-published-entries.md・docs/review/public-entry-index.md
試験             cr-613 の継ぎ目 3（能力と options）・cr-614（options）・cr-613-cr-620 の組み上がった取次（束の中身・版）は期待が変わる。新しい試験は別の体が仕様だけから書く
形式の版         上げない —— 文書の形は変わらない（FR-073）。Agent API の版も上げない —— メンバと呼び方は変わらない（AG-1）
毎フレームの仕事 無い —— 取次のプロセスだけの変更で、ページの dist/index.html は変わらない
```

## 3. 測ったこと

- 束の大きさ（いまの `dist/index.html`（`f8905221` の上）の同じ入力で比べた）: 前のやり方なら 636,216 ＋ 402,308（`index.html` の deflate 9 と見出し）＝ 約 1,038,524 B → 当てた後 636,216 B（約 39 % 減）。公開中の前の束は 1,025,529 B（`ec9803f1` のページ）。
- 組み上がった取次を node で動かし、stdio で `initialize`・`resources/list`・`resources/read`・`tools/list` を送った（見本の外の探り）: 能力 `{"tools":{},"resources":{}}`、`serverInfo.version` `0.0.0+f262abd0363f`、案内 9 行、資源 1 つ（43,617 B、`_source/grs-document.schema.json` とバイト一致、改名後の `editPermission` を持ち `editGroup` を持たない）、無い所は `-32002`、道具 22。
