---
name: grsmd-qa
description: Ask the user many related rulings at once in a Markdown question sheet that the user reads and answers in place in GRSMD (GR Simple Markdown), then converge the sheet round by round. Use when the user types /grsmd-qa, asks for questions "in a .md with answer fields" (回答欄付きの .md で), when a batch of rulings (a term audit, a change request's open points, a review's open items) is too many to ask in chat, or when the user says they updated a question sheet (更新した、確認しろ).
---

# Ruling sheet in GRSMD

The user answers rulings in a Markdown file instead of chat. They open the
file in GRSMD, write answers, counter-questions and notes into it, save, and
tell the session. The session reads the file, records the rulings, rewrites
the sheet so it converges, and marks only what changed. Each round the sheet
gets shorter, and the decisions table gets longer.

The user said this is easier for both sides than chat. Plain VS Code does not
give the same experience, because GRSMD edits blocks in place and finds the
change marks with a search.

## What GRSMD can and cannot show

GRSMD is a one-file, in-browser Markdown viewer and editor with no backend.

| Works | Does not work |
|---|---|
| GFM tables, code blocks, Mermaid, KaTeX | HTML comments (not shown at all) |
| In-place edit of a block (double-click; Ctrl+B / Ctrl+I) | Live reload (the user presses Re-load) |
| Save overwrites the file (Chrome / Edge) | A diff view |
| Search (key `f`, regex; finds the change mark) and Index (key `i`) | Inline styles and coloured text (DOMPurify strips them) |

- `$...$` is math. Write `\$` for a literal dollar sign.
- Never use coloured text, even if a renderer would keep it. Red text hurt the user's eyes.
- Mermaid labels may carry the change mark.

## Sheet layout

One sheet per level of the question tree. Start at the top level (product,
documents, windows), go down one level per sheet. When a sheet closes, the
next part goes into the same file under a new heading if the user asks for
that; otherwise start a new file with the next number.

```text
# <subject> -- sheet N (<what this level covers>)

<one line: when made, when last rewritten, the order rule>
<one line: write a letter (A, B ...) or free text after the answer field, then tell the session>

- <the change mark> + italics = changed in this round. The previous round's marks are gone.
- Older versions are in old/ (date and time at the end of the file name).

## Decided            <- the decisions table: question | decision | ruling id

## Whole tree         <- the only copy of the tree (when the questions build one)

## Question 1. <title>
<scene: where the user meets this, the current words with counts and where they occur>
| Option | Content |    <- 2-4 options, the recommendation first, bold, marked recommended
<answer field>

### Question 1-2. <follow-up>   <- a follow-up goes right under its question

## Free notes          <- an answer field for anything the sheet missed
```

Write the headings, the answer field and the decisions table in the user's
language (in gr-scheduler: `## 決まったこと`, `## 問 N.`, `### 問 N-2.`,
`回答:`, `## 自由欄`).

Every question follows the project's rules for asking (in gr-scheduler,
JDG-1753 and the memory "rulings: concrete names and options"): the on-screen
or in-file names, the scene, the current words with measured counts, 2 to 4
options with the recommendation first, and what each option changes. A count
in a question is a claim: say how it was counted, or count again.

## The round

When the user says they updated the sheet:

1. **Read the whole sheet.** Find every new answer, counter-question, note in
   a tree, and edit the user made to the wording.
2. **Back it up before any edit.** Run
   `python .claude/skills/grsmd-qa/scripts/backup_sheet.py <sheet.md>`. It copies the
   sheet to `old/<stem>_yyyymmdd_hhmm.md` beside the sheet and warns when
   `old/` is not gitignored. Add the folder to `.gitignore` if it warns.
3. **Record each settled answer at once.** One ruling row per decision, with
   the user's words verbatim (in gr-scheduler: a `JDG-` row in
   `docs/development-records/rulings.md`, then
   `python docs/spec/_source/row_id_prefixes_json_to_md.py`). Never hold a
   ruling only in the sheet: a session can end or compact at any time.
4. **Rewrite the sheet so it converges.**
   - Move each settled question to the decisions table (decision in one line,
     the ruling id) and delete its explanation and its dead options.
   - Answer a counter-question as a follow-up (`Question N-2`) right under the
     question, with options again when a choice remains.
   - Take the user's own words into the tree or the table when they proposed
     a name, and say so.
   - Delete earlier explanations that a decision made obsolete.
5. **Move the change marks.** Remove every mark of the previous round, then
   mark this round's changes only (rules below). The user searches for the
   mark to see what changed.
6. **Check.** Count the marks; read the decisions table against the new
   ruling rows; make sure no settled question still has an answer field.
7. **Tell the user in a few lines** in chat: which answers were taken, which
   ruling ids, how many new follow-ups, and that the sheet waits for them.
   Do not repeat the questions in chat.

## Change marks

The mark is the emoji U+1F504 (the counter-clockwise arrows). In the rules
below it is written as MARK.

| Where | How to mark a change |
|---|---|
| Prose | `MARK *changed text*` (mark, then italics) |
| A table cell | the same, in every changed cell of the row |
| A heading | `### MARK *Question 5-2. ...*` |
| A code block or a tree | MARK at the start of each changed line; three spaces on unchanged lines keep the columns |
| Mermaid | MARK before the changed label text |

Mark only this round's changes. A sheet with old marks left in is unreadable,
because the user cannot tell what is new.

## Trees

- One tree, in one place. Several partial trees confuse the user.
- English and the user's language side by side, in columns:
  `tree + English name | Japanese name | note`. No Japanese on the English side.
- Draw the branches with ASCII `+-` and `|`. Box-drawing characters break the
  alignment in Japanese fonts.
- Align the columns by display width (East Asian wide characters count as 2):
  `python .claude/skills/grsmd-qa/scripts/tree_align.py <rows.tsv>` prints an aligned tree
  from rows of `tree_and_english<TAB>japanese<TAB>note<TAB>changed`.
- Names the glossary does not have yet are the session's provisional
  translations: say so once in the header lines.

## Closing a sheet

When every question is decided:

- Mark the sheet closed in its header, keep the decisions table and the final
  tree, and delete the answer fields.
- Open the next part (the next level of the tree) as the user asked: in the
  same file under a new heading, or in a new file.
- Hand the decisions to whoever applies them (in gr-scheduler, the
  coordinator, with the ruling ids and the counts of what must change).

## Traps seen so far

- Box-drawing characters misaligned every tree in a Japanese font. Use ASCII.
- A wrong old name slipped into a tree (a property renamed earlier). Check
  every name in a tree against the latest decision before writing it.
- A shortened explanation stated something false. A one-line summary of a
  technical rule still needs its source.
- A sheet kept settled questions "for the record". The decisions table is the
  record; the sheet shrinks.
