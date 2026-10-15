# `DocumentCommand` の全数 — 表 T-108

**UID**: DOC-TBL-DOCUMENT-COMMANDS
**Version**: 0.1

> ⛔ 本書は生成物である。  
> 手で直さない —— 直しても次の `npm run gen` で消える。
> **文書を書き換える命令と、命令ごとに運ぶ値の唯一の正は `_source/document-commands.json` である。**  
> 本書はそれを `_source/document_commands_json_to_md.py` が印字したものである。
> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。

**本表は `applyDocumentChange` が受け取る命令の全数である**（表 T-064 の `PI-8`）。  
⭐ **命令が運ぶ値（名・型・意味）は本表が持つ** —— 文書の列を書く値は、その列（表 T-058 の `AT-` の行、見せ方の群は 表 T-202 ・表 T-203 の `S-` の行）を指し、型と上下限はその行に従う。  
境界値は Chapter 6.1 が持つ。  
コードの命令の型と、`Agent API` の `applyCommands`（表 T-107 の `AM-7`）が受ける形は本表の原稿から生成し、手で書かない。  
従う規則は「正」の列が指す要求が持つ。

⚠️ `組` の欄が ⭐ の行は、複数の列にまたがる MUST を 1 つの命令へ畳んだものである。  
畳むのは**その MUST の持ち主を作るため**であり、`AG-9a` が拒むときに何を指しているかがこれで決まる。  
⚠️ **原子性のためではない** —— 束の単位で原子的に適用することは 表 T-035 の `AG-3` が既に定めている。

「運ぶ値」の欄は 1 行に 1 つの値を書く —— 「鍵」は命令が働く行を名指す値、「を書く」はその列へ書く値である。  
列を指さない値だけが型を書く。  
形（`AnnotationAnchor` など）を運ぶ値は、その形の欄を下に字下げして並べる。

**表 T-108 — `DocumentCommand` の全数**

