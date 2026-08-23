export const meta = {
  name: 'close-the-reds',
  description: 'Close every red test and the STOPs whose specification is now settled',
  whenToUse: 'The round after 2026-08-23 efb32f6. Thirteen red unit cases, two red e2e cases, and a set of STOP markers in the shell that the rulings of CR-220 / CR-223 / CR-224 have now unblocked. Pass { stage: "implement" } first, then { stage: "test" } after the front session has merged and verified.',
  phases: [
    { title: 'Implement', detail: 'one worktree per owner, disjoint files, no verification inside' },
    { title: 'Test', detail: 'a second agent per seam, reading docs/spec only' },
  ],
}

// ⛔ RUN THIS TWICE. `isolation: 'worktree'` cuts every agent a FRESH tree from
// HEAD, so a test agent chained straight after an implement agent would see a
// tree without the code it is meant to test. The merge point goes between them,
// which is where rule 05 puts verification anyway.
//
// ⛔ THIS SCRIPT DOES NOT VERIFY. The front session runs the checks once, at the
// merge point. Eleven agents each running `npm test` is what an earlier round
// measured as the main waste.
//
// ⛔ OWNERSHIP IS DISJOINT BY FILE. An earlier run gave two agents the same
// `single-html-shell/**` and they collided. Every owner below is a different
// folder, and each is told the seam it must not cross.

const HOUSE_RULES = `
# House rules (docs/development-rules/)
- English and ASCII in code, comments and test names (rule 03 section 5).
- Comments say WHY and name specification row ids. ⛔ Never copy specification
  prose or a value into a comment -- a copied value goes stale in silence.
- R7.6 (MUST): exactly one \`@purity\` tag per function.
- R2.1 (MUST): use the name the specification spells. Do not coin a synonym.
- Where the specification is silent, write a \`⛔\` comment saying exactly what is
  missing (rule 02 section 3). ⛔ Do not guess a value, and do not delete an
  existing STOP note unless the thing it names is now actually there.
- ⛔ Do NOT touch docs/spec/**. The manuscript changes you need are ALREADY DONE
  (see "What changed under you"). If you need another one, say so and stop.
- ⛔ Do NOT edit files outside the folders you own. Other agents are working in
  this repository in parallel.
- ⛔ No git commit / push / tag.

# What changed under you, at HEAD, that you should rely on
- Table T-103 now has \`U-56\` \`Open Chooser\`, and table T-109 has \`IC-71\` /
  \`IC-72\` / \`IC-73\` on it -- so OP-3's three-way question HAS a surface and
  three entries now. The old STOP notes saying it cannot be asked are STALE.
- \`FR-096\` now settles what the save/export chooser suggests: the document name
  plus the extension table T-024 gives. The STOP saying it is undecided is STALE.
- \`_source/erd.json\`'s relations now carry \`fromColumn\` / \`toColumn\` (null with
  a \`noReference\` note where the relation holds no column), so table T-057's
  foreign keys are machine readable.
- \`_source/settings.json\` no longer writes \`1 − ε\`: an open bound is now
  \`{"num": "1", "exclusive": true}\` and the published table prints \`1 未満\`.

# What to report
Report ONLY: what you changed, what you could not do and why, and any file
outside your ownership that must now change. ⛔ Do NOT run npm test, npm run
typecheck or check.sh -- the front session runs those once at the merge point.
`

