# Review criteria for shipped English (schema descriptions, command descriptions, refusal meanings)

Written by the CR-851 seat and approved by the user on 2026-10-25 (JDG-3328). Each item is a yes/no question; "yes" is good.

| # | Criterion | Question (yes = good) |
|---|---|---|
| E1 | First-read meaning | Does a first-time reader who has only the schema (no spec, no GRS screen) explain correctly what the property holds, after one read? |
| E2 | One job | Does the text say only what the property holds and, where it helps, what it is for and what its absence means, without retelling the type, range, pattern or required/optional that the schema already states? |
| E3 | Short | Is it at most 2 sentences and at most about 40 words, unless a third sentence prevents a likely mistake? |
| E4 | Plain words | Does it avoid jargon that the reader must look up (internal terms, abbreviations, Latin), or explain such a word in the same sentence? |
| E5 | No internal ids | Is it free of specification row ids (S-128, AT-17, FR-019, JDG-...) and table numbers, which a reader holding only the schema cannot look up? |
| E6 | Same word, same thing | Does it use the same word for the same thing as the other descriptions (task group, task group panel, comment box, highlight box, document, stamp)? |
| E7 | True | Is every statement true according to the specification (docs/spec and the CR-851 drafts)? |

Bad -> good example: "Saved, like every task group state, so that reopening shows what was saved." (says why it is saved, not what it is) -> "Whether the task group is open, closed or hidden in the task group panel."
