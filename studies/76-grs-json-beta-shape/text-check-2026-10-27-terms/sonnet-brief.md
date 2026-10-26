# Pass 2 (Sonnet): check the shipped English against the specification

You check the GRS JSON Schema descriptions after the style pass (JDG-3346) and the term pass (`brief.md`, JDG-3348 and JDG-3351..3365). Pass 1 (Haiku) read each text blind and wrote what a first-time reader understands.

## Read

- `shipped-text-criteria.md` (one folder up): criteria E1..E7, approved by the owner (JDG-3328).
- `0-root.txt`: the schema root description (terms and concepts the property texts lean on).
- `1-blind-sheet.tsv`: the texts (row, element, type, text).
- `2-haiku-explanations-a.tsv` and `-b.tsv`: the blind reader's explanation and hard parts.
- For facts: `docs/spec/` (requirements `01-04-requirements.md`, glossary `_assets/tbl-glossary.md`, settings `_assets/tbl-settings.md`), the manuscripts in `docs/spec/_source/`, and the CR drafts `change-request/CR-851-*.md`, `CR-848-*.md`, `CR-849-*.md` (the shape after CR-851). Search with grep; do not read whole files.

## For each row in your range

Judge the text against E1..E7. Pay most attention to:
- **E7 (true)**: every statement must hold in the spec. Rows a previous pass was unsure about: D079 and D081 (which files the same-document check runs on: GRS JSON, MSPDI, GRS HTML?), D082 (is the title the default file name in the Save As Dialog, or somewhere else?), D146 and D147 (which formats GRS refuses to open when a task has no start/finish), D260 (fileSavedAt: what counts as a save).
- **E1**: where Haiku misread the text, say what made it misread.
- Do not undo the ruled names (Schedule Document, Schedule Data, Task Group Lanes, Task Group Lane, Task Graphic, Plan Bar, Actual Bar, Milestone Mark, View, Time Axis, Leader Line, Leader Anchor, GRS JSON Schema, Project Title, Project Name, the Window and Dialog names) and do not bring back "it", "its", passive voice, "chart" or bare "schedule".

## Output

Write `3-sonnet-judgements-<part>.tsv` (the part letter is in your task) with header `id	verdict	failed	problem_ja	suggested_en`:
- verdict `ok` or `fix`; failed = the criteria ids that fail (`E7,E1`) or `-`;
- problem_ja = what is wrong, in plain Japanese, with the spec place that proves it (file and row id) for E7;
- suggested_en = the full corrected English text for a `fix` row (keep JDG-3346 and the ruled names), `-` for `ok`.
One line per row in your range, no tabs or line breaks inside a cell. Finish every row of your range yourself. Report in under 8 lines: rows ok, rows fix, and the E7 fixes by id.
