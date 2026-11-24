# Agent API の基本 —— 名を裁定する前に読む 1 枚

この紙は、Agent API の基本の方針と基本のプロトコルを説明します。
名は新しい名（一覧 `agent-api-names-by-policy-draft.md`・`JDG-3786`・`JDG-3787`）で書きます。
GQA BGQA7 の問 14〜19・21〜25 でまだ問うている名は、一覧の今の名で書き、「（問 N で問い中）」と添えます。
「未確認」は、席が資料で確かめきれなかった所です。
ファイルの所は、リポジトリの根からの所です。この紙は Agent API の名 2 の席が作業役に下書きさせ、席が確かめた（2026-11-25）。

***

## 1. Agent API とは

### 1.1 だれが呼ぶか

AI が呼びます。
人は画面で GRS を使います。
AI は Agent API で同じ文書を読み書きします。
Agent API は、人の画面と同じ検証と同じ制限を通します（`AG-5`）。

### 1.2 2 つの入口

Agent API は入口を 2 つ持ちます。
2 つの入口は同じメンバを同じ名で持ちます。

| 入口 | 何か | だれが使うか | 呼び方 |
|:---|:---|:---|:---|
| ページの物 | ページがスクリプトに出す物。識別子は `grSchedulerAgentApi` | ページの中で動くスクリプト | JavaScript のメソッドを呼ぶ。答えは値か `Promise` |
| 取次の MCP の道具 | 取次（GRS Relay）が出す MCP の道具。道具はページのメンバと 1 対 1 で、名も同じ | AI のアプリ（MCP の客） | 道具を呼ぶ。入力は 1 つのオブジェクトで、鍵は引数の名 |

2 つの入口の関係は次のとおりです。

```text
AI app (MCP client)
   |  MCP tool call, e.g. readStamp {}
   v
GRS Relay (separate process on 127.0.0.1, holds no document)
   |  JSON-RPC 2.0 over WebSocket: {"method":"readStamp","params":{}}
   v
GRS page in the browser (holds the only copy of the document)
   |  calls grSchedulerAgentApi.readStamp()
   v
answer travels back the same way, as a value
```

- 取次は呼び出しを運ぶだけです。取次は文書もドメインの規則も持ちません。
- ページが検証し、断り、刻印を照らします。
- 取次だけが持つ鍵が 3 つあります。書き出しの道具の `fileName`・`overwrite` と、`watchChanges` の `waitMilliseconds` です。取次はこの鍵を読み、ページへ運びません。
- `readSchema` は取次だけが答えます。取次は中に持つスキーマで答えるので、ページが繋がる前にも答えます。
- ページの物の `watchChanges` は、受け手の関数 `receive` を受けます。MCP の道具は関数を運べないので、待つ長さ `waitMilliseconds` を受けます。

### 1.3 文書の唯一の写し

ブラウザで開いたページが、文書の唯一の写しを持ちます。
取次は写しを持ちません。
AI も写しを持ちません。AI は要る所だけを読み、命令を送ります。
ページが書き込みを確定します。
ファイルに保存するときは、AI が書き出しの道具に `fileName` を渡し、取次が人の決めたフォルダへ書きます。

出どころ: `docs/spec/_assets/design-mcp-relay.md:14-16`・`:57-96`・`:98-117`・`:252-258`、`docs/spec/_assets/tbl-agent-api-members.md:96`、`docs/spec/_source/glossary.json:23646-23652`、`docs/spec/01-04-requirements.md:8223`・`:8230`

***

## 2. 基本の流れ（プロトコル）

### 2.1 5 つの段

1. AI が刻印を読みます（`readStamp`）。
2. AI が要る所だけを読みます（`readSearchRows`・`readDocument` ほか）。
3. AI が文書の命令の束を書きます（`applyCommands`）。束に、最後に読んだ刻印を `expectedStamp` として添えます。
4. ページが束を全部当てるか、1 つも当てないかを決めます。束の途中で 1 つでも断れば、ページは全部を元に戻します（`AG-3`）。
5. ページが答えを値で返します。受けたら新しい刻印を、断ったら断りの値と今の刻印を返します。断りは誤りでなく値です。

### 2.2 刻印とは

刻印（`DocumentStamp`）は、文書がいつ・だれによって変わったかを言う小さな値です。
GRS JSON の `documentStamp` と同じ形です。

| キー | 中身 |
|:---|:---|
| `scheduleDataUpdatedAt` | スケジュールデータが変わった時（UTC）。文書設定だけの変更では進まない |
| `documentUpdatedAt` | 文書設定も含めて、文書が変わった時（UTC） |
| `fileSavedAt` | 保存した時（UTC）。初めて保存するまでキーを書かない |
| `lastEditedBy` | 最後に編集した者（`type` は `user`・`template`・`agent`、`name`） |

- ページは `expectedStamp` を今の刻印と全部の値で比べます。1 つでも違えば、束ごと `staleStamp` で断ります（`AG-2`）。
- 断りの値は文書を載せません。今の刻印だけを載せます。AI は要る所を読み直します。
- 人が画面を見て回るだけ（ズーム・スクロール）では、刻印は動きません。

### 2.3 1 回のやり取りの全部

