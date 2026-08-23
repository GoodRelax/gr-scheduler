export const meta = {
  name: 'grab-the-palette',
  description: 'Draw the palette grab band table T-023d now holds, and let the drag land',
  whenToUse: 'The round after 2026-08-23 CR-236. FR-053 (MUST) has the author drag the Command Palette to move it, IC-53 says a grab region shows it, and table T-023d now holds GR-19 at the head of the priority order with S-135a for its height -- but nothing draws the band and nothing writes ScreenSession.commandPaletteAt. Pass { stage: "implement" } first, then { stage: "test" } after the front session has merged and verified.',
  phases: [
    { title: 'Implement', detail: 'one worktree per owner, disjoint folders, no verification inside' },
    { title: 'Test', detail: 'a second agent per bench, reading docs/spec only' },
  ],
}

// ⛔ RUN THIS TWICE. `isolation: 'worktree'` cuts every agent a FRESH tree from
// HEAD, so a test agent chained straight after an implement agent would see a
// tree without the code it is meant to test. The merge point goes between them.
//
// ⛔ THIS SCRIPT DOES NOT VERIFY. The front session runs the checks once, at the
// merge point, and measures the built deliverable in a real browser.
//
// ⚠️ THE WORKTREE MAY BE CUT FROM THE WRONG COMMIT. Measured three rounds
// running: the tree can arrive at an old ancestor with none of this round's
// work. ⛔ Check `git log --oneline -1` FIRST; if HEAD is not the tip of
// `restart`, and your tree is clean, `git reset --hard restart` and say so.

const HOUSE_RULES = `
# House rules (docs/development-rules/)
- English and ASCII in code, comments and test names (rule 03 section 5); the
  markers ⛔ ⚠️ ⭐ are allowed, and a quoted Japanese sentence of the
  specification is allowed where you are quoting it.
- Comments say WHY and name specification row ids. ⛔ Never copy a specification
  value into a comment -- a copied value goes stale in silence.
- R7.6 (MUST): exactly one \`@purity\` tag per function you add.
- R2.1 (MUST): use the name the specification spells.
- ⛔ THE LAYER RULES ARE NOT NEGOTIABLE (table T-061, checked by
  \`python tools/check_layer_rules.py\`): Entity knows nothing outward, UseCase
  knows Entity, Adapter knows both, Framework knows all three, and nothing knows
  a layer outside itself. \`Entity\` and \`UseCase\` compile with no DOM library at
  all. ⛔ If your fix seems to need an edge that points outward, STOP and report
  it -- do not route around the rule.
- Where the specification is silent, write a \`⛔\` comment saying exactly what is
  missing (rule 02 section 3). ⛔ Do not guess a value, and do not delete an
  existing STOP note unless the thing it names is now actually there.
- ⛔ Do NOT touch docs/spec/** or tools/**. The manuscript changes you need are
  ALREADY DONE (see below). If you need another one, say so and stop.
- ⛔ Do NOT edit files outside the folders you own. Other agents are working in
  this repository in parallel.
- ⛔ No git commit / push / tag.

# What changed under you, at HEAD, that you should rely on
- ⭐ TABLE T-023d HAS \`GR-19\`, AND IT IS THE FIRST ROW: 「\`Command Palette\` の
  掴み帯 | **パレットの上端に敷く帯**（高さは \`_assets/tbl-settings.md\` の
  \`S-135a\`）| 掴めばパレットを動かす（\`FR-053\`）」. That table's preamble reads
  「**上の行ほど優先すること（MUST）**」, so the band beats everything drawn under it.
- ⭐ \`S-135a\` HOLDS THE BAND'S HEIGHT, beside \`S-134\` (the \`Panel Divider\`'s
  band) in the not-stored block of table T-206. ⛔ Do not type the number: rule
  03 section 1 has values GENERATED, and \`tools/generate_entity_types.py\`
  already emits \`NOT_STORED_PANEL_DIVIDER_SIZES\` from \`S-134\` for exactly this
  shape. ⚠️ That generator is NOT yours to edit -- if \`S-135a\` does not reach
  \`src/\` yet, say which constant it should land in and stop.
- ⭐ \`FR-053\` now also reads 「パレットの大きさは中身に合わせること（MUST）。
  大きさを設定値の表に持ってはならない（MUST NOT）」, and the published
  \`CommandPalette\` carries \`at: { x, y }\` and no extent.
- ⚠️ \`IC-53\` of table T-109 is 「掴んで動かせることを示す。**ボタンではない**」,
  which is why \`command-palette.ts\` keeps it out of the entries. It is a thing
  to SHOW, not a thing to press.

# ⛔ What is ALREADY DONE and must NOT be rebuilt
Measured in the built deliverable, in a real browser: pressing the \`App Header\`
entry \`IC-7\` hides the palette and \`P\` (\`SK-14\`) brings it back. ⭐ The
show/hide toggle works, in the specification and in the product. The user's
"minimise" is that same hiding (their ruling of 2026-08-23), so ⛔ NOTHING new is
to be built for it and no third state is to be invented.

# What to report
Report ONLY: what you changed, what you could not do and why, and any file
outside your ownership that must now change. ⛔ Do NOT run npm test, npm run
typecheck or check.sh -- the front session runs those once at the merge point.
`

