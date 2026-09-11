# -*- coding: utf-8 -*-
"""Delete `docs/spec/output/` -- StrictDoc's generated tree -- unless the
StrictDoc server is running.

WHY THIS EXISTS. `docs/spec/output/` is not ours. It is what the StrictDoc
launcher writes when it exports the specification, and on 2026-09-11 it
measured 790 MB across 2,050 files, of which `strictdoc/_cache` alone was
740 MB. ⛔ NOTHING IN THIS REPOSITORY READS IT. `.gitignore` line 24 excludes
it, and `check.sh` does its own export into `scratch/spec-check/sd-out`, which
it clears itself. So the tree is pure residue: every byte of it is a copy of
something the manuscript already holds, kept at whatever date the launcher was
last opened.

⛔⛔ IT ACTIVELY CAUSES DEFECTS, AND HAS CAUSED ONE. The residue sits INSIDE
`docs/spec`, so every `grep -rn ... docs/spec` reads it as though it were the
manuscript. Measured 2026-09-11: `CM-70` appears ZERO times in the source
`_assets/tbl-glossary.md` and ONCE in the stale copy under `output/`, whose
four `.md` files are dated 2026-08-17. A subagent grepped `docs/spec`, found
the one hit, concluded the glossary row was live, and wrote that false claim
into `tests/unit/t-027-outside-the-history.test.ts`. ⇒ The tree is not merely
large. It answers questions about the specification with three-week-old text,
and it answers them silently, because a grep hit looks the same wherever it
came from.

⚠️ ITS SOURCE IS OUTSIDE THIS REPOSITORY, so no change here can stop it being
written again -- only stop it accumulating. The launcher that writes it is a
`.bat` file in its own folder on the machine, not a file this project tracks.
⭐ THE PERMANENT FIX IS ONE LINE, AND IT IS NOT IN THIS FILE: set `output_path`
in the launcher's own `server.config.json` (it sits beside
`launch-strictdoc.bat`, in the folder the launcher runs from, outside this
repository) to a folder OUTSIDE this repository. ⚠️ Its first level must still
be named `output` -- StrictDoc appends its own subtree under that name. ⛔ This
script does not edit that file and must not: it is outside the repository, and
this tool only ever deletes inside it.

WHAT THIS DOES NOT CLAIM. It does not claim the tree is safe to delete because
it is regenerable in general -- it claims it for this repository, on the two
measured facts above: nothing here reads the path, and the one gate that needs
a StrictDoc export makes its own elsewhere. If either stops being true, this
tool becomes wrong and the docstring is where to say so.

WHEN IT REFUSES. The launcher runs `strictdoc server` in its own window, and
that server serves the browser out of the very cache this would wipe. Deleting
740 MB from under a live server would break whatever the user has open. ⛔ So
a running server is a REFUSAL, NOT AN ERROR: the tool prints what it found,
deletes nothing, and exits 0. Two independent signs are looked for, and either
one is enough to refuse:

  - any of TCP ports 5111..5131 accepting a connection on 127.0.0.1. The
    launcher's start port is 5111 and it auto-assigns upward to start+20, so
    the whole band is the server's, not just the first.
  - any process whose command line mentions `strictdoc`. ⚠️ This process and
    its own ancestors are excluded by walking the parent chain from this PID:
    without that, the tool's OWN name -- `sweep_strictdoc_output.py` -- and the
    shell line that launched it both match, and it would refuse every single
    run. Measured 2026-09-11: three such self-matches, all of them ancestors.

⛔ STANDARD LIBRARY ONLY. `psutil` is not a dependency of this project
(checked 2026-09-11: `import psutil` raises) and this tool does not add one for
a janitor that runs at session start. The port test is a `connect_ex`; the
process list is asked of the operating system's own tool and every failure of
that call is treated as "cannot tell", never as "no server".

WHY IT DOES NOT EXIT NON-ZERO FOR A REFUSAL OR A MISSING TREE. It runs from a
SessionStart hook. A hook that exits 2 blocks the session, and a janitor has no
business doing that. The only non-zero exit here is the path assertion below,
which can fire only if this file has been moved or edited wrongly.

    python tools/sweep_strictdoc_output.py [--dry-run]
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TARGET_PARTS = ('docs', 'spec', 'output')
TARGET = os.path.join(ROOT, *TARGET_PARTS)

# ⛔⛔ SPELLED OUT A SECOND TIME, ON PURPOSE, AND NOT DERIVED FROM THE TUPLE
# ABOVE. Measured 2026-09-11 while proving the guard: the assertion originally
# compared the resolved path against `os.path.join(*TARGET_PARTS)`, which is
# the very tuple that BUILT the path -- so pointing TARGET_PARTS at
# `('docs', 'spec')` sailed straight through and the tool offered to delete the
# whole manuscript. A guard that reads its own input is not a guard. This
# literal is the independent witness; ⛔ if the target ever legitimately moves,
# BOTH must be edited, and that friction is the point.
REQUIRED_TAIL = ('docs', 'spec', 'output')

# The launcher's start port and the twenty it may auto-assign upward into.
PORTS = range(5111, 5132)

# ⚠️ Short, because a refused connection on a local port returns at once and a
# FILTERED one must not hold up session start for twenty-one ports in a row.
PORT_TIMEOUT_SECONDS = 0.15

SERVER_MARK = 'strictdoc'

# ⛔ This file's own stem contains SERVER_MARK. Any command line carrying it is
# this tool, however it was started, and can never be the server.
SELF_MARK = os.path.splitext(os.path.basename(__file__))[0]


def listening_ports():
    """Which of PORTS accept a TCP connection on the loopback address."""
    found = []
    for port in PORTS:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(PORT_TIMEOUT_SECONDS)
        try:
            if sock.connect_ex(('127.0.0.1', port)) == 0:
                found.append(port)
        except OSError:
            # ⛔ Cannot tell is not the same as not listening, but a socket
            # that will not even open says nothing about the server either.
            pass
        finally:
            sock.close()
    return found


def _windows_processes():
    """[(pid, parent_pid, command_line)] as Windows reports them.

    ⭐ `ConvertTo-Json` rather than a formatted table: the command lines hold
    quotes, backslashes and spaces, and any column layout would have to be
    unparsed again. ⛔ `wmic` is NOT used -- measured 2026-09-11, it is gone
    from this machine."""
    out = subprocess.run(
        ['powershell', '-NoProfile', '-NonInteractive', '-Command',
         'Get-CimInstance Win32_Process | '
         'Select-Object ProcessId,ParentProcessId,CommandLine | '
         'ConvertTo-Json -Compress'],
        capture_output=True, text=True, timeout=30, errors='replace')
    rows = json.loads(out.stdout)
    if isinstance(rows, dict):
        rows = [rows]
    return [(row.get('ProcessId'), row.get('ParentProcessId'),
             row.get('CommandLine') or '') for row in rows]


def _posix_processes():
    """[(pid, parent_pid, command_line)] as a POSIX `ps` reports them."""
    out = subprocess.run(
        ['ps', '-eo', 'pid=,ppid=,args='],
        capture_output=True, text=True, timeout=30, errors='replace')
    rows = []
    for line in out.stdout.splitlines():
        match = re.match(r'\s*(\d+)\s+(\d+)\s+(.*)$', line)
        if match:
            rows.append((int(match.group(1)), int(match.group(2)),
                         match.group(3)))
    return rows


def server_processes():
    """(matches, note) -- command lines that look like a running StrictDoc.

    `note` is None when the process list was actually read, and a sentence
    saying why not when it could not be. ⛔ A failure here is reported, never
    swallowed into an empty list that would read as "no server running"."""
    try:
        rows = (_windows_processes() if os.name == 'nt'
                else _posix_processes())
    except (OSError, ValueError, subprocess.SubprocessError) as problem:
        return [], 'the process list could not be read (%s)' % (problem,)

    # ⛔ THE ANCESTOR CHAIN, NOT JUST THIS PID. The shell that launched this
    # script carries the script's path on its own command line, and so does
    # whatever launched that shell.
    parent_of = {pid: parent for pid, parent, _cmd in rows}
    mine, walker = set(), os.getpid()
    while walker and walker not in mine:
        mine.add(walker)
        walker = parent_of.get(walker)

    matches = []
    for pid, _parent, cmd in rows:
        low = cmd.lower()
        if SERVER_MARK not in low or SELF_MARK in low:
            continue
        if pid in mine:
            continue
        matches.append('pid %s  %s' % (pid, cmd.strip()[:160]))
    return matches, None


def measure(path):
    """(bytes, file_count) under path, following no symlink."""
    total_bytes = 0
    files = 0
    for base, _dirs, names in os.walk(path):
        for name in names:
            full = os.path.join(base, name)
            files += 1
            try:
                total_bytes += os.lstat(full).st_size
            except OSError:
                pass
    return total_bytes, files


def human(byte_count):
    size = float(byte_count)
    for unit in ('B', 'KiB', 'MiB', 'GiB'):
        if size < 1024.0 or unit == 'GiB':
            return '%.1f %s' % (size, unit)
        size /= 1024.0


def path_is_sound():
    """Whether TARGET is exactly the tree this tool is allowed to delete.

    ⛔⛔ THE ONLY THING STANDING BETWEEN A JANITOR AND A MISTAKE. Every clause
    is checked against the resolved real path, not the string that was built,
    so a symlink or a `..` in ROOT cannot smuggle the target elsewhere."""
    problems = []
    root = os.path.realpath(ROOT)
    target = os.path.realpath(TARGET)

    tail = os.path.join(*REQUIRED_TAIL)
    if not target.replace('/', os.sep).endswith(os.sep + tail):
        problems.append('it does not end with %s' % (tail,))
    if target == root:
        problems.append('it is the repository root itself')
    try:
        if os.path.commonpath([root, target]) != root:
            problems.append('it is not inside the repository root')
    except ValueError:
        # Different drives have no common path at all.
        problems.append('it is not on the same drive as the repository root')
    if len(target.rstrip(os.sep).split(os.sep)) < 4:
        problems.append('it is too near the top of the filesystem to be ours')
    return problems


def main(argv):
    dry_run = '--dry-run' in argv[1:]
    unknown = [a for a in argv[1:] if a != '--dry-run']
    if unknown:
        print('PROBLEM  unrecognised argument(s): %s' % (' '.join(unknown),))
        return 1

    problems = path_is_sound()
    if problems:
        print('ABORT    refusing to delete %r -- %s' %
              (TARGET, '; '.join(problems)))
        print('         ⛔ Nothing was deleted. This can only happen if this '
              'file moved out of tools/ or the target was rewritten.')
        return 1

    if not os.path.isdir(TARGET):
        print('OK       docs/spec/output/ does not exist -- nothing to sweep.')
        return 0

    ports = listening_ports()
    matches, note = server_processes()
    if ports or matches:
        print('NOTICE   ⛔ StrictDoc looks like it is RUNNING -- deleted '
              'nothing, and that is the correct outcome, not an error.')
        if ports:
            print('         listening on 127.0.0.1 port(s): %s' %
                  (', '.join(str(p) for p in ports),))
        for line in matches[:5]:
            print('         %s' % (line,))
        print('         Close the StrictDoc server window and run '
              '`npm run sweep` again.')
        return 0
    if note:
        print('NOTE     %s -- the port scan alone said no server.' % (note,))

    total_bytes, files = measure(TARGET)
    if dry_run:
        print('DRY RUN  docs/spec/output/ holds %s across %d file(s); '
              'would delete all of it.' % (human(total_bytes), files))
    else:
        shutil.rmtree(TARGET, ignore_errors=True)
        if os.path.isdir(TARGET):
            left_bytes, left_files = measure(TARGET)
            print('PROBLEM  docs/spec/output/ is still present: %s across %d '
                  'file(s) could not be removed (a file may be open).' %
                  (human(left_bytes), left_files))
            return 0
        print('OK       swept docs/spec/output/ -- freed %s across %d file(s).'
              % (human(total_bytes), files))

    print('         ⭐ Permanent fix, one line and not in this repository: set '
          '`output_path` in the StrictDoc launcher\'s own '
          '`server.config.json`')
    print('         (beside `launch-strictdoc.bat`, outside this repository) '
          'to a folder OUTSIDE this repository.')
    print('         ⚠️ Its first level must still be named `output`.')
    return 0


# ⛔ The lines above carry ⛔ / ⭐ / ⚠️, and a Windows console defaults to
# cp932, which cannot encode any of them. Reconfigure the stream rather than
# asking a SessionStart hook to remember PYTHONIOENCODING.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv))
    except Exception as _problem:  # noqa: BLE001 -- see below
        # ⛔ A janitor on a SessionStart hook may not take the session down
        # with it. Say what broke and leave.
        print('PROBLEM  sweep_strictdoc_output.py failed: %r' % (_problem,))
        sys.exit(0)
