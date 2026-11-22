# 文書の命令と Agent API の名の決まり（案）

この 1 枚で、持ち主が、外に出る名（文書の命令と Agent API）の付け方の決まりを決めます。持ち主が決まりを決めたら、用語集を作る AI が全部の名をこの決まりで 1 度にそろえ、決まりを仕様書の JSON の命名の決まりに書きます（JDG-3652）。決まりで 1 つに絞れない名だけを、AI が持ち主に 1 問ずつ問います。

答え方: 各行の「答え」に ok か a・b を書いてください。「既決」の行は答えなくてよいです。「決まる問い」の番号は `13-glossary-queue.md` の問い（文書の命令 16 問・Agent API 29 問）の番号です。

| # | 決まり | 前 → 後（今の名で） | 出どころ | 決まる問い | 選ぶもの | 答え |
|:---|:---|:---|:---|:---|:---|:---|
| P-1 | 文書の命令と Agent API の名（道具・引数・答えの欄・断り・型）にも、GRS JSON の決まり N-1〜N-17 とその優先の順を当てる。 | `agentApiVersion` → `agentApiVersionUtc`（優先 5）、答えの `nextOffset: null` → キーを書かない（N-12）、列の `id` → `key`（N-6: `id` は UUID だけ） | JDG-3638・JDG-3410・JDG-3625 を広げる | 34-2-2・31-1-2・30-4 | 新しい決まり。ok を問う | |
| P-2 | 文書の命令は、判別子 `type` の中で平らな名を持つ。命令が画面の 1 つの操作と同じ働きをするとき、命令の名はイベント名から `Pressed`・`Requested` を除いた名にする。命令は対象を `type` で見分けるオブジェクトで受け、`null` を使わない。 | `fitScheduleToScreenOnPage` → `zoomToFit`（イベント `fitPressed` → `zoomToFitPressed`）、`"kind": "setProjectTitle"` → `"type": …` | 既決（JDG-3661・JDG-3672・JDG-3674・JDG-3564） | 37-2 | 当てる範囲を選ぶ。a（推奨）文書の命令だけに当てる。Agent API の道具は P-3 の「動詞＋目的語」で名付ける（画面の「上書きして修正」は保存もするので、道具と働きが違う） ／ b 画面と同じ働きの道具にも当てる | |
| P-3 | 名の頭の動詞は 1 語に 1 つの意味を持つ: `read…` は読むだけ、`set…` は値を 1 つ置く、`edit<実体>` は `set`・`clear` で書く、`create…`・`delete…` は作る・消す、`apply…` は文書に当てる、`export…` は書き出す。 | `issueDelayFixes` → `applyFixProposals`、`placeTaskPlanActual` → `setTaskProgressStatus` | JDG-3672（set）・JDG-3268（edit）・JDG-3690 | 34-1・35-3・32-8 | `apply` の意味を足す。ok を問う | |
| P-4 | 1 つの物は、GRS JSON・文書の命令・Agent API で 1 つの語を持つ。引数は、書くキーの名を持つ。値の形が違えば、名も変える。 | `includeCarry` → `includePassthrough`、`editTaskVisual` → `editTaskStyle`、`editTableView`（引数 `table`）→ `editTableWindow`（`tableWindow`）、`VisibilityTable` → `TableWindowName`、ラグの `unit` → `displayUnit` | 既決（JDG-3410・JDG-3684） | 33-1・36-6・37-1・30-2・30-4・36-3-2・34-1・31-2 | 既決 | — |
| P-5 | 名は、指す物か働きを言う。名は、代名詞（`which`）、前置詞（`from`・`at`）、たとえ（`landing`・`Landed`）、読みが 2 つある語（`Times`・`edge`・`typed`）、呼ぶ者の頭（`Agent`）を使わない。キーは過去分詞だけの語（`asked`）も使わない。 | `which` → `part`、`from` → `refusedBy`、`landing` → `placement`、`shiftScheduleTimes` → `shiftScheduleByMinutes`、`predecessorEdge` → `predecessorSide`、`path` → `existingFilePath` | 既決（N-2・JDG-820・JDG-3690）。過去分詞の 1 文だけが足し | 35-1・35-4・35-6・36-1・33-2・33-2-2・31-2・33-4・30-1・31-1・32-9 | 過去分詞の足しに ok を問う | |
| P-6 | 略は、N-2 の許す 9 つ（`uid`・`id`・`Px`・`Utc`・`dx`・`dy`・`min`・`max`・`hex`）と、外の決まりが決める名（`$defs` の `defs`、言語の札 `ja`・`en`）だけにする。 | `waitMs` → `waitMilliseconds` | JDG-3643・JDG-3638（優先 1） | 32-10 | a（推奨）Web の語 `Url` を許す略に足す（`pageUrl`・`converterUrl` のまま） ／ b 足さない（`pageAddress`・`converterPageAddress`） | |
| P-7 | 答えと値の真偽のキーは `is…` で始める。 | `ok` → `isAccepted`、`hasUpdatedSchedule` → `isScheduleDataUpdated`、`hasReplacedEarlierWatch` → `isEarlierWatchReplaced` | N-9（優先 13）を広げる | 30-5 | a（推奨）呼ぶ側が渡す旗は動詞で始めてよい（`includePassthrough`・`overwrite` のまま） ／ b 旗も `is…` で始める（`isOverwriteAllowed`） | |
| P-8 | 単位の無い数は、何を数えるかで終える: 個数は `…Count`、1 から振る順は `…Order`、0 から数える位置は `…Index`、木の深さは `…Depth`。 | `deleteDependencyAt` の `order` → `index`、`total` → `rowCount`、`taskTotal` → `taskRowCount` | JDG-3650 ②に `…Index` を足す（`commandIndex` と同じ語） | 36-2・30-5・34-2 | a（推奨）頁送りの通り名 `offset`・`nextOffset`・`limit` は残す ／ b `startIndex`・`nextStartIndex`・`maxRowCount` に改める | |
| P-9 | 1 つの欄が入れる型は、欄の名を PascalCase にした名を持つ。値か断りのどちらかを返す答えの型は、名を `…Outcome` で終える。 | `AgentRefusal`・`Refusal` → `Refusal`・`CommandRefusal`、`AgentExport` → `ExportOutcome`、`AgentWatch` → `WatchOutcome` | N-1・JDG-820・JDG-3689 | 30-1・31-1・33-3 | 新しい決まり。ok を問う | |
| P-10 | 断りの理由の名は「何が・どうなった」を言う。呼ぶ側の直し方が同じ断りは、物によらず 1 つの名を持ち、欄がどの物かを言う。直し方が違えば、名に物を入れる。文書の検査と命令の検査は同じ名を使う。待てば通る断りは、名を `…InProgress` で終える。 | `unknownTask` → `notFound`（欄 `missingTaskUids`）、`gestureInFlight` → `dragInProgress`、`wouldMakeCycle` → `taskGroupParentCycle`、`limitReached` → `pinLimitReached` | JDG-3285・JDG-3690・P-4 | 32-1・32-2・32-2-2・32-3・32-4・32-5・32-6・32-7・32-8・32-9・32-10 | a（推奨）上のとおり ／ b どの理由も名に物を入れる（`taskNotFound`・`settingOutOfRange`） | |
| P-11 | 鍵から値への対応表（オブジェクト）は、名を `<値>By<鍵>` にする。 | `taskGroupIdOf` → `taskGroupIdBySourceTaskUid`、`newTaskGroupIds` → `newTaskGroupIdBySourceTaskGroupId` | N-5（参照は相手の名＋`Uid`・`Id`）を広げる | 35-4 | a（推奨）`<値>By<鍵>` ／ b `<鍵>To<値>`（`sourceTaskUidToTaskGroupId`） | |
| P-12 | 名が P-1〜P-11 に合うとき、AI は今の名を変えない。 | `deleteDependencyAt`・`receive`・`createTaskGroup` は今のまま | JDG-3695（名を 1 度にそろえる） | 35-2・35-5（2 行を除く）・36-3・36-4・36-5・36-7・34-2・30-4-2・30-5・32-10 | 新しい決まり。ok を問う | |

