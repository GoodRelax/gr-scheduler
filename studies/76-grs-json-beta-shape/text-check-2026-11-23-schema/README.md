# Shipped-English check of the beta schema, 2026-11-23 (JDG-3328)

The descriptions of `../terms/grs-json-beta.schema.json` (311 texts and the root description) were checked in the four passes of JDG-3328. Criteria: E1-E7 of `../shipped-text-criteria.md`, plus the owner's style rules: no "it"/"its", no passive voice where a subject can stand, every sentence with a subject and a verb, glossary names only (JDG-3346 and the owner's writing rules).

| File | Pass | What it holds |
|---|---|---|
| `1-blind-sheet.tsv` | input | 324 rows: the root (S000), every key of the review tree in tree order, then the described `$defs` types; each with its shape (type and bounds) and its text |
| `2-haiku-explanations.tsv` | 1 Haiku | a first-time reader's Japanese explanation of each row, read without any other material, and what was hard (175 rows named a difficulty) |
| `3-sonnet-judgements.tsv` | 2 Sonnet | each explanation checked against the schema, the sources TSV, the findings and the rulings: ok or fix, the failed criteria, the problem, a replacement (247 fixes: 172 for a missing subject or verb only, 75 for facts or clarity) |
| `4-seat-final.tsv` | 3 the seat | the text that went into the schema for every row, where it came from (kept, sonnet, seat) and the seat's reason when the seat overrode the replacement |

How the seat checked pass 2:

- The 75 fact and clarity fixes were read one by one. Five were overridden: S010 (no server link exists; JDG-3743 says only "when GRS knows the name"), S150 (the added gloss of "arrow" said nothing), S168 (an empty task is an MSPDI Task with IsNull 1, as the sample shows), S248 and S251 (the light side and the dark side share the type ColorSide, so one text names the opposite side).
- The 172 style-only rewrites were compared with the old text by machine: every quoted value, camelCase name, number and capitalised glossary name of the old text had to appear in the new text, and the length had to stay within 0.8-1.5 times. Eleven rows were flagged and read; none lost a fact (the dropped enumeration lists are in the schema's `enum`).

After pass 3 the seat also rewrote what the style scan still found: the last line of the root description ("Omit a property that has no value: never write null or []."), the title of `documentSettings` ("How GRS shows the schedule on opening"), three `grs` objects that opened with a noun phrase, and one passive clause of `pinnedTaskGroupIds`. The root's three Delay Diagnosis sentences now use the glossary name "Delay Diagnostics".

Pass 4, the owner's review, comes once after all AI checks (the owner's rule), together with the other open points of the schema seat.
