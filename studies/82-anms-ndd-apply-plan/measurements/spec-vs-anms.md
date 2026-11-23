# GRS spec vs ANMS v0.36 (draft v53) + review standard 20261123T131438Z — gap survey

- Surveyed tree: worktree `interesting-bassi-de388c`, branch `claude/anms-ndd-apply-plan-4f5f4d`, HEAD `f043c7356` (clean). Read-only; no repo file edited.
- ANMS = `gr-sw-maker-qa/confirmed-2026-11-23/anms-v036-draft-en-v53.md`; RS = `review-standards-en-20261123T131438Z.md`.
- All paths below are relative to the worktree root. `cd <worktree>` precedes every command.
- Helper scripts (scratchpad, read-only on the repo): `survey/prefix_count.py`, `relations.py`, `ears.py`, `sentence_rules.py`, `demo_break.py`, `tou.py`, `sloc.py`. Outputs: `prefix_counts.tsv`, `sentence_rules.tsv`, `statements.json`, `rowids.txt`, `demo_break.out`, `tou.out`.
- CAVEAT for anyone re-measuring: on this Windows Git Bash, `grep '\bX\b'` next to Japanese text undercounts badly (MUST: 1039 with `\b` vs 2957 without). Use `LC_ALL=C.UTF-8` or no `\b`. Also `python -I` ignores `PYTHONIOENCODING`, so write Japanese output to a UTF-8 file.

---

## 0. Headline

| # | Item | Gap size | Owner ruling needed? |
|---|------|----------|----------------------|
| 1 | Header + changelog | Medium (form change; 548 historical rows) | Yes: rewrite or freeze old rows |
| 2 | Chapter structure / split | Large (renumber 10 chapters -> 7+A; 1.44 MB file; no UCF to split by) | Yes |
| 3 | Ch1 IDs | Large (PUR/AN/ISS/APR/BG missing; 3,365 row IDs unpadded; CH lists children) | Yes |
| 4 | Use cases | Large (0 of 6-field form, 0 marks, 0 UCF; 15 UCs) | Yes |
| 5 | Requirements | Very large (136 nodes OK-ish, but ~450 MUST table rows + ~1,600 MUST prose lines outside "ID/sentence/traces") | Yes |
| 6 | Sentence rules | Large for demonstratives (~3,000), small for nado/tou | Partly |
| 7 | Open questions | Medium (PND list exists outside spec; 29 open) | Yes |
| 8 | Ch4/Ch5 | Medium (ADR-000 exists; components lack public-interface/traces columns; SWS not IMPS) | Partly |
| 9 | Tests | Large (0 Gherkin, 0 SCN, 0 @manual, 0 `// Spec:`) | Yes |
| 10 | Ch7 compliance | Policy conflict: GRS rule deleted the chapter | Yes |
| 11 | Glossary | Large (no glossary JSON in _source; draft with 1,511 terms in studies, no renames[]) | In flight (CR-857) |
| 12 | JSON sources | Large (STM shape differs fundamentally; registry keys 2 renamed/1 missing/2 extra; ~3,420 ja-only text objects) | Yes |
| 13 | Code size | 52,283 SLOC > 10,000 -> glossary/registry/STM JSON REQUIRED | No (fact) |

---

## 1. Spec header and changelog

**ANMS asks** (137-160): three lines `**Version:** <UTC basic ISO 8601>`, `**Template:** ANMS v0.36`, `**Changelog:** <file>`; changelog in a separate file (required), one change per row, columns **Version / Change / Changed IDs / Basis**; Changed IDs split into added/changed/removed; Basis = record ID (CR/RVF/ADR/OPQ) or "Initial version"; last row version == header version; current version only in the header (149).

**GRS now:**
- Header of each spec file = `**Grammar**: spec.sgra` / `**UID**: DOC-...` / `**Version**: 0.4` (`docs/spec/01-04-requirements.md:3-5`, `05-07-design.md:3-5`); `08-10-test.md` and `A-appendix.md` say `0.1`. No `Template` line, no `Changelog` line.
  - `grep -h '^\*\*Version\*\*' docs/spec/*.md docs/spec/_assets/*.md | sort | uniq -c` -> 17 files carry a Version line (0.1 x12, 0.2 x2, 0.3 x1, 0.4 x2). ANMS allows the version only in the header.
- Changelog already a separate file: `docs/development-records/changelog.md` (568 lines, 738,898 B). `A-appendix.md:28-32` (A.3 Changelog) only points to it.
  - Columns: `| 版 | 日付 | 変更内容 |` (changelog.md:18) = Version / Date / Change. No "Changed IDs", no "Basis" column.
  - Rows: `grep -cE '^\| [0-9]+\.[0-9]+ \|'` = **529** numeric versions (0.1 .. 5.36); `grep -cE '^\| [0-9]{8}T[0-9]{6}Z \|'` = **19** timestamp versions (CR-822 rule, `docs/development-rules/10-versions.md:30`). Total 548 data rows.
  - Basis is in prose: 513 rows mention `CR-n`, 314 mention `JDG-n` (`grep -E '^\| [0-9]' ... | grep -cE 'CR-[0-9]+'`). Rulings (JDG) are used as basis — ANMS allows CR/RVF/ADR/OPQ as Basis; JDG is not on its list (and ANMS 42 forbids ruling IDs as parents — basis is OK).
  - Last row `20261107T231746Z` (changelog.md:568) != header `0.4`.
- Version format rule lives in `docs/development-rules/10-versions.md` §2 (changelog row = UTC basic form) — already matches ANMS Version format for new rows.

