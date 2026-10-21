# -*- coding: utf-8 -*-
"""Shared paths, settings and small file helpers for the handover guard.

The guard keeps its state in ONE place that every checkout of the repository
shares: a folder inside the git common directory (`<git-common-dir>/session-registry/`).
A parent session in the root checkout and its child sessions in
`.claude/worktrees/<name>` all resolve to the same folder, and git never
tracks anything under `.git/`, so the state cannot be committed or pushed.
Outside a git repository the folder falls back to `<cwd>/.claude/session-registry/`.

Settings (state folder `config.json`, overridden by environment variables):
  warn_pct          GRS_GUARD_WARN_PCT          85      warn when used % exceeds this
  warn_remaining    GRS_GUARD_WARN_REMAINING    60000   ... or when fewer tokens remain
  ceiling_pct       GRS_GUARD_CEILING_PCT       95      PreCompact never blocks at or above this
  window_size       GRS_GUARD_WINDOW            0       context window in tokens; 0 = from the
                                                        status line, else guessed (usage.py)
  handoff_path      GRS_GUARD_HANDOFF           docs/development-records/handoff.md
"""
import datetime
import json
import os
import subprocess
import tempfile

DEFAULTS = {
    'warn_pct': 85.0,
    'warn_remaining': 60000,
    'ceiling_pct': 95.0,
    'window_size': 0,
    'handoff_path': 'docs/development-records/handoff.md',
}
ENV_NAMES = {
    'warn_pct': 'GRS_GUARD_WARN_PCT',
    'warn_remaining': 'GRS_GUARD_WARN_REMAINING',
    'ceiling_pct': 'GRS_GUARD_CEILING_PCT',
    'window_size': 'GRS_GUARD_WINDOW',
    'handoff_path': 'GRS_GUARD_HANDOFF',
}
STATE_DIR_ENV = 'GRS_GUARD_STATE_DIR'


def now_utc():
    """The current time as an ISO 8601 UTC string with a Z suffix."""
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_utc(text):
    """Read a time written by now_utc(); None when absent or malformed."""
    if not text:
        return None
    try:
        return datetime.datetime.strptime(text, '%Y-%m-%dT%H:%M:%SZ').replace(
            tzinfo=datetime.timezone.utc)
    except ValueError:
        return None


def checkout_root(cwd):
    """The top folder of the checkout holding cwd, or cwd when not in git."""
    try:
        out = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=cwd,
                             capture_output=True, text=True, timeout=10)
        if out.returncode == 0 and out.stdout.strip():
            return os.path.normpath(out.stdout.strip())
    except (OSError, subprocess.SubprocessError):
        pass
    return os.path.normpath(cwd)


def state_dir(cwd=None):
    """The shared state folder; created on first use."""
    override = os.environ.get(STATE_DIR_ENV)
    if override:
        path = override
    else:
        cwd = cwd or os.getcwd()
        path = None
        try:
            out = subprocess.run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'],
                                 cwd=cwd, capture_output=True, text=True, timeout=10)
            if out.returncode == 0 and out.stdout.strip():
                path = os.path.join(out.stdout.strip(), 'session-registry')
        except (OSError, subprocess.SubprocessError):
            pass
        if path is None:
            path = os.path.join(cwd, '.claude', 'session-registry')
    os.makedirs(path, exist_ok=True)
    return os.path.normpath(path)


def read_json(path, default=None):
    """Load a JSON file; the default when it is missing or unreadable."""
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, data):
    """Write JSON atomically (temp file in the same folder, then replace)."""
    folder = os.path.dirname(path)
    os.makedirs(folder, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=folder, prefix='.tmp-', suffix='.json')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write('\n')
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def append_log(state, event, **fields):
    """One JSON line per guard event in <state>/events.jsonl (the evidence trail)."""
    row = {'at': now_utc(), 'event': event}
    row.update(fields)
    with open(os.path.join(state, 'events.jsonl'), 'a', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + '\n')


def settings(state):
    """Defaults, then <state>/config.json, then environment variables."""
    merged = dict(DEFAULTS)
    merged.update({k: v for k, v in (read_json(os.path.join(state, 'config.json'), {}) or {}).items()
                   if k in DEFAULTS})
    for key, env in ENV_NAMES.items():
        value = os.environ.get(env)
        if value:
            merged[key] = value
    for key in ('warn_pct', 'ceiling_pct'):
        merged[key] = float(merged[key])
    merged['warn_remaining'] = int(merged['warn_remaining'])
    merged['window_size'] = int(merged['window_size'])
    return merged
