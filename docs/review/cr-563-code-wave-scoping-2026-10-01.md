<!-- Lane L4 read-only scoping of CR-563's code wave, 2026-10-01. The coordinator closed L4 without CR-563's code (CR-563 gets its own round); start that round here. GP-1's open point is PND-620. -->

# CR-563 code wave -- stage-2 proposal (read-only)

Tree: `5ebdb5ee` (lane-l4). Working tree has other sessions' uncommitted test edits (CR-576); nothing written by me in the repo.
Paths are repo-relative. "01-04" = docs/spec/01-04-requirements.md, "05-07" = docs/spec/05-07-design.md.

## Measurement

- `git grep -n editGroup -- 'src/*.ts'` (non-generated): 13 hits. All are schema, codec, literal `editGroup: null`, or the entity type
  (grs-json-schema.ts:255/276, json-codec.ts:207-218, mspdi-imported-rows.ts:39, schedule-entities.ts:142/454,
  document-change-plan.ts:178, task-create.ts:82, task-group-naming.ts:66). **0 of them read the value to decide anything.**
- `git grep 'RS-61\|RS-62\|GP-[1-7]\|HM-11\|setTaskGroupEditGroup' -- 'src/*.ts'`: 0 hits outside generated JSON and one comment (json-codec.ts:207 "see GP-1").
- Tests: none for GP-*, CM-76, FR-150. Only the RS-62 word fingerprint (tests/contract/t-233-reason-words-tell-the-row.contract.test.ts:498-499, green).

## a) + b) Row by row

Lane key: L3 / L4 per docs/development-records/cr-plan-2026-09-26.md:66-67. "unlisted" = no lane names the file.