**Work:** (a) replace 3 header lines in the first ANPS file (and delete the Version lines of the other 16 files, or turn them into "first file name" lines); (b) add `Changed IDs` and `Basis` columns to changelog.md (and probably rename the file / its title "A.3 Changelog" heading inside, changelog.md:14); (c) decide what to do with 548 historical rows ("Keep each row as written", ANMS 159 -> likely freeze old rows and start the 4-column table below, with one "ANMS v0.36 migration" row); (d) check 38 (`check-changelog-versions.py`) and check 33/42 read this file — tooling change.
**Risk:** medium. Tool checks 33/38/42 parse the file; rewriting old rows breaks the "do not rewrite" rule (changelog.md:7) — needs owner ruling.

---

## 2. Chapter structure and split

**ANMS** (109-129, 571-575): H + Ch1 Foundation, Ch2 Use Cases, Ch3 Requirements, Ch4 Architecture, Ch5 Specification, Ch6 Test, Ch7 Design Principles Compliance, Appendix (A.1 References, A.2 Licenses, A.3 Open Questions). Split when > ~100 KB as `( ( (Ch1,Ch2),Ch3 ), ( (Ch4,Ch5),Ch6 ), Ch7 )`; files `spec-ch1-3.md`, `spec-ch4-6.md`, `spec-ch7.md`; split Ch3 by UCF into `spec-ch3-ucf-001.md` + `spec-ch3-common.md`; header in first file, appendix in last file, each later file names the first file.

**GRS** (`grep -nE '^#{1,3} '` per file):

| GRS | Bytes (`sed -n 'a,bp' | wc -c`) | ANMS target |
|-----|------|------|
| 01-04 header (l.1-13) | 483 | H |
| Ch1 Foundation 1.1 Background, 1.2 Challenges, 1.3 Goals, 1.4 Approach, 1.5 Scope, 1.6 Constraints, 1.7 Limitations, 1.8 Glossary, 1.9 Notation, 1.10 Direct Manipulation Principles (l.14-438) | 52,102 | Ch1 (1.1-1.12; no 1.2 Purposes, 1.3 Analysis, 1.4 Issues in GRS; 1.10 has no ANMS slot) |
| Ch2 System Overview 2.1-2.4 (l.439-548) | 8,628 | no ANMS chapter (-> Ch4 4.1/4.2 or 1.8 Scope) |
| Ch3 Use Cases 3.1 Actors, 3.2 Use Cases (l.549-1116) | 32,626 | Ch2 (no UCF 2.2) |
| Ch4.1 FR (l.1117-9123) | **1,324,307** | Ch3 3.1 |
| Ch4.2 NFR (l.9124-9442) | 18,866 | Ch3 3.2 |
| Ch4.3 Reduction Candidates (l.9443-9463) | 7,599 | no ANMS slot |
| 05-07 Ch5 Design 5.1-5.6 (l.9-1256) | 192,447 | Ch4 4.1-4.6 (same 6 sections, same order) |
| Ch6 Software Specification 6.1, 6.2 Data Schema (l.1257-1808) | 77,007 | Ch5 |
| Ch7 Test Strategy (l.1809-1912) | 9,699 | Ch6 6.1 |
| 08-10 Ch8 Use Case Tests / Ch9 SW Spec Tests / Ch10 NFR Tests (2,993 B, empty by rule TW-1..3) | 2,993 | Ch6 6.2 (+6.3..) |
| — | — | Ch7 Design Principles Compliance: **absent** |
| A-appendix A.1 References, A.2 Licenses, A.3 Changelog (pointer) | 1,611 | A.1, A.2 OK; A.3 must become Open Questions |

File sizes (`ls -la docs/spec`): 01-04 = **1,444,611 B (~14x the 100 KB rule)**, 05-07 = 279,308 B (~2.8x), 08-10 = 2,993, A = 1,611. Plus `_assets/` tables pulled in by reference: tbl-settings 248,634; tbl-state-machines 160,018; tbl-published-entries 122,373 (each > 100 KB on its own).
File names: GRS `01-04-requirements.md` / `05-07-design.md` / `08-10-test.md` / `A-appendix.md` vs ANMS `spec-ch1-3.md` / `spec-ch4-6.md` / `spec-ch7.md` (appendix inside the last file, not a 4th file).
Ch3 split by UCF is impossible today: 0 UCF (`grep -rhoE '\bUCF-[0-9]+' docs/spec | wc -l` = 0). FR parent profile (relations parse): 85 FR have exactly one UC parent, 20 have 2+ UC parents, 18 have no UC parent (GL only) -> ~38 FR would go to `spec-ch3-common.md`.
**Work:** renumber all chapters/sections (every "Chapter n.m" cross-reference in spec, rules, tests, tools); rename 4 files (+ StrictDoc config, check.sh, impact.py, generators that hard-code names); create UCFs before Ch3 can be split; create Ch7.
**Risk:** high. Chapter numbers are cited throughout code comments/tests/tools ("Chapter 5.3" etc.); StrictDoc `DOC-*` UIDs and file names are wired into tooling. 1.32 MB FR body cannot meet ~100 KB per file even split by 15 UCs (avg ~88 KB, but uneven).

---

## 3. Chapter 1 items and IDs

**ANMS** (166-179, 33-37): BG-, PUR-, AN-, ISS-, CH-, GL-, APR-, SCP-, CST-, LM-, (glossary by key), NTN-; `PREFIX-xxx` 3 digits, fixed; Ch1 table "ID / Parent ID / Sentence"; ISS->PUR, CH->ISS, GL->CH (child holds parent). Parent never lists children (45).

**GRS** (per-section count of `^\| PREFIX-n` row starts, `sed -n 'a,bp' 01-04-requirements.md | grep -oE '^\| [A-Z]+-[0-9]+[a-z]?' | ... | uniq -c`):