const SEAMS = [
  {
    key: 'palette-band',
    owns: 'src/adapter/screen-renderer/**',
    testOwns: 'tests/unit/uf-65.test.ts and tests/unit/uf-71.test.ts',
    what: `Give the palette the grab band table T-023d now holds, on the drawing side.

⛔ MEASURED: \`IC-53\` does not appear in the built deliverable's DOM at all. The
roster keeps it out of the entries (correctly -- table T-109 says it is not a
button), and nothing draws anything in its place. So FR-053's 「ドラッグで動かせる
ようにすること」 has no place to be grabbed.

1. \`CommandPalette\` (published on \`screen-renderer.ts\`) must carry the band, so
   that the surface can draw it and the input side can hit-test it. ⚠️ Decide the
   shape and say why in the comment. ⛔ The palette has no extent of its own any
   more, so a band expressed as a rectangle would be a second lie of the kind
   \`CR-235\` just removed -- \`S-135a\` gives a HEIGHT and the width follows the
   contents.
2. The band's height comes from the generated constants, never typed. ⚠️ Look for
   how \`S-134\` reaches \`src/\` and follow the same road. ⛔ If \`S-135a\` has no
   constant yet, say which one it should join and stop -- \`tools/\` is not yours.
3. ⛔ It is not an entry. Do not put \`IC-53\` in \`commands\`; table T-109's own
   column says so and \`NOT_BUTTON_ROWS\` already records it. What it needs is to
   be DRAWN and to be findable by the pointer.
4. ⚠️ \`FR-053\` (MUST) also has the palette drawn faint while the pointer is not
   on it. The band is part of the palette, so a pointer on the band is a pointer
   on the palette. Check that whatever you add does not break that.

⛔ Do not touch \`src/framework/**\` or \`src/adapter/input-command-translator/**\`.
Say what each must do with what you publish.`,
    repair: `⚠️ \`tests/unit/uf-65.test.ts\` drives UF-65 and holds the cases for what
\`CommandPalette\` carries -- including one added this round asserting that it carries
a place and NO extent, because FR-053 (MUST NOT) forbids a size being held. ⛔ Read
that case before you write: the band's height is not the palette's size, and the
distinction is the whole reason FR-053 has both sentences.
⚠️ \`tests/unit/uf-71.test.ts\` drives what reaches the DOM. Table T-109's \`IC-53\`
is 「掴んで動かせることを示す。**ボタンではない**」, so a case that finds it among the
pressable entries would be asserting the opposite of that column.`,
  },
  {
    key: 'palette-drag',
    owns: 'src/adapter/input-command-translator/** and src/framework/single-html-shell/**',
    testOwns: 'tests/unit/uf-30-31.test.ts and tests/unit/uf-47-48-choosers.test.ts',
    what: `Make the drag land: today nothing writes \`ScreenSession.commandPaletteAt\`.

⛔ MEASURED: \`frame-loop.ts\` hands the \`Row Area\`'s corner every frame, so the
palette cannot move however it is dragged. FR-053 (MUST) says it must.

1. \`GR-19\` of table T-023d is the FIRST row of that table and its preamble reads
   「**上の行ほど優先すること（MUST）**」 -- so a press that lands on the band is the
   band's, whatever is drawn under it. ⚠️ The note under table T-023a already keeps
   the palette out of the schedule's decision order; this is the other half.
2. A drag on the band moves the palette by the distance the pointer went. ⛔ Read
   \`MK-7\`'s pan for the shape of "moves by the distance the pointer went (MUST)"
   -- ⚠️ but do NOT reuse the schedule's anchor road: the palette's place is a pair
   of screen numbers, not a date and a row.
3. \`ScreenSession.commandPaletteAt\` is the shell's to hold and to hand over.
   ⛔ It has NO row in table T-203 or table T-206 -- the ruling of 2026-08-23 is
   that the place is NOT remembered, so it goes back to the \`Row Area\`'s corner at
   startup and is lost with the page. Write that down; do not add storage.
4. ⚠️ \`IN-1\` of table T-028: nothing settles on the press. A drag is decided on
   release, and \`IN-1a\` aborts it if the pointer is lost. Follow what the file
   already does for the other drags rather than inventing a second discipline.
5. ⛔ Nothing may be clamped to the window without a rule to clamp it by. If you
   think a bound is needed, write a \`⛔\` note saying no row states one.

⛔ Do not touch \`src/adapter/screen-renderer/**\` or \`src/framework/dom-screen-surface/**\`.
Say what each must hand you.`,
    repair: `⚠️ \`tests/unit/uf-30-31.test.ts\` drives the translator against a fixed copy of
table T-023 and table T-023a. Table T-023d is a THIRD table and the grab order is its
own; Chapter 1.9 asks for a fixed copy of the table a case is driven by, so \`GR-19\`
needs one rather than being asserted from memory.
⚠️ \`tests/unit/uf-47-48-choosers.test.ts\` builds a real \`frameLoop\` over a fake host
and pane and feeds it \`receiveInput\` -- that is the closest thing in the benches to the
running application, and it is where a press-drag-release on the band can be driven end
to end. ⛔ Prove the palette's place actually CHANGED, not merely that a command was
emitted.`,
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
  + `SPECIFICATION ONLY. ⛔ You MUST NOT read the body of the implementation you are\n`
  + `testing -- only its public entry's exported types and signatures.\n\n`
  + `# The seam\n${seam.what}\n\n`
  + `# Files you own\n${seam.testOwns}\n`
  + `⛔ Tests only. Do NOT edit src/ or tools/ -- if the code is wrong, leave the case red.\n\n`
  + `# ⚠️ What the implement stage left you\n${seam.repair}\n\n`
  + `# Where the tests go\n`
  + `Table T-218 of docs/spec/05-07-design.md assigns a directory and a tool to each\n`
  + `kind of test and forbids any other place (MUST NOT). Derive yours from it.\n\n`
  + `# ⛔ Prove they have teeth (rule 04 section 2)\n`
  + `A passing test is not evidence until you have seen it fail. Break the thing each\n`
  + `case guards, show it go red, restore the file EXACTLY (copy first, checksum\n`
  + `after), show it green. ⛔ If a case is red because the code disagrees with the\n`
  + `specification, LEAVE IT RED and report it, quoting the sentence.\n`
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
