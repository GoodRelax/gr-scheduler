---
type: Working Note
title: handover への組込み手順
description: どのフォルダへ入れ、どの既存文書へ 1 行足すか。検査コマンド付き。組込み後に破棄する。
tags: [agent-interface]
phase: packaging
status: draft
---
# handover への組込み手順

- 日付: 2026-08-02
- **この文書は handover へ入れない。** 組込みが終わったら破棄する。
- **前提**: `handover/` は現在**別作業が進行中**である。**この手順を実行してよいのは、
  その作業が終わり、ユーザーが指示したときだけである。** 勝手に触らない。

---

## 1. 置き場所

`handover/09-architecture/` まで埋まっているので、**`handover/10-agent-interface/`** を新設する。

```
handover/
└── 10-agent-interface/
    ├── ai-cowork-trial-findings-ja.md      Reference   （事実。そのまま入る）
    ├── agent-interface-requirements-ja.md  要 格上げ判断（採否の決定後に Decision Record）
    ├── agent-interface-spec-ja.md          要 格上げ判断（同上）
    ├── agent-interface-samples-ja.md       Reference   （採否の決定後）
    ├── OPEN-ITEMS-ja.md                    Open Items  （※ 名前が衝突する。§3 を見る）
    └── samples/
        ├── grs-document-with-revision-stamp.json
        └── agent-apply-request-and-outcomes.json
```

`README.md` と `MERGE-PLAN-ja.md` は**持っていかない**（このドラフト一式の入口と作業手順なので、
handover に入ると二重の入口になる）。

---

## 2. 格上げの判断（**これを先に済ませる**）

要求 18 件と仕様は **`status: draft` / `type: Working Note`** のまま入れてはいけない。
`handover/` は「読めば決まっていることが分かる」ことを価値にしているので、
**未決のものが決定と同じ棚に並ぶと台無しになる。**

| 判断 | 結果 |
|---|---|
| 要求 18 件を**採用する** | `type: Decision Record` / `status: stable` へ書き換えて入れる |
| 要求の一部だけ採用 | 採用分だけ本文に残し、**落とした分は理由とともに `DISCARDED-ja.md` へ 1 行**足す |
| **採用しない** | `10-agent-interface/` を作らず、**`ai-cowork-trial-findings-ja.md` だけ**を `06-background/` へ `type: Background` で入れる |

> **`authority` は絶対に付けない。** この領域に「正」を作ると 5 つ目になる
> （`handover/README.md` §`authority`「**5 つ目を作らない**」）。

---

## 3. 名前の衝突（**先に解消する**）

`handover/` は **`README.md` を除き全文書のファイル名が一意**である（同 §1-1）。
本ドラフトの `OPEN-ITEMS-ja.md` は **`handover/OPEN-ITEMS-ja.md` と衝突する。**

**対処**: 入れるときに **`agent-interface-open-items-ja.md`** へ改名する。
内容は変えない（合流もしない — あちらは MS Project 実機の 3 件専用）。

---

## 4. 既存文書へ足す 1 行（**本文を複製しない**）

`handover/` の原則は「**正が 2 つになるものは片方を破棄する**」である。
したがって**足すのは所在を指す 1 行だけ**にする。

| 足す先 | 何を足すか |
|---|---|
| `handover/README.md` §1 読む順 | 行 1 本（順位は 15 の次、`NEXT-STEPS-ja.md` の前） |
| `handover/README.md` §2 フォルダ構成 | ツリーに `10-agent-interface/` を 1 ブロック |
| `handover/NEXT-STEPS-ja.md` | **ステップ 3 の表に 1 行**（**描画の純粋性＝決定-1** と **公開点は 1 か所・既定非公開＝決定-4** を**レビュー観点として登録**）。**件数 18 → 20 に更新** |
| `handover/NEXT-STEPS-ja.md` ステップ 3（localStorage のキー設計） | **1 行**: **自動保存のキーは文書ごと**（`grsched.autosave.<documentId>`）。**`file://` では全ローカルファイルが保管庫を共有する**ため（決着-8 / 決定-5） |
| `handover/NEXT-STEPS-ja.md` **2-1 視覚モック** ／ **2-5 通知** | **1 行**: **起動時の保留用件（ファイル復帰・復旧確認・AI 連携）を 1 枚に集約**し、AI 有効中は**常時表示**を出す（決定-5） |
| `handover/NEXT-STEPS-ja.md` 5-1（JSON Schema） | **`revisionStamp` と `changeLog` を含める**（決定-2 / 決定-3）。`agentApiVersion` は含めない |
| `handover/09-architecture/handover-architecture-entry-ja.md` §4 | 「**意図的な空白**」の表に、ライブラリ／CLI 出力の判断が乗ることを 1 行 |
| `handover/05-security-a11y/security-design.md` §2 | 脅威モデルに **1 段落**。**文面は `agent-interface-spec-ja.md` §6-1 に用意済み**（そのまま貼る）。要点は「**API は信頼境界ではないが、既定では公開しない**」（`A-7` / 決定-4） |
| `handover/05-security-a11y/security-design.md` §5 | **1 行**: **`file://` では localStorage も IndexedDB も全ローカルファイルで共有される**（決着-8 で実測）。同節の「同一オリジン JS から平文で読める」は、`file://` では「**そのマシンの全ローカルファイル**」を意味する。**`http(s)` 配信で消える** |
| `handover/02-data-model/grs-native-erd-ja.md`（**データ構造の正**） | **直接書き足さない。** `documentId` が要る理由と最小の形は `agent-interface-spec-ja.md` §2-3 にある。**採否は change-manager 経由で正の側に節を起こす**（決定-5） |
| `handover/03-ui-naming/handover-ui-parts-ja.md`（**命名の正**） | **直接書き足さない。** 決定-6 の 4 語（`ConcurrentUpdate` / `BaseRevisionCheck` / `AutomaticReconciliation` / `ImportMerge`）を **§2-1 の日英対応表へ通す**。**`ImportMerge` は ERD §5.4 の「マージ」を*狭める*提案**なので、**採否をここで判断してもらう** |
| `handover/02-data-model/handover-data-model-entry-ja.md` | JSON 実例の**すぐ下**に、`revisionStamp` を足す提案の所在を 1 行（**実例そのものは変えない**） |

