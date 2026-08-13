# -*- coding: utf-8 -*-
"""Near-duplicate sentence detector for the gr-scheduler specification.

A rule written in two places always grows into a contradiction: fixing one
copy leaves the other behind, and the two sentences then disagree. This
script finds those copies mechanically.

It splits the three spec files into sentence-sized units, remembers where
each unit came from (file, line, and the owning table or requirement UID),
then reports units whose normalized character 4-grams overlap enough to be
the same rule written twice. Units are grouped transitively, so the same
rule in three places forms one group.

Usage:
    python docs/review/dup-check.py [threshold] [report] [baseline]

    threshold  Jaccard cut-off (default 0.45).
    report     output path (default dup-report.txt), written as UTF-8.
    baseline   file of known group signatures; groups listed there are
               reported without the NEW marker, so only fresh duplication
               stands out. Regenerate it from the report's last section.

LIMIT: this finds copies with similar WORDING only. A rule that was
paraphrased is invisible here. In the 2026-08-13 sweep, 5 of the 20 real
duplications were below the threshold and were found by review instead.
This check reduces reading; it does not replace it.

NOTE ON NON-ASCII: the strip table below holds Japanese punctuation. The
input is Japanese, so those code points are data the tool must know about.
"""
import io, re, sys, collections

FILES = [
    'docs/spec/01-04-requirements.md',
    'docs/spec/_assets/tbl-glossary.md',
    'docs/spec/_assets/tbl-settings.md',
]

THRESHOLD = float(sys.argv[1]) if len(sys.argv) > 1 else 0.45
REPORT = sys.argv[2] if len(sys.argv) > 2 else 'dup-report.txt'
BASELINE = sys.argv[3] if len(sys.argv) > 3 else None

MIN_LEN = 24        # ignore fragments shorter than this (normalized chars)
NGRAM = 4
COMMON_GRAM = 60    # a gram in more units than this carries no signal

# Markdown and punctuation noise that must not affect the comparison.
STRIP = re.compile(
    r'[*`_>|\s\-–─~/+=#'
    r'—・…「」『』（）()【】'
    r'\[\]{}、。，．,\.:：;；!！?？'
    r'＋＝⚠️✅❌]')


def normalize(s):
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)      # markdown link -> text
    return STRIP.sub('', s)


def grams(s):
    return {s[i:i + NGRAM] for i in range(len(s) - NGRAM + 1)}


def collect():
    """Return [(file, line, anchor, raw, normalized, gramset), ...]."""
    units = []
    for path in FILES:
        name = path.split('/')[-1]
        anchor = '(preamble)'
        for lineno, line in enumerate(io.open(path, encoding='utf-8'), 1):
            m = re.match(r'\*\*UID\*\*:\s*(\S+)', line)
            if m:
                anchor = m.group(1)
                continue
            m = re.match(r'\*\*表 (T-[0-9]+[a-z]?) ', line)   # "**表 T-nnn "
            if m:
                anchor = 'T:' + m.group(1)
                continue
            if re.match(r'\|[\s:|-]+\|\s*$', line):
                continue
            if line.startswith('|'):
                cells = line.strip().strip('|').split('|')
                rid = cells[0].strip() if cells else ''
                where = anchor + (' ' + rid
                                  if re.match(r'^[A-Z]{1,3}-[0-9]+[a-z]?$', rid) else '')
                body = ' '.join(cells[1:])
            else:
                where, body = anchor, line
            for sent in re.split(r'(?<=。)|(?<=——)', body):
                n = normalize(sent)
                if len(n) >= MIN_LEN:
                    units.append((name, lineno, where, sent.strip(), n, grams(n)))
    return units


def find_pairs(units):
    index = collections.defaultdict(list)
    for i, u in enumerate(units):
        for g in u[5]:
            index[g].append(i)
    pairs = {}
    for i, u in enumerate(units):
        shared = collections.Counter()
        for g in u[5]:
            bucket = index[g]
            if len(bucket) > COMMON_GRAM:
                continue
            for j in bucket:
                if j > i:
                    shared[j] += 1
        for j, n in shared.items():
            union = len(u[5] | units[j][5])
            if not union:
                continue
            score = n / union
            if score >= THRESHOLD and (u[0], u[2]) != (units[j][0], units[j][2]):
                pairs[(i, j)] = score
    return pairs


def group(units, pairs):
    parent = list(range(len(units)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for i, j in pairs:
        a, b = find(i), find(j)
        if a != b:
            parent[a] = b
    buckets = collections.defaultdict(list)
    for i, j in pairs:
        buckets[find(i)].append((i, j))
    out = [(max(pairs[p] for p in plist),
            sorted({x for p in plist for x in p}))
           for plist in buckets.values()]
    out.sort(key=lambda t: (-len(t[1]), -t[0]))
    return out


POINTER = re.compile(r'(が持つ|として持つ|に従|が定める|に置く)')
NAME_TABLE = re.compile(r'^T:T-10[0-5]')     # glossary: names are authoritative
VALUE_TABLE = re.compile(r'^T:T-2[0-9]{2}')  # settings: values are authoritative


def classify(units, members):
    us = [units[i] for i in members]
    if any(u[3].strip().startswith('#') for u in us):
        return 'C-heading (false positive)'
    if all(POINTER.search(u[4]) for u in us):
        return 'C-pointer idiom (correct by design)'
    wheres = [u[2] for u in us]
    n_name = sum(1 for x in wheres if NAME_TABLE.match(x))
    n_val = sum(1 for x in wheres if VALUE_TABLE.match(x))
    if n_name and n_val and n_name + n_val == len(us):
        return 'B-name table vs value table (by design)'
    return 'A-rule or rationale duplicated'


def signature(units, members):
    """Location-based: stable when lines move, changes when the set of
    places sharing the text changes."""
    return ' + '.join(sorted({'%s/%s' % (units[i][0], units[i][2]) for i in members}))


def main():
    units = collect()
    pairs = find_pairs(units)
    groups = group(units, pairs)

    known = set()
    if BASELINE:
        try:
            known = {l.rstrip('\n') for l in io.open(BASELINE, encoding='utf-8') if l.strip()}
        except IOError:
            pass

    counts = collections.Counter(classify(units, m) for _, m in groups)
    w = io.open(REPORT, 'w', encoding='utf-8')
    w.write('units=%d  pairs=%d  groups=%d  (threshold=%.2f)\n\n'
            % (len(units), len(pairs), len(groups), THRESHOLD))
    for k in sorted(counts):
        w.write('%-40s %d\n' % (k, counts[k]))
    w.write('\n')

    n = fresh = 0
    for score, members in groups:
        if not classify(units, members).startswith('A'):
            continue
        n += 1
        new = signature(units, members) not in known
        fresh += new
        w.write('--- A%d%s : %d places / max %.2f ---\n'
                % (n, '  [NEW]' if new else '', len(members), score))
        for i in members:
            u = units[i]
            w.write('    %s  [%s:%s]\n' % (u[2], u[0], u[1]))
            w.write('        %s\n' % u[3][:170].replace('\n', ' '))
        w.write('\n')

    w.write('\n===== signatures (copy into the baseline file) =====\n')
    for _, members in groups:
        if classify(units, members).startswith('A'):
            w.write(signature(units, members) + '\n')
    w.close()
    print('A=%d (new %d)  groups=%d  pairs=%d' % (n, fresh, len(groups), len(pairs)))
    return 1 if fresh else 0


if __name__ == '__main__':
    sys.exit(main())
