---
type: Working Note
title: Agent Interface サンプル
description: 文書の実例・書き込みの実例・監視ループ・起動時注入・トライアルとの対応表。
tags: [agent-interface, samples]
phase: proof-of-concept
status: draft
---
# Agent Interface サンプル

- 日付: 2026-08-02
- 対応する仕様: `agent-interface-spec-ja.md`
- **これは説明用の実例である。スキーマではない。**
  機械可読なスキーマは**まだ 0 件**（`handover/NEXT-STEPS-ja.md` 5-1）。

---

## 1. ファイル

| ファイル | 中身 |
|---|---|
| `samples/grs-document-with-revision-stamp.json` | **文書の実例。** 既存の JSON 実例に `revisionStamp` と `changeLog` を足しただけの形 |
| `samples/agent-apply-request-and-outcomes.json` | **書き込みの実例 4 本**（受理 / 版ずれ拒否 / 原子的な巻き戻し / 監視ループ） |

どちらも `node -e "JSON.parse(...)"` で構文検査済みである。

> ⚠️ 文書の実例は **`documentSettings` を省略している。**
> 本物は**常に全項目を書き出す**（`handover/02-data-model/grs-document-settings-ja.md` §2）。
> 実例の目的は「`revisionStamp` と `changeLog` が**どこに座るか**」を示すことなので、
> 既存の完全な実例（`handover/02-data-model/handover-data-model-entry-ja.md` §3）を**複製していない**。
> **正はあちらである。**

---

## 2. 一往復のかたち

**人間が話しかけ、AI が読んで、直して、答えて、また待つ。** これが 1 サイクルである。

```
人間: 画面のチャットに書く                      -> revision 10 -> 11
AI  : 起きる（sinceRevision 10 で待っていた）
AI  : readDocument() で 11 を読む
AI  : applyCommands({ baseRevision: 11, commands: [...], changeExplanation: "..." })
                                                 -> revision 12
AI  : watchChanges({ sinceRevision: 12 }) で また待つ
```

**呼び出しは 3 回である**（起床 → 読む → 書く＋理由を残す）。
`applyCommands` が新しい `revision` を返すので、**待機を張り直すために読み直す必要がない**（`A-18`）。

実際のやり取りは `samples/agent-apply-request-and-outcomes.json` の
`example1_acceptedBatch` と `example4_watchLoop` にある。

---

## 3. 版ずれの実例（**1 セッションで 6 回起きた**）

```jsonc
// AI は revision 10 を読んで書こうとした
{ "baseRevision": 10, "editedBy": "agent", "commands": [ /* ... */ ] }

// その間に人間が確定していた
{
  "accepted": false,
  "rejectionReason": "stale-base-revision",
  "expectedRevision": 12,
  "revision": 12,
  "document": { /* 現在の文書がそのまま返る */ }
}
```

**やり直し方**:

1. 返ってきた `document` を使う（**読み直しの往復は要らない**）。
2. **同じコマンドを機械的に再送しない。** 人間が何を変えたかを見て、**判断からやり直す。**
3. `baseRevision` を `12` にして送る。

> トライアルでは 6 回とも 2 の手順を踏んだ。**「拒否されたから再送」ではなく「拒否されたから読み直す」**。
> 日程表なら「AI が動かそうとしたタスクを、人間が先に別の場所へ動かしていた」という状況にあたる。

---

## 4. 原子的な巻き戻し

`samples/agent-apply-request-and-outcomes.json` の `example3_atomicRollback`。

1 番目のコマンドは正しく、2 番目が不正な場合、**1 番目も適用されない**。
文書は一切変わらず、`revision` も進まない。

> **なぜ要るか**: 日程の変更は「タスクを動かす」「依存を張り直す」「行を移す」が
> **セットで初めて意味を持つ**。片方だけ通ると、通知（`handover/NEXT-STEPS-ja.md` 2-5 の 8 系統）で
> 説明できない中途半端な文書が残る。

---

## 5. 起動時注入（`file://` で成立する唯一の経路）

### 5-1. ビルド成果物の側

```html
<script type="application/json" id="grs-boot-document">null</script>
```

### 5-2. 注入する側（生成の実例）

```js
// Build a self-contained "GRS + data" file. Works from file:// with no server.
import { readFileSync, writeFileSync } from 'node:fs';

const shellHtml = readFileSync('grs.html', 'utf8');
const documentJson = readFileSync('schedule.json', 'utf8');

// MUST escape '<' -- an unescaped "</script>" inside the payload ends the tag
// and breaks the whole page.
const payload = documentJson.replace(/</g, '\\u003c');

const injected = shellHtml.replace(
  /(<script type="application\/json" id="grs-boot-document">)null(<\/script>)/,
  `$1${payload}$2`,
);

writeFileSync('grs-with-schedule.html', injected, 'utf8');
```

### 5-3. 読む側（起動時）

```js
/** Read the injected document, or null when there is none. */
function readBootDocument(hostDocument) {
  const holders = hostDocument.querySelectorAll('#grs-boot-document');
  if (holders.length !== 1) {
    return { bootDocument: null, failureReason: 'boot-holder-not-unique' };
  }
  try {
    const parsed = JSON.parse(holders[0].textContent);
    return { bootDocument: parsed, failureReason: null };
  } catch {
    // Never swallow this silently -- notify, then start empty.
    return { bootDocument: null, failureReason: 'boot-document-unparsable' };
  }
}
```

> ⚠️ **投入された文書も「信頼できない入力」である**（`user-order.md` 62）。
> 解析できたことと、受け入れてよいことは別である。**通常の取込検証を必ず通す。**

---

## 6. トライアルとの対応

**トライアルの API を GRS の名前に置き換えたもの。** コードは写さない（`handover/README.md` §0-1）。

| トライアル | 本ドラフトの名前 | 変えた点 |
|---|---|---|
| `GET /api/state` | `readDocument()` / `readRevision()` | 読みを 2 つに分けた（版だけ欲しい場合が多い） |
| `POST /api/apply` | `applyCommands(request)` | **発言を同じ往復に載せられるようにした**（`A-18`） |
| `POST /api/chat` | `applyCommands` の `changeExplanation` | **専用の窓口をやめ、保存対象も「変更の理由」だけに絞った。** 会話だけで `revision` が進むのも避ける |
| `GET /api/events`（SSE） | `watchChanges(request)` | 起こす条件を「相手が何かした」に一般化 |
| `wait.mjs --since N` | `watchChanges({ sinceRevision })` | **`sinceRevision` を必須にした**（省略でビジーループ） |
| `{"type": "place"}` | `{"commandName": "update-task"}` | **`type` をやめた**（無意味な汎用語の禁止） |
| `actor: "human" \| "ai"` | `editedBy: 'human' \| 'agent'` | 「AI」は実装の呼び名。**役割で呼ぶ** |
| `{"type":"undo","count":2}` | `undo(steps)` | **コマンドから外した**（履歴操作は原子的な一括適用の外） |
| `turn.mjs` | — | **道具そのものは不要になる。** `applyCommands` が同じ仕事をする |

---

## 7. この実例が示していない

| 項目 | 状態 |
|---|---|
| `documentSettings` の全項目 | **正は `handover/02-data-model/grs-document-settings-ja.md`。複製しない** |
| 機械可読なスキーマ | **0 件**（`handover/NEXT-STEPS-ja.md` 5-1） |
| MSPDI 側の実例 | **0 件**（同 5-2）。`revisionStamp` は MSPDI へ書き出さない |
| 権限つきの拒否 | `document-locked` の実例は無い（`user-order.md` 65-2 は将来拡張） |
