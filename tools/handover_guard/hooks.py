# -*- coding: utf-8 -*-
"""The hook events of the handover guard.

  post-tool-use   (PostToolUse, every tool)  warn once the context crosses the
                  warning line (85% used OR fewer than 60k tokens left) until
                  the session has handed over; remind a coordinator of children
                  that have not acked it, and a child of a parent it has not acked.
  pre-compact     (PreCompact)  block an AUTOMATIC compaction (exit 2) while the
                  session has not handed over since the warning. A manual
                  /compact always passes, and so does any compaction once usage
                  reaches the ceiling (95%): that one may be the recovery from a
                  context-limit error, which a block would turn into a failed
                  request (code.claude.com hooks page, PreCompact).
  post-compact    (PostCompact)  save compact_summary under <state>/compact/ and
                  start a new warning cycle.
  session-start   (SessionStart)  after a compaction, put the handoff note's newest
                  section, the registry and the saved summary back into context;
                  on any start, tell a coordinator about unacked children and a
                  child about a new parent.

"Handed over" means: a coordinator (or a session the registry does not know)
has a handoff note that passes check-handoff and was written after the warning;
a child has run `registry note` or `registry complete` after the warning.
Every decision is logged to <state>/events.jsonl.
"""
import datetime
import json
import os
import sys

from common import append_log, checkout_root, now_utc, parse_utc, read_json, settings, state_dir, write_json
import handoff_check
import registry
from usage import current_usage, over_warn_line

REMIND_EVERY = datetime.timedelta(minutes=10)
ACK_REMIND_EVERY = datetime.timedelta(minutes=5)
SECTION_CHAR_CAP = 6000


def _session_path(state, session_id):
    return os.path.join(state, 'sessions', '%s.json' % session_id)


def _load_session(state, session_id):
    data = read_json(_session_path(state, session_id)) or {}
    data.setdefault('session_id', session_id)
    host = os.environ.get('CLAUDE_CODE_HOST_SESSION_ID')
    if host:
        data['host_id'] = host
    return data


def _due(stamp, every):
    last = parse_utc(stamp)
    return last is None or datetime.datetime.now(datetime.timezone.utc) - last >= every


def _mtime_utc(path):
    try:
        return datetime.datetime.fromtimestamp(os.path.getmtime(path), datetime.timezone.utc)
    except OSError:
        return None


def handed_over(state, sess, data, cwd):
    """(True/False, reason) -- has this session handed over since its warning?"""
    warned = parse_utc(sess.get('warned_at'))
    if warned is None:
        return False, 'no warning yet in this cycle'
    host = sess.get('host_id')
    if registry.role_of(data, host) == 'child':
        child = data['children'][host]
        stamp = parse_utc(child.get('handover_at'))
        if stamp and stamp >= warned:
            return True, 'registry note at %s' % child['handover_at']
        return False, 'no `registry note` since the warning'
    path = handoff_check.handoff_file(cwd)
    written = _mtime_utc(path)
    if written is None or written < warned:
        return False, 'handoff note not written since the warning'
    missing = handoff_check.check(path, data)
    if missing:
        return False, 'handoff note incomplete: ' + '; '.join(missing)
    return True, 'handoff note written and complete'


