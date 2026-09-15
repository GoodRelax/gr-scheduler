#!/usr/bin/env python3
"""PreToolUse guard: refuse git commands that sweep up other sessions' changes.

Several Claude sessions may share this checkout (docs/development-rules/parallel-agents-en.md).
A command that stages or stashes everything takes another session's uncommitted
work with it, so these are refused:

  git add     -A / --all / -u / --update / --no-ignore-removal (also inside a
              cluster such as -Av), or a pathspec of . ./ :/ * :/*
  git commit  -a / --all (also inside a cluster such as -am)
  git stash   anything except `git stash list` and `git stash show`

It reads the PreToolUse JSON on stdin and looks at tool_input.command (Bash and
PowerShell). Exit 2 blocks the call and shows the reason; exit 0 lets it run.
Heredoc bodies and quoted strings (commit messages) are not read as commands.

  python .claude/hooks/block-sweeping-git.py --self-test   # the check of the check
"""
import json
import re
import shlex
import sys

GUIDE = 'docs/development-rules/parallel-agents-en.md'
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")
ASSIGNMENT = re.compile(r'[A-Za-z_][A-Za-z0-9_]*=.*')
SHORT_CLUSTER = re.compile(r'-[A-Za-z]+')
GIT_OPTIONS_WITH_VALUE = {'-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'}
SWEEPING_ADD_WORDS = {'--all', '--update', '--no-ignore-removal', '.', './', ':/', '*', ':/*'}
COMMIT_OPTIONS_WITH_VALUE = {
    '-m', '-F', '-C', '-c', '-t', '--author', '--date', '--fixup', '--squash',
    '--template', '--cleanup', '--trailer', '--file', '--message',
}
COMMIT_SHORT_WITH_VALUE = 'mFCct'


def without_heredoc_bodies(command):
    """Drop the lines of every heredoc body; keep the line that opens it."""
    lines = command.split('\n')
    kept = []
    i = 0
    while i < len(lines):
        line = lines[i]
        kept.append(line)
        i += 1
        opened = HEREDOC.search(line)
        if opened:
            terminator = opened.group(2)
            while i < len(lines) and lines[i].strip() != terminator:
                i += 1
            i += 1
    return '\n'.join(kept)


def tokens_of(command):
    text = without_heredoc_bodies(command).replace('\n', ' ; ')
    try:
        lexer = shlex.shlex(text, posix=True, punctuation_chars=';&|()')
        lexer.whitespace_split = True
        return list(lexer)
    except ValueError:
        return re.findall(r'[;&|()]+|[^\s;&|()]+', text)


def segments_of(tokens):
    segment = []
    for token in tokens:
        if token and all(ch in ';&|()' for ch in token):
            if segment:
                yield segment
            segment = []
        else:
            segment.append(token)
    if segment:
        yield segment


def git_call(segment):
    """(subcommand, args) when the segment runs git, else None."""
    words = list(segment)
    while words and ASSIGNMENT.fullmatch(words[0]):
        words.pop(0)
    if not words:
        return None
    program = words[0].replace('\\', '/').rsplit('/', 1)[-1].lower()
    if program not in ('git', 'git.exe'):
        return None
    i = 1
    while i < len(words) and words[i].startswith('-'):
        i += 2 if words[i] in GIT_OPTIONS_WITH_VALUE else 1
    if i >= len(words):
        return None
    return words[i], words[i + 1:]


def sweeping_add(args):
    for arg in args:
        if arg in SWEEPING_ADD_WORDS:
            return arg
        if SHORT_CLUSTER.fullmatch(arg) and ('A' in arg[1:] or 'u' in arg[1:]):
            return arg
    return None


def sweeping_commit(args):
    skip_value = False
    for arg in args:
        if skip_value:
            skip_value = False
            continue
        if arg in COMMIT_OPTIONS_WITH_VALUE:
            skip_value = True
            continue
        if arg == '--all':
            return arg
        if SHORT_CLUSTER.fullmatch(arg):
            cluster = arg[1:]
            for position, flag in enumerate(cluster):
                if flag == 'a':
                    return arg
                if flag in COMMIT_SHORT_WITH_VALUE:
                    # WHY: the rest of the cluster is this option's value (-mall), or the value is the next word (-m).
                    skip_value = position == len(cluster) - 1
                    break
    return None


