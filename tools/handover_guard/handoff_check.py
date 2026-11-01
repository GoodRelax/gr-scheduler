# -*- coding: utf-8 -*-
"""Does the handoff note hold what the next coordinator needs?

Red when any of these is missing from the handoff note (default
docs/development-records/handoff.md):

  1. a newest dated section at the top: a line starting "> " and the NEW emoji (U+1F195) that carries a
     date YYYY-MM-DD;
  2. the heading FIRST_MESSAGE ("the first message to paste into the next
     session", in Japanese) -- the first message the next
     coordinator is handed);
  3. every live child session of the registry, named in the newest dated
     section by its host id or by the first 8 hex digits of it, or by its name.

It does NOT look at lessons left outside the newest section (check 72 does)
or at whether the text is true. Exit 0 green, 1 red; the findings go to stdout.

  python tools/handover_guard/guard.py check-handoff [path] [--no-registry] [--self-test]
"""
import os
import re

from common import checkout_root, settings, state_dir
import registry

NEW = '\U0001F195'  # the NEW emoji that opens a dated section
DATED = re.compile(r'^>\s*' + NEW + r'.*?(\d{4}-\d{2}-\d{2})')
SECTION_START = re.compile(r'^>\s*' + NEW)
# The heading of the handoff note that holds the first message for the next session.
FIRST_MESSAGE_WORDS = '\u6b21\u306e\u30bb\u30c3\u30b7\u30e7\u30f3\u306b\u8cbc\u308b'
FIRST_MESSAGE = re.compile(r'^##\s*' + FIRST_MESSAGE_WORDS + r'\s*1\s*\u901a\u76ee')


def newest_section(lines):
    """The lines of the first dated section (up to the next one or a heading)."""
    out = []
    for line in lines:
        if SECTION_START.match(line):
            if out:
                break
            out.append(line)
        elif out:
            if line.startswith('#'):
                break
            out.append(line)
    return out


def _named(child_id, child, text):
    short = child_id.split('_', 1)[-1][:8]
    return child_id in text or (short and short in text) or (child.get('name') and child['name'] in text)


def findings(text, data):
    """The list of what is missing; empty when the note is complete."""
    lines = text.splitlines()
    found = []
    section = newest_section(lines)
    if not section or not DATED.match(section[0]):
        found.append('no newest dated section ("> " + NEW emoji + YYYY-MM-DD) at the top')
    if not any(FIRST_MESSAGE.match(line) for line in lines):
        found.append('no heading for the first message to the next session ("## ' + FIRST_MESSAGE_WORDS + ' 1 ...")')
    body = '\n'.join(section)
    for cid, child in registry.live_children(data).items():
        if not _named(cid, child, body):
            found.append('live child %s (%s) is not named in the newest dated section'
                         % (child.get('name'), cid))
    return found


def handoff_file(cwd=None):
    state = state_dir(cwd)
    return os.path.join(checkout_root(cwd or os.getcwd()), settings(state)['handoff_path'])


def check(path, data):
    try:
        with open(path, encoding='utf-8') as f:
            return findings(f.read(), data)
    except OSError:
        return ['handoff note not found: %s' % os.path.relpath(path)]


def self_test():
    child = {'name': 'demo-child', 'state': 'working', 'added_at': '2026-10-22T00:00:00Z'}
    data = {'coordinator': None, 'children': {'local_0123abcd-ffff': child}}
    good = '> \U0001f195\u2b50 **2026-10-22 section** child 0123abcd works.\n\n## \u6b21\u306e\u30bb\u30c3\u30b7\u30e7\u30f3\u306b\u8cbc\u308b 1 \u901a\u76ee\n'
    bad = '# title\n\nno section\n'
    ok = findings(good, data) == [] and len(findings(bad, data)) == 3
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(args):
    if '--self-test' in args:
        return self_test()
    # --no-registry: sections 1 and 2 only, for check 88 (the registry is local state).
    no_registry = '--no-registry' in args
    args = [a for a in args if a != '--no-registry']
    path = args[0] if args else handoff_file()
    found = check(path, registry.empty_registry() if no_registry else registry.load(state_dir()))
    for line in found:
        print('FAIL handoff: ' + line)
    if not found:
        print('OK   handoff note holds its required sections')
    return 1 if found else 0
