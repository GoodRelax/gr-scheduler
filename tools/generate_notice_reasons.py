# -*- coding: utf-8 -*-
"""Print the notice roster into src/ from its manuscript.

    python tools/generate_notice_reasons.py
    python tools/generate_notice_reasons.py --check

READS   docs/spec/_source/notice-reasons.json (tables T-233 and T-234, CR-712,
        JDG-1751) and the row ids of table T-220 (Chapter 6.1 of
        docs/spec/05-07-design.md), whose rows an import refusal carries as
        its reason (FR-076).
WRITES  the region of src/use-case/advance-screen-session/notice-values.ts
        that opens `// <generated -- do not edit by hand>` followed by the
        line naming notice-reasons.json, up to its `// </generated>`.

⭐ WHY THERE. The roster used to be a hand copy in the shell
(frame-loop.ts: `NoticeReason` and `NOTICE_MANNER_OF_REASON`, whose own TRAP
comment said a manner moved in table T-233 had to be copied by hand). The
notices region of the session is where the display of a reason is applied,
and the shell can import from it while the reverse is not allowed (table
T-061), so the region's unit holds the printed names.

⚠️ THE UNIT HOLDS TWO GENERATED REGIONS. tools/generate_state_machine_types.py
prints the other one, which names state-machines.json on the line after the
opening fence. Each generator finds its own region by that line and refuses
to run unless exactly one such region is in the file.

⛔ NO VALUE IS INVENTED HERE. Every row id and manner is the manuscript's.

⚠️ WAVE 1 OF CR-712 PRINTS WHAT src/ READS TODAY: the row unions,
`NoticeReason` and `NOTICE_MANNER_OF_REASON`. The `display` and `wordsOf`
of the manuscript are not printed yet -- check 30 (JDG-139) refuses a
generated constant exported for no reader, and wave 2 adds the reader.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_SOURCE = 'docs/spec/_source/notice-reasons.json'
REL_DESIGN = 'docs/spec/05-07-design.md'
REL_UNIT = 'src/use-case/advance-screen-session/notice-values.ts'
REL_SELF = 'tools/generate_notice_reasons.py'

OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
HEADER = '// From %s (tables T-233 and T-234) and the rows of table T-220.' % REL_SOURCE
REGION = re.compile(re.escape(OPEN) + r'\n' + re.escape(HEADER) + r'\n.*?'
                    + re.escape(CLOSE), re.S)

INVARIANT_CAPTION = u'**表 T-220 —'
INVARIANT_ROW = re.compile(r'^\| (IV-\d+) \|')
CAPTION = u'**表 '

MANNER = re.compile(r'^NT-(\d+)([a-z]?)$')


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def invariant_rows():
    """The row ids of table T-220 in its printed order.

    @purity semi-pure-b
    """
    lines = io.open(path_of(REL_DESIGN), encoding='utf-8', newline='').read() \
        .replace('\r\n', '\n').split('\n')
    found = []
    inside = False
    for line in lines:
        if line.startswith(INVARIANT_CAPTION):
            inside = True
            continue
        if inside and line.startswith(CAPTION):
            break
        if inside:
            hit = INVARIANT_ROW.match(line)
            if hit:
                found.append(hit.group(1))
    if not found:
        raise SystemExit('%s: table T-220 has no rows -- the caption or the '
                         'row shape moved' % REL_DESIGN)
    return found


def union(name, members, see):
    out = ['// see %s' % see, 'export type %s =' % name]
    out += ["  | '%s'" % one for one in members]
    return out


def record(name, key_type, value_type, pairs, see):
    out = ['// see %s' % see,
           'export const %s: Readonly<Record<%s, %s>> = {' % (name, key_type, value_type)]
    out += ["  '%s': '%s'," % pair for pair in pairs]
    out.append('}')
    return out


def manner_order(manner):
    hit = MANNER.match(manner)
    if not hit:
        raise SystemExit('%s: %r is no row id of table T-037' % (REL_SOURCE, manner))
    return (int(hit.group(1)), hit.group(2))


def block(doc, invariants):
    """The region, fences included, as the unit holds it."""
    reasons = doc['reasons']
    family = doc['invariantRefusals']
    reason_ids = [one['id'] for one in reasons]
    manners = sorted(set([one['manner'] for one in reasons] + [family['manner']]),
                     key=manner_order)
    # WHY: CR-712 wave 1 prints only what src/ reads today (JDG-139 refuses
    # an exported generated constant nobody imports); the display of a
    # reason, the row whose words it shares and the display of a question
    # join with the wave that reads them.
    sections = [
        union('ReasonRow', reason_ids, 'T-233'),
        union('InvariantRow', invariants, 'T-220'),
        ['// see FR-076', 'export type NoticeReason = ReasonRow | InvariantRow'],
        union('NoticeManner', manners, 'T-037'),
        record('NOTICE_MANNER_OF_REASON', 'NoticeReason', 'NoticeManner',
               [(one['id'], one['manner']) for one in reasons]
               + [(row, family['manner']) for row in invariants], 'T-233, T-037'),
    ]
    out = [OPEN, HEADER, '// Rebuild: npm run gen (%s).' % REL_SELF]
    for section in sections:
        out.append('')
        out += section
    out.append(CLOSE)
    return '\n'.join(out)


def rewritten(path, wanted):
    """The unit's text with its region replaced, or None when it has none."""
    body = io.open(path, encoding='utf-8', newline='').read()
    ending = '\r\n' if body.count('\r\n') * 2 > body.count('\n') else '\n'
    text = body.replace('\r\n', '\n')
    if len(REGION.findall(text)) != 1:
        return body, None
    text = REGION.sub(lambda _m: wanted, text)
    return body, text.replace('\n', ending)


def main(argv):
    unknown = [one for one in argv if one != '--check']
    if unknown:
        say('unknown argument(s): %s -- nothing was written. Known: --check'
            % ' '.join(unknown))
        return 2
    check = '--check' in argv
    with io.open(path_of(REL_SOURCE), encoding='utf-8') as handle:
        doc = json.load(handle)
    current, wanted = rewritten(path_of(REL_UNIT), block(doc, invariant_rows()))
    if wanted is None:
        say('FAIL     %s holds no single region opening %s and %s'
            % (REL_UNIT, OPEN, HEADER))
        return 1
    counts = '%d reason(s), %d question(s)' % (len(doc['reasons']),
                                               len(doc['questions']))
    if current == wanted:
        say('OK       %s matches notice-reasons.json (%s)' % (REL_UNIT, counts))
        return 0
    if check:
        say('FAIL     %s differs from notice-reasons.json -- run npm run gen'
            % REL_UNIT)
        return 1
    io.open(path_of(REL_UNIT), 'w', encoding='utf-8', newline='').write(wanted)
    say('wrote    %s (%s)' % (REL_UNIT, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
