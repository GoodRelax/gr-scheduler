/**
 * ai-cowork-trial: a minimal shared-state server used to prove that a human and an
 * AI can co-edit ONE live document from two separate viewers.
 *
 * The document here is a tic-tac-toe game, but the API surface is deliberately the
 * one planned for GR Scheduler's agent interface, so this trial doubles as a
 * rehearsal of the future localhost MCP server:
 *
 *   GET  /api/state          -> getDocument() + getRevision()
 *   POST /api/apply          -> applyCommands()   (atomic, optimistic-locked)
 *   POST /api/load           -> loadDocument()
 *   GET  /api/events         -> on('change')      (Server-Sent Events push)
 *
 * No dependencies, no build step. Binds to 127.0.0.1 only.
 *
 * Run via .claude/launch.json entry "ai-cowork-trial" (port 8788).
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, 'public');
const STATE_FILE = join(HERE, 'state.json');
const PORT = 8788;
const HOST = '127.0.0.1';

/** Contract version. A major bump means an incompatible API change. */
const API_VERSION = '1.0.0';

/** The three-in-a-row cell index triples. */
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Who owns which mark in this trial. */
const MARK_OF_ACTOR = { human: 'O', ai: 'X' };

/**
 * Build the empty document. `revision` is monotonic across the whole server
 * lifetime and is the single thing a client needs to detect "someone else moved".
 *
 * @returns {object} A fresh document.
 */
function emptyDocument() {
  return {
    apiVersion: API_VERSION,
    documentKind: 'tic-tac-toe',
    revision: 0,
    board: [null, null, null, null, null, null, null, null, null],
    turn: 'human',
    winner: null,
    isDraw: false,
    lastActor: null,
    lastCommand: null,
    updatedAt: null,
    log: [],
  };
}

/** The live document. Mutated only through {@link commit}. */
let doc = emptyDocument();

/** Open SSE responses, notified whenever the revision changes. */
const subscribers = new Set();

/**
 * Recompute the derived fields (winner / draw / turn) after a board change.
 *
 * @param {object} next - The document being built.
 */
function recomputeOutcome(next) {
  next.winner = null;
  for (const [a, b, c] of WIN_LINES) {
    const mark = next.board[a];
    if (mark !== null && mark === next.board[b] && mark === next.board[c]) {
      next.winner = mark;
      break;
    }
  }
  next.isDraw = next.winner === null && next.board.every((cell) => cell !== null);
}

/**
 * Persist and broadcast the current document. Every accepted write goes through
 * here, so `revision` can never advance without subscribers being told.
 */
async function commit() {
  doc.revision += 1;
  doc.updatedAt = new Date().toISOString();
  const payload = JSON.stringify(doc);
  for (const res of subscribers) {
    res.write(`event: change\ndata: ${payload}\n\n`);
  }
  try {
    await writeFile(STATE_FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  } catch (error) {
    process.stderr.write(`[ai-cowork-trial] state persist failed: ${String(error)}\n`);
  }
}

/**
 * Apply one command to the document.
 *
 * @param {object} command - `{type:'place', cell, mark}` or `{type:'clear'}`.
 * @param {string} actor - 'human' or 'ai'.
 * @returns {{ok: true} | {ok: false, code: number, reason: string}} Outcome.
 */
function applyCommand(command, actor) {
  if (command === null || typeof command !== 'object') {
    return { ok: false, code: 400, reason: 'command must be an object' };
  }
  if (command.type === 'clear') {
    const fresh = emptyDocument();
    fresh.revision = doc.revision;
    fresh.log = doc.log.slice(-20);
    fresh.log.push(`${actor} cleared the board`);
    doc = fresh;
    return { ok: true };
  }
  if (command.type !== 'place') {
    return { ok: false, code: 400, reason: `unknown command type: ${String(command.type)}` };
  }
  if (doc.winner !== null || doc.isDraw) {
    return { ok: false, code: 409, reason: 'game is over - send {"type":"clear"} first' };
  }
  const cell = command.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    return { ok: false, code: 400, reason: 'cell must be an integer 0..8' };
  }
  const expectedMark = MARK_OF_ACTOR[actor];
  if (expectedMark === undefined) {
    return { ok: false, code: 400, reason: "actor must be 'human' or 'ai'" };
  }
  if (command.mark !== undefined && command.mark !== expectedMark) {
    return {
      ok: false,
      code: 400,
      reason: `actor ${actor} plays ${expectedMark}, not ${String(command.mark)}`,
    };
  }
  if (doc.turn !== actor) {
    return { ok: false, code: 409, reason: `not your turn - it is ${doc.turn}'s move` };
  }
  if (doc.board[cell] !== null) {
    return { ok: false, code: 409, reason: `cell ${cell} is already taken` };
  }
  doc.board[cell] = expectedMark;
  doc.turn = actor === 'human' ? 'ai' : 'human';
  doc.lastActor = actor;
  doc.lastCommand = { type: 'place', cell, mark: expectedMark };
  doc.log = doc.log.slice(-20);
  doc.log.push(`${actor} played ${expectedMark} at ${cell}`);
  recomputeOutcome(doc);
  if (doc.winner !== null || doc.isDraw) {
    doc.turn = null;
  }
  return { ok: true };
}

