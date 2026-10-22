# -*- coding: utf-8 -*-
"""How full a session's context window is.

Hook inputs carry no context usage; only the status line gets
`context_window.used_percentage` (code.claude.com statusline page). The bridge:

  1. the status line command (`guard.py statusline`) writes
     <state>/usage/<session_id>.json on every status line update;
  2. any hook reads that file for its own session_id.

When the file is missing (a client that never runs the status line), the
reader falls back to the transcript: the last assistant message's usage,
counted the way the status line counts it (input + cache creation + cache
read, output excluded), against the window size last seen or a default.
"""
import json
import os

from common import append_log, now_utc, read_json, write_json

DEFAULT_WINDOW = 200000
EXTENDED_WINDOW = 1000000
TRANSCRIPT_TAIL_BYTES = 2 * 1024 * 1024
# Model id prefix -> context window, for models measured in this environment.
# claude-opus-5-5: MEASURED 2026-10-22 in the desktop app, a session held 179k
# input tokens with CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80 and was not compacted,
# so its window is larger than 200k.
MODEL_WINDOWS = {
    'claude-opus-5-5': EXTENDED_WINDOW,
}


def usage_path(state, session_id):
    return os.path.join(state, 'usage', '%s.json' % session_id)


def record_from_statusline(state, payload):
    """Write the usage file from one status line payload; return the record."""
    session_id = payload.get('session_id') or 'unknown'
    window = payload.get('context_window') or {}
    size = window.get('context_window_size') or DEFAULT_WINDOW
    used_pct = window.get('used_percentage')
    record = {
        'at': now_utc(),
        'source': 'statusline',
        'session_id': session_id,
        'window_size': size,
        'used_pct': used_pct,
        'remaining_tokens': None if used_pct is None else int(round(size * (100.0 - used_pct) / 100.0)),
        'cwd': payload.get('cwd'),
    }
    previous = read_json(usage_path(state, session_id))
    write_json(usage_path(state, session_id), record)
    if previous is None:
        append_log(state, 'bridge-first-write', session_id=session_id, used_pct=used_pct, window_size=size)
    return record


def statusline_text(record):
    """The short line the status line shows."""
    if record.get('used_pct') is None:
        return 'ctx --'
    return 'ctx %.0f%% (%dk left)' % (record['used_pct'], record['remaining_tokens'] // 1000)


def _last_usage_in_transcript(transcript_path):
    """(input-side tokens, model id) of the last assistant message, or (None, None)."""
    try:
        size = os.path.getsize(transcript_path)
        with open(transcript_path, 'rb') as f:
            f.seek(max(0, size - TRANSCRIPT_TAIL_BYTES))
            tail = f.read().decode('utf-8', errors='replace')
    except (OSError, TypeError):
        return None, None
    for line in reversed(tail.splitlines()):
        if '"usage"' not in line:
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        message = row.get('message') if isinstance(row, dict) else None
        usage = message.get('usage') if isinstance(message, dict) else None
        if not isinstance(usage, dict):
            continue
        tokens = sum(int(usage.get(k) or 0) for k in
                     ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'))
        return tokens, message.get('model')
    return None, None


def window_size_guess(tokens, model, window_setting=0):
    """The window size when no status line has reported it.

    In order: the `window_size` setting; 1M for a model id with "[1m]"; the
    window of a model id that starts with a MODEL_WINDOWS key; 1M when the
    session already holds more than the auto-compact line of a 200k window
    (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, else 95%) and was not compacted -- a 200k
    window would have been; otherwise 200k. The transcript does not carry the
    size, so an unlisted 1M model reads as 200k below that line (DFC-3422):
    list it in MODEL_WINDOWS or set `window_size`.
    """
    if window_setting:
        return int(window_setting)
    if model and '[1m]' in model:
        return EXTENDED_WINDOW
    for prefix, size in MODEL_WINDOWS.items():
        if model and model.startswith(prefix):
            return size
    try:
        compact_pct = float(os.environ.get('CLAUDE_AUTOCOMPACT_PCT_OVERRIDE') or 95)
    except ValueError:
        compact_pct = 95.0
    if tokens > DEFAULT_WINDOW * compact_pct / 100.0:
        return EXTENDED_WINDOW
    return DEFAULT_WINDOW


def current_usage(state, session_id, transcript_path=None, window_setting=0):
    """The best known usage record for a session, or None when nothing is known."""
    record = read_json(usage_path(state, session_id)) if session_id else None
    if record and record.get('used_pct') is not None:
        return record
    tokens, model = _last_usage_in_transcript(transcript_path)
    if tokens is None:
        return record
    size = (record or {}).get('window_size') or window_size_guess(tokens, model, window_setting)
    return {
        'at': now_utc(),
        'source': 'transcript',
        'session_id': session_id,
        'window_size': size,
        'used_pct': round(100.0 * tokens / size, 1),
        'remaining_tokens': size - tokens,
    }


def over_warn_line(record, config):
    """True when the record crosses the warning line (percent OR remaining tokens)."""
    if not record or record.get('used_pct') is None:
        return False
    return (record['used_pct'] > config['warn_pct']
            or record['remaining_tokens'] < config['warn_remaining'])
