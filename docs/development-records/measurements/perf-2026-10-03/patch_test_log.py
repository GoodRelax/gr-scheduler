"""In a counterfactual copy's perf test, print window.__grsWalk at the end of every stretch.

Usage: python patch_test_log.py <copy-dir>
"""
import os, sys

path = os.path.join(sys.argv[1], 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')
raw = open(path, 'rb').read().decode('utf-8')
nl = '\r\n' if raw.count('\r\n') * 2 > raw.count('\n') else '\n'
text = raw.replace('\r\n', '\n')
OLD = "  await markSegment(page, name, 'end')\n"
assert text.count(OLD) == 1
NEW = (OLD + "  console.log('WALK ' + name + ' ' + (await page.evaluate(() => "
       "JSON.stringify((globalThis as any).__grsWalk ?? null) + ' svgNodes ' + "
       "String(document.querySelectorAll('svg *').length) + ' domNodes ' + String(document.querySelectorAll('*').length))))\n")
text = text.replace(OLD, NEW)
open(path, 'wb').write(text.replace('\n', nl).encode('utf-8'))
print('patched', path)
