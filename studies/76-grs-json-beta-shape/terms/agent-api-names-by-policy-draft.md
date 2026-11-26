# 文書の命令と Agent API の名 —— 方針を当てた表（持ち主が `JDG-3781` で確定）

BGQA4（文書の命令 16 問）と BGQA5（Agent API 29 問）の 45 問に、持ち主が決めた名の方針 P-1〜P-12 を当て、問いごとに名を選んだ表です。
入力: `13-glossary-queue.md` の BGQA4・BGQA5 の節、`agent-api-naming-policy-draft.md`、`docs/development-records/rulings.md`（JDG-3716・JDG-3771〜3780 ほか）、最終レビューの木 `grs-json-final-review-tree.md`（JDG-3718〜3756、JDG-3758、JDG-3776）。
「今の名」は問いに書かれた名です（問いがもう新しい名で書いた所は、前の名を括弧に書く）。「決める規則」の P-n は方針の行、JDG-n は裁定の行です。
45 問、表の行 148。変える名 134、今のままの名 182、推しと違う所 31 行（数え方は末尾）。持ち主は BGQA7 の問 9 で一覧のとおりと決め（`JDG-3781`）、問 10・問 11 の 4 名を `JDG-3782`・`JDG-3783` で決めた。原稿と src・tests への当て込みは `CR-851` の実装が行う。

## BGQA4 文書の命令（16 問）

#### 問 35-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-1 | `shiftScheduleTimes` | `shiftScheduleByMinutes` | P-5（読みが 2 つの語 `Times`。方針の例） | `By` は量を言う。P-11（JDG-3772）が挙げる `By` の役（対応表・動きをした者）の外だが、P-5 の例として持ち主が採った（JDG-3716） |
| 35-1 | `shiftScheduleToStartDate` | `shiftScheduleToStartDay` | P-1（N-13: 日だけの値は `…Day`）・P-4 | `To` は行き先（P-11） |
| 35-1 | `shiftScheduleByMinutes.minutes`・`shiftScheduleToStartDay.newStartDay` | 今のまま（2 語） | P-12 | |

#### 問 35-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-2 | `set`・`clear`・`DocumentCommand`・`editProject`・`replaceCalendarRules`・`replaceCalendarRules.workingDayTypes` | 今のまま（6 語） | P-12（方針の表が 35-2 を挙げる）・P-3（`edit<実体>`） | 命令の判別子は `type`（JDG-3564）。`workingDayTypes` は GRS JSON の `weekDays[].dayType` と値の形が違う（P-4 の後半） |

#### 問 35-3

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-3 | `placeTaskPlanActual` | `setTaskProgressStatus` | P-3（`set` は値を 1 つ置く。方針の例）・JDG-3461・JDG-3672 | |
| 35-3 | `placeTaskPlanActual.place` | `setTaskProgressStatus.progressStatus` | P-4（JDG-3461 の語）・P-5（`place` は読みが 2 つ） | 型は `ProgressStatus`（P-9）。表の列の値 `progressStatus`（JDG-3742）と同じ語。中の `state` は問 35-5 で数える |
| 35-3 | `cycleTaskPlanActualState` | `cycleTaskProgressStatus` | P-4・JDG-3461 | |
| 35-3 | `cycleTaskPlanActualState.remembered` | `cycleTaskProgressStatus.removedActual` | P-5（過去分詞だけのキー） | 過去分詞＋名詞は P-5 に合う（JDG-3779 の理由と同じ） |

#### 問 35-4

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-4 | `pasteTasks.sourceUids` | `pasteTasks.sourceTaskUids` | P-1（N-5: 参照は相手の名＋`Uid`）・JDG-2685 | |
| 35-4 | `pasteTasks.landing` | `pasteTasks.placement` | P-5（たとえ。方針の例） | |
| 35-4 | `pasteTasks.landing.taskGroupIdOf` | `pasteTasks.placement.taskGroupIdBySourceTaskUid` | P-11（JDG-3772。`Of` は使わない） | |
| 35-4 | `pasteTaskGroupSubtree.newTaskGroupIds` | `pasteTaskGroupSubtree.newTaskGroupIdBySourceTaskGroupId` | P-11（JDG-3772 の例）・P-1（N-5） | 推し a は `newTaskGroupIdBySourceId`。鍵は元のタスクグループの id なので相手の名まで書く → 3 節 |
| 35-4 | `reorderTaskGroupSiblings.orderedIds` | `reorderTaskGroupSiblings.orderedTaskGroupIds` | P-1（N-5） | 並びの名で、何番目かの数ではない（P-8 の外） |

注: `shiftMinutes` は問 35-5、`sourceTaskGroupId` は問 36-5 の表で数える。

#### 問 35-5

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-5 | `beginTaskActual.grabbed` | `beginTaskActual.grabbedPoint` | JDG-3779（P-5: 過去分詞だけのキー）・JDG-3786（用語集の Grab Point） | 型 `GrabbedPoint`（P-9）。推しは表のまま → 3 節 |
| 35-5 | `beginTaskActual.released` | `beginTaskActual.releasedPlace` | JDG-3779（P-5） | 型 `ReleasedPlace`（P-9） → 3 節 |
| 35-5 | `grabbed` の値 `barDummyStart`・`barDummyFinish`・`milestoneDummy`・`arrowDummyStart`・`arrowDummyFinish` | 名は今のまま（5 語。親は `grabbedPoint`） | P-12・JDG-3779 | |
| 35-5 | `editTask.set.fadeInCalendarDays` | `editTask.set.startSlopeCalendarDays` | P-4・JDG-3732 | 推しの表に無い。`set` は GRS JSON のキーを書く → 3 節 |
| 35-5 | `editTask.set.fadeOutCalendarDays` | `editTask.set.finishSlopeCalendarDays` | P-4・JDG-3732 | 同上 → 3 節 |
| 35-5 | `createTask`・`editTask`・`pasteTasks`・`pasteTasks.placement.shiftMinutes`・`moveTaskToTaskGroup`・`setTaskProgressStatus.progressStatus.state`・`beginTaskActual`・`beginTaskActual.snapMinutes`・`deleteTask` | 今のまま（9 語） | P-12 | `moveTaskToTaskGroup` の `To` は行き先（P-11）。`createTask` の説明の値 `endpointSpan` は `dumbbell`（JDG-3711）に直す |

