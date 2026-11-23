# GRS rules and checks vs the NDD review standard of 2026-11-23 (C1..C10)

Surveyor: read-only. Worktree `interesting-bassi-de388c`, HEAD `f043c7356`. No repo file edited, no check.sh run.
New standard = `gr-sw-maker-qa/confirmed-2026-11-23/review-standards-{ja,en}-20261123T131438Z.md` (1210 lines each, `wc -l`).
All paths below are relative to the GRS worktree root unless they start with `gr-sw-maker`.
Old rule-07 item numbers are written as `old-no` in this copy (check 91 forbids new references to them); 07's old-number table and check 91's baseline list them.
Helper output: `heading-diff.txt` (same folder as this file) = full heading/checklist diff of 07 vs new ja.

---

## Index by change

| C | Rules that change | Checks that change |
|---|---|---|
| C1 verdict/disposition | 07:560-568, 07:572 (X5), 05:460-558, defects.md columns, spec-writing-rules 290-292 | new: review report / RVF form; registry gets RVF |
| C2 severity Medium for 2 form rows | 07 (no severity section today) | — |
| C3 new MUST rows | 07 NDD chapter + R1/R3/R6 rows; 06 whole; 03 §3; comment-rules-src §3; 05:332-348, 444 | 25, 55, 41 (precheck), registry (OPQ) |
| C4 SHOULD→MUST | 07 R1 negation split, R6 Gherkin; spec-writing-rules 1474 | (EARS also flips vs 07: SHOULD→MUST) |
| C5 headings/sections | 07: 8 headings, 設計原則の索引 651-696, レビュー指摘 560-568; 17 old-number rows | 92 (+TSV) |
| C6 traceability | 07 R1b/R6; 04 UO; X4 (JDG/DFC/CR as parents) | 39, 44, 65; new ID-gap check |
| C7 comment kinds | 03:290-331; comment-rules-src.md | 55 (BUDGET/HEADS/SEE/TAG regexes) |
| C8 glossary + JSON | 07 NDD; tbl-glossary.md; row-id-prefixes.json; state-machines.json | new glossary/registry key checks |
| C9 template independence | 07 preface 3-5, 設計原則の索引 (Chapter 1.8/5.1/Ch5.6), R1/R2/R7 headings | 92 |
| C10 63/27→74/25 | 07 checklist 70 (48/22) → 99 (74/25) | 92 TSV 70 → 99 pairs |

---

## 0. Baseline facts

