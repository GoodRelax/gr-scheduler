# 名の辞書 —— 人の確かめを待つ語（レビューの土台）

> ⛔ 本書は生成物である。手で直さない。
> 名の辞書の唯一の正は `docs/spec/_source/glossary.json` である。本書はそれを `docs/spec/_source/glossary_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen`（この表だけなら `npm run glossary`）／ **ズレを検出する**: `npm run gen:check`。

拠り所（`basis`）の無い語を、レビューの区分ごとに並べる。全部の語は同じフォルダーの `glossary-terms.tsv` が持つ。

| 区分 | 語の数 |
| --- | ---: |
| 画面に出る語 | 125 |
| MCP の説明だけに出る語 | 2 |
| 外との約束の群にあり、凍結した契約で突き合わなかった語 | 4 |
| 仕様とコードの中だけの語 | 426 |
| 確かめ済み（拠り所あり） | 1014 |
| 計 | 1571 |

## 画面に出る語（125 語）

| # | キー | 英語の名 | 日本語の名 | 持ち主 | 群 | 意味（英語） |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `scheduleFilterBar` | Schedule Filter Bar | スケジュールフィルタバー |  | 画面の大きな区分 | The Schedule Filter Bar: a band that appears only while a table's Schedule Filter narrows the tasks drawn; it names the tables, gives the count and offers to release every filter. |
| 2 | `paletteGroups` | Palette Groups | パレットグループ |  | 画面の大きな区分 | The Palette Groups: the blocks the Command Palette arranges its entries in. |
| 3 | `taskBars` | Task Bars | タスクバー |  | タスクグループレーンズに描く部品 | Task Bars: the Plan Bar and the Actual Bar together. A rectangle is a shape, not a bar. |
| 4 | `baselineOutline` | Baseline Outline | 変更前予定輪郭 |  | タスクグループレーンズに描く部品 | The Baseline Outline: the outline of the earlier plan drawn over a task. |
| 5 | `progressMark` | Progress Mark | 進捗マーク |  | タスクグループレーンズに描く部品 | The Progress Mark: the mark outside the end of the Actual Bar that shows the plan-and-actual state by its shape and changes the state when pressed. |
| 6 | `groupGridLines` | Group Grid Lines | グループ罫線 |  | タスクグループレーンズに描く部品 | The Group Grid Lines: horizontal lines between task groups. |
| 7 | `fadeHandle` | Fade Handle | フェードハンドル |  | マウスで操作するもの | The Fade Handle: the handle that sets the fade of a Plan Bar. |
| 8 | `resizeHandle` | Resize Handle | サイズ変更ハンドル |  | マウスで操作するもの | A Resize Handle: one of the eight handles at the corners and sides of a Highlight Box. |
| 9 | `leaderAnchorHandle` | Leader Anchor Handle | 線先ハンドル |  | マウスで操作するもの | The Leader Anchor Handle: the handle of the Leader Anchor of a Comment Box. |
| 10 | `paletteGrip` | Palette Grip | パレットグリップ |  | マウスで操作するもの | The Palette Grip: the band at the top of the Command Palette. |
| 11 | `taskGroupGrip` | Task Group Grip | タスクグループグリップ |  | マウスで操作するもの | The Task Group Grip: the grip just before a task group name. |
| 12 | `collapseButton` | Collapse Button | 折りたたむボタン |  | マウスで操作するもの | The Collapse Button: collapses the task group itself. |
| 13 | `item` | Item | アイテム |  | そのほかの UI パーツ | An Item: anything that hit testing and selection can take. It is not another name for a task; write "task" for one task. |
| 14 | `selection` | Selection | 選択 |  | そのほかの UI パーツ | The Selection: choosing things that already exist, and the set of things chosen. |
| 15 | `armedShape` | ArmedShape | 構え |  | そのほかの UI パーツ | The Armed Shape: what the next drag will create or link, chosen on the palette. It is not a selection. |
| 16 | `marquee` | Marquee | 範囲選択 |  | そのほかの UI パーツ | Marquee: selecting by dragging a rectangle from a place that hits nothing. |
| 17 | `cursors` | Cursors | カーソル |  | そのほかの UI パーツ | The Cursors: the lines that point at dates, as a group. The point of the mouse is the pointer, not a cursor. |
| 18 | `guideCursor` | Guide Cursor | ガイドカーソル |  | そのほかの UI パーツ | The Guide Cursor: the line that follows the pointer, as a crosshair or a single vertical line. |
| 19 | `canvasOverlays` | Canvas Overlays | Canvas Overlays |  | そのほかの UI パーツ | The Canvas Overlays: a structure name for what is drawn over the Schedule Canvas; not shown on screen. |
| 20 | `watermarkUnlockPassword` | Watermark Unlock Password | 透かし解除パスワード |  | そのほかの UI パーツ | The Watermark Unlock Password: the password asked before the watermark is hidden. |
| 21 | `timeAxisLevelOfDetail` | timeAxisLevelOfDetail | timeAxisLevelOfDetail |  | そのほかの UI パーツ | Time axis level of detail: how fine the Time Ruler is, from years down to days and weekdays, following the horizontal zoom. |
| 22 | `groupLevelOfDetail` | groupLevelOfDetail | groupLevelOfDetail |  | そのほかの UI パーツ | Group level of detail: deep task groups are not drawn when the vertical size is small. |
| 23 | `exportFormats` | exportFormats | exportFormats |  | そのほかの UI パーツ | The export formats offered in the Save As Dialog. |
| 24 | `mspdiXmlFormat` | MSPDI XML | MSPDI XML |  | そのほかの UI パーツ | MSPDI XML: the exchange format for other scheduling tools. |
| 25 | `singleHtmlFormat` | Single HTML | 単一 HTML |  | そのほかの UI パーツ | Single HTML: one .html file that holds GRS and the document together. |
| 26 | `placeGroup` | Place | 置く |  | パレットグループ | The palette group of entries that arm a task shape or a milestone shape. |
| 27 | `alignGroup` | Align | 揃える |  | パレットグループ | The palette group of entries that arm a dependency line or an annotation, and that align the selection to its start or finish. |
| 28 | `displayGroup` | Display | 表示 |  | パレットグループ | The palette group of entries that show or hide parts of the drawing. |
| 29 | `cursorsGroup` | Cursors | カーソル |  | パレットグループ | The palette group of the planned dates, status date and cursor entries. |
| 30 | `zoomToFitIcon` | Zoom to Fit | 全体を収める |  | アイコン | Show the whole schedule |
| 31 | `documentSettingsIcon` | Document Settings | 文書の設定 |  | アイコン | Show or hide the document's drawing settings in the Properties Panel, where the theme color is chosen |
| 32 | `endpointSpanIcon` | Endpoint Span | 端点スパン |  | アイコン | Endpoint Span: drag on empty space to create an endpoint span task |
| 33 | `milestoneCircleIcon` | Milestone (Circle) | マイルストーン（〇） |  | アイコン | Milestone (Circle): drag on empty space to create one |
| 34 | `milestoneDiamondIcon` | Milestone (Diamond) | マイルストーン（◇） |  | アイコン | Milestone (Diamond): drag on empty space to create one |
| 35 | `milestoneSquareIcon` | Milestone (Square) | マイルストーン（□） |  | アイコン | Milestone (Square): drag on empty space to create one |
| 36 | `milestoneStarIcon` | Milestone (Star) | マイルストーン（☆） |  | アイコン | Milestone (Star): drag on empty space to create one |
| 37 | `milestoneTriangleUpIcon` | Milestone (Triangle Up) | マイルストーン（△） |  | アイコン | Milestone (Triangle Up): drag on empty space to create one |
| 38 | `milestoneTriangleDownIcon` | Milestone (Triangle Down) | マイルストーン（▽） |  | アイコン | Milestone (Triangle Down): drag on empty space to create one |
| 39 | `milestoneBoxIcon` | Milestone (Box) | マイルストーン（ボックス） |  | アイコン | Milestone (Box): drag on empty space to create one |
| 40 | `milestoneFloppyDiskIcon` | Milestone (Floppy Disk) | マイルストーン（フロッピー） |  | アイコン | Milestone (Floppy Disk): drag on empty space to create one |
| 41 | `milestoneSmilingFaceIcon` | Milestone (Smiling Face) | マイルストーン（嬉しい顔） |  | アイコン | Milestone (Smiling Face): drag on empty space to create one |
| 42 | `calloutIcon` | Callout | コメントボックス |  | アイコン | Callout: drag where it should stand to place one |
| 43 | `highlightBoxIcon` | Highlight Box | ハイライトボックス |  | アイコン | Highlight Box: drag over the range to enclose |
| 44 | `alignToStartIcon` | Align to Start | 開始日で揃える |  | アイコン | Align the selected items to their start |
| 45 | `alignToFinishIcon` | Align to Finish | 終了日で揃える |  | アイコン | Align the selected items to their finish |
| 46 | `progressLineIcon` | Progress Line | イナズマ線 |  | アイコン | Show or hide the Progress Line |
| 47 | `progressMarkerIcon` | Progress Marker | 進捗マーカー |  | アイコン | Show or hide the Progress Marker and the Resume Icon |
| 48 | `watermarkIcon` | Watermark… | 透かしを非表示（パスワードが必要） |  | アイコン | Show or hide the watermark; the unlock password is asked only to hide it |
| 49 | `dateGridLinesIcon` | Date Grid Lines | 日付罫線 |  | アイコン | Show or hide the Date Grid Lines |
| 50 | `groupGridLinesIcon` | Group Grid Lines | グループ罫線 |  | アイコン | Show or hide the Group Grid Lines |
| 51 | `assigneeLabelIcon` | Assignee Label | 担当ラベル |  | アイコン | Show or hide the Assignee Label |
| 52 | `percentCompleteLabelIcon` | Percent Complete Label | 完了率ラベル |  | アイコン | Show or hide the Percent Complete Label |
| 53 | `stackDirectionIcon` | Stack Direction | 日程が重複するタスクを積む向き |  | アイコン | Swap the direction the bars are stacked in, up or down |
| 54 | `plannedDatesIcon` | Planned Dates | 予定日 |  | アイコン | Show or hide the planned dates to the right of task and milestone names |
| 55 | `statusDateIcon` | Status Date | 基準日 |  | アイコン | Place, move, or clear the status date; the Status Line is drawn there |
| 56 | `crosshairIcon` | Crosshair | 十字 |  | アイコン | Turn the crosshair Guide Cursor on or off |
| 57 | `singleVerticalIcon` | Single Vertical | 縦 1 本 |  | アイコン | Turn the single vertical Guide Cursor on or off |
| 58 | `closeIcon` | Close | 閉じる |  | アイコン | Close the open window; Esc closes it too |
| 59 | `dragToMoveIcon` | Drag to Move | 掴んで動かす |  | アイコン | Grab here to move the Command Palette |
| 60 | `minimizePaletteIcon` | Minimize | 最小化 |  | アイコン | Minimize or restore the Command Palette |
| 61 | `wheelIcon` | Wheel | ホイール |  | アイコン | Marks turning the mouse wheel |
| 62 | `helpLanguageIcon` | Help Language | ヘルプの言語 |  | アイコン | Choose the language of the help only; the current one shows on the entry |
| 63 | `expandBelowIcon` | Expand Below | 配下をすべて展開する |  | アイコン | Expand every task group below this one |
| 64 | `collapseIcon` | Collapse | 折りたたむ |  | アイコン | Collapse this task group itself |
| 65 | `collapseBelowIcon` | Collapse Below | 配下をすべて折りたたむ |  | アイコン | Collapse every task group below this one |
| 66 | `expandOneLevelIcon` | Expand One Level | 1 階層だけ展開する |  | アイコン | Expand only this task group's own children, leaving deeper task groups collapsed |
| 67 | `pinIcon` | Pin | ピン止め |  | アイコン | Pin or unpin the task group so it stays on screen |
| 68 | `deleteTaskGroupIcon` | Delete Task Group | タスクグループを削除 |  | アイコン | Delete this task group, the task groups below it and the tasks they carry |
| 69 | `deleteAllTaskGroupsIcon` | Delete All Task Groups | すべてのタスクグループを削除 |  | アイコン | Delete all task groups and the tasks they carry |
| 70 | `tasksIcon` | Tasks | タスク |  | アイコン | Show the table of tasks and milestones |
| 71 | `calloutsIcon` | Callouts | コメントボックス |  | アイコン | Show the table of callouts |
| 72 | `scheduleFilterIcon` | Schedule Filter | スケジュールフィルタ |  | アイコン | Turn the Schedule Filter on or off: draw only the tasks this table shows |
| 73 | `minimizeWindowIcon` | Minimize | 最小化 |  | アイコン | Minimize or restore the window |
| 74 | `maximizeIcon` | Maximize | 最大化 |  | アイコン | Maximize the window |
| 75 | `restoreIcon` | Restore | 元のサイズに戻す |  | アイコン | Restore the window to its size |
| 76 | `adoptAllRecommendedIcon` | Adopt All Recommended | 推奨案をすべて採用する |  | アイコン | Check every automatic row and every row with one choice |
| 77 | `selectedIcon` | Selected | 選択中 |  | アイコン | This resource is selected; click to deselect it |
| 78 | `notSelectedIcon` | Not Selected | 未選択 |  | アイコン | This resource is not selected; click to select it |
| 79 | `addTimeRangeIcon` | + | ＋ |  | アイコン | Add a working-time range |
| 80 | `deleteTimeRangeIcon` | Delete | 削除 |  | アイコン | Delete this range (the document changes only when applied) |
| 81 | `timeIcon` | Time | 時刻 |  | アイコン | Type a time to the minute (e.g. 8:00; an end of 0:00 is 24:00) |
| 82 | `replaceIcon` | Replace | 置き換える |  | アイコン | Replace the current document with the file being opened |
| 83 | `mergeIcon` | Merge | 合流させる |  | アイコン | Add the contents of the file being opened to the current document |
| 84 | `expandAllIcon` | Expand All | すべて展開する |  | アイコン | Expand every task group that was collapsed |
| 85 | `collapseAllIcon` | Collapse All | すべて折りたたむ |  | アイコン | Collapse every task group |
| 86 | `showTopLevelOnlyIcon` | Show Top Level Only | 最も浅い段を 1 階層展開する |  | アイコン | Bring back only the shallowest task groups, leaving what is under them collapsed |
| 87 | `interactionLogIcon` | Interaction Log | デバッグ用ログ取得の開始/停止 |  | アイコン | Start or stop recording pointer input and drawing; stopping puts the record on the clipboard |
| 88 | `useOpenedFileIcon` | Use Opened File | 開いたファイルから取る |  | アイコン | Take the duplicated tasks from the file that was opened |
| 89 | `keepBothIcon` | Keep Both | 両方とも残す |  | アイコン | Keep the duplicated tasks as separate things, both of them; the added ones can no longer be written back to their master |
| 90 | `timeShiftIcon` | Time Shift | タイムシフト |  | アイコン | Shift every schedule date-time by the amount entered; asks first |
| 91 | `taskPlannedDateField` | Planned Date | 予定日 | Task | プロパティパネルの欄 | The Properties Panel field that shows and edits the planned date of the selected task. |
| 92 | `taskActualDateField` | Actual Date | 実績日 | Task | プロパティパネルの欄 | The Properties Panel field that shows and edits the actual date of the selected task. |
| 93 | `taskMilestoneShapeField` | Milestone Shape | マイルストーン形状 | Task | プロパティパネルの欄 | The Properties Panel field that shows and edits the milestone shape of the selected task. |
| 94 | `commentBoxFillTransparencyPercentField` | Fill Transparency (%) | 塗りの透過率（%） | CommentBox | プロパティパネルの欄 | The Properties Panel field that shows and edits the fill transparency of the selected Comment Box. |
| 95 | `highlightBoxFillTransparencyPercentField` | Fill Transparency (%) | 塗りの透過率（%） | HighlightBox | プロパティパネルの欄 | The Properties Panel field that shows and edits the fill transparency of the selected Highlight Box. |
| 96 | `dependencyTypeField` | Type | 種別 | Dependency | プロパティパネルの欄 | The Properties Panel field that shows and edits the type of the selected dependency. |
| 97 | `dependencyLagField` | Lag | ラグ | Dependency | プロパティパネルの欄 | The Properties Panel field that shows and edits the lag of the selected dependency. |
| 98 | `dependencyPredecessorField` | Predecessor | 先行 | Dependency | プロパティパネルの欄 | The Properties Panel field that shows and edits the predecessor of the selected dependency. |
| 99 | `dependencySuccessorField` | Successor | 後続 | Dependency | プロパティパネルの欄 | The Properties Panel field that shows and edits the successor of the selected dependency. |
| 100 | `fixTablesTaskTypeColumn` | Task Type | タスク種別 | fixTables | 表の列 | The column Task Type of the fix proposal and fix log tables of the Delay Diagnosis Report Window. |
| 101 | `inputNotAccepted` | inputNotAccepted | inputNotAccepted |  | 通知の作法 | A manner of notice: When input is not accepted. |
| 102 | `timedNotification` | timedNotification | timedNotification |  | 通知の作法 | A manner of notice: A notification that goes away with time. |
| 103 | `destructiveResult` | destructiveResult | destructiveResult |  | 通知の作法 | A manner of notice: When the result is destructive. |
| 104 | `failureNotification` | failureNotification | failureNotification |  | 通知の作法 | A manner of notice: A notification of failure. |
| 105 | `pendingAtStartup` | pendingAtStartup | pendingAtStartup |  | 通知の作法 | A manner of notice: Matters pending at startup. |
| 106 | `limitReached` | limitReached | limitReached |  | 通知の作法 | A manner of notice: When the limit is reached. |
| 107 | `acceptedWithCaution` | acceptedWithCaution | acceptedWithCaution |  | 通知の作法 | A manner of notice: When a caution accompanies acceptance. |
| 108 | `askWhetherToGoOn` | askWhetherToGoOn | askWhetherToGoOn |  | 通知の作法 | A manner of notice: When asking whether to go on. |
| 109 | `dismissNotification` | dismissNotification | dismissNotification |  | 通知の作法 | A manner of notice: When a told notification is dismissed. |
| 110 | `notificationWidth` | notificationWidth | notificationWidth |  | 通知の作法 | A manner of notice: How wide the box of a notification is. |
| 111 | `deleteTaskGroupQuestion` | deleteTaskGroupQuestion | deleteTaskGroupQuestion |  | 問い | The question that asks: "Delete this task group and the tasks on it?" |
| 112 | `deleteTaskQuestion` | deleteTaskQuestion | deleteTaskQuestion |  | 問い | The question that asks: "Delete this task and the tasks under it?" |
| 113 | `deleteResourcesQuestion` | deleteResourcesQuestion | deleteResourcesQuestion |  | 問い | The question that asks: "Delete the selected resources? They will be unassigned from the tasks below." |
| 114 | `overwriteOtherDocumentQuestion` | overwriteOtherDocumentQuestion | overwriteOtherDocumentQuestion |  | 問い | The question that asks: "This is not the document that was opened. Overwrite it? The changes made since will be lost." |
| 115 | `closeDocumentQuestion` | closeDocumentQuestion | closeDocumentQuestion |  | 問い | The question that asks: "Close the current document? Unsaved edits and the undo history will be lost." |
| 116 | `hideWatermarkQuestion` | hideWatermarkQuestion | hideWatermarkQuestion |  | 問い | The question that asks: "Hide the watermark? This needs the watermark unlock password. The watermark is a record that this was on screen, not access control." |
| 117 | `deleteAllTaskGroupsQuestion` | deleteAllTaskGroupsQuestion | deleteAllTaskGroupsQuestion |  | 問い | The question that asks: "Delete all task groups and the tasks on them?" |
| 118 | `resetGrsQuestion` | resetGrsQuestion | resetGrsQuestion |  | 問い | The question that asks: "Reset GRS? What GRS keeps in this browser (such as the display language) is cleared and the page is reloaded. Unsaved edits, if any, are lost too." |
| 119 | `tasksOrParentArrowsQuestion` | tasksOrParentArrowsQuestion | tasksOrParentArrowsQuestion |  | 問い | The question that asks: "Tasks and parent arrows are selected together. Which do you want to select?" |
| 120 | `timeShiftQuestion` | timeShiftQuestion | timeShiftQuestion |  | 問い | The question that asks: "Run the Time Shift and move every schedule date-time at once? What will be rewritten is shown below. One Undo brings it back." |
| 121 | `wholeScheduleShiftQuestion` | wholeScheduleShiftQuestion | wholeScheduleShiftQuestion |  | 問い | The question that asks: "Shift the whole schedule to the new start date? What will be rewritten is shown below. One Undo brings it back." |
| 122 | `liftTooDeepTaskGroupsQuestion` | liftTooDeepTaskGroupsQuestion | liftTooDeepTaskGroupsQuestion |  | 問い | The question that asks: "Task groups nest at most {maxGroupDepth} levels. Lift the too-deep task groups to level {maxGroupDepth} and finish the move?" |
| 123 | `aiOpenFileQuestion` | aiOpenFileQuestion | aiOpenFileQuestion |  | 問い | The question that asks: "The AI asks you to open a file. Open the file window?" |
| 124 | `irreversibleOperationQuestion` | irreversibleOperationQuestion | irreversibleOperationQuestion |  | 問い | The question that asks: "Continue? This can't be undone." |
| 125 | `rulerFontSizePx` | Ruler Font Size | 目盛の文字 |  | タイムルーラー | The size of the text of the Time Ruler in pixels. |

