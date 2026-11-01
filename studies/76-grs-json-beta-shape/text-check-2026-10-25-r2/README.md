# Shipped-English check, round 2, 2026-10-25 (JDG-3334..3336)

The user's review comments on rows D001 ($schema), D003 (buildVersion) and D004 (schedule) changed three descriptions. They went through the same four passes as `../text-check-2026-10-25/` (JDG-3328, criteria `../shipped-text-criteria.md`).

| File | Pass | What it holds |
|---|---|---|
| `1-blind-sheet.tsv` | input | the three new texts |
| `2-haiku-explanations.tsv` | 1 Haiku | a first-time reader's explanation, read without the specification |
| `3-sonnet-judgements.tsv` | 2 Sonnet | checked against the specification: D001 and D003 ok, D004 fix (taskOrigins is not for drawing) |
| `4-seat.tsv` | 3 the seat | the final texts and why; the user reviews them last (pass 4) |
