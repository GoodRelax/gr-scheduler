# 送る人へ（AI には送らない）

- GRS JSON の最終レビュー 2 の席の、外の AI への 1 通だけの質問状です（2026-11-23）。前の 2 段の質問状（`grs-json-final-review-ai-stage1.md`・`-stage2.md`）は大きすぎて、AI-B が答えませんでした。そこで、木を英語の名だけにし、実例を除き、答えを「迷った行と、指定の行」だけに絞りました。名は F-11 まで当てた後の版です。
- 「ここから下を AI へ送る」より下を、新しい会話に 1 回で貼ってください。前の質問状を見た会話は使わないでください。
- 問 1 の行には、F-1〜F-11 で変えた名と、比べるための前からの名を混ぜました。どれが新しい名かは AI に言いません。
- 答えは席に貼ってください。席が写し（AI の名を役割の名に替えた版）を `ai-answers/` に置きます。

---- ここから下を AI へ送る ----

# 初見の質問状: この JSON の名を、初めて見てどう読みますか

**答え方: 日本語で（名そのものは英語のまま）、1 つのコードブロック（```markdown で始めて ``` で閉じる）の中に、5 節の答えの型で書いてください。コードブロックの外には何も書かないでください。答えは短くて構いません。**

## 1. 頼みたいこと

ある日程表のアプリ（ガントチャート）は、1 つの文書を 1 つの JSON ファイルに保存します。この JSON のキーと値の名は、外との約束として長く変えずに使います。そこで、名が初めて読む人に **一発で、誤解なく** 読まれるかを測ります。

- 3 節の木（すべてのキーと、列挙の値のすべて）だけを見て、名が何を意味すると思うかを書いてください。
- 名の意味の説明は、わざと書いていません。名と、親のキーと、木の形だけから読んでください。
- 私たちの意図を推し量らないでください。似た製品を調べたり、ほかの資料から当てたりしないでください。欲しいのは初見の読みです。外れても構いません。外れた読みと、迷った読みがいちばん役に立ちます。

## 2. 木の読み方

- 各行の頭の `R001`〜`R428` は行の番号です。答えで行を指すときに使ってください。
- `[]` は配列です。`->` は、5 番目の部分「共通の型」にある型を指します。
- `[M]` は、Microsoft Project の XML 形式（MSPDI）の要素の名を camelCase にしたキーです。括弧の中は、MSPDI の名が違うときの MSPDI の名です。`[G]` は、MSPDI から来た物の中に、このアプリが足した値です。
- `"…"` の行は文字列の値の 1 つ、数だけの行は数の値の 1 つです。値の行は、すぐ上のキーが取る値をすべて並べています。
- 名の親は、`+-` の線をたどって上に読んでください（例: `R066` は `verticalZoom.automaticallyShownDepth`）。

## 3. 木（キー 278、値 150）

### 根と帳簿

```text
R001  ScheduleDocument
R002  +- $schema
R003  +- schemaVersionUtc
R004  +- buildVersionUtc
R005  +- documentStamp
R006  |  +- scheduleDataUpdatedAt
R007  |  +- documentUpdatedAt
R008  |  +- fileSavedAt
R009  |  +- lastEditedBy
R010  |     +- type
R011  |     |  +- "user"
R012  |     |  +- "template"
R013  |     |  +- "agent"
R014  |     +- name
R015  +- documentSettings
R016  +- scheduleData
R017  +- changeLogEntries[]
R018     +- changedAt
R019     +- changedBy
R020     |  +- editorType
R021     |  |  +- "user"
R022     |  |  +- "agent"
R023     |  +- name
R024     +- affectedArea
R025     +- changeDescription
R026     +- reason
R027     +- remarks
```

### 文書設定

