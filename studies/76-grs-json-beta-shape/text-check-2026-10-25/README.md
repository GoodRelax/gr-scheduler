# Shipped-English check, 2026-10-25 (JDG-3328)

The texts that GRS ships in English (property descriptions, command descriptions, refusal-reason meanings) were checked in four passes. Criteria: `../shipped-text-criteria.md` (E1-E7, approved by the user).

| File | Pass | What it holds |
|---|---|---|
| `1-blind-sheet.tsv` | input | the 434 texts as a reader of the shipped schema sees them (settings placeholders filled) |
| `2-haiku-explanations.tsv` | 1 Haiku | a first-time reader's Japanese explanation of each text, read without the specification, and what it found hard |
| `3-sonnet-judgements.tsv` | 2 Sonnet | each explanation checked against the specification: ok or fix, the failed criteria, the problem, a replacement |
| (the tables of this study) | 3 the seat | 112 fixes applied after checking the facts against the specification; 16 refusal reasons that had two meanings under one name merged into one; the user reviews the result last (pass 4) |

Ids: `Dnnn` row n of `doc-shape-map.tsv`, `Cnnn` of `commands-map.tsv`, `Rnnn` of `refusal-reasons-map.tsv`, as the rows stood on 2026-10-25 (the order of JDG-3322).