#### 問 35-6

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 35-6 | `createDependency.predecessorEdge` | `createDependency.predecessorSide` | P-5（読みが 2 つの語 `edge`。方針の例） | |
| 35-6 | `createDependency.successorEdge` | `createDependency.successorSide` | P-5 | |

#### 問 36-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-1 | `changeDependencyLag.lag.type` の値 `typed` | `duration` | P-5（読みが 2 つの語 `typed`） | 推し a。兄弟の値 `workingDays` と対。命令の名は 4 節 |

#### 問 36-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-2 | `deleteDependencyAt.order` | `deleteDependencyAt.index` | P-8（JDG-3776: 何番目かは 0 から数えて `…Index`） | 推しと同じ名。推しの理由②（1 から振る順のために語を取っておく）は JDG-3776 で消えた |
| 36-2 | `deleteDependencyAt` | 今のまま | JDG-3776（命令の名は今のまま）・P-12（方針の例） | P-5 は前置詞を退けるが、JDG-3776 と P-12 の例が今のままと決めた |

#### 問 36-3

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-3 | `changeDependencyLag` | `setDependencyLag` | P-3・JDG-3672（席が決めた。4 節） | 問 35-3 と同じ形 |
| 36-3 | `createDependency`・`createDependency.successorUid`・`changeDependencyLag.lag.type`・`lag.type` の値 `workingDays`・`displayUnit` の値 `day`・`hour`・`minute`・`deleteDependency` | 今のまま（8 語） | P-12 | `typed` は問 36-1、`unit` は問 36-3-2。`successorUid` は MSPDI のまま（JDG-3622 ②） |

#### 問 36-3-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-3-2 | `changeDependencyLag.lag.unit` | `changeDependencyLag.lag.displayUnit` | P-4（値の形が違えば名も変える。方針の例） | |
| 36-3-2 | `changeDependencyLag.lag.minutes` | 今のまま | P-12・P-4 | MSPDI の `linkLag`（10 分の 1 分）と単位が違うので別の名 |

#### 問 36-4

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-4 | `editResource`・`createResource`・`deleteResources`・`deleteResources.resourceUids`・`deleteUnreferencedResources`・`createAssignment`・`deleteAssignment` | 今のまま（7 語） | P-12（方針の表が 36-4 を挙げる）・P-3 | |

#### 問 36-5

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-5 | `createTaskGroup.siblingOrder`（α は `ordinal`） | `createTaskGroup.siblingIndex` | P-8・P-4（JDG-3776: GRS JSON の `siblingIndex`） | 0 から数える。推しの表は `siblingOrder` → 3 節 |
| 36-5 | `moveTaskGroup.siblingOrder` | `moveTaskGroup.siblingIndex` | P-8・P-4（JDG-3776） | → 3 節 |
| 36-5 | `createTaskGroup`・`pasteTaskGroupSubtree`・`moveTaskGroup` の引数 `selfShowMode`（JDG-3684） | `showMode`（3 つ） | P-4・JDG-3736 | 推しの表はもう `showMode` で書く |
| 36-5 | `createTaskGroup`・`pasteTaskGroupSubtree`・`reorderTaskGroupSiblings`・`moveTaskGroup` の引数 `parentId` | `parentTaskGroupId`（4 つ） | P-4・P-1（N-5）・JDG-3622 ⑤ | 推しの表はもう新しい名で書く |
| 36-5 | `editTaskGroup.set.editableByGroupName` | `editTaskGroup.set.allowedEditorGroupName` | P-4・JDG-3730 | 推しの表の説明の文が前の名 → 3 節 |
| 36-5 | `editTaskGroup.set.style.color` の型 `LaneColor` | `TaskGroupColor` | P-4・JDG-3733 | → 3 節 |
| 36-5 | `editTaskGroup`・`createTaskGroup`・`pasteTaskGroupSubtree`・`pasteTaskGroupSubtree.sourceTaskGroupId`・`reorderTaskGroupSiblings`・`moveTaskGroup`・`deleteTaskGroup`・`pinTaskGroup`・`unpinTaskGroup` | 今のまま（9 語） | P-12（方針の表が 36-5 を挙げる） | 写しと並べ替えの引数は問 35-4。`reorderTaskGroupSiblings` の説明「その順が siblingOrder」は `siblingIndex` に直す |

#### 問 36-6

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-6 | `editTaskVisual` | `editTaskStyle` | P-4（方針の例） | 断り `taskVisualCountNotOne` は問 32-9 |

#### 問 37-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 37-1 | `editTableView` | `editTableWindow` | P-4（方針の例） | |
| 37-1 | `editTableView.table` | `editTableWindow.tableWindow` | P-4（方針の例） | |
| 37-1 | `tableWindow` の値 `delayDiagnosticsReportWindow` | `delayDiagnosisReportWindow` | P-4・JDG-3512（木の R097） | `searchWindow`・`resourceListWindow` は今のまま → 3 節 |
| 37-1 | `editTableView.set.isScheduleFilterApplied` | `editTableWindow.set.isScheduleFilteredByChecks` | P-4・JDG-3728 | 列の値も新しい名（`progressStatus` JDG-3742、`resourceSelectionStatus` JDG-3753） → 3 節 |

#### 問 37-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 37-2 | `fitScheduleToScreenOnPage` | `zoomToFit` | P-2（JDG-3716 案 a。方針の例）・JDG-3661・JDG-3672 | |
| 37-2 | 出来事 `fitPressed` | `zoomToFitPressed` | P-2・JDG-3661（札 Zoom to Fit を camelCase にして `Pressed`） | 命令の名でなく出来事の名。命令と対で直す |

