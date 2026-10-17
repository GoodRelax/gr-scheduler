# GRS Relay の全機能を使った結果（2026-10-18）

- **対象**: Claude Desktop の拡張 GRS Relay（版 `0.0.0+f262abd0363f`。`+` の後は同梱の `dist/index.html` の SHA-256 の頭 12 桁で、`0829239a` の `dist/index.html` と一致）。ページは利用者の Edge で開いた雛形の文書（`sample-large-erp-program.ja.xml`、256 タスク）。
- **呼んだ者**: α の補助の席（Claude Code、デスクトップ）。呼んだ時刻は 2026-10-18 06:18〜06:20 JST（刻印の `2026-10-17T21:18Z`〜）。
- ⚠️ **確かめ方の限り**: 命令の形（`setTaskName` の欄）と取り込みの形（`AV-7`）は、リレーの資源 `grs-document.schema.json` でなく **リポジトリの `src` と `docs/spec` から取った**。この席の受け手はリレーの資源を読む道具を持たない。だから本表は「リポジトリを見ない AI がリレーだけで使えるか」の試験になっていない。
- 判定: ✅ 仕様どおり ／ ❌ 不具合（台帳の行を添える）／ ⏳ 未実施。

| ID | API Name | 説明 | 使用結果 | 判定 | 備考 |
|---|---|---|---|---|---|
| AM-1 | `agentApiVersion` | Agent API の版 | `"2026-10-17T15:27:48Z"` | ✅ | `agent-api-members.ts:242` の値と一致（`JDG-2741`）。ページがつながる前は `pageNotConnected` と開く宛先を返した |
| AM-2 | `schemaVersion` | 文書の形式の版 | `"2026-10-17T15:27:48Z"` | ✅ | `CR-792` の形式の版 |
| AM-3 | `readDocument` | 文書ぜんたいの複製 | 1,383,668 字の JSON。受け手の上限を超え、ファイルに逃がされた | ❌ | `DFC-3253`。内訳は担当の割当 756,757 字・タスク 609,329 字（MSPDI の持ち越しが大半） |
| AM-4 | `readStamp` | 文書の刻印 | 雛形の刻印（`lastEditedBy: template`）。書いた後は `agent` と新しい刻 | ✅ | 書き込みのたびに `settingsUpdatedAt` も進んだ（名前だけの書き込みでも） |
| AM-5 | `readSelection` | 選ばれている対象 | `{"items":[],"isOrdered":true}` | ✅ | 何も選んでいない状態 |
| AM-6 | `readDialogueMessages` | 確定した発話 | 置く前は `[]`、置いた後は AI の 1 件 | ✅ | |
| AM-25 | `readSearchRows` | 語で検索の 2 表の行 | 「UAT」で 8 行（uid 200〜207）、コメントボックス 0 行。「relay test」で書き換えた 1 行 | ✅ | |
| AM-26 | `readShownTasks` | 描いているタスクと絞り込み中の表 | 前は `null` と `[]`、`showOnlyTasks` の後は `[201,207]` と `["searchPanel"]` | ✅ | |
| AM-19 | `readDelayDiagnostics` | 遅延診断のレポート | `diagnosed`、基準日 2026-12-09、指摘 3（`VC-12` ×2・`VS-6`）、ボトルネック 11、修正案 3 | ✅ | 中身の正しさは突き合わせていない |
| AM-7 | `applyCommands` | 一括の書き込み | 古い刻印 → `staleStamp` で拒否。今の刻印で uid 207 の名を「UAT 承認 (relay test)」→ 受理、続けて元の「UAT 承認」へ書き戻し → 受理 | ✅ | 拒否の値が文書を丸ごと持ち 1,383,943 字（仕様 `AV-3` どおり、`DFC-3253`） |
| AM-8 | `importDocument` | 取り込みと合流 | 中身の空の GRS JSON を `text` で渡す → ページに合流の 3 択「ファイルを開く」が出て、答え待ちのまま Claude 側が「Request timed out」。その後リレーが別の口（65289 → 51858）で立ち上がり、ページは切れた | ❌ | `DFC-3252`。⚠️ 3 択は利用者がキャンセルする |
| AM-9 | `undoEdit` | 履歴を戻す | `notAvailable`「not built yet: AM-9 declares neither a row of table T-230 nor the stamp WS-1 matches」 | ❌ | `DFC-3250`。`7c3b68e4`（2026-09-06）からの空実装 |
| AM-10 | `redoEdit` | 履歴を進める | `notAvailable`（同じ文） | ❌ | `DFC-3250` |
| AM-11 | `exportJson` | GRS JSON を値で返す | 未呼出 | ⏳ | ページの再接続の後に呼ぶ |
| AM-12 | `exportMspdi` | 交換形式を値で返す | 未呼出 | ⏳ | 同上 |
| AM-13 | `exportSvg` | 書き出す絵 | 未呼出 | ⏳ | 同上 |
| AM-14 | `exportPng` | 画像 | 未呼出 | ⏳ | 同上 |
| AM-15 | `exportEmbeddedHtml` | 本体と文書を合わせた `.html` | 未呼出 | ⏳ | 同上 |
| AM-16 | `focusTask` | タスクを展開して見せる | uid 207 → `ok: true`・`isScrolled: true`、日程データの刻が進んだ | ✅ | 開閉の状態は保存され取り消せる（`CR-570`）ので刻が進むのは筋 |
| AM-27 | `showOnlyTasks` | 検索の表で絞り込む | `[201,207]` → 受理、帯「256 件中 2 件」。`null`（解除）→ `malformedRequest` で拒否、絞り込みが残った | ❌ | `DFC-3251`。受理のときも刻印は進まなかった（`FR-100` は未保存の編集と言う。未確かめ） |
| AM-17 | `watchChanges` | 自分以外の変更と発話を待つ | `waitMs: 3000` → `{"notices":[]}` | ✅ | 人が何もしていない間の「まだ無い」 |
| AM-18 | `postDialogueMessage` | AI の発話を対話欄へ | `ok: true`・`sequence: 1` | ✅ | |

## 数（測り直せる）

- 道具: 22（拡張の `manifest.json` の `tools`）。呼んだ 17、未呼出 5（書き出し）。
- 判定: ✅ 12・❌ 5（`DFC-3250` が 2 行、`DFC-3251`・`DFC-3252`・`DFC-3253`）・⏳ 5。
