/**
 * ai-cowork-trial/shogi: the shogi rule engine.
 *
 * Pure functions only - no I/O, no DOM, no server concerns. The server is the single
 * authority on legality and hands the client a ready-made list of legal moves, so the
 * UI never re-implements a rule. This mirrors the layering GR Scheduler needs: the
 * domain decides, the adapters only render and transport.
 *
 * BOARD COORDINATES
 *   index = row * 9 + col,  row 0..8 top to bottom, col 0..8 left to right
 *   file (suji)  = 9 - col   -> 1..9, numbered right to left as on a real board
 *   rank (dan)   = row + 1   -> 1..9, numbered top to bottom
 *   'human' is sente and sits at the BOTTOM, so its forward direction is row - 1.
 *   'ai' is gote at the top, forward is row + 1.
 *
 * The only non-ASCII content is the piece-glyph table, which a shogi board cannot do
 * without; identifiers, comments and logs stay English.
 */

/** Piece kinds. K = king, R = rook, B = bishop, G = gold, S = silver, N = knight, L = lance, P = pawn. */
export const KINDS = ['K', 'R', 'B', 'G', 'S', 'N', 'L', 'P'];

/** Kinds that can sit in a hand, in conventional display order. */
export const HAND_KINDS = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

/** Kinds that can promote. */
const PROMOTABLE = new Set(['R', 'B', 'S', 'N', 'L', 'P']);

/** Board glyphs (unpromoted / promoted). */
export const GLYPH = {
  K: ['玉', '玉'],
  R: ['飛', '龍'],
  B: ['角', '馬'],
  G: ['金', '金'],
  S: ['銀', '全'],
  N: ['桂', '圭'],
  L: ['香', '杏'],
  P: ['歩', 'と'],
};

/** Kifu names (promoted forms spelled out as they are written in game records). */
const KIFU_NAME = {
  K: ['玉', '玉'],
  R: ['飛', '龍'],
  B: ['角', '馬'],
  G: ['金', '金'],
  S: ['銀', '成銀'],
  N: ['桂', '成桂'],
  L: ['香', '成香'],
  P: ['歩', 'と'],
};

/** Kanji rank numerals, indexed by rank - 1. */
const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * The forward row delta for a side.
 *
 * @param {string} owner - 'human' (sente, bottom) or 'ai' (gote, top).
 * @returns {number} -1 for human, +1 for ai.
 */
export function forwardOf(owner) {
  return owner === 'human' ? -1 : 1;
}

/**
 * The opposing side.
 *
 * @param {string} owner - A side.
 * @returns {string} The other side.
 */
export function opponentOf(owner) {
  return owner === 'human' ? 'ai' : 'human';
}

/**
 * Whether a row lies in `owner`'s promotion zone (the three ranks nearest the enemy).
 *
 * @param {number} row - Board row 0..8.
 * @param {string} owner - The moving side.
 * @returns {boolean} True inside the zone.
 */
export function inPromotionZone(row, owner) {
  return owner === 'human' ? row <= 2 : row >= 6;
}

/**
 * Build the standard starting position.
 *
 * @returns {Array<object|null>} An 81-cell board.
 */
export function initialBoard() {
  const board = new Array(81).fill(null);
  const backRank = ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'];
  for (let col = 0; col < 9; col += 1) {
    board[0 * 9 + col] = { kind: backRank[col], promoted: false, owner: 'ai' };
    board[8 * 9 + col] = { kind: backRank[col], promoted: false, owner: 'human' };
    board[2 * 9 + col] = { kind: 'P', promoted: false, owner: 'ai' };
    board[6 * 9 + col] = { kind: 'P', promoted: false, owner: 'human' };
  }
  board[1 * 9 + 1] = { kind: 'R', promoted: false, owner: 'ai' };
  board[1 * 9 + 7] = { kind: 'B', promoted: false, owner: 'ai' };
  board[7 * 9 + 1] = { kind: 'B', promoted: false, owner: 'human' };
  board[7 * 9 + 7] = { kind: 'R', promoted: false, owner: 'human' };
  return board;
}

/**
 * An empty hand.
 *
 * @returns {object} Counts keyed by kind.
 */
export function emptyHand() {
  return { R: 0, B: 0, G: 0, S: 0, N: 0, L: 0, P: 0 };
}

/**
 * Single-step and sliding directions for a piece, in `owner`'s orientation.
 *
 * @param {object} piece - `{kind, promoted, owner}`.
 * @returns {{steps: number[][], slides: number[][]}} Direction vectors as [dRow, dCol].
 */