場面: 人が開いた文書に、タスク「設計」（uid 12）があります。AI は「設計」の終了を 1 日のばし、新しいタスク「試験」を足します。

```json
// 1. read the stamp
// call:   readStamp {}
// answer:
{ "scheduleDataUpdatedAt": "2026-11-25T01:00:00Z",
  "documentUpdatedAt": "2026-11-25T01:00:00Z",
  "fileSavedAt": "2026-11-24T09:00:00Z",
  "lastEditedBy": { "type": "user" } }

// 2. read what you need (one page of the Search Window, the word "設計")
// call:   readSearchRows { "word": "設計", "offset": 0, "limit": 100 }
// answer (part): taskRows[0] has taskUid 12, start 2026-11-30T09:00:00, finish 2026-12-04T17:00:00

// 3. write one batch with expectedStamp
// call:   applyCommands
{ "request": {
    "expectedStamp": {
      "scheduleDataUpdatedAt": "2026-11-25T01:00:00Z",
      "documentUpdatedAt": "2026-11-25T01:00:00Z",
      "fileSavedAt": "2026-11-24T09:00:00Z",
      "lastEditedBy": { "type": "user" } },
    "commands": [
      { "type": "editTask", "taskUid": 12,
        "set": { "finish": "2026-12-07T17:00:00" } },
      { "type": "createTask", "taskShape": "rectangle",
        "start": "2026-12-08T09:00:00", "finish": "2026-12-10T17:00:00",
        "taskGroupId": "9b1d3c2e-5f6a-4b7c-8d9e-0a1b2c3d4e5f" },
      { "type": "editTask", "taskUid": 31,
        "set": { "name": "試験" } }
    ] } }
// note: highestIssuedUid was 30, so createTask takes uid 31,
//       and the third command of the same batch can name it.

// 4-5. answer when the page applied all three commands (WriteOutcome)
{ "isAccepted": true,
  "stamp": { "scheduleDataUpdatedAt": "2026-11-25T01:05:00Z",
             "documentUpdatedAt": "2026-11-25T01:05:00Z",
             "fileSavedAt": "2026-11-24T09:00:00Z",
             "lastEditedBy": { "type": "agent", "name": "my-ai" } },
  "isScheduleDataUpdated": true,
  "createdUids": [31] }
```

同じ束で、1 つ目の命令が終了を開始より前にしたとき、ページは束を 1 つも当てずに断ります。

```json
// call: applyCommands, commands[0] = { "type": "editTask", "taskUid": 12,
//                                      "set": { "finish": "2026-11-27T17:00:00" } }
// answer (WriteOutcome, refused)
{ "isAccepted": false,
  "refusal": {
    "refusedBy": "page",
    "member": "applyCommands",
    "reason": "commandRefused",
    "message": "The batch was not applied: command 0 (editTask) finish is before start.",
    "stamp": { "scheduleDataUpdatedAt": "2026-11-25T01:00:00Z",
               "documentUpdatedAt": "2026-11-25T01:00:00Z",
               "fileSavedAt": "2026-11-24T09:00:00Z",
               "lastEditedBy": { "type": "user" } },
    "commandRefusals": [
      { "commandIndex": 0,
        "commandType": "editTask",
        "reason": "endBeforeStart",
        "jsonPointer": "/set/finish",
        "message": "finish 2026-11-27T17:00:00 is before start 2026-11-30T09:00:00" }
    ] } }
// endBeforeStart: the name is open in BGQA7 question 15.
// jsonPointer points inside the refused command, not inside GRS JSON (JDG-3787).
```

刻印が古いときの答えは短いです。

```json
{ "isAccepted": false,
  "refusal": { "refusedBy": "page", "member": "applyCommands",
               "reason": "staleStamp", "message": "...",
               "stamp": { "scheduleDataUpdatedAt": "2026-11-25T01:03:00Z", "...": "..." } } }
// The AI reads again what it needs, rebuilds the batch, and sends it with the new stamp.
```

- 断りの形の元は CR-851 の対応表の 6 節です。表の `from`・`kind`・`field` は、一覧と裁定で `refusedBy`・`commandType`・`jsonPointer` に変わりました。
- 答えの刻印の形は GRS JSON β の `DocumentStamp` に合わせました。対応表の例の刻印のキー（`scheduleUpdatedAt`・`grsBuildVersion`）は α の形です。
- `message` の文は例です（未確認）。