#### 問 36-7

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 36-7 | `createCommentBox.leaderTarget.laneTopOffsetPercent`・`editCommentBox.set.leaderTarget.laneTopOffsetPercent` | `…leaderTarget.taskGroupTopOffsetPercent` | P-4・JDG-3733 | 2 つの命令で 1 名と数える → 3 節 |
| 36-7 | `editDocumentSettings.set` の 9 つ: `isPlanBarVisible`・`isActualBarVisible`・`isBaselineOutlineVisible`・`isAssigneeLabelVisible`・`isPercentCompleteLabelVisible`・`isPlanDatesVisible`・`isDependencyLineVisible`・`isProgressLineVisible`・`isDateGridLinesVisible` | `editDocumentSettings.set.scheduleCanvasElements.<同じ名>`（9 つ） | P-4・JDG-3724 | 名は同じで置き場が変わる → 3 節 |
| 36-7 | `editDocumentSettings.set.isProgressMarkVisible` | `editDocumentSettings.set.scheduleCanvasElements.isProgressStatusMarkVisible` | P-4・JDG-3724・JDG-3742 | → 3 節 |
| 36-7 | `editDocumentSettings.set.isGroupGridLinesVisible` | `editDocumentSettings.set.scheduleCanvasElements.isTaskGroupGridLinesVisible` | P-4・JDG-3724・JDG-3745 | → 3 節 |
| 36-7 | `editDocumentSettings.set.taskStackDirection` | `editDocumentSettings.set.taskPlacementDirection` | P-4・JDG-3731 | → 3 節 |
| 36-7 | `editDocumentSettings.set.displayTimeZones` | `editDocumentSettings.set.additionalTimeZones` | P-4・JDG-3741 | → 3 節 |
| 36-7 | `editDocumentSettings.set.delayDiagnosisSettings.toleranceWorkingDays` | `editDocumentSettings.set.delayDiagnosisSettings.parentTaskProgressToleranceWorkingDays` | P-4・JDG-3738 | → 3 節 |
| 36-7 | `editDocumentSettings.set.fitDayRange.isFixed` | `editDocumentSettings.set.fitDayRange.type`（値 `fixed`・`automatic`） | P-4（木の R058〜R061・JDG-3744） | 推しの表の説明の文が `isFixed` を書く → 3 節 |
| 36-7 | `createCommentBox`・`createCommentBox.commentBoxId`・`editCommentBox`・`bringCommentBoxToFront`・`deleteCommentBox`・`createHighlightBox`・`editHighlightBox`・`bringHighlightBoxToFront`・`deleteHighlightBox`・`editDocumentSettings` | 今のまま（10 語） | P-12（方針の表が 36-7 を挙げる） | `bring…ToFront` の `To` は行き先（P-11）。`editDocumentSettings` の説明の `editTableView` は `editTableWindow`（問 37-1） |

## BGQA5 Agent API（29 問）

#### 問 34-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 34-1 | `issueDelayFixes` | `applyFixProposals` | P-3（`apply` は文書に当てる。方針の例） | |
| 34-1 | `issueDelayFixes.fixKeys` | `applyFixProposals.fixProposalKeys` | P-4（JDG-2141 の語） | |
| 34-1 | `DelayFixRow` | `FixProposalRow` | P-4 | |
| 34-1 | `DelayFixLogRow` | `FixLogRow` | P-4（JDG-3466 の語） | |
| 34-1 | `reason` の値 `nothingToIssue` | `noFixProposalToApply` | P-3・P-4・P-10 | |
| 34-1 | `readTableRows.table` の値 `delayFixProposals` | `fixProposals` | P-4 | |
| 34-1 | `readTableRows.table` の値 `delayFixLog` | `fixLog` | P-4 | |
| 34-1 | `readTableRows.table` の値 `delayDiagnosticsReport` | `delayDiagnosisReport` | P-4・JDG-3512 | 推しの表に無い → 3 節 |
| 34-1 | `readTableRows.table` の値 `resourceList` | 今のまま | P-12 | 値は表の名で、窓の名ではないので `tableWindow` にしない |

#### 問 33-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 33-1 | `readDocument.includeCarry` | `readDocument.includePassthrough` | P-4（方針の例）・P-7（JDG-3780: AI が渡すフラグは動詞で始める） | `passthrough` は `grs` の下へ移ったが（JDG-3748）、語は同じ |

#### 問 33-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 33-2 | `readSchema.which` | `readSchema.part` | P-5（代名詞。方針の例） | 値 `document`・`commands`・`notes` は今のまま |

#### 問 33-2-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 33-2-2 | `closeWindow` | 今のまま（窓だけを閉じる） | P-5（名は指す物を言う）・P-12 | 推し a |
| 33-2-2 | `closeWindow.which` | `closeWindow.window` | P-5（代名詞） | 値は `delayDiagnosisReportWindow`（JDG-3512） |
| 33-2-2 | （無い。プロパティパネルを閉じる働き） | 新しい道具 `closePropertiesPanel` | P-5・P-3（動詞＋目的語）・JDG-3356 | 推し a の名 |

#### 問 34-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 34-2 | `readSchema.full` | `readSchema.returnWholeSchema` | P-7・P-5（JDG-3780） | 推しは今のまま → 3 節 |
| 34-2 | `readDelayDiagnostics.limit` | 今のまま | P-4・JDG-3777（席が決めた。4 節） | `readSearchRows.limit` と同じ意味 |
| 34-2 | `agentApi`・`grSchedulerAgentApi`・`readSchema`・`readSchema.defs`・`readDocument`・`readDocument.taskUids`・`readDocument.parts`・`readStamp`・`readSelection`・`readSearchRows`・`readSearchRows.word`・`readSearchRows.filters`・`readSearchRows.limit`・`readTableRows`・`readShownTasks`・`readDelayDiagnostics.parts`・`applyCommands`・`importDocument`・`importDocument.source`・`requestOpenFile`・`undoEdit`・`redoEdit`・`exportJson`・`exportMspdi`・`exportSvg`・`exportPng`・`exportEmbeddedHtml`・`exportFixLogTsv`・`focusTask`・`focusTask.taskUid`・`showOnlyTasks`・`showOnlyTasks.taskUids`・`watchChanges`・`fileName`・`overwrite` | 今のまま（35 語） | P-12（方針の表が 34-2 を挙げる）・P-6（`defs` と形式の名 `Json` など）・P-7（`overwrite`、JDG-3780）・JDG-3777（`limit`） | 親 `readDelayDiagnostics` は JDG-3512 で `readDelayDiagnosis`（45 問の外で決まった）。説明の `includeCarry`・`taskTotal`・`editTableView` は問 33-1・30-5・37-1 |