| ANMS | GRS section | GRS ID | Count | Gap |
|------|-------------|--------|-------|-----|
| BG-xxx | 1.1 Background, table T-001 "現状" | PLM-1..9 | 9 | prefix differs (PLM), unpadded |
| PUR-xxx | — | none | 0 | missing section |
| AN-xxx | — | none | 0 | missing section |
| ISS-xxx | — | none | 0 | missing section |
| CH-xxx | 1.2 Challenges, table T-054 | CH-1..7 | 7 | unpadded; **parent lists children** (column "受ける目標" lists `GL-008 / GL-004` etc., 01-04:56-62); no ISS parent |
| GL-xxx | 1.3 Goals, StrictDoc GOAL | GL-001..009 | 9 | 3-digit OK; GOAL grammar has no RELATIONS -> **no CH parent** (relations parse: 9 GOAL nodes with no Parent) |
| APR-xxx | 1.4 Approach | free prose, no IDs | 0 | IDs missing; no line-count/JSON decision written |
| SCP-xxx | 1.5 Scope, table T-002 | SO-1..14 | 14 | prefix differs (SO) |
| CST-xxx | 1.6 Constraints, table T-003 | CN-1..9 | 9 | prefix differs (CN) |
| LM-xxx | 1.7 Limitations, table T-004 | LM-1..25 (incl. LM-2a, LM-2b) | 25 | prefix same; unpadded + letter suffixes |
| Glossary (key) | 1.8 Glossary T-005/T-005a + `_assets/tbl-glossary.md` | G-1..14, L-1..2 | 16 | see item 11 |
| NTN-xxx | 1.9 Notation T-006a/T-006b | W-1..11, A-1..16 | 27 | prefix differs |
| — | 1.10 Direct Manipulation Principles T-274 | PP-1..7 | 7 | no ANMS slot (Approach? Constraints?) |

Registry: `docs/spec/_source/row-id-prefixes.json` has **220 prefixes** (owner: spec 211, rules 5, records 4). Rows per prefix measured by `survey/prefix_count.py` (distinct IDs that start a table row `^| PREFIX-n |` in `docs/spec/*.md` + `docs/spec/_assets/*.md`; "mentioned" = distinct IDs anywhere with non-alnum boundaries). Totals: **3,365 row definitions**, 3,391 distinct IDs mentioned, 9 registered prefixes with 0 rows (CR, DFC, JDG, PND, GT, PW, UO, UW, WR — record/rule IDs, not spec rows), 51 prefixes with empty `words`. Full per-prefix table: `survey/prefix_counts.tsv`. Largest: S 523, UF 185, AT 160, IC 138, K 132, CM 93, RS 81, U 66, PR 44, ZN 39, CP 37, PI 37, RL 34, SK 28, FA 26, LM 25, EP 24, GA 23, IV 23, P 22 ...
Not in the registry at all: the StrictDoc node prefixes FR, NFR, UC, GL, SWS, DOC and the caption prefixes T- (239 tables) and F- (30 figures).
Padding (`survey/rowids.txt`, 3,365 unique row IDs): 2,669 have 1-2 digits, 696 have 3 digits only because the number is >= 100, 40 carry a letter suffix (e.g. LM-2a, V-11a). ANMS requires `PREFIX-001`.

**Work:** add 1.2 Purposes, 1.3 Analysis, 1.4 Issues (new content — owner/concept level); restructure 1.2 Challenges with ISS parents and move child lists off CH rows; add a CH parent to each GL (needs a grammar RELATION on GOAL); rename SO->SCP, CN->CST, PLM->BG, W/A->NTN (and every citation in spec/code/tests — CN-/SO- are cited from FRs); zero-pad 3,365 row IDs or obtain a ruling that the 3-digit rule applies only to chain items (ANMS 36 lets design/detail use unique names) — note ANMS 35 forbids renumbering, so padding is a rename of every ID.
**Risk:** very high for padding/prefix renames (memory "Renumber rewrites foreign refs"; IDs are cited in ~153 of 185 src files and 671 test files). Purposes/Analysis/Issues need the owner (concept level, ANMS 567).

---

## 4. Use cases

**ANMS** (198-286): heading `#### UC-<3d> <Verb> <object> (<PascalCase>)`; six fields intent (with `traces:`), trigger, precondition, postcondition, steps, rejection (`RJn (step m)`); marks `UC-xxx.OK` / `.RJn`; UCF-xxx sequence diagrams in 2.2; one UseCase per UC with the same PascalCase name in 4.2.

**GRS** (01-04:549-1116, Chapter 3): 15 StrictDoc `USE_CASE` nodes (`grep -c '^\*\*Type\*\*: USE_CASE'` = 15; UIDs UC-001..015, order 001..010, 014, 011, 012, 013, 015). Fields per grammar `spec.sgra`: STATEMENT (one sentence "<actor> が…、`GRS` が…こと"), SCENARIO (numbered steps; 75 step lines), EXTENSIONS (Cockburn-style `- 2a.` alternates; 48 items, mixing refusals and alternate paths), Relations Parent -> GL (16 parent links, all GL). Headings are Japanese titles only (e.g. `#### タスクを置いて期間を決める`, 01-04:614) — no UC ID, no PascalCase name. Table T-011 maps UCs to user-order items (V-1..V-14).
- trigger / precondition / postcondition fields: 0 (`sed -n '571,1116p' | grep -cE '事前条件|トリガー|事後条件|precondition|postcondition'` = 0).
- Marks: `grep -rhoE 'UC-[0-9]+\.(OK|RJ[0-9]+)' docs/spec src tests` = 0.
- UCF: 0.
- UseCase components: 9 `UseCase`-layer components (CP-8..15, CP-39; `ls src/use-case` = 9 folders: apply-document-change, edit-document, import-document, ...). None named after a UC; no 1:1 mapping.
**Work:** rewrite 15 UCs to 6 fields with English PascalCase names; convert 48 extensions into RJn rows (refusals) or move non-refusal alternates to FRs (ANMS 303); add marks; decide UCFs; then re-point 133 FR->UC parent links to marks (`UC-001.OK` etc.); 4.2 needs one UseCase per UC (15) — today 9 UseCases organised by document operation, not by UC -> architectural change or an owner ruling.
**Risk:** high (UseCase 1:1 rule conflicts with the shipped architecture; UC rewrite changes the parent of every FR).

