# -*- coding: utf-8 -*-
u"""Check 75 -- the hand-written guide docs/guides/schedule-to-grs-json/ still
yields a document the GRS JSON schema accepts.

WHY THIS EXISTS. DFC-1790: the guide's base document grs-skeleton.json had
fallen two required keys behind the schema (Project.sourceFormat,
TaskGroup.editGroup), and both prompts told the AI to write
TaskVisual.lineWeight -- a key the schema rejects (additionalProperties is
false) since strokeWidthPx replaced it. Nothing generates the guide, so
`npm run gen:check` never saw the drift; an app user following it got a
document GRS refuses to open.

WHAT IT CHECKS, against docs/spec/_source/grs-document.schema.json
(Draft 2020-12):
  1. grs-skeleton.json validates with 0 errors.
  2. In each of prompt-ja.md and prompt-en.md, the worked example (the first
     ```json fence) merged into the skeleton -- its keys replace those of
     `schedule`, and project.uidHighWaterMark becomes the largest uid it
     holds -- validates with 0 errors.
  3. Inside each prompt block (the ````text fence):
     a. every quoted key ("name": ...) and every camelCase word is a name
        the schema defines somewhere (a property at any depth, a $defs
        name, an enum value) or a JSON Schema keyword -- so a retired key
        such as lineWeight is red;
     b. every key the line naming `schedule.project` lists is a Project
        property;
     c. every key TaskVisual or TaskGroup REQUIRES appears in the block as
        a whole word -- the AI writes those objects from scratch, so a key
        the prompt never names is a key the AI leaves out.
     Project's required keys are not asked of the prompt: the prompt has
     the AI copy them from the skeleton, which step 1 already validates.

WHAT IT DOES NOT SEE. What the prose says about values (a color form,
a range, "is null" for a key whose type does not allow null); a lowercase
single-word key written in prose without quotes (it is only caught when it
displaces a required key, as `height` for minHeight would); whether ja and
en say the same thing; the document invariants outside the schema (the IV-
rows of 05-07-design.md section 6.1); the in-app prompt
src/adapter/screen-renderer/image-to-grs-json-prompt.json, which
`npm run gen:check` guards.

Usage:
    python check-guide-grs-json.py [repo-root] [--self-test]

`--self-test` feeds an in-memory skeleton missing Project.sourceFormat and
an in-memory prompt naming lineWeight and omitting editGroup, and is red
unless all three are reported; then a clean pair, which must report none.
The clean pair is built on the real grs-skeleton.json, so a drifted skeleton
reddens the self-test as well as the run.
"""
import copy
import io
import json
import os
import re
import sys

import jsonschema

GUIDE = 'docs/guides/schedule-to-grs-json'
SCHEMA = 'docs/spec/_source/grs-document.schema.json'
PROMPTS = ('prompt-ja.md', 'prompt-en.md')
FROM_SCRATCH = ('TaskVisual', 'TaskGroup')
SCHEMA_KEYWORDS = {'additionalProperties'}

WORD = r'(?<![A-Za-z0-9_])%s(?![A-Za-z0-9_])'
CAMEL = re.compile(WORD % r'([a-z]+(?:[A-Z][a-z0-9]*)+)')
QUOTED_KEY = re.compile(r'"([A-Za-z][A-Za-z0-9]*)"\s*:')
IDENT = re.compile(WORD % r'([a-z][A-Za-z0-9]*)')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def schema_names(schema):
    """Every name the schema defines: properties at any depth, $defs names,
    string enum values."""
    names = set(schema.get('$defs', {}))
    stack = [schema]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            props = node.get('properties')
            if isinstance(props, dict):
                names.update(props)
            for value in node.get('enum', []) or []:
                if isinstance(value, str):
                    names.add(value)
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    return names


def validate(schema, doc):
    v = jsonschema.Draft202012Validator(schema)
    return ['%s %s' % ('/'.join(str(p) for p in e.absolute_path), e.message[:140])
            for e in v.iter_errors(doc)]


def max_uid(node):
    best = 0
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'uid' and isinstance(value, int):
                best = max(best, value)
            best = max(best, max_uid(value))
    elif isinstance(node, list):
        for value in node:
            best = max(best, max_uid(value))
    return best