#### 問 34-2-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 34-2-2 | `agentApiVersion` | `agentApiVersionUtc` | P-1（優先 5、JDG-3625。方針の例） | |
| 34-2-2 | `schemaVersion` | `schemaVersionUtc` | P-1・P-4（JDG-3625） | |
| 34-2-2 | 断りの欄 `knownSchemaVersion` | `knownSchemaVersionUtc` | P-1・P-4（JDG-3625） | |

#### 問 31-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 31-1 | `AgentSearchPage` | `SearchWindowPage` | P-5（呼ぶ者の頭 `Agent`） | `readSearchRows` の答えで、断りを含まないので `…Outcome` でない（P-9）。欄の型でもない |
| 31-1 | `AgentTableRows` | `TableRowsOutcome` | P-5・P-9（席が決めた。4 節） | |
| 31-1 | `AgentTableRow` | `TableRow` | P-5・P-9・P-1（N-2）・JDG-3782 | 欄 `rows` の型 |
| 31-1 | `AgentTableColumn` | `TableColumn` | P-5・P-9・P-1（N-2）・JDG-3782 | 欄 `columns` の型（2 つの答えで同じ） |
| 31-1 | `AgentTableCell` | `TableCell` | P-5・P-9・P-1（N-2）・JDG-3782 | 欄 `cells` の型 |

#### 問 31-1-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 31-1-2 | `columns[].id` | `columns[].key` | P-1（N-6: `id` は UUID だけ。方針の例） | 値の型は `ColumnKey`（JDG-3514）。列の型の名は 4 節 |

#### 問 30-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-1 | `AgentWriteRequest` | `WriteRequest` | P-5（頭の `Agent`） | 道具の引数の型（引数 `request`）。P-9 の前半は答えの値の欄に当てた |
| 30-1 | `AgentWriteOutcome` | `WriteOutcome` | P-5・P-9（`…Outcome`） | |
| 30-1 | `AgentExport` | `ExportOutcome` | P-5・P-9（方針の例） | |
| 30-1 | `AgentFocusOutcome` | `FocusOutcome` | P-5・P-9 | |
| 30-1 | `AgentImportSource` | `ImportSource` | P-5 | 引数 `importDocument.source` の型。P-9 の前半は答えの値の欄に当てた |
| 30-1 | `AgentImportOutcome` | `ImportOutcome` | P-5・P-9 | |
| 30-1 | `AgentShownTasks` | `ShownTasks` | P-5 | 断りを含まない答え（原稿の型）なので `…Outcome` でない |
| 30-1 | `AgentDelayDiagnostics` | `DelayDiagnosisReport` | P-5・JDG-3512 | |
| 30-1 | `AgentChangeReceiver` | `ChangeReceiver` | P-5 | 関数の型（引数 `receive`） |
| 30-1 | `AgentWatch` | `WatchOutcome` | P-5・P-9（方針の例） | |
| 30-1 | `AgentSavedFile` | `SavedFile` | P-5 | |

#### 問 30-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-2 | `VisibilityTable` | `TableWindowName` | P-4（方針の例） | 値は `searchWindow`・`delayDiagnosisReportWindow`（JDG-3512）・`resourceListWindow` |

#### 問 30-3

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-3 | `ImportOutcome.asked` | `ImportOutcome.pendingQuestion` | JDG-3774（P-5: 過去分詞だけのキー） | 推し a と同じ。値は変わらない英語の名（JDG-3285） |

#### 問 30-4

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-4 | `ChangeNotice.mark` | 無くす（時刻は `ChangeNotice.stamp.scheduleDataUpdatedAt` が言う。JDG-3783） | P-4（刻印の `scheduleDataUpdatedAt` と同じ語。方針の表が 30-4 を挙げる）・P-5 | 推し a。JDG-3737 で持ち主は `lastSeen…` の `seen` を「何か見た？」と退けた。過去分詞＋名詞で P-5 には合うが、持ち主に見せるとき触れるとよい |
| 30-4 | 型 `WatcherMark` | 無くす | JDG-3783（SSOT） | 欄 `mark` と一緒に無くす |

#### 問 30-4-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-4-2 | `watchChanges.receive` | 今のまま | P-12（方針の例） | |
| 30-4-2 | `watchChanges.waitMs`（MCP の道具） | `watchChanges.waitMilliseconds` | P-6（方針の例） | 問いの場面に出る名。推しの表に無い → 3 節 |

#### 問 30-5

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 30-5 | `ok` | `isAccepted` | P-7（JDG-3780: 答えの真偽は `is…`） | 推しは表のまま → 3 節 |
| 30-5 | `WriteOutcome.hasUpdatedSchedule` | `WriteOutcome.isScheduleDataUpdated` | P-7（JDG-3780） | → 3 節 |
| 30-5 | `WatchOutcome.hasReplacedEarlierWatch` | `WatchOutcome.isEarlierWatchReplaced` | P-7（JDG-3780） | → 3 節 |
| 30-5 | `SearchWindowPage.taskTotal` | `SearchWindowPage.taskRowCount` | P-8（個数は `…Count`。方針の例） | → 3 節 |
| 30-5 | `readTableRows` の答えの `total` | `rowCount` | P-8（方針の例） | → 3 節 |
| 30-5 | `ShownTasks.filteringTables` | `ShownTasks.filteringTableWindows` | P-4（値は `TableWindowName`。1 つの物に 1 つの語） | 席の新しい案。`Tables` を `TableWindows` に替えるだけ → 3 節 |
| 30-5 | `Selection`・`SearchRows`・`expectedStamp`・`commands`・`createdUids`・`refusal`・`ExportOutcome.value`・`isScrolled`・`ImportSource.text`・`drawnTaskUids`・`fixProposals`・`notice`・`stopWatching`・`watcher`・`ChangeNotice`・`taskRows`・`commentBoxRows`・`columns`・`offset`・`nextOffset`・`ja`・`en`・`table`・`rows`・`key`・`cells`・セルの `text`・`savedTo`・`bytes`・`backedUpTo` | 今のまま（30 語） | P-12（方針の表が 30-5 を挙げる）・P-7（`isScrolled`、JDG-3780）・JDG-3777（`offset`・`nextOffset`）・P-6（`ja`・`en`）・P-11（`savedTo`・`backedUpTo` の `To` は行き先） | `nextOffset`・`drawnTaskUids`・`backedUpTo` の `null` は N-12 でキーを書かない（P-1。名は変えない）。`bytes` は単位を持つ数 |