```text
R028  documentSettings
R029  +- displayScaleRatio
R030  +- fontSizePreset
R031  |  +- "small"
R032  |  +- "medium"
R033  |  +- "large"
R034  +- isThemeMonochrome
R035  +- themeHue
R036  |  +- "blue"
R037  |  +- "blueGreen"
R038  |  +- "green"
R039  |  +- "yellowGreen"
R040  |  +- "yellow"
R041  |  +- "orange"
R042  |  +- "red"
R043  |  +- "redPurple"
R044  |  +- "purple"
R045  |  +- "indigo"
R046  +- viewTimeZone
R047  |  +- type
R048  |  |  +- "sameAsScheduleData"
R049  |  |  +- "fixed"
R050  |  +- utcOffset
R051  +- displayTimeZones[]
R052  |  +- utcOffset
R053  |  +- zoneNameType
R054  |     +- "standard"
R055  |     +- "daylight"
R056  +- isTimeOfDayVisible
R057  +- dayWidthPx
R058  +- fitDayRange
R059  |  +- type
R060  |  |  +- "fixed"
R061  |  |  +- "automatic"
R062  |  +- firstDay
R063  |  +- lastDay
R064  +- verticalZoom
R065  |  +- ratio
R066  |  +- automaticallyShownDepth
R067  +- taskGroupPanelWidthPx
R068  +- isTaskGroupPanelWidthFixed
R069  +- pinnedTaskGroupIds[]
R070  +- taskPlacementDirection
R071  |  +- "bottomToTop"
R072  |  +- "topToBottom"
R073  +- scrollPosition
R074  |  +- type
R075  |  |  +- "automatic"
R076  |  |  +- "fixed"
R077  |  +- leftEdgeDay
R078  |  +- leftEdgeDayOffsetPercent
R079  |  +- topEdgeTaskGroupId
R080  |  +- topEdgeTaskGroupOffsetPercent
R081  +- scheduleCanvasElements
R082  |  +- isDateGridLinesVisible
R083  |  +- isGroupGridLinesVisible
R084  |  +- isProgressLineVisible
R085  |  +- isDependencyLineVisible
R086  |  +- isPlanBarVisible
R087  |  +- isPlanDatesVisible
R088  |  +- isActualBarVisible
R089  |  +- isPercentCompleteLabelVisible
R090  |  +- isProgressMarkVisible
R091  |  +- isBaselineOutlineVisible
R092  |  +- isAssigneeLabelVisible
R093  +- delayDiagnosisSettings
R094  |  +- parentTaskProgressToleranceWorkingDays
R095  +- tableWindows
R096     +- searchWindow
R097     +- delayDiagnosisReportWindow
R098     +- resourceListWindow
```

### スケジュールデータ（頭の値と、MSPDI と往復する群）

