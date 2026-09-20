---
type: Working Note
title: 将棋 PoC の復元記録
description: e89a17a で消えた ai-cowork-trial/shogi/ を 2026-09-21 にこの場所へ戻した記録。
tags: [ai-integration, poc]
phase: proof-of-concept
status: reference
---

# 将棋 PoC の復元記録

## 何を戻したか

`e89a17a`（2026-08-12「Reset the repository to the handover input set」）で
リポジトリから消えた **将棋トライアル一式**を、`e89a17a^` から取り出して置き直した。
**8 ファイルすべてバイト同一**（`git hash-object` で blob と照合済み）。

| いま | もと |
| --- | --- |
| `shogi/README-ja.md` | `ai-cowork-trial/shogi/README-ja.md` |
| `shogi/rules.mjs` | `ai-cowork-trial/shogi/rules.mjs` |
| `shogi/server.mjs` | `ai-cowork-trial/shogi/server.mjs` |
| `shogi/wait.mjs` | `ai-cowork-trial/shogi/wait.mjs` |
| `shogi/turn.mjs` | `ai-cowork-trial/shogi/turn.mjs` |
| `shogi/say.mjs` | `ai-cowork-trial/shogi/say.mjs` |
| `shogi/public/index.html` | `ai-cowork-trial/shogi/public/index.html` |
| `shogi/slash-command-shogi.md` | `.claude/commands/shogi.md` |

⛔ **中身は書き換えていない**（この成果物の規則）。
そのため各ファイルの見出しコメントや `README-ja.md` の起動例は
**もとの `ai-cowork-trial/shogi/...` というパスのまま**である。上の表で読み替えること。
`README-ja.md` が指す「○×（`../`）」も、いまはこの場所に無い（下記「戻していないもの」）。

## 動くことの確認（2026-09-21 実測）

`rules.mjs` を取り込んで数えた。`README-ja.md` が載せている既知の正解値と一致する。

| 測ったもの | 値 |
| --- | --- |
| 初期局面の合法手（先手・後手とも） | 30 |
| 全筋に歩があるときの歩打ち（二歩） | 0 |

⚠️ 駒の持ち主は `sente` / `gote` ではなく **`human` / `ai`** である（`rules.mjs` の `initialBoard`）。

## 動かし方

```bash
node previous-project-result/10-agent-interface/shogi/server.mjs
```

`http://localhost:8789` を開く。人間が先手（下）、AI が後手（上）。
`slash-command-shogi.md` は、当時 `/shogi` として使っていた AI 側の手順書である
（`wait.mjs` で人の着手を待ち、`turn.mjs` で着手と発言を 1 往復で返す）。

当時は `.claude/launch.json` に次の行があり、`preview_start` で起動していた。
**この行も `e89a17a` で消えている**ので、同じように使うなら戻すこと（パスは新しい場所に直してある）。

```json
{
  "name": "ai-cowork-shogi",
  "runtimeExecutable": "node",
  "runtimeArgs": ["previous-project-result/10-agent-interface/shogi/server.mjs"],
  "port": 8789
}
```

⚠️ `server.mjs` は自分の隣に `state.json` を書く。動かすとこの `shogi/` に対局の途中状態が残る。

## 戻していないもの

同じ `e89a17a^` には、将棋の前に作った **○×版**と各種の実測プローブも在る。
将棋 PoC の依頼範囲ではないので戻していない。必要なら同じ手で取り出せる。

| 残っているもの | 中身 |
| --- | --- |
| `ai-cowork-trial/server.mjs` ／ `public/index.html` ／ `wait-for-turn.mjs` | ○×版（人と AI の 1 文書ライブ編集） |
| `ai-cowork-trial/agent-api-exposure-probe.mjs` ほか 4 本 | `file://` の実測プローブ（結論は `../ai-cowork-trial-findings-ja.md` に入っている） |
| `ai-cowork-trial/draft-for-handover/` | この `10-agent-interface/` の 5 文書の草稿 |

取り出し方:

```bash
git show e89a17a^:ai-cowork-trial/server.mjs > <置き先>
```