## MCP の説明だけに出る語（2 語）

| # | キー | 英語の名 | 日本語の名 | 持ち主 | 群 | 意味（英語） |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `fileName` | fileName | fileName |  | 断りと理由 | The file name, relative to the save folder the person chose in the relay, under which an export is saved. |
| 2 | `overwrite` | overwrite | overwrite |  | 断りと理由 | Whether an existing file may be replaced; ask the person first. The old file is kept as .bak. |

## 外との約束の群にあり、凍結した契約で突き合わなかった語（4 語）

| # | キー | 英語の名 | 日本語の名 | 持ち主 | 群 | 意味（英語） |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `columnKey` | ColumnKey | ColumnKey |  | 共通の型とキー | The stable English name of a table column; each table takes only the names of the columns in that table. |
| 2 | `reasonUnknownCommand` | unknownCommand | unknownCommand | reason | 断りと理由 | type is not the name of any command. |
| 3 | `grsDocumentSchema` | grsDocumentSchema | grsDocumentSchema |  | 配るもの | grs-document.schema.json: the published JSON Schema of GRS JSON. |
| 4 | `grsCommandsSchema` | grsCommandsSchema | grsCommandsSchema |  | 配るもの | grs-commands.schema.json: the JSON Schema of the document commands that applyCommands takes. |

## 仕様とコードの中だけの語（426 語）