```text
R099  scheduleData
R100  +- scheduleDataTimeZone
R101  |  +- utcOffset
R102  +- sourceFormat
R103  |  +- "grs"
R104  |  +- "mspdi12"
R105  |  +- "mspdi15"
R106  +- importedTopTaskOutlineLevel
R107  +- mspdiImportCount
R108  +- highestIssuedUid
R109  +- project [M]
R110  |  +- uid [M]
R111  |  +- name [M]
R112  |  +- title [M]
R113  |  +- subject [M]
R114  |  +- category [M]
R115  |  +- company [M]
R116  |  +- manager [M]
R117  |  +- author [M]
R118  |  +- revision [M]
R119  |  +- creationDate [M]
R120  |  +- startDate [M]
R121  |  +- statusDate [M]
R122  |  +- minutesPerDay [M]
R123  |  +- minutesPerWeek [M]
R124  |  +- daysPerMonth [M]
R125  |  +- weekStartDay [M]
R126  |  |  +- 0
R127  |  |  +- 1
R128  |  |  +- 2
R129  |  |  +- 3
R130  |  |  +- 4
R131  |  |  +- 5
R132  |  |  +- 6
R133  |  +- defaultStartTime [M]
R134  |  +- defaultFinishTime [M]
R135  |  +- calendarUid [M]
R136  |  +- passthrough [G]
R137  +- calendars[] [M]
R138  |  +- uid [M]
R139  |  +- name [M]
R140  |  +- isBaseCalendar [M]
R141  |  +- baseCalendarUid [M]
R142  |  +- weekDays[] [M]
R143  |  |  +- dayType [M]
R144  |  |  |  +- 1
R145  |  |  |  +- 2
R146  |  |  |  +- 3
R147  |  |  |  +- 4
R148  |  |  |  +- 5
R149  |  |  |  +- 6
R150  |  |  |  +- 7
R151  |  |  +- dayWorking [M]
R152  |  |  +- workingTimes[] [M]
R153  |  |  |  +- fromTime [M]
R154  |  |  |  +- toTime [M]
R155  |  |  +- passthrough [G]
R156  |  +- exceptions[] [M]
R157  |  |  +- name [M]
R158  |  |  +- fromDate [M] (TimePeriod/FromDate)
R159  |  |  +- toDate [M] (TimePeriod/ToDate)
R160  |  |  +- dayWorking [M]
R161  |  |  +- type [M]
R162  |  |  |  +- 1
R163  |  |  |  +- 2
R164  |  |  |  +- 3
R165  |  |  |  +- 4
R166  |  |  |  +- 5
R167  |  |  |  +- 6
R168  |  |  |  +- 7
R169  |  |  |  +- 8
R170  |  |  |  +- 9
R171  |  |  +- period [M]
R172  |  |  +- workingTimes[] [M]
R173  |  |  |  +- fromTime [M]
R174  |  |  |  +- toTime [M]
R175  |  |  +- passthrough [G]
R176  |  +- passthrough [G]
R177  +- tasks[] [M]
R178  |  +- uid [M]
R179  |  +- name [M]
R180  |  +- notes [M]
R181  |  +- start [M]
R182  |  +- finish [M]
R183  |  +- milestone [M]
R184  |  +- deadline [M]
R185  |  +- actualStart [M]
R186  |  +- stop [M]
R187  |  +- actualFinish [M]
R188  |  +- resume [M]
R189  |  +- resumeValid [M]
R190  |  +- percentComplete [M]
R191  |  +- calendarUid [M]
R192  |  +- hyperlinkAddress [M]
R193  |  +- hyperlink [M]
R194  |  +- parentTaskUid [G]
R195  |  +- siblingOrder [G]
R196  |  +- grs [G]
R197  |  |  +- startSlopeCalendarDays
R198  |  |  +- finishSlopeCalendarDays
R199  |  |  +- style
R200  |  |  |  +- taskShape
R201  |  |  |  |  +- "rectangle"
R202  |  |  |  |  +- "chevron"
R203  |  |  |  |  +- "arrow"
R204  |  |  |  |  +- "dumbbell"
R205  |  |  |  +- milestoneShape
R206  |  |  |  |  +- "circle"
R207  |  |  |  |  +- "hexagon"
R208  |  |  |  |  +- "pentagon"
R209  |  |  |  |  +- "diamond"
R210  |  |  |  |  +- "square"
R211  |  |  |  |  +- "star"
R212  |  |  |  |  +- "triangleUp"
R213  |  |  |  |  +- "triangleDown"
R214  |  |  |  |  +- "file"
R215  |  |  |  |  +- "box"
R216  |  |  |  |  +- "floppyDisk"
R217  |  |  |  |  +- "cylinder"
R218  |  |  |  |  +- "meetingPeople"
R219  |  |  |  |  +- "smilingFace"
R220  |  |  |  |  +- "beerMug"
R221  |  |  |  +- fill
R222  |  |  |  +- stroke
R223  |  |  +- taskGroupId
R224  |  |  +- importOrigin
R225  |  |     +- sourceProjectUid
R226  |  |     +- sourceTaskUid
R227  |  |     +- importSessionId
R228  |  |     +- mspdiImportCountWhenLastIncluded
R229  |  +- predecessorLinks[] [M] (PredecessorLink)
R230  |  |  +- predecessorUid [M]
R231  |  |  +- type [M]
R232  |  |  |  +- 0
R233  |  |  |  +- 1
R234  |  |  |  +- 2
R235  |  |  |  +- 3
R236  |  |  +- linkLag [M]
R237  |  |  +- lagFormat [M]
R238  |  |  |  +- 3
R239  |  |  |  +- 4
R240  |  |  |  +- 5
R241  |  |  |  +- 6
R242  |  |  |  +- 7
R243  |  |  |  +- 8
R244  |  |  |  +- 9
R245  |  |  |  +- 10
R246  |  |  |  +- 11
R247  |  |  |  +- 12
R248  |  |  |  +- 19
R249  |  |  |  +- 20
R250  |  |  |  +- 35..44
R251  |  |  |  +- 51
R252  |  |  |  +- 52
R253  |  |  +- passthrough [G]
R254  |  +- passthrough [G]
R255  +- resources[] [M]
R256  |  +- uid [M]
R257  |  +- name [M]
R258  |  +- type [M]
R259  |  |  +- 0
R260  |  |  +- 1
R261  |  +- isCostResource [M]
R262  |  +- calendarUid [M]
R263  |  +- passthrough [G]
R264  +- assignments[] [M]
R265     +- uid [M]
R266     +- taskUid [M]
R267     +- resourceUid [M]
R268     +- passthrough [G]
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R269  scheduleData
R270  +- taskGroups[]
R271  |  +- id
R272  |  +- name
R273  |  +- parentTaskGroupId
R274  |  +- siblingOrder
R275  |  +- style
R276  |  |  +- color
R277  |  +- minHeightPx
R278  |  +- representativeTaskUid
R279  |  +- hyperlinkAddress
R280  |  +- hyperlink
R281  |  +- showMode
R282  |  |  +- "shown"
R283  |  |  +- "hidden"
R284  |  |  +- "automatic"
R285  |  |  +- "hiddenUntilZoomIn"
R286  |  +- allowedEditorGroupName
R287  +- baselineTasks[]
R288  |  +- uid
R289  |  +- name
R290  |  +- start
R291  |  +- finish
R292  |  +- milestone
R293  +- highlightBoxes[]
R294  |  +- id
R295  |  +- style
R296  |  |  +- cornerRadiusPx
R297  |  |  +- fill
R298  |  |  +- stroke
R299  |  +- firstDay
R300  |  +- lastDay
R301  |  +- firstTaskGroupId
R302  |  +- lastTaskGroupId
R303  +- commentBoxes[]
R304  |  +- id
R305  |  +- text
R306  |  +- style
R307  |  |  +- fill
R308  |  |  +- stroke
R309  |  |  +- font
R310  |  |     +- color
R311  |  |     +- sizePx
R312  |  +- leaderTarget
R313  |  |  +- type
R314  |  |  |  +- "freePoint"
R315  |  |  |  +- "task"
R316  |  |  |  +- "highlightBox"
R317  |  |  +- dateTime
R318  |  |  +- taskGroupId
R319  |  |  +- taskGroupTopOffsetPercent
R320  |  |  +- taskUid
R321  |  |  +- snapPart
R322  |  |  |  +- "planBar"
R323  |  |  |  +- "actualBar"
R324  |  |  |  +- "milestoneMark"
R325  |  |  +- highlightBoxId
R326  |  |  +- snapPoint
R327  |  |     +- "topLeftCorner"
R328  |  |     +- "topMiddle"
R329  |  |     +- "topRightCorner"
R330  |  |     +- "rightMiddle"
R331  |  |     +- "bottomRightCorner"
R332  |  |     +- "bottomMiddle"
R333  |  |     +- "bottomLeftCorner"
R334  |  |     +- "leftMiddle"
R335  |  +- bodyOffsetPx
R336  |  |  +- dx
R337  |  |  +- dy
R338  |  +- hyperlinkAddress
R339  |  +- hyperlink
R340  +- passthroughTasks[]
R341  |  +- precedingTaskUid
R342  |  +- mspdiElement
R343  +- passthroughResources[]
R344  |  +- precedingResourceUid
R345  |  +- mspdiElement
R346  +- passthroughAssignments[]
R347  |  +- precedingAssignmentUid
R348  |  +- mspdiElement
R349  +- passthroughCalendars[]
R350     +- precedingCalendarUid
R351     +- mspdiElement
```