#### 問 33-3

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 33-3 | `AgentRefusal` | `Refusal` | P-9（欄 `refusal` の型。方針の例） | |
| 33-3 | `Refusal`（1 つの命令の断り） | `CommandRefusal` | P-9（欄 `commandRefusals` の型。方針の例） | α の原稿の欄は `refusals`。P-9 の対として、問いの場面の名 `commandRefusals` にそろえる |

#### 問 31-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 31-2 | `Refusal.from` | `Refusal.refusedBy` | P-5（前置詞。方針の例）・P-11（過去分詞＋`By` は動きをした者） | 値 `page`・`relay` は問 32-10 |

#### 問 31-2-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 31-2-2 | `Refusal.documentFaults[].at` | `Refusal.documentFaults[].jsonPointer` | JDG-3775（P-5: 前置詞） | 推し a は `pointer` → 3 節 |

#### 問 32-1

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-1 | `reason` の値 `gestureInFlight` | `dragInProgress` | P-10（待てば通る断りは `…InProgress`。方針の例） | |
| 32-1 | `reason` の値 `editingInPlace` | `inPlaceEditInProgress` | P-10 | |
| 32-1 | `reason` の値 `questionAsked` | `confirmationInProgress` | P-10 | |
| 32-1 | `reason` の値 `deliveringNotices` | `noticeDeliveryInProgress` | P-10 | |

#### 問 32-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-2 | `reason` の値 `unknownTask` | `notFound` | P-10（JDG-3778: 直し方が同じなら 1 つの名） | |
| 32-2 | 命令の断りの `reason` の値 `notFound` | 今のまま | P-10（JDG-3778） | どの物かは `missingTaskUids`・`field`・`commandType`・`member` が言う |

#### 問 32-2-2

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-2-2 | `Refusal.taskUids` | `Refusal.missingTaskUids` | P-10（方針の例） | |

#### 問 32-3

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-3 | `reason` の値 `notAvailable` | `notImplemented` | P-10（直し方が同じ: 呼ばない・書かない） | |
| 32-3 | `reason` の値 `notImplemented` | 今のまま | P-10 | 場面の `editableByGroupName` は `allowedEditorGroupName`（JDG-3730） |

#### 問 32-4

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-4 | `reason` の値 `settingOutOfBounds` | `outOfRange` | P-10（JDG-3778。物を入れる案 `settingOutOfRange` は退けた） | |
| 32-4 | `reason` の値 `outOfRange` | 今のまま | P-10 | 範囲は `min`・`max` が言う |

#### 問 32-5

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-5 | `reason` の値 `endBeforeStart` | 今のまま（予定・実績・注記の日時の前後を受け持つ） | P-10（直し方が同じなら 1 つの名） | |
| 32-5 | `reason` の値 `highlightBoxInverted` | `lastTaskGroupBeforeFirst`（タスクグループの逆さだけ） | P-10（直し方が違えば物を入れる）・JDG-3528 | |
| 32-5 | `reason` の値 `negativeActualLength` | 無くす（`endBeforeStart` が受け持つ） | P-10 | |

#### 問 32-6

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-6 | 命令の断りの値 `wouldMakeCycle` | `taskGroupParentCycle`（タスクの親の輪なら `taskParentCycle`） | P-10（文書と命令で同じ名。方針の例） | |
| 32-6 | 文書の断りの値 `taskParentCycle`・`taskGroupParentCycle` | 今のまま（2 語） | P-10 | |

#### 問 32-7

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-7 | `reason` の値 `pinnedTaskGroupMissing` | `danglingReference` | P-10（直し方が同じなら 1 つの名） | どのプロパティかは `jsonPointer`（問 31-2-2。推しの文の `at`）が言う |
| 32-7 | `reason` の値 `danglingReference` | 今のまま | P-10 | |

#### 問 32-8

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-8 | `reason` の値 `importNotLanded` | `importNotApplied` | P-5（たとえ）・P-3（`apply`） | |
| 32-8 | `Refusal.cause` | 今のまま | P-12 | |
| 32-8 | `cause` の値 `openInProgress` | 今のまま | P-10（`…InProgress`） | |
| 32-8 | `cause` の値 `notValidated` | `documentInvalid` | P-10（文書の検査と同じ名） | |
| 32-8 | `cause` の値 `importCanceled` | `canceled` | P-1（N-4: 親の語を繰り返さない） | |
| 32-8 | `reason` の値 `documentInvalid` | 今のまま | P-10 | |

#### 問 32-9

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-9 | `reason` の値 `notOwnStep` | `notOwnEdit` | P-4（道具 `undoEdit`・`redoEdit` の語）・P-10 | |
| 32-9 | `reason` の値 `tooTall` | `imageTooTall` | P-10（何が・どうなった） | |
| 32-9 | `reason` の値 `taskGroupTooDeep` | `taskGroupTreeTooDeep` | P-10 | `taskTreeTooDeep` と対 |
| 32-9 | `reason` の値 `taskGroupMembershipBroken` | `taskGroupMembershipCountNotOne`（理由が残るなら） | P-10 | 残るかは JDG-3686 の方針で決める |
| 32-9 | `reason` の値 `importSequenceAhead` | `mspdiImportCountAhead` | P-4・P-10 | 推しの「選んだ訳」の `lastSeenMspdiImportCount` は `mspdiImportCountWhenLastIncluded`（JDG-3737）。名は 2 つのキーの頭の語のまま |
| 32-9 | `reason` の値 `taskVisualCountNotOne` | `taskStyleCountNotOne`（理由が残るなら） | P-4（問 36-6）・P-10 | 残るかは JDG-3686 の方針で決める |
| 32-9 | `reason` の値 `limitReached` | `pinLimitReached` | P-10（方針の例） | |
| 32-9 | `reason` の値 `missingValue` | `newTaskGroupIdMissing` | P-10・P-4（問 35-4 の `newTaskGroupIdBySourceTaskGroupId` の値） | |
| 32-9 | `reason` の値 `bothEndsAreOneTask` | `selfDependency` | P-10 | |

