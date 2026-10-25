# Shipped-English check, round 3, 2026-10-25 (JDG-3337)

An outside reader (Copilot) read the D001 ($schema) text of round 2, "the same as its $id", as if it were about the schema file's own `$schema` keyword. The user decided to drop that clause and show the address as `examples`. The new text went through the four passes of JDG-3328 (criteria `../shipped-text-criteria.md`).

| File | Pass | What it holds |
|---|---|---|
| `1-blind-sheet.tsv` | input | the new text and the examples value |
| `2-haiku-explanations.tsv` | 1 Haiku | a first-time reader's explanation, read without the specification |
| `3-sonnet-judgements.tsv` | 2 Sonnet | fix: "that this document follows" is not true of an older document, which still holds the latest address |
| `4-seat.tsv` | 3 the seat | the final text and why; the user reviews it last (pass 4) |

The same round also took the user's D000 comment (JDG-3338): the root tree no longer ends the second group under `schedule` with "(GRS)".

| File | Pass | What it holds |
|---|---|---|
| `5-root-blind.txt` | input | the root description with the label removed |
| `6-root-haiku.tsv` | 1 Haiku | the second group read as GRS's own without a label |
| `7-root-sonnet.tsv` | 2 Sonnet | ok: no property of the second group is the same as MSPDI; the seat applied it to the tree rule (pass 3) |
