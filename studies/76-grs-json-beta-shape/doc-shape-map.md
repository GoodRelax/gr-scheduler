# CR-851 GRS JSON shape map (line review)

Printed from doc-shape-map.tsv, which is the source. One row per data element. Old and new show the key and its type; "-" means the element is added or removed. `oneOf[k]` is the union branch whose kind is k; `oneOf[*]` is every branch. Why codes: Fnn finding, Rnn rulings-log item, COn coordinator item, JDG-3302 classification, JDG-nnnn ruling, E-n scaling wording, CR-849 hyperlink rows, CHOICE/OPEN in the notes. The spec row is in brackets at the end of why.

Rows: 300 (260 existing elements, 40 added, 3 removed).

## Document top level

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `$schema`<br>str | `$schema`<br>str | `"$schema":"https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json"` | none | not touched | none |
| 2 | `schemaVersion`<br>str const 2026-10-19T00:35:37Z | `schemaVersion`<br>str const <UTC instant CR-851 lands> | `"schemaVersion":"2026-11-01T00:00:00Z"` | type | JDG-3263 raised once per shape-changing CR (rule 10); value set when CR-851 lands; JDG-3262 x-grsChanges gets its first rows (not a document key) | none |
| 3 | - | `buildVersion`<br>UtcInstant, required, 2nd key after schemaVersion | `"buildVersion":"2026-11-01T09:12:30Z"` | add | JDG-3300 build version in every machine-read output; shape and key name are CHOICE B1 | none |
| 4 | `schedule`<br>object | `schedule`<br>object | `"schedule":{...}` | none | not touched | none |
| 5 | `schedule/project`<br>Project | `schedule/project`<br>Project | `"project":{...}` | none | always present | none |
| 6 | `schedule/calendars`<br>array, required | `schedule/calendars`<br>array, optional (absent = none; never []) | `"calendars":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 7 | `schedule/tasks`<br>array, required | `schedule/tasks`<br>array, optional (absent = none; never []) | `"tasks":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 8 | `schedule/resources`<br>array, required | `schedule/resources`<br>array, optional (absent = none; never []) | `"resources":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 9 | `schedule/assignments`<br>array, required | `schedule/assignments`<br>array, optional (absent = none; never []) | `"assignments":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 10 | `schedule/taskGroups`<br>array, required | `schedule/taskGroups`<br>array, optional (absent = none; never []) | `"taskGroups":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 11 | `schedule/taskGroupMembers`<br>array, required | `schedule/taskGroupMembers`<br>array, optional (absent = none; never []) | `"taskGroupMembers":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 12 | `schedule/taskVisuals`<br>array, required | `schedule/taskVisuals`<br>array, optional (absent = none; never []) | `"taskVisuals":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 13 | `schedule/commentBoxes`<br>array, required | `schedule/commentBoxes`<br>array, optional (absent = none; never []) | `"commentBoxes":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 14 | `schedule/highlightBoxes`<br>array, required | `schedule/highlightBoxes`<br>array, optional (absent = none; never []) | `"highlightBoxes":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 15 | `schedule/taskOrigins`<br>array, required | `schedule/taskOrigins`<br>array, optional (absent = none; never []) | `"taskOrigins":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 16 | `schedule/baselineTasks`<br>array, required | `schedule/baselineTasks`<br>array, optional (absent = none; never []) | `"baselineTasks":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); items change per $defs rows | none |
| 17 | `documentStamp`<br>$ref documentStamp | `documentStamp`<br>$ref DocumentStamp | `"documentStamp":{...}` | none | document key unchanged; schema $ref text follows the $defs rename | none |
| 18 | `changeLog`<br>changeLog[], required | `changeLogEntries`<br>ChangeLogEntry[], optional (absent = none; never []) | `"changeLogEntries":[{"ordinal":0,...}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3281 arrays plural (CHOICE N2) | none |

## documentSettings

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(documentSettings)`<br>object | `(documentSettings)`<br>object | `"documentSettings":{...}` | description-only | JDG-3309: "every key is written" becomes "every always-valued key is written; an absent optional key means no value"; JDG-3302 5.2 schema defaults leave | none |
| 2 | `displayScale`<br>enum 50..200 default 100 | `displayScalePercent`<br>enum 50,67,75,90,100,110,125,150,175,200 (required) | `"displayScalePercent":100` | rename+description-only | JDG-3292/JDG-3297 F18 suffix Percent; description E-1 (scales every ...Px; not header, palette or browser zoom; initial value); converter: same number (S-234) | none |
| 3 | `displayTimeZones`<br>enum[] <=4 ("UTC-08:00 DST" keys), required | `displayTimeZones`<br>{offset:UtcOffset, season:standard\|daylight}[] 1..4, optional (absent = none; never []) | `"displayTimeZones":[{"offset":"UTC-07:00","season":"daylight"}]` | type | JDG-3309 empty arrays omitted (minItems 1); F13 offset and season split; daylight only on the 12 offsets T-376 gives a daylight row (invariant) (S-575) | none |
| 4 | - | `displayTimeZones/items/offset`<br>UtcOffset, required | `"offset":"UTC-07:00"` | add | F13 same type as scheduleDataTimeZone and viewTimeZone (S-575) | none |
| 5 | - | `displayTimeZones/items/season`<br>enum standard\|daylight, required | `"season":"daylight"` | add | F13; season picks the abbreviation row of T-376 (PDT etc.) as today (S-575) | none |
| 6 | - | `fitSpan`<br>object {firstDay,lastDay,isFixed}, optional (absent = no fit span) | `"fitSpan":{"firstDay":"2026-10-01","lastDay":"2026-12-31","isFixed":true}` | add | F54 one object replaces fitSpanStart/fitSpanFinish/isFitSpanFixed; JDG-3309 absent = no span (no kind none) (S-518) | none |
| 7 | `fitSpanFinish`<br>str datetime-pattern\|null default null | `fitSpan/lastDay`<br>Day, required inside fitSpan | `"lastDay":"2026-12-31"` | rename+type | F54/F12/F09 Day firstDay/lastDay inclusive (JDG-3281); clock = the shown clock (viewTimeZone); JDG-3309 (S-519) | none |
| 8 | `fitSpanStart`<br>str datetime-pattern\|null default null | `fitSpan/firstDay`<br>Day, required inside fitSpan | `"firstDay":"2026-10-01"` | rename+type | F54/F12; JDG-3309 (S-518) | none |
| 9 | `fontSizeStep`<br>enum S\|M\|L default M | `fontSizeStep`<br>enum small\|medium\|large (required) | `"fontSizeStep":"medium"` | type | JDG-3295 values are words (JDG-3281); key name kept (JDG-2682); description E-5 with folded T-215 sizes (small 7.5 / medium 8.75 / large 10 CSS px at 100, JDG-3277); converter S/M/L -> small/medium/large (S-70) | none |
| 10 | `isActualVisible`<br>bool (schema default) | `isActualVisible`<br>bool (schema default) | `"isActualVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-228) | none |
| 11 | `isAssigneeVisible`<br>bool (schema default) | `isAssigneeVisible`<br>bool (schema default) | `"isAssigneeVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-60) | none |
| 12 | `isBaselineVisible`<br>bool (schema default) | `isBaselineVisible`<br>bool (schema default) | `"isBaselineVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-69) | none |
| 13 | `isDateGridLinesVisible`<br>bool (schema default) | `isDateGridLinesVisible`<br>bool (schema default) | `"isDateGridLinesVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-67) | none |
| 14 | `isDependencyVisible`<br>bool (schema default) | `isDependencyVisible`<br>bool (schema default) | `"isDependencyVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-62) | none |
| 15 | `isGroupGridLinesVisible`<br>bool (schema default) | `isGroupGridLinesVisible`<br>bool (schema default) | `"isGroupGridLinesVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-68) | none |
| 16 | `isPercentCompleteVisible`<br>bool (schema default) | `isPercentCompleteVisible`<br>bool (schema default) | `"isPercentCompleteVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-61) | none |
| 17 | `isPlanDatesVisible`<br>bool (schema default) | `isPlanDatesVisible`<br>bool (schema default) | `"isPlanDatesVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-232) | none |
| 18 | `isPlanVisible`<br>bool (schema default) | `isPlanVisible`<br>bool (schema default) | `"isPlanVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-227) | none |
| 19 | `isProgressLineVisible`<br>bool (schema default) | `isProgressLineVisible`<br>bool (schema default) | `"isProgressLineVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-64) | none |
| 20 | `isProgressMarkerVisible`<br>bool (schema default) | `isProgressMarkerVisible`<br>bool (schema default) | `"isProgressMarkerVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-63) | none |
| 21 | `isTaskGroupPanelWidthFixed`<br>bool (schema default) | `isTaskGroupPanelWidthFixed`<br>bool (schema default) | `"isTaskGroupPanelWidthFixed":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-533) | none |
| 22 | `isThemeMonochrome`<br>bool (schema default) | `isThemeMonochrome`<br>bool (schema default) | `"isThemeMonochrome":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-74) | none |
| 23 | `isTimeOfDayVisible`<br>bool (schema default) | `isTimeOfDayVisible`<br>bool (schema default) | `"isTimeOfDayVisible":false` | description-only | JDG-3302 5.2 schema default moved into the description (S-576) | none |
| 24 | `isFitSpanFixed`<br>bool default false | `fitSpan/isFixed`<br>bool, required inside fitSpan | `"isFixed":true` | rename | F54 moves into fitSpan; fixed without a span can no longer be written (FX-1/FX-4/FX-5) (S-532) | none |
| 25 | `levelZeroTreeState`<br>enum auto\|collapsed | `levelZeroTreeState`<br>enum auto\|collapsed | `"levelZeroTreeState":"auto"` | description-only | JDG-3302 5.2 schema default moved into the description (S-418) | none |
| 26 | `pinnedTaskGroupIds`<br>uuid[], required | `pinnedTaskGroupIds`<br>uuid[] 1..5, optional (absent = none; never []) | `"pinnedTaskGroupIds":["6f1c..."]` | type | JDG-3309 empty arrays omitted (minItems 1); JDG-3302 5.2 default moved into the description (S-126) | none |
| 27 | `rulerFontSizePx`<br>num >=12 default 21 | - | - | remove | JDG-3294 derived by the tool (step size x 1.5 = 11.25/13.125/15 CSS px at 100 after the fold, JDG-3277); overturns F55 "keep"; converter drops it; replaces JDG-3277 21->13 (S-3) | none |
| 28 | `rulerHeightPx`<br>num <=150 default 69 | - | - | remove | JDG-3294 derived (ruler font x 3 + rulerLabelPad 1.25 x 3 = 37.5/43.125/48.75 after the fold, JDG-3277); converter drops it; replaces JDG-3277 69->43 (S-2) | none |
| 29 | `scrollDate`<br>str datetime-pattern\|null default null | `scrollPosition/oneOf[placed]/leftEdgeDay`<br>Day, required inside placed | `"leftEdgeDay":"2026-10-01"` | rename+union | F53/F12 + JDG-3302 5.9 one union scrollPosition; notDecided stays a kind (JDG-3309 follow-state); CHOICE N4 (S-77) | none |
| 30 | `scrollDateFraction`<br>num default 0 | `scrollPosition/oneOf[placed]/leftEdgeDayFraction`<br>num 0<=x<1, required inside placed | `"leftEdgeDayFraction":0.25` | rename+union | F53; JDG-3297 suffix Fraction (0 <= x < 1); CHOICE N4 (S-177) | none |
| 31 | `scrollTaskGroupFraction`<br>num default 0 | `scrollPosition/oneOf[placed]/topEdgeTaskGroupFraction`<br>num 0<=x<1, required inside placed | `"topEdgeTaskGroupFraction":0` | rename+union | F53 + JDG-3302 5.9; JDG-3297 Fraction; CHOICE N4 (S-176) | none |
| 32 | `scrollTaskGroupId`<br>uuid\|null default null | `scrollPosition/oneOf[placed]/topEdgeTaskGroupId`<br>uuid, required inside placed | `"topEdgeTaskGroupId":"6f1c0d2e-..."` | rename+union | JDG-3302 5.9; CD-2 (deleted group) sets the whole union to notDecided; CHOICE N4 (S-78) | none |
| 33 | - | `scrollPosition`<br>oneOf {kind:notDecided} \| {kind:placed,leftEdgeDay,leftEdgeDayFraction,topEdgeTaskGroupId,topEdgeTaskGroupFraction}, required | `"scrollPosition":{"kind":"notDecided"}` | add | JDG-3302 5.9; JDG-3309 keeps notDecided as a follow-state kind (GRS chooses on open, OP-10) (S-77) | none |
| 34 | - | `scrollPosition/oneOf[*]/kind`<br>enum notDecided\|placed, required | `"kind":"placed"` | add | JDG-3309 (S-77) | none |
| 35 | `stackDirection`<br>enum up\|down | `stackDirection`<br>enum up\|down | `"stackDirection":"up"` | description-only | JDG-3302 5.2 schema default moved into the description (S-58) | none |
| 36 | `tableViews`<br>object | `tableViews`<br>object | `"tableViews":{...}` | none | container | none |
| 37 | `taskGroupPanelWidthPx`<br>num >=80 default 300 | `taskGroupPanelWidthPx`<br>num >=50 default 188 (required) | `"taskGroupPanelWidthPx":188` | value-meaning+description-only | JDG-3277 0.625 fold: 300 -> 188 (187.5 rounded); minimum = taskGroupTitleIndent 10 x maxGroupDepth 5 = 50 (JDG-3277); JDG-3291 every ...Px = CSS px at displayScalePercent 100, x displayScalePercent/100, never x zoom (E-8) (S-79) | none |
| 38 | `viewTimeZone`<br>enum 27 offsets\|null default null | `viewTimeZone`<br>oneOf {kind:sameAsScheduleData} \| {kind:fixed,offset:UtcOffset}, required | `"viewTimeZone":{"kind":"sameAsScheduleData"}` | union | JDG-3309 follow-state kind sameAsScheduleData replaces null; FO-14 "do not convert" writes it; T-104 word kept (F14 CHOICE) (S-574) | none |
| 39 | - | `viewTimeZone/oneOf[*]/kind`<br>enum sameAsScheduleData\|fixed, required | `"kind":"fixed"` | add | JDG-3309 (S-574) | none |
| 40 | - | `viewTimeZone/oneOf[fixed]/offset`<br>UtcOffset, required | `"offset":"UTC+09:00"` | add | F13 shared UtcOffset (S-574) | none |
| 41 | `zoomX`<br>num 0.02..240 default 1 (ratio to a hidden 3.75 px/day) | `dayWidthPx`<br>num 0.075..900 default 3.75 (required) | `"dayWidthPx":3.75` | rename+value-meaning | JDG-3292 width of one day in CSS px at displayScalePercent 100 (= 3.75 x zoomX; hidden base S-1 x 0.625 goes); description E-2; converter x3.75 (S-75) | none |
| 42 | `zoomY`<br>num 0.02..240 default 1 (size, and group LOD below 1) | `verticalZoomRatio`<br>num 1..240 default 1 (required) | `"verticalZoomRatio":1` | rename+value-meaning | JDG-3293/JDG-3296 size part only, never below 1 (OMPV; LOD moves to taskGroupAutoExpandDepth); suffix Ratio (JDG-3297); description E-3; converter max(1, zoomY) (S-76) | A vertical zoom below 1 no longer exists as a value; folding task groups is taskGroupAutoExpandDepth (behaviour rows in CR-853) |
| 43 | - | `taskGroupAutoExpandDepth`<br>int 0..4 default 3 (required) | `"taskGroupAutoExpandDepth":3` | add | JDG-3293/JDG-3296 the below-1 part of zoomY as its own key (name chosen by the user); description E-4; converter: depth drawn at zoomY (thresholds 0.32/0.48/0.72/1.08 for depth 2..5) - 1 (S-76) | none |
| 44 | `tableViews/delayDiagnosticsReport`<br>object | `tableViews/delayDiagnosticsReport`<br>object | `"delayDiagnosticsReport":{...}` | none | container (never empty: its booleans are required) | none |
| 45 | `tableViews/delayDiagnosticsReport/columnFilters`<br>ColumnFilter[] (schema default []), required | `tableViews/delayDiagnosticsReport/columnFilters`<br>ColumnFilter[], optional (absent = none; never []) | `"columnFilters":[{"kind":"values","column":"status","hiddenValues":["finished"],"isBlankHidden":false}]` | type | JDG-3309 empty arrays omitted (minItems 1); item shape in /$defs/ColumnFilter; description states which column keys this table takes (CHOICE N5) (S-566) | none |
| 46 | `tableViews/delayDiagnosticsReport/isScheduleFilterApplied`<br>bool (schema default) | `tableViews/delayDiagnosticsReport/isScheduleFilterApplied`<br>bool | `"isScheduleFilterApplied":false` | description-only | JDG-3302 5.2 default moved into the description (S-564) | none |
| 47 | `tableViews/delayDiagnosticsReport/shownTaskUids`<br>int[] (schema default []), required | `tableViews/delayDiagnosticsReport/shownTaskUids`<br>int 0..2147483647[], optional (absent = none; never []) | `"shownTaskUids":[7,12]` | type | JDG-3309 empty arrays omitted (minItems 1); JDG-3284 uid range (S-565) | none |
| 48 | `tableViews/delayDiagnosticsReport/sort`<br>ColumnSort\|null default null | `tableViews/delayDiagnosticsReport/sort`<br>ColumnSort, optional (absent = default order) | `"sort":{"column":"plannedStart","direction":"ascending"}` | type | JDG-3309 thought 1: absent key is the only "no value" (absent = default order) (S-567) | none |
| 49 | `tableViews/resourceList`<br>object | `tableViews/resourceList`<br>object | `"resourceList":{...}` | none | container (never empty: its booleans are required) | none |
| 50 | `tableViews/resourceList/columnFilters`<br>ColumnFilter[] (schema default []), required | `tableViews/resourceList/columnFilters`<br>ColumnFilter[], optional (absent = none; never []) | `"columnFilters":[{"kind":"values","column":"status","hiddenValues":["finished"],"isBlankHidden":false}]` | type | JDG-3309 empty arrays omitted (minItems 1); item shape in /$defs/ColumnFilter; description states which column keys this table takes (CHOICE N5) (S-571) | none |
| 51 | `tableViews/resourceList/isScheduleFilterApplied`<br>bool (schema default) | `tableViews/resourceList/isScheduleFilterApplied`<br>bool | `"isScheduleFilterApplied":false` | description-only | JDG-3302 5.2 default moved into the description (S-568) | none |
| 52 | `tableViews/resourceList/shownResourceUids`<br>int[] (schema default []), required | `tableViews/resourceList/shownResourceUids`<br>int 0..2147483647[], optional (absent = none; never []) | `"shownResourceUids":[4]` | type | JDG-3309 empty arrays omitted (minItems 1); JDG-3284 uid range (S-569) | none |
| 53 | `tableViews/resourceList/isUnassignedShown`<br>bool (schema default) | `tableViews/resourceList/isUnassignedShown`<br>bool | `"isUnassignedShown":false` | description-only | JDG-3302 5.2 default moved into the description (S-570) | none |
| 54 | `tableViews/resourceList/sort`<br>ColumnSort\|null default null | `tableViews/resourceList/sort`<br>ColumnSort, optional (absent = default order) | `"sort":{"column":"plannedStart","direction":"ascending"}` | type | JDG-3309 thought 1: absent key is the only "no value" (absent = default order) (S-572) | none |
| 55 | `tableViews/searchPanel`<br>object | `tableViews/searchPanel`<br>object | `"searchPanel":{...}` | none | container (never empty: its booleans are required) | none |
| 56 | `tableViews/searchPanel/columnFilters`<br>ColumnFilter[] (schema default []), required | `tableViews/searchPanel/columnFilters`<br>ColumnFilter[], optional (absent = none; never []) | `"columnFilters":[{"kind":"values","column":"status","hiddenValues":["finished"],"isBlankHidden":false}]` | type | JDG-3309 empty arrays omitted (minItems 1); item shape in /$defs/ColumnFilter; description states which column keys this table takes (CHOICE N5) (S-562) | none |
| 57 | `tableViews/searchPanel/isScheduleFilterApplied`<br>bool (schema default) | `tableViews/searchPanel/isScheduleFilterApplied`<br>bool | `"isScheduleFilterApplied":false` | description-only | JDG-3302 5.2 default moved into the description (S-560) | none |
| 58 | `tableViews/searchPanel/shownTaskUids`<br>int[] (schema default []), required | `tableViews/searchPanel/shownTaskUids`<br>int 0..2147483647[], optional (absent = none; never []) | `"shownTaskUids":[7,12]` | type | JDG-3309 empty arrays omitted (minItems 1); JDG-3284 uid range (S-561) | none |
| 59 | `tableViews/searchPanel/sort`<br>ColumnSort\|null default null | `tableViews/searchPanel/sort`<br>ColumnSort, optional (absent = default order) | `"sort":{"column":"plannedStart","direction":"ascending"}` | type | JDG-3309 thought 1: absent key is the only "no value" (absent = default order) (S-563) | none |

