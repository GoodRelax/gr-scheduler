---
name: spec-graph-check
description: Mechanical checks and graph-based impact analysis for the gr-scheduler specification in docs/spec. Use before and after editing any requirement, table row, or settings value — to compute what a change reaches, to group a batch of fixes so they cannot disturb each other, and to verify nothing broke. Triggers include editing docs/spec, reviewing the specification, fixing review findings, planning a change request's impact section, or asking what a table or requirement affects.
---

# Specification checks and impact analysis

Sixteen mechanical checks plus a dependency-graph toolkit for `docs/spec`.

**Green proves references resolve. It does not prove the specification agrees
with itself.** Across eight review rounds, every Critical defect appeared
while all checks were green. Use the checks to stop broken references and the
graph to decide *how* to edit; neither replaces reading.

## Run the checks

```bash
bash .claude/skills/spec-graph-check/check.sh
```

Output goes to `scratch/spec-check/` (gitignored). Checks 1–12 and 15–20 are
gates; 13 and 14 are advisory counts that should trend down.

**Check 16 guards the generated documents.** `docs/spec/_assets/fig-erd-*.md`
are written by `docs/spec/_assets/source/erd_json_to_md.py` from `erd.json`;
their banner says never to edit them, and check 16 is what makes that true —
it rebuilds both and reports the first line that differs. When it fires, the
fix is to move the edit into `erd.json` and regenerate, never to re-apply it
to the output. The generator also refuses to write at all unless figure F-010
places every entity exactly once, so an entity added to `erd.json` cannot slip
past the figure the way it did while that figure was hand written.

**Check 17 guards the other generated artifact.**
`docs/spec/_assets/grs-document.schema.json` is the `GRS JSON` schema, written
by `docs/spec/_assets/source/erd_json_to_schema.py` from the two sources
Chapter 6.2 names: `erd.json` (the `json` key of every column) and
`tbl-settings.md` (read in its present table form). It fires in both
directions — a hand edit to the schema and a source edit that was never
regenerated. Run `erd_json_to_schema.py --report` to see what the sources
leave open: enumerations whose members are unspelled, settings keys whose row
does not say what type they hold, and entities the container places nowhere.
**The generator never invents a value** — an unspelled enumeration widens to a
plain string and is recorded in the schema's `$comment` instead.

**Check 18 guards the unit tree.** `src/` is written by
`tools/generate_unit_tree.py` from table T-075, at the paths Chapter 5.3 fixes
(`src/<layer folder>/<kebab(component)>/<file name>`). It compares the **set of
paths only**, never the contents, so it goes on guarding after implementers
have filled the files in — and the generator itself never rewrites a file that
exists. A unit added to table T-075 without a file, or a file added to `src/`
without a row, both go red.

**Check 19 guards the dependency direction.** Chapter 5.1 says of table T-061
that the direction "is not a property you confirm by running something", which
is why it sits in the chapter rather than behind a requirement with a test —
but nothing said who looks. `tools/check_layer_rules.py` does: it reads every
relative import in `src/`, maps it to a layer and a component, and reports an
outward edge (LR-1 / LR-4), a reach past another component's public entry
(LR-2 / LR-5) and a cycle inside a layer (LR-3). All five were confirmed to
fire by breaking each on purpose. **LR-6 is not in this script** — a name-based
screen would only guess, so `tsconfig.entity.json` compiles `src/entity` and
`src/use-case` without the DOM library and the compiler rejects a browser type
outright.

## The one rule that matters most

**Iterate over objects, not over findings.**

```
WRONG   for each finding:  edit the objects it touches
RIGHT   for each object:   apply every finding that touches it, once
```

The wrong loop rewrites the same table row in two or three separate passes.
The later pass does not know what the earlier one moved, restates it, and a
fresh contradiction is born. Measured on round 7 → 8: **0.46 new defects per
defect fixed**, and 26 of 77 findings sat on lines the previous round had
written.

The rate is falsifiable, so measure it each round rather than assuming the
method worked. Take the previous round's commits as the seed, review only the
lines they wrote, and divide fresh defects by defects fixed. Round 7 → 8 came
in at **0.46**; round 8 → 9, after switching to the object-first loop and
adding checks 12–14, came in at **0.24**.

### A lens the first eight rounds never used

Checking that every requirement *links* to a goal is mechanical and always
passed. Checking whether the requirements under a goal **collectively achieve
it** is not, and it found 21 defects on its first run, including five `NFR`s
whose measurement target is undefined and so can never be judged.

Walk it top-down: decompose each `GOAL` and each `USE_CASE` step into the
actions a person must perform, then find the requirement that performs each
one. A link that resolves is not a step that works.

### How to group a batch of fixes

Two findings belong to the same **unit** when they touch the same table, row,
or requirement. Units share no objects, so they cannot disturb each other.

```bash
python .claude/skills/spec-graph-check/graph.py --cycles
```

`graph.py` exposes `units(findings)` for the partition (union-find over the
finding↔object bipartite graph, projected onto findings). An object shared by
very many findings is a hub that would merge everything into one unit, so
only 2–4 way sharing creates an edge.

## Blast radius: use depth 2

```bash
python .claude/skills/spec-graph-check/impact.py T-023a       # a table
python .claude/skills/spec-graph-check/impact.py MK-6 FR-016  # rows, UIDs
python .claude/skills/spec-graph-check/impact.py --cluster    # the map
```

**Depth 2 is measured, not guessed.** Taking round 7's edits as the seed and
asking how many of round 8's findings fell inside:

| depth | findings covered | set size |
| --: | --: | --: |
| 0 | 61% | 87 |
| 1 | 91% | +48 |
| **2** | **94%** | 145 |
| 3 | 95% | 575 |

The knee is at depth 1; depth 3 costs four times the set for one point. Full
transitive closure reaches ~10% of the document per object and stops
discriminating entirely.

**Two hops, not one.** A requirement can join a cluster through a UID chain
without naming any table — `FR-022` sits in the merge cluster reached only via
`FR-087`/`UC-014`. One hop drops it.

## Cycles: edit the bundle in one pass

**The graph is not a DAG.** There is no dependency order to edit in, which is
why work is *partitioned* rather than *sequenced*.

To find what must move together, take the **induced subgraph on the objects
you are about to touch** and look for cycles there. The 180-member
whole-graph cycle is useless for this; the induced one is actionable.

A real example: `FR-022 ↔ FR-056 ↔ FR-087/OP-3` all reference each other, so
changing the merge dialog meant writing all of them plus `MG-1`/`MG-10` in a
single pass. Editing them in sequence cannot converge.

**Most small cycles are correct and must not be "fixed".** A value row points
at the requirement owning its rule, and the requirement names the value —
that 2-cycle *is* the convention (`FR-039 ↔ S-2/S-3`, `MG-13 ↔ S-71`).

## Traps that have already cost time

**Tooling**

- A missing StrictDoc export silently changes the graph (18 cycles instead of
  4, largest 60 instead of 184). `graph.py` now refuses to run without it —
  keep that guard.
- A table heading is followed by prose before its rows, and one table number
  can span two pipe blocks (`T-012a`). Closing a table at the first non-pipe
  line loses dozens of row IDs.
- `**表 T-202 の…**` is bold prose, not a heading. Anchor the heading regex on
  the em dash.
- A noisy gate is worse than no gate: it gets legitimate text "fixed", which
  is how the duplication was created in the first place. Check 12 was tuned
  twice before it stopped crying wolf; 13 and 14 were demoted to advisory
  because they cannot tell which rule a pointer refers to.

**Editing**

- **Never use regex character classes on the specification.** `[^)]` matched
  across newlines because the document mixes ASCII and full-width parentheses;
  it deleted 305 lines including whole use cases. Use literal replacements and
  assert each matches exactly once.
- After inserting a table, check for two consecutive blank lines — StrictDoc
  rejects them and the export failure names no line number.
- When resolving a contradiction, the reflex is to write the same explanation
  into both places. That is the single most common way new duplication is
  created. Decide one owner; the other side points.
- **A new `_assets/*.md` is picked up by scanning, but confirm it.**
  `specindex.discover()` scans `docs/spec` and `docs/spec/_assets`, and
  `md-checks.py` uses the same list. It was a hardcoded `FILES` list until
  2026-08-16, and a new asset file was reported green by checks 5–10 for a
  whole session before anyone noticed they had never read it. After adding a
  file, **confirm the `tables=` / `figures=` / `rows=` counters move** — that
  is the only evidence it was read.
- Do not renumber. `FR-xxx` / `T-xxx` / row IDs are seat numbers, and gaps are
  correct (`FR-050` is retired on purpose). Before adding a settings key,
  check the whole `S-` range — the highest number is not always free.
- Changing a use case's step numbering cascades into `ORIGIN` spans that
  check 3 does not see. Count the references first — **and the `EXTENSIONS`
  branch labels (`1a.`, `3a.`), which are numbered against the steps.**
- **Before naming or renaming anything, read table T-006b and table T-104.**
  T-006b reserves ambiguous Japanese words with MUST NOT clauses. Naming the
  merged line 基準線 collided with `A-9`, which reserves that word for the
  baseline plan — eight newly written places broke the document's own rule.
- **When a transfer moves a rule from A to B, confirm the rule now appears in
  B's text.** Once, B was a requirement that says in so many words "this
  requirement creates no new rule", so the rule vanished from the
  specification while both sides still looked tidy. The checks verify that
  references resolve, not that anything was received.
- **A new "this is the full count" sentence must be counted, not asserted.**
  Three separate defects came from writing one: "table T-202 has no row for
  this" (it did), "table T-024 is every export format" (it also holds
  clipboard and localStorage), and a selection list that disagreed with the
  deletion list it was paired with.
- Adding a member to a full-count table pulls in every rule that quantifies
  over it. Adding the status line to `SL-1` silently made it deletable by
  `SK-3` and draggable in bulk by `SL-7`.

## Layout

| file | role |
| --- | --- |
| `check.sh` | all 20 checks |
| `specindex.py` | shared parser: tables, rows, owners, references |
| `md-checks.py` | checks 5–10 and 15 (Markdown structure, figure seat numbers) |
| `style-checks.py` | checks 12–14 (recurring defect types) |
| `impact.py` | blast radius for one object, two hops |
| `graph.py` | cycles, depth measurement, unit partition |

`docs/spec/_assets/source/erd_json_to_md.py` and `erd_json_to_schema.py` live
with their source and are invoked by `check.sh` as checks 16 and 17;
`tools/generate_unit_tree.py` writes `src/` and is invoked as check 18,
`tools/check_layer_rules.py` reads it back as check 19, and
`tools/generate_entity_types.py` writes the schedule group types into two of
those units and is checked as check 20 — only the region between its markers,
so the rest of a filled-in unit is left alone.

`docs/review/dup-check.py` and `duplication-baseline.txt` live in the
repository and are invoked by `check.sh`. **The detector and its baseline
must be used together** — without the baseline all 18 known groups report as
new. It only finds similar *wording*; a paraphrase walks straight past it.
