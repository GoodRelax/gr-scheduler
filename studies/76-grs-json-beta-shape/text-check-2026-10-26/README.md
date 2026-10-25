# Shipped-English check, 2026-10-26 (JDG-3341..3344)

After the user confirmed the schema root with its Concepts block (JDG-3341; the root itself was not checked again, by the user's word), 27 property texts were rewritten to lean on it: the WBS and task groups, the minutes of a day and the default times, carried MSPDI values (16 rows share two texts), the calendar links GRS keeps but does not count with, the exception dates and toTime (JDG-3342), and the progress words (JDG-3344). Criteria: `../shipped-text-criteria.md`.

| File | Pass | What it holds |
|---|---|---|
| `0-root.txt` | input | the confirmed root description, read first |
| `1-blind-sheet.tsv` | input | the 27 drafts |
| `2-haiku-explanations.tsv` | 1 Haiku | a first-time reader's explanation; 18 rows with hard parts |
| `3-sonnet-judgements.tsv` | 2 Sonnet | 12 fixes, two of them facts: the same-document check uses Project.id, Project.name and the file name together (D079); a task suspended and then finished in MS Project keeps Stop (D151) |
| `4-seat.tsv` | 3 the seat | the final texts; Sonnet's fixes taken, D079 shortened and D166 written with words instead of "x"; the user reviews them last (pass 4) |
