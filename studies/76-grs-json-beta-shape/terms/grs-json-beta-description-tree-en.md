# GRS JSON β のスキーマ —— 説明の木（英語版）

- 生成物（`JDG-3760`・`JDG-3761`・`JDG-3764`）。キー・順・列挙の値・英語の説明は、すべて `grs-json-beta.schema.json` から作った。作り直し: `python schema_to_review_tree.py english-num`。
- 日本語版は `grs-json-beta-description-tree-ja.md`。行番号 R001〜R440 は両方と `grs-json-final-review-tree.md` で同じ。

### Root and records

```text
R001  ScheduleDocument             GRS JSON document
R002  +- $schema                   The address of the latest GRS schema; every document holds the same address.
R003  +- schemaVersionUtc          The UTC time when the shape of GRS JSON, meaning the keys and the rules, last changed.
R004  +- buildVersionUtc           This value serves debugging only; schemaVersionUtc tells whether GRS can read the file.
R005  +- documentStamp             The Agent API uses this stamp to refuse writes based on an old read.
R006  |  +- scheduleDataUpdatedAt  A change of documentSettings alone does not move this time.
R007  |  +- documentUpdatedAt      The last change of the Schedule Document, documentSettings included.
R008  |  +- fileSavedAt            The key is absent until the first save.
R009  |  +- lastEditedBy
R010  |     +- type                "template": nobody has edited yet, so the Schedule Document is still the template that
                                   comes with GRS.
R011  |     |  +- "user"
R012  |     |  +- "template"
R013  |     |  +- "agent"
R014  |     +- name                The name of the editor: for "agent", the name that the AI reports; for "user", the name
                                   of the person, only when GRS knows the name.
R015  +- documentSettings          How GRS shows the schedule on opening
R016  +- scheduleData              Schedule data
R017  +- changeLogEntries[]        The Change Log: notes that people or an AI write about changes to the Schedule Document,
                                   oldest first. GRS adds a new entry at the end.
R018     +- changedAt              GRS fills in the time when GRS adds the entry; a person may change the time later.
R019     +- changedBy
R020     |  +- editorType          GRS fills in the value.
R021     |  |  +- "user"
R022     |  |  +- "agent"
R023     |  +- name                The name of the editor: the name that a person typed, or the name that an AI reported.
R024     +- affectedArea
R025     +- changeDescription
R026     +- reason
R027     +- remarks
```

### Document settings

```text
R028  documentSettings                              GRS writes the keys from the widest effect to the narrowest.
R029  +- displayScaleRatio                          GRS multiplies the values of keys ending in Px, which are CSS pixels, by this ratio when
                                                    drawing, and saves those values unscaled.
R030  +- fontSizePreset                             GRS holds the pixel size of each step, and displayScaleRatio scales that size.
R031  |  +- "small"
R032  |  +- "medium"
R033  |  +- "large"
R034  +- isThemeMonochrome                          GRS draws every color in monochrome when this value is true: the theme colors, the
                                                    palette colors and the custom colors. This value changes only the drawing; the colors
                                                    saved in the Schedule Document stay the same.
R035  +- themeHue                                   GRS holds the hue angle of each name.
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
R046  +- viewTimeZone                               The Display Base Time Zone: the time zone in which GRS shows date-times on the Schedule
                                                    Canvas and the Time Ruler.
R047  |  +- type                                    "sameAsScheduleData": GRS shows date-times in the time zone of
                                                    scheduleData.scheduleDataTimeZone and follows that time zone when the time zone changes.
R048  |  |  +- "sameAsScheduleData"
R049  |  |  +- "fixed"
R050  |  +- utcOffset                               GRS uses the offset all year and never adds daylight saving time.
R051  +- additionalTimeZones[]                      While GRS shows times of day, each clock adds a row under the Time Ruler.
R052  |  +- utcOffset                               The offset already includes any daylight saving time, and GRS uses the offset all year.
R053  |  +- zoneNameType                            Which name of the zone GRS shows for this clock: the standard-time name or the daylight-
                                                    time name. This value does not change the offset.
R054  |     +- "standard"
R055  |     +- "daylight"
R056  +- isTimeOfDayVisible
R057  +- dayWidthPx                                 The Day Width (the horizontal zoom): the width of one calendar day on the Time Ruler.
                                                    Zoom to Fit sets this value.
R058  +- fitDayRange                                The Fit Span: the days that Zoom to Fit and PNG and SVG pictures show.
R059  |  +- type                                    "fixed": the Fit Span runs from firstDay to lastDay with no margin, and those two whole
                                                    days touch the edges of the Task Group Lanes. "automatic": the Fit Span covers
                                                    everything that GRS draws, plus a margin that GRS fixes and does not save.
R060  |  |  +- "fixed"
R061  |  |  +- "automatic"
R062  |  +- firstDay                                Write this key only when type is "fixed". The first day of the Fit Span, as a day in the
                                                    Display Base Time Zone.
R063  |  +- lastDay                                 A date without a time of day, in the time zone that each key names where that matters. A
                                                    range of days (firstDay to lastDay) includes both ends.
R064  +- verticalZoom                               The two values that one step of vertical zoom and Zoom to Fit change together. When this
                                                    key is absent, GRS chooses both values as Zoom to Fit does; when only
                                                    automaticallyShownDepth is absent, GRS chooses that value as Zoom to Fit does.
R065  |  +- ratio                                   The vertical size of the Task Graphics as a ratio to the default size: 2 draws Plan
                                                    Bars, Actual Bars and Name Labels twice as tall.
R066  |  +- automaticallyShownDepth                 The depth to which GRS shows task groups with showMode "automatic". A zoom-in step
                                                    changes ratio only after this value reaches the depth of the deepest task group in the
                                                    Schedule Document; ratio never sets this value.
R067  +- taskGroupPanelWidthPx
R068  +- isTaskGroupPanelWidthFixed                 GRS always draws the Task Group Panel at taskGroupPanelWidthPx. true: a person changes
                                                    taskGroupPanelWidthPx in the document settings, and the Panel Divider stays fixed;
                                                    false: a drag of the Panel Divider changes taskGroupPanelWidthPx.
R069  +- pinnedTaskGroupIds[]                       The ids of the Pinned Task Groups, which stay at the top during vertical scrolling. A
                                                    pin shows the task group at any depth if showMode is "automatic", never if "hidden"; an
                                                    ancestor with showMode "hidden" or "hiddenUntilZoomIn" still hides the pinned task
                                                    group.
R070  +- taskPlacementDirection                     The Placement Direction: how GRS stacks the overlapping tasks of one Task Group Lane on
                                                    Stack Tiers, earliest task first; this value does not order the task groups.
R071  |  +- "bottomToTop"
R072  |  +- "topToBottom"
R073  +- scrollPosition
R074  |  +- type                                    "automatic": nobody has chosen a place, so GRS chooses one on opening; this value does
                                                    not mean today or the status date.
R075  |  |  +- "automatic"
R076  |  |  +- "fixed"
R077  |  +- leftEdgeDay                             Write this key only when type is "fixed". The day at the left edge of the view, as a day
                                                    in the time zone of scheduleData.scheduleDataTimeZone.
R078  |  +- leftEdgeDayOffsetPercent                Only when type is "fixed". How far the left edge lies to the right of the start of
                                                    leftEdgeDay, in percent of one day.
R079  |  +- topEdgeTaskGroupId                      Write this key only when type is "fixed". The id of the task group at the top edge of
                                                    the view. When that task group no longer exists, GRS treats the scroll position as
                                                    "automatic".
R080  |  +- topEdgeTaskGroupOffsetPercent           Only when type is "fixed". How far the top edge lies below the top of that task group,
                                                    not of the screen, in percent of the lane height plus the gap below.
R081  +- scheduleCanvasElements                     GRS writes the keys in this order: bars, labels, lines.
R082  |  +- isPlanBarVisible
R083  |  +- isActualBarVisible
R084  |  +- isBaselineOutlineVisible
R085  |  +- isAssigneeLabelVisible
R086  |  +- isPercentCompleteLabelVisible
R087  |  +- isProgressStatusMarkVisible             When this value is true, GRS draws the Resume Marks and the Progress Status Marks, which
                                                    show progress status by shape past the Actual Bar end, not on the Progress Line.
R088  |  +- isPlanDatesVisible                      GRS draws the planned start and finish dates to the right of each Name Label when this
                                                    value is true.
R089  |  +- isDependencyLineVisible
R090  |  +- isProgressLineVisible                   GRS draws the Progress Line when this value is true: one zigzag line from the status
                                                    date through the task progress point of each task.
R091  |  +- isDateGridLinesVisible
R092  |  +- isTaskGroupGridLinesVisible
R093  +- delayDiagnosisSettings
R094  |  +- parentTaskProgressToleranceWorkingDays  The working days by which a parent's progress point may stray beyond the progress points
                                                    below before Delay Diagnostics marks the parent doubtful. This value excuses no late
                                                    finish.
R095  +- tableWindows                               The checks, column filters and sort of the tables in the Search Window, the Delay
                                                    Diagnostics Report Window and the Resource List Window, but no window positions.
R096     +- searchWindow                            (type TaskTableWindow) The table settings of the Search Window, which shows the task
                                                    table or the Comment Box table, one at a time. columnFilters holds the filters of both
                                                    tables, told apart by column; columnSort holds one sort, on a column of either table,
                                                    and the other table then shows the default order. The checks belong to the task table
                                                    only.
R097     +- delayDiagnosisReportWindow              (type TaskTableWindow)
R098     +- resourceListWindow                      (type ResourceTableWindow)
```

### Schedule data (head values and the MSPDI part)

```text
R099  scheduleData
R100  +- scheduleDataTimeZone                         GRS does not write this zone to MSPDI.
R101  |  +- utcOffset                                 GRS uses the offset all year and never adds daylight saving time.
R102  +- sourceFormat
R103  |  +- "grs"
R104  |  +- "mspdi12"
R105  |  +- "mspdi15"
R106  +- importedTopTaskOutlineLevel                  The MSPDI OutlineLevel of the top tasks in the imported file, not counting the project
                                                      summary task; GRS gives this OutlineLevel to the top WBS tasks when writing MSPDI.
R107  +- mspdiImportCount
R108  +- lastMspdiImport                              People and AI agents read this object; GRS compares mspdiImportCount instead.
R109  |  +- importedAt
R110  |  +- fileName                                  GRS writes the file name only, never the folder, so that the file keeps no personal
                                                      path.
R111  +- highestIssuedUid                             The highest uid that GRS has issued, one counter for tasks, resources, assignments and
                                                      calendars. GRS gives a new entity this value plus 1. When the key is absent, GRS takes
                                                      the highest uid of the four lists on opening; at 2147483647, GRS refuses to add a new
                                                      entity.
R112  +- project [M]                                  scheduleData.project holds only the values for the whole project: the MSPDI lists
                                                      (calendars, tasks, resources, assignments) sit beside project in scheduleData, not
                                                      inside project as in MSPDI.
R113  |  +- uid [M]                                   Before writing over another file, GRS treats that file as the same Schedule Document
                                                      only when project.uid, project.name and the file name all match; an absent value never
                                                      matches.
R114  |  +- name [M]
R115  |  +- title [M]                                 GRS shows the value as the Project Title in the App Header and builds the default file
                                                      name in the Save As Dialog from the value.
R116  |  +- subject [M]
R117  |  +- category [M]
R118  |  +- company [M]
R119  |  +- manager [M]
R120  |  +- author [M]
R121  |  +- creationDate [M]                          GRS writes the moment of creation when GRS makes a new Schedule Document.
R122  |  +- revision [M]
R123  |  +- startDate [M]                             A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                                      writes a date-time. GRS reads the value to the minute and ignores the seconds.
R124  |  +- calendarUid [M]                           When this key is absent or matches no uid in calendars[], GRS uses the first calendar
                                                      with isBaseCalendar true, or else a built-in Monday-to-Friday calendar.
R125  |  +- defaultStartTime [M]                      GRS gives this time of day to a start that GRS sets by the day, and uses 08:00:00 when
                                                      the key is absent.
R126  |  +- defaultFinishTime [M]                     GRS gives this time of day to a finish that GRS sets by the day and to a milestone
                                                      start, and uses 17:00:00 when the key is absent.
R127  |  +- minutesPerDay [M]                         GRS uses 480 when the key is absent, and warns on opening when the working times of a
                                                      day total otherwise.
R128  |  +- minutesPerWeek [M]
R129  |  +- daysPerMonth [M]
R130  |  +- weekStartDay [M]                          Sunday is 0 here but 1 in calendars[].weekDays[].dayType. GRS starts each week of the
                                                      Time Ruler on this day.
R131  |  |  +- 0
R132  |  |  +- 1
R133  |  |  +- 2
R134  |  |  +- 3
R135  |  |  +- 4
R136  |  |  +- 5
R137  |  |  +- 6
R138  |  +- statusDate [M]                            GRS draws the Status Line at this date-time and runs Delay Diagnostics for this date.
                                                      Without statusDate, GRS draws no Status Line and Delay Diagnostics does not run.
R139  |  +- grs [G]
R140  |     +- passthrough                            The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R141  +- calendars[] [M]                              GRS keeps the calendars other than the one that project.calendarUid names only to write
                                                      them back to MSPDI.
R142  |  +- uid [M]                                   The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R143  |  +- name [M]
R144  |  +- isBaseCalendar [M]
R145  |  +- baseCalendarUid [M]                       GRS writes this value back but does not inherit: GRS counts only the days that this
                                                      calendar lists.
R146  |  +- grs [G]
R147  |  |  +- passthrough                            The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R148  |  +- weekDays[] [M]
R149  |  |  +- dayType [M]
R150  |  |  |  +- 1
R151  |  |  |  +- 2
R152  |  |  |  +- 3
R153  |  |  |  +- 4
R154  |  |  |  +- 5
R155  |  |  |  +- 6
R156  |  |  |  +- 7
R157  |  |  +- dayWorking [M]
R158  |  |  +- grs [G]
R159  |  |  |  +- passthrough                         The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R160  |  |  +- workingTimes[] [M]                     On a working day without workingTimes, GRS uses 08:00-12:00 and 13:00-17:00. On a non-
                                                      working day, GRS keeps workingTimes for MSPDI and counts no working time.
R161  |  |     +- fromTime [M]                        A time of day from 00:00:00 to 23:59:59.
R162  |  |     +- toTime [M]                          00:00:00 means 24:00, the end of the day.
R163  |  +- exceptions[] [M]                          GRS keeps an exception without fromDate or toDate for MSPDI and leaves it out of the
                                                      count.
R164  |     +- name [M]
R165  |     +- fromDate [M] (TimePeriod/FromDate)     GRS reads only the date, and GRS writes T00:00:00 when GRS sets the date.
R166  |     +- toDate [M] (TimePeriod/ToDate)         GRS reads only the date, so T00:00:00 still counts the whole day; GRS writes T23:59:00.
R167  |     +- dayWorking [M]
R168  |     +- type [M]                               GRS counts working days with a one-off exception only, which covers every day from
                                                      fromDate to toDate: type 9, no type, or type 1 (every day) with period 1 or no period; a
                                                      new exception takes 1. GRS keeps the other exceptions unchanged and leaves them out of
                                                      the count.
R169  |     |  +- 1
R170  |     |  +- 2
R171  |     |  +- 3
R172  |     |  +- 4
R173  |     |  +- 5
R174  |     |  +- 6
R175  |     |  +- 7
R176  |     |  +- 8
R177  |     |  +- 9
R178  |     +- period [M]
R179  |     +- grs [G]
R180  |     |  +- passthrough                         The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R181  |     +- workingTimes[] [M]                     On a working exception, these spans replace the spans of the day of the week; a working
                                                      exception without workingTimes uses 08:00-12:00 and 13:00-17:00. On a non-working
                                                      exception, GRS keeps workingTimes for MSPDI and counts no working time.
R182  |        +- fromTime [M]                        A time of day from 00:00:00 to 23:59:59.
R183  |        +- toTime [M]                          00:00:00 means 24:00, the end of the day.
R184  +- passthroughCalendars[]
R185  |  +- precedingCalendarUid                      The uid of the nearest calendar in calendars[] that precedes this element in MSPDI. No
                                                      key puts the element first; equal values keep array order.
R186  |  +- mspdiElement                              One whole MSPDI element that GRS does not hold as an entity, keyed by child element
                                                      names.
R187  +- tasks[] [M]                                  The order of this list carries no meaning: parentTaskUid and siblingIndex give the WBS
                                                      tree. GRS writes MSPDI tasks depth first along that tree and rebuilds ID, OutlineLevel,
                                                      OutlineNumber and Summary.
R188  |  +- uid [M]                                   The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R189  |  +- name [M]
R190  |  +- start [M]                                 A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                                      writes a date-time. GRS reads the value to the minute and ignores the seconds.
R191  |  +- finish [M]                                A milestone has the same start and finish.
R192  |  +- stop [M]                                  GRS removes stop when GRS finishes the task; actualFinish then holds the end.
R193  |  +- resume [M]                                A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                                      writes a date-time. GRS reads the value to the minute and ignores the seconds.
R194  |  +- resumeValid [M]                           Only a written false marks a suspension with no resume date. GRS writes true with each
                                                      resume date.
R195  |  +- milestone [M]
R196  |  +- percentComplete [M]                       Actual working time (actualStart to actualFinish or stop) over planned working time,
                                                      times 100, rounded, uncapped. Without planned working time, the value is 100 after
                                                      actualFinish, else 0. A task with actualStart and neither actualFinish nor stop counts 0
                                                      actual working time.
R197  |  +- actualStart [M]                           A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                                      writes a date-time. GRS reads the value to the minute and ignores the seconds.
R198  |  +- actualFinish [M]                          A percentComplete of 100 does not mean finished.
R199  |  +- calendarUid [M]                           GRS keeps this value only to write it back to MSPDI.
R200  |  +- deadline [M]                              A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                                      writes a date-time. GRS reads the value to the minute and ignores the seconds.
R201  |  +- hyperlink [M]
R202  |  +- hyperlinkAddress [M]
R203  |  +- notes [M]
R204  |  +- parentTaskUid [G]                         The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R205  |  +- siblingIndex [G]                          GRS writes 0, 1, 2 without gaps, reads the smallest first, and keeps array order on
                                                      ties; siblings without siblingIndex follow, in array order.
R206  |  +- grs [G]
R207  |  |  +- startSlopeCalendarDays                 The Start Slope in calendar days: GRS slants the start edge of the Plan Bar inward, from
                                                      start toward finish, to mark a start that is not firm, without changing the schedule.
R208  |  |  +- finishSlopeCalendarDays                The Finish Slope in calendar days: GRS slants the finish edge of the Plan Bar inward,
                                                      from finish toward start, to mark a finish that is not firm, without changing the
                                                      schedule.
R209  |  |  +- style
R210  |  |  |  +- taskShape                           The shape of the Plan Bar and the Actual Bar of a task that is not a milestone.
                                                      "dumbbell": a thin line with a dot at each end.
R211  |  |  |  |  +- "rectangle"
R212  |  |  |  |  +- "chevron"
R213  |  |  |  |  +- "arrow"
R214  |  |  |  |  +- "dumbbell"
R215  |  |  |  +- milestoneShape
R216  |  |  |  |  +- "circle"
R217  |  |  |  |  +- "hexagon"
R218  |  |  |  |  +- "pentagon"
R219  |  |  |  |  +- "diamond"
R220  |  |  |  |  +- "square"
R221  |  |  |  |  +- "star"
R222  |  |  |  |  +- "triangleUp"
R223  |  |  |  |  +- "triangleDown"
R224  |  |  |  |  +- "file"
R225  |  |  |  |  +- "box"
R226  |  |  |  |  +- "floppyDisk"
R227  |  |  |  |  +- "cylinder"
R228  |  |  |  |  +- "meetingPeople"
R229  |  |  |  |  +- "smilingFace"
R230  |  |  |  |  +- "beerMug"
R231  |  |  |  +- fill                                (type Paint) The fill of the Plan Bar, or of the Milestone Mark for a milestone; GRS
                                                      fills the Actual Bar from the same color. No key means no fill.
R232  |  |  |  +- stroke                              (type Stroke) The outline of the Plan Bar and the Actual Bar, or of the Milestone Mark
                                                      for a milestone.
R233  |  |  +- taskGroupId                            GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                                      never share an id; GRS writes the UUID in lower case.
R234  |  |  +- importOrigin                           A task made in GRS has no importOrigin.
R235  |  |  |  +- sourceProjectUid
R236  |  |  |  +- sourceTaskUid                       The value can differ from uid, because GRS may give the imported task a new uid.
R237  |  |  |  +- importSessionId                     This id stands in for sourceProjectUid when the MSPDI file had no Project UID.
R238  |  |  |  +- mspdiImportCountWhenLastIncluded    A copy of scheduleData.mspdiImportCount at the last import whose file contained this
                                                      task. A value below the current count means that the latest import left this task out.
R239  |  |  +- passthrough                            Only for a task that GRS made or whose dates a person changed, GRS rebuilds Duration and
                                                      ManualStart, ManualFinish and ManualDuration, writes ConstraintType and ConstraintDate,
                                                      and leaves out FreeSlack, TotalSlack, StartSlack and FinishSlack; GRS rebuilds
                                                      ActualDuration after a person changes the actual dates.
R240  |  +- predecessorLinks[] [M] (PredecessorLink)
R241  |     +- predecessorUid [M]                     The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R242  |     +- type [M]
R243  |     |  +- 0
R244  |     |  +- 1
R245  |     |  +- 2
R246  |     |  +- 3
R247  |     +- linkLag [M]                            The lag in tenths of a minute, whatever lagFormat says: 4800 is 480 minutes, one working
                                                      day when project.minutesPerDay is 480.
R248  |     +- lagFormat [M]                          GRS counts the lag only for 3, 5 and 7, and for other codes only shows the lag. When
                                                      lagFormat is absent, GRS shows the lag in minutes, such as 2880m, and leaves the lag out
                                                      of the count.
R249  |     |  +- 3
R250  |     |  +- 4
R251  |     |  +- 5
R252  |     |  +- 6
R253  |     |  +- 7
R254  |     |  +- 8
R255  |     |  +- 9
R256  |     |  +- 10
R257  |     |  +- 11
R258  |     |  +- 12
R259  |     |  +- 19
R260  |     |  +- 20
R261  |     |  +- 35..44
R262  |     |  +- 51
R263  |     |  +- 52
R264  |     +- grs [G]
R265  |        +- passthrough                         The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R266  +- passthroughTasks[]                           The whole MSPDI Task elements outside tasks[], such as the project summary task, which
                                                      GRS writes first.
R267  |  +- precedingTaskUid                          The uid of the nearest task in tasks[] that precedes this element in MSPDI. No key puts
                                                      the element first; equal values keep array order.
R268  |  +- mspdiElement                              One whole MSPDI element that GRS does not hold as an entity, keyed by child element
                                                      names.
R269  +- resources[] [M]                              GRS lists the resources in the Resource List Window and shows the resources of each task
                                                      in the Assignee Label.
R270  |  +- uid [M]                                   The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R271  |  +- name [M]
R272  |  +- type [M]                                  Every resource has the same keys, whatever the code.
R273  |  |  +- 0
R274  |  |  +- 1
R275  |  +- isCostResource [M]
R276  |  +- calendarUid [M]                           GRS keeps this value only to write it back to MSPDI.
R277  |  +- grs [G]
R278  |     +- passthrough                            The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R279  +- passthroughResources[]
R280  |  +- precedingResourceUid                      The uid of the nearest resource in resources[] that precedes this element in MSPDI. No
                                                      key puts the element first; equal values keep array order.
R281  |  +- mspdiElement                              One whole MSPDI element that GRS does not hold as an entity, keyed by child element
                                                      names.
R282  +- assignments[] [M]
R283  |  +- uid [M]                                   The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R284  |  +- taskUid [M]                               The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R285  |  +- resourceUid [M]                           The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                      array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                      GRS never reuses a uid.
R286  |  +- grs [G]
R287  |     +- passthrough                            The MSPDI child elements of one entity that GRS does not use, keyed by element name. GRS
                                                      writes them back unchanged in MSPDI schema order, repeats in array order.
R288  +- passthroughAssignments[]
R289     +- precedingAssignmentUid                    The uid of the nearest assignment in assignments[] that precedes this element in MSPDI.
                                                      No key puts the element first; equal values keep array order.
R290     +- mspdiElement                              One whole MSPDI element that GRS does not hold as an entity, keyed by child element
                                                      names.
```

### Schedule data (the GRS part)

```text
R291  scheduleData
R292  +- taskGroups[]                     The task groups, depth first, as a tree of drawing rows separate from the WBS; GRS
                                          builds this list from the WBS when reading MSPDI.
R293  |  +- id                            GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R294  |  +- name                          When the key is absent, GRS shows an empty title.
R295  |  +- parentTaskGroupId             When the key is absent, the task group is a top-level task group (depth 1).
R296  |  +- siblingIndex                  GRS lists the task groups from the smallest value at the top; task groups without
                                          siblingIndex follow, in array order.
R297  |  +- style                         When style is absent, GRS leaves the Task Group Lane uncolored.
R298  |  |  +- color                      (type TaskGroupColor)
R299  |  +- minHeightPx                   Vertical zoom leaves this minimum unchanged.
R300  |  +- representativeTaskUid         The uid of the WBS task that this task group stands for. When a person nests this task
                                          group under another, GRS moves that task in the WBS to match.
R301  |  +- hyperlinkAddress
R302  |  +- hyperlink                     The title of the task group link, not the address.
R303  |  +- showMode                      What a person wants for this task group. "shown": GRS draws the task group at any depth
                                          unless an ancestor hides the task group. "hidden": GRS hides the task group and every
                                          task group below, even on zoom or Zoom to Fit, until a person shows the task group
                                          again. "automatic": GRS decides from automaticallyShownDepth, the pins and the path to a
                                          shown task group below. "hiddenUntilZoomIn": GRS hides the task group and every task
                                          group below until the next vertical zoom-in, and then changes the value to "automatic".
R304  |  |  +- "shown"
R305  |  |  +- "hidden"
R306  |  |  +- "automatic"
R307  |  |  +- "hiddenUntilZoomIn"
R308  |  +- allowedEditorGroupName        The name of the group of people allowed to edit the tasks in this task group. GRS treats
                                          those tasks as read-only for every person and AI agent, because GRS alone holds no group
                                          of its own, and refuses moves into a task group with another value.
R309  +- baselineTasks[]                  The baseline, a saved copy of earlier task dates. Baseline tasks hold no shape: each
                                          Baseline Outline takes the shape of the current task with the same uid.
R310  |  +- uid                           The identifier of a task, a resource, an assignment or a calendar, unique within one
                                          array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                          GRS never reuses a uid.
R311  |  +- name
R312  |  +- start                         A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                          writes a date-time. GRS reads the value to the minute and ignores the seconds.
R313  |  +- finish                        A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                          writes a date-time. GRS reads the value to the minute and ignores the seconds.
R314  |  +- milestone
R315  +- highlightBoxes[]                 The Highlight Boxes: rectangles in the Task Group Lanes that mark a range of days over a
                                          range of task groups.
R316  |  +- id                            GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R317  |  +- style
R318  |  |  +- cornerRadiusPx
R319  |  |  +- fill                       (type Paint)
R320  |  |  +- stroke                     (type Stroke)
R321  |  +- firstDay                      The first day that the Highlight Box covers, as a day in the time zone of
                                          scheduleData.scheduleDataTimeZone.
R322  |  +- lastDay                       A date without a time of day, in the time zone that each key names where that matters. A
                                          range of days (firstDay to lastDay) includes both ends.
R323  |  +- firstTaskGroupId              The box covers every task group through lastTaskGroupId in task group tree order, both
                                          ends included.
R324  |  +- lastTaskGroupId               GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R325  +- commentBoxes[]                   The Comment Boxes in the Task Group Lanes. The Leader Line of each Comment Box points at
                                          a task, a Highlight Box or a free point.
R326     +- id                            GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R327     +- text
R328     +- style
R329     |  +- fill                       (type Paint)
R330     |  +- stroke                     (type Stroke) When the key is absent, GRS draws no outline and no Leader Line.
R331     |  +- font
R332     |     +- color                   (type Color)
R333     |     +- sizePx                  Horizontal and vertical zoom leave this size unchanged.
R334     +- leaderTarget                  When the target is deleted in GRS, GRS turns this object into a free point; when the
                                          file names a target that the Schedule Data lacks, GRS draws no Leader Line.
R335     |  +- type
R336     |  |  +- "freePoint"
R337     |  |  +- "task"
R338     |  |  +- "highlightBox"
R339     |  +- dateTime                   A local date and time in scheduleData.scheduleDataTimeZone with no offset, as MSPDI
                                          writes a date-time. GRS reads the value to the minute and ignores the seconds.
R340     |  +- taskGroupId                GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R341     |  +- taskGroupTopOffsetPercent  Only when type is "freePoint". How far the Leader Anchor lies below the top edge of that
                                          Task Group Lane, in percent of the lane height.
R342     |  +- taskUid                    The identifier of a task, a resource, an assignment or a calendar, unique within one
                                          array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                          GRS never reuses a uid.
R343     |  +- snapPart                   Only when type is "task". "milestoneMark" on a milestone, "planBar" or "actualBar" on
                                          other tasks. GRS hides the Comment Box while the named part is not drawn.
R344     |  |  +- "planBar"
R345     |  |  +- "actualBar"
R346     |  |  +- "milestoneMark"
R347     |  +- highlightBoxId             GRS uses a UUID as the id of an object that only GRS defines, so that objects made apart
                                          never share an id; GRS writes the UUID in lower case.
R348     |  +- snapPoint
R349     |     +- "topLeftCorner"
R350     |     +- "topMiddle"
R351     |     +- "topRightCorner"
R352     |     +- "rightMiddle"
R353     |     +- "bottomRightCorner"
R354     |     +- "bottomMiddle"
R355     |     +- "bottomLeftCorner"
R356     |     +- "leftMiddle"
R357     +- bodyOffsetPx                  The offset from the Leader Anchor to the lower-left corner of the Comment Box body;
                                          horizontal and vertical zoom leave this offset unchanged.
R358     |  +- dx
R359     |  +- dy                         A positive value moves the box down.
R360     +- hyperlinkAddress
R361     +- hyperlink                     The title of the Comment Box link, not the address.
```

### Shared types

```text
R362  Color
R363  +- type                                    "theme": GRS takes the theme color for the place that holds this color, in the hue of
                                                 documentSettings.themeHue. With "custom", GRS calculates a side that light or dark lacks
                                                 from the other side.
R364  |  +- "theme"
R365  |  +- "palette"
R366  |  +- "custom"
R367  +- name                                    Only when type is "palette". Each name says how the color looks in the light theme; in
                                                 the dark theme GRS keeps the hue and inverts the lightness.
R368  |  +- "white"
R369  |  +- "black"
R370  |  +- "dimGray"
R371  |  +- "lightGray"
R372  |  +- "red"
R373  |  +- "blue"
R374  |  +- "yellow"
R375  |  +- "green"
R376  |  +- "orange"
R377  |  +- "purple"
R378  +- light
R379  |  +- hexColor
R380  |  +- isCalculatedFromOppositeColorScheme  A mark on a side that GRS calculated from the opposite side, as a record of origin and
                                                 not a switch.
R381  +- dark
R382     +- hexColor
R383     +- isCalculatedFromOppositeColorScheme  A mark on a side that GRS calculated from the opposite side, as a record of origin and
                                                 not a switch.
R384  TaskGroupColor
R385  Paint
R386  +- color                                   (type Color)
R387  +- opacityPercent
R388  Stroke
R389  +- color                                   (type Color)
R390  +- opacityPercent
R391  +- widthPx                                 Horizontal and vertical zoom leave this width unchanged.
R392  ShapeStyle
R393  +- fill                                    (type Paint)
R394  +- stroke                                  (type Stroke) When the key is absent, GRS draws no outline.
R395  ColumnFilter
R396  +- type                                    An absent firstDay or lastDay leaves that end open.
R397  |  +- "values"
R398  |  +- "dateRange"
R399  +- column                                  The same name means the same content in every table. Search Window, task table:
                                                 "progressStatus", "percentComplete", "taskType", "taskName", "resourceNames", "start",
                                                 "finish", "actualStart", "actualFinish", "taskGroupPath" (the path from the top level).
                                                 Search Window, Comment Box table: "text", "taskGroupName" (the task group of the Leader
                                                 Anchor), "leaderTargetDay" (the day of the Leader Anchor).
R400  |  +- "progressStatus"
R401  |  +- "percentComplete"
R402  |  +- "taskType"
R403  |  +- "taskName"
R404  |  +- "resourceNames"
R405  |  +- "start"
R406  |  +- "finish"
R407  |  +- "actualStart"
R408  |  +- "actualFinish"
R409  |  +- "taskGroupPath"
R410  |  +- "text"
R411  |  +- "taskGroupName"
R412  |  +- "leaderTargetDay"
R413  |  +- "diagnosisStatus"
R414  |  +- "planDates"
R415  |  +- "actualDates"
R416  |  +- "diagnosisReason"
R417  |  +- "resourceSelectionStatus"
R418  |  +- "resourceName"
R419  |  +- "assignedTaskCount"
R420  |  +- "assignedTaskNames"
R421  +- hiddenValues[]                          Only when type is "values". The values whose rows the filter hides: the status key
                                                 listed below for a status column, and the cell text as the table shows the text for any
                                                 other column. "progressStatus": "notStarted", "inProgress", "suspendedWithResumeDate",
                                                 "suspendedWithoutResumeDate", "finished", "delay", and, while GRS shows Delay
                                                 Diagnostics results, the diagnosis marks "unreliable", "bottleneck", "bottleneckPath";
                                                 "diagnosisStatus": "unreliable", "suspicion", "omission", "bottleneck",
                                                 "bottleneckPath", "delay", "finishedDelayContribution"; "taskType": "task", "milestone";
                                                 "resourceSelectionStatus": "selected", "notSelected".
R422  +- isBlankHidden
R423  +- firstDay                                Only when type is "dateRange". The first day that the filter keeps, as a day in the time
                                                 zone of scheduleData.scheduleDataTimeZone.
R424  +- lastDay                                 A date without a time of day, in the time zone that each key names where that matters. A
                                                 range of days (firstDay to lastDay) includes both ends.
R425  ColumnSort
R426  +- column                                  The same name means the same content in every table. Search Window, task table:
                                                 "progressStatus", "percentComplete", "taskType", "taskName", "resourceNames", "start",
                                                 "finish", "actualStart", "actualFinish", "taskGroupPath" (the path from the top level).
                                                 Search Window, Comment Box table: "text", "taskGroupName" (the task group of the Leader
                                                 Anchor), "leaderTargetDay" (the day of the Leader Anchor).
R427  +- direction
R428     +- "ascending"
R429     +- "descending"
R430  TaskTableWindow
R431  +- isScheduleFilteredByChecks              Filter Schedule by Checks, on or off: when true, GRS draws on the Schedule Canvas only
                                                 the tasks checked in this table. The table itself keeps every row.
R432  +- checkedTaskUids[]                       The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                 array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                 GRS never reuses a uid.
R433  +- columnFilters[]                         (type ColumnFilter) The column filters of this table, one for each filtered column.
R434  +- columnSort                              (type ColumnSort)
R435  ResourceTableWindow
R436  +- isScheduleFilteredByChecks              Filter Schedule by Checks, on or off: when true, GRS draws on the Schedule Canvas only
                                                 the tasks of checked resources, plus unassigned tasks when isUnassignedChecked is true.
R437  +- isUnassignedChecked
R438  +- checkedResourceUids[]                   The identifier of a task, a resource, an assignment or a calendar, unique within one
                                                 array, the same as MSPDI UID, whether the entity came from MSPDI or GRS made the entity;
                                                 GRS never reuses a uid.
R439  +- columnFilters[]                         (type ColumnFilter) The column filters of this table, one for each filtered column.
R440  +- columnSort                              (type ColumnSort)
```

### Root description of the schema

```text
Terms:
GRS is GoodRelax Scheduler, which opens and edits a Schedule Document and reads and writes GRS JSON
files, the format that this GRS JSON Schema defines.
MSPDI (Microsoft Project XML Data Interchange) is the XML file format that Microsoft Project uses.
GRS can also read and write MSPDI (.xml) files.
A key inside an MSPDI object (project, calendars, tasks, resources, assignments and their parts) has
the meaning and values of the MSPDI element of the same name; only grs, parentTaskUid and
siblingIndex are GRS's own, and a description notes what GRS does differently.
Concepts:
WBS is the tree of parent and child tasks, as in MSPDI.
Task groups are GRS's own objects that let GRS draw several tasks in one Task Group Lane. Each task
names exactly one task group in grs.taskGroupId.
An MSPDI object keeps the values that only GRS uses under the key grs of that object.
GRS counts working days using a single calendar: the calendar that project.calendarUid names.
Passthrough: GRS keeps the MSPDI values that GRS does not use in grs.passthrough of each object, and
the MSPDI elements that GRS does not turn into objects in the passthrough lists; GRS writes both
back to MSPDI unchanged.
Actual dates are the authoritative source of task progress. GRS decides from the actual dates of a
task, together with resume and resumeValid, whether the task is not started, in progress, suspended,
or finished. GRS recalculates percentComplete from those dates when GRS opens a GRS JSON file.
Delay Diagnostics: GRS never stores Delay Diagnostics results in a GRS JSON file, because a stored
result goes out of date as soon as the Schedule Document changes.
When a person starts Delay Diagnostics or an AI agent asks for Delay Diagnostics, GRS calculates the
results from the current Schedule Data and project.statusDate.
While GRS shows Delay Diagnostics results, GRS keeps those results and does not recalculate them.
The shape of GRS JSON:
$schema           Address of this schema
schemaVersionUtc  Version of the shape
buildVersionUtc   GRS build that wrote the file
documentStamp     Last change, last save and last editor
documentSettings  How GRS shows the schedule on opening
scheduleData      Schedule data
  +- head values: scheduleDataTimeZone, sourceFormat, importedTopTaskOutlineLevel, mspdiImportCount, lastMspdiImport, highestIssuedUid
  +- same as MSPDI: project, calendars, tasks, resources, assignments
  +- passthrough lists: passthroughCalendars, passthroughTasks, passthroughResources, passthroughAssignments
  +- GRS only: taskGroups, baselineTasks, highlightBoxes, commentBoxes
changeLogEntries  Notes on changes
Omit a property that has no value: never write null or [].
```