出どころ: `docs/spec/01-04-requirements.md:8220-8221`、`docs/spec/_assets/tbl-agent-api-members.md:31`・`:37`・`:70-73`・`:124-127`、`studies/76-grs-json-beta-shape/commands-map.md:405-442`、`studies/76-grs-json-beta-shape/terms/grs-json-final-review-tree.md:19-28`、`studies/76-grs-json-beta-shape/terms/grs-json-beta.schema.json:1818`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:258-259`・`:270-271`、`docs/development-records/rulings.md:3937`

***

## 3. 道具の一覧

道具は 7 つの群に分かれます。答えの型の「または」は、受けた形と断った形のどちらかを返すことを言います。

### 3.1 版と読む

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `agentApiVersionUtc` | Agent API の版を返す。AI は最初に読む | 無い | 文字列（UTC の時刻） |
| `schemaVersionUtc` | この GRS が読み書きする GRS JSON の版を返す | 無い | 文字列（UTC の時刻） |
| `readSchema` | 取次が中に持つスキーマを部分ごとに返す。引数が無ければ目次 | `part`（`document`・`commands`・`notes`）、`defs`（定義の名の並び）、`returnWholeSchema` | 文字列 |
| `readStamp` | 刻印を返す。軽い | 無い | `DocumentStamp` |
| `readDocument` | 文書の写しを返す。既定で MSPDI の持ち越しを除く | `includePassthrough`、`taskUids`、`parts` | `Document`（問 25 で問い中。席の案 `ScheduleDocument`） |
| `readSelection` | 人がいま選んでいる物を、選んだ順で返す | 無い | `Selection` |
| `readSearchRows` | 検索ウィンドウの 2 つの表（タスク・コメントボックス）の行を 1 ページ返す | `word`、`filters`（問 16 で問い中）、`offset`、`limit` | `SearchWindowPage` |
| `readTableRows` | 遅延診断レポート・修正案・修正の記録・担当リストの表の行を 1 ページ返す | `table`（`delayDiagnosisReport`・`fixProposals`・`fixLog`・`resourceList`）、`word`、`filters`（問 16 で問い中）、`offset`、`limit` | `TableRowsOutcome` |
| `readDrawnTasks`（一覧の名は `readShownTasks`。問 25 で問い中） | 日程表がいま描くタスクの uid と、チェックで日程表を絞っている表の窓を返す | 無い | `DrawnTasks`（一覧は `ShownTasks`。問 25 で問い中） |

ページ送りは次のとおりです。

- `offset` は最初に返す行の位置です。0 から数えます。省けば 0 です。
- `limit` は返す行の数です。省けば 100、上限も 100 です。
- 答えの `nextOffset` は続きの最初の位置です。続きが無ければ、キーを書きません（N-12）。
- 答えの `taskRowCount`（`readSearchRows`）と `rowCount`（`readTableRows`）は、語と列のフィルタが残した行の数です。
- `filters` の値は `asShown`（人が表に掛けた列のフィルタと並べ替えを当てる。省けばこれ）か `none` です（問 16 で問い中）。

### 3.2 書く

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `applyCommands` | 文書の命令の束を、全部か無しで当てる | `request`（型 `WriteRequest`: `expectedStamp`、`commands`） | `WriteOutcome` |
| `importDocument` | GRS JSON を取り込む。人に 3 択（置き換え・合流・前回予定として重ねる）を出したら、答えを待たずに返す | `source`（型 `ImportSource`: 文書そのもの・`{ document }`・`{ text }`） | `ImportOutcome` |
| `requestOpenFile` | 人にファイルを開いてもらう。選ぶのは人 | 無い | `ImportOutcome` |
| `undoEdit` | 履歴を 1 段戻す。段を書いたのが呼んだ AI でなければ断る | `expectedStamp` | `WriteOutcome` |
| `redoEdit` | 履歴を 1 段進める。同上 | `expectedStamp` | `WriteOutcome` |

- `WriteOutcome` は、受けたとき `isAccepted: true`・`stamp`・`isScheduleDataUpdated`・`createdUids` を持ちます。断ったとき `isAccepted: false`・`refusal` を持ちます。
- `ImportOutcome` は 3 つの形を持ちます。取り込みが着いた形、人に問うた形（`pendingQuestion`）、断った形（`refusal`）です。
- `importDocument` は GRS JSON だけを受けます。MSPDI のファイルは、人が `requestOpenFile` の後に自分で開きます。

### 3.3 書き出す

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `exportJson` | GRS JSON を返す | `fileName`、`overwrite`（どちらも取次だけの鍵） | `ExportOutcome` または `SavedFile` |
| `exportMspdi` | MSPDI を返す | 同上 | 同上 |
| `exportSvg` | 書き出す絵を SVG で返す | 同上 | 同上 |
| `exportPng` | 絵を PNG で返す | 同上 | 同上 |
| `exportEmbeddedHtml` | 本体と文書を合わせた 1 つの `.html` を返す | 同上 | 同上 |
| `exportFixLogTsv` | 修正の記録を `.tsv` の文字列で返す | 同上 | 同上 |

- `fileName` を渡すと、取次が値をファイルに書き、`SavedFile` を返します。`SavedFile` は `savedTo`・`bytes`・`backedUpTo` を持ちます（問 25 で問い中。席の案 `savedFilePath`・`backupFilePath`）。
- 同じ名のファイルがあり、`overwrite` が無ければ、取次は `fileExists` で断ります。AI は人に問うてから `overwrite: true` を渡します。前の中身は `.bak` に 1 つ残ります。

### 3.4 見せる

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `focusTask` | タスクが載るタスクグループを開き、見える所へ表示を寄せる。開いたら履歴の 1 段 | `taskUid` | `FocusOutcome` |
| `showOnlyTasks` | 検索ウィンドウのチェックを並びのタスクに置き換え、チェックで日程表を絞る。空の並びは解除 | `taskUids` | `WriteOutcome` |
| `closeWindow` | 遅延診断レポートの窓を閉じる | `window`（問 25 で問い中。席の案 `tableWindow`） | `WriteOutcome` |
| `closePropertiesPanel` | プロパティパネルを閉じる（新しい道具） | 無い | `WriteOutcome`（未確認） |

### 3.5 見張る

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `watchChanges` | 自分以外の書き手が確定した変更を待つ。自分の書き込みでは起きない | ページ: `receive`（受け手の関数）。MCP: `waitMilliseconds`（40,000 で頭打ち） | `WatchOutcome`（`isEarlierWatchReplaced`、`stopWatching()`） |

- 届く知らせ `ChangeNotice` は `watcher`（受ける書き手の名）と `stamp` を持ちます。文書は載せません。
- 文書設定だけの変更では知らせません（`AG-6`）。

### 3.6 遅延診断

| 道具 | 何をするか | 主な引数 | 答えの型 |
|:---|:---|:---|:---|
| `readDelayDiagnosis` | 遅延診断を計算して返す。画面も文書も変えない | `parts`、`limit`（1 つの並びの上限。0 は上限なし） | `DelayDiagnosisReport` |
| `runDelayDiagnosis` | 画面で遅延診断を実行する。人が炎のボタンを押したのと同じ。文書と刻印は変えない | 無い | `WriteOutcome` |
| `applyFixProposals` | 修正案を 1 つの束として当てる。空の並びは推奨の全部 | `expectedStamp`、`fixProposalKeys` | `WriteOutcome` |
| `readTableRows`（表 `delayDiagnosisReport`・`fixProposals`・`fixLog`） | 窓が出すとおりの行を 1 ページ返す | 3.1 と同じ | `TableRowsOutcome` |
| `exportFixLogTsv` | 修正の記録を `.tsv` で返す | 3.3 と同じ | 3.3 と同じ |

- `readDelayDiagnosis` の答えの中の名（`outcome`・`terminalsReached`・`markerStates`・行 ID の値）は、問 21〜24 で問い中です。
- 型 `DelayDiagnosisReport` を 1 つに畳むかは問 25 で問い中です。

出どころ: `docs/spec/_source/agent-api-members.json:173`・`:221`・`:277`・`:332`・`:356`・`:379`・`:449`・`:524`・`:548`・`:604`・`:639`・`:672`・`:701`・`:748`・`:818`・`:1071`・`:1105`・`:1145`・`:1173`・`:1209`、`docs/spec/_assets/tbl-agent-api-members.md:27-53`・`:70-88`、`docs/spec/_assets/design-mcp-relay.md:119-126`・`:150-153`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:144-264`・`:472`、`studies/76-grs-json-beta-shape/terms/goodrelax-qa-b7-agent-api-naming.md:136-162`・`:212-333`

