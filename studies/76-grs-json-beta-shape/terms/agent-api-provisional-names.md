# Agent API と文書の命令の仮の名 —— β の後に見直す一覧

持ち主は 2026-11-27 に、Agent API の名を後に回し、仮の名で先へ進むと決めた（`JDG-3788`）。席は、GQA BGQA7 でまだ答えの無い 13 問を、席の推す名（どの問いも案 a）で仮に決めた（`JDG-3789`）。BGQA7 の問いは開いたまま残し、持ち主が β の後に答える。

- 外に見える名は、仮でも推しの名のままにする。名に `temp` などの頭は付けない（`JDG-3788` の BOSS の案 a）。
- 原本（`docs/spec/_source/agent-api-members.json`・`document-commands.json`）は、仮の名を持つ物に `xProvisional`（行 ID と拠り所の JDG）を付ける。
- 持ち主が答えたら、道具が仮の名を決まった名に一度に置き換え、`xProvisional` を外し、Agent API の版を上げる。
- 名の細かい行（問 24 の 36 名、問 25 の席の表）は、`agent-api-names-delay-diagnosis-draft.md` と BGQA7 の問 24・問 25 の表にある。

| 行 | 問 | 今の名（一覧の名） | 仮の名（席の推し） | ほかの案 |
|:---|:---|:---|:---|:---|
| PN-1 | 14-2 | 文書の誤りの理由 `mspdiImportCountAhead` | `importOriginCountAhead` | `importingOriginCountAhead` ／ 今のまま |
| PN-2 | 15-2 | 断りの理由 `endBeforeStart`（タスクの予定・実績）。`negativeActualLength` も畳む | `finishBeforeStart` | 全部 `finishBeforeStart` ／ 今のまま |
| PN-3 | 15-2 | 断りの理由 `endBeforeStart`（ハイライトボックスの日・全体表示期間） | `lastDayBeforeFirstDay` | `finishBeforeStart` ／ 今のまま |
| PN-4 | 16-2 | `readSearchRows.filters`・`readTableRows.filters`（値 `asShown`・`none`） | AI が渡すフラグ `followScreenFiltersAndSort`（省けば `true`） | `filterSource`（`screen`・`none`）／ 今のまま |
| PN-5 | 17-2 | `DrawnTasks` の答えの形 | `filteringTableWindows` は空でもいつも書く。`drawnTaskUids` は絞っているときだけ書き、空でも書く（名は変えない） | `drawnTaskUids` をいつも書く ／ 今のまま |
| PN-6 | 18-2 | `setTaskProgressStatus.progressStatus`（中に `state` と日時） | 平らにする: `progressStatus`（状態の名の文字列）と、兄弟の `actualStart`・`stop`・`resume`・`actualFinish`。方針「命令の引数は書く GRS JSON の形を写す」 | `progressStatusChange`（判別子 `type`）／ 今のまま |
| PN-7 | 19-2 | データの時差を書く命令（対応表は `editProject.set.scheduleDataTimeZone`） | `setScheduleDataTimeZone`（引数 `scheduleDataTimeZone`） | `editScheduleData` ／ `editProject.set` |
| PN-8 | 21 | 遅延診断の答えの欄 `outcome` | `isDiagnosed`（真偽） | `diagnosisResult` ／ 欄を無くす |
| PN-9 | 22 | 遅延診断の答えの欄 `terminalsReached` | `reachedEndTaskCount` | `endTasksReached` ／ `endTaskCount` |
| PN-10 | 23 | 遅延診断の答えの欄 `markerStates`（中の `row`） | `diagnosisMarks`（中は `taskUid`・`diagnosisMark`） | `progressStatusMarks` ／ `diagnosisStatuses` |
| PN-11 | 24 | 遅延診断の答えの観点のキー・観点の名 27・ほかのキーと択の語 | BGQA7 の問 24 の表の推しの名 | 表の「もう 1 つの案」 |
| PN-12 | 25 | 席が方針で決めた名（BGQA7 の問 25 の表） | 表のとおり | 持ち主が直す行 |
| PN-13 | 26 | 型 `Refusal`（前の名 `AgentRefusal`）・`CommandRefusal`（前の名 `Refusal`） | 今のまま | `RequestRefusal` ／ 前の名に戻す |