## Project

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-1) | none |
| 2 | `id`<br>str<=16\|null, required | `id`<br>str<=16, optional | `"id":"PRJ-01"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F42 MSPDI-bound: description "omitted" now means key absent (AT-1) | none |
| 3 | `name`<br>str\|null, required | `name`<br>str<=255, optional | `"name":"Plan"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 255; F41 description already says title is shown (AT-2) | none |
| 4 | `title`<br>str\|null, required | `title`<br>str<=512, optional | `"title":"Product schedule"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-3) | none |
| 5 | `subject`<br>str\|null, required | `subject`<br>str<=512, optional | `"subject":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-4) | none |
| 6 | `category`<br>str\|null, required | `category`<br>str<=512, optional | `"category":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-5) | none |
| 7 | `company`<br>str\|null, required | `company`<br>str<=512, optional | `"company":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-6) | none |
| 8 | `manager`<br>str\|null, required | `manager`<br>str<=512, optional | `"manager":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-7) | none |
| 9 | `author`<br>str\|null, required | `author`<br>str<=512, optional | `"author":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-8) | none |
| 10 | `creationDate`<br>DateTime\|null, required | `creationDate`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"creationDate":"2026-10-25T09:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 DateTime shape; F10 MSPDI-bound description: written as the creating PC wall clock to the second (AT-9) | none |
| 11 | `revision`<br>int\|null, required | `revision`<br>int, optional | `"revision":3` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent (AT-10) | none |
| 12 | `startDate`<br>DateTime\|null, required | `startDate`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"startDate":"2026-10-01T08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F11 description: a date-time, drawn on its day (AT-12) | none |
| 13 | `statusDate`<br>DateTime\|null, required | `statusDate`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"statusDate":"2026-10-24T17:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F11 as startDate (AT-13) | none |
| 14 | `minutesPerDay`<br>int\|null, required | `minutesPerDay`<br>int, optional | `"minutesPerDay":480` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F43 description: "480 when null" -> "480 when absent" (S-128) (AT-14) | none |
| 15 | `minutesPerWeek`<br>int\|null, required | `minutesPerWeek`<br>int, optional | `"minutesPerWeek":2400` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent (AT-15) | none |
| 16 | `daysPerMonth`<br>int\|null, required | `daysPerMonth`<br>int, optional | `"daysPerMonth":20` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent (AT-16) | none |
| 17 | `weekStartDay`<br>int 0..6\|null, required | `weekStartDay`<br>int 0..6, optional | `"weekStartDay":0` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F38 MSPDI-bound description already warns of the 1-off numbering (AT-17) | none |
| 18 | `calendarUid`<br>int\|null, required | `calendarUid`<br>int 0..2147483647, optional | `"calendarUid":1` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284 uid range (AT-18) | none |
| 19 | `defaultStartTime`<br>Time\|null, required | `defaultStartTime`<br>Time "HH:MM:SS", optional | `"defaultStartTime":"08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 Time shape; absent -> S-482 (AT-154) | none |
| 20 | `defaultFinishTime`<br>Time\|null, required | `defaultFinishTime`<br>Time "HH:MM:SS", optional | `"defaultFinishTime":"17:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 Time shape; absent -> S-483 (AT-155) | none |
| 21 | `themeHue`<br>int 0..359 default 214 | `themeHueDegrees`<br>int 0..359 (required) | `"themeHueDegrees":214` | rename+description-only | JDG-3281 unit suffix (CHOICE N6); JDG-3302 5.2 default 214 (S-73) moved into the description (AT-19) | none |
| 22 | `parentTaskProgressToleranceDays`<br>int >=0 default 1 | `parentTaskProgressToleranceWorkingDays`<br>int >=0 (required) | `"parentTaskProgressToleranceWorkingDays":1` | rename+description-only | F16 Days said two kinds of day; JDG-3302 5.2 default moved into the description (AT-156) | none |
| 23 | `uidHighWaterMark`<br>int | `highestIssuedUid`<br>int 0..2147483647 (required) | `"highestIssuedUid":57` | rename+type | JDG-3281 meaning name (CHOICE N7); JDG-3284 uid range (AT-20) | none |
| 24 | `importSequence`<br>int | `lastImportNumber`<br>int >=0 (required; 0 = never imported) | `"lastImportNumber":2` | rename+type | JDG-3281 meaning name, not an array (CHOICE N8); S-71 start 0 as minimum; 0 is a count, not "no value" (AT-21) | none |
| 25 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-22) | none |
| 26 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-23) | none |
| 27 | `outlineBase`<br>int default 1 | `firstOutlineLevel`<br>int (required) | `"firstOutlineLevel":1` | rename+description-only | JDG-3281 meaning name (CHOICE N9); JDG-3302 5.2 default moved into the description (AT-139) | none |
| 28 | `sourceFormat`<br>enum grs\|pj12\|pj15 | `sourceFormat`<br>enum grs\|pj12\|pj15 (required) | `"sourceFormat":"grs"` | description-only | F45 shape kept; drop "a document without it is told by carry.SaveVersion" (values kept: CHOICE N10) (AT-143) | none |
| 29 | `scheduleDataTimeZone`<br>enum 27 offsets | `scheduleDataTimeZone`<br>$ref UtcOffset (same 27 values, required) | `"scheduleDataTimeZone":"UTC+09:00"` | type | F13 one shared offset type; values unchanged (AT-157) | none |

