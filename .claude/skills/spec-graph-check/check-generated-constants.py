"""Check 30 -- the generated constants: the list that names them, and who may see them.

Everything here is read off the tree. No generator is run, so a stale artifact
does not change the answer (check 20 is the one that compares an artifact with
its manuscript).

1. THE LIST. `docs/development-rules/03-implementation.md` names every constant
   that is generated from a manuscript, and asks whoever adds one to add it
   there too. A hand-kept list drifts, and without a check it is a person who
   notices rather than a machine, so this reads it.
   Counted: every `const` at the left margin of a generated block of `src/`,
   EXPORTED OR NOT. JDG-139 takes `export` off most of them, and a constant
   does not stop being generated because nothing outside its file reads it.
   The blocks are fenced by the marker the generators write,
   `// <generated -- do not edit by hand>` ... `// </generated>`.

2. THE PUBLIC FACE (JDG-139, the user's ruling of 2026-09-16). A generated
   constant is exported ONLY when another file reads it. Judged per COPY --
   a (file, constant) pair -- because one row of a settings table is printed
   into every unit that consumes it, and each copy has its own readers:
   a. an exported copy that no OTHER file of READERS_THAT_PUBLISH imports is
      red. Stage 1 of the ruling counts src/ and tests/; stage 3 narrows it to
      src/ once the tests that read constants read the settings table instead;
   b. a copy that another file of src/ or tests/ reads, and that is not
      exported, is red. tsc refuses a named import of it, but NOT a namespace
      read by a string key -- `(ns as Record<string, unknown>)['NAME']` is
      `undefined` at run time and nothing says so;
   c. the list that decides it (PUBLISHED_READ_BY_SRC and
      PUBLISHED_READ_BY_TESTS_ONLY in tools/generate_entity_types.py) agrees
      with the tree, names only copies that exist, and puts each entry in the
      group its readers put it in: READ_BY_SRC needs a reader in src/,
      READ_BY_TESTS_ONLY needs a reader in tests/ and none in src/.

What counts as a read of copy (F, NAME) by another file G of src/ or tests/:
   - `import { NAME } from '<F>'`, with `type`, an alias or a default beside it;
   - `export { NAME } from '<F>'` (G re-publishes it, so F has to export it);
   - `import * as ns from '<F>'` and then `ns.NAME` or `ns['NAME']`, a cast
     between the two allowed;
   - `import('<F>')` anywhere in G, with NAME written anywhere in G;
   - a read of (G, NAME) when G says `export * from '<F>'`.
Only relative specifiers are resolved. `Object.keys(ns)` reads no name, so an
enumeration of a unit's exports is not a read of any one of them.

NOT COVERED: a test that reads a source file as TEXT and looks for
`export const NAME` in it is not an import and is not seen here.

Usage:
    python check-generated-constants.py [repo-root]
    python check-generated-constants.py --self-test    break a tree held in memory
"""

import os
import re
import sys

RULES = 'docs/development-rules/03-implementation.md'
GENERATOR = os.path.join('tools', 'generate_entity_types.py')

# Stage 1 of JDG-139. Stage 3 sets this to ('src',).
READERS_THAT_PUBLISH = ('src', 'tests')
# Where a read of a copy is looked for, whatever the stage: a read that the
# stage no longer publishes for is still a read, and rule 2b still holds.
READERS_SEEN = ('src', 'tests')

BLOCK = re.compile(
    r'// <generated -- do not edit by hand>(.*?)// </generated>',
    re.S,
)
GENERATED_CONST = re.compile(r'^(export )?const ([A-Za-z_][A-Za-z0-9_]*)', re.M)

# One line of the list: the name at the left margin, then its description.
# The longest name is followed by a single space, so one is enough.
LISTED = re.compile(r'^([A-Z][A-Z0-9_]*) +\S', re.M)

SPEC = r'[\'"]([^\'"]+)[\'"]'
NAMED_IMPORT = re.compile(
    r'(?:^|\n)[ \t]*import[ \t]+(?:type[ \t]+)?(?:[A-Za-z_$][\w$]*[ \t]*,[ \t]*)?'
    r'\{([^}]*)\}\s*from\s*' + SPEC)
