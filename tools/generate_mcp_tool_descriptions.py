# -*- coding: utf-8 -*-
"""Write the MCP tools the relay lists into src/.

    python tools/generate_mcp_tool_descriptions.py
    python tools/generate_mcp_tool_descriptions.py --check

AG-12 (4) of table T-035 (MUST) has the relay offer exactly one MCP tool per
member of table T-107, named with the member's confirmed name, none added and
none bundled. The design of the relay (docs/spec/_assets/design-mcp-relay.md,
section 3.1) prints each tool's description from the same row's "what it
carries" cell and its input from the row's arguments, and never writes
either by hand. This script is that print.

READS   docs/spec/_source/agent-api-members.json, the manuscript of table T-107
        (CR-765; the table itself is printed into
        docs/spec/_assets/tbl-agent-api-members.md).

What travels, in the table's row order: the confirmed name, the description
(the "what it carries" lines joined by newlines) and the input shape -- one
object whose keys are the member's arguments (or its MCP-only keys, AG-12
(5)), each typed by the derivation of design-mcp-relay.md 3.1 and described by
the argument's meaning. The derivation lives in tools/generate_agent_api.py,
which prints the AgentApi type from the same manuscript, so the two cannot
disagree about a key.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import sys

import generate_agent_api

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'src', 'adapter', 'mcp-tool-translator',
                   'mcp-tool-descriptions.json')
REL_OUT = 'src/adapter/mcp-tool-translator/mcp-tool-descriptions.json'
REL_SELF = 'tools/generate_mcp_tool_descriptions.py'
REL_SOURCE = generate_agent_api.REL_SOURCE

MEMBER_TABLE = 'T-107'

BANNER = (
    'GENERATED -- do not edit by hand. Generated from %s, table %s (the '
    'members of the Agent API) by %s. Rebuild: npm run gen -- npm run '
    'gen:check fails on drift. One entry per row in the table\'s order: the '
    'confirmed name, its description lines joined by newlines, and its input '
    'shape (AG-12 (4) (5), design-mcp-relay.md 3.1).' % (REL_SOURCE, MEMBER_TABLE, REL_SELF)
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


def build():
    """@purity semi-pure-b"""
    doc = generate_agent_api.load()
    tools = []
    for member in doc['members']['rows']:
        description = '\n'.join(line.strip() for line in member['carries']['ja']).strip()
        if not description:
            stop('%s of table %s has an empty description' % (member['id'], MEMBER_TABLE))
        tools.append({
            'name': member['name'],
            'description': description,
            'inputSchema': generate_agent_api.mcp_input_schema(member),
        })
    names = [one['name'] for one in tools]
    if len(names) != len(set(names)):
        stop('table %s names a member twice: %s' % (MEMBER_TABLE, names))
    return {'$comment': BANNER, 'tools': tools}


def main():
    """Write the tools, or say whether the file on disk still matches.

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
        say('OK       the MCP tools match table %s (%d tools)' % (MEMBER_TABLE, count))
        return 0
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    say('wrote %s (%d tools, %d bytes)' % (REL_OUT, count, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