> ⚠️ **`grs-native-erd-ja.md`（データ構造の正）と `grs-document-settings-ja.md`（設定値の正）は触らない。**
> `revisionStamp` はどちらの管轄でもない（エンティティでも設定値でもない）。
> 触るとしたら**採用を決めたあとで、正の側に節を起こす**。ドラフトの側から書き足さない。

---

## 5. 組込み後の検査

```bash
# 1. 正が 4 つのままであること（5 つ目を作っていない）
grep -rl "^authority:" handover/ | wc -l          # 4

# 2. ファイル名の重複が README.md 以外に無いこと
find handover -name "*.md" -printf "%f\n" | sort | uniq -d   # README.md のみ

# 3. 全 .md に OKF フロントマターがあること
for f in $(find handover -name "*.md"); do head -1 "$f" | grep -q '^---$' || echo "NO FRONTMATTER: $f"; done

# 4. draft が残っていないこと（格上げ漏れの検出）
grep -rn "^status: draft" handover/            # 0 行

# 5. サンプル JSON が壊れていないこと
for f in handover/10-agent-interface/samples/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "BAD: $f"; done
```

---

## 6. 中立性の再確認

`handover/README.md` §0-5 に従い、**組込み前に次を確認する。**

- 特定業種の例示が入っていないこと（本ドラフトは確認済み）
- 特定製品名が入っていないこと。**例外は `MS Project` / `MSPDI` のみ**
- **トライアルの題材（○×・将棋）が仕様の説明に紛れ込んでいないこと**
  — 題材に触れてよいのは `ai-cowork-trial-findings-ja.md` だけである

```bash
# 題材の語が仕様側へ漏れていないこと
grep -rn "将棋\|○×\|棋譜\|持ち駒" handover/10-agent-interface/ \
  | grep -v "ai-cowork-trial-findings-ja.md"      # 0 行
```

---

## 7. 試作コードの扱い

`ai-cowork-trial/` の `.mjs` / `.html` は **handover へ持っていかない。**

**対象**（実測の再現に使うもの）:

| ファイル | 何を裏づけるか |
|---|---|
| `file-protocol-probe.html` | 決着-1 / 決着-2 / 決着-3（人が操作） |
| `file-protocol-automation-probe.mjs` | 決着-4 / 決着-5 |
| **`agent-api-exposure-probe.mjs`** | **決着-6**（既定非公開・起動側の有効化・取り消し不能） |
| **`cowork-live-probe.html` ＋ `cowork-live-attach.mjs`** | **決着-7**（人間が開いている画面への接続） |
| **`startup-storage-probe.mjs`** | **決着-8**（`file://` の保管庫は全ローカルファイルで共有） |
| `shogi/` ／ `server.mjs` | トライアル本体（`ai-cowork-trial-findings-ja.md` §1-5） |

- **理由**: `handover/README.md` §0-1「コードは引き継がない。**コピペ禁止**」。
  トライアルのコードは**題材（盤ゲーム）の語彙**で書かれており、GRS の確定名ではない。
- **残すもの**: 要求・仕様・サンプル・実測だけ。
- **消すか**: リポジトリに残すなら `ai-cowork-trial/` のまま置く。
  `handover/DISCARDED-ja.md` に「**引き継がなかった資産**」として 1 行足すと、
  次期が「同じものを作り直さない」ために役立つ。
