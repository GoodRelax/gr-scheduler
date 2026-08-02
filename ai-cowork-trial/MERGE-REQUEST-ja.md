---
type: Working Note
title: Agent Interface ドラフトの組込み依頼プロンプト
description: draft-for-handover 一式を handover/10-agent-interface/ へ組み込むための依頼文。handover 側の作業が一段落したセッションに貼る。
tags: [agent-interface, packaging]
phase: packaging
status: draft
---
# Agent Interface ドラフトの組込み依頼プロンプト

> **使い方**: 以下の `---` から下を、**`handover/` を触っているセッションが一段落したとき**に、
> そのセッションへのメッセージとして貼る。**新規セッションでも動くように自己完結させてある。**

---

gr-scheduler リポジトリで、**別セッションが作った成果物の組込み**をお願いします。

## 0. 絶対に守ること

- **`git commit` / `git push` / `git tag` を実行するな。** ユーザーが手動で行う。
  コミットを勧めるときは、**英語の Summary（約 50 字・命令形）と Description** を貼れる形で出すこと。
- **`authority` を持つ 4 文書に 5 つ目を作るな**（`handover/README.md` §`authority`）。
- **正の側（データ構造 / 設定値 / 命名 / 予実）を、ドラフトの側から書き換えるな。**
  正へ入れたい提案が 2 件あるが、**どちらも change-manager 経由**である（§5）。
- コードとスクリプトは**英語かつ ASCII**。文書は日本語。
- **`ai-cowork-trial/` 側は完成している。書き換える必要はない。**
  格上げ（`status` / `type` の変更）は**コピー先で**行う。

## 1. 何を頼みたいか

**`ai-cowork-trial/draft-for-handover/` の一式を、`handover/10-agent-interface/` へ組み込んでほしい。**

手順は **`ai-cowork-trial/draft-for-handover/MERGE-PLAN-ja.md` に全部書いてある。**
本プロンプトはその入口であって、手順の写しではない（**正を 2 つ作らない**）。

## 2. まず読むもの（この順）

| 順 | ファイル | 何のために |
|:--:|---|---|
| 1 | `ai-cowork-trial/draft-for-handover/README.md` | 一式の身分と読む順。**「これは決定ではない」の断り**がある |
| 2 | `ai-cowork-trial/draft-for-handover/MERGE-PLAN-ja.md` | **作業手順そのもの。** 置き場所・格上げ判断・名前の衝突・足す 1 行・検査コマンド |
| 3 | `ai-cowork-trial/draft-for-handover/OPEN-ITEMS-ja.md` §0 と §0-3 | **実測 8 件**と**決定 6 件**。組込みの根拠 |

## 3. 中身は何か（**要約であり、正ではない**）

**人間と AI が 1 つの日程表を同時に編集するための「機械向けインターフェース」**の要求・仕様・実測・サンプル。
トライアル 2 本（○×・将棋）と `file://` の実測から起こしてある。

**決定 6 件**（理由はすべて `OPEN-ITEMS-ja.md` §0-3 にある。**覆さない**）:

| | 決めたこと |
|---|---|
| **決定-1** | 描画は **DOM 非依存の純粋関数**。成果物は当面**単一 `.html` だけ** |
| **決定-2** | 画面に **AI とのチャット欄**を置く。保存するのは会話ではなく **`changeLog`**（どの `revision` で・誰が・なぜ） |
| **決定-3** | **`revisionStamp` を保存**（`revision` / `lastEditedBy` / `updatedAt`）。`agentApiVersion` は入れない |
| **決定-4** | GRS Agent API は**既定で公開しない**。公開点は **`globalThis.grSchedulerAgentApi`**。人間の有効化、またはエージェントの起動時フラグでのみ現れる |
| **決定-5** | 起動は**捨てずに比べる**（4 分岐）。自動保存のキーは**文書ごと**。起動時の用件は**1 枚**に集約 |
| **決定-6** | 同時更新と取込の語を分離 — `ConcurrentUpdate` / `BaseRevisionCheck` / `AutomaticReconciliation` / `ImportMerge` |

## 4. 実測 8 件（**測り直さなくてよい**）

全数と数値は `OPEN-ITEMS-ja.md` §0。再現コマンドもそこにある。要点だけ:

- `file://` から**兄弟ファイルの取得は拒否される** → **投入経路は文書の埋め込みだけ**
- `file://` でも**ファイル保存の仕組みは使える**。同じハンドルへの再保存はダイアログ無し。
  ただし**リロードで権限が `prompt` に戻り、1 クリックは省けない**
- **ダウンロードは上書きされず ` (1)` が増える** → 「編集中のファイル」をダウンロードで実現しない
- **`file://` のページは外から操作できる。** AI が開いた画面（決着-4）でも、**人間が開いている画面**でも（決着-7）
- **埋め込み時の `<` エスケープは必須**。省くと JSON が壊れ、**内容が本文へ漏れた**（対照実験）
- **既定非公開は実際に成立する。** ただし**一度渡した参照は取り消せない**（決着-6）
- **`file://` では全ローカルファイルが 1 つの保管庫を共有する**（localStorage も IndexedDB も。決着-8）

## 5. 最初に決めること（**これを決めないと入れられない**）

**MERGE-PLAN §2 の格上げ判断**である。ユーザーに確認すること。

| 判断 | 結果 |
|---|---|
| 要求 18 件を**採用する** | `type: Decision Record` / `status: stable` へ書き換えて入れる |
| **一部だけ採用** | 採用分を残し、落とした分は理由とともに `handover/DISCARDED-ja.md` へ 1 行 |
| **採用しない** | `10-agent-interface/` を作らず、**実測の記録だけ**を `06-background/` へ入れる |

## 6. 正へ通す提案が 2 件ある（**勝手に書き足さない**）

| 提案 | どの正か | 所在 |
|---|---|---|
| **`documentId`**（文書の識別子。自動保存のキーに要る） | `02-data-model/grs-native-erd-ja.md` | `agent-interface-spec-ja.md` §2-3 に「要る理由と最小の形」 |
| **決定-6 の 4 語**、特に **`ImportMerge`** | `03-ui-naming/handover-ui-parts-ja.md` §2-1 | 同 §0-1。**`ImportMerge` は ERD §5.4 の「マージ」を*狭める*提案**である |

**どちらも change-manager 経由**で、正の側に節を起こすかどうかを判断する。

## 7. 既存文書へ足す 1 行（**本文を複製しない**）

**一覧は `MERGE-PLAN-ja.md` §4 にある**（`README.md` の読む順とツリー、`NEXT-STEPS-ja.md` の 4 行、
`security-design.md` の 2 行、`09-architecture` と `02-data-model` の各 1 行）。

**`security-design.md` へ貼る文面は `agent-interface-spec-ja.md` §6-1 に用意してある。** そのまま貼れる。

## 8. 持っていかないもの

- `README.md` と `MERGE-PLAN-ja.md`（**入口と作業手順**。handover に入ると二重の入口になる）
- **`ai-cowork-trial/` の `.mjs` / `.html`**（`handover/README.md` §0-1「コードは引き継がない。**コピペ禁止**」）。
  リポジトリには `ai-cowork-trial/` のまま残し、**`DISCARDED-ja.md` に「引き継がなかった資産」として 1 行**足すとよい

## 9. 組込み後の検査

**`MERGE-PLAN-ja.md` §5 と §6 にコマンドがある。** 4 点だけ再掲する（**実行は §5 のものを使う**）:

1. `authority` を持つ文書が **4 のまま**であること
2. ファイル名の重複が `README.md` 以外に**無い**こと
3. **`status: draft` が残っていない**こと（格上げ漏れの検出）
4. **題材の語（将棋・○×）が仕様側へ漏れていない**こと

## 10. 申し送り 2 件

- **`handover/NEXT-STEPS-ja.md` の件数に不整合がある。** 末尾の注記は「18 → 17 になった」だが、
  件数表の合計は **16**（1-1 / 4-1 / 6-1 / 6-2 の 4 件が決着済み）。**組込みで件数を触るときに直すとよい。**
- **ブラウザ拡張を使う経路だけ未測定。** ただし O-2 が問うていた「入れるか」は決着-7 で答えが出ており、
  **未決事項ではない。何もゲートしない。**

以上です。**まず `MERGE-PLAN-ja.md` を読んで、§5 の格上げ判断をユーザーに確認してください。**
