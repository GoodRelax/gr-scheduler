# -*- coding: utf-8 -*-
"""Rename Agent API and document command names in one run.

RUN ONLY AFTER THE OWNER'S RULING. The Agent API and the document commands
are frozen contracts (JDG-3807). The owner postponed their names and let the
work go on under provisional names (JDG-3788); the seat chose them (JDG-3789).
This tool is the one mechanical road from those names to the ruled ones. The
glossary tool (tools/apply_glossary_renames.py) still refuses these groups on
its own record/apply path; this path exists only for the frozen contracts.

    python tools/apply_contract_renames.py apply <renames.tsv> [--dry-run] [--list] [--no-gen]
    python tools/apply_contract_renames.py marks [--list]
    python tools/apply_contract_renames.py --prefix-report [--list] [--write-baseline]
    python tools/apply_contract_renames.py --self-test

THE MARKS. While the manuscripts still write the alpha names (CR-851 applies
the new names together with src), an entry whose new name is provisional
carries
    "xProvisional": [{"provisionalRow": "PN-4", "basis": "JDG-3789",
                      "alphaName": "filters",
                      "provisionalName": "followScreenFiltersAndSort",
                      "note": "shape: a boolean, ..."}]
on the member, argument, value type or field of agent-api-members.json, and
on the command, value or shape of document-commands.json, that writes the
name. alphaName is the name the entry writes now -- its own name, a word of
its type text, or a word its prose names (then the note says so).
provisionalName is null when the name goes away. A name that changes only
its shape keeps its name and says the shape in the note (PN-5, PN-13). The
manuscript schemas allow the key (docs/development-rules/manuscript-schemas/),
no generator prints it, and the Agent API fingerprint leaves it out
(tests/contract/cr-822-...). The key is not named `row`: a `row` of
document-commands.json is a row reference to check 41.
studies/76-grs-json-beta-shape/terms/agent-api-provisional-names.tsv lists
every provisional name, marked or not (a name with no entry in the two
manuscripts -- written in src or glossary.json only -- has marked = no).
`marks` holds the marks against the marked lines of that file.

apply <renames.tsv>
    One rename per line, tab separated, with a header line:
        row  from  to  basis  [path]
    row is PN-n (finalizing a provisional row: from is the PROVISIONAL name,
    as the .tsv writes it, never the alpha name -- `Refusal` is both) or the
    change request that applies the names (CR-851: from is the name the
    manuscript writes); basis is ruling ids separated by spaces; path
    (optional) is `<manuscript>:<jsonPath>` as the provisional .tsv writes it,
    and limits the manuscript edit to that entry. A line whose from equals to
    finalizes a name unchanged. In ONE pass, all lines at once (so X->Y and
    Y->Z never chain):
    1. refuses, writing nothing: a malformed line, a from sent to two names,
       a `to` that is a former name of a glossary term (A.2), and a `to` that
       makes a head pair the baseline lacks (tools/name_heads.py);
    2. renames the names of agent-api-members.json and document-commands.json
       -- whole words of the name fields, type texts, enum values, tags and
       external type keys -- and the DELIMITED names of their prose;
    3. drops the mark of a finalized row once its entry was renamed; a mark
       whose entry still writes the alpha name keeps it, with the final name
       and the ruling in place of the provisional ones, for CR-851;
    4. renames the label of the one contract term of docs/spec/_source/
       glossary.json that carries the name, with a renames[] line;
    5. raises the Agent API version when the call shapes changed: `version`
       of agent-api-members.json takes the instant of the run, and the
       { version, fingerprint } pair is added to the CR-822 test (the rule:
       docs/development-rules/10-versions.md; once per change request -- a
       second run in the same CR adds a second pair, so run it once);
    6. runs `npm run gen` (grs-commands.schema.json, the tables and the code
       regions follow the manuscripts) unless --no-gen;
    7. replaces the DELIMITED names in docs/spec/**/*.md (not generated),
       docs/spec/_source/*.json (not the contracts) and tests/**/*.ts with
       the glossary tool's one-pass rule. A name that still names another
       entry or term is replaced only in its qualified form Parent.name and
       listed otherwise; --list prints every loose place;
    8. reports, never edits, the hand-written src/ places that still write a
       former name: they are CR-851's;
    9. takes the finalized lines out of the provisional .tsv.
    --dry-run prints the plan and writes nothing (no gen).

--prefix-report
    Counts the head pairs of all names (tools/name_heads.py) per group, across
    groups and per kind pair; --list prints every pair; --write-baseline
    writes tools/name-head-pairs-baseline.tsv from the pairs of today.

Run with PYTHONIOENCODING=utf-8.
"""
import copy
import csv
import datetime
import hashlib
import io
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import apply_glossary_renames as glossary  # noqa: E402
import name_heads  # noqa: E402

