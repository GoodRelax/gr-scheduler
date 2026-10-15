# Schema-only writer (X-14)

You are writing two schedule files for a Gantt-chart application called GRS. Its file format
("GRS JSON") is described by ONE JSON Schema file, and that file is ALL you may read:

    {SCHEMA}

Rules (hard):
- Read only the schema file above. Do not read, list or search any other file or folder, do not
  open the web, do not run code that reads other files. You may run a Python one-liner that
  validates your own output against the schema (`jsonschema`, draft 2020-12) -- nothing else.
- If the schema leaves you unsure, do NOT look elsewhere: decide, and record the doubt (below).

Write these two files:

1. `{OUT}/day-level.json` -- a day-level schedule: a calendar where Monday-Friday are working
   days and Saturday/Sunday are not, at least 8 tasks in at least 2 groups, at least 1 milestone,
   at least 4 dependencies (one with a lag), and at least 1 task in progress (started, not
   finished) with a status date set, plus 1 finished task. Times of day do not matter to you.

2. `{OUT}/minute-level.json` -- a minute-level schedule where the time of day matters: the chart
   shows times of day, the schedule's time zone is UTC+09:00, a working day of 09:00-12:00 and
   13:00-18:00, one exception day that works other hours than a normal day, one exception day (or
   weekday) that works until midnight (24:00), at least 6 tasks with start/finish at specific minutes,
   1 milestone at a specific minute, dependencies, and 1 task in progress with a status date at a
   specific minute.

Both files must open in GRS with no refusal, no notice and no recount: write every value the way
GRS itself would store it (for example percentComplete must be what GRS would compute from the
dates, and minutesPerDay must agree with the calendar).

Validate both files against the schema and fix every violation.

Then write `{OUT}/doubts.md`: one line per point where you wanted to read something outside the
schema -- a column you were unsure about, a value you could not decide, a rule you had to guess.
Format: `- <column or topic>: <what was unclear> -> <what you decided>`. If none, write `- none`.

Report back: the paths written, the validation result (violation count), and the doubts count.
