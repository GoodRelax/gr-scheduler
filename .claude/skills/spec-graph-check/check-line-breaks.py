# -*- coding: utf-8 -*-
"""check 46 -- every sentence ends a line.

THE RULE

    Inside a table row, a sentence break is written `<br>`.
    Everywhere else it is written as a hard break: the line ends there.

WHY IT NEEDS A GATE

    The manuscript ran whole paragraphs and whole cells onto one source line,
    and the rendered page showed a dozen sentences crammed together. Wrapping
    it once fixes the page once; nothing stopped the next edit from writing
    another 900-character line, and three rounds in a row did exactly that.

WHAT COUNTS AS A SENTENCE END

    A full stop that is followed by more text on the same line. These are not
    sentence ends and are never faulted:

      - the last full stop of a line (the line already ends there)
      - one followed only by whitespace, or by the cell's closing `|`
      - one inside a fenced block, a heading, or a link/path such as `a.b.c`
        (only the CJK full stop is read, so an ASCII dot never counts)

WHAT A SENTENCE END MUST CARRY

      - in a table row: `<br>` immediately after it
      - outside a table: nothing else on the line, except a closing `**` that
        the sentence's own emphasis needs. A closer cannot start a line -- the
        renderer will not accept it -- so it may end one.

WHAT IS EXEMPT, AND WHY IT IS MEASURED RATHER THAN DECLARED

    Two things, and both are looked up rather than listed.

    A sentence end inside a quotation the manuscript itself writes -- 「A。B」 --
    is not a place to break: a break inside a verbatim is what ruling JDG-05's
    own check catches.

    A sentence end inside a run that some file under `src/` or `tests/` quotes
    verbatim. Those files read the manuscript back at run time and compare
    bytes; a break inside one of their quotations turns the test red. The
    exemption is not a list someone maintains -- the run has to actually be
    there, found the way check 42 finds it (emphasis, backticks and spaces
    removed from both sides before comparing).

WHAT IT CANNOT SEE

    Whether the sentences are worth reading, and whether the break lands
    somewhere a person would have chosen. It counts full stops.

    It also cannot see a paragraph that SHOULD be two paragraphs. A blank line
    is the author's call and nothing here faults its absence.

USAGE

    python .claude/skills/spec-graph-check/check-line-breaks.py
    python .claude/skills/spec-graph-check/check-line-breaks.py --list
    python .claude/skills/spec-graph-check/check-line-breaks.py --write-baseline
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BASELINE = os.path.join(HERE, 'line-break-baseline.txt')

BOOKS = [
    'docs/spec/01-04-requirements.md',
    'docs/spec/05-07-design.md',
    'docs/spec/08-10-test.md',
    'docs/spec/A-appendix.md',
    'docs/spec/_assets/tbl-settings.md',
    'docs/spec/_assets/tbl-glossary.md',
    'docs/spec/_assets/tbl-property-items.md',
]
TREES = ('src', 'tests')

STOP = u'。'
NOISE = re.compile(u'[*`⭐⚠⛔️　\\s]+')
RUN = re.compile(u'[ぁ-鿿][^\n\'"]{19,}')
K = 8


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def flatten(text):
    """check 42's view of a text, and where each surviving character came from."""
    keep = [i for i, c in enumerate(text) if not NOISE.match(c)]
    return u''.join(text[i] for i in keep), keep


def _checker():
    """check 42's module, so its own extraction is used and not imitated."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'q', os.path.join(HERE, 'check-quoted-source.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def quoted_runs():
    """Every Japanese run the product's own files hold, filed by its first
    few flattened characters so a line can be matched in one sweep.

    Two kinds: a run inside a string literal, which `RUN` finds; and a
    quotation a COMMENT carries, which may be wrapped over several comment
    lines and so is taken from check 42's own extractor."""
    index = {}
    check = _checker()
    for path in check.sources():
        text = io.open(path, encoding='utf-8', errors='replace').read()
        for block in check.comment_blocks(text):
            for quote in check.QUOTED.findall(block):
                for part in check.ELISION.split(quote):
                    flat, _keep = flatten(part)
                    if len(flat) >= K:
                        index.setdefault(flat[:K], []).append(flat)
    for tree in TREES:
        for base, dirs, names in os.walk(os.path.join(ROOT, tree)):
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for name in sorted(names):
                if not name.endswith(('.ts', '.tsx', '.mjs')):
                    continue
                text = io.open(os.path.join(base, name), encoding='utf-8',
                               errors='replace').read()
                for run in RUN.findall(text):
                    flat, _keep = flatten(run)
                    if len(flat) >= K:
                        index.setdefault(flat[:K], []).append(flat)
    return index


