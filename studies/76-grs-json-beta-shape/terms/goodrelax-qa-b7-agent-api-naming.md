BGQA7

# Agent API と文書の命令の名 —— 方針の残りと、方針で決まらない名

> 「回答:」の後ろに答えを書いて保存し、1 行目の BGQA7 を切り取ってください。
> 凡例: ❓回答待 ✅回答済 🔄変化点 ★強調(ユーザー専用)

🔄 *作った日: 2026-11-23（Agent API の名の席）。2〜5 巡目: 2026-11-23。5 巡目で方針の問いはすべて決まった。6 巡目: 方針を当てた名の確かめ（[apply]）を足した。7 巡目で [apply] も決まった。8 巡目: uid の上限の断りの名（[uid]）を足した。9 巡目で [uid] も決まり、問いはすべて閉じた。10 巡目（2026-11-24、Agent API の名 2 の席）: AI-C のレビューで見直す名（[rev]）を足した。11 巡目（2026-11-25）: 問 13・20 が決まった。問 14〜19 を API の流れつきで出し直し、基本の解説 `agent-api-basics-ja.md` を足した。問 26 を足した。12 巡目（2026-11-27）: 答えの無い問いを仮に決めた（β の後に見直す）*

🔄 *残 13（❓ で検索）*

この紙の範囲: 方針の案 `agent-api-naming-policy-draft.md` のうち、持ち主が説明と比較を求めた 4 行（P-7・P-8・P-10・P-11、`JDG-3716`）と、方針で 1 つに決まらない名 4 つです。方針が決まったら、席が BGQA4（文書の命令 16 問）と BGQA5（Agent API 29 問）の名を方針でそろえ、結果を 1 枚にして持ち主に 1 度で確かめてもらいます（P-12 のレビューもそこで行います）。

| 分野 | 問い |
|:---|:---|
| [pol] 名の付け方の方針 | 無し（すべて決まった） |
| [name] 方針で決まらない名 | 無し（すべて決まった） |
| [apply] 方針を当てた名の確かめ | 無し（すべて決まった） |
| [uid] uid の上限の断り | 無し（すべて決まった） |
| [rev] AI-C のレビューで見直す名 | 🔄 *問 14-2〜19-2、21〜26* |

***

## 決定事項

### [pol] 名の付け方の方針

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| P-1 | 文書の命令と Agent API の名にも、GRS JSON の名の決まり N-1〜N-17 とその優先の順を当てる | `JDG-3716` |
| P-2 | 画面の 1 つの操作と同じ働きの命令の名は、イベント名から `Pressed`・`Requested` を除いた名（文書の命令だけ。Agent API の道具は P-3 の「動詞＋目的語」） | `JDG-3716` |
| P-3 | 名の頭の動詞は 1 語 1 意味: `read`・`set`・`edit<物>`・`create`・`delete`・`apply`・`export` | `JDG-3716` |
| P-4 | 1 つの物は、GRS JSON・文書の命令・Agent API で 1 つの語を持つ | `JDG-3410`・`JDG-3684` |
| P-5 | 代名詞・前置詞・たとえ・読みが 2 つの語・呼ぶ者の頭 `Agent`・過去分詞だけのキーを使わない | `JDG-3716` |
| P-6 | 許す略に `Url` を足す | `JDG-3716` |
| P-7 | ページが返す答えと値の真偽は `is…`（`isAccepted`・`isScheduleDataUpdated`）。AI が渡すフラグは動詞で始める（`includePassthrough`・`overwrite`・`returnWholeSchema`） | `JDG-3780` |
| P-8 | 単位の無い数は、何を数えるかで終える: 個数は `…Count`、木の深さは `…Depth`、何番目かは 0 から数えて `…Index`（`deleteDependencyAt.order` → `index`、GRS JSON の `siblingOrder` → `siblingIndex`）。ページ送りの `offset`・`nextOffset`・`limit` は通り名のまま | `JDG-3776`・`JDG-3777` |
| P-9 | 欄が入れる型は欄の名を PascalCase にした名。値か断りを返す答えの型は `…Outcome` | `JDG-3716` |
| P-10 | 直し方が同じ断りは、物によらず 1 つの名（無い物を名指したら `notFound`）。どの物かは `field`・`missingTaskUids`・`commandType`・`member` が言う。直し方が違えば名に物を入れる | `JDG-3778` |
| P-11 | 鍵から値への対応表は `<値>By<鍵>`（`taskGroupIdBySourceTaskUid`）。`By` は対応表と「誰が」（`changedBy`）、`To` は行き先だけ（`moveTaskToTaskGroup`）。`Of`・`Into` は使わない | `JDG-3772` |
| P-12 | 名が方針に合えば今の名を変えない（当てた結果をレビューする） | `JDG-3716` |
| `kind` | `kind` というキーはどこでも使わない。素の `type` は物の形を選ぶ判別子、`xxxType` は形を変えない分類 | `JDG-3564` |
| 問い方 | この紙で出す。難しい問いは個別に相談する | `JDG-3771` |

### [name] 方針で決まらない名

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| 道具の分類の欄 | `kind` → `memberType`（原稿と src・tests は `CR-851` の実装で直す） | `JDG-3773` |
| 取り込みで出した問い | `asked` → `pendingQuestion` | `JDG-3774` |
| 文書の誤りの所 | `at` → `jsonPointer` | `JDG-3775` |
| 実績ダミーの命令の引数 | `grabbed` → `grabbedArea`、`released` → `releasedPlace` | `JDG-3779` |

### [apply] 方針を当てた名の確かめ

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| 45 問の名 | 一覧 `agent-api-names-by-policy-draft.md` のとおり（変える名 134、今のままの名 182）。`setDependencyLag`・`TableRowsOutcome` ほか席が決めた 4 つ、`shiftScheduleByMinutes`・`deleteDependencyAt` も含む | `JDG-3781` |
| 画面の表の型 | `TableRow`・`TableColumn`・`TableCell` | `JDG-3782` |
| 変更の知らせの `mark` | 欄 `mark` と型 `WatcherMark` を無くす。時刻は `stamp.scheduleDataUpdatedAt` が言う | `JDG-3783` |

### [uid] uid の上限の断り

| 問い | 決まったこと | 裁定 |
|:---|:---|:---|
| uid が上限に届いた断りの理由 | `uidLimitReached`（`pinLimitReached` と同じ形） | `JDG-3784` |

### [rev] AI-C のレビューで見直す名

| 🔄 *問い* | 🔄 *決まったこと* | 🔄 *裁定* |
|:---|:---|:---|
| 🔄 *実績ダミーをつかんだ所の名* | 🔄 *`grabbedArea` → `grabbedPoint`（型 `GrabbedPoint`）。用語集の Grab Point の語。`releasedPlace` は今のまま* | 🔄 *`JDG-3786`* |
| 🔄 *命令の断りの、誤りの所の欄* | 🔄 *`field` → `jsonPointer`（命令の中の JSON Pointer。例 `"/set/finish"`）* | 🔄 *`JDG-3787`* |
| 🔄 *答えの無い 13 問（問 14-2〜19-2・21〜26）* | 🔄 *仮に、席の推し（どれも案 a）で決めた。β の後に持ち主が見直す。一覧は `agent-api-provisional-names.md`（`PN-1`〜`PN-13`）* | 🔄 *`JDG-3788`・`JDG-3789`（仮）* |

***

## QA

### [pol] 名の付け方の方針 ✅

すべて決まりました（上の決定事項）。

### [name] 方針で決まらない名 ✅

すべて決まりました（上の決定事項）。

### [apply] 方針を当てた名の確かめ ✅

すべて決まりました（上の決定事項）。

### [uid] uid の上限の断り ✅

すべて決まりました（上の決定事項）。

