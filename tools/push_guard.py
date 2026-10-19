# -*- coding: utf-8 -*-
"""Say whether a commit may be pushed, and print the push command when it may.

    python tools/push_guard.py <sha or ref> [--base origin/refactor] [--no-gt2 "reason"]
    python tools/push_guard.py --hook      # PreToolUse: read the tool call on stdin
    python tools/push_guard.py --self-test # the check of the check

THE RULE (JDG-2120, JDG-2126). This repository is public, and a push cannot be
taken back. A push publishes what <base>...<sha> adds (base: origin/refactor;
run `git fetch origin` first so it is current), and:

  1. the privacy count of that range (tools/privacy_count.py --range) is 0,
     always;
  2. when the LAST GT-2 result recorded for exactly this sha (the lines
     tools/gate/gate-queue.mjs writes into .git/grs-gate/results.jsonl) is not
     `passed`, the push is refused, whatever else is said -- a failed gate is
     never pushed over;
  3. when the range touches src/, tests/, dist/ or docs/spec/ (JDG-1965) and
     GT-2 has not passed for this sha, the coordinator JUDGES whether the
     change's size and risk need GT-2 (JDG-2126: the user leaves that to the
     coordinator) -- and says so: the push carries one line of reason,
     `GRS_PUSH_NO_GT2="<why GT-2 is not needed>" git push ...`. Without the
     reason the push is refused. A range touching none of those paths needs
     neither (JDG-1965: data only).

It prints the verdict, one line per reason, and on a pass the command to type.

MAIN IS NEVER PUSHED (JDG-2930, JDG-2931; the user, 2026-10-20, after the alpha 34d6ee84).
This comes before everything above and nothing overrides it -- GRS_PUSH_NO_GT2 does not,
no flag does. `--hook` refuses a push when it reaches main in any form: `x:main`,
`x:refs/heads/main`, a bare `main`, `HEAD:main`, a `:main` delete, a force (`+x:main`,
`--force`), a glob (`refs/heads/*:refs/heads/*`), `--all`, `--mirror`, `--branches`, a
refspec it cannot read (a `$` or a backtick in the target), and a push with no refspec while
the current branch is main, tracks main, or push.default / remote.<name>.push would send
main. The command is also read inside `bash -c "..."` / `pwsh -Command "..."` and behind
`command` / `env` / `nohup` / `sudo`. A release is a refactor -> main pull request that the
user reviews and merges on GitHub (docs/development-records/handoff.md, "Release to main").
Pushing tags is not guarded.

WHY A TOOL AND A HOOK. 2026-10-09: the coordinator chained the push after a
background `drain > log; echo $?`, read the echo's exit 0, and pushed a commit
whose GT-2 had FAILED. A rule that says "read the verdict first" was in memory
and in rule 04; the push went out anyway. `--hook` is called by the Claude
PreToolUse hook (.claude/hooks/block-sweeping-git.py) on every command that
runs `git push`, and refuses the call when any pushed sha fails the rule.

WHAT IT CANNOT SEE: a push typed by a person in their own terminal (the hook
is Claude's); a push through `gh api`, a git alias, or a script file; whether
the reason given is a good one; a refspec it cannot
resolve is refused, not guessed. The second wall is the GitHub ruleset on main
(pull request only, no bypass), which the user sets. Deleting a remote ref (`--delete`, `:dst`)
publishes nothing and is allowed.
"""
import importlib.util
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_BASE = 'origin/refactor'
# JDG-1965 (rule 04 section 4): a push that changes none of these is data only and needs no GT-2.
GATED_PREFIXES = ('src/', 'tests/', 'dist/', 'docs/spec/')
RULE = 'JDG-2120'
MAIN_RULE = 'JDG-2930, JDG-2931'
MAIN_NAMES = ('main', 'refs/heads/main', 'heads/main')
PUSH_ALL_FLAGS = ('--all', '--mirror', '--branches')
WRAPPER_WORDS = {'command', 'env', 'nohup', 'time', 'exec', 'sudo', 'nice', 'builtin'}
SHELL_PROGRAMS = {'bash', 'sh', 'zsh', 'dash', 'pwsh', 'powershell', 'cmd', 'eval', 'iex', 'invoke-expression'}
REASON_VARIABLE = 'GRS_PUSH_NO_GT2'
REASON_IN_COMMAND = re.compile(r'''\b%s=(?:"([^"]*)"|'([^']*)'|(\S+))''' % REASON_VARIABLE)
PUSH_OPTIONS_WITH_VALUE = {'--repo', '--receive-pack', '--exec', '-o', '--push-option', '--signed'}


