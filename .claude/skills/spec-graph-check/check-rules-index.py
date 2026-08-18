# -*- coding: utf-8 -*-
"""Check 26: the rule index is honest, so reading it is enough.

⭐ docs/development-rules/README.md is the FIRST thing a session is told to
open, and check.sh prints it before anything else. Both of those are worth
nothing if the index has drifted from the folder: a rule file nobody links to
is a rule nobody reads, and a link that does not resolve teaches the reader
that the index is unreliable, after which they stop opening it.

⚠️ This cannot check that anyone READ them. What it can do is keep the entry
point true, which is the half a machine can hold against reality -- the same
split check 22 makes for change requests.

    python check-rules-index.py

⛔ Deliberately NOT checked: what the rules say. A check that read the clauses
would need a second copy of the very thing that must not be copied.

⚠️ 07 and 08 moved into this folder on 2026-08-19 (CR-190), so all eight are
originals now. 08 is a folder rather than a file: the index only has to name
it, and it answers for its own contents.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RULES = os.path.join(ROOT, 'docs', 'development-rules')

# A rule is numbered: the number is what the index and every citation ("rule
# 05 of docs/development-rules") use to point at it. ⚠️ One of them is a
# FOLDER -- 08 is the spec-writing kit, which is five files and cannot be one.
NUMBERED = re.compile(r'^(\d\d)-[a-z0-9-]+(?:\.md)?$')
# A markdown link to a path, which is what has to resolve.
LINK = re.compile(r'\[[^\]]*\]\(([^)#]+?)(?:#[^)]*)?\)')


def problems_of():
    out = []
    if not os.path.isdir(RULES):
        return ['docs/development-rules/ is missing -- the rules have no home']

    on_disk = {}
    for name in sorted(os.listdir(RULES)):
        found = NUMBERED.match(name)
        if found:
            on_disk[found.group(1)] = name

    index_path = os.path.join(RULES, 'README.md')
    if not os.path.exists(index_path):
        return ['docs/development-rules/README.md is missing -- there is no index']
    index = io.open(index_path, encoding='utf-8').read()

    linked = set(LINK.findall(index))
    for number, name in sorted(on_disk.items()):
        wanted = name + '/' if os.path.isdir(os.path.join(RULES, name)) else name
        if wanted not in linked and name not in linked:
            out.append('docs/development-rules/%s is not linked from README.md -- '
                       'a rule the index does not name is one nobody opens' % name)
        if number not in index:
            out.append('README.md does not carry the number %s, which is how every '
                       'citation points at %s' % (number, name))

    # Every link in the index AND in the rules themselves has to resolve. A
    # rule that points at a moved file sends the reader nowhere, and the
    # reader concludes the folder is stale.
    for name in sorted(list(on_disk.values()) + ['README.md']):
        whole = os.path.join(RULES, name)
        if os.path.isdir(whole):
            # A numbered folder answers for its own contents; the index only
            # has to name it. Sweeping every link inside the imported kit
            # would fail on documents this project never brought over.
            continue
        body = io.open(whole, encoding='utf-8').read()
        for target in LINK.findall(body):
            if target.startswith(('http://', 'https://', 'mailto:')):
                continue
            resolved = os.path.normpath(os.path.join(RULES, target))
            if not os.path.exists(resolved):
                out.append('docs/development-rules/%s links to %r, which is not there'
                           % (name, target))
    return out


def main():
    out = problems_of()
    if out:
        for one in out:
            sys.stdout.write('PROBLEM  %s\n' % one)
        return 1
    # ⭐ Print what was just verified. A session runs check.sh before it opens
    # anything else, so the index arrives at the moment the work starts rather
    # than sitting in a file that may not be opened. ⛔ The lines are READ from
    # README.md -- nothing here is a second copy of them.
    index = io.open(os.path.join(RULES, 'README.md'), encoding='utf-8').read()
    rows = re.findall(
        r'^\|\s*\*\*(\d\d)\*\*\s*\|\s*\[([^\]]*)\]\(([^)]*)\)([^|]*)\|',
        index, re.M)
    for number, title, path, rest in rows:
        gist = rest.strip().lstrip('—').strip()
        sys.stdout.write('   %s  %s   ->  docs/development-rules/%s\n'
                         % (number, title, path))
        if gist:
            sys.stdout.write('       %s\n' % gist[:100])
    sys.stdout.write('\n')
    sys.stdout.write('OK       the rule index names all %d rules and every link '
                     'in the folder resolves\n' % len(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main())
