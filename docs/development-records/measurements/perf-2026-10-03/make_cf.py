"""Make counterfactual copies of a built candidate tree.

Usage: python make_cf.py <perf-dir> <source-sha> <variant>
  nohint   : the per-input hint walk (frame-loop.ts, hintWalkAt call in receiveInput) is not run
  instr    : time hintWalkAt and grabAtPointer per call into window.__grsWalk (calls, ms)
"""
import os, shutil, subprocess, sys

perf, sha, variant = sys.argv[1], sys.argv[2], sys.argv[3]
src = os.path.join(perf, sha)
dst = os.path.join(perf, sha + variant)
if os.path.exists(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('dist', 'test-results', 'build.log'))
path = os.path.join(dst, 'src', 'framework', 'single-html-shell', 'frame-loop.ts')
raw = open(path, 'rb').read().decode('utf-8')
nl = '\r\n' if raw.count('\r\n') * 2 > raw.count('\n') else '\n'
text = raw.replace('\r\n', '\n')

CALL = "      hintWalk = hintWalkAt(hintWalk, frame, pointerAt, partUnderPointer, dualCursorFollowingIn(session) !== null)\n"
GRAB = "      grabUnderPointer = grabAtPointer(frame, pointerAt.x, pointerAt.y, partUnderPointer)\n"
assert text.count(CALL) == 1, 'hint walk call not found once'
assert text.count(GRAB) == 1, 'grab call not found once'
if variant == 'nohint':
    text = text.replace(CALL, "      hintWalk = null\n")
elif variant == 'instr':
    acc = ("      const w = ((globalThis as any).__grsWalk ??= { grab: [0, 0], hint: [0, 0], walked: 0 })\n"
           "      let t0 = performance.now()\n")
    text = text.replace(GRAB, acc + GRAB.replace('\n', '') + "; w.grab[0]++; w.grab[1] += performance.now() - t0\n")
    text = text.replace(CALL, "      t0 = performance.now(); const before = hintWalk\n" + CALL.replace('\n', '') +
                        "; w.hint[0]++; w.hint[1] += performance.now() - t0; if (hintWalk !== before && hintWalk !== null) w.walked++\n")
else:
    raise SystemExit('unknown variant')
open(path, 'wb').write(text.replace('\n', nl).encode('utf-8'))
root_nm = os.path.normpath(os.path.join(os.path.abspath(perf), '..', '..', '..', '..', '..', 'node_modules'))
done = subprocess.run(['node', os.path.join(root_nm, 'vite', 'bin', 'vite.js'), 'build'], cwd=dst, capture_output=True, text=True, encoding='utf-8', errors='replace')
open(os.path.join(dst, 'build.log'), 'w', encoding='utf-8').write(done.stdout + done.stderr)
print(dst, 'build exit', done.returncode)