---

## 5. Requirements

**ANMS** (288-353): table "ID / Requirement sentence / traces", FR-xxx / NFR-xxx, EARS patterns (Japanese forms in RS R1b table: `…とき、`, `…の間、`, `もし…場合、`, `…がある場合、`), strength by ending (すること / することが望ましい / してもよい / しないこと), one action per sentence, values referred by config item name, child holds parent ID in traces.

**GRS:**
- Form: StrictDoc nodes, not a table. `grep -oE '^\*\*Type\*\*: [A-Z_]+' | uniq -c` -> 01-04: FUNC_REQ **123**, NON_FUNC_REQ **13**, GOAL 9, USE_CASE 15; 05-07: SW_SPEC 8. UIDs FR-001..FR-159 (123 live; gaps are retired numbers, e.g. FR-050), NFR-001..013. Each node: heading (Japanese title), STATEMENT, often long ⭐/⚠️/⛔ notes, embedded detail tables with row IDs, ORIGIN (free text, e.g. "UC-001 手順 1 〜 2 ／ GL-008", 136 lines), RATIONALE, Relations.
- Traceability direction: **child holds parent** (StrictDoc `Relations: Parent`, 01-04:643 etc.) — matches ANMS. Parent link counts (relations parse of `**Type**: \`Parent\` / **ID**: \`X\``): FR -> UC 133, FR -> GL 40; NFR -> GL 13; UC -> GL 16; SWS -> FR 7, NFR 1; GOAL -> nothing. BUT: CH rows list child goals (T-054), and the 4.x tables list `正` (basis) per row; ORIGIN duplicates the parent in prose (two places for one link).
- EARS shape of the 136 STATEMENTs (`survey/ears.py`, Python regex over statements.json): 134 end in こと (SHALL), 85 contain `とき、` (event-driven), 5 contain `の間、`/`あいだ、` (state-driven), 1 contains `もし`, 0 contain `場合`, 23 contain RFC 2119 capitals inside the statement (e.g. "（MUST）"), 3 negative endings.
- Samples:
  - FR-001 (01-04:1130): "作成者がタスク形状を構えた状態で、どのアイテムにも当たらない場所をドラッグしたとき、`GRS` は、構えている形状でその期間のタスクを作ること（表 T-023a の PTD-4）。" -> EARS event-driven, SHALL by ending; "構えた状態で" is a While-like state folded into the When clause (ANMS: While first, separate clause). Acceptable with rewrite.
  - FR-100: "未保存の編集が残ったまま作成者がページを離れようとしたとき、`GRS` は、**離れる前に宿題の警告を出すようにすること（MUST）。**" -> event-driven; strength doubled ("こと" + "(MUST)"); "残ったまま" is a state -> should be `…の間、`.
  - NFR-003: "表 T-025 の条件 `MC-8` の区間で、`GRS` は、フレーム時間を 95 パーセンタイルで 16.7 ミリ秒以内に保つこと。" -> not an EARS keyword ("区間で" instead of `の間、`); the value 16.7 ms is written in the sentence (ANMS 302: value belongs in configuration, sentence names the item).
- The real requirement mass sits OUTSIDE the 136 statements: RFC 2119 capitals (`LC_ALL=C.UTF-8 grep -o 'MUST' | wc -l`): 01-04 **2,957 MUST / 1,007 MUST NOT** / 4 SHOULD / 3 MAY; 05-07 229 / 97 / 3 / 0; `_assets` ~65 more. Table rows with an ID and MUST: 01-04 **452**, 05-07 37 (`grep -E '^\| \`?[A-Z]{1,4}-[0-9]+[a-z]? ' | grep -c MUST`). Prose lines with MUST outside tables in 01-04: **1,607**. These are normative but have no FR/NFR ID, no EARS form, no traces column.
**Work:** convert 136 nodes into "ID / sentence / traces" tables (or keep StrictDoc and get a ruling that StrictDoc Parent == traces column); decide whether the ~450 MUST table rows and ~1,600 MUST prose lines become child FRs (each with an ID and traces), Ch5 IMPS, or 5.x configuration tables; remove "(MUST)" capitals (ANMS strength is the ending); replace ORIGIN prose with traces; NFR-003-style literal values -> configuration item names.
**Risk:** very high — this is the bulk of the 1.32 MB; a mechanical conversion would create thousands of new IDs.

---

## 6. Sentence rules (Japanese spec)

**ANMS** (17-29) / RS R1b: no など / 等 (etc.), no demonstratives (指示代名詞), subject+verb(+object), active voice only, negation only in 2 cases.

