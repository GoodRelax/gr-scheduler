# GRS JSON の GRS 独自のキーの木

2026-10-27 に作った。β の GRS JSON の形（`CR-851` を当てた後。`doc-shape-map.tsv` の `element_new`）から、MSPDI と同じ名と意味のキー（説明が「Same as MSPDI」で始まるもの）を除き、GRS 独自のキーだけを木にした。

- GRS 独自のキーは 219 個（全部で 299 個）。中に GRS 独自のキーを持つ MSPDI の型（`Project`・`Task` ほか）は、枝として残し、右の欄にそう書いた。
- 右の欄: `← 古い名`（今のスキーマから名が変わるもの）、`問 N`（`7-key-name-questions.md` の問）。
- 名の裁定は `7-key-name-questions.md` で行う。本書は見るための木で、回答欄は無い。

**文書の木**（スキーマのいちばん上から）

```text
   $schema
   schemaVersion
   buildVersion
   schedule                           問 1
   +- taskGroups
   +- taskGroupMembers
   +- taskVisuals                     問 5
   +- taskOrigins
   +- baselineTasks
   +- commentBoxes
   +- highlightBoxes
   documentSettings
   +- displayScalePercent             ← displayScale
   +- fontSizeStep
   +- dayWidthPx                      ← zoomX
   +- verticalZoomRatio               ← zoomY
   +- taskGroupAutoExpandDepth
   +- scrollPosition
   |  +- (every kind)
   |  |  +- kind
   |  +- (kind placed)
   |     +- leftEdgeDay               ← scrollDate
   |     +- leftEdgeDayFraction       ← scrollDateFraction
   |     +- topEdgeTaskGroupId        ← scrollTaskGroupId
   |     +- topEdgeTaskGroupFraction  ← scrollTaskGroupFraction
   +- fitSpan
   |  +- firstDay                     ← fitSpanStart
   |  +- lastDay                      ← fitSpanFinish
   |  +- isFixed                      ← isFitSpanFixed
   +- viewTimeZone
   |  +- (every kind)
   |  |  +- kind
   |  +- (kind fixed)
   |     +- offset
   +- displayTimeZones
   |  +- offset
   |  +- season
   +- isTimeOfDayVisible
   +- isPlanVisible                   問 3
   +- isPlanDatesVisible
   +- isActualVisible                 問 3
   +- isPercentCompleteVisible        問 3
   +- isBaselineVisible               問 3
   +- isProgressLineVisible
   +- isProgressMarkerVisible         問 3
   +- isDependencyVisible             問 3
   +- isAssigneeVisible               問 3
   +- isDateGridLinesVisible
   +- isGroupGridLinesVisible
   +- stackDirection
   +- isThemeMonochrome
   +- taskGroupPanelWidthPx
   +- isTaskGroupPanelWidthFixed
   +- levelZeroTreeState
   +- pinnedTaskGroupIds
   +- tableViews
      +- searchPanel                  問 4
      |  +- isScheduleFilterApplied
      |  +- shownTaskUids
      |  +- columnFilters
      |  +- sort
      +- delayDiagnosticsReport       問 4
      |  +- isScheduleFilterApplied
      |  +- shownTaskUids
      |  +- columnFilters
      |  +- sort
      +- resourceList                 問 4
         +- isScheduleFilterApplied
         +- shownResourceUids
         +- isUnassignedShown
         +- columnFilters
         +- sort
   documentStamp
   changeLogEntries                   ← changeLog
```

**型の木**（`$defs`）