### [rev] 🔄 *AI-C のレビューで見直す名（❓ 12）*

🔄 *AI-C（席の結論を見せない別の AI）が、決まった一覧を GRS JSON・用語集・画面の札と照らしました（`JDG-3785`、結果は `agent-api-names-ai-c-review.md`。仕分けの表は末尾）。*

🔄 ***仮で決めた（2026-11-27）**: 持ち主の指示（`JDG-3788`）で、下の 12 問と問 26 は、席の推し（どれも案 a）で仮に決めて先へ進めました（`JDG-3789`、一覧 `agent-api-provisional-names.md`）。問いは開いたまま残します。β の後に、答えを書いてください。別の案を選んだ名は、道具が一度に置き換えます。*

🔄 ***先に読む紙**: Agent API の基本の方針・基本の流れ（プロトコル）・道具の一覧・文書の命令と GRS JSON の関係・断りの種類・平らか階層かの今の形は `agent-api-basics-ja.md` にまとめました。問 14-2〜19-2 は、名が出る場面を、呼び出しの初めから終わりまでコードブロックで示します。コードの中の注は英語です。`UNVERIFIED` は、席が資料で確かめきれなかった所です。*

#### 🔄 *✅ 問 14. 断りの理由 `mspdiImportCountAhead` —— 主語が逆*

🔄 *持ち主の答え: 「importingOriginCountAhead にしなくていいの？ GRS JSONに影響する？」*

##### 🔄 *❓ 問 14-2. 断りの理由の名 —— 流れと、GRS JSON への影響*

🔄 *答え: GRS JSON には影響しません。断りの理由の名は Agent API の答え（`documentFaults[].reason`）にだけ出て、GRS JSON のファイルに入りません。GRS JSON のキーは `importOrigin`（名詞）で、`importing` の語は GRS JSON にありません。*

- 🔄 *人が MSPDI を 2 回開くのは、ふつうの流れです。ページは数を 1 つ進めるだけで、断りません。*
- 🔄 *断りは、AI か人が、数の合わない GRS JSON を渡したときに出ます。`importDocument` は GRS JSON だけを受けます。*
- 🔄 *命令は `mspdiImportCount` も `importOrigin` も書けません。AI が数を直す道は、渡す GRS JSON を直すことだけです。*

```text
🔄 // 1. The person opens schedule.xml (MSPDI) with "Replace".
🔄 //    GRS counts the import: scheduleData.mspdiImportCount 0 -> 1.
🔄 //    Every imported task gets grs.importOrigin.mspdiImportCountWhenLastIncluded = 1.

🔄 // 2. A week later the person exports schedule.xml again and opens it with "Merge".
🔄 //    GRS counts again: mspdiImportCount 1 -> 2.
🔄 //    Task 12 is in the new file   -> its count becomes 2 (included this time).
🔄 //    Task 13 is not in the new file -> its count stays 1 (left out this time).
🔄 //    No refusal: this is the normal flow.

🔄 GRS JSON after step 2:
🔄 "scheduleData": {
🔄   "mspdiImportCount": 2,
🔄   "lastMspdiImport": { "importedAt": "2026-12-01T00:30:00Z", "fileName": "schedule.xml" },
🔄   "tasks": [
🔄     { "uid": 12, "name": "設計",
🔄       "grs": { "importOrigin": { "sourceTaskUid": 5,
🔄                                  "importSessionId": "0f3c...",
🔄                                  "mspdiImportCountWhenLastIncluded": 2 } } },
🔄     { "uid": 13, "name": "製作",
🔄       "grs": { "importOrigin": { "sourceTaskUid": 6,
🔄                                  "importSessionId": "0f3c...",
🔄                                  "mspdiImportCountWhenLastIncluded": 1 } } }
🔄   ]
🔄 }

🔄 // 3. The AI reads the document.
🔄 call:   readDocument { "parts": ["tasks"] }        // part names in beta: UNVERIFIED
🔄 answer: the GRS JSON above (MSPDI passthrough left out)

🔄 // 4. The AI builds a whole GRS JSON itself and, by mistake, writes
🔄 //    "mspdiImportCount": 1 while task 12 still says 2. Then it imports it.
🔄 call:   importDocument { "source": { "text": "{ ... \"mspdiImportCount\": 1 ... }" } }

🔄 // 5. The page checks the document and refuses it. Nothing is applied.
🔄 answer (ImportOutcome, refused):
🔄 { "isAccepted": false,
🔄   "refusal": {
🔄     "refusedBy": "page",
🔄     "member": "importDocument",
🔄     "reason": "documentInvalid",
🔄     "message": "The document was not imported: 1 fault.",
🔄     "stamp": { "scheduleDataUpdatedAt": "2026-12-01T00:30:00Z", "...": "..." },
🔄     "documentFaults": [
🔄       { "jsonPointer": "/scheduleData/tasks/0/grs/importOrigin/mspdiImportCountWhenLastIncluded",
🔄         "reason": "mspdiImportCountAhead",      // open in Q14
🔄         "message": "the task's count 2 is above scheduleData.mspdiImportCount 1" } ] } }

🔄 //    candidates for the reason name (Agent API value only):
🔄 //      mspdiImportCountAhead      list name now (the head words of the two keys)
🔄 //      importOriginCountAhead     Q14 option a: the subject is the task's importOrigin
🔄 //      lastIncludedCountAhead     Q14 option b: the tail words of the task key
🔄 //      importingOriginCountAhead  the owner's idea in the Q14 answer
🔄 //    whether the page checks before or after the three-way question: UNVERIFIED

🔄 // 6. What the AI does next.
🔄 //    a) It reads documentFaults[0].jsonPointer: the fault sits on the TASK value.
🔄 //    b) It knows that no command writes mspdiImportCount or importOrigin
🔄 //       (editProject and editTask leave them out).
🔄 //    c) It rebuilds its GRS JSON from a fresh readDocument and keeps both counts as read
🔄 //       (mspdiImportCount 2), then calls importDocument again,
🔄 //       or it drops importDocument and sends its edits with applyCommands instead.
🔄 //    d) If the faulty file came from outside, it tells the person which task is wrong.
```

🔄 *GRS JSON に触れるか:*

- 🔄 *断りの理由の名は、Agent API の答え（`documentFaults[].reason`）と画面の文にだけ出ます。GRS JSON のファイルには入りません。*
- 🔄 *名を変えても、GRS JSON のキー `mspdiImportCount`・`importOrigin`・`mspdiImportCountWhenLastIncluded` は今のままです。GRS JSON β は凍結しました（`JDG-3807`）。*
- 🔄 *GRS JSON のキーは `importOrigin`（名詞）です。`importingOrigin` の語は GRS JSON にありません。案 a の `importOriginCountAhead` は、キーと同じ語を使います（P-4）。*

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *`importOriginCountAhead`。GRS JSON のキー `importOrigin` と同じ語（P-4）。「タスクの取り込みの出どころの数が先へ行った」と読める* |
| b | 🔄 *`importingOriginCountAhead`（持ち主の案）。GRS JSON に無い語 `importing` を持つ* |
| c | 🔄 *`mspdiImportCountAhead` のまま。説明の文で主語を言う* |

回答:

#### 🔄 *✅ 問 15. 断りの理由 `endBeforeStart` —— 3 つの日の前後を 1 つの名で*

🔄 *持ち主の答え: 「関係するAPI全体とその流れをコードブロックに書け。 datesReversedだと「その日は予約されてます。」 →何の予約？ にしかならん。のでダメ。 finishBeforeStart の方がましだが、もっと良い方法があるのか？」*

##### 🔄 *❓ 問 15-2. 日の前後が逆の断り —— 流れと、GRS JSON の語に合わせた名*

🔄 *`datesReversed` は退けます。調べ直すと、今の 1 つの名が受け持つ日の組は 4 つでした（3 つではありません）。*

