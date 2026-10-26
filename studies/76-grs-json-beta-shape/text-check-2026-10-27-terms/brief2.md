# Term pass 2: the sheet-2 names (2026-10-27)

Sheet 2 of the term rulings is closed (`../terms/3-sheet1-questions.md`, rulings JDG-3366..3379; summary in `../terms/6-cr855-handoff.md`). This pass puts those names into the schema texts.

## Inputs

- `4-terms-applied.tsv`: the 48 rows listed in `waiting-sheet2.txt` (column `new`; their note says which words waited).
- `4-seat.tsv`: the 252 final texts of pass 1 (column `final_en`). Scan them too: change a row only if it still holds a word that sheet 2 retired.
- `0-root.txt`: the root; change it only if it holds a retired word.

## Names (English, exactly)

| Thing | Name | Retired |
|---|---|---|
| The small marks on a Task Graphic | Progress Mark, Resume Mark, Deadline Mark, Milestone Mark | Progress Marker, marker, Resume Icon, "deadline marker" |
| The three dots at the end of a cut Dependency Line | Continuation Mark | continuation dots |
| Name, assignee and percent text beside a task | Name Label, Assignee Label, Percent Complete Label (together: Task Labels) | "tag", "badge" for these |
| Comment box and highlight box | Comment Box, Highlight Box (singular; in a sentence "a Comment Box", "Comment Boxes") | Callout, "comment boxes" as a name |
| Annotations | Annotation (a Comment Box or a Highlight Box) | - |
| Lines | Dependency Line, Leader Line, Leader Anchor, Arrowhead, Progress Line, Status Line, Date Grid Lines, Group Grid Lines, Plan-Actual Guide Line, Resume Dash Line | "dependency lines" as a name, "link" for a Dependency Line |
| Drawn parts | Fade Ramp (the slope of a fade), Baseline Outline, Actual Dummy | "fade trapezoid", "baseline outline" lower case is fine in a sentence |
| What GRS draws in the Task Group Lanes | Graphics; one task's drawing is a Task Graphic | - |
| A sub-row of a Task Group Lane | Stack Tier | "stack row", "lane" for this |
| Grabbing | Grab Point, Grab Area, Handle (Fade Handle, Resize Handle, Leader Anchor Handle), Grip, Grab Margin | grab region, grab strip, grab band |
| Fit | Zoom to Fit (the command), Fit Span (the fixed span) | "fitting the Schedule Data to the window", "fit to window" |
| Scrollbars | Scroll Track, Scroll Thumb | - |
| Cues | Interaction Cues (Selection Frame, Marquee Rectangle, Tentative Dependency Line, Dependency End Outline, Drop Line, Drag Copy, Drop Cue), Jump Landing Marks | - |

For D022, D031 and D034 (they waited for the fit name): "When GRS runs Zoom to Fit, ..." and "the span that Zoom to Fit and PNG and SVG export show". Check `docs/spec` (`IC-10`, `FR-055`, `K-141`) for what Zoom to Fit fits.

## Keep

Every fact; JDG-3346 (no it/its, no passive, glossary names only); `{{S-nnn}}`; "Same as MSPDI X."; property names, quoted values, JSON snippets. Stay at or under the current length where you can.

## Output

`5-terms2-applied.tsv` in this folder: header `id	new	changed	note`, one line for each of the 48 waiting rows, plus one line for every 252-row or ROOT text you changed (the rest stay as they are). Then check mechanically: no it/its, no retired word from the table above, every `{{S-nnn}}` kept. Report in under 10 lines: rows changed, ids you could not reconcile.
