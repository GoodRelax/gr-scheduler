# Planner brief (one body per CR) — read common-brief.md first

You plan ONE split on today's tree (repo root = (the worktree root), branch w4-first-half at d0ae3a9c8). You are read-only: the ONLY file you may write is your plan file named in your prompt (in the scratchpad). Another session's bodies may be measuring in other worktrees; do not touch them.

## Read
1. Your CR text in `change-request/` (stale numbers; keep its decided direction and the user rulings it quotes, verbatim).
2. Your ledger row (`grep -n "^| DFC-107[123] " docs/development-records/defects.md`, read the WHOLE row) and the rows it points to.
3. `docs/development-rules/07-review-standards.md` R2 (naming / part of speech table / R2.2a five steps / R2.2b / R2.21 / R2.22) and `docs/development-rules/05-working-method.md` the block `### ⭐ 割る波の手順`.
4. `docs/spec/05-07-design.md`: table T-075 rows (UF-) of your file and of every sibling in its folder, table T-063 (UT-) row of its component, table T-064 (PI-) where public names of other components are needed, table T-074 SU-3 (unit count) and `tests/contract/units.contract.test.ts` if it counts units.

## Measure (give the method beside every number)
- Hand-written lines of the file (exclude the `// <generated -- do not edit by hand>` .. `// </generated>` block) and every top-level declaration with its line range (an outline helper exists: `node docs/review/w4-first-half-2026-10-24/scripts/outline.mjs <file> [innerFunctionName]` run from the repo root — it lists top-level statements and, if named, the statements inside that function).
- Who reads each declaration (inside the file, siblings, other folders, tests). Names imported from outside must stay importable from the entry.
- Co-change between candidate clusters over the recent ~80 commits that changed code in the file (rule 04 section 6 counting: commits touching both / commits of the smaller side). Keep it cheap: map `git log -p -U0` hunks to the enclosing top-level (or closure-member) declaration by line range of that revision; approximate is fine if you say how.
- For each DFC group of your ledger row: is the copy still there today (new file:line)? Where does the plan put the single owner? Does that need a new public name of another component (a table T-064 row)? Mark groups whose folding would change a value (those stay out; they have their own rows).
- Tests that read the file by TEXT (readFileSync / `?raw` / regex over source) — they break when code moves; list them with file:line.
- Check 60: which HELD rows (`grep <file> .claude/skills/spec-graph-check/function-size-baseline.txt`) move to which new file; any new function that would land over the threshold (read `check-function-size.py` for the thresholds) — design it away.

## Produce: your plan file (Markdown, Japanese prose fine, code names in backticks)
1. 測った事実 (sizes, clusters, co-change table, readers).
2. ユニットの表: for the entry and each NEW sibling: file name, provisional row id (`UF-p1`.. — the parent assigns real numbers), responsibility sentence (one sentence, Japanese like the existing T-075 rows) with the R2.2a fold notes, contents (declaration names), estimated hand lines (sum of moved ranges — say so), form (plain move / (F) / (M)). Entry MUST end below 1,000 hand lines (aim ≈ 850 to leave room); no sibling above 1,000. An existing sibling that grows must stay ≤ 1,000.
   Naming: Framework/Adapter file names are noun phrases that say the content; no `Manager`/`Handler`/`Helper`/`Utils`; no `-and-`; the name must not collide in meaning with an existing file (check the folder and `src/` for near names).
3. DFC groups: table group → still present? → owner after the split → T-064 row needed? → folded in which wave.
4. 仕様の書き換え: exact T-075 row text changes (old → new), new rows, T-063 UT row file list, SU-3 count and every test/doc that states the count.
5. 波: ordered waves, 1 wave = 1 commit; each wave = which declarations move where, what stays re-exported, the risk (TDZ: a sibling's top-level const must not read an entry name at init; host-call order unchanged; circular imports — siblings must not import the entry if the entry imports them, unless only types).
6. Check 60 / 55 (comment density 10% per file) / 45 (repeated expressions) / 59 (component edges) / 26b, 18, 44 (new sibling files need T-075 rows) expected effects.
7. 残る問い: anything that needs the user's decision (only real product/naming choices), each with 2-4 options and a recommendation.

Report back (Japanese, at most 30 lines): the unit table in short form (name — sentence — lines), entry lines after, DFC groups folded / left out, waves count, open questions. The plan file holds the detail.
