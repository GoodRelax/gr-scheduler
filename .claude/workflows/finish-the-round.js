export const meta = {
  name: 'finish-the-round',
  description: 'Judge the fifteen reds and close the three seams the display words unblocked',
  whenToUse: 'The round after 21a1143, where the display words landed. Four disjoint owners: the tests, the shell, the screen renderer, and the DOM surface with the exchange-format generator.',
  phases: [{ title: 'Work', detail: 'one worktree per owner, disjoint files, no verification inside' }],
}

// ⛔ THIS SCRIPT DOES NOT VERIFY. The front session runs the checks once, at the
// merge point (rule 05).
//
// ⚠️ WORKTREES HAVE BEEN CUT FROM `main` (30ddd78) THREE ROUNDS RUNNING while
// `restart` was the tip. CHECK `git log -1` FIRST. If HEAD is not 21a1143
// "Write the display words and settle three decisions", the tree is wrong:
// the branch is clean and 30ddd78 is a strict ancestor, so
// `git merge --ff-only restart` puts you right. SAY SO IN THE REPORT.

const HOUSE = `
# House rules (docs/development-rules/)
- English and ASCII in code, comments and test names (rule 03 section 5).
- Comments say WHY and name specification row ids. ⛔ Never copy specification
  prose or a value into a comment.
- R7.6 (MUST): exactly one \`@purity\` tag per function. R2.1 (MUST): use the
  name the specification spells.
- Where the specification is silent, write a \`⛔\` comment saying what is missing
  (rule 02 section 3). ⛔ Do not guess a value.
- ⛔ Do NOT touch docs/spec/**. If you need a manuscript change, say so and stop.
- ⛔ Do NOT edit files outside the folders you own. Three other agents are
  working in this repository in parallel.
- ⛔ No git commit / push / tag.

# What landed at 21a1143 that you must rely on
- \`_source/display-words.json\` now holds 182 of 184 words. ⛔ The two empty ones
  are \`IC-54\`'s label and hint, and they stay empty: table T-109 points that row
  at a keystroke \`SK-1\` says does not exist.
- \`U-56\` \`Open Chooser\` is on table T-109's \`IC-52\` roster, so it can be closed
  and it has a heading.
- Filling the words woke paths that had been falling back to stand-ins.

# What to report
What you changed, what you could not do and why, and any file outside your
ownership that must now change. ⛔ Do NOT run npm test / typecheck / check.sh --
the front session runs those once at the merge point.
`

