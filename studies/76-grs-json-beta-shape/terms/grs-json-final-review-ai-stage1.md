# 送る人へ（AI には送らない）

- GRS JSON の最終レビュー（`JDG-3717` の 3.、観点は `JDG-3718`）の、外の AI への 2 段の質問状です。1 段目はこのファイルの「ここから下を AI へ送る」より下、2 段目は `grs-json-final-review-ai-stage2.md` の「ここから下を AI へ送る」より下です。
- 3 つ以上の、別々の会社の AI に出してください。AI ごとに新しい会話を使い、前の質問状を見た会話は使わないでください。リポジトリやウェブの資料は見せません。
- 1 段目を貼って答えを待ちます。答えが長いので、途中で切れたら「続けて」と送ってください。1 段目の答えが R406 まで揃ったら、同じ会話に 2 段目を貼ります。1 段目の答えを直させないでください。
- 2 つの答えを 1 つのファイルにまとめ、持ち主の手元のフォルダー（GQA の写しと同じ所）に `final-review-answer-<ai>.md` の名で保存してください。席がリポジトリの `ai-answers/` へ写し、AI の名を役割の名（AI-A など）に置き換えます。
- 1 段目は名だけを見せます（観点 V-1〜V-3）。意図は 2 段目にだけ書きました。

---- ここから下を AI へ送る（1 段目） ----

# 初見の質問状（1 段目）: この JSON の名を、初めて見てどう読みますか

**答え方: 日本語で（名そのものは英語のまま）、1 つのコードブロック（```markdown で始めて ``` で閉じる）の中に、6 節の答えの型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと

ある日程表のアプリ（ガントチャート）は、1 つの文書を 1 つの JSON ファイルに保存します。この JSON のキーと値の名は、外との約束として長く変えずに使います。そこで、名が初めて読む人に **一発で、誤解なく** 読まれるかを測ります。

- 3 節の木（すべてのキーと、列挙の値のすべて）と、4 節の実例だけを見て、それぞれの名が何を意味すると思うかを書いてください。
- 名の意味の説明は、わざと書いていません。名と形と実例の値だけから読んでください。
- 私たちの意図を推し量らないでください。似た製品を調べたり、ほかの資料から当てたりしないでください。欲しいのは初見の読みです。外れても構いません。外れた読みと、迷った読みがいちばん役に立ちます。
- この答えの後に、同じ会話で 2 段目（私たちの意図と、審査の問い）を送ります。

## 2. 木の読み方

- 各行の頭の `R001`〜`R406` は行の番号です。答えで行を指すときに使ってください。
- `[]` は配列です。`->` は、5 番目の部分「共通の型」にある型を指します。
- `[M]` は、Microsoft Project の XML 形式（MSPDI）の要素の名を camelCase にしたキーです。括弧の中は、MSPDI の名が違うときの MSPDI の名です。`[G]` は、MSPDI から来た物の中に、このアプリが足した値です。
- `"…"` の行は文字列の値の 1 つ、数だけの行は数の値の 1 つです。値の行は、すぐ上のキーが取る値をすべて並べています。

