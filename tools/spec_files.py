# -*- coding: utf-8 -*-
"""File: read and write the specification documents that are split into part files.

The requirements document (01-04-requirements.md) and the design document
(05-07-design.md) are each held as several part files of about 100 KB (plan
B9). docs/spec/_source/spec-files.json names the parts in order. A reader asks
for a whole document by its old name and gets the bodies of its parts joined,
which is the old file byte for byte; a reader never opens a part by name, so a
section moving to another part moves no reader.

Usage:
  python tools/spec_files.py --check          fail when a part's header is not
                                              the one spec-files.json implies
  python tools/spec_files.py --split NAME [FILE]
                                              cut the whole document NAME (read
                                              from FILE, else from its parts)
                                              at the startsAt lines, and write
                                              the part files
  python tools/spec_files.py --print NAME     print the whole document NAME

Python callers: read_document(name), part_paths(name), document_names();
read_spec_file, write_spec_file, spec_file_exists take a path; listed_names
(a folder listing) and listed_paths (a list of repository paths) give the
files as listed before the split.
TypeScript callers: tests/spec-files.ts mirrors read_document.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC_DIR = os.path.join('docs', 'spec')
MANIFEST = os.path.join(SPEC_DIR, '_source', 'spec-files.json')

HEADING = re.compile(r'^(#{1,6}) ')


def load_manifest(root=ROOT):
    with io.open(os.path.join(root, MANIFEST), encoding='utf-8') as f:
        return json.load(f)


def _documents(root):
    # Why: a tree without the manifest (a test fixture, a tree from before
    # the split) holds no split document, and its files read as they are.
    if not os.path.isfile(os.path.join(root, MANIFEST)):
        return []
    return load_manifest(root)['documents']


def document_names(root=ROOT):
    return [d['name'] for d in _documents(root)]


def _document(name, manifest):
    for d in manifest['documents']:
        if d['name'] == name:
            return d
    raise KeyError('no split document named %r in %s' % (name, MANIFEST))


def is_split_document(name, root=ROOT):
    return os.path.basename(name) in document_names(root)


def part_files(name, root=ROOT):
    """The part file names of document NAME, in order (no directory)."""
    return [p['file'] for p in _document(os.path.basename(name), load_manifest(root))['parts']]


def part_paths(name, root=ROOT):
    """The part files of document NAME, in order, as paths under root."""
    return [os.path.join(root, SPEC_DIR, f) for f in part_files(name, root)]


def marker_line(manifest, document):
    return manifest['marker'].replace('{first}', document['parts'][0]['file'])


def body_of(text, marker, path='part'):
    """The body of a later part: everything after the marker line and one blank line."""
    needle = marker + '\n\n'
    at = text.find('\n' + needle)
    if at < 0:
        raise ValueError('%s has no marker line %r followed by a blank line' % (path, marker))
    return text[at + 1 + len(needle):]


def _read(path):
    with io.open(path, encoding='utf-8', newline='') as f:
        return f.read()


def read_document(name, root=ROOT):
    """The whole document NAME (e.g. '01-04-requirements.md'): its part bodies joined."""
    manifest = load_manifest(root)
    document = _document(os.path.basename(name), manifest)
    marker = marker_line(manifest, document)
    out = []
    for i, part in enumerate(document['parts']):
        path = os.path.join(root, SPEC_DIR, part['file'])
        text = _read(path)
        out.append(text if i == 0 else body_of(text, marker, path))
    return ''.join(out)


def read_spec_file(path, root=ROOT):
    """Read a docs/spec file by path; a split document's old name reads the whole document."""
    base = os.path.basename(path)
    if base in document_names(root):
        return read_document(base, root)
    return _read(path if os.path.isabs(path) else os.path.join(root, path))


def _ancestors(text, offset):
    """The heading lines of the sections that hold the line at OFFSET, outermost first (H1 left out)."""
    chain = []
    first = text[offset:text.find('\n', offset)]
    m = HEADING.match(first)
    level_limit = len(m.group(1)) if m else 7
    for line in reversed(text[:offset].split('\n')):
        m = HEADING.match(line)
        if not m:
            continue
        level = len(m.group(1))
        if level < level_limit and level >= 2:
            chain.append(line)
            level_limit = level
        if level_limit <= 2:
            break
    return list(reversed(chain))


def header_of(part, ancestors, marker):
    lines = ['# ' + part['title'], '', '**Grammar**: spec.sgra', '**UID**: ' + part['uid'], '']
    # Why: a heading followed by text and no Type field is read by StrictDoc as
    # a REQUIREMENT node, which the grammar refuses; every repeated heading is a
    # section, so each one says so.
    for heading in ancestors:
        lines += [heading, '', '**Type**: SECTION', '']
    lines += [marker, '', '']
    return '\n'.join(lines)