- 🔄 *今の一覧で、この 1 つの名が 4 つの日の組を受け持ちます。タスクの予定（`start`・`finish`）、タスクの実績（`actualStart`・`actualFinish`）、ハイライトボックスの日（`firstDay`・`lastDay`）、全体表示期間（`fitDayRange.firstDay`・`lastDay`）です。*
- 🔄 *どの組かは `commandType` と `jsonPointer` が言います。`jsonPointer` は命令の中を指します（`JDG-3787`）。*
- 🔄 *タスクグループの上下の逆さは、別の名 `lastTaskGroupBeforeFirst` です。*

```text
🔄 // 0. The AI reads the stamp and the task (see the common premise).
🔄 call:   readStamp {}
🔄 answer: { "scheduleDataUpdatedAt": "2026-11-25T01:00:00Z", "...": "..." }

🔄 // ---- Case A: planned dates (editTask) ----
🔄 // 1. The AI moves the finish of 設計 to a day before its start.
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "editTask", "taskUid": 12,
🔄       "set": { "finish": "2026-11-27T17:00:00" } } ] } }
🔄 //    The command would write: scheduleData.tasks[uid 12].finish
🔄 //    The page checks the row after writing: finish 11-27 < start 11-30.

🔄 // 2. The page refuses the batch.
🔄 answer:
🔄 { "isAccepted": false,
🔄   "refusal": { "refusedBy": "page", "member": "applyCommands",
🔄     "reason": "commandRefused", "message": "...", "stamp": { "...": "..." },
🔄     "commandRefusals": [
🔄       { "commandIndex": 0, "commandType": "editTask",
🔄         "reason": "endBeforeStart",            // open in Q15
🔄         "jsonPointer": "/set/finish",
🔄         "message": "finish 2026-11-27T17:00:00 is before start 2026-11-30T09:00:00" } ] } }
🔄 //    If the AI had sent only set.start = 2026-12-07T09:00:00,
🔄 //    the pointer would be "/set/start".
🔄 //    When the AI sends both start and finish reversed, which pointer the page names: UNVERIFIED

🔄 // ---- Case B: actual dates (setTaskProgressStatus, the shape is open in Q18) ----
🔄 // 3. The AI marks 設計 finished, with the actual finish before the actual start.
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "setTaskProgressStatus", "taskUid": 12,
🔄       "progressStatus": { "state": "finished",
🔄                           "actualStart":  "2026-12-01T09:00:00",
🔄                           "actualFinish": "2026-11-30T17:00:00" } } ] } }
🔄 //    The command would write: tasks[uid 12].actualStart, tasks[uid 12].actualFinish
🔄 //    (and GRS removes stop and recomputes percentComplete).
🔄 answer: commandRefusals[0] =
🔄       { "commandIndex": 0, "commandType": "setTaskProgressStatus",
🔄         "reason": "endBeforeStart",            // was negativeActualLength in alpha
🔄         "jsonPointer": "/progressStatus/actualFinish",
🔄         "message": "..." }
🔄 //    With Q18 option a (flat), the pointer would be "/actualFinish".

🔄 // ---- Case C: highlight box days (editHighlightBox) ----
🔄 // 4. The AI moves the last day of a highlight box before its first day.
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "editHighlightBox",
🔄       "highlightBoxId": "7c2e9a40-1b3d-4e5f-8a6b-9c0d1e2f3a4b",
🔄       "set": { "lastDay": "2026-11-26" } } ] } }
🔄 //    The box has firstDay 2026-11-30.
🔄 //    The command would write: scheduleData.highlightBoxes[id].lastDay
🔄 answer: commandRefusals[0] =
🔄       { "commandIndex": 0, "commandType": "editHighlightBox",
🔄         "reason": "endBeforeStart",
🔄         "jsonPointer": "/set/lastDay", "message": "..." }

🔄 // 4b. The same box with the task groups upside down gets another name.
🔄 //     "set": { "lastTaskGroupId": "<a task group above the first one>" }
🔄 answer: commandRefusals[0] =
🔄       { "commandIndex": 0, "commandType": "editHighlightBox",
🔄         "reason": "lastTaskGroupBeforeFirst",
🔄         "jsonPointer": "/set/lastTaskGroupId", "message": "..." }
🔄 //    The key names of the two task groups in the command: the CR-851 map says
🔄 //    topTaskGroupId/bottomTaskGroupId, GRS JSON beta says firstTaskGroupId/lastTaskGroupId.
🔄 //    The list has no row for them: UNVERIFIED

🔄 // ---- Case D: the fit day range (editDocumentSettings) ----
🔄 // 5. "set": { "fitDayRange": { "type": "fixed",
🔄 //                              "firstDay": "2026-12-10", "lastDay": "2026-12-01" } }
🔄 //    The command would write: documentSettings.fitDayRange
🔄 answer: commandRefusals[0].reason = "endBeforeStart",
🔄         jsonPointer = "/set/fitDayRange/lastDay"        // pointer: UNVERIFIED

🔄 // ---- Case E: the same check on a whole document (importDocument) ----
🔄 // 6. A GRS JSON with tasks[3].finish before tasks[3].start.
🔄 answer: refusal.reason = "documentInvalid",
🔄         documentFaults[0] = { "jsonPointer": "/scheduleData/tasks/3/finish",
🔄                               "reason": "endBeforeStart", "message": "..." }

🔄 // 7. What the AI does next (every case).
🔄 //    a) It reads commandType and jsonPointer and finds the pair of keys.
🔄 //    b) It reads the other key of the pair (start, actualStart, firstDay).
🔄 //    c) It sends the batch again with a later end, or with both keys of the pair.
```

🔄 *GRS JSON の日の組と、断りの名の語:*

| 🔄 *組* | 🔄 *GRS JSON のキー* | 🔄 *命令* |
|:---|:---|:---|
| 🔄 *タスクの予定* | 🔄 *`tasks[].start`・`finish`* | 🔄 *`editTask`* |
| 🔄 *タスクの実績* | 🔄 *`tasks[].actualStart`・`actualFinish`* | 🔄 *`setTaskProgressStatus`* |
| 🔄 *ハイライトボックスの日* | 🔄 *`highlightBoxes[].firstDay`・`lastDay`* | 🔄 *`editHighlightBox`・`createHighlightBox`* |
| 🔄 *全体表示期間* | 🔄 *`documentSettings.fitDayRange.firstDay`・`lastDay`* | 🔄 *`editDocumentSettings`* |
| 🔄 *列のフィルタの日の範囲* | 🔄 *`ColumnFilter.firstDay`・`lastDay`* | 🔄 *`editTableWindow`（この組で断るかは未確認）* |

🔄 *GRS JSON は語 end を持ちません。始まりの語は start か first、終わりの語は finish か last です。*

🔄 *もっと良い方法: GRS JSON の日の組は 2 つの語の対を使います（start と finish、first と last）。断りの名も、指す組の語をそのまま使うと、AI は名を見ただけでどのキーかが分かります。兄弟の `lastTaskGroupBeforeFirst`（ハイライトボックスのタスクグループの上下）も同じ作りです。*

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *2 つに分ける: タスクの予定と実績は `finishBeforeStart`、ハイライトボックスの日と全体表示期間は `lastDayBeforeFirstDay`。どちらも GRS JSON の語（P-4）。直し方は同じでも、語の対が違うので名を分ける* |
| b | 🔄 *全部 `finishBeforeStart`。箱の日の逆さにも finish の語が来る（どのキーかは `jsonPointer` が言う）* |
| c | 🔄 *`endBeforeStart` のまま* |

回答:

#### 🔄 *✅ 問 16. 読む道具の引数 `filters` —— 値はフィルタそのものではない*