| # | キー | 英語の名 | 日本語の名 | 持ち主 | 群 | 意味（英語） |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `screenState` | ScreenState | ScreenState |  | そのほかの UI パーツ | ScreenState: a structure name for the type that holds the values of the screen that are not saved in the document; not shown on screen. |
| 2 | `armModeStateMachine` | armModeStateMachine | armModeStateMachine |  | 状態機械 | Whether a tool is armed on the palette, and which one. |
| 3 | `armModeStateMachineNotArmed` | None (Default) | なし（既定） | armModeStateMachine | 状態機械 | No tool is armed; a drag selects. |
| 4 | `armModeStateMachineArmed` | armed | armed | armModeStateMachine | 状態機械 | A tool is armed; the next drag creates or links. |
| 5 | `armModeStateMachineTaskShapeArmed` | Task Shape | タスク形状 | armModeStateMachine | 状態機械 | A task shape is armed. |
| 6 | `armModeStateMachineMilestoneShapeArmed` | Milestone Shape | マイルストーン形状 | armModeStateMachine | 状態機械 | A milestone shape is armed. |
| 7 | `armModeStateMachineDependencyArmed` | Dependency Line | 依存線 | armModeStateMachine | 状態機械 | Drawing a dependency line is armed. |
| 8 | `armModeStateMachineCommentBoxArmed` | Callout | コメントボックス | armModeStateMachine | 状態機械 | Placing a Comment Box is armed. |
| 9 | `armModeStateMachineHighlightBoxArmed` | Highlight Box | ハイライトボックス | armModeStateMachine | 状態機械 | Placing a Highlight Box is armed. |
| 10 | `armModeStateMachineParentTaskArmed` | Parent Task | 親タスク | armModeStateMachine | 状態機械 | Linking child tasks to a parent task is armed. |
| 11 | `paletteDisplayStateMachine` | paletteDisplayStateMachine | paletteDisplayStateMachine |  | 状態機械 | Whether the Command Palette is shown, and whether it is minimized. |
| 12 | `paletteDisplayStateMachineShown` | shown | shown | paletteDisplayStateMachine | 状態機械 | The palette is shown. |
| 13 | `paletteDisplayStateMachineExpanded` | expanded | expanded | paletteDisplayStateMachine | 状態機械 | The palette is shown in full. |
| 14 | `paletteDisplayStateMachineMinimized` | minimized | minimized | paletteDisplayStateMachine | 状態機械 | The palette is minimized to its grip. |
| 15 | `paletteDisplayStateMachineHidden` | hidden | hidden | paletteDisplayStateMachine | 状態機械 | The palette is hidden. |
| 16 | `milestoneListDisplayStateMachine` | milestoneListDisplayStateMachine | milestoneListDisplayStateMachine |  | 状態機械 | Whether the list of milestone shapes on the palette is open. |
| 17 | `milestoneListDisplayStateMachineClosed` | closed | closed | milestoneListDisplayStateMachine | 状態機械 | The list is folded. |
| 18 | `milestoneListDisplayStateMachineOpen` | open | open | milestoneListDisplayStateMachine | 状態機械 | The list is open. |
| 19 | `fullScreenModeStateMachine` | fullScreenModeStateMachine | fullScreenModeStateMachine |  | 状態機械 | Whether GRS is in full screen. |
| 20 | `fullScreenModeStateMachineNormal` | normal | normal | fullScreenModeStateMachine | 状態機械 | Not full screen. |
| 21 | `fullScreenModeStateMachineFull` | full | full | fullScreenModeStateMachine | 状態機械 | Full screen. |
| 22 | `openSurfaceStateMachine` | openSurfaceStateMachine | openSurfaceStateMachine |  | 状態機械 | Whether a dialog is open, and which. |
| 23 | `openSurfaceStateMachineClosed` | closed | closed | openSurfaceStateMachine | 状態機械 | No dialog is open. |
| 24 | `openSurfaceStateMachineOpen` | open | open | openSurfaceStateMachine | 状態機械 | A dialog is open. |
| 25 | `watermarkDisplayStateMachine` | watermarkDisplayStateMachine | watermarkDisplayStateMachine |  | 状態機械 | Whether the watermark is shown. |
| 26 | `watermarkDisplayStateMachineShown` | shown | shown | watermarkDisplayStateMachine | 状態機械 | The watermark is shown. |
| 27 | `watermarkDisplayStateMachineHidden` | hidden | hidden | watermarkDisplayStateMachine | 状態機械 | The watermark is hidden after the password was given. |
| 28 | `propertiesPanelContentStateMachine` | propertiesPanelContentStateMachine | propertiesPanelContentStateMachine |  | 状態機械 | What the Properties Panel shows. |
| 29 | `propertiesPanelContentStateMachineHidden` | hidden | hidden | propertiesPanelContentStateMachine | 状態機械 | The panel is closed. |
| 30 | `propertiesPanelContentStateMachineSelectionDisplayed` | selectionDisplayed | selectionDisplayed | propertiesPanelContentStateMachine | 状態機械 | The panel shows the selection. |
| 31 | `propertiesPanelContentStateMachineDocumentSettingsDisplayed` | documentSettingsDisplayed | documentSettingsDisplayed | propertiesPanelContentStateMachine | 状態機械 | The panel shows the document settings. |
| 32 | `dualCursorModeStateMachine` | dualCursorModeStateMachine | dualCursorModeStateMachine |  | 状態機械 | Whether the Dual Cursor is being used, and which line is being placed. |
| 33 | `dualCursorModeStateMachineOff` | off | off | dualCursorModeStateMachine | 状態機械 | The Dual Cursor is off. |
| 34 | `dualCursorModeStateMachineOn` | on | on | dualCursorModeStateMachine | 状態機械 | The Dual Cursor is on. |
| 35 | `dualCursorModeStateMachinePlacingCursorA` | placingCursorA | placingCursorA | dualCursorModeStateMachine | 状態機械 | The first line is being placed. |
| 36 | `dualCursorModeStateMachinePlacingCursorB` | placingCursorB | placingCursorB | dualCursorModeStateMachine | 状態機械 | The second line is being placed. |
| 37 | `scaleMessageDisplayStateMachine` | scaleMessageDisplayStateMachine | scaleMessageDisplayStateMachine |  | 状態機械 | Whether the short message about the display scale is shown. |
| 38 | `scaleMessageDisplayStateMachineHidden` | hidden | hidden | scaleMessageDisplayStateMachine | 状態機械 | No scale message is shown. |
| 39 | `scaleMessageDisplayStateMachineShown` | shown | shown | scaleMessageDisplayStateMachine | 状態機械 | The scale message is shown for a while. |
| 40 | `tooltipDisplayStateMachine` | tooltipDisplayStateMachine | tooltipDisplayStateMachine |  | 状態機械 | Whether tooltips may appear. |
| 41 | `tooltipDisplayStateMachineAllowed` | allowed | allowed | tooltipDisplayStateMachine | 状態機械 | Tooltips may appear. |
| 42 | `tooltipDisplayStateMachineDismissed` | dismissed | dismissed | tooltipDisplayStateMachine | 状態機械 | Tooltips were dismissed and do not appear until allowed again. |
| 43 | `searchPanelDisplayStateMachine` | searchPanelDisplayStateMachine | searchPanelDisplayStateMachine |  | 状態機械 | Whether the Search Window is shown, and at what size. |
| 44 | `searchPanelDisplayStateMachineHidden` | hidden | hidden | searchPanelDisplayStateMachine | 状態機械 | The window is not shown. |
| 45 | `searchPanelDisplayStateMachineShown` | shown | shown | searchPanelDisplayStateMachine | 状態機械 | The window is shown. |
| 46 | `searchPanelDisplayStateMachineNormal` | normal | normal | searchPanelDisplayStateMachine | 状態機械 | The window has its normal size. |
| 47 | `searchPanelDisplayStateMachineMinimized` | minimized | minimized | searchPanelDisplayStateMachine | 状態機械 | The window is minimized. |
| 48 | `searchPanelDisplayStateMachineMaximized` | maximized | maximized | searchPanelDisplayStateMachine | 状態機械 | The window is maximized. |
| 49 | `helpDisplayStateMachine` | helpDisplayStateMachine | helpDisplayStateMachine |  | 状態機械 | Whether the Help Window is shown, and at what size. |
| 50 | `helpDisplayStateMachineHidden` | hidden | hidden | helpDisplayStateMachine | 状態機械 | The window is not shown. |
| 51 | `helpDisplayStateMachineShown` | shown | shown | helpDisplayStateMachine | 状態機械 | The window is shown. |
| 52 | `helpDisplayStateMachineNormal` | normal | normal | helpDisplayStateMachine | 状態機械 | The window has its normal size. |
| 53 | `helpDisplayStateMachineMinimized` | minimized | minimized | helpDisplayStateMachine | 状態機械 | The window is minimized. |
| 54 | `helpDisplayStateMachineMaximized` | maximized | maximized | helpDisplayStateMachine | 状態機械 | The window is maximized. |
| 55 | `landingMarkDisplayStateMachine` | landingMarkDisplayStateMachine | landingMarkDisplayStateMachine |  | 状態機械 | Whether the Jump Landing Marks are shown. |
| 56 | `landingMarkDisplayStateMachineHidden` | hidden | hidden | landingMarkDisplayStateMachine | 状態機械 | No landing mark is shown. |
| 57 | `landingMarkDisplayStateMachineShown` | shown | shown | landingMarkDisplayStateMachine | 状態機械 | The landing marks are shown until the next press. |
| 58 | `dropCueDisplayStateMachine` | dropCueDisplayStateMachine | dropCueDisplayStateMachine |  | 状態機械 | Whether the Drop Cue is shown. |
| 59 | `dropCueDisplayStateMachineHidden` | hidden | hidden | dropCueDisplayStateMachine | 状態機械 | No file is dragged over the window. |
| 60 | `dropCueDisplayStateMachineShown` | shown | shown | dropCueDisplayStateMachine | 状態機械 | A file is dragged over the window and the Drop Cue is shown. |
| 61 | `baseTimeZoneDraftStateMachine` | baseTimeZoneDraftStateMachine | baseTimeZoneDraftStateMachine |  | 状態機械 | Whether a new Schedule Data time zone has been drafted but not applied. |
| 62 | `baseTimeZoneDraftStateMachineUntouched` | untouched | untouched | baseTimeZoneDraftStateMachine | 状態機械 | Nothing is drafted. |
| 63 | `baseTimeZoneDraftStateMachineDrafted` | drafted | drafted | baseTimeZoneDraftStateMachine | 状態機械 | A time zone is drafted and waits to be applied. |
| 64 | `timeShiftDraftStateMachine` | timeShiftDraftStateMachine | timeShiftDraftStateMachine |  | 状態機械 | Whether an amount for the Time Shift has been entered. |
| 65 | `timeShiftDraftStateMachineEmpty` | empty | empty | timeShiftDraftStateMachine | 状態機械 | No amount is entered. |
| 66 | `timeShiftDraftStateMachineAmountHeld` | amountHeld | amountHeld | timeShiftDraftStateMachine | 状態機械 | An amount in minutes is held. |
| 67 | `wholeScheduleShiftDraftStateMachine` | wholeScheduleShiftDraftStateMachine | wholeScheduleShiftDraftStateMachine |  | 状態機械 | Whether a new start date for the whole schedule has been entered. |
| 68 | `wholeScheduleShiftDraftStateMachineEmpty` | empty | empty | wholeScheduleShiftDraftStateMachine | 状態機械 | No date is entered. |
| 69 | `wholeScheduleShiftDraftStateMachineDateHeld` | dateHeld | dateHeld | wholeScheduleShiftDraftStateMachine | 状態機械 | A new start date is held. |
| 70 | `calendarDraftStateMachine` | calendarDraftStateMachine | calendarDraftStateMachine |  | 状態機械 | Whether the Holiday Settings Window holds a draft not yet applied. |
| 71 | `calendarDraftStateMachineUntouched` | untouched | untouched | calendarDraftStateMachine | 状態機械 | Nothing is drafted. |
| 72 | `calendarDraftStateMachineDrafted` | drafted | drafted | calendarDraftStateMachine | 状態機械 | A draft of the calendar is held and waits to be applied. |
| 73 | `noticeDisplayStateMachine` | noticeDisplayStateMachine | noticeDisplayStateMachine |  | 状態機械 | Whether notifications are standing. |
| 74 | `noticeDisplayStateMachineHidden` | hidden | hidden | noticeDisplayStateMachine | 状態機械 | No notification stands. |
| 75 | `noticeDisplayStateMachineShown` | shown | shown | noticeDisplayStateMachine | 状態機械 | One or more notifications stand, oldest first. |
| 76 | `changeDeliveryStateMachine` | changeDeliveryStateMachine | changeDeliveryStateMachine |  | 状態機械 | Whether change notices are being delivered to watchers. |
| 77 | `changeDeliveryStateMachineIdle` | idle | idle | changeDeliveryStateMachine | 状態機械 | No notice is being delivered. |
| 78 | `changeDeliveryStateMachineDelivering` | delivering | delivering | changeDeliveryStateMachine | 状態機械 | Change notices are being delivered. |
| 79 | `pointerPressStateMachine` | pointerPressStateMachine | pointerPressStateMachine |  | 状態機械 | Whether the pointer is pressed, and whether the press changes the document or only the view. |
| 80 | `pointerPressStateMachineNotPressed` | notPressed | notPressed | pointerPressStateMachine | 状態機械 | The pointer is not pressed. |
| 81 | `pointerPressStateMachineChangingDocument` | changingDocument | changingDocument | pointerPressStateMachine | 状態機械 | A press is changing the document, such as a drag of a task. |
| 82 | `pointerPressStateMachineViewingDocument` | viewingDocument | viewingDocument | pointerPressStateMachine | 状態機械 | A press only changes the view, such as a scroll. |
| 83 | `taskGroupGrabStateMachine` | taskGroupGrabStateMachine | taskGroupGrabStateMachine |  | 状態機械 | Whether a task group is grabbed by its grip, and whether it is being carried. |
| 84 | `taskGroupGrabStateMachineNotGrabbed` | notGrabbed | notGrabbed | taskGroupGrabStateMachine | 状態機械 | No task group is grabbed. |
| 85 | `taskGroupGrabStateMachineGrabbed` | grabbed | grabbed | taskGroupGrabStateMachine | 状態機械 | A task group is grabbed. |
| 86 | `taskGroupGrabStateMachineGrabPressed` | grabPressed | grabPressed | taskGroupGrabStateMachine | 状態機械 | The grip is pressed but has not moved yet. |
| 87 | `taskGroupGrabStateMachineCarrying` | carrying | carrying | taskGroupGrabStateMachine | 状態機械 | The task group is being carried. |
| 88 | `fileOperationStateMachine` | fileOperationStateMachine | fileOperationStateMachine |  | 状態機械 | Where a file operation stands: reading, asking, importing or writing. |
| 89 | `fileOperationStateMachineIdle` | idle | idle | fileOperationStateMachine | 状態機械 | No file operation runs. |
| 90 | `fileOperationStateMachineReadingDocumentFile` | readingDocumentFile | readingDocumentFile | fileOperationStateMachine | 状態機械 | A document file is being read. |
| 91 | `fileOperationStateMachineAwaitingOpenChoice` | awaitingOpenChoice | awaitingOpenChoice | fileOperationStateMachine | 状態機械 | Waiting for the person to choose how to open the file. |
| 92 | `fileOperationStateMachineAwaitingDiscardAnswer` | awaitingDiscardAnswer | awaitingDiscardAnswer | fileOperationStateMachine | 状態機械 | Waiting for the person to answer whether to discard the current document. |
| 93 | `fileOperationStateMachineImportingDocument` | importingDocument | importingDocument | fileOperationStateMachine | 状態機械 | The document read is being imported. |
| 94 | `fileOperationStateMachineAwaitingMergeMapping` | awaitingMergeMapping | awaitingMergeMapping | fileOperationStateMachine | 状態機械 | Waiting for the person to decide the duplicated tasks of a merge in the Difference Review Dialog. |
| 95 | `fileOperationStateMachineWritingDocumentFile` | writingDocumentFile | writingDocumentFile | fileOperationStateMachine | 状態機械 | A document file is being written. |
| 96 | `confirmationStateMachine` | confirmationStateMachine | confirmationStateMachine |  | 状態機械 | Whether a confirmation question is being asked. |
| 97 | `confirmationStateMachineNotAsked` | notAsked | notAsked | confirmationStateMachine | 状態機械 | No question is asked. |
| 98 | `confirmationStateMachineQuestionAsked` | questionAsked | questionAsked | confirmationStateMachine | 状態機械 | A question is asked and waits for the answer. |
| 99 | `unsavedEditsStateMachine` | unsavedEditsStateMachine | unsavedEditsStateMachine |  | 状態機械 | Whether the document has edits that are not saved. |
| 100 | `unsavedEditsStateMachineNothingUnsaved` | nothingUnsaved | nothingUnsaved | unsavedEditsStateMachine | 状態機械 | Everything is saved. |
| 101 | `unsavedEditsStateMachineEditsUnsaved` | editsUnsaved | editsUnsaved | unsavedEditsStateMachine | 状態機械 | Some edits are not saved. |
| 102 | `createdTaskNamingStateMachine` | createdTaskNamingStateMachine | createdTaskNamingStateMachine |  | 状態機械 | Whether a person is naming a task just created. |
| 103 | `createdTaskNamingStateMachineIdle` | idle | idle | createdTaskNamingStateMachine | 状態機械 | No task is being named. |
| 104 | `createdTaskNamingStateMachineNamingCreatedTask` | namingCreatedTask | namingCreatedTask | createdTaskNamingStateMachine | 状態機械 | The new task is being named in place. |
| 105 | `createdTaskNamingStateMachineCreatedNameEnded` | createdNameEnded | createdNameEnded | createdTaskNamingStateMachine | 状態機械 | Naming of the new task has just ended. |
| 106 | `fieldEditStateMachine` | fieldEditStateMachine | fieldEditStateMachine |  | 状態機械 | Whether a field is being edited in place. |
| 107 | `fieldEditStateMachineIdle` | idle | idle | fieldEditStateMachine | 状態機械 | No field is being edited. |
| 108 | `fieldEditStateMachineFieldFocusWanted` | fieldFocusWanted | fieldFocusWanted | fieldEditStateMachine | 状態機械 | A field is about to take the focus. |
| 109 | `fieldEditStateMachineEditingField` | editingField | editingField | fieldEditStateMachine | 状態機械 | A field is being edited and is not confirmed yet. |
| 110 | `selectionStateMachine` | selectionStateMachine | selectionStateMachine |  | 状態機械 | Whether anything is selected. |
| 111 | `selectionStateMachineNothingSelected` | nothingSelected | nothingSelected | selectionStateMachine | 状態機械 | Nothing is selected. |
| 112 | `selectionStateMachineObjectsSelected` | objectsSelected | objectsSelected | selectionStateMachine | 状態機械 | One or more things are selected, in the order they were selected. |
| 113 | `interactionRecordingStateMachine` | interactionRecordingStateMachine | interactionRecordingStateMachine |  | 状態機械 | Whether pointer input and drawing are being recorded for debugging. |
| 114 | `interactionRecordingStateMachineNotRecording` | notRecording | notRecording | interactionRecordingStateMachine | 状態機械 | Nothing is being recorded. |
| 115 | `interactionRecordingStateMachineRecordingInteractions` | recordingInteractions | recordingInteractions | interactionRecordingStateMachine | 状態機械 | Pointer input and drawing are being recorded. |
| 116 | `agentApiEnablingStateMachine` | agentApiEnablingStateMachine | agentApiEnablingStateMachine |  | 状態機械 | Whether the Agent API is turned on. |
| 117 | `agentApiEnablingStateMachineDisabled` | disabled | disabled | agentApiEnablingStateMachine | 状態機械 | The Agent API is off. |
| 118 | `agentApiEnablingStateMachineEnabled` | enabled | enabled | agentApiEnablingStateMachine | 状態機械 | The Agent API is on. |
| 119 | `treeStateMachine` | treeStateMachine | treeStateMachine |  | 状態機械 | The state machine of the tree state of each task group; its states are the values of treeState. |
| 120 | `pxPerDayAt1x` | pxPerDayAt1x | pxPerDayAt1x |  | タイムルーラー | The width of one day in pixels at horizontal zoom 1, the base of the time axis. |
| 121 | `rulerLabelGap` | rulerLabelGap | rulerLabelGap |  | タイムルーラー | The horizontal gap between two labels of the Time Ruler. |
| 122 | `rulerLabelPad` | rulerLabelPad | rulerLabelPad |  | タイムルーラー | The vertical space between a grid line and a label of the Time Ruler. |
| 123 | `rulerLabelBottomPad` | rulerLabelBottomPad | rulerLabelBottomPad |  | タイムルーラー | The vertical space under a label of the Time Ruler. |
| 124 | `basePlanHeight` | basePlanHeight | basePlanHeight |  | 縦の寸法 | The height of a Plan Bar at vertical zoom 1. |
| 125 | `actualOfPlan` | actualOfPlan | actualOfPlan |  | 縦の寸法 | The height of the Actual Bar as a ratio to the Plan Bar. |
| 126 | `actualMin` | actualMin | actualMin |  | 縦の寸法 | The lowest height of an Actual Bar. |
| 127 | `fontOfActual` | fontOfActual | fontOfActual |  | 縦の寸法 | The text size as a ratio to the Actual Bar height. |
| 128 | `fontMin` | fontMin | fontMin |  | 縦の寸法 | The smallest text size. |
| 129 | `thinFontScale` | thinFontScale | thinFontScale |  | 縦の寸法 | The text size factor for the thin line shapes. |
| 130 | `actualGap` | actualGap | actualGap |  | 縦の寸法 | The gap from the plan to the actual when the actual is drawn below the plan. |
| 131 | `stackGap` | stackGap | stackGap |  | 縦の寸法 | The gap between two Stack Tiers. |
| 132 | `taskGroupGap` | taskGroupGap | taskGroupGap |  | 縦の寸法 | The gap between two task groups. |
| 133 | `shapeHeightOf` | shapeHeightOf | shapeHeightOf |  | 縦の寸法 | The height of each shape as a ratio to the height of a Plan Bar, looked up by the shape name. |
| 134 | `shapeHeightOfRectangle` | rectangle | rectangle | shapeHeightOf | 縦の寸法 | The height ratio of the rectangle shape. |
| 135 | `shapeHeightOfChevron` | chevron | chevron | shapeHeightOf | 縦の寸法 | The height ratio of the chevron shape. |
| 136 | `shapeHeightOfArrow` | arrow | arrow | shapeHeightOf | 縦の寸法 | The height ratio of the arrow shape. |
| 137 | `shapeHeightOfEndpointSpan` | endpointSpan | endpointSpan | shapeHeightOf | 縦の寸法 | The height ratio of the endpointSpan shape. |
| 138 | `shapeHeightOfMilestone` | milestone | milestone | shapeHeightOf | 縦の寸法 | The height ratio of the milestone shape. |
| 139 | `dependencyWidth` | dependencyWidth | dependencyWidth |  | 依存線 | The thickness of a Dependency Line. |
| 140 | `dependencyArrowLength` | dependencyArrowLength | dependencyArrowLength |  | 依存線 | The length of the arrow triangle of a Dependency Line. |
| 141 | `dependencyLeadOut` | dependencyLeadOut | dependencyLeadOut |  | 依存線 | The straight run of a Dependency Line as it leaves the predecessor. |
| 142 | `dependencyLeadIn` | dependencyLeadIn | dependencyLeadIn |  | 依存線 | The straight run of a Dependency Line as it enters the successor. |
| 143 | `dependencyArrowWidth` | dependencyArrowWidth | dependencyArrowWidth |  | 依存線 | The base width of the arrow triangle of a Dependency Line. |
| 144 | `dependencyLagDefault` | dependencyLagDefault | dependencyLagDefault |  | 依存線 | The lag put on a dependency when it is made. |
| 145 | `markerSize` | markerSize | markerSize |  | 進捗マーク | The diameter of the Progress Mark. |
| 146 | `markerStroke` | markerStroke | markerStroke |  | 進捗マーク | The line thickness of the circle of the Progress Mark. |
| 147 | `resumeScaleInvalid` | resumeScaleInvalid | resumeScaleInvalid |  | 進捗マーク | The shrink factor of the Resume Mark when the resume date is not decided. |
| 148 | `resumeArmOfMarker` | resumeArmOfMarker | resumeArmOfMarker |  | 進捗マーク | The arm length of the Resume Mark as a ratio to the Progress Mark. |
| 149 | `resumeHeadOfMarker` | resumeHeadOfMarker | resumeHeadOfMarker |  | 進捗マーク | The arrowhead of the Resume Mark as a ratio to the Progress Mark. |
| 150 | `resumeDashOn` | resumeDashOn | resumeDashOn |  | 進捗マーク | The drawn part of the dash pattern of the Resume Dash Line. |
| 151 | `resumeDashOff` | resumeDashOff | resumeDashOff |  | 進捗マーク | The gap part of the dash pattern of the Resume Dash Line. |
| 152 | `resumeOpacityInvalid` | resumeOpacityInvalid | resumeOpacityInvalid |  | 進捗マーク | The opacity of the Resume Mark when the resume date is not decided. |
| 153 | `resumeDashWidth` | resumeDashWidth | resumeDashWidth |  | 進捗マーク | The thickness of the Resume Dash Line. |
| 154 | `labelCoef` | labelCoef | labelCoef |  | ラベル | The factor that estimates the width of a label from its text. |
| 155 | `labelPad` | labelPad | labelPad |  | ラベル | The gap between the start of a task and its name. |
| 156 | `labelGap` | labelGap | labelGap |  | ラベル | The gap between a task name and the Progress Mark. |
| 157 | `milestoneNameMarkerGap` | milestoneNameMarkerGap | milestoneNameMarkerGap |  | ラベル | The gap between a milestone name and its mark. |
| 158 | `assigneeLabelGap` | assigneeLabelGap | assigneeLabelGap |  | ラベル | The gap between the start of a task and its assignee and progress labels. |
| 159 | `progressMarkerEdgeGap` | progressMarkerEdgeGap | progressMarkerEdgeGap |  | ラベル | The gap between the end of a bar and the Progress Mark. |
| 160 | `milestoneNameStartOfWidth` | milestoneNameStartOfWidth | milestoneNameStartOfWidth |  | ラベル | Where a milestone name starts, as a ratio to the width of the diamond. |
| 161 | `labelBaseline` | labelBaseline | labelBaseline |  | ラベル | The correction of the text baseline of labels (the line letters sit on, not the earlier plan). |
| 162 | `labelHaloOfFont` | labelHaloOfFont | labelHaloOfFont |  | ラベル | The thickness of the halo around label text as a ratio to the text size. |
| 163 | `truncateUnits` | truncateUnits | truncateUnits |  | ラベル | The width at which a label is cut, counted in half-width characters. |
| 164 | `taskGroupTitleFont` | taskGroupTitleFont | taskGroupTitleFont |  | ラベル | The text size of a task group name. |
| 165 | `taskGroupTitleIndent` | taskGroupTitleIndent | taskGroupTitleIndent |  | ラベル | The indent of a task group name for each level of task group depth. |
| 166 | `taskGroupTitleTopScale` | taskGroupTitleTopScale | taskGroupTitleTopScale |  | ラベル | The text size factor of the names of top-level task groups. |
| 167 | `fontSizeStepSizes` | fontSizeStepSizes | fontSizeStepSizes |  | ラベル | The text size in pixels of each text size step (S, M, L). |
| 168 | `fontSizeStepSizesS` | S | S | fontSizeStepSizes | ラベル | The text size of the S step. |
| 169 | `fontSizeStepSizesM` | M | M | fontSizeStepSizes | ラベル | The text size of the M step. |
| 170 | `fontSizeStepSizesL` | L | L | fontSizeStepSizes | ラベル | The text size of the L step. |
| 171 | `planStroke` | planStroke | planStroke |  | 形の細部 | The outline of the plan. |
| 172 | `chevronNotchOfHeight` | chevronNotchOfHeight | chevronNotchOfHeight |  | 形の細部 | The notch of a chevron as a ratio to its height. |
| 173 | `chevronNotchOfWidth` | chevronNotchOfWidth | chevronNotchOfWidth |  | 形の細部 | The notch of a chevron as a ratio to its width. |
| 174 | `arrowHeadOfSpan` | arrowHeadOfSpan | arrowHeadOfSpan |  | 形の細部 | The largest arrowhead of an arrow shape as a ratio to its whole length. |
| 175 | `thinStrokeWidth` | thinStrokeWidth | thinStrokeWidth |  | 形の細部 | The thickness of the thin line shapes. |
| 176 | `thinArrowHeadLength` | thinArrowHeadLength | thinArrowHeadLength |  | 形の細部 | The length of the arrowhead of a thin line shape. |
| 177 | `thinArrowHeadHeight` | thinArrowHeadHeight | thinArrowHeadHeight |  | 形の細部 | The height of the arrowhead of a thin line shape. |
| 178 | `spanDotSize` | spanDotSize | spanDotSize |  | 形の細部 | The diameter of the dots of an endpoint span. |
| 179 | `starInnerOfOuter` | starInnerOfOuter | starInnerOfOuter |  | 形の細部 | The inner radius of the star mark as a ratio to its outer radius. |
| 180 | `minShapeWidth` | minShapeWidth | minShapeWidth |  | 形の細部 | The smallest width a shape keeps even when its span is zero. |
| 181 | `progressLineWidth` | progressLineWidth | progressLineWidth |  | イナズマ線 | The thickness of the Progress Line. |
| 182 | `progressLineOverhang` | progressLineOverhang | progressLineOverhang |  | イナズマ線 | How far the Progress Line sticks out above and below. |
| 183 | `rulerTierPxPerDayMonth` | rulerTierPxPerDayMonth | rulerTierPxPerDayMonth |  | LOD | The pixels per day at which the Time Ruler goes from years to years and months. |
| 184 | `rulerTierPxPerDayWeek` | rulerTierPxPerDayWeek | rulerTierPxPerDayWeek |  | LOD | The pixels per day at which the Time Ruler goes from years and months to years, months and weeks. |
| 185 | `rulerTierPxPerDayDay` | rulerTierPxPerDayDay | rulerTierPxPerDayDay |  | LOD | The pixels per day at which the Time Ruler goes on to days and weekdays. |
| 186 | `groupLevelOfDetailBase` | groupLevelOfDetailBase | groupLevelOfDetailBase |  | LOD | The first term of the group level of detail. |
| 187 | `groupLevelOfDetailRatio` | groupLevelOfDetailRatio | groupLevelOfDetailRatio |  | LOD | The common ratio of the group level of detail. |
| 188 | `stackSafetyCap` | stackSafetyCap | stackSafetyCap |  | LOD | The safety limit on the number of Stack Tiers in one task group; when reached, stacking stops and says so. |
| 189 | `themePreference` | themePreference | themePreference |  | テーマとズーム | The light or dark theme the reader chooses; dark mode is the common name of its dark value. Not saved in the document. |
| 190 | `zoomStep` | zoomStep | zoomStep |  | テーマとズーム | The zoom factor of one wheel notch. Not saved in the document. |
| 191 | `zoomMin` | zoomMin | zoomMin |  | テーマとズーム | The lower limit of the zoom. Not saved in the document. |
| 192 | `zoomMax` | zoomMax | zoomMax |  | テーマとズーム | The upper limit of the zoom. Not saved in the document. |
| 193 | `canvasPadding` | canvasPadding | canvasPadding |  | テーマとズーム | The margin of the drawing area. |
| 194 | `propertyPanelWidth` | propertyPanelWidth | propertyPanelWidth |  | 画面の値 | The width of the Properties Panel. Not saved in the document. |
| 195 | `pinnedTaskGroupMax` | pinnedTaskGroupMax | pinnedTaskGroupMax |  | 画面の値 | The largest number of pinned task groups. |
| 196 | `screenValuesDualCursor` | dualCursor | dualCursor | ScreenValues | 画面の値 | The two lines of the Dual Cursor. Not saved in the document. |
| 197 | `guideCursorMode` | guideCursorMode | guideCursorMode |  | 画面の値 | Which Guide Cursor is on: none, crosshair or a single vertical line. Not saved in the document. |
| 198 | `screenLanguage` | screenLanguage | screenLanguage |  | 画面の値 | The language of the screen, ja or en. Not saved in the document. |
| 199 | `helpLanguage` | helpLanguage | helpLanguage |  | 画面の値 | The language of the help, ja or en. Not saved in the document. |
| 200 | `exportCanvas` | exportCanvas | exportCanvas |  | 出力と上限 | The size of the SVG and PNG pictures that are exported. |
| 201 | `exportCanvasHeightCap` | exportCanvasHeightCap | exportCanvasHeightCap |  | 出力と上限 | The largest height of an exported picture. |
| 202 | `importMaxBytes` | importMaxBytes | importMaxBytes |  | 出力と上限 | The largest file that can be imported. |
| 203 | `importMaxItems` | importMaxItems | importMaxItems |  | 出力と上限 | The largest number of tasks that can be imported. |
| 204 | `importMaxDepth` | importMaxDepth | importMaxDepth |  | 出力と上限 | The deepest nesting of parent tasks that can be imported. |
| 205 | `importMinDate` | importMinDate | importMinDate |  | 出力と上限 | The earliest date that is accepted. |
| 206 | `importMaxDate` | importMaxDate | importMaxDate |  | 出力と上限 | The latest date that is accepted. |
| 207 | `carryMaxDepth` | carryMaxDepth | carryMaxDepth |  | 出力と上限 | The deepest nesting of pass-through elements that is kept. |
| 208 | `maxGroupDepth` | maxGroupDepth | maxGroupDepth |  | 出力と上限 | The deepest task group nesting. |
| 209 | `planActualGuideWeight` | planActualGuideWeight | planActualGuideWeight |  | そのほかの描く値 | The thickness of the Plan-Actual Guide Line. |
| 210 | `planActualGuidePattern` | planActualGuidePattern | planActualGuidePattern |  | そのほかの描く値 | The dash pattern of the Plan-Actual Guide Line. |
| 211 | `planActualGuideColor` | planActualGuideColor | planActualGuideColor |  | そのほかの描く値 | The color of the Plan-Actual Guide Line. |
| 212 | `fadeHandleHalfPx` | fadeHandleHalfPx | fadeHandleHalfPx |  | そのほかの描く値 | Half the side of the Fade Handle in pixels. |
| 213 | `fadeHandleStrokePx` | fadeHandleStrokePx | fadeHandleStrokePx |  | そのほかの描く値 | The frame thickness of the Fade Handle in pixels. |
| 214 | `appHeaderMaxHeight` | appHeaderMaxHeight | appHeaderMaxHeight |  | そのほかの描く値 | The largest height of the App Header. |
| 215 | `watermarkOpacity` | watermarkOpacity | watermarkOpacity |  | そのほかの描く値 | The opacity of the watermark. |
| 216 | `iconHintDelayMs` | iconHintDelayMs | iconHintDelayMs |  | そのほかの描く値 | How long the pointer rests on an icon before its explanation appears, in milliseconds. |
| 217 | `actualInitialDuration` | actualInitialDuration | actualInitialDuration |  | そのほかの描く値 | The length of the actual made when the Actual Dummy is grabbed. |
| 218 | `milestoneActualDuration` | milestoneActualDuration | milestoneActualDuration |  | そのほかの描く値 | The length of the actual of a milestone. |
| 219 | `dummyOpacity` | dummyOpacity | dummyOpacity |  | そのほかの描く値 | The opacity of the Actual Dummy. |
| 220 | `commentBoxPad` | commentBoxPad | commentBoxPad |  | そのほかの描く値 | The inner margin of the body box of a Comment Box. |
| 221 | `commentBoxWrapUnits` | commentBoxWrapUnits | commentBoxWrapUnits |  | そのほかの描く値 | The number of units after which the text of a Comment Box wraps. |
| 222 | `grsApp` | grsApp | grsApp |  | 配るもの | The GRS app: the one .html file (dist/index.html) that holds the whole application and runs in a browser with no server and no installation. |
| 223 | `grsAppBuildVersion` | buildVersion | buildVersion | grsApp | 配るもの | The build version of the app: the UTC time, to the second, of the build; it is written into every output that a machine reads. |
| 224 | `grsRelay` | GRS Relay | GRS Relay |  | 配るもの | GRS Relay: the relay a person who uses MCP adds (grs-relay.mcpb, an MCP bundle that runs grs-relay.mjs). It listens only on 127.0.0.1 on the person's computer, serves the GRS page and carries the AI's tool calls to the Agent API of that page. A person who does not use MCP needs only the .html file. |
| 225 | `grsRelayBundle` | grsRelayBundle | grsRelayBundle |  | 配るもの | grs-relay.mcpb: the MCP bundle file a person installs in an MCP application; it needs no separate installation of its own. |
| 226 | `grsRelayScript` | grsRelayScript | grsRelayScript |  | 配るもの | grs-relay.mjs: the relay program inside the bundle. |
| 227 | `grsRelayBuiltAt` | grsRelayBuiltAt | grsRelayBuiltAt |  | 配るもの | The version of GRS Relay: the time of the last commit that changed its contents, kept in the tools' artifact version file and written into the bundle. |
| 228 | `serverSyncDemo` | serverSyncDemo | serverSyncDemo |  | 配るもの | The server sync demo: a zip file (grs-server-sync-demo.zip) that shows GRS working together with a server. |
| 229 | `serverSyncDemoBuiltAt` | serverSyncDemoBuiltAt | serverSyncDemoBuiltAt |  | 配るもの | The version of the server sync demo: the time of the last commit that changed its contents. |
| 230 | `releaseTag` | releaseTag | releaseTag |  | 配るもの | A release tag: the stage (Alpha, Beta or Release) and the build time of what is released, such as Alpha-20261019T022508Z. |
| 231 | `documentModel` | DocumentModel | DocumentModel |  | entity の層 | The document and its invariants, and the values that are not saved (edit history, selection, screen values), all as immutable values. (src/entity/document-model) |
| 232 | `calendarDay` | CalendarDay | CalendarDay |  | entity の層 | A calendar day as year, month and day, without a time. |
| 233 | `dateTimeSide` | DateTimeSide | DateTimeSide |  | entity の層 | Which side of a span a date-time is on: start or finish. |
| 234 | `daySpanTooWide` | DaySpanTooWide | DaySpanTooWide |  | entity の層 | The error raised when a span of days is wider than the accepted range of dates. |
| 235 | `documentType` | Document | Document |  | entity の層 | The code type of the Schedule Document: the schema version, the Schedule Data, the document settings, the document stamp and the change log. |
| 236 | `documentSettingsType` | DocumentSettings | DocumentSettings |  | entity の層 | The code type of the document settings. |
| 237 | `drawnSettings` | DrawnSettings | DrawnSettings |  | entity の層 | The document settings joined with the built-in setting constants, as the drawing reads them. |
| 238 | `dualCursorSide` | DualCursorSide | DualCursorSide |  | entity の層 | Which line of the Dual Cursor: the first or the second. |
| 239 | `editHistoryType` | EditHistory | EditHistory |  | entity の層 | The code type of the edit history: the steps done and the steps undone. |
| 240 | `escapeTargetType` | EscapeTarget | EscapeTarget |  | entity の層 | What the Esc key closes or cancels next: a notice, a text entry, a question, a dialog, a gesture, a window, the Properties Panel, the armed tool, the selection, the Dual Cursor, a tooltip or full screen. |
| 241 | `historyLimits` | HistoryLimits | HistoryLimits |  | entity の層 | The limits of the edit history: the most steps and the largest total size. |
| 242 | `instantOnSideType` | InstantOnSide | InstantOnSide |  | entity の層 | A reader that turns a stored date-time text into an instant, on the start side or the finish side. |
| 243 | `itemRef` | ItemRef | ItemRef |  | entity の層 | A reference to one selectable item: a task, a dependency, a Highlight Box or a Comment Box. |
| 244 | `noWorkingDayReached` | NoWorkingDayReached | NoWorkingDayReached |  | entity の層 | The error raised when a calendar has no working day inside the accepted range of dates. |
| 245 | `parentTaskResolution` | ParentTaskResolution | ParentTaskResolution |  | entity の層 | How the parent of a task was found: stated in the WBS, or derived. |
| 246 | `rememberedActual` | RememberedActual | RememberedActual |  | entity の層 | An actual (start, stop and finish) that was removed and is remembered so that it can be restored. |
| 247 | `scheduleType` | Schedule | Schedule |  | entity の層 | The code type of the Schedule Data. |
| 248 | `taskVisual` | TaskVisual | TaskVisual |  | entity の層 | The code type that holds how a task is drawn; the code still uses this earlier name of TaskStyle. |
| 249 | `windowName` | WindowName | WindowName |  | entity の層 | The name of a Tool Window that a person can close: the three table windows and the help. |
| 250 | `workingCalendar` | WorkingCalendar | WorkingCalendar |  | entity の層 | The calendar GRS counts working days with: the calendar, its weekdays, its exceptions and the week start. |
| 251 | `actualInstantsOf` | actualInstantsOf | actualInstantsOf |  | entity の層 | The start and end instants of the actual of a task, on the working calendar. |
| 252 | `actualLastDay` | actualLastDay | actualLastDay |  | entity の層 | The last day of the actual of a task. |
| 253 | `actualLengthOf` | actualLengthOf | actualLengthOf |  | entity の層 | The length in working days of an actual, from its start to its last day. |
| 254 | `actualMinutesOf` | actualMinutesOf | actualMinutesOf |  | entity の層 | The working minutes between two instants, on the working calendar. |
| 255 | `blankTaskVisual` | blankTaskVisual | blankTaskVisual |  | entity の層 | The drawing style a task gets when nobody has chosen its shape or color. |
| 256 | `calendarDaysBetween` | calendarDaysBetween | calendarDaysBetween |  | entity の層 | The number of calendar days from one day to another. |
| 257 | `compareDays` | compareDays | compareDays |  | entity の層 | Compares two calendar days, for sorting. |
| 258 | `customColorOf` | customColorOf | customColorOf |  | entity の層 | Reads a stored custom color into its light and dark sides. |
| 259 | `customSideOf` | customSideOf | customSideOf |  | entity の層 | The light or the dark side of a custom color. |
| 260 | `dataWallOfViewWall` | dataWallOfViewWall | dataWallOfViewWall |  | entity の層 | Turns a wall-clock minute in the view time zone into the wall-clock minute of the Schedule Data time zone. |
| 261 | `dayOf` | dayOf | dayOf |  | entity の層 | Reads the calendar day from a date or date-time text. |
| 262 | `dayOfInstant` | dayOfInstant | dayOfInstant |  | entity の層 | The calendar day an instant falls on. |
| 263 | `delayFixCommands` | delayFixCommands | delayFixCommands |  | entity の層 | The document commands that carry out the given fix proposal rows. |
| 264 | `delayFixProposalRows` | delayFixProposalRows | delayFixProposalRows |  | entity の層 | The fix proposal rows as the report window lists them. |
| 265 | `diagnoseDelay` | diagnoseDelay | diagnoseDelay |  | entity の層 | Runs the Delay Diagnosis on a document and returns the report. |
| 266 | `earliestPlanStartDayOf` | earliestPlanStartDayOf | earliestPlanStartDayOf |  | entity の層 | The earliest planned start day among the given tasks. |
| 267 | `emptyHistory` | emptyHistory | emptyHistory |  | entity の層 | An edit history with no steps. |
| 268 | `emptySelection` | emptySelection | emptySelection |  | entity の層 | A selection with nothing in it. |
| 269 | `escapeTarget` | escapeTarget | escapeTarget |  | entity の層 | Decides what the Esc key acts on next, from the state of the screen. |
| 270 | `instantAfterWorkingMinutes` | instantAfterWorkingMinutes | instantAfterWorkingMinutes |  | entity の層 | The instant reached after a number of working minutes from a start, on the working calendar. |
| 271 | `instantOf` | instantOf | instantOf |  | entity の層 | Reads an instant from a date-time text. |
| 272 | `instantOnSide` | instantOnSide | instantOnSide |  | entity の層 | Reads an instant from a date or date-time text, giving a date without a time the default time of the start or the finish side. |
| 273 | `instantOnSideReader` | instantOnSideReader | instantOnSideReader |  | entity の層 | Makes a reader that turns texts into instants on a side, for one pass over a calendar or the Schedule Data. |
| 274 | `isNonRecurringException` | isNonRecurringException | isNonRecurringException |  | entity の層 | Whether an exception happens only once, so that GRS counts it. |
| 275 | `isRecommendedDelayFix` | isRecommendedDelayFix | isRecommendedDelayFix |  | entity の層 | Whether a fix proposal row is recommended: it has one way to fix and nothing in the way. |
| 276 | `isSameDay` | isSameDay | isSameDay |  | entity の層 | Whether two date texts fall on the same day. |
| 277 | `isSameWorkingTimeSet` | isSameWorkingTimeSet | isSameWorkingTimeSet |  | entity の層 | Whether two sets of working times are the same. |
| 278 | `isStandardTimeZoneKey` | isStandardTimeZoneKey | isStandardTimeZoneKey |  | entity の層 | Whether a value names a standard-time zone, which alone may be the Schedule Data time zone. |
| 279 | `lastDayForLength` | lastDayForLength | lastDayForLength |  | entity の層 | The last day of a span of a given working length from a start day. |
| 280 | `minutesPerWorkingDayOf` | minutesPerWorkingDayOf | minutesPerWorkingDayOf |  | entity の層 | The minutes of one working day of the project, with the default when the project gives none. |
| 281 | `parentTaskResolutionsOf` | parentTaskResolutionsOf | parentTaskResolutionsOf |  | entity の層 | How the parent of each task is found, stated or derived, for the Delay Diagnosis and the parent arrows. |
| 282 | `documentModelProgressStatus` | progressStatus | progressStatus | DocumentModel | entity の層 | Reads the progress status of a task from its actual date-times. |
| 283 | `plannedDurationMinutesOf` | plannedDurationMinutesOf | plannedDurationMinutesOf |  | entity の層 | The planned working minutes of a task. |
| 284 | `plannedInstantsOf` | plannedInstantsOf | plannedInstantsOf |  | entity の層 | The planned start and finish instants of a task. |
| 285 | `progressMarkerOf` | progressMarkerOf | progressMarkerOf |  | entity の層 | Which Progress Mark a task shows on the status date, including the diagnosis marks. |
| 286 | `proposeDelayFixes` | proposeDelayFixes | proposeDelayFixes |  | entity の層 | Makes the fix proposal rows from the Delay Diagnosis report. |
| 287 | `scheduleViolations` | scheduleViolations | scheduleViolations |  | entity の層 | Checks the Schedule Data against its invariants and lists the violations. |
| 288 | `searchRowsOf` | searchRowsOf | searchRowsOf |  | entity の層 | Builds the rows of the Search Window for a word. |
| 289 | `selectionWith` | selectionWith | selectionWith |  | entity の層 | A selection with one more item added. |
| 290 | `serial` | serial | serial |  | entity の層 | A day as a running number, for arithmetic on days. |
| 291 | `shownInstantReader` | shownInstantReader | shownInstantReader |  | entity の層 | Makes a reader that turns stored date-times into instants in the shown time zone. |
| 292 | `sideOfTaskColumn` | sideOfTaskColumn | sideOfTaskColumn |  | entity の層 | Whether a date-time column of a task is on the start side or the finish side. |
| 293 | `startSideOf` | startSideOf | startSideOf |  | entity の層 | The side a task's start reads on; a milestone's start reads on the finish side. |
| 294 | `taskByUid` | taskByUid | taskByUid |  | entity の層 | Finds a task by its uid. |
| 295 | `taskUidsIn` | taskUidsIn | taskUidsIn |  | entity の層 | The uids of the tasks in a selection. |
| 296 | `textOfDay` | textOfDay | textOfDay |  | entity の層 | Writes a calendar day as text (YYYY-MM-DD). |
| 297 | `textOfDayEnd` | textOfDayEnd | textOfDayEnd |  | entity の層 | Writes the end of a day as a date-time text. |
| 298 | `textOfDayStart` | textOfDayStart | textOfDayStart |  | entity の層 | Writes the start of a day as a date-time text. |
| 299 | `textOfFinishSide` | textOfFinishSide | textOfFinishSide |  | entity の層 | Writes a day as a finish date-time, with the project's default finish time. |
| 300 | `textOfInstant` | textOfInstant | textOfInstant |  | entity の層 | Writes an instant as a date-time text. |
| 301 | `textOfStartSide` | textOfStartSide | textOfStartSide |  | entity の層 | Writes a day as a start date-time, with the project's default start time; a milestone takes the finish time. |
| 302 | `viewRegionOf` | viewRegionOf | viewRegionOf |  | entity の層 | The time zone the screen is shown in, from the Schedule Data time zone and the view time zone. |
| 303 | `weekDayOf` | weekDayOf | weekDayOf |  | entity の層 | Builds a weekday of a calendar. |
| 304 | `workingCalendarOf` | workingCalendarOf | workingCalendarOf |  | entity の層 | The working calendar of the Schedule Data: the one calendar working days are counted with. |
| 305 | `workingDayShiftOf` | workingDayShiftOf | workingDayShiftOf |  | entity の層 | How date-times move, by working days, when the whole schedule is shifted to a new start day. |
| 306 | `workingSpansReader` | workingSpansReader | workingSpansReader |  | entity の層 | Makes a reader of the working time spans of each day. |
| 307 | `workingTimeSetOf` | workingTimeSetOf | workingTimeSetOf |  | entity の層 | The set of working times of the working calendar. |
| 308 | `workingTimesBreach` | workingTimesBreach | workingTimesBreach |  | entity の層 | Checks the working times of a day against the rules and says what is broken, if anything. |
| 309 | `zoneClockOf` | zoneClockOf | zoneClockOf |  | entity の層 | The clock (the offset) of a time zone key. |
| 310 | `layoutEngine` | LayoutEngine | LayoutEngine |  | entity の層 | The rectangles of the screen parts, the mapping between dates and positions, the placement of the task groups, the points of what is drawn, the level of detail and hit testing; all pure. (src/entity/layout-engine) |
| 311 | `barGeometry` | BarGeometry | BarGeometry |  | entity の層 | The drawn form of a task bar: an outline, a line or another form, with its points. |
| 312 | `hit` | Hit | Hit |  | entity の層 | What the pointer hits: the item, the grab area and, for a box, which part. |
| 313 | `landedTarget` | LandedTarget | LandedTarget |  | entity の層 | Where a jump landed: a task or a Comment Box. |
| 314 | `point` | Point | Point |  | entity の層 | A point on the screen: x and y. |
| 315 | `scheduleGeometry` | ScheduleGeometry | ScheduleGeometry |  | entity の層 | The points of everything drawn: task bars, baseline outlines, dependency lines, the Progress Line, the Status Line and more. |
| 316 | `scheduleLayout` | ScheduleLayout | ScheduleLayout |  | entity の層 | The layout of the schedule: the pixels per day, the ruler tier, the origin, and the placement of the task groups. |
| 317 | `screenRect` | ScreenRect | ScreenRect |  | entity の層 | A rectangle on the screen: x, y, width and height. |
| 318 | `screenRegions` | ScreenRegions | ScreenRegions |  | entity の層 | The rectangle of each region of the screen: the App Header, the Schedule Canvas, the Task Group Panel, the Time Ruler, the Properties Panel and the Task Group Lanes. |
| 319 | `taskGroupPlacement` | TaskGroupPlacement | TaskGroupPlacement |  | entity の層 | Where one task group is laid out: its depth, top, height and Stack Tiers. |
| 320 | `cursorInstantAtX` | cursorInstantAtX | cursorInstantAtX |  | entity の層 | The instant a cursor line stands on, at a horizontal position. |
| 321 | `dateAtX` | dateAtX | dateAtX |  | entity の層 | The calendar day at a horizontal position. |
| 322 | `dependencyEndAtPointer` | dependencyEndAtPointer | dependencyEndAtPointer |  | entity の層 | The task end a dependency line would attach to under the pointer. |
| 323 | `dependencyStartOfHit` | dependencyStartOfHit | dependencyStartOfHit |  | entity の層 | The task end a new dependency line starts from, given what the pointer hit. |
| 324 | `displayRatioOf` | displayRatioOf | displayRatioOf |  | entity の層 | The ratio the display scale multiplies drawn sizes by. |
| 325 | `drawnSettingsOf` | drawnSettingsOf | drawnSettingsOf |  | entity の層 | The settings as the drawing reads them, scaled once by the display scale. |
| 326 | `fitZoom` | fitZoom | fitZoom |  | entity の層 | The zoom and scroll that fit the whole schedule, or the fixed Fit Span, into the screen. |
| 327 | `fixedFitSpanOf` | fixedFitSpanOf | fixedFitSpanOf |  | entity の層 | The fixed Fit Span, when it is fixed and both ends are set. |
| 328 | `grabSizesOf` | grabSizesOf | grabSizesOf |  | entity の層 | The sizes of the grab margins. |
| 329 | `groupDepthLimit` | groupDepthLimit | groupDepthLimit |  | entity の層 | How deep task groups are drawn at the current vertical size. |
| 330 | `hasRoomBelowPinsIn` | hasRoomBelowPinsIn | hasRoomBelowPinsIn |  | entity の層 | Whether there is room below the pinned task groups to show a task group. |
| 331 | `itemAtPointer` | itemAtPointer | itemAtPointer |  | entity の層 | The item under the pointer, with its grab area. |
| 332 | `keptInViewByTreeState` | keptInViewByTreeState | keptInViewByTreeState |  | entity の層 | The task groups that their tree state keeps open. |
| 333 | `landedShapeBoxOf` | landedShapeBoxOf | landedShapeBoxOf |  | entity の層 | The box a jump lands on: the planned shape of a task or the body of a Comment Box. |
| 334 | `regionAtPointer` | regionAtPointer | regionAtPointer |  | entity の層 | The screen region the pointer is in. |
| 335 | `shownSpanOf` | shownSpanOf | shownSpanOf |  | entity の層 | The span of days shown in the Task Group Lanes. |
| 336 | `snappedInstantAtX` | snappedInstantAtX | snappedInstantAtX |  | entity の層 | The instant at a horizontal position, snapped to a step in minutes. |
| 337 | `taskGroupAnchorIn` | taskGroupAnchorIn | taskGroupAnchorIn |  | entity の層 | Which task group, and where in it, stands at a given height. |
| 338 | `taskPlacement` | taskPlacement | taskPlacement |  | entity の層 | Where a task is laid out. |
| 339 | `timeAxisOf` | timeAxisOf | timeAxisOf |  | entity の層 | The time axis alone, for turning a position into a day. |
| 340 | `xFromDay` | xFromDay | xFromDay |  | entity の層 | The horizontal position of a calendar day. |
| 341 | `advanceScreenSession` | AdvanceScreenSession | AdvanceScreenSession |  | use-case の層 | Advances the unsaved screen session by one event and returns the next state with the effects to run; it runs none of them. (src/use-case/advance-screen-session) |
| 342 | `noticeReason` | NoticeReason | NoticeReason |  | use-case の層 | The reason a notice is shown: a reason row, or an invariant row of the import checks. |
| 343 | `propertiesSubject` | PropertiesSubject | PropertiesSubject |  | use-case の層 | What the Properties Panel shows: the selection and the task groups. |
| 344 | `screenSession` | ScreenSession | ScreenSession |  | use-case の層 | All screen values that are not saved, region by region: screen, notices, gestures, file flow, field entry, selection, interaction record and Agent API. |
| 345 | `screenValues` | ScreenValues | ScreenValues |  | use-case の層 | The screen values of the screen region: the screen and help languages, the remembered actuals, the theme, the guide cursor, the Dual Cursor, the Properties Panel width and the open windows. |
| 346 | `screenValuesEvent` | ScreenValuesEvent | ScreenValuesEvent |  | use-case の層 | An event that changes the screen values, such as the palette toggled or full screen entered. |
| 347 | `searchPanelSession` | SearchPanelSession | SearchPanelSession |  | use-case の層 | The state of the Search Window: the word, the table, the filters, the place, the size and the text size step. |
| 348 | `sessionEvent` | SessionEvent | SessionEvent |  | use-case の層 | An event of any region of the screen session. |
| 349 | `tableView` | TableView | TableView |  | use-case の層 | How one table is shown: the visibility column, the column filters and the sort. |
| 350 | `tableVisibility` | TableVisibility | TableVisibility |  | use-case の層 | The visibility column of a table: the shown tasks, the shown resources, the unassigned row and whether the Schedule Filter is on. |
| 351 | `armedOf` | armedOf | armedOf |  | use-case の層 | The armed tool, or nothing when nothing is armed. |
| 352 | `emptySearchPanelSession` | emptySearchPanelSession | emptySearchPanelSession |  | use-case の層 | The state of the Search Window before anything is typed or chosen. |
| 353 | `isWindowStandingIn` | isWindowStandingIn | isWindowStandingIn |  | use-case の層 | Whether a Tool Window is open in the screen values. |
| 354 | `tableViewOf` | tableViewOf | tableViewOf |  | use-case の層 | The view of one table, read from the document settings. |
| 355 | `applyDocumentChangeType` | ApplyDocumentChange | ApplyDocumentChange |  | use-case の層 | The only write path. Checks the stamp, applies all or nothing, records history, advances the revision, notifies. (src/use-case/apply-document-change) |
| 356 | `changeAudience` | ChangeAudience | ChangeAudience |  | use-case の層 | Those that receive a confirmed change: the screen and the change watchers. |
| 357 | `documentHolder` | DocumentHolder | DocumentHolder |  | use-case の層 | Holds the current document and its history, and replaces them whole. |
| 358 | `planRefusal` | PlanRefusal | PlanRefusal |  | use-case の層 | Why a change was refused before it was applied: the stamp, the moment, or refused commands. |
| 359 | `replaceOutcome` | ReplaceOutcome | ReplaceOutcome |  | use-case の層 | The result of replacing the document: refused, or the new document. |
| 360 | `replacementCall` | ReplacementCall | ReplacementCall |  | use-case の層 | A call that replaces the whole held document: undo, redo, import or start-up. |
| 361 | `replacementRefusal` | ReplacementRefusal | ReplacementRefusal |  | use-case の層 | Why a replacement of the document was refused. |
| 362 | `writeMoment` | WriteMoment | WriteMoment |  | use-case の層 | Whether the moment allows a write: a gesture in flight, editing in place, a question asked, or notices being delivered. |
| 363 | `applyDocumentChange` | applyDocumentChange | applyDocumentChange |  | use-case の層 | The only write path: checks the stamp, applies the commands all or nothing, records the history and notifies. |
| 364 | `replaceDocument` | replaceDocument | replaceDocument |  | use-case の層 | Replaces the whole held document, as undo, redo or import do. |
| 365 | `chooseStartupDocument` | ChooseStartupDocument | ChooseStartupDocument |  | use-case の層 | Picks the document to open at start-up, in the given order. (src/use-case/choose-startup-document) |
| 366 | `editDocumentType` | EditDocument | EditDocument |  | use-case の層 | One pure operation per aggregate: task, group, dependency, annotation, resource, calendar, project, settings. (src/use-case/edit-document) |
| 367 | `settingsLimits` | SettingsLimits | SettingsLimits |  | use-case の層 | The limits that edits of the settings are checked against: the zoom limits and the width of the Task Group Lanes. |
| 368 | `editDocument` | editDocument | editDocument |  | use-case の層 | Applies one document command to a document and returns the result or the refusal. |
| 369 | `searchJumpCommands` | searchJumpCommands | searchJumpCommands |  | use-case の層 | The commands that carry out a jump from the Search Window. |
| 370 | `searchJumpReachOf` | searchJumpReachOf | searchJumpReachOf |  | use-case の層 | How far the view must move for a jump to reach its target. |
| 371 | `searchJumpWrites` | searchJumpWrites | searchJumpWrites |  | use-case の層 | Plans the writes a jump needs, such as opening task groups. |
| 372 | `shownTasksRevealWrites` | shownTasksRevealWrites | shownTasksRevealWrites |  | use-case の層 | The writes that make the given tasks visible. |
| 373 | `importDocumentType` | ImportDocument | ImportDocument |  | use-case の層 | Takes in a document and merges it. (src/use-case/import-document) |
| 374 | `importRequest` | ImportRequest | ImportRequest |  | use-case の層 | A request to import: the current and the incoming document, the format, the choice, and which checks passed. |
| 375 | `importDocumentImportDocument` | importDocument | importDocument | ImportDocument | use-case の層 | Imports a document as the request says and returns the outcome. |
| 376 | `notifyChangeWatchers` | NotifyChangeWatchers | NotifyChangeWatchers |  | use-case の層 | Hands confirmed changes to the watchers. (src/use-case/notify-change-watchers) |
| 377 | `redoEditType` | RedoEdit | RedoEdit |  | use-case の層 | Steps the history forward by one. (src/use-case/redo-edit) |
| 378 | `undoEditType` | UndoEdit | UndoEdit |  | use-case の層 | Steps the history back by one. (src/use-case/undo-edit) |
| 379 | `heldDocument` | HeldDocument | HeldDocument |  | use-case の層 | The document together with its edit history. |
| 380 | `validateImportedDocument` | ValidateImportedDocument | ValidateImportedDocument |  | use-case の層 | Checks untrusted input. Shared by every intake path. (src/use-case/validate-imported-document) |
| 381 | `agentApiEndpoint` | AgentApiEndpoint | AgentApiEndpoint |  | adapter の層 | Installs the Agent API. Not exposed by default. (src/adapter/agent-api-endpoint) |
| 382 | `answerRelayedCall` | answerRelayedCall | answerRelayedCall |  | adapter の層 | Answers one Agent API call that the relay carried to the page, and sends the page's change notices back to the relay. |
| 383 | `clipboardGateway` | ClipboardGateway | ClipboardGateway |  | adapter の層 | Sends the document or the picture out. Declares Clipboard. (src/adapter/clipboard-gateway) |
| 384 | `clipboard` | Clipboard | Clipboard |  | adapter の層 | The interface through which GRS writes content to the clipboard; the framework layer implements it. |
| 385 | `documentCodec` | DocumentCodec | DocumentCodec |  | adapter の層 | Converts between the document and JSON or MSPDI. (src/adapter/document-codec) |
| 386 | `jsonFromDocument` | jsonFromDocument | jsonFromDocument |  | adapter の層 | Writes the document as GRS JSON text. |
| 387 | `mspdiFromDocument` | mspdiFromDocument | mspdiFromDocument |  | adapter の層 | Writes the document as an MSPDI file, given the moment of the write. |
| 388 | `fileGateway` | FileGateway | FileGateway |  | adapter の層 | Opens and overwrites the document file. Declares FileStore. (src/adapter/file-gateway) |
| 389 | `fileStore` | FileStore | FileStore |  | adapter の層 | The interface through which GRS reads and writes document files; the framework layer implements it. |
| 390 | `openRoute` | OpenRoute | OpenRoute |  | adapter の層 | How a file reaches GRS to be opened: chosen in the file window, dropped, reopened, or chosen as a baseline. |
| 391 | `openedFileState` | OpenedFileState | OpenedFileState |  | adapter の層 | The state of the open file: none, writable, or with its write permission lost. |
| 392 | `imageExporter` | ImageExporter | ImageExporter |  | adapter の層 | Produces the image output. Declares Rasterizer. (src/adapter/image-exporter) |
| 393 | `rasterFaultReason` | RasterFaultReason | RasterFaultReason |  | adapter の層 | Why a picture could not be turned into an image: not supported, too large, or failed. |
| 394 | `rasterizer` | Rasterizer | Rasterizer |  | adapter の層 | The interface that turns an SVG picture into a PNG image; the framework layer implements it. |
| 395 | `imageExporterExportSvg` | exportSvg | exportSvg | ImageExporter | adapter の層 | Builds the SVG picture that is exported. |
| 396 | `inputCommandTranslator` | InputCommandTranslator | InputCommandTranslator |  | adapter の層 | Turns pointer and keyboard input into one operation. Declares InputSource. (src/adapter/input-command-translator) |
| 397 | `humanInput` | HumanInput | HumanInput |  | adapter の層 | One input from a person: a pointer, wheel or key input. |
| 398 | `pointerInput` | PointerInput | PointerInput |  | adapter の層 | One pointer input: its phase, button, position, modifier keys and click count. |
| 399 | `mcpToolTranslator` | McpToolTranslator | McpToolTranslator |  | adapter の層 | Maps MCP tool calls and answers to and from the Agent API members; runs in the relay process, not in the page. (src/adapter/mcp-tool-translator) |
| 400 | `screenRenderer` | ScreenRenderer | ScreenRenderer |  | adapter の層 | Builds the description of the UI parts outside the schedule. Declares ScreenSurface. (src/adapter/screen-renderer) |
| 401 | `appHeaderItems` | AppHeaderItems | AppHeaderItems |  | adapter の層 | What the App Header shows: the branding, the Project Title, the opened file name, when it was saved, and the header icons. |
| 402 | `displayLanguage` | DisplayLanguage | DisplayLanguage |  | adapter の層 | The language the screen is shown in: ja or en. |
| 403 | `fieldCommit` | FieldCommit | FieldCommit |  | adapter の層 | A value a person confirmed in a field: the row of the field, which field, and the text. |
| 404 | `fieldEditNotice` | FieldEditNotice | FieldEditNotice |  | adapter の層 | A notice that the editing of a field began or ended. |
| 405 | `horizontalWhole` | HorizontalWhole | HorizontalWhole |  | adapter の層 | The horizontal extent of the content and the view together, used by the scrollbars. |
| 406 | `screenPart` | ScreenPart | ScreenPart |  | adapter の層 | Which part of the screen something is: the part name and, where it applies, its icon, export format, task group, resource or panel. |
| 407 | `screenSurface` | ScreenSurface | ScreenSurface |  | adapter の層 | The interface that puts the screen view on the page and reads back the field edits; the framework layer implements it. |
| 408 | `screenView` | ScreenView | ScreenView |  | adapter の層 | The description of every UI part outside the schedule drawing, in the screen language. |
| 409 | `searchFilterChange` | SearchFilterChange | SearchFilterChange |  | adapter の層 | A change to a column filter of the Search Window; it names its column. |
| 410 | `taskGroupTitle` | TaskGroupTitle | TaskGroupTitle |  | adapter の層 | One task group title as laid out in the Task Group Panel: its box, indent, font size and label. |
| 411 | `verticalWhole` | VerticalWhole | VerticalWhole |  | adapter の層 | The vertical extent of the content and the view together, used by the scrollbars. |
| 412 | `windowShown` | WindowShown | WindowShown |  | adapter の層 | How a Tool Window is shown: normal, minimized or maximized. |
| 413 | `taskGroupTitleFontPxOf` | taskGroupTitleFontPxOf | taskGroupTitleFontPxOf |  | adapter の層 | The font size in pixels of a task group title at a given depth. |
| 414 | `svgRenderer` | SvgRenderer | SvgRenderer |  | adapter の層 | Builds the SVG string from geometry, then hands it over. Declares SvgSurface. (src/adapter/svg-renderer) |
| 415 | `svgSurface` | SvgSurface | SvgSurface |  | adapter の層 | The interface that puts the SVG picture on the page; the framework layer implements it. |
| 416 | `viewerValues` | ViewerValues | ViewerValues |  | adapter の層 | The screen values the picture reads, such as the theme and the guide cursor. |
| 417 | `colorOf` | colorOf | colorOf |  | adapter の層 | The color drawn for a color row of the settings, for a theme hue, light or dark, and monochrome or not. |
| 418 | `svgFromSchedule` | svgFromSchedule | svgFromSchedule |  | adapter の層 | Builds the SVG picture of the schedule from the Schedule Data, the settings, the layout, the geometry and the selection. |
| 419 | `browserClipboard` | BrowserClipboard | BrowserClipboard |  | framework の層 | Writes to the clipboard. (src/framework/browser-clipboard) |
| 420 | `canvasRasterizer` | CanvasRasterizer | CanvasRasterizer |  | framework の層 | Turns SVG into a raster image. (src/framework/canvas-rasterizer) |
| 421 | `domInputSource` | DomInputSource | DomInputSource |  | framework の層 | Delivers pointer and keyboard events. (src/framework/dom-input-source) |
| 422 | `domScreenSurface` | DomScreenSurface | DomScreenSurface |  | framework の層 | Puts that description on the page. (src/framework/dom-screen-surface) |
| 423 | `domSvgSurface` | DomSvgSurface | DomSvgSurface |  | framework の層 | Puts the SVG string on screen. (src/framework/dom-svg-surface) |
| 424 | `fileSystemAccessFileStore` | FileSystemAccessFileStore | FileSystemAccessFileStore |  | framework の層 | Reads and writes files and keeps the handle. (src/framework/file-system-access-file-store) |
| 425 | `mcpRelayServer` | McpRelayServer | McpRelayServer |  | framework の層 | Carries an MCP client's calls to the page it served on 127.0.0.1 and holds the key, the connected page, the pending calls and the queued notices. (src/framework/mcp-relay-server) |
| 426 | `singleHtmlShell` | SingleHtmlShell | SingleHtmlShell |  | framework の層 | Boots the page, wires every part together, holds the slot of the embedded document and installs the point where the Agent API is exposed. (src/framework/single-html-shell) |

