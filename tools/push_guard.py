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

WHY A TOOL AND A HOOK. 2026-10-09: the coordinator chained the push after a
background `drain > log; echo $?`, read the echo's exit 0, and pushed a commit
whose GT-2 had FAILED. A rule that says "read the verdict first" was in memory
and in rule 04; the push went out anyway. `--hook` is called by the Claude
PreToolUse hook (.claude/hooks/block-sweeping-git.py) on every command that
runs `git push`, and refuses the call when any pushed sha fails the rule.

WHAT IT CANNOT SEE: a push typed by a person in their own terminal (the hook
is Claude's); whether the reason given is a good one; a refspec it cannot
resolve is refused, not guessed. Deleting a remote ref (`--delete`, `:dst`)
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
        lines.append('%sgit push origin %s:refactor %s:main' % (prefix, sha, sha))
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


def refusal_of(command, judge=verdict, reader=None):
    reader = reader or load_command_reader()
    reason = reason_of(command)
    for segment in reader.segments_of(reader.tokens_of(command)):
        call = reader.git_call(segment)
        if call is None or call[0] != 'push':
            continue
        for ref in pushed_refs(call[1]) or []:
            ok, lines = judge(ref, reason=reason)
            if not ok:
                return '`git push` of %s refused by tools/push_guard.py (%s): %s' % (
                    ref, RULE, ' | '.join(lines))
    return None


SELF_TEST = [
    # (command, refs the stub judge refuses, expect refusal)
    ('git push origin abc:refactor abc:main', {'abc'}, True),
    ('git push origin abc:refactor abc:main', set(), False),
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


def self_test():
    reader = load_command_reader()
    wrong = []
    for command, refused, expected in SELF_TEST:
        def judge(ref, reason=None, refused=refused):
            return (ref not in refused or (ref == 'needs' and bool(reason))), ['stub']
        if (refusal_of(command, judge, reader) is not None) != expected:
            wrong.append((command, expected))
    for command, expected in wrong:
        print('WRONG  expected %s: %r' % ('refuse' if expected else 'allow', command))
    print('%s  %d case(s), %d wrong' % ('OK' if not wrong else 'FAIL', len(SELF_TEST), len(wrong)))
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
