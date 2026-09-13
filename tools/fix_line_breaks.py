# -*- coding: utf-8 -*-
"""Put every sentence of docs/spec on a line of its own -- the repair for check 46.

check 46 (`.claude/skills/spec-graph-check/check-line-breaks.py`) faults a
sentence that does not end its line. This is the tool that fixes what it
faults, so a red check has a hand to answer it with.

THE RULE IT APPLIES

    Inside a table row a sentence break is written `<br>`; a row is one line,
    so that is the only break a cell can carry.
    Everywhere else the line ends: two trailing spaces.

WHAT IT WILL NOT BREAK, EACH LEARNED BY BREAKING IT

    - A full stop inside a quotation the manuscript writes -- 「A。B」. Ruling
      JDG-05's own check catches a verbatim split there.
    - A full stop the line already ends on, or one followed only by emphasis
      markers. Splitting there leaves a whitespace-only line, which markdown
      reads as BLANK: the paragraph splits and every bold run open across it
      dies.
    - A line directly under a table row. Markdown absorbs it into the table,
      and splitting turns one phantom row into eight (表 T-037).
    - A point in front of a CLOSING `**`. The renderer will not accept a
      closer at the start of a line, so the break moves PAST it instead.
    - A run some file under src/ or tests/ quotes verbatim, when `--protect`
      names that file. Those files read the manuscript back at run time.

HOW IT KNOWS IT DID NO HARM

    It does not guess which quotations matter. It wraps, asks check 42 what
    broke, gives up the lines that broke it, and repeats until check 42 is
    back at its baseline. Guessing was tried twice and failed twice.

    ⛔ check 42 is the only oracle it has. Run `npx vitest run` afterwards --
    a test reading the manuscript is not check 42's business.

NOTE ON NON-ASCII: the patterns hold Japanese characters because the
specification is written in Japanese; those code points are data.

USAGE

    python tools/fix_line_breaks.py docs/spec/01-04-requirements.md ...
    python tools/fix_line_breaks.py --all
    python tools/fix_line_breaks.py --all --protect=tests/unit/some.test.ts
"""
import importlib.util
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CHECKER = os.path.join(ROOT, '.claude', 'skills', 'spec-graph-check',
                       'check-quoted-source.py')

BOOKS = [
    'docs/spec/01-04-requirements.md',
    'docs/spec/05-07-design.md',
    'docs/spec/08-10-test.md',
    'docs/spec/A-appendix.md',
    'docs/spec/_assets/tbl-glossary.md',
]

STOP = u'。'
QUOTE_OPEN = u'「『'
QUOTE_SHUT = u'」』'
FIELD = re.compile(r'^\*\*[A-Za-z][A-Za-z0-9 _-]{0,30}\*\*:')
RUN = re.compile(u'[ぁ-鿿][^\n\'"]{19,}')
ROUNDS = 12
K = 8

PROTECT = []
_INDEX = {}
_SPANS = {}


# --------------------------------------------------------------- check 42