## 仕様の表（`tbl-glossary.md`）と辞書で名が違う語（54 語）

辞書の名は持ち主が裁定した名か、レビューで量る名である。裁定した名は CR-855 が改名の手順で仕様へ当てる。

| 行 ID | キー | 仕様の表の名 | 辞書の英語の名 | 辞書の日本語の名 | 拠り所 |
| --- | --- | --- | --- | --- | --- |
| N-7 | `passthrough` | `carry` / `carryElements` | passthrough | passthrough | JDG-3807 |
| P-18 | `paintColor` | `strokeColor` / `fillColor` / `strokeWidthPx` | color | color | JDG-3483 JDG-3490 JDG-3607 JDG-3781 JDG-3807 |
| P-18 | `strokeColor` | `strokeColor` / `fillColor` / `strokeWidthPx` | color | color | JDG-3483 JDG-3490 JDG-3607 JDG-3781 JDG-3807 |
| P-18 | `widthPx` | `strokeColor` / `fillColor` / `strokeWidthPx` | widthPx | widthPx | JDG-3483 JDG-3490 JDG-3607 JDG-3781 JDG-3807 |
| P-23 | `predecessorLinkType` | `linkType` | type | type | JDG-3463 JDG-3483 JDG-3490 JDG-3520 JDG-3548 JDG-3628 JDG-3807 |
| N-12 | `predecessorLink` | `Dependency` | PredecessorLink | PredecessorLink | JDG-3520 JDG-3807 |
| P-21 | `startSlopeCalendarDays` | `fadeInDays` / `fadeOutDays` | startSlopeCalendarDays | startSlopeCalendarDays | JDG-3781 JDG-3807 |
| P-21 | `finishSlopeCalendarDays` | `fadeInDays` / `fadeOutDays` | finishSlopeCalendarDays | finishSlopeCalendarDays | JDG-3781 JDG-3807 |
| N-26 | `showMode` | `treeState` | showMode | showMode | JDG-3781 JDG-3807 |
| P-10 | `taskShape` | `shapeKind` | taskShape | taskShape | JDG-3781 JDG-3807 |
| P-14 | `taskShapeDumbbell` | `'endpointSpan'` | dumbbell | dumbbell | JDG-3807 |
| P-16 | `milestoneShape` | `milestoneGlyph` | milestoneShape | milestoneShape | JDG-3781 JDG-3807 |
| N-13 | `taskStyleType` | `TaskVisual` | TaskStyle | TaskStyle | JDG-3614 JDG-3807 |
| N-14 | `importOriginType` | `TaskOrigin` | ImportOrigin | ImportOrigin | JDG-3807 |
| K-125 | `displayScaleRatio` | `displayScale` | Display Scale | 表示の倍率 | JDG-3519 JDG-3781 JDG-3807 |
| K-85 | `fontSizePreset` | `fontSizeStep` | Font Size | 文字サイズ | JDG-3483 JDG-3490 JDG-3623 JDG-3781 JDG-3807 |
| K-67 | `dayWidthPx` | `zoomX` | Horizontal Zoom | 横のズーム倍率 | JDG-3519 JDG-3621 JDG-3781 JDG-3807 |
| K-68 | `ratio` | `zoomY` | Vertical Zoom | 縦のズーム倍率 | JDG-3519 JDG-3781 JDG-3807 |
| K-69 | `leftEdgeDay` | `scrollDate` | Left Edge Date | 表示の左端が指す日付 | JDG-3519 JDG-3781 JDG-3807 |
| K-121 | `leftEdgeDayOffsetPercent` | `scrollDateFraction` | Left Edge Time | 表示の左端が指す日のどこにあるか | JDG-3519 JDG-3781 JDG-3807 |
| K-70 | `topEdgeTaskGroupId` | `scrollTaskGroupId` | Top Task Group | 表示の上端が指すタスクグループ | JDG-3519 JDG-3781 JDG-3807 |
| K-120 | `topEdgeTaskGroupOffsetPercent` | `scrollTaskGroupFraction` | Top Task Group Position | 表示の上端が指すタスクグループのどこにあるか | JDG-3519 JDG-3781 JDG-3807 |
| K-142 | `fitDayRangeType` | `isFitSpanFixed` | Fix the fit span | 全体表示時の期間を固定する | JDG-3519 JDG-3781 JDG-3807 |
| K-141 | `fitDayRange` | `fitSpanStart` / `fitSpanFinish` | Fit Span | 全体表示時の期間 | JDG-3519 JDG-3781 JDG-3807 |
| K-145 | `additionalTimeZones` | `displayTimeZones` | Display Time Zone | 表示するタイムゾーン | JDG-3519 JDG-3781 JDG-3807 |
| K-76 | `isPercentCompleteLabelVisible` | `isPercentCompleteVisible` | Percent Complete Label | 完了率ラベル | JDG-3781 JDG-3807 |
| K-78 | `isProgressStatusMarkVisible` | `isProgressMarkerVisible` | Progress Marker | 進捗マーカー | JDG-3781 JDG-3807 |
| K-77 | `isDependencyLineVisible` | `isDependencyVisible` | Dependency Lines | 依存線 | JDG-3781 JDG-3807 |
| K-75 | `isAssigneeLabelVisible` | `isAssigneeVisible` | Assignee Label | 担当ラベル | JDG-3781 JDG-3807 |
| K-83 | `isTaskGroupGridLinesVisible` | `isGroupGridLinesVisible` | Group Grid Lines | グループ罫線（TaskGroup 境界の横線） | JDG-3519 JDG-3781 JDG-3807 |
| K-73 | `taskPlacementDirection` | `stackDirection` | Stack Direction | 積む向き | JDG-3781 JDG-3807 |
| K-140 | `parentTaskProgressToleranceWorkingDays` | `parentTaskProgressToleranceDays` | Parent Task Progress Tolerance | 遅延診断時に親タスクの進捗の疑義を許す日数 | JDG-3496 JDG-3512 JDG-3519 JDG-3605 JDG-3781 JDG-3807 |
| K-86 | `mspdiImportCount` | `importSequence` | mspdiImportCount | mspdiImportCount | JDG-3556 JDG-3605 JDG-3618 JDG-3627 JDG-3807 |
| U-45 | `grsType` | `GoodRelax Scheduler` | GRS | GRS | JDG-3524 |
| U-27 | `projectTitle` | `Document Title` | Project Title | プロジェクトタイトル | JDG-3355 JDG-3365 |
| U-30 | `helpWindow` | `Help Modal` | Help Window | ヘルプウィンドウ | JDG-3356 |
| U-64 | `searchWindow` | `Search Panel` | Search Window | 検索ウィンドウ | JDG-3356 |
| U-49 | `resourceListWindow` | `Resource List` | Resource List Window | 担当リストウィンドウ | JDG-3356 |
| U-66 | `delayDiagnosisReportWindow` | `Delay Diagnostics Report` | Delay Diagnosis Report Window | 遅延診断レポートウィンドウ | JDG-3512 JDG-3698 |
| U-65 | `holidaySettingsWindow` | `Holiday Settings` | Holiday Settings Window | 休日設定ウィンドウ | JDG-3356 JDG-3365 JDG-3464 |
| U-54 | `saveAsDialog` | `Export Chooser` | Save As Dialog | 別名保存ダイアログ | JDG-3356 JDG-3364 |
| U-56 | `openFileDialog` | `Open Chooser` | Open File Dialog | ファイルオープンダイアログ | JDG-3356 JDG-3363 JDG-3434 |
| U-60 | `watermarkUnlockDialog` | `Watermark Unlock` | Watermark Unlock Dialog | 透かし解除ダイアログ | JDG-3356 |
| U-61 | `differenceReviewDialog` | `Difference Review` | Difference Review Dialog | 差分確認ダイアログ | JDG-3356 JDG-3363 |
| U-62 | `importReportDialog` | `Import Report` | Import Report Dialog | 読込報告ダイアログ | JDG-3356 JDG-3363 |
| U-55 | `confirmationMessage` | `Confirmation` | Confirmation Message | 確認メッセージ | JDG-3363 JDG-3364 |
| U-50 | `taskGroupLanes` | `Task Group Area` | Task Group Lanes | タスクグループレーンズ | JDG-3361 JDG-3374 |
| U-1 | `taskGroupLane` | `Task Groups` | Task Group Lane | タスクグループレーン | JDG-3361 JDG-3374 JDG-3733 |
| U-52 | `actualDummy` | `Actual Operation Dummy` | Actual Dummy | 実績ダミー | JDG-3375 |
| U-6 | `resumeMark` | `Resume Icon` | Resume Mark | 再開マーク | JDG-3372 |
| U-43 | `grabArea` | `Grab Region` / `Grab Point` | Grab Area | 掴み領域 | JDG-3366 |
| U-47 | `taskGroupButtons` | `Task Group Expander` | Task Group Buttons | タスクグループボタン | JDG-3368 |
| U-48 | `pinButton` | `Task Group Pin` | Pin Button | ピン止めボタン | JDG-3368 |
| U-37 | `watermarkUnlockPassword` | `WatermarkUnlockPassword` | Watermark Unlock Password | 透かし解除パスワード | — |

