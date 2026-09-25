# An AI prompt that turns schedule images, slides and spreadsheets into GRS JSON

This prompt lets you hand an AI a schedule drawn in a drawing tool (such as PowerPoint) or a spreadsheet (such as Excel), or a screenshot of one, and have it write a `GRS JSON` document that GRS can open.
It matches the colours, gradients, shapes, fades and horizontal lines of the original as closely as GRS can hold them.
The Japanese version is [prompt-ja.md](prompt-ja.md).

## How to use it

1. Download these two files. Open each link and press the download button on the file's page (Download raw file). You do not need git.
   - [grs-skeleton.json](grs-skeleton.json) (an empty GRS document, checked to validate against the schema)
   - [grs-document.schema.json](../../spec/_source/grs-document.schema.json) (the authority on the shape of GRS JSON)
2. Attach to an AI that can read images and files the schedule to convert (an image, a slide file or a spreadsheet file; several are fine) and the two files from step 1.
3. Paste the block under "Prompt" as it is, and fill in the `[ ]` parts.
4. Save the JSON the AI returns as `something.json` and open it with GRS's open command.
5. Check the AI's "Estimates" table against the original, above all the key dates, colours and how the rows were split.

⚠️ Do not use the JSON files in `sample-schedule/` as a base. They no longer validate against the schema (checked 2026-09-16). The base is `grs-skeleton.json`.

## Prompt

````text
You are an expert at reading and converting schedule charts. Read the attached schedule (images, slides or spreadsheets) and write one "GRS JSON" document that the Gantt chart tool GRS can open. Match not only the dates but also the colours, gradients, shapes, fades and horizontal lines of the original as closely as you can.

# Attachments
- The original schedule: [file names; list all of them]
- grs-skeleton.json: an empty GRS document. Use it as the base
- grs-document.schema.json: the authority on the shape (JSON Schema 2020-12). If attached, follow it strictly