### 共通の型（-> で指す物）

```text
R352  Color
R353  +- type
R354  |  +- "theme"
R355  |  +- "palette"
R356  |  +- "custom"
R357  +- name
R358  |  +- "white"
R359  |  +- "black"
R360  |  +- "dimGray"
R361  |  +- "lightGray"
R362  |  +- "red"
R363  |  +- "blue"
R364  |  +- "yellow"
R365  |  +- "green"
R366  |  +- "orange"
R367  |  +- "purple"
R368  +- light
R369  |  +- hexColor
R370  |  +- isCalculatedFromOppositeColorScheme
R371  +- dark
R372  TaskGroupColor
R373  TaskTableWindow
R374  +- isScheduleFilteredByChecks
R375  +- checkedTaskUids[]
R376  +- columnFilters[]
R377  +- columnSort
R378  ResourceTableWindow
R379  +- isScheduleFilteredByChecks
R380  +- checkedResourceUids[]
R381  +- isUnassignedChecked
R382  +- columnFilters[]
R383  +- columnSort
R384  ColumnFilter
R385  +- type
R386  |  +- "values"
R387  |  +- "dateRange"
R388  +- column
R389  |  +- "progressMarkStatus"
R390  |  +- "percentComplete"
R391  |  +- "taskType"
R392  |  +- "taskName"
R393  |  +- "resourceNames"
R394  |  +- "start"
R395  |  +- "finish"
R396  |  +- "actualStart"
R397  |  +- "actualFinish"
R398  |  +- "taskGroupPath"
R399  |  +- "text"
R400  |  +- "taskGroupName"
R401  |  +- "leaderTargetDay"
R402  |  +- "diagnosisStatus"
R403  |  +- "planDates"
R404  |  +- "actualDates"
R405  |  +- "diagnosisReason"
R406  |  +- "resourceName"
R407  |  +- "isSelected"
R408  |  +- "assignedTaskCount"
R409  |  +- "assignedTaskNames"
R410  +- hiddenValues[]
R411  +- isBlankHidden
R412  +- firstDay
R413  +- lastDay
R414  ColumnSort
R415  +- column
R416  +- direction
R417     +- "ascending"
R418     +- "descending"
R419  Paint
R420  +- color
R421  +- opacityPercent
R422  Stroke
R423  +- color
R424  +- opacityPercent
R425  +- widthPx
R426  ShapeStyle
R427  +- fill
R428  +- stroke
```


