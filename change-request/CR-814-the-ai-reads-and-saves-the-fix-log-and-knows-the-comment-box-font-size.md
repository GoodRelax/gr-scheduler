# CR-814 —— AI は修正の記録を表として読み `.tsv` で書き出し、コメントボックスの文字の大きさを知る

> 状態: ✅ **当てた** —— 2026-10-19 朝、取次の席（`unruffled-edison-a20654`）が起草し、同じ席が当てた。仕様 → 実装 → 仕様だけを読む別の体の試験（`tests/contract/cr-814-*`）→ 関門の順。
> 元: 利用者 2026-10-19「コメントのフォントサイズはOK！  遅延診断のTSVと合わせて、AgentAPIやGRS Relayへの反映を適切なセッションに対応させるよう、調整役に依頼しろ」（`JDG-2915`）と、修正の記録の渡し方の答え「Cで頼む。…」（`JDG-2916`）。
> 当てる裁定: `JDG-2915`・`JDG-2916`。拡張（絞った状態で読む）は `CR-815`（`JDG-2919`）。
> 新しい ID: 表 T-107 の `AM-34`（`exportFixLogTsv`）。
> 消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`。人が画面でできるようになったこと（コメントボックスごとの文字の大きさ —— `CR-809`・`CR-811`・`CR-812`、修正の記録の `.tsv` —— `CR-813`）を AI にもさせる（`JDG-2766`）。

### ② レビュー観点のどの条項を当て、何が出たか

`R2.21`（1 つの仕事は 1 か所）—— `.tsv` の文字列は人の保存と同じ関数（`delayFixLogTsv`）で作り、窓の状態を読む部分だけを分けた。修正の表の行は窓が出すのと同じ組み立て（`shownFixRowsOf`）から作る。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ `Agent API` の版（`AG-1`）を上げた —— `applyCommands` が受ける命令が 2 つ増えた（`setCommentBoxFontSizePx`・`fitScheduleToScreenOnPage`）ので、呼び方が変わった。
2. ⭐ `exportFixLogTsv` は窓の語と列のフィルタを読まず、記録の全部の行を表の順で書く —— `Agent API` は画面の値を読まない（`AM-28` と同じ）。人の「.tsv で保存」は窓に出している行を書くので、絞っていれば中身が違う。絞った状態で読む道は `CR-815`。
3. ⭐ セルの語は英語（`readTableRows` と同じ）。
4. ⭐ 修正案と修正の記録の表は文書に見え方を持たない（`FR-155`）ので、`readTableRows` の `filters` はこの 2 つの表には効かない。
5. ⭐ スキーマの注意の名の検査（`CR-802`）が命令の名も知るようにした —— 注意が `setCommentBoxFontSizePx` を名指したため。

---

## 1. 対応

| 直すこと | 裁定 | 仕様の ID | 直す原稿・コード |
| --- | --- | --- | --- |
| スキーマの注意にコメントボックスの文字の大きさ（8〜24 px、`null` は 10 px）、`Agent API` の版 | `JDG-2915` | `AM-1`、「スキーマの注意」 | `_source/agent-api-members.json`、`tools/generate_mcp_tool_descriptions.py` |
| `readTableRows` に修正案の表・修正の記録の表 | `JDG-2916` | `AM-28` | 同上、`agent-api-members.ts`、`delay-diagnostics-report.ts`（`delayFixColumnHeadings`・`delayFixTableRows`） |
| `exportFixLogTsv`（値か、`fileName` で保存先のフォルダへ `.tsv`） | `JDG-2916` | `AM-34`、`IO-9`、`RW-20` | 同上、`delay-diagnostics-report.ts`（`delayFixLogTsvWhole`） |

## 2. 影響

```
仕様の他の行     表 T-107（27 のメンバ）、表 T-064（3 つの公開の名）
生成物           tbl-agent-api-members.md・tbl-published-entries.md・mcp-tool-descriptions.json・agent-api-members.ts と
                 relayed-call.ts と mcp-relay-server.ts の生成の所
試験             メンバの数・名の一覧・版を引く試験を揃える。新しい試験は別の体が仕様だけから書く
形式の版         上げない（FR-073）。Agent API の版（AG-1）は上げる
毎フレームの仕事 無い —— 描き手は変えず、.tsv の文字列は呼ばれたときだけ作る
```

## 3. 利用者の実物の手順（実装の後に確かめる）

1. 束を入れ直し、AI に「コメントの文字を 16 にして」と頼む → そのコメントの字が大きくなる。
2. AI に修正を当てさせた後で「修正の記録を fix-log.tsv で保存して」と頼む → 保存先のフォルダに `.tsv` ができ、表計算ソフトで開ける。
3. AI に「修正の記録を読んで」と頼む → AI は表を数ページに分けて読む。
