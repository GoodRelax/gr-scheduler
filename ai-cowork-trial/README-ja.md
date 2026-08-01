---
type: Working Note
title: AI 共同編集トライアル — 人間と AI が 1 つの文書をライブ編集できるか
description: ○×ゲームを題材に、GRS Agent Interface の API 形状と同時編集規約を実地で確かめる試作。
tags: [ai-integration, poc]
phase: proof-of-concept
status: draft
---

# AI 共同編集トライアル

**目的**: 「人間と AI が、同じ 1 つの文書を、同時に見ながら編集する」ループが
実際に閉じるかを最小構成で確かめる。題材は ○×ゲームだが、**API の形は
次期 GRS の `window.grs` / MCP サーバにそのまま持っていく**ことを狙っている。

## 起動

Claude Code から `.claude/launch.json` の `ai-cowork-trial` を起動する（推奨）。
手動なら:

```bash
node ai-cowork-trial/server.mjs
```

ブラウザで <http://localhost:8788> を開く。**人間 = O、AI = X**。
AI は同じ API を HTTP で叩く（ブラウザ自動操作は不要）。

## API — 次期 GRS への対応

| このトライアル | 次期 GRS `window.grs` | 将来の MCP ツール |
|---|---|---|
| `GET /api/state` | `getDocument()` + `getRevision()` | `grs_get_document` |
| `POST /api/apply` | `applyCommands()` | `grs_apply` |
| `POST /api/load` | `loadDocument()` | `grs_load` |
| `GET /api/events` (SSE) | `on('change')` | `grs_watch` |
| `wait-for-turn.mjs` | 上記の購読をブロッキング化したもの | `grs_watch`（long-poll 形） |

## 手番の受け渡し（チャット不要）

人間は **セルを選択 → [OK]** で確定する。OK を押すまでサーバへは何も送らないので、
「人間の手番が終わる瞬間」が 1 点に定まる。

AI 側は `wait-for-turn.mjs` をバックグラウンドで走らせて待つ。文書が AI に手番を
渡した瞬間にプロセスが終了し、それが AI を起こす。**人間がチャットで「お前の番だ」と
言う必要がない。**

```bash
node ai-cowork-trial/wait-for-turn.mjs --actor ai --since 11
```

`--since` には**最後に読んだ revision** を渡す。これを省くと、既に処理済みの状態
（特に終局状態）で即座に起きてしまい、待機を張り直すたびに即 exit する
**ビジーループ**になる。実地で踏んだ。GRS の `grs_watch` も同じ規約が要る:
**「私が最後に読んだ revision より後の変更だけ通知しろ」**。

これは GRS でも同じ形になる: 人間が編集を確定 → AI が起きて読む → AI が書く →
また待つ。MCP 化するときは long-poll する `grs_watch` ツール 1 個に相当する。

## ここで確かめている規約

1. **`revision` 単調増加** — 読んだ後に相手が触ったかを 1 個の整数で判定できる。
2. **楽観ロック** — 書き込み時に `baseRevision` を申告し、食い違えば `409` で拒否して
   現在状態を返す。人間がドラッグ中に AI が書く状況の予行。
3. **バッチの原子性** — `commands[]` の途中で失敗したら全部巻き戻す。
   半端に適用された文書を絶対に残さない。
4. **push で伝わる** — サーバ外（curl）からの書き込みが、ページ側は何もしていないのに
   SSE で即座に反映される。「AI が書き換えて人間の画面に即反映」の実証。
5. **アクターの明示** — 誰の変更かを `lastActor` に残す。将来の共同編集での
   変更帰属・Undo 帰属の下地。

## 実測済み（2026-08-02）

- サーバ外からの `POST /api/apply` → ページが**リロードなしで**更新（`revision` 0→1、
  盤面に `O` が出現、ステータスが "Waiting for the AI (X)..." に変化）を確認。
- コンソールエラーなし。

## 未確認・このトライアルの範囲外

- `file://` 直開きでの共同編集（**原理的に不可**。両者が同じ状態を共有できないため
  サーバが要る。ここがサーバ前提にした理由）。
- 認証・多人数（将来の共同編集で必要）。localhost 限定・認証なしで動く。
- 競合の自動マージ（今は「後勝ち禁止・再読込して再試行」のみ）。

## 生成物

`state.json` はサーバが書き出す実行時ファイル。コミット対象外にしてよい。
