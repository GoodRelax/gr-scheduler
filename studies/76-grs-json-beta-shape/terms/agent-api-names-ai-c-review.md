# 文書の命令と Agent API の名 —— 独立レビュー（AI-C、2026-11-24）

対象: `agent-api-names-by-policy-draft.md`（JDG-3781〜3784 で確定した一覧）と方針 `agent-api-naming-policy-draft.md`（P-1〜P-12）。観点は `grs-json-final-review-viewpoints.md` の V-1〜V-9。
照らした物: GRS JSON β の木 `grs-json-final-review-tree.md`（以下「木」）とスキーマ、用語集の下書き `glossary-draft/glossary.json`、画面の木 `10-screen-term-tree.md`、問いの記録 `13-glossary-queue.md`（以下「問い」）、α の原稿 2 つ、`rulings.md`。
所見 26（高 4・中 13・低 9）。行番号は、断りが無ければ一覧 `agent-api-names-by-policy-draft.md` の行。

## 所見

| # | 重さ | 名（親を含めて） | 何が問題か | 根拠（file:line か JDG） | 読み違える場面 | 案 |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | 高 | `beginTaskActual.grabbedArea`（型 `GrabbedArea`） | 用語集と画面の語で Grab Area（掴み領域）は「面・線として掴む所（バーの本体・依存線・帯）」、バーの端は Grab Point（掴み点）。値 `barDummyStart`・`barDummyFinish`・`arrowDummyStart`・`arrowDummyFinish` はダミーの端で、用語集では Grab Point に当たる。名が用語集と逆を言う。JDG-3779 が拠った仕様書の型 `GrabArea` は表 T-266 の掴み代の行の集合で、用語集の Grab Area とは別の物 | 一覧:49・51、JDG-3779、`glossary-draft/glossary.json:7936`（grabPoint）・`:8016`（grabArea）、`10-screen-term-tree.md:62`・`:67`、`docs/spec/_assets/tbl-settings.md:354`（`GA-5` は「矩形のダミーの開始」） | 用語集を読んだ AI が「バーの本体をつかんだ」と読み、端の値を送らない。画面の Grab Area と命令の名が同じ語で別の物を指す | `grabbedPart`（方針の下書きの元の案、`agent-api-naming-policy-draft.md:32`）か `grabbedDummyPart`。型も合わせる |
| 2 | 高 | 型 `DelayDiagnosisReport`（`AgentDelayDiagnostics` の新しい名） | α の `AgentDelayDiagnostics` は外の型 `DelayDiagnosticsReport` を広げた型（修正案と修正の記録を足す）。JDG-3512 で外の型も `DelayDiagnosisReport` になるので、親の型と子の型が同じ名になる。一覧は外の型 `DelayDiagnosticsReport` に触れていない | 一覧:223、`docs/spec/_source/agent-api-members.json:1721`・`:1723`（`extends: DelayDiagnosticsReport`）、JDG-3512 | スキーマや型の定めで 2 つの `DelayDiagnosisReport` がぶつかる。AI は `fixProposals` を持つ方か持たない方か決められない | 答えの型を `DelayDiagnosisReportWithFixes` などにするか、中の型を別の名（例 `DelayDiagnosisFindings`）にする。どちらかを 1 行足して決める |
| 3 | 高 | `readDelayDiagnosis.parts` の値（＝答えの欄の名）`markerStates`・`walls`・`outcome` ほか | 13 の欄の名が一覧に 1 行も無く、レビューを通っていない。`markerStates` は JDG-3372 が禁じた語 Marker を使う（JDG-3742 は `progressStatusMark`）。`walls` は JDG-3473 が `diagnosisBlockers` に改めたのに問いの表に残る。`outcome` は P-9 の「答えの型の語尾 Outcome」と同じ語で別の物（診断の結論）を指す | 問い:1022、一覧:186（`readDelayDiagnostics.parts` だけを今のまま）、JDG-3372、JDG-3473、JDG-3742、方針:17 | `markerStates` を進捗ステータスマークの状態と読む。`outcome` を断りを含む答えと読む | 13 の名に行を立てる。`walls` → `diagnosisBlockers`（既決）、`markerStates` → `diagnosisMarkStates` など Mark の語、`outcome` → `diagnosisOutcome` など |
| 4 | 高 | 断りの理由 `mspdiImportCountAhead` | 大きすぎるのはタスクの `grs.importOrigin.mspdiImportCountWhenLastIncluded` で、文書の `mspdiImportCount` ではない。名の主語が逆の物を指す（P-10「何が・どうなった」の「何が」が違う） | 一覧:362、問い:1605、木:131（R107）・木:262（R238）、方針:18 | AI が文書の `mspdiImportCount` を直そうとする（書けない値なので詰まる） | `importOriginCountAhead` など、主語を `importOrigin` にする |
| 5 | 中 | `beginTaskActual.releasedPlace`（型 `ReleasedPlace`） | 同じ一覧が問 35-3 で `place` を「読みが 2 つ」（P-5）として退け、問 35-5 で `releasedPlace` を選ぶ。値は場所でなく 2 つの日時 `start`・`finish` | 一覧:29・50、JDG-3779、方針:13、`docs/spec/_assets/tbl-document-commands.md:47` | 座標か、離した先の物（タスクグループ）を送ろうとする | `releasedDateTimes`（中は `start`・`finish`）。少なくとも P-5 の例外として 1 行書く |
| 6 | 中 | 断りの理由 `endBeforeStart` | GRS JSON に end の語は無い（タスクは `start`・`finish`、箱は `firstDay`・`lastDay`）。兄弟の `slopeWithoutFinish` は finish を使い、`lastTaskGroupBeforeFirst` は first・last を使う。1 つの断りの族で 3 つの語が混ざる | 一覧:325・326・382、木:214・215（R190・R191）、木:350・351（R321・R322） | `end` というキーを探す。箱の日の逆さに `endBeforeStart` が来ると、何の start か分からない | `finishBeforeStart`（タスクと MSPDI の語）。箱の日はどのキーかを `field`・`jsonPointer` が言う |
| 7 | 中 | `readSearchRows.filters`・`readTableRows.filters`（値 `asShown`・`none`） | 引数は「人の掛けた列のフィルタを当てるか」の選び方で、フィルタそのものではない。GRS JSON では同じ語の `columnFilters[]` が `ColumnFilter` の並びを持つ。値 `asShown`・`none` も一覧に無い | 一覧:186、`docs/spec/_source/agent-api-members.json:392`・`:393`、木:467（R433）・木:429（R395） | AI が `filters: [{ "type": "values", "column": "progressStatus", … }]` を渡して `malformedRequest` で断られる | `filterMode`（値はそのまま）か、P-7 のフラグ `applyShownColumnFilters` |
| 8 | 中 | `readTableRows.table` の値 `delayDiagnosisReport`・`resourceList` と、`TableWindowName` の値 `delayDiagnosisReportWindow`・`resourceListWindow` | 同じ表を 2 つの綴りで呼ぶ。`ShownTasks.filteringTableWindows` が返す名をそのまま `readTableRows` へ渡すと通らない。また `delayDiagnosisReport`（表の値）は修正案と修正の記録を含まないのに、同じ語の型 `DelayDiagnosisReport` は含む | 一覧:155〜158・232・263、所見 2 | `readTableRows({ "table": "resourceListWindow" })` で断られる。`delayDiagnosisReport` の表に修正案も来ると思う | 値と窓の名の対応を 1 か所に書く。できれば `readTableRows.table` も窓の名で受け、修正案と記録は別の値のままにする |
| 9 | 中 | `readShownTasks`・型 `ShownTasks`・欄 `drawnTaskUids`・道具 `showOnlyTasks` | 1 つの物（日程表がいま描くタスク）を shown と drawn の 2 語で言う。GRS JSON の `showMode` の値 `shown` は「人が出すと選んだタスクグループ」で別の意味。`showOnlyTasks` が書くのは `checkedTaskUids`（JDG-3728 でチェックの語にそろえた）で、shown の語は α の `shownTaskUids` の名残 | 一覧:186・222・264、木:332・333（R303・R304）、木:466（R432）、JDG-3728、JDG-3736 | `readShownTasks` を「`showMode` が `shown` のタスクグループのタスク」と読む | 読む側を `readDrawnTasks`・`DrawnTasks` にそろえる（欄 `drawnTaskUids` と 1 語）。`showOnlyTasks` は画面の動作の名として残してよい |
| 10 | 中 | `ShownTasks.drawnTaskUids` を書かない（N-12） | 一覧は `null` をやめてキーを書かないとする。キーが無いことが「全部描いている」を言うので、無いことが意味を持つ（持ち主が JDG-3740 で退けた Null Trap）。空の並びを書かない決まりと重なると、絞っていないときの答えは `{}` になる | 一覧:264、問い:1278、JDG-3740 | キーが無いのを「何も描いていない」と読む | いつも書く真偽 `isScheduleFiltered`（P-7）を足し、`drawnTaskUids` はそれが真のときだけ書く |
| 11 | 中 | `SavedFile.savedTo`・`SavedFile.backedUpTo` | 値はファイルの絶対の所。同じ一覧が同じ種類の値を `Refusal.existingFilePath` と名付け、P-5 で `at`（前置詞）と `asked`（過去分詞だけ）を退けた。`savedTo` は過去分詞＋前置詞で、何の値かを言わない（JDG-3779 が認めたのは過去分詞＋名詞） | 一覧:264・373、方針:13、JDG-3774、JDG-3775、JDG-3779 | 保存先のフォルダか、保存した先の種類（ディスクか）と読む。2 つの答えで所の名がそろわない | `savedFilePath`・`backupFilePath` |
| 12 | 中 | `setTaskProgressStatus.progressStatus`（中に `state`） | 一覧は「表の列の値 `progressStatus` と同じ語」と書くが、列の値は状態の名 1 つ、命令の値は `state` と実績の日時を持つ物。また GRS JSON の Task に `progressStatus` のキーは無く（`actualStart`・`stop`・`resume`・`actualFinish` を書く）、P-4「引数は書くキーの名」を根拠にできない。`progressStatus.state` は status と state を重ねる（V-2） | 一覧:29・54、問い:622、木:434（R400）、JDG-3742、方針:12 | `"progressStatus": "finished"` と文字列で送る | 中の値を平らにする（`progressStatus` は状態の名、日時は兄弟の欄）か、`state` の名を見直す。規則の欄は P-4 でなく JDG-3461 だけにする |
| 13 | 中 | `editTask.set.startSlopeCalendarDays`・`finishSlopeCalendarDays` と `editDocumentSettings.set.scheduleCanvasElements.<名>` | GRS JSON では傾きは `tasks[].grs.startSlopeCalendarDays`。`editTask.set` は `grs` の段を落とし、`editDocumentSettings.set` と `editTaskGroup.set.style.color` は段を保つ。set がどの段を落とすかの決まりが無い | 一覧:52・53・105・135、木:230〜232（R206〜R208） | AI が `set: { "grs": { "startSlopeCalendarDays": 2 } }` を送るか、`set.scheduleCanvasElements` を落として送る | 「set は `grs` を除いた道で書く」などの 1 文を方針に足すか、`set.grs.…` にそろえる |
| 14 | 中 | `editTableWindow.set` の中のキー | 一覧は `isScheduleFilteredByChecks` だけに行を立て、同じ set の `checkedTaskUids`・`checkedResourceUids`・`isUnassignedChecked`・`columnSort`（CR-851 の対応表では `shownTaskUids`・`shownResourceUids`・`isUnassignedShown`・`sort`）に行が無い。set の中のキーを数える線が、最終レビューの改名だけになっている | 一覧:121、`studies/76-grs-json-beta-shape/commands-map.md:242`、木:466・468・471・472（R432・R434・R437・R438） | CR-851 の実装が一覧から当てると、前の段の改名が漏れる | 行を足すか、「set の中は GRS JSON β のキーのまま」と 1 行で書き、選んで並べた行は注に移す |
| 15 | 中 | `scheduleData.scheduleDataTimeZone` を書く命令 | 問い 35-2 は「どの命令が書くかは方針で決める」と残したが、一覧は `editProject` を今のままとしただけで、この値を書く命令の名が無い | 問い:546、一覧:22 | AI が `editProject.set.scheduleDataTimeZone` を送って断られる | 書く命令を決めて行を立てる（例 `editProject` の set に置くと書く、または `setScheduleDataTimeZone`） |
| 16 | 中 | 方針 P-9 の前半と `TableRow`・`TableColumn`・`TableCell`・`FixProposalRow`・`ChangeNotice` | P-9 は「欄の型は欄の名を PascalCase にした名」。欄 `rows`・`columns`・`cells` なら `Row`・`Column`・`Cell` になり、持ち主が JDG-3782 で退けた案 b と同じになる。一覧は 3 行の規則に P-9 を挙げるが、P-9 はこの選びを支えない。欄 `notice` の型 `ChangeNotice`、欄 `fixProposals` の型 `FixProposalRow` も P-9 に合わない | 方針:17、一覧:202〜204・152・153・264、JDG-3782 | 後で名を足す人が P-9 をそのまま当てて `Row`・`Column` を作る | P-9 の文を「欄の名の名詞を含み、物の語を頭に足してよい」などに直し、JDG-3782 を例に書く |
| 17 | 中 | `cause` の値 `canceled` | 規則に N-4（親の語を繰り返さない）を挙げるが、親のキーは `cause` で `import` ではない。兄弟の `openInProgress`・`documentInvalid` は「何が・どうなった」を言い、`canceled` だけ「何が」が無い（P-10） | 一覧:351、問い:1580、方針:18 | AI が「自分の呼び出しが取り消された」と読み、人に問わずにすぐ呼び直す | `canceledByUser`（P-11 の過去分詞＋By。GRS JSON の書き手の種類 `user` と同じ語） |
| 18 | 低 | 断りの理由 `confirmationInProgress` と答えの欄 `ImportOutcome.pendingQuestion` | 人に出した問いという同じ物を confirmation と question の 2 語で言う。取り込みの問い（例 `mergeChoice`）は確認でなく選択 | 一覧:238・291、`glossary-draft/glossary.json:14119` | `pendingQuestion` の後の書き込みの断りを、別の原因と読む | どちらかの語にそろえる（例 `questionInProgress`） |
| 19 | 低 | `zoomToFit`・出来事 `zoomToFitPressed` と P-11 | P-11 は「`To` は行き先だけ」と決めたが、`zoomToFit` の `To` は行き先でない。`By` には `shiftScheduleByMinutes` のために P-11 へ 1 行足した（JDG-3781）のに、`To` には足していない | 方針:19、一覧:127・128、JDG-3772、JDG-3781 | 後で P-11 を当てる人が `zoomToFit` を規則違反と見て直そうとする | P-11 に「画面の札から来た名（P-2）の前置詞は札のまま」と足す |
| 20 | 低 | `editTableWindow.set.isScheduleFilteredByChecks` と P-11 | P-11 の `By` は 3 つ（対応表・過去分詞＋By の「した者」・動詞＋By＋量）。`FilteredByChecks` は「道具・手段」の By で、どれにも当たらない（GRS JSON は JDG-3728 で確定） | 方針:19、一覧:121、JDG-3728 | P-11 どおり読むと「チェックが絞った（した者）」になる | P-11 に「過去分詞＋By＋手段」も書き足す |
| 21 | 低 | 断りの理由 `noFixProposalToApply` | 新しく選んだ名が否定の形。同じ「当てる物が無い」の兄弟 `historyEmpty` は肯定の形。持ち主は JDG-3740 で否定形を退けた | 一覧:154、問い:1671、JDG-3740 | 少ない（意味は通る） | `fixProposalsEmpty` など `historyEmpty` と同じ形 |
| 22 | 低 | `closeWindow.window` と `editTableWindow.tableWindow` | 同じ窓の名（`delayDiagnosisReportWindow`）を受ける引数が 2 つの名を持つ（P-4） | 一覧:119・177、方針:12 | 値の型が同じかを AI が確かめられない | `closeWindow.tableWindow`（型 `TableWindowName`）にそろえる |
| 23 | 低 | 数え方の文 | 「4 節の 7 名は変える名にも今のままの名にも入れていない」と書くが、上の行は 134 に 5 名、182 に 2 名を入れて数えた。数え直しでも入っている。また JDG-3781 の記録は「変える名 130」で一覧の 134 と違い、4 節を「7 行」と書くが表は 5 行 | 一覧:479・480・482・489、`docs/development-records/rulings.md:3931`（JDG-3781） | 読む人が 134 と 182 の中身を取り違える | 489 行を「入れた」に直し、130 との差を 1 文で書く |
| 24 | 低 | 型 `Document`（`readDocument` の答え・`ImportSource`） | GRS JSON の根の物の名は `ScheduleDocument`。一覧は `Document` に触れていない | `docs/spec/_source/agent-api-members.json:97`、`grs-json-beta.schema.json:11` | 2 つの名を別の物と思う | `ScheduleDocument` にそろえる |
| 25 | 低 | `watchChanges.watcher`・`ChangeNotice.watcher` | 値は書き手の名で、GRS JSON は同じ物を `lastEditedBy.name`・`changedBy.name`（型 `Editor`）で持つ。問いは関係を「刻印の書き手の名」と書くが、名がつながらない | 一覧:264、問い:1284、`grs-json-beta.schema.json:1842` | `watcher` に何を入れれば刻印の名と一致するか分からない | 説明で「`Editor.name` と同じ文字列」と書く（名は今のままでよい） |
| 26 | 低 | `CommandRefusal.field`（値 `set.finish`）と `documentFaults[].jsonPointer` | 誤りの所を言う欄が 2 つの名と 2 つの書き方（点の道と JSON Pointer）を持つ。set の中が入れ子になる（所見 13）と、点の道の読み方が決まっていない | 一覧:283・385、問い:1317 | `field` をキーの名 1 つと読み、`scheduleCanvasElements.isPlanBarVisible` を分けられない | `fieldPath` と書くか、命令の中の JSON Pointer（`/set/finish`）にそろえる |

