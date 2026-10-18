# CR-799 —— 取次は初めての AI に足りなかった説明を足し、スキーマを道具でも渡し、保存した所を絶対の所で返し、版を日時にする

> 状態: ✅ **当てた** —— 2026-10-18、取次の直しの席（`unruffled-edison-a20654`）が起草し、調整役の指示で同じ席が当てた。仕様 → 実装 → 仕様だけを読む別の体の試験（`tests/contract/cr-799-*` 3 本 53 件）→ 関門の順。
> 元: 初見の AI の試験の席（`7f05d884`）が、`2be0c96c` の取次で、初めて GRS を使う AI に 7 つの頼みをさせた（7 つとも通った）。所見は 27。利用者がそれを R1〜R6 に裁き、R1〜R4 と R6 を今夜の α に、R5 を α の後に回した。
> 当てる裁定: `JDG-2813`（R1）・`JDG-2814`（R2）・`JDG-2815`（R3）・`JDG-2816`（R4）・`JDG-2818`（R6）。後に回す裁定: `JDG-2817`（R5）。覆す裁定: 無し —— R4 は `CR-791` が `design-mcp-relay.md` 6 節に置いた版の決め方（`package.json` の版 + 単一 `.html` の SHA-256 の頭 12 桁）を置き換える（`JDG-2816`）。
> 新しい ID: 表 T-107 の `AM-30`（`readSchema`）。
> 消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`（構造化した日程データを AI に渡す）。初めて GRS を使う AI が、説明だけでは分からず人に問うか当て推量した所（27 のうち 14 の説明・1 つの答えの形・1 つの道具・版）を、α の前に塞ぐ。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2.21`**（1 つの仕事は 1 か所）・**`R2.5`**（名は指すものを言う）。
出たこと:
① `pageNotConnected` の説明の文は、原稿の外（`mcp-tool-translator.ts`）に手で書かれ、初期化の案内（原稿）と食い違っていた（「Agent API を有効に」だけ）—— 原稿から刷る（`R2.21`）。
② スキーマを返す道具は資源と同じ本文を 2 か所で持ちうる —— 取次が中に持つ 1 つの本文を、資源と道具の両方が返す（`R2.21`）。
③ 版の数（`0.0.0+<SHA>`）は、人がいつのものかを読めない —— 版の名が指すもの（作った時）を言う（`R2.5`）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ `readSchema` は 表 T-107 の行（`AM-30`）にし、`AG-12` の ④（道具は 表 T-107 と 1 対 1）を崩さない。ただし取次が自分で答え、ページはこのメンバを持たない —— 原稿の行に `answeredBy: "relay"` を置き、生成器は `AgentApi` と `RelayedParams` からこの行を外す。ページに 2 つのスキーマ（`grs-commands.schema.json` だけで 66 KB）を持たせない。ページが繋がる前にも答える。
2. ⭐ semver の形は `年.月日.時分秒`（例 `2026.1018.81234`）—— pre-release の印（`0.0.0-20261018T081234Z`）は、入れる側がその版を「不安定」と読みうる。3 つの数なら semver として比べた順が時刻の順になる。semver は数の頭の 0 を許さないので、月日と時分秒は頭の 0 を落とす（1 月 5 日 0 時 12 分 34 秒は `2026.105.1234`）。
3. ⭐ 版の時刻は `git log -1 --format=%ct HEAD`（組み立てたコミットの時刻）—— 作業木に未コミットの変更があっても版は変わらない。git が無ければ組み立てを止める（当て推量の版を出さない）。
4. ⭐ 頁の版は、頁の原稿に場所（`<span data-built-at>`・`<span data-relay-version>`）だけを置き、公開の組み立て（`.github/workflows/pages.yml`）が `tools/stamp_download_page.mjs` で書き入れる —— 字だけなので頁の CSP の SHA-256 は変わらない。
5. ⭐ `savedTo` と `backedUpTo` は、取次が書いた実の所（リンクとジャンクションを解いた所）の絶対の所。
6. ⭐ 頁の 2 か所の文（警告の注の「ファイルを読んだり変更したりしない」・手順 10 の「中継は何も保存しない」）は、`CR-796` の保存のあとは偽なので、R6 の塊と一緒に直した。
7. ⭐ 頁の英語の塊の画面の語（`Configure`・`Browse`・`Save`）は、日本語の画面の語（利用者が示した `設定`・`参照`・`保存`）の英語の画面の語と見込んだ —— **未照合**。
8. ⭐ 頁が書く `C:\Users\<name>\Documents\GRS` は、事前の検査（`tools/precheck.py` の絶対の所の罠）に掛かる。利用者がこの形で書けと定めたので、罠が既に許す「中を省いた `C:\...\`」と同じく、利用者の名の所が `<name>`（HTML では `&lt;name&gt;`）の形だけを許すように罠を狭く広げた —— 名の入った所は今どおり捕まる。

---

## 1. 対応

### 1.1 直すこと（今夜の α）

| 裁定 | 所見 | 直すこと | 直す原稿・文書 |
| --- | --- | --- | --- |
| R1 | 1 | `pageNotConnected` の説明を原稿から刷り、「ページのヘッダーの Agent API ボタンを押す」と言う | `_source/agent-api-members.json`、`mcp-tool-translator.ts` |
| R1 | 2 | 文書のスキーマの説明で、画面に出る名は `project.title` だと言う | 文書のスキーマの原稿 |
| R1 | 5 | `readSearchRows` で、タスクの総数がマイルストーンを含むかを 1 文。別のタブで開いた文書が取次の頁へ移らないことを初期化の案内の繋ぐ段に 1 文 | `_source/agent-api-members.json` |
| R1 | 12・13 | `readSearchRows` の `word` が合わせる列、答えの列のうち予定と実績 | 同上 |
| R1 | 14（文だけ） | `focusTask` は履歴に 1 段を足すことを `focusTask` と `undoEdit` の説明に | 同上 |
| R1 | 15・16 | 新しいタスクの `uid` の振り方（`uidHighWaterMark` + 1）と同じ束の後の命令での指し方を例と共に、`shapeKind` の値 | `_source/document-commands.json` |
| R1 | 18 | `malformedRequest` の説明が「table T-108」を引く —— 命令と欄の名を言う | `agent-api-members.ts` |
| R1 | 21・22 | `readDelayDiagnostics` の 3 つの分の量と分から日への段、`walls` の同じ `DW-1` の見分け | `_source/agent-api-members.json` |
| R1 | 25 | 「同じ名でもう一度保存して」と言われても上書きの前に 1 度問う | 初期化の案内 |
| R1 | 26・27 | `requestOpenFile` の後に人が置き換え・追加・重ねる（`QN-17` の先、`OP-3`）を選ぶこと、開いた文書が入ったことを `watchChanges`／`readStamp` と `project.title` で知ること | `_source/agent-api-members.json` |
| R2 | 23 | `savedTo`（と `backedUpTo`）は絶対の所 | 表 T-400 の `AV-21`、表 T-035 の `AG-12` の ⑨、`mcp-relay-server.ts` |
| R3 | 3 | 新しい道具 `readSchema {which: "document" \| "commands"}`（`AM-30`）—— 2 つの資源と同じ本文。初期化の案内の逃げ道は `exportJson` から `readSchema` へ。メンバの数は 22 → 23 | 表 T-107、`AG-12` の ④、`design-mcp-relay.md` 3.1、`generate_agent_api.py`、`mcp-relay-server.ts` |
| R4 | 6・7 | 版は組み立てたコミットの時刻（UTC）。束の説明の頭と、入手する所の頁の 2 つのボタンの下に出す | `design-mcp-relay.md` 6 節（`CR-791` の版を置き換える）、`tools/relay_version.mjs`（新）、`tools/build_relay_bundle.mjs`、`vite.relay.config.ts`、`tools/stamp_download_page.mjs`（新）、`.github/workflows/pages.yml`、`docs/download/index.html` |
| R6 | — | 入手する所の頁の「Claude から GRS を使う」に、保存先の既定と変え方、OneDrive へ移したドキュメントの注意、`Confirm before overwrite` の 1 行（英語と日本語） | `docs/download/index.html`、`design-mcp-relay.md` 6 節 |

### 1.2 α の後に回すもの（R5、`JDG-2817`）—— ⛔ この CR では当てない

所見 4・8・9・10・11・14（振る舞い —— `focusTask` が履歴に段を足すこと自体）・17・20・24。中身は初見の AI の試験の席（`7f05d884`）の報告が持つ。α の後に新しい CR 番号で起こす（`docs/development-records/handoff.md` に記した）。

## 2. 影響

```
仕様の他の行     AG-12 の ④（readSchema は取次が答える）・⑨（絶対の所）、表 T-107（23 のメンバ）、表 T-400 の AV-21、
                 design-mcp-relay.md 3.1・6