🔄 *持ち主の答え: 「関係するAPI全体とその流れをコードブロックに書け。 applyShownFiltersAndSort をそのまま読むとShownのやつだけ表示するフィルターをかけてソートする  にしか読めんな。 ダメじゃない？」*

##### 🔄 *❓ 問 16-2. 人の画面のフィルタと並べ替えを当てるかの引数 —— 流れ*

🔄 *`applyShownFiltersAndSort` は退けます（Shown を「見せた物だけ」と読める）。*

- 🔄 *人は検索ウィンドウのタスクの表に、列のフィルタと並べ替えを掛けます。GRS JSON は `documentSettings.tableWindows.searchWindow` に持ちます。*
- 🔄 *`filters`（open in Q16）は、その掛けたものを読む行に当てるかを選びます。フィルタそのものを渡す引数ではありません。*
- 🔄 *フィルタを変えるのは命令 `editTableWindow` です。変えると人の画面の表も変わります。*

```text
🔄 // 1. The person hides finished tasks and sorts by planned start on the Search Window task table.
🔄 GRS JSON:
🔄 "documentSettings": { "tableWindows": { "searchWindow": {
🔄   "columnFilters": [
🔄     { "type": "values", "column": "progressStatus", "hiddenValues": ["finished"] } ],
🔄   "columnSort": { "column": "start", "direction": "ascending" } } } }

🔄 //    The document has 8 tasks:
🔄 //    10 要件定義 (finished), 11 調査 (finished), 12 設計, 13 製作, 14 試験,
🔄 //    15 文書作成, 16 レビュー, 17 リリース (milestone)

🔄 // 2. The AI reads the rows as the person sees them.
🔄 call:   readSearchRows { "word": "", "filters": "asShown", "offset": 0, "limit": 3 }
🔄 answer (SearchWindowPage):
🔄 { "taskRows": [
🔄     { "taskUid": 12, "name": "設計", "start": "2026-11-30T09:00:00",
🔄       "finish": "2026-12-04T17:00:00", "progressStatus": "inProgress" },
🔄     { "taskUid": 13, "name": "製作", "start": "2026-12-07T09:00:00",
🔄       "finish": "2026-12-18T17:00:00", "progressStatus": "notStarted" },
🔄     { "taskUid": 14, "name": "試験", "start": "2026-12-21T09:00:00",
🔄       "finish": "2026-12-25T17:00:00", "progressStatus": "notStarted" } ],
🔄   "commentBoxRows": [],
🔄   "columns": [
🔄     { "key": "taskName",       "ja": "タスク",       "en": "Task",   "kind": "text" },
🔄     { "key": "progressStatus", "ja": "ステータス",   "en": "Status", "kind": "text" },
🔄     { "key": "start",          "ja": "予定開始",     "en": "Start",  "kind": "date" } ],
🔄   "taskRowCount": 6,
🔄   "offset": 0,
🔄   "nextOffset": 3 }
🔄 //    taskRowCount 6: the two finished tasks are hidden by the person's filter.
🔄 //    Row keys inside taskRows: the list has no row for them. This sketch uses the
🔄 //    column names of ColumnFilter.column; alpha src says plannedStart, plannedFinish,
🔄 //    planActualState (UNVERIFIED).
🔄 //    columns[].key values: assumed equal to ColumnFilter.column (UNVERIFIED).
🔄 //    columns[].kind: open in Q25 (seat's proposal valueType).
🔄 //    Empty commentBoxRows: written as [] or left out: UNVERIFIED.
🔄 //    The ja/en column labels are examples.

🔄 // 3. The AI reads the next page.
🔄 call:   readSearchRows { "word": "", "filters": "asShown", "offset": 3, "limit": 3 }
🔄 answer: { "taskRows": [ 15 文書作成, 16 レビュー, 17 リリース ],
🔄           "columns": [ ... ], "taskRowCount": 6, "offset": 3 }
🔄 //    No nextOffset key: there is no next page (N-12).

🔄 // 4. The AI reads all rows, without the person's filter and sort.
🔄 call:   readSearchRows { "word": "", "filters": "none", "offset": 0, "limit": 3 }
🔄 answer:
🔄 { "taskRows": [
🔄     { "taskUid": 10, "name": "要件定義", "progressStatus": "finished", "...": "..." },
🔄     { "taskUid": 11, "name": "調査",     "progressStatus": "finished", "...": "..." },
🔄     { "taskUid": 12, "name": "設計",     "progressStatus": "inProgress", "...": "..." } ],
🔄   "columns": [ ... ],
🔄   "taskRowCount": 8,
🔄   "offset": 0,
🔄   "nextOffset": 3 }
🔄 //    The order is the default order of the table (task tree order assumed: UNVERIFIED).
🔄 //    The person's screen does not change: the person still sees 6 rows.

🔄 // 5. A mistake the Q16 scene names: the AI passes a filter itself.
🔄 call:   readSearchRows { "word": "", "filters": [ { "type": "values",
🔄                          "column": "progressStatus", "hiddenValues": ["finished"] } ] }
🔄 answer: a refusal with reason "malformedRequest" (Q16 scene).
🔄 //    SearchWindowPage has no refused form (list 31-1), so the exact shape of this
🔄 //    answer is UNVERIFIED. A sketch:
🔄 //    { "refusal": { "refusedBy": "page", "member": "readSearchRows",
🔄 //                   "reason": "malformedRequest", "...": "..." } }

🔄 // 6. The right way to change the filter (this changes the person's table too).
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "editTableWindow", "tableWindow": "searchWindow",
🔄       "set": { "columnFilters": [
🔄                  { "type": "values", "column": "progressStatus",
🔄                    "hiddenValues": ["finished", "notStarted"] } ] } } ] } }
```

- 🔄 *`readTableRows` も同じ引数 `filters` を持ちます。修正案と修正の記録の表は、列のフィルタを文書に持たないので、`filters` が効きません。*
- 🔄 *値は 2 つだけです。`asShown`（省けばこれ）と `none` です。*

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *AI が渡すフラグ `followScreenFiltersAndSort`（省けば `true`）。「人が画面で掛けたフィルタと並べ替えに従う」と読める。P-7「AI が渡すフラグは動詞で始める」* |
| b | 🔄 *`filterSource`（値 `screen`・`none`）。値で選ぶ形。並べ替えも含むことは説明の文で言う* |
| c | 🔄 *`filters` のまま（値 `asShown`・`none`）* |

回答:

#### 🔄 *✅ 問 17. 日程表を絞っていないときの `drawnTaskUids`*

🔄 *持ち主の答え: 「これも前後関係のAPIをコードブロックに出せ。isScheduleFiltered 　だけだと何が起こるか分からん。」*

##### 🔄 *❓ 問 17-2. 日程表がいま描くタスクを読む答えの形 —— 流れ*

🔄 *調べ直すと、答えのもう 1 つの欄 `filteringTableWindows`（日程表を絞っている表の窓の名の並び）が、絞っているかをもう言っていました。`isScheduleFiltered` を足すと同じことを 2 度言うので、退けます。*

- 🔄 *道具 `readDrawnTasks`（一覧の名は `readShownTasks`。問 25 で問い中）は、2 つの欄を返します。`drawnTaskUids` と `filteringTableWindows` です。*
- 🔄 *一覧の今の決まり: どの表の窓も絞っていなければ、`drawnTaskUids` のキーを書きません（N-12）。*
- 🔄 *`filteringTableWindows` は、絞っている窓の名を並べます。並びが空かどうかで、絞っているかが分かります。*

