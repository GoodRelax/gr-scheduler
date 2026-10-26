# Style pass on the GRS JSON schema descriptions (2026-10-26)

The owner rejected the current texts as hard to read and set three rules (JDG-3346). Every description that ships in the GRS JSON schema must follow them. Rewrite only what breaks a rule; keep every fact.

## The three rules

1. **No "it" and no "its".** Name the thing every time, even when the same noun comes twice in one line: "GRS", "the task", "the value", "this property", "the task group", "the comment box". This includes the possessive "its" ("its band" -> "the row of the task group").
2. **No passive voice, as far as possible.** Give each sentence a subject that acts.
   - What GRS does: GRS is the subject. "A property with no value is omitted." -> "GRS omits a property that has no value."
   - What a writer of a GRS JSON file (a person or an AI) must do: use the imperative. "Write 1 for an exception you add."
   - "Absent means X" and "X when absent" are fine (no passive).
   - A past participle used as an adjective is not passive ("a finished task", "the shipped template", "the checked rows").
   - Keep a passive only where no actor can be named without inventing one; list each kept passive in the note column.
3. **Only glossary names for parts of the GRS screen and for data.** The glossary is `docs/spec/_assets/tbl-glossary.md`: table T-103 (UI parts, English names in backticks, rows U-1..U-68) and table T-101 (data). Use the English names exactly as the glossary writes them, with the same capital letters (Task Group Panel, Task Group Area, Schedule Canvas, Plan Bar, Actual Bar, Task Bars, Comment Boxes / a comment box, Highlight Boxes / a highlight box, Time Ruler, Dependency Lines, Status Line, Properties Panel, Command Palette, App Header, Document Title, Name Label, Progress Line, Search Panel, Holiday Settings, Delay Diagnostics Report, Resource List, Schedule Filter Bar). For comment box and highlight box, the existing lower-case "comment box" / "highlight box" may stay (the root uses them as data words).
   - "chart" -> "Task Group Area" where the text means where task groups and their tasks are drawn; "Schedule Canvas" where it means the whole drawing area below the App Header.
   - "band" (of a task group) -> "the row of the task group in the Task Group Area" (shorten to "the row of the task group" after the first mention in one text).
   - "on the screen" / "the screen shows" -> "in GRS" / "GRS shows".
   - "picture export" -> "PNG and SVG export".
   - "Fit to screen" is a command name: keep it only if the glossary or the spec names it so; otherwise write "fitting the schedule to the window" and flag it in the note.
   - General English words that name no GRS part ("file", "value", "day", "row" of a table, "name", "color") are fine.
   - If a text needs a screen word the glossary does not have, do not invent one: keep the meaning with plain words and flag it in the note.

## Do not change

- Facts. Do not add, drop or soften any statement. If a rule cannot be met without changing a fact, keep the fact and flag it.
- `{{S-nnn}}` placeholders, exactly.
- The opening "Same as MSPDI X." (and "Same as MSPDI X, except that ...") wording and the "Carried" tag as defined in the schema root.
- Property names, values in quotes, JSON snippets, MSPDI element names.
- Length: stay at or under the current length where you can (criteria E3 in `studies/76-grs-json-beta-shape/shipped-text-criteria.md`).

## Output

For every input row (all of them, also unchanged ones), one TSV line: `id	new	changed	note` where `changed` is `yes` or `no`, `new` is the full new text (the old text when unchanged), and `note` lists kept passives, flagged words or fact doubts ("-" if none). No tabs or line breaks inside a cell. Header line: `id	new	changed	note`.

Before you finish, check your own output mechanically: no `\bit\b` or `\bits\b` (any case) in `new`, no "chart", "band", "screen", "picture" left in `new`, and every `{{S-nnn}}` of the input still present.