def spans(line, index):
    """Where in this line a quoted run sits."""
    flat, keep = flatten(line)
    out = []
    for i in range(len(flat) - K + 1):
        for run in index.get(flat[i:i + K], ()):
            if flat.startswith(run, i):
                out.append((keep[i], keep[i + len(run) - 1] + 1))
    return out


OPEN_QUOTE = u'「『'
SHUT_QUOTE = u'」』'


def ends(line):
    """Every full stop on this line that more text follows.

    ⛔ One inside 「…」 is not a place to break: splitting a verbatim there
    is the defect ruling JDG-05's check exists to catch."""
    out = []
    depth = 0
    for i, ch in enumerate(line):
        if ch in OPEN_QUOTE:
            depth += 1
            continue
        if ch in SHUT_QUOTE:
            depth = max(0, depth - 1)
            continue
        if ch != STOP or depth:
            continue
        at = i + 1
        rest = line[at:]
        if not rest.strip() or rest.lstrip().startswith('|'):
            continue
        out.append(at)
    return out


def carried(line, at, in_row):
    """Does the sentence end at `at` carry its break?"""
    rest = line[at:]
    if in_row:
        return rest[:4].lower() == '<br>'
    # Outside a table the line ends here -- a closing ** may come first.
    if rest.lstrip().startswith('**'):
        rest = rest[rest.index('**') + 2:]
    return not rest.strip()


def scan():
    index = quoted_runs()
    found = {}
    for rel in BOOKS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        lines = io.open(path, encoding='utf-8').read().split('\n')
        fenced = False
        open_ends = []
        for n, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('```'):
                fenced = not fenced
                continue
            if fenced or not stripped or stripped.startswith('#'):
                continue
            in_row = stripped.startswith('|')
            at_list = ends(line)
            if not at_list:
                continue
            where = spans(line, index) if at_list else []
            for at in at_list:
                if carried(line, at, in_row):
                    continue
                why = 'quoted' if any(a < at <= b for a, b in where) else 'open'
                open_ends.append((n, at, why, line[max(0, at - 26):at]))
        found[rel] = open_ends
    return found


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    out = {}
    for row in io.open(BASELINE, encoding='utf-8'):
        row = row.strip()
        if not row or row.startswith('#'):
            continue
        name, count = row.rsplit(None, 1)
        out[name] = int(count)
    return out


def main():
    found = scan()
    total = sum(len(v) for v in found.values())
    quoted = sum(1 for v in found.values() for row in v if row[2] == 'quoted')

    if '--list' in sys.argv:
        for rel, rows in found.items():
            for n, at, why, before in rows:
                say(u'%s:%d  %-6s ...%s%s' % (rel.split('/')[-1], n, why, before, STOP))

    if '--write-baseline' in sys.argv:
        with io.open(BASELINE, 'w', encoding='utf-8', newline='') as out:
            out.write(u'# check 46 -- sentence ends that carry no break, per file.\n')
            out.write(u'# The rule and the exemption are in check-line-breaks.py.\n')
            out.write(u'# This may go DOWN freely; a rise has to be explained.\n')
            for rel in BOOKS:
                out.write(u'%s %d\n' % (rel, len(found.get(rel, []))))
        say(u'WROTE    %s: %d sentence end(s) still open'
            % (os.path.relpath(BASELINE, ROOT).replace('\\', '/'), total))
        return 0

    base = read_baseline()
    if base is None:
        say(u'PROBLEM  no baseline yet -- run with --write-baseline')
        return 1

    worse = []
    for rel in BOOKS:
        now = len(found.get(rel, []))
        was = base.get(rel)
        if was is None:
            worse.append((rel, 0, now))
        elif now > was:
            worse.append((rel, was, now))
    if worse:
        for rel, was, now in worse:
            say(u'FAIL     %s: %d sentence end(s) carry no break, up from %d.'
                % (rel, now, was))
        say(u'         ⛔ A sentence ends a line: `<br>` inside a table row, a hard')
        say(u'         break outside one. Run with --list to see them. If the new one')
        say(u'         is a quotation some test reads back, say so and raise the')
        say(u'         baseline deliberately.')
        return 1

    say(u'OK       %d sentence end(s) carry no break (%d of them inside a quotation '
        u'a test reads), which is the baseline' % (total, quoted))
    return 0


if __name__ == '__main__':
    sys.exit(main())