#### 問 33-4

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 33-4 | `Refusal.seconds` | `Refusal.waitedSeconds` | P-5（名は何の値かを言う） | |
| 33-4 | `Refusal.path` | `Refusal.existingFilePath` | P-5（方針の例） | |
| 33-4 | `Refusal.folder` | `Refusal.saveFolder` | P-5・P-4（理由 `saveFolderUnavailable` と同じ語） | |
| 33-4 | `Refusal.name` | `Refusal.sentName` | P-5 | 理由の値 `retiredName` と別の綴り |
| 33-4 | `Refusal.replacement` | `Refusal.replacementName` | P-5 | |

#### 問 32-10

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| 32-10 | `reason` の値 `fadeWithoutFinish` | `slopeWithoutFinish` | P-4・JDG-3732 | 席の新しい案。`fade` を GRS JSON の語 `slope` に替えるだけ → 3 節 |
| 32-10 | `reason` の値 `fadeLongerThanTask` | `slopeLongerThanTask` | P-4・JDG-3732 | 席の新しい案。同上 → 3 節 |
| 32-10 | `reason` の値 `notDrawnYet` | 今のまま | P-10・NEIM（席が決めた。4 節） | |
| 32-10 | `refusedBy` の値 `page`・`relay`、`member`・`message`・`reason`、`reason` の値 `staleStamp`・`commandRefused`・`rasterFailed`・`embeddedHtmlFailed`・`malformedRequest`・`historyEmpty`・`schemaViolation`・`formatTooNew`・`formatTooOld`・`retiredName`・`pageNotConnected`・`relayTimedOut`・`badFileName`・`fileExists`・`saveFolderUnavailable`・`duplicateKey`・`noCalendar`・`fillAndStrokeBothInvisible`・`unusableDate`・`calendarWithoutWorkingDay`・`noTaskGroup`・`milestoneShapeMismatch`・`invalidWorkingTimes`・`fileTooLarge`・`tooManyTasks`・`taskTreeTooDeep`・`taskWithoutDates`・`alreadyExists`・`hyperlinkSchemeNotAllowed`・`siblingListMismatch`・`alreadyStarted`・`fieldSetAndCleared`、`commandIndex`・`field`（JDG-3787 で `jsonPointer`）・`documentFaults`・`pageUrl`・`converterUrl`・`min`・`max` | 今のまま（44 語） | P-12（方針の表が 32-10 を挙げる）・P-6（`Url`・`min`・`max`）・P-8（`commandIndex`）・P-10 | `malformedRequest` の説明の `which`・`full` は `part`・`returnWholeSchema`。`formatTooNew` の説明の版は `knownSchemaVersionUtc` |

#### 45 問の後に足した名

| 問 | 今の名（親を含めて） | 方針で選ぶ名 | 決める規則 | 注 |
|:---|:---|:---|:---|:---|
| （BGQA7 の問 12） | 無い（`JDG-3803` の新しい断り: uid が上限の 2147483647 に届いた文書で、新しい物を足す操作を断る） | 命令の断りの `reason` の値 `uidLimitReached` | P-10・JDG-3784 | `pinLimitReached` と同じ形。数には入れない |

## 推しと違う所

規則か最終レビューの改名が、問いの推し（推しの表・推しの文）と違う名を選んだ行です。

**A. 方針の裁定が推しの名を変えた（11 行）**

| 問 | 名 | 推し | 方針で選ぶ名 | 規則 |
|:---|:---|:---|:---|:---|
| 35-4 | `pasteTaskGroupSubtree.newTaskGroupIds` | `newTaskGroupIdBySourceId` | `newTaskGroupIdBySourceTaskGroupId` | P-11（JDG-3772） |
| 35-5 | `beginTaskActual.grabbed` | 今のまま | `grabbedPoint` | JDG-3779・JDG-3786 |
| 35-5 | `beginTaskActual.released` | 今のまま | `releasedPlace` | JDG-3779 |
| 34-2 | `readSchema.full` | 今のまま | `returnWholeSchema` | P-7（JDG-3780） |
| 30-5 | `ok` | 今のまま | `isAccepted` | P-7（JDG-3780） |
| 30-5 | `hasUpdatedSchedule` | 今のまま | `isScheduleDataUpdated` | P-7（JDG-3780） |
| 30-5 | `hasReplacedEarlierWatch` | 今のまま | `isEarlierWatchReplaced` | P-7（JDG-3780） |
| 30-5 | `taskTotal` | 今のまま | `taskRowCount` | P-8（JDG-3776） |
| 30-5 | `total` | 今のまま | `rowCount` | P-8（JDG-3776） |
| 30-5 | `filteringTables` | 今のまま | `filteringTableWindows`（席の新しい案） | P-4 |
| 31-2-2 | `documentFaults[].at` | `pointer` | `jsonPointer` | JDG-3775 |

**B. 最終レビューの GRS JSON の改名が、推しの表か文の名を変えた（19 行）**

