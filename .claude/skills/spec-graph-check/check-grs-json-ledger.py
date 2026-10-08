# -*- coding: utf-8 -*-
"""Check 76: the GRS JSON format version, its change ledger and its address.

CR-699 (JDG-1677, JDG-1678, JDG-1693, DFC-2230). Four things, each one a
sentence of FR-073 or Chapter 6.2 that prose alone would not keep:

  1. SCHEMA_VERSION in tools/generate_startup_template.py is an RFC 3339 UTC
     instant, YYYY-MM-DDTHH:MM:SSZ (20 characters, no fraction, zone Z).
  2. docs/spec/_source/grs-json-changes.json passes its contract
     (grs-json-changes.schema.json); its elements are in ascending version
     order and none is newer than SCHEMA_VERSION.
  3. S-541 of table T-206 (the version official use began with) gates the
     ledger: while it is null the ledger is empty; once it is set, a
     SCHEMA_VERSION newer than it needs at least one element of that version,
     and every element is newer than it. A removed / renamed column is gone
     from erd.json (or the presentation keys), an added column and a renamed
     column's new name are there.
  4. S-540 (the schema's address) resolves on the published site: it is the
     site root followed by a path under docs/ that IS the generated schema,
     the site root is S-350's address minus its last segment (the download
     page, docs/download/), the Pages workflow still copies docs/ whole, and
     the generated schema's $id is S-540. An address that 404s (DFC-2230)
     fails here, offline.

--self-test feeds a broken version, a ledger row before declaration, a missing
row after declaration and an address outside docs/, and is red unless each is
reported, and a clean set reports none.

Run with PYTHONIOENCODING=utf-8. No baseline: 0.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
REL_STARTUP = 'tools/generate_startup_template.py'
REL_LEDGER = 'docs/spec/_source/grs-json-changes.json'
REL_CONTRACT = 'docs/spec/_source/grs-json-changes.schema.json'
REL_SETTINGS = 'docs/spec/_source/settings.json'
REL_ERD = 'docs/spec/_source/erd.json'
REL_SCHEMA = 'docs/spec/_source/grs-document.schema.json'
REL_PAGES = '.github/workflows/pages.yml'
PAGES_COPY = 'cp -r docs/. _site/'
VERSION_SHAPE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
PRESENTATION = 'documentSettings'


def path(rel):
    return os.path.join(ROOT, *rel.split('/'))


def load(rel):
    return json.load(io.open(path(rel), encoding='utf-8'))


def schema_version(text):
    found = re.findall(r"^SCHEMA_VERSION = '([^']*)'$", text, re.M)
    return found[0] if len(found) == 1 else None


def t206(settings):
    for block in settings['blocks']:
        if block.get('id') == 'T-206':
            return dict((row['id'], row) for row in block['rows'])
    return {}


def address_of(row):
    spoken = ((row or {}).get('default') or {}).get('ja', '')
    span = re.match(r'^`([^`]+)`$', spoken.strip())
    return span.group(1) if span else None


def declared_of(row):
    cell = (row or {}).get('default') or {}
    if cell.get('lit') == 'null':
        return None
    return address_of(row) or cell.get('lit')


def columns_now(erd, settings):
    have = set()
    for entity in erd['entities']:
        for column in entity['columns']:
            have.add((entity['name'], column['name']))
    for block in settings['blocks']:
        if block.get('id') in ('T-202', 'T-203'):
            for row in block['rows']:
                key = (row.get('key') or '').strip('`').split('.')[0]
                if key:
                    have.add((PRESENTATION, key))
    return have


def version_problems(version):
    if version is None:
        return ['%s: no single SCHEMA_VERSION line' % REL_STARTUP]
    if not VERSION_SHAPE.match(version):
        return ['%s: SCHEMA_VERSION %r is not YYYY-MM-DDTHH:MM:SSZ (FR-073)'
                % (REL_STARTUP, version)]
    return []


def ledger_problems(ledger, contract, version, declared, have):
    problems = []
    try:
        import jsonschema  # noqa: PLC0415
        for error in jsonschema.Draft202012Validator(contract).iter_errors(ledger):
            problems.append('%s: %s at /%s' % (
                REL_LEDGER, error.message, '/'.join(str(p) for p in error.path)))
    except ImportError:
        problems.append('jsonschema is not installed, so %s went unchecked' % REL_LEDGER)
    changes = ledger.get('changes') if isinstance(ledger, dict) else None
    if not isinstance(changes, list):
        return problems + ['%s: no "changes" array' % REL_LEDGER]
    versions = [c.get('version', '') for c in changes if isinstance(c, dict)]
    if versions != sorted(versions):
        problems.append('%s: elements are not in ascending version order' % REL_LEDGER)
    if version and any(v > version for v in versions):
        problems.append('%s: an element is newer than SCHEMA_VERSION %s' % (REL_LEDGER, version))
    if declared is None:
        if changes:
            problems.append('%s: %d element(s) while S-541 is null -- the ledger stays '
                            'empty until official use is declared (FR-073)'
                            % (REL_LEDGER, len(changes)))
        return problems
    if not VERSION_SHAPE.match(declared):
        problems.append('S-541 %r is not YYYY-MM-DDTHH:MM:SSZ (FR-073)' % declared)
    if any(v <= declared for v in versions):
        problems.append('%s: an element is not newer than S-541 %s' % (REL_LEDGER, declared))
    if version and version > declared and version not in versions:
        problems.append('%s: SCHEMA_VERSION %s is newer than S-541 %s but no element '
                        'carries it (FR-073)' % (REL_LEDGER, version, declared))
    for change in changes:
        if not isinstance(change, dict):
            continue
        entity, column, kind = change.get('entity'), change.get('column'), change.get('kind')
        if kind in ('removed', 'renamed') and (entity, column) in have:
            problems.append('%s: %s %s.%s is still a column' % (REL_LEDGER, kind, entity, column))
        if kind == 'added' and (entity, column) not in have:
            problems.append('%s: added %s.%s is no column' % (REL_LEDGER, entity, column))
        if kind == 'renamed' and (entity, change.get('to')) not in have:
            problems.append('%s: renamed to %s.%s, which is no column'
                            % (REL_LEDGER, entity, change.get('to')))
    return problems


def address_problems(address, download, schema_id, pages_text, exists):
    if not address:
        return ['S-540 holds no address in a whole-cell code span']
    if not download or '/' not in download.rstrip('/'):
        return ['S-350 holds no address to take the site root from']
    site = download.rstrip('/').rsplit('/', 1)[0] + '/'
    problems = []
    if not exists('docs/' + download.rstrip('/')[len(site):] + '/index.html'):
        problems.append('S-350 %s is not served from docs/ -- the site root %s is '
                        'not where docs/ lands' % (download, site))
    if not address.startswith(site):
        problems.append('S-540 %s is not on the published site %s' % (address, site))
    elif 'docs/' + address[len(site):] != REL_SCHEMA:
        problems.append('S-540 %s serves docs/%s, not the generated schema %s'
                        % (address, address[len(site):], REL_SCHEMA))
    if PAGES_COPY not in pages_text:
        problems.append('%s no longer copies docs/ whole (%r), so S-540 would 404'
                        % (REL_PAGES, PAGES_COPY))
    if schema_id != address:
        problems.append('%s: $id %r is not S-540 %r -- run npm run gen'
                        % (REL_SCHEMA, schema_id, address))
    return problems


def measure():
    settings = load(REL_SETTINGS)
    rows = t206(settings)
    version = schema_version(io.open(path(REL_STARTUP), encoding='utf-8').read())
    problems = version_problems(version)
    problems += ledger_problems(load(REL_LEDGER), load(REL_CONTRACT), version,
                                declared_of(rows.get('S-541')),
                                columns_now(load(REL_ERD), settings))
    problems += address_problems(address_of(rows.get('S-540')),
                                 address_of(rows.get('S-350')),
                                 load(REL_SCHEMA).get('$id'),
                                 io.open(path(REL_PAGES), encoding='utf-8').read(),
                                 lambda rel: os.path.exists(path(rel)))
    return problems


def self_test():
    contract = load(REL_CONTRACT)
    have = {('Task', 'name'), ('Task', 'title')}
    site = 'https://example.test/app/'
    exists = lambda rel: rel in ('docs/download/index.html',)
    pages = 'run: ' + PAGES_COPY
    clean_id = site + REL_SCHEMA[len('docs/'):]
    cases = [
        ('a version without seconds', version_problems('2026-10-08T03:13Z'), True),
        ('a version as a date', version_problems('2026-10-08'), True),
        ('a clean version', version_problems('2026-10-08T03:13:21Z'), False),
        ('a row before declaration', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': [
                {'version': '2026-10-08T03:13:21Z', 'kind': 'removed',
                 'entity': 'Task', 'column': 'gone'}]},
            contract, '2026-10-08T03:13:21Z', None, have), True),
        ('no row for a version after declaration', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': []},
            contract, '2026-12-01T00:00:00Z', '2026-11-01T00:00:00Z', have), True),
        ('a removed column still present', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': [
                {'version': '2026-12-01T00:00:00Z', 'kind': 'removed',
                 'entity': 'Task', 'column': 'name'}]},
            contract, '2026-12-01T00:00:00Z', '2026-11-01T00:00:00Z', have), True),
        ('a renamed row without to', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': [
                {'version': '2026-12-01T00:00:00Z', 'kind': 'renamed',
                 'entity': 'Task', 'column': 'label'}]},
            contract, '2026-12-01T00:00:00Z', '2026-11-01T00:00:00Z', have), True),
        ('a clean declared ledger', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': [
                {'version': '2026-12-01T00:00:00Z', 'kind': 'renamed',
                 'entity': 'Task', 'column': 'label', 'to': 'title'}]},
            contract, '2026-12-01T00:00:00Z', '2026-11-01T00:00:00Z', have), False),
        ('a clean empty ledger', ledger_problems(
            {'$schema': 'x', '$comment': ['x'], 'changes': []},
            contract, '2026-10-08T03:13:21Z', None, have), False),
        ('an address outside docs/ (DFC-2230)', address_problems(
            'https://github.com/owner/app/docs/spec/_source/grs-document.schema.json',
            site + 'download', clean_id, pages, exists), True),
        ('an address to another file', address_problems(
            site + 'spec/_source/erd.json', site + 'download', clean_id, pages, exists), True),
        ('a workflow that stopped copying docs/', address_problems(
            clean_id, site + 'download', clean_id, 'run: true', exists), True),
        ('a clean address', address_problems(
            clean_id, site + 'download', clean_id, pages, exists), False),
    ]
    wrong = 0
    for name, got, should_fail in cases:
        if bool(got) != should_fail:
            wrong += 1
            sys.stdout.write('  self-test: %s -> %r\n' % (name, got))
    if wrong:
        sys.stdout.write('FAIL     self-test: %d of %d case(s) answered wrongly\n'
                         % (wrong, len(cases)))
        return 1
    sys.stdout.write('OK       self-test: %d cases answered as expected\n' % len(cases))
    return 0


def main():
    if '--self-test' in sys.argv:
        return self_test()
    problems = measure()
    for p in problems:
        sys.stdout.write('  %s\n' % p)
    if problems:
        sys.stdout.write('FAIL     %d problem(s) in the GRS JSON version, ledger or '
                         'address\n' % len(problems))
        return 1
    sys.stdout.write('OK       the format version is an instant, the change ledger '
                     'obeys S-541, and S-540 is the published schema\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
