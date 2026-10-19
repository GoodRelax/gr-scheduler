# -*- coding: utf-8 -*-
"""Print the Agent API's call shapes into src/ from their manuscript.

    python tools/generate_agent_api.py
    python tools/generate_agent_api.py --check

READS   docs/spec/_source/agent-api-members.json (table T-107, the 27 members
        with their arguments and return values, and table T-400, the value
        types they hand over -- CR-765, JDG-2160).
WRITES  one region per unit, the one that opens
        `// <generated -- do not edit by hand>` followed by the line naming
        agent-api-members.json, up to its `// </generated>`:

          src/adapter/agent-api-endpoint/agent-api-members.ts
              the value types of table T-400, the AgentApi interface and
              AGENT_API_VERSION;
          src/adapter/agent-api-endpoint/relayed-call.ts
              RelayedParams (what the relay carries to each member) and
              MEMBER_PARAMETERS (the argument order of each member that takes
              any);
          src/framework/mcp-relay-server/mcp-relay-server.ts
              the member whose MCP tool takes a key only the relay reads, and
              that key (AG-12 (5)).

⭐ WHY. The argument names used to be four hand copies in src/ and in none of
the specification (DFC-2641). The MCP tools' input shapes, the fourth copy,
are printed by tools/generate_mcp_tool_descriptions.py from the same
manuscript through mcp_input_schema() below, so the two generators share the
one derivation design-mcp-relay.md section 3.1 states.

⚠️ A TYPE NAME IS NOT IMPORTED HERE. The regions use the names the manuscript
writes; each unit imports or aliases them by hand outside its region (Document,
DocumentStamp, SearchRows ...), so tsc refuses a name nobody brings in.

⛔ NO VALUE IS INVENTED HERE. Every name, type, purity and order is the
manuscript's; agent_api_members_json_to_md.py validates it first.

Run with PYTHONIOENCODING=utf-8.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

REL_SOURCE = 'docs/spec/_source/agent-api-members.json'
REL_SELF = 'tools/generate_agent_api.py'
REL_MEMBERS = 'src/adapter/agent-api-endpoint/agent-api-members.ts'
REL_RELAYED = 'src/adapter/agent-api-endpoint/relayed-call.ts'
REL_RELAY_SERVER = 'src/framework/mcp-relay-server/mcp-relay-server.ts'

OPEN = '// <generated -- do not edit by hand>'
CLOSE = '// </generated>'
HEADER_PREFIX = '// From %s (' % REL_SOURCE
HEADER = HEADER_PREFIX + '%s).'

IDENTIFIER = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')
NUMBER_LISTS = ('readonly number[]', 'number[]')
STRING_LISTS = ('readonly string[]', 'string[]')
PRIMITIVE_SCHEMAS = {'string': 'string', 'number': 'number', 'boolean': 'boolean'}
STRING_LITERAL = re.compile(r"^'([^']*)'$")
# An alternative of a union longer than this is printed one field per line.
LINE_WIDTH = 100
# CR-796: a description an MCP client reads names no row of the specification
# (design-mcp-relay.md 3.1) -- the reading AI cannot follow one.
ROW_ID = re.compile(r'\b[A-Z]{1,4}-\d+[a-z]?\b')
# CR-796: each saving member names the one extension it writes in its carries,
# as "拡張子 `.json`" (AG-12 (9)); the relay refuses any other.
SAVE_EXTENSION = re.compile(r'拡張子 `(\.[a-z]+)`')


def path_of(rel):
    return os.path.join(ROOT, *rel.split('/'))


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


def load():
    """The manuscript, as JSON.

    @purity semi-pure-b
    """
    return json.load(io.open(path_of(REL_SOURCE), encoding='utf-8'))


def string_literals(type_text):
    """The values of a union of string literals ('a' | 'b'), or None.

    @purity pure
    """
    values = []
    for part in type_text.split('|'):
        found = STRING_LITERAL.match(part.strip())
        if not found:
            return None
        values.append(found.group(1))
    return values


def mcp_value_schema(type_text, where):
    """The MCP input schema of one argument type (design-mcp-relay.md 3.1).

    `string`, `number` and `boolean` map to themselves, a list of numbers to
    an array of numbers, a union of string literals to a string enum, and a
    named type to an object.

    ⛔ NEVER oneOf, anyOf or a list of types (AG-12 (8)) -- the MCP client
    drops them, so a type that needs one (`X | null`) stops here.

    @purity pure
    """
    if type_text in PRIMITIVE_SCHEMAS:
        return {'type': PRIMITIVE_SCHEMAS[type_text]}
    if type_text in NUMBER_LISTS:
        return {'type': 'array', 'items': {'type': 'number'}}
    if type_text in STRING_LISTS:
        return {'type': 'array', 'items': {'type': 'string'}}
    values = string_literals(type_text)
    if values:
        return {'type': 'string', 'enum': values}
    if IDENTIFIER.match(type_text):
        return {'type': 'object'}
    stop('%s: no MCP input shape is derived from the type %r -- add the rule '
         'to design-mcp-relay.md 3.1 and here together' % (where, type_text))


def english(cell, where):
    """The English (`en`) of a manuscript cell, its lines joined by newlines.

    Stop when it is missing or empty, holds a character outside ASCII, or
    names a row of the specification (design-mcp-relay.md 3.1, CR-796).

    @purity pure
    """
    lines = cell.get('en') or []
    if isinstance(lines, str):
        lines = [lines]
    text = '\n'.join(line.strip() for line in lines).strip()
    if not text:
        stop('%s has no English (en) text' % where)
    if any(ord(char) > 127 for char in text):
        stop('%s: its English (en) text holds a non-ASCII character: %r' % (where, text))
    found = ROW_ID.search(text)
    if found:
        stop('%s: its English (en) text names the row %s; write it without row ids'
             % (where, found.group(0)))
    return text


def mcp_input_schema(member):
    """The MCP tool input of one member: its arguments, but a member with
    MCP-only keys takes those instead (AG-12 (5)), each with its meaning.

    @purity pure
    """
    keys = member.get('mcpOnlyKeys', member['arguments'])
    properties = {}
    for one in keys:
        schema = mcp_value_schema(one['type'], '%s %s' % (member['id'], one['name']))
        schema['description'] = english(one['meaning'], '%s %s' % (member['id'], one['name']))
        properties[one['name']] = schema
    return {'type': 'object', 'properties': properties}


# ---------------------------------------------------------------- printing

def field_lines(one, indent):
    """@purity pure"""
    if one.get('kind') == 'method':
        return ['%s/** @purity %s */' % (indent, one['purity']),
                '%s%s(): %s' % (indent, one['name'], one['type'])]
    return ['%sreadonly %s: %s' % (indent, one['name'], one['type'])]


def inline_object(fields):
    """@purity pure"""
    return '{ %s }' % '; '.join('readonly %s: %s' % (one['name'], one['type'])
                                for one in fields)


def value_declaration(row):
    """One row of table T-400 as TypeScript.

    @purity pure
    """
    params = row.get('typeParameters')
    name = row['name'] + ('<%s>' % ', '.join(params) if params else '')
    out = ['// see %s' % row['id']]
    if row['shape'] == 'interface':
        base = (' extends %s' % row['extends']) if 'extends' in row else ''
        out.append('export interface %s%s {' % (name, base))
        for one in row['fields']:
            out += field_lines(one, '  ')
        out.append('}')
    elif row['shape'] == 'function':
        args = ', '.join('%s: %s' % (one['name'], one['type']) for one in row['fields'])
        out.append('export type %s = (%s) => %s' % (name, args, row['returns']))
    else:
        out.append('export type %s =' % name)
        for one in row['variants']:
            if 'type' in one:
                out.append('  | %s' % one['type'])
                continue
            shown = '  | %s' % inline_object(one['fields'])
            if len(shown) <= LINE_WIDTH:
                out.append(shown)
                continue
            out.append('  | {')
            out += ['      readonly %s: %s' % (field['name'], field['type'])
                    for field in one['fields']]
            out.append('    }')
    return out


def held_fields(rows):
    """The field-name check of the rows another component declares.

    @purity pure
    """
    if not rows:
        return []
    checks = ['SameFieldNames<%s, %s>' % (row['name'], ' | '.join(
        "'%s'" % one['name'] for one in row['fields'])) for row in rows]
    return [
        '',
        '// see %s' % ', '.join(row['id'] for row in rows),
        '// WHY: declared by their own components; their field names are held against table T-400 here.',
        'type SameFieldNames<TValue, TNames extends PropertyKey> = [keyof TValue] extends [TNames]',
        '  ? ([TNames] extends [keyof TValue] ? true : false)',
        '  : false',
        'const ELSEWHERE_DECLARED_FIELDS_MATCH: [',
    ] + ['  %s,' % one for one in checks] + [
        '] = [%s]' % ', '.join('true' for _ in rows),
        'void ELSEWHERE_DECLARED_FIELDS_MATCH',
    ]


def member_signature(member):
    """@purity pure"""
    if member['kind'] == 'property':
        return ['  readonly %s: %s' % (member['name'], member['returns'])]
    args = ', '.join('%s: %s' % (one['name'], one['type']) for one in member['arguments'])
    return ['  /** @purity %s */' % member['purity'],
            '  %s(%s): %s' % (member['name'], args, member['returns'])]


def page_members(doc):
    """The members the page answers: a row marked `answeredBy: relay` is answered by the relay
    from what it carries and has no member on the page (AG-12 (4), CR-799).

    @purity pure
    """
    return [member for member in doc['members']['rows'] if member.get('answeredBy') != 'relay']


def agent_api_interface(doc):
    """@purity pure"""
    out = ['// see %s' % doc['members']['table']['id'], 'export interface AgentApi {']
    group = None
    for member in page_members(doc):
        if group is not None and member['group']['ja'] != group:
            out.append('')
        group = member['group']['ja']
        out += member_signature(member)
    out.append('}')
    return out


def members_region(doc):
    """The region of agent-api-members.ts.

    @purity pure
    """
    own = [row for row in doc['values']['rows'] if not row.get('declaredElsewhere')]
    elsewhere = [row for row in doc['values']['rows'] if row.get('declaredElsewhere')]
    out = []
    for row in own:
        out += value_declaration(row) + ['']
    out += agent_api_interface(doc)
    out += held_fields(elsewhere)
    out += ['', '// see AM-1, AG-1', "const AGENT_API_VERSION = '%s'" % doc['version']]
    return ('tables %s and %s' % (doc['members']['table']['id'], doc['values']['table']['id']),
            out)


def relayed_region(doc):
    """The region of relayed-call.ts.

    @purity pure
    """
    out = ['// see %s, AG-12' % doc['members']['table']['id'], 'export interface RelayedParams {']
    for member in page_members(doc):
        if 'mcpOnlyKeys' in member:
            out.append('  // WHY: the relay reads %s itself; the page %s.'
                       % (', '.join(one['name'] for one in member['mcpOnlyKeys']),
                          'only subscribes' if member['arguments'] else 'takes no argument'))
            out.append('  %s: {}' % member['name'])
            continue
        params = '; '.join('%s: %s' % (one['name'], one['type']) for one in member['arguments'])
        out.append('  %s: %s' % (member['name'], '{ %s }' % params if params else '{}'))
    out.append('}')
    out += ['', '// WHY: only members with arguments, in their argument order.', 'const MEMBER_PARAMETERS = {']
    for member in page_members(doc):
        if member['arguments'] and 'mcpOnlyKeys' not in member:
            out.append('  %s: [%s],' % (member['name'], ', '.join(
                "'%s'" % one['name'] for one in member['arguments'])))
    out.append('} as const satisfies { readonly [K in ParameterizedMember]: '
               'readonly (keyof RelayedParams[K])[] }')
    return ('table %s' % doc['members']['table']['id'], out)


def relay_server_region(doc):
    """The region of mcp-relay-server.ts: the one member that waits (AG-12 (5))
    and the export members that save (AG-12 (9)), with the extension each writes.

    @purity pure
    """
    keyed = [member for member in doc['members']['rows'] if 'mcpOnlyKeys' in member]
    waiting = [member for member in keyed if len(member['mcpOnlyKeys']) == 1]
    saving = [member for member in keyed if len(member['mcpOnlyKeys']) != 1]
    if len(waiting) != 1:
        stop('the relay waits on exactly one member with one MCP-only key (AG-12 (5)); '
             'the manuscript gives %d member(s)' % len(waiting))
    save_keys = [[one['name'] for one in member['mcpOnlyKeys']] for member in saving]
    if not saving or len(save_keys[0]) != 2 or any(keys != save_keys[0] for keys in save_keys):
        stop('the saving members (AG-12 (9)) must all take the same two MCP-only keys; '
             'the manuscript gives %r' % save_keys)
    extensions = []
    for one in saving:
        found = SAVE_EXTENSION.findall(' '.join(one['carries']['ja']))
        if len(found) != 1:
            stop('%s names %d extension(s) to save with; it must name exactly one' % (one['id'], len(found)))
        extensions.append((one['name'], found[0]))
    member = waiting[0]
    saving_ids = ', '.join(one['id'] for one in saving)
    return ('table %s, the MCP-only keys of %s and %s'
            % (doc['members']['table']['id'], member['id'], saving_ids), [
        '// see %s, AG-12' % member['id'],
        "const WATCH_CHANGES = '%s'" % member['name'],
        "const WAIT_MS_KEY = '%s'" % member['mcpOnlyKeys'][0]['name'],
        '// see %s, AG-12' % saving_ids,
        "const FILE_NAME_KEY = '%s'" % save_keys[0][0],
        "const OVERWRITE_KEY = '%s'" % save_keys[0][1],
        'const SAVED_EXTENSION_OF: Readonly<Record<string, string>> = {',
    ] + ["  %s: '%s'," % one for one in extensions] + ['}'])


UNITS = [
    (REL_MEMBERS, members_region),
    (REL_RELAYED, relayed_region),
    (REL_RELAY_SERVER, relay_server_region),
]


def rewritten(rel, text, region):
    """The unit with its region replaced, or stop when it has none or two.

    @purity pure
    """
    what, lines = region
    pattern = re.compile(re.escape(OPEN) + r'\n' + re.escape(HEADER_PREFIX)
                         + r'[^\n]*\n.*?' + re.escape(CLOSE), re.S)
    found = pattern.findall(text)
    if len(found) != 1:
        stop('%s holds %d region(s) naming %s; it must hold exactly one'
             % (rel, len(found), REL_SOURCE))
    body = '\n'.join([OPEN, HEADER % what] + lines + [CLOSE])
    return pattern.sub(lambda _match: body, text, count=1)


def main():
    """Write the regions, or say whether the units on disk still match.

    @purity non-pure
    """
    doc = load()
    drifted = []
    for rel, region_of in UNITS:
        text = io.open(path_of(rel), encoding='utf-8', newline='').read()
        built = rewritten(rel, text, region_of(doc))
        if built == text:
            continue
        if '--check' in sys.argv:
            drifted.append(rel)
        else:
            io.open(path_of(rel), 'w', encoding='utf-8', newline='').write(built)
            say('wrote the region of %s' % rel)
    if drifted:
        for rel in drifted:
            say('PROBLEM  the region of %s has drifted from %s -- run `python %s`'
                % (rel, REL_SOURCE, REL_SELF))
        return 1
    say('OK       %d unit region(s) match %s (%d members, %d value types)'
        % (len(UNITS), REL_SOURCE, len(doc['members']['rows']), len(doc['values']['rows'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
