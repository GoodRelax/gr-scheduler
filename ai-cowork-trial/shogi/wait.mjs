/**
 * ai-cowork-trial/shogi: block until the human does anything, then exit.
 *
 * Generalised from the tic-tac-toe watcher. There the only reason to wake the AI was
 * "it is your turn"; here the human can also just talk ("take that back", "why did you
 * play that?"), and the AI has to wake for that too. So the condition is not about the
 * turn at all - it is:
 *
 *   wake me when the OTHER editor committed anything after the revision I last read.
 *
 * That is exactly the semantics GR Scheduler's `grs_watch` needs, and it is why the
 * document carries `lastActor` and a monotonic `revision`.
 *
 * Usage:
 *   node ai-cowork-trial/shogi/wait.mjs --since 12 [--timeout 3600] [--for ai]
 *
 * Exit codes: 0 = something happened, 1 = timed out, 2 = server unreachable.
 */

const args = process.argv.slice(2);

/**
 * Read a `--name value` argument.
 *
 * @param {string} name - Flag name without dashes.
 * @param {string} fallback - Default value.
 * @returns {string} The value.
 */
function arg(name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback;
}

/** Revisions at or below this were already seen and never wake us. */
const SINCE = Number(arg('since', '-1'));
/** The side we play, used only to phrase the wake-up reason. */
const SELF = arg('for', 'ai');
const TIMEOUT_MS = Number(arg('timeout', '3600')) * 1000;
const BASE = arg('base', 'http://127.0.0.1:8789');
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

for (;;) {
  if (Date.now() - startedAt > TIMEOUT_MS) {
    process.stdout.write(`TIMEOUT after ${TIMEOUT_MS / 1000}s - the human did nothing.\n`);
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

  const isNew = state.revision > SINCE;
  const byOther = state.lastActor !== null && state.lastActor !== SELF;

  if (isNew && byOther) {
    const unreadChat = state.chat.filter(
      (message) => message.actor !== SELF && message.atRevision >= SINCE,
    );
    const reasons = [];
    if (state.turn === SELF) {
      reasons.push('your move');
    }
    if (unreadChat.length > 0) {
      reasons.push(`${unreadChat.length} chat message(s)`);
    }
    if (state.winner !== null) {
      reasons.push(`game over (${state.endReason}, ${state.winner} wins)`);
    }
    process.stdout.write(
      `WAKE at revision ${state.revision}: ${reasons.join(' + ') || 'document changed'}\n`,
    );
    process.stdout.write(`${JSON.stringify(state)}\n`);
    process.exit(0);
  }

  await sleep(POLL_MS);
}
