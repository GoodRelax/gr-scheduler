# Working with agents in parallel —— a guide for the user

The rules for running two or more AI sessions at the same time on gr-scheduler.
The detailed rules on the AI side live in `docs/development-rules/05-working-method.md` (sections 3 and 6) and `docs/development-records/handoff.md` (§2.5 to §2.7). This guide does not copy them; it says only what the user does.
The Japanese version is [parallel-agents-ja.md](parallel-agents-ja.md).

## Two kinds of parallel work

| Kind | Who starts it | What the user does |
|---|---|---|
| Bodies (subagents) inside a session | The leading session starts them itself | Nothing. Read the report and answer the rulings |
| Two or more sessions open at once | The user | Make them keep the five rules below |

## Five rules

1. **Only one session holds the ledgers (call it the "main" session).**
   Only the main session writes `rulings.md`, `defects.md`, `fixed-defects.md`, `handoff.md` and the check baselines. Other sessions hand the text they need recorded to the main session through the user.
2. **Split the files.** Never let two sessions touch the same file. When a session starts, give it the files (or folders) it may touch.
3. **Commit only your own files.** List the paths in `git add`. Report the privacy-check counts before commit and push. The user makes tags.
   ⭐ Commands that sweep up other sessions' changes are stopped by a machine, the hook `.claude/hooks/block-sweeping-git.py`: `git add -A`, `git add .`, `git add -u`, `git commit -a` and `git stash` (`list` and `show` are let through).
4. **Heavy runs one at a time.** Only one session at a time runs e2e or a performance measurement. The user allows a performance measurement before it starts.
5. **Try the root's `dist/index.html`.** Try it only after the main session has moved `refactor`, rebuilt it, and said "ready to try" with the branch and commit.

## The first message for a second session

````text
Another session (the main one) is working at the same time in the root of the refactor branch. Keep to the following.
- You may touch only [folders or files]. Only read everything else.
- Do not write rulings.md, defects.md, fixed-defects.md, handoff.md or the check baselines. When something needs recording, give me text to paste into the main session.
- List paths in git add. Commit only your own files, after reporting the privacy-check counts. (git add -A, git add ., git add -u, git commit -a and git stash are blocked by a hook.)
- Ask me before running e2e, a performance measurement or the whole of check.sh.
- Put the branch name at the top of every report.
Task: [what to do]
````

## When something goes wrong

- **You cannot tell whose change it is**: have either session run `git status --porcelain` and `git log --oneline -5`, and commit only its own files.
- **You want the main session to record something**: have the other session write "text to paste into the main session", and paste it as it is.
- **You want to check the current branch**: in the gr-scheduler folder, run `git branch --show-current` and `git log --oneline -1`.
- **A session was stopped by the hook**: being stopped is correct. Have it retry with `git add <path>` listing its paths. To check the hook itself: `python .claude/hooks/block-sweeping-git.py --self-test`.

## Track record (2026-09-16)

The main session held the rulings and ledgers; another session wrote only `docs/guides/`. The latter committed by listing paths and never touched the main session's uncommitted changes. Their commits landed on `refactor` in turn, with zero conflicts.
