# -*- coding: utf-8 -*-
"""What a ledger cell ASSERTS, as opposed to what it QUOTES.

⛔ WHY THIS EXISTS (`DFC-344`). Checks 31 and 40 read a `defects.md` cell for the
words that mean 「this row is waiting on a ruling」 -- 未定, 裁定を待つ, and the
rest -- with a plain substring match over the whole cell. A substring match
cannot tell an ASSERTION from a QUOTATION, and the ledger's own house style
asks rows to quote:

  - a verbatim quote of the requirement that explains the row. `DFC-286` carries
    「再開日を未定のままにもできること」, which is the FR-044 clause that makes
    `PA-4` a state at all. The row is not blocked; it is citing its evidence.
  - the NAME of a state or a value, which may itself contain the word --
    「中断・再開日未定」 is what that state is called.
  - the row quoting its OWN older text to date it as history. `DFC-135` reads
    ⛔ 上の「未定」はもう真でない, which is the append-only rot being CLEANED
    UP, and the cleanup is what the check then faults.

Each of those cost a round: the baseline was raised, or the row was reworded
to dodge the substring. ⛔ Rule 04 section 6.3 forbids the first
(「基準線を上げて黙らせるな」), and the second makes the ledger worse to read
to keep a tool quiet. The note taken on the second misfire said a third should
change the heuristic rather than the number; `DFC-344` is that third, and check
40's misfire on `DFC-301` (a row writing its own history) is a fourth.

⭐ SO THE MARKERS ARE READ OUTSIDE QUOTATION ONLY. `「…」`, `『…』` and a
`code span` all mean 「these are somebody else's words, not this row's claim」,
so their contents are removed before the markers are looked for. What is left
is the cell speaking in its own voice.

⚠️ WHAT THIS DELIBERATELY DOES NOT DO. It does not exempt a row, and it does
not weaken a marker. A row that is genuinely blocked says so in its own words
-- ⛔ **未検討。** -- and that text is untouched here. ⭐ MEASURED 2026-09-06
across both ledger files: of the rows check 31 matched, exactly two stop
matching, and both are the misfires named above (`DFC-286`, `DFC-135`). Nothing
else moves.

⛔ It also does not remove the EMPHASIS marks. 「**未定**」 inside a quote is
still inside the quote; ⛔ **未定** outside one is still an assertion. Only
the quotation delimiters decide.

⭐⭐ A SECOND THING A CELL CAN BE, ADDED FOR `DFC-367`: A DATED RECORD.
Quotation was the first misreading; the second is TIME. A cell may state, in
its own voice, something that WAS true on a day -- 「the surface was pressed
and it was empty」, 「a ruling was outstanding」 -- and a prose-reading check
turns that record into a claim about today. ⛔ MEASURED FOUR TIMES before this
line existed (`DFC-344`, `DFC-347`, check 40, check 31), and the handoff had said
to change how these checks are written when a third appeared.

⭐ THE USER RULED ON 2026-09-07 (`PND-441`, proposal ①): a sentence that begins
「⚠️ 実測（<date>）」 is to be read as a RECORD, not as a present claim. ⛔ No
new mark was invented -- rule 03 already defines ⚠️ as 「注意・過去に実際に踏
んだ罠」, so a dated 実測 under that mark is a record BY DEFINITION. The
notation itself is written down in `docs/development-rules/04-verification.md`
section 6.6, and this module is its implementation; the two must be read
together.

⛔ THE ALTERNATIVE WAS REJECTED, and the reason is worth keeping: adding one
more word to each check's vocabulary was rejected because 語の一覧は必ず漏れる
-- a word list always leaks, and the fourth occurrence is the proof.
"""
import re

# ⭐ Nested first: a 「…」 may hold a 『…』 or a code span, and the innermost
# pair is the one that closes. Substituting until the text stops changing
# unwraps from the inside out, so an outer quote is removed as a whole.
_QUOTES = (
    re.compile(u'「[^「」]*」'),
    re.compile(u'『[^『』]*』'),
    re.compile(u'`[^`]*`'),
)


def outside_quotation(cell):
    """`cell` with every quotation and code span replaced by a space.

    A space, not the empty string, so that removing a quote cannot weld the
    words on either side of it into a phrase that was never written.
    """
    text = cell
    previous = None
    while previous != text:
        previous = text
        for pattern in _QUOTES:
            text = pattern.sub(u' ', text)
    return text


# ⭐ WHERE A SENTENCE STARTS, in the ledger's house style. Cells are one long
# line, so 。 is not the only boundary: the marks ⭐ / ⛔ / ⚠️ and the arrow ⇒
# each open a new statement. Splitting on all four is what lets ONE sentence be
# struck without taking its neighbours with it.
#
# ⭐ A RUN OF MARKS IS ONE OPENING, not several. 「⚠️⚠️ **実測（…」 doubles the
# mark for weight, so the lookbehind refuses to split between two marks; only
# the first of a run starts a sentence.
_SENTENCE_START = re.compile(u'(?<=。)|(?<![⭐⛔⚠️])(?=[⭐⛔⇒⚠])')

# ⭐ THE RECORD OPENER, verbatim as ruled: ⚠️ 実測（YYYY-MM-DD…
#
# ⛔ THE MARK IS ⚠️ AND NOTHING ELSE. ⭐ and ⛔ open sentences that claim, not
# sentences that record; rule 03 gives ⚠️ alone the meaning 「過去に実際に踏ん
# だ」. ⛔ The full-width bracket is part of the notation: 「実測 2026-09-07」
# with no bracket is NOT the mark, because a bare date reads as often in a
# present claim (「実測で覆した」) as in a record.
#
# ⭐ What is skipped before the mark, and between it and 実測, is emphasis and
# whitespace only -- 「**⚠️ 実測（…」 and 「⚠️⚠️ **実測（…」 are both the
# house style and both count.
_RECORD_OPENER = re.compile(u'^[\\s*]*(?:⚠️?[\\s*]*)+実測（\\d{4}-\\d{2}-\\d{2}')


def outside_record(cell):
    """`cell` with every 「⚠️ 実測（日付）…」 sentence replaced by a space.

    ⛔ ONLY THE SENTENCE THAT CARRIES THE MARK IS STRUCK, not the rest of the
    cell. A row that records a past measurement and then states where it now
    stands keeps the second half in its own voice, which is the whole point:
    the notation dates one statement, it does not exempt a row.
    """
    kept = []
    for piece in _SENTENCE_START.split(cell):
        kept.append(u' ' if _RECORD_OPENER.match(piece) else piece)
    return u''.join(kept)


def spoken_now(cell):
    """What `cell` claims about TODAY: no quotations, no dated records.

    Quotations are struck first. A record sentence may hold a quote, and
    striking the quote leaves the opener in place for the second pass; the
    reverse order would leave a record's marker hidden inside a quote it had
    already consumed.
    """
    return outside_record(outside_quotation(cell))


def asserts_any(cell, phrases):
    """True when the cell says one of `phrases` IN ITS OWN VOICE, ABOUT TODAY."""
    spoken = spoken_now(cell)
    return any(phrase in spoken for phrase in phrases)
