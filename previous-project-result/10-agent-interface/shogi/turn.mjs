/**
 * ai-cowork-trial/shogi: play a move and say something in ONE round trip.
 *
 * The AI's latency per turn is dominated by round trips, not by thinking: wake, read
 * the state, post the move, post the message, re-arm the watcher. This collapses the
 * two posts into one call, and prints the resulting revision so the caller can re-arm
 * immediately without re-reading the state.
 *
 * The message is read from a UTF-8 FILE, never from a shell argument - passing
 * Japanese through a Windows shell argument corrupts it before the process sees it.
 *
 * Usage:
 *   node turn.mjs --move 56,47            [--say msg.txt] [--base-revision 12]
 *   node turn.mjs --move 23,14,promote    [--say msg.txt]
 *   node turn.mjs --drop P,40             [--say msg.txt]
 *   node turn.mjs --say msg.txt                      (talk only, no move)
 *   node turn.mjs --undo 2 --say msg.txt             (take moves back)
 */

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);

/**
 * Read a `--name value` argument.
 *
 * @param {string} name - Flag name without dashes.
 * @param {string|null} fallback - Default value.
 * @returns {string|null} The value.
 */
function arg(name, fallback = null) {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback;
}

const BASE = arg('base', 'http://127.0.0.1:8789');
const ACTOR = arg('actor', 'ai');

/**
 * POST JSON and return the parsed body plus the status.
 *
 * @param {string} path - API path.
 * @param {object} payload - Request body.
 * @returns {Promise<{ok: boolean, body: object}>} The outcome.
 */
async function post(path, payload) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: response.ok, body: await response.json() };
}

/**
 * Turn `--move 56,47[,promote]` or `--drop P,40` into a command.
 *
 * @returns {object|null} The command, or null when no move was requested.
 */
function buildCommand() {
  const undo = arg('undo');
  if (undo !== null) {
    return { type: 'undo', count: Number(undo) };
  }
  const drop = arg('drop');
  if (drop !== null) {
    const [kind, to] = drop.split(',');
    return { type: 'drop', kind, to: Number(to) };
  }
  const move = arg('move');
  if (move !== null) {
    const [from, to, promote] = move.split(',');
    return { type: 'move', from: Number(from), to: Number(to), promote: promote === 'promote' };
  }
  return null;
}

const command = buildCommand();
let revision = null;

if (command !== null) {
  const baseRevision = arg('base-revision');
  const payload = { actor: ACTOR, commands: [command] };
  if (baseRevision !== null) {
    payload.baseRevision = Number(baseRevision);
  }
  const { ok, body } = await post('/api/apply', payload);
  if (!ok) {
    process.stdout.write(`MOVE REJECTED: ${body.error}\n`);
    process.exit(1);
  }
  revision = body.revision;
  const lastKifu = body.kifu[body.kifu.length - 1] ?? '(none)';
  process.stdout.write(`played: ${lastKifu}\n`);
  if (body.winner !== null) {
    process.stdout.write(`GAME OVER: ${body.endReason}, ${body.winner} wins\n`);
  } else if (body.inCheck) {
    process.stdout.write('the human is in check\n');
  }
}

const sayFile = arg('say');
if (sayFile !== null) {
  const text = (await readFile(sayFile, 'utf8')).trim();
  if (text !== '') {
    const { ok, body } = await post('/api/chat', { actor: ACTOR, text });
    if (!ok) {
      process.stdout.write(`CHAT REJECTED: ${body.error}\n`);
      process.exit(1);
    }
    revision = body.revision;
    process.stdout.write(`said: ${text.slice(0, 70)}\n`);
  }
}

if (revision === null) {
  process.stdout.write('nothing to do - pass --move / --drop / --undo / --say\n');
  process.exit(2);
}
process.stdout.write(`revision ${revision} - re-arm the watcher with --since ${revision}\n`);
