export const meta = {
  name: 'land-the-reason-rows',
  description: 'Carry table T-233 into the screen and close what the four rulings unblocked',
  whenToUse: 'The round after 2026-08-23 52a0592 (specification 0.99). Table T-233 now holds the fifteen reasons a telling can carry, the dictionary holds their words, table T-227 has DI-6, table T-024 has the outward extensions, and OP-9 says what the overlay frame holds. Seventeen red unit cases and one red e2e case follow from those. Pass { stage: "implement" } first, then { stage: "test" } after the front session has merged and verified.',
  phases: [
    { title: 'Implement', detail: 'one worktree per owner, disjoint folders, no verification inside' },
    { title: 'Test', detail: 'a second agent per bench, reading docs/spec only' },
  ],
}

// ⛔ RUN THIS TWICE. `isolation: 'worktree'` cuts every agent a FRESH tree from
// HEAD, so a test agent chained straight after an implement agent would see a
// tree without the code it is meant to test. The merge point goes between them,
// which is where rule 05 puts verification anyway.
//
// ⛔ THIS SCRIPT DOES NOT VERIFY. The front session runs the checks once, at the
// merge point.
//
// ⛔ OWNERSHIP IS DISJOINT BY FOLDER. Every owner below is a different folder,
// and each is told the seam it must not cross.

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
- ⛔ Do NOT touch docs/spec/** or tools/**. The manuscript changes you need are
  ALREADY DONE (see "What changed under you"). If you need another one, say so
  and stop.
- ⛔ Do NOT edit files outside the folders you own. Other agents are working in
  this repository in parallel.
- ⛔ No git commit / push / tag.

# What changed under you, at HEAD, that you should rely on
- ⭐ TABLE T-233 IS NEW: 「知らせが運ぶ理由」, fifteen rows \`RS-1\` .. \`RS-15\`, under
  FR-076 in docs/spec/01-04-requirements.md. Each row states the situation, the
  row of table T-037 that is its manner, and where that situation is defined.
  FR-076 now reads 「知らせが運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い
  理由を運んではならない（MUST NOT）」.
  ⛔ THE ROW ID IS THE KEY, exactly as \`Notice.manner\` carries \`NT-1\`. A raiser
  hands over \`RS-4\`, not \`notUtf8\`.
- ⭐ THE DICTIONARY NOW HAS A \`reasons\` SECTION.
  \`src/adapter/screen-renderer/display-words.json\` holds one entry per row of
  table T-233, keyed \`rowId\`, each with \`text\` and \`nextStep\`, each of those a
  \`{ ja, en }\` pair. All 214 words of the dictionary are now written -- there are
  no empty cells left anywhere in it.
  ⚠️ \`RS-15\` is the row a reason with no row of its own FALLS TO. It is the only
  reason the dictionary answers for a key it does not hold.
- ⭐ TABLE T-227 HAS \`DI-6\`: 「書き出す先が 0 バイトのとき」 -- not treated as already
  being there, and it takes precedence over \`DI-3\`.
- ⭐ TABLE T-024 NOW CARRIES THE OUTWARD EXTENSIONS: \`IO-3\` \`.svg\`, \`IO-4\`
  \`.png\`, \`IO-7\` \`.html\`, beside \`IO-1\` \`.xml\` and \`IO-2\` \`.json\`. The
  clipboard and the store keep an em dash -- they are not files.
  \`src/adapter/document-codec/exchange-formats.json\` carries them: a row that only
  goes out now has an \`extension\` and a \`null\` \`firstCharacter\`.
- ⭐ \`OP-9\` OF TABLE T-024a NOW SAYS WHAT THE OVERLAY FRAME HOLDS: 「その枠へ入れる
  のは、現在の文書のタスクと \`UID\` が一致するものだけとする（MUST）」.

# What to report
Report ONLY: what you changed, what you could not do and why, and any file
outside your ownership that must now change. ⛔ Do NOT run npm test, npm run
typecheck or check.sh -- the front session runs those once at the merge point.
`

const SEAMS = [
  {
    key: 'notices',
    owns: 'src/adapter/screen-renderer/**',
    testOwns: 'tests/unit/uf-67.test.ts and tests/contract/display-words.contract.test.ts',
    what: `Make \`notices.ts\` (UF-67) READ the words for a reason, and retire the two
STOP notes that say it cannot.

⛔ WHAT THOSE TWO STOPS SAY TODAY, on \`toldNotice\`: "THE DICTIONARY HOLDS NO WORD
FOR A REASON" and "THE DICTIONARY HOLDS NO NEXT STEP EITHER". ⭐ BOTH ARE NOW STALE --
the \`reasons\` section exists and every cell of it is written.

1. \`Notice.text\` -- \`NT-1\` of table T-037 (MUST): 「どの項目が、なぜ誤りかを文字で
   示すこと」, and (MUST NOT) 「色や枠だけで示してはならない」. Read it out of the
   \`reasons\` section by the row the raiser carries, in the display language.
   ⛔ The reason key itself must NEVER reach the screen: FR-038 (MUST) keeps every
   printed word in the dictionary, and a key is not a word.
2. \`Notice.nextSteps\` -- \`NT-3a\` (MUST): 「次に取れる手段を添えること」, and
   (MUST NOT) 「失敗したことだけを伝えて手段を示さない通知を出してはならない」.
   Read the \`nextStep\` of the same row. ⚠️ It is one step per row; the member is a
   list because \`NT-4\` gathers several notices onto one surface.
3. ⛔ THE FALLBACK IS \`RS-15\`, and it is the ruling of 2026-08-23. A reason the
   dictionary does not hold falls to that row rather than to an empty string --
   an empty text breaks NT-1 (MUST) and an empty next step breaks NT-3a (MUST).
   ⚠️ Write the lookup so that a row PRESENT but EMPTY is told apart from a row
   ABSENT, the way \`mannerText\` and \`answerLabel\` already do it (\`=== ''\`, never
   \`||\` or \`??\`) -- the difference is what PD-160 records. Today no cell is empty,
   so the empty branch is a guard against a hand-edited generated file.
4. ⚠️ The gathered surface \`NT-4\` builds must carry every text AND every next step
   of what it gathered -- losing one would break NT-3a (MUST NOT) on the way in.
   \`gatheredNotice\` already joins the texts; check it now joins the steps too.

⭐ The header comment of the file says the dictionary has "eight" sections and lists
them. It has nine now. Fix the count and the list.

⛔ Do not touch \`src/framework/**\`. If the shell must hand you something new -- for
instance a reason row where it now hands a bespoke string -- say so in the report.`,
    repair: `⚠️ FOUR CASES OF tests/unit/uf-67.test.ts WERE ALREADY RED BEFORE THIS
ROUND FOR A REASON THAT IS THE BENCH'S OWN, and the previous handoff got this wrong.
The helper \`shownFor\` hard-codes \`mannerText: ''\`. That was true while the dictionary
held no word for \`NT-7\`; it holds one now, so \`confirmationFromSession\` correctly
returns it and four \`toEqual\` cases fail. ⭐ The same bench's \`markFor\` READS its value
out of the dictionary -- do the same for the manner rather than writing a word here.
⚠️ THREE CASES OF tests/contract/display-words.contract.test.ts are red because that
bench does not know the \`reasons\` section: it walks the sections it can key and refuses
one it cannot. Teach it the section, its key field and its two word fields.
⛔ THE TRIPWIRE DID NOT FIRE, AND THAT IS ITS OWN DEFECT. The case 'still owes those words:
the dictionary holds no entry a reason can be found under' was designed to go red the day the
manuscript grew a section keyed by a reason. It looks for an entry with a member literally
named \`reason\`; the section that landed is keyed \`rowId\` -- the row of table T-233, the
move \`Notice.manner\` already makes -- so the tripwire is GREEN against a debt that is
PAID. ⚠️ MEASURED, not guessed: the section exists and that case passes.
Rewrite it to assert the debt is paid -- a section keyed on the rows of table T-233, holding
\`text\` and \`nextStep\` for each -- and keep it driven by the file rather than by a list.`,
  },
  {
    key: 'shell',
    owns: 'src/framework/single-html-shell/**',
    testOwns: 'tests/unit/uf-47-48-choosers.test.ts and tests/system/mspdi-normalization.sws.test.ts',
    what: `Carry to the person the values this file is already holding, and land the
two roads that stop half way.

1. ⛔ FIVE STOP NOTES IN \`frame-loop.ts\` ALL SAY THE SAME THING: a refused write, a
   refused replacement, a file fault on save, a file fault on open, a format mismatch
   and \`OP-11\`'s count each end as a value nobody sees. ⭐ THE DICTIONARY NOW HOLDS
   THE WORDS, so raise them: put a \`RaisedNotice\` on \`ScreenSession.notices\` with the
   manner table T-037 settles and the ROW OF TABLE T-233 as the reason.
   ⚠️ Table T-233 tells you which row each situation is: the five file faults, the five
   write refusals (\`PlanRefusal\` -- table T-067's \`WS-1\` / \`WS-2\` / \`WS-3\`), the
   three format mismatches, and \`OP-11\`'s caution. ⛔ \`cancelled\` is owed nothing and
   has no row -- \`IF-3\` keeps it apart precisely so that it is not reported.
   ⛔ Do NOT compose a sentence here. FR-038 (MUST NOT) forbids a second store of
   translated strings; you hand over a row id and nothing else.
2. \`OP-4\` of table T-024a (MUST): 「置き換えを選んだときは、捨てる前に確認を求めること。
   黙って捨ててはならない（MUST NOT）。合流を選んだときは現在の文書を捨てないので、この
   確認は要らない」. ⭐ \`IC-71\` (置き換える) is chosen and the replacement lands with no
   question asked. Raise \`NT-7\`'s question first and land only on 「続ける」.
   ⚠️ The machinery is already here: \`askToWriteOverDestination\` shows how a question is
   put up and waited on, and table T-066's \`CS-4\` governs the wait -- collect everything
   before the first await, do not re-read the current value while the person answers.
3. ⭐ FR-096's SUGGESTED NAME IS NOW SOLVABLE FOR EVERY FILE FORMAT.
   \`exchange-formats.json\` carries an extension for \`IO-1\` .. \`IO-4\` and \`IO-7\`.
   Wherever this file suggests a name, take the extension from the chosen row.
   ⛔ Do not spell an extension here -- FR-096 (MUST NOT) forbids it and names table
   T-024 as the one place it stands.
4. ⚠️ ONE e2e CASE IS RED ON THIS (\`tests/system/mspdi-normalization.sws.test.ts\`):
   the \`Export Chooser\` (U-54) goes up carrying its formats, a person presses the one
   for MSPDI, and nothing is handed to the platform. The comment at the \`screenStateFromInput\`
   call says so: 「SK-12 opens the Export Chooser here, and nothing carries the export out」.
   Take the format press and write the document out through the road \`SK-11\` already uses.
   ⛔ SVG and PNG cannot be written in this build -- \`ImageExporter\` (PI-21) is a stub.
   Say so in a \`⛔\` note rather than inventing a rasteriser; the exchange formats can go.

⛔ Do not touch \`src/adapter/**\`. Say what ScreenRenderer must draw.`,
    repair: `⚠️ FOUR CASES OF tests/unit/uf-47-48-choosers.test.ts are red.
- \`IC-71\` (RD-4) and \`CS-4\`: ⛔ THE BENCH IS THE SIDE THAT IS BEHIND, and the previous
  round's reading of these two was wrong. \`OP-4\` of table T-024a (MUST) is ALREADY
  implemented and has been since 8ca9078: choosing \`IC-71\` raises NT-7's question --
  「置き換えを選んだときは、捨てる前に確認を求めること。黙って捨ててはならない（MUST NOT）」
  -- and the read returns unless the person takes 「続ける」. The bench takes \`IC-71\` and
  then asserts the document changed WITHOUT ever answering that question, so the document
  correctly does not change. ⭐ Answer it: after \`IC-71\`, the \`Confirmation\` surface
  (U-55 of table T-103) stands with \`IC-69\` and \`IC-70\` on it; press \`IC-69\` and then
  assert the replacement. ⛔ And add the case OP-4 actually earns: pressing \`IC-70\`
  (取りやめる) leaves the current document untouched, and choosing \`IC-72\` (合流) raises
  no question at all -- that row exempts it in as many words.
- \`IC-73\` (OP-9): ⛔ THE BENCH IS THE SIDE THAT IS NOW BEHIND. It expects every task of
  the read file to reach the overlay frame. \`OP-9\` was widened this round and now reads
  「その枠へ入れるのは、現在の文書のタスクと \`UID\` が一致するものだけとする（MUST）」,
  and the fixture's two documents share no \`UID\` -- so an EMPTY frame is the answer the
  specification now gives. Rewrite that case against the new sentence, and add one that
  proves a shared \`UID\` does land.
- The case '⛔ the extension is not written out here: table T-024 is the one place it
  stands' is red because the chooser can propose a name now. Drive it from
  \`exchange-formats.json\` and hold the proposal to 「文書名 ＋ 拡張子」, and to the
  extension alone where the document name is empty (FR-096).
⛔ tests/system/mspdi-normalization.sws.test.ts IS RED IN THE HARNESS, NOT IN THE PRODUCT.
The shell's side of item 4 landed and the format press now goes out through SK-11's road.
⚠️ The \`showSaveFilePicker\` mock inside \`watchWrittenFiles\` answers with a handle carrying
\`name\` and \`createWritable\` and NO \`getFile\`. \`DI-4\` of table T-227 (MUST) has the
destination READ before the question is put -- IF-3 fixes that order -- so the store calls
\`getFile()\`, the call throws, the store reports a fault and nothing is ever written.
⭐ Give the mock handle a \`getFile\` that answers with an empty file, which is what
\`DI-6\` now settles as a destination standing empty. ⛔ Do not weaken the case, and do not
change the order the store reads in -- that order is the rule.`,
  },
  {
    key: 'gateway',
    owns: 'src/adapter/file-gateway/**',
    testOwns: 'tests/contract/if-3-file-store.test.ts and tests/unit/uf-41-42.test.ts',
    what: `Make \`DI-6\` of table T-227 real, and retire the STOP note that asked for it.

⛔ \`file-store.ts\` carries a STOP on \`ChosenWriteDestination\` reading "NOT DECIDED BY
THE SPECIFICATION: which of the two a store must report when it cannot tell them apart",
and it ends 「a row saying which side it falls to would let this note go」.
⭐ THAT ROW NOW EXISTS. \`DI-6\`: 「書き出す先が 0 バイトのときは、既にあるとみなさず、
問わないこと（MUST）。本行は \`DI-3\` に優先する」, because FR-031 (MUST NOT) forbids
asking outside the class of losing something undo cannot give back, and an empty file has
nothing to lose.

1. Retire the STOP and say instead which row decides it. ⚠️ The note currently argues
   BOTH sides ("\`occupied\` looks safer") -- that argument is settled, so it goes.
2. Make the judgement follow the row rather than the file's existence: a destination
   that is there but holds no bytes is \`empty\`. ⛔ Check that nothing downstream then
   asks DI-4's question for it -- \`askToWriteOver\` in \`file-gateway.ts\` returns true
   for \`empty\` already, so what matters is which side the destination is built on.
3. ⚠️ \`DI-6\` takes precedence over \`DI-3\`, and \`DI-3\` is the row that says an
   unreadable destination is not the same document. Zero bytes is unreadable as
   \`GRS JSON\`, so the order is load-bearing: read the byte length BEFORE trying to
   decode. Write the reason down.

⛔ Do not touch \`src/framework/file-system-access-file-store/**\` -- that is the store
side and another owner may be in it. If the store must report something new, say so.`,
    repair: `⚠️ TWO CASES ARE RED, both of them the bench's own.
- tests/contract/if-3-file-store.test.ts, 'every row of table T-227 is walked by a case
  above': the bench builds its roster from the table, the table grew \`DI-6\` this round,
  and no case covers it. Write one -- a destination that exists and holds zero bytes is not
  asked about, and one that holds bytes still is.
- tests/unit/uf-41-42.test.ts, 'GIVEN a destination that is there but holds no bytes at all
  WHEN DI-3 judges it THEN it is read as empty text and the question is put'. ⭐ THAT CASE
  ASSERTS THE ANSWER \`DI-6\` REVERSED. The row is new and takes precedence over \`DI-3\`:
  a destination of zero bytes is not treated as already being there, so no question is put.
  Rewrite it against \`DI-6\` and keep a sibling case proving a destination WITH bytes that
  cannot be decoded still reaches \`DI-4\` -- that is \`DI-3\`, and it did not change.
⛔ Read both rows from docs/spec, not from the code.`,
  },
  {
    key: 'import',
    owns: 'src/use-case/import-document/** and src/adapter/document-codec/**',
    testOwns: 'tests/unit/uf-34-format-from-file.test.ts',
    what: `Two notes now disagree with the specification they cite. Neither is a change of
behaviour -- both are notes that went false when the manuscript moved.

1. \`import-document.ts\`, \`baselinedDocument\`. The note reads 「That the unmatched ones
   are dropped rather than held and skipped is this file's decision」. ⭐ IT IS NOT THIS
   FILE'S DECISION ANY MORE: \`OP-9\` of table T-024a now states it -- 「その枠へ入れる
   のは、現在の文書のタスクと \`UID\` が一致するものだけとする（MUST）」 -- and adds
   「一致が 1 つも無いときは枠が空になる。重ねを行わなかったのではない」.
   ⛔ Cite the row instead of claiming the choice. ⚠️ The BEHAVIOUR does not change:
   the ruling of 2026-08-23 settled it as what the code already does.
   ⚠️ Check that \`report.baselineTaskUidsNotDrawn\` still carries every unmatched
   \`UID\` -- FR-015 (MUST) requires them TOLD, and that is the half that reaches a person.
2. \`document-codec.ts\`, the note above \`READABLE_FORMATS\`. It reads 「the generator now
   writes the write-only ones too and leaves their two columns \`null\`」. ⭐ THAT IS NOW
   HALF FALSE: table T-024 gives the extension column to every row that comes out as a
   FILE, so \`IO-3\` / \`IO-4\` / \`IO-7\` carry an extension and a \`null\` first character;
   only the clipboard is null on both. The dropping still works -- the guard already
   tests both columns -- but the note names the wrong shape.
   ⛔ While you are in it: check that nothing else in the component assumes 「extension
   present implies OP-12 judges this row」. That implication is what broke this round.

⛔ Do not touch \`src/framework/**\` or \`src/adapter/file-gateway/**\`.`,
    repair: `⚠️ ONE CASE OF tests/unit/uf-34-format-from-file.test.ts is red: 'the table is
read -> the remaining rows write an em dash in both columns'. ⭐ THE BENCH IS RIGHT TO HAVE
FAILED -- it was asserting an invariant of table T-024 that this round deliberately broke.
Rewrite it against what the table says now: the first-non-blank-character column belongs to
the rows \`OP-1\` accepts on intake; the extension column belongs to every row that comes
out as a file; a row may carry the extension alone, and none may carry the character alone.
⛔ Drive it from docs/spec, and add a case proving a write-only row is never named by
\`formatFromFile\` -- OP-12 must not judge a row it has only one side of.`,
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
