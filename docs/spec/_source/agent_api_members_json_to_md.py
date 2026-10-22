# -*- coding: utf-8 -*-
"""agent-api-members.json -> docs/spec/_assets/tbl-agent-api-members.md

agent-api-members.json is the manuscript for table T-107 (the members of the
Agent API, with their arguments and return values) and table T-400 (the value
types those arguments and return values name that table T-064 has no row
for) -- CR-765, JDG-2160. EDIT THAT. This file prints it as the document the
specification carries, and _assets/tbl-agent-api-members.md is a generated
artifact: a hand edit to it is overwritten, and --check catches one before it
can be committed.

    python agent_api_members_json_to_md.py           rebuild the document
    python agent_api_members_json_to_md.py --check   exit 1 if the file differs

⭐ WHY A MANUSCRIPT (CR-765). The names of the arguments lived in four hand
copies in src/ (the AgentApi type, the relay's parameter list, the MCP input
keys and the relay's own wait key) and in none of the specification:
table T-107 said the arguments and return values were src/'s. The same
manuscript now prints the table, and tools/generate_agent_api.py and
tools/generate_mcp_tool_descriptions.py print the code's type and the MCP
tools' input from it.

⭐ HOW A TYPE IS PRINTED. `type` and `returns` are TypeScript, as the code
spells them. A table cell cannot hold a bar, so a union is printed as its
alternatives in code spans joined by the word か. After the type, in one pair
of full-width parentheses, come the rows that hold each name the type uses:
a row of table T-400 by its id, any other name by its `externalTypes` entry.

⛔ REFUSED BEFORE A BYTE IS WRITTEN:

    a row id or a name written twice, in either table
    a type naming an identifier that is neither a row of table T-400, a key
      of `externalTypes`, a type parameter of its row nor a built-in
    an `externalTypes` entry no type uses
    an empty line, or a line that holds a line-break tag
    a line whose full-width parentheses or bold run (**) do not close on it
    a `lead` that does not name the type its row `extends`
    a preamble that does not say {version} exactly once
    whatever agent-api-members.schema.json refuses (when jsonschema is installed)

⛔ NO RULE IS PRINTED HERE. The MUST clauses about the Agent API stand in
table T-035 and the requirements the `source` cells name; this document
prints the rows and says where it came from.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

from spec_md_printing import say, schema_problems

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(os.path.dirname(HERE), '_assets')
SRC = os.path.join(HERE, 'agent-api-members.json')
SCHEMA = os.path.join(HERE, 'agent-api-members.schema.json')
OUT = os.path.join(ASSETS, 'tbl-agent-api-members.md')

LANG = 'ja'
BR = '<br>'
OPEN = chr(0xFF08)           # the full-width parentheses a reference is printed inside
CLOSE = chr(0xFF09)
SOLIDUS = u' ／ '        # between two references
INDENT = chr(0x3000) * 2     # the fields under a union alternative, two ideographic spaces
DASH = u' —— '     # between a name and what it means
OR = u' か '             # the word a printed union joins its alternatives with
NONE = u'—'             # an empty cell
DOT = u'・'              # between the kind and the purity
VERSION = '{version}'

BUILT_IN = {'string', 'number', 'boolean', 'null', 'void', 'true', 'false',
            'readonly', 'Promise', 'Uint8Array'}
IDENTIFIER = re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*')
QUOTED = re.compile(r"'[^']*'")


def prose(cell):
    return cell.get(LANG, '')


def names_in(type_text):
    """The identifiers a TypeScript type names, in order, string literals left out."""
    seen = []
    for name in IDENTIFIER.findall(QUOTED.sub('', type_text)):
        if name not in BUILT_IN and name not in seen:
            seen.append(name)
    return seen


def alternatives(type_text):
    """The top-level alternatives of a union, outside angle brackets and quotes."""
    parts, depth, quoted, start = [], 0, False, 0
    for at, char in enumerate(type_text):
        if char == "'":
            quoted = not quoted
        elif not quoted and char in '<([':
            depth += 1
        elif not quoted and char in '>)]':
            depth -= 1
        elif not quoted and depth == 0 and char == '|':
            parts.append(type_text[start:at].strip())
            start = at + 1
    parts.append(type_text[start:].strip())
    return parts


class Printer(object):
    def __init__(self, doc):
        self.doc = doc
        self.value_ids = dict((row['name'], row['id']) for row in doc['values']['rows'])
        self.external = doc['externalTypes']

    def reference(self, name):
        if name in self.value_ids:
            return u'`%s`' % self.value_ids[name]
        return prose(self.external[name])

    def references(self, type_text, own=()):
        refs = [self.reference(name) for name in names_in(type_text) if name not in own]
        return (OPEN + SOLIDUS.join(refs) + CLOSE) if refs else u''

    def type_cell(self, type_text, own=()):
        spans = OR.join(u'`%s`' % one for one in alternatives(type_text))
        return spans + self.references(type_text, own)

    def argument_line(self, one, prefix=u''):
        return u'%s`%s`: %s%s%s' % (prefix, one['name'], self.type_cell(one['type']),
                                   DASH, prose(one['meaning']))

    def field_line(self, one, own):
        name = one['name'] + ('()' if one.get('kind') == 'method' else '')
        return u'`%s`: %s%s%s' % (name, self.type_cell(one['type'], own), DASH,
                                  prose(one['meaning']))

    def member_row(self, row):
        kind = prose(self.doc['kinds'][row['kind']])
        lines = [self.argument_line(one) for one in row['arguments']]
        label = prose(self.doc['mcpOnlyLabel']) + u' '
        lines += [self.argument_line(one, label) for one in row.get('mcpOnlyKeys', [])]
        return u'| %s | %s | `%s` | %s%s`%s` | %s | %s | %s | %s |' % (
            row['id'], prose(row['group']), row['name'], kind, DOT, row['purity'],
            BR.join(lines) or NONE, self.type_cell(row['returns']),
            BR.join(prose(row['carries'])), prose(row['source']))

    def lead_line(self, row):
        lead = prose(row['lead'])
        base = row.get('extends')
        if base is None:
            return lead
        spelled = u'`%s`' % base
        return lead.replace(spelled, spelled + OPEN + self.reference(base) + CLOSE, 1)

    def value_lines(self, row):
        own = tuple(row.get('typeParameters', []))
        lines = [self.lead_line(row)] if 'lead' in row else []
        if row['shape'] in ('interface', 'function'):
            return lines + [self.field_line(one, own) for one in row['fields']]
        for one in row['variants']:
            if 'type' in one:
                lines.append(u'%s%s%s' % (self.type_cell(one['type'], own), DASH,
                                          prose(one['meaning'])))
            else:
                lines.append(u'**%s**' % prose(one['label']))
                lines += [INDENT + self.field_line(field, own) for field in one['fields']]
        return lines

    def value_row(self, row):
        params = row.get('typeParameters')
        name = row['name'] + (u'<%s>' % ', '.join(params) if params else u'')
        return u'| %s | `%s` | %s | %s |' % (row['id'], name, BR.join(self.value_lines(row)),
                                            prose(row['source']))


def every_type(doc):
    """(where, type text, own type parameters) for every type the manuscript writes."""
    for row in doc['members']['rows']:
        yield row['id'], row['returns'], ()
        for one in row['arguments'] + row.get('mcpOnlyKeys', []):
            yield row['id'], one['type'], ()
    for row in doc['values']['rows']:
        own = tuple(row.get('typeParameters', []))
        if 'extends' in row:
            yield row['id'], row['extends'], own
        if 'returns' in row:
            yield row['id'], row['returns'], own
        for one in row.get('fields', []):
            yield row['id'], one['type'], own
        for variant in row.get('variants', []):
            if 'type' in variant:
                yield row['id'], variant['type'], own
            for one in variant.get('fields', []):
                yield row['id'], one['type'], own


def every_line(doc):
    """(where, line) for every printed line the manuscript writes."""
    for line in prose(doc['members']['before']):
        yield 'members.before', line
    for paragraph in prose(doc['members']['after']):
        for line in paragraph:
            yield 'members.after', line
    for line in prose(doc['values']['before']):
        yield 'values.before', line
    for line in prose(doc['mcpInstructions']['lead']):
        yield 'mcpInstructions.lead', line
    for line in doc['mcpInstructions']['text']['en']:
        yield 'mcpInstructions.text', line
    for line in prose(doc['schemaNotes']['lead']):
        yield 'schemaNotes.lead', line
    for line in doc['schemaNotes']['text']['en']:
        yield 'schemaNotes.text', line
    for row in doc['members']['rows']:
        for line in prose(row['carries']):
            yield row['id'], line
        yield row['id'], prose(row['source'])
        for one in row['arguments'] + row.get('mcpOnlyKeys', []):
            yield row['id'], prose(one['meaning'])
    for row in doc['values']['rows']:
        yield row['id'], prose(row['source'])
        if 'lead' in row:
            yield row['id'], prose(row['lead'])
        fields = list(row.get('fields', []))
        for variant in row.get('variants', []):
            yield row['id'], prose(variant.get('meaning', variant.get('label', {})))
            fields += variant.get('fields', [])
        for one in fields:
            yield row['id'], prose(one['meaning'])


def duplicate_problems(doc):
    found = []
    for part in ('members', 'values'):
        ids, names = set(), set()
        for row in doc[part]['rows']:
            if row['id'] in ids:
                found.append('%s is written twice in %s' % (row['id'], part))
            if row['name'] in names:
                found.append('%s: the name %s is written twice in %s'
                             % (row['id'], row['name'], part))
            ids.add(row['id'])
            names.add(row['name'])
    return found


def type_problems(doc):
    found = []
    defined = set(row['name'] for row in doc['values']['rows'])
    used = set()
    for where, type_text, own in every_type(doc):
        for name in names_in(type_text):
            used.add(name)
            if name not in defined and name not in doc['externalTypes'] and name not in own:
                found.append('%s: the type %r names %s, which no row of table %s, '
                             'no externalTypes entry and no type parameter defines'
                             % (where, type_text, name, doc['values']['table']['id']))
    for name in doc['externalTypes']:
        if name not in used:
            found.append('externalTypes holds %s, which no type uses' % name)
    for row in doc['values']['rows']:
        base = row.get('extends')
        if base is not None and u'`%s`' % base not in prose(row.get('lead', {})):
            found.append('%s extends %s, and its lead does not name it' % (row['id'], base))
    return found


def line_problems(doc):
    found = []
    if u''.join(prose(doc['members']['before'])).count(VERSION) != 1:
        found.append('the preamble of table %s says %s other than once'
                     % (doc['members']['table']['id'], VERSION))
    for where, line in every_line(doc):
        if not line.strip() or BR in line:
            found.append('%s: an empty line or a line-break tag -- one string is one line'
                         % where)
        elif line.count('**') % 2:
            found.append('%s: a bold run does not close on its line: %r' % (where, line[:40]))
        elif line.count(OPEN) != line.count(CLOSE):
            found.append('%s: a parenthesis does not close on its line: %r'
                         % (where, line[:40]))
    return found


def problems(doc):
    found = schema_problems(doc, SCHEMA)
    if found:
        return found
    return duplicate_problems(doc) + type_problems(doc) + line_problems(doc)


def paragraph(lines):
    return u'  \n'.join(lines)


def table_head(table):
    columns = prose(table['columns'])
    return [
        u'**表 %s — %s**' % (table['id'], prose(table['caption'])),
        '',
        u'| %s |' % u' | '.join(columns),
        u'| %s |' % u' | '.join(['---'] * len(columns)),
    ]


def build(doc):
    """The document, as it is written out."""
    printer = Printer(doc)
    members = doc['members']
    values = doc['values']
    first = members['table']
    second = values['table']
    before = [line.replace(VERSION, str(doc['version'])) for line in prose(members['before'])]
    out = [
        u'# %s — 表 %s・表 %s' % (prose(first['caption']), first['id'], second['id']),
        '',
        '**UID**: DOC-TBL-AGENT-API-MEMBERS',
        '**Version**: 0.1',
        '',
        u'> ⛔ 本書は生成物である。  ',
        u'> 手で直さない —— 直しても次の `npm run gen` で消える。',
        u'> **`Agent API` のメンバと呼び方の唯一の正は `_source/agent-api-members.json` である。**  ',
        u'> 本書はそれを `_source/agent_api_members_json_to_md.py` が印字したものである。',
        u'> **作り直す**: `npm run gen` ／ **ズレを検出する**: `npm run gen:check`。',
        '',
        u'規則は 表 T-035 と、「正」の列が指す要求が持つ。  ',
        u'本書は 表 %s と 表 %s の全行を印字する。' % (first['id'], second['id']),
        '',
        paragraph(before),
        '',
    ]
    out += table_head(first)
    out += [printer.member_row(row) for row in members['rows']]
    for one in prose(members['after']):
        out += ['', paragraph(one)]
    out += ['', paragraph(prose(values['before'])), '']
    out += table_head(second)
    out += [printer.value_row(row) for row in values['rows']]
    # CR-791: what the relay answers MCP initialize with (AG-12 (8)), printed as the AI reads it.
    instructions = doc['mcpInstructions']
    out += ['', u'**MCP の初期化の答えに載せる案内**', '',
            paragraph(prose(instructions['lead'])), '', '```text']
    out += instructions['text']['en']
    out += ['```']
    # CR-802: the notes readSchema returns with which 'notes'.
    notes = doc['schemaNotes']
    out += ['', u'**スキーマの注意（`readSchema` の `notes`）**', '',
            paragraph(prose(notes['lead'])), '', '```text']
    out += notes['text']['en']
    out += ['```']
    return u'\n'.join(out) + u'\n'


def main():
    doc = json.load(io.open(SRC, encoding='utf-8'))
    found = problems(doc)
    if found:
        for one in found:
            say('  %s' % one)
        say('agent-api-members.json is not valid; nothing was written')
        return 1
    built = build(doc)
    rel = os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE))).replace('\\', '/')
    counts = '%d member(s), %d value type(s)' % (len(doc['members']['rows']),
                                                 len(doc['values']['rows']))
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % rel)
            return 1
        current = io.open(OUT, encoding='utf-8', newline='').read().replace('\r\n', '\n')
        if current != built:
            say('DRIFTED  %s no longer matches agent-api-members.json -- rerun '
                'agent_api_members_json_to_md.py' % rel)
            return 1
        say('OK       %s matches agent-api-members.json (%s)' % (rel, counts))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(built)
    say('wrote %s  (%s)' % (rel, counts))
    return 0


if __name__ == '__main__':
    sys.exit(main())