注: `grs-commands.schema.json` は、命令の判別子に今も `kind` を使います（190 か所）。`agent-api-members.json` も欄 `kind`（`property`・`method`）を使います。どちらも JDG-3564 に反するので、AI はそろえるときに `type` と `memberType` に改めます。

## 方針で決まらない問い

- 問 30-3: 取り込みで出した問いの欄 `asked`。P-5 がこの名を改めるが、`pendingQuestion`（推奨。答えを待つ問いを言う）と `askedQuestion` の 2 つが決まりに合う。
- 問 31-2-2: 文書の誤りの所の欄 `at`。P-5 がこの名を改めるが、`pointer`（推奨。短い）と `jsonPointer` の 2 つが決まりに合う。
- 問 35-5 の 2 行: 実績ダミーの引数 `grabbed`・`released`。P-5 がこの名を改めるが、決まりは新しい名を 1 つに決めない。案は `grabbedPart`・`releasePosition`。

## 数

- 問いは 45（文書の命令 16・Agent API 29）。
- 方針が決める問いは 42（文書の命令 15・Agent API 27）。
- 残る問いは 3（上の 3 問）。AI が持ち主に 1 問ずつ問う。
- 持ち主が a・b を選ぶ行は 6（P-2・P-6・P-7・P-8・P-10・P-11）。ok を問う行は 5（P-1・P-3・P-5・P-9・P-12）。既決の行は 1（P-4）。