| 問 | 名 | 推し | 方針で選ぶ名 | 規則 |
|:---|:---|:---|:---|:---|
| 36-5 | `createTaskGroup.siblingOrder` | 前の名（表の説明の文） | `siblingIndex` | P-8・P-4（JDG-3776） |
| 36-5 | `moveTaskGroup.siblingOrder` | 前の名（表の説明の文） | `siblingIndex` | P-8・P-4（JDG-3776） |
| 36-5 | `editTaskGroup.set.editableByGroupName` | 前の名（説明の文） | `allowedEditorGroupName` | P-4（JDG-3730） |
| 36-5 | `editTaskGroup.set.style.color` の型 `LaneColor` | （表に無い） | `TaskGroupColor` | P-4（JDG-3733） |
| 37-1 | `editTableWindow.set.isScheduleFilterApplied` | 前の名（場面） | `isScheduleFilteredByChecks` | P-4（JDG-3728） |
| 37-1 | `tableWindow` の値 `delayDiagnosticsReportWindow` | 前の名（場面） | `delayDiagnosisReportWindow` | P-4（JDG-3512） |
| 34-1 | `readTableRows.table` の値 `delayDiagnosticsReport` | （表に無い） | `delayDiagnosisReport` | P-4（JDG-3512） |
| 35-5 | `editTask.set.fadeInCalendarDays` | （表に無い） | `startSlopeCalendarDays` | P-4（JDG-3732） |
| 35-5 | `editTask.set.fadeOutCalendarDays` | （表に無い） | `finishSlopeCalendarDays` | P-4（JDG-3732） |
| 36-7 | `leaderTarget.laneTopOffsetPercent` | （表に無い） | `taskGroupTopOffsetPercent` | P-4（JDG-3733） |
| 36-7 | `editDocumentSettings.set` の 9 つの `is…Visible` | （表に無い） | `set.scheduleCanvasElements.<同じ名>` | P-4（JDG-3724） |
| 36-7 | `editDocumentSettings.set.isProgressMarkVisible` | （表に無い） | `set.scheduleCanvasElements.isProgressStatusMarkVisible` | P-4（JDG-3742） |
| 36-7 | `editDocumentSettings.set.isGroupGridLinesVisible` | （表に無い） | `set.scheduleCanvasElements.isTaskGroupGridLinesVisible` | P-4（JDG-3745） |
| 36-7 | `editDocumentSettings.set.taskStackDirection` | （表に無い） | `taskPlacementDirection` | P-4（JDG-3731） |
| 36-7 | `editDocumentSettings.set.displayTimeZones` | （表に無い） | `additionalTimeZones` | P-4（JDG-3741） |
| 36-7 | `editDocumentSettings.set.delayDiagnosisSettings.toleranceWorkingDays` | （表に無い） | `parentTaskProgressToleranceWorkingDays` | P-4（JDG-3738） |
| 36-7 | `editDocumentSettings.set.fitDayRange.isFixed` | 前の名（説明の文） | `fitDayRange.type`（`fixed`・`automatic`） | P-4（木の R058〜R061・JDG-3744） |
| 32-10 | `fadeWithoutFinish` | 今のまま | `slopeWithoutFinish`（席の新しい案） | P-4（JDG-3732） |
| 32-10 | `fadeLongerThanTask` | 今のまま | `slopeLongerThanTask`（席の新しい案） | P-4（JDG-3732） |

**C. 推しの表に無く、方針の例が足した名（1 行）**

| 問 | 名 | 推し | 方針で選ぶ名 | 規則 |
|:---|:---|:---|:---|:---|
| 30-4-2 | `watchChanges.waitMs` | （表に無い） | `waitMilliseconds` | P-6（方針の例） |

**数えない覚え（名は推しと同じで、理由か文だけが変わった）**

- 問 36-2 `index`: 推しの理由②（1 から振る順のために語を取っておく）は JDG-3776 で消えた。
- 問 32-9 `mspdiImportCountAhead`: 「選んだ訳」のキーは `mspdiImportCountWhenLastIncluded`（JDG-3737）。
- 問 32-7: 誤りの所の欄は `at` でなく `jsonPointer`。問 32-3 の場面の `editableByGroupName` は `allowedEditorGroupName`。
- 問 35-5 `createTask` の説明の `endpointSpan` は `dumbbell`（JDG-3711）。問 36-5・36-7・34-2 の説明の `editTableView`・`siblingOrder`・`includeCarry` も新しい名に直す。
- 4 節の 7 名も、推しの名と違う名に決まりうる。

## 方針で 1 つに決まらない名 —— 席の仕分け

作業役が挙げた 7 名を、席が仕分けた。4 名は方針の物差しで席が決め（`JDG-3686`: 名の席は振る舞いと物差しで決まることを問わない）、3 名は名そのものなので持ち主に問うた（BGQA7 の問 10、`JDG-3782`）。どれも `JDG-3781` で確定した。

| 問 | 名 | 決めた名 | 決めた訳 |
|:---|:---|:---|:---|
| 36-3 | `changeDependencyLag` | `setDependencyLag`（席が決めた） | P-3 と `JDG-3672`（値を 1 つ置く命令は `set`）。同じ働きの問 35-3 は `setTaskProgressStatus` を選び、`change` を「ほかに無い動詞」として退けた。α の原稿も `setDependencyLag` |
| 34-2 | `readDelayDiagnosis.limit` | 今のまま（席が決めた） | `readSearchRows.limit` と同じ意味（返す要素の数の上限）なので 1 つの語（P-4・OKPN）。`JDG-3777` の通り名の例外に入れる |
| 32-10 | `notDrawnYet` | 今のまま（席が決めた） | 見えないタブはいつまでも描かないので、`…InProgress`（進んでいる最中）は嘘になりうる（NEIM）。P-10 の「待てば通る断り」に当たらない |
| 31-1 | `AgentTableRows` | `TableRowsOutcome`（席が決めた） | P-9（値か断りを返す答えは `…Outcome`）。頭は道具 `readTableRows` の目的語で、`ImportOutcome` と同じ作り |
| 31-1 | `AgentTableRow`・`AgentTableColumn`・`AgentTableCell` | `TableRow`・`TableColumn`・`TableCell`（持ち主が `JDG-3782` で決めた） | `TableRowsOutcome` と同じ語の一族。`Column` だけでは GRS JSON の `ColumnFilter.column` と取り違えうる（N-2） |

## 席が足した確かめ（作業役の表の外）

- 問 30-4 `ChangeNotice.mark`: 推しの名 `seenScheduleDataUpdatedAt` は、持ち主が `JDG-3737` で「lastSeen ってなんだっけ？ 何か見た？」と退けた語 `seen` を持つ。値は同じ知らせの刻印 `stamp.scheduleDataUpdatedAt` と同じ時刻（src `change-notice.ts:40`）。持ち主は `JDG-3783` で `mark` と `WatcherMark` を無くすと決めた。
- 問 35-1 `shiftScheduleByMinutes`: `By` は動詞の後で「どれだけ」を言う。P-11（`JDG-3772`）の使い分けの 3 行に無い役目だが、持ち主が P-5 の例として採った名（`JDG-3716`）。P-11 の使い分けに「動詞＋`By`＋量は、どれだけ」を足した（`JDG-3781`）。
- 問 36-2 `deleteDependencyAt`: 名に前置詞 `At` を持つが、持ち主が P-12 の例として採った名（`JDG-3716`）で、`JDG-3776` も今のままとした。P-12 のレビューで持ち主に見せ、今のままと決まった（`JDG-3781`）。

