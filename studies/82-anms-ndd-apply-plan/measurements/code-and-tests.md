# Code and tests against the new R3 / R1b / R6 / R7 / A.3 rules — survey 2026-11-23

This survey only reads files. No repository file was edited, nothing was committed, and check.sh, GT-2 and npm test were not run.
Worktree: `.claude/worktrees/interesting-bassi-de388c` (branch `claude/anms-ndd-apply-plan-4f5f4d`, HEAD f043c7356).
Standard: `gr-sw-maker-qa/confirmed-2026-11-23/review-standards-en-20261123T131438Z.md` (R3 Comments, R1b Traceability, R6, R7 @purity, A.3).

## 0. Method (all scripts are in the scratchpad `survey/` directory)

| Script | What it does | Command |
|---|---|---|
| `comments.py` | Imports `lex`, `body_of`, `generated_lines` and `is_code` from `.claude/skills/spec-graph-check/check-comment-rules.py` (the check-55 lexer, which skips strings, templates and regexes). It reads every git-tracked `src/**/*.ts` (185 files) and `tests/**/*.ts` (865 files) and groups comments into units. One `/* */` or `/** */` block is one unit. A trailing `//` comment is one unit. A run of full-line `//` comments is split into units: a line that opens with a known head starts a new unit, and an empty `//` ends the unit. Each unit is classed by its first non-empty line. Lines between `<generated -- do not edit by hand>` and `</generated>` are marked as generated and left out. | `python -I survey/comments.py <worktree> survey/units.json` |
| `analyze.py`, `peek.py`, `tests_more.py`, `markers.py`, `last.py` | Count classes, first words, multi-line units, non-ASCII text and markers from `units.json`. | `python -I survey/<x>.py survey/units.json [survey/ast.json]` |
| `ast.mjs` | Parses every file with `rolldown/parseAst` (from the parent checkout's `node_modules`, read-only; about 3 s). It collects functions with a body and their anchors (the declaration, variable, property or method), the `@purity` value in the anchor's leading comments, whether the function is exported, top-level or expression-bodied, and whether it sits in a generated region. It also finds the next declaration or statement after each `// see` unit, and every `it` / `test` / `describe` call with its title, span and the IDs in its leading comments. | `node survey/ast.mjs <worktree> <parent-checkout> survey/ast.json survey/units.json` |
| `ast_analyze.py`, `see_entry.py` | Measure purity coverage, where `see` comments sit, and how tests cite IDs. | `python -I survey/ast_analyze.py survey/ast.json` |

Kind classes of a unit, by its first non-empty line:
- **New kinds**: `Why:`, `Spec:`, `Summary:`, `Temporary:`, `Unimplemented:`, `Provisional:`, `Section:`, `Consistency:`, and `@purity`.
- **GRS legacy heads**: `WHY:`, `TRAP:`, `STOP:`, `DEVIATION:`, `STEP:`, `see <ID>`, `@provisional`, and the header tags `@unit` / `@component` / `@publishes` / `@seam`.
- **Directives**: `eslint-`, `@ts-`, and similar.
- **License notices**.
- **Other**: anything else.

Counts are of comment units, not lines, unless a line count is given. Generated regions are left out: 573 units in `src`, 1 unit in `tests`.

## 1. Comment inventory by kind

### src (185 files; 9,370 comment units outside generated regions; 9,639 physical comment lines)

| Class | Units | Lines | Files | Under the new rules |
|---|--:|--:|--:|---|
| `@purity` (3,841 `/** @purity v */` + 185 file-header `// @purity v`) | 4,026 | 4,045 | 185 | Kind exists (R7). The 185 file-level tags are a GRS extra; R7 tags functions only. |
| `// see <ID>[, ID...]` | 2,956 | 2,956 | 179 | Becomes `Spec:`. Placement is limited (see section 3). |
| `// WHY:` | 1,242 | 1,402 | 159 | Becomes `Why:` (case change). |
| `// TRAP:` | 512 | 592 | 115 | **No such kind.** It becomes `Why:` or a project-rule kind. |
| header tags `@unit` 185, `@component` 185, `@publishes` 37, `@seam` 8 | 415 | 423 | 185 | **Not a kind.** Must be set in project rules as tool-read directives (audit-ch5 etc. read them). |
| other (= the role line of the file header, e.g. `// EditDocument -- routes each ...`; all 185 at line 1) | 185 | 185 | 185 | **No kind.** Candidates: `Summary:` (but it is not EARS) or a project-rule "header" kind. |
| `// STOP:` | 17 | 18 | 15 | Becomes `Unimplemented:` / `Provisional: OPQ-n`. |
| `// @provisional PND-n` | 10 | 10 | 8 | Folds into `Provisional: OPQ-n`. |
| `// DEVIATION: ... (DFC-n)` | 7 | 8 | 5 | **No kind.** |
| `Spec:` / `Summary:` / `Temporary:` / `Unimplemented:` / `Provisional:` / `Section:` / `Consistency:` / `Why:` (new spelling) | 0 | 0 | 0 | none written yet |
| directives / license | 0 | 0 | 0 | — |

- Styles: 5,528 full-line `//` units, 3,841 JSDoc units, and 1 trailing unit.
- Top "other" first words in src are component names: SingleHtmlShell 19, InputCommandTranslator 14, Schedule 13, DomScreenSurface 13, ScheduleLayout 12, ScheduleGeometry 8, EditDocument 8, The 7, ... (`analyze.py`). Every one of them is a header role line.
- Check 55 is green at baseline 0 (`comment-rules-baseline.txt` line 1 = `0`). So src already obeys the closed GRS form set; the work is a mapping, not a cleanup.

### tests (865 files; 13,663 comment units; 36,777 physical comment lines)

| Class | Units | Files |
|---|--:|--:|
| other (no kind) | 7,460 (+2 false "license" hits = 7,462; 29,794 lines) | 850 |
| `// WHY:` | 2,896 | 645 |
| `// see <ID>` | 1,859 (+23 inline `see`) | 468 |
| `@purity` | 1,213 | 177 |
| `// STEP:` | 131 | 50 |
| directives (45 `/* eslint-disable @typescript-eslint... */`, 8 `eslint-disable-next-line`, 1 misread) | 54 | — |
| `// TRAP:` | 44 | 24 |
| `// DEVIATION:` | 3 | 2 |
| `@provisional` | 1 | 1 |
| real license notices | 0 | 0 |

Top 25 "other" first words in tests:

| First word | Units |
|---|--:|
| The | 922 |
| `-----...` rule line | 607 |
| ⛔ | 562 |
| ⭐ | 556 |
| ⚠️ | 478 |
| `=====...` rule line | 339 |
| A | 200 |
| One | 131 |
| Every | 113 |
| What | 105 |
| 表 | 91 |
| ⛔⛔ | 80 |
| ⭐⭐ | 75 |
| -- | 75 |
| Unit | 71 |
| Table | 59 |
| How | 51 |
| GOES | 48 |
| Whether | 47 |
| Everything | 41 |
| Contract | 39 |
| W3 | 39 |
| Where | 29 |
| Press | 25 |
| BO-1 | 22 |

Other measured facts about the "other" units:
- 958 units are decorative rule lines.
- 1,756 open with an emoji mark.
- By folder: unit 4,610, contract 1,885, system 550, nfr 256, integration 111, fixtures 33, use-case 15.

The tests half of check 55 is a per-file ratchet. `comment-rules-tests-baseline.txt` lists 167 files, 104 of them non-zero, and the held values sum to 38,122. The tree density is 1,283 basis points (12.8%).

### Multi-line comments

- **src**: 262 multi-line units (WHY 160, TRAP 80, header `@purity` / header tag followed by provenance lines 20, DEVIATION 1, STOP 1). All 262 carry their head on the first line. The 20 header units are a role/tag line followed by "Generated region ... do not edit by hand" provenance text; that text needs a project-rule kind. **0 need the kind moved.** Command: `analyze.py` "multi-line whose first physical body is empty" = 0, and "head only on a later line" = 0.
- **tests**: 5,516 multi-line units.
  - 4,748 have no kind on any line (other). Size distribution: 2 lines 600; 3 lines 1,306; 4 lines 741; 5 lines 483; 6–9 lines 1,037; 10+ lines 581. Each needs a kind added on its first line, or a rewrite or deletion.
  - 799 are JSDoc blocks whose first line is a bare `/**`, so the kind cannot sit on that line without reshaping the block.
  - WHY in tests is at most 3 lines (1: 2,166; 2: 724; 3: 6).

## 2. Markers the new rules rename or replace (comment text only, generated regions left out)

Command: `python -I survey/markers.py survey/units.json survey/ast.json`

| Marker | src occurrences / units / files | tests occurrences / units / files | New form |
|---|---|---|---|
| `STOP:` | 17 / 17 / 15 | 0 | `Unimplemented: OPQ-n` or `Provisional: OPQ-n` |
| `@provisional PND-n` | 10 / 10 / 8 | 1 / 1 / 1 | `Provisional: OPQ-n` |
| `DEVIATION: ... (DFC-n)` | 7 / 7 / 5 | 3 / 3 / 2 | no kind (judgment) |
| `TRAP:` | 512 / 512 / 115 | 44 / 44 / 24 | no kind (`Why:` or a project kind) |
| `WHY:` | 1,242 / — / 159 | 2,896 / — / 645 | `Why:` |
| `STEP:` | 0 | 131 / — / 50 | no kind |
| `see <ID>` at line head | 2,956 / — / 179 | 1,859 / — / 468 | `Spec:` |
| `see <ID>` anywhere | 2,958 | 1,882 | — |
| `Spec:` / `spec:` / `@spec` / `[REQ-` / `OPQ-n` | 0 | 0 | — |
| `TODO` / `FIXME` / `XXX` / `HACK` | 0 | 0 | (`Temporary:` exists for these) |
| JDG-n (rulings) | 110 / 98 units / 36 files | 140 / 132 / 93 | grounds only, never a parent |
| DFC-n (defects) | 71 / 67 / 38 | 668 / 550 / 271 | — |
| PND-n (pending decisions) | 19 / 19 / 17 | 49 / 44 / 19 | becomes OPQ-n |
| CR-n (change requests) | 42 / 42 / 28 | 1,564 / 1,391 / 629 | — |
| `@manual` | 0 | 0 | — |
| GIVEN/WHEN/THEN in comments | 0 | 29 / 22 / 19 | — |
| emoji marks ⛔⭐⚠ | 0 | 4,597 / 2,933 / 102 | — |

Decision IDs in test titles (not comments), from `markers.py`:

| ID | it/test titles | describe titles |
|---|--:|--:|
| JDG | 64 | 49 |
| DFC | 123 | 280 |
| CR | 167 | 547 |
| PND | 10 | 12 |

163 it/test titles cite only decision IDs. File names: 484 test files are named `cr-NNN-...`, 160 `dfc-NNN-...`, 1 `jdg-`, and 1 `pnd-` (`git ls-files tests | sed 's#.*/##' | grep -oE '^(dfc|cr|jdg|pnd)-[0-9]+'`).

The pending-decision ledger, `docs/development-records/pending-decisions.md`, holds 356 `PND-n` rows (`grep -cE '^\| *PND-[0-9]+'`). A.3 wants an `OPQ-xxx` list in a spec appendix, with the columns ID / Undecided point / Places searched / Decider / Provisional handling / Tests to fix on reversal.

## 3. Where `see` (the future `// Spec:`) sits

Command: `ast_analyze.py` and `see_entry.py`. The anchor is the first declaration or statement after the comment, with only whitespace or comments between them.

| Place the `see` comment sits on | Count |
|---|--:|
| top-level exported function | 665 |
| top-level non-exported function | 1,527 |
| top-level non-exported const | 207 |
| top-level exported type / interface | 201 |
| statement inside a function body | 123 |
| interface / type member | 101 |
| top-level non-exported type / interface | 47 |
| top-level exported const (not a function) | 42 |
| object property | 27 |
| nothing declaration-like follows | 13 |
| exported class | 2 |
| exported other | 1 |
| **total** | **2,956** |

- By layer: adapter 1,132; framework 833; entity 612; use-case 379.
- **Estimate of comments outside "a place implementing a spec behavior"**:
  - Strict reading (only exported functions and classes count): 2,289 of 2,956 (77%) sit elsewhere.
  - Lenient reading (exported types and consts also count): 2,045 sit elsewhere.
- Component entry heuristic (the file name equals its folder name; 24 such files): 79 `see` comments sit on exported functions of entry files, against 586 on exported functions of other files.
- The reverse gap: 932 exported top-level functions, of which 664 carry a `see`. **268 exported functions have no `see`**, and judgment decides which of them implement a behavior.
- IDs cited: 7,735 in total, 1,794 distinct. Per comment: 1 ID 683, 2 IDs 996, 3 IDs 642, 4 or more 635 (up to 14).
- Prefixes cited:

  | Prefix | Count |
  |---|--:|
  | FR | 1,318 |
  | T (table) | 861 |
  | S | 451 |
  | CM | 246 |
  | SV | 237 |
  | RW | 219 |
  | IC | 212 |
  | OP | 121 |
  | AT | 119 |
  | TV | 113 |
  | EL | 110 |
  | HF | 104 |
  | SJ | 101 |
  | PR | 98 |
  | IN | 98 |
  | WC | 96 |
  | GR | 91 |
  | AM | 90 |
  | CV | 89 |
  | AG | 74 |
  | RS | 74 |
  | WB | 67 |
  | IF | 66 |
  | AS | 64 |
  | TX | 63 |
  | GA | 63 |
  | UN | 62 |
  | **JDG** | **62** |
  | U | 61 |
  | SQ | 60 |
  | ... | ... |

- 74 `see` comments cite a decision ID (JDG 62, DFC 23, CR 2), and 1 cites decision IDs only. R1b: "the ID of a ruling or a decision is never used in place of a parent ID".
- In tests, `see` appears 1,859 times in 468 files, but only 29 sit directly before an it/test call.

## 4. `@purity` (product code = src only; tools/ and demo/ are not product code)

Command: `ast.mjs`, then `ast_analyze.py` and `last.py`. A function is a FunctionDeclaration, FunctionExpression or ArrowFunction with a body. The tag is a `@purity v` in the leading comments of its anchor, which is the same rule `purity-calls.mjs` uses. purity-calls.mjs itself was read but not run: it starts the TS7 RPC compiler.

- Functions in src: 6,035, of which 65 are in generated regions (exempt) and 5,970 are hand-written. Tagged: 3,799, all in the `/** @purity v */` block style.

| Kind | Total | Tagged | Untagged |
|---|--:|--:|--:|
| function declarations | 3,633 | 3,631 | 2 |
| methods | 2 | 2 | 0 |
| object-property functions with a block body | 140 | 103 | 37 |
| variable-bound arrows / functions with a block body | 57 | 10 | 47 |
| anonymous callbacks with a block body | 220 | 0 | 220 |
| single-expression arrows (exempt) | 1,918 | 53 | 1,865 |

- **Coverage of block-bodied named functions: 3,746 / 3,832 = 97.8%. 86 are untagged, in 30 files; 84 of them are nested inside another function** (e.g. `walk`, `rowsOf`, `closeRun`).
- If "anonymous functions" in the R7 exemption is read as covering block-bodied callbacks, the gap is 86. If it is read as "single-expression anonymous functions" only, add 220 (63 files).
- Tagged / total by layer (all functions): adapter 1,361/2,236; entity 765/1,224; framework 1,169/1,714; use-case 504/796.
- Values in src (`git grep -hoE '@purity +[A-Za-z/-]+' -- src`):

  | Value | src | tests |
  |---|--:|--:|
  | pure | 3,160 | 591 |
  | non-pure | 688 | 442 |
  | semi-pure-mutable | 195 | 316 |
  | **n/a** | **8** | 0 |
  | semi-pure-immutable | 0 | 1 |

  The 8 `n/a` values are file-header tags of interface-only files (snapshot-source.ts, clipboard.ts, file-store.ts, ...). `n/a` is **not one of the 4 R7 values.**
- **semi-pure-immutable is used 0 times in src.**
- Retired values (`semi-pure-a/b`, `semiPureA/B`): 0 in src and tests.
- Also not in R7: the 185 file-level `// @purity` header lines. R7 tags functions only. purity-calls.mjs already ignores them.
- Test code (exempt): 40,177 functions, 1,340 tagged.
- GRS rule 07 R7 already says the same as the new R7. I found no check that measures coverage. Check 64 (`check-purity-honesty.py`) checks only honesty, and check 94 checks retired values.

## 5. Non-English / non-ASCII comments

- src: **0** non-ASCII comment lines (check 55 already forbids them).
- tests:
  - **9,194** non-ASCII comment lines in 3,852 units across **102 files**.
  - 2,296 units hold Japanese.
  - The most frequent characters are の, 「」, と, る, い, は, を, な, ⛔ (1,784), and （）.
  - Command: `analyze.py`.
- Test titles (strings, not comments): 1,418 of 11,091 titles hold non-ASCII.

## 6. Tests

- **Places**: tests/contract 516 .ts, unit 208, system 111, use-case 15, fixtures 9, integration 3, nfr 3. Vitest runs contract, unit and integration; Playwright runs use-case, system and nfr.
- **No `.feature` files** (`git ls-files | grep '\.feature$'` = 0). Gherkin is not used. Use-case tests are Playwright `test()` with `test.step('UC-001 step 1: ...')`, one test per UC (15 sites in 14 files). UC-015 has no test (test-inventory.md §2).
- **Counts**: 11,091 it/test call sites and 3,266 describe calls (`ast.mjs`). test-inventory.md counts 11,147 case sites in 796 files.
- **Test-name form**:
  - 0 titles start with or contain "should".
  - 128 titles contain `->` or `→`.
  - 398 titles carry GIVEN/WHEN/THEN; 296 titles begin with GIVEN.
  - 3,541 titles start with an ID.
  - Typical title: "the frame shows the HB-12 pointer", or "AV-19: a delayed task is a row keyed by its task uid".
  - Most titles state the expected result. The "precondition → operation → expected result" form is used only by the 398 GIVEN/WHEN/THEN titles.
- **How tests cite the spec today**: through IDs in titles, not comments.

  | Where the ID sits | it/test sites |
  |---|--:|
  | ID in the it/test title | 6,272 |
  | ID only in an enclosing describe title | 4,366 |
  | ID only in the file name | 372 |
  | ID only in a leading comment | 7 |
  | no ID at all | 74 |

  Sites with no ID in their own title (the ID sits in a describe title, the file name or nowhere), by folder: contract 3,029; unit 1,578; system 173; integration 38; use-case 1.

  - Only 29 test sites have a `// see` directly before them.
  - **R6 wants the parent ID "in a comment, example `// Spec: FR-012`"; about 11,055 sites have no such comment.**
  - File-level comments: 769 of 792 `*.test.ts` files carry an ID in their first comment. Of those first comments, 185 cite spec IDs only, 500 cite spec IDs mixed with CR/DFC/JDG/PND, 87 cite **only decision IDs**, and 20 cite no ID.
- **`@manual`: 0.** Checks a person must make live elsewhere:
  - the defect ledger's 実物確認 column, held by check-live-verification.py;
  - the owner's user-test checklists.

  Neither is a tagged test.
- **Test record: none is kept.**
  - `tools/gate/run-gate.mjs` writes `vitest.json` and `playwright.json` into `mkdtempSync(tmpdir(), 'grs-gate-')` (lines 231, 248, 265) and removes them with `rmSync` (about line 274).
  - `tests/known-red.txt` holds expected reds.
  - `docs/development-records/test-inventory.md` is generated (`npm run gen:tests`, check 71) and lists files, case sites and ID coverage, not results.
  - Verdicts ("GT-2 <sha> passed") live in reports and commit text only.
  - `package.json` scripts: `test` = `vitest run --passWithNoTests`, `e2e` = `playwright test`, `gate:run` / `gate:perf` = run-gate. No reporter writes JUnit or Cucumber JSON to the repository.

## 7. What the new rules force, and the size of each change

| # | Change | Size (files / units or lines) | Mechanical or judgment |
|---|---|---|---|
| C1 | `// WHY:` → `// Why:` | src 159 files / 1,242 units; tests 645 files / 2,896 units | **Mechanical** (sed on the comment head only; the lexer-based identity check applies) |
| C2 | `// see <IDs>` → `// Spec: <IDs>` | src 179 files / 2,956; tests 468 files / 1,859 | **Mechanical** rename |
| C3 | `Spec:` placement: keep only at behavior-implementing places, and add it where missing | **Remove or keep**: 2,289 (strict) or 2,045 (lenient) on non-exported functions, consts, types, statements and members. **Add**: up to 268 exported functions with no `see`. **Fix**: 74 comments citing JDG/DFC/CR (move to `Why:` as grounds) | **Judgment** per site. The rule says other code "needs no `// Spec:`", so removing is optional unless the project rule forbids it. Removing 2,000+ comments also loses the trace check 55 and the impact tools may rely on. |
| C4 | `// TRAP:` has no kind | src 115 files / 512 (592 lines); tests 24 / 44 | **Decision first**: map to `Why:` (mechanical after that) or register `TRAP` as a project kind (zero edits) |
| C5 | STOP + `@provisional PND-n` → `Provisional: OPQ-n` / `Unimplemented: OPQ-n` | src 17 STOP + 10 marks in 15 files; tests 1 | **Judgment** per site. The A–C class with a mark is Provisional. The D–H class "code already chose" is still built code, so it is Provisional, not Unimplemented. Plus the ledger move: 356 PND rows become an OPQ appendix in the spec with the A.3 columns. Check 25 (`check-pending-decisions.py`) and check 55 must be rewritten. A.3 also asks for `(provisional: OPQ-x)` / `(undecided: OPQ-x)` marks in spec sentences. |
| C6 | `// DEVIATION: ... (DFC-n)` has no kind | src 7 in 5 files; tests 3 in 2 | **Judgment**: `Temporary: <reason>. Until: DFC-n fixed.`, or a project kind |
| C7 | File header (role line, `@unit`, `@component`, `@publishes`, `@seam`, file-level `@purity`, generated-region provenance lines) | 185 files: 185 role lines + 415 tag lines + 185 file `@purity` lines + about 20 provenance continuations | **Decision first**: register "file header" and the tags as project kinds (tools read them: audit-ch5, purity, generators). Then it is mechanical or nothing. The alternative is to rewrite the role lines as `Summary:`, but they are not EARS. |
| C8 | `n/a` purity value (not in R7) | 8 files | Small judgment: drop it (interface-only file, no function bodies) or register it |
| C9 | `@purity` coverage to 100% | 86 block-bodied named functions in 30 files (84 nested); +220 anonymous block-bodied callbacks in 63 files if those are not exempt | **Judgment** per function (choose the value). A coverage check would be new tooling. purity-calls.mjs already enumerates functions, so it is a mechanical addition. |
| C10 | `STEP:` in tests has no kind | 50 files / 131 | Decision: project kind, or move into `test.step()` titles |
| C11 | Directive comments (`eslint-disable...`) | tests about 53 | Register in project rules: no edits |
| C12 | Kindless comments in tests | 850 files / 7,462 units / 29,794 lines, including 958 rule lines, 1,756 emoji-led units and 4,748 multi-line units (799 with a bare `/**` first line) | **Judgment**, the largest item. Each unit must be re-kinded (`Why:` / `Spec:` / `Summary:`) or deleted. The rule lines and emoji marks can be stripped mechanically. |
| C13 | Non-English comments in tests | 102 files / 3,852 units / 9,194 lines (2,296 units Japanese) | **Judgment** (translate or delete; often spec quotes, which R3 forbids anyway) |
| C14 | Test parent ID in a comment (`// Spec: <ID>`) | about 11,055 test sites have none. IDs exist in titles (6,272) or describe titles (4,366). 87 files and 163 titles cite only decision IDs (CR/DFC/JDG/PND). | Mostly **mechanical** (lift the IDs from titles into a `// Spec:` line, about 11k insertions in about 790 files). Judgment is needed for about 446 sites with no spec ID in their own title and for the decision-ID-only files. A describe-level `// Spec:` would cut the count, if accepted. |
| C15 | Test-name form ("precondition → operation → expected result" or "should ...") | 11,091 titles; 0 use "should", 398 use GIVEN/WHEN/THEN | **Judgment** (rewording); size depends on how strictly the form is read |
| C16 | Gherkin for use-case tests (scenario ID, UC-path tag, one When, a scenario per rejection path) and `@manual` | 0 .feature files; 14 UC test files, 15 sites; UC-015 has none | **Judgment** + new tooling (a Cucumber runner or a Gherkin layer over Playwright) |
| C17 | Test record (a tool report for every non-`@manual` test; `@manual` results with the Cucumber result values) | none persisted today (run-gate deletes its JSON) | Tooling: keep the vitest/playwright JSON or JUnit as a record file outside the spec, and add a manual-test record. Mostly mechanical. |
| C18 | Checks and docs that encode the old forms | check-comment-rules.py (check 55, 1,236 lines), check-pending-decisions.py (25), check-twin-comments.py (70; STOP/DEVIATION/TRAP), check-literal-restatement.py (TRAP), generate_comment_rules_card.py, generate_entity_types.py / generate_startup_template.py (emit TRAP / @provisional), generate_test_inventory.py (ID reading), both comment-rules baselines; docs/review/comment-rules-src.md, docs/development-rules/03-implementation.md §3, 06-pending-decisions.md | Rewrite: judgment for the rules, then mechanical for the checks |

Rough total:

| Kind of work | Scale |
|---|---|
| Mechanical renames (C1, C2, the C4 map) | about 9,500 comment heads in about 700 files |
| Judgment (C3, C5, C6, C9, C12, C13, C15, C16) | the bulk is in tests: about 7,500 kindless units and 11k titles |
| src | small: about 2,300 placement calls, 27 STOP/DEVIATION sites, 86–306 purity tags |