const SEAMS = [
  {
    key: 'file-store',
    testOwns: 'tests/contract/if-3-file-store.test.ts and tests/unit/uf-51.test.ts',
    repair: `⚠️ ONE BENCH BROKE. tests/unit/uf-51.test.ts, the case 'takes only the
first of a multi-file drop', asserts the whole reading with toEqual({ ok: true, file: {...} }).
That reading now also carries ignoredFileCount: 1, which OP-11 of table T-024a REQUIRES
(「残りを無視したことを告げること（MUST）」). ⛔ The code is right and the bench is behind --
widen the expectation to the count OP-11 demands, do NOT delete the member.`,
    owns: 'src/framework/file-system-access-file-store/**',
    what: `Close the two product defects a spec-driven contract test proved, in
\`file-system-access-file-store.ts\` (PI-28). ⚠️ \`tests/contract/if-3-file-store.test.ts\`
holds them and SEVEN of its cases are red on these two. Do not touch that file.

1. \`DI-4\` of table T-227 (MUST): 「同じとみなせない相手へ書き出そうとするときは、上書きしてよいかを問うこと」.
   \`writeChosenFile\` goes from the chooser straight to \`saveToFile\`: it never reads the
   destination and never calls \`ChosenFileWrite.askToWriteOver\`, so the gateway's whole
   DI-1..DI-4 ladder is dead code. Obey the order IF-3 states: point at the destination,
   read what is standing there, build a \`ChosenWriteDestination\` (\`empty\` where nothing
   was, \`occupied\` with the file name and its bytes), ask, and write ONLY on true.
2. \`OP-11\` of table T-024a (MUST): 「先頭の 1 つだけを受け入れ、残りを無視したことを告げること」.
   \`readDroppedFile\` answers \`{ ok: true, file }\` with no \`ignoredFileCount\`, and
   \`FileReading\` reads an absent count as 'none were left'. Report the count.

⭐ The contract test was written from the specification and PROVED both are the product
and not the harness -- the author patched this file, watched all 26 cases pass, reverted
it and checked it byte-identical. So these two changes should turn 7 red cases green.`,
  },
  {
    key: 'invariants',
    testOwns: 'tests/contract/document-invariants.contract.test.ts',
    repair: `⚠️ THREE CASES STAY RED UNTIL THE BENCH KNOWS IV-18. The BREACH map has no
'IV-18' entry, so 'has a case for every row of the table', "'IV-18' is reported" and
'names no row outside the table' all fail. Build a document that breaches it: two TaskGroup
rows whose parentId name each other is enough.`,
    owns: 'src/entity/document-model/schedule/** and tools/generate_entity_types.py',
    what: `Make four rows of table T-220 answer, in \`scheduleViolations\` (PI-1).
⚠️ \`tests/contract/document-invariants.contract.test.ts\` holds the cases and SIX are red.
Do not touch that file. ⛔ Chapter 6.1 (MUST): drive the roster FROM table T-220, never
write a row out by hand.

1. \`IV-18\` (new this round): 「\`TaskGroup.parentId\` がたどる親子に輪が無いこと」, kind
   \`structure\`. Nothing answers it yet.
2. \`IV-1\`: primary keys unique. It is judged against 「表 T-058 の鍵の欄が \`PK\` または
   \`PK,FK\` とする列」. \`erd.json\` HAS that column (\`key\`: PK / FK / PK/FK) but
   \`tools/generate_entity_types.py\` does not emit it. Emit a roster the way
   \`DATE_COLUMNS\` is already emitted from the date marks, then drive IV-1 from it.
3. \`IV-2\`: a non-null foreign key resolves. ⭐ \`erd.json\`'s relations NOW carry
   \`fromColumn\` / \`toColumn\` (null plus a \`noReference\` note where the relation holds
   no column). Emit that roster too and drive IV-2 from it.
4. \`IV-16\`: a settings bound naming another settings row satisfies its expression.
   ⭐ \`settings.json\` no longer writes \`1 − ε\`; an open bound is now
   \`{"num": "1", "exclusive": true}\`. \`SETTINGS_BOUNDS\` carries only numbers today --
   make it carry the exclusivity and the bounds that name another key, then drive IV-16.
   ⚠️ Whatever reads \`SETTINGS_BOUNDS\` must keep honouring an open bound as strict.`,
  },
  {
    key: 'shell',
    testOwns: 'tests/unit/ (the UF-47 / UF-48 cases) and tests/system/**',
    repair: `⚠️ UF-47 and UF-48 sit at 🔧 実装済 in the development record: no test written
from the specification covers them yet, and OP-3's whole road landed in them this round.
⚠️ The two cases in tests/system/mspdi-normalization.sws.test.ts stay RED on purpose --
the Export Chooser still carries nothing to choose, which is outside that seam's ownership.`,
    owns: 'src/framework/single-html-shell/**',
    what: `Put up the two surfaces the specification now has, in the shell.

1. \`OP-3\` of table T-024a (MUST) -- the three-way question. ⭐ THE BLOCKER IS GONE:
   table T-103 now has \`U-56\` \`Open Chooser\` and table T-109 has \`IC-71\` (置き換える) /
   \`IC-72\` (合流させる) / \`IC-73\` (重ねる) on it. \`frame-loop.ts\` carries a STOP saying
   this cannot be asked -- that note is STALE, replace it with the wiring.
   ⚠️ Downstream is ready: \`importDocument\` (PI-10) takes the answer as an argument and
   table T-230's \`RD-3\` / \`RD-4\` carry it home. Table T-066's \`CS-4\` governs the wait:
   collect everything before the first await, do NOT re-read the current value while the
   person answers, land through \`replaceDocument\`.
   ⭐ Table T-078's \`FT-1\` now covers the frame that paints a question raised after a
   wait -- it reads 「その入力の、待ちをまたいだ続きを含む」.
2. The suggested file name. ⭐ \`FR-096\` now settles it: the document name (\`FR-035\`)
   plus the extension table T-024 gives; the extension alone when the name is empty.
   \`frame-loop.ts\` passes an empty string with a STOP saying it is undecided -- STALE.
3. \`FR-096\`'s chooser must carry the formats to choose from. ⚠️ TWO e2e CASES ARE RED
   ON THIS (\`tests/system/mspdi-normalization.sws.test.ts\`): the entry opens the surface
   but it comes up carrying nothing, so no MSPDI can be produced at all. Table T-024's
   rows with an out direction are what it offers.

⛔ Do not touch \`src/adapter/**\`. If ScreenRenderer must draw something new, say what.`,
  },
  {
    key: 'notices',
    testOwns: 'tests/unit/uf-67.test.ts',
    repair: `⛔ THE TREE DOES NOT TYPECHECK UNTIL YOU FIX THIS. tests/unit/uf-67.test.ts:126 --
ScreenSession.notices is now readonly RaisedNotice[] (manner, reason, affectedCount) and the
bench still builds Notice (manner, text, nextSteps, affectedCount).
⚠️ READ THIS BEFORE REWRITING ANY EXPECTATION: a raiser now supplies a reason KEY and no
words at all; the words FR-038 keeps in the dictionary do not exist yet, so nextSteps comes
back empty. NT-3a of table T-037 is a MUST that a failure carry its next step.
⛔ If that MUST is not being kept, LEAVE THE CASE RED and say so -- do not soften it to
match what the code now returns.`,
    owns: 'src/adapter/screen-renderer/**',
    what: `Give \`ScreenSession.notices\` an owner, and draw the two surfaces.

1. ⛔ NOTHING CARRIES A REFUSAL OR A FAULT TO THE PERSON. \`frame-loop.ts\` records this
   at three STOPs: a refused write, a refused edit, and a file fault all end as a value
   nobody shows. \`FR-028\` makes a refusal a VALUE (never an exception), and table T-037
   settles the manner -- \`NT-1\` (input not accepted: in words, MUST NOT colour alone),
   \`NT-3a\` (a failure must carry the next step, MUST). Draw them.
   ⚠️ \`FR-038\` (MUST) keeps every printed word in the generated dictionary, and it holds
   no row for these yet. ⛔ Do NOT invent sentences in this component -- carry the row id
   the way \`notices.ts\` already does, and say in the report which rows the dictionary owes.
2. Draw \`U-56\` \`Open Chooser\` with its three entries \`IC-71\` / \`IC-72\` / \`IC-73\`.
   ⭐ The roster and the glyphs are already generated: \`icon-roster.json\` holds 73 icons
   and \`icon-glyphs.json\` 73 shapes.
   ⚠️ The \`data-role\` a surface carries is its settled name from table T-103 -- table
   T-006a's \`W-4\` now says so in as many words ("UI パーツの確定名を運ぶ \`data-role\` は
   \`W-6\` の形とする"), so write \`Open Chooser\`, not a kebab-case spelling.

⛔ Do not touch \`src/framework/**\`. Say what the shell must hand you.`,
  },
]

