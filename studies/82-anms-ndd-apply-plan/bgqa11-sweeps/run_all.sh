#!/usr/bin/env bash
# Re-run every BGQA11 round-2 sweep (CR-857; JDG-3901..3908) from the repository root.
# Safe to run again: each step rewrites only text that still holds a former word.
# BOSS 2026-11-27: a merge conflict in the spec is solved by taking the other side
# and running this again, never by mixing by hand. Then: npm run gen, the tests.
set -e
export PYTHONIOENCODING=utf-8
D=studies/82-anms-ndd-apply-plan/bgqa11-sweeps
SPEC="docs/spec/01-04-requirements.md docs/spec/05-07-design.md docs/spec/A-appendix.md docs/spec/08-10-test.md docs/spec/_assets/design-mcp-relay.md"
SOURCES=$(ls docs/spec/_source/*.json docs/spec/_source/*.md | grep -v 'schema.json')
# 1. names (glossary.json renames[], the tool)
python $D/reapply_cr855_renames.py
python tools/apply_glossary_renames.py apply
# 2. Retract is 格納 (JDG-3907)
python $D/sweep_retract_ja.py --write $SPEC $SOURCES > /dev/null
git ls-files 'tests/*.ts' | xargs -n 200 python $D/sweep_retract_ja.py --write > /dev/null
python $D/sweep_retract_ja_requirements.py --write docs/spec/01-04-requirements.md > /dev/null
git ls-files 'tests/*.ts' | xargs -n 200 python $D/sweep_retract_ja_requirements.py --write > /dev/null
# 3. the check filter is 日程抽出 (JDG-3908)
python $D/sweep_schedule_filter_ja.py --write $SPEC $SOURCES > /dev/null
git ls-files 'tests/*.ts' | xargs -n 200 python $D/sweep_schedule_filter_ja.py --write > /dev/null
# 4. fixed hand rewrites (U-10 Cursor and the narrowing sentences)
python $D/hand_requirements.py
git ls-files 'tests/*.ts' | xargs -n 200 python $D/hand_requirements.py > /dev/null
# 5. test quotes the sweeps cannot reach, and the tool's one false hit
python $D/hand_tests.py
echo "OK       sweeps done; next: npm run gen, tsc, the tests that quote the spec"