生成物           tbl-agent-api-members.md・tbl-document-commands.md・mcp-tool-descriptions.json・agent-api-members.ts と
                 relayed-call.ts の生成の所・文書のスキーマ
実装             取次: readSchema・絶対の savedTo・版。ページ: malformedRequest の説明の文だけ（振る舞いは変えない）
配る物           束の manifest.json の version と description、serverInfo の版、頁の版（公開の組み立てで書き入れる）
試験             メンバの数・説明の文を引く試験（cr-765・cr-613・cr-791・cr-796-s*・uf-27-28-29・built-relay・cr-675）を揃える。
                 新しい試験は別の体が仕様だけから書く
形式の版         上げない（FR-073）—— GRS JSON の形は変わらない。Agent API の版（AG-1）はメンバを足すので上げる
毎フレームの仕事 無い
```

## 3. 測ったこと

- `node tools/relay_version.mjs` を `a0febca7` で打つと `{"builtAt":"2026-10-18T08:31:28Z","semver":"2026.1018.83128"}`。`versionOfInstant` に 2026-01-05T00:12:34Z を渡すと `2026.105.1234`。
- `grs-commands.schema.json` の大きさ 66,080 バイト（`ls -la docs/spec/_source/grs-commands.schema.json`）。

## 4. 利用者の実物の手順（実装の後に確かめる）

1. 公開の後、入手する所の頁の `GRS.html` のボタンの下に「版 2026-10-18T…Z（UTC）」、`grs-relay.mcpb` のボタンの下に「版 2026.1018.…、ビルド 2026-10-18T…Z（UTC）」が出る。
2. 束を入れ直すと、Claude Desktop の 設定 › 拡張機能 の GRS Relay に同じ版が出る。
3. 頁の「Claude が保存する場所と、その変え方」に、設定 → 拡張機能 → GRS Relay の 設定 → Save folder → 参照 → 保存 の道筋と OneDrive の注意がある。
4. AI に「plan.json で保存して」と頼むと、AI は `C:\Users\<name>\Documents\GRS\plan.json` のような絶対の所を答える。