## 前の名を別の語が名に使う例（1 件）

基準書の付録 A.2 は、前の名を別の語に使い回さないとする。下の名は持ち主が凍結した契約で決めたので、持ち主が扱いを決める。

| キー | 前の名 | 今その名を持つ語 | 改名の拠り所 |
| --- | --- | --- | --- |
| `commandRefusal` | `Refusal` | `refusalType` | JDG-3781 |

## 仕様の表がまだ前の名を印字する語（11 語）

辞書は改名を `renames[]` に持ち、その改名に `xAppliedToSpec: false` を付けた。`tbl-glossary.md` は、この印があるあいだ前の名を印字する。CR-855 が仕様へ改名を当てるとき、印を外して作り直す。

| 行 ID | キー | 仕様の表の名（前の名） | 辞書の書き名 | 改名の拠り所 |
| --- | --- | --- | --- | --- |
| P-18 | `paintColor` | `fillColor` | `color` | JDG-3607 |
| P-18 | `strokeColor` | `strokeColor` | `color` | JDG-3607 |
| P-18 | `widthPx` | `strokeWidthPx` | `widthPx` | JDG-3607 |
| P-23 | `predecessorLinkType` | `linkType` | `type` | JDG-3628 |
| N-26 | `showMode` | `treeState` | `showMode` | JDG-3736 |
| P-14 | `taskShapeDumbbell` | `endpointSpan` | `dumbbell` | JDG-3696 |
| N-14 | `importOriginType` | `TaskOrigin` | `ImportOrigin` | JDG-3710 |
| K-85 | `fontSizePreset` | `fontSizeStep` | `fontSizePreset` | JDG-3623 |
| K-145 | `additionalTimeZones` | `displayTimeZones` | `additionalTimeZones` | JDG-3741 |
| K-83 | `isTaskGroupGridLinesVisible` | `isGroupGridLinesVisible` | `isTaskGroupGridLinesVisible` | JDG-3745 |
| K-73 | `taskPlacementDirection` | `stackDirection` | `taskPlacementDirection` | JDG-3731 |

