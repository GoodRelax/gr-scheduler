# -*- coding: utf-8 -*-
"""src/ + table T-064 -> docs/review/public-entry-index.md

The index a writer searches BEFORE adding a helper (CR-581). One row per name
a component of src/ exports: where it is declared, whether table T-064
publishes it, and what it is for.

    python tools/generate_public_entry_index.py           rebuild the index
    python tools/generate_public_entry_index.py --check   exit 1 if it differs

WHY IT EXISTS. The duplicate survey of 2026-09-26 found 128 accidental copies
in src/. The prototype search of that round (mechanism E) measured what a
writer finds by searching before writing, over 8 known copies:

    searching the public entries only      2 of 8
    searching every function of src/       6 of 8

because 6 of the 8 originals were private or were exported by a sibling file
and never re-exported by the entry. So the index has TWO parts per component:
the names the public entry exports (reachable from any component the
dependency rules allow), and the names a file of the folder exports that the
entry does NOT re-export (one re-export line and one entry in
docs/spec/_source/published-entries.json away). A private function is not
listed: publishing it is the step the index is there to prompt.

WHAT EACH ROW SAYS. The purpose column is the note table T-064 prints for a
published member (read from docs/spec/_source/published-entries.json, line
breaks dropped). A name table T-064 does not publish has no written purpose,
so the column carries its declaration header instead -- parameter and return
types are what a writer searching for "a function from X to Y" types.

NO LINE NUMBERS. A row names file#name, never file:line: a line number would
change on every edit above it and turn this file red on almost every commit,
and a merge of two parallel sessions would collide on it.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
MANUSCRIPT = os.path.join(ROOT, 'docs', 'spec', '_source', 'published-entries.json')
OUT = os.path.join(ROOT, 'docs', 'review', 'public-entry-index.md')
REL_OUT = 'docs/review/public-entry-index.md'

LAYER_FOLDER = {
    'documentModel': 'entity/document-model',
    'layoutEngine': 'entity/layout-engine',
    'UseCase': 'use-case',
    'Adapter': 'adapter',
    'Framework': 'framework',
}
PAREN_OPEN = chr(0xFF08)      # full-width left parenthesis
PAREN_CLOSE = chr(0xFF09)     # full-width right parenthesis
STOP = chr(0x3002)            # ideographic full stop
LIMIT = 160

DECLARED = re.compile(r'^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?'
                      r'(const|let|var|function\*?|class|interface|enum|type)'
                      r'\s+([A-Za-z_$][A-Za-z0-9_$]*)')
LOCAL = re.compile(r'^(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?'
                   r'(const|let|var|function\*?|class|interface|enum|type)'
                   r'\s+([A-Za-z_$][A-Za-z0-9_$]*)')
BLOCK = re.compile(r'^export\s+(?:type\s+)?\{')
STAR = re.compile(r'''^export\s+\*\s+from\s+['"]([^'"]+)['"]''')
FROM = re.compile(r'''\}\s*from\s*['"]([^'"]+)['"]''')
IMPORT = re.compile(r'''^import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]''', re.M)


def say(message):
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def kebab(name):
    return re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()


def rel(path):
    return os.path.relpath(path, ROOT).replace('\\', '/')


def header_of(lines, i):
    """The declaration starting at line i, up to its body, on one line."""
    text = ''
    for line in lines[i:i + 12]:
        text += ' ' + line.strip()
        if re.search(r'\{\s*$|=>\s*\{?\s*$|;\s*$', line) or ' = ' in line:
            break
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'^export\s+', '', text)
    text = re.sub(r'\s*\{\s*$', '', text)
    if len(text) > LIMIT:
        text = text[:LIMIT - 3] + '...'
    return text.replace('|', '\\|')


class Module(object):
    """The declarations and the export list of one .ts file."""

    def __init__(self, path):
        self.path = path
        text = io.open(path, encoding='utf-8').read().replace('\r\n', '\n')
        self.lines = text.split('\n')
        self.declared = {}      # name -> (kind, header) for every top-level declaration
        self.exported = {}      # published name -> ('local', name) | ('from', spec, name)
        self.stars = []
        self.imported = {}      # local name -> (spec, original name)
        for clause, spec in IMPORT.findall(text):
            for item in clause.split(','):
                word = item.replace('type ', ' ').split()
                if word:
                    self.imported[word[-1]] = (spec, word[0])
        self._read()

    def _read(self):
        lines = self.lines
        i = 0
        while i < len(lines):
            line = lines[i]
            found = DECLARED.match(line)
            if found:
                kind, name = found.group(1), found.group(2)
                self.declared.setdefault(name, (kind, header_of(lines, i)))
                self.exported[name] = ('local', name)
                i += 1
                continue
            found = LOCAL.match(line)
            if found:
                self.declared.setdefault(found.group(2), (found.group(1), header_of(lines, i)))
                i += 1
                continue
            found = STAR.match(line)
            if found:
                self.stars.append(found.group(1))
                i += 1
                continue
            if BLOCK.match(line):
                body = ''
                while i < len(lines):
                    body += lines[i].split('//')[0] + '\n'
                    i += 1
                    if '}' in body:
                        break
                if not FROM.search(body) and i < len(lines) and lines[i].lstrip().startswith('from'):
                    body += lines[i]
                    i += 1
                source = FROM.search(body)
                inner = body[body.index('{') + 1:body.index('}')]
                for item in inner.split(','):
                    word = item.replace('type ', ' ').split()
                    if not word:
                        continue
                    original, published = word[0], word[-1]
                    if source:
                        self.exported[published] = ('from', source.group(1), original)
                    else:
                        self.exported[published] = ('local', original)
                continue
            i += 1


class Tree(object):
    def __init__(self):
        self.modules = {}

    def module(self, path):
        if path not in self.modules:
            self.modules[path] = Module(path)
        return self.modules[path]

    def resolve(self, path, name, depth=0):
        """(defining file, declared name, kind, header) of a published name."""
        mod = self.module(path)
        how = mod.exported.get(name)
        if how is None and depth < 8:
            for spec in mod.stars:
                target = self.target(path, spec)
                if target and name in self.names(target):
                    return self.resolve(target, name, depth + 1)
        if how is None:
            return None
        if how[0] == 'local':
            if how[1] not in mod.declared and how[1] in mod.imported and depth < 8:
                spec, original = mod.imported[how[1]]
                target = self.target(path, spec)
                if target is not None:
                    return self.resolve(target, original, depth + 1)
            kind, header = mod.declared.get(how[1], ('?', ''))
            return path, how[1], kind, header
        target = self.target(path, how[1])
        if target is None or depth >= 8:
            return None
        return self.resolve(target, how[2], depth + 1)

    def names(self, path, depth=0):
        mod = self.module(path)
        out = set(mod.exported)
        if depth < 8:
            for spec in mod.stars:
                target = self.target(path, spec)
                if target:
                    out |= self.names(target, depth + 1)
        return out

    @staticmethod
    def target(path, spec):
        if not spec.startswith('.'):
            return None
        base = os.path.normpath(os.path.join(os.path.dirname(path), spec))
        for candidate in (base + '.ts', os.path.join(base, 'index.ts'), base):
            if os.path.isfile(candidate):
                return candidate
        return None


def purpose_of(note):
    """A T-064 note as one line: breaks dropped, outer parentheses removed."""
    text = re.sub(r'<br\s*/?>', ' ', note)
    text = re.sub(r'\s+', ' ', text).strip()
    if text.startswith(PAREN_OPEN) and text.endswith(PAREN_CLOSE):
        text = text[1:-1]
    # One line: the first sentence, or the first LIMIT characters of it.
    stop = text.find(STOP)
    if 0 <= stop < LIMIT:
        text = text[:stop + 1]
    elif len(text) > LIMIT:
        text = text[:LIMIT - 3] + '...'
    if text.count('`') % 2:
        text += '`'
    if text.count('**') % 2:
        text += '**'
    return text.replace('|', '\\|')


def build():
    doc = json.load(io.open(MANUSCRIPT, encoding='utf-8'))
    tree = Tree()
    problems = []
    out = [
        '# Public entry index',
        '',
        '> GENERATED -- do not edit by hand. Sources: `src/` (what is exported) and',
        '> `docs/spec/_source/published-entries.json` (table T-064: what is published and why).',
        '> Rebuild: `npm run gen` / detect drift: `npm run gen:check`',
        '> (`python tools/generate_public_entry_index.py`).',
        '',
        'Search this file for the words and the types of the job BEFORE writing a helper (CR-581).',
        '',
        '- **entry** -- the component\'s public entry exports it. Another component may import it',
        '  if table T-061 and the component figure allow the edge. `T-064` names its row when',
        '  table T-064 publishes it; `--` means the entry exports it but table T-064 does not.',
        '- **file only** -- a file of the folder exports it and the entry does not. To use it',
        '  from another component, re-export it from the entry and add it as a member of its',
        '  row in `docs/spec/_source/published-entries.json`, then `npm run gen`.',
        '- A private function is not listed. Publish it the same way instead of copying it.',
        '',
    ]
    total_entry = total_file = total_listed = 0
    for row in doc['rows']:
        comp = row['component']
        folder = os.path.join(SRC, *LAYER_FOLDER[row['layer']].split('/')), kebab(comp)
        folder = os.path.join(folder[0], folder[1])
        entry = os.path.join(folder, kebab(comp) + '.ts')
        if not os.path.isfile(entry):
            problems.append('%s: no public entry at %s' % (row['id'], rel(entry)))
            continue
        notes = {}
        for one in row['members']:
            if 'name' in one:
                notes[one['name']] = purpose_of(one.get('note', {}).get('ja', ''))
        out.append('## %s (%s, `%s`)' % (comp, row['id'], rel(entry)))
        out.append('')
        out.append('| name | reach | kind | declared in | T-064 | what it is for / its declaration |')
        out.append('| --- | --- | --- | --- | --- | --- |')
        entry_names = sorted(tree.names(entry), key=lambda n: (n.lower(), n))
        seen = set()
        for name in entry_names:
            found = tree.resolve(entry, name)
            if found is None:
                problems.append('%s: cannot resolve %s exported by %s' % (row['id'], name, rel(entry)))
                continue
            path, declared, kind, header = found
            seen.add((path, declared))
            listed = name in notes
            total_entry += 1
            total_listed += listed
            what = notes[name] if listed and notes[name] else header
            out.append('| `%s` | entry | %s | `%s#%s` | %s | %s |' % (
                name, kind, rel(path), declared, row['id'] if listed else '--', what or '--'))
        files = sorted(os.path.join(folder, f) for f in os.listdir(folder)
                       if f.endswith('.ts') and os.path.join(folder, f) != entry)
        for path in files:
            mod = tree.module(path)
            for name in sorted(mod.exported, key=lambda n: (n.lower(), n)):
                found = tree.resolve(path, name)
                if found is None:
                    continue
                if (found[0], found[1]) in seen:
                    continue
                seen.add((found[0], found[1]))
                total_file += 1
                out.append('| `%s` | file only | %s | `%s#%s` | -- | %s |' % (
                    name, found[2], rel(found[0]), found[1], found[3] or '--'))
        out.append('')
    out.append('Totals: %d name(s) leave through a public entry (%d of them published by '
               'table T-064), %d more are exported by a file and not by its entry.'
               % (total_entry, total_listed, total_file))
    return '\n'.join(out) + '\n', problems, (total_entry, total_listed, total_file)


def main():
    built, problems, counts = build()
    if problems:
        for p in problems:
            say('  %s' % p)
        say('the index cannot be built; nothing was written')
        return 1
    summary = '%d entry name(s), %d published by T-064, %d file-only' % counts
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % REL_OUT)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read().replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches src/ and published-entries.json -- '
                'rerun tools/generate_public_entry_index.py' % REL_OUT)
            return 1
        say('OK       %s is current (%s)' % (REL_OUT, summary))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (REL_OUT, summary))
    return 0


if __name__ == '__main__':
    sys.exit(main())