NAMED_REEXPORT = re.compile(
    r'(?:^|\n)[ \t]*export[ \t]+(?:type[ \t]+)?\{([^}]*)\}\s*from\s*' + SPEC)
STAR_REEXPORT = re.compile(r'(?:^|\n)[ \t]*export[ \t]+\*[ \t]+from\s*' + SPEC)
NAMESPACE_IMPORT = re.compile(
    r'(?:^|\n)[ \t]*import[ \t]+(?:type[ \t]+)?\*[ \t]+as[ \t]+([A-Za-z_$][\w$]*)'
    r'\s*from\s*' + SPEC)
DYNAMIC_IMPORT = re.compile(r'\bimport\(\s*' + SPEC + r'\s*\)')


def say(message):
    sys.stdout.write(message + '\n')


def read(path):
    with open(path, encoding='utf-8', errors='replace') as handle:
        return handle.read()


def tree_of(root, tops):
    """Every TypeScript file under the given top folders, by forward-slash path."""
    files = {}
    for top in tops:
        for folder, dirs, names in os.walk(os.path.join(root, top)):
            dirs[:] = [one for one in dirs if one != 'node_modules']
            for name in sorted(names):
                if name.endswith(('.ts', '.tsx', '.mts')):
                    path = os.path.join(folder, name)
                    rel = os.path.relpath(path, root).replace('\\', '/')
                    files[rel] = read(path)
    return files


def generated_copies(files):
    """Every generated const of src/: {(file, name): exported}."""
    copies = {}
    for rel, text in sorted(files.items()):
        if not rel.startswith('src/'):
            continue
        for block in BLOCK.findall(text):
            for found in GENERATED_CONST.finditer(block):
                copies[(rel, found.group(2))] = bool(found.group(1))
    return copies


def resolve(files, importer, specifier):
    """The file a relative specifier lands on, or None."""
    if not specifier.startswith('.'):
        return None
    base = os.path.normpath(
        os.path.join(os.path.dirname(importer), specifier)).replace('\\', '/')
    candidates = [base]
    if base.endswith('.js'):
        candidates.append(base[:-3] + '.ts')
    candidates += [base + '.ts', base + '.tsx', base + '.mts', base + '/index.ts']
    for candidate in candidates:
        if candidate in files:
            return candidate
    return None


def imported_names(braces):
    """The ORIGINAL names inside `{ ... }` of an import or a re-export."""
    braces = re.sub(r'/\*.*?\*/', '', braces, flags=re.S)
    braces = re.sub(r'//[^\n]*', '', braces)
    names = []
    for piece in braces.split(','):
        piece = re.sub(r'^\s*type\s+', '', piece).strip()
        if piece:
            names.append(re.split(r'\s+as\s+', piece)[0].strip())
    return names


def namespace_reads(text, namespace, name):
    """True when `namespace.name` or `namespace['name']` is written in text."""
    head = r'\b%s\b\s*\)?\s*(?:as\s[^;\n]*?\)\s*)?' % re.escape(namespace)
    dotted = re.compile(head + r'(?:\?\.|\.)\s*%s\b' % re.escape(name))
    keyed = re.compile(head + r'(?:\?\.)?\[\s*([\'"`])%s\1\s*\]' % re.escape(name))
    return bool(dotted.search(text) or keyed.search(text))