const FINDING = {
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
    blocked: { type: 'array', description: 'What could not be done, and why. Empty is valid.', items: { type: 'string' } },
    needsSpecChange: { type: 'array', description: 'Specification objects that would have to move.', items: { type: 'string' } },
    otherFilesToChange: { type: 'array', description: 'Files outside this ownership that must now change.', items: { type: 'string' } },
  },
}

const TEST_REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['seam', 'cases', 'red', 'specSilences'],
  properties: {
    seam: { type: 'string' },
    cases: { type: 'array', items: { type: 'string' } },
    red: { type: 'array', description: 'Cases left red because the code disagrees with the specification. Quote the sentence.', items: { type: 'string' } },
    specSilences: { type: 'array', items: { type: 'string' } },
  },
}

const TEST_PROMPT = (seam) =>
  `Write the tests for one seam of the gr-scheduler repository.\n\n`
  + `# ⛔ THE RULE THAT GOVERNS YOU\n`
  + `docs/development-rules/04-verification.md section 1: you write from the\n`
  + `SPECIFICATION ONLY. ⛔ You MUST NOT read the implementation you are testing --\n`
  + `only its public entry's exported types and signatures. A test written from the\n`
  + `code goes green on the code's own misreading.\n\n`
  + `# The seam\n${seam.what}\n\n`
  + `# Files you own\n${seam.testOwns}\n`
  + `⛔ Tests only. Do NOT edit src/ or tools/ -- if the code is wrong, leave the case red.\n\n`
  + `# ⚠️ What the implement stage left you\n${seam.repair}\n\n`
  + `# Where the tests go\n`
  + `Table T-218 of docs/spec/05-07-design.md assigns a directory and a tool to each\n`
  + `kind of test and forbids any other place (MUST NOT). Derive yours from it.\n\n`
  + `# ⛔ Prove they have teeth (rule 04 section 2)\n`
  + `A passing test is not evidence until you have seen it fail. Break the thing each\n`
  + `case guards, show it go red, restore, show it green. ⛔ If a case is red because\n`
  + `the code disagrees with the specification, LEAVE IT RED and report it, quoting\n`
  + `the sentence -- do not rewrite the expectation to match the code.\n`
  + HOUSE_RULES

const stage = (args && args.stage) || 'implement'

if (stage === 'test') {
  phase('Test')
  const written = await parallel(
    SEAMS.map((seam) => () => agent(TEST_PROMPT(seam), {
      label: `test:${seam.key}`, phase: 'Test', isolation: 'worktree', schema: TEST_REPORT,
    })),
  )
  log(`${written.filter(Boolean).length} of ${SEAMS.length} seam(s) came back with a test report`)
  return { stage, seams: SEAMS.map((one) => one.key), reports: written }
}

phase('Implement')

const built = await parallel(
  SEAMS.map((seam) => () =>
    agent(
      `Implement one seam in the gr-scheduler repository.\n\n`
      + `# What\n${seam.what}\n\n`
      + `# Files you own\n${seam.owns}\n`
      + HOUSE_RULES,
      { label: `implement:${seam.key}`, phase: 'Implement', isolation: 'worktree', schema: FINDING },
    ),
  ),
)

log(`${built.filter(Boolean).length} of ${SEAMS.length} seam(s) came back with an implementation report`)

return { stage, seams: SEAMS.map((one) => one.key), reports: built }