const SEAMS = [
  {
    key: 'judge-the-reds',
    owns: 'tests/** (and nothing else)',
    what: `⛔ FIFTEEN CASES ARE RED AND EACH ONE HAS TO BE JUDGED SEPARATELY. Run them,
read each, and decide ONE of two things -- never assume the first:

  (a) THE BENCH IS BEHIND. The case was written when the dictionary was empty and
      asserts the stand-in behaviour ("mints no word, because no table settles
      one"). A word is settled now, so the case must be rewritten to hold what the
      specification actually requires -- ⛔ not merely re-pointed at whatever the
      code returns.
  (b) FILLING THE WORDS EXPOSED A REAL DEFECT. ⛔ LEAVE IT RED, and quote the
      sentence of docs/spec the code disagrees with.

The fifteen sit in: tests/unit/uf-65, uf-66, uf-69, uf-67, uf-47-48-choosers, and
tests/contract/display-words.contract.test.ts.

⚠️ uf-67's four are probably (b): a raiser supplies a reason KEY, and \`FR-038\`'s
dictionary has no section keyed on a reason, so NT-1's words and NT-3a's next step
cannot be read. ⛔ If that is what you find, say it and leave them red -- a
manuscript change is owed and it is not yours to make.
⚠️ uf-47-48-choosers' four belong to another agent's seam this round; report them
but do not chase them.

⭐ Rule 04 section 2: a case you rewrite is not evidence until you have seen it
fail. Break what it guards, watch it go red, restore.`,
  },
  {
    key: 'open-landing',
    owns: 'src/framework/single-html-shell/**',
    what: `Land OP-3's three answers where table T-230 puts them. Four cases in
tests/unit/uf-47-48-choosers.test.ts are red on this; do not edit that file.

  IC-71 (replace)  -- \`RD-4\`: the read content replaces the current document.
  IC-73 (baseline) -- \`OP-9\`: what was read goes into the frame kept for it.
  \`CS-4\` of table T-066 (MUST): the answer lands on what the current value was
    WHEN THE READ BEGAN, not on what it became while the person was answering.
  The question must stop standing once it has been answered.

⚠️ The surface already comes up and \`importDocument\` (PI-10) already takes the
answer as an argument -- what is wrong is where the answer lands.`,
  },
  {
    key: 'screen-renderer',
    owns: 'src/adapter/screen-renderer/**',
    what: `Two things, both inside ScreenRenderer.

1. \`FR-096\` (MUST): the Export Chooser must offer every format table T-024 gives
   an out direction. \`OpenModal\` needs a member carrying those rows (by row id --
   that table has no English column), and \`open-modals.ts\` must fill it for
   \`surface === 'Export Chooser'\` the way it already fills \`Resource Roster\`.
   ⚠️ \`ScreenPart\` cannot report a press on a format today: \`entry: IconId | null\`
   carries a row of table T-109, and a format is a row of table T-024. A second
   member is owed. ⭐ SAY WHAT YOU DECLARED -- another agent draws it and must match.
2. \`notices.ts\` reads the words now that they are settled. ⛔ BUT: \`RaisedNotice\`
   carries a reason KEY and the dictionary has NO section keyed on a reason, so
   NT-1's words and NT-3a's next step still cannot be read. ⭐ Do what you can from
   the sections that DO exist, and record precisely which keys the dictionary owes.
   ⛔ Do not mint a sentence in this component -- \`FR-038\` (MUST) forbids a second
   store of translated strings.`,
  },
  {
    key: 'surface-and-formats',
    owns: 'src/framework/dom-screen-surface/** and tools/generate_exchange_formats.py',
    what: `Make the Export Chooser's formats reachable in the page.

1. \`tools/generate_exchange_formats.py\` writes only the rows of table T-024 that
   carry both of OP-12's columns, so the write-only formats never reach \`src/\`.
   Widen it to carry every row with an out direction. ⚠️ \`exchange-formats.json\`
   is generated -- change the generator, never the artifact.
2. \`dom-screen-surface.ts\` draws the format choices inside the Export Chooser and
   answers a press on one from \`readScreenPartAt\`.
   ⭐ tests/system/mspdi-normalization.sws.test.ts looks for \`[data-format="IO-1"]\`
   inside \`[data-role="Export Chooser"]\`, so that is the shape it must take.
   ⚠️ Table T-006a's \`W-4\` now says a \`data-role\` carrying a UI part's settled name
   takes the \`W-6\` form -- write \`Export Chooser\`, not a kebab-case spelling.
⚠️ Another agent owns \`src/adapter/screen-renderer/**\` and is declaring the member
that carries a pressed format. Say what you expected of it.`,
  },
]

const REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['seam', 'changed', 'blocked', 'needsSpecChange', 'otherFilesToChange'],
  properties: {
    seam: { type: 'string' },
    changed: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['file', 'what'],
        properties: { file: { type: 'string' }, what: { type: 'string' } },
      },
    },
    blocked: { type: 'array', items: { type: 'string' } },
    needsSpecChange: { type: 'array', items: { type: 'string' } },
    otherFilesToChange: { type: 'array', items: { type: 'string' } },
  },
}

phase('Work')

const out = await parallel(
  SEAMS.map((seam) => () =>
    agent(
      `Do one seam of work in the gr-scheduler repository.\n\n`
      + `# What\n${seam.what}\n\n`
      + `# Files you own\n${seam.owns}\n`
      + HOUSE,
      { label: seam.key, phase: 'Work', isolation: 'worktree', schema: REPORT },
    ),
  ),
)

log(`${out.filter(Boolean).length} of ${SEAMS.length} seam(s) reported`)

return { seams: SEAMS.map((s) => s.key), reports: out }
