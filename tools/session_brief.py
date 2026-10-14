# -*- coding: utf-8 -*-
"""Print the brief a new gr-scheduler session (a suggestion chip) gets, filled in.

    python tools/session_brief.py --task "one line" --bands JDG=2120-2139 DFC=2590-2599
                                  --owns tools/ docs/development-rules/
                                  [--other "cr-751: docs/spec/_source/"] ...
                                  [--base <sha>] [--port 5991] [--timebox "2h"]
                                  [--coordinator "<session name>"]

It prints tools/session-brief.md with its <<SLOTS>> filled, to paste as the
whole prompt of the chip, and exits 1 WITHOUT printing it when the task, a
band or the owned paths are missing, a band is malformed, two bands overlap,
or two owners claim overlapping paths (the overlap test of body_brief.py).

THE RULE (JDG-2125). The fixed part of the brief -- no stash, no `add -A`, no
junctions, the port, the privacy count, record every ruling, report and wait
-- was a file in a former coordinator's scratchpad, outside the repository,
copied and retyped by every new coordinator. Lines went missing: a session
ended with a ruling unrecorded and the user was asked the same question three
times (JDG-729, JDG-741, JDG-742). The text now lives in the repository and
this tool is the only way it is written into a brief.

WHAT IT CANNOT SEE: whether the task line is clear and the owned paths are the
right ones; and whether the coordinator used it (rule 05 section 13 says to).
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATE = os.path.join(HERE, 'session-brief.md')
BAND = re.compile(r'^([A-Z]+)=(\d+)-(\d+)$')
DEFAULT_PORT = '5991'
GATE_PORT = '5992'

sys.path.insert(0, HERE)
from body_brief import overlaps, values  # noqa: E402  -- one overlap test for bodies and sessions


def git(*args):
    return subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True,
                          text=True).stdout.strip()


def band_faults(bands):
    """Faults of the --bands values: the form PREFIX=low-high, low <= high, no two overlapping."""
    faults, seen = [], []
    for one in bands:
        found = BAND.match(one)
        if not found:
            faults.append('band %r is not PREFIX=low-high (e.g. JDG=2120-2139)' % one)
            continue
        prefix, low, high = found.group(1), int(found.group(2)), int(found.group(3))
        if low > high:
            faults.append('band %s runs backwards' % one)
        for other_prefix, other_low, other_high in seen:
            if other_prefix == prefix and low <= other_high and other_low <= high:
                faults.append('bands %s and %s=%d-%d overlap' % (one, other_prefix, other_low, other_high))
        seen.append((prefix, low, high))
    return faults


def fill(template, slots):
    # WHY first: the template's HTML comment is for its editors, not for the session, and it names
    # the slot syntax itself.
    text = re.sub(r'<!--.*?-->\n*', '', template, flags=re.S)
    for name, value in slots.items():
        text = text.replace('<<%s>>' % name, value)
    left = re.findall(r'<<[A-Z]+>>', text)
    if left:
        raise ValueError('template slot(s) not filled: %s' % ' '.join(sorted(set(left))))
    return text


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        sys.stdout.write(__doc__)
        return 0 if argv else 2
    task = ' '.join(values(argv, '--task'))
    bands = values(argv, '--bands')
    owns = values(argv, '--owns')
    faults = []
    if not task:
        faults.append('--task is required: one line saying what the session does and what done looks like')
    if not bands:
        faults.append('--bands is required: the id bands this session may use (PREFIX=low-high ...)')
    if not owns:
        faults.append('--owns is required: the files or folders this session may edit')
    faults += band_faults(bands)
    others = {}
    for one in values(argv, '--other'):
        name, _, paths = one.partition(':')
        others[name.strip()] = paths.split()
    faults += ['owners overlap: ' + one for one in overlaps(dict(others, this=owns))]
    port = (values(argv, '--port') or [DEFAULT_PORT])[0]
    if port == GATE_PORT:
        faults.append('port %s belongs to the coordinator\'s gate' % GATE_PORT)
    if faults:
        for one in faults:
            print('REFUSED  ' + one)
        print('no brief printed')
        return 1
    other_text = ('Others own, do not touch: ' + '; '.join(
        '%s: %s' % (name, ' '.join(paths)) for name, paths in sorted(others.items())) + '.') if others else ''
    slots = {
        'TASK': task,
        'BASE': (values(argv, '--base') or [git('rev-parse', 'HEAD')])[0],
        'BANDS': ' '.join(bands),
        'OWNS': ' '.join(owns),
        'OTHERS': other_text,
        'PORT': port,
        'TIMEBOX': ' '.join(values(argv, '--timebox')) or 'not given -- ask the coordinator if the work runs long',
        'COORDINATOR': ' '.join(values(argv, '--coordinator')) or 'the session that started you',
    }
    with open(TEMPLATE, encoding='utf-8') as handle:
        print(fill(handle.read(), slots).rstrip())
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
