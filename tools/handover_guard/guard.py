# -*- coding: utf-8 -*-
"""Handover guard: one entry point for the status line, the hooks and the CLI.

Rulings JDG-3040..3042 (docs/development-records/rulings.md): hand over before an
unintended compaction, keep a session registry of the parent and its child
sessions, and make every child report and declare "Session complete".

  python tools/handover_guard/guard.py statusline            # statusLine command
  python tools/handover_guard/guard.py hook <event>          # hook command
  python tools/handover_guard/guard.py registry <action> ... # the session registry
  python tools/handover_guard/guard.py check-handoff [path]  # handoff note sections
  python tools/handover_guard/guard.py config [key value]    # show or set a setting
  python tools/handover_guard/guard.py status                # usage, registry, handoff

Read tools/handover_guard/README.md for what each part does.
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import read_json, settings, state_dir, write_json  # noqa: E402


def _stdin_json():
    raw = sys.stdin.buffer.read().decode('utf-8', errors='replace') if not sys.stdin.isatty() else ''
    try:
        return json.loads(raw) if raw.strip() else {}
    except ValueError:
        return {}


def cmd_statusline(_args):
    from usage import record_from_statusline, statusline_text
    payload = _stdin_json()
    state = state_dir(payload.get('cwd') or None)
    print(statusline_text(record_from_statusline(state, payload)))
    return 0


def cmd_hook(args):
    import hooks
    if not args:
        print('usage: guard.py hook <event>', file=sys.stderr)
        return 1
    return hooks.run(args[0], _stdin_json())


def cmd_registry(args):
    import registry
    return registry.main(args)


def cmd_check_handoff(args):
    import handoff_check
    return handoff_check.main(args)


def cmd_config(args):
    state = state_dir()
    path = os.path.join(state, 'config.json')
    if len(args) == 2:
        data = read_json(path, {}) or {}
        data[args[0]] = args[1]
        write_json(path, data)
    elif len(args) == 1 and args[0] == '--reset':
        write_json(path, {})
    print(json.dumps(settings(state), indent=2, sort_keys=True))
    return 0


def cmd_status(_args):
    import hooks
    print(hooks.status_text(os.environ.get('CLAUDE_CODE_SESSION_ID'), None, os.getcwd()))
    return 0


COMMANDS = {
    'statusline': cmd_statusline,
    'hook': cmd_hook,
    'registry': cmd_registry,
    'check-handoff': cmd_check_handoff,
    'config': cmd_config,
    'status': cmd_status,
}


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if not argv or argv[0] not in COMMANDS:
        print(__doc__)
        return 1
    return COMMANDS[argv[0]](argv[1:])


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