def split_document(name, text, root=ROOT):
    """Cut the whole document TEXT into [(file, content)] at the startsAt lines."""
    manifest = load_manifest(root)
    document = _document(os.path.basename(name), manifest)
    marker = marker_line(manifest, document)
    cuts = [0]
    for part in document['parts'][1:]:
        needle = '\n' + part['startsAt'] + '\n'
        at = text.find(needle, cuts[-1])
        if at < 0:
            raise ValueError('startsAt %r of %s is not a line after the previous cut'
                             % (part['startsAt'], part['file']))
        cuts.append(at + 1)
    cuts.append(len(text))
    out = []
    for i, part in enumerate(document['parts']):
        body = text[cuts[i]:cuts[i + 1]]
        if i == 0:
            out.append((part['file'], body))
        else:
            out.append((part['file'], header_of(part, _ancestors(text, cuts[i]), marker) + body))
    return out


def write_document(name, text, root=ROOT):
    """Write the whole document TEXT of NAME back into its part files."""
    for file, content in split_document(name, text, root):
        with io.open(os.path.join(root, SPEC_DIR, file), 'w', encoding='utf-8', newline='') as f:
            f.write(content)


def write_spec_file(path, text, root=ROOT):
    """Write a docs/spec file by path; a split document's old name writes its parts."""
    base = os.path.basename(path)
    if base in document_names(root):
        write_document(base, text, root)
        return
    with io.open(path if os.path.isabs(path) else os.path.join(root, path), 'w',
                 encoding='utf-8', newline='') as f:
        f.write(text)


def spec_file_exists(path, root=ROOT):
    """True when a docs/spec path exists; a split document's old name exists when all its parts do."""
    base = os.path.basename(path)
    if base in document_names(root):
        return all(os.path.isfile(p) for p in part_paths(base, root))
    return os.path.exists(path if os.path.isabs(path) else os.path.join(root, path))


def markdown_names(root=ROOT):
    """The .md files of docs/spec as listed before the split: a split document's
    parts stand once, under the document's old name. Sorted by name."""
    parts = set()
    for d in _documents(root):
        parts.update(p['file'] for p in d['parts'])
    names = [n for n in os.listdir(os.path.join(root, SPEC_DIR))
             if n.endswith('.md') and n not in parts]
    return sorted(names + document_names(root))


def listed_names(folder, names, root=ROOT):
    """NAMES (a listing of FOLDER, e.g. from os.walk) as listed before the split.

    FOLDER is a path as os.walk was given it (relative to the working folder).
    In docs/spec a split document's parts are replaced by the document's old
    name, which read_spec_file and spec_file_exists accept; any other folder's
    listing is returned unchanged.
    """
    here = os.path.normcase(os.path.abspath(folder))
    if here != os.path.normcase(os.path.abspath(os.path.join(root, SPEC_DIR))):
        return list(names)
    parts = set()
    for d in _documents(root):
        parts.update(p['file'] for p in d['parts'])
    kept = [n for n in names if n not in parts]
    # Why: a walk that does not sort met the files in the file system's
    # case-blind order, where the old names stood first.
    return sorted(kept + document_names(root), key=lambda n: (n.upper(), n))


def listed_paths(paths, root=ROOT):
    """Paths of files (repository-relative like `git ls-files`, or joined to a
    root like a glob) as listed before the split: the parts of a split
    document stand once, as <same folder>/<old name>."""
    paths = list(paths)
    owner = {}
    for d in _documents(root):
        for p in d['parts']:
            owner[p['file']] = d['name']
    tail = '/' + SPEC_DIR.replace(os.sep, '/') + '/'
    kept, found = [], []
    for p in paths:
        name = re.split(r'[\\/]', p)[-1]
        folder = p[:len(p) - len(name)]
        if name in owner and ('/' + folder.replace('\\', '/')).endswith(tail):
            if folder + owner[name] not in found:
                found.append(folder + owner[name])
        else:
            kept.append(p)
    if paths == sorted(paths):
        return sorted(kept + found)
    return kept + found


def check(root=ROOT):
    problems = []
    if not os.path.isfile(os.path.join(root, MANIFEST)):
        return ['%s is missing' % MANIFEST.replace(os.sep, '/')]
    for name in document_names(root):
        try:
            whole = read_document(name, root)
            for file, content in split_document(name, whole, root):
                path = os.path.join(root, SPEC_DIR, file)
                if _read(path) != content:
                    problems.append('%s: header or cut differs from what %s implies' % (file, MANIFEST))
        except (ValueError, OSError) as e:
            problems.append('%s: %s' % (name, e))
    return problems


def main(argv):
    if argv[:1] == ['--check']:
        problems = check()
        for p in problems:
            print('FAIL spec_files: ' + p)
        if not problems:
            parts = sum(len(part_files(n)) for n in document_names())
            print('OK   spec_files: %d documents, %d part files match %s'
                  % (len(document_names()), parts, MANIFEST.replace(os.sep, '/')))
        return 1 if problems else 0
    if argv[:1] == ['--split'] and len(argv) in (2, 3):
        name = argv[1]
        text = _read(argv[2]) if len(argv) == 3 else read_document(name)
        for file, content in split_document(name, text):
            with io.open(os.path.join(ROOT, SPEC_DIR, file), 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            print('wrote %s/%s (%d bytes)' % (SPEC_DIR.replace(os.sep, '/'), file,
                                              len(content.encode('utf-8'))))
        return 0
    if argv[:1] == ['--print'] and len(argv) == 2:
        sys.stdout.buffer.write(read_document(argv[1]).encode('utf-8'))
        return 0
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