## 一覧に出てこない名

数え方: α の原稿 2 つの名（メンバ・引数・返す型・値の型・欄・列挙の値・命令・命令のプロパティ）を取り出し、一覧の文に同じ綴りが 1 度も出ないものを数えた（スクリプトで照合）。CR-851 の対応表 `commands-map.md`・`commands-choices.md` が退く名として扱う物と、GRS JSON の木にあるキー（P-4 で決まる）は分けた。

**Agent API（`agent-api-members.json`。一覧に無い名 21。`string`・`Promise` などの言語の型は数えない。`parts` の値は説明の文から取った）**

- 欄 3: `AgentRefusal.target`（問いは `member` と書くが、改名の行が無い）、`AgentRefusal.stamp`（断りが返す今の刻印）、`AgentTableColumn.kind`（JDG-3564 で `valueType`。一覧に行が無い）。
- 型 5: `Document`（所見 24）、`DocumentStamp`、`DelayDiagnosticsReport`（所見 2）、`InvariantRow`・`CodecRefusalReason`（理由の値の行 ID を束ねる型。JDG-3285 の後の名が無い）。
- 列挙の値 2: `filters` の `asShown`・`none`（所見 7）。
- `readDelayDiagnosis.parts` の値と、いつも返す欄 11: `findings`・`bottlenecks`・`endTaskDelays`（α は `terminalPushOuts`）・`walls`・`markerStates`・`finishedDelayContributions`（α は `settledPushOuts`）・`derivedParentTasks`・`lateDays`・`outcome`・`statusDate`・`unreliableCount`（所見 3）。
- 綴りは一覧に出るが、その持ち主の行が無い 5: `readTableRows.word`・`readTableRows.filters`・`readTableRows.offset`・`readTableRows.limit`・`readSearchRows.offset`。

