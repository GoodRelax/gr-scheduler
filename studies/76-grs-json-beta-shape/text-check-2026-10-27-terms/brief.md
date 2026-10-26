# Term pass on the restyled GRS JSON schema descriptions (2026-10-27)

Input: `../text-check-2026-10-26-style/3-merged.tsv` (299 rows; column `new` is the restyled text that follows JDG-3346) and `../text-check-2026-10-26-style/0-root-new.txt` (the schema root description).
The owner ruled the GRS terms on a question sheet (`../terms/3-sheet1-questions.md`, decisions table and the three trees; rulings JDG-3348 and JDG-3351..3365 in `docs/development-records/rulings.md`).
This pass puts the ruled English names into the texts. It keeps every fact and every JDG-3346 rule (no it/its, no passive, glossary names only).

## Names to use (English, exactly as written here)

| Thing | Name | Old names to replace |
|---|---|---|
| The product in a sentence | GRS | "the app", "the tool", "GoodRelax Scheduler" (except where the text defines the name) |
| What GRS opens and edits | Schedule Document | "document" alone when the text means the whole file content; "the file" when it means the content |
| The `schedule` part | Schedule Data | "schedule data" (capitalise), bare "schedule" |
| Parts of Schedule Data | MSPDI part / GRS part | - |
| `documentSettings` / `documentStamp` / `changeLogEntries` | Document Settings / Document Stamp / Change Log | - |
| File formats | GRS JSON, GRS HTML, MSPDI | "single HTML", "the HTML file"; always name the format when the text says "file" |
| Made from a Schedule Document only | Derived Output: Picture (SVG, PNG, clipboard), Report (Markdown, TSV) | "picture export" -> "PNG and SVG export" is fine too |
| The schema | GRS JSON Schema | "the schema", "this schema" (the first mention in one text; "the schema" may follow) |
| `project.title` / `project.name` | Project Title / Project Name | "document title", "Document Title" |
| Area where task groups and tasks are drawn | Task Group Lanes | "Task Group Area", "chart" |
| One task group's row there | Task Group Lane | "the row of the task group", "band" |
| The whole drawing area between the two panels | Schedule Canvas | "chart", "canvas" |
| What GRS draws for a task | Task Graphic: Plan Bar, Actual Bar, Milestone Mark | "Task Bars", "task figure", "milestone glyph" (the drawn mark) |
| The part of the time span GRS shows | View | "visible range", "viewport" |
| The time line | Time Axis (the ruler band on screen is Time Ruler) | - |
| Comment box line and its end | Leader Line / Leader Anchor | "leader", "anchor" alone |
| Tool windows | Help Window, Search Window, Resource List Window, Delay Diagnostics Report Window, Holiday Settings Window | Help Modal, Search Panel, Resource List, Delay Diagnostics Report (as a window), Holiday Settings |
| Dialogs | Save As Dialog, Open File Dialog, Watermark Unlock Dialog, Difference Review Dialog, Import Report Dialog, Message Box, Confirmation Message | Export Chooser, Open Chooser, Watermark Unlock, Difference Review, Import Report |
| Panels and bars | Task Group Panel, Task Group Title Tree, Properties Panel, Command Palette, App Header, Schedule Filter Bar, Panel Divider, Time Ruler, Scrollbars, Watermark, Notification, Tooltip | - |

Banned: "chart" (JDG-3357), bare "schedule" (JDG-3358: always "Schedule Document", "Schedule Data", "Schedule Canvas" or "Schedule Filter"), "Canvas Overlays" (JDG-3362).

## Wait for sheet 2 (do NOT rename these yet)

The owner rules these names tomorrow (sheet 2, questions 10-19). Leave the words as they are and put `wait-sheet2` plus the words in the note column:
comment box / Comment Box(es), highlight box, annotation, label (Name Label, Assignee Label, Percent Complete Label), Progress Marker, Resume Icon, Deadline Mark, grab / handle / grip, selection, marquee, cursor, dependency line(s), arrowhead, fade, baseline / outline, guide line, dummy, Status Line, Progress Line, Date Grid Lines, Group Grid Lines, Drop Cue.

## Do not change

- Facts. Do not add, drop or soften any statement. If a name cannot go in without changing a fact, keep the fact and flag it.
- `{{S-nnn}}` placeholders, exactly. Property names, values in quotes, JSON snippets, MSPDI element names.
- The opening "Same as MSPDI X." wording and the "Carried" tag.
- JDG-3346: no it/its, no passive (GRS as subject, imperative for writers), glossary names only.
- Length: stay at or under the current length where you can (criteria E3 in `../shipped-text-criteria.md`).

## Output

`4-terms-applied.tsv` in this folder, one line per input row (all 299, also unchanged ones): `id	new	changed	note` with `changed` = `yes` or `no`, and the root as one more row with id `ROOT`. No tabs or line breaks inside a cell. Header line: `id	new	changed	note`.
Also add one row `D017-title` with the new title of D017: "How GRS draws the Schedule Document when GRS opens the Schedule Document" or a shorter form that keeps the ruled names.

Before you finish, check mechanically: no `\bit\b` / `\bits\b`, no "chart", no "Task Group Area", no old window names, no bare "schedule" (a regex that allows only the four compound names), every `{{S-nnn}}` of the input still present, 301 data rows.
