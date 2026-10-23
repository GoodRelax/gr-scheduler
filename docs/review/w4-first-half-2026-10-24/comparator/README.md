# Comparator kit for CR-578 / CR-579 / CR-580 (status: PAUSED, 2026-10-24)

Built from the pre-split tree `d0ae3a9c8` only. Work stopped on the coordinator's pause; this file
says what is finished and what is not.

## How to run

    node <kit>/run.mjs <checkout-root> <part> <out-file> [--coverage <dir>]
    node <kit>/tools/compare.mjs <kit>/baseline-<part>.txt <out-file>     # exit 0 = green

`<part>` is `frame-loop`, `input-command-translator` or `mspdi-codec` (`capture-translator` is the
one-time corpus capture; do not rerun it on a split tree). The runner copies `src/` to
`<checkout>/tests/unit/zz-comparator/`, runs the root's vitest (`COMPARATOR_NODE_ROOT`, default the
repository root that owns node_modules) with cwd = checkout, TZ=UTC, and deletes the copied folder in
a `finally`. Output: one line `<case-id> <sha256>` per case. Clock, rAF, crypto.randomUUID,
localStorage and navigator are pinned/faked per case.

What is compared:
- frame-loop: every host call with arguments (svg surface, screen surface + wiring seams, file store,
  clipboard, rasterizer, app shell, full screen, page reload, pointer shape, localStorage, rAF,
  randomUUID), every screen view, every session event (wrapped at `advanceScreenSession`), document /
  frame-values digests and flags after each flush, Agent API calls, exported helpers and constants.
- input-command-translator: replays 4,578 real calls captured from the pre-split frame loop
  (`data/translator-corpus.json.gz`) with perturbations (+-1/3/4 px around the drag threshold, phases,
  buttons, modifiers, keys, wheel, context flags) over every exported function.
- mspdi-codec: decode / encode / round trip of every sample and fixture (copied into `data/inputs/`),
  structural and per-leaf mutations, generated edge documents; throws recorded as values.

## Finished

| part | cases | baseline | determinism (2 runs, sha256 of file) | coverage of the target file (vitest v8) |
| --- | --- | --- | --- | --- |
| frame-loop | 3,680 | baseline-frame-loop.txt | identical (938e532a...) | 91.79 % stmt / 86.17 % branch / 93.21 % func (measured on the 3,617-case version, before the last 63 cases) |
| input-command-translator | 151,915 | baseline-input-command-translator.txt | identical (5ff60e7f...) | 89.03 / 84.04 / 94.94 (measured on the 139,994-case version, before the selection variants) |
| mspdi-codec | 42,765 | baseline-mspdi-codec.txt | identical (5d6394b0...) | 95.45 / 88.42 / 100 (measured on the 42,321-case version, before the last edge variants) |

Sensitivity (tools/sensitivity.mjs, breaks in tools/breaks.json, each restored by bytes):
- frame-loop, first round against the 3,617-case baseline: 8/10 red (FL-4 edge-scroll speed and FL-6
  isSameEnvironment field were green). Cases were then added for both (edge scroll over the template
  with time passing; single-field environment pairs; animation frames no longer dropped between flushes).
- frame-loop, second round against the 3,680-case baseline: FL-1..FL-5 all red (FL-4 now red); stopped
  by the pause while FL-6 was running.

## Not finished

- frame-loop sensitivity round 2: FL-6..FL-10 not rerun.
- input-command-translator and mspdi-codec sensitivity: not run (10 breaks each are written in
  tools/breaks.json, TR-1..TR-10 and MC-1..MC-10).
- Coverage not remeasured on the final case sets (numbers above are from slightly smaller sets).
- Known throws in the pre-split code: not yet listed (planned: a side file of case ids whose output
  holds a recorded throw). Seen so far: none in the final frame-loop scenarios; mspdi cases that pass
  null / {} documents throw by design of the input.
- Observed limits: FL-1 (palette clamp at 0) and FL-9 (help language) are caught by few cases
  (helpers / one scenario only).

Worktree `agent-a69a6fc2aac78477c` is detached at d0ae3a9c8 with `git diff --stat` empty.