**文書の命令（`grs-commands.schema.json`）**

- 命令 93 のうち 62 は一覧に無いが、62 とも CR-851 の対応表が退く名か畳む先を書いている。漏れは 0。
- 命令の中の名 159 が一覧に無い。93 は対応表にあり、40 は GRS JSON の木のキーと値（P-4 で決まる）。残る 26 のうち、退く命令の中の名でもなく、まだ生きる値は次の 9:
  - `setTaskProgressStatus.progressStatus.state` の値 5: `notStarted`・`inProgress`・`suspendedWithResumeDate`・`suspendedWithoutResumeDate`・`finished`（一覧は `state` だけを今のままとし、値を並べない）。
  - `cycleTaskProgressStatus.removedActual.carriedActualDuration`（`grs-commands.schema.json:943`。JDG-3766 がスキーマから除いた語 carried を持つ）。
  - `replaceCalendarRules.exceptions[]` の `recurrenceKind`・`carryElements`（`grs-commands.schema.json:1645`。GRS JSON は `exceptions[].type` と `grs.passthrough`。P-4 で直るはずだが行が無い）。
  - `leaderShapeKind` の値 `calloutBox`・`polyline`（`grs-commands.schema.json:2018`。β の GRS JSON に引出し線の形のキーは無い。退くなら対応表に書く）。