```text
🔄 // 1. Nobody filters. The person has not checked anything.
🔄 GRS JSON:
🔄 "documentSettings": { "tableWindows": {
🔄   "searchWindow":               { "isScheduleFilteredByChecks": false },
🔄   "delayDiagnosisReportWindow": { },
🔄   "resourceListWindow":         { } } }
🔄 //    isScheduleFilteredByChecks has the default false; the key may be absent.

🔄 // 2. The AI asks which tasks the schedule draws.
🔄 call:   readDrawnTasks {}
🔄 answer (DrawnTasks):
🔄 { "filteringTableWindows": [] }
🔄 //    No drawnTaskUids key: the schedule draws every task it would draw anyway.
🔄 //    Empty filteringTableWindows: written as [] or left out: UNVERIFIED.

🔄 // 3. The person checks 設計 (12) and 試験 (15) in the Search Window task table
🔄 //    and turns on "Filter Schedule by Checks".
🔄 GRS JSON:
🔄 "searchWindow": { "isScheduleFilteredByChecks": true,
🔄                   "checkedTaskUids": [12, 15] }

🔄 // 4. The AI asks again.
🔄 call:   readDrawnTasks {}
🔄 answer:
🔄 { "drawnTaskUids": [12, 15],
🔄   "filteringTableWindows": ["searchWindow"] }
🔄 //    Whether the parent tasks of 12 and 15 also appear in drawnTaskUids: UNVERIFIED

🔄 // 5. The person also checks 佐藤 (resource uid 40) in the Resource List and turns its filter on.
🔄 //    佐藤 is assigned to tasks 12 and 20.
🔄 GRS JSON:
🔄 "resourceListWindow": { "isScheduleFilteredByChecks": true,
🔄                         "checkedResourceUids": [40] }
🔄 call:   readDrawnTasks {}
🔄 answer:
🔄 { "drawnTaskUids": [12],                        // {12, 15} AND {12, 20}
🔄   "filteringTableWindows": ["searchWindow", "resourceListWindow"] }

🔄 // 6. The AI reads the rows of a filtering window.
🔄 //    searchWindow       -> readSearchRows
🔄 //    resourceListWindow -> readTableRows { "table": "resourceList" }
🔄 //    delayDiagnosisReportWindow -> readTableRows { "table": "delayDiagnosisReport" }

🔄 // 7. Edge case: the person turns the filter on with no check at all.
🔄 GRS JSON:
🔄 "searchWindow": { "isScheduleFilteredByChecks": true }   // checkedTaskUids absent (minItems 1)
🔄 //    The schedule draws no task. What the answer says:
🔄 //    { "drawnTaskUids": [], "filteringTableWindows": ["searchWindow"] }  or
🔄 //    { "filteringTableWindows": ["searchWindow"] } if empty lists are left out.
🔄 //    UNVERIFIED. In the second form the drawnTaskUids key is absent in two
🔄 //    different states; only filteringTableWindows tells them apart.

🔄 // 8. The AI can filter the same way itself.
🔄 call:   showOnlyTasks { "taskUids": [12, 15] }
🔄 //    = one editTableWindow command on searchWindow:
🔄 //      set.checkedTaskUids [12, 15] and set.isScheduleFilteredByChecks true
🔄 call:   showOnlyTasks { "taskUids": [] }             // turns the Search Window filter off
```

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *`filteringTableWindows` は空でもいつも書く（`[]` は「どの窓も絞っていない ＝ 日程表はいつもどおり描く」）。`drawnTaskUids` は絞っているときだけ書き、空でも書く（`[]` は「絞った結果、1 つも描かない」）。キーが無いことに意味を持たせない* |
| b | 🔄 *`drawnTaskUids` をいつも書く。絞っていなければ描いているタスクの全部を並べる（タスクが数千あると答えが大きい）* |
| c | 🔄 *今のまま（絞っていなければ `drawnTaskUids` のキーを書かない）* |

回答:

#### 🔄 *✅ 問 18. 命令 `setTaskProgressStatus` の引数の形*

🔄 *持ち主の答え: 「平らにするか階層を持たせるかの方針を示せ。　どういうときに階層？ どういうときに平ら？ GRS JSONとの関係は？」*

##### 🔄 *❓ 問 18-2. 平らか階層かの方針と、`setTaskProgressStatus` の形 —— 流れ*

🔄 *方針の案（`agent-api-basics-ja.md` の 7 節の事実から）:*

1. 🔄 *命令の引数は、書く GRS JSON の形を写す。GRS JSON で平らな値は平らに、GRS JSON でオブジェクトの値は同じオブジェクトの形で置く（P-4「引数は書くキーの名」を形にも広げる）。例: `editDocumentSettings.set.fitDayRange` はオブジェクト、`editTask.set.finish` は平ら。*
2. 🔄 *GRS JSON に無い、命令だけの値は、GRS JSON がオブジェクトを使う 2 つの場合だけ階層にする: 一緒に動く値の組（`pasteTasks.placement`・`beginTaskActual.releasedPlace`）と、`type` が中の組を選ぶ物（`setDependencyLag.lag`）。ほかは平ら。*
3. 🔄 *1 と 2 がぶつかったら 1 を採る（GRS JSON と同じ形が先）。*

🔄 *GRS JSON のタスクは、実績の 4 つ（`actualStart`・`stop`・`resume`・`actualFinish`）を `tasks[]` の直下に平らに持ち、進捗ステータスのキーを持ちません。方針 1 では、`setTaskProgressStatus` も平らになります。*

- 🔄 *一覧の今の形は、`progressStatus` を `state` と日時を持つオブジェクトにします（open in Q18）。*
- 🔄 *表の列の値 `progressStatus` は、状態の名 1 つの文字列です（例 `"finished"`）。*
- 🔄 *GRS JSON のタスクは進捗ステータスのキーを持ちません。実績の 4 つのキーが `tasks[]` の直下に平らに並び、ページが状態を導きます。*

```text
🔄 // 0. 設計 (12): start 2026-11-30T09:00:00, finish 2026-12-04T17:00:00 (5 working days).
🔄 //    The Search Window row shows the state as one string:
🔄 //    { "taskUid": 12, "name": "設計", "progressStatus": "notStarted", ... }

🔄 // ---- 1. Mark 設計 finished ----
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "setTaskProgressStatus", "taskUid": 12,
🔄       "progressStatus": { "state": "finished",
🔄                           "actualStart":  "2026-11-30T09:00:00",
🔄                           "actualFinish": "2026-12-04T17:00:00" } } ] } }
🔄 answer: { "isAccepted": true, "stamp": { "...": "..." },
🔄           "isScheduleDataUpdated": true, "createdUids": [] }

🔄 GRS JSON task after step 1:
🔄 { "uid": 12, "name": "設計",
🔄   "start": "2026-11-30T09:00:00", "finish": "2026-12-04T17:00:00",
🔄   "percentComplete": 100,
🔄   "actualStart":  "2026-11-30T09:00:00",
🔄   "actualFinish": "2026-12-04T17:00:00" }
🔄 //    stop and resume are absent: GRS removes stop when the task finishes.
🔄 //    percentComplete is derived: actual working time / planned working time.

🔄 // ---- 2. Put 設計 back in progress, with the actual reached at 12-02 17:00 ----
🔄 call: applyCommands
🔄 { "request": { "expectedStamp": { "...": "..." },
🔄   "commands": [
🔄     { "type": "setTaskProgressStatus", "taskUid": 12,
🔄       "progressStatus": { "state": "inProgress",
🔄                           "actualStart": "2026-11-30T09:00:00",
🔄                           "stop":        "2026-12-02T17:00:00" } } ] } }

🔄 GRS JSON task after step 2:
🔄 { "uid": 12, "name": "設計",
🔄   "start": "2026-11-30T09:00:00", "finish": "2026-12-04T17:00:00",
🔄   "percentComplete": 60,
🔄   "actualStart": "2026-11-30T09:00:00",
🔄   "stop":        "2026-12-02T17:00:00" }
🔄 //    actualFinish is removed. 3 of 5 working days -> 60.
🔄 //    Whether GRS writes resumeValid here: UNVERIFIED

🔄 // ---- 3. The other three states (for comparison) ----
🔄 //    { "state": "notStarted" }
🔄 //        -> removes actualStart, stop, resume, actualFinish
🔄 //    { "state": "suspendedWithResumeDate",
🔄 //      "actualStart": "...", "stop": "...", "resume": "2026-12-09T09:00:00" }
🔄 //        -> writes actualStart, stop, resume, resumeValid true
🔄 //    { "state": "suspendedWithoutResumeDate", "actualStart": "...", "stop": "..." }
🔄 //        -> writes actualStart, stop, resumeValid false (only a written false means this)
🔄 //    The command never carries resumeValid: the state decides it.

🔄 // ---- 4. The mistake the Q18 scene names ----
🔄 //    The AI copies the column value into the command:
🔄 //    { "type": "setTaskProgressStatus", "taskUid": 12, "progressStatus": "finished" }
🔄 answer: refusal.reason = "malformedRequest"
```

