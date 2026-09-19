# -*- coding: utf-8 -*-
"""Write the MSPDI child-order table the codec sorts written children by.

    python tools/generate_mspdi_child_order.py
    python tools/generate_mspdi_child_order.py --check

EX-10 of table T-033 has every written element's children put in the order of
the pj15 schema's xsd:sequence, and a parent that is an xsd:all keeps the order
the file arrived in. CN-7 of table T-003 lets the names and order of children
-- and nothing else -- be shipped as a table made by a tool. This is the tool.

WHAT IS READ. docs/reference/mspdi/pj15/mspdi_pj15.xsd for the order, and
docs/reference/mspdi/pj12/mspdi_pj12.xsd for which children pj12 lacks, since
Project.sourceFormat is pj15 when a file holds one of those (decision 7 of
CR-429). Both copies are git-ignored (docs/reference/README.md), which is why
the table is committed: without it neither CI nor a worktree could sort.

WHAT IS WRITTEN. src/adapter/document-codec/mspdi-child-order.json:

    sourceXsdSha256  SHA-256 of the pj15 schema the table was made from
    pj12XsdSha256    SHA-256 of the pj12 schema the pj15Only marks came from
    bodySha256       SHA-256 of the file itself (below)
    parents          element path -> {all, children, pj15Only}
                     keyed by path, not name: 13 names change shape with
                     their parent in pj15 (decision 3 of CR-429)

NO TYPE, DESCRIPTION OR ENUMERATION IS COPIED (CN-7). Only an element with
children has a row; a leaf is only a name inside its parent's row. The one
named complex type is expanded wherever it is used, so its children are
reached by path like any other.

THE PREMISES THE CODEC RESTS ON ARE HELD HERE, AND A BROKEN ONE STOPS THE RUN:
every pj12 path and child is also in pj15, pj12's order is pj15's with the
pj15-only names removed (so a file without them is written in pj12 order),
both agree on which parents are xsd:all, no parent names a child twice, and no
repeating group holds two names (ranking by name would break it).

THE SELF HASH (JDG-251). A worktree has no XSD, so a hand edit to the table
would pass unseen there. bodySha256 is the SHA-256 of the UTF-8 bytes of
json.dumps(table without bodySha256, sort_keys=True, separators=(',', ':'),
ensure_ascii=True); arrays keep their order, since the order is the content.
--check recomputes it whether or not the XSD is present and fails on a
mismatch. Where the XSD is present it also rebuilds the table and compares the
whole file, and holds both recorded schema hashes against the copies. Where an
XSD is absent, only the part that needs it is reported SKIPPED. A rewrite that
also rewrites bodySha256 is not caught; only a tree with the XSD can say
whether the table matches the schema.

Run with PYTHONIOENCODING=utf-8.
"""
import hashlib
import io
import json
import os
import sys
import xml.etree.ElementTree as ElementTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_PJ15 = 'docs/reference/mspdi/pj15/mspdi_pj15.xsd'
REL_PJ12 = 'docs/reference/mspdi/pj12/mspdi_pj12.xsd'
REL_OUT = 'src/adapter/document-codec/mspdi-child-order.json'
REL_SELF = 'tools/generate_mspdi_child_order.py'
REL_FETCH = 'previous-project-result/01-mspdi/mspdi/README.md'

XS = '{http://www.w3.org/2001/XMLSchema}'
ROOT_ELEMENT = 'Project'
BODY_FIELD = 'bodySha256'
SKIPPED_TAGS = (XS + 'annotation',)
COMPOSITORS = (XS + 'sequence', XS + 'all', XS + 'choice')


class SchemaProblem(Exception):
    """The schema uses a construct the table cannot express, or breaks a premise."""


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


