---
name: spec-graph-check
description: Mechanical checks and graph-based impact analysis for the gr-scheduler specification in docs/spec. Use before and after editing any requirement, table row, or settings value — to compute what a change reaches, to group a batch of fixes so they cannot disturb each other, and to verify nothing broke. Triggers include editing docs/spec, reviewing the specification, fixing review findings, planning a change request's impact section, or asking what a table or requirement affects.
---

# Specification checks and impact analysis

Fourteen mechanical checks plus a dependency-graph toolkit for `docs/spec`.

**Green proves references resolve. It does not prove the specification agrees
with itself.** Across eight review rounds, every Critical defect appeared
while all checks were green. Use the checks to stop broken references and the
graph to decide *how* to edit; neither replaces reading.

## Run the checks

```bash
bash .claude/skills/spec-graph-check/check.sh
```

Output goes to `scratch/spec-check/` (gitignored). Checks 1–12 are gates;
13 and 14 are advisory counts that should trend down.

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
- Do not renumber. `FR-xxx` / `T-xxx` / row IDs are seat numbers, and gaps are
  correct (`FR-050` is retired on purpose). Before adding a settings key,
  check the whole `S-` range — the highest number is not always free.
- Changing a use case's step numbering cascades into `ORIGIN` spans that
  check 3 does not see. Count the references first.

## Layout

| file | role |
| --- | --- |
| `check.sh` | all 14 checks |
| `specindex.py` | shared parser: tables, rows, owners, references |
| `md-checks.py` | checks 5–10 (Markdown structure) |
| `style-checks.py` | checks 12–14 (recurring defect types) |
| `impact.py` | blast radius for one object, two hops |
| `graph.py` | cycles, depth measurement, unit partition |

`docs/review/dup-check.py` and `duplication-baseline.txt` live in the
repository and are invoked by `check.sh`. **The detector and its baseline
must be used together** — without the baseline all 18 known groups report as
new. It only finds similar *wording*; a paraphrase walks straight past it.