## 3. 木（キー 277、値 129）

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
R056  +- dayWidthPx
R057  +- fitDayRange
R058  |  +- type
R059  |  |  +- "fixed"
R060  |  |  +- "automatic"
R061  |  +- firstDay
R062  |  +- lastDay
R063  +- verticalZoom
R064  |  +- ratio
R065  |  +- automaticallyShownDepth
R066  +- taskGroupPanelWidthPx
R067  +- isTaskGroupPanelWidthFixed
R068  +- pinnedTaskGroupIds[]
R069  +- taskStackDirection
R070  |  +- "bottomToTop"
R071  |  +- "topToBottom"
R072  +- scrollPosition
R073  |  +- type
R074  |  |  +- "automatic"
R075  |  |  +- "fixed"
R076  |  +- leftEdgeDay
R077  |  +- leftEdgeDayOffsetPercent
R078  |  +- topEdgeTaskGroupId
R079  |  +- topEdgeTaskGroupOffsetPercent
R080  +- isTimeOfDayVisible
R081  +- isPlanBarVisible
R082  +- isPlanDatesVisible
R083  +- isActualBarVisible
R084  +- isPercentCompleteLabelVisible
R085  +- isBaselineOutlineVisible
R086  +- isProgressLineVisible
R087  +- isProgressMarkVisible
R088  +- isDependencyLineVisible
R089  +- isAssigneeLabelVisible
R090  +- isDateGridLinesVisible
R091  +- isGroupGridLinesVisible
R092  +- delayDiagnosisSettings
R093  |  +- toleranceWorkingDays
R094  +- tableWindows
R095     +- searchWindow
R096     +- delayDiagnosisReportWindow
R097     +- resourceListWindow
```

### スケジュールデータ（MSPDI と往復する群）

```text
R098  scheduleData
R099  +- project [M]
R100  |  +- uid [M]
R101  |  +- name [M]
R102  |  +- title [M]
R103  |  +- subject [M]
R104  |  +- category [M]
R105  |  +- company [M]
R106  |  +- manager [M]
R107  |  +- author [M]
R108  |  +- revision [M]
R109  |  +- creationDate [M]
R110  |  +- startDate [M]
R111  |  +- statusDate [M]
R112  |  +- minutesPerDay [M]
R113  |  +- minutesPerWeek [M]
R114  |  +- daysPerMonth [M]
R115  |  +- weekStartDay [M]
R116  |  |  +- 0
R117  |  |  +- 1
R118  |  |  +- 2
R119  |  |  +- 3
R120  |  |  +- 4
R121  |  |  +- 5
R122  |  |  +- 6
R123  |  +- defaultStartTime [M]
R124  |  +- defaultFinishTime [M]
R125  |  +- calendarUid [M]
R126  |  +- passthrough [G]
R127  +- calendars[] [M]
R128  |  +- uid [M]
R129  |  +- name [M]
R130  |  +- isBaseCalendar [M]
R131  |  +- baseCalendarUid [M]
R132  |  +- weekDays[] [M]
R133  |  |  +- dayType [M]
R134  |  |  |  +- 1
R135  |  |  |  +- 2
R136  |  |  |  +- 3
R137  |  |  |  +- 4
R138  |  |  |  +- 5
R139  |  |  |  +- 6
R140  |  |  |  +- 7
R141  |  |  +- dayWorking [M]
R142  |  |  +- workingTimes[] [M]
R143  |  |  |  +- fromTime [M]
R144  |  |  |  +- toTime [M]
R145  |  |  +- passthrough [G]
R146  |  +- exceptions[] [M]
R147  |  |  +- name [M]
R148  |  |  +- fromDate [M] (TimePeriod/FromDate)
R149  |  |  +- toDate [M] (TimePeriod/ToDate)
R150  |  |  +- dayWorking [M]
R151  |  |  +- type [M]
R152  |  |  |  +- 1
R153  |  |  |  +- 2
R154  |  |  |  +- 3
R155  |  |  |  +- 4
R156  |  |  |  +- 5
R157  |  |  |  +- 6
R158  |  |  |  +- 7
R159  |  |  |  +- 8
R160  |  |  |  +- 9
R161  |  |  +- period [M]
R162  |  |  +- workingTimes[] [M]
R163  |  |  |  +- fromTime [M]
R164  |  |  |  +- toTime [M]
R165  |  |  +- passthrough [G]
R166  |  +- passthrough [G]
R167  +- tasks[] [M]
R168  |  +- uid [M]
R169  |  +- name [M]
R170  |  +- notes [M]
R171  |  +- start [M]
R172  |  +- finish [M]
R173  |  +- milestone [M]
R174  |  +- deadline [M]
R175  |  +- actualStart [M]
R176  |  +- stop [M]
R177  |  +- actualFinish [M]
R178  |  +- resume [M]
R179  |  +- resumeValid [M]
R180  |  +- percentComplete [M]
R181  |  +- calendarUid [M]
R182  |  +- hyperlinkAddress [M]
R183  |  +- hyperlink [M]
R184  |  +- parentTaskUid [G]
R185  |  +- siblingOrder [G]
R186  |  +- grs [G]
R187  |  |  +- fadeInCalendarDays
R188  |  |  +- fadeOutCalendarDays
R189  |  |  +- style
R190  |  |  |  +- taskShape
R191  |  |  |  |  +- "rectangle"
R192  |  |  |  |  +- "chevron"
R193  |  |  |  |  +- "arrow"
R194  |  |  |  |  +- "dumbbell"
R195  |  |  |  +- milestoneShape
R196  |  |  |  |  +- "circle"
R197  |  |  |  |  +- "hexagon"
R198  |  |  |  |  +- "pentagon"
R199  |  |  |  |  +- "diamond"
R200  |  |  |  |  +- "square"
R201  |  |  |  |  +- "star"
R202  |  |  |  |  +- "triangleUp"
R203  |  |  |  |  +- "triangleDown"
R204  |  |  |  |  +- "file"
R205  |  |  |  |  +- "box"
R206  |  |  |  |  +- "floppyDisk"
R207  |  |  |  |  +- "cylinder"
R208  |  |  |  |  +- "meetingPeople"
R209  |  |  |  |  +- "smilingFace"
R210  |  |  |  |  +- "beerMug"
R211  |  |  |  +- fill
R212  |  |  |  +- stroke
R213  |  |  +- taskGroupId
R214  |  |  +- importOrigin
R215  |  |     +- sourceProjectUid
R216  |  |     +- sourceTaskUid
R217  |  |     +- importSessionId
R218  |  |     +- lastSeenMspdiImportCount
R219  |  +- predecessorLinks[] [M] (PredecessorLink)
R220  |  |  +- predecessorUid [M]
R221  |  |  +- type [M]
R222  |  |  |  +- 0
R223  |  |  |  +- 1
R224  |  |  |  +- 2
R225  |  |  |  +- 3
R226  |  |  +- linkLag [M]
R227  |  |  +- lagFormat [M]
R228  |  |  |  +- 3
R229  |  |  |  +- 4
R230  |  |  |  +- 5
R231  |  |  |  +- 6
R232  |  |  |  +- 7
R233  |  |  |  +- 8
R234  |  |  |  +- 9
R235  |  |  |  +- 10
R236  |  |  |  +- 11
R237  |  |  |  +- 12
R238  |  |  |  +- 19
R239  |  |  |  +- 20
R240  |  |  |  +- 35..44
R241  |  |  |  +- 51
R242  |  |  |  +- 52
R243  |  |  +- passthrough [G]
R244  |  +- passthrough [G]
R245  +- resources[] [M]
R246  |  +- uid [M]
R247  |  +- name [M]
R248  |  +- type [M]
R249  |  |  +- 0
R250  |  |  +- 1
R251  |  +- isCostResource [M]
R252  |  +- calendarUid [M]
R253  |  +- passthrough [G]
R254  +- assignments[] [M]
R255     +- uid [M]
R256     +- taskUid [M]
R257     +- resourceUid [M]
R258     +- passthrough [G]
```

### スケジュールデータ（GRS だけが持つ群）

```text
R259  scheduleData
R260  +- taskGroups[]
R261  |  +- id
R262  |  +- name
R263  |  +- parentTaskGroupId
R264  |  +- siblingOrder
R265  |  +- style
R266  |  |  +- color
R267  |  +- minHeightPx
R268  |  +- representativeTaskUid
R269  |  +- hyperlinkAddress
R270  |  +- hyperlink
R271  |  +- selfShowMode
R272  |  |  +- "shown"
R273  |  |  +- "hidden"
R274  |  |  +- "automatic"
R275  |  |  +- "hiddenUntilZoomIn"
R276  |  +- editableByGroupName
R277  +- baselineTasks[]
R278  |  +- uid
R279  |  +- name
R280  |  +- start
R281  |  +- finish
R282  |  +- milestone
R283  +- highlightBoxes[]
R284  |  +- id
R285  |  +- style
R286  |  |  +- cornerRadiusPx
R287  |  |  +- fill
R288  |  |  +- stroke
R289  |  +- firstDay
R290  |  +- lastDay
R291  |  +- firstTaskGroupId
R292  |  +- lastTaskGroupId
R293  +- commentBoxes[]
R294  |  +- id
R295  |  +- text
R296  |  +- style
R297  |  |  +- fill
R298  |  |  +- stroke
R299  |  |  +- font
R300  |  |     +- color
R301  |  |     +- sizePx
R302  |  +- leaderTarget
R303  |  |  +- type
R304  |  |  |  +- "freePoint"
R305  |  |  |  +- "task"
R306  |  |  |  +- "highlightBox"
R307  |  |  +- dateTime
R308  |  |  +- taskGroupId
R309  |  |  +- laneTopOffsetPercent
R310  |  |  +- taskUid
R311  |  |  +- snapPart
R312  |  |  |  +- "planBar"
R313  |  |  |  +- "actualBar"
R314  |  |  |  +- "milestoneMark"
R315  |  |  +- highlightBoxId
R316  |  |  +- snapPoint
R317  |  |     +- "topLeftCorner"
R318  |  |     +- "topMiddle"
R319  |  |     +- "topRightCorner"
R320  |  |     +- "rightMiddle"
R321  |  |     +- "bottomRightCorner"
R322  |  |     +- "bottomMiddle"
R323  |  |     +- "bottomLeftCorner"
R324  |  |     +- "leftMiddle"
R325  |  +- bodyOffsetPx
R326  |  |  +- dx
R327  |  |  +- dy
R328  |  +- hyperlinkAddress
R329  |  +- hyperlink
R330  +- scheduleDataTimeZone
R331  |  +- utcOffset
R332  +- sourceFormat
R333  |  +- "grs"
R334  |  +- "mspdi12"
R335  |  +- "mspdi15"
R336  +- importedTopTaskOutlineLevel
R337  +- highestIssuedUid
R338  +- mspdiImportCount
R339  +- passthroughTasks[]
R340  |  +- precedingTaskUid
R341  |  +- mspdiElement
R342  +- passthroughResources[]
R343  |  +- precedingResourceUid
R344  |  +- mspdiElement
R345  +- passthroughAssignments[]
R346  |  +- precedingAssignmentUid
R347  |  +- mspdiElement
R348  +- passthroughCalendars[]
R349     +- precedingCalendarUid
R350     +- mspdiElement
```

### 共通の型（-> で指す物）

```text
R351  Color
R352  +- type
R353  |  +- "theme"
R354  |  +- "palette"
R355  |  +- "custom"
R356  +- name
R357  |  +- "white"
R358  |  +- "black"
R359  |  +- "dimGray"
R360  |  +- "lightGray"
R361  |  +- "red"
R362  |  +- "blue"
R363  |  +- "yellow"
R364  |  +- "green"
R365  |  +- "orange"
R366  |  +- "purple"
R367  +- light
R368  |  +- hexColor
R369  |  +- isCalculatedFromOppositeColor
R370  +- dark
R371  LaneColor
R372  TaskTableWindow
R373  +- isScheduleFilterApplied
R374  +- checkedTaskUids[]
R375  +- columnFilters[]
R376  +- columnSort
R377  ResourceTableWindow
R378  +- isScheduleFilterApplied
R379  +- checkedResourceUids[]
R380  +- isUnassignedChecked
R381  +- columnFilters[]
R382  +- columnSort
R383  ColumnFilter
R384  +- type
R385  |  +- "values"
R386  |  +- "dateRange"
R387  +- column
R388  +- hiddenValues[]
R389  +- isBlankHidden
R390  +- firstDay
R391  +- lastDay
R392  ColumnSort
R393  +- column
R394  +- direction
R395     +- "ascending"
R396     +- "descending"
R397  Paint
R398  +- color
R399  +- opacityPercent
R400  Stroke
R401  +- color
R402  +- opacityPercent
R403  +- widthPx
R404  ShapeStyle
R405  +- fill
R406  +- stroke
```


## 4. 実例（すべての部分を 1 度ずつ使った小さな文書）

```json
{
  "$schema": "https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json",
  "schemaVersionUtc": "2026-11-17T00:00:00Z",
  "buildVersionUtc": "2026-11-17T03:00:00Z",
  "documentStamp": {
    "scheduleDataUpdatedAt": "2026-12-03T05:10:00Z",
    "documentUpdatedAt": "2026-12-03T05:12:00Z",
    "fileSavedAt": "2026-12-03T05:15:00Z",
    "lastEditedBy": {
      "type": "agent",
      "name": "planning-assistant"
    }
  },
  "documentSettings": {
    "displayScaleRatio": 1,
    "fontSizePreset": "medium",
    "isThemeMonochrome": false,
    "themeHue": "blue",
    "viewTimeZone": {
      "type": "fixed",
      "utcOffset": "+09:00"
    },
    "displayTimeZones": [
      {
        "utcOffset": "+00:00",
        "zoneNameType": "standard"
      },
      {
        "utcOffset": "-04:00",
        "zoneNameType": "daylight"
      }
    ],
    "dayWidthPx": 24,
    "fitDayRange": {
      "type": "fixed",
      "firstDay": "2026-11-30",
      "lastDay": "2026-12-11"
    },
    "verticalZoom": {
      "ratio": 1,
      "automaticallyShownDepth": 2
    },
    "taskGroupPanelWidthPx": 160,
    "isTaskGroupPanelWidthFixed": false,
    "pinnedTaskGroupIds": [
      "db19099a-0302-418d-82e1-e95c7a6a093c"
    ],
    "taskStackDirection": "bottomToTop",
    "scrollPosition": {
      "type": "fixed",
      "leftEdgeDay": "2026-11-30",
      "leftEdgeDayOffsetPercent": 0,
      "topEdgeTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
      "topEdgeTaskGroupOffsetPercent": 0
    },
    "isTimeOfDayVisible": false,
    "isPlanBarVisible": true,
    "isPlanDatesVisible": true,
    "isActualBarVisible": true,
    "isPercentCompleteLabelVisible": true,
    "isBaselineOutlineVisible": true,
    "isProgressLineVisible": true,
    "isProgressMarkVisible": true,
    "isDependencyLineVisible": true,
    "isAssigneeLabelVisible": true,
    "isDateGridLinesVisible": true,
    "isGroupGridLinesVisible": false,
    "delayDiagnosisSettings": {
      "toleranceWorkingDays": 1
    },
    "tableWindows": {
      "searchWindow": {
        "isScheduleFilterApplied": true,
        "checkedTaskUids": [2, 3],
        "columnFilters": [
          {
            "type": "values",
            "column": "taskName",
            "hiddenValues": ["Work package A"],
            "isBlankHidden": true
          }
        ],
        "columnSort": {
          "column": "start",
          "direction": "ascending"
        }
      },
      "delayDiagnosisReportWindow": {
        "isScheduleFilterApplied": false,
        "checkedTaskUids": [2],
        "columnFilters": [
          {
            "type": "dateRange",
            "column": "finish",
            "firstDay": "2026-12-01",
            "lastDay": "2026-12-31"
          }
        ],
        "columnSort": {
          "column": "finish",
          "direction": "descending"
        }
      },
      "resourceListWindow": {
        "isScheduleFilterApplied": false,
        "checkedResourceUids": [1],
        "isUnassignedChecked": true,
        "columnSort": {
          "column": "resourceName",
          "direction": "ascending"
        }
      }
    }
  },
  "scheduleData": {
    "project": {
      "uid": "c335b2c9-5721-419b-8203-6ea85ce2dc98",
      "name": "Sample Schedule",
      "title": "Sample Schedule",
      "subject": "A two-level WBS example",
      "category": "Example",
      "company": "Example Org",
      "manager": "Manager A",
      "author": "Author A",
      "revision": 3,
      "creationDate": "2026-11-20T09:00:00",
      "startDate": "2026-12-01T08:00:00",
      "statusDate": "2026-12-04T17:00:00",
      "minutesPerDay": 480,
      "minutesPerWeek": 2400,
      "daysPerMonth": 20,
      "weekStartDay": 1,
      "defaultStartTime": "08:00:00",
      "defaultFinishTime": "17:00:00",
      "calendarUid": 1,
      "passthrough": {
        "ScheduleFromStart": 1,
        "CurrencyCode": "USD"
      }
    },
    "calendars": [
      {
        "uid": 1,
        "name": "Standard",
        "isBaseCalendar": true,
        "weekDays": [
          {
            "dayType": 1,
            "dayWorking": false,
            "passthrough": {
              "TimePeriod": {
                "FromDate": "2026-01-01T00:00:00",
                "ToDate": "2026-12-31T23:59:00"
              }
            }
          },
          {
            "dayType": 2,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 3,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 4,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 5,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 6,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 7,
            "dayWorking": false
          }
        ],
        "exceptions": [
          {
            "name": "Make-up working day",
            "fromDate": "2026-12-05T00:00:00",
            "toDate": "2026-12-05T23:59:00",
            "dayWorking": true,
            "type": 1,
            "period": 1,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" }
            ],
            "passthrough": {
              "EnteredByOccurrences": 1,
              "Occurrences": 1
            }
          }
        ],
        "passthrough": {
          "GUID": "8677e724-9b8c-4b5e-aa02-c53710734eb3",
          "IsBaselineCalendar": 0
        }
      },
      {
        "uid": 2,
        "name": "Worker A",
        "isBaseCalendar": false,
        "baseCalendarUid": 1
      }
    ],
    "tasks": [
      {
        "uid": 1,
        "name": "Work package A",
        "notes": "Parent of the two steps below.",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": false,
        "percentComplete": 0,
        "calendarUid": 1,
        "hyperlinkAddress": "https://example.com/work-package-a",
        "hyperlink": "Work package A page",
        "siblingOrder": 1,
        "grs": {
          "style": {
            "taskShape": "dumbbell",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 11,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        }
      },
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-03T17:00:00",
        "milestone": false,
        "deadline": "2026-12-03T17:00:00",
        "actualStart": "2026-12-01T08:00:00",
        "stop": "2026-12-02T12:00:00",
        "resume": "2026-12-03T08:00:00",
        "resumeValid": true,
        "percentComplete": 50,
        "calendarUid": 1,
        "parentTaskUid": 1,
        "siblingOrder": 1,
        "grs": {
          "fadeInCalendarDays": 2,
          "fadeOutCalendarDays": 1,
          "style": {
            "taskShape": "chevron",
            "fill": {
              "color": { "type": "palette", "name": "blue" },
              "opacityPercent": 80
            },
            "stroke": {
              "color": { "type": "palette", "name": "black" },
              "opacityPercent": 100,
              "widthPx": 1
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 12,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        },
        "passthrough": {
          "Priority": 500,
          "ExtendedAttribute": [
            { "FieldID": "188743731", "Value": "Alpha" },
            { "FieldID": "188743734", "Value": "Beta" }
          ]
        }
      },
      {
        "uid": 3,
        "name": "Draft approved",
        "start": "2026-12-04T17:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": true,
        "deadline": "2026-12-04T17:00:00",
        "actualStart": "2026-12-04T17:00:00",
        "actualFinish": "2026-12-04T17:00:00",
        "percentComplete": 100,
        "parentTaskUid": 1,
        "siblingOrder": 2,
        "grs": {
          "style": {
            "milestoneShape": "diamond",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 13,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        },
        "predecessorLinks": [
          {
            "predecessorUid": 2,
            "type": 1,
            "linkLag": 4800,
            "lagFormat": 7,
            "passthrough": {
              "CrossProject": 0
            }
          }
        ]
      }
    ],
    "resources": [
      {
        "uid": 1,
        "name": "Worker A",
        "type": 1,
        "isCostResource": false,
        "calendarUid": 2,
        "passthrough": {
          "Initials": "WA",
          "MaxUnits": 1
        }
      }
    ],
    "assignments": [
      {
        "uid": 1,
        "taskUid": 2,
        "resourceUid": 1,
        "passthrough": {
          "Units": 1,
          "Work": "PT20H0M0S"
        }
      }
    ],
    "taskGroups": [
      {
        "id": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "name": "Work package A",
        "siblingOrder": 1,
        "style": {
          "color": { "type": "theme" }
        },
        "minHeightPx": 40,
        "representativeTaskUid": 1,
        "hyperlinkAddress": "https://example.com/lanes/work-package-a",
        "hyperlink": "Lane notes",
        "selfShowMode": "shown",
        "editableByGroupName": "Team A"
      },
      {
        "id": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "name": "Steps",
        "parentTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "siblingOrder": 1,
        "style": {
          "color": { "type": "palette", "name": "lightGray" }
        },
        "selfShowMode": "automatic"
      }
    ],
    "baselineTasks": [
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-02T17:00:00",
        "milestone": false
      }
    ],
    "highlightBoxes": [
      {
        "id": "8bc08829-d2ac-4cc5-87f8-c2fd9591a23a",
        "style": {
          "cornerRadiusPx": 4,
          "fill": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 30
          },
          "stroke": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 100,
            "widthPx": 2
          }
        },
        "firstDay": "2026-12-03",
        "lastDay": "2026-12-04",
        "firstTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "lastTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5"
      }
    ],
    "commentBoxes": [
      {
        "id": "23739f92-76e5-494f-aec7-3eab514f8f6e",
        "text": "Paused for half a day; resumes on Dec 3.",
        "style": {
          "fill": {
            "color": { "type": "palette", "name": "white" },
            "opacityPercent": 90
          },
          "stroke": {
            "color": { "type": "palette", "name": "orange" },
            "opacityPercent": 100,
            "widthPx": 1
          },
          "font": {
            "color": {
              "type": "custom",
              "light": { "hexColor": "#1f2328" },
              "dark": { "hexColor": "#e6edf3", "isCalculatedFromOppositeColor": true }
            },
            "sizePx": 12
          }
        },
        "leaderTarget": {
          "type": "task",
          "taskUid": 2,
          "snapPart": "planBar",
          "snapPoint": "topRightCorner"
        },
        "bodyOffsetPx": {
          "dx": 40,
          "dy": -30
        },
        "hyperlinkAddress": "https://example.com/notes/prepare-draft",
        "hyperlink": "Draft notes"
      }
    ],
    "scheduleDataTimeZone": {
      "utcOffset": "+09:00"
    },
    "sourceFormat": "mspdi15",
    "importedTopTaskOutlineLevel": 1,
    "highestIssuedUid": 4,
    "mspdiImportCount": 1,
    "passthroughTasks": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Name": "Sample Schedule",
          "Type": 1,
          "IsNull": 0,
          "OutlineNumber": "0",
          "OutlineLevel": 0,
          "Summary": 1
        }
      },
      {
        "precedingTaskUid": 2,
        "mspdiElement": {
          "UID": 4,
          "ID": 3,
          "IsNull": 1
        }
      }
    ],
    "passthroughResources": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Type": 1,
          "IsNull": 0
        }
      },
      {
        "precedingResourceUid": 1,
        "mspdiElement": {
          "UID": 2,
          "ID": 2,
          "IsNull": 1
        }
      }
    ],
    "passthroughAssignments": [
      {
        "precedingAssignmentUid": 1,
        "mspdiElement": {
          "UID": 2,
          "TaskUID": 3,
          "ResourceUID": -65535,
          "Units": 1
        }
      }
    ],
    "passthroughCalendars": [
      {
        "precedingCalendarUid": 2,
        "mspdiElement": {
          "UID": 3,
          "Name": "Baseline calendar",
          "IsBaseCalendar": 1,
          "IsBaselineCalendar": 1,
          "BaseCalendarUID": -1
        }
      }
    ]
  },
  "changeLogEntries": [
    {
      "changedAt": "2026-12-02T03:00:00Z",
      "changedBy": { "editorType": "user", "name": "Manager A" },
      "affectedArea": "tasks",
      "changeDescription": "Imported the plan from the MSPDI file.",
      "reason": "Start tracking the work package.",
      "remarks": "First import."
    },
    {
      "changedAt": "2026-12-03T05:10:00Z",
      "changedBy": { "editorType": "agent", "name": "planning-assistant" },
      "affectedArea": "Prepare draft",
      "changeDescription": "Recorded a stop on Dec 2 and a resume on Dec 3.",
      "reason": "Work paused for half a day."
    }
  ]
}
```

## 5. 問い

**問 1. 行ごとの説明.** `R001` から `R406` までの **すべての行** について、その名（値の行では、その値）が何を意味すると思うかを、日本語 20 字前後で書いてください。あわせて、読みの確信（1 ＝ 当てずっぽう 〜 5 ＝ 迷いなし）と、迷ったなら何と何で迷ったかを書いてください。迷わなかった行の「迷い」は空にしてください。

**問 2. 迷いの大きい名.** 問 1 で迷った行のうち、迷いの大きい順に 10 まで。最初の読み、ほかに浮かんだ読み、名のどの部分があなたを迷わせたか。

**問 3. 部分ごとの一目.** 5 つの部分（根と帳簿・文書設定・MSPDI と往復する群・GRS だけが持つ群・共通の型）のそれぞれについて、何のための物か一目で分かるか（○・△・×）と、その一言。

## 6. 答えの型（この型のまま、1 つのコードブロックに書く）

- 答えは長くなります。途中で切れたら、こちらが「続けて」と送ります。そのときは、切れた行の次の行から、同じ型で続けてください。
- 問 1 の表は、`R001` から `R406` まで 1 行も飛ばさずに書いてください。

```markdown
## 問 1. 行ごとの説明
| 行 | 意味だと思うこと | 確信 1〜5 | 迷い（何と何で迷ったか） |
| R001 | | | |
| R002 | | | |
（R406 まで、すべての行）
## 問 2. 迷いの大きい名（迷いの大きい順に 10 まで）
| # | 行 | 名 | 最初の読み | ほかに浮かんだ読み | 迷わせた部分 |
## 問 3. 部分ごとの一目
| 部分 | 一目で分かるか（○・△・×） | 一言 |
| 根と帳簿 | | |
| 文書設定 | | |
| MSPDI と往復する群 | | |
| GRS だけが持つ群 | | |
| 共通の型 | | |
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。2 段目は答えの後に送ります。**