ROOT = glossary.ROOT
SOURCE = os.path.join(ROOT, 'docs', 'spec', '_source')
MANUSCRIPTS = OrderedDict([
    ('agent-api-members.json', os.path.join(SOURCE, 'agent-api-members.json')),
    ('document-commands.json', os.path.join(SOURCE, 'document-commands.json')),
])
COMMAND_SCHEMA = os.path.join(SOURCE, 'grs-commands.schema.json')
VERSION_TEST = os.path.join(ROOT, 'tests', 'contract',
                            'cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts')
PROVISIONAL_TSV = name_heads.PROVISIONAL_TSV
PROVISIONAL_BASIS = 'JDG-3789'
MARK = 'xProvisional'
NAME_KEYS = ('name', 'returns', 'type', 'extends', 'union', 'discriminant', 'tag')
NAME_LISTS = ('typeParameters', 'oneOf', 'values')
SKIP_KEYS = ('$schema', MARK)
NOT_CALL_SHAPE_KEYS = ('id', 'group', 'purity', 'carries', 'source', 'meaning', 'label', MARK)
IDENTIFIER = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')
REASON_JA = u'\u6301\u3061\u4e3b\u304c\u540d\u3092\u88c1\u5b9a\u3057\u305f\u3002'
say = glossary.say


def load(path):
    return json.loads(glossary.read(path), object_pairs_hook=OrderedDict)


def dump(doc):
    return json.dumps(doc, ensure_ascii=False, indent=1) + '\n'


# ------------------------------------------------------------ the rename file

def read_renames(path):
    """([line dict], [problem])."""
    rows = list(csv.DictReader(io.open(path, encoding='utf-8'), delimiter='\t'))
    problems, out, sent = [], [], {}
    for number, row in enumerate(rows, 2):
        old, new = (row.get('from') or '').strip(), (row.get('to') or '').strip()
        basis = (row.get('basis') or '').split()
        tag = (row.get('row') or '').strip()
        where = (row.get('path') or '').strip()
        if not re.match(r'^(PN|CR)-\d+$', tag):
            problems.append('line %d: row must be PN-n or CR-n, not %r' % (number, tag))
        elif not IDENTIFIER.match(old) or not IDENTIFIER.match(new):
            problems.append('line %d: from and to must be identifiers (%r, %r)' % (number, old, new))
        elif not basis or not all(re.match(r'^JDG-\d+$', b) for b in basis):
            problems.append('line %d: basis needs ruling ids JDG-n' % number)
        elif where and (':' not in where or where.split(':', 1)[0] not in MANUSCRIPTS):
            problems.append('line %d: path must be <manuscript>:<jsonPath>, not %r' % (number, where))
        elif sent.get((old, where), new) != new:
            problems.append('line %d: %r is sent to %r and to %r' % (number, old, sent[(old, where)], new))
        else:
            sent[(old, where)] = new
            out.append({'row': tag, 'from': old, 'to': new, 'basis': basis, 'path': where})
    return out, problems


# ------------------------------------------------------- the manuscript walk

def selector(item, index):
    for key in ('id', 'name', 'tag'):
        if isinstance(item, dict) and isinstance(item.get(key), str):
            return '[%s=%s]' % (key, item[key])
    return '[%d]' % index


def word_pattern(names):
    alternatives = '|'.join(re.escape(n) for n in sorted(names, key=len, reverse=True))
    return re.compile(r'(?<![A-Za-z0-9_$])(%s)(?![A-Za-z0-9_$])' % alternatives)