```text
   Project                                    （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- scheduleDataTimeZone
   +- themeHueDegrees                         ← themeHue
   +- parentTaskProgressToleranceWorkingDays  ← parentTaskProgressToleranceDays
   +- highestIssuedUid                        ← uidHighWaterMark
   +- lastImportNumber                        ← importSequence
   +- firstOutlineLevel                       ← outlineBase
   +- sourceFormat
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Calendar                                   （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- ordinal
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   WeekDay                                    （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- ordinal
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Exception                                  （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- ordinal
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   WorkingTime                                （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- ordinal
   Task                                       （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- parentTaskUid
   +- siblingOrder                            ← wbsOrder
   +- fadeInCalendarDays                      ← fadeInDays
   +- fadeOutCalendarDays                     ← fadeOutDays
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Dependency                                 （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Resource                                   （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Assignment                                 （MSPDI の型。中の GRS 独自のキーだけを載せる）
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   TaskGroup
   +- id
   +- parentId
   +- representedTaskUid                      ← derivedFromTaskUid
   +- siblingOrder                            ← order
   +- name
   +- treeState
   +- editGroup                               ← editPermission
   +- color
   +- minHeightPx
   +- hyperlinkAddress
   +- hyperlink
   TaskGroupMember
   +- taskUid
   +- taskGroupId
   TaskVisual                                 問 5
   +- taskUid
   +- taskShape                               ← shapeKind
   +- milestoneShape                          ← milestoneGlyph
   +- fillColor
   +- strokeColor
   +- strokeWidthPx
   TaskOrigin
   +- taskUid
   +- sourceProjectId
   +- sourceUid
   +- importSessionId
   +- lastSeenImportNumber                    ← lastSeenImportSequence
   BaselineTask
   +- uid
   +- name
   +- start
   +- finish
   +- milestone
   CommentBox
   +- id
   +- anchor                                  問 2
   +- bodyOffsetPx
   |  +- dx
   |  +- dy
   +- text
   +- fillColor
   +- fillTransparencyPercent
   +- strokeColor
   +- strokeWidthPx
   +- textColor
   +- fontSizePx
   +- hyperlinkAddress
   +- hyperlink
   CommentBoxAnchor                           問 2
   +- (every kind)
   |  +- kind
   +- (kind freePoint)
   |  +- dateTime                             ← anchorDate
   |  +- taskGroupId ;
   |  |  +- AnchorFallback
   |  |     +- taskGroupId                    ← anchorTaskGroupId
   |  +- bandFraction ;
   |     +- AnchorFallback
   |        +- bandFraction                   ← anchorBandFraction  問 2
   +- (kind task)
   |  +- taskUid                              ← anchorTaskUid
   |  +- figure                               ← anchorTaskFigure  問 2
   |  +- point ;
   |  |  +- CommentBoxAnchor
   |  |     +- (kind highlightBox)
   |  |        +- point                       ← anchorSnapPoint
   |  +- fallback
   +- (kind highlightBox)
      +- highlightBoxId                       ← anchorHighlightBoxId
      +- fallback
   AnchorFallback                             問 2
   HighlightBox
   +- id
   +- topTaskGroupId
   +- bottomTaskGroupId
   +- firstDay                                ← start
   +- lastDay                                 ← finish
   +- cornerRadiusPx
   +- fillColor
   +- fillTransparencyPercent
   +- strokeColor
   +- strokeWidthPx
   DocumentStamp                              ← documentStamp
   +- scheduleUpdatedAt                       問 1
   +- documentUpdatedAt                       ← settingsUpdatedAt
   +- fileSavedAt
   +- lastEditedBy
   Writer
   +- (every kind)
   |  +- kind
   +- (kind agent)
      +- name
   ChangeLogEntry                             ← changeLog
   +- changedAt
   +- changedBy                               ← editedBy
   +- affectedArea
   +- changeDescription                       ← explanation
   +- reason
   +- note
   PassthroughValues                          ← Carry
   PassthroughElement                         ← CarryElement
   +- ordinal
   +- name
   +- fields
   +- children
   Day
   DateTime
   Time
   UtcInstant
   UtcOffset
   Color
   +- (every kind)
   |  +- kind
   +- (kind palette)
   |  +- name
   +- (kind custom)
      +- light
      +- dark
   ColorSide
   +- value
   +- source
   BandColor                                  問 2
   ColumnFilter
   +- (every kind)
   |  +- kind
   |  +- column
   +- (kind values)
   |  +- hiddenValues
   |  +- isBlankHidden
   +- (kind dateRange)
      +- firstDay                             ← fromDate
      +- lastDay                              ← toDate
   ColumnSort
   +- column
   +- direction
   ColumnKey
```