## 確かめたが問題なし

- 数: 問い 45、表の行 148（後で足した 1 行を除く）、変える名 134（BGQA4 55・BGQA5 79）、今のままの名 182（58・124）、推しと違う所 31 行（11・19・1）。数え直して合った（数え方の文の食い違いは所見 23）。
- 「→ 3 節」と書いた 31 行は、どれも 3 節の表にある。
- P-6 略: 選んだ名に、許した略（`Uid`・`Id`・`Utc`・`Px`・`Url`・`dx`・`dy`・`min`・`max`・`defs`・`ja`・`en`）と形式の名（`Json`・`Mspdi`・`Svg`・`Png`・`Html`・`Tsv`）のほかの略は無い。
- P-7: 答えの真偽は `isAccepted`・`isScheduleDataUpdated`・`isEarlierWatchReplaced`・`isScrolled` で、どれも `is…`。AI が渡すフラグは `includePassthrough`・`overwrite`・`returnWholeSchema` で、どれも動詞で始まる。
- P-8: 個数は `taskRowCount`・`rowCount`、何番目かは `index`・`commandIndex`・`siblingIndex`。ページ送りの 3 語は JDG-3777 の例外どおり。
- P-10: 待てば通る 4 つと `openInProgress` が `…InProgress` にそろう。`pinLimitReached` と後で足した `uidLimitReached` が同じ形。
- P-11 の対応表: `taskGroupIdBySourceTaskUid`・`newTaskGroupIdBySourceTaskGroupId` は `<値>By<鍵>`。`refusedBy` は過去分詞＋By。
- 最終レビューの GRS JSON の改名（JDG-3728・3730〜3733・3736〜3738・3741・3742・3744・3745・3748・3753・3776）は、命令の引数・set のキー・断りの値へ当たっている（例外は所見 14 の前の段の改名）。JDG-3758 の `lastMspdiImport` は取り込みだけが書くので、命令の名は要らない。
- 画面の名: `zoomToFit`（Zoom to Fit）、`closePropertiesPanel`（Properties Panel）、`SearchWindowPage`（Search Window）、`applyFixProposals`・`fixProposals`（Fix Proposals）、`fixLog`・`FixLogRow`（Fix Log）は用語集の札と同じ語。`10-screen-term-tree.md` の Delay Diagnostics Report Window は JDG-3512 より古い記録で、一覧の `delayDiagnosisReportWindow` が新しい名。
- α の Agent API の断りの理由 14 の値は、どれも一覧に行がある。
- `TableRow.key` と `TableColumn.key` は同じ語で「表の中で見分ける名」を言い、セルの `column` は GRS JSON の `ColumnFilter.column` と同じ語でそろう。
