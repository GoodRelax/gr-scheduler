/**
 * ai-cowork-trial: block until the shared document needs the AI, then exit.
 *
 * This is the piece that removes the human from the notification path. The AI runs
 * this as a background process and stops thinking; the human edits at their own pace;
 * the moment the document hands the turn over, the process exits and the AI wakes up,
 * reads the state and acts. No chat message is required to pass the turn.
 *
 * It is the trial's stand-in for the planned `grs_watch` MCP tool / the
 * `grs.on('change')` subscription: "tell me when the other editor committed".
 *
 * The wait is REVISION-SCOPED: pass `--since <revision>` with the last revision the
 * caller already saw, and a state it has already acted on will not wake it again.
 * Without this an already-finished document wakes the watcher instantly, and
 * re-arming the watcher becomes a busy loop. GR Scheduler's `grs_watch` needs the
 * same rule: "notify me about changes AFTER the revision I last read".
 *
 * Usage:
 *   node ai-cowork-trial/wait-for-turn.mjs [--actor ai] [--since 11] [--timeout 3600]
 *
 * Exit codes: 0 = it is our turn (or the game ended), 1 = timed out, 2 = server down.
 */

const args = process.argv.slice(2);

/**
 * Read a `--name value` argument.
 *
 * @param {string} name - The flag name without dashes.
 * @param {string} fallback - Value when the flag is absent.
 * @returns {string} The argument value.
 */
function arg(name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback;
}

const ACTOR = arg('actor', 'ai');
/** Revisions at or below this were already seen by the caller and never wake it. */
const SINCE = Number(arg('since', '-1'));
const TIMEOUT_MS = Number(arg('timeout', '3600')) * 1000;
const BASE = arg('base', 'http://127.0.0.1:8788');
const POLL_MS = 500;

/**
 * Sleep.
 *
 * @param {number} ms - Milliseconds.
 * @returns {Promise<void>} Resolves after the delay.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startedAt = Date.now();
let lastRevision = -1;

for (;;) {
  if (Date.now() - startedAt > TIMEOUT_MS) {
    process.stdout.write(`TIMEOUT after ${TIMEOUT_MS / 1000}s - nobody moved.\n`);
    process.exit(1);
  }

  let state;
  try {
    const response = await fetch(`${BASE}/api/state`);
    state = await response.json();
  } catch (error) {
    process.stdout.write(`SERVER DOWN at ${BASE}: ${String(error)}\n`);
    process.exit(2);
  }

  if (state.revision !== lastRevision) {
    lastRevision = state.revision;
  }

  // Nothing at or before --since can wake us: it is a state we already acted on.
  if (state.revision <= SINCE) {
    await sleep(POLL_MS);
    continue;
  }

  if (state.winner !== null || state.isDraw) {
    process.stdout.write(
      `GAME OVER - ${state.winner !== null ? `${state.winner} wins` : 'draw'}\n` +
        `${JSON.stringify(state)}\n`,
    );
    process.exit(0);
  }

  if (state.turn === ACTOR) {
    process.stdout.write(
      `YOUR TURN (${ACTOR}) at revision ${state.revision}\n${JSON.stringify(state)}\n`,
    );
    process.exit(0);
  }

  await sleep(POLL_MS);
}