/**
 * Read and JSON-parse a request body (capped so a stray client cannot grow the heap).
 *
 * @param {import('node:http').IncomingMessage} req - The request.
 * @returns {Promise<object>} The parsed body ({} when empty).
 */
async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new Error('request body too large');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Send a JSON response.
 *
 * @param {import('node:http').ServerResponse} res - The response.
 * @param {number} status - HTTP status code.
 * @param {object} body - The payload.
 */
function sendJson(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(text);
}

/** Static file content types this trial needs. */
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Serve a file from `public/`, refusing anything that escapes the directory.
 *
 * @param {import('node:http').ServerResponse} res - The response.
 * @param {string} pathname - The request path.
 */
async function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = normalize(join(PUBLIC_DIR, relative));
  if (!target.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  try {
    const body = await readFile(target);
    const dot = target.lastIndexOf('.');
    const type = CONTENT_TYPES[target.slice(dot)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: 'not found', path: pathname });
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/state') {
    sendJson(res, 200, doc);
    return;
  }

  if (route === 'GET /api/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(`event: change\ndata: ${JSON.stringify(doc)}\n\n`);
    subscribers.add(res);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      subscribers.delete(res);
    });
    return;
  }

  if (route === 'POST /api/apply' || route === 'POST /api/load') {
    void readJsonBody(req)
      .then(async (body) => {
        const actor = body.actor ?? 'ai';
        if (actor !== 'human' && actor !== 'ai') {
          sendJson(res, 400, { error: "actor must be 'human' or 'ai'", state: doc });
          return;
        }
        // Optimistic lock: if the caller states which revision it read, refuse to
        // write on top of someone else's newer edit. This is the concurrency rule
        // GR Scheduler will need when a human drags while the AI writes.
        if (body.baseRevision !== undefined && body.baseRevision !== doc.revision) {
          sendJson(res, 409, {
            error: 'stale baseRevision - re-read /api/state and retry',
            expected: doc.revision,
            got: body.baseRevision,
            state: doc,
          });
          return;
        }
        if (url.pathname === '/api/load') {
          const fresh = emptyDocument();
          fresh.revision = doc.revision;
          if (Array.isArray(body.board) && body.board.length === 9) {
            fresh.board = body.board.map((cell) => (cell === 'O' || cell === 'X' ? cell : null));
          }
          if (body.turn === 'human' || body.turn === 'ai') {
            fresh.turn = body.turn;
          }
          recomputeOutcome(fresh);
          fresh.log = [`${actor} loaded a document`];
          doc = fresh;
          await commit();
          sendJson(res, 200, doc);
          return;
        }
        const commands = Array.isArray(body.commands) ? body.commands : [body.command];
        if (commands.length === 0 || commands[0] === undefined) {
          sendJson(res, 400, { error: 'commands[] is required', state: doc });
          return;
        }
        // Atomic: validate-and-apply on a snapshot, roll back if any step fails,
        // so a rejected batch never leaves a half-applied document behind.
        const snapshot = JSON.parse(JSON.stringify(doc));
        for (const command of commands) {
          const outcome = applyCommand(command, actor);
          if (!outcome.ok) {
            doc = snapshot;
            sendJson(res, outcome.code, { error: outcome.reason, state: doc });
            return;
          }
        }
        await commit();
        sendJson(res, 200, doc);
      })
      .catch((error) => {
        sendJson(res, 400, { error: String(error), state: doc });
      });
    return;
  }

  if (req.method === 'GET') {
    void serveStatic(res, url.pathname);
    return;
  }

  sendJson(res, 404, { error: 'no such route', route });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`[ai-cowork-trial] listening on http://${HOST}:${PORT}\n`);
});
