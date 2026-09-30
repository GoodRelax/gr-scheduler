# -*- coding: utf-8 -*-
"""Write the MCP tool descriptions the relay lists into src/.

    python tools/generate_mcp_tool_descriptions.py
    python tools/generate_mcp_tool_descriptions.py --check

AG-12 (4) of table T-035 (MUST) has the relay offer exactly one MCP tool per
member of table T-107, named with the member's confirmed name, none added and
none bundled. The design of the relay (docs/spec/_assets/design-mcp-relay.md,
section 3.1) prints each tool's description from the same row's "what it
carries" cell and never writes one by hand. This script is that print.

What travels: the confirmed name (third column) and the description cell, in
the table's row order, with each `<br>` turned into a newline. The relay's
McpToolTranslator (UF-186) reads this file and holds the tool list 1:1 with
the AgentApi type at compile time, so a row added here without a member (or
the reverse) stops the type check rather than reach an AI app.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

import spec_tables

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'src', 'adapter', 'mcp-tool-translator',
                   'mcp-tool-descriptions.json')
REL_OUT = 'src/adapter/mcp-tool-translator/mcp-tool-descriptions.json'
REL_SELF = 'tools/generate_mcp_tool_descriptions.py'
REL_GLOSSARY = 'docs/spec/_assets/tbl-glossary.md'

MEMBER_TABLE = 'T-107'
# The confirmed name and the "what it carries" headings of table T-107.
NAME_HEADING = u'確定名'
DESCRIPTION_HEADING = u'何を担うか'
CODE_FENCE = '`'
LINE_BREAK = '<br>'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s (the '
    'members of the Agent API) by %s. Rebuild: npm run gen -- npm run '
    'gen:check fails on drift. One entry per row in the table\'s order: the '
    'confirmed name and its description cell, <br> read as a newline (AG-12 '
    '(4), design-mcp-relay.md 3.1).' % (REL_GLOSSARY, MEMBER_TABLE, REL_SELF)
)


def say(message):
    """The cp932 guard every generator in this tree carries.

    @purity non-pure
    """
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def stop(message):
    """@purity non-pure"""
    say('%s: %s' % (REL_SELF, message))
    sys.exit(1)


def description_of(cell):
    """The description cell as the tool list carries it.

    @purity pure
    """
    return '\n'.join(part.strip() for part in cell.split(LINE_BREAK)).strip()


def build():
    """@purity semi-pure-b"""
    tools = []
    for row in spec_tables.read(REL_GLOSSARY, MEMBER_TABLE):
        name = row.cell(NAME_HEADING).replace(CODE_FENCE, '').strip()
        description = description_of(row.cell(DESCRIPTION_HEADING))
        if not name or not description:
            stop('%s of table %s has an empty name or description'
                 % (row.id, MEMBER_TABLE))
        tools.append({'name': name, 'description': description})
    names = [one['name'] for one in tools]
    if len(names) != len(set(names)):
        stop('table %s names a member twice: %s' % (MEMBER_TABLE, names))
    return {'$comment': BANNER, 'tools': tools}


def main():
    """Write the descriptions, or say whether the file on disk still matches.

    @purity non-pure
    """
    built = build()
    body = json.dumps(built, ensure_ascii=False, indent=1) + '\n'
    count = len(built['tools'])
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            say('PROBLEM  %s has not been written yet' % REL_OUT)
            return 1
        on_disk = io.open(OUT, encoding='utf-8', newline='').read()
        if on_disk != body:
            say('PROBLEM  %s has drifted from table %s -- run `python %s`'
                % (REL_OUT, MEMBER_TABLE, REL_SELF))
            return 1
        say('OK       the MCP tool descriptions match table %s (%d tools)'
            % (MEMBER_TABLE, count))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote %s (%d tools, %d bytes)' % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