def readers_of(files, copies):
    """{(file, name): set of OTHER files that read that copy}."""
    named = {}
    stars = {}
    namespaces = {}
    dynamics = {}
    for rel, text in files.items():
        for found in NAMED_IMPORT.finditer(text):
            target = resolve(files, rel, found.group(2))
            for name in imported_names(found.group(1)) if target else []:
                named.setdefault((target, name), set()).add(rel)
        for found in NAMED_REEXPORT.finditer(text):
            target = resolve(files, rel, found.group(2))
            for name in imported_names(found.group(1)) if target else []:
                named.setdefault((target, name), set()).add(rel)
        for found in STAR_REEXPORT.finditer(text):
            target = resolve(files, rel, found.group(1))
            if target:
                stars.setdefault(target, set()).add(rel)
        for found in NAMESPACE_IMPORT.finditer(text):
            target = resolve(files, rel, found.group(2))
            if target:
                namespaces.setdefault(target, []).append((rel, found.group(1)))
        for found in DYNAMIC_IMPORT.finditer(text):
            target = resolve(files, rel, found.group(1))
            if target:
                dynamics.setdefault(target, set()).add(rel)

    def who_reads(target, name, seen):
        if (target, name) in seen:
            return set()
        seen.add((target, name))
        found = set(named.get((target, name), ()))
        for rel, namespace in namespaces.get(target, ()):
            if namespace_reads(files[rel], namespace, name):
                found.add(rel)
        for rel in dynamics.get(target, ()):
            if re.search(r'\b%s\b' % re.escape(name), files[rel]):
                found.add(rel)
        for rel in stars.get(target, ()):
            found |= who_reads(rel, name, seen)
        found.discard(target)
        return found

    return dict((key, who_reads(key[0], key[1], set())) for key in copies)


def in_tops(readers, tops):
    return sorted(one for one in readers if one.split('/', 1)[0] in tops)


def verdict(files, listed, by_src, by_tests_only, generator_files):
    """(fail lines, summary) for a tree held as {path: text}.

    listed          the names the list of rule 03 holds
    by_src          {file: names} -- PUBLISHED_READ_BY_SRC
    by_tests_only   {file: names} -- PUBLISHED_READ_BY_TESTS_ONLY
    generator_files the files tools/generate_entity_types.py writes
    """
    fails = []
    copies = generated_copies(files)
    readers = readers_of(files, copies)
    names = set(name for _file, name in copies)

    # 1. The list of rule 03 and the tree name the same constants.
    for name in sorted(names - listed):
        where = sorted(rel for rel, one in copies if one == name)
        fails.append('%s is generated in %s and the list in %s does not name '
                     'it' % (name, ', '.join(where), RULES))
    for name in sorted(listed - names):
        fails.append('the list in %s names %s and no generated block in src/ '
                     'declares it' % (RULES, name))
    if len(names) != len(listed):
        fails.append('the tree holds %d generated constant name(s), the list '
                     'names %d' % (len(names), len(listed)))

    # 2a / 2b. The public face, copy by copy.
    for (rel, name), exported in sorted(copies.items()):
        seen = in_tops(readers[(rel, name)], READERS_SEEN)
        publishing = in_tops(readers[(rel, name)], READERS_THAT_PUBLISH)
        if exported and not publishing:
            fails.append('%s exports the generated %s and no other file of %s '
                         'imports that copy -- JDG-139 prints it as a plain '
                         '`const`' % (rel, name, ' or '.join(
                             '%s/' % top for top in READERS_THAT_PUBLISH)))
        if seen and not exported:
            fails.append('%s reads the generated %s of %s, and that copy is not '
                         'exported' % (', '.join(seen), name, rel))

    # 2c. The generator's list against the tree and against the readers.
    for rel, group in sorted(by_src.items()):
        for name in group:
            if name in by_tests_only.get(rel, ()):
                fails.append('%s of %s stands in both PUBLISHED_READ_BY_SRC and '
                             'PUBLISHED_READ_BY_TESTS_ONLY' % (name, rel))
    for label, lists in (('PUBLISHED_READ_BY_SRC', by_src),
                         ('PUBLISHED_READ_BY_TESTS_ONLY', by_tests_only)):
        for rel, group in sorted(lists.items()):
            for name in sorted(group):
                if (rel, name) not in copies:
                    fails.append('%s names %s of %s, and no generated block of '
                                 'that file declares it' % (label, name, rel))
                    continue
                if not copies[(rel, name)]:
                    fails.append('%s publishes %s of %s, and the tree does not '
                                 'export it -- run `npm run types`'
                                 % (label, name, rel))
                in_src = in_tops(readers[(rel, name)], ('src',))
                in_tests = in_tops(readers[(rel, name)], ('tests',))
                if label == 'PUBLISHED_READ_BY_SRC' and not in_src:
                    fails.append('PUBLISHED_READ_BY_SRC holds %s of %s, and no '
                                 'other file of src/ reads it%s'
                                 % (name, rel, ' -- move it to '
                                    'PUBLISHED_READ_BY_TESTS_ONLY'
                                    if in_tests else ''))
                if label == 'PUBLISHED_READ_BY_TESTS_ONLY' and in_src:
                    fails.append('PUBLISHED_READ_BY_TESTS_ONLY holds %s of %s, '
                                 'and src/ reads it (%s) -- move it to '
                                 'PUBLISHED_READ_BY_SRC'
                                 % (name, rel, ', '.join(in_src)))
                if label == 'PUBLISHED_READ_BY_TESTS_ONLY' and not in_tests \
                        and not in_src:
                    fails.append('PUBLISHED_READ_BY_TESTS_ONLY holds %s of %s, '
                                 'and no test reads it' % (name, rel))
    for (rel, name), exported in sorted(copies.items()):
        if rel not in generator_files or not exported:
            continue
        if name not in by_src.get(rel, ()) and name not in by_tests_only.get(rel, ()):
            fails.append('%s exports the generated %s and the JDG-139 list in %s '
                         'does not publish it -- run `npm run types`'
                         % (rel, name, GENERATOR.replace('\\', '/')))

    exported = sum(1 for one in copies.values() if one)
    read_by_src = sum(1 for key in copies if in_tops(readers[key], ('src',)))
    read_by_tests_only = sum(
        1 for key in copies
        if not in_tops(readers[key], ('src',)) and in_tops(readers[key], ('tests',)))
    summary = ('%d generated constant name(s) in %d copies; %d copies exported '
               '(%d read by src/, %d read by tests/ only), %d read by no other '
               'file' % (len(names), len(copies), exported, read_by_src,
                         read_by_tests_only,
                         len(copies) - read_by_src - read_by_tests_only))
    return fails, summary