🔄 *命令の名と GRS JSON のキーの対応:*

| 🔄 *命令の中* | 🔄 *GRS JSON* | 🔄 *注* |
|:---|:---|:---|
| 🔄 *`progressStatus.state`* | 🔄 *無い（ページが日付から導く）* | 🔄 *判別子。名は `state` で、`JDG-3564` の `type` と違う* |
| 🔄 *`progressStatus.actualStart`* | 🔄 *`tasks[].actualStart`* | 🔄 *同じ名* |
| 🔄 *`progressStatus.stop`* | 🔄 *`tasks[].stop`* | 🔄 *同じ名（MSPDI の Stop）* |
| 🔄 *`progressStatus.resume`* | 🔄 *`tasks[].resume`* | 🔄 *同じ名（MSPDI の Resume）* |
| 🔄 *`progressStatus.actualFinish`* | 🔄 *`tasks[].actualFinish`* | 🔄 *同じ名* |
| 🔄 *無い* | 🔄 *`tasks[].resumeValid`* | 🔄 *状態の名で決まる* |
| 🔄 *無い* | 🔄 *`tasks[].percentComplete`* | 🔄 *ページが計算する* |

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *上の方針を採り、平らにする: `{ "type": "setTaskProgressStatus", "taskUid": 12, "progressStatus": "finished", "actualStart": "...", "actualFinish": "..." }`。`progressStatus` は表の列と同じ状態の名（文字列）、日時は GRS JSON のキーの名と置き場* |
| b | 🔄 *階層を残し、判別子を `JDG-3564` の `type` にする: `"progressStatusChange": { "type": "finished", ... }`* |
| c | 🔄 *今のまま（`progressStatus.state` の中に日時）* |

回答:

#### 🔄 *✅ 問 19. データの時差 `scheduleDataTimeZone` を書く命令*

🔄 *持ち主の答え: 「APIの前後が分からんと回答不可。 なんか基本方針とか、基本プロトコルとか、そういうところから示せよ。」*

##### 🔄 *❓ 問 19-2. データの時差を書く命令 —— 流れ*

🔄 *基本の方針と流れは `agent-api-basics-ja.md` の 1〜4 節です。要点: AI は刻印を読み、要る所を読み、文書の命令の束を `applyCommands` で送ります。ページは束を全部当てるか、1 つも当てません。`edit<物>` の命令は 1 つの物（GRS JSON の 1 つのオブジェクト）の値を書きます。*

- 🔄 *データの時差は `scheduleData.scheduleDataTimeZone` にあります。`project` の外です。*
- 🔄 *時差を変えても、ページは保存の日時の文字を換算しません。同じ文字を別の時差で読むだけです。*
- 🔄 *`viewTimeZone.type` が `sameAsScheduleData` なら、見せる時差もついて行きます。*

```text
🔄 // 1. Before. Data time zone +09:00; the view follows the data.
🔄 GRS JSON:
🔄 "documentSettings": {
🔄   "viewTimeZone": { "type": "sameAsScheduleData" } },
🔄 "scheduleData": {
🔄   "scheduleDataTimeZone": { "utcOffset": "+09:00" },
🔄   "project": { "title": "工程表", "statusDate": "2026-11-25T17:00:00", "...": "..." },
🔄   "tasks": [ { "uid": 12, "name": "設計", "start": "2026-11-30T09:00:00", "...": "..." } ] }

🔄 // 2. The person changes the data time zone to +08:00 on the screen.
🔄 GRS JSON after step 2:
🔄 "documentSettings": {
🔄   "viewTimeZone": { "type": "sameAsScheduleData" } },          // unchanged, follows
🔄 "scheduleData": {
🔄   "scheduleDataTimeZone": { "utcOffset": "+08:00" },
🔄   "tasks": [ { "uid": 12, "name": "設計", "start": "2026-11-30T09:00:00", "...": "..." } ] }
🔄 //    The text "2026-11-30T09:00:00" stays. It now means 09:00 at +08:00.
🔄 //    The screen still shows 09:00, because the view follows the data.
🔄 //    If the view were { "type": "fixed", "utcOffset": "+09:00" },
🔄 //    the screen would show 10:00 (the view converts; the data does not).

🔄 // 3. The AI hears about the change (a scheduleData value, so scheduleDataUpdatedAt moves).
🔄 call:   watchChanges { "waitMilliseconds": 30000 }
🔄 answer: [ { "watcher": "my-ai",
🔄             "stamp": { "scheduleDataUpdatedAt": "2026-11-25T02:00:00Z",
🔄                        "lastEditedBy": { "type": "user" }, "...": "..." } } ]
🔄 call:   readDocument { "parts": ["documentSettings"] }
🔄 //      whether the scheduleData head values come with any parts value: UNVERIFIED

🔄 // 4. The AI makes the same change. Three shapes exist on paper.

🔄 // 4a. alpha (CM-94, grs-commands.schema.json)
🔄 { "kind": "setScheduleDataTimeZone", "scheduleDataTimeZone": "UTC+08:00" }
🔄 //    The value is a string key such as "UTC+08:00".
🔄 //    Its description says: send it in one write with the command that returns
🔄 //    the shown time zone to the standard (setViewTimeZone with null).

🔄 // 4b. CR-851 map (editProject, written before JDG-3618 moved the value out of project)
🔄 { "type": "editProject",
🔄   "set": { "scheduleDataTimeZone": { "utcOffset": "+08:00" } } }
🔄 //    The map writes "kind"; JDG-3564 makes it "type".
🔄 //    The other keys of editProject.set land in scheduleData.project:
🔄 //      set.title      -> scheduleData.project.title
🔄 //      set.statusDate -> scheduleData.project.statusDate
🔄 //    This one key lands outside project:
🔄 //      set.scheduleDataTimeZone -> scheduleData.scheduleDataTimeZone

🔄 // 4c. the two other options in Q19
🔄 //    option a: { "type": "setScheduleDataTimeZone",
🔄 //                "scheduleDataTimeZone": { "utcOffset": "+08:00" } }
🔄 //    option b: { "type": "editScheduleData",
🔄 //                "set": { "scheduleDataTimeZone": { "utcOffset": "+08:00" } } }

🔄 // 5. Whatever the shape, the page writes the same GRS JSON as in step 2,
🔄 //    and the answer is a WriteOutcome with isScheduleDataUpdated true.
🔄 call: applyCommands { "request": { "expectedStamp": { "...": "..." }, "commands": [ <4b, 4c-a or 4c-b> ] } }
🔄 answer: { "isAccepted": true, "stamp": { "...": "..." },
🔄           "isScheduleDataUpdated": true, "createdUids": [] }
```

🔄 *`scheduleData` の頭の値と、命令が書けるか:*