def sweeping_stash(args):
    subcommand = next((arg for arg in args if not arg.startswith('-')), None)
    if subcommand in ('list', 'show'):
        return None
    return 'stash' if subcommand is None else 'stash ' + subcommand


def refusal_of(command):
    for segment in segments_of(tokens_of(command)):
        call = git_call(segment)
        if call is None:
            continue
        subcommand, args = call
        if subcommand == 'add':
            found = sweeping_add(args)
            if found:
                return ('`git add %s` stages every change in the checkout, including other sessions\' work. '
                        'Name your own paths: git add <path> <path> ...' % found)
        elif subcommand == 'commit':
            found = sweeping_commit(args)
            if found:
                return ('`git commit %s` commits every modified tracked file, including other sessions\' work. '
                        'Stage your own paths with git add <path>, then commit without -a.' % found)
        elif subcommand == 'stash':
            found = sweeping_stash(args)
            if found:
                return ('`git %s` takes other sessions\' uncommitted work with it (the stash stack is shared). '
                        'Commit your own paths instead; `git stash list` and `git stash show` are allowed.' % found)
    return None


SELF_TEST = [
    ('git add -A', True),
    ('git add .', True),
    ('git add ./', True),
    ('git add --all', True),
    ('git add -u', True),
    ('git add -Av', True),
    ('git -C .claude/worktrees/wave add --all', True),
    ('cd /repo && git add -A && git commit -m "x"', True),
    ('(cd wt && git add .)', True),
    ('git commit -am "message"', True),
    ('git commit --all -m message', True),
    ('git commit -a', True),
    ('git stash', True),
    ('git stash pop', True),
    ('git stash push -u -m tag', True),
    ('git add -A; git commit -m x', True),
    ('& git add -A', True),
    ('GIT_EDITOR=true git stash apply', True),
    ('git add docs/a.md docs/b.md', False),
    ('git add docs/guides/', False),
    ('git commit -m "never use git add -A"', False),
    ('git commit -q -F - <<\'EOF\'\nWe stopped using git add -A and git stash.\nEOF\ngit push origin refactor', False),
    ('git commit -q -F - <<\'EOF\'\ngit add -A is refused now\ngit stash too\nEOF', False),
    ('git commit -q -F - <<\'EOF\'\nmessage\nEOF\ngit add -A', True),
    ('git commit -mall', False),
    ('git commit --amend --no-edit', False),
    ('git stash list', False),
    ('git stash show -p', False),
    ('git status --porcelain', False),
    ('git log --all --oneline', False),
    ('echo git add -A', False),
    ('grep -n "git stash" docs/development-rules/parallel-agents-ja.md', False),
    ("git commit -m 'it's broken", False),
]


def self_test():
    wrong = [(command, expected) for command, expected in SELF_TEST if (refusal_of(command) is not None) != expected]
    for command, expected in wrong:
        print('WRONG  expected %s: %r' % ('refuse' if expected else 'allow', command))
    print('%s  %d case(s), %d wrong' % ('OK' if not wrong else 'FAIL', len(SELF_TEST), len(wrong)))
    return 0 if not wrong else 1


def main():
    if sys.argv[1:] == ['--self-test']:
        return self_test()
    try:
        payload = json.loads(sys.stdin.buffer.read().decode('utf-8', 'replace'))
        command = (payload.get('tool_input') or {}).get('command') or ''
    except (ValueError, AttributeError):
        return 0
    reason = refusal_of(command)
    if reason is None:
        return 0
    sys.stderr.write('Blocked by .claude/hooks/block-sweeping-git.py: %s (%s)\n' % (reason, GUIDE))
    return 2


if __name__ == '__main__':
    sys.exit(main())
