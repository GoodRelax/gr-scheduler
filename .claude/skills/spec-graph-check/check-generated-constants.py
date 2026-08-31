"""Check 30 -- the list of generated constants against the tree.

`docs/development-rules/03-implementation.md` names every constant that is
generated from a manuscript, and asks whoever adds one to add it there too.
That list drifted three times (2026-08-26 twice, 2026-08-31 once), the last
time by nine names, and each time it was a person who noticed rather than a
machine. A rule no machine reads is a rule that is not followed, so this reads
it.

The counting rule is the one the note itself states: every `export const` that
sits inside a generated block of `src/`. The blocks are fenced by the marker
the generators write, `// <generated -- do not edit by hand>` ... `//
</generated>`, so nothing outside a generated block is counted and no
generator has to be re-run to answer the question.

Usage:
    python check-generated-constants.py [repo-root]
"""
import os
import re
import sys

RULES = os.path.join('docs', 'development-rules', '03-implementation.md')

BLOCK = re.compile(
    r'// <generated -- do not edit by hand>(.*?)// </generated>',
    re.S,
)
EXPORTED = re.compile(r'^export const ([A-Za-z_][A-Za-z0-9_]*)', re.M)

# One line of the list: the name at the left margin, then its description.
# The longest name is followed by a single space, so one is enough.
LISTED = re.compile(r'^([A-Z][A-Z0-9_]*) +\S', re.M)


def read(path):
    with open(path, encoding='utf-8', errors='replace') as handle:
        return handle.read()


def in_the_tree(root):
    """Every generated `export const`, and the file each one sits in."""
    where = {}
    for folder, _, files in os.walk(os.path.join(root, 'src')):
        for name in sorted(files):
            if not name.endswith('.ts'):
                continue
            path = os.path.join(folder, name)
            for block in BLOCK.findall(read(path)):
                for found in EXPORTED.finditer(block):
                    where[found.group(1)] = os.path.relpath(path, root)
    return where


def in_the_list(root):
    return set(LISTED.findall(read(os.path.join(root, RULES))))


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    tree = in_the_tree(root)
    listed = in_the_list(root)

    missing = sorted(set(tree) - listed)
    stale = sorted(listed - set(tree))

    if not missing and not stale:
        print('OK       %d generated constant(s) in src/ and the list in %s '
              'name the same set' % (len(tree), RULES))
        return 0

    for name in missing:
        print('FAIL     %s is generated in %s and the list in %s does not '
              'name it' % (name, tree[name], RULES))
    for name in stale:
        print('FAIL     the list in %s names %s and no generated block in '
              'src/ declares it' % (RULES, name))
    print('FAIL     the tree holds %d, the list names %d'
          % (len(tree), len(listed)))
    return 1


sys.exit(main())
