"""Shadow check for DFC-1820: on every held picture, also lay out and build the geometry afresh and deep-compare.

Usage: python shadow_patch.py apply|restore <log-path>
apply  : backs frame-loop.ts up to the scratchpad and patches drawnPictureOf
restore: puts the backup back byte for byte
Log characters: h = held and deep-equal to a fresh build, m = built (inputs moved), D... = held but different.
"""
import os, shutil, sys

mode, log = sys.argv[1], sys.argv[2]
path = 'src/framework/single-html-shell/frame-loop.ts'
backup = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frame-loop.ts.backup')
if mode == 'restore':
    shutil.copyfile(backup, path)
    print('restored')
    sys.exit(0)
shutil.copyfile(path, backup)
raw = open(path, 'rb').read().decode('utf-8')
nl = '\r\n' if raw.count('\r\n') * 2 > raw.count('\n') else '\n'
text = raw.replace('\r\n', '\n')
HELD = "  if (held !== null && isSamePictureInputs(held.inputs, inputs)) return held\n"
assert text.count(HELD) == 1
logjs = log.replace('\\', '/')
SHADOW = (
    "  if (held !== null && isSamePictureInputs(held.inputs, inputs)) {\n"
    "    const freshLayout = layoutFromSchedule(inputs.schedule, inputs.settings, inputs.regions, undefined, inputs.rowControlsHeightPx)\n"
    "    const freshGeometry = geometryFromLayout(inputs.schedule, inputs.settings, freshLayout, inputs.regions, inputs.selection, inputs.dualCursor, inputs.delayDiagnostics)\n"
    "    const same = shadowIsDeepStrictEqual(freshLayout, held.layout) && shadowIsDeepStrictEqual(freshGeometry, held.geometry)\n"
    f"    shadowAppendFileSync('{logjs}', same ? 'h' : 'D' + JSON.stringify(inputs.selection).slice(0, 80) + '\\n')\n"
    "    return held\n"
    "  }\n"
    f"  shadowAppendFileSync('{logjs}', 'm')\n"
)
text = text.replace(HELD, SHADOW)
text = "import { isDeepStrictEqual as shadowIsDeepStrictEqual } from 'node:util'\nimport { appendFileSync as shadowAppendFileSync } from 'node:fs'\n" + text
open(path, 'wb').write(text.replace('\n', nl).encode('utf-8'))
print('patched')