def _warning_text(record, config, role, reason):
    head = ('[handover-guard] Context %.0f%% used, %dk tokens left (warning line %.0f%% or %dk left). '
            % (record['used_pct'], record['remaining_tokens'] // 1000, config['warn_pct'],
               config['warn_remaining'] // 1000))
    if role == 'child':
        return head + ('Hand over now (%s): record your next steps with '
                       '`python tools/handover_guard/guard.py registry note --next "..."`, '
                       'and report to the coordinator.' % reason)
    return head + ('Hand over now (%s): rewrite the handoff note %s, run '
                   '`python tools/handover_guard/guard.py check-handoff` until it is green, '
                   'update the session registry, then start the coordinator handover.'
                   % (reason, config['handoff_path']))


def _ack_texts(data, role, host, sess):
    """Reminders about parent acknowledgements; updates the throttle stamp in sess."""
    if not _due(sess.get('last_ack_notice_at'), ACK_REMIND_EVERY):
        return []
    texts = []
    coord = (data.get('coordinator') or {}).get('host_id')
    if role == 'coordinator':
        waiting = registry.pending_acks(data)
        if waiting:
            texts.append('[handover-guard] You are the coordinator; these live child sessions have not acked '
                         'you as their parent yet. SendMessage each one the new parent id (%s) and ask it to run '
                         '`python tools/handover_guard/guard.py registry ack`: %s'
                         % (coord, ', '.join('%s (%s)' % (c.get('name'), cid) for cid, c in waiting.items())))
    elif role == 'child':
        child = data['children'][host]
        if child.get('parent_acked') != coord and child.get('state') not in registry.ENDED:
            texts.append('[handover-guard] Your parent session is now %s (the registry says so). Run '
                         '`python tools/handover_guard/guard.py registry ack`, and report to it from now on.'
                         % coord)
    if texts:
        sess['last_ack_notice_at'] = now_utc()
    return texts


def on_post_tool_use(state, payload):
    sid = payload.get('session_id') or 'unknown'
    cwd = payload.get('cwd') or os.getcwd()
    config = settings(state)
    sess = _load_session(state, sid)
    data = registry.load(state)
    role = registry.role_of(data, sess.get('host_id'))
    record = current_usage(state, sid, payload.get('transcript_path'), config['window_size'])
    texts = []
    if over_warn_line(record, config):
        if not sess.get('warned_at'):
            sess['warned_at'] = now_utc()
            append_log(state, 'warn-crossed', session_id=sid, used_pct=record['used_pct'],
                       remaining=record['remaining_tokens'], source=record.get('source'))
        done, reason = handed_over(state, sess, data, cwd)
        if not done:
            texts.append(_warning_text(record, config, role, reason))
        elif _due(sess.get('last_notice_at'), REMIND_EVERY):
            texts.append('[handover-guard] Handed over (%s). Finish the handover; compaction is allowed now.'
                         % reason)
    texts += _ack_texts(data, role, sess.get('host_id'), sess)
    if texts:
        sess['last_notice_at'] = now_utc()
        append_log(state, 'notice', session_id=sid, count=len(texts), first=texts[0][:120])
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse',
                                                 'additionalContext': '\n'.join(texts)}}))
    write_json(_session_path(state, sid), sess)
    return 0


def on_pre_compact(state, payload):
    sid = payload.get('session_id') or 'unknown'
    trigger = payload.get('trigger')
    config = settings(state)
    sess = _load_session(state, sid)
    record = current_usage(state, sid, payload.get('transcript_path'), config['window_size'])
    used = None if not record else record.get('used_pct')
    if trigger != 'auto':
        verdict, reason = 'allow', 'manual compaction'
    elif used is None:
        verdict, reason = 'allow', 'usage unknown'
    elif used >= config['ceiling_pct']:
        verdict, reason = 'allow', 'at or above the ceiling %.0f%%' % config['ceiling_pct']
    else:
        done, why = handed_over(state, sess, registry.load(state), payload.get('cwd') or os.getcwd())
        verdict, reason = ('allow', why) if done else ('block', why)
    append_log(state, 'precompact-' + verdict, session_id=sid, trigger=trigger, used_pct=used, reason=reason)
    write_json(_session_path(state, sid), sess)
    if verdict == 'block':
        print('[handover-guard] Automatic compaction held back: %s. Hand over first '
              '(see the handoff note and `guard.py check-handoff`).' % reason, file=sys.stderr)
        return 2
    return 0