def check_prompt(name, text, schema, skeleton):
    """[problem] for one prompt file's text."""
    problems = []
    text = text.replace('\r\n', '\n')
    block = re.search(r'````text\n(.*?)\n````', text, re.S)
    if not block:
        return ['%s: no ````text prompt block' % name]
    body = block.group(1)
    known = schema_names(schema) | SCHEMA_KEYWORDS
    named = set(CAMEL.findall(body)) | set(QUOTED_KEY.findall(body))
    for word in sorted(named - known):
        problems.append('%s: the prompt names `%s`, which the schema does '
                        'not define' % (name, word))
    project_props = set(schema['$defs']['Project']['properties'])
    for line in body.split('\n'):
        at = line.find('schedule.project')
        if at < 0:
            continue
        tail = line[at + len('schedule.project'):]
        for word in IDENT.findall(tail):
            if word not in project_props:
                problems.append('%s: the schedule.project list names `%s`, '
                                'which Project does not define' % (name, word))
        break
    else:
        problems.append('%s: no line names schedule.project' % name)
    words = set(IDENT.findall(body))
    for entity in FROM_SCRATCH:
        for key in schema['$defs'][entity]['required']:
            if key not in words:
                problems.append('%s: %s requires `%s`, which the prompt never '
                                'names' % (name, entity, key))
    example = re.search(r'```json\n(.*?)\n```', text, re.S)
    if not example:
        problems.append('%s: no ```json worked example' % name)
        return problems
    try:
        fragment = json.loads(example.group(1))
    except ValueError as err:
        problems.append('%s: the worked example is not JSON: %s' % (name, err))
        return problems
    doc = copy.deepcopy(skeleton)
    doc['schedule'].update(fragment)
    doc['schedule']['project']['uidHighWaterMark'] = max_uid(fragment)
    for err in validate(schema, doc):
        problems.append('%s: worked example in the skeleton: %s' % (name, err))
    return problems


def run(schema, skeleton, prompts):
    problems = ['grs-skeleton.json: %s' % e for e in validate(schema, skeleton)]
    for name, text in prompts:
        problems.extend(check_prompt(name, text, schema, skeleton))
    return problems


def self_test(schema, skeleton):
    broken = copy.deepcopy(skeleton)
    broken['schedule']['project'].pop('sourceFormat', None)
    visual = ('"taskUid": 1, "shapeKind": "rectangle", "milestoneGlyph": null, '
              '"fillColor": null, "strokeColor": null')
    group = ('"id": "00000000-0000-4000-8000-000000000002", "parentId": null, '
             '"label": "R", "derivedFromTaskUid": null, "order": 0, '
             '"treeState": "auto", "color": null, "minHeight": null')
    prose = ('- schedule.project: name / themeHue\n'
             'id parentId label derivedFromTaskUid order treeState color minHeight\n'
             'taskUid shapeKind milestoneGlyph fillColor strokeColor\n')

    def prompt(extra_prose, extra_group):
        return ('````text\n%s%s\n````\n```json\n{"taskGroups": [{%s%s}], '
                '"taskVisuals": [], "taskGroupMembers": [], "tasks": []}\n```\n'
                % (prose, extra_prose, group, extra_group))

    bad = prompt('{%s, "lineWeight": null}' % visual, '')
    got_bad = run(schema, broken, [('bad', bad)])
    want = ['sourceFormat', 'lineWeight', 'editGroup']
    caught = [w for w in want if any(w in p for p in got_bad)]
    good = prompt('{%s, "strokeWidthPx": null} editGroup' % visual,
                  ', "editGroup": null')
    got_good = run(schema, skeleton, [('good', good)])
    ok = len(caught) == len(want) and not got_good
    say(u'%s  self-test: the broken pair reported %d of %d (%s); the clean '
        u'pair reported %d (want 0)%s'
        % (u'OK      ' if ok else u'PROBLEM ', len(caught), len(want),
           ', '.join(want), len(got_good),
           '' if not got_good else ': ' + '; '.join(got_good[:3])))
    return 0 if ok else 1


def main(argv):
    positional = [a for a in argv[1:] if not a.startswith('--')]
    root = positional[0] if positional else '.'
    schema = json.load(io.open(os.path.join(root, SCHEMA), encoding='utf-8'))
    skeleton = json.load(io.open(os.path.join(root, GUIDE, 'grs-skeleton.json'),
                                 encoding='utf-8'))
    if '--self-test' in argv:
        return self_test(schema, skeleton)
    prompts = [(p, io.open(os.path.join(root, GUIDE, p), encoding='utf-8').read())
               for p in PROMPTS]
    problems = run(schema, skeleton, prompts)
    if problems:
        say(u'FAIL     %d place(s) where docs/guides/schedule-to-grs-json/ '
            u'has drifted from the GRS JSON schema (DFC-1790):' % len(problems))
        for p in problems[:40]:
            say(u'         ' + p)
        return 1
    say(u'OK       grs-skeleton.json and the worked examples of %d prompts '
        u'validate; every key the prompts name is in the schema, and every '
        u'key TaskVisual / TaskGroup require is named' % len(prompts))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