***

## 4. 文書の命令（DocumentCommand）

### 4.1 判別子 `type`

1 つの命令は 1 つのオブジェクトです。
キー `type` が命令の名を持ち、ほかのキーの組を選びます（`JDG-3564`）。
α の原稿は `kind` と書きます。CR-851 の実装が `type` に直します。
命令の形の全部は、取次の資源 `grs-commands.schema.json` が持ちます。AI は `readSchema` の `part: "commands"` と `defs` で、要る命令の形だけを読みます。

### 4.2 命令の一族

CR-851 の対応表は、α の 93 の命令を 43 に畳みました（編集の命令 9 と、名つきの命令 34）。

| 一族 | 働き | 例（新しい名） |
|:---|:---|:---|
| `edit<物>` | 1 つの物の欄を `set` で書き、`clear` で消す | `editProject`・`editTask`・`editTaskStyle`・`editTaskGroup`・`editResource`・`editCommentBox`・`editHighlightBox`・`editDocumentSettings`・`editTableWindow` |
| `create…` | 物を作る | `createTask`・`createTaskGroup`・`createDependency`・`createResource`・`createAssignment`・`createCommentBox`・`createHighlightBox` |
| `delete…` | 物を消す | `deleteTask`・`deleteTaskGroup`・`deleteDependency`・`deleteDependencyAt`・`deleteResources`・`deleteUnreferencedResources`・`deleteAssignment`・`deleteCommentBox`・`deleteHighlightBox` |
| `set…` | 計算を伴って値を 1 つ置く | `setTaskProgressStatus`・`setDependencyLag` |
| そのほか | 動かす・写す・並べ直す・ずらす | `shiftScheduleByMinutes`・`shiftScheduleToStartDay`・`pasteTasks`・`pasteTaskGroupSubtree`・`moveTaskToTaskGroup`・`moveTaskGroup`・`reorderTaskGroupSiblings`・`beginTaskActual`・`cycleTaskProgressStatus`・`replaceCalendarRules`・`pinTaskGroup`・`unpinTaskGroup`・`bringCommentBoxToFront`・`bringHighlightBoxToFront`・`zoomToFit` |

- タスクグループの出し方の命令（`setTaskGroupShowMode`・`setTaskGroupShowModesToAutomaticExceptHidden`）と、α の `resetTaskGroupTreeStates` の行方は、対応表に行がありません（未確認）。
- データの時差を書く命令は問 19 で問い中です（対応表は `editProject` の `set.scheduleDataTimeZone`）。

### 4.3 `edit<物>` の決まり

