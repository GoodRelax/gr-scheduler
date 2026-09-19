# -*- coding: utf-8 -*-
"""PostToolUse hook: check the one file Claude just wrote, and tell, not stop.

Ruling JDG-59 (docs/development-records/refactor-plan-report-2026-09-13.md,
record 11) puts a layer right after writing: the file just edited is checked
alone and what is wrong is handed back to the model, which fixes it. The gate
that stops is still `guard:commit` (check.sh); this hook never replaces it.

WHAT IT CHECKS
  src/**/*.ts, tests/**/*.ts
      check-comment-rules.py --file <path>. A path that tool refuses as "not
      a .ts file under src/" passes in silence: tests/ is being added to it
      separately, and until then there is nothing to say.
  docs/spec/_source/<file>
      every generator --check that reads that file, from GENERATORS below
      (the one table; it follows the gen:check chain of package.json).
  a generated file named in ARTIFACT_GENERATORS
      that generator's --check (a hand edit of the MSPDI child order).
  anything else
      nothing.

HOW IT TELLS
  exit 2 with the findings on stderr. On PostToolUse the tool has already
  run, so exit 2 does not undo or block the edit; it only shows the text to
  the model. exit 0 with nothing printed means nothing was found.
  When the hook itself cannot run (a tool missing, Python failing), it says
  so in one line the same way, so a silent hook is never read as a clean file.

WHERE IT RUNS
  $CLAUDE_PROJECT_DIR stays at the main checkout even for an agent working in
  .claude/worktrees/<name>, so the root is found from the edited file: the
  nearest folder holding .git, which must be this checkout or one of its
  worktrees. A path outside both passes in silence.

NOT SEEN
  Edits made through Bash (sed, python, redirects) fire no PostToolUse on a
  file path, so they are never checked here; the commit gate catches them.
"""
import io
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

HOOK_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))
COMMENT_TOOL = '.claude/skills/spec-graph-check/check-comment-rules.py'
NOT_UNDER_SRC = 'is not a .ts file under src/'
TIMEOUT = 25
SHOWN_LINES = 30

# Manuscript (or generated file) in docs/spec/_source/ -> the generators whose
# --check reads it. Taken from the gen:check chain of package.json and from
# the input paths each generator opens. A .drawio has no entry: build.py
# --check does not rebuild the figures.
SETTINGS_MD = 'docs/spec/_source/settings_json_to_md.py'
ERD_MD = 'docs/spec/_source/erd_json_to_md.py'
ERD_SCHEMA = 'docs/spec/_source/erd_json_to_schema.py'
ITEMS_MD = 'docs/spec/_source/property_items_json_to_md.py'
PREFIXES_MD = 'docs/spec/_source/row_id_prefixes_json_to_md.py'
COMPONENTS = 'docs/spec/_source/build.py'
TYPES = 'tools/generate_entity_types.py'
VALIDATOR = 'tools/generate_json_schema_validator.py'
STARTUP = 'tools/generate_startup_template.py'
ICONS = 'tools/generate_icon_roster.py'
PROPITEMS = 'tools/generate_property_items.py'
WORDS = 'tools/generate_display_words.py'
MSPDI = 'tools/generate_mspdi_custom_fields.py'
MSPDI_ORDER = 'tools/generate_mspdi_child_order.py'

GENERATORS = {
    'settings.json': [SETTINGS_MD, ERD_SCHEMA, TYPES, STARTUP],
    'settings.schema.json': [SETTINGS_MD],
    'erd.json': [ERD_MD, ERD_SCHEMA, SETTINGS_MD, TYPES, ICONS, STARTUP],
    'erd.schema.json': [ERD_MD],
    'grs-document.schema.json': [ERD_SCHEMA, VALIDATOR, TYPES, STARTUP],
    'property-items.json': [ITEMS_MD, PROPITEMS],
    'row-id-prefixes.json': [PREFIXES_MD],
    'components.json': [COMPONENTS],
    'overview.json': [COMPONENTS],
    'display-words.json': [WORDS],
    'mspdi-custom-fields.json': [MSPDI],
    'mspdi-custom-fields.schema.json': [MSPDI],
    'settings_json_to_md.py': [SETTINGS_MD],
    'erd_json_to_md.py': [ERD_MD],
    'erd_json_to_schema.py': [ERD_SCHEMA],
    'property_items_json_to_md.py': [ITEMS_MD],
    'row_id_prefixes_json_to_md.py': [PREFIXES_MD],
    'build.py': [COMPONENTS],
}