def on_post_compact(state, payload):
    sid = payload.get('session_id') or 'unknown'
    sess = _load_session(state, sid)
    stamp = now_utc().replace(':', '')
    path = os.path.join(state, 'compact', '%s-%s.md' % (sid, stamp))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(payload.get('compact_summary') or '')
    sess['last_summary'] = path
    sess['compactions'] = int(sess.get('compactions') or 0) + 1
    sess['warned_at'] = None
    write_json(_session_path(state, sid), sess)
    append_log(state, 'postcompact-saved', session_id=sid, trigger=payload.get('trigger'),
               chars=len(payload.get('compact_summary') or ''), path=os.path.basename(path))
    return 0


def _after_compact_text(state, sess, data, cwd):
    path = handoff_check.handoff_file(cwd)
    try:
        with open(path, encoding='utf-8') as f:
            section = '\n'.join(handoff_check.newest_section(f.read().splitlines()))
    except OSError:
        section = '(handoff note not found)'
    if len(section) > SECTION_CHAR_CAP:
        section = section[:SECTION_CHAR_CAP] + '\n... (cut; read the file)'
    rel = os.path.relpath(path, checkout_root(cwd))
    lines = ['[handover-guard] This session was just compacted. Re-read the handoff note %s and the '
             'session registry before going on. Then tell your parent and every live child session '
             'again who you are and that you are still their parent or child.' % rel.replace(os.sep, '/'),
             '--- newest section of the handoff note ---', section,
             '--- session registry ---'] + registry.summary_lines(data)
    if sess.get('last_summary'):
        lines.append('--- the compaction summary was saved as %s in the registry folder ---'
                     % os.path.basename(sess['last_summary']))
    return '\n'.join(lines)


def on_session_start(state, payload):
    sid = payload.get('session_id') or 'unknown'
    cwd = payload.get('cwd') or os.getcwd()
    sess = _load_session(state, sid)
    data = registry.load(state)
    role = registry.role_of(data, sess.get('host_id'))
    texts = []
    if payload.get('source') == 'compact':
        texts.append(_after_compact_text(state, sess, data, cwd))
    sess['last_ack_notice_at'] = None
    texts += _ack_texts(data, role, sess.get('host_id'), sess)
    append_log(state, 'session-start', session_id=sid, source=payload.get('source'), role=role,
               notices=len(texts))
    write_json(_session_path(state, sid), sess)
    if texts:
        print('\n'.join(texts))
    return 0


HANDLERS = {
    'post-tool-use': on_post_tool_use,
    'pre-compact': on_pre_compact,
    'post-compact': on_post_compact,
    'session-start': on_session_start,
}


def run(event, payload):
    handler = HANDLERS.get(event)
    if handler is None:
        print('unknown hook event: %s' % event, file=sys.stderr)
        return 1
    state = state_dir(payload.get('cwd') or None)
    try:
        return handler(state, payload)
    except Exception as error:  # a broken guard must never stop the session
        append_log(state, 'hook-error', hook=event, error=repr(error)[:300])
        print('[handover-guard] %s hook failed: %r' % (event, error), file=sys.stderr)
        return 0


def status_text(session_id, transcript_path, cwd):
    state = state_dir(cwd)
    config = settings(state)
    data = registry.load(state)
    sess = _load_session(state, session_id or 'unknown')
    record = current_usage(state, session_id, transcript_path, config['window_size'])
    done, reason = handed_over(state, sess, data, cwd)
    lines = ['State folder: %s' % os.path.relpath(state, cwd).replace(os.sep, '/'),
             'Settings: warn %.0f%% or %dk left, ceiling %.0f%%' % (
                 config['warn_pct'], config['warn_remaining'] // 1000, config['ceiling_pct']),
             'Usage: %s' % (json.dumps(record, sort_keys=True) if record else 'unknown'),
             'Role: %s; warned_at=%s; handed over: %s (%s)' % (
                 registry.role_of(data, sess.get('host_id')), sess.get('warned_at'), done, reason)]
    return '\n'.join(lines + registry.summary_lines(data))