- `set` と `clear` のどちらか 1 つ以上を持ちます。空の `set`・空の `clear` は書きません。
- `set` にも `clear` にも無い欄は、そのままです。
- `clear` はプロパティを消します。任意のプロパティだけを消せます。
- 同じ欄を両方に書けば、ページは `fieldSetAndCleared` で断ります。
- ページは、書いた後の行で組の規則を判定します。AI は片方だけ送ってよいです（例: `finish` だけ）。
- 刻印と変更履歴（`changeLogEntries`）は、どの書き込みでも動きます。

### 4.4 命令の引数と GRS JSON のキー

方針 P-4 は「引数は、書くキーの名を持つ」と決めます。
`set` の中の道は、GRS JSON の物の中の道から `grs` の段だけを除いて書きます。
命令の行を指す鍵（`taskUid`・`taskGroupId`・`highlightBoxId`）は、物の uid か id を指します。

次の 3 つの例は、左の命令が右の GRS JSON の断片を書くことを示します。

```text
(1) a plain key                       | GRS JSON it writes
--------------------------------------+------------------------------------------
{ "type": "editTask", "taskUid": 12,  | "scheduleData": { "tasks": [
  "set": {                            |   { "uid": 12,
    "name": "設計",                    |     "name": "設計",
    "finish": "2026-12-07T17:00:00"   |     "finish": "2026-12-07T17:00:00",
  } }                                 |     ... } ] }

(2) a key under grs (set drops "grs") | GRS JSON it writes
--------------------------------------+------------------------------------------
{ "type": "editTask", "taskUid": 12,  | "scheduleData": { "tasks": [
  "set": {                            |   { "uid": 12,
    "startSlopeCalendarDays": 2       |     "grs": {
  } }                                 |       "startSlopeCalendarDays": 2 } } ] }

(3) a nested key (the path is kept)   | GRS JSON it writes
--------------------------------------+------------------------------------------
{ "type": "editDocumentSettings",     | "documentSettings": {
  "set": {                            |   "scheduleCanvasElements": {
    "scheduleCanvasElements": {       |     "isPlanBarVisible": false } }
      "isPlanBarVisible": false } } } |
```

もう 1 つ、表の窓の例です。`editTableWindow` の `set` のキーは、GRS JSON β の `TaskTableWindow` のキーと同じです。

```text
{ "type": "editTableWindow",           | "documentSettings": { "tableWindows": {
  "tableWindow": "searchWindow",       |   "searchWindow": {
  "set": {                             |     "isScheduleFilteredByChecks": true,
    "isScheduleFilteredByChecks": true,|     "checkedTaskUids": [12, 15] } } }
    "checkedTaskUids": [12, 15] } }    |
```