function movementOf(piece) {
  const f = forwardOf(piece.owner);
  const goldSteps = [
    [f, 0],
    [f, -1],
    [f, 1],
    [0, -1],
    [0, 1],
    [-f, 0],
  ];
  const allSteps = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const diagonals = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const orthogonals = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  if (piece.promoted && ['P', 'L', 'N', 'S'].includes(piece.kind)) {
    return { steps: goldSteps, slides: [] };
  }
  switch (piece.kind) {
    case 'P':
      return { steps: [[f, 0]], slides: [] };
    case 'L':
      return { steps: [], slides: [[f, 0]] };
    case 'N':
      return {
        steps: [
          [2 * f, -1],
          [2 * f, 1],
        ],
        slides: [],
      };
    case 'S':
      return {
        steps: [
          [f, 0],
          [f, -1],
          [f, 1],
          [-f, -1],
          [-f, 1],
        ],
        slides: [],
      };
    case 'G':
      return { steps: goldSteps, slides: [] };
    case 'B':
      return { steps: piece.promoted ? orthogonals : [], slides: diagonals };
    case 'R':
      return { steps: piece.promoted ? diagonals : [], slides: orthogonals };
    case 'K':
      return { steps: allSteps, slides: [] };
    default:
      return { steps: [], slides: [] };
  }
}

/**
 * Every square the piece on `from` attacks, ignoring king safety.
 *
 * @param {Array<object|null>} board - The board.
 * @param {number} from - Source index.
 * @returns {number[]} Reachable square indices.
 */
export function pseudoTargets(board, from) {
  const piece = board[from];
  if (piece === null) {
    return [];
  }
  const row = Math.floor(from / 9);
  const col = from % 9;
  const { steps, slides } = movementOf(piece);
  const targets = [];

  for (const [dRow, dCol] of steps) {
    const r = row + dRow;
    const c = col + dCol;
    if (r < 0 || r > 8 || c < 0 || c > 8) {
      continue;
    }
    const occupant = board[r * 9 + c];
    if (occupant === null || occupant.owner !== piece.owner) {
      targets.push(r * 9 + c);
    }
  }
  for (const [dRow, dCol] of slides) {
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      const occupant = board[r * 9 + c];
      if (occupant === null) {
        targets.push(r * 9 + c);
      } else {
        if (occupant.owner !== piece.owner) {
          targets.push(r * 9 + c);
        }
        break;
      }
      r += dRow;
      c += dCol;
    }
  }
  return targets;
}

/**
 * Locate a side's king.
 *
 * @param {Array<object|null>} board - The board.
 * @param {string} owner - The side.
 * @returns {number} The square index, or -1 when the king is gone.
 */
function kingSquare(board, owner) {
  for (let i = 0; i < 81; i += 1) {
    const piece = board[i];
    if (piece !== null && piece.kind === 'K' && piece.owner === owner) {
      return i;
    }
  }
  return -1;
}

/**
 * Whether `owner`'s king is currently attacked.
 *
 * @param {Array<object|null>} board - The board.
 * @param {string} owner - The side to test.
 * @returns {boolean} True when in check.
 */
