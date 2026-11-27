# Apply the test-title tags of B10: read test-title-tags.tsv and replace each
# old title string with the new one, in the file the row names. A row whose old
# title is not found exactly once in that file stops the run before anything is
# written, so a stale list cannot half-apply.
#
# Usage: python apply_titles.py <tsv> [--write]
import sys
from collections import defaultdict

def main(argv):
    tsv = argv[1]
    write = '--write' in argv
    rows = []
    with open(tsv, encoding='utf-8') as f:
        header = f.readline().rstrip('\n').split('\t')
        for line in f:
            if not line.strip():
                continue
            cells = dict(zip(header, line.rstrip('\n').split('\t')))
            rows.append(cells)
    by_file = defaultdict(list)
    for r in rows:
        by_file[r['file']].append(r)
    faults = []
    texts = {}
    for path, items in by_file.items():
        raw = open(path, 'rb').read()
        crlf = b'\r\n' in raw
        text = raw.decode('utf-8').replace('\r\n', '\n')
        for r in items:
            old, new = r['old_title'], r['new_title']
            quoted = [q + old + q for q in ("'", '`', '"')]
            hits = sum(text.count(q) for q in quoted)
            if hits != 1:
                faults.append('%s: %d hit(s) for %r' % (path, hits, old[:80]))
                continue
            for q in ("'", '`', '"'):
                if text.count(q + old + q) == 1:
                    text = text.replace(q + old + q, q + new + q)
                    break
        texts[path] = (text, crlf)
    for fault in faults:
        print('FAIL', fault)
    if faults:
        return 1
    if write:
        for path, (text, crlf) in texts.items():
            out = text.replace('\n', '\r\n') if crlf else text
            open(path, 'wb').write(out.encode('utf-8'))
    print('OK  %d title(s) in %d file(s)%s' % (len(rows), len(texts), '' if write else ' (dry run)'))
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