## 仕様の表が辞書に無い名で書く名（58 件）

`glossary-tables.json` の名の欄が、置き換えの印（`{written:キー}` ほか）でなく、名をじかに書いている。辞書はこの名を、語の名としても `renames[].from` としても持たない。辞書が改名か語を持てば、CR-855 が欄を置き換えの印に直す。

| 行 ID | 仕様の表の名 | その行の語（キー: 辞書の書き名） |
| --- | --- | --- |
| N-3 | `TaskGroupMember` | — |
| N-7 | `carry` | `passthrough`: `passthrough` |
| N-7 | `carryElements` | `passthrough`: `passthrough` |
| P-5 | `actualDuration` | — |
| P-10 | `shapeKind` | `taskShape`: `taskShape` |
| P-15 | `milestone` | — |
| P-16 | `milestoneGlyph` | `milestoneShape`: `milestoneShape` |
| P-17 | `actualPlacement` | — |
| P-19 | `transparent` | — |
| P-21 | `fadeInDays` | `startSlopeCalendarDays`: `startSlopeCalendarDays`, `finishSlopeCalendarDays`: `finishSlopeCalendarDays` |
| P-21 | `fadeOutDays` | `startSlopeCalendarDays`: `startSlopeCalendarDays`, `finishSlopeCalendarDays`: `finishSlopeCalendarDays` |
| U-1 | `Task Groups` | `taskGroupLane`: `taskGroupLane` |
| U-5 | `Progress Marker` | `progressMark`: `progressMark` |
| U-6 | `Resume Icon` | `resumeMark`: `resumeMark` |
| U-14 | `Comment Boxes` | `commentBoxGraphic`: `commentBoxGraphic` |
| U-15 | `Highlight Boxes` | `highlightBoxGraphic`: `highlightBoxGraphic` |
| U-15a | `Annotations` | `annotation`: `Annotation` |
| U-16 | `Dependency Lines` | `dependencyLine`: `dependencyLine` |
| U-27 | `Document Title` | `projectTitle`: `projectTitle` |
| U-30 | `Help Modal` | `helpWindow`: `helpWindow` |
| U-34 | `Palette Commands` | `paletteGroups`: `paletteGroups` |
| U-37 | `WatermarkUnlockPassword` | `watermarkUnlockPassword`: `watermarkUnlockPassword` |
| U-43 | `Grab Region` | `grabPoint`: `grabPoint`, `grabArea`: `grabArea` |
| U-45 | `GoodRelax Scheduler` | `grsType`: `GRS` |
| U-47 | `Task Group Expander` | `taskGroupButtons`: `taskGroupButtons` |
| U-48 | `Task Group Pin` | `pinButton`: `pinButton` |
| U-49 | `Resource List` | `resourceListWindow`: `resourceListWindow` |
| U-50 | `Task Group Area` | `taskGroupLanes`: `taskGroupLanes` |
| U-52 | `Actual Operation Dummy` | `actualDummy`: `actualDummy` |
| U-54 | `Export Chooser` | `saveAsDialog`: `saveAsDialog` |
| U-55 | `Confirmation` | `confirmationMessage`: `confirmationMessage` |
| U-56 | `Open Chooser` | `openFileDialog`: `openFileDialog` |
| U-60 | `Watermark Unlock` | `watermarkUnlockDialog`: `watermarkUnlockDialog` |
| U-61 | `Difference Review` | `differenceReviewDialog`: `differenceReviewDialog` |
| U-62 | `Import Report` | `importReportDialog`: `importReportDialog` |
| U-64 | `Search Panel` | `searchWindow`: `searchWindow` |
| U-65 | `Holiday Settings` | `holidaySettingsWindow`: `holidaySettingsWindow` |
| U-66 | `Delay Diagnostics Report` | `delayDiagnosisReportWindow`: `delayDiagnosisReportWindow` |
| K-67 | `zoomX` | `dayWidthPx`: `dayWidthPx` |
| K-68 | `zoomY` | `ratio`: `ratio` |
| K-69 | `scrollDate` | `leftEdgeDay`: `leftEdgeDay` |
| K-70 | `scrollTaskGroupId` | `topEdgeTaskGroupId`: `topEdgeTaskGroupId` |
| K-122 | `isPlanVisible` | `isPlanBarVisible`: `Plan` |
| K-123 | `isActualVisible` | `isActualBarVisible`: `Actual` |
| K-75 | `isAssigneeVisible` | `isAssigneeLabelVisible`: `isAssigneeLabelVisible` |
| K-76 | `isPercentCompleteVisible` | `isPercentCompleteLabelVisible`: `isPercentCompleteLabelVisible` |
| K-77 | `isDependencyVisible` | `isDependencyLineVisible`: `isDependencyLineVisible` |
| K-78 | `isProgressMarkerVisible` | `isProgressStatusMarkVisible`: `isProgressStatusMarkVisible` |
| K-84 | `isBaselineVisible` | `isBaselineOutlineVisible`: `Baseline` |
| K-125 | `displayScale` | `displayScaleRatio`: `displayScaleRatio` |
| K-86 | `importSequence` | `mspdiImportCount`: `mspdiImportCount` |
| K-141 | `fitSpanStart` | `fitDayRange`: `fitDayRange` |
| K-141 | `fitSpanFinish` | `fitDayRange`: `fitDayRange` |
| K-142 | `isFitSpanFixed` | `fitDayRangeType`: `type` |
| K-120 | `scrollTaskGroupFraction` | `topEdgeTaskGroupOffsetPercent`: `topEdgeTaskGroupOffsetPercent` |
| K-121 | `scrollDateFraction` | `leftEdgeDayOffsetPercent`: `leftEdgeDayOffsetPercent` |
| K-138 | `levelZeroTreeState` | — |
| K-140 | `parentTaskProgressToleranceDays` | `parentTaskProgressToleranceWorkingDays`: `parentTaskProgressToleranceWorkingDays` |