出どころ: `studies/76-grs-json-beta-shape/commands-map.md:1-17`・`:36-49`・`:140-177`、`studies/76-grs-json-beta-shape/terms/agent-api-naming-policy-draft.md:12`・`:22`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:8-142`・`:471`・`:501`、`docs/spec/_assets/design-mcp-relay.md:66-73`・`:82-89`、`studies/76-grs-json-beta-shape/terms/grs-json-final-review-tree.md:81-92`・`:187-239`・`:430-434`

***

## 5. 断り（Refusal と CommandRefusal）

### 5.1 欄

断りの値 `Refusal` は次の欄を持ちます。値の無い欄は書きません。

| 欄 | 中身 |
|:---|:---|
| `refusedBy` | 断った者: `page` か `relay` |
| `member` | 断られた道具の名（例 `applyCommands`）。CR-851 の対応表と一覧の名（問 25 は α の `target` を `member` と言う） |
| `reason` | 理由の名（型 `AgentRefusalReason`。問 25 で問い中。席の案 `RefusalReason`） |
| `message` | 人が読む英語の説明。仕様の行 ID を含めない |
| `stamp` | 今の刻印。`refusedBy` が `page` のときだけ |
| `commandRefusals[]` | 命令ごとの断り（型 `CommandRefusal`）。`reason` が `commandRefused` のときだけ |
| `documentFaults[]` | 取り込んだ文書の誤りごとの断り（`jsonPointer`・`reason`・`message`）。文書の検査で断ったときだけ |
| 理由ごとの欄 | `missingTaskUids`・`min`・`max`・`cause`・`waitedSeconds`・`existingFilePath`・`saveFolder`・`sentName`・`replacementName`・`pageUrl`・`converterUrl`・`knownSchemaVersionUtc` |

`CommandRefusal` は次の欄を持ちます。

| 欄 | 中身 |
|:---|:---|
| `commandIndex` | 束の中の位置（0 から） |
| `commandType` | 命令の名（命令の `type` の値） |
| `reason` | 理由の名 |
| `jsonPointer` | 命令の中の誤りの所（JSON Pointer。例 `"/set/finish"`、入れ子は `"/set/scheduleCanvasElements/isPlanBarVisible"`。`JDG-3787`） |
| `message` | 人が読む英語の説明 |

`CommandRefusal.jsonPointer` は命令の中を指します。`documentFaults[].jsonPointer` は文書の中を指します（例 `"/scheduleData/tasks/3/finish"`）。

### 5.2 理由の一族と、AI がすること

| 一族 | 理由の名（例） | AI がすること |
|:---|:---|:---|
| 待てば通る | `dragInProgress`・`inPlaceEditInProgress`・`confirmationInProgress`（問 25 で問い中。席の案 `questionInProgress`）・`noticeDeliveryInProgress` | 少し待って、同じ呼び出しをもう一度送る |
| 刻印が古い | `staleStamp` | 要る所を読み直し、束を作り直して送る |
| 無い物 | `notFound`（どの物かは `missingTaskUids`・`jsonPointer`・`commandType`・`member` が言う） | 読み直して、指す先を直す |
| 範囲の外 | `outOfRange`（`min`・`max`）・`unusableDate`・`imageTooTall`・`taskGroupTreeTooDeep`・`pinLimitReached`・`uidLimitReached`・`tooManyTasks`・`fileTooLarge` | 値を範囲の中へ直す。直せなければ人に告げる |
| 前後と組の矛盾 | `endBeforeStart`（問 15 で問い中）・`lastTaskGroupBeforeFirst`・`slopeWithoutFinish`・`slopeLongerThanTask`・`fillAndStrokeBothInvisible`・`milestoneShapeMismatch`・`selfDependency`・`alreadyExists`・`alreadyStarted`・`taskWithoutDates`・`siblingListMismatch`・`taskGroupParentCycle`・`taskParentCycle`・`fieldSetAndCleared`・`hyperlinkSchemeNotAllowed` | 命令の値を直して送る |
| 形の誤り | `malformedRequest`・`unknownCommand`・`retiredName`（`sentName`・`replacementName`）・`schemaViolation` | スキーマを読み直す。`replacementName` があれば、その名で送る |
| 文書の誤り | `documentInvalid`（`documentFaults[]`）・`formatTooNew`・`formatTooOld`（`converterUrl`） | `documentFaults[]` の所を直す。古い形式なら人に変換の所を告げる |
| いま呼べない | `notImplemented`・`notOwnEdit`・`historyEmpty`・`noFixProposalToApply`（問 25 で問い中。席の案 `fixProposalsEmpty`）・`notDrawnYet`・`importNotApplied`（`cause`） | 同じ呼び出しを繰り返さない。人に告げる |
| 作れなかった | `rasterFailed`・`embeddedHtmlFailed` | 人に告げる |
| 取次 | `pageNotConnected`（`pageUrl`）・`relayTimedOut`（`member`・`waitedSeconds`）・`badFileName`・`fileExists`（`existingFilePath`）・`saveFolderUnavailable`（`saveFolder`） | 人にページを開いてもらう。画面に問いが出ていないか人に尋ねる。上書きの前に人に問う |

- 知らない `reason` を受けたら、AI は失敗として扱います（`JDG-3301`）。
- `importNotApplied` の `cause` の値は `openInProgress`・`documentInvalid`・`canceled`（問 25 で問い中。席の案 `canceledByUser`）です。

出どころ: `studies/76-grs-json-beta-shape/commands-map.md:279-403`・`:436-442`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:270-391`、`studies/76-grs-json-beta-shape/terms/agent-api-naming-policy-draft.md:18`、`docs/development-records/rulings.md:3937`、`studies/76-grs-json-beta-shape/terms/goodrelax-qa-b7-agent-api-naming.md:317-333`、`docs/spec/_assets/design-mcp-relay.md:143-170`

***

## 6. 名の付け方の短い表

| 何の名か | 形 | 例 | 方針 |
|:---|:---|:---|:---|
| 値か断りを返す答えの型 | `…Outcome` | `WriteOutcome`・`ImportOutcome`・`ExportOutcome`・`FocusOutcome`・`WatchOutcome`・`TableRowsOutcome` | P-9 |
| 断りを含まない答えの型 | 物の名のまま | `SearchWindowPage`・`ShownTasks`・`Selection`・`DocumentStamp`・`SavedFile` | P-9 |
| 欄が入れる型 | 欄の名を PascalCase に。物の語を頭に足してよい | `refusal` → `Refusal`、`commandRefusals` → `CommandRefusal`、`rows` → `TableRow` | P-9 |
| ページが返す真偽 | `is…` | `isAccepted`・`isScheduleDataUpdated`・`isScrolled`・`isEarlierWatchReplaced` | P-7 |
| AI が渡すフラグ | 動詞で始める | `includePassthrough`・`overwrite`・`returnWholeSchema` | P-7 |
| 個数 | `…Count` | `taskRowCount`・`rowCount`・`unreliableCount` | P-8 |
| 何番目か（0 から） | `…Index` | `commandIndex`・`siblingIndex`・`deleteDependencyAt.index` | P-8 |
| 木の深さ | `…Depth` | `automaticallyShownDepth`（GRS JSON） | P-8 |
| ページ送り | 通り名のまま | `offset`・`nextOffset`・`limit` | P-8 |
| 鍵から値への対応表 | `<値>By<鍵>` | `taskGroupIdBySourceTaskUid` | P-11 |
| 断りの理由 | 何が・どうなった。直し方が同じなら 1 つの名 | `notFound`・`pinLimitReached`・`dragInProgress` | P-10 |
| 版の時刻 | `…Utc` | `agentApiVersionUtc`・`schemaVersionUtc` | P-1 |

出どころ: `studies/76-grs-json-beta-shape/terms/agent-api-naming-policy-draft.md:9-20`、`studies/76-grs-json-beta-shape/terms/goodrelax-qa-b7-agent-api-naming.md:26-41`