def load_generator(root):
    """The generator's JDG-139 lists and the files it writes.

    Compiled from the source on every run, never imported: an import may take
    the bytecode in __pycache__, which Python trusts while the source keeps its
    size and its modification second -- measured 2026-09-16, a list edited and
    put back within one second at the same size was read in its edited form.
    """
    path = os.path.abspath(os.path.join(root, GENERATOR))
    scope = {'__name__': 'generate_entity_types', '__file__': path}
    exec(compile(read(path), path, 'exec'), scope)
    written = set(os.path.relpath(target, scope['ROOT']).replace('\\', '/')
                  for target, _build, _sources in scope['TARGETS'])
    return (scope['PUBLISHED_READ_BY_SRC'], scope['PUBLISHED_READ_BY_TESTS_ONLY'],
            written)


# ---------------------------------------------------------------------------
# --self-test -- a tree held in memory, never written to src/ or tests/.
# ---------------------------------------------------------------------------

SELF_TEST_A = u'''\
// <generated -- do not edit by hand>
export const NOT_STORED_ONE: { readonly 'S-1': number } = {
  'S-1': 1,
}

const NOT_STORED_TWO: { readonly 'S-2': number } = {
  'S-2': 2,
}
// </generated>

export function two(): number {
  return NOT_STORED_TWO['S-2']
}
'''

SELF_TEST_B = u'''\
import {
  type Unrelated,
  NOT_STORED_ONE as one, // the copy of src/a/a.ts
} from '../a/a'

export const first = one['S-1']
'''

SELF_TEST_C = u'''\
// <generated -- do not edit by hand>
export const NOT_STORED_ONE: { readonly 'S-1': number } = {
  'S-1': 1,
}
// </generated>
'''

SELF_TEST_NAMESPACE = u'''\
import * as unitA from '../../src/a/a'

const two = (unitA as Record<string, unknown>)['NOT_STORED_TWO']
'''

SELF_TEST_LIST = set(['NOT_STORED_ONE', 'NOT_STORED_TWO'])
SELF_TEST_GENERATED = set(['src/a/a.ts', 'src/c/c.ts'])


