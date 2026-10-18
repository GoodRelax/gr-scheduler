# CR-802 —— `readSchema` はスキーマを部分ごとに渡し、書く前に読む短い注意を持つ

> 状態: ✅ **当てた** —— 2026-10-18 夜、取次の直しの席（`unruffled-edison-a20654`）が起草し、調整役の指示で同じ席が当てた。仕様 → 実装 → 仕様だけを読む別の体の試験（`tests/contract/cr-802-*`）→ 関門の順。
> 元: 取次の試験の席 8（`local_36b8e700`）の AI が、文書のスキーマの全部を読むと会話の多くを占めると測り、5 つの案を出した。利用者がそれを案のとおりに入れると定めた（`JDG-2827`）。
> 当てる裁定: `JDG-2827`。覆す裁定: 無し —— `CR-799` の `readSchema`（全部の本文を返す）を部分ごとの形に広げる。`CR-799` は着地済みなので追記はせず、本書が新しい番号で持つ。
> 新しい ID: 無し —— `AM-30` の引数と答えを広げ、原稿に `schemaNotes` を足す。
> 消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`（構造化した日程データを AI に渡す）。AI が文書を読み書きする前にスキーマの全部を読むと、会話の多くをそれが占める。要る定義だけと、間違えやすい所の短い注意で足りるようにする。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2.21`**（1 つの仕事は 1 か所）・**`R2.9`**（要らないものを持たない）。
出たこと:
① 注意の文はスキーマの説明と同じことを言うので、2 か所目になる —— 注意は間違えやすい所だけに絞り、「食い違えばスキーマが正」と文の頭で言う（`R2.21`）。
② 版の食い違いを繋ぐときに比べる道は、取次が配るページが同じ組み立てで作られる以上、起きないことを確かめる道になる —— 作らない（`R2.9`、③ の 1）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ 案の 1（束にスキーマを持ち、繋ぐときにページの版と比べる）は、比べる道を作らない。束は既にスキーマを中に持つ（`vite.relay.config.ts` が刷り込む）。取次が配るページはその束に入った同じ組み立ての単一 `.html` なので、ページの `schemaVersion` は中に持つスキーマの版と必ず同じである。代わりに `readSchema` のどの答えにも `schemaVersion` を載せ、AI は道具 `schemaVersion` と比べられる。
2. ⭐ 目次の 1 行は、定義の説明の最初の文（`.` まで）。説明の無い定義は空の文字列。
3. ⭐ `defs` の答えは、選んだ定義が `$ref` で指すほかの定義の名を `refersTo` に、`$defs` に無い名を `unknown` に返す —— AI が次に何を頼めばよいかが分かる。
4. ⭐ `full` が真なら `defs` より先に効く。
5. ⭐ 注意は道具だけで渡し、3 つ目の資源は足さない —— `AG-12` の ⑧ の「2 つの資源」を変えずに済み、資源を読める客も `readSchema` で読める。
6. ⭐ 道具の入力の型に「文字列の並び」（`readonly string[]` → 文字列の配列）を足した（`design-mcp-relay.md` 3.1）。
7. ⚠️ 命令のスキーマ（`grs-commands.schema.json`）は `$defs` を持たないので、その目次の `defs` は空で、部分読みが効くのは一番上の鍵だけである（試験の体が見つけた）。命令のスキーマを `$defs` に分けるのは α の後に回す。

---

## 1. 対応

| 案 | 直すこと | 直す原稿・文書 |
| --- | --- | --- |
| 1 | 束のスキーマを正とし、答えに `schemaVersion` を載せる（③ の 1） | `design-mcp-relay.md` 3.1、`mcp-relay-server.ts` |
| 2 | `readSchema` の `defs`・`full`。何も無ければ目次 | `_source/agent-api-members.json`（`AM-30`）、`AG-12` の ④、`design-mcp-relay.md` 3.1、`generate_agent_api.py`、`mcp-relay-server.ts` |
| 3 | 短い注意（`which` = `notes`） | `_source/agent-api-members.json` の `schemaNotes`、`generate_mcp_tool_descriptions.py`、`agent_api_members_json_to_md.py`、`mcp-tool-translator.ts`（`schemaNotes`） |
| 4 | 初期化の案内: 「読み書きの前にスキーマを読め」を外し、「書く前に注意を読み、要る定義だけを `readSchema` で引く。読むだけなら道具の答えの列の説明で足りる」へ | `_source/agent-api-members.json` の `mcpInstructions` |
| 5 | 資源 2 つと道具 `readSchema` の両方を残す | 変えない |

## 2. 影響

```
仕様の他の行     AG-12 の ④、表 T-107 の AM-30、design-mcp-relay.md 3.1、表 T-064 の PI-40（schemaNotes を足す）
生成物           tbl-agent-api-members.md・tbl-published-entries.md・mcp-tool-descriptions.json・agent-api-members.ts の版
実装             取次の readSchema だけ。ページは変えない
試験             readSchema の全部の本文を {which} だけで期待した試験、案内の文を引く試験、Agent API の版を引く試験を揃える
形式の版         上げない（FR-073）。Agent API の版（AG-1）は AM-30 の引数を足すので上げる
毎フレームの仕事 無い
```

## 3. 測ったこと

- 文書のスキーマの `$defs` は 24（`Project`・`Task`・`Dependency` ほか）、一番上の鍵は 6（Python で数えた）。

## 4. 利用者の実物の手順（実装の後に確かめる）

1. 束を入れ直し、AI に「GRS のスキーマの目次を見せて」と頼む → AI は `readSchema` を呼び、定義の名の一覧を答える（全部の本文は読まない）。
2. AI に「タスクを 1 つ足して」と頼む → AI は先に `readSchema` の `notes` と `Task` の定義だけを読んでから書く。
