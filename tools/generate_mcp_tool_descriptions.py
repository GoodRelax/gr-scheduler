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

The manuscript's relayRefusalTexts (CR-799) also travel: the what of each
refusal the relay gives itself, so no relay text is written by hand.
So do its schemaNotes (CR-802), the notes readSchema returns with which
'notes'. They are checked against docs/spec/_source/grs-document.schema.json
(the npm run gen output): every schema name they say must still be a key or a
definition there, so a renamed key stops the gen instead of leaving the notes
behind.

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
import re
import sys

import generate_agent_api
# CR-766: the request of AM-7 carries table T-108's commands, printed from their manuscript.
import generate_document_commands

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
    'members of the Agent API), and the commands the AM-7 input carries from '
    'docs/spec/_source/document-commands.json (table T-108), by %s. Rebuild: npm run gen -- npm run '
    'gen:check fails on drift. One entry per row in the table\'s order: the '
    'confirmed name, its description lines joined by newlines, and its input '
    'shape (AG-12 (4) (5), design-mcp-relay.md 3.1). instructions is the text the '
    'relay answers MCP initialize with, the mcpInstructions lines joined by newlines '
    '(AG-12 (8)). relayRefusals holds the what of each refusal the relay gives itself, '
    'one line per sentence joined by spaces; the relay fills each name in braces (CR-799).'
    % (REL_SOURCE, MEMBER_TABLE, REL_SELF)
)

# CR-799: the refusals the relay gives itself, without a page to ask (AG-12, design-mcp-relay.md 5).
RELAY_REFUSALS = ('pageNotConnected', 'relayTimedOut')


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


DOCUMENT_SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json')
COMMANDS_SCHEMA = os.path.join(ROOT, 'docs', 'spec', '_source', 'grs-commands.schema.json')
# A word the notes may name: camelCase, or a Type.key pair.
NOTE_NAME = re.compile(r'\b(?:[A-Z][A-Za-z]+\.)?[a-z]+[A-Z][A-Za-z]*\b|\b[A-Z][A-Za-z]+\.[a-z][A-Za-z]*\b')


def known_names(value, into):
    """Every property and definition name of a JSON Schema, at any depth.

    @purity pure
    """
    if isinstance(value, dict):
        for key in ('properties', '$defs'):
            if isinstance(value.get(key), dict):
                into.update(value[key])
        for one in value.values():
            known_names(one, into)
    elif isinstance(value, list):
        for one in value:
            known_names(one, into)
    return into


def command_kinds(value, into):
    """Every `kind` const of the commands schema, at any depth.

    @purity pure
    """
    if isinstance(value, dict):
        kind = value.get('properties', {}).get('kind') if isinstance(value.get('properties'), dict) else None
        if isinstance(kind, dict) and isinstance(kind.get('const'), str):
            into.add(kind['const'])
        for one in value.values():
            command_kinds(one, into)
    elif isinstance(value, list):
        for one in value:
            command_kinds(one, into)
    return into


def check_notes_names(notes, doc):
    """CR-802: the notes are a manuscript beside the schema; every schema name they
    say must still be in the generated document schema, or the gen stops, so a
    renamed key cannot leave the notes behind.

    @purity semi-pure-b
    """
    schema = json.load(io.open(DOCUMENT_SCHEMA, encoding='utf-8'))
    names = known_names(schema, set())
    names.update(row['name'] for row in doc['members']['rows'])
    # CR-814: the notes may name a command kind (each command's `kind` const) and its keys.
    commands = json.load(io.open(COMMANDS_SCHEMA, encoding='utf-8'))
    names.update(command_kinds(commands, set()))
    known_names(commands, names)
    for row in doc['values']['rows']:
        names.update(field['name'] for field in row.get('fields', []))
    for found in NOTE_NAME.findall(notes):
        last = found.split('.')[-1]
        owner = found.split('.')[0] if '.' in found else None
        if last not in names or (owner and owner[0].isupper() and owner not in names):
            stop('schemaNotes names %r, which neither the document schema nor table %s holds'
                 % (found, MEMBER_TABLE))


def build():
    """@purity semi-pure-b"""
    doc = generate_agent_api.load()
    tools = []
    for member in doc['members']['rows']:
        # CR-796: printed from the English of "what it carries" (design-mcp-relay.md 3.1).
        description = generate_agent_api.english(
            member['carries'], '%s of table %s' % (member['id'], MEMBER_TABLE))
        tools.append({
            'name': member['name'],
            'description': description,
            'inputSchema': generate_document_commands.with_command_shapes(
                generate_agent_api.mcp_input_schema(member), member, doc),
        })
    names = [one['name'] for one in tools]
    if len(names) != len(set(names)):
        stop('table %s names a member twice: %s' % (MEMBER_TABLE, names))
    # CR-791: the text the relay answers MCP initialize with (AG-12 (8), design-mcp-relay.md 3.1).
    instructions = '\n'.join(line.strip() for line in doc['mcpInstructions']['text']['en']).strip()
    if not instructions:
        stop('the manuscript holds no mcpInstructions text')
    # CR-799: one sentence per line, joined by spaces, since a refusal's what is one string.
    refusals = {}
    for reason in RELAY_REFUSALS:
        text = generate_agent_api.english(
            doc['relayRefusalTexts'][reason], 'relayRefusalTexts.%s' % reason)
        refusals[reason] = ' '.join(text.splitlines())
    # CR-802: the notes readSchema hands over with which 'notes' (design-mcp-relay.md 3.1).
    notes = generate_agent_api.english(doc['schemaNotes']['text'], 'schemaNotes')
    check_notes_names(notes, doc)
    return {'$comment': BANNER, 'instructions': instructions, 'relayRefusals': refusals,
            'schemaNotes': notes, 'tools': tools}


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
