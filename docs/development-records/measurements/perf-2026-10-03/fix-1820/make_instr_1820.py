"""Copy an archive tree to <sha>instr, count the per-input answers, the walk builds and the held pictures, rebuild.

Usage: python make_instr_1820.py <perf-dir> <sha>
window.__grsWalk = { answers: [calls, ms], build: [count, ms], picture: [held, built] }  (cumulative over the run)
The picture counter is only filled on a tree that has drawnPictureOf (DFC-1820).
"""
import os, shutil, subprocess, sys

perf, sha = sys.argv[1], sys.argv[2]
src = os.path.join(perf, sha)
dst = os.path.join(perf, sha + 'instr')
if os.path.exists(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('dist', 'test-results', 'build.log'))
path = os.path.join(dst, 'src', 'framework', 'single-html-shell', 'frame-loop.ts')
raw = open(path, 'rb').read().decode('utf-8')
nl = '\r\n' if raw.count('\r\n') * 2 > raw.count('\n') else '\n'
text = raw.replace('\r\n', '\n')
W = "((globalThis as any).__grsWalk ??= { answers: [0, 0], build: [0, 0], picture: [0, 0] })"
CALL = "      const answers = answersAtPointerOf(frame, pointerAt.x, pointerAt.y, partUnderPointer)\n"
BUILD = "    if (pointerWalk?.geometry !== frame.geometry) pointerWalk = pointerWalkOf(frame.geometry, grabSizesOf())\n"
HELD = "  if (held !== null && isSamePictureInputs(held.inputs, inputs)) return held\n"
assert text.count(CALL) == 1 and text.count(BUILD) == 1
text = text.replace(CALL, "      const t0 = performance.now()\n" + CALL +
                    "      ;" + W + ".answers[0]++; " + W + ".answers[1] += performance.now() - t0\n")
text = text.replace(BUILD, "    if (pointerWalk?.geometry !== frame.geometry) { const t1 = performance.now(); pointerWalk = pointerWalkOf(frame.geometry, grabSizesOf()); ;"
                    + W + ".build[0]++; " + W + ".build[1] += performance.now() - t1 }\n")
if text.count(HELD) == 1:
    text = text.replace(HELD, "  if (held !== null && isSamePictureInputs(held.inputs, inputs)) { " + W + ".picture[0]++; return held }\n  ;"
                        + W + ".picture[1]++\n")
    print('picture counter patched')
open(path, 'wb').write(text.replace('\n', nl).encode('utf-8'))
root_nm = os.path.normpath(os.path.join(os.path.abspath(perf), '..', '..', '..', '..', '..', 'node_modules'))
done = subprocess.run(['node', os.path.join(root_nm, 'vite', 'bin', 'vite.js'), 'build'], cwd=dst, capture_output=True, text=True, encoding='utf-8', errors='replace')
open(os.path.join(dst, 'build.log'), 'w', encoding='utf-8').write(done.stdout + done.stderr)
print(dst, 'build exit', done.returncode)
