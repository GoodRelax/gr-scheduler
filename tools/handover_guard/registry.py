# -*- coding: utf-8 -*-
"""The session registry: who the coordinator is, its child sessions, and their state.

One JSON file, <state>/registry.json (see common.state_dir: inside the git
common directory, so it is local, shared by every checkout, and never
committed). Sessions are keyed by their host session id -- the `local_...` id
that SendMessage takes, which a session reads about itself from
CLAUDE_CODE_HOST_SESSION_ID.

  registry show [--json]
  registry coordinator [--host ID] [--note TEXT]   become the coordinator (coordinator handover)
  registry add-child ID --name N [--branch B] [--bands TEXT] [--next TEXT]
  registry set ID [--state S] [--branch B] [--bands TEXT] [--next TEXT]
  registry note [--host ID] --next TEXT            a child writes its handover (next steps)
  registry ack [--host ID]                         a child acknowledges the current coordinator
  registry complete [--host ID] --result TEXT      a child declares "Session complete"
  registry pending-acks                            live children that have not acked

States: working, waiting, reported, complete, stopped. "Live" is every state
except complete and stopped.
"""
import argparse
import contextlib
import json
import os
import sys
import time

from common import append_log, now_utc, read_json, state_dir, write_json

STATES = ('working', 'waiting', 'reported', 'complete', 'stopped')
ENDED = ('complete', 'stopped')
LOCK_WAIT_SECONDS = 10


def registry_path(state):
    return os.path.join(state, 'registry.json')


def empty_registry():
    return {'coordinator': None, 'coordinator_history': [], 'children': {}}


def load(state):
    data = read_json(registry_path(state)) or empty_registry()
    for key, value in empty_registry().items():
        data.setdefault(key, value)
    return data


@contextlib.contextmanager
def locked(state):
    """Hold <state>/registry.lock while the registry is read and rewritten."""
    lock = os.path.join(state, 'registry.lock')
    deadline = time.time() + LOCK_WAIT_SECONDS
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError:
            if time.time() > deadline:
                # A lock older than the wait is a crashed writer's; take it over.
                os.unlink(lock)
                continue
            time.sleep(0.05)
    try:
        os.close(fd)
        yield
    finally:
        try:
            os.unlink(lock)
        except OSError:
            pass


def own_host_id(explicit=None):
    return explicit or os.environ.get('CLAUDE_CODE_HOST_SESSION_ID') or os.environ.get('CLAUDE_CODE_SESSION_ID')


def live_children(data):
    return {cid: c for cid, c in data['children'].items() if c.get('state') not in ENDED}


def role_of(data, host_id):
    """'coordinator', 'child', or None for a session the registry does not know."""
    if host_id and (data.get('coordinator') or {}).get('host_id') == host_id:
        return 'coordinator'
    if host_id and host_id in data['children']:
        return 'child'
    return None


def pending_acks(data):
    """Live children whose acknowledged parent is not the current coordinator."""
    current = (data.get('coordinator') or {}).get('host_id')
    return {cid: c for cid, c in live_children(data).items() if c.get('parent_acked') != current}


def _mutate(state, change, event, **log):
    with locked(state):
        data = load(state)
        result = change(data)
        write_json(registry_path(state), data)
    append_log(state, event, **log)
    return data, result


def become_coordinator(state, host_id, note=None):
    def change(data):
        previous = data.get('coordinator')
        if previous and previous.get('host_id') != host_id:
            data['coordinator_history'].append(dict(previous, until=now_utc()))
        data['coordinator'] = {'host_id': host_id, 'since': now_utc(), 'note': note}
        for child in data['children'].values():
            if child.get('state') not in ENDED:
                child['parent'] = host_id
        return previous
    return _mutate(state, change, 'coordinator', host_id=host_id)


def add_child(state, child_id, name, branch=None, bands=None, next_steps=None):
    def change(data):
        parent = (data.get('coordinator') or {}).get('host_id')
        data['children'][child_id] = {
            'name': name, 'state': 'working', 'parent': parent, 'parent_acked': parent,
            'branch': branch, 'bands': bands, 'next': next_steps,
            'added_at': now_utc(), 'updated_at': now_utc(), 'handover_at': None, 'result': None,
        }
    return _mutate(state, change, 'add-child', child=child_id, name=name)