def sha256_of_file(rel):
    with io.open(path_of(rel), 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def body_sha256(table):
    body = dict((key, value) for key, value in table.items() if key != BODY_FIELD)
    text = json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def is_repeating(node):
    return node.get('maxOccurs', '1') not in ('0', '1')


def content_of(element_decl, named_types, where):
    """The compositor of an element's complex type, or None for a leaf."""
    inline = element_decl.find(XS + 'complexType')
    type_name = element_decl.get('type')
    if inline is not None:
        type_node = inline
    elif type_name is not None and ':' not in type_name:
        type_node = named_types.get(type_name)
        if type_node is None:
            raise SchemaProblem('%s names the type %s, which the schema does not '
                                'define' % (where, type_name))
        if type_node.tag == XS + 'simpleType':
            return None
    else:
        return None
    parts = [child for child in type_node if child.tag not in SKIPPED_TAGS]
    if not parts:
        return None
    if len(parts) != 1 or parts[0].tag not in COMPOSITORS:
        raise SchemaProblem('%s holds %s, which this table cannot express'
                            % (where, ', '.join(part.tag.replace(XS, 'xsd:') for part in parts)))
    return parts[0]


def child_declarations(compositor, where):
    """The element declarations of a content model, in declared order."""
    found = []
    names_in_repeat = set()
    for part in compositor:
        if part.tag in SKIPPED_TAGS:
            continue
        if part.tag == XS + 'element':
            if part.get('name') is None:
                raise SchemaProblem('%s holds an element without a name (a ref?)' % where)
            found.append(part)
            names_in_repeat.add(part.get('name'))
        elif part.tag in (XS + 'sequence', XS + 'choice'):
            inner = child_declarations(part, where)
            found.extend(inner)
            names_in_repeat.update(one.get('name') for one in inner)
        else:
            raise SchemaProblem('%s holds %s inside a content model'
                                % (where, part.tag.replace(XS, 'xsd:')))
    if compositor.tag == XS + 'sequence' and is_repeating(compositor) and len(names_in_repeat) > 1:
        raise SchemaProblem('%s repeats a group of %d names, and ranking by name '
                            'would regroup them' % (where, len(names_in_repeat)))
    return found


def order_table(rel):
    """element path -> (is_all, [child names]) for every element with children."""
    schema = ElementTree.parse(path_of(rel)).getroot()
    named_types = dict((node.get('name'), node) for node in schema
                       if node.tag in (XS + 'complexType', XS + 'simpleType')
                       and node.get('name') is not None)
    roots = [node for node in schema
             if node.tag == XS + 'element' and node.get('name') == ROOT_ELEMENT]
    if len(roots) != 1:
        raise SchemaProblem('%s declares %d top-level <%s> elements, not 1'
                            % (rel, len(roots), ROOT_ELEMENT))
    table = {}
    # WHY: children are pushed in reverse, so rows come out in the schema's
    # own reading order (a pre-order walk) and the file diffs like the schema.
    stack = [(roots[0], ROOT_ELEMENT, ())]
    while stack:
        decl, path, expanding = stack.pop()
        type_name = decl.get('type')
        if type_name is not None and type_name in expanding:
            raise SchemaProblem('%s: the type %s contains itself' % (path, type_name))
        compositor = content_of(decl, named_types, path)
        if compositor is None:
            continue
        if compositor.tag == XS + 'all' and any(part.tag != XS + 'element' for part in compositor
                                                 if part.tag not in SKIPPED_TAGS):
            raise SchemaProblem('%s: an xsd:all holding more than elements' % path)
        children = child_declarations(compositor, path)
        names = [child.get('name') for child in children]
        doubled = sorted(set(name for name in names if names.count(name) > 1))
        if doubled:
            raise SchemaProblem('%s declares %s twice, so a name has no one rank'
                                % (path, ', '.join(doubled)))
        if path in table:
            raise SchemaProblem('%s is reached twice' % path)
        table[path] = (compositor.tag == XS + 'all', names)
        inner = expanding + ((type_name,) if type_name is not None else ())
        for child in reversed(children):
            stack.append((child, path + '/' + child.get('name'), inner))
    return table


def pj15_only_marks(pj15, pj12):
    """For each pj15 row, its children pj12 lacks; the premises are held here."""
    problems = []
    for path in pj12:
        if path not in pj15:
            problems.append('%s is in pj12 but not in pj15' % path)
    marks = {}
    for path, (is_all, names) in pj15.items():
        if path not in pj12:
            # WHY: the element itself is marked at its parent, and a child
            # cannot arrive without it, so one mark says pj15 already.
            marks[path] = []
            continue
        was_all, old_names = pj12[path]
        if was_all != is_all:
            problems.append('%s is xsd:all in one schema only' % path)
        lost = [name for name in old_names if name not in names]
        if lost:
            problems.append('%s: pj15 dropped %s' % (path, ', '.join(lost)))
        added = [name for name in names if name not in old_names]
        if [name for name in names if name not in added] != old_names:
            problems.append('%s: pj15 reorders the children pj12 has, so a file '
                            'without pj15 elements would not be written in pj12 '
                            'order' % path)
        marks[path] = added
    return marks, problems


def build():
    missing = [rel for rel in (REL_PJ15, REL_PJ12) if not os.path.exists(path_of(rel))]
    if missing:
        return None, missing, []
    try:
        pj15 = order_table(REL_PJ15)
        pj12 = order_table(REL_PJ12)
    except (SchemaProblem, ElementTree.ParseError) as why:
        return None, [], [str(why)]
    marks, problems = pj15_only_marks(pj15, pj12)
    if problems:
        return None, [], problems
    out = {
        '$comment': [
            'GENERATED -- do not edit by hand. Your change is overwritten by '
            'the next rebuild, and npm run gen:check fails on it even where '
            'the XSD is absent (bodySha256).',
            'Generated from %s (the order, EX-10 of table T-033) and %s (the '
            'pj15Only marks) by %s. Both copies are git-ignored; how to fetch '
            'them is in %s.' % (REL_PJ15, REL_PJ12, REL_SELF, REL_FETCH),
            'Rebuild: npm run gen   |   npm run gen:check fails on drift.',
            'Only the names and the order of children are copied (CN-7 of '
            'table T-003): no type, description or enumeration. A leaf has '
            'no row; "all" marks an xsd:all parent, whose order is free.',
        ],
        'sourceXsdSha256': sha256_of_file(REL_PJ15),
        'pj12XsdSha256': sha256_of_file(REL_PJ12),
        BODY_FIELD: '',
        'parents': dict(
            (path, {'all': is_all, 'children': names, 'pj15Only': marks[path]})
            for path, (is_all, names) in pj15.items()
        ),
    }
    out[BODY_FIELD] = body_sha256(out)
    return out, [], []


def text_of(table):
    return json.dumps(table, ensure_ascii=True, indent=1) + '\n'


def tally(table):
    parents = table.get('parents', {})
    return (len(parents),
            sum(1 for row in parents.values() if row.get('all')),
            sum(len(row.get('pj15Only', [])) for row in parents.values()))


def committed():
    """The committed table and a problem, reading it exactly as --check does."""
    target = path_of(REL_OUT)
    if not os.path.exists(target):
        return None, None, '%s does not exist -- run npm run gen where the XSD is' % REL_OUT
    with io.open(target, encoding='utf-8') as handle:
        text = handle.read()
    try:
        table = json.loads(text)
    except ValueError as why:
        return None, text, '%s is not JSON (%s) -- it was edited by hand' % (REL_OUT, why)
    if not isinstance(table, dict) or table.get(BODY_FIELD) != body_sha256(table):
        return None, text, ('%s: %s does not match its body -- the table was '
                            'edited by hand after it was generated; rebuild it '
                            'with npm run gen where the XSD is'
                            % (REL_OUT, BODY_FIELD))
    return table, text, None


def check():
    table, text, problem = committed()
    if problem is not None:
        sys.stdout.write('PROBLEM  %s\n' % problem)
        return 1
    parents, all_parents, marked = tally(table)
    sys.stdout.write('OK       %s matches its %s (%d parent(s), %d xsd:all, %d '
                     'pj15-only)\n' % (REL_OUT, BODY_FIELD, parents, all_parents, marked))
    failed = False
    for rel, field in ((REL_PJ15, 'sourceXsdSha256'), (REL_PJ12, 'pj12XsdSha256')):
        if not os.path.exists(path_of(rel)):
            continue
        if sha256_of_file(rel) != table.get(field):
            sys.stdout.write('PROBLEM  %s is not the schema %s names in %s -- '
                             'check the copy against appendix A.1, then run '
                             'npm run gen\n' % (rel, REL_OUT, field))
            failed = True
    out, missing, problems = build()
    if problems:
        for one in problems:
            sys.stdout.write('PROBLEM  %s\n' % one)
        return 1
    if missing:
        sys.stdout.write('SKIPPED  %s %s absent (git-ignored), so the table is '
                         'not rebuilt and compared here\n'
                         % (' and '.join(missing), 'are' if len(missing) > 1 else 'is'))
        return 1 if failed else 0
    if text_of(out) != text:
        sys.stdout.write('PROBLEM  %s has drifted from %s -- run npm run gen\n'
                         % (REL_OUT, REL_PJ15))
        return 1
    if failed:
        return 1
    sys.stdout.write('OK       %s matches %s and %s\n' % (REL_OUT, REL_PJ15, REL_PJ12))
    return 0


def generate():
    out, missing, problems = build()
    if problems:
        for one in problems:
            sys.stdout.write('PROBLEM  %s\n' % one)
        return 1
    if missing:
        # WHY: a tree without the XSD cannot rebuild the table, so gen keeps
        # the committed one and holds it as gen:check does; failing here would
        # stop npm run gen in every worktree.
        return check()
    target = path_of(REL_OUT)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with io.open(target, 'w', encoding='utf-8', newline='') as handle:
        handle.write(text_of(out))
    parents, all_parents, marked = tally(out)
    sys.stdout.write('wrote %s (%d parent(s), %d xsd:all, %d pj15-only)\n'
                     % (REL_OUT, parents, all_parents, marked))
    return 0


def main(argv):
    return check() if '--check' in argv else generate()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
