# Common brief — W4 first half (CR-578 / CR-579 / CR-580), 2026-10-24

You are a subagent (a "body") of a child session in the gr-scheduler repository. The child session
(your parent) splits three large source files without changing behaviour:

| CR | file (hand-written lines today, `<generated>` block excluded) | goal |
| --- | --- | --- |
| CR-578 | `src/framework/single-html-shell/frame-loop.ts` (4,409; the `frameLoop` closure alone is 1,529) | entry below 1,000 hand lines; no sibling above 1,000 |
| CR-579 | `src/adapter/input-command-translator/input-command-translator.ts` (1,491) | below 1,000 |
| CR-580 | `src/adapter/document-codec/mspdi-codec.ts` (1,419) | below 1,000 |

The user's ruling JDG-695 (2026-09-26): a hand-written `src` file above 1,000 lines MUST be split;
501..1,000 lines only when a review finds two or more responsibilities.

Working tree: the parent's worktree (branch `w4-first-half`, base `d0ae3a9c8`). Paths below are
relative to the repository root. The CR texts are in `change-request/CR-578-*.md`, `CR-579-*.md`,
`CR-580-*.md` — they were drafted on 2026-09-26 against an OLD tree (`d65097b9`); every number,
line and file:line in them is stale. Re-measure everything on today's tree.

Accidental copies (duplicate responsibilities) that each split must fold into ONE place, found by a
survey on 2026-09-26: ledger rows `DFC-1071` (frame-loop), `DFC-1072` (translator), `DFC-1073`
(mspdi codec) in `docs/development-records/defects.md` (`grep -n "^| DFC-107[123] "`). Their
file:line are stale too; some groups may already be gone. Groups whose fix needs a decision that a
pure move cannot make (a value would change) are NOT folded here; they have their own rows.

## Rules that bind every body

- Read-only unless your brief names files you may write. Never commit, never push, never touch
  `dist/`, never edit `tools/artifact-versions.json`, never edit baselines under
  `.claude/skills/spec-graph-check/*-baseline.txt`.
- Behaviour must not change. No defensive edge-case handling (ruling JDG-78).
- Naming rules: `docs/development-rules/07-review-standards.md` section R2 (R2.1 naming and part of
  speech per layer, R2.2a five-step responsibility-sentence test, R2.2b summary-not-sum, R2.14
  POLA, R2.21 one job one place, R2.22 public entry before a helper). Names say what they point at
  (JDG-820). A file name must not lie about its content.
- Split forms allowed inside a closure (CR-554 4.1): (F) a top-level function that receives closure
  values through a hands bundle; (M) a small factory that owns only its own `let`s. NOT allowed: one
  mutable record holding all the `let`s, or a big factory that swallows the closure's functions.
- Rule 05 section 7 "割る波の手順" (`docs/development-rules/05-working-method.md`, the block after
  the heading `### ⭐ 割る波の手順`): seams are decided by three pieces of evidence — requirement
  ownership (table T-075's "負う要求" column, `docs/spec/05-07-design.md`) proposes, co-change
  refuses (rule 04 section 6), the R2.2a five steps confirm. JDG-681: split even where co-change
  refuses; use co-change only to choose WHERE to cut (cut at the lowest co-change).
- Check 60 (function size, `.claude/skills/spec-graph-check/function-size-baseline.txt`, run by
  `check-function-size.py`): the baseline may not rise. Moving a HELD function to a new file only
  re-keys its row; a NEW function over the threshold is a new HELD row and counts as a rise — design
  so none appears.
- The translator's public names stay importable from `input-command-translator.ts` with the same
  signature; frame-loop's public names stay importable from `frame-loop.ts` (169 test/src files
  import it). Re-exports are fine.
- Node tools: the worktree has no node_modules; call the root copy by path from the repo root:
  `node ../../../node_modules/vitest/vitest.mjs run <files>`,
  `node ../../../node_modules/typescript/bin/tsc --noEmit` (TypeScript 7, no JS API — parse with
  `rolldown/parseAst` as `.claude/skills/spec-graph-check/function-size.mjs` does). Never `npx`,
  never make a junction. Heavy runs go under the machine lock:
  `node tools/gate/gate-queue.mjs run -- <command>`.
- Tests that read `docs/reference/mspdi/**` skip in a worktree — expected.
- Code and comments in English ASCII. Your report in Japanese everyday words is fine.
- A number in your report is a claim: give the method (command) beside it.
- Do not delegate your job to further subagents and stop half-way; finish it.
