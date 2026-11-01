# Term pass and shipped-English check, 2026-10-27

The style pass (`../text-check-2026-10-26-style/`, JDG-3346) left 299 schema descriptions and the root. This folder puts the ruled term names into them (JDG-3348, JDG-3351..3365, sheet 1 of `../terms/3-sheet1-questions.md`) and runs the check of JDG-3328: Haiku blind, Sonnet against the specification, then the seat. Criteria: `../shipped-text-criteria.md`. The owner reviews the result last, on the review page.

| File | Pass | What it holds |
|---|---|---|
| `brief.md` | input | the names to use, the words that wait for sheet 2 |
| `4-terms-applied.tsv` | 0 Sonnet | all 299 rows, the root (`ROOT`) and the title of D017 with the ruled names; 112 changed, 45 flagged `wait-sheet2` |
| `waiting-sheet2.txt` | - | the 48 rows not checked yet: the 45 above and D022, D031, D034 (the name of the fit command, sheet question 20) |
| `0-root.txt` | input | the root with the ruled names, read first by every pass |
| `1-blind-sheet.tsv` | input | the 252 rows checked now |
| `2-haiku-explanations-a.tsv`, `-b.tsv` | 1 Haiku | a first-time reader's explanation and hard parts, schema text only |
| `sonnet-brief.md` | input | the brief of pass 2 |
| `3-sonnet-judgements-a.tsv` .. `-d.tsv` | 2 Sonnet | 233 ok, 19 fix; 11 of the fixes are facts (E7) |
| `4-seat.tsv` | 3 the seat | the final texts of the 252 rows; 20 changed (Sonnet's fixes, D079/D081 reworded, D146/D147 made a pair) |

Facts the passes corrected (E7): the same-document check (D079, D081; `DI-1`..`DI-5`), the Project Name is shown and edited (`PF-1`), the default file name is built from the title (D082, `FN-1`..`FN-5`), the Schedule Filter hides tasks only (D061, D066, D071, `TV-4`), exception times are written only for added or changed dates (D127, D128, `WT-10`), the undecided resume date (D139, `PS-3`), the fill color also fills the Actual Bar (D203, `CV-6`).

Two places where the specification disagrees with itself (for the coordinator, not changed here): `fig-erd-detail.md` `AT-2` says GRS does not show `Project.name`, while `FR-074` `PF-1` shows and edits it; `FR-054` says the import resolves calendar inheritance through `FR-023`, which says nothing of it, and the code does not do it.

## Round 2 (after sheet 2 closed, JDG-3366..3379)

| File | Pass | What it holds |
|---|---|---|
| `brief2.md` | input | the sheet-2 names |
| `5-terms2-applied.tsv` | 0 Sonnet | the 48 waiting rows with the sheet-2 names (31 changed); the 252 rows and the root held no retired word |
| `6-blind-sheet2.tsv` | input | the 48 rows and the 7 top-level titles (T1..T7) |
| `7-haiku-explanations2.tsv` | 1 Haiku | blind reading of the 55 rows |
| `8-sonnet-judgements2.tsv` | 2 Sonnet | 50 ok, 5 fix; facts: Zoom to Fit fits the Task Group Lanes, not the window (D022, `FR-055`, `FX-3`); opening does not move the View to the Fit Span (D034, `OP-10`); the eight points belong to a bar or the Milestone Mark (D235, `AT-165`) |
| `9-seat2.tsv` | 3 the seat | the final 55 texts; D031 and D034 say "everything that GRS draws" like D022 (hidden task groups stay hidden, `HF-8`) |

The final texts (`4-seat.tsv` and `9-seat2.tsv`) are written into `../doc-shape-map.tsv` (`description_new` of 299 rows, the 7 titles in `type_new`) and the root into `../spec-rows-map.tsv` (`ROOT_DESCRIPTION`); the same old English inside 74 rows of `../spec-rows-map.tsv` (erd.json `en` cells, generator constants) was replaced by the final text of the same element.

Not done here: the restyled root (`0-root.txt`) was not judged by Sonnet (the owner confirmed the root in JDG-3341; only names changed), and nothing is applied to `../doc-shape-map.tsv` yet.