| 🔄 *キー* | 🔄 *命令が書くか* |
|:---|:---|
| 🔄 *`scheduleDataTimeZone`* | 🔄 *書く（どの命令かは問 19）* |
| 🔄 *`sourceFormat`・`importedTopTaskOutlineLevel`・`mspdiImportCount`・`lastMspdiImport`・`highestIssuedUid`* | 🔄 *書かない（取り込みと GRS だけが書く）* |

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 🔄 *名つきの命令 `setScheduleDataTimeZone`（引数 `scheduleDataTimeZone: { "utcOffset": "+08:00" }`）。P-3「`set` は値を 1 つ置く」。`scheduleData` の頭で命令が書ける値はこれだけ* |
| b | 🔄 *`editScheduleData`（`set.scheduleDataTimeZone`）。`edit<物>` の形だが、書ける値が 1 つだけ* |
| c | 🔄 *`editProject.set.scheduleDataTimeZone`（CR-851 の対応表のまま）。`editProject` のほかの値は `project` の中に入るのに、この値だけ `project` の外に入る* |

回答:

#### ❓ 問 21. 遅延診断の答えの欄 `outcome` —— 診断したか

場面: AI が `readDelayDiagnosis`（遅延診断の結果を読む）を呼びます。答えの頭の欄 `outcome` は `"diagnosed"`（診断した）か `"notDiagnosed"`（基準日が無いので診断しなかった）の 2 つの値だけを持ちます。

食い違い: この API では、語 Outcome は「値か断りを返す答えの型」の語尾です（P-9。`WriteOutcome`・`ImportOutcome`）。答えの中の欄 `outcome` は別の物（診断したか）を言います。AI は `outcome` に断りが入ると読みます。

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 真偽 `isDiagnosed`。P-7「答えの真偽は `is…`」。値が 2 つだけなので真偽で足りる |
| b | `diagnosisResult`（値は今の 2 つ）。形を変えない。「結果」を診断の中身と読み違えうる |
| c | 欄を無くす。基準日が無いときは `statusDate` を書かないので、それで分かる（無いことに意味を持たせる形で、`JDG-3740` に近い） |

回答:

#### ❓ 問 22. 遅延診断の答えの欄 `terminalsReached` —— 2 つの裁定が食い違う

場面: ボトルネックの行ごとに、そのタスクの遅れが届く末端タスク（マイルストーンと後続の無いタスク）の数を返す欄です。

食い違い: `JDG-3473`（2026-10-30）がこの欄を `endTasksReached` と決めました。後の方針 P-8（`JDG-3716`・`JDG-3776`）は「個数は `…Count` で終える」と決めました。後の方針は前の名を覆すと書いていません。

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | `reachedEndTaskCount`。後の方針 P-8 に合う。`taskRowCount`・`rowCount` と同じ形 |
| b | `endTasksReached`（`JDG-3473` のまま） |
| c | `endTaskCount`。短いが「届いた」が名から落ちる |

回答:

#### ❓ 問 23. 遅延診断の答えの欄 `markerStates` —— 禁じた語 Marker

場面: 答えはタスクごとに、遅延診断がそのタスクに付けた印を返します。値は `unreliable`（信用できない、紫）・`bottleneck`・`bottleneckPath`・`delay` の 4 つです。

食い違い: `JDG-3372` は語 Marker を禁じました（進捗の印は `progressStatusMark`、`JDG-3742`）。欄の中の `row` も仕様書の行 ID（`DG-1`〜`DG-4`）を返し、`JDG-3285` に反します。

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | `diagnosisMarks`（中は `taskUid`・`diagnosisMark`）。GRS JSON β の説明が同じ値を「the diagnosis marks」と呼ぶ（P-4）。値 `delay` は診断の前から付く印も入る |
| b | `progressStatusMarks`（中は `progressStatusMark`）。進捗ステータスマークの語。ただし 5 つの進捗ステータスは入らない |
| c | `diagnosisStatuses`（中は `diagnosisStatus`）。表の列 `diagnosisStatus` の語。ただし列の値の組（`suspicion`・`omission` を含む）と違う |

回答:

#### ❓ 問 24. 遅延診断の答えの、新しい英語の名の表

場面: 遅延診断の答えは、指摘の観点（どの検査に当たったか）を、今は仕様書の行 ID（`VC-1` など）で返します。`JDG-3285` は外に出す値の行 ID を禁じ、意味の英語の名にすると決めました。どの裁定も名をまだ付けていません。席は、前置詞を避け（P-5）、GRS JSON β の語（`percentCompleteNoActualStart` の `percentComplete` など）と用語集の語を使って、名を選びました。答えの中の名の全部（265 名）と、規則で決まった名は `agent-api-names-delay-diagnosis-draft.md` にあります。

**24-1 観点のキー**: 指摘の行で観点を言う欄（今は `row`）を `reason`（修正案の行では `findingReason`）にします。表の列「理由」の名 `diagnosisReason`（`JDG-3726`）の語です。もう 1 つの案は `check`。

**24-2 観点の名（26）と、診断が止まった訳の名（2）**

| 行 | 中身 | 推しの名 |
|:---|:---|:---|
| VC-1 | 依存に輪がある | `dependencyCycle` |
| VC-2 | 自分への依存 | `selfDependency` |
| VC-3 | 同じ向きの依存が 2 本以上 | `duplicateDependency` |
| VC-4 | マイルストーンなのに開始と終了が違う | `milestoneDatesDiffer` |
| VC-5 | 完了率が 0 より大きいのに実績開始が無い | `percentCompleteNoActualStart` |
| VC-6 | 実績終了があるのに実績開始が無い | `actualFinishNoActualStart` |
| VC-7 | 未着手なのに中断・再開の日を持つ | `notStartedSuspended` |
| VC-8 | 実績終了があるのに再開日が有効 | `finishedResumeConfirmed` |
| VC-9 | 親が完了なのに子に未完了 | `parentFinishedChildUnfinished` |
| VC-10 | 子が全部完了なのに親が未完了 | `childrenFinishedParentUnfinished` |
| VC-11 | 親の予定の両端が子と違う | `parentPlanSpanMismatch` |
| VC-12 | 親の実績の両端が子と違う | `parentActualSpanMismatch` |
| VC-13 | 後続が完了なのに、縛る先行の端が起きていない | `bindingPredecessorEndMissing` |
| VC-14 | 手で完了にしたマイルストーンの先行に未完了 | `milestoneFinishedPredecessorUnfinished` |
| VC-15 | 予定の日付が依存の向きに反する | `planDatesViolateDependency` |
| VS-1 | 親と子の間に依存がある | `parentChildDependency` |
| VS-2 | 子を持つマイルストーン | `milestoneHasChildren` |
| VS-3 | 先行が未着手なのに後続が着手済み | `successorStartedPredecessorNotStarted` |
| VS-4 | 実績の日付が依存の向きに反する | `actualDatesViolateDependency` |
| VS-5 | 実績の日付が基準日より後 | `futureActualDate` |
| VS-6 | 親の進捗の点が子孫の点の範囲を外れる | `parentProgressPointMismatch` |
| VO-1 | 実績開始が無い | `actualStartMissing` |
| VO-2 | 実績終了も中断も無い | `actualFinishMissing` |
| VO-3 | FS の後続が着手済みなのに、先行に実績終了が無い | `predecessorActualFinishMissing` |
| VO-4 | 親が 1 つに決まらない（診断が止まった訳 `DW-2` も同じ名） | `parentTaskUndecided` |
| VO-5 | 達成しているのに手の実績終了が無い | `milestoneAchievedNotFinished` |
| DW-3 | 先行の無いマイルストーン（診断が止まった訳） | `milestonePredecessorMissing` |

**24-3 そのほかのキーと、修正案の択の語**