def git(args):
    done = subprocess.run(['git'] + args, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace')
    return done.returncode, done.stdout.strip()


def full_sha(ref):
    status, out = git(['rev-parse', '--verify', '--quiet', ref + '^{commit}'])
    return out if status == 0 and out else None


def results_path():
    status, common = git(['rev-parse', '--git-common-dir'])
    if status != 0:
        return None
    return os.path.join(os.path.abspath(os.path.join(ROOT, common)), 'grs-gate', 'results.jsonl')


def last_gate_outcome(gate, sha, path=None):
    """The outcome of the last `gate` run recorded for `sha` ('passed', 'failed (exit 1)', ...), or None."""
    path = path or results_path()
    if path is None or not os.path.isfile(path):
        return None
    last = None
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            try:
                one = json.loads(line)
            except ValueError:
                continue
            if one.get('gate') == gate and one.get('sha') == sha:
                last = one.get('outcome')
    return last


def privacy_clean(spec):
    done = subprocess.run([sys.executable, os.path.join(HERE, 'privacy_count.py'), '--range', spec],
                          cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return done.returncode == 0, done.stdout.strip()


def verdict(ref, base=DEFAULT_BASE, reason=None, results=None):
    """(may push, lines saying why). `reason` is the coordinator's word that GT-2 is not needed."""
    sha = full_sha(ref)
    if sha is None:
        return False, ['cannot resolve %r to a commit' % ref]
    base_sha = full_sha(base)
    if base_sha is None:
        return False, ['cannot resolve the base %r -- run git fetch origin' % base]
    lines = ['push %s over %s (%s)' % (sha[:8], base, base_sha[:8])]
    # WHY three dots: the diff from the merge base is what the push adds; two dots would also count
    # what the base gained since, as if this push undid it.
    spec = '%s...%s' % (base_sha, sha)
    _, names = git(['diff', '--name-only', spec])
    changed = [one for one in names.splitlines() if one.strip()]
    gated = [one for one in changed if one.startswith(GATED_PREFIXES)]
    clean, said = privacy_clean(spec)
    lines.append(('privacy 0: ' if clean else 'REFUSED privacy not 0: ') + said)
    ok = clean
    outcome = last_gate_outcome('GT-2', sha, results)
    reason = (reason or '').strip()
    prefix = ''
    if outcome is not None and outcome != 'passed':
        lines.append('REFUSED the last GT-2 for %s is "%s" -- never push over a failed gate; rerun the red '
                     'file (--repeat-each 3) and GT-2, and tell the user either way' % (sha[:8], outcome))
        ok = False
    elif outcome == 'passed':
        lines.append('GT-2 passed for %s' % sha[:8])
    elif not gated:
        lines.append('data-only: %d path(s), none under %s -- GT-2 not needed (JDG-1965)'
                     % (len(changed), ' '.join(GATED_PREFIXES)))
    elif reason:
        lines.append('GT-2 not run for %s; the coordinator judged it not needed: "%s" (JDG-2126)' % (sha[:8], reason))
        prefix = '%s="%s" ' % (REASON_VARIABLE, reason.replace('"', "'"))
    else:
        lines.append('REFUSED %d path(s) under %s (e.g. %s), no GT-2 result for %s and no reason: judge the '
                     'size and risk (JDG-2126) -- queue GT-2, or push with %s="<why it is not needed>"'
                     % (len(gated), ' '.join(GATED_PREFIXES), gated[0], sha[:8], REASON_VARIABLE))
        ok = False
    if ok:
        # JDG-2930: main is never pushed; a release is a refactor -> main pull request.
        lines.append('%sgit push origin %s:refactor' % (prefix, sha))
    return ok, lines


# ---------------------------------------------------------------- the hook ----

def load_command_reader():
    """The tokenizer of .claude/hooks/block-sweeping-git.py -- imported, not copied."""
    path = os.path.join(ROOT, '.claude', 'hooks', 'block-sweeping-git.py')
    spec = importlib.util.spec_from_file_location('block_sweeping_git', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pushed_refs(args):
    """The source refs a `git push <args>` publishes, or None when it publishes nothing."""
    words, skip = [], False
    for arg in args:
        if skip:
            skip = False
            continue
        if arg in ('--delete', '-d'):
            return None
        if arg in PUSH_OPTIONS_WITH_VALUE:
            skip = True
            continue
        if not arg.startswith('-'):
            words.append(arg)
    refspecs = words[1:]
    if not refspecs:
        return ['HEAD']
    sources = []
    for refspec in refspecs:
        source = refspec.lstrip('+').split(':', 1)[0]
        # WHY no repeats: the coordinator pushes one sha to two names (<sha>:refactor <sha>:main).
        if source and source not in sources:
            sources.append(source)
    return sources


def reason_of(command):
    """The coordinator's GRS_PUSH_NO_GT2 reason written in the command (bash or PowerShell form), or None."""
    found = REASON_IN_COMMAND.search(command)
    if not found:
        return None
    return next((one for one in found.groups() if one is not None), None)


def dest_of(refspec):
    """The remote name a refspec writes: `+x:main` -> `main`; a name with no colon is its own target."""
    body = refspec.lstrip('+')
    return (body.split(':', 1)[1] if ':' in body else body).strip()


def refspec_reaches_main(refspec):
    """Why this refspec reaches main, or None."""
    dest = dest_of(refspec)
    if dest in MAIN_NAMES:
        return 'the refspec %r writes main' % refspec
    if re.search(r'[$`%]', dest):
        return 'the target of %r cannot be read (a variable), so it may be main' % refspec
    if '*' in dest and not dest.startswith('refs/tags/'):
        return 'the refspec %r is a pattern that includes main' % refspec
    return None


def bare_push_reaches_main(remote, query):
    """Why a push with no refspec reaches main, or None. `query(git args)` -> (status, output)."""
    status, branch = query(['symbolic-ref', '--short', '-q', 'HEAD'])
    if status != 0 or not branch:
        return 'the current branch cannot be read, so where a push with no refspec goes is unknown'
    if branch in ('main', 'master'):
        return 'the current branch is %s' % branch
    _, merge = query(['config', '--get', 'branch.%s.merge' % branch])
    if merge.strip() in MAIN_NAMES:
        return 'the current branch %s tracks main' % branch
    _, default = query(['config', '--get', 'push.default'])
    if default.strip().lower() == 'matching':
        return 'push.default=matching pushes every branch that exists on both sides, main included'
    if not remote:
        _, remote = query(['config', '--get', 'branch.%s.remote' % branch])
    _, configured = query(['config', '--get-all', 'remote.%s.push' % (remote.strip() or 'origin')])
    for line in configured.splitlines():
        found = refspec_reaches_main(line)
        if found:
            return 'remote.%s.push is set and %s' % (remote.strip() or 'origin', found)
    return None


def main_target_of(args, query=git):
    """Why `git push <args>` reaches main, or None. Nothing overrides this (JDG-2930)."""
    words, flags, skip = [], [], False
    for arg in args:
        if skip:
            skip = False
            continue
        if arg in PUSH_OPTIONS_WITH_VALUE:
            skip = True
            continue
        (flags if arg.startswith('-') else words).append(arg)
    for flag in flags:
        if flag in PUSH_ALL_FLAGS:
            return '%s pushes every branch, main included' % flag
    # WHY --repo: with it the first word is already a refspec, not the remote.
    has_repo = any(one == '--repo' or one.startswith('--repo=') for one in list(args))
    remote = '' if has_repo else (words[0] if words else '')
    refspecs = words if has_repo else words[1:]
    kept, after_tag, saw_tag = [], False, False
    for spec in refspecs:
        if after_tag:
            after_tag = False  # `tag <name>` pushes refs/tags/<name>
        elif spec == 'tag':
            after_tag = saw_tag = True
        else:
            kept.append(spec)
    for spec in kept:
        found = refspec_reaches_main(spec)
        if found:
            return found
    if kept or saw_tag or ('--tags' in flags and '--follow-tags' not in flags):
        return None  # a refspec was checked above; `git push --tags` and `tag <name>` publish tags only
    return bare_push_reaches_main(remote, query)


def work_dir_of(segment):
    """The last `git -C <dir>` in front of the subcommand, or None."""
    found = None
    for position, word in enumerate(segment[:-1]):
        if word == 'push':
            break
        if word == '-C':
            found = segment[position + 1]
    return found


def unwrapped(segment):
    """The segment without leading `VAR=x`, `command`, `env -i`, `nohup`, `sudo` ... words."""
    words = list(segment)
    while words:
        head = words[0]
        if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*=.*', head) or head.lower() in WRAPPER_WORDS:
            words.pop(0)
            while words and words[0].startswith('-') and head.lower() in WRAPPER_WORDS:
                words.pop(0)
        else:
            break
    return words


def refusal_of(command, judge=verdict, reader=None, query=git, reason=None, depth=0):
    reader = reader or load_command_reader()
    reason = reason_of(command) or reason
    for segment in reader.segments_of(reader.tokens_of(command)):
        segment = unwrapped(segment)
        if not segment:
            continue
        program = segment[0].replace('\\', '/').rsplit('/', 1)[-1].lower()
        if program.endswith('.exe'):
            program = program[:-4]
        if program in SHELL_PROGRAMS and depth < 3:
            for word in segment[1:]:
                if 'git' in word and 'push' in word:
                    found = refusal_of(word, judge, reader, query, reason, depth + 1)
                    if found:
                        return found
            continue
        call = reader.git_call(segment)
        if call is None or call[0] != 'push':
            continue
        folder = work_dir_of(segment)
        ask = query if folder is None else (lambda args, folder=folder: git(['-C', folder] + args))
        why = main_target_of(call[1], ask)
        if why:
            return ('`git push` refused by tools/push_guard.py (%s): %s. main is never pushed -- push only '
                    'to refactor; a release is a refactor -> main pull request opened after GT-2 passed on '
                    'that sha, which the user reviews and merges on GitHub (docs/development-records/'
                    'handoff.md, "Release to main"). No flag or environment variable overrides this.'
                    % (MAIN_RULE, why))
        for ref in pushed_refs(call[1]) or []:
            ok, lines = judge(ref, reason=reason)
            if not ok:
                return '`git push` of %s refused by tools/push_guard.py (%s): %s' % (
                    ref, RULE, ' | '.join(lines))
    return None


SELF_TEST = [
    # (command, refs the stub judge refuses, expect refusal)
    ('git push origin abc:refactor abc:main', {'abc'}, True),
    ('git push origin abc:refactor abc:main', set(), True),  # JDG-2930: main is refused though the judge passes
    ('git push origin abc:refactor', set(), False),
    ('git push origin +abc:refactor', {'abc'}, True),
    ('git push', {'HEAD'}, True),
    ('git push origin --delete old-branch', {'old-branch', 'HEAD'}, False),
    ('git push origin :old-branch', {'HEAD'}, False),
    ('git status && git push origin abc:main', {'abc'}, True),
    ('git -C ../root push origin abc:refactor', {'abc'}, True),
    ('git commit -m "push origin abc:main"', {'abc'}, False),
    ('echo git push origin abc', {'abc'}, False),
    ('grep -q "GT-2 abc passed" log && git push origin abc:refactor', {'abc'}, True),
    # the stub refuses 'needs' unless a reason is given, as verdict() does for an unrun GT-2
    ('git push origin needs:refactor', {'needs'}, True),
    ('GRS_PUSH_NO_GT2="ledger rows only" git push origin needs:refactor', {'needs'}, False),
    ('$env:GRS_PUSH_NO_GT2="ledger rows only"; git push origin needs:refactor', {'needs'}, False),
    ('GRS_PUSH_NO_GT2= git push origin needs:refactor', {'needs'}, True),
]


# JDG-2930: every form of a push that reaches main. state: what `git config` / HEAD say (see stub_query).
ON_REFACTOR = {'branch': 'refactor'}
MAIN_CASES = [
    # (command, repository state, expect refusal)
    ('git push origin abc:main', ON_REFACTOR, True),
    ('git push origin abc:refs/heads/main', ON_REFACTOR, True),
    ('git push origin HEAD:main', ON_REFACTOR, True),
    ('git push origin main', ON_REFACTOR, True),
    ('git push origin refs/heads/main', ON_REFACTOR, True),
    ('git push origin +abc:main', ON_REFACTOR, True),
    ('git push --force origin abc:main', ON_REFACTOR, True),
    ('git push -f origin main', ON_REFACTOR, True),
    ('git push origin :main', ON_REFACTOR, True),
    ('git push origin --delete main', ON_REFACTOR, True),
    ('git push origin abc:refactor abc:main', ON_REFACTOR, True),
    ('git push origin abc:heads/main', ON_REFACTOR, True),
    ('git push --all', ON_REFACTOR, True),
    ('git push --all origin', ON_REFACTOR, True),
    ('git push --mirror origin', ON_REFACTOR, True),
    ('git push --branches origin', ON_REFACTOR, True),
    ('git push origin refs/heads/*:refs/heads/*', ON_REFACTOR, True),
    ('git push origin $SHA:$DEST', ON_REFACTOR, True),
    ('git push --repo origin abc:main', ON_REFACTOR, True),
    ('git push --repo=origin main', ON_REFACTOR, True),
    ('git push -o ci.skip origin abc:main', ON_REFACTOR, True),
    ('git -C ../root push origin abc:main', ON_REFACTOR, True),
    ('GRS_PUSH_NO_GT2="ledger rows only" git push origin abc:main', ON_REFACTOR, True),
    ('$env:GRS_PUSH_NO_GT2="x"; git push origin abc:main', ON_REFACTOR, True),
    ('git status && git push origin abc:main && echo done', ON_REFACTOR, True),
    ('command git push origin abc:main', ON_REFACTOR, True),
    ('env -i git push origin abc:main', ON_REFACTOR, True),
    ('nohup git push origin abc:main', ON_REFACTOR, True),
    ('sudo git push origin abc:main', ON_REFACTOR, True),
    ('bash -c "git push origin abc:main"', ON_REFACTOR, True),
    ('pwsh -NoProfile -Command "git push origin abc:main"', ON_REFACTOR, True),
    ('powershell.exe -Command "& git push origin HEAD:main"', ON_REFACTOR, True),
    ('git.exe push origin abc:main', ON_REFACTOR, True),
    # a push with no refspec goes where the current branch, the upstream and the config say
    ('git push', {'branch': 'main'}, True),
    ('git push origin', {'branch': 'main'}, True),
    ('git push --follow-tags', {'branch': 'main'}, True),
    ('git push', {'branch': 'refactor', 'branch.refactor.merge': 'refs/heads/main'}, True),
    ('git push', {'branch': 'refactor', 'push.default': 'matching'}, True),
    ('git push origin', {'branch': 'refactor', 'remote.origin.push': 'refs/heads/*:refs/heads/*'}, True),
    ('git push origin', {'branch': 'refactor', 'remote.origin.push': 'HEAD:refs/heads/main'}, True),
    ('git push', {}, True),  # the current branch cannot be read
    # allowed
    ('git push origin abc:refactor', ON_REFACTOR, False),
    ('git push origin abc:refs/heads/refactor', ON_REFACTOR, False),
    ('git push origin +abc:refactor', ON_REFACTOR, False),
    ('git push origin refactor', ON_REFACTOR, False),
    ('git push origin HEAD:refactor', ON_REFACTOR, False),
    ('git push origin refs/heads/main:refs/heads/refactor', ON_REFACTOR, False),
    ('git push origin abc:mainline', ON_REFACTOR, False),
    ('git push origin abc:feature/main', ON_REFACTOR, False),
    ('git push origin --delete old-branch', ON_REFACTOR, False),
    ('git push origin :old-branch', ON_REFACTOR, False),
    ('git push', {'branch': 'refactor'}, False),
    ('git push origin', {'branch': 'refactor', 'branch.refactor.merge': 'refs/heads/refactor'}, False),
    ('git push --tags', {'branch': 'main'}, False),
    ('git push origin --tags', {'branch': 'main'}, False),
    ('git push origin v1.0', ON_REFACTOR, False),
    ('git push origin refs/tags/v1.0', ON_REFACTOR, False),
    ('git push origin tag v1.0', {'branch': 'main'}, False),
    ('git push origin refs/tags/*:refs/tags/*', ON_REFACTOR, False),
    ('git commit -m "never git push origin abc:main"', ON_REFACTOR, False),
    ('echo git push origin abc:main', ON_REFACTOR, False),
    ('git log origin/main --oneline', ON_REFACTOR, False),
    ('git fetch origin main', ON_REFACTOR, False),
]


def stub_query(state):
    """`query` for main_target_of over a dict: HEAD's branch plus config keys; a missing key is empty."""
    def query(args):
        if args[0] == 'symbolic-ref':
            return (0, state['branch']) if 'branch' in state else (1, '')
        return 0, state.get(args[-1], '')
    return query


def self_test():
    reader = load_command_reader()
    wrong = []
    for command, refused, expected in SELF_TEST:
        def judge(ref, reason=None, refused=refused):
            return (ref not in refused or (ref == 'needs' and bool(reason))), ['stub']
        if (refusal_of(command, judge, reader, stub_query(ON_REFACTOR)) is not None) != expected:
            wrong.append((command, expected))
    for command, state, expected in MAIN_CASES:
        # the judge passes everything: only the main rule can refuse here
        said = refusal_of(command, lambda ref, reason=None: (True, ['stub']), reader, stub_query(state))
        if (said is not None) != expected or (expected and MAIN_RULE not in said):
            wrong.append((command, expected))
    for command, expected in wrong:
        print('WRONG  expected %s: %r' % ('refuse' if expected else 'allow', command))
    total = len(SELF_TEST) + len(MAIN_CASES)
    print('%s  %d case(s), %d wrong' % ('OK' if not wrong else 'FAIL', total, len(wrong)))
    return 0 if not wrong else 1


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        sys.stdout.write(__doc__)
        return 0 if argv else 2
    if argv[0] == '--self-test':
        return self_test()
    if argv[0] == '--hook':
        try:
            payload = json.loads(sys.stdin.buffer.read().decode('utf-8', 'replace'))
            command = (payload.get('tool_input') or {}).get('command') or ''
        except (ValueError, AttributeError):
            return 0
        reason = refusal_of(command)
        if reason is None:
            return 0
        sys.stderr.write(reason + '\n')
        return 2
    base = argv[argv.index('--base') + 1] if '--base' in argv else DEFAULT_BASE
    reason = argv[argv.index('--no-gt2') + 1] if '--no-gt2' in argv else None
    ok, lines = verdict(argv[0], base, reason)
    for line in lines:
        print(line)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
