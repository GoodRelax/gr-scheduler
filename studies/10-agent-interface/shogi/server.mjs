/**
 * ai-cowork-trial/shogi: shared-state server for a human-vs-AI shogi game with an
 * in-page chat channel.
 *
 * Same API shape as the tic-tac-toe trial, plus two things that game did not need and
 * GR Scheduler will:
 *
 *   - a CHAT channel on the document, so the human can talk to the AI inside the app
 *     instead of switching to a chat client;
 *   - UNDO, so "wait, take that back" is a real operation on the shared document
 *     rather than a favour the AI does by hand. Both sides' moves go through one
 *     history stack, which is the rule GR Scheduler needs: the AI's writes must be
 *     undoable by the human and vice versa.
 *
 *   GET  /api/state   -> getDocument() + getRevision()
 *   POST /api/apply   -> applyCommands()  (move / drop / undo / reset / resign)
 *   POST /api/chat    -> post a chat message
 *   GET  /api/events  -> on('change')  (SSE)
 *
 * No dependencies. Binds to 127.0.0.1 only. Port 8789.
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  emptyHand,
  initialBoard,
  isInCheck,
  legalMoves,
  applyMove,
  opponentOf,
  toKifu,
} from './rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, 'public');
const STATE_FILE = join(HERE, 'state.json');
const PORT = 8789;
const HOST = '127.0.0.1';
const API_VERSION = '1.0.0';

/** Snapshots of every earlier position, newest last. Undo pops from here. */
let history = [];

/** Monotonic chat sequence number. */
let chatSeq = 0;

/**
 * Build the opening document.
 *
 * @returns {object} A fresh game.
 */
function newGame() {
  return {
    apiVersion: API_VERSION,
    documentKind: 'shogi',
    revision: 0,
    board: initialBoard(),
    hands: { human: emptyHand(), ai: emptyHand() },
    turn: 'human',
    inCheck: false,
    winner: null,
    endReason: null,
    lastMove: null,
    moveNumber: 0,
    legalMoves: [],
    kifu: [],
    chat: [],
    lastActor: null,
    updatedAt: null,
  };
}

/** The live document. */
let doc = newGame();

/** Open SSE responses. */
const subscribers = new Set();

/**
 * Recompute check state, legal moves and game end for the side to move.
 */
function refreshDerived() {
  if (doc.winner !== null) {
    doc.legalMoves = [];
    doc.turn = null;
    return;
  }
  doc.inCheck = isInCheck(doc.board, doc.turn);
  doc.legalMoves = legalMoves(doc.board, doc.hands, doc.turn);
  if (doc.legalMoves.length === 0) {
    doc.winner = opponentOf(doc.turn);
    doc.endReason = doc.inCheck ? 'checkmate' : 'stalemate';
    doc.turn = null;
  }
}

/**
 * Push the current position onto the undo stack.
 */
function pushHistory() {
  history.push(
    JSON.stringify({
      board: doc.board,
      hands: doc.hands,
      turn: doc.turn,
      lastMove: doc.lastMove,
      moveNumber: doc.moveNumber,
      kifu: doc.kifu,
      winner: doc.winner,
      endReason: doc.endReason,
    }),
  );
  if (history.length > 400) {
    history.shift();
  }
}

/**
 * Persist and broadcast. Every accepted write goes through here so `revision` never
 * advances without subscribers hearing about it.
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
    process.stderr.write(`[shogi] state persist failed: ${String(error)}\n`);
  }
}

/**
 * Whether two moves are the same.
 *
 * @param {object} a - A move.
 * @param {object} b - Another move.
 * @returns {boolean} True when equal.
 */
function sameMove(a, b) {
  if (a.drop !== undefined || b.drop !== undefined) {
    return a.drop === b.drop && a.to === b.to;
  }
  return a.from === b.from && a.to === b.to && a.promote === b.promote;
}

/**
 * Apply one command.
 *
 * @param {object} command - The command.
 * @param {string} actor - 'human' or 'ai'.
 * @returns {{ok: true} | {ok: false, code: number, reason: string}} Outcome.
 */