## Task

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-2) | none |
| 2 | `uid`<br>int | `uid`<br>int 0..2147483647 (required) | `"uid":7` | type | JDG-3284 uid range; out of range refused on read (AT-24) | none |
| 3 | `parentTaskUid`<br>int\|null (null = root), required | `parentTaskUid`<br>int 0..2147483647, optional (absent = top of the WBS) | `"parentTaskUid":12` | type | JDG-3309 thought 1: absent key is the only "no value"; name kept, the JDG-3302 5.13 rename to parentTask was for a union (CHOICE N19) (AT-25) | none |
| 4 | `wbsOrder`<br>int\|null | `siblingOrder`<br>int, required | `"siblingOrder":3` | rename+type | JDG-3302 C1 written at creation (max+1 under the parent); JDG-3281 no abbreviation (wbs) and one name with TaskGroup.order (CHOICE N11) (AT-26) | none |
| 5 | `name`<br>str\|null, required | `name`<br>str 1..512, optional | `"name":"Design"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512; JDG-3315 never forced: absent = no name (screen shows empty); clearing it in the properties panel removes the key (AT-27) | none |
| 6 | `start`<br>DateTime\|null, required | `start`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"start":"2026-10-01T08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 (AT-28) | none |
| 7 | `finish`<br>DateTime\|null, required | `finish`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"finish":"2026-10-03T17:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 (AT-29) | none |
| 8 | `milestone`<br>bool\|null, required | `milestone`<br>bool, optional | `"milestone":true` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F26 description: absent reads as false; JDG-3311 it alone says whether TaskVisual holds taskShape or milestoneShape (IV-22 goes) (AT-30) | none |
| 9 | `deadline`<br>DateTime\|null, required | `deadline`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"deadline":"2026-10-10T17:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 (AT-31) | none |
| 10 | `notes`<br>str\|null, required | `notes`<br>str 1..65535, optional | `"notes":"..."` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 long text (MSPDI sets no limit) (AT-32) | none |
| 11 | `calendarUid`<br>int\|null, required | `calendarUid`<br>int 0..2147483647, optional | `"calendarUid":3` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284; F44 description already says round trip only (AT-33) | none |
| 12 | `actualStart`<br>DateTime\|null, required | `actualStart`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"actualStart":"2026-10-01T08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F19 MSPDI-bound description (T-019a reads the five states) (AT-34) | none |
| 13 | `stop`<br>DateTime\|null, required | `stop`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"stop":"2026-10-02T12:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F19 description: "null once actualFinish is set" -> "absent once ..." (AT-141) | none |
| 14 | `actualFinish`<br>DateTime\|null, required | `actualFinish`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"actualFinish":"2026-10-03T17:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F19 (AT-36) | none |
| 15 | `resume`<br>DateTime\|null, required | `resume`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"resume":"2026-10-06T08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F19 (AT-37) | none |
| 16 | `resumeValid`<br>bool\|null, required | `resumeValid`<br>bool, optional | `"resumeValid":false` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F19/F26 description: what absent means (AT-38) | none |
| 17 | `percentComplete`<br>int>=0\|null, required | `percentComplete`<br>int>=0, optional | `"percentComplete":40` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F20 description already says recounted from dates (AT-39) | none |
| 18 | - | `hyperlinkAddress`<br>str 1..512 (URL), optional (absent = no link) | `"hyperlinkAddress":"https://example.com/spec"` | add | CR-849 JDG-3314: MSPDI Task/HyperlinkAddress (maxLength 512) leaves passthrough for a column; MSPDI name kept | none |
| 19 | - | `hyperlink`<br>str 1..512 (link title), optional (absent = no link title) | `"hyperlink":"Design spec"` | add | CR-849 JDG-3314: MSPDI Task/Hyperlink (maxLength 512); HyperlinkSubAddress stays in passthroughValues | none |
| 20 | `fadeInDays`<br>int>=0\|null (null = not set, 0 = explicit zero), required | `fadeInCalendarDays`<br>int >=0, optional (absent = no fade: default depth on chevrons; 0 = flat end) | `"fadeInCalendarDays":3` | rename+type | F16 unit in the name; F21 + JDG-3309 absent = no fade (FD-5 kept); JDG-3312 MSPDI Alias follows the new name (EX-6 kept; alpha-exported fade columns come back as passthrough only) (AT-40) | none |
| 21 | `fadeOutDays`<br>int>=0\|null (null = not set, 0 = explicit zero), required | `fadeOutCalendarDays`<br>int >=0, optional (absent = no fade: default depth on chevrons; 0 = flat end) | `"fadeOutCalendarDays":3` | rename+type | F16 unit in the name; F21 + JDG-3309 absent = no fade (FD-5 kept); JDG-3312 MSPDI Alias follows the new name (EX-6 kept; alpha-exported fade columns come back as passthrough only) (AT-41) | none |
| 22 | `dependencies`<br>Dependency[], required | `dependencies`<br>Dependency[], optional (absent = none; never []) | `"dependencies":[{"predecessorUid":5,"linkType":1}]` | type | JDG-3309 empty arrays omitted (minItems 1) (AT-42) | none |
| 23 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-43) | none |
| 24 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-44) | none |

## Dependency

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-3) | none |
| 2 | `predecessorUid`<br>int | `predecessorUid`<br>int 0..2147483647 (required) | `"predecessorUid":5` | type | JDG-3284 uid range (AT-45) | none |
| 3 | `linkType`<br>int 0..3 | `linkType`<br>int 0..3 (required) | `"linkType":1` | none | F39 MSPDI-bound; description already names every code (no change) (AT-46) | none |
| 4 | `linkLag`<br>int\|null, required | `linkLag`<br>int, optional | `"linkLag":4800` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F17 description: "480 when that is null" -> "when absent" (AT-47) | none |
| 5 | `lagFormat`<br>int\|null, required | `lagFormat`<br>int, optional | `"lagFormat":7` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F17 MSPDI-bound description kept (AT-48) | none |
| 6 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-49) | none |
| 7 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-50) | none |

## TaskGroup

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-4) | none |
| 2 | `id`<br>uuid | `id`<br>uuid (required) | `"id":"6f1c0d2e-..."` | none | not touched (AT-51) | none |
| 3 | `parentId`<br>uuid\|null (null = root), required | `parentId`<br>uuid, optional (absent = top-level task group, depth 1) | `"parentId":"6f1c0d2e-..."` | type | JDG-3309 thought 1: absent key is the only "no value" (CHOICE N19: name kept) (AT-52) | none |
| 4 | `name`<br>str\|null (null = derive from task), required | `name`<br>str 1..512, optional (absent = no name; the screen shows an empty title) | `"name":"Design"` | type | JDG-3315 (overturns JDG-3313/JDG-3313): never forced and never copied from a task, except from the parent task name on MSPDI import; after deleting everything the first group is named "Untitled"; clearing it in the properties panel removes the key; IV-8 and any group-name-required check go; JDG-3287 (AT-53) | A task group made from a task starts with an empty title, and naming or renaming the task never names the group (today an unnamed group shows its task name) |
| 5 | `derivedFromTaskUid`<br>int\|null, required | `representedTaskUid`<br>int 0..2147483647, optional (absent = stands for no task in the WBS) | `"representedTaskUid":12` | rename+type | F27 only role left is "which task this group stands for in the WBS" (HM-9/HM-12); JDG-3309 plain optional value (AT-54) | none |
| 6 | `order`<br>int | `siblingOrder`<br>int (required) | `"siblingOrder":2` | rename | same kind as Task.siblingOrder, one name (CHOICE N11) (AT-55) | none |
| 7 | `treeState`<br>enum 5 states default auto | `treeState`<br>enum 5 states (required) | `"treeState":"auto"` | description-only | F29 description: states of T-328, what each draws is T-329; auto opens down to taskGroupAutoExpandDepth (JDG-3293); JDG-3302 5.2 default moved (AT-153) | none |
| 8 | `editPermission`<br>str\|null (null = anyone), required | `editGroup`<br>str 1..512, optional (absent = anyone may edit) | `"editGroup":"Design team"` | rename+type | F28 name says what it holds; JDG-3309 absent = anyone; empty string no longer a second "anyone" (AT-144) | none |
| 9 | `color`<br>str pattern\|null (null = theme), required | `color`<br>$ref BandColor, optional (absent = no band colour drawn) | `"color":{"kind":"theme"}` | union+type | F01/F02/F03 JDG-3260 kind union; F04 own type (no ink); F05 names; JDG-3309/JDG-3310 theme is a kind, absent = nothing drawn (was transparent); GRS writes theme at creation (AT-58) | none |
| 10 | `minHeightPx`<br>int\|null (null = no floor), required | `minHeightPx`<br>int >=1, optional (absent = no lowest height) | `"minHeightPx":40` | type+description-only | JDG-3309 thought 1: absent key is the only "no value" (CHOICE N20, replaces JDG-3302 5.6 "0 = no floor"); JDG-3291 every ...Px = CSS px at displayScalePercent 100, x displayScalePercent/100, never x zoom; verticalZoomRatio does not change it (E-9) (AT-59) | none |
| 11 | - | `hyperlinkAddress`<br>str 1..512 (URL), optional (absent = no link) | `"hyperlinkAddress":"https://example.com/board"` | add | CR-849 JDG-3314: GRS-owned (not exported) but MSPDI names, same rule as Task | none |
| 12 | - | `hyperlink`<br>str 1..512 (link title), optional (absent = no link title) | `"hyperlink":"Team board"` | add | CR-849 JDG-3314 | none |

## TaskGroupMember

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-5) | none |
| 2 | `taskUid`<br>int | `taskUid`<br>int 0..2147483647 (required) | `"taskUid":7` | type | JDG-3284 (AT-60) | none |
| 3 | `taskGroupId`<br>uuid | `taskGroupId`<br>uuid (required) | `"taskGroupId":"6f1c0d2e-..."` | none | not touched (AT-61) | none |

## Calendar

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-6) | none |
| 2 | `uid`<br>int | `uid`<br>int 0..2147483647 (required) | `"uid":1` | type | JDG-3284 (AT-63) | none |
| 3 | `name`<br>str\|null, required | `name`<br>str<=512, optional | `"name":"Standard"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-64) | none |
| 4 | `isBaseCalendar`<br>bool\|null, required | `isBaseCalendar`<br>bool, optional | `"isBaseCalendar":true` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F26 description: absent reads as false (AT-65) | none |
| 5 | `baseCalendarUid`<br>int\|null, required | `baseCalendarUid`<br>int 0..2147483647, optional | `"baseCalendarUid":1` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284 (AT-66) | none |
| 6 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | not touched (AT-67) | none |
| 7 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-68) | none |
| 8 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-69) | none |
| 9 | `weekDays`<br>WeekDay[], required | `weekDays`<br>WeekDay[], optional (absent = none; never []) | `"weekDays":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1) (AT-70) | none |
| 10 | `exceptions`<br>Exception[], required | `exceptions`<br>Exception[], optional (absent = none; never []) | `"exceptions":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1) (AT-71) | none |