def update_child(folder, child_id, event, **fields):
    """Merge the non-None fields into one child's record (`state` is the child's state)."""
    def change(data):
        child = data['children'].get(child_id)
        if child is None:
            raise KeyError(child_id)
        child.update({k: v for k, v in fields.items() if v is not None})
        child['updated_at'] = now_utc()
        return child
    return _mutate(folder, change, event, child=child_id, child_state=fields.get('state'),
                   parent_acked=fields.get('parent_acked'))


def summary_lines(data):
    """The registry as short lines for a person or for injected context."""
    coord = data.get('coordinator') or {}
    lines = ['Coordinator: %s (since %s)' % (coord.get('host_id') or '(none)', coord.get('since') or '-')]
    for cid, c in sorted(data['children'].items(), key=lambda kv: kv[1].get('added_at') or ''):
        ack = 'acked' if c.get('parent_acked') == coord.get('host_id') else 'NOT ACKED'
        lines.append('- %s %s [%s, %s] branch=%s bands=%s next=%s' % (
            c.get('name'), cid, c.get('state'), ack if c.get('state') not in ENDED else 'ended',
            c.get('branch') or '-', c.get('bands') or '-', c.get('next') or '-'))
    return lines


def _parser():
    p = argparse.ArgumentParser(prog='guard.py registry')
    sub = p.add_subparsers(dest='action')
    s = sub.add_parser('show')
    s.add_argument('--json', action='store_true')
    s = sub.add_parser('coordinator')
    s.add_argument('--host')
    s.add_argument('--note')
    s = sub.add_parser('add-child')
    s.add_argument('id')
    s.add_argument('--name', required=True)
    for opt in ('--branch', '--bands', '--next'):
        s.add_argument(opt)
    s = sub.add_parser('set')
    s.add_argument('id')
    s.add_argument('--state', choices=STATES)
    for opt in ('--branch', '--bands', '--next'):
        s.add_argument(opt)
    s = sub.add_parser('note')
    s.add_argument('--host')
    s.add_argument('--next', required=True)
    for name in ('ack', 'pending-acks'):
        s = sub.add_parser(name)
        s.add_argument('--host')
    s = sub.add_parser('complete')
    s.add_argument('--host')
    s.add_argument('--result', required=True)
    return p


def main(argv):
    args = _parser().parse_args(argv or ['show'])
    state = state_dir()
    try:
        if args.action in (None, 'show'):
            data = load(state)
            print(json.dumps(data, indent=2, ensure_ascii=False) if getattr(args, 'json', False)
                  else '\n'.join(summary_lines(data)))
        elif args.action == 'coordinator':
            data, previous = become_coordinator(state, own_host_id(args.host), args.note)
            print('Coordinator is now %s (was %s).' % (data['coordinator']['host_id'],
                                                       (previous or {}).get('host_id') or 'none'))
            waiting = pending_acks(data)
            if waiting:
                print('Tell each live child the new parent until it acks: ' + ', '.join(
                    '%s (%s)' % (c.get('name'), cid) for cid, c in waiting.items()))
        elif args.action == 'add-child':
            add_child(state, args.id, args.name, args.branch, args.bands, args.next)
            print('Added child %s (%s).' % (args.name, args.id))
        elif args.action == 'set':
            update_child(state, args.id, 'set', state=args.state, branch=args.branch,
                         bands=args.bands, next=args.next)
            print('Updated %s.' % args.id)
        elif args.action == 'note':
            update_child(state, own_host_id(args.host), 'note', next=args.next, handover_at=now_utc())
            print('Next steps recorded.')
        elif args.action == 'ack':
            parent = (load(state).get('coordinator') or {}).get('host_id')
            update_child(state, own_host_id(args.host), 'ack', parent=parent, parent_acked=parent)
            print('Acknowledged coordinator %s.' % parent)
        elif args.action == 'complete':
            update_child(state, own_host_id(args.host), 'complete', state='complete',
                         result=args.result, completed_at=now_utc(), handover_at=now_utc())
            print('Session complete recorded.')
        elif args.action == 'pending-acks':
            waiting = pending_acks(load(state))
            print('\n'.join('%s %s' % (cid, c.get('name')) for cid, c in waiting.items()) or 'none')
            return 1 if waiting else 0
    except KeyError as missing:
        print('Not in the registry: %s' % missing, file=sys.stderr)
        return 2
    return 0