## 問いの外で気づいた名（数えない）

- `setTaskGroupSelfShowMode`（JDG-3672）は P-4 と JDG-3736 で `setTaskGroupShowMode` に、`setTaskGroupSelfShowModesToAutomaticExceptHidden`（JDG-3690）は `setTaskGroupShowModesToAutomaticExceptHidden` になる（問 36-5 の前書きは、もうこの名で書く）。
- `readDelayDiagnostics`・`runDelayDiagnostics` は JDG-3512 で `readDelayDiagnosis`・`runDelayDiagnosis`（問 34-2 の前書き）。
- 原稿の型 `AgentRefusalReason` も P-5 で頭の `Agent` を外す。名は問いに無い。

## 数

- 問い: 45（BGQA4 16・BGQA5 29）。`#### 問` の見出しを数えた。どの番号も 1 度だけ出る。
- 表の行: 148（1〜2 節の表の、見出しを除く行）。
- 変える名: 134（BGQA4 55・BGQA5 79）。作業役の 129 に、席が決めた `setDependencyLag`・`TableRowsOutcome`（2）と、持ち主が決めた `TableRow`・`TableColumn`・`TableCell`（3）を足した。無くす `mark` は作業役の数の中にある（名を替える代わりに無くす）。
- 今のままの名: 182（BGQA4 58・BGQA5 124）。作業役の 180 に、席が決めた `readDelayDiagnosis.limit`・`notDrawnYet` を足した。
- 推しと違う所（3 節）: 31 行（A 11・B 19・C 1）。
- 方針で 1 つに決まらない名（4 節）: 作業役は 7 行。席が 4 名を決め、3 名（表の行・列・セルの型）と `ChangeNotice.mark` は持ち主が決めた（`JDG-3782`・`JDG-3783`）。残りは 0。

数え方:
- 名は、表の行に並べた名の数で数えた。1 行に n 個の名を並べた行は n と数えた（`showMode` の 3、`parentTaskGroupId` の 4、`scheduleCanvasElements` の 9、「今のまま（N 語）」の N）。`leaderTarget.laneTopOffsetPercent` の行は、2 つの命令で 1 名と数えた。
- 「変える名」には、新しい道具 `closePropertiesPanel` と、無くす名（`WatcherMark`・`negativeActualLength`）を入れた。条件つきの 2 名（問 32-9 の「理由が残るなら」）も入れた。
- 2 つの問いに出る名は、1 つの問いでだけ数えた（`state` は問 35-5、`shiftMinutes` は問 35-5、`sourceTaskGroupId` は問 36-5）。
- 列挙の値は、表に行を立てた値だけを数えた（`resourceList` など）。説明の文の中だけに出る名は数えていない。
- 4 節の名は、決まった名を「変える名」と「今のままの名」に入れて数えた（変える 5・今のまま 2）。`JDG-3781` の記録の「変える名 130」は持ち主に問うた時の数で、その後に問 10（`JDG-3782`）の 3 名ほかを足して 134 になった。
- 1 つの問いの名の数の検算: 問 35-5 は 2 + 5 + 9 = 16、問 34-2 は 1 + 1 + 35 = 37、問 30-5 は 6 + 30 = 36、問 32-10 は 2 + 1 + 44 = 47 で、問いの語の数と合う。

## AI-C のレビューの後の直し（2026-11-24、Agent API の名 2 の席）

AI-C の独立レビュー（`JDG-3785`、`agent-api-names-ai-c-review.md`）の 26 件を、席が仕分けた（レビューの末尾の表）。名を変える物は GQA BGQA7 の [rev]（問 13〜25）で持ち主に問うており、答えが来たらこの表に当てる。一覧に出てこなかった名は `agent-api-names-missing-from-list.md`、遅延診断の答えの中の名（265 名）は `agent-api-names-delay-diagnosis-draft.md` にある。

席が直した所（新しい名を作らない）:

| 所見 | 直し |
|:---|:---|
| 8 | 表の値と窓の名の対応: `readTableRows.table` の値は表の名、`TableWindowName` の値は窓の名で、別の物。検索ウィンドウの表は `readSearchRows` が読む（窓 `searchWindow`）。窓 `delayDiagnosisReportWindow` は表の値 `delayDiagnosisReport`・`fixProposals`・`fixLog` の 3 つを持つ。窓 `resourceListWindow` は表の値 `resourceList` を持つ。`ShownTasks.filteringTableWindows` の値を `readTableRows` へ渡すときは、この対応で表の値に直す |
| 14 | `editTableWindow.set` のキーは GRS JSON β の窓の型のキーのまま（P-4。木の R430〜R440）: `isScheduleFilteredByChecks`（問 37-1 の行）、`checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`（`JDG-3713`）、`columnFilters`、`columnSort`（`JDG-3708`）。CR-851 の対応表の `shownTaskUids`・`shownResourceUids`・`isUnassignedShown`・`sort` は前の段の名 |
| 23 | 数え方の文（上の「数え方」の 4 節の行）を直した |
| 25 | `watchChanges.watcher`・`ChangeNotice.watcher` の値は、刻印の書き手の名 `Editor.name` と同じ文字列（説明の文で言う。名は今のまま） |

持ち主が BGQA7 の 11 巡目で決めた名: 問 13 `grabbedArea` → `grabbedPoint`（`JDG-3786`）、問 20 `CommandRefusal.field` → `jsonPointer`（`JDG-3787`）。上の表に当てた。

仮の名（2026-11-27）: BGQA7 で答えの無い 13 問は、持ち主の指示（`JDG-3788`）で席の推しの名を仮に採った（`JDG-3789`）。一覧は `agent-api-provisional-names.md`（`PN-1`〜`PN-13`）。β の後に持ち主が見直す。
