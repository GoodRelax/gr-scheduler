# -*- coding: utf-8 -*-
"""What a ledger cell ASSERTS, as opposed to what it QUOTES.

⛔ WHY THIS EXISTS (`D-344`). Checks 31 and 40 read a `defects.md` cell for the
words that mean 「this row is waiting on a ruling」 -- 未定, 裁定を待つ, and the
rest -- with a plain substring match over the whole cell. A substring match
cannot tell an ASSERTION from a QUOTATION, and the ledger's own house style
asks rows to quote:

  - a verbatim quote of the requirement that explains the row. `D-286` carries
    「再開日を未定のままにもできること」, which is the FR-044 clause that makes
    `PA-4` a state at all. The row is not blocked; it is citing its evidence.
  - the NAME of a state or a value, which may itself contain the word --
    「中断・再開日未定」 is what that state is called.
  - the row quoting its OWN older text to date it as history. `D-135` reads
    ⛔ 上の「未定」はもう真でない, which is the append-only rot being CLEANED
    UP, and the cleanup is what the check then faults.

Each of those cost a round: the baseline was raised, or the row was reworded
to dodge the substring. ⛔ Rule 04 section 6.3 forbids the first
(「基準線を上げて黙らせるな」), and the second makes the ledger worse to read
to keep a tool quiet. The note taken on the second misfire said a third should
change the heuristic rather than the number; `D-344` is that third, and check
40's misfire on `D-301` (a row writing its own history) is a fourth.

⭐ SO THE MARKERS ARE READ OUTSIDE QUOTATION ONLY. `「…」`, `『…』` and a
`code span` all mean 「these are somebody else's words, not this row's claim」,
so their contents are removed before the markers are looked for. What is left
is the cell speaking in its own voice.

⚠️ WHAT THIS DELIBERATELY DOES NOT DO. It does not exempt a row, and it does
not weaken a marker. A row that is genuinely blocked says so in its own words
-- ⛔ **未検討。** -- and that text is untouched here. ⭐ MEASURED 2026-09-06
across both ledger files: of the rows check 31 matched, exactly two stop
matching, and both are the misfires named above (`D-286`, `D-135`). Nothing
else moves.

⛔ It also does not remove the EMPHASIS marks. 「**未定**」 inside a quote is
still inside the quote; ⛔ **未定** outside one is still an assertion. Only
the quotation delimiters decide.
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


def asserts_any(cell, phrases):
    """True when the cell says one of `phrases` IN ITS OWN VOICE."""
    spoken = outside_quotation(cell)
    return any(phrase in spoken for phrase in phrases)
