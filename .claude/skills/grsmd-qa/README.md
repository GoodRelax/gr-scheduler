# grsmd-qa -- a Claude Code skill for ruling sheets in GRSMD

When a session has many related questions for you (a glossary audit, the open
points of a change, review items), asking them one by one in chat is slow and
hard to answer. With this skill the session writes the questions into a
Markdown sheet. You open the sheet in GRSMD (GR Simple Markdown), write your
answers and counter-questions in place, save, and tell the session. The
session records each ruling, rewrites the sheet so it shrinks to what is still
open, and marks only what changed in this round with the emoji U+1F504, which
GRSMD's search finds.

## What you need

- Claude Code (CLI, desktop app or IDE extension)
- Python 3 (for the two helper scripts; standard library only)
- GRSMD open in Chrome or Edge, so that Save writes the file back
- git (optional; the backup script checks that the backup folder is ignored)

## Install

Copy this folder, `grsmd-qa`, into one of the skill folders:

| For | Folder |
|---|---|
| every project of yours | `~/.claude/skills/grsmd-qa` |
| one repository (shared with everyone who clones it) | `<repository>/.claude/skills/grsmd-qa` |

Start a new session after copying; a running session reads the skill list
when it starts. To update, delete the old folder first, then copy again.

## Use

- Type `/grsmd-qa` with what to ask about, or ask for questions "in a .md with
  answer fields". The session writes the sheet and tells you where it is.
- Open the sheet in GRSMD, answer after each answer field, save, and tell the
  session that you updated it. Press Re-load in GRSMD after the session has
  rewritten the sheet.
- Press `f` and search for the emoji to jump between this round's changes.

The session keeps every earlier version in `old/` beside the sheet. Keep that
folder out of version control (the backup script warns when git does not
ignore it).

## Files

| File | What it does |
|---|---|
| `SKILL.md` | The method the session follows: sheet layout, the round, change marks, trees |
| `scripts/backup_sheet.py` | Copies a sheet to `old/<name>_yyyymmdd_hhmm.md` before each edit |
| `scripts/tree_align.py` | Prints a two-language tree in columns aligned by display width |