def _checker():
    spec = importlib.util.spec_from_file_location('quoted', CHECKER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CHECK = _checker()


def unsourced():
    """What check 42 faults right now, as a set."""
    return {tuple(str(x) for x in row[:2]) for row in CHECK.find_unsourced()}


def flat(text):
    """check 42's view of a text, and where each surviving character came from."""
    keep = [i for i, c in enumerate(text) if not CHECK.NOISE.match(c)]
    return u''.join(text[i] for i in keep), keep


def index_protected():
    for run in PROTECT:
        one = CHECK.flatten(run)
        if len(one) >= K:
            _INDEX.setdefault(one[:K], []).append(one)


def spans(line):
    """Where in this line a protected run sits, measured as check 42 measures it."""
    if line in _SPANS:
        return _SPANS[line]
    text, keep = flat(line)
    out = []
    for i in range(len(text) - K + 1):
        for run in _INDEX.get(text[i:i + K], ()):
            if text.startswith(run, i):
                out.append((keep[i], keep[i + len(run) - 1] + 1))
    _SPANS[line] = out
    return out


# --------------------------------------------------------------- the rule

def break_points(line, in_row, carry):
    """Every place this line may be broken."""
    out, quoted = [], 0
    for i, ch in enumerate(line):
        if ch in QUOTE_OPEN:
            quoted += 1
            continue
        if ch in QUOTE_SHUT:
            quoted = max(0, quoted - 1)
            continue
        if ch != STOP or quoted:
            continue
        at = i + 1
        if line[at:at + 4].lower() == '<br>':
            continue
        rest = line[at:]
        if not in_row and rest.lstrip().startswith('**') \
                and (carry + line[:at].count('**')) % 2:
            at = line.index('**', at) + 2
            rest = line[at:]
        if not rest.strip() or not rest.strip().strip('*'):
            continue
        if rest.lstrip().startswith('|'):
            continue
        if any(a < at <= b for a, b in spans(line)):
            continue
        out.append(at)
    return out


def broken(line, carry):
    """The pieces this line becomes, or [line] when it is left alone."""
    stripped = line.strip()
    if not stripped or stripped.startswith('#'):
        return [line]
    in_row = stripped.startswith('|')
    spots = break_points(line, in_row, carry)
    if not spots:
        return [line]
    pieces, previous = [], 0
    for at in spots:
        pieces.append(line[previous:at])
        previous = at
    pieces.append(line[previous:])
    pieces = [p for p in pieces if p]
    if len(pieces) < 2:
        return [line]
    if in_row:
        return ['<br>'.join(pieces)]
    lead = re.match(r'^(\s*(?:>\s*)+|\s+)', line)
    prefix = ''
    if lead:
        prefix = (lead.group(1) if lead.group(1).lstrip().startswith('>')
                  else ' ' * len(lead.group(1)))
    # A piece begins right after the full stop and may start with the space the
    # author wrote there. Keep it: the break must not EAT a character, or the
    # text no longer joins back to what it was.
    keep = prefix == '' or prefix.lstrip().startswith('>')
    out = [pieces[0] + '  ']
    for piece in pieces[1:-1]:
        out.append(prefix + (piece if keep else piece.lstrip()) + '  ')
    out.append(prefix + (pieces[-1] if keep else pieces[-1].lstrip()))
    return out


def carries(lines):
    """The ** parity each line starts with.

    A soft-wrapped paragraph is ONE paragraph, so a bold run opened on one line
    closes on another. Counting per line put 22 asterisk pairs on the page.
    """
    out, carry = {}, 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or stripped.startswith(('#', '|', '```')):
            carry = 0
        out[i] = carry
        carry = (carry + line.count('**')) % 2
    return out


# --------------------------------------------------------------- the phases

def joined(lines):
    """Undo the manuscript's own soft wrapping, one paragraph at a time.

    Markdown reads a soft line end as a SPACE, so a sentence that straddles one
    runs into the next on the page. Splitting inside a line cannot fix that --
    the paragraph has to be one line first.
    """
    plain = re.compile(r'^(?![ \t>#|]|[-*+] |\d+[.)] |```)\S')
    out, fenced = [], False
    for line in lines:
        if line.lstrip().startswith('```'):
            fenced = not fenced
            out.append(line)
            continue
        if (not fenced and out and line and plain.match(line)
                and plain.match(out[-1] or ' ')
                and not FIELD.match(line)
                and not out[-1].endswith('  ')):
            # Japanese needs no space at the seam; two ASCII words do.
            gap = ' ' if (out[-1][-1].isalnum() and line[0].isalnum()) else ''
            out[-1] = out[-1] + gap + line
            continue
        out.append(line)
    return out


def rendered(lines, allowed, carry):
    out, fenced, under_a_row = [], False, False
    for i, line in enumerate(lines):
        if line.lstrip().startswith('```'):
            fenced = not fenced
            out.append(line)
            under_a_row = False
            continue
        if under_a_row and line.strip() and not line.lstrip().startswith('|'):
            # Markdown absorbs this line into the table above it.
            out.append(line)
            under_a_row = False
            continue
        under_a_row = line.lstrip().startswith('|') and not fenced
        out += (broken(line, carry[i]) if (not fenced and i in allowed) else [line])
    return '\n'.join(out)


def mend(text):
    """What has to happen after a break, wherever a break was made."""
    text = text.replace('****', '')
    # ⛔ A <br> inside 「…」 splits a verbatim. Ruling JDG-05's check catches it.
    text, _n = re.subn(u'「[^「」\n]{0,600}」',
                       lambda m: m.group(0).replace('<br>', ''), text)
    return text


# --------------------------------------------------------------- the run

def repair(path, baseline):
    raw = io.open(path, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    lines = joined(raw.replace('\r\n', '\n').split('\n'))
    carry = carries(lines)
    allowed = {i for i, line in enumerate(lines)
               if len(broken(line, carry[i])) > 1
               or (line.lstrip().startswith('|') and broken(line, carry[i])[0] != line)}
    seen = set()
    for round_no in range(1, ROUNDS):
        body = mend(rendered(lines, allowed, carry))
        io.open(path, 'w', encoding='utf-8',
                newline='').write(body.replace('\n', '\r\n') if crlf else body)
        new = unsourced() - baseline
        if not new:
            return len(allowed), round_no
        # ⛔ The checker names the quotation that broke. Guard THAT run, so the
        # rest of the line may still break; give the line up only when the run
        # cannot be located in it, or when guarding it did not help.
        for _who, fragment in sorted(new):
            parts = [p for p in re.split(u'…+|\\.\\.\\.', fragment)
                     if len(CHECK.flatten(p)) >= K] or [fragment]
            stubborn = fragment in seen
            seen.add(fragment)
            for part in parts:
                one = CHECK.flatten(part)
                if len(one) >= K:
                    _INDEX.setdefault(one[:K], []).append(one)
            _SPANS.clear()
            for part in parts:
                one = CHECK.flatten(part)
                probe = one[:20]
                for i in sorted(allowed):
                    seen_in = CHECK.flatten(lines[i])
                    if not probe or probe not in seen_in:
                        continue
                    if one not in seen_in or stubborn:
                        allowed.discard(i)
                    break
    return len(allowed), ROUNDS


def main(argv):
    paths = []
    for arg in argv:
        if arg == '--all':
            paths += [p for p in BOOKS if os.path.exists(os.path.join(ROOT, p))]
        elif arg.startswith('--protect='):
            PROTECT.extend(RUN.findall(io.open(arg.split('=', 1)[1],
                                               encoding='utf-8',
                                               errors='replace').read()))
        elif not arg.startswith('--'):
            paths.append(arg)
    if not paths:
        sys.stdout.write(__doc__.split('USAGE')[-1].strip() + '\n')
        return 2
    index_protected()
    baseline = unsourced()
    print('check 42 baseline: %d quotation(s) with no source' % len(baseline))
    for path in paths:
        wrapped, rounds = repair(path, baseline)
        print('%-34s %4d line(s) wrapped, %d round(s)'
              % (os.path.basename(path), wrapped, rounds))
    left = unsourced() - baseline
    if left:
        print('⛔ check 42 moved: %d quotation(s) newly unsourced' % len(left))
        return 1
    print('check 42 is back at its baseline. ⛔ Now run: npx vitest run')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