| 今の名 | 推しの名 | もう 1 つの案 | 訳 |
|:---|:---|:---|:---|
| `taskGroupAboveWithoutSpanBar` | `spanlessParentTaskGroupName` | `parentTaskGroupName` | 前置詞を避ける（P-5）。値は名だけにする |
| `openField` | `focusTarget` | `focusedField` | open は読みが 2 つ（P-5） |
| `depth` | `parentTaskDepth` | `taskTreeDepth` | 用語集の Depth（タスクグループの木）と分ける（P-4） |
| `deleteLinkBetween` | `deleteNamedDependency` | `deleteDependencyLine` | Between は前置詞。Link は命令の語 Dependency にそろえる |
| `keepThisLink` | `keepDependency` | `keepOneDependency` | This は指す語（P-5） |
| `finishChildrenOnParentFinish` | `finishChildrenParentFinishDay` | `finishOpenChildren` | On は前置詞 |
| `finishPredecessorsOnMilestoneDate` | `finishPredecessorsMilestoneDay` | `finishOpenPredecessors` | 同上 |
| `makeParentTaskFromTaskGroup` | `makeTaskGroupParentTask` | `createParentTaskForTaskGroup` | From は前置詞 |
| `markAsStarted`・`markAsFinished`・`markAsStillInProgress` | `markStarted`・`markFinished`・`markStillInProgress` | 今のまま | As は前置詞 |

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | 表のとおり（推しの名） |
| b | 直す行がある（行に ★ を付けるか、回答に行と名を書く） |

回答:

#### ❓ 問 25. 席が方針で決めた名 —— このとおりでよいか

AI-C の所見と、一覧に出てこなかった名のうち、方針か前の裁定で名が 1 つに決まる物を、席が決めました（`JDG-3686`）。持ち主が決めた名（`JDG-3781`）を改める行もあるので、まとめて見せます。

| 今の名 | 席が決めた名 | 決めた規則 |
|:---|:---|:---|
| 型 `AgentDelayDiagnostics` と、それが広げる型 `DelayDiagnosticsReport` | 1 つの型 `DelayDiagnosisReport` に畳む | 仕様書の表 T-317 が修正案と修正の記録も持つ。1 つの物に 1 つの型（P-4・`JDG-3512`）。2 つが同じ名になるぶつかりも消える |
| `readShownTasks`・型 `ShownTasks` | `readDrawnTasks`・`DrawnTasks` | 欄 `drawnTaskUids` と 1 語（P-4）。`shown` は GRS JSON の `showMode` の値で別の意味 |
| `SavedFile.savedTo`・`SavedFile.backedUpTo` | `savedFilePath`・`backupFilePath` | 同じ種類の値 `existingFilePath` と同じ語（P-4）。前置詞で終えない（P-5） |
| 断りの訳 `canceled` | `canceledByUser` | 何が・どうなった（P-10）。過去分詞＋By は、した者（P-11） |
| 断りの理由 `confirmationInProgress` | `questionInProgress` | 人に出した問いは `pendingQuestion`（`JDG-3774`）と同じ物（P-4） |
| 断りの理由 `noFixProposalToApply` | `fixProposalsEmpty` | 兄弟 `historyEmpty` と同じ形（P-10）。否定の形を避ける（`JDG-3740`） |
| `closeWindow.window` | `closeWindow.tableWindow`（型 `TableWindowName`） | 窓の名を受ける引数は 1 つの語（P-4）。プロパティパネルは道具 `closePropertiesPanel` へ移った。人が閉じられる表の窓は AI も閉じられる（`JDG-3671`） |
| 型 `Document` | `ScheduleDocument` | GRS JSON β の根の物の名（P-4）。部分だけを返す答えは説明の文で言う |
| 型 `AgentRefusalReason` | `RefusalReason` | 頭の `Agent` を外す（P-5） |
| 断りの欄 `target` | `member` | CR-851 の対応表と一覧の `member`（`JDG-3781`） |
| 表の列の欄 `kind` | `valueType` | `JDG-3564` |
| 命令の中の `carriedActualDuration` | `passthroughActualDuration` | carry を passthrough に替える（`JDG-3766`・P-4） |
| 暦の例外の `recurrenceKind` | `type` | GRS JSON の `exceptions[].type`（`JDG-3628`・P-4） |
| `editTableWindow.set` の `shownTaskUids`・`shownResourceUids`・`isUnassignedShown`・`sort` | `checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`・`columnSort` | GRS JSON β の窓のキー（`JDG-3713`・`JDG-3708`・P-4） |
| 型 `InvariantRow`・`CodecRefusalReason`、暦の例外の `carryElements`・`carry`・`ordinal`、引出し線の形 `calloutBox`・`polyline` | 無くす | 行 ID を外に出さない（`JDG-3285`）。持ち越しは `grs.passthrough` 1 つ（`JDG-3606`・`JDG-3748`）。引出し線の形は CR-851 の対応表が退ける |

席が直す（新しい名を作らない）: 方針 P-4 に「`set` は物の中の道から `grs` の段だけを除いて書く」、P-9 に「欄の名の名詞を含み、物の語を頭に足してよい（`TableRow`、`JDG-3782`）」、P-11 に「画面の札から来た名の前置詞は札のまま（`zoomToFit`）」と「過去分詞＋By＋手段（`isScheduleFilteredByChecks`、`JDG-3728`）」を足した。一覧に `editTableWindow.set` の行、表の値と窓の名の対応、数え方の直し、`watcher` の説明を足した。

| 案 | 内容 |
|:---|:---|
| **a（推奨）** | このとおり |
| b | 直す行がある（行に ★ を付けるか、回答に行と名を書く） |

回答:

#### 🔄 *❓ 問 26. 前の名 `Refusal` を別の物に使い回す件*

🔄 *場面: 断りの型は 2 つです。呼び出しごと断る答えの型 `Refusal`（前の名 `AgentRefusal`）と、束の中の 1 つの命令の断り `CommandRefusal`（前の名 `Refusal`）です（`JDG-3781`）。*

🔄 *下のコードブロックの 1・2・3・4・5・6 行目が変わった。*
```json
{ "isAccepted": false,
  "refusal": {                                  // type Refusal (was AgentRefusal)
    "refusedBy": "page", "member": "applyCommands", "reason": "commandRefused",
    "commandRefusals": [                        // type CommandRefusal (was Refusal)
      { "commandIndex": 0, "commandType": "editTask",
        "reason": "finishBeforeStart", "jsonPointer": "/set/finish" } ] } }
```

🔄 *食い違い: 新しい ANMS/NDD の基準書の付録 A.2 は、前の名を別の物に使い回さないとします。前は 1 つの命令の断りを指した名 `Refusal` が、今は呼び出しごとの断りを指します（用語集の席が見つけた。`studies/82-anms-ndd-apply-plan/glossary-review/glossary-review-base.md` の「前の名を別の語が名に使う例」）。α の Agent API を読んだ AI は、`Refusal` を 1 つの命令の断りと読みえます。*

| 🔄 *案* | 🔄 *内容* |
|:---|:---|
| 🔄 ***a（推奨）*** | 🔄 *今のまま。β の前で、α の Agent API の名を使う外の呼び手はいない。P-9 で、欄 `refusal` の型は `Refusal`* |
| 🔄 *b* | 🔄 *呼び出しごとの断りの型を `RequestRefusal` に改める（欄の名 `refusal` はそのまま）。前の名 `Refusal` を退ける。P-9 の「欄の名を PascalCase にした名」から外れる* |
| 🔄 *c* | 🔄 *1 つの命令の断りの型を元の `Refusal` に戻し、呼び出しごとの断りを `AgentRefusal` に戻す（`JDG-3781` を改める。頭の `Agent` は P-5 に反する）* |

回答:

***

## ❓ 自由

回答:
