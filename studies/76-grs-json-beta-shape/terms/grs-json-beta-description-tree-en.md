# GRS JSON β のスキーマ —— 説明の木（英語版）

- 生成物（`JDG-3760`・`JDG-3761`・`JDG-3764`）。キー・順・列挙の値・英語の説明は、すべて `grs-json-beta.schema.json` から作った。作り直し: `python schema_to_review_tree.py english-num`。
- 日本語版は `grs-json-beta-description-tree-ja.md`。行番号 R001〜R440 は両方と `grs-json-final-review-tree.md` で同じ。

### Root and records

```text
R001  ScheduleDocument             GRS JSON document
R002  +- $schema                   The address of the latest GRS schema; every document holds the same address.
R003  +- schemaVersionUtc          The UTC time when the shape of GRS JSON, meaning the keys and the rules, last changed.
R004  +- buildVersionUtc           The UTC time when someone built the GRS program that wrote this file. This value serves
                                   debugging only; schemaVersionUtc tells whether GRS can read the file.
R005  +- documentStamp             The Document Stamp: when the Schedule Data and the Schedule Document last changed, when
                                   GRS last saved the file, and who last edited the Schedule Document.
R006  |  +- scheduleDataUpdatedAt  The time in UTC when the Schedule Data last changed. A change of documentSettings alone
                                   does not move this time.
R007  |  +- documentUpdatedAt      The time in UTC when the Schedule Document last changed, whether in the Schedule Data or
                                   in documentSettings.
R008  |  +- fileSavedAt            The time in UTC when GRS last saved the Schedule Document to a file. The key is absent
                                   until the first save.
R009  |  +- lastEditedBy           Who last edited the Schedule Document. GRS always writes this key, also while the
                                   Schedule Document is still the bundled template.
R010  |     +- type                "user": a person edited the Schedule Document on the screen. "agent": an AI edited the
                                   Schedule Document through the Agent API. "template": nobody has edited yet, so the
                                   Schedule Document is still the template that comes with GRS.
R011  |     |  +- "user"
R012  |     |  +- "template"
R013  |     |  +- "agent"
R014  |     +- name                The name of the editor: for "agent", the name that the AI reports; for "user", the name
                                   of the person, only when GRS knows the name.
R015  +- documentSettings          How GRS shows the schedule on opening
R016  +- scheduleData              Schedule data
R017  +- changeLogEntries[]        The Change Log: notes that people or an AI write about changes to the Schedule Document,
                                   oldest first. GRS adds a new entry at the end.
R018     +- changedAt              The time in UTC when the change happened. GRS fills in the time when GRS adds the entry;
                                   a person may change the time later.
R019     +- changedBy              Who made the change: the kind of editor and the name.
R020     |  +- editorType          The kind of editor that wrote this entry; GRS fills in the value. "user": a person wrote
                                   the entry on the screen; "agent": an AI wrote the entry through the Agent API.
R021     |  |  +- "user"
R022     |  |  +- "agent"
R023     |  +- name                The name of the editor: the name that a person typed, or the name that an AI reported.
R024     +- affectedArea           The part of the Schedule Document that the change touched, in free text, for example
                                   "tasks" or the name of one task.
R025     +- changeDescription      What changed, in free text.
R026     +- reason                 The reason for the change, in free text.
R027     +- remarks                Anything else about the change that the other keys do not hold, in free text.
```

### Document settings

```text
R028  documentSettings                              The Document Settings: how GRS shows the Schedule Document when GRS opens the Schedule
                                                    Document. GRS writes the keys from the widest effect to the narrowest.
R029  +- displayScaleRatio                          The scale of the Schedule Canvas, as a ratio to the normal size. GRS multiplies the
                                                    values of keys ending in Px by this ratio when drawing, and saves those values unscaled.
R030  +- fontSizePreset                             The text size step of the Schedule Canvas. GRS holds the pixel size of each step, and
                                                    displayScaleRatio scales that size.
R031  |  +- "small"
R032  |  +- "medium"
R033  |  +- "large"
R034  +- isThemeMonochrome                          GRS draws every color in monochrome when this value is true: the theme colors, the
                                                    palette colors and the custom colors. This value changes only the drawing; the colors
                                                    saved in the Schedule Document stay the same.
R035  +- themeHue                                   The name of the hue of the theme. Every color written as {"type": "theme"} takes this
                                                    hue; GRS holds the hue angle of each name.
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
                                                    "fixed": GRS shows date-times at the offset in utcOffset.
R048  |  |  +- "sameAsScheduleData"
R049  |  |  +- "fixed"
R050  |  +- utcOffset                               Write this key only when type is "fixed". The UTC offset in which GRS shows date-times,
                                                    such as "+09:00". The offset is standard time; GRS never adds daylight saving time.
R051  +- additionalTimeZones[]                      The Additional Time Zones, clocks that GRS shows besides the Display Base Time Zone.
                                                    While GRS shows times of day, each clock adds a row under the Time Ruler.
R052  |  +- utcOffset                               The UTC offset of this clock, such as "-04:00". The offset already includes any daylight
                                                    saving time, and GRS uses the offset all year.
R053  |  +- zoneNameType                            The kind of zone name that GRS shows for this clock; this value does not change the
                                                    offset. "standard": the standard-time name; "daylight": the daylight-time name.
R054  |     +- "standard"
R055  |     +- "daylight"
R056  +- isTimeOfDayVisible                         GRS shows the time of day on the Schedule Canvas, for the whole Schedule Document, when
                                                    this value is true. The saved date-times keep their time either way.
R057  +- dayWidthPx                                 The Day Width (the horizontal zoom): the width of one calendar day on the Time Ruler, in
                                                    CSS pixels at displayScaleRatio 1. Zoom to Fit sets this value.
R058  +- fitDayRange                                The Fit Span: the days that Zoom to Fit and PNG and SVG pictures show. This range does
                                                    not limit which tasks GRS saves or writes to MSPDI.
R059  |  +- type                                    "fixed": the Fit Span runs from firstDay to lastDay with no margin, and those two whole
                                                    days touch the edges of the Task Group Lanes. "automatic": the Fit Span covers
                                                    everything that GRS draws, plus a margin that GRS fixes and does not save; GRS keeps no
                                                    firstDay or lastDay.
R060  |  |  +- "fixed"
R061  |  |  +- "automatic"
R062  |  +- firstDay                                Write this key only when type is "fixed". The first day of the Fit Span (included), as a
                                                    day in the Display Base Time Zone.
R063  |  +- lastDay                                 Write this key only when type is "fixed". The last day of the Fit Span; the Fit Span
                                                    includes this whole day.
R064  +- verticalZoom                               The two values that one step of vertical zoom and Zoom to Fit change together. When this
                                                    key is absent, GRS chooses both values as Zoom to Fit does; when only
                                                    automaticallyShownDepth is absent, GRS chooses that value as Zoom to Fit does.
R065  |  +- ratio                                   The vertical size of the Task Graphics as a ratio to the default size: 2 draws Plan
                                                    Bars, Actual Bars and Name Labels twice as tall.
R066  |  +- automaticallyShownDepth                 The depth to which GRS shows task groups with showMode "automatic". A zoom-in step
                                                    changes ratio only after this value reaches the depth of the deepest task group in the
                                                    Schedule Document; ratio never sets this value.
R067  +- taskGroupPanelWidthPx                      The width of the Task Group Panel, in CSS pixels when displayScaleRatio is 1.
R068  +- isTaskGroupPanelWidthFixed                 GRS always draws the Task Group Panel at taskGroupPanelWidthPx. true: a person changes
                                                    taskGroupPanelWidthPx in the document settings, and the Panel Divider stays fixed;
                                                    false: a drag of the Panel Divider changes taskGroupPanelWidthPx.
R069  +- pinnedTaskGroupIds[]                       The ids of the Pinned Task Groups, which stay at the top during vertical scrolling. A
                                                    pin shows the task group at any depth if showMode is "automatic", never if "hidden".
R070  +- taskPlacementDirection                     The Placement Direction: how GRS stacks the overlapping tasks of one Task Group Lane on
                                                    Stack Tiers, earliest task first; this value does not order the task groups.
                                                    "bottomToTop": the earliest task goes on the lowest tier; "topToBottom": the earliest
                                                    task goes on the top tier.
R071  |  +- "bottomToTop"
R072  |  +- "topToBottom"
R073  +- scrollPosition                             Where the view of the Schedule Canvas starts when GRS opens the Schedule Document.
R074  |  +- type                                    "automatic": nobody has chosen a place, so GRS chooses one on opening; this value does
                                                    not mean today or the status date. "fixed": the four keys below give the place.
R075  |  |  +- "automatic"
R076  |  |  +- "fixed"
R077  |  +- leftEdgeDay                             Write this key only when type is "fixed". The day at the left edge of the view, as a day
                                                    in the time zone of scheduleData.scheduleDataTimeZone.
R078  |  +- leftEdgeDayOffsetPercent                Only when type is "fixed". How far the left edge lies to the right of the start of
                                                    leftEdgeDay, in percent of one day; 0 is the start of the day.
R079  |  +- topEdgeTaskGroupId                      Write this key only when type is "fixed". The id of the task group at the top edge of
                                                    the view. When that task group no longer exists, GRS treats the scroll position as
                                                    "automatic".
R080  |  +- topEdgeTaskGroupOffsetPercent           Only when type is "fixed". How far the top edge lies below the top of that task group,
                                                    not of the screen, in percent of the lane height plus the gap below.
R081  +- scheduleCanvasElements                     Which elements GRS draws on the Schedule Canvas: true draws the element, and false hides
                                                    the element. GRS writes the keys in this order: bars, labels, lines.
R082  |  +- isPlanBarVisible                        GRS draws the Plan Bars when this value is true; isActualBarVisible controls the Actual
                                                    Bars separately.
R083  |  +- isActualBarVisible                      GRS draws the Actual Bars when this value is true; isPlanBarVisible controls the Plan
                                                    Bars separately.
R084  |  +- isBaselineOutlineVisible                GRS draws the Baseline Outline when this value is true: the baseline (baselineTasks)
                                                    drawn over the current tasks.
R085  |  +- isAssigneeLabelVisible                  GRS draws the Assignee Label of each task when this value is true.
R086  |  +- isPercentCompleteLabelVisible           GRS draws the Percent Complete Label of each task when this value is true.
R087  |  +- isProgressStatusMarkVisible             When this value is true, GRS draws the Resume Marks and the Progress Status Marks, which
                                                    show progress status by shape past the Actual Bar end, not on the Progress Line.
R088  |  +- isPlanDatesVisible                      GRS draws the planned start and finish dates to the right of each Name Label when this
                                                    value is true.
R089  |  +- isDependencyLineVisible                 GRS draws the Dependency Lines when this value is true.
R090  |  +- isProgressLineVisible                   GRS draws the Progress Line when this value is true: one zigzag line from the status
                                                    date through the task progress point of each task.
R091  |  +- isDateGridLinesVisible                  GRS draws the Date Grid Lines when this value is true: vertical lines at each date.
R092  |  +- isTaskGroupGridLinesVisible             GRS draws the Task Group Grid Lines when this value is true: horizontal lines between
                                                    task groups, in the Task Group Lanes and in the Task Group Panel.
R093  +- delayDiagnosisSettings                     The settings of Delay Diagnostics that belong to the Schedule Document.
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
R097     +- delayDiagnosisReportWindow              (type TaskTableWindow) The table settings of the Delay Diagnostics Report Window.
R098     +- resourceListWindow                      (type ResourceTableWindow) The table settings of the Resource List Window.
```

### Schedule data (head values and the MSPDI part)

```text
R099  scheduleData                                    The Schedule Data: six head values, then the MSPDI part, which GRS reads from and writes
                                                      to MSPDI, then the GRS part, which only GRS defines.
R100  +- scheduleDataTimeZone                         The time zone of the date-times in scheduleData, which carry no offset; GRS does not
                                                      write this zone to MSPDI. Record times such as documentStamp use UTC.
R101  |  +- utcOffset                                 The fixed offset from UTC in standard time; GRS never switches to daylight saving time.
                                                      GRS refuses to open a file with an offset outside this list.
R102  +- sourceFormat                                 Which format this Schedule Document came from; GRS does not write this value to MSPDI.
                                                      "grs": made in GRS; "mspdi12" and "mspdi15": an MSPDI file in the form of MS Project
                                                      version 12 or 15.
R103  |  +- "grs"
R104  |  +- "mspdi12"
R105  |  +- "mspdi15"
R106  +- importedTopTaskOutlineLevel                  The MSPDI OutlineLevel of the top tasks in the imported file, not counting the project
                                                      summary task; GRS gives this OutlineLevel to the top WBS tasks when writing MSPDI.
R107  +- mspdiImportCount                             The number of MSPDI imports into this Schedule Document. At each import, GRS adds 1 and
                                                      copies the new value to grs.importOrigin.mspdiImportCountWhenLastIncluded of each
                                                      imported task.
R108  +- lastMspdiImport                              The time when GRS last imported an MSPDI file, and the file name; this object is absent
                                                      before the first import. People and AI agents read this object; GRS compares
                                                      mspdiImportCount instead.
R109  |  +- importedAt                                The UTC time when GRS imported the MSPDI file.
R110  |  +- fileName                                  The name of the imported MSPDI file, such as "plan-v3.xml". GRS writes the file name
                                                      only, never the folder, so that the file keeps no personal path.
R111  +- highestIssuedUid                             The highest uid that GRS has issued, one counter for tasks, resources, assignments and
                                                      calendars. GRS gives a new entity this value plus 1 and never reuses a uid.
R112  +- project [M]                                  Same as MSPDI Project. scheduleData.project holds only the values for the whole project:
                                                      the MSPDI lists (calendars, tasks, resources, assignments) sit beside project in
                                                      scheduleData, not inside project as in MSPDI.
R113  |  +- uid [M]                                   Same as MSPDI UID. Before writing over another file, GRS treats that file as the same
                                                      Schedule Document only when project.uid, project.name and the file name all match; an
                                                      absent value never matches.
R114  |  +- name [M]                                  Same as MSPDI Name. GRS also uses the value, with project.uid and the file name, to tell
                                                      whether an existing file holds the same Schedule Document.
R115  |  +- title [M]                                 Same as MSPDI Title. GRS shows the value as the Project Title in the App Header and
                                                      builds the default file name in the Save As Dialog from the value.
R116  |  +- subject [M]                               Same as MSPDI Subject.
R117  |  +- category [M]                              Same as MSPDI Category.
R118  |  +- company [M]                               Same as MSPDI Company.
R119  |  +- manager [M]                               Same as MSPDI Manager.
R120  |  +- author [M]                                Same as MSPDI Author. The author is not the last writer of the Schedule Document;
                                                      documentStamp.lastEditedBy holds that writer.
R121  |  +- creationDate [M]                          Same as MSPDI CreationDate. GRS writes the moment of creation when GRS makes a new
                                                      Schedule Document.
R122  |  +- revision [M]                              Same as MSPDI Revision. The number of times the tool that made the MSPDI file saved the
                                                      project; this value is not a GRS JSON version or a documentStamp time.
R123  |  +- startDate [M]                             Same as MSPDI StartDate.
R124  |  +- calendarUid [M]                           Same as MSPDI CalendarUID. GRS counts every working day with this calendar; without a
                                                      valid value, GRS uses the first calendar with isBaseCalendar true, or else a built-in
                                                      Monday-to-Friday calendar.
R125  |  +- defaultStartTime [M]                      Same as MSPDI DefaultStartTime. GRS gives this time of day to a start that GRS sets by
                                                      the day, and uses 08:00:00 when the key is absent. A milestone start takes
                                                      defaultFinishTime instead.
R126  |  +- defaultFinishTime [M]                     Same as MSPDI DefaultFinishTime. GRS gives this time of day to a finish that GRS sets by
                                                      the day and to a milestone start, and uses 17:00:00 when the key is absent.
R127  |  +- minutesPerDay [M]                         Same as MSPDI MinutesPerDay. The minutes in one working day (1d); GRS uses 480 when the
                                                      key is absent, and warns on opening when the working times of a day total otherwise.
R128  |  +- minutesPerWeek [M]                        Same as MSPDI MinutesPerWeek. The length of one working week in minutes.
R129  |  +- daysPerMonth [M]                          Same as MSPDI DaysPerMonth. The number of working days in one month.
R130  |  +- weekStartDay [M]                          Same as MSPDI WeekStartDay. Day-of-week code: 0=Sunday, 1=Monday, 2=Tuesday,
                                                      3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Sunday is 0 here but 1 in
                                                      calendars[].weekDays[].dayType. GRS starts each week of the Time Ruler on this day.
R131  |  |  +- 0
R132  |  |  +- 1
R133  |  |  +- 2
R134  |  |  +- 3
R135  |  |  +- 4
R136  |  |  +- 5
R137  |  |  +- 6
R138  |  +- statusDate [M]                            Same as MSPDI StatusDate. GRS draws the Status Line at this date-time and runs Delay
                                                      Diagnostics for this date. Without statusDate, GRS draws no Status Line and Delay
                                                      Diagnostics does not run.
R139  |  +- grs [G]                                   The values of this project that only GRS uses; here only passthrough.
R140  |     +- passthrough                            The MSPDI values of this project that GRS does not use and writes back to MSPDI
                                                      unchanged.
R141  +- calendars[] [M]                              Same as MSPDI Calendars. GRS counts every working day with the one calendar that
                                                      project.calendarUid names; GRS keeps the other calendars only to write those calendars
                                                      back to MSPDI.
R142  |  +- uid [M]                                   Same as MSPDI UID.
R143  |  +- name [M]                                  Same as MSPDI Name.
R144  |  +- isBaseCalendar [M]                        Same as MSPDI IsBaseCalendar. true marks a base calendar; no key means false. MSPDI
                                                      writes 1 or 0.
R145  |  +- baseCalendarUid [M]                       Same as MSPDI BaseCalendarUID. The calendar that this calendar inherits from in MSPDI.
                                                      GRS writes this value back but does not inherit: GRS counts only the days that this
                                                      calendar lists.
R146  |  +- grs [G]                                   The values of this calendar that only GRS uses; here only passthrough.
R147  |  |  +- passthrough                            The MSPDI values of this calendar that GRS does not use and writes back unchanged. A
                                                      whole Calendar element outside calendars[] goes to passthroughCalendars[].
R148  |  +- weekDays[] [M]                            Same as MSPDI WeekDays. Each item describes the day of the week that dayType names.
R149  |  |  +- dayType [M]                            Same as MSPDI DayType. Day-of-week code: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday,
                                                      5=Thursday, 6=Friday, 7=Saturday. Sunday is 1 here but 0 in project.weekStartDay. GRS
                                                      never uses the MSPDI code 0 (exception): calendars[].exceptions[] holds the exception
                                                      days.
R150  |  |  |  +- 1
R151  |  |  |  +- 2
R152  |  |  |  +- 3
R153  |  |  |  +- 4
R154  |  |  |  +- 5
R155  |  |  |  +- 6
R156  |  |  |  +- 7
R157  |  |  +- dayWorking [M]                         Same as MSPDI DayWorking. true means that the day of the week is a working day; no key
                                                      means false. MSPDI writes 1 or 0.
R158  |  |  +- grs [G]                                The values of this day of the week that only GRS uses; here only passthrough.
R159  |  |  |  +- passthrough                         The MSPDI values of this day of the week that GRS does not use and writes back to MSPDI
                                                      unchanged.
R160  |  |  +- workingTimes[] [M]                     Same as MSPDI WorkingTimes. On a working day without workingTimes, GRS uses 08:00-12:00
                                                      and 13:00-17:00. On a non-working day, GRS keeps workingTimes for MSPDI and counts no
                                                      working time.
R161  |  |     +- fromTime [M]                        Same as MSPDI FromTime.
R162  |  |     +- toTime [M]                          Same as MSPDI ToTime. 00:00:00 means 24:00, the end of the day.
R163  |  +- exceptions[] [M]                          Same as MSPDI Exceptions. Each item is one exception: a day or a range of days that
                                                      works differently from the days of the week, such as a holiday.
R164  |     +- name [M]                               Same as MSPDI Name.
R165  |     +- fromDate [M] (TimePeriod/FromDate)     Same as MSPDI TimePeriod/FromDate. The first day of the exception. GRS reads only the
                                                      date, and GRS writes T00:00:00 when GRS sets the date.
R166  |     +- toDate [M] (TimePeriod/ToDate)         Same as MSPDI TimePeriod/ToDate. The last day of the exception; the exception includes
                                                      that day. GRS reads only the date, so T00:00:00 still counts the whole day; GRS writes
                                                      T23:59:00.
R167  |     +- dayWorking [M]                         Same as MSPDI DayWorking. true makes the days of the exception working days; false or no
                                                      key makes those days non-working days, such as a holiday. MSPDI writes 1 or 0.
R168  |     +- type [M]                               Same as MSPDI Type. The repeat code: 1=daily, 2=yearly on a day of the month, 3=yearly
                                                      on a weekday position, 4=monthly on a day of the month, 5=monthly on a weekday position,
                                                      6=weekly, 7=by day count, 8=by weekday count, 9=no repeat. GRS counts working days with
                                                      a one-off exception only, which covers every day from fromDate to toDate: type 9, no
                                                      type, or type 1 (every day) with period 1 or no period; a new exception takes 1. GRS
                                                      keeps the other exceptions unchanged and leaves them out of the count.
R169  |     |  +- 1
R170  |     |  +- 2
R171  |     |  +- 3
R172  |     |  +- 4
R173  |     |  +- 5
R174  |     |  +- 6
R175  |     |  +- 7
R176  |     |  +- 8
R177  |     |  +- 9
R178  |     +- period [M]                             Same as MSPDI Period. The repeat interval for type, such as 2 with type 6 for every
                                                      second week. GRS uses period only to tell whether a type 1 exception is one-off.
R179  |     +- grs [G]                                The values of this exception that only GRS uses; here only passthrough.
R180  |     |  +- passthrough                         The MSPDI values of this exception that GRS does not use and writes back to MSPDI
                                                      unchanged.
R181  |     +- workingTimes[] [M]                     Same as MSPDI WorkingTimes. On a working exception, these spans replace the spans of the
                                                      day of the week; a working exception without workingTimes uses 08:00-12:00 and
                                                      13:00-17:00. On a non-working exception, GRS keeps workingTimes for MSPDI and counts no
                                                      working time.
R182  |        +- fromTime [M]                        Same as MSPDI FromTime.
R183  |        +- toTime [M]                          Same as MSPDI ToTime. 00:00:00 means 24:00, the end of the day.
R184  +- passthroughCalendars[]                       The whole MSPDI Calendar elements outside calendars[]. GRS writes each element back into
                                                      MSPDI right after the calendar that precedingCalendarUid names.
R185  |  +- precedingCalendarUid                      The uid of the nearest calendar in calendars[] that precedes this element in MSPDI. No
                                                      key puts the element first; equal values keep array order.
R186  |  +- mspdiElement                              The whole MSPDI element, keyed by the names of the child elements as in MSPDI. GRS
                                                      writes the element back unchanged.
R187  +- tasks[] [M]                                  Same as MSPDI Tasks. The order of this list carries no meaning: parentTaskUid and
                                                      siblingIndex give the WBS tree. GRS writes MSPDI tasks depth first along that tree and
                                                      rebuilds ID, OutlineLevel, OutlineNumber and Summary.
R188  |  +- uid [M]                                   Same as MSPDI UID.
R189  |  +- name [M]                                  Same as MSPDI Name.
R190  |  +- start [M]                                 Same as MSPDI Start. The planned start.
R191  |  +- finish [M]                                Same as MSPDI Finish. The planned finish; a milestone has the same start and finish.
R192  |  +- stop [M]                                  Same as MSPDI Stop. The date-time where the work so far stops on a task in progress or
                                                      suspended. GRS removes stop when GRS finishes the task; actualFinish then holds the end.
R193  |  +- resume [M]                                Same as MSPDI Resume. On a suspended task, the planned date-time when the remaining work
                                                      restarts (work split in two parts).
R194  |  +- resumeValid [M]                           Same as MSPDI ResumeValid. On a task with actualStart and no actualFinish, false means
                                                      suspended with no resume date, and GRS ignores resume; no key is not false. GRS writes
                                                      true with each resume date.
R195  |  +- milestone [M]                             Same as MSPDI Milestone. true for a milestone, and false or absent for a task with a
                                                      span of work, though MSPDI writes 1 or 0.
R196  |  +- percentComplete [M]                       Same as MSPDI PercentComplete. GRS recounts this value on opening: actual working time
                                                      (actualStart to actualFinish or stop) over planned working time, times 100, rounded,
                                                      uncapped. Without planned working time, the value is 100 after actualFinish, else 0. A
                                                      task with actualStart and neither actualFinish nor stop counts 0 actual working time.
R197  |  +- actualStart [M]                           Same as MSPDI ActualStart. A task without actualStart has not started.
R198  |  +- actualFinish [M]                          Same as MSPDI ActualFinish. Only a finished task has actualFinish; a percentComplete of
                                                      100 does not mean finished.
R199  |  +- calendarUid [M]                           Same as MSPDI CalendarUID. The calendar of this task alone. GRS keeps the value and
                                                      writes the value back, but GRS counts working days with project.calendarUid only.
R200  |  +- deadline [M]                              Same as MSPDI Deadline.
R201  |  +- hyperlink [M]                             Same as MSPDI Hyperlink. The title (display text) of the link, not the address;
                                                      hyperlinkAddress holds the URL.
R202  |  +- hyperlinkAddress [M]                      Same as MSPDI HyperlinkAddress. The URL of the link; hyperlink holds the title.
R203  |  +- notes [M]                                 Same as MSPDI Notes.
R204  |  +- parentTaskUid [G]                         The uid of the parent task in the WBS; a task without this key sits at the top. MSPDI
                                                      has no such element.
R205  |  +- siblingIndex [G]                          The place of this task among the tasks with the same parent, counted from 0. GRS writes
                                                      0, 1, 2 without gaps, reads the smallest first, and keeps array order on ties; siblings
                                                      without siblingIndex follow, in array order.
R206  |  +- grs [G]                                   The GRS values of this task. The keys under grs are GRS names, not MSPDI element names.
R207  |  |  +- startSlopeCalendarDays                 The Start Slope in calendar days: GRS slants the start edge of the Plan Bar inward, from
                                                      start toward finish, to mark a start that is not firm, without changing the schedule.
R208  |  |  +- finishSlopeCalendarDays                The Finish Slope in calendar days: GRS slants the finish edge of the Plan Bar inward,
                                                      from finish toward start, to mark a finish that is not firm, without changing the
                                                      schedule.
R209  |  |  +- style                                  How GRS draws the Task Graphic of this task: the shape, the fill and the stroke.
R210  |  |  |  +- taskShape                           The shape of the Plan Bar and the Actual Bar of a task that is not a milestone.
                                                      "rectangle"; "chevron": a bar with a notched start and a pointed finish; "arrow";
                                                      "dumbbell": a thin line with a dot at each end.
R211  |  |  |  |  +- "rectangle"
R212  |  |  |  |  +- "chevron"
R213  |  |  |  |  +- "arrow"
R214  |  |  |  |  +- "dumbbell"
R215  |  |  |  +- milestoneShape                      The shape of the Milestone Mark; each value names the picture that GRS draws, for
                                                      example diamond or star. Only a milestone has milestoneShape.
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
                                                      for a milestone. No key means no outline.
R233  |  |  +- taskGroupId                            The id of the task group in whose Task Group Lane GRS draws this task; the task group is
                                                      independent of the WBS parent (parentTaskUid).
R234  |  |  +- importOrigin                           Which MSPDI file and which task this task came from, for matching at later imports; a
                                                      task made in GRS has no importOrigin.
R235  |  |  |  +- sourceProjectUid                    The Project UID of the MSPDI file that GRS imported this task from; when that file had
                                                      no Project UID, the key is absent and importSessionId identifies the file.
R236  |  |  |  +- sourceTaskUid                       The UID of this task in that MSPDI file. The value can differ from uid, because GRS may
                                                      give the imported task a new uid.
R237  |  |  |  +- importSessionId                     The id that GRS made for the import that brought this task in. This id stands in for
                                                      sourceProjectUid when the MSPDI file had no Project UID.
R238  |  |  |  +- mspdiImportCountWhenLastIncluded    A copy of scheduleData.mspdiImportCount at the last import whose file contained this
                                                      task. A value below the current count means that the latest import left this task out.
R239  |  |  +- passthrough                            The MSPDI values of this task that GRS does not use; GRS writes them back unchanged.
                                                      Only for a task that GRS made or whose dates a person changed, GRS rebuilds Duration and
                                                      ManualStart, ManualFinish and ManualDuration, writes ConstraintType and ConstraintDate,
                                                      and leaves out FreeSlack, TotalSlack, StartSlack and FinishSlack; GRS rebuilds
                                                      ActualDuration after a person changes the actual dates. A whole Task element outside
                                                      tasks[] goes to passthroughTasks[].
R240  |  +- predecessorLinks[] [M] (PredecessorLink)  Same as MSPDI PredecessorLink. Each item is one dependency: this task waits for one end
                                                      of a predecessor task.
R241  |     +- predecessorUid [M]                     Same as MSPDI PredecessorUID. The uid of the predecessor task in tasks[].
R242  |     +- type [M]                               Same as MSPDI Type. The link type code: 0=FF (finish-to-finish), 1=FS (finish-to-start),
                                                      2=SF (start-to-finish), 3=SS (start-to-start); the first letter names the end of the
                                                      predecessor, and the second letter names the end of this task.
R243  |     |  +- 0
R244  |     |  +- 1
R245  |     |  +- 2
R246  |     |  +- 3
R247  |     +- linkLag [M]                            Same as MSPDI LinkLag. The lag in tenths of a minute, whatever lagFormat says: 4800 is
                                                      480 minutes, one working day when project.minutesPerDay is 480. No key means no lag.
R248  |     +- lagFormat [M]                          Same as MSPDI LagFormat. The unit code for showing the lag: 3=m, 4=em, 5=h, 6=eh, 7=d,
                                                      8=ed, 9=w, 10=ew, 11=mo, 12=emo, 19=%, 20=e%, 35=m?, 36=em?, 37=h?, 38=eh?, 39=d?,
                                                      40=ed?, 41=w?, 42=ew?, 43=mo?, 44=emo?, 51=%?, 52=e%? (m minutes, h hours, d days, w
                                                      weeks, mo months, % percent, e elapsed time, ? estimated). The unit never changes
                                                      linkLag; GRS counts the lag only for 3, 5 and 7, and for other codes only shows the lag.
                                                      When lagFormat is absent, GRS shows the lag in minutes, such as 2880m, and leaves the
                                                      lag out of the count.
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
R264  |     +- grs [G]                                The values of this link that only GRS uses; here only passthrough.
R265  |        +- passthrough                         The MSPDI values of this link that GRS does not use and writes back to MSPDI unchanged.
R266  +- passthroughTasks[]                           The whole MSPDI Task elements outside tasks[], such as the project summary task, which
                                                      GRS writes first. GRS writes each other element right after the task that
                                                      precedingTaskUid names.
R267  |  +- precedingTaskUid                          The uid of the nearest task in tasks[] that precedes this element in MSPDI, never a
                                                      dependency predecessor. No key puts the element first; equal values keep array order.
R268  |  +- mspdiElement                              The whole MSPDI element, keyed by the names of the child elements as in MSPDI. GRS
                                                      writes the element back unchanged.
R269  +- resources[] [M]                              Same as MSPDI Resources. GRS lists the resources in the Resource List Window and shows
                                                      the resources of each task in the Assignee Label.
R270  |  +- uid [M]                                   Same as MSPDI UID.
R271  |  +- name [M]                                  Same as MSPDI Name.
R272  |  +- type [M]                                  Same as MSPDI Type. Resource type code: 0=material, 1=work. Every resource has the same
                                                      keys, whatever the code.
R273  |  |  +- 0
R274  |  |  +- 1
R275  |  +- isCostResource [M]                        Same as MSPDI IsCostResource. true means a cost resource; no key means false. MSPDI
                                                      writes 1 or 0.
R276  |  +- calendarUid [M]                           Same as MSPDI CalendarUID. The calendar of this resource alone. GRS keeps the value and
                                                      writes the value back, but GRS counts working days with project.calendarUid only.
R277  |  +- grs [G]                                   The values of this resource that only GRS uses; here only passthrough.
R278  |     +- passthrough                            The MSPDI values of this resource that GRS does not use and writes back unchanged. A
                                                      whole Resource element outside resources[] goes to passthroughResources[].
R279  +- passthroughResources[]                       The whole MSPDI Resource elements outside resources[]. GRS writes each element back into
                                                      MSPDI right after the resource that precedingResourceUid names.
R280  |  +- precedingResourceUid                      The uid of the nearest resource in resources[] that precedes this element in MSPDI. No
                                                      key puts the element first; equal values keep array order.
R281  |  +- mspdiElement                              The whole MSPDI element, keyed by the names of the child elements as in MSPDI. GRS
                                                      writes the element back unchanged.
R282  +- assignments[] [M]                            Same as MSPDI Assignments. Each item puts one resource on one task.
R283  |  +- uid [M]                                   Same as MSPDI UID.
R284  |  +- taskUid [M]                               Same as MSPDI TaskUID. The uid of the task in tasks[].
R285  |  +- resourceUid [M]                           Same as MSPDI ResourceUID. The uid of the resource in resources[].
R286  |  +- grs [G]                                   The values of this assignment that only GRS uses; here only passthrough.
R287  |     +- passthrough                            The MSPDI values of this assignment that GRS does not use and writes back unchanged. A
                                                      whole Assignment element outside assignments[] goes to passthroughAssignments[].
R288  +- passthroughAssignments[]                     The whole MSPDI Assignment elements outside assignments[]. GRS writes each element back
                                                      into MSPDI right after the assignment that precedingAssignmentUid names.
R289     +- precedingAssignmentUid                    The uid of the nearest assignment in assignments[] that precedes this element in MSPDI.
                                                      No key puts the element first; equal values keep array order.
R290     +- mspdiElement                              The whole MSPDI element, keyed by the names of the child elements as in MSPDI. GRS
                                                      writes the element back unchanged.
```

### Schedule data (the GRS part)

```text
R291  scheduleData                        The Schedule Data: six head values, then the MSPDI part, which GRS reads from and writes
                                          to MSPDI, then the GRS part, which only GRS defines.
R292  +- taskGroups[]                     The task groups, depth first, as a tree of drawing rows separate from the WBS; GRS
                                          builds this list from the WBS when reading MSPDI.
R293  |  +- id                            The id of the task group, a random UUID.
R294  |  +- name                          The task group name that the Task Group Panel shows. When the key is absent, the task
                                          group has no name and GRS shows an empty title.
R295  |  +- parentTaskGroupId             The id of the parent task group. When the key is absent, the task group is a top-level
                                          task group (depth 1).
R296  |  +- siblingIndex                  The place of this task group among the task groups with the same parent, counted from 0.
                                          GRS lists the task groups from the smallest value at the top; task groups without
                                          siblingIndex follow, in array order.
R297  |  +- style                         How GRS draws the task group (type TaskGroupStyle). When style is absent, GRS leaves the
                                          Task Group Lane uncolored.
R298  |  |  +- color                      (type TaskGroupColor) The color of the Task Group Lane; {"type": "theme"} draws the
                                          theme color.
R299  |  +- minHeightPx                   The minimum height of the Task Group Lane in CSS pixels at displayScaleRatio 1; vertical
                                          zoom does not change this height. No key means no minimum.
R300  |  +- representativeTaskUid         The uid of the WBS task that this task group stands for. When a person nests this task
                                          group under another, GRS moves that task in the WBS to match.
R301  |  +- hyperlinkAddress              The URL that the task group links to. When the key is absent, the task group has no
                                          link.
R302  |  +- hyperlink                     The title of the task group link, not the address. When the key is absent, the link has
                                          no title.
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
R310  |  +- uid                           The uid of the current task that this baseline task belongs to.
R311  |  +- name                          The task name at the time of the baseline.
R312  |  +- start                         The planned start at the time of the baseline.
R313  |  +- finish                        The planned finish at the time of the baseline.
R314  |  +- milestone                     Whether the task was a milestone at the time of the baseline; GRS still draws the
                                          outline in the shape of the current task.
R315  +- highlightBoxes[]                 The Highlight Boxes: rectangles in the Task Group Lanes that mark a range of days over a
                                          range of task groups.
R316  |  +- id                            The id of the Highlight Box, a random UUID.
R317  |  +- style                         How GRS draws the Highlight Box (type HighlightBoxStyle).
R318  |  |  +- cornerRadiusPx             The corner radius of the Highlight Box, in CSS pixels at displayScaleRatio 1; 0 gives
                                          square corners.
R319  |  |  +- fill                       (type Paint) The fill of the Highlight Box (type Paint). The fill always has a color;
                                          opacityPercent 0 makes the fill invisible.
R320  |  |  +- stroke                     (type Stroke) The outline of the Highlight Box (type Stroke). When the key is absent,
                                          GRS draws no outline.
R321  |  +- firstDay                      The first day that the Highlight Box covers (included), as a day in the time zone of
                                          scheduleData.scheduleDataTimeZone.
R322  |  +- lastDay                       The last day that the Highlight Box covers (included).
R323  |  +- firstTaskGroupId              The id of the first task group that the Highlight Box covers; the box covers every task
                                          group through lastTaskGroupId in task group tree order, both ends included.
R324  |  +- lastTaskGroupId               The id of the last task group that the Highlight Box covers (included).
R325  +- commentBoxes[]                   The Comment Boxes in the Task Group Lanes. The Leader Line of each Comment Box points at
                                          a task, a Highlight Box or a free point.
R326     +- id                            The id of the Comment Box, a random UUID.
R327     +- text                          The text of the Comment Box. When the key is absent, the Comment Box has an empty body.
R328     +- style                         How GRS draws the Comment Box (type CommentBoxStyle).
R329     |  +- fill                       (type Paint) The fill of the Comment Box body (type Paint). The fill always has a color;
                                          opacityPercent 0 makes the fill invisible.
R330     |  +- stroke                     (type Stroke) The outline of the Comment Box and the Leader Line (type Stroke). When the
                                          key is absent, GRS draws no outline and no Leader Line.
R331     |  +- font                       The look of the Comment Box text: the color and the size.
R332     |     +- color                   (type Color) The color of the Comment Box text (type Color).
R333     |     +- sizePx                  The size of the Comment Box text, in CSS pixels at displayScaleRatio 1. The zoom does
                                          not change this size.
R334     +- leaderTarget                  Where the Leader Line of the Comment Box points. When the target is deleted in GRS, GRS
                                          turns this object into a free point; when the file names a target that the Schedule Data
                                          lacks, GRS draws no Leader Line.
R335     |  +- type                       "freePoint": the Leader Anchor stands at a place tied to nothing; "task": the Leader
                                          Anchor stands at one of eight points of the Plan Bar, the Actual Bar or the Milestone
                                          Mark of a task; "highlightBox": the Leader Anchor stands at one of eight points of a
                                          Highlight Box.
R336     |  |  +- "freePoint"
R337     |  |  +- "task"
R338     |  |  +- "highlightBox"
R339     |  +- dateTime                   Only when type is "freePoint". The point in time where the Leader Anchor stands, as a
                                          date-time in the time zone of scheduleData.scheduleDataTimeZone.
R340     |  +- taskGroupId                Only when type is "freePoint". The id of the task group whose Task Group Lane holds the
                                          Leader Anchor.
R341     |  +- taskGroupTopOffsetPercent  Only when type is "freePoint". How far the Leader Anchor lies below the top edge of that
                                          Task Group Lane, in percent of the lane height; 100 is the bottom edge.
R342     |  +- taskUid                    Only when type is "task". The uid of the task that the Leader Anchor snaps to.
R343     |  +- snapPart                   Only when type is "task". The name of the part of the Task Graphic that the Leader
                                          Anchor snaps to: "planBar" (the Plan Bar), "actualBar" (the Actual Bar) or
                                          "milestoneMark" (the Milestone Mark).
R344     |  |  +- "planBar"
R345     |  |  +- "actualBar"
R346     |  |  +- "milestoneMark"
R347     |  +- highlightBoxId             Only when type is "highlightBox". The id of the Highlight Box that the Leader Anchor
                                          snaps to.
R348     |  +- snapPoint                  Only when type is "task" or "highlightBox". The point of the target that the Leader
                                          Anchor snaps to: a corner or the middle of a side.
R349     |     +- "topLeftCorner"
R350     |     +- "topMiddle"
R351     |     +- "topRightCorner"
R352     |     +- "rightMiddle"
R353     |     +- "bottomRightCorner"
R354     |     +- "bottomMiddle"
R355     |     +- "bottomLeftCorner"
R356     |     +- "leftMiddle"
R357     +- bodyOffsetPx                  The offset from the Leader Anchor to the lower-left corner of the Comment Box body, in
                                          CSS pixels at displayScaleRatio 1; horizontal and vertical zoom leave this offset
                                          unchanged.
R358     |  +- dx                         The horizontal part of the offset; a positive value moves the box to the right.
R359     |  +- dy                         The vertical part of the offset; a positive value moves the box down.
R360     +- hyperlinkAddress              The URL that the Comment Box links to. When the key is absent, the Comment Box has no
                                          link.
R361     +- hyperlink                     The title of the Comment Box link, not the address. When the key is absent, the link has
                                          no title.
```

### Shared types

```text
R362  Color                                      A color of type "theme", "palette" or "custom".
R363  +- type                                    "theme": GRS takes the theme color for the place that holds this color, in the hue of
                                                 documentSettings.themeHue; "palette": the color is one of the ten palette colors, named
                                                 in name; "custom": light and dark hold the colors for the light and dark themes.
R364  |  +- "theme"
R365  |  +- "palette"
R366  |  +- "custom"
R367  +- name                                    Only when type is "palette". The name of the palette color. Each name says how the color
                                                 looks in the light theme; in the dark theme GRS keeps the hue and inverts the lightness.
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
R378  +- light                                   Only when type is "custom". The color for the light theme.
R379  |  +- hexColor                             The color as # and six lowercase hexadecimal digits (#rrggbb).
R380  |  +- isCalculatedFromOppositeColorScheme  A mark on a side that GRS calculated from the opposite side, as a record of origin and
                                                 not a switch; a side that a person chose lacks this key.
R381  +- dark                                    Only when type is "custom". The color for the dark theme, in the same shape as light.
R382     +- hexColor                             The color as # and six lowercase hexadecimal digits (#rrggbb).
R383     +- isCalculatedFromOppositeColorScheme  A mark on a side that GRS calculated from the opposite side, as a record of origin and
                                                 not a switch; a side that a person chose lacks this key.
R384  TaskGroupColor                             The color of a Task Group Lane. This value has the same shape as Color, except that the
                                                 palette color "black" is not allowed.
R385  Paint                                      A fill: a color and an opacity.
R386  +- color                                   (type Color) The color of the fill (type Color).
R387  +- opacityPercent                          The opacity of the fill in percent: 100 is solid, and at 0 GRS draws no fill.
R388  Stroke                                     A line: a color, an opacity and a width. To draw no line, leave out the whole stroke
                                                 key.
R389  +- color                                   (type Color) The color of the line (type Color).
R390  +- opacityPercent                          The opacity of the line in percent: 100 is solid, and at 0 GRS draws no line.
R391  +- widthPx                                 The width of the line, in CSS pixels at displayScaleRatio 1. The zoom does not change
                                                 this width.
R392  ShapeStyle                                 The fill and the outline of a shape. TaskStyle, HighlightBoxStyle and CommentBoxStyle
                                                 all use this object.
R393  +- fill                                    (type Paint) The fill of the shape (type Paint). When the key is absent, GRS draws no
                                                 fill.
R394  +- stroke                                  (type Stroke) The outline of the shape (type Stroke). When the key is absent, GRS draws
                                                 no outline.
R395  ColumnFilter                               A filter on one column of a table; type chooses a filter by values or by a range of
                                                 days.
R396  +- type                                    "values": GRS hides the rows that show one of hiddenValues, and the empty rows when
                                                 isBlankHidden is true; "dateRange": GRS hides the rows whose date lies outside firstDay
                                                 to lastDay; an absent firstDay or lastDay leaves that end open.
R397  |  +- "values"
R398  |  +- "dateRange"
R399  +- column                                  The column, named by the content that the column shows; the same name means the same
                                                 content in every table. Search Window, task table: "progressStatus", "percentComplete",
                                                 "taskType", "taskName", "resourceNames", "start", "finish", "actualStart",
                                                 "actualFinish", "taskGroupPath" (the path from the top level). Search Window, Comment
                                                 Box table: "text", "taskGroupName" (the task group of the Leader Anchor),
                                                 "leaderTargetDay" (the day of the Leader Anchor). Delay Diagnostics Report Window:
                                                 "diagnosisStatus", "percentComplete", "taskType", "taskName", "resourceNames",
                                                 "planDates", "actualDates", "diagnosisReason". Resource List Window:
                                                 "resourceSelectionStatus", "resourceName", "assignedTaskCount", "assignedTaskNames".
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
R421  +- hiddenValues[]                          Only when type is "values". The values whose rows the filter hides: the English status
                                                 name for a status column, and the cell text as the table shows the text for any other
                                                 column. "progressStatus": "notStarted", "inProgress", "suspendedWithResumeDate",
                                                 "suspendedWithoutResumeDate", "finished", "delay", and, while GRS shows Delay
                                                 Diagnostics results, the diagnosis marks "unreliable", "bottleneck", "bottleneckPath";
                                                 "diagnosisStatus": "unreliable", "suspicion", "omission", "bottleneck",
                                                 "bottleneckPath", "delay", "finishedDelayContribution"; "taskType": "task", "milestone";
                                                 "resourceSelectionStatus": "selected", "notSelected".
R422  +- isBlankHidden                           Only when type is "values". Whether the filter hides the rows with an empty cell in this
                                                 column.
R423  +- firstDay                                Only when type is "dateRange". The first day that the filter keeps (included), as a day
                                                 in the time zone of scheduleData.scheduleDataTimeZone.
R424  +- lastDay                                 Only when type is "dateRange". The last day that the filter keeps (included).
R425  ColumnSort                                 How GRS sorts a table: by one column, in one direction.
R426  +- column                                  The name of the column that GRS sorts the table by, with the same names as
                                                 ColumnFilter.column.
R427  +- direction                               GRS sorts from the smallest value for "ascending" and from the largest for "descending".
R428     +- "ascending"
R429     +- "descending"
R430  TaskTableWindow                            How GRS shows a table of tasks (the Search Window or the Delay Diagnostics Report
                                                 Window): the checks, the column filters and the sort.
R431  +- isScheduleFilteredByChecks              Filter Schedule by Checks, on or off: when true, GRS draws on the Schedule Canvas only
                                                 the tasks checked in this table. The table itself keeps every row.
R432  +- checkedTaskUids[]                       The uids of the tasks whose row has a check in the Visibility column of this table. When
                                                 the key is absent, no row has a check.
R433  +- columnFilters[]                         (type ColumnFilter) The column filters of this table, one for each filtered column. When
                                                 the key is absent, no column has a filter.
R434  +- columnSort                              (type ColumnSort) The sort of this table: the column and the direction. When the key is
                                                 absent, GRS shows the rows in the default order.
R435  ResourceTableWindow                        How GRS shows the table of the Resource List Window: the checks, the column filters and
                                                 the sort.
R436  +- isScheduleFilteredByChecks              Filter Schedule by Checks, on or off: when true, GRS draws on the Schedule Canvas only
                                                 the tasks of checked resources, plus unassigned tasks when isUnassignedChecked is true.
R437  +- isUnassignedChecked                     Whether the "(no assignee)" row of the Resource List Window has a check.
R438  +- checkedResourceUids[]                   The uids of the resources whose row has a check in the Visibility column of the Resource
                                                 List Window.
R439  +- columnFilters[]                         (type ColumnFilter) The column filters of this table, one for each filtered column. When
                                                 the key is absent, no column has a filter.
R440  +- columnSort                              (type ColumnSort) The sort of this table: the column and the direction. When the key is
                                                 absent, GRS shows the rows in the default order.
```

### Root description of the schema

```text
Terms:
GRS is GoodRelax Scheduler, which opens and edits a Schedule Document and reads and writes GRS JSON
files, the format that this GRS JSON Schema defines.
MSPDI (Microsoft Project XML Data Interchange) is the XML file format that Microsoft Project uses.
GRS can also read and write MSPDI (.xml) files.
"Same as MSPDI X" indicates that the property has the same meaning and values as MSPDI element X.
The description of that property notes any GRS-specific difference.
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
  +- same as MSPDI: project, calendars, passthroughCalendars, tasks, passthroughTasks, resources, passthroughResources, assignments, passthroughAssignments
  +- GRS only: taskGroups, baselineTasks, highlightBoxes, commentBoxes
changeLogEntries  Notes on changes
Omit a property that has no value: never write null or [].
```