| Fact | Number | Command |
|---|---|---|
| 07 length | 760 lines | `wc -l docs/development-rules/07-review-standards.md` |
| 07 checklist rows | 70 = MUST 48 / SHOULD 22 | `awk 'NR>=570&&NR<=650' 07 \| grep '^\| ' \| awk -F'\|' '{print $4}' \| sort \| uniq -c` |
| New checklist rows (section 904-1023 only) | 99 = MUST 74 / SHOULD 25 (NDD 10 + R1-R8 89) | same awk on new ja lines 904-1022 |
| gr-sw-maker `main` master today | 4 commits past GRS's `63e6fdc`: caa9805 (11-05 NDD+NEIM), 7b14c40, 0db4e95, 51958f0 (11-08); its checklist greps 62 MUST / 27 SHOULD (notice says 63/27) | `git -C gr-sw-maker log --oneline 63e6fdc..main -- process-rules/review-standards-ja.md`; `git show main:... \| grep -E '^\| (NDD\|R[0-9]) \|'` |
| ⇒ GRS is ALREADY behind the current main (NDD chapter, comment rules) — check 92 cannot see it (by design: "whether the master changed since the last refresh") | | |
| 07 headings compared by check 92 | 40 (TSV) vs 42 in new ja | `cut -f1 review-standards-master-names.tsv \| sort \| uniq -c` |
| Headings only in 07 / only in new | 8 / 10 | heading-diff.txt |
| Checklist pairs only in 07 / only in new | 22 / 60 (60 counted on whole file incl. 9 rows of the "構成" table; 51 inside the checklist section) | heading-diff.txt |
| Level changed, same name | 2: R1 EARS SHOULD→MUST, R6 Gherkin SHOULD→MUST | heading-diff.txt |
| Product code size | ~60,005 non-blank non-comment lines in src/*.ts (77,488 raw) ⇒ >10,000 ⇒ C8 JSON MUSTs apply | `find src -name '*.ts' \| xargs grep -vhE '^\s*($\|//\|/\*\|\*)' \| wc -l` |

---

## 1. 07-review-standards.md (760 lines) — section map and what changes

| 07 lines | Section | GRS-only? | Change needed (C#) |
|---|---|---|---|
| 1-9 | Preface; line 5 names master `63e6fdc` and lists GRS additions | | Re-point to new master/commit; line 3 "process-rules §9.2 / review-agent" is stale framework text (C9) |
| — | (absent) NDD chapter = new 56-131 (76 lines) | | ADD whole chapter: NEIM, OKPN/OMPV (move from R2), glossary, machine-readable sources, diagrams/tables, name choice, renaming, behaviour the spec does not decide (C3, C8) |
| 10 | `## R1 ...（仕様書 Ch1-4 対象）` | | rename heading (C5) |
| 12-72 | R1a/R1b | | add R1c Use Case Quality (new 234-267); R1b gets "要求の書き方", "文の決まり", 受動態/否定形 split, traceability rewrite (C3, C4, C6) |
| 73 | `## R2 ...（仕様書 Ch5-6・コード対象）` | | rename (C5) |
| 75 | `### Naming（命名）— 名は体を表す` | | rename to `— 設計とコードの命名規約` |
| 144 | `### その他の設計原則` | | → `ほかの設計原則` (C5) |
| 153-154 | "GRS での手順" (DRY 1か所 / 公開面) | GRS-only | keep (inside body; check 92 does not compare bodies) |
| 250-294 | R3 | | ADD `### コメント` (new 497-543, 47 lines) (C7) |
| 328, 344 | `### グリッジ`, `### 状態機械` | | → `グリッチ`, `ステートマシン（STM: State Machine）` + 7 `####` subsections (new 595-707) |
| 405 | `## R6 ...（テストコード対象）` | | → `（仕様書のテスト・テストコード・テスト記録が対象）`; body adds leaf-requirement test, `@manual`, test record, Gherkin MUST (C3, C4, C6) |
| 421 | `## R7 ...（仕様書 Ch5-6・コード対象）` | | rename (C5); `@purity` body already on 4 new values (10 hits of `semi-pure-immutable`, `grep -c`) |
| 521 | "GRS での機械: 検査 93" | GRS-only | keep |
| 525-559 | `## ⛔ レビュー文書の行 ID は、既存の接頭辞を使ってはならない` (35 lines) | GRS-only | keep; RVF and OPQ must be registered (see §4) |
| 560-568 | `## レビュー指摘の扱い` (9 lines): findings go to `defects.md` ledger, "重大度・対応・閉じ方は台帳のステータス（未検討〜実測済）" | GRS-only replacement of master's 「レビュー指摘対応ルール」 | REWRITE for C1/C2: master now has `## 重大度` (885-903) + 付録 A.1 (1028-1061) that GRS has no equivalent of |
| 570-650 | Checklist preamble 572: "MUST 項目を意図的に見送る場合は、Remark に理由" | | CONTRADICTS C1 (NA = not applicable only; broken = FAIL even with reason). Rows 70 → 99 |
| 651-696 | `## 設計原則の索引` (46 lines) | (was master) | REMOVE / merge into checklist (C5). Its lines name "Chapter 1.8", "Chapter 5.1", "Ch5.6 の ADR-000" (C9) |
| 697-760 | `## 旧番号の対応表（GRS）` 58 rows | GRS-only | keep; 17 of 58 rows point at a pair the new checklist renames (`old-no`, `old-no`, `old-no`, `old-no`, `old-no`, `old-no`, `old-no`, `old-no`, `old-no`-4.4, `old-no`, `old-no`, `old-no`, `old-no`, `old-no`) → check 92 item 4 goes red until re-pointed |
| — | (absent) 付録 A (A.1-A.6, ~170 lines), 付録 B | | ADD or reference: A.1 findings, A.2 renaming, A.3 open questions, A.6 machine-readable sources/JSON keys |

### How GRS records findings today (C1)

| Word / ID | Count | Command |
|---|---|---|
| `WAIVED` in rules / records | 0 / 0 | `grep -rc -e WAIVED docs/development-rules docs/development-records` |
| `据置` rules / records | 0 / 5 (changelog 1, fixed-defects 2, rulings 2) | same with 据置 |
| `受容` rules / records | 0 / 0 | same |
| `RVF-` anywhere in rules/records | 0 | same |
| `Verdict` in rules | 2 (07 only); `PASS/FAIL/NA` 1 (07:572) | same |
| `重大度` in rules | 1 (07:563, says the ledger status carries it) | `grep -rn 重大度 docs/development-rules` |
| DFC rows open / done | 868 in defects.md, 663 in fixed-defects.md | `grep -c '^\| DFC-' ...` |
| Ledger columns | `ID / 不具合内容 / 期待値 / 対応案 / 対応方針・決定仕様 / ステータス / 詳細状況 / 補足 / 実物確認` (defects.md:77) — NO severity, NO disposition, NO due date, NO approver | `grep -n '^\| ID' defects.md` |
| Statuses (8) | 未検討 10, 裁定待ち 25, 仕様待ち 76, 実装待ち 59, 試験待ち 2, 実測待ち 570, 実測済 679, 取下げ 110 (ledger_metrics block, 2026-11-23 11:38) | defects.md lines ~20-25 |
| Review reports with a Verdict table in docs/review/ | 0 found with a PASS/FAIL/NA column; 1 file has `\| NA \|` cells (preimplementation-review-2026-08-15.md: 2) | `grep -rc -E '\| (NA\|N/A) \|' docs/review` |
| spec-writing-rules.md:290-292 says findings live in `project-records/reviews/` | that folder does not exist in GRS — already inconsistent with 07:562 | `grep -n レビュー指摘 08-spec-template/spec-writing-rules.md` |

⇒ C1 needs: RVF-xxx IDs (new prefix), severity (Critical/High/Medium/Low), disposition fixed/deferred(+due)/accepted(+approver for High), Status, report columns "ID / Severity / Checklist row / Location / Content / Disposition / Status", carry-over of RVF in Remark. GRS has none of these columns. Decide: new review-finding ledger, or add columns to defects.md (868+663 rows; tools/ledger_metrics.py, checks 28/29/31/40 read it).

---

## 2. Other rule files

| File:lines (count) | Content today | Conflict / rewrite (C#) |
|---|---|---|
| 01-standing-rules.md:8 (1) | ② "レビュー観点の規約を満たすこと"; names old numbers `old-no` `old-no` `old-no` `old-no` | Re-point names (C5); old numbers tracked by check 91 |
| 02-changing-the-spec.md:46 (1) | cites `old-no` | old number (check 91) |
| 03-implementation.md:4 (1) | "07 にあり、条項番号で引く" | stale (numbers abolished 2026-10-24) |
| 03:290-331 (42) §3 comments | "なぜ" only; forms = `// see`, `// TRAP:`, `// WHY:`, `// STOP:`, `// DEVIATION:`; line 293 cites `old-no`; line 304 example `// STOP:` + `@provisional` | REWRITE for C7: kinds Why/Spec/Summary/Temporary/Unimplemented/Provisional; TRAP/DEVIATION/STEP/header tags must be declared as project kinds |
| 03:319-331 (13) §「印の使い分け」 ⛔⚠️⭐ | emoji marks in docs | not touched by C1-C10; but the word 「印」 now also means `（仮: OPQ-xxx）`/`（未決: OPQ-xxx）` in the standard (A.3「印」) — name clash (OKPN) |
| 03:342-359 (18) §4 table | 9 rows pointing at `old-no` `old-no` `old-no` `old-no` `old-no` `old-no` `old-no` `old-no` `old-no` `old-no` | re-point to names (C5); check 91 |
| docs/review/comment-rules-src.md (75 lines) — the real comment rule (rulings 17/18) | §3 forms table lines 28-54; STOP+`@provisional PND-n` for class A-C, `STOP ... (PND-n)` for D-H; §2 10% density | REWRITE for C7/C3. `@seam` is allowed by check 55 (8 uses in src) but not listed in §3 |
| 04-verification.md:105 (UO-1 cites `old-no`), 3 PND refs (359, 560) | | old number; R6 `@manual`/test-record/Gherkin have no GRS rule (0 `.feature` files: `git ls-files '*.feature' \| wc -l` = 0; `@manual` 0) (C3, C4) |
| 05-working-method.md:96 (`old-no`), 394/400 (`old-no`, `old-no`), 726 (`old-no`) | old numbers | re-point |
| 05:332-348 (17) | STOP comments as evidence | rename to Unimplemented/Provisional (C3) |
| 05:444 (1) | "`// @provisional PD-n` の印" | stale prefix PD- (already retired, check 51) AND old form (C3) |
| 05:460-465, 509-558 (~55) | "不具合は台帳で追う", ledger bundles | must host RVF/severity/disposition or point to a new place (C1) |
| 06-pending-decisions.md (250 lines, whole file) | PND-n list in docs/development-records/pending-decisions.md (356 rows: `grep -c '^\| PND-'`), classes A-H by reversal cost, `@provisional PND-n` mark, waves, 未裁定/裁定済 | C3: standard wants OPQ-xxx list IN THE SPEC APPENDIX with columns "ID / 決まっていないこと / 探した所 / 決める人 / 仮の扱い / 覆したときに直すテスト", marks in spec text and `// Unimplemented:`/`// Provisional:` in code/tests. Sections: §0.2-0.3 29-50 (line 45 mark), §2 92-156 (A-H classes ≈ stop vs provisional), §3 157-175 (line 164 example), §6 219-240 (check 25). 06:26 and 06:59 refer to 07's checklist / R1-R8 (keep, re-point) |
| 09-tools.md:105 (check 25 row), 129 (check 55 row), 381 (check 92 row), 390-398 (check 92 refresh steps, 9 lines) | | update rows; refresh procedure assumes the master is on gr-sw-maker `main` |
| README.md:20 ("R1〜R7", 52KB), 29-47 (07 reading index, R1-R8 table), 91 (`old-no`,`old-no`) | | add NDD row, Severity/Appendix pointers, re-point numbers |
| 08-spec-template/spec-writing-rules.md (1517 lines): 290-292, 877 (`old-no`), 923-924 (`old-no`,`old-no`), 1304, 1468, 1474 (`old-no` passive/negation), 1496 (Design Principles Compliance chapter dropped) | | old numbers; 1474 must point at the two split rows (受動態の排除 / 否定形の扱い) (C4); 290-292 path does not exist |
| 08-spec-template/spec-template.md:58 `### 1.7 Limitations (制限事項)` | exists | supports C6 (unbuilt MAY/SHOULD excluded via limitations) — no change |

Old-number reference totals: `grep -cE 'R[1-8]\.[0-9]'` → 01:1, 02:1, 03:10, 04:1, 05:4, 07:59 (table), 09:1, README:2, spec-writing-rules:4. Repo-wide check 91 baseline = 2788 refs in 625 files (`awk -F'\t' 'NR>1{s+=$2}END{print s,NR-1}' old-review-numbers-baseline.txt`).

---

## 3. Checks (.claude/skills/spec-graph-check, numbers from check.sh `section "NN ..."`)

| Check | Script (lines, `wc -l`) | Checks now | Must change | Baseline |
|---|---|---|---|---|
| 92 | check-review-standards-master.py (231) + review-standards-master-names.tsv (114 lines: 2 commit, 40 heading, 70 pair) | 07's `## R<n>`/`###` headings, checklist (chapter, perspective) pairs, master commit, old-number table rows vs TSV | (a) `CHECKLIST_ROW = ^\| (R\d) \|` misses the 10 `\| NDD \|` rows; (b) `checklist_pairs` scans the WHOLE file, so on the new master `--refresh` would also take the 9 rows of the intro "構成" table (NDD, R1..R8) → must scope to the `## 総合レビューチェックリスト` section; (c) `chapter_headings` only takes `## R<n>` → NDD chapter, 重大度, 付録 A not compared (decide); (d) `--refresh` does `git show <rev>:process-rules/review-standards-ja.md` — the confirmed version is NOT on main yet (only in gr-sw-maker-qa with timestamped names) → needs a file-path option or wait; (e) self-test fixture uses only `\| R1 \|`; (f) TSV becomes ~42 headings / 99 pairs; (g) 17 old-number rows re-point | 0 |
| 55 | check-comment-rules.py (1236) | src/ + tests/ comments: ASCII, allowed forms, 10% density; `BUDGET = {'see':1,'TRAP':2,'WHY':2,'STOP':3,'DEVIATION':2}` (line 220), `HEADS` 221-222, `SEE` regex 249, `TAG_ANYWHERE` 253 (`@provisional PND-n`, `@seam`, `@purity`), `TAG_HEADER` 255, PND ledger parse 265-274 | add kinds Why/Spec/Summary/Temporary/Unimplemented/Provisional/Section/Consistency; lint list of new 525-533 (Summary ≤3 sentences & Temporary if ≥2; Temporary has `Until:`; Unimplemented/Provisional ID exists in OPQ list; no OPQ mark left after the row is gone; Spec ID exists); decide fate of TRAP/DEVIATION/STEP/header/`@seam` as declared project kinds | src: `comment-rules-baseline.txt` line 1 = 0 (23 lines); tests: `comment-rules-tests-baseline.txt` 213 lines, 168 non-comment entries |
| 25 | check-pending-decisions.py (168) | `@provisional PND-n` ↔ pending-decisions.md rows both ways; class A-H; D-H may not carry mark; 裁定済 may not | rewrite for OPQ list (in spec appendix), `// Provisional: OPQ-n` / `// Unimplemented: OPQ-n`, `# ...` in Gherkin, closed IDs never reused | none (hard 0) |
| 47 | check-marks.py (157) | ⛔⚠️⭐ not doubled; bold does not cross a sentence end | none for C1-C10 (only the 「印」 name clash above) | — |
| 64 | check-purity-honesty.py (178) + purity-calls.mjs | pure/semi-pure-immutable function calling impure, DOM, Date.now, await | none (R7 four values unchanged; src: pure 3031, non-pure 646, semi-pure-mutable 189: `grep -rhoE '@purity [a-z/-]+' src \| sort \| uniq -c`) | purity-honesty-baseline.txt = 0 |
| 94 | check-retired-purity-values.py (143) | old `semi-pure-a/b` spellings outside named records | none | 0 |
| 91 | check-old-review-numbers.py (199) | per-file count of retired 07 numbers vs baseline | none to the script; it reads column 1 of 07's old table — the table must survive the rewrite | old-review-numbers-baseline.txt 626 lines, 2788 refs / 625 files |
| 65 | check-unit-test-or-omission.py (286) | exported src function w/o omission row (table UO) has a unit test; `@unit-test-omitted`, `@external-contract` tags | indirect: C6 "each leaf requirement has ≥1 test or a verification-method row" is ID-based, not function-based → new check. Tags `@unit-test-omitted`/`@external-contract` (0 uses today) would need declaring as project comment kinds | unit-test-or-omission-baseline.txt 8 lines |
| 39 | check-must-clause-coverage.py (421) | MUST clauses held verbatim by a contract/system/use-case test (comment lines struck out) | C6 wants parent IDs on tests (`// Spec: FR-012`, `@FR-012` tags) and gap count 0; 39 measures a different thing (quotes) with debt 2039 → keep or replace; a gap-0 ID trace check is new | must-clause-coverage-baseline.txt line 1 = 2039 |
| 44 | check-spec-id-references.py | burned/unknown IDs in src/tests | extend to `Spec:` and OPQ IDs (standard lint "Spec ID exists") | — |
| 41 | tools/precheck.py:154-157 | refuses backticked `CR-nnn`/`PND-nnn` inside docs/spec | conflicts with `（仮: OPQ-xxx）` marks and an OPQ list in the spec appendix (C3) | — |
| 53 / registry | row-id-prefixes.json (220 prefixes) | prefix registry | RVF, OPQ not registered (PND, JDG, DFC are); OPQ beside PND = two prefixes, one meaning | — |
| new | — | — | C8: glossary JSON + human-check record per term; ID-registry/state-machine JSON keys; UI text `en` master; C1 report form | — |

---

## 4. Where the new MUSTs collide with GRS settled rules

| # | New standard (quote, place) | GRS (place) | Size |
|---|---|---|---|
| X1 | R3 Comments: 種類は Why/Spec/Summary/Temporary/Unimplemented/Provisional/R7 (ja 497-512); "ほかの種類を使うなら、先にプロジェクトルールに定める" | comment-rules-src.md §3: `see`, `TRAP`, `WHY`, `STOP`, `DEVIATION`, `STEP`, header `@unit/@component/@publishes/@seam` | src/tests: `// see ` 3151/1865, `// TRAP:` 520/44, `// WHY:` 1255/2902, `// STOP:` 17/0, `// DEVIATION:` 7/3, `// STEP:` 0/131, `@unit` 185/1, `@component` 185, `@publishes` 37, `@seam` 8; new kinds all 0 (`grep -rF -- '<kind>' src \| wc -l`). TRAP/DEVIATION/STEP/header can be kept by declaring them; `see`↔`Spec` and `WHY`↔`Why` are spelling clashes with the standard's fixed forms |
| X2 | Unimplemented = "止まって人に問うている所。振る舞いは作らない"; AI item: 止まるべき選択に Provisional を付けていないか (ja 509-510, 539) | comment-rules-src.md:36,50: class D-H row where "コードが既に選んでいる" is written `// STOP ... (PND-n)` without mark | under the standard such code is a hidden provisional decision → FAIL. `@provisional` 10 src + 1 tests |
| X3 | OPQ list "仕様書の付録に置く。ID は OPQ-xxx" + marks `（仮: OPQ-xxx）`/`（未決: OPQ-xxx）` in spec sentences (ja 1102-1111) | 06 + pending-decisions.md (356 PND rows, outside the spec, A-H/wave/未裁定 columns); precheck 41 refuses `PND-nnn` in docs/spec; check 54 keeps history out of spec | structural conflict with a settled GRS design (spec holds no pending/history IDs) |
| X4 | Spec comment "仕様書にある振る舞いを実装する時と、テストする時" and lint "Spec の ID が仕様書に実在するか" (ja 505, 528) | `// see` lines cite rulings/ledger: 53 src + 18 tests `see` lines cite `JDG-`; any-line `JDG-` 99 src / 267 tests; `DFC-` 68 src; `CR-` 44 src | JDG/DFC/CR are not spec IDs → a `Spec:` with them fails; standard lets only spec IDs (incl. IMPS) be parents (C6) |
| X5 | Verdict: NA only for not-applicable; broken = FAIL even with a reason (ja 908-912) | 07:572 "MUST 項目を意図的に見送る場合は、Remark に理由" | direct contradiction (C1) |
| X6 | Severity/dispositions/RVF (ja 885-903, A.1) | 07:560-568 delegates severity to ledger statuses; ledger has no severity/disposition | C1/C2 new columns or new ledger |
| X7 | Machine-readable sources MUST if >10,000 lines: glossary, ID registry, state-transition tables in JSON; JSON master, tables generated; camelCase keys; BCP 47 keys with `en` master (ja 1176-1185) | glossary is Markdown only (`docs/spec/_assets/tbl-glossary.md`, 563 lines, 382 ID rows, columns 行ID/確定名（英）/日本語, numbered IDs `N-1`); a draft `studies/76-grs-json-beta-shape/terms/glossary-draft/glossary.json` (nested groups, 39 top terms, keys key/label/definition/avoid + uses/tags/children/rowId, no `renames[]`); `row-id-prefixes.json` keys prefix/words/means/owner(+mirrored_in 8) vs required prefix/standsFor/meaning/section and "任意のキーは無い"; snake_case `mirrored_in`, `collisions_suppressed`; `state-machines.json` 31 machines, `transitions` is an object keyed by event, states are objects, no `unhandled[]`; UI text `display-words.json` uses `{ja, en}` (matches BCP 47) | Glossary: each term needs a person-check record (none per row) |
| X8 | R6 Gherkin MUST; `@manual`; tool report as test record (ja 761-777) | 0 `.feature` files; `@manual` 0; manual checks live in the defects ledger column 実物確認 and GT-2 | High FAILs on first review |
| X9 | R1 sentence rules: no など/等/指示代名詞 in all spec chapters (C3) | spec manuscripts (19 files): など 47, `等[、。 ）)]` 35, これ/それ/あれ 638 (approximate; それぞれ inflates) (`git ls-files 'docs/spec/*.md' 'docs/spec/_assets/*.md' \| xargs grep -o 'など' \| wc -l`) | Medium per C2 |
| X10 | Renaming steps: glossary keeps `renames[]` (A.2) | renames recorded in CRs and docs/review/cr-792-rename-map.tsv, not in the glossary | process change |
| X11 | No conflict: comments in English (standard) = GRS ASCII English rule (03 §5, comment-rules-src §1). `@purity` 4 values match (CR-859). Comment density 10% is GRS-only and compatible | | |