# Generated file outside docs/spec/_source/ -> the generator whose --check
# holds it. Only an artifact whose manuscript no clone holds belongs here: the
# MSPDI child order is made from the git-ignored pj15 XSD, so its own
# bodySha256 (JDG-251) is the one thing that can catch a hand edit.
ARTIFACT_GENERATORS = {
    'src/adapter/document-codec/mspdi-child-order.json': [MSPDI_ORDER],
}


def tell(lines):
    """Hand the lines to the model: stderr and exit 2 (PostToolUse)."""
    text = '\n'.join(lines) + '\n'
    sys.stderr.buffer.write(text.encode('utf-8', 'replace'))
    sys.stderr.flush()
    return 2


def could_not_run(why):
    return tell(['check-after-edit hook could not run: %s' % why])


def repo_root_of(path):
    """The checkout holding path: this one or one of its worktrees, else None."""
    worktrees = os.path.normcase(os.path.join(HOOK_ROOT, '.claude', 'worktrees'))
    here = os.path.dirname(path)
    while True:
        if os.path.exists(os.path.join(here, '.git')):
            if os.path.normcase(here) == os.path.normcase(HOOK_ROOT):
                return here
            if os.path.normcase(os.path.dirname(here)) == worktrees:
                return here
            return None
        parent = os.path.dirname(here)
        if parent == here:
            return None
        here = parent


def run(root, argv):
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    done = subprocess.run([sys.executable] + argv, cwd=root, env=env,
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                          timeout=TIMEOUT)
    return done.returncode, done.stdout.decode('utf-8', 'replace')


def first_int(line):
    for token in line.split():
        if token.isdigit():
            return int(token)
    return None


def check_comments(root, rel):
    if not os.path.exists(os.path.join(root, COMMENT_TOOL)):
        return could_not_run('%s is missing' % COMMENT_TOOL)
    code, out = run(root, [COMMENT_TOOL, '--file', rel])
    lines = [line for line in out.splitlines() if line.strip()]
    if code != 0:
        if NOT_UNDER_SRC in out:
            return 0
        return could_not_run('%s exited %d: %s'
                             % (COMMENT_TOOL, code, ' '.join(lines)[:200]))
    if len(lines) < 2:
        return could_not_run('%s printed no row for %s' % (COMMENT_TOOL, rel))
    held = first_int(lines[1])
    if not held:
        return 0
    return tell(['Comment rules (ruling 17, docs/review/comment-rules-src.md) '
                 'in %s just written: %s finding(s). Fix the comments; '
                 'check.sh gates the same count at commit.'
                 % (rel, held)] + lines[:SHOWN_LINES])


def check_generators(root, rel, generators):
    missing = [g for g in generators if not os.path.exists(os.path.join(root, g))]
    if missing:
        return could_not_run('generator missing: %s' % ', '.join(missing))
    with ThreadPoolExecutor(max_workers=len(generators)) as pool:
        results = list(pool.map(lambda g: (g, run(root, [g, '--check'])),
                                generators))
    report = []
    for generator, (code, out) in results:
        if code == 0:
            continue
        shown = [line for line in out.splitlines()
                 if line.strip() and not line.startswith('OK ')]
        report.append('%s --check exited %d:' % (generator, code))
        report.extend('  ' + line for line in shown[:SHOWN_LINES])
    if not report:
        return 0
    return tell(['%s was just written and its generated output no longer '
                 'matches (the gen:check chain of package.json). Regenerate '
                 'or fix the manuscript:' % rel] + report)


def main():
    try:
        data = json.load(io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8'))
    except ValueError:
        return could_not_run('stdin was not JSON')
    tool_input = data.get('tool_input') or {}
    path = tool_input.get('file_path')
    if not path:
        return 0
    if not os.path.isabs(path):
        path = os.path.join(data.get('cwd') or HOOK_ROOT, path)
    path = os.path.abspath(path)
    root = repo_root_of(path)
    if root is None:
        return 0
    rel = os.path.relpath(path, root).replace(os.sep, '/')

    if (rel.startswith('src/') or rel.startswith('tests/')) and rel.endswith('.ts'):
        return check_comments(root, rel)
    if rel.startswith('docs/spec/_source/') and rel.count('/') == 3:
        generators = GENERATORS.get(rel.rsplit('/', 1)[1])
        if generators:
            return check_generators(root, rel, generators)
    if rel in ARTIFACT_GENERATORS:
        return check_generators(root, rel, ARTIFACT_GENERATORS[rel])
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except subprocess.TimeoutExpired as error:
        sys.exit(could_not_run('a check took over %ds: %s' % (TIMEOUT, error.cmd)))
    except Exception as error:  # the hook must never stop the work
        sys.exit(could_not_run('%s: %s' % (type(error).__name__, error)))