def self_test_case(label, files, listed, by_src, by_tests_only, wanted):
    """Run one case; `wanted` is None for green, or a substring a FAIL must hold."""
    fails, _summary = verdict(files, listed, by_src, by_tests_only,
                              SELF_TEST_GENERATED)
    if wanted is None:
        went = 'green' if not fails else 'RED: %s' % '; '.join(fails)
        say('         %s: %s' % (label, went))
        return None if not fails else '%s: expected green, got red' % label
    hit = [one for one in fails if wanted in one]
    say('         %s: %s' % (label, ('RED, ' + hit[0]) if hit else
                                  ('green' if not fails else
                                   'red for another reason: ' + '; '.join(fails))))
    return None if hit else '%s: expected a FAIL holding "%s"' % (label, wanted)


def self_test():
    clean = {'src/a/a.ts': SELF_TEST_A, 'src/b/b.ts': SELF_TEST_B}
    by_src = {'src/a/a.ts': ('NOT_STORED_ONE',)}
    results = []

    results.append(self_test_case(
        'case 0 (clean tree)', clean, SELF_TEST_LIST, by_src, {}, None))

    # 1. The import goes away: the export is left with no reader (rule 2a).
    unread = dict(clean, **{'src/b/b.ts': u'export const first = 1\n'})
    results.append(self_test_case(
        'case 1 (the only import removed)', unread, SELF_TEST_LIST, by_src, {},
        'src/a/a.ts exports the generated NOT_STORED_ONE and no other file'))

    # 2. A second copy of a name that IS read elsewhere, exported and unread.
    #    Counted by name this is green; counted by copy it is red (rule 2a).
    second = dict(clean, **{'src/c/c.ts': SELF_TEST_C})
    results.append(self_test_case(
        'case 2 (an unread second copy of a read name)', second, SELF_TEST_LIST,
        by_src, {},
        'src/c/c.ts exports the generated NOT_STORED_ONE and no other file'))

    # 3. A test reads an unexported copy through a namespace and a string key,
    #    which tsc lets through (rule 2b).
    keyed = dict(clean, **{'tests/unit/a.test.ts': SELF_TEST_NAMESPACE})
    results.append(self_test_case(
        'case 3 (a namespace read by string key of an unexported copy)', keyed,
        SELF_TEST_LIST, by_src, {},
        'tests/unit/a.test.ts reads the generated NOT_STORED_TWO of src/a/a.ts, '
        'and that copy is not exported'))

    # 4. The list of rule 03 loses a name (rule 1).
    results.append(self_test_case(
        'case 4 (a name dropped from the list of rule 03)', clean,
        set(['NOT_STORED_ONE']), by_src, {},
        'NOT_STORED_TWO is generated in src/a/a.ts and the list'))

    # 5. A copy src/ reads, filed under the tests-only group (rule 2c).
    results.append(self_test_case(
        'case 5 (a src/ reader filed as tests-only)', clean, SELF_TEST_LIST, {},
        by_src, 'and src/ reads it (src/b/b.ts) -- move it to PUBLISHED_READ_BY_SRC'))

    # 6. The list publishes a copy the tree does not export (rule 2c).
    results.append(self_test_case(
        'case 6 (the list publishes an unexported copy)', clean, SELF_TEST_LIST,
        {'src/a/a.ts': ('NOT_STORED_ONE', 'NOT_STORED_TWO')}, {},
        'publishes NOT_STORED_TWO of src/a/a.ts, and the tree does not export it'))

    failures = [one for one in results if one]
    for failure in failures:
        say('FAIL     check 30 self-test: %s' % failure)
    if failures:
        return 1
    say('OK       check 30 self-test: 6 break(s) went red and the clean tree '
        'held in memory is green')
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    args = [one for one in argv if not one.startswith('--')]
    root = args[0] if args else '.'
    files = tree_of(root, READERS_SEEN)
    listed = set(LISTED.findall(read(os.path.join(root, RULES))))
    by_src, by_tests_only, written = load_generator(root)
    fails, summary = verdict(files, listed, by_src, by_tests_only, written)
    if not fails:
        say('OK       %s; the list in %s names the same set, and every exported '
            'copy is imported by another file of %s (JDG-139 stage 1)'
            % (summary, RULES, ' or '.join('%s/' % top
                                          for top in READERS_THAT_PUBLISH)))
        return 0
    for line in fails:
        say('FAIL     %s' % line)
    say('FAIL     %s' % summary)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