function runCommand(command, actor) {
  if (command === null || typeof command !== 'object') {
    return { ok: false, code: 400, reason: 'command must be an object' };
  }

  if (command.type === 'reset') {
    const chat = doc.chat;
    doc = newGame();
    doc.chat = chat;
    doc.kifu = [];
    history = [];
    refreshDerived();
    return { ok: true };
  }

  if (command.type === 'resign') {
    if (doc.winner !== null) {
      return { ok: false, code: 409, reason: 'the game is already over' };
    }
    pushHistory();
    doc.winner = opponentOf(actor);
    doc.endReason = 'resign';
    doc.turn = null;
    doc.legalMoves = [];
    doc.kifu = [...doc.kifu, `${actor === 'human' ? '▲' : '△'}投了`];
    return { ok: true };
  }

  if (command.type === 'undo') {
    const count = Number.isInteger(command.count) ? command.count : 1;
    if (count < 1 || count > history.length) {
      return {
        ok: false,
        code: 409,
        reason: `cannot undo ${count} - only ${history.length} position(s) recorded`,
      };
    }
    let snapshot = null;
    for (let i = 0; i < count; i += 1) {
      snapshot = JSON.parse(history.pop());
    }
    doc.board = snapshot.board;
    doc.hands = snapshot.hands;
    doc.turn = snapshot.turn;
    doc.lastMove = snapshot.lastMove;
    doc.moveNumber = snapshot.moveNumber;
    doc.kifu = snapshot.kifu;
    doc.winner = snapshot.winner;
    doc.endReason = snapshot.endReason;
    refreshDerived();
    return { ok: true };
  }

  if (command.type !== 'move' && command.type !== 'drop') {
    return { ok: false, code: 400, reason: `unknown command type: ${String(command.type)}` };
  }
  if (doc.winner !== null) {
    return { ok: false, code: 409, reason: 'the game is over - reset first' };
  }
  if (doc.turn !== actor) {
    return { ok: false, code: 409, reason: `not your turn - it is ${String(doc.turn)}'s move` };
  }

  const move =
    command.type === 'drop'
      ? { drop: command.kind, to: command.to }
      : { from: command.from, to: command.to, promote: command.promote === true };

  const legal = doc.legalMoves.find((candidate) => sameMove(candidate, move));
  if (legal === undefined) {
    return { ok: false, code: 409, reason: 'illegal move' };
  }

  pushHistory();
  const previousTo = doc.lastMove === null ? null : doc.lastMove.to;
  const notation = toKifu(doc.board, legal, actor, previousTo);
  const result = applyMove(doc.board, doc.hands, legal, actor);
  doc.board = result.board;
  doc.hands = result.hands;
  doc.lastMove = { ...legal, owner: actor, captured: result.captured };
  doc.moveNumber += 1;
  doc.kifu = [...doc.kifu, `${doc.moveNumber} ${notation}`];
  doc.turn = opponentOf(actor);
  refreshDerived();
  return { ok: true };
}

/**
 * Read and JSON-parse a request body.
 *
 * @param {import('node:http').IncomingMessage} req - The request.
 * @returns {Promise<object>} The parsed body.
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
  return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Send a JSON response.
 *
 * @param {import('node:http').ServerResponse} res - The response.
 * @param {number} status - Status code.
 * @param {object} body - Payload.
 */
function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

/** Static content types. */
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Serve a file from `public/`.
 *
 * @param {import('node:http').ServerResponse} res - The response.
 * @param {string} pathname - Request path.
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
    const type = CONTENT_TYPES[target.slice(target.lastIndexOf('.'))] ?? 'application/octet-stream';
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

  if (route === 'POST /api/chat') {
    void readJsonBody(req)
      .then(async (body) => {
        const actor = body.actor === 'human' || body.actor === 'ai' ? body.actor : null;
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (actor === null || text === '') {
          sendJson(res, 400, { error: 'actor and non-empty text are required', state: doc });
          return;
        }
        chatSeq += 1;
        doc.chat = [
          ...doc.chat.slice(-200),
          {
            seq: chatSeq,
            actor,
            text: text.slice(0, 2000),
            atRevision: doc.revision,
            atMove: doc.moveNumber,
            ts: new Date().toISOString(),
          },
        ];
        doc.lastActor = actor;
        await commit();
        sendJson(res, 200, doc);
      })
      .catch((error) => sendJson(res, 400, { error: String(error), state: doc }));
    return;
  }

  if (route === 'POST /api/apply') {
    void readJsonBody(req)
      .then(async (body) => {
        const actor = body.actor === 'human' || body.actor === 'ai' ? body.actor : null;
        if (actor === null) {
          sendJson(res, 400, { error: "actor must be 'human' or 'ai'", state: doc });
          return;
        }
        if (body.baseRevision !== undefined && body.baseRevision !== doc.revision) {
          sendJson(res, 409, {
            error: 'stale baseRevision - re-read /api/state and retry',
            expected: doc.revision,
            got: body.baseRevision,
            state: doc,
          });
          return;
        }
        const commands = Array.isArray(body.commands) ? body.commands : [body.command];
        if (commands.length === 0 || commands[0] === undefined) {
          sendJson(res, 400, { error: 'commands[] is required', state: doc });
          return;
        }
        const rollback = { doc: JSON.stringify(doc), history: history.slice() };
        for (const command of commands) {
          const outcome = runCommand(command, actor);
          if (!outcome.ok) {
            doc = JSON.parse(rollback.doc);
            history = rollback.history;
            sendJson(res, outcome.code, { error: outcome.reason, state: doc });
            return;
          }
        }
        doc.lastActor = actor;
        await commit();
        sendJson(res, 200, doc);
      })
      .catch((error) => sendJson(res, 400, { error: String(error), state: doc }));
    return;
  }

  if (req.method === 'GET') {
    void serveStatic(res, url.pathname);
    return;
  }

  sendJson(res, 404, { error: 'no such route', route });
});

refreshDerived();
server.listen(PORT, HOST, () => {
  process.stdout.write(`[shogi] listening on http://${HOST}:${PORT}\n`);
});
