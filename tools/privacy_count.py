# -*- coding: utf-8 -*-
"""Count what a commit or a merge would publish that it must not.

    python tools/privacy_count.py                 # what git reports as changed
    python tools/privacy_count.py --staged        # what the next commit holds
    python tools/privacy_count.py --range A..B    # what a merge of B into A brings
    python tools/privacy_count.py <path> ...      # those files

It prints ONE line of counts and exits 1 when any count is not zero:

    privacy: names 0, absolute paths 0, e-mail 0, secrets 0,
             ignored 8/8, forbidden tracked 0 (N files read)

WHY A COUNT AND NOT A VERDICT. The standing rule for this public repository
is to MEASURE and REPORT these numbers before every commit and push; a green
word cannot be reported, a number can.

THE PATTERNS ARE precheck.py's -- trap 5 (absolute path) and the personal
information trap -- imported, not copied, so the two cannot drift apart.

WHAT `ignored` MEANS. Each path in MUST_BE_IGNORED is a sample file inside
private material or a build cache; `git check-ignore` has to say the ignore
rules cover it, whether or not it exists. WHAT `forbidden tracked` MEANS. No tracked file may sit
under MUST_NOT_BE_TRACKED but its README: the MSPDI schemas (JDG-644) and
anything taken out of an SDK stay on the machine that has them.

WHAT IT CANNOT SEE: a name spelled differently from the account name, a
secret without one of precheck's high-signal prefixes, and a private file
under a path nobody listed here.
"""
import importlib.util
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

MUST_BE_IGNORED = [
    'docs/reference/mspdi/pj12/probe.xsd',
    'previous-project-result/01-mspdi/mspdi/probe.xsd',
    'previous-project-result/temp/probe.md',
    'scratch/probe.mjs',
    '.claude/settings.local.json',
    '.claude/worktrees/probe/probe.md',
    'node_modules/probe.js',
    '.env',
]
# Tracked files allowed under MUST_NOT_BE_TRACKED: the READMEs that say what
# belongs there and where to get it.
MUST_NOT_BE_TRACKED = ['docs/reference/mspdi/',
                       'previous-project-result/01-mspdi/mspdi/']
ALLOWED_TRACKED = ('README.md',)


def load_precheck():
    spec = importlib.util.spec_from_file_location(
        'precheck', os.path.join(HERE, 'precheck.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git_lines(args):
    done = subprocess.run(['git'] + args, cwd=ROOT, capture_output=True,
                          text=True, encoding='utf-8', errors='replace')
    return [line for line in done.stdout.splitlines() if line.strip()]


def files_to_read(argv, precheck):
    named = [one for one in argv if not one.startswith('--')]
    if '--range' in argv:
        spec = argv[argv.index('--range') + 1]
        named = [one for one in named if one != spec]
        return git_lines(['diff', '--name-only', '--diff-filter=AMR', spec])
    if named:
        return named
    if '--staged' in argv:
        return git_lines(['diff', '--cached', '--name-only', '--diff-filter=AMR'])
    return precheck.changed_files()


def count(files, precheck):
    tally = {'names': 0, 'absolute paths': 0, 'e-mail': 0, 'secrets': 0}
    read = 0
    for name in files:
        relative = name.replace(os.sep, '/')
        lines = precheck.read_lines(relative)
        if lines is None:
            continue
        read += 1
        tally['absolute paths'] += len(precheck.trap_absolute_path(relative, lines))
        for finding in precheck.trap_personal_information(relative, lines):
            if 'account name' in finding:
                tally['names'] += 1
            elif 'an address' in finding:
                tally['e-mail'] += 1
            else:
                tally['secrets'] += 1
    return tally, read


def ignore_state():
    covered = 0
    for path in MUST_BE_IGNORED:
        done = subprocess.run(['git', 'check-ignore', '-q', '--no-index', path],
                              cwd=ROOT)
        covered += 1 if done.returncode == 0 else 0
    tracked = 0
    for path in MUST_NOT_BE_TRACKED:
        tracked += len([one for one in git_lines(['ls-files', '--', path])
                        if not one.endswith(ALLOWED_TRACKED)])
    return covered, tracked


def main(argv):
    if '-h' in argv or '--help' in argv:
        sys.stdout.write(__doc__)
        return 0
    precheck = load_precheck()
    files = files_to_read(argv, precheck)
    tally, read = count(files, precheck)
    covered, tracked = ignore_state()
    print('privacy: names %d, absolute paths %d, e-mail %d, secrets %d, '
          'ignored %d/%d, forbidden tracked %d (%d files read)'
          % (tally['names'], tally['absolute paths'], tally['e-mail'],
             tally['secrets'], covered, len(MUST_BE_IGNORED), tracked, read))
    clean = (not any(tally.values()) and covered == len(MUST_BE_IGNORED)
             and tracked == 0)
    return 0 if clean else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