export function isInCheck(board, owner) {
  const king = kingSquare(board, owner);
  if (king < 0) {
    return false;
  }
  for (let i = 0; i < 81; i += 1) {
    const piece = board[i];
    if (piece === null || piece.owner === owner) {
      continue;
    }
    if (pseudoTargets(board, i).includes(king)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether a piece of this kind landing on `row` would have no further move, which is
 * what makes promotion mandatory and some drops illegal.
 *
 * @param {string} kind - Piece kind.
 * @param {number} row - Destination row.
 * @param {string} owner - The moving side.
 * @returns {boolean} True when the piece would be stuck forever.
 */
function wouldBeStuck(kind, row, owner) {
  const lastRank = owner === 'human' ? 0 : 8;
  const secondLast = owner === 'human' ? 1 : 7;
  if (kind === 'P' || kind === 'L') {
    return row === lastRank;
  }
  if (kind === 'N') {
    return row === lastRank || row === secondLast;
  }
  return false;
}

/**
 * Apply a move to a board/hands pair, returning fresh copies. No legality checking -
 * callers pass moves produced by {@link legalMoves}.
 *
 * @param {Array<object|null>} board - The board.
 * @param {object} hands - `{human, ai}` hand counts.
 * @param {object} move - A move from {@link legalMoves}.
 * @param {string} owner - The moving side.
 * @returns {{board: Array<object|null>, hands: object, captured: string|null}} The result.
 */
export function applyMove(board, hands, move, owner) {
  const nextBoard = board.slice();
  const nextHands = {
    human: { ...hands.human },
    ai: { ...hands.ai },
  };
  let captured = null;

  if (move.drop !== undefined) {
    nextHands[owner][move.drop] -= 1;
    nextBoard[move.to] = { kind: move.drop, promoted: false, owner };
    return { board: nextBoard, hands: nextHands, captured };
  }

  const piece = nextBoard[move.from];
  const target = nextBoard[move.to];
  if (target !== null) {
    captured = target.kind;
    nextHands[owner][target.kind] += 1;
  }
  nextBoard[move.to] = {
    kind: piece.kind,
    promoted: piece.promoted || move.promote === true,
    owner,
  };
  nextBoard[move.from] = null;
  return { board: nextBoard, hands: nextHands, captured };
}

/**
 * Every legal move for `owner`.
 *
 * @param {Array<object|null>} board - The board.
 * @param {object} hands - `{human, ai}` hand counts.
 * @param {string} owner - The side to move.
 * @param {boolean} [checkPawnDropMate] - Internal: false while testing an opponent's
 *   replies, to stop the pawn-drop-mate rule recursing.
 * @returns {object[]} Moves as `{from,to,promote}` or `{drop,to}`.
 */
export function legalMoves(board, hands, owner, checkPawnDropMate = true) {
  const moves = [];

  /**
   * Keep a candidate only when it does not leave our own king in check.
   *
   * @param {object} move - The candidate move.
   */
  const keepIfSafe = (move) => {
    const after = applyMove(board, hands, move, owner);
    if (!isInCheck(after.board, owner)) {
      moves.push(move);
    }
  };

  for (let from = 0; from < 81; from += 1) {
    const piece = board[from];
    if (piece === null || piece.owner !== owner) {
      continue;
    }
    const fromRow = Math.floor(from / 9);
    for (const to of pseudoTargets(board, from)) {
      const toRow = Math.floor(to / 9);
      const canPromote =
        PROMOTABLE.has(piece.kind) &&
        !piece.promoted &&
        (inPromotionZone(fromRow, owner) || inPromotionZone(toRow, owner));
      const mustPromote = canPromote && wouldBeStuck(piece.kind, toRow, owner);
      if (!mustPromote) {
        keepIfSafe({ from, to, promote: false });
      }
      if (canPromote) {
        keepIfSafe({ from, to, promote: true });
      }
    }
  }

  // Files that already hold one of our unpromoted pawns are closed to a pawn drop.
  const pawnFiles = new Set();
  for (let i = 0; i < 81; i += 1) {
    const piece = board[i];
    if (piece !== null && piece.owner === owner && piece.kind === 'P' && !piece.promoted) {
      pawnFiles.add(i % 9);
    }
  }

  for (const kind of HAND_KINDS) {
    if (hands[owner][kind] <= 0) {
      continue;
    }
    for (let to = 0; to < 81; to += 1) {
      if (board[to] !== null) {
        continue;
      }
      const toRow = Math.floor(to / 9);
      if (wouldBeStuck(kind, toRow, owner)) {
        continue;
      }
      if (kind === 'P' && pawnFiles.has(to % 9)) {
        continue;
      }
      const move = { drop: kind, to };
      const after = applyMove(board, hands, move, owner);
      if (isInCheck(after.board, owner)) {
        continue;
      }
      // Dropping a pawn for immediate checkmate is forbidden (uchifuzume). Any other
      // mating drop is fine, so the test is scoped to pawns.
      if (checkPawnDropMate && kind === 'P') {
        const enemy = opponentOf(owner);
        if (
          isInCheck(after.board, enemy) &&
          legalMoves(after.board, after.hands, enemy, false).length === 0
        ) {
          continue;
        }
      }
      moves.push(move);
    }
  }

  return moves;
}

/**
 * Render a move in game-record notation, e.g. "▲7六歩".
 *
 * @param {Array<object|null>} board - The board BEFORE the move.
 * @param {object} move - The move.
 * @param {string} owner - The moving side.
 * @param {number|null} previousTo - Destination of the previous move, for "same square".
 * @returns {string} The notation string.
 */
export function toKifu(board, move, owner, previousTo) {
  const marker = owner === 'human' ? '▲' : '△';
  const file = 9 - (move.to % 9);
  const rank = Math.floor(move.to / 9) + 1;
  const square = move.to === previousTo ? '同' : `${file}${RANK_KANJI[rank - 1]}`;
  if (move.drop !== undefined) {
    return `${marker}${square}${KIFU_NAME[move.drop][0]}打`;
  }
  const piece = board[move.from];
  const name = KIFU_NAME[piece.kind][piece.promoted ? 1 : 0];
  const suffix = move.promote === true ? '成' : '';
  return `${marker}${square}${name}${suffix}`;
}

/**
 * Human-readable square name, e.g. "7六".
 *
 * @param {number} index - Square index.
 * @returns {string} The square name.
 */
export function squareName(index) {
  return `${9 - (index % 9)}${RANK_KANJI[Math.floor(index / 9)]}`;
}