***

## 7. 平らか階層か —— 今の名の事実

この節は方針を決めません。今の形を並べるだけです。

### 7.1 Agent API と文書の命令

| 名 | 平らな引数 | オブジェクトの引数 | 中のキー |
|:---|:---|:---|:---|
| `applyCommands` | 無い | `request` | `expectedStamp`（オブジェクト）、`commands`（命令の並び） |
| `editTask` ほか `edit<物>` | `taskUid` など行を指す鍵 | `set`（オブジェクト）、`clear`（名の並び） | `set` の中は GRS JSON のキー。入れ子の物は入れ子のまま（`set.scheduleCanvasElements.isPlanBarVisible`・`set.style.color`・`set.fitDayRange`・`set.viewTimeZone`） |
| `editTableWindow` | `tableWindow` | `set` | `isScheduleFilteredByChecks`・`checkedTaskUids`・`columnFilters`・`columnSort`（α の `setTableView` は `view.visibility.…` の 2 段だった） |
| `createTask` | `taskShape` か `milestoneShape`、`start`、`finish`、`taskGroupId` | 無い | — |
| `createHighlightBox` | `highlightBoxId`、`firstDay`、`lastDay`、上と下のタスクグループ | 無い | 対応表が α の包み `range` を外した。上と下の名は対応表で `topTaskGroupId`・`bottomTaskGroupId`、GRS JSON β で `firstTaskGroupId`・`lastTaskGroupId`（一覧に行が無い。未確認） |
| `createCommentBox` | `commentBoxId` | `leaderTarget` | `type` で形を選ぶ（`freePoint`・`task`・`highlightBox`） |
| `pasteTasks` | `sourceTaskUids` | `placement` | `taskGroupIdBySourceTaskUid`（対応表）、`shiftMinutes` |
| `pasteTaskGroupSubtree` | `sourceTaskGroupId`、`parentTaskGroupId`、`showMode` | `newTaskGroupIdBySourceTaskGroupId`（対応表） | 鍵が元の id、値が新しい id |
| `setDependencyLag` | `predecessorUid`、`successorUid` | `lag` | `type`（`workingDays`・`duration`）で形を選ぶ。`workingDays`、または `minutes` と `displayUnit` |
| `beginTaskActual` | `taskUid`、`grabbedPoint`（文字列の値）、`snapMinutes` | `releasedPlace` | `start`・`finish` |
| `setTaskProgressStatus` | `taskUid` | `progressStatus`（問 18 で問い中） | `state` で形を選ぶ。`actualStart`・`stop`・`resume`・`actualFinish` |
| `cycleTaskProgressStatus` | `taskUid`、`snapMinutes` | `removedActual` | 覚えた実績（中のキーは未確認） |
| `shiftScheduleByMinutes`・`shiftScheduleToStartDay` | `minutes`・`newStartDay` | 無い | — |
| `applyFixProposals` | `fixProposalKeys` | `expectedStamp` | 刻印 |
| 読む道具（`readSearchRows`・`readTableRows`・`readDocument`） | 全部の引数 | 無い | — |
| 答え `WriteOutcome`・`Refusal` | 真偽・名・数の欄 | `stamp`、`commandRefusals[]`、`documentFaults[]` | 刻印、命令ごとの断り |
| 答え `ShownTasks` | `drawnTaskUids`、`filteringTableWindows`（並び） | 無い | — |

α から CR-851 への動きに、次の事実があります。

- 対応表は α の包みを 3 つ外しました。`setProjectProfile.fields`、`setHighlightBoxRange.range`、`setTableView.view.visibility` です。
- 対応表は `placeTaskPlanActual.place`（今の `setTaskProgressStatus.progressStatus`）の包みを残しました。理由は「5 つの列を表 T-019 の 1 行として置く計算」です。
- 包みを残した物の多くは、中の形を `type`（`state`）で選びます（`lag`・`leaderTarget`・`progressStatus`）。`progressStatus` だけは判別子の名が `state` です（`JDG-3564` は判別子を `type` と言う）。

### 7.2 GRS JSON β

| 所 | 平らなキー | オブジェクトのキー |
|:---|:---|:---|
| `tasks[]`（MSPDI と往復） | `start`・`finish`・`stop`・`resume`・`resumeValid`・`milestone`・`percentComplete`・`actualStart`・`actualFinish`・`deadline` ほか | `grs`（GRS だけの値の置き場）、`predecessorLinks[]` |
| `tasks[].grs` | `startSlopeCalendarDays`・`finishSlopeCalendarDays`・`taskGroupId` | `style`（形・塗り・線）、`importOrigin`（4 つの値） |
| `highlightBoxes[]` | `firstDay`・`lastDay`・`firstTaskGroupId`・`lastTaskGroupId` | `style` |
| `scheduleData` の頭 | `sourceFormat`・`mspdiImportCount`・`highestIssuedUid` | `scheduleDataTimeZone`（キーは `utcOffset` の 1 つ）、`lastMspdiImport`（`importedAt`・`fileName`）、`project` |
| `documentSettings` | `dayWidthPx`・`isTimeOfDayVisible`・`taskGroupPanelWidthPx` ほか | `viewTimeZone`（`type`・`utcOffset`）、`fitDayRange`（`type`・`firstDay`・`lastDay`）、`scrollPosition`（`type` と 4 つ）、`verticalZoom`（2 つ）、`scheduleCanvasElements`（11 の真偽）、`delayDiagnosisSettings`、`tableWindows` |
| `commentBoxes[]` | `text`・`hyperlink` ほか | `leaderTarget`（`type` で形を選ぶ）、`bodyOffsetPx`（`dx`・`dy`）、`style` |
| 根 | `schemaVersionUtc`・`buildVersionUtc` | `documentStamp`、`documentSettings`、`scheduleData` |