| 行 ID | 群 | 確定名 | 組 | 運ぶ値 | 何を担うか | 正 |
| --- | --- | --- | --- | --- | --- | --- |
| CM-1 | `Project` | `setProjectTitle` | — | `title`: `Project.title`（`AT-3`）を書く | 文書名を変える | `FR-035` |
| CM-2 | `Project` | `setProjectProfile` | — | `fields`: `ProjectProfileFields` —— 直す基本情報（持つ欄だけを書き、持たない欄は今のまま）<br>　　`name`: `Project.name`（`AT-2`）を書く（省いてよい）<br>　　`subject`: `Project.subject`（`AT-4`）を書く（省いてよい）<br>　　`category`: `Project.category`（`AT-5`）を書く（省いてよい）<br>　　`company`: `Project.company`（`AT-6`）を書く（省いてよい）<br>　　`manager`: `Project.manager`（`AT-7`）を書く（省いてよい）<br>　　`author`: `Project.author`（`AT-8`）を書く（省いてよい）<br>　　`revision`: `Project.revision`（`AT-10`）を書く（省いてよい）<br>　　`startDate`: `Project.startDate`（`AT-12`）を書く（省いてよい） | 基本情報を直す | `FR-074` |
| CM-3 | `Project` | `setStatusDate` | — | `date`: `Project.statusDate`（`AT-13`）を書く（`null` は受けない） | 基準日を置く・動かす | `FR-046` |
| CM-4 | `Project` | `clearStatusDate` | — | — | 基準日を消す | `FR-046` |
| CM-5 | `Project` | `setThemeHue` | — | `hue`: `Project.themeHue`（`AT-19`）を書く | テーマ色を変える | `FR-041` |
| CM-87 | `Project` | `setParentProgressToleranceDays` | — | `workingDays`: `Project.parentProgressToleranceDays`（`AT-156`）を書く | 親タスクの進捗の疑義が許す日数を変える | `FR-131` |
| CM-94 | `Project` | `setScheduleDataTimeZone` | — | `timeZone`: `Project.scheduleDataTimeZone`（`AT-157`）を書く | 日程データのタイムゾーンを付け替える（換算しない —— 保存の数字は変えず、見せる基準を戻す `CM-95` と 1 回の書き込みにする） | `FR-156` |
| CM-98 | `Project` | `shiftScheduleTimes` | ⭐ | `minutes`: `integer` —— ずらす量（分、正は後へ、負は前へ） | 日程の日時を一斉にずらす（書き換える列と書き換えない列は `01-04-requirements.md` の 表 T-377 —— 1 回の書き込みとする）。<br>`Agent API` から受けたときは確認の面を経ない（`FR-076` の作法） | `FR-157` |
| CM-99 | `Project` | `shiftScheduleToStartDate` | ⭐ | `newStartDate`: `string` —— 新しい開始日（日付の文字列） | 日程全体を新しい開始日へ稼働日で移す（動かす列・動かさないもの・移し方は `01-04-requirements.md` の 表 T-379 —— 1 回の書き込みとする）。<br>`Agent API` からの命令は、問わずにそのまま当てる（`CM-98` と同じ扱い） | `FR-159` |
| CM-6 | `Task` | `createTask` | ⭐ | `shapeKind`: `TaskVisual.shapeKind`（`AT-100`）を書く（`null` は受けない）<br>`start`: `Task.start`（`AT-28`）を書く（`null` は受けない）<br>`finish`: `Task.finish`（`AT-29`）を書く（`null` は受けない）<br>`taskGroupId`: `TaskGroupMember.taskGroupId`（`AT-61`）を書く —— タスクを載せるタスクグループ | タスクを作る | `FR-001` |
| CM-7 | `Task` | `deleteTask` | — | `uid`: 鍵（`Task.uid`、`AT-24`） | タスクを消す | `FR-032` |
| CM-8 | `Task` | `pasteTasks` | ⭐ | `sourceUids`: 鍵の並び（`Task.uid`、`AT-24`） —— 複製元の `Task`（1 つ以上）<br>`landing`: `PasteLanding`（省いてよい） —— `Ctrl` ドラッグのコピーだけが運ぶ載せ方（`FR-033` の 表 T-308 の `CY-5` ・ `CY-6`）<br>　　`shiftMinutes`: `integer` —— コピーをずらす量（分、符号付き、本体の動きと同じ刻み —— `CY-5`）<br>　　`taskGroupIdOf`: `integer` から `string` への対応 —— 複製元の `Task.uid` から、そのコピーを載せるタスクグループの `id` へ（`CY-6`） | 選んだ `Task` を複製する —— 運ばない子孫タスクはコピーしない（`01-04-requirements.md` の 表 T-223 の `DU-1`）。<br>`Ctrl` ドラッグのコピーは載せ方も運ぶ（`FR-033` の 表 T-308 の `CY-5` ・ `CY-6`） | `FR-033` |
| CM-9 | `Task` | `setTaskName` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`name`: `Task.name`（`AT-27`）を書く | 名称を変える | `FR-091` |
| CM-10 | `Task` | `setTaskNotes` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`notes`: `Task.notes`（`AT-32`）を書く | 備考を置く | `FR-006` |
| CM-11 | `Task` | `setTaskPlanDates` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`start`: `Task.start`（`AT-28`）を書く（`null` は受けない）<br>`finish`: `Task.finish`（`AT-29`）を書く（`null` は受けない） | 予定の開始・終了を置く | `FR-012` |
| CM-12 | `Task` | `setTaskDeadline` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`deadline`: `Task.deadline`（`AT-31`）を書く | 期限を置く | `FR-006` |
| CM-13 | `Task` | `setTaskPlanActualState` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`place`: `PlanActualPlacement` —— 置く予実（表 T-019 の行と、その行が値を持つ列）<br>　　`row` が `'PA-1'`<br>　　`row` が `'PA-2'`:<br>　　　　`actualStart`: `Task.actualStart`（`AT-34`）を書く（`null` は受けない）<br>　　　　`stop`: `Task.stop`（`AT-141`）を書く（`null` は受けない）<br>　　`row` が `'PA-3'`:<br>　　　　`actualStart`: `Task.actualStart`（`AT-34`）を書く（`null` は受けない）<br>　　　　`stop`: `Task.stop`（`AT-141`）を書く（`null` は受けない）<br>　　　　`resume`: `Task.resume`（`AT-37`）を書く（`null` は受けない）<br>　　`row` が `'PA-4'`:<br>　　　　`actualStart`: `Task.actualStart`（`AT-34`）を書く（`null` は受けない）<br>　　　　`stop`: `Task.stop`（`AT-141`）を書く（`null` は受けない）<br>　　`row` が `'PA-5'`:<br>　　　　`actualStart`: `Task.actualStart`（`AT-34`）を書く（`null` は受けない）<br>　　　　`actualFinish`: `Task.actualFinish`（`AT-36`）を書く（`null` は受けない） | 予実の 5 列を置く | `FR-010` |
| CM-14 | `Task` | `beginTaskActual` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`grabbed`: `'GA-5'` ・ `'GA-6'` ・ `'GA-17'` ・ `'GA-21'` ・ `'GA-22'` のどれか —— 掴んだ掴み代（表 T-266 の行）<br>`released`: `ReleasedPlace` —— 離した所の、両側で読んだ位置（`FR-103`、表 T-378）<br>　　`start`: `string` —— 離した所の開始の側で読んだ日時<br>　　`finish`: `string` —— 離した所の終了の側で読んだ日時<br>`snapMinutes`: `integer` —— 離したときの刻み（分）で、ダミーの実績の長さを決める（`FR-011`、表 T-378） | 実績を置き始める | `FR-043` |
| CM-15 | `Task` | `cycleTaskPlanActualState` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`remembered`: `RememberedActual` か `null` —— 外して覚えた実績（`ScreenState` が渡す）<br>　　`actualStart`: `Task.actualStart`（`AT-34`）を書く<br>　　`actualFinish`: `Task.actualFinish`（`AT-36`）を書く<br>　　`stop`: `Task.stop`（`AT-141`）を書く<br>　　`carriedActualDuration`: `string` か `null` —— 持ち回りの `ActualDuration`（`G-13`）<br>`snapMinutes`: `integer`（省いてよい） —— 押したときの刻み（分、表 T-378）で、省けば日の刻み | 予実の状態を、表 T-021a の輪に沿って 1 つ進める。<br>中断から未着手へ戻すときに外した実績は `ScreenState` が覚え、本命令はそこから受け取る | `FR-013` |
| CM-16 | `Task` | `setTaskFadeInDays` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`days`: `Task.fadeInDays`（`AT-40`）を書く | フェードイン日数を置く | `FR-075` |
| CM-17 | `Task` | `setTaskFadeOutDays` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`days`: `Task.fadeOutDays`（`AT-41`）を書く | フェードアウト日数を置く | `FR-075` |
| CM-18 | `Task` | `setTaskParentTask` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`parentUid`: `Task.parentTaskUid`（`AT-25`）を書く | 親タスクを移す | `FR-005` |
| CM-19 | `Task` | `moveTaskToTaskGroup` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`taskGroupId`: `TaskGroupMember.taskGroupId`（`AT-61`）を書く | 別のタスクグループへ載せ替える | `FR-005` |
| CM-20 | `TaskVisual` | `setTaskVisualShapeKind` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`shapeKind`: `TaskVisual.shapeKind`（`AT-100`）を書く（`null` は受けない） | タスク形状を変える | `FR-083` |
| CM-21 | `TaskVisual` | `setTaskVisualMilestoneGlyph` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`glyph`: `TaskVisual.milestoneGlyph`（`AT-101`）を書く | マイルストーン形状を変える | `FR-078` |
| CM-22 | `TaskVisual` | `setTaskVisualColors` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`fillColor`: `TaskVisual.fillColor`（`AT-102`）を書く<br>`strokeColor`: `TaskVisual.strokeColor`（`AT-103`）を書く | 線色と塗り色を置く | `FR-007` |
| CM-23 | `TaskVisual` | `resetTaskVisualColors` | ⭐ | `uid`: 鍵（`Task.uid`、`AT-24`） | 色をテーマ追随へ戻す | `FR-007` |
| CM-24 | `TaskVisual` | `setTaskVisualStrokeWidthPx` | — | `uid`: 鍵（`Task.uid`、`AT-24`）<br>`strokeWidthPx`: `TaskVisual.strokeWidthPx`（`AT-104`）を書く | 線の太さを置く | `FR-007` |
| CM-26 | `TaskGroup` | `createTaskGroup` | ⭐ | `id`: `TaskGroup.id`（`AT-51`）を書く<br>`parentId`: `TaskGroup.parentId`（`AT-52`）を書く<br>`label`: `TaskGroup.name`（`AT-53`）を書く<br>`derivedFromTaskUid`: `TaskGroup.derivedFromTaskUid`（`AT-54`）を書く<br>`order`: `TaskGroup.order`（`AT-55`）を書く | タスクグループを作る | `FR-085` |
| CM-27 | `TaskGroup` | `deleteTaskGroup` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`newTaskGroupId`: `string` —— 新しいタスクグループの `id`（⚠️ いまの編集はこの値を読まない） | タスクグループを消す | `FR-032` |
| CM-28 | `TaskGroup` | `pasteTaskGroupSubtree` | ⭐ | `sourceTaskGroupId`: 鍵（`TaskGroup.id`、`AT-51`） —— 複製する部分木の根<br>`targetTaskGroupId`: `TaskGroup.parentId`（`AT-52`）を書く —— 写しの根を載せる親<br>`newTaskGroupIds`: `string` から `string` への対応 —— 複製元の `TaskGroup.id` から、その写しの `id` へ | タスクグループの部分木を複製する | `FR-033` |
| CM-29 | `TaskGroup` | `setTaskGroupName` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`label`: `TaskGroup.name`（`AT-53`）を書く | タスクグループ名を変える | `FR-085` |
| CM-30 | `TaskGroup` | `setTaskGroupColor` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`color`: `TaskGroup.color`（`AT-58`）を書く（`null` は受けない） | タスクグループの色を置く | `FR-042` |
| CM-31 | `TaskGroup` | `resetTaskGroupColor` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`） | タスクグループの色をテーマ追随へ戻す | `FR-007` |
| CM-32 | `TaskGroup` | `setTaskGroupMinHeightPx` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`minHeight`: `TaskGroup.minHeightPx`（`AT-59`）を書く | タスクグループの最小の高さを置く | `FR-042` |
| CM-35 | `TaskGroup` | `reorderTaskGroupSiblings` | ⭐ | `parentId`: 鍵（`TaskGroup.parentId`、`AT-52`） —— 並べ直す兄弟の親（`null` は根の段）<br>`orderedIds`: 鍵の並び（`TaskGroup.id`、`AT-51`） —— 兄弟の新しい並び（この順が `order`（`AT-55`）になる） | 兄弟の並びを変える | `FR-005` |
| CM-36 | `Dependency` | `createDependency` | ⭐ | `predecessorUid`: `Dependency.predecessorUid`（`AT-45`）を書く<br>`successorUid`: 鍵（`Task.uid`、`AT-24`） —— 線を持つ後続の `Task`<br>`predecessorEdge`: `'start'` ・ `'finish'` のどれか —— 先行の端（2 つの端の組が `linkType`（`AT-46`）を決める）<br>`successorEdge`: `'start'` ・ `'finish'` のどれか —— 後続の端 | 依存線を引く | `FR-009` |
| CM-37 | `Dependency` | `deleteDependency` | — | `predecessorUid`: 鍵（`Dependency.predecessorUid`、`AT-45`）<br>`successorUid`: 鍵（`Task.uid`、`AT-24`） —— 線を持つ後続の `Task` | 依存線を消す（先行と後続の組で名指し、その向きの線をすべて —— 1 本だけは `CM-93`） | `FR-032` |
| CM-93 | `Dependency` | `deleteDependencyAt` | — | `predecessorUid`: 鍵（`Dependency.predecessorUid`、`AT-45`）<br>`successorUid`: 鍵（`Task.uid`、`AT-24`） —— 線を持つ後続の `Task`<br>`order`: `integer` —— 同じ向きの線のうち何本目か（後続の依存の並び `AT-42` の中の順、0 が最初） | 同じ向きの線のうち 1 本を、後続と先行と、後続の依存の並び（`_assets/fig-erd-detail.md` の `AT-42`）の中の順とで名指して除く。<br>その線が無ければ断る —— 同じ向きの線は線ごとの名を持たず、並びの中の順でしか名指せない | `FR-155` |
| CM-38 | `Dependency` | `setDependencyLag` | ⭐ | `predecessorUid`: 鍵（`Dependency.predecessorUid`、`AT-45`）<br>`successorUid`: 鍵（`Task.uid`、`AT-24`） —— 線を持つ後続の `Task`<br>次の形のどちらか —— ラグ<br>　　`WorkingDayLag`:<br>　　　　`lagWorkingDays`: `integer` —— ラグ（稼働日）で、`linkLag`（`AT-47`）と `lagFormat`（`AT-48`）へ換えて書く<br>　　`TypedLag`:<br>　　　　`lagMinutes`: `integer` —— ラグ（分）で、`linkLag`（`AT-47`）へ換えて書く<br>　　　　`lagUnit`: `'d'` ・ `'h'` ・ `'m'` のどれか —— 見せる単位で、`lagFormat`（`AT-48`）を決める | ラグを変える | `FR-009` |
| CM-39 | `Calendar` | `setCalendar` | ⭐ | `workingDayTypes`: `WeekDay.dayType`（`AT-73`）の並びを書く（`null` は受けない、省いてよい） —— 稼働する曜日の `dayType`（1 が日曜）で、載らない曜日は休み<br>`weekStartDay`: `Project.weekStartDay`（`AT-17`）を書く（省いてよい）<br>`exceptions`: `Calendar.exceptions`（`AT-71`）を書く（省いてよい） —— 編集の後の例外日の全部（表 T-344 の `WC-4` 〜 `WC-6`）<br>`workingTimes`: `WeekDay.workingTimes` ／ `Exception.workingTimes`（`AT-158` ／ `AT-159`）を書く（省いてよい） —— 稼働日の時間帯の 1 組（どの曜日と例外日に書くかは `FR-088` の `WC-8`） | 暦（稼働する曜日・稼働日の時間帯の 1 組・例外日）と週の始まりを直す。<br>時間帯の 1 組をどの曜日と例外日に書くかは `01-04-requirements.md` の `FR-088` が持つ。<br>既定の暦のままなら、暦を 1 つ作ってから直す。<br>例外日の `fromDate` ／ `toDate` の時刻は、本命令を受けて文書へ書く側が揃える —— 規則は `01-04-requirements.md` の `FR-057` の 表 T-350 の前文が持つ | `FR-088` |
| CM-40 | `Resource` | `createResource` | — | `name`: `Resource.name`（`AT-86`）を書く | 担当を足す | `FR-008` |
| CM-41 | `Resource` | `setResourceName` | — | `uid`: 鍵（`Resource.uid`、`AT-85`）<br>`name`: `Resource.name`（`AT-86`）を書く | 担当の名前を変える | `FR-008` |
| CM-42 | `Resource` | `deleteResource` | — | `uids`: 鍵の並び（`Resource.uid`、`AT-85`） —— 消す担当 | 選んだ担当を消す | `FR-099` |
| CM-43 | `Resource` | `deleteUnreferencedResources` | — | — | 未参照をまとめて消す | `FR-099` |
| CM-44 | `Assignment` | `createAssignment` | — | `taskUid`: `Assignment.taskUid`（`AT-93`）を書く（`null` は受けない）<br>`resourceUid`: `Assignment.resourceUid`（`AT-94`）を書く（`null` は受けない） | 担当を就ける | `FR-008` |
| CM-45 | `Assignment` | `deleteAssignment` | — | `taskUid`: 鍵（`Assignment.taskUid`、`AT-93`）（`null` は受けない）<br>`resourceUid`: 鍵（`Assignment.resourceUid`、`AT-94`）（`null` は受けない） | 割当を解く | `FR-008` |
| CM-46 | `CommentBox` | `createCommentBox` | — | `id`: `CommentBox.id`（`AT-110`）を書く<br>`anchor`: `AnnotationAnchor` —— 留め先 —— 省いた鍵は `null` として書き、吸着した対象（`taskUid` と `taskFigure` の組か `highlightBoxId`）と `snapPoint` は、吸着したときだけ揃えて持つ（`FR-019`）<br>　　`date`: `CommentBox.anchorDate`（`AT-113`）を書く（`null` は受けない）<br>　　`taskGroupId`: `CommentBox.anchorTaskGroupId`（`AT-114`）を書く（`null` は受けない）<br>　　`bandFraction`: `CommentBox.anchorBandFraction`（`AT-163`）を書く（省いてよい）<br>　　`taskUid`: `CommentBox.anchorTaskUid`（`AT-164`）を書く（省いてよい）<br>　　`taskFigure`: `CommentBox.anchorTaskFigure`（`AT-165`）を書く（省いてよい）<br>　　`highlightBoxId`: `CommentBox.anchorHighlightBoxId`（`AT-166`）を書く（省いてよい）<br>　　`snapPoint`: `CommentBox.anchorSnapPoint`（`AT-167`）を書く（省いてよい） | コメントボックスを置く | `FR-019` |
| CM-47 | `CommentBox` | `deleteCommentBox` | — | `id`: 鍵（`CommentBox.id`、`AT-110`） | コメントボックスを消す | `FR-032` |
| CM-48 | `CommentBox` | `setCommentBoxText` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`text`: `CommentBox.text`（`AT-112`）を書く | 本文を書く | `FR-097` |
| CM-49 | `CommentBox` | `setCommentBoxLeaderShapeKind` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`leaderShapeKind`: `CommentBox.leaderShapeKind`（`AT-111`）を書く（`null` は受けない） | 引出し線の形を選ぶ | `FR-019` |
| CM-50 | `CommentBox` | `setCommentBoxAnchor` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`anchor`: `AnnotationAnchor` —— 新しい留め先 —— 省いた鍵は `null` として書き、吸着した対象（`taskUid` と `taskFigure` の組か `highlightBoxId`）と `snapPoint` は、吸着したときだけ揃えて持つ（`FR-019`）<br>　　`date`: `CommentBox.anchorDate`（`AT-113`）を書く（`null` は受けない）<br>　　`taskGroupId`: `CommentBox.anchorTaskGroupId`（`AT-114`）を書く（`null` は受けない）<br>　　`bandFraction`: `CommentBox.anchorBandFraction`（`AT-163`）を書く（省いてよい）<br>　　`taskUid`: `CommentBox.anchorTaskUid`（`AT-164`）を書く（省いてよい）<br>　　`taskFigure`: `CommentBox.anchorTaskFigure`（`AT-165`）を書く（省いてよい）<br>　　`highlightBoxId`: `CommentBox.anchorHighlightBoxId`（`AT-166`）を書く（省いてよい）<br>　　`snapPoint`: `CommentBox.anchorSnapPoint`（`AT-167`）を書く（省いてよい） | 留め先を変える | `FR-016` |
| CM-51 | `CommentBox` | `setCommentBoxBodyOffsetPx` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`dx`: `number` で `CommentBox.bodyOffsetPx`（`AT-115`）を書く —— 本文のずれの横（px）<br>`dy`: `number` で `CommentBox.bodyOffsetPx`（`AT-115`）を書く —— 本文のずれの縦（px） | 本文のずれを変える | `FR-016` |
| CM-80 | `CommentBox` | `setCommentBoxStrokeColor` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`strokeColor`: `CommentBox.strokeColor`（`AT-148`）を書く | 枠と引出し線の色を置く | `FR-019` |
| CM-81 | `CommentBox` | `setCommentBoxStrokeWidthPx` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`strokeWidthPx`: `CommentBox.strokeWidthPx`（`AT-149`）を書く | 枠と引出し線の太さを置く | `FR-019` |
| CM-82 | `CommentBox` | `setCommentBoxFillColor` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`fillColor`: `CommentBox.fillColor`（`AT-150`）を書く | 本文の箱の塗りの色を置く | `FR-019` |
| CM-83 | `CommentBox` | `setCommentBoxFillTransparencyPercent` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`fillTransparencyPercent`: `CommentBox.fillTransparencyPercent`（`AT-151`）を書く | 本文の箱の塗りの透過率を置く | `FR-019` |
| CM-84 | `CommentBox` | `setCommentBoxTextColor` | — | `id`: 鍵（`CommentBox.id`、`AT-110`）<br>`textColor`: `CommentBox.textColor`（`AT-152`）を書く | 本文の字の色を置く | `FR-019` |
| CM-52 | `HighlightBox` | `createHighlightBox` | — | `id`: `HighlightBox.id`（`AT-116`）を書く<br>`range`: `HighlightRange` —— 囲む範囲<br>　　`startDate`: `HighlightBox.start`（`AT-117`）を書く（`null` は受けない）<br>　　`endDate`: `HighlightBox.finish`（`AT-118`）を書く（`null` は受けない）<br>　　`topTaskGroupId`: `HighlightBox.topTaskGroupId`（`AT-119`）を書く（`null` は受けない）<br>　　`bottomTaskGroupId`: `HighlightBox.bottomTaskGroupId`（`AT-120`）を書く（`null` は受けない） | ハイライトボックスを置く | `FR-019` |
| CM-53 | `HighlightBox` | `deleteHighlightBox` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`） | ハイライトボックスを消す | `FR-032` |
| CM-54 | `HighlightBox` | `setHighlightBoxRange` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`）<br>`range`: `HighlightRange` —— 新しく囲む範囲<br>　　`startDate`: `HighlightBox.start`（`AT-117`）を書く（`null` は受けない）<br>　　`endDate`: `HighlightBox.finish`（`AT-118`）を書く（`null` は受けない）<br>　　`topTaskGroupId`: `HighlightBox.topTaskGroupId`（`AT-119`）を書く（`null` は受けない）<br>　　`bottomTaskGroupId`: `HighlightBox.bottomTaskGroupId`（`AT-120`）を書く（`null` は受けない） | 囲む範囲を変える | `FR-016` |
| CM-55 | `HighlightBox` | `setHighlightBoxStrokeColor` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`）<br>`strokeColor`: `HighlightBox.strokeColor`（`AT-121`）を書く | 枠の色を置く | `FR-019` |
| CM-77 | `HighlightBox` | `setHighlightBoxStrokeWidthPx` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`）<br>`strokeWidthPx`: `HighlightBox.strokeWidthPx`（`AT-145`）を書く | 枠の線の太さを置く | `FR-019` |
| CM-78 | `HighlightBox` | `setHighlightBoxFillColor` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`）<br>`fillColor`: `HighlightBox.fillColor`（`AT-146`）を書く | 塗りの色を置く | `FR-019` |
| CM-79 | `HighlightBox` | `setHighlightBoxFillTransparencyPercent` | — | `id`: 鍵（`HighlightBox.id`、`AT-116`）<br>`fillTransparencyPercent`: `HighlightBox.fillTransparencyPercent`（`AT-147`）を書く | 塗りの透過率を置く | `FR-019` |
| CM-56 | 見せ方の群 | `setStackDirection` | — | `direction`: `stackDirection`（`S-58`）を書く | 積む向きを選ぶ | `FR-003` |
| CM-58 | 見せ方の群 | `setElementVisible` | — | `element`: `isBaselineVisible`（`S-69`） ・ `isPlanVisible`（`S-227`） ・ `isActualVisible`（`S-228`） ・ `isProgressLineVisible`（`S-64`） ・ `isProgressMarkerVisible`（`S-63`） ・ `isDateGridLinesVisible`（`S-67`） ・ `isGroupGridLinesVisible`（`S-68`） ・ `isAssigneeVisible`（`S-60`） ・ `isPercentCompleteVisible`（`S-61`） ・ `isDependencyVisible`（`S-62`） ・ `isPlanDatesVisible`（`S-232`） のどれか —— 表示を切り替える要素（値はその行の鍵）<br>`visible`: `boolean` —— `element` が名指す行に書く値 | 要素の表示を切り替える | `FR-049` |
| CM-62 | 見せ方の群 | `setFontScale` | ⭐ | `scale`: `fontScale`（`S-70`）を書く | 文字サイズの段を変える | `FR-039` |
| CM-64 | 見せ方の群 | `setThemeMonochrome` | — | `monochrome`: `isThemeMonochrome`（`S-74`）を書く | モノクロを選ぶ | `FR-041` |
| CM-65 | 見せ方の群 | `setZoom` | ⭐ | `zoomX`: `zoomX`（`S-75`）を書く<br>`zoomY`: `zoomY`（`S-76`）を書く | 表示倍率を変える | `FR-016` |
| CM-66 | 見せ方の群 | `setScrollPosition` | — | `scrollDate`: `scrollDate`（`S-77`）を書く<br>`scrollTaskGroupId`: `scrollTaskGroupId`（`S-78`）を書く<br>`scrollDayOffset`: `scrollDayOffset`（`S-177`）を書く<br>`scrollGroupOffset`: `scrollGroupOffset`（`S-176`）を書く | 表示位置を変える | `FR-051` |
| CM-67 | 見せ方の群 | `setTaskGroupPanelWidthPx` | — | `taskGroupPanelWidthPx`: `taskGroupPanelWidthPx`（`S-79`）を書く | タスクグループパネルの幅を変える | `FR-052` |
| CM-68 | 見せ方の群 | `pinTaskGroup` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`） —— `pinnedTaskGroupIds`（`S-126`）に足すタスクグループ | タスクグループをピン止めする | `FR-098` |
| CM-69 | 見せ方の群 | `unpinTaskGroup` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`） —— `pinnedTaskGroupIds`（`S-126`）から除くタスクグループ | ピン止めを外す | `FR-098` |
| CM-71 | 見せ方の群 | `fitScheduleToScreen` | ⭐ | `zoomX`: `zoomX`（`S-75`）を書く<br>`zoomY`: `zoomY`（`S-76`）を書く<br>`scrollDate`: `scrollDate`（`S-77`）を書く<br>`scrollTaskGroupId`: `scrollTaskGroupId`（`S-78`）を書く<br>`scrollDayOffset`: `scrollDayOffset`（`S-177`）を書く<br>`scrollGroupOffset`: `scrollGroupOffset`（`S-176`）を書く | 全体が収まる倍率と表示位置を置く | `FR-055` |
| CM-72 | `TaskGroup` | `resetTaskGroupTreeStates` | ⭐ | — | 隠したタスクグループを除くすべてのタスクグループの木の状態を `auto` へ戻す | `FR-055`（表 T-051 の `HF-8`、`_assets/tbl-state-machines.md` の 表 T-328） |
| CM-73 | `TaskGroup` | `moveTaskGroup` | ⭐ | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`parentId`: `TaskGroup.parentId`（`AT-52`）を書く<br>`order`: `TaskGroup.order`（`AT-55`）を書く | タスクグループの親と並びを変える | `FR-005`（表 T-051 の `HF-15`） |
| CM-74 | 見せ方の群 | `setDisplayScale` | — | `scale`: `displayScale`（`S-234`）を書く | 表示の倍率の段を変える | `FR-039` |
| CM-88 | 見せ方の群 | `setFitSpan` | ⭐ | `fitSpanStart`: `fitSpanStart`（`S-518`）を書く<br>`fitSpanFinish`: `fitSpanFinish`（`S-519`）を書く | 全体表示時の期間を置く・動かす（開始日と終了日を 1 度に） | `FR-055` |
| CM-89 | 見せ方の群 | `clearFitSpan` | ⭐ | — | 全体表示時の期間を消す（固定していれば固定も外す —— 表 T-367 の `FX-5`） | `FR-055` |
| CM-90 | 見せ方の群 | `setFitSpanFixed` | ⭐ | `isFitSpanFixed`: `isFitSpanFixed`（`S-532`）を書く<br>`shownStart`: `string` か `null` —— 今の表示の期間の開始（期間が空なら `S-518` へ写す —— 表 T-367 の `FX-4`）<br>`shownFinish`: `string` か `null` —— 今の表示の期間の終了（期間が空なら `S-519` へ写す —— 同） | 全体表示時の期間を固定する・外す（期間が空なら現在表示中の期間をコピーする —— 表 T-367 の `FX-4`） | `FR-055` |
| CM-91 | 見せ方の群 | `setTaskGroupPanelWidthFixed` | — | `isTaskGroupPanelWidthFixed`: `isTaskGroupPanelWidthFixed`（`S-533`）を書く | タスクグループパネルの幅を固定する・外す | `FR-052` |
| CM-92 | 見せ方の群 | `setTableView` | — | `table`: `'searchPanel'` ・ `'delayDiagnosticsReport'` ・ `'resourceList'` のどれか —— 見え方を置き換える表（`FR-151` の 表 T-353）<br>`view`: `TableView` —— その表の見え方の全部（`S-560` 〜 `S-572`）<br>　　`visibility`: `TableVisibility` —— 表示の列の値<br>　　　　`hiddenKeys`: `integer`の並び で `tableViews.searchPanel.hiddenTaskUids` ／ `tableViews.delayDiagnosticsReport.hiddenTaskUids` ／ `tableViews.resourceList.hiddenResourceUids`（`S-561` ／ `S-565` ／ `S-569`）を書く —— 隠した行の鍵（担当リストは `Resource.uid`、ほかは `Task.uid`）<br>　　　　`isUnassignedHidden`: `boolean` で `tableViews.resourceList.isUnassignedHidden`（`S-570`）を書く —— 担当の無い行を隠すか（担当リストだけが書く）<br>　　　　`isApplied`: `boolean` で `tableViews.searchPanel.isScheduleFilterApplied` ／ `tableViews.delayDiagnosticsReport.isScheduleFilterApplied` ／ `tableViews.resourceList.isScheduleFilterApplied`（`S-560` ／ `S-564` ／ `S-568`）を書く —— スケジュールフィルタを掛けているか<br>　　`columnFilters`: `ColumnFilter`（表 T-372）の並び で `tableViews.searchPanel.columnFilters` ／ `tableViews.delayDiagnosticsReport.columnFilters` ／ `tableViews.resourceList.columnFilters`（`S-562` ／ `S-566` ／ `S-571`）を書く —— 列のフィルタ<br>　　`sort`: `ColumnSort`（表 T-372） か `null` で `tableViews.searchPanel.sort` ／ `tableViews.delayDiagnosticsReport.sort` ／ `tableViews.resourceList.sort`（`S-563` ／ `S-567` ／ `S-572`）を書く —— 並べ替え | 表 1 つの見え方（表示の列の値・スケジュールフィルタの入切・列のフィルタ・並べ替え —— `_assets/tbl-settings.md` の 表 T-203 の `S-560` 〜 `S-572`）を置き換える | `FR-151` |
| CM-95 | 見せ方の群 | `setViewTimeZone` | — | `timeZone`: `string` か `null` で `viewTimeZone`（`S-574`）を書く —— 表 T-376 の種が標準時の行の鍵 | 見せる基準を変える（換算して適用する） | `FR-156` |
| CM-96 | 見せ方の群 | `setDisplayTimeZones` | — | `timeZones`: `displayTimeZones`（`S-575`）を書く | 表示するタイムゾーンを置く（0 〜 4 つ） | `FR-156` |
| CM-97 | 見せ方の群 | `setTimeOfDayVisible` | — | `isTimeOfDayVisible`: `isTimeOfDayVisible`（`S-576`）を書く | 時刻を表示するかを置く | `FR-158` |
| CM-85 | `TaskGroup` | `setTaskGroupTreeState` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`treeState`: `TaskGroup.treeState`（`AT-153`）を書く | タスクグループの木の状態を置く | `FR-004`（`_assets/tbl-state-machines.md` の 表 T-328） |
| CM-76 | `TaskGroup` | `setTaskGroupEditGroup` | — | `taskGroupId`: 鍵（`TaskGroup.id`、`AT-51`）<br>`editGroup`: `TaskGroup.editGroup`（`AT-144`）を書く<br>⚠️ まだ実装していない —— 受けても断る | タスクグループの編集グループを入れる・消す。<br>人だけが使う（表 T-275 の `GP-1`） | `FR-111` |
| CM-86 | 見せ方の群 | `setLevelZeroTreeState` | — | `levelZeroTreeState`: `levelZeroTreeState`（`S-418`）を書く | 段 0 の木の状態を置く | `FR-004`（`_assets/tbl-state-machines.md` の 表 T-328 の根の升） |

⚠️ `群` は対象の確定名（表 T-058 のエンティティ）と、どのエンティティにも属さない見せ方の群である。