Method: `survey/sentence_rules.py` over `docs/spec/*.md` + `docs/spec/_assets/*.md`, after deleting fenced blocks, inline code spans and HTML tags. Regexes:
- nado: `など`
- tou (etc.): `等` not preceded by 同平対均上下高初劣優二一三何不 and not followed by しい価幅間号級分倍値速角比式辺 (`survey/tou.py`); raw `等` also given.
- demonstratives raw: `これ|それ|あれ|この|その|あの|こう|そう`; adjusted: drops `それぞれ`, `おそれ`, `あれば`, `向こう`-like, `ような/そう(様態)` neighbours (see script). Caveats: `その` includes `そのまま` (98 in 01-04), `そう` includes `そうする`/様態, katakana/compound words are not excluded; the count is an upper bound for true 指示代名詞 but the order of magnitude holds.
- passive: `され(る|た|て|な|ず|れば|ま)` and `られ(る|た|て|な|ず|れば|ま)`. Caveat: `られる` also counts potential forms (見られる, 変えられる — the GL titles use these), so `rareru` is an upper bound; `sareru` is closer to true passive but includes honorific/causative-passive.

| File | Bytes | など | 等(etc.) refined | 等 raw | demonstr. raw | demonstr. adj. | される系 | られる系 |
|------|------:|-----:|-----:|-----:|-----:|-----:|-----:|-----:|
| 01-04-requirements.md | 1,444,611 | 27 | 1 | 42 | 2,032 | 1,972 | 163 | 198 |
| 05-07-design.md | 279,308 | 4 | 0 | 7 | 329 | 319 | 36 | 26 |
| 08-10-test.md | 2,993 | 0 | 0 | 0 | 3 | 3 | 0 | 0 |
| A-appendix.md | 1,611 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| _assets/design-mcp-relay.md | 32,583 | 1 | 0 | 0 | 30 | 29 | 2 | 6 |
| _assets/fig-erd-detail.md | 55,379 | 0 | 0 | 0 | 43 | 40 | 2 | 0 |
| _assets/fig-erd-overview.md | 2,816 | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| _assets/tbl-agent-api-members.md | 46,997 | 4 | 0 | 0 | 31 | 31 | 2 | 1 |
| _assets/tbl-document-commands.md | 36,768 | 1 | 0 | 0 | 21 | 21 | 0 | 0 |
| _assets/tbl-glossary.md | 69,980 | 1 | 0 | 0 | 45 | 45 | 7 | 1 |
| _assets/tbl-notice-reasons.md | 23,304 | 2 | 0 | 0 | 34 | 34 | 9 | 5 |
| _assets/tbl-property-items.md | 16,431 | 0 | 0 | 0 | 17 | 17 | 0 | 1 |
| _assets/tbl-published-entries.md | 122,373 | 0 | 0 | 1 | 105 | 100 | 15 | 7 |
| _assets/tbl-row-id-prefixes.md | 27,953 | 1 | 0 | 0 | 23 | 23 | 6 | 2 |
| _assets/tbl-settings.md | 248,634 | 1 | 1(*) | 8 | 184 | 176 | 5 | 13 |
| _assets/tbl-state-machines.md | 160,018 | 0 | 0 | 3 | 233 | 232 | 4 | 8 |
| _assets/tbl-verification.md | 2,641 | 0 | 0 | 0 | 2 | 2 | 0 | 0 |
| **Total** | | **42** | **2 (1 true)** | 61 | **3,133** | **3,045** | **252** | **268** |

(*) The tbl-settings hit is 等方 (isotropic) — false positive; the only true 等 = etc. is 01-04 "共有フォルダ・メール等". Most raw 等 are 等倍/等値.
01-04 demonstrative breakdown (`survey/demo_break.out`): その 1,429 (そのまま 98), この 246, それ 199 (それぞれ 35), これ 83, そう 38, あれ 28 (あれば 23), こう 7, あの 2.
Generated `_assets/tbl-*.md` text comes from `_source/*.json` — fixes there, not in the md.
**Work:** など 42 + 等 1 = ~43 mechanical fixes; demonstratives ~3,000 need sentence-by-sentence rewrites (not regex-safe); passive ~250-470 candidates to review.
**Risk:** low per edit, high in volume; the demonstrative rule is the costliest sentence rule.

---

## 7. Undecided points / open questions

**ANMS** (97-105, A.3 552; RS A.3): Appendix A.3 table "ID / Undecided point / Places searched / Decider / Provisional handling / Tests to fix on reversal", `OPQ-xxx`; inline `(provisional: OPQ-xxx)` / `(undecided: OPQ-xxx)` (`（仮: OPQ-xxx）` / `（未決: OPQ-xxx）` in ja); code `// Provisional: OPQ-xxx` / `// Unimplemented: OPQ-xxx`; delete the row once answered.

**GRS** (`cat docs/spec/*.md | grep -cE "<pat>"` = matching lines; src/tests via `grep -rc`):

| Marker | spec md | _assets md | src | tests |
|--------|--:|--:|--:|--:|
| OPQ- | 0 | 0 | 0 | 0 |
| 未決 | 1 | 0 | 0 | 1 |
| （仮 | 0 | 0 | 0 | 0 |
| 仮の | 9 | 4 | 0 | 4 |
| 暫定 | 1 | 1 | 0 | 0 |
| 未定 | 25 | 10 | 0 | 22 (mostly the domain word 再開日未定, not undecided points) |
| STOP | 0 | 0 | 39 | 100 |
| @provisional | 0 | 0 | 10 | 1 |
| PND-n | 0 | 4 | 19 | 74 |
| `^> 未記入` | 0 | 0 | 0 | 0 (01-04:10-11 still describes the convention) |
| TBD / TODO | 0 | 0 | 0 | 0 |

OPQ-like list exists **outside the spec**: `docs/development-records/pending-decisions.md` (536,673 B). Columns: `PND / 何が未決か / 推奨と根拠 / 分類 / 波 / 触る行 ID / 覆したとき落ちる試験 / 状態`. Rows `grep -cE '^\| PND-[0-9]+'` = **356**: 状態 裁定済 **327**, 未裁定 **29**. Classes A-C (proceed with recommendation, mark `// @provisional PND-n`) / D-H (stop) map almost 1:1 to ANMS's "decide provisionally" vs "stop" rule. Unique `@provisional PND-n` in src+tests: 10. Settings defaults without provenance are flagged with a 🔎 convention (`_assets/tbl-settings.md:42-50`, section "由来の無い既定値").
Gaps: list is not in Appendix A.3; missing columns "Places searched" and "Decider"; answered rows are kept (ANMS deletes them and records the answer in the changelog); no inline marks in the spec; code mark wording differs (`@provisional PND-n` vs `// Provisional: OPQ-xxx`).
**Work:** move the 29 open rows into A.3 as OPQ-001..029 (+2 columns), leave the 327 ruled rows as history outside the spec, add inline `（仮: OPQ-xxx）` marks at the affected spec rows (the "触る行 ID" column names them), rewrite ~10 code marks; update rule 06.
**Risk:** low-medium (well-contained; the list already has the hard columns).

---

## 8. Ch4 (GRS Ch5) and Ch5 (GRS Ch6)

**ANMS** 4.2: table of diagram elements "name / responsibility / public interface / traces"; 4.4: "name / responsibility / traces"; 4.5 `traces:` under each diagram heading; 4.6 ADR-xxx with ADR-000 (minimum config) and decision maker; Ch5: implementation specs in "ID / Implementation Specification / traces" tables, `IMPS-xxx`, EARS sentences with a design element as subject.

**GRS:**
- 5.2 Components: table T-062 `| 行 ID | 層 | コンポーネント | 責務 | 正 |` (05-07:105), **37 rows** CP-1..39 (`grep -cE '^\| CP-[0-9]+'`). "正" works as traces (FR/table IDs) — OK in substance. Public interface is a separate generated table T-064 in `_assets/tbl-published-entries.md:15` (from `_source/published-entries.json`); components.json has 37 nodes `{name, shape, description, remark}` and 148 edges. Gap: no single table with all four columns; IDs CP-n are not needed by ANMS (name is the ID).
- 5.6 Decisions: ADR-000 (05-07:1023, "最小構成との比較", Context/Decision/Status/Consequences, table T-070 MN-1..9), ADR-001 (1052), ADR-002 (1077). Nygard form present. Missing: **decision maker** (`grep '決定者|決めた人'` = 0) and alternatives.
- Tables with a `正` (basis) column: 11 of 36 `| 行 ID |` headers in 05-07; 0 of 153 in 01-04.
- Ch6 6.1: 8 `SW_SPEC` nodes SWS-1..SWS-8 (05-07:1481-1601, unpadded), each with Parent FR (7) or NFR (1); plus tables T-297, T-220, T-221, T-222, T-228, T-231, T-232. 6.2 Data Schema points to `_source/erd.json` + generated ERD; JSON Schemas exist (`grs-document.schema.json`, `grs-commands.schema.json`, `*.schema.json` per manuscript) — ANMS-conformant in kind, but `traces: <ID>` at the end of `description` is not used.
- 4.5 Behavior diagrams: no `traces:` lines (`grep -c 'traces:' docs/spec/*.md` = 0 in all 4 files).
**Work:** merge T-062 + T-064 into a 4-column view (or generate it from components.json + published-entries.json); add decision maker to 3 ADRs; rename SWS-n -> IMPS-xxx and convert node to table form; add traces to the 25 detail tables without `正`; add `traces:` under 4.5 diagrams.
**Risk:** medium; IMPS rename touches 8 IDs cited by tests (`tests/integration`, `tests/system` use SWS parents per T-218).

---

## 9. Tests

**ANMS** (431-498, RS R6): 6.1 test matrix + verification method table (requirement ID / method / verifier) + test-record location; 6.2 Gherkin scenarios `SCN-xxx`, one tag `@UC-xxx.OK|RJn`, optional `@FR-xxx`, `@manual`; `.feature` generated from 6.2; `// Spec: <ID>` in each test.

**GRS:**
- 08-10-test.md is a shell by rule: "本書は試験のノードを持たない" (08-10:9-10); Ch8/9/10 hold no case nodes; TW-1..3 (table T-219, 05-07:93-99) say the cases are the test files.
- Strategy and verification: `_assets/tbl-verification.md` generated from `_source/verification.json`: T-334 VT-1..3 (what is verified: all UCs, all STM regions, perf gate rows) and T-218 TS-1..6 (levels/places/tools: use-case Playwright, integration Vitest, system Playwright, nfr Playwright, contract Vitest, unit Vitest). Milestones T-042, measures T-043 (05-07 Chapter 7). No requirement-ID / verification-method / verifier table.
- Test inventory: `docs/development-records/test-inventory.md` (generated by `tools/generate_test_inventory.py`): 796 test files, 11,147 case sites; contract 474, unit 197, system 105, use-case 14, integration 3, nfr 3. Unnamed by any test: FR-010, FR-040, FR-079, FR-081, FR-150; NFR-005/006/008/012; UC-015.
- `find tests -name '*.ts'` per dir: contract 516, unit 208, system 111, use-case 15, fixtures 9, integration 3, nfr 3.
- Gherkin: 0 (`git ls-files '*.feature'` = 0; ```` ```gherkin ```` blocks = 0; GIVEN/WHEN/THEN fields defined in `spec.sgra` USE_CASE_TEST etc. but 0 used). `SCN-` = 0. `@manual` = 0 files (`git grep -l '@manual'`). `// Spec:` comments = 0 in src and tests. Code cites IDs as `// see FR-073`, test titles cite `UC-001 ... (FR-001 TC-6 ...)`; 153 of 185 src files and 671 test files mention FR/NFR/UC/SWS IDs.
- Test record: none as a file; TEST_RESULT grammar element (PASS/CONDITIONAL/FAIL/SKIP) is defined but unused; results = output of gate run GT-2 (T-219 TW-1). ANMS wants Cucumber values (passed/failed/...) and a record file.
**Work:** write 6.2 Gherkin for every mark (15 UCs x (1 + RJn) — after item 4); decide `@manual` set (owner); add verification-method table for FRs with no automated test; add test-record location; convert `// see FR-n` -> `// Spec: FR-n` at implementing functions (185 src files) and in tests (~670 files).
**Risk:** high in volume; Gherkin source must be authored, not converted (14 Playwright UC tests exist but are TS, not Gherkin).

---

## 10. Ch7 Design Principles Compliance

**ANMS** (500-544): 34-row table Category / Identifier / Full Name / Review Perspective / Verdict (PASS/FAIL/NA) / Evidence; reviewer fills at each review.
**GRS:** no such chapter in the spec. GRS rule explicitly deleted it: `docs/development-rules/08-spec-template/spec-writing-rules.md:1496` ("Design Principles Compliance の章を削除する" — compliance is a review perspective, keep the catalog in the review standard). Catalog lives in `docs/development-rules/07-review-standards.md:651+` ("設計原則の索引", columns カテゴリ/識別名/正式名称/確認観点 — no Verdict, no Evidence). Verdict values used: none in spec; StrictDoc TEST_RESULT uses PASS/CONDITIONAL/FAIL/SKIP (unused). GRS Ch7 number is taken by Test Strategy.
**Work:** a ruling that reverses spec-writing-rules:1496, then add Ch7 with the 34 ANMS rows and first verdicts.
**Risk:** policy conflict — owner must rule; content work itself is moderate (34 rows, but every FAIL becomes a finding).

---

## 11. Glossary

**ANMS** (80-85, 1.11 178): glossary JSON `terms[]` with `key` (camelCase English, unique, no numeric ID), `label` {en, ja}, `definition` {en, ja}, optional `avoid`, `renames[] {from, version, reason, basis}`; table Key / Term / Definition / Wordings to Avoid / Rename History; English master; a person checks the names.
**GRS:**
- `docs/spec/_assets/tbl-glossary.md` (69,980 B) is **hand-written** and declares itself the source of truth (l.7). Tables: T-101 data words, T-102 properties, T-103 UI parts, T-104 setting keys, T-106 value words, T-105 non-literal exceptions, T-109 icons. Columns are names only: `行 ID / 確定名（英） / 日本語` (T-101/102/103), `行 ID / 群 / 確定名（英） / 日本語` (T-104), `行 ID / ことば / 意味` (T-106), T-109 = icon entry table. **No definition column** for T-101..T-104, no avoid, no rename history. Rows with an ID: 382 (IC 138, K 132, U 66, P 22, N 15, X 5, VK 4).
- Glossary JSON in `docs/spec/_source`: **none** (`grep -l '"terms"' docs/spec/_source/*.json` hits only `state-machines.json`, where `guardLanguage.terms` is unrelated).
- Draft: `studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json` (718,319 B) + `glossary.schema.json` ("DRAFT FOR CR-857 ... English is the primary text", JDG-3422). Shape: `groups[]` (10) nesting `terms[]`/`children[]`. Recursive count: **1,511 term objects**; keys key 1,511, definition 1,511 (all {en,ja}), uses 1,511, label 447 ({en,ja}; 1,064 terms rely on key as label), rowId 517, owner 387, since 306, tags 187, children 146, avoid 14. **No `renames[]`** key. Keys: 1,307 camelCase, 204 PascalCase/acronym (e.g. `Naming`, `NDD`, `SSOT` — ANMS wants camelCase); 1,412 unique of 1,511 (keys repeat across groups — ANMS requires unique).
- Person-checked record: BGQA2 sheet `studies/76-.../terms/goodrelax-qa-b2-glossary.md` and `13-glossary-settled.md` (113 settled words, JDG-3513/3516); no per-term check field in the JSON.
**Work:** land CR-857 (move glossary.json to `_source`, generate tbl-glossary.md from it); add renames[] (empty or seeded from rulings), flatten or justify groups, make keys unique and camelCase (204 keys), add en-master labels.
**Risk:** medium; work is in flight under the glossary seat; owner ruling 2026-11-22 limits the seat to names.

---

## 12. Machine-readable sources vs ANMS key lists

**ID registry** — ANMS (86-88): `prefixes[] {prefix, standsFor, meaning, section}`, no optional keys.
GRS `_source/row-id-prefixes.json`: top keys `$comment, collisions_suppressed, prefixes`; 220 entries with keys prefix 220, words 220 (51 empty), owner 220 (spec/rules/records), means 220 (**{ja} only**, 0 `en`), mirrored_in 8. Diff: same 1 (prefix); renamed 2 (words->standsFor, means->meaning); missing 1 (section); extra 2 (owner, mirrored_in — snake_case) + top-level `collisions_suppressed` (snake_case). Missing prefixes: FR, NFR, UC, GL, SWS, DOC, T, F. Contains non-spec prefixes (CR, DFC, JDG, PND, GT, PW, UO, UW, WR).

**State transition table** — ANMS (89-95): `stateMachines[] {name, states: [string], transitions: [{source, target, trigger, guard?, effect?}], unhandled?: [{source, trigger, handling: ignore|error}]}`, `initial` pseudostate as `source`.
GRS `_source/state-machines.json` (209,692 B): top `$schema, $comment, priorities, guardLanguage, regions`; 9 regions {region, name{ja}, unit, typeStem, table, figure, root, events, guards, machines, holds, column}; **31 machines** (all named `*StateMachine` — OK), **92 states**, **265 event x source cells**.
- machine keys name/states/transitions: names match, shapes differ.
- states: objects `{key, parent, initial: bool, carries, evidence, entry?, exit?}` vs string array; initial is a flag, not an `initial` pseudostate transition; hierarchical keys `armed.taskShapeArmed`.
- transitions: nested map `event -> sourceState -> {to, guard[{name}], effect, effectArgument, evidence, note{ja}}` (or a list of such for guarded alternatives, 39 cells) vs flat array. Renamed 2 (to->target, event map key->trigger, source map key->source: 3 structural), extra 4 (evidence, note, effectArgument, carries) + region wrapper, guard is an array of objects vs a value.
- `unhandled` / `ignore` / `handling` occurrences: 0 -> unhandled pairs are implicit.
- ja-only text objects: 390.
Count of differing machine-level keys: 0 renamed at top of machine, but every child structure differs; key-level diff ~12 (states 6 extra keys, transitions 3 renamed + 4 extra, unhandled missing).

**Language text** — ANMS (70): `{ "en": ..., "ja": ... }`, `en` always present, English master.
Text objects whose keys are a subset of {en, ja}, per `_source/*.json` (recursive walk): ja-only total ≈ **3,424** (settings 1,215, published-entries 539, state-machines 390, erd 266, document-commands 261, notice-reasons 216, row-id-prefixes 220, agent-api-members 203, property-items 88, verification 22, schemas 4); {en,ja} ≈ 1,300 (display-words **1,103**, document-commands 93, agent-api-members 67, erd 19, schemas ~17); en-only ≈ 44. `display-words.json` (the UI text) is fully {ja, en} (1,103) — conforms in shape; which language is master is not stated in its `$comment` (ja listed first).
camelCase: almost all keys camelCase; snake_case keys found: settings.json 21, erd.json 27, erd.schema.json 12, row-id-prefixes.json 9, components.json 3, overview.json 3, fig-mcp-relay.json 3, settings.schema.json 2, source-relations.json 1 (method: regex `[a-z0-9]+(_[a-z0-9]+)+` on every dict key, `$`-keys excluded; data-valued map keys such as event names are included).
**Work:** reshape state-machines.json (or add a generated ANMS-shaped export + unhandled[]); rename 2 registry keys, add `section`, add `en` to 220 meanings; add `en` to ~3,400 text objects (translation work) and declare English master; fix ~80 snake_case keys.
**Risk:** high for STM (generators `state_machines_json_to_md.py`, `state_machine_figures.py`, contract tests VT-2 for 9 regions, and src typeStems read this shape). English-master flip is a large translation job.

---

## 13. Product code size

**ANMS** (74, RS A.6): glossary, ID registry and STM JSON are REQUIRED when product code (excluding tests, comments, blank lines, generated code) is likely > 10,000 lines; write the estimate and the choice in 1.7.
Method: `python -I survey/sloc.py <worktree>` — all `src/**/*.ts` except `*.test.ts` (none exist in src); line comments `//` and block comments `/* */` stripped with a small scanner that skips string and template literals (template `${}` nesting not tracked); lines between `// <generated -- do not edit by hand>` and `// </generated>` (73 regions) counted as generated; 19 `.json` files under src not counted.
Result: 185 files, 77,488 physical lines (`find src -name '*.ts' -exec cat {} + | wc -l` = 77,488), blank 6,805, comment-only 9,638, generated 8,762, **code 52,283**.
Verdict: 52,283 >> 10,000 -> the glossary JSON, ID registry JSON and STM JSON are **required** (not just recommended), and the JSON key lists of item 12 apply. GRS has no estimate line in 1.4 Approach (ANMS 1.7) today.

---

## Commands index (all run from the worktree root unless noted)
- headings: `grep -nE '^#{1,3} ' docs/spec/<file> | tr -d '\r'`
- node types: `grep -oE '^\*\*Type\*\*: [A-Z_]+' <file> | sort | uniq -c`; UID prefixes: `grep -hoE '^\*\*UID\*\*: [A-Z]+-' docs/spec/*.md | sort | uniq -c`
- relations / ORIGIN / statements: `python -I survey/relations.py <root> survey/statements.json`
- prefixes: `python -I survey/prefix_count.py <root> > survey/prefix_counts.tsv`
- sentence rules: `python -I survey/sentence_rules.py <root> survey/sentence_rules.tsv`; `survey/tou.py`, `survey/demo_break.py`
- changelog: `grep -cE '^\| [0-9]+\.[0-9]+ \|' docs/development-records/changelog.md` and `'^\| [0-9]{8}T[0-9]{6}Z \|'`
- pending: `grep -E '^\| PND-[0-9]+' docs/development-records/pending-decisions.md | awk -F'|' '{print $(NF-1)}' | sort | uniq -c`
- RFC 2119: `LC_ALL=C.UTF-8; grep -o 'MUST' <file> | wc -l`, `grep -o 'MUST NOT'`
- tests: `git ls-files '*.feature' | wc -l`; `git grep -l '@manual'`; `grep -rhoE '//\s*Spec:' src tests | wc -l`
- STM / registry / glossary / language objects: inline `python -I -c` JSON walks shown in the session (keys counted with collections.Counter).
- SLOC: `python -I survey/sloc.py <root>`
