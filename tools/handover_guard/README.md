# Handover guard

Hand over before an unintended compaction, and keep the coordinator and its
child sessions in step. Rulings JDG-3040..3042 (2026-10-22); names as in
`docs/development-rules/session-names.md`.

## Parts

| Part | Command | What it does |
|---|---|---|
| Usage bridge | `guard.py statusline` (statusLine) | Writes `context_window.used_percentage` to `<state>/usage/<session_id>.json`. |
| Usage fallback | (inside every hook) | No usage file: reads the last assistant usage in the transcript (input + cache creation + cache read). |
| 85% notice | `guard.py hook post-tool-use` (PostToolUse) | Over 85% used or under 60k left: "hand over now" on every tool call until the session has handed over. |
| Hold back compaction | `guard.py hook pre-compact` (PreCompact) | `auto` and not handed over since the notice: exit 2. `manual`, unknown usage, or at/above the 95% ceiling: pass. |
| Save the summary | `guard.py hook post-compact` (PostCompact) | Saves `compact_summary` to `<state>/compact/`; starts a new notice cycle. |
| Re-inject | `guard.py hook session-start` (SessionStart) | After `compact`: the handoff note's newest section, the registry, and "tell your parent and children again". On any start: unacked children / a new parent. |
| Session registry | `guard.py registry ...` | Coordinator, children, state, ID bands, branch, next steps; acks; Session complete. |
| Handoff check | `guard.py check-handoff [--no-registry]` | Newest dated section, the first-message heading, every live child named. Check 88 runs the structural part. |
| Scenario test | `self_test.py [--keep DIR]` | 23 scenarios at a 5% threshold in a temp folder. Check 88 runs it. |

"Handed over": the coordinator's handoff note was written after the notice and
passes `check-handoff`; a child ran `registry note` (or `registry complete`)
after the notice.

## State

`<git-common-dir>/session-registry/` -- inside `.git/`, so it is shared by the
root checkout and every worktree, and git never tracks it. Override with
`GRS_GUARD_STATE_DIR`. `events.jsonl` there logs every decision.

Settings (`guard.py config <key> <value>`, or the environment): `warn_pct` 85
(`GRS_GUARD_WARN_PCT`), `warn_remaining` 60000, `ceiling_pct` 95,
`window_size` 0 (`GRS_GUARD_WINDOW`; 0 = from the status line, else guessed),
`handoff_path`.

## Measured facts (2026-10-22, Claude desktop app, Code tab)

- The desktop app did not run the project `statusLine` command: with it in
  `.claude/settings.json` for about 25 turns, no usage file appeared. The bridge
  therefore relies on the transcript fallback there.
- The transcript does not carry the window size. The guess: `window_size`
  setting, then `[1m]` in the model id, then 1M once usage is past the
  auto-compact line of a 200k window, else 200k. Set `window_size` when known.
- The desktop app sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80`, so automatic
  compaction comes BEFORE the 85% notice. The PreCompact hold-back is what lets
  the notice happen: until the session has handed over, `auto` is held back
  (below the ceiling).
- Each session knows its own ids: `CLAUDE_CODE_SESSION_ID` (the hook
  `session_id`) and `CLAUDE_CODE_HOST_SESSION_ID` (the `local_...` id that
  SendMessage takes; the registry key).

## Enable in this repository

The user merges `settings-hooks.json` into `.claude/settings.json` (the hook
entries beside the existing ones). A session cannot do it itself: the auto mode
classifier refuses an edit of its own hooks ("Self-Modification").

## Plugin draft (for other projects)

`plugin/` holds the manifest and `hooks/hooks.json`. To build it, copy the
Python files of this folder into `plugin/scripts/`:

    plugin/
      .claude-plugin/plugin.json
      hooks/hooks.json        # commands call ${CLAUDE_PLUGIN_ROOT}/scripts/guard.py
      scripts/*.py            # common, usage, registry, handoff_check, hooks, guard

The user installs it (it lands under `~/.claude`, outside the repository), for
example from a local marketplace folder with `/plugin`. A plugin cannot set
`statusLine` (only `agent` and `subagentStatusLine` take effect), so the bridge
line is added to the user's own settings by hand if wanted. Before other
projects use it, make the required headings of `check-handoff` a setting (they
are this repository's today).