## WeekDay

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-7) | none |
| 2 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | not touched (AT-72) | none |
| 3 | `dayType`<br>int 1..7\|null | `dayType`<br>int 1..7, required | `"dayType":2` | type | JDG-3302 C1: MSPDI DayType is minOccurs=1; a WeekDay without it stays in passthroughElements; F38 description kept (AT-73) | none |
| 4 | `dayWorking`<br>bool\|null, required | `dayWorking`<br>bool, optional | `"dayWorking":true` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F26 description: absent reads as not working (AT-74) | none |
| 5 | `workingTimes`<br>WorkingTime[] <=5, required | `workingTimes`<br>WorkingTime[] 1..5, optional (absent = none; never []) | `"workingTimes":[{"ordinal":0,"fromTime":"08:00:00","toTime":"12:00:00"}]` | type | JDG-3309 empty arrays omitted (minItems 1); F36: absent on a working day = default spans 08:00-12:00, 13:00-17:00 (was the empty array); IV-24 reworded (AT-158) | none |
| 6 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-75) | none |
| 7 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-76) | none |

## Exception

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-8) | none |
| 2 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | not touched (AT-77) | none |
| 3 | `name`<br>str\|null, required | `name`<br>str<=512, optional | `"name":"Year end"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-78) | none |
| 4 | `fromDate`<br>DateTime\|null, required | `fromDate`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"fromDate":"2026-12-29T00:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F34 MSPDI-bound description names recurrencePeriod instead of carry.Period (AT-79) | none |
| 5 | `toDate`<br>DateTime\|null, required | `toDate`<br>DateTime "YYYY-MM-DDTHH:MM:SS", optional | `"toDate":"2027-01-03T23:59:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F09 Exception keeps the MSPDI 23:59:00 form (AT-80) | none |
| 6 | `dayWorking`<br>bool\|null, required | `dayWorking`<br>bool, optional | `"dayWorking":false` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F26 description: absent reads as not working (AT-81) | none |
| 7 | `recurrenceKind`<br>int 1..9\|null, required | `recurrenceKind`<br>int 1..9, optional | `"recurrenceKind":1` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F35/F46 description: one-off = 9, absent, or 1 with recurrencePeriod absent or 1 (AT-82) | none |
| 8 | - | `recurrencePeriod`<br>int >=1, optional (absent = the file had no Period) | `"recurrencePeriod":1` | add | F46 Exception/Period counted by GRS moves out of carry (precedent AT-154) (AT-82) | none |
| 9 | `workingTimes`<br>WorkingTime[] <=5, required | `workingTimes`<br>WorkingTime[] 1..5, optional (absent = none; never []) | `"workingTimes":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); F36 as WeekDay.workingTimes (AT-159) | none |
| 10 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-83) | none |
| 11 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-84) | none |

## WorkingTime

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-19) | none |
| 2 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | not touched (AT-160) | none |
| 3 | `fromTime`<br>Time\|null, required | `fromTime`<br>Time "HH:MM:SS", optional | `"fromTime":"08:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261 Time shape (AT-161) | none |
| 4 | `toTime`<br>Time\|null, required | `toTime`<br>Time "HH:MM:SS", optional | `"toTime":"12:00:00"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3261; F37 description already says 00:00:00 = 24:00 (AT-162) | none |

## Resource

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-9) | none |
| 2 | `uid`<br>int | `uid`<br>int 0..2147483647 (required) | `"uid":4` | type | JDG-3284 (AT-85) | none |
| 3 | `name`<br>str\|null, required | `name`<br>str<=512, optional | `"name":"Yamada"` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3287 MSPDI limit 512 (AT-86) | none |
| 4 | `resourceKind`<br>int\|null, required | `resourceKind`<br>int, optional | `"resourceKind":1` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F40 MSPDI-bound description: which of resourceKind/isCostResource wins (AT-87) | none |
| 5 | `isCostResource`<br>bool\|null, required | `isCostResource`<br>bool, optional | `"isCostResource":false` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; F40/F26 description (AT-88) | none |
| 6 | `calendarUid`<br>int\|null, required | `calendarUid`<br>int 0..2147483647, optional | `"calendarUid":3` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284; F44 (AT-89) | none |
| 7 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-90) | none |
| 8 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-91) | none |

## Assignment

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-10) | none |
| 2 | `uid`<br>int | `uid`<br>int 0..2147483647 (required) | `"uid":9` | type | JDG-3284 (AT-92) | none |
| 3 | `taskUid`<br>int\|null, required | `taskUid`<br>int 0..2147483647, optional | `"taskUid":7` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284 (AT-93) | none |
| 4 | `resourceUid`<br>int\|null, required | `resourceUid`<br>int 0..2147483647, optional | `"resourceUid":4` | type | C3 (JDG-3286/JDG-3302, JDG-3309): null removed, key omitted when the MSPDI element is absent; JDG-3284 (AT-94) | none |
| 5 | `carry`<br>Carry (map str->str), required ({} when nothing) | `passthroughValues`<br>PassthroughValues (map str->str<=65535, >=1 entry), optional (absent = nothing kept) | `"passthroughValues":{"Priority":"500"}` | rename+type | JDG-3279/JDG-3281 noun saying what it holds (CHOICE N1); F46 contract wording; JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-95) | none |
| 6 | `carryElements`<br>CarryElement[], required | `passthroughElements`<br>PassthroughElement[], optional (absent = none; never []) | `"passthroughElements":[{"ordinal":0,"name":"ExtendedAttribute"}]` | rename+type | JDG-3309 empty arrays omitted (minItems 1); JDG-3279/JDG-3281 rename with carry (CHOICE N1) (AT-96) | none |

## TaskVisual

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | description-only | F24 IV-23 kept (exactly one row per task); JDG-3311 IV-22 goes: presence of taskShape/milestoneShape follows Task.milestone (ET-11) | none |
| 2 | `taskUid`<br>int | `taskUid`<br>int 0..2147483647 (required) | `"taskUid":7` | type | JDG-3284; F24 (AT-97) | none |
| 3 | `shapeKind`<br>enum 5 shapes incl. milestone\|null, required | `taskShape`<br>enum rectangle\|chevron\|arrow\|endpointSpan; required when Task.milestone is not true, absent on milestones | `"taskShape":"chevron"` | rename+type | JDG-3311 (F22) task shape only; milestone leaves the list; written at creation (MSPDI rows and old null: rectangle); converter drops it on milestone rows (AT-100) | none |
| 4 | `milestoneGlyph`<br>enum 15 glyphs\|null default diamond, required | `milestoneShape`<br>enum 15 glyphs; required when Task.milestone is true, absent otherwise | `"milestoneShape":"diamond"` | rename+type | JDG-3311 (F22/F23) name pairs with taskShape (screen words: task shape / milestone shape); diamond written at creation (AT-101) | none |
| 5 | `fillColor`<br>str pattern\|null (null = theme), required | `fillColor`<br>$ref Color, optional (absent = not drawn) | `"fillColor":{"kind":"palette","name":"red"}` | union+type | F01/F02/F03 JDG-3260 kind union; JDG-3309/JDG-3310 theme is a kind, absent = nothing drawn (was transparent); GRS writes theme at creation; IV-9: not both absent; F05; F07 description (AT-102) | none |
| 6 | `strokeColor`<br>str pattern\|null (null = theme), required | `strokeColor`<br>$ref Color, optional (absent = not drawn) | `"strokeColor":{"kind":"palette","name":"red"}` | union+type | F01/F02/F03 JDG-3260 kind union; JDG-3309/JDG-3310 theme is a kind, absent = nothing drawn (was transparent); GRS writes theme at creation; IV-9: not both absent; F05; F07 description (AT-103) | none |
| 7 | `strokeWidthPx`<br>int 1..10\|null (x drawing ratio incl. 0.625) | `strokeWidthPx`<br>int 1..10, required | `"strokeWidthPx":1` | value-meaning+type | JDG-3278 drawn as px at display scale 100; JDG-3308 default written 1 (resolves old O2); JDG-3277 0.625 gone; JDG-3291 every ...Px = CSS px at displayScalePercent 100, x displayScalePercent/100, never x zoom (E-10) (AT-104) | Width N now draws N CSS px at display scale 100 (was N x 0.625); default outlines go 0.625 -> 1 px (JDG-3308); converted alpha documents x0.625 rounded, min 1 |

## TaskOrigin

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-12) | none |
| 2 | `taskUid`<br>int | `taskUid`<br>int 0..2147483647 (required) | `"taskUid":7` | type | JDG-3284 (AT-105) | none |
| 3 | `sourceProjectId`<br>str\|null, required | `sourceProjectId`<br>str 1..16, optional (absent = the source file had no Project.id) | `"sourceProjectId":"PRJ-01"` | type | JDG-3309 thought 1: absent key is the only "no value"; JDG-3302 5.8 two keys kept (overrides F47 sourceKey); CHOICE N19 name kept (AT-106) | none |
| 4 | `sourceUid`<br>int | `sourceUid`<br>int 0..2147483647 (required) | `"sourceUid":31` | type | JDG-3284 (AT-107) | none |
| 5 | `lastSeenImportSequence`<br>int | `lastSeenImportNumber`<br>int >=1 (required) | `"lastSeenImportNumber":2` | rename+type | pairs with Project.lastImportNumber (CHOICE N8) (AT-108) | none |
| 6 | `importSessionId`<br>str\|null | `importSessionId`<br>uuid, required | `"importSessionId":"5b0c9e1a-..."` | type | JDG-3302 C1 every import writes randomUUID; format uuid added (CHOICE A3) (AT-109) | none |

## CommentBox

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | description-only | F30 description: tip given by anchor (ET-13) | none |
| 2 | `id`<br>uuid | `id`<br>uuid (required) | `"id":"9a2d..."` | none | not touched (AT-110) | none |
| 3 | `leaderShapeKind`<br>enum calloutBox\|polyline\|null | - | - | remove | F32 one leader kind; value never changed the picture (CM-49 goes too) (AT-111) | none |
| 4 | `text`<br>str\|null (null = ""), required | `text`<br>str 1..65535, optional (absent = empty body) | `"text":"Check with QA"` | type | JDG-3309 thought 1: absent key is the only "no value": "" would be a second "no text" (CHOICE N21, replaces JDG-3302 5.10); JDG-3287 long text (AT-112) | none |
| 5 | `anchorDate`<br>DateTime\|null (null = document start) | `oneOf[freePoint]/dateTime`<br>DateTime "YYYY-MM-DDTHH:MM:SS", required in freePoint; not held while snapped | `"dateTime":"2026-10-01T09:00:00"` | rename+union | F30 + JDG-3302; name dateTime is CHOICE N12; null "draw at document start" goes (AT-113) | none |
| 6 | `anchorTaskGroupId`<br>uuid\|null | `oneOf[freePoint]/taskGroupId ; taskGroupId`<br>uuid, required (freePoint and fallback) | `"taskGroupId":"6f1c0d2e-..."` | rename+union | F30 one meaning per place: the tip row, or where the tip falls when the target is deleted (AT-114) | none |
| 7 | `bodyOffsetPx`<br>object{dx,dy}\|null (null = 0,0), screen px | `bodyOffsetPx`<br>object{dx,dy}, required | `"bodyOffsetPx":{"dx":12,"dy":-12}` | value-meaning+type | JDG-3302 C1 written at placement ({0,0} when none); JDG-3291 MEANING CHANGES: CSS px at displayScalePercent 100, now x displayScalePercent/100 (was screen px); zoom still never applies; overturns JDG-456/JDG-464/JDG-2895 as to display scale; not renamed to ...ScreenPx; box keeps its place beside what it points at (E-13) (AT-115) | At a display scale other than 100 this size now grows or shrinks with the drawing (unchanged at 100) |
| 8 | `bodyOffsetPx/dx`<br>num | `bodyOffsetPx/dx`<br>num (required) | `"dx":12` | none | unit follows bodyOffsetPx (JDG-3291); dx/dy abbreviation flagged (CHOICE N13) (AT-115) | none |
| 9 | `bodyOffsetPx/dy`<br>num | `bodyOffsetPx/dy`<br>num (required) | `"dy":-12` | none | as dx (CHOICE N13) (AT-115) | none |
| 10 | `anchorBandFraction`<br>num 0..1\|null (null = 0.5) | `oneOf[freePoint]/bandFraction ; bandFraction`<br>num 0..1, required | `"bandFraction":0.5` | rename+union | F31 one spelling of the middle; F30; suffix Fraction (JDG-3297 says 0 <= x < 1; a band keeps 1 = bottom edge, CHOICE N23) (AT-163) | none |
| 11 | `anchorTaskUid`<br>int\|null (null = not snapped) | `oneOf[task]/taskUid`<br>int 0..2147483647, required in task | `"taskUid":12` | rename+union | F30 kind says what the tip is snapped to (AT-164) | none |
| 12 | `anchorTaskFigure`<br>enum plannedBar\|actualBar\|milestone\|null | `oneOf[task]/figure`<br>enum plannedBar\|actualBar\|milestone, required in task | `"figure":"plannedBar"` | rename+union | F30 (AT-165) | none |
| 13 | `anchorHighlightBoxId`<br>uuid\|null | `oneOf[highlightBox]/highlightBoxId`<br>uuid, required in highlightBox | `"highlightBoxId":"9a2d..."` | rename+union | F30; JDG-3281 reference <entity>Id (AT-166) | none |
| 14 | `anchorSnapPoint`<br>enum 8 points\|null | `oneOf[task]/point ; oneOf[highlightBox]/point`<br>enum 8 points, required in task and highlightBox | `"point":"topLeftCorner"` | rename+union | F30 (AT-167) | none |
| 15 | - | `anchor`<br>$ref CommentBoxAnchor, required | `"anchor":{"kind":"freePoint","dateTime":"2026-10-01T09:00:00","taskGroupId":"6f1c...","bandFraction":0.5}` | add | F30 one union of value kinds replaces 7 flat columns; a box whose columns do not agree is refused instead of drawn at a free point (AT-113) | none |
| 16 | `strokeColor`<br>str pattern (no transparent)\|null | `strokeColor`<br>$ref Color, required | `"strokeColor":{"kind":"theme"}` | union | F01/F02/F03 JDG-3260; F04 never "not drawn", so required (JDG-3310); theme replaces null (AT-148) | none |
| 17 | `textColor`<br>str pattern (no transparent)\|null | `textColor`<br>$ref Color, required | `"textColor":{"kind":"theme"}` | union | F01/F02/F03 JDG-3260; F04 never "not drawn", so required (JDG-3310); theme replaces null (AT-152) | none |
| 18 | `strokeWidthPx`<br>int\|null (null = S-374), screen px | `strokeWidthPx`<br>int 1..10, required | `"strokeWidthPx":1` | value-meaning+type | JDG-3302 C1 written from S-374 at placement; bounds added (CHOICE A1); JDG-3291 MEANING CHANGES: CSS px at displayScalePercent 100, now x displayScalePercent/100 (was screen px); zoom still never applies; overturns JDG-456/JDG-464/JDG-2895 as to display scale; not renamed to ...ScreenPx (E-12) (AT-149) | At a display scale other than 100 this size now grows or shrinks with the drawing (unchanged at 100) |
| 19 | `fillColor`<br>str pattern incl. transparent\|null (null = S-146) | `fillColor`<br>$ref Color, required | `"fillColor":{"kind":"theme"}` | union | F06/JDG-3276 box fill always holds a colour, so required (JDG-3310); theme replaces null (AT-150) | Picking the palette "transparent" on a comment box fill sets transparency 100 and keeps the colour |
| 20 | `fillTransparencyPercent`<br>int\|null (null = S-375 0) | `fillTransparencyPercent`<br>int 0..100, required (100 = invisible fill) | `"fillTransparencyPercent":0` | type | JDG-3276 invisibility is 100; JDG-3304 comment default 0 written at placement; bounds added; suffix Percent (JDG-3297) (AT-151) | Choosing a fill colour on a transparency-100 box sets 50 (JDG-3304) |
| 21 | `fontSizePx`<br>int\|null (null = S-624 10), screen px | `fontSizePx`<br>int 8..24, required | `"fontSizePx":10` | value-meaning+type | JDG-3302 C1 written from S-624 at placement; bounds added; JDG-3291 MEANING CHANGES: CSS px at displayScalePercent 100, now x displayScalePercent/100 (was screen px); zoom still never applies; overturns JDG-456/JDG-464/JDG-2895 as to display scale; not renamed to ...ScreenPx (E-11) (AT-168) | At a display scale other than 100 this size now grows or shrinks with the drawing (unchanged at 100) |
| 22 | - | `hyperlinkAddress`<br>str 1..512 (URL), optional (absent = no link) | `"hyperlinkAddress":"https://example.com/ticket/42"` | add | CR-849 JDG-3314: GRS-owned (not exported) but MSPDI names, same rule as Task | none |
| 23 | - | `hyperlink`<br>str 1..512 (link title), optional (absent = no link title) | `"hyperlink":"Ticket 42"` | add | CR-849 JDG-3314 | none |

## HighlightBox

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity (ET-14) | none |
| 2 | `id`<br>uuid | `id`<br>uuid (required) | `"id":"3e7a..."` | none | not touched (AT-116) | none |
| 3 | `start`<br>DateTime\|null (T00:00:00) | `firstDay`<br>Day, required | `"firstDay":"2026-10-01"` | rename+type | F09/F12 whole-day range as Day firstDay/lastDay inclusive (JDG-3281); clock = schedule data clock; src already reads only the day (AT-117) | none |
| 4 | `finish`<br>DateTime\|null (T23:59:00) | `lastDay`<br>Day, required | `"lastDay":"2026-10-03"` | rename+type | F09/F12 (AT-118) | none |
| 5 | `topTaskGroupId`<br>uuid\|null | `topTaskGroupId`<br>uuid, required | `"topTaskGroupId":"6f1c..."` | type | JDG-3302 C1 (CM-52 never accepted null) (AT-119) | none |
| 6 | `bottomTaskGroupId`<br>uuid\|null | `bottomTaskGroupId`<br>uuid, required | `"bottomTaskGroupId":"6f1c..."` | type | JDG-3302 C1 (AT-120) | none |
| 7 | `strokeColor`<br>str pattern\|null (null = S-312), required | `strokeColor`<br>$ref Color, optional (absent = no frame line) | `"strokeColor":{"kind":"theme"}` | union+type | F01/F02/F03 JDG-3260; JDG-3309/JDG-3310 absent = nothing drawn; GRS writes theme at placement; IV-9: no frame with fill transparency 100 is refused (AT-121) | none |
| 8 | `cornerRadiusPx`<br>num\|null (null drew unrounded), screen px | `cornerRadiusPx`<br>num 0..24, required (0 = square) | `"cornerRadiusPx":4` | value-meaning+type | F33 + JDG-3302 C1 written from S-132 at placement; old null -> 0; JDG-3291 MEANING CHANGES: CSS px at displayScalePercent 100, now x displayScalePercent/100 (was screen px); zoom still never applies; overturns JDG-456/JDG-464/JDG-2895 as to display scale; not renamed to ...ScreenPx (E-15) (AT-122) | At a display scale other than 100 this size now grows or shrinks with the drawing (unchanged at 100) |
| 9 | `strokeWidthPx`<br>int\|null (null = S-369), screen px | `strokeWidthPx`<br>int 1..10, required | `"strokeWidthPx":1` | value-meaning+type | JDG-3302 C1 written from S-369 at placement; bounds added; JDG-3291 MEANING CHANGES: CSS px at displayScalePercent 100, now x displayScalePercent/100 (was screen px); zoom still never applies; overturns JDG-456/JDG-464/JDG-2895 as to display scale; not renamed to ...ScreenPx (E-14) (AT-145) | At a display scale other than 100 this size now grows or shrinks with the drawing (unchanged at 100) |
| 10 | `fillColor`<br>str pattern incl. transparent\|null (null = S-155) | `fillColor`<br>$ref Color, required | `"fillColor":{"kind":"theme"}` | union | F06/JDG-3276 box fill always a colour, so required (JDG-3310); JDG-3304 placement default theme colour (S-370 transparent retired) (AT-146) | Picking the palette "transparent" on a box fill sets transparency 100 and keeps the colour |
| 11 | `fillTransparencyPercent`<br>int\|null (null = S-371 50) | `fillTransparencyPercent`<br>int 0..100, required (100 = invisible fill) | `"fillTransparencyPercent":100` | type | JDG-3304 highlight default 100 written at placement (frame matters); choosing a colour on 100 sets 50; suffix Percent (AT-147) | none (a new box still shows no fill; picking a colour gives 50 as today) |

## PassthroughElement

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | rename | with carry (CHOICE N1) (ET-15) | none |
| 2 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | key unchanged; $defs renamed (AT-123) | none |
| 3 | `name`<br>str | `name`<br>str 1..512 (required) | `"name":"ExtendedAttribute"` | type | JDG-3287 short-name cap on an XML element name (CHOICE L1) (AT-124) | none |
| 4 | `fields`<br>map str->str, required | `fields`<br>map str->str<=65535 (>=1 entry), optional (absent = no leaves) | `"fields":{"FieldID":"188743731"}` | type | JDG-3287 long-text cap (CHOICE L1); JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) (AT-125) | none |
| 5 | `children`<br>CarryElement[], required | `children`<br>PassthroughElement[], optional (absent = none; never []) | `"children":[{...}]` | type | JDG-3309 empty arrays omitted (minItems 1); item $ref follows the rename (AT-126) | none |

## DocumentStamp

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | rename | $defs names PascalCase like every other definition (CHOICE N14); document key unchanged (ET-16) | none |
| 2 | `scheduleUpdatedAt`<br>str date-time (UTC) | `scheduleUpdatedAt`<br>UtcInstant "YYYY-MM-DDTHH:MM:SSZ" (required) | `"scheduleUpdatedAt":"2026-10-25T03:04:05Z"` | type | one UTC instant type, to the second (CHOICE T2) (AT-127) | none |
| 3 | `lastEditedBy`<br>str (user\|template\|caller name) | `lastEditedBy`<br>$ref Writer (required) | `"lastEditedBy":{"kind":"agent","name":"claude-desktop"}` | union | F49 fixed words and free names no longer share one string (AT-128) | none |
| 4 | `settingsUpdatedAt`<br>str date-time (UTC) | `documentUpdatedAt`<br>UtcInstant (required) | `"documentUpdatedAt":"2026-10-25T03:04:05Z"` | rename+type | F48 it moves when either group moves (AT-129) | none |
| 5 | `fileSavedAt`<br>str date-time\|null (null = never saved), required | `fileSavedAt`<br>UtcInstant, optional (absent = never written to a file) | `"fileSavedAt":"2026-10-25T03:04:05Z"` | type | JDG-3309 thought 1: absent key is the only "no value" (AT-140) | none |

## ChangeLogEntry

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | rename | a definition names one entry; PascalCase (CHOICE N14/N2) (ET-17) | none |
| 2 | `ordinal`<br>int | `ordinal`<br>int (required) | `"ordinal":0` | none | key unchanged; $defs renamed (AT-130) | none |
| 3 | `editedBy`<br>str | `editedBy`<br>$ref Writer (required) | `"editedBy":{"kind":"user"}` | union | F49 same Writer type as lastEditedBy (closes the 1.3 open question of studies/75) (AT-131) | none |
| 4 | `explanation`<br>str | `explanation`<br>str 1..65535 (required) | `"explanation":"Moved the review a week"` | type | JDG-3287 long text (AT-132) | none |
| 5 | `changedAt`<br>str date-time (UTC) | `changedAt`<br>UtcInstant (required) | `"changedAt":"2026-10-25T03:04:05Z"` | type | one UTC instant type (CHOICE T2) (AT-133) | none |

## BaselineTask

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object | `(definition)`<br>object | `{...}` | none | entity; a task without both dates makes no row (JDG-3302 5.11) (ET-18) | none |
| 2 | `uid`<br>int | `uid`<br>int 0..2147483647 (required) | `"uid":12` | type | JDG-3284 (AT-134) | none |
| 3 | `name`<br>str\|null, required | `name`<br>str 1..512, optional (absent = the task had no name) | `"name":"Review"` | type | JDG-3309 thought 1: absent key is the only "no value" (CHOICE N21, replaces JDG-3302 5.10 ""); JDG-3287 same limit as Task.name (AT-135) | none |
| 4 | `start`<br>DateTime\|null | `start`<br>DateTime "YYYY-MM-DDTHH:MM:SS", required | `"start":"2026-10-01T17:00:00"` | type | JDG-3302 5.11; JDG-3261 (AT-136) | none |
| 5 | `finish`<br>DateTime\|null | `finish`<br>DateTime "YYYY-MM-DDTHH:MM:SS", required | `"finish":"2026-10-01T17:00:00"` | type | JDG-3302 5.11; JDG-3261 (AT-137) | none |
| 6 | `milestone`<br>bool\|null | `milestone`<br>bool, required (false when the source had none) | `"milestone":true` | type+description-only | F25/F26 the fact "was a milestone in the earlier plan"; name kept to mirror Task.milestone (CHOICE N15); always valued, so required (CHOICE N24) (AT-138) | none |

## PassthroughValues

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>map str->str | `(definition)`<br>map str->str<=65535, minProperties 1 | `{"Priority":"500"}` | rename+type+description-only | F46 "read only by the MSPDI writer and notices"; names #StopCountedFrom and xmlns; CHOICE N1; JDG-3287 cap (CHOICE L1); JDG-3309 empty map omitted like an empty array (minProperties 1, CHOICE L2) | none |

## DateTime

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>str\|null, -?YYYY+-MM-DDTHH:MM:SS(.f)?(Z\|+hh:mm)? | `(definition)`<br>str ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$ | `"2026-10-01T08:00:00"` | type | JDG-3261 only the form MS Project writes: no offset, no fraction (offset dropped on MSPDI import); JDG-3309 null leaves the type; 4-digit year (CHOICE T1) (T-350) | none |

## Time

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>str\|null, HH:MM:SS(.f)?(Z\|+hh:mm)? | `(definition)`<br>str ^\d{2}:\d{2}:\d{2}$ | `"08:00:00"` | type | JDG-3261 as DateTime (T-350) | none |

## ColumnFilter

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object{column,hiddenValues,fromDate,toDate} | `(definition)`<br>oneOf {kind:values,column,hiddenValues?,isBlankHidden} \| {kind:dateRange,column,firstDay?,lastDay?} | `{"kind":"dateRange","column":"plannedStart","lastDay":"2026-10-31"}` | union | F52 null no longer says both "not a date column" and "no bound"; value kinds, not none (JDG-3309); a dateRange needs at least one bound (anyOf required) (T-372) | none |
| 2 | - | `oneOf[*]/kind`<br>enum values\|dateRange, required | `"kind":"values"` | add | F52 (T-372) | none |
| 3 | `column`<br>str (spec row id, e.g. SQ-5) | `oneOf[*]/column`<br>$ref ColumnKey (required) | `"column":"status"` | type | F50 + JDG-3285 stable English names, never row ids (T-372) | none |
| 4 | `hiddenValues`<br>str[] ("" = blank; status as row ids DG-1, PM-4), required | `oneOf[values]/hiddenValues`<br>str[] (shown text, or stable status/type names) 1.., optional (absent = no value hidden) | `"hiddenValues":["Yamada"]` | type | F51 blank moves to isBlankHidden; JDG-3285 status codes become stable names; assignee stays by name (F51 CHOICE); JDG-3309 empty arrays omitted (minItems 1) (T-372) | none |
| 5 | - | `oneOf[values]/isBlankHidden`<br>bool, required | `"isBlankHidden":true` | add | F51 blank item as its own boolean; JDG-3281 is/has (replaces the accepted "hideBlank", CHOICE N16) (T-372) | none |
| 6 | `fromDate`<br>DateTime\|null, required | `oneOf[dateRange]/firstDay`<br>Day, optional (absent = no lower bound) | `"firstDay":"2026-10-01"` | rename+type | F52/F12; JDG-3309 absent = no bound (replaces the none/day bound union); JDG-3281 range firstDay/lastDay (CHOICE N17); Day of the schedule data clock (T-372) | none |
| 7 | `toDate`<br>DateTime\|null, required | `oneOf[dateRange]/lastDay`<br>Day, optional (absent = no upper bound) | `"lastDay":"2026-10-31"` | rename+type | F52/F12/JDG-3309 as firstDay (T-372) | none |

## ColumnSort

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `(definition)`<br>object\|null | `(definition)`<br>object {column, direction} | `{"column":"plannedStart","direction":"ascending"}` | type | JDG-3309 null leaves; "not sorted" is the sort key being absent (T-372) | none |
| 2 | `column`<br>str (spec row id) | `column`<br>$ref ColumnKey (required) | `"column":"plannedStart"` | type | F50 + JDG-3285 (T-372) | none |
| 3 | `direction`<br>enum ascending\|descending | `direction`<br>enum ascending\|descending (required) | `"direction":"ascending"` | none | not touched (T-372) | none |

## Day

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>str ^\d{4}-\d{2}-\d{2}$ | `"2026-10-01"` | add | F09/F12 date-only values; JDG-3281 ...Day; whose clock is said per key | none |

## UtcOffset

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>enum 27 standard offsets UTC-12:00..UTC+13:00 | `"UTC+09:00"` | add | F13 one offset type for 3 places | none |

## UtcInstant

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>str ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$ | `"2026-10-25T03:04:05Z"` | add | record instants and buildVersion; JDG-3301 UTC time form (CHOICE T2) | none |

## Color

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>oneOf theme\|palette\|custom (no none: an absent colour key is "not drawn") | `{"kind":"palette","name":"red"}` | add | JDG-3260/F01-F03 kind union; JDG-3309/JDG-3310 kinds palette/custom/theme; used by every colour key except TaskGroup.color (CHOICE N22: VisibleColor merged in) (AT-102) | none |
| 2 | - | `oneOf[*]/kind`<br>enum theme\|palette\|custom, required | `"kind":"custom"` | add | JDG-3310; theme is the only follow-state word for colours (JDG-3309) (AT-102) | none |
| 3 | - | `oneOf[palette]/name`<br>enum paper\|ink\|dimGray\|lightGray\|red\|blue\|yellow\|green\|orange\|purple, required | `"name":"ink"` | add | F05 white->paper, black->ink; transparent leaves (JDG-3310 absent = not drawn; JDG-3276 boxes use transparency 100); lowerCamel dimGray/lightGray (CHOICE N18) (T-294) | none |
| 4 | - | `oneOf[custom]/light`<br>$ref ColorSide, optional (absent = GRS derives it on load) | `"light":{"value":"#c0504d","source":"chosen"}` | add | JDG-3260; JDG-3077 one side may be omitted, at least one present (anyOf required); JDG-3077 holds again under JDG-3309 (AT-102) | none |
| 5 | - | `oneOf[custom]/dark`<br>$ref ColorSide, optional (absent = GRS derives it on load) | `"dark":{"value":"#b2423f","source":"derived"}` | add | JDG-3260; JDG-3077 as light (AT-102) | none |

## ColorSide

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>object {value, source} | `{"value":"#c0504d","source":"chosen"}` | add | JDG-3260 shape of one theme side | none |
| 2 | - | `value`<br>str ^#[0-9a-f]{6}$, required | `"value":"#c0504d"` | add | JDG-3260; lower-case hex (CHOICE T3) (AT-102) | none |
| 3 | - | `source`<br>enum chosen\|derived, required | `"source":"derived"` | add | JDG-3260/JDG-3265; JDG-3077 a side GRS derived on load is written with source derived (deriving does not mark the document dirty) (AT-102) | none |

## BandColor

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>oneOf theme\|palette (no ink)\|custom | `{"kind":"theme"}` | add | F04 task group band (S-315 not offered); JDG-3310 no none (AT-58) | none |

## Writer

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>oneOf {kind:user} \| {kind:template} \| {kind:agent,name} | `{"kind":"agent","name":"claude-desktop"}` | add | F49 T-229 rows as value kinds (AT-128) | none |
| 2 | - | `oneOf[*]/kind`<br>enum user\|template\|agent, required | `"kind":"user"` | add | F49 (AT-128) | none |
| 3 | - | `oneOf[agent]/name`<br>str 1..512, required | `"name":"claude-desktop"` | add | F49 the name the caller declared; JDG-3287 short name (AT-128) | none |

## CommentBoxAnchor

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>oneOf freePoint\|task\|highlightBox | `{"kind":"task","taskUid":12,"figure":"plannedBar","point":"topLeftCorner","fallback":{...}}` | add | F30 value kinds (a free tip is a place, not none) (AT-113) | none |
| 2 | - | `oneOf[*]/kind`<br>enum freePoint\|task\|highlightBox, required | `"kind":"freePoint"` | add | JDG-3302 3.2 a free tip is a value kind (AT-164) | none |
| 3 | - | `oneOf[task]/fallback`<br>$ref AnchorFallback, required | `"fallback":{"taskGroupId":"6f1c...","bandFraction":0.5}` | add | F30 where the tip falls when the task is deleted (read at delete, edit-annotation.ts) (AT-114) | none |
| 4 | - | `oneOf[highlightBox]/fallback`<br>$ref AnchorFallback, required | `"fallback":{"taskGroupId":"6f1c...","bandFraction":0.5}` | add | F30 as task (AT-114) | none |

## AnchorFallback

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>object {taskGroupId, bandFraction} | `{"taskGroupId":"6f1c...","bandFraction":0.5}` | add | F30 (AT-114) | none |

## ColumnKey

| # | old | new | example | change | why | screen change |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | - | `(definition)`<br>enum of stable column names of T-331/T-347/T-371 | `"plannedStart"` | add | F50 + JDG-3285; per-table restriction stated on each table (CHOICE N5); full list OPEN O5 (T-372) | none |