class Renamer(object):
    """Renames the names of one manuscript in place; remembers where."""

    def __init__(self, manuscript, lines, prose_names):
        self.manuscript = manuscript
        self.free = OrderedDict((l['from'], l['to']) for l in lines if not l['path'] and l['from'] != l['to'])
        self.bound = {}
        for l in lines:
            if l['path'] and l['path'].split(':', 1)[0] == manuscript and l['from'] != l['to']:
                self.bound.setdefault(l['path'].split(':', 1)[1], OrderedDict())[l['from']] = l['to']
        self.prose = prose_names
        self.prose_pattern = glossary.delimited_pattern(prose_names) if prose_names else None
        # id() of every entry a replacement happened in or below -> the former
        # names replaced: a path would change with the name it holds.
        self.renamed = {}
        self.stack = []
        self.count = 0

    def hit(self, names):
        for entry in self.stack:
            self.renamed.setdefault(entry, set()).update(names)

    def words(self, text, names, at):
        if not names or not isinstance(text, str):
            return text
        pattern = word_pattern(names)

        def one(match):
            self.hit([match.group(1)])
            self.count += 1
            return names[match.group(1)]
        return pattern.sub(one, text)

    def prose_text(self, text, at):
        if not self.prose_pattern or not any(o in text for o in self.prose):
            return text
        new, n = glossary.replace_text(text, self.prose, self.prose_pattern)
        if n:
            self.hit([o for o in self.prose if o in text])
            self.count += n
        return new

    def walk(self, node, at='', inherited=None):
        names = OrderedDict(self.free)
        names.update(inherited or {})
        names.update(self.bound.get(at, {}))
        own = OrderedDict((k, v) for k, v in names.items())
        self.stack.append(id(node))
        for key in list(node.keys()):
            value = node[key]
            if key in SKIP_KEYS:
                continue
            here = '%s/%s' % (at, key)
            if key in NAME_KEYS and isinstance(value, str):
                node[key] = self.words(value, own, at)
            elif key in NAME_LISTS and isinstance(value, list) and all(isinstance(v, str) for v in value):
                node[key] = [self.words(v, own, at) for v in value]
            elif key == 'externalTypes' and isinstance(value, dict):
                node[key] = OrderedDict((self.words(k, own, at), self.walk_value(v, here, None))
                                        for k, v in value.items())
            else:
                node[key] = self.walk_value(value, here, own if key == 'variants' else None, at)
        self.stack.pop()
        return node

    def walk_value(self, value, here, inherited, owner=None):
        if isinstance(value, dict):
            return self.walk(value, here, inherited)
        if isinstance(value, list):
            out = []
            for index, item in enumerate(value):
                path = here + selector(item, index)
                if isinstance(item, dict):
                    out.append(self.walk(item, path, inherited))
                elif isinstance(item, str):
                    out.append(self.prose_text(item, owner or here))
                else:
                    out.append(item)
            return out
        if isinstance(value, str):
            return self.prose_text(value, owner or here)
        return value


def entry_paths(doc, at=''):
    """[(jsonPath, entry dict)] of every dict that carries a mark."""
    out = []
    if isinstance(doc, dict):
        if MARK in doc:
            out.append((at, doc))
        for key, value in doc.items():
            if key == MARK:
                continue
            here = '%s/%s' % (at, key)
            if isinstance(value, list):
                for index, item in enumerate(value):
                    out.extend(entry_paths(item, here + selector(item, index)))
            else:
                out.extend(entry_paths(value, here))
    return out


def written_names(doc):
    """{name: count} of the names a manuscript writes in its name positions."""
    found = {}
    token = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*')

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in SKIP_KEYS:
                    continue
                if key in NAME_KEYS and isinstance(value, str):
                    for t in token.findall(value):
                        found[t] = found.get(t, 0) + 1
                elif key in NAME_LISTS and isinstance(value, list):
                    for v in value:
                        if isinstance(v, str):
                            found[v] = found.get(v, 0) + 1
                        else:
                            walk(v)
                elif key == 'externalTypes' and isinstance(value, dict):
                    for k in value:
                        found[k] = found.get(k, 0) + 1
                else:
                    walk(value)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    walk(doc)
    return found


def settle_marks(doc, lines, renamer, notes, finalized=None):
    """Drop or update the marks after the rename (step 3). `finalized` gets
    {(row, former provisional name): final name} for the marks kept for CR-851."""
    finals = {}
    for l in lines:
        finals.setdefault(l['row'], []).append(l)
    for at, entry in entry_paths(doc):
        kept = []
        # The entry's own prose (meaning, carries) is below it, and counts.
        hit = renamer.renamed.get(id(entry), set())
        for mark in entry[MARK]:
            line = next((l for l in finals.get(mark['provisionalRow'], [])
                         if l['from'] == mark['provisionalName']
                         and (not l['path'] or l['path'].split(':', 1)[1] == at)), None)
            if line is not None:
                if line['from'] in hit or mark['alphaName'] == line['to']:
                    notes.append('dropped  %s %s %s (%s -> %s)' % (renamer.manuscript, at, mark['provisionalRow'],
                                                                   mark['alphaName'], line['to']))
                    continue
                if finalized is not None:
                    finalized[(mark['provisionalRow'], mark['provisionalName'])] = line['to']
                mark = OrderedDict(mark)
                mark['provisionalName'], mark['basis'] = line['to'], line['basis'][0]
                mark['note'] = 'final, not applied yet' + ('; ' + mark['note'] if mark.get('note') else '')
                notes.append('final    %s %s %s (%s -> %s, CR-851 applies it)' % (
                    renamer.manuscript, at, mark['provisionalRow'], mark['alphaName'], line['to']))
            else:
                for l in lines:
                    if l['from'] == mark['alphaName'] and l['from'] in hit:
                        mark = OrderedDict(mark)
                        mark['alphaName'] = l['to']
                if mark['alphaName'] == mark['provisionalName'] and mark['basis'] != PROVISIONAL_BASIS:
                    notes.append('dropped  %s %s %s (applied)' % (renamer.manuscript, at, mark['provisionalRow']))
                    continue
            kept.append(mark)
        if kept:
            entry[MARK] = kept
        else:
            del entry[MARK]