GRS JSON で見える事実は次のとおりです。

- MSPDI と往復する値は、MSPDI の形のまま平らです。タスクの実績の 4 つ（`actualStart`・`stop`・`resume`・`actualFinish`）は `tasks[]` の直下に並びます。
- GRS JSON のタスクは進捗ステータスのキーを持ちません。ページが日付から状態を導きます。
- オブジェクトは 3 つの所に出ます。`type` が中の組を選ぶ所（`viewTimeZone`・`fitDayRange`・`scrollPosition`・`leaderTarget`・`Color`）、一緒に動く値の組（`documentStamp`・`bodyOffsetPx`・`lastMspdiImport`・`verticalZoom`）、描く物の束（`scheduleCanvasElements`）です。
- `scheduleDataTimeZone` は、中のキーが 1 つでもオブジェクトです（`{ "utcOffset": "+09:00" }`）。

出どころ: `studies/76-grs-json-beta-shape/commands-map.md:21-34`・`:93-104`・`:129-177`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:28-61`・`:80-89`、`studies/76-grs-json-beta-shape/terms/agent-api-names-missing-from-list.md:107`・`:153`、`docs/spec/_source/grs-commands.schema.json:452`・`:726`・`:2373`、`studies/76-grs-json-beta-shape/terms/grs-json-final-review-tree.md:46-118`・`:122-239`・`:315-391`、`docs/development-records/rulings.md:3936`

***

## 8. GRS JSON との関係

GRS JSON は、文書を 1 つのファイルにした形です。
Agent API は、開いた文書をその GRS JSON の語で読み書きします。
読む道具の多くは、GRS JSON のキーを返すか、GRS JSON から画面と同じ計算をした行を返します。
書く道具は文書の命令を通して GRS JSON のキーを書きます。命令の引数は書くキーの名を持ちます（P-4）。
刻印と変更履歴は、どの書き込みでも動きます。
画面だけの値（選んでいる物・履歴の段・遅延診断の結果）は、GRS JSON に入りません。
GRS JSON β は凍結しました（`JDG-3807`）。Agent API の名を変えても、GRS JSON のキーは変わりません。

| 道具 | GRS JSON で言うと |
|:---|:---|
| `readStamp` | `documentStamp` を読む |
| `readDocument` | 根の物（`ScheduleDocument`）の全部か一部を読む。`grs.passthrough` は `includePassthrough` のときだけ |
| `readSearchRows` | `scheduleData.tasks[]`・`commentBoxes[]` から行を作る。`filters` が `asShown` なら `documentSettings.tableWindows.searchWindow` の `columnFilters`・`columnSort` を当てる |
| `readTableRows` | `tableWindows.delayDiagnosisReportWindow`・`resourceListWindow` の `columnFilters`・`columnSort` を当て、計算した行を返す |
| `readDrawnTasks`（問 25） | `tableWindows.*.isScheduleFilteredByChecks` と `checkedTaskUids`・`checkedResourceUids` から、描くタスクを計算する |
| `readSelection` | GRS JSON に無い画面の値を読む |
| `readDelayDiagnosis` | `project.statusDate`・`delayDiagnosisSettings`・タスクの日付から計算する。結果は GRS JSON に入らない |
| `applyCommands` | 命令が GRS JSON のキーを書く。`documentStamp`・`changeLogEntries` も動く |
| `applyFixProposals` | 修正案の命令が GRS JSON のキーを書く |
| `undoEdit`・`redoEdit` | 履歴の段で、前のキーの値に戻す・進める |
| `importDocument` | GRS JSON の文書を受けて、置き換え・合流・前回予定として重ねる |
| `exportJson` | GRS JSON の文書を返す |
| `exportMspdi` | `[M]` のキーと `passthrough` から MSPDI を作る |
| `showOnlyTasks` | `tableWindows.searchWindow.checkedTaskUids` と `isScheduleFilteredByChecks` を書く |
| `focusTask` | タスクグループを開くとき、文書設定か `taskGroups[]` の値を書く（β で書くキーは未確認） |
| `runDelayDiagnosis`・`closeWindow` | 画面だけを変える。GRS JSON と刻印は変えない |
| `watchChanges` | 知らせの `stamp` が `documentStamp` と同じ形 |

出どころ: `docs/spec/_assets/tbl-agent-api-members.md:30-53`・`:55-57`、`studies/76-grs-json-beta-shape/commands-map.md:16`、`studies/76-grs-json-beta-shape/terms/grs-json-final-review-tree.md:12-42`・`:95-98`・`:430-474`、`studies/76-grs-json-beta-shape/terms/agent-api-names-by-policy-draft.md:500`、`docs/spec/01-04-requirements.md:8224`
