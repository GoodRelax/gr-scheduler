# CR-803 —— AI が遅延診断を画面で実行し、修正案を当て、窓を閉じ、作った uid と部分ごとの値を受け取る

> 状態: ✅ **当てた** —— 2026-10-19 朝、取次の直しの席（`unruffled-edison-a20654`）が起草し、同じ席が当てた。仕様 → 実装 → 仕様だけを読む別の体の試験（`tests/contract/cr-803-*`）→ 関門の順。
> 元: 利用者が GRS Relay で 195 タスクの日程を作らせた AI の作業報告（利用者の手元の `Report.md`、2026-10-19）。取次の席が候補 1〜25 に仕分け、利用者が優先度 必須・高・中 を α（11:00）に入れ、低を引き継ぎに残すと定めた（`JDG-2850`・`JDG-2851`）。
> 本書が当てる候補: 1（遅延診断を画面で実行）・2（画面の Fix）・5（作った uid）・8（`readDocument` の部分）・9（`readDelayDiagnostics` の部分と上限）・10（状態で絞る —— 説明の文）・12（窓を閉じる）。ほかの候補（3・4・6・7・11・14・15・21・22・24）は調整役がほかの席に割った。
> 当てる裁定: `JDG-2850`〜`JDG-2852`。覆す仕様: `FR-155` の「`IC-157`・`IC-158` に当たる入口を `Agent API` に置いてはならない（MUST NOT）」 —— 名指しの裁定は無く、席の決めであった（`JDG-1942` は修正案を機械が作ることを定めたもので、本書もそれを守る）。
> 新しい ID: 表 T-107 の `AM-31`（`runDelayDiagnostics`）・`AM-32`（`issueDelayFixes`）・`AM-33`（`closeWindow`）。
> 消す ID: 無し。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`CH-1` ／ `GL-004`（構造化した日程データを AI に渡す）。人が画面でする遅延診断と修正を AI にもさせる —— 利用者 2026-10-19「特に遅延診断と画面Fix機能は必須だ。」、`JDG-2766` の「人と AI が同じことをできる」。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の **`R2.21`**（1 つの仕事は 1 か所）・**`R2.9`**（要らないものを持たない）。
出たこと:
① 診断の実行と窓の閉じは、人の押下と同じ殻の関数（`showDelayDiagnostics`・`answerReportEntry`・`PANEL_CLOSE_ASKED`）を呼ぶ —— 2 つ目の道を作らない（`R2.21`）。
② 修正は、修正案を作る規則（`proposeDelayFixes`）と命令（`delayFixCommands`）と記録（`delayFixLogRowsOf`）を画面と分け合い、書き込みだけを `Agent API` の 1 つの道（`AG-4`）で通す（`R2.21`）。
③ 状態で絞る道（候補 10）は足さない —— 既にある列のフィルタ（`setTableView`）と `filters: asShown` で絞れるので、説明の文で教える（`R2.9`）。

### ③ 利用者に**問わずに決めた**こと（**覆してよい**）

1. ⭐ `runDelayDiagnostics`・`closeWindow` の答えは `AgentWriteOutcome`（表 T-400 の `AV-2`）とし、文書を変えないので刻印は変わらず `hasUpdatedSchedule` は偽。診断の値は `readDelayDiagnostics` で読む。
2. ⭐ `issueDelayFixes` は修正案を今の文書から作り直して選ぶ —— `readDelayDiagnostics` が並べたのと同じ `key` で同じ行を指す。画面の窓が持つ診断（実行した時の文書の）とは、文書が変わっていれば違う。`fixKeys` が空なら `IC-166`（推奨をすべて採用）と同じ行。
3. ⭐ 作った `uid`（`createdUids`）は、書き込みの前後の `uidHighWaterMark` の差の範囲 —— タスク・担当・割り当て・暦が 1 つの数えを分け合うので、何を作ったかは `readDocument` で引く。
4. ⭐ `readDocument` の `parts` は日程データの群の鍵と `documentSettings`・`changeLog` の名。`project`・`documentStamp`・`schemaVersion` はいつも残す。知らない名は無視する。
5. ⭐ `readDelayDiagnostics` の `parts` は答えの一番上の鍵の名、`limit` は並びごとの上限（0 で上限なし）。`outcome`・`statusDate`・`unreliableCount` はいつも残す。
6. ⭐ `closeWindow` は 2 つ（遅延診断レポートの窓・プロパティパネル）だけ。検索パネル・担当リストの窓は α の後。
7. ⭐ 人が押している・その場で書いている・問いに答えているあいだは、3 つの新しいメンバとも拒む（`AM-29` と同じ）。

---

## 1. 対応

| 候補 | 直すこと | 裁定 | 仕様の ID | 直す原稿・文書・コード |
| --- | --- | --- | --- | --- |
| 1 | `runDelayDiagnostics` —— `IC-107`・`IC-168` の押下と同じ | `JDG-2850` | `AM-31`、`FR-130` | `_source/agent-api-members.json`、`01-04-requirements.md`（`FR-130`）、`agent-api-members.ts`、`frame-loop.ts` |
| 2 | `issueDelayFixes` —— 画面の Fix と同じ束・1 段・修正ログ、先に保存しない | `JDG-2850`・`JDG-2852` | `AM-32`、`FR-155`、`UN-21` | 同上、`document-file-flow.ts`（`landDelayFixes`） |
| 5 | `applyCommands` ほかの答えに `createdUids` | `JDG-2851` | `AV-2` | `_source/agent-api-members.json`、`agent-api-members.ts` |
| 8 | `readDocument` の `parts` | `JDG-2851` | `AM-3` | 同上 |
| 9 | `readDelayDiagnostics` の `parts`・`limit` | `JDG-2851` | `AM-19` | 同上 |
| 10 | 状態で絞る道を説明の文で教える | `JDG-2851` | `AM-28` | `_source/agent-api-members.json` |
| 12 | `closeWindow` —— 遅延診断レポートの窓・プロパティパネル | `JDG-2851` | `AM-33`、`RW-1`、`FR-072` | `_source/agent-api-members.json`、`agent-api-members.ts`、`frame-loop.ts` |

## 2. 影響

```
仕様の他の行     FR-130（やり直す時に AM-31 を足す）、FR-155（Agent API の入口の MUST NOT を AM-32 に置き換え）、
                 表 T-107（26 のメンバ）、表 T-400 の AV-2、初期化の案内
生成物           tbl-agent-api-members.md・mcp-tool-descriptions.json・agent-api-members.ts と relayed-call.ts の生成の所
実装             Agent API の 3 つのメンバと 3 つの引数・殻の 2 つの継ぎ目・修正ログの受け口
試験             メンバの数・名の一覧・版・引数を引く試験を揃える。新しい試験は別の体が仕様だけから書く
形式の版         上げない（FR-073）—— GRS JSON の形は変わらない。Agent API の版（AG-1）は上げる
毎フレームの仕事 無い
```

## 3. 測ったこと

- 画面の診断の入口: `frame-loop.ts` の `showDelayDiagnostics`（`IC-107`・`IC-168` が呼ぶ）、修正: `document-file-flow.ts` の `issueDelayFixBundle`（`IC-157`・`IC-158` の保存の後に呼ぶ）。読みの体が 2026-10-19 に引いた。

## 4. 利用者の実物の手順（実装の後に確かめる）

1. 束を入れ直し、AI に「遅延診断を実行して」と頼む → 画面で遅延診断レポートの窓が開き、進捗マーカーに印が出る（炎を押したのと同じ）。
2. AI に「推奨の修正を当てて」と頼む → 文書が直り、窓の修正の記録の表に行が足され、修正案の表から消える。AI に「取り消して」と頼むと 1 回で戻る。
3. AI に「レポートの窓を閉じて」「プロパティパネルを閉じて」と頼む → 閉じる（マーカーの印は残る）。
