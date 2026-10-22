# -*- coding: utf-8 -*-
"""Scenario test of the handover guard at a low threshold (5%), in a temp folder.

Runs guard.py as the hooks would (JSON on stdin, one subprocess per call) and
checks every part: the status line bridge, the warning, PreCompact blocking and
allowing, PostCompact saving the summary, SessionStart(compact) re-injecting,
the coordinator handover with child acks, a child's note and "Session complete",
and the transcript fallback. Nothing outside the temp folder is touched.

  python tools/handover_guard/self_test.py [--keep DIR]

--keep DIR copies the temp folder's events.jsonl and a transcript of every
call into DIR as evidence.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
GUARD = os.path.join(HERE, 'guard.py')
NEW = '\U0001F195'
FIRST = '\u6b21\u306e\u30bb\u30c3\u30b7\u30e7\u30f3\u306b\u8cbc\u308b 1 \u901a\u76ee'


class Run:
    def __init__(self, root):
        self.root = root
        self.state = os.path.join(root, 'state')
        self.handoff = os.path.join(root, 'handoff.md')
        self.log = []
        self.failures = []

    def call(self, args, payload=None, host=None, env_extra=None):
        env = dict(os.environ, GRS_GUARD_STATE_DIR=self.state, GRS_GUARD_HANDOFF=self.handoff,
                   GRS_GUARD_WARN_PCT='5', PYTHONIOENCODING='utf-8', CLAUDE_AUTOCOMPACT_PCT_OVERRIDE='80')
        for name in ('CLAUDE_CODE_HOST_SESSION_ID', 'CLAUDE_CODE_SESSION_ID', 'GRS_GUARD_WINDOW'):
            env.pop(name, None)
        if host:
            env['CLAUDE_CODE_HOST_SESSION_ID'] = host
        env.update(env_extra or {})
        out = subprocess.run([sys.executable, GUARD] + args, input=json.dumps(payload or {}).encode('utf-8'),
                             capture_output=True, env=env, cwd=self.root, timeout=60)
        result = (out.returncode, out.stdout.decode('utf-8', 'replace'), out.stderr.decode('utf-8', 'replace'))
        self.log.append({'args': args, 'host': host, 'payload': payload, 'exit': result[0],
                         'stdout': result[1], 'stderr': result[2]})
        return result

    def expect(self, label, ok):
        print('%s %s' % ('ok  ' if ok else 'FAIL', label))
        if not ok:
            self.failures.append(label)


def payload(event, sid, **extra):
    data = {'session_id': sid, 'transcript_path': None, 'cwd': '.', 'hook_event_name': event}
    data.update(extra)
    return data


def write_handoff(path, names):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# handoff\n\n> %s **2026-10-22 test** children: %s\n\n## %s\n' % (NEW, ' '.join(names), FIRST))


def scenario(r):
    sid, coord, coord2, child1, child2 = 'cli-1', 'local_aaaa1111-0', 'local_bbbb2222-0', \
        'local_cccc3333-0', 'local_dddd4444-0'
    # 1. the bridge: a status line payload becomes the usage file
    code, out, _ = r.call(['statusline'], {'session_id': sid, 'cwd': '.', 'context_window':
                                           {'context_window_size': 200000, 'used_percentage': 6}})
    usage = json.load(open(os.path.join(r.state, 'usage', sid + '.json'), encoding='utf-8'))
    r.expect('statusline writes used_pct=6 and prints a line', usage['used_pct'] == 6 and 'ctx 6%' in out)
    # 2. registry: coordinator and two children
    r.call(['registry', 'coordinator'], host=coord)
    r.call(['registry', 'add-child', child1, '--name', 'one', '--bands', 'JDG-1..2'], host=coord)
    r.call(['registry', 'add-child', child2, '--name', 'two'], host=coord)
    # 3. 6% > 5%: the coordinator is warned on its next tool call
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', sid), host=coord)
    r.expect('post-tool-use warns over the line', 'Hand over now' in out and 'additionalContext' in out)
    # 4. automatic compaction is held back while the handoff note is stale
    code, _, err = r.call(['hook', 'pre-compact'], payload('PreCompact', sid, trigger='auto'), host=coord)
    r.expect('pre-compact auto blocks with exit 2 while stale', code == 2 and 'held back' in err)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', sid, trigger='manual'), host=coord)
    r.expect('pre-compact manual passes', code == 0)
    # 5. a handoff note missing a live child is still stale; a complete one is not
    time.sleep(1.1)
    write_handoff(r.handoff, ['one'])
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', sid, trigger='auto'), host=coord)
    r.expect('handoff note missing child "two" still blocks', code == 2)
    code, out, _ = r.call(['check-handoff', r.handoff])
    r.expect('check-handoff names the missing child', code == 1 and 'two' in out)
    write_handoff(r.handoff, ['one', 'dddd4444'])
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', sid, trigger='auto'), host=coord)
    r.expect('complete handoff note lets auto compaction pass', code == 0)
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', sid), host=coord)
    r.expect('post-tool-use stops the warning once handed over', 'Hand over now' not in out)
    # 6. the ceiling always lets compaction through
    r.call(['statusline'], {'session_id': 'cli-hi', 'context_window':
                            {'context_window_size': 200000, 'used_percentage': 96}})
    r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-hi'), host=coord)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', 'cli-hi', trigger='auto'), host=coord)
    r.expect('pre-compact passes at the 95% ceiling', code == 0)
    # 7. PostCompact saves the summary; SessionStart(compact) re-injects
    r.call(['hook', 'post-compact'], payload('PostCompact', sid, trigger='auto',
                                             compact_summary='SUMMARY-TEXT-42'), host=coord)
    saved = os.listdir(os.path.join(r.state, 'compact'))
    text = open(os.path.join(r.state, 'compact', saved[0]), encoding='utf-8').read() if saved else ''
    r.expect('post-compact saves compact_summary', text == 'SUMMARY-TEXT-42')
    code, out, _ = r.call(['hook', 'session-start'], payload('SessionStart', sid, source='compact'), host=coord)
    r.expect('session-start(compact) re-injects handoff and registry',
             'just compacted' in out and '2026-10-22 test' in out and 'Coordinator: ' + coord in out)
    # 8. coordinator handover: the new parent is told until every live child acks
    code, out, _ = r.call(['registry', 'coordinator'], host=coord2)
    r.expect('new coordinator is told to notify both children', 'one' in out and 'two' in out)
    code, out, _ = r.call(['hook', 'session-start'], payload('SessionStart', 'cli-2', source='startup'),
                          host=coord2)
    r.expect('session-start lists unacked children for the new coordinator',
             'not acked' in out and child1 in out and child2 in out)
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-c1'), host=child1)
    r.expect('child is told its new parent', 'parent session is now ' + coord2 in out)
    r.call(['registry', 'ack'], host=child1)
    code, out, _ = r.call(['registry', 'pending-acks'])
    r.expect('after one ack only child two is pending', code == 1 and child2 in out and child1 not in out)
    # 9. a child hands over with a note, and declares Session complete
    r.call(['statusline'], {'session_id': 'cli-c2', 'context_window':
                            {'context_window_size': 200000, 'used_percentage': 7}})
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-c2'), host=child2)
    r.expect('child is warned with the registry-note instruction', 'registry note' in out)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', 'cli-c2', trigger='auto'), host=child2)
    r.expect('child auto compaction blocked before its note', code == 2)
    time.sleep(1.1)
    r.call(['registry', 'note', '--next', 'finish part 3'], host=child2)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', 'cli-c2', trigger='auto'), host=child2)
    r.expect('child auto compaction passes after its note', code == 0)
    r.call(['registry', 'complete', '--result', 'done; sha abc'], host=child2)
    code, out, _ = r.call(['registry', 'pending-acks'])
    r.expect('a completed child is no longer pending', code == 0 and out.strip() == 'none')
    code, out, _ = r.call(['registry', 'show'])
    r.expect('registry shows the completed child as ended', '[complete, ended]' in out)
    # 10. a session the registry does not know is warned but never held back
    stranger = 'local_eeee5555-0'
    r.call(['statusline'], {'session_id': 'cli-s', 'context_window':
                            {'context_window_size': 200000, 'used_percentage': 8}})
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-s'), host=stranger)
    r.expect('an unregistered session is warned to report to its parent', 'not in the session registry' in out)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', 'cli-s', trigger='auto'), host=stranger)
    r.expect('an unregistered session is not held back', code == 0)
    # 11. no status line: the transcript's last usage is the fallback
    transcript = os.path.join(r.root, 't.jsonl')
    with open(transcript, 'w', encoding='utf-8') as f:
        f.write(json.dumps({'message': {'model': 'm', 'usage': {
            'input_tokens': 10, 'cache_creation_input_tokens': 990, 'cache_read_input_tokens': 19000,
            'output_tokens': 5}}}) + '\n')
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-t', transcript_path=transcript))
    r.expect('transcript fallback reads 20000/200000 = 10% and warns', 'Context 10% used' in out)
    regressions(r)


def write_transcript(path, tokens, model):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(json.dumps({'message': {'model': model, 'usage': {
            'input_tokens': 0, 'cache_creation_input_tokens': 0, 'cache_read_input_tokens': tokens,
            'output_tokens': 5}}}) + chr(10))


def regressions(r):
    """DFC-3422..3425, found by the live test of 2026-10-22."""
    at85 = {'GRS_GUARD_WARN_PCT': '85'}
    # DFC-3422: a 1M model below 160k tokens was read against a guessed 200k window
    transcript = os.path.join(r.root, 'opus.jsonl')
    write_transcript(transcript, 150000, 'claude-opus-5-5')
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-a', transcript_path=transcript),
                          env_extra=at85)
    r.expect('DFC-3422 a known 1M model at 150k tokens is not warned', 'Hand over now' not in out
             and 'Context' not in out)
    code, out, _ = r.call(['status'], env_extra=dict(at85, CLAUDE_CODE_SESSION_ID='cli-a'))
    r.expect('DFC-3423 status reads the transcript the hooks saw (15% of 1M)',
             '"used_pct": 15.0' in out and '"window_size": 1000000' in out)
    # DFC-3424: with an empty registry a session has no role and gets the neutral text
    empty = os.path.join(r.root, 'empty-state')
    env_empty = {'GRS_GUARD_STATE_DIR': empty}
    r.call(['statusline'], {'session_id': 'cli-e', 'context_window':
                            {'context_window_size': 200000, 'used_percentage': 8}}, env_extra=env_empty)
    code, out, _ = r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-e'), host='local_ffff6666-0',
                          env_extra=env_empty)
    r.expect('DFC-3424 an empty registry gives the neutral text, not "rewrite the handoff note"',
             'not in the session registry' in out and 'rewrite the handoff note' not in out)
    code, _, _ = r.call(['hook', 'pre-compact'], payload('PreCompact', 'cli-e', trigger='auto'),
                        host='local_ffff6666-0', env_extra=env_empty)
    r.expect('DFC-3424 a session with no role is not held back', code == 0)
    # DFC-3425: the warning is cleared once usage falls back under the line
    r.call(['statusline'], {'session_id': 'cli-e', 'context_window':
                            {'context_window_size': 200000, 'used_percentage': 3}}, env_extra=env_empty)
    r.call(['hook', 'post-tool-use'], payload('PostToolUse', 'cli-e'), host='local_ffff6666-0',
           env_extra=env_empty)
    sess = json.load(open(os.path.join(empty, 'sessions', 'cli-e.json'), encoding='utf-8'))
    r.expect('DFC-3425 warned_at is cleared under the line', sess.get('warned_at') is None)


def main(argv):
    keep = argv[argv.index('--keep') + 1] if '--keep' in argv else None
    root = tempfile.mkdtemp(prefix='handover-guard-')
    r = Run(root)
    try:
        scenario(r)
    finally:
        if keep:
            os.makedirs(keep, exist_ok=True)
            shutil.copy(os.path.join(r.state, 'events.jsonl'), os.path.join(keep, 'events.jsonl'))
            with open(os.path.join(keep, 'calls.json'), 'w', encoding='utf-8') as f:
                json.dump(r.log, f, ensure_ascii=False, indent=1)
        shutil.rmtree(root, ignore_errors=True)
    print('self-test %s (%d failed)' % ('passed' if not r.failures else 'FAILED', len(r.failures)))
    return 1 if r.failures else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