## 略語の展開形（27 語）

略語の形の語は `xExpansion` に元の語を持つ（JDG-3524）。`tbl-glossary.md` の表は、CR-855 で展開形を印字する。

| キー | 英語の名 | 展開形（英語） | 展開形（日本語） |
| --- | --- | --- | --- |
| `ndd` | NDD | Naming Driven Development | Naming Driven Development |
| `ssot` | SSOT | Single Source of Truth | 唯一の正 |
| `okpn` | OKPN | One Kind Per Name | 1 つの名前に 1 種類の値 |
| `ompv` | OMPV | One Meaning Per Value | 1 つの値に 1 つの意味 |
| `sdp` | SDP | Stable Dependencies Principle | 安定依存の原則 |
| `kiss` | KISS | Keep It Simple, Stupid | Keep It Simple, Stupid |
| `yagni` | YAGNI | You Aren't Gonna Need It | You Aren't Gonna Need It |
| `dry` | DRY | Don't Repeat Yourself | Don't Repeat Yourself |
| `soC` | SoC | Separation of Concerns | 関心の分離 |
| `srp` | SRP | Single Responsibility Principle | 単一責任の原則 |
| `slap` | SLAP | Single Level of Abstraction Principle | 単一抽象レベルの原則 |
| `ocp` | OCP | Open-Closed Principle | 開放閉鎖の原則 |
| `lsp` | LSP | Liskov Substitution Principle | リスコフの置換原則 |
| `isp` | ISP | Interface Segregation Principle | インターフェース分離の原則 |
| `dip` | DIP | Dependency Inversion Principle | 依存性逆転の原則 |
| `loD` | LoD | Law of Demeter | デメテルの法則 |
| `cqs` | CQS | Command-Query Separation | コマンド・クエリ分離 |
| `pola` | POLA | Principle of Least Astonishment | 最小驚きの原則 |
| `pie` | PIE | Program Intently and Expressively | 意図を明確に表すプログラミング |
| `ca` | CA | Clean Architecture | クリーンアーキテクチャ |
| `json` | JSON | JavaScript Object Notation | JavaScript Object Notation |
| `mcp` | MCP | Model Context Protocol | Model Context Protocol |
| `mspdi` | MSPDI | Microsoft Project Data Interchange | Microsoft Project Data Interchange |
| `iso8601` | ISO8601 | ISO 8601 | ISO 8601 |
| `bcp47` | BCP47 | Best Current Practice 47 | Best Current Practice 47 |
| `grsType` | GRS | GoodRelax Scheduler | GoodRelax Scheduler |
| `taskUidField` | UID | Unique Identifier | 一意な識別子 |
