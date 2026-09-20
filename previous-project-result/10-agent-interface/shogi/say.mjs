/**
 * ai-cowork-trial/shogi: post a chat message read from a UTF-8 file.
 *
 * Passing Japanese text through a shell argument corrupts it on Windows (the console
 * code page mangles the bytes before curl ever sees them), so the AI writes the message
 * to a file with a real UTF-8 writer and this script ships it. Anything the AI wants to
 * SAY goes through here; ASCII-only JSON commands can still go straight to curl.
 *
 * Usage:
 *   node ai-cowork-trial/shogi/say.mjs --file outgoing.txt [--actor ai]
 */

import { readFile } from 'node:fs/promises';

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

const FILE = arg('file', null);
const ACTOR = arg('actor', 'ai');
const BASE = arg('base', 'http://127.0.0.1:8789');

if (FILE === null) {
  process.stdout.write('usage: node say.mjs --file <utf8 text file> [--actor ai]\n');
  process.exit(2);
}

const text = (await readFile(FILE, 'utf8')).trim();
if (text === '') {
  process.stdout.write('nothing to say - the file is empty\n');
  process.exit(2);
}

const response = await fetch(`${BASE}/api/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ actor: ACTOR, text }),
});
const body = await response.json();
if (!response.ok) {
  process.stdout.write(`FAILED ${response.status}: ${body.error}\n`);
  process.exit(1);
}
process.stdout.write(`posted at revision ${body.revision}: ${text.slice(0, 60)}\n`);