| Spec row (where) | Honoured in src today? (file:line) | Unbuilt part | Files that must change (lane) |
|---|---|---|---|
| GP-1 core: no edit of a Task on a row whose editGroup != null (01-04:1843) | **none** -- editTask dispatch (src/use-case/edit-document/edit-task.ts:224) never reads the row's editGroup | Gate every Task command on a read-only row; refusal `rule: 'GP-1'` | edit-task.ts (unlisted); predicate owned by FR-111's origin unit UF-12 = edit-task-group.ts (05-07:431) (L3) |
| GP-1: CM-7 deleteTask on a read-only row refused | **none** -- edit-task.ts:243 deletes unconditionally | same gate | edit-task.ts (unlisted) |
| GP-1: PR-18 name / PR-19 colour refused | **none** -- edit-task-group.ts:362-367 (setTaskGroupLabel / setTaskGroupColor / resetTaskGroupColor) ungated | gate in editTaskGroup | edit-task-group.ts (L3) |
| GP-1: order / parent / treeState / height / pin accepted | vacuously yes -- no gate exists (edit-task-group.ts:368-377; pin is a settings command, edit-document.ts SETTINGS_KINDS) | must stay ungated once the gate lands (test it) | -- |
| GP-1: PR-33 editable by a person on any row | **half** -- field is DRAWN: properties-panel.ts:185-201 builds GROUP_ITEMS from property-items.json:200-209 (proved: see d). **Commit writes nothing**: field-commit.ts:229-254 has no `editGroup` case, falls to `default: return []` (:250-251) | CM-76 command + commit case | field-commit.ts (L3); edit-task-group.ts TaskGroupCommand union :27-64 + dispatch :362 (L3); edit-document.ts TASK_GROUP_KINDS :177 (unlisted) |
| GP-1: Agent API must not write editGroup (RS-62) | **none** -- agent road plans commands unfiltered: agent-api-members.ts:372-396 (`planAndApply`) | refuse CM-76 from the agent road, reason RS-62 | agent-api-members.ts (L4) |
| GP-1: same rules for the agent; refusal value with RS-61 (AG-9a) | **none** -- WS-3 collapses to `'commandRefused'` (agent-api-members.ts:205-213; union :47-60 has no editGroup reason) | new AgentRefusalReason value(s) (CR decision 1) mapped from rule GP-1/GP-7 | agent-api-members.ts (L4) |
| GP-1 on screen: NT-1 notice with RS-61 | **none** -- `NoticeReason` (frame-loop.ts:513-568) lacks RS-61/RS-62; REFUSAL_SITUATIONS (frame-loop.ts:658-665) has no GP-1 row, so a GP-1 refusal would show RS-10 (:647) | add RS-61 to NoticeReason, NOTICE_MANNER_OF_REASON (:571, NT-1), REFUSAL_SITUATIONS `{reason:'RS-61', command:null, rule:'GP-1'}` | frame-loop.ts (L4) |
| GP-2 no inheritance (01-04:1844) | vacuously yes (nothing reads editGroup) | predicate must read the row's own value only | edit-task-group.ts (L3) -- test only |
| GP-3 bulk input writes each row (01-04:1845) | vacuously yes -- no multi-row entry: row fields appear only for exactly one row, properties-panel.ts:746-750 (`onlyGroupId`) | none today | -- |
| GP-4 / HM-11 no move of a bar to a row of another editGroup (01-04:1846, :1816) | **none** -- moveTaskToTaskGroup accepts any target, edit-task.ts:324-337 | refuse when target.editGroup !== source.editGroup (rule HM-11) | edit-task.ts (unlisted). Emitter item-grab.ts:419 (L2) needs no change if the use case refuses |
| GP-5 confirm lists a successor on another editGroup row (01-04:1847) | **none** -- deletion-confirmations.ts:21-60 never scans dependencies | add the listing | deletion-confirmations.ts (unlisted) + T-234 wording is QN-1 (no new question row) |
| GP-6 derived values not gated (01-04:1848) | vacuously yes | keep percent-complete / roll-ups outside the gate | -- |
| GP-7 person deletes a read-only row (01-04:1849), CD-6 all rows (01-04:2434) | vacuously yes -- deleteTaskGroup ungated, edit-task-group.ts:161 | must stay ungated after GP-1 lands (CM-7 cascade from CD-1 must NOT hit the GP-1 gate) | edit-task-group.ts (L3) -- test only |
| GP-7 / E-03 / QN-1 / QN-2: confirm names the row a Task is shown on; QN-2 also marks | **none** -- item carries only `isShownOnAnotherRow` (deletion-confirmations.ts:14); QN-2 never marks because of `lostRows.size > 0` (:55); drawn as mark only (src/framework/dom-screen-surface/notices-drawing.ts:116-121; type screen-renderer.ts:416-421) | add row name to the item, drop the `lostRows.size>0` guard for QN-2 | deletion-confirmations.ts (unlisted), file-flow-values.ts:39 (unlisted), screen-renderer.ts (unlisted), notices-drawing.ts (unlisted; sits in L4's dom-screen-surface directory but is not dom-screen-surface.ts) |
| GP-7 agent deletion refused when the cascade reaches a read-only row/Task (AG-3, RS-61) | **none** -- agent-api-members.ts:372-396 | pure reach test (CD-2 rows + CD-1 WBS descendants) then refuse the whole batch | agent-api-members.ts (L4) + pure reach function beside deletion-confirmations.ts (reuses subtreeOf / wbsSubtreesOf, deletion-confirmations.ts:8) (unlisted) |
| FR-033 exception (01-04:2542-2544): copy from a read-only row lands on the chosen own row; keep TaskOrigin | **none** -- copies land on the source row, task-paste.ts:91-97; paste writes no taskOrigins (task-paste.ts:98-109); command built without landing, copy-and-paste.ts:130 | landing to the selected row when source row editGroup != null; add TaskOrigin rows | task-paste.ts (unlisted), copy-and-paste.ts (unlisted, UF-168 frame-loop sibling) |
| PR-33 + CM-76 `setTaskGroupEditGroup` (tbl-glossary.md:488, tbl-property-items.md:48) | field drawn (above); **command none** | as GP-1 PR-33 row | as above (L3 + edit-document.ts) |
| RS-62 (01-04:7396) | words only: display-words.json:3565 (generated) | carried by the agent refusal | agent-api-members.ts (L4) |
| FR-150 / AG-12 (01-04:6996, :6956) | **none** | whole bridge | blocked -- see c) |

Open point for stage 3 (not decided by the spec text): GP-1 names only CM-7 and PR-18/PR-19 by row. Whether dependency commands
(edit-dependency.ts: the dependency lives in the successor), assignments (edit-resource.ts), task visuals (CM-20..24) and
createTask / pasteTaskSubtree INTO a read-only row count as "editing a Task on the row" is not enumerated in a table.
Per spec-table-first writing this wants a T-108 column or a list in GP-1 before the gate is coded; otherwise the implementer chooses.

## c) MCP bridge (FR-150, CR section 8 part 2)

**Blocked.** The design CR the CR says must come first has not been written:
- T-062 / T-075 have no component or unit for the bridge or the page-side WebSocket port: grep of 05-07 for
  `FR-150|AG-12|WebSocket|取次|MCP` finds only 05-07:575, which lists FR-150 among the 16 requirements
  "仕様が起点のユニットを決めていない".
- CSP: table T-232 (05-07:1424-1429) has PO-1..PO-6 and **no `connect-src`**; PO-1 `default-src 'none'` therefore refuses any
  WebSocket. The built policy matches (vite.config.ts:143-150, no connect-src).
- Also unsettled: the writer name for MCP vs DFC-560 (`'agent'` fixed; the screen writes EDITED_BY_SCREEN, frame-loop.ts:362),
  and DFC-787. Blocked on: a new design CR (number from the coordinator) adding T-062/T-075 rows + a T-232 row for connect-src
  (127.0.0.1 same-origin), then removing FR-150 from 05-07:575's list.

## d) tests/contract/display-words.contract.test.ts (run at 5ebdb5ee + uncommitted CR-576 edits)

8 red / 1412 green. Output: scratchpad cr563p.dw.txt.
- **PR-33's 5**: "'properties' 'PR-33' 'label' ..." -- holds a word in ja / en, a different word per language, is written in ja / en.
- The other 3 are not CR-563's: section-key list (rowMinHeightField, searchColumns, planActualStates, searchPanel, dependencyKinds
  -- CR-582 / CR-571 / CR-561 sections), cell-uniqueness 1352 vs 1386, rowMinHeightField reaching no frame.

**Cause of the 5: the TEST, not src.** The field is built and carries the word; it declares row `PR-33`
(properties-panel.ts:684-687 maps only `label` -> AT-53). The test's `declaredRowOf`
(display-words.contract.test.ts:1119-1131) returns the ERD row whenever T-016's 備考 merely mentions it
(`includes(attribute.id)`, :1130). PR-33's note says "（`fig-erd-detail.md` の `AT-144`）" (tbl-property-items.md:48), so the test
looks for a field with row `AT-144`. IR-1 (01-04:5514) says a field declares its T-016 row id and ONLY the name field declares AT-53
-- src is right.
Proof: a scratch copy of the test with :1130 narrowed to notes that say "実体は" ran `-t PR-33` against unchanged src: **5 passed**
(scratchpad cr563p.dw-probe.test.ts + cr563p.vitest.config.mjs).
=> **No src change turns them green legitimately.** Mapping `editGroup` -> AT-144 in properties-panel.ts would break IR-1.
Fix is in the test (a test owner / spec-only tester, not the implementer) or in the PR-33 note wording (a new CR, since CR-563 landed).
Per the "spec/code mismatch goes to defects" ruling: record a DFC row, do not pick silently.

## e) Proposed wave split

Seam names verbatim from the CR: `editGroup`, `setTaskGroupEditGroup` (`CM-76`), `AgentRefusalReason`, `RS-61`, `RS-62`,
`GP-7`, `PR-33`, `treeState` (`AT-153`, `CM-85`), `Agent API`, `grSchedulerAgentApi`, `watchChanges`.

Precondition: the use-case gate files (edit-task.ts, edit-document.ts, deletion-confirmations.ts, task-paste.ts) are in no lane,
and edit-task-group.ts / field-commit.ts are L3's. The coordinator must hand them to L4 for this CR or schedule an L3 body first.

| Wave | Body | Files | Rows |
|---|---|---|---|
| W-a (use case; needs L3's two files released or run by L3) | implementer | edit-task-group.ts (predicate `isReadOnlyRow` naming is the body's; add `setTaskGroupEditGroup` to the union + dispatch), edit-task.ts (GP-1 gate, HM-11), edit-document.ts (TASK_GROUP_KINDS), deletion-confirmations.ts (row name, QN-2 mark, GP-5, GP-7 reach fn), task-paste.ts (FR-033 landing + TaskOrigin) | GP-1..GP-7, HM-11, FR-033 exc., CM-76 |
| W-a | spec-only tester | new tests/contract/cr-563-*.test.ts (reads 01-04 T-275, T-015a HM-11, FR-033, T-108 CM-76 only) | same |
| W-b (L4, after W-a merged -- seam: refusal `rule` strings 'GP-1' / 'GP-7' / 'HM-11' and the reach fn name) | implementer | agent-api-members.ts (`AgentRefusalReason` + RS-61/RS-62 mapping, refuse `setTaskGroupEditGroup`, GP-7 batch refusal), frame-loop.ts (RS-61 NoticeReason/manner/situation), copy-and-paste.ts (landing), screen-renderer.ts + file-flow-values.ts + notices-drawing.ts (row name in the confirmation) | GP-1 agent+screen, GP-7 agent, RS-61, RS-62, E-03 |
| W-b | spec-only tester | tests for AG-9a reason values, NT-1 RS-61 notice, QN-1/QN-2 row name | same |
| W-c (L3) | implementer | field-commit.ts `case 'editGroup'` -> `setTaskGroupEditGroup` | PR-33 commit |
| W-d | test owner (not implementer) | display-words.contract.test.ts:1130 declaredRowOf -- or a DFC row + CR for the PR-33 note | the 5 PR-33 reds |
| W-e | -- | MCP bridge | blocked on the design CR (c) |

W-a and W-b cannot run in parallel (W-b consumes W-a's refusal rule ids); W-c and W-d are independent of both.
Per-frame path: frame-loop.ts edits here touch only the refusal table, not the paint path -> no perf gate expected (JDG-605), coordinator to confirm.
