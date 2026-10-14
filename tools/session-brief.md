# Common brief for a gr-scheduler session

<!-- The fixed part of every session brief. tools/session_brief.py fills the
     <<NAME>> slots and prints it; never paste this file by hand (JDG-2125).
     A line added here reaches every later session. Keep it ASCII except
     where a Japanese term is quoted. -->

TASK: <<TASK>>
BASE: <<BASE>> -- first command: `git merge --ff-only <<BASE>>`. If it does not fast-forward, STOP and report.
ID BANDS (yours only): <<BANDS>>. Need more? STOP and ask the coordinator.
YOU OWN: <<OWNS>>. <<OTHERS>>
Anything else: ask the coordinator first.

## Language and files
- Explain in Japanese. Code, comments and commit messages: English ASCII, no Co-Authored-By trailer.
- Never write an absolute path or a user name into any file (precheck trap 5).
- Logs, measurements and scratch copies go to your scratchpad, never under the worktree (OneDrive syncs it, DFC-2312).

## Worktree and tools
- No node_modules, junction, symlink or further worktree. No npx. Tools of the parent checkout by path:
  `node ../../../node_modules/vitest/vitest.mjs run <files>`.
- Whole suites (vitest, playwright) only under the lock: `node ../../../tools/gate/gate-queue.mjs run -- <command>`.
- check.sh: `rm -rf output` first, `GRS_DEV_PORT=<<PORT>>` (5992 is the coordinator's gate). Judge by the exit code.
- Run check.sh once after your edits and once after a fix; not in a loop.

## Git
- Never `git stash`; never `git add -A` / `-u` / `.`; name every path you stage.
- Before each commit: `python tools/privacy_count.py --staged` must print all 0; put the line in your report.
- Never push, never merge into another branch. The coordinator merges your sha.

## Ledgers and rules
- The specification is the truth (rule 01 ⑤). A spec/code mismatch: open a DFC row naming both sides;
  the default is to fix the code. A behaviour already implemented waits for the user's ruling via the coordinator.
- One id, one owner: edit only the ledger rows your task names.
- New DFC rows: rerun `python tools/ledger_metrics.py` and `npm run gen:prefixes`.
- A landed CR takes no addendum (check 62); a follow-up needs a new CR number from the coordinator.
- A row a drafted CR will apply reads `指示 —— CR-n が当てる`, and that CR must cite it (check 80).
- Never edit a generated file by hand; never raise a baseline or a known-red line (send the numbers instead).
- A function that grows past check 60's baseline is split inside your task (07 R2), never "slightly over".

## The user
- A question to the user: one at a time, with the scene, the concrete ids and on-screen words, 2-4 options
  and a recommendation with its reason. Grep rulings.md for the same and similar subjects first.
- Every ruling the user gives you: record it in rulings.md (an id from your JDG band) before you end.
  Your report counts rulings given after your last commit: it must be 0.
- A test the user must make on the real app: send the procedure to the coordinator; never ask the user yourself (JDG-1340).
- Do not raise suggestion chips without asking the coordinator (JDG-950).

## Time box
- Expected time: <<TIMEBOX>>. The same red twice without a cause you can name: STOP and report the lines.

## Report and wait
- A sha, a count or "reported" appears in a reply only after the tool call that produced it returned.
- When done: send ONE report to the coordinator (<<COORDINATOR>>) -- commits (sha + subject), files, ids used,
  check exit codes, the privacy line, rulings recorded / unrecorded (0), open questions -- then WAIT.
  Do not commit dist/, ask the user to test, or call the session finished before the coordinator answers.
