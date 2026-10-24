# -*- coding: utf-8 -*-
"""Check 93 -- the lockfile pins what package.json asks for, and nothing installed ships.

WHY THIS EXISTS. Rule 07, chapter R8, perspective "dependencies and OSS":
the versions are pinned by a lockfile, and every OSS license the product
carries is honoured with its notices. What was machine-checked before this:

  check 27  tools/generate_license.py --check: the license in src/ matches
            LICENSE and NOTICE, and package.json declares no `dependencies`
            -- so the empty attribution list of FR-069 is true;
  check 86  tools/check_versions.mjs: the version lines of package.json and
            package-lock.json name the newest release.

Neither reads the lockfile's dependency maps, and neither sees a devDependency
imported from src/: vite would bundle it into dist/index.html, and the empty
attribution list would then be false while check 27 stayed green. This check
holds those two gaps and nothing that 27 or 86 already holds.

WHAT IS RED.
  1. package-lock.json is not lockfile version 2 or later, or its root entry
     (packages[""]) declares other dependency maps than package.json -- the
     lock was not regenerated after package.json changed;
  2. a package package.json names has no locked entry with a version, a
     `resolved` address and an `integrity` hash;
  3. a locked package is not marked `dev` -- something installed would reach
     the product, so FR-069 would ask for its attribution;
  4. a shipped source file (src/, which both the page and the relay are
     built from) imports a bare package name other than a `node:` built-in;
  5. a tracked package.json other than the root one has no lockfile beside it.

PRINTED, NOT RED. The licenses of the locked packages, counted. They are all
build tools (3 above), so none reaches the product; a copyleft name in the
count is for the reviewer of R8 to read.

WHAT IT DOES NOT SEE. Known vulnerabilities (`npm audit` needs the network,
and check.sh does not go out); licenses of anything not in the lockfile.
Baseline 0.

    python .claude/skills/spec-graph-check/check-dependencies-and-oss.py [--self-test]
"""
import collections
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
PACKAGE = 'package.json'
LOCK = 'package-lock.json'
DEPENDENCY_MAPS = ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')
# The relay is built from src/ too: vite.relay.config.ts names its server module there
# and adds only virtual ids (the page bytes and the two schemas).
SHIPPED = ('src/',)
SOURCE_SUFFIXES = ('.ts', '.mts', '.js', '.mjs')
OLDEST_LOCKFILE = 2
# A static import or re-export (its `from` may sit lines below the `import`), a
# side-effect import, and a dynamic import(). A `from` inside a string is not one.
IMPORT = re.compile(r'''^\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"\n]+)['"]'''
                    r'''|^\s*import\s*['"]([^'"\n]+)['"]'''
                    r'''|\bimport\(\s*['"]([^'"\n]+)['"]\s*\)''', re.MULTILINE)


def lock_problems(package, lock):
    """Findings 1-3 for one package.json and its lockfile."""
    problems = []
    if (lock.get('lockfileVersion') or 0) < OLDEST_LOCKFILE or 'packages' not in lock:
        return ['%s is lockfile version %s; %d or later holds the packages map'
                % (LOCK, lock.get('lockfileVersion'), OLDEST_LOCKFILE)]
    packages = lock['packages']
    root = packages.get('', {})
    for key in DEPENDENCY_MAPS:
        if (package.get(key) or {}) != (root.get(key) or {}):
            problems.append('%s %s differs from the lock\'s root entry -- run npm install' % (PACKAGE, key))
        for name in sorted(package.get(key) or {}):
            entry = packages.get('node_modules/' + name)
            if not entry or not all(entry.get(f) for f in ('version', 'resolved', 'integrity')):
                problems.append('%s is not locked with a version, address and integrity hash' % name)
    for path, entry in sorted(packages.items()):
        if path and not entry.get('link') and not (entry.get('dev') or entry.get('devOptional')):
            problems.append('%s is installed for the product, not only the build -- FR-069 asks for '
                            'its attribution' % path)
    return problems


def license_tally(lock):
    return collections.Counter(str(entry.get('license') or '(none)')
                               for path, entry in lock.get('packages', {}).items() if path)


def bare_imports(text):
    """Package names a source file imports, `node:` built-ins and relative paths left out."""
    specs = {spec for groups in IMPORT.findall(text) for spec in groups if spec}
    return sorted(s for s in specs if not s.startswith(('.', '/', 'node:', 'virtual:')))


def tracked():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return out.stdout.splitlines()


def import_problems(files):
    problems = []
    for path in files:
        if path.startswith(SHIPPED) and path.endswith(SOURCE_SUFFIXES):
            with io.open(os.path.join(ROOT, path), encoding='utf-8') as f:
                for spec in bare_imports(f.read()):
                    problems.append('%s imports the package %r, which would be bundled into the product' % (path, spec))
    return problems


def lockless_packages(files):
    present = set(files)
    return ['%s has no lockfile beside it' % p for p in files
            if p.endswith('/' + PACKAGE) and os.path.dirname(p) + '/' + LOCK not in present]


def self_test():
    package = {'devDependencies': {'vite': '^8.0.0'}}
    good = {'lockfileVersion': 3, 'packages': {
        '': {'devDependencies': {'vite': '^8.0.0'}},
        'node_modules/vite': {'version': '8.0.1', 'resolved': 'https://r/vite.tgz',
                              'integrity': 'sha512-x', 'dev': True, 'license': 'MIT'},
    }}
    stale = json.loads(json.dumps(good))
    stale['packages']['']['devDependencies'] = {'vite': '^7.0.0'}
    shipped = json.loads(json.dumps(good))
    del shipped['packages']['node_modules/vite']['dev']
    unpinned = json.loads(json.dumps(good))
    del unpinned['packages']['node_modules/vite']['integrity']
    source = ("import { a } from './a'\nimport x from 'node:fs'\nimport y from 'ajv'\n"
              "import {\n  b,\n} from 'zod'\nimport 'side'\nconst z = await import('vite')\n"
              "const s = 'taken from ' + \"x\"\n")
    ok = (lock_problems(package, good) == []
          and len(lock_problems(package, stale)) == 1
          and len(lock_problems(package, shipped)) == 1
          and len(lock_problems(package, unpinned)) == 1
          and lock_problems(package, {'lockfileVersion': 1}) != []
          and bare_imports(source) == ['ajv', 'side', 'vite', 'zod']
          and lockless_packages(['package.json', 'demo/package.json']) == ['demo/package.json has no lockfile beside it']
          and license_tally(good) == {'MIT': 1})
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if '--self-test' in argv:
        return self_test()
    with io.open(os.path.join(ROOT, PACKAGE), encoding='utf-8') as f:
        package = json.load(f)
    with io.open(os.path.join(ROOT, LOCK), encoding='utf-8') as f:
        lock = json.load(f)
    files = tracked()
    problems = lock_problems(package, lock) + import_problems(files) + lockless_packages(files)
    for problem in problems:
        print('FAIL check 93: %s' % problem)
    tally = license_tally(lock)
    print('     licenses of the %d locked packages (all build-only): %s'
          % (sum(tally.values()), ', '.join('%s %d' % kv for kv in tally.most_common())))
    if not problems:
        print('OK   check 93: the lock pins package.json, nothing installed ships, src imports no package')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