# ---------------------------------------------------------------- the version

def call_shape(value):
    if isinstance(value, list):
        return [call_shape(v) for v in value]
    if isinstance(value, dict):
        return OrderedDict((k, call_shape(value[k])) for k in sorted(value) if k not in NOT_CALL_SHAPE_KEYS)
    return value


def fingerprint(members_doc):
    """The fingerprint the CR-822 test computes (JSON.stringify of the call shape)."""
    shape = OrderedDict([('members', call_shape(members_doc['members']['rows'])),
                         ('values', call_shape(members_doc['values']['rows']))])
    text = json.dumps(shape, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


PAIR = re.compile(r"\{ version: '([0-9TZ:-]+)', fingerprint: '([0-9a-f]{64})' \},\n")


def newest_pair(test_text):
    pairs = PAIR.findall(test_text)
    return pairs[-1] if pairs else (None, None)


def with_pair(test_text, version, print_):
    last = list(PAIR.finditer(test_text))[-1]
    line = "  { version: '%s', fingerprint: '%s' },\n" % (version, print_)
    return test_text[:last.end()] + line + test_text[last.end():]


def now_instant():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


# ---------------------------------------------------------------- the glossary

def glossary_plan(doc, lines, notes):
    """Rename the label of the one contract term carrying each name (step 4)."""
    for l in lines:
        # Only a finalized provisional row: the glossary writes the list and
        # provisional names, never the alpha names CR-851 replaces.
        if l['from'] == l['to'] or not l['row'].startswith('PN-'):
            continue
        terms = [t for t in doc['terms'] if glossary.is_contract(t)
                 and l['from'] in (t['label']['en'], t.get('xIdentifier'))]
        if len(terms) != 1:
            if terms:
                notes.append('glossary %r is the name of %d contract terms (%s) -- rename by hand' % (
                    l['from'], len(terms), ', '.join(t['key'] for t in terms)))
            continue
        term = terms[0]
        for language in ('en', 'ja'):
            if term['label'][language] == l['from']:
                term['label'][language] = l['to']
        if term.get('xIdentifier') == l['from']:
            term['xIdentifier'] = l['to']
        term.setdefault('renames', []).append(OrderedDict([
            ('from', l['from']), ('version', 'Agent API names (%s)' % l['row']),
            ('reason', OrderedDict([('en', 'The owner ruled the name.'), ('ja', REASON_JA)])),
            ('basis', l['basis'])]))
        for b in l['basis']:
            if b not in term.setdefault('checkedBasis', []):
                term['checkedBasis'].append(b)
        notes.append('glossary %s: %s -> %s' % (term['key'], l['from'], l['to']))


# ------------------------------------------------------------------- apply

def refusals(lines, gdoc):
    problems = []
    former = {r['from'] for t in gdoc['terms'] for r in t.get('renames', [])}
    for l in lines:
        if l['to'] != l['from'] and l['to'] in former:
            problems.append('%s: %r is a former name of a glossary term (A.2)' % (l['row'], l['to']))
    fresh = name_heads.new_pairs(sorted({l['to'] for l in lines if l['to'] != l['from']}))
    for head, name in fresh:
        problems.append('head pair not in the baseline: %s is the head of %s' % (
            name_heads.spell(head), name_heads.spell(name)))
    return problems


def other_source_names():
    """{name} of every key and identifier-like string of the other manuscripts
    (erd.json writes `kind` as a GRS JSON key, settings.json its own names)."""
    found = set()

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                found.add(key)
                walk(value)
        elif isinstance(node, list):
            for v in node:
                walk(v)
        elif isinstance(node, str) and IDENTIFIER.match(node):
            found.add(node)
    for name in sorted(os.listdir(SOURCE)):
        if name.endswith('.json') and name not in glossary.FROZEN:
            walk(load(os.path.join(SOURCE, name)))
    return found


def ambiguous_names(docs, gdoc, lines):
    """Former names a bare replacement may not touch: a name bound to one
    entry (its namesakes stay), a name another entry of the contracts still
    writes after the edit, a name of a term that is no contract term or of
    two contract terms, and a name another manuscript writes."""
    still = {}
    for doc in docs:
        for name, n in written_names(doc).items():
            still[name] = still.get(name, 0) + n
    contract = {}
    for term in gdoc['terms']:
        for name in {term['label']['en'], glossary.written_name(term)}:
            if glossary.is_contract(term):
                contract[name] = contract.get(name, 0) + 1
            else:
                still[name] = still.get(name, 0) + 1
    others = other_source_names()
    out = set()
    for l in lines:
        old = l['from']
        if l['path'] or old in still or contract.get(old, 0) > 1 or old in others:
            out.add(old)
    return out


def qualified(lines, docs_before):
    """{Parent.old: Parent.new} for the lines bound to an entry with a parent."""
    out = OrderedDict()
    renamed = {l['from']: l['to'] for l in lines}
    for l in lines:
        if not l['path'] or l['from'] == l['to']:
            continue
        manuscript, at = l['path'].split(':', 1)
        parent = re.findall(r'\[(?:id|name)=([^\]]+)\]', at)
        if len(parent) < 2:
            continue
        doc = docs_before[manuscript]
        owner = resolve(doc, at.rsplit('/', 1)[0])
        name = owner.get('name') if isinstance(owner, dict) else None
        if name:
            out['%s.%s' % (name, l['from'])] = '%s.%s' % (renamed.get(name, name), l['to'])
    return out


def resolve(doc, at):
    node = doc
    for part in [p for p in at.split('/') if p]:
        m = re.match(r'^([^\[]+)(?:\[(\w+)=([^\]]+)\]|\[(\d+)\])?$', part)
        key, sk, sv, si = m.groups()
        node = node[key]
        if sk:
            node = next(item for item in node if isinstance(item, dict) and item.get(sk) == sv)
        elif si is not None:
            node = node[int(si)]
    return node


def src_hits(olds):
    out = OrderedDict()
    if not olds:
        return out
    pattern = word_pattern({o: o for o in olds})
    for path in glossary.report_files():
        for number, line in enumerate(glossary.read(path).splitlines(), 1):
            for m in pattern.finditer(line):
                out.setdefault(glossary.rel(path), []).append('%d %s' % (number, m.group(1)))
    return out


def apply(path, dry_run, listing, gen):
    lines, problems = read_renames(path)
    gdoc = glossary.load_glossary()
    if not problems:
        problems = refusals(lines, gdoc)
    if problems:
        for p in problems:
            say('  ' + p)
        say('REFUSED  %d problem(s); nothing was written' % len(problems))
        return 1
    olds = OrderedDict((l['from'], l['to']) for l in lines if l['from'] != l['to'])
    # A name bound to one entry has namesakes in src; only the free ones are counted there.
    free_olds = [l['from'] for l in lines if not l['path'] and l['from'] != l['to']]
    before =OrderedDict((m, load(p)) for m, p in MANUSCRIPTS.items())
    after = copy.deepcopy(before)
    notes = []
    # The prose of the manuscripts takes the unambiguous names; decided on
    # the edited names, so a first pass edits the name positions only.
    for m, doc in after.items():
        Renamer(m, lines, OrderedDict()).walk(doc)
    gafter = copy.deepcopy(gdoc)
    glossary_plan(gafter, lines, notes)
    unsafe = ambiguous_names(after.values(), gafter, [l for l in lines if l['from'] != l['to']])
    safe = OrderedDict((o, n) for o, n in olds.items() if o not in unsafe)
    safe.update(qualified(lines, before))
    after = copy.deepcopy(before)
    counts, finalized = OrderedDict(), {}
    for m, doc in after.items():
        renamer = Renamer(m, lines, safe)
        renamer.walk(doc)
        settle_marks(doc, lines, renamer, notes, finalized)
        counts[m] = renamer.count
    old_print, new_print = fingerprint(before['agent-api-members.json']), fingerprint(after['agent-api-members.json'])
    test_text = glossary.read(VERSION_TEST)
    newest_version, newest_print = newest_pair(test_text)
    bump = new_print != newest_print
    if bump:
        version = max(now_instant(), after['agent-api-members.json']['version'])
        after['agent-api-members.json']['version'] = version
    for m, n in counts.items():
        say('manuscript %4d name(s) renamed in %s' % (n, m))
    for n in notes:
        say('  ' + n)
    say('version  %s' % ('raised to %s (call shapes changed: %s -> %s)' % (
        after['agent-api-members.json']['version'], old_print[:12], new_print[:12]) if bump else 'unchanged'))
    for o in sorted(unsafe):
        say('  %r still names another entry or term: only its qualified form is replaced' % o)
    if dry_run:
        per_file, loose = glossary.scan(safe, list(glossary.target_files()), edit=False)
        report_text(per_file, loose, src_hits(free_olds), listing, 'would replace')
        say('DRY RUN  nothing was written')
        return 0
    for m, doc in after.items():
        glossary.write(MANUSCRIPTS[m], dump(doc))
    glossary.save_glossary(gafter)
    if bump:
        glossary.write(VERSION_TEST, with_pair(test_text, after['agent-api-members.json']['version'], new_print))
    if gen:
        say('gen      npm run gen ...')
        done = subprocess.call('npm run gen', cwd=ROOT, shell=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        if done != 0:
            say('FAIL     npm run gen exited %d; the manuscripts are written, the prose is not' % done)
            return 1
    per_file, loose = glossary.scan(safe, list(glossary.target_files()), edit=True)
    left = written_names(load(COMMAND_SCHEMA)) if gen else {}
    for o in olds:
        if left.get(o):
            say('  %s still writes %r %d time(s) (from erd.json or settings.json?)' % (
                glossary.rel(COMMAND_SCHEMA), o, left[o]))
    report_text(per_file, loose, src_hits(free_olds), listing, 'replaced')
    finish_provisional_tsv(lines, finalized)
    say('OK       %d rename(s) applied%s' % (len(lines), '' if gen else '; run npm run gen'))
    return 0


def report_text(per_file, loose, in_src, listing, verb):
    for path, count in per_file.items():
        say('%s %4d  %s' % (verb, count, path))
    say('loose    %d place(s) left for a person%s' % (len(loose), '' if listing else ' (--list prints them)'))
    say('src      %d place(s) in %d file(s) still write a former name (CR-851)%s' % (
        sum(len(v) for v in in_src.values()), len(in_src), '' if listing else ' (--list prints them)'))
    if listing:
        for hit in loose:
            say('  loose  ' + hit)
        for path, hits in in_src.items():
            for hit in hits:
                say('  src    %s:%s' % (path, hit))


TSV_HEAD = ['row', 'manuscript', 'jsonPath', 'alphaName', 'listName', 'provisionalName', 'basis', 'marked', 'note']


def finish_provisional_tsv(lines, finalized):
    """Step 9: an unmarked line goes when its name is finalized; the marked
    lines are written again from the marks, keeping their list names."""
    if not os.path.exists(PROVISIONAL_TSV):
        return
    rows = name_heads.provisional_rows()
    done = {(l['row'], l['from']) for l in lines if l['row'].startswith('PN-')}
    renamed = {l['from']: l['to'] for l in lines if not l['row'].startswith('PN-')}
    kept = []
    for r in rows:
        if r['marked'] == 'yes' or (r['row'], r['provisionalName']) in done:
            continue
        r['alphaName'] = renamed.get(r['alphaName'], r['alphaName'])
        kept.append(r)
    list_names = {}
    for r in rows:
        if r['marked'] == 'yes':
            final = finalized.get((r['row'], r['provisionalName']), r['provisionalName'])
            alpha = renamed.get(r['alphaName'], r['alphaName'])
            list_names[(r['row'], r['manuscript'], alpha, final)] = r['listName']
    for m, path in MANUSCRIPTS.items():
        for at, entry in entry_paths(load(path)):
            for mark in entry[MARK]:
                name = mark['provisionalName'] or ''
                kept.append(OrderedDict([
                    ('row', mark['provisionalRow']), ('manuscript', m), ('jsonPath', at),
                    ('alphaName', mark['alphaName']),
                    ('listName', list_names.get((mark['provisionalRow'], m, mark['alphaName'], name), '')),
                    ('provisionalName', name), ('basis', mark['basis']), ('marked', 'yes'),
                    ('note', mark.get('note', ''))]))
    kept.sort(key=lambda r: (int(r['row'].split('-')[1]), r['marked'] != 'yes'))
    text = '\n'.join(['\t'.join(TSV_HEAD)] + ['\t'.join(r[h] for h in TSV_HEAD) for r in kept]) + '\n'
    glossary.write(PROVISIONAL_TSV, text)
    say('tsv      %d line(s) before, %d now' % (len(rows), len(kept)))


# ------------------------------------------------------------------- marks

def marks(listing):
    found = []
    for m, path in MANUSCRIPTS.items():
        for at, entry in entry_paths(load(path)):
            for mark in entry[MARK]:
                found.append((mark['provisionalRow'], m, at, mark['alphaName'], mark['provisionalName'] or ''))
    listed = [(r['row'], r['manuscript'], r['jsonPath'], r['alphaName'], r['provisionalName'])
              for r in name_heads.provisional_rows() if r['marked'] == 'yes']
    missing = sorted(set(listed) - set(found))
    extra = sorted(set(found) - set(listed))
    for one in missing:
        say('  in the tsv, not marked: %s' % '  '.join(one))
    for one in extra:
        say('  marked, not in the tsv: %s' % '  '.join(one))
    if listing:
        for one in found:
            say('  mark   %s' % '  '.join(one))
    bad = bool(missing or extra)
    say('%s %d mark(s) in the manuscripts, %d marked line(s) in the tsv' % (
        'FAIL    ' if bad else 'OK      ', len(found), len(listed)))
    return 1 if bad else 0


# ----------------------------------------------------------- prefix report

def prefix_report(listing, write):
    inv = name_heads.inventory()
    pairs = name_heads.head_pairs(inv)
    per_group, across, kinds = name_heads.summary(inv, pairs)
    say('names    %d distinct names in %d groups' % (len(inv.names), len(inv.groups())))
    for g in inv.groups():
        n = sum(1 for one in inv.names.values() if any(x == g for x, _k in one['where']))
        say('  group %-17s %5d names  %5d pairs inside' % (g, n, per_group.get(g, 0)))
    say('pairs    %d head pairs (%d across groups only)' % (len(pairs), across))
    for kind, n in sorted(kinds.items(), key=lambda kv: -kv[1]):
        say('  kind  %-60s %5d' % (kind, n))
    baseline = name_heads.load_baseline()
    fresh = [p for p in pairs if p not in baseline]
    say('baseline %d pair(s); %d pair(s) of today are not in it' % (len(baseline), len(fresh)))
    if listing:
        for p in pairs:
            say('  pair   %s%s' % (name_heads.pair_line(p), '' if p in baseline else '\tNEW'))
    if write:
        name_heads.write_baseline(pairs)
        say('wrote    %s (%d pairs)' % (glossary.rel(name_heads.BASELINE), len(pairs)))
    return 0


# --------------------------------------------------------------- self-test

def self_test():
    bad = list(name_heads.self_test())
    doc = OrderedDict([
        ('externalTypes', OrderedDict([('Refusal', {'ja': 'x'})])),
        ('members', {'rows': [OrderedDict([
            ('id', 'AM-1'), ('name', 'readShownTasks'), ('returns', 'AgentShownTasks'),
            ('arguments', [OrderedDict([('name', 'filters'), ('type', "'asShown' | 'none'"),
                                        ('meaning', {'en': "with `filters` 'asShown'; the kind"}),
                                        (MARK, [OrderedDict([('provisionalRow', 'PN-4'), ('basis', 'JDG-3789'),
                                                             ('alphaName', 'filters'),
                                                             ('provisionalName', 'followScreen')])])])])])]}),
        ('values', {'rows': [OrderedDict([
            ('id', 'AV-1'), ('name', 'AgentRefusal'),
            ('fields', [OrderedDict([('name', 'refusals'), ('type', 'readonly Refusal[]')]),
                        OrderedDict([('name', 'reason'), ('type', 'RefusalReason')]),
                        OrderedDict([('name', 'kind'), ('type', 'string')])])])]}),
    ])
    lines = [{'row': 'PN-13', 'from': 'Refusal', 'to': 'CommandRefusal', 'basis': ['JDG-9'], 'path': ''},
             {'row': 'CR-851', 'from': 'filters', 'to': 'followScreen', 'basis': ['JDG-9'], 'path': ''},
             {'row': 'PN-12', 'from': 'kind', 'to': 'valueType', 'basis': ['JDG-9'],
              'path': 'agent-api-members.json:/values/rows[id=AV-1]/fields[name=kind]'}]
    work = copy.deepcopy(doc)
    renamer = Renamer('agent-api-members.json', lines, OrderedDict([('filters', 'followScreen')]))
    renamer.walk(work)
    notes = []
    settle_marks(work, lines, renamer, notes)
    fields = work['values']['rows'][0]['fields']
    argument = work['members']['rows'][0]['arguments'][0]
    checks = [
        (list(work['externalTypes']) == ['CommandRefusal'], 'external type key renamed'),
        (fields[0]['type'] == 'readonly CommandRefusal[]', 'a word of a type text renamed'),
        (fields[1]['type'] == 'RefusalReason', 'a longer name left alone'),
        (fields[2]['name'] == 'valueType', 'a name bound to its path renamed'),
        (argument['name'] == 'followScreen', 'an argument renamed'),
        (argument['meaning']['en'] == "with `followScreen` 'asShown'; the kind", 'delimited prose renamed'),
        (argument[MARK][0]['alphaName'] == 'followScreen', 'a CR rename moves the alpha name of its mark'),
    ]
    other = copy.deepcopy(doc)
    other['values']['rows'].append(OrderedDict([('id', 'AV-2'), ('name', 'Column'),
                                                ('fields', [OrderedDict([('name', 'kind'), ('type', 'number')])])]))
    Renamer('agent-api-members.json', lines, OrderedDict()).walk(other)
    checks.append((other['values']['rows'][1]['fields'][0]['name'] == 'kind', 'a bound rename leaves its namesake'))
    final = copy.deepcopy(doc)
    fin = [{'row': 'PN-4', 'from': 'followScreen', 'to': 'useScreenView', 'basis': ['JDG-10'], 'path': ''}]
    r2 = Renamer('agent-api-members.json', fin, OrderedDict())
    r2.walk(final)
    settle_marks(final, fin, r2, [])
    kept = final['members']['rows'][0]['arguments'][0][MARK][0]
    checks.append((kept['provisionalName'] == 'useScreenView' and kept['basis'] == 'JDG-10',
                   'a finalized mark on an alpha name keeps the final name for CR-851'))
    applied = copy.deepcopy(work)
    fin2 = [{'row': 'PN-4', 'from': 'followScreen', 'to': 'useScreenView', 'basis': ['JDG-10'], 'path': ''}]
    r3 = Renamer('agent-api-members.json', fin2, OrderedDict())
    r3.walk(applied)
    settle_marks(applied, fin2, r3, [])
    checks.append((MARK not in applied['members']['rows'][0]['arguments'][0], 'a finalized and renamed mark is dropped'))
    test_text = "[\n  { version: '2026-10-19T01:15:00Z', fingerprint: '%s' },\n]" % ('0' * 64)
    grown = with_pair(test_text, '2026-11-27T00:00:00Z', '1' * 64)
    checks.append((newest_pair(grown) == ('2026-11-27T00:00:00Z', '1' * 64), 'a version pair is added last'))
    real = load(MANUSCRIPTS['agent-api-members.json'])
    version, print_ = newest_pair(glossary.read(VERSION_TEST))
    checks.append((version != real['version'] or fingerprint(real) == print_,
                   'the Python fingerprint equals the CR-822 test on the manuscript'))
    for ok, what in checks:
        if not ok:
            bad.append(what)
    _l, problems = read_renames_text('row\tfrom\tto\tbasis\nPN-1\ta\tb\tJDG-1\nPN-1\ta\tc\tJDG-1\nXX-1\ta\tb\tJDG-1\n')
    if len(problems) != 2:
        bad.append('malformed rename lines: %r' % problems)
    for b in bad:
        say('FAIL     ' + b)
    say('%s self-test: %d case(s)' % ('OK      ' if not bad else 'FAIL    ', len(checks) + 11))
    return 1 if bad else 0


def read_renames_text(text):
    import tempfile
    handle, path = tempfile.mkstemp(suffix='.tsv')
    os.close(handle)
    try:
        io.open(path, 'w', encoding='utf-8').write(text)
        return read_renames(path)
    finally:
        os.remove(path)


def main(argv):
    if argv[:1] == ['--self-test']:
        return self_test()
    if argv[:1] == ['--prefix-report'] and set(argv[1:]) <= {'--list', '--write-baseline'}:
        return prefix_report('--list' in argv, '--write-baseline' in argv)
    if argv[:1] == ['marks'] and set(argv[1:]) <= {'--list'}:
        return marks('--list' in argv)
    if argv[:1] == ['apply'] and len(argv) >= 2 and set(argv[2:]) <= {'--dry-run', '--list', '--no-gen'}:
        return apply(argv[1], '--dry-run' in argv, '--list' in argv, '--no-gen' not in argv)
    say(__doc__.split('\n\n')[2])
    say('unknown arguments: %s -- nothing was written' % ' '.join(argv))
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