## 4. 問い

**問 1. 指定の行.** 次の 20 行は、確信に関わらず必ず書いてください。その名（値の行では、その値）が何を意味すると思うかを日本語 30 字前後で、読みの確信（1 ＝ 当てずっぽう 〜 5 ＝ 迷わない）と、迷ったなら何と何で迷ったかを書いてください。

`R003`・`R066`・`R070`・`R071`・`R075`・`R081`・`R094`・`R106`・`R197`・`R228`・`R281`・`R285`・`R286`・`R319`・`R370`・`R372`・`R374`・`R388`・`R389`・`R410`

**問 2. 迷った行.** 問 1 の行の外で、読みの確信が 3 以下の行を **すべて**。行、名、最初の読み、ほかに浮かんだ読み、名のどの部分があなたを迷わせたか。

**問 3. 誤読の罠.** あなた自身は確信をもって読めたが、ほかの人が別の意味に取りそうな名を、罠の大きい順に 5 まで。行、名、あなたの読み、ほかの人が取りそうな読み、直すならどんな名か。

**問 4. 部分ごとの一目.** 5 つの部分のそれぞれについて、何のための物か一目で分かるか（○・△・×）と、その一言。

## 5. 答えの型（この型のまま、1 つのコードブロックに書く）

```markdown
## 問 1. 指定の行
| 行 | 名 | 意味だと思うこと | 確信 1〜5 | 迷い |
## 問 2. 迷った行（確信 3 以下をすべて）
| 行 | 名 | 最初の読み | ほかに浮かんだ読み | 迷わせた部分 |
## 問 3. 誤読の罠（5 まで）
| # | 行 | 名 | あなたの読み | ほかの人が取りそうな読み | 直すなら |
## 問 4. 部分ごとの一目
| 部分 | 一目で分かるか（○・△・×） | 一言 |
| 根と帳簿 | | |
| 文書設定 | | |
| 頭の値と MSPDI と往復する群 | | |
| GRS だけが持つ配列 | | |
| 共通の型 | | |
```