# Assumptions
- Base year: [the year to use when the original does not show one, e.g. 2026]
- Days off: [e.g. Saturdays and Sundays; if left blank, keep grs-skeleton.json's calendar (Monday to Friday are working days)]
- How to split rows: [e.g. one row per heading at the left edge / one row per person; if blank, follow the original's layout]
- Colour mode: [palette / free; if blank, palette]
  - palette: pick the closest of these 11 names: "white" "black" "dimgray" (dark grey) "lightgray" (light grey) "red" "blue" "yellow" "green" "orange" "purple" "transparent". The colours can be chosen again inside GRS later
  - free: "#RRGGBB" colours are allowed as well as the 11 names. Closer to the original, but the colour is not one of GRS's choices

# How to build it
1. Copy grs-skeleton.json whole and change only the following. Leave every other value (documentSettings, calendars, schemaVersion and so on) unchanged.
   - schedule.project: name / title / startDate / statusDate / themeHue / uidHighWaterMark
   - schedule.tasks / taskGroups / taskGroupMembers / taskVisuals
   - schedule.resources / assignments, only when people can be read from the original
   - documentStamp.lastEditedBy (leaving "ai-conversion" is fine)
2. Schema rules
   - Every object has all of the schema's required keys and no key the schema does not list (additionalProperties is false). When there is no value, use null (only for keys whose type allows null).
   - carry is {} and carryElements is [] (in tasks, dependencies, resources, assignments, calendars and project).
   - Dates and date-times are strings shaped "YYYY-MM-DDT00:00:00" (the time is always 00:00:00). Only documentStamp uses "YYYY-MM-DDTHH:MM:SSZ".
   - Dates lie between 1970-01-01 and 2200-12-31.
3. Rows (taskGroups)
   - Make one TaskGroup for each heading row of the original. id is a lowercase UUID (e.g. "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01"), unique within the document.
   - Put the heading's text in label. derivedFromTaskUid is null.
   - For nested headings, set parentId to the parent's id.
   - order is the position from the top among rows with the same parent (from 0). treeState is "auto": a still image cannot show whether a row was left collapsed, expanded or hidden inside the app, so always write "auto" here (GRS's other four values — "collapsed" stops drawing everything below the row, "expanded" keeps one level of children open, "temporarilyExpanded" keeps all children open until the next zoom-out, and "hidden" stops drawing the row itself — describe states a person set inside GRS, not something a still image can show). height is null.
   - color is the row band (background) colour of the original, chosen by the colour mode. null if the band has no colour.
   - Always have at least one TaskGroup.
4. Keep horizontal lines (important)
   - Within one row, GRS stacks tasks automatically, earliest start first, into the topmost lane where they do not overlap. So items that sat in one horizontal line in the original can be pushed into different lanes by other items in the same row. To prevent this:
   - Inside a heading row of the original, when two or more tasks or milestones sit in one horizontal line at the same height, treat them as one line. Their shapes may differ (a bar and a ◇ at the same height form one line together).
   - For each line, create a child row one level below the heading row (a TaskGroup whose parentId is the heading row's id), and put every item of the line in that child row. Put only that line's items in the child row.
   - Give the child rows order 0, 1, 2 … from the line that is highest in the original.
   - The child row's label is a short summary of the items in that line: up to 3 words if the original is in English (e.g. "Approvals", "Design reviews"), up to 2 words if it is in Japanese (e.g. 「承認」, 「設計レビュー」). derivedFromTaskUid is null.
   - When the heading row holds nothing but that line, do not create a child row; put the items in the heading row itself.
   - Keep row depth (the root row counts as 1) at 3 or less. GRS does not draw rows of depth 4 or more at the default vertical zoom. When a child row would be at depth 4, do not nest it; place it as a row of the same depth right below the heading row, and say so under "Estimates".
5. Tasks (tasks)
   - uid is an integer counted from 1, unique.
   - name is the name attached to the bar or symbol in the original. When it cannot be read, estimate a close wording and list it under "Estimates".
   - start and finish are the planned start and finish dates. When a bar's end is slanted or fading, use the outer end including that part. finish must not be before start.
   - For a milestone (a one-day mark such as ◇ ▼ ★), set milestone to true and start and finish to the same day. Otherwise false.
   - Set wbsParentUid to the parent's uid only when the original clearly draws parent and child (a summary bar and its child bars). Otherwise null. wbsOrder is the position among siblings (from 0). Never make a cycle.
   - When actuals are drawn (a bar separate from the plan, a filled part, a done mark and so on):
     - Done: dates in actualStart and actualFinish, stop is null, percentComplete is 100.
     - In progress: dates in actualStart and stop (the last day the actual has reached), actualFinish is null, percentComplete as read (null if unreadable).
     - Not started, or no actuals drawn: actualStart, stop and actualFinish are null, percentComplete is null.
     - The last day of the actual must not be before actualStart.
   - resume is null and resumeValid is null. deadline, notes and calendarUid are null.
   - For a dependency (an arrow joining two tasks), add {"predecessorUid": uid of the earlier task, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": []} to the later task's dependencies. linkType is 0 = finish to finish, 1 = finish to start, 2 = start to finish, 3 = start to start. lagFormat 7 means days, and lag is that number of days. With no arrows, [].
6. Fades, and gradients that fade out (fadeInDays / fadeOutDays)
   - A fade in GRS slants the end of a planned bar (it marks dates that are not yet firm). Start side only gives a trapezoid with a slanted left edge, finish side only a trapezoid with a slanted right edge, both a parallelogram.
   - When an end of a bar in the original is slanted, tapered, or its colour fades out through a gradient into the background or transparency, put the horizontal length of that part in calendar days into fadeInDays for the start side and fadeOutDays for the finish side. null for a side without one.
   - Only tasks shaped "rectangle" or "chevron" may have fades. Arrows, endpoint spans and milestones never do (null).
   - fadeInDays and fadeOutDays are 0 or more, and together do not exceed the calendar days of finish − start. A task with a fade has a finish. GRS refuses to open a document that breaks this.
   - Actual bars have no fades. Do not read slants or fading on actuals.
7. Which row holds each task (taskGroupMembers)
   - Every task is pointed at by exactly one {"taskUid": uid, "groupId": row id, "stackOrder": null}. Choose the row in which the original draws the bar (including the child rows made in step 4).
8. Shapes and colours (taskVisuals)
   - Put exactly one for every task.
   - shapeKind:
     - A rectangular bar (including bars with slanted or fading ends): "rectangle"
     - A chevron (>===>): "chevron"
     - A thin arrow (--->): "arrow"
     - A line with dots at both ends (*----*): "endpointSpan"
     - A symbol (milestone): "milestone". Set milestoneGlyph to the closest of "circle" / "hexagon" / "pentagon" / "diamond" / "square" / "star" / "triangleUp" / "triangleDown" / "file" / "box" / "floppyDisk" / "cylinder" / "person" / "smile" / "beerMug". For any other shape, milestoneGlyph is null.
   - Choose fillColor (the fill) and strokeColor (the outline) from the original's colours by the colour mode. A bar with no fill (outline only) gets fillColor "transparent"; a bar with no outline gets strokeColor "transparent". Never make both "transparent".
   - Match colour gradients to the original:
     - A gradient that fades into the background or transparency: use the strong end's colour as the fill, and express the fading part as a fade from step 6.
     - A gradient between two colours: use the colour covering more of the bar as the fill (the middle colour if it is half and half), and list it under "Could not match".
   - Leave the bar colour used most in the original as null, and instead set project.themeHue to that colour's hue (an integer 0 to 359: red 0, yellow 60, green 120, blue about 210, purple about 280). A null colour is drawn in the colour made from themeHue, and actual bars and marks follow it. If the original is nearly colourless, leave themeHue at 214.
   - lineWeight is the outline thickness compared within the original: "thin" / "medium" / "thick". null when no difference is visible.
   - Shape of one entry: {"taskUid": uid, "shapeKind": value above, "milestoneGlyph": value above or null, "fillColor": colour or null, "strokeColor": colour or null, "lineWeight": weight or null}
9. People (only when readable)
   - resources gets {"uid": integer, "name": person's name, "resourceKind": 1, "isCostResource": false, "calendarUid": null, "carry": {}, "carryElements": []}, and assignments gets {"uid": integer, "taskUid": uid, "resourceUid": the person's uid, "carry": {}, "carryElements": []}. These uids may be counted from 1 separately from tasks.
10. project
   - name and title are the schedule's title, startDate is the earliest planned start, statusDate is the day of the original's "today" line (null if none). themeHue as in step 8. uidHighWaterMark is the largest uid used in tasks, resources and assignments.

# Rules for reading images
- Read dates from the time scale and round to whole days. When the scale shows only months or weeks, estimate days in proportion from the position of the bar ends.
- Judge whether items sit at the same height by their vertical centres. If they look slightly off but the original clearly means one line, treat them as one line.
- Judge a colour by the item's main colour, ignoring shadows and gloss. Handle gradients as in steps 6 and 8.
- Never invent what cannot be read. Always list estimates under "Estimates".
- Do not add headings, tasks or dependencies the original does not have (the child rows of step 4 may be added).

# Output
1. An "Estimates" table (columns: item / estimated value / reason). Write "none" if there are no estimates. Always include the themeHue value and every child row you created (with its label).
2. Bullet lists "Could not read" and "Could not match" (colours, shapes, two-colour gradients and so on that GRS does not have). Write "none" if empty.
3. The finished GRS JSON in one code block. Output all of it, with no ellipsis (...).
4. Before output, check the following yourself and write the result of each on one line.
   - uids in tasks, resources and assignments, and ids in taskGroups, are each unique
   - Every task appears exactly once in taskGroupMembers and exactly once in taskVisuals
   - Every predecessorUid, assignments' taskUid / resourceUid, taskGroupMembers' groupId and taskGroups' parentId exists
   - Every TaskGroup has a label
   - No task has finish before start. Milestones have the same start and finish
   - Tasks with fades are rectangle or chevron, have a finish, and fadeInDays plus fadeOutDays does not exceed the span in calendar days
   - Items that sat in one horizontal line at the same height (even with different shapes) are in one row that holds only them (except a heading row that holds nothing but that line). Child row labels are at most 3 words in English and 2 words in Japanese. Row depth is 3 or less
   - Colours use only the values the colour mode allows, and no entry has both fillColor and strokeColor "transparent"
   - No key the schema does not list was added
````

## A worked example

For an English schedule with one heading row, one child row below it and four tasks, this is the part of `schedule` you rewrite.

- "Draft the plan": an orange bar whose finish end fades out through a gradient (done). The strong orange is the fill, and the 5 fading days are the fade-out
- "Plan approved", "Budget review", "Budget approved": a ◇, a grey bar and a ◇ at the same height. The shapes are mixed but they form one line, so all three sit in one child row labelled "Approvals". The heading row also holds "Draft the plan", so the child row is needed

Merged into `grs-skeleton.json` with `schedule.project.uidHighWaterMark` set to `4`, it validates against the schema (checked 2026-09-16). If the colour used most in the original is blue, `schedule.project.themeHue` stays at `214`.

```json
{
  "tasks": [
    {
      "uid": 1, "wbsParentUid": null, "wbsOrder": 0, "name": "Draft the plan",
      "start": "2026-04-06T00:00:00", "finish": "2026-04-24T00:00:00", "milestone": false,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": "2026-04-06T00:00:00", "stop": null, "actualFinish": "2026-04-27T00:00:00",
      "resume": null, "resumeValid": null, "percentComplete": 100,
      "fadeInDays": null, "fadeOutDays": 5, "dependencies": [], "carry": {}, "carryElements": []
    },
    {
      "uid": 2, "wbsParentUid": null, "wbsOrder": 1, "name": "Plan approved",
      "start": "2026-04-30T00:00:00", "finish": "2026-04-30T00:00:00", "milestone": true,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null,
      "dependencies": [
        { "predecessorUid": 1, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": [] }
      ],
      "carry": {}, "carryElements": []
    },
    {
      "uid": 3, "wbsParentUid": null, "wbsOrder": 2, "name": "Budget review",
      "start": "2026-05-04T00:00:00", "finish": "2026-05-13T00:00:00", "milestone": false,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null, "dependencies": [], "carry": {}, "carryElements": []
    },
    {
      "uid": 4, "wbsParentUid": null, "wbsOrder": 3, "name": "Budget approved",
      "start": "2026-05-15T00:00:00", "finish": "2026-05-15T00:00:00", "milestone": true,
      "deadline": null, "notes": null, "calendarUid": null,
      "actualStart": null, "stop": null, "actualFinish": null,
      "resume": null, "resumeValid": null, "percentComplete": null,
      "fadeInDays": null, "fadeOutDays": null,
      "dependencies": [
        { "predecessorUid": 3, "linkType": 1, "lag": 0, "lagFormat": 7, "carry": {}, "carryElements": [] }
      ],
      "carry": {}, "carryElements": []
    }
  ],
  "taskGroups": [
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "parentId": null, "label": "Planning",
      "derivedFromTaskUid": null, "order": 0, "treeState": "auto", "color": "lightgray", "height": null
    },
    {
      "id": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "parentId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "label": "Approvals",
      "derivedFromTaskUid": null, "order": 0, "treeState": "auto", "color": null, "height": null
    }
  ],
  "taskGroupMembers": [
    { "taskUid": 1, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c01", "stackOrder": null },
    { "taskUid": 2, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null },
    { "taskUid": 3, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null },
    { "taskUid": 4, "groupId": "3f1c2a9e-8b7d-4c21-9e0a-5d6f7a8b9c02", "stackOrder": null }
  ],
  "taskVisuals": [
    {
      "taskUid": 1, "shapeKind": "rectangle",
      "milestoneGlyph": null, "fillColor": "orange", "strokeColor": "dimgray", "lineWeight": "medium"
    },
    {
      "taskUid": 2, "shapeKind": "milestone",
      "milestoneGlyph": "diamond", "fillColor": "yellow", "strokeColor": "black", "lineWeight": null
    },
    {
      "taskUid": 3, "shapeKind": "rectangle",
      "milestoneGlyph": null, "fillColor": "lightgray", "strokeColor": "dimgray", "lineWeight": "thin"
    },
    {
      "taskUid": 4, "shapeKind": "milestone",
      "milestoneGlyph": "diamond", "fillColor": "yellow", "strokeColor": "black", "lineWeight": null
    }
  ]
}
```

## Checking the JSON you got

Opening it in GRS is the surest check. GRS does not open a document whose shape is wrong.

If you have Python, you can also check only the shape before opening it (skip this if you do not).

1. Put the downloaded `grs-document.schema.json` in the same folder as the JSON the AI wrote (`out.json` below).
2. Install Python's `jsonschema`: `python -m pip install jsonschema`
3. In that folder, run the following. `0 errors` means the shape is right.

```bash
python -c "import json,sys,jsonschema; s=json.load(open('grs-document.schema.json',encoding='utf-8')); d=json.load(open(sys.argv[1],encoding='utf-8')); e=list(jsonschema.Draft202012Validator(s).iter_errors(d)); print(len(e),'errors'); [print(list(x.absolute_path),x.message[:120]) for x in e[:20]]" out.json
```

⚠️ Passing the schema does not cover the document invariants (row depth, every task in exactly one row, fade lengths and so on). The full list is the table of `IV-` rows in section 6.1 of `docs/spec/05-07-design.md`.

## What cannot be matched

- **Horizontal lines**: a name label placed outside its shape also counts toward the width an item takes in its row (table T-038's `OC-1` in `docs/spec/01-04-requirements.md`). If items in a line sit close together and their names are long, they still split into two lanes inside the child row.
- **Deep rows**: a row of depth d (d ≥ 2) is drawn only when the vertical zoom is at least `0.32 × 1.875^(d − 2)` (table T-205's `S-87` / `S-88`). At zoom 1 that is depth 3; depth 4 needs 1.125 and depth 5 needs 2.11, close to the zoom ceiling. That is why the prompt keeps depth at 3.
- **Gradients**: GRS cannot draw colour gradients. A gradient that fades out is approximated by a fade, which slants the end. A fade means "these dates are not yet firm", so a decorative gradient in the original gets a mark with that meaning. A two-colour gradient becomes one colour.
- **Colours**: the palette has 11 colours, and shadows and gloss cannot be drawn.
- **Name placement and text colour**: GRS places names. A document cannot hold text colours.

## Notes for developers

If you only use the app, you can skip this section.

- The authority on the shape is `docs/spec/_source/grs-document.schema.json` (section 6.2 of `docs/spec/05-07-design.md`). The rules here were taken from it, from the `IV-` rows of section 6.1, and from `docs/spec/01-04-requirements.md`'s table T-052 (4.1), table T-012a for fades (`FD-`), table T-014 for stacking (`ST-`) and table T-017 for the palette (`CL-`). When the specification changes, review this guide, the Japanese version and `grs-skeleton.json`.
- The specification has not yet fixed how the palette colours are spelled (`PND-494`). This guide follows the spellings (`dimgray` and so on) used by GRS's startup template, `src/framework/single-html-shell/startup-template.json`.
- `grs-skeleton.json` was made from the same template by emptying the schedule and keeping one row. ⚠️ It is not a generated file, so `npm run gen:check` does not catch drift.
